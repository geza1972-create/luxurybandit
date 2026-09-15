"use client";

import { useEffect, useState } from "react";

/**
 * ── DIE STEIN-GESCHICHTE ALS ANIMATION IM TRICHTER (Owner 14.09.2026: „baue im trichter diesen
 * slide ein als animation") ──────────────────────────────────────────────────────────────────
 *
 * DIE VORLAGE WAR EIN FREMDES BEISPIEL (ein Stein wird durch eine erfundene Geschichte zum
 * Haustier). Übernommen ist nur die FORM — vier Karten, wachsender Text, eine Pointe am Ende —
 * nicht der Inhalt: Hier erzählt die Geschichte über UNS, nicht über ein beliebiges Produkt,
 * und endet mit dem Satz, den das Kunst-Rezept seit heute trägt: „man beschreibt, was man
 * nicht sieht" ([[spruch-ton-louisett-massstab]]).
 *
 * ── WARUM SIE UNTER DEM KNOPF STEHT, NICHT DAVOR ────────────────────────────────────────────
 *
 * Dieselbe Karte wurde am 13.09.2026 zweimal geleert, weil Erklärtext davor Gespräche gekostet
 * hat (9 von 25 endeten genau hier, mit dem Van-Gogh-Beispiel). Der Knopf zum Hochladen bleibt
 * das Erste, was er sieht und drücken kann — diese Animation läuft daneben her, für wer noch
 * einen Moment liest, bevor er tippt.
 *
 * ── NUR RUMÄNISCH ────────────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Entscheidung wie beim übrigen Trichtertext (Owner: „A" — native Texte, nur Rumänisch,
 * keine Maschinenübersetzung). Für die übrigen Sprachen rendert die Komponente nichts, statt
 * eine schlechte Übersetzung zu zeigen.
 */

/**
 * ── EINE FLÄCHE IN JEDER KARTE, NICHT NUR DER ERSTEN (Owner 14.09.2026: „e ist zu klein" ·
 * „muss in allen drin stehen") ────────────────────────────────────────────────────────────────
 *
 * Vier Stufen, dieselbe blaue Leinwand — sie füllt sich, wie ein Werk beim Malen: erst reine
 * Farbe, dann ein zweiter Ton dazu, dann ein dritter, am Ende ein Verlauf, der nach einem
 * fertigen Bild aussieht. Kein echtes Foto (das wäre ein fremdes Werk), sondern eine ehrliche
 * Andeutung mit reinem CSS.
 */
/* Owner 14.09.2026: „und die story noch dazu, es reicht nicht ein kurzer satz" — zwei bis drei
   Sätze je Karte, im selben Ton wie das Kunst-Rezept seit heute verlangt: eine Geschichte, keine
   Beschreibung ([[spruch-ton-louisett-massstab]]). */
/* ES BLEIBT BEI EINEM MOTIV (Owner 14.09.2026: „das bild soll immer blau bleiben nicht bunt")
   — kein Wechsel von Karte zu Karte. Seit dem 15.09.2026 ist es kein Farbfeld mehr, sondern
   eine leere Leinwand und danach ein gemaltes Bild; der Grundsatz gilt weiter: EIN Motiv, nur
   die Geschichte wächst. */

/**
 * ── IN ALLEN DREI PORTALSPRACHEN (Owner 15.09.2026: „warum sieht en anders aus als ro?", nachdem
 * er dieselbe Frage schon für Deutsch gestellt hatte) ─────────────────────────────────────────
 *
 * Die Karten standen nur auf Rumänisch, und der ganze Baustein war auf `lang === "ro"` gesperrt —
 * Deutsch und Englisch sahen deshalb einen halb leeren Trichter.
 *
 * VON HAND GESCHRIEBEN, NICHT ÜBERSETZT: Dieselbe Regel wie bei den Werk-Sprüchen. Die deutschen
 * und englischen Fassungen sagen dasselbe, aber in ihrer eigenen Sprache gebaut.
 */
type Karte = { label: string; text: string; fuss: string };

