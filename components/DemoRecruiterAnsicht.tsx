import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import RecruiterDashboard from "@/components/RecruiterDashboard";
import {
  ARMEE_SPRACHEN, DEMO_KAMPAGNE, DEMO_KUNDE, DEMO_TRICHTER,
  KOSTEN_JE_PROFIL_CENT, KOSTEN_JE_VIDEO_CENT, armeeSprache, armeeTexte, demoMotive, demoProfile, recruiterTexte,
} from "@/lib/demo-armee";

/**
 * DIE RECRUITERSEITE — als eigener Baustein, damit sie zwei Türen bedienen kann (Owner
 * 04.09.2026: „dann für die Seiten brauche ich auch ro, de, en … und ich hoffe es bleibt bei
 * weiterklick in der Sprache").
 *
 * VORHER STAND DIE GANZE SEITE IN `app/demo/[schluessel]/page.tsx` — der Adresse OHNE
 * Sprache im Pfad. Eine Sprache liess sich nur über `?lang=` erzwingen, und ein Interessent,
 * dem man den Link weitergibt, tippt das Anhängsel nicht ab oder verliert es beim Teilen.
 * Dieselbe Lösung wie bei `/academy` (`components/ArmeeLandingSeite.tsx`) — eine Seite, ZWEI
 * dünne Einstiegstüren:
 *
 *   `app/demo/[schluessel]/page.tsx`        `?lang=` (oder Cookie/Browsersprache).
 *   `app/demo/[schluessel]/[lang]/page.tsx` `/demo/<schluessel>/de`, `/ro`, `/en` — feste
 *                                            Adressen zum Weitergeben.
 *
 * „WEITERKLICK IN DER SPRACHE": `imPfad` reicht als `sprachePfad` an `TopNav` (→ `LangSwitch`)
 * weiter, UND `trichterHref` unten hängt an derselben `s` — der „Generiere dein Video"-Knopf
 * führt also in `/academy/<s>/start`, nicht zurück auf Englisch.
 */
export default function DemoRecruiterAnsicht({ schluessel, lang, imPfad = false }: {
  schluessel: string;
  lang: string;
  imPfad?: boolean;
}) {
  const T = recruiterTexte(lang);
  /* Der Claim wird nicht doppelt gepflegt: Was der Bewerber im Trichter liest, ist genau
     das, was der Kunde hier als Kampagnen-Aussage sieht. */
  const A = armeeTexte(lang);
  const s = armeeSprache(lang);
  const heim = imPfad ? `/demo/${schluessel}/${s}` : `/demo/${schluessel}`;

  return (
    <main className="lb-bg min-h-screen text-white">
      {/* `schlicht` schliesst die Seite: kein Konto, kein Guthaben, kein Weg zu einem
          anderen Produkt. Der Kunde soll seine Kampagne sehen, nicht unseren Katalog. */}
      {/* WHITE LABEL AUCH HIER (Owner 02.09.2026: „Logo raus, Menü raus"). Diese Seite wird
          einem Kunden als SEINE Auswertung gezeigt — ein LB-Zeichen im Kopf wäre der zweite
          Absender auf seiner eigenen Kampagne. Das schwebende Menü ist für `/demo/` schon in
          `BottomNav` abgeschaltet, aus demselben Grund. */}
      <TopNav schlicht ohneLogo back={false} marke={DEMO_KUNDE.name} heim={heim}
        motto={null} breit sprachen={[...ARMEE_SPRACHEN]} sprachePfad={imPfad} />

      <RecruiterDashboard daten={{
        kunde: DEMO_KUNDE,
        kampagne: DEMO_KAMPAGNE,
        trichter: DEMO_TRICHTER,
        kostenJeVideoCent: KOSTEN_JE_VIDEO_CENT,
        kostenJeProfilCent: KOSTEN_JE_PROFIL_CENT,
        sprache: s,
        motive: demoMotive(lang),
        claim: { zeileEins: A.claimEins, zeileZwei: A.claimZwei, zeileDrei: A.claimDrei },
        /* DIREKT IN DEN TRICHTER, NICHT AUF DIE LANDINGPAGE (Owner 04.09.2026, am
           „Generiere dein Video"-Knopf der Anzeigenkarte: „button führt zum template
           auswahl"). Die Anzeigenkarte IST schon der Werbeauftritt — ein Klick auf „Generiere
           dein Video" landete bisher auf einer zweiten Werbeseite (`/academy/[lang]`) statt
           bei der ersten wirklichen Handlung, der Einsatz-Wahl. `/start` ist genau dieser
           erste Schritt des Trichters — und `s` trägt die Sprache dieser Seite weiter. */
        trichterHref: `/academy/${s}/start`,
        profile: demoProfile(),
        texte: T,
        beispiel: true,
      }} />

      {/* DER FUSS DER BEWERBER-SEITEN, NICHT DER GROSSE PORTAL-FUSS (Owner 04.09.2026:
          „baue mir auf diese Seite den normal Footer ein von luxurybandit").
          `art="schlicht"` ist hier trotzdem richtig, nicht `voll`: Dieselbe weisslabel-Regel,
          die oben Logo und Menü aus dem Kopf hält, gilt für den Fuss — eine Seite, die an
          eine Personalabteilung geht, wirbt nicht für den Katalog (kein Contact/About, keine
          Social-Links). `art="schlicht"` ist genau der Fuss, den `david/[id]` und
          `joburi/[kunde]` für denselben Zweck schon tragen: die LuxuryBandit-Zeile plus das
          gesetzliche Minimum (Impressum, Datenschutz, AGB). */}
      {/* KONTAKT DAZU (Owner 04.09.2026: „auf der Recruiter Seite Contact einfügen") — diese
          Seite geht an den KUNDEN, nicht an einen Bewerber; anders als bei David oder den
          Job-Kunden-Seiten darf er hier fragen können. Siehe `kontakt`-Prop in
          `SeitenFuss.tsx`. */}
      <SeitenFuss art="schlicht" lang={s} kontakt />
    </main>
  );
}
