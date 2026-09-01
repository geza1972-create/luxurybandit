import { leseAlleLeads, type JoburiLead } from "@/lib/joburi-leads";
import { gehaltMitte, inEuro, type Waehrung } from "@/lib/joburi-gehalt";

/**
 * DIE ZAHLEN, DIE EINE FIRMA SEHEN DARF (Owner 31.08.2026: „wir haben die Rekruterseite, wo
 * ich diese statistik präsentieren will").
 *
 * WAS HIER BEWUSST NICHT HERAUSKOMMT — und warum jede Zeile davon Geld wert ist:
 *   · KEINE KOSTEN. Was uns eine Antwort oder eine Adresse kostet, geht niemanden an, der
 *     dafür bezahlen soll. Ein Recruiter, der liest, dass ein Lead 34 Cent kostet, zahlt
 *     nie wieder einen zweistelligen Betrag dafür.
 *   · KEINE PERSONEN. Keine Adresse, kein Gerät, keine Kennung — die Einwilligung deckt
 *     unsere Kontaktaufnahme, nicht eine Veröffentlichung.
 *   · KEINE ANZEIGENDATEN. Reichweite, CTR und Budget sind unsere Werkstatt, nicht sein
 *     Marktbericht.
 *
 * DER RIEGEL GEGEN DÜNNE ZAHLEN ist der eigentliche Kern dieser Datei. Eine Studie, die bei
 * drei Antworten „Median 2.000 €" behauptet, ist beim ersten kritischen Personalleiter
 * erledigt — und mit ihr die Glaubwürdigkeit aller anderen Zahlen. Deshalb liefert jede
 * Kennzahl `null`, solange zu wenig dahintersteht, und die Seite lässt sie dann WEG, statt
 * sie zu schönen. Lieber drei belegte Zeilen als neun behauptete.
 */

/** Unter dieser Zahl echter Antworten gibt es überhaupt keine Studie zu zeigen. */
const MIN_GESAMT = 25;
/** Ein einzelner Anteil (ein Niveau, ein Beruf) erscheint erst ab so vielen Nennungen. */
const MIN_SEGMENT = 8;
/**
 * Ab hier nennen wir die Fallzahl selbst. Darunter wäre sie ein Eigentor: Ein Recruiter, der
 * „beruht auf 38 Antworten" liest, hört „nichts" — dieselbe Aussage ohne Zahl wirkt stärker
 * und ist nicht weniger wahr. Ab dreistellig dreht es sich um: Dann IST die Zahl das Argument.
 */
const AB_HIER_FALLZAHL_NENNEN = 100;

export type StudieAnteil = { schluessel: string; prozent: number };

export type Studie = {
  /** Steht genug für eine Aussage zur Verfügung? Ist das false, zeigt die Seite nichts. */
  belastbar: boolean;
  /** Die Fallzahl — nur gesetzt, wenn sie für uns spricht (siehe oben), sonst null. */
  fallzahl: number | null;
  /** Monatsnetto in Euro, Median. */
  jetztMedian: number | null;
  wechselMedian: number | null;
  /** Der Aufschlag, je Person gerechnet und dann der Median daraus. */
  sprungMedian: number | null;
  /** Anteile in Prozent, absteigend, nur ausreichend belegte. */
  deutsch: StudieAnteil[];
  suche: StudieAnteil[];
  berufe: StudieAnteil[];
  /** Anteil derer, die auch ohne Gehaltserhöhung wechseln würden — null, solange zu wenige. */
  ohneMehrGeld: number | null;
  abschluss: StudieAnteil[];
};

const LEER: Studie = {
  belastbar: false, fallzahl: null,
  jetztMedian: null, wechselMedian: null, sprungMedian: null,
  deutsch: [], suche: [], berufe: [], abschluss: [], ohneMehrGeld: null,
};

function median(werte: number[]): number | null {
  const w = werte.filter(n => n > 0).sort((a, b) => a - b);
  if (!w.length) return null;
  const m = Math.floor(w.length / 2);
  return w.length % 2 ? w[m] : Math.round((w[m - 1] + w[m]) / 2);
}

/** Anteile eines Feldes — absteigend, und alles unter der Mindestmenge fliegt raus. */
function anteile(leads: JoburiLead[], feld: (l: JoburiLead) => string | undefined): StudieAnteil[] {
  const zaehler: Record<string, number> = {};
  let mit = 0;
  for (const l of leads) {
    const k = (feld(l) ?? "").trim();
    if (!k) continue;
    zaehler[k] = (zaehler[k] ?? 0) + 1;
    mit++;
  }
  if (mit < MIN_GESAMT) return [];
  return Object.entries(zaehler)
    .filter(([, n]) => n >= MIN_SEGMENT)
    .sort((a, b) => b[1] - a[1])
    .map(([schluessel, n]) => ({ schluessel, prozent: Math.round((n / mit) * 100) }));
}

/**
 * WER ZÄHLT ALS ECHTE ANTWORT.
 *
 * Zwei Siebe, weil es zwei Sorten Ballast gibt:
 *   1. `test` — Läufe von der eigenen Maschine oder aus einer Admin-Sitzung. Die markiert
 *      der Trichter seit dem 31.08. selbst.
 *   2. Der Altbestand von davor trägt die Markierung nicht. Dort gilt: Wer weder aus einer
 *      Anzeige kam noch eine Adresse hinterlassen hat, war beim Bauen entstanden. Genau so
 *      sahen die 40 Datensätze aus, die an einem Nachmittag „Elektriker" und „LKW fahrer"
 *      in die Zahlen geschrieben haben.
 * Beides SIEBT nur — gelöscht wird nichts, und was hier durchfällt, liegt weiter im Speicher.
 */
