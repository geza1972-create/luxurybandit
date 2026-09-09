import { headers } from "next/headers";

/**
 * EIN CODE, ZWEI TÜREN (Owner 08.09.2026: „Es muss auf beiden Domains laufen").
 *
 * Dieselbe Anwendung antwortet auf `luxurybandit.com` und auf `versusforge.com`. Welche
 * Marke eine Seite trägt, entscheidet die ADRESSE, unter der jemand ankommt — nicht ein
 * Schalter im Code und schon gar nicht eine zweite Codebasis.
 *
 * WARUM NICHT EINFACH ZWEI PROJEKTE: Ein Zwilling müsste doppelt gepflegt werden, und die
 * Fassungen laufen auseinander — genau der Fehler, den das Haus mit `ein-tunnel-geruest-
 * fuer-alle` an einer anderen Stelle schon einmal bezahlt hat. Zwei Domains auf EIN Projekt
 * ist bei Vercel eine Zeile in den Einstellungen und hier eine Funktion.
 *
 * WAS SICH DAMIT ÄNDERT: der Name im Fuss, im Kopf, in den Pflichtseiten und in
 * Vorschaubildern. NICHT die Produkte: Was unter welcher Adresse erreichbar ist, entscheidet
 * weiterhin der Pfad. Es gibt keine Sperre — wer die Kuss-Seite unter versusforge.com
 * aufruft, sieht sie. Das ist Absicht: Eine Sperre wäre eine zweite Wahrheit, die man
 * pflegen muss, und kaputte Links sind schlimmer als eine unerwartete Seite.
 *
 * WORAUF ZU ACHTEN IST: `headers()` macht eine Seite dynamisch. Auf Seiten, die statisch
 * bleiben sollen, wird diese Funktion NICHT benutzt — dort steht die Marke fest.
 */

export type Marke = "luxurybandit" | "versusforge";

export type MarkenAngaben = {
  /** Der Name, wie er auf der Seite steht — Fuss, Kopf, Pflichtseiten. */
  name: string;
  /** Die Zeile darunter. Bei „Versus" ist sie Pflicht: ein „gegen" ohne genannten
   *  Gegner klingt nur streitlustig. */
  zeile: string;
  /** Die eigene Adresse, für Links und Vorschaubilder. */
  domain: string;
};

const ANGABEN: Record<Marke, MarkenAngaben> = {
  luxurybandit: {
    name: "LUXURYBANDIT · AI-MEDIA CREATOR",
    zeile: "",
    domain: "luxurybandit.com",
  },
  versusforge: {
    name: "VERSUSFORGE",
    zeile: "Dein eigener Kanal. Nicht gemietet.",
    domain: "versusforge.com",
  },
};

/**
 * Die Marke aus dem Host-Kopf der Anfrage.
 *
 * `x-forwarded-host` steht vor `host`: Hinter Vercels Weiterleitung trägt `host` die
 * interne Adresse, nicht die, die der Besucher eingetippt hat. Wer nur `host` liest,
 * bekommt auf beiden Domains dasselbe Ergebnis und merkt es erst in der Produktion.
 */
export async function markeAusAnfrage(): Promise<Marke> {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
    /* Auch Vorschau-Adressen und `www.` treffen zu — deshalb `includes` statt Gleichheit. */
    if (host.includes("versusforge")) return "versusforge";
  } catch { /* ausserhalb einer Anfrage (Build, Skript) — dann das Haus */ }
  return "luxurybandit";
}

/** Name, Zeile und Adresse zur Marke. */
export const markenAngaben = (m: Marke): MarkenAngaben => ANGABEN[m];

/** Kurzform für Seiten, die nur die Angaben brauchen. */
export async function markeJetzt(): Promise<MarkenAngaben> {
  return ANGABEN[await markeAusAnfrage()];
}
