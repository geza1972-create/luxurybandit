import { fillPrices } from "@/lib/pricing";
import type { Lang } from "@/lib/lang";

/**
 * DER KUSS-TRICHTER IN SIEBEN SPRACHEN.
 *
 * Owner 30.07.2026, Punkt 4 seiner Liste: „Übersetzung in die acht Sprachen", kurz darauf
 * enger gefasst: „polnisch entfernen, brauchen wir nicht". Die Anzeigen laufen in Rumänien,
 * Deutschland, Italien, Spanien, Frankreich und Portugal — der
 * Trichter sprach bis hierher nur Englisch. Wer in seiner Sprache ankommt, bleibt eher; wer
 * an Schritt 2 nicht versteht, was von ihm verlangt wird, lädt das Falsche hoch (am
 * 30.07.2026 mehrfach passiert) oder springt ab.
 *
 * KEINE ZAHLEN IN DIESEN TABELLEN (Dauerregel des Owners). Preise stehen als Platzhalter
 * — {once}, {price}, {videos} — und werden unten EINMAL aus `lib/pricing` gefüllt. Wer eine
 * Zahl in acht Sprachtabellen abschreibt, vergisst eine.
 *
 * Aufbau: eine vollständige Tabelle je Sprache, danach ein dünner Aufsatz für „Your Idol" —
 * dort unterscheiden sich nur die Zeilen, in denen vom Kuss die Rede ist.
 */

export type KissText = {
  // Schritte
  step1: string; step2: string; step3: string; step4: string;
  /** EIN Knopf-Wort für ALLE Tunnel (Owner 12.08.2026: „Generate now - Preis"). */
  generateNow: string;
  pickHint: string; upTitle: string; upHint: string; tapChange: string;
  /**
   * DIE REGEL UEBER DEM UPLOAD (Owner 15.08.2026: „einen Hinweis musst du schreiben, was der
   * User hochladen kann. Und er soll nicht erwarten, dass nackte Models rauskommen. Wenn er
   * das trotzdem macht und was anderes rauskommt, dann bekommt er das Geld nicht zurueck").
   *
   * OPTIONAL, weil es heute nur den Tanz betrifft — dort entsteht die falsche Erwartung.
   * Wer sie fuer ein weiteres Thema braucht, fuellt den Schluessel dort und sonst nichts.
   */
  upRegel?: string;
  /** Sichtbarer Hinweis, wenn Bild/Video fertig sind, aber die Namen noch das Beispiel zeigen
   *  (03.08.2026: „ich kann es nicht sharen" — der Verschicken-Knopf blieb sonst stumm weg). */
  namenVorSenden: string;
  /**
   * DER TOPIC-GUTSCHEIN IM BAU-SCHRITT (Owner 06.08.2026: „jeder Topic als Gutschein
   * einfügen"). Optional, weil nur die GUTSCHEIN-Variante sie befüllt — die Grundtabellen
   * der anderen Anlässe brauchen diese Zeilen nie.
   */
  lbTitel?: string;
  /**
   * DIE ZWEI ZWISCHENTITEL (Owner 06.08.2026: „Hier muss doch stehen, An wem schenkst du.
   * Weiter unten Wähle das Produkt aus oder Kreditbetrag als Titel."): Über der E-Mail steht,
   * WEM geschenkt wird; über den Chips, WAS gewählt wird. Ein Titel je Frage.
   */
  lbWem?: string;
  lbWahlTitel?: string;
  lbHilfe?: string;
  lbEmpfaenger?: string;
  lbFehlerMail?: string;
  /** {was} wird durch das gewählte Geschenk ersetzt (T.gutscheinTopics in EinladungKarte). */
  lbFertig?: string;
  /**
   * DIE ADRESSE NACH DEM KAUF, VOLL AUSGESCHRIEBEN ({mail}) — Owner 06.08.2026 auf die Frage,
   * was mit einem Tippfehler passiert: „Anzeigen".
   *
   * Mit dem Kauf verschwindet das Empfänger-Feld, und das Guthaben hängt ab da an genau dieser
   * Zeichenkette (Memory `guthaben-haengt-an-einer-adresse`: umbuchen gibt es nicht). Wer sich
   * vertippt hat, schenkt einem Postfach, das es nicht gibt. Deshalb steht die Adresse hier
   * ungekürzt: Das ist der Bildschirm des KÄUFERS, er hat sie selbst getippt — maskiert würde
   * sie genau den Buchstaben verbergen, um den es geht. (Auf der Karte, die JEDER öffnen kann,
   * bleibt sie maskiert.)
   */
  lbGehtAn?: string;
  /** Zeile über den nackten Guthaben-Stufen („oder Credit", Owner 06.08.2026). */
  lbGuthaben?: string;
  /**
   * Der Kaufknopf, wenn ein Produkt gewählt ist ({preis} = Produktpreis). Die Karte selbst
   * kostet dann NICHTS (Owner 06.08.2026: „er wird ein produkt auswählen aus dem katalog und
   * bezahlt das und versendet das an jemandem. Die Gutscheingenerierung kostet nichts.").
   */
  lbCta?: string;
  /** Knopf über dem BEISPIEL-Video/-Bild in der Bau-Karte, solange nichts eigenes drin ist
   *  (Owner 02.08.2026 abends: „nicht Inlocuiește poza, sondern Inlocuiește datele"). Sobald
   *  Name, Datum und Ort ein Beispiel zeigen statt einer leeren Formularbeschriftung, sagt
   *  „Foto ersetzen" nur die halbe Wahrheit — der Knopf lädt zum Ausfüllen der GANZEN Karte
   *  ein, nicht nur des Bildes. Nur in der Hochzeit benutzt (EinladungBauen.tsx).*/
  datenErsetzen: string;
  /**
   * „JETZT STARTEN" — der Kaufaufruf auf JEDER Karte (Owner 10.08.2026: „Button wie CI
   * Preis-Jettzt starten"). Davor steht der Preis aus `themenPreisZeile`, nie eine getippte
   * Zahl: `ab 29 € · Jetzt starten`.
   */
  jetztStarten: string;
  next: string; nextPaid: string; pickFirst: string; uploadFirst: string;
  aboWas: string;
  you: string; uploadYou: string; youHint: string; changePhoto: string;
  // Garderobe
  wardrobe: string; paidBadge: string; wardrobeOpen: string; wardrobeLocked: string;
  herDress: string; asInPhoto: string; moreOpen: string; moreClose: string;
  yourClothes: string; myOwnClothes: string; theMoment: string; surpriseMe: string;
  // Adresse vor der Erzeugung
  mailQuestion: string; mailNote: string; mailInvalid: string; oneMoment: string;
  /** Die gut sichtbare Preiszeile unter dem Kaufknopf (Owner 20.08.2026: "$24/month … must
      be clearly visible and not hidden in low-contrast text"). Optional, weil nur die
      Abo-Themen (Kuss/Tanz/Geburtstag/Versprechen/Lebenslauf) sie setzen. */
  aboZeile?: string;
  /* Noch eins, anderer Look - unter dem fertigen Video (Owner 03.08.2026). */
  nochEins: string; nochEinsPreis: string;
  /* Knopf auf jeder Referenzkarte (Owner 03.08.2026). */
  replaceModel: string; replaceGewaehlt: string;
  /* Erstattung unter dem fertigen Video (Owner 03.08.2026: "hier gehoert eigentlich ein
     Refund"). Zwei Tipps wie beim Loeschen: erst rot, dann wirklich. */
  erstatten: string; erstattenSicher: string; erstattet: string;
  /**
   * DIE GELD-ZURÜCK-GARANTIE AM ZAHLUNGSFENSTER (Owner 10.08.2026: „Geld Zurückgarantie
   * habe ich gesagt" — nachdem ich zuerst „Nicht zufrieden? Geld zurück" gesetzt hatte:
   * „Nein, nicht Nicht zufrieden").
   *
   * DER UNTERSCHIED IST DER GANZE PUNKT (Owner, im selben Atemzug: „Leute sind immer nicht
   * zufrieden"). „Nicht zufrieden? Geld zurück" verspricht Geschmack — und Geschmack gibt
   * das Haus nicht zurück: Ein Ergebnis, das jemandem nicht gefällt, ist kein
   * Erstattungsgrund, sonst zahlt jeder Lauf sich selbst zurück. Die Garantie deckt, was
   * WIR schulden: keine Lieferung oder eine grosse Abweichung. Was sie deckt und was nicht,
   * steht in den AGB — deshalb ist dieses Wort ein LINK und keine blosse Zeile.
   */
  geldZurueckGarantie: string;
  /**
   * DER KNOPF ZUM 30-TAGE-PROGRAMM (11.08.2026, Owner: „wo ist der link zum plan?" — bisher
   * nur in der Liefermail). Nur beim Versprechen befuellt; optional, weil kein anderes Thema
   * einen Programm-Link hat. Erscheint im Trichter NUR, wenn der Server eine `programUrl`
   * mitgibt (siehe futureProgramUrl in lib/future-program-store.ts).
   */
  programmKnopf?: string;
  /**
   * DER ZUSTAND DES FILMS IN EINEM SATZ (11.08.2026, am toten Auftrag da11fe51 gefunden:
   * bezahlt, Programm-Datei da, Video gescheitert — und der Käufer sah NICHTS).
   *
   * Die Programm-Karte in der Galerie steht ab der Sekunde des Kaufs, unabhängig vom Video.
   * Damit sie nicht schweigt, wo der Kunde eine Antwort erwartet („wo ist mein Film?"),
   * sagt sie in einem Satz, woran der Film gerade ist. Optional, weil kein anderes Thema
   * eine solche Karte hat.
   */
  filmKommt?: string; filmFertig?: string; filmFehler?: string;
  /** Das Tor VOR dem ersten Upload (Owner 03.08.2026): Titel und Weiter-Knopf. */
  gateTitel: string; gateWeiter: string;
  /** Beschriftung des Land-Feldes neben der Adresse (Owner 31.07.2026). */
  landFrage: string;
  /** Teilen-Dialog (Owner 01.08.2026: „in dem Moment wo er shart muss er wissen dass es public wird"). */
  shareTitel: string; shareText: string; shareOk: string; shareCancel: string;
  /** Überschrift der Szenen-Kacheln (Owner 01.08.2026); Wahl ist freiwillig. */
  szeneTitel: string;
  /**
   * DER ORT DER URLAUBS-EINLADUNG (Owner 04.08.2026: „hier muss doch gleich die Adresse
   * eingeben werden, damit AI weiss was er machen soll").
   *
   * Steht im Foto-Dialog an der Stelle, an der die Hochzeit ihre vier Szenen zeigt. Der
   * Text geht direkt in den Bild- und Video-Auftrag (`holidayInvitePrompt`) — er ist die
   * einzige Angabe, mit der das Modell weiss, WO die beiden stehen sollen.
   */
  ortFrage: string; ortPlatzhalter: string; ortHinweis: string;
  /**
   * DER EINE EINLADUNGSSATZ (Owner 12.08.2026, Zusatzauftrag: „diese einladung ist zu
   * kompliziert. Muss nur ein Textfeld sein Wo der User eingeben kann Komm bitte mit nach
   * Teneriffa am 21. Nov. 2026 … Dieses Eingabefeld habe später auch im Tunel").
   *
   * ERSETZT `ortFrage`/`ortPlatzhalter` IM TUNNEL — ein ganzer Satz mit Anlass, Ziel UND
   * Datum statt eines blossen Ortsnamens. Geht NICHT mehr in den Bild-/Video-Auftrag
   * (siehe `HolidayStartClient.tsx`), sondern reist mit zur späteren Einladung.
   */
  satzFrage?: string; satzPlatzhalter?: string;
  /** Wäsche-Zeile bei Lingerie-Vorlagen (Owner 03.08.2026: „dann ist ein Schritt mehr“). */
  waescheTitel: string;
  /** Nach dem gelieferten Einzelkauf: neuer Anlauf statt 2,99-Nachkauf (Owner 03.08.2026). */
  nochmalVideo: string;
  /** Der Zwei-Stufen-Waehler der Aufladung (Owner 03.08.2026: „biete beide an"). */
  aufladeWahlTitel: string;
  /** Aufladung 9,99 (Owner 01.08.2026, Variante B) — Knopf, Hinweis, Guthaben-Zeile. */
  aufladen: string; aufladenHinweis: string; guthaben: string;
  /**
   * WARUM DER WÄHLER OFFEN IST (Owner 07.08.2026: „wieso bekomme ich keine Meldung, nicht
   * genügend Credit?"). Er öffnete an drei Rückwegen wortlos wieder — der Kunde sah nach
   * einer Zahlung denselben Dialog und keinen Grund. {stand} und {preis} füllt der Trichter
   * zur Laufzeit (eur), das sind Kontostände, keine Preisschilder aus der Tabelle.
   */
  guthabenZuWenig: string;
  /**
   * DIE 0,00-€-ZAHLUNG (Übergabe 07.08. §6a: „mit deinem Gutschein waren es 0,00 €, deshalb
   * kein Guthaben"). Ein 100-%-Code zahlt die Aufladung — gutgeschrieben wird aber nur, was
   * bezahlt wurde (checkout-status). Ohne dieses Wort sieht es wie verschwundenes Geld aus.
   */
  aufladungNull: string;
  /**
   * DIE ZWEI ZAHLEN, BEVOR ER TIPPT (Owner 03.08.2026: „hier muss doch stehen dass das Video
   * 1,49 kostet aber er muss das Konto mit mindestens 9,99 Euro aufladen. Sonst fühlt er
   * sich ausgeraubt").
   *
   * Der Knopf löst bei Kiss zuerst die AUFLADUNG aus, nicht den Videokauf. Wer {once} im Kopf
   * hat und dann {topup} auf der Kassenseite liest, denkt an Betrug — zu Recht. Beide Zahlen
   * gehören VOR den Klick, zusammen mit dem Satz, der die Differenz erklärt: der Rest bleibt
   * ihm.
   */
  guthabenVorabHinweis: string;
  // Knopf und Kleingedrucktes
  ctaFree: string; ctaVideo: string; rendering: string; priceLine: string; paidLine: string; consent: string;
  /**
   * DIE KURZE ZEILE FUER DEN TUNNEL (Owner-Architektur-Abgleich 12.08.2026, §24 „Kurze
   * Privacy-Zeile"): ersetzt `consent` NUR auf den Tunnel-Seiten — der lange Absatz bleibt
   * in den alten Dialog-Trichtern unveraendert stehen. `{agb}` wird wie bei `zustimmung`
   * (siehe dort) durch einen Link auf /terms ersetzt, mit `agbLink` als Beschriftung —
   * keine neue Link-Uebersetzung noetig, dieselbe wie im alten Text.
   */
  consentKurz: string;
  buyOnce: string; buyAbo: string;
  // Fortschritt
  renderSteps: string[]; teaseSteps: string[];
  // Meldungen
  statusQuality: string; statusCouldNotStart: string; statusFailed: string; statusPayCancelled: string;
  statusTimeout: string; statusNetwork: string; statusNotWork: string;
  /** Wenn die Erzeugung ungewoehnlich lang laeuft (Owner 14.08.2026): Seite darf zu,
   *  das fertige Video kommt per E-Mail — der Server liefert es selbst nach. */
  dauertLaenger: string;
  dressingHer: string; gettingReady: string; renderingVideo: string; makingVideo: (s: number) => string;
  /**
   * DER BERUHIGENDE SATZ UNTER DEM BALKEN (Owner 08.08.2026: „dann muss stehen bitte nicht
   * wegklicken … aber ich hoffe das geht"). Es geht: Der Server stempelt die Startquittung
   * selbst in den Auftrag, der Wachhund liefert fertig — hier steht darum das GEGENTEIL
   * einer Warnung. Angezeigt nur, wo dieser Weg gebaut ist (Geburtstag).
   */
  schliessenOk: string;
  videoFailed: string; payPrep: string;
  // Gescheitert
  failTitle: string; failWithMail: (mail: string) => string; failNoMail: string; tryAgain: string;
  // Gratis aufgebraucht
  blockedTitle: string; blockedBody: string; blockedOnce: string; blockedAll: string;
  // Kasse
  payReceived: string; payOpening: string; payMaking: string; payComplete: string;
  readyTitle: string; readyBody: string; watchOnce: string; orAll: string;
  makeVideo: string; makingKiss: string; freeNote: string; secure: string;
  // Ergebnis
  download: string; privateNote: string;
  back: string; examples: string;
  // Die Hochzeitseinladung am fertigen Video (nur in der Hochzeits-Variante sichtbar).
  einlKnopf: string; einlTitel: string; einlSie: string; einlEr: string; einlDatum: string;
  einlAdresse: string; einlTelefon: string; probeHinweis: string;
  einlSprachen: string; einlVorschau: string; kleidTitel: string; beispielLink: string;
  paarTitel: string; paarHint: string; paarFehler: string; paarBusy: string; paarStoerung: string;
  paarSchritt1: string; paarSchritt2: string; fotoWeg: string;
  bekommstTitel: string; bekommst: string[];
  einlOrt: string; einlMachen: string; einlFertig: string; einlWhatsapp: string; einlKopiert: string;
  // Das Versprechen, das in jedem Schritt steht (Owner 30.07.2026).
  privat: string;
  // Das Haekchen vor der Erzeugung: AGB, Datenschutz, Speicherung, Angebote.
  zustimmung: string; zustimmungAufnahme: string; zustimmungFehlt: string; agbLink: string; datenschutzLink: string;
  // Die im Abo enthaltenen Videos dieses Monats sind aufgebraucht.
  videosWeg: string;
  // Abonnent erkannt: wie viele Videos dieser Monat noch hergibt.
  aboAktiv: (rest: number, gesamt: number) => string;
  /**
   * SEIN GELD LIEGT AUF EINER ANDEREN ADRESSE (Owner 03.08.2026: „mein Kontostand zeigt
   * 0 Euro an, aber ich habe Geld drauf").
   *
   * Guthaben haengt an einer E-Mail. Wer als Gast auflaedt und sich danach mit einem anderen
   * Konto anmeldet, sieht 0,00 € — und der naechste Schritt waere eine zweite Aufladung fuer
   * etwas, das schon bezahlt ist. Der Satz nennt Betrag UND Adresse: Ohne die Adresse ist er
   * ein Raetsel, ohne den Betrag ein Verdacht.
   */
  gestrandet: (betrag: string, adresse: string) => string;
  gestrandetCta: string;
  /**
   * DER TIPPFEHLER-VORSCHLAG unter dem Adressfeld (Owner 03.08.2026: „sonst zahlt er mit der
   * falschen Email und ist nie wieder drin falls er sich vertippt").
   *
   * Ein Angebot, keine Absage: Wer wirklich eine seltene Domain hat, tippt einfach weiter.
   */
  mailVorschlag: (vorschlag: string) => string;
  /**
   * DIE KORREKTURMOEGLICHKEIT VOR DER ZAHLUNG (Art. 8 Verbraucherrechte-RL / Art. 11
   * E-Commerce-RL: Eingabefehler muessen VOR der zahlungspflichtigen Bestellung erkennbar und
   * berichtigbar sein). Seit die Kasse mit `customer_email` gesperrt ist, ist das hier die
   * letzte Stelle, an der die Adresse noch zu retten ist.
   */
  zahlungAdresse: string; zahlungAdresseAendern: string; zahlungAdresseSpeichern: string;
  extraTitel: string; extraCta: string; extraNote: string;
  // Die Überschrift der Seite (das Gold-Wort steht getrennt) und der Vorspann von „Your Idol".
  heroA: string; heroY: string; heroB: string;
  /**
   * DIE GRUSSKARTE, IN DREI ZEILEN (Owner 03.08.2026: „ich will das als Kiss Grußkarte machen
   * … dann muss stehen unter dem Titel kurz wie das funktioniert").
   *
   * Wer von einer Anzeige kommt, sieht ein Kussvideo und weiss nicht, was er damit soll. Drei
   * kurze Zeilen beantworten das, bevor er scrollt — und die dritte traegt die Zusage, ohne
   * die niemand ein Foto von sich hochlaedt: Es bleibt privat, bis er selbst teilt.
   */
  wieGehtTitel: string; wieGeht: string[]; wieGehtPrivat: string;
  /**
   * ANLASS UND GRUND — die zwei Bloecke, die der Owner am 05.08.2026 auf der Kiss-Seite
   * vermisst hat: „was mir gefaellt und alle Topic-Seiten sollen so aufgebaut werden ist die
   * Kiss-Seite … also die Anleitung ist das. Aber was noch fehlt ist der Anlass und Grund."
   *
   * SIE STEHEN VOR DER ANLEITUNG, und die Reihenfolge ist die Begruendung:
   *   `anlass` — WOFUER. Die Zeile, in der er sich wiedererkennt („zum Jahrestag", „nach einem
   *              Streit"). Zugleich das, wonach in jeder Sprache wirklich gesucht wird: nicht
   *              nach dem Produkt, sondern nach Empfaenger und Anlass
   *              (KONZEPT-GESCHENKE-UND-IDEEN.md §1, Befund 4).
   *   `grund`  — WARUM. Ein Satz, der sagt, was es ihm bringt. Er steht fett, weil er die
   *              Entscheidung traegt; die Anleitung darunter beantwortet nur noch das Wie.
   *
   * Erst danach kommen die drei Schritte: Wer noch nicht weiss, ob es fuer ihn ist, liest
   * keine Anleitung.
   */
  anlass: string; grund: string;
  /**
   * WAS OBEN AUF DER KARTE STEHT (Owner 05.08.2026: „in der Karte steht jetzt ganz trocken
   * ‚The Kiss'").
   *
   * Er hat recht, und es war ein Versehen mit Ansage: Dort stand `step3` — der SCHRITTNAME
   * aus dem Trichter („3 · Der Kuss"), nur ohne die Nummer. Ein Ablaufschritt als Überschrift
   * einer Grusskarte ist genau so trocken, wie es klingt: Es beschreibt, was man gekauft hat,
   * nicht, was der andere bekommt.
   *
   * Beim Geburtstag steht es seit dem 03.08. richtig — `geburtstagTitel(empfaenger)` macht
   * daraus „Happy birthday to you, Anna". Dasselbe hier.
   *
   * DER WORTLAUT KOMMT VOM OWNER (05.08.2026): „Da soll der Name stehen: Mein Geschenk für
   * dich: Einen Kuss." Damit sagt die Karte in einer Zeile, was sie ist (ein GESCHENK, nicht
   * ein Video), von wem sie kommt und für wen — und der Empfänger liest seinen Namen zuerst.
   */
  karteTitel: (name: string) => string;
  /**
   * WARUM MAN EINEN SCHICKT (Owner 03.08.2026: „unten soll dann stehn warum man das machen
   * sollte. Es zeigt Liebe, es zeigt etwas schönes … du vermisst jemandem, das ist ein
   * Liebesbeweis").
   *
   * Anlaesse, keine Warnungen — der Owner hat das am 03.08. ausdruecklich so entschieden. Ein
   * „bitte nicht" direkt vor dem Kaufknopf bremst genau die Stimmung, aus der heraus jemand
   * einen Kuss verschickt; der Nutzungshinweis weiter unten traegt die Pflichten ohnehin.
   */
  anlaesseTitel: string; anlaesse: string[]; anlaesseSchluss: string;
  /**
   * NUR FÜR DEN GEBURTSTAG (09.08.2026) — der Absatz über dem Trichter und die Zeile unter
   * dem Beispielvideo. Beide stammen aus dem Verkaufstext, den der Owner vorgegeben hat:
   * „Aus ein paar gesprochenen Worten wird ein Moment" und „Stell dir vor, diese Person
   * wärst du." Optional, weil die anderen Themen sie nicht haben.
   */
  filmTitel?: string; filmText?: string; unterVideo?: string;
  /** Der Knopf beim Empfaenger: einen Kuss zurueckschicken (zahlt normal, Owner 03.08.2026). */
  kussZurueck: string;
  /**
   * AN WEN GEHT DER KUSS? (Owner 03.08.2026: „schreib auch den Namen an wem du es senden
   * willst, da rein … dann erscheint in den Texten Anna, I love you, I miss you so much …
   * also es ist personalisiert dann").
   *
   * Der Name ist FREIWILLIG und bleibt es: Ohne ihn steigen dieselben Saetze ohne Anrede auf.
   * Eine Pflichtangabe waere hier die teuerste Art, jemanden zu verlieren — sie stuende
   * zwischen ihm und dem einzigen Schritt, auf den es ankommt, dem Hochladen.
   */
  namenFrage: string; namenPlatzhalter: string;
  /**
   * DER TUNNEL-START, SCHRITT 1 VON ZWEI (KONZEPT-TUNNEL.md, Owner 12.08.2026 — „Stepp 1.
   * Name, Email … Genauso müssen alle tunels aussehen"). Optional, weil bisher nur das
   * Versprechen den zweistufigen Tunnel benutzt (`components/CI.tsx`, `TunnelStart`); die
   * anderen Geschenke behalten ihre gewachsenen Schritte, bis sie an der Reihe sind
   * (KONZEPT-TUNNEL.md §„Feste Regeln", Punkt 5).
   */
  tunnelStartTitel?: string; tunnelName?: string; tunnelEmail?: string; tunnelWeiter?: string;
  /**
   * DER TEXT-FOLGEAUFTRAG DES VERSPRECHENS (Owner 12.08.2026: „die texte für verprechen
   * hast du aber nicht wie vom chat gpt verändert" — ChatGPT-Papier §22–26). Alle optional
   * und BASISWEISE ungesetzt: NUR das VERSPRECHEN-Overlay in dieser Datei füllt sie, jedes
   * andere Produkt reicht `undefined` an dieselben Bausteine (`TunnelStart`, den Tunnel-
   * Schritt 2, das Aufnahme-Vollbild) und sieht exakt wie vorher aus — „Component bleibt
   * gleich, Inhalt ändert sich".
   */
  /** Schritt 1: Erklärzeile unter dem Titel / Kleintext unter „Weiter" (neue `TunnelStart`-Props). */
  tunnelIntro?: string; tunnelKleinText?: string;
  /** Schritt 2 (Look-Wahl): eigener Titel/Unterzeile + eigener Weiter-Knopf, getrennt von
   *  `tunnelWeiter` (der bleibt Schritt 1 vorbehalten — siehe Kommentar an der Einsatzstelle
   *  in KissFunnel.tsx, warum ein gemeinsamer Schlüssel hier falsch läge). */
  zukunftTitel?: string; zukunftUnterzeile?: string; tunnelWeiterAuswahl?: string;
  /** Schritt 3 (Aufnahme-Vollbild): Titel/Text/Beispielzeile über dem Aufnahme-Knopf, der
   *  Knopf selbst, und die Bildunterschrift der fertigen Aufnahme. */
  aufTitel3?: string; aufHinweis3?: string; aufBeispiel?: string; aufCta?: string; aufFertig?: string;
  /** §22 Screen 4 (Owner-Master-Auftrag 13.08.2026): die Gegenüberstellung vor dem Kauf —
      nur das Versprechen füllt sie. */
  heuteLabel?: string; zukunftLabel?: string; verbindenText?: string;
  /** Ergebnis: Titel + Text über dem Herunterladen-Knopf, sobald das Video fertig ist. */
  ergebnisTitel?: string; ergebnisText?: string;
  /**
   * DIE GOOGLE-ABKÜRZUNG IM TUNNEL-START (Owner 12.08.2026: „auch googgle anmeldung kannst
   * du einbauen"). Im BASISTEXT, nicht nur im Versprechen-Overlay — der Tunnel rollt auf
   * alle Produkte aus (KONZEPT-TUNNEL.md), dieselbe Beschriftung soll ueberall stehen.
   */
  tunnelOder?: string; tunnelGoogle?: string;
  /**
   * DIE VORLAGEN-KACHEL OEFFNET DAS ECHTE VIDEO (Owner 12.08.2026, wörtlich: „wenn user ein
   * Video generiert dann muss er die Vorlage genau als Video sehen. Also es soll sich mit
   * klick die Vorlage öffnen. Vestanden? Das gilt für den ganzen Tunel."). Vorlesetext fürs
   * Antippen der Ziel-Kachel — `components/CI.tsx`, `VorlagenKachel`.
   */
  vorlageAnsehen?: string;
  /**
   * EIN SATZ UNTER DER UEBERSCHRIFT (Owner 31.07.2026: „unter dem titel muss doch ein kurzer
   * satz zu der Einladungs seite").
   *
   * Bewusst nur bei der Hochzeit gefuellt: Beim Kuss hat der Owner den Vorspann selbst
   * streichen lassen, weil er auf dem Handy eine halbe Bildschirmhoehe vor dem ersten Schritt
   * kostete. Hier ist er noetig, weil die Ueberschrift „Einladung" sagt und der erste Schritt
   * nach zwei Fotos fragt — dazwischen fehlt sonst die Erklaerung.
   */
  heroLead: string;
  leadA: string; leadB: string; fine: string;
  /**
   * DAS FUTURE SELF PROGRAM (Owner 11.08.2026): aus dem einen Video wird ein 30-Tage-Programm.
   * Alle folgenden Felder sind optional und nur beim Versprechen befüllt — kein anderes Thema
   * verkauft ein Programm, nur ein Video.
   */
  heroSub?: string[];
  unterVideoZeilen?: string[];
  mehrTitel?: string;
  mehrText?: string[];
  wasBekommstTitel?: string;
  wasBekommstTitelListe?: string[];
  wasBekommstTextListe?: string[];
  emoTitel?: string;
  emoText?: string[];
  emoMarkensatz?: string[];
  howTitel?: string;
  howTitelListe?: string[];
  howTextListe?: string[];
  finalTitel?: string[];
  finalIncludes?: string[];
  finalSub?: string;
  /**
   * DIE PREISZEILE IM FINALEN KAUFBLOCK (11.08.2026, nach der Preissenkung). Solange das
   * Programm teuer war, war der Preis eine Hürde, die man wegliess; seit der Senkung ist er
   * ein Grund zuzugreifen und darf als SATZ dastehen statt als nackte Zahl.
   *
   * Sie ersetzt die grosse Zahl im finalen Block — der Betrag steht damit weiterhin genau
   * zweimal auf der Seite (Kaufknopf der Videokarte + hier), wie die Owner-Regel vom
   * 11.08.2026 es verlangt: „Einmal im Hero bzw. CTA und einmal beim finalen Kaufblock."
   *
   * Der Betrag kommt IMMER aus {programm} (fillPrices → VERSPRECHEN_CENTS), nie als getippte
   * Zahl — Memory `prices-only-from-pricing-table`. Nur beim Versprechen befüllt.
   */
  finalPreisZeile?: string;
  /**
   * ERINNERUNGSZEILE VOR DER AUFNAHME (11.08.2026, Folgeänderung zum Ziele-Schritt): Er
   * wählt seine Ziele VOR der Kamera, sieht sie im Aufnahme-Kasten aber nicht mehr — diese
   * Zeile steht über den kleinen Gold-Chips, die seine Wahl wiederholen. Nur beim
   * Versprechen befüllt.
   */
  sprichDarueber?: string;
  /**
   * DIE 30-DAY PROMISE GUARANTEE DES FUTURE SELF PROGRAM (Owner 11.08.2026, wörtlich: „30-DAY
   * PROMISE GUARANTEE. Complete the first 7 days. If you still feel the Future Self Program
   * isn't for you, tell us within 30 days and we'll refund your purchase.").
   *
   * EIGENSTÄNDIG NEBEN `geldZurueckGarantie`: Die Haus-Garantie deckt nur Nicht-Lieferung aus
   * unserer Schuld + grosse Abweichung — NIE „nicht zufrieden" (Owner: „Leute sind immer nicht
   * zufrieden"). Diese hier ist eine ZUSÄTZLICHE, produktspezifische Zusage, die „nicht
   * zufrieden" ausdrücklich erlaubt — aber erst NACHDEM er die ersten 7 Programmtage wirklich
   * abgehakt hat. Die Hürde ist PRÜFBAR: die Häkchen der Tage 1–7 liegen serverseitig in
   * `try-this-look/future-program/<genId>.json` (`checks["1"]…checks["7"]`); ohne sie hat er
   * das Programm nie benutzt, und die Zusage würde jeden Kauf sich selbst zurückzahlen lassen.
   * Nur beim Versprechen befüllt — kein anderes Thema verkauft ein Programm.
   */
  garantieTitel?: string;
  garantieText?: string;
};

