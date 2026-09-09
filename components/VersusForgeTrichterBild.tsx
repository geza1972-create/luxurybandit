"use client";

/**
 * DER TRICHTER ALS ZEICHNUNG (Owner 08.09.2026: „Ich dachte, wir liefern den visuellen Plan
 * (ASCII)" — beim ersten eigenen Durchlauf, als der Plan als nummerierte Liste ankam).
 *
 * Er hat recht, und es war ein Bruch: Die Startseite ist eine Maschine aus Schriftzeichen,
 * der Bauplan zeichnet in ASCII — und ausgerechnet das ERGEBNIS, das einzige Stück, das der
 * Kunde behält, kam als Aufzählung. Dieselbe Sprache muss bis zum Schluss durchhalten,
 * sonst ist die Gestaltung Dekoration am Eingang statt Bauart.
 *
 * WARUM ES SICH VERENGT: Ein Trichter, der als gleich breite Kästen gezeichnet ist, ist
 * keine Zeichnung, sondern eine Liste mit Rahmen. Die Verengung IST die Aussage — oben
 * kommen viele an, unten bleiben die, die ihre Angaben hinterlassen.
 *
 * UNTERSCHIED ZUM BAUPLAN (`VersusForgeArchitektur`): Der zeigt UNSERE Module und misst
 * `process.env` — Serverstoff. Dieser hier zeichnet den Trichter DES KUNDEN aus seinem
 * eigenen Plan und läuft im Browser. Zwei Zeichnungen, eine Formensprache; sie zu
 * verschmelzen hiesse, Kundeninhalt und Hausstatus in einen Baustein zu zwingen.
 *
 * DIE BREITE IST GERECHNET, NICHT GERATEN: Monospace bricht nicht um. 40 Zeichen bei 11 px
 * bleiben auf 375 px lesbar — dieselbe Grenze wie im Bauplan. Wer sie ändert, misst nach.
 */

const BREITE = 40;
/* Unter dieser Breite wird der Umbruch zum Wortsalat — die Verengung hört hier auf,
   egal wie viele Schritte kommen. */
const SCHMALSTE = 30;

/** Bricht auf Wortgrenzen um. Ein Wort, das allein zu lang ist, wird hart geteilt —
    lieber ein zerschnittenes Wort als eine Zeile, die den Kasten sprengt. */
function umbrechen(text: string, breite: number): string[] {
  const zeilen: string[] = [];
  let aktuell = "";
  for (const wort of String(text ?? "").trim().split(/\s+/).filter(Boolean)) {
    if (wort.length > breite) {
      if (aktuell) { zeilen.push(aktuell); aktuell = ""; }
      let rest = wort;
      while (rest.length > breite) { zeilen.push(rest.slice(0, breite)); rest = rest.slice(breite); }
      aktuell = rest;
      continue;
    }
    if (!aktuell) { aktuell = wort; continue; }
    if (aktuell.length + 1 + wort.length <= breite) aktuell += ` ${wort}`;
    else { zeilen.push(aktuell); aktuell = wort; }
  }
  if (aktuell) zeilen.push(aktuell);
  return zeilen.length ? zeilen : [""];
}

/** Setzt eine Zeile mittig in die Gesamtbreite, damit die Verengung symmetrisch wirkt. */
const mittig = (s: string) => {
  const luft = Math.max(0, BREITE - s.length);
  return " ".repeat(Math.floor(luft / 2)) + s;
};

type Zeile = { text: string; ton: "rahmen" | "inhalt" | "nummer" };

export default function VersusForgeTrichterBild({
  schritte,
  letzterHinweis = "",
  className = "",
}: {
  schritte: string[];
  /** Kurzer Zusatz unter dem letzten Kasten — z. B. was am Ende bei ihm ankommt. */
  letzterHinweis?: string;
  className?: string;
}) {
  const gefiltert = schritte.map(s => String(s ?? "").trim()).filter(Boolean);
  if (!gefiltert.length) return null;

  const zeilen: Zeile[] = [];

  gefiltert.forEach((schritt, i) => {
    /* Je Schritt zwei Zeichen schmaler, bis zur Untergrenze. Bei drei bis vier Schritten
       ergibt das eine sichtbare, aber nicht erdrückende Verjüngung. */
    const breite = Math.max(SCHMALSTE, BREITE - i * 2);
    const innen = breite - 4;
    const kopf = `${i + 1}/${gefiltert.length}`;

    zeilen.push({ text: mittig(`┌${"─".repeat(breite - 2)}┐`), ton: "rahmen" });
    /* Die Schrittzahl steht im Kasten, nicht daneben: Wer den Plan abfotografiert und
       weiterschickt, soll die Reihenfolge im Bild haben. */
    zeilen.push({ text: mittig(`│ ${kopf.padEnd(innen)} │`), ton: "nummer" });
    umbrechen(schritt, innen).forEach(z => {
      zeilen.push({ text: mittig(`│ ${z.padEnd(innen)} │`), ton: "inhalt" });
    });
    zeilen.push({ text: mittig(`└${"─".repeat(breite - 2)}┘`), ton: "rahmen" });

    if (i < gefiltert.length - 1) {
      zeilen.push({ text: mittig("│"), ton: "rahmen" });
      zeilen.push({ text: mittig("▼"), ton: "rahmen" });
    }
  });

  return (
    <div className={className}>
      <pre
        className="overflow-x-auto text-[11px] leading-[1.35] tracking-tight md:text-[13px]"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        {zeilen.map((z, i) => (
          <span
            key={i}
            className={`block ${
              z.ton === "inhalt" ? "text-white/85" : z.ton === "nummer" ? "text-[#f6cf51]" : "text-white/35"
            }`}
          >
            {z.text}
          </span>
        ))}
      </pre>
      {letzterHinweis && (
        <p className="mt-2 text-[13px] font-semibold leading-snug text-white/45 md:text-[14px]">{letzterHinweis}</p>
      )}
    </div>
  );
}
