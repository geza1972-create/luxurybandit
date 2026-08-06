import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { resolveLang } from "@/lib/lang-server";
import { H1, Y, SectionTitle, Lead } from "@/components/Landing";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungBauen from "@/components/EinladungBauen";
import ThemenVorspann from "@/components/ThemenVorspann";
import ZusagenKarte from "@/components/ZusagenKarte";
import ThemenPreis from "@/components/ThemenPreis";
import SeitenFuss from "@/components/SeitenFuss";
import { kissText } from "@/lib/kiss-i18n";
import { trObject } from "@/lib/tr-object";
import { fillPrices } from "@/lib/pricing";
import { getSignedUrl } from "@/lib/try-this-look-store";

/**
 * THEMA „URLAUBS-EINLADUNG" (Owner 04.08.2026: „du machst eine Invitation für Urlaub an
 * jemandem. DU und ich. Das sendet der User dann an die Person. Es wird genauso wie bei
 * Wedding Datum Ort eingetragen. Du musst das Konzept ändern.").
 *
 * DAS IST EIN KONZEPTWECHSEL, kein Umbau. Vorher stand hier „Holiday with your dream girl":
 * ein Fantasievideo mit einer Frau aus unserem Katalog, 25 Momente zum Durchprobieren, für
 * ihn allein — es verliess nie seinen Browser. Jetzt ist es eine EINLADUNG an einen echten
 * Menschen: zwei Fotos, Datum, Ort, ein Video von euch beiden und eine Seite, die er
 * verschickt.
 *
 * Damit wandert das Thema von der Kiss-Maschine in die HOCHZEITS-Maschine — es ist dasselbe
 * Modul (`EinladungBauen`), nur eine andere Variante. Deshalb ist diese Seite fast Zeile für
 * Zeile `app/themes/wedding/page.tsx`: derselbe helle Grund, dieselbe Karte oben, dieselben
 * SEO-Absätze darunter. Wer eine der beiden ändert, sollte in die andere schauen.
 *
 * WAS BEWUSST FEHLT gegenüber der Hochzeit: der Gruppenchat und die Menü-Demo. Eine
 * Urlaubs-Einladung geht an EINEN Menschen — Gästezahl und Caterer gibt es dort nicht.
 *
 * DAS ALTE THEMA LEBT WEITER auf `/themes/bella` (Tenerife with Bella): dieselbe
 * `HolidayFunnel`-Komponente, derselbe Model-Katalog. Sie wurde nicht gelöscht, nur hier
 * abgelöst.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Holiday invitation video — invite someone to come away with you | LuxuryBandit",
  description: "Invite someone on holiday with a video of the two of you. Upload one photo of yourself and one of them, add the date and the place, and send one link — they answer with one tap.",
  keywords: [
    "holiday invitation video", "invite someone on holiday", "digital invitation video",
    "video invitation", "come away with me", "travel invitation card",
    "invitatie video vacanta", "invitation vacances video", "invitación de vacaciones vídeo",
    "convite de férias vídeo", "invito vacanza video", "digitale Urlaubseinladung",
  ],
  alternates: { canonical: "/themes/holiday" },
};

/**
 * DIE ZUSAGE ALS DEMO — dasselbe Muster wie auf der Hochzeitsseite (Owner 01.08.2026: „User
 * muss wissen sofort was er bekommt"). Nur eben in der schlanken Fassung: ein Name, ein Ja.
 * Ohne Menü und ohne Gästezahl, denn genau so sieht die echte Karte beim Urlaub aus.
 */
const DEMO_ZUSAGEN = [{ name: "Ana", ja: true }];

/**
 * DER WERBETEXT — VON HAND, NICHT DURCH DIE MASCHINE (Owner 04.08.2026).
 *
 * Er hat ihn selbst vorgegeben: „Willst du deine Freude zeigen oder du willst jemandem eine
 * schöne Überraschung machen? Visualisiere deinen Wunsch, die Vorfreude wird schöner sein…"
 *
 * WARUM HIER UND NICHT IN `trObject`: Alle anderen Absätze dieser Seite werden zur Laufzeit
 * übersetzt. Bei Erklärtexten geht das gut; bei Werbung nicht. Der Owner hat es selbst
 * gemerkt — der Untertitel „…mit einem Video von euch beiden, die bereits dort sind" war ein
 * Maschinensatz, der grammatisch stimmt und nichts auslöst („was ist das?"). „Die Vorfreude
 * ist das Schönste" wird so zu einem Satz, den niemand fühlt.
 *
 * DER LETZTE SATZ TRÄGT DAS ARGUMENT: Wer jemanden so einlädt, verkauft nicht eine Reise,
 * sondern die Wochen davor. Das ist das Produkt — nicht das Video.
 */
