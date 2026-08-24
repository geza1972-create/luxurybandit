import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf, type LebenslaufProfil } from "@/lib/lebenslauf-store";
import { readKissLog } from "@/lib/try-this-look-store";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * DAS KORREKTUR-FELD DES BEWERBERS (Owner 24.08.2026: „Der User braucht hier einen
 * Promptfeld und die Daten zu korrigieren. Zum Beispiel, ich will hier Nutrycoach nicht
 * erwähnen, stattdessen will ich lieber was anderes schreiben.").
 *
 * Der Besitzer schreibt eine ANWEISUNG in ganzen Sätzen; die KI wendet sie auf die
 * BESTEHENDEN Profildaten an — nicht auf den Lebenslauf von damals. Das ist Absicht: Eine
 * Korrektur, die vom Roh-CV neu auswertet, würde genau das wieder hineinholen, was der
 * Bewerber gerade entfernt hat.
 *
 * WER DARF: nur der Besitzer — angemeldetes Konto mit der Profil-Adresse, das Gerät, das
 * den Auftrag angelegt hat (Kiss-Log `device`, wie `istBesitzer` in /api/kiss-log), oder
 * der Admin. Die Profilseite selbst ist teilbar (Firmen!) — das Feld erscheint dort nur,
 * wenn dieser GET hier Besitz bestätigt; ein Fremder mit dem Link sieht und kann nichts.
 *
 * GET  ?id=…&device=…   → { darf }            (fürs Ein-/Ausblenden des Felds)
 * POST { id, anweisung, device? } → { ok }    (korrigiert und speichert)
 */

async function darfKorrigieren(profil: LebenslaufProfil, device: string, request: Request): Promise<boolean> {
  if (await isAdminRequest(request).catch(() => false)) return true;
  const konto = await getSellerFromRequest(request).catch(() => null);
  const kontoMail = String(konto?.email ?? "").trim().toLowerCase();
  if (kontoMail && kontoMail === String(profil.email ?? "").trim().toLowerCase()) return true;
  if (device) {
    try {
      const eintrag = (await readKissLog()).find(e => e.id === profil.id);
      if (eintrag?.device && eintrag.device === device) return true;
    } catch { /* ohne Log entscheidet der Rest */ }
  }
  return false;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  const device = String(url.searchParams.get("device") ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ darf: false });
  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ darf: false });
  return NextResponse.json({ darf: await darfKorrigieren(profil, device, request) },
    { headers: { "Cache-Control": "no-store" } });
}

type Korrektur = {
  sprechtext?: string; stichpunkte?: string[]; kategorien?: string[];
  erfahrung?: { rolle?: string; zeitraum?: string }[];
  kompetenzen?: string[]; schwerpunkte?: string[];
  passung?: { rolle?: string; gruende?: string[] }[];
  ort?: string; telefon?: string;
};

function extractJson(text: string): Korrektur | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as Korrektur; } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 500 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  const anweisung = String(body.anweisung ?? "").replace(/\s+/g, " ").trim().slice(0, 600);
  if (!id || !anweisung) return NextResponse.json({ error: "Kennung oder Anweisung fehlt." }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ error: "Profil nicht gefunden." }, { status: 404 });
  if (!(await darfKorrigieren(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  /* Nur die Inhalts-Felder gehen an die KI — nie videoUrl/fotoUrl/bezahlt. */
  const daten = {
    sprechtext: profil.sprechtext ?? "",
    stichpunkte: profil.stichpunkte ?? [],
    kategorien: profil.kategorien ?? [],
    erfahrung: profil.erfahrung ?? [],
    kompetenzen: profil.kompetenzen ?? [],
    schwerpunkte: profil.schwerpunkte ?? [],
    passung: profil.passung ?? [],
    ort: profil.ort ?? "",
    telefon: profil.telefon ?? "",
  };

  const prompt = [
    "Du pflegst das Profil eines Bewerbers auf einem Karriereportal. Hier die aktuellen Profildaten als JSON:",
    JSON.stringify(daten),
    `Der Bewerber wünscht diese Korrektur: »${anweisung}«`,
    "Wende NUR diese Korrektur an. Ändere ausschliesslich, was die Anweisung verlangt — aber überall, wo es vorkommt (sprechtext, stichpunkte, erfahrung, kompetenzen, schwerpunkte, kategorien, passung). Soll etwas nicht mehr erwähnt werden, entferne es in JEDEM Feld.",
    "Erfinde nichts, was die Anweisung nicht nennt. Behalte Sprache, Ton und Ich-Form der bestehenden Texte.",
    "Halte die Feldgrenzen: stichpunkte 3–5 kurz, kompetenzen 4–6 Begriffe, schwerpunkte 3–4 Arbeitsfelder, erfahrung höchstens 3 Stationen mit echten Zeiträumen, passung je Rolle 3–4 belegte Gründe (je Rolle unterschiedlich).",
    "Antworte NUR als JSON mit exakt den Feldern der Eingabe: {\"sprechtext\":\"…\",\"stichpunkte\":[…],\"kategorien\":[…],\"erfahrung\":[{\"rolle\":\"…\",\"zeitraum\":\"…\"}],\"kompetenzen\":[…],\"schwerpunkte\":[…],\"passung\":[{\"rolle\":\"…\",\"gruende\":[…]}],\"ort\":\"…\",\"telefon\":\"…\"}",
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
    return NextResponse.json({ error: r?.error?.message ?? "Korrektur fehlgeschlagen — bitte noch einmal." }, { status: 502 });
  }

  /* Dieselben Grenzen wie die Auswertung — der Browser bestimmt die Form nie. Ein Feld,
     das die KI leer zurückgibt, fällt auf den Bestand zurück statt das Profil zu leeren. */
  const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const liste = (v: unknown, max: number, laenge = 120) =>
    (Array.isArray(v) ? v : []).map(x => s(x, laenge)).filter(Boolean).slice(0, max);
  const neu: Partial<LebenslaufProfil> = {
    sprechtext: s(parsed.sprechtext, 1200) || profil.sprechtext,
    stichpunkte: liste(parsed.stichpunkte, 5).length ? liste(parsed.stichpunkte, 5) : profil.stichpunkte,
    kategorien: liste(parsed.kategorien, 4, 80).length ? liste(parsed.kategorien, 4, 80) : profil.kategorien,
    erfahrung: (Array.isArray(parsed.erfahrung) ? parsed.erfahrung : [])
      .map(e => ({ rolle: s(e?.rolle, 120), zeitraum: s(e?.zeitraum, 40) }))
      .filter(e => e.rolle).slice(0, 3),
    kompetenzen: liste(parsed.kompetenzen, 6, 40),
    schwerpunkte: liste(parsed.schwerpunkte, 4, 60),
    passung: (Array.isArray(parsed.passung) ? parsed.passung : [])
      .map(p => ({ rolle: s(p?.rolle, 80), gruende: liste(p?.gruende, 4, 80) }))
      .filter(p => p.rolle && p.gruende.length > 0).slice(0, 4),
    ort: s(parsed.ort, 80) || undefined,
    telefon: s(parsed.telefon, 40) || undefined,
  };
  if (!neu.erfahrung?.length) neu.erfahrung = profil.erfahrung;
  if (!neu.kompetenzen?.length) neu.kompetenzen = profil.kompetenzen;

  const ok = await schreibeLebenslauf({ ...profil, ...neu });
  if (!ok) return NextResponse.json({ error: "Profil konnte nicht gespeichert werden." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
