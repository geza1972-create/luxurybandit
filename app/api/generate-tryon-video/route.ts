import { NextResponse } from "next/server";
import { readTryThisLookState, uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
import { chargeCredits, refundCredits, VIDEO_CREDITS } from "@/lib/curator-budget";

export const runtime = "nodejs";
export const maxDuration = 120;

// Video: Pixverse for all try-on videos (best quality + handles lingerie/swim).
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

async function persistVideo(remoteUrl: string): Promise<string> {
  const vid = await fetch(remoteUrl);
  if (!vid.ok) throw new Error(`fetch video ${vid.status}`);
  const bytes = await vid.arrayBuffer();
  const path = await uploadTryThisLookBytes("videos", bytes, vid.headers.get("content-type") || "video/mp4", "mp4");
  const signed = (await getSignedUrl(path, 60 * 60 * 24 * 365 * 10)) || (await getSignedUrl(path));
  if (!signed) throw new Error("getSignedUrl returned empty");
  return signed;
}

async function lookOf(lookId: string): Promise<{ curatorId: string }> {
  if (!lookId) return { curatorId: "" };
  try {
    const state = await readTryThisLookState();
    const look = state.looks.find((l) => l.id === lookId) as { curatorId?: string } | undefined;
    return { curatorId: String(look?.curatorId ?? "") };
  } catch { return { curatorId: "" }; }
}

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

// ── Pixverse ──
async function pixverseStart(key: string, image: string): Promise<{ videoId?: string; error?: string }> {
  const blob = await imageToBlob(image);
  if (!blob) return { error: "Could not read the try-on image." };
  const form = new FormData();
  form.append("image", blob, "tryon.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) return { error: `Pixverse upload failed: ${up?.ErrMsg ?? upRes.status}` };
  const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify({ duration: 5, img_id: up.Resp.img_id, model: "v5", motion_mode: "normal", quality: "720p", prompt: FASHION_PROMPT, sound_effect_switch: true, sound_effect_content: MUSIC }),
  });
  const gen = await genRes.json().catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) return { error: `Pixverse generate failed: ${gen?.ErrMsg ?? genRes.status}` };
  return { videoId: String(gen.Resp.video_id) };
}
async function pixversePoll(key: string, id: string): Promise<{ status: "done" | "failed" | "processing"; videoUrl?: string; error?: string }> {
  const res = await fetch(`${PV_BASE}/video/result/${id}`, { headers: pvHeaders(key) });
  const d = await res.json().catch(() => null);
  const status = d?.Resp?.status;
  if (status === 1 && d?.Resp?.url) {
    let url: string = d.Resp.url;
    try { url = await persistVideo(d.Resp.url); } catch (e) { console.error("[video] pv persist failed:", e); }
    return { status: "done", videoUrl: url };
  }
  if (status === 7 || status === 8) return { status: "failed", error: status === 7 ? "Blocked by moderation." : "Generation failed." };
  return { status: "processing" };
}

// POST { lookId, image } → charge owner, start the right provider, return
// { videoId: "<provider>:<id>", curatorId } for polling.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { lookId?: string; image?: string };
  const lookId = String(body.lookId ?? "").trim();
  const image = String(body.image ?? "");
  if (!image) return NextResponse.json({ error: "image required." }, { status: 400 });

  const { curatorId } = await lookOf(lookId);
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });

  if (curatorId) {
    const charge = await chargeCredits(curatorId, VIDEO_CREDITS, "try-on video");
    if (!charge.ok) return NextResponse.json({ error: "Not enough credits for a video.", outOfCredits: true, credits: charge.info }, { status: 402 });
  }
  const refund = () => { if (curatorId) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund"); };

  try {
    const r = await pixverseStart(key, image);
    if (!r.videoId) { refund(); return NextResponse.json({ error: r.error ?? "Video start failed." }, { status: 502 }); }
    return NextResponse.json({ ok: true, videoId: `pv:${r.videoId}`, curatorId, status: "processing" });
  } catch (e) {
    refund();
    return NextResponse.json({ error: e instanceof Error ? e.message : "Video generation failed." }, { status: 500 });
  }
}

// GET ?videoId=<provider>:<id>&curatorId= → poll the right provider; on done copy
// to our storage and return the URL; on failure refund the owner.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("videoId")?.trim() ?? "";
  const curatorId = url.searchParams.get("curatorId")?.trim() ?? "";
  if (!raw) return NextResponse.json({ error: "videoId required." }, { status: 400 });

  const id = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw; // tolerate "pv:" prefix and legacy unprefixed
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });

  try {
    const r = await pixversePoll(key, id);
    if (r.status === "failed" && curatorId) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Poll failed." }, { status: 500 });
  }
}
