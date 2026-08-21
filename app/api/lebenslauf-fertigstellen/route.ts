import { NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/try-this-look-store";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";

export const runtime = "nodejs";

/**
 * DAS VIDEO KOMMT ZUM ENTWURF DAZU — zwei Wege (Owner 20.08.2026: KI-Avatar via HeyGen ist
 * jetzt der Regelfall, siehe `app/api/lebenslauf-video`):
 *   `videoUrl`  — schon eine fertige, dauerhafte Adresse (HeyGen-Lauf, von der generischen
 *                 Poll-Route `/api/generate-tryon-video` in unseren Speicher kopiert).
 *   `videoPath` — ein Pfad, den der Client zuvor per signierter Adresse direkt zu Supabase
 *                 hochgeladen hat (`/api/lebenslauf-video-url`) — der ältere Eigenaufnahme-Weg.
 * Diese Route hängt das Ergebnis ans bestehende Profil (aus `/api/lebenslauf-auswertung`).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const videoPath = String(body.videoPath ?? "").trim();
  const videoUrlDirekt = String(body.videoUrl ?? "").trim();
  if (!id || (!videoPath && !videoUrlDirekt)) {
    return NextResponse.json({ error: "Kennung oder Video fehlt." }, { status: 400 });
  }

  const profil = await leseLebenslauf(id);
  if (!profil) {
    return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  }

  const videoUrl = videoUrlDirekt || (await getSignedUrl(videoPath, 60 * 60 * 24 * 365).catch(() => ""));
  if (!videoUrl) {
    return NextResponse.json({ error: "Video konnte nicht abgelegt werden." }, { status: 502 });
  }

  const ok = await schreibeLebenslauf({ ...profil, videoUrl });
  if (!ok) {
    return NextResponse.json({ error: "Profil konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ id, videoUrl });
}
