/**
 * SPRACHE — eine Quelle für alle Seiten.
 *
 * STANDARD IST ENGLISCH. Nur die vom Nutzer GEWÄHLTE Sprache (Cookie `lb_lang`,
 * gesetzt vom Umschalter in der TopNav) weicht davon ab — die Browsersprache
 * entscheidet nicht. `langFromAccept` bleibt für Stellen, die bewusst die
 * Browsersprache lesen (z. B. Sprache einer E-Mail aus der Telefonvorwahl).
 */
/**
 * SIEBEN SPRACHEN — Polnisch ist raus (Owner 30.07.2026: „polnisch entfernen, brauchen wir
 * nicht"). Diese Liste ist die einzige Quelle: der Umschalter zeigt nur, was hier steht, und
 * `resolveLang` kann nichts anderes zurückgeben. Wo in älteren Sprachtabellen noch ein
 * `pl:`-Eintrag liegt, wird er dadurch nie mehr ausgewählt.
 */
export const LANGS = ["en", "de", "ro", "es", "fr", "pt", "it"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = {
  en: "English", de: "Deutsch", ro: "Română", es: "Español",
  fr: "Français", pt: "Português", it: "Italiano",
};

export const LANG_COOKIE = "lb_lang";

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
