import { NextResponse } from "next/server";
import { berichtMailSchicken } from "@/lib/david-mail";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSignedUrl, loescheDatei } from "@/lib/try-this-look-store";
import { istAdresse, anzeigeAusAdresse } from "@/lib/anzeige-holen";
import { docxZuText } from "@/lib/docx-text";
import {
  leseDavid, schreibeDavid, davidHeuteGezaehlt, davidHeuteHochzaehlen, DAVID_PRO_TAG,
  type DavidSitzung, type DavidFrage, type DavidErkenntnisse, type DavidReport,
} from "@/lib/david-store";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * DAS PRE-SCREENING — DIE EINE KI-ROUTE VON DAVID.
 *
 * Vier Schritte, ein Endpunkt (`schritt` im Rumpf):
 *   cv       den Lebenslauf lesen → 1–2 echte Beobachtungen + eine sachliche Zusammenfassung
 *   job      Lebenslauf UND Stellenanzeige vergleichen → offene Punkte + die ERSTE Frage
 *   antwort  die Antwort bewerten → nachhaken ODER nächste Frage ODER Schluss
 *   report   Bericht in vier Abschnitten + Davids persönliche Einordnung
 *
 * WARUM DER LEBENSLAUF NUR EINMAL AN DIE KI GEHT: Im Schritt `cv` schreibt das Modell eine
 * nüchterne Zusammenfassung (nur Fakten aus dem Dokument), und ALLE weiteren Schritte
 * arbeiten mit ihr. Ein PDF bei jeder Frage erneut hochzuladen wäre der teuerste denkbare
 * Weg — bei sechs Fragen sechsmal dasselbe Dokument.
 *
 * ZWEI MODELLGRÖSSEN (Owner-Freigabe 28.08.2026): Die Gesprächsschritte laufen auf dem
 * kleinen Modell — sie formulieren je EINE Frage. Der Bericht und die Einordnung laufen auf
 * dem grossen: Das ist der Teil, den der Bewerber behält, weitergibt und an dem er das
 * Produkt misst.
 *
 * DER TAGES-DECKEL sitzt im Schritt `cv`, weil dort ein Screening beginnt (siehe
 * `DAVID_PRO_TAG` in lib/david-store.ts). Der Bericht selbst ist danach nie gesperrt — wer
 * angefangen hat, bekommt sein Ergebnis.
 *
 * WAS DIE KI NICHT DARF, steht in `REGELN` und geht in JEDEN Aufruf: nichts erfinden, keine
 * Einstellungsentscheidung, keine geschützten Merkmale, kein Jubel-Ton. Diese Sätze sind
 * nicht Deko — sie sind die Produktbeschreibung.
 */

const KLEIN = process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini";
const GROSS = process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5";

/**
 * Wie viele Hauptfragen David höchstens stellt — der Not-Anschlag, nicht das Ziel (§12).
 *
 * GEMESSEN am ersten echten Durchlauf (28.08.2026): Das Modell fragte bis Nummer 7 weiter
 * und hätte weitergemacht — jede Runde kostet Geld und Geduld. Die Vorgabe lautet „normal
 * 4 bis 7"; sieben ist damit die Grenze, nicht die Mitte.
 */
const MAX_FRAGEN = 7;

/**
 * UND DER HARTE DECKEL ÜBER ALLE RUNDEN — Nachfragen eingeschlossen.
 *
 * GEMESSEN am zweiten Durchlauf (28.08.2026): Das Modell setzte SIEBEN Mal hintereinander
 * `nachhaken: true` und bohrte immer tiefer nach einer „Adoptions-Metrik" für ein Design
 * System. Weil `MAX_FRAGEN` nur HAUPTfragen zählt, stand der Zähler dabei unbewegt auf 1 —
 * der Deckel konnte nie greifen. Ein Bewerber hätte längst abgebrochen, und jede Runde
 * kostet.
 */
const MAX_RUNDEN = 6;

const REGELN = [
  "Du bist David, ein erfahrener Recruiter, der mit einem Bewerber ein Pre-Screening zu EINER konkreten Stelle führt.",
  "Sprache: Deutsch, und du duzt den Bewerber.",
  "Ton: ruhig, direkt, präzise, professionell. Niemals überschwänglich. Verboten sind Wörter wie 'Super', 'Großartig', 'Fantastisch', 'Perfekte Antwort', 'Danke fürs Teilen'.",
  "Du erfindest NIE Fakten. Was nicht im Lebenslauf, in der Anzeige oder in den Antworten steht, existiert für dich nicht.",
  "Du unterscheidest sauber: was im Lebenslauf steht, was die Anzeige verlangt, was der Bewerber gesagt hat, und was deine Einschätzung ist.",
  "Du triffst KEINE Einstellungsentscheidung. Die Wörter 'einstellen', 'absagen', 'ablehnen', 'geeignet/ungeeignet als Urteil' kommen bei dir nicht vor. Du bereitest den Bewerber vor.",
  "Du leitest NIE geschützte oder sensible Merkmale ab (Herkunft, Alter, Geschlecht, Religion, Gesundheit, Familienstand) und fragst nicht danach.",
  "Bist du dir unsicher, fragst du — statt zu vermuten.",
  /* GENAU EINE FRAGE — gemessen am ersten echten Durchlauf (28.08.2026): Das Modell packte
     drei Fragen in einen Satz („welche Rolle, wie gross das Team, welche Metriken") und
     fragte beim Nachhaken zusätzlich nach Stichprobengrösse. Das ist ein Audit, kein
     Screening; ein Bewerber beantwortet davon eine und fühlt sich beim Rest ertappt. */
  "Du stellst IMMER genau EINE Frage: ein Fragezeichen, höchstens zwei Sätze, keine Aufzählung mehrerer Aspekte, kein 'und' zwischen zwei Fragen, keine Beispielliste in Klammern.",
  "Du prüfst nicht wie ein Auditor. Frage nach dem, was für die Bewerbung zählt — nicht nach Stichprobengrössen, Messzeiträumen oder Nachweisen.",
].join(" ");

type Antwort = Record<string, unknown>;

function jsonAus(text: string): Antwort {
  try { return JSON.parse(text) as Antwort; } catch { /* weiter unten */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]) as Antwort; } catch { /* weiter unten */ } }

  /**
   * DIE RETTUNG EINES ABGESCHNITTENEN OBJEKTS (29.08.2026, erster voller Prüflauf).
   *
   * Bricht die Antwort mitten im JSON ab, war bisher ALLES verloren — auch die drei
   * Abschnitte, die schon vollständig dastanden. Der Bewerber las „Der Bericht kam
   * unvollständig zurück", obwohl vier Fünftel seines Berichts fertig waren.
   *
   * Hier werden offene Klammern geschlossen und ein angefangener String beendet. Was danach
   * parst, ist gerettet; was fehlt, fehlt eben — ein Bericht mit vier von fünf Abschnitten
   * ist unendlich viel mehr wert als eine Fehlermeldung.
   */
  const start = text.indexOf("{");
  if (start < 0) return {};
  let roh = text.slice(start);
  /* Ein offener String wird zuerst geschlossen — sonst zählt die Klammer-Bilanz falsch. */
  let inString = false, escaped = false;
  const stapel: string[] = [];
  for (const z of roh) {
    if (escaped) { escaped = false; continue; }
    if (z === "\\") { escaped = true; continue; }
    if (z === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (z === "{" || z === "[") stapel.push(z);
    else if (z === "}" || z === "]") stapel.pop();
  }
  if (inString) roh += '"';
  /* Ein angefangenes Feld ohne Wert („,"titel":") würde nie parsen — bis zum letzten
     abgeschlossenen Element zurückschneiden. */
  roh = roh.replace(/,\s*"[^"]*"\s*:?\s*$/, "");
  while (stapel.length) roh += stapel.pop() === "{" ? "}" : "]";
  try { return JSON.parse(roh) as Antwort; } catch { return {}; }
}

const str = (v: unknown, max = 600) => String(v ?? "").trim().slice(0, max);
const strListe = (v: unknown, anzahl: number, laenge = 300) =>
  (Array.isArray(v) ? v : []).map(x => str(x, laenge)).filter(Boolean).slice(0, anzahl);

/** Ein Aufruf an OpenAI mit unserem Regelblock — gibt das geparste JSON zurück. */
async function frageModell(apiKey: string, modell: string, inhalt: Array<Record<string, unknown>>, denken: "low" | "medium" = "low"): Promise<{ ok: true; daten: Antwort; verbrauch: Verbrauch } | { ok: false; fehler: string; status: number }> {
  /**
   * DER GRÖSSTE KOSTENBLOCK SIND DIE DENK-TOKEN (gemessen 28.08.2026 am ersten vollen
   * Durchlauf: 26.263 Ausgabe-Token beim kleinen Modell bei fünfzehn Aufrufen — die
   * sichtbaren Antworten sind zusammen keine 2.000 Wörter lang; der Rest ist internes
   * Nachdenken, und Ausgabe-Token sind das Teuerste an einem Aufruf).
   *
   * Für das GESPRÄCH ist wenig Nachdenken richtig: Eine gute nächste Frage entsteht aus
   * dem, was dasteht — nicht aus einer langen Überlegung. Für den BERICHT bleibt es bei
   * mehr, denn das ist das Stück, das der Bewerber behält.
   *
   * Der Parameter geht nur an gpt-5-Modelle; andere kennen ihn nicht und würden den Aufruf
   * mit einem Fehler zurückweisen.
   */
  const reasoning = /^gpt-5/.test(modell) ? { reasoning: { effort: denken } } : {};

  /** Ein einzelner Anlauf — die Wiederholung darüber entscheidet, ob er reicht. */
  const anlauf = async () => {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      /**
       * GÜLTIGES JSON IST PFLICHT, NICHT BITTE (gefunden 29.08.2026 im ersten vollen Prüflauf:
       * Der Bericht kam mit „Der Bericht kam unvollständig zurück" zurück — die Antwort war
       * da, aber als abgeschnittenes JSON, und `jsonAus` lieferte ein leeres Objekt).
       *
       * Bisher stand in jedem Auftrag nur der Satz „Antworte NUR als JSON". Das ist eine
       * Bitte; das Modell darf trotzdem einen Halbsatz davor setzen oder mitten im Objekt
       * aufhören. `text.format = json_object` macht daraus eine Zusage der API: Was
       * zurückkommt, ist syntaktisch vollständiges JSON.
       */
      body: JSON.stringify({
        model: modell,
        input: [{ role: "user", content: inhalt }],
        text: { format: { type: "json_object" } },
        ...reasoning,
      }),
    });
    const roh = await res.text();
    let nutz: any = null;
    try { nutz = roh ? JSON.parse(roh) : null; } catch { nutz = null; }
    const text =
      nutz?.output_text ??
      nutz?.output?.flatMap((i: any) => i?.content ?? [])?.map((c: any) => c?.text ?? "")?.join("\n") ??
      "";
    return { res, nutz, text: String(text ?? "") };
  };

  /**
   * EINE LEERE ANTWORT IST KEINE SACKGASSE (Owner 28.08.2026, mit Bild vor dem 19-Euro-Knopf:
   * „Das Skript kam leer zurück. Versuch es bitte noch einmal.").
   *
   * Die Responses-API antwortet mit HTTP 200 und `status: "incomplete"`, wenn das interne
   * Nachdenken das Budget aufgebraucht hat, BEVOR ein sichtbarer Text entstand. `res.ok` ist
   * dann wahr, `output_text` aber leer — der Aufruf sah für uns gelungen aus, und der
   * Bewerber las eine Absage, die nur er selbst wegtippen konnte.
   *
   * Der Skript-Schritt ist der anfälligste: Er verlangt in EINEM Aufruf den Sprechtext plus
   * drei Kleidungs- und drei Umgebungsvorschläge samt Beschriftungen.
   *
   * GENAU EIN ZWEITER ANLAUF: Das Nachdenken ist nicht deterministisch, ein zweiter Versuch
   * geht meist durch. Zwei Wiederholungen wären zwei Rechnungen für ein Ergebnis; scheitert
   * auch der zweite, ist es ein echter Fehler und der Aufrufer soll ihn zeigen.
   *
   * DER VERBRAUCH BEIDER ANLÄUFE WIRD GEZÄHLT — ein Fehlversuch kostet echtes Geld, und wer
   * ihn nicht mitschreibt, misst später falsch.
   */
  let { res, nutz, text } = await anlauf();
  let zusatzHeraus = 0;
  if (res.ok && !text.trim()) {
    const grund = str(nutz?.incomplete_details?.reason, 120) || str(nutz?.status, 40) || "leer";
    console.warn("[david-screening] leere Antwort, zweiter Anlauf:", modell, grund);
    zusatzHeraus = Number(nutz?.usage?.output_tokens ?? 0) || 0;
    ({ res, nutz, text } = await anlauf());
  }

  if (!res.ok) {
    /* DIE EHRLICHE MELDUNG NACH VORN: Ein leeres Guthaben (429 „no credits remaining")
       sieht im Browser sonst aus wie ein Fehler unserer Seite. */
    const grund = str(nutz?.error?.message, 300) || `Status ${res.status}`;
    return { ok: false, fehler: grund, status: res.status };
  }

  /* WAS DER AUFRUF GEKOSTET HAT — die Antwort sagt es selbst (`usage`), also wird es
     mitgeschrieben statt geschätzt (Owner 28.08.2026: „ich will wissen, was mich das
     kostet"). Gezählt wird je Sitzung, nicht je Tag: So steht am einzelnen Screening,
     was es wirklich verbraucht hat. */
  const u = nutz?.usage ?? {};
  return {
    ok: true,
    daten: jsonAus(String(text)),
    verbrauch: {
      aufrufe: 1,
      modell,
      hinein: Number(u?.input_tokens ?? u?.prompt_tokens ?? 0) || 0,
      heraus: (Number(u?.output_tokens ?? u?.completion_tokens ?? 0) || 0) + zusatzHeraus,
    },
  };
}

