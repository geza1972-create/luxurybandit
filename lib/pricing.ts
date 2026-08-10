/**
 * PREISE AN EINER STELLE (Owner-Entscheidung 27.07.2026, Preis halbiert am 29.07.2026).
 *
 * Themen-Abo: Listenpreis **49 €/Monat** — aber JEDER Kunde bekommt automatisch den
 * Gutschein FOREVER50 (50 %, `duration: forever`). Er zahlt damit **dauerhaft {price}/Monat**,
 * nicht nur im ersten Monat. Owner 29.07.2026: „überall den Gutschein im Preis rein machen
 * für 50 %. Der Kunde zahlt dauerhaft 50 % weniger."
 *
 * Damit ist der frühere Einstieg „19 € im ersten Monat, danach 49 €" abgelöst: Stripe
 * erlaubt nur EINEN Gutschein pro Abo, und der dauerhafte 50-%-Rabatt schlägt den einmaligen.
 *
 * Umsetzung in Stripe (macht der Owner, Claude hat keinen Zugang):
 *   1. Preis 49 €/Monat, Steuer INKLUSIVE (Owner 27.07.2026: Verbraucher sehen den
 *      Endpreis) → `price_1TxvSi1jPNCWoiztEHBpgDhj`, überschreibbar per
 *      `STRIPE_TOPIC_ABO_PRICE_ID`
 *   2. Gutschein FOREVER50 = `sRHDMAQE` (percent_off 50, duration forever) — wird bei
 *      JEDEM Kassenvorgang automatisch gesetzt, ohne dass der Kunde etwas eintippen muss.
 * Ein Aktionscode aus einer Anzeige (z. B. ADMIN100) sticht den Standardgutschein weiterhin;
 * ein unbekannter Code bricht den Kauf NICHT ab.
 */

export const TOPIC_MONTHLY_CENTS = 4900;            // 49 € Listenpreis (durchgestrichen)
export const TOPIC_EFFECTIVE_MONTHLY_CENTS = 2450;  // 24,50 € — was er wirklich zahlt, dauerhaft
/**
 * MEHR VIDEOS, GUENSTIGER (Owner 31.07.2026: „ich glaube wir müssen die Videopreise auf 2,99
 * senken und im Abo 10 Videos" — kurz darauf korrigiert: „nicht 10, sondern 12").
 *
 * Was sich damit rechnerisch aendert — das Abo bleibt bei {price}:
 *
 *   vorher   5 Videos für 24,50 €  =  4,90 € je Video, jedes weitere 3,99 €
 *   jetzt   12 Videos für 24,50 €  =  2,04 € je Video, jedes weitere 2,99 €
 *
 * Das Verhaeltnis stimmt weiter: Ein Video ueber das Abo hinaus kostet mehr (2,99) als eines
 * im Abo (2,04). Waere es umgekehrt, waere das Abo eine Strafe fuer treue Kunden.
 *
 * 12 ist ausserdem die bessere Zahl als 10, ohne dass es geplant war: Es ist die einzige, bei
 * der „eines fuer jeden Monat" mitschwingt — und es liest sich als grosszuegig, nicht als
 * gerundet.
 *
 * Der Einmalkauf bleibt bei {once} fuer EIN Video. Das ist Absicht und kein Widerspruch: Er
 * ist der teure Weg fuer den, der kein Abo will — und der Abstand zum Abo ist jetzt so gross,
 * dass die Rechnung sich von selbst erklaert.
 *
 * WAS DAS KOSTET: Zwoelf Videos im Monat sind bei uns zwoelf Pixverse-Laeufe (8 s, 540p). Was
 * der Lauf wirklich kostet, steht in KEINEM Kommentar dieses Projekts — das laesst sich nur
 * an der Pixverse-Abrechnung ablesen. Bei einem Euro je Video (die Hausnummer aus
 * try-this-look-store.ts) waeren zwoelf Videos 12 € von 24,50 €, und dann traegt das Abo sich
 * nicht mehr. Das gehoert gegen die echte Rechnung geprueft, nicht geschaetzt.
 */
/**
 * JEDES WEITERE VIDEO: 3,99 € (Owner 05.08.2026: „er kann weitere Videos generieren für 3,99
 * eventuell, aber muss sein Konto aufladen. So machen es die anderen").
 *
 * Der Anlass war die Erstattungsfrage, und die Antwort ist besser als Geld zurück: Wer mit
 * seinem Video nicht zufrieden ist, macht ein neues — für einen Bruchteil des Kaufpreises,
 * aus dem Guthaben, ohne dass jemand etwas prüfen oder freigeben muss.
 *
 * WARUM DAS RECHNERISCH TRÄGT: Das erste Video kostet {once} und bezahlt das ganze Produkt —
 * die Bildversuche, die Karte, die Seite, den Versand. Jedes weitere ist nur noch EIN
 * Pixverse-Lauf (rund ein Euro). 3,99 € lassen also Luft und sind trotzdem so klein, dass ein
 * zweiter Versuch keine Entscheidung ist.
 *
 * Owner am selben Tag, zur Grosszügigkeit: „ich habe so viele Videos umsonst generiert bei
 * Pixverse, wer gibt mir das Geld zurück? Niemand." Der Satz gehört hierher, weil er die
 * Grenze markiert — wir schenken keine Läufe, wir machen den nächsten billig.
 */
export const EXTRA_VIDEO_CENTS = 399;               // 3,99 € — jedes weitere Video

/**
 * JEDES WEITERE BILD: 1,49 € (Owner 05.08.2026: „Bilder 1,49 und Videos für 3,99").
 *
 * Damit steht die Nachkauf-Leiter vollständig, und sie folgt den echten Kosten statt einem
 * Gefühl: Ein Bild ist ein gpt-image-1-Lauf für ein paar Cent, ein Video ein Pixverse-Lauf für
 * rund einen Euro. 1,49 € und 3,99 € halten denselben Abstand wie die Erzeugung selbst.
 *
 * WO ES GREIFT: nach dem Kauf. Die drei Bilder, die zum Geschenk gehören, bleiben inbegriffen
 * (siehe den Deckel in `claimFreePreview`) — wer darüber hinaus will, kauft nach, aus dem
 * Guthaben, ohne Kasse und ohne Rückfrage. Das ist zugleich die Antwort auf „ich bin nicht
 * zufrieden": ein neuer Versuch für 1,49 € statt einer Erstattung über {once}.
 */
export const EXTRA_BILD_CENTS = 149;                // 1,49 € — jedes weitere Bild
// 20 statt 12 (Owner 01.08.2026: „im Abo sind es dann 20 Videos" — Teil des Preistests,
// zusammen mit dem Einzelvideo für 1,49). ACHTUNG: Die GUTSCHRIFT je Monat steht in
// try-this-look-store (SUBSCRIPTION_MONTHLY_CREDITS) und ist am selben Tag mitgezogen —
// vorher STAND SIE AUF 5, während hier 12 beworben wurde: Werbung und Ware widersprachen sich.
export const INCLUDED_VIDEOS_PER_MONTH = 20;        // im Abo enthaltene Videos, über ALLE Themen
// EINMALZAHLUNG (Owner 30.07.2026: „wir müssen einmalige zahlungen machen nicht nur abos …
// 9,99 euro … beim Küssen"). Nicht jeder will ein Abo; wer einmal etwas kauft, kommt oft
// später von selbst zum Abo. Der frühere Einzelkauf lag bei 3,99 € und wurde im Juli vom Abo
// abgelöst — jetzt kommt er zurück, teurer und als eigenständiges Produkt.
/**
 * DER EINMALKAUF FAELLT AUF DEN VIDEOPREIS (Owner 31.07.2026: „2,99 statt 9,99").
 *
 * Damit kostet JEDES einzelne Video 2,99 € — mit Abo wie ohne. Das ist einfacher zu erklaeren
 * als zwei verschiedene Einzelpreise, und der Abstand zum Abo traegt die Entscheidung allein:
 * zwoelf Videos einzeln waeren 35,88 €, im Abo sind es 24,50 € plus alles andere.
 *
 * ZWEI DINGE, DIE BEI 2,99 ANDERS SIND ALS BEI 9,99:
 *
 * 1. Stripes feste Gebuehr faellt ins Gewicht. Rund 0,25 € je Vorgang plus Prozente sind bei
 *    9,99 € etwa 3 %, bei 2,99 € rund 9 %. Von jedem Einmalkauf bleiben also spuerbar weniger
 *    als drei Euro.
 * 2. Was ein Video bei Pixverse wirklich kostet, steht in keinem Kommentar dieses Projekts.
 *    Bei einem Euro je Video (die Hausnummer aus try-this-look-store.ts) bliebe nach Gebuehr
 *    und Erzeugung rund 1,70 € — das traegt. Laege der Lauf bei zwei Euro, waere der
 *    Einmalkauf ein Verlustgeschaeft. Das gehoert an der Pixverse-Abrechnung geprueft.
 */
