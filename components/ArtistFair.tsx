/**
 * DAS SIEGEL (Owner 18.09.2026: „Respect the Artist … als Siegel" · „ich will es aber als Marke
 * machen" · „alles was in unserem Shop gekauft wurde ist Artist Fair").
 *
 * ── ES IST SEIN STEMPEL, NICHT MEINER (18.09.2026: „ich habe dir den png abgelegt für den
 * artistfairstamp in public/lakatosbandi. Den musst du einsetzen") ──────────────────────────
 *
 * Hier stand ein gezeichnetes SVG als Platzhalter. Jetzt liegt der echte Stempel als Bild vor —
 * gesetzt, gesperrt und gekerbt, wie er ihn haben will. Das Weiss ist herausgenommen
 * (`artist-fair-stempel.png`, durchsichtig), damit er auf dem cremefarbenen Blatt sitzt und
 * nicht in einem weissen Kasten.
 *
 * Die Grösse bestimmt entweder `groesse` in Pixeln oder — bei `groesse={0}` — der Rahmen darum
 * (im Poster in `cqw`, damit er mit dem Blatt wächst).
 */
export default function ArtistFair({ groesse = 96, klasse = "" }: {
  groesse?: number;
  klasse?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/lakatosbandi/artist-fair-stempel.png" alt="Artist Fair — Respect the Artist"
      {...(groesse ? { width: groesse, height: groesse } : {})}
      className={klasse} loading="lazy" decoding="async" />
  );
}
