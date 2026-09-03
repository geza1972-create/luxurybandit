import type { Metadata } from "next";
import LandingSeite from "@/components/LandingSeite";
import LandingKarte from "@/components/LandingKarte";
import DavidInhalt from "@/components/DavidInhalt";
import AgentenKarte from "@/components/AgentenKarte";
import { agentenTexteInSprache } from "@/lib/agenten-texte";
import { agentenMitBildern } from "@/lib/agenten";
import { resolveLang } from "@/lib/lang-server";
import { davidTexteInSprache } from "@/lib/david-texte";
import { DAVID_VIDEO, DAVID_POSTER, DAVID_VERHAELTNIS } from "@/lib/david-video";

/**
 * DIE LANDINGPAGE „DAVID · AI PRE-SCREENING" (Owner 28.08.2026, Text diktiert:
 * „Ich brauche eine Landingpage für die Jobseite … Alles in unserem Kiss Design Template.
 * Und danach kommt der eigentliche Tunnel.").
 *
 * SIE IST EINE NEUE SEITE, KEIN UMBAU: `/themes/lebenslauf` (Bewerbungszentrale, Abo,
 * Video-Bewerbung) und der laufende AI-DAVID-Chat in `/themes/lebenslauf/start` bleiben
 * unangetastet. David-Pre-Screening ist ein eigenes Produkt mit eigenem Versprechen
 * („kein weiterer CV-Checker") und bekommt als Nächstes seinen eigenen Tunnel unter
 * `/themes/david/start`.
 *
 * DAS KISS-TEMPLATE, BAUSTEIN FÜR BAUSTEIN (Landingpage.md §9, Skill `ci-design`):
 *   1  `LandingSeite`  — Kopf, Hülle (pt-3, max-w-440), Fuss
 *   2  Kicker + H1 (28 px, zweifarbig)
 *   3  `LandingKarte` — die Creme-Karte mit dem David-Video, Teilen- und Ton-Scheibe,
 *      dem GOLDENEN Knopf im Karten-Inneren und „made by luxurybandit.com" unten
 *   4  die Vertrauenszeile unter der Karte (dort, wo bei den Geschenken der Preis steht)
 *   5  `DavidInhalt` — alles Weitere; dieselbe Datei zeigt der Tunnel später unter
 *      seinem Formular (Dauerregel `tunnel-zeigt-landingpage-inhalt`)
 *
 * KEIN FORMULAR AUF DER SEITE (Landingpage.md §8): kein Upload-Feld, kein Anzeigen-Feld.
 * Was der Bewerber TUT, passiert hinter dem Knopf — im Tunnel.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "David · AI Pre-Screening — was dein Lebenslauf einem Recruiter nicht erzählt | LuxuryBandit",
  description: "David liest deinen Lebenslauf zusammen mit deiner Wunschstelle und führt danach ein persönliches Pre-Screening: die Fragen, die bei deiner Bewerbung noch offen sind. Kein Score, kein Formular.",
  alternates: { canonical: "/themes/david" },
  /* Ohne eigenes openGraph erbt diese Seite das Haus-Bild aus app/layout.tsx (LB-Logo) —
     wer den Link auf Facebook postet, sieht dann die Startseite statt David. Eigenes Bild
     (Standbild aus lib/david-video.ts, dieselbe Quelle wie die Karte) + eigener Titel/Text. */
  openGraph: {
    title: "David · AI Pre-Screening — was dein Lebenslauf einem Recruiter nicht erzählt",
    description: "David liest deinen Lebenslauf zusammen mit deiner Wunschstelle und führt danach ein persönliches Pre-Screening. Kein Score, kein Formular.",
    type: "website",
    url: "/themes/david",
    images: [{ url: DAVID_POSTER, width: 720, height: 1080 }],
  },
};

/* Video, Standbild und Verhältnis stehen in lib/david-video.ts — EINE Quelle für diese
   Karte UND die Kachel im Themen-Katalog (Memory `landingpage-video-ist-kachel-video`).
   Die Begründung für den Schnitt auf 2:3 steht dort. */

