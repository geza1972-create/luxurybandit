import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { mandantLesen, mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import PortalBearbeiten from "@/components/PortalBearbeiten";
import KuenstlerAgent from "@/components/KuenstlerAgent";
import { preisAnzeige, preisZahl } from "@/lib/lakatosbandi-preis";
import PreisLabel from "@/components/PreisLabel";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { istKuenstler, portalPfade, werkKacheln, kuenstlerUrl } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * DIE SEITE EINES KÜNSTLERS: LAKATOSBANDI.COM/{NAME} (Owner 10.09.2026: „die kommen doch unter
 * lakatosbandi.com/{artistname}" · „nur auf lakatosbandi").
 *
 * Seine Werke als Hook-Kacheln und der eine Weg zu ihm: „Interessiert an meiner Kunst? Sprich mit
 * meinem Agenten." Bis der Käufer-Agent gebaut ist, führt der Knopf in das bestehende Gespräch
 * mit Name und Telefonnummer (`/{name}/kontakt` → der Trichter). Eine Kaufabwicklung gibt es
 * hier nicht (Owner: „Eine Kaufabwicklung findet hier nicht statt").
 *
 * SICHTBAR NACH DER FREIGABE — auch ohne „Ja, ins Portal": Dann steht er nicht in der Übersicht,
 * seine eigene Seite hat er trotzdem. Wartet er noch, steht ein ruhiger Satz da; abgelehnt gibt
 * es die Seite nicht.
 *
 * `?h=` aus der Anzeige wird an den Knopf weitergegeben — so steht im Dashboard, aus welchem
 * Hook die Anfrage kam.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ kuenstler: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { kuenstler } = await params;
  const m = await mandantOeffentlich(kuenstler);
  if (!m || !istKuenstler(m) || m.freigabe !== "frei") return { title: "lakatosbandi.com", robots: { index: false, follow: false } };
  const erster = werkKacheln(m)[0]?.hook ?? "";
  return {
    title: `${m.name} — lakatosbandi.com`,
    description: erster || `${m.name} on lakatosbandi.com`,
    alternates: { canonical: kuenstlerUrl(kuenstler) },
    openGraph: { title: `${m.name} — lakatosbandi.com`, description: erster, type: "profile", url: kuenstlerUrl(kuenstler) },
  };
}

export default async function PortalKuenstler({ params, searchParams }: Props) {
  const { kuenstler } = await params;
  const sp = await searchParams;
  const m = await mandantOeffentlich(kuenstler);
  /* DER ADMIN SIEHT DIE GANZE SEITE, AUCH VOR DER FREIGABE UND OFFLINE (Owner 11.09.2026: „wie soll ich es freigeben, wenn
     ich keine Bilder sehen kann?" · „du sollst die ganze Seite bauen, du zeigst die Seite im Portal"). `?s=` = Admin-Schlüssel. */
  const adminS = String(sp.s ?? "");
  const admin = !!adminS && mandantPruefen(EIGENER_MANDANT, adminS).ok;
  if (!m || !istKuenstler(m) || (m.freigabe === "abgelehnt" && !admin)) notFound();

  const L = portalSprache(sp.lang, m.sprache ?? "en");
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const h = String(sp.h ?? "").slice(0, 4);

  /**
   * ── SEITE BEARBEITEN, MIT SEINEM SCHLÜSSEL (Owner 11.09.2026: „er muss es dort bearbeiten. WYSIWYG") ──
   *
   * Der Link aus seiner Mail trägt `?k=`. Stimmt der Schlüssel, sieht er dieselbe Seite — antippbar, mit allen
   * Bildern, auch vor der Freigabe. Stimmt er nicht, sieht er die Seite wie jeder andere.
   */
  const k = String(sp.k ?? "");
  if (k) {
    const voll = await mandantLesen(kuenstler);
    if (voll && istKuenstler(voll) && schluesselStimmt(voll.schluessel, k)) {
      /* Jede Kachel mit Spruch — und jede, die er gespeichert hat, auch ohne Spruch (`werkNummern`). */
      const hooks = Array.isArray(voll.hooks) ? voll.hooks : [];
      const spruchVon = (i: number) => String((i < 0 ? voll.hook : hooks[i]) ?? "").trim();
      const nummern = [...new Set([
        ...(spruchVon(-1) ? [-1] : []),
        ...hooks.map((_, i) => i).filter(i => spruchVon(i)),
        ...(Array.isArray(voll.werkNummern) ? voll.werkNummern : []).filter(i => Number.isInteger(i) && i >= -1 && i <= 11),
      ])].sort((a, b) => a - b);
      const kacheln = nummern.map(i => ({ i, spruch: spruchVon(i) })).map(x => {
        const w = voll.werkInfo?.[x.i < 0 ? "standard" : String(x.i)] ?? {};
        return {
          ...x, titel: w.titel ?? "", technik: w.technik ?? "", groesse: w.groesse ?? "", jahr: w.jahr ?? "", geschichte: w.geschichte ?? "",
          /* Der Preis aus dem Gespräch gehört zum gewählten Bild („standard"). */
          preis: preisZahl(w.preis ?? (x.i < 0 ? String(voll.preis ?? "") : "")), preisZeigen: !!w.preisZeigen, detalii: w.detalii ?? "",
        };
      });
      return (
        <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
          <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
          <PortalBearbeiten
            mandant={kuenstler}
            k={k}
            T={T}
            oeffentlich={kuenstlerUrl(kuenstler)}
            start={{
              name: voll.name ?? "",
              ort: voll.ort ?? "",
              ueberMich: voll.ueberMich ?? "",
              profilBild: !!voll.profilBild,
              frei: !voll.freigabe || voll.freigabe === "frei",
              kacheln,
            }}
          />
          <PortalFuss lang={L} />
        </div>
      );
    }
  }

  if (m.freigabe !== "frei" && !admin) {
    return (
      <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
        <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
        <p className="mx-auto mt-24 max-w-[420px] px-6 text-center text-[18px] leading-[1.5]">{T.pruefung}</p>
      </div>
    );
  }

  const kacheln = werkKacheln(m);
  /* Die Bilder liefert `api/portal-werk` vor der Freigabe nur mit Schlüssel aus — für den Admin mit seinem. */
  const mitAdmin = (url: string) => (admin ? `${url}&s=${encodeURIComponent(adminS)}` : url);
  /* „VORBEȘTE CU AGENTUL MEU" ÖFFNET SEINEN AGENTEN AUF DIESER SEITE (Owner 11.09.2026) — statt der alten Firmen-Seite
     `/{name}/kontakt`. Die Kachel-Nummer geht mit, damit die Anfrage weiss, um welches Werk es geht. */
  const agentLink = (nr?: string) =>
    `?agent=1${nr ? `&h=${encodeURIComponent(nr)}` : ""}${sp.lang ? `&lang=${encodeURIComponent(String(sp.lang))}` : ""}${admin ? `&s=${encodeURIComponent(adminS)}` : ""}`;
  const datenschutz = P.start === "/" ? "/privacy" : "/portal/privacy";
  /* Die Seite eines Werks: lakatosbandi.com/{name}/{nr} („standard" = das erste). */
  const werkLink = (i: number) =>
    `${P.kuenstler(kuenstler)}/${i < 0 ? "standard" : i}${admin ? `?s=${encodeURIComponent(adminS)}` : ""}`;
  const freigabeLink = (a: "frei" | "abgelehnt") =>
    `/api/versusforge-freigabe?m=${encodeURIComponent(kuenstler)}&s=${encodeURIComponent(adminS)}&a=${a}`;

  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />

      <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-10 md:pt-14">
        {/* NUR FÜR DEN ADMIN: was Käufer sehen — und der Knopf dazu (Owner 11.09.2026). Deutsch, sie liest es. */}
        {admin && (
          <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-[#fff6e0] px-4 py-3 text-[14.5px] text-[#5b4a00]">
            <b>Admin-Vorschau.</b>
            <span>{m.freigabe === "frei" ? "Die Seite ist online." : m.freigabe === "abgelehnt" ? "Die Seite ist offline." : "Die Seite wartet auf Freigabe — Käufer sehen sie noch nicht."}</span>
            {m.freigabe === "frei"
              ? <a href={freigabeLink("abgelehnt")} className="font-semibold text-[#b3261e] underline">Offline nehmen</a>
              : <a href={freigabeLink("frei")} className="font-semibold text-[#1d6fd0] underline">Freigeben</a>}
          </div>
        )}
        {/* Sein Foto und sein Text — aus „Seite bearbeiten" (Owner 11.09.2026). */}
        {m.profilBild ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={mitAdmin(`/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=profil`)} alt={m.name}
            className="mb-5 h-24 w-24 rounded-full object-cover" />
        ) : null}
        <h1 className="m-0 font-serif text-[36px] font-normal leading-[1.1] md:text-[52px]">{m.name}</h1>
        {m.ort ? <p className="mt-2 text-[15px] text-[#555]">{m.ort}</p> : null}
        {m.ueberMich ? <p className="mt-5 max-w-[640px] whitespace-pre-line text-[16.5px] leading-[1.6] text-[#333]">{m.ueberMich}</p> : null}

        <a href={agentLink(h)}
          className="mt-7 inline-block bg-[#111] px-6 py-3.5 text-[15px] font-semibold text-white no-underline hover:bg-[#333]">
          {T.agent}
        </a>

        <h2 className="mt-14 border-t border-[#e5e5e5] pt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.werke}</h2>
        <ul className="mt-6 grid list-none grid-cols-1 gap-x-8 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {kacheln.map(k => (
            <li key={k.i}>
              {/* ZUR WERKSEITE (Owner 11.09.2026: „hier komme ich nicht auf die Kunstwerk-Seite drauf") — Bild und Spruch führen hin. */}
              <a href={werkLink(k.i)} className="block text-[#111] no-underline">
                <div className="flex aspect-[4/5] items-start justify-end bg-[#f5f5f5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mitAdmin(P.werkBild(kuenstler, k.i))} alt={m.name} loading="lazy" className="max-h-full max-w-full object-contain" />
                </div>
                <p className="mt-4 text-[17px] font-semibold leading-[1.35]">{k.hook}</p>
              </a>
              {/* TITEL · TECHNIK · GRÖSSE · JAHR (Owner 10.09.2026) — und der Preis, wenn er ihn zeigen will (Owner 11.09.2026: „c"). */}
              {(() => {
                const w = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
                const zeile = w ? [w.titel, w.technik, w.groesse, w.jahr].filter(Boolean).join(" · ") : "";
                const preis = w?.preisZeigen ? preisAnzeige(w.preis) : "";
                return (
                  <>
                    {zeile ? <p className="mt-1 text-[14px] leading-[1.45] text-[#666]">{zeile}</p> : null}
                    {preis ? <p className="mt-2"><PreisLabel>{preis}</PreisLabel></p> : null}
                  </>
                );
              })()}
              <a href={agentLink(String(k.i))} className="mt-2 inline-block text-[14px] text-[#111] underline">{T.agent}</a>
            </li>
          ))}
        </ul>
      </main>
      <PortalFuss lang={L} />
      {/* Sein Agent begrüßt jeden Besucher und zählt den Besuch (Owner 11.09.2026). */}
      {/* Der Admin ist kein Besucher: nicht zählen, keine Besuchs-Mail. */}
      <KuenstlerAgent mandant={kuenstler} name={m.name} T={T} messen={!admin} hook={h}
        offen={String(sp.agent ?? "") === "1"} datenschutz={datenschutz} sprache={L} />
    </div>
  );
}
