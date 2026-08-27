import { NextResponse } from "next/server";
import { getSignedUrl, readKissLog } from "@/lib/try-this-look-store";
import { docxZuText } from "@/lib/docx-text";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";
import { branchenPruefen, branchenName } from "@/lib/branchen";
import { leseKandidat, schreibeKandidat, type KandidatProfil } from "@/lib/kandidaten-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * IST DAS EINE TOP-BEWERBUNG? (Owner-Auftrag 26.08.2026, der Schnitt: „wir brauchen echte
 * Anzeigen gar nicht. Wir brauchen Branchen, wo er interessiert ist zu arbeiten. Wir
 * brauchen Bewerbungen. Und wir müssen seine Bewerbung analysieren und sagen, ob es eine
 * Topbewerbung ist oder nicht. Mit Analyse.")
 *
 * WARUM DAS EHRLICHER IST als der Weg davor: Die Jobchancen-Liste versprach implizit
 * offene Stellen, für die niemand mit einer Firma gesprochen hatte. Diese Route verspricht
 * nur ein Urteil über die Bewerbung — und das können wir wirklich einlösen.
 *
 * NICHT GEGEN EINE ANZEIGE, SONDERN GEGEN DIE BRANCHE: `/api/resume-generator` misst
 * Lebenslauf gegen einen Anzeigentext (dieselbe KI-Mechanik, dieselben Einstufungen). Hier
 * gibt es keinen Anzeigentext — gemessen wird die Bewerbung an sich, im Licht der Branchen,
 * die der Bewerber angekreuzt hat.
 *
 * HOCHLADEN IST PFLICHT, TEXT ZÄHLT (Owner, selber Tag: „er kann auch Text statt PDF oder
 * DOCX hochladen. Aber muss was hochladen.") — wer nichts liefert, bekommt kein Urteil:
 * Ohne Bewerbung gibt es nichts zu bewerten.
 *
 * POST { id, device, branchen[], cvPath? , text? } → { note, prozent, punkte[] }
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Die sechs Prüfsteine — hier definiert, nicht im Prompt verstreut, damit Server und
    Anzeige dieselbe Liste kennen. */
const KRITERIEN = [
  { schluessel: "vollstaendigkeit", titel: "Vollständigkeit" },
  { schluessel: "ergebnisse", titel: "Ergebnisse statt Aufgabenlisten" },
  { schluessel: "sprachen", titel: "Sprachnachweis" },
  { schluessel: "branchenpassung", titel: "Passung zur Branche" },
  { schluessel: "anschreiben", titel: "Anschreiben" },
  { schluessel: "form", titel: "Form und Lesbarkeit" },
] as const;

type Note = "top" | "solide" | "schwach";
const NOTEN: readonly Note[] = ["top", "solide", "schwach"];
type Einstufung = "stark" | "okay" | "schwach";
const EINSTUFUNGEN: readonly Einstufung[] = ["stark", "okay", "schwach"];
/** Dieselben drei Stufen wie im Rest des Hauses (`matchEmpfehlung`, `/api/job-vorschlaege`) —
    nie eine vierte Skala für dasselbe Urteil erfinden. */
type ChanceStufe = "gut" | "bruecke" | "schwach";
const CHANCE_STUFEN: readonly ChanceStufe[] = ["gut", "bruecke", "schwach"];

async function ki(content: Array<Record<string, unknown>>): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const text = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>; } catch { return null; }
}

