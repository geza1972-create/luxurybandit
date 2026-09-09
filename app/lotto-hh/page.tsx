import type { Metadata } from "next";
import LandingSeite from "@/components/LandingSeite";
import LandingKarte from "@/components/LandingKarte";
import { Kicker, Lead, SectionTitle, Fine } from "@/components/Landing";
import { Kasten, Knopf } from "@/components/CI";
import OrteBlock from "@/components/OrteBlock";
import ImmerOben from "@/components/ImmerOben";
import { Check } from "lucide-react";
import { KAMPAGNEN } from "@/lib/kampagnen";

/**
 * DIE LANDINGPAGE VON LOTTO HAMBURG — dieselbe Bauart wie `app/academy/page.tsx`, mit
 * demselben Muster (Anzeigen-Karte, „So läuft es", „Das bekommen Sie", „Warum das wirkt",
 * „Wo das läuft", White-Label-Rubrik) und demselben Wortschatz-Schema, nur aus
 * `lib/kampagnen.ts` statt aus `lib/demo-armee.ts`.
 *
 * WAS HINZUKOMMT UND NUR HIER: der Rechtshinweis (`K.legal`). Glücksspiel-Werbung verlangt
 * Alter und Suchthilfe sichtbar — die Academy kennt dieses Feld nicht, weil sie kein
 * Glücksspiel bewirbt. Er steht zweimal: knapp unter der Anzeigen-Karte, wo der Besucher
 * zuerst hinschaut, und ausführlich im weissen Fuss der Seite.
 */

export const dynamic = "force-dynamic";

const K = KAMPAGNEN["lotto-hh"];

export const metadata: Metadata = {
  title: `${K.texte.claimEins} — ${K.marke}`,
  description: K.texte.lpSub,
  openGraph: {
    title: `${K.texte.claimEins} — ${K.marke}`, description: K.texte.lpSub, type: "website",
    siteName: K.marke, url: `${K.domain}/${K.slug}`,
    images: [{ url: `${K.domain}${K.spot.poster}`, width: 720, height: 1280 }],
  },
  twitter: {
    card: "summary_large_image", title: `${K.texte.claimEins} — ${K.marke}`,
    description: K.texte.lpSub, images: [`${K.domain}${K.spot.poster}`],
  },
};

export default function LottoHhLanding() {
  const T = K.texte;
  const start = `/${K.slug}/start`;

  const schritte = [
    { n: "1", t: T.lpWieEins, x: T.lpWieEinsText },
    { n: "2", t: T.lpWieZwei, x: T.lpWieZweiText },
    { n: "3", t: T.lpWieDrei, x: T.lpWieDreiText },
  ];

  return (
    <LandingSeite
      marke={K.marke} heim={`/${K.slug}`} motto={null} schlicht whitelabel lang="de"
      sprachen={K.sprachen}
      trackEvent="lotto_hh_view" trackId={K.slug} trackName={K.marke}
      heroA={T.claimEins} heroY={T.claimZwei} heroB={T.claimDrei}
      kinder={<>
        <ImmerOben />
        <LandingKarte sprache="de" titel={T.lpKartenTitel} href={start} aufruf={T.lpCta}
          teilenUrl={`${K.domain}/${K.slug}?utm_source=share`} teilenText={T.claimDrei}
          madeBy={false} wiederholenNach={10}
          verhaeltnis="aspect-[3/4]"
          folien={[{ video: K.spot.video, poster: K.spot.poster }]} />

        {K.legal && (
          <p className="mt-3 text-center text-[11.5px] font-bold leading-snug text-white/55">
            {K.legal.hinweis} {K.legal.hilfe}
          </p>
        )}

        <p className="mt-4 text-[15px] font-semibold leading-snug text-white/85">{T.lpSub}</p>

        <div className="mt-9"><SectionTitle>{T.lpWieTitel}</SectionTitle></div>
        <div className="mt-4 space-y-4">
          {schritte.map(s => (
            <div key={s.n} className="flex gap-3">
              <div className="mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#f6cf51]/40 text-[13.5px] font-black text-[#f6cf51]">
                {s.n}
              </div>
              <div>
                <p className="text-[15px] font-black text-white">{s.t}</p>
                <p className="mt-1 text-[15px] font-medium leading-snug text-white/80">{s.x}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-9"><SectionTitle>{T.lpKundeTitel}</SectionTitle></div>
        <Lead>{T.lpKundeText}</Lead>
        <div className="mt-4">
          <Kasten polster="p-4">
            <ul className="space-y-2">
              {[T.lpKundeEins, T.lpKundeZwei, T.lpKundeDrei].map(z => (
                <li key={z} className="flex gap-2.5">
                  <Check className="mt-[3px] h-4 w-4 shrink-0 text-[#f6cf51]" />
                  <span className="text-[15px] font-semibold leading-snug text-white/85">{z}</span>
                </li>
              ))}
            </ul>
          </Kasten>
        </div>

        <div className="mt-9"><SectionTitle>{T.lpWarumTitel}</SectionTitle></div>
        <Lead>{T.lpWarumText}</Lead>

        <div className="mt-9"><SectionTitle>{T.lpNameTitel}</SectionTitle></div>
        <Lead>{T.lpNameText}</Lead>

        <div className="mt-9"><SectionTitle>{T.lpOrteTitel}</SectionTitle></div>
        <Lead>{T.lpOrteText}</Lead>
        <div className="mt-4 space-y-3">
          {[
            { t: T.lpOrtEinsTitel, x: T.lpOrtEinsText },
            { t: T.lpOrtZweiTitel, x: T.lpOrtZweiText },
            { t: T.lpOrtDreiTitel, x: T.lpOrtDreiText },
          ].map(o => (
            <Kasten key={o.t} polster="p-4">
              <p className="text-[15px] font-black text-white">{o.t}</p>
              <p className="mt-1 text-[15px] font-medium leading-snug text-white/80">{o.x}</p>
            </Kasten>
          ))}
        </div>
        <p className="mt-4 text-[15px] font-medium leading-snug text-white/80">{T.lpQrText}</p>

        <div className="mt-9"><SectionTitle>{T.lpWlTitel}</SectionTitle></div>
        <Lead>{T.lpWlText}</Lead>

        <OrteBlock lang="de" className="mt-9" />

        {K.legal && (
          <Fine className="mt-9 text-center">
            {K.legal.hinweis} {K.legal.hilfe}
          </Fine>
        )}

        <div className="mt-9">
          <Kicker>{T.lpUnten}</Kicker>
          <div className="mt-2"><Knopf art="umriss" href={start}>{T.lpCta}</Knopf></div>
        </div>
      </>}
    />
  );
}
