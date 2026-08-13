import type { ReactNode } from "react";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { KartenTitel } from "@/components/CI";

/**
 * DIE EINLADUNGSKARTE — eine Datei für zwei Orte.
 *
 * Owner 31.07.2026: „wo das Video ist, hier musst du die Einladung zeigen gleich wie sie
 * aussieht, und wenn's geht mit Jugendstil-Ornamenten. Wir hatten das schon mal bei einem
 * Formular benutzt."
 *
 * „GLEICH WIE SIE AUSSIEHT" ist der ganze Grund für diese Datei. Eine nachgebaute Vorschau
 * sieht am ersten Tag gleich aus und am dreissigsten nicht mehr — und dann verschickt sie
 * etwas anderes, als sie gesehen hat. Deshalb rendert DIESELBE Komponente die Vorschau im
 * Trichter und die Seite, die der Gast öffnet. Was hier geändert wird, ändert sich an beiden
 * Stellen oder an keiner.
 *
 * Die Ornamente sind die aus `BoxOrnaments` — dieselbe Handschrift wie im Anmeldeformular.
 * Bei einer Hochzeitseinladung sind sie nicht Zierrat: Sie sind der Unterschied zwischen
 * „KI-Werkzeug" und „Einladung", und davon hängt ab, ob sie den Link überhaupt verschickt.
 *
 * Farben stehen fest (siehe `.lb-karte` in globals.css): Eine gedruckte Karte bleibt elfenbein,
 * ob die Seite ringsum hell oder dunkel steht. Das schützt sie auch vor den Umfärbe-Regeln der
 * hellen Fassung, die hier Blau hineinmalen würden.
 */