/**
 * 14,99 € — DER PREIS JEDES GESCHENKS (Owner 04.08.2026: „wir machen die Preise ab 14,99 €";
 * Kennung geliefert am 05.08.2026: „hier ist der Preis für 14,99 für alle, die 14,99 kosten").
 *
 * Der Weg dahin steht in KONZEPT-GESCHENKE-UND-IDEEN.md §8.1 und ist die Umkehr eines
 * Irrtums: 1,49 € trug nicht einmal die Erzeugung. Die Stripe-Gebuehr allein frisst rund
 * 0,30 €; ein Pixverse-Video kostet grob einen Euro (die Hausnummer aus
 * try-this-look-store.ts) — es blieben also etwa 0,19 €.
 *
 * DAS BILD IST DABEI NICHT DER TEURE TEIL, und diese Verwechslung steht auch im Konzept
 * (KONZEPT-GESCHENKE-UND-IDEEN.md §3b: „~1 € Erzeugung" fuer ein Bild): Das Gratis-Bild laeuft
 * ueber gpt-image-1 in der Stufe `low` und kostet ein paar CENT, nicht einen Euro — beim Kuss
 * wegen des doppelten Laufs (Kuss + Fast-Kuss) grob 3 bis 6. Die Route sagt es selbst: „Ein
 * Video kostet rund das Zwanzigfache und bleibt deshalb hinter der Kasse."
 *
 * Das ist keine Kleinigkeit, denn auf der falschen Zahl steht eine Entscheidung: Ein
 * Gratis-Bild, das einen Euro kostet, kann man sich nur an einer Stelle leisten — eines fuer
 * vier Cent ueberall. Zweimal wurde nach unten getestet — 9,99 → 2,99 → 1,49 —, nie nach
 * oben, und verkauft hat keiner der drei Preise nennenswert. Billiger war also nie die
 * Antwort.
 *
 * WAS DIESEN PREIS TRÄGT, und ohne das ist er nicht zu halten: das **Gratis-Bild mit
 * Wasserzeichen**. Bei 1,49 € kauft jemand auf Verdacht, bei 14,99 € niemand — er muss sein
 * Ergebnis gesehen haben, bevor er zahlt. Deshalb hängen Punkt 1 (Wasserzeichen), Punkt 2
 * (der Handel am Eingang) und diese Zahl zusammen und gehen NUR ZUSAMMEN live.
 *
 * GILT FÜR: Kuss, Urlaub, Tanz, Gutschein — jedes Geschenk, einmal bezahlt. Der GEBURTSTAG
 * hat seit dem 07.08.2026 seinen eigenen Startpreis (GEBURTSTAG_CENTS, 4,99 €).
 * NICHT für den Hochzeitsplaner (29 € Kauf, siehe HOCHZEIT_START_CENTS) und nicht für das
 * System (60 €, siehe PLAN_CENTS).
 */
export const ONCE_CENTS = 1500;                     // 15 € — ein Geschenk, einmal bezahlt

/**
 * DIE GUTSCHEIN-KARTE KOSTET WENIGER (Owner 05.08.2026: „15 € ist zu viel für den Gutschein.
 * Es muss 9,99 sein").
 *
 * Und das ist keine Willkür, sondern rechnet sich: Bei Kuss, Hochzeit und Urlaub bezahlen die
 * 15 € eine ERZEUGUNG mit zwei Menschen in einer Szene — mehrere Läufe, zwei Vorlagen, Kulisse.
 * Die Gutschein-Karte ist fünf Sekunden mit EINEM Foto, und wer gar keins hochlädt, bekommt
 * unser fertiges Video: dann kostet sie uns nichts ausser der Seite.
 *
 * Der zweite Grund ist der Käufer. Er hat schon bezahlt — für den Gutschein, den er verpackt.
 * Die Verpackung darf nicht so viel kosten wie ein Geschenk; sonst rechnet er nach und
 * verschickt die nackte E-Mail, gegen die wir antreten.
 */
export const GUTSCHEIN_CENTS = 999;                 // 9,99 € — die Verpackung, nicht das Geschenk
// Owner 02.08.2026: „ich dachte ich lasse es nach 7 tagen mit abo laufen nicht nächsten
// monat" — dreht die 30-Tage-Entscheidung vom 01.08. zurück auf 7 Tage. Eine Zahl hier,
// damit Seite, Preiszeile (Ä5) und die tatsächliche Probefrist (Ä8) nie auseinanderlaufen.
export const TRIAL_DAYS = 7;                        // Tage, die die Seite ohne Abo online bleibt
// Die Aufladung (Owner 01.08.2026, Variante B: Zusatzangebot neben dem Einzelkauf; Guthaben
// verfällt nie, keine Barauszahlung). Eine Stufe reicht zum Start.
/**
 * KLEINER EINSTIEG STATT 9,99 (Owner 03.08.2026: „ok, dann mach eine kleinere Aufladung").
 *
 * Der Anlass sind Daten, keine Meinung: In der Nacht zum 03.08. haben DREI echte Besucher
 * beide Fotos hochgeladen, auf „Video erzeugen" getippt, die 9,99-€-Kasse geoeffnet — und
 * alle drei dort abgebrochen. Beworben ist das Video mit {once}; eine Kasse, die dann das
 * Siebenfache verlangt, liest sich als Falle. 4,99 € sind drei Videos (oder ein
 * Lingerie-Video mit Rest) — klein genug zum Anfangen, gross genug, dass ein Rest bleibt,
 * der zum Wiederkommen einlaedt.
 */
/**
 * DIE KLEINSTE AUFLADUNG IST EIN GESCHENK (Owner 05.08.2026: „aufladen muss mann dann mit
 * 14,99€ mindestens").
 *
 * Das ist keine Preiserhöhung, sondern das Ende einer Lücke. 4,99 € stammten aus der Zeit des
 * 1,49-€-Videos: Man lud drei Videos auf einmal auf, und der Rest blieb liegen. Bei 14,99 € je
 * Geschenk kauft eine 4,99-€-Aufladung GAR NICHTS — der Kunde hätte bezahlt und stünde vor
 * demselben Knopf wie vorher. Das ist der schlimmste aller Fälle.
 *
 * WAS DAMIT VERSCHWINDET, und das ist der eigentliche Gewinn: der Satz, der die Differenz
 * erklären musste (Owner 03.08.2026: „hier muss doch stehen dass das Video 1,49 kostet aber er
 * muss das Konto mit mindestens 9,99 aufladen. Sonst fühlt er sich ausgeraubt"). Aufladung und
 * Preis sind ab jetzt dieselbe Zahl — es gibt nichts mehr zu erklären, und nichts, worüber
 * sich jemand getäuscht fühlen könnte.
 */
export const TOPUP_CENTS = 1500;                    // 15 € — genau ein Geschenk
// „biete beide an" (Owner 03.08.2026, direkt nach der Verkleinerung): Die 9,99 bleiben als
// zweite Stufe daneben — wer mehr laedt, hat laenger Ruhe. Die Kasse akzeptiert NUR diese
// beiden Werte (Whitelist in kiss-video-checkout), egal was ein Browser schickt.
/** 29,00 € — die Stufe, die den Hochzeitsplaner deckt. Die ganze Leiter steht am Dateiende. */
export const TOPUP_GROSS_CENTS = 3000;
/**
 * DER TANZ KOSTET MEHR (Owner 03.08.2026, zum Poledance-Video: erst „der gleiche Preis",
 * kurz darauf korrigiert — „eigentlich nicht, es soll 3,99 kosten").
 *
 * Es ist derselbe Betrag, den vorher das Lingerie-Video trug. Damals bezahlte er einen
 * ZWEITEN Erzeugungslauf (FASHN zog um, dann filmte Pixverse); hier laeuft nur einer, weil
 * Pixverse Fusion beides in einem Zug macht. Der Aufpreis ist diesmal also Marge, nicht
 * Kosten — eine Preisentscheidung des Owners, keine Rechnung.
 *
 * WICHTIG: Diese Zahl gilt an ZWEI Stellen, und sie muessen zusammenbleiben — auf dem Knopf
 * im Trichter UND in der Kasse (`app/api/kiss-video-checkout`). Dort wird der Preis am
 * gespeicherten Auftrag entschieden, nicht an dem, was der Browser behauptet: Ein Preisschild,
 * das ueber dem liegt, was die Kasse nimmt (oder darunter), ist der eine Fehler, den man nicht
 * wegerklaeren kann.
 */
