import { NextResponse } from "next/server";
import { readTryThisLookState, uploadTryThisLookBytes, getSignedUrl, createSignedUploadUrl, bumpDailyGenLimit, ensureWelcomeCredits, spendVideoCredit } from "@/lib/try-this-look-store";
import { chargeCredits, refundCredits, VIDEO_CREDITS } from "@/lib/curator-budget";
import { authorizeStudio } from "@/lib/studio-auth";
import { isAdminRequest } from "@/lib/admin-auth";
import { categorizeLook } from "@/lib/look-category";

// Auto-match the video's SCENE to the look's category. NEUTRAL wording (works for lingerie
// too — no skin/body/lace words that Pixverse flags). Injected where the prompt has {ort}.
// Locative phrase that reads naturally as "Lass die Frau {ort} rumlaufen".
function sceneForCategory(cat: string): string {
  switch (cat) {
    case "business": return "in der eleganten Lobby eines Luxus-Konferenzhotels";
    case "after-dark": return "auf einem glamourösen Abend-Event mit festlichem, warmem Licht";
    case "riviera": return "an einem sonnigen Luxus-Pool mit Meerblick";
    case "off-duty": return "in einer stilvollen, sonnigen Altstadt-Gasse";
    case "boudoir": return "in einem eleganten, hell und weich beleuchteten Innenraum";
    default: return "in einem schönen Urlaubsort"; // user's default: a beautiful holiday spot
  }
}

export const runtime = "nodejs";
export const maxDuration = 120;

// Video: Pixverse for all try-on videos (best quality + handles lingerie/swim).
const PV_BASE = "https://app-api.pixverse.ai/openapi/v2";
const trace = () => crypto.randomUUID();
// MODERATION RULE (esp. lingerie): keep the wording NEUTRAL & product-focused.
// Pixverse flags prompts containing body/intimate words — NEVER use lingerie,
// underwear, skin, body, lace, cleavage, revealing, sexy. Say "outfit / the piece".
const FASHION_PROMPT =
  "Elegant high-fashion catalogue presentation: the person presents the outfit with subtle, slow, natural movement — a soft sway or a gentle quarter turn. CRITICAL: keep the outfit IDENTICAL — the exact same shape, cut, colour, fabric, pattern and details; do not redesign, restyle or change it. Keep the person's appearance unchanged. Minimal, refined camera motion, soft premium studio lighting. No text or logos.";
const MUSIC =
  "Soft, elegant instrumental background music — a gentle, chic fashion soundtrack. ONLY music: absolutely no footsteps, no voices, no talking, no ambient or foley sound effects.";

// User-facing "Motion" choice in the funnel. "dance" swaps the whole prompt (the
// stored funnel prompt is the walk/turn one) — user-proven wording: "@Bild2 exakt
// gleich lassen. Lass die Frau tanzen." Pixverse then GENERATES fitting music, so
// dance videos are created WITH sound (sound_effect_switch on).
const DANCE_PROMPT =
  "Mache die Frau aus @Bild1 angezogen in @Bild2. @Bild2 exakt gleich lassen. Gesicht nicht ändern. Lass die Frau {ort} tanzen.";

// 360° turnaround (premium tier). NEUTRAL wording only (no lingerie/skin/lace) or
// Pixverse flags it. User-tested & confirmed working. 10s.
const TURNAROUND_PROMPT =
  "The woman in the image presents her outfit: she stands upright and turns slowly and smoothly through one full 360° — front, right side, back, left side, back to front. Static camera at hip height, soft premium studio lighting. Keep her appearance and her outfit exactly the same throughout. Fluid, calm motion, photorealistic, high-end fashion catalogue look.";

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

