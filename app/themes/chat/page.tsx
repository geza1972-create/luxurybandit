import TopNav from "@/components/TopNav";
import LandingKarte from "@/components/LandingKarte";
import { BELLA_ID } from "@/lib/bella-card";
import { fillPrices, CHAT_STUFEN, eur } from "@/lib/pricing";
import TrackView from "@/components/TrackView";
import PaidReturn from "@/components/PaidReturn";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import ChatInhalt, { chatTexte } from "@/components/ChatInhalt";
import ChatFunnel from "@/components/ChatFunnel";
import ThemenVorspann from "@/components/ThemenVorspann";
import SeitenFuss from "@/components/SeitenFuss";
import { resolveLang } from "@/lib/lang-server";
import { ordnerVideos } from "@/lib/tryon-videos";
import { trObject } from "@/lib/tr-object";

/**
 * THEMA „SCHENK IHM EINE PERFEKTE KI-FREUNDIN" — ein Geschenk, kein Abo.
 *
 * Einer zahlt EINMAL 14,99 EUR (CHAT_STUFEN, `chat-zugang-checkout`, one_time), ein anderer
 * bekommt einen Monat mit Bella. Verlaengern tut danach DER EMPFAENGER, und drinnen kann er
 * Videos mit ihr kaufen (BELLA_VIDEO_CENTS, 9,99 EUR — noch nicht gebaut).
 *
 * Hier stand der Stand vom Juli: „Chat with an AI girl", eine Frau aus dem Katalog oder ein
 * eigenes Foto, 24,50 EUR/Monat mit 5 Looks ueber alle Themen. Davon stimmt heute kein
 * einziger Teil — die Modelauswahl und das Anziehen sind am 03.08. raus, das Themen-Abo ist
 * abgeschafft, und der Chat ist seit dem 05.08. ein Geschenk.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat with Bella — write with her every day | LuxuryBandit",
  description: "Bella writes back in your language, every day. The first messages are free, then the first month for a small one-off — extend monthly, cancel anytime.",
  keywords: ["chat with ai girl", "ai girlfriend chat", "ai chat girl", "virtual girlfriend app", "ai companion chat", "ai model chat", "dress up ai model", "ai influencer chat"],
  alternates: { canonical: "/themes/chat" },
  /* Ohne eigenes openGraph erbt diese Seite das Haus-Bild aus app/layout.tsx (LB-Logo) —
     Bild wie in der Katalog-Kachel (app/themes/page.tsx). */
  openGraph: {
    title: "Chat with Bella — write with her every day",
    description: "Bella writes back in your language, every day. The first messages are free, then the first month for a small one-off — extend monthly, cancel anytime.",
    type: "website",
    url: "/themes/chat",
    images: [{ url: "/Chat/chat-poster-og.jpg", width: 720, height: 720 }],
  },
};

/**
 * ÜBERSCHRIFT UND GRUND — VON HAND, NICHT DURCH DIE MASCHINE.
 *
 * Owner 05.08.2026, Wort für Wort: „Schenk ihm eine perfekte KI-Freundin zu Chatten. Dann, er
 * steht auf perfekte Frauen, und will immer ja hören? Das ist das richtige Geschenk für ihn."
 *
 * WARUM NICHT `trObject` WIE DER REST DER SEITE: Weil es nachweislich schiefgeht. Die
 * Überschrift ist in drei Teile zerlegt (Vorlauf · Goldwort · Emoji), und die Maschine
 * übersetzt jeden Teil FÜR SICH — sie sieht den Satz nie ganz. Auf Rumänisch kam dabei
 * „Dă-i un cadou prietenă AI perfectă" heraus: grammatisch kaputt, weil „Fă-i cadou O
 * prietenă…" den Artikel im ersten Teil braucht, den es dort nicht gibt.
 *
 * Es ist derselbe Befund wie auf der Urlaubsseite (`WERBUNG` in app/themes/holiday/page.tsx):
 * Erklärtexte übersetzt die Maschine gut, WERBUNG nicht. Ein Werbesatz lebt vom Rhythmus und
 * vom richtigen Verb — „Give him" wird zu „Gib ihm", und aus dem Schenken wird ein Reichen.
 *
 * Die vier Absätze weiter unten (s1p…s4p) bleiben bewusst bei `trObject`: Das sind Erklärungen,
 * und sieben handgepflegte Tabellen je Seite altern beim ersten Textwechsel.
 */
