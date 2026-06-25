import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, getSignedUrl } from "@/lib/try-this-look-store";

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

  // Cache hit → free. Any look that already has alternatives (manually curated or
  // previously generated) is served from the DB; only EMPTY looks (or an admin
  // force) trigger a paid search. So a look is searched at most once.
  if (!force && Array.isArray(look.alternatives) && look.alternatives.length) {
    return NextResponse.json({ alternatives: look.alternatives, cached: true });
  }
  void FRESH_MS;

  const key = process.env.SERPAPI_KEY?.trim();
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
    return NextResponse.json({ alternatives: alts, cached: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Dupe search failed." }, { status: 500 });
  }
}
