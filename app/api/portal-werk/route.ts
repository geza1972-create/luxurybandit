import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { motivPfad } from "@/lib/versusforge-moderation";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";

/**
 * DAS WERK OHNE TEXT — für die Kacheln im Portal lakatosbandi.com (Owner 10.09.2026: „nicht
 * Bilder, sondern Hooks" — der Satz steht als Schrift UNTER dem Werk, nie darauf).
 *
 * `/api/versusforge-bild` baut das fertige Anzeigenbild mit Schrift; hier kommt nur das
 * angenommene Motiv. Aus der Prüfablage (`versusforge-motiv-pruefung/`) wird NIE etwas
 * ausgeliefert — dieses Motiv liest nur `motivPfad`.
 *
 * NUR FREIGEGEBENE KÜNSTLER. Wer noch geprüft wird oder abgelehnt ist, dessen Werke liefert
 * das Portal nicht aus — auch nicht über eine erratene Adresse.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const kennung = String(sp.get("m") ?? "").slice(0, 80);
  const i = String(sp.get("i") ?? "-1").slice(0, 6);
  const m = kennung ? await mandantLesen(kennung) : null;
  /* MIT SEINEM SCHLÜSSEL SIEHT ER SEINE BILDER AUCH VOR DER FREIGABE (Owner 11.09.2026: „Dort müssen sofort
     alle Bilder zu sehen sein") — Käufer weiterhin erst danach. */
  const eigen = (!!m && !!sp.get("k") && schluesselStimmt(m.schluessel, String(sp.get("k"))))
    /* …und der Admin mit seinem Schlüssel (Owner 11.09.2026: „wie soll ich es freigeben, wenn ich keine Bilder sehen kann?"). */
    || (!!sp.get("s") && mandantPruefen(EIGENER_MANDANT, String(sp.get("s"))).ok);
  if (!m || !istKuenstler(m) || (m.freigabe !== "frei" && !eigen)) return new Response("Not found", { status: 404 });

  /* Das Künstlerfoto fällt NIE auf ein Werk zurück — lieber der Platzhalter als ein Bild am falschen Ort. */
  /* Beim Bearbeiten auch kein Rückfall aufs Standardbild: Fehlt sein Bild (z. B. noch in der Prüfung), zeigt
     die Kachel einen Platzhalter statt eines fremden Werks. */
  const pfade = i === "profil" ? [motivPfad(kennung, "profil")]
    : eigen ? [motivPfad(kennung, i)]
    : [motivPfad(kennung, i), motivPfad(kennung, "")];
  for (const pfad of pfade) {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
    if (res.ok) {
      return new Response(await res.arrayBuffer(), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": eigen ? "private, no-store" : "public, max-age=300, s-maxage=300" },
      });
    }
  }
  return new Response("Not found", { status: 404 });
}