const EN: KissText = {
  step1: "1 · Pick her", step2: "2 · Your photo — you, the man", step3: "3 · The kiss", step4: "4 · Your picture",
  /* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch bei allen heissen Generate now - Preis."). */
  generateNow: "Generate now",
  /* SCHRITT 1 DES TUNNELS — BASIS fuer ALLE Produkte (Owner 12.08.2026: „keine Ausnahme"; vorher nur im VERSPRECHEN-Overlay, alle anderen fielen auf Alt-Texte wie „Continuă — gratuit" zurueck). */
  tunnelStartTitel: "Let’s get started",
  tunnelName: "Your name",
  tunnelEmail: "Your email",
  tunnelWeiter: "Next",
  pickHint: "Upload the woman you want to kiss — or swipe to one of ours.",
  datenErsetzen: "Change photo",
  jetztStarten: "Start now",
  namenVorSenden: "Tap your names above to send it",
  upTitle: "Person 1", upHint: "Kiss any superstar — just upload a screenshot.",
  tapChange: "Tap to change photo",
  next: "Next — free →", nextPaid: "Next →", pickFirst: "Pick her first", uploadFirst: "Upload your photo",
  aboWas: "{videos} videos a month across every topic · every further one {extra} · chatting free · cancel any time",
  you: "Person 2", uploadYou: "Upload your photo", youHint: "A photo of you — the man in the picture",
  changePhoto: "Change photo",
  wardrobe: "Wardrobe & scene", paidBadge: "Paid videos",
  wardrobeOpen: "Dress her, keep your own clothes or change them, pick the moment.",
  wardrobeLocked: "Unlocked with a paid video — dress her, pick the moment.",
  herDress: "Her dress", asInPhoto: "As in the photo",
  moreOpen: "+ Your clothes & the moment", moreClose: "− Less",
  yourClothes: "Your clothes", myOwnClothes: "My own clothes", theMoment: "The moment", surpriseMe: "✨ Surprise me",
  mailQuestion: "Where should we send your picture?",
  /* SCHRITT 1 DES EINEN TUNNELS, IM BASISTEXT (Owner 12.08.2026: „auch googgle anmeldung
     kannst du einbauen" — im Tunnel, der auf alle Produkte ausgerollt wird, daher hier statt
     nur im Versprechen-Overlay). Dieselbe Wortwahl wie im Konto-Fenster (lib/konto-chip-i18n). */
  tunnelOder: "or", tunnelGoogle: "Continue with Google",
  vorlageAnsehen: "Watch the example video",
  gateTitel: "First, your email — so we can send you the result.", gateWeiter: "Continue",
  mailNote: "Free. We send you the picture and keep it in your gallery.",
  landFrage: "Your country",
  shareTitel: "Sharing makes it public", shareText: "Anyone with the link can see your card. Only the finished result is shown — never the photos you uploaded.", shareOk: "Got it — share", shareCancel: "Cancel",
  szeneTitel: "Pick a scene — or let us surprise you",
  ortFrage: "Where are you going?", ortPlatzhalter: "Tenerife", ortHinweis: "The place goes into the video — write it the way you would tell them.",
  satzFrage: "Write your invitation", satzPlatzhalter: "Come with me to Tenerife on 21 Nov 2026 …",
  waescheTitel: "Pick her lingerie — or keep the one from the video",
  nochmalVideo: "Generate another video",
  aufladeWahlTitel: "How much would you like to top up?",
  guthabenVorabHinweis: "One video costs {once}. You pay from your account balance — the smallest top-up is {topup}, and whatever is left stays yours for more videos.",
  aufladen: "Top up account — {topup}", aufladenHinweis: "Credit never expires · no cash payout", guthaben: "Balance",
  guthabenZuWenig: "Your balance is {stand} — this product costs {preis}.",
  aufladungNull: "Your last payment came to €0.00 (promo code) — so nothing was added to your balance.",
  mailInvalid: "Please enter a valid email address.", oneMoment: "One moment …", nochEins: "Another one, another look", replaceModel: "Replace model", replaceGewaehlt: "Chosen", erstatten: "Not happy? Get your money back", geldZurueckGarantie: "Money-back guarantee", erstattenSicher: "Tap again — money back", erstattet: "Refunded to your balance", nochEinsPreis: "Tap an outfit - {tanz} from your balance, straight away.",
  ctaFree: "Generate picture — free", ctaVideo: "Generate video", rendering: "Rendering …",
  priceLine: "Picture free · Video {once}", paidLine: "✓ Paid — everything below is included",
  consent: "By generating you confirm you may use these photos, everyone shown is an adult, you keep it private — and you take full responsibility for it. Nudity photos are not accepted. Uploading someone else's photo without their consent is not legal — that responsibility is yours.",
  consentKurz: "🔒 Private · just for you · generating confirms the {agb}",
  buyOnce: "Hot video {once}", buyAbo: "All in — {price}/mo",
  renderSteps: [
    "Analyzing your photo …", "Matching the two of you …", "Rendering the kiss …",
    "Getting the light right …", "Almost there …", "Finishing touches …",
    "Any second now …", "Still working — hang on …",
  ],
  teaseSteps: ["Reading both faces …", "Matching the two of you …", "Bringing the moment to life …"],
  statusQuality: "Rendering your kiss in full quality … (max. 10 min)",
  statusCouldNotStart: "Could not start.", statusFailed: "Generation failed.",
  statusPayCancelled: "Payment window closed without paying — tap the button to try again.",
  statusTimeout: "Timeout — please try again later.",
  dauertLaenger: "This is taking longer than usual. You can close this page — we'll email you the finished video.", statusNetwork: "Network error.",
  statusNotWork: "That did not work.",
  dressingHer: "Dressing her …", gettingReady: "Getting you ready …",
  renderingVideo: "Rendering your video … (max. 10 min)", schliessenOk: "You can close this page — your video will be waiting in your gallery.", makingVideo: s => `Making your video … (${s} s)`,
  videoFailed: "The video failed.", payPrep: "Payment received — preparing your video …",
  failTitle: "That did not come through",
  failWithMail: m => `We send it to ${m} as soon as it is ready.`,
  failNoMail: "Please try again with another photo.", tryAgain: "Try again",
  blockedTitle: "Your free picture is used up",
  blockedBody: "Three free pictures per person. Keep going with the video — or unlock everything.",
  blockedOnce: "Make a real kiss video — {once}", blockedAll: "Unlock everything — {price}/month",
  payReceived: "Payment received ✓", payOpening: "Opening secure checkout …",
  payMaking: "Making your video — this takes about a minute. Stay on this page.",
  payComplete: "Complete the payment in the window that just opened.",
  readyTitle: "Your video is ready 🔥", readyBody: "Unlock it and watch the two of you.",
  watchOnce: "Watch my kiss video — {once}", orAll: "Or unlock everything — {price}/month",
  makeVideo: "Make the real kiss video — {once} 🔥", makingKiss: "Making your kiss video …",
  freeNote: "The picture is yours for free. {once} buys the video, no subscription. ",
  secure: "Secure checkout by Stripe",
  download: "⬇ Download your video",
  privateNote: "🔒 This video is private — for you only. Please don't share it on social media.",
  back: "← Back", examples: "Real kiss videos 💋",
  einlKnopf: "💌 Send it as your invitation", einlTitel: "Your wedding invitation",
  einlAdresse: "Street, no., postcode, town",
  einlTelefon: "Your WhatsApp number — for guests' questions",
  probeHinweis: "Online for one week — send it to your guests. The guest list, menu and group chat come with the subscription, which also keeps the page running.",
  einlSprachen: "Each guest sees it in their own language — automatically.",
  einlVorschau: "This is what your guests see",
  kleidTitel: "Pick your dress (optional)",
  beispielLink: "Open a real invitation",
  paarTitel: "Or one photo of the two of you",
  paarHint: "Use it twice: first your face, then his.",
  paarFehler: "We could not find two faces in that photo — try another one, or upload the two photos separately.",
  paarBusy: "Reading the photo …",
  paarStoerung: "That did not work on our side just now — please try again in a moment.",
  paarSchritt1: "1 of 2 — crop YOUR face",
  paarSchritt2: "2 of 2 — now HIS face",
  fotoWeg: "Remove photo",
  bekommstTitel: "What you get",
  bekommst: [
    "Your own invitation page with your names, the date and the address",
    "The video with the two of you in it, with music — swap it up to 5 times, guests always see the newest",
    "One link for WhatsApp — no app and no sign-up for your guests",
    "Guests sign up with one tap; you get an email the moment someone answers",
    "Post news and every guest gets an email with the link — time or venue changed, everyone knows",
    "A group chat for your guests, right on the invitation",
    "Every guest reads it in their own language, by itself",
  ],
  einlSie: "Her first name", einlEr: "His first name", einlDatum: "Date (optional)",
  einlOrt: "Place (optional)", einlMachen: "Create invitation", einlFertig: "Your invitation is ready",
  einlWhatsapp: "Send the invitation", einlKopiert: "Link copied",
  privat: "🔒 Private: your photos always stay private. Your result is only published if you share it yourself.",
  zustimmung: "By uploading a photo and tapping Next you accept the {agb} and the {privacy}, and news & offers by email.",
  /* Wo es keinen Foto-Upload gibt (Geburtstag seit 07.08.2026), waere die Zusage zum
     HOCHLADEN eines Fotos schlicht falsch — dieselbe Zusage, richtig benannt. */
  zustimmungAufnahme: "By recording yourself and tapping Next you accept the {agb} and the {privacy}, and news & offers by email.",
  zustimmungFehlt: "Please accept the terms first.", agbLink: "terms", datenschutzLink: "privacy policy",
  videosWeg: "Your {videos} videos for this month are used up.",
  aboAktiv: (r, g) => `Subscription active · ${r} of ${g} videos left this month`,
  gestrandet: (b, a) => `You have ${b} — but on ${a}, not on the account you are signed in with right now.`,
  gestrandetCta: "Switch to that address",
  mailVorschlag: (v) => `Did you mean ${v}?`,
  zahlungAdresse: "Your video and your balance run on this address:",
  zahlungAdresseAendern: "Change", zahlungAdresseSpeichern: "Save",
  extraTitel: "Your videos for this month are used up",
  extraCta: "One more video — {extra}", extraNote: "One video, no new subscription. Your subscription keeps running.",
  heroA: "Send a kiss to ", heroY: "the one you love", heroB: " 💋",
  wieGehtTitel: "How it works",
  karteTitel: (n: string) => (n ? `My gift for ${n}: a kiss` : "My gift for you: a kiss"),
  anlass: "For your anniversary · for a birthday · for Valentine’s · when you haven’t seen each other in a while · after a fight · just because",
  grund: "A message gets read and forgotten. A video of the two of you kissing, they keep.",
  wieGeht: ["Upload a photo of you and one of them.", "We turn the two of you into one kiss video.", "Send it — to them alone."],
  wieGehtPrivat: "Nobody else sees it. Your card stays private unless you share it yourself.",
  anlaesseTitel: "Why send one",
  anlaesse: ["You miss them, and a text message does not say it.", "You see each other far too rarely.", "Something needs saying that you cannot type.", "There is nothing to celebrate — that is exactly the point."],
  anlaesseSchluss: "A kiss you had made is not a message. It is proof.",
  kussZurueck: "Send a kiss back 💋",
  namenFrage: "Her or his name — it appears in the card (optional)", namenPlatzhalter: "Anna",
  heroLead: "",
  leadA: "Take any person you admire — a superstar, a singer, an actress, an athlete, an influencer, or one of our models. One screenshot of her or him is enough.",
  leadB: "Add a photo of yourself and the AI puts the two of you together at a party, side by side. Your two faces, one video that looks like it really happened.",
  fine: "AI-generated, not a real recording — and it's for you, not for social media.",
};

const DE: KissText = {
  step1: "1 · Wähle sie", step2: "2 · Dein Foto — du, der Mann", step3: "3 · Der Kuss", step4: "4 · Dein Bild",
  /* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch bei allen heissen Generate now - Preis."). */
  generateNow: "Jetzt generieren",
  /* SCHRITT 1 DES TUNNELS — BASIS fuer ALLE Produkte (Owner 12.08.2026: „keine Ausnahme"; vorher nur im VERSPRECHEN-Overlay, alle anderen fielen auf Alt-Texte wie „Continuă — gratuit" zurueck). */
  tunnelStartTitel: "Legen wir los",
  tunnelName: "Dein Name",
  tunnelEmail: "Deine E-Mail",
  tunnelWeiter: "Weiter",
  pickHint: "Lade die Frau hoch, die du küssen willst — oder wische zu einer von uns.",
  datenErsetzen: "Foto wechseln",
  jetztStarten: "Jetzt starten",
  namenVorSenden: "Tippt oben auf eure Namen, um zu verschicken",
  upTitle: "Person 1", upHint: "Küsse jeden Star — lade einfach ein Bildschirmfoto hoch.",
  tapChange: "Tippen, um das Foto zu wechseln",
  next: "Weiter — gratis →", nextPaid: "Weiter →", pickFirst: "Wähle zuerst sie", uploadFirst: "Lade dein Foto hoch",
  aboWas: "{videos} Videos im Monat über alle Themen · jedes weitere {extra} · Chatten gratis · monatlich kündbar",
  you: "Person 2", uploadYou: "Lade dein Foto hoch", youHint: "Ein Foto von dir — der Mann im Bild",
  changePhoto: "Foto wechseln",
  wardrobe: "Garderobe & Szene", paidBadge: "Bezahlte Videos",
  wardrobeOpen: "Zieh sie an, behalte deine Sachen oder wechsle sie, wähle den Moment.",
  wardrobeLocked: "Wird mit einem bezahlten Video frei — zieh sie an, wähle den Moment.",
  herDress: "Ihr Kleid", asInPhoto: "Wie auf dem Foto",
  moreOpen: "+ Deine Sachen & der Moment", moreClose: "− Weniger",
  yourClothes: "Deine Sachen", myOwnClothes: "Meine eigenen Sachen", theMoment: "Der Moment", surpriseMe: "✨ Überrasch mich",
  mailQuestion: "Wohin sollen wir dein Bild schicken?",
  tunnelOder: "oder", tunnelGoogle: "Weiter mit Google",
  vorlageAnsehen: "Beispielvideo ansehen",
  gateTitel: "Erst deine E-Mail — damit wir dir das Ergebnis schicken können.", gateWeiter: "Weiter",
  mailNote: "Kostenlos. Wir schicken dir das Bild und heben es in deiner Galerie auf.",
  landFrage: "Dein Land",
  shareTitel: "Teilen macht es öffentlich", shareText: "Jeder mit dem Link kann deine Karte sehen. Gezeigt wird nur das fertige Ergebnis — niemals deine hochgeladenen Fotos.", shareOk: "Verstanden — teilen", shareCancel: "Abbrechen",
  szeneTitel: "Such dir eine Szene aus — oder lass dich überraschen",
  ortFrage: "Wohin geht es?", ortPlatzhalter: "Teneriffa", ortHinweis: "Der Ort kommt ins Video — schreib ihn so, wie du es ihr oder ihm sagen würdest.",
  satzFrage: "Schreib deine Einladung", satzPlatzhalter: "Komm bitte mit nach Teneriffa am 21. Nov. 2026 …",
  waescheTitel: "Such ihre Wäsche aus — oder lass die aus dem Video",
  nochmalVideo: "Noch ein Video generieren",
  aufladeWahlTitel: "Wie viel möchtest du aufladen?",
  guthabenVorabHinweis: "Ein Video kostet {once}. Bezahlt wird aus deinem Guthaben — die kleinste Aufladung ist {topup}, der Rest bleibt dir für weitere Videos.",
  aufladen: "Konto aufladen — {topup}", aufladenHinweis: "Guthaben verfällt nie · keine Barauszahlung", guthaben: "Guthaben",
  guthabenZuWenig: "Dein Guthaben ist {stand} — dieses Produkt kostet {preis}.",
  aufladungNull: "Deine letzte Zahlung betrug 0,00 € (Aktionscode) — deshalb wurde kein Guthaben gutgeschrieben.",
  mailInvalid: "Bitte gib eine gültige E-Mail-Adresse an.", oneMoment: "Einen Moment …", nochEins: "Noch eins, anderer Look", replaceModel: "Model ersetzen", replaceGewaehlt: "Gewählt", erstatten: "Nicht zufrieden? Geld zurück", geldZurueckGarantie: "Geld-zurück-Garantie", erstattenSicher: "Nochmal tippen — Geld zurück", erstattet: "Auf dein Guthaben erstattet", nochEinsPreis: "Tipp ein Outfit an - {tanz} vom Guthaben, sofort.",
  ctaFree: "Bild erzeugen — gratis", ctaVideo: "Video erzeugen", rendering: "Wird erzeugt …",
  priceLine: "Bild gratis · Video {once}", paidLine: "✓ Bezahlt — alles hier drunter ist dabei",
  consent: "Mit dem Erzeugen bestätigst du: Du darfst diese Fotos verwenden, alle Abgebildeten sind erwachsen, du behältst es privat — und du trägst die Verantwortung dafür. Nacktbilder werden nicht akzeptiert. Ein Foto einer anderen Person ohne deren Zustimmung hochzuladen ist nicht legal — dafür trägst du selbst die Verantwortung.",
  consentKurz: "🔒 Privat · nur für dich · mit dem Erzeugen bestätigst du die {agb}",
  buyOnce: "Heißes Video {once}", buyAbo: "Alles drin — {price}/Monat",
  renderSteps: [
    "Dein Foto wird gelesen …", "Ihr beide werdet zusammengeführt …", "Der Kuss entsteht …",
    "Das Licht wird gesetzt …", "Fast fertig …", "Letzter Schliff …",
    "Jeden Moment …", "Läuft noch — bleib dran …",
  ],
  teaseSteps: ["Beide Gesichter werden gelesen …", "Ihr beide werdet zusammengeführt …", "Der Moment wird lebendig …"],
  statusQuality: "Dein Kuss wird in voller Qualität erzeugt … (max. 10 Min.)",
  statusCouldNotStart: "Start nicht möglich.", statusFailed: "Erzeugung fehlgeschlagen.",
  statusPayCancelled: "Zahlungsfenster wurde ohne Zahlung geschlossen — tippe den Knopf erneut an.",
  statusTimeout: "Zeitüberschreitung — bitte später noch einmal versuchen.",
  dauertLaenger: "Das dauert gerade länger als gewöhnlich. Du kannst die Seite schließen — wir schicken dir das fertige Video per E-Mail.", statusNetwork: "Netzwerkfehler.",
  statusNotWork: "Das hat nicht geklappt.",
  dressingHer: "Sie wird angezogen …", gettingReady: "Du wirst fertig gemacht …",
  renderingVideo: "Dein Video wird erzeugt … (max. 10 Min.)", schliessenOk: "Du kannst die Seite schliessen — dein Video wartet danach in deiner Galerie.", makingVideo: s => `Dein Video entsteht … (${s} s)`,
  videoFailed: "Das Video ist fehlgeschlagen.", payPrep: "Zahlung erhalten — dein Video wird vorbereitet …",
  failTitle: "Das ist nicht durchgekommen",
  failWithMail: m => `Wir schicken es an ${m}, sobald es fertig ist.`,
  failNoMail: "Bitte versuch es mit einem anderen Foto.", tryAgain: "Noch einmal versuchen",
  blockedTitle: "Dein Gratis-Bild ist aufgebraucht",
  blockedBody: "Drei Gratis-Bilder pro Person. Mach mit dem Video weiter — oder schalte alles frei.",
  blockedOnce: "Echtes Kuss-Video machen — {once}", blockedAll: "Alles freischalten — {price}/Monat",
  payReceived: "Zahlung erhalten ✓", payOpening: "Sichere Kasse wird geöffnet …",
  payMaking: "Dein Video entsteht — das dauert etwa eine Minute. Bleib auf dieser Seite.",
  payComplete: "Schließe die Zahlung im Fenster ab, das sich gerade geöffnet hat.",
  readyTitle: "Dein Video ist fertig 🔥", readyBody: "Schalte es frei und sieh euch beide.",
  watchOnce: "Mein Kuss-Video ansehen — {once}", orAll: "Oder alles freischalten — {price}/Monat",
  makeVideo: "Echtes Kuss-Video machen — {once} 🔥", makingKiss: "Dein Kuss-Video entsteht …",
  freeNote: "Das Bild gehört dir gratis. {once} kostet das Video, kein Abo. ",
  secure: "Sichere Zahlung über Stripe",
  download: "⬇ Dein Video herunterladen",
  privateNote: "🔒 Dieses Video ist privat — nur für dich. Bitte teile es nicht in sozialen Medien.",
  back: "← Zurück", examples: "Echte Kuss-Videos 💋",
  einlKnopf: "💌 Als Einladung verschicken", einlTitel: "Eure Hochzeitseinladung",
  einlAdresse: "Straße, Nr., PLZ, Ort",
  einlTelefon: "Eure WhatsApp-Nummer — für Zusagen",
  probeHinweis: "Eine Woche online — verschickt sie an eure Gäste. Zusagen, Menü und Gruppenchat kommen mit dem Abo; es hält auch die Seite am Laufen.",
  einlSprachen: "Jeder Gast sieht sie in seiner Sprache — von selbst.",
  einlVorschau: "So sehen es eure Gäste",
  kleidTitel: "Wähle dein Kleid (freiwillig)",
  beispielLink: "Echte Einladung ansehen",
  paarTitel: "Oder ein Foto von euch beiden",
  paarHint: "Zweimal benutzt: erst dein Gesicht, dann seins.",
  paarFehler: "Auf dem Foto waren keine zwei Gesichter zu finden — nimm ein anderes, oder lade die zwei Fotos einzeln hoch.",
  paarBusy: "Foto wird gelesen …",
  paarStoerung: "Das hat gerade bei uns nicht geklappt — bitte gleich noch einmal versuchen.",
  paarSchritt1: "1 von 2 — schneide DEIN Gesicht zu",
  paarSchritt2: "2 von 2 — jetzt SEIN Gesicht",
  fotoWeg: "Foto entfernen",
  bekommstTitel: "Das bekommt ihr",
  bekommst: [
    "Eine eigene Einladungsseite mit euren Namen, dem Datum und der Adresse",
    "Das Video mit euch beiden, mit Musik — bis zu 5-mal austauschbar, die Gäste sehen immer das neueste",
    "Einen Link für WhatsApp — ohne App und ohne Anmeldung für eure Gäste",
    "Gäste sagen mit einem Tipp zu; ihr bekommt sofort eine E-Mail, wenn jemand antwortet",
    "Ihr schreibt Neuigkeiten, jeder Gast bekommt eine E-Mail mit dem Link — Uhrzeit oder Ort geändert, alle wissen es",
    "Einen Gruppenchat für eure Gäste, direkt auf der Einladung",
    "Jeder Gast liest sie von selbst in seiner Sprache",
  ],
  einlSie: "Ihr Vorname", einlEr: "Sein Vorname", einlDatum: "Datum (optional)",
  einlOrt: "Ort (optional)", einlMachen: "Einladung erstellen", einlFertig: "Eure Einladung ist fertig",
  einlWhatsapp: "Einladung verschicken", einlKopiert: "Link kopiert",
  privat: "🔒 Privat: deine Fotos bleiben immer privat. Dein Ergebnis wird nur öffentlich, wenn du es selbst teilst.",
  zustimmung: "Mit dem Hochladen eines Fotos und mit „Weiter“ akzeptierst du die {agb} und die {privacy}, und News und Angebote per E-Mail.",
  /* Wo es keinen Foto-Upload gibt (Geburtstag seit 07.08.2026), waere die Zusage zum
     HOCHLADEN eines Fotos schlicht falsch — dieselbe Zusage, richtig benannt. */
  zustimmungAufnahme: "Mit deiner Aufnahme und mit „Weiter“ akzeptierst du die {agb} und die {privacy}, und News und Angebote per E-Mail.",
  zustimmungFehlt: "Bitte stimme zuerst zu.", agbLink: "AGB", datenschutzLink: "Datenschutzerklärung",
  videosWeg: "Deine {videos} Videos für diesen Monat sind aufgebraucht.",
  aboAktiv: (r, g) => `Abo aktiv · noch ${r} von ${g} Videos diesen Monat`,
  gestrandet: (b, a) => `Du hast ${b} — aber auf ${a}, nicht auf dem Konto, mit dem du gerade angemeldet bist.`,
  gestrandetCta: "Zu dieser Adresse wechseln",
  mailVorschlag: (v) => `Meintest du ${v}?`,
  zahlungAdresse: "Dein Video und dein Guthaben laufen auf dieser Adresse:",
  zahlungAdresseAendern: "Ändern", zahlungAdresseSpeichern: "Speichern",
  extraTitel: "Deine Videos für diesen Monat sind aufgebraucht",
  extraCta: "Noch ein Video — {extra}", extraNote: "Ein Video, kein neues Abo. Dein Abo läuft normal weiter.",
  heroA: "Schick einen Kuss an ", heroY: "den Menschen, den du liebst", heroB: " 💋",
  wieGehtTitel: "So geht es",
  karteTitel: (n: string) => (n ? `Mein Geschenk für ${n}: einen Kuss` : "Mein Geschenk für dich: einen Kuss"),
  anlass: "Zum Jahrestag · zum Geburtstag · zum Valentinstag · wenn ihr euch lange nicht gesehen habt · nach einem Streit · einfach so",
  grund: "Eine Nachricht wird gelesen und vergessen. Ein Video, in dem ihr beide küsst, behält sie.",
  wieGeht: ["Lade ein Foto von dir hoch und eins von ihr oder ihm.", "Wir machen aus euch beiden ein Kussvideo.", "Verschick es — nur an diesen einen Menschen."],
  wieGehtPrivat: "Niemand sonst sieht es. Deine Karte bleibt privat, solange du sie nicht selbst teilst.",
  anlaesseTitel: "Warum man einen schickt",
  anlaesse: ["Du vermisst jemanden, und eine Nachricht sagt es nicht.", "Ihr seht euch viel zu selten.", "Es ist etwas zu sagen, das man nicht tippen kann.", "Es gibt nichts zu feiern — genau darum geht es."],
  anlaesseSchluss: "Ein Kuss, den du machen lässt, ist keine Nachricht. Er ist ein Liebesbeweis.",
  kussZurueck: "Kuss zurückschicken 💋",
  namenFrage: "Ihr oder sein Name — er erscheint in der Karte (freiwillig)", namenPlatzhalter: "Anna",
  heroLead: "",
  leadA: "Nimm jeden Menschen, den du bewunderst — einen Superstar, eine Sängerin, eine Schauspielerin, eine Sportlerin, eine Influencerin oder eine unserer Frauen. Ein einziges Bildschirmfoto genügt.",
  leadB: "Leg ein Foto von dir dazu, und die KI stellt euch beide nebeneinander auf eine Party. Eure zwei Gesichter, ein Video, das aussieht, als wäre es wirklich passiert.",
  fine: "Von KI erzeugt, keine echte Aufnahme — und für dich gedacht, nicht für soziale Medien.",
};

const RO: KissText = {
  step1: "1 · Alege-o", step2: "2 · Poza ta — tu, bărbatul", step3: "3 · Sărutul", step4: "4 · Poza ta",
  /* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch bei allen heissen Generate now - Preis."). */
  generateNow: "Generează acum",
  /* SCHRITT 1 DES TUNNELS — BASIS fuer ALLE Produkte (Owner 12.08.2026: „keine Ausnahme"; vorher nur im VERSPRECHEN-Overlay, alle anderen fielen auf Alt-Texte wie „Continuă — gratuit" zurueck). */
  tunnelStartTitel: "Să începem",
  tunnelName: "Numele tău",
  tunnelEmail: "Emailul tău",
  tunnelWeiter: "Continuă",
  pickHint: "Încarcă femeia pe care vrei s-o săruți — sau glisează la una dintre ale noastre.",
  datenErsetzen: "Schimbă poza",
  jetztStarten: "Începe acum",
  namenVorSenden: "Atingeți numele voastre mai sus ca să trimiteți",
  upTitle: "Persoana 1", upHint: "Sărută orice vedetă — încarcă o simplă captură de ecran.",
  tapChange: "Atinge ca să schimbi poza",
  next: "Continuă — gratuit →", nextPaid: "Continuă →", pickFirst: "Alege-o mai întâi", uploadFirst: "Încarcă poza ta",
  aboWas: "{videos} videoclipuri pe lună în toate temele · fiecare în plus {extra} · chat gratuit · anulezi oricând",
  you: "Persoana 2", uploadYou: "Încarcă poza ta", youHint: "O poză cu tine — bărbatul din imagine",
  changePhoto: "Schimbă poza",
  wardrobe: "Garderobă & scenă", paidBadge: "Videoclipuri plătite",
  wardrobeOpen: "Îmbrac-o, păstrează-ți hainele sau schimbă-le, alege momentul.",
  wardrobeLocked: "Se deblochează cu un video plătit — îmbrac-o, alege momentul.",
  herDress: "Rochia ei", asInPhoto: "Ca în poză",
  moreOpen: "+ Hainele tale & momentul", moreClose: "− Mai puțin",
  yourClothes: "Hainele tale", myOwnClothes: "Hainele mele", theMoment: "Momentul", surpriseMe: "✨ Surprinde-mă",
  mailQuestion: "Unde să-ți trimitem poza?",
  tunnelOder: "sau", tunnelGoogle: "Continuă cu Google",
  vorlageAnsehen: "Vezi videoclipul exemplu",
  gateTitel: "Mai întâi emailul tău — ca să-ți putem trimite rezultatul.", gateWeiter: "Continuă",
  mailNote: "Gratuit. Îți trimitem poza și o păstrăm în galeria ta.",
  landFrage: "Țara ta",
  shareTitel: "Dacă distribui, devine public", shareText: "Oricine are linkul îți poate vedea cardul. Se arată doar rezultatul final — niciodată pozele încărcate de tine.", shareOk: "Am înțeles — distribuie", shareCancel: "Anulează",
  szeneTitel: "Alege o scenă — sau lasă-te surprins",
  ortFrage: "Unde mergeți?", ortPlatzhalter: "Tenerife", ortHinweis: "Locul intră în videoclip — scrie-l așa cum i-ai spune.",
  satzFrage: "Scrie-ți invitația", satzPlatzhalter: "Vino cu mine în Tenerife pe 21 nov. 2026 …",
  waescheTitel: "Alege lenjeria ei — sau păstreaz-o pe cea din videoclip",
  nochmalVideo: "Generează încă un videoclip",
  aufladeWahlTitel: "Cât vrei să încarci?",
  guthabenVorabHinweis: "Un videoclip costă {once}. Se plătește din creditul tău — cea mai mică încărcare este {topup}, iar restul îți rămâne pentru alte videoclipuri.",
  aufladen: "Încarcă contul — {topup}", aufladenHinweis: "Creditul nu expiră niciodată · fără plată în numerar", guthaben: "Credit",
  guthabenZuWenig: "Creditul tău este {stand} — acest produs costă {preis}.",
  aufladungNull: "Ultima ta plată a fost de 0,00 € (cod promoțional) — de aceea nu s-a adăugat niciun credit.",
  mailInvalid: "Te rog introdu o adresă de email validă.", oneMoment: "O clipă …", nochEins: "Inca unul, alt look", replaceModel: "Schimbă modelul", replaceGewaehlt: "Ales", erstatten: "Nu ești mulțumit? Îți dăm banii înapoi", geldZurueckGarantie: "Garanție de returnare a banilor", erstattenSicher: "Atinge din nou — banii înapoi", erstattet: "Returnat în soldul tău", nochEinsPreis: "Atinge o tinuta - {tanz} din sold, imediat.",
  ctaFree: "Generează poza — gratis", ctaVideo: "Generează videoclipul", rendering: "Se generează …",
  priceLine: "Poza gratis · Video {once}", paidLine: "✓ Plătit — tot ce urmează este inclus",
  consent: "Prin generare confirmi că ai dreptul să folosești aceste poze, că toate persoanele sunt adulte, că păstrezi rezultatul privat — și că îți asumi răspunderea. Pozele cu nuditate nu sunt acceptate. Încărcarea pozei altei persoane fără acordul ei nu este legală — răspunderea îți aparține.",
  consentKurz: "🔒 Privat · doar pentru tine · prin generare confirmi {agb}",
  buyOnce: "Video fierbinte {once}", buyAbo: "Totul inclus — {price}/lună",
  renderSteps: [
    "Îți analizăm poza …", "Vă potrivim pe amândoi …", "Se construiește sărutul …",
    "Se reglează lumina …", "Aproape gata …", "Ultimele retușuri …",
    "Din clipă în clipă …", "Încă lucrăm — mai stai puțin …",
  ],
  teaseSteps: ["Se citesc ambele chipuri …", "Vă potrivim pe amândoi …", "Momentul prinde viață …"],
  statusQuality: "Sărutul tău se generează la calitate maximă … (max. 10 min)",
  statusCouldNotStart: "Nu am putut porni.", statusFailed: "Generarea a eșuat.",
  statusPayCancelled: "Fereastra de plată s-a închis fără plată — atinge butonul pentru a încerca din nou.",
  statusTimeout: "A durat prea mult — încearcă mai târziu.",
  dauertLaenger: "Durează mai mult decât de obicei. Poți închide pagina — îți trimitem videoclipul gata pe email.", statusNetwork: "Eroare de rețea.",
  statusNotWork: "Nu a mers.",
  dressingHer: "O îmbrăcăm …", gettingReady: "Te pregătim …",
  renderingVideo: "Videoclipul tău se generează … (max. 10 min)", schliessenOk: "Poți închide pagina — videoclipul te va aștepta în galeria ta.", makingVideo: s => `Se face videoclipul … (${s} s)`,
  videoFailed: "Videoclipul a eșuat.", payPrep: "Plată primită — îți pregătim videoclipul …",
  failTitle: "Nu a ieșit de data asta",
  failWithMail: m => `Ți-l trimitem la ${m} imediat ce e gata.`,
  failNoMail: "Te rog încearcă cu altă poză.", tryAgain: "Încearcă din nou",
  blockedTitle: "Poza gratuită s-a consumat",
  blockedBody: "Trei poze gratuite de persoană. Mergi mai departe cu videoclipul — sau deblochează tot.",
  blockedOnce: "Fă un video real cu sărut — {once}", blockedAll: "Deblochează tot — {price}/lună",
  payReceived: "Plată primită ✓", payOpening: "Se deschide casa securizată …",
  payMaking: "Videoclipul se face — durează aproape un minut. Rămâi pe pagină.",
  payComplete: "Finalizează plata în fereastra care tocmai s-a deschis.",
  readyTitle: "Videoclipul tău e gata 🔥", readyBody: "Deblochează-l și vedeți-vă amândoi.",
  watchOnce: "Vreau să-mi văd videoclipul — {once}", orAll: "Sau deblochează tot — {price}/lună",
  makeVideo: "Fă videoclipul real cu sărut — {once} 🔥", makingKiss: "Se face videoclipul tău …",
  freeNote: "Poza e a ta, gratis. {once} costă videoclipul, fără abonament. ",
  secure: "Plată securizată prin Stripe",
  download: "⬇ Descarcă videoclipul",
  privateNote: "🔒 Videoclipul e privat — doar pentru tine. Te rugăm să nu-l distribui pe rețelele sociale.",
  back: "← Înapoi", examples: "Videoclipuri reale cu sărut 💋",
  einlKnopf: "💌 Trimite-l ca invitație", einlTitel: "Invitația voastră de nuntă",
  einlAdresse: "Strada, nr., cod poștal, oraș",
  einlTelefon: "Numărul vostru de WhatsApp — pentru confirmări",
  probeHinweis: "Online o săptămână — trimiteți-o invitaților. Confirmările, meniul și chatul de grup vin cu abonamentul, care ține și pagina activă.",
  einlSprachen: "Fiecare invitat o vede în limba lui — automat.",
  einlVorschau: "Așa o văd invitații voștri",
  kleidTitel: "Alege-ți rochia (opțional)",
  beispielLink: "Vezi o invitație reală",
  paarTitel: "Sau o poză cu voi doi",
  paarHint: "Se folosește de două ori: întâi fața ta, apoi a lui.",
  paarFehler: "Nu am găsit două fețe în poză — încearcă alta sau încarcă cele două poze separat.",
  paarBusy: "Se citește poza …",
  paarStoerung: "Nu a funcționat la noi acum — încearcă din nou într-un moment.",
  paarSchritt1: "1 din 2 — decupează fața TA",
  paarSchritt2: "2 din 2 — acum fața LUI",
  fotoWeg: "Șterge poza",
  bekommstTitel: "Ce primiți",
  bekommst: [
    "O pagină de invitație numai a voastră, cu numele, data și adresa",
    "Videoclipul cu voi doi, cu muzică — îl puteți schimba de 5 ori, invitații văd mereu ultima versiune",
    "Un link pentru WhatsApp — fără aplicație și fără cont pentru invitați",
    "Invitații confirmă cu o atingere; primiți un e-mail imediat ce cineva răspunde",
    "Scrieți noutăți și fiecare invitat primește un e-mail cu linkul — s-a schimbat ora sau locul, toți știu",
    "Un chat de grup pentru invitați, chiar pe invitație",
    "Fiecare invitat o citește singur în limba lui",
  ],
  einlSie: "Prenumele ei", einlEr: "Prenumele lui", einlDatum: "Data (opțional)",
  einlOrt: "Locul (opțional)", einlMachen: "Creează invitația", einlFertig: "Invitația voastră e gata",
  einlWhatsapp: "Trimite invitația", einlKopiert: "Link copiat",
  privat: "🔒 Privat: pozele tale rămân mereu private. Rezultatul devine public doar dacă îl distribui chiar tu.",
  zustimmung: "Încărcând o poză și apăsând „Mai departe“ accepți {agb} și {privacy}, precum și noutățile și ofertele pe email.",
  /* Wo es keinen Foto-Upload gibt (Geburtstag seit 07.08.2026), waere die Zusage zum
     HOCHLADEN eines Fotos schlicht falsch — dieselbe Zusage, richtig benannt. */
  zustimmungAufnahme: "Filmându-te și apăsând „Mai departe“ accepți {agb} și {privacy}, precum și noutățile și ofertele pe email.",
  zustimmungFehlt: "Te rog acceptă mai întâi.", agbLink: "termenii", datenschutzLink: "politica de confidențialitate",
  videosWeg: "Cele {videos} videoclipuri ale lunii s-au terminat.",
  aboAktiv: (r, g) => `Abonament activ · ${r} din ${g} videoclipuri rămase luna asta`,
  gestrandet: (b, a) => `Ai ${b} — dar pe ${a}, nu pe contul cu care ești autentificat acum.`,
  gestrandetCta: "Comută pe acea adresă",
  mailVorschlag: (v) => `Ai vrut să scrii ${v}?`,
  zahlungAdresse: "Videoclipul și creditul tău merg pe această adresă:",
  zahlungAdresseAendern: "Schimbă", zahlungAdresseSpeichern: "Salvează",
  extraTitel: "Videoclipurile tale pe luna asta s-au terminat",
  extraCta: "Încă un videoclip — {extra}", extraNote: "Un videoclip, fără abonament nou. Abonamentul tău merge mai departe.",
  heroA: "Trimite un sărut ", heroY: "persoanei pe care o iubești", heroB: " 💋",
  wieGehtTitel: "Cum funcționează",
  karteTitel: (n: string) => (n ? `Cadoul meu pentru ${n}: un sărut` : "Cadoul meu pentru tine: un sărut"),
  anlass: "De aniversarea voastră · de ziua ei · de Valentine’s Day · când nu v-ați văzut de mult · după o ceartă · pur și simplu",
  grund: "Un mesaj se citește și se uită. Un videoclip în care vă sărutați îl păstrează.",
  wieGeht: ["Încarcă o poză cu tine și una cu ea sau el.", "Facem din voi doi un videoclip cu un sărut.", "Trimite-l — doar acelei persoane."],
  wieGehtPrivat: "Nimeni altcineva nu îl vede. Felicitarea ta rămâne privată dacă nu o distribui tu.",
  anlaesseTitel: "De ce să trimiți unul",
  anlaesse: ["Ți-e dor de cineva, iar un mesaj nu spune asta.", "Vă vedeți mult prea rar.", "E ceva de spus ce nu poate fi scris.", "Nu e nimic de sărbătorit — exact despre asta e vorba."],
  anlaesseSchluss: "Un sărut pe care pui să fie făcut nu e un mesaj. E o dovadă de dragoste.",
  kussZurueck: "Trimite un sărut înapoi 💋",
  namenFrage: "Numele ei sau al lui — apare în felicitare (opțional)", namenPlatzhalter: "Anna",
  heroLead: "",
  leadA: "Ia orice persoană pe care o admiri — o vedetă, o cântăreață, o actriță, o sportivă, o influenceriță sau una dintre femeile noastre. O singură captură de ecran e de ajuns.",
  leadB: "Adaugă o poză cu tine și inteligența artificială vă pune pe amândoi, unul lângă altul, la o petrecere. Două chipuri, un videoclip care pare real.",
  fine: "Generat de inteligență artificială, nu o înregistrare reală — și e pentru tine, nu pentru rețelele sociale.",
};

