import type { Metadata } from "next";
import { resolveLang } from "@/lib/lang-server";
import ArmeeLandingSeite from "@/components/ArmeeLandingSeite";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import { DEMO_KUNDE, armeeSpot, armeeTexte } from "@/lib/demo-armee";

/**
 * DIE ADRESSE OHNE SPRACHE — sie errät (dasselbe Muster wie `app/recruiting/page.tsx`).
 *
 * Wer sie ohne Angabe aufruft, bekommt die Sprache, die er gewählt hat, sonst die seines
 * Browsers, sonst Deutsch. Das ist der Eingang für alle, die den Link nicht von uns bekommen
 * haben. Zum WEITERGEBEN gibt es `/academy/de`, `/academy/ro` und `/academy/en` — dort steht
 * die Sprache fest und ist an der Adresse ablesbar (Owner 04.09.2026: „ich kann einzelne
 * Sprachen nicht sharen. Ich brauche die und rumänisch brauche ich auch").
 *
 * `?lang=` gilt weiter: Was vorher schon verschickt wurde, bleibt gültig.
 */

export const dynamic = "force-dynamic";

const spracheLesen = async (searchParams: Promise<Record<string, string | string[] | undefined>>) => {
  const sp = await searchParams;
  return String(sp.lang ?? "") || (await resolveLang("de"));
};

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sprache = await spracheLesen(searchParams);
  const T = armeeTexte(sprache);
  const bild = `${ACADEMY_DOMAIN}${armeeSpot(sprache).poster}`;
  const titel = `${T.claimEins} ${T.claimZwei} — ${DEMO_KUNDE.name}`;
  return {
    title: titel,
    description: T.lpSub,
    openGraph: {
      title: titel, description: T.lpSub, type: "website",
      siteName: DEMO_KUNDE.name, url: `${ACADEMY_DOMAIN}/academy`,
      images: [{ url: bild, width: 720, height: 1280 }],
    },
    twitter: { card: "summary_large_image", title: titel, description: T.lpSub, images: [bild] },
  };
}

export default async function ArmeeLanding({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ArmeeLandingSeite lang={await spracheLesen(searchParams)} />;
}
