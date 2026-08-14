import Link from "next/link";
import { SectionTitle, Lead } from "@/components/Landing";
import ThemenVorspann from "@/components/ThemenVorspann";
import ZusagenKarte from "@/components/ZusagenKarte";
import GruppenChat from "@/components/GruppenChat";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import { trObject } from "@/lib/tr-object";
import { fillPrices } from "@/lib/pricing";
import type { kissText } from "@/lib/kiss-i18n";

/* Die Demo-Daten der Seite — sie zeigen Zusagenliste und Gruppenchat und ziehen mit
   dem Inhalt um, damit Landingpage und Tunnel dieselbe Vorschau zeigen. */
const DEMO_ZUSAGEN = [
  { name: "Maria & Radu", ja: true, menu: "vegetarisch" as const, personen: 2 }, { name: "Andrei Ionescu", ja: true, personen: 1 },
  { name: "Sofia & Matei", ja: true, menu: "vegan" as const, personen: 2 }, { name: "Luca Popescu", ja: false }, { name: "Elena & Cristian", ja: true, personen: 2 },
];
const DEMO_NAMEN = ["Maria", "Andrei", "Maria", "Sofia"];
const DEMO_CHAT: Record<string, string[]> = {
  de: ["Jochen und Gina sitzen am Tisch 6.", "Können wir eine Volksmusik-Band bekommen?", "Wie wird das Wetter?", "Hilfe, ich habe mein Kleid zu Hause vergessen — wo finde ich eins in der Stadt?"],
  en: ["Jochen and Gina are at table 6.", "Could we get a folk band?", "What's the weather going to be like?", "Help, I left my dress at home — where can I find one in town?"],
  ro: ["Jochen și Gina stau la masa 6.", "Putem avea o formație de muzică populară?", "Cum va fi vremea?", "Ajutor, mi-am uitat rochia acasă — de unde pot lua una în oraș?"],
  es: ["Jochen y Gina están en la mesa 6.", "¿Podemos tener un grupo de música popular?", "¿Qué tiempo va a hacer?", "¡Socorro! Me he dejado el vestido en casa — ¿dónde encuentro uno en la ciudad?"],
  fr: ["Jochen et Gina sont à la table 6.", "Peut-on avoir un groupe folklorique ?", "Quel temps fera-t-il ?", "Au secours, j'ai oublié ma robe — où en trouver une en ville ?"],
  pt: ["O Jochen e a Gina estão na mesa 6.", "Podemos ter uma banda de música popular?", "Como vai estar o tempo?", "Socorro, deixei o vestido em casa — onde arranjo um na cidade?"],
  it: ["Jochen e Gina sono al tavolo 6.", "Possiamo avere una band di musica popolare?", "Che tempo farà?", "Aiuto, ho dimenticato il vestito a casa — dove ne trovo uno in città?"],
};

/**
 * DIE TEXTE DER HOCHZEITSSEITE — EINE QUELLE FUER LANDINGPAGE UND TUNNEL.
 */
export async function weddingTexte(L: string) {
  return trObject({
    s1h: "A wedding invitation as a video — with the two of you in it",
    s1p: fillPrices("Instead of a printed card, your digital wedding invitation is a short video in which you and your partner appear on your own wedding day — you in a white dress, him in a white suit, in the church. Upload one photo of yourself and one of him; the AI does the rest. Every video costs {once} — there is no free trial.", "en"),
    /* Ohne das doppelte „you": Daraus machte die Maschine „Ein Link — du sendest ihn so, wie
       du bereits alles sendest". Kurze Quellsaetze ohne wiederholtes Fuerwort uebersetzen
       sich in allen sieben Sprachen sauberer. */
    s2h: "One link, sent from your phone",
    s2p: "Every invitation gets its own page with your names, the date and the address. You send that one link with your phone, wherever your guests already are. No app for them, no login, no printing, no postage. The invitation speaks your guests' language by itself: whoever opens it reads it in their own — English, Romanian, French, Spanish, Portuguese, Italian or German — so the relatives abroad get the same invitation as everyone at home. You can take the link back at any time, and you see how many guests have opened it.",
    s3h: "Save the date — in the weeks before the wedding",
    s3p: "Most couples send a save-the-date two to four months before the wedding and the full invitation six to eight weeks ahead. A video invitation gets watched instead of skimmed, and it works the same for guests abroad — they open the same link on their phone.",
    s4h: "Your photos stay yours",
    s4p: "The two photos you upload are used to make your video and nothing else. They are never published and never shown to other users, they are stored on servers in the EU, and everything from a visit without a purchase is deleted after 90 days. The invitation page itself is not listed anywhere and cannot be found on Google — only the people you send the link to can open it.",
    zusCap: "With the subscription: your guests reply with one tap and say how many are coming — you always see the exact guest count and every menu choice.",
    chatCap: "Also in the subscription: the group chat for all your guests — no app, no login needed.",
    /* DER WEG ZUR MUSTER-EINLADUNG (11.08.2026). Sie ist die vollständigste Seite im Haus —
       Video, Gästeliste, Menüwahl, Gruppenchat, alles anfassbar — und war von der
       Verkaufsseite aus NICHT erreichbar: Nur wer den Teilen-Knopf drückte, kam je hin.
       „Genau so, wie eure Gäste sie bekommen" sagt in einem Satz, was vier Absätze
       behaupten. */
    beispiel: "See a real invitation — exactly as your guests get it",
    kicker: "Digital wedding planner",
    claim: "Your wedding invitation as a video — plus the guest list, menu choices and a group chat. All in one link.",
  }, L);
}

