import { NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Welche Katalogbilder sind SAUBERE Kleidungsfotos? Die Liste entsteht offline mit
 * `scripts/classify-wardrobe.mjs` (misst Hautanteil + Hintergrund) und liegt im Storage.
 *
 * Warum überhaupt: Im Anzieh-Slider soll Kleidung stehen, keine fremde Frau. Fotos mit
 * Person schleppen Körper und Pose in die Anzieh-Pipeline und brechen die Illusion, weil
 * der Kunde gerade „seine" Frau ausgewählt hat.
 *
 * Fehlt die Liste, geben wir `null` zurück — die Funnels zeigen dann ALLES statt nichts.
 */
export async function GET() {
  try {
    const url = await getSignedUrl("try-this-look/wardrobe-garments.json", 60 * 5).catch(() => "");
    if (!url) return NextResponse.json({ ids: null });
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ ids: null });
    const data = await res.json().catch(() => null);
    const ids = Array.isArray(data?.ids) ? data.ids.map(String) : null;
    return NextResponse.json({ ids, savedAt: data?.savedAt ?? null });
  } catch {
    return NextResponse.json({ ids: null });
  }
}