export const KARTE_TEXTE: Record<string, {
  save: string;
  /** Kartentitel der URLAUBS-Einladung — `save` bleibt der Hochzeitstitel (Owner 04.08.2026). */
  urlaubTitel: string;
  /** Kartentitel des Gutscheins — er nennt das GESCHENK, nicht den Anlass. */
  gutscheinTitel: string;
  /**
   * Der Knopf, hinter dem der Gutschein des Empfängers wartet (Konzept §3b: „der Code gehört
   * hinter den Link — nie ins Video, nie in die Vorschau, nie in den Nachrichtentext").
   */
  gutscheinOeffnen: string;
  /**
   * DIE TOPIC-GUTSCHEINE (Owner 06.08.2026: „jeder Topic als Gutschein einfügen"). Dieselben
   * fünf Namen auf den Kauf-Chips im Bau-Schritt UND auf der Karte des Empfängers — eine
   * Tabelle, damit Chip und Karte nie zwei verschiedene Dinge versprechen. Der Chat fehlt,
   * bis er aus dem Guthaben zahlbar ist (Begründung in app/api/gutschein-checkout).
   */
  gutscheinTopics: Record<"kiss" | "birthday" | "surprise" | "holiday" | "wedding", string>;
  /** Zeile auf der Empfänger-Karte: was drinliegt und auf welcher (maskierten) Adresse. */
  gutscheinGuthaben: (was: string, mail: string) => string;
  /** Der Einlöse-Knopf darunter — führt auf die Themenseite des Geschenks. */
  gutscheinAussuchen: string;
  /**
   * Bestätigung nach dem Anlegen (Owner 06.08.2026: „es kommt eine bestätigung dass der
   * Gutschein versendet wurde") — mit Empfänger-Mail (maskiert) oder ohne.
   */
  verschicktMit: string;
  verschicktOhne: string;
  /**
   * Die Vorgabe-Botschaft des Gutscheins — KONKRET, nicht neutral (Owner 05.08.2026: „es war
   * doch gut als Beispiel. Das Theater am …").
   *
   * Hier stand kurz ein allgemeiner Satz („Ich habe ein Geschenk für dich"). Er ist
   * unverfänglich und nutzlos: Er zeigt nicht, WAS man hineinschreibt. Das Beispiel aus dem
   * Konzept (§3b) tut genau das — ein echter Gutschein, ein echter Anlass, ein Datum.
   *
   * OHNE NAMEN, und das ist der einzige Unterschied zur Skizze im Konzept: Dort steht „Hallo
   * Peter". Ein fremder Vorname ist das Einzige an diesem Satz, das RICHTIG FALSCH wäre,
   * wenn jemand ihn ungeändert verschickt.
   */
  fBotschaftGutschein: string;
  wann: string; wo: string; herkunft: string; eigenes: string; ton: string; wa: string;
  zusTitel: string; zusJa: string; zusNein: string; zusName: string; zusSenden: string;
  zusDanke: string; zusLeer: string;
  /** Zählt PERSONEN, nicht Zusagen — „Maria & Radu" sind 2 Gäste (Ä10). */
  zusGaeste: (gaeste: number, nein: number) => string;
  zusMail: string; zusMailWarum: string; zusDatenschutz: string;
  zusMenuFrage: string; zusMenuNormal: string; zusMenuVeg: string; zusMenuVegan: string;
  /** Gästezahl-Chips 1–6 nach der Menüwahl (Ä10c). */
  zusWieViele: string;
  chatTitel: string; chatLeer: string; chatFeld: string; chatSenden: string;
  /** aria-label des Löschknopfs an jeder Chat-Nachricht — nur fürs Brautpaar sichtbar (Ä12). */
  chatLoeschen: string;
  abgelaufen: string; abgelaufenGast: string; probeTage: (n: number) => string;
  /** Verlaengerung nach dem ersten Monat (Owner 01.08.2026). */
  wiederTitel: string; wiederText: string; wiederKnopf: string;
  /**
   * Preiszeile unter der Bau-Karte — {once}/{monat}/{days} füllt fillPrices.
   *
   * {monat} UND NICHT MEHR {price} (05.08.2026): Der Monatspreis dieser Seite ist die
   * Hochzeits-Verlängerung zu 14,99 €, seit `einladung-abo-checkout` auf `chatAboPriceId()`
   * zeigt. {price} sind die 24,50 € des abgeschafften Themen-Abos — der Knopf hätte den einen
   * Preis genannt und die Kasse den anderen genommen. Gilt für alle fünf Abo-Texte hier:
   * `wiederText`, `wiederKnopf`, `preise`, `aboText`, `aboKnopf`.
   */
  preise: string;
  /**
   * PREISZEILE DER URLAUBS-EINLADUNG (Owner 04.08.2026). `preise` nennt Menü und
   * Gruppenchat — beides gibt es beim Urlaub nicht. Ein Versprechen, das der Besucher
   * nicht einlösen kann, kostet mehr Vertrauen, als der Satz an Wert bringt.
   */
  preiseUrlaub: string;
  /** Beim Urlaub antwortet EINE Person — kein Gästezähler, sondern ja, nein oder noch nichts. */
  zusTitelUrlaub: string;
  zusGaesteUrlaub: (ja: number, nein: number) => string;
  /**
   * DIE ZWEI BESCHRIFTUNGEN, DIE BEIM URLAUB SONST AUS DER HOCHZEIT STEHEN BLEIBEN:
   * `fotos` heißt „Eure Fotos" (ein Paar baut gemeinsam), `fotoEr` heißt „Er, der
   * Bräutigam". Beim Urlaub baut EINER die Karte für EINEN Menschen, und wer das ist,
   * wissen wir nicht — Partnerin, Freund, Schwester. Deshalb neutral.
   */
  fotosUrlaub: string;
  fotoEingeladen: string;
  /**
   * DIE BOTSCHAFT UNTER DEM BILD (Owner 04.08.2026). `fBotschaft` ist der Vorgabesatz, der
   * beim Bauen schon dasteht — er soll ohne eine einzige Änderung verschickbar sein.
   * `bestaetigen` ist die Schlusszeile, die dem Empfänger sagt, was er tun soll.
   */
  fBotschaft: string;
  bestaetigen: string;
  /** Überschrift des Botschafts-Dialogs, und die zwei Datumsfelder des Urlaubs. */
  fBotschaftTitel: string; fVon: string; fBis: string;
  /**
   * DER EINE EINLADUNGSSATZ DES URLAUBS (Owner 12.08.2026, mit Bild der Urlaubs-
   * Einladungskarte: „diese einladung ist zu kompliziert. Muss nur ein Textfeld sein Wo
   * der User eingeben kann Komm bitte mit nach Teneriffa am 21. Nov. 2026 …").
   *
   * ERSETZT BOTSCHAFT UND WANN/WO IN EINEM FELD — der Kunde schreibt Anlass, Ziel UND
   * Datum selbst in einen Satz, statt drei getrennte Felder (Gruß, Datum-Chip, Ort-Chip)
   * auszufüllen. `satzTitel` ist der Dialogtitel beim Bauen, `fSatz` ist Platzhalter UND
   * Beispieltext zugleich (siehe `EinladungBauen`s `BEISPIEL_SATZ_URLAUB`).
   */
  satzTitel: string; fSatz: string;
  /** Vorlesetext des Vergrössern-Knopfs auf jeder Karte (Skill `card`). */
  gross: string;
  /** Derselbe Knopf im Vollbild — dort verkleinert er (Owner 04.08.2026). */
  klein: string;
  /**
   * DER VIDEO-AUFPREIS UNTER DER FERTIGEN KARTE (Owner 04.08.2026: „wenn er das Video
   * generieren möchte, dann kann er das nachträglich für 3,99"). {videoauf} füllt fillPrices.
   */
  videoDaraus: string;
  /**
   * DER EINE KAUFKNOPF DES TRICHTERS.
   *
   * ER HIESS `ctaBild` UND SAGTE „Einladung mit Bild — {once}" (Owner 04.08.2026, als das
   * Bild 1,49 € kostete und das Video 3,99 €). Beide Zahlen stehen inzwischen auf {once},
   * und seit dem 07.08.2026 erzeugt der Trichter für dieses Geld das VIDEO
   * (`videoImPreis` in components/EinladungBauen.tsx — dort steht die ganze Begründung).
   * Der alte Name hätte den Knopf zu einer Lüge gemacht, die beim nächsten Lesen niemand
   * mehr bemerkt.
   *
   * `ctaVideoGleich` („Lieber gleich ein Video — {videoauf}") ist seit dem 06.08.2026 der
   * Text eines Knopfes, den es nicht mehr gibt (Owner: „das muss raus. niemand weiss was das
   * ist"). Er bleibt als Übersetzung liegen, falls der Zweitweg je zurückkommt.
   */
  ctaEinladung: string; ctaVideoGleich: string;
  /**
   * DER KAUFKNOPF DES GUTSCHEINS. `ctaEinladung` verspricht eine Einladung — beim Gutschein
   * wird weder eine Einladung noch ein Video gemacht: Er bringt sein Video mit oder nimmt
   * unseres, und heraus kommt eine KARTE. Ein Knopf, der etwas anderes verspricht als das,
   * was passiert, kostet mehr als ein hässlicher.
   */
  ctaGutschein: string;
  /**
   * DIE NAMENSFELDER DES URLAUBS. `fSie`/`fEr` heissen „Ihr Vorname"/„Sein Vorname" — das
   * sind Braut und Bräutigam. Wer jemanden in den Urlaub einlädt, lädt eine Partnerin ein,
   * einen Freund, eine Schwester; wer es ist, wissen wir nicht.
   */
  fDu: string; fEingeladen: string;
  /** Abo-Kasten fürs Paar: Planner-Funktionen freischalten. */
  aboTitel: string; aboText: string; aboKnopf: string;
  /** Zwischen Rückkehr von Stripe und Server-Neuladen (Ä11). */
  aboPruefen: string;
  bearbeiten: string; speichern: string; abbrechen: string; teilen: string;
  fSie: string; fEr: string; fDatum: string; fOrt: string; fAdresse: string; fTelefon: string;
  namen: string; fotos: string; fotoEr: string; loeschen: string; zurueck: string; tonAus: string; hell: string; dunkel: string; ersetzen: string;
  fZwei: string; fGemeinsam: string; fPaar: string; menschenErsetzen: string;
}> = {
  de: { save: "Hochzeitseinladung", fDu: "Dein Vorname", fEingeladen: "Ihr oder sein Vorname", klein: "Video verkleinern", ctaEinladung: "Video-Einladung erstellen — {once}", ctaGutschein: "Gutschein-Karte erstellen — {gutschein}", ctaVideoGleich: "Lieber gleich ein Video — {videoauf}", videoDaraus: "Daraus ein Video machen — {videoauf}", gross: "Video vergrößern", fBotschaftTitel: "Deine Botschaft", fVon: "Von", fBis: "Bis (kannst du frei lassen)", fBotschaft: "Lass uns in den Urlaub fahren, du und ich!", satzTitel: "Deine Einladung", fSatz: "Komm bitte mit nach Teneriffa am 21. Nov. 2026 …", bestaetigen: "Bitte bestätige die Einladung", fotosUrlaub: "Deine Fotos", fotoEingeladen: "Sie oder er", preiseUrlaub: "Video-Einladung {once} · Seite {days} Tage online", zusTitelUrlaub: "Antwort", zusGaesteUrlaub: (ja: number, nein: number) => ja ? "Sie kommt mit" : nein ? "Sie kann leider nicht" : "Noch keine Antwort", urlaubTitel: "Urlaubs-Einladung", gutscheinTitel: "Mein Geschenk für dich: Ein Gutschein!", gutscheinOeffnen: "Gutschein öffnen", gutscheinTopics: { kiss: "ein Kussvideo", birthday: "eine Geburtstagskarte", surprise: "ein Tanzvideo", holiday: "eine Urlaubs-Einladung", wedding: "eine Hochzeitseinladung" }, gutscheinGuthaben: (was: string, mail: string) => `Darin für dich: ${was} — dein Guthaben liegt auf ${mail}`, gutscheinAussuchen: "Jetzt einlösen", verschicktMit: "Verschickt — {mail} hat den Link per E-Mail bekommen.", verschicktOhne: "Deine Karte ist bereit — verschick jetzt den Link.", fBotschaftGutschein: "Alles Liebe zum Geburtstag! Dein Geschenk wartet hinter dem Knopf.", wann: "Wann", wo: "Wo", herkunft: "Dieses Video ist mit LuxuryBandit gemacht.", eigenes: "Macht euer eigenes", ton: "Ton an", wa: "Fragen? Schreibt uns", zusTitel: "Wer kommt", zusJa: "Ich komme", zusNein: "Ich kann leider nicht", zusName: "Dein Vorname", zusSenden: "Antworten", zusDanke: "Danke — wir freuen uns!", zusLeer: "Sei der Erste, der antwortet.", zusGaeste: (g: number, nein: number) => `${g === 1 ? "1 Gast kommt" : `${g} Gäste kommen`}${nein ? ` · ${nein === 1 ? "1 Absage" : `${nein} Absagen`}` : ""}`, zusMail: "Deine E-Mail", zusMailWarum: "Damit euch das Brautpaar erreichen kann, wenn sich Uhrzeit oder Ort ändern.", zusDatenschutz: "Datenschutz", zusMenuFrage: "Euer Menü", zusMenuNormal: "Normal", zusMenuVeg: "Vegetarisch", zusMenuVegan: "Vegan", zusWieViele: "Wie viele seid ihr?", chatTitel: "Gruppenchat", chatLeer: "Noch keine Nachricht — schreibt die erste.", chatFeld: "Nachricht an alle …", chatSenden: "Senden", chatLoeschen: "Nachricht löschen", abgelaufen: "Diese Einladung ist abgelaufen", abgelaufenGast: "Das Brautpaar muss sie wieder freischalten — meldet euch bei ihnen.", probeTage: (n: number) => n === 1 ? "Noch 1 Tag aktiv — danach als Abo verlängerbar" : `Noch ${n} Tage aktiv — danach als Abo verlängerbar`, bearbeiten: "Bearbeiten", speichern: "Speichern", abbrechen: "Abbrechen", teilen: "Verschicken", fSie: "Ihr Vorname", fEr: "Sein Vorname", fDatum: "Datum", fOrt: "Saal oder Restaurant", fAdresse: "Straße, Nr., PLZ, Ort", fTelefon: "Eure WhatsApp-Nummer", namen: "Eure Namen", fotos: "Eure Fotos", fotoEr: "Er, der Bräutigam", loeschen: "Foto löschen", zurueck: "Zurück", tonAus: "Ton aus", hell: "Helle Ansicht", dunkel: "Dunkle Ansicht", ersetzen: "Foto ersetzen", fZwei: "Zwei Fotos", fGemeinsam: "Ein Foto von uns beiden", fPaar: "Ihr beide", menschenErsetzen: "Personen ersetzen", wiederTitel: "Karte wieder freischalten", wiederText: "Eure Einladung samt Zusagen und Gruppenchat bleibt mit dem Abo erhalten — {monat} im Monat, jederzeit kündbar.", wiederKnopf: "Für {monat}/Monat behalten", preise: "Video-Einladung {once} · Seite {days} Tage online · Zusagen, Menü & Chat: im Abo {monat}/Monat, jederzeit kündbar", aboTitel: "Zusagen, Menü & Gruppenchat freischalten", aboText: "Eure Gäste sagen mit einem Tipp zu, wählen ihr Menü und schreiben in der Gruppe — ihr seht jederzeit die genaue Gästezahl. Das Abo kostet {monat} im Monat, ist jederzeit kündbar und hält eure Seite über die {days} Tage hinaus online.", aboKnopf: "Abo abschließen — {monat}/Monat", aboPruefen: "Zahlung wird bestätigt …" },
  en: { save: "Wedding invitation", fDu: "Your first name", fEingeladen: "Their first name", klein: "Exit fullscreen", ctaEinladung: "Create the video invitation — {once}", ctaGutschein: "Create the voucher card — {gutschein}", ctaVideoGleich: "Make it a video right away — {videoauf}", videoDaraus: "Turn it into a video — {videoauf}", gross: "Enlarge video", fBotschaftTitel: "Your message", fVon: "From", fBis: "To (you can leave this empty)", fBotschaft: "Let's go on holiday, just the two of us!", satzTitel: "Your invitation", fSatz: "Come with me to Tenerife on 21 Nov 2026 …", bestaetigen: "Please confirm the invitation", fotosUrlaub: "Your photos", fotoEingeladen: "The one you invite", preiseUrlaub: "Video invitation {once} · page online for {days} days", zusTitelUrlaub: "Reply", zusGaesteUrlaub: (ja: number, nein: number) => ja ? "They are coming" : nein ? "They can\u2019t make it" : "No answer yet", urlaubTitel: "Holiday invitation", gutscheinTitel: "My present for you: a gift card!", gutscheinOeffnen: "Open the voucher", gutscheinTopics: { kiss: "a kiss video", birthday: "a birthday card", surprise: "a dance video", holiday: "a holiday invitation", wedding: "a wedding invitation" }, gutscheinGuthaben: (was: string, mail: string) => `Inside for you: ${was} — your credit is on ${mail}`, gutscheinAussuchen: "Redeem now", verschicktMit: "Sent — {mail} got the link by email.", verschicktOhne: "Your card is ready — now send the link.", fBotschaftGutschein: "Happy birthday! Your present is waiting behind the button.", wann: "When", wo: "Where", herkunft: "This video was made with LuxuryBandit.", eigenes: "Make your own", ton: "Sound on", wa: "Questions? Message us", zusTitel: "Who's coming", zusJa: "I'll be there", zusNein: "Sorry, I can't", zusName: "Your first name", zusSenden: "Send", zusDanke: "Thank you — we can't wait!", zusLeer: "Be the first to answer.", zusGaeste: (g: number, nein: number) => `${g === 1 ? "1 guest coming" : `${g} guests coming`}${nein ? ` · ${nein} can\u2019t` : ""}`, zusMail: "Your email", zusMailWarum: "So the couple can reach you if the time or the place changes.", zusDatenschutz: "Privacy", zusMenuFrage: "Your meal", zusMenuNormal: "Regular", zusMenuVeg: "Vegetarian", zusMenuVegan: "Vegan", zusWieViele: "How many of you?", chatTitel: "Group chat", chatLeer: "No messages yet — write the first one.", chatFeld: "Message everyone …", chatSenden: "Send", chatLoeschen: "Delete message", abgelaufen: "This invitation has expired", abgelaufenGast: "The couple needs to unlock it again — get in touch with them.", probeTage: (n: number) => n === 1 ? "1 day left — extend with a subscription" : `${n} days left — extend with a subscription`, bearbeiten: "Edit", speichern: "Save", abbrechen: "Cancel", teilen: "Send it", fSie: "Her first name", fEr: "His first name", fDatum: "Date", fOrt: "Venue", fAdresse: "Street, no., postcode, town", fTelefon: "Your WhatsApp number", namen: "Your names", fotos: "Your photos", fotoEr: "Him, the groom", loeschen: "Delete photo", zurueck: "Back", tonAus: "Sound off", hell: "Light view", dunkel: "Dark view", ersetzen: "Replace photo", fZwei: "Two photos", fGemeinsam: "One photo of us both", fPaar: "The two of you", menschenErsetzen: "Replace people", wiederTitel: "Reactivate this card", wiederText: "Your invitation with its replies and group chat stays alive with the subscription — {monat} a month, cancel anytime.", wiederKnopf: "Keep it for {monat}/month", preise: "Video invitation {once} · page online for {days} days · guest list, menu & chat: with the {monat}/month subscription, cancel anytime", aboTitel: "Unlock the guest list, menu & group chat", aboText: "Your guests reply with one tap, pick their meal and write in the group — you always see the exact guest count. The subscription is {monat} a month, cancel anytime, and it keeps your page online beyond the {days} days.", aboKnopf: "Subscribe — {monat}/month", aboPruefen: "Confirming your payment …" },
  ro: { save: "Invitație la nuntă", fDu: "Prenumele tău", fEingeladen: "Prenumele lui sau al ei", klein: "Micșorează videoclipul", ctaEinladung: "Creează invitația video — {once}", ctaGutschein: "Creează cardul cu voucher — {gutschein}", ctaVideoGleich: "Direct un videoclip — {videoauf}", videoDaraus: "Transformă în videoclip — {videoauf}", gross: "Mărește videoclipul", fBotschaftTitel: "Mesajul tău", fVon: "De la", fBis: "Până la (poți lăsa gol)", fBotschaft: "Hai să plecăm în vacanță, doar noi doi!", satzTitel: "Invitația ta", fSatz: "Vino cu mine în Tenerife pe 21 nov. 2026 …", bestaetigen: "Te rog confirmă invitația", fotosUrlaub: "Pozele tale", fotoEingeladen: "Cel sau cea pe care o inviți", preiseUrlaub: "Invitație video {once} · pagina online {days} zile", zusTitelUrlaub: "Răspuns", zusGaesteUrlaub: (ja: number, nein: number) => ja ? "Vine cu tine" : nein ? "Din păcate nu poate" : "Încă niciun răspuns", urlaubTitel: "Invitație în vacanță", gutscheinTitel: "Cadoul meu pentru tine: un voucher!", gutscheinOeffnen: "Deschide voucherul", gutscheinTopics: { kiss: "un videoclip cu un sărut", birthday: "o felicitare de zi de naștere", surprise: "un videoclip cu dans", holiday: "o invitație în vacanță", wedding: "o invitație la nuntă" }, gutscheinGuthaben: (was: string, mail: string) => `Înăuntru pentru tine: ${was} — creditul tău e pe ${mail}`, gutscheinAussuchen: "Folosește-l acum", verschicktMit: "Trimis — {mail} a primit linkul pe e-mail.", verschicktOhne: "Cardul tău e gata — trimite acum linkul.", fBotschaftGutschein: "La mulți ani! Cadoul tău te așteaptă în spatele butonului.", wann: "Când", wo: "Unde", herkunft: "Videoclipul e făcut cu LuxuryBandit.", eigenes: "Faceți-l pe al vostru", ton: "Pornește sunetul", wa: "Întrebări? Scrieți-ne", zusTitel: "Cine vine", zusJa: "Vin cu drag", zusNein: "Din păcate nu pot", zusName: "Prenumele tău", zusSenden: "Trimite", zusDanke: "Mulțumim — abia așteptăm!", zusLeer: "Fii primul care răspunde.", zusGaeste: (g: number, nein: number) => `${g === 1 ? "vine 1 invitat" : `vin ${g} invitați`}${nein ? ` · ${nein === 1 ? "1 refuz" : `${nein} refuzuri`}` : ""}`, zusMail: "E-mailul tău", zusMailWarum: "Ca mirii să vă poată anunța dacă se schimbă ora sau locul.", zusDatenschutz: "Confidențialitate", zusMenuFrage: "Meniul vostru", zusMenuNormal: "Normal", zusMenuVeg: "Vegetarian", zusMenuVegan: "Vegan", zusWieViele: "Câți sunteți?", chatTitel: "Chat de grup", chatLeer: "Niciun mesaj încă — scrieți primul.", chatFeld: "Un mesaj pentru toți …", chatSenden: "Trimite", chatLoeschen: "Șterge mesajul", abgelaufen: "Această invitație a expirat", abgelaufenGast: "Mirii trebuie să o reactiveze — vorbiți cu ei.", probeTage: (n: number) => n === 1 ? "A mai rămas 1 zi activă — apoi prelungești cu abonament" : `Au mai rămas ${n} zile active — apoi prelungești cu abonament`, bearbeiten: "Editează", speichern: "Salvează", abbrechen: "Anulează", teilen: "Trimite", fSie: "Prenumele ei", fEr: "Prenumele lui", fDatum: "Data", fOrt: "Sala sau restaurantul", fAdresse: "Strada, nr., cod poștal, oraș", fTelefon: "Numărul vostru de WhatsApp", namen: "Numele voastre", fotos: "Pozele voastre", fotoEr: "El, mirele", loeschen: "Șterge poza", zurueck: "Înapoi", tonAus: "Oprește sunetul", hell: "Vizualizare deschisă", dunkel: "Vizualizare întunecată", ersetzen: "Înlocuiește poza", fZwei: "Două poze", fGemeinsam: "O poză cu noi doi", fPaar: "Voi doi", menschenErsetzen: "Înlocuiește persoanele", wiederTitel: "Reactivează cardul", wiederText: "Invitația voastră, cu răspunsuri și chat de grup, rămâne activă cu abonamentul — {monat} pe lună, anulezi oricând.", wiederKnopf: "Păstrează cu {monat}/lună", preise: "Invitație video {once} · pagina online {days} zile · confirmări, meniu și chat: cu abonamentul de {monat}/lună, anulezi oricând", aboTitel: "Activați confirmările, meniul și chatul", aboText: "Invitații confirmă cu o atingere, își aleg meniul și scriu în grup — voi vedeți oricând numărul exact de invitați. Abonamentul costă {monat} pe lună, se poate anula oricând și ține pagina online după cele {days} zile.", aboKnopf: "Abonează-te — {monat}/lună", aboPruefen: "Confirmăm plata …" },
  es: { save: "Invitación de boda", fDu: "Tu nombre", fEingeladen: "Su nombre", klein: "Reducir el vídeo", ctaEinladung: "Crear la invitación en vídeo — {once}", ctaGutschein: "Crear la tarjeta con el vale — {gutschein}", ctaVideoGleich: "Mejor un vídeo directamente — {videoauf}", videoDaraus: "Convertirlo en vídeo — {videoauf}", gross: "Ampliar el vídeo", fBotschaftTitel: "Tu mensaje", fVon: "Desde", fBis: "Hasta (puedes dejarlo vacío)", fBotschaft: "¡Vámonos de vacaciones, tú y yo!", satzTitel: "Tu invitación", fSatz: "Ven conmigo a Tenerife el 21 nov. 2026 …", bestaetigen: "Por favor, confirma la invitación", fotosUrlaub: "Tus fotos", fotoEingeladen: "A quien invitas", preiseUrlaub: "Invitación en vídeo {once} · página online {days} días", zusTitelUrlaub: "Respuesta", zusGaesteUrlaub: (ja: number, nein: number) => ja ? "Se apunta" : nein ? "No puede" : "Sin respuesta todavía", urlaubTitel: "Invitación de vacaciones", gutscheinTitel: "Mi regalo para ti: ¡un vale!", gutscheinOeffnen: "Abrir el vale", gutscheinTopics: { kiss: "un vídeo de beso", birthday: "una tarjeta de cumpleaños", surprise: "un vídeo de baile", holiday: "una invitación de vacaciones", wedding: "una invitación de boda" }, gutscheinGuthaben: (was: string, mail: string) => `Dentro para ti: ${was} — tu saldo está en ${mail}`, gutscheinAussuchen: "Canjéalo ahora", verschicktMit: "Enviado — {mail} recibió el enlace por correo.", verschicktOhne: "Tu tarjeta está lista — envía ahora el enlace.", fBotschaftGutschein: "¡Feliz cumpleaños! Tu regalo te espera detrás del botón.", wann: "Cuándo", wo: "Dónde", herkunft: "Este vídeo está hecho con LuxuryBandit.", eigenes: "Haced el vuestro", ton: "Activar sonido", wa: "¿Dudas? Escríbenos", zusTitel: "Quién viene", zusJa: "Allí estaré", zusNein: "Lo siento, no puedo", zusName: "Tu nombre", zusSenden: "Enviar", zusDanke: "¡Gracias, os esperamos!", zusLeer: "Sé el primero en responder.", zusGaeste: (g: number, nein: number) => `${g === 1 ? "1 invitado confirmado" : `${g} invitados confirmados`}${nein ? ` · ${nein === 1 ? "1 no puede" : `${nein} no pueden`}` : ""}`, zusMail: "Tu correo", zusMailWarum: "Para que los novios puedan avisarte si cambia la hora o el lugar.", zusDatenschutz: "Privacidad", zusMenuFrage: "Vuestro menú", zusMenuNormal: "Normal", zusMenuVeg: "Vegetariano", zusMenuVegan: "Vegano", zusWieViele: "¿Cuántos sois?", chatTitel: "Chat del grupo", chatLeer: "Aún no hay mensajes — escribid el primero.", chatFeld: "Un mensaje para todos …", chatSenden: "Enviar", chatLoeschen: "Borrar el mensaje", abgelaufen: "Esta invitación ha caducado", abgelaufenGast: "Los novios tienen que reactivarla — habladlo con ellos.", probeTage: (n: number) => n === 1 ? "Queda 1 día activa — luego se renueva con suscripción" : `Quedan ${n} días activa — luego se renueva con suscripción`, bearbeiten: "Editar", speichern: "Guardar", abbrechen: "Cancelar", teilen: "Enviar", fSie: "Su nombre", fEr: "Su nombre (él)", fDatum: "Fecha", fOrt: "Salón o restaurante", fAdresse: "Calle, nº, código postal, ciudad", fTelefon: "Vuestro número de WhatsApp", namen: "Vuestros nombres", fotos: "Vuestras fotos", fotoEr: "Él, el novio", loeschen: "Borrar la foto", zurueck: "Volver", tonAus: "Silenciar", hell: "Vista clara", dunkel: "Vista oscura", ersetzen: "Sustituir la foto", fZwei: "Dos fotos", fGemeinsam: "Una foto de los dos", fPaar: "Vosotros dos", menschenErsetzen: "Cambiar las personas", wiederTitel: "Reactivar la tarjeta", wiederText: "Vuestra invitación con las respuestas y el chat de grupo sigue viva con la suscripción — {monat} al mes, cancela cuando quieras.", wiederKnopf: "Conservar por {monat}/mes", preise: "Invitación en vídeo {once} · página online {days} días · confirmaciones, menú y chat: con la suscripción de {monat}/mes, cancela cuando quieras", aboTitel: "Activar confirmaciones, menú y chat", aboText: "Vuestros invitados confirman con un toque, eligen su menú y escriben en el grupo — veis en todo momento el número exacto de invitados. La suscripción cuesta {monat} al mes, se cancela cuando queráis y mantiene la página online pasados los {days} días.", aboKnopf: "Suscribirse — {monat}/mes", aboPruefen: "Confirmando el pago …" },
  fr: { save: "Invitation de mariage", fDu: "Ton prénom", fEingeladen: "Son prénom", klein: "Réduire la vidéo", ctaEinladung: "Créer l’invitation vidéo — {once}", ctaGutschein: "Créer la carte avec le bon — {gutschein}", ctaVideoGleich: "Plutôt une vidéo tout de suite — {videoauf}", videoDaraus: "En faire une vidéo — {videoauf}", gross: "Agrandir la vidéo", fBotschaftTitel: "Ton message", fVon: "Du", fBis: "Au (tu peux laisser vide)", fBotschaft: "Partons en vacances, toi et moi !", satzTitel: "Ton invitation", fSatz: "Viens avec moi à Tenerife le 21 nov. 2026 …", bestaetigen: "Merci de confirmer l’invitation", fotosUrlaub: "Tes photos", fotoEingeladen: "La personne que tu invites", preiseUrlaub: "Invitation vidéo {once} · page en ligne {days} jours", zusTitelUrlaub: "Réponse", zusGaesteUrlaub: (ja: number, nein: number) => ja ? "Il ou elle vient" : nein ? "Ne peut pas venir" : "Pas encore de réponse", urlaubTitel: "Invitation en vacances", gutscheinTitel: "Mon cadeau pour toi : un bon cadeau !", gutscheinOeffnen: "Ouvrir le bon", gutscheinTopics: { kiss: "une vidéo de baiser", birthday: "une carte d'anniversaire", surprise: "une vidéo de danse", holiday: "une invitation en vacances", wedding: "une invitation de mariage" }, gutscheinGuthaben: (was: string, mail: string) => `À l'intérieur pour toi : ${was} — ton crédit est sur ${mail}`, gutscheinAussuchen: "L'utiliser maintenant", verschicktMit: "Envoyé — {mail} a reçu le lien par e-mail.", verschicktOhne: "Ta carte est prête — envoie le lien maintenant.", fBotschaftGutschein: "Joyeux anniversaire ! Ton cadeau t'attend derrière le bouton.", wann: "Quand", wo: "Où", herkunft: "Cette vidéo est faite avec LuxuryBandit.", eigenes: "Faites la vôtre", ton: "Activer le son", wa: "Une question ? Écrivez-nous", zusTitel: "Qui vient", zusJa: "Je serai là", zusNein: "Désolé, je ne peux pas", zusName: "Votre prénom", zusSenden: "Envoyer", zusDanke: "Merci — à très bientôt !", zusLeer: "Soyez le premier à répondre.", zusGaeste: (g: number, nein: number) => `${g === 1 ? "1 invité présent" : `${g} invités présents`}${nein ? ` · ${nein === 1 ? "1 absent" : `${nein} absents`}` : ""}`, zusMail: "Votre e-mail", zusMailWarum: "Pour que les mariés puissent vous prévenir si l’heure ou le lieu change.", zusDatenschutz: "Confidentialité", zusMenuFrage: "Votre menu", zusMenuNormal: "Normal", zusMenuVeg: "Végétarien", zusMenuVegan: "Végan", zusWieViele: "Combien serez-vous ?", chatTitel: "Discussion de groupe", chatLeer: "Aucun message — écrivez le premier.", chatFeld: "Un message pour tous …", chatSenden: "Envoyer", chatLoeschen: "Supprimer le message", abgelaufen: "Cette invitation a expiré", abgelaufenGast: "Les mariés doivent la réactiver — contactez-les.", probeTage: (n: number) => n === 1 ? "Encore 1 jour active — ensuite prolongeable par abonnement" : `Encore ${n} jours active — ensuite prolongeable par abonnement`, bearbeiten: "Modifier", speichern: "Enregistrer", abbrechen: "Annuler", teilen: "Envoyer", fSie: "Son prénom (elle)", fEr: "Son prénom (lui)", fDatum: "Date", fOrt: "Salle ou restaurant", fAdresse: "Rue, n°, code postal, ville", fTelefon: "Votre numéro WhatsApp", namen: "Vos prénoms", fotos: "Vos photos", fotoEr: "Lui, le marié", loeschen: "Supprimer la photo", zurueck: "Retour", tonAus: "Couper le son", hell: "Affichage clair", dunkel: "Affichage sombre", ersetzen: "Remplacer la photo", fZwei: "Deux photos", fGemeinsam: "Une photo de nous deux", fPaar: "Vous deux", menschenErsetzen: "Remplacer les personnes", wiederTitel: "Réactiver la carte", wiederText: "Votre invitation avec les réponses et le chat de groupe reste active avec l'abonnement — {monat} par mois, résiliable à tout moment.", wiederKnopf: "Garder pour {monat}/mois", preise: "Invitation vidéo {once} · page en ligne {days} jours · réponses, menu et chat : avec l’abonnement à {monat}/mois, résiliable à tout moment", aboTitel: "Activer réponses, menu et chat", aboText: "Vos invités répondent d’un geste, choisissent leur menu et écrivent dans le groupe — vous voyez à tout moment le nombre exact d’invités. L’abonnement coûte {monat} par mois, résiliable à tout moment, et garde votre page en ligne au-delà des {days} jours.", aboKnopf: "S’abonner — {monat}/mois", aboPruefen: "Confirmation du paiement …" },
  pt: { save: "Convite de casamento", fDu: "O teu nome", fEingeladen: "O nome dele ou dela", klein: "Reduzir o vídeo", ctaEinladung: "Criar o convite em vídeo — {once}", ctaGutschein: "Criar o cartão com o vale — {gutschein}", ctaVideoGleich: "Antes um vídeo já — {videoauf}", videoDaraus: "Transformar em vídeo — {videoauf}", gross: "Ampliar o vídeo", fBotschaftTitel: "A tua mensagem", fVon: "De", fBis: "Até (podes deixar vazio)", fBotschaft: "Vamos de férias, só nós os dois!", satzTitel: "O teu convite", fSatz: "Vem comigo a Tenerife a 21 nov. 2026 …", bestaetigen: "Por favor confirma o convite", fotosUrlaub: "As tuas fotos", fotoEingeladen: "Quem convidas", preiseUrlaub: "Convite em vídeo {once} · página online {days} dias", zusTitelUrlaub: "Resposta", zusGaesteUrlaub: (ja: number, nein: number) => ja ? "Vem contigo" : nein ? "Não pode ir" : "Ainda sem resposta", urlaubTitel: "Convite de férias", gutscheinTitel: "O meu presente para ti: um vale!", gutscheinOeffnen: "Abrir o vale", gutscheinTopics: { kiss: "um vídeo de beijo", birthday: "um cartão de aniversário", surprise: "um vídeo de dança", holiday: "um convite de férias", wedding: "um convite de casamento" }, gutscheinGuthaben: (was: string, mail: string) => `Lá dentro para ti: ${was} — o teu saldo está em ${mail}`, gutscheinAussuchen: "Usar agora", verschicktMit: "Enviado — {mail} recebeu o link por e-mail.", verschicktOhne: "O teu cartão está pronto — envia agora o link.", fBotschaftGutschein: "Parabéns! O teu presente espera por ti atrás do botão.", wann: "Quando", wo: "Onde", herkunft: "Este vídeo foi feito com LuxuryBandit.", eigenes: "Façam o vosso", ton: "Ligar o som", wa: "Dúvidas? Escrevam-nos", zusTitel: "Quem vem", zusJa: "Lá estarei", zusNein: "Infelizmente não posso", zusName: "O teu nome", zusSenden: "Enviar", zusDanke: "Obrigado — mal podemos esperar!", zusLeer: "Sê o primeiro a responder.", zusGaeste: (g: number, nein: number) => `${g === 1 ? "1 convidado confirmado" : `${g} convidados confirmados`}${nein ? ` · ${nein === 1 ? "1 não pode" : `${nein} não podem`}` : ""}`, zusMail: "O teu e-mail", zusMailWarum: "Para que os noivos vos possam avisar se mudar a hora ou o local.", zusDatenschutz: "Privacidade", zusMenuFrage: "O vosso menu", zusMenuNormal: "Normal", zusMenuVeg: "Vegetariano", zusMenuVegan: "Vegan", zusWieViele: "Quantos são?", chatTitel: "Chat do grupo", chatLeer: "Ainda sem mensagens — escrevam a primeira.", chatFeld: "Uma mensagem para todos …", chatSenden: "Enviar", chatLoeschen: "Apagar a mensagem", abgelaufen: "Este convite expirou", abgelaufenGast: "Os noivos têm de o reativar — falem com eles.", probeTage: (n: number) => n === 1 ? "Falta 1 dia ativa — depois renova com subscrição" : `Faltam ${n} dias ativa — depois renova com subscrição`, bearbeiten: "Editar", speichern: "Guardar", abbrechen: "Cancelar", teilen: "Enviar", fSie: "O nome dela", fEr: "O nome dele", fDatum: "Data", fOrt: "Sala ou restaurante", fAdresse: "Rua, n.º, código postal, cidade", fTelefon: "O vosso número de WhatsApp", namen: "Os vossos nomes", fotos: "As vossas fotos", fotoEr: "Ele, o noivo", loeschen: "Apagar a foto", zurueck: "Voltar", tonAus: "Desligar o som", hell: "Vista clara", dunkel: "Vista escura", ersetzen: "Substituir a foto", fZwei: "Duas fotos", fGemeinsam: "Uma foto de nós os dois", fPaar: "Vocês os dois", menschenErsetzen: "Trocar as pessoas", wiederTitel: "Reativar o cartão", wiederText: "O vosso convite com as respostas e o chat de grupo continua ativo com a subscrição — {monat} por mês, cancela quando quiseres.", wiederKnopf: "Manter por {monat}/mês", preise: "Convite em vídeo {once} · página online {days} dias · confirmações, menu e chat: com a subscrição de {monat}/mês, cancela quando quiseres", aboTitel: "Ativar confirmações, menu e chat", aboText: "Os convidados confirmam com um toque, escolhem o menu e escrevem no grupo — veem sempre o número exato de convidados. A subscrição custa {monat} por mês, cancela-se quando quiserem e mantém a página online depois dos {days} dias.", aboKnopf: "Subscrever — {monat}/mês", aboPruefen: "A confirmar o pagamento …" },
  it: { save: "Invito di nozze", fDu: "Il tuo nome", fEingeladen: "Il suo nome", klein: "Riduci il video", ctaEinladung: "Crea l’invito video — {once}", ctaGutschein: "Crea la card con il buono — {gutschein}", ctaVideoGleich: "Meglio subito un video — {videoauf}", videoDaraus: "Trasformalo in video — {videoauf}", gross: "Ingrandisci il video", fBotschaftTitel: "Il tuo messaggio", fVon: "Dal", fBis: "Al (puoi lasciare vuoto)", fBotschaft: "Andiamo in vacanza, io e te!", satzTitel: "Il tuo invito", fSatz: "Vieni con me a Tenerife il 21 nov. 2026 …", bestaetigen: "Conferma l’invito, per favore", fotosUrlaub: "Le tue foto", fotoEingeladen: "Chi inviti", preiseUrlaub: "Invito video {once} · pagina online {days} giorni", zusTitelUrlaub: "Risposta", zusGaesteUrlaub: (ja: number, nein: number) => ja ? "Viene con te" : nein ? "Non può venire" : "Ancora nessuna risposta", urlaubTitel: "Invito in vacanza", gutscheinTitel: "Il mio regalo per te: un buono!", gutscheinOeffnen: "Apri il buono", gutscheinTopics: { kiss: "un video di un bacio", birthday: "un biglietto di compleanno", surprise: "un video di danza", holiday: "un invito in vacanza", wedding: "un invito di nozze" }, gutscheinGuthaben: (was: string, mail: string) => `Dentro per te: ${was} — il tuo credito è su ${mail}`, gutscheinAussuchen: "Riscattalo ora", verschicktMit: "Inviato — {mail} ha ricevuto il link via e-mail.", verschicktOhne: "La tua card è pronta — ora invia il link.", fBotschaftGutschein: "Buon compleanno! Il tuo regalo ti aspetta dietro il pulsante.", wann: "Quando", wo: "Dove", herkunft: "Questo video è fatto con LuxuryBandit.", eigenes: "Fate il vostro", ton: "Attiva l’audio", wa: "Domande? Scriveteci", zusTitel: "Chi viene", zusJa: "Ci sarò", zusNein: "Purtroppo non posso", zusName: "Il tuo nome", zusSenden: "Invia", zusDanke: "Grazie — non vediamo l'ora!", zusLeer: "Sii il primo a rispondere.", zusGaeste: (g: number, nein: number) => `${g === 1 ? "1 ospite presente" : `${g} ospiti presenti`}${nein ? ` · ${nein === 1 ? "1 assente" : `${nein} assenti`}` : ""}`, zusMail: "La tua e-mail", zusMailWarum: "Così gli sposi possono avvisarvi se cambia l’ora o il luogo.", zusDatenschutz: "Privacy", zusMenuFrage: "Il vostro menù", zusMenuNormal: "Normale", zusMenuVeg: "Vegetariano", zusMenuVegan: "Vegano", zusWieViele: "In quanti siete?", chatTitel: "Chat di gruppo", chatLeer: "Ancora nessun messaggio — scrivete il primo.", chatFeld: "Un messaggio per tutti …", chatSenden: "Invia", chatLoeschen: "Elimina il messaggio", abgelaufen: "Questo invito è scaduto", abgelaufenGast: "Gli sposi devono riattivarlo — parlatene con loro.", probeTage: (n: number) => n === 1 ? "Resta 1 giorno attiva — poi si rinnova con abbonamento" : `Restano ${n} giorni attiva — poi si rinnova con abbonamento`, bearbeiten: "Modifica", speichern: "Salva", abbrechen: "Annulla", teilen: "Invia", fSie: "Il suo nome (lei)", fEr: "Il suo nome (lui)", fDatum: "Data", fOrt: "Sala o ristorante", fAdresse: "Via, n., CAP, città", fTelefon: "Il vostro numero WhatsApp", namen: "I vostri nomi", fotos: "Le vostre foto", fotoEr: "Lui, lo sposo", loeschen: "Elimina la foto", zurueck: "Indietro", tonAus: "Disattiva l’audio", hell: "Vista chiara", dunkel: "Vista scura", ersetzen: "Sostituisci la foto", fZwei: "Due foto", fGemeinsam: "Una foto di noi due", fPaar: "Voi due", menschenErsetzen: "Sostituisci le persone", wiederTitel: "Riattiva la card", wiederText: "Il vostro invito con le risposte e la chat di gruppo resta attivo con l'abbonamento — {monat} al mese, disdici quando vuoi.", wiederKnopf: "Tieni a {monat}/mese", preise: "Invito video {once} · pagina online {days} giorni · conferme, menù e chat: con l’abbonamento a {monat}/mese, disdici quando vuoi", aboTitel: "Attiva conferme, menù e chat", aboText: "Gli ospiti confermano con un tocco, scelgono il menù e scrivono nel gruppo — vedete in ogni momento il numero esatto degli ospiti. L’abbonamento costa {monat} al mese, si disdice quando volete e tiene la pagina online oltre i {days} giorni.", aboKnopf: "Abbonati — {monat}/mese", aboPruefen: "Confermiamo il pagamento …" },
};

