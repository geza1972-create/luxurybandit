import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { filmPfad, sprecherPfad, sprecherWebmPfad, sprecherBildPfad, sprecherTonPfad } from "@/lib/lakatosbandi-film";

/**
 * DER FILM ZU EINEM WERK (Owner 15.09.2026: „der qr code führt nur zu einem video full seite").
 *
 * Wie `api/portal-werk`, nur mit Bewegtbild: Die Datei liegt in unserer Ablage, die Seite
 * bekommt sie über diese Adresse. Keine signierte Supabase-Adresse nach draussen — die läuft
 * ab, und ein QR-Code auf einem gedruckten Poster läuft nicht ab.
 *
 * LANGE ZWISCHENSPEICHERUNG: Ein Film zu einem gemeinfreien Gemälde ändert sich nie. Wer ihn
 * einmal geladen hat, soll ihn nicht bei jedem Scan neu holen.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const u = new URL(request.url);
  const mandant = str(u.searchParams.get("m"), 80);
  const roh = str(u.searchParams.get("i"), 10);
  const nr = roh === "standard" || /^-?\d+$/.test(roh) ? roh : "standard";
  if (!mandant) return new NextResponse(null, { status: 404 });

  /* `art=sprecher` holt den Film, in dem der Künstler über sein Werk spricht — sonst den Zoom
     (Owner 17.09.2026). Eine Route für beide: Auslieferung, Zwischenspeicher und Fehlerfall
     sind identisch, nur der Pfad unterscheidet sich. */
  const art = str(u.searchParams.get("art"), 20);
  /* ── ZWEI FASSUNGEN, EIN NAME (Owner 17.09.2026) ────────────────────────────────────────
     Ein gerenderter Film liegt als `mp4`, eine Aufnahme aus Chrome als `webm`. Wer den Code
     scannt, soll davon nichts merken: gefragt wird erst nach dem einen, dann nach dem anderen. */
  if (art === "sprecher") {
    for (const [p, typ] of [[sprecherPfad(mandant, nr), "video/mp4"], [sprecherWebmPfad(mandant, nr), "video/webm"]] as const) {
      const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(p)}`);
      if (r.ok) {
        return new NextResponse(await r.arrayBuffer(), {
          headers: { "Content-Type": typ, "Cache-Control": "public, max-age=31536000, immutable" },
        });
      }
    }
    return new NextResponse(null, { status: 404 });
  }

  const pfad = art === "sprecher" ? sprecherPfad(mandant, nr)
    : art === "sprecherbild" ? sprecherBildPfad(mandant, nr)
    /* Seine vorgelesene Stimme — dieselbe Auslieferung, nur ein anderer Typ (Owner 17.09.2026). */
    : art === "stimme" ? sprecherTonPfad(mandant, nr)
    : filmPfad(mandant, nr);
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (!res.ok) return new NextResponse(null, { status: 404 });

  return new NextResponse(await res.arrayBuffer(), {
    headers: {
      "Content-Type": art === "sprecherbild" ? "image/jpeg"
        : art === "stimme" ? "audio/webm"
        : "video/mp4",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
