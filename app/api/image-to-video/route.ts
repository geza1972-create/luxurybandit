import { NextResponse } from "next/server";
import { uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 300; // PixVerse image→video can take a couple of minutes

const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const trace = () => crypto.randomUUID();
const pvHeaders = (key: string, json = false): Record<string, string> =>
  json ? { "API-KEY": key, "Ai-trace-id": trace(), "Content-Type": "application/json" } : { "API-KEY": key, "Ai-trace-id": trace() };

async function persistVideo(remoteUrl: string): Promise<string> {
  const vid = await fetch(remoteUrl);
  if (!vid.ok) throw new Error(`fetch video ${vid.status}`);
  const bytes = await vid.arrayBuffer();
  return uploadTryThisLookBytes("videos", bytes, vid.headers.get("content-type") || "video/mp4", "mp4");
}

// Turn ANY stored image into a short video via PixVerse (image→video). Admin-only. Generic —
// not bound to a program post — so the Card Studio can make a video out of a generated image.
// Body: { imagePath? | imageUrl?, prompt? }. Returns { videoPath, videoUrl }.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY fehlt in .env.local." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { imagePath?: string; imageUrl?: string; prompt?: string };
  const prompt = String(body.prompt ?? "").trim().slice(0, 800) || "Subtle, natural cinematic movement; gentle breathing and hair motion; keep the face and outfit unchanged.";
  // Duration is written INTO the prompt — "8 seconds/sek/s" → 8s, otherwise PixVerse's 5s.
  const duration = /\b8\s*(s\b|sec|second|seconds|sek|sekunden)/i.test(prompt) ? 8 : 5;
  let imageUrl = String(body.imageUrl ?? "").trim();
  if (!imageUrl && body.imagePath) imageUrl = await getSignedUrl(body.imagePath).catch(() => "");
  if (!imageUrl) return NextResponse.json({ error: "Kein Bild angegeben." }, { status: 400 });

  // 1) upload source image to PixVerse
  let imgBytes: ArrayBuffer;
  try { const r = await fetch(imageUrl); if (!r.ok) throw new Error("img"); imgBytes = await r.arrayBuffer(); }
  catch { return NextResponse.json({ error: "Bild konnte nicht geladen werden." }, { status: 502 }); }
  const form = new FormData();
  form.append("image", new Blob([imgBytes], { type: "image/png" }), "frame.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) return NextResponse.json({ error: `Pixverse Upload fehlgeschlagen: ${up?.ErrMsg ?? upRes.status}` }, { status: 502 });

  // 2) generate video from that frame + prompt
  /**
   * V6 UND 360P (Owner 05.08.2026: „du musst 360px nehmen und 5sek. das reicht vollkommend").
   *
   * WAS AM 05.08. VERGLICHEN WURDE — derselbe Auftrag, zweimal:
   *
   *   unsere Route  v5 · 720p · Bild→Video · kein Ton-Schalter  → 1184×1280, STUMM
   *   seine Hand    V6 · 360P · Fusion      · Audio: True       → 480×640 (3:4), MIT STIMME
   *
   * Daraus folgen drei Dinge, und nur zwei davon stehen hier:
   *
   *   1. MODELL V6 statt v5. Die Stimme ist ein V6-Merkmal; auf v5 gibt es sie nicht,
   *      egal was im Auftragstext steht.
   *   2. 360P STATT 720P. Der Owner hat es gemessen und für ausreichend befunden — es ist
   *      ausserdem die billigere Stufe, und auf einer Karte im Telefon sieht man den
   *      Unterschied nicht.
   *   3. DER TON IST JETZT AN — `generate_audio_switch`, siehe unten. Hier stand, er fehle
   *      und man müsse den Feldnamen raten. Das war unnötig: Er steht seit Wochen in
   *      `app/api/generate-tryon-video`, wo die Videos Ton haben. Nachsehen schlägt raten.
   *
   * Das Seitenverhältnis übernimmt Pixverse VOM VORLAGENBILD — es gibt hier keinen
   * Parameter dafür. Wer 3:4 will, gibt eine 3:4-Vorlage.
   */
  const model = process.env.PIXVERSE_MODEL?.trim() || "v6";
  const quality = process.env.PIXVERSE_QUALITY?.trim() || "360p";
  const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
    method: "POST",
    headers: pvHeaders(key, true),
    /**
     * DER TON-SCHALTER — er stand die ganze Zeit nebenan (Owner 05.08.2026: „sie sagt im Video
     * gar nichts").
     *
     * `generate_audio_switch` ist der V6-Name; das alte `sound_effect_switch` gilt nur bis v5
     * und V6 lehnt es mit 400017 ab. Genau daran waren die Videos dieser Route stumm: Sie
     * schickte gar kein Ton-Feld, und ich hatte den Namen nicht raten wollen — dabei steht er
     * seit Wochen in `app/api/generate-tryon-video`, wo die Videos Ton haben.
     */
    body: JSON.stringify({ duration, img_id: up.Resp.img_id, model, motion_mode: "normal", quality, prompt, generate_audio_switch: true }),
  });
  const gen = await genRes.json().catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) return NextResponse.json({ error: `Pixverse Generate fehlgeschlagen: ${gen?.ErrMsg ?? genRes.status}` }, { status: 502 });
  const videoId = String(gen.Resp.video_id);

  // 3) poll for the result (~up to 4.5 min)
  let videoPath = "";
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${PV_BASE}/video/result/${videoId}`, { headers: pvHeaders(key) });
    const d = await res.json().catch(() => null);
    const status = d?.Resp?.status;
    if (status === 1 && d?.Resp?.url) { try { videoPath = await persistVideo(d.Resp.url); } catch { /**/ } break; }
    if (status === 7) return NextResponse.json({ error: "Von PixVerse-Moderation blockiert (Bild/Prompt zu intim)." }, { status: 502 });
    if (status === 8) return NextResponse.json({ error: "Video-Generierung fehlgeschlagen." }, { status: 502 });
  }
  if (!videoPath) return NextResponse.json({ error: "Video-Timeout — bitte erneut versuchen." }, { status: 504 });

  const videoUrl = await getSignedUrl(videoPath, 60 * 60 * 24 * 365).catch(() => "");
  return NextResponse.json({ ok: true, videoPath, videoUrl });
}
