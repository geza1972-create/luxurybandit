import { NextResponse } from "next/server";
import { readTryThisLookState, uploadTryThisLookBytes, getSignedUrl, createSignedUploadUrl, bumpDailyGenLimit, spendVideoCredit, readKissLog, writeKissLog, grantMonthlySubscriptionCredits, grantVideoCredits, addVideoLog } from "@/lib/try-this-look-store";
import { hasActiveSubscription } from "@/lib/stripe";
import { INCLUDED_VIDEOS_PER_MONTH, EXTRA_VIDEO_CENTS, eur } from "@/lib/pricing";
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
async function pixverseStartReference(key: string, garment: string, person: string, turnaround: boolean, customPrompt?: string, slowmo = false, hd = false): Promise<{ videoId?: string; error?: string; promptUsed?: string }> {
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
    // 360p ist die SPARSTUFE fuer Admin-Vorschauen, die spaeter hochgerechnet werden.
    // Wer bezahlt hat, bekommt sie nicht. Der Owner hat die Latte am 30.07.2026 selbst
    // gesetzt: „500px sollte schon sein" — 540p ist die Stufe, die Pixverse dafuer hat.
    // Bewusst NICHT 1080p: das kostet ein Vielfaches und geht aus denselben 9,99 EUR.
    // Wer mehr will, dreht `hd` hier auf "720p" oder "1080p".
    quality: turnaround ? "720p" : (slowmo ? "1080p" : hd ? "540p" : "360p"),
    aspect_ratio: "3:4",             // 3:4 (passt zu den Wardrobe-Karten); Pixverse V6 unterstützt 16:9/9:16/1:1/3:4/4:3
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

// BILD → VIDEO mit EIGENEM Prompt (Owner 30.07.2026: „ich will hier jetzt ein Bild
// generieren dann in einem Video umwandeln"). Vorher lag der Prompt fest auf den
// Mode-Texten — für ein Kuss-Bild ist der falsch. Kommt keiner mit, bleibt alles wie bisher.
async function pixverseStart(key: string, image: string, turnaround = false, customPrompt = ""): Promise<{ videoId?: string; error?: string }> {
  const blob = await imageToBlob(image);
  if (!blob) return { error: "Could not read the try-on image." };
  const form = new FormData();
  form.append("image", blob, "tryon.png");
  const upRes = await fetch(`${PV_BASE}/image/upload`, { method: "POST", headers: pvHeaders(key), body: form });
  const up = await upRes.json().catch(() => null);
  if (up?.ErrCode !== 0 || !up?.Resp?.img_id) return { error: `Pixverse upload failed: ${up?.ErrMsg ?? upRes.status}` };
  const genRes = await fetch(`${PV_BASE}/video/img/generate`, {
    method: "POST", headers: pvHeaders(key, true),
    body: JSON.stringify({ duration: turnaround ? 8 : 5, img_id: up.Resp.img_id, model: "v5", motion_mode: "normal", quality: "720p", prompt: customPrompt.trim() || (turnaround ? TURNAROUND_PROMPT : FASHION_PROMPT), sound_effect_switch: true, sound_effect_content: MUSIC }),
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

// ── FASHN Image-to-Video (Test) ──────────────────────────────────────────────
// FASHN legt das Kleidungsstück PIXELGENAU aufs Bild (tryon-max). Image-to-Video
// animiert GENAU dieses Bild — statt das Garment neu zu interpretieren wie Pixverse-
// Fusion (die die Lingerie verändert). Gleicher /v1/run-Endpunkt + FASHN_API_KEY.
async function fashnStartVideo(image: string): Promise<{ videoId?: string; error?: string }> {
  const key = process.env.FASHN_API_KEY?.trim();
  if (!key) return { error: "FASHN_API_KEY fehlt." };
  const res = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model_name: "image-to-video", inputs: { image, duration: 5, resolution: "720p" } }),
  });
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.id) return { error: d?.error?.message ?? d?.error ?? d?.detail ?? `FASHN ${res.status}` };
  return { videoId: String(d.id) };
}
async function fashnPollVideo(id: string): Promise<{ status: "done" | "failed" | "processing"; videoUrl?: string; error?: string }> {
  const key = process.env.FASHN_API_KEY?.trim();
  if (!key) return { status: "failed", error: "FASHN_API_KEY fehlt." };
  const res = await fetch(`https://api.fashn.ai/v1/status/${id}`, { headers: { Authorization: `Bearer ${key}` } });
  const d = await res.json().catch(() => null);
  const s = String(d?.status ?? "");
  if (s === "completed") {
    const out = Array.isArray(d?.output) ? d.output[0] : d?.output;
    if (!out) return { status: "failed", error: "FASHN: kein Video zurückgegeben." };
    let url = String(out);
    try { url = await persistVideo(url); } catch (e) { console.error("[video] fashn persist failed:", e); }
    return { status: "done", videoUrl: url };
  }
  if (s === "failed") return { status: "failed", error: d?.error?.message ?? d?.error ?? "FASHN generation failed." };
  return { status: "processing" };
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
  const body = (await request.json().catch(() => ({}))) as { lookId?: string; image?: string; turnaround?: boolean; garment?: string; person?: string; prompt?: string; motion?: string; slowmo?: boolean; hd?: boolean; dryRun?: boolean; upscale?: boolean; videoUrl?: string; importVideo?: boolean; ref?: string };
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

  // MODELS/influencers pay for EVERY video they generate — $3.99 each, no free first one
  // (we don't want freeloaders; a paying creator is a committed creator). Cached/reused videos
  // never reach here — this is only the expensive new-generation path. Admin (PIN/session) free.
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
    const balance = await spendVideoCredit(modelEmail); // spend a PAID credit (no free grant)
    if (balance === null) {
      return NextResponse.json(
        // Betrag und Beschriftung aus derselben Zahl (Owner 31.07.2026: „auch wo 3,99 steht auch
        // 2,99"). Vorher standen hier DREI feste 3,99 nebeneinander — Text, Betrag, Label.
        { error: `Each video is ${eur(EXTRA_VIDEO_CENTS)}.`, paymentRequired: true,
          priceCents: EXTRA_VIDEO_CENTS, priceLabel: eur(EXTRA_VIDEO_CENTS) },
        { status: 402 }
      );
    }
  }

  // Staff (admin or an acting-as curator session, e.g. Szidonia) generate for FREE
  // — no credit charge, no paywall. End-user charging comes with Stripe.
  const staff = (await authorizeStudio(request)).ok;

  /**
   * WER BEZAHLT HAT, IST KEIN GAST (Owner 30.07.2026, auf die Frage nach dem Abo).
   *
   * Der Deckel darunter erlaubt einem Nicht-Personal EIN Video pro Tag und IP. Gedacht war er
   * gegen Missbrauch über die nackte API — getroffen hat er den zahlenden Kunden: Sein ZWEITES
   * Video am selben Tag scheiterte mit „Free limit reached — 1 video per day. Sign up for
   * more." Wer gerade 9,99 € oder ein Abo bezahlt hat, liest das als Betrug, und zu Recht.
   *
   * Der Trichter schickt jetzt seine Auftragsnummer mit. Steht der Eintrag im Kiss-Log auf
   * bezahlt, geht er am Tagesdeckel vorbei — aber nicht ins Unendliche: gezählt wird pro
   * Kalendermonat, gedeckelt auf die Zahl, die die Seite verspricht. Der Zähler ist ein
   * Schutz vor einem offenen Hahn, keine Abrechnung; ein gescheiterter Lauf zählt mit.
   */
  let bezahlterAuftrag = false;
  let guthabenEmail = "";   // von wem wir ein Video abgezogen haben (für die Rückgabe)
  const genId = String((body as { genId?: string }).genId ?? "").trim();
  if (!staff && genId) {
    try {
      const log = await readKissLog();
      const eintrag = log.find(x => x.id === genId);
      if (eintrag?.paid === true) {
        const mail = String(eintrag.paidEmail || eintrag.email || "").trim().toLowerCase();

        if (eintrag.paidKind === "once") {
          /**
           * EINZELKAUF = EIN VIDEO. 9,99 € kaufen genau eines, nicht fünf.
           *
           * Gesperrt wird aber erst, wenn wirklich eines geliefert wurde (`videoUrl`) — ein
           * gescheiterter Versuch darf ihn nicht um seinen Kauf bringen.
           */
          if (eintrag.videoUrl) {
            return NextResponse.json({
              error: "Your video is already made. The next one is extra.",
              extraNeeded: true, priceCents: EXTRA_VIDEO_CENTS,
            }, { status: 402 });
          }
          bezahlterAuftrag = true;
        } else {
          /**
           * ABO = DAS MONATSGUTHABEN SEINER PERSON, nicht dieses Auftrags. Gezählt wird an
           * der E-Mail, damit es dasselbe Guthaben ist, egal in welchem Thema er generiert.
           *
           * Ist das Guthaben leer, es besteht aber ein laufendes Abo, wird der Monat hier
           * nachgetragen: Der einzige Ort, an dem bisher gutgeschrieben wurde, war die
           * Rückkehr von der Kasse — bei der automatischen Verlängerung kam nie jemand
           * zurück, und der Abonnent stand mit leeren Händen da.
           */
          let rest = mail ? await spendVideoCredit(mail) : null;
          if (rest === null && mail && await hasActiveSubscription(mail).catch(() => false)) {
            await grantMonthlySubscriptionCredits(mail).catch(() => 0);
            rest = await spendVideoCredit(mail);
          }
          if (rest === null && mail) {
            return NextResponse.json({
              error: `Your ${INCLUDED_VIDEOS_PER_MONTH} videos for this month are used up.`,
              extraNeeded: true, priceCents: EXTRA_VIDEO_CENTS,
            }, { status: 402 });
          }
          // Ohne bekannte Adresse (Altfall) bleibt der alte Deckel am Auftrag — besser als
          // einen zahlenden Kunden auszusperren.
          if (rest === null) {
            const monat = new Date().toISOString().slice(0, 7);
            const bisher = eintrag.videoMonth === monat ? (eintrag.videoCount ?? 0) : 0;
            if (bisher >= INCLUDED_VIDEOS_PER_MONTH) {
              return NextResponse.json({
                error: `Your ${INCLUDED_VIDEOS_PER_MONTH} videos for this month are used up.`,
                extraNeeded: true, priceCents: EXTRA_VIDEO_CENTS,
              }, { status: 402 });
            }
            eintrag.videoMonth = monat;
            eintrag.videoCount = bisher + 1;
            await writeKissLog(log);
          } else {
            guthabenEmail = mail;
          }
          bezahlterAuftrag = true;
        }
      }
      /**
       * ABO OHNE STEMPEL AM AUFTRAG (Owner 03.08.2026: „wieso steht schon wieder 1 video
       * per day? Free?" — nach einem Abo-Abschluss mit 100%-Gutschein).
       *
       * Das Abo haengt an der ADRESSE, der Stempel aber am AUFTRAG — wer sein Abo in einem
       * anderen Moment abschloss (Gutschein-Kasse, anderes Thema), stand hier als Gast da
       * und lief in die Gast-Sperre. Jetzt: Traegt der Eintrag eine Adresse mit laufendem
       * Abo, gilt der Abo-Weg — Monatsvideo abbuchen, weiter.
       */
      if (!bezahlterAuftrag && eintrag) {
        const mail2 = String(eintrag.email || eintrag.paidEmail || "").trim().toLowerCase();
        /**
         * GEKAUFTE VIDEO-CREDITS ZAEHLEN AUCH OHNE STEMPEL AM AUFTRAG (Owner 03.08.2026:
         * „es wird gar kein Video erzeugt … der ist nur am Rendern, und ich sehe keinen
         * Auftrag an Pixverse" — „ein mega Fehler").
         *
         * DER BRUCH LAG ZWISCHEN BROWSER UND SERVER: Der Trichter setzt „bezahlt", sobald
         * die Adresse Video-Credits hat (KissFunnel: `d.abo || d.left > 0`) und ueberspringt
         * dann die Kasse. Diese Route kannte aber nur zwei bezahlte Wege — Auftrag mit
         * `paid: true` oder laufendes Abo. Credits prueft sie nie. Ergebnis: Der Kunde sieht
         * „Bezahlt", drueckt, und der Server behandelt ihn als Gast — seit die Gratis-Grenze
         * auf 0 steht, heisst das Absage statt Video. Es traefe JEDEN, der ein Video
         * nachgekauft hat (2,99 = ein Credit).
         *
         * Zuerst die Credits, dann das Abo: Wer beides hat, soll das bereits BEZAHLTE Stueck
         * zuerst verbrauchen, nicht sein Monatskontingent.
         */
        if (mail2) {
          const restCred = await spendVideoCredit(mail2).catch(() => null);
          if (restCred !== null) { bezahlterAuftrag = true; guthabenEmail = mail2; }
        }
        if (!bezahlterAuftrag && mail2 && await hasActiveSubscription(mail2).catch(() => false)) {
          let rest = await spendVideoCredit(mail2);
          if (rest === null) { await grantMonthlySubscriptionCredits(mail2).catch(() => 0); rest = await spendVideoCredit(mail2); }
          if (rest !== null) { bezahlterAuftrag = true; guthabenEmail = mail2; }
          else return NextResponse.json({
            error: `Your ${INCLUDED_VIDEOS_PER_MONTH} videos for this month are used up.`,
            extraNeeded: true, priceCents: EXTRA_VIDEO_CENTS,
          }, { status: 402 });
        }
      }
    } catch { /* im Zweifel gilt der normale Weg — lieber Deckel als Ausfall */ }
  }
  /**
   * WER DAS AUSGELOEST HAT — WIRD AB JETZT AUFGESCHRIEBEN (Owner 03.08.2026: „wer hat das
   * hier generiert?", zu drei Pixverse-Laeufen, die er nicht selbst gestartet hat).
   *
   * Die Frage war nicht zu beantworten: Diese Route hat NICHTS mitgeschrieben. Nur der
   * Kuss-Trichter meldete seine Auftraege ueber /api/kiss-log nach — alles vom
   * Holiday-Trichter, vom Pruefstand oder aus einem direkten API-Aufruf lief spurlos durch.
   * Am 02.08.2026 standen 37 Besucher im Kuss-Protokoll, kein einziger mit Video, und
   * trotzdem lief die Pixverse-Rechnung.
   *
   * `quelle` kommt aus dem Referer, weil der Trichter kein Thema mitschickt und ich den
   * bezahlten Weg dafuer nicht anfassen wollte: Die Seite, von der der Aufruf kam, sagt
   * genau das Gewuenschte (…/themes/kiss, …/themes/holiday, /tools/…), und sie kostet nichts.
   */
  const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "").trim();
  const device = (request.headers.get("x-lb-device") || "").trim();
  const quelle = (() => {
    const ref = request.headers.get("referer") || "";
    try { return new URL(ref).pathname.slice(0, 60) || "unbekannt"; } catch { return "unbekannt"; }
  })();
  /** Schreibt einen Eintrag. Wirft nie und wird NICHT abgewartet — ein Protokoll darf eine
   *  bezahlte Erzeugung weder verzoegern noch kippen. */
  const protokoll = (videoId?: string, fehler?: string) => {
    void addVideoLog({
      at: new Date().toISOString(),
      quelle, staff, bezahlt: bezahlterAuftrag,
      email: guthabenEmail || undefined,
      device: device || undefined,
      ip: ip || undefined,
      genId: genId || undefined,
      videoId, anbieter: "pixverse", fehler,
    });
  };

  // Anti-abuse cap: a non-staff caller (guest / direct API) may trigger at most
  // FREE_VIDEO_GEN_PER_DAY (default 1) generations per IP per day. Guests normally never
  // reach here — GO plays a pre-generated video — so this only bites direct-API abuse and
  // caps runaway Pixverse spend. Admin/staff bypass. Keyed on the Vercel-set client IP
  // (can't be spoofed like a header); device id is only a dev-local fallback.
  if (!staff && !bezahlterAuftrag) {
    const gateKey = ip ? `ip:${ip}` : device ? `d:${device}` : "anon";
    const gate = await bumpDailyGenLimit(gateKey);
    if (!gate.ok) {
      // Auch die Abweisung gehoert ins Protokoll: Sie zeigt, WER es versucht hat — und ob
      // jemand dauernd gegen die Grenze laeuft.
      protokoll(undefined, "tagesgrenze");
      // Die Zahl in der Meldung muss zur Grenze passen (Owner 03.08.2026: bei Grenze 0
      // stand hier „1 video per day" — eine Meldung, die nicht stimmt, liest sich als Bug).
      return NextResponse.json(
        { error: gate.limit <= 0
            ? "Videos are paid — please top up your balance."
            : `Free limit reached — ${gate.limit} video per day. Sign up for more.`,
          limitReached: true, resetsDaily: true, limit: gate.limit },
        { status: 429 },
      );
    }
  }
  const chargeOwner = !!curatorId && !staff;
  if (chargeOwner) {
    const charge = await chargeCredits(curatorId, VIDEO_CREDITS, "try-on video");
    if (!charge.ok) return NextResponse.json({ error: "Not enough credits for a video.", outOfCredits: true, credits: charge.info }, { status: 402 });
  }
  const refund = () => {
    if (chargeOwner) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund");
    // Kommt der Auftrag gar nicht erst zustande, bekommt der Abonnent sein Video zurueck —
    // sonst kostet ihn ein Fehler auf unserer Seite eines seiner fünf.
    if (guthabenEmail) { void grantVideoCredits(guthabenEmail, "", 1); guthabenEmail = ""; }
  };

  // TEST: provider=fashn (admin-only) → animiere das fertige Try-on-Bild mit FASHN
  // Image-to-Video statt Pixverse. Prefix "fashn:" für den GET-Poll.
  if (String((body as { provider?: string }).provider ?? "") === "fashn") {
    if (!staff) { refund(); return NextResponse.json({ error: "FASHN-Video ist nur für Admin (Test)." }, { status: 403 }); }
    if (!image) { refund(); return NextResponse.json({ error: "FASHN-Video braucht ein Try-on-Bild (image)." }, { status: 400 }); }
    const f = await fashnStartVideo(image);
    if (!f.videoId) { refund(); return NextResponse.json({ error: f.error ?? "FASHN-Video-Start fehlgeschlagen." }, { status: 502 }); }
    return NextResponse.json({ ok: true, videoId: `fashn:${f.videoId}`, curatorId, status: "processing" });
  }

  try {
    const r = reference
      ? await pixverseStartReference(key, garment, person, turnaround, promptWithScene, slowmo, body.hd === true)
      : await pixverseStart(key, image, turnaround, promptWithScene);
    if (!r.videoId) {
      protokoll(undefined, String(r.error ?? "start fehlgeschlagen").slice(0, 200));
      refund(); return NextResponse.json({ error: r.error ?? "Video start failed.", promptUsed: (r as any).promptUsed }, { status: 502 });
    }
    // DIE NUMMER IST DIE BRUECKE ZUR PIXVERSE-ABRECHNUNG: Mit ihr laesst sich ein Lauf dort
    // eindeutig einem Besucher hier zuordnen — genau das fehlte am 02.08.2026.
    protokoll(`pv:${r.videoId}`);
    return NextResponse.json({ ok: true, videoId: `pv:${r.videoId}`, curatorId, status: "processing", promptUsed: (r as any).promptUsed });
  } catch (e) {
    protokoll(undefined, e instanceof Error ? e.message.slice(0, 200) : "Ausnahme");
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

  // FASHN-Test-Video pollen.
  if (raw.startsWith("fashn:")) {
    try {
      const r = await fashnPollVideo(id);
      if (r.status === "failed" && curatorId) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund");
      return NextResponse.json(r);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "FASHN poll failed." }, { status: 500 });
    }
  }

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
