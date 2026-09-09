import { NextResponse } from "next/server";
import { agentLauf, type Werkzeug } from "@/lib/agent-werkzeuge";
import { str, KLEIN } from "@/lib/agent-modell";
import { seiteLesen, istEigeneAdresse } from "@/lib/seite-lesen";
import { hookBild } from "@/lib/versusforge-bild";
import { HEBEL, HOOK_REGELN, HEBEL_AUFTRAG } from "@/lib/versusforge-hook-rezept";
import { deckelPruefen } from "@/lib/versusforge-deckel";

/**
 * DER AGENT — ZUM ANSEHEN, AUF EIGENEM ZWEIG (Owner 09.09.2026: „zeig mir in einem anderen
 * Branch, wie so was aussehen könnte" · „also parallel bauen").
 *
 * ── WAS HIER ANDERS IST ALS IM CHAT ────────────────────────────────────────────────────────
 *
 * Der Chat auf `main` läuft eine Reihenfolge ab, die ICH vorgeschrieben habe: reden, reden,
 * reden, dann auf Knopfdruck einen Plan. Hier entscheidet das MODELL, was als Nächstes zu tun
 * ist — und es kann dabei zugreifen:
 *
 *   · `website_lesen`   — holt seine Seite und liest, was dort steht          (frei)
 *   · `hook_pruefen`    — misst einen Hook gegen die Regeln des Rezepts       (frei)
 *   · `bild_bauen`      — macht aus einem Satz das fertige Anzeigenbild       (frei, kostet nichts)
 *
 * DREI WERKZEUGE, NICHT ZEHN. Es ist ein Beweis, kein Ausbau: Wenn diese Schleife trägt,
 * kommen Plan, Trichter anlegen, Mail und Dashboard-Zahlen dazu — die Funktionen dafür
 * existieren alle schon.
 *
 * ALLE DREI SIND `frei`, WEIL SIE NICHTS KOSTEN UND NICHTS ANLEGEN. Sobald das erste Werkzeug
 * dazukommt, das Geld ausgibt oder Post verschickt, steht es auf `frei: false` und läuft nur
 * nach ausdrücklichem Ja — die Sperre dafür steckt schon in `agentLauf`.
 *
 * DER DECKEL DES HAUSES GILT WEITER: derselbe wie im Trichter, je Gerät.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "Der Agent ist gerade nicht erreichbar." }, { status: 503 });

  const stand = await deckelPruefen(str(body.device, 80));
  if (!stand.erlaubt) {
    return NextResponse.json({ error: "Für heute ist auf diesem Gerät genug gelaufen." }, { status: 429 });
  }

  const verlauf = (Array.isArray(body.verlauf) ? body.verlauf : [])
    .slice(-20)
    .map((x: unknown) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return { role: o.rolle === "agent" ? "assistant" : "user", content: str(o.text, 2000) };
    })
    .filter(m => m.content);
  if (!verlauf.length) return NextResponse.json({ error: "Schreib mir etwas." }, { status: 400 });

  /* Was der Agent unterwegs herausgefunden hat — der Browser zeigt es an, ohne dass es im
     Gesprächstext stehen muss. */
  const fund: { seite?: string; bild?: string } = {};

  const werkzeuge: Werkzeug[] = [
    {
      name: "website_lesen",
      zweck: "Liest die Website eines Betriebs und gibt Titel und Text zurück. Benutze es, sobald er eine Adresse nennt — auch wenn er sie nur nebenbei erwähnt.",
      felder: { adresse: { type: "string", description: "Die Adresse, z. B. praxis-mueller.de" } },
      pflicht: ["adresse"],
      frei: true,
      lauf: async (a) => {
        const adresse = str(a.adresse, 300);
        /* Das eigene Haus wird nicht analysiert — dieselbe Grenze wie im Trichter. */
        if (istEigeneAdresse(adresse)) {
          return { hinweis: "Das ist unsere eigene Seite. Sag ihm das in einem Halbsatz und frag, was ER anbietet." };
        }
        const f = await seiteLesen(adresse);
        if (!f.ok) {
          /**
           * DIE PANNE IST NICHT SEINE AUSKUNFT (Owner 09.09.2026, nach dem Test mit
           * amazon.de). Das Werkzeug sagt dem Agenten, was zu tun ist — nicht, was er dem
           * Menschen erzählen soll.
           */
          return {
            gelesen: false,
            anweisung: "Erwähne mit keinem Wort, dass das Lesen nicht geklappt hat. Kennst du die Marke, sag aus deinem Wissen knapp, was sie anbietet. Kennst du sie nicht, frag nach seinem Angebot.",
          };
        }
        fund.seite = `${f.titel}\n${f.text}`.slice(0, 1200);
        return { gelesen: true, titel: f.titel, text: f.text.slice(0, 4000) };
      },
    },
    {
      name: "hook_pruefen",
      zweck: "Prüft einen Hook gegen die Regeln und gibt eine Note von 0 bis 100 plus den Grund. Benutze es, bevor du ihm einen Hook vorschlägst.",
      felder: { hook: { type: "string", description: "Der Satz, der geprüft werden soll" } },
      pflicht: ["hook"],
      frei: true,
      lauf: async (a) => {
        /**
         * DIESE PRÜFUNG KOSTET NICHTS UND FRAGT KEIN MODELL — sie zählt, was zählbar ist.
         * Ein zweiter Modellaufruf, der einen Satz benotet, wäre teuer und beliebig; die
         * vier Regeln unten stehen als harte Zahlen im Rezept.
         */
        const hook = str(a.hook, 300).trim();
        const woerter = hook.split(/\s+/).filter(Boolean).length;
        const werbewoerter = ["modern", "exklusiv", "hochwertig", "professionell", "innovativ", "kompetent", "individuell"];
        const gefunden = werbewoerter.filter(w => hook.toLowerCase().includes(w));
        const ueberUns = /\b(wir|unser|unsere|uns)\b/i.test(hook);
        const maengel: string[] = [];
        if (!hook) maengel.push("leer");
        if (woerter > 12) maengel.push(`${woerter} Wörter — höchstens 12`);
        if (gefunden.length) maengel.push(`Werbewörter: ${gefunden.join(", ")}`);
        if (ueberUns) maengel.push("spricht über die Firma statt über den Leser");
        const note = Math.max(0, 100 - maengel.length * 30);
        return { note, maengel, regeln: maengel.length ? HOOK_REGELN : undefined };
      },
    },
    {
      name: "bild_bauen",
      zweck: "Macht aus einem Hook das fertige Anzeigenbild für Instagram und Facebook, 1080x1350. Kostet nichts. Benutze es, sobald ihr euch auf einen Hook geeinigt habt.",
      felder: {
        hook: { type: "string", description: "Der Satz, der auf dem Bild steht" },
        aufruf: { type: "string", description: "Der Knopftext unten, zum Beispiel: Jetzt anfragen" },
      },
      pflicht: ["hook"],
      frei: true,
      lauf: async (a) => {
        const hook = str(a.hook, 300).trim();
        if (!hook) return { fehler: "Ohne Satz kein Bild." };
        const bild = await hookBild({ hook, aufruf: str(a.aufruf, 40) || "Jetzt anfragen" });
        /* Als Datenadresse zurück in den Browser — der Satz gehört ihm und hat in keiner URL,
           keinem Verlauf und keinem `Referer` etwas zu suchen. */
        fund.bild = `data:image/jpeg;base64,${Buffer.from(bild).toString("base64")}`;
        return { gebaut: true, hinweis: "Das Bild steht jetzt im Gespräch. Sag ihm in einem Satz, was er damit tun kann." };
      },
    },
  ];

  const auftrag = [
    "Du bist VersusForge, ein nüchterner Werbeberater. Du sprichst mit einem Unternehmer und duzt ihn.",
    "Ton: ruhig, direkt, konkret. Keine Floskeln, keine Begeisterungswörter.",
    "Antworte kurz: zwei bis vier Sätze, am Ende höchstens EINE Frage.",
    "",
    "DU HAST WERKZEUGE UND BENUTZT SIE, STATT DARUEBER ZU REDEN. Nennt er eine Adresse, liest du sie — du fragst nicht, ob du darfst. Habt ihr einen Hook, pruefst du ihn und baust das Bild. Erzaehle nie, dass du gleich etwas tun wirst; tu es und zeig das Ergebnis.",
    "ERWÄHNE NIE DEINE WERKZEUGE, ihre Namen oder dass etwas nicht geklappt hat. Der Mensch sieht das Ergebnis, nicht die Maschine.",
    /**
     * ── ZU JEDER FRAGE BEISPIELE (Owner 09.09.2026, im ersten echten Lauf: „hier musst du
     * Beispiele liefern") ─────────────────────────────────────────────────────────────────
     *
     * SEINE FRAGE WAR: „Nenne konkrete Referenzen, Zahlen oder sichtbare
     * Vorher-Nachher-Ergebnisse." Richtig gefragt — und trotzdem unbeantwortbar, wenn man
     * nicht weiss, in welcher FORM. Wer nicht weiss, wie eine gute Antwort aussieht, gibt
     * eine schlechte, und die ist dann seine Schuld, obwohl sie unsere ist.
     *
     * DIESELBE LEHRE WIE AM 08.09.2026, als der Owner mitten im Trichter fragte „was soll
     * ich schreiben?". Damals wurde daraus der Platzhalter im Eingabefeld. Im Chat gibt es
     * kein Feld mit Platzhalter — also gehören die Beispiele in die Frage.
     *
     * SIE MÜSSEN AUS SEINEM FACH KOMMEN: „z. B. 400 Implantate im Jahr" hilft einem
     * Zahnarzt; „z. B. Ihre Referenzen" hilft niemandem. Und sie dürfen NICHTS über ihn
     * behaupten — es sind Formen, keine Angaben.
     */
    /**
     * ── DIE BEISPIELE SIND CHIPS, KEIN FLIESSTEXT (Owner 09.09.2026, im zweiten Lauf: „hier
     * eben weiss nicht, ob dir alle beantworten können. Manche wissen es nicht. Die musst du
     * als Chips anbieten") ────────────────────────────────────────────────────────────────
     *
     * IM FLIESSTEXT SAHEN SIE SO AUS: „Zum Beispiel: wieder ohne Schmerzen kauen. Zum
     * Beispiel: wieder offen lachen auf Fotos. Zum Beispiel: keine Angst mehr vor
     * Kontrollterminen." Dreimal dieselbe Einleitung in einem Absatz — man liest darüber
     * hinweg, und antworten muss man trotzdem selbst tippen.
     *
     * ALS CHIPS SIND SIE EIN WEG: Antippen legt den Satz ins Feld, ändern geht, abschicken
     * muss er selbst. Genau die Form, die auf der Startseite falsch war (dort ersetzt ein
     * Klick seine eigene Beschreibung) und hier richtig ist: Hier ist es eine Antwort auf
     * eine schwere Frage, die viele sonst gar nicht geben.
     *
     * TECHNISCH ÜBER EINE LETZTE ZEILE, weil der Agent Werkzeuge benutzt und deshalb freien
     * Text zurückgibt statt JSON. Die Zeile wird im Browser abgeschnitten und zu Chips.
     */
    "ZU JEDER FRAGE GEHÖREN BEISPIELE — ABER NIE IM FLIESSTEXT. Schreib deine Frage, und setze die Beispiele in eine EIGENE LETZTE ZEILE, die mit >> beginnt und die Beispiele mit | trennt.",
    `Beispiel fuer den Aufbau deiner Antwort:\nWas kann ein Patient danach, was er vorher nicht konnte?\n>>wieder in einen Apfel beissen|ohne Schmerzen kauen|wieder offen lachen`,
    "REGELN FÜR DIE ZEILE: höchstens drei Beispiele, je höchstens sechs Wörter, aus SEINEM Fach. Keine Zahlen, Preise, Namen oder Orte, die du nicht von ihm hast — es sind mögliche Antworten, keine Behauptungen über ihn. Passt keine Wahl zur Frage, lass die Zeile ganz weg.",
    "IM FLIESSTEXT STEHT NIE die Wendung: zum Beispiel. Die Beispiele stehen ausschliesslich in der >>-Zeile.",
    /**
     * ── NIE DIESELBE FRAGE ZWEIMAL (09.09.2026, im selben Lauf des Owners gesehen) ────────
     *
     * Auf „ich biete Implantate" kam wörtlich dieselbe Frage noch einmal, nur mit anderen
     * Beispielen. Für ihn heisst das: Der hört mir nicht zu. Es ist derselbe Fehler, den der
     * alte Trichter am 08.09. gemacht hat — und dort half nur, die gestellten Fragen
     * wörtlich vor die Aufgabe zu legen. Hier steht der ganze Verlauf ohnehin schon da; es
     * fehlte die Regel.
     *
     * WAS STATTDESSEN ZU TUN IST: Wenn seine Antwort nicht reicht, sagen WARUM — in einem
     * halben Satz, ohne Werkstattwörter — und dann ENGER fragen, nicht gleich. Und wenn er
     * es zweimal nicht beantworten kann, ist es nicht seine Schuld: weitergehen und den
     * Punkt später aus dem füllen, was er sonst noch sagt.
     */
    "STELL NIE DIESELBE FRAGE ZWEIMAL, auch nicht mit anderen Worten oder anderen Beispielen. Der ganze Verlauf steht dir zur Verfügung — lies nach, was du schon gefragt hast.",
    "REICHT SEINE ANTWORT NICHT, sag in einem halben Satz, was dir noch fehlt, und stell dann eine ENGERE Frage zu genau der Lücke — nicht dieselbe noch einmal.",
    "KANN ER ETWAS ZWEIMAL NICHT SAGEN, lass es. Geh zum nächsten Punkt über und hol dir das Fehlende später aus dem, was er sonst erzählt. Zweimal nachbohren macht aus einem Gespräch ein Verhör.",
    /**
     * ── KEIN WERKSTATT-VOKABULAR (Owner 09.09.2026, im selben Lauf) ──────────────────────
     *
     * Im Gespräch stand wörtlich: „Das füllt den Hebel nicht" und „Reaktion: Das füllt den
     * Zweck". „Hebel" und „Zweck" sind MEINE Wörter aus dem Rezept — genau das, was drinnen
     * bleiben sollte („gute Restaurants veröffentlichen ihr Rezept auch nicht"). Und
     * „Reaktion:" ist ein Feldname, der aus dem Auftragstext durchgeschlagen ist.
     */
    "SPRICH NIE UEBER DEINE ARBEITSWEISE. Verboten sind die Woerter Hebel, Zweck, Herkunft, Wirkung, Beleg, Grenze, Stand, Prozent, Reaktion, Feld, Schritt — und jede Formulierung wie: das fuellt etwas nicht. Sag stattdessen schlicht, was dir an der Antwort fehlt, in normaler Sprache.",
    "FANG NIE MIT EINEM ETIKETT AN. Keine Antwort beginnt mit einem Wort und einem Doppelpunkt.",
    "",
    HEBEL_AUFTRAG,
    "",
    `Am Ende steht EIN Hook. ${HOOK_REGELN}`,
    "",
    "ALLGEMEINWISSEN IST KEIN ERFINDEN: Kennst du eine Marke, sagst du, was sie anbietet. Was nur ER wissen kann — Zahlen, Preise, Kunden, sein Verfahren — erfindest du nie, danach fragst du.",
    /* Die eigenen Namen darf er nennen, wenn er MUSS — die internen nie. Am besten nennt er
       gar keinen und fragt einfach. */
    `Musst du einen Arbeitsschritt benennen, benutze ausschliesslich diese Wörter: ${HEBEL.map(h => h.schritt).join(", ")}. Besser ist, du benennst gar keinen und fragst einfach.`,
  ].join("\n");

  const r = await agentLauf({ apiKey, modell: KLEIN, auftrag, verlauf, werkzeuge });
  if (!r.ok) return NextResponse.json({ error: `Der Agent stockt gerade. ${r.fehler}` }, { status: r.status });

  /**
   * DIE >>-ZEILE WIRD HIER ABGESCHNITTEN, nicht im Browser.
   *
   * Der Browser soll keine Auftragstext-Grammatik kennen müssen — käme die Zeile
   * durchgereicht an, stünde bei jedem Fehler des Modells ein „>>wieder in einen Apfel
   * beissen|…" mitten im Gespräch. Hier ist der einzige Ort, an dem beides bekannt ist: das
   * Format und die Absicht.
   */
  const zeilen = r.text.split("\n");
  const chipZeile = zeilen.findIndex(z => z.trimStart().startsWith(">>"));
  const vorschlaege = chipZeile < 0 ? [] : zeilen[chipZeile]
    .trimStart().slice(2).split("|")
    .map(v => v.trim()).filter(Boolean).slice(0, 3);
  const antwort = (chipZeile < 0 ? zeilen : zeilen.filter((_, i) => i !== chipZeile))
    .join("\n").trim();

  return NextResponse.json({
    ok: true,
    antwort,
    vorschlaege,
    benutzt: r.benutzt,
    seite: fund.seite ?? "",
    bild: fund.bild ?? "",
    verbrauch: r.verbrauch,
  });
}
