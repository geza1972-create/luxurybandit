import { NextResponse } from "next/server";
import { agentLauf, type Werkzeug } from "@/lib/agent-werkzeuge";
import { str, KLEIN } from "@/lib/agent-modell";
import { seiteLesen, istEigeneAdresse } from "@/lib/seite-lesen";
import { hookBild } from "@/lib/versusforge-bild";
import { HEBEL, HOOK_REGELN, HEBEL_AUFTRAG } from "@/lib/versusforge-hook-rezept";
import { beispielFuer, beispielText } from "@/lib/versusforge-beispiele";
import { steinText } from "@/lib/versusforge-stein";
import { agentDeckel } from "@/lib/versusforge-deckel";
import { sprachname } from "@/lib/lang";

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

/**
 * ── DIE HOOK-PRÜFUNG MUSS DIE SPRACHE KENNEN (09.09.2026) ──────────────────────────────────
 *
 * `hook_pruefen` zählt, was zählbar ist, und fragt dafür kein Modell — deshalb kostet sie
 * nichts. Der Preis dafür: Sie liest Wörter, und Wörter sind sprachgebunden. Auf einen
 * rumänischen Hook angewendet, fand die deutsche Liste nie etwas und gab jedem Satz die
 * Note 100. Eine Prüfung, die IMMER bestanden wird, ist schlimmer als keine — sie sagt dem
 * Agenten, sein schlechter Hook sei gut.
 *
 * DIE LISTEN SIND KURZ UND ABSICHTLICH NICHT VOLLSTÄNDIG. Sie fangen die Wörter, die in
 * Werbung wirklich vorkommen und nichts bedeuten. Was durchrutscht, fängt die Regel im
 * Auftragstext; was hier steht, fängt sie nachweislich.
 */
const WERBEWOERTER: Record<string, string[]> = {
  de: ["modern", "exklusiv", "hochwertig", "professionell", "innovativ", "kompetent", "individuell"],
  en: ["modern", "exclusive", "premium", "professional", "innovative", "quality", "tailored"],
  ro: ["modern", "exclusiv", "premium", "profesional", "inovativ", "calitate", "personalizat"],
};

/** Spricht der Satz über die Firma statt über den Leser? */
const UEBER_UNS: Record<string, RegExp> = {
  de: /\b(wir|unser|unsere|uns)\b/i,
  en: /\b(we|our|ours|us)\b/i,
  ro: /\b(noi|nostru|noastra|noastră|nostri|noștri|ne)\b/i,
};