/** Dieselben drei Quellen wie im Generator, plus eingefügter Text. */
async function bewerbungContent(cvPath: string, text: string): Promise<Record<string, unknown> | { fehler: string }> {
  if (text) return { type: "input_text", text: `Bewerbung (vom Bewerber eingefügt):\n${text.slice(0, 24000)}` };
  const url = await getSignedUrl(cvPath).catch(() => "");
  if (!url) return { fehler: "Die Datei wurde nicht gefunden — bitte noch einmal hochladen." };
  const bytes = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  if (cvPath.toLowerCase().endsWith(".docx")) {
    const docText = docxZuText(bytes);
    if (!docText) return { fehler: "Diese Word-Datei liess sich nicht lesen — bitte als PDF speichern oder den Text einfügen." };
    return { type: "input_text", text: `Bewerbung (aus Word-Datei):\n${docText.slice(0, 24000)}` };
  }
  return { type: "input_file", filename: "bewerbung.pdf", file_data: `data:application/pdf;base64,${bytes.toString("base64")}` };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = s(body.id, 60);
  const device = s(body.device, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  /* Besitz wie im Generator: der kiss-log-Auftrag ist das Gedächtnis. */
  const eintraege = await readKissLog().catch(() => []);
  const auftrag = eintraege.find(e => e.id === id);
  if (!auftrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  if (auftrag.device && device && auftrag.device !== device) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  const branchen = branchenPruefen(body.branchen);
  const cvPath = s(body.cvPath, 300);
  const text = s(body.text, 24000);
  /**
   * NAME, E-MAIL UND BEWERBUNG STEHEN AM ANFANG (Owner 26.08.2026, nach dem Fall Denisa:
   * „und Daten wie Name, E-Mail ganz am Anfang muss er angeben und CV ebenso").
   *
   * DAS KEHRT DIE FRÜHERE REGEL UM (dieselbe Tür, früher am Tag: „CV ohne Mail-Tor,
   * Adresse nach der Analyse"). Der Grund steht im Log: Eine echte Bewerberin über eine
   * Facebook-Anzeige gab ihre E-Mail, erteilte die Einwilligung und lieferte nie etwas —
   * ein abgeschlossener Trichter ohne einen einzigen verwertbaren Datensatz. Wer nichts
   * hinterlässt, soll gar nicht erst „fertig" werden können.
   */
  const name = s(body.name, 80);
  const email = s(body.email, 200).toLowerCase();
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (!name || !mailOk) {
    return NextResponse.json({ error: "Name und E-Mail sind Pflicht." }, { status: 400 });
  }
  /* OHNE BEWERBUNG KEIN URTEIL (Owner: „muss was hochladen") — Datei ODER Text. */
  if (!cvPath && !text) {
    return NextResponse.json({ error: "Lade deine Bewerbung hoch oder füge sie als Text ein." }, { status: 400 });
  }
  if (branchen.length === 0) {
    return NextResponse.json({ error: "Wähle mindestens eine Branche." }, { status: 400 });
  }

  const inhalt = await bewerbungContent(cvPath, text);
  if ("fehler" in inhalt) return NextResponse.json({ error: inhalt.fehler }, { status: 422 });

  const branchenText = branchen.map(branchenName).join(", ");
  const prompt = [
    "Du bist ein erfahrener Personaler und beurteilst EINE Bewerbung. Du bist ehrlich, nicht gefällig: Eine mittelmässige Bewerbung bekommt keine gute Note, nur weil der Mensch sympathisch wirkt. Du beurteilst das DOKUMENT, nie den Menschen — keine Aussagen über Alter, Herkunft, Geschlecht oder Aussehen.",
    `Der Bewerber will in diesen Branchen arbeiten: ${branchenText}.`,
    "Beurteile GENAU diese sechs Punkte, je mit 'einstufung' (\"stark\"|\"okay\"|\"schwach\"), 'begruendung' (EIN Satz, konkret am Dokument belegt) und 'naechsterSchritt' (EIN Satz, was er konkret ändern soll — bei \"stark\" darf er leer sein):",
    "1. vollstaendigkeit — Kontaktdaten da? Zeiträume lückenlos oder Lücken erklärt?",
    "2. ergebnisse — stehen messbare Ergebnisse drin oder nur Aufgabenlisten?",
    "3. sprachen — sind Sprachniveaus benannt und belegt?",
    "4. branchenpassung — trägt der Werdegang in die genannten Branchen? Sag ehrlich, wenn nicht.",
    "5. anschreiben — gibt es eines, und ist es individuell statt Textbaustein? Fehlt es ganz, ist die Einstufung \"schwach\".",
    "6. form — Länge, Struktur, Lesbarkeit, Rechtschreibung.",
    "'note': \"top\" NUR wenn kein Punkt \"schwach\" ist und mindestens vier \"stark\" sind · \"solide\" wenn brauchbar mit Lücken · \"schwach\" wenn sie so nicht verschickt werden sollte.",
    "'prozent': 0–100, ehrlich. 'fazit': zwei Sätze im Klartext, was diese Bewerbung ist und was ihr fehlt.",
    /* DAS EIGENTLICHE URTEIL (Owner 26.08.2026: „nach dem er alles eingegeben hat, dann
       bekommt er eine klare Analyse von uns. Ob er sich für den Job, den er will, Chancen
       hat.") — die sechs Punkte bewerten das DOKUMENT, das hier bewertet SEINE LAGE. */
    "Sag ihm ausserdem KLAR, ob er in den Branchen, die er will, realistisch Chancen hat — je gewählter Branche ein Eintrag in 'chancen':",
    "{\"branche\":\"exakt die Branche wie oben genannt\",\"einstufung\":\"gut\"|\"bruecke\"|\"schwach\",\"prozent\":0,\"begruendung\":\"EIN Satz, warum — an seinem Werdegang belegt\",\"wasFehlt\":\"EIN Satz: das eine Stück, das ihm noch fehlt (bei \\\"gut\\\" darf es leer sein)\"}",
    "\"gut\" = er kann sich sofort bewerben und wird ernst genommen · \"bruecke\" = erreichbar, aber ein benanntes Stück fehlt (Sprache, Nachweis, Erfahrung) · \"schwach\" = in dieser Branche hat er mit diesem Werdegang kaum Chancen. Sag das ehrlich, auch wenn es unangenehm ist — eine geschönte Zahl kostet ihn Monate.",
    /* DIE KERNDATEN, UND ZWAR ALLE (Owner 26.08.2026) — derselbe Lauf liest die Bewerbung
       ohnehin; ein zweiter KI-Aufruf nur zum Auslesen wäre verschenktes Geld und Zeit. */
    "Lies ausserdem ALLE Kerndaten aus der Bewerbung aus, in 'kerndaten'. Übernimm NUR, was wirklich dort steht — erfinde nichts, rate nichts. Was fehlt, bleibt leer (\"\" oder []). Genau diese Felder:",
    "{\"name\":\"\",\"email\":\"\",\"telefon\":\"\",\"stadt\":\"\",\"land\":\"\",\"geburtsdatum\":\"TT.MM.JJJJ wenn genannt\",\"geburtsjahr\":\"\",\"alter\":\"nur wenn im Dokument genannt ODER sicher aus dem Geburtsdatum berechenbar\",\"geburtsort\":\"\",\"nationalitaet\":\"\",\"positionierung\":\"kurze Rollenbezeichnung, z. B. Elektriker mit 10 Jahren Baustellenerfahrung\",\"profiltext\":\"2–3 Sätze über ihn, aus dem Dokument\",\"erfahrung\":[{\"rolle\":\"\",\"firma\":\"\",\"ort\":\"\",\"zeitraum\":\"\",\"ergebnis\":\"\"}],\"ausbildung\":[{\"titel\":\"\",\"ort\":\"\",\"zeitraum\":\"\"}],\"sprachen\":[{\"sprache\":\"\",\"niveau\":\"\"}],\"kompetenzen\":[],\"schwerpunkte\":[],\"zertifikate\":[],\"fuehrerschein\":[],\"verfuegbarkeit\":\"\",\"gehaltswunsch\":\"\",\"umzugsbereit\":\"ja\"|\"nein\"|\"\"}",
    "'erfahrung' vollständig und neueste zuerst — KEINE Station weglassen, auch kurze nicht.",
    "DUZE den Bewerber durchgehend (du/dein, nie Sie/Ihre).",
    "Antworte NUR als JSON: {\"note\":\"top\"|\"solide\"|\"schwach\",\"prozent\":0,\"fazit\":\"...\",\"chancen\":[{...}],\"punkte\":[{\"schluessel\":\"vollstaendigkeit\",\"einstufung\":\"stark\",\"begruendung\":\"...\",\"naechsterSchritt\":\"...\"}],\"kerndaten\":{...}}",
  ].join("\n\n");

  const parsed = await ki([{ type: "input_text", text: prompt }, inhalt]);
  if (!parsed) return NextResponse.json({ error: "Die Prüfung hat nicht geklappt — bitte noch einmal." }, { status: 502 });

  const rohPunkte = (Array.isArray(parsed.punkte) ? parsed.punkte : []) as Record<string, unknown>[];
  /* NACH UNSERER LISTE, NICHT NACH IHRER: Die KI darf Punkte weglassen oder erfinden —
     die Anzeige braucht aber immer dieselben sechs Zeilen in derselben Reihenfolge. */
  const punkte = KRITERIEN.map(k => {
    const treffer = rohPunkte.find(p => s(p.schluessel, 40) === k.schluessel);
    const einstufungRoh = s(treffer?.einstufung, 20) as Einstufung;
    return {
      schluessel: k.schluessel,
      titel: k.titel,
      einstufung: EINSTUFUNGEN.includes(einstufungRoh) ? einstufungRoh : "okay",
      begruendung: s(treffer?.begruendung, 300),
      naechsterSchritt: s(treffer?.naechsterSchritt, 300),
    };
  });

  /* DIE CHANCEN — nach UNSERER Branchenliste aufgebaut, nicht nach der Antwort der KI:
     Sie darf keine Branche weglassen, die er angekreuzt hat, und keine dazuerfinden. */
  const rohChancen = (Array.isArray(parsed.chancen) ? parsed.chancen : []) as Record<string, unknown>[];
  const chancen = branchen.map(b => {
    const name = branchenName(b);
    const treffer = rohChancen.find(c => s(c.branche, 80).toLowerCase() === name.toLowerCase());
    const stufeRoh = s(treffer?.einstufung, 20) as ChanceStufe;
    return {
      branche: b,
      brancheName: name,
      einstufung: CHANCE_STUFEN.includes(stufeRoh) ? stufeRoh : "bruecke",
      prozent: Math.max(0, Math.min(100, Math.round(Number(treffer?.prozent)) || 0)),
      begruendung: s(treffer?.begruendung, 300),
      wasFehlt: s(treffer?.wasFehlt, 300),
    };
  });

  const noteRoh = s(parsed.note, 20) as Note;
  const note: Note = NOTEN.includes(noteRoh) ? noteRoh : "solide";
  /* DIE NOTE MUSS ZU DEN PUNKTEN PASSEN: Ein „top" mit einem schwachen Punkt wäre genau
     die Gefälligkeit, die der Prompt verbietet — der Server korrigiert sie hier hart. */
  const hatSchwach = punkte.some(p => p.einstufung === "schwach");
  const endnote: Note = note === "top" && hatSchwach ? "solide" : note;
  const prozent = Math.max(0, Math.min(100, Math.round(Number(parsed.prozent)) || 0));

  /**
   * DIE KERNDATEN PRÜFEN UND ABLEGEN (Owner 26.08.2026: „ich brauche die Kerndaten aus
   * einer Bewerbung, und zwar alle") — sie gehen an ZWEI Orte, weil sie zwei Zwecke haben:
   * ins Lebenslauf-Profil, damit die Karte des Bewerbers nicht mehr leer ist, und an den
   * Kandidaten, damit der Owner im Admin Telefon, Ort und Werdegang vor sich hat, wenn er
   * die Firma anruft.
   */
  const kd = (parsed.kerndaten ?? {}) as Record<string, unknown>;
  const liste = (v: unknown, max: number, len = 120) =>
    (Array.isArray(v) ? v : []).map(x => s(x, len)).filter(Boolean).slice(0, max);
  const objListe = <K extends string>(v: unknown, felder: readonly K[], max: number) =>
    (Array.isArray(v) ? v : []).slice(0, max).map(roh => {
      const r = (roh ?? {}) as Record<string, unknown>;
      const raus = {} as Record<K, string>;
      felder.forEach(f => { raus[f] = s(r[f], 200); });
      return raus;
    }).filter(o => Object.values(o).some(Boolean));

  const kerndaten = {
    name: s(kd.name, 120),
    email: s(kd.email, 200).toLowerCase(),
    telefon: s(kd.telefon, 40),
    stadt: s(kd.stadt, 80),
    land: s(kd.land, 80),
    /* PERSONENDATEN NUR AUS DEM DOKUMENT (Owner 26.08.2026: „Wie alt, Nationalität,
       Sprachen, Niveau, Geburtsort, Datum") — wir FRAGEN sie nirgends ab und verlangen sie
       nicht; steht es in seiner Bewerbung, lesen wir es aus, sonst bleibt das Feld leer. */
    geburtsdatum: s(kd.geburtsdatum, 20),
    geburtsjahr: s(kd.geburtsjahr, 8),
    alter: s(kd.alter, 8),
    geburtsort: s(kd.geburtsort, 80),
    nationalitaet: s(kd.nationalitaet, 60),
    positionierung: s(kd.positionierung, 200),
    profiltext: s(kd.profiltext, 800),
    erfahrung: objListe(kd.erfahrung, ["rolle", "firma", "ort", "zeitraum", "ergebnis"] as const, 20),
    ausbildung: objListe(kd.ausbildung, ["titel", "ort", "zeitraum"] as const, 10),
    sprachen: objListe(kd.sprachen, ["sprache", "niveau"] as const, 10),
    kompetenzen: liste(kd.kompetenzen, 15),
    schwerpunkte: liste(kd.schwerpunkte, 6),
    zertifikate: liste(kd.zertifikate, 10),
    fuehrerschein: liste(kd.fuehrerschein, 6, 40),
    verfuegbarkeit: s(kd.verfuegbarkeit, 60),
    gehaltswunsch: s(kd.gehaltswunsch, 80),
    umzugsbereit: s(kd.umzugsbereit, 10),
  };

  /* Die Karte füllen — NUR was leer ist: Ein späterer, reicherer Lauf (oder eine Korrektur
     von Hand) darf durch eine erneute Prüfung nie überschrieben werden. */
  try {
    const profil = await leseLebenslauf(id);
    if (profil) {
      await schreibeLebenslauf({
        ...profil,
        name: name || profil.name || kerndaten.name || undefined,
        email: email || profil.email || kerndaten.email || undefined,
        ort: profil.ort || kerndaten.stadt || undefined,
        telefon: profil.telefon || kerndaten.telefon || undefined,
        erfahrung: profil.erfahrung?.length ? profil.erfahrung
          : kerndaten.erfahrung.map(e => ({ rolle: e.rolle, firma: e.firma || undefined, zeitraum: e.zeitraum, ergebnis: e.ergebnis || undefined })),
        ausbildung: profil.ausbildung?.length ? profil.ausbildung
          : kerndaten.ausbildung.map(a => ({ titel: a.titel, ort: a.ort || undefined, zeitraum: a.zeitraum || undefined })),
        sprachen: profil.sprachen?.length ? profil.sprachen
          : kerndaten.sprachen.map(sp => ({ sprache: sp.sprache, niveau: sp.niveau || undefined })),
        kompetenzen: profil.kompetenzen?.length ? profil.kompetenzen : kerndaten.kompetenzen,
        schwerpunkte: profil.schwerpunkte?.length ? profil.schwerpunkte : kerndaten.schwerpunkte,
      });
    }
  } catch (err) {
    console.error("[bewerbung-pruefen] Karte nicht ergaenzt:", err);
  }

  /* Am Kandidaten merken — der Owner sieht im Admin, wer eine brauchbare Bewerbung hat. */
  try {
    const bestand = await leseKandidat(id);
    const naechster: KandidatProfil = {
      ...(bestand ?? { kandidatId: id, hauptprofilId: id, einwilligung: { status: "offen" }, erstelltAm: new Date().toISOString() }),
      kandidatId: id,
      hauptprofilId: bestand?.hauptprofilId ?? id,
      branchen,
      bewerbungNote: endnote,
      bewerbungProzent: prozent,
      kerndaten,
      /* Die Felder, nach denen der Owner im Admin filtert, zusätzlich flach — sonst müsste
         jede Anzeige in `kerndaten` hineingreifen und der Bestand ginge verloren. */
      name: name || bestand?.name || kerndaten.name || undefined,
      email: email || bestand?.email || kerndaten.email || undefined,
      telefon: bestand?.telefon || kerndaten.telefon || undefined,
      stadt: bestand?.stadt || kerndaten.stadt || undefined,
      land: bestand?.land || kerndaten.land || undefined,
      sprachen: bestand?.sprachen?.length ? bestand.sprachen
        : kerndaten.sprachen.map(sp => ({ sprache: sp.sprache, niveau: sp.niveau || undefined })),
      fuehrerschein: bestand?.fuehrerschein?.length ? bestand.fuehrerschein : kerndaten.fuehrerschein,
      aktualisiertAm: new Date().toISOString(),
    };
    await schreibeKandidat(naechster);
  } catch (err) {
    console.error("[bewerbung-pruefen] Kandidat nicht gespeichert:", err);
  }

  return NextResponse.json({ note: endnote, prozent, fazit: s(parsed.fazit, 600), chancen, punkte, kerndaten });
}
