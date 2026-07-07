import { NextResponse } from "next/server";
import {
  readTryThisLookState,
  saveTryThisLookState,
  uploadTryThisLookImage,
  getSignedUrl,
} from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

// Admin: upscale a model's low-res profile photo to HD via fal.ai's clarity-upscaler,
// persist the result to our Supabase, and set it as her new photo. Faithful settings
// (low creativity, high resemblance) so it sharpens WITHOUT inventing a new face.
// Requires a FAL_KEY env var (fal.ai account) — per-image cost.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  const key = process.env.FAL_KEY?.trim();
  if (!key) return NextResponse.json({ error: "FAL_KEY fehlt — trag ihn in den Vercel-Env ein, um HD-Upscaling zu aktivieren." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { curatorId?: string };
  const curatorId = String(body.curatorId ?? "").trim();
  if (!curatorId) return NextResponse.json({ error: "curatorId required." }, { status: 400 });

  const state = await readTryThisLookState();
  const curator = (state.curators ?? []).find((c) => c.id === curatorId);
  if (!curator) return NextResponse.json({ error: "Model not found." }, { status: 404 });
  const photoPath = (curator as { photoPath?: string }).photoPath;
  if (!photoPath) return NextResponse.json({ error: "Model has no photo to upscale." }, { status: 400 });

  const imageUrl = await getSignedUrl(photoPath).catch(() => "");
  if (!imageUrl) return NextResponse.json({ error: "Could not read the current photo." }, { status: 502 });

  // fal.ai clarity-upscaler — sync endpoint (waits for the result).
  const falRes = await fetch("https://fal.run/fal-ai/clarity-upscaler", {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      upscale_factor: 2,
      creativity: 0.25, // low → keep her face, don't hallucinate new detail
      resemblance: 0.85, // high → stay faithful to the source
      prompt: "high quality portrait photo of a woman, sharp focus, natural skin texture, professional photography",
      num_inference_steps: 18,
    }),
  });
  const falData = (await falRes.json().catch(() => null)) as { image?: { url?: string }; detail?: unknown; error?: unknown } | null;
  const hdUrl = falData?.image?.url;
  if (!falRes.ok || !hdUrl) {
    const msg = (falData?.detail ?? falData?.error ?? `HTTP ${falRes.status}`) as string;
    return NextResponse.json({ error: `Upscale fehlgeschlagen: ${typeof msg === "string" ? msg : JSON.stringify(msg)}` }, { status: 502 });
  }

  // Download the HD image → data URL → persist to our own storage (fal URLs expire).
  const imgResp = await fetch(hdUrl);
  if (!imgResp.ok) return NextResponse.json({ error: "Could not fetch the HD image." }, { status: 502 });
  const mime = imgResp.headers.get("content-type") || "image/png";
  const dataUrl = `data:${mime};base64,${Buffer.from(await imgResp.arrayBuffer()).toString("base64")}`;
  const newPath = await uploadTryThisLookImage("uploads", dataUrl);

  (curator as { photoPath?: string }).photoPath = newPath;
  await saveTryThisLookState(state);

  const photoUrl = await getSignedUrl(newPath).catch(() => "");
  return NextResponse.json({ ok: true, photoUrl });
}