const ES: KissText = {
  step1: "1 · Elígela", step2: "2 · Tu foto — tú, el hombre", step3: "3 · El beso", step4: "4 · Tu imagen",
  /* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch bei allen heissen Generate now - Preis."). */
  generateNow: "Generar ahora",
  /* SCHRITT 1 DES TUNNELS — BASIS fuer ALLE Produkte (Owner 12.08.2026: „keine Ausnahme"; vorher nur im VERSPRECHEN-Overlay, alle anderen fielen auf Alt-Texte wie „Continuă — gratuit" zurueck). */
  tunnelStartTitel: "Empecemos",
  tunnelName: "Tu nombre",
  tunnelEmail: "Tu email",
  tunnelWeiter: "Siguiente",
  pickHint: "Sube la mujer a la que quieres besar — o desliza hasta una de las nuestras.",
  datenErsetzen: "Cambiar foto",
  jetztStarten: "Empieza ahora",
  namenVorSenden: "Tocad vuestros nombres arriba para enviarlo",
  upTitle: "Persona 1", upHint: "Besa a cualquier estrella — sube solo una captura de pantalla.",
  tapChange: "Toca para cambiar la foto",
  next: "Seguir — gratis →", nextPaid: "Seguir →", pickFirst: "Elígela primero", uploadFirst: "Sube tu foto",
  aboWas: "{videos} vídeos al mes en todos los temas · cada uno más {extra} · chat gratis · cancela cuando quieras",
  you: "Persona 2", uploadYou: "Sube tu foto", youHint: "Una foto tuya — el hombre de la imagen",
  changePhoto: "Cambiar foto",
  wardrobe: "Vestuario y escena", paidBadge: "Vídeos de pago",
  wardrobeOpen: "Vístela, quédate con tu ropa o cámbiala, elige el momento.",
  wardrobeLocked: "Se desbloquea con un vídeo de pago — vístela, elige el momento.",
  herDress: "Su vestido", asInPhoto: "Como en la foto",
  moreOpen: "+ Tu ropa y el momento", moreClose: "− Menos",
  yourClothes: "Tu ropa", myOwnClothes: "Mi propia ropa", theMoment: "El momento", surpriseMe: "✨ Sorpréndeme",
  mailQuestion: "¿A dónde te enviamos tu imagen?",
  tunnelOder: "o", tunnelGoogle: "Continuar con Google",
  vorlageAnsehen: "Ver el vídeo de ejemplo",
  gateTitel: "Primero tu email — para poder enviarte el resultado.", gateWeiter: "Continuar",
  mailNote: "Gratis. Te enviamos la imagen y la guardamos en tu galería.",
  landFrage: "Tu país",
  shareTitel: "Compartir lo hace público", shareText: "Cualquiera con el enlace puede ver tu tarjeta. Solo se muestra el resultado final — nunca las fotos que subiste.", shareOk: "Entendido — compartir", shareCancel: "Cancelar",
  szeneTitel: "Elige una escena — o déjate sorprender",
  ortFrage: "¿A dónde vais?", ortPlatzhalter: "Tenerife", ortHinweis: "El lugar entra en el vídeo — escríbelo como se lo dirías.",
  satzFrage: "Escribe tu invitación", satzPlatzhalter: "Ven conmigo a Tenerife el 21 nov. 2026 …",
  waescheTitel: "Elige su lencería — o deja la del vídeo",
  nochmalVideo: "Generar otro vídeo",
  aufladeWahlTitel: "¿Cuánto quieres recargar?",
  guthabenVorabHinweis: "Un vídeo cuesta {once}. Se paga con tu saldo — la recarga mínima es {topup}, y lo que sobra se queda para más vídeos.",
  aufladen: "Recargar cuenta — {topup}", aufladenHinweis: "El saldo nunca caduca · sin pago en efectivo", guthaben: "Saldo",
  guthabenZuWenig: "Tu saldo es {stand} — este producto cuesta {preis}.",
  aufladungNull: "Tu último pago fue de 0,00 € (código promocional) — por eso no se añadió saldo.",
  mailInvalid: "Introduce un correo electrónico válido.", oneMoment: "Un momento …", nochEins: "Otro mas, otro look", replaceModel: "Cambiar modelo", replaceGewaehlt: "Elegido", erstatten: "¿No te convence? Te devolvemos el dinero", geldZurueckGarantie: "Garantía de devolución", erstattenSicher: "Toca otra vez — dinero de vuelta", erstattet: "Devuelto a tu saldo", nochEinsPreis: "Toca un look - {tanz} de tu saldo, al momento.",
  ctaFree: "Generar imagen — gratis", ctaVideo: "Generar vídeo", rendering: "Generando …",
  priceLine: "Imagen gratis · Vídeo {once}", paidLine: "✓ Pagado — todo lo de abajo está incluido",
  consent: "Al generar confirmas que puedes usar estas fotos, que todas las personas son adultas, que lo mantendrás privado — y que asumes la responsabilidad. No se aceptan fotos con desnudez. Subir la foto de otra persona sin su consentimiento no es legal — esa responsabilidad es tuya.",
  consentKurz: "🔒 Privado · solo para ti · al generar confirmas los {agb}",
  buyOnce: "Vídeo caliente {once}", buyAbo: "Todo incluido — {price}/mes",
  renderSteps: [
    "Analizando tu foto …", "Uniéndoos a los dos …", "Creando el beso …",
    "Ajustando la luz …", "Casi listo …", "Últimos retoques …",
    "En cualquier momento …", "Seguimos trabajando — aguanta …",
  ],
  teaseSteps: ["Leyendo las dos caras …", "Uniéndoos a los dos …", "Dando vida al momento …"],
  statusQuality: "Creando tu beso con la máxima calidad … (max. 10 min)",
  statusCouldNotStart: "No se pudo iniciar.", statusFailed: "La generación ha fallado.",
  statusPayCancelled: "La ventana de pago se cerró sin pagar — toca el botón para volver a intentarlo.",
  statusTimeout: "Ha tardado demasiado — inténtalo más tarde.",
  dauertLaenger: "Está tardando más de lo habitual. Puedes cerrar la página — te enviamos el vídeo terminado por email.", statusNetwork: "Error de red.",
  statusNotWork: "Eso no ha funcionado.",
  dressingHer: "Vistiéndola …", gettingReady: "Preparándote a ti …",
  renderingVideo: "Creando tu vídeo … (max. 10 min)", schliessenOk: "Puedes cerrar esta página — tu vídeo te esperará en tu galería.", makingVideo: s => `Creando tu vídeo … (${s} s)`,
  videoFailed: "El vídeo ha fallado.", payPrep: "Pago recibido — preparando tu vídeo …",
  failTitle: "Esta vez no ha salido",
  failWithMail: m => `Te lo enviamos a ${m} en cuanto esté listo.`,
  failNoMail: "Inténtalo con otra foto, por favor.", tryAgain: "Intentar de nuevo",
  blockedTitle: "Has gastado tu imagen gratis",
  blockedBody: "Tres imágenes gratis por persona. Sigue con el vídeo — o desbloquéalo todo.",
  blockedOnce: "Haz un vídeo de beso real — {once}", blockedAll: "Desbloquear todo — {price}/mes",
  payReceived: "Pago recibido ✓", payOpening: "Abriendo el pago seguro …",
  payMaking: "Creando tu vídeo — tarda alrededor de un minuto. Quédate en esta página.",
  payComplete: "Completa el pago en la ventana que se acaba de abrir.",
  readyTitle: "Tu vídeo está listo 🔥", readyBody: "Desbloquéalo y veros a los dos.",
  watchOnce: "Ver mi vídeo del beso — {once}", orAll: "O desbloquear todo — {price}/mes",
  makeVideo: "Hacer el vídeo real del beso — {once} 🔥", makingKiss: "Creando tu vídeo del beso …",
  freeNote: "La imagen es tuya gratis. {once} paga el vídeo, sin suscripción. ",
  secure: "Pago seguro con Stripe",
  download: "⬇ Descargar tu vídeo",
  privateNote: "🔒 Este vídeo es privado — solo para ti. Por favor, no lo compartas en redes sociales.",
  back: "← Atrás", examples: "Vídeos de besos reales 💋",
  einlKnopf: "💌 Enviarlo como invitación", einlTitel: "Vuestra invitación de boda",
  einlAdresse: "Calle, nº, código postal, ciudad",
  einlTelefon: "Vuestro número de WhatsApp — para confirmaciones",
  probeHinweis: "Online una semana — enviádsela a vuestros invitados. Las confirmaciones, el menú y el chat llegan con la suscripción, que además mantiene la página activa.",
  einlSprachen: "Cada invitado la ve en su idioma — automáticamente.",
  einlVorschau: "Así lo ven vuestros invitados",
  kleidTitel: "Elige tu vestido (opcional)",
  beispielLink: "Abrir una invitación real",
  paarTitel: "O una foto de los dos",
  paarHint: "Se usa dos veces: primero tu cara, luego la suya.",
  paarFehler: "No encontramos dos caras en esa foto — prueba con otra o sube las dos fotos por separado.",
  paarBusy: "Leyendo la foto …",
  paarStoerung: "Ahora mismo ha fallado por nuestro lado — inténtalo de nuevo en un momento.",
  paarSchritt1: "1 de 2 — recorta TU cara",
  paarSchritt2: "2 de 2 — ahora la de ÉL",
  fotoWeg: "Quitar foto",
  bekommstTitel: "Esto es lo que recibís",
  bekommst: [
    "Vuestra propia página de invitación con vuestros nombres, la fecha y la dirección",
    "El vídeo con vosotros dos, con música — cambiadlo hasta 5 veces, los invitados ven siempre el más nuevo",
    "Un enlace para WhatsApp — sin app y sin registro para vuestros invitados",
    "Los invitados confirman con un toque; recibís un correo en cuanto alguien responde",
    "Publicáis novedades y cada invitado recibe un correo con el enlace — cambia la hora o el lugar y todos lo saben",
    "Un chat de grupo para vuestros invitados, en la propia invitación",
    "Cada invitado la lee en su idioma, automáticamente",
  ],
  einlSie: "Su nombre (ella)", einlEr: "Su nombre (él)", einlDatum: "Fecha (opcional)",
  einlOrt: "Lugar (opcional)", einlMachen: "Crear invitación", einlFertig: "Vuestra invitación está lista",
  einlWhatsapp: "Enviar la invitación", einlKopiert: "Enlace copiado",
  privat: "🔒 Privado: tus fotos siempre quedan privadas. Tu resultado solo se publica si tú mismo lo compartes.",
  zustimmung: "Al subir una foto y pulsar Siguiente aceptas los {agb} y la {privacy}, y novedades y ofertas por email.",
  /* Wo es keinen Foto-Upload gibt (Geburtstag seit 07.08.2026), waere die Zusage zum
     HOCHLADEN eines Fotos schlicht falsch — dieselbe Zusage, richtig benannt. */
  zustimmungAufnahme: "Al grabarte y pulsar Siguiente aceptas los {agb} y la {privacy}, y novedades y ofertas por email.",
  zustimmungFehlt: "Acepta primero las condiciones.", agbLink: "términos", datenschutzLink: "política de privacidad",
  videosWeg: "Tus {videos} vídeos de este mes se han agotado.",
  aboAktiv: (r, g) => `Suscripción activa · te quedan ${r} de ${g} vídeos este mes`,
  gestrandet: (b, a) => `Tienes ${b} — pero en ${a}, no en la cuenta con la que has iniciado sesión ahora.`,
  gestrandetCta: "Cambiar a esa dirección",
  mailVorschlag: (v) => `¿Querías decir ${v}?`,
  zahlungAdresse: "Tu vídeo y tu saldo van a esta dirección:",
  zahlungAdresseAendern: "Cambiar", zahlungAdresseSpeichern: "Guardar",
  extraTitel: "Tus vídeos de este mes se han agotado",
  extraCta: "Un vídeo más — {extra}", extraNote: "Un vídeo, sin nueva suscripción. La tuya sigue igual.",
  heroA: "Envía un beso a ", heroY: "quien tú quieres", heroB: " 💋",
  wieGehtTitel: "Cómo funciona",
  karteTitel: (n: string) => (n ? `Mi regalo para ${n}: un beso` : "Mi regalo para ti: un beso"),
  anlass: "Por vuestro aniversario · por su cumpleaños · por San Valentín · cuando lleváis tiempo sin veros · después de una discusión · porque sí",
  grund: "Un mensaje se lee y se olvida. Un vídeo en el que os besáis, se lo queda.",
  wieGeht: ["Sube una foto tuya y otra de ella o de él.", "Convertimos a los dos en un vídeo de un beso.", "Envíalo — solo a esa persona."],
  wieGehtPrivat: "Nadie más lo ve. Tu tarjeta sigue siendo privada mientras no la compartas tú.",
  anlaesseTitel: "Por qué enviar uno",
  anlaesse: ["Echas de menos a alguien y un mensaje no lo dice.", "Os veis demasiado poco.", "Hay algo que decir que no se puede escribir.", "No hay nada que celebrar — de eso se trata."],
  anlaesseSchluss: "Un beso que mandas hacer no es un mensaje. Es una prueba de amor.",
  kussZurueck: "Devolver el beso 💋",
  namenFrage: "Su nombre — aparece en la tarjeta (opcional)", namenPlatzhalter: "Ana",
  heroLead: "",
  leadA: "Coge a cualquier persona que admires — una superestrella, una cantante, una actriz, una deportista, una influencer o una de nuestras modelos. Basta una captura de pantalla.",
  leadB: "Añade una foto tuya y la IA os pone a los dos juntos en una fiesta, uno al lado del otro. Vuestras dos caras, un vídeo que parece real.",
  fine: "Generado por IA, no es una grabación real — y es para ti, no para las redes sociales.",
};

const FR: KissText = {
  step1: "1 · Choisis-la", step2: "2 · Ta photo — toi, l'homme", step3: "3 · Le baiser", step4: "4 · Ton image",
  /* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch bei allen heissen Generate now - Preis."). */
  generateNow: "Générer maintenant",
  /* SCHRITT 1 DES TUNNELS — BASIS fuer ALLE Produkte (Owner 12.08.2026: „keine Ausnahme"; vorher nur im VERSPRECHEN-Overlay, alle anderen fielen auf Alt-Texte wie „Continuă — gratuit" zurueck). */
  tunnelStartTitel: "C’est parti",
  tunnelName: "Ton prénom",
  tunnelEmail: "Ton e-mail",
  tunnelWeiter: "Suivant",
  pickHint: "Téléverse la femme que tu veux embrasser — ou glisse vers l'une des nôtres.",
  datenErsetzen: "Changer la photo",
  jetztStarten: "Commencer",
  namenVorSenden: "Touchez vos prénoms ci-dessus pour l'envoyer",
  upTitle: "Personne 1", upHint: "Embrasse n'importe quelle star — une capture d'écran suffit.",
  tapChange: "Touche pour changer la photo",
  next: "Continuer — gratuit →", nextPaid: "Continuer →", pickFirst: "Choisis-la d'abord", uploadFirst: "Téléverse ta photo",
  aboWas: "{videos} vidéos par mois sur tous les thèmes · chaque vidéo en plus {extra} · chat gratuit · résiliable à tout moment",
  you: "Personne 2", uploadYou: "Téléverse ta photo", youHint: "Une photo de toi — l'homme sur l'image",
  changePhoto: "Changer la photo",
  wardrobe: "Garde-robe & scène", paidBadge: "Vidéos payantes",
  wardrobeOpen: "Habille-la, garde tes vêtements ou change-les, choisis le moment.",
  wardrobeLocked: "Débloqué avec une vidéo payante — habille-la, choisis le moment.",
  herDress: "Sa robe", asInPhoto: "Comme sur la photo",
  moreOpen: "+ Tes vêtements & le moment", moreClose: "− Moins",
  yourClothes: "Tes vêtements", myOwnClothes: "Mes propres vêtements", theMoment: "Le moment", surpriseMe: "✨ Surprends-moi",
  mailQuestion: "Où devons-nous envoyer ton image ?",
  tunnelOder: "ou", tunnelGoogle: "Continuer avec Google",
  vorlageAnsehen: "Voir la vidéo d'exemple",
  gateTitel: "D'abord ton e-mail — pour pouvoir t'envoyer le résultat.", gateWeiter: "Continuer",
  mailNote: "Gratuit. Nous t'envoyons l'image et la gardons dans ta galerie.",
  landFrage: "Ton pays",
  shareTitel: "Partager le rend public", shareText: "Toute personne avec le lien peut voir ta carte. Seul le résultat final est montré — jamais tes photos envoyées.", shareOk: "Compris — partager", shareCancel: "Annuler",
  szeneTitel: "Choisis une scène — ou laisse-toi surprendre",
  ortFrage: "Où partez-vous ?", ortPlatzhalter: "Tenerife", ortHinweis: "Le lieu entre dans la vidéo — écris-le comme tu le lui dirais.",
  satzFrage: "Écris ton invitation", satzPlatzhalter: "Viens avec moi à Tenerife le 21 nov. 2026 …",
  waescheTitel: "Choisis sa lingerie — ou garde celle de la vidéo",
  nochmalVideo: "Générer une autre vidéo",
  aufladeWahlTitel: "Combien veux-tu recharger ?",
  guthabenVorabHinweis: "Une vidéo coûte {once}. Le paiement se fait sur ton crédit — la recharge minimale est {topup}, et le reste te reste pour d'autres vidéos.",
  aufladen: "Recharger le compte — {topup}", aufladenHinweis: "Le crédit n'expire jamais · pas de remboursement en espèces", guthaben: "Crédit",
  guthabenZuWenig: "Ton crédit est de {stand} — ce produit coûte {preis}.",
  aufladungNull: "Ton dernier paiement était de 0,00 € (code promo) — aucun crédit n'a donc été ajouté.",
  mailInvalid: "Merci d'indiquer une adresse e-mail valide.", oneMoment: "Un instant …", nochEins: "Encore une, autre look", replaceModel: "Remplacer le modèle", replaceGewaehlt: "Choisi", erstatten: "Pas satisfait ? On te rembourse", geldZurueckGarantie: "Garantie de remboursement", erstattenSicher: "Touche encore — remboursé", erstattet: "Remboursé sur ton solde", nochEinsPreis: "Touche une tenue - {tanz} depuis ton solde, tout de suite.",
  ctaFree: "Générer l'image — gratuit", ctaVideo: "Générer la vidéo", rendering: "Génération …",
  priceLine: "Image gratuite · Vidéo {once}", paidLine: "✓ Payé — tout ce qui suit est inclus",
  consent: "En générant, tu confirmes que tu peux utiliser ces photos, que toutes les personnes sont majeures, que tu gardes le résultat privé — et que tu en assumes la responsabilité. Les photos dénudées ne sont pas acceptées. Téléverser la photo d'une autre personne sans son consentement n'est pas légal — cette responsabilité t'incombe.",
  consentKurz: "🔒 Privé · juste pour toi · en générant tu confirmes les {agb}",
  buyOnce: "Vidéo chaude {once}", buyAbo: "Tout compris — {price}/mois",
  renderSteps: [
    "Analyse de ta photo …", "On vous réunit tous les deux …", "Le baiser se construit …",
    "Réglage de la lumière …", "Presque fini …", "Dernières retouches …",
    "D'une seconde à l'autre …", "Toujours en cours — encore un instant …",
  ],
  teaseSteps: ["Lecture des deux visages …", "On vous réunit tous les deux …", "Le moment prend vie …"],
  statusQuality: "Ton baiser est créé en pleine qualité … (max. 10 min)",
  statusCouldNotStart: "Impossible de démarrer.", statusFailed: "La génération a échoué.",
  statusPayCancelled: "La fenêtre de paiement s'est fermée sans paiement — retape sur le bouton pour réessayer.",
  statusTimeout: "Cela a pris trop de temps — réessaie plus tard.",
  dauertLaenger: "C'est plus long que d'habitude. Tu peux fermer la page — on t'envoie la vidéo terminée par email.", statusNetwork: "Erreur réseau.",
  statusNotWork: "Ça n'a pas marché.",
  dressingHer: "On l'habille …", gettingReady: "On te prépare …",
  renderingVideo: "Ta vidéo est créée … (max. 10 min)", schliessenOk: "Tu peux fermer cette page — ta vidéo t'attendra dans ta galerie.", makingVideo: s => `Ta vidéo se fait … (${s} s)`,
  videoFailed: "La vidéo a échoué.", payPrep: "Paiement reçu — ta vidéo se prépare …",
  failTitle: "Ça n'est pas passé cette fois",
  failWithMail: m => `Nous l'envoyons à ${m} dès que c'est prêt.`,
  failNoMail: "Réessaie avec une autre photo.", tryAgain: "Réessayer",
  blockedTitle: "Ton image gratuite est utilisée",
  blockedBody: "Trois images gratuites par personne. Continue avec la vidéo — ou débloque tout.",
  blockedOnce: "Faire une vraie vidéo de baiser — {once}", blockedAll: "Tout débloquer — {price}/mois",
  payReceived: "Paiement reçu ✓", payOpening: "Ouverture du paiement sécurisé …",
  payMaking: "Ta vidéo se fait — cela prend environ une minute. Reste sur cette page.",
  payComplete: "Termine le paiement dans la fenêtre qui vient de s'ouvrir.",
  readyTitle: "Ta vidéo est prête 🔥", readyBody: "Débloque-la et regardez-vous tous les deux.",
  watchOnce: "Voir ma vidéo de baiser — {once}", orAll: "Ou tout débloquer — {price}/mois",
  makeVideo: "Faire la vraie vidéo du baiser — {once} 🔥", makingKiss: "Ta vidéo de baiser se fait …",
  freeNote: "L'image est à toi, gratuitement. {once} paie la vidéo, sans abonnement. ",
  secure: "Paiement sécurisé par Stripe",
  download: "⬇ Télécharger ta vidéo",
  privateNote: "🔒 Cette vidéo est privée — rien que pour toi. Merci de ne pas la partager sur les réseaux sociaux.",
  back: "← Retour", examples: "De vraies vidéos de baiser 💋",
  einlKnopf: "💌 L'envoyer comme invitation", einlTitel: "Votre invitation de mariage",
  einlAdresse: "Rue, n°, code postal, ville",
  einlTelefon: "Votre numéro WhatsApp — pour les réponses",
  probeHinweis: "En ligne une semaine — envoyez-la à vos invités. Réponses, menu et chat de groupe viennent avec l’abonnement, qui garde aussi la page en ligne.",
  einlSprachen: "Chaque invité la voit dans sa langue — automatiquement.",
  einlVorschau: "Voilà ce que voient vos invités",
  kleidTitel: "Choisissez votre robe (facultatif)",
  beispielLink: "Ouvrir une vraie invitation",
  paarTitel: "Ou une photo de vous deux",
  paarHint: "Utilisée deux fois : d’abord votre visage, puis le sien.",
  paarFehler: "Nous n’avons pas trouvé deux visages sur cette photo — essayez-en une autre, ou envoyez les deux photos séparément.",
  paarBusy: "Lecture de la photo …",
  paarStoerung: "Cela n’a pas fonctionné chez nous à l’instant — réessayez dans un instant.",
  paarSchritt1: "1 sur 2 — recadrez VOTRE visage",
  paarSchritt2: "2 sur 2 — maintenant le SIEN",
  fotoWeg: "Retirer la photo",
  bekommstTitel: "Ce que vous recevez",
  bekommst: [
    "Votre propre page d’invitation avec vos noms, la date et l’adresse",
    "La vidéo avec vous deux, en musique — remplaçable 5 fois, les invités voient toujours la plus récente",
    "Un lien pour WhatsApp — sans appli ni inscription pour vos invités",
    "Les invités répondent en un geste ; vous recevez un e-mail dès que quelqu’un répond",
    "Vous publiez des nouvelles et chaque invité reçoit un e-mail avec le lien — heure ou lieu changé, tout le monde le sait",
    "Une discussion de groupe pour vos invités, sur l’invitation même",
    "Chaque invité la lit dans sa langue, tout seul",
  ],
  einlSie: "Son prénom (elle)", einlEr: "Son prénom (lui)", einlDatum: "Date (facultatif)",
  einlOrt: "Lieu (facultatif)", einlMachen: "Créer l'invitation", einlFertig: "Votre invitation est prête",
  einlWhatsapp: "Envoyer l’invitation", einlKopiert: "Lien copié",
  privat: "🔒 Privé : tes photos restent toujours privées. Ton résultat n'est publié que si tu le partages toi-même.",
  zustimmung: "En téléversant une photo et en appuyant sur Suivant, tu acceptes les {agb} et la {privacy}, ainsi que les nouveautés et offres par e-mail.",
  /* Wo es keinen Foto-Upload gibt (Geburtstag seit 07.08.2026), waere die Zusage zum
     HOCHLADEN eines Fotos schlicht falsch — dieselbe Zusage, richtig benannt. */
  zustimmungAufnahme: "En te filmant et en appuyant sur Suivant, tu acceptes les {agb} et la {privacy}, ainsi que les nouveautés et offres par e-mail.",
  zustimmungFehlt: "Merci d'accepter d'abord.", agbLink: "conditions", datenschutzLink: "politique de confidentialité",
  videosWeg: "Tes {videos} vidéos du mois sont épuisées.",
  aboAktiv: (r, g) => `Abonnement actif · ${r} vidéos sur ${g} restantes ce mois-ci`,
  gestrandet: (b, a) => `Tu as ${b} — mais sur ${a}, pas sur le compte avec lequel tu es connecté en ce moment.`,
  gestrandetCta: "Passer à cette adresse",
  mailVorschlag: (v) => `Tu voulais dire ${v} ?`,
  zahlungAdresse: "Ta vidéo et ton crédit sont liés à cette adresse :",
  zahlungAdresseAendern: "Modifier", zahlungAdresseSpeichern: "Enregistrer",
  extraTitel: "Tes vidéos du mois sont épuisées",
  extraCta: "Une vidéo de plus — {extra}", extraNote: "Une vidéo, sans nouvel abonnement. Le tien continue normalement.",
  heroA: "Envoie un baiser à ", heroY: "la personne que tu aimes", heroB: " 💋",
  wieGehtTitel: "Comment ça marche",
  karteTitel: (n: string) => (n ? `Mon cadeau pour ${n} : un baiser` : "Mon cadeau pour toi : un baiser"),
  anlass: "Pour votre anniversaire · pour son anniversaire · pour la Saint-Valentin · quand vous ne vous êtes pas vus depuis longtemps · après une dispute · sans raison",
  grund: "Un message se lit et s’oublie. Une vidéo où vous vous embrassez, elle la garde.",
  wieGeht: ["Ajoute une photo de toi et une d'elle ou de lui.", "On fait de vous deux une vidéo d'un baiser.", "Envoie-la — à cette personne seule."],
  wieGehtPrivat: "Personne d'autre ne la voit. Ta carte reste privée tant que tu ne la partages pas toi-même.",
  anlaesseTitel: "Pourquoi en envoyer un",
  anlaesse: ["Cette personne te manque, et un message ne le dit pas.", "Vous vous voyez beaucoup trop rarement.", "Il y a quelque chose à dire qui ne s'écrit pas.", "Il n'y a rien à fêter — c'est justement le propos."],
  anlaesseSchluss: "Un baiser que tu fais faire n'est pas un message. C'est une preuve d'amour.",
  kussZurueck: "Renvoyer un baiser 💋",
  namenFrage: "Son prénom — il apparaît dans la carte (facultatif)", namenPlatzhalter: "Anna",
  heroLead: "",
  leadA: "Prends n'importe qui que tu admires — une superstar, une chanteuse, une actrice, une sportive, une influenceuse ou l'une de nos modèles. Une seule capture d'écran suffit.",
  leadB: "Ajoute une photo de toi et l'IA vous met tous les deux côte à côte à une fête. Vos deux visages, une vidéo qui semble réelle.",
  fine: "Généré par IA, ce n'est pas un vrai enregistrement — et c'est pour toi, pas pour les réseaux sociaux.",
};

const PT: KissText = {
  step1: "1 · Escolhe-a", step2: "2 · A tua foto — tu, o homem", step3: "3 · O beijo", step4: "4 · A tua imagem",
  /* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch bei allen heissen Generate now - Preis."). */
  generateNow: "Gerar agora",
  /* SCHRITT 1 DES TUNNELS — BASIS fuer ALLE Produkte (Owner 12.08.2026: „keine Ausnahme"; vorher nur im VERSPRECHEN-Overlay, alle anderen fielen auf Alt-Texte wie „Continuă — gratuit" zurueck). */
  tunnelStartTitel: "Vamos começar",
  tunnelName: "O teu nome",
  tunnelEmail: "O teu email",
  tunnelWeiter: "Seguinte",
  pickHint: "Carrega a mulher que queres beijar — ou desliza para uma das nossas.",
  datenErsetzen: "Trocar foto",
  jetztStarten: "Começa agora",
  namenVorSenden: "Toquem nos vossos nomes acima para enviar",
  upTitle: "Pessoa 1", upHint: "Beija qualquer estrela — basta uma captura de ecrã.",
  tapChange: "Toca para trocar a foto",
  next: "Continuar — grátis →", nextPaid: "Continuar →", pickFirst: "Escolhe-a primeiro", uploadFirst: "Carrega a tua foto",
  aboWas: "{videos} vídeos por mês em todos os temas · cada um a mais {extra} · chat grátis · cancelas quando quiseres",
  you: "Pessoa 2", uploadYou: "Carrega a tua foto", youHint: "Uma foto tua — o homem na imagem",
  changePhoto: "Trocar foto",
  wardrobe: "Guarda-roupa e cenário", paidBadge: "Vídeos pagos",
  wardrobeOpen: "Veste-a, mantém a tua roupa ou troca-a, escolhe o momento.",
  wardrobeLocked: "Desbloqueia com um vídeo pago — veste-a, escolhe o momento.",
  herDress: "O vestido dela", asInPhoto: "Como na foto",
  moreOpen: "+ A tua roupa e o momento", moreClose: "− Menos",
  yourClothes: "A tua roupa", myOwnClothes: "A minha própria roupa", theMoment: "O momento", surpriseMe: "✨ Surpreende-me",
  mailQuestion: "Para onde enviamos a tua imagem?",
  tunnelOder: "ou", tunnelGoogle: "Continuar com Google",
  vorlageAnsehen: "Ver o vídeo de exemplo",
  gateTitel: "Primeiro o teu email — para podermos enviar-te o resultado.", gateWeiter: "Continuar",
  mailNote: "Grátis. Enviamos-te a imagem e guardamo-la na tua galeria.",
  landFrage: "O teu país",
  shareTitel: "Partilhar torna-o público", shareText: "Qualquer pessoa com o link pode ver o teu cartão. Só se mostra o resultado final — nunca as fotos que enviaste.", shareOk: "Entendi — partilhar", shareCancel: "Cancelar",
  szeneTitel: "Escolhe uma cena — ou deixa-te surpreender",
  ortFrage: "Para onde vão?", ortPlatzhalter: "Tenerife", ortHinweis: "O lugar entra no vídeo — escreve-o como lho dirias.",
  satzFrage: "Escreve o teu convite", satzPlatzhalter: "Vem comigo a Tenerife a 21 nov. 2026 …",
  waescheTitel: "Escolhe a lingerie dela — ou deixa a do vídeo",
  nochmalVideo: "Gerar mais um vídeo",
  aufladeWahlTitel: "Quanto queres carregar?",
  guthabenVorabHinweis: "Um vídeo custa {once}. Paga-se com o teu saldo — o carregamento mínimo é {topup}, e o que sobra fica para mais vídeos.",
  aufladen: "Carregar conta — {topup}", aufladenHinweis: "O saldo nunca expira · sem pagamento em dinheiro", guthaben: "Saldo",
  guthabenZuWenig: "O teu saldo é {stand} — este produto custa {preis}.",
  aufladungNull: "O teu último pagamento foi de 0,00 € (código promocional) — por isso não foi adicionado saldo.",
  mailInvalid: "Indica um endereço de email válido.", oneMoment: "Um momento …", nochEins: "Mais um, outro look", replaceModel: "Trocar modelo", replaceGewaehlt: "Escolhido", erstatten: "Não gostaste? Devolvemos o dinheiro", geldZurueckGarantie: "Garantia de devolução", erstattenSicher: "Toca outra vez — dinheiro de volta", erstattet: "Devolvido ao teu saldo", nochEinsPreis: "Toca num look - {tanz} do teu saldo, ja.",
  ctaFree: "Gerar imagem — grátis", ctaVideo: "Gerar vídeo", rendering: "A gerar …",
  priceLine: "Imagem grátis · Vídeo {once}", paidLine: "✓ Pago — tudo abaixo está incluído",
  consent: "Ao gerar confirmas que podes usar estas fotos, que todas as pessoas são adultas, que manténs o resultado privado — e que assumes a responsabilidade. Não são aceites fotos com nudez. Carregar a foto de outra pessoa sem o seu consentimento não é legal — essa responsabilidade é tua.",
  consentKurz: "🔒 Privado · só para ti · ao gerar confirmas os {agb}",
  buyOnce: "Vídeo quente {once}", buyAbo: "Tudo incluído — {price}/mês",
  renderSteps: [
    "A analisar a tua foto …", "A juntar-vos aos dois …", "A criar o beijo …",
    "A acertar a luz …", "Quase pronto …", "Últimos retoques …",
    "A qualquer segundo …", "Ainda a trabalhar — aguenta …",
  ],
  teaseSteps: ["A ler os dois rostos …", "A juntar-vos aos dois …", "O momento ganha vida …"],
  statusQuality: "O teu beijo está a ser criado em qualidade máxima … (max. 10 min)",
  statusCouldNotStart: "Não foi possível iniciar.", statusFailed: "A geração falhou.",
  statusPayCancelled: "A janela de pagamento fechou sem pagar — toca no botão para tentar novamente.",
  statusTimeout: "Demorou demasiado — tenta mais tarde.",
  dauertLaenger: "Está a demorar mais do que o habitual. Podes fechar a página — enviamos-te o vídeo pronto por email.", statusNetwork: "Erro de rede.",
  statusNotWork: "Isso não resultou.",
  dressingHer: "A vesti-la …", gettingReady: "A preparar-te …",
  renderingVideo: "O teu vídeo está a ser criado … (max. 10 min)", schliessenOk: "Podes fechar esta página — o teu vídeo ficará à tua espera na galeria.", makingVideo: s => `A fazer o teu vídeo … (${s} s)`,
  videoFailed: "O vídeo falhou.", payPrep: "Pagamento recebido — a preparar o teu vídeo …",
  failTitle: "Desta vez não saiu",
  failWithMail: m => `Enviamos-to para ${m} assim que estiver pronto.`,
  failNoMail: "Tenta com outra foto, por favor.", tryAgain: "Tentar de novo",
  blockedTitle: "A tua imagem grátis acabou",
  blockedBody: "Três imagens grátis por pessoa. Continua com o vídeo — ou desbloqueia tudo.",
  blockedOnce: "Fazer um vídeo de beijo a sério — {once}", blockedAll: "Desbloquear tudo — {price}/mês",
  payReceived: "Pagamento recebido ✓", payOpening: "A abrir o pagamento seguro …",
  payMaking: "O teu vídeo está a ser feito — demora cerca de um minuto. Fica nesta página.",
  payComplete: "Conclui o pagamento na janela que acabou de abrir.",
  readyTitle: "O teu vídeo está pronto 🔥", readyBody: "Desbloqueia-o e vejam-se os dois.",
  watchOnce: "Ver o meu vídeo do beijo — {once}", orAll: "Ou desbloquear tudo — {price}/mês",
  makeVideo: "Fazer o vídeo real do beijo — {once} 🔥", makingKiss: "A fazer o teu vídeo do beijo …",
  freeNote: "A imagem é tua, grátis. {once} paga o vídeo, sem subscrição. ",
  secure: "Pagamento seguro via Stripe",
  download: "⬇ Descarregar o teu vídeo",
  privateNote: "🔒 Este vídeo é privado — só para ti. Por favor não o partilhes nas redes sociais.",
  back: "← Voltar", examples: "Vídeos de beijo a sério 💋",
  einlKnopf: "💌 Enviar como convite", einlTitel: "O vosso convite de casamento",
  einlAdresse: "Rua, n.º, código postal, cidade",
  einlTelefon: "O vosso número de WhatsApp — para confirmações",
  probeHinweis: "Online uma semana — enviem-no aos vossos convidados. As confirmações, o menu e o chat chegam com a subscrição, que também mantém a página ativa.",
  einlSprachen: "Cada convidado vê-o na sua língua — automaticamente.",
  einlVorschau: "É assim que os vossos convidados veem",
  kleidTitel: "Escolhe o teu vestido (opcional)",
  beispielLink: "Abrir um convite real",
  paarTitel: "Ou uma foto dos dois",
  paarHint: "Usada duas vezes: primeiro a tua cara, depois a dele.",
  paarFehler: "Não encontrámos duas caras nessa foto — tentem outra ou enviem as duas fotos em separado.",
  paarBusy: "A ler a foto …",
  paarStoerung: "Agora não funcionou do nosso lado — tentem novamente daqui a pouco.",
  paarSchritt1: "1 de 2 — recorta a TUA cara",
  paarSchritt2: "2 de 2 — agora a DELE",
  fotoWeg: "Remover foto",
  bekommstTitel: "Isto é o que recebem",
  bekommst: [
    "Uma página de convite só vossa, com os nomes, a data e a morada",
    "O vídeo com os dois, com música — podem trocá-lo 5 vezes, os convidados veem sempre o mais recente",
    "Um link para o WhatsApp — sem app e sem registo para os convidados",
    "Os convidados confirmam com um toque; recebem um e-mail assim que alguém responde",
    "Publicam novidades e cada convidado recebe um e-mail com o link — mudou a hora ou o local, todos sabem",
    "Um chat de grupo para os convidados, no próprio convite",
    "Cada convidado lê-o na sua língua, sozinho",
  ],
  einlSie: "O primeiro nome dela", einlEr: "O primeiro nome dele", einlDatum: "Data (opcional)",
  einlOrt: "Local (opcional)", einlMachen: "Criar convite", einlFertig: "O vosso convite está pronto",
  einlWhatsapp: "Enviar o convite", einlKopiert: "Link copiado",
  privat: "🔒 Privado: as tuas fotos ficam sempre privadas. O teu resultado só é publicado se fores tu a partilhá-lo.",
  zustimmung: "Ao carregar uma foto e tocar em Seguinte aceitas os {agb} e a {privacy}, e novidades e ofertas por email.",
  /* Wo es keinen Foto-Upload gibt (Geburtstag seit 07.08.2026), waere die Zusage zum
     HOCHLADEN eines Fotos schlicht falsch — dieselbe Zusage, richtig benannt. */
  zustimmungAufnahme: "Ao gravares-te e tocar em Seguinte aceitas os {agb} e a {privacy}, e novidades e ofertas por email.",
  zustimmungFehlt: "Aceita primeiro as condições.", agbLink: "termos", datenschutzLink: "política de privacidade",
  videosWeg: "Os teus {videos} vídeos deste mês acabaram.",
  aboAktiv: (r, g) => `Subscrição ativa · faltam ${r} de ${g} vídeos este mês`,
  gestrandet: (b, a) => `Tens ${b} — mas em ${a}, não na conta com que iniciaste sessão agora.`,
  gestrandetCta: "Mudar para esse endereço",
  mailVorschlag: (v) => `Querias dizer ${v}?`,
  zahlungAdresse: "O teu vídeo e o teu saldo ficam neste endereço:",
  zahlungAdresseAendern: "Alterar", zahlungAdresseSpeichern: "Guardar",
  extraTitel: "Os teus vídeos deste mês acabaram",
  extraCta: "Mais um vídeo — {extra}", extraNote: "Um vídeo, sem nova subscrição. A tua continua igual.",
  heroA: "Envia um beijo a ", heroY: "quem tu amas", heroB: " 💋",
  wieGehtTitel: "Como funciona",
  karteTitel: (n: string) => (n ? `O meu presente para ${n}: um beijo` : "O meu presente para ti: um beijo"),
  anlass: "Pelo vosso aniversário · pelo aniversário dela · pelo Dia dos Namorados · quando há muito não se veem · depois de uma discussão · sem motivo nenhum",
  grund: "Uma mensagem lê-se e esquece-se. Um vídeo em que se beijam, esse fica.",
  wieGeht: ["Carrega uma foto tua e outra dela ou dele.", "Transformamos os dois num vídeo de um beijo.", "Envia-o — só a essa pessoa."],
  wieGehtPrivat: "Mais ninguém o vê. O teu postal fica privado enquanto não o partilhares tu.",
  anlaesseTitel: "Porque se envia um",
  anlaesse: ["Tens saudades de alguém, e uma mensagem não diz isso.", "Veem-se demasiado pouco.", "Há algo para dizer que não se escreve.", "Não há nada a festejar — é mesmo disso que se trata."],
  anlaesseSchluss: "Um beijo que mandas fazer não é uma mensagem. É uma prova de amor.",
  kussZurueck: "Devolver o beijo 💋",
  namenFrage: "O nome dela ou dele — aparece no postal (opcional)", namenPlatzhalter: "Ana",
  heroLead: "",
  leadA: "Escolhe qualquer pessoa que admires — uma estrela, uma cantora, uma atriz, uma atleta, uma influenciadora ou uma das nossas modelos. Basta uma captura de ecrã.",
  leadB: "Junta uma foto tua e a IA coloca-vos aos dois lado a lado numa festa. Os vossos dois rostos, um vídeo que parece real.",
  fine: "Gerado por IA, não é uma gravação real — e é para ti, não para as redes sociais.",
};


