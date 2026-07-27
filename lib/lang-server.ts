import { cookies } from "next/headers";
import { LANG_COOKIE, isLang, type Lang } from "@/lib/lang";

// SERVER-ONLY: `next/headers` darf nicht in den Client-Bundle wandern, deshalb liegt
// der Helfer getrennt von den Konstanten (die auch der Umschalter im Client braucht).

/**
 * Die geltende Sprache: ENGLISCH ist der Standard (Owner-Entscheidung 2026-07-27) —
 * die Browsersprache entscheidet NICHT mehr. Nur was der Nutzer im Umschalter wählt
 * (Cookie `lb_lang`) weicht davon ab. Grund: die Seite wird international beworben,
 * Englisch ist die Sprache, in der jeder Besucher landen soll.
 */
export async function resolveLang(): Promise<Lang> {
  const picked = (await cookies()).get(LANG_COOKIE)?.value ?? "";
  return isLang(picked) ? picked : "en";
}
