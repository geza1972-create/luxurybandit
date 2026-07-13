import { NextResponse } from "next/server";
import {
  readTryThisLookState,
  saveTryThisLookState,
  uploadTryThisLookImage,
  getSignedUrl,
} from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { tryOnGarment } from "@/lib/tryon";

export const runtime = "nodejs";
export const maxDuration = 300;

// Admin: GENERATE new AI faces for the "Pick your face" library via fal.ai FLUX,
// persist them to our Supabase, and add them to state.avatarFaces (free, unclaimed).
// 3:4 portraits to match the portal's full-body / no-round-photo standard.
// Requires FAL_KEY. Per-image cost — keep counts small.

const DEFAULT_PROMPT =
  "Full-body editorial fashion photograph of a beautiful young woman as a luxury fashion influencer, " +
  "elegant designer outfit, confident natural pose, photorealistic, natural realistic skin texture, " +
  "sharp focus, soft professional studio lighting, clean minimal background, 4k, high detail";

const NEGATIVE =
  "deformed, distorted face, extra fingers, extra limbs, bad anatomy, blurry, low quality, " +
  "watermark, text, logo, cartoon, illustration, painting, nsfw, nude";

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  const key = process.env.FAL_KEY?.trim();
  if (!key) return NextResponse.json({ error: "FAL_KEY fehlt — trag ihn in den Vercel-Env ein, um AI-Gesichter zu generieren." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { prompt?: string; count?: number; referenceImage?: string };
  const prompt = String(body.prompt ?? "").trim() || DEFAULT_PROMPT;
  const count = Math.max(1, Math.min(4, Number(body.count) || 1));
  const referenceImage = String(body.referenceImage ?? "");
  const garmentImage = String((body as any).garmentImage ?? "");
  const intimate = (body as any).intimate === true;
  // fal's safety checker is very prudish — it blocks legit lingerie/swim fashion on this
  // 18+ platform. Default OFF; set FAL_SAFETY_CHECKER=on to re-enable. (Nudity is still
  // discouraged by the negative prompt in text mode.)
  const safety = process.env.FAL_SAFETY_CHECKER === "on";

  // GARMENT MODE: a reference model + a garment picked from our gallery → dress the model
  // via our proven try-on engine (OpenAI/FASHN), then add the dressed result to the pool.
  if (referenceImage.startsWith("data:image/") && garmentImage) {
    const dressed = await tryOnGarment(garmentImage, referenceImage, { intimate }).catch(() => null);
    if (!dressed) return NextResponse.json({ error: "Try-on failed — that model/garment combo was rejected. Try another photo or garment." }, { status: 502 });
    let dataUrl = dressed;
    if (!dressed.startsWith("data:")) {
      const r = await fetch(dressed);
      if (!r.ok) return NextResponse.json({ error: "Could not fetch the dressed image." }, { status: 502 });
      dataUrl = `data:${r.headers.get("content-type") || "image/png"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    }
    const imagePath = await uploadTryThisLookImage("uploads", dataUrl);
    const face = { id: `face-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`, imagePath, createdAt: new Date().toISOString() };
    const st = await readTryThisLookState();
    st.avatarFaces = [face, ...(st.avatarFaces ?? [])];
    await saveTryThisLookState(st);
    const signed = await getSignedUrl(imagePath).catch(() => "");
    return NextResponse.json({ ok: true, faces: [{ id: face.id, imageUrl: signed, claimed: false }] });
  }

  let falRes: Response;
  if (referenceImage.startsWith("data:image/")) {
    // REFERENCE MODE: "make something similar to this image" — no description needed.
    // fal FLUX Redux takes an image and generates variations. We persist the reference
    // to our storage first so fal can fetch it by URL.
    const reduxModel = process.env.FAL_REDUX_MODEL?.trim() || "fal-ai/flux/dev/redux";
    const refPath = await uploadTryThisLookImage("uploads", referenceImage);
    const refUrl = await getSignedUrl(refPath).catch(() => "");
    if (!refUrl) return NextResponse.json({ error: "Could not read the reference image." }, { status: 502 });
    falRes = await fetch(`https://fal.run/${reduxModel}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: refUrl,
        image_size: "portrait_4_3",
        num_images: count,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: safety,
      }),
    });
  } else {
    // TEXT MODE: FLUX dev is a good quality/cost balance; override via env if desired.
    const model = process.env.FAL_IMAGE_MODEL?.trim() || "fal-ai/flux/dev";
    falRes = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negative_prompt: NEGATIVE,
        image_size: "portrait_4_3", // 3:4 portrait
        num_images: count,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: safety,
      }),
    });
  }
  const falData = (await falRes.json().catch(() => null)) as
    | { images?: { url?: string }[]; detail?: unknown; error?: unknown }
    | null;
  const urls = (falData?.images ?? []).map((i) => i?.url).filter((u): u is string => !!u);
  if (!falRes.ok || urls.length === 0) {
    const msg = (falData?.detail ?? falData?.error ?? `HTTP ${falRes.status}`) as unknown;
    return NextResponse.json({ error: `Generation failed: ${typeof msg === "string" ? msg : JSON.stringify(msg)}` }, { status: 502 });
  }

  // Download each generated image → data URL → persist to our own storage (fal URLs expire).
  const st = await readTryThisLookState();
  const added: { id: string; imagePath: string }[] = [];
  for (const url of urls) {
    try {
      const imgResp = await fetch(url);
      if (!imgResp.ok) continue;
      const mime = imgResp.headers.get("content-type") || "image/jpeg";
      const dataUrl = `data:${mime};base64,${Buffer.from(await imgResp.arrayBuffer()).toString("base64")}`;
      const imagePath = await uploadTryThisLookImage("uploads", dataUrl);
      added.push({ id: `face-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`, imagePath });
    } catch { /* skip a failed download */ }
  }
  if (added.length === 0) return NextResponse.json({ error: "Could not save the generated images." }, { status: 502 });

  const faces = added.map((f) => ({ ...f, createdAt: new Date().toISOString() }));
  st.avatarFaces = [...faces, ...(st.avatarFaces ?? [])];
  await saveTryThisLookState(st);

  const out = await Promise.all(faces.map(async (f) => ({ id: f.id, imageUrl: await getSignedUrl(f.imagePath).catch(() => ""), claimed: false })));
  return NextResponse.json({ ok: true, faces: out });
}
