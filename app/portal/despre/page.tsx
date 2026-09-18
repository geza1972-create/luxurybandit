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

  /**
   * ── WER DAHINTERSTEHT, AUSGESCHRIEBEN (Owner 18.09.2026: „bei despre steht sehr wenig. Es muss
   * über uns, die Founder, stehen, es muss über VersusForge stehen, dass es von denen gemacht ist
   * und die ganzen AI-Module programmiert hat") ──────────────────────────────────────────────
   *
   * Drei Absätze, nicht drei Zeilen: die zwei Menschen, das Haus dahinter, und was an dieser
   * Seite selbst gebaut ist. Wer einem Shop zum ersten Mal Geld schickt, will wissen, wem.
   */
  const WEITER: Record<string, { artikel: string; werTitel: string; wer: string[]; hausTitel: string; haus: string[] }> = {
    en: {
      artikel: "Read the whole story",
      werTitel: "The two of us",
      wer: [
        "lakatosbandi.com is made by two people. Szidonia Bandi paints — figurative work, mostly from the Mediterranean, and her pieces are on this site like everyone else's. Geza Lakatos builds the software: the funnels, the agents, the print pipeline, this page.",
        "We are not a gallery and not a marketplace with a hundred employees. When you write to us, one of us two answers.",
      ],
      hausTitel: "Built by VersusForge",
      haus: [
        "The technology behind this site comes from VersusForge, our own software house. Everything here is built in-house and runs in production, not bought as a plugin: the artist agent that talks to buyers, the descriptions written by our marketing algorithm, the image analysis, the voice and video module, the print-file generator, the checkout and the shipping mails.",
        "That is why we can promise the Artist Fair seal in the first place: the licence to the artist is not a policy on a page, it is a line of code in the same system that takes the payment.",
      ],
    },
    ro: {
      artikel: "Citește povestea întreagă",
      werTitel: "Noi doi",
      wer: [
        "lakatosbandi.com e făcut de doi oameni. Szidonia Bandi pictează — lucrări figurative, inspirate mai ales din zona mediteraneană, iar lucrările ei stau pe acest site ca ale oricui altcuiva. Geza Lakatos construiește software-ul: pâlniile, agenții, fluxul de tipar, pagina asta.",
        "Nu suntem galerie și nici un marketplace cu o sută de angajați. Când ne scrii, îți răspunde unul dintre noi doi.",
      ],
      hausTitel: "Construit de VersusForge",
      haus: [
        "Tehnologia din spatele acestui site vine de la VersusForge, casa noastră de software. Tot ce vezi aici e construit de noi și rulează în producție, nu cumpărat ca plugin: agentul artistului care vorbește cu cumpărătorii, descrierile scrise cu algoritmul nostru de marketing, analiza imaginilor, modulul de voce și video, generatorul fișierelor de tipar, casa de marcat și mailurile de livrare.",
        "De aceea putem promite sigiliul Artist Fair: licența către artist nu e o declarație pe o pagină, e o linie de cod în același sistem care încasează banii.",
      ],
    },
    de: {
      artikel: "Die ganze Geschichte lesen",
      werTitel: "Wir zwei",
      wer: [
        "lakatosbandi.com machen zwei Menschen. Szidonia Bandi malt — figurative Arbeiten, meist aus dem Mittelmeerraum, und ihre Werke stehen auf dieser Seite wie die aller anderen. Geza Lakatos baut die Software: die Trichter, die Agenten, die Druckstrecke, diese Seite.",
        "Wir sind keine Galerie und kein Marktplatz mit hundert Angestellten. Wer uns schreibt, bekommt Antwort von einem von uns beiden.",
      ],
      hausTitel: "Gebaut von VersusForge",
      haus: [
        "Die Technik hinter dieser Seite kommt von VersusForge, unserem eigenen Softwarehaus. Alles hier ist selbst gebaut und im Betrieb, nicht als Baustein zugekauft: der Künstler-Agent, der mit Käufern spricht, die Beschreibungen aus unserem Marketing-Algorithmus, die Bildanalyse, das Stimm- und Videomodul, der Erzeuger der Druckdateien, die Kasse und die Versandmails.",
        "Deshalb können wir das Siegel „Artist Fair“ überhaupt versprechen: Die Lizenz an den Künstler ist keine Absichtserklärung auf einer Seite, sondern eine Zeile Code in demselben System, das das Geld einnimmt.",
      ],
    },
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

        <section className="mt-12 border-t border-[#e5e5e5] pt-8">
          <h2 className="m-0 font-serif text-[26px] font-normal leading-[1.2]">{W.werTitel}</h2>
          <div className="mt-4 space-y-4 text-[16px] leading-[1.7] text-[#333]">
            {W.wer.map((z, i) => <p key={i} className="m-0">{z}</p>)}
          </div>
        </section>

        <section className="mt-10 border-t border-[#e5e5e5] pt-8">
          <h2 className="m-0 font-serif text-[26px] font-normal leading-[1.2]">{W.hausTitel}</h2>
          <div className="mt-4 space-y-4 text-[16px] leading-[1.7] text-[#333]">
            {W.haus.map((z, i) => <p key={i} className="m-0">{z}</p>)}
          </div>
        </section>

        <Link href={`${P.journal(L, "artist-fair-stempel")}`}
          className="mt-6 inline-block rounded-full bg-[#111] px-5 py-2.5 text-[15px] font-semibold text-white no-underline hover:bg-[#333]">
          {W.artikel}
        </Link>
      </main>

      <PortalFuss lang={L} />
    </div>
  );
}