// 14,99 statt 3,99 (Owner 05.08.2026: eine Kennung „für alle, die 14,99 kosten"). Der Tanz und
// der Geburtstag sind Geschenke wie der Kuss, und Geschenke kosten ab jetzt alle dasselbe. Die
// eigene Konstante bleibt trotzdem stehen: Wer dem Tanz je einen anderen Preis geben will,
// ändert dann EINE Zahl — und nicht aus Versehen den Preis jedes anderen Geschenks mit.
/**
 * DER PREIS EINES GESCHENK-VIDEOS — 4,99 € (Owner 10.08.2026: „wir haben ab jetzt für 4,99:
 * Geburtstag, Kuss, Tanz, Urlaub. Hochzeit auch aber nur Video.").
 *
 * EINE Zahl für alle vier Geschenke, nicht vier gleiche Zahlen nebeneinander: Genau daran ist
 * es hier schon zweimal auseinandergelaufen (Geburtstag 4,99 auf dem Schild, 15 € an der
 * Kasse — die Stripe-Leiche vom 07.08.; Hochzeit „ab 24 €" auf der Kachel, 1,49 € abgebucht).
 * Wer den Geschenkpreis ändert, ändert ihn ab jetzt HIER, und Schild, Knopf, Abbuchung und
 * Erstattung ziehen zusammen mit.
 *
 * `ONCE_CENTS` (15 €) bleibt daneben stehen und ist NICHT mehr der Preis eines Geschenks: Es
 * hält die Aufladeleiter und die Gutschein-Stufen zusammen, siehe dort.
 *
 * 9,99 € SEIT DEM ABEND DES 10.08.2026 (Owner: „ich sehe wir sind zu günstig, wir machen 9,99
 * statt 4,99 bei allen") — am selben Tag von 15 € auf 4,99 € gesenkt und dann auf 9,99 €
 * korrigiert. Beide Male EINE Zeile, weil alles daran hängt: Preisschild, Kaufknopf,
 * Guthaben-Prüfung, Abbuchung, Erstattung und die unterste Gutschein-Stufe. Genau dafür gibt
 * es diese Konstante; vorher lagen dieselben Zahlen an sechs Stellen.
 */
export const GESCHENK_VIDEO_CENTS = 999;            // 9,99 € — Geburtstag · Kuss · Tanz · Urlaub · Versprechen

export const POLEDANCE_CENTS = GESCHENK_VIDEO_CENTS;   // der Tanz kostet wie jedes Geschenk

/**
 * DER GEBURTSTAG STARTET BEI 4,99 (Owner 07.08.2026: „wir nehemen für dieses Video 4,99 als
 * start" — direkt nach der Abnahme der neuen Vorlage, „alles passt perfekt").
 *
 * Das bricht bewusst die 15-€-Einheitsregel vom 05.08. — NUR für den Geburtstag, als
 * Startpreis für den Markttest. Die Rechnung trägt: Die neue Kette (OpenAI-Avatar medium
 * ~6 ct + HeyGen v3 ~20 ct, gemessen am 07.08.) kostet ~26 Cent je Video, und ein
 * Impulskauf unter 5 € braucht keinen Beweis vorab. Eigene Konstante nach dem Hausmuster:
 * Wer den Startpreis später anhebt, ändert EINE Zahl — und nicht aus Versehen den Preis
 * jedes anderen Geschenks mit.
 */
export const GEBURTSTAG_CENTS = GESCHENK_VIDEO_CENTS;  // 4,99 € — seit 07.08.2026, jetzt der Hauspreis

/**
 * WAS EIN GESCHENK-TRICHTER KOSTET — EINE ZEILE FÜR TRICHTER UND KASSE.
 *
 * GEMESSEN am 07.08.2026, nicht vermutet: Der Trichter verlangte für den Geburtstag 4,99 €
 * Guthaben (`videoPreisCents`), die Kasse buchte 15 € ab (`ONCE_CENTS`) — sie kannte den
 * Geburtstag schlicht nicht. Der Kunde mit 8,01 € auf dem Konto kam damit NIE durch: Die
 * Abbuchung scheiterte an 15 €, und die Stripe-Sitzung, die dahinter entstand, lautete auf
 * 15,00 € für ein Video zu 4,99 €. Genau die Leiche liegt vom 07.08. um 14:26:27 in der
 * Stripe-Liste.
 *
 * Zwei Stellen mit demselben Wissen über denselben Preis — dieselbe Falle wie bei der
 * Hochzeit („ab 24 €" auf der Kachel, 1,49 € an der Kasse). Deshalb steht die Zuordnung ab
 * jetzt HIER, und beide Seiten lesen sie.
 *
 * Der Schlüssel ist die `GeschenkId` aus lib/geschenke (kiss | idol | wedding | poledance |
 * birthday) — also das, was beim ANLEGEN des Auftrags gespeichert wurde. Nicht zu verwechseln
 * mit `ThemenSchluessel` weiter unten, der für den Tanz „surprise" heisst; der beschildert die
 * Katalog-Kachel, dieser hier bucht Geld ab.
 *
 * Ein unbekannter Schlüssel fällt auf ONCE_CENTS zurück — den Regelpreis eines Geschenks.
 */
export function geschenkPreisCents(geschenk: string): number {
  switch (String(geschenk ?? "")) {
    /* Die Hochzeit ist KEIN reines Video: Die 29 € kaufen den Planer mit Einladungsseite,
       Zusagenliste und Gruppenchat (Verlängerung 14,99 €/Monat). Sie bleibt deshalb hier
       stehen, während Kuss, Tanz, Geburtstag und Urlaub auf den Geschenkpreis fallen. */
    case "wedding": return HOCHZEIT_START_CENTS;
    default: return GESCHENK_VIDEO_CENTS;   // Kuss, Idol, Tanz, Geburtstag — ein Geschenk-Video
  }
}

/**
 * DAS VIDEO ZUR FERTIGEN EINLADUNG (Owner 04.08.2026: „er bekommt ein Bild für 1,49; wenn
 * er das Video generieren möchte, dann kann er das nachträglich für 3,99").
 *
 * EIGENE ZAHL, obwohl sie heute gleich POLEDANCE_CENTS ist. Beides auf dieselbe Konstante
 * zu legen hiesse: Wer den Preis des Tanz-Videos ändert, ändert stillschweigend den
 * Aufpreis jeder Einladung mit. Genau solche versteckten Kopplungen haben die Hochzeit
 * 24 € kosten lassen, während die Kasse 1,49 € nahm.
 */
/**
 * SEIT 05.08.2026 DERSELBE PREIS WIE DAS GESCHENK — und das ist kein Aufschlag, sondern eine
 * Umkehr: Das BILD ist ab jetzt gratis (mit Wasserzeichen), bezahlt wird das VIDEO. „Bild
 * 1,49 € · Video 3,99 €" hatte den Kunden vor eine Wahl gestellt, bevor er irgendetwas
 * gesehen hatte; jetzt sieht er erst sein Bild und entscheidet dann über das Video.
 *
 * Die eigene Konstante bleibt aus demselben Grund stehen wie POLEDANCE_CENTS: damit ein
 * späterer eigener Preis fürs Aufwerten EINE Zahl ist und nicht der stille Zwilling von
 * ONCE_CENTS.
 */
export const VIDEO_UPGRADE_CENTS = 1500;            // 15 € — aus der Einladung ein Video machen

/**
 * DAS LUXURYBANDIT SYSTEM (Owner 04.08.2026: erst „Den Plan verkaufen wir für 9,99 €", eine
 * Stunde später korrigiert — „wir machen das aber für 59 €, weil sonst das nach nichts
 * anhört").
 *
 * ER HAT RECHT, UND ES IST KEINE GESCHMACKSFRAGE: Der Preis ist beim Verkauf eines „Systems"
 * Teil des Produkts. Ein System für 9,99 € klingt nach Spielerei; für 59 € klingt es nach
 * einer Sache, für die jemand gearbeitet hat. Wer hier billiger wird, zerstört, was er
 * verkauft (dieselbe Regel, die im Bericht unter „Status" steht).
 *
 * WAS DARAN HÄNGT — die Kasse ist eine andere:
 *   - 59 € kommen NICHT aus den Auflade-Stufen (4,99 / 9,99). Der Normalweg ist der direkte
 *     Kauf über Stripe (`{ kaufen: true }` in app/api/plan-checkout). Guthaben wird weiterhin
 *     zuerst geprüft — es deckt den Betrag nur, wenn jemand viel aufgeladen hat.
 *   - Der Beweis VOR der Kasse wiegt jetzt schwerer. Bei 9,99 € kauft man auf Verdacht; bei
 *     59 € niemand. Das Gratis-Bild und das, was er vom Lauf schon gesehen hat, entscheiden.
 *
 * PRO ANALYSE, KEIN ABO (siehe Skill `business-analyse`): Jeder Lauf ist geschlossen und
 * bezahlt. Wer morgen die nächste Idee prüfen will, zahlt morgen wieder.
 */
/**
 * DIE OBERSTE SPROSSE DER AUFLADELEITER — 60 €.
 *
 * Das war der Preis des „LuxuryBandit System" (eine Analyse). Das Thema ist am 10.08.2026
 * gelöscht (Owner: „Wir verkaufen keine Systeme"), die Zahl bleibt: Sie ist die grösste
 * Aufladung, und `{plan}` steckt noch in alten, übersetzten Sätzen im Zwischenspeicher.
 * Wer sie entfernt, verkürzt die Leiter — dafür gibt es keinen Grund.
 */
export const PLAN_CENTS = 6000;                     // 60 € — grösste Aufladung

/**
 * DIE 59-€-KENNUNG DES SYSTEMS IST AUS DEMSELBEN GRUND WEG (05.08.2026): Sie steht auf 5900,
 * PLAN_CENTS auf 6000. `app/api/plan-checkout` nimmt den Betrag jetzt direkt aus dieser Datei.
 */

