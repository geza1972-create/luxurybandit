import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { publicLookLabel } from "@/lib/look-title";

export const runtime = "nodejs";
export const maxDuration = 30;

// Cheap + fast — a chat runs many turns. (Latest small model.)
const MODEL = "claude-haiku-4-5-20251001";
const MAX_HISTORY = 20;   // last N turns sent to the model
const MAX_TOKENS = 320;

type ChatMsg = { role: "user" | "assistant"; content: string };
type ShopItem = { title: string; link: string; source?: string; thumbnail: string; price?: string };

// ── SerpApi Google-Shopping search: cache 24h per query + hard daily cap, mirroring
//    app/api/brand-shop. Real product cards (image + price + link), cost-frugal. ──
const SHOP_CACHE = new Map<string, { at: number; items: ShopItem[] }>();
const SHOP_TTL_MS = 24 * 60 * 60 * 1000;
const SHOP_MAX_KEYS = 300;
const SHOP_DAILY_CAP = 25;          // billable SerpApi calls/day for this chat (in-memory,
                                    // per-instance — a soft burst limit, NOT a global cap)
let shopDay = "";
let shopCalls = 0;
function shopWithinCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== shopDay) { shopDay = today; shopCalls = 0; }
  return shopCalls < SHOP_DAILY_CAP;
}

async function shoppingSearch(query: string): Promise<ShopItem[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 3) return [];
  const cacheKey = q.toLowerCase();
  const hit = SHOP_CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < SHOP_TTL_MS) return hit.items;

  const key = process.env.SERPAPI_KEY;
  // Kill-switch: set SERPAPI_PAUSED=1 (Vercel env) to stop ALL billable SerpApi calls
  // instantly — conserves the monthly quota. Funnel still serves CJ + own catalogue.
  if (process.env.SERPAPI_PAUSED === "1") return hit?.items ?? [];
  if (!key || !shopWithinCap()) return hit?.items ?? []; // graceful: no key / over cap

  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_shopping");
    u.searchParams.set("q", q);
    u.searchParams.set("hl", "ro");   // Romanian audience
    u.searchParams.set("gl", "ro");
    u.searchParams.set("api_key", key);
    shopCalls++;
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(20000) });
    const data = await res.json().catch(() => null);
    const raw = Array.isArray(data?.shopping_results) ? data.shopping_results : [];
    const seen = new Set<string>();
    const items: ShopItem[] = [];
    for (const r of raw) {
      const link = String(r?.product_link ?? r?.link ?? "").trim();
      const thumbnail = String(r?.thumbnail ?? "").trim();
      if (!link || !thumbnail || seen.has(link)) continue;
      seen.add(link);
      items.push({
        title: String(r?.title ?? "").slice(0, 120),
        link,
        source: String(r?.source ?? "").slice(0, 50) || undefined,
        thumbnail,
        price: typeof r?.price === "string" ? r.price : undefined,
      });
      if (items.length >= 8) break;
    }
    if (SHOP_CACHE.size >= SHOP_MAX_KEYS) SHOP_CACHE.delete(SHOP_CACHE.keys().next().value!);
    SHOP_CACHE.set(cacheKey, { at: Date.now(), items });
    return items;
  } catch {
    return hit?.items ?? [];
  }
}

// ── CJ (Commission Junction) GraphQL product search — real advertisers, AFFILIATE links
//    (commission per sale). Cache 24h + daily cap. Returns null when not configured or on
//    any error/unexpected shape → caller falls back to Google Shopping. ──
const CJ_CACHE = new Map<string, { at: number; items: ShopItem[] }>();
const CJ_TTL_MS = 24 * 60 * 60 * 1000;
const CJ_DAILY_CAP = 800;
let cjDay = "";
let cjCalls = 0;
function cjWithinCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== cjDay) { cjDay = today; cjCalls = 0; }
  return cjCalls < CJ_DAILY_CAP;
}