/**
 * DER KUNDEN-INHALT DER HOCHZEITS-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT
 * (Owner 14.08.2026, Dauerregel: alles von der Landingpage auch im Tunnel, unter dem
 * Anmeldeformular).
 *
 * NUR DER KUNDENZWEIG: Die Hochzeitsseite traegt hinter demselben `showCustomer`-Schalter
 * auch die Verwaltung — Galerie, Braeute, Abonnenten, Einladungen, Videos. Die bleibt, wo
 * sie ist. Waere sie mit umgezogen, staenden Nutzerlisten und Uploads im Kundentrichter;
 * deshalb schneidet diese Datei genau am `) : (` der Verzweigung ab, und ein Test in der
 * Ausgliederung hat geprueft, dass kein `AdminTabs`/`UploadsAdmin` mitgekommen ist.
 */
export default function WeddingInhalt({ T, t, L }: {
  T: ReturnType<typeof kissText>;
  t: Record<string, string>;
  L: string;
}) {
  return (
    <>

            {/* AUCH DER EINE SATZ STEHT UNTER DER KARTE — gemessen (Owner 10.08.2026: „ich
                will den CTA im Viewport shen"). Mit ihm darüber lag der Kaufknopf bei 868 px,
                also 56 px ausserhalb; die Hochzeitskarte ist die höchste im Haus, weil über
                dem Video noch die Namen stehen. Oben bleiben Kicker und Überschrift. */}
            <Lead className="mt-2">{t.claim}</Lead>

            {/* EIN TIPP AUF DIE FERTIGE EINLADUNG — direkt unter der Karte, weil hier die
                Frage steht, die den Kauf aufhält: „Was bekomme ich eigentlich?" Kein zweiter
                Knopf, sondern eine Zeile: Der Kaufknopf in der Karte darüber soll der einzige
                Knopf im ersten Bild bleiben (Landingpage.md §9). */}
            <div className="mt-2 text-center">
              <Link href="/einladung/beispiel"
                className="font-serif text-[13px] font-bold text-[#f6cf51] underline underline-offset-4">
                {t.beispiel} →
              </Link>
            </div>

            {/* DER VORSPANN STEHT UNTER DER KARTE — Seitenkopf-Template (Owner 10.08.2026:
                „ich will den CTA im Viewport shen" · „Selbe template wie CI", Landingpage.md
                §9). Anlass, Grund und die drei Schritte standen zwischen Überschrift und
                Karte und schoben den Kaufknopf aus dem Bild: erklärt wurde, bevor etwas zu
                sehen war. */}
            <ThemenVorspann anlass={T.anlass} grund={T.grund}
              wieGeht={T.wieGeht} wieGehtPrivat={T.wieGehtPrivat} />

            {/* SOFORT SEHEN, WAS MAN BEKOMMT: Zusagenliste und Gruppenchat als Demo. */}
            <div className="mt-6 space-y-4">
              <p className="text-center text-[12px] font-bold leading-snug text-white/60">✓ {t.zusCap}</p>
              <ZusagenKarte sprache={KARTE_TEXTE[L] ? L : "en"} demo zusagen={DEMO_ZUSAGEN} />
              <p className="pt-2 text-center text-[12px] font-bold leading-snug text-white/60">✓ {t.chatCap}</p>
              <GruppenChat sprache={KARTE_TEXTE[L] ? L : "en"} demo sie="Ana" er="Mihai"
                nachrichten={(DEMO_CHAT[L] ?? DEMO_CHAT.en).map((t, i) => ({ name: DEMO_NAMEN[i] ?? "Gast", text: t }))} />
            </div>

            {/* GROSS UND MIT TON (Owner 30.07.2026: „bitte mit vergroessern und song").
                Eine Reihe statt zweier Spalten: Ein Hochzeitskuss auf halber Breite ist eine
                Briefmarke — das ist das Bild, das den Trichter verkauft. Der Ton startet
                stumm, weil jeder Browser Ton ohne Zutun blockiert; ein Tipp auf den Knopf
                schaltet ihn an (siehe ExampleVideos). */}
            {/* HIER WIRD NUR ERZEUGT (Owner 31.07.2026: „es ist alles so kompliziert auf
                dieser Seite, ich verstehe nichts mehr. Mehrere CTAs" — „auf dieser Seite
                generiert der User nur, sonst darf er nichts sehen").

                Gezaehlt waren es 16 anklickbare Dinge und DREI verschiedene Preis-Knoepfe.
                Jeder einzelne war fuer sich begruendbar; zusammen haben sie die eine Frage
                zugedeckt, auf die es ankommt: zwei Fotos hochladen und auf Erzeugen tippen.

                Beispiele, Sprachauswahl, Vorschaukarte, Leistungsliste und Kaufkasten sind
                deshalb weg. Sie sind nicht falsch — sie stehen nur am falschen Ort. Was er
                bekommt, sieht er in SEINER Einladung, gleich nachdem das Bild fertig ist;
                bezahlt wird, wenn die Probewoche endet. Der Text unten bleibt: Er ist fuer
                Google, nicht fuer den Besucher, und steht weit unterhalb. */}
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
