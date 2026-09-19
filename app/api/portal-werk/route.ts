import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { motivPfad, pruefPfad } from "@/lib/versusforge-moderation";
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
  /**
   * ── ER SIEHT AUCH, WAS IN DER PRÜFUNG ODER ABGELEHNT IST (Owner 18.09.2026: „das Bild einfach
   * nur deaktiviert markieren und er soll da austauschen") ────────────────────────────────────
   *
   * Seit jedes Bild erst freigegeben werden muss, liegt sein frisch hochgeladenes Werk in der
   * Prüfablage — im Dashboard stand dort eine leere graue Kachel. Er sah also nicht, WELCHES
   * Bild gerade wartet oder abgelehnt wurde, und sollte es trotzdem austauschen.
   *
   * NUR FÜR IHN UND DEN OWNER (`eigen`): Für Käufer bleibt die Prüfablage unsichtbar, sonst
   * wäre die ganze Freigabe umsonst. Deshalb steht der Prüfpfad auch nur in diesem Zweig.
   */
  /**
   * ── IM DASHBOARD GEWINNT DAS NEUESTE (Owner 18.09.2026: „ich habe 2 Bilder hochgeladen, und
   * in der Mitte, wenn ich speichere, ist das alte wieder da") ────────────────────────────────
   *
   * Die Reihenfolge hier stand auf „Galerie zuerst". Wer ein veröffentlichtes Werk ersetzte, sah
   * danach weiter das ALTE: Das neue lag in der Prüfablage, das alte noch in der Galerie — und
   * gezeigt wurde das erste, das gefunden wurde. Es sah aus, als sei der Upload verloren.
   *
   * FÜR IHN gilt jetzt umgekehrt: Was er zuletzt hochgeladen hat, steht in seinem Dashboard —
   * mit dem gelben Etikett daneben, das sagt, dass es geprüft wird.
   *
   * FÜR KÄUFER ÄNDERT SICH NICHTS: Sie sehen weiter nur die Galerie, und bis zur Freigabe steht
   * dort das alte Bild. Genau so soll es sein — sonst wäre ein ungeprüftes Werk öffentlich.
   */
  /**
   * ── KEIN RÜCKFALL AUFS STANDARDBILD (Owner 19.09.2026, an adrianrosu: „bei ihm erscheint das
   * selbe Bild mehrmals" · „wieso? hat er das mehrmals hochgeladen?") ─────────────────────────
   *
   * NEIN, HAT ER NICHT. Hier stand `[motivPfad(kennung, i), motivPfad(kennung, "")]` — und
   * `motivPfad(…, "")` ist `standard.jpg`. Fehlte irgendein Werk in der Galerie, bekam der
   * Besucher also STILL das Hauptmotiv geliefert, unter dem Titel und dem Satz des fehlenden
   * Werks. Bei Adrian sind acht von zehn Fotos abgelehnt: acht Kacheln, achtmal dasselbe Bild.
   *
   * Der zweite Pfad war ohnehin nie ein echter Rückfall: `motivPfad` bildet `-1` UND `""` auf
   * `standard.jpg` ab, für das Hauptmotiv griff also schon der erste Pfad. Übrig blieb genau
   * der Fall, in dem er schadet.
   *
   * 404 IST DIE EHRLICHE ANTWORT. Was es nicht gibt, wird nicht durch etwas anderes ersetzt —
   * dieselbe Begründung, die direkt darüber schon für den Bearbeiten-Fall steht. Damit gar
   * nicht erst ein leerer Rahmen entsteht, fallen abgelehnte Werke seit heute aus den Listen
   * (`abgelehntAm`, siehe lib/versusforge-mandanten.ts).
   */
  const pfade = i === "profil" ? (eigen ? [pruefPfad(kennung, "profil"), motivPfad(kennung, "profil")] : [motivPfad(kennung, "profil")])
    : eigen ? [pruefPfad(kennung, i), motivPfad(kennung, i)]
    : [motivPfad(kennung, i)];
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
