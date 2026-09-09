import { NextResponse } from "next/server";

/**
 * SPRACHE STATT TIPPEN (Owner 09.09.2026: „da machst du jetzt genauso wie WA auch Sprache
 * jetzt" · vorher: „irgendwann wird es per Sprache gesteuert").
 *
 * Der Browser nimmt auf, diese Route schreibt mit. Mehr passiert hier nicht — kein Gespräch,
 * keine Werkzeuge, kein Denken. Das Ergebnis geht als Text ins Feld, und von dort in den
 * Agenten wie jede getippte Nachricht.
 *
 * ── WARUM AUF DEM SERVER UND NICHT IM BROWSER ──────────────────────────────────────────────
 *
 * Chrome und Safari können Spracherkennung selbst (`webkitSpeechRecognition`) und es kostet
 * nichts. Firefox kann es nicht, und die Qualität schwankt mit dem Gerät. Für ein Werkzeug,
 * bei dem ein falsch verstandener Satz einen bezahlten Modellaufruf auslöst, ist das die
 * falsche Sparsamkeit: Eine Transkription kostet Bruchteile eines Cents, ein missverstandener
 * Auftrag kostet den ganzen Zug.
 *
 * ── DIE AUFNAHME WIRD NICHT GESPEICHERT ────────────────────────────────────────────────────
 *
 * Sie kommt an, wird weitergereicht, und ist danach weg. Es gibt keinen Ordner mit
 * Sprachaufnahmen von Menschen, die ihr Geschäft beschreiben — und damit auch nichts, was
 * jemand später löschen müsste.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 25 MB ist die Grenze der Schnittstelle; wir bleiben weit darunter — das sind Minuten. */
const MAX = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "Spracherkennung ist gerade nicht erreichbar." }, { status: 503 });

  let datei: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("ton");
    if (f instanceof File) datei = f;
  } catch { /* kein Formular — dann eben nichts */ }

  if (!datei) return NextResponse.json({ error: "Keine Aufnahme angekommen." }, { status: 400 });
  if (datei.size > MAX) return NextResponse.json({ error: "Die Aufnahme ist zu lang." }, { status: 413 });
  /* Eine Aufnahme von unter einer Zehntelsekunde ist ein verrutschter Finger, kein Satz. */
  if (datei.size < 2000) return NextResponse.json({ ok: true, text: "" });

  const hinaus = new FormData();
  hinaus.append("file", datei, "aufnahme.webm");
  hinaus.append("model", process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe");
  /* Die Sprache mitzugeben halbiert die Fehler bei kurzen Sätzen — „Hallo" allein ist in
     sechs Sprachen dasselbe Wort. */
  const sprache = new URL(request.url).searchParams.get("lang");
  if (sprache && /^[a-z]{2}$/.test(sprache)) hinaus.append("language", sprache);

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: hinaus,
    });
    const roh = await res.text();
    if (!res.ok) {
      console.error("[versusforge-sprache] Abschrift gescheitert:", res.status, roh.slice(0, 300));
      return NextResponse.json({ error: "Das habe ich nicht verstanden. Versuch es noch einmal." }, { status: 502 });
    }
    let text = "";
    try { text = String((JSON.parse(roh) as { text?: string }).text ?? "").trim(); } catch { text = ""; }
    return NextResponse.json({ ok: true, text });
  } catch (e) {
    console.error("[versusforge-sprache] Aufruf gescheitert", e);
    return NextResponse.json({ error: "Das ging gerade nicht." }, { status: 502 });
  }
}
