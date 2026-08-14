import { SectionTitle, Lead } from "@/components/Landing";
import { trObject } from "@/lib/tr-object";

/**
 * DIE TEXTE DER CHAT-SEITE — EINE QUELLE FUER LANDINGPAGE UND TUNNEL (Owner 14.08.2026).
 *
 * Die Tabelle stand in `app/themes/chat/page.tsx`. Weil der Tunnel dieselben Abschnitte
 * zeigen soll, muesste er sie sonst ein zweites Mal fuehren — und zwei Fassungen desselben
 * Textes laufen auseinander. Beide Seiten rufen jetzt DIESE Funktion.
 */
export async function chatTexte(L: string, code: string) {
  return trObject({
    kicker: "LuxuryBandit · Chat",
    jetztStarten: "Start now — {chatstart}",
    teilen: "Share",
    lead: "Bella answers in German, English, Romanian, Spanish, French, Italian — whatever language you write in, and she switches the moment you do. No settings, no language picker.",
    // NEU 03.08.2026 (Owner: „er kauft ein Model, ein Chat"): Hier stand das Abo fuer
    // Bilder und Videos — beides ist heute aus dem Chat entfernt. Ein Werbesatz, der ein
    // Produkt beschreibt, das man nicht mehr kaufen kann, kostet mehr als er bringt.
    /* NEUE PREIS-WAHRHEIT (Owner 13.08.2026: „das kostet wie Hochzeit. 9,99 dann 14,99 im
       monat") — der alte Satz versprach „kein Abonnement" und wäre seit heute eine Lüge.
       {chatstart}/{monat} füllt die Seite unten aus der Preistabelle. */
    fine: "The first messages are free. The first month costs {chatstart} — after that it renews at {monat}/month, cancel anytime.",
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
    schritt2: "{chatstart} buys the first month. It renews at {monat}/month — cancel anytime.",
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
}

/**
 * DER INHALT DER CHAT-LANDINGPAGE — EINMAL GESCHRIEBEN, ZWEIMAL GEZEIGT
 * (Owner 14.08.2026, Dauerregel: alles von der Landingpage auch im Tunnel, unter dem
 * Anmeldeformular).
 */
export default function ChatInhalt({ t }: { t: Record<string, string> }) {
  return (
    <>

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
    </>
  );
}