async function cjSearch(query: string): Promise<ShopItem[] | null> {
  const token = process.env.CJ_PERSONAL_ACCESS_TOKEN;
  const cid = process.env.CJ_COMPANY_ID;
  const pid = process.env.CJ_WEBSITE_ID || "";
  if (!token || !cid) return null; // not configured → caller falls back to SerpApi
  const q = query.trim().slice(0, 120);
  if (q.length < 3) return [];
  const cacheKey = q.toLowerCase();
  const hit = CJ_CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < CJ_TTL_MS) return hit.items;
  if (!cjWithinCap()) return hit?.items ?? null;

  // partnerStatus: JOINED → only advertisers you've joined (so linkCode returns a tracked,
  // commission-earning click URL). limit high because one product ships in many locale/currency
  // variants (RON/EUR/HUF/PLN/CZK…) — we filter to RON→EUR and dedupe below.
  const gql = `{ products(companyId: "${cid}", partnerStatus: JOINED, keywords: ${JSON.stringify(q)}, limit: 60) { resultList { title link imageLink advertiserName price { amount currency } salePrice { amount currency }${pid ? ` linkCode(pid: "${pid}") { clickUrl }` : ""} } } }`;
  try {
    cjCalls++;
    const res = await fetch("https://ads.api.cj.com/query", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: gql }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json().catch(() => null);
    const list = data?.data?.products?.resultList;
    if (!Array.isArray(list)) return null; // unexpected/error → fall back
    // RO audience: keep only RON (preferred) or EUR — drop HUF/PLN/CZK/etc. (they read as
    // foreign junk). Collapse the same product's size/colour variants into ONE card via a
    // base-name key so we don't show "Body Hera S / M / L" six times.
    // Collapse a product to its distinctive STYLE name (e.g. "Ottavia", "Hera") by stripping
    // sizes, colours and the product-type noun in every locale — so the SAME item titled
    // "Sutien Ottavia" (RO) / "Reggiseno Ottavia" (IT) / "Ottavia podprsenka" (CZ) dedupes to one.
    const baseKey = (title: string) => title.toLowerCase()
      .replace(/\b\d{1,3}\s?[a-h]{1,2}\b/g, " ")                        // bra sizes 75C, 5C, 3D
      .replace(/\b(xs|s|m|l|xl|xxl|xxxl)\b/g, " ")                      // clothing sizes
      .replace(/\b(sutien|reggiseno|podprsenka|telo|body|bra|bralette|brief|briefs|thong|tanga|panties|panty|knickers|corset|bodysuit|teddy|garter|melltart[óo]|biustonosz|kalhotky|stringi|figi|perizoma|culotte|guaina)\b/g, " ") // product-type nouns RO/EN/IT/CZ/PL/HU
      .replace(/\b(black|negru|neagr[ăa]|white|alb[ăa]?|red|ro[șs]u|nude|beige|bej)\b/g, " ") // colours
      .replace(/[^a-zăâîșț ]/g, " ").replace(/\s+/g, " ").trim();
    const fmtPrice = (amt: string, cur: string) =>
      `${String(amt).replace(/[.,]00$/, "")} ${cur}`;                   // "355.00" → "355 RON"
    const buckets: Record<"RON" | "EUR", ShopItem[]> = { RON: [], EUR: [] };
    const seenKey = new Set<string>();
    const collect = (want: "RON" | "EUR") => {
      for (const r of list) {
        const pr = r?.salePrice?.amount ? r.salePrice : r?.price;
        const cur = String(pr?.currency || "").toUpperCase();
        if (cur !== want) continue;
        const link = String(r?.linkCode?.clickUrl || r?.link || "").trim();
        const thumbnail = String(r?.imageLink || "").trim();
        const title = String(r?.title ?? "").slice(0, 120);
        if (!link || !thumbnail || !title) continue;
        const key = baseKey(title) || title.toLowerCase();
        if (seenKey.has(key)) continue;
        seenKey.add(key);
        buckets[want].push({ title, link, thumbnail, price: pr?.amount ? fmtPrice(pr.amount, cur) : undefined, source: String(r?.advertiserName ?? "").slice(0, 50) || undefined });
      }
    };
    collect("RON");   // RON first (dedupe by base name)
    collect("EUR");   // then fill with EUR for products with no RON variant
    const items = [...buckets.RON, ...buckets.EUR].slice(0, 8);
    CJ_CACHE.set(cacheKey, { at: Date.now(), items });
    return items;
  } catch {
    return null;
  }
}

