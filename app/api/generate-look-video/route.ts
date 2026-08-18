import { NextResponse } from "next/server";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookBytes, uploadTryThisLookImage, getSignedUrl } from "@/lib/try-this-look-store";
import { chargeCredits, refundCredits, VIDEO_CREDITS } from "@/lib/curator-budget";

export const runtime = "nodejs";
export const maxDuration = 120;

const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const FASHN_RUN = process.env.FASHN_API_ENDPOINT ?? "https://api.fashn.ai/v1/run";
const FASHN_STATUS = process.env.FASHN_STATUS_ENDPOINT ?? "https://api.fashn.ai/v1/status";
// Video: Pixverse for ALL looks (best quality for fashion + the only provider that
// also handles lingerie/swim). The pendingVideoId is prefixed "pv:" so the GET poll
// stays consistent (legacy un-prefixed ids are also Pixverse).
const trace = () => crypto.randomUUID();
// MODERATION RULE (esp. lingerie): keep the wording NEUTRAL & product-focused.
// Pixverse flags prompts containing body/intimate words — NEVER use lingerie,
// underwear, skin, body, lace, cleavage, revealing, sexy. Say "outfit / the piece".
const FASHION_PROMPT =
  "Elegant high-fashion catalogue presentation: the person presents the outfit with subtle, slow, natural movement — a soft sway or a gentle quarter turn. CRITICAL: keep the outfit IDENTICAL — the exact same shape, cut, colour, fabric, pattern and details; do not redesign, restyle or change it. Keep the person's appearance unchanged. Minimal, refined camera motion, soft premium studio lighting. No text or logos.";
const MUSIC = "Soft, elegant instrumental background music — a gentle, chic fashion soundtrack. ONLY music: absolutely no footsteps, no voices, no talking, no ambient or foley sound effects.";

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
      body: JSON.stringify({ model_name: "tryon-max", inputs: {
        model_image, product_image,
        prompt: "Tasteful editorial fashion photograph of the person wearing the garment, fully and modestly dressed, clean studio lighting.",
        aspect_ratio: "9:16", resolution: "1k", generation_mode: "balanced",
        num_images: 1, output_format: "png", return_base64: true,
      } }),
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

// POST { lookId } → animate the look image into a 5s video. fal Kling for normal
// looks, Pixverse for intimate (lingerie/swim). Stores a "<provider>:<id>" pending
// id for polling.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { lookId?: string };
  const lookId = String(body.lookId ?? "").trim();
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

  const owned = await ownedLook(request, lookId);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });
  const { state, look } = owned;

  // Use || not ?? — the store hydrates these as "" (empty string), not undefined,
  // and "" ?? x keeps the empty string while "" || x correctly falls through.
  const imgUrl = (look as any).frontImageUrl || look.imageUrl;
  if (!imgUrl) return NextResponse.json({ error: "Look has no image." }, { status: 400 });

  try {
    // 1) Decide the source frame. AI looks already show the curator wearing the
    //    outfit → animate directly. A curated product photo (no person) → first
    //    try the garment on the curator's profile photo, then animate that.
    let srcBlob: Blob | null = null;
    // aiCreated looks AND looks already published with a chosen model (modelReady)
    // already show a person → animate the image directly, no second try-on.
    if (!(look as any).aiCreated && !(look as any).modelReady) {
      // 1a) Best path: reuse the curator's existing self-test try-on of this look
      //     (already a model wearing it) — no new OpenAI call, no failure, no cost.
      const selftestUrl = findSelftestImage(state, look);
      if (selftestUrl) {
        try {
          const r = await fetch(selftestUrl);
          if (r.ok) { srcBlob = await r.blob(); (look as any).videoPosterUrl = selftestUrl; }
        } catch { /* fall through to a fresh try-on */ }
      }
      // 1b) Curated product photo → dress the curator's model, THEN animate.
      //     We always attempt the try-on first (even for lingerie: a satin robe /
      //     bodysuit / slip is tasteful enough for FASHN to dress a model in, and a
      //     flatlay MUST be worn or the video shows a garment floating on its own).
      //     If the try-on genuinely refuses, we fall back to animating the source
      //     image directly so the button never dead-ends.
      if (!srcBlob) {
        const curator = (state.curators ?? []).find((c) => c.id === (look as any).curatorId);
        const personUrl = curator?.photoPath ? await getSignedUrl((curator as any).photoPath) : (curator as any)?.photoUrl;
        const garmentUrl = (look as any).garmentFrontImageUrl || imgUrl;
        if (personUrl) {
          // OpenAI first; if it refuses (e.g. revealing pieces), fall back to FASHN.
          let dataUrl = await tryOnGarment(garmentUrl, personUrl);
          if (!dataUrl) dataUrl = await tryOnGarmentFashn(garmentUrl, personUrl);
          if (dataUrl) {
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
        // No curator photo, or the try-on was refused → animate the original image.
        // For an on-model brand photo this looks great; for a bare flatlay it's a
        // last-resort "floating garment" clip, but the button still works.
        if (!srcBlob) (look as any).videoPosterUrl = imgUrl;
      }
    }
    if (!srcBlob) {
      // AI looks already show the curator wearing the outfit → animate directly.
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) return NextResponse.json({ error: "Could not load the look image." }, { status: 502 });
      srcBlob = await imgRes.blob();
    }

    // 2) Charge the look's curator for the video (credits) before generating.
    const ownerId = String((look as any).curatorId ?? "");
    const charge = await chargeCredits(ownerId, VIDEO_CREDITS, "look video");
    if (!charge.ok) {
      return NextResponse.json({ error: "Not enough credits to generate a video.", outOfCredits: true, credits: charge.info }, { status: 402 });
    }
    const refund = () => { if (ownerId) void refundCredits(ownerId, VIDEO_CREDITS, "look video refund"); };

    // 3) Animate the source frame with Pixverse (all looks).
    const key = process.env.PIXVERSE_API_KEY?.trim();
    if (!key) { refund(); return NextResponse.json({ error: "PIXVERSE_API_KEY missing in .env.local." }, { status: 400 }); }
    const form = new FormData();
    form.append("image", srcBlob, "look.png");
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
        duration: 10, img_id: up.Resp.img_id, model: "v5", motion_mode: "normal", quality: "360p", prompt: FASHION_PROMPT,
        sound_effect_switch: true, sound_effect_content: MUSIC,
      }),
    });
    const gen = await genRes.json().catch(() => null);
    if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) {
      refund();
      return NextResponse.json({ error: `Pixverse generate failed: ${gen?.ErrMsg ?? genRes.status}` }, { status: 502 });
    }
    const videoId = `pv:${String(gen.Resp.video_id)}`;

    // Re-read fresh state so the charge above (which saved separately) isn't
    // clobbered, then apply this request's video fields and save once.
    const fresh = await readTryThisLookState();
    const fl = fresh.looks.find(l => l.id === lookId);
    if (fl) {
      (fl as any).pendingVideoId = videoId;
      if ((look as any).videoPosterUrl) (fl as any).videoPosterUrl = (look as any).videoPosterUrl;
    }
    await saveTryThisLookState(fresh);
    return NextResponse.json({ ok: true, videoId, status: "processing", credits: charge.info });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Video generation failed." }, { status: 500 });
  }
}

