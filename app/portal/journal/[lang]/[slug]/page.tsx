import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ARTIKEL, JOURNAL_SPRACHEN, JOURNAL_UI, artikelFinden, lesezeit, type JournalSprache } from "@/lib/lakatosbandi-journal";
import { portalPfade, PORTAL_URL } from "@/lib/lakatosbandi-adressen";
import { portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import ArtistFair from "@/components/ArtistFair";
import PortalFuss from "@/components/PortalFuss";
import PosterProdukt from "@/components/PosterProdukt";
import { FilmFolie } from "@/components/PosterRaeume";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { werkKacheln } from "@/lib/lakatosbandi";
import { aboAktiv } from "@/lib/versusforge-abo";

/**
 * EIN ARTIKEL — lakatosbandi.com/journal/<sprache>/<slug>.
 *
 * FÜR GOOGLE: eigene Adresse je Sprache, `hreflang` auf die beiden anderen, schema.org `Article`.
 * FÜR DEN LESER: ruhig lesbar (Serif, 680 px Spalte), am Ende der Merksatz und der  * Bewerbung als Künstler — der Grund, warum es das Journal gibt.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; slug: string }> };
const gueltig = (l: string): l is JournalSprache => (JOURNAL_SPRACHEN as string[]).includes(l);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const a = artikelFinden(slug);
  if (!gueltig(lang) || !a) return {};
  const t = a.texte[lang];
  /**
   * ── DIE VORSCHAU MIT EINER VERSION (Owner 16.09.2026: „bild fehlt" beim Teilen) ──────────
   *
   * Facebook merkt sich die Vorschau eines Links beim ersten Aufruf — auch wenn damals noch
   * kein Bild dalag. Danach zeigt es für immer die graue Kachel, egal was auf dem Server steht.
   * Das Datum des Artikels in der Adresse macht daraus eine neue Adresse, sobald wir am Artikel
   * etwas ändern; dann holt Facebook das Bild neu.
   */
  const vorschauBild = `${PORTAL_URL}/lakatosbandi/journal/${slug}-${lang}.jpg?v=${a.datum}`;
  return {
    title: `${t.titel} — lakatosbandi.com`,
    description: t.beschreibung,
    alternates: {
      canonical: `${PORTAL_URL}/journal/${lang}/${slug}`,
      languages: { ...Object.fromEntries(JOURNAL_SPRACHEN.map(l => [l, `${PORTAL_URL}/journal/${l}/${slug}`])), "x-default": `${PORTAL_URL}/journal/en/${slug}` },
    },
    /* DAS VORSCHAUBILD (Owner 10.09.2026, beim Planen der Facebook-Posts: „Bild keins?"). Ohne
       og:image zeigt Facebook einen Link-Post nur als graue Textzeile. Die Bilder erzeugt
       ein Skript aus dem Titel je Sprache: public/lakatosbandi/journal/<slug>-<sprache>.jpg. */
    openGraph: {
      title: t.titel, description: t.beschreibung, type: "article", url: `${PORTAL_URL}/journal/${lang}/${slug}`, publishedTime: a.datum,
      images: [{ url: vorschauBild, width: 1200, height: 630, alt: t.titel }],
    },
    twitter: { card: "summary_large_image", title: t.titel, description: t.beschreibung, images: [vorschauBild] },
  };
}