const WERBUNG: Record<string, { h1a: string; h1b: string; h1c: string; grund: string; kartenTitel: string }> = {
  de: { h1a: "Schenk ihm eine ", h1b: "perfekte KI-Freundin", h1c: " 💛",
        grund: "Er steht auf perfekte Frauen und will immer Ja hören? Dann ist das das richtige Geschenk für ihn.",
        kartenTitel: "Mein Geschenk für dich: Bella, die perfekte KI-Freundin" },
  en: { h1a: "Gift him a ", h1b: "perfect AI girlfriend", h1c: " 💛",
        grund: "He likes his women perfect and wants to hear yes every time? Then this is the right present for him.",
        kartenTitel: "My present for you: Bella, the perfect AI girlfriend" },
  ro: { h1a: "Fă-i cadou o ", h1b: "prietenă AI perfectă", h1c: " 💛",
        grund: "Îi plac femeile perfecte și vrea să audă mereu da? Atunci ăsta e cadoul potrivit pentru el.",
        kartenTitel: "Cadoul meu pentru tine: Bella, prietena AI perfectă" },
  es: { h1a: "Regálale una ", h1b: "novia IA perfecta", h1c: " 💛",
        grund: "¿Le gustan las mujeres perfectas y quiere oír que sí siempre? Entonces este es el regalo para él.",
        kartenTitel: "Mi regalo para ti: Bella, la novia IA perfecta" },
  fr: { h1a: "Offre-lui une ", h1b: "petite amie IA parfaite", h1c: " 💛",
        grund: "Il aime les femmes parfaites et veut toujours entendre oui ? Alors c'est le cadeau qu'il lui faut.",
        kartenTitel: "Mon cadeau pour toi : Bella, la petite amie IA parfaite" },
  pt: { h1a: "Oferece-lhe uma ", h1b: "namorada IA perfeita", h1c: " 💛",
        grund: "Gosta de mulheres perfeitas e quer ouvir sim sempre? Então é este o presente certo para ele.",
        kartenTitel: "O meu presente para ti: Bella, a namorada IA perfeita" },
  it: { h1a: "Regalagli una ", h1b: "fidanzata AI perfetta", h1c: " 💛",
        grund: "Gli piacciono le donne perfette e vuole sentirsi dire sempre di sì? Allora è questo il regalo giusto per lui.",
        kartenTitel: "Il mio regalo per te: Bella, la fidanzata AI perfetta" },
};

