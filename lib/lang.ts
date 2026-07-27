/**
 * SPRACHE — eine Quelle für alle Seiten.
 *
 * STANDARD IST ENGLISCH. Nur die vom Nutzer GEWÄHLTE Sprache (Cookie `lb_lang`,
 * gesetzt vom Umschalter in der TopNav) weicht davon ab — die Browsersprache
 * entscheidet nicht. `langFromAccept` bleibt für Stellen, die bewusst die
 * Browsersprache lesen (z. B. Sprache einer E-Mail aus der Telefonvorwahl).
 */
export const LANGS = ["en", "de", "ro", "es", "fr", "pt", "pl", "it"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = {
  en: "English", de: "Deutsch", ro: "Română", es: "Español",
  fr: "Français", pt: "Português", pl: "Polski", it: "Italiano",
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
