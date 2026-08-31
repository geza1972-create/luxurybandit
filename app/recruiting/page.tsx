import type { Metadata } from "next";
import { resolveLang } from "@/lib/lang-server";
import { recruitingTexte } from "@/lib/recruiting-i18n";
import RecruitingSeite from "@/components/RecruitingSeite";

/**
 * DIE ADRESSE OHNE SPRACHE — sie errät.
 *
 * Wer sie ohne Angabe aufruft, bekommt die Sprache, die er gewählt hat, sonst die seines
 * Browsers, sonst Deutsch. Das ist der Eingang für alle, die den Link nicht von uns bekommen
 * haben. Zum WEITERGEBEN gibt es `/recruiting/de`, `/recruiting/ro` und `/recruiting/en` —
 * dort steht die Sprache fest und ist an der Adresse ablesbar (Owner 31.08.2026: „ich
 * brauche unterschiedliche URLs für die Sprachen, weil ich diese weitergebe").
 *
 * `?lang=` gilt weiter: Was vorher schon verschickt wurde, bleibt gültig.
 */

const spracheLesen = async (searchParams?: Promise<Record<string, string | string[] | undefined>>) => {
  const sp = (await searchParams) ?? {};
  return String(sp.lang ?? "") || (await resolveLang("de"));
};

export async function generateMetadata({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const T = recruitingTexte(await spracheLesen(searchParams));
  return { title: `LB Recruiting — ${T.positionierung}`, description: T.lead };
}

export default async function RecruitingEingang({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <RecruitingSeite lang={await spracheLesen(searchParams)} />;
}
