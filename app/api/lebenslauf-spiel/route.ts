import { NextResponse } from "next/server";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { anzeigenTextBeschaffen } from "@/lib/lebenslauf-anzeige";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DER SPIELPLATZ-MOTOR (Owner 25.08.2026, KONZEPT „Der Spielplatz" + „Ein Gespräch, zwei
 * Türen"): Der Bewerberberater auf /lebenslauf/executive pflegt Daten EIN (1:1, keine
 * Verbesserung — Owner: „Wir ändern seine Daten nicht, wir pflegen ein, was da ist") und
 * rechnet den Anzeigen-Match — beides gegen DATEN AUS DEM BROWSER, nie gegen ein
 * gespeichertes Profil. Es entsteht KEIN Profil, nichts wird für den Spieler abgelegt
 * (er hat nichts bezahlt).
 *
 * ABER: „muss ich als Admin sehen, wer alles was probiert hat" — jeder Zug landet in
 * EINER Ablage je Gerät (lebenslauf-spiel/<device>.json). Diese Ablage ist ZUGLEICH der
 * 5er-Deckel (Owner: „Spielen kann er 5 mal von mir aus") — Zählen und Sehen sind ein
 * Speicher, das kann nicht auseinanderlaufen. Datenschutz-Linie: vom eingefügten
 * Lebenslauf nur die ERSTEN ZEILEN als Kostprobe, nie das ganze Dokument; Fotos kommen
 * hier gar nicht erst an (bleiben im Browser).
 *
 * E-MAIL IST PFLICHT (Owner: „ich will Leads auf jeden Fall") — ohne gültige Adresse
 * nimmt der Motor keinen Zug an; das Tor sitzt im Server, nicht nur im Chat.
 *
 * POST { device, email, lang, art: "einpflegen" | "match", text, daten?, anzeige? }
 *   → einpflegen: text = eingefügter Lebenslauf → { daten } (Executive-Form, wortnah)
 *   → match: daten (vom Browser) + anzeige (Text/Link) → { prozent, jobtitel, gruende,
 *     luecken, befunde } — befunde = 2–3 ehrliche Punkte AM LEBENSLAUF SELBST (Owner:
 *     „Die Schnellanalyse bezieht sich auf alles, auch PDF-Text aus dem Lebenslauf").
 *   Antwort trägt immer { zuegeUebrig }.
 * GET → Admin-Liste aller Spielstände (PIN), neueste zuerst.
 */

type Zug = { art: string; ts: string; probe: string };
type Spielstand = { device: string; email: string; lang: string; zuege: Zug[] };

const ZUEGE_MAX = 5;
const pfad = (device: string) => `lebenslauf-spiel/${device}.json`;

async function leseSpielstand(device: string): Promise<Spielstand | null> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(device))}`);
  if (!res.ok) return null;
  try { return (await res.json()) as Spielstand; } catch { return null; }
}

async function schreibeSpielstand(stand: Spielstand): Promise<void> {
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(stand.device))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(stand),
  }).catch(() => { /* ein verlorener Spielstand bricht dem Spieler nichts ab */ });
}

const SPRACHNAME: Record<string, string> = { de: "German", en: "English", ro: "Romanian", es: "Spanish", fr: "French", pt: "Portuguese", it: "Italian" };

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>; } catch { return null; }
}

async function ki(prompt: string): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
  }).then(res => res.json()).catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> } | null;
  const text = r?.output_text ?? r?.output?.flatMap(o => o?.content ?? [])?.map(c => c?.text ?? "")?.join("") ?? "";
  return text ? extractJson(text) : null;
}

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const liste = (v: unknown, max: number, len: number) =>
  (Array.isArray(v) ? v : []).map(x => s(x, len)).filter(Boolean).slice(0, max);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const device = s(body.device, 80);
  const email = s(body.email, 200).toLowerCase();
  const lang = s(body.lang, 2) || "en";
  const art = s(body.art, 20);
  if (!device || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !["einpflegen", "match"].includes(art)) {
    return NextResponse.json({ error: "Angaben fehlen." }, { status: 400 });
  }

  const stand: Spielstand = (await leseSpielstand(device)) ?? { device, email, lang, zuege: [] };
  stand.email = email; stand.lang = lang;
  const uebrig = ZUEGE_MAX - stand.zuege.length;
  if (uebrig <= 0) {
    return NextResponse.json({ error: "zuege", zuegeUebrig: 0 }, { status: 402 });
  }

  const zielSprache = SPRACHNAME[lang] ?? "English";

  if (art === "einpflegen") {
    const text = s(body.text, 8000);
    if (text.length < 60) return NextResponse.json({ error: "Zu wenig Text — füg deinen Lebenslauf ein.", zuegeUebrig: uebrig }, { status: 422 });
    const prompt = [
      "Du überträgst einen eingefügten Lebenslauf 1:1 in eine feste Form. WICHTIG: Du VERBESSERST NICHTS — keine Beschönigung, keine Umformulierung ins Werbliche, nichts erfinden. Was nicht dasteht, bleibt leer.",
      `Lebenslauf-Text:\n${text}`,
      "Felder: 'name' (wie angegeben, sonst leer) · 'rolle' (die aktuelle/letzte Berufsbezeichnung, wörtlich) · 'ort' · 'sprachenKurz' (z. B. \"Deutsch C2 · Englisch B2\", nur was dasteht) · 'schwerpunkte' (bis 4 Begriffe AUS dem Text) · 'profil' (3–5 Sätze, eng am Wortlaut des Textes, erste Person, KEINE Aufwertung) · 'expertise' (bis 8 Begriffe aus dem Text) · 'erfahrung' (bis 12: {rolle, firma, zeitraum, ergebnis} — ergebnis nur, wenn eines dasteht, sonst leer) · 'ausbildung' (bis 6: {titel, ort, zeitraum}) · 'sprachen' (bis 6: {sprache, niveau}).",
      `Alle Feld-INHALTE bleiben in der Sprache des eingefügten Textes. Antworte NUR als JSON mit genau diesen Feldern.`,
    ].join("\n\n");
    const parsed = await ki(prompt);
    if (!parsed) return NextResponse.json({ error: "Das hat nicht geklappt — bitte noch einmal.", zuegeUebrig: uebrig }, { status: 502 });

    const daten = {
      name: s(parsed.name, 80),
      rolle: s(parsed.rolle, 120),
      ort: s(parsed.ort, 120),
      sprachenKurz: s(parsed.sprachenKurz, 160),
      schwerpunkte: liste(parsed.schwerpunkte, 4, 60),
      /* Die KI liefert die Saetze gern als LISTE — String() klebte sie mit Kommas
         zusammen ("Berlin.,Seit 2019"). Erst zusammenfuegen, dann kappen. */
      profil: s(Array.isArray(parsed.profil) ? parsed.profil.map(x => String(x).trim()).join(" ") : parsed.profil, 900),
      expertise: liste(parsed.expertise, 8, 60),
      erfahrung: (Array.isArray(parsed.erfahrung) ? parsed.erfahrung : []).map((e: any) => ({
        rolle: s(e?.rolle, 120), firma: s(e?.firma, 120), zeitraum: s(e?.zeitraum, 60), ergebnis: s(e?.ergebnis, 220),
      })).filter(e => e.rolle).slice(0, 12),
      ausbildung: (Array.isArray(parsed.ausbildung) ? parsed.ausbildung : []).map((a: any) => ({
        titel: s(a?.titel, 160), ort: s(a?.ort, 120), zeitraum: s(a?.zeitraum, 60),
      })).filter(a => a.titel).slice(0, 6),
      sprachen: (Array.isArray(parsed.sprachen) ? parsed.sprachen : []).map((l: any) => ({
        sprache: s(l?.sprache, 60), niveau: s(l?.niveau, 40),
      })).filter(l => l.sprache).slice(0, 6),
    };

    stand.zuege.push({ art, ts: new Date().toISOString(), probe: text.slice(0, 200) });
    await schreibeSpielstand(stand);
    return NextResponse.json({ daten, zuegeUebrig: ZUEGE_MAX - stand.zuege.length });
  }

  /* ── art === "match" ── */
  const eingabe = s(body.anzeige, 4000);
  if (!eingabe) return NextResponse.json({ error: "Anzeige fehlt.", zuegeUebrig: uebrig }, { status: 400 });
  const daten = body.daten && typeof body.daten === "object" ? body.daten : null;
  if (!daten) return NextResponse.json({ error: "Erst den Lebenslauf einpflegen.", zuegeUebrig: uebrig }, { status: 400 });

  const anzeige = await anzeigenTextBeschaffen(eingabe);
  if (!anzeige.text) return NextResponse.json({ error: anzeige.fehler ?? "Keine Anzeige erkannt.", zuegeUebrig: uebrig }, { status: 422 });

  const prompt = [
    "Du bist ein nüchterner Recruiting-Analyst. Vergleiche ein Bewerberprofil (JSON) mit einer echten Stellenanzeige (Text) und sag ehrlich, wie gut es passt.",
    `Profil: ${JSON.stringify(daten).slice(0, 6000)}`,
    `Stellenanzeige:\n${anzeige.text}`,
    "Berechne 'prozent' NUR aus echter Überschneidung — geforderte Erfahrung, Fähigkeiten, Ausbildung, Sprachen, Seniorität. Sei streng: 90+ nur bei sehr naher Übereinstimmung, unter 40 wenn Zentrales fehlt. Erfinde nichts.",
    "'jobtitel' — wörtlich aus der Anzeige, sonst leer.",
    "'gruende' — 3–5 KONKRETE Übereinstimmungen, je ein kurzer Satz (Profil-Beleg an Anforderung gebunden).",
    "'luecken' — 0–4 Anforderungen, die das Profil NICHT belegt.",
    "'befunde' — 2–3 ehrliche Schwächen AM LEBENSLAUF SELBST (unabhängig von der Anzeige): fehlende Ergebnisse/Zahlen, unklare Rollen, Lücken, Länge. Kurz und konkret, nichts Erfundenes.",
    "'anschreibenKurz' — ein KURZES Anschreiben (3–4 Sätze, erste Person, ohne Anrede-Floskeln am Ende), auf GENAU diese Anzeige zugeschnitten und NUR aus dem gestützt, was das Profil belegt. Es ist die Kostprobe (Owner: die Mappe beginnt oben mit einem kurzen Anschreiben) — das volle Anschreiben ist Teil des Kaufs.",
    `Schreibe 'gruende', 'luecken', 'befunde' und 'anschreibenKurz' auf ${zielSprache}. Antworte NUR als JSON: {"prozent":0,"jobtitel":"...","gruende":[],"luecken":[],"befunde":[],"anschreibenKurz":"..."}`,
  ].join("\n\n");
  const parsed = await ki(prompt);
  if (!parsed) return NextResponse.json({ error: "Abgleich fehlgeschlagen — bitte noch einmal.", zuegeUebrig: uebrig }, { status: 502 });

  stand.zuege.push({ art, ts: new Date().toISOString(), probe: anzeige.text.slice(0, 200) });
  await schreibeSpielstand(stand);
  return NextResponse.json({
    prozent: Math.max(0, Math.min(100, Math.round(Number(parsed.prozent) || 0))),
    jobtitel: s(parsed.jobtitel, 120),
    gruende: liste(parsed.gruende, 5, 200),
    luecken: liste(parsed.luecken, 4, 200),
    befunde: liste(parsed.befunde, 3, 200),
    anschreibenKurz: s(parsed.anschreibenKurz, 700),
    zuegeUebrig: ZUEGE_MAX - stand.zuege.length,
  });
}

/** Die Admin-Liste — „wer alles was probiert hat", neueste zuerst. */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "lebenslauf-spiel/", limit: 200, sortBy: { column: "updated_at", order: "desc" } }),
  });
  const eintraege = res.ok ? ((await res.json().catch(() => [])) as Array<{ name?: string }>) : [];
  const staende = (await Promise.all(
    eintraege
      .map(e => String(e?.name ?? ""))
      .filter(n => n.endsWith(".json"))
      .slice(0, 100)
      .map(n => leseSpielstand(n.replace(/\.json$/, "")))
  )).filter(Boolean) as Spielstand[];
  return NextResponse.json({ staende }, { headers: { "Cache-Control": "no-store" } });
}
