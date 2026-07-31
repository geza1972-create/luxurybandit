"use client";

/**
 * DER TON-KNOPF DER EINLADUNGSKARTE.
 *
 * Owner 31.07.2026: „jetzt mach bitte einen schoenen Sound-Button. Das passt nicht auf
 * diesem feinen Design."
 *
 * Vorher sass dort ein grauer Kreis mit einem Emoji-Lautsprecher. Ein Emoji ist auf jedem
 * Geraet ein anderes Bild — bunt, plastisch, mit Rotton — und steht damit quer zu einer
 * Karte, die aus zwei Farben und duennen Linien besteht. Hier ist es jetzt dieselbe
 * Handschrift wie die Ornamente: 1,3 px Strich, runde Enden, Gold auf Elfenbein.
 *
 * Das Wort steht nur daneben, solange der Ton AUS ist: Jeder Browser startet stumm, und ein
 * blosses Symbol wird uebersehen (Owner vorher: „die musik fehlt noch"). Ist der Ton an, hat
 * das Wort seine Arbeit getan und verschwindet — die Karte soll nicht wie ein Bedienfeld
 * aussehen.
 *
 * Die dunkle Grundform bleibt fuer die Faelle AUSSERHALB der Karte (andere Themen, Beispiele
 * auf dunklem Grund); in der Karte faerbt `.lb-karte [data-tonknopf]` sie auf Elfenbein um.
 */
export default function TonKnopf({
  an, label = "", onClick, className = "",
}: {
  an: boolean;
  /** „Ton an" in der Sprache des Gastes — nur sichtbar, solange der Ton aus ist. */
  label?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={an ? "Ton aus" : (label || "Ton an")}
      data-tonknopf="1"
      /* `lb-onmedia` ist die Klasse, die die Hell-Fassung ausdruecklich ausnimmt und auf Weiss
         zwingt (Owner 31.07.2026: „ich kann es nicht lesen, es ist schwarze Schrift"). Ohne sie
         erbt der Knopf ausserhalb der Einladungskarte die dunkle Schrift der hellen Fassung —
         dunkel auf einer dunklen Scheibe ueber einem Foto. In der Karte gewinnen die
         `.lb-karte`-Regeln, weil sie im Stylesheet spaeter stehen: dort bleibt er golden. */
      className={`lb-onmedia absolute right-3 top-3 flex h-10 items-center gap-1.5 rounded-full bg-black/50 backdrop-blur transition active:scale-95 ${
        an || !label ? "w-10 justify-center" : "pl-3 pr-3.5"
      } ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-[18px] w-[18px] shrink-0">
        <path d="M4.5 9.4v5.2h3L11.8 18V6L7.5 9.4h-3z" />
        {an ? (
          <>
            <path d="M14.9 9.3a3.8 3.8 0 0 1 0 5.4" />
            <path d="M17.3 7a7.1 7.1 0 0 1 0 10" />
          </>
        ) : (
          <path d="M15.4 10.4l4.2 3.2M19.6 10.4l-4.2 3.2" />
        )}
      </svg>
      {!an && label && (
        <span className="font-serif text-[12px] font-semibold tracking-[0.06em] whitespace-nowrap">
          {label}
        </span>
      )}
    </button>
  );
}