const ORTE: Record<string, string> = {
  de: "de-DE", en: "en-GB", ro: "ro-RO", es: "es-ES", fr: "fr-FR", pt: "pt-PT", it: "it-IT",
};

/** „14. August 2026" statt „2026-08-14" — das eine liest sich wie eine Einladung, das andere
 *  wie ein Formular. Ein unvollständiges Datum aus dem Formular ergibt schlicht nichts. */
export const karteDatum = (datum: string | undefined, sprache: string) => {
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return "";
  const d = new Date(datum + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString(ORTE[sprache] ?? "en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return datum; }
};

/**
 * ZWEI DATEN ALS EIN ZEITRAUM (Owner 04.08.2026, für die Urlaubs-Einladung).
 *
 * Ein Urlaub hat einen Anfang und ein Ende. Zweimal das volle Datum untereinander liest sich
 * wie ein Formular — „12.–19. November 2026" wie eine Einladung. Deshalb wird zusammengefasst,
 * was zusammengehört: gleicher Monat → nur der erste Tag als Zahl; gleiches Jahr → das Jahr
 * nur einmal am Schluss.
 *
 * Fehlt das zweite Datum, bleibt es beim einzelnen Tag — dann gilt wieder `karteDatum`.
 */
export const karteZeitraum = (von: string | undefined, bis: string | undefined, sprache: string) => {
  const a = karteDatum(von, sprache);
  if (!a) return "";
  if (!bis || bis === von) return a;
  const b = karteDatum(bis, sprache);
  if (!b) return a;
  const ort = ORTE[sprache] ?? "en-GB";
  const dv = new Date(von + "T12:00:00Z");
  const db = new Date(bis + "T12:00:00Z");
  if (Number.isNaN(dv.getTime()) || Number.isNaN(db.getTime()) || db < dv) return a;
  try {
    const gleicherMonat = dv.getUTCFullYear() === db.getUTCFullYear() && dv.getUTCMonth() === db.getUTCMonth();
    if (gleicherMonat) {
      // „12.–19. November 2026" — der erste Tag nackt, alles Übrige einmal am Schluss.
      const tag = dv.toLocaleDateString(ort, { day: "numeric" });
      return `${tag}–${b}`;
    }
    const gleichesJahr = dv.getUTCFullYear() === db.getUTCFullYear();
    if (gleichesJahr) {
      // „28. November – 3. Dezember 2026" — das Jahr nur hinten.
      const vonKurz = dv.toLocaleDateString(ort, { day: "numeric", month: "long" });
      return `${vonKurz} – ${b}`;
    }
    return `${a} – ${b}`;
  } catch { return a; }
};

export default function EinladungKarte({
  sprache, sie, er, datum, bisDatum, ort, adresse, telefon, demo, video, fuss,
  botschaft, aufBotschaft, von, aufVon, bestaetigen, aufBestaetigen,
  aufNamen, aufDatum, aufOrt, titel, satz, aufSatz,
}: {
  sprache: string;
  sie: string;
  er: string;
  datum?: string;
  /** Der letzte Tag — nur beim Urlaub gesetzt. Leer heisst: ein einzelner Tag wie bisher. */
  bisDatum?: string;
  ort?: string;
  /** Strasse, Hausnummer, PLZ, Stadt (Owner 31.07.2026: „da muss auch eine genaue Adresse
   *  rein mit Postleitzahl"). Ein Saalname allein hilft keinem Gast, der hinfahren muss. */
  adresse?: string;
  /**
   * DIE WHATSAPP-NUMMER DES PAARES — und damit die Zusage.
   *
   * Owner 31.07.2026: „und WA Nummer". Das ist der ehrliche Weg zur Gaesteliste: Der Gast
   * schreibt DEM PAAR, nicht uns. Keine fremden Personendaten bei uns, kein Konto fuer den
   * Gast, und es funktioniert am ersten Tag — anders als ein eigenes Zusage-System.
   */
  telefon?: string;
  /** Auf der Verkaufsseite: Knopf zeigen, aber NICHT verlinken. Sonst schreiben Fremde einer
   *  erfundenen Nummer — oder schlimmer, einer echten. */
  demo?: boolean;
  /** Video (bezahlt) oder Standbild (Probewoche) — die Karte fragt nicht, was es ist. */
  video: ReactNode;
  /** Die eine Herkunftszeile — nur auf der echten Seite, nicht in der Vorschau. */
  fuss?: ReactNode;
  /**
   * ANTIPPBARE STELLEN (Owner 31.07.2026: „er klickt auf Name, dann öffnet sich Dialog. Er
   * klickt auf Ort, öffnet sich Dialog.").
   *
   * Wo ein Griff mitgegeben wird, wird die Stelle zum Knopf — mit einer gestrichelten Linie,
   * solange dort noch nichts steht. Ohne Griff bleibt die Karte, was sie beim Gast ist: ein
   * Stück Papier, auf dem man nichts anklickt.
   */
  aufNamen?: () => void;
  aufDatum?: () => void;
  aufOrt?: () => void;
  /**
   * EIGENE UEBERSCHRIFT statt „Hochzeitseinladung" (Owner 31.07.2026: „wir machen das jetzt
   * wie Hochzeit, das Layout" — fuer den Kuss).
   *
   * Dieselbe Karte traegt jetzt zwei Dinge: eine Einladung mit Namen, Datum und Ort, und ein
   * einzelnes Werk ohne all das. Ohne `sie`/`er` faellt die Namenszeile weg — eine leere
   * Zeile mit einem goldenen „&" darin waere ein sichtbarer Fehler.
   */
  titel?: string;
  /**
   * DIE BOTSCHAFT UNTER DEM BILD (Owner 04.08.2026: „vielleicht will derjenige mehr
   * schreiben. Dann soll das doch unter der Karte sein").
   *
   * Sie stand im ersten Entwurf über den Namen — sein Einwand ist der bessere: Ein langer
   * Text oben schiebt genau das nach unten, was die Karte verkauft. Unter dem Bild liest er
   * sich wie eine handgeschriebene Zeile unter einem Foto, und er darf wachsen.
   */
  botschaft?: string;
  aufBotschaft?: () => void;
  /**
   * WER ES SCHICKT (Owner 05.08.2026, zur Gutschein-Karte: „kannst du es machen von: …").
   *
   * Einem Geschenk fehlt sonst genau das Wichtigste. Bei Hochzeit und Urlaub steht oben das
   * PAAR — dort weiss der Empfänger sofort, von wem die Karte kommt. Beim Gutschein gibt es
   * kein Paar und keine Namenszeile; ohne diese Zeile öffnet jemand eine Karte und weiss
   * nicht, wer sie geschickt hat.
   *
   * Steht sie leer und gibt es keinen Griff, erscheint sie gar nicht — die anderen Anlässe
   * merken also nichts davon.
   */
  von?: string;
  aufVon?: () => void;
  /**
   * „Bitte bestätige die Einladung" (Owner 04.08.2026). Ohne diese Zeile ist die Karte eine
   * Ankündigung, keine Einladung — sie sagt nicht, was der Empfänger tun soll.
   *
   * Bewusst NICHT editierbar: Das ist die Anweisung, wie die Seite funktioniert, kein
   * persönlicher Satz. Beim Empfänger springt `aufBestaetigen` zur Ja/Nein-Karte darunter;
   * ohne den Griff steht sie nur da (so sieht der Absender beim Bauen, was ankommt).
   */
  bestaetigen?: string;
  aufBestaetigen?: () => void;
  /**
   * DER EINE EINLADUNGSSATZ (Owner 12.08.2026, mit Bild der Urlaubs-Einladungskarte: „diese
   * einladung ist zu kompliziert. Muss nur ein Textfeld sein Wo der User eingeben kann Komm
   * bitte mit nach Teneriffa am 21. Nov. 2026 … Dieses Eingabefeld habe später auch im
   * Tunel").
   *
   * ERSETZT BOTSCHAFT UND WANN/WO AN DERSELBEN STELLE — steht `satz` oder `aufSatz`, zeigt
   * die Karte NUR NOCH diesen einen Satz dort, wo sonst Gruß plus Datum- und Ort-Chip
   * standen; die alten drei Felder verschwinden für diesen Aufruf komplett (siehe unten).
   *
   * RÜCKWÄRTSKOMPATIBEL, WEIL DATENGETRIEBEN, NICHT AUFRUFERGETRIEBEN: Eine bereits
   * verschickte Urlaubs-Einladung von VOR diesem Tag hat kein `satz` in der Datenbank — der
   * Aufrufer (die öffentliche Seite) übergibt dann weiterhin `datum`/`ort`, aber kein `satz`
   * und kein `aufSatz`, und die Karte zeigt automatisch wieder die alten Chips. Nur eine
   * NEUE Einladung (oder das Bauen einer solchen) bringt `satz`/`aufSatz` mit.
   */
  satz?: string;
  aufSatz?: () => void;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const hatNamen = !!(sie || er);
  const tag = karteZeitraum(datum, bisDatum, sprache);
  /** Der Einladungssatz gewinnt, sobald er (oder sein Bau-Griff) da ist — sonst die alten
   *  Felder. Siehe die Begründung an `satz` oben. */
  const zeigtSatz = !!(satz || aufSatz);
  /** Steht unter dem Bild noch etwas? Satz, Botschaft, Datum, Ort, Nummer oder die Herkunftszeile. */
  const hatUnten = !!(tag || ort || adresse || telefon || fuss || botschaft || aufBotschaft || von || aufVon || aufDatum || aufOrt || satz || aufSatz);

  return (
    <div className="lb-karte relative overflow-hidden rounded-[20px] px-5 pb-6 pt-7 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      {/* Die vier Eckranken — `relative overflow-hidden` oben ist ihre Bedingung. */}
      <CornerOrnaments />
      {/* Eine zweite, feine Linie innen: So sieht eine gedruckte Karte aus, und sie hält die
          Ornamente optisch zusammen, statt sie in den Ecken allein zu lassen. */}
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />

      <div className="relative">
        {/* KURZ = ETIKETT, LANG = SATZ (05.08.2026). „HOCHZEITSEINLADUNG" in Versalien mit
            Sperrschrift ist eine Auszeichnung und liest sich gut. „MEIN GESCHENK FÜR ANNA:
            EINEN KUSS" in derselben Schrift ist eine Zumutung — gesperrte Versalien liest man
            Buchstabe für Buchstabe. Ab 18 Zeichen also normale Schreibung, etwas grösser und
            ohne Sperrung; der Titel bleibt gold und mittig, nur die Auszeichnung fällt weg. */}
        {/* Die Zeile liegt jetzt in der Bibliothek (`KartenTitel` in components/CI.tsx) — die
            Themen-Kachel benutzt dieselbe, damit „genau das gleiche Design" auch dasselbe
            bleibt, wenn sich eines Tages etwas daran ändert. */}
        <KartenTitel>{titel || T.save}</KartenTitel>
        {!hatNamen ? null : aufNamen ? (
          <button type="button" onClick={aufNamen}
            className="lb-tippbar mx-auto mt-2 block w-full rounded-xl px-2 py-1 text-center font-serif text-[27px] font-bold leading-tight transition active:scale-[0.98]">
            {sie} <span className="lb-karte-gold">&amp;</span> {er}
          </button>
        ) : (
          <h2 className="mt-2 text-center font-serif text-[27px] font-bold leading-tight">
            {sie} <span className="lb-karte-gold">&amp;</span> {er}
          </h2>
        )}
        {hatNamen && <DividerOrnament className="mt-2.5" />}

        {/* ABSTAND NACH UNTEN, WENN NICHTS MEHR FOLGT (Owner 31.07.2026: „unten die
            Ornamente brauchen Abstand zum Bild").
            Auf der Einladung stehen unter dem Bild noch Datum, Ort und Nummer — die halten
            die Eckranken auf Abstand. Beim Kuss faellt das alles weg, das Bild ist das letzte
            Element, und die unteren Ranken sassen direkt darauf. Eine gedruckte Karte hat
            unten immer einen Rand; ohne ihn sieht sie nach Fehler aus, nicht nach Karte. */}
        <div className={`mt-4 overflow-hidden rounded-[14px] ${hatUnten ? "" : "mb-5"}`}>{video}</div>

        {/* DIE BOTSCHAFT — direkt unter dem Bild, vor Datum und Ort. `whitespace-pre-line`,
            weil ein Absatz auch ein Absatz bleiben soll: Wer zwei Zeilen schreibt, meint zwei
            Zeilen. Beim Bauen steht der Vorgabesatz drin und die Fläche ist antippbar. */}
        {/* LINKSBÜNDIG (Owner 04.08.2026: „links").
            Mittig sieht bei EINER Zeile gut aus — sobald jemand vier schreibt, franst der
            Block an beiden Rändern aus und liest sich schwer. Alles andere auf der Karte
            bleibt mittig; das ist der Unterschied zwischen Angaben (Datum, Ort) und einem
            Text, den man wirklich liest. */}
        {/**
          * DER EINE EINLADUNGSSATZ (Owner 12.08.2026: „diese einladung ist zu kompliziert.
          * Muss nur ein Textfeld sein"). Steht an GENAU DER STELLE, wo sonst Botschaft und
          * Wann/Wo standen — deshalb hier, vor dem alten Block, und der alte Block fällt für
          * diesen Aufruf komplett weg (`!zeigtSatz` unten). Gleiche Optik wie die alte
          * Botschaft: linksbündig, `whitespace-pre-line`, dieselbe Tippbar beim Bauen.
          */}
        {zeigtSatz && (
          aufSatz ? (
            <button type="button" onClick={aufSatz}
              className="lb-tippbar mt-4 block w-full whitespace-pre-line rounded-xl px-3 py-2 text-left font-serif text-[16px] leading-snug transition active:scale-[0.98]">
              {satz || T.fSatz}
            </button>
          ) : satz ? (
            <p className="mt-4 whitespace-pre-line px-3 font-serif text-[16px] leading-snug">
              {satz}
            </p>
          ) : null
        )}

        {!zeigtSatz && (<>
        {(botschaft || aufBotschaft) && (
          aufBotschaft ? (
            <button type="button" onClick={aufBotschaft}
              className="lb-tippbar mt-4 block w-full whitespace-pre-line rounded-xl px-3 py-2 text-left font-serif text-[16px] leading-snug transition active:scale-[0.98]">
              {botschaft || T.fBotschaft}
            </button>
          ) : (
            <p className="mt-4 whitespace-pre-line px-3 font-serif text-[16px] leading-snug">
              {botschaft}
            </p>
          )
        )}

        {/* „Von …" — rechtsbündig unter der Botschaft, wie eine Unterschrift unter einem Brief.
            Kleiner und in Gold: Sie gehört zum Text, soll ihn aber nicht überstimmen. */}
        {(von || aufVon) && (
          aufVon ? (
            <button type="button" onClick={aufVon}
              className="lb-tippbar mt-2 ml-auto block rounded-xl px-3 py-1 text-right font-serif text-[15px] transition active:scale-[0.98]">
              <span className="lb-karte-gold">{T.fVon} </span>{von || T.fDu}
            </button>
          ) : (
            <p className="mt-2 px-3 text-right font-serif text-[15px]">
              <span className="lb-karte-gold">{T.fVon} </span>{von}
            </p>
          )
        )}

        {/* Beim Gast entscheidet der INHALT, ob die Zeile steht — eine leere Zeile „Wann" auf
            einer verschickten Einladung waere ein Fehler. Beim Bauen entscheidet der GRIFF:
            Da ist noch nichts eingetragen, und genau deshalb muss die Stelle dastehen und
            antippbar sein. Ohne dieses `aufDatum || aufOrt` verschwand die halbe Karte, sobald
            sie leer war — und mit ihr der Weg, Datum und Ort ueberhaupt einzutragen. */}
        {(tag || ort || aufDatum || aufOrt) && (
          <>
            <DividerOrnament className="mt-5" />
            <div className="mt-3 space-y-3 text-center">
              {(tag || aufDatum) && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.14em]">{T.wann}</p>
                  {aufDatum ? (
                    <button type="button" onClick={aufDatum}
                      className="lb-tippbar mx-auto mt-1 block rounded-xl px-3 py-1 font-serif text-[19px] font-bold transition active:scale-[0.98]">
                      {tag || T.fDatum}
                    </button>
                  ) : (
                    <p className="mt-1 font-serif text-[19px] font-bold">{tag}</p>
                  )}
                </div>
              )}
              {(ort || adresse || aufOrt) && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.14em]">{T.wo}</p>
                  {aufOrt ? (
                    <button type="button" onClick={aufOrt}
                      className="lb-tippbar mx-auto mt-1 block rounded-xl px-3 py-1 font-serif text-[16px] transition active:scale-[0.98]">
                      {ort || T.fOrt}
                    </button>
                  ) : ort ? <p className="mt-1 font-serif text-[16px]">{ort}</p> : null}
                  {/* Die Anschrift kleiner unter dem Saalnamen — sie wird gelesen, wenn man
                      losfaehrt, nicht wenn man die Einladung oeffnet. */}
                  {adresse && (
                    <p className="mt-0.5 whitespace-pre-line font-serif text-[13px] leading-snug opacity-80">
                      {adresse}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        </>)}

        {/* „BITTE BESTÄTIGE DIE EINLADUNG" — der Abschluss (Owner 04.08.2026).
            Ohne diese Zeile sagt die Karte, WAS ist, aber nicht, was der Empfänger tun soll.
            Beim Empfänger ist sie ein Knopf und springt zur Ja/Nein-Karte darunter; beim
            Bauen steht sie nur da, damit der Absender sieht, was ankommt. */}
        {bestaetigen && (
          aufBestaetigen ? (
            <button type="button" onClick={aufBestaetigen}
              className="lb-karte-gold mx-auto mt-5 block font-serif text-[14px] font-bold underline underline-offset-4 transition active:scale-95">
              {bestaetigen}
            </button>
          ) : (
            <p className="lb-karte-gold mt-5 text-center font-serif text-[14px] font-bold">{bestaetigen}</p>
          )
        )}

        {/* KEIN WHATSAPP-KNOPF MEHR (Owner 31.07.2026: „das mit WhatsApp bitte entfernen,
            wir machen nur share. Die Leute schicken das eh übers Handy").
            Die Nummer bleibt, aber als reiner Telefonlink: Jedes Handy oeffnet damit das, was
            der Gast ohnehin benutzt — anrufen, schreiben, WhatsApp, egal. Ein Knopf, der EINE
            App vorschreibt, schliesst die aus, die sie nicht haben. */}
        {telefon && (
          <p className="mt-4 text-center">
            {demo ? (
              <span className="lb-karte-gold font-serif text-[14px]">{telefon}</span>
            ) : (
              <a href={`tel:${telefon.replace(/[^0-9+]/g, "")}`} className="lb-karte-gold font-serif text-[14px] underline">
                {telefon}
              </a>
            )}
          </p>
        )}

        {fuss}
      </div>
    </div>
  );
}