const IT: KissText = {
  step1: "1 · Scegli lei", step2: "2 · La tua foto — tu, l'uomo", step3: "3 · Il bacio", step4: "4 · La tua immagine",
  /* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: „der button muss immer gelch bei allen heissen Generate now - Preis."). */
  generateNow: "Genera ora",
  /* SCHRITT 1 DES TUNNELS — BASIS fuer ALLE Produkte (Owner 12.08.2026: „keine Ausnahme"; vorher nur im VERSPRECHEN-Overlay, alle anderen fielen auf Alt-Texte wie „Continuă — gratuit" zurueck). */
  tunnelStartTitel: "Cominciamo",
  tunnelName: "Il tuo nome",
  tunnelEmail: "La tua email",
  tunnelWeiter: "Avanti",
  pickHint: "Carica la donna che vuoi baciare — o scorri fino a una delle nostre.",
  datenErsetzen: "Cambia foto",
  jetztStarten: "Inizia ora",
  namenVorSenden: "Toccate i vostri nomi qui sopra per inviarlo",
  upTitle: "Persona 1", upHint: "Bacia qualsiasi star — basta uno screenshot.",
  tapChange: "Tocca per cambiare la foto",
  next: "Avanti — gratis →", nextPaid: "Avanti →", pickFirst: "Prima scegli lei", uploadFirst: "Carica la tua foto",
  aboWas: "{videos} video al mese su tutti i temi · ogni altro {extra} · chat gratis · disdici quando vuoi",
  you: "Persona 2", uploadYou: "Carica la tua foto", youHint: "Una foto di te — l'uomo nell'immagine",
  changePhoto: "Cambia foto",
  wardrobe: "Guardaroba e scena", paidBadge: "Video a pagamento",
  wardrobeOpen: "Vestila, tieni i tuoi vestiti o cambiali, scegli il momento.",
  wardrobeLocked: "Si sblocca con un video a pagamento — vestila, scegli il momento.",
  herDress: "Il suo vestito", asInPhoto: "Come nella foto",
  moreOpen: "+ I tuoi vestiti e il momento", moreClose: "− Meno",
  yourClothes: "I tuoi vestiti", myOwnClothes: "I miei vestiti", theMoment: "Il momento", surpriseMe: "✨ Sorprendimi",
  mailQuestion: "Dove ti mandiamo la tua immagine?",
  tunnelOder: "oppure", tunnelGoogle: "Continua con Google",
  vorlageAnsehen: "Guarda il video di esempio",
  gateTitel: "Prima la tua email — così possiamo inviarti il risultato.", gateWeiter: "Continua",
  mailNote: "Gratis. Ti mandiamo l'immagine e la teniamo nella tua galleria.",
  landFrage: "Il tuo paese",
  shareTitel: "Condividere lo rende pubblico", shareText: "Chiunque abbia il link può vedere la tua card. Si mostra solo il risultato finale — mai le foto che hai caricato.", shareOk: "Ho capito — condividi", shareCancel: "Annulla",
  szeneTitel: "Scegli una scena — o lasciati sorprendere",
  ortFrage: "Dove andate?", ortPlatzhalter: "Tenerife", ortHinweis: "Il luogo entra nel video — scrivilo come glielo diresti.",
  satzFrage: "Scrivi il tuo invito", satzPlatzhalter: "Vieni con me a Tenerife il 21 nov. 2026 …",
  waescheTitel: "Scegli la sua lingerie — o lascia quella del video",
  nochmalVideo: "Genera un altro video",
  aufladeWahlTitel: "Quanto vuoi ricaricare?",
  guthabenVorabHinweis: "Un video costa {once}. Si paga con il tuo credito — la ricarica minima è {topup}, e quel che avanza resta per altri video.",
  aufladen: "Ricarica il conto — {topup}", aufladenHinweis: "Il credito non scade mai · nessun rimborso in contanti", guthaben: "Credito",
  guthabenZuWenig: "Il tuo credito è {stand} — questo prodotto costa {preis}.",
  aufladungNull: "Il tuo ultimo pagamento è stato di 0,00 € (codice promozionale) — quindi non è stato aggiunto credito.",
  mailInvalid: "Inserisci un indirizzo email valido.", oneMoment: "Un attimo …", nochEins: "Ancora uno, altro look", replaceModel: "Sostituisci modella", replaceGewaehlt: "Scelto", erstatten: "Non ti convince? Ti rimborsiamo", geldZurueckGarantie: "Garanzia di rimborso", erstattenSicher: "Tocca di nuovo — rimborso", erstattet: "Rimborsato sul tuo saldo", nochEinsPreis: "Tocca un outfit - {tanz} dal saldo, subito.",
  ctaFree: "Genera l'immagine — gratis", ctaVideo: "Genera il video", rendering: "Generazione …",
  priceLine: "Immagine gratis · Video {once}", paidLine: "✓ Pagato — tutto qui sotto è incluso",
  consent: "Generando confermi di poter usare queste foto, che tutte le persone sono maggiorenni, che lo terrai privato — e che te ne assumi la responsabilità. Le foto con nudità non sono accettate. Caricare la foto di un'altra persona senza il suo consenso non è legale — quella responsabilità è tua.",
  consentKurz: "🔒 Privato · solo per te · generando confermi i {agb}",
  buyOnce: "Video bollente {once}", buyAbo: "Tutto incluso — {price}/mese",
  renderSteps: [
    "Analizziamo la tua foto …", "Vi mettiamo insieme …", "Nasce il bacio …",
    "Sistemiamo la luce …", "Quasi fatto …", "Ultimi ritocchi …",
    "Da un momento all'altro …", "Ci stiamo ancora lavorando — resisti …",
  ],
  teaseSteps: ["Leggiamo i due volti …", "Vi mettiamo insieme …", "Il momento prende vita …"],
  statusQuality: "Il tuo bacio nasce in piena qualità … (max. 10 min)",
  statusCouldNotStart: "Non è stato possibile avviare.", statusFailed: "La generazione è fallita.",
  statusPayCancelled: "La finestra di pagamento si è chiusa senza pagare — tocca di nuovo il pulsante per riprovare.",
  statusTimeout: "Ci è voluto troppo — riprova più tardi.",
  dauertLaenger: "Sta durando più del solito. Puoi chiudere la pagina — ti mandiamo il video finito via email.", statusNetwork: "Errore di rete.",
  statusNotWork: "Non ha funzionato.",
  dressingHer: "La vestiamo …", gettingReady: "Ti prepariamo …",
  renderingVideo: "Il tuo video nasce … (max. 10 min)", schliessenOk: "Puoi chiudere questa pagina — il tuo video ti aspetterà nella tua galleria.", makingVideo: s => `Stiamo facendo il tuo video … (${s} s)`,
  videoFailed: "Il video è fallito.", payPrep: "Pagamento ricevuto — prepariamo il tuo video …",
  failTitle: "Stavolta non è passata",
  failWithMail: m => `Te lo mandiamo a ${m} appena è pronto.`,
  failNoMail: "Riprova con un'altra foto, per favore.", tryAgain: "Riprova",
  blockedTitle: "La tua immagine gratis è finita",
  blockedBody: "Tre immagini gratis a persona. Vai avanti con il video — o sblocca tutto.",
  blockedOnce: "Fai un vero video del bacio — {once}", blockedAll: "Sblocca tutto — {price}/mese",
  payReceived: "Pagamento ricevuto ✓", payOpening: "Apriamo la cassa sicura …",
  payMaking: "Il tuo video si sta facendo — ci vuole circa un minuto. Resta su questa pagina.",
  payComplete: "Completa il pagamento nella finestra che si è appena aperta.",
  readyTitle: "Il tuo video è pronto 🔥", readyBody: "Sbloccalo e guardatevi tutti e due.",
  watchOnce: "Guarda il mio video del bacio — {once}", orAll: "Oppure sblocca tutto — {price}/mese",
  makeVideo: "Fai il vero video del bacio — {once} 🔥", makingKiss: "Stiamo facendo il tuo video del bacio …",
  freeNote: "L'immagine è tua, gratis. {once} paga il video, nessun abbonamento. ",
  secure: "Pagamento sicuro con Stripe",
  download: "⬇ Scarica il tuo video",
  privateNote: "🔒 Questo video è privato — solo per te. Per favore non condividerlo sui social.",
  back: "← Indietro", examples: "Veri video di baci 💋",
  einlKnopf: "💌 Mandalo come invito", einlTitel: "Il vostro invito di matrimonio",
  einlAdresse: "Via, n., CAP, città",
  einlTelefon: "Il vostro numero WhatsApp — per le conferme",
  probeHinweis: "Online per una settimana — inviatelo ai vostri ospiti. Conferme, menù e chat di gruppo arrivano con l’abbonamento, che tiene attiva anche la pagina.",
  einlSprachen: "Ogni invitato lo vede nella sua lingua — automaticamente.",
  einlVorschau: "Ecco cosa vedono i vostri invitati",
  kleidTitel: "Scegli il tuo abito (facoltativo)",
  beispielLink: "Apri un invito vero",
  paarTitel: "Oppure una foto di voi due",
  paarHint: "Usata due volte: prima il tuo viso, poi il suo.",
  paarFehler: "Non abbiamo trovato due volti in quella foto — provane un’altra o carica le due foto separatamente.",
  paarBusy: "Lettura della foto …",
  paarStoerung: "Ora non ha funzionato da parte nostra — riprova tra un momento.",
  paarSchritt1: "1 di 2 — ritaglia il TUO viso",
  paarSchritt2: "2 di 2 — ora il SUO",
  fotoWeg: "Rimuovi foto",
  bekommstTitel: "Ecco cosa ricevete",
  bekommst: [
    "Una pagina d’invito tutta vostra, con i nomi, la data e l’indirizzo",
    "Il video con voi due, con la musica — sostituibile 5 volte, gli invitati vedono sempre il più recente",
    "Un link per WhatsApp — senza app e senza registrazione per i vostri invitati",
    "Gli invitati confermano con un tocco; ricevete un’e-mail appena qualcuno risponde",
    "Pubblicate novità e ogni invitato riceve un’e-mail con il link — cambia l’ora o il luogo e lo sanno tutti",
    "Una chat di gruppo per i vostri invitati, sull’invito stesso",
    "Ogni invitato lo legge nella sua lingua, da solo",
  ],
  einlSie: "Il nome di lei", einlEr: "Il nome di lui", einlDatum: "Data (facoltativo)",
  einlOrt: "Luogo (facoltativo)", einlMachen: "Crea l'invito", einlFertig: "Il vostro invito è pronto",
  einlWhatsapp: "Invia l’invito", einlKopiert: "Link copiato",
  privat: "🔒 Privato: le tue foto restano sempre private. Il tuo risultato viene pubblicato solo se lo condividi tu.",
  zustimmung: "Caricando una foto e toccando Avanti accetti i {agb} e la {privacy}, e novità e offerte via email.",
  /* Wo es keinen Foto-Upload gibt (Geburtstag seit 07.08.2026), waere die Zusage zum
     HOCHLADEN eines Fotos schlicht falsch — dieselbe Zusage, richtig benannt. */
  zustimmungAufnahme: "Filmandoti e toccando Avanti accetti i {agb} e la {privacy}, e novità e offerte via email.",
  zustimmungFehlt: "Accetta prima le condizioni.", agbLink: "termini", datenschutzLink: "informativa privacy",
  videosWeg: "I tuoi {videos} video di questo mese sono finiti.",
  aboAktiv: (r, g) => `Abbonamento attivo · ${r} di ${g} video rimasti questo mese`,
  gestrandet: (b, a) => `Hai ${b} — ma su ${a}, non sull'account con cui hai effettuato l'accesso adesso.`,
  gestrandetCta: "Passa a quell'indirizzo",
  mailVorschlag: (v) => `Intendevi ${v}?`,
  zahlungAdresse: "Il tuo video e il tuo credito sono legati a questo indirizzo:",
  zahlungAdresseAendern: "Modifica", zahlungAdresseSpeichern: "Salva",
  extraTitel: "I tuoi video di questo mese sono finiti",
  extraCta: "Un altro video — {extra}", extraNote: "Un video, nessun nuovo abbonamento. Il tuo continua normalmente.",
  heroA: "Manda un bacio a ", heroY: "chi ami", heroB: " 💋",
  wieGehtTitel: "Come funziona",
  karteTitel: (n: string) => (n ? `Il mio regalo per ${n}: un bacio` : "Il mio regalo per te: un bacio"),
  anlass: "Per il vostro anniversario · per il suo compleanno · per San Valentino · quando non vi vedete da tanto · dopo un litigio · senza motivo",
  grund: "Un messaggio si legge e si dimentica. Un video in cui vi baciate, quello lo tiene.",
  wieGeht: ["Carica una foto tua e una di lei o di lui.", "Trasformiamo voi due in un video con un bacio.", "Mandalo — solo a quella persona."],
  wieGehtPrivat: "Nessun altro lo vede. Il tuo biglietto resta privato finché non lo condividi tu.",
  anlaesseTitel: "Perché mandarne uno",
  anlaesse: ["Ti manca qualcuno, e un messaggio non lo dice.", "Vi vedete troppo di rado.", "C'è qualcosa da dire che non si può scrivere.", "Non c'è niente da festeggiare — è proprio questo il punto."],
  anlaesseSchluss: "Un bacio che fai fare non è un messaggio. È una prova d'amore.",
  kussZurueck: "Rimanda un bacio 💋",
  namenFrage: "Il suo nome — appare nel biglietto (facoltativo)", namenPlatzhalter: "Anna",
  heroLead: "",
  leadA: "Prendi chiunque tu ammiri — una superstar, una cantante, un'attrice, una sportiva, un'influencer o una delle nostre modelle. Basta uno screenshot.",
  leadB: "Aggiungi una tua foto e l'IA mette voi due insieme a una festa, fianco a fianco. I vostri due volti, un video che sembra vero.",
  fine: "Generato dall'IA, non è una registrazione reale — ed è per te, non per i social.",
};

const TABELLE: Record<Lang, KissText> = { en: EN, de: DE, ro: RO, es: ES, fr: FR, pt: PT, it: IT };

/**
 * „YOUR IDOL" — derselbe Trichter, andere Sprache an sechs Stellen: dort geht es nicht um
 * einen Kuss, sondern um einen gemeinsamen Moment. Nur die Abweichungen stehen hier; alles
 * andere kommt aus der Tabelle oben und muss nie zweimal gepflegt werden.
 */
const IDOL: Record<Lang, Partial<KissText>> = {
  en: {
    step1: "1 · Pick your idol", step3: "3 · The moment",
    pickHint: "Any singer, actress, athlete or influencer — swipe to your own upload, or take one of ours.",
    upTitle: "Your idol", upHint: "Any star you like — just upload one screenshot of her or him.",
    readyTitle: "Your video is ready ✨", makeVideo: "Make a real video 🔥", makingKiss: "Making your video …",
    watchOnce: "Watch my video — {once}", blockedOnce: "Make a real video — {once}",
    heroA: "Your idol ", heroY: "with you", heroB: " ✨",
    examples: "The two of you ✨",
  },
  de: {
    step1: "1 · Wähle dein Idol", step3: "3 · Der Moment",
    pickHint: "Sängerin, Schauspielerin, Sportlerin oder Influencerin — wische zu deinem eigenen Foto oder nimm eine von uns.",
    upTitle: "Dein Idol", upHint: "Wer immer dir gefällt — ein Bildschirmfoto genügt.",
    readyTitle: "Dein Video ist fertig ✨", makeVideo: "Echtes Video machen 🔥", makingKiss: "Dein Video entsteht …",
    watchOnce: "Mein Video ansehen — {once}", blockedOnce: "Echtes Video machen — {once}",
    heroA: "Dein Idol ", heroY: "mit dir", heroB: " ✨",
    examples: "Ihr beide ✨",
  },
  ro: {
    step1: "1 · Alege-ți idolul", step3: "3 · Momentul",
    pickHint: "Cântăreață, actriță, sportivă sau influenceriță — glisează la poza ta sau ia una dintre ale noastre.",
    upTitle: "Idolul tău", upHint: "Oricine îți place — o captură de ecran e de ajuns.",
    readyTitle: "Videoclipul tău e gata ✨", makeVideo: "Fă un video real 🔥", makingKiss: "Se face videoclipul tău …",
    watchOnce: "Vreau să-mi văd videoclipul — {once}", blockedOnce: "Fă un video real — {once}",
    heroA: "Idolul tău ", heroY: "lângă tine", heroB: " ✨",
    examples: "Voi doi ✨",
  },
  es: {
    step1: "1 · Elige a tu ídolo", step3: "3 · El momento",
    pickHint: "Cantante, actriz, deportista o influencer — desliza a tu propia foto o coge una de las nuestras.",
    upTitle: "Tu ídolo", upHint: "Quien tú quieras — basta con una captura de pantalla.",
    readyTitle: "Tu vídeo está listo ✨", makeVideo: "Haz un vídeo real 🔥", makingKiss: "Creando tu vídeo …",
    watchOnce: "Ver mi vídeo — {once}", blockedOnce: "Haz un vídeo real — {once}",
    heroA: "Tu ídolo ", heroY: "contigo", heroB: " ✨",
    examples: "Vosotros dos ✨",
  },
  fr: {
    step1: "1 · Choisis ton idole", step3: "3 · Le moment",
    pickHint: "Chanteuse, actrice, sportive ou influenceuse — glisse vers ta propre photo ou prends l'une des nôtres.",
    upTitle: "Ton idole", upHint: "Qui tu veux — une capture d'écran suffit.",
    readyTitle: "Ta vidéo est prête ✨", makeVideo: "Faire une vraie vidéo 🔥", makingKiss: "Ta vidéo se fait …",
    watchOnce: "Voir ma vidéo — {once}", blockedOnce: "Faire une vraie vidéo — {once}",
    heroA: "Ton idole ", heroY: "avec toi", heroB: " ✨",
    examples: "Vous deux ✨",
  },
  pt: {
    step1: "1 · Escolhe o teu ídolo", step3: "3 · O momento",
    pickHint: "Cantora, atriz, atleta ou influenciadora — desliza para a tua foto ou escolhe uma das nossas.",
    upTitle: "O teu ídolo", upHint: "Quem quiseres — basta uma captura de ecrã.",
    readyTitle: "O teu vídeo está pronto ✨", makeVideo: "Fazer um vídeo a sério 🔥", makingKiss: "A fazer o teu vídeo …",
    watchOnce: "Ver o meu vídeo — {once}", blockedOnce: "Fazer um vídeo a sério — {once}",
    heroA: "O teu ídolo ", heroY: "contigo", heroB: " ✨",
    examples: "Vocês os dois ✨",
  },
  it: {
    step1: "1 · Scegli il tuo idolo", step3: "3 · Il momento",
    pickHint: "Cantante, attrice, sportiva o influencer — scorri fino alla tua foto o prendi una delle nostre.",
    upTitle: "Il tuo idolo", upHint: "Chi vuoi tu — basta uno screenshot.",
    readyTitle: "Il tuo video è pronto ✨", makeVideo: "Fai un vero video 🔥", makingKiss: "Stiamo facendo il tuo video …",
    watchOnce: "Guarda il mio video — {once}", blockedOnce: "Fai un vero video — {once}",
    heroA: "Il tuo idolo ", heroY: "con te", heroB: " ✨",
    examples: "Voi due ✨",
  },
};

/**
 * „SURPRISE HIM" — der Tanz (Owner 03.08.2026: „surprise him with a pool hot dance video …
 * der Upload-Mann wird nicht mehr gebraucht. Die Frau wird hochgeladen, sie selbst").
 *
 * Drei Dinge kehren sich gegenueber dem Kuss um, und nur die stehen hier:
 *
 * 1. ES IST EIN FOTO, NICHT ZWEI. Schritt 2 („dein Foto — du, der Mann") faellt weg, also
 *    ruecken die Nummern: aus „1 · 3" wird „1 · 2". Die Zahlen stehen IM Text, nicht im Code —
 *    sonst zaehlt der Trichter „1, 3" und der Kunde fragt sich, was er uebersprungen hat.
 * 2. SIE BEDIENT DEN TRICHTER. Beim Kuss laedt er sie hoch; hier laedt sie SICH SELBST hoch
 *    und schickt IHM etwas. „Sein Name" statt „ihr Name", „dein Foto" statt „ihr Foto".
 * 3. DIE ZUSTIMMUNG TRAEGT EINEN HALBSATZ MEHR: „die Person auf dem Foto bist du oder hat es
 *    dir erlaubt". Beim Kuss laedt jemand ein Gesicht hoch, das gekuesst wird; hier landet ein
 *    Gesicht in Unterwaesche. Das ist derselbe Upload und eine andere Tragweite — und der Satz
 *    kostet nichts ausser einer Zeile.
 *
 * PREIS: {tanz} statt {once} (Owner 03.08.2026: „eigentlich nicht, es soll 3,99 kosten").
 * Die Zahl steht nirgends hier — nur der Platzhalter, gefuellt aus lib/pricing.ts.
 */
const POLEDANCE: Record<Lang, Partial<KissText>> = {
  en: {
    anlass: "For your anniversary · for his birthday · when you are in different cities · after a long week apart · when you want to say it without words",
    grund: "A photo gets a heart back. A video of you on the pole he watches again.",
    step1: "1 · Your photo", step3: "2 · Your dance", pickFirst: "Upload your photo",
    upTitle: "Your photo", upHint: "One photo of you — head and shoulders is enough. The set does the rest.", upRegel: "Upload a normal photo of yourself, dressed, face clearly visible. You get yourself in the set you picked, dancing. It is not a nude video — upload something else and you get something else, and that is not covered by the money-back promise.",
    mailQuestion: "Where should we send your video?",
    namenFrage: "His name — it appears on the card (optional)", namenPlatzhalter: "Chris",
    heroA: "Surprise him with ", heroY: "a hot pole dance", heroB: " 💃",
    wieGeht: ["Upload one photo of yourself.", "We put you in the outfit and on the pole.", "Send it to him — to him alone."],
    wieGehtPrivat: "Nobody else sees it. Your video stays private unless you send it yourself.",
    karteTitel: (n: string) => (n ? `My gift for ${n}: a dance` : "My gift for you: a dance"),
    priceLine: "Video {tanz}", buyOnce: "Hot video {tanz}",
    guthabenVorabHinweis: "One video costs {tanz}. You pay from your account balance — the smallest top-up is {topup}, and whatever is left stays yours for more videos.",
    makeVideo: "Make my dance video — {tanz} 🔥", makingKiss: "Making your dance video …",
    watchOnce: "Watch my video — {tanz}", blockedOnce: "Make a real dance video — {tanz}",
    readyBody: "Unlock it and watch yourself dance.",
    statusQuality: "Rendering your dance in full quality … (max. 10 min)",
    renderSteps: [
      "Reading your photo …", "Putting on the outfit …", "Setting the neon lights …",
      "Getting the movement right …", "Almost there …", "Finishing touches …",
      "Any second now …", "Still working — hang on …",
    ],
    teaseSteps: ["Reading your face …", "Putting on the outfit …", "Lighting the stage …"],
    examples: "Real dance videos 💃",
    consent: "By generating you confirm that the person in the photo is you or has allowed you to use it, that everyone shown is an adult, that you keep the result private — and that you take full responsibility for it. Nudity photos are not accepted.",
    anlaesseTitel: "Why send one",
    anlaesse: ["He is away and the evening is long.", "Your anniversary — and he already has everything.", "You want to see his face when he opens it.", "No reason at all. That is the best one."],
    anlaesseSchluss: "It is not a message. It is a surprise he will not forget.",
    kussZurueck: "Make your own 💃",
  },
  de: {
    anlass: "Zum Jahrestag · zu seinem Geburtstag · wenn ihr in verschiedenen Städten seid · nach einer langen Woche getrennt · wenn du es ohne Worte sagen willst",
    grund: "Auf ein Foto kommt ein Herz zurück. Ein Video, in dem du an der Stange tanzt, sieht er wieder und wieder.",
    step1: "1 · Dein Foto", step3: "2 · Dein Tanz", pickFirst: "Lade dein Foto hoch",
    upTitle: "Dein Foto", upHint: "Ein Foto von dir — Kopf und Schultern reichen. Den Rest macht das Set.", upRegel: "Lade ein normales Foto von dir hoch, angezogen, Gesicht gut sichtbar. Du bekommst dich im gewählten Set, tanzend. Es ist kein Nacktvideo — wer etwas anderes hochlädt, bekommt etwas anderes, und dafür gilt die Geld-zurück-Zusage nicht.",
    mailQuestion: "Wohin sollen wir dein Video schicken?",
    namenFrage: "Sein Name — er erscheint auf der Karte (freiwillig)", namenPlatzhalter: "Chris",
    heroA: "Überrasch ihn mit ", heroY: "einem heißen Poledance", heroB: " 💃",
    wieGeht: ["Lade ein Foto von dir hoch.", "Wir stecken dich in das Outfit und an die Stange.", "Schick es ihm — nur ihm."],
    wieGehtPrivat: "Niemand sonst sieht es. Dein Video bleibt privat, solange du es nicht selbst verschickst.",
    karteTitel: (n: string) => (n ? `Mein Geschenk für ${n}: einen Tanz` : "Mein Geschenk für dich: einen Tanz"),
    priceLine: "Video {tanz}", buyOnce: "Heißes Video {tanz}",
    guthabenVorabHinweis: "Ein Video kostet {tanz}. Du zahlst aus deinem Guthaben — die kleinste Aufladung ist {topup}, und was übrig bleibt, gehört weiter dir.",
    makeVideo: "Mein Tanzvideo machen — {tanz} 🔥", makingKiss: "Dein Tanzvideo entsteht …",
    watchOnce: "Mein Video ansehen — {tanz}", blockedOnce: "Echtes Tanzvideo machen — {tanz}",
    readyBody: "Schalte es frei und sieh dich tanzen.",
    statusQuality: "Dein Tanz wird in voller Qualität gerendert … (max. 10 Min.)",
    renderSteps: [
      "Dein Foto wird gelesen …", "Das Outfit wird angelegt …", "Das Neonlicht wird gesetzt …",
      "Die Bewegung entsteht …", "Fast fertig …", "Letzter Schliff …",
      "Gleich ist es so weit …", "Noch einen Moment …",
    ],
    teaseSteps: ["Dein Gesicht wird gelesen …", "Das Outfit wird angelegt …", "Die Bühne wird beleuchtet …"],
    examples: "Echte Tanzvideos 💃",
    consent: "Mit dem Erzeugen bestätigst du, dass die Person auf dem Foto du bist oder dir erlaubt hat, es zu benutzen, dass alle gezeigten Personen erwachsen sind, dass du das Ergebnis privat behältst — und dass du die Verantwortung dafür trägst. Nacktfotos werden nicht angenommen.",
    anlaesseTitel: "Warum du eins schickst",
    anlaesse: ["Er ist weg und der Abend ist lang.", "Euer Jahrestag — und er hat schon alles.", "Du willst sein Gesicht sehen, wenn er es öffnet.", "Gar kein Anlass. Das ist der beste."],
    anlaesseSchluss: "Das ist keine Nachricht. Das ist eine Überraschung, die er nicht vergisst.",
    kussZurueck: "Mach dir selbst eins 💃",
  },
  ro: {
    anlass: "De aniversarea voastră · de ziua lui · când sunteți în orașe diferite · după o săptămână lungă departe · când vrei să o spui fără cuvinte",
    grund: "La o poză primești o inimioară. Un videoclip în care dansezi la bară îl privește din nou.",
    step1: "1 · Poza ta", step3: "2 · Dansul tău", pickFirst: "Încarcă poza ta",
    upTitle: "Poza ta", upHint: "O poză cu tine — ajung capul și umerii. Restul îl face ținuta.", upRegel: "Încarcă o poză normală cu tine, îmbrăcată, cu fața bine vizibilă. Primești chiar pe tine în ținuta aleasă, dansând. Nu este un video nud — dacă încarci altceva, primești altceva, iar garanția de returnare nu se aplică.",
    mailQuestion: "Unde să-ți trimitem videoclipul?",
    namenFrage: "Numele lui — apare pe felicitare (opțional)", namenPlatzhalter: "Chris",
    heroA: "Surprinde-l cu ", heroY: "un dans la bară", heroB: " 💃",
    wieGeht: ["Încarcă o singură poză cu tine.", "Te punem în ținută și la bară.", "Trimite-i-l — doar lui."],
    wieGehtPrivat: "Nimeni altcineva nu îl vede. Videoclipul rămâne privat dacă nu îl trimiți tu.",
    karteTitel: (n: string) => (n ? `Cadoul meu pentru ${n}: un dans` : "Cadoul meu pentru tine: un dans"),
    priceLine: "Video {tanz}", buyOnce: "Video fierbinte {tanz}",
    guthabenVorabHinweis: "Un videoclip costă {tanz}. Plătești din soldul contului — cea mai mică reîncărcare e {topup}, iar restul rămâne al tău pentru alte videoclipuri.",
    makeVideo: "Fă-mi videoclipul cu dans — {tanz} 🔥", makingKiss: "Se face videoclipul tău …",
    watchOnce: "Vreau să-mi văd videoclipul — {tanz}", blockedOnce: "Fă un video real cu dans — {tanz}",
    readyBody: "Deblochează-l și vezi-te dansând.",
    statusQuality: "Dansul tău se randează la calitate maximă … (max. 10 min)",
    renderSteps: [
      "Îți citim poza …", "Îmbrăcăm ținuta …", "Punem luminile de neon …",
      "Potrivim mișcarea …", "Aproape gata …", "Ultimele retușuri …",
      "Imediat …", "Încă lucrăm — mai stai puțin …",
    ],
    teaseSteps: ["Îți citim chipul …", "Îmbrăcăm ținuta …", "Aprindem scena …"],
    examples: "Videoclipuri reale cu dans 💃",
    consent: "Prin generare confirmi că persoana din poză ești tu sau ți-a dat voie să o folosești, că toate persoanele sunt adulte, că păstrezi rezultatul privat — și că îți asumi răspunderea. Pozele cu nuditate nu sunt acceptate.",
    anlaesseTitel: "De ce să trimiți unul",
    anlaesse: ["El e plecat și seara e lungă.", "Aniversarea voastră — și el are deja de toate.", "Vrei să-i vezi fața când îl deschide.", "Fără niciun motiv. Ăsta e cel mai bun."],
    anlaesseSchluss: "Nu e un mesaj. E o surpriză pe care n-o uită.",
    kussZurueck: "Fă-ți și tu unul 💃",
  },
  es: {
    anlass: "Por vuestro aniversario · por su cumpleaños · cuando estáis en ciudades distintas · después de una semana larga separados · cuando quieres decírselo sin palabras",
    grund: "A una foto te devuelven un corazón. Un vídeo en el que bailas en la barra lo vuelve a ver.",
    step1: "1 · Tu foto", step3: "2 · Tu baile", pickFirst: "Sube tu foto",
    upTitle: "Tu foto", upHint: "Una foto tuya — basta cabeza y hombros. El resto lo hace el conjunto.", upRegel: "Sube una foto normal tuya, vestida y con la cara bien visible. Recibes a ti misma con el conjunto elegido, bailando. No es un vídeo de desnudos: si subes otra cosa, recibes otra cosa, y la garantía de devolución no se aplica.",
    mailQuestion: "¿Adónde te enviamos tu vídeo?",
    namenFrage: "Su nombre — aparece en la tarjeta (opcional)", namenPlatzhalter: "Chris",
    heroA: "Sorpréndelo con ", heroY: "un baile en barra", heroB: " 💃",
    wieGeht: ["Sube una sola foto tuya.", "Te ponemos el conjunto y te subimos a la barra.", "Envíaselo — solo a él."],
    wieGehtPrivat: "Nadie más lo ve. Tu vídeo sigue siendo privado mientras no lo envíes tú.",
    karteTitel: (n: string) => (n ? `Mi regalo para ${n}: un baile` : "Mi regalo para ti: un baile"),
    priceLine: "Vídeo {tanz}", buyOnce: "Vídeo caliente {tanz}",
    guthabenVorabHinweis: "Un vídeo cuesta {tanz}. Pagas con el saldo de tu cuenta — la recarga más pequeña es {topup}, y lo que sobre sigue siendo tuyo para más vídeos.",
    makeVideo: "Hacer mi vídeo de baile — {tanz} 🔥", makingKiss: "Creando tu vídeo de baile …",
    watchOnce: "Ver mi vídeo — {tanz}", blockedOnce: "Haz un vídeo de baile real — {tanz}",
    readyBody: "Desbloquéalo y mírate bailar.",
    statusQuality: "Renderizando tu baile en máxima calidad … (max. 10 min)",
    renderSteps: [
      "Leyendo tu foto …", "Poniendo el conjunto …", "Colocando las luces de neón …",
      "Ajustando el movimiento …", "Casi está …", "Últimos retoques …",
      "En cualquier momento …", "Seguimos trabajando — un poco más …",
    ],
    teaseSteps: ["Leyendo tu cara …", "Poniendo el conjunto …", "Iluminando el escenario …"],
    examples: "Vídeos de baile reales 💃",
    consent: "Al generar confirmas que la persona de la foto eres tú o te ha dado permiso para usarla, que todas las personas son adultas, que mantienes el resultado en privado — y que asumes la responsabilidad. No se aceptan fotos con desnudos.",
    anlaesseTitel: "Por qué enviar uno",
    anlaesse: ["Él está lejos y la noche es larga.", "Vuestro aniversario — y él ya lo tiene todo.", "Quieres ver su cara cuando lo abra.", "Sin motivo alguno. Ese es el mejor."],
    anlaesseSchluss: "No es un mensaje. Es una sorpresa que no olvida.",
    kussZurueck: "Hazte el tuyo 💃",
  },
  fr: {
    anlass: "Pour votre anniversaire · pour son anniversaire à lui · quand vous êtes dans deux villes · après une longue semaine loin l'un de l'autre · quand tu veux le dire sans mots",
    grund: "À une photo, il répond par un cœur. Une vidéo où tu danses à la barre, il la regarde encore.",
    step1: "1 · Ta photo", step3: "2 · Ta danse", pickFirst: "Envoie ta photo",
    upTitle: "Ta photo", upHint: "Une photo de toi — la tête et les épaules suffisent. La tenue fait le reste.", upRegel: "Envoie une photo normale de toi, habillée, le visage bien visible. Tu te retrouves dans la tenue choisie, en train de danser. Ce n\u2019est pas une vidéo de nu — si tu envoies autre chose, tu obtiens autre chose, et la garantie de remboursement ne s\u2019applique pas.",
    mailQuestion: "Où devons-nous envoyer ta vidéo ?",
    namenFrage: "Son prénom — il apparaît sur la carte (facultatif)", namenPlatzhalter: "Chris",
    heroA: "Surprends-le avec ", heroY: "une danse à la barre", heroB: " 💃",
    wieGeht: ["Envoie une seule photo de toi.", "On te met la tenue et on te place à la barre.", "Envoie-la-lui — à lui seul."],
    wieGehtPrivat: "Personne d'autre ne la voit. Ta vidéo reste privée tant que tu ne l'envoies pas toi-même.",
    karteTitel: (n: string) => (n ? `Mon cadeau pour ${n} : une danse` : "Mon cadeau pour toi : une danse"),
    priceLine: "Vidéo {tanz}", buyOnce: "Vidéo chaude {tanz}",
    guthabenVorabHinweis: "Une vidéo coûte {tanz}. Tu paies avec le solde de ton compte — la plus petite recharge est {topup}, et ce qui reste t'appartient pour d'autres vidéos.",
    makeVideo: "Faire ma vidéo de danse — {tanz} 🔥", makingKiss: "Ta vidéo de danse se fait …",
    watchOnce: "Voir ma vidéo — {tanz}", blockedOnce: "Faire une vraie vidéo de danse — {tanz}",
    readyBody: "Débloque-la et regarde-toi danser.",
    statusQuality: "Ta danse est rendue en pleine qualité … (max. 10 min)",
    renderSteps: [
      "Lecture de ta photo …", "On enfile la tenue …", "On règle les néons …",
      "On ajuste le mouvement …", "Presque fini …", "Dernières retouches …",
      "C'est pour tout de suite …", "On travaille encore — patiente …",
    ],
    teaseSteps: ["Lecture de ton visage …", "On enfile la tenue …", "On éclaire la scène …"],
    examples: "Vraies vidéos de danse 💃",
    consent: "En générant, tu confirmes que la personne sur la photo est toi ou t'a autorisée à l'utiliser, que toutes les personnes sont majeures, que tu gardes le résultat privé — et que tu en assumes la responsabilité. Les photos de nu ne sont pas acceptées.",
    anlaesseTitel: "Pourquoi en envoyer une",
    anlaesse: ["Il est loin et la soirée est longue.", "Votre anniversaire — et il a déjà tout.", "Tu veux voir sa tête quand il l'ouvre.", "Aucune raison. C'est la meilleure."],
    anlaesseSchluss: "Ce n'est pas un message. C'est une surprise qu'il n'oublie pas.",
    kussZurueck: "Fais la tienne 💃",
  },
  pt: {
    anlass: "Pelo vosso aniversário · pelo aniversário dele · quando estão em cidades diferentes · depois de uma semana longa longe · quando queres dizê-lo sem palavras",
    grund: "A uma foto respondem com um coração. Um vídeo em que danças no varão ele vê outra vez.",
    step1: "1 · A tua foto", step3: "2 · A tua dança", pickFirst: "Carrega a tua foto",
    upTitle: "A tua foto", upHint: "Uma foto tua — chega a cabeça e os ombros. O resto fá-lo o conjunto.", upRegel: "Carrega uma foto normal tua, vestida e com o rosto bem visível. Recebes-te a ti no conjunto escolhido, a dançar. Não é um vídeo de nu — se carregares outra coisa, recebes outra coisa, e a garantia de devolução não se aplica.",
    mailQuestion: "Para onde enviamos o teu vídeo?",
    namenFrage: "O nome dele — aparece no cartão (opcional)", namenPlatzhalter: "Chris",
    heroA: "Surpreende-o com ", heroY: "uma dança no varão", heroB: " 💃",
    wieGeht: ["Carrega uma única foto tua.", "Vestimos-te o conjunto e pomos-te no varão.", "Envia-lho — só a ele."],
    wieGehtPrivat: "Mais ninguém o vê. O teu vídeo fica privado enquanto não o enviares tu.",
    karteTitel: (n: string) => (n ? `O meu presente para ${n}: uma dança` : "O meu presente para ti: uma dança"),
    priceLine: "Vídeo {tanz}", buyOnce: "Vídeo quente {tanz}",
    guthabenVorabHinweis: "Um vídeo custa {tanz}. Pagas com o saldo da tua conta — o carregamento mais pequeno é {topup}, e o que sobrar continua a ser teu para mais vídeos.",
    makeVideo: "Fazer o meu vídeo de dança — {tanz} 🔥", makingKiss: "A fazer o teu vídeo de dança …",
    watchOnce: "Ver o meu vídeo — {tanz}", blockedOnce: "Fazer um vídeo de dança a sério — {tanz}",
    readyBody: "Desbloqueia-o e vê-te a dançar.",
    statusQuality: "A tua dança está a ser gerada em qualidade máxima … (max. 10 min)",
    renderSteps: [
      "A ler a tua foto …", "A vestir o conjunto …", "A pôr as luzes de néon …",
      "A acertar o movimento …", "Quase lá …", "Últimos retoques …",
      "É já a seguir …", "Ainda a trabalhar — aguenta …",
    ],
    teaseSteps: ["A ler o teu rosto …", "A vestir o conjunto …", "A iluminar o palco …"],
    examples: "Vídeos de dança a sério 💃",
    consent: "Ao gerar confirmas que a pessoa na foto és tu ou te autorizou a usá-la, que todas as pessoas são adultas, que manténs o resultado privado — e que assumes a responsabilidade. Fotos com nudez não são aceites.",
    anlaesseTitel: "Porquê enviar um",
    anlaesse: ["Ele está longe e a noite é longa.", "O vosso aniversário — e ele já tem tudo.", "Queres ver a cara dele quando abrir.", "Sem motivo nenhum. Esse é o melhor."],
    anlaesseSchluss: "Não é uma mensagem. É uma surpresa que ele não esquece.",
    kussZurueck: "Faz o teu 💃",
  },
  it: {
    anlass: "Per il vostro anniversario · per il suo compleanno · quando siete in due città · dopo una settimana lunga lontani · quando vuoi dirlo senza parole",
    grund: "A una foto risponde con un cuore. Un video in cui balli alla pole se lo riguarda.",
    step1: "1 · La tua foto", step3: "2 · Il tuo ballo", pickFirst: "Carica la tua foto",
    upTitle: "La tua foto", upHint: "Una foto di te — bastano testa e spalle. Al resto pensa il completo.", upRegel: "Carica una foto normale di te, vestita e con il viso ben visibile. Ricevi te stessa nel completo scelto, mentre balli. Non è un video di nudo: se carichi altro, ottieni altro, e la garanzia di rimborso non vale.",
    mailQuestion: "Dove ti mandiamo il video?",
    namenFrage: "Il suo nome — compare sulla card (facoltativo)", namenPlatzhalter: "Chris",
    heroA: "Sorprendilo con ", heroY: "un ballo alla pole", heroB: " 💃",
    wieGeht: ["Carica una sola foto di te.", "Ti mettiamo il completo e ti portiamo alla pole.", "Mandaglielo — solo a lui."],
    wieGehtPrivat: "Non lo vede nessun altro. Il tuo video resta privato finché non lo mandi tu.",
    karteTitel: (n: string) => (n ? `Il mio regalo per ${n}: un ballo` : "Il mio regalo per te: un ballo"),
    priceLine: "Video {tanz}", buyOnce: "Video bollente {tanz}",
    guthabenVorabHinweis: "Un video costa {tanz}. Paghi dal saldo del tuo conto — la ricarica più piccola è {topup}, e quello che avanza resta tuo per altri video.",
    makeVideo: "Fai il mio video di ballo — {tanz} 🔥", makingKiss: "Stiamo facendo il tuo video di ballo …",
    watchOnce: "Guarda il mio video — {tanz}", blockedOnce: "Fai un vero video di ballo — {tanz}",
    readyBody: "Sbloccalo e guardati ballare.",
    statusQuality: "Il tuo ballo viene generato in piena qualità … (max. 10 min)",
    renderSteps: [
      "Leggiamo la tua foto …", "Indossiamo il completo …", "Sistemiamo le luci al neon …",
      "Mettiamo a punto il movimento …", "Ci siamo quasi …", "Ultimi ritocchi …",
      "Da un momento all'altro …", "Ancora al lavoro — un attimo …",
    ],
    teaseSteps: ["Leggiamo il tuo viso …", "Indossiamo il completo …", "Illuminiamo il palco …"],
    examples: "Veri video di ballo 💃",
    consent: "Generando confermi che la persona nella foto sei tu o ti ha autorizzata a usarla, che tutte le persone sono maggiorenni, che tieni il risultato privato — e che te ne assumi la responsabilità. Le foto di nudo non sono accettate.",
    anlaesseTitel: "Perché mandarne uno",
    anlaesse: ["Lui è lontano e la serata è lunga.", "Il vostro anniversario — e lui ha già tutto.", "Vuoi vedere la sua faccia quando lo apre.", "Nessun motivo. È il migliore."],
    anlaesseSchluss: "Non è un messaggio. È una sorpresa che non dimentica.",
    kussZurueck: "Fatti il tuo 💃",
  },
};

