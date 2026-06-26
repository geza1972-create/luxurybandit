import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, getSignedUrl } from "@/lib/try-this-look-store";
import { isIntimateName } from "@/lib/lingerie";

export const runtime = "nodejs";
export const maxDuration = 60;

// On-demand dupe finder (dupe.com-style): visual-search the look's hero image via
// Google Lens, keep the shoppable look-alikes, CACHE them on the look. We only pay
// for a look the first time someone actually opens it; repeat views are free.
const FRESH_MS = 1000 * 60 * 60 * 24 * 30; // re-search at most monthly

type Alt = { title?: string; link: string; source?: string; thumbnail: string; price?: string; priceValue?: number; currency?: string };

// Colour vocabulary (silver/grey treated as one neutral).
const COLORS = ["black", "white", "silver", "grey", "ivory", "cream", "champagne", "beige", "nude", "charcoal", "gold", "blue", "navy", "red", "burgundy", "wine", "green", "emerald", "olive", "pink", "fuchsia", "purple", "lilac", "lavender", "orange", "yellow", "brown", "tan", "teal", "turquoise"];
function colorsIn(text: string): string[] {
  const t = (text || "").toLowerCase().replace(/\bgray\b/g, "grey");
  const found = COLORS.filter((c) => new RegExp(`\\b${c}\\b`).test(t));
  if ((t.includes("silver") || t.includes("grey")) && !found.includes("silver")) found.push("silver");
  if ((t.includes("silver") || t.includes("grey")) && !found.includes("grey")) found.push("grey");
  return found;
}

// Drop a match whose title names colour(s) that don't overlap the look's colour
// (e.g. a "blue" dress for a silver look). Uses the look's stored image-analysis
// text. Matches that name no colour are trusted (Lens already matched visually).
function colorOk(title: string, lookColors: string[]): boolean {
  if (!lookColors.length) return true;
  const mc = colorsIn(title);
  if (!mc.length) return true;
  return mc.some((c) => lookColors.includes(c));
}

function mapMatches(matches: any[], brand: string, lookText: string): Alt[] {
  const seen = new Set<string>();
  const brandWord = (brand || "").trim().split(/\s+/)[0]?.toLowerCase() || "";
  const lookColors = colorsIn(lookText);
  return (matches || [])
    .filter((m) => m?.link && m?.thumbnail && m?.price?.extracted_value)
    .filter((m) => !(brandWord && `${m.source ?? ""} ${m.title ?? ""}`.toLowerCase().includes(brandWord))) // drop the original itself
    .filter((m) => colorOk(String(m.title ?? ""), lookColors)) // colour must not clash
    .filter((m) => (seen.has(m.link) ? false : seen.add(m.link)))
    .map((m) => ({
      title: String(m.title ?? "").slice(0, 200),
      link: String(m.link),
      source: m.source ? String(m.source).slice(0, 80) : undefined,
      thumbnail: String(m.thumbnail),
      price: m.price?.value ? String(m.price.value).replace(/\*/g, "").trim() : undefined,
      priceValue: typeof m.price?.extracted_value === "number" ? m.price.extracted_value : undefined,
      currency: m.price?.currency || "$",
    }))
    .sort((a, b) => (b.priceValue ?? -1) - (a.priceValue ?? -1))
    .slice(0, 10);
}

// Fetch ONE shoppable lingerie piece in a given colour via Google Shopping. The
// search query may freely say "lingerie" (it's a product search, not generation).
async function fetchLingerieForColor(color: string, key: string): Promise<Alt | null> {
  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_shopping");
    u.searchParams.set("q", `${color} lace bodysuit lingerie`);
    u.searchParams.set("api_key", key);
    const r = await fetch(u).then((x) => x.json()).catch(() => null);
    const items: any[] = r?.shopping_results || [];
    for (const m of items) {
      const thumbnail = m.thumbnail;
      const link = m.product_link || m.link;
      if (!thumbnail || !link) continue;
      return {
        title: String(m.title ?? `${color} lingerie`).slice(0, 200),
        link: String(link),
        source: m.source ? String(m.source).slice(0, 80) : undefined,
        thumbnail: String(thumbnail),
        price: m.price ? String(m.price).replace(/\*/g, "").trim() : undefined,
        priceValue: typeof m.extracted_price === "number" ? m.extracted_price : undefined,
        currency: "$",
        lingerie: true,
      } as Alt;
    }
  } catch { /* ignore */ }
  return null;
}

