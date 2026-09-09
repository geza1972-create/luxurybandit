import type { Metadata } from "next";
import VersusForgeStartEinfach from "@/components/VersusForgeStartEinfach";
import { versusforgeInSprache } from "@/lib/versusforge-texte";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";

/**
 * VERSUSFORGE ALS TOPIC AUF LUXURYBANDIT (Owner 08.09.2026: „VersusForge ist die Engine von
 * LuxuryBandit. Ich werde sie als Topic einbauen auf LuxuryBandit. Die Leute bekommen aber
 * den Tunnel von VersusForge").
 *
 * WARUM DAS DIE RICHTIGE ENTSCHEIDUNG IST, und zwar heute: versusforge.com liefert noch die
 * alte Seite aus, luxurybandit.com läuft. Als Topic braucht die Anzeige keine neue Domain,
 * kein DNS, keinen zweiten Aufbau von Vertrauen — sie zeigt auf ein Haus, das steht.
 *
 * DIE MARKE BLEIBT TROTZDEM GANZ: Ab dem Klick sieht niemand mehr LuxuryBandit. Diese Seite
 * rendert exakt dieselbe Landingpage wie versusforge.com — schwarzer Grund, eigene Wortmarke,
 * eigener Trichter. Das Topic ist die Tür, nicht die Verkleidung.
 *
 * EINE QUELLE FÜR BEIDE WEGE: `components/VersusForgeStart.tsx` wird hier und in `app/page.tsx`
 * (Domain-Weiche) mit denselben Texten aufgerufen. Eine zweite Fassung dieser Seite wäre die
 * Stelle, an der in vier Wochen zwei verschiedene Hooks stünden.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — deine Anzeige, deine Strecke, deine Anfragen",
  description:
    "Sag in einem Satz, was du anbietest — oder zeig deine Website. Du bekommst den Hook und die Strecke dahinter. Die erste Analyse kostet nichts.",
  alternates: { canonical: "/themes/versusforge" },
};

export default async function VersusForgeTopicSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const einer = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");
  const L: Lang = isLang(einer(sp.lang)) ? (einer(sp.lang) as Lang) : await resolveLang("de");
  /* `probe` schaltet auf der Landingpage den Weg frei, der sonst der Domain vorbehalten ist —
     hier gilt er immer, denn dieser Pfad IST der reguläre Eingang. */
  const S = await versusforgeInSprache(L);
  /**
   * NUR NOCH DIE EINFACHE FASSUNG (Owner 09.09.2026: „localhost:3000/themes/versusforge —
   * das muss weg").
   *
   * Die alte Seite hatte sechs Abschnitte, den Spot, die Argumentenliste, den Versus-Block
   * und ein Beispiel-Dashboard — alles vor dem Knopf. Sie war heute Vormittag noch der
   * Vergleichsstand; ab jetzt gibt es nur einen.
   *
   * `VersusForgeStart.tsx` bleibt vorerst im Repo, hängt aber an nichts mehr.
   */
  return <VersusForgeStartEinfach S={S} lang={L} probe basis="/themes/versusforge" />;
}
