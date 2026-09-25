import type { Metadata } from "next";
import LandingSeite from "@/components/LandingSeite";
import { SectionTitle, Lead } from "@/components/Landing";
import { Knopf } from "@/components/CI";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { notFound } from "next/navigation";
import { isLang, type Lang } from "@/lib/lang";
import { eur, VERSUSFORGE_ABO_CENTS } from "@/lib/pricing";
import { ART_SPRACHEN, artLandingInSprache } from "@/lib/versusforge-art-landing-texte";

/**
 * DIE LANDINGPAGE „VERSUSFORGE · MARKETING FOR ART" (Owner 10.09.2026: „normalerweise haben
 * wir eine Landingpage dazu, die für SEO gemacht ist" — nachdem die Karte im Katalog direkt
 * in den Chat führte).
 *
 * ── DIE AUFTEILUNG, WIE BEI DAVID ─────────────────────────────────────────────────────────
 *
 *  · `/themes/versusforge/en|ro|de` — diese Seite, je Sprache eine Adresse. Wird gefunden
 *                            (Google, geteilte Links, Katalog). `/themes/versusforge` ohne
 *                            Sprache leitet auf die erkannte Sprache weiter.
 *  · `/engine`             — der Chat. Ziel der Anzeigen: Wer von einer Anzeige kommt, soll
 *                            sofort anfangen, nicht noch eine Seite lesen.
 *
 * Bis heute leitete `next.config.mjs` diese Adresse auf `/engine` um (Umzug vom 09.09.). Jetzt
 * gehen nur noch die alten Unterpfade `plan` und `start` dorthin.
 *
 * ── KEIN FORMULAR AUF DER SEITE (Landingpage.md §8) ───────────────────────────────────────
 *
 * Was der Künstler TUT — Bilder zeigen, Preis besprechen —, passiert hinter dem Knopf im Chat.
 * Die Karte zeigt das Logo statt eines Videos: Es gibt noch keins, und ein geliehenes würde
 * etwas versprechen, das dieses Produkt nicht liefert.
 *
 * ── ENGLISCH ZUERST (Owner 10.09.2026: „alles muss mit Englisch anfangen, dann Rumänisch und
 * Deutsch") ─────────────────────────────────────────────────────────────────────────────────
 *
 * Rückfall-Sprache ist Englisch, der Umschalter kennt nur diese drei. Die Texte sind deutsche
 * Quelle (lib/versusforge-art-landing-texte.ts) und werden übersetzt.
 */

export const dynamic = "force-dynamic";

const SPRACHEN = ART_SPRACHEN;

type Params = { params: Promise<{ lang: string }> };

const gueltig = (l: string): l is Lang => isLang(l) && ART_SPRACHEN.includes(l);

/* JE SPRACHE EIGENE ADRESSE, EIGENER TITEL (Owner 10.09.2026: „ich würde alle drei scannen von
   Google · URLs sind wichtig mit /de"). `languages` sagt Google, dass es DIESELBE Seite in drei
   Sprachen ist — sonst wären es drei Seiten, die gegeneinander antreten. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!gueltig(lang)) return {};
  const T = await artLandingInSprache(lang);
  /* Nur die ersten zwei Sätze („Du malst. Das Portal verkauft." — seit 25.09.2026 zwei Sätze): Der Übersetzer hängt sonst schon mal die Unterzeile an (rumänisch
     gesehen, 10.09.2026) — ein Tab-Titel mit drei Zeilen schneidet Google ohnehin ab. */
  const titel = `${T.h1a} ${T.h1y} ${T.h1b}`.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/).slice(0, 2).join(" ");
  return {
    title: `VersusForge · Portal for Artists — ${titel}`,
    description: T.sub,
    alternates: {
      canonical: `/themes/versusforge/${lang}`,
      languages: { ...Object.fromEntries(ART_SPRACHEN.map(l => [l, `/themes/versusforge/${l}`])), "x-default": "/themes/versusforge/en" },
    },
    openGraph: {
      title: `VersusForge · Portal for Artists — ${titel}`,
      description: T.sub,
      type: "website",
      url: `/themes/versusforge/${lang}`,
      images: [{ url: "/VersusForge/Logo-VersusForge.JPG", width: 640, height: 640 }],
    },
  };
}

