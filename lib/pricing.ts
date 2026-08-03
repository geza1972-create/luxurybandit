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
export const EXTRA_VIDEO_CENTS = 299;               // jedes Video über das Abo hinaus
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
// 1,49 statt 2,99 (Owner 01.08.2026: „ich will testen ob es am Preis liegt dass die Leute
// nichts kaufen"). Der Kauf läuft über price_data mit diesem Betrag — die im Stripe-Dashboard
// angelegte Preis-ID price_1TzXLz1jPNCWoiztla7ACpBL ist das dortige Gegenstück und wird vom
// Code nicht benutzt; massgeblich ist DIESE Zahl. Zurück zum alten Preis = 299.
export const ONCE_CENTS = 149;                      // 1,49 € — ein Kauf, kein Abo (Preistest)
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
export const TOPUP_CENTS = 499;                     // 4,99 € Konto-Aufladung (kleine Stufe)
// „biete beide an" (Owner 03.08.2026, direkt nach der Verkleinerung): Die 9,99 bleiben als
// zweite Stufe daneben — wer mehr laedt, hat laenger Ruhe. Die Kasse akzeptiert NUR diese
// beiden Werte (Whitelist in kiss-video-checkout), egal was ein Browser schickt.
export const TOPUP_GROSS_CENTS = 999;               // 9,99 € Konto-Aufladung (grosse Stufe)
// DAS LINGERIE-VIDEO IST RAUS (Owner 03.08.2026: „das mit der Lingerie ist eh nicht allzu
// seriös" — „wir machen das raus"). Hier stand LINGERIE_CENTS = 399: der zweite Videopreis,
// der einen FASHN-Lauf vor dem Pixverse-Lauf bezahlte. Mit dem Produkt fallen der Aufpreis,
// der Waesche-Schritt und die zweite Kachelreihe weg — ein Kuss-Video kostet {once}, fertig.

/**
 * DER CHAT: ZUGANG AUF ZEIT, KEIN ABO (Owner 03.08.2026).
 *
 * „Chat ist genauso wie Hochzeit. Es hat verschiedene Preise: 1 Monat, 2, 3, das ganze Jahr.
 * Und trotzdem ist es am Tag an Chat limitiert."
 *
 * Damit faellt die LETZTE Abo-Stelle der Plattform. Danach gibt es genau EINEN Kaufweg: aus dem
 * Guthaben bezahlen — entweder ein Geschenk (einmalig) oder Zugang fuer eine gewaehlte Zeit.
 * Kein `createSubscriptionCheckout`, keine Kuendigung, kein `hasActiveSubscription`, keine
 * Monatsgutschriften. Das ist der groesste Wegfall an Code, den dieser Umbau bringt.
 *
 * DAS TAGESLIMIT BLEIBT (`DAILY_MSGS` in ChatFunnel, heute 10 Nachrichten). Es ist der einzige
 * Deckel auf einer Sache, die je Nachricht Geld kostet — ohne ihn waere ein Jahrespaket ein
 * offenes Konto bei einem Sprachmodell. Der Kunde kauft ZEIT, nicht Menge.
 *
 * LOOKS SIND NICHT ENTHALTEN (Owner-Entscheidung, gleiche Stunde): Jeder neue Look kostet
 * weiter {extra} aus dem Guthaben. Er kostet uns einen Erzeugungslauf, und ein Paket, das
 * beliebig viele einschliesst, waere bei einem Vielnutzer ein Verlustgeschaeft.
 *
 * Die Leiter belohnt hier die laengere Bindung, anders als bei der Hochzeit:
 *   1 Monat  14,99 = 14,99 je Monat
 *   2 Monate 24,99 = 12,50 je Monat
 *   3 Monate 34,99 = 11,66 je Monat
 *  12 Monate 119,99 = 10,00 je Monat
 */
export const CHAT_STUFEN = [
  { monate: 1, cents: 1499 },
  { monate: 2, cents: 2499 },
  { monate: 3, cents: 3499 },
  { monate: 12, cents: 11999 },
] as const;

/**
 * DIE HOCHZEIT: EINMALIG KAUFEN, LAUFZEIT WAEHLEN (Owner 03.08.2026).
 *
 * „Ich will dafuer schon 24,99 Euro haben, aber dann wird gleich alles freigeschaltet: Chat,
 * Gaestelliste, Video" — und kurz darauf: „die muessen dann die Preise waehlen: 3 Monate 24 €,
 * 6 Monate 49 €, 1 Jahr 99 €."
 *
 * KEIN ABO MEHR. Damit faellt der teuerste Teil des Codes weg, gemessen an dem was er
 * einbringt: Abo-Kasse, Kuendigungslogik, `hasActiveSubscription` bei jedem Aufruf,
 * Monatsgutschriften, Kontingent-Zeilen. Die Hochzeit laeuft ueber denselben Weg wie jedes
 * andere Geschenk — nur mit einem groesseren Betrag und einer waehlbaren Laufzeit.
 *
 * DIE LEITER BELOHNT DIE LAENGERE BINDUNG NICHT — das ist gemessen, nicht gemeint:
 *   3 Monate  24 €  =  8,00 € je Monat
 *   6 Monate  49 €  =  8,17 € je Monat
 *  12 Monate  99 €  =  8,25 € je Monat
 * Wer rechnet, nimmt viermal die kleine Stufe (96 € statt 99 €). Die grossen Stufen verkaufen
 * sich trotzdem — an alle, die nicht rechnen und nicht dreimal verlaengern wollen. Wenn die
 * Leiter kippen soll, sind es zwei Zahlen hier: z. B. 39 € und 69 €.
 *
 * DREI VIDEO-VERSUCHE sind in JEDER Stufe enthalten (Owner: „was ist, wenn Leute das Video
 * austauschen wollen?"). Gescheiterte Laeufe zaehlen nicht mit — sonst bezahlt der Kunde
 * unsere Stoerung. Danach kostet jedes weitere Video den normalen Preis aus dem Guthaben.
 */
export const HOCHZEIT_STUFEN = [
  { monate: 3, cents: 2400 },
  { monate: 6, cents: 4900 },
  { monate: 12, cents: 9900 },
] as const;

/** Wie viele Video-Laeufe in jeder Hochzeits-Stufe stecken (der erste plus zwei Tausche). */
export const HOCHZEIT_VIDEO_LAEUFE = 3;

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
 *   {list}   → 49 €      (Listenpreis, durchgestrichen)
 *   {extra}  → 2,99 €    (jedes weitere Video)
 *   {videos} → 12        (im Abo enthalten)
 *   {once}   → 1,49 €    (Einmalkauf, ohne Abo)
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
    .replace(/\{list\}/g, eur(TOPIC_MONTHLY_CENTS, lang))
    .replace(/\{extra\}/g, eur(EXTRA_VIDEO_CENTS, lang))
    .replace(/\{once\}/g, eur(ONCE_CENTS, lang))
    .replace(/\{topup\}/g, eur(TOPUP_CENTS, lang))
    .replace(/\{topup2\}/g, eur(TOPUP_GROSS_CENTS, lang))
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
