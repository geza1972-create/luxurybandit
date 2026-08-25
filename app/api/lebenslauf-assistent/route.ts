import { NextResponse } from "next/server";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DIE ABSICHTS-WEICHE DES BEWERBUNGS-ASSISTENTEN (Owner 25.08.2026: „am einfachsten ist es
 * immer im Form von chat … Die User müssen schreiben was sie machen wollen. Statt tausend
 * Funktionen auf der Seite aufzulisten." · „Drunter ein Chat mit KI. Dort kann er alles.").
 *
 * Der Chat im Browser entscheidet das MEISTE selbst und kostenlos: Ein Link oder ein langer
 * eingefügter Text IST eine Anzeige (→ Match-Route). Nur KURZE Eingaben ohne Anzeige landen
 * hier — ein einziger kleiner KI-Aufruf sortiert sie in drei Absichten:
 *
 *   bewerben — er will sich bewerben, hat aber noch keine Anzeige eingefügt
 *   aendern  — eine Änderungs-Anweisung („erwähne X nicht") → der Browser ruft die
 *              bestehende Korrektur-Route auf; DIESE Route ändert selbst nie etwas
 *   frage    — alles andere; die Antwort kommt gleich mit (kurz, ehrlich, auf du)
 *
 * Bewusst NUR eine Weiche, kein Gedächtnis: Der Chat-Verlauf lebt im Browser (Werkzeug,
 * kein Gesprächspartner) — jede Eingabe steht für sich, nichts wird gespeichert.
 */

const SPRACHNAME: Record<string, string> = { de: "German", en: "English", ro: "Romanian", es: "Spanish", fr: "French", pt: "Portuguese", it: "Italian" };

type Weiche = { absicht?: string; anweisung?: string; antwort?: string };

function extractJson(text: string): Weiche | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as Weiche; } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
  const zielSprache = SPRACHNAME[String(body.lang ?? "").trim().slice(0, 2)] ?? "English";
  if (!id || !text) return NextResponse.json({ error: "Kennung oder Text fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  const prompt = [
    "Du bist die Absichts-Weiche im Bewerbungs-Assistenten eines Karriereportals. Der BESITZER eines Bewerberprofils hat geschrieben:",
    `»${text}«`,
    "Sortiere in GENAU eine Absicht:",
    "'bewerben' — er will sich auf eine Stelle bewerben oder eine Anzeige prüfen, hat aber KEINE Anzeige (Link/Text) mitgeschickt.",
    "'aendern' — er will etwas an seinem Profil, seiner Bewerbung oder seinem Anschreiben ändern. Gib die Anweisung in 'anweisung' wieder (knapp, in der Sprache der Eingabe, nichts hinzuerfinden).",
    "'frage' — alles andere. Beantworte in 'antwort' kurz (1–3 Sätze), per Du, ehrlich. Was der Assistent kann: Stellenanzeigen prüfen (Match in Prozent), daraus zugeschnittene Bewerbungen mit Anschreiben erstellen, Profil und Bewerbungen per Anweisung ändern. PDFs zum Herunterladen und die Videobewerbung sind in Arbeit und kommen bald. Preise oder Zahlen nennst du NIE.",
    `'antwort' schreibst du auf ${zielSprache}.`,
    "Antworte NUR als JSON: {\"absicht\":\"bewerben|aendern|frage\",\"anweisung\":\"…\",\"antwort\":\"…\"}",
  ].join("\n\n");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } } | null;

  const raus = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  const parsed = raus ? extractJson(raus) : null;
  if (!parsed) {
    return NextResponse.json({ error: r?.error?.message ?? "Bitte noch einmal." }, { status: 502 });
  }
  const absicht = ["bewerben", "aendern", "frage"].includes(String(parsed.absicht)) ? String(parsed.absicht) : "frage";
  return NextResponse.json({
    absicht,
    anweisung: String(parsed.anweisung ?? "").trim().slice(0, 600),
    antwort: String(parsed.antwort ?? "").trim().slice(0, 800),
  });
}
