/**
 * DER SOUNDTRACK DER ACADEMY — eine Zeile, absichtlich in einer eigenen Datei.
 *
 * Owner 02.09.2026: „hier habe ich dir einen Soundtrack für alle Generierungen angelegt."
 *
 * WARUM NICHT IN `lib/musik.ts` (wo die anderen Stücke stehen) UND NICHT IN
 * `lib/demo-armee.ts` (wo alles andere der Academy steht): Beide Dateien haben eine Seite.
 * `lib/musik.ts` enthält Hooks und ist damit CLIENT-only; `lib/demo-armee.ts` liest den
 * Szenenordner und ist damit SERVER-only. Den Pfad brauchen aber beide Welten — der Trichter
 * (Client) und die Generierungs-Seite (Server). Am 02.09.2026 ist der Produktionsbau zweimal
 * genau daran gescheitert, einmal je Richtung.
 *
 * Eine Datei ohne einen einzigen Import kann jeder lesen. Deshalb steht hier nichts weiter.
 */
/**
 * DIE ADRESSE, UNTER DER DIE ACADEMY LÄUFT (Owner 02.09.2026: „ich habe
 * yourvideogenerator.com reserviert").
 *
 * Sie steht hier, weil diese Datei die einzige im Academy-Umfeld ist, die weder Client- noch
 * Server-gebunden ist — Teilen-Knopf (Client) und Link-Vorschau (Server) brauchen sie beide.
 *
 * WOFÜR SIE GILT: nur für ABSOLUTE Adressen, die das Haus aus der Hand gibt — die
 * Teilen-Adresse und die `openGraph`-Bilder. Alle Verweise INNERHALB der Seiten bleiben
 * relativ (`/academy/start`); die funktionieren auf beiden Domains von selbst, und ein
 * absoluter Link würde einen Besucher, der schon auf der richtigen Domain ist, unnötig
 * umziehen.
 */
export const ACADEMY_DOMAIN = "https://yourvideogenerator.com";

export const ARMEE_MUSIK = "/Armee/szenen/alex-morgan-synthwave-music-neon-drive-horizon-578508.mp3";

/**
 * DAS STANDBILD ZU EINEM BEWERBERPROFIL — für die Bewerbergalerie der Recruiterseite
 * (Owner 04.09.2026: „Wir zeigen nur 9 Bilder statt die Liste unten").
 *
 * Ein Bewerber hat kein eigenes Foto (es ist ein Beispielprofil, kein echter Upload) — er
 * trägt aber den Einsatzbereich, den er sich ausgesucht hat, und der zeigt auf genau eine der
 * fünf Szenen. `bereichVon` (`lib/demo-armee.ts`) vergibt den Bereich immer auf Deutsch,
 * unabhängig von der Anzeigesprache der Seite — die Kennung hier richtet sich deshalb
 * ebenfalls danach.
 *
 * STEHT HIER UND NICHT IN `lib/demo-armee.ts`: Die Bewerberliste rendert CLIENT-seitig
 * (`components/RecruiterDashboard.tsx`, „use client"). Ein einziger Werte-Import von dort aus
 * `demo-armee.ts` zieht dessen serverseitige Mail-Versendung (`nodemailer`) in das
 * Client-Bundle — dort scheitert das Bündeln an `fs`, das im Browser nicht existiert. Diese
 * Datei bleibt ohne einen einzigen Import, deshalb kann sie jede Seite lesen.
 */
const BEREICH_SZENE: Record<string, string> = {
  Cybersicherheit: "cybersicherheit",
  Sanitäterin: "sanitaeterin",
  Pilot: "pilot",
  Feldsoldat: "feldsoldat",
  Panzerbesatzung: "panzerbesatzung",
};

export function bereichBild(bereich: string): string {
  const id = BEREICH_SZENE[bereich] ?? "cybersicherheit";
  return `/Armee/szenen/${id}.jpg`;
}

/**
 * DASSELBE STANDBILD, ABER DIE BESCHRIFTETE FASSUNG (Owner 04.09.2026: „und auch in den
 * templates die schrift einbauen. Das hattest du schon. Das ist doch ein und das selbe
 * Modul").
 *
 * Kein zweites Modul, keine zweite Beschriftung — dieselben fünf Szenen, derselbe
 * Namens-Jahrgang wie in der Anzeigen-Galerie (`demoMotive()` in `lib/demo-armee.ts`,
 * Dateien in `public/Armee/anzeigen/`), nur hier für die Bewerbergalerie aufgerufen. `bereich`
 * bleibt Deutsch (siehe `bereichBild`), `sprache` steuert nur, welche Sprachfassung des
 * eingebrannten Dankestextes zurückkommt.
 */
export function bereichAnzeigenBild(bereich: string, sprache: string): string {
  const id = BEREICH_SZENE[bereich] ?? "cybersicherheit";
  const s = sprache === "de" || sprache === "ro" || sprache === "en" ? sprache : "en";
  return `/Armee/anzeigen/${id}-${s}.jpg`;
}