const WERBUNG: Record<string, { frage: string; sichtbar: string; vorfreude: string }> = {
  de: {
    frage: "Willst du jemandem eine Freude machen — oder eine richtige Überraschung?",
    sichtbar: "Mach deinen Wunsch sichtbar. Nicht ‚sollen wir mal wegfahren?’, sondern ihr beide, schon dort: am Strand, in der Altstadt, in der Abendsonne.",
    vorfreude: "Die Reise fängt nicht am Flughafen an. Sie fängt in dem Moment an, in dem sie es öffnet — und die Vorfreude ist oft das Schönste an der ganzen Sache.",
  },
  en: {
    frage: "Do you want to make someone happy — or really surprise them?",
    sichtbar: "Make the wish visible. Not ‚shall we go away sometime?’, but the two of you, already there: on the beach, in the old town, in the evening sun.",
    vorfreude: "The trip does not start at the airport. It starts the moment they open it — and looking forward to it is often the best part of the whole thing.",
  },
  ro: {
    frage: "Vrei să-i faci o bucurie — sau chiar o surpriză?",
    sichtbar: "Fă-ți dorința vizibilă. Nu ‚mergem cândva undeva?’, ci voi doi, deja acolo: pe plajă, pe străduțele vechi, în soarele de seară.",
    vorfreude: "Călătoria nu începe la aeroport. Începe în clipa în care deschide mesajul — iar așteptarea e adesea partea cea mai frumoasă.",
  },
  es: {
    frage: "¿Quieres darle una alegría — o una sorpresa de verdad?",
    sichtbar: "Haz visible tu deseo. No ‚¿nos vamos algún día?’, sino vosotros dos, ya allí: en la playa, en el casco antiguo, con el sol de la tarde.",
    vorfreude: "El viaje no empieza en el aeropuerto. Empieza en el momento en que lo abre — y la ilusión suele ser lo mejor de todo.",
  },
  fr: {
    frage: "Tu veux lui faire plaisir — ou vraiment la surprendre ?",
    sichtbar: "Rends ton envie visible. Pas ‹on partirait un jour ?›, mais vous deux, déjà là-bas : sur la plage, dans la vieille ville, au soleil du soir.",
    vorfreude: "Le voyage ne commence pas à l’aéroport. Il commence au moment où elle l’ouvre — et l’attente est souvent le plus beau de toute l’histoire.",
  },
  pt: {
    frage: "Queres dar-lhe uma alegria — ou uma verdadeira surpresa?",
    sichtbar: "Torna o teu desejo visível. Não ‚vamos viajar um dia destes?’, mas vocês os dois, já lá: na praia, no centro histórico, ao sol da tarde.",
    vorfreude: "A viagem não começa no aeroporto. Começa no momento em que ela abre — e a expectativa é muitas vezes o melhor de tudo.",
  },
  it: {
    frage: "Vuoi farle piacere — o farle davvero una sorpresa?",
    sichtbar: "Rendi visibile il tuo desiderio. Non ‹partiamo un giorno?›, ma voi due, già lì: sulla spiaggia, nel centro storico, nel sole della sera.",
    vorfreude: "Il viaggio non comincia in aeroporto. Comincia nel momento in cui lo apre — e l’attesa è spesso la cosa più bella di tutte.",
  },
};

