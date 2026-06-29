import { NextResponse } from "next/server";
import { authorizeStudio } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

// "Similar escapes" search for the Reel tool. A region/place keyword (e.g. "Greece"
// or "Ibiza cliff villa") → SerpApi Google Hotels → bookable stays WITH a price per
// night ("ab 120 €/Nacht"), a thumbnail and a working Booking link. Falls back to a
// Google Images search (no prices) if Hotels returns nothing.

function ymd(daysFromNow: number): string {
  const d = new Date(); d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  if (!(await authorizeStudio(request)).ok) {
    return NextResponse.json({ error: "Studio access only." }, { status: 403 });
  }
  const key = process.env.SERPAPI_KEY;
  if (!key) return NextResponse.json({ error: "SERPAPI_KEY fehlt." }, { status: 400 });

  let query = "";
  try { query = String((await request.json())?.query ?? "").trim(); } catch { /**/ }
  if (!query) return NextResponse.json({ error: "Suchbegriff fehlt." }, { status: 400 });

  type Result = { title: string; link: string; source: string; thumbnail: string; price: string };

  // ── 1) Google Hotels (prices per night) ──
  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_hotels");
    u.searchParams.set("q", query);
    u.searchParams.set("check_in_date", ymd(30));
    u.searchParams.set("check_out_date", ymd(31));
    u.searchParams.set("currency", "EUR");
    u.searchParams.set("gl", "de");
    u.searchParams.set("hl", "de");
    u.searchParams.set("vacation_rentals", "true"); // villas / homes, not just hotels
    u.searchParams.set("api_key", key);
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(25000) });
    const data = await res.json().catch(() => null);
    const props: any[] = Array.isArray(data?.properties) ? data.properties : [];
    const seen = new Set<string>();
    const results: Result[] = props
      .map((p) => {
        const name = String(p?.name ?? "").slice(0, 120).trim();
        const thumb = String(p?.images?.[0]?.thumbnail ?? p?.images?.[0]?.original ?? "").trim();
        // Price per night: prefer the parsed number, format as "ab N €/Nacht".
        const lowNum = p?.rate_per_night?.extracted_lowest ?? p?.total_rate?.extracted_lowest;
        const lowStr = p?.rate_per_night?.lowest ?? p?.total_rate?.lowest ?? "";
        const price = typeof lowNum === "number" && lowNum > 0
          ? `from €${Math.round(lowNum)}/night`
          : (lowStr ? `from ${lowStr}/night` : "");
        // A working booking link: the property's own link if it's already booking/airbnb,
        // else a Booking.com search for the name + place (always resolves).
        const own = String(p?.link ?? "").trim();
        const link = /booking\.com|airbnb\./i.test(own) ? own
          : `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(`${name} ${query}`)}`;
        const source = /airbnb\./i.test(link) ? "Airbnb" : "Booking.com";
        return { title: name, link, source, thumbnail: thumb, price };
      })
      .filter((a) => a.title && a.thumbnail && !seen.has(a.title) && (seen.add(a.title), true))
      .slice(0, 12);
    if (results.length) return NextResponse.json({ results });
  } catch { /* fall through to image search */ }

  // ── 2) Fallback: Google Images (no prices) ──
  const hasTravelWord = /\b(villa|hotel|resort|airbnb|booking|stay|suite|apartment|rental|finca|riad|chalet)\b/i.test(query);
  const q = hasTravelWord ? query : `${query} luxury villa booking.com airbnb`;
  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_images");
    u.searchParams.set("q", q);
    u.searchParams.set("api_key", key);
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(25000) });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      return NextResponse.json({ error: data?.error ?? `Bildsuche-Fehler (${res.status}).` }, { status: 502 });
    }
    const images: any[] = Array.isArray(data?.images_results) ? data.images_results : [];
    const seen = new Set<string>();
    const results: Result[] = images
      .map((m) => ({
        title: String(m?.title ?? "").slice(0, 200).trim(),
        link: String(m?.link ?? m?.source ?? "").trim(),
        source: String(m?.source ?? "").slice(0, 80).trim(),
        thumbnail: String(m?.thumbnail ?? m?.original ?? "").trim(),
        price: "",
      }))
      .filter((a) => a.link && a.thumbnail && !seen.has(a.link) && (seen.add(a.link), true))
      .slice(0, 12);
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Suche fehlgeschlagen." }, { status: 500 });
  }
}
