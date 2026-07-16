// Generate ONE program feed post (image + caption) with OpenAI. Image: gpt-image-1 edits
// the influencer's reference photo into a travel-editorial scene at the destination
// (same pattern as app/api/admin-hero). Caption: a short first-person place report.
// Reused by the try-this-look "generate-program-feed" admin action.

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
const TEXT_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini";

// Normalise ANY uploaded photo (incl. iPhone HEIC/HEIF) → a downscaled JPEG buffer via
// sharp, so OpenAI/FASHN always receive a supported format. Null if it can't be decoded.
export async function normalizeOwnerPhoto(buffer: Buffer, max = 1024): Promise<{ buffer: Buffer; mime: string } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buffer).rotate().resize(max, max, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    return { buffer: out, mime: "image/jpeg" };
  } catch {
    return null;
  }
}

// Edit one or MORE reference photos into a scene per `prompt` (2 refs = both people
// together in frame). `quality` "high" keeps faces truer (used for the owner composition).
// Returns a PNG data URL, or null.
export async function generateProgramImage(refs: { buffer: Buffer; mime: string }[], prompt: string, quality: "low" | "medium" | "high" = "medium"): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || refs.length === 0) return null;
  try {
    const form = new FormData();
    form.append("model", IMAGE_MODEL);
    form.append("prompt", prompt);
    form.append("size", "1024x1536");
    form.append("quality", quality);
    form.append("n", "1");
    refs.forEach((r, i) => {
      const ext = r.mime.includes("png") ? "png" : r.mime.includes("webp") ? "webp" : "jpg";
      form.append("image[]", new Blob([new Uint8Array(r.buffer)], { type: r.mime }), `ref${i}.${ext}`);
    });
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const b64 = data?.data?.[0]?.b64_json;
    return b64 ? `data:image/png;base64,${b64}` : null;
  } catch {
    return null;
  }
}

// LINGERIE path — a virtual TRY-ON that dresses HER (modelImage) in OUR actual pool garment
// (garmentImageUrl). OpenAI refuses lingerie on a person (safety_violations=[sexual]); FASHN
// does not, and this genuinely uses our pool. Returns a PNG data URL / URL, or null.
export async function generateLingerieTryon(modelBuffer: Buffer, modelMime: string, garmentImageUrl: string, prompt: string, errs?: string[]): Promise<string | null> {
  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey || !garmentImageUrl) { errs?.push(!apiKey ? "no FASHN_API_KEY" : "no garment url"); return null; }
  const RUN = process.env.FASHN_API_ENDPOINT ?? "https://api.fashn.ai/v1/run";
  const STATUS = process.env.FASHN_STATUS_ENDPOINT ?? "https://api.fashn.ai/v1/status";
  try {
    // Fetch the pool garment → base64.
    const gRes = await fetch(garmentImageUrl);
    if (!gRes.ok) { errs?.push(`garment fetch ${gRes.status}`); return null; }
    const gBuf = Buffer.from(await gRes.arrayBuffer());
    const gMime = gRes.headers.get("content-type") || "image/jpeg";
    const productImage = `data:${gMime};base64,${gBuf.toString("base64")}`;
    const modelImage = `data:${modelMime};base64,${modelBuffer.toString("base64")}`;

    const createRes = await fetch(RUN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model_name: "tryon-max",
        inputs: { model_image: modelImage, product_image: productImage, prompt, aspect_ratio: "2:3", resolution: "1k", generation_mode: "balanced", num_images: 1, output_format: "png", return_base64: true },
      }),
    });
    const created = await createRes.json().catch(() => null);
    const id = created?.id;
    if (!createRes.ok || !id) { errs?.push(`create ${createRes.status}: ${JSON.stringify(created).slice(0, 400)}`); return null; }
    for (let i = 0; i < 55; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const st = await fetch(`${STATUS}/${id}`, { headers: { Authorization: `Bearer ${apiKey}` } });
      const sp = await st.json().catch(() => null);
      const status = String(sp?.status ?? "").toLowerCase();
      if (status === "completed") return sp?.output?.[0] ?? null;
      if (status === "failed" || status === "error" || sp?.error) { errs?.push(`status ${status}: ${JSON.stringify(sp?.error ?? sp).slice(0, 400)}`); return null; }
    }
    errs?.push("timeout after 55s");
    return null;
  } catch (e) {
    errs?.push(`exception: ${String((e as Error)?.message || e).slice(0, 200)}`);
    return null;
  }
}

// OWNER-TOGETHER path — fal.ai FLUX Kontext Max (multi-image) composes BOTH people into one
// scene while preserving each identity far better than gpt-image-1's multi-ref edit (which
// distorted the owner's face). Takes reference image URLs (fal fetches by URL). Returns the
// result image URL, or null.
export async function generateTogetherFal(imageUrls: string[], prompt: string): Promise<string | null> {
  const key = process.env.FAL_KEY?.trim();
  if (!key || imageUrls.length < 2) return null;
  const model = process.env.FAL_KONTEXT_MULTI_MODEL?.trim() || "fal-ai/flux-pro/kontext/max/multi";
  try {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_urls: imageUrls, aspect_ratio: "3:4", num_images: 1, output_format: "png", safety_tolerance: "6", enable_safety_checker: false }),
    });
    const data = await res.json().catch(() => null) as { images?: { url?: string }[]; has_nsfw_concepts?: boolean[]; error?: unknown } | null;
    // fal blacks out images its checker flags NSFW (common with suggestive influencer refs) —
    // treat that as a failure so the admin gets a clear message, not a black post.
    if (data?.has_nsfw_concepts?.[0]) return null;
    const url = data?.images?.[0]?.url;
    return (res.ok && url) ? url : null;
  } catch {
    return null;
  }
}