/**
 * „HOCHZEITSKUSS" — dieselbe Maschine, anderer Moment (Owner 30.07.2026: „ich will eher wie
 * sie sich einen Hochzeitskuss geben als Bild. Sie und er … vielleicht duplizierst du einfach
 * Kiss" — „die Frauen lieben Hochzeiten").
 *
 * Der wichtige Unterschied steckt nicht im Bild, sondern in den ROLLEN: Hier bedient SIE den
 * Trichter. Schritt 1 ist die Braut (sie selbst), Schritt 2 der Braeutigam (er). Deshalb
 * werden hier auch `step2`, `you`, `uploadYou` und `youHint` mituebersetzt — beim Kuss steht
 * dort „du, der Mann".
 */
const HOCHZEIT: Record<Lang, Partial<KissText>> = {
  en: {
    anlass: "For the engagement · for the save the date · for the invitation itself · when your guests are spread over three countries · when nobody answers the paper card",
    grund: "A printed card ends up in a drawer. A page with your video, the replies and the guest list stays open on their phone.",
    wieGeht: ["Upload one photo of her and one of him.", "We make your wedding video and your own invitation page.", "Send one link — the replies land with you."],
    wieGehtPrivat: "Your page is not listed anywhere and Google cannot find it — only the people you send the link to can open it.",
    pickFirst: "Upload your photo first",
    mailQuestion: "Your email address",
    uploadFirst: "Upload his photo",
    step1: "1 · The bride",
    step2: "2 · The groom",
    step3: "3 · Your invitation",
    step4: "4 · Your picture",
    pickHint: "One photo of you, one of him — that is all it takes.",
    datenErsetzen: "Replace the details",
    namenVorSenden: "Tap your names above to send the invitation",
    szeneTitel: "Pick your scene",
    upTitle: "You, the bride",
    upHint: "One photo of you is enough.",
    you: "HIM",
    uploadYou: "Upload his photo",
    youHint: "A photo of him — the groom",
    readyTitle: "Your invitation is ready 💍",
    makeVideo: "Animate the card — {price}/month ✨",
    makingKiss: "Your invitation is being made …",
    watchOnce: "Watch our invitation video",
    blockedOnce: "Unlock the invitation",
    heroA: "Your ",
    heroY: "wedding planner",
    heroB: " 💍",
    examples: "This is what your invitation looks like",
    statusQuality: "Your invitation video is being created in full quality … (max. 10 min)",
    blockedBody: "Three free pictures per person. Now make your wedding video.",
    buyOnce: "Unlock the invitation",
    blockedAll: "Unlock your invitation — {price}/month",
    orAll: "Or unlock your invitation — {price}/month",
    buyAbo: "Invitation {price}/mo",
    freeNote: "The picture is yours, free. The invitation — page, guest list, news and group — is {price} a month, cancel any time. ",
    priceLine: "Picture free · Invitation {price}/mo",
    wardrobeLocked: "Included in the invitation — pick her gown.",
    paidBadge: "In the invitation",
    blockedTitle: "Your free picture is used up",
    renderSteps: ["Your photo is being read …","The two of you are being brought together …","Your invitation is taking shape …","The light is being set …","Almost there …","Final touches …","Any moment now …","Still running — hang on …"],
    teaseSteps: ["Both faces are being read …","The two of you are being brought together …","The moment comes alive …"],
    readyBody: "Unlock it and send it to your guests.",
    ctaVideo: "Create the invitation",
    download: "⬇ Download your invitation video",
    payMaking: "Your invitation is being made — about a minute. Stay on this page.",
    payPrep: "Payment received — your invitation is being prepared …",
    privateNote: "🔒 This is private — just for the two of you and the guests you send it to.",
    renderingVideo: "Your invitation is being created … (max. 10 min)",
    videoFailed: "The invitation could not be created.",
    wardrobeOpen: "Pick her gown for the invitation.",
    extraCta: "One more version — {extra}",
    extraNote: "One extra render, not a new subscription. Yours keeps running.",
  },
  de: {
    anlass: "Zur Verlobung · für Save the Date · für die Einladung selbst · wenn eure Gäste über drei Länder verteilt sind · wenn auf die Papierkarte niemand antwortet",
    grund: "Eine gedruckte Karte landet in der Schublade. Eine Seite mit eurem Video, den Zusagen und der Gästeliste bleibt auf dem Handy offen.",
    wieGeht: ["Lade ein Foto von ihr hoch und eins von ihm.", "Wir machen euer Hochzeitsvideo und eure eigene Einladungsseite.", "Verschickt einen Link — die Zusagen landen bei euch."],
    wieGehtPrivat: "Eure Seite steht nirgends und Google findet sie nicht — öffnen kann sie nur, wem ihr den Link schickt.",
    pickFirst: "Lade zuerst dein Foto hoch",
    mailQuestion: "Deine E-Mail-Adresse",
    uploadFirst: "Lade sein Foto hoch",
    step1: "1 · Die Braut",
    step2: "2 · Der Bräutigam",
    step3: "3 · Eure Einladung",
    step4: "4 · Euer Bild",
    pickHint: "Ein Foto von dir, eins von ihm — mehr braucht es nicht.",
    datenErsetzen: "Daten ersetzen",
    namenVorSenden: "Tippt oben auf eure Namen, um die Einladung zu verschicken",
    szeneTitel: "Wählt eure Szene",
    upTitle: "Du, die Braut",
    upHint: "Ein Foto von dir genügt.",
    you: "ER",
    uploadYou: "Lade sein Foto hoch",
    youHint: "Ein Foto von ihm — dem Bräutigam",
    readyTitle: "Eure Einladung ist fertig 💍",
    makeVideo: "Karte animieren — {price}/Monat ✨",
    makingKiss: "Eure Einladung entsteht …",
    watchOnce: "Unser Einladungsvideo ansehen",
    blockedOnce: "Einladung freischalten",
    heroA: "Euer ",
    heroY: "Hochzeitsplaner",
    heroB: " 💍",
    examples: "So sieht eure Einladung aus",
    statusQuality: "Euer Einladungsvideo entsteht in voller Qualität … (max. 10 Min.)",
    blockedBody: "Drei Gratis-Bilder pro Person. Macht jetzt euer Hochzeitsvideo.",
    buyOnce: "Einladung freischalten",
    blockedAll: "Einladung freischalten — {price}/Monat",
    orAll: "Oder Einladung freischalten — {price}/Monat",
    buyAbo: "Einladung {price}/Mon.",
    freeNote: "Das Bild gehört euch gratis. Die Einladung — Seite, Zusagen, News und Gruppe — kostet {price} im Monat, monatlich kündbar. ",
    priceLine: "Bild gratis · Einladung {price}/Monat",
    wardrobeLocked: "Im Abo der Einladung enthalten — wähle ihr Kleid.",
    paidBadge: "In der Einladung",
    blockedTitle: "Euer Gratis-Bild ist aufgebraucht",
    renderSteps: ["Euer Foto wird gelesen …","Ihr beide werdet zusammengeführt …","Eure Einladung entsteht …","Das Licht wird gesetzt …","Fast fertig …","Letzter Schliff …","Jeden Moment …","Läuft noch — bleibt dran …"],
    teaseSteps: ["Beide Gesichter werden gelesen …","Ihr beide werdet zusammengeführt …","Der Moment wird lebendig …"],
    readyBody: "Schaltet sie frei und verschickt sie an eure Gäste.",
    ctaVideo: "Einladung erstellen",
    download: "⬇ Euer Einladungsvideo herunterladen",
    payMaking: "Eure Einladung entsteht — das dauert etwa eine Minute. Bleibt auf dieser Seite.",
    payPrep: "Zahlung erhalten — eure Einladung wird vorbereitet …",
    privateNote: "🔒 Das ist privat — nur für euch beide und die Gäste, denen ihr es schickt.",
    renderingVideo: "Eure Einladung wird erstellt … (max. 10 Min.)",
    videoFailed: "Die Einladung ist fehlgeschlagen.",
    wardrobeOpen: "Wählt ihr Kleid für die Einladung.",
    extraCta: "Noch eine Fassung — {extra}",
    extraNote: "Eine weitere Fassung, kein neues Abo. Euer Abo läuft normal weiter.",
  },
  ro: {
    anlass: "La logodnă · pentru save the date · pentru invitația propriu-zisă · când invitații sunt în trei țări · când la invitația pe hârtie nu răspunde nimeni",
    grund: "O invitație tipărită ajunge în sertar. O pagină cu videoclipul vostru, confirmările și lista de invitați rămâne deschisă pe telefon.",
    wieGeht: ["Încarcă o poză cu ea și una cu el.", "Facem videoclipul vostru de nuntă și pagina voastră de invitație.", "Trimiteți un singur link — confirmările ajung la voi."],
    wieGehtPrivat: "Pagina voastră nu este listată nicăieri și Google nu o găsește — o poate deschide doar cine primește linkul.",
    pickFirst: "Încarcă mai întâi poza ta",
    mailQuestion: "Adresa ta de email",
    uploadFirst: "Încarcă poza lui",
    step1: "1 · Mireasa",
    step2: "2 · Mirele",
    step3: "3 · Invitația voastră",
    step4: "4 · Poza voastră",
    pickHint: "O poză cu tine, una cu el — atât e nevoie.",
    datenErsetzen: "Înlocuiește datele",
    namenVorSenden: "Atingeți numele voastre mai sus ca să trimiteți invitația",
    szeneTitel: "Alegeți scena voastră",
    upTitle: "Tu, mireasa",
    upHint: "O poză cu tine e de ajuns.",
    you: "EL",
    uploadYou: "Încarcă poza lui",
    youHint: "O poză cu el — mirele",
    readyTitle: "Invitația voastră e gata 💍",
    makeVideo: "Animează invitația — {price}/lună ✨",
    makingKiss: "Invitația voastră se creează …",
    watchOnce: "Vezi videoclipul invitației",
    blockedOnce: "Deblochează invitația",
    heroA: "Planificatorul vostru ",
    heroY: "de nuntă",
    heroB: " 💍",
    examples: "Așa arată invitația voastră",
    statusQuality: "Videoclipul invitației se creează la calitate maximă … (max. 10 min)",
    blockedBody: "Trei imagini gratuite de persoană. Faceți acum videoclipul de nuntă.",
    buyOnce: "Deblochează invitația",
    blockedAll: "Deblochează invitația — {price}/lună",
    orAll: "Sau deblochează invitația — {price}/lună",
    buyAbo: "Invitație {price}/lună",
    freeNote: "Imaginea e gratuită. Invitația — pagina, confirmările, noutățile și grupul — costă {price} pe lună, o poți anula oricând. ",
    priceLine: "Imagine gratis · Invitație {price}/lună",
    wardrobeLocked: "Inclus în invitație — alege-i rochia.",
    paidBadge: "În invitație",
    blockedTitle: "Imaginea gratuită s-a consumat",
    renderSteps: ["Poza voastră se citește …","Sunteți aduși împreună …","Invitația voastră prinde contur …","Se pune lumina …","Aproape gata …","Ultimele retușuri …","În orice moment …","Încă rulează — rămâneți …"],
    teaseSteps: ["Se citesc ambele fețe …","Sunteți aduși împreună …","Momentul prinde viață …"],
    readyBody: "Deblocați-o și trimiteți-o invitaților.",
    ctaVideo: "Creează invitația",
    download: "⬇ Descarcă videoclipul invitației",
    payMaking: "Invitația voastră se creează — durează cam un minut. Rămâneți pe pagină.",
    payPrep: "Plată primită — invitația voastră se pregătește …",
    privateNote: "🔒 E privat — doar pentru voi doi și invitații cărora îl trimiteți.",
    renderingVideo: "Invitația voastră se creează … (max. 10 min)",
    videoFailed: "Invitația nu a putut fi creată.",
    wardrobeOpen: "Alegeți-i rochia pentru invitație.",
    extraCta: "Încă o versiune — {extra}",
    extraNote: "O versiune în plus, nu un abonament nou. Al vostru merge mai departe.",
  },
  es: {
    anlass: "Para la pedida · para el save the date · para la invitación misma · cuando vuestros invitados están en tres países · cuando nadie contesta a la tarjeta de papel",
    grund: "Una invitación impresa acaba en un cajón. Una página con vuestro vídeo, las respuestas y la lista de invitados se queda abierta en el móvil.",
    wieGeht: ["Sube una foto de ella y otra de él.", "Hacemos vuestro vídeo de boda y vuestra propia página de invitación.", "Enviad un solo enlace — las respuestas os llegan a vosotros."],
    wieGehtPrivat: "Vuestra página no está listada en ningún sitio y Google no la encuentra — solo la abre quien recibe el enlace.",
    pickFirst: "Sube primero tu foto",
    mailQuestion: "Tu dirección de correo electrónico",
    uploadFirst: "Sube su foto",
    step1: "1 · La novia",
    step2: "2 · El novio",
    step3: "3 · Vuestra invitación",
    step4: "4 · Vuestra imagen",
    pickHint: "Una foto tuya, una de él — no hace falta más.",
    datenErsetzen: "Sustituir los datos",
    namenVorSenden: "Tocad vuestros nombres arriba para enviar la invitación",
    szeneTitel: "Elegid vuestra escena",
    upTitle: "Tú, la novia",
    upHint: "Basta una foto tuya.",
    you: "ÉL",
    uploadYou: "Sube su foto",
    youHint: "Una foto de él — el novio",
    readyTitle: "Vuestra invitación está lista 💍",
    makeVideo: "Animar la tarjeta — {price}/mes ✨",
    makingKiss: "Vuestra invitación se está creando …",
    watchOnce: "Ver el vídeo de la invitación",
    blockedOnce: "Desbloquear la invitación",
    heroA: "Vuestro ",
    heroY: "organizador de boda",
    heroB: " 💍",
    examples: "Así se ve vuestra invitación",
    statusQuality: "El vídeo de la invitación se crea con la máxima calidad … (max. 10 min)",
    blockedBody: "Tres imágenes gratis por persona. Haced ahora vuestro vídeo de boda.",
    buyOnce: "Desbloquear la invitación",
    blockedAll: "Desbloquear la invitación — {price}/mes",
    orAll: "O desbloquear la invitación — {price}/mes",
    buyAbo: "Invitación {price}/mes",
    freeNote: "La imagen es gratis. La invitación — página, confirmaciones, novedades y grupo — cuesta {price} al mes, cancelable cuando queráis. ",
    priceLine: "Imagen gratis · Invitación {price}/mes",
    wardrobeLocked: "Incluido en la invitación — elige su vestido.",
    paidBadge: "En la invitación",
    blockedTitle: "Vuestra imagen gratis se ha agotado",
    renderSteps: ["Vuestra foto se está leyendo …","Os estamos juntando a los dos …","Vuestra invitación va tomando forma …","Se coloca la luz …","Casi listo …","Últimos retoques …","En cualquier momento …","Sigue en marcha — esperad …"],
    teaseSteps: ["Se leen ambas caras …","Os estamos juntando …","El momento cobra vida …"],
    readyBody: "Desbloqueadla y enviádsela a vuestros invitados.",
    ctaVideo: "Crear la invitación",
    download: "⬇ Descargar el vídeo de la invitación",
    payMaking: "Vuestra invitación se está creando — un minuto aprox. Quedaos en esta página.",
    payPrep: "Pago recibido — vuestra invitación se está preparando …",
    privateNote: "🔒 Esto es privado — solo para vosotros y los invitados a quienes se lo enviéis.",
    renderingVideo: "Vuestra invitación se está creando … (max. 10 min)",
    videoFailed: "La invitación ha fallado.",
    wardrobeOpen: "Elegid su vestido para la invitación.",
    extraCta: "Otra versión — {extra}",
    extraNote: "Una versión más, no una suscripción nueva. La vuestra sigue igual.",
  },
  fr: {
    anlass: "Pour les fiançailles · pour le save the date · pour l'invitation elle-même · quand vos invités sont dans trois pays · quand personne ne répond au carton",
    grund: "Un carton imprimé finit dans un tiroir. Une page avec votre vidéo, les réponses et la liste des invités reste ouverte sur le téléphone.",
    wieGeht: ["Ajoutez une photo d'elle et une de lui.", "On fait votre vidéo de mariage et votre page d'invitation.", "Envoyez un seul lien — les réponses vous arrivent."],
    wieGehtPrivat: "Votre page n'est listée nulle part et Google ne la trouve pas — seuls ceux à qui vous envoyez le lien peuvent l'ouvrir.",
    pickFirst: "Téléverse d'abord ta photo",
    mailQuestion: "Ton adresse e-mail",
    uploadFirst: "Téléverse sa photo",
    step1: "1 · La mariée",
    step2: "2 · Le marié",
    step3: "3 · Votre invitation",
    step4: "4 · Votre image",
    pickHint: "Une photo de toi, une de lui — c'est tout.",
    datenErsetzen: "Remplacer les infos",
    namenVorSenden: "Touchez vos prénoms ci-dessus pour envoyer l'invitation",
    szeneTitel: "Choisissez votre scène",
    upTitle: "Toi, la mariée",
    upHint: "Une photo de toi suffit.",
    you: "LUI",
    uploadYou: "Téléverse sa photo",
    youHint: "Une photo de lui — le marié",
    readyTitle: "Votre invitation est prête 💍",
    makeVideo: "Animer la carte — {price}/mois ✨",
    makingKiss: "Votre invitation se prépare …",
    watchOnce: "Voir la vidéo de l’invitation",
    blockedOnce: "Débloquer l’invitation",
    heroA: "Votre ",
    heroY: "organisateur de mariage",
    heroB: " 💍",
    examples: "Voilà à quoi ressemble votre invitation",
    statusQuality: "La vidéo de l’invitation est créée en pleine qualité … (max. 10 min)",
    blockedBody: "Trois images gratuites par personne. Faites maintenant votre vidéo de mariage.",
    buyOnce: "Débloquer l’invitation",
    blockedAll: "Débloquer l’invitation — {price}/mois",
    orAll: "Ou débloquer l’invitation — {price}/mois",
    buyAbo: "Invitation {price}/mois",
    freeNote: "L’image est gratuite. L’invitation — page, réponses, nouvelles et groupe — coûte {price} par mois, résiliable à tout moment. ",
    priceLine: "Image gratuite · Invitation {price}/mois",
    wardrobeLocked: "Inclus dans l’invitation — choisissez sa robe.",
    paidBadge: "Dans l’invitation",
    blockedTitle: "Votre image gratuite est épuisée",
    renderSteps: ["Votre photo est lue …","Vous êtes réunis tous les deux …","Votre invitation prend forme …","La lumière est réglée …","Presque fini …","Dernières retouches …","D’un instant à l’autre …","Toujours en cours — patientez …"],
    teaseSteps: ["Les deux visages sont lus …","Vous êtes réunis …","Le moment prend vie …"],
    readyBody: "Débloquez-la et envoyez-la à vos invités.",
    ctaVideo: "Créer l’invitation",
    download: "⬇ Télécharger la vidéo de l’invitation",
    payMaking: "Votre invitation se prépare — environ une minute. Restez sur cette page.",
    payPrep: "Paiement reçu — votre invitation se prépare …",
    privateNote: "🔒 C’est privé — pour vous deux et les invités à qui vous l’envoyez.",
    renderingVideo: "Votre invitation est en cours de création … (max. 10 min)",
    videoFailed: "L’invitation a échoué.",
    wardrobeOpen: "Choisissez sa robe pour l’invitation.",
    extraCta: "Une version de plus — {extra}",
    extraNote: "Une version en plus, pas un nouvel abonnement. Le vôtre continue.",
  },
  pt: {
    anlass: "Para o noivado · para o save the date · para o próprio convite · quando os convidados estão em três países · quando ninguém responde ao convite em papel",
    grund: "Um convite impresso acaba numa gaveta. Uma página com o vosso vídeo, as respostas e a lista de convidados fica aberta no telemóvel.",
    wieGeht: ["Carrega uma foto dela e outra dele.", "Fazemos o vosso vídeo de casamento e a vossa página de convite.", "Enviem um único link — as respostas chegam a vocês."],
    wieGehtPrivat: "A vossa página não está listada em lado nenhum e o Google não a encontra — só a abre quem recebe o link.",
    pickFirst: "Carrega primeiro a tua foto",
    mailQuestion: "O teu endereço de email",
    uploadFirst: "Carrega a foto dele",
    step1: "1 · A noiva",
    step2: "2 · O noivo",
    step3: "3 · O vosso convite",
    step4: "4 · A vossa imagem",
    pickHint: "Uma foto tua, uma dele — é tudo o que é preciso.",
    datenErsetzen: "Substituir os dados",
    namenVorSenden: "Toquem nos vossos nomes acima para enviar o convite",
    szeneTitel: "Escolham a vossa cena",
    upTitle: "Tu, a noiva",
    upHint: "Basta uma foto tua.",
    you: "ELE",
    uploadYou: "Carrega a foto dele",
    youHint: "Uma foto dele — o noivo",
    readyTitle: "O vosso convite está pronto 💍",
    makeVideo: "Animar o convite — {price}/mês ✨",
    makingKiss: "O vosso convite está a ser criado …",
    watchOnce: "Ver o vídeo do convite",
    blockedOnce: "Desbloquear o convite",
    heroA: "O vosso ",
    heroY: "organizador do casamento",
    heroB: " 💍",
    examples: "É assim que o vosso convite fica",
    statusQuality: "O vídeo do convite está a ser criado em qualidade máxima … (max. 10 min)",
    blockedBody: "Três imagens grátis por pessoa. Façam agora o vosso vídeo de casamento.",
    buyOnce: "Desbloquear o convite",
    blockedAll: "Desbloquear o convite — {price}/mês",
    orAll: "Ou desbloquear o convite — {price}/mês",
    buyAbo: "Convite {price}/mês",
    freeNote: "A imagem é grátis. O convite — página, confirmações, novidades e grupo — custa {price} por mês, cancelável quando quiserem. ",
    priceLine: "Imagem grátis · Convite {price}/mês",
    wardrobeLocked: "Incluído no convite — escolham o vestido dela.",
    paidBadge: "No convite",
    blockedTitle: "A vossa imagem grátis acabou",
    renderSteps: ["A vossa foto está a ser lida …","Estão a ser juntos os dois …","O vosso convite ganha forma …","A luz está a ser colocada …","Quase pronto …","Últimos retoques …","A qualquer momento …","Ainda a correr — aguardem …"],
    teaseSteps: ["Estão a ler-se as duas caras …","Estão a ser juntos …","O momento ganha vida …"],
    readyBody: "Desbloqueiem-no e enviem-no aos convidados.",
    ctaVideo: "Criar o convite",
    download: "⬇ Descarregar o vídeo do convite",
    payMaking: "O vosso convite está a ser criado — cerca de um minuto. Fiquem nesta página.",
    payPrep: "Pagamento recebido — o vosso convite está a ser preparado …",
    privateNote: "🔒 Isto é privado — só para vocês e os convidados a quem o enviarem.",
    renderingVideo: "O vosso convite está a ser criado … (max. 10 min)",
    videoFailed: "O convite falhou.",
    wardrobeOpen: "Escolham o vestido dela para o convite.",
    extraCta: "Mais uma versão — {extra}",
    extraNote: "Mais uma versão, não uma nova subscrição. A vossa continua.",
  },
  it: {
    anlass: "Per il fidanzamento · per il save the date · per l'invito vero e proprio · quando gli invitati sono in tre paesi · quando alla partecipazione di carta non risponde nessuno",
    grund: "Una partecipazione stampata finisce in un cassetto. Una pagina con il vostro video, le conferme e la lista degli invitati resta aperta sul telefono.",
    wieGeht: ["Carica una foto di lei e una di lui.", "Facciamo il vostro video di nozze e la vostra pagina d'invito.", "Mandate un solo link — le conferme arrivano a voi."],
    wieGehtPrivat: "La vostra pagina non è elencata da nessuna parte e Google non la trova — la apre solo chi riceve il link.",
    pickFirst: "Carica prima la tua foto",
    mailQuestion: "La tua email",
    uploadFirst: "Carica la sua foto",
    step1: "1 · La sposa",
    step2: "2 · Lo sposo",
    step3: "3 · Il vostro invito",
    step4: "4 · La vostra immagine",
    pickHint: "Una tua foto, una di lui — non serve altro.",
    datenErsetzen: "Sostituisci i dati",
    namenVorSenden: "Toccate i vostri nomi qui sopra per inviare l'invito",
    szeneTitel: "Scegliete la vostra scena",
    upTitle: "Tu, la sposa",
    upHint: "Basta una tua foto.",
    you: "LUI",
    uploadYou: "Carica la sua foto",
    youHint: "Una foto di lui — lo sposo",
    readyTitle: "Il vostro invito è pronto 💍",
    makeVideo: "Anima l’invito — {price}/mese ✨",
    makingKiss: "Il vostro invito sta nascendo …",
    watchOnce: "Guarda il video dell’invito",
    blockedOnce: "Sblocca l’invito",
    heroA: "Il vostro ",
    heroY: "wedding planner",
    heroB: " 💍",
    examples: "Ecco come appare il vostro invito",
    statusQuality: "Il video dell’invito nasce in piena qualità … (max. 10 min)",
    blockedBody: "Tre immagini gratis a persona. Fate ora il vostro video di nozze.",
    buyOnce: "Sblocca l’invito",
    blockedAll: "Sblocca l’invito — {price}/mese",
    orAll: "Oppure sblocca l’invito — {price}/mese",
    buyAbo: "Invito {price}/mese",
    freeNote: "L’immagine è gratis. L’invito — pagina, conferme, novità e gruppo — costa {price} al mese, disdicibile quando volete. ",
    priceLine: "Immagine gratis · Invito {price}/mese",
    wardrobeLocked: "Incluso nell’invito — scegliete il suo abito.",
    paidBadge: "Nell’invito",
    blockedTitle: "La vostra immagine gratis è finita",
    renderSteps: ["La vostra foto viene letta …","Vi stiamo unendo …","Il vostro invito prende forma …","Si sistema la luce …","Quasi pronto …","Ultimi ritocchi …","Da un momento all’altro …","Ancora in corso — restate …"],
    teaseSteps: ["Si leggono entrambi i volti …","Vi stiamo unendo …","Il momento prende vita …"],
    readyBody: "Sbloccatelo e inviatelo ai vostri invitati.",
    ctaVideo: "Crea l’invito",
    download: "⬇ Scarica il video dell’invito",
    payMaking: "Il vostro invito sta nascendo — circa un minuto. Restate su questa pagina.",
    payPrep: "Pagamento ricevuto — il vostro invito è in preparazione …",
    privateNote: "🔒 È privato — solo per voi due e per gli invitati a cui lo mandate.",
    renderingVideo: "Il vostro invito è in creazione … (max. 10 min)",
    videoFailed: "L’invito non è riuscito.",
    wardrobeOpen: "Scegliete il suo abito per l’invito.",
    extraCta: "Un’altra versione — {extra}",
    extraNote: "Una versione in più, non un nuovo abbonamento. Il vostro continua.",
  },
};