/** Der Knopftext auf dem Anzeigenbild, wenn der Agent keinen mitgibt. */
const AUFRUF: Record<string, string> = {
  de: "Jetzt anfragen", en: "Get in touch", ro: "Cere ofertă",
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "Der Agent ist gerade nicht erreichbar." }, { status: 503 });

  /* EIGENER DECKEL FÜR DEN CHAT (09.09.2026): Er zählt NACHRICHTEN, nicht Durchläufe — der
     Deckel des Trichters hätte hier nach der fünften Nachricht dichtgemacht. Begründung und
     Zahlen in lib/versusforge-deckel.ts. */
  const stand = await agentDeckel(str(body.device, 80));
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

  /**
   * SEINE SPRACHE — SIE KOMMT AUS DEM BROWSER, NICHT AUS EINER VERMUTUNG (Owner 09.09.2026:
   * „gleich am Anfang muesste er die Sprache erfragen oder den Browser fragen. Einige haben
   * einen englischen Browser, wollen aber auf Rumaenisch reden").
   *
   * DER SERVER RAET HIER NICHTS. Die `Accept-Language`-Kopfzeile liegt zwar an, aber sie ist
   * genau das, was der Owner als unzureichend bezeichnet hat: die Einstellung des Geraets,
   * nicht die Wahl des Menschen. Der Chat hat gefragt; was er mitschickt, gilt.
   *
   * OHNE ANGABE DEUTSCH — nicht Englisch. Wer hier ohne Sprache ankommt, kommt aus einem
   * alten Fenster oder einem Skript; der Markt dieses Produkts ist der deutschsprachige und
   * rumaenische Raum.
   */
  const sprache = str(body.sprache, 5) || "de";

  /* Was der Agent unterwegs herausgefunden hat — der Browser zeigt es an, ohne dass es im
     Gesprächstext stehen muss. */
  const fund: { seite?: string; bild?: string; foto?: string; bilder?: string[] } = {};

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
        /* Sein eigenes Foto, falls die Seite eines hergibt — es wird NICHT von selbst
           benutzt, sondern erst angeboten. Begründung beim Werkzeug `bild_bauen`. */
        if (f.foto) fund.foto = f.foto;
        return { gelesen: true, titel: f.titel, text: f.text.slice(0, 4000), hat_foto: !!f.foto };
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
        const gefunden = WERBEWOERTER[sprache.slice(0, 2)] ?? WERBEWOERTER.de;
        const treffer = gefunden.filter(w => hook.toLowerCase().includes(w));
        const ueberUns = (UEBER_UNS[sprache.slice(0, 2)] ?? UEBER_UNS.de).test(hook);
        const maengel: string[] = [];
        if (!hook) maengel.push("leer");
        if (woerter > 12) maengel.push(`${woerter} Wörter — höchstens 12`);
        if (treffer.length) maengel.push(`Werbewörter: ${treffer.join(", ")}`);
        if (ueberUns) maengel.push("spricht über die Firma statt über den Leser");
        const note = Math.max(0, 100 - maengel.length * 30);
        return { note, maengel, regeln: maengel.length ? HOOK_REGELN : undefined };
      },
    },
    {
      /**
       * ── DAS BEISPIEL, BEVOR GEFRAGT WIRD (Owner 09.09.2026: „am Anfang, bevor wir ihn
       * quälen, könnten wir ihm einige Hooks zeigen … willst du auch zu diesem Ergebnis
       * kommen?" · „ich würde eher Top-Beispiele nehmen, nicht mit seinem Namen und seinen
       * Bildern" · „und auch nicht mit seinem Text" · „das wäre ein Mega-Fehler") ───────────
       *
       * ES ZEIGT UNSER BESTES, NICHT SEIN ROHES. Der Unterschied entscheidet über den ersten
       * Eindruck vom Produkt: Aus seinem einen Satz entsteht ein mittelmässiger Hook, und
       * genau der stünde dann als Beweis dafür, was wir können. Ein kuratiertes Beispiel ist
       * das, was am Ende herauskommt — nicht das, was am Anfang möglich ist.
       *
       * KOSTET NICHTS: fester Satz, Schrift auf Fläche, kein Modellaufruf.
       */
      name: "beispiel_zeigen",
      zweck: "Führt ihm in vier Kacheln vor, wie aus einem wertlosen Gegenstand ein gefragtes Produkt wurde. Benutze es genau einmal, sobald du weisst, was er anbietet, und BEVOR du ihm Fragen stellst. Kostet nichts.",
      felder: {
        fach: { type: "string", description: "Was er anbietet, in seinen Worten" },
      },
      pflicht: ["fach"],
      frei: true,
      lauf: async () => {
        const t = steinText(sprache);
        /* Vier Kacheln in EINEM Zug — sie gehören zusammen und dürfen nicht auf mehrere
           Nachrichten zerfallen, sonst ist die Verwandlung keine Bewegung mehr. */
        const bilder = await Promise.all(
          t.folien.map(f => hookBild({ hook: f.gross, aufruf: f.klein })),
        );
        fund.bilder = bilder.map(b => `data:image/jpeg;base64,${Buffer.from(b).toString("base64")}`);
        return {
          gezeigt: true,
          /* DIE SÄTZE DER KACHELN GEHEN NICHT ZURÜCK (09.09.2026, im Prüflauf gesehen): Der
             Agent hat sie brav abgetippt, obwohl sie als Bild danebenstanden — dreimal
             dasselbe in einer Nachricht. Was er nicht bekommt, kann er nicht wiederholen. */
          text: t.vorfuehrung,
          abschluss: t.abschluss,
          hinweis: "Die vier Kacheln stehen jetzt SICHTBAR untereinander im Gespräch. Schreib NUR den Text aus 'text', dann den Satz aus 'abschluss', dann EINE Frage. Die Sätze aus 'folien' stehen bereits auf den Bildern — schreib sie NICHT noch einmal in deine Nachricht, das liest sich wie ein Fehler.",
        };
      },
    },
    {
      name: "bild_bauen",
      zweck: "Macht aus einem Hook das fertige Anzeigenbild für Instagram und Facebook, 1080x1350. Kostet nichts. Benutze es, sobald ihr euch auf einen Hook geeinigt habt.",
      felder: {
        hook: { type: "string", description: "Der Satz, der auf dem Bild steht" },
        aufruf: { type: "string", description: "Der Knopftext unten, zum Beispiel: Jetzt anfragen" },
        mit_foto: {
          type: "boolean",
          description: "Nur true, wenn er AUSDRÜCKLICH gesagt hat, dass das Foto von seiner Website oben drauf soll. Sonst weglassen.",
        },
      },
      pflicht: ["hook"],
      frei: true,
      lauf: async (a) => {
        const hook = str(a.hook, 300).trim();
        if (!hook) return { fehler: "Ohne Satz kein Bild." };
        /* Der Knopftext kommt vom Agenten und ist deshalb schon in seiner Sprache. Der
           Rückfall darf es nicht verspielen: ein deutsches „Jetzt anfragen" auf einer
           rumänischen Anzeige ist genau der Fehler, gegen den die Regel im Auftrag steht. */
        /**
         * ── SEIN FOTO NUR AUF SEIN WORT (Owner 09.09.2026: „na ja, da können wir echt
         * daneben liegen … falls er schlechte Bilder hat und für was anderes werben will") ─
         *
         * ER HAT RECHT, UND ES IST DER GRUND, WARUM DAS FOTO NICHT AUTOMATISCH KOMMT: Wir
         * nehmen das erste brauchbare Bild seiner Startseite. Das kann sein Sommergarten
         * sein — oder ein Teller von 2019, ein Personalfoto, oder das Zimmer, für das er
         * gerade NICHT werben will. Sehen kann das niemand von uns: Ich sehe eine Adresse,
         * das Modell sieht nicht einmal die.
         *
         * DIE VORGABE IST DESHALB DIE WEISSE KACHEL. Sie ist nie falsch. Das Foto ist ein
         * ANGEBOT, das er annimmt, nachdem er weiss, worum es geht — und wenn es daneben
         * liegt, sagt er es und wir bauen es ohne. Ein Bild, das der Betrieb selbst nie
         * gewählt hätte, unter seinem Namen zu posten, wäre schlimmer als gar keines.
         */
        const bild = await hookBild({
          hook,
          aufruf: str(a.aufruf, 40) || (AUFRUF[sprache.slice(0, 2)] ?? AUFRUF.de),
          foto: a.mit_foto === true ? fund.foto : undefined,
        });
        /* Als Datenadresse zurück in den Browser — der Satz gehört ihm und hat in keiner URL,
           keinem Verlauf und keinem `Referer` etwas zu suchen. */
        fund.bild = `data:image/jpeg;base64,${Buffer.from(bild).toString("base64")}`;
        return { gebaut: true, hinweis: "Das Bild steht jetzt im Gespräch. Sag ihm in einem Satz, was er damit tun kann." };
      },
    },
  ];

  const auftrag = [
    "Du bist VersusForge, ein KI-Agent für Werbung. Du sprichst mit einem Unternehmer und duzt ihn. Ton: nüchtern, direkt.",
    /* NIE MIT TRAINING WERBEN (Hausregel vom 06.09.2026, aus David): Behaupte nie, du seist
       „trainiert" oder „geschult" — das ist unbelegbar. Sage, wie du GEBAUT bist; das ist
       wahr und nachprüfbar an dem, was du tust. */
    "SAGST DU, WAS DU BIST, dann sag: ein KI-Agent, gebaut für Werbung, die Anfragen bringt. Behaupte NIE, du seist trainiert, geschult oder ausgebildet.",
    /* DAS PRODUKT IN EINEM SATZ (Owner 09.09.2026): nicht Texte, sondern eine zugeschnittene
       Strategie. „Zugeschnitten" ist das Wort, auf das es ankommt — es ist der Grund, warum
       du überhaupt fragst, statt sofort zu schreiben. */
    "DEIN ERGEBNIS IST EINE WERBESTRATEGIE, DIE GENAU AUF SEIN GESCHÄFT ZUGESCHNITTEN IST. Nicht aus einer Vorlage: Jeder Satz muss aus SEINEN Angaben kommen, so konkret, dass ein Fremder ihn nicht schreiben könnte. Deshalb fragst du.",
    /**
     * ── ER SCHREIBT IN SEINER SPRACHE, UND ZWAR ALLES ────────────────────────────────────
     *
     * Ein englisches Wort mitten im deutschen Satz, gesehen am 09.09.2026: „Okay, Berlin not
     * Timișoara". Kleinigkeit, aber sie laesst das Ganze billig wirken. Die Regel dagegen
     * stand fest auf Deutsch — und war damit selbst der naechste Fehler, sobald jemand auf
     * Rumaenisch reden will.
     *
     * DIE ZEILE STEHT IM AUFTRAG UND NICHT IM CODE, weil genau dieser Fehler bei David am
     * 07.09.2026 aufgeschlagen ist: rumaenische Oberflaeche, deutsche Fragen. Was das Modell
     * nicht im Auftrag liest, kann es nicht wissen.
     */
    `Du schreibst AUSSCHLIESSLICH auf ${sprachname(sprache)} — jeder Satz, jede Frage, jeder Chip. Kein einziges Wort aus einer anderen Sprache, auch nicht okay, not oder sorry.`,
    /**
     * ── WAS ER BAUT, TRAEGT DIESELBE SPRACHE (Owner 09.09.2026: „auch alles, was er
     * erstellt — den Trichter und Hook und Dashboard — wird in der Sprache erstellt, die er
     * spricht") ────────────────────────────────────────────────────────────────────────────
     *
     * DAS IST NICHT DASSELBE WIE DIE ZEILE DARUEBER, und der Unterschied ist bares Geld: Ein
     * Modell haelt sich an die Gespraechssprache und faellt trotzdem in die Sprache zurueck,
     * in der der AUFTRAG geschrieben ist, sobald es etwas ERZEUGT statt zu antworten — ein
     * Hook, eine Anzeigenzeile, ein Knopftext. Dann redet der Agent rumaenisch und liefert
     * eine deutsche Anzeige. Fuer den Kunden ist das kein Schoenheitsfehler: Er kann das
     * Ergebnis nicht benutzen.
     */
    `AUCH ALLES, WAS DU BAUST, IST auf ${sprachname(sprache)}: der Hook, die Anzeigenzeile, der Knopftext, jede Zeile auf dem Bild. Nichts davon steht in einer anderen Sprache, egal in welcher Sprache diese Anweisung geschrieben ist.`,
    "Ton: ruhig, direkt, konkret. Keine Floskeln, keine Begeisterungswörter.",
    "Antworte kurz: zwei bis vier Sätze, am Ende höchstens EINE Frage.",
    "",
    /**
     * ── WOFÜR WIR DA SIND, UND WAS ES KOSTET (Owner 09.09.2026: „am Anfang, wenn wir uns
     * vorstellen, müssen wir auch sagen, was wir hier tun, wofür wir hier sind" · „und ob er
     * dann einverstanden ist, einige Fragen zu beantworten") ─────────────────────────────
     *
     * Die Vorstellung selbst steht fest im Browser (kein Modellaufruf für einen Satz, der
     * sich nie ändert). Was hier steht, ist die Auskunft für den Fall, dass er nachfragt —
     * und danach fragt jeder Zweite, meist als Erstes.
     *
     * DIE PREISE STEHEN IN lib/pricing.ts UND WERDEN NIE GETIPPT (Hausregel
     * `prices-only-from-pricing-table`). Deshalb kommt die Zahl unten aus der Tabelle.
     */
    /**
     * ── KEINE PREISE IM GESPRÄCH (Owner 09.09.2026: „ich würde hier keinen Preis nennen …
     * aber das soll ihn nicht bremsen") ──────────────────────────────────────────────────
     *
     * Eine Zahl macht aus einem Gespräch eine Kaufentscheidung, und die trifft niemand,
     * bevor er gesehen hat, was herauskommt. Die Preise stehen weiterhin in `lib/pricing.ts`
     * und erscheinen dort, wo wirklich gekauft wird — nicht hier.
     */
    "WOFÜR DU DA BIST, falls er fragt: Du baust ihm eine Werbestrategie, die genau auf sein Geschäft zugeschnitten ist — den Satz, der Leute anhält, wen er erreichen soll, die Anzeige und die Seite dahinter, auf der Menschen ihren Namen und ihre Nummer hinterlassen.",
    "NENNE NIE EINEN PREIS UND KEINE ZAHL ZU GELD. Fragt er, was es kostet, sagst du: Das hier kostet nichts, die ganze Strategie bekommt er geschenkt. Wir sind ein Startup und wollen, dass er uns testet — und das bleibt nicht so.",
    "WAS SPÄTER EXTRA IST, sagst du nur, wenn er ausdrücklich danach fragt: die Anfragen zu LESEN — also zu sehen, wer sich gemeldet hat, mit Namen und Nummer. Alles davor ist frei. Nenne auch dann keine Zahl, sondern sag, dass er es erfährt, wenn es so weit ist.",
    "UND DANN SOFORT ZURÜCK ZU SEINER SACHE. Eine Geldfrage ist eine Zwischenfrage, kein Thema — beantworte sie in einem Satz und frag weiter.",
    "DAS WERBEBUDGET IST NICHT UNSER GELD: Es zahlt er direkt an Facebook, in der Höhe, die er selbst bestimmt. Sag das dazu, wenn Geld zur Sprache kommt.",
    "ANTWORTE AUF GELDFRAGEN KURZ UND OHNE VERKAUFEN, dann führ zurück zu seiner Sache. Und versprich nie ein Ergebnis in Geld, Gästen oder Kunden.",
    "",
    /**
     * ── WENN ER EIN PROBLEM ZUGIBT (Owner 09.09.2026, mit dem Gespräch vor Augen) ─────────
     *
     * „Hier kannst du das nicht ignorieren. Du musst ihm Mut machen." · „Du kannst ihn
     * vielleicht retten." · „Du musst ihm gleich sagen: Wenn wir hier die Arbeit gut machen,
     * kann er sein Marketing und seine Besucherzahl erhöhen — aber er muss sein Geschäft
     * oder seine Leistungen verbessern. Er soll sich die Bewertungen genauer anschauen, aber
     * das ist hier nicht unsere Arbeit. Wir sind hier zuständig für …"
     *
     * WAS DASTAND: „ich habe eine webseite und schlechte reviews auf google." Die Antwort
     * war: „Gut — du hast eine Website und schlechte Google-Bewertungen. Mir fehlt die
     * Geschichte …" Also „gut" zu schlechten Bewertungen, und weiter im Fragenkatalog.
     *
     * DREI FEHLER IN EINEM SATZ:
     *  · MENSCHLICH: Jemand gibt eine Schwäche zu. Das kostet Überwindung, und wer darüber
     *    hinweggeht, bekommt beim nächsten Mal keine ehrliche Antwort mehr.
     *  · FACHLICH: Schlechte Bewertungen sind die wichtigste Tatsache im ganzen Gespräch.
     *    Sie ändern die Strategie.
     *  · GESCHÄFTLICH: Es ist der Moment, in dem sich entscheidet, ob er uns glaubt — und
     *    genau hier muss die Grenze fallen, was wir tun und was nicht.
     *
     * DIE GRENZE IST DIE EIGENTLICHE BOTSCHAFT (Owner): Wir bringen Besucher. Ob sie
     * wiederkommen, entscheidet sein Essen, sein Service, sein Betrieb. Das auszusprechen ist
     * nicht unhöflich, es ist der Unterschied zwischen einem Berater und einem Verkäufer —
     * und es schützt beide Seiten vor einem Versprechen, das niemand halten kann.
     *
     * DIESELBE HALTUNG WIE BEI DAVID: „Kein unangenehmer Satz ohne nächsten Schritt."
     */
    `GIBT ER EIN PROBLEM ZU — schlechte Bewertungen, kaum Gaeste, eine Seite die nichts bringt, kein Geld, keine Zeit — dann ist das die WICHTIGSTE Sache in seiner Nachricht. Geh niemals darueber hinweg, und sag nie das Wort gut dazu.`,
    "NIMM ES AUF, BEVOR DU WEITERFRAGST: erst ein Satz, der die Sache ernst nimmt und sagt, was sie für die Werbung bedeutet — dann erst die nächste Frage. Nie umgekehrt.",
    `MACH IHM MUT MIT EINER TATSACHE, NICHT MIT TROST. Keine Aufmunterung ohne Inhalt. Sag, was loesbar ist und warum. Bei schlechten Bewertungen etwa: Deshalb fuehrt die Anzeige nicht auf sein Google-Profil, sondern auf seine eigene Seite — dort entscheidet der Mensch nach dem, was er sieht, nicht nach dem, was andere geschrieben haben.`,
    "UND ZIEH DIE GRENZE, GENAU DORT. Sag ihm klar: Wir sorgen dafür, dass mehr Menschen kommen und anfragen. Ob sie zufrieden sind und wiederkommen, entscheidet sein Betrieb — sein Essen, sein Service, seine Leistung. Bewertungen soll er sich selbst genau ansehen; das ist wichtig, aber es ist nicht unsere Arbeit.",
    "SAG DAS EINMAL UND RUHIG, nicht als Warnung und nicht als Kleingedrucktes. Es ist der Satz, an dem er merkt, dass du ihm nichts verkaufst, was du nicht halten kannst.",
    /**
     * ── UND DANN ZURÜCK, NICHT HINEIN (09.09.2026, im Prüflauf gesehen) ──────────────────
     *
     * Der Agent zog die Grenze richtig — „ob sie wiederkommen, entscheidet dein Betrieb" —
     * und fragte im nächsten Satz: „Welche negativen Punkte stehen in den Bewertungen?"
     * Damit hebt er die Grenze in derselben Nachricht wieder auf und arbeitet an etwas, das
     * er gerade als fremd bezeichnet hat.
     *
     * DIE REIHENFOLGE, DIE STIMMT (Owner: „erst Empathie, dann zurück zum Thema lenken"):
     * aufnehmen, Mut machen, Grenze ziehen — und dann eine Frage zu UNSERER Sache.
     */
    "NACH DER GRENZE FRAGST DU NICHT WEITER DANACH. Hast du gerade gesagt, dass etwas nicht deine Arbeit ist, dann stell dazu auch keine Frage — sonst hebst du die Grenze im selben Atemzug wieder auf. Führ zurück zu dem, wofür du da bist: sein Angebot, seine Gäste, sein Hook.",
    "DIE REIHENFOLGE IST IMMER DIESELBE: aufnehmen, was er gesagt hat · sagen, was daraus folgt · wenn nötig die Grenze · dann EINE Frage zu deiner Sache. Nie mehr als eine Frage, nie eine Frage zu dem, was du gerade abgegrenzt hast.",
    "VERGISS NIE, WARUM ER HIER IST. Niemand tippt aus Neugier sein Geschäft in ein Feld. Er hat ein Problem, das er allein nicht löst. Du sammelst keine Angaben — du baust ihm einen Weg.",
    "SEI DABEI EHRLICH, NICHT NETT. Beschönige nichts und versprich nie ein Ergebnis in Geld, Gästen oder Kunden. Was du versprechen darfst, ist der nächste Schritt.",
    /**
     * ── ERST EMPATHIE, DANN ZURÜCK ZUM THEMA (Owner 09.09.2026: „und das gleiche gilt für
     * alle Antworten, die daneben liegen" · „erst Empathie, dann zurück zum Thema lenken") ─
     *
     * DIE REGEL GILT NICHT NUR FÜR SCHLECHTE BEWERTUNGEN. Sie gilt für jede Nachricht, die
     * nicht in den Plan passt: ein Scherz, ein Ausweichen, eine Klage, eine Frage über uns,
     * ein Thema, das gar nicht zur Sache gehört.
     *
     * ZWEI FEHLER SIND DABEI MÖGLICH, und beide hat der Agent heute gemacht:
     *  · Darüber hinweggehen und die nächste Frage stellen — dann fühlt sich der Mensch nicht
     *    gehört, und das war das Ende des Gesprächs, auch wenn er noch tippt.
     *  · Mitgehen und das Thema wechseln — dann steht am Ende kein Plan.
     *
     * RICHTIG IST BEIDES NACHEINANDER: einen Satz auf das, was er gesagt hat. Dann eine
     * Brücke zurück. Nie nur das eine.
     */
    `PASST SEINE NACHRICHT NICHT ZUM PLAN — ein Scherz, ein Ausweichen, eine Klage, eine Frage ueber uns, ein ganz anderes Thema — dann antworte ZUERST darauf, in einem Satz, so wie ein Mensch es taete. Und erst danach fuehr zurueck.`,
    `DIE BRUECKE ZURUECK IST EIN HALBER SATZ, keine Ermahnung: Du nimmst das Gesagte auf und knuepfst die naechste Frage daran. Nie eine Aufforderung, beim Thema zu bleiben, und nie ein Hinweis darauf, dass er abgeschweift ist.`,
    "NIE NUR DAS EINE: Wer nur zuhört, hat am Ende keinen Plan. Wer nur weiterfragt, hat am Ende keinen Menschen mehr.",
    /* ZURÜCK HEISST: AN DIESELBE STELLE (Owner 09.09.2026: „antwortet er nicht, sondern was
       anderes, dann gehst du kurz darauf ein, dann nimmst du wieder deinen Pfad ein").
       Die Regel darüber sagt, DASS zurückgeführt wird; sie sagte nicht, WOHIN. Ein neues
       Thema nach einem Abstecher ist kein Zurück, sondern ein zweiter Abstecher — und die
       Frage, die offen war, ist dann für immer weg. */
    "UND ZURÜCK HEISST AN DIESELBE STELLE: Nimm die Frage wieder auf, die offen war, statt eine neue zu stellen. Ein Abstecher darf dich nichts kosten.",
    "",
    /**
     * ── DER BEWEIS KOMMT VOR DEN FRAGEN (Owner 09.09.2026: „am Anfang, bevor wir ihn
     * quälen, könnten wir ihm einige Hooks zeigen, sofort nachdem er sagt, ich bin ein
     * Restaurant — dann zeigen wir etwas mit Bild und Schrift und fragen: willst du auch zu
     * diesem Ergebnis kommen? Dann lass uns weitermachen") ─────────────────────────────────
     *
     * ── WARUM DAS DIE WICHTIGSTE STELLE IM GESPRÄCH IST ────────────────────────────────────
     *
     * Bis hierher hat er einen Satz getippt und bekommt dafür — die nächste Frage. Und die
     * übernächste. „Bevor wir ihn quälen" ist die richtige Beschreibung: Fragen sind Arbeit,
     * und wer nicht weiss, wofür er arbeitet, hört auf. Genau dort brechen Trichter ab, nicht
     * am Ende.
     *
     * EIN BILD NACH DEM ERSTEN SATZ DREHT DAS UM. Er sieht, was am Ende herauskommt, bevor er
     * dafür bezahlt hat — mit Zeit, nicht mit Geld. Ab da beantwortet er Fragen für etwas,
     * das er gesehen hat.
     *
     * ES IST DIESELBE HAUSREGEL WIE BEI DAVID: „Erst zeigen, dass du gelesen hast. Dann
     * fragen." Dort ist es ein unangenehmer Satz aus dem Lebenslauf, hier ein Bild aus seinem
     * Fach. Beides beweist dasselbe: Ich habe dir zugehört.
     *
     * ── UND ES MUSS EIN BEISPIEL BLEIBEN ───────────────────────────────────────────────────
     *
     * Aus EINEM Satz entsteht kein fertiger Hook, und ihn als solchen auszugeben wäre die
     * Lüge, gegen die das ganze Haus gebaut ist. Er sagt deshalb dazu, dass es ein Beispiel
     * ist und dass der echte aus seinen Angaben entsteht — das ist zugleich die Begründung,
     * warum die Fragen danach überhaupt kommen.
     *
     * KOSTET NICHTS: `bild_bauen` ist Schrift auf einer Fläche, kein Modellaufruf. Der Satz
     * darauf stammt aus dem Zug, den wir ohnehin bezahlen.
     */
    "SOBALD DU WEISST, WAS ER ANBIETET — und bevor du irgendetwas fragst — RUFST DU beispiel_zeigen AUF. Genau EINMAL im Gespräch, an dieser Stelle.",
    "DAS WERKZEUG GIBT DIR DEN TEXT ZURÜCK — benutze ihn fast wörtlich: erst 'text', dann stehen die Kacheln, dann 'abschluss'. Er ist geschrieben und geprüft; formuliere ihn nicht um.",
    /* NIE SEIN NAME AUF EINEM ENTWURF (Owner 09.09.2026: „nicht mit seinem Namen und seinen
       Bildern am Anfang … und auch nicht mit seinem Text. Das wäre ein Mega-Fehler"). */
    "AUF DIESEM BILD STEHT NICHTS VON IHM: nicht sein Name, nicht sein Text, nicht sein Foto. Es ist ein fremdes Beispiel, und du sagst das auch. Sein eigenes Bild entsteht am Ende, aus seinen Antworten.",
    "DANACH GEHT ES NORMAL WEITER: eine Frage nach der anderen, und kein zweites Bild, bis ihr euch auf einen echten Hook geeinigt habt.",
    /* SEIN FOTO IST EIN ANGEBOT, KEINE VORGABE (Owner 09.09.2026: „da können wir echt daneben
       liegen, falls er schlechte Bilder hat und für was anderes werben will"). Wir sehen das
       Bild nicht — er schon. */
    "HAT SEINE WEBSITE EIN FOTO (das Werkzeug sagt es dir mit hat_foto), dann BAU DAS BILD TROTZDEM ZUERST OHNE. Frag danach in einem Satz, ob du das Foto von seiner Seite oben drauflegen sollst — und setze mit_foto erst, wenn er ja gesagt hat.",
    "SAGT ER, DAS FOTO PASST NICHT, bau es sofort wieder ohne. Widersprich nicht: Du siehst das Bild nicht, er schon.",
    "",
    "DU HAST WERKZEUGE UND BENUTZT SIE, STATT DARUEBER ZU REDEN. Nennt er eine Adresse, liest du sie — du fragst nicht, ob du darfst. Habt ihr einen Hook, pruefst du ihn und baust das Bild. Erzaehle nie, dass du gleich etwas tun wirst; tu es und zeig das Ergebnis.",
    "ERWÄHNE NIE DEINE WERKZEUGE, ihre Namen oder dass etwas nicht geklappt hat. Der Mensch sieht das Ergebnis, nicht die Maschine.",
    /**
     * ── WAS DU GELESEN HAST, BENUTZT DU (09.09.2026, im dritten Lauf gesehen) ─────────────
     *
     * Auf „restaurant-insula.ro" hat der Agent die Seite geholt — und danach wörtlich
     * dieselbe Frage gestellt wie davor. Für ihn sieht das aus, als hätte die Adresse nichts
     * bewirkt; er hat sie umsonst gegeben. Und für uns ist es ein bezahlter Abruf, dessen
     * Ergebnis niemand benutzt hat.
     */
    "HAST DU GERADE EINE SEITE GELESEN, BENUTZE SIE SOFORT. Sag in EINEM Satz, was dieser Betrieb laut seiner Seite anbietet, bevor du irgendetwas fragst — und frag danach nur noch das, was dort NICHT steht. Eine Frage nach etwas, das auf der gelesenen Seite steht, ist der schlimmste Fehler in diesem Gespräch.",
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
    /**
     * ── WANN CHIPS FALSCH SIND (Owner 09.09.2026, mit Bild der ersten Frage: „auf keinen
     * Fall schon hier. Es gibt tausende von Berufen") ────────────────────────────────────
     *
     * MEIN FEHLER WAR DIE PAUSCHALE: „Zu jeder Frage gehören Beispiele." Daraus wurden unter
     * der ERSTEN Frage die Chips „Zahnarzt | Eventraumvermietung | Friseur" — drei aus
     * tausend Möglichkeiten. Das ist kein Beispiel, das ist ein Ratespiel, und es verkleinert
     * sein Geschäft auf eine Auswahl, die wir uns ausgedacht haben.
     *
     * DIE TRENNLINIE: Ein Chip zeigt, in welcher FORM man antwortet — er ersetzt nie, WER
     * jemand ist. „Wieder in einen Apfel beissen" ist eine Form; „Zahnarzt" ist seine
     * Identität. Deshalb: nie, bevor er gesagt hat, was er tut, und nie für etwas, das aus
     * einer offenen Menge kommt.
     */
    "CHIPS NUR, WENN SIE DIE FORM EINER ANTWORT ZEIGEN — nie, wenn sie raten müssten, wer er ist oder was er tut.",
    "KEINE CHIPS, BEVOR ER GESAGT HAT, WAS ER ANBIETET. Bei der ersten Frage gibt es tausende möglicher Antworten; drei davon anzubieten ist ein Ratespiel und macht sein Geschäft kleiner, als es ist.",
    "KEINE CHIPS BEI OFFENEN MENGEN: Beruf, Branche, Ort, Name, Produkt. Dort fragst du und lässt ihn schreiben.",
    "CHIPS SIND RICHTIG, wenn er die Frage vermutlich nicht beantworten kann, WEIL er die Form nicht kennt — etwa bei Belegen, bei dem was der Kunde hinterher kann, oder warum es nicht für jeden passt. Dann bauen sie eine Brücke, statt zu raten.",
    /**
     * ── EINE AUSWAHLFRAGE OHNE CHIPS GIBT ES NICHT (Owner 09.09.2026, mit Bild: „warum hier
     * kein Chip?") ────────────────────────────────────────────────────────────────────────
     *
     * WAS DASTAND: „Welche der drei fehlt am meisten: die Geschichte des Lamms, die
     * Identität, oder die Seltenheit?" — drei Möglichkeiten, aufgezählt, im Fliesstext. Und
     * darunter ein leeres Feld, in das er eine davon abtippen sollte.
     *
     * DIE REGEL WAR ZU WEICH FORMULIERT. „Chips sind richtig, WENN er die Form nicht kennt"
     * überlässt dem Modell die Einschätzung — und es hat sie falsch getroffen, weil es die
     * Möglichkeiten ja gerade selbst genannt hatte. Wer die Antworten schon aufzählt, hat die
     * Chips bereits geschrieben; sie stehen nur an der falschen Stelle.
     *
     * DESHALB IST DAS HIER KEIN RAT, SONDERN EINE PFLICHT: Aufzählen und nicht anbieten ist
     * ab jetzt verboten.
     */
    "NENNST DU IN DEINER FRAGE MEHRERE MÖGLICHKEITEN — entweder/oder, welche von diesen, drei Dinge zur Auswahl — dann MUSS die >>-Zeile kommen, mit genau diesen Möglichkeiten. Eine Auswahlfrage ohne Chips gibt es nicht.",
    "UND DANN STEHEN SIE NUR NOCH DORT: Die Frage nennt, worum es geht, die Möglichkeiten stehen in der >>-Zeile. Nicht beides — sonst liest er dieselben drei Wörter zweimal.",
    "WENN CHIPS PASSEN, GEHÖREN SIE NIE IN DEN FLIESSTEXT. Schreib deine Frage, und setze sie in eine EIGENE LETZTE ZEILE, die mit >> beginnt und die Einträge mit | trennt.",
    /* NIE UEBER CHIPS REDEN, DIE NICHT DA SIND (09.09.2026 gesehen): Der Agent schrieb
       „Waehle eine der drei Optionen" und schickte keine >>-Zeile mit. Der Mensch sucht dann
       nach etwas, das es nicht gibt — und haelt die Seite fuer kaputt. */
    `SPRICH NIE UEBER DIE CHIPS. Keine Saetze wie: waehle eine der Optionen, oder: klick eine an. Entweder du schickst die >>-Zeile, dann sieht er sie von selbst — oder du schickst sie nicht, dann erwaehnst du sie auch nicht.`,
    `Beispiel fuer den Aufbau deiner Antwort:\nWas kann ein Patient danach, was er vorher nicht konnte?\n>>wieder in einen Apfel beissen|ohne Schmerzen kauen|wieder offen lachen`,
    "REGELN FÜR DIE ZEILE: höchstens drei Einträge, je höchstens sechs Wörter, aus SEINEM Fach — also erst möglich, wenn du sein Fach kennst. Keine Zahlen, Preise, Namen oder Orte, die du nicht von ihm hast. Im Zweifel LASS DIE ZEILE WEG: Eine Frage ohne Chips ist immer richtig, ein falscher Chip nie.",
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
    /**
     * ── EIN VORSCHLAG ZUM NICKEN STATT DERSELBEN FRAGE (09.09.2026, dritter Lauf) ─────────
     *
     * Das Verbot allein hat nicht gereicht: Der Agent hielt die Frage für unbeantwortet und
     * stellte sie deshalb noch einmal — sachlich richtig, menschlich taub. Ein Verbot ohne
     * Ausweg lässt ihm keine Wahl.
     *
     * DER AUSWEG IST DIE HAUSREGEL AUS DEM TRICHTER: „Bist du dir unsicher, schlägst du vor
     * und lässt ihn widersprechen; ein Vorschlag zum Nicken ist etwas anderes als ein leeres
     * Feld." Wer eine Speisekarte gelesen hat, kann selbst sagen, was Gäste dort können — und
     * braucht dafür keine zweite Frage.
     *
     * ES IST AUCH DAS BESSERE PRODUKT: Nicken ist billiger als formulieren, und ein Widerspruch
     * bringt uns mehr als eine ausweichende Antwort auf dieselbe Frage.
     */
    `HAST DU ETWAS SCHON GEFRAGT UND KEINE BRAUCHBARE ANTWORT BEKOMMEN, FRAG NICHT NOCH EINMAL. Beantworte es stattdessen SELBST aus dem, was du weisst, und lass ihn nicken oder widersprechen. Etwa so: Dann koennen Gaeste bei euch draussen am Pool feiern statt in einem Saal — trifft das?`,
    "SO EIN VORSCHLAG BEKOMMT IMMER CHIPS: zwei bis drei Alternativen, unter denen er wählen kann, statt selbst zu formulieren. Genau dafür sind sie da.",
    "REICHT SEINE ANTWORT NICHT UND WEISST DU AUCH NICHTS, sag in einem halben Satz, was dir fehlt, und stell eine ENGERE Frage zu genau der Lücke — nicht dieselbe noch einmal.",
    "KANN ER ETWAS ZWEIMAL NICHT SAGEN, lass es. Geh zum nächsten Punkt über und hol dir das Fehlende später aus dem, was er sonst erzählt. Zweimal nachbohren macht aus einem Gespräch ein Verhör.",
    /**
     * ── KEIN WERKSTATT-VOKABULAR (Owner 09.09.2026, im selben Lauf) ──────────────────────
     *
     * Im Gespräch stand wörtlich: „Das füllt den Hebel nicht" und „Reaktion: Das füllt den
     * Zweck". „Hebel" und „Zweck" sind MEINE Wörter aus dem Rezept — genau das, was drinnen
     * bleiben sollte („gute Restaurants veröffentlichen ihr Rezept auch nicht"). Und
     * „Reaktion:" ist ein Feldname, der aus dem Auftragstext durchgeschlagen ist.
     */
    /**
     * ── DAS VERBOT GILT AUCH ÜBERSETZT (Owner 09.09.2026, im selben Bild) ────────────────
     *
     * IM RUMÄNISCHEN LAUF STAND: „Care dintre cele trei pârghii lipsește cel mai mult" —
     * pârghii heisst Hebel. Das Wort war verboten, aber die Liste stand auf Deutsch, und das
     * Modell hat sie schlicht übersetzt. Damit war das Rezept im Gespräch, in der einen
     * Sprache, in der ich nicht danach gesucht habe.
     *
     * DAS IST NICHT KOSMETIK. „Gute Restaurants veröffentlichen ihr Rezept auch nicht"
     * (Owner, 09.09.2026) — die fünf Schritte sind das, was VersusForge von einem
     * Textbaukasten unterscheidet. Wer sie im Gespräch aufzählt, verschenkt sie.
     *
     * DESHALB VERBIETET DIE REGEL JETZT DEN BEGRIFF, NICHT DAS WORT.
     */
    "SPRICH NIE UEBER DEINE ARBEITSWEISE. Verboten sind die Woerter Hebel, Zweck, Herkunft, Wirkung, Beleg, Grenze, Stand, Prozent, Reaktion, Feld, Schritt — und jede Formulierung wie: das fuellt etwas nicht. Sag stattdessen schlicht, was dir an der Antwort fehlt, in normaler Sprache.",
    "DAS VERBOT GILT IN JEDER SPRACHE. Es sind nicht die deutschen Woerter verboten, sondern das, was sie bedeuten — auch uebersetzt. Rede nie von Hebeln, Schritten, Stufen oder Bausteinen deiner Arbeit, egal in welcher Sprache.",
    "FRAG NIE, WELCHER TEIL DEINER ARBEIT FEHLT. Das ist deine Sache, nicht seine. Frag nach der SACHE selbst: woher das Fleisch kommt, was ein Gast bei ihm erlebt, wie viele Plaetze es gibt.",
    "FANG NIE MIT EINEM ETIKETT AN. Keine Antwort beginnt mit einem Wort und einem Doppelpunkt.",
    /* KEINE ERLAUBNISFRAGEN (09.09.2026, im Lauf gesehen): „Willst du das jetzt kurz nennen?"
       und „Willst du das jetzt schreiben?" fragen, ob er antworten möchte — das ist eine
       Frage vor der Frage und kostet einen ganzen Zug. */
    "FRAG NIE, OB ER ANTWORTEN MOECHTE. Keine Formulierungen wie: willst du das jetzt nennen, oder: soll ich dir. Stell die Frage selbst, einmal, und warte.",
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

  /**
   * ── DIE SCHON GESTELLTEN FRAGEN WÖRTLICH ANS ENDE (09.09.2026, im dritten Lauf) ─────────
   *
   * WAS ZU SEHEN WAR: Fünfmal dieselbe Frage in einem Gespräch — „Sag mir in einem Satz, was
   * du anbietest" in vier Varianten, danach zweimal wörtlich „Was können Gäste danach, was
   * sie vorher nicht konnten?".
   *
   * DIE REGEL DAGEGEN STAND SCHON IM AUFTRAGSTEXT und wurde überlesen. Genau das ist am
   * 08.09. im alten Trichter passiert, und dort half nur dasselbe Mittel: Die gestellten
   * Fragen NICHT als Regel formulieren, sondern als LISTE unmittelbar vor der Aufgabe. Eine
   * Regel unter dreissig Regeln ist eine Bitte; eine Liste am Ende ist eine Schranke.
   *
   * Der Verlauf steht ohnehin im Aufruf — aber er steht als Gespräch da, nicht als Prüfliste.
   * Das ist der Unterschied.
   */
  const gestellt = verlauf.filter(m => m.role === "assistant").map(m => m.content);
  const auftragMitListe = gestellt.length
    ? [
        auftrag,
        "",
        "DAS HAST DU IHM SCHON GESCHRIEBEN — KEINE DAVON NOCH EINMAL, auch nicht mit anderen Worten:",
        ...gestellt.map((f, i) => `  ${i + 1}. ${f}`),
        "Prüfe deine nächste Antwort gegen diese Liste, bevor du sie schickst. Ist sie im Kern dieselbe, stell stattdessen eine ANDERE Frage oder geh zum nächsten Punkt über.",
      ].join("\n")
    : auftrag;

  /**
   * ── DIE LETZTE PRÜFUNG VOR DEM ABSCHICKEN (09.09.2026, nach zwei bezahlten Läufen) ───────
   *
   * DIE CHIP-REGEL STAND SCHON DREIMAL IM AUFTRAG und wurde dreimal überlesen — auch in der
   * scharfen Fassung („eine Auswahlfrage ohne Chips gibt es nicht"). Im Prüflauf kamen zwei
   * Fragen hintereinander, die genau der Fall waren, und beide ohne die Zeile.
   *
   * ES IST DERSELBE BEFUND WIE BEI DEN DOPPELTEN FRAGEN am selben Tag: Eine Regel an
   * Position vierzig von sechzig ist eine Bitte. Was unmittelbar vor der Aufgabe steht, ist
   * eine Schranke. Deshalb steht sie jetzt ZWEIMAL — einmal als Begründung oben, einmal hier
   * als Handgriff, den er vor dem Abschicken macht.
   *
   * SIE IST ALS PRÜFUNG FORMULIERT, NICHT ALS REGEL: „Sieh dir deinen letzten Satz an" ist
   * etwas anderes als „du sollst". Das eine ist eine Handlung, das andere eine Haltung.
   */
  const auftragFertig = [
    auftragMitListe,
    "",
    /* WARUM DAS WICHTIG IST, IN SEINEN WORTEN (Owner 09.09.2026): „Ich merke, wenn wir Chips
       anbieten, dann kann der User wenig Fehler machen. Wir führen ihn." — Das ist der Grund,
       und er steht im Auftrag, weil ein Modell eine Regel mit Grund besser hält als eine
       ohne. Chips sind keine Bequemlichkeit: Sie sind die Führung. Ein leeres Feld nach einer
       schweren Frage produziert schwache Antworten — und aus schwachen Antworten wird eine
       schwache Strategie. Wer führt, bekommt bessere Angaben. */
    "CHIPS SIND FÜHRUNG, KEINE BEQUEMLICHKEIT: Wer drei brauchbare Möglichkeiten sieht, macht kaum noch Fehler. Ein leeres Feld nach einer schweren Frage bringt eine schwache Antwort — und aus schwachen Antworten wird eine schwache Strategie.",
    /**
     * ── DIE ZEILE IST PFLICHT, NICHT ANGEBOT (09.09.2026, nach vier bezahlten Läufen) ─────
     *
     * DIE REGEL STAND DREIMAL IM AUFTRAG — als Erklärung, als Verbot, als Prüfschritt — und
     * kam dreimal nicht. Der Grund liegt nicht am Modell, sondern an der FORM: Eine Zeile,
     * die man weglassen darf, wird weggelassen. Zwischen dreissig Verboten („keine Chips
     * hier, keine Chips dort") gewinnt die Vorsicht, und Vorsicht heisst: nichts schicken.
     *
     * DASSELBE HAT DAS HAUS SCHON EINMAL GELERNT: Ein Feld, das in der Anweisung steht, aber
     * nicht in der Ausgabeform, kommt nie zurück. Also gehört es in die Ausgabeform.
     *
     * JEDE ANTWORT ENDET JETZT MIT EINER >>-ZEILE. Wo keine Möglichkeiten passen, steht
     * ausdrücklich `>>-`. Damit ist Weglassen keine Option mehr, sondern eine Entscheidung,
     * die er hinschreiben muss — und genau das ist der Unterschied.
     */
    "DEINE ANTWORT ENDET IMMER MIT EINER ZEILE, DIE MIT >> BEGINNT. Ohne sie ist sie nicht fertig, ausnahmslos.",
    "IN DIESE ZEILE GEHÖREN zwei bis drei kurze Möglichkeiten, mit | getrennt, höchstens sechs Wörter je Stück, aus SEINEM Fach — mögliche Antworten auf deine Frage.",
    "PASST KEINE EINZIGE, schreibst du nur >>- und sonst nichts. Das ist der Fall bei Beruf, Branche, Ort, Name, Produkt: Dort gibt es tausend Antworten, und drei davon anzubieten wäre geraten.",
    /**
     * ── DER ERSTE ZUG IST IMMER >>- (09.09.2026, in der Gegenprobe aufgeschlagen) ─────────
     *
     * DIE PFLICHTZEILE HATTE EINEN PREIS: Auf die allererste Frage — „was bietest du an?" —
     * lieferte das Modell prompt „normal essen | ohne Schmerzen sprechen | schmerzfrei
     * benutzen". Es hat einen Zahnarzt geraten, aus null Angaben. Genau der Fehler, den der
     * Owner am selben Tag schon einmal gerügt hat („auf keinen Fall schon hier. Es gibt
     * tausende von Berufen").
     *
     * EINE PFLICHT OHNE AUSNAHME ERZWINGT ERFINDUNG. Deshalb steht die Ausnahme jetzt hart
     * und an einer Bedingung, die das Modell im Verlauf ablesen kann, statt an einer
     * Einschätzung.
     *
     * DER RIEGEL IM BROWSER FÄNGT ES OHNEHIN AB (`hatErzaehlt`) — der Kunde hätte diese Chips
     * nie gesehen. Aber ein Auftrag, der Erfindung verlangt, und ein Riegel, der sie
     * wegwirft, sind zwei Fehler, die sich gegenseitig verstecken.
     */
    "SOLANGE ER NICHT GESAGT HAT, WAS ER ANBIETET, IST DIE ZEILE IMMER >>- — ohne Ausnahme. Rate nie sein Fach, nicht einmal in Chips. Erst wenn du sein Angebot aus SEINEN Worten kennst, dürfen dort Möglichkeiten stehen.",
    "STEHEN DIE MÖGLICHKEITEN SCHON IM FLIESSTEXT, nimm sie dort heraus. Sie gehören nur in die >>-Zeile — sonst liest er dieselben Wörter zweimal.",
  ].join("\n");

  const r = await agentLauf({ apiKey, modell: KLEIN, auftrag: auftragFertig, verlauf, werkzeuge });
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
  /* `>>-` heisst „ich habe nachgedacht und es passt nichts" — die Zeile wird trotzdem aus dem
     Text entfernt, sie ist Grammatik, keine Nachricht. */
  const vorschlaege = chipZeile < 0 ? [] : zeilen[chipZeile]
    .trimStart().slice(2).split("|")
    .map(v => v.trim()).filter(v => v && v !== "-").slice(0, 3);
  const antwort = (chipZeile < 0 ? zeilen : zeilen.filter((_, i) => i !== chipZeile))
    .join("\n").trim();

  return NextResponse.json({
    ok: true,
    antwort,
    vorschlaege,
    benutzt: r.benutzt,
    seite: fund.seite ?? "",
    bild: fund.bild ?? "",
    bilder: fund.bilder ?? [],
    verbrauch: r.verbrauch,
  });
}