const KARTEN_DE: Karte[] = [
  { label: "1/5", text: "Eine leere Leinwand. Niemand hat sie berührt — noch sagt sie über niemanden etwas.",
    fuss: "WERT: NICHTS" },
  { label: "2/5", text: "In zwei Tagen aus der Leidenschaft und der Erinnerung des Künstlers entstanden, trägt dieses Blau den Wunsch, etwas zu halten, was die Zeit nicht hält — einen Moment, ein Gefühl, eine Spur, die sich nie wiederholt.",
    fuss: "IMMER NOCH EINE LEINWAND" },
  { label: "3/5", text: "Sie hat einen Ton, der sich ein einziges Mal gemischt hat, in diesem Licht, an diesem Tag. Ein zweites Mal findest du ihn nicht, so sehr du es versuchst.",
    fuss: "IMMER NOCH EINE LEINWAND" },
  { label: "4/5", text: "Wir schreiben ihre Geschichte: woher sie kommt, was sie gesehen hat, was sie verschweigt. Von da an sieht niemand mehr nur die Farbe.",
    fuss: "HIER BEGINNT DER WERT" },
  { label: "5/5", text: "Dieselbe Leinwand kann 10 € bringen oder 1000 €. Der Unterschied liegt nicht auf der Leinwand — er liegt darin, was wir über sie sagen und wem wir sie zeigen.",
    fuss: "DIESELBE LEINWAND" },
];

const KARTEN_EN: Karte[] = [
  { label: "1/5", text: "An empty canvas. Nobody has touched it yet — so far it says nothing about anyone.",
    fuss: "VALUE: NOTHING" },
  { label: "2/5", text: "Born over two days out of the artist's passion and memory, this blue carries the wish to keep something time cannot hold — a moment, a feeling, a trace that will never come again.",
    fuss: "STILL JUST A CANVAS" },
  { label: "3/5", text: "It holds a colour that mixed once, in that light, on that day. You will not find it a second time, however hard you try.",
    fuss: "STILL JUST A CANVAS" },
  { label: "4/5", text: "We write its story: where it comes from, what it has seen, what it keeps to itself. After that, nobody looks at the colour alone.",
    fuss: "THIS IS WHERE VALUE BEGINS" },
  { label: "5/5", text: "The same canvas can fetch 10 € or 1000 €. The difference is not on the canvas — it is in what we say about it and who we show it to.",
    fuss: "THE SAME CANVAS" },
];

const KARTEN_RO: Karte[] = [
  { label: "1/5", text: "O pânză goală. Nimeni n-a atins-o încă — deocamdată nu spune nimic despre nimeni.",
    fuss: "VALOARE: NIMIC" },
  /* Owner 14.09.2026, eigener Text statt meines Entwurfs. */
  { label: "2/5", text: "Născut în două zile din pasiunea și memoria artistului, acest albastru poartă în el dorința de a păstra ceva ce timpul nu poate ține — un moment, o emoție, o urmă care nu se va mai repeta niciodată.",
    fuss: "TOT O PÂNZĂ" },
  { label: "3/5", text: "Are o culoare care s-a amestecat o singură dată, în acea lumină, în acea zi. N-o mai găsești a doua oară, oricât ai încerca.",
    fuss: "TOT O PÂNZĂ" },
  { label: "4/5", text: "Noi îi scriem povestea: de unde vine, ce a văzut, ce ascunde. De-acum, nimeni nu se mai uită doar la culoare.",
    fuss: "AICI ÎNCEPE VALOAREA" },
  /* Die Pointe, mit Zahlen statt Worten (Owner 14.09.2026: „dann ohne spruch 10 euro mit spruch
     1000 euro"). */
  /**
   * Owner 14.09.2026 erweitert: nicht nur der Satz, sondern auch, WO das Werk gezeigt wird.
   *
   * OHNE KÄUFER-VERSPRECHEN (Owner, direkt danach: „Găsim cumpărătorii care îl prețuiesc. das
   * ist gefährlich"): Er hat recht — das wäre eine Verkaufszusage, die niemand halten kann, und
   * sie stünde als erstes da, wenn jemand nichts verkauft. „Cui i-o arătăm" sagt dasselbe über
   * unsere Leistung, ohne etwas zu versprechen.
   */
  /* UND DIE ZAHLEN SIND KEIN VERSPRECHEN (Owner 14.09.2026: „wir versprechen etwas, was wir
     nicht halten können" — auch auf die 10/1000 bezogen). „Kann 10 € machen oder 1000 €" ist
     eine Aussage über den Kunstmarkt. „Ohne Spruch 10 €, mit Spruch 1000 €" wäre eine Zusage
     über UNSERE Wirkung gewesen. */
  { label: "5/5", text: "Aceeași pânză poate face 10 € sau 1000 €. Diferența nu stă pe pânză — stă în ce spunem despre ea și cui i-o arătăm.",
    fuss: "ACEEAȘI PÂNZĂ" },
];

