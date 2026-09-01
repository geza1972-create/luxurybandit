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

import { useEffect, useState } from "react";

/** Die Stücke, mit Länge — je länger, desto seltener hört man die Schleife. */
export const STUECKE = {
  ruhe: "/mickeyscat-moment-of-peace-mickeyscat-554494.mp3",          // 152 s · ruhig, getragen
  weite: "/grand_project-wonders-of-the-earth-550792.mp3",            // 149 s · groß, filmisch
  fruehling: "/ikoliks_aj-acoustic-spring-mothers-day-music-320427.mp3", // 143 s · warm, akustisch
  sommer: "/fassounds-escape-your-love-upbeat-fashion-pop-dance-412230.mp3", // 138 s · Pop, treibend
  hochzeitsmarsch: "/Bridal-chorus.mp3",                             // 136 s · der Klassiker
  offen: "/sigmamusicart-no-copyright-music-537751.mp3",              // 123 s
  wasser: "/kontraa-water-afro-pop-music-445661.mp3",                 //  69 s · kurz, tanzbar
  /**
   * DER TANZ HAT SEINE EIGENE SPUR (Owner 03.08.2026: „du nimmst für diese Videos den
   * Soundtrack, den ich dir in dem gleichen Ordner Pooldance reingelegt habe").
   *
   * Sie liegt bei ihrem Video statt bei den anderen Stuecken in `public/` — das ist Absicht:
   * Video, Standbild, Outfit und Musik dieses Produkts wohnen zusammen in einem Ordner, und
   * wer das Thema anfasst, findet alles an einer Stelle. 147 s, 128 kbit/s.
   */
  tanz: "/Pooldance/poledance.mp3",                                   // 147 s · vom Owner geliefert
} as const;

/**
 * WELCHE STÜCKE ZU WELCHEM THEMA — eine LISTE, nicht ein Stück.
 *
 * Owner 18.08.2026: „wieso läuft immer die gleiche musik bei videos? Bitte rotieren."
 *
 * Hier stand je Thema GENAU EIN Stück. Damit lag unter jedem Kussvideo derselbe
 * Akustikgitarren-Anfang und unter jeder Hochzeit dasselbe ruhige Stück — wer sich drei
 * Beispiele ansieht, hört dreimal dasselbe und hält es für einen Fehler.
 *
 * Bewusst nicht überall alles: Der Hochzeitsmarsch unter einem Strandbild wäre komisch, und
 * Sommer-Pop unter einer Trauung wäre respektlos. Jede Liste ist deshalb nach STIMMUNG
 * gebaut, nicht nach Vorrat — es rotiert nur, was zum Thema passt.
 *
 * DAS ERSTE STÜCK JEDER LISTE ist das, was vorher dort stand. Ein Aufruf ohne Schlüssel
 * bekommt weiter genau dieses — nichts wird durch die Rotation stillschweigend anders.
 */
const NACH_THEMA: Record<string, readonly string[]> = {
  /* Der Marsch fehlt hier ABSICHTLICH: Der Owner hat ihn für die Hochzeit ausdrücklich
     abgewählt („nimm was anderes als Lied"). Getragen, gross, warm — nichts, was ankündigt. */
  wedding: [STUECKE.ruhe, STUECKE.weite, STUECKE.fruehling],
  /* Intim und warm. Kein Pop: Ein treibender Beat unter einem Kuss macht daraus einen
     Werbespot. */
  kiss: [STUECKE.fruehling, STUECKE.ruhe, STUECKE.offen],
  holiday: [STUECKE.sommer, STUECKE.wasser, STUECKE.offen],
  bella: [STUECKE.sommer, STUECKE.wasser, STUECKE.offen],
  idol: [STUECKE.weite, STUECKE.offen, STUECKE.sommer],
  /* Anprobe/Fashion — treibend, ein Laufsteg-Takt statt Stille unter den Vorlagen-Clips
     (Owner 01.09.2026: „tryons auch unsere sounds"). */
  tryon: [STUECKE.sommer, STUECKE.offen, STUECKE.weite],
  /* Lingerie bekommt dieselbe Stimmung wie der Kuss — intim, kein Pop-Beat, das waere unter
     diesen Motiven ein Werbespot statt eine Karte. */
  lingerie: [STUECKE.fruehling, STUECKE.ruhe, STUECKE.offen],
  /**
   * DER GEBURTSTAG HAT KEINE MUSIK (Owner 08.08.2026: „wenn ich das video öffne, startet
   * die musik statt die original stimme" — und schon am 03.08.: „es muss die originale
   * Stimme des Videos sein"). Die STIMME ist das Produkt; ein Sommer-Pop darüber begräbt
   * genau das, wofür bezahlt wurde. Leer heisst: Originalton, keine Schleife — die
   * Verbraucher (Galerie, WerkAnsicht) schalten bei "" auf `originalton` um.
   *
   * ROTIERT NICHT, und darf es nicht: Jedes Stück in dieser Liste wäre eines zu viel.
   */
  birthday: [""],
  /**
   * DER TANZ ROTIERT AUCH NICHT. Er bekommt die Spur, die der Owner selbst dazugelegt hat
   * („du nimmst für diese Videos den Soundtrack, den ich dir in dem gleichen Ordner
   * Pooldance reingelegt habe") — eine zweite Wahl daneben zu stellen hiesse, diese
   * Ansage zu überstimmen. Beide Kennungen zeigen auf dasselbe Stueck: „surprise" ist der
   * Ordnername der Seite, „poledance" der des Geschenks.
   */
  surprise: [STUECKE.tanz],
  poledance: [STUECKE.tanz],
  /**
   * DIE BEWERBUNG HAT KEINE MUSIK (24.08.2026, dieselbe Begründung wie beim Geburtstag):
   * Der Bewerber SPRICHT — seine Stimme ist das Produkt, und das Video geht an
   * Personalabteilungen. Leer heisst: Originalton, keine Schleife.
   */
  lebenslauf: [""],
};

