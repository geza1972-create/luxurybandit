import TopNav from "@/components/TopNav";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import EinladungKarte from "@/components/EinladungKarte";
import { BELLA_ID } from "@/lib/bella-card";
import { fillPrices } from "@/lib/pricing";
import TrackView from "@/components/TrackView";
import PaidReturn from "@/components/PaidReturn";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import ChatFunnel from "@/components/ChatFunnel";
import { getSignedUrl } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
import { trObject } from "@/lib/tr-object";

// THEMA „Chat with an AI girl" — der Chat ist die Hauptsache, das Anziehen die Zugabe.
// Er wählt eine Frau aus dem Katalog oder lädt eine eigene hoch, schreibt täglich mit ihr
// und steckt sie in neue Looks: 24,50 €/Monat inkl. 5 Videos/Looks über ALLE Themen,
// jedes weitere 3,99 €. Chatten ist gratis.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat with Bella — write with her every day | LuxuryBandit",
  description: "Bella writes back in your language, every day. The first messages are free, then one payment for a month — no subscription.",
  keywords: ["chat with ai girl", "ai girlfriend chat", "ai chat girl", "virtual girlfriend app", "ai companion chat", "ai model chat", "dress up ai model", "ai influencer chat"],
  alternates: { canonical: "/themes/chat" },
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
  const t = await trObject({
    kicker: "LuxuryBandit · Chat",
    h1a: "Chat with an", h1b: "AI girl",
    lead: "Bella answers in German, English, Romanian, Spanish, French, Italian — whatever language you write in, and she switches the moment you do. No settings, no language picker.",
    // NEU 03.08.2026 (Owner: „er kauft ein Model, ein Chat"): Hier stand das Abo fuer
    // Bilder und Videos — beides ist heute aus dem Chat entfernt. Ein Werbesatz, der ein
    // Produkt beschreibt, das man nicht mehr kaufen kann, kostet mehr als er bringt.
    fine: "The first messages are free. Then you pick how long you want to keep writing with her — one payment, no subscription, nothing to cancel.",
    // Auch der Gutschein-Satz sprach von Videos und einem Dauerpreis „solange du bleibst".
    // Ohne Abo gibt es kein Bleiben — es gibt eine Laufzeit, die er selbst waehlt.
    codeNote: `Your code ${code.toUpperCase()} is active — your discount is applied at checkout.`,
    s1h: "One woman, not a catalogue",
    // Hier stand „Any woman, not just ours" mit 46 Modellen und dem eigenen Foto — die
    // Auswahl gibt es seit dem 03.08.2026 nicht mehr (Owner: „nur Bella, kein Modelauswahl").
    // Ein Werbetext, der eine Wahl verspricht, die der Trichter nicht anbietet, ist der
    // sicherste Weg, jemanden gleich auf der ersten Seite zu enttäuschen.
    s1p: "You do not pick from a grid of faces. It is Bella — the same woman every time, who remembers what you told her and picks the conversation up where you left it.",
    s2h: "She speaks your language",
    s2p: "Nearly every language works: start in German and she writes German, switch to English mid-conversation and she follows you. No settings, no language picker — just write the way you normally would.",
    s3h: "She shows you her pictures",
    // Hier stand „She wears what you choose" mit dem Kleiderschrank und den 25 Bildern im
    // Monat. Das Anziehen ist raus (03.08.2026); was bleibt, ist ihr eigener Bestand —
    // der kostet uns nichts und ist genau der Grund, warum er weiterschreibt.
    s3p: "Ask her to show you another one and she does — her own photos, as often as you like, at no extra cost. The pictures are hers; the conversation is what you pay for.",
    tonAn: "Sound", tonAus: "Mute",
    /* DER EINE SATZ OBEN — er muss sagen, was man kauft, nicht wie es funktioniert. */
    claim: "Write with Bella every day — she answers in your language.",
    kartenTitel: "A private chat",
    s4h: "Flirty, but honest",
    s4p: "She flirts, she asks about your day, she teases. What she never does is claim she missed you or that she has feelings — and every so often she reminds you in the chat that she is an AI. That is deliberate: nobody should fall for something that cannot love them back.",
  }, L);

  /* Hier wurden die Beispielbilder und die Showcase-Clips geholt — beide nur fuer den
     geloeschten Streifen. Zwei Netzaufrufe je Seitenaufruf fuer Daten, die niemand mehr sieht. */

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="chat_view" lookId="themes-chat" lookName="Chat-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <Kicker>{t.kicker}</Kicker>
        <H1>{t.h1a} <Y>{t.h1b}</Y></H1>
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
        <Lead className="mt-2">{t.claim}</Lead>
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
        <div className="mt-5">
          <EinladungKarte
            sprache={L} sie="" er="" demo
            titel={t.kartenTitel}
            fuss={
              <p className="lb-karte-gold mt-3 text-center text-[9px] font-bold uppercase tracking-[0.22em] opacity-70">
                made by luxurybandit.com
              </p>
            }
            video={
              <EinladungAnsicht
                id="chat-einladung"
                videoUrl="/Chat/Private%20Chat%20Invitation_1080p.mp4"
                zaehlen={false}
                schleife={false}
                verhaeltnis="aspect-[9/16]"
                originalton
                musik=""
                tonText={t.tonAn}
                tonAusText={t.tonAus}
              />
            }
          />
        </div>

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
          <div><Fine>{fillPrices(t.fine, L)}</Fine></div>
        </section>

        {code && (
          <p className="mt-4 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-4 py-3 text-[13px] font-bold leading-snug text-[#f6cf51]">{fillPrices(t.codeNote, L)}</p>
        )}

        {/* NUR BELLA (Owner 03.08.2026: „wir machen nur Bella als Chat fertig. Kein
            Modelauswahl"). Ihre Kennung liegt in lib/bella-card.ts — dieselbe, die auch die
            Landingpages benutzen; sie hier abzuschreiben hiesse, sie beim naechsten Umzug an
            zwei Orten zu suchen. */}
        <ChatFunnel code={code} lang={L} nurEine={BELLA_ID} />

        {/* HIER STAND DIE ABO-KARTE `SubscribeCta` (Owner 03.08.2026, mit Bild: „das stimmt
            nicht und kommt raus").

            Sie versprach dreierlei, das es im Chat seit heute nicht mehr gibt: „Videos mit
            ihr — und dir darin", „Chat ist und bleibt gratis" und ein Abo zu 24,50 €/Monat,
            „jederzeit kündbar". Nach dem Umbau ist der Chat nach sieben Nachrichten
            kostenpflichtig, es gibt keine Videos und kein Abo, das man kündigen könnte.

            Die Karte lebt weiter auf /themes/holiday, /themes/bella und /your-idol — dort
            gilt das Abo noch. Sie zu löschen hätte deren Verkauf mit abgeräumt. */}

        <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
          <div>
            <SectionTitle>{t.s1h}</SectionTitle>
            <Lead>{t.s1p}</Lead>
          </div>
          <div>
            <SectionTitle>{t.s2h}</SectionTitle>
            <Lead>{t.s2p}</Lead>
          </div>
          <div>
            <SectionTitle>{t.s3h}</SectionTitle>
            <Lead>{t.s3p}</Lead>
          </div>
          <div>
            <SectionTitle>{t.s4h}</SectionTitle>
            <Lead>{t.s4p}</Lead>
          </div>
        </section>
      </div>
    </main>
  );
}
