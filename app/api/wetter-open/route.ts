import { recordWetterClick } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DAS ZÄHLPIXEL DER E-MAIL (Owner 30.07.2026: „9 geöffnet bis jetzt. Das ist gar nichts").
 *
 * Bis hierher wurde nur der KLICK auf den Link gezählt. Damit lassen sich zwei völlig
 * verschiedene Fälle nicht unterscheiden:
 *   · die Mail kam nie an (Spam, abgelehnt) → ein Zustellproblem
 *   · die Mail kam an, wurde gelesen, aber der Link nicht angeklickt → ein Inhaltsproblem
 * Ohne diese Unterscheidung optimiert man ins Blaue.
 *
 * EHRLICH BLEIBEN, was das Pixel kann und was nicht: Es lädt nur, wenn der Empfänger Bilder
 * anzeigt. Gmail lädt sie über einen eigenen Zwischenspeicher (zählt also), Apple Mail lädt
 * sie teils VORSORGLICH ohne echtes Lesen (zählt zu viel), andere Programme laden gar nichts
 * (zählt zu wenig). Die Zahl ist eine Untergrenze mit Rauschen — aber der Unterschied
 * zwischen „0 von 73" und „40 von 73" ist trotzdem eindeutig.
 */

// 1×1 transparentes GIF — das kleinste Bild, das es gibt.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: Request) {
  const u = new URL(request.url);
  const subId = (u.searchParams.get("s") ?? "").trim();
  const modelId = (u.searchParams.get("m") ?? "").trim() || undefined;
  // Best effort: ein fehlgeschlagenes Zählen darf das Bild nie verhindern, sonst sieht der
  // Empfänger ein kaputtes Bild in der Mail.
  if (subId) await recordWetterClick(subId, "email", modelId, "open").catch(() => {});
  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
