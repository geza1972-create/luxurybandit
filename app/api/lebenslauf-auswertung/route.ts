import { NextResponse } from "next/server";
import { completeReservation, getAccountId, reserveCredits } from "@/lib/billing";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";
import { getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * LIEST DEN LEBENSLAUF, SCHLÄGT BERUFE VOR — UND SCHREIBT SPRECHTEXT + BERUFS-LOOK (Owner
 * 20.08.2026: KI-Avatar statt Eigenaufnahme — „Klamotten und Umfeld müssen zum Beruf passen,
 * Gesicht und Frisur bleiben"). `kleidung`/`umgebung` gehen an `/api/lebenslauf-video`
 * (gpt-image-2 + HeyGen), der Sprechtext ist das Skript, das der Avatar sagt.
 *
 * Muster wie `app/api/detect-products/route.ts` — PDF/Text an OpenAI, striktes JSON zurück.
 */

/**
 * VOLLSTÄNDIGKEIT STATT KURATIERTER AUSWAHL (Owner 24.08.2026, am eigenen 5-seitigen
 * Lebenslauf: „Mein CV ist nicht komplett … wo sind die Inhalte?" — dann ausdrücklich zur
 * Erfahrung-Deckelung: „es muss alles rein"). Das hebt die ursprüngliche Vorgabe des
 * Executive-Auftrags vom 22.08. („Do not recreate the entire CV", drei Stationen reichen)
 * für ECHTE Bewerberprofile auf — die drei Stationen waren als Design für das kuratierte
 * MUSTER gedacht, nicht als Grenze für das, was ein zahlender Bewerber bekommt.
 *
 * Firma und Ergebnis je Station fehlten davor komplett (die Vorlage hat dafür eigene
 * Zeilen, siehe `ExecutiveErfahrung` — sie standen bei jedem echten Profil leer), ebenso
 * Ausbildung und Sprachen (die Vorlage hat eigene Abschnitte dafür, aber nie Daten bekommen).
 */
type Station = { rolle?: string; firma?: string; zeitraum?: string; ergebnis?: string };
type Bildung = { titel?: string; ort?: string; zeitraum?: string };
type Sprache = { sprache?: string; niveau?: string };
type Auswertung = {
  stichpunkte?: string[]; kategorien?: string[]; sprechtext?: string; kleidung?: string; umgebung?: string;
  erfahrung?: Station[]; kompetenzen?: string[]; ort?: string; telefon?: string;
  schwerpunkte?: string[]; ausbildung?: Bildung[]; sprachen?: Sprache[];
};

function extractJson(text: string): Auswertung {
  try {
    return JSON.parse(text) as Auswertung;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as Auswertung;
    } catch {
      return {};
    }
  }
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 500) || "OpenAI returned an invalid response." } };
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY fehlt in .env.local. Bitte Server nach dem Eintragen neu starten." },
      { status: 400 }
    );
  }

  /**
   * JSON MIT EINEM SPEICHER-PFAD STATT EINER ROHEN DATEI (Owner 20.08.2026: „Zahlung muss
   * erst nach Stimmen-Upload kommen" — dafür muss der Lebenslauf schon VOR der Kasse auf dem
   * Server liegen, denn Stripes eingebettete Kasse lädt die Seite nach der Zahlung neu und
   * wirft jeden nur im Speicher gehaltenen Dateiinhalt weg. Der Client lädt die PDF deshalb
   * sofort beim Auswählen direkt zu Supabase hoch (`/api/lebenslauf-video-url`, wiederverwendet)
   * und schickt hier nur den Pfad — der bleibt auch nach einem Neuladen gültig. */
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const lebenslaufText = String(body.text ?? "").slice(0, 8000).trim();
  const pdfPath = String(body.pdfPath ?? "").trim();
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!lebenslaufText && !pdfPath) {
    return NextResponse.json({ error: "Kein Lebenslauf erhalten." }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Keine Kennung erhalten." }, { status: 400 });
  }

  const accountId = getAccountId(request);
  const reservation = reserveCredits(accountId, "detect-products");
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, credits: reservation.status }, { status: 402 });
  }

  const promptText = [
    "Du liest einen Lebenslauf für ein Quereinsteiger-Karriereportal.",
    "Fasse die wichtigsten Fähigkeiten und Erfahrungen in 3–5 KURZEN Stichpunkten zusammen (je unter 8 Wörtern, Deutsch).",
    "Schlage 2–4 passende Berufskategorien vor, für die diese Person sich bewerben könnte — auch Quereinstiege, nicht nur der bisherige Titel.",
    "Schreibe außerdem einen SPRECHTEXT von 80–120 Wörtern, den diese Person vor einer Kamera über sich selbst sagen kann — erste Person, natürlich gesprochen (keine Aufzählung), beginnt mit Name/Rolle, nennt 2–3 Stationen und was sie jetzt sucht. Gleiche Sprache wie der Lebenslauf.",
    "Beschreibe außerdem in ZWEI kurzen englischen Sätzen (für eine Bildgenerierung): 'kleidung' — passende, korrekte Berufskleidung für den erkannten Beruf (z. B. Kochjacke für einen Koch, Uniform für eine Flugbegleiterin, Anzug für Büroberufe) — und 'umgebung' — ein passender Arbeitsort (z. B. eine Küche, eine Flugzeugkabine, ein Büro). Beides ohne Markennamen.",
    // VOLLSTÄNDIG, NICHT KURATIERT (Owner 24.08.2026: „es muss alles rein") — JEDE Station
    // aus dem Lebenslauf, nicht nur die auffälligsten drei; die Seite selbst deckelt nicht.
    "Liste außerdem 'erfahrung' — ALLE beruflichen Stationen aus dem Lebenslauf, chronologisch neueste zuerst, keine ausgelassen: [{\"rolle\":\"Jobtitel\",\"firma\":\"Firmenname, Ort\",\"zeitraum\":\"2022–heute\",\"ergebnis\":\"EIN Satz: Aufgabe oder Ergebnis dieser Station, aus dem Lebenslauf\"}]. Nimm die echten Jahreszahlen aus dem Lebenslauf, keine erfundenen. 'firma' leer lassen, wenn der Lebenslauf keine nennt.",
    "Liste außerdem 'ausbildung' — ALLE Ausbildungsstationen: [{\"titel\":\"Abschluss/Studiengang\",\"ort\":\"Institution, Ort\",\"zeitraum\":\"...\"}]. 'zeitraum' leer lassen, wenn keiner angegeben ist.",
    "Liste außerdem 'sprachen' — ALLE genannten Sprachen mit Niveau: [{\"sprache\":\"...\",\"niveau\":\"...\"}]. Nenne jede Sprache in der HAUPTSPRACHE DES LEBENSLAUFS (z. B. bei einem deutschen Lebenslauf \"Deutsch\", \"Englisch\", nicht \"German\", \"English\", selbst wenn der Kopf des Dokuments sie englisch nennt). Niveau wörtlich wie im Lebenslauf, z. B. \"C2\", \"Muttersprache\", \"verhandlungssicher\".",
    "Liste außerdem 'kompetenzen' — 4–6 EINZELWÖRTER oder kurze Begriffe für Fähigkeiten-Icons (z. B. \"Leadership\", \"E-Commerce\", \"Marketing\", \"Verhandlung\").",
    // GEGEN DIE REDUNDANZ (Owner 24.08.2026): Die Kopf-Chips waren vorher nur eine
    // Wiederholung von 'kategorien'/'kompetenzen' — diese Liste muss ihren EIGENEN Inhalt haben.
    "Liste außerdem 'schwerpunkte' — 3–4 kurze ARBEITSFELDER (je 1–3 Wörter, z. B. \"UX-Strategie & Research\", \"KI-Produktentwicklung\") — KEINE Jobtitel, und NICHT dieselben Wörter wie 'kompetenzen'.",
    "Wenn im Lebenslauf ein Ort/Stadt und eine Telefonnummer stehen, gib sie als 'ort' und 'telefon' zurück, sonst leere Strings.",
    "Antworte NUR als JSON: {\"stichpunkte\":[\"...\"],\"kategorien\":[\"...\"],\"sprechtext\":\"...\",\"kleidung\":\"...\",\"umgebung\":\"...\",\"erfahrung\":[{\"rolle\":\"...\",\"firma\":\"...\",\"zeitraum\":\"...\",\"ergebnis\":\"...\"}],\"ausbildung\":[{\"titel\":\"...\",\"ort\":\"...\",\"zeitraum\":\"...\"}],\"sprachen\":[{\"sprache\":\"...\",\"niveau\":\"...\"}],\"kompetenzen\":[\"...\"],\"schwerpunkte\":[\"...\"],\"ort\":\"...\",\"telefon\":\"...\"}.",
  ].join(" ");

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: promptText }];
  if (lebenslaufText) {
    content.push({ type: "input_text", text: `Lebenslauf-Text:\n${lebenslaufText}` });
  }
  if (pdfPath) {
    const pdfUrl = await getSignedUrl(pdfPath).catch(() => "");
    if (!pdfUrl) return NextResponse.json({ error: "Lebenslauf-Datei nicht gefunden." }, { status: 404 });
    const bytes = Buffer.from(await fetch(pdfUrl).then(r => r.arrayBuffer()));
    content.push({
      type: "input_file",
      filename: "lebenslauf.pdf",
      file_data: `data:application/pdf;base64,${bytes.toString("base64")}`,
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content }],
    }),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? `Die Auswertung hat nicht geklappt. Status ${response.status}.` },
      { status: response.status }
    );
  }

  const text =
    payload?.output_text ??
    payload?.output?.flatMap((item: any) => item?.content ?? [])
      ?.map((c: any) => c?.text ?? "")
      ?.join("\n") ??
    "";

  const parsed = extractJson(text);
  const stichpunkte = (parsed.stichpunkte ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 5);
  const kategorien = (parsed.kategorien ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4);
  const sprechtext = String(parsed.sprechtext ?? "").trim().slice(0, 1200);
  const kleidung = String(parsed.kleidung ?? "").trim().slice(0, 300);
  const umgebung = String(parsed.umgebung ?? "").trim().slice(0, 300);
  /* KEINE KÜNSTLICHE DECKELUNG (Owner 24.08.2026: „es muss alles rein") — nur ein grosszügiger
     Anti-Missbrauch-Deckel (20), kein Kürzen auf eine „Highlight"-Auswahl. Firma/Ergebnis
     dürfen leer bleiben (nicht jede Station hat beides), Rolle ist die einzige Pflicht. */
  const erfahrung = (parsed.erfahrung ?? [])
    .map((e) => ({
      rolle: String(e?.rolle ?? "").trim(),
      firma: String(e?.firma ?? "").trim().slice(0, 120) || undefined,
      zeitraum: String(e?.zeitraum ?? "").trim(),
      ergebnis: String(e?.ergebnis ?? "").trim().slice(0, 220) || undefined,
    }))
    .filter((e) => e.rolle).slice(0, 20);
  const ausbildung = (parsed.ausbildung ?? [])
    .map((a) => ({
      titel: String(a?.titel ?? "").trim(),
      ort: String(a?.ort ?? "").trim().slice(0, 120) || undefined,
      zeitraum: String(a?.zeitraum ?? "").trim().slice(0, 40) || undefined,
    }))
    .filter((a) => a.titel).slice(0, 10);
  /* SPRACHNAMEN VERLÄSSLICH DEUTSCH (nicht der KI überlassen — gemessen 24.08.2026: bei
     Deutsch/Englisch befolgte sie die Anweisung, bei Rumänisch/Ungarisch nicht). Deckt die
     Sprachen ab, die im deutschen Sprachraum am häufigsten in Lebensläufen stehen; jede
     andere bleibt, wie die KI sie genannt hat. */
  const SPRACHNAME_DE: Record<string, string> = {
    german: "Deutsch", english: "Englisch", romanian: "Rumänisch", hungarian: "Ungarisch",
    french: "Französisch", spanish: "Spanisch", italian: "Italienisch", portuguese: "Portugiesisch",
    dutch: "Niederländisch", polish: "Polnisch", russian: "Russisch", turkish: "Türkisch",
    arabic: "Arabisch", chinese: "Chinesisch", mandarin: "Mandarin", japanese: "Japanisch",
  };
  const sprachen = (parsed.sprachen ?? [])
    .map((s) => {
      const roh = String(s?.sprache ?? "").trim().slice(0, 40);
      return {
        sprache: SPRACHNAME_DE[roh.toLowerCase()] ?? roh,
        niveau: String(s?.niveau ?? "").trim().slice(0, 40) || undefined,
      };
    })
    .filter((s) => s.sprache).slice(0, 10);
  /* „Wann kannst du anfangen?" aus dem Trichter — nur die drei bekannten Kennungen, die
     Seite übersetzt sie später selbst (executiveAusProfil). */
  const verfuegbarkeit = ["sofort", "1monat", "flexibel"].includes(String(body.verfuegbarkeit ?? ""))
    ? String(body.verfuegbarkeit) : undefined;
  const kompetenzen = (parsed.kompetenzen ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 6);
  const schwerpunkte = (parsed.schwerpunkte ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4);
  const ort = String(parsed.ort ?? "").trim().slice(0, 80);
  const telefon = String(parsed.telefon ?? "").trim().slice(0, 40);

  // NOCH KEIN VIDEO — das Profil ist ein Entwurf, bis der HeyGen-Lauf fertig ist
  // (`/api/lebenslauf-video` + `/api/lebenslauf-fertigstellen`). `bezahlt: true`, weil diese
  // Route erst nach der Kasse läuft; die Ergebnisseite prüft trotzdem auf ein Video.
  /* SEIT 25.08.2026 AUCH VOR DER KASSE (Stufe-0-Trichter: „Passt diese Jobanzeige zu mir?"
     — Anzeige + Lebenslauf rein, Match sehen, DANN kaufen): `vorab: true` legt den Entwurf
     UNBEZAHLT an; den bezahlt-Stempel setzt erst /api/lebenslauf-fertigstellen, wenn der
     Kiss-Log-Auftrag wirklich bezahlt ist. Ohne `vorab` bleibt alles wie bisher. */
  /* MIT BESTAND MERGEN statt neu bauen (24.08.2026, beim zweiten Lauf auf dasselbe Profil
     gefunden): Diese Route baute das Profil from scratch — ein erneuter Auswertungs-Lauf
     (Retry nach Netzfehler, Nach-Auswertung) warf damit `videoUrl`/`fotoUrl`/`aufnahmePath`
     eines FERTIGEN Profils weg. Der Spread hält alles, was diese Auswertung nicht liefert. */
  const bestand = await leseLebenslauf(id);
  const ok = await schreibeLebenslauf({
    ...(bestand ?? {}),
    id,
    erstelltAm: bestand?.erstelltAm ?? new Date().toISOString(),
    name: name || bestand?.name || undefined,
    email: email || bestand?.email || undefined,
    stichpunkte,
    kategorien,
    sprechtext,
    erfahrung,
    ausbildung,
    sprachen,
    kompetenzen,
    schwerpunkte,
    ort: ort || undefined,
    telefon: telefon || undefined,
    verfuegbarkeit: verfuegbarkeit ?? bestand?.verfuegbarkeit,
    bezahlt: body.vorab === true ? bestand?.bezahlt === true : true,
  });

  if (!ok) {
    return NextResponse.json({ error: "Profil konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ id, stichpunkte, kategorien, sprechtext, kleidung, umgebung, erfahrung, ausbildung, sprachen, kompetenzen, schwerpunkte, ort, telefon, credits: completeReservation(accountId, reservation.reservationId) });
}