// GET ?lookId → poll the look's pending job (provider from the id prefix); on
// success store videoUrl.
export async function GET(request: Request) {
  const lookId = new URL(request.url).searchParams.get("lookId")?.trim() ?? "";
  if (!lookId) return NextResponse.json({ error: "lookId required." }, { status: 400 });

  const owned = await ownedLook(request, lookId);
  if ("error" in owned) return NextResponse.json({ error: owned.error }, { status: owned.status });
  const { state, look } = owned;

  const raw = (look as any).pendingVideoId as string | undefined;
  if (!raw) {
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

  // All look videos are Pixverse; strip the "pv:" prefix (legacy ids have none).
  const id = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });

  try {
    const r = await pixversePoll(key, id);
    if (r.status === "done" && r.videoUrl) {
      (look as any).videoUrl = r.videoUrl;
      (look as any).videoCreatedAt = new Date().toISOString(); // for newest-first sorting
      (look as any).pendingVideoId = undefined;
      await saveTryThisLookState(state);
      return NextResponse.json({ status: "done", videoUrl: r.videoUrl });
    }
    if (r.status === "failed") {
      (look as any).pendingVideoId = undefined;
      await saveTryThisLookState(state);
      const ownerId = String((look as any).curatorId ?? "");
      if (ownerId) void refundCredits(ownerId, VIDEO_CREDITS, "look video refund");
      return NextResponse.json({ status: "failed", error: r.error ?? "Generation failed." });
    }
    return NextResponse.json({ status: "processing" });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Poll failed." }, { status: 500 });
  }
}

// Pixverse poll helper.
async function pixversePoll(key: string, id: string): Promise<{ status: "done" | "failed" | "processing"; videoUrl?: string; error?: string }> {
  const res = await fetch(`${PV_BASE}/video/result/${id}`, { headers: pvHeaders(key) });
  const d = await res.json().catch(() => null);
  const status = d?.Resp?.status;
  if (status === 1 && d?.Resp?.url) {
    let url: string = d.Resp.url;
    try { url = await persistVideo(d.Resp.url); } catch (e) { console.error("[generate-look-video] pv persist failed:", e); }
    return { status: "done", videoUrl: url };
  }
  if (status === 7 || status === 8) return { status: "failed", error: status === 7 ? "Blocked by moderation." : "Generation failed." };
  return { status: "processing" };
}
