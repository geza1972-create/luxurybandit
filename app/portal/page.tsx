import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { kuenstlerListe, imPortalSichtbar, portalPfade, werkKacheln } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalBald from "@/components/PortalBald";
import PortalFuss from "@/components/PortalFuss";
import { ARTIKEL, JOURNAL_UI, type JournalSprache } from "@/lib/lakatosbandi-journal";
import { baldTexte } from "@/lib/lakatosbandi-bald-texte";
import { eur, VERSUSFORGE_ABO_CENTS } from "@/lib/pricing";
import { preisAnzeige } from "@/lib/lakatosbandi-preis";
import PreisLabel from "@/components/PreisLabel";
import PortalBesuchMelden from "@/components/PortalBesuchMelden";

/**
 * DIE STARTSEITE VON LAKATOSBANDI.COM (Owner 10.09.2026: „lakatosbandi.com ist das Portal … eine
 * Marketing-Plattform für Künstler" · „nicht Bilder, sondern Hooks" · Stil wie artsy.net).
 *
 * WEISS, SCHWARZE SCHRIFT, VIEL LUFT — die einzige Farbe sind die Werke. Jedes Werk steht als
 * Hook-Kachel da: das Werk oben, ganz und unbeschnitten, sein Satz darunter, dann der Künstler.
 *
 * ES ERSCHEINT NUR, WER ZWEI JA HAT: die Freigabe durch den Owner (`freigabe: "frei"`) UND sein
 * eigenes „Ja, ins Portal" im Chat (`portal: true`). Ohne das zweite Ja hat er trotzdem seine
 * Seite lakatosbandi.com/{name} — nur nicht in dieser Übersicht.
 *
 * ── „BALD ONLINE", SOLANGE ES WENIGE SIND (Owner 10.09.2026: „wir müssen uns mit dem Portal noch
 * was einfallen lassen, bis einige Künstler da sind" · entschieden: „wir sagen, wir starten bald
 * … und dass wir gerade Künstler rekrutieren") ─────────────────────────────────────────────────
 *
 * KEINE DEMO-KÜNSTLER: Ein Käufer, der nach einem erfundenen Werk fragt, glaubt uns danach nichts
 * mehr. Unter `START_AB` freigegebenen Künstlern sagt die Seite ehrlich, dass sie bald startet,
 * und ruft Künstler auf; wer schon freigegeben ist, steht als „erste Künstler" darunter. Ab
 * `START_AB` wird sie von selbst zur normalen Übersicht — niemand muss etwas umschalten.
 *
 * Auf lakatosbandi.com liegt sie an der Wurzel (Rewrite in next.config.mjs), sonst unter /portal.
 */
export const dynamic = "force-dynamic";

/** Ab so vielen sichtbaren Künstlern ist das Portal „offen" statt „bald online". */
const START_AB = 6;

export const metadata: Metadata = {
  title: "lakatosbandi.com — Marketing for Art",
  description: "The marketing platform for artists: ads for every work with the sentence that explains what makes it rare — and an agent that talks to buyers for you.",
  alternates: { canonical: "https://lakatosbandi.com/" },
  openGraph: { title: "lakatosbandi.com — Marketing for Art", type: "website", url: "https://lakatosbandi.com/" },
};

