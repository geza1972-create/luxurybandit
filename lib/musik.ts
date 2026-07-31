/**
 * DIE HINTERGRUNDMUSIK — an einer Stelle, je Thema.
 *
 * Owner 31.07.2026: „die Musik muss weiter laufen, auch wenn das Video in Schleife läuft" und
 * später, für die geteilten Bilder: „und mache auch Musik wie bei Hochzeit".
 *
 * WARUM SIE NICHT IM VIDEO LIEGT: Unsere Videos sind acht Sekunden lang. Liegt der Ton darin,
 * springt er bei jeder Schleife zurück auf den ersten Takt — alle acht Sekunden derselbe
 * Anfang. Das klingt nicht nach Stimmung, das klingt nach einem Fehler. Deshalb bleibt jedes
 * Video stumm und eine eigene Tonspur läuft daneben durch: zweieinhalb Minuten, während das
 * Bild darunter neunzehn Mal von vorn beginnt.
 *
 * Bei einem BILD ist es dasselbe Werkzeug aus einem anderen Grund: Ein Standbild hat gar
 * keinen Ton, und ohne Musik ist eine geteilte Seite eine Postkarte statt eines Moments.
 *
 * Alle Stücke liegen in `public/` und sind lizenzfrei. Zum Tauschen reicht eine Zeile hier.
 */

/** Die Stücke, mit Länge — je länger, desto seltener hört man die Schleife. */
export const STUECKE = {
  ruhe: "/mickeyscat-moment-of-peace-mickeyscat-554494.mp3",          // 152 s · ruhig, getragen
  weite: "/grand_project-wonders-of-the-earth-550792.mp3",            // 149 s · groß, filmisch
  fruehling: "/ikoliks_aj-acoustic-spring-mothers-day-music-320427.mp3", // 143 s · warm, akustisch
  sommer: "/fassounds-escape-your-love-upbeat-fashion-pop-dance-412230.mp3", // 138 s · Pop, treibend
  hochzeitsmarsch: "/Bridal-chorus.mp3",                             // 136 s · der Klassiker
  offen: "/sigmamusicart-no-copyright-music-537751.mp3",              // 123 s
  wasser: "/kontraa-water-afro-pop-music-445661.mp3",                 //  69 s · kurz, tanzbar
} as const;

/**
 * WELCHES STÜCK ZU WELCHEM THEMA.
 *
 * Bewusst nicht überall dasselbe: Der Hochzeitsmarsch unter einem Strandbild wäre komisch,
 * und Sommer-Pop unter einer Trauung wäre respektlos. Der Owner hat den Marsch für die
 * Hochzeit ausdrücklich abgewählt („nimm was anderes als Lied") — geblieben ist das ruhige
 * Stück, das trägt statt anzukündigen.
 */
const NACH_THEMA: Record<string, string> = {
  wedding: STUECKE.ruhe,
  kiss: STUECKE.fruehling,
  holiday: STUECKE.sommer,
  bella: STUECKE.sommer,
  idol: STUECKE.weite,
  birthday: STUECKE.sommer,
  surprise: STUECKE.fruehling,
};

/** Das Stück für ein Thema; unbekannte Themen bekommen das ruhige. */
export function musikFuer(theme?: string): string {
  return NACH_THEMA[String(theme ?? "").toLowerCase()] ?? STUECKE.ruhe;
}
