import { NextResponse } from "next/server";
import { readKissLog, writeKissLog, getSignedUrl, uploadTryThisLookBytes } from "@/lib/try-this-look-store";
import { faststartMp4 } from "@/lib/mp4-faststart";
import { SZENEN_PROMPTS } from "@/lib/demo-armee";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * DIE ECHTE KETTE HINTER `/academy/start` (Owner 02.09.2026: „es wird nicht ein mal ein video
 * bei pixverse generiert" · „klar will ich das" · „der Kunde muss das benutzen").
 *
 * WAS HIER VORHER WAR: nichts. Der Trichter liess 26 Sekunden eine Uhr laufen und zeigte
 * danach das fertige Szenen-Video — jeder Besucher sah dasselbe fremde Gesicht. Der Owner
 * ist dreimal darüber gestolpert, und dreimal war die Antwort „das ist die Vorführung".
 *
 * ZWEI AUFRUFE, NICHT EINER. Die Kette dauert zusammen zwei bis drei Minuten; ein einzelner
 * Aufruf müsste die ganze Zeit offen bleiben, und der Trichter könnte nur raten, wie weit er
 * ist. Deshalb:
 *
 *   1. `bild`  — das Bildmodell setzt sein Gesicht in die Szene (~40 s). Ergebnis wird am
 *                Auftrag abgelegt, damit Schritt 2 nichts zurückschicken muss.
 *   2. `video` — Pixverse animiert genau dieses Bild (~60–150 s).
 *
 * Bricht der Browser zwischen beiden ab, liegt das Bild trotzdem am Auftrag und steht in
 * den Käufen. Das ist die Hausregel „Bezahlte Aufträge überleben den Browser" in ihrer
 * kleinen Form: Was schon gerechnet wurde, ist nicht weg, nur weil jemand wegwischt.
 *
 * DER AUFTRAG WIRD NICHT HIER ANGELEGT. Er entsteht wie bei jedem anderen Trichter über
 * `POST /api/kiss-log` — mitsamt dem Eingangstor (Nacktheit, Minderjährige) und der Ablage
 * des Fotos. Diese Route bekommt nur seine Kennung. Zwei Wege, ein Foto abzulegen, wären
 * zwei Wege, das Tor zu umgehen.
 */

const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const pvHeaders = (key: string, json = false): Record<string, string> =>
  json ? { "API-KEY": key, "Ai-trace-id": crypto.randomUUID(), "Content-Type": "application/json" }
       : { "API-KEY": key, "Ai-trace-id": crypto.randomUUID() };

/**
 * DER RIEGEL (Owner 02.09.2026: „es werden von Kunden maximum 10 Videos generiert").
 *
 * Jeder Lauf kostet rund 40 Cent an OpenAI und Pixverse — bei einem öffentlichen Trichter
 * ohne Kasse ist das eine offene Leitung. Zwei Deckel, beide über Umgebungsvariablen
 * verstellbar, damit eine laufende Kampagne nicht auf ein Deployment warten muss:
 *
 *   je Gerät  — gegen den Einzelnen, der es zehnmal ausprobiert
 *   je Tag    — gegen den Fall, den man nicht kommen sieht
 *
 * Gezählt wird am Auftragsbestand, nicht in einem eigenen Speicher: Was in den Käufen steht,
 * ist die Wahrheit. Ein zweiter Zähler daneben liefe irgendwann auseinander.
 */
const LIMIT_GERAET = Number(process.env.ARMEE_LIMIT_GERAET || 3);
const LIMIT_TAG = Number(process.env.ARMEE_LIMIT_TAG || 40);

async function bildBauen(fotoUrl: string, prompt: string): Promise<{ bild?: Buffer; fehler?: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { fehler: "OPENAI_API_KEY fehlt." };
  let roh: ArrayBuffer;
  try {
    const r = await fetch(fotoUrl);
    if (!r.ok) throw new Error(String(r.status));
    roh = await r.arrayBuffer();
  } catch { return { fehler: "Dein Foto konnte nicht geladen werden." }; }

  /* `gpt-image-2`, hoch, 1024×1536 — dieselben Werte wie beim Geburtstag, und aus demselben
     Grund: Die alte Fassung malte aus dem Kundenfoto einen Fremden, und bei `medium` bleibt
     die Haut wächsern. `input_fidelity` kennt das neue Modell nicht (es lehnt den Aufruf mit
     dem Schalter ab); die Gesichtstreue steckt darin schon. */
  const modell = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const lauf = async (model: string) => {
    const fd = new FormData();
    fd.append("model", model);
    fd.append("prompt", prompt);
    fd.append("size", "1024x1536");
    fd.append("quality", "high");
    if (model !== "gpt-image-2") fd.append("input_fidelity", "high");
    fd.append("image[]", new Blob([new Uint8Array(roh)], { type: "image/jpeg" }), "person.jpg");
    const r = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd,
    });
    return r.json() as Promise<{ data?: { b64_json?: string }[]; error?: { message?: string } }>;
  };
  let out = await lauf(modell);
  if (!out?.data?.[0]?.b64_json && modell !== "gpt-image-1") out = await lauf("gpt-image-1");
  const b64 = out?.data?.[0]?.b64_json;
  if (!b64) return { fehler: `Bild fehlgeschlagen: ${out?.error?.message ?? "keine Bilddaten"}` };
  return { bild: Buffer.from(b64, "base64") };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as
    { id?: string; phase?: string; szene?: string; device?: string };
  const id = String(body.id ?? "").trim();
  const phase = String(body.phase ?? "").trim();
  if (!id) return NextResponse.json({ error: "Kein Auftrag." }, { status: 400 });

  const alle = await readKissLog();
  const eintrag = alle.find(e => e.id === id);
  if (!eintrag) return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });

  const szeneId = String(body.szene ?? eintrag.look ?? "").trim();
  const prompts = SZENEN_PROMPTS[szeneId];
  if (!prompts) return NextResponse.json({ error: "Unbekannter Einsatz." }, { status: 400 });

  /* ══ Phase 1 · Das Gesicht in die Szene ══ */
  if (phase === "bild") {
    /* Die Deckel — erst zählen, dann Geld ausgeben. Gezählt werden nur Läufe, die wirklich
       ein Bild bekommen haben (`imagePath`); ein abgebrochener Versuch soll niemandem sein
       Kontingent wegnehmen. */
    const seit = Date.now() - 24 * 60 * 60 * 1000;
    const armee = alle.filter(e => e.theme === "armee" && !!e.imagePath && Date.parse(e.createdAt) > seit);
    if (armee.length >= LIMIT_TAG) {
      return NextResponse.json({ error: "Heute sind schon sehr viele Videos entstanden. Versuch es morgen noch einmal." }, { status: 429 });
    }
    const geraet = String(body.device ?? eintrag.device ?? "").trim();
    if (geraet && armee.filter(e => e.device === geraet).length >= LIMIT_GERAET) {
      return NextResponse.json({ error: "Du hast heute schon mehrere Videos erstellt. Morgen geht es weiter." }, { status: 429 });
    }

    if (!eintrag.personPath) return NextResponse.json({ error: "Kein Foto am Auftrag." }, { status: 400 });
    const fotoUrl = await getSignedUrl(eintrag.personPath).catch(() => "");
    if (!fotoUrl) return NextResponse.json({ error: "Dein Foto ist nicht mehr abrufbar." }, { status: 502 });

    const { bild, fehler } = await bildBauen(fotoUrl, prompts.bild);
    if (!bild || fehler) return NextResponse.json({ error: fehler ?? "Bild fehlgeschlagen." }, { status: 502 });

    const bytes = bild.buffer.slice(bild.byteOffset, bild.byteOffset + bild.byteLength) as ArrayBuffer;
    const pfad = await uploadTryThisLookBytes("looks", bytes, "image/png", "png");

    /* Frisch nachlesen und nur DIESEN Eintrag anfassen — zwischen Lesen und Schreiben kann
       ein anderer Lauf denselben Bestand angefasst haben (Memory `delete-resurrection-merge-bug`). */
    const jetzt = await readKissLog();
    const ziel = jetzt.find(e => e.id === id);
    if (ziel) { ziel.imagePath = pfad; ziel.look = szeneId; await writeKissLog(jetzt); }

    const bildUrl = await getSignedUrl(pfad, 60 * 60 * 24 * 365).catch(() => "");
    return NextResponse.json({ ok: true, bildUrl });
  }

  /* ══ Phase 2 · Aus dem Bild wird Bewegung ══ */
  if (phase === "video") {
    const key = process.env.PIXVERSE_API_KEY?.trim();
    if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY fehlt." }, { status: 500 });
    if (!eintrag.imagePath) return NextResponse.json({ error: "Noch kein Bild." }, { status: 400 });
    const bildUrl = await getSignedUrl(eintrag.imagePath).catch(() => "");
    if (!bildUrl) return NextResponse.json({ error: "Bild nicht abrufbar." }, { status: 502 });

    let bytes: ArrayBuffer;
    try { const r = await fetch(bildUrl); if (!r.ok) throw new Error("img"); bytes = await r.arrayBuffer(); }
    catch { return NextResponse.json({ error: "Bild nicht ladbar." }, { status: 502 }); }

    const form = new FormData();
    form.append("image", new Blob([bytes], { type: "image/png" }), "frame.png");
    const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
    const up = await upRes.json().catch(() => null);
    if (up?.ErrCode !== 0 || !up?.Resp?.img_id) {
      return NextResponse.json({ error: `Pixverse-Upload: ${up?.ErrMsg ?? upRes.status}` }, { status: 502 });
    }

    /* V6, 360p, 5 s, Ton an — die Werte, mit denen die fünf Vorlagen entstanden sind.
       `generate_audio_switch` ist der V6-Name; das alte `sound_effect_switch` lehnt V6 ab,
       und ohne Ton wirkt eine Einsatzszene tot. */
    const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
      method: "POST", headers: pvHeaders(key, true),
      body: JSON.stringify({
        duration: 5, img_id: up.Resp.img_id,
        model: process.env.PIXVERSE_MODEL?.trim() || "v6",
        motion_mode: "normal",
        quality: process.env.PIXVERSE_QUALITY?.trim() || "360p",
        prompt: prompts.video, generate_audio_switch: true,
      }),
    });
    const gen = await genRes.json().catch(() => null);
    if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) {
      return NextResponse.json({ error: `Pixverse: ${gen?.ErrMsg ?? genRes.status}` }, { status: 502 });
    }
    const videoId = String(gen.Resp.video_id);

    let videoPfad = "";
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const res = await fetch(`${PV_BASE}/video/result/${videoId}`, { headers: pvHeaders(key) });
      const d = await res.json().catch(() => null);
      const status = d?.Resp?.status;
      if (status === 1 && d?.Resp?.url) {
        const vid = await fetch(String(d.Resp.url));
        /* FASTSTART, SONST HÄNGT DER SPIELER — Pflicht bei jedem Video des Hauses
           (Memory `video-faststart-pflicht`). Pixverse liefert den moov-Block hinten. */
        const fix = faststartMp4(Buffer.from(await vid.arrayBuffer()));
        const ab = fix.buffer.slice(fix.byteOffset, fix.byteOffset + fix.byteLength) as ArrayBuffer;
        videoPfad = await uploadTryThisLookBytes("videos", ab, "video/mp4", "mp4");
        break;
      }
      if (status === 7) return NextResponse.json({ error: "Dein Foto kam durch die Prüfung nicht durch. Versuch ein anderes." }, { status: 502 });
      if (status === 8) return NextResponse.json({ error: "Die Erzeugung ist fehlgeschlagen." }, { status: 502 });
    }
    if (!videoPfad) return NextResponse.json({ error: "Das hat zu lange gedauert. Versuch es noch einmal." }, { status: 504 });

    const videoUrl = await getSignedUrl(videoPfad, 60 * 60 * 24 * 365).catch(() => "");
    const jetzt = await readKissLog();
    const ziel = jetzt.find(e => e.id === id);
    if (ziel) { ziel.videoUrl = videoUrl; await writeKissLog(jetzt); }

    const poster = eintrag.imagePath ? await getSignedUrl(eintrag.imagePath, 60 * 60 * 24 * 365).catch(() => "") : "";
    return NextResponse.json({ ok: true, videoUrl, poster });
  }

  return NextResponse.json({ error: "Unbekannte Phase." }, { status: 400 });
}
