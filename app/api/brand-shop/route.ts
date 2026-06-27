import { NextResponse } from "next/server";

// Public storefront brand search: "more {brand} to try on" below the curated grid.
// Live Google Shopping (SerpApi) is COST-SENSITIVE on a public page, so we:
//   • cache each brand for 24h (one live call per brand per day, max),
//   • hard-cap total live calls per day across all brands,
//   • serve empty gracefully when the key is missing or the cap is hit.
type ShopItem = { title: string; link: string; source?: string; thumbnail: string; price?: string };

const CACHE = new Map<string, { at: number; items: ShopItem[] }>();
const TTL_MS = 24 * 60 * 60 * 1000;      // 24h per brand
const MAX_BRANDS = 200;                   // cache size guard
const DAILY_LIVE_CAP = 60;                // hard ceiling on billable SerpApi calls/day
let dayKey = "";
let dayCalls = 0;

function withinDailyCap(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) { dayKey = today; dayCalls = 0; }
  return dayCalls < DAILY_LIVE_CAP;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brand = (url.searchParams.get("brand") ?? "").trim().slice(0, 80);
  if (!brand) return NextResponse.json({ items: [] });

  const cacheKey = brand.toLowerCase();
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ items: hit.items, cached: true });
  }

  const key = process.env.SERPAPI_KEY;
  // No key or over the daily cap → graceful empty (the stored dupes still show).
  if (!key || !withinDailyCap()) {
    return NextResponse.json({ items: hit?.items ?? [], cached: !!hit, capped: !key ? false : true });
  }

  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_shopping");
    u.searchParams.set("q", `${brand} women`);
    u.searchParams.set("hl", "en");
    u.searchParams.set("api_key", key);
    dayCalls++;
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(22000) });
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
        title: String(r?.title ?? "").slice(0, 140),
        link,
        source: String(r?.source ?? "").slice(0, 60) || undefined,
        thumbnail,
        price: typeof r?.price === "string" ? r.price : undefined,
      });
      if (items.length >= 24) break;
    }
    if (CACHE.size >= MAX_BRANDS) CACHE.delete(CACHE.keys().next().value!);
    CACHE.set(cacheKey, { at: Date.now(), items });
    return NextResponse.json({ items, cached: false });
  } catch {
    return NextResponse.json({ items: hit?.items ?? [] });
  }
}
