/**
 * DAS LAND VON SELBST (Owner 31.07.2026: „das machst du mit Autofill").
 *
 * Zuerst stand hier eine Auswahlliste zum Antippen. Der Einwand ist richtig: Vor einem
 * Gratis-Bild ist jedes zusätzliche Feld eine Hürde, und ein Land tippt niemand gern, den
 * man gerade nach seiner E-Mail gefragt hat.
 *
 * DIE ZEITZONE IST DER BESTE HINWEIS, den ein Browser hergibt:
 *   - Sie steht IMMER zur Verfügung, ohne Nachfrage und ohne Erlaubnis-Dialog (anders als
 *     die Ortung, die einen Kasten aufmacht und meistens ein Nein bekommt).
 *   - Sie ist genauer als die Sprache: Ein Rumäne mit englischem Handy hat trotzdem
 *     `Europe/Bucharest` stehen.
 *   - Sie kostet nichts und dauert nicht — kein Netzaufruf, kein fremder Dienst.
 *
 * Der Server hat es noch genauer: Vercel legt jedem Aufruf `x-vercel-ip-country` bei. Das
 * ist die Wahrheit über den Standort und schlägt jede Vermutung des Browsers — deshalb wird
 * sie in `kiss-claim` bevorzugt. Nur lokal, wo es diesen Kopfeintrag nicht gibt, bleibt die
 * Zeitzone das letzte Wort.
 */

/**
 * Zeitzone → Land. Nur die Zonen, aus denen unsere Besucher kommen, plus die grossen
 * Nachbarn. Eine vollständige Tabelle hätte vierhundert Zeilen und brächte für dieses
 * Portal nichts; was fehlt, fällt auf "" und damit auf die bisherige Vorgabe zurück.
 */
const ZONE_LAND: Record<string, string> = {
  "Europe/Bucharest": "ro", "Europe/Chisinau": "ro",
  "Europe/Berlin": "de", "Europe/Vienna": "at", "Europe/Zurich": "ch",
  "Europe/Paris": "fr", "Europe/Brussels": "be", "Europe/Luxembourg": "be",
  "Europe/Rome": "it", "Europe/Malta": "it",
  "Europe/Madrid": "es", "Atlantic/Canary": "es",
  "Europe/Lisbon": "pt", "Atlantic/Azores": "pt", "America/Sao_Paulo": "pt",
  "Europe/London": "gb", "Europe/Dublin": "ie",
  "Europe/Amsterdam": "nl",
  "America/New_York": "us", "America/Chicago": "us", "America/Denver": "us",
  "America/Los_Angeles": "us", "America/Phoenix": "us", "America/Anchorage": "us",
};

/** Nur im Browser aufrufen. Gibt "" zurück, wenn nichts Verlässliches herauskommt. */
export function landAusZeitzone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    return ZONE_LAND[zone] ?? "";
  } catch { return ""; }
}

/**
 * BRAUCHT DIESER BESUCHER EINE COOKIE-EINWILLIGUNG? (14.08.2026)
 *
 * Die Einwilligungspflicht für Werbe-Pixel ist europäisches Recht (DSGVO/ePrivacy). Ausserhalb
 * Europas verlangt sie niemand — dort kostete das Banner nur Anmeldungen, ohne irgendetwas zu
 * schützen. Deshalb entscheidet die Zeitzone: `Europe/*` bekommt den Streifen, alle anderen
 * nicht.
 *
 * BEWUSST GROSSZÜGIG: Jede `Europe/`-Zone zählt, auch Moskau, Istanbul und Kiew, die nicht
 * zur EU gehören. Ein Banner zu viel ist ein Schulterzucken, ein Banner zu wenig ist ein
 * Rechtsverstoss — im Zweifel also fragen. Fehlt die Zeitzone (sehr alter Browser, harter
 * Datenschutzmodus), gilt derselbe Zweifel und der Streifen erscheint.
 */
export function brauchtEinwilligung(): boolean {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (!zone) return true;
    return zone.startsWith("Europe/") || zone === "Atlantic/Canary" || zone === "Atlantic/Azores";
  } catch { return true; }
}

/**
 * DARF FÜR DIESEN BESUCHER GEMESSEN WERDEN? (15.08.2026)
 *
 * Die EINE Antwort für alle Messwege — das Browser-Pixel (`components/MetaPixel.tsx`) und
 * die Conversions API auf dem Server (`lib/meta-capi.ts`, über ein Feld in der Stripe-
 * Sitzung). Vorher stand die Formel nur im Pixel; als die Server-Meldung dazukam, hätte sie
 * ein zweites Mal getippt werden müssen — und zwei Fassungen derselben Rechtsfrage laufen
 * irgendwann auseinander. Eine Zustimmung außerhalb Europas ist nicht nötig, drinnen zählt
 * nur ein ausdrückliches „Accept".
 */
export function darfMessen(): boolean {
  try {
    return localStorage.getItem("lb_cookie_consent") === "accepted" || !brauchtEinwilligung();
  } catch { return !brauchtEinwilligung(); }
}

/**
 * Serverseitig: das Land aus den Kopfzeilen. `x-vercel-ip-country` liefert Vercel als
 * Zwei-Buchstaben-Kürzel („RO"); Cloudflare hiesse `cf-ipcountry`, deshalb steht es daneben.
 * „XX" bedeutet bei Vercel „unbekannt" und zählt wie nichts.
 */
export function landAusKopfzeile(request: Request): string {
  const roh = request.headers.get("x-vercel-ip-country")
    ?? request.headers.get("cf-ipcountry")
    ?? "";
  const l = roh.trim().toLowerCase();
  return l && l !== "xx" && l.length === 2 ? l : "";
}
