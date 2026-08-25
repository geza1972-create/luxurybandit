import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf, type LebenslaufProfil } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  const device = String(url.searchParams.get("device") ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ darf: false });
  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ darf: false });
  return NextResponse.json({ darf: await darfAmProfilArbeiten(profil, device, request) },
    { headers: { "Cache-Control": "no-store" } });
}

type Korrektur = {
  sprechtext?: string; stichpunkte?: string[]; kategorien?: string[];
  erfahrung?: { rolle?: string; firma?: string; zeitraum?: string; ergebnis?: string }[];
  ausbildung?: { titel?: string; ort?: string; zeitraum?: string }[];
  sprachen?: { sprache?: string; niveau?: string }[];
  kompetenzen?: string[]; schwerpunkte?: string[];
  ort?: string; telefon?: string;
  anschreiben?: string; positionierung?: string;
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
  if (!(await darfAmProfilArbeiten(profil, device, request))) {
    return NextResponse.json({ error: "Not yours." }, { status: 403 });
  }

  /* Nur die Inhalts-Felder gehen an die KI — nie videoUrl/fotoUrl/bezahlt. Seit 24.08.2026
     (Owner: „es muss alles rein") auch Ausbildung/Sprachen und Firma/Ergebnis je Station —
     ohne sie in `daten` könnte die KI eine Anweisung wie „erwähne Firma X nicht" dort nicht
     anwenden, UND eine Korrektur, die diese Felder nicht zurückgibt, hätte sie sonst
     stillschweigend gelöscht (siehe `neu` unten: leer → Bestand bleibt). */
  const daten = {
    sprechtext: profil.sprechtext ?? "",
    stichpunkte: profil.stichpunkte ?? [],
    kategorien: profil.kategorien ?? [],
    erfahrung: profil.erfahrung ?? [],
    ausbildung: profil.ausbildung ?? [],
    sprachen: profil.sprachen ?? [],
    kompetenzen: profil.kompetenzen ?? [],
    schwerpunkte: profil.schwerpunkte ?? [],
    ort: profil.ort ?? "",
    telefon: profil.telefon ?? "",
    /* MULTI-BEWERBUNG (25.08.2026): Auf einer Bewerbungs-Version gehören Anschreiben und
       zugeschnittene Positionierung zu den korrigierbaren Inhalten („schreib den zweiten
       Absatz selbstbewusster"). Am Hauptprofil sind beide leer und bleiben es. */
    anschreiben: profil.anschreiben ?? "",
    positionierung: profil.positionierung ?? "",
  };

  const prompt = [
    "Du pflegst das Profil eines Bewerbers auf einem Karriereportal. Hier die aktuellen Profildaten als JSON:",
    JSON.stringify(daten),
    `Der Bewerber wünscht diese Korrektur: »${anweisung}«`,
    "Wende NUR diese Korrektur an. Ändere ausschliesslich, was die Anweisung verlangt — aber überall, wo es vorkommt (sprechtext, stichpunkte, erfahrung, ausbildung, sprachen, kompetenzen, schwerpunkte, kategorien, anschreiben, positionierung). Soll etwas nicht mehr erwähnt werden, entferne es in JEDEM Feld, in dem es vorkommt.",
    "Gib JEDES Feld aus der Eingabe vollständig zurück, auch wenn die Anweisung es nicht betrifft — unveränderte Felder unverändert kopieren, nie weglassen oder leeren.",
    "Erfinde nichts, was die Anweisung nicht nennt. Behalte Sprache, Ton und Ich-Form der bestehenden Texte.",
    "Halte die Feldgrenzen: stichpunkte 3–5 kurz, kompetenzen 4–6 Begriffe, schwerpunkte 3–4 Arbeitsfelder. Bei 'erfahrung' und 'ausbildung' KEINE Obergrenze — gib ALLE Stationen zurück, die die Eingabe enthielt (abzüglich dessen, was die Anweisung entfernen soll).",
    "Antworte NUR als JSON mit exakt den Feldern der Eingabe: {\"sprechtext\":\"…\",\"stichpunkte\":[…],\"kategorien\":[…],\"erfahrung\":[{\"rolle\":\"…\",\"firma\":\"…\",\"zeitraum\":\"…\",\"ergebnis\":\"…\"}],\"ausbildung\":[{\"titel\":\"…\",\"ort\":\"…\",\"zeitraum\":\"…\"}],\"sprachen\":[{\"sprache\":\"…\",\"niveau\":\"…\"}],\"kompetenzen\":[…],\"schwerpunkte\":[…],\"ort\":\"…\",\"telefon\":\"…\",\"anschreiben\":\"…\",\"positionierung\":\"…\"}",
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
  /* KEIN 3ER-DECKEL MEHR (Owner 24.08.2026: „es muss alles rein") — derselbe grosszügige
     Anti-Missbrauch-Deckel wie in /api/lebenslauf-auswertung, kein Kürzen auf „Highlights". */
  const neu: Partial<LebenslaufProfil> = {
    sprechtext: s(parsed.sprechtext, 1200) || profil.sprechtext,
    stichpunkte: liste(parsed.stichpunkte, 5).length ? liste(parsed.stichpunkte, 5) : profil.stichpunkte,
    kategorien: liste(parsed.kategorien, 4, 80).length ? liste(parsed.kategorien, 4, 80) : profil.kategorien,
    erfahrung: (Array.isArray(parsed.erfahrung) ? parsed.erfahrung : [])
      .map(e => ({ rolle: s(e?.rolle, 120), firma: s(e?.firma, 120) || undefined, zeitraum: s(e?.zeitraum, 40), ergebnis: s(e?.ergebnis, 220) || undefined }))
      .filter(e => e.rolle).slice(0, 20),
    ausbildung: (Array.isArray(parsed.ausbildung) ? parsed.ausbildung : [])
      .map(a => ({ titel: s(a?.titel, 120), ort: s(a?.ort, 120) || undefined, zeitraum: s(a?.zeitraum, 40) || undefined }))
      .filter(a => a.titel).slice(0, 10),
    sprachen: (Array.isArray(parsed.sprachen) ? parsed.sprachen : [])
      .map(sp => ({ sprache: s(sp?.sprache, 40), niveau: s(sp?.niveau, 40) || undefined }))
      .filter(sp => sp.sprache).slice(0, 10),
    kompetenzen: liste(parsed.kompetenzen, 6, 40),
    schwerpunkte: liste(parsed.schwerpunkte, 4, 60),
    ort: s(parsed.ort, 80) || undefined,
    telefon: s(parsed.telefon, 40) || undefined,
  };
  /* Ein Feld, das die KI leer zurückgibt (vergessen, oder die Anweisung betraf es nicht),
     fällt auf den Bestand zurück — eine Korrektur darf nur LÖSCHEN, was die Anweisung
     wirklich meint, nie stillschweigend, weil die Antwort ein Feld ausliess. */
  if (!neu.erfahrung?.length) neu.erfahrung = profil.erfahrung;
  if (!neu.ausbildung?.length) neu.ausbildung = profil.ausbildung;
  if (!neu.sprachen?.length) neu.sprachen = profil.sprachen;
  if (!neu.kompetenzen?.length) neu.kompetenzen = profil.kompetenzen;

  const ok = await schreibeLebenslauf({ ...profil, ...neu });
  if (!ok) return NextResponse.json({ error: "Profil konnte nicht gespeichert werden." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