/**
 * HIER STAND DIE GEMEINSAME 14,99-KENNUNG — und sie ist weg, seit die Preise rund sind
 * (Owner 05.08.2026: „5,10,15,30,60").
 *
 * `price_1U0LLs…` steht auf 1499, ONCE_CENTS auf 1500. Eine Kennung, die der Tabelle
 * hinterherhinkt, bucht einen anderen Betrag ab, als auf dem Knopf steht. Deshalb laufen ALLE
 * EINMALKÄUFE jetzt über `price_data` mit dem Betrag aus dieser Datei: Preisschild und Kasse
 * sind damit dieselbe Zahl und können nicht mehr auseinanderlaufen.
 *
 * KENNUNGEN BLEIBEN NUR DORT PFLICHT, WO STRIPE SIE VERLANGT — bei den Abos, siehe
 * `hochzeitAboPriceId()` und `chatAboPriceId()` weiter unten.
 */
// DAS LINGERIE-VIDEO IST RAUS (Owner 03.08.2026: „das mit der Lingerie ist eh nicht allzu
// seriös" — „wir machen das raus"). Hier stand LINGERIE_CENTS = 399: der zweite Videopreis,
// der einen FASHN-Lauf vor dem Pixverse-Lauf bezahlte. Mit dem Produkt fallen der Aufpreis,
// der Waesche-Schritt und die zweite Kachelreihe weg — ein Kuss-Video kostet {once}, fertig.

/**
 * EIN MONAT, EIN PREIS (Owner 03.08.2026: „weisst du was, wir machen es simple, wir machen nur
 * ein Monat").
 *
 * Hier standen vier Stufen — 1 / 2 / 3 / 12 Monate zu 14,99 / 24,99 / 34,99 / 119,99 EUR, mit
 * Waehler im Trichter. Der Owner hat sie noch am selben Abend gestrichen, und das ist die
 * bessere Entscheidung: Ein Waehler ist eine Frage, die man dem Kunden stellt, bevor er weiss,
 * ob ihm das Produkt gefaellt. Bei einem Chat, den er sieben Nachrichten lang kennt, ist „ja
 * oder nein" die einzige Frage, die er beantworten kann.
 *
 * Als Liste (statt einer blanken Zahl) bleibt es stehen, weil Kasse und Trichter bereits
 * darueber laufen — und weil eine zweite Laufzeit damit ein Tabelleneintrag ist, kein Umbau.
 */
/**
 * UND ES IST EIN GESCHENK, KEIN ABO (Owner 05.08.2026: „Chat mit Ai 14,99/im monat das stimmt
 * nicht. Man verschenkt es für den Preis von 14,99 einmallig für einen monat. Derjenige der es
 * bekommt kann es aber verlängern. Wir haben nur ein mal preise gross geschrieben.").
 *
 * Damit steht der Chat neben dem Kuss und dem Tanz, nicht neben der Hochzeitsseite: Einer
 * bezahlt EINMAL, ein anderer bekommt einen Monat. Was daraus folgt und leicht zu uebersehen
 * ist — DER EMPFAENGER VERLAENGERT, NICHT DER KAEUFER. Wer hier je eine wiederkehrende Kennung
 * einsetzt, bucht dem Schenker Monat fuer Monat etwas ab, das er verschenkt hat.
 *
 * `chatPriceId()` unten ist deshalb `one_time` — nachgeschlagen, nicht geglaubt.
 */
export const CHAT_STUFEN = [
  { monate: 1, cents: 1499 },   // = die Stripe-Preis-Kennung unten. Beide zusammen aendern!
] as const;

/**
 * WAS IM CHAT-MONAT DRIN IST — UND AB WANN ER ZAHLT (Owner 05.08.2026, in drei Sätzen):
 *
 *   „ja, sie liefert die vorgenerierten im chat"
 *   „und bilder auch, die wir haben"
 *   „wenn alle verbraucht sind, dann können wir ihm das tryon anbieten. Das haben wir doch
 *    schon. Aber ich glaube die Videos sind dort zu günstig."
 *
 * Damit ist der Monat sauber in zwei Hälften geteilt, und die Trennlinie ist nicht Grosszügigkeit
 * sondern KOSTEN:
 *
 *   GRATIS   der VORHANDENE Bestand — die vorgenerierten Videos und die Bilder, die wir
 *            ohnehin liegen haben. Sie kosten uns bei jedem Ausspielen nichts, also darf sie
 *            jeder haben, so oft er will. Das ist der Grund, warum ein Monat für einen festen
 *            Preis überhaupt trägt.
 *   BEZAHLT  alles, was NEU ERZEUGT wird — jeder Lauf kostet uns echtes Geld (Pixverse). Wenn
 *            der Bestand durch ist, geht es im Try-on weiter, das es längst gibt.
 *
 * EIN NEUES VIDEO MIT BELLA: 9,99 € (Owner: „aber das muss er kaufen. für 9,99"). Und das ist
 * zugleich seine Antwort auf die eigene Frage, ob das Try-on zu billig sei — dort kostet ein
 * weiteres Video EXTRA_VIDEO_CENTS, also 3,99 €. Die beiden Zahlen stehen nebeneinander und
 * meinen dasselbe Ding: einen Pixverse-Lauf. Wer sie angleichen will, ändert EINE von beiden
 * hier; solange sie auseinanderstehen, ist das eine Entscheidung und kein Versehen.
 *
 * NOCH NICHT GEBAUT ist der Knopf im Chat. Das Anziehen und das Dreh-Video sind am 03.08.2026
 * ausgebaut worden (Owner damals: „wir machen das Anziehen raus"); der Chat liefert heute Text
 * und Bilder. Die Zahl steht hier zuerst, damit sie an EINER Stelle steht, wenn der Knopf kommt
 * — bis dahin nennt sie kein Trichter, und auf keiner Seite steht ein Preis dafür (Owner:
 * „das schreibst du nicht was es kostet").
 */
export const BELLA_VIDEO_CENTS = 999;              // 9,99 € — ein NEU erzeugtes Video mit ihr

/**
 * WIE VIELE NACHRICHTEN IM MONAT. Gerechnet mit 0,09 Euro-Cent je Nachricht (nach dem Umbau am
 * Zwischenspeicher, siehe app/api/model-chat): 1.000 Nachrichten kosten rund 0,86 EUR von
 * 14,99 EUR. Alles am Stueck verbrauchbar — der Deckel schuetzt vor dem EINEN, der ihn
 * ausreizt, nicht vor dem Durchschnitt, der weit darunter liegt.
 */
export const CHAT_KONTINGENT: Record<number, number> = { 1: 1000 };

/**
 * DIE STRIPE-PREIS-KENNUNG FUER DEN CHAT-MONAT (Owner 03.08.2026:
 * „price_1U0LLs1jPNCWoiztHFs712cY neuer Preis").
 *
 * Nachgeschlagen wie die erste — und diesmal stimmt alles zusammen:
 *   Typ:    one_time  ✓  (kein Abo; eine wiederkehrende haette das gerade Entfernte zurueckgeholt)
 *   Betrag: 1499 Cent  ✓  = CHAT_STUFEN
 *   Name:   „Luxurybandit Chat 14,99€"  ✓
 *
 * DIE VORGAENGERIN (price_1U0L0B…) STAND AUF 1400 CENT bei gleichem Namen — der Kunde haette
 * 14,99 gelesen und 14,00 gezahlt. Der Owner hat sie ersetzt statt korrigiert; die alte bleibt
 * in seinem Konto aktiv, wird von hier aber nicht mehr gerufen.
 *
 * WER DEN PREIS AENDERT, aendert ZWEI Zahlen: diese Kennung und CHAT_STUFEN. Sie stehen an
 * verschiedenen Orten, und nur die Kennung entscheidet, was wirklich abgebucht wird — die
 * Tabelle entscheidet nur, was der Kunde vorher liest. Laufen sie auseinander, faellt es erst
 * auf, wenn sich jemand beschwert.
 */
export function chatPriceId(): string {
  return process.env.STRIPE_CHAT_PRICE_ID?.trim() || "price_1U0LLs1jPNCWoiztHFs712cY";
}


/**
 * DER HOCHZEITSPLANER: 29 € IM MONAT, BIS DIE HOCHZEIT WAR (Owner 05.08.2026, Kennung
 * `price_1U0zUB1jPNCWoiztqsf49Xn2` — am selben Tag gegen die Stripe-API gelesen: 2900 Cent,
 * EUR, Steuer inklusive, aktiv, Produktname „LuxuryBandit 29€").
 *
 * ACHTUNG, DIE ZAHL IST 29,00 € — NICHT 29,99 €, wie es im Konzept steht. Massgeblich ist,
 * was die Kasse nimmt, und das ist die Kennung des Owners.
 *
 * WARUM HIER EIN ABO STEHT UND SONST NIRGENDS (Owner 05.08.2026: „was aber Canva und CapCut
 * macht ist immer abo, deswegen sind die reich geworden genau wie Spotify und Netflix"):
 * Verkauft wird keine Datei, sondern eine SEITE, die monatelang läuft — Einladung erreichbar,
 * Zusagen, Gästeliste, Menüwahl, Gruppenchat. Wer sich ein Jahr vor der Hochzeit verlobt,
 * zahlt zwölfmal und kündigt danach, völlig zu Recht: ein Abo mit natürlichem Ende.
 *
 * Für die GESCHENKE gilt das ausdrücklich nicht (Owner am selben Tag: „das sind Geschenke,
 * die jemand anders kauft und die haben ein Ablaufdatum. Der User kann das verlängern") —
 * dort läuft nichts von allein, dort verlängert ein Mensch, und zwar zum selben Preis.
 *
 * HIER STAND EINE STUFENLEITER: 3 / 6 / 12 Monate zu 24 / 49 / 99 €. Sie wurde von KEINER
 * Kasse gelesen, nur von einer Kachel — während die Kasse in Wahrheit 1,49 € nahm. Genau der
 * Widerspruch, der `themenPreisCents` weiter unten erzwungen hat.
 */