/**
 * DIE URLAUBS-EINLADUNG (Owner 04.08.2026: „du machst eine Invitation für Urlaub an
 * jemandem. DU und ich. Das sendet der User dann an die Person. Es wird genauso wie bei
 * Wedding Datum Ort eingetragen").
 *
 * DAS IST EIN KONZEPTWECHSEL, kein neuer Text. Bis heute war „Urlaub" ein Fantasievideo mit
 * einer Frau aus unserem Katalog — für ihn allein, niemand sonst sah es je. Jetzt ist es
 * eine EINLADUNG an einen echten Menschen: „Komm mit mir." Damit wandert das Thema von der
 * Kiss-Maschine (ein Video für mich) in die Hochzeits-Maschine (eine Karte, die ich
 * verschicke) — dieselben Felder, derselbe Bau-Dialog, dieselbe Seite mit Zusage.
 *
 * ZWEI UNTERSCHIEDE ZUR HOCHZEIT, und beide haengen am selben Punkt: Eine Hochzeit hat
 * GAESTE, ein Urlaub hat EINEN Menschen.
 *   1. Kein „ihr beide" in der Anrede: Hier baut EINER die Karte fuer EINE Person. Deshalb
 *      „dein"/„deine" statt „euer"/„eure" — bei der Hochzeit bauen es die Brautleute
 *      gemeinsam, hier ist es eine Ueberraschung fuer die andere Seite.
 *   2. Kein Menue, keine Gaestezahl, kein Gruppenchat (Owner-Entscheidung 04.08.2026:
 *      „nur zusagen oder absagen"). Wer eingeladen wird, sagt Ja oder Nein — mehr gibt es
 *      bei zwei Menschen nicht zu verwalten.
 *
 * `upTitle`/`you` sind bewusst NICHT „die Braut"/„der Braeutigam", sondern „du"/„sie oder er":
 * Wer jemanden in den Urlaub einlaedt, ist kein Paar in Rollen, und die Einladung soll auch
 * fuer Freunde, Geschwister und Eltern stimmen.
 */
const URLAUB: Record<Lang, Partial<KissText>> = {
  en: {
    anlass: "For a surprise · for the proposal · for a family holiday · for the honeymoon · when you want to ask, not just tell",
    grund: "Anyone can forward a hotel link. A video where the two of you are already there gets a yes.",
    wieGeht: ["Upload a photo of you and one of them.", "We put the two of you in the place you picked.", "Send it — and they answer yes or no right there."],
    wieGehtPrivat: "Your page is not listed anywhere and Google cannot find it — only the person you send the link to can open it.",
    pickFirst: "Upload your photo first",
    mailQuestion: "Your email address",
    uploadFirst: "Upload their photo",
    pickHint: "One photo of you, one of them — that is all it takes.",
    datenErsetzen: "Replace the details",
    namenVorSenden: "Tap your names above to send the invitation",
    szeneTitel: "Pick your scene",
    upTitle: "You",
    upHint: "One photo of you is enough.",
    you: "THEM",
    uploadYou: "Upload their photo",
    youHint: "A photo of the person you are inviting",
    readyTitle: "Your invitation is ready 🌴",
    makingKiss: "Your invitation is being made …",
    heroA: "Invite someone ",
    heroY: "to come away with you",
    heroB: " 🌴",
    examples: "This is what your invitation looks like",
    statusQuality: "Your invitation video is being created in full quality … (max. 10 min)",
    ctaVideo: "Create the invitation",
    download: "⬇ Download your invitation video",
    payMaking: "Your invitation is being made — about a minute. Stay on this page.",
    payPrep: "Payment received — your invitation is being prepared …",
    privateNote: "🔒 This is private — just for you and the person you send it to.",
    renderingVideo: "Your invitation is being created … (max. 10 min)",
    videoFailed: "The invitation could not be created.",
    readyBody: "Unlock it and send it to them.",
    blockedOnce: "Unlock the invitation",
    buyOnce: "Unlock the invitation",
    extraCta: "One more version — {extra}",
    extraNote: "One extra render, not a new subscription. Yours keeps running.",
  },
  de: {
    anlass: "Für eine Überraschung · für den Antrag · für den Familienurlaub · für die Flitterwochen · wenn du fragen willst statt nur zu erzählen",
    grund: "Einen Hotel-Link kann jeder weiterschicken. Ein Video, in dem ihr beide schon dort seid, bekommt ein Ja.",
    wieGeht: ["Lade ein Foto von dir hoch und eins von ihr oder ihm.", "Wir setzen euch beide an den Ort, den du gewählt hast.", "Verschick es — die Antwort kommt direkt auf der Seite."],
    wieGehtPrivat: "Deine Seite steht nirgends und Google findet sie nicht — öffnen kann sie nur, wem du den Link schickst.",
    pickFirst: "Lade zuerst dein Foto hoch",
    mailQuestion: "Deine E-Mail-Adresse",
    uploadFirst: "Lade ihr Foto hoch",
    pickHint: "Ein Foto von dir, eins von ihr oder ihm — mehr braucht es nicht.",
    datenErsetzen: "Daten ersetzen",
    namenVorSenden: "Tippe oben auf eure Namen, um die Einladung zu verschicken",
    szeneTitel: "Wähl deine Szene",
    upTitle: "Du",
    upHint: "Ein Foto von dir genügt.",
    you: "SIE ODER ER",
    uploadYou: "Lade ihr Foto hoch",
    youHint: "Ein Foto der Person, die du einlädst",
    readyTitle: "Deine Einladung ist fertig 🌴",
    makingKiss: "Deine Einladung entsteht …",
    heroA: "Lade jemanden ein, ",
    heroY: "mitzukommen",
    heroB: " 🌴",
    examples: "So sieht deine Einladung aus",
    statusQuality: "Dein Einladungsvideo entsteht in voller Qualität … (max. 10 Min.)",
    ctaVideo: "Einladung erstellen",
    download: "⬇ Dein Einladungsvideo herunterladen",
    payMaking: "Deine Einladung entsteht — das dauert etwa eine Minute. Bleib auf dieser Seite.",
    payPrep: "Zahlung erhalten — deine Einladung wird vorbereitet …",
    privateNote: "🔒 Das ist privat — nur für dich und die Person, der du es schickst.",
    renderingVideo: "Deine Einladung wird erstellt … (max. 10 Min.)",
    videoFailed: "Die Einladung ist fehlgeschlagen.",
    readyBody: "Schalte sie frei und verschick sie.",
    blockedOnce: "Einladung freischalten",
    buyOnce: "Einladung freischalten",
    extraCta: "Noch eine Fassung — {extra}",
    extraNote: "Eine Fassung extra, kein neues Abo. Deins läuft weiter.",
  },
  ro: {
    anlass: "Pentru o surpriză · pentru cerere · pentru vacanța în familie · pentru luna de miere · când vrei să întrebi, nu doar să anunți",
    grund: "Un link de hotel poate trimite oricine. Un videoclip în care sunteți deja acolo primește un da.",
    wieGeht: ["Încarcă o poză cu tine și una cu ea sau el.", "Vă punem pe amândoi în locul pe care l-ai ales.", "Trimite-l — răspunsul vine chiar pe pagină."],
    wieGehtPrivat: "Pagina ta nu este listată nicăieri și Google nu o găsește — o poate deschide doar cine primește linkul.",
    pickFirst: "Încarcă mai întâi poza ta",
    mailQuestion: "Adresa ta de e-mail",
    uploadFirst: "Încarcă poza lui sau a ei",
    pickHint: "O poză cu tine, una cu el sau ea — atât e nevoie.",
    datenErsetzen: "Schimbă datele",
    namenVorSenden: "Atinge numele de mai sus ca să trimiți invitația",
    szeneTitel: "Alege scena",
    upTitle: "Tu",
    upHint: "O poză cu tine e de ajuns.",
    you: "EL SAU EA",
    uploadYou: "Încarcă poza lui sau a ei",
    youHint: "O poză cu persoana pe care o inviți",
    readyTitle: "Invitația ta e gata 🌴",
    makingKiss: "Se face invitația ta …",
    heroA: "Invită pe cineva ",
    heroY: "să vină cu tine",
    heroB: " 🌴",
    examples: "Așa arată invitația ta",
    statusQuality: "Videoclipul invitației se creează la calitate maximă … (max. 10 min)",
    ctaVideo: "Creează invitația",
    download: "⬇ Descarcă videoclipul invitației",
    payMaking: "Invitația se face — durează cam un minut. Rămâi pe pagină.",
    payPrep: "Plata a fost primită — invitația se pregătește …",
    privateNote: "🔒 E privat — doar pentru tine și persoana căreia i-o trimiți.",
    renderingVideo: "Invitația ta se creează … (max. 10 min)",
    videoFailed: "Invitația nu a putut fi creată.",
    readyBody: "Deblocheaz-o și trimite-i-o.",
    blockedOnce: "Deblochează invitația",
    buyOnce: "Deblochează invitația",
    extraCta: "Încă o variantă — {extra}",
    extraNote: "O variantă în plus, nu un abonament nou. Al tău merge mai departe.",
  },
  es: {
    anlass: "Para una sorpresa · para la pedida · para las vacaciones en familia · para la luna de miel · cuando quieres preguntar, no solo contar",
    grund: "Un enlace de hotel lo reenvía cualquiera. Un vídeo en el que ya estáis allí recibe un sí.",
    wieGeht: ["Sube una foto tuya y otra de ella o de él.", "Os ponemos a los dos en el lugar que has elegido.", "Envíalo — la respuesta llega en la propia página."],
    wieGehtPrivat: "Tu página no está listada en ningún sitio y Google no la encuentra — solo la abre quien recibe el enlace.",
    pickFirst: "Sube primero tu foto",
    mailQuestion: "Tu correo electrónico",
    uploadFirst: "Sube su foto",
    pickHint: "Una foto tuya y una suya — no hace falta más.",
    datenErsetzen: "Cambiar los datos",
    namenVorSenden: "Toca vuestros nombres arriba para enviar la invitación",
    szeneTitel: "Elige tu escena",
    upTitle: "Tú",
    upHint: "Basta con una foto tuya.",
    you: "ÉL O ELLA",
    uploadYou: "Sube su foto",
    youHint: "Una foto de la persona a la que invitas",
    readyTitle: "Tu invitación está lista 🌴",
    makingKiss: "Se está creando tu invitación …",
    heroA: "Invita a alguien ",
    heroY: "a irse contigo",
    heroB: " 🌴",
    examples: "Así se ve tu invitación",
    statusQuality: "Tu vídeo de invitación se crea en máxima calidad … (max. 10 min)",
    ctaVideo: "Crear la invitación",
    download: "⬇ Descargar el vídeo de tu invitación",
    payMaking: "Tu invitación se está creando — tarda un minuto. Quédate en esta página.",
    payPrep: "Pago recibido — se está preparando tu invitación …",
    privateNote: "🔒 Esto es privado — solo para ti y la persona a la que se lo envías.",
    renderingVideo: "Tu invitación se está creando … (max. 10 min)",
    videoFailed: "No se ha podido crear la invitación.",
    readyBody: "Desbloquéala y envíasela.",
    blockedOnce: "Desbloquear la invitación",
    buyOnce: "Desbloquear la invitación",
    extraCta: "Otra versión — {extra}",
    extraNote: "Una versión más, no una suscripción nueva. La tuya sigue.",
  },
  fr: {
    anlass: "Pour une surprise · pour la demande · pour les vacances en famille · pour la lune de miel · quand tu veux demander, pas seulement annoncer",
    grund: "Un lien d'hôtel, tout le monde peut le transférer. Une vidéo où vous y êtes déjà, ça reçoit un oui.",
    wieGeht: ["Ajoute une photo de toi et une d'elle ou de lui.", "On vous met tous les deux à l'endroit que tu as choisi.", "Envoie-la — la réponse arrive directement sur la page."],
    wieGehtPrivat: "Ta page n'est listée nulle part et Google ne la trouve pas — seule la personne à qui tu envoies le lien peut l'ouvrir.",
    pickFirst: "Ajoute d’abord ta photo",
    mailQuestion: "Ton adresse e-mail",
    uploadFirst: "Ajoute sa photo",
    pickHint: "Une photo de toi, une de lui ou d’elle — il n’en faut pas plus.",
    datenErsetzen: "Modifier les informations",
    namenVorSenden: "Touche vos prénoms en haut pour envoyer l’invitation",
    szeneTitel: "Choisis ta scène",
    upTitle: "Toi",
    upHint: "Une photo de toi suffit.",
    you: "LUI OU ELLE",
    uploadYou: "Ajoute sa photo",
    youHint: "Une photo de la personne que tu invites",
    readyTitle: "Ton invitation est prête 🌴",
    makingKiss: "Ton invitation se prépare …",
    heroA: "Invite quelqu'un ",
    heroY: "à partir avec toi",
    heroB: " 🌴",
    examples: "Voilà à quoi ressemble ton invitation",
    statusQuality: "Ta vidéo d’invitation est créée en pleine qualité … (max. 10 min)",
    ctaVideo: "Créer l’invitation",
    download: "⬇ Télécharger la vidéo de ton invitation",
    payMaking: "Ton invitation se prépare — environ une minute. Reste sur cette page.",
    payPrep: "Paiement reçu — ton invitation se prépare …",
    privateNote: "🔒 C’est privé — seulement pour toi et la personne à qui tu l’envoies.",
    renderingVideo: "Ton invitation est en cours de création … (max. 10 min)",
    videoFailed: "L’invitation n’a pas pu être créée.",
    readyBody: "Débloque-la et envoie-la.",
    blockedOnce: "Débloquer l’invitation",
    buyOnce: "Débloquer l’invitation",
    extraCta: "Une version de plus — {extra}",
    extraNote: "Une version en plus, pas un nouvel abonnement. Le tien continue.",
  },
  pt: {
    anlass: "Para uma surpresa · para o pedido · para as férias em família · para a lua de mel · quando queres perguntar, não só contar",
    grund: "Um link de hotel qualquer um reencaminha. Um vídeo em que já estão os dois lá recebe um sim.",
    wieGeht: ["Carrega uma foto tua e outra dela ou dele.", "Pomos os dois no sítio que escolheste.", "Envia — a resposta chega na própria página."],
    wieGehtPrivat: "A tua página não está listada em lado nenhum e o Google não a encontra — só a abre quem recebe o link.",
    pickFirst: "Carrega primeiro a tua foto",
    mailQuestion: "O teu e-mail",
    uploadFirst: "Carrega a foto dele ou dela",
    pickHint: "Uma foto tua, uma dele ou dela — é tudo o que é preciso.",
    datenErsetzen: "Alterar os dados",
    namenVorSenden: "Toca nos vossos nomes acima para enviar o convite",
    szeneTitel: "Escolhe a tua cena",
    upTitle: "Tu",
    upHint: "Basta uma foto tua.",
    you: "ELE OU ELA",
    uploadYou: "Carrega a foto dele ou dela",
    youHint: "Uma foto da pessoa que estás a convidar",
    readyTitle: "O teu convite está pronto 🌴",
    makingKiss: "O teu convite está a ser feito …",
    heroA: "Convida alguém ",
    heroY: "a ir contigo",
    heroB: " 🌴",
    examples: "É assim que fica o teu convite",
    statusQuality: "O vídeo do teu convite está a ser criado em qualidade máxima … (max. 10 min)",
    ctaVideo: "Criar o convite",
    download: "⬇ Descarregar o vídeo do teu convite",
    payMaking: "O teu convite está a ser feito — cerca de um minuto. Fica nesta página.",
    payPrep: "Pagamento recebido — o teu convite está a ser preparado …",
    privateNote: "🔒 Isto é privado — só para ti e para a pessoa a quem o envias.",
    renderingVideo: "O teu convite está a ser criado … (max. 10 min)",
    videoFailed: "Não foi possível criar o convite.",
    readyBody: "Desbloqueia-o e envia-lho.",
    blockedOnce: "Desbloquear o convite",
    buyOnce: "Desbloquear o convite",
    extraCta: "Mais uma versão — {extra}",
    extraNote: "Uma versão extra, não uma nova subscrição. A tua continua.",
  },
  it: {
    anlass: "Per una sorpresa · per la proposta · per le vacanze in famiglia · per la luna di miele · quando vuoi chiedere, non solo annunciare",
    grund: "Un link di un hotel lo inoltra chiunque. Un video in cui siete già lì si prende un sì.",
    wieGeht: ["Carica una foto tua e una di lei o di lui.", "Vi mettiamo tutti e due nel posto che hai scelto.", "Mandalo — la risposta arriva sulla pagina stessa."],
    wieGehtPrivat: "La tua pagina non è elencata da nessuna parte e Google non la trova — la apre solo chi riceve il link.",
    pickFirst: "Carica prima la tua foto",
    mailQuestion: "Il tuo indirizzo e-mail",
    uploadFirst: "Carica la sua foto",
    pickHint: "Una foto tua, una sua — non serve altro.",
    datenErsetzen: "Cambia i dati",
    namenVorSenden: "Tocca i vostri nomi qui sopra per inviare l’invito",
    szeneTitel: "Scegli la tua scena",
    upTitle: "Tu",
    upHint: "Basta una foto tua.",
    you: "LUI O LEI",
    uploadYou: "Carica la sua foto",
    youHint: "Una foto della persona che inviti",
    readyTitle: "Il tuo invito è pronto 🌴",
    makingKiss: "Il tuo invito si sta creando …",
    heroA: "Invita qualcuno ",
    heroY: "a partire con te",
    heroB: " 🌴",
    examples: "Ecco come sarà il tuo invito",
    statusQuality: "Il video del tuo invito si crea in piena qualità … (max. 10 min)",
    ctaVideo: "Crea l’invito",
    download: "⬇ Scarica il video del tuo invito",
    payMaking: "Il tuo invito si sta creando — circa un minuto. Resta su questa pagina.",
    payPrep: "Pagamento ricevuto — il tuo invito si sta preparando …",
    privateNote: "🔒 È privato — solo per te e per la persona a cui lo mandi.",
    renderingVideo: "Il tuo invito si sta creando … (max. 10 min)",
    videoFailed: "Non è stato possibile creare l’invito.",
    readyBody: "Sbloccalo e mandaglielo.",
    blockedOnce: "Sblocca l’invito",
    buyOnce: "Sblocca l’invito",
    extraCta: "Un’altra versione — {extra}",
    extraNote: "Una versione in più, non un nuovo abbonamento. Il tuo continua.",
  },
};

/**
 * Die fertigen Texte für eine Sprache — Preise schon eingesetzt.
 *
 * Jede Zeichenkette läuft durch `fillPrices`, damit {once}/{price}/{videos} überall gefüllt
 * sind und in KEINER Sprachtabelle eine Zahl steht. Funktionen (z. B. die Sekundenanzeige)
 * bleiben unangetastet, Listen werden Zeile für Zeile gefüllt.
 */

/**
 * DER GEBURTSTAG (Owner 03.08.2026: „genau wie Surprise him machen").
 *
 * Dieselben Schluessel wie beim Tanz, damit derselbe Trichter sie findet. Nur die Saetze sind
 * andere — und ein Unterschied ist wichtig: Beim Tanz gehoert der Name IHM, hier gehoert er
 * dem Geburtstagskind, und er steht OBEN AUF DER KARTE („Happy birthday to you {Name}"),
 * nicht in den fliegenden Zeilen.
 */
const GEBURTSTAG: Record<Lang, Partial<KissText>> = {
  en: {
    anlass: "For your mother · for your partner · for your best friend · for someone far away · when an ordinary message would be too little",
    grund: "Your face. Your voice. A world that exists only for this moment. No card, no generic greeting — you, staged in a way nobody expects.",
    step1: "1 · Your photo", step3: "2 · Your birthday video",
    pickFirst: "Upload your photo",
    upTitle: "Your photo", upHint: "One photo of you — full body works best.",
    mailQuestion: "Where should we send your video?",
    namenFrage: "Whose birthday is it? The name goes on the card", namenPlatzhalter: "Anna",
    heroA: "Say happy birthday in a way ", heroY: "nobody expects", heroB: " 🎂",
    wieGeht: [
      "Speak your message — just say what you really want to say. No script needed.",
      "Upload your photo — we use you as the basis for your film.",
      "Get your birthday film — ready to send by WhatsApp, Messenger or email.",
    ],
    wieGehtPrivat: "Private until you send it. Your film is published nowhere — you decide who ever sees it.",
    filmTitel: "A few spoken words become a moment",
    filmText: "You appear in an extraordinary, surreal birthday world — with a spectacular cake, a striking outfit and a scene that exists only for this moment. Your message stays your message. Your voice stays your voice. Only the world around you changes.",
    unterVideo: "Pick a template — dream world or real. And send an unforgettable digital video postcard.",
    anlaesseTitel: "For birthdays that deserve more than “Happy birthday 🎂”",
    anlaesse: ["For your mother.", "For your partner.", "For your best friend.", "For someone far away.", "Or for the person an ordinary message would never be enough for."],
    anlaesseSchluss: "Not just any birthday video. Yours.",
    priceLine: "Video {geburtstag}", buyOnce: "Birthday video {geburtstag}",
    ctaVideo: "{sek} s video — {geburtstag}",
    makeVideo: "Make my birthday video — {geburtstag} 🎂", makingKiss: "Making your birthday video …",
    watchOnce: "Watch my video — {geburtstag}", blockedOnce: "Make a real birthday video — {geburtstag}",
    readyBody: "Unlock it and hear her say it.",
  },
  de: {
    anlass: "Für deine Mutter · für deinen Partner · für deine beste Freundin · für jemanden, der weit weg ist · wenn eine normale Nachricht zu wenig wäre",
    grund: "Dein Gesicht. Deine Stimme. Eine Welt, die es nur für diesen Moment gibt. Keine Karte, kein generischer Gruß — du, nur ganz anders inszeniert.",
    step1: "1 · Dein Foto", step3: "2 · Dein Geburtstagsvideo",
    pickFirst: "Lade dein Foto hoch",
    upTitle: "Dein Foto", upHint: "Ein Foto von dir — am besten ganzer Körper.",
    mailQuestion: "Wohin sollen wir dein Video schicken?",
    namenFrage: "Wer hat Geburtstag? Der Name kommt auf die Karte", namenPlatzhalter: "Anna",
    heroA: "Sag Happy Birthday auf eine Art, die ", heroY: "niemand erwartet", heroB: " 🎂",
    wieGeht: [
      "Sprich deine Botschaft ein — sag einfach, was du wirklich sagen möchtest. Kein Skript nötig.",
      "Lade dein Foto hoch — wir verwenden dich als Grundlage für deinen Film.",
      "Erhalte deinen Geburtstagsfilm — fertig zum Verschicken per WhatsApp, Messenger oder E-Mail.",
    ],
    wieGehtPrivat: "Privat, bis du ihn verschickst. Dein Film wird nirgends veröffentlicht — du entscheidest, wer ihn sieht.",
    filmTitel: "Aus ein paar gesprochenen Worten wird ein Moment",
    filmText: "Du erscheinst in einer außergewöhnlichen, surrealen Geburtstagswelt — mit spektakulärer Torte, besonderem Outfit und einer Szenerie, die es so nur für diesen Moment gibt. Deine Botschaft bleibt deine Botschaft. Deine Stimme bleibt deine Stimme. Nur die Welt um dich herum verändert sich.",
    unterVideo: "Wähl eine Vorlage aus — Traumwelt oder real. Und verschick eine unvergessliche digitale Video-Postkarte.",
    anlaesseTitel: "Für Geburtstage, die mehr verdienen als „Alles Gute 🎂“",
    anlaesse: ["Für deine Mutter.", "Für deinen Partner.", "Für deine beste Freundin.", "Für jemanden, der weit weg ist.", "Oder für den Menschen, bei dem eine normale Nachricht einfach zu wenig wäre."],
    anlaesseSchluss: "Nicht irgendein Geburtstagsvideo. Deins.",
    priceLine: "Video {geburtstag}", buyOnce: "Geburtstagsvideo {geburtstag}",
    ctaVideo: "{sek} Sek. Video — {geburtstag}",
    makeVideo: "Mein Geburtstagsvideo — {geburtstag} 🎂", makingKiss: "Dein Geburtstagsvideo entsteht …",
    watchOnce: "Mein Video ansehen — {geburtstag}", blockedOnce: "Echtes Geburtstagsvideo — {geburtstag}",
    readyBody: "Schalte es frei und hör sie.",
  },
  ro: {
    anlass: "Pentru mama ta · pentru partenerul tău · pentru cea mai bună prietenă · pentru cineva departe · când un mesaj obișnuit ar fi prea puțin",
    grund: "Chipul tău. Vocea ta. O lume care există doar pentru acest moment. Nicio felicitare, niciun mesaj generic — tu, pus în scenă cum nu se așteaptă nimeni.",
    step1: "1 · Poza ta", step3: "2 · Videoclipul tău",
    pickFirst: "Încarcă poza ta",
    upTitle: "Poza ta", upHint: "O poză cu tine — de preferat corp întreg.",
    mailQuestion: "Unde să-ți trimitem videoclipul?",
    namenFrage: "Cine își serbează ziua? Numele apare pe felicitare", namenPlatzhalter: "Ana",
    heroA: "Spune la mulți ani într-un fel ", heroY: "la care nimeni nu se așteaptă", heroB: " 🎂",
    wieGeht: [
      "Spune-ți mesajul — pur și simplu ce vrei cu adevărat să spui. Fără scenariu.",
      "Încarcă-ți poza — pe tine te folosim ca bază pentru filmul tău.",
      "Primește-ți filmul — gata de trimis pe WhatsApp, Messenger sau e-mail.",
    ],
    wieGehtPrivat: "Privat până îl trimiți tu. Filmul nu se publică nicăieri — tu decizi cine îl vede.",
    filmTitel: "Din câteva cuvinte rostite se naște un moment",
    filmText: "Apari într-o lume de aniversare surrealistă și neobișnuită — cu un tort spectaculos, o ținută aparte și un decor care există doar pentru acest moment. Mesajul tău rămâne mesajul tău. Vocea ta rămâne vocea ta. Doar lumea din jur se schimbă.",
    unterVideo: "Alege un șablon — lume de vis sau real. Și trimite o carte poștală video digitală de neuitat.",
    anlaesseTitel: "Pentru zile de naștere care merită mai mult decât „La mulți ani 🎂”",
    anlaesse: ["Pentru mama ta.", "Pentru partenerul tău.", "Pentru cea mai bună prietenă.", "Pentru cineva departe.", "Sau pentru omul căruia un mesaj obișnuit nu i-ar ajunge niciodată."],
    anlaesseSchluss: "Nu un videoclip aniversar oarecare. Al tău.",
    priceLine: "Videoclip {geburtstag}", buyOnce: "Videoclip aniversar {geburtstag}",
    ctaVideo: "Video de {sek} s — {geburtstag}",
    makeVideo: "Fă videoclipul meu — {geburtstag} 🎂", makingKiss: "Se creează videoclipul tău …",
    watchOnce: "Vezi videoclipul — {geburtstag}", blockedOnce: "Videoclip aniversar real — {geburtstag}",
    readyBody: "Deblochează-l și ascult-o.",
  },
  es: {
    anlass: "Para un 18 · para un 60 · para mamá · para tu hermana · para el amigo que está lejos · cuando un mensaje se queda corto",
    grund: "Tu cara. Tu voz. Un mundo que existe solo para este momento. Ni tarjeta ni felicitación genérica — tú, puesto en escena como nadie espera.",
    step1: "1 · Tu foto", step3: "2 · Tu vídeo de cumpleaños",
    pickFirst: "Sube tu foto",
    upTitle: "Tu foto", upHint: "Una foto tuya — mejor de cuerpo entero.",
    mailQuestion: "¿A dónde enviamos tu vídeo?",
    namenFrage: "¿Quién cumple años? El nombre aparece en la tarjeta", namenPlatzhalter: "Ana",
    heroA: "Felicita de una forma ", heroY: "que nadie espera", heroB: " 🎂",
    wieGeht: [
      "Di tu mensaje — simplemente lo que de verdad quieres decir. Sin guion.",
      "Sube tu foto — te usamos a ti como base de tu película.",
      "Recibe tu película de cumpleaños — lista para enviar por WhatsApp, Messenger o correo.",
    ],
    filmTitel: "De unas pocas palabras nace un momento",
    filmText: "Apareces en un mundo de cumpleaños surrealista y extraordinario — con una tarta espectacular, un look especial y un escenario que existe solo para este momento. Tu mensaje sigue siendo tuyo. Tu voz sigue siendo tuya. Solo cambia el mundo a tu alrededor.",
    unterVideo: "Elige una plantilla — mundo de ensueño o real. Y envía una postal de vídeo digital inolvidable.",
    anlaesseTitel: "Para cumpleaños que merecen más que un «Felicidades 🎂»",
    anlaesse: ["Para tu madre.", "Para tu pareja.", "Para tu mejor amiga.", "Para alguien que está lejos.", "O para esa persona a la que un mensaje normal nunca le bastaría."],
    anlaesseSchluss: "No un vídeo de cumpleaños cualquiera. El tuyo.",
    wieGehtPrivat: "Nadie más lo ve. Tu vídeo es privado hasta que lo envíes tú.",
    priceLine: "Vídeo {geburtstag}", buyOnce: "Vídeo de cumpleaños {geburtstag}",
    ctaVideo: "Vídeo de {sek} s — {geburtstag}",
    makeVideo: "Crear mi vídeo — {geburtstag} 🎂", makingKiss: "Creando tu vídeo …",
    watchOnce: "Ver mi vídeo — {geburtstag}", blockedOnce: "Vídeo de cumpleaños real — {geburtstag}",
    readyBody: "Desbloquéalo y escúchala.",
  },
  fr: {
    anlass: "Pour ses 18 ans · pour ses 60 ans · pour maman · pour ta sœur · pour l'ami à l'étranger · quand un message ne suffit pas",
    grund: "Ton visage. Ta voix. Un monde qui n'existe que pour ce moment. Pas de carte, pas de vœux tout faits — toi, mis en scène comme personne ne s'y attend.",
    step1: "1 · Ta photo", step3: "2 · Ta vidéo d'anniversaire",
    pickFirst: "Envoie ta photo",
    upTitle: "Ta photo", upHint: "Une photo de toi — de préférence en pied.",
    mailQuestion: "Où envoyons-nous ta vidéo ?",
    namenFrage: "C'est l'anniversaire de qui ? Le prénom sera sur la carte", namenPlatzhalter: "Anna",
    heroA: "Souhaite un anniversaire d'une façon ", heroY: "que personne n'attend", heroB: " 🎂",
    wieGeht: [
      "Dis ton message — simplement ce que tu veux vraiment dire. Aucun texte imposé.",
      "Envoie ta photo — c'est toi qui sers de base à ton film.",
      "Reçois ton film d'anniversaire — prêt à envoyer par WhatsApp, Messenger ou e-mail.",
    ],
    filmTitel: "De quelques mots prononcés naît un moment",
    filmText: "Tu apparais dans un monde d'anniversaire surréaliste et hors du commun — avec un gâteau spectaculaire, une tenue singulière et un décor qui n'existe que pour ce moment. Ton message reste ton message. Ta voix reste ta voix. Seul le monde autour de toi change.",
    unterVideo: "Choisis un modèle — monde de rêve ou réel. Et envoie une carte postale vidéo numérique inoubliable.",
    anlaesseTitel: "Pour les anniversaires qui méritent mieux qu'un « Joyeux anniversaire 🎂 »",
    anlaesse: ["Pour ta mère.", "Pour ton conjoint.", "Pour ta meilleure amie.", "Pour quelqu'un qui est loin.", "Ou pour la personne à qui un message ordinaire ne suffirait jamais."],
    anlaesseSchluss: "Pas une vidéo d'anniversaire parmi d'autres. La tienne.",
    wieGehtPrivat: "Personne d'autre ne la voit. Elle reste privée jusqu'à ce que tu l'envoies.",
    priceLine: "Vidéo {geburtstag}", buyOnce: "Vidéo d'anniversaire {geburtstag}",
    ctaVideo: "Vidéo de {sek} s — {geburtstag}",
    makeVideo: "Créer ma vidéo — {geburtstag} 🎂", makingKiss: "Ta vidéo se prépare …",
    watchOnce: "Voir ma vidéo — {geburtstag}", blockedOnce: "Vraie vidéo d'anniversaire — {geburtstag}",
    readyBody: "Débloque-la et écoute-la.",
  },
  pt: {
    anlass: "Para os 18 · para os 60 · para a mãe · para a tua irmã · para o amigo que está longe · quando uma mensagem não chega",
    grund: "A tua cara. A tua voz. Um mundo que existe só para este momento. Sem cartão, sem cumprimento genérico — tu, encenado como ninguém espera.",
    step1: "1 · A tua foto", step3: "2 · O teu vídeo de aniversário",
    pickFirst: "Carrega a tua foto",
    upTitle: "A tua foto", upHint: "Uma foto tua — de preferência de corpo inteiro.",
    mailQuestion: "Para onde enviamos o teu vídeo?",
    namenFrage: "De quem é o aniversário? O nome fica no cartão", namenPlatzhalter: "Ana",
    heroA: "Dá os parabéns de uma forma ", heroY: "que ninguém espera", heroB: " 🎂",
    wieGeht: [
      "Diz a tua mensagem — simplesmente o que queres mesmo dizer. Sem guião.",
      "Carrega a tua foto — és tu a base do teu filme.",
      "Recebe o teu filme de aniversário — pronto a enviar por WhatsApp, Messenger ou e-mail.",
    ],
    filmTitel: "De umas poucas palavras nasce um momento",
    filmText: "Apareces num mundo de aniversário surreal e fora do comum — com um bolo espetacular, um visual especial e um cenário que existe só para este momento. A tua mensagem continua a ser tua. A tua voz continua a ser tua. Só muda o mundo à tua volta.",
    unterVideo: "Escolhe um modelo — mundo de sonho ou real. E envia um postal de vídeo digital inesquecível.",
    anlaesseTitel: "Para aniversários que merecem mais do que «Parabéns 🎂»",
    anlaesse: ["Para a tua mãe.", "Para o teu companheiro.", "Para a tua melhor amiga.", "Para alguém que está longe.", "Ou para a pessoa a quem uma mensagem normal nunca chegaria."],
    anlaesseSchluss: "Não um vídeo de aniversário qualquer. O teu.",
    wieGehtPrivat: "Mais ninguém o vê. Fica privado até seres tu a enviá-lo.",
    priceLine: "Vídeo {geburtstag}", buyOnce: "Vídeo de aniversário {geburtstag}",
    ctaVideo: "Vídeo de {sek} s — {geburtstag}",
    makeVideo: "Criar o meu vídeo — {geburtstag} 🎂", makingKiss: "A criar o teu vídeo …",
    watchOnce: "Ver o meu vídeo — {geburtstag}", blockedOnce: "Vídeo de aniversário real — {geburtstag}",
    readyBody: "Desbloqueia e ouve-a.",
  },
  it: {
    anlass: "Per i 18 · per i 60 · per la mamma · per tua sorella · per l'amico lontano · quando un messaggio non basta",
    grund: "La tua faccia. La tua voce. Un mondo che esiste solo per questo momento. Nessun biglietto, nessun augurio generico — tu, messo in scena come nessuno si aspetta.",
    step1: "1 · La tua foto", step3: "2 · Il tuo video di compleanno",
    pickFirst: "Carica la tua foto",
    upTitle: "La tua foto", upHint: "Una foto di te — meglio a figura intera.",
    mailQuestion: "Dove ti mandiamo il video?",
    namenFrage: "Di chi è il compleanno? Il nome va sul biglietto", namenPlatzhalter: "Anna",
    heroA: "Fai gli auguri in un modo ", heroY: "che nessuno si aspetta", heroB: " 🎂",
    wieGeht: [
      "Di' il tuo messaggio — semplicemente quello che vuoi davvero dire. Senza copione.",
      "Carica la tua foto — sei tu la base del tuo film.",
      "Ricevi il tuo film di compleanno — pronto da mandare su WhatsApp, Messenger o e-mail.",
    ],
    filmTitel: "Da poche parole dette nasce un momento",
    filmText: "Compari in un mondo di compleanno surreale e fuori dal comune — con una torta spettacolare, un look speciale e una scena che esiste solo per questo momento. Il tuo messaggio resta il tuo messaggio. La tua voce resta la tua voce. Cambia solo il mondo intorno a te.",
    unterVideo: "Scegli un modello — mondo da sogno o reale. E manda una cartolina video digitale indimenticabile.",
    anlaesseTitel: "Per compleanni che meritano più di un «Tanti auguri 🎂»",
    anlaesse: ["Per tua madre.", "Per il tuo compagno.", "Per la tua migliore amica.", "Per qualcuno che è lontano.", "O per la persona a cui un messaggio normale non basterebbe mai."],
    anlaesseSchluss: "Non un video di compleanno qualsiasi. Il tuo.",
    wieGehtPrivat: "Nessun altro lo vede. Resta privato finché non lo mandi tu.",
    priceLine: "Video {geburtstag}", buyOnce: "Video di compleanno {geburtstag}",
    ctaVideo: "Video da {sek} s — {geburtstag}",
    makeVideo: "Crea il mio video — {geburtstag} 🎂", makingKiss: "Sto creando il tuo video …",
    watchOnce: "Guarda il mio video — {geburtstag}", blockedOnce: "Video di compleanno vero — {geburtstag}",
    readyBody: "Sbloccalo e ascoltala.",
  },
};


