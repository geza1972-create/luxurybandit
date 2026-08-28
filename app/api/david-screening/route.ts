import { NextResponse } from "next/server";
import { berichtMailSchicken } from "@/lib/david-mail";
import { getSignedUrl } from "@/lib/try-this-look-store";
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
  if (!m) return {};
  try { return JSON.parse(m[0]) as Antwort; } catch { return {}; }
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
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modell, input: [{ role: "user", content: inhalt }], ...reasoning }),
  });
  const roh = await res.text();
  let nutz: any = null;
  try { nutz = roh ? JSON.parse(roh) : null; } catch { nutz = null; }
  if (!res.ok) {
    /* DIE EHRLICHE MELDUNG NACH VORN: Ein leeres Guthaben (429 „no credits remaining")
       sieht im Browser sonst aus wie ein Fehler unserer Seite. */
    const grund = str(nutz?.error?.message, 300) || `Status ${res.status}`;
    return { ok: false, fehler: grund, status: res.status };
  }
  const text =
    nutz?.output_text ??
    nutz?.output?.flatMap((i: any) => i?.content ?? [])?.map((c: any) => c?.text ?? "")?.join("\n") ??
    "";
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
      heraus: Number(u?.output_tokens ?? u?.completion_tokens ?? 0) || 0,
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

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Der Analyse-Dienst ist gerade nicht erreichbar." }, { status: 503 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = str(body.id, 80);
  const device = str(body.device, 80);
  const schritt = str(body.schritt, 20);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const sitzung = await leseDavid(id);
  if (!sitzung) return NextResponse.json({ error: "Diese Sitzung kenne ich nicht." }, { status: 404 });
  if (sitzung.device && device && sitzung.device !== device) {
    /* KEIN „Not yours." VOR DEM NUTZER (gesehen 28.08.2026 im Test): Die Zeile stammt aus
       den Admin-Routen des Hauses und stand hier in Rot mitten auf der Ergebnis-Seite —
       englisch, technisch und ohne Ausweg. Sie trifft, wer seinen Bericht auf einem
       ANDEREN Gerät öffnet; das ist kein Angriff, sondern der Alltag (Handy/Rechner). */
    return NextResponse.json({ error: "Diesen Bericht hast du auf einem anderen Gerät erstellt. Öffne ihn dort — oder starte hier ein neues Screening." }, { status: 403 });
  }
  /* OHNE LEAD KEIN SCREENING (Owner §5): Vorname, gültige Adresse und die Bestätigung sind
     die Bedingung, nicht eine Formalie, die man später nachreicht. */
  if (!sitzung.vorname || !sitzung.email || !sitzung.datenschutzBestaetigt) {
    return NextResponse.json({ error: "Bitte zuerst Name, E-Mail und die Bestätigung." }, { status: 400 });
  }

  const jetzt = new Date().toISOString();
  const sichern = async (aenderung: Partial<DavidSitzung>) => {
    await schreibeDavid({ ...sitzung, ...aenderung, aktualisiertAm: jetzt });
  };

  /* ───────────────────────────── SCHRITT 1: DER LEBENSLAUF ───────────────────────────── */
  if (schritt === "cv") {
    const cvPath = str(body.cvPath, 300) || sitzung.cvPath || "";
    if (!cvPath) return NextResponse.json({ error: "Es fehlt der Lebenslauf." }, { status: 400 });

    /* Der Deckel — hier, wo ein Screening wirklich beginnt. Ein zweiter Aufruf für DIESELBE
       Sitzung zählt nicht noch einmal (jemand lädt seinen Lebenslauf neu hoch). */
    if (!sitzung.cvBefund) {
      const heute = await davidHeuteGezaehlt(device);
      if (device && heute >= DAVID_PRO_TAG) {
        return NextResponse.json({
          error: `Für heute sind auf diesem Gerät ${DAVID_PRO_TAG} Screenings gelaufen. Morgen geht es weiter.`,
          deckel: true,
        }, { status: 429 });
      }
    }

    const eingabe = await cvAlsEingabe(cvPath);
    if ("fehler" in eingabe) return NextResponse.json({ error: eingabe.fehler }, { status: eingabe.status });

    const auftrag = [
      REGELN,
      "AUFGABE: Lies diesen Lebenslauf. Du hast die Stellenanzeige noch NICHT gesehen.",
      "Gib zurück:",
      "'beobachtungen' — 1 bis 2 Sätze, die BELEGEN, dass du das Dokument wirklich gelesen hast: konkrete Schwerpunkte, Art der Unternehmen, Umfang der Erfahrung. Sprich den Bewerber direkt an ('Du bringst …'). Keine Bewertung, kein Lob.",
      "'rolle' — die aktuelle oder zuletzt ausgeübte Rolle, wörtlich aus dem Lebenslauf.",
      "'schwerpunkte' — 2 bis 4 kurze Arbeitsfelder.",
      /* NUR DIE STUFE — siehe die Begründung am Feld `layout` in lib/david-store.ts. */
      "'layout' — wie der Lebenslauf als Dokument auf den ersten Blick wirkt: 'gut' (Struktur und Zeiträume sofort erfassbar), 'mittel' (lesbar, aber man muss suchen) oder 'schwach' (Textwüste, unruhig, schwer zu scannen). NUR dieses eine Wort, KEINE Begründung, KEINE Verbesserungsvorschläge.",
      "'foto' — true, wenn der Lebenslauf ein Bewerbungsfoto einer Person enthält, sonst false.",
      /* WAS ER AUF SEINEM EIGENEN BEWERBUNGSFOTO TRÄGT (Owner 28.08.2026: „man kann es auch
         aus seinem cv bild ableiten") — die beste Vorlage für das spätere Video: So hat er
         sich selbst entschieden zu zeigen. NUR die Kleidung, nichts über die Person. */
      "'kleidungImFoto' — falls ein Bewerbungsfoto da ist: EIN kurzer englischer Satz, der NUR die Kleidung darauf beschreibt (z. B. 'dark blazer over a light blouse'). Keine Aussage über die Person selbst. Ohne Foto lass das Feld weg.",
      "Beurteile Layout und Foto NUR, wenn du das Dokument wirklich siehst. Bekommst du bloss Text (aus einer Word-Datei), lass beide Felder weg.",
      "'zusammenfassung' — 150 bis 300 Wörter, nüchtern, NUR Fakten aus dem Dokument: Stationen mit Zeitraum, Verantwortung, Branchen, Ausbildung, Sprachen, Werkzeuge. Diese Zusammenfassung ist später deine einzige Quelle über diesen Menschen — was hier fehlt, hast du für den Rest des Gesprächs nicht.",
      'Antworte NUR als JSON: {"beobachtungen":["..."],"rolle":"...","schwerpunkte":["..."],"layout":"gut|mittel|schwach","foto":true,"zusammenfassung":"..."}',
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }, ...eingabe]);
    if (!r.ok) return NextResponse.json({ error: `Der Lebenslauf ließ sich nicht auswerten. ${r.fehler}` }, { status: r.status });

    const beobachtungen = strListe(r.daten.beobachtungen, 2, 400);
    const zusammenfassung = str(r.daten.zusammenfassung, 4000);
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
    await sichern({ cvPath, cvName: str(body.cvName, 200) || sitzung.cvName, cvBefund, verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch) });
    return NextResponse.json({
      ok: true, beobachtungen, rolle: cvBefund.rolle, schwerpunkte: cvBefund.schwerpunkte,
      layout: cvBefund.layout, foto: cvBefund.foto,
    });
  }

  /* ──────────────────── SCHRITT 2: DIE STELLE — UND DIE ERSTE FRAGE ──────────────────── */
  if (schritt === "job") {
    const jobText = str(body.jobText, 20000);
    if (jobText.length < 60) {
      return NextResponse.json({ error: "Das ist mir zu wenig Text. Füge die Anzeige bitte vollständig ein." }, { status: 400 });
    }
    if (!sitzung.cvBefund?.zusammenfassung) {
      return NextResponse.json({ error: "Zuerst brauche ich deinen Lebenslauf." }, { status: 400 });
    }

    const auftrag = [
      REGELN,
      "AUFGABE: Vergleiche den Lebenslauf mit dieser konkreten Stellenanzeige. Du zeigst dem Bewerber JETZT noch kein Ergebnis.",
      "Gib zurück:",
      "'jobTitel' — die Position, wörtlich aus der Anzeige (ohne Ort).",
      "'jobOrt' — Ort und Arbeitsmodell, wie die Anzeige es nennt (z. B. 'München, hybrid'), sonst leer. 'jobArt' — Anstellungsart (z. B. 'Vollzeit'), sonst leer.",
      "'aufgaben' — 3 bis 5 Hauptaufgaben der Stelle.",
      "'anforderungen' — 3 bis 6 wichtige Anforderungen.",
      "'offen' — 3 bis 6 Punkte, die ein Recruiter aus dem Lebenslauf allein NICHT beurteilen kann. Genau daraus entsteht gleich das Gespräch.",
      "'ersteFrage' — deine erste Frage an den Bewerber. Sie muss sich auf SEINEN Werdegang UND auf DIESE Stelle beziehen und darf nichts abfragen, was im Lebenslauf schon eindeutig steht. Eine Frage, kein Fragenbündel, höchstens drei Sätze.",
      "'bereich' — welcher der fünf Bereiche das ist: passung, belege, motivation, recruiterfragen, selbstbild.",
      'Antworte NUR als JSON: {"jobTitel":"...","jobOrt":"...","jobArt":"...","aufgaben":["..."],"anforderungen":["..."],"offen":["..."],"ersteFrage":"...","bereich":"..."}',
      "",
      lage({ ...sitzung, jobText }),
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
    if (!r.ok) return NextResponse.json({ error: `Die Anzeige ließ sich nicht auswerten. ${r.fehler}` }, { status: r.status });

    const jobBefund = {
      aufgaben: strListe(r.daten.aufgaben, 5, 200),
      anforderungen: strListe(r.daten.anforderungen, 6, 200),
      offen: strListe(r.daten.offen, 6, 250),
    };
    const ersteFrage = str(r.daten.ersteFrage, 600);
    if (!ersteFrage) return NextResponse.json({ error: "Ich konnte aus dieser Anzeige keine Frage ableiten. Füge sie bitte vollständiger ein." }, { status: 422 });

    const fragen: DavidFrage[] = [{ frage: ersteFrage, bereich: (str(r.daten.bereich, 20) as DavidFrage["bereich"]) || undefined, gestelltAm: jetzt }];
    await sichern({ jobText, jobTitel: str(r.daten.jobTitel, 200) || undefined, jobOrt: str(r.daten.jobOrt, 120) || undefined, jobArt: str(r.daten.jobArt, 60) || undefined, jobBefund, fragen, verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch) });
    return NextResponse.json({
      ok: true,
      jobTitel: str(r.daten.jobTitel, 200),
      jobOrt: str(r.daten.jobOrt, 120),
      jobArt: str(r.daten.jobArt, 60),
      ersteFrage, offen: jobBefund.offen,
    });
  }

  /* ─────────────────────── SCHRITT 3: EINE ANTWORT, EIN GEDANKE ─────────────────────── */
  if (schritt === "antwort") {
    const antwort = str(body.antwort, 4000);
    const fragen = [...(sitzung.fragen ?? [])];
    const offen = fragen[fragen.length - 1];
    /* War die offene Frage schon eine Nachfrage, ist die Sache jetzt erledigt — zweimal
       zum selben Punkt nachzuhaken ist ein Verhör, kein Screening. */
    const warSchonNachfrage = offen?.nachhaken === true;
    if (!offen) return NextResponse.json({ error: "Es steht gerade keine Frage offen." }, { status: 400 });
    if (antwort.length < 2) return NextResponse.json({ error: "Schreib mir bitte ein paar Worte." }, { status: 400 });

    offen.antwort = antwort;
    const beantwortet = fragen.filter(f => f.antwort).length;
    const hauptfragen = fragen.filter(f => !f.nachhaken).length;

    const auftrag = [
      REGELN,
      "AUFGABE: Der Bewerber hat gerade geantwortet. Entscheide, wie es weitergeht.",
      `Bisher beantwortet: ${beantwortet} Fragen, davon ${hauptfragen} Hauptfragen. Normal sind 4 bis 7 Hauptfragen — die Zahl ist kein Ziel, sondern eine Spanne.`,
      warSchonNachfrage
        ? "Die zuletzt gestellte Frage war BEREITS eine Nachfrage. Zu dieser Sache fragst du jetzt nicht noch einmal nach — setze 'nachhaken' auf false und geh zum nächsten offenen Bereich oder mach Schluss."
        : "",
      beantwortet >= 4
        ? "Du hast genug Runden gehabt: Prüfe JETZT, ob du zu den fünf Bereichen jeweils etwas Belastbares hast. Wenn ja, setze 'fertig' auf true. Vollständigkeit in jedem Detail ist nicht das Ziel — ein Screening ist ein erstes Gespräch, kein Verhör."
        : "",
      "Gib zurück:",
      "'reaktion' — höchstens 12 Wörter, und NIE eine Zusammenfassung dessen, was er gerade gesagt hat (er weiss es). Entweder was du daraus mitnimmst, oder leer. Kein Lob, keine Floskel.",
      "'nachhaken' — true, wenn die Antwort für ein Screening zu allgemein oder ausweichend war UND ein Nachfassen wirklich etwas bringt. Sonst false. Hake bei derselben Sache höchstens einmal nach und frage dann nur nach dem EINEN wichtigsten fehlenden Punkt.",
      "'naechsteFrage' — die nächste Frage (bei nachhaken=true: die Nachfrage zur selben Sache; sonst eine neue Frage zu einem noch offenen Bereich). Leer lassen, wenn du fertig bist.",
      "'bereich' — passung, belege, motivation, recruiterfragen oder selbstbild.",
      "Stelle NIE eine Frage, die in diesem Gespräch schon gestellt wurde. Ist die Antwort an deiner Frage vorbeigegangen, nimm das in EINEM Halbsatz auf und geh zum nächsten offenen Punkt — frage nicht dasselbe noch einmal.",
      "'fertig' — true, wenn du genug weisst über: fachliche Passung, Belege für relevante Erfahrung, Motivation, mögliche Recruiter-Fragen und das, was der Lebenslauf nicht erzählt. Stelle keine Frage mehr, nur um eine Zahl zu erreichen.",
      "'erkenntnisse' — was du aus dieser Antwort GELERNT hast, in fünf Listen (je 0 bis 2 kurze Punkte): passung, belege, motivation, recruiterfragen, selbstbild. Schreibe nur, was wirklich neu ist.",
      'Antworte NUR als JSON: {"reaktion":"...","nachhaken":false,"naechsteFrage":"...","bereich":"...","fertig":false,"erkenntnisse":{"passung":[],"belege":[],"motivation":[],"recruiterfragen":[],"selbstbild":[]}}',
      "",
      lage({ ...sitzung, fragen }),
    ].join("\n");

    const r = await frageModell(apiKey, KLEIN, [{ type: "input_text", text: auftrag }]);
    if (!r.ok) return NextResponse.json({ error: `Das Gespräch stockt gerade. ${r.fehler}` }, { status: r.status });

    const erkenntnisse = erkenntnisseZusammen(sitzung.erkenntnisse, r.daten);
    const naechste = str(r.daten.naechsteFrage, 600);
    const nachhaken = r.daten.nachhaken === true && !warSchonNachfrage;
    /* DER NOT-ANSCHLAG: Das Modell entscheidet, wann Schluss ist (§16) — aber es entscheidet
       nicht unbegrenzt. Ohne Obergrenze kann ein Gespräch endlos weiterlaufen, und jede
       Runde kostet. */
    const fertig = r.daten.fertig === true || !naechste
      || hauptfragen >= MAX_FRAGEN
      /* ALLE Runden, nicht nur die Hauptfragen — siehe MAX_RUNDEN oben. */
      || beantwortet >= MAX_RUNDEN;

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
      fragen.push({ frage: naechste, nachhaken, bereich: (str(r.daten.bereich, 20) as DavidFrage["bereich"]) || undefined, gestelltAm: jetzt });
    }
    await sichern({ fragen, erkenntnisse, screeningFertigAm: wirklichFertig ? jetzt : sitzung.screeningFertigAm, verbrauch: verbrauchDazu(sitzung.verbrauch, r.verbrauch) });

    /* Eine Wiederholung, die NICHT zum Schluss führt (unter vier Hauptfragen), darf den
       Bewerber nicht in eine Sackgasse setzen: Dann steht die zuletzt gestellte Frage
       weiter — er hat sie ja gerade erst beantwortet, David geht beim nächsten Mal weiter. */
    const naechsteRaus = wirklichFertig ? "" : (wiederholung ? "" : naechste);
    return NextResponse.json({
      ok: true,
      reaktion: str(r.daten.reaktion, 400),
      naechsteFrage: naechsteRaus,
      nachhaken: wirklichFertig ? false : nachhaken,
      fertig: wirklichFertig,
      nummer: fragen.filter(f => !f.nachhaken).length,
    });
  }

  /* ────────────────────────── SCHRITT 4: DER BERICHT (GRATIS) ────────────────────────── */
  if (schritt === "report") {
    if (sitzung.report) return NextResponse.json({ ok: true, report: sitzung.report });
    if (!sitzung.cvBefund?.zusammenfassung || !sitzung.jobText) {
      return NextResponse.json({ error: "Für den Bericht fehlt mir noch etwas." }, { status: 400 });
    }

    const auftrag = [
      REGELN,
      "AUFGABE: Schreibe jetzt das Ergebnis des Pre-Screenings. Es ist kostenlos und vollständig — halte nichts zurück.",
      "Du sprichst den Bewerber durchgehend mit DU an — auch in den Belegen. Nie in der dritten Person über ihn reden.",
      "Der Bericht hat vier Abschnitte und eine persönliche Einordnung:",
      "'spricht' — 2 bis 4 Punkte, die für den Bewerber sprechen. 'titel' ist eine Überschrift aus 2 bis 4 Wörtern (z. B. 'End-to-End-Verantwortung'), keine Floskel. 'tags' sind 2 bis 3 Stichwörter à höchstens 3 Wörter, die den Punkt belegen (z. B. 'Messbarer Outcome'). 'punkt' ist EIN Satz (höchstens 25 Wörter). 'beleg' ist ein VOLLSTÄNDIGER Satz in der Du-Anrede — entweder aus dem Lebenslauf ('Dein Lebenslauf nennt …') oder aus dem Gespräch ('Du hast erzählt, dass …') — und sagt, warum das für DIESE Stelle zählt. Nie ein Satzfragment, nie Floskeln wie 'aus einer seiner Antworten'.",
      "'offeneFragen' — Punkte, die ein Recruiter genauer verstehen möchte: fehlende Branchenerfahrung, unklarer Führungsumfang, ungewöhnlicher Wechsel, dünne Belege. Je Punkt: 'titel' (2 bis 4 Wörter, z. B. 'Team, Arbeitgeber & Kontext'), 'punkt' (die Frage selbst, höchstens 18 Wörter) und 'warum' (höchstens 20 Wörter). Formuliere sie als Fragen, die entstehen — NIE als Ablehnungsgrund und nie als Urteil über den Menschen.",
      "'fehltImCv' — der wichtigste Abschnitt: was im Gespräch sichtbar wurde und im Lebenslauf bisher nicht steht. Je Punkt: 'punkt' (höchstens 20 Wörter) und 'warum' (höchstens 20 Wörter). Nur, was er wirklich gesagt hat.",
      "'vorbereiten' — 3 bis 5 Fragen, die in einem ersten Recruiter-Gespräch zu GENAU diesem Lebenslauf und GENAU dieser Anzeige entstehen. Keine Standardfragen aus dem Internet.",
      "'einordnung' — zum Schluss sprichst du persönlich. Sage EINE grössere Beobachtung über seinen beruflichen Weg, die du aus Lebenslauf und Gespräch ableitest: etwas, das er über sich selbst vielleicht nicht so sieht. KEINE Aufzählung seiner Stärken (die stehen schon oben), kein Zuspruch ('du schaffst das'), keine erfundenen Fähigkeiten, kein Versprechen. 3 bis 6 Sätze, zweite Person.",
      "'kernsatz' — EIN Satz aus höchstens 18 Wörtern, der die Einordnung auf den Punkt bringt und für sich allein stehen kann. Er steht später gross auf dem Ergebnis.",
      'Antworte NUR als JSON: {"spricht":[{"titel":"...","punkt":"...","beleg":"...","tags":["..."]}],"offeneFragen":[{"titel":"...","punkt":"...","warum":"..."}],"fehltImCv":[{"punkt":"...","warum":"..."}],"vorbereiten":["..."],"einordnung":"...","kernsatz":"..."}',
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