export default async function PortalStart({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const L = portalSprache(sp.lang, await resolveLang("en"));
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const kuenstler = await kuenstlerListe(imPortalSichtbar);
  /* Je Künstler seine erste Kachel — die Übersicht zeigt Künstler, seine Seite zeigt alle Werke. */
  const kacheln = kuenstler
    .map(m => ({ m, k: werkKacheln(m)[0] }))
    .filter((x): x is { m: typeof kuenstler[number]; k: { hook: string; i: number } } => !!x.k);
  const bald = kacheln.length < START_AB;
  /* Die Bewerbung ist das Gespräch mit dem Künstler-Agenten, in seiner Sprache — auf lakatosbandi.com/start, nicht
     auf versusforge.com (Owner 11.09.2026: „du musst schauen, wo die Seite angelegt wird. Nicht auf VersusForge"). */
  const bewerben = `https://lakatosbandi.com/start?lang=${L}`;

  const raster = (
    <ul className="mt-8 grid list-none grid-cols-1 gap-x-8 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {kacheln.map(({ m, k }) => (
        <li key={m.kennung}>
          <Link href={P.kuenstler(m.kennung)} className="group block text-inherit no-underline">
            <div className="flex aspect-[4/5] items-start justify-end bg-[#f5f5f5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={P.werkBild(m.kennung, k.i)} alt={m.name} loading="lazy"
                className="max-h-full max-w-full object-contain" />
            </div>
            <p className="mt-4 text-[17px] font-semibold leading-[1.35] group-hover:underline">{k.hook}</p>
            <p className="mt-2 text-[14px] text-[#555]">{m.name}{m.ort ? ` · ${m.ort}` : ""}</p>
            {/* Der Preis als Label, wenn der Künstler ihn zeigen will (Owner 11.09.2026: „der Preis braucht ein Label überall"). */}
            {(() => {
              const w = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
              const preis = w?.preisZeigen ? preisAnzeige(w.preis) : "";
              return preis ? <p className="mt-2"><PreisLabel>{preis}</PreisLabel></p> : null;
            })()}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      {/* „SEITE GESEHEN" — genau hierhin führen die Anzeigen (Owner 11.09.2026). Egal ob „bald" oder
          schon offen: beide Zustände sind ein echter Besuch. */}
      <PortalBesuchMelden />
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />

      {bald ? (
        <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-14 md:pt-24">
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#777]">{T.baldKicker}</p>
          <h1 className="m-0 mt-4 max-w-[820px] font-serif text-[38px] font-normal leading-[1.1] tracking-[-0.01em] md:text-[60px]">{T.baldTitel}</h1>
          <p className="mt-6 max-w-[640px] text-[17px] leading-[1.6] text-[#555]">{T.baldLead}</p>
          <a href={bewerben}
            className="mt-9 inline-block bg-[#111] px-7 py-4 text-[16px] font-semibold text-white no-underline hover:bg-[#333]">
            {T.baldKnopf}
          </a>
          <p className="mt-4 text-[14px] text-[#777]">{T.baldFein}</p>

          {kacheln.length > 0 && (
            <section className="mt-20 border-t border-[#e5e5e5] pt-10">
              <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.ersteKuenstler}</h2>
              {raster}
            </section>
          )}

          {/* Warum, was, wie, Auswahl, Kosten (Owner: „sagen wieso, weshalb, warum"). */}
          <PortalBald B={baldTexte(L)} preis={eur(VERSUSFORGE_ABO_CENTS, L)} bewerben={bewerben} knopf={T.baldKnopf} />
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-10 md:pt-16">
          <h1 className="m-0 max-w-[720px] font-serif text-[34px] font-normal leading-[1.15] tracking-[-0.01em] md:text-[48px]">{T.titel}</h1>
          <p className="mt-4 max-w-[620px] text-[16px] leading-[1.55] text-[#555]">{T.lead}</p>
          <div className="mt-4">{raster}</div>

          <section className="mt-20 border-t border-[#e5e5e5] pt-10">
            <h2 className="m-0 text-[22px] font-semibold">{T.fuerKuenstler}</h2>
            <p className="mt-2 text-[16px] text-[#555]">{T.fuerKuenstlerText}</p>
            <a href={bewerben}
              className="mt-5 inline-block border border-[#111] px-6 py-3 text-[15px] font-semibold text-[#111] no-underline hover:bg-[#111] hover:text-white">
              {T.fuerKuenstlerKnopf}
            </a>
          </section>
        </main>
      )}

      {/* AUS DEM JOURNAL — interne Links für Google, und auf dem Handy der Weg zum Journal
          (dort steht es nicht im Kopf). */}
      <section className="mx-auto w-full max-w-[1120px] border-t border-[#e5e5e5] px-5 pb-16 pt-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="m-0 font-serif text-[28px] font-normal md:text-[36px]">Journal</h2>
          <Link href={P.journal(L)} className="text-[15px] font-semibold text-[#111] underline">{JOURNAL_UI[L as JournalSprache]?.zurueck ?? "All articles"}</Link>
        </div>
        <ul className="mt-8 grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-3">
          {ARTIKEL.slice(0, 3).map(a => (
            <li key={a.slug}>
              <Link href={P.journal(L, a.slug)} className="group block text-inherit no-underline">
                <span className="block font-serif text-[21px] leading-[1.3] group-hover:underline">{a.texte[L as JournalSprache].titel}</span>
                <span className="mt-2 block text-[14.5px] leading-[1.55] text-[#666]">{a.texte[L as JournalSprache].beschreibung}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <PortalFuss lang={L} />

      {/* Hier ging bis 11.09.2026 der Anmelde-Chat für Künstler von selbst auf (Owner 10.09.2026) — raus (Owner 11.09.2026:
          „soll nicht sein"). Künstler kommen über „Als Künstler bewerben" zu lakatosbandi.com/start. */}
    </div>
  );
}
