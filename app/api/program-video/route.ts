import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
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

// Turn ONE program feed post's image into a short video via PixVerse (image→video), using
// the admin's motion prompt. Same PixVerse plumbing as generate-look-video, on its own
// route so the long poll isn't bound by try-this-look's 60s limit.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY fehlt in .env.local." }, { status: 400 });

  const body = await request.json().catch(() => ({})) as { postId?: string; prompt?: string };
  const postId = String(body.postId ?? "").trim();
  const prompt = String(body.prompt ?? "").trim().slice(0, 800) || "Subtle, natural cinematic movement; keep faces and outfit unchanged.";

  const state = await readTryThisLookState();
  const post = (state.programFeeds ?? []).find(p => p.id === postId);
  if (!post) return NextResponse.json({ error: "Post nicht gefunden." }, { status: 404 });
  const imageUrl = post.imageUrl || (post.imagePath ? await getSignedUrl(post.imagePath).catch(() => "") : "");
  if (!imageUrl) return NextResponse.json({ error: "Kein Bild für diesen Post." }, { status: 400 });

  // 1) upload the source image to PixVerse
  let imgBytes: ArrayBuffer;
  try { const r = await fetch(imageUrl); if (!r.ok) throw new Error("img"); imgBytes = await r.arrayBuffer(); }
  catch { return NextResponse.json({ error: "Bild konnte nicht geladen werden." }, { status: 502 }); }
  const form = new FormData();
  form.append("image", new Blob([imgBytes], { type: "image/png" }), "post.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) return NextResponse.json({ error: `Pixverse Upload fehlgeschlagen: ${up?.ErrMsg ?? upRes.status}` }, { status: 502 });

  // 2) generate the video from that frame + the motion prompt
  const model = process.env.PIXVERSE_MODEL?.trim() || "v5";
  const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
    method: "POST",
    headers: pvHeaders(key, true),
    body: JSON.stringify({ duration: 5, img_id: up.Resp.img_id, model, motion_mode: "normal", quality: "720p", prompt }),
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

  // 4) attach to the post (re-read to avoid clobbering concurrent saves)
  const fresh = await readTryThisLookState();
  fresh.programFeeds = (fresh.programFeeds ?? []).map(p => p.id === postId ? { ...p, videoPath, videoUrl: undefined, videoPrompt: prompt } : p);
  await saveTryThisLookState(fresh);
  const signed = await getSignedUrl(videoPath, 60 * 60 * 24 * 365).catch(() => "");
  return NextResponse.json({ ok: true, postId, videoUrl: signed });
}
