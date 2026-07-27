import { cookies, headers } from "next/headers";
import { LANG_COOKIE, isLang, langFromAccept, type Lang } from "@/lib/lang";

// SERVER-ONLY: `next/headers` darf nicht in den Client-Bundle wandern, deshalb liegt
// der Helfer getrennt von den Konstanten (die auch der Umschalter im Client braucht).

/** Die geltende Sprache: gewählt (Cookie) > Browsersprache > en. */
export async function resolveLang(): Promise<Lang> {
  const picked = (await cookies()).get(LANG_COOKIE)?.value ?? "";
  if (isLang(picked)) return picked;
  return langFromAccept((await headers()).get("accept-language") || "");
}
