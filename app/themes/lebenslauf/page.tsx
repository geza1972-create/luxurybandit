import TopNav from "@/components/TopNav";
import LandingKarte from "@/components/LandingKarte";
import TrackView from "@/components/TrackView";
import SeitenFuss from "@/components/SeitenFuss";
import ThemenVorspann from "@/components/ThemenVorspann";
import { Kicker, H1, Y, Lead } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { eur, themenPreisCents } from "@/lib/pricing";
import { GEBURTSTAG_VIDEO_MANN } from "@/lib/geburtstag";

/**
 * DIE LANDINGPAGE DES LEBENSLAUF-PORTALS — nach dem Kopf-Template und dem Karten-Muster aus
 * `Landingpage.md` (§2, §9), 1:1 wie `app/themes/chat/page.tsx`: Kicker/H1/Lead, dann
 * `ThemenVorspann` (Anlass · Grund · drei Schritte · Privatzeile), dann `LandingKarte`
 * (dieselbe Karte wie das Ergebnis, Preis IM Knopf, Teilen-Symbol, `href` statt Dialog — der
 * Lebenslauf hat keinen eingebetteten Tunnel, sondern eine eigene Trichter-Adresse). Der erste
 * Entwurf benutzte `VorlagenKachel` (die kleine 118px-Tunnel-Kachel) als Hero-Bild — genau der
 * Fehler, den Landingpage.md §1 beschreibt: „Eine Beispiel-Karte als Kachel zu bauen ist der
 * Fehler." Das Beispiel-Video ist weiterhin ein Platzhalter (Geburtstags-Video) — der echte
 * HeyGen-Lauf ist noch nicht gebaut.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Luxury Video Bewerbung — für Top Jobs | LuxuryBandit",
  description: "Upload your photo and resume — AI reads it and shows you which jobs fit. Get your own profile page to share with employers.",
  alternates: { canonical: "/themes/lebenslauf" },
};

const TEXTE: Record<string, { anlass: string; grund: string; wieGeht: string[]; wieGehtPrivat: string; kicker: string; lead: string }> = {
  de: {
    kicker: "Für Top Jobs",
    lead: "Foto und Lebenslauf hochladen — die KI zeigt dir, wofür du dich bewerben kannst.",
    anlass: "Für die Jobsuche · für den Quereinstieg · wenn der Lebenslauf allein nicht zeigt, was du kannst",
    grund: "Ein PDF wird überflogen und vergessen. Eine Profilseite mit Bild und klaren Berufsvorschlägen bleibt offen.",
    wieGeht: ["Lade ein Foto von dir hoch und deinen Lebenslauf.", "Die KI liest ihn aus und schlägt passende Berufe vor.", "Teile deine fertige Profilseite mit Firmen."],
    wieGehtPrivat: "Niemand sonst sieht sie. Deine Seite bleibt privat, solange du sie nicht selbst teilst.",
  },
  en: {
    kicker: "For top jobs",
    lead: "Upload your photo and resume — the AI shows you what you could apply for.",
    anlass: "For the job search · for a career change · when your resume alone doesn't show what you can do",
    grund: "A PDF gets skimmed and forgotten. A profile page with a picture and clear job suggestions stays open.",
    wieGeht: ["Upload your photo and your resume.", "The AI reads it and suggests jobs that fit.", "Share your finished profile page with employers."],
    wieGehtPrivat: "Nobody else sees it. Your page stays private unless you share it yourself.",
  },
};

export default async function LebenslaufThemePage() {
  const L = await resolveLang();
  const T = kissText(L, "lebenslauf");
  const t = TEXTE[L] ?? TEXTE.en;
  const preisCents = themenPreisCents("lebenslauf");
  const preisZeile = `${T.generateNow} — ${eur(preisCents, L)}`;

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="lebenslauf_view" lookId="themes-lebenslauf" lookName="Lebenslauf-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{t.kicker}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <Lead className="mt-2">{t.lead}</Lead>

        <ThemenVorspann anlass={t.anlass} grund={t.grund} wieGeht={t.wieGeht} wieGehtPrivat={t.wieGehtPrivat} />

        <LandingKarte sprache={L} titel={t.kicker}
          href="/themes/lebenslauf/start"
          teilenUrl="/themes/lebenslauf?utm_source=share" teilenText={t.kicker}
          preisZeile={preisZeile}
          folien={[{ video: GEBURTSTAG_VIDEO_MANN, poster: "/Birthday/hbd-fliege.jpg" }]} />
      </div>
      <SeitenFuss />
    </main>
  );
}