function istEchteAntwort(l: JoburiLead): boolean {
  if (l.test) return false;
  const ausAnzeige = !!(l.utm && (l.utm as Record<string, string>).utm_content);
  return ausAnzeige || !!l.email;
}

/**
 * DER ZWISCHENSPEICHER (gemessen, nicht vermutet): `leseAlleLeads` holt eine Dateiliste und
 * danach JEDE Datei einzeln — bei 500 Antworten also über 500 Abrufe. Auf einer Seite, die
 * ein Personalleiter aus einem verschickten Link öffnet, wäre das die längste Sekunde des
 * Verkaufsgesprächs.
 *
 * Eine Studie ist keine Live-Anzeige; zehn Minuten alt ist völlig genug. Auf Vercel lebt der
 * Speicher je Instanz — auch dann trägt er die Stösse, um die es geht.
 */
let speicher: { stand: number; wert: Studie } | null = null;
const HALTBAR_MS = 10 * 60 * 1000;

export async function studieZahlen(): Promise<Studie> {
  if (speicher && Date.now() - speicher.stand < HALTBAR_MS) return speicher.wert;

  let leads: JoburiLead[] = [];
  try { leads = await leseAlleLeads(); } catch { return LEER; }

  const echte = leads.filter(istEchteAntwort);
  if (echte.length < MIN_GESAMT) {
    speicher = { stand: Date.now(), wert: LEER };
    return LEER;
  }

  /* Der Sprung wird JE PERSON gerechnet und daraus der Median. Die Differenz der beiden
     Mediane wäre falsch: Sie stammen aus verschiedenen Teilmengen — nicht jeder beantwortet
     beide Felder — und gehörte am Ende keinem einzigen echten Menschen. */
  const mitBeidem = echte.filter(l => (l.gehaltJetzt ?? l.jetztGehalt) && (l.gehaltMinimum ?? l.wechselGehalt));

  /**
   * ZWEI FASSUNGEN, EINE AUSWERTUNG (31.08.2026).
   *
   * Version 1 (die Studien-Fassung) schrieb `deutsch`, `suche` und `wechselGehalt` in Euro.
   * Version 2 (Talent Network) schreibt `deutschniveau`, `situation` und `gehaltMinimum` in
   * der Währung des Wohnlands. Ohne diese Brücke stünde die Studie ab der Umstellung still —
   * sie sähe die neuen Antworten nicht und die alten wären ihr einziger Bestand.
   *
   * DIE BETRÄGE WERDEN AUF EURO NORMIERT, sonst mischte der Median 8.000 RON mit 2.000 EUR
   * und ergäbe eine Zahl, die es nirgends gibt.
   */
  const niveau = (l: JoburiLead) => (l.deutschniveau ?? l.deutsch ?? "").toUpperCase();
  const status = (l: JoburiLead) => {
    if (l.situation) {
      /* Version 2 kennt sechs Zustände; für die öffentliche Studie zählen die drei, die es
         schon immer gab — beschäftigt-zufrieden liest sich für eine Firma als „passiv". */
      const AUF: Record<string, string> = {
        employed_satisfied: "passiv", employed_open: "offen", actively_searching: "aktiv",
        /* Ohne Job, selbstständig und „andere" gehören in keine der drei Schubladen. Sie
           fallen aus DIESER Kennzahl heraus statt sie zu verfälschen — die Aussage lautet
           „von den Beschäftigten suchen so viele nicht aktiv" und muss das auch bleiben. */
        unemployed: "", self_employed: "", other: "",
      };
      return AUF[l.situation] ?? "";
    }
    return l.suche ?? "";
  };
  const euro = (betrag?: string, w?: string) =>
    betrag ? inEuro(gehaltMitte(betrag), (w as Waehrung) ?? "EUR") : gehaltMitte(betrag);

  const wert: Studie = {
    belastbar: true,
    fallzahl: echte.length >= AB_HIER_FALLZAHL_NENNEN ? echte.length : null,
    jetztMedian: median(echte.map(l => euro(l.gehaltJetzt ?? l.jetztGehalt, l.waehrung))),
    wechselMedian: median(echte.map(l => euro(l.gehaltMinimum ?? l.wechselGehalt, l.waehrung))),
    sprungMedian: mitBeidem.length >= MIN_SEGMENT
      ? median(mitBeidem.map(l => euro(l.gehaltMinimum ?? l.wechselGehalt, l.waehrung) - euro(l.gehaltJetzt ?? l.jetztGehalt, l.waehrung)))
      : null,
    deutsch: anteile(echte, niveau),
    suche: anteile(echte, status),
    /* Der Beruf kommt als getippter Text; gezeigt wird die abgeleitete Schublade, sonst
       stünde in der Studie dreimal dieselbe Tätigkeit in drei Schreibweisen. */
    berufe: anteile(echte, l => l.berufsfeld),
    /* DIE ZAHL, DIE KEIN JOBPORTAL HAT (Owner 31.08.2026): Wie viele würden auch OHNE
       Gehaltserhöhung wechseln, wenn die Bedingungen stimmen. Sie beantwortet einer Firma
       die einzige Frage, die vor jedem Erstgespräch steht — „muss ich mehr zahlen?". */
    ohneMehrGeld: (() => {
      const gefragt = echte.filter(l => !!l.gleichesGehalt);
      if (gefragt.length < MIN_GESAMT) return null;
      const ja = gefragt.filter(l => l.gleichesGehalt === "yes" || l.gleichesGehalt === "depends").length;
      return Math.round((ja / gefragt.length) * 100);
    })(),
    abschluss: anteile(echte, l => l.studii),
  };

  speicher = { stand: Date.now(), wert };
  return wert;
}
