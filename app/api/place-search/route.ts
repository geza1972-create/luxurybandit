import { NextResponse } from "next/server";
import { authorizeStudio } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

// "Similar escapes" search for the Reel tool: a plain text query (e.g. "Ibiza cliff
// villa pool") → SerpApi Google Images → places/stays with a thumbnail + source link.
// Reverse-image search (admin-dupes) fails on AI-generated location renders, so a
// keyword search is the reliable path. Returns results in the look's dupe shape.
export async function POST(request: Request) {
  if (!(await authorizeStudio(request)).ok) {
    return NextResponse.json({ error: "Studio access only." }, { status: 403 });
  }
  const key = process.env.SERPAPI_KEY;
  if (!key) return NextResponse.json({ error: "SERPAPI_KEY fehlt." }, { status: 400 });

  let query = "";
  try { query = String((await request.json())?.query ?? "").trim(); } catch { /**/ }
  if (!query) return NextResponse.json({ error: "Suchbegriff fehlt." }, { status: 400 });

  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_images");
    u.searchParams.set("q", query);
    u.searchParams.set("api_key", key);
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(25000) });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
      return NextResponse.json({ error: data?.error ?? `Bildsuche-Fehler (${res.status}).` }, { status: 502 });
    }
    const images: any[] = Array.isArray(data?.images_results) ? data.images_results : [];
    const seen = new Set<string>();
    const results = images
      .map((m) => ({
        title: String(m?.title ?? "").slice(0, 200).trim(),
        link: String(m?.link ?? m?.source ?? "").trim(),       // the page (hotel/booking/blog)
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
