import { NextResponse } from "next/server";
import { readTryThisLookState, uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
import { chargeCredits, refundCredits, VIDEO_CREDITS } from "@/lib/curator-budget";

export const runtime = "nodejs";
export const maxDuration = 120;

// Video provider routing: fal.ai Kling Standard for everything (cheap, great
// fashion motion), EXCEPT lingerie/swim/intimate looks which use Pixverse (the
// only provider that allows them). The chosen provider is encoded in the videoId
// prefix ("fal:" / "pv:") so the client poll stays provider-agnostic.
const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const FAL_MODEL = "fal-ai/kling-video/v2.1/standard/image-to-video";
const FAL_QUEUE = `https://queue.fal.run/${FAL_MODEL}`;
// fal's queue status/result endpoints are keyed by the APP base, not the full
// model path (e.g. .../fal-ai/kling-video/requests/<id>/status).
const FAL_REQ = "https://queue.fal.run/fal-ai/kling-video/requests";
const trace = () => crypto.randomUUID();
const FASHION_PROMPT =
  "Elegant high-fashion presentation. The subject stays mostly still with subtle, slow, gentle movement — a soft breath, a small natural sway. CRITICAL: the outfit must stay IDENTICAL — keep the exact same garment shape, cut, colour, fabric, pattern and details; do not redesign, restyle or change the clothing. Minimal camera motion, refined studio lighting. No text or logos.";
const MUSIC =
  "Soft, elegant instrumental background music — a gentle, chic fashion soundtrack. ONLY music: absolutely no footsteps, no voices, no talking, no ambient or foley sound effects.";

// Looks Kling (and most providers) refuse to animate → route to Pixverse.
const INTIMATE = /(slip|robe|kimono|swimsuit|maillot|one[- ]?piece|bodysuit|nightdress|chemise|lingerie|negligee|hunza|os[eé]ree|eres|la perla|fleur du mal|carine|intimissimi|triumph|calzedonia|hunkem[oö]ller|agent provocateur|wolford)/i;

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

async function lookOf(lookId: string): Promise<{ curatorId: string; intimate: boolean }> {
  if (!lookId) return { curatorId: "", intimate: false };
  try {
    const state = await readTryThisLookState();
    const look = state.looks.find((l) => l.id === lookId) as { curatorId?: string; name?: string; storeName?: string } | undefined;
    const intimate = INTIMATE.test(`${look?.name ?? ""} ${look?.storeName ?? ""}`);
    return { curatorId: String(look?.curatorId ?? ""), intimate };
  } catch { return { curatorId: "", intimate: false }; }
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

// fal needs a public image URL; data URLs are uploaded to our storage first.
async function imageToUrl(image: string): Promise<string | null> {
  try {
    if (!image.startsWith("data:")) return image;
    const [, b64] = image.split(",");
    const mime = image.slice(5, image.indexOf(";")) || "image/png";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const buf = Buffer.from(b64, "base64");
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const path = await uploadTryThisLookBytes("uploads", ab, mime, ext);
    return (await getSignedUrl(path, 60 * 60 * 24)) || (await getSignedUrl(path));
  } catch { return null; }
}

// ── Pixverse (intimate looks) ──
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

// ── fal.ai Kling (everything else) ──
async function falStart(key: string, image: string): Promise<{ videoId?: string; error?: string }> {
  const imageUrl = await imageToUrl(image);
  if (!imageUrl) return { error: "Could not read the try-on image." };
  const sub = await fetch(FAL_QUEUE, {
    method: "POST", headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: FASHION_PROMPT, image_url: imageUrl, duration: "5" }),
  });
  const j = (await sub.json().catch(() => null)) as { request_id?: string } | null;
  if (!sub.ok || !j?.request_id) return { error: `fal submit failed: ${sub.status}` };
  return { videoId: j.request_id };
}
async function falPoll(key: string, requestId: string): Promise<{ status: "done" | "failed" | "processing"; videoUrl?: string; error?: string }> {
  const auth = { Authorization: `Key ${key}` };
  const st = await fetch(`${FAL_REQ}/${requestId}/status`, { headers: auth }).then((r) => r.json()).catch(() => null);
  const status = st?.status;
  if (status === "IN_QUEUE" || status === "IN_PROGRESS") return { status: "processing" };
  if (status !== "COMPLETED") return { status: "failed", error: `fal status ${status ?? "unknown"}` };
  const res = await fetch(`${FAL_REQ}/${requestId}`, { headers: auth }).then((r) => r.json()).catch(() => null);
  const url = res?.video?.url;
  if (!url) return { status: "failed", error: "fal returned no video." };
  let finalUrl: string = url;
  try { finalUrl = await persistVideo(url); } catch (e) { console.error("[video] fal persist failed:", e); }
  return { status: "done", videoUrl: finalUrl };
}

// POST { lookId, image } → charge owner, start the right provider, return
// { videoId: "<provider>:<id>", curatorId } for polling.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { lookId?: string; image?: string };
  const lookId = String(body.lookId ?? "").trim();
  const image = String(body.image ?? "");
  if (!image) return NextResponse.json({ error: "image required." }, { status: 400 });

  const { curatorId, intimate } = await lookOf(lookId);
  const provider = intimate ? "pv" : "fal";
  const key = (intimate ? process.env.PIXVERSE_API_KEY : process.env.FAL_KEY)?.trim();
  if (!key) return NextResponse.json({ error: `${intimate ? "PIXVERSE_API_KEY" : "FAL_KEY"} missing.` }, { status: 400 });

  if (curatorId) {
    const charge = await chargeCredits(curatorId, VIDEO_CREDITS, "try-on video");
    if (!charge.ok) return NextResponse.json({ error: "Not enough credits for a video.", outOfCredits: true, credits: charge.info }, { status: 402 });
  }
  const refund = () => { if (curatorId) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund"); };

  try {
    const r = intimate ? await pixverseStart(key, image) : await falStart(key, image);
    if (!r.videoId) { refund(); return NextResponse.json({ error: r.error ?? "Video start failed." }, { status: 502 }); }
    return NextResponse.json({ ok: true, videoId: `${provider}:${r.videoId}`, curatorId, status: "processing" });
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

  const isFal = raw.startsWith("fal:");
  const id = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw; // tolerate legacy unprefixed (= pixverse)
  const key = (isFal ? process.env.FAL_KEY : process.env.PIXVERSE_API_KEY)?.trim();
  if (!key) return NextResponse.json({ error: `${isFal ? "FAL_KEY" : "PIXVERSE_API_KEY"} missing.` }, { status: 400 });

  try {
    const r = isFal ? await falPoll(key, id) : await pixversePoll(key, id);
    if (r.status === "failed" && curatorId) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Poll failed." }, { status: 500 });
  }
}