// 29 UND NICHT 30 (Owner 05.08.2026: das Abo ist mit 29/Monat in Stripe angelegt). Die runden
// Zahlen gelten fuer die Geschenke und die Aufladeleiter; die beiden Abos behalten die Preise,
// die im Stripe-Konto stehen — massgeblich ist immer, was die Kasse wirklich nimmt.
export const HOCHZEIT_START_CENTS = 2900;           // 29 € — der Kauf, erster Monat inklusive

/**
 * DIE VERLAENGERUNG KOSTET WENIGER ALS DER KAUF (Owner 05.08.2026, zum Hochzeitsplaner: „aber
 * den kann man auch verlängern für 14,99 im monat").
 *
 * Und das ist die einzige Stelle, an der „selbe preis immer" nicht gilt — aus einem guten
 * Grund: Der erste Monat bezahlt die ARBEIT (das Video, die Bilder, die fertige Seite), jeder
 * weitere nur noch das HOSTING (Seite erreichbar, Zusagen, Gaesteliste, Chat). Wer dafuer
 * jeden Monat den vollen Kaufpreis verlangt, laesst die Seite ablaufen statt sie zu verkaufen.
 *
 * ES IST DIESELBE ZAHL WIE DER CHAT-MONAT — aber NICHT DERSELBE KAUFWEG (Owner 05.08.2026:
 * „Chat mit Ai 14,99/im monat das stimmt nicht. Man verschenkt es für den Preis von 14,99
 * einmallig für einen monat. Derjenige der es bekommt kann es aber verlängern.").
 *
 * Hier stand, beides laufe ueber dieselbe wiederkehrende Kennung. Das war falsch und hat den
 * Chat zu einem Abo gemacht, das er nie war:
 *
 *   Hochzeits-Seite  →  ABO, verlaengert sich selbst  (`chatAboPriceId`, recurring)
 *   Chat             →  GESCHENK, ein Monat, einmal bezahlt  (`chatPriceId`, one_time)
 *
 * Und der Unterschied ist kein technischer, sondern der ganze Sinn: Ein Geschenk verschenkt
 * man, es laeuft ab, und VERLAENGERN DARF DER, DER ES BEKOMMEN HAT. Ein Abo, das dem Schenker
 * jeden Monat Geld abbucht, waere bei einem Geschenk ein Fehler — er hat es ja weggegeben.
 * Genau das steht drei Absaetze weiter oben schon fuer alle Geschenke: „dort laeuft nichts von
 * allein, dort verlaengert ein Mensch, und zwar zum selben Preis."
 */
export const VERLAENGERUNG_MONAT_CENTS = 1499;      // 14,99 € je weiterem Monat

/**
 * DIE WIEDERKEHRENDEN KENNUNGEN — DIE EINZIGEN ZWEI, DIE ES NOCH NICHT GIBT.
 *
 * Ein Abo braucht in Stripe einen `recurring`-Preis; die beiden Kennungen vom 05.08.2026 sind
 * `one_time` und taugen dafür nicht. Beide entstehen im Stripe-Konto des Owners (Claude hat
 * keinen Zugang) und kommen dann über die Umgebung herein:
 *
 *   STRIPE_HOCHZEIT_ABO_PRICE_ID   29,00 €/Monat, Steuer inklusive
 *   STRIPE_CHAT_ABO_PRICE_ID       14,99 €/Monat, Steuer inklusive
 *
 * KEIN RÜCKFALL AUF EINE EINMAL-KENNUNG. Fehlt die Variable, gibt es einen leeren String und
 * die Kasse muss hörbar abbrechen — ein Abo, das versehentlich als Einmalkauf durchgeht,
 * fällt erst im übernächsten Monat auf, wenn das Geld nie kam.
 */
export function hochzeitAboPriceId(): string {
  return process.env.STRIPE_HOCHZEIT_ABO_PRICE_ID?.trim() || "";
}

/**
 * DIE EINE WIEDERKEHRENDE KENNUNG — und sie gehoert der HOCHZEITS-SEITE, nicht dem Chat
 * (Owner 05.08.2026: „price_1U106O1jPNCWoiztdAUB9pEA hier ist es für die abos").
 *
 * DER NAME IST GEBLIEBEN, DER ZWECK NICHT. Sie hiess `chatAboPriceId`, weil der Chat einmal als
 * Monatsabo geplant war. Am selben Tag hat der Owner das geradegerueckt („Man verschenkt es für
 * den Preis von 14,99 einmallig für einen monat"), und seither ruft sie genau EINE Kasse:
 * `app/api/einladung-abo-checkout` — die Verlaengerung der Hochzeitsseite. Der Chat laeuft ueber
 * `chatPriceId()` (one_time). Wer den Namen aendert, aendert vier Fundstellen; wer ihn liest,
 * liest bitte diesen Absatz mit.
 *
 * NACHGESCHLAGEN, STATT GEGLAUBT — am 05.08.2026 gegen die Stripe-API gelesen:
 *   Betrag: 1499 Cent  ✓  = VERLAENGERUNG_MONAT_CENTS
 *   Typ:    recurring, alle 1 Monat  ✓  (die Seite laeuft weiter, solange er zahlt; ein
 *                                        Einmalpreis waere hier ein Monat, der still endet)
 *   Steuer: inklusive  ✓   ·   Aktiv: ja  ✓   ·   Produkt: „LuxuryBandit Abo"
 *
 * 14,99 UND NICHT 15 — mit Absicht (Owner 05.08.2026, auf die Rückfrage: „14,99 ist richtig").
 * Die runden Zahlen gelten für die Geschenke und die Aufladeleiter; diese Zahl bleibt bei 14,99.
 * Wer sie ändert, ändert BEIDES: VERLAENGERUNG_MONAT_CENTS und den Preis in Stripe.
 *
 * KEIN GUTSCHEIN AUF DIESE KENNUNG. `standardCoupon()` ist FOREVER50 — auf 14,99 € ergaebe er
 * 7,49 € fuer immer, eine Zahl, die auf keinem Knopf steht.
 */
export function chatAboPriceId(): string {
  return process.env.STRIPE_CHAT_ABO_PRICE_ID?.trim() || "price_1U106O1jPNCWoiztdAUB9pEA";
}

/** Wie viele Video-Laeufe im Hochzeitsplaner stecken (der erste plus zwei Tausche). */
export const HOCHZEIT_VIDEO_LAEUFE = 3;

/**
 * WIE LANGE EINE GEKAUFTE SEITE LEBT — 30 Tage (Owner 04.08.2026: „alle haben ein
 * Verfallsdatum. 30 Tage").
 *
 * Und was danach kommt, ist der Motor des Ganzen (Owner 05.08.2026): „die haben ein
 * Ablaufdatum … der User kann das verlängern". Verlängern kostet **denselben Preis wie der
 * Kauf** („selbe preis immer") — deshalb steht dafür hier KEINE eigene Zahl, sondern
 * `verlaengerungCents()` unten liest denselben Eintrag. Zwei Zahlen für dasselbe Ding laufen
 * sonst auseinander, und dann verlangt die Verlängerung etwas anderes als der Kauf.
 */
export const LAUFZEIT_TAGE = 30;

/**
 * ZAHLEN NUR NOCH VON HIER — nie wieder in Sprachtabellen tippen.
 *
 * Owner 29.07.2026: „das machst du ab jetzt so, dass überall das geändert wird aus der
 * Preistabelle." Anlass: Der Preis war auf 24,50 € und die Videozahl auf 5 gesetzt, aber auf
 * Italienisch stand weiter „25 video" und auf der Bella-Seite „25 videos a month". Wer eine
 * Zahl in acht Sprachtabellen abschreibt, vergisst eine — das ist keine Frage der Sorgfalt.
 *
 * Deshalb stehen in den Texten nur noch Platzhalter, die hier gefüllt werden:
 *   {price}  → 24,50 €   (der Preis, den er wirklich zahlt)
 *   {monat}  → 14,99 €   (die Hochzeits-Verlängerung, das einzige Abo)
 *   {bella}  → 9,99 €    (ein Video mit Bella — der Beschenkte kauft es)
 *   {gutschein} → 9,99 € (die Gutschein-Karte — die Verpackung, nicht das Geschenk)
 *   {list}   → 49 €      (Listenpreis, durchgestrichen)
 *   {extra}  → 2,99 €    (jedes weitere Video)
 *   {videos} → 12        (im Abo enthalten)
 *   {once}   → 1,49 €    (Einmalkauf, ohne Abo)
 *   {tanz}   → 3,99 €    (ein Tanz-Video, siehe POLEDANCE_CENTS)
 *   {geburtstag} → 4,99 € (das Geburtstagsvideo, siehe GEBURTSTAG_CENTS)
 *   {days}   → 7         (Probezeit ohne Abo, siehe TRIAL_DAYS)
 *
 * Ändert sich etwas, wird OBEN eine Zahl geändert — und alle Sprachen stimmen sofort.
 */