// Prefer CJ (affiliate commission); fall back to Google Shopping (SerpApi) when CJ has no
// keys, no results, or errors.
async function productSearch(query: string): Promise<ShopItem[]> {
  const cj = await cjSearch(query);
  if (cj && cj.length) return cj;
  return shoppingSearch(query);
}

// The assistant returns strict JSON: a short Romanian reply + an English shopping query.
// Empty query = not a product search (e.g. a greeting) → we skip the paid SerpApi call.
const SYSTEM = `Ești asistentul LuxuryBandit „Produse de lux".

FILOZOFIA (obligatoriu): „Bandit — the luxury look". Recomanzi și găsești DOAR piese de LUX — elegante, cu aspect de designer, premium. Ești o CURATOARE de modă cu gust rafinat: arăți piesele de designer care merită și îl ajuți pe user să le poarte/cumpere. NICIODATĂ produse ieftine, prost făcute sau fast-fashion banal. Reflectă asta în „query" (cuvinte ca 'elegant', 'designer', 'premium', 'luxury').

Scrie TOTUL în ROMÂNĂ CORECTĂ gramatical (fără engleză în „reply", ex NU „Alright"; folosește cuvinte reale — ex „calitatea piesei" sau „calitatea materialului", NICIODATĂ „piesnei"). Răspunde DOAR cu JSON valid:
{"reply": "<max 2 propoziții, 1 emoji max, fără markdown>", "query": "<cuvinte-cheie EN pentru căutare, cu accent pe aspect elegant/designer/lux — SAU șir GOL \\"\\" dacă întrebi>", "chips": ["opțiune scurtă", "..."], "brand": "<numele designerului/brandului dacă userul îl menționează sau e clar (ex 'Versace','Gucci') — altfel \\"\\">"}

FLUX — pune întrebări cu „chips" (nu căuta încă), pas cu pas:
1) PRIMA cerere de produs → întreabă ce vibe/ocazie caută. query:"", chips: ["Elegant","Sexy","Casual chic","Pentru o ocazie"].
2) DUPĂ ce alege → întreabă dacă îi arăți acum sau mai vrea să adauge ceva (culoare, mărime, brand). query:"", chips: ["Arată-mi","Mai am ceva"].
   - Dacă alege „Mai am ceva" → „reply" scurt „Spune-mi 🙂", query:"", chips:[].
3) Când zice „Arată-mi" / „da" / e gata → CAUTĂ piese de lux: „query" cu cuvinte-cheie care descriu un produs ELEGANT/designer/premium, chips:[].
4) Salut/mulțumire → query:"", chips:[], răspuns scurt.
5) Dacă userul întreabă despre TINE sau stilul tău (ex „ce haine îți plac", „ce porți"), NU căuta. Răspunde cald, ca o prietenă cu stil: spune câteva vibe-uri/branduri de designer care-ți plac (ex piese elegante, satin, dantelă, gen Versace/Saint Laurent) și întreabă înapoi „Ție ce îți place? 💛". query:"", chips:[].

REGULĂ DE AUR: NU arăta NICIODATĂ produse fără să întrebi întâi — ar fi prea insistent. „query" rămâne GOL până când userul spune clar CE produs vrea ȘI a trecut prin întrebări. La salut, small-talk sau întrebări despre tine → conversație, NU produse.
NU inventa prețuri sau linkuri — de căutare mă ocup eu.`;