// Insert a colour-matched lingerie upsell card as the 2nd "Bandit the look" option,
// so shoppers can try the model in lingerie (a paid try-on). Cost-minimal: one
// lingerie product per colour is fetched once and reused across all looks.
async function withLingerieSecond(
  state: Awaited<ReturnType<typeof readTryThisLookState>>,
  look: any,
  idx: number,
  baseAlts: Alt[],
  key: string,
): Promise<Alt[]> {
  // A look that is ITSELF lingerie needs no lingerie upsell; skip (also saves a search).
  if (look.lingerie === true || isIntimateName(`${look.name ?? ""} ${look.brand ?? ""} ${look.productNote ?? ""}`)) return baseAlts;
  if (baseAlts.some((a) => a.lingerie)) return baseAlts; // already injected
  const color = colorsIn(`${look.productNote ?? ""} ${look.name ?? ""}`)[0] || "black";
  const cache = (state.lingerieByColor = state.lingerieByColor || {});
  let item = cache[color] as Alt | undefined;
  if (!item) {
    const fetched = await fetchLingerieForColor(color, key);
    if (!fetched) return baseAlts;
    cache[color] = fetched;
    item = fetched;
  }
  const next = [...baseAlts];
  next.splice(1, 0, item); // 2nd position
  look.alternatives = next;
  state.looks[idx] = look;
  await saveTryThisLookState(state);
  return next;
}

export async function POST(request: Request) {
  const { lookId, force: forceReq } = (await request.json().catch(() => ({}))) as { lookId?: string; force?: boolean };
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });
  // A forced re-search costs a SerpApi credit, so only admins may force one. Public
  // callers are cache-first: they trigger at most ONE search per look (when empty).
  const pin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  const isAdmin = !!pin && request.headers.get("x-try-look-admin-pin") === pin;
  const force = forceReq && isAdmin;

  const state = await readTryThisLookState();
  const idx = state.looks.findIndex((l) => l.id === lookId);
  if (idx < 0) return NextResponse.json({ error: "Look not found." }, { status: 404 });
  const look = state.looks[idx] as any;

  void FRESH_MS;
  const key = process.env.SERPAPI_KEY?.trim();

  // Cache hit → free. Any look that already has alternatives (manually curated or
  // previously generated) is served from the DB; only EMPTY looks (or an admin
  // force) trigger a paid Lens search. So the dupe search runs at most once.
  if (!force && Array.isArray(look.alternatives) && look.alternatives.length) {
    const finalAlts = key ? await withLingerieSecond(state, look, idx, look.alternatives as Alt[], key) : look.alternatives;
    return NextResponse.json({ alternatives: finalAlts, cached: true });
  }

  if (!key) return NextResponse.json({ error: "SERPAPI_KEY missing." }, { status: 400 });

  // Public hero image URL for Lens
  const hero = look.frontImageUrl || look.imageUrl || (await getSignedUrl(look.frontImagePath || look.imagePath || ""));
  if (!hero) return NextResponse.json({ error: "No image to search." }, { status: 400 });

  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_lens");
    u.searchParams.set("url", hero);
    u.searchParams.set("api_key", key);
    const r = await fetch(u).then((x) => x.json()).catch(() => null);
    if (!r || r.error) return NextResponse.json({ error: `Lens failed: ${r?.error ?? "no response"}` }, { status: 502 });

    const lookText = `${look.productNote ?? ""} ${look.name ?? ""}`;
    const alts = mapMatches(r.visual_matches || [], look.storeName || look.name || "", lookText);
    if (!alts.length) return NextResponse.json({ alternatives: [], cached: false, note: "no shoppable matches" });

    look.alternatives = alts;
    look.dupesFetchedAt = new Date().toISOString();
    state.looks[idx] = look;
    await saveTryThisLookState(state);
    // Inject the colour-matched lingerie upsell at position 2 (colour-cached).
    const finalAlts = await withLingerieSecond(state, look, idx, alts, key);
    return NextResponse.json({ alternatives: finalAlts, cached: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Dupe search failed." }, { status: 500 });
  }
}