export default async function ChatThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  // Aktionscode aus der Anzeige — er probiert erst gratis, der Rabatt gilt trotzdem,
  // wenn er später freischaltet.
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);

  // TEXTE: englisch im Code, zur Laufzeit übersetzt (Dauer-Cache) — sonst altert jede
  // Änderung sofort in sieben Sprachen und niemand pflegt es nach.
  const L = await resolveLang();
  const W = WERBUNG[L] ?? WERBUNG.en;

  /**
   * ZWEI VIDEOS VON BELLA IN DIE KARTE (Owner 05.08.2026: „wir haben doch videos von Bella.
   * Mach noch zwei da rein." · davor: „mach ein paar dessous bilder als beispiel was er im chat
   * bekommt" — „oder nicht. Am besten in der karte oben im karusell").
   *
   * SIE WERDEN NICHT ERZEUGT, SIE LIEGEN SCHON DA. Bella hat sechs eigene Folien im
   * Karten-Studio, zwei davon mit `garmentCat: "lingerie"`. Ein neues Bild hätte bei jedem
   * Lauf Geld gekostet und eine zweite Bella erfunden; diese hier sind sie selbst, und sie
   * sind genau das, was der Beschenkte im Chat bekommt.
   *
   * WARUM NICHT `public/Kisslingerie`: Dort liegen vier fertige Dessous-Clips — aber darauf
   * steht ein PAAR, Frau und Mann. Sie gehören zum Kuss. Auf einer Seite, deren erster Absatz
   * „Du wählst nicht aus einem Raster von Gesichtern. Es ist Bella" verspricht, wäre eine
   * fremde Frau der teuerste Widerspruch, den man einbauen kann.
   *
   * Versteckte und private Folien bleiben draussen: „privat" heisst, dass eine Kundin sie
   * bezahlt hat, „versteckt" heisst, der Owner hat sie aussortiert. Fällt der Speicher aus,
   * ist die Liste leer und die Karte zeigt einfach nur das Einladungsvideo — kein leerer
   * Rahmen und keine kaputte Seite.
   */
  /* Die Studio-Folien-Ladung stand hier — raus am 13.08.2026 (Owner: nur eins):
     die Karte spielt ausschliesslich public/Chat. */

  const t = await chatTexte(L, code);

  /* Hier wurden die Beispielbilder und die Showcase-Clips geholt — beide nur fuer den
     geloeschten Streifen. Zwei Netzaufrufe je Seitenaufruf fuer Daten, die niemand mehr sieht. */

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="chat_view" lookId="themes-chat" lookName="Chat-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{t.kicker}</Kicker>
        <H1>{W.h1a}<Y>{W.h1b}</Y>{W.h1c}</H1>
        {/*
          * AUFBAU WIE BEI DER HOCHZEIT (Owner 03.08.2026: „Chat muss wie bei der Hochzeit
          * stehen" · „und Text auf Landingpage ändern, wie bei Wedding").
          *
          * Dort gilt seit dem 02.08. die Regel: OBEN genau drei Zeilen — Kicker, Überschrift,
          * EIN Satz —, dann sofort die Karte; jeder ABSATZ steht unter ihr. Der Grund ist die
          * Reihenfolge des Verstehens: Die Karte sagt in einer halben Sekunde, was hier
          * entsteht; ein Absatz braucht dafür zehn Sekunden Lesen, und die gibt uns kaum
          * jemand. Für Google ändert sich nichts — die Texte stehen weiter im Quelltext, nur
          * weiter unten. Die Suchmaschine liest, sie scrollt nicht.
          *
          * Hier standen fünf Zeilen Fließtext ÜBER dem Video. Wer sie las, hatte die
          * Einladung noch nicht gesehen.
          */}
        <Lead className="mt-2">Bella {t.claim}</Lead>

        {/* ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE — derselbe Baustein wie auf den vier
            anderen Themenseiten (`components/ThemenVorspann`). Hier fehlte er ganz: Zwischen
            Preis und Trichter stand nichts, was sagt, WOFÜR man das kauft. */}
        <ThemenVorspann anlass={t.anlass} grund={W.grund}
          wieGeht={[t.schritt1, fillPrices(t.schritt2, L).replace("{chatstart}", eur(CHAT_STUFEN[0].cents, L)), t.schritt3]} wieGehtPrivat={t.privat} />

        <PaidReturn lang={L} />

        {/*
          * DAS EINLADUNGSVIDEO (Owner 03.08.2026: „für den Chat nimm das Video, das ich dir in
          * public unter Chat reingestellt habe").
          *
          * Es steht GROSS und ALLEIN ueber dem Kachelstreifen, nicht als siebte Kachel darin.
          * Der Owner hat es „Private Chat Invitation" genannt — eine Einladung ist etwas, das
          * man ansieht, keine Auswahl, durch die man wischt.
          *
          * `SchleifenVideo` statt `loop` ist die Hausregel seit heute Vormittag: Am Ende steht
          * ein anderes Bild als am Anfang, `loop` schnitte also alle paar Sekunden hart um.
          *
          * Der Pfad ist prozentkodiert, weil die Datei Leerzeichen im Namen hat. Auf Vercel
          * zaehlt ausserdem die Gross-/Kleinschreibung — „/Chat/" mit grossem C ist Absicht.
          */}
        {/* IN DER KARTE, nicht nur in ihrer Innenflaeche (Owner 03.08.2026: „das Video hat
            keinen Playbutton und steht nicht in Card").
            Er hatte recht: `EinladungAnsicht` ist nur das Videofeld — Rahmen, Titel, Ranken und
            die Herkunftszeile macht `EinladungKarte`. Genau die Karte, von der Bildschirmfotos
            gemacht werden, und genau die, die er ueberall sehen will. */}
        <LandingKarte sprache={L} titel={W.kartenTitel}
          href={`/themes/chat/start${code ? `?code=${encodeURIComponent(code)}` : ""}`}
          teilenUrl="/themes/chat?utm_source=share" teilenText={t.kicker}
          verhaeltnis="aspect-[9/16]"
          /* Die Konditionszeile unter der Karte — Beträge aus der Tabelle (chatstart/monat). */
          preisZeile={fillPrices(t.schritt2, L).replace("{chatstart}", eur(CHAT_STUFEN[0].cents, L))}
          /* DIE FOLIEN KOMMEN AUS public/Chat (Owner 13.08.2026: „ich habe doch einen
             Ordner in Public angelegt") — der Ordner ist die Pflege-Oberfläche wie bei
             Try-on; Bellas Studio-Folien hängen sich hinten an, solange sie da sind. */
          /* NUR der Ordner (Owner 13.08.2026: „also nur eins") — keine Studio-Folien mehr
             dahinter; was auf der Karte laufen soll, liegt in public/Chat. */
          folien={ordnerVideos("Chat")} />

        {/* HIER STAND DER BEISPIEL-STREIFEN (Owner 03.08.2026, mit Bildschirmfoto: „das ist
            ueberfluessig"). Zwei Fotos aus dem Speicher und bis zu sechs Kacheln aus
            `/api/showcase-clips` — Ergebnisse aus der ANZIEH-Kette, die es seit heute nicht mehr
            gibt. Sie zeigten also ein Produkt, das man nicht mehr kaufen kann, direkt unter der
            Einladung, die das echte zeigt. Zwei Angebote nebeneinander, von denen eines nicht
            existiert. */}

        {/* ALLE ABSAETZE UNTER DIE KARTE — der Block, den die Hochzeit „fuer Google, nicht
            fuer den Besucher" nennt. */}
        <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
          <div><SectionTitle>{t.s1h}</SectionTitle><Lead>{t.s1p}</Lead></div>
          <div><SectionTitle>{t.s2h}</SectionTitle><Lead>{t.s2p}</Lead></div>
          <div><SectionTitle>{t.s3h}</SectionTitle><Lead>{t.s3p}</Lead></div>
          <div><SectionTitle>{t.s4h}</SectionTitle><Lead>{t.s4p}</Lead></div>
          <div><Lead>{t.lead}</Lead></div>
          <div><Fine>{fillPrices(t.fine, L).replace("{chatstart}", eur(CHAT_STUFEN[0].cents, L))}</Fine></div>
        </section>

        {code && (
          <p className="mt-4 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-4 py-3 text-[13px] font-bold leading-snug text-[#f6cf51]">{fillPrices(t.codeNote, L)}</p>
        )}

        {/* NUR BELLA (Owner 03.08.2026: „wir machen nur Bella als Chat fertig. Kein
            Modelauswahl"). Ihre Kennung liegt in lib/bella-card.ts — dieselbe, die auch die
            Landingpages benutzen; sie hier abzuschreiben hiesse, sie beim naechsten Umzug an
            zwei Orten zu suchen. */}
        <ChatFunnel code={code} lang={L} nurEine={BELLA_ID} />
        {/* DER INHALT DER LANDINGPAGE — aus einer gemeinsamen Datei, damit der Tunnel
            exakt dasselbe unter seinem Anmeldeformular zeigt (Owner 14.08.2026). */}
        <ChatInhalt t={t} />
      </div>
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss />
    </main>
  );
}