/** Ein einzelner Modell-Aufruf in Zahlen. */
type Verbrauch = { aufrufe: number; modell: string; hinein: number; heraus: number };

/** Verbrauch aufaddieren — getrennt nach kleinem und grossem Modell, denn sie kosten
    unterschiedlich viel. */
function verbrauchDazu(alt: DavidSitzung["verbrauch"], neu: Verbrauch): DavidSitzung["verbrauch"] {
  const v = alt ?? { aufrufe: 0, kleinHinein: 0, kleinHeraus: 0, grossHinein: 0, grossHeraus: 0 };
  const gross = neu.modell === GROSS;
  return {
    aufrufe: v.aufrufe + 1,
    kleinHinein: v.kleinHinein + (gross ? 0 : neu.hinein),
    kleinHeraus: v.kleinHeraus + (gross ? 0 : neu.heraus),
    grossHinein: v.grossHinein + (gross ? neu.hinein : 0),
    grossHeraus: v.grossHeraus + (gross ? neu.heraus : 0),
  };
}

/** Der Lebenslauf als Modell-Eingabe: PDF als Datei, Word als extrahierter Text. */
async function cvAlsEingabe(cvPath: string): Promise<Array<Record<string, unknown>> | { fehler: string; status: number }> {
  const url = await getSignedUrl(cvPath).catch(() => "");
  if (!url) return { fehler: "Deinen Lebenslauf finde ich gerade nicht. Lade ihn bitte noch einmal hoch.", status: 404 };
  const bytes = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  if (cvPath.toLowerCase().endsWith(".docx")) {
    const text = docxZuText(bytes);
    if (!text) return { fehler: "Diese Word-Datei konnte ich nicht lesen — speichere sie bitte als PDF und lade sie erneut hoch.", status: 422 };
    return [{ type: "input_text", text: `Lebenslauf (aus einer Word-Datei):\n${text.slice(0, 24000)}` }];
  }
  return [{
    type: "input_file",
    filename: "lebenslauf.pdf",
    file_data: `data:application/pdf;base64,${bytes.toString("base64")}`,
  }];
}

/** Der Stand des Gesprächs als Text — die Grundlage jedes Schrittes nach dem Lebenslauf. */
function lage(sitzung: DavidSitzung): string {
  const teile = [
    `Vorname des Bewerbers: ${sitzung.vorname || "unbekannt"}.`,
    `LEBENSLAUF (Zusammenfassung, nur Fakten aus dem Dokument):\n${sitzung.cvBefund?.zusammenfassung || "—"}`,
    `STELLENANZEIGE (Auszug):\n${(sitzung.jobText || "").slice(0, 6000) || "—"}`,
  ];
  if (sitzung.jobBefund) {
    teile.push(`Aus der Anzeige erkannt — Aufgaben: ${sitzung.jobBefund.aufgaben.join(" · ") || "—"}; Anforderungen: ${sitzung.jobBefund.anforderungen.join(" · ") || "—"}; offene Punkte: ${sitzung.jobBefund.offen.join(" · ") || "—"}.`);
  }
  const gefuehrt = (sitzung.fragen ?? []).filter(f => f.antwort);
  if (gefuehrt.length) {
    teile.push("BISHERIGES GESPRÄCH:\n" + gefuehrt.map((f, i) => `${i + 1}. David: ${f.frage}\n   ${sitzung.vorname || "Bewerber"}: ${f.antwort}`).join("\n"));
  }
  /**
   * DIE ÜBERSPRUNGENEN GEHÖREN AUCH IN DIE LAGE (29.08.2026, beim Nachprüfen gefunden).
   *
   * Bisher sah das Modell nur BEANTWORTETE Fragen. Eine übersprungene war für es unsichtbar
   * — es wusste also nicht, dass der Bewerber zu diesem Thema bewusst geschwiegen hat, und
   * konnte mit anderen Worten genau dorthin zurücklenken. Der Wiederholungs-Riegel greift
   * nur bei fast gleichem Wortlaut, nicht beim selben Thema.
   *
   * Für den Bewerber sähe das aus, als hätte David sein Nein nicht akzeptiert — und genau
   * das ist der Moment, in dem jemand den Tab schliesst.
   */
  const weg = (sitzung.fragen ?? []).filter(f => f.uebersprungen);
  if (weg.length) {
    teile.push("ÜBERSPRUNGEN (der Bewerber wollte dazu nichts sagen — komm auf diese Themen NICHT zurück, auch nicht anders formuliert):\n"
      + weg.map(f => `- ${f.frage}`).join("\n"));
  }
  return teile.join("\n\n");
}

const leereErkenntnisse = (): DavidErkenntnisse => ({ passung: [], belege: [], motivation: [], recruiterfragen: [], selbstbild: [] });

function erkenntnisseZusammen(alt: DavidErkenntnisse | undefined, neu: Antwort): DavidErkenntnisse {
  const e = alt ?? leereErkenntnisse();
  const dazu = (feld: keyof DavidErkenntnisse, wert: unknown) => {
    const neuZeilen = strListe(wert, 4, 300).filter(z => !e[feld].includes(z));
    e[feld] = [...e[feld], ...neuZeilen].slice(0, 12);
  };
  const q = (neu.erkenntnisse ?? {}) as Record<string, unknown>;
  dazu("passung", q.passung);
  dazu("belege", q.belege);
  dazu("motivation", q.motivation);
  dazu("recruiterfragen", q.recruiterfragen);
  dazu("selbstbild", q.selbstbild);
  return e;
}

/**
 * WELCHE BEREICHE NOCH LEER SIND — GERECHNET, NICHT GEFÜHLT (Owner 29.08.2026: „ich will das
 * so hochwertig wie möglich machen").
 *
 * DER FEHLER, DER HIER BEHOBEN WIRD: David notiert nach jeder Antwort, was er gelernt hat,
 * sortiert in die fünf Bereiche — und diese Notizen wurden gespeichert, in den Bericht
 * gegeben und ANSONSTEN NIE ANGESEHEN. Ob das Gespräch fertig ist, entschied allein das
 * Modell mit einem `fertig`-Kennzeichen.
 *
 * Sprachmodelle sind bei Selbsteinschätzung notorisch gefällig: Gefragt „reicht das?", sagen
 * sie eher ja. Ein Bereich ohne eine einzige Notiz ist aber nachweislich NICHT abgedeckt —
 * das kann Code entscheiden, und Code ist hier verlässlicher als das Modell.
 *
 * Zwei Wirkungen: David zielt mit der nächsten Frage in die leere Ecke, statt zu fragen, was
 * ihm gerade einfällt. Und er darf nicht „fertig" sagen, solange eine Ecke leer ist und noch
 * Runden übrig sind.
 */
const BEREICHE: (keyof DavidErkenntnisse)[] = ["passung", "belege", "motivation", "recruiterfragen", "selbstbild"];

const BEREICH_NAME: Record<string, string> = {
  passung: "fachliche Passung",
  belege: "Belege für relevante Erfahrung",
  motivation: "Motivation und Wechselgrund",
  recruiterfragen: "was ein Recruiter hinterfragen würde",
  selbstbild: "Selbstbild und das, was der Lebenslauf nicht erzählt",
};

function leereBereiche(e: DavidErkenntnisse | undefined): (keyof DavidErkenntnisse)[] {
  if (!e) return [...BEREICHE];
  return BEREICHE.filter(b => !(e[b] ?? []).length);
}

/**
 * WELCHE ANTWORTEN DÜNN GEBLIEBEN SIND — GERECHNET, NICHT GEFRAGT (Owner 29.08.2026).
 *
 * Für den einen freien Anlauf müssen wir wissen, WO es hakte. Ein Modell dafür zu fragen wäre
 * Verschwendung: Eine Antwort aus vier Wörtern ist messbar dünn, dafür braucht es keine KI.
 *
 * Übersprungene zählen mit — er darf sie im zweiten Anlauf noch beantworten, muss aber nicht.
 * HÖCHSTENS DREI: Wer sechs Felder vor sich sieht, füllt keines aus.
 */
const DUENN_AB = 120;

