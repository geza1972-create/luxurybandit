import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, type Lang } from "@/lib/lang";

// SERVER-ONLY: `next/headers` darf nicht in den Client-Bundle wandern, deshalb liegt
// der Helfer getrennt von den Konstanten (die auch der Umschalter im Client braucht).

/**
 * Die geltende Sprache, in dieser Reihenfolge:
 *   1. was der Nutzer im Umschalter gewählt hat (Cookie `lb_lang`)
 *   2. die Sprache seines Browsers, wenn wir sie sprechen
 *   3. Englisch
 *
 * ACHTUNG, das ist eine UMKEHR: Am 27.07.2026 hatte der Owner entschieden, dass die
 * Browsersprache NICHT mehr entscheidet und jeder auf Englisch landet. Am 30.07.2026 hat er
 * es zurückgenommen („die Sprachen sollen auch aktiv sein und auch browserabhängig") — die
 * Anzeigen laufen inzwischen in Rumänien, Deutschland, Italien, Spanien, Frankreich, Portugal
 * und Polen, und wer dort in seiner Sprache ankommt, bleibt eher.
 *
 * Der Umschalter sticht die Browsersprache immer: eine getroffene Wahl wiegt schwerer als
 * eine Vermutung.
 */
export async function resolveLang(): Promise<Lang> {
  const picked = (await cookies()).get(LANG_COOKIE)?.value ?? "";
  if (isLang(picked)) return picked;

  try {
    const { headers } = await import("next/headers");
    const roh = (await headers()).get("accept-language") ?? "";
    // "de-DE,de;q=0.9,en;q=0.8" → der erste Eintrag, den wir sprechen, gewinnt.
    for (const teil of roh.split(",")) {
      const code = teil.split(";")[0].trim().slice(0, 2).toLowerCase();
      if (isLang(code)) return code;
    }
  } catch { /* ohne Kopfzeile bleibt es bei Englisch */ }

  return "en";
}
