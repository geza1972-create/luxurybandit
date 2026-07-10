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
const SHOP_DAILY_CAP = 80;          // billable SerpApi calls/day for this chat
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

// The assistant returns strict JSON: a short Romanian reply + an English shopping query.
// Empty query = not a product search (e.g. a greeting) → we skip the paid SerpApi call.
const SYSTEM = `Ești asistentul LuxuryBandit „Găsește-l mai ieftin".

FILOZOFIA (obligatoriu): „Bandit — the luxury look". Găsim mereu LOOK-ul de LUX mai ieftin — piese ELEGANTE, cu aspect de designer/lux, dar la preț mai mic. NU ne interesează produse ieftine și prost făcute („cheap-looking", fast-fashion de proastă calitate) — doar lucruri care ARATĂ scump/designer dar costă mai puțin. Reflectă asta în „query" (cuvinte ca 'elegant', 'designer style', 'premium', 'luxury look').

Scrie TOTUL în ROMÂNĂ (fără engleză în „reply", ex NU „Alright"). Răspunde DOAR cu JSON valid:
{"reply": "<max 2 propoziții, 1 emoji max, fără markdown>", "query": "<cuvinte-cheie EN pentru Google Shopping, cu accent pe aspect elegant/designer — SAU șir GOL \\"\\" dacă întrebi>", "chips": ["opțiune scurtă", "..."]}

FLUX — pune întrebări cu „chips" (nu căuta încă), pas cu pas:
1) PRIMA cerere de produs → întreabă ce contează cel mai mult pentru el (unele variante sunt ieftine dar din China, cu livrare lentă). query:"", chips: ["Prețul mic","Livrarea rapidă","Calitatea","Mi-e egal"].
2) DUPĂ ce alege → întreabă dacă îi arăți acum sau mai vrea să adauge ceva (culoare, mărime, brand). query:"", chips: ["Arată-mi","Mai am ceva"].
   - Dacă alege „Mai am ceva" → „reply" scurt „Spune-mi 🙂", query:"", chips:[].
3) Când zice „Arată-mi" / „da" / e gata → CAUTĂ: „query" cu cuvinte-cheie care descriu un produs cu aspect ELEGANT/designer, chips:[]. Dacă a zis „Calitatea" accentuează 'premium designer'; dacă „Prețul mic" caută cele mai ieftine variante cu aspect bun.
4) Salut/mulțumire → query:"", chips:[], răspuns scurt.

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

function parseModelJson(text: string): { reply: string; query: string; chips: string[] } {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      const o = JSON.parse(t.slice(a, b + 1));
      const chips = Array.isArray(o?.chips) ? o.chips.map((c: unknown) => String(c).trim().slice(0, 30)).filter(Boolean).slice(0, 6) : [];
      return { reply: String(o?.reply ?? "").trim(), query: String(o?.query ?? "").trim(), chips };
    } catch { /**/ }
  }
  return { reply: text.trim(), query: "", chips: [] }; // fall back to raw text as the reply
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

  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM, messages: history });
    const text = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
    const parsed = parseModelJson(text);
    let { query, chips } = parsed;
    let reply = parsed.reply;

    const lastUser = (history.filter((m) => m.role === "user").pop()?.content ?? "").toLowerCase();
    const saidShow = /arat[ăa]|hai|gata|^da\b|^da[ ,.!]|caută|cauta|show|search/.test(lastUser);
    const assistantTurns = history.filter((m) => m.role === "assistant").length;

    // Enforce the "show me?" confirmation step: after the FIRST question is answered, don't
    // jump straight to results — confirm first ("Arată-mi" / "Mai am ceva"), unless the user
    // already said they're ready.
    if (assistantTurns === 1 && !saidShow && query) {
      query = "";
      chips = ["Arată-mi", "Mai am ceva"];
      reply = "Am înțeles 👍 Îți arăt acum sau mai vrei să adaugi ceva (culoare, mărime, brand)?";
    }

    // Safety net: force a search when the user says they're ready, or after a few turns, so
    // it can never loop forever asking questions.
    if (saidShow || assistantTurns >= 3) {
      chips = [];
      if (!query) query = (history.find((m) => m.role === "user")?.content ?? "").slice(0, 80);
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

    const [products, ownProducts] = cleanQuery
      ? await Promise.all([shoppingSearch(cleanQuery), ownProductsFor(cleanQuery)])
      : [[], []];
    const finalReply = reply
      || (products.length ? "Uite ce am găsit pentru tine 🔎" : "Spune-mi ce cauți și îți găsesc variante mai ieftine.");
    return NextResponse.json({ reply: finalReply, products, ownProducts, chips, query: cleanQuery });
  } catch {
    return NextResponse.json({ error: "Chat failed." }, { status: 502 });
  }
}