export default async function HolidayThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const T = kissText(L, "holiday");
  const W = WERBUNG[L] ?? WERBUNG.en;

  // Das Beispielvideo in der leeren Karte — dasselbe, das im Themenkatalog läuft.
  /* ALLE Beispiele, nicht nur das erste — sie liegen jetzt als Karussell in EINER Karte
     (Owner 04.08.2026). So viele, wie im Speicher liegen; fehlende fallen still weg. */
  const examples = (await Promise.all([
    getSignedUrl("try-this-look/videos/holiday-example.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/holiday-example-2.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/holiday-example-3.mp4").catch(() => ""),
    getSignedUrl("try-this-look/videos/holiday-example-4.mp4").catch(() => ""),
  ])).filter(Boolean) as string[];

  /* Englische Quelle im Code, Übersetzung zur Laufzeit mit Dauer-Cache — dieselbe Lösung wie
     auf der Hochzeitsseite. Sieben handgepflegte Tabellen je Seite altern beim ersten
     Textwechsel, und dann steht in fünf Sprachen etwas anderes als in zweien. */
  const t = await trObject({
    kicker: "Holiday invitation",
    claim: "Ask someone to come away with you — with a video of the two of you already there.",
    zusCap: "They answer with one tap: coming, or sorry. You see it straight away.",
    s1h: "An invitation that shows the holiday, not just the words",
    s1p: fillPrices("Instead of a message that says \"fancy a trip?\", they get a short video in which the two of you are already there — walking the beach, sitting on a terrace. Upload one photo of yourself and one of them; the AI does the rest. Every video costs {once} — there is no free trial.", "en"),
    s2h: "One link, sent from your phone",
    s2p: "Your invitation gets its own page with your names, the date and the place. You send that one link wherever you already talk to them. No app, no login, nothing to print. Whoever opens it reads it in their own language — English, Romanian, French, Spanish, Portuguese, Italian or German. You can take the link back at any time, and you see when it was opened.",
    s3h: "Yes or no, in one tap",
    s3p: "The person you invite answers on the same page: coming, or sorry. That is the whole thing — no guest list, no menu, no group chat. A holiday invitation goes to one person, so there is nothing to administrate.",
    s4h: "Your photos stay yours",
    s4p: "The two photos you upload are used to make your video and nothing else. They are never published and never shown to other users, they are stored on servers in the EU, and everything from a visit without a purchase is deleted after 90 days. The invitation page is not listed anywhere and cannot be found on Google — only the person you send the link to can open it.",
  }, L);

  return (
    /* HELL IST DIE VORGABE — genau wie bei der Hochzeit. Eine Einladung ist hell, und der
       Sprung von einer weissen Anzeige auf eine schwarze Seite kostet Klicks. `?light=0`
       schaltet dunkel, der Schalter im Balken überstimmt beides. */
    <main className={`lb-bg min-h-screen text-white${String(sp.light ?? "") === "0" ? "" : " lb-theme lb-fb"}`}>
      <TopNav />
      <TrackView event="holiday_view" lookId="themes-holiday" lookName="Urlaubs-Einladung" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {/* Oben genau drei Zeilen (Kicker, H1, ein Satz) — alle Absätze stehen unter der
            Karte. Dieselbe Reihenfolge wie bei der Hochzeit: Die Karte sagt in einer halben
            Sekunde, was hier entsteht; ein Absatz braucht dafür zehn Sekunden Lesen. */}
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">{t.kicker}</p>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        {/* HIER STAND EIN MASCHINENSATZ (Owner 04.08.2026: „oben steht: die bereits dort
            sind. Was ist das?"). Er kam aus `trObject` — „a video of the two of you already
            there" wird im Deutschen zu einem holprigen Nebensatz. Jetzt der Werbetext des
            Owners, von Hand in sieben Sprachen. */}
        <Lead className="mt-2">{W.frage}</Lead>
        <Lead className="mt-2">{W.sichtbar}</Lead>
        <Lead className="mt-2">{W.vorfreude}</Lead>
        <ThemenPreis thema="holiday" lang={L} className="mt-3" />

        {/* ANLASS · GRUND · DREI SCHRITTE · PRIVATZEILE — das Kuss-Muster (Owner 05.08.2026:
            „alle Topic-Seiten sollen so aufgebaut werden, ist die Kiss-Seite").
            Hier fehlte der ganze Block. Die drei Schritte hatte diese Seite nie — sie erbte
            über die Hochzeit die KUSS-Schritte („Wir machen aus euch beiden ein Kussvideo"),
            was auf einer Urlaubs-Einladung schlicht falsch ist; jetzt stehen eigene in
            `lib/kiss-i18n` (URLAUB). Der Anlass ist der des Owners: Überraschung, Antrag,
            Familienurlaub. */}
        <ThemenVorspann anlass={T.anlass} grund={T.grund}
          wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />

        <div className="mt-5">
          <EinladungBauen lang={L} variant="holiday" beispielVideos={examples} />
        </div>

        {/* Sofort sehen, was der Eingeladene tun kann — in der schlanken Fassung. */}
        <div className="mt-6 space-y-4">
          <p className="text-center text-[12px] font-bold leading-snug text-white/60">✓ {t.zusCap}</p>
          <ZusagenKarte sprache={KARTE_TEXTE[L] ? L : "en"} demo schlicht zusagen={DEMO_ZUSAGEN} />
        </div>

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