export function eur(cents: number, lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2);
  const v = cents / 100;
  const txt = v.toFixed(2).replace(/\.00$/, v % 1 === 0 ? "" : ".00");
  return l === "en" ? `€${txt}` : `${txt.replace(".", ",")} €`;
}

export function fillPrices(text: string, lang?: string): string {
  return String(text ?? "")
    .replace(/\{price\}/g, eur(TOPIC_EFFECTIVE_MONTHLY_CENTS, lang))
    .replace(/\{monat\}/g, eur(VERLAENGERUNG_MONAT_CENTS, lang))
    .replace(/\{bella\}/g, eur(BELLA_VIDEO_CENTS, lang))
    .replace(/\{gutschein\}/g, eur(GUTSCHEIN_CENTS, lang))
    .replace(/\{list\}/g, eur(TOPIC_MONTHLY_CENTS, lang))
    .replace(/\{extra\}/g, eur(EXTRA_VIDEO_CENTS, lang))
    .replace(/\{once\}/g, eur(ONCE_CENTS, lang))
    .replace(/\{tanz\}/g, eur(POLEDANCE_CENTS, lang))
    .replace(/\{geburtstag\}/g, eur(GEBURTSTAG_CENTS, lang))
    .replace(/\{videoauf\}/g, eur(VIDEO_UPGRADE_CENTS, lang))
    .replace(/\{topup\}/g, eur(TOPUP_CENTS, lang))
    .replace(/\{topup2\}/g, eur(TOPUP_GROSS_CENTS, lang))
    .replace(/\{plan\}/g, eur(PLAN_CENTS, lang))
    .replace(/\{days\}/g, String(TRIAL_DAYS))
    .replace(/\{videos\}/g, String(INCLUDED_VIDEOS_PER_MONTH));
}

/** Anzeige-Texte: immer der halbierte Preis, denn der Gutschein gilt für alle. */
export const PRICE_LINE_EN = "{price}/month (50% off, forever)";
export const PRICE_LINE_DE = "{price}/Monat (50 % Rabatt, dauerhaft)";

/**
 * Der Satz UNTER jedem Kaufknopf: was er zahlt, dass es dauerhaft gilt und dass er
 * monatlich kündigen kann. Muss überall stehen, wo ein Preis auf dem Knopf steht,
 * sonst ist der Preis versteckt.
 */
const RENEW_NOTE: Record<string, string> = {
  en: "{price}/month instead of {list} — 50% off for as long as you stay. Cancel any time.",
  de: "{price}/Monat statt {list} — die 50 % bleiben dauerhaft. Monatlich kündbar.",
  ro: "{price}/lună în loc de {list} — cei 50 % rămân pentru totdeauna. Poți renunța oricând.",
  es: "{price}/mes en vez de {list} — el 50 % se mantiene siempre. Cancela cuando quieras.",
  fr: "{price}/mois au lieu de {list} — les 50 % restent pour toujours. Résiliable à tout moment.",
  pt: "{price}/mês em vez de {list} — os 50 % ficam para sempre. Cancela quando quiseres.",
  pl: "{price}/miesiąc zamiast {list} — 50 % zostaje na zawsze. Możesz zrezygnować w każdej chwili.",
  it: "{price}/mese invece di {list} — il 50 % resta per sempre. Disdici quando vuoi.",
};
export function renewNote(lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2);
  return fillPrices(RENEW_NOTE[l] ?? RENEW_NOTE.en, l);
}

/**
 * DER SATZ UNTER DEN BEIDEN ABO-KNÖPFEN — und er darf NICHT `renewNote` sein.
 *
 * `renewNote` verspricht „{price}/Monat statt {list} — die 50 % bleiben dauerhaft". Das gehört
 * zum alten Themen-Abo, wo der Dauergutschein FOREVER50 die 49 € auf 24,50 € drückt und beide
 * Zahlen deshalb stimmen. Die zwei Abos, die es noch gibt (Chat und Hochzeits-Verlängerung),
 * laufen seit 05.08.2026 über `chatAboPriceId()` — 14,99 €, wiederkehrend, OHNE Gutschein.
 * Stünde `renewNote` darunter, läse der Kunde 24,50 € statt 49 € und Stripe nähme 14,99 €:
 * drei Zahlen für einen Preis, und keine davon die richtige.
 *
 * Kein durchgestrichener Listenpreis, weil es keinen gibt. 14,99 € IST der Preis.
 */
const ABO_NOTE: Record<string, string> = {
  en: "{monat}/month. Cancel any time.",
  de: "{monat}/Monat. Monatlich kündbar.",
  ro: "{monat}/lună. Poți renunța oricând.",
  es: "{monat}/mes. Cancela cuando quieras.",
  fr: "{monat}/mois. Résiliable à tout moment.",
  pt: "{monat}/mês. Cancela quando quiseres.",
  it: "{monat}/mese. Disdici quando vuoi.",
};
export function aboNote(lang?: string): string {
  const l = String(lang ?? "en").slice(0, 2);
  return fillPrices(ABO_NOTE[l] ?? ABO_NOTE.en, l);
}

/** Der Preis, der auf dem Kaufknopf steht („… — 24,50 €"). */
export function priceTag(lang?: string): string {
  return eur(TOPIC_EFFECTIVE_MONTHLY_CENTS, lang);
}

/** Die Preis-ID des laufenden Themen-Abos (49 €). */
export function topicPriceId(): string {
  // KEIN Rueckfall auf die alte 24-EUR-Preis-ID — die ist abgeschafft. Fehlt die Env,
  // gilt der neue 49-EUR-Preis, damit nie wieder heimlich der alte Preis kassiert wird.
  return process.env.STRIPE_TOPIC_ABO_PRICE_ID?.trim() || "price_1TxvSi1jPNCWoiztEHBpgDhj";
}

/**
 * Standard-Gutschein — gilt FÜR ALLE, ohne dass jemand einen Code eintippt (Owner
 * 28.07.2026: „du sollst den Rabatt immer einbauen, auch für nicht members";
 * 29.07.2026: „der Kunde zahlt dauerhaft 50 % weniger").
 *
 * Seit 29.07.2026 ist das FOREVER50 (`sRHDMAQE`, percent_off 50, duration forever) statt
 * des alten Einmal-Gutscheins über 30 € — der galt nur für den ersten Monat, danach sprang
 * der Preis auf 49 € zurück. Abschaltbar über `STRIPE_FIRST_MONTH_COUPON=""`.
 */
export function standardCoupon(): string | undefined {
  const env = process.env.STRIPE_FIRST_MONTH_COUPON;
  if (typeof env === "string") return env.trim() || undefined;   // leer = Aktion beendet
  return "sRHDMAQE";   // FOREVER50 — 50 % dauerhaft → 24,50 € statt {list}
}

/**
 * WAS EIN THEMA KOSTET — EINE QUELLE FÜR KACHEL UND LANDINGPAGE.
 *
 * Owner 04.08.2026: „auf jeder Landingpage muss auch der Preis stehen wie auf der Topicseite.
 * Ich weiss es selber nicht was es kostet."
 *
 * Der zweite Satz ist der wichtige, und er hatte einen konkreten Grund: Die Kachel im Katalog
 * und die Kasse dahinter lasen VERSCHIEDENE Zahlen. Bei der Hochzeit stand „ab 24 €" auf der
 * Kachel (aus `HOCHZEIT_STUFEN`) — abgebucht wurden 1,49 € (`ONCE_CENTS` über
 * `/api/kiss-video-checkout`). `HOCHZEIT_STUFEN` wurde von KEINER Kasse gelesen, nur von der
 * Kachel. Zwei Zahlen für dasselbe Thema, und keine Stelle im Code, an der auffällt, dass sie
 * sich widersprechen.
 *
 * Deshalb steht hier ab jetzt EINE Tabelle, und sie nennt für jedes Thema den Betrag, den die
 * KASSE wirklich nimmt — nachgeschlagen an der Route, nicht an der Absicht:
 *
 *   kiss / wedding / holiday / birthday → ONCE_CENTS      (kiss-video-checkout, birthday-…)
 *   surprise                            → POLEDANCE_CENTS (kiss-video-checkout, `tanz`)
 *   chat                                → CHAT_STUFEN[0]  (chat-zugang-checkout)
 *   bella / tryon                       → Themen-Abo      (topicPriceId)
 *
 * WER EINEN PREIS ÄNDERT, ändert ihn hier UND in der Kasse dahinter (bei Stripe-Preis-IDs
 * zusätzlich im Stripe-Konto). Diese Tabelle entscheidet nur, was der Kunde LIEST.
 */
