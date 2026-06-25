import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookBytes, uploadTryThisLookImage, getSignedUrl } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 120;

const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const FASHN_RUN = process.env.FASHN_API_ENDPOINT ?? "https://api.fashn.ai/v1/run";
const FASHN_STATUS = process.env.FASHN_STATUS_ENDPOINT ?? "https://api.fashn.ai/v1/status";
const trace = () => crypto.randomUUID();
const FASHION_PROMPT =
  "Elegant high-fashion presentation. The subject stays mostly still with subtle, slow, gentle movement — a soft breath, a small natural sway. CRITICAL: the outfit must stay IDENTICAL — keep the exact same garment shape, cut, colour, fabric, pattern and details; do not redesign, restyle or change the clothing. Minimal camera motion, refined studio lighting. No text or logos.";

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Find the curator's own existing try-on of this look (a "self-test"). Reusing it
// as the video source avoids a fresh OpenAI try-on (which can fail / cost money).
function findSelftestImage(state: Awaited<ReturnType<typeof readTryThisLookState>>, look: any): string | null {
  const cid = look.curatorId;
  if (!cid) return null;
  const cur = (state.curators ?? []).find((c) => c.id === cid);
  const nm = cur ? [cur.firstName, cur.lastName].filter(Boolean).join(" ").trim() : "";
  if (!nm) return null;
  const want = slug(nm);
  let best: { url: string; at: string } | null = null;
  for (const g of state.generations ?? []) {
    if (g.lookId !== look.id || !(g as any).imageUrl || (g as any).hidden) continue;
    if (slug((g as any).customerName ?? "") !== want) continue;
    const at = String((g as any).createdAt ?? "");
    if (!best || at > best.at) best = { url: (g as any).imageUrl, at };
  }
  return best?.url ?? null;
}

function pvHeaders(key: string, json = false): Record<string, string> {
  const h: Record<string, string> = { "API-KEY": key, "Ai-trace-id": trace() };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

// Copy a remote (Pixverse) video into our own storage; returns the new signed URL.
async function persistVideo(remoteUrl: string): Promise<string> {
  const vid = await fetch(remoteUrl);
  if (!vid.ok) throw new Error(`fetch video ${vid.status}`);
  const bytes = await vid.arrayBuffer();
  const path = await uploadTryThisLookBytes("videos", bytes, vid.headers.get("content-type") || "video/mp4", "mp4");
  // Long-lived signed URL (10 years) — the video URL is stored directly on the look.
  const signed = await getSignedUrl(path, 60 * 60 * 24 * 365 * 10) || await getSignedUrl(path);
  if (!signed) throw new Error("getSignedUrl returned empty");
  return signed;
}

// Put the look's garment onto a person photo (the curator's profile) via OpenAI
// gpt-image, so a product-only photo gets a real model before Pixverse animates it.
// Returns a PNG data URL, or null on failure (caller falls back to the product photo).
async function tryOnGarment(garmentUrl: string, personUrl: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const [pRes, gRes] = await Promise.all([fetch(personUrl), fetch(garmentUrl)]);
    if (!pRes.ok || !gRes.ok) return null;
    const personBuf = await pRes.arrayBuffer();
    const garmentBuf = await gRes.arrayBuffer();
    const coverageRule = "Strict coverage requirement: the output MUST depict the person fully and modestly dressed in a complete outfit. The clothing must fully cover the chest, cleavage, torso, shoulders and hips with opaque fabric. Tasteful editorial fashion photograph of a clothed person. Absolutely no swimwear, lingerie, underwear, nudity, or exposed intimate areas. If the input shows bare skin, replace it with full elegant clothing.";
    const prompt = [
      "Image 1 is a photo of a real person. Image 2 is a clothing item (product photo).",
      "Generate ONE photorealistic full-body image of the SAME person from Image 1 now fully dressed in the clothing item from Image 2.",
      "Preserve the person's face, hairstyle and skin tone from Image 1 — clearly the same person. The garment must match Image 2 in material, print, colour, cut and silhouette.",
      "Natural, realistic result, simple clean background, no text or logos.",
      coverageRule,
    ].join("\n\n");
    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", "1024x1536");
    form.append("quality", process.env.OPENAI_IMAGE_QUALITY ?? "low");
    form.append("n", "1");
    form.append("image[]", new Blob([personBuf], { type: "image/png" }), "person.png");
    form.append("image[]", new Blob([garmentBuf], { type: "image/png" }), "garment.png");
    const res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const payload = await res.json().catch(() => null);
    const b64 = payload?.data?.[0]?.b64_json;
    if (!res.ok || !b64) { console.error("[generate-look-video] try-on failed:", payload?.error?.message ?? res.status); return null; }
    return `data:image/png;base64,${b64}`;
  } catch (e) {
    console.error("[generate-look-video] try-on error:", e);
    return null;
  }
}

