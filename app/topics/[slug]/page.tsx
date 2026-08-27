import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SpracheAmDokument from "@/components/SpracheAmDokument";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { Knopf } from "@/components/CI";
import TopicBeacon from "@/components/TopicBeacon";
import { resolveLang } from "@/lib/lang-server";
import { zielgruppe, alleZielgruppenSlugs } from "@/lib/lebenslauf-zielgruppen";
import { zielgruppeInSprache } from "@/lib/lebenslauf-uebersetzen";

/**
 * DIE ZIELGRUPPEN-LANDINGPAGE `/topics/<slug>` (Owner-Auftrag 26.08.2026,
 * KONZEPT-JOB-MATCH-TRICHTER.md Baustelle H) — ERSTE Zielgruppe: `german-speakers`.
 * Anders als der Trichter selbst (der `noindex` bleibt) ist DIESE Seite absichtlich
 * indexierbar: sie ist ihr eigener Suchanlass, kein Zwischenschritt.
 *
 * Der CTA führt IMMER in denselben Trichter, Tür 2 (`?jobs=1`) — kein zweiter Trichter,
 * keine Kopie der Funnel-Logik (Owner: „Do not duplicate funnel logic"). Der Backend-
 * Trichter bleibt berufsoffen; diese Seite ist nur EINE von künftig mehreren Türen.
 */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const z = zielgruppe(slug);
  if (!z) return {};
  return {
    title: z.metaTitel,
    description: z.metaBeschreibung,
    // Bewusst KEIN robots:noindex — anders als der Trichter selbst ist diese Seite der
    // Suchanlass (Baustelle H).
  };
}

export default async function ZielgruppenSeite({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const roh = zielgruppe(slug);
  if (!roh) notFound();

  const L = await resolveLang("ro");
  const z = await zielgruppeInSprache(roh, L);
  const trichterZiel = `/themes/lebenslauf/start?jobs=1&topic=${encodeURIComponent(slug)}`;
  const anzeigeZiel = `/themes/lebenslauf/start?topic=${encodeURIComponent(slug)}`;

  return (
    <main className="lb-bg lb-zentrale min-h-screen text-white">
      <SpracheAmDokument lang={L} />
      <TopicBeacon slug={slug} />
      {/* „LB - Jobs / Jobs mit Deutsch" — der KANDIDATEN-Auftritt (einfache Fassung im
          Konzept: „AI Recruiting" ist der Firmen-Auftritt; Kandidaten suchen Jobs, keine
          Recruiter). Logo-Klick bleibt auf DIESER Landingpage — sie ist das Zuhause des
          Topics, nicht der Bewerbungszentrale. */}
      <TopNav marke="LB - Jobs" heim={`/topics/${slug}`} motto="Jobs mit Deutsch" />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3 md:max-w-[760px]">
        <Kicker>{z.kicker}</Kicker>
        <H1 className="mt-1">{z.titel}</H1>
        <p className="mt-3 text-[15px] font-medium leading-snug text-white/80">{z.unterzeile}</p>
        {/* DIE ZEILE UNTER DER UNTERZEILE — hier stand „Kein Lebenslauf nötig" als USP.
            RAUS (Owner 26.08.2026: „mach keine Werbung ohne CV"): Der Trichter zählt einen
            fehlenden Lebenslauf inzwischen als mehrere Minuspunkte, weil eine Firma nichts
            nachprüfen kann. Womit man wirbt, muss das Produkt auch halten. */}
        <p className="mt-2 text-[14px] font-bold leading-snug text-[#f6cf51]">{z.ohneCvZeile}</p>

        <div className="mt-4">
          <Knopf art="gold" href={trichterZiel}>{z.heroCta}</Knopf>
        </div>
        <a href={anzeigeZiel}
          className="mt-2.5 text-center text-[11.5px] font-black uppercase tracking-[0.12em] text-white/45 transition hover:text-white/80">
          {z.habeAnzeigeLink}
        </a>
        {/* DER CLAIM (Owner-Wortlaut): leise unter dem Einstieg, wie eine Unterschrift. */}
        <p className="mt-5 text-center font-serif text-[13px] font-bold tracking-[0.04em] text-white/55">{z.claim}</p>

        {!!z.beispielRollen.length && (
          <div className="mt-6 flex flex-wrap gap-2">
            {z.beispielRollen.map(r => (
              <span key={r} className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11.5px] font-bold text-white/75">{r}</span>
            ))}
          </div>
        )}

        <div className="lb-karte mt-6 flex flex-col gap-2 rounded-[20px] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
          <p className="text-[15px] font-black">{z.szenarioTitel}</p>
          <p className="text-[13.5px] font-medium leading-[1.6] opacity-85">{z.szenarioText}</p>
        </div>

        {!!z.faq.length && (
          <div className="mt-8 flex flex-col gap-4">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">FAQ</p>
            {z.faq.map(f => (
              <div key={f.frage}>
                <p className="text-[14px] font-black text-white/90">{f.frage}</p>
                <p className="mt-1 text-[13px] font-medium leading-snug text-white/70">{f.antwort}</p>
              </div>
            ))}
          </div>
        )}

        {/* DIE BEWERBUNGSZENTRALE-BAUSTEINE SIND RAUS (Owner 26.08.2026, nach dem
            Live-Test: „Deine Bewerbungszentrale ist zu viel auf dieser Seite. … Die
            Seiten dürfen nicht tausend Sachen, alte Reste beinhalten"). Diese Seite
            gehört dem Jobs-Produkt: Frage, Einstieg, Rollen, Szenario, FAQ — Schluss. */}
      </div>
      <SeitenFuss marke="LB - Jobs" />
    </main>
  );
}

export async function generateStaticParams() {
  return alleZielgruppenSlugs().map(slug => ({ slug }));
}
