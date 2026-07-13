import { NextResponse } from "next/server";
import {
  readTryThisLookState,
  saveTryThisLookState,
  uploadTryThisLookBytes,
  getSignedUrl,
} from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 300;

// Admin: turn an AI face (still) into a short VIDEO via fal.ai Kling (image-to-video),
// persist it to our Supabase, and attach it to the face (avatarFace.videoPath) so a
// creator who books that face gets a ready-made video too. Sync endpoint — Kling standard
// (~5s clip) usually finishes in 1-3 min. Per-video cost — on demand only.

const DEFAULT_MOTION =
  "subtle natural movement, she looks at the camera and smiles softly, elegant fashion editorial, cinematic, gentle camera push-in";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  const key = process.env.FAL_KEY?.trim();
  if (!key) return NextResponse.json({ error: "FAL_KEY fehlt — trag ihn in den Vercel-Env ein, um Videos zu generieren." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { faceId?: string; motion?: string };
  const faceId = String(body.faceId ?? "").trim();
  if (!faceId) return NextResponse.json({ error: "faceId required." }, { status: 400 });
  const motion = String(body.motion ?? "").trim() || DEFAULT_MOTION;

  const state = await readTryThisLookState();
  const face = (state.avatarFaces ?? []).find(f => f.id === faceId);
  if (!face) return NextResponse.json({ error: "Face not found." }, { status: 404 });
  const imageUrl = face.imagePath ? await getSignedUrl(face.imagePath).catch(() => "") : "";
  if (!imageUrl) return NextResponse.json({ error: "This face has no image to animate." }, { status: 400 });

  // fal Kling image-to-video (sync). Override the model via FAL_VIDEO_MODEL.
  const model = process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/kling-video/v1.6/standard/image-to-video";
  const falRes = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      prompt: motion,
      duration: "5",
      aspect_ratio: "9:16",
    }),
  });
  const falData = (await falRes.json().catch(() => null)) as
    | { video?: { url?: string }; detail?: unknown; error?: unknown }
    | null;
  const videoUrl = falData?.video?.url;
  if (!falRes.ok || !videoUrl) {
    const msg = (falData?.detail ?? falData?.error ?? `HTTP ${falRes.status}`) as unknown;
    return NextResponse.json({ error: `Video failed: ${typeof msg === "string" ? msg : JSON.stringify(msg)}` }, { status: 502 });
  }

  // Download the fal video → persist to our own storage (fal URLs expire).
  const vidResp = await fetch(videoUrl);
  if (!vidResp.ok) return NextResponse.json({ error: "Could not fetch the generated video." }, { status: 502 });
  const bytes = await vidResp.arrayBuffer();
  const videoPath = await uploadTryThisLookBytes("videos", bytes, vidResp.headers.get("content-type") || "video/mp4", "mp4");

  // Re-read + set on the face, so a concurrent booking/save can't clobber it.
  const st = await readTryThisLookState();
  const f = (st.avatarFaces ?? []).find(x => x.id === faceId);
  if (f) { f.videoPath = videoPath; await saveTryThisLookState(st); }

  const signed = await getSignedUrl(videoPath).catch(() => "");
  return NextResponse.json({ ok: true, videoUrl: signed });
}
