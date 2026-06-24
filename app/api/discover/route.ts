import { NextResponse } from "next/server";
import { authorizeStudio } from "@/lib/studio-auth";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { chargeCredits, refundCredits, getCuratorCredits, SEARCH_CREDITS } from "@/lib/curator-budget";

export const runtime = "nodejs";
export const maxDuration = 30;

type DiscoverItem = {
  title: string;
  link: string;
  thumbnail: string;
  price: string;
  priceValue: number;
  source: string;
  fromPartner: boolean;
};

// Per-query SerpApi cache: identical web searches reuse results for a window, so
// repeated/overlapping filter searches don't burn SerpApi credits. Module-level
// so it survives across requests on a warm server instance.
const SHOP_CACHE = new Map<string, { at: number; results: any[] }>();
const SHOP_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const SHOP_CACHE_MAX = 300;

// Finds shoppable products by style via SerpApi Google Shopping. Results from
// the admin's partner stores are surfaced first. The curator clicks one to turn
// it into a Trends look (real product photo — no AI hero).
export async function POST(request: Request) {
  if (!(await authorizeStudio(request)).ok) {
    return NextResponse.json({ error: "Studio access only." }, { status: 403 });
  }
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    return NextResponse.json({ error: "SERPAPI_KEY missing in .env.local." }, { status: 400 });
  }

  let payload: { style?: string; queries?: string[]; internal?: boolean };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  // Internal calls (the garment lookup that feeds "Create AI Fashion") are billed as
  // part of the 2-credit generation, so they don't charge a separate search credit.
  const internal = payload.internal === true;
  const style = String(payload.style ?? "").trim().slice(0, 120);
  // Active filters can drive several searches at once (e.g. one per brand);
  // de-dupe, cap to keep SerpApi cost bounded, fall back to the free-text style.
  const queries = Array.from(new Set(
    (Array.isArray(payload.queries) ? payload.queries : [])
      .map(q => String(q ?? "").trim().slice(0, 120))
      .filter(Boolean)
  )).slice(0, 3);
  const searchTerms = queries.length ? queries : (style ? [style] : []);
  if (!searchTerms.length) return NextResponse.json({ error: "Pick at least one filter first." }, { status: 400 });

  // Per-creator credits: reserve the worst-case cost (1 credit per search);
  // cached searches are refunded afterwards. Admin (no curator id) isn't charged.
  const curatorId = request.headers.get("x-curator-id") ?? "";
  if (curatorId && !internal) {
    const reserved = await chargeCredits(curatorId, searchTerms.length * SEARCH_CREDITS, "discover");
    if (!reserved.ok) {
      return NextResponse.json({ error: "You're out of credits. Earn more by getting likes & try-ons on your looks — or buy credits to keep going.", outOfCredits: true, credits: reserved.info }, { status: 402 });
    }
  }

  // Bias to the admin's partner stores: query Google Shopping per store
  // ("{style} {storeName}") and merge. Falls back to a plain style query.
  const state = await readTryThisLookState();
  const partners = (state.partnerStores ?? []).filter(s => s.enabled).slice(0, 3);
  const partnerNames = partners.map(s => s.name.toLowerCase());
  const isPartner = (source: string) => {
    const s = source.toLowerCase();
    return partnerNames.some(p => s.includes(p) || p.includes(s));
  };

  let liveCalls = 0; // SerpApi searches actually billed this request (cache misses)
  const shop = async (q: string): Promise<any[]> => {
    const cacheKey = q.toLowerCase();
    const hit = SHOP_CACHE.get(cacheKey);
    if (hit && Date.now() - hit.at < SHOP_CACHE_TTL_MS) return hit.results;
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_shopping");
    u.searchParams.set("q", q);
    u.searchParams.set("hl", "en");
    u.searchParams.set("api_key", key);
    try {
      liveCalls++; // a real, billable SerpApi request
      const res = await fetch(u.toString(), { signal: AbortSignal.timeout(22000) });
      const data = await res.json().catch(() => null);
      const results = Array.isArray(data?.shopping_results) ? data.shopping_results : [];
      if (SHOP_CACHE.size >= SHOP_CACHE_MAX) SHOP_CACHE.delete(SHOP_CACHE.keys().next().value!);
      SHOP_CACHE.set(cacheKey, { at: Date.now(), results });
      return results;
    } catch { return []; }
  };

  try {
    // Search the whole web (Google Shopping) for the term — so the creator's
    // own brands (Gucci, Versace…) surface, not just the partner stores.
    const batches = await Promise.all(searchTerms.map(shop));
    const seen = new Set<string>();
    const items: DiscoverItem[] = [];
    for (const batch of batches) {
      for (const r of batch) {
        const link = String(r?.product_link ?? r?.link ?? "").trim();
        const thumbnail = String(r?.thumbnail ?? "").trim();
        const title = String(r?.title ?? "").trim();
        if (!link || !thumbnail || !title || seen.has(link)) continue;
        seen.add(link);
        const source = String(r?.source ?? "").trim();
        items.push({
          title, link, thumbnail,
          price: String(r?.price ?? "").trim(),
          priceValue: typeof r?.extracted_price === "number" ? r.extracted_price : -1,
          source,
          fromPartner: isPartner(source),
        });
      }
    }
    items.sort((a, b) => Number(b.fromPartner) - Number(a.fromPartner));
    // Refund the searches that were served from cache (reserved but not billed).
    let credits = null;
    if (curatorId && !internal) {
      const unused = (searchTerms.length - liveCalls) * SEARCH_CREDITS;
      credits = unused > 0
        ? await refundCredits(curatorId, unused, "discover cache refund")
        : await getCuratorCredits(curatorId);
    }
    // searched = billable SerpApi calls this request; cached = reused for free.
    return NextResponse.json({ items: items.slice(0, 24), searched: liveCalls, cached: searchTerms.length - liveCalls, credits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