export default async function VersusForgeArtLanding({ params }: Params) {
  const { lang } = await params;
  if (!gueltig(lang)) notFound();
  const L: Lang = lang;
  const T = await artLandingInSprache(L);
  const preis = eur(VERSUSFORGE_ABO_CENTS, L);
  /* Der Chat liegt auf dem Portal (Owner 11.09.2026: „nicht auf VersusForge") — direkt dorthin,
     statt über die Weiterleitung von `/engine`. Mit `?lang=` entfällt dort die Sprachfrage. */
  const start = `https://lakatosbandi.com/start?lang=${L}`;

  const schritte = [
    { t: T.schritt1t, d: T.schritt1d },
    { t: T.schritt2t, d: T.schritt2d },
    { t: T.schritt3t, d: T.schritt3d },
    { t: T.schritt4t, d: T.schritt4d },
  ];
  const fragen = [
    { q: T.f1q, a: T.f1a }, { q: T.f2q, a: T.f2a }, { q: T.f3q, a: T.f3a },
    { q: T.f4q, a: T.f4a }, { q: T.f7q, a: T.f7a }, { q: T.f5q, a: T.f5a }, { q: T.f6q, a: T.f6a },
  ];

  /* DIE HÄUFIGEN FRAGEN AUCH FÜR GOOGLE (schema.org FAQPage) — derselbe Text wie sichtbar,
     sonst wertet Google es als verstecktes Markup. */
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: fragen.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <LandingSeite
      trackEvent="versusforge_art_view" trackId="themes-versusforge" trackName="VersusForge-Kunst"
      marke="VersusForge" heim={`/themes/versusforge/${L}`} motto="Marketing for Art" lang={L}
      sprachen={SPRACHEN} sprachePfad
      heroA={T.h1a} heroY={T.h1y} heroB={T.h1b}
      kinder={<>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />

        {/* DIE KARTE — Logo und der EINE goldene Knopf der Seite (Skill `ci-design`). */}
        <div className="lb-karte relative mt-5 overflow-hidden rounded-[20px] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CornerOrnaments />
          <div className="lb-karte-rahmen pointer-events-none absolute inset-[8px] rounded-[14px]" />
          <div className="relative">
            <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.24em]">{T.kicker}</p>
            <DividerOrnament className="mt-2" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/VersusForge/Logo-VersusForge.JPG" alt="VersusForge" width={640} height={640}
              className="mx-auto mt-3 aspect-square w-full max-w-[320px] rounded-[14px] object-cover" />
            <div className="mt-4">
              <Knopf art="gold" href={start}>{T.cta}</Knopf>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[12.5px] font-semibold text-white/60">{T.trust}</p>

        <p className="mt-6 text-[15px] font-semibold leading-snug text-white/85">{T.sub}</p>

        {/* DIE MODULE DES PORTALS — sechs Kacheln, dasselbe Muster wie bei David (Owner 25.09.2026:
            „hier werden alle Module, die VersusForge entwickelt hat"). */}
        <div className="lb-karte relative mt-10 overflow-hidden rounded-[20px] px-4 pb-4 pt-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <CornerOrnaments />
          <div className="lb-karte-rahmen pointer-events-none absolute inset-[8px] rounded-[14px]" />
          <div className="relative">
            <h2 className="lb-karte-gold m-0 text-center text-[10px] font-black uppercase tracking-[0.24em]">{T.merkmaleTitel}</h2>
            <DividerOrnament className="mt-2" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[{ t: T.m1t, d: T.m1d }, { t: T.m2t, d: T.m2d }, { t: T.m3t, d: T.m3d }, { t: T.m4t, d: T.m4d }, { t: T.m5t, d: T.m5d }, { t: T.m6t, d: T.m6d }].map((m, i) => (
                <div key={i} className="lb-karte-news rounded-[12px] px-2.5 py-2">
                  <span className="lb-karte-gold text-[10.5px] font-black">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="m-0 mt-0.5 text-[12px] font-black leading-snug">{m.t}</h3>
                  <p className="mt-0.5 text-[10.5px] font-medium leading-snug opacity-70">{m.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="mt-12">
          <SectionTitle>{T.s1t}</SectionTitle>
          <Lead>{T.s1p1}</Lead>
          <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">{T.s1p2}</p>
        </section>

        <section className="mt-12">
          <SectionTitle>{T.s2t}</SectionTitle>
          <ol className="mt-4 list-none space-y-4 p-0">
            {schritte.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[1px] text-[13px] font-black text-[#f6cf51]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="m-0 text-[15px] font-black leading-snug text-white">{s.t}</h3>
                  <p className="mt-1 text-[14px] font-medium leading-relaxed text-white/75">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <SectionTitle>{T.portalT}</SectionTitle>
          <Lead>{T.portalP1}</Lead>
          {/* Der Name steht fest, nicht aus der Übersetzung — ein Domainname hat keine Sprache. */}
          <p className="mt-3 border-l-2 border-[#f6cf51]/50 pl-3 text-[18px] font-black leading-snug text-white">
            <a href={`https://lakatosbandi.com/?lang=${L}`} className="text-white underline decoration-[#f6cf51]/60 underline-offset-4">lakatosbandi.com</a>
          </p>
          <Lead>{T.portalP2}</Lead>
        </section>

        <section className="mt-12">
          <SectionTitle>{T.s3t}</SectionTitle>
          <Lead>{T.s3p1}</Lead>
          <Lead>{T.s3p2}</Lead>
        </section>

        <section className="mt-12">
          <SectionTitle>{T.s4t}</SectionTitle>
          <Lead>{T.s4p1}</Lead>
          <p className="mt-4 border-l-2 border-[#f6cf51]/50 pl-3 text-[15px] font-black leading-snug text-white">
            {T.s4p2.replace(/\{[^}]*\}/, preis)}
          </p>
          <Lead>{T.s4p3}</Lead>
        </section>

        <section className="mt-12">
          <SectionTitle>{T.faqTitel}</SectionTitle>
          <div className="mt-4 space-y-2">
            {fragen.map((f, i) => (
              <details key={i} className="rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <summary className="cursor-pointer text-[14.5px] font-black leading-snug text-white">{f.q}</summary>
                <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/75">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionTitle>{T.schlussT}</SectionTitle>
          <Lead>{T.schlussP}</Lead>
          <div className="mt-4">
            <Knopf art="umriss" href={start}>{T.cta}</Knopf>
          </div>
        </section>
      </>}
    />
  );
}