/* NOCH LÄNGER (Owner 14.09.2026: „läuft zu schnell, kann nicht lesen") — mit ganzen Sätzen
   braucht es deutlich mehr Zeit, nicht nur ein bisschen mehr. */
const INTERVALL_MS = 7000;

/* Unbekannte Sprache bekommt Englisch — nie eine leere Karte. */
const kartenFuer = (lang: string): Karte[] =>
  lang === "ro" ? KARTEN_RO : lang === "de" ? KARTEN_DE : KARTEN_EN;

const PFEIL = {
  ro: { zurueck: "Înapoi", weiter: "Înainte" },
  de: { zurueck: "Zurück", weiter: "Weiter" },
  en: { zurueck: "Back", weiter: "Next" },
} as const;

export default function PovesteaPietrei({ lang = "ro" }: { lang?: string }) {
  const KARTEN = kartenFuer(lang);
  const P = PFEIL[lang as keyof typeof PFEIL] ?? PFEIL.en;
  const [i, setI] = useState(0);
  /* Eigenes Sichtbarkeits-Flag statt reinem Opacity-Crossfade: Nur EINE Karte liegt je im DOM.
     Zwei verschieden lange Texte gleichzeitig übereinander ergaben sonst Buchstabensalat
     (gemessen am 14.09.2026, im Browser gesehen — „TOTCA PÂNZĂMIC" statt zweier klarer Sätze). */
  const [sichtbar, setSichtbar] = useState(true);
  /**
   * ── ECHTES ANHALTEN, NICHT NUR SOLANGE GEDRÜCKT (Owner 14.09.2026: „den slide kann ich nicht
   * stoppen, läuft zu schnell, kann nicht lesen") ────────────────────────────────────────────
   *
   * Vorher pausierte es nur, solange der Finger auf dem Bildschirm lag — bei einem kurzen Tipp
   * (dem normalen Antippen) war das quasi nichts. Jetzt SCHALTET ein Tipp dauerhaft um: einmal
   * antippen hält an, noch einmal lässt weiterlaufen. „PAUZĂ" zeigt, dass es klickbar ist.
   */
  const [pausiert, setPausiert] = useState(false);

  /* Eine Stelle für den Wechsel, egal ob er vom Zeitgeber oder von einem Pfeil kommt — sonst
     driften zwei Kopien der Blend-Logik irgendwann auseinander. */
  const wechsle = (schritt: 1 | -1) => {
    setSichtbar(false);
    setTimeout(() => {
      setI(n => (n + schritt + KARTEN.length) % KARTEN.length);
      setSichtbar(true);
    }, 220);
  };

  useEffect(() => {
    if (pausiert) return;
    const t = setInterval(() => wechsle(1), INTERVALL_MS);
    return () => clearInterval(t);
  }, [pausiert]);

  const k = KARTEN[i];

  return (
    <div className="mt-3 overflow-hidden">
      {/* DIE KARTE SELBST BLEIBT EIN KLICKZIEL ZUM ANHALTEN — die Pfeile stehen jetzt in der
          Punkte-Zeile darunter, NIE über dem Text (Owner 14.09.2026: „so nicht", zum Versuch,
          sie über der Karte schweben zu lassen — sie überlagerten den Spruch mitten im Satz). */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setPausiert(p => !p)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPausiert(p => !p); } }}
        aria-pressed={pausiert}
        /* HÖHE NACH DER LÄNGSTEN KARTE, GEMESSEN (14.09.2026, im Browser nachgerechnet): Karte 2
           braucht 274 px, md wegen der grösseren Schrift rund 286 px. Vorher standen hier 236 px
           — der Text wurde unten abgeschnitten, ohne dass man es der Karte ansah. */
        className="flex h-[332px] cursor-pointer flex-col overflow-hidden bg-[#f4f1ea] p-4 md:h-[344px]"
      >
        {/* ── DAS BLAU STEHT FEST, NUR DER TEXT WECHSELT (Owner 14.09.2026: „das blaue
            verschwindet und kommt bei jedem slide" — das Quadrat lag bisher IN derselben
            Opacity-Blende wie der Text und blinkte deshalb mit). Jetzt trägt NUR noch Label,
            Spruch und Fuss die Überblendung; das Quadrat rendert ausserhalb davon, unverändert. */}
        {/* ── OHNE ZAHLEN, MITTIG (Owner 14.09.2026: „die zahlen raus" · „blaues bild mittig")
            MIT SCHATTEN UND LUFT ZUM TEXT (Owner: „das auch mit mehr raum zum text") — dieselbe
            Behandlung wie das Werk in der Vorschau: es liegt auf der Fläche, statt darauf
            geklebt zu sein. */}
        {/* ── AUS DEM QUADRAT WIRD EIN BILD (Owner 15.09.2026: „sie mögen das motiv nicht" ·
            „Ich nehme A") ─────────────────────────────────────────────────────────────────────
            Ein blaues Rechteck war für einen Maler kein Werk, sondern ein Rechteck. Karte 1
            zeigt jetzt die LEERE LEINWAND, von der ihr Text spricht; ab Karte 2 hängt dort ein
            gemaltes Bild. Der Blick macht damit denselben Weg wie der Text: von nichts zu Werk.

            DIE STERNENNACHT, nicht eine seiner eigenen Arbeiten (Owner 11.09.2026: „dann nehmen
            wir doch van goch, das zieht") — gemeinfrei, und dasselbe Bild liegt schon als
            Beispiel auf der Startkarte.

            GLEICHE HÖHE WIE DAS QUADRAT (64 px): Die Karte steht auf einer gemessenen Höhe, in
            die der längste Spruch gerade passt. Ein höheres Bild schöbe den Hochladen-Knopf
            weiter nach unten — den Fehler machen wir nicht zweimal. */}
        <div className="flex justify-center pt-1">
          {/* GRÖSSER (Owner 15.09.2026: „das bild grösser") — 112 px statt 64. Die Karte wächst
              um denselben Betrag mit, sonst schneidet sie den längsten Spruch unten ab. */}
          {i === 0 ? (
            <span className="h-28 w-[146px] shrink-0 border border-[#e6e0d4] bg-[#fbf9f4] shadow-[0_8px_20px_rgba(0,0,0,.14),0_2px_5px_rgba(0,0,0,.1)]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/lakatosbandi/beispiel-sternennacht.jpg" alt=""
              className="h-28 w-[146px] shrink-0 object-cover shadow-[0_8px_20px_rgba(0,0,0,.18),0_2px_5px_rgba(0,0,0,.12)]" />
          )}
        </div>
        <div className="flex-1 transition-opacity duration-200 ease-out" style={{ opacity: sichtbar ? 1 : 0 }}>
          <p className="m-0 mt-6 font-serif text-[16px] leading-[1.35] text-[#22201b] md:text-[17.5px]">{k.text}</p>
        </div>
        <span className="mt-1.5 block text-[10.5px] font-black uppercase tracking-[0.14em] text-[#a8a196] transition-opacity duration-200 ease-out" style={{ opacity: sichtbar ? 1 : 0 }}>
          {k.fuss}
        </span>
      </div>
      {/* ── PFEILE LINKS UND RECHTS, IN DER PUNKTE-ZEILE (Owner 14.09.2026: „pfeile rechts
          links" · „so nicht" zur Version über dem Text) ─────────────────────────────────────
          Fester Platz ohne Text darunter — hier kann nichts mehr überlagert werden, egal wie
          lang der Spruch gerade ist. Ein Klick hält gleichzeitig die Automatik an. */}
      <div className="flex items-center justify-center gap-3 bg-[#f4f1ea] pb-2.5 pt-0.5">
        <button type="button" aria-label={P.zurueck}
          onClick={() => { setPausiert(true); wechsle(-1); }}
          /* GRÖSSER UND DUNKLER (Owner 14.09.2026: „pfeile zu klein sieht keiner") — 15 px in
             Hellgrau war eine Andeutung, kein Knopf. Jetzt volle Tippfläche und lesbarer Ton. */
          className="grid h-9 w-9 place-items-center text-[26px] leading-none text-[#5b5348] transition hover:text-[#22201b]"
        >‹</button>
        <div className="flex items-center gap-1.5">
          {KARTEN.map((k, idx) => (
            <span key={k.label} className={`h-2 w-2 transition-colors ${idx === i ? "bg-[#22201b]" : "bg-[#cec8ba]"}`} />
          ))}
        </div>
        <button type="button" aria-label={P.weiter}
          onClick={() => { setPausiert(true); wechsle(1); }}
          /* GRÖSSER UND DUNKLER (Owner 14.09.2026: „pfeile zu klein sieht keiner") — 15 px in
             Hellgrau war eine Andeutung, kein Knopf. Jetzt volle Tippfläche und lesbarer Ton. */
          className="grid h-9 w-9 place-items-center text-[26px] leading-none text-[#5b5348] transition hover:text-[#22201b]"
        >›</button>
      </div>
    </div>
  );
}
