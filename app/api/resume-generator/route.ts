import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf, type LebenslaufProfil } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { anzeigenTextBeschaffen } from "@/lib/lebenslauf-anzeige";
import { getSignedUrl, readKissLog, writeKissLog } from "@/lib/try-this-look-store";
import { fotoAblegen } from "@/lib/lebenslauf-foto";
import { docxZuText } from "@/lib/docx-text";

export const runtime = "nodejs";
export const maxDuration = 60;

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

/** Der CV als KI-Eingabe: PDF direkt als Datei, .docx als extrahierter Text. */
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
  if (auftrag.device && device && auftrag.device !== device) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  /* ── SCHRITT 1: ERZEUGEN (gratis — Titelblatt + Layout + Analyse, KEINE Optimierung) ── */
  if (schritt === "erzeugen") {
    const email = s(body.email, 200).toLowerCase();
    const anzeige = s(body.anzeige, 8000);
    const cvPath = s(body.cvPath, 300);
    if (!email || !anzeige || !cvPath) {
      return NextResponse.json({ error: "E-Mail, Anzeige und Lebenslauf sind Pflicht." }, { status: 400 });
    }

    const beschafft = await anzeigenTextBeschaffen(anzeige);
    if (!beschafft.text) return NextResponse.json({ error: beschafft.fehler ?? "Keine Anzeige erkannt." }, { status: 422 });
    const anzeigeText = beschafft.text.slice(0, 12000);

    const cv = await cvContent(cvPath);
    if ("fehler" in cv) return NextResponse.json({ error: cv.fehler }, { status: 422 });

    const prompt = [
      "Du bereitest aus einem Lebenslauf und einer Stellenanzeige eine Bewerbung vor. Der Lebenslauf ist beigefügt.",
      `Die Stellenanzeige:\n${anzeigeText}`,
      // DER CV-TEIL BLEIBT NEUTRAL (Gratis-Linie): beschreibe den Menschen, wie der
      // Lebenslauf ihn zeigt — NICHT auf die Anzeige hin umgeschrieben.
      "Lies den Lebenslauf VOLLSTÄNDIG aus, in der SPRACHE DES LEBENSLAUFS, ohne ihn auf die Anzeige zuzuschneiden:",
      "'name' — der volle Name. 'ort' und 'telefon', falls angegeben, sonst leer. 'positionierung' — die Berufsbezeichnung, wie der Lebenslauf sie trägt.",
      "'profiltext' — 60–90 Wörter über diese Person in dritter Person neutral oder erster Person, je nachdem wie der Lebenslauf formuliert; NUR aus dem Lebenslauf, nichts erfinden.",
      "'erfahrung' — ALLE beruflichen Stationen, chronologisch neueste zuerst, keine ausgelassen: [{\"rolle\":\"...\",\"firma\":\"Firma, Ort\",\"zeitraum\":\"...\",\"ergebnis\":\"EIN Satz aus dem Lebenslauf\"}]. Echte Jahreszahlen, nichts erfinden.",
      "'ausbildung' — ALLE Stationen: [{\"titel\":\"...\",\"ort\":\"...\",\"zeitraum\":\"...\"}]. 'sprachen' — [{\"sprache\":\"...\",\"niveau\":\"...\"}].",
      "'kompetenzen' — 4–6 kurze Begriffe. 'schwerpunkte' — 3–4 Arbeitsfelder (keine Jobtitel).",
      // DAS TITELBLATT (der Gratis-Kern) + DIE EHRLICHE ANALYSE.
      "'anschreiben' — ein vollständiges Anschreiben (150–250 Wörter) IN DER SPRACHE DER ANZEIGE für DIESE Stelle: konkreter Bezug auf 2–3 Anforderungen, je mit Beleg aus dem Lebenslauf. Lücken werden OFFEN in 1–2 Sätzen angesprochen, nie versteckt, nie entschuldigt (keine Wörter wie \"leider\"). Neutrale Anrede ohne erfundene Namen; endet mit dem Namen des Bewerbers.",
      "'analyse' — die ehrliche Einschätzung: {\"prozent\": 0–100 wie gut Lebenslauf und Anzeige zusammenpassen (ehrlich, keine Gefälligkeit),\"empfehlung\":\"gut\"|\"bruecke\"|\"schwach\",\"anforderungen\":[je zentrale Anforderung der Anzeige: {\"text\":\"kurz\",\"einstufung\":\"erfuellt\"|\"uebertragbar\"|\"erklaerbar\"|\"blocker\",\"begruendung\":\"EIN Satz\"}] (4–7 Einträge)}.",
      "'anzeigeTitel' — der Stellentitel wörtlich (kurz); 'anzeigeFirma' — Firmenname falls erkennbar, sonst leer.",
      "Antworte NUR als JSON: {\"name\":\"...\",\"ort\":\"...\",\"telefon\":\"...\",\"positionierung\":\"...\",\"profiltext\":\"...\",\"erfahrung\":[...],\"ausbildung\":[...],\"sprachen\":[...],\"kompetenzen\":[...],\"schwerpunkte\":[...],\"anschreiben\":\"...\",\"analyse\":{...},\"anzeigeTitel\":\"...\",\"anzeigeFirma\":\"...\"}",
    ].join("\n\n");

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
      anzeigeTitel: s(parsed.anzeigeTitel, 120) || undefined,
      anzeigeFirma: s(parsed.anzeigeFirma, 120) || undefined,
      anzeigeText,
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
    if (auftrag.paid !== true) {
      return NextResponse.json({ error: "Erst nach der Zahlung.", zahlungNoetig: true }, { status: 402 });
    }
    const profil = await leseLebenslauf(id);
    if (!profil) return NextResponse.json({ error: "Bewerbung nicht gefunden." }, { status: 404 });
    if (!(await darfAmProfilArbeiten(profil, device, request))) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    /* Schon optimiert UND bezahlt: nichts doppelt rechnen — der Aufruf ist idempotent
       (die Rückkehr von Stripe kann mehrfach laden). */
    if (profil.bezahlt === true && profil.strategie) {
      return NextResponse.json({ ok: true, id, schon: true });
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
    /* Dieselben eisernen Regeln wie die Multi-Bewerbung: AUSWÄHLEN UND BETONEN, NIE
       ERFINDEN — Stationen/Zeiträume/Firmen sind unantastbar. */
    const prompt = [
      "Du optimierst die Bewerbung eines Kandidaten auf EINE konkrete Stelle. Profildaten als JSON:",
      JSON.stringify(daten),
      `Die Stellenanzeige:\n${anzeigeText}`,
      "ZUSCHNEIDEN HEISST AUSWÄHLEN UND BETONEN, NIE ERFINDEN. Alles muss durch die Profildaten belegt sein. Lücken werden NICHT weggelogen.",
      "Leite ZUERST 'strategie' ab: {\"staerksteArgumente\":[bis 5],\"uebertragbar\":[bis 6],\"zuErklaeren\":[bis 5],\"betonen\":[bis 4],\"wenigerBetonen\":[bis 4],\"sprachvorteile\":[bis 3],\"nieVerstecken\":[bis 3]}.",
      "'positionierung' — EINE Zeile unter dem Namen, passend zur Anzeige, NUR wenn die Erfahrung sie trägt (sonst leer).",
      "'profiltext' — 80–120 Wörter, DIESELBE Sprache wie der bisherige, der Strategie folgend: führe mit dem, was die Anzeige verlangt und das Profil belegt.",
      "'schwerpunkte' — 3–4 auf die Anzeige hin ausgewählte Arbeitsfelder. 'kompetenzen' — 4–6 vorhandene Begriffe, stärkste zuerst.",
      "'ergebnisse' — je Station optional eine neu betonte Ergebnis-Zeile: [{\"i\":0,\"ergebnis\":\"…\"}]. NUR umformulieren, was da ist.",
      "'anschreiben' — das Anschreiben (150–250 Wörter, Sprache der Anzeige), der Strategie folgend; jede Lücke aus 'zuErklaeren' offen in 1–2 Sätzen, ohne entschuldigende Sprache; endet mit dem Namen.",
      "Antworte NUR als JSON: {\"strategie\":{…},\"positionierung\":\"…\",\"profiltext\":\"…\",\"schwerpunkte\":[…],\"kompetenzen\":[…],\"ergebnisse\":[…],\"anschreiben\":\"…\"}",
    ].join("\n\n");

    const parsed = await ki([{ type: "input_text", text: prompt }]);
    if (!parsed) return NextResponse.json({ error: "Optimierung fehlgeschlagen — bitte noch einmal." }, { status: 502 });

    const strategieRoh = (parsed.strategie ?? {}) as Record<string, unknown>;
    const erfahrung = (profil.erfahrung ?? []).map((e, i) => {
      const neu = (Array.isArray(parsed.ergebnisse) ? parsed.ergebnisse : []).find(x => Number((x as Record<string, unknown>)?.i) === i) as Record<string, unknown> | undefined;
      const ergebnis = s(neu?.ergebnis, 220);
      return ergebnis ? { ...e, ergebnis } : e;
    });
    const optimiert: LebenslaufProfil = {
      ...profil,
      sprechtext: s(parsed.profiltext, 1200) || profil.sprechtext,
      positionierung: s(parsed.positionierung, 120) || profil.positionierung,
      schwerpunkte: liste(parsed.schwerpunkte, 4, 60).length ? liste(parsed.schwerpunkte, 4, 60) : profil.schwerpunkte,
      kompetenzen: liste(parsed.kompetenzen, 6, 40).length ? liste(parsed.kompetenzen, 6, 40) : profil.kompetenzen,
      erfahrung,
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

  return NextResponse.json({ error: "Unbekannter Schritt." }, { status: 400 });
}
