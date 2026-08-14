import { SectionTitle, Lead } from "@/components/Landing";
import ThemenVorspann from "@/components/ThemenVorspann";
import ZusagenKarte from "@/components/ZusagenKarte";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import { trObject } from "@/lib/tr-object";
import { fillPrices } from "@/lib/pricing";
import type { kissText } from "@/lib/kiss-i18n";

const DEMO_ZUSAGEN = [{ name: "Ana", ja: true }];

/* Die drei Werbezeilen der Seite — sie wohnten in app/themes/holiday/page.tsx und ziehen
   mit dem Inhalt um, damit Landingpage und Tunnel dieselben Saetze zeigen. */
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

/**
 * DER INHALT DER URLAUBS-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT
 * (Owner 14.08.2026, Dauerregel: alles von der Landingpage auch im Tunnel, unter dem
 * Anmeldeformular).
 *
 * ASYNCHRONE SERVER-KOMPONENTE: Anders als beim Versprechen braucht dieser Rumpf mehr als
 * `T` — die Werbezeilen und die zur Laufzeit uebersetzten Abschnitte. Statt beides in ZWEI
 * Seiten zu wiederholen (und dort auseinanderlaufen zu lassen), holt sich die Komponente
 * alles selbst. Aufrufer reichen nur Sprache und Texttabelle herein.
 */
export default async function HolidayInhalt({ T, L }: {
  T: ReturnType<typeof kissText>;
  L: string;
}) {
  const W = WERBUNG[L] ?? WERBUNG.en;
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
    <>
        {/* ERST DIE KARTE, DANN DIE WORTE — Seitenkopf-Template (Owner 10.08.2026: „Urlaub
            auch nach CI anpassen" · „Video postkarten fehlen", mit Bildschirmfoto: oben drei
            Absätze, ein Preis-Chip und der Vorspann, und von der Karte war nichts zu sehen).
            Die Karte sagt in einer halben Sekunde, was hier entsteht; für die Absätze braucht
            es zehn Sekunden Lesen, die kaum jemand gibt. Landingpage.md §9. */}
        <Lead className="mt-2">{W.frage}</Lead>
        <Lead className="mt-2">{W.sichtbar}</Lead>
        <Lead className="mt-2">{W.vorfreude}</Lead>

        <ThemenVorspann anlass={T.anlass} grund={T.grund}
          wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />

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
    </>
  );
}
