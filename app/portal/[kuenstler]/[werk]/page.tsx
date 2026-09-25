import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { istKuenstler, portalPfade, werkKacheln, kuenstlerUrl, ueberMichFuer } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";
import KuenstlerAgent from "@/components/KuenstlerAgent";
import PosterFilm from "@/components/PosterFilm";
import PosterProdukt from "@/components/PosterProdukt";
import PortalTeilen from "@/components/PortalTeilen";
import { aboAktiv } from "@/lib/versusforge-abo";
import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";
import { filmPosterPfad } from "@/lib/lakatosbandi-film";
import KaufKnopf from "@/components/KaufKnopf";
import Korb from "@/components/Korb";
import { preisSatz, preisText } from "@/lib/lakatosbandi-preis";
import PreisLabel from "@/components/PreisLabel";
import { druckPreisCents, druckGroessenFuer, druckSpanneCents, KLEIDUNG_AN, istTextil } from "@/lib/lakatosbandi-druck";
import { eur } from "@/lib/pricing";

/**
 * DIE SEITE EINES WERKS: LAKATOSBANDI.COM/{NAME}/{NR} (Owner 11.09.2026: „hier komme ich nicht auf die Kunstwerk-Seite
 * drauf. Es gibt auch keinen Preis" · zum Preis: „c" — der Künstler entscheidet je Werk, ob er ihn zeigt).
 *
 * Grosses Bild, Spruch, Titel · Technik · Größe · Jahr, Preis oder „Preis auf Anfrage", sein Agent spricht über GENAU
 * dieses Werk, darunter seine anderen Werke. Eigene Vorschau fürs Teilen (Bild und Spruch dieses Werks).
 * Seine Geschichte zum Werk steht NICHT hier — die liest sein Agent (so steht es auf „Seite bearbeiten").
 * Sichtbar wie seine Seite: nach der Freigabe, sonst nur für den Admin (`?s=`).
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ kuenstler: string; werk: string }>; searchParams: Promise<Record<string, string | undefined>> };

const nummer = (werk: string) => (werk === "standard" ? -1 : /^\d+$/.test(werk) ? Number(werk) : NaN);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kuenstler, werk } = await params;
  const m = await mandantOeffentlich(kuenstler);
  const i = nummer(werk);
  const k = m ? werkKacheln(m).find(x => x.i === i) : undefined;
  if (!m || !istKuenstler(m) || m.freigabe !== "frei" || !k) return { title: "lakatosbandi.com", robots: { index: false, follow: false } };
  const w = m.werkInfo?.[i < 0 ? "standard" : String(i)];
  const titel = `${w?.titel || k.hook.slice(0, 60)} — ${m.name}`;
  const nr = i < 0 ? "standard" : String(i);
  /**
   * ── HAT DAS WERK EINEN FILM, IST SEIN STANDBILD DIE VORSCHAU (Owner 20.09.2026: „wichtig ist
   * dieses Produkt sharen zu können" · „Poster für Video muss aus dem Video kommen") ───────────
   *
   * Wer diese Adresse auf Facebook oder in WhatsApp setzt, soll sehen, was ihn erwartet: den
   * Künstler vor seinem Blatt, nicht noch einmal das Werk allein. Gefragt wird die Ablage, ob
   * es das Standbild gibt — eine Vorschau mit totem Bild wäre schlechter als die alte.
   * Facebook bekommt dazu den Film selbst (`og:video`), damit er im Beitrag laufen kann.
   */
  const v = encodeURIComponent(w?.filmAm ?? "1");
  const filmDa = !!w?.film;
  const standbildDa = filmDa
    && (await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(filmPosterPfad(kuenstler, nr))}`, { method: "HEAD" }).catch(() => null))?.ok === true;
  const bild = standbildDa
    ? `https://lakatosbandi.com/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&art=filmposter&v=${v}`
    : `https://lakatosbandi.com/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=${i}`;
  const film = filmDa ? `https://lakatosbandi.com/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&v=${v}` : "";
  return {
    title: titel,
    description: k.hook,
    alternates: { canonical: `${kuenstlerUrl(kuenstler)}/${werk}` },
    openGraph: {
      title: titel, description: k.hook, type: "article", url: `${kuenstlerUrl(kuenstler)}/${werk}`, images: [{ url: bild }],
      ...(film ? { videos: [{ url: film, type: "video/mp4" }] } : {}),
    },
    twitter: { card: "summary_large_image", title: titel, description: k.hook, images: [bild] },
  };
}