/**
 * EIN STABILER FINGERABDRUCK DES SCHLÜSSELS (FNV-1a).
 *
 * WARUM NICHT `Math.random()`: Zwei Gründe, und beide sind hart. Erstens rendert ein Teil
 * dieser Seiten auf dem Server vor — eine Zufallszahl käme dort anders heraus als im Browser,
 * und React verwirft den Aufbau mit einem Hydration-Fehler. Zweitens wäre die Musik eines
 * Videos bei jedem Neuladen eine andere: Wer sein eigenes Geschenk zweimal öffnet, hört
 * zweimal etwas anderes und hält DAS für den Fehler.
 *
 * Aus demselben Schlüssel kommt also immer dasselbe Stück — verschiedene Videos bekommen
 * verschiedene. Genau das ist „rotieren": nicht zufällig, sondern verteilt.
 */
function fingerabdruck(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Das Stück für ein Thema; unbekannte Themen bekommen das ruhige.
 *
 * `schluessel` ist irgendetwas, das dieses eine Werk eindeutig benennt und sich nicht mehr
 * ändert — die Kennung des Werks oder die Adresse seines Videos. Ohne Schlüssel gibt es das
 * erste Stück der Liste, damit alte Aufrufstellen unverändert klingen.
 */
export function musikFuer(theme?: string, schluessel?: string): string {
  const liste = NACH_THEMA[String(theme ?? "").toLowerCase()] ?? [STUECKE.ruhe];
  if (!schluessel || liste.length < 2) return liste[0];
  return liste[fingerabdruck(schluessel) % liste.length];
}

/**
 * JEDES ANSEHEN EIN ANDERES STÜCK (Owner 18.08.2026, auf die Rückfrage, ob die Musik je
 * Video festliegen soll: „das kann wechseln").
 *
 * WARUM DAS EIN HAKEN BRAUCHT UND KEIN `Math.random()` IM RENDER: Diese Seiten sind
 * Client-Komponenten, aber Next rendert sie auf dem SERVER vor. Eine Zufallszahl mitten im
 * Rendern käme dort anders heraus als danach im Browser — React sieht zwei verschiedene
 * Aufbauten und verwirft den ganzen Baum mit einem Hydration-Fehler.
 *
 * Deshalb zwei Stufen: Das erste Bild nimmt die BERECHENBARE Wahl (`musikFuer`), die auf
 * Server und Browser gleich ausfällt — und unmittelbar nach dem Einhängen wird gewürfelt.
 * Hörbar ist nur die zweite Wahl: Der Ton fängt ohnehin erst an, wenn der Spieler steht.
 *
 * Themen mit nur EINEM Stück (Geburtstag: Originalton · Tanz: die Spur des Owners) bleiben
 * unberührt — bei einer Liste der Länge eins gibt es nichts zu würfeln.
 */
export function useMusikFuer(theme?: string, schluessel?: string): string {
  const [wahl, setWahl] = useState(() => musikFuer(theme, schluessel));
  useEffect(() => {
    const liste = NACH_THEMA[String(theme ?? "").toLowerCase()] ?? [STUECKE.ruhe];
    if (liste.length > 1) setWahl(liste[Math.floor(Math.random() * liste.length)]);
    /* `schluessel` GEHOERT IN DIE LISTE: Sonst wuerfelt die Galerie nur beim ersten Werk.
       Wer danach ein zweites Kussvideo oeffnet, behielte dasselbe Stueck — das Thema hat sich
       ja nicht geaendert, und genau das war die Beschwerde. */
  }, [theme, schluessel]);
  return wahl;
}