async function lookOf(lookId: string): Promise<{ curatorId: string; category: string }> {
  if (!lookId) return { curatorId: "", category: "" };
  try {
    const state = await readTryThisLookState();
    const look = state.looks.find((l) => l.id === lookId) as { curatorId?: string } | undefined;
    if (!look) return { curatorId: "", category: "" };
    return { curatorId: String(look.curatorId ?? ""), category: categorizeLook(look as never) };
  } catch { return { curatorId: "", category: "" }; }
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

// Reference-mode prompts (@Bild1 = garment, @Bild2 = the person). NEUTRAL wording
// only — no lingerie/skin/lace — or Pixverse flags it. @Bild2 = the person whose
// FACE/appearance must be preserved; @Bild1 = the outfit to put on them.
const REF_PRESENT_PROMPT =
  "@person presents the @outfit in an elegant studio with soft premium lighting and subtle natural movement — a gentle sway. Keep @person face and appearance and the @outfit exactly the same. Fluid calm motion, photorealistic, high-end fashion catalogue look. No text or logos.";
// User's own validated 360° prompt (@person = the person, @outfit = the garment).
const REF_TURNAROUND_PROMPT =
  "@person präsentiert das Outfit aus @outfit und dreht sich langsam und gleichmäßig einmal komplett um 360° — von vorne über die rechte Seite zum Rücken, weiter über die linke Seite zurück nach vorne. Feste Kamera auf Hüfthöhe, weiches edles Licht. Ihr Aussehen und das Outfit bleiben die ganze Zeit exakt gleich. Fließende, ruhige Bewegung, fotorealistisch, hochwertiger Fashion-Katalog-Look.";

// ── Pixverse ──
async function pixverseUpload(key: string, image: string): Promise<number | null> {
  const blob = await imageToBlob(image);
  if (!blob) return null;
  const form = new FormData();
  form.append("image", blob, "img.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  return (up?.ErrCode === 0 && up?.Resp?.img_id) ? up.Resp.img_id : null;
}

// Reference mode: dress the person (@Bild2) in the garment (@Bild1) AND animate, in
// one step — keeps the face (FASHN's photo doesn't). Used for lingerie video/360°.
async function pixverseStartReference(key: string, garment: string, person: string, turnaround: boolean, customPrompt?: string, slowmo = false): Promise<{ videoId?: string; error?: string; promptUsed?: string }> {
  const [gId, pId] = await Promise.all([pixverseUpload(key, garment), pixverseUpload(key, person)]);
  if (!gId || !pId) return { error: "Pixverse upload failed (reference images)." };
  // Send the caller's prompt EXACTLY as written (no remapping, no extra clauses) — same
  // as typing it into Pixverse yourself. Bind the two reference images to the exact
  // @-tokens used in the prompt: the FIRST distinct token = the person, the SECOND = the
  // outfit (matches "…die Frau aus @Bild1 angezogen in @Bild2/@0…").
  const promptRaw = (customPrompt && customPrompt.trim())
    ? customPrompt.trim()
    : (turnaround ? REF_TURNAROUND_PROMPT : REF_PRESENT_PROMPT);
  const tokens = [...new Set((promptRaw.match(/@([A-Za-z0-9_]+)/g) || []).map(t => t.slice(1)))];
  // person = @Bild1 / @1 / @person / @model; outfit = a DIFFERENT token. Locked to these two so
  // the binding never depends on token order.
  const personRef = tokens.find(t => /^(bild1|1|person|model|frau|woman)$/i.test(t)) ?? tokens[0] ?? "Bild1";
  const outfitRef = tokens.find(t => t !== personRef && /^(bild2|2|outfit|kleid|garment)$/i.test(t)) ?? tokens.find(t => t !== personRef) ?? "Bild2";
  // BULLETPROOF the prompt so Pixverse can NEVER error "@name does not match ref_name":
  //   (1) drop a possessive "'s" after an @token (@Bild1's → @Bild1),
  //   (2) strip any @token that isn't one of our two bound refs (a stray/edited token).
  let promptUsed = promptRaw.replace(/(@[A-Za-z0-9_]+)['’]s\b/g, "$1");
  for (const t of tokens) {
    if (t !== personRef && t !== outfitRef) promptUsed = promptUsed.split("@" + t).join(t);
  }
  //   (3) Pixverse regression (~2026-07): punctuation directly after a token is parsed INTO
  //   the @name ("@Bild2." ≠ ref "Bild2" → error 400017), verified by direct API test.
  //   Insert a space between the token and any following punctuation.
  promptUsed = promptUsed.replace(/(@[A-Za-z0-9_]+)(?=[.,!?;:)\]])/g, "$1 ");
  const reqBody = {
    image_references: [
      { type: "subject", img_id: pId, ref_name: personRef },
      { type: "subject", img_id: gId, ref_name: outfitRef },
    ],
    prompt: promptUsed,
    // CHEAP-PREVIEW settings: generate a low-cost 9:16 / 5s / 360p clip. When a combo
    // looks good the admin upscales THAT clip to HD (1080p) via the upscale action — so
    // we only pay HD on the keepers. (360p is Pixverse's floor; there is no 320p tier.)
    model: "v6",                     // V6 keeps the reference outfit/person (v4.5 ignored it)
    duration: turnaround ? 10 : (slowmo ? 10 : 8), // funnel = 8s (Pixverse has no 7s) so the turn + walk fit; slow-mo = 10s
    // Slow-mo is "ad mode": render straight to 1080p HD (no 360p→upscale step). Normal
    // clips stay 360p (cheap previews for the free reuse cache).
    quality: turnaround ? "720p" : (slowmo ? "1080p" : "360p"),
    aspect_ratio: "9:16",            // full vertical (reels), same as the 360° turnaround
    // MUSIC: V6 generates native, prompt-matched audio when generate_audio_switch=true
    // (the V6 param — the OLD sound_effect_switch is v5-only and V6 rejects it with 400017,
    // which is why our videos were silent). Confirmed in the platform docs: generate_audio_
    // switch is supported on v5.5/v5.6/v6/c1. V6 picks fitting music from the prompt/scene.
    generate_audio_switch: true,
  };
  const genRes = await fetch(`${PV_BASE}/video/fusion/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify(reqBody),
  });
  const gen = await genRes.json().catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) return { error: `Pixverse fusion failed: ${gen?.ErrMsg ?? genRes.status} [refs: @${personRef}, @${outfitRef}]`, promptUsed };
  return { videoId: String(gen.Resp.video_id), promptUsed };
}

async function pixverseStart(key: string, image: string, turnaround = false): Promise<{ videoId?: string; error?: string }> {
  const blob = await imageToBlob(image);
  if (!blob) return { error: "Could not read the try-on image." };
  const form = new FormData();
  form.append("image", blob, "tryon.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) return { error: `Pixverse upload failed: ${up?.ErrMsg ?? upRes.status}` };
  const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify({ duration: turnaround ? 8 : 5, img_id: up.Resp.img_id, model: "v5", motion_mode: "normal", quality: "720p", prompt: turnaround ? TURNAROUND_PROMPT : FASHION_PROMPT, sound_effect_switch: true, sound_effect_content: MUSIC }),
  });
  const gen = await genRes.json().catch(() => null);
  if (gen?.ErrCode !== 0 || !gen?.Resp?.video_id) return { error: `Pixverse generate failed: ${gen?.ErrMsg ?? genRes.status}` };
  return { videoId: String(gen.Resp.video_id) };
}
// ── Upscale an existing (persisted) video to HD ──────────────────────────────
// Upload the finished video to Pixverse (media/upload → media_id), then run upscale and poll
// like any other generation — so admins can replace a good 360p test video with a 1080p one.
async function pixverseUploadVideo(key: string, fileUrl: string): Promise<number | null> {
  try {
    const form = new FormData();
    form.append("file_url", fileUrl);
    const res = await fetch(`${PV_BASE}/media/upload`, { method: "POST", headers: pvHeaders(key), body: form });
    const d = await res.json().catch(() => null);
    return (d?.ErrCode === 0 && d?.Resp?.media_id) ? Number(d.Resp.media_id) : null;
  } catch { return null; }
}
async function pixverseUpscale(key: string, mediaId: number): Promise<{ videoId?: string; error?: string }> {
  const res = await fetch(`${PV_BASE}/video/upscale/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify({ video_media_id: mediaId, quality: "1080p", model: "v4.5" }),
  });
  const d = await res.json().catch(() => null);
  if (d?.ErrCode !== 0 || !d?.Resp?.video_id) return { error: `Pixverse upscale failed: ${d?.ErrMsg ?? res.status}` };
  return { videoId: String(d.Resp.video_id) };
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
  const body = (await request.json().catch(() => ({}))) as { lookId?: string; image?: string; turnaround?: boolean; garment?: string; person?: string; prompt?: string; motion?: string; slowmo?: boolean; dryRun?: boolean; upscale?: boolean; videoUrl?: string; importVideo?: boolean; ref?: string };
  const lookId = String(body.lookId ?? "").trim();
  const image = String(body.image ?? "");
  const turnaround = body.turnaround === true; // 360° tier
  const customPrompt = String(body.prompt ?? ""); // try-on window can override to tune it
  // Reference mode (lingerie): garment + person photo → Pixverse dresses + animates
  // in one step, keeping the face. Falls back to single-image when not provided.
  const garment = String(body.garment ?? "");
  const person = String(body.person ?? "");
  const reference = !!garment && !!person;

  // ── Import mode (admin): the admin upscaled the video IN Pixverse directly and pastes the new
  //    Pixverse video-ID (same account → we fetch it) or a direct video URL. We persist it to
  //    our storage and return the URL; the client then replaces the feed video. ──
  if (body.importVideo) {
    if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
    // Direct upload (large files, no Vercel 4.5MB limit): sign → client PUTs to Supabase → attach path.
    if ((body as { sign?: boolean }).sign) {
      try { const { path, uploadUrl } = await createSignedUploadUrl("videos", String((body as { ext?: string }).ext ?? "mp4")); return NextResponse.json({ path, uploadUrl }); }
      catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Upload konnte nicht starten." }, { status: 500 }); }
    }
    const videoPath = String((body as { videoPath?: string }).videoPath ?? "").trim();
    if (videoPath) {
      if (!videoPath.startsWith("try-this-look/")) return NextResponse.json({ error: "Bad path." }, { status: 400 });
      const signed = (await getSignedUrl(videoPath, 60 * 60 * 24 * 365 * 10)) || (await getSignedUrl(videoPath));
      if (!signed) return NextResponse.json({ error: "Signieren fehlgeschlagen." }, { status: 500 });
      return NextResponse.json({ ok: true, videoUrl: signed });
    }
    const ref = String(body.ref ?? "").trim();
    if (!ref) return NextResponse.json({ error: "ref (Pixverse-ID oder URL) required." }, { status: 400 });
    // A direct video URL → persist it to our bucket (re-signed long-lived).
    if (/^https?:\/\//i.test(ref)) {
      try { return NextResponse.json({ ok: true, videoUrl: await persistVideo(ref) }); }
      catch { return NextResponse.json({ error: "Video-URL konnte nicht geladen werden." }, { status: 502 }); }
    }
    // Otherwise a Pixverse video-ID → poll its result (same account key), persist on done.
    const key = process.env.PIXVERSE_API_KEY?.trim();
    if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });
    const r = await pixversePoll(key, ref.replace(/^pv:/i, ""));
    if (r.status === "done" && r.videoUrl) return NextResponse.json({ ok: true, videoUrl: r.videoUrl });
    if (r.status === "failed") return NextResponse.json({ error: r.error || "Pixverse-Video fehlgeschlagen." }, { status: 502 });
    return NextResponse.json({ ok: true, status: "processing" }); // still rendering in Pixverse
  }

  // ── Upscale mode (admin): turn a good (360p) try-on video into HD, then replace it. ──
  if (body.upscale) {
    if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
    const key = process.env.PIXVERSE_API_KEY?.trim();
    if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });
    const videoUrl = String(body.videoUrl ?? "").trim();
    if (!videoUrl) return NextResponse.json({ error: "videoUrl required." }, { status: 400 });
    const mediaId = await pixverseUploadVideo(key, videoUrl);
    if (!mediaId) return NextResponse.json({ error: "Pixverse video upload failed." }, { status: 502 });
    if (body.dryRun) return NextResponse.json({ ok: true, mediaId }); // FREE test: upload only
    const up = await pixverseUpscale(key, mediaId);
    if (!up.videoId) return NextResponse.json({ error: up.error ?? "Upscale start failed." }, { status: 502 });
    return NextResponse.json({ ok: true, videoId: `pv:${up.videoId}`, status: "processing" });
  }

  if (!image && !reference) return NextResponse.json({ error: "image required." }, { status: 400 });

  const { curatorId, category } = await lookOf(lookId);
  // User "Motion" pick: "dance" swaps the WHOLE prompt for the proven dance one
  // (the stored funnel prompt is walk/turn); default/unset = turn. The user only
  // ever sees the chip labels — never the prompt.
  const motion = String(body.motion ?? "").toLowerCase() === "dance" ? "dance" : "turn";
  const basePrompt = motion === "dance" ? DANCE_PROMPT : customPrompt;
  // Auto-match the scene to the look: replace {ort}/{location}/{umgebung} in the prompt with a
  // category-appropriate setting. Pure TEXT substitution — the @Bild1/@Bild2 image bindings
  // are untouched, so it never swaps the model/outfit.
  const scene = sceneForCategory(category);
  let promptWithScene = basePrompt ? basePrompt.replace(/\{ort\}|\{location\}|\{umgebung\}/gi, scene) : basePrompt;
  // Slow motion (admin, per-video): add a slow-mo cue so Pixverse renders the movement
  // slower AND generates matching-tempo music (no playback-rate audio distortion).
  const slowmo = body.slowmo === true;
  // NB: avoid the word "cinematic" — Pixverse reads it as a camera move (zoom/dolly).
  // Ask for slow MOVEMENT + a fixed camera so it never zooms.
  if (slowmo && promptWithScene) promptWithScene = `${promptWithScene} Alles in sanfter Zeitlupe, langsame ruhige Bewegungen. Feststehende Kamera, kein Zoom, keine Kamerafahrt.`;
  const key = process.env.PIXVERSE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "PIXVERSE_API_KEY missing." }, { status: 400 });

  // PROOF mode: upload the two reference images to Pixverse and return the IDs Pixverse
  // assigns — this shows the images actually reach Pixverse, WITHOUT generating a video.
  if (body.dryRun && reference) {
    const [gId, pId] = await Promise.all([pixverseUpload(key, garment), pixverseUpload(key, person)]);
    return NextResponse.json({
      dryRun: true,
      pixverseReceivedPerson: !!pId, personImgId: pId, personBytes: person.startsWith("data:") ? "(data url)" : person.slice(0, 60),
      pixverseReceivedGarment: !!gId, garmentImgId: gId, garmentBytes: garment.startsWith("data:") ? "(data url)" : garment.slice(0, 60),
    });
  }

  // MODELS generate their OWN videos: the FIRST one is free (a welcome credit), every
  // additional new video costs $3.99 (a paid credit). Cached/reused videos never reach
  // here — this is only the expensive new-generation path. Admin (PIN/session) passes free.
  const curatorHdr = request.headers.get("x-curator-id")?.trim();
  if (curatorHdr && !(await isAdminRequest(request))) {
    const st = await readTryThisLookState();
    const model = (st.curators ?? []).find(c => c.id === curatorHdr) as { email?: string } | undefined;
    const modelEmail = String(model?.email ?? "").trim().toLowerCase();
    if (!modelEmail) {
      return NextResponse.json(
        { error: "We couldn't find your model account — please sign in again.", modelsPhotoOnly: true },
        { status: 403 }
      );
    }
    await ensureWelcomeCredits(modelEmail);       // first video free, exactly once
    const balance = await spendVideoCredit(modelEmail); // spend the free or a paid credit
    if (balance === null) {
      return NextResponse.json(
        { error: "Your first video was free — each new video is $3.99.", paymentRequired: true, priceCents: 399, priceLabel: "$3.99" },
        { status: 402 }
      );
    }
  }

  // Staff (admin or an acting-as curator session, e.g. Szidonia) generate for FREE
  // — no credit charge, no paywall. End-user charging comes with Stripe.
  const staff = (await authorizeStudio(request)).ok;
  // Anti-abuse cap: a non-staff caller (guest / direct API) may trigger at most
  // FREE_VIDEO_GEN_PER_DAY (default 1) generations per IP per day. Guests normally never
  // reach here — GO plays a pre-generated video — so this only bites direct-API abuse and
  // caps runaway Pixverse spend. Admin/staff bypass. Keyed on the Vercel-set client IP
  // (can't be spoofed like a header); device id is only a dev-local fallback.
  if (!staff) {
    const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "").trim();
    const device = (request.headers.get("x-lb-device") || "").trim();
    const gateKey = ip ? `ip:${ip}` : device ? `d:${device}` : "anon";
    const gate = await bumpDailyGenLimit(gateKey);
    if (!gate.ok) return NextResponse.json(
      { error: "Free limit reached — 1 video per day. Sign up for more.", limitReached: true, resetsDaily: true, limit: gate.limit },
      { status: 429 },
    );
  }
  const chargeOwner = !!curatorId && !staff;
  if (chargeOwner) {
    const charge = await chargeCredits(curatorId, VIDEO_CREDITS, "try-on video");
    if (!charge.ok) return NextResponse.json({ error: "Not enough credits for a video.", outOfCredits: true, credits: charge.info }, { status: 402 });
  }
  const refund = () => { if (chargeOwner) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund"); };

  try {
    const r = reference
      ? await pixverseStartReference(key, garment, person, turnaround, promptWithScene, slowmo)
      : await pixverseStart(key, image, turnaround);
    if (!r.videoId) { refund(); return NextResponse.json({ error: r.error ?? "Video start failed.", promptUsed: (r as any).promptUsed }, { status: 502 }); }
    return NextResponse.json({ ok: true, videoId: `pv:${r.videoId}`, curatorId, status: "processing", promptUsed: (r as any).promptUsed });
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
