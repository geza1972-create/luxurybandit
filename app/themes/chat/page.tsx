import TopNav from "@/components/TopNav";
import { MadeBy } from "@/components/CI";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import EinladungKarte from "@/components/EinladungKarte";
import { BELLA_ID } from "@/lib/bella-card";
import { fillPrices } from "@/lib/pricing";
import TrackView from "@/components/TrackView";
import PaidReturn from "@/components/PaidReturn";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import ChatFunnel from "@/components/ChatFunnel";
import ThemenPreis from "@/components/ThemenPreis";
import ThemenVorspann from "@/components/ThemenVorspann";
import SeitenFuss from "@/components/SeitenFuss";
import KartenKarussell from "@/components/KartenKarussell";
import { getSignedUrl, readCardStudioSlides } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
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
  description: "Bella writes back in your language, every day. The first messages are free, then one payment for a month — no subscription.",
  keywords: ["chat with ai girl", "ai girlfriend chat", "ai chat girl", "virtual girlfriend app", "ai companion chat", "ai model chat", "dress up ai model", "ai influencer chat"],
  alternates: { canonical: "/themes/chat" },
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
  const bellaVideos = (await (async () => {
    const folien = await readCardStudioSlides(BELLA_ID).catch(() => []);
    const dessous = folien
      .filter(s => s.kind === "video" && s.hidden !== true && s.private !== true && s.garmentCat === "lingerie")
      .slice(0, 2);
    const urls = await Promise.all(dessous.map(s => (s.path ? getSignedUrl(s.path).catch(() => "") : Promise.resolve(""))));
    return urls.filter(Boolean);
  })());

  const t = await trObject({
    kicker: "LuxuryBandit · Chat",
    lead: "Bella answers in German, English, Romanian, Spanish, French, Italian — whatever language you write in, and she switches the moment you do. No settings, no language picker.",
    // NEU 03.08.2026 (Owner: „er kauft ein Model, ein Chat"): Hier stand das Abo fuer
    // Bilder und Videos — beides ist heute aus dem Chat entfernt. Ein Werbesatz, der ein
    // Produkt beschreibt, das man nicht mehr kaufen kann, kostet mehr als er bringt.
    fine: "The first messages are free. Then you pick how long you want to keep writing with her — one payment, no subscription, nothing to cancel.",
    // Auch der Gutschein-Satz sprach von Videos und einem Dauerpreis „solange du bleibst".
    // Ohne Abo gibt es kein Bleiben — es gibt eine Laufzeit, die er selbst waehlt.
    codeNote: `Your code ${code.toUpperCase()} is active — your discount is applied at checkout.`,
    /**
     * ANLASS UND GRUND — das Kuss-Muster (Owner 05.08.2026: „alle Topic-Seiten sollen so
     * aufgebaut werden, ist die Kiss-Seite" · „was ich vermisse jetzt bei topics … die
     * Schritte, die Begründung, der Anlass").
     *
     * Die vier anderen Themen holen diese Zeilen aus `lib/kiss-i18n`; der Chat hat dort keine
     * Variante und läuft über `trObject`. Deshalb steht der Text hier — englisch als Quelle,
     * zur Laufzeit übersetzt, wie alles andere auf dieser Seite auch.
     *
     * DER LETZTE ANLASS IST DER NEUE (Owner 05.08.2026): „Man verschenkt es für den Preis von
     * 14,99 einmalig für einen Monat." Der Chat ist ein Geschenk wie der Kuss — einer zahlt,
     * ein anderer bekommt einen Monat.
     */
    anlass: "For his birthday · for Christmas · for the best friend · for the man who already has everything · for a joke that lasts a whole month",
    /* Genau drei Schritte, wie überall — mehr liest niemand vor dem ersten Tipp. */
    schritt1: "Say hi — the first messages are free.",
    schritt2: "One payment buys a month. No subscription, nothing to cancel.",
    schritt3: "Write whenever you want — she remembers where you stopped.",
    /* Die Privatzeile beantwortet die Frage, die jeden zögern lässt: wer liest das mit? */
    privat: "Your conversation is private — nobody else reads it. And she tells you in the chat, again and again, that she is an AI.",
    s1h: "One woman, not a catalogue",
    // Hier stand „Any woman, not just ours" mit 46 Modellen und dem eigenen Foto — die
    // Auswahl gibt es seit dem 03.08.2026 nicht mehr (Owner: „nur Bella, kein Modelauswahl").
    // Ein Werbetext, der eine Wahl verspricht, die der Trichter nicht anbietet, ist der
    // sicherste Weg, jemanden gleich auf der ersten Seite zu enttäuschen.
    s1p: "You do not pick from a grid of faces. It is Bella — the same woman every time, who remembers what you told her and picks the conversation up where you left it.",
    s2h: "She speaks your language",
    s2p: "Nearly every language works: start in German and she writes German, switch to English mid-conversation and she follows you. No settings, no language picker — just write the way you normally would.",
    /**
     * NUR ER SIEHT SIE SO (Owner 05.08.2026, Wort für Wort: „Nur er kann Bella in sexy
     * Lingerie sehen, sie macht fast alles für ihn, so wie er das von einer Frau erwartet").
     *
     * UND DER PREIS STEHT HIER NICHT (Owner am selben Tag: „das schreibst du nicht was es
     * kostet"). Dieselbe Regel wie beim Preis-Chip: Was es kostet, gehört an die Kasse — nicht
     * an die Stelle, an der er noch gar nicht weiss, ob er es will. Die Zahl steht in
     * `lib/pricing` (BELLA_VIDEO_CENTS) und wird dort geholt, wenn der Knopf kommt.
     *
     * Hier stand vorher „…so often as you like, AT NO EXTRA COST" — das war der Stand vom
     * 03.08., als das Anziehen ausgebaut wurde und nur ihr eigener Bildbestand blieb. Mit den
     * Videos, die er kaufen kann, wäre der Satz eine Zusage, die wir zurücknehmen müssten.
     */
    s3h: "Only he gets to see her like this",
    s3p: "Bella in sexy lingerie — for him alone. She does almost everything for him, the way he expects it from a woman.",
    tonAn: "Sound", tonAus: "Mute",
    /* DER EINE SATZ OBEN — er muss sagen, was man kauft, nicht wie es funktioniert. */
    /* Der Name steht NICHT in dieser Tabelle, sondern fest im Aufbau darunter — Begründung
       oben bei `h1a`. Hier beginnt der Satz deshalb ohne ihn. */
    claim: "writes back in his language, every day — and remembers what he told her yesterday.",
    s4h: "Flirty, but honest",
    s4p: "She flirts, she asks about your day, she teases. What she never does is claim she missed you or that she has feelings — and every so often she reminds you in the chat that she is an AI. That is deliberate: nobody should fall for something that cannot love them back.",
  }, L);

  /* Hier wurden die Beispielbilder und die Showcase-Clips geholt — beide nur fuer den
     geloeschten Streifen. Zwei Netzaufrufe je Seitenaufruf fuer Daten, die niemand mehr sieht. */

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
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
        <ThemenPreis thema="chat" lang={L} className="mt-3" />

        {/* ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE — derselbe Baustein wie auf den vier
            anderen Themenseiten (`components/ThemenVorspann`). Hier fehlte er ganz: Zwischen
            Preis und Trichter stand nichts, was sagt, WOFÜR man das kauft. */}
        <ThemenVorspann anlass={t.anlass} grund={W.grund}
          wieGeht={[t.schritt1, t.schritt2, t.schritt3]} wieGehtPrivat={t.privat} />

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
            titel={W.kartenTitel}
            fuss={<MadeBy karte />}
            /**
             * EINE KARTE, MEHRERE VIDEOS (Owner 05.08.2026: „Am besten in der karte oben im
             * karusell" · „Mach noch zwei da rein").
             *
             * Zuerst die Einladung, danach die beiden Dessous-Videos von Bella — in dieser
             * Reihenfolge, weil das erste sagt, WAS das hier ist, und die beiden anderen, was
             * er bekommt. Das Karussell läuft nach sieben Sekunden von selbst weiter und hält
             * an, sobald jemand mit dem Finger wischt (siehe `KartenKarussell`).
             *
             * Liegt keines der beiden Videos vor, steht hier eine Folie — dann zeigt das
             * Karussell keine Punkte und sieht aus wie die Karte von vorher.
             */
            video={
              <KartenKarussell folien={[
                <EinladungAnsicht key="einladung"
                  id="chat-einladung"
                  videoUrl="/Chat/Private%20Chat%20Invitation_1080p.mp4"
                  zaehlen={false}
                  schleife={false}
                  verhaeltnis="aspect-[9/16]"
                  originalton
                  musik=""
                  tonText={t.tonAn}
                  tonAusText={t.tonAus}
                />,
                ...bellaVideos.map((url, i) => (
                  <EinladungAnsicht key={`bella-${i}`}
                    id={`chat-bella-${i}`}
                    videoUrl={url}
                    zaehlen={false}
                    schleife={false}
                    verhaeltnis="aspect-[9/16]"
                    originalton
                    musik=""
                    tonText={t.tonAn}
                    tonAusText={t.tonAus}
                  />
                )),
              ]} />
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
        {/* DER FUSS — auf jeder Themenseite (Owner 05.08.2026). Impressum, AGB und
            Datenschutz standen nur im Menue; wer aus einer Anzeige kommt, hat sie nie
            gesehen. Siehe components/SeitenFuss. */}
        <SeitenFuss />
    </main>
  );
}
