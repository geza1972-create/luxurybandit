import { NextResponse } from "next/server";
import { uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 300; // two PixVerse stages (img→video, then lip-sync)

const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const trace = () => crypto.randomUUID();
const pvHeaders = (key: string, json = false): Record<string, string> =>
  json ? { "API-KEY": key, "Ai-trace-id": trace(), "Content-Type": "application/json" } : { "API-KEY": key, "Ai-trace-id": trace() };

// Poll a PixVerse video_id until it finishes; returns its remote URL (or throws a reason).
async function pollVideo(key: string, videoId: string, tries = 95): Promise<string> {
  for (let i = 0; i < tries; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await fetch(`${PV_BASE}/video/result/${videoId}`, { headers: pvHeaders(key) });
    const d = await res.json().catch(() => null);
    const status = d?.Resp?.status;
    if (status === 1 && d?.Resp?.url) return String(d.Resp.url);
    if (status === 7) throw new Error("Von PixVerse-Moderation blockiert (Bild/Text zu intim).");
    if (status === 8) throw new Error("Generierung fehlgeschlagen.");
  }
  throw new Error("Timeout — bitte erneut versuchen.");
}

// Make Bella SPEAK: image → video (PixVerse) → lip-sync with your lines (PixVerse Human Voice).
// Body: { imagePath? | imageUrl?, lines, speakerId?, motion? }. Returns { videoPath, videoUrl }.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY fehlt in .env.local." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { imagePath?: string; imageUrl?: string; lines?: string; speakerId?: string; motion?: string };
  const lines = String(body.lines ?? "").trim().slice(0, 500);
  if (!lines) return NextResponse.json({ error: "Bitte den gesprochenen Text (Zeilen) angeben." }, { status: 400 });
  const speaker = String(body.speakerId ?? "").trim() || "auto";
  const motion = String(body.motion ?? "").trim().slice(0, 400) || "She faces the camera and talks naturally, calm and still, gentle expressions; keep her face and outfit unchanged.";
  let imageUrl = String(body.imageUrl ?? "").trim();
  if (!imageUrl && body.imagePath) imageUrl = await getSignedUrl(body.imagePath).catch(() => "");
  if (!imageUrl) return NextResponse.json({ error: "Kein Bild angegeben." }, { status: 400 });

  // 1) upload the source image
  let imgBytes: ArrayBuffer;
  try { const r = await fetch(imageUrl); if (!r.ok) throw new Error("img"); imgBytes = await r.arrayBuffer(); }
  catch { return NextResponse.json({ error: "Bild konnte nicht geladen werden." }, { status: 502 }); }
  const form = new FormData();
  form.append("image", new Blob([imgBytes], { type: "image/png" }), "frame.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) return NextResponse.json({ error: `Pixverse Upload: ${up?.ErrMsg ?? upRes.status}` }, { status: 502 });

  // 2) image → base video (front-facing, calm motion so lip-sync works)
  const model = process.env.PIXVERSE_MODEL?.trim() || "v5";
  const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify({ duration: 5, img_id: up.Resp.img_id, model, motion_mode: "normal", quality: "720p", prompt: motion }),
  });
  const gen = await genRes.json().catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) return NextResponse.json({ error: `Pixverse Generate: ${gen?.ErrMsg ?? genRes.status}` }, { status: 502 });
  const sourceVideoId = String(gen.Resp.video_id);
  try { await pollVideo(key, sourceVideoId); } catch (e) { return NextResponse.json({ error: `Basis-Video: ${(e as Error).message}` }, { status: 502 }); }

  // 3) lip-sync: her lines spoken with a synthesized voice, synced to her mouth
  const lipRes = await fetch(`${PV_BASE}/video/lip_sync/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify({ source_video_id: Number(sourceVideoId), lip_sync_tts_speaker_id: speaker, lip_sync_tts_content: lines }),
  });
  const lip = await lipRes.json().catch(() => null);
  if (lip?.ErrCode !== 0 || !lip?.Resp?.video_id) return NextResponse.json({ error: `Lip-Sync: ${lip?.ErrMsg ?? lipRes.status}` }, { status: 502 });

  // 4) poll the talking video → persist
  let remoteUrl: string;
  try { remoteUrl = await pollVideo(key, String(lip.Resp.video_id)); }
  catch (e) { return NextResponse.json({ error: `Lip-Sync: ${(e as Error).message}` }, { status: 502 }); }
  let videoPath: string;
  try { const v = await fetch(remoteUrl); videoPath = await uploadTryThisLookBytes("videos", await v.arrayBuffer(), v.headers.get("content-type") || "video/mp4", "mp4"); }
  catch { return NextResponse.json({ error: "Video konnte nicht gespeichert werden." }, { status: 502 }); }

  const videoUrl = await getSignedUrl(videoPath, 60 * 60 * 24 * 365).catch(() => "");
  return NextResponse.json({ ok: true, videoPath, videoUrl });
}
