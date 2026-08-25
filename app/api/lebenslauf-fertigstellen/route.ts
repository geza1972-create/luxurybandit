import { NextResponse } from "next/server";
import { getSignedUrl, createSignedUploadUrl, readKissLog, writeKissLog } from "@/lib/try-this-look-store";
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
 *
 * UND SIE VERBUCHT DEN KAUF IN DER GALERIE (Owner 24.08.2026: „DU musst das Original-Video
 * speichern unter Käufe und das Ergebnis. Ich muss sie herunterladen können, damit ich
 * daraus ein Werbevideo machen kann."):
 *   - `foto`         — sein zugeschnittenes Foto (Data-URL) wird dauerhaft abgelegt; es ist
 *                      das Poster der Profilseite UND der Galerie-Kachel (Skill `card`:
 *                      nie ein Video ohne Poster) und landet als `personPath` am Auftrag.
 *   - `originalPath` — seine Eigenaufnahme (schon in Supabase, Pfad aus dem Trichter) wird
 *                      am Profil (`aufnahmePath`) UND am Kiss-Log-Auftrag (`audioPath`)
 *                      vermerkt; die Galerie zeigt sie als eigene Kachel mit Download.
 *   - `videoUrl`     — das Ergebnis kommt als `videoUrl` an den Kiss-Log-Auftrag; damit
 *                      hört die „wird erstellt"-Kachel auf zu drehen und der Download steht.
 * Der Auftrag (`id` = Kiss-Log-Kennung aus dem Trichter) wird DIREKT über readKissLog/
 * writeKissLog beschriftet — nicht über `/api/kiss-log update`, dessen Video-Zweig die
 * Kuss-Liefermail auslöst (die passt hier nicht: die Profilseite ist die Lieferung).
 */

/** Data-URL dauerhaft ablegen — dasselbe Muster wie `ablegen` in /api/kiss-log. */
async function fotoAblegen(dataUrl: string): Promise<string> {
  try {
    const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl).trim());
    if (!m) return "";
    const up = await createSignedUploadUrl("uploads", (m[1].split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, ""));
    const put = await fetch(up.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": m[1], "x-upsert": "true" },
      body: new Uint8Array(Buffer.from(m[2], "base64")),
    });
    return put.ok ? up.path : "";
  } catch { return ""; }   // das Poster ist Zugabe — das Profil wird trotzdem fertig
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const videoPath = String(body.videoPath ?? "").trim();
  const videoUrlDirekt = String(body.videoUrl ?? "").trim();
  const foto = String(body.foto ?? "");
  const originalPath = String(body.originalPath ?? "").trim();
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

  /* Sein Foto dauerhaft — als Poster der Seite (10 Jahre signiert wie `persistVideo`). */
  const fotoPath = foto.startsWith("data:") ? await fotoAblegen(foto) : "";
  const fotoUrl = fotoPath ? await getSignedUrl(fotoPath, 60 * 60 * 24 * 365 * 10).catch(() => "") : "";

  /* DER BEZAHLT-STEMPEL SITZT JETZT HIER (Stufe-0-Trichter 25.08.2026): Die Auswertung
     läuft neuerdings VOR der Kasse (`vorab`) und legt den Entwurf unbezahlt an. Fertig
     gebaut wird eine Seite nur, wenn der Kiss-Log-Auftrag wirklich bezahlt ist — sonst
     könnte jeder die Kette per Hand durchrufen und das Produkt gratis abholen. Altprofile
     (bezahlt schon true aus der alten Kette) gehen unverändert durch. */
  let bezahltJetzt = profil.bezahlt === true;
  if (!bezahltJetzt) {
    try { bezahltJetzt = (await readKissLog()).find(x => x.id === id)?.paid === true; } catch { /**/ }
  }
  if (!bezahltJetzt) {
    return NextResponse.json({ error: "Bitte zuerst bezahlen." }, { status: 402 });
  }

  const ok = await schreibeLebenslauf({
    ...profil,
    bezahlt: true,
    videoUrl,
    ...(fotoUrl ? { fotoUrl } : {}),
    ...(originalPath.startsWith("try-this-look/") ? { aufnahmePath: originalPath } : {}),
  });
  if (!ok) {
    return NextResponse.json({ error: "Profil konnte nicht gespeichert werden." }, { status: 500 });
  }

  /* DER KAUF STEHT JETZT IN SEINER GALERIE — Ergebnis + Original am Kiss-Log-Auftrag.
     Scheitert nur diese Beschriftung, bleibt das Profil trotzdem fertig (die Galerie holt
     beim nächsten Lauf nichts nach — deshalb loggen, nicht verschlucken). */
  try {
    const entries = await readKissLog();
    const e = entries.find(x => x.id === id);
    if (e) {
      e.videoUrl = videoUrl;
      e.videoFertigAt = new Date().toISOString();
      if (originalPath.startsWith("try-this-look/")) e.audioPath = originalPath;
      if (fotoPath) e.personPath = e.personPath || fotoPath;
      if (!e.modelName && profil.name) e.modelName = String(profil.name).slice(0, 60);
      await writeKissLog(entries);
    }
  } catch (err) {
    console.error("[lebenslauf-fertigstellen] Galerie-Verbuchung fehlgeschlagen:", err);
  }

  return NextResponse.json({ id, videoUrl });
}