export type ThemenSchluessel =
  | "kiss" | "wedding" | "holiday" | "birthday" | "surprise" | "chat" | "bella" | "tryon"
  /* Das Versprechen (Owner 10.08.2026) — ein Geschenk-Video wie die anderen, 4,99 €. */
  | "versprechen"
  /* Gutschein verpacken (Owner 05.08.2026) — ein Geschenk wie die anderen, also ONCE_CENTS
     ueber den `default`-Zweig unten. Verkauft wird die VERPACKUNG, nie der Gutschein selbst:
     in der EU ist der ein Zahlungsinstrument, siehe KONZEPT-GESCHENKE-UND-IDEEN.md §3b. */
  | "gutschein";

const AB_WORT: Record<string, { ab: string; pm: string }> = {
  de: { ab: "ab", pm: "/Monat" }, en: { ab: "from", pm: "/month" },
  ro: { ab: "de la", pm: "/lună" }, es: { ab: "desde", pm: "/mes" },
  fr: { ab: "à partir de", pm: "/mois" }, pt: { ab: "a partir de", pm: "/mês" },
  it: { ab: "da", pm: "/mese" },
};

/** Der Betrag in Cent, den die Kasse dieses Themas wirklich nimmt. */
export function themenPreisCents(thema: ThemenSchluessel): number {
  switch (thema) {
    case "surprise": return POLEDANCE_CENTS;   // 4,99 € wie jedes Geschenk-Video
    case "wedding": return HOCHZEIT_START_CENTS;   // 29 EUR Kauf; Verlaengerung siehe unten
    case "chat": return CHAT_STUFEN[0].cents;
    /**
     * DIE GUTSCHEIN-KARTE IST GRATIS (Owner 06.08.2026: „Die Gutscheingenerierung kostet
     * nichts. … er muss nur den kredit oder das produkt bezahlen"). Auf dem Schild steht
     * deshalb das billigste GESCHENK, das man hineinlegen kann — nicht mehr die abgeschaffte
     * 9,99-Verpackungsgebühr. `GUTSCHEIN_CENTS` bleibt nur als Altlast der toten
     * kiss-video-checkout-Weiche stehen.
     */
    case "gutschein": return ONCE_CENTS;   // „ab 15 €" — das billigste Geschenk darin
    case "bella": case "tryon": return TOPIC_EFFECTIVE_MONTHLY_CENTS;
    case "birthday": return GEBURTSTAG_CENTS;   // 4,99 € Startpreis (Owner 07.08.2026)
    default: return GESCHENK_VIDEO_CENTS;   // kiss, holiday — 4,99 € (Owner 10.08.2026)
  }
}

/**
 * Läuft dieses Thema auf einen Monatspreis statt auf einen Einmalkauf?
 *
 * DER CHAT STEHT SEIT DEM 05.08.2026 ABENDS NICHT MEHR HIER (Owner: „Chat mit Ai 14,99/im
 * monat das stimmt nicht. Man verschenkt es für den Preis von 14,99 einmallig für einen
 * monat."). Auf dem Schild stand „ab 14,99 €/Monat" — das liest sich als laufende Zahlung,
 * und genau die gibt es nicht: Einer zahlt EINMAL, ein anderer bekommt einen Monat, und
 * verlängern tut danach der Empfänger. Ein Geschenk, das jemand einmal verschickt, bleibt ein
 * Einmalkauf — dasselbe gilt für Kuss, Geburtstag, Urlaub und Tanz.
 *
 * Die HOCHZEIT steht aus einem anderen Grund nicht hier: Die 29 € sind ein Kauf mit 30 Tagen
 * darin, kein Monatspreis. „ab 29 €/Monat" auf der Kachel wäre teurer, als es ist — was danach
 * kommt, sind 14,99 € (VERLAENGERUNG_MONAT_CENTS), und das gehört in den Text, nicht ins
 * Schild. Übrig bleiben `bella` und `tryon`, die letzten zwei Seiten am alten Themen-Abo.
 */
export function istMonatspreis(thema: ThemenSchluessel): boolean {
  return thema === "bella" || thema === "tryon";
}

/**
 * WAS DAS VERLÄNGERN KOSTET — „selbe preis immer" (Owner 05.08.2026).
 *
 * Keine eigene Zahl, mit Absicht: Die Verlängerung liest denselben Eintrag wie der Kauf. Zwei
 * Zahlen für dasselbe Ding wären zwei Gelegenheiten, sie auseinanderlaufen zu lassen — und
 * dann verlangt die Verlängerung etwas anderes als das Preisschild von gestern.
 *
 * Die Funktion steht trotzdem hier und wird überall gerufen, wo verlängert wird: Sie ist die
 * EINE Stelle, an der ein späterer, günstigerer Verlängerungspreis eingebaut würde.
 */
export function verlaengerungCents(thema: ThemenSchluessel): number {
  // Hochzeit und Chat leben weiter und kosten monatlich dasselbe (Owner 05.08.2026). Alles
  // andere ist ein Geschenk: Wer die Seite behalten will, zahlt dafuer denselben Preis wie
  // beim Kauf — „selbe preis immer".
  if (thema === "wedding" || thema === "chat") return VERLAENGERUNG_MONAT_CENTS;
  return themenPreisCents(thema);
}

/**
 * Die Preiszeile, wie sie auf der Kachel steht: „ab 1,49 €" bzw. „ab 24,50 €/Monat".
 * Dieselbe Zeichenkette auf der Landingpage — sonst liest der Besucher zwei Preise für
 * dasselbe Ding und glaubt keinem von beiden.
 */
export function themenPreisZeile(thema: ThemenSchluessel, lang?: string): string {
  const W = AB_WORT[String(lang ?? "en")] ?? AB_WORT.en;
  const zahl = eur(themenPreisCents(thema), lang);
  return `${W.ab} ${zahl}${istMonatspreis(thema) ? W.pm : ""}`;
}

/**
 * DIE AUFLADE-LEITER — EINE STUFE JE PREIS, DEN ES GIBT (Owner 05.08.2026: „wer für Hochzeit
 * kaufen will, dem muss man 29,00 anbieten … man muss also 14,99, 29,00 und 59,00 anbieten.
 * 4,99 € kann man auch anbieten und auch 9,99 €, wer weiss welche Produkte wir noch umstellen
 * werden oder neue Produkte kommen").
 *
 * WARUM EINE LISTE UND KEINE ZWEI KONSTANTEN: Jedes Produkt hat einen Preis, und wer es über
 * das Guthaben kaufen will, muss GENAU diesen Betrag aufladen können. Solange die Stufen
 * einzeln im Code standen, hiess ein neues Produkt zwangsläufig eine vergessene Stufe — und
 * dann lädt jemand 14,99 € auf für etwas, das 29,00 € kostet und steht mit bezahltem Geld vor
 * demselben Knopf wie vorher. Genau der Fall, den der Owner hier abräumt.
 *
 *   5 · 10        die freien Stufen. Sie kaufen HEUTE kein einziges Produkt (das billigste
 *                 kostet 14,99) — sie bleiben stehen, weil sie morgen wieder eines kaufen.
 *
 *                 GLATT STATT KRUMM (Owner 05.08.2026: „dann können wir 5 Euro machen statt
 *                 4,99 damit wir kürzere Preise haben"). Vorher 4,99 und 9,99. Die beiden
 *                 hängen an KEINEM Produkt und an keiner Stripe-Kennung — sie sind reine
 *                 Beträge über `price_data`, also kostet die Änderung nichts als diese Zeile.
 *                 10 zieht mit, weil „5 € · 9,99 € · 14,99 €" nach Flickwerk aussieht: Wer
 *                 kurze Preise will, braucht sie nebeneinander, sonst wirkt die krumme Zahl
 *                 wie ein Versehen.
 *   14,99         jedes Geschenk: Kuss, Geburtstag, Urlaub, Tanz  (ONCE_CENTS)
 *   30            die grosse freie Stufe (der Hochzeitsplaner laeuft ueber Stripe, nicht
 *                 ueber das Guthaben — siehe die Anmerkung unter der Liste)
 *   59,00         das LuxuryBandit System, eine Analyse           (PLAN_CENTS)
 *
 * DIE DREI OBEREN STUFEN LESEN DIE PREISE, statt sie abzuschreiben: Wer oben einen Preis
 * ändert, ändert die Stufe mit. Zwei Zahlen für dasselbe Ding wären zwei Gelegenheiten, sie
 * auseinanderlaufen zu lassen — und dann deckt die angebotene Aufladung den Preis nicht mehr.
 *
 * SIE STEHT AM DATEIENDE, und das ist kein Geschmack: `const` lässt sich vor seiner eigenen
 * Zeile nicht lesen. Weiter oben notiert hätte diese Liste beim Laden des Moduls einen
 * ReferenceError geworfen, weil ONCE_CENTS und PLAN_CENTS erst darunter stehen.
 *
 * DIE KASSE NIMMT NUR, WAS HIER STEHT — Whitelist über `aufladeStufe()` in
 * `app/api/kiss-video-checkout` und `app/api/plan-checkout`. Was ein Browser sonst schickt,
 * fällt auf die kleinste Stufe: lieber zu wenig abgebucht als ein nie angebotener Betrag.
 */