export default async function DavidThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  /* Deutsch ist die Rückfall-Sprache, weil der Text deutsch verfasst ist und die Anzeigen
     dieses Produkts auf deutschsprachige Bewerber laufen. Cookie und Browsersprache
     stechen sie weiterhin (lib/lang-server). */
  const L = await resolveLang("de");
  const T = await davidTexteInSprache(L);
  /* Die Firmen-Rubrik: deutsche Quelle, sieben Sprachen (lib/agenten-texte); die Gesichter
     kommen aus der Models-Galerie und werden beim Rendern frisch geholt (lib/agenten). */
  const [AG, agenten] = await Promise.all([agentenTexteInSprache(L), agentenMitBildern()]);
  const hell = String(sp.light ?? "") === "1";
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  /* Der Tunnel — Licht-Fassung und Aktionscode wandern mit, damit eine Anzeige nicht auf
     halbem Weg die Gestalt wechselt. */
  const startHref = `/themes/david/start${(() => {
    const q = new URLSearchParams();
    if (hell) q.set("light", "1");
    if (code) q.set("code", code);
    const s = q.toString();
    return s ? `?${s}` : "";
  })()}`;

  return (
    <LandingSeite hell={hell}
      trackEvent="david_view" trackId="themes-david" trackName="David-Thema"
      marke="LB - David" heim="/themes/david" motto="AI Pre-Screening" lang={L}
      heroA={T.h1a} heroY={T.h1y} heroB={T.h1b}
      kinder={<>
        {/* KEIN KICKER, UNTERZEILE ERST UNTER DER KARTE (Landingpage.md §9: „Kicker nur,
            wenn die Seite ihn wirklich braucht — er kostet eine Zeile"). Beides zusammen
            waren 70 px über dem Video, und das Anzeigen-Video ist hochkant; jede Zeile
            oben schiebt den goldenen Knopf weiter aus dem Bild. Verloren geht nichts:
            „DAVID · AI PRE-SCREENING" steht in der Kopfzeile und noch einmal als
            Karten-Titel, die Unterzeile steht zwei Fingerbreit tiefer. */}

        {/* DIE VIDEO-KARTE — der wichtigste Baustein der Seite. Der goldene
            „Jetzt kostenlos starten" sitzt IM Karten-Inneren, die Vertrauenszeile
            darunter an der Stelle, an der die Geschenke ihren Preis tragen. */}
        <LandingKarte sprache={L} titel={T.kartenTitel} href={startHref} aufruf={T.cta}
          teilenUrl="/themes/david?utm_source=share" teilenText={T.kicker}
          preisZeile={T.trust}
          verhaeltnis={DAVID_VERHAELTNIS}
          folien={[{ video: DAVID_VIDEO, poster: DAVID_POSTER }]} />

        {/* Die Unterzeile — jetzt unter der Karte, als erster Satz nach dem Video. */}
        <p className="mt-4 text-[15px] font-semibold leading-snug text-white/85">{T.sub}</p>

        <DavidInhalt T={T} href={startHref} />

        {/**
          * FÜR UNTERNEHMEN — die Agenten-Rubrik (Owner 02.09.2026: „das raus. Kommt als
          * Beschreibung bei David eher rein. In einer Rubrik. Nicht wegschmeissen komplett").
          *
          * Sie stand bis heute auf der Startseite. Hier ist ihr Platz besser: Wer diese Seite
          * liest, denkt bereits über Recruiting nach — und David IST einer dieser Agenten,
          * das Beispiel steht also direkt über seinem eigenen Fall. Auf der Startseite war
          * es ein zweites Publikum mitten in einem Katalog für ein erstes.
          *
          * NUR AUF DER LANDINGPAGE, NICHT IM TRICHTER: `DavidInhalt` zeigt der Trichter
          * ebenfalls (Dauerregel `tunnel-zeigt-landingpage-inhalt`) — ein Angebot an Firmen
          * gehört aber nicht neben den Upload eines Bewerbers. Deshalb steht sie hier und
          * nicht in `DavidInhalt`.
          */}
        <AgentenKarte T={AG} lang={L} agenten={agenten} />
      </>}
    />
  );
}
