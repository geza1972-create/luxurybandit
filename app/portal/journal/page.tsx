import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { JOURNAL_SPRACHEN, type JournalSprache } from "@/lib/lakatosbandi-journal";
import { portalPfade } from "@/lib/lakatosbandi-adressen";

/** `/journal` ohne Sprache → die erkannte Sprache (Englisch zuerst). Die Artikel liegen je Sprache unter eigener Adresse. */
export const dynamic = "force-dynamic";

export default async function JournalWeiche() {
  const erkannt = await resolveLang("en");
  const L: JournalSprache = (JOURNAL_SPRACHEN as string[]).includes(erkannt) ? (erkannt as JournalSprache) : "en";
  redirect(portalPfade((await headers()).get("host")).journal(L));
}
