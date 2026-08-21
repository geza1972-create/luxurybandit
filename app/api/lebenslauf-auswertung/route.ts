import { NextResponse } from "next/server";
import { completeReservation, getAccountId, reserveCredits } from "@/lib/billing";
import { schreibeLebenslauf } from "@/lib/lebenslauf-store";
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

type Auswertung = { stichpunkte?: string[]; kategorien?: string[]; sprechtext?: string; kleidung?: string; umgebung?: string };

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
    "Antworte NUR als JSON: {\"stichpunkte\":[\"...\"],\"kategorien\":[\"...\"],\"sprechtext\":\"...\",\"kleidung\":\"...\",\"umgebung\":\"...\"}.",
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

  // NOCH KEIN VIDEO — das Profil ist ein Entwurf, bis der HeyGen-Lauf fertig ist
  // (`/api/lebenslauf-video` + `/api/lebenslauf-fertigstellen`). `bezahlt: true`, weil diese
  // Route erst nach der Kasse läuft; die Ergebnisseite prüft trotzdem auf ein Video.
  const ok = await schreibeLebenslauf({
    id,
    erstelltAm: new Date().toISOString(),
    name: name || undefined,
    email: email || undefined,
    stichpunkte,
    kategorien,
    sprechtext,
    bezahlt: true,
  });

  if (!ok) {
    return NextResponse.json({ error: "Profil konnte nicht gespeichert werden." }, { status: 500 });
  }

  return NextResponse.json({ id, stichpunkte, kategorien, sprechtext, kleidung, umgebung, credits: completeReservation(accountId, reservation.reservationId) });
}
