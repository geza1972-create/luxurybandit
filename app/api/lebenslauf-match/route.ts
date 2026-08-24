import { NextResponse } from "next/server";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DER ANZEIGEN-ABGLEICH (Owner 24.08.2026, an der Stelle, wo die Vorlage die pauschalen
 * „Starke/Gute Passung"-Kategorien zeigte: „Ich brauche was visuelles. Einen Balken mit
 * Prozente. Noch besser wäre wenn ich den Link einer Anzeige einbaue und sehe direkt den
 * Match.").
 *
 * WARUM DAS DIE URSPRÜNGLICHE „KEINE PROZENTZAHL"-REGEL NICHT BRICHT (siehe
 * `ExecutivePassung.staerke` in lib/lebenslauf-vorlage.ts, Auftrag 22.08.: „Do NOT display
 * arbitrary percentages"): Jene Regel galt für eine Zahl OHNE Grundlage — eine erfundene
 * Genauigkeit auf einer generischen Berufskategorie. Hier ist die Zahl das Ergebnis eines
 * ECHTEN Abgleichs gegen einen KONKRETEN Anzeigentext, den der Bewerber selbst mitbringt —
 * eine Messung mit Bezugspunkt, keine Behauptung ins Leere.
 *
 * NICHT PERSISTIERT: Der Abgleich ist ein Werkzeug für DIESEN Moment (er testet Anzeige um
 * Anzeige), kein Profil-Feld — jeder Aufruf ist eigenständig, nichts überschreibt das Profil.
 *
 * `eingabe` ist ENTWEDER ein Link ODER der eingefügte Text der Anzeige — die Route erkennt
 * selbst, was sie bekommen hat: Ein Link wird zuerst serverseitig abgerufen (viele
 * Jobbörsen blocken Bots, brauchen JavaScript oder ein Login); klappt das nicht, oder war
 * es ohnehin kein Link, zählt die Eingabe selbst als Anzeigentext. So funktioniert das
 * Feld in JEDEM Fall — nie ein Rückweg, der den Bewerber zwingt, selbst zu entscheiden,
 * was er einfügen darf.
 */

function siehtAusWieLink(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

/** Grobe HTML→Text-Extraktion — reicht für eine Stellenanzeige, kein vollständiger Parser. */
function textAusHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function anzeigenTextBeschaffen(eingabe: string): Promise<{ text: string; quelle: "link" | "text"; fehler?: string }> {
  const roh = eingabe.trim();
  if (!siehtAusWieLink(roh)) return { text: roh, quelle: "text" };
  try {
    const r = await fetch(roh, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LuxuryBanditBot/1.0; +https://luxurybandit.com)" },
    });
    if (!r.ok) return { text: "", quelle: "link", fehler: `Anzeige konnte nicht geladen werden (${r.status}). Füge stattdessen den Text der Anzeige ein.` };
    const html = await r.text();
    const text = textAusHtml(html).slice(0, 12000);
    if (text.length < 80) return { text: "", quelle: "link", fehler: "Von dieser Seite kam kein lesbarer Text (oft, weil sie ein Login oder JavaScript braucht). Füge stattdessen den Text der Anzeige ein." };
    return { text, quelle: "link" };
  } catch {
    return { text: "", quelle: "link", fehler: "Die Anzeige liess sich nicht abrufen. Füge stattdessen den Text der Anzeige ein." };
  }
}

function extractJson(text: string): { prozent?: number; jobtitel?: string; gruende?: string[]; luecken?: string[] } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  const eingabe = String(body.eingabe ?? "").trim().slice(0, 4000);
  if (!id || !eingabe) return NextResponse.json({ error: "Kennung oder Anzeige fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  const anzeige = await anzeigenTextBeschaffen(eingabe);
  if (!anzeige.text) return NextResponse.json({ error: anzeige.fehler ?? "Keine Anzeige erkannt." }, { status: 422 });

  const profilDaten = {
    sprechtext: profil.sprechtext ?? "",
    kategorien: profil.kategorien ?? [],
    kompetenzen: profil.kompetenzen ?? [],
    schwerpunkte: profil.schwerpunkte ?? [],
    erfahrung: (profil.erfahrung ?? []).map(e => ({ rolle: e.rolle, firma: e.firma, zeitraum: e.zeitraum, ergebnis: e.ergebnis })),
    ausbildung: profil.ausbildung ?? [],
    sprachen: profil.sprachen ?? [],
  };

  const prompt = [
    "Du bist ein nüchterner Recruiting-Analyst. Vergleiche ein Bewerberprofil (JSON) mit einer echten Stellenanzeige (Text) und sagst ehrlich, wie gut es passt.",
    `Profil: ${JSON.stringify(profilDaten)}`,
    `Stellenanzeige:\n${anzeige.text}`,
    "Berechne 'prozent' NUR aus echter Überschneidung zwischen dem, was das Profil belegt, und dem, was die Anzeige verlangt — geforderte Erfahrung, Fähigkeiten, Ausbildung, Sprachen, Senioritätsstufe. Sei streng: 90+ nur bei sehr naher Übereinstimmung, unter 40 wenn zentrale Anforderungen fehlen. Erfinde keine Übereinstimmung, die nicht wirklich dasteht.",
    "'jobtitel' — der Titel der Stelle, wörtlich aus der Anzeige, oder leer, wenn keiner erkennbar ist.",
    "'gruende' — 3–5 KONKRETE Übereinstimmungen, je ein kurzer Satz, der eine Zeile aus dem Profil an eine Anforderung der Anzeige bindet (z. B. \"5 Jahre React verlangt — 6 Jahre im Profil belegt\"). Nur echte Treffer, nichts Beschönigtes.",
    "'luecken' — 0–4 Anforderungen der Anzeige, die das Profil NICHT belegt. Leeres Array, wenn wirklich nichts fehlt.",
    "Antworte NUR als JSON: {\"prozent\":0,\"jobtitel\":\"...\",\"gruende\":[\"...\"],\"luecken\":[\"...\"]}",
  ].join("\n\n");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } } | null;

  const text = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  const parsed = text ? extractJson(text) : null;
  if (!parsed) {
    return NextResponse.json({ error: r?.error?.message ?? "Abgleich fehlgeschlagen — bitte noch einmal." }, { status: 502 });
  }

  const prozent = Math.max(0, Math.min(100, Math.round(Number(parsed.prozent) || 0)));
  const jobtitel = String(parsed.jobtitel ?? "").trim().slice(0, 120);
  const gruende = (parsed.gruende ?? []).map(g => String(g).trim()).filter(Boolean).slice(0, 5);
  const luecken = (parsed.luecken ?? []).map(g => String(g).trim()).filter(Boolean).slice(0, 4);

  return NextResponse.json({ prozent, jobtitel, gruende, luecken, quelle: anzeige.quelle });
}
