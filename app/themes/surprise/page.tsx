import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { H1, Y } from "@/components/Landing";
import SurpriseInhalt from "@/components/SurpriseInhalt";
import KissFunnel from "@/components/KissFunnel";
import ThemenVorspann from "@/components/ThemenVorspann";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import { POLEDANCE_VIDEO, POLEDANCE_BEISPIELE, POLEDANCE_REFERENZEN } from "@/lib/poledance";
import EinladungKarte from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import ThemenPreis from "@/components/ThemenPreis";
import SeitenFuss from "@/components/SeitenFuss";

/**
 * THEMA „SURPRISE HIM" — DER TANZ (Owner 03.08.2026).
 *
 * DIE SEITE IST NEU GEBAUT, NICHT ERGAENZT. Vorher lief hier ein eigener Trichter
 * (`components/SurpriseFunnel.tsx`, 333 Zeilen) mit einem eigenen Weg: Schein-Rendern,
 * Teaser, zahlen, echtes Rendern, Versand per E-Mail-Link. Der Owner hat entschieden, dass
 * dieses Thema „ueber den gleichen Trichter wie Kiss" laeuft — und damit faellt der zweite
 * Weg weg. Ein Trichter, ein Guthaben, eine Kasse, eine Auslieferung, ein Pflegeort.
 *
 * WAS DIE SEITE UEBERNIMMT: den Aufbau der Kuss-Seite (Owner: „das gleiche Design") —
 * Ueberschrift, drei Zeilen „so geht es", die Privat-Zusage, der Trichter, das Beispielvideo
 * und die Anlaesse. In derselben Reihenfolge und aus derselben Sprachtabelle.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Surprise him with a hot pole dance — one private AI video | LuxuryBandit",
  description: "Upload one photo of yourself and the AI puts you in the outfit and on the pole: a short private video, made for him alone. Nothing is posted anywhere.",
  keywords: ["surprise your boyfriend", "surprise him tonight", "pole dance video", "private video for boyfriend", "ai video from photo", "photo to video ai", "romantic surprise idea"],
  alternates: { canonical: "/themes/surprise" },
};

export default async function SurpriseThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();              // Sprache der Seite (Cookie)
  const T = kissText(L, "poledance");         // Ueberschrift und Zeilen in seiner Sprache
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);   // Aktionscode aus der Anzeige

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav marke="LB - Surprise" heim="/themes/surprise" motto="AI Surprise Videos" />
      <TrackView event="surprise_view" lookId="themes-surprise" lookName="Surprise-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <H1>{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        {/* DER PREIS-CHIP IST RAUS — er steht jetzt IM Kaufknopf (Owner 10.08.2026: „ab 4,99 -
            Jetzt starten. Schreibst du in dem Button"). Zweimal derselbe Preis, vierzig Pixel
            auseinander, ist keine Auskunft, sondern ein Grund, warum der Knopf nicht mehr ins
            Bild passte. Der Baustein `ThemenPreis` bleibt und trägt die anderen Themen. */}

        {/* ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE — das Kuss-Muster (Owner 05.08.2026:
            „alle Topic-Seiten sollen so aufgebaut werden, ist die Kiss-Seite" · „was ich
            vermisse jetzt bei topics … die Schritte, die Begründung, der Anlass").
            Hier standen nur die drei Schritte; Anlass und Grund fehlten — also genau die zwei
            Zeilen, an denen er erkennt, ob das Ding für ihn ist. Der Aufbau steht jetzt in
            `components/ThemenVorspann`, die Texte in `lib/kiss-i18n`. */}

        {/* DAS ERGEBNIS ZUERST (Owner, seit dem Kuss die Hausordnung): erst sehen, was
            herauskommt, dann lesen, wie es geht. Es ist genau das Video, mit dem der Owner
            den Auftrag gegeben hat — und genau das, was die Kette hinten ausspuckt.

            IN DER KARTE, NICHT IN EINEM KASTEN (Owner 03.08.2026: „ich bitte dich, benutze
            IMMER die Cards für die Videos mit Titel oben und Made by Luxurybandit.com. Genau
            wie Kiss"). Hier stand ein nacktes gerundetes Rechteck — dieselbe Datei, aber ohne
            Rahmen, ohne Ranken, ohne Herkunft. Das ist der Unterschied zwischen einer Vorschau
            und einem Geschenk: Die Karte ist das Produkt, das Video ist nur ihr Inhalt.

            `EinladungAnsicht` bringt Ton-Knopf und die weiche Schleife mit (zwei Spieler
            blenden ineinander, kein `loop` — Hausregel: kein Schnitt alle sieben Sekunden). */}
        {/* NUR EINE KARTE, UND ES IST DIE DES TRICHTERS.
            Hier stand kurzzeitig eine zweite, eigene Karte ueber dem Trichter — und darunter
            stand die des Trichters leer da. Zweimal dasselbe Video untereinander ist kein
            „mehr zeigen", sondern ein Fehler, den jeder sieht. Der Trichter nimmt das
            Beispiel entgegen und fuellt seine eigene Karte damit; sobald ihr Video fertig
            ist, tritt es an dieselbe Stelle. Genau wie beim Kuss.

            Der Trichter — derselbe wie beim Kuss, nur mit einem Foto statt zweien. */}
        {/* EINE KARTE FÜR ALLES (Owner 07.08.2026: „es ist eine kard zu viel auf der Pool
            seite"): Die eigene Auswahl-Karte (`TanzAuswahl`) ist weg — die acht Referenzen
            liegen als Folien IM Karussell dieser einen Trichter-Karte, und als
            Bewegungsvorlage gilt beim Erzeugen die Folie, die vorn steht („was du siehst,
            wird nachgetanzt", siehe KissFunnel). Damit bleibt auch die Regel vom 03.08.
            erfüllt — „die Auswahl findet auf der Landingpage statt" — nur ohne zweite
            Karte. `TanzAuswahl` liegt ungenutzt daneben, für den Fall eines Rückbaus. */}
        <div data-trichter>
          <KissFunnel variant="poledance" code={code} lang={L} beispielVideo={POLEDANCE_VIDEO}
            beispielVideos={[POLEDANCE_VIDEO, ...POLEDANCE_REFERENZEN.map(r => r.video)]} />

        </div>

        {/* DER INHALT DER LANDINGPAGE — aus einer gemeinsamen Datei, damit der Tunnel
            exakt dasselbe unter seinem Anmeldeformular zeigt (Owner 14.08.2026). */}
        <SurpriseInhalt T={T} />
      </div>
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss marke="LB - Surprise" />
    </main>
  );
}