// Product-TYPE groups (EN + RO). We only surface our looks whose garment type matches the
// query's type — otherwise a "bag" search returns lingerie (generic words like "style"
// falsely matched). First keyword is the group id.
const TYPE_GROUPS: string[][] = [
  ["dress", "rochie", "rochii", "gown", "cocktail"],
  ["bikini", "swimsuit", "swimwear", "monokini", "swim", "costum de baie", "one-piece", "one piece"],
  ["lingerie", "bra", "thong", "bodysuit", "corset", "sutien", "lenjerie", "babydoll", "bralette", "garter", "panties", "panty", "brief", "briefs", "knickers", "underwear", "chiloti", "chiloți", "tanga", "boxeri"],
  ["bag", "handbag", "geanta", "geantă", "purse", "clutch", "tote", "poseta", "poșeta"],
  ["shoe", "heel", "sneaker", "boot", "pantofi", "adidasi", "adidași", "sandal", "sandale"],
  ["top", "blouse", "cămașă", "camasa", "bluza", "bluză", "shirt"],
  ["skirt", "fusta", "fustă"],
  ["jacket", "coat", "blazer", "geaca", "geacă", "palton", "trench", "jacheta"],
  ["pants", "trousers", "pantaloni", "jeans", "leggings", "colanti"],
  ["jewelry", "necklace", "earrings", "bijuterii", "colier", "cercei", "bracelet"],
];
function typesIn(text: string): Set<string> {
  const t = text.toLowerCase();
  return new Set(TYPE_GROUPS.filter((g) => g.some((w) => t.includes(w))).map((g) => g[0]));
}

// Our OWN catalogue, matched to the query — shown as a "din colecția LuxuryBandit" shelf
// under the external results so shoppers also see what we have. Type-gated (no lingerie for
// a bag query) and licensing-safe (publicLookLabel, never the raw brand name).
async function ownProductsFor(query: string): Promise<ShopItem[]> {
  try {
    const state = await readTryThisLookState();
    const looks = (state.looks || []).filter(
      (l) => ((l as { imageUrl?: string }).imageUrl || l.frontImageUrl) && (l as { published?: boolean }).published !== false,
    );
    const qTypes = typesIn(query);
    const words = query.toLowerCase().split(/[^a-z0-9ăâîșț]+/i).filter((w) => w.length > 2);
    const scored = looks.map((l) => {
      const hay = `${(l as { curatorNote?: string }).curatorNote ?? ""} ${l.productNote ?? ""} ${l.name ?? ""} ${l.brand ?? ""} ${l.campaignName ?? ""}`.toLowerCase();
      const lTypes = typesIn(hay);
      // If the query names a garment type, the look MUST be that type — else drop it.
      if (qTypes.size > 0 && ![...lTypes].some((t) => qTypes.has(t))) return { l, score: -1 };
      const wordScore = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
      const typeBonus = qTypes.size > 0 ? 5 : 0; // reached here → type matched
      return { l, score: wordScore + typeBonus };
    });
    // Only genuinely relevant looks. Empty shelf is fine if nothing matches the type.
    const picked = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    return picked.slice(0, 6).map(({ l }) => ({
      title: publicLookLabel(l as { curatorNote?: string; productNote?: string }) || "Look LuxuryBandit",
      link: `/look/${l.id}`,
      thumbnail: (l as { imageUrl?: string }).imageUrl || l.frontImageUrl || "",
      price: l.salePrice || l.price || undefined,
      source: "LuxuryBandit",
    })).filter((p) => p.thumbnail);
  } catch { return []; }
}

function parseModelJson(text: string): { reply: string; query: string; chips: string[]; brand: string } {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      const o = JSON.parse(t.slice(a, b + 1));
      const chips = Array.isArray(o?.chips) ? o.chips.map((c: unknown) => String(c).trim().slice(0, 30)).filter(Boolean).slice(0, 6) : [];
      return { reply: String(o?.reply ?? "").trim(), query: String(o?.query ?? "").trim(), chips, brand: String(o?.brand ?? "").trim().slice(0, 40) };
    } catch { /**/ }
  }
  return { reply: text.trim(), query: "", chips: [], brand: "" }; // fall back to raw text as the reply
}