/**
 * GUTSCHEIN VERPACKEN — die Beschriftungen des Trichters (Owner 05.08.2026: „Man, wir haben
 * doch einen Trichter. Du hast den verlassen.").
 *
 * Er hat recht: `EinladungBauen` IST die Maschine, Hochzeit und Urlaub sind Varianten davon.
 * Der Gutschein wird die dritte — kein zweites Bauteil, sondern dieselbe Datei mit anderen
 * Worten. Deshalb steht hier nur, was ANDERS heisst; alles Übrige erbt er aus TABELLE.
 *
 * WAS DIE VARIANTE UNTERSCHEIDET, in einem Satz: Bei Hochzeit und Urlaub lädt er ZWEI Fotos
 * hoch und wir setzen die beiden in eine Szene. Beim Gutschein gibt es keine zweite Person und
 * keine Szene — es gibt IHN (ein Video von sich, oder unseres) und SEINEN GUTSCHEIN (den Link
 * des Händlers). Deshalb heisst der zweite Platz hier nicht „sie oder er", sondern „der
 * Gutschein".
 */
const GUTSCHEIN: Record<Lang, Partial<KissText>> = {
  en: {
    pickFirst: "Upload your video first",
    mailQuestion: "Your email address",
    uploadFirst: "Add your voucher",
    pickHint: "One video of you — or use ours.",
    datenErsetzen: "Replace the details",
    upTitle: "You",
    upHint: "A short video of you, or one photo.",
    you: "THE VOUCHER",
    uploadYou: "Add your voucher",
    youHint: "The link your shop sent you",
    readyTitle: "Your voucher card is ready 🎁",
    makingKiss: "Your card is being made …",
    examples: "This is what your card looks like",
    ctaVideo: "Create the card",
    /* Die Hochzeits-Zeile („Tippt oben auf eure Namen") spricht ein Paar an — beim
       Gutschein fehlt nur der EINE Absendername im „Von"-Feld der Karte. */
    namenVorSenden: "Tap “From” on the card and add your name",
    lbTitel: "What are you gifting?",
    lbWem: "Who are you gifting?",
    lbWahlTitel: "Pick the product or credit",
    lbHilfe: "The credit lands on their account — that email is their login, and they redeem it on any theme page.",
    lbEmpfaenger: "Their email address",
    lbFehlerMail: "First add the email of the person you are gifting it to.",
    lbFertig: "Paid — {was} is ready for them. Now send the card.",
    lbGehtAn: "Goes to {mail} — that is where the credit sits.",
    lbGuthaben: "Or plain credit:",
    lbCta: "Pay for the gift — {preis}",
  },
  de: {
    pickFirst: "Lade zuerst dein Video hoch",
    mailQuestion: "Deine E-Mail-Adresse",
    uploadFirst: "Füge deinen Gutschein an",
    pickHint: "Ein Video von dir — oder nimm unseres.",
    datenErsetzen: "Angaben ersetzen",
    upTitle: "Du",
    upHint: "Ein kurzes Video von dir, oder ein Foto.",
    you: "DER GUTSCHEIN",
    uploadYou: "Füge deinen Gutschein an",
    youHint: "Der Link, den dir der Händler geschickt hat",
    readyTitle: "Deine Gutschein-Karte ist fertig 🎁",
    makingKiss: "Deine Karte entsteht …",
    examples: "So sieht deine Karte aus",
    ctaVideo: "Karte erstellen",
    namenVorSenden: "Tipp auf der Karte auf „Von“ und trag deinen Namen ein",
    lbTitel: "Was schenkst du?",
    lbWem: "Wem schenkst du?",
    lbWahlTitel: "Wähle das Produkt oder Guthaben",
    lbHilfe: "Das Guthaben landet auf ihrem Konto — die E-Mail ist zugleich ihr Login, einlösbar auf jeder Themenseite.",
    lbEmpfaenger: "E-Mail des Beschenkten",
    lbFehlerMail: "Trag zuerst die E-Mail des Beschenkten ein.",
    lbFertig: "Bezahlt — {was} liegt bereit. Jetzt die Karte verschicken.",
    lbGehtAn: "Geht an {mail} — dort liegt das Guthaben.",
    lbGuthaben: "Oder nur Guthaben:",
    lbCta: "Geschenk bezahlen — {preis}",
  },
  ro: {
    pickFirst: "Încarcă mai întâi videoclipul tău",
    mailQuestion: "Adresa ta de e-mail",
    uploadFirst: "Adaugă voucherul tău",
    pickHint: "Un videoclip cu tine — sau folosește-l pe al nostru.",
    datenErsetzen: "Înlocuiește datele",
    upTitle: "Tu",
    upHint: "Un scurt videoclip cu tine, sau o poză.",
    you: "VOUCHERUL",
    uploadYou: "Adaugă voucherul tău",
    youHint: "Linkul pe care ți l-a trimis magazinul",
    readyTitle: "Cardul tău cu voucher e gata 🎁",
    makingKiss: "Se face cardul tău …",
    examples: "Așa arată cardul tău",
    ctaVideo: "Creează cardul",
    namenVorSenden: "Atinge „De la” pe card și scrie-ți numele",
    lbTitel: "Ce dăruiești?",
    lbWem: "Cui dăruiești?",
    lbWahlTitel: "Alege produsul sau creditul",
    lbHilfe: "Creditul ajunge în contul lor — e-mailul e chiar loginul lor și se folosește pe orice pagină de teme.",
    lbEmpfaenger: "E-mailul persoanei",
    lbFehlerMail: "Scrie mai întâi e-mailul persoanei căreia îi dăruiești.",
    lbFertig: "Plătit — {was} e pregătit. Trimite acum cardul.",
    lbGehtAn: "Merge la {mail} — acolo stă creditul.",
    lbGuthaben: "Sau doar credit:",
    lbCta: "Plătește cadoul — {preis}",
  },
  es: {
    pickFirst: "Sube primero tu vídeo",
    mailQuestion: "Tu correo electrónico",
    uploadFirst: "Añade tu vale",
    pickHint: "Un vídeo tuyo — o usa el nuestro.",
    datenErsetzen: "Cambiar los datos",
    upTitle: "Tú",
    upHint: "Un vídeo corto tuyo, o una foto.",
    you: "EL VALE",
    uploadYou: "Añade tu vale",
    youHint: "El enlace que te mandó la tienda",
    readyTitle: "Tu tarjeta con el vale está lista 🎁",
    makingKiss: "Se está creando tu tarjeta …",
    examples: "Así se ve tu tarjeta",
    ctaVideo: "Crear la tarjeta",
    namenVorSenden: "Toca «Desde» en la tarjeta y escribe tu nombre",
    lbTitel: "¿Qué regalas?",
    lbWem: "¿A quién se lo regalas?",
    lbWahlTitel: "Elige el producto o el saldo",
    lbHilfe: "El saldo llega a su cuenta — ese correo es su login y lo canjea en cualquier página de temas.",
    lbEmpfaenger: "El correo de la persona",
    lbFehlerMail: "Escribe primero el correo de la persona.",
    lbFertig: "Pagado — {was} está listo. Ahora envía la tarjeta.",
    lbGehtAn: "Va a {mail} — ahí está el saldo.",
    lbGuthaben: "O solo saldo:",
    lbCta: "Pagar el regalo — {preis}",
  },
  fr: {
    pickFirst: "Ajoute d'abord ta vidéo",
    mailQuestion: "Ton adresse e-mail",
    uploadFirst: "Ajoute ton bon cadeau",
    pickHint: "Une vidéo de toi — ou prends la nôtre.",
    datenErsetzen: "Remplacer les infos",
    upTitle: "Toi",
    upHint: "Une courte vidéo de toi, ou une photo.",
    you: "LE BON",
    uploadYou: "Ajoute ton bon cadeau",
    youHint: "Le lien que la boutique t'a envoyé",
    readyTitle: "Ta carte avec le bon est prête 🎁",
    makingKiss: "On fabrique ta carte …",
    examples: "Voilà à quoi ressemble ta carte",
    ctaVideo: "Créer la carte",
    namenVorSenden: "Touche « Du » sur la carte et ajoute ton prénom",
    lbTitel: "Qu'est-ce que tu offres ?",
    lbWem: "À qui offres-tu ?",
    lbWahlTitel: "Choisis le produit ou le crédit",
    lbHilfe: "Le crédit arrive sur son compte — cet e-mail est aussi son login, à utiliser sur n'importe quelle page.",
    lbEmpfaenger: "L'e-mail de la personne",
    lbFehlerMail: "Ajoute d'abord l'e-mail de la personne.",
    lbFertig: "Payé — {was} est prêt. Envoie la carte maintenant.",
    lbGehtAn: "Va à {mail} — c’est là qu’est le crédit.",
    lbGuthaben: "Ou juste du crédit :",
    lbCta: "Payer le cadeau — {preis}",
  },
  pt: {
    pickFirst: "Carrega primeiro o teu vídeo",
    mailQuestion: "O teu e-mail",
    uploadFirst: "Junta o teu vale",
    pickHint: "Um vídeo teu — ou usa o nosso.",
    datenErsetzen: "Substituir os dados",
    upTitle: "Tu",
    upHint: "Um vídeo curto teu, ou uma foto.",
    you: "O VALE",
    uploadYou: "Junta o teu vale",
    youHint: "O link que a loja te enviou",
    readyTitle: "O teu cartão com o vale está pronto 🎁",
    makingKiss: "O teu cartão está a ser feito …",
    examples: "É assim que fica o teu cartão",
    ctaVideo: "Criar o cartão",
    namenVorSenden: "Toca em «De» no cartão e escreve o teu nome",
    lbTitel: "O que vais oferecer?",
    lbWem: "A quem ofereces?",
    lbWahlTitel: "Escolhe o produto ou o saldo",
    lbHilfe: "O saldo entra na conta deles — esse e-mail é o login deles e usa-se em qualquer página de temas.",
    lbEmpfaenger: "O e-mail da pessoa",
    lbFehlerMail: "Escreve primeiro o e-mail da pessoa.",
    lbFertig: "Pago — {was} está pronto. Agora envia o cartão.",
    lbGehtAn: "Vai para {mail} — é aí que está o saldo.",
    lbGuthaben: "Ou só saldo:",
    lbCta: "Pagar o presente — {preis}",
  },
  it: {
    pickFirst: "Carica prima il tuo video",
    mailQuestion: "Il tuo indirizzo e-mail",
    uploadFirst: "Aggiungi il tuo buono",
    pickHint: "Un video tuo — oppure usa il nostro.",
    datenErsetzen: "Sostituisci i dati",
    upTitle: "Tu",
    upHint: "Un breve video tuo, o una foto.",
    you: "IL BUONO",
    uploadYou: "Aggiungi il tuo buono",
    youHint: "Il link che ti ha mandato il negozio",
    readyTitle: "La tua card con il buono è pronta 🎁",
    makingKiss: "Stiamo facendo la tua card …",
    examples: "Ecco come sarà la tua card",
    ctaVideo: "Crea la card",
    namenVorSenden: "Tocca “Dal” sulla card e scrivi il tuo nome",
    lbTitel: "Cosa regali?",
    lbWem: "A chi lo regali?",
    lbWahlTitel: "Scegli il prodotto o il credito",
    lbHilfe: "Il credito arriva sul loro conto — quell'e-mail è il loro login e si usa su qualsiasi pagina dei temi.",
    lbEmpfaenger: "L'e-mail della persona",
    lbFehlerMail: "Scrivi prima l'e-mail della persona.",
    lbFertig: "Pagato — {was} è pronto. Ora invia la card.",
    lbGehtAn: "Va a {mail} — lì si trova il credito.",
    lbGuthaben: "Oppure solo credito:",
    lbCta: "Paga il regalo — {preis}",
  },
};

/**
 * DAS VERSPRECHEN (Owner 10.08.2026: „Sende ein Verprechen an dich und an deine Freunde. Du
 * lädst ein Video von dir hoch und sagst ich werde es in den nächsten Jaren schaffen. …
 * Am Ende muss ein Video raus kommen wo du mit Pirsche und Villa dargestellt bist und sagst.
 * Ich werde es schaffen und werde hard dafür arbeiten.").
 *
 * NUR DIE ZEILEN, DIE WIRKLICH ANDERS SIND — alles Übrige erbt es vom Geburtstag (siehe
 * `kissText`). Was hier steht, ist der Anlass, der Grund, die drei Schritte und der Satz
 * unter dem Beispielvideo; die ganze Trichter-Mechanik spricht bereits sieben Sprachen.
 *
 * DIE ÜBERSCHRIFT IST DER SCHRIFTZUG, MIT DEM DIE SEITE ANFÄNGT (Owner 11.08.2026: „ich will
 * dass es mit einem fetten schift zug anfängt. Eine Videobotschaft an dich selbs, die dein
 * Leben radikal verändern wird.").
 *
 * Sein Wortlaut, unverändert übernommen und in die sieben Sprachen gesetzt. Sie nennt in
 * einer Zeile das PRODUKT („eine Videobotschaft an dich selbst" — derselbe Name wie auf der
 * Kachel) und den GRUND, sie anzusehen. Vorher stand hier die Frage „Wie willst du in fünf
 * Jahren leben?": ein guter Haken, aber sie liess offen, was man kauft — und der Name des
 * Themas kam auf der Seite selbst überhaupt nicht mehr vor.
 *
 * ZWEIFARBIG, WIE JEDE H1 IM HAUS: der Gegenstand weiss (`heroA`), das Versprechen in Gold
 * (`heroY`). Der Punkt am Ende steht in `heroB` — es ist eine Aussage, keine Frage mehr.
 *
 * ES BLEIBT EINE AUSSAGE ÜBER DAS LEBEN, KEINE ÜBER GELD: „radikal verändern" darf da stehen,
 * „werde reich" nicht — kein Einkommen, keine Zahl, keine Vorhersage über Geld. Das ist die
 * Hausregel aus dem gelöschten System-Thema, und daran hängt das Stripe-Konto.
 *
 * Was er im Video sagt, bleibt SEIN Satz: Wir sagen nicht „du wirst erfolgreich" — ER sagt es
 * („I am going to make it"), mit seiner eigenen Stimme.
 *
 * SEIT 11.08.2026 KEIN VIDEO MEHR, EIN PROGRAMM (Owner: „Future Self Program"). Die
 * Landingpage verkauft nicht mehr nur das Video, sondern den Future Film PLUS ein 30-Tage-
 * Programm mit Checkliste, Fortschritt und 90-Tage-Anschlussziel — deshalb die zusätzlichen
 * Felder (`heroSub`, `mehrTitel`/`mehrText`, `wasBekommst…`, `emoTitel`/`emoText`,
 * `howTitel`/`howTitelListe`/`howTextListe`, `finalTitel`/`finalIncludes`/`finalSub`).
 *
 * DER PREIS WECHSELTE AM 11.08.2026 MEHRFACH AN EINEM EINZIGEN TAG und fiel zuletzt deutlich.
 * DESHALB STEHT DER BETRAG AUSSCHLIESSLICH IN `VERSPRECHEN_CENTS` (lib/pricing.ts) — hier
 * keine Zahl, auch nicht im Kommentar: Wer eine abtippt, hat morgen eine tote Zahl im Text.
 *
 * Die Texte hier standen auf dem HOHEN Preis: sie argumentierten wie eine
 * Investitionsentscheidung — Schwere, Feierlichkeit, lange Begründungen, warum es das wert
 * ist. Für den niedrigen Preis ist das die falsche Tonlage. Wer so wenig zahlt, muss nicht
 * überzeugt werden, dass es das WERT ist, sondern eingeladen werden, HEUTE anzufangen.
 *
 * Deshalb sind `mehrText`, `wasBekommstTextListe`, `emoTitel`/`emoText` und der erste Schritt
 * in `howTextListe` auf den letzten Stand getrimmt: Was er BEKOMMT, ist unverändert — wie
 * SCHWER es klingt, nicht mehr. Die drei Hürdensenker schwingen jetzt überall mit: zwei
 * Minuten Aufnahme, Start am selben Tag, Garantie nach 7 Tagen.
 *
 * UNANGETASTET BLEIBT SEIN WORTLAUT: heroA/heroY/heroB, `jetztStarten` („Investiere in deine
 * Zukunft"), `unterVideoZeilen`, `emoMarkensatz`/`finalSub`, `garantieTitel`/`garantieText`,
 * `finalIncludes`.
 *
 * DER BETRAG ERREICHT DIE TEXTE NUR ÜBER DEN PLATZHALTER {programm}. Kein Vergleich mit
 * Konsumgütern („weniger als zwei Kaffee") und keine Streichpreis-Masche (Owner 11.08.2026,
 * wörtlich: „wir zeigen nie" den alten Preis): Die höheren Beträge waren nie live, ein
 * durchgestrichener alter Preis wäre eine erfundene Ersparnis — und rechtlich angreifbar.
 *
 * `filmTitel`/`filmText` bleiben unverändert stehen: Sie sind NICHT nur Landingpage-Text,
 * sondern der Kartentitel des fertigen Videos in `KissFunnel.tsx` (`titel={T.filmTitel}`) —
 * wer sie ändert, ändert auch, was auf der ausgelieferten Karte steht. Die Landingpage zeigt
 * sie seit dem Umbau nicht mehr an; der Abschnitt „Mehr als ein Video" ersetzt sie dort.
 */
