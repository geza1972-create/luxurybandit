/**
 * SPRACHE — eine Quelle für alle Seiten.
 *
 * STANDARD IST ENGLISCH. Nur die vom Nutzer GEWÄHLTE Sprache (Cookie `lb_lang`,
 * gesetzt vom Umschalter in der TopNav) weicht davon ab — die Browsersprache
 * entscheidet nicht. `langFromAccept` bleibt für Stellen, die bewusst die
 * Browsersprache lesen (z. B. Sprache einer E-Mail aus der Telefonvorwahl).
 */
/**
 * DREI SPRACHEN — DEUTSCH, ENGLISCH, RUMÄNISCH (Owner 31.08.2026: „das ganze portal nur in
 * diesen 3").
 *
 * Diese Liste ist die einzige Quelle für das, was ANGEBOTEN wird: Der Umschalter zeigt nur,
 * was hier steht, und `resolveLang` kann nichts anderes zurückgeben. Wer mit spanischem oder
 * italienischem Browser kommt, bekommt jetzt Englisch; ein altes Cookie mit `it` ist
 * ungültig und fällt still auf dieselbe Reihenfolge zurück.
 *
 * Vorher waren es sieben (Polnisch flog schon am 30.07.2026 raus). Der Grund für den Schnitt
 * liegt ausserhalb dieser Datei: Das Portal richtet sich seit dem 31.08. auf Recruiting in
 * Rumänien und im deutschsprachigen Raum aus — Spanisch, Französisch, Portugiesisch und
 * Italienisch bedienen dort niemanden, kosten aber bei jeder Textänderung vier Fassungen.
 *
 * ACHTUNG, WENN ANZEIGEN LAUFEN: Wer aus einer italienischen oder spanischen Anzeige kommt,
 * landet ab jetzt auf Englisch.
 */
export const LANGS = ["en", "de", "ro"] as const;
export type Lang = (typeof LANGS)[number];

/**
 * WAS NOCH ÜBERSETZT IM CODE LIEGT — angeboten wird es nicht mehr.
 *
 * Die vier gestrichenen Sprachen sind ECHTE Arbeit, teils von Hand geschrieben. Sie werden
 * deshalb nicht gelöscht, sondern nur nicht mehr ausgewählt: Die Sprachtabellen tragen
 * weiterhin ihre `es`/`fr`/`pt`/`it`-Einträge und sind mit DIESEM Typ getippt, während
 * Umschalter und `resolveLang` allein `LANGS` kennen.
 *
 * Zurückholen ist damit eine Zeile — die Sprache in `LANGS` eintragen, fertig.
 */
export const LANGS_ARCHIV = ["en", "de", "ro", "es", "fr", "pt", "it"] as const;
export type LangArchiv = (typeof LANGS_ARCHIV)[number];

export const LANG_LABEL: Record<LangArchiv, string> = {
  en: "English", de: "Deutsch", ro: "Română", es: "Español",
  fr: "Français", pt: "Português", it: "Italiano",
};

export const LANG_COOKIE = "lb_lang";

/**
 * DER NAME DER SPRACHE, WIE ER IM AUFTRAGSTEXT STEHT — auf Deutsch, weil die Auftragstexte
 * des Hauses auf Deutsch geschrieben sind („Du schreibst AUSSCHLIESSLICH auf Rumänisch").
 *
 * WARUM ES DIESE TABELLE ZUSÄTZLICH ZU `LANG_LABEL` GIBT: `LANG_LABEL` trägt die Namen so,
 * wie die Sprache sich selbst nennt („Română") — das ist richtig für einen Umschalter, den
 * ein Mensch liest, und falsch für einen Auftrag, den ein Modell liest.
 *
 * SIE STEHT HIER UND NICHT IN EINER ROUTE, weil genau dieser Fehler schon zweimal Geld
 * gekostet hat: eine rumänische Oberfläche mit deutschen Fragen (David, 07.09.2026). Eine
 * zweite Kopie der Tabelle wäre die dritte Gelegenheit dafür.
 *
 * DAS ARCHIV IST MIT DRIN: Angeboten werden drei Sprachen, aber ein alter Link oder ein
 * Lead-Eintrag kann `it` tragen — dann ist „Italienisch" die richtige Auskunft und nicht
 * stillschweigend „Deutsch".
 */
export const SPRACHNAME: Record<string, string> = {
  de: "Deutsch", en: "Englisch", ro: "Rumänisch", es: "Spanisch",
  fr: "Französisch", it: "Italienisch", pt: "Portugiesisch",
};

/** Der Sprachname für den Auftragstext; unbekannt oder leer heisst Deutsch. */
export function sprachname(lang?: string): string {
  return SPRACHNAME[String(lang ?? "de").slice(0, 2).toLowerCase()] ?? "Deutsch";
}

export function isLang(v: string): v is Lang {
  return (LANGS as readonly string[]).includes(v);
}

export function langFromAccept(accept: string): Lang {
  for (const part of accept.toLowerCase().split(",")) {
    const code = part.trim().split(";")[0].slice(0, 2);
    if (isLang(code)) return code;
  }
  return "en";
}