// FASHN fallback — when OpenAI refuses the garment (e.g. lingerie/swim), FASHN's
// dedicated try-on model still puts it on the model. Returns a data URL or null.
async function tryOnGarmentFashn(garmentUrl: string, personUrl: string): Promise<string | null> {
  const key = process.env.FASHN_API_KEY;
  if (!key) return null;
  try {
    const [pRes, gRes] = await Promise.all([fetch(personUrl), fetch(garmentUrl)]);
    if (!pRes.ok || !gRes.ok) return null;
    const pBuf = Buffer.from(await pRes.arrayBuffer());
    const gBuf = Buffer.from(await gRes.arrayBuffer());
    const model_image = `data:${pRes.headers.get("content-type") || "image/jpeg"};base64,${pBuf.toString("base64")}`;
    const product_image = `data:${gRes.headers.get("content-type") || "image/jpeg"};base64,${gBuf.toString("base64")}`;
    const create = await fetch(FASHN_RUN, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model_name: "tryon-max", inputs: { model_image, product_image, num_images: 1, output_format: "png" } }),
    });
    const cp = await create.json().catch(() => null);
    const id = cp?.id;
    if (!create.ok || !id) { console.error("[generate-look-video] fashn create failed:", cp?.error ?? create.status); return null; }
    for (let i = 0; i < 70; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const st = await fetch(`${FASHN_STATUS}/${id}`, { headers: { Authorization: `Bearer ${key}` } }).then((r) => r.json()).catch(() => null);
      const status = String(st?.status ?? "").toLowerCase();
      if (status === "completed") {
        const out = st?.output?.[0];
        if (typeof out === "string" && out.startsWith("data:image/")) return out;
        if (typeof out === "string") { const ir = await fetch(out); if (!ir.ok) return null; return `data:image/png;base64,${Buffer.from(await ir.arrayBuffer()).toString("base64")}`; }
        return null;
      }
      if (status === "failed") return null;
    }
    return null;
  } catch (e) {
    console.error("[generate-look-video] fashn error:", e);
    return null;
  }
}

async function ownedLook(request: Request, lookId: string) {
  const state = await readTryThisLookState();
  const look = state.looks.find((l) => l.id === lookId);
  if (!look) return { error: "Look not found.", status: 404 as const };
  const adminPin = process.env.TRY_THIS_LOOK_ADMIN_PIN?.trim();
  const isAdmin = adminPin && request.headers.get("x-try-look-admin-pin") === adminPin;
  const curatorId = request.headers.get("x-curator-id")?.trim();
  if (!isAdmin && (!curatorId || curatorId !== (look as any).curatorId)) {
    return { error: "Not allowed.", status: 403 as const };
  }
  return { state, look };
}