// STEP 2 of the owner flow — dress the woman in the SELECTED garment while keeping both
// people, via fal Qwen-Image-Edit-Plus (multi-image, and it does NOT block lingerie the way
// gpt-image-1 does). baseImageUrl = the composed two-person scene; garmentImageUrl = the pool
// garment. Returns the result URL, or null.
export async function qwenDressGarment(baseImageUrl: string, garmentImageUrl: string, location: string): Promise<string | null> {
  const key = process.env.FAL_KEY?.trim();
  if (!key || !baseImageUrl || !garmentImageUrl) return null;
  const model = process.env.FAL_QWEN_EDIT_MODEL?.trim() || "fal-ai/qwen-image-edit-plus";
  const prompt = `The woman in image 1 is now wearing exactly the outfit shown in image 2 (same garment, colour and cut). Keep BOTH people and both faces from image 1 unchanged, standing together on a terrace in ${location}. Photorealistic, elegant.`;
  try {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_urls: [baseImageUrl, garmentImageUrl], num_images: 1, output_format: "png" }),
    });
    const data = await res.json().catch(() => null) as { images?: { url?: string }[]; has_nsfw_concepts?: boolean[] } | null;
    if (data?.has_nsfw_concepts?.[0]) return null;
    const url = data?.images?.[0]?.url;
    return (res.ok && url) ? url : null;
  } catch {
    return null;
  }
}

// Swap a REAL face (swapImageUrl) onto a generated scene (baseImageUrl) via fal face-swap —
// preserves the owner's ACTUAL likeness, which generative editors redraw and lose. Returns
// the result image URL, or null.
export async function faceSwap(baseImageUrl: string, swapImageUrl: string): Promise<string | null> {
  const key = process.env.FAL_KEY?.trim();
  if (!key || !baseImageUrl || !swapImageUrl) return null;
  const model = process.env.FAL_FACESWAP_MODEL?.trim() || "fal-ai/face-swap";
  try {
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ base_image_url: baseImageUrl, swap_image_url: swapImageUrl }),
    });
    const data = await res.json().catch(() => null) as { image?: { url?: string } } | null;
    return (res.ok && data?.image?.url) ? data.image.url : null;
  } catch {
    return null;
  }
}

// Build the image prompt: keep her identity, place her in the destination, dress per outfit.
// When `ownerName` is set, a SECOND reference photo (the owner) is also passed and both
// people appear together in the shot.
export function buildImagePrompt(location: string, outfit: string, lingerie: boolean, ownerName?: string): string {
  const together = !!ownerName;
  return [
    together
      ? `Create ONE photorealistic travel photograph of TWO people together in ${location}: the WOMAN from the first reference image and the PERSON from the second reference image (${ownerName}). Keep BOTH faces and identities exactly. They are together, both clearly visible, natural candid duo shot.`
      : `Create ONE photorealistic, aspirational travel-editorial photograph of THE SAME WOMAN shown in the reference image — keep her face, hair and identity exactly. She is in ${location}, wearing ${outfit}.`,
    lingerie
      ? "Tasteful, elegant boudoir-editorial mood in a luxurious interior; classy and non-explicit."
      : "Glamorous luxury-lifestyle setting that clearly reads as the destination (a recognisable, beautiful backdrop), soft natural light, golden hour.",
    "High-end fashion magazine feel, flattering framing. No text, logos, overlays, watermarks or badges.",
  ].filter(Boolean).join("\n");
}

// A short first-person caption: what she discovered + a fashion note + a place fact.
export async function generateProgramCaption(location: string, day: number, outfit: string, lingerie: boolean, ownerName?: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const fallback = `Tag ${day} in ${location}. ${outfit}. ✨`;
  if (!apiKey) return fallback;
  const prompt = [
    `Du bist eine Luxus-Reise-Influencerin auf Tag ${day} ihrer Reise nach ${location}.`,
    ownerName ? `Du reist zusammen mit ${ownerName}; erwähne die gemeinsame Reise natürlich.` : "",
    `Schreibe eine kurze Instagram-Caption (2–3 Sätze, Deutsch, Ich-Form) über etwas, das du heute in ${location} entdeckt hast,`,
    ownerName ? "" : `plus einen kleinen Fashion-Hinweis zu deinem Look (${outfit}).`,
    lingerie ? "Der Ton darf verführerisch-elegant sein, aber geschmackvoll." : "Ton: elegant, aspirational.",
    "Füge am Ende 2–3 passende Hashtags an. Keine Übertreibung, keine Emoji-Flut. Gib NUR die Caption zurück.",
  ].filter(Boolean).join(" ");
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: TEXT_MODEL, input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }] }),
    });
    if (!res.ok) return fallback;
    const data = await res.json().catch(() => null);
    const text = String(
      data?.output_text ??
      data?.output?.flatMap((i: any) => i?.content ?? [])?.map((c: any) => c?.text ?? "")?.join("\n") ??
      ""
    ).trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}
