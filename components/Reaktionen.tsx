/**
 * HERZCHEN UND ZURUFE — die Ebene, die aus einem Foto einen Moment macht.
 *
 * Owner 31.07.2026: „die Herzchen fehlen und wow…" — und gleich danach: „auch im Original
 * Herzchen und wow."
 *
 * Beides zusammen sagt, wofür sie da sind: Auf dem BEISPIEL verkaufen sie (so fühlt es sich
 * an, wenn du das verschickst), auf dem EIGENEN Bild belohnen sie. Ein Standbild allein ist
 * ein Foto; mit aufsteigenden Herzen und Zurufen ist es ein Moment, den jemand geteilt hat.
 *
 * WARUM EIN EIGENER BAUSTEIN und keine Kopie: Die Ebene liegt jetzt an drei Stellen — auf dem
 * Beispielvideo in der Karte, auf dem eigenen Ergebnis und auf den Karten der Galerie.
 * Dreimal dieselbe Animation im Code läuft nach der ersten Änderung auseinander.
 *
 * `pointer-events-none` ist keine Feinheit, sondern die Bedingung: Ohne sie schluckt die
 * Ebene den Tipp auf das Video (= Upload öffnen) und den Ton-Knopf darüber. Sie liegt auf dem
 * Bild, aber sie fängt nichts ab.
 *
 * Die Bewegung selbst steht in `globals.css` (`.lb-heart`, `.lb-bubble`) — hier stehen nur
 * Anzahl, Startpunkte und Zeitversatz. Alles rechnet sich aus dem Index, damit es ohne
 * Zufallszahlen auskommt: Der Server rendert dieselbe Anordnung wie der Browser, sonst
 * springt beim ersten Zeichnen alles einmal um.
 */

const ZURUFE: Record<string, string[]> = {
  wedding: ["😍", "❤️", "so schön", "💍", "wow", "perfect", "🥂", "💐"],
  kiss: ["wow 🔥", "😍", "yes — kiss her!", "💋", "so hot", "❤️", "omg", "perfect"],
};

export default function Reaktionen({ variant = "kiss" }: { variant?: string }) {
  const zurufe = ZURUFE[variant] ?? ZURUFE.kiss;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {[...Array(14)].map((_, i) => (
        <span key={`h${i}`} className="lb-heart"
          style={{
            left: `${6 + (i * 6.7) % 88}%`,
            animationDelay: `${(i * 0.31) % 4.2}s`,
            animationDuration: `${3.6 + (i % 5) * 0.35}s`,
            fontSize: `${14 + (i % 4) * 5}px`,
            ["--lb-drift" as string]: `${(i % 2 ? 1 : -1) * (8 + (i % 3) * 10)}px`,
          }}>
          {i % 3 === 0 ? "💖" : i % 3 === 1 ? "❤️" : "💗"}
        </span>
      ))}
      {/* Zurufe als Sprechblasen — ohne Namen, siehe .lb-bubble in globals.css */}
      {zurufe.map((t, i) => (
        <span key={`b${i}`} className="lb-bubble"
          style={{
            left: `${8 + (i * 11) % 66}%`,
            animationDelay: `${1.2 + (i * 0.72) % 5.4}s`,
            animationDuration: `${5 + (i % 3) * 0.6}s`,
            ["--lb-drift" as string]: `${(i % 2 ? 1 : -1) * (10 + (i % 3) * 8)}px`,
          }}>
          {t}
        </span>
      ))}
    </div>
  );
}
