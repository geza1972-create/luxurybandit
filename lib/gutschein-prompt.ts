/**
 * DER AUFTRAG FÜR DIE GUTSCHEIN-KARTE — er hält den Umschlag und sagt den Satz.
 *
 * Owner 05.08.2026: „es muss einfach die Generierung kommen in der Karte."
 *
 * ER IST NICHT ERFUNDEN, SONDERN ABGESCHRIEBEN — und zwar von dem Lauf, den der Owner selbst
 * in der Pixverse-Oberfläche gemacht hat und der funktioniert hat („das hat mit Stimme sehr gut
 * geklappt"). Das fertige Video liegt in `public/Gutscheine`; dieselben Worte erzeugen dasselbe
 * Bild mit SEINEM Gesicht.
 *
 * DER SATZ STEHT IN ANFÜHRUNGSZEICHEN, und das ist kein Zufall (Memory
 * `pixverse-woerter-statt-handlung`): Pixverse kann den WORTLAUT umsetzen, aber nicht das Verb
 * „spricht". Wer „she speaks" schreibt, bekommt eine Frau, die den Mund bewegt; wer den Satz
 * in Anführungszeichen gibt, bekommt die Lippen zu diesem Satz.
 *
 * KEIN „ELEGANT" ALS KLEIDUNGSANWEISUNG. Am 05.08.2026 wurde genau das getestet: Das Wort
 * bestimmte Licht und Raum, aber nicht das Kleidungsstück — das kommt aus der Vorlage. Deshalb
 * steht hier, was die Kamera tun soll, und nicht, was sie tragen soll.
 */

/** Der eine Satz, den jeder Avatar sagt (Owner 05.08.2026: „genau das werden auch alle sagen"). */
export const GUTSCHEIN_SATZ = "I have something for you!";

export function gutscheinPrompt(): string {
  return [
    "She holds a cream envelope up towards the camera with both hands and smiles warmly at the viewer,",
    "soft cinematic light, gentle natural motion, keep the face and the outfit unchanged;",
    `she says "${GUTSCHEIN_SATZ}"`,
  ].join(" ");
}
