import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { portalPfade } from "@/lib/lakatosbandi-adressen";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";
import ArtistFair from "@/components/ArtistFair";

/**
 * ÜBER UNS — DIE HALTUNG, AN EINER ADRESSE (Owner 18.09.2026: „wir haben im Footer nicht einmal
 * ein About").
 *
 * Die Seite erfindet nichts Neues: Sie zeigt das Siegel gross und denselben Text, der auf der
 * Startseite unter den Werken steht (`philoTitel` / `philoText`) — eine Quelle, drei Sprachen.
 * Dazu die zwei Menschen dahinter und der Weg zum langen Artikel.
 *
 * WARUM ÜBERHAUPT: „Über uns" ist die Seite, die ein Käufer öffnet, bevor er zum ersten Mal Geld
 * schickt, und die ein Künstler öffnet, bevor er seine Werke hochlädt. Fehlt sie, fehlt die
 * Antwort auf „wer seid ihr denn?" — und das ist bei einem Versprechen wie unserem die Frage,
 * an der alles hängt.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const L = portalSprache(null, await resolveLang("ro"));
  const T = portalTexte(L);
  return { title: `${T.philoTitel} — lakatosbandi.com`, description: T.philoText.split("\n\n")[0].slice(0, 180) };
}

export default async function PortalUeberUns({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const L = portalSprache(sp.lang, await resolveLang("ro"));
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));

  const WEITER: Record<string, { artikel: string; wer: string }> = {
    en: { artikel: "Read the whole story", wer: "Behind lakatosbandi.com are two people: Geza Lakatos and Szidonia Bandi — she paints, he builds. We print, ship and pay the licence." },
    ro: { artikel: "Citește povestea întreagă", wer: "În spatele lakatosbandi.com sunt doi oameni: Geza Lakatos și Szidonia Bandi — ea pictează, el construiește. Noi tipărim, expediem și plătim licența." },
    de: { artikel: "Die ganze Geschichte lesen", wer: "Hinter lakatosbandi.com stehen zwei Menschen: Geza Lakatos und Szidonia Bandi — sie malt, er baut. Wir drucken, verschicken und zahlen die Lizenz." },
  };
  const W = WEITER[L] ?? WEITER.ro;

  return (
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} preise={P.preise} journal={P.journal(L)} />

      <main className="mx-auto w-full max-w-[720px] px-5 pb-20 pt-10 md:pt-16">
        <ArtistFair groesse={150} klasse="block text-[#111]" />
        <h1 className="m-0 mt-8 font-serif text-[36px] font-normal leading-[1.1] md:text-[48px]">{T.philoTitel}</h1>
        <div className="mt-6 space-y-5 text-[17px] leading-[1.7] text-[#333]">
          {T.philoText.split("\n\n").map((z, i) => <p key={i} className="m-0">{z}</p>)}
        </div>

        <p className="mt-10 border-t border-[#e5e5e5] pt-8 text-[16px] leading-[1.7] text-[#333]">{W.wer}</p>

        <Link href={`${P.journal(L, "artist-fair-stempel")}`}
          className="mt-6 inline-block rounded-full bg-[#111] px-5 py-2.5 text-[15px] font-semibold text-white no-underline hover:bg-[#333]">
          {W.artikel}
        </Link>
      </main>

      <PortalFuss lang={L} />
    </div>
  );
}