// A rough numeric value from a price string ("1.234,56 RON" / "$59.99") for sorting.
function priceValue(p: ShopItem): number {
  const s = (p.price ?? "").replace(/[^\d.,]/g, "");
  if (!s) return Number.POSITIVE_INFINITY; // no price → treat as "unknown", sort last among cheap
  const norm = s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")
    ? s.replace(/\./g, "").replace(",", ".")   // European 1.234,56
    : s.replace(/,/g, "");                       // US 1,234.56
  const n = parseFloat(norm);
  return isNaN(n) ? Number.POSITIVE_INFINITY : n;
}

// Split search results into the designer ORIGINAL (brand match, priciest first) — shown as
// credit/inspiration — and the cheaper look-alikes (rest, cheapest first).
function splitByBrand(items: ShopItem[], brand: string): { original: ShopItem[]; cheaper: ShopItem[] } {
  const b = brand.trim().toLowerCase();
  if (!b) return { original: [], cheaper: items };
  const isBrand = (p: ShopItem) => `${p.title} ${p.source ?? ""}`.toLowerCase().includes(b);
  const original = items.filter(isBrand).sort((x, y) => priceValue(y) - priceValue(x)).slice(0, 2);
  const seen = new Set(original.map((o) => o.link));
  const cheaper = items.filter((p) => !seen.has(p.link)).sort((x, y) => priceValue(x) - priceValue(y));
  return { original, cheaper };
}