// DIE VIERTE STUFE STEHT FEST AUF 30 und liest NICHT mehr den Hochzeitspreis: Seit die
// Hochzeit ein Abo ist, bucht Stripe sie monatlich ab, nie aus dem Guthaben — eine Stufe ueber
// 29 € haette also kein Produkt mehr, das sie kauft. Die Leiter bleibt die, die der Owner am
// 05.08.2026 diktiert hat: 5 · 10 · 15 · 30 · 60.
/**
 * DIE 3 € SIND EIN ZUSCHUSS, KEIN KAUF (Owner 05.08.2026: „Ich füge noch ein Credit ein 3 Euro
 * oder?" — auf den Einwand, dass 3 € unter jedem Preis liegen: „muss er auch nicht kaufen, er
 * legt noch drauf").
 *
 * Er hat recht, und der Einwand war zu eng gedacht: Guthaben ist additiv. 3 € kaufen allein
 * nichts (das billigste Video kostet EXTRA_VIDEO_CENTS, das billigste Geschenk ONCE_CENTS),
 * aber sie liegen auf dem Konto und der Rest wird dazugelegt. Als Einstiegsstufe und als
 * Werbe-Zuschuss ist das genau richtig.
 *
 * UND SIE TAUCHT BEIM GESCHENK-GUTSCHEIN TROTZDEM NICHT AUF — automatisch, ohne zweite Liste:
 * `GUTSCHEIN_STUFEN` filtert alles unter ONCE_CENTS weg. Der Unterschied ist der LESER. Wer
 * sich selbst auflädt, weiss, dass er nachlegt. Wer ein GESCHENK öffnet, weiss es nicht — und
 * ein Präsent, das erst nach einer eigenen Zahlung funktioniert, ist eine Rechnung mit
 * Schleife. Deshalb: unten offen, beim Verschenken bei 15 € Schluss.
 */
/* UNTEN BEI 5 EURO (Owner 07.08.2026: "dann fangen wir bei 5 euro an"). Die 3 Euro standen
   hier als kleinste Stufe — sie kaufen aber kein einziges Video, das billigste kostet mehr.
   Ein Betrag, der nichts kauft, gehoert nicht in eine Kaufleiter; als WERBEGESCHENK bleibt
   er bestehen (unten), denn dort ist er ein Zuschuss und kein Angebot. */
/**
 * DIE AUFLADELEITER — 10 · 15 · 30 · 60 €.
 *
 * DIE 5-€-SPROSSE IST RAUS (Owner 10.08.2026, direkt nach der Preiserhöhung: „dann kommt die
 * 5 euro aufladung raus"). Sie kaufte nach dem Schritt auf 9,99 € **kein einziges Produkt**
 * mehr: Wer sie wählte, hatte bezahlt und stand danach wieder vor demselben Kaufknopf, nur
 * fünf Euro ärmer. Eine Stufe, die nichts freischaltet, ist keine Auswahl, sondern eine Falle
 * — und sie erzeugt genau die Support-Mail, die ein 5-€-Kunde nicht wert ist.
 *
 * DIE ZAHLEN STEHEN AUSGESCHRIEBEN, nicht als Produktkonstanten: Die Leiter muss aufsteigend
 * bleiben und darf sich nicht verschieben, wenn ein Preis fällt oder steigt (an einem Tag
 * zweimal passiert: 15 → 4,99 → 9,99).
 *
 * 10 € IST JETZT DIE KLEINSTE und deckt ein Geschenk fast punktgenau — 9,99 € gehen weg,
 * ein Cent bleibt liegen. Der Rest auf dem Konto ist der Grund wiederzukommen; genau deshalb
 * verfällt Guthaben bei uns nie.
 */
export const AUFLADE_STUFEN = [1000, 1500, 3000, PLAN_CENTS] as const;

/**
 * DAS WERBEGESCHENK AN BESTANDSKUNDEN (Owner 05.08.2026: „auch meine Kunden können das
 * einlösen. Als Werbegeschenk … dann haben sie 3 Euro auf dem Konto").
 *
 * Es ist die UNTERSTE Stufe der Leiter, gelesen statt abgeschrieben: Was wir verschenken, ist
 * derselbe Betrag, den man auch kaufen kann — sonst stünde irgendwann eine Zahl im Rundbrief,
 * die es im Laden nicht gibt.
 *
 * WARUM ES SICH TRÄGT: 3 € kaufen allein nichts (das billigste Video kostet EXTRA_VIDEO_CENTS),
 * aber sie liegen auf dem Konto — und der Kunde legt drauf. Es ist ein Zuschuss, kein Kauf.
 * Verschenkt wird das über `app/api/werbe-guthaben`, mit unterschriebenem Link und genau
 * einmal je Adresse und Kampagne.
 */
/* EIGENE ZAHL, seit die Leiter bei 5 Euro beginnt (07.08.2026): Frueher war das die unterste
   Stufe, gelesen statt abgeschrieben. Das Werbegeschenk soll aber 3 Euro bleiben — es ist ein
   Zuschuss, kein Kauf, und darf deshalb unter dem kleinsten Kaufbetrag liegen. Haette ich die
   Leseregel stehen lassen, waere aus dem Geschenk still ein 5-Euro-Geschenk geworden: echtes
   Geld an Bestandskunden, ohne dass jemand es entschieden haette. */
export const WERBE_GUTSCHRIFT_CENTS = 300;

/** Ist dieser Betrag eine angebotene Stufe? Sonst gilt die kleinste. */
export function aufladeStufe(cents: unknown): number {
  const n = Number(cents);
  return (AUFLADE_STUFEN as readonly number[]).includes(n) ? n : AUFLADE_STUFEN[0];
}

/**
 * DER LUXURYBANDIT-GUTSCHEIN — Guthaben verschenken (Owner 05.08.2026: „Sollen wir aber hier
 * tatsächlich Gutscheine für unser Portal verkaufen, falls die Leute keine Ideen haben?" ·
 * „Credits? Warum nicht.").
 *
 * ES IST DER EINZIGE GUTSCHEIN, DEN WIR VERKAUFEN DÜRFEN, und der Unterschied ist kein
 * juristisches Haar: Bei einem FREMDEN Gutschein halten wir fremdes Geld und eine fremde
 * Zahlungsverpflichtung. Hier halten wir eine Leistung, die wir selbst erbringen — ein
 * Einzweckgutschein. Und wer unsere Datenbank knackt, findet Guthaben, das an eine Adresse
 * gebunden ist und nur Videos bei uns kauft, statt eines Stapels fremder Codes.
 *
 * ER BEANTWORTET DIE FRAGE, DIE DAS PORTAL STELLT: „Geschenkideen" sucht, wer KEINE Idee hat.
 * Dem acht Produkte hinzuhalten hilft nicht — er weiss ja nicht, was der andere mag. Der
 * Gutschein dreht es um: Er verschenkt die Wahl.
 *
 * ZWEI BEDINGUNGEN, UND BEIDE STECKEN IN DIESER ZEILE:
 *
 *   1. MINDESTENS EIN GESCHENK. Deshalb wird gefiltert statt abgeschrieben: Die Stufen 5 und
 *      10 aus der Aufladeleiter kaufen KEIN einziges Produkt (das billigste kostet ONCE_CENTS).
 *      Ein Gutschein, den man öffnet und der nichts kauft, ist eine Enttäuschung mit Schleife —
 *      und zwar vor den Augen dessen, der ihn geschenkt hat. Ändert sich der Produktpreis,
 *      zieht die Untergrenze automatisch mit; abgeschriebene Zahlen tun das nicht.
 *   2. ER LÄUFT NICHT AB. Auf jedem Geschenk liegen LAUFZEIT_TAGE (30). Hier gilt das
 *      ausdrücklich NICHT: Verfallendes Guthaben ist in mehreren EU-Ländern nicht haltbar und
 *      überall der zuverlässigste Weg zu Beschwerden. Der Gutschein wartet, bis er eingelöst
 *      wird. Wer je eine Frist einbaut, ändert damit die Rechtslage, nicht nur eine Zahl.
 *
 * DAS GUTHABEN HÄNGT AN DER ADRESSE DES BESCHENKTEN, nicht an der des Käufers — das ist der
 * ganze technische Unterschied zur normalen Aufladung (`guthabenAufladen`, Memory
 * `guthaben-haengt-an-einer-adresse`). Die Kasse muss die Empfängeradresse also mitführen.
 */
/* Ein Gutschein muss mindestens EIN Geschenk kaufen können — seit dem 10.08.2026 sind das
   4,99 €, also fällt auch die 5-€-Stufe wieder hinein. */
export const GUTSCHEIN_STUFEN: number[] = AUFLADE_STUFEN.filter(c => c >= GESCHENK_VIDEO_CENTS);

/** Ist dieser Betrag eine angebotene Gutschein-Stufe? Sonst gilt die kleinste (= ein Geschenk). */
export function gutscheinStufe(cents: unknown): number {
  const n = Number(cents);
  return GUTSCHEIN_STUFEN.includes(n) ? n : GUTSCHEIN_STUFEN[0];
}
