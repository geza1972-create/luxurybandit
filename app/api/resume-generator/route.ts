import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf, type LebenslaufProfil } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { anzeigenTextBeschaffen } from "@/lib/lebenslauf-anzeige";
import { leseDavid } from "@/lib/david-store";
import { getSignedUrl, readKissLog, writeKissLog } from "@/lib/try-this-look-store";
import { adminPinMatches } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { fotoAblegen } from "@/lib/lebenslauf-foto";
import { docxZuText } from "@/lib/docx-text";

export const runtime = "nodejs";
/**
 * 300 STATT 60 SEKUNDEN — GEMESSEN AN EINEM ECHTEN ABBRUCH (Owner 05.09.2026, mit Bild:
 * „Keine Verbindung — bitte noch einmal", nach dem Einfügen eines join.com-Links).
 *
 * IM VERCEL-PROTOKOLL STAND ES WÖRTLICH:
 *   „Vercel Runtime Timeout Error: Task timed out after 60 seconds"
 *   POST /api/resume-generator → 504
 *
 * Der Schritt „erzeugen" macht drei Dinge nacheinander, und keines davon ist schnell: die
 * fremde Stellenanzeige holen (bis 8 s, `anzeigenTextBeschaffen`), den Lebenslauf aus dem
 * Speicher laden, und dann EINEN Modell-Lauf über das ganze PDF, aus dem die komplette
 * Bewerbung entsteht. Bei einem längeren Lebenslauf reicht eine Minute dafür nicht — der
 * Kunde sah einen „Netzfehler", obwohl seine Bewerbung gerade geschrieben wurde.
 *
 * 300 s ist im Haus die Zahl für erzeugende Routen (`/api/armee-video`, `/api/aufraeumen`);
 * der Vercel-Plan trägt sie also nachweislich.
 */
export const maxDuration = 300;

/**
 * DER RESUME GENERATOR (Owner 26.08.2026, eigenes Tool „LB - Resume Generator":
 * „Man gibt die Anzeige ein, die Bewerbung die schon existiert, das bild und wird
 * angepasst zum runterladen. Mit wasserzeichen. Will er ohne, muss er zahlen 9,99 Euro.
 * Das wars." — und zur Staffel: „die Analyse zeigen wir ihm auch mit drunter. Aber wir
 * optimieren nicht alles. Wir machen ein titelblatt mit anschreiben und passen das
 * layout an. Für eine volle optimierung muss er 9,99 zahlen. Fertig.").
 *
 * BEWUSST EIGENE ROUTE statt /api/lebenslauf-bewerbung: Die Multi-Bewerbung stempelt
 * ihre Kopien `bezahlt: true` (Probe/Abo-Logik der Video Applications) — hier wäre das
 * PDF damit sofort wasserzeichenfrei. Der Generator hat seine eigene Gratis-Linie.
 *
 * POST { schritt: "erzeugen", id, device, email, anzeige, cvPath, cvName?, name?, foto? }
 *   → EIN KI-Lauf: CV auswerten (PDF als input_file, .docx als Text) + Anschreiben +
 *     ehrliche Match-Analyse. Das Profil (id = kiss-log-Kennung) speichert ALLES,
 *     bezahlt: false. Der CV-TEIL BLEIBT UNOPTIMIERT — der Profiltext beschreibt den
 *     Menschen, nicht die Anzeige. Antwort: { id, analyse, anzeigeTitel }.
 *     Das PDF holt der Client über /api/bewerbung-pdf (Wasserzeichen, solange unbezahlt).
 *
 * POST { schritt: "optimieren", id, device }
 *   → NUR nach Zahlung (kiss-log `paid`): der volle Zuschnitt auf die gespeicherte
 *     Anzeige (Strategie, Profiltext, Schwerpunkte, Betonung, frisches Anschreiben) +
 *     `bezahlt: true` am Profil → das nächste PDF kommt optimiert und ohne Wasserzeichen.
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const liste = (v: unknown, max: number, len = 120) =>
  (Array.isArray(v) ? v : []).map(x => s(x, len)).filter(Boolean).slice(0, max);

async function ki(content: Array<Record<string, unknown>>): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const modell = process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini";
  /**
   * GÜLTIGES JSON IST PFLICHT, NICHT BITTE — übernommen aus `/api/david-screening`, wo genau
   * dieser Fehler am 29.08.2026 einen halben Bericht gekostet hat: Die Antwort war da, aber
   * als abgeschnittenes JSON. Hier wurde bisher von Hand die erste `{` und die letzte `}`
   * gesucht und dazwischen geparst — dieselbe Bastelei, dieselbe Falle. `json_object` macht
   * aus der Bitte im Auftragstext eine Zusage der API.
   */
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    /**
     * EIN DECKEL AUF DIE WARTEZEIT (Owner 05.09.2026: „der Rechnet wie blöd" · „es hängt").
     *
     * Der Aufruf hatte gar keine Frist. Auf Vercel schnitt ihn nach 60 s die Laufzeitgrenze
     * ab — der Kunde bekam „Keine Verbindung". LOKAL, ohne diese Grenze, hätte er beliebig
     * lange gehangen. Ein Aufruf ohne Frist ist kein „langsam", sondern ein möglicher
     * Dauerhänger. 240 s lassen der Erzeugung Luft und bleiben unter `maxDuration`, damit
     * der Fehler von UNS kommt und nicht von der Plattform.
     */
    signal: AbortSignal.timeout(240_000),
    body: JSON.stringify({
      model: modell,
      input: [{ role: "user", content }],
      text: { format: { type: "json_object" } },
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const text = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>; } catch { return null; }
}

/** Der CV als KI-Eingabe: PDF direkt als Datei, .docx als extrahierter Text. */
/**
 * WELCHE FELDER DER MINICHAT NOCH ABFRAGEN MUSS.
 *
 * Nur diese vier — mehr braucht ein Lebenslauf-Kopf nicht, und jede weitere Frage ist eine
 * Abbruchgelegenheit. Der Ort ist bewusst dabei: Ohne ihn wirkt der Kopf des Dokuments
 * unfertig, und er steht in fast jedem Lebenslauf ohnehin.
 */
function fehlendeFelder(p: LebenslaufProfil): string[] {
  return (["name", "email", "telefon", "ort"] as const).filter(f => !s((p as Record<string, unknown>)[f], 200));
}

/** Was der Trichter zum Anzeigen braucht — nicht das ganze Profil über die Leitung. */
function kurzfassung(p: LebenslaufProfil) {
  return {
    name: p.name ?? "", email: p.email ?? "", telefon: p.telefon ?? "", ort: p.ort ?? "",
    positionierung: p.positionierung ?? "",
    stationen: p.erfahrung?.length ?? 0,
    ausbildung: p.ausbildung?.length ?? 0,
    sprachen: p.sprachen?.length ?? 0,
    ohneFoto: p.ohneFoto === true,
  };
}

async function cvContent(cvPath: string): Promise<Record<string, unknown> | { fehler: string }> {
  const url = await getSignedUrl(cvPath).catch(() => "");
  if (!url) return { fehler: "Lebenslauf-Datei nicht gefunden." };
  const bytes = Buffer.from(await fetch(url).then(r => r.arrayBuffer()));
  if (cvPath.toLowerCase().endsWith(".docx")) {
    const text = docxZuText(bytes);
    if (!text) return { fehler: "Diese Word-Datei ließ sich nicht lesen — bitte als PDF speichern und erneut hochladen." };
    return { type: "input_text", text: `Lebenslauf (aus Word-Datei):\n${text.slice(0, 24000)}` };
  }
  return { type: "input_file", filename: "lebenslauf.pdf", file_data: `data:application/pdf;base64,${bytes.toString("base64")}` };
}

type Einstufung = "erfuellt" | "uebertragbar" | "erklaerbar" | "blocker";
const EINSTUFUNGEN: readonly Einstufung[] = ["erfuellt", "uebertragbar", "erklaerbar", "blocker"];
type Empfehlung = "gut" | "bruecke" | "schwach";
const EMPFEHLUNGEN: readonly Empfehlung[] = ["gut", "bruecke", "schwach"];