// POST { lookId } → upload the look image to Pixverse + start a 5s image-to-video,
// store the pending video id, return it for polling.
export async function POST(request: Request) {
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing in .env.local." }, { status: 400 });

  const body = await request.json().catch(() => ({})) as { lookId?: string };
  const lookId = String(body.lookId ?? "").trim();
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

  const owned = await ownedLook(request, lookId);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });
  const { state, look } = owned;

  const imgUrl = (look as any).frontImageUrl ?? look.imageUrl;
  if (!imgUrl) return NextResponse.json({ error: "Look has no image." }, { status: 400 });

  try {
    // 1) Decide the source frame. AI looks already show the curator wearing the
    //    outfit → animate directly. A curated product photo (no person) → first
    //    try the garment on the curator's profile photo, then animate that.
    let srcBlob: Blob | null = null;
    if (!(look as any).aiCreated) {
      // 1a) Best path: reuse the curator's existing self-test try-on of this look
      //     (already a model wearing it) — no new OpenAI call, no failure, no cost.
      const selftestUrl = findSelftestImage(state, look);
      if (selftestUrl) {
        try {
          const r = await fetch(selftestUrl);
          if (r.ok) { srcBlob = await r.blob(); (look as any).videoPosterUrl = selftestUrl; }
        } catch { /* fall through to a fresh try-on */ }
      }
      // 1b) Otherwise put the garment on the curator's profile photo.
      if (!srcBlob) {
        const curator = (state.curators ?? []).find((c) => c.id === (look as any).curatorId);
        const personUrl = curator?.photoPath ? await getSignedUrl((curator as any).photoPath) : (curator as any)?.photoUrl;
        const garmentUrl = (look as any).garmentFrontImageUrl ?? imgUrl;
        // A curated look is a product photo → it MUST be worn by a model before we
        // animate it, otherwise the video shows a garment floating on its own.
        if (!personUrl) {
          return NextResponse.json({ error: "Add a profile photo to this curator first — the curated garment needs a model to wear it in the video." }, { status: 400 });
        }
        // OpenAI first; if it refuses (e.g. lingerie/swim), fall back to FASHN.
        let dataUrl = await tryOnGarment(garmentUrl, personUrl);
        if (!dataUrl) dataUrl = await tryOnGarmentFashn(garmentUrl, personUrl);
        if (!dataUrl) {
          return NextResponse.json({ error: "Couldn't put the garment on the model (try-on failed). Tip: try this look on yourself once, then generate the video — we'll reuse that image." }, { status: 502 });
        }
        const [, b64] = dataUrl.split(",");
        srcBlob = new Blob([Buffer.from(b64, "base64")], { type: "image/png" });
        // Store the try-on frame as the video poster so the feed shows the model
        // (not the bare product) before the video starts playing.
        try {
          const posterPath = await uploadTryThisLookImage("looks", dataUrl);
          (look as any).videoPosterUrl = (await getSignedUrl(posterPath, 60 * 60 * 24 * 365 * 10)) || undefined;
        } catch { /* poster is optional */ }
      }
    }
    if (!srcBlob) {
      // AI looks already show the curator wearing the outfit → animate directly.
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) return NextResponse.json({ error: "Could not load the look image." }, { status: 502 });
      srcBlob = await imgRes.blob();
    }

    // 2) Upload the source frame to Pixverse.
    const form = new FormData();
    form.append("image", srcBlob, "look.png");
    const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
    const up = await upRes.json().catch(() => null);
    if (up?.ErrCode !== 0 || !up?.Resp?.img_id) {
      return NextResponse.json({ error: `Pixverse upload failed: ${up?.ErrMsg ?? upRes.status}` }, { status: 502 });
    }
    const imgId = up.Resp.img_id;

    // 2) Start the 5-second image-to-video generation.
    const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
      method: "POST",
      headers: pvHeaders(key, true),
      // Model v5 lets us DESCRIBE the audio (sound_effect_content) → ask for music,
      // not footsteps. The still pose in the prompt also avoids walking sounds.
      body: JSON.stringify({
        duration: 5, img_id: imgId, model: "v5", motion_mode: "normal", quality: "720p", prompt: FASHION_PROMPT,
        sound_effect_switch: true,
        sound_effect_content: "Soft, elegant instrumental background music — a gentle, chic fashion soundtrack. ONLY music: absolutely no footsteps, no voices, no talking, no ambient or foley sound effects.",
      }),
    });
    const gen = await genRes.json().catch(() => null);
    if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) {
      return NextResponse.json({ error: `Pixverse generate failed: ${gen?.ErrMsg ?? genRes.status}` }, { status: 502 });
    }
    const videoId = String(gen.Resp.video_id);

    (look as any).pendingVideoId = videoId;
    await saveTryThisLookState(state);
    return NextResponse.json({ ok: true, videoId, status: "processing" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Video generation failed." }, { status: 500 });
  }
}

// GET ?lookId → poll the look's pending Pixverse job; on success store videoUrl.
export async function GET(request: Request) {
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });
  const lookId = new URL(request.url).searchParams.get("lookId")?.trim() ?? "";
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

  const owned = await ownedLook(request, lookId);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });
  const { state, look } = owned;

  const videoId = (look as any).pendingVideoId;
  if (!videoId) {
    // Self-heal: if the stored URL is still a (expiring) Pixverse URL, copy it now.
    const cur = (look as any).videoUrl as string | undefined;
    if (cur && /pixverse\.ai/.test(cur)) {
      try {
        const finalUrl = await persistVideo(cur);
        (look as any).videoUrl = finalUrl;
        await saveTryThisLookState(state);
        return NextResponse.json({ status: "done", videoUrl: finalUrl });
      } catch (e) { console.error("[generate-look-video] persist (heal) failed:", e); }
    }
    return NextResponse.json({ status: cur ? "done" : "idle", videoUrl: cur ?? null });
  }

  try {
    const res = await fetch(`${PV_BASE}/video/result/${videoId}`, { headers: pvHeaders(key) });
    const d = await res.json().catch(() => null);
    const status = d?.Resp?.status;
    if (status === 1 && d?.Resp?.url) {
      // Copy the finished video into our own storage — Pixverse media URLs expire.
      let finalUrl: string = d.Resp.url;
      try { finalUrl = await persistVideo(d.Resp.url); }
      catch (e) { console.error("[generate-look-video] persist failed:", e); }
      (look as any).videoUrl = finalUrl;
      (look as any).videoCreatedAt = new Date().toISOString(); // for newest-first sorting
      (look as any).pendingVideoId = undefined;
      await saveTryThisLookState(state);
      return NextResponse.json({ status: "done", videoUrl: finalUrl });
    }
    if (status === 7 || status === 8) {
      (look as any).pendingVideoId = undefined;
      await saveTryThisLookState(state);
      return NextResponse.json({ status: "failed", error: status === 7 ? "Blocked by moderation." : "Generation failed." });
    }
    return NextResponse.json({ status: "processing" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Poll failed." }, { status: 500 });
  }
}
