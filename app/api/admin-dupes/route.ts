import { NextResponse } from "next/server";
import { authorizeStudio } from "@/lib/studio-auth";
import { getSignedUrl, uploadTryThisLookImage } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 30;

export type Alternative = {
  title: string;
  link: string;
  source: string;
  thumbnail: string;
  price: string;       // formatted, e.g. "129.21 RON" / "$29.99"
  priceValue: number;  // numeric for sorting; -1 when unknown
  currency: string;
};

// Finds visually similar products (dupes) for a product image via SerpApi Google
// Lens, returns them sorted by price descending (most expensive first).
export async function POST(request: Request) {
  if (!(await authorizeStudio(request)).ok) {
    return NextResponse.json({ error: "Studio access only." }, { status: 403 });
  }

  const key = process.env.SERPAPI_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "SERPAPI_KEY fehlt in .env.local. Bitte eintragen und Server neu starten." },
      { status: 400 }
    );
  }

  let payload: { imageUrl?: string; imageData?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  // Google Lens needs a publicly fetchable URL. Find-products looks already have
  // a hosted product photo (imageUrl). AI-generated looks only have a base64 data
  // URL, so we upload it first and sign a short-lived URL Lens can read.
  let imageUrl = String(payload.imageUrl ?? "").trim();
  if (!/^https?:\/\//i.test(imageUrl)) {
    const imageData = String(payload.imageData ?? "").trim();
    if (imageData.startsWith("data:image/")) {
      try {
        const path = await uploadTryThisLookImage("uploads", imageData);
        imageUrl = await getSignedUrl(path);
      } catch {
        return NextResponse.json({ error: "Bild konnte nicht hochgeladen werden." }, { status: 500 });
      }
    }
  }
  if (!/^https?:\/\//i.test(imageUrl)) {
    return NextResponse.json({ error: "Kein gültiges Produktbild." }, { status: 400 });
  }

  try {
    const u = new URL("https://serpapi.com/search.json");
    u.searchParams.set("engine", "google_lens");
    u.searchParams.set("url", imageUrl);
    u.searchParams.set("api_key", key);

    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(25000) });
    const data = await res.json().catch(() => null);

    if (!res.ok || data?.error) {
      return NextResponse.json(
        { error: data?.error ?? `Google Lens Fehler (${res.status}).` },
        { status: 502 }
      );
    }

    const matches: any[] = Array.isArray(data?.visual_matches) ? data.visual_matches : [];
    const alternatives: Alternative[] = matches
      .map((m) => ({
        title: String(m?.title ?? "").trim(),
        link: String(m?.link ?? "").trim(),
        source: String(m?.source ?? "").trim(),
        thumbnail: String(m?.thumbnail ?? "").trim(),
        price: String(m?.price?.value ?? "").trim(),
        priceValue: typeof m?.price?.extracted_value === "number" ? m.price.extracted_value : -1,
        currency: String(m?.price?.currency ?? "").trim(),
      }))
      .filter((a) => a.link && a.thumbnail)
      // priced items first, sorted by value descending; unpriced after
      .sort((a, b) => b.priceValue - a.priceValue)
      .slice(0, 12);

    return NextResponse.json({ alternatives });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Dupe-Suche fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