function duenneAntworten(fragen: DavidFrage[]): { nr: number; frage: string; antwort: string }[] {
  return fragen
    .map((f, i) => ({ nr: i, frage: f.frage, antwort: f.antwort ?? "", weg: f.uebersprungen === true }))
    .filter(x => x.weg || (x.antwort.trim().length > 0 && x.antwort.trim().length < DUENN_AB))
    .map(({ nr, frage, antwort }) => ({ nr, frage, antwort }))
    .slice(0, 3);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Der Analyse-Dienst ist gerade nicht erreichbar." }, { status: 503 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = str(body.id, 80);
  const device = str(body.device, 80);
  const schritt = str(body.schritt, 20);
  /**
   * EIN CODE ZUM SATZ (29.08.2026, nach einem Bild des Owners: „Diese Sitzung kenne ich
   * nicht." stand ROT mitten im Trichter, während der Bewerber nur ohne Stellenanzeige
   * weitermachen wollte).
   *
   * ZWEI FEHLER IN EINEM: Erstens ist der Satz technisch — der Bewerber hat keine Sitzung
   * verloren, er hat auf einen Knopf getippt. Zweitens sind diese Sätze DEUTSCH, während der
   * Trichter in sieben Sprachen läuft; ein spanischer Besucher bekäme deutschen Text.
   *
   * Der `code` löst beides: Der Browser weiss damit, WAS los ist, kann sich selbst helfen
   * (neue Sitzung anlegen und den Schritt wiederholen) und zeigt notfalls seinen eigenen,
   * übersetzten Satz — statt unseren durchzureichen.
   */
  if (!id) return NextResponse.json({ error: "Kennung fehlt.", code: "sitzung-weg" }, { status: 400 });

  const sitzung = await leseDavid(id);
  if (!sitzung) return NextResponse.json({ error: "Diese Sitzung kenne ich nicht.", code: "sitzung-weg" }, { status: 404 });
  /**
   * KONTO SCHLÄGT GERÄT (Hausregel [[guthaben-haengt-an-einer-adresse]]; Owner 28.08.2026,
   * angemeldet und trotzdem abgewiesen: „das ist blöd, ich bin doch angemeldet").
   *
   * Die Prüfung schaute nur auf die Gerätekennung. Wer sich anmeldet, wechselt aber genau
   * deshalb das Gerät — Handy zu Rechner ist der Normalfall, nicht der Angriff. Und die
   * Anmeldung ist der STÄRKERE Nachweis: Die Gerätekennung steht in einem localStorage, die
   * Adresse hinter einem Passwort.
   *
   * Dieselbe Reihenfolge wie `darfAmProfilArbeiten` im Lebenslauf: Admin, dann Konto, dann
   * Gerät. Nur die Sitzung kennt hier keine `basisId`, deshalb kürzer.
   */
  const kontoMail = await getSellerFromRequest(request)
    .then(k => String(k?.email ?? "").trim().toLowerCase())
    .catch(() => "");
  const gehoertIhm = !!kontoMail && kontoMail === String(sitzung.email ?? "").trim().toLowerCase();
  if (!gehoertIhm && sitzung.device && device && sitzung.device !== device) {
    /* KEIN „Not yours." VOR DEM NUTZER (gesehen 28.08.2026 im Test): Die Zeile stammt aus
       den Admin-Routen des Hauses und stand hier in Rot mitten auf der Ergebnis-Seite —
       englisch, technisch und ohne Ausweg. */
    return NextResponse.json({ error: "Diesen Bericht hast du auf einem anderen Gerät erstellt. Melde dich mit der Adresse an, mit der du ihn erstellt hast — oder starte hier ein neues Screening." }, { status: 403 });
  }
  /**
   * DIE ZUSTIMMUNG IST DIE BEDINGUNG — DIE ADRESSE IST ES ERST AM ERGEBNIS
   * (Owner 31.08.2026: „wir fragen zu schnell nach Name und E-Mail" · „wir fangen mit
   * Lebenslauf und testen").
   *
   * WAS GEMESSEN WURDE: Von 19 bis 27 Menschen, die über die erste Anzeige auf den Trichter
   * kamen, hat KEIN EINZIGER den ersten Schritt abgeschickt. Davor standen zwei Tippfelder
   * und eine Einwilligung — Vorname, Adresse, Haken —, bevor David irgendetwas geliefert
   * hatte. Auf dem Handy heisst das: Tastatur auf, für ein Versprechen ohne Beweis. Dieselbe
   * Lehre steht seit dem Chat im Haus (Memory `chat-no-personal-questions-buttons-only`:
   * „Nutzer wollen klicken statt tippen"), und dieselbe Entscheidung hat der Owner am
   * 26.08. schon für die Lebenslauf-Tür getroffen: CV ohne Mail-Tor, Adresse nach der
   * Analyse. David hatte sie nur nie bekommen.
   *
   * WAS BLEIBT: Die DATENSCHUTZ-Bestätigung. Sie hängt jetzt am Upload — dort beginnt die
   * Verarbeitung, dort gehört sie hin, und ohne sie läuft kein einziger Schritt.
   *
   * WAS WANDERT: Die E-Mail. Sie wird erst gebraucht, wo sie einen Zweck hat — beim
   * Bericht, den wir ihm schicken und aufheben. Wer bis dahin gekommen ist, gibt sie gern;
   * wer vorher aussteigt, hätte uns eine Adresse ohne Ergebnis dagelassen.
   */
  if (!sitzung.datenschutzBestaetigt) {
    return NextResponse.json({ error: "Bitte zuerst die Bestätigung.", code: "lead-fehlt" }, { status: 400 });
  }
  /* Der Bericht ist der eine Schritt, der die Adresse braucht: Er wird verschickt und
     aufgehoben. */
  if (schritt === "report" && !sitzung.email) {
    return NextResponse.json({ error: "Für dein Ergebnis brauche ich noch deine E-Mail-Adresse.", code: "mail-fehlt" }, { status: 400 });
  }

  const jetzt = new Date().toISOString();
  /**
   * JEDES SPEICHERN BAUT AUF DEM VORIGEN AUF (gefunden 29.08.2026 im ersten vollen Prüflauf:
   * Der Bericht kam auf den Schirm — und war beim nächsten Öffnen weg).
   *
   * DIE FALLE, DIE HIER ZUSCHNAPPTE (Memory [[delete-resurrection-merge-bug]]: „zwei
   * Schreibvorgänge nacheinander verlieren den ersten"): `sichern` legte die Änderung IMMER
   * über `sitzung` — den Stand vom Anfang der Anfrage. Im Bericht-Schritt wird zweimal
   * gespeichert: zuerst der fertige Bericht, gleich danach der Stempel `berichtMailAt`. Der
   * zweite Aufruf schrieb `{...sitzung(ohne Bericht), berichtMailAt}` — und löschte damit den
   * Bericht, den es eine Zeile vorher gerade gespeichert hatte.
   *
   * Der Bewerber sah sein Ergebnis genau einmal. Beim Neuladen war es fort, und in der
   * Admin-Liste stand die Sitzung als „im Gespräch" statt „Bericht fertig".
   *
   * `stand` wächst jetzt mit: Jede Änderung legt sich auf den Stand NACH der letzten. Damit
   * ist die Falle für alle Schritte dieser Route geschlossen, nicht nur für diesen einen.
   */
  let stand: DavidSitzung = sitzung;
  const sichern = async (aenderung: Partial<DavidSitzung>) => {
    stand = { ...stand, ...aenderung, aktualisiertAm: jetzt };
    /* Ein misslungenes Speichern darf nicht still bleiben — sonst sucht man den Verlust
       später an der falschen Stelle. */
    const ok = await schreibeDavid(stand);
    if (!ok) console.warn("[david-screening] SPEICHERN MISSLUNGEN:", schritt, id);
  };

  /**
   * DEN LEBENSLAUF WIEDER WEGNEHMEN (Owner 29.08.2026: „kann er im Trichter auch seinen
   * Lebenslauf löschen und wieder hochladen?").
   *
   * Er hat uns die Datei anvertraut, bevor irgendetwas passiert ist — dann muss er sie auch
   * zurücknehmen können, ohne uns zu schreiben. Kostet keinen Modell-Aufruf, steht deshalb
   * vor allen Schritten, die Geld ausgeben.
   *
   * NICHT MEHR NACH DEM BERICHT: Ab dem Bericht hängt das bezahlte Produkt an dieser Datei.
   * Ein Löschen, das die eigene Bewerbung zerstört, ist kein Dienst am Nutzer — wer nach dem
   * Bericht alles gelöscht haben will, macht das über die Galerie beziehungsweise das Konto,
   * wo der ganze Auftrag verschwindet und nicht nur ein Baustein daraus.
   */
  if (schritt === "cvweg") {
    if (sitzung.report) {
      return NextResponse.json({ error: "Dein Bericht ist schon fertig — der Lebenslauf gehört jetzt dazu." }, { status: 409 });
    }
    if (sitzung.cvPath) await loescheDatei(sitzung.cvPath);
    /* Der Befund muss MIT weg: Er ist die Auswertung genau dieser Datei. Bliebe er stehen,
       spräche David über einen Lebenslauf, den es nicht mehr gibt. */
    await sichern({ cvPath: undefined, cvName: undefined, cvBefund: undefined });
    return NextResponse.json({ ok: true });
  }

  /* ───────────────────────────── SCHRITT 1: DER LEBENSLAUF ───────────────────────────── */
  if (schritt === "cv") {
    const cvPath = str(body.cvPath, 300) || sitzung.cvPath || "";
    if (!cvPath) return NextResponse.json({ error: "Es fehlt der Lebenslauf." }, { status: 400 });

    /* Der Deckel — hier, wo ein Screening wirklich beginnt. Ein zweiter Aufruf für DIESELBE
       Sitzung zählt nicht noch einmal (jemand lädt seinen Lebenslauf neu hoch). */
    if (!sitzung.cvBefund) {
      /**
       * DER DECKEL GILT NICHT FÜR UNS (Owner 29.08.2026: Er stand beim eigenen Testen vor
       * „Für heute sind auf diesem Gerät 2 Screenings gelaufen").
       *
       * Der Deckel schützt vor Missbrauch — jedes Screening kostet uns rund vier Cent, und
       * ohne Grenze schreibt jemand ein Skript. Wer das Produkt aber BAUT, testet es
       * mehrmals am Tag; ihn auszusperren macht die Entwicklung unmöglich und hat mit
       * Missbrauch nichts zu tun.
       *
       * Dieselbe Prüfung wie überall (`x-try-look-admin-pin`): in der Produktion braucht es
       * die richtige Nummer, lokal ohne gesetzte Nummer steht die Tür offen. Der übersprungene
       * Deckel wird protokolliert — eine Ausnahme, die still passiert, findet man später in
       * keiner Kostenrechnung wieder.
       */
      /**
       * AUCH DAS ANGEMELDETE ADMIN-KONTO KOMMT DURCH (Owner 29.08.2026, mit Bild: „ich kann's
       * nicht testen" — der Tagesdeckel sperrte ihn beim eigenen Produkt aus).
       *
       * Bisher zählte nur die PIN im localStorage dieses einen Browsers. Wer in einem zweiten
       * Browser, einem privaten Fenster oder auf dem Handy testet, hat sie dort nicht — und
       * stand vor der Sperre, obwohl er angemeldet ist. `isAdminRequest` prüft BEIDES: die
       * PIN-Kopfzeile UND das angemeldete Konto (der Trichter schickt den Anmelde-Kopf
       * ohnehin mit, seit „Konto schlägt Gerät" gilt).
       */
      const alsAdmin = await isAdminRequest(request).catch(() => false);
      if (alsAdmin) console.warn("[david-screening] ADMIN — Tagesdeckel übersprungen:", device.slice(0, 8));
      const heute = alsAdmin ? 0 : await davidHeuteGezaehlt(device);
      if (device && heute >= DAVID_PRO_TAG) {
        return NextResponse.json({
          error: `Für heute sind auf diesem Gerät ${DAVID_PRO_TAG} Screenings gelaufen. Morgen geht es weiter.`,
          deckel: true,
        }, { status: 429 });
      }
    }

    /* WER TAUSCHT, LÄSST NICHTS ZURÜCK: Jeder Upload bekommt einen neuen Pfad, die vorige
       Datei wäre sonst für immer im Speicher — von uns unbenutzt und für ihn unerreichbar. */
    if (sitzung.cvPath && sitzung.cvPath !== cvPath) await loescheDatei(sitzung.cvPath);

    const eingabe = await cvAlsEingabe(cvPath);
    if ("fehler" in eingabe) return NextResponse.json({ error: eingabe.fehler }, { status: eingabe.status });

    const auftrag = [
      REGELN,
      "AUFGABE: Lies diesen Lebenslauf. Du hast die Stellenanzeige noch NICHT gesehen.",
      "Gib zurück:",
      "'beobachtungen' — 1 bis 2 Sätze, die BELEGEN, dass du das Dokument wirklich gelesen hast: konkrete Schwerpunkte, Art der Unternehmen, Umfang der Erfahrung. Sprich den Bewerber direkt an ('Du bringst …'). Keine Bewertung, kein Lob.",
      /* NUR DIE BERUFSBEZEICHNUNG (Fehler gesehen 29.08.2026: Das Modell lieferte
         „2026–heute – LuxuryBandit (eigenes Projekt) – luxurybandit.com" — die komplette
         Werdegangszeile. David sagte daraufhin „ich sehe, du bist 2026–heute – …", und aus
         dem Satz, der Vertrauen schaffen soll, wurde Unsinn.
         „Wörtlich aus dem Lebenslauf" war die Ursache: Es lud dazu ein, die ganze Zeile zu
         übernehmen. Jetzt steht ausdrücklich, was NICHT hineingehört. */
      "'rolle' — NUR die Berufsbezeichnung, zwei bis fünf Wörter, so wie man sie jemandem am Telefon sagen würde (Beispiele: UX-Designer, Customer Success Managerin, Berufskraftfahrer). NIEMALS Zeiträume, Jahreszahlen, Firmennamen, Adressen oder Klammerzusätze. Steht im Lebenslauf keine klare Bezeichnung, leite die naheliegendste aus den Tätigkeiten ab.",
      "'schwerpunkte' — 2 bis 4 kurze Arbeitsfelder.",
      /* DEN NAMEN LIEST DAVID SELBST (Owner 31.08.2026: „wir fragen zu schnell nach Name und
         E-Mail"). Er stand im Lebenslauf, seit es Lebensläufe gibt — ihn vorher abzufragen
         war eine Tippaufgabe für etwas, das wir ohnehin gleich erfahren. */
      "'vorname' — NUR der Vorname des Bewerbers, so wie er im Lebenslauf steht. Kein Nachname, kein Titel. Steht kein Name drin, lass das Feld weg.",
      /* NUR DIE STUFE — siehe die Begründung am Feld `layout` in lib/david-store.ts. */
      "'layout' — wie der Lebenslauf als Dokument auf den ersten Blick wirkt: 'gut' (Struktur und Zeiträume sofort erfassbar), 'mittel' (lesbar, aber man muss suchen) oder 'schwach' (Textwüste, unruhig, schwer zu scannen). NUR dieses eine Wort, KEINE Begründung, KEINE Verbesserungsvorschläge.",
      "'foto' — true, wenn der Lebenslauf ein Bewerbungsfoto einer Person enthält, sonst false.",
      /* WAS ER AUF SEINEM EIGENEN BEWERBUNGSFOTO TRÄGT (Owner 28.08.2026: „man kann es auch
         aus seinem cv bild ableiten") — die beste Vorlage für das spätere Video: So hat er
         sich selbst entschieden zu zeigen. NUR die Kleidung, nichts über die Person. */
      "'kleidungImFoto' — falls ein Bewerbungsfoto da ist: EIN kurzer englischer Satz, der NUR die Kleidung darauf beschreibt (z. B. 'dark blazer over a light blouse'). Keine Aussage über die Person selbst. Ohne Foto lass das Feld weg.",
      "Beurteile Layout und Foto NUR, wenn du das Dokument wirklich siehst. Bekommst du bloss Text (aus einer Word-Datei), lass beide Felder weg.",
      /**
       * DAS NADELÖHR DES GANZEN PRODUKTS (Owner 29.08.2026: „ich will das so hochwertig wie
       * möglich machen. Wenn mein Prompt das verhindert hat, dann bitte umstellen.").
       *
       * Das Dokument geht GENAU EINMAL an die KI — danach arbeitet David nur noch mit dieser
       * Zusammenfassung (siehe `lage()`). Sie war auf 150–300 Wörter begrenzt, und damit
       * hingen alle sechs Fragen, der Bericht UND die bezahlten Unterlagen an einem
       * Textabsatz. Was hier durchfällt, ist für den Rest des Vorgangs nicht mehr vorhanden —
       * kein Prompt weiter unten kann das reparieren.
       *
       * Eingabe-Token sind um ein Vielfaches billiger als Ausgabe-Token: Eine dreimal so
       * lange Zusammenfassung kostet uns einmalig ein paar Zehntelcent und verbessert jeden
       * folgenden Schritt. Das ist der grösste Qualitätshebel im ganzen Screening.
       */
      "'zusammenfassung' — 450 bis 800 Wörter, nüchtern, NUR Fakten aus dem Dokument. Lieber zu ausführlich als zu knapp: Diese Zusammenfassung ist ab jetzt deine EINZIGE Quelle über diesen Menschen — das Dokument selbst siehst du nie wieder.",
      "In die Zusammenfassung gehört, je Station: Zeitraum (Monat/Jahr, wie im Dokument), Arbeitgeber, Branche und Grösse falls erkennbar, Rolle, Verantwortungsumfang (Team, Budget, Region), konkrete Aufgaben, genannte Ergebnisse MIT ihren Zahlen.",
      "Ausserdem: Ausbildung mit Abschluss und Jahr, Sprachen mit Niveau, Werkzeuge und Methoden namentlich, Zertifikate, Ehrenamt, Publikationen — alles, was im Dokument steht.",
      "Nenne ausdrücklich, was AUFFÄLLT: Lücken zwischen zwei Stationen (mit Zeitraum), auffällig kurze Anstellungen, Brüche in der Fachrichtung, Rollen ohne erkennbares Ergebnis. Schreibe sie als Beobachtung hin, ohne sie zu bewerten — sie sind später der Stoff für die richtigen Fragen.",
      "Zahlen, Eigennamen und Zeiträume übernimmst du EXAKT. Runde nichts, glätte nichts, lass nichts weg, weil es unwichtig scheint.",
      'Antworte NUR als JSON: {"beobachtungen":["..."],"vorname":"...","rolle":"...","schwerpunkte":["..."],"layout":"gut|mittel|schwach","foto":true,"zusammenfassung":"..."}',
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }, ...eingabe]);
    if (!r.ok) return NextResponse.json({ error: `Der Lebenslauf ließ sich nicht auswerten. ${r.fehler}` }, { status: r.status });

    const beobachtungen = strListe(r.daten.beobachtungen, 2, 400);
    /* Der Rahmen wächst mit — bei 4000 Zeichen wäre eine 800-Wort-Zusammenfassung mitten im
       Satz abgeschnitten worden. */
    const zusammenfassung = str(r.daten.zusammenfassung, 9000);
    if (!zusammenfassung) {
      return NextResponse.json({ error: "Aus dieser Datei konnte ich keinen Lebenslauf lesen. Lade ihn bitte als PDF hoch." }, { status: 422 });
    }
    const layoutWert = str(r.daten.layout, 10);
    const cvBefund = {
      beobachtungen,
      rolle: str(r.daten.rolle, 120) || undefined,
      schwerpunkte: strListe(r.daten.schwerpunkte, 4, 60),
      /* Nur die drei erlaubten Stufen — was das Modell sonst schreibt, wird verworfen. */
      ...(["gut", "mittel", "schwach"].includes(layoutWert) ? { layout: layoutWert as "gut" | "mittel" | "schwach" } : {}),
      ...(typeof r.daten.foto === "boolean" ? { foto: r.daten.foto } : {}),
      ...(str(r.daten.kleidungImFoto, 300) ? { kleidungImFoto: str(r.daten.kleidungImFoto, 300) } : {}),
      zusammenfassung,
    };
    if (!sitzung.cvBefund && device) await davidHeuteHochzaehlen(device);
    /* Der Vorname aus dem Dokument — nur, wenn der Bewerber ihn nicht selbst gesetzt hat.
       Was er tippt, schlägt immer, was wir lesen. */
    const vornameAusCv = str(r.daten.vorname, 60);
    await sichern({
      cvPath, cvName: str(body.cvName, 200) || sitzung.cvName, cvBefund,
      ...(!sitzung.vorname && vornameAusCv ? { vorname: vornameAusCv } : {}),
      verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch),
    });
    return NextResponse.json({
      ok: true, beobachtungen, rolle: cvBefund.rolle, schwerpunkte: cvBefund.schwerpunkte,
      layout: cvBefund.layout, foto: cvBefund.foto,
      vorname: sitzung.vorname || vornameAusCv,
    });
  }

  /* ──────────────────── SCHRITT 2: DIE STELLE — UND DIE ERSTE FRAGE ──────────────────── */
  if (schritt === "job") {
    let jobText = str(body.jobText, 20000);
    /**
     * AUCH OHNE STELLE (Owner 29.08.2026: „weiter ohne Stellenanzeige müsste auch gehen. Aber
     * dafür analysieren wir nur sein CV" — und auf die Frage, was dann verkauft wird: Weg A,
     * „der Gratis-Bericht ohne Stelle ist trotzdem wertvoll, er ist der Köder, aber das
     * Bezahlte bleibt der Zuschnitt").
     *
     * WER OHNE ZIEL KOMMT, WEISS OFT NUR NOCH NICHT WOHIN. Ihn hier wegzuschicken hiesse,
     * genau die zu verlieren, die am ehesten Hilfe brauchen. Also läuft dasselbe Gespräch —
     * nur ohne Vergleich: Die Fragen zielen dann auf seinen Werdegang und darauf, wohin er
     * überhaupt will, statt auf die Passung zu einer Anzeige.
     *
     * DAS BEZAHLTE PRODUKT BLEIBT DAVON UNBERÜHRT: Der Zuschnitt braucht ein Ziel, und
     * danach fragt das Angebot später noch einmal. Der Bericht ist gratis und darf ohne
     * auskommen; die Ware nicht.
     */
    const ohneStelle = body.ohneStelle === true;

    /**
     * EINE ADRESSE STATT DES TEXTES (Owner 29.08.2026: „hatten wir das hier nicht so, dass
     * er auch einen Link einfügen kann?").
     *
     * Über dem Feld stand die Zusage längst — „Füge die Anzeige ein ODER GIB DIE ADRESSE AN"
     * —, eingelöst war sie nie: Eine eingefügte Adresse ist kürzer als 60 Zeichen und flog
     * mit „Das ist mir zu wenig Text" hinaus. Wer der Aufforderung folgte, bekam eine
     * Absage.
     *
     * JEDE ABSAGE NENNT IHREN GRUND (Hausregel, gelernt am Upload): „nicht erreichbar" ist
     * etwas anderes als „die Seite baut ihren Text erst im Browser zusammen". Nur so weiss
     * der Bewerber, ob er es noch einmal versuchen oder den Text kopieren soll.
     */
    if (!ohneStelle && istAdresse(jobText)) {
      const geholt = await anzeigeAusAdresse(jobText);
      if ("fehler" in geholt) {
        const grund = geholt.fehler === "adresse"
          ? "Diese Adresse kann ich nicht öffnen. Kopier den Text der Anzeige bitte hier hinein."
          : geholt.fehler === "zu-wenig" || geholt.fehler === "kein-text"
            ? "Von dieser Seite bekomme ich keinen Text — viele Jobbörsen lassen das nicht zu. Kopier den Anzeigentext bitte hier hinein."
            : "Ich komme an diese Seite gerade nicht heran. Kopier den Anzeigentext bitte hier hinein.";
        return NextResponse.json({ error: grund }, { status: 400 });
      }
      jobText = geholt.text;
    }

    if (!ohneStelle && jobText.length < 60) {
      return NextResponse.json({ error: "Das ist mir zu wenig Text. Füge die Anzeige bitte vollständig ein." }, { status: 400 });
    }
    if (!sitzung.cvBefund?.zusammenfassung) {
      /* Der Browser hat den Pfad zum hochgeladenen Lebenslauf noch — er kann die Auswertung
         nachholen, statt den Bewerber auf eine rote Zeile starren zu lassen. */
      return NextResponse.json({ error: "Zuerst brauche ich deinen Lebenslauf.", code: "cv-fehlt" }, { status: 400 });
    }

    const auftrag = [
      REGELN,
      ohneStelle
        ? "AUFGABE: Es gibt KEINE Stellenanzeige — der Bewerber weiss noch nicht, wohin er sich bewirbt. Arbeite allein mit seinem Lebenslauf. Du zeigst ihm JETZT noch kein Ergebnis. Erfinde keine Stelle und tu nicht so, als gäbe es eine."
        : "AUFGABE: Vergleiche den Lebenslauf mit dieser konkreten Stellenanzeige. Du zeigst dem Bewerber JETZT noch kein Ergebnis.",
      "Gib zurück:",
      ohneStelle
        ? "'jobTitel', 'jobOrt', 'jobArt', 'aufgaben', 'anforderungen' — alle LEER lassen: Es gibt keine Anzeige."
        : "'jobTitel' — die Position, wörtlich aus der Anzeige (ohne Ort).",
      ohneStelle ? "" : "'jobOrt' — Ort und Arbeitsmodell, wie die Anzeige es nennt (z. B. 'München, hybrid'), sonst leer. 'jobArt' — Anstellungsart (z. B. 'Vollzeit'), sonst leer.",
      ohneStelle ? "" : "'aufgaben' — 3 bis 5 Hauptaufgaben der Stelle.",
      ohneStelle ? "" : "'anforderungen' — 3 bis 6 wichtige Anforderungen.",
      ohneStelle
        ? "'offen' — 3 bis 6 Punkte, die ein Recruiter aus diesem Lebenslauf allein NICHT beurteilen kann. Genau daraus entsteht gleich das Gespräch."
        : "'offen' — 3 bis 6 Punkte, die ein Recruiter aus dem Lebenslauf allein NICHT beurteilen kann. Genau daraus entsteht gleich das Gespräch.",
      ohneStelle
        ? "'ersteFrage' — deine erste Frage an den Bewerber. Sie zielt auf SEINEN Werdegang und darauf, wohin er beruflich will — es gibt keine Stelle zum Vergleichen. Sie darf nichts abfragen, was im Lebenslauf schon eindeutig steht. Eine Frage, kein Fragenbündel, höchstens drei Sätze."
        : "'ersteFrage' — deine erste Frage an den Bewerber. Sie muss sich auf SEINEN Werdegang UND auf DIESE Stelle beziehen und darf nichts abfragen, was im Lebenslauf schon eindeutig steht. Eine Frage, kein Fragenbündel, höchstens drei Sätze.",
      "'bereich' — welcher der fünf Bereiche das ist: passung, belege, motivation, recruiterfragen, selbstbild.",
      /**
       * DER PLAN — WAS AUF IHN ZUKOMMT (Owner 29.08.2026: „der User hat keine Ahnung, was
       * auf ihn zukommt und wie lange das dauert … einen Plan erstellen, der ihm sagt: ok,
       * ich werde dir jetzt 6 Fragen stellen …").
       *
       * KOSTET NICHTS EXTRA: Der Plan entsteht in DEMSELBEN Aufruf, der ohnehin die erste
       * Frage erzeugt. Ein zweiter Aufruf nur für drei Zeilen wäre Geldverbrennen.
       *
       * UND ER IST ECHT, NICHT DEKORATIV: Die drei Punkte kommen aus SEINEM Lebenslauf und
       * SEINER Anzeige. Ein Plan aus Textbausteinen („wir sprechen über deine Stärken")
       * würde genau das Gegenteil bewirken — er beweist, dass niemand gelesen hat.
       */
      "'plan' — 3 Punkte, die dem Bewerber sagen, WORÜBER du gleich sprechen wirst UND WARUM ausgerechnet darüber. Je Punkt: 'punkt' (höchstens 8 Wörter, konkret aus seinem Lebenslauf oder der Anzeige, z. B. 'Deine Rolle im Portal-Relaunch') und 'warum' (EIN Halbsatz, höchstens 14 Wörter, der die LÜCKE benennt, z. B. 'die Anzeige verlangt Führung, dein Lebenslauf sagt dazu nichts').",
      "Das 'warum' ist der wichtigste Teil des Plans: Es beweist, dass du beide Dokumente wirklich gelesen hast. Nenne die konkrete Stelle, an der etwas fehlt, unklar ist oder auffällt — nie ein allgemeines Thema wie 'deine Stärken', 'deine Motivation' oder 'dein Werdegang'.",
      'Antworte NUR als JSON: {"jobTitel":"...","jobOrt":"...","jobArt":"...","aufgaben":["..."],"anforderungen":["..."],"offen":["..."],"ersteFrage":"...","bereich":"...","plan":[{"punkt":"...","warum":"..."}]}',
      "",
      lage(ohneStelle ? sitzung : { ...sitzung, jobText }),
    ].join("\n");

    /**
     * DAS GROSSE MODELL FÜR DIE ERSTE FRAGE (Owner 29.08.2026: „ich will das so hochwertig
     * wie möglich machen").
     *
     * WARUM AUSGERECHNET HIER: Dieser eine Aufruf entscheidet drei Dinge auf einmal — was aus
     * der Anzeige herausgelesen wird, welchen PLAN der Bewerber zu sehen bekommt (an dem er
     * beurteilt, ob das ein durchdachtes System ist oder Textbaustein-Müll), und mit welcher
     * Frage das Gespräch beginnt. Die erste Frage setzt die Richtung für alle folgenden; eine
     * schwache erste Frage kann keine gute vierte mehr retten.
     *
     * DIE NACHFOLGENDEN FRAGEN BLEIBEN AUF DEM KLEINEN MODELL: Sie haben es leichter — der
     * Kontext steht dann schon, die Richtung ist gesetzt, und sie laufen vier- bis siebenmal
     * je Screening. Sie alle auf das grosse Modell zu legen, würde die Kosten je Screening
     * vervielfachen, ohne die Richtung noch einmal zu entscheiden.
     */
    const r = await frageModell(apiKey, GROSS, [{ type: "input_text", text: auftrag }], "low");
    if (!r.ok) return NextResponse.json({ error: `Die Anzeige ließ sich nicht auswerten. ${r.fehler}` }, { status: r.status });

    const jobBefund = {
      aufgaben: strListe(r.daten.aufgaben, 5, 200),
      anforderungen: strListe(r.daten.anforderungen, 6, 200),
      offen: strListe(r.daten.offen, 6, 250),
    };
    const ersteFrage = str(r.daten.ersteFrage, 600);
    if (!ersteFrage) {
      return NextResponse.json({ error: ohneStelle
        ? "Ich konnte aus deinem Lebenslauf keine Frage ableiten. Versuch es bitte noch einmal."
        : "Ich konnte aus dieser Anzeige keine Frage ableiten. Füge sie bitte vollständiger ein." }, { status: 422 });
    }

    const fragen: DavidFrage[] = [{ frage: ersteFrage, bereich: (str(r.daten.bereich, 20) as DavidFrage["bereich"]) || undefined, gestelltAm: jetzt }];
    /* OHNE STELLE WIRD NICHTS ÜBER SIE GESPEICHERT — kein leerer Titel, kein erfundener Ort.
       `ohneStelle` merkt sich die Entscheidung, damit Bericht und Angebot sie kennen. */
    await sichern({ ...(ohneStelle ? { ohneStelle: true } : { jobText }), jobTitel: ohneStelle ? undefined : str(r.daten.jobTitel, 200) || undefined, jobOrt: str(r.daten.jobOrt, 120) || undefined, jobArt: str(r.daten.jobArt, 60) || undefined, jobBefund, fragen, verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch) });
    return NextResponse.json({
      ok: true,
      jobTitel: str(r.daten.jobTitel, 200),
      jobOrt: str(r.daten.jobOrt, 120),
      jobArt: str(r.daten.jobArt, 60),
      ersteFrage, offen: jobBefund.offen,
      /**
       * DER PLAN — MIT BEGRÜNDUNG (Owner 29.08.2026: „genau da ist der Punkt, wo wir etwas
       * sagen müssen, damit er sieht, dass es kein AI-Slop ist, sondern ein durchdachtes
       * System — und dann macht er weiter.").
       *
       * Drei Themen zu NENNEN ist billig und klingt nach Baukasten. Zu sagen, WARUM
       * ausgerechnet diese drei — weil die Anzeige X verlangt und der Lebenslauf dazu
       * schweigt —, kann nur, wer beide Dokumente gelesen hat. Genau das ist der Beweis.
       */
      plan: (Array.isArray(r.daten.plan) ? r.daten.plan : []).slice(0, 3).map(x => ({
        punkt: str((x as Antwort)?.punkt, 80),
        warum: str((x as Antwort)?.warum, 140),
      })).filter(p => p.punkt),
    });
  }

  /* ─────────────────────── SCHRITT 3: EINE ANTWORT, EIN GEDANKE ─────────────────────── */
  /**
   * DER EINE FREIE ANLAUF — EINLÖSEN (Owner 29.08.2026: „oder wir sagen, er hat noch einen
   * Anlauf frei").
   *
   * ER KOSTET UNS NICHTS: Hier läuft KEIN Modell. Es werden nur seine verbesserten Antworten
   * über die alten gelegt; der Bericht, der danach entsteht, wäre ohnehin einmal gelaufen.
   * Aus einem dünnen Bericht wird damit einer, der verkauft — zum Preis von null.
   *
   * DER RIEGEL STEHT HIER, NICHT IM BROWSER: `nachbesserungAm` wird beim ersten Mal gestempelt.
   * Ein zweiter Aufruf prallt ab, egal was der Browser schickt.
   */
  if (schritt === "nachbessern") {
    if (sitzung.nachbesserungAm) {
      return NextResponse.json({ error: "Diesen Anlauf hast du schon genutzt.", code: "anlauf-weg" }, { status: 409 });
    }
    const fragen = [...(sitzung.fragen ?? [])];
    const roh = Array.isArray(body.antworten) ? body.antworten : [];
    let geaendert = 0;
    for (const a of roh.slice(0, 3)) {
      const nr = Number((a as Record<string, unknown>)?.nr);
      const text = str((a as Record<string, unknown>)?.text, 4000);
      if (!Number.isInteger(nr) || nr < 0 || nr >= fragen.length || text.length < 2) continue;
      fragen[nr] = { ...fragen[nr], antwort: text, uebersprungen: undefined };
      geaendert++;
    }
    await sichern({ fragen, nachbesserungAm: jetzt });
    return NextResponse.json({ ok: true, geaendert });
  }

  if (schritt === "antwort") {
    const antwort = str(body.antwort, 4000);
    const fragen = [...(sitzung.fragen ?? [])];
    const offen = fragen[fragen.length - 1];
    /* War die offene Frage schon eine Nachfrage, ist die Sache jetzt erledigt — zweimal
       zum selben Punkt nachzuhaken ist ein Verhör, kein Screening. */
    const warSchonNachfrage = offen?.nachhaken === true;
    if (!offen) return NextResponse.json({ error: "Es steht gerade keine Frage offen.", code: "keine-frage" }, { status: 400 });

    /**
     * DIE FRAGE ÜBERSPRINGEN (Owner 29.08.2026, mit Bild: „hier machst du es ihm schwer. Er
     * kann ohne Antwort weder vor noch zurück.").
     *
     * Sechs Fragen, und bei jeder war der Bewerber gefangen: keine Antwort, kein Weiter.
     * Manche Frage passt schlicht nicht auf ihn, manche will er nicht beantworten — und wer
     * feststeckt, schliesst den Tab. Dann ist das ganze Screening verloren, samt der
     * Antworten, die er schon gegeben hat.
     *
     * ÜBERSPRINGEN IST EINE ANTWORT: David hakt nicht nach, kommt nicht darauf zurück und
     * wechselt den Bereich. Zwei Übersprungene hintereinander beenden das Gespräch — wer
     * zweimal nicht reden will, will nicht reden, und jede weitere Runde kostet uns Geld
     * für nichts.
     */
    /**
     * „ICH VERSTEHE DIE FRAGE NICHT" — DER DRITTE WEG (Owner 29.08.2026, mit Bild: Er tippte
     * genau diesen Satz ins Antwortfeld und fragte „was machst du jetzt?").
     *
     * WAS BISHER PASSIERT WÄRE, UND WARUM ES DOPPELT FALSCH IST:
     *   1. Der Satz wäre als seine ANTWORT gespeichert worden und später als Kontext in den
     *      Bericht und in die bezahlten Unterlagen geflossen.
     *   2. Die Regel „ist die Antwort an deiner Frage vorbeigegangen, geh zum nächsten Punkt"
     *      hätte David dazu gebracht, das Thema fallen zu lassen — ausgerechnet die Lücke,
     *      die er gerade schliessen wollte.
     *
     * Ein Mensch würde die Frage anders stellen. Genau das tut David jetzt: DIESELBE Frage,
     * einfacher, mit einem Beispiel, wie eine brauchbare Antwort aussieht. Keine neue Frage,
     * kein neues Thema, keine verbrauchte Runde — der Zähler bleibt stehen.
     *
     * EIGENER, KURZER AUFTRAG: Der grosse Gesprächs-Prompt mit Erkenntnissen und Bereichen
     * wird hier nicht gebraucht — Umformulieren ist eine kleine Aufgabe. Das hält den Aufruf
     * billig (ein Bruchteil einer normalen Runde).
     */
    if (body.unklar === true) {
      const auftragUnklar = [
        REGELN,
        "AUFGABE: Der Bewerber sagt, er versteht deine Frage nicht. Stelle GENAU DIESELBE Frage noch einmal — einfacher.",
        "Kürzere Wörter, keine Fachbegriffe, höchstens zwei Sätze. Es bleibt dasselbe Thema und dasselbe Erkenntnisziel; du wechselst NICHT den Bereich und stellst KEINE neue Frage.",
        "Hänge EIN kurzes Beispiel an, wie eine brauchbare Antwort aussehen könnte — angelehnt an SEINEN Lebenslauf, nicht erfunden. Das Beispiel ist keine Vorgabe, sondern eine Hilfe.",
        "Kein Kommentar dazu, dass er nicht verstanden hat. Keine Entschuldigung.",
        'Antworte NUR als JSON: {"frage":"..."}',
        "",
        `DEINE URSPRÜNGLICHE FRAGE: ${offen.frage}`,
        lage(sitzung),
      ].join("\n");

      const ru = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftragUnklar }]);
      if (!ru.ok) return NextResponse.json({ error: "Das Gespräch stockt gerade.", code: "modell" }, { status: ru.status });
      const neuGefragt = str(ru.daten.frage, 600);
      if (!neuGefragt) return NextResponse.json({ error: "Das Gespräch stockt gerade.", code: "modell" }, { status: 502 });

      /* Die Frage wird ERSETZT, nicht angehängt: Es ist dieselbe Frage, nur anders gesagt.
         Zwei Einträge im Verlauf sähen aus, als hätte David zweimal gefragt. */
      offen.frage = neuGefragt;
      await sichern({ fragen, verbrauch: verbrauchDazu(sitzung.verbrauch, ru.verbrauch) });
      return NextResponse.json({ ok: true, neueFrage: neuGefragt });
    }

    const uebersprungen = body.uebersprungen === true;
    if (!uebersprungen && antwort.length < 2) {
      return NextResponse.json({ error: "Schreib mir bitte ein paar Worte.", code: "antwort-kurz" }, { status: 400 });
    }

    if (uebersprungen) offen.uebersprungen = true;
    else {
      offen.antwort = antwort;
      /* Er hat es sich anders überlegt und die übersprungene Frage doch beantwortet — dann
         ist sie keine übersprungene mehr, sonst zählt der Bericht sie als Lücke. */
      offen.uebersprungen = undefined;
    }

    const beantwortet = fragen.filter(f => f.antwort).length;
    const hauptfragen = fragen.filter(f => !f.nachhaken).length;
    /* Was David bis hierher noch NICHT notiert hat — gerechnet, nicht gefragt. */
    const offeneBereiche = leereBereiche(sitzung.erkenntnisse);
    /* Zwei hintereinander — nicht zwei insgesamt. Wer eine Frage überspringt und die nächste
       ausführlich beantwortet, soll weitermachen dürfen. */
    const letzteZwei = fragen.slice(-2);
    const zweiMalWeg = letzteZwei.length === 2 && letzteZwei.every(f => f.uebersprungen);

    /**
     * ZWEIMAL ÜBERSPRUNGEN — DANN WIRD GEFRAGT, NICHT ABGEBROCHEN (Owner 29.08.2026, sein
     * Weg, nicht meiner):
     *
     *   „Wenn der User zwei überspringt, hat er nicht wirklich Interesse, weiter zu
     *    beantworten … Hier will er einfach nur den Lebenslauf analysieren lassen. Wir haben
     *    hier eventuell Chancen, ihm etwas zu verkaufen, nur wenn wir ihm am Ende doch etwas
     *    Schlaues sagen."
     *
     * Mein erster Entwurf beendete das Gespräch still — technisch richtig, kaufmännisch
     * falsch: Der Bewerber hätte nie erfahren, warum plötzlich Schluss ist, und der Bericht
     * wäre aus dem Nichts gekommen. Jetzt wird er gefragt, und er entscheidet.
     *
     * KEIN MODELL-AUFRUF AN DIESER STELLE: Wir wissen aus den Daten selbst, dass zweimal
     * übersprungen wurde. Eine Frage, die wir schon kennen, muss uns kein Modell stellen —
     * das spart bei jedem Abbrecher rund einen Cent. Der Übersprung wird trotzdem gesichert,
     * damit er beim Neuladen nicht verlorengeht.
     */
    if (uebersprungen && zweiMalWeg) {
      await sichern({ fragen });
      return NextResponse.json({ ok: true, abbruch: true, frage: offen.frage });
    }

    const auftrag = [
      REGELN,
      "AUFGABE: Der Bewerber hat gerade geantwortet. Entscheide, wie es weitergeht.",
      `Bisher beantwortet: ${beantwortet} Fragen, davon ${hauptfragen} Hauptfragen. Normal sind 4 bis 7 Hauptfragen — die Zahl ist kein Ziel, sondern eine Spanne.`,
      uebersprungen
        ? "Der Bewerber hat diese Frage ÜBERSPRUNGEN. Das ist sein gutes Recht: Frag NICHT nach, komm NIE darauf zurück, kommentiere es nicht und wechsle zu einem ganz anderen Bereich. Lass 'reaktion' leer und setze 'nachhaken' auf false."
        : "",
      fragen.filter(f => f.nachhaken).length >= 2
        ? "Du hast in diesem Gespräch schon zwei Mal nachgehakt. Das reicht — hake NICHT mehr nach ('nachhaken' auf false), nimm eine dünne Antwort hin und geh zum nächsten offenen Bereich."
        : "",
      warSchonNachfrage
        ? "Die zuletzt gestellte Frage war BEREITS eine Nachfrage. Zu dieser Sache fragst du jetzt nicht noch einmal nach — setze 'nachhaken' auf false und geh zum nächsten offenen Bereich oder mach Schluss."
        : "",
      /**
       * DIE LEEREN ECKEN STEUERN DIE NÄCHSTE FRAGE (Owner 29.08.2026, Qualitätsauftrag).
       *
       * Vorher suchte sich das Modell den nächsten Bereich selbst aus — und ging dorthin, wo
       * das Gespräch gerade war, statt dorthin, wo noch nichts steht. Jetzt bekommt es die
       * Liste der Bereiche, zu denen es noch KEINE einzige Notiz gemacht hat.
       */
      offeneBereiche.length
        ? `ZU DIESEN BEREICHEN HAST DU NOCH NICHTS NOTIERT: ${offeneBereiche.map(b => BEREICH_NAME[b]).join(", ")}. Deine nächste Frage zielt auf einen davon — es sei denn, eine Nachfrage zur letzten Antwort bringt eindeutig mehr.`
        : "ZU ALLEN FÜNF BEREICHEN hast du etwas notiert. Frag nur weiter, wenn eine Antwort wirklich zu dünn war, sonst setze 'fertig' auf true.",
      beantwortet >= 4
        ? "Du hast genug Runden gehabt: Prüfe JETZT, ob du zu den fünf Bereichen jeweils etwas Belastbares hast. Wenn ja, setze 'fertig' auf true. Vollständigkeit in jedem Detail ist nicht das Ziel — ein Screening ist ein erstes Gespräch, kein Verhör."
        : "",
      "Gib zurück:",
      /**
       * DIE RÜCKGABE (Owner 29.08.2026: „Solche Sofortfeedbacks sind Skills des Agenten …
       * Das macht uns besonders. Wenn ich einen Immobilien-Agenten mache und der Verkäufer
       * sagt 120.000, dann muss man ihm sofort ein solches ehrliches Feedback geben — es wird
       * nichts mit der Chance, es auf dem Markt zu verkaufen.").
       *
       * WAS HIER VORHER FALSCH WAR: Das Feld gab es, aber es war auf zwölf Wörter gedeckelt
       * und durfte im Zweifel leer bleiben. Damit war es eine Höflichkeitsfloskel, kein
       * Gegenwert — der Bewerber gab etwas von sich preis und bekam nichts zurück.
       *
       * DIE RÜCKGABE MUSS AUCH WEHTUN DÜRFEN. Ein Agent, der zu allem nickt, ist wertlos: Wer
       * eine schwache Antwort gibt, muss es JETZT erfahren und nicht am Ende im Bericht —
       * dann kann er sie noch verbessern. Genau das unterscheidet uns von einem Formular.
       *
       * NIE LOB, NIE TROST: „Toll" und „das schaffst du" sind keine Rückgabe. Wahrheit mit
       * Folge ist eine.
       */
      "'reaktion' — deine sofortige, ehrliche Einschätzung dieser Antwort. Ein bis zwei Sätze, direkt an ihn gerichtet. Sie ist PFLICHT: Lass sie nie leer.",
      "Sag, was die Antwort WERT ist — und zwar mit der Folge: Ist sie ein brauchbarer Beleg, sag warum ('Die Zahl macht daraus einen Beleg, den ein Recruiter nachvollziehen kann'). Ist sie zu allgemein, sag es klar und mit der Konsequenz ('So bleibt es eine Rollenbeschreibung — damit belege ich nichts, und ein Recruiter überliest es').",
      "Widersprich, wenn du einen Widerspruch siehst — zwischen seiner Antwort und dem Lebenslauf, oder zwischen seiner Erwartung und dem, was die Anzeige verlangt. Unbequeme Wahrheiten gehören hierher, nicht in den Bericht: Jetzt kann er noch etwas ändern.",
      "NIE Lob ('gut', 'stark', 'genau richtig'), NIE Zuspruch, NIE eine Zusammenfassung seiner eigenen Worte — er weiss, was er geschrieben hat.",
      "'nachhaken' — true, wenn die Antwort für ein Screening zu allgemein oder ausweichend war UND ein Nachfassen wirklich etwas bringt. Sonst false. Hake bei derselben Sache höchstens einmal nach und frage dann nur nach dem EINEN wichtigsten fehlenden Punkt.",
      "'naechsteFrage' — die nächste Frage (bei nachhaken=true: die Nachfrage zur selben Sache; sonst eine neue Frage zu einem noch offenen Bereich). Leer lassen, wenn du fertig bist.",
      /**
       * JEDE FRAGE MUSS IHREN ZWECK NENNEN (Owner 29.08.2026) — dasselbe Mittel, das den Plan
       * glaubwürdig macht: Wer die Lücke benennen muss, die er schliessen will, stellt keine
       * Füllfrage mehr. Das Feld ist ein Zwang zum Nachdenken, kein Text für den Bewerber —
       * es wird ihm nie gezeigt, sondern nur mitgeschrieben.
       */
      "'luecke' — in höchstens 12 Wörtern: WELCHE konkrete Lücke schliesst diese Frage? Nenne die Stelle im Lebenslauf oder in der Anzeige, an der etwas fehlt oder unklar ist. Fällt dir keine ein, ist die Frage überflüssig — dann stell sie nicht, sondern mach Schluss.",
      "'bereich' — passung, belege, motivation, recruiterfragen oder selbstbild.",
      "Stelle NIE eine Frage, die in diesem Gespräch schon gestellt wurde. Ist die Antwort an deiner Frage vorbeigegangen, nimm das in EINEM Halbsatz auf und geh zum nächsten offenen Punkt — frage nicht dasselbe noch einmal.",
      "'fertig' — true, wenn du genug weisst über: fachliche Passung, Belege für relevante Erfahrung, Motivation, mögliche Recruiter-Fragen und das, was der Lebenslauf nicht erzählt. Stelle keine Frage mehr, nur um eine Zahl zu erreichen.",
      "'erkenntnisse' — was du aus dieser Antwort GELERNT hast, in fünf Listen (je 0 bis 2 kurze Punkte): passung, belege, motivation, recruiterfragen, selbstbild. Schreibe nur, was wirklich neu ist.",
      'Antworte NUR als JSON: {"reaktion":"...","nachhaken":false,"naechsteFrage":"...","luecke":"...","bereich":"...","fertig":false,"erkenntnisse":{"passung":[],"belege":[],"motivation":[],"recruiterfragen":[],"selbstbild":[]}}',
      "",
      lage({ ...sitzung, fragen }),
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
    if (!r.ok) return NextResponse.json({ error: `Das Gespräch stockt gerade. ${r.fehler}` }, { status: r.status });

    const erkenntnisse = erkenntnisseZusammen(sitzung.erkenntnisse, r.daten);
    const naechste = str(r.daten.naechsteFrage, 600);
    /**
     * WIE VIELE NACHFRAGEN INSGESAMT (Owner 29.08.2026: „Eine Antwort darf nicht zu viele
     * Rückfragen generieren, sonst wird es eine unendliche Geschichte.").
     *
     * Bisher war nur EINE Nachfrage je Thema begrenzt (`warSchonNachfrage`) — wie viele es im
     * ganzen Gespräch geben durfte, stand nirgends. Damit konnte jede zweite Runde eine
     * Nachfrage sein: aus sechs Runden wurden drei echte Fragen und drei Nachbohrer. Das ist
     * ein Verhör, kein Screening — und der Bewerber merkt genau, dass er nicht vorankommt.
     *
     * ZWEI IM GANZEN GESPRÄCH. Danach nimmt David eine dünne Antwort hin und geht weiter; was
     * fehlt, steht später im Bericht als offener Punkt — dort gehört es hin.
     */
    const nachfragenBisher = fragen.filter(f => f.nachhaken).length;
    const nachhaken = r.daten.nachhaken === true && !warSchonNachfrage && nachfragenBisher < 2;
    /* DER NOT-ANSCHLAG: Das Modell entscheidet, wann Schluss ist (§16) — aber es entscheidet
       nicht unbegrenzt. Ohne Obergrenze kann ein Gespräch endlos weiterlaufen, und jede
       Runde kostet. */
    /**
     * „FERTIG" WIRD GEPRÜFT, NICHT GEGLAUBT (Owner 29.08.2026, Qualitätsauftrag).
     *
     * Das Modell sagt gern „reicht" — Selbsteinschätzung ist die schwächste Fähigkeit eines
     * Sprachmodells. Vorher war sein Wort das erste und einzige Kriterium. Jetzt gilt: Wer
     * noch leere Bereiche hat UND noch Runden übrig, ist nicht fertig, auch wenn er es sagt.
     *
     * DIE DECKEL BLEIBEN DARÜBER: Diese Regel kann ein Gespräch verlängern, aber niemals
     * über MAX_FRAGEN/MAX_RUNDEN hinaus — die Kosten je Screening ändern sich also im
     * schlechtesten Fall gar nicht, im Regelfall bekommt der Bewerber ein bis zwei Fragen
     * mehr, die wirklich etwas beitragen.
     */
    const nochLeer = leereBereiche(erkenntnisse);
    const nochLuft = hauptfragen < MAX_FRAGEN && beantwortet < MAX_RUNDEN;
    const modellSagtFertig = r.daten.fertig === true;
    const zuFrueh = modellSagtFertig && nochLeer.length > 0 && nochLuft && !!naechste;

    const fertig = (modellSagtFertig && !zuFrueh) || !naechste
      || hauptfragen >= MAX_FRAGEN
      /* ALLE Runden, nicht nur die Hauptfragen — siehe MAX_RUNDEN oben. */
      || beantwortet >= MAX_RUNDEN;
    if (zuFrueh) {
      console.warn("[david-screening] fertig verworfen — noch leer:", nochLeer.join(","), "| Runden:", beantwortet);
    }

    /**
     * KEINE FRAGE ZWEIMAL (gemessen im ersten echten Durchlauf, 28.08.2026): Ging eine
     * Antwort an der Frage vorbei, stellte das Modell exakt dieselbe Frage noch einmal —
     * für den Bewerber sieht das aus, als hätte David nicht zugehört. Die Prompt-Regel oben
     * verhindert es in den meisten Fällen; hier steht der Riegel für den Rest.
     *
     * Hat er schon vier Hauptfragen beantwortet, ist eine Wiederholung das Zeichen, dass
     * nichts Neues mehr kommt — dann wird Schluss gemacht statt im Kreis gefragt.
     */
    const schonGefragt = (t: string) => {
      const k = (x: string) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
      return fragen.some(f => f.frage !== offen.frage && k(f.frage) === k(t));
    };
    const wiederholung = !!naechste && schonGefragt(naechste);
    const wirklichFertig = fertig || (wiederholung && hauptfragen >= 4);
    if (!wirklichFertig && naechste && !wiederholung) {
      fragen.push({
        frage: naechste, nachhaken,
        bereich: (str(r.daten.bereich, 20) as DavidFrage["bereich"]) || undefined,
        /* Der Zweck der Frage — nie für den Bewerber, sondern für uns: Daran sieht man in
           der Admin-Liste, ob David Lücken schliesst oder Füllfragen stellt. */
        ...(str(r.daten.luecke, 160) ? { luecke: str(r.daten.luecke, 160) } : {}),
        gestelltAm: jetzt,
      });
    }
    await sichern({ fragen, erkenntnisse, screeningFertigAm: wirklichFertig ? jetzt : sitzung.screeningFertigAm, verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch) });

    /* Eine Wiederholung, die NICHT zum Schluss führt (unter vier Hauptfragen), darf den
       Bewerber nicht in eine Sackgasse setzen: Dann steht die zuletzt gestellte Frage
       weiter — er hat sie ja gerade erst beantwortet, David geht beim nächsten Mal weiter. */
    const naechsteRaus = wirklichFertig ? "" : (wiederholung ? "" : naechste);
    return NextResponse.json({
      ok: true,
      /* Die Rückgabe darf jetzt zwei Sätze haben — 400 Zeichen hätten sie mitten im Satz
         abgeschnitten. */
      reaktion: str(r.daten.reaktion, 700),
      naechsteFrage: naechsteRaus,
      nachhaken: wirklichFertig ? false : nachhaken,
      fertig: wirklichFertig,
      /**
       * AM ENDE: WO ES DÜNN BLIEB — UND DER EINE FREIE ANLAUF (Owner 29.08.2026).
       *
       * Nur wenn es wirklich dünn war und der Anlauf noch offen ist. Wer ordentlich
       * geantwortet hat, bekommt kein Zeugnis, sondern sein Ergebnis — ein „du hättest besser
       * antworten können" an jemanden, der sich Mühe gegeben hat, ist eine Frechheit.
       */
      ...(() => {
        if (!wirklichFertig || sitzung.nachbesserungAm) return {};
        const duenn = duenneAntworten(fragen);
        return duenn.length ? { nachbesserung: duenn } : {};
      })(),
      nummer: fragen.filter(f => !f.nachhaken).length,
    });
  }

  /* ────────────────────────── SCHRITT 4: DER BERICHT (GRATIS) ────────────────────────── */
  if (schritt === "report") {
    if (sitzung.report) return NextResponse.json({ ok: true, report: sitzung.report });
    /* OHNE STELLE IST KEIN FEHLER MEHR (29.08.2026) — der Bericht entsteht dann allein aus
       Lebenslauf und Gespräch. Nur ganz ohne Lebenslauf geht es nicht. */
    if (!sitzung.cvBefund?.zusammenfassung || (!sitzung.jobText && !sitzung.ohneStelle)) {
      return NextResponse.json({ error: "Für den Bericht fehlt mir noch etwas." }, { status: 400 });
    }

    const auftrag = [
      REGELN,
      "AUFGABE: Schreibe jetzt das Ergebnis des Pre-Screenings. Es ist kostenlos und vollständig — halte nichts zurück.",
      /* OHNE ZIEL KEINE PASSUNGS-AUSSAGEN (29.08.2026): Der Bericht darf dann nicht so tun,
         als gäbe es eine Stelle — „das passt zur Anzeige" wäre schlicht gelogen. Aus dem
         Vergleich wird eine Standortbestimmung; der Wert bleibt, die Behauptung geht. */
      sitzung.ohneStelle
        ? "ES GIBT KEINE STELLENANZEIGE. Der Bewerber weiss noch nicht, wohin er sich bewirbt. Beziehe dich NIRGENDS auf eine Stelle, eine Anzeige oder eine Passung — es gibt nichts zu vergleichen. Schreibe stattdessen eine Standortbestimmung: was seinen Werdegang stark macht, was ein Recruiter zuerst hinterfragen würde, und worauf er sich in Gesprächen vorbereiten sollte. Bei 'vorbereiten' stellst du die Fragen, die in JEDEM Gespräch zu seinem Profil kommen."
        : "",
      "Du sprichst den Bewerber durchgehend mit DU an — auch in den Belegen. Nie in der dritten Person über ihn reden.",
      /**
       * DER BERICHT IST DER BEWEIS, DASS WIR GELESEN HABEN (Owner 30.08.2026: „wir müssen
       * hier zeigen, dass wir am Ende eine Ahnung haben und auch gelesen haben").
       *
       * Im Gespräch selbst zeigen wir es NICHT mehr — kein Beispielsatz im Eingabefeld, er
       * schreibt frei. Damit liegt die ganze Beweislast hier. Ein Bericht, der über
       * „ausgeprägte Kommunikationsstärke" schreibt, könnte über jeden Menschen geschrieben
       * sein; einer, der den Arbeitgeber, das Projekt und den Satz aus der Anzeige benennt,
       * über genau diesen einen.
       */
      "JEDER Punkt muss an einer NACHPRÜFBAREN Stelle hängen: dem Arbeitgeber, dem Projekt, der Station oder dem Zeitraum aus seinem Lebenslauf, der konkreten Anforderung aus der Anzeige, oder dem, was er selbst im Gespräch gesagt hat. Kein Punkt ohne diese Verankerung.",
      "VERBOTEN sind Sätze, die über jeden Bewerber passen würden ('ausgeprägte Kommunikationsstärke', 'hohe Eigenmotivation', 'breite Erfahrung'). Prüfe jeden Satz: Könnte er so über einen anderen Menschen stehen, ist er wertlos — schreib ihn neu oder streich ihn.",
      "Der Bericht hat vier Abschnitte und eine persönliche Einordnung:",
      "'spricht' — 2 bis 4 Punkte, die für den Bewerber sprechen. 'titel' ist eine Überschrift aus 2 bis 4 Wörtern (z. B. 'End-to-End-Verantwortung'), keine Floskel. 'tags' sind 2 bis 3 Stichwörter à höchstens 3 Wörter, die den Punkt belegen (z. B. 'Messbarer Outcome'). 'punkt' ist EIN Satz (höchstens 25 Wörter). 'beleg' ist ein VOLLSTÄNDIGER Satz in der Du-Anrede — entweder aus dem Lebenslauf ('Dein Lebenslauf nennt …') oder aus dem Gespräch ('Du hast erzählt, dass …') — und sagt, warum das für DIESE Stelle zählt. Nie ein Satzfragment, nie Floskeln wie 'aus einer seiner Antworten'.",
      "'offeneFragen' — Punkte, die ein Recruiter genauer verstehen möchte: fehlende Branchenerfahrung, unklarer Führungsumfang, ungewöhnlicher Wechsel, dünne Belege. Je Punkt: 'titel' (2 bis 4 Wörter, z. B. 'Team, Arbeitgeber & Kontext'), 'punkt' (die Frage selbst, höchstens 18 Wörter) und 'warum' (höchstens 20 Wörter). Formuliere sie als Fragen, die entstehen — NIE als Ablehnungsgrund und nie als Urteil über den Menschen.",
      "'fehltImCv' — der wichtigste Abschnitt: was im Gespräch sichtbar wurde und im Lebenslauf bisher nicht steht. Je Punkt: 'punkt' (höchstens 20 Wörter) und 'warum' (höchstens 20 Wörter). Nur, was er wirklich gesagt hat.",
      "'vorbereiten' — 3 bis 5 Fragen, die in einem ersten Recruiter-Gespräch zu GENAU diesem Lebenslauf und GENAU dieser Anzeige entstehen. Keine Standardfragen aus dem Internet.",
      /**
       * „SO SAGST DU ES BESSER" (Owner 29.08.2026) — der Vorschlag gehört ans ENDE, nicht ins
       * Gespräch: Mitten im Screening zusätzlich Textbausteine anzubieten, macht es
       * kompliziert; hier steht es in Ruhe da.
       *
       * ES IST ZUGLEICH DER STÄRKSTE BEWEIS FÜR DAS BEZAHLTE PRODUKT: Er sieht an SEINEM
       * eigenen Satz, was daraus wird — und ahnt, was erst mit dem ganzen Anschreiben
       * passiert.
       */
      "'besserSagen' — 0 bis 3 Punkte, NUR wenn er im Gespräch etwas zu allgemein gesagt hat. Je Punkt: 'gesagt' (sinngemäss, was er gesagt hat, höchstens 12 Wörter — nie ein wörtliches Zitat, das ihn blossstellt) und 'besser' (derselbe Inhalt so, wie ein Recruiter ihn braucht: 1 bis 2 Sätze in der Ich-Form).",
      "Bei 'besser' erfindest du NICHTS. Du baust nur aus Fakten, die im Lebenslauf stehen oder die er selbst gesagt hat. Fehlt eine Zahl, die den Satz stark machen würde, lass eine sichtbare Lücke: '… von [Anzahl] Designern', '… um [Zahl] Prozent'. Er füllt sie selbst.",
      "Hat er durchgehend konkret geantwortet, gib eine LEERE Liste zurück — erfinde keine Schwäche, um etwas zeigen zu können.",
      "'einordnung' — zum Schluss sprichst du persönlich. Sage EINE grössere Beobachtung über seinen beruflichen Weg, die du aus Lebenslauf und Gespräch ableitest: etwas, das er über sich selbst vielleicht nicht so sieht. KEINE Aufzählung seiner Stärken (die stehen schon oben), kein Zuspruch ('du schaffst das'), keine erfundenen Fähigkeiten, kein Versprechen. 3 bis 6 Sätze, zweite Person.",
      "'kernsatz' — EIN Satz aus höchstens 18 Wörtern, der die Einordnung auf den Punkt bringt und für sich allein stehen kann. Er steht später gross auf dem Ergebnis.",
      'Antworte NUR als JSON: {"spricht":[{"titel":"...","punkt":"...","beleg":"...","tags":["..."]}],"offeneFragen":[{"titel":"...","punkt":"...","warum":"..."}],"fehltImCv":[{"punkt":"...","warum":"..."}],"vorbereiten":["..."],"besserSagen":[{"gesagt":"...","besser":"..."}],"einordnung":"...","kernsatz":"..."}',
      "",
      lage(sitzung),
      sitzung.erkenntnisse ? `\nWAS DU IM GESPRÄCH NOTIERT HAST:\n${JSON.stringify(sitzung.erkenntnisse)}` : "",
    ].join("\n");

    /* GEMESSEN am 28.08.2026, drei Varianten desselben Berichts aus derselben Sitzung:
         gpt-5   / medium  → 6,19 ct, 70 s   (bestes Ergebnis)
         gpt-5   / low     → 2,76 ct, 42 s   (Belege und Einordnung tragen weiterhin)
         gpt-5-mini/medium → 0,48 ct, 21 s   (Belege zerfallen zu Fragmenten wie „Du beim
                                              Hersteller für Lagerverwaltungssoftware", die
                                              Einordnung wird eine Aufzählung von Stärken)
       Genommen wird die Mitte: der Bericht kostet damit weniger als die Hälfte und behält
       das, was das Produkt ausmacht. */
    const r = await frageModell(apiKey, GROSS, [{ type: "input_text", text: auftrag }], "low");
    if (!r.ok) return NextResponse.json({ error: `Der Bericht ließ sich nicht erstellen. ${r.fehler}` }, { status: r.status });

    /* 420 STATT 300 ZEICHEN (gemessen an der ersten echten Ausgabe, 28.08.2026): Der erste
       Punkt endete mitten im Wort — „passt zur Rolle mit Produktlebenszyklus-Verant". Ein
       abgeschnittener Satz sieht aus wie ein kaputtes Produkt. Der Prompt verlangt jetzt
       zusätzlich EINEN Satz je Punkt; die Grenze ist nur noch der Notnagel. */
    const paare = (v: unknown, anzahl: number) =>
      (Array.isArray(v) ? v : []).map(x => ({
        titel: str((x as Antwort)?.titel, 60),
        punkt: str((x as Antwort)?.punkt, 420),
        warum: str((x as Antwort)?.warum, 500),
        beleg: str((x as Antwort)?.beleg, 500),
        tags: strListe((x as Antwort)?.tags, 3, 30),
      })).filter(p => p.punkt).slice(0, anzahl);

    const report: DavidReport = {
      spricht: paare(r.daten.spricht, 4).map(p => ({ punkt: p.punkt, beleg: p.beleg, ...(p.titel ? { titel: p.titel } : {}), ...(p.tags.length ? { tags: p.tags } : {}) })),
      offeneFragen: paare(r.daten.offeneFragen, 5).map(p => ({ punkt: p.punkt, warum: p.warum, ...(p.titel ? { titel: p.titel } : {}) })),
      fehltImCv: paare(r.daten.fehltImCv, 5).map(p => ({ punkt: p.punkt, warum: p.warum })),
      vorbereiten: strListe(r.daten.vorbereiten, 5, 400),
      ...(() => {
        const bs = (Array.isArray(r.daten.besserSagen) ? r.daten.besserSagen : []).slice(0, 3)
          .map(x => ({ gesagt: str((x as Antwort)?.gesagt, 160), besser: str((x as Antwort)?.besser, 600) }))
          .filter(x => x.gesagt && x.besser);
        return bs.length ? { besserSagen: bs } : {};
      })(),
      einordnung: str(r.daten.einordnung, 1600),
      ...(str(r.daten.kernsatz, 200) ? { kernsatz: str(r.daten.kernsatz, 200) } : {}),
    };
    if (!report.spricht.length && !report.vorbereiten.length) {
      return NextResponse.json({ error: "Der Bericht kam unvollständig zurück. Versuch es bitte gleich noch einmal." }, { status: 502 });
    }
    await sichern({ report, screeningFertigAm: sitzung.screeningFertigAm || jetzt, verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch) });

    /**
     * DIE MAIL, DIE IHN ZURÜCKHOLT (Owner 28.08.2026: „Der User muss eine E-Mail bekommen,
     * dass seine Analyse in seinen Assets ist … und vielleicht generiert doch ein Lebenslauf
     * für Geld").
     *
     * DER RICHTIGE MOMENT IST GENAU HIER: Der Bericht steht gerade fest, der Bewerber liest
     * ihn in dieser Sekunde — und schliesst gleich danach den Tab. Später gibt es keinen
     * Auslöser mehr; es gibt keinen Wachhund für gratis Berichte.
     *
     * ERST STEMPELN, DANN SCHICKEN: Zwei Aufrufe der Route (Neuladen, Doppelklick, ein
     * zweites Gerät) dürfen nicht zweimal klingeln. Der Stempel ist die Sperre, nicht der
     * Versand — beim umgekehrten Weg klingelt es zweimal, sobald der Versand langsam ist.
     *
     * SIE DARF NIE DEN BERICHT AUFHALTEN: Der Bewerber hat sein Ergebnis bereits; ein
     * Postfehler ist unser Problem, nicht seins. Deshalb ohne `await` und in einem eigenen
     * Fang — die Antwort geht sofort raus.
     */
    if (sitzung.email && !sitzung.berichtMailAt) {
      await sichern({ berichtMailAt: jetzt });
      const origin = new URL(request.url).origin;
      void berichtMailSchicken({
        an: sitzung.email,
        vorname: sitzung.vorname,
        sitzungId: id,
        origin,
        sprache: sitzung.sprache,
        jobTitel: sitzung.jobTitel,
      }).catch(() => { /* Post ist Beigabe, der Bericht steht */ });
    }

    return NextResponse.json({ ok: true, report });
  }

  /* ───────────── SCHRITT 5: DAS SKRIPT FÜR DIE VIDEO-BEWERBUNG ─────────────
     David kann das besser als jedes andere Werkzeug im Haus: Er kennt den Lebenslauf, die
     Stelle UND das Gespräch. Der Sprechtext entsteht deshalb hier und nicht in der
     allgemeinen Lebenslauf-Auswertung.

     `kleidung` und `umgebung` gehen später an die Bildgenerierung (gpt-image-2 stylt das
     Foto im Berufs-Look, bevor HeyGen es sprechen lässt) — sie müssen deshalb ENGLISCH und
     ohne Markennamen sein, so wie die bestehende Kette es erwartet. */
  if (schritt === "videoskript") {
    if (!sitzung.cvBefund?.zusammenfassung) {
      return NextResponse.json({ error: "Zuerst brauche ich deinen Lebenslauf." }, { status: 400 });
    }
    const auftrag = [
      REGELN,
      "AUFGABE: Schreibe den Sprechtext für die kurze Video-Bewerbung dieses Menschen — den Text, den er vor der Kamera abliest.",
      /* DER SPRECHTEXT MUSS DAS SCREENING BEWEISEN (Owner 28.08.2026: „Sie muss etwas sagen,
         was man aus der Analyse ableiten kann").
     
         DAS IST DIE GANZE DASEINSBERECHTIGUNG DES PRODUKTS. Ein Sprechtext, der nur den
         Lebenslauf nacherzählt, hätte ohne Gespräch entstehen können — dann waren die vier
         Cent Screening umsonst, und der Kunde merkt es. Die alte Fassung sagte „nimm auf,
         was er im Gespräch gesagt hat" und liess damit offen, OB. Jetzt ist es Pflicht:
         mindestens ein Satz, der so nirgends im Lebenslauf steht.
     
         DIE REIHENFOLGE IST AUCH EINE ENTSCHEIDUNG (Owner-Entwurf desselben Tages, der mit
         der Haltung beginnt statt mit der Station): erst warum, dann der Beleg. Ein Text,
         der mit einer Aufzählung von Stationen anfängt, klingt wie ein vorgelesener
         Lebenslauf — genau das soll das Video nicht sein.
     
         GEGEN DAS ERFINDEN: „nur was belegt ist" steht zweimal da, weil ein Modell an dieser
         Stelle gern ausschmückt — und eine erfundene Station in einer Bewerbung ist kein
         Stilfehler, sondern eine Lüge gegenüber einem Arbeitgeber. */
      "'sprechtext' — 70 bis 100 Wörter, ERSTE PERSON, natürlich gesprochen (keine Aufzählung, keine Stichpunkte). Aufbau: (1) Name und was er heute tut. (2) Was ihm an dieser Arbeit liegt — in SEINEN Worten aus dem Gespräch. (3) EINE konkrete Station oder ein Ergebnis als Beleg dafür. (4) Warum diese Stelle.",
      "PFLICHT: Mindestens EIN Satz des Sprechtextes muss aus dem GESPRÄCH stammen und darf so nicht im Lebenslauf stehen — eine Haltung, ein Beweggrund, eine Situation, die er erzählt hat. Genau dafür hat er das Screening gemacht. Steht im Gespräch nichts davon, nimm das, was am nächsten dran ist; erfinde nichts dazu.",
      "VERBOTEN: Eigenschaftswörter ohne Beleg ('teamfähig', 'lösungsorientiert', 'kommunikationsstark'). Jede Behauptung braucht die Handlung dahinter — nur was aus Lebenslauf oder Gespräch belegt ist.",
      /* NIE WÖRTLICH AUS DEM GESPRÄCH (Owner 28.08.2026, Dauerregel für alle
         Bewerbungsunterlagen). Ein Sprechtext ist eine Bewerbung, die man HÖRT — dort fällt
         Umgangssprache noch stärker auf als auf Papier. Die Kernaussage bleibt, der Wortlaut
         nicht. */
      "NIE WÖRTLICH ZITIEREN: Was er im Gespräch gesagt hat, ist Rohinformation. Zieh die Kernaussage heraus und formuliere sie beruflich neu — Alltagsbeispiele werden abstrahiert ('Homepages für Ärzte und Bäcker' → 'Arbeit mit nicht-technischen, zeitkritischen Anwendern'). Ohne neue Fakten.",
      /* AUCH DIE KLEIDUNG IST EINE WAHL (Owner 28.08.2026: „als kraftfahrer kann er nicht
         mit kravate sich bewerben aber wer weiss, vielleicht wollen einige") — wir schlagen
         das Berufsübliche zuerst vor, verbieten aber nichts. */
      "'kleidungen' — DREI Vorschläge für die Kleidung, je EIN kurzer englischer Satz, ohne Markennamen. Der ERSTE ist das, was in dieser Branche üblich ist (ein Kraftfahrer trägt kein Sakko mit Krawatte, eine Führungskraft kein Polohemd); die anderen zwei sind eine Stufe formeller und eine Stufe legerer. Alle drei müssen gepflegt und bewerbungstauglich sein.",
      "'kleidungLabel' — zu jedem Vorschlag ein deutsches Wort oder zwei zum Antippen (z. B. 'Hemd', 'Sakko', 'Poloshirt'), in derselben Reihenfolge.",
      sitzung.cvBefund?.kleidungImFoto
        ? `AUF SEINEM EIGENEN BEWERBUNGSFOTO trägt er: ${sitzung.cvBefund.kleidungImFoto}. Nimm das als ERSTEN Vorschlag — so hat er sich selbst entschieden zu zeigen. Die anderen zwei bleiben eine Stufe formeller und eine legerer.`
        : "",
      /* WARM UND NATÜRLICH, NICHT STERIL (Owner 28.08.2026: „eher etwas natürliches und
         warme umgebung, aber warm busines. Der kunde musste hier entscheiden oder wir je
         nach dem als was er sich bewirbt"). Deshalb DREI Vorschläge statt eines: Wir
         schlagen aus der Stelle vor, der Bewerber wählt. */
      "'umgebungen' — DREI Vorschläge für den Hintergrund, je EIN kurzer englischer Satz, passend zu dieser Rolle. Sie müssen WARM und NATÜRLICH wirken: echtes Tageslicht, Holz, Pflanzen, Textur — nie ein steriles Studio, keine leere weisse Wand, kein Grünbild. Trotzdem beruflich: Es ist eine Bewerbung, kein Wohnzimmerfoto. Der erste Vorschlag ist der, den du selbst wählen würdest.",
      "'umgebungLabel' — zu jedem Vorschlag ein deutsches Wort oder zwei zum Antippen (z. B. 'Helles Büro', 'Bibliothek', 'Werkstatt'), in derselben Reihenfolge.",
      'Antworte NUR als JSON: {"sprechtext":"...","kleidungen":["...","...","..."],"kleidungLabel":["...","...","..."],"umgebungen":["...","...","..."],"umgebungLabel":["...","...","..."]}',
      "",
      lage(sitzung),
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }], "low");
    if (!r.ok) return NextResponse.json({ error: `Das Skript ließ sich nicht schreiben. ${r.fehler}` }, { status: r.status });
    const sprechtext = str(r.daten.sprechtext, 1200);
    if (!sprechtext) return NextResponse.json({ error: "Das Skript kam leer zurück. Versuch es bitte noch einmal." }, { status: 502 });
    await sichern({ verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch) });
    const umgebungen = strListe(r.daten.umgebungen, 3, 300);
    const kleidungen = strListe(r.daten.kleidungen, 3, 300);
    return NextResponse.json({
      ok: true,
      sprechtext,
      /* Der erste Vorschlag ist jeweils die Vorauswahl — der Bewerber kann wechseln. */
      kleidung: kleidungen[0] ?? "",
      kleidungen,
      kleidungLabel: strListe(r.daten.kleidungLabel, 3, 40),
      /* Der erste Vorschlag ist die Vorauswahl — der Bewerber kann wechseln. */
      umgebung: umgebungen[0] ?? "",
      umgebungen,
      umgebungLabel: strListe(r.daten.umgebungLabel, 3, 40),
    });
  }

  return NextResponse.json({ error: "Unbekannter Schritt." }, { status: 400 });
}
