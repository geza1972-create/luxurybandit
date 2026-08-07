/**
 * HERZCHEN — die Ebene, die aus einem Foto einen Moment macht.
 *
 * Owner 31.07.2026: „die Herzchen fehlen und wow…" — und gleich danach: „auch im Original
 * Herzchen und wow." Auf dem BEISPIEL verkaufen sie, auf dem EIGENEN Bild belohnen sie.
 *
 * SEIT 07.08.2026 LEISE UND OHNE WORTE (Owner: „die herzchen und schrift nicht bold, viel
 * kleiner und ohne schatten … Am besten nur rechts laufend. Also bei allen" · „die schrift
 * am besten raus" · auf die Frage nach dem System-Slide: „keine ausnahmen"):
 *
 *   - Die SPRECHBLASEN sind KOMPLETT weg — auch die Motivations-Zurufe des Systems, die am
 *     04.08. bestellt worden waren. Die sieben-sprachigen Wortlisten (Kuss-Liebessätze,
 *     Geburtstags-, Tanz-, Hochzeits- und System-Zeilen samt Namens-Personalisierung)
 *     stehen im Git-Stand vor diesem Umbau, falls die Entscheidung je zurückkommt.
 *   - Die Herzen laufen NUR NOCH RECHTS in einem schmalen Band (68–95 %) statt übers
 *     Gesicht, sind KLEIN (9–15 px statt 14–29 px) und ohne Schatten (globals.css).
 *
 * WARUM EIN EIGENER BAUSTEIN und keine Kopie: Die Ebene liegt an mehreren Stellen — auf dem
 * Beispielvideo in der Karte, auf dem eigenen Ergebnis und auf den Karten der Galerie.
 * Mehrmals dieselbe Animation im Code läuft nach der ersten Änderung auseinander — genau
 * deshalb greift die neue Vorgabe automatisch überall.
 *
 * `pointer-events-none` ist keine Feinheit, sondern die Bedingung: Ohne sie schluckt die
 * Ebene den Tipp auf das Video (= Upload öffnen) und den Ton-Knopf darüber.
 *
 * Die Bewegung selbst steht in `globals.css` (`.lb-heart`) — hier stehen nur Anzahl,
 * Startpunkte und Zeitversatz. Alles rechnet sich aus dem Index, damit es ohne
 * Zufallszahlen auskommt: Der Server rendert dieselbe Anordnung wie der Browser.
 */

/**
 * DAS SYSTEM BEHÄLT SEINE ZEICHEN STATT HERZEN (Owner 04.08.2026: Antrieb, nicht
 * Zuneigung) — über einem Mann vor seiner künftigen Werkstatt wären Herzen eine andere
 * Geschichte. Die WÖRTER dazu sind seit dem 07.08. weg wie überall.
 */
const SYSTEM_ZEICHEN = ["⚡", "🔥", "👊", "💪", "👑"];

export default function Reaktionen({ variant = "kiss" }: { variant?: string; lang?: string; name?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* Nur rechts, klein, gleichmäßig versetzt — die Werte sind die Vorgabe des Owners
          vom 07.08.2026, siehe Kopf der Datei. */}
      {[...Array(14)].map((_, i) => (
        <span key={`h${i}`} className="lb-heart"
          style={{
            left: `${68 + (i * 6.7) % 27}%`,
            animationDelay: `${(i * 0.31) % 4.2}s`,
            animationDuration: `${3.6 + (i % 5) * 0.35}s`,
            fontSize: `${9 + (i % 4) * 2}px`,
            ["--lb-drift" as string]: `${(i % 2 ? 1 : -1) * (4 + (i % 3) * 4)}px`,
          }}>
          {variant === "plan"
            ? SYSTEM_ZEICHEN[i % SYSTEM_ZEICHEN.length]
            : i % 3 === 0 ? "💖" : i % 3 === 1 ? "❤️" : "💗"}
        </span>
      ))}
    </div>
  );
}
