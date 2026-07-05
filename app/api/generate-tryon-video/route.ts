import { NextResponse } from "next/server";
import { readTryThisLookState, uploadTryThisLookBytes, getSignedUrl } from "@/lib/try-this-look-store";
import { chargeCredits, refundCredits, VIDEO_CREDITS } from "@/lib/curator-budget";
import { authorizeStudio } from "@/lib/studio-auth";
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
    default: return "an einem eleganten, stilvollen Ort";
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
async function pixverseStartReference(key: string, garment: string, person: string, turnaround: boolean, customPrompt?: string): Promise<{ videoId?: string; error?: string; promptUsed?: string }> {
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
  const reqBody = {
    image_references: [
      { type: "subject", img_id: pId, ref_name: personRef },
      { type: "subject", img_id: gId, ref_name: outfitRef },
    ],
    prompt: promptUsed,
    // TEST settings (initial — we'll raise these once the prompt is right):
    // 360p / 3:4 / 3s for the normal present video; 360° turnaround keeps V6/10s.
    model: "v6",                     // V6 keeps the reference outfit/person (v4.5 ignored it)
    duration: turnaround ? 10 : 5,   // 5s; 360p keeps cost low
    quality: turnaround ? "720p" : "360p",
    aspect_ratio: turnaround ? "9:16" : "3:4",
    sound_effect_switch: turnaround,           // no sound on the cheap present video (cost)
    sound_effect_content: MUSIC,
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
  const body = (await request.json().catch(() => ({}))) as { lookId?: string; image?: string; turnaround?: boolean; garment?: string; person?: string; prompt?: string; dryRun?: boolean };
  const lookId = String(body.lookId ?? "").trim();
  const image = String(body.image ?? "");
  const turnaround = body.turnaround === true; // 360° tier
  const customPrompt = String(body.prompt ?? ""); // try-on window can override to tune it
  // Reference mode (lingerie): garment + person photo → Pixverse dresses + animates
  // in one step, keeping the face. Falls back to single-image when not provided.
  const garment = String(body.garment ?? "");
  const person = String(body.person ?? "");
  const reference = !!garment && !!person;
  if (!image && !reference) return NextResponse.json({ error: "image required." }, { status: 400 });

  const { curatorId, category } = await lookOf(lookId);
  // Auto-match the scene to the look: replace {ort}/{location}/{umgebung} in the prompt with a
  // category-appropriate setting. Pure TEXT substitution — the @Bild1/@Bild2 image bindings
  // are untouched, so it never swaps the model/outfit.
  const scene = sceneForCategory(category);
  const promptWithScene = customPrompt ? customPrompt.replace(/\{ort\}|\{location\}|\{umgebung\}/gi, scene) : customPrompt;
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

  // Staff (admin or an acting-as curator session, e.g. Szidonia) generate for FREE
  // — no credit charge, no paywall. End-user charging comes with Stripe.
  const staff = (await authorizeStudio(request)).ok;
  const chargeOwner = !!curatorId && !staff;
  if (chargeOwner) {
    const charge = await chargeCredits(curatorId, VIDEO_CREDITS, "try-on video");
    if (!charge.ok) return NextResponse.json({ error: "Not enough credits for a video.", outOfCredits: true, credits: charge.info }, { status: 402 });
  }
  const refund = () => { if (chargeOwner) void refundCredits(curatorId, VIDEO_CREDITS, "try-on video refund"); };

  try {
    const r = reference
      ? await pixverseStartReference(key, garment, person, turnaround, promptWithScene)
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
