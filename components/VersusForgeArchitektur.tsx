import { MODULE, zustandVon, istGemessen, type Modul, type Zustand } from "@/lib/versusforge-module";

/**
 * DIE ARCHITEKTUR ALS TEXT (Owner 08.09.2026: „das soll echt aus Text sein, im ASCII-Format,
 * weil das dynamisch sein wird").
 *
 * Kein Bild, keine SVG, keine Bibliothek: eine einzige `<pre>`-Fläche, gezeichnet aus
 * `lib/versusforge-module.ts`. Wird dort ein Modul fertig, ändert sich die Zeichnung beim
 * nächsten Aufruf mit — ein gezeichnetes Schaubild wäre am Tag danach falsch.
 *
 * ES PASST ZUM HAUS: Die Startseite ist ein Video aus Schriftzeichen. Ein Statusbild aus
 * denselben Zeichen ist dieselbe Sprache, kein zweites Gestaltungsmittel.
 *
 * DIE BREITE IST FEST (40 Zeichen). Monospace bricht nicht um; eine Zeile, die auf dem Handy
 * nicht passt, wird abgeschnitten oder schiebt die Seite seitlich. Bei 40 Zeichen und 11 px
 * Schriftgrad bleibt es auf 375 px lesbar. Wer hier etwas verlängert, misst nach.
 *
 * SERVER-BAUSTEIN: `process.env` gehört nicht in den Browser. Was gemessen wird, wird hier
 * gemessen und als fertiger Text ausgeliefert.
 */

const BREITE = 40;
const INNEN = BREITE - 4; // „│ " links und „ │" rechts

const MARKE: Record<Zustand, string> = {
  laeuft: "[ok]",
  teils: "[..]",
  fehlt: "[  ]",
};

const FARBE: Record<Zustand, string> = {
  laeuft: "text-[#7bd88f]",
  teils: "text-[#f6cf51]",
  fehlt: "text-white/30",
};

/** Schneidet zu lang Geratenes ab, statt den Kasten zu sprengen. */
const kurz = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1)}…`);

function kasten(m: Modul, z: Zustand, gemessen: boolean) {
  const marke = MARKE[z];
  /* Name links, Marke rechts, dazwischen Punkte — so bleibt die Marke in jeder Zeile an
     derselben Stelle, auch wenn die Namen verschieden lang sind. */
  const name = kurz(m.name.toUpperCase(), INNEN - marke.length - 2);
  const fuell = ".".repeat(Math.max(1, INNEN - name.length - marke.length - 2));
  const zeile2 = kurz(m.zeile, INNEN);
  /* Ein Fragezeichen hinter der Marke heisst: nicht gemessen, nur eingetragen. Lieber ein
     Zeichen mehr als eine Angabe, der man zu Unrecht glaubt. */
  const hinweis = gemessen ? " " : "?";
  return [
    `┌${"─".repeat(BREITE - 2)}┐`,
    `│ ${name} ${fuell} ${marke}${hinweis}│`,
    `│ ${zeile2.padEnd(INNEN)} │`,
    `└${"─".repeat(BREITE - 2)}┘`,
  ];
}

const PFEIL = `${" ".repeat(Math.floor(BREITE / 2) - 1)}│`;
const SPITZE = `${" ".repeat(Math.floor(BREITE / 2) - 1)}▼`;

export default function VersusForgeArchitektur({ className = "" }: { className?: string }) {
  const env = process.env;

  const zeilen: { text: string; z: Zustand }[] = [];
  MODULE.forEach((m, i) => {
    const z = zustandVon(m, env);
    kasten(m, z, istGemessen(m, env)).forEach(t => zeilen.push({ text: t, z }));
    if (i < MODULE.length - 1) {
      zeilen.push({ text: PFEIL, z });
      zeilen.push({ text: SPITZE, z });
    }
  });

  return (
    <div className={className}>
      {/* Jede Zeile trägt die Farbe ihres Moduls — so sieht man den Stand, ohne die Marken
          zu lesen. Die Verbinder erben die Farbe des Kastens darüber. */}
      <pre className="overflow-x-auto text-[11px] leading-[1.35] tracking-tight md:text-[13px]"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
        {zeilen.map((z, i) => (
          <span key={i} className={`block ${FARBE[z.z]}`}>{z.text}</span>
        ))}
      </pre>
      {/* Die Legende gehört dazu, sonst ist [..] ein Rätsel. */}
      <p className="mt-3 text-[11px] font-bold leading-relaxed text-white/35 md:text-[12px]">
        <span className="text-[#7bd88f]">[ok]</span> läuft · <span className="text-[#f6cf51]">[..]</span> halb ·{" "}
        <span className="text-white/30">[&nbsp;&nbsp;]</span> fehlt · <span className="text-white/50">?</span> nicht gemessen, eingetragen
      </p>
    </div>
  );
}