const VERSPRECHEN: Record<Lang, Partial<KissText>> = {
  de: {
    heroA: "Dein Future Film und dein ", heroY: "30-Tage-Programm", heroB: ".",
    heroSub: ["Sieh, wer du in 5 Jahren sein willst.", "Mach dir selbst ein Versprechen.", "Und arbeite 30 Tage daran, es zu halten."],
    jetztStarten: "Investiere in deine Zukunft",
    namenFrage: "An wen schickst du es? Der Name kommt auf die Karte", namenPlatzhalter: "Max",
    /* SCHRITT 1 DES EINEN TUNNELS (KONZEPT-TUNNEL.md, Owner 12.08.2026: „Stepp 1. Name,
       Email"). Nur diese vier Zeilen sind neu — der Rest des Trichters bleibt derselbe. */
    /* TEXT-FOLGEAUFTRAG (Owner 12.08.2026, ChatGPT-Papier §22–26): wörtlich übernommen —
       siehe Kommentar am Typ (`tunnelIntro` etc.) für die Bausteine, die sie zeigen. */
    tunnelStartTitel: "Mach deinem zukünftigen Ich ein Versprechen.", tunnelName: "Dein Name",
    tunnelEmail: "Deine E-Mail", tunnelWeiter: "Weiter",
    tunnelIntro: "Nimm heute eine kurze Nachricht an dich selbst auf. Wir machen daraus deinen Future Film und dein 30-Tage-Programm.",
    tunnelKleinText: "Deine E-Mail speichert dein Projekt und dein fertiges Ergebnis. Kein Spam.",
    zukunftTitel: "Wie sieht deine Zukunft aus?",
    zukunftUnterzeile: "Wähle die Welt, in der du dein zukünftiges Ich sehen möchtest.",
    tunnelWeiterAuswahl: "Diese Zukunft wählen",
    aufTitel3: "Jetzt kommt der wichtigste Teil.",
    aufHinweis3: "Schau in die Kamera und sag dir selbst, was du in den nächsten 30 Tagen verändern willst. Du musst nicht perfekt aussehen. Sprich einfach ehrlich.",
    aufBeispiel: "»In 30 Tagen will ich …«",
    heuteLabel: "DU HEUTE",
    zukunftLabel: "DEIN ZUKÜNFTIGES ICH",
    verbindenText: "Wir verbinden deine Nachricht mit deiner Zukunftsvision. Danach beginnt dein persönliches 30-Tage-Programm.",
    aufCta: "Video aufnehmen",
    aufFertig: "Das ist mein Versprechen",
    generateNow: "Future Self Program starten",
    ergebnisTitel: "Das ist dein Versprechen an dich selbst.",
    ergebnisText: "Jetzt beginnt der wichtige Teil. Du hast dir ein Versprechen gegeben. Halte es 30 Tage lang.",
    unterVideoZeilen: ["Sieh deine Zukunft.", "Mach das Versprechen.", "Halte das Versprechen."],
    filmTitel: "Aus einem Satz wird ein Beweis",
    filmText: "Du erscheinst vor der Villa, der Wagen steht hinter dir — und du sagst deinen eigenen Satz, mit deiner eigenen Stimme. Was du versprichst, bestimmst du. Nur die Welt um dich herum ändert sich.",
    mehrTitel: "Mehr als ein Video.",
    /* LEICHTER STATT FEIERLICHER (11.08.2026, Preissenkung): Der Abschnitt begann mit
       „Du siehst dich in dem Leben, das du dir aufbauen willst" — eine schöne, aber schwere
       Zeile, die den hohen Preis rechtfertigen sollte. Jetzt nennt er zuerst die HÜRDE, und
       die ist klein: zwei Minuten Aufnahme, Start am selben Tag. Was er bekommt, bleibt. */
    mehrText: [
      "Dein Future Film ist der Anfang — und der ist schnell gemacht.",
      "Eine halbe Minute Aufnahme: dein Gesicht, deine Stimme, dein Versprechen an dein zukünftiges Ich.",
      "Noch am selben Tag beginnt dein 30-Tage-Programm.",
      "Jeden Tag ein konkreter Schritt.",
      "Jeden Tag deine Checkliste.",
      "Jeden Tag die Frage: Habe ich heute etwas für meine Zukunft getan?",
    ],
    wasBekommstTitel: "Dein Future Self Program",
    wasBekommstTitelListe: ["Dein Future Film", "Dein Versprechen", "30 Tage", "Deine Checkliste", "Dein Fortschritt", "Die nächsten 90 Tage"],
    /* KONKRET STATT FEIERLICH (11.08.2026, Preissenkung): „Ein strukturiertes Programm,
       das deine Vision in konkrete tägliche Schritte übersetzt" klang nach Seminar-Prospekt —
       nach etwas, das man sich überlegt. Dieselbe Leistung, nur in Aufwand und Zeit gesagt:
       zwei Minuten, ein Schritt pro Tag, heute. */
    wasBekommstTextListe: [
      "Dein Gesicht. Deine Stimme. Dein Leben in 5 Jahren — aus einer halben Minute Aufnahme.",
      "Die Botschaft, die du heute an dein zukünftiges Ich aufnimmst.",
      "30 Tage, ein Schritt pro Tag. Tag 1 ist heute.",
      "Hak jeden Abend ab, was du wirklich getan hast. Eine Minute.",
      "Sieh, wie viele Tage du dein Versprechen bereits gehalten hast.",
      "Nach Tag 30 setzt du dein nächstes Ziel.",
    ],
    /* EINLADUNG STATT MAHNUNG (11.08.2026, Preissenkung): „nur dann etwas wert, wenn du
       danach handelst" war die Predigt vor einer ernsthaften Entscheidung. Jetzt zeigt der
       Satz nach vorn, auf den Tag, an dem er anfängt. Aussage über Handeln, nie über Geld. */
    emoTitel: "Ein Versprechen zählt ab dem Tag, an dem du anfängst.",
    emoText: ["Du musst heute noch nicht wissen, wie du alles erreichen wirst.", "Du musst heute nur anfangen.", "Schritt für Schritt.", "Tag für Tag."],
    emoMarkensatz: ["I'm going to bandit this life.", "I promise."],
    howTitel: "So funktioniert es",
    howTitelListe: ["Nimm dich heute auf", "Zeig uns, wo du in 5 Jahren sein willst", "Wir erstellen deinen Future Film", "Starte deine 30 Tage"],
    /* DIE HÜRDE STEHT IN SCHRITT 1 (11.08.2026): „So wie du heute bist" liess offen, wie viel
       Arbeit die Aufnahme ist. Zwei Minuten mit dem Handy — mehr braucht der Einstieg nicht. */
    howTextListe: [
      "Eine halbe Minute mit dem Handy, so wie du heute bist.",
      "Wähle deine wichtigsten Ziele.",
      "Mit deinem Gesicht, deiner Stimme und deiner Vision.",
      "Ab heute: Öffne deinen privaten Link jeden Tag und halte dein Versprechen.",
    ],
    finalTitel: ["Deine Zukunft beginnt nicht in 5 Jahren.", "Sie beginnt mit dem, was du heute tust."],
    finalIncludes: ["Future Film", "30-Tage-Programm", "Tägliche Checkliste", "Fortschritts-Tracking", "90-Tage-Plan", "Private persönliche Seite"],
    /* Der Preis als SATZ statt als grosse nackte Zahl — siehe `finalPreisZeile` am Typ
       (11.08.2026, 19,99). {programm} kommt aus VERSPRECHEN_CENTS. */
    finalPreisZeile: "Alles zusammen für {programm} — einmalig, kein Abo.",
    finalSub: "Bandit this life.",
    sprichDarueber: "Sprich darüber:",
    garantieTitel: "30-Tage-Versprechen-Garantie",
    garantieText: "Mach die ersten 7 Tage. Wenn du danach findest, dass das Future Self Program nichts für dich ist, sag uns innerhalb von 30 Tagen Bescheid — und du bekommst dein Geld zurück.",
    geldZurueckGarantie: "30-Tage-Versprechen-Garantie",
    /* DIE KAUFTEXTE DES PROGRAMMS (11.08.2026, Owner-Screenshot: „was ist das mit 9,99? er
       kauft doch das programm") — ohne diese Zeilen erbte der Trichter die Geburtstags-
       Kauftexte samt {geburtstag}: Knopf und Kasse nannten verschiedene Beträge. Der
       Platzhalter {programm} kommt aus fillPrices (VERSPRECHEN_CENTS). */
    step2: "2 · Dein Future Film",
    ctaVideo: "Future Self Program — {programm}",
    buyOnce: "Future Self Program — {programm}",
    priceLine: "Future Self Program — {programm}",
    makeVideo: "Starte dein Future Self Program — {programm}",
    blockedOnce: "Starte dein Future Self Program — {programm}",
    watchOnce: "Mein Future Film — {programm}",
    makingKiss: "Dein Future Film entsteht. Wir verwandeln dein Versprechen jetzt in deine persönliche Zukunftsvision.",
    /* SCHRITT-TITEL des Zweischritt-Tunnels (Owner 12.08.2026): ohne eigenen Eintrag erbte die Kaskade „Your birthday video" aus GEBURTSTAG. */
    step3: "2 · Dein Future Film",
    mailQuestion: "Wohin sollen wir dein Programm schicken?",
    mailNote: "Hierhin schicken wir deinen Future Film und deinen privaten Programm-Link.",
    programmKnopf: "Mein 30-Tage-Programm starten →",
    filmKommt: "Dein Future Film entsteht gerade — er kommt per E-Mail.",
    filmFertig: "Dein Future Film ist fertig — er liegt in deiner Galerie.",
    filmFehler: "Dein Future Film hat noch nicht geklappt — wir kümmern uns und schicken ihn dir.",
  },
  en: {
    heroA: "Your Future Film and your ", heroY: "30-day program", heroB: ".",
    heroSub: ["See who you want to be in 5 years.", "Make yourself a promise.", "And work 30 days to keep it."],
    jetztStarten: "Invest in your future",
    namenFrage: "Who are you sending it to? The name goes on the card", namenPlatzhalter: "Max",
    tunnelStartTitel: "Make a promise to your future self.", tunnelName: "Your name",
    tunnelEmail: "Your email", tunnelWeiter: "Next",
    tunnelIntro: "Record a short message to yourself today. We turn it into your Future Film and your 30-day program.",
    tunnelKleinText: "Your email saves your project and your finished result. No spam.",
    zukunftTitel: "What does your future look like?",
    zukunftUnterzeile: "Choose the world where you want to see your future self.",
    tunnelWeiterAuswahl: "Choose this future",
    aufTitel3: "Now comes the most important part.",
    aufHinweis3: "Look into the camera and tell yourself what you want to change in the next 30 days. You don't have to look perfect. Just speak honestly.",
    aufBeispiel: "“In 30 days I will …”",
    heuteLabel: "YOU TODAY",
    zukunftLabel: "YOUR FUTURE SELF",
    verbindenText: "We connect your message with your future vision. Then your personal 30-day program begins.",
    aufCta: "Record video",
    aufFertig: "This is my promise",
    generateNow: "Start Future Self Program",
    ergebnisTitel: "This is your promise to your future self.",
    ergebnisText: "Now the important part begins. You made yourself a promise. Keep it for 30 days.",
    unterVideoZeilen: ["See your future.", "Make the promise.", "Keep the promise."],
    filmTitel: "One sentence becomes proof",
    filmText: "You appear in front of the villa, the car behind you — saying your own line, in your own voice. What you promise is up to you. Only the world around you changes.",
    mehrTitel: "More than a video.",
    /* Leichter statt feierlicher — siehe de-Block (11.08.2026, Preissenkung). */
    mehrText: [
      "Your Future Film is the beginning — and it's quick to make.",
      "Half a minute of recording: your face, your voice, your promise to your future self.",
      "Your 30-day program starts the same day.",
      "Every day a concrete step.",
      "Every day your checklist.",
      "Every day the same question: Did I do something for my future today?",
    ],
    wasBekommstTitel: "Your Future Self Program",
    wasBekommstTitelListe: ["Your Future Film", "Your Promise", "30 Days", "Your Checklist", "Your Progress", "The Next 90 Days"],
    /* Konkret statt feierlich — siehe de-Block (11.08.2026, Preissenkung). */
    wasBekommstTextListe: [
      "Your face. Your voice. Your life in 5 years — from half a minute of recording.",
      "The message you record today to your future self.",
      "30 days, one step a day. Day 1 is today.",
      "Tick off every evening what you really did. Takes a minute.",
      "See how many days you've already kept your promise.",
      "After day 30, you set your next goal.",
    ],
    /* Einladung statt Mahnung — siehe de-Block (11.08.2026). */
    emoTitel: "A promise counts from the day you start.",
    emoText: ["You don't need to know today exactly how you'll achieve everything.", "You only need to start today.", "Step by step.", "Day by day."],
    emoMarkensatz: ["I'm going to bandit this life.", "I promise."],
    howTitel: "How it works",
    howTitelListe: ["Record yourself today", "Show us where you want to be in 5 years", "We create your Future Film", "Start your 30 days"],
    /* Die Hürde steht in Schritt 1 — siehe de-Block (11.08.2026). */
    howTextListe: [
      "Half a minute on your phone, just as you are today.",
      "Choose your most important goals.",
      "With your face, your voice and your vision.",
      "From today: open your private link every day and keep your promise.",
    ],
    finalTitel: ["Your future doesn't begin in 5 years.", "It begins with what you do today."],
    finalIncludes: ["Future Film", "30-Day Program", "Daily Checklist", "Progress Tracking", "90-Day Plan", "Private Personal Page"],
    /* Preis als Satz — siehe de-Block (11.08.2026, {programm} = VERSPRECHEN_CENTS). */
    finalPreisZeile: "All of it for {programm} — one payment, no subscription.",
    finalSub: "Bandit this life.",
    sprichDarueber: "Talk about:",
    garantieTitel: "30-Day Promise Guarantee",
    garantieText: "Complete the first 7 days. If you still feel the Future Self Program isn't for you, tell us within 30 days and we'll refund your purchase.",
    geldZurueckGarantie: "30-Day Promise Guarantee",
    /* Kauftexte des Programms — siehe de-Block (11.08.2026: Knopf und Kasse nannten verschiedene Beträge). */
    step2: "2 · Your Future Film",
    ctaVideo: "Future Self Program — {programm}",
    buyOnce: "Future Self Program — {programm}",
    priceLine: "Future Self Program — {programm}",
    makeVideo: "Start your Future Self Program — {programm}",
    blockedOnce: "Start your Future Self Program — {programm}",
    watchOnce: "My Future Film — {programm}",
    makingKiss: "Your Future Film is being made. We're turning your promise into your personal vision of the future.",
    /* SCHRITT-TITEL des Zweischritt-Tunnels (Owner 12.08.2026): ohne eigenen Eintrag erbte die Kaskade „Your birthday video" aus GEBURTSTAG. */
    step3: "2 · Your Future Film",
    mailQuestion: "Where should we send your program?",
    mailNote: "This is where we send your Future Film and your private program link.",
    programmKnopf: "Start my 30-day program →",
    filmKommt: "Your Future Film is being made — it arrives by email.",
    filmFertig: "Your Future Film is ready — it is in your gallery.",
    filmFehler: "Your Future Film did not come out right — we are on it and send it to you.",
  },
  ro: {
    heroA: "Future Film-ul tău și ", heroY: "programul de 30 de zile", heroB: ".",
    heroSub: ["Vezi cine vrei să fii peste 5 ani.", "Fă-ți o promisiune.", "Și lucrează 30 de zile ca să o ții."],
    jetztStarten: "Investește în viitorul tău",
    namenFrage: "Cui i-o trimiți? Numele apare pe felicitare", namenPlatzhalter: "Max",
    tunnelStartTitel: "Fă-i o promisiune sinelui tău viitor.", tunnelName: "Numele tău",
    tunnelEmail: "E-mailul tău", tunnelWeiter: "Continuă",
    tunnelIntro: "Înregistrează astăzi un mesaj scurt pentru tine. Îl transformăm în Future Film-ul tău și în programul tău de 30 de zile.",
    tunnelKleinText: "E-mailul tău salvează proiectul tău și rezultatul final. Fără spam.",
    zukunftTitel: "Cum arată viitorul tău?",
    zukunftUnterzeile: "Alege lumea în care vrei să-ți vezi sinele viitor.",
    tunnelWeiterAuswahl: "Alege acest viitor",
    aufTitel3: "Acum vine cea mai importantă parte.",
    aufHinweis3: "Uită-te în cameră și spune-ți ce vrei să schimbi în următoarele 30 de zile. Nu trebuie să arăți perfect. Vorbește pur și simplu sincer.",
    aufBeispiel: "„În 30 de zile o să …”",
    heuteLabel: "TU ASTĂZI",
    zukunftLabel: "EUL TĂU VIITOR",
    verbindenText: "Îți conectăm mesajul cu viziunea ta despre viitor. Apoi începe programul tău personal de 30 de zile.",
    aufCta: "Filmează un videoclip",
    aufFertig: "Aceasta este promisiunea mea",
    generateNow: "Începe Future Self Program",
    ergebnisTitel: "Aceasta este promisiunea ta către tine însuți.",
    ergebnisText: "Acum începe partea importantă. Ți-ai făcut o promisiune. Ține-o timp de 30 de zile.",
    unterVideoZeilen: ["Vezi-ți viitorul.", "Fă promisiunea.", "Ține promisiunea."],
    filmTitel: "O frază devine o dovadă",
    filmText: "Apari în fața vilei, mașina în spatele tău — și spui propria frază, cu vocea ta. Ce promiți decizi tu. Doar lumea din jur se schimbă.",
    mehrTitel: "Mai mult decât un video.",
    /* Leichter statt feierlicher — siehe de-Block (11.08.2026, Preissenkung). */
    mehrText: [
      "Future Film-ul tău este începutul — și se face repede.",
      "O jumătate de minut de înregistrare: fața ta, vocea ta, promisiunea ta către sinele tău viitor.",
      "Programul tău de 30 de zile începe chiar în aceeași zi.",
      "În fiecare zi un pas concret.",
      "În fiecare zi lista ta de verificare.",
      "În fiecare zi aceeași întrebare: Am făcut azi ceva pentru viitorul meu?",
    ],
    wasBekommstTitel: "Future Self Program-ul tău",
    wasBekommstTitelListe: ["Future Film-ul tău", "Promisiunea ta", "30 de zile", "Lista ta de verificare", "Progresul tău", "Următoarele 90 de zile"],
    /* Konkret statt feierlich — siehe de-Block (11.08.2026, Preissenkung). */
    wasBekommstTextListe: [
      "Fața ta. Vocea ta. Viața ta peste 5 ani — dintr-o jumătate de minut de înregistrare.",
      "Mesajul pe care i-l înregistrezi azi sinelui tău viitor.",
      "30 de zile, un pas pe zi. Ziua 1 este azi.",
      "Bifează în fiecare seară ce ai făcut cu adevărat. Durează un minut.",
      "Vezi câte zile ți-ai ținut deja promisiunea.",
      "După ziua 30, îți stabilești următorul obiectiv.",
    ],
    /* Einladung statt Mahnung — siehe de-Block (11.08.2026). */
    emoTitel: "O promisiune contează din ziua în care începi.",
    emoText: ["Nu trebuie să știi azi exact cum vei realiza totul.", "Trebuie doar să începi azi.", "Pas cu pas.", "Zi de zi."],
    emoMarkensatz: ["I'm going to bandit this life.", "I promise."],
    howTitel: "Cum funcționează",
    howTitelListe: ["Filmează-te azi", "Arată-ne unde vrei să fii peste 5 ani", "Îți creăm Future Film-ul", "Începe-ți cele 30 de zile"],
    /* Die Hürde steht in Schritt 1 — siehe de-Block (11.08.2026). */
    howTextListe: [
      "O jumătate de minut cu telefonul, exact așa cum ești azi.",
      "Alege-ți cele mai importante obiective.",
      "Cu fața ta, vocea ta și viziunea ta.",
      "De azi: deschide-ți linkul privat în fiecare zi și ține-ți promisiunea.",
    ],
    finalTitel: ["Viitorul tău nu începe peste 5 ani.", "Începe cu ceea ce faci azi."],
    finalIncludes: ["Future Film", "Program de 30 de zile", "Listă zilnică de verificare", "Urmărirea progresului", "Plan de 90 de zile", "Pagină personală privată"],
    /* Preis als Satz — siehe de-Block (11.08.2026, {programm} = VERSPRECHEN_CENTS). */
    finalPreisZeile: "Totul împreună pentru {programm} — o singură plată, fără abonament.",
    finalSub: "Bandit this life.",
    sprichDarueber: "Vorbește despre:",
    garantieTitel: "Garanția Promisiunii de 30 de Zile",
    garantieText: "Fă primele 7 zile. Dacă după aceea simți că Future Self Program nu e pentru tine, spune-ne în 30 de zile — și îți dăm banii înapoi.",
    geldZurueckGarantie: "Garanția Promisiunii de 30 de Zile",
    step2: "2 · Future Film-ul tău",
    ctaVideo: "Future Self Program — {programm}",
    buyOnce: "Future Self Program — {programm}",
    priceLine: "Future Self Program — {programm}",
    makeVideo: "Începe Future Self Program — {programm}",
    blockedOnce: "Începe Future Self Program — {programm}",
    watchOnce: "Future Film-ul meu — {programm}",
    makingKiss: "Future Film-ul tău se creează. Îți transformăm promisiunea în viziunea ta personală asupra viitorului.",
    /* SCHRITT-TITEL des Zweischritt-Tunnels (Owner 12.08.2026): ohne eigenen Eintrag erbte die Kaskade „Your birthday video" aus GEBURTSTAG. */
    step3: "2 · Future Film-ul tău",
    mailQuestion: "Unde să-ți trimitem programul?",
    mailNote: "Aici îți trimitem Future Film-ul și linkul tău privat de program.",
    programmKnopf: "Începe programul meu de 30 de zile →",
    filmKommt: "Filmul tău Future se creează — îți ajunge pe e-mail.",
    filmFertig: "Filmul tău Future este gata — îl găsești în galeria ta.",
    filmFehler: "Filmul tău Future nu a ieșit bine — ne ocupăm și ți-l trimitem.",
  },
  es: {
    heroA: "Tu Future Film y tu ", heroY: "programa de 30 días", heroB: ".",
    heroSub: ["Ve quién quieres ser dentro de 5 años.", "Hazte una promesa.", "Y trabaja 30 días para cumplirla."],
    jetztStarten: "Invierte en tu futuro",
    namenFrage: "¿A quién se lo mandas? El nombre va en la tarjeta", namenPlatzhalter: "Max",
    tunnelStartTitel: "Hazle una promesa a tu yo futuro.", tunnelName: "Tu nombre",
    tunnelEmail: "Tu correo", tunnelWeiter: "Siguiente",
    tunnelIntro: "Graba hoy un mensaje breve para ti. Lo convertimos en tu Future Film y en tu programa de 30 días.",
    tunnelKleinText: "Tu correo guarda tu proyecto y tu resultado final. Sin spam.",
    zukunftTitel: "¿Cómo es tu futuro?",
    zukunftUnterzeile: "Elige el mundo en el que quieres ver a tu yo futuro.",
    tunnelWeiterAuswahl: "Elegir este futuro",
    aufTitel3: "Ahora viene la parte más importante.",
    aufHinweis3: "Mira a la cámara y dite a ti mismo qué quieres cambiar en los próximos 30 días. No tienes que verte perfecto. Solo habla con sinceridad.",
    aufBeispiel: "“En 30 días voy a …”",
    heuteLabel: "TÚ HOY",
    zukunftLabel: "TU YO FUTURO",
    verbindenText: "Conectamos tu mensaje con tu visión de futuro. Después empieza tu programa personal de 30 días.",
    aufCta: "Grabar vídeo",
    aufFertig: "Esta es mi promesa",
    generateNow: "Empezar Future Self Program",
    ergebnisTitel: "Esta es tu promesa a ti mismo.",
    ergebnisText: "Ahora empieza la parte importante. Te hiciste una promesa. Cúmplela durante 30 días.",
    unterVideoZeilen: ["Ve tu futuro.", "Haz la promesa.", "Cumple la promesa."],
    filmTitel: "Una frase se convierte en prueba",
    filmText: "Apareces delante de la villa, el coche detrás de ti — y dices tu propia frase, con tu voz. Lo que prometes lo decides tú. Solo cambia el mundo a tu alrededor.",
    mehrTitel: "Más que un vídeo.",
    /* Leichter statt feierlicher — siehe de-Block (11.08.2026, Preissenkung). */
    mehrText: [
      "Tu Future Film es el comienzo — y se hace rápido.",
      "Medio minuto de grabación: tu cara, tu voz, tu promesa a tu yo futuro.",
      "Tu programa de 30 días empieza el mismo día.",
      "Cada día un paso concreto.",
      "Cada día tu checklist.",
      "Cada día la misma pregunta: ¿Hice hoy algo por mi futuro?",
    ],
    wasBekommstTitel: "Tu Future Self Program",
    wasBekommstTitelListe: ["Tu Future Film", "Tu Promesa", "30 Días", "Tu Checklist", "Tu Progreso", "Los Próximos 90 Días"],
    /* Konkret statt feierlich — siehe de-Block (11.08.2026, Preissenkung). */
    wasBekommstTextListe: [
      "Tu cara. Tu voz. Tu vida dentro de 5 años — con medio minuto de grabación.",
      "El mensaje que grabas hoy para tu yo futuro.",
      "30 días, un paso al día. El día 1 es hoy.",
      "Marca cada noche lo que hiciste de verdad. Un minuto.",
      "Ve cuántos días ya has cumplido tu promesa.",
      "Después del día 30, fijas tu próximo objetivo.",
    ],
    /* Einladung statt Mahnung — siehe de-Block (11.08.2026). */
    emoTitel: "Una promesa cuenta desde el día en que empiezas.",
    emoText: ["Hoy no necesitas saber exactamente cómo lo lograrás todo.", "Hoy solo tienes que empezar.", "Paso a paso.", "Día a día."],
    emoMarkensatz: ["I'm going to bandit this life.", "I promise."],
    howTitel: "Cómo funciona",
    howTitelListe: ["Grábate hoy", "Muéstranos dónde quieres estar dentro de 5 años", "Creamos tu Future Film", "Empieza tus 30 días"],
    /* Die Hürde steht in Schritt 1 — siehe de-Block (11.08.2026). */
    howTextListe: [
      "Medio minuto con el móvil, tal y como eres hoy.",
      "Elige tus objetivos más importantes.",
      "Con tu cara, tu voz y tu visión.",
      "Desde hoy: abre tu enlace privado cada día y cumple tu promesa.",
    ],
    finalTitel: ["Tu futuro no empieza dentro de 5 años.", "Empieza con lo que haces hoy."],
    finalIncludes: ["Future Film", "Programa de 30 días", "Checklist diaria", "Seguimiento del progreso", "Plan de 90 días", "Página personal privada"],
    /* Preis als Satz — siehe de-Block (11.08.2026, {programm} = VERSPRECHEN_CENTS). */
    finalPreisZeile: "Todo junto por {programm} — un solo pago, sin suscripción.",
    finalSub: "Bandit this life.",
    sprichDarueber: "Habla de esto:",
    garantieTitel: "Garantía de la Promesa de 30 Días",
    garantieText: "Haz los primeros 7 días. Si después sientes que el Future Self Program no es para ti, dínoslo antes de que pasen 30 días — y te devolvemos tu dinero.",
    geldZurueckGarantie: "Garantía de la Promesa de 30 Días",
    step2: "2 · Tu Future Film",
    ctaVideo: "Future Self Program — {programm}",
    buyOnce: "Future Self Program — {programm}",
    priceLine: "Future Self Program — {programm}",
    makeVideo: "Empieza tu Future Self Program — {programm}",
    blockedOnce: "Empieza tu Future Self Program — {programm}",
    watchOnce: "Mi Future Film — {programm}",
    makingKiss: "Tu Future Film se está creando. Estamos convirtiendo tu promesa en tu visión personal del futuro.",
    /* SCHRITT-TITEL des Zweischritt-Tunnels (Owner 12.08.2026): ohne eigenen Eintrag erbte die Kaskade „Your birthday video" aus GEBURTSTAG. */
    step3: "2 · Tu Future Film",
    mailQuestion: "¿A dónde te enviamos tu programa?",
    mailNote: "Aquí te enviamos tu Future Film y tu enlace privado al programa.",
    programmKnopf: "Empezar mi programa de 30 días →",
    filmKommt: "Tu Future Film se está creando — te llega por correo.",
    filmFertig: "Tu Future Film está listo — lo tienes en tu galería.",
    filmFehler: "Tu Future Film no salió bien — nos encargamos y te lo enviamos.",
  },
  fr: {
    heroA: "Ton Future Film et ton ", heroY: "programme de 30 jours", heroB: ".",
    heroSub: ["Vois qui tu veux être dans 5 ans.", "Fais-toi une promesse.", "Et travaille 30 jours pour la tenir."],
    jetztStarten: "Investis dans ton avenir",
    namenFrage: "À qui l'envoies-tu ? Le nom va sur la carte", namenPlatzhalter: "Max",
    tunnelStartTitel: "Fais une promesse à ton futur toi.", tunnelName: "Ton prénom",
    tunnelEmail: "Ton e-mail", tunnelWeiter: "Suivant",
    tunnelIntro: "Enregistre aujourd'hui un court message pour toi. On en fait ton Future Film et ton programme de 30 jours.",
    tunnelKleinText: "Ton e-mail enregistre ton projet et ton résultat final. Pas de spam.",
    zukunftTitel: "À quoi ressemble ton avenir ?",
    zukunftUnterzeile: "Choisis le monde dans lequel tu veux voir ton futur toi.",
    tunnelWeiterAuswahl: "Choisir cet avenir",
    aufTitel3: "Voici la partie la plus importante.",
    aufHinweis3: "Regarde la caméra et dis-toi ce que tu veux changer dans les 30 prochains jours. Tu n'as pas besoin d'être parfait. Parle simplement avec sincérité.",
    aufBeispiel: "« Dans 30 jours, je vais … »",
    heuteLabel: "TOI AUJOURD’HUI",
    zukunftLabel: "TON MOI FUTUR",
    verbindenText: "Nous relions ton message à ta vision du futur. Ensuite commence ton programme personnel de 30 jours.",
    aufCta: "Enregistrer une vidéo",
    aufFertig: "C'est ma promesse",
    generateNow: "Démarrer le Future Self Program",
    ergebnisTitel: "C'est ta promesse à toi-même.",
    ergebnisText: "Maintenant commence la partie importante. Tu t'es fait une promesse. Tiens-la pendant 30 jours.",
    unterVideoZeilen: ["Vois ton avenir.", "Fais la promesse.", "Tiens la promesse."],
    filmTitel: "Une phrase devient une preuve",
    filmText: "Tu apparais devant la villa, la voiture derrière toi — et tu dis ta propre phrase, avec ta voix. Ce que tu promets, c'est toi qui le décides. Seul le monde autour de toi change.",
    mehrTitel: "Plus qu'une vidéo.",
    /* Leichter statt feierlicher — siehe de-Block (11.08.2026, Preissenkung). */
    mehrText: [
      "Ton Future Film est le début — et il se fait vite.",
      "Une demi-minute d'enregistrement : ton visage, ta voix, ta promesse à ton futur toi.",
      "Ton programme de 30 jours commence le jour même.",
      "Chaque jour une étape concrète.",
      "Chaque jour ta checklist.",
      "Chaque jour la même question : Ai-je fait aujourd'hui quelque chose pour mon avenir ?",
    ],
    wasBekommstTitel: "Ton Future Self Program",
    wasBekommstTitelListe: ["Ton Future Film", "Ta Promesse", "30 Jours", "Ta Checklist", "Ta Progression", "Les 90 Prochains Jours"],
    /* Konkret statt feierlich — siehe de-Block (11.08.2026, Preissenkung). */
    wasBekommstTextListe: [
      "Ton visage. Ta voix. Ta vie dans 5 ans — à partir d'une demi-minute d'enregistrement.",
      "Le message que tu enregistres aujourd'hui pour ton futur toi.",
      "30 jours, une étape par jour. Le jour 1, c'est aujourd'hui.",
      "Coche chaque soir ce que tu as vraiment fait. Une minute.",
      "Vois combien de jours tu as déjà tenu ta promesse.",
      "Après le jour 30, tu fixes ton prochain objectif.",
    ],
    /* Einladung statt Mahnung — siehe de-Block (11.08.2026). */
    emoTitel: "Une promesse compte à partir du jour où tu commences.",
    emoText: ["Tu n'as pas besoin de savoir aujourd'hui exactement comment tu vas tout accomplir.", "Tu dois seulement commencer aujourd'hui.", "Étape par étape.", "Jour après jour."],
    emoMarkensatz: ["I'm going to bandit this life.", "I promise."],
    howTitel: "Comment ça marche",
    howTitelListe: ["Filme-toi aujourd'hui", "Montre-nous où tu veux être dans 5 ans", "On crée ton Future Film", "Commence tes 30 jours"],
    /* Die Hürde steht in Schritt 1 — siehe de-Block (11.08.2026). */
    howTextListe: [
      "Une demi-minute avec ton téléphone, exactement comme tu es aujourd'hui.",
      "Choisis tes objectifs les plus importants.",
      "Avec ton visage, ta voix et ta vision.",
      "Dès aujourd'hui : ouvre ton lien privé chaque jour et tiens ta promesse.",
    ],
    finalTitel: ["Ton avenir ne commence pas dans 5 ans.", "Il commence avec ce que tu fais aujourd'hui."],
    finalIncludes: ["Future Film", "Programme de 30 jours", "Checklist quotidienne", "Suivi de progression", "Plan de 90 jours", "Page personnelle privée"],
    /* Preis als Satz — siehe de-Block (11.08.2026, {programm} = VERSPRECHEN_CENTS). */
    finalPreisZeile: "Le tout pour {programm} — un seul paiement, sans abonnement.",
    finalSub: "Bandit this life.",
    sprichDarueber: "Parle de ça :",
    garantieTitel: "Garantie Promesse de 30 Jours",
    garantieText: "Fais les 7 premiers jours. Si après ça tu sens que le Future Self Program n'est pas pour toi, dis-le-nous dans les 30 jours — et on te rembourse.",
    geldZurueckGarantie: "Garantie Promesse de 30 Jours",
    step2: "2 · Ton Future Film",
    ctaVideo: "Future Self Program — {programm}",
    buyOnce: "Future Self Program — {programm}",
    priceLine: "Future Self Program — {programm}",
    makeVideo: "Lance ton Future Self Program — {programm}",
    blockedOnce: "Lance ton Future Self Program — {programm}",
    watchOnce: "Mon Future Film — {programm}",
    makingKiss: "Ton Future Film est en cours de création. On transforme ta promesse en ta vision personnelle de l'avenir.",
    /* SCHRITT-TITEL des Zweischritt-Tunnels (Owner 12.08.2026): ohne eigenen Eintrag erbte die Kaskade „Your birthday video" aus GEBURTSTAG. */
    step3: "2 · Ton Future Film",
    mailQuestion: "Où devons-nous envoyer ton programme ?",
    mailNote: "C'est ici qu'on t'envoie ton Future Film et ton lien privé vers le programme.",
    programmKnopf: "Démarrer mon programme de 30 jours →",
    filmKommt: "Ton Future Film est en cours — il arrive par e-mail.",
    filmFertig: "Ton Future Film est prêt — il est dans ta galerie.",
    filmFehler: "Ton Future Film n'a pas abouti — on s'en occupe et on te l'envoie.",
  },
  pt: {
    heroA: "O teu Future Film e o teu ", heroY: "programa de 30 dias", heroB: ".",
    heroSub: ["Vê quem queres ser daqui a 5 anos.", "Faz uma promessa a ti mesmo.", "E trabalha 30 dias para a cumprir."],
    jetztStarten: "Investe no teu futuro",
    namenFrage: "A quem a envias? O nome vai no postal", namenPlatzhalter: "Max",
    tunnelStartTitel: "Faz uma promessa ao teu eu futuro.", tunnelName: "O teu nome",
    tunnelEmail: "O teu e-mail", tunnelWeiter: "Seguinte",
    tunnelIntro: "Grava hoje uma mensagem curta para ti. Transformamo-la no teu Future Film e no teu programa de 30 dias.",
    tunnelKleinText: "O teu e-mail guarda o teu projeto e o teu resultado final. Sem spam.",
    zukunftTitel: "Como é o teu futuro?",
    zukunftUnterzeile: "Escolhe o mundo onde queres ver o teu eu futuro.",
    tunnelWeiterAuswahl: "Escolher este futuro",
    aufTitel3: "Agora vem a parte mais importante.",
    aufHinweis3: "Olha para a câmara e diz a ti mesmo o que queres mudar nos próximos 30 dias. Não precisas de parecer perfeito. Fala apenas com sinceridade.",
    aufBeispiel: "“Daqui a 30 dias vou …”",
    heuteLabel: "TU HOJE",
    zukunftLabel: "O TEU EU FUTURO",
    verbindenText: "Ligamos a tua mensagem à tua visão do futuro. Depois começa o teu programa pessoal de 30 dias.",
    aufCta: "Gravar vídeo",
    aufFertig: "Esta é a minha promessa",
    generateNow: "Começar o Future Self Program",
    ergebnisTitel: "Esta é a tua promessa a ti mesmo.",
    ergebnisText: "Agora começa a parte importante. Fizeste uma promessa a ti mesmo. Cumpre-a durante 30 dias.",
    unterVideoZeilen: ["Vê o teu futuro.", "Faz a promessa.", "Cumpre a promessa."],
    filmTitel: "Uma frase torna-se uma prova",
    filmText: "Apareces à frente da vivenda, o carro atrás de ti — e dizes a tua própria frase, com a tua voz. O que prometes decides tu. Só o mundo à tua volta muda.",
    mehrTitel: "Mais do que um vídeo.",
    /* Leichter statt feierlicher — siehe de-Block (11.08.2026, Preissenkung). */
    mehrText: [
      "O teu Future Film é o início — e faz-se depressa.",
      "Meio minuto de gravação: o teu rosto, a tua voz, a tua promessa ao teu eu futuro.",
      "O teu programa de 30 dias começa no mesmo dia.",
      "Todos os dias um passo concreto.",
      "Todos os dias a tua checklist.",
      "Todos os dias a mesma pergunta: Fiz hoje algo pelo meu futuro?",
    ],
    wasBekommstTitel: "O teu Future Self Program",
    wasBekommstTitelListe: ["O teu Future Film", "A tua Promessa", "30 Dias", "A tua Checklist", "O teu Progresso", "Os Próximos 90 Dias"],
    /* Konkret statt feierlich — siehe de-Block (11.08.2026, Preissenkung). */
    wasBekommstTextListe: [
      "O teu rosto. A tua voz. A tua vida daqui a 5 anos — a partir de meio minuto de gravação.",
      "A mensagem que gravas hoje para o teu eu futuro.",
      "30 dias, um passo por dia. O dia 1 é hoje.",
      "Marca todas as noites o que fizeste mesmo. Um minuto.",
      "Vê quantos dias já cumpriste a tua promessa.",
      "Depois do dia 30, defines o teu próximo objetivo.",
    ],
    /* Einladung statt Mahnung — siehe de-Block (11.08.2026). */
    emoTitel: "Uma promessa conta a partir do dia em que começas.",
    emoText: ["Hoje não precisas de saber exatamente como vais alcançar tudo.", "Hoje só tens de começar.", "Passo a passo.", "Dia após dia."],
    emoMarkensatz: ["I'm going to bandit this life.", "I promise."],
    howTitel: "Como funciona",
    howTitelListe: ["Grava-te hoje", "Mostra-nos onde queres estar daqui a 5 anos", "Criamos o teu Future Film", "Começa os teus 30 dias"],
    /* Die Hürde steht in Schritt 1 — siehe de-Block (11.08.2026). */
    howTextListe: [
      "Meio minuto com o telemóvel, tal como és hoje.",
      "Escolhe os teus objetivos mais importantes.",
      "Com o teu rosto, a tua voz e a tua visão.",
      "A partir de hoje: abre o teu link privado todos os dias e cumpre a tua promessa.",
    ],
    finalTitel: ["O teu futuro não começa daqui a 5 anos.", "Começa com o que fazes hoje."],
    finalIncludes: ["Future Film", "Programa de 30 dias", "Checklist diária", "Acompanhamento de progresso", "Plano de 90 dias", "Página pessoal privada"],
    /* Preis als Satz — siehe de-Block (11.08.2026, {programm} = VERSPRECHEN_CENTS). */
    finalPreisZeile: "Tudo junto por {programm} — pagamento único, sem subscrição.",
    finalSub: "Bandit this life.",
    sprichDarueber: "Fala sobre:",
    garantieTitel: "Garantia da Promessa de 30 Dias",
    garantieText: "Faz os primeiros 7 dias. Se depois disso sentires que o Future Self Program não é para ti, avisa-nos dentro de 30 dias — e devolvemos o teu dinheiro.",
    geldZurueckGarantie: "Garantia da Promessa de 30 Dias",
    step2: "2 · O teu Future Film",
    ctaVideo: "Future Self Program — {programm}",
    buyOnce: "Future Self Program — {programm}",
    priceLine: "Future Self Program — {programm}",
    makeVideo: "Começa o teu Future Self Program — {programm}",
    blockedOnce: "Começa o teu Future Self Program — {programm}",
    watchOnce: "O meu Future Film — {programm}",
    makingKiss: "O teu Future Film está a ser criado. Estamos a transformar a tua promessa na tua visão pessoal do futuro.",
    /* SCHRITT-TITEL des Zweischritt-Tunnels (Owner 12.08.2026): ohne eigenen Eintrag erbte die Kaskade „Your birthday video" aus GEBURTSTAG. */
    step3: "2 · O teu Future Film",
    mailQuestion: "Para onde enviamos o teu programa?",
    mailNote: "É para aqui que enviamos o teu Future Film e o teu link privado do programa.",
    programmKnopf: "Começar o meu programa de 30 dias →",
    filmKommt: "O teu Future Film está a ser criado — chega por e-mail.",
    filmFertig: "O teu Future Film está pronto — está na tua galeria.",
    filmFehler: "O teu Future Film não correu bem — estamos a tratar disso e enviamos-to.",
  },
  it: {
    heroA: "Il tuo Future Film e il tuo ", heroY: "programma di 30 giorni", heroB: ".",
    heroSub: ["Guarda chi vuoi essere tra 5 anni.", "Fai una promessa a te stesso.", "E lavora 30 giorni per mantenerla."],
    jetztStarten: "Investi nel tuo futuro",
    namenFrage: "A chi lo mandi? Il nome va sulla cartolina", namenPlatzhalter: "Max",
    tunnelStartTitel: "Fai una promessa al tuo te futuro.", tunnelName: "Il tuo nome",
    tunnelEmail: "La tua email", tunnelWeiter: "Avanti",
    tunnelIntro: "Registra oggi un breve messaggio per te. Lo trasformiamo nel tuo Future Film e nel tuo programma di 30 giorni.",
    tunnelKleinText: "La tua email salva il tuo progetto e il tuo risultato finale. Niente spam.",
    zukunftTitel: "Com'è il tuo futuro?",
    zukunftUnterzeile: "Scegli il mondo in cui vuoi vedere il tuo te futuro.",
    tunnelWeiterAuswahl: "Scegli questo futuro",
    aufTitel3: "Ora arriva la parte più importante.",
    aufHinweis3: "Guarda nella fotocamera e dì a te stesso cosa vuoi cambiare nei prossimi 30 giorni. Non devi sembrare perfetto. Parla semplicemente con sincerità.",
    aufBeispiel: "“Tra 30 giorni voglio …”",
    heuteLabel: "TU OGGI",
    zukunftLabel: "IL TUO IO FUTURO",
    verbindenText: "Colleghiamo il tuo messaggio alla tua visione del futuro. Poi inizia il tuo programma personale di 30 giorni.",
    aufCta: "Registra un video",
    aufFertig: "Questa è la mia promessa",
    generateNow: "Avvia Future Self Program",
    ergebnisTitel: "Questa è la tua promessa a te stesso.",
    ergebnisText: "Ora inizia la parte importante. Ti sei fatto una promessa. Mantienila per 30 giorni.",
    unterVideoZeilen: ["Guarda il tuo futuro.", "Fai la promessa.", "Mantieni la promessa."],
    filmTitel: "Una frase diventa una prova",
    filmText: "Appari davanti alla villa, l'auto dietro di te — e dici la tua frase, con la tua voce. Cosa prometti lo decidi tu. Cambia solo il mondo intorno a te.",
    mehrTitel: "Più di un video.",
    /* Leichter statt feierlicher — siehe de-Block (11.08.2026, Preissenkung). */
    mehrText: [
      "Il tuo Future Film è l'inizio — e si fa in fretta.",
      "Mezzo minuto di registrazione: il tuo volto, la tua voce, la tua promessa al tuo te futuro.",
      "Il tuo programma di 30 giorni inizia lo stesso giorno.",
      "Ogni giorno un passo concreto.",
      "Ogni giorno la tua checklist.",
      "Ogni giorno la stessa domanda: Ho fatto oggi qualcosa per il mio futuro?",
    ],
    wasBekommstTitel: "Il tuo Future Self Program",
    wasBekommstTitelListe: ["Il tuo Future Film", "La tua Promessa", "30 Giorni", "La tua Checklist", "I tuoi Progressi", "I Prossimi 90 Giorni"],
    /* Konkret statt feierlich — siehe de-Block (11.08.2026, Preissenkung). */
    wasBekommstTextListe: [
      "Il tuo volto. La tua voce. La tua vita tra 5 anni — da mezzo minuto di registrazione.",
      "Il messaggio che registri oggi per il tuo te futuro.",
      "30 giorni, un passo al giorno. Il giorno 1 è oggi.",
      "Ogni sera spunti quello che hai davvero fatto. Un minuto.",
      "Guarda quanti giorni hai già mantenuto la tua promessa.",
      "Dopo il giorno 30, fissi il tuo prossimo obiettivo.",
    ],
    /* Einladung statt Mahnung — siehe de-Block (11.08.2026). */
    emoTitel: "Una promessa conta dal giorno in cui inizi.",
    emoText: ["Oggi non devi sapere esattamente come raggiungerai tutto.", "Oggi devi solo iniziare.", "Passo dopo passo.", "Giorno dopo giorno."],
    emoMarkensatz: ["I'm going to bandit this life.", "I promise."],
    howTitel: "Come funziona",
    howTitelListe: ["Registrati oggi", "Mostraci dove vuoi essere tra 5 anni", "Creiamo il tuo Future Film", "Inizia i tuoi 30 giorni"],
    /* Die Hürde steht in Schritt 1 — siehe de-Block (11.08.2026). */
    howTextListe: [
      "Mezzo minuto con il telefono, esattamente come sei oggi.",
      "Scegli i tuoi obiettivi più importanti.",
      "Con il tuo volto, la tua voce e la tua visione.",
      "Da oggi: apri il tuo link privato ogni giorno e mantieni la tua promessa.",
    ],
    finalTitel: ["Il tuo futuro non inizia tra 5 anni.", "Inizia con quello che fai oggi."],
    finalIncludes: ["Future Film", "Programma di 30 giorni", "Checklist giornaliera", "Monitoraggio dei progressi", "Piano di 90 giorni", "Pagina personale privata"],
    /* Preis als Satz — siehe de-Block (11.08.2026, {programm} = VERSPRECHEN_CENTS). */
    finalPreisZeile: "Tutto insieme per {programm} — pagamento unico, nessun abbonamento.",
    finalSub: "Bandit this life.",
    sprichDarueber: "Parla di questo:",
    garantieTitel: "Garanzia della Promessa di 30 Giorni",
    garantieText: "Fai i primi 7 giorni. Se dopo senti che il Future Self Program non fa per te, dillo entro 30 giorni — e ti rimborsiamo.",
    geldZurueckGarantie: "Garanzia della Promessa di 30 Giorni",
    step2: "2 · Il tuo Future Film",
    ctaVideo: "Future Self Program — {programm}",
    buyOnce: "Future Self Program — {programm}",
    priceLine: "Future Self Program — {programm}",
    makeVideo: "Inizia il tuo Future Self Program — {programm}",
    blockedOnce: "Inizia il tuo Future Self Program — {programm}",
    watchOnce: "Il mio Future Film — {programm}",
    makingKiss: "Il tuo Future Film è in creazione. Stiamo trasformando la tua promessa nella tua visione personale del futuro.",
    /* SCHRITT-TITEL des Zweischritt-Tunnels (Owner 12.08.2026): ohne eigenen Eintrag erbte die Kaskade „Your birthday video" aus GEBURTSTAG. */
    step3: "2 · Il tuo Future Film",
    mailQuestion: "Dove ti mandiamo il tuo programma?",
    mailNote: "Qui ti inviamo il tuo Future Film e il tuo link privato al programma.",
    programmKnopf: "Avvia il mio programma di 30 giorni →",
    filmKommt: "Il tuo Future Film si sta creando — arriva via e-mail.",
    filmFertig: "Il tuo Future Film è pronto — è nella tua galleria.",
    filmFehler: "Il tuo Future Film non è riuscito — ce ne occupiamo e te lo inviamo.",
  },
};

/**
 * DER LEBENSLAUF (Owner 19.08.2026: „AI gibt dir neue Chancen" — Foto + Lebenslauf hochladen,
 * KI wertet aus, generiert eine bildlastige Profilseite). Legt sich auf die Grundtabelle
 * (TABELLE), nicht auf HOCHZEIT — die Kuss-Upload-Texte sind neutraler als „Braut/Bräutigam".
 * NUR DE/EN gefüllt (Dauerregel: erst Deutsch, andere Sprachen folgen); andere Sprachen fallen
 * bis dahin auf die Kuss-Grundtexte der jeweiligen Sprache zurück — kein leerer Text, aber ein
 * Platzhalter, der nachgezogen werden muss, sobald das Portal mehr als Deutsch bedient.
 */
const LEBENSLAUF: Partial<Record<Lang, Partial<KissText>>> = {
  de: {
    /* „Luxury Video Bewerbung — für Top Jobs" (Owner 20.08.2026: „AI gibt dir neue Chancen
       als Titel ist blöd"). */
    /* Owner-Seitentext 24.08.2026: „Dein Lebenslauf. Als Video, das du selbst sprichst." */
    heroA: "Für jede Stelle die ", heroY: "perfekte Bewerbung", heroB: ".",
    upTitle: "Dein Foto", upHint: "Ein aktuelles Foto von dir.",
    you: "LEBENSLAUF", uploadYou: "Lebenslauf hochladen", youHint: "Als PDF — die KI liest ihn aus.",
    tunnelStartTitel: "Leg los",
    generateNow: "Profil erstellen",
    consentKurz: "🔒 Privat · nur für dich sichtbar, bis du es teilst · mit dem Erzeugen bestätigst du die {agb}",
  },
  en: {
    heroA: "The ", heroY: "perfect application", heroB: " for every job.",
    upTitle: "Your photo", upHint: "A recent photo of you.",
    you: "RESUME", uploadYou: "Upload your resume", youHint: "As PDF — the AI reads it.",
    tunnelStartTitel: "Let's get started",
    generateNow: "Create profile",
    consentKurz: "🔒 Private · visible only to you until you share it · generating confirms the {agb}",
  },
  /* ALLE SIEBEN SPRACHEN (24.08.2026, live gefunden: die rumänische Landingpage zeigte
     „Trimite un sărut persoanei pe care o iubești 💋" ALS BEWERBUNGS-TITEL — ohne Eintrag
     fällt kissText aufs Kuss-Grundthema zurück. Owner: „was ist das für ein Text?").
     Memory `seven-languages-no-polish`: nie nur de/en anlegen. */
  ro: {
    heroA: "Pentru fiecare job, ", heroY: "aplicația perfectă", heroB: ".",
    upTitle: "Poza ta", upHint: "O poză recentă cu tine.",
    you: "CV", uploadYou: "Încarcă CV-ul", youHint: "Ca PDF — AI-ul îl citește.",
    tunnelStartTitel: "Să începem",
    generateNow: "Creează profilul",
    consentKurz: "🔒 Privat · vizibil doar pentru tine până îl distribui · prin generare confirmi {agb}",
  },
  es: {
    heroA: "Para cada puesto, la ", heroY: "candidatura perfecta", heroB: ".",
    upTitle: "Tu foto", upHint: "Una foto reciente tuya.",
    you: "CURRÍCULUM", uploadYou: "Sube tu currículum", youHint: "En PDF — la IA lo lee.",
    tunnelStartTitel: "Empecemos",
    generateNow: "Crear perfil",
    consentKurz: "🔒 Privado · visible solo para ti hasta que lo compartas · al generar confirmas los {agb}",
  },
  fr: {
    heroA: "Pour chaque poste, la ", heroY: "candidature parfaite", heroB: ".",
    upTitle: "Ta photo", upHint: "Une photo récente de toi.",
    you: "CV", uploadYou: "Ajoute ton CV", youHint: "En PDF — l'IA le lit.",
    tunnelStartTitel: "On commence",
    generateNow: "Créer le profil",
    consentKurz: "🔒 Privé · visible par toi seul jusqu'au partage · en générant tu confirmes les {agb}",
  },
  pt: {
    heroA: "Para cada vaga, a ", heroY: "candidatura perfeita", heroB: ".",
    upTitle: "A tua foto", upHint: "Uma foto recente tua.",
    you: "CV", uploadYou: "Carrega o teu CV", youHint: "Em PDF — a IA lê-o.",
    tunnelStartTitel: "Vamos começar",
    generateNow: "Criar perfil",
    consentKurz: "🔒 Privado · visível só para ti até partilhares · ao gerar confirmas os {agb}",
  },
  it: {
    heroA: "Per ogni posto, la ", heroY: "candidatura perfetta", heroB: ".",
    upTitle: "La tua foto", upHint: "Una foto recente di te.",
    you: "CV", uploadYou: "Carica il tuo CV", youHint: "In PDF — l'IA lo legge.",
    tunnelStartTitel: "Iniziamo",
    generateNow: "Crea il profilo",
    consentKurz: "🔒 Privato · visibile solo a te finché non lo condividi · generando confermi i {agb}",
  },
};

export function kissText(lang: string | undefined, variant: "kiss" | "idol" | "wedding" | "poledance" | "birthday" | "versprechen" | "holiday" | "gutschein" | "lebenslauf" = "kiss"): KissText {
  const l = (lang && lang in TABELLE ? lang : "en") as Lang;
  /* Der Urlaub legt sich auf die HOCHZEIT, nicht auf die Grundtabelle: Er ist dieselbe
     Einladungs-Maschine und braucht deren Schlüssel (Datum, Ort, Zusage, Probewoche).
     Nur die Anrede und der Anlass sind andere — und genau die stehen in URLAUB. */
  const roh: KissText = variant === "idol" ? { ...TABELLE[l], ...IDOL[l] }
    : variant === "wedding" ? { ...TABELLE[l], ...HOCHZEIT[l] }
    : variant === "holiday" ? { ...TABELLE[l], ...HOCHZEIT[l], ...URLAUB[l] }
    /* Der Gutschein legt sich auf die HOCHZEIT wie der Urlaub: Er braucht deren Schlüssel
       (Karte, Botschaft, Versand, Probezeit) und tauscht nur die Anrede und den zweiten
       Platz aus — dort steht statt eines Menschen sein Gutschein. */
    : variant === "gutschein" ? { ...TABELLE[l], ...HOCHZEIT[l], ...GUTSCHEIN[l] }
    : variant === "poledance" ? { ...TABELLE[l], ...POLEDANCE[l] }
    : variant === "birthday" ? { ...TABELLE[l], ...GEBURTSTAG[l] }
    /* DAS VERSPRECHEN LEGT SICH AUF DEN GEBURTSTAG (Owner 10.08.2026: „Es hat den sleben
       Tunel und aufbau"): Es erbt jeden Trichter-Satz — Aufnahme, Look, Kasse, Lieferung —
       und tauscht nur aus, was WIRKLICH anders ist. Ein eigener Satz von siebzig Zeilen in
       sieben Sprachen wäre nach der ersten Korrektur am Geburtstag veraltet. */
    : variant === "versprechen" ? { ...TABELLE[l], ...GEBURTSTAG[l], ...VERSPRECHEN[l] }
    : variant === "lebenslauf" ? { ...TABELLE[l], ...LEBENSLAUF[l] }
    : TABELLE[l];
  const out = {} as Record<string, unknown>;
  for (const [k, v] of Object.entries(roh)) {
    if (typeof v === "string") out[k] = fillPrices(v, l);
    else if (Array.isArray(v)) out[k] = v.map(x => (typeof x === "string" ? fillPrices(x, l) : x));
    else out[k] = v;
  }
  return out as KissText;
}