export default async function JournalArtikel({ params }: Props) {
  const { lang, slug } = await params;
  const a = artikelFinden(slug);
  if (!gueltig(lang) || !a) notFound();
  const t = a.texte[lang];
  const U = JOURNAL_UI[lang];
  /* Käufer-Artikel enden im Shop, Künstler-Artikel im Trichter (16.09.2026). */
  const shop = a.ziel === "shop";
  const T = portalTexte(lang);
  const P = portalPfade((await headers()).get("host"));
  const weitere = ARTIKEL.filter(x => x.slug !== slug).slice(0, 3);

  /**
   * ── DER FILM IM ARTIKEL (Owner 20.09.2026: „dann zeigst du mein Video") ─────────────────────
   * Derselbe Film, der am Werk hängt, im selben Player wie auf der Produktseite. Gefragt wird
   * der Datensatz des Künstlers: Nimmt er den Film einmal weg, verschwindet er auch hier, statt
   * als totes Rechteck stehenzubleiben. `filmAm` reist in der Adresse mit (Zwischenspeicher).
   */
  const vm = a.video ? await mandantOeffentlich(a.video.mandant) : null;
  const vw = a.video ? vm?.werkInfo?.[a.video.werk] : undefined;
  const vi = a.video ? (a.video.werk === "standard" ? -1 : Number(a.video.werk)) : -1;
  const vk = vm ? werkKacheln(vm, lang).find(x => x.i === vi) : undefined;
  /* Dieselben Schalter wie auf der Künstlerseite — dort stehen die Begründungen. */
  const vPremium = !!vm && (!!vm.reproduktion || aboAktiv(vm as Parameters<typeof aboAktiv>[0]));
  const vKaufBar = !!vm && (!!vm.reproduktion || (!!vm.posterViu && vPremium));
  const film = a.video && vm && vk && vw?.film ? {
    m: vm, k: vk, kaufBar: vKaufBar,
    /* Genau die Film-Folie der Produktseite — jede Folie hat dort ihre eigene Adresse. */
    seite: `${P.kuenstler(a.video.mandant)}/${a.video.werk}?lang=${lang}`,
  } : null;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t.titel,
    description: t.beschreibung,
    inLanguage: lang,
    datePublished: a.datum,
    author: [{ "@type": "Person", name: "Geza Lakatos" }, { "@type": "Person", name: "Szidonia Bandi" }],
    publisher: { "@type": "Organization", name: "lakatosbandi.com" },
    mainEntityOfPage: `${PORTAL_URL}/journal/${lang}/${slug}`,
  };

  return (
    <div data-lang={lang} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <PortalKopf T={T} lang={lang} login={P.login} start={P.start} journal={P.journal(lang)} sprachLink={l => P.journal(l, slug)} />

      <article className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-10 md:pt-16">
        <Link href={P.journal(lang)} className="text-[14px] text-[#777] no-underline hover:text-[#111]">← {U.zurueck}</Link>
        <h1 className="m-0 mt-6 font-serif text-[36px] font-normal leading-[1.15] md:text-[50px]">{t.titel}</h1>
        <p className="mt-4 text-[14px] text-[#888]">{new Date(a.datum).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" })} · {lesezeit(t)} {U.minuten} · Geza Lakatos &amp; Szidonia Bandi</p>
        <p className="mt-8 font-serif text-[22px] leading-[1.55] text-[#222]">{t.lead}</p>

        {/* DAS BILD IM ARTIKEL, wenn der Artikel eines hat (lib/lakatosbandi-journal.ts, `bild`).
            Es trägt Text, deshalb steht in jeder Sprache ein eigenes. Nicht die Linkvorschau —
            die bleibt die 1200×630-Kachel oben in `generateMetadata`. */}
        {/* ── DAS SIEGEL IM ARTIKEL (Owner 18.09.2026: „stempel auch rein") ──────────────────
            Im Artikel über „Artist Fair" steht das Zeichen gross unter dem Vorspann — wer den
            Text auf Facebook teilt, soll es sehen, nicht nur lesen. In den anderen Artikeln hat
            es nichts zu suchen; dort geht es um anderes. */}
        {a.slug === "artist-fair-stempel" && (
          <ArtistFair groesse={200} klasse="mt-10 block text-[#111]" />
        )}

        {film && a.video && (
          <div className="mt-10">
            {/* ── DER FILM UND DARUNTER DIE MINIATUREN (Owner 20.09.2026: „die anderen Slider auch
                drunter" · „die Miniaturen") ───────────────────────────────────────────────────
                Dasselbe Bauteil wie auf der Produktseite, nur ohne Kaufbereich: Der Slider
                startet auf dem Film, und darunter steht die Reihe Blatt · vier Zimmer · Film.
                Wer durchblättert, sieht in einem Zug, was „jedes Werk mit deinem Video
                verbinden" heisst — das Blatt, die Wand, und der Mensch, der es gemalt hat. */}
            <div className="mx-auto flex w-full justify-center">
              <PosterProdukt
                kuenstler={a.video.mandant} m={film.m} k={film.k} L={lang} T={T}
                mitAdmin={u => u} admin={false} adminS=""
                lebend={false} kaufBar={film.kaufBar} alsPoster={film.kaufBar}
                istKleidung={() => false} kariStil={false} werkBild={P.werkBild}
                filmHref={`${film.seite}&film=${a.video.werk}`} agentHref={`${film.seite}&agent=1`}
                filmOffen={false} slide="video" nurSlider />
            </div>
            {t.videoKnopf && (
              <p className="m-0 mt-5 text-center">
                <a href={`${film.seite}&slide=video`}
                  className="inline-block rounded-full border border-[#111] px-5 py-2.5 text-[15px] font-semibold text-[#111] no-underline transition hover:bg-[#111] hover:text-white">
                  {t.videoKnopf} →
                </a>
              </p>
            )}
          </div>
        )}

        {t.bild && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/lakatosbandi/journal/${t.bild}`} alt={t.titel} width={1080} height={1350}
            className="mt-10 block h-auto w-full max-w-[520px]" />
        )}

        {t.teile.map((teil, i) => (
          <section key={i} className="mt-10">
            <h2 className="m-0 text-[22px] font-semibold leading-[1.3]">{teil.h}</h2>
            {teil.p.map((absatz, k) => (
              <p key={k} className="mt-4 text-[17.5px] leading-[1.75] text-[#333]">{absatz}</p>
            ))}
            {/* Ein kurzer Film unter diesem Abschnitt (`clips` am Artikel) — derselbe Player wie
                überall: Standbild aus dem Film, Play-Knopf, Ladebalken, Leiste. Ohne die Zeile
                „The story behind the picture" (hier erzählt niemand) und ohne zweite Musikspur
                (sie liegt in der Datei). */}
            {(a.clips ?? []).filter(c => c.nachTeil === i).map(c => (
              <div key={c.datei} className="relative mx-auto mt-7 w-full max-w-[420px]" style={{ aspectRatio: `${c.breit} / ${c.hoch}` }}>
                <FilmFolie quelle={`/lakatosbandi/journal/${c.datei}`} poster={`/lakatosbandi/journal/${c.standbild}`}
                  bild={`/lakatosbandi/journal/${c.standbild}`} alt={teil.h} intro={null} musikAn={false} youtube={c.youtube} />
              </div>
            ))}
          </section>
        ))}

        <p className="mt-12 border-l-2 border-[#111] pl-5 font-serif text-[26px] leading-[1.35]">{t.merksatz}</p>

        {/* ── DIE RICHTIGE TÜR AM ENDE (Owner 16.09.2026: „und in dem anderen artikel der link
            zum postershop") ────────────────────────────────────────────────────────────────────
            Ein Artikel für Künstler endet beim Trichter, ein Artikel für Käufer beim Shop. */}
        <section className="mt-14 bg-[#111] px-6 py-10 text-white md:px-10">
          <h2 className="m-0 font-serif text-[28px] font-normal leading-[1.2]">{shop ? U.shopTitel : U.ctaTitel}</h2>
          <p className="mt-3 text-[16px] leading-[1.6] text-white/80">{shop ? U.shopText : U.ctaText}</p>
          <a href={shop ? `https://lakatosbandi.com/?lang=${lang}&ansicht=repro` : `https://lakatosbandi.com/start?lang=${lang}`}
            className="mt-6 inline-block bg-white px-6 py-3.5 text-[15.5px] font-semibold text-[#111] no-underline hover:bg-[#e5e5e5]">
            {shop ? U.shopKnopf : U.ctaKnopf}
          </a>
        </section>
      </article>

      <section className="mx-auto w-full max-w-[1120px] border-t border-[#e5e5e5] px-5 pb-16 pt-10">
        <ul className="grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-3">
          {weitere.map(w => (
            <li key={w.slug}>
              <Link href={P.journal(lang, w.slug)} className="group block text-inherit no-underline">
                <span className="block font-serif text-[21px] leading-[1.3] group-hover:underline">{w.texte[lang].titel}</span>
                <span className="mt-2 block text-[14.5px] leading-[1.55] text-[#666]">{w.texte[lang].beschreibung}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <PortalFuss lang={lang} />
    </div>
  );
}
