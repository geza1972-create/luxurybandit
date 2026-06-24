import { NextResponse } from "next/server";
import { readTryThisLookState, uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
import { chargeCredits, refundCredits, VIDEO_CREDITS } from "@/lib/curator-budget";

export const runtime = "nodejs";
export const maxDuration = 120;

const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const trace = () => crypto.randomUUID();
const FASHION_PROMPT =
  "Elegant high-fashion presentation. The subject stays mostly still with subtle, slow, gentle movement — a soft breath, a small natural sway. CRITICAL: the outfit must stay IDENTICAL — keep the exact same garment shape, cut, colour, fabric, pattern and details; do not redesign, restyle or change the clothing. Minimal camera motion, refined studio lighting. No text or logos.";
const MUSIC =
  "Soft, elegant instrumental background music — a gentle, chic fashion soundtrack. ONLY music: absolutely no footsteps, no voices, no talking, no ambient or foley sound effects.";

function pvHeaders(key: string, json = false): Record<string, string> {
  const h: Record<string, string> = { "API-KEY": key, "Ai-trace-id": trace() };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// Copy the finished Pixverse video into our own storage (their URLs expire).
async function persistVideo(remoteUrl: string): Promise<string> {
  const vid = await fetch(remoteUrl);
  if (!vid.ok) throw new Error(`fetch video ${vid.status}`);
  const bytes = await vid.arrayBuffer();
  const path = await uploadTryThisLookBytes("videos", bytes, vid.headers.get("content-type") || "video/mp4", "mp4");
  const signed = (await getSignedUrl(path, 60 * 60 * 24 * 365 * 10)) || (await getSignedUrl(path));
  if (!signed) throw new Error("getSignedUrl returned empty");
  return signed;
}

// The curator who owns the look pays for the video (same model as the still try-on).
async function ownerOf(lookId: string): Promise<string> {
  if (!lookId) return "";
  try {
    const state = await readTryThisLookState();
    return String((state.looks.find(l => l.id === lookId) as { curatorId?: string } | undefined)?.curatorId ?? "");
  } catch { return ""; }
}

// Turn a data URL or remote image URL into bytes we can upload to Pixverse.
async function imageToBlob(image: string): Promise<Blob | null> {
  try {
    if (image.startsWith("data:")) {
      const [, b64] = image.split(",");
      const mime = image.slice(5, image.indexOf(";")) || "image/png";
      return new Blob([Buffer.from(b64, "base64")], { type: mime });
    }
    const res = await fetch(image);
    if (!res.ok) return null;
    return await res.blob();
  } catch { return null; }
}

// POST { lookId, image } → charge the owner, upload the try-on still to Pixverse,
// start a 5s music video, return { videoId, curatorId } for polling.
export async function POST(request: Request) {
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });

  const body = await request.json().catch(() => ({})) as { lookId?: string; image?: string };
  const lookId = String(body.lookId ?? "").trim();
  const image = String(body.image ?? "");
  if (!image) return NextResponse.json({ error: "image required." }, { status: 400 });

  const curatorId = await ownerOf(lookId);
  if (curatorId) {
    const charge = await chargeCredits(curatorId, VIDEO_CREDITS, "try-on video");
    if (!charge.ok) {
      return NextResponse.json({ error: "Not enough credits for a video.", outOfCredits: true, credits: charge.info }, { status: 402 });
    }
  }
  const refund = () => { if (curatorId) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund"); };

  try {
    const blob = await imageToBlob(image);
    if (!blob) { refund(); return NextResponse.json({ error: "Could not read the try-on image." }, { status: 400 }); }

    const form = new FormData();
    form.append("image", blob, "tryon.png");
    const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
    const up = await upRes.json().catch(() => null);
    if (up?.ErrCode !== 0 || !up?.Resp?.img_id) {
      refund();
      return NextResponse.json({ error: `Pixverse upload failed: ${up?.ErrMsg ?? upRes.status}` }, { status: 502 });
    }

    const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
      method: "POST",
      headers: pvHeaders(key, true),
      body: JSON.stringify({
        duration: 5, img_id: up.Resp.img_id, model: "v5", motion_mode: "normal", quality: "720p",
        prompt: FASHION_PROMPT, sound_effect_switch: true, sound_effect_content: MUSIC,
      }),
    });
    const gen = await genRes.json().catch(() => null);
    if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) {
      refund();
      return NextResponse.json({ error: `Pixverse generate failed: ${gen?.ErrMsg ?? genRes.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, videoId: String(gen.Resp.video_id), curatorId, status: "processing" });
  } catch (e) {
    refund();
    return NextResponse.json({ error: e instanceof Error ? e.message : "Video generation failed." }, { status: 500 });
  }
}

// GET ?videoId=&curatorId= → poll Pixverse; on done copy to our storage and
// return the URL; on moderation/failure refund the owner's credits.
export async function GET(request: Request) {
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });
  const url = new URL(request.url);
  const videoId = url.searchParams.get("videoId")?.trim() ?? "";
  const curatorId = url.searchParams.get("curatorId")?.trim() ?? "";
  if (!videoId) return NextResponse.json({ error: "videoId required." }, { status: 400 });

  try {
    const res = await fetch(`${PV_BASE}/video/result/${videoId}`, { headers: pvHeaders(key) });
    const d = await res.json().catch(() => null);
    const status = d?.Resp?.status;
    if (status === 1 && d?.Resp?.url) {
      let finalUrl: string = d.Resp.url;
      try { finalUrl = await persistVideo(d.Resp.url); }
      catch (e) { console.error("[generate-tryon-video] persist failed:", e); }
      return NextResponse.json({ status: "done", videoUrl: finalUrl });
    }
    if (status === 7 || status === 8) {
      if (curatorId) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund");
      return NextResponse.json({ status: "failed", error: status === 7 ? "Blocked by moderation." : "Generation failed." });
    }
    return NextResponse.json({ status: "processing" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Poll failed." }, { status: 500 });
  }
}
