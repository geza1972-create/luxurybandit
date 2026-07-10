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
const SYSTEM = `Ești asistentul LuxuryBandit „Găsește-l mai ieftin". Ajuți userul să găsească produse de modă (haine, genți, pantofi, accesorii, bijuterii) mai ieftine.

Răspunde DOAR cu un obiect JSON valid, fără alt text, în formatul exact:
{"reply": "<mesaj scurt în ROMÂNĂ, max 2 propoziții, ton casual de prieten la shopping, cel mult un emoji, FĂRĂ markdown>", "query": "<cuvinte-cheie pentru Google Shopping care descriu produsul căutat, ex: 'black chain shoulder bag versace style' sau 'white gold bikini' — sau șir GOL \\"\\" dacă mesajul NU e o căutare de produs (salut, mulțumesc, întrebare generală)>"}

Reguli:
- CAUTĂ IMEDIAT. Dacă mesajul conține un produs, pune ÎNTOTDEAUNA cuvinte-cheie bune în „query" (englezește merge cel mai bine; păstrează numele brandului dacă îl zice) — NU pune întrebări înainte de a arăta rezultate. În „reply" spune scurt „Uite ce am găsit 🔎" sau ceva similar, și eventual întreabă o rafinare DUPĂ (ex: „spune-mi culoarea și caut mai exact").
- Pune „query" GOL doar dacă mesajul chiar NU e o căutare de produs (salut, mulțumesc, întrebare generală).
- NU inventa prețuri sau linkuri — de căutare mă ocup eu.`;

// Our OWN catalogue, matched to the query — shown as a "din colecția LuxuryBandit" shelf
// under the external results so shoppers also see what we have. Never the raw brand name
// (licensing) → publicLookLabel. Falls back to recent looks so the shelf is never empty.
async function ownProductsFor(query: string): Promise<ShopItem[]> {
  try {
    const state = await readTryThisLookState();
    const looks = (state.looks || []).filter(
      (l) => ((l as { imageUrl?: string }).imageUrl || l.frontImageUrl) && (l as { published?: boolean }).published !== false,
    );
    const words = query.toLowerCase().split(/[^a-z0-9ăâîșț]+/i).filter((w) => w.length > 2);
    const scored = looks.map((l) => {
      const hay = `${(l as { curatorNote?: string }).curatorNote ?? ""} ${l.productNote ?? ""} ${l.name ?? ""} ${l.brand ?? ""} ${l.campaignName ?? ""}`.toLowerCase();
      return { l, score: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    });
    const picked = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    if (picked.length < 4) {
      const recent = [...looks].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
      const seen = new Set(picked.map((p) => p.l.id));
      for (const l of recent) { if (picked.length >= 6) break; if (!seen.has(l.id)) { picked.push({ l, score: 0 }); seen.add(l.id); } }
    }
    return picked.slice(0, 6).map(({ l }) => ({
      title: publicLookLabel(l as { curatorNote?: string; productNote?: string }) || "Look LuxuryBandit",
      link: `/look/${l.id}`,
      thumbnail: (l as { imageUrl?: string }).imageUrl || l.frontImageUrl || "",
      price: l.salePrice || l.price || undefined,
      source: "LuxuryBandit",
    })).filter((p) => p.thumbnail);
  } catch { return []; }
}

function parseModelJson(text: string): { reply: string; query: string } {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try {
      const o = JSON.parse(t.slice(a, b + 1));
      return { reply: String(o?.reply ?? "").trim(), query: String(o?.query ?? "").trim() };
    } catch { /**/ }
  }
  return { reply: text.trim(), query: "" }; // fall back to raw text as the reply
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
    const { reply, query } = parseModelJson(text);

    const [products, ownProducts] = query
      ? await Promise.all([shoppingSearch(query), ownProductsFor(query)])
      : [[], []];
    const finalReply = reply
      || (products.length ? "Uite ce am găsit pentru tine 🔎" : "Spune-mi ce produs cauți și îți găsesc variante mai ieftine.");
    return NextResponse.json({ reply: finalReply, products, ownProducts, query });
  } catch {
    return NextResponse.json({ error: "Chat failed." }, { status: 502 });
  }
}
