import LandingSeite from "@/components/LandingSeite";
import LandingKarte from "@/components/LandingKarte";
import { Kicker, Lead, SectionTitle } from "@/components/Landing";
import { Kasten, Knopf } from "@/components/CI";
import OrteBlock from "@/components/OrteBlock";
import ImmerOben from "@/components/ImmerOben";
import { Check } from "lucide-react";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import { ARMEE_DEMO_HINWEIS, ARMEE_SPRACHEN, DEMO_KUNDE, DEMO_SCHLUESSEL, armeeSprache, armeeTexte, demoMotive } from "@/lib/demo-armee";

/**
 * DIE LANDINGPAGE DER ACADEMY — als eigener Baustein, damit sie zwei Türen bedienen kann
 * (Owner 04.09.2026: „ich kann einzelne Sprachen nicht sharen. Ich brauche die und
 * rumänisch brauche ich auch").
 *
 * VORHER STAND DIE GANZE SEITE IN `app/academy/page.tsx` — der Adresse OHNE Sprache im Pfad.
 * Eine Sprache liess sich nur über `?lang=` erzwingen, und genau das teilt schlecht: Mail-
 * Programme und soziale Netzwerke kürzen Anhängsel in der Vorschau, und wer eine Adresse von
 * Hand abtippt, lässt sie weg. Dasselbe Problem hatte „Recruiting" schon einmal
 * (`components/RecruitingSeite.tsx`) — die Lösung von dort wird hier wiederverwendet, nicht
 * neu erfunden: Eine Seite, ZWEI dünne Einstiegstüren.
 *
 *   `app/academy/page.tsx`        `?lang=` (oder Cookie/Browsersprache) — der Eingang für
 *                                 alle, die den Link nicht gezielt von uns bekommen haben.
 *   `app/academy/[lang]/page.tsx` `/academy/de`, `/academy/ro`, `/academy/en` — feste
 *                                 Adressen zum Weitergeben, unabhängig von Cookie und Browser.
 */
export default function ArmeeLandingSeite({ lang, imPfad = false }: { lang: string; imPfad?: boolean }) {
  const T = armeeTexte(lang);
  const heim = imPfad ? `/academy/${armeeSprache(lang)}` : "/academy";
  /* Die Sprachwahl reist mit in den Trichter — sonst wechselt die Seite hinter dem Knopf die
     Sprache zurück auf die des Browsers. Im Pfad bleibt sie im Pfad. */
  const start = imPfad
    ? `/academy/${armeeSprache(lang)}/start`
    : `/academy/start${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`;
  const demoHref = imPfad
    ? `/demo/${DEMO_SCHLUESSEL}?lang=${armeeSprache(lang)}`
    : `/demo/${DEMO_SCHLUESSEL}${lang ? `?lang=${encodeURIComponent(lang)}` : ""}`;

  const schritte = [
    { n: "1", t: T.lpWieEins, x: T.lpWieEinsText },
    { n: "2", t: T.lpWieZwei, x: T.lpWieZweiText },
    { n: "3", t: T.lpWieDrei, x: T.lpWieDreiText },
  ];

  return (
    <LandingSeite
      marke={DEMO_KUNDE.name} heim={heim} motto={null} schlicht whitelabel lang={lang}
      sprachen={[...ARMEE_SPRACHEN]} sprachePfad={imPfad}
      trackEvent="armee_view" trackId="armee" trackName="United Peace Academy"
      heroA={T.claimEins} heroY={T.claimZwei} heroB={T.claimDrei}
      kinder={<>
        <ImmerOben />
        {/* MEHRERE FOLIEN, NICHT NUR DER SPOT (Owner 04.09.2026, am Bildschirmfoto der
            Landingpage-Karte: „hier fehlen die slides"). Die Recruiter-Galerie
            (`demoMotive`) zeigt Werbespot + fünf Einsatz-Anzeigen mit Punkten zum
            Durchblättern; hier lief bis eben nur der Spot allein, `LandingKarte` bekam ein
            Ein-Element-Feld und `KartenKarussell` zeigte deshalb keine Punkte. Dieselbe
            Galerie wie auf der Recruiter-Demo, nur öffentlich statt hinter dem Schlüssel. */}
        <LandingKarte sprache={lang} titel={T.lpKartenTitel} href={start} aufruf={T.lpCta}
          teilenUrl={`${ACADEMY_DOMAIN}${heim}?utm_source=share`} teilenText={T.claimDrei}
          madeBy={false} wiederholenNach={10}
          verhaeltnis="aspect-[3/4]"
          folien={demoMotive(lang).map(m => ({ video: m.url, poster: m.poster }))} />

        {/* DER HINWEIS, DASS ES DIE UPA NICHT GIBT — UNTER DEM KNOPF (Owner 04.09.2026: „den
            Text unter dem Button"). Stand vorher zwischen Titel und Anzeigen-Karte und nahm
            dort die erste Bildschirmseite ein, bevor der Besucher die Karte überhaupt sah.
            Jetzt Kleingedrucktes nach der Handlung, wie unter jedem Formular. */}
        <p className="mt-3 text-[12.5px] font-bold leading-snug text-white/50">
          <span className="text-white/70">{ARMEE_DEMO_HINWEIS[armeeSprache(lang)].titel}.</span>{" "}
          {ARMEE_DEMO_HINWEIS[armeeSprache(lang)].text}
        </p>

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
            <div className="mt-4">
              <Knopf art="gold" href={demoHref}>{T.lpKundeKnopf}</Knopf>
            </div>
          </Kasten>
        </div>

        <div className="mt-9"><SectionTitle>{T.lpWarumTitel}</SectionTitle></div>
        <Lead>{T.lpWarumText}</Lead>

        <div className="mt-9"><SectionTitle>{T.lpNameTitel}</SectionTitle></div>
        <Lead>{T.lpNameText}</Lead>

        <OrteBlock lang={armeeSprache(lang)} className="mt-9" />

        <div className="mt-9"><SectionTitle>{T.lpWlTitel}</SectionTitle></div>
        <Lead>{T.lpWlText}</Lead>

        <div className="mt-9">
          <Kicker>{T.lpUnten}</Kicker>
          <div className="mt-2"><Knopf art="umriss" href={start}>{T.lpCta}</Knopf></div>
        </div>
      </>}
    />
  );
}