export async function POST(request: Request) {
  let body: { messages?: ChatMsg[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Not configured." }, { status: 400 });

  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!history.length) return NextResponse.json({ error: "No message." }, { status: 400 });

  const lang = (body as { lang?: string }).lang === "en" ? "en" : "ro";
  // Force English HARD (prompt below is Romanian-heavy): a strong header up top + a trailing
  // reminder. Everything in „reply"/„chips" must be English when lang === "en".
  const langHeader = lang === "en"
    ? "OUTPUT LANGUAGE = ENGLISH. Write the JSON „reply\" and ALL „chips\" ONLY in English — translate every Romanian example below into English. This rule overrides any 'write in Romanian' instruction that follows.\n\n"
    : "";
  const langLine = lang === "en"
    ? "\n\nFINAL REMINDER: The entire „reply\" and every „chip\" MUST be in ENGLISH, not Romanian."
    : "";

  // Model persona: when chatting from a model's page, the AI IS her — first person, her
  // style/motto/bio, a personal stylist (never says it's an AI).
  const model = (body as { model?: { name?: string; style?: string; motto?: string; bio?: string } }).model;
  const personaHeader = model && model.name
    ? (lang === "en"
      ? `You ARE ${model.name}, a LuxuryBandit fashion model & personal stylist. Speak in the FIRST PERSON as ${model.name} — warm, with real personality${model.style ? `; your style: ${model.style}` : ""}${model.motto ? `; your motto: “${model.motto}”` : ""}${model.bio ? `. About you: ${String(model.bio).slice(0, 200)}` : ""}. You advise the user like a friend with taste, then find the products. NEVER say you're an AI or assistant. Keep every rule below (JSON format, ask before showing products).\n\n`
      : `Ești ${model.name}, model de modă și stilistă personală la LuxuryBandit. Vorbește la PERSOANA I ca ${model.name} — caldă, cu personalitate reală${model.style ? `; stilul tău: ${model.style}` : ""}${model.motto ? `; motto-ul tău: „${model.motto}”` : ""}${model.bio ? `. Despre tine: ${String(model.bio).slice(0, 200)}` : ""}. Îl consiliezi pe user ca o prietenă cu gust, apoi îi găsești produsele. NU spune NICIODATĂ că ești AI sau asistent. Respectă toate regulile de mai jos (format JSON, întreabă înainte de produse).\n\n`)
    : "";

  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: personaHeader + langHeader + SYSTEM + langLine, messages: history });
    const text = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const parsed = parseModelJson(text);
    let { query, chips } = parsed;
    let reply = parsed.reply;

    const lastUser = (history.filter((m) => m.role === "user").pop()?.content ?? "").toLowerCase();
    const saidShow = /arat[ăa]|hai|gata|^da\b|^da[ ,.!]|caută|cauta|show|search|^yes\b/.test(lastUser);
    // Meta / style / small-talk about HER — must stay conversational, never products.
    const metaQ = /\bce (haine|stil|porți|porti|culor)\b|ție ce|tie ce|ce[- ]?ți place|ce iti place|îți plac|iti plac|despre tine|cine ești|cine esti|salut|bună|buna|mulțum|multum|thank|hello|hi\b|who are you|your style|what do you (like|wear)/i.test(lastUser);
    const assistantTurns = history.filter((m) => m.role === "assistant").length;
    const priorityChips = lang === "en" ? ["Elegant", "Sexy", "Casual chic", "For an occasion"] : ["Elegant", "Sexy", "Casual chic", "Pentru o ocazie"];
    const priorityReply = lang === "en" ? "Lovely! What's the vibe you're after?" : "Superb! Ce vibe cauți? 💛";
    const confirmChips = lang === "en" ? ["Show me", "One more thing"] : ["Arată-mi", "Mai am ceva"];
    const confirmReply = lang === "en" ? "Got it 👍 Show you now, or add something (colour, size, brand)?" : "Am înțeles 👍 Îți arăt acum sau mai vrei să adaugi ceva (culoare, mărime, brand)?";

    if (metaQ) {
      // Chat about her style — keep the model's conversational reply, show NO products.
      query = ""; chips = [];
    } else {
      // GOLDEN RULE: never show products unprompted. If the AI wants to search but the user
      // hasn't gone through the ask-flow yet, ask instead of showing products.
      if (assistantTurns === 0 && !saidShow && query) {
        query = ""; chips = priorityChips; reply = priorityReply;
      } else if (assistantTurns === 1 && !saidShow && query) {
        query = ""; chips = confirmChips; reply = confirmReply;
      }
      // Search only once the user is ready ("arată/da/gata") or after a few turns (safety).
      if (saidShow || assistantTurns >= 3) {
        chips = [];
        if (!query) query = (history.find((m) => m.role === "user")?.content ?? "").slice(0, 80);
      }
    }
    // Strip budget/price noise from the shopping query — "red panties 50-100 RON" returns
    // nothing on Google Shopping. Keep the product words only.
    const cleanQuery = query
      .replace(/\b(sub|peste|între|intre|max|maxim|până la|pana la)\b/gi, " ")
      .replace(/\d+\s*[-–]\s*\d+/g, " ")
      .replace(/\b\d+\b/g, " ")
      .replace(/\b(lei|ron|eur|euro|usd)\b/gi, " ")
      .replace(/[$€£]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const [found, ownProducts] = cleanQuery
      ? await Promise.all([productSearch(cleanQuery), ownProductsFor(cleanQuery)])
      : [[], []];
    // Show the designer ORIGINAL (credit/inspiration) separately from the cheaper look-alikes.
    let { original, cheaper } = splitByBrand(found, parsed.brand);
    // If the luxury-biased search didn't surface the real designer piece, do ONE targeted,
    // cached search for it so we always credit the designer with their original.
    if (cleanQuery && parsed.brand && original.length === 0) {
      const b = parsed.brand.toLowerCase();
      const origFound = await shoppingSearch(`${parsed.brand} ${cleanQuery}`);
      original = origFound
        .filter((p) => `${p.title} ${p.source ?? ""}`.toLowerCase().includes(b))
        .sort((x, y) => priceValue(y) - priceValue(x))
        .slice(0, 2);
      const seen = new Set(original.map((o) => o.link));
      cheaper = cheaper.filter((p) => !seen.has(p.link));
    }
    const finalReply = reply
      || (cheaper.length ? "Uite ce am găsit pentru tine 🔎" : "Spune-mi ce cauți și îți găsesc variante mai ieftine.");
    return NextResponse.json({ reply: finalReply, products: cheaper, original, brand: parsed.brand, ownProducts, chips, query: cleanQuery });
  } catch {
    return NextResponse.json({ error: "Chat failed." }, { status: 502 });
  }
}
