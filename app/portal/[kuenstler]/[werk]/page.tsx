import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { istKuenstler, portalPfade, werkKacheln, kuenstlerUrl } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";
import KuenstlerAgent from "@/components/KuenstlerAgent";
import { preisSatz, preisText } from "@/lib/lakatosbandi-preis";
import PreisLabel from "@/components/PreisLabel";

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
  const bild = `https://lakatosbandi.com/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=${i}`;
  return {
    title: titel,
    description: k.hook,
    alternates: { canonical: `${kuenstlerUrl(kuenstler)}/${werk}` },
    openGraph: { title: titel, description: k.hook, type: "article", url: `${kuenstlerUrl(kuenstler)}/${werk}`, images: [{ url: bild }] },
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
  const zeile = w ? [w.titel, w.technik, w.groesse, w.jahr].filter(Boolean).join(" · ") : "";
  /* Sein Preis für dieses Werk — sonst sein allgemeiner Satz (Owner 12.09.2026). */
  const preis = preisText(w?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage);
  const andere = kacheln.filter(x => x.i !== i);

  return (
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-8 md:pt-12">
        <a href={mitAdmin(P.kuenstler(kuenstler))} className="text-[14px] text-[#555] underline">← {n(T.alleWerkeVon)}</a>

        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-12">
          <div className="flex items-start justify-center bg-[#f5f5f5]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mitAdmin(P.werkBild(kuenstler, i))} alt={w?.titel || m.name} className="max-h-[80vh] max-w-full object-contain" />
          </div>
          <div>
            <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{m.name}</p>
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
        </div>

        {andere.length > 0 && (
          <>
            <h2 className="mt-16 border-t border-[#e5e5e5] pt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.weitereWerke}</h2>
            <ul className="mt-6 grid list-none grid-cols-2 gap-x-6 gap-y-8 p-0 md:grid-cols-4">
              {andere.map(x => (
                <li key={x.i}>
                  <a href={werkLink(x.i)} className="block text-[#111] no-underline">
                    <div className="flex aspect-[4/5] items-start justify-center bg-[#f5f5f5]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mitAdmin(P.werkBild(kuenstler, x.i))} alt="" loading="lazy" className="max-h-full max-w-full object-contain" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[14px] font-semibold leading-[1.35]">{x.hook}</p>
                    {(() => {
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
      {/* Sein Agent spricht über GENAU dieses Werk. Der Admin ist kein Besucher. */}
      <KuenstlerAgent mandant={kuenstler} name={m.name} T={T} messen={!admin} hook={String(i)}
        offen={String(sp.agent ?? "") === "1"} datenschutz={datenschutz} sprache={L} />
    </div>
  );
}
