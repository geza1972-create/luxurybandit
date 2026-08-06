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
 * NUR DAS ZEICHEN, kein Wort (Owner 31.07.2026: „nur Icon bitte"). Vorher stand „Ton an"
 * daneben, damit man den Knopf nicht uebersieht — in Sprachen mit langem Wort („Pornește
 * sunetul") wurde daraus ein Balken, der ueber das halbe Gesicht lief. Der durchgestrichene
 * Lautsprecher sagt dasselbe in einem Viertel des Platzes; das Wort bleibt als Vorlesetext
 * fuer Bildschirmleser erhalten.
 *
 * ÜBERALL WEISS, AUCH AUF DUNKLEN SEITEN (Owner 04.08.2026, auf die Frage hell-oder-dunkel:
 * „a" — überall die weisse Scheibe).
 *
 * Vorher war die Grundform dunkel und durchscheinend, und nur INNERHALB der Einladungskarte
 * faerbte `.lb-karte [data-tonknopf]` sie auf Elfenbein um. Dieselbe Karte sah damit im Feed
 * anders aus als auf der Einladungsseite — drei Knoepfe, die man an jeder Stelle neu suchen
 * musste. Jetzt gilt eine Form: weisse Scheibe, goldenes Zeichen, wie beim Teilen-Knopf des
 * Tanzes. Siehe Skill `card`.
 */
export default function TonKnopf({
  an, label = "", labelAus = "", onClick, className = "", platz = "absolute right-3 top-3",
}: {
  an: boolean;
  /**
   * WO ER SITZT. Vorgabe ist oben rechts — so steht er ausserhalb der Einladungskarte
   * (Beispielvideos, Kuss-Trichter) seit jeher.
   *
   * AUF DER KARTE ist er der DRITTE der drei Symbole (Owner 04.08.2026: „mach alle rechts
   * und vergrössern ganz oben" · „und Sound als dritte") und rutscht deshalb nach unten.
   * Als eigenes Prop und nicht über `className`: Zwei `top-*`-Klassen am selben Element
   * gewinnt nicht die spätere im String, sondern die spätere im Stylesheet — das ist nicht
   * vorhersagbar. Siehe Skill `card`.
   */
  platz?: string;
  /** „Ton an" in der Sprache des Gastes — nur sichtbar, solange der Ton aus ist. */
  label?: string;
  /** „Ton aus" in derselben Sprache. Stand hier fest auf Deutsch: Ein Bildschirmleser las
   *  einer Rumaenin „Ton aus" vor — auf der einen Seite, die Mehrsprachigkeit verspricht. */
  labelAus?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={an ? (labelAus || "Sound off") : (label || "Sound on")}
      data-tonknopf="1"
      /* WEISS UND GOLD, ÜBERALL. Die Farben stehen als `style`, nicht als Klasse: Auf der
         hellen Fassung (`lb-theme`) und in der Karte (`.lb-karte`) greifen Umfaerbe-Regeln,
         die jede Tailwind-Klasse ueberschreiben wuerden. In der Karte gewinnt danach
         `.lb-karte [data-tonknopf]` mit `!important` — und setzt genau dasselbe Gold. Beide
         Wege enden also bei derselben Optik, siehe Skill `card`. */
      /* 30 % durchscheinend (Owner 04.08.2026: „jetzt 30% transparent alle Icons") — die
         Knöpfe sollen auf dem Bild liegen, nicht darauf kleben. Als `opacity` am ganzen
         Knopf, damit Scheibe und Zeichen gemeinsam zurücktreten; halbtransparent nur im
         Hintergrund liesse das Zeichen davor stehen wie ausgeschnitten. */
      style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)", opacity: 0.7 }}
      className={`${platz} grid h-10 w-10 place-items-center rounded-full transition active:scale-95 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5 shrink-0">
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
    </button>
  );
}