/**
 * WAS AUS DEM DAVID-SCREENING IN DIE BEWERBUNG EINFLIESST (Owner-Vorgabe 28.08.2026, §21/§22:
 * „Aber es muss angepasst werden, damit automatisch übernommen werden: vorhandener CV,
 * Stellenanzeige, Screening-Erkenntnisse, relevante Antworten").
 *
 * Der Generator kennt bisher nur Lebenslauf und Anzeige. Was der Bewerber David IM GESPRÄCH
 * gesagt hat — Motivation, Belege, der Grund für einen Wechsel — steht in keinem der beiden
 * Dokumente; genau das ist der Mehrwert des Screenings. Es kommt als zusätzlicher
 * Prompt-Absatz herein, klar als AUSSAGEN DES BEWERBERS gekennzeichnet, damit das Modell sie
 * nicht mit dem Lebenslauf verwechselt und nichts daraus ableitet, was er nicht gesagt hat.
 *
 * OHNE `davidId` ändert sich am Generator nichts — das eigenständige Resume-Tool läuft
 * unverändert weiter.
 */
async function davidKontext(davidId: string): Promise<string> {
  if (!davidId) return "";
  const sitzung = await leseDavid(davidId).catch(() => null);
  if (!sitzung) return "";
  const teile: string[] = [];
  const gespraech = (sitzung.fragen ?? []).filter(f => f.antwort);
  if (gespraech.length) {
    /**
     * SCREENING-ANTWORTEN SIND KONTEXT, KEINE COPY-PASTE-QUELLE (Owner 28.08.2026,
     * ausdrückliche Dauerregel mit Beispiel).
     *
     * WARUM DAS DIE WICHTIGSTE ZEILE IM GANZEN GENERATOR IST: Im Gespräch redet der Bewerber
     * wie ein Mensch — „Ich habe Homepages für Ärzte, Bäcker und Metzger gemacht." Wörtlich
     * in ein Anschreiben übernommen, klingt genau dieser Satz nach Kleinauftrag statt nach
     * Kompetenz, und er schadet der Bewerbung MEHR, als hätte man ihn weggelassen. Die
     * Kernaussage darin ist stark („arbeitet mit nicht-technischen, zeitkritischen
     * Anwendern"); nur der Wortlaut ist es nicht.
     *
     * Das Modell neigt genau zur falschen Richtung: Es findet einen konkreten Satz und hält
     * ihn für einen Beleg, den es wörtlich mitnehmen soll. Deshalb steht die Regel hier
     * SCHRITTWEISE — Kernaussage, Relevanzprüfung, Abstraktion — und nicht als ein Wort
     * „professionell umformulieren", das folgenlos überlesen wird.
     *
     * DIE GRENZE BLEIBT: abstrahieren heisst umformulieren, nicht ausschmücken. „Erfinde
     * nichts dazu" steht deshalb weiterhin daneben — ein erfundener Fakt in einer Bewerbung
     * ist kein Stilfehler, sondern eine Lüge gegenüber einem Arbeitgeber.
     */
    teile.push([
      "AUS EINEM VORAUSGEGANGENEN PRE-SCREENING-GESPRÄCH. Das sind AUSSAGEN DES BEWERBERS, keine Angaben aus dem Lebenslauf — benutze sie für Betonung, Motivation und Erklärung von Lücken.",
      "DIESE ANTWORTEN SIND ROHINFORMATION UND DÜRFEN NIE WÖRTLICH IN LEBENSLAUF ODER ANSCHREIBEN ÜBERNOMMEN WERDEN. Für jede Antwort:",
      "1. Kernaussage herausziehen.",
      "2. Prüfen, ob sie für DIESE Stelle relevant ist — sonst weglassen.",
      "3. Umgangssprache, spontane Formulierungen und Alltagsbeispiele fachlich abstrahieren.",
      "4. Nur die relevante Aussage verwenden, nicht den ganzen Satz.",
      "5. Präzise und beruflich neu formulieren.",
      "6. KEINE neuen Fakten hinzufügen.",
      "7. Ein konkretes Beispiel nur behalten, wenn es die Bewerbung nachweislich stärker macht.",
      'BEISPIEL — Antwort: "Ich habe Homepages für Ärzte, Bäcker und Metzger gemacht." FALSCH ist die wörtliche Übernahme. RICHTIG: "Ich habe wiederholt mit nicht-technischen, zeitkritischen Anwendern gearbeitet und digitale Lösungen auf ihre praktischen Bedürfnisse ausgerichtet."',
    ].join("\n"));
    teile.push(gespraech.map(f => `Frage: ${f.frage}\nAntwort: ${f.antwort}`).join("\n\n"));
  }
  const e = sitzung.erkenntnisse;
  if (e) {
    const zeilen = [
      e.passung.length ? `Passung: ${e.passung.join(" · ")}` : "",
      e.belege.length ? `Belege: ${e.belege.join(" · ")}` : "",
      e.motivation.length ? `Motivation: ${e.motivation.join(" · ")}` : "",
      e.recruiterfragen.length ? `Mögliche Recruiter-Fragen: ${e.recruiterfragen.join(" · ")}` : "",
    ].filter(Boolean);
    if (zeilen.length) teile.push(`Notizen aus dem Screening:\n${zeilen.join("\n")}`);
  }
  if (sitzung.report?.fehltImCv?.length) {
    teile.push(`Was im Lebenslauf bisher FEHLT (im Gespräch sichtbar geworden):\n${sitzung.report.fehltImCv.map(p => `- ${p.punkt}: ${p.warum}`).join("\n")}`);
  }
  return teile.join("\n\n");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const schritt = s(body.schritt, 20);
  const id = s(body.id, 60);
  const device = s(body.device, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  /* Der kiss-log-Auftrag ist das Besitz- und Zahlungs-Gedächtnis (wie in Tür 1/2). */
  const eintraege = await readKissLog().catch(() => []);
  const auftrag = eintraege.find(e => e.id === id);
  if (!auftrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  /* SICHTBARE FEHLER IN DER SPRACHE DES KUNDEN, MIT AUSWEG (Hausregel, Owner 28.08.2026
     zum zweiten Mal gemeldet — diesmal mit Bild: „Not yours." stand rot unter dem
     Kaufknopf).
     
     „Not yours." ist ein Satz für Entwickler: englisch auf einer deutschen Seite, ohne
     Grund und ohne Weg zurück. Der Kunde liest ihn als „kaputt" und geht. Was WIRKLICH
     passiert ist, kann er selbst beheben — er sitzt an einem anderen Browser als dem, in
     dem er angefangen hat. Also steht genau das da, samt beider Wege hinaus. */
  /**
   * KONTO SCHLÄGT GERÄT — AUCH HIER (Owner 28.08.2026, zum zweiten Mal in derselben Stunde:
   * angemeldet und trotzdem abgewiesen, diesmal direkt über dem Kaufknopf).
   *
   * Ich hatte die Regel in /api/david und /api/david-screening nachgezogen und diese Route
   * übersehen — ausgerechnet die, die vor dem Bezahlen steht. Der Riegel hier prüft den
   * KISS-LOG-AUFTRAG; `darfAmProfilArbeiten` weiter unten kann das Konto längst, aber bis
   * dahin kommt niemand, der hier schon hinausfliegt.
   *
   * Die Anmeldung ist der stärkere Nachweis: Die Gerätekennung steht in einem localStorage,
   * die Adresse hinter einem Passwort. Und wer sich anmeldet, wechselt oft genau deshalb das
   * Gerät — Handy zu Rechner ist der Normalfall, nicht der Angriff.
   *
   * `paidEmail` zählt mit: Bezahlt wurde vielleicht mit einer anderen Adresse als der, mit
   * der das Screening begann; beide gehören demselben Menschen.
   */
  const kontoMail = await getSellerFromRequest(request)
    .then(k => String(k?.email ?? "").trim().toLowerCase())
    .catch(() => "");
  const seins = !!kontoMail && [auftrag.email, auftrag.paidEmail]
    .some(m => String(m ?? "").trim().toLowerCase() === kontoMail);
  if (!seins && auftrag.device && device && auftrag.device !== device) {
    return NextResponse.json({ error: "Dieser Auftrag gehört zu einem anderen Browser. Öffne ihn auf dem Gerät, auf dem du angefangen hast — oder starte hier neu." }, { status: 403 });
  }

  /* ── SCHRITT 1: ERZEUGEN (gratis — Titelblatt + Layout + Analyse, KEINE Optimierung) ── */
  /**
   * WEITERE BEWERBUNG AUS DERSELBEN ANALYSE (Owner 30.08.2026: „was passiert, wenn ich aus
   * der Analyse noch eine Bewerbung anstosse? … ich will, dass eine NEUE entsteht" — die
   * Multi-Bewerbung vom 25.08., Stufe 2).
   *
   * Dieser Schritt legt NUR den neuen Auftrag an — kostenlos, kein Modell-Lauf. Er erbt
   * Lebenslauf, Adresse und Gerät vom bezahlten Ursprung; bezahlt und erzeugt wird die
   * Mappe danach über denselben Weg wie die erste (Kasse → erzeugen → optimieren, mit
   * `davidId` auf den Ursprung, damit das Gespräch weiter einfliesst). Der Ursprung bleibt
   * unberührt: eigene Kennung, eigenes Profil, eigene Kachel.
   *
   * NUR NACH DEM ERSTEN KAUF: Wer die erste Bewerbung nicht gekauft hat, hat auch keinen
   * Anspruch auf eine zweite Tür daneben — der normale Kaufweg steht ihm ja offen.
   */
  if (schritt === "mappe") {
    const davidId = s(body.davidId, 60);
    const anzeige = s(body.anzeige, 8000);
    if (!davidId || anzeige.trim().length < 60) {
      return NextResponse.json({ error: "Ursprung und Anzeige sind Pflicht." }, { status: 400 });
    }
    const alle = await readKissLog();
    const orig = alle.find(e => e.id === davidId);
    if (!orig || orig.theme !== "david") return NextResponse.json({ error: "Ursprung nicht gefunden." }, { status: 404 });
    if (orig.paid !== true) return NextResponse.json({ error: "Erst nach dem ersten Kauf." }, { status: 402 });
    /* Besitz: dasselbe Gerät oder dieselbe Adresse wie der Ursprung. */
    const mail = s(body.email, 200).toLowerCase();
    const passt = (!!device && device === orig.device) || (!!mail && mail === String(orig.email ?? "").toLowerCase());
    if (!passt) return NextResponse.json({ error: "Not yours." }, { status: 403 });
    const neuId = crypto.randomUUID();
    alle.push({
      id: neuId, theme: "david", createdAt: new Date().toISOString(),
      email: orig.email, device: orig.device, lang: orig.lang,
      cvPath: orig.cvPath, cvName: orig.cvName, mappeVon: davidId,
    } as (typeof alle)[number]);
    await writeKissLog(alle);
    return NextResponse.json({ ok: true, id: neuId });
  }

  if (schritt === "erzeugen") {
    /**
     * FERTIG IST FERTIG — UND NIMMT TROTZDEM FOTO UND VORLAGE AN (Owner 30.08.2026: „ich
     * habe ein neues Bild gewählt und Layout 3 … und wurde nichts generiert").
     *
     * ZWEI FEHLER STECKTEN HIER: Der Nachreichen-Knopf rief `erzeugen` OHNE Anzeige und
     * Lebenslauf auf und prallte an der Pflichtprüfung ab („E-Mail, Anzeige und Lebenslauf
     * sind Pflicht") — gespeichert wurde nichts. Und ein erneuter KAUF-Klick auf einem
     * fertigen Auftrag lief den GANZEN Modell-Lauf noch einmal und überschrieb das
     * bezahlte Profil. Deshalb steht der Ausstieg jetzt VOR der Pflichtprüfung: Ist das
     * Profil bezahlt und fertig, wird nur Foto/Vorlage abgelegt — kein Lauf, kein
     * Überschreiben, keine zweite Rechnung.
     */
    const schonProfil = await leseLebenslauf(id).catch(() => null);
    if (schonProfil?.bezahlt === true && schonProfil.strategie) {
      const fotoNach = s(body.foto, 8_000_000);
      let geaendert = false;
      if (fotoNach.startsWith("data:")) {
        const fp = await fotoAblegen(fotoNach).catch(() => "");
        const fu = fp ? await getSignedUrl(fp, 60 * 60 * 24 * 365 * 10).catch(() => "") : "";
        if (fu) { schonProfil.fotoUrl = fu; geaendert = true; }
      }
      const vNach = s(body.vorlage, 30);
      if (vNach && vNach !== schonProfil.pdfVorlage) { schonProfil.pdfVorlage = vNach; geaendert = true; }
      if (geaendert) await schreibeLebenslauf(schonProfil);
      return NextResponse.json({ ok: true, id, schon: true, ...(geaendert ? { aktualisiert: true } : {}) });
    }
    const email = s(body.email, 200).toLowerCase();
    const anzeige = s(body.anzeige, 8000);
    const cvPath = s(body.cvPath, 300);
    if (!email || !anzeige || !cvPath) {
      return NextResponse.json({ error: "E-Mail, Anzeige und Lebenslauf sind Pflicht." }, { status: 400 });
    }

    /* Die David-Kennung ist DIESELBE wie die des Bewerbungs-Auftrags (beide entstehen aus
       /api/kiss-log) — der Trichter reicht sie trotzdem ausdrücklich herein, damit hier
       nichts geraten wird. */
    const kontext = await davidKontext(s(body.davidId, 60));
    const beschafft = await anzeigenTextBeschaffen(anzeige);
    if (!beschafft.text) return NextResponse.json({ error: beschafft.fehler ?? "Keine Anzeige erkannt." }, { status: 422 });
    const anzeigeText = beschafft.text.slice(0, 12000);

    const cv = await cvContent(cvPath);
    if ("fehler" in cv) return NextResponse.json({ error: cv.fehler }, { status: 422 });

    const prompt = [
      "Du bereitest aus einem Lebenslauf und einer Stellenanzeige eine Bewerbung vor. Der Lebenslauf ist beigefügt.",
      `Die Stellenanzeige:\n${anzeigeText}`,
      /* DIE SPRACHE DER ANZEIGE GILT FÜR ALLES (Owner 25.08.2026: „die Bewerbung muss doch
         in der Sprache rauskommen wie die Anzeige"). Vorher las diese Route den Lebenslauf
         in SEINER Sprache aus und schrieb nur das Anschreiben in der Sprache der Anzeige —
         heraus kam eine Mappe mit englischem Brief vor deutschem Lebenslauf. Das Umstellen
         kostet nichts extra: Es passiert im selben Durchlauf, in dem der CV ohnehin
         ausgelesen wird. Übersetzen ist KEIN Zuschneiden — die Gratis-Linie bleibt, wo sie
         war (der Inhalt wird nicht auf die Anzeige hin umgeschrieben, nur ihre Sprache
         gesprochen). */
      /* DIE SPRACHE DER ANZEIGE GEWINNT — MIT BEISPIEL (Owner 25.08.2026, an einem echten
         Lauf: rumänischer Lebenslauf + englische Anzeige ergab „UE, Germania" und
         „(proiect propriu)"). Die blosse Anweisung „Sprache der Anzeige" genügt dem Modell
         nicht: Beim Auslesen zieht es die Sprache des Dokuments vor, das es gerade liest.
         Der genannte Fall im Prompt dreht das zuverlässig. */
      "SCHRITT 1 — bestimme die Sprache der STELLENANZEIGE. SCHRITT 2 — schreibe ALLE Textfelder in GENAU dieser Sprache, auch wenn der Lebenslauf in einer anderen verfasst ist. Beispiel: englische Anzeige + rumänischer Lebenslauf ⇒ ALLES auf Englisch (also \"EU, Germany\" statt \"UE, Germania\", \"(own project)\" statt \"(proiect propriu)\").",
      "Betroffen sind: positionierung, profiltext, rolle, ergebnis, Ausbildungstitel, sprachen, kompetenzen, schwerpunkte, anschreiben — UND das Feld 'ort' (Länder- und Regionsnamen in der Sprache der Anzeige). NIE übersetzt werden: Personennamen, Firmennamen, Institutionsnamen, Städtenamen und Zeiträume. ERKLÄRENDE ZUSÄTZE IN KLAMMERN gehören dagegen zur Sprache der Anzeige: aus „Musterfirma (eigenes Projekt)\" wird bei englischer Anzeige „Musterfirma (own project)\" — der Name bleibt, der Zusatz wandert mit.",
      "'sprache' — das ISO-Kürzel der Anzeigensprache (z. B. \"de\", \"en\", \"ro\", \"fr\", \"es\", \"it\", \"pt\").",
      // DER CV-TEIL BLEIBT INHALTLICH NEUTRAL (Gratis-Linie): beschreibe den Menschen, wie
      // der Lebenslauf ihn zeigt — NICHT auf die Anzeige hin umgeschrieben.
      "Lies den Lebenslauf VOLLSTÄNDIG aus, ohne ihn auf die Anzeige zuzuschneiden — aber gib ALLES in der Sprache der Anzeige wieder:",
      "'name' — der volle Name (nie übersetzt). 'ort', falls angegeben, sonst leer. 'positionierung' — die Berufsbezeichnung, wie der Lebenslauf sie trägt, IN DER SPRACHE DER ANZEIGE (auch Fachbegriffe werden übersetzt: aus „Barrierefreiheit“ wird bei einer englischen Anzeige „accessibility“).",
      /* INTERNATIONALES TELEFONFORMAT (Owner 25.08.2026, an einem echten Fall: rumänische
         Nummer „0724 644 477" ohne Landesvorwahl auf einer Bewerbung nach Deutschland —
         „hier muss +40 davor, weil es Rumänien ist"). Eine Bewerbung geht oft über die
         Landesgrenze; eine Nummer ohne Vorwahl ist für die Firma dort unbrauchbar. Die
         Vorwahl wird aus dem Land des Bewerbers abgeleitet (Adresse/CV-Kontext), nicht aus
         der Sprache der Anzeige — der Bewerber bleibt, wo er wohnt. */
      "'telefon', falls angegeben, sonst leer — IM INTERNATIONALEN FORMAT mit Landesvorwahl, z. B. \"+40 724 644 477\" statt \"0724 644 477\" oder \"+49 176 12345678\" statt \"0176 12345678\". Trägt die Nummer im Lebenslauf schon eine Landesvorwahl (+ oder 00), übernimm sie unverändert. Fehlt sie, leite sie aus dem Land des Bewerbers ab (Adresse im Lebenslauf, sonst Kontext) und ersetze eine führende \"0\" durch \"+<Landesvorwahl> \".",
      "'profiltext' — 60–90 Wörter über diese Person, IN DER SPRACHE DER ANZEIGE; NUR aus dem Lebenslauf, nichts erfinden.",
      "'erfahrung' — ALLE beruflichen Stationen, chronologisch neueste zuerst, keine ausgelassen: [{\"rolle\":\"...\",\"firma\":\"Firma, Ort\",\"zeitraum\":\"...\",\"ergebnis\":\"EIN Satz aus dem Lebenslauf\"}]. 'rolle' und 'ergebnis' IN DER SPRACHE DER ANZEIGE; 'firma' und 'zeitraum' wörtlich wie im Lebenslauf. Echte Jahreszahlen, nichts erfinden.",
      "'ausbildung' — ALLE Stationen: [{\"titel\":\"...\",\"ort\":\"...\",\"zeitraum\":\"...\"}]; 'titel' in der Sprache der Anzeige, 'ort' und 'zeitraum' wörtlich. 'sprachen' — [{\"sprache\":\"...\",\"niveau\":\"...\"}], beide in der Sprache der Anzeige (z. B. \"Deutsch\"→\"German\", \"Muttersprache\"→\"Native\").",
      "'kompetenzen' — 4–6 kurze Begriffe. 'schwerpunkte' — 3–4 Arbeitsfelder (keine Jobtitel). Beide in der Sprache der Anzeige.",
      // DAS TITELBLATT (der Gratis-Kern) + DIE EHRLICHE ANALYSE.
      "'anschreiben' — ein vollständiges Anschreiben (150–250 Wörter) IN DER SPRACHE DER ANZEIGE für DIESE Stelle: konkreter Bezug auf 2–3 Anforderungen, je mit Beleg aus dem Lebenslauf. Lücken werden OFFEN in 1–2 Sätzen angesprochen, nie versteckt, nie entschuldigt (keine Wörter wie \"leider\"). Neutrale Anrede ohne erfundene Namen; endet mit dem Namen des Bewerbers.",
      "'analyse' — die ehrliche Einschätzung: {\"prozent\": 0–100 wie gut Lebenslauf und Anzeige zusammenpassen (ehrlich, keine Gefälligkeit),\"empfehlung\":\"gut\"|\"bruecke\"|\"schwach\",\"anforderungen\":[je zentrale Anforderung der Anzeige: {\"text\":\"kurz\",\"einstufung\":\"erfuellt\"|\"uebertragbar\"|\"erklaerbar\"|\"blocker\",\"begruendung\":\"EIN Satz\"}] (4–7 Einträge)}.",
      "'anzeigeTitel' — der Stellentitel wörtlich (kurz); 'anzeigeFirma' — Firmenname falls erkennbar, sonst leer.",
      /* `sprache` MUSS IM SCHEMA STEHEN (gemessen 25.08.2026): Die Anweisung weiter oben
         allein genügte nicht — das Modell liefert exakt die Felder dieser Zeile, und ohne
         den Eintrag hier kam das Kürzel nie an. Folge: `dokumentSprache` blieb leer und
         das PDF trug deutsche Zwischentitel über englischem Inhalt. */
      "Antworte NUR als JSON: {\"sprache\":\"..\",\"name\":\"...\",\"ort\":\"...\",\"telefon\":\"...\",\"positionierung\":\"...\",\"profiltext\":\"...\",\"erfahrung\":[...],\"ausbildung\":[...],\"sprachen\":[...],\"kompetenzen\":[...],\"schwerpunkte\":[...],\"anschreiben\":\"...\",\"analyse\":{...},\"anzeigeTitel\":\"...\",\"anzeigeFirma\":\"...\"}",
      kontext,
    ].filter(Boolean).join("\n\n");

    const parsed = await ki([{ type: "input_text", text: prompt }, cv]);
    if (!parsed) return NextResponse.json({ error: "Auswertung fehlgeschlagen — bitte noch einmal." }, { status: 502 });

    /* Das Foto — optional, dauerhaft abgelegt (dieselbe Doppel-Ablage wie Tür 2). */
    let fotoUrl = "";
    let fotoPath = "";
    const fotoDataUrl = s(body.foto, 8_000_000);
    if (fotoDataUrl.startsWith("data:")) {
      fotoPath = await fotoAblegen(fotoDataUrl).catch(() => "");
      fotoUrl = fotoPath ? (await getSignedUrl(fotoPath, 60 * 60 * 24 * 365 * 10).catch(() => "")) : "";
    }

    const analyseRoh = (parsed.analyse ?? {}) as Record<string, unknown>;
    const anforderungen = (Array.isArray(analyseRoh.anforderungen) ? analyseRoh.anforderungen : [])
      .slice(0, 8)
      .map(a => {
        const roh = (a ?? {}) as Record<string, unknown>;
        return {
          text: s(roh.text, 160),
          einstufung: (EINSTUFUNGEN.includes(roh.einstufung as Einstufung) ? roh.einstufung : "erklaerbar") as Einstufung,
          begruendung: s(roh.begruendung, 240),
        };
      })
      .filter(a => a.text);
    const prozent = Math.max(0, Math.min(100, Math.round(Number(analyseRoh.prozent)) || 0));
    const empfehlung = (EMPFEHLUNGEN.includes(analyseRoh.empfehlung as Empfehlung) ? analyseRoh.empfehlung : "bruecke") as Empfehlung;

    const profil: LebenslaufProfil = {
      id,
      erstelltAm: new Date().toISOString(),
      name: s(parsed.name, 80) || s(body.name, 80) || undefined,
      email,
      ort: s(parsed.ort, 80) || undefined,
      telefon: s(parsed.telefon, 60) || undefined,
      positionierung: s(parsed.positionierung, 120) || undefined,
      sprechtext: s(parsed.profiltext, 1200) || undefined,
      stichpunkte: [],
      kategorien: [],
      kompetenzen: liste(parsed.kompetenzen, 6, 40),
      schwerpunkte: liste(parsed.schwerpunkte, 4, 60),
      erfahrung: (Array.isArray(parsed.erfahrung) ? parsed.erfahrung : []).slice(0, 15).map(e => {
        const roh = (e ?? {}) as Record<string, unknown>;
        return { rolle: s(roh.rolle, 120), firma: s(roh.firma, 120) || undefined, zeitraum: s(roh.zeitraum, 60), ergebnis: s(roh.ergebnis, 220) || undefined };
      }).filter(e => e.rolle),
      ausbildung: (Array.isArray(parsed.ausbildung) ? parsed.ausbildung : []).slice(0, 8).map(a => {
        const roh = (a ?? {}) as Record<string, unknown>;
        return { titel: s(roh.titel, 160), ort: s(roh.ort, 120) || undefined, zeitraum: s(roh.zeitraum, 60) || undefined };
      }).filter(a => a.titel),
      sprachen: (Array.isArray(parsed.sprachen) ? parsed.sprachen : []).slice(0, 8).map(sp => {
        const roh = (sp ?? {}) as Record<string, unknown>;
        return { sprache: s(roh.sprache, 40), niveau: s(roh.niveau, 40) || undefined };
      }).filter(sp => sp.sprache),
      ...(fotoUrl ? { fotoUrl } : {}),
      anschreiben: s(parsed.anschreiben, 3000) || undefined,
      /* DIE GEWÄHLTE PDF-VORLAGE (28.08.2026) — sie kommt aus der Galerie im David-Angebot
         mit. Ungeprüft durchgereicht darf sie nicht werden: `vorlageFinden` in
         lib/bewerbung-pdf.ts fällt bei Unbekanntem auf Klassik zurück, hier wird nur die
         Länge begrenzt. */
      pdfVorlage: s(body.vorlage, 30) || undefined,
      anzeigeTitel: s(parsed.anzeigeTitel, 120) || undefined,
      anzeigeFirma: s(parsed.anzeigeFirma, 120) || undefined,
      anzeigeText,
      /* Die Sprache der Anzeige — sie steuert auch die festen Überschriften im PDF
         (Owner 25.08.2026). Nur die zwei Buchstaben, alles andere fällt auf Deutsch. */
      dokumentSprache: s(parsed.sprache, 2).toLowerCase() || undefined,
      matchProzent: prozent,
      matchEmpfehlung: empfehlung,
      bezahlt: false,
    };
    if (!(await schreibeLebenslauf(profil))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }

    /* CV-Beschriftung + Foto + Mail am Auftrag — die Assets-Kachel und der spätere
       Kauf hängen daran (dieselbe Pflege wie /api/lebenslauf-auswertung). */
    try {
      const frisch = await readKissLog();
      const e = frisch.find(x => x.id === id);
      if (e) {
        e.cvPath = cvPath;
        e.cvName = s(body.cvName, 160) || e.cvName;
        if (fotoPath) e.personPath = fotoPath;
        if (email) e.email = email;
        await writeKissLog(frisch);
      }
    } catch { /* Beschriftung ist Zugabe */ }

    return NextResponse.json({
      id,
      anzeigeTitel: profil.anzeigeTitel ?? "",
      analyse: { prozent, empfehlung, anforderungen },
    });
  }

  /* ── SCHRITT 2: OPTIMIEREN (nur nach Zahlung — voller Zuschnitt + ohne Wasserzeichen) ── */
  if (schritt === "optimieren") {
    /**
     * DER ADMIN DARF DEN KAUFWEG PRÜFEN, OHNE ZU ZAHLEN (Owner 28.08.2026: „also ich muss es
     * testen können ich zahle doch mit admin code").
     *
     * Er konnte es bisher NICHT: `isStaff` gibt es nur in der Try-on-Seite, der Lebenslauf-
     * und David-Kauf kannte keine Umgehung. Wer das Ergebnis prüfen wollte, musste 9,99 €
     * auf einem `cs_live_`-Schlüssel bezahlen — also echtes Geld, für jeden Testlauf.
     *
     * DIESELBE PRÜFUNG WIE ÜBERALL IM HAUS (`adminPinMatches`, Kopfzeile
     * `x-try-look-admin-pin`): In der Produktion braucht es die richtige Nummer, lokal ohne
     * gesetzte Nummer steht die Tür offen — genau wie bei jedem anderen Admin-Werkzeug.
     *
     * ES WIRD LAUT PROTOKOLLIERT. Eine Umgehung der Kasse, die still passiert, findet man
     * hinterher in keiner Abrechnung wieder.
     */
    const alsAdmin = adminPinMatches(request);
    if (alsAdmin && auftrag.paid !== true) {
      console.warn("[resume-generator] ADMIN-DURCHLAUF — Kasse übersprungen, nichts abgebucht:", id.slice(0, 8));
    }
    if (!alsAdmin && auftrag.paid !== true) {
      return NextResponse.json({ error: "Erst nach der Zahlung.", zahlungNoetig: true }, { status: 402 });
    }
    const profil = await leseLebenslauf(id);
    if (!profil) return NextResponse.json({ error: "Bewerbung nicht gefunden." }, { status: 404 });
    if (!(await darfAmProfilArbeiten(profil, device, request))) {
      return NextResponse.json({ error: "Dieser Auftrag gehört zu einem anderen Browser. Öffne ihn auf dem Gerät, auf dem du angefangen hast — oder starte hier neu." }, { status: 403 });
    }
    /* Schon optimiert UND bezahlt: nichts doppelt rechnen — der Aufruf ist idempotent
       (die Rückkehr von Stripe kann mehrfach laden). */
    if (profil.bezahlt === true && profil.strategie) {
      /**
       * FOTO UND VORLAGE NACHREICHEN (Owner 30.08.2026: „aber mein Bild hat er nicht
       * eingebaut" — sein Bewerbungsfoto fehlte im fertigen PDF).
       *
       * WIE ES DAZU KAM: Beim Löschen des Auftrags wurde auch sein hochgeladenes Foto vom
       * Speicher entfernt (Löschen heisst löschen), und der zweite Anlauf lief aus der
       * Galerie — die kennt kein Foto. Das Profil war fertig und bezahlt, aber ohne Bild.
       *
       * Der Aufruf hier war bisher eine reine Idempotenz-Bremse. Jetzt nimmt er ein Foto
       * und eine Vorlagen-Wahl entgegen und legt sie ans BEZAHLTE Profil — KEIN Modell-Lauf,
       * nur Ablage. Das PDF entsteht ohnehin bei jedem Öffnen frisch aus dem Profil
       * (`/api/bewerbung-pdf`), also zeigt der nächste Klick das Bild.
       */
      const fotoNach = s(body.foto, 8_000_000);
      let geaendert = false;
      if (fotoNach.startsWith("data:")) {
        const fp = await fotoAblegen(fotoNach).catch(() => "");
        const fu = fp ? await getSignedUrl(fp, 60 * 60 * 24 * 365 * 10).catch(() => "") : "";
        if (fu) { profil.fotoUrl = fu; geaendert = true; }
      }
      const vNach = s(body.vorlage, 30);
      if (vNach && vNach !== profil.pdfVorlage) { profil.pdfVorlage = vNach; geaendert = true; }
      if (geaendert) await schreibeLebenslauf(profil);
      return NextResponse.json({ ok: true, id, schon: true, ...(geaendert ? { aktualisiert: true } : {}) });
    }
    const anzeigeText = profil.anzeigeText ?? "";
    if (!anzeigeText) return NextResponse.json({ error: "Anzeige nicht mehr vorhanden — bitte neu erzeugen." }, { status: 422 });

    const daten = {
      profiltext: profil.sprechtext ?? "",
      kompetenzen: profil.kompetenzen ?? [],
      schwerpunkte: profil.schwerpunkte ?? [],
      erfahrung: (profil.erfahrung ?? []).map((e, i) => ({ i, rolle: e.rolle, firma: e.firma ?? "", zeitraum: e.zeitraum, ergebnis: e.ergebnis ?? "" })),
      ausbildung: profil.ausbildung ?? [],
      sprachen: profil.sprachen ?? [],
      name: profil.name ?? "",
      ort: profil.ort ?? "",
    };
    /**
     * DIE FÜNF ANGABEN ÜBERNEHMEN — falls dieser Aufruf welche mitbringt.
     *
     * Sie kommen aus dem Formular NACH dem Kauf und werden am Profil festgehalten: Der
     * Optimier-Lauf ist idempotent (Stripes Rückkehr lädt mehrfach), und ein zweiter Aufruf
     * ohne Formular darf die Antworten des ersten nicht verlieren.
     */
    const angabenNeu = (body as { angaben?: Record<string, unknown> }).angaben;
    if (angabenNeu && typeof angabenNeu === "object") {
      const sauber = {
        verfuegbar: s(angabenNeu.verfuegbar, 200),
        mobilitaet: s(angabenNeu.mobilitaet, 200),
        netzwerk: s(angabenNeu.netzwerk, 300),
        kompromisse: s(angabenNeu.kompromisse, 300),
        gehalt: s(angabenNeu.gehalt, 120),
      };
      if (Object.values(sauber).some(Boolean)) profil.angaben = { ...profil.angaben, ...sauber };
    }
    /* Nur die wirklich ausgefüllten Felder in den Auftrag — ein leeres Feld als `""`
       mitzuschicken lädt das Modell dazu ein, „keine Angabe" zu deuten. */
    const angabenGefuellt = Object.fromEntries(
      Object.entries(profil.angaben ?? {}).filter(([, v]) => String(v ?? "").trim()),
    );
    const angabenZeile = Object.keys(angabenGefuellt).length
      ? `Angaben des Bewerbers, die NICHT im Lebenslauf stehen:\n${JSON.stringify(angabenGefuellt)}`
      : "";

    /* Dieselben eisernen Regeln wie die Multi-Bewerbung: AUSWÄHLEN UND BETONEN, NIE
       ERFINDEN — Stationen/Zeiträume/Firmen sind unantastbar. */
    const prompt = [
      "Du optimierst die Bewerbung eines Kandidaten auf EINE konkrete Stelle. Profildaten als JSON:",
      JSON.stringify(daten),
      `Die Stellenanzeige:\n${anzeigeText}`,
      "ZUSCHNEIDEN HEISST AUSWÄHLEN UND BETONEN, NIE ERFINDEN. Alles muss durch die Profildaten belegt sein. Lücken werden NICHT weggelogen.",
      /**
       * DIE FÜNF ANGABEN DES BEWERBERS (Owner 05.09.2026) — mit einer Regel je Angabe.
       *
       * OHNE DIESE REGELN SCHADEN SIE MEHR, ALS SIE NÜTZEN. Zwei Beispiele, und beide sind
       * der Grund, warum hier nicht einfach „berücksichtige die Angaben" steht:
       *
       *   GEHALT: Steht „ab 65.000, flexibel" im Anschreiben, hat der Bewerber verhandelt,
       *   bevor er im Gespräch war — nach unten, gegen sich selbst. Eine Zahl gehört nur
       *   dorthin, wo die Anzeige sie ausdrücklich verlangt; sonst ist Schweigen die
       *   stärkere Antwort.
       *
       *   KOMPROMISSE: „Ich würde auch Teilzeit nehmen" ist eine Auskunft für ein Gespräch,
       *   kein Satz für ein Anschreiben — geschrieben liest er sich als Abwertung des
       *   eigenen Angebots. Die Angabe darf die GEWICHTUNG steuern, nie im Text auftauchen.
       *
       * Leer heisst „nicht gesagt", nicht „nein" — daraus darf nichts abgeleitet werden.
       */
      ...(angabenZeile ? [angabenZeile,
        "REGELN FÜR DIESE ANGABEN, je Angabe eine: 'verfuegbar' darf ins Anschreiben, aber NUR wenn sie ein Vorteil ist (kurzfristig verfügbar); eine ferne Verfügbarkeit wird verschwiegen. 'mobilitaet' nur, wenn die Anzeige Ort, Reise oder Präsenz überhaupt anspricht. 'netzwerk' NUR abstrahiert als Kompetenz (z. B. \"belastbares Netzwerk in der Branche\"), NIE mit Namen von Personen oder Firmen. 'kompromisse' erscheint NIE im Text — sie steuert ausschliesslich, was du betonst und was du weglässt. 'gehalt' NUR, wenn die Anzeige ausdrücklich nach Gehaltsvorstellung fragt; fragt sie nicht danach, kommt keine Zahl und kein Hinweis darauf vor. Eine leere Angabe bedeutet 'nicht gesagt' — leite daraus nichts ab.",
      ] : []),
      /* DIE GANZE MAPPE SPRICHT DIE SPRACHE DER ANZEIGE (Owner 25.08.2026: „die Bewerbung
         muss doch in der Sprache rauskommen wie die Anzeige"). Vorher stand hier „profiltext
         — DIESELBE Sprache wie der bisherige": Nur das Anschreiben folgte der Anzeige, der
         Lebenslauf blieb in seiner Ursprungssprache — eine halb englische, halb deutsche
         Mappe. Übersetzen ist kein Erfinden: Was übersetzt wird, sagt dasselbe. */
      /* Dasselbe Beispiel wie im Erzeugen-Schritt — ohne es kippt der bezahlte Lauf zurück
         in die Sprache der Profildaten (gemessen 25.08.2026). */
      "SCHRITT 1 — bestimme die Sprache der STELLENANZEIGE. SCHRITT 2 — schreibe ALLE Textfelder in GENAU dieser Sprache, auch wenn die Profildaten in einer anderen vorliegen. Beispiel: englische Anzeige + rumänische Profildaten ⇒ ALLES auf Englisch (also \"EU, Germany\" statt \"UE, Germania\", \"(own project)\" statt \"(proiect propriu)\"). NIE übersetzt werden: Personennamen, Firmennamen, Institutionsnamen, Städtenamen und Zeiträume.",
      "Leite ZUERST 'strategie' ab: {\"staerksteArgumente\":[bis 5],\"uebertragbar\":[bis 6],\"zuErklaeren\":[bis 5],\"betonen\":[bis 4],\"wenigerBetonen\":[bis 4],\"sprachvorteile\":[bis 3],\"nieVerstecken\":[bis 3]}.",
      "'positionierung' — EINE Zeile unter dem Namen, passend zur Anzeige, NUR wenn die Erfahrung sie trägt (sonst leer).",
      "'profiltext' — 80–120 Wörter, der Strategie folgend: führe mit dem, was die Anzeige verlangt und das Profil belegt.",
      "'schwerpunkte' — 3–4 auf die Anzeige hin ausgewählte Arbeitsfelder. 'kompetenzen' — 4–6 vorhandene Begriffe, stärkste zuerst.",
      "'ergebnisse' — je Station optional eine neu betonte Ergebnis-Zeile: [{\"i\":0,\"ergebnis\":\"…\"}]. NUR umformulieren, was da ist.",
      /* Damit die Mappe wirklich EINE Sprache spricht, müssen auch die Felder mit, die der
         Zuschnitt sonst unangetastet lässt — Jobtitel, Ausbildungstitel, Sprachnamen. Ohne
         sie stünde ein englischer Profiltext über deutschen Stationsnamen. */
      "'rollen' — je Station der Jobtitel in der Sprache der Anzeige: [{\"i\":0,\"rolle\":\"…\"}]. NUR übersetzen/anpassen, nie eine andere Position daraus machen. Firma und Zeitraum lässt du weg — sie bleiben unverändert.",
      "'ausbildung' — dieselben Stationen in der Sprache der Anzeige: [{\"titel\":\"…\",\"ort\":\"…\",\"zeitraum\":\"…\"}]. 'ort' und 'zeitraum' wörtlich übernehmen.",
      "'sprachen' — dieselbe Liste in der Sprache der Anzeige: [{\"sprache\":\"…\",\"niveau\":\"…\"}] (z. B. \"Deutsch\"→\"German\", \"Muttersprache\"→\"Native\").",
      "'anschreiben' — das Anschreiben (150–250 Wörter), der Strategie folgend; jede Lücke aus 'zuErklaeren' offen in 1–2 Sätzen, ohne entschuldigende Sprache; endet mit dem Namen.",
      "Antworte NUR als JSON: {\"strategie\":{…},\"positionierung\":\"…\",\"profiltext\":\"…\",\"schwerpunkte\":[…],\"kompetenzen\":[…],\"ergebnisse\":[…],\"rollen\":[…],\"ausbildung\":[…],\"sprachen\":[…],\"anschreiben\":\"…\"}",
      /* HIER ZÄHLT DAS GESPRÄCH AM MEISTEN: Beim Zuschneiden entscheidet sich, was betont
         und wie eine Lücke erklärt wird — und genau dazu hat der Bewerber David etwas
         gesagt, das in keinem Dokument steht. Die Kennung des Auftrags IST die der
         David-Sitzung; ohne Sitzung bleibt der Absatz leer und alles läuft wie bisher. */
      await davidKontext(id),
    ].filter(Boolean).join("\n\n");

    const parsed = await ki([{ type: "input_text", text: prompt }]);
    if (!parsed) return NextResponse.json({ error: "Optimierung fehlgeschlagen — bitte noch einmal." }, { status: 502 });

    const strategieRoh = (parsed.strategie ?? {}) as Record<string, unknown>;
    /* Ergebnis-Zeile UND Jobtitel je Station — beides greift an derselben Stelle zu.
       FIRMA UND ZEITRAUM WERDEN NIE ANGEFASST (Eigenname und Zahlen, Hausregel
       „Stationen sind unantastbar"); ein leeres Feld fällt auf den Bestand zurück. */
    const erfahrung = (profil.erfahrung ?? []).map((e, i) => {
      const treffer = (schluessel: string) =>
        (Array.isArray(parsed[schluessel]) ? parsed[schluessel] as unknown[] : [])
          .find(x => Number((x as Record<string, unknown>)?.i) === i) as Record<string, unknown> | undefined;
      const ergebnis = s(treffer("ergebnisse")?.ergebnis, 220);
      const rolle = s(treffer("rollen")?.rolle, 120);
      return { ...e, ...(ergebnis ? { ergebnis } : {}), ...(rolle ? { rolle } : {}) };
    });
    /* Ausbildung und Sprachen kommen NUR mit, wenn die KI dieselbe Anzahl Stationen
       zurückgibt — sonst hätte eine unvollständige Antwort stillschweigend Stationen
       gelöscht. Ort und Zeitraum bleiben in jedem Fall der Bestand. */
    const ausbildungRoh = Array.isArray(parsed.ausbildung) ? parsed.ausbildung as Record<string, unknown>[] : [];
    const ausbildung = ausbildungRoh.length === (profil.ausbildung ?? []).length
      ? (profil.ausbildung ?? []).map((a, i) => ({ ...a, titel: s(ausbildungRoh[i]?.titel, 120) || a.titel }))
      : profil.ausbildung;
    const sprachenRoh = Array.isArray(parsed.sprachen) ? parsed.sprachen as Record<string, unknown>[] : [];
    const sprachen = sprachenRoh.length === (profil.sprachen ?? []).length
      ? (profil.sprachen ?? []).map((sp, i) => ({
          sprache: s(sprachenRoh[i]?.sprache, 40) || sp.sprache,
          niveau: s(sprachenRoh[i]?.niveau, 40) || sp.niveau,
        }))
      : profil.sprachen;
    const optimiert: LebenslaufProfil = {
      ...profil,
      sprechtext: s(parsed.profiltext, 1200) || profil.sprechtext,
      positionierung: s(parsed.positionierung, 120) || profil.positionierung,
      schwerpunkte: liste(parsed.schwerpunkte, 4, 60).length ? liste(parsed.schwerpunkte, 4, 60) : profil.schwerpunkte,
      kompetenzen: liste(parsed.kompetenzen, 6, 40).length ? liste(parsed.kompetenzen, 6, 40) : profil.kompetenzen,
      erfahrung,
      ausbildung,
      sprachen,
      anschreiben: s(parsed.anschreiben, 3000) || profil.anschreiben,
      strategie: {
        staerksteArgumente: liste(strategieRoh.staerksteArgumente, 5, 200),
        uebertragbar: liste(strategieRoh.uebertragbar, 6, 160),
        zuErklaeren: liste(strategieRoh.zuErklaeren, 5, 200),
        betonen: liste(strategieRoh.betonen, 4, 160),
        wenigerBetonen: liste(strategieRoh.wenigerBetonen, 4, 160),
        sprachvorteile: liste(strategieRoh.sprachvorteile, 3, 120),
        nieVerstecken: liste(strategieRoh.nieVerstecken, 3, 200),
      },
      bezahlt: true,
    };
    if (!(await schreibeLebenslauf(optimiert))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id });
  }

  /* ═══ SCHRITT „KREATOR" — DER SCHLICHTE LEBENSLAUF-GENERATOR (Owner 31.08.2026) ═══
   *
   * „Es ist einfach ein CV Kreator. Ohne Anschreiben, ohne nichts. Ein Tool. Für den Rest
   * haben wir David, der dir eine Profianalyse macht."
   *
   * ER STEHT NEBEN DEN DREI ANDEREN, NICHT AN IHRER STELLE. `mappe`, `erzeugen` und
   * `optimieren` werden von Davids Angebots-Bildschirm an fünf Stellen aufgerufen
   * (components/DavidAngebote.tsx) — eine Änderung dort hätte seinen bezahlten Kaufweg
   * mitgenommen. Deshalb ein eigener Schritt, der nichts davon anfasst.
   *
   * WAS ER NICHT TUT: keine Stellenanzeige, kein Anschreiben, keine Match-Analyse. Nur
   * lesen und ordnen. Das ist auch der Grund, warum er wirtschaftlich ist — der teure Teil
   * bei David ist der Bericht, nicht das Lesen.
   *
   * KEINE E-MAIL ALS PFLICHT (Owner: „Adresse, hat er im CV"): Sie steht im Dokument, seit
   * es Lebensläufe gibt. Sie wird ausgelesen wie Name, Ort und Telefon; was fehlt, fragt
   * der Minichat danach einzeln nach — ein Klick statt einer Tastatur.
   *
   * POST { schritt: "kreator", id, device, cvPath, cvName?, foto? }
   *   → { id, profil: {...}, fehlend: ["email", "telefon", …], hatFoto }
   */
  if (schritt === "kreator") {
    const cvPath = s(body.cvPath, 300);
    if (!cvPath) return NextResponse.json({ error: "Es fehlt der Lebenslauf." }, { status: 400 });

    const cv = await cvContent(cvPath);
    if ("fehler" in cv) return NextResponse.json({ error: cv.fehler }, { status: 422 });

    /**
     * DEUTSCH ALS ZIELSPRACHE (Owner 31.08.2026: „Ein Deutsch-Generator. Jede Bewerbung wird
     * auf Deutsch umgewandelt. Dein deutscher Lebenslauf." · „nein, nur deutsch").
     *
     * KEIN ZWEITER LAUF UND KEIN CENT EXTRA: Es ist dieselbe Auswertung, nur mit einer
     * Anweisung mehr — das Modell liest ohnehin schon jedes Feld an.
     *
     * UND ES IST KEINE ÜBERSETZUNG. Ein deutscher Lebenslauf folgt anderen Regeln als ein
     * rumänischer: tabellarisch, neueste Station zuerst, Zeiträume als MM/JJJJ. Und
     * Berufsbezeichnungen bleiben oft englisch, weil deutsche Anzeigen sie so ausschreiben —
     * „Customer Support Specialist" übersetzt man nicht. Genau daran unterscheidet sich das
     * hier von einem Übersetzer, und nur deshalb ist es etwas wert.
     */
    const aufDeutsch = s(body.zielsprache, 4) === "de";

    const prompt = [
      "Du liest einen Lebenslauf und ordnest ihn. Du bewertest NICHT, du schreibst KEIN Anschreiben und du erfindest NICHTS.",
      "Übernimm nur, was im Dokument steht. Was fehlt, lässt du leer — ein leeres Feld ist richtig, eine erfundene Angabe ist ein Fehler.",
      ...(aufDeutsch ? [
        "SPRACHE DES ERGEBNISSES: DEUTSCH. Gib alle Texte auf Deutsch zurück, auch wenn der Lebenslauf in einer anderen Sprache verfasst ist. Das ist keine wörtliche Übersetzung, sondern die Fassung, die ein deutscher Arbeitgeber erwartet.",
        "Dabei gilt: Zeiträume als MM/JJJJ – MM/JJJJ, neueste Station zuerst. Firmennamen, Orte und Eigennamen bleiben unverändert. Berufsbezeichnungen, die im deutschen Arbeitsmarkt englisch ausgeschrieben werden (z. B. Customer Support Specialist, Software Engineer), lässt du englisch — alles andere wird deutsch.",
        "Übertreibe nichts und ergänze nichts, was nicht dasteht: Der Lebenslauf soll auf Deutsch dasselbe sagen wie im Original.",
      ] : []),
      "'name' — der volle Name. 'email' und 'ort', falls angegeben, sonst leer.",
      "'telefon', falls angegeben, sonst leer — IM INTERNATIONALEN FORMAT mit Landesvorwahl (z. B. \"+40 724 644 477\" statt \"0724 644 477\"). Trägt sie schon eine Vorwahl (+ oder 00), unverändert übernehmen; sonst aus dem Land des Bewerbers ableiten (Adresse im Lebenslauf) und die führende \"0\" durch \"+<Landesvorwahl> \" ersetzen — ein deutscher Arbeitgeber muss die Nummer auch aus dem Ausland wählen können.",
      "'positionierung' — die Berufsbezeichnung, wie der Lebenslauf sie trägt. Keine Jahreszahlen, keine Firmennamen.",
      "'profiltext' — 3 bis 5 Sätze in der ersten Person, eng am Wortlaut des Lebenslaufs. KEINE Aufwertung, keine Superlative.",
      "'erfahrung' — ALLE Stationen, neueste zuerst: [{\"rolle\":\"...\",\"firma\":\"...\",\"zeitraum\":\"...\",\"ergebnis\":\"...\"}]. 'ergebnis' nur, wenn im Dokument eines steht.",
      "'ausbildung' — ALLE Stationen: [{\"titel\":\"...\",\"ort\":\"...\",\"zeitraum\":\"...\"}]. 'sprachen' — [{\"sprache\":\"...\",\"niveau\":\"...\"}].",
      "'kompetenzen' — 4 bis 6 kurze Begriffe AUS dem Dokument. 'schwerpunkte' — 3 bis 4 Arbeitsfelder, keine Jobtitel.",
      "Antworte NUR als JSON: {\"name\":\"...\",\"email\":\"...\",\"telefon\":\"...\",\"ort\":\"...\",\"positionierung\":\"...\",\"profiltext\":\"...\",\"erfahrung\":[...],\"ausbildung\":[...],\"sprachen\":[...],\"kompetenzen\":[...],\"schwerpunkte\":[...]}",
    ].join("\n\n");

    const parsed = await ki([{ type: "input_text", text: prompt }, cv]);
    if (!parsed) return NextResponse.json({ error: "Auswertung fehlgeschlagen — bitte noch einmal." }, { status: 502 });

    /* Das Foto — optional, dauerhaft abgelegt (dieselbe Doppel-Ablage wie oben). */
    let fotoUrl = "";
    let fotoPath = "";
    const fotoDataUrl = s(body.foto, 8_000_000);
    if (fotoDataUrl.startsWith("data:")) {
      fotoPath = await fotoAblegen(fotoDataUrl).catch(() => "");
      fotoUrl = fotoPath ? (await getSignedUrl(fotoPath, 60 * 60 * 24 * 365 * 10).catch(() => "")) : "";
    }

    const profil: LebenslaufProfil = {
      id,
      erstelltAm: new Date().toISOString(),
      name: s(parsed.name, 80) || undefined,
      email: s(parsed.email, 200).toLowerCase() || undefined,
      ort: s(parsed.ort, 80) || undefined,
      telefon: s(parsed.telefon, 60) || undefined,
      positionierung: s(parsed.positionierung, 120) || undefined,
      sprechtext: s(parsed.profiltext, 1200) || undefined,
      stichpunkte: [],
      kategorien: [],
      kompetenzen: liste(parsed.kompetenzen, 6, 40),
      schwerpunkte: liste(parsed.schwerpunkte, 4, 60),
      erfahrung: (Array.isArray(parsed.erfahrung) ? parsed.erfahrung : []).slice(0, 15).map(e => {
        const roh = (e ?? {}) as Record<string, unknown>;
        return { rolle: s(roh.rolle, 120), firma: s(roh.firma, 120) || undefined, zeitraum: s(roh.zeitraum, 60), ergebnis: s(roh.ergebnis, 220) || undefined };
      }).filter(e => e.rolle),
      ausbildung: (Array.isArray(parsed.ausbildung) ? parsed.ausbildung : []).slice(0, 8).map(a => {
        const roh = (a ?? {}) as Record<string, unknown>;
        return { titel: s(roh.titel, 160), ort: s(roh.ort, 120) || undefined, zeitraum: s(roh.zeitraum, 60) || undefined };
      }).filter(a => a.titel),
      sprachen: (Array.isArray(parsed.sprachen) ? parsed.sprachen : []).slice(0, 8).map(sp => {
        const roh = (sp ?? {}) as Record<string, unknown>;
        return { sprache: s(roh.sprache, 40), niveau: s(roh.niveau, 40) || undefined };
      }).filter(sp => sp.sprache),
      ...(fotoUrl ? { fotoUrl } : {}),
      pdfVorlage: s(body.vorlage, 30) || undefined,
      /* KEIN Anschreiben, KEINE Anzeige, KEINE Match-Werte — das ist der ganze Unterschied
         zum Schritt darüber. */
      bezahlt: false,
    };
    if (!(await schreibeLebenslauf(profil))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }

    try {
      const frisch = await readKissLog();
      const e = frisch.find(x => x.id === id);
      if (e) {
        e.cvPath = cvPath;
        e.cvName = s(body.cvName, 160) || e.cvName;
        if (fotoPath) e.personPath = fotoPath;
        if (profil.email) e.email = profil.email;
        await writeKissLog(frisch);
      }
    } catch { /* Beschriftung ist Zugabe */ }

    return NextResponse.json({ id, profil: kurzfassung(profil), fehlend: fehlendeFelder(profil), hatFoto: !!fotoUrl });
  }

  /* ═══ SCHRITT „ERGAENZEN" — die Antworten des Minichats ═══
   *
   * KEIN MODELL-AUFRUF. Nach dem Auslesen steht fest, welche Felder leer sind; der Chat geht
   * genau die durch. Das ist nicht nur billiger, sondern verlässlicher — eine echte
   * Chat-Maschine kann abschweifen, diese Abfolge nicht.
   *
   * POST { schritt: "ergaenzen", id, device, feld, wert }  ·  feld: name|email|telefon|ort
   * POST { schritt: "ergaenzen", id, device, foto }        · ein nachgereichtes Bild
   * POST { schritt: "ergaenzen", id, device, ohneFoto: true } · „absichtlich weggelassen"
   */
  if (schritt === "ergaenzen") {
    const profil = await leseLebenslauf(id).catch(() => null);
    if (!profil) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
    /* Ein bezahltes PDF wird nicht mehr im Vorbeigehen geändert. */
    if (profil.bezahlt === true) return NextResponse.json({ error: "Schon fertiggestellt." }, { status: 409 });

    const feld = s(body.feld, 20);
    const wert = s(body.wert, 200);
    if (feld && ["name", "email", "telefon", "ort"].includes(feld)) {
      if (feld === "email" && wert && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(wert)) {
        return NextResponse.json({ error: "Diese Adresse sieht noch nicht vollständig aus." }, { status: 400 });
      }
      (profil as Record<string, unknown>)[feld] = feld === "email" ? wert.toLowerCase() : wert;
    }

    if (body.ohneFoto === true) profil.ohneFoto = true;

    const fotoDataUrl = s(body.foto, 8_000_000);
    if (fotoDataUrl.startsWith("data:")) {
      const fp = await fotoAblegen(fotoDataUrl).catch(() => "");
      const fu = fp ? await getSignedUrl(fp, 60 * 60 * 24 * 365 * 10).catch(() => "") : "";
      if (fu) { profil.fotoUrl = fu; profil.ohneFoto = false; }
    }

    if (!(await schreibeLebenslauf(profil))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, profil: kurzfassung(profil), fehlend: fehlendeFelder(profil), hatFoto: !!profil.fotoUrl });
  }

  /* ═══ SCHRITT „FREISCHALTEN" — Wasserzeichen weg, ohne zweiten Modell-Lauf ═══
   *
   * Der Kreator hat nichts zu optimieren: Es gibt keine Anzeige und kein Anschreiben, auf
   * die zugeschnitten werden könnte. Bezahlt wird hier allein das saubere PDF (Owner
   * 31.08.2026: „9,99 bleibt dabei"). Deshalb setzt dieser Schritt nur `bezahlt` — kein
   * KI-Aufruf, keine zweite Rechnung, und beliebig oft aufrufbar (die Rückkehr von Stripe
   * kann mehrfach laden).
   *
   * Die Zahlungsprüfung ist WÖRTLICH dieselbe wie bei `optimieren`, samt Admin-Durchlauf,
   * damit der Kaufweg auch hier ohne echtes Geld geprüft werden kann.
   */
  if (schritt === "freischalten") {
    const alsAdmin = adminPinMatches(request);
    if (alsAdmin && auftrag.paid !== true) {
      console.warn("[resume-generator] ADMIN-DURCHLAUF (Kreator) — Kasse übersprungen, nichts abgebucht:", id.slice(0, 8));
    }
    if (!alsAdmin && auftrag.paid !== true) {
      return NextResponse.json({ error: "Erst nach der Zahlung.", zahlungNoetig: true }, { status: 402 });
    }
    const profil = await leseLebenslauf(id);
    if (!profil) return NextResponse.json({ error: "Lebenslauf nicht gefunden." }, { status: 404 });
    if (!(await darfAmProfilArbeiten(profil, device, request))) {
      return NextResponse.json({ error: "Dieser Auftrag gehört zu einem anderen Browser. Öffne ihn auf dem Gerät, auf dem du angefangen hast — oder starte hier neu." }, { status: 403 });
    }
    if (profil.bezahlt === true) return NextResponse.json({ ok: true, id, schon: true });
    if (!(await schreibeLebenslauf({ ...profil, bezahlt: true }))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id });
  }

  return NextResponse.json({ error: "Unbekannter Schritt." }, { status: 400 });
}
