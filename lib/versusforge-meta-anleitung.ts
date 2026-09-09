/**
 * DIE BEDIENUNGSANLEITUNG FÜR META (Owner 09.09.2026: „wo er den Link hat, dort können wir die
 * Bedienungsanleitung noch schicken für Meta. Dann bekommt er das per E-Mail geschickt. Aber
 * nicht als PDF, wegen Tokens.").
 *
 * FESTER TEXT, KEIN MODELL. Das ist der ganze Punkt: Die Schritte im Werbeanzeigenmanager
 * sind für jeden Kunden dieselben — was sich unterscheidet, sind seine Texte, und die stehen
 * schon auf seiner Seite. Eine erzeugte Anleitung würde bei jedem Lauf Geld kosten und wäre
 * dabei ungenauer als eine, die einmal richtig geschrieben wurde.
 *
 * IN DER MAIL UND AUF DER SEITE, NIE ALS ANHANG (Owner 09.09.2026: „hier tragen wir ein,
 * drunter Bedienungsanleitung"). Er soll sie neben dem offenen Werbeanzeigenmanager lesen
 * können, nicht erst eine Datei öffnen.
 *
 * DESHALB STEHT SIE HIER UND NICHT IN DER MAIL-DATEI: Zwei Fassungen derselben Anleitung
 * laufen nach der zweiten Änderung auseinander — und dann widerspricht die Seite der Mail,
 * die derselbe Mensch daneben liegen hat.
 *
 * ZWEI EHRLICHE STELLEN, die in keiner Anleitung sonst stehen:
 *  · Ohne Facebook-Seite läuft gar nichts. Das ist die Wand, an der die meisten zuerst
 *    stehen, und sie kommt deshalb als Schritt 1.
 *  · Ziel „Traffic", nicht „Leads": Die Anfrage sammelt SEIN Trichter. Wer hier „Leads"
 *    wählt, bekommt Metas eigenes Formular und unser Trichter bleibt leer.
 */
export const META_SCHRITTE: [string, string][] = [
  /* „Facebook-Seite" kam aus dem Übersetzer unverändert zurück (09.09.2026, rumänischer
     Prüflauf): Ein zusammengesetztes Wort mit Markenname sieht für ihn aus wie ein Eigenname.
     Getrennt geschrieben wird es übersetzt. */
  ["Eine Seite bei Facebook", "Ohne eine Seite kannst du keine Anzeige schalten. Hast du keine, leg sie zuerst an — das dauert zehn Minuten und ist kostenlos."],
  ["Werbeanzeigenmanager öffnen", "adsmanager.facebook.com, mit dem Konto, zu dem deine Seite gehört."],
  ["Kampagne erstellen", "Als Ziel <b>Traffic</b> wählen, nicht „Leads“. Die Anfragen sammelt dein eigener Trichter — mit „Leads“ bekommst du stattdessen Metas Formular und dein Trichter bleibt leer."],
  ["Budget setzen", "Ein Tagesbudget eintragen. Fang klein an und lass es ein paar Tage laufen, bevor du etwas änderst."],
  ["Zielgruppe einstellen", "Ort und Umkreis, Alter, Interessen — die Punkte dafür stehen auf deiner Anzeigen-Seite unter „Wen die Anzeige erreichen soll“."],
  ["Platzierungen automatisch lassen", "Meta verteilt selbst auf Facebook und Instagram. Von Hand auszuwählen lohnt sich erst, wenn du Zahlen hast."],
  ["Bild hochladen", "Das Bild von deiner Anzeigen-Seite, im Hochformat."],
  ["Texte einsetzen", "Primärtext, Überschrift und Beschreibung von deiner Anzeigen-Seite kopieren — die Felder heissen dort genauso."],
  ["Website-URL eintragen", "Deine Funnel-Adresse. Nicht deine eigene Website — sonst landet der Klick auf deiner Startseite und niemand hinterlässt etwas."],
  ["Veröffentlichen", "Meta prüft die Anzeige, das dauert meist ein paar Stunden."],
];

/**
 * DIE SCHRITTE IN SEINER SPRACHE (09.09.2026).
 *
 * FLACH GEKLOPFT UND WIEDER ZUSAMMENGESETZT — `textbausteineInSprache` kann nur
 * `Record<string,string>`, und eine Liste von Paaren verliert das Modell sonst still
 * ([[uebersetzer-fallen]]). Nummeriert statt benannt: So kann keine Zeile verrutschen.
 *
 * DAS `<b>` IN SCHRITT 3 BLEIBT DRIN. Es ist EIN Wort in Fettschrift („Traffic"), und
 * genau dieses Wort steht so auch in Metas Oberfläche — es darf nicht übersetzt werden.
 * Ein Übersetzer, der die Auszeichnung zerlegt, wäre schlimmer als eine unübersetzte Zeile;
 * geprüft wird das nicht, deshalb steht es hier als Warnung.
 */
export async function metaSchritteInSprache(lang: string): Promise<[string, string][]> {
  const { textbausteineInSprache } = await import("@/lib/lebenslauf-uebersetzen");
  const { isLang } = await import("@/lib/lang");
  const kurz = String(lang ?? "de").slice(0, 2).toLowerCase();
  if (!isLang(kurz) || kurz === "de") return META_SCHRITTE;

  const flach: Record<string, string> = {};
  META_SCHRITTE.forEach(([t, x], i) => { flach[`t${i}`] = t; flach[`x${i}`] = x; });
  const raus = await textbausteineInSprache(flach, kurz);
  return META_SCHRITTE.map((_, i) => [raus[`t${i}`] ?? META_SCHRITTE[i][0], raus[`x${i}`] ?? META_SCHRITTE[i][1]]);
}