export default async function PortalWerk({ params, searchParams }: Props) {
  const { kuenstler, werk } = await params;
  const sp = await searchParams;
  const m = await mandantOeffentlich(kuenstler);
  const adminS = String(sp.s ?? "");
  const admin = !!adminS && mandantPruefen(EIGENER_MANDANT, adminS).ok;
  if (!m || !istKuenstler(m) || ((m.freigabe === "abgelehnt" || m.freigabe === "offen") && !admin)) notFound();

  /* DIE SPRACHE STEHT JETZT VOR DEN KACHELN (Owner 14.09.2026: „hier wird nichts übersetzt") —
     `werkKacheln` braucht sie, um den Spruch in der Sprache des Besuchers zu nehmen. */
  const L = portalSprache(sp.lang, m.sprache ?? "en");

  const i = nummer(werk);
  const kacheln = werkKacheln(m, L);
  const k = kacheln.find(x => x.i === i);
  if (!k) notFound();

  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const n = (s: string) => s.replace(/\{name\}/g, m.name);
  const mitAdmin = (url: string) => (admin ? `${url}${url.includes("?") ? "&" : "?"}s=${encodeURIComponent(adminS)}` : url);
  const werkLink = (nr: number) => mitAdmin(`${P.kuenstler(kuenstler)}/${nr < 0 ? "standard" : nr}`);
  const datenschutz = P.start === "/" ? "/privacy" : "/portal/privacy";

  const w = m.werkInfo?.[i < 0 ? "standard" : String(i)];
  /* Kleidung ist abgeschaltet (Owner 18.09.2026) — ein alter Link soll kein kaufbares Shirt
     zeigen, das es nicht mehr gibt. Begründung an `KLEIDUNG_AN` in lib/lakatosbandi-druck.ts.
     Die Sonnenbrille zählt NICHT als Kleidung (Owner 21.09.2026) — sie bleibt erreichbar. */
  if (w?.produkt && istTextil(w.produkt) && !KLEIDUNG_AN) notFound();
  const zeile = w ? [w.titel, w.technik, w.groesse, w.jahr].filter(Boolean).join(" · ") : "";
  /* Sein Preis für dieses Werk — sonst sein allgemeiner Satz (Owner 12.09.2026).
     Bei Reproduktionen steht der echte Preis: fest bei Shirt und Hoodie, sonst die Spanne aus
     der Drucktabelle (Owner 15.09.2026: „pret la cerere ist es nicht. Die preise haben wir ja"). */
  const festCents = w?.produkt ? druckPreisCents(w.produkt, druckGroessenFuer(w.produkt)[0] ?? "") : null;
  const spanne = festCents === null && m.reproduktion ? druckSpanneCents() : null;
  const preis = festCents !== null ? eur(festCents, L)
    : spanne ? `${eur(spanne.von, L)} – ${eur(spanne.bis, L)}`
      : (preisText(w?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage));
  const andere = kacheln.filter(x => x.i !== i);

  /**
   * ── DIESELBEN SCHALTER WIE AUF DER KÜNSTLERSEITE (Owner 20.09.2026: „ich brauche einen Fenster
   * wo alles drin ist, Slider und das auch. Am besten eine Extraseite" · „für jedes Produkt") ──
   *
   * Bis heute zeigte diese Seite bei einem lebenden Künstler nur das nackte Werk — kein Blatt,
   * kein Slider, kein Film, kein Kaufknopf. Das ganze Living Poster gab es nur in der Übersicht,
   * und ein einzelnes Werk liess sich nicht weitergeben.
   *
   * Jetzt steht hier DERSELBE Baustein wie dort (`components/PosterProdukt.tsx`), mit denselben
   * Regeln: Postershop nur mit Premium, das bearbeitbare Blatt nur mit `kunstAn`. Die Formeln
   * stehen wortgleich in `app/portal/[kuenstler]/page.tsx` — dort auch die Begründungen.
   */
  const nr = i < 0 ? "standard" : String(i);
  const premium = !!m.reproduktion || aboAktiv(m as Parameters<typeof aboAktiv>[0]);
  const kaufBar = !!m.reproduktion || (!!m.posterViu && premium);
  const lebend = premium && m.kunstAn === true;
  const kariStil = !!String(m.kunstStil ?? "").trim();
  const istKleidung = (x: number) => istTextil(m.werkInfo?.[x < 0 ? "standard" : String(x)]?.produkt ?? "");
  const anhang = `${sp.lang ? `&lang=${encodeURIComponent(String(sp.lang))}` : ""}${admin ? `&s=${encodeURIComponent(adminS)}` : ""}`;
  const produktAdresse = `${kuenstlerUrl(kuenstler)}/${werk}${sp.lang ? `?lang=${encodeURIComponent(String(sp.lang))}` : ""}`;

  return (
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-8 md:pt-12">
        <a href={mitAdmin(P.kuenstler(kuenstler))} className="text-[14px] text-[#555] underline">← {n(T.alleWerkeVon)}</a>

        {kaufBar && (!w?.produkt || !istTextil(w.produkt)) ? (
          <div className="mx-auto mt-6 w-full lg:w-[min(92vw,calc(88svh/1.4142))]">
            <PosterProdukt
              kuenstler={kuenstler} m={m} k={k} L={L} T={T}
              mitAdmin={mitAdmin} admin={admin} adminS={adminS}
              lebend={lebend} kaufBar={kaufBar}
              /* Kein Papier-Poster für ein eigenes Produkt wie die Sonnenbrille (Owner
                 21.09.2026) — nur echte Poster/Drucke bekommen Rahmen, QR und Passepartout. */
              alsPoster={kaufBar && !w?.produkt}
              istKleidung={istKleidung} kariStil={kariStil} werkBild={P.werkBild}
              produktFotos={w?.produkt === "sonnenbrille"
                ? [mitAdmin(P.werkBild(kuenstler, i, 1100)), ...(w.produktBild2 ? [mitAdmin(P.werkBild2(kuenstler, i, 1100))] : [])]
                : undefined}
              filmHref={`?film=${nr}${anhang}`} agentHref={`?agent=1${anhang}`}
              filmOffen={String(sp.film ?? "").trim() === nr}
              /* Jede Folie hat hier ihre Adresse (`?slide=3`, `?slide=video`) — Owner 20.09.2026. */
              slide={String(sp.slide ?? "")} />
            {/* Genau DIESES Werk weitergeben — die Adresse dieser Seite, nicht die des Künstlers. */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <PortalTeilen adresse={produktAdresse} aktuelleFolie name={`${w?.titel || m.name} — ${m.name}`} T={T} />
            </div>
          </div>
        ) : (
        <div className={m.reproduktion
          /* EINE SPALTE (Owner 15.09.2026: „wenn ich jetzt auf einem bild klicke kommt ein
             anderes layout") — das Poster steht mittig, darunter der Kauf. Zwei Spalten
             zerrissen genau das Bild, das die Kachel verspricht. */
          /* `lb-poster-block` umschliesst Poster UND Rahmenwahl — daran hängt die CSS-Regel,
             die den Rahmen zeichnet (globals.css, 16.09.2026). */
          ? "lb-poster-block mx-auto mt-6 w-full max-w-[560px]"
          : "mt-6 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-12"}>
          {/* ── AUCH HIER DAS POSTER (Owner 15.09.2026: „ok nur dass du die seite auch umbaust")
              ────────────────────────────────────────────────────────────────────────────────────
              Dieselbe Form wie die Kachel: QR und VIDEOPOSTER oben, das Werk im schwarzen Rahmen
              mit Schatten, Play-Knopf darauf. Wer von der Übersicht hierher klickt, soll dasselbe
              Ding grösser sehen und nicht ein anderes Layout. */}
          {m.reproduktion ? (
            <div className="lb-poster-karte border border-[#d8d3c6] bg-[#faf9f6] px-6 py-8 text-center">
              {/* Titel gross über dem Bild, Code darunter (Owner 15.09.2026). */}
              <p className="m-0 mb-6 font-serif text-[24px] uppercase tracking-[0.26em] text-[#111]">{T.werkeReproduktionen}</p>
              <div className="flex items-center justify-center">
                <PosterFilm gross
                  quelle={w?.film ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${i < 0 ? "standard" : i}&v=${encodeURIComponent(w?.filmAm ?? "1")}` : undefined}
                  bild={mitAdmin(P.werkBild(kuenstler, i))} alt={w?.titel || m.name}
                  kuenstler={m.name} leben={m.leben} titel={zeile}
                  geschichte={k.hook} ueber={ueberMichFuer(m, L)} />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/portal-qr" alt=""
                className="mx-auto mt-6 block h-[66px] w-[66px]" />
              <p className="m-0 mt-2 font-serif text-[12.5px] italic text-[#8a8375]">{T.qrScannen}</p>
              <p className="m-0 mt-6 font-serif text-[15px] uppercase tracking-[0.22em] text-[#111]">{m.name}</p>
              {m.leben ? <p className="m-0 mt-1.5 font-serif text-[13px] text-[#8a8375]">{m.leben}</p> : null}
              {zeile ? <p className="m-0 mt-3 font-serif text-[15px] italic leading-[1.45] text-[#22201b]">{zeile}</p> : null}
              <p className="m-0 mt-4 font-serif text-[16px] leading-[1.5] text-[#22201b]">{k.hook}</p>
              <p className="m-0 mt-7 font-serif text-[10.5px] uppercase tracking-[0.28em] text-[#8a8375]">lakatosbandi.com</p>
              <p className="m-0 mt-1.5 font-serif text-[10px] leading-[1.4] text-[#a9a294]">
                Text și design © 2026 lakatosbandi.com · Imagine: domeniu public
              </p>
            </div>
          ) : (
            <div className="flex items-start justify-center bg-[#f5f5f5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mitAdmin(P.werkBild(kuenstler, i))} alt={w?.titel || m.name} className="max-h-[80vh] max-w-full object-contain" />
            </div>
          )}
          {m.reproduktion ? (
            /* Unter dem Poster: Größe, Kaufen, Korb, Agent — wie in der Kachel, nichts davon
               steht im Poster selbst. */
            <div className="mt-5 text-center">
              <KaufKnopf mandant={kuenstler} werk={i < 0 ? "standard" : String(i)}
                material={w?.produkt ?? "posterramaneagra"} sprache={L} anteil={!m.reproduktion}
                texte={{ kaufen: T.kaufKaufen, korb: T.kaufKorb, groesse: T.kaufGroesse, fehler: T.korbFehler,
                          ohneRahmen: T.druckOhneRahmen, ohneRahmenWahl: T.ohneRahmenWahl,
                          mitRahmen: T.druckMitRahmen, mitRahmenWahl: T.mitRahmenWahl,
                          versand: T.druckVersandDrin, rahmenSchwarz: T.druckRahmenSchwarz }} />
              <a href={`?agent=1${admin ? `&s=${encodeURIComponent(adminS)}` : ""}`}
                className="mt-4 inline-block text-[14px] text-[#111] underline">{T.agent}</a>
            </div>
          ) : (
          <div>
            <p className="m-0 font-serif text-[14px] uppercase tracking-[0.22em] text-[#111]">{m.name}</p>
            {m.leben ? <p className="m-0 mt-1.5 font-serif text-[13px] text-[#8a8375]">{m.leben}</p> : null}
            <h1 className="mt-3 font-serif text-[28px] font-normal leading-[1.25] md:text-[34px]">{k.hook}</h1>
            {zeile ? <p className="mt-4 text-[15px] leading-[1.5] text-[#555]">{zeile}</p> : null}
            {w?.detalii ? <p className="mt-1 text-[15px] leading-[1.5] text-[#555]">{w.detalii}</p> : null}
            <p className="mt-5"><PreisLabel groesse="gross">{preis}</PreisLabel></p>
            <a href={`?agent=1${admin ? `&s=${encodeURIComponent(adminS)}` : ""}`}
              className="mt-6 inline-block bg-[#111] px-6 py-3.5 text-[15px] font-semibold text-white no-underline hover:bg-[#333]">
              {T.agent}
            </a>
            {/**
             * ── DIE GRÜNDER EMPFEHLEN (Owner 14.09.2026: „ein Bild von uns zwei, die Gründer,
             * die wir ihn empfehlen" — erst als Muster geprüft, jetzt echt eingebaut) ──────────
             *
             * NUR AUF FREIGEGEBENEN SEITEN: Diese Komponente rendert ohnehin erst nach
             * `m.freigabe === "frei"` (Sperre weiter oben) — der Künstler hat also schon
             * zugestimmt, öffentlich zu stehen. Das Gründer-Wort ist unsere eigene Empfehlung
             * auf unserer eigenen Plattform, kein behaupteter Satz von IHM.
             *
             * GRÖSSE NACH DEM MUSTER (Owner, nach zwei Prüfrunden): 68px Foto, 18px/15px Text —
             * doppelt so gross wie mein erster Entwurf.
             */}
            <div className="mt-7 flex items-center gap-[18px] border-t border-[#e5e5e5] pt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/lakatosbandi/geza-szidonia.jpg" alt="" className="h-[68px] w-[68px] shrink-0 rounded-full object-cover" />
              {/* HIER HÄNGT DAS WERK SCHON BEI UNS — „wir hätten es gern" wäre falsch. Und kein
                  Lob über das einzelne Werk (Owner 14.09.2026: „wir versprechen etwas, was wir
                  nicht halten können"): Der Satz steht unter JEDEM Werk automatisch. Was wahr
                  bleibt, ist die Tatsache, dass wir diesen Künstler zeigen. */}
              <p className="m-0 text-[18px] leading-[1.5] text-[#555]">
                {L === "ro" ? "Artist prezentat de noi pe lakatosbandi.com."
                  : L === "de" ? "Von uns vorgestellt auf lakatosbandi.com."
                  : "Presented by us on lakatosbandi.com."}
                <span className="mt-1 block text-[15px] text-[#999]">
                  {L === "ro" ? "Géza & Szidonia, fondatorii lakatosbandi.com"
                    : L === "de" ? "Géza & Szidonia, Gründer von lakatosbandi.com"
                    : "Géza & Szidonia, founders of lakatosbandi.com"}
                </span>
              </p>
            </div>
          </div>
          )}
        </div>
        )}

        {andere.length > 0 && (
          <>
            <h2 className="mt-16 border-t border-[#e5e5e5] pt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.weitereWerke}</h2>
            <ul className="mt-6 grid list-none grid-cols-2 gap-x-6 gap-y-8 p-0 md:grid-cols-4">
              {andere.map(x => (
                <li key={x.i}>
                  <a href={werkLink(x.i)} className="block text-[#111] no-underline">
                    <div className="flex aspect-[4/5] items-start justify-center bg-[#f5f5f5]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {/* Mit Breite (20.09.2026 gemessen): Ohne `w` kam das Original — 435 KB und 237 KB
                          für zwei Kacheln, die am Handy 180 px breit sind. Mit 500 px sind es 90 und
                          110 KB; dieselbe Regel wie auf der Startseite („Bilder skaliert ausliefern"). */}
                      <img src={mitAdmin(P.werkBild(kuenstler, x.i, 500))} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-[1.35]">{x.hook}</p>
                    {(() => {
                      /* BEI EINEM DRUCK STEHT KEIN „Preis auf Anfrage" (16.09.2026): Was er
                         kostet, wissen wir — es steht auf seiner Seite am Kaufknopf. Der Satz
                         gehört zu Originalen, deren Preis der Künstler nicht nennen will. */
                      if (m.reproduktion || m.posterViu) return null;
                      const wx = m.werkInfo?.[x.i < 0 ? "standard" : String(x.i)];
                      const px = preisText(wx?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage);
                      return px ? <p className="mt-1.5"><PreisLabel groesse="klein">{px}</PreisLabel></p> : null;
                    })()}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <PortalFuss lang={L} />
      {m.reproduktion ? (
        <Korb sprache={L} texte={{
          titel: T.korbTitel, versand: T.korbVersand, summe: T.korbSumme,
          kasse: T.korbKasse, weg: T.korbWeg, leeren: T.korbLeeren, fehler: T.korbFehler,
          material: { poster: T.druckPapier, posterrama: `${T.druckPapier} · ${T.druckMitRahmen}`, posterramaneagra: `${T.druckPapier} · ${T.druckRahmenSchwarz}`, tricou: T.druckTricou, hanorac: T.druckHanorac },
        }} />
      ) : null}
      {/* Sein Agent spricht über GENAU dieses Werk. Der Admin ist kein Besucher. */}
      <KuenstlerAgent mandant={kuenstler} name={m.name} T={T} messen={!admin} hook={String(i)} reproduktion={!!m.reproduktion} produkt={m.werkInfo?.[i < 0 ? "standard" : String(i)]?.produkt}
        offen={String(sp.agent ?? "") === "1"} datenschutz={datenschutz} sprache={L} />
    </div>
  );
}
