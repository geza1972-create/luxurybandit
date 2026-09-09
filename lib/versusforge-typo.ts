/**
 * DIE SCHRIFTSKALA VON VERSUSFORGE — VIER GRÖSSEN, ZWEI GEWICHTE (Owner 08.09.2026: „du hast
 * zu viele Schriftarten und Grössen").
 *
 * Gezählt in einem einzigen Abschnitt vorher: acht Grössen, drei Gewichte, zwei Schriftarten.
 * Das entsteht nicht aus Absicht, sondern aus Reihenfolge — jeder neue Baustein bekommt eine
 * Grösse, die „hier gerade passt", und nach zehn Bausteinen ist es ein Flickenteppich.
 *
 * DESHALB STEHT DIE SKALA HIER UND NICHT IN DEN BAUSTEINEN. Wer eine fünfte Grösse braucht,
 * muss sie hier eintragen — und merkt dabei, dass er es meistens nicht braucht.
 *
 *   TITEL   Überschrift eines Abschnitts, und dieselbe Grösse für grosse Zahlen
 *   TEXT    alles, was gelesen wird
 *   KLEIN   Nebensätze, Herkunftsangaben, Zeiträume
 *   LABEL   die einzige Versalienform im ganzen Produkt
 *
 * ZWEI GEWICHTE: `font-black` trägt Überschriften, Zahlen und Labels; `font-semibold` alles
 * andere. Dazwischen gibt es nichts — ein drittes Gewicht sieht aus wie ein Fehler.
 *
 * KEINE SERIFEN, NIRGENDS (Owner 08.09.2026): Die Serifenschrift der CI gehört zur
 * Einladungskarte, nicht zu einer Firmenstrecke.
 */

/**
 * DER HERO IST DIE EINE AUSNAHME — und er ist es genau zweimal je Seite: die Überschrift und
 * ihr Nachsatz. Beide sind Teil DESSELBEN Satzes, deshalb gehören sie zur Skala und nicht
 * daneben.
 */
export const T_HERO = "text-[38px] font-black leading-[1.03] md:text-[52px] lg:text-[68px]";
export const T_HERO_2 = "text-[26px] font-black leading-[1.15] md:text-[34px] lg:text-[40px]";
export const T_SUB = "text-[19px] font-semibold leading-relaxed md:text-[23px]";

export const T_TITEL = "text-[22px] font-black leading-tight md:text-[28px]";
export const T_TEXT = "text-[16px] font-semibold leading-snug md:text-[18px]";
export const T_KLEIN = "text-[14px] font-semibold leading-snug md:text-[15px]";
export const T_LABEL = "text-[12px] font-black uppercase tracking-[0.16em]";

/** Die eine Ausnahme: die Summe, die hängenbleiben soll. Genau EINE Stelle je Seite. */
export const T_ZAHL_GROSS = "text-[30px] font-black leading-none md:text-[38px]";
