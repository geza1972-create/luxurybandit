import { completeReservation, getAccountId, refundReservation, reserveCredits } from "@/lib/billing";
import { reserveAnonymousTryOnAttempt } from "@/lib/tryon-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const supportedAspectRatios = new Set(["1:1", "3:4", "4:5", "9:16"]);

function outputSize(aspectRatio: string) {
  if (aspectRatio === "9:16") return "1024x1536";
  if (aspectRatio === "3:4") return "1024x1536";
  if (aspectRatio === "4:5") return "1024x1536";
  return "1024x1024";
}

async function fileToBase64DataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  return `data:${file.type || "image/png"};base64,${b64}`;
}

// --- FASHN virtual try-on (used when a person photo is available) ---
async function runFashnTryOn(
  fashnKey: string,
  garmentDataUrl: string,
  personDataUrl: string,
  category: string
): Promise<string> {
  // Start prediction — use same format as /api/generate-fashn (tryon-max model)
  const startRes = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fashnKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_name: "tryon-max",
      inputs: {
        model_image: personDataUrl,
        product_image: garmentDataUrl,
        aspect_ratio: "1:1",
        resolution: "1k",
        generation_mode: "balanced",
        num_images: 1,
        output_format: "png",
        return_base64: true
      }
    })
  });

  const startText = await startRes.text();
  let startPayload: any = null;
  try { startPayload = JSON.parse(startText); } catch { /* empty */ }

  if (!startRes.ok) {
    throw new Error(startPayload?.error ?? startPayload?.detail ?? `FASHN error ${startRes.status}`);
  }

  const predictionId = startPayload?.id;
  if (!predictionId) throw new Error("FASHN returned no prediction ID.");

  // Poll until done (max ~150s)
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    const pollRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
      headers: { Authorization: `Bearer ${fashnKey}` }
    });
    const pollText = await pollRes.text();
    let poll: any = null;
    try { poll = JSON.parse(pollText); } catch { /* empty */ }

    const status: string = poll?.status ?? "";
    if (status === "completed") {
      const output = Array.isArray(poll?.output) ? poll.output[0] : poll?.output;
      if (!output) throw new Error("FASHN completed but returned no image.");
      // return_base64: true → output is already a base64 string
      if (typeof output === "string" && !output.startsWith("http")) {
        return `data:image/png;base64,${output}`;
      }
      // fallback: output is a URL → download it
      const imgRes = await fetch(output);
      if (!imgRes.ok) throw new Error("FASHN result image could not be downloaded.");
      const imgBuf = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
      return `data:${contentType};base64,${Buffer.from(imgBuf).toString("base64")}`;
    }
    if (status === "failed") {
      throw new Error(poll?.error ?? "FASHN try-on failed.");
    }
    // still starting / in_queue / processing → keep polling
  }
  throw new Error("FASHN try-on timed out after 150 seconds.");
}

// --- FASHN product-to-model (AI model, no person photo required) ---
async function runFashnProductToModel(
  fashnKey: string,
  productDataUrl: string,
  prompt: string,
  aspectRatio: string,
  modelGender: string,
  skinTone: string
): Promise<string> {
  const skinToneDesc =
    skinTone === "dark" ? "dark skin tone" :
    skinTone === "asian" ? "East Asian appearance" :
    skinTone === "light" ? "light / olive skin tone" :
    "fair / white skin tone";

  const fullPrompt = [
    `Professional fashion campaign image of a ${modelGender === "man" ? "male" : "female"} model with ${skinToneDesc} wearing the exact garment shown.`,
    "CRITICAL: Reproduce the garment exactly — material, texture, cut, silhouette, logos, print, and color must match the reference.",
    "Show the full garment without cropping. Clean studio background. No text or badges.",
    prompt ? `Additional instruction: ${prompt}` : ""
  ].filter(Boolean).join(" ");

  const startRes = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fashnKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_name: "product-to-model",
      inputs: {
        product_image: productDataUrl,
        prompt: fullPrompt,
        aspect_ratio: aspectRatio,
        resolution: "1k",
        generation_mode: "balanced",
        num_images: 1,
        output_format: "png",
        return_base64: true
      }
    })
  });

  const startText = await startRes.text();
  let startPayload: any = null;
  try { startPayload = JSON.parse(startText); } catch { /* empty */ }

  if (!startRes.ok) {
    throw new Error(startPayload?.error ?? startPayload?.detail ?? `FASHN error ${startRes.status}`);
  }

  const predictionId = startPayload?.id;
  if (!predictionId) throw new Error("FASHN returned no prediction ID.");

  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));

    const pollRes = await fetch(`https://api.fashn.ai/v1/status/${predictionId}`, {
      headers: { Authorization: `Bearer ${fashnKey}` }
    });
    const pollText = await pollRes.text();
    let poll: any = null;
    try { poll = JSON.parse(pollText); } catch { /* empty */ }

    const status: string = poll?.status ?? "";
    if (status === "completed") {
      const output = Array.isArray(poll?.output) ? poll.output[0] : poll?.output;
      if (!output) throw new Error("FASHN completed but returned no image.");
      if (typeof output === "string" && output.startsWith("data:image/")) return output;
      const imgRes = await fetch(output);
      if (!imgRes.ok) throw new Error("FASHN result image could not be downloaded.");
      const imgBuf = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
      return `data:${contentType};base64,${Buffer.from(imgBuf).toString("base64")}`;
    }
    if (status === "failed") {
      throw new Error(poll?.error ?? "FASHN product-to-model failed.");
    }
  }
  throw new Error("FASHN timed out after 150 seconds.");
}

// --- OpenAI Images Edit (used for AI-model mode, no person photo) ---
async function runOpenAiImageEdit(
  apiKey: string,
  garmentImages: File[],
  prompt: string,
  aspectRatio: string,
  viewDirectionInstruction: string,
  modelTypeInstruction: string
): Promise<string> {
  const garmentCount = garmentImages.length;
  const garmentRef = garmentCount === 1
    ? "Image 1 is the garment reference."
    : `Images 1–${garmentCount} are all photos of the SAME garment from different angles. Use ALL of them to understand the exact garment.`;

  const fullPrompt = [
    prompt ? `User instruction: ${prompt}` : "",
    `Task: Fashion campaign image. ${garmentRef} No person photo provided — ${modelTypeInstruction}`,
    "CRITICAL — Garment fidelity: The output garment must be IDENTICAL to the reference in material, texture, cut, silhouette, logos, print, and color. Do NOT substitute or upgrade the garment.",
    "If the reference shows a shiny/satin sauna suit or sweat suit, the output must show exactly that — not a regular sweatshirt or hoodie.",
    "Reproduce every detail: fabric sheen, elasticated cuffs, collar style, logo placement, overall shape.",
    viewDirectionInstruction,
    "Show the full garment from collar to hem without cropping. Clean studio background. No text, prices, or badges."
  ].filter(Boolean).join("\n\n");

  const openAiForm = new FormData();
  openAiForm.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
  openAiForm.append("prompt", fullPrompt);
  openAiForm.append("size", outputSize(aspectRatio));
  openAiForm.append("quality", "medium");
  openAiForm.append("n", "1");

  for (let i = 0; i < garmentImages.length; i++) {
    const img = garmentImages[i];
    const buf = await img.arrayBuffer();
    openAiForm.append(
      "image[]",
      new Blob([buf], { type: img.type || "image/png" }),
      `reference-${i + 1}.${img.type?.includes("jpeg") ? "jpg" : "png"}`
    );
  }

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: openAiForm
  });

  const responseText = await response.text();
  let payload: any = null;
  try { payload = JSON.parse(responseText); } catch { /* empty */ }

  if (!response.ok) {
    console.error("[try-this-look-openai] OpenAI error", response.status, responseText?.slice(0, 1000));
    throw new Error(payload?.error?.message ?? responseText?.slice(0, 300) ?? "OpenAI could not create the image.");
  }

  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image.");
  return `data:image/png;base64,${b64}`;
}

// --- Step 1 of 2-step pipeline: recreate the model in the desired view direction ---
// Uses OpenAI image editing to rebuild the person with the same face/body but in a new pose.
// The result is then passed to FASHN as the model_image (Step 2).
async function regenerateModelInPose(
  apiKey: string,
  personImageFile: File,
  viewDirection: "front" | "back" | "side",
  gender: string
): Promise<string> {
  const viewDesc =
    viewDirection === "back"
      ? "turned fully away from the camera, showing their back, in a rear-view fashion pose"
      : viewDirection === "side"
      ? "standing in a clean 90-degree side profile pose, facing left or right"
      : "facing the camera directly in a straight front-view fashion pose";

  const prompt = [
    `Recreate the exact same person from the reference photo — ${viewDesc}.`,
    "IDENTITY: Keep the same face (features, jawline, eye shape), same hair color, same hair length and style, same skin tone, same body proportions.",
    "DO NOT change the person's appearance — only change their pose and the direction they face.",
    "POSE: The person is standing in a relaxed, neutral full-body fashion model pose suitable for a clothing catalogue.",
    "CLOTHING: The person should be wearing a simple, plain, light-colored form-fitting outfit (e.g. a neutral seamless base layer or a simple fitted bodysuit in white or beige). This is a placeholder — the actual garment will be applied separately.",
    "Show the complete body from head to feet, nothing cropped.",
    "BACKGROUND: Pure white studio background. Professional even fashion photography lighting. No shadows.",
    "No text, no watermarks, no logos."
  ].join(" ");

  const personBlob = new Blob([await personImageFile.arrayBuffer()], { type: personImageFile.type || "image/png" });

  const form = new FormData();
  form.append("image", personBlob, "person.png");
  form.append("prompt", prompt);
  form.append("model", "gpt-image-1");
  form.append("size", "1024x1536");
  form.append("n", "1");
  form.append("quality", "medium");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  const responseText = await response.text();
  let payload: any = null;
  try { payload = JSON.parse(responseText); } catch { /* empty */ }

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Model pose generation failed (${response.status}).`);
  }

  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image for model pose generation.");
  return `data:image/png;base64,${b64}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const fashnKey = process.env.FASHN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing from .env.local." },
      { status: 400 }
    );
  }

  const incomingForm = await request.formData();
  const garmentImages = incomingForm.getAll("image").filter((f): f is File => f instanceof File);
  const garmentImage = garmentImages[0];
  const personImage = incomingForm.get("modelImage");
  const prompt = String(incomingForm.get("prompt") ?? "").trim();
  const visitorId = String(incomingForm.get("visitorId") ?? "").trim();
  const lookId = String(incomingForm.get("lookId") ?? "").trim();
  const requestedAspectRatio = String(incomingForm.get("aspectRatio") ?? "").trim();
  const aspectRatio = supportedAspectRatios.has(requestedAspectRatio) ? requestedAspectRatio : "4:5";
  // "no-model" mode: ghost mannequin / garment-only shot, always OpenAI
  const requestedMode = String(incomingForm.get("mode") ?? "");
  const isNoModelMode = requestedMode === "no-model";
  // Explicit provider override ("openai" | "fashn") — if not set, auto-detect
  const providerOverride = isNoModelMode ? "openai" : String(incomingForm.get("provider") ?? "");
  // Garment category for FASHN — map "lingerie" to "one-pieces" (FASHN API value)
  const rawCategory = String(incomingForm.get("category") ?? "tops");
  const category = rawCategory === "lingerie" ? "one-pieces" : rawCategory;
  // View direction for the generated image
  const rawViewDirection = String(incomingForm.get("viewDirection") ?? "front");
  const viewDirection = ["front", "back", "side"].includes(rawViewDirection)
    ? (rawViewDirection as "front" | "back" | "side")
    : "front";
  // 2-step pipeline: regenerate model pose first (OpenAI), then FASHN try-on
  const regenModelPose = String(incomingForm.get("regenModelPose") ?? "") === "true";
  const viewDirectionInstruction =
    viewDirection === "back"
      ? "IMPORTANT: Show the model from BEHIND (rear / back view). The garment's back side must be clearly visible."
      : viewDirection === "side"
      ? "IMPORTANT: Show the model from the SIDE (profile / side view). The garment's side profile must be clearly visible."
      : "Show the model from the FRONT (front view).";
  // Model type for AI model generation
  const modelGender = String(incomingForm.get("modelGender") ?? "woman");
  const skinTone = String(incomingForm.get("skinTone") ?? "white");
  const skinToneDesc =
    skinTone === "dark" ? "dark skin tone" :
    skinTone === "asian" ? "East Asian appearance" :
    skinTone === "light" ? "light / olive skin tone" :
    "fair / white skin tone";
  const modelTypeInstruction = `Generate a professional ${modelGender === "man" ? "male" : "female"} fashion model with ${skinToneDesc}.`;

  if (!(garmentImage instanceof File)) {
    return NextResponse.json({ error: "No garment image received." }, { status: 400 });
  }

  const accountId = getAccountId(request);
  const tryOnLimit = reserveAnonymousTryOnAttempt(accountId, visitorId, lookId);
  if (!tryOnLimit.ok) {
    return NextResponse.json({ error: tryOnLimit.error }, { status: 429 });
  }
  // Premium AI (FASHN with person photo) costs more than Light AI (OpenAI)
  const billingAction = (providerOverride === "fashn" || (providerOverride !== "openai" && Boolean(fashnKey) && personImage instanceof File))
    ? "ai-premium"
    : "ai-light";
  const reservation = reserveCredits(accountId, billingAction);
  if (!reservation.ok) {
    return NextResponse.json(
      { error: reservation.error, credits: reservation.status },
      { status: 402 }
    );
  }

  try {
    const hasPersonImage = personImage instanceof File;
    // Determine which provider to use
    const useFashn =
      providerOverride === "fashn"
        ? true  // explicit FASHN request
        : providerOverride === "openai"
        ? false // explicit OpenAI request
        : hasPersonImage && Boolean(fashnKey); // auto: FASHN when person photo available
    let resultDataUrl: string;

    if (useFashn && fashnKey && hasPersonImage) {
      // FASHN virtual try-on: extracts garment and places it on the person photo
      const garmentDataUrl = await fileToBase64DataUrl(garmentImage);
      let personDataUrl = await fileToBase64DataUrl(personImage as File);

      if (regenModelPose) {
        // 2-step pipeline: Step 1 — recreate model in desired pose via OpenAI
        // If OpenAI blocks the image (content policy), fall back to original photo
        try {
          personDataUrl = await regenerateModelInPose(apiKey, personImage as File, viewDirection, modelGender);
        } catch (regenError) {
          console.warn("[try-this-look] Model pose regen failed, falling back to original photo:", regenError instanceof Error ? regenError.message : regenError);
          // personDataUrl stays as the original — FASHN will still produce a result, just preserving the original pose
        }
      }

      // Step 2 (or direct if regen skipped) — FASHN try-on
      resultDataUrl = await runFashnTryOn(fashnKey, garmentDataUrl, personDataUrl, category);
    } else if (useFashn && fashnKey && !hasPersonImage) {
      // FASHN product-to-model: no person photo needed — FASHN generates the model
      const garmentDataUrl = await fileToBase64DataUrl(garmentImage);
      resultDataUrl = await runFashnProductToModel(fashnKey, garmentDataUrl, prompt, aspectRatio, modelGender, skinTone);
    } else if (isNoModelMode) {
      // No Model = ghost mannequin / clean product shot — OpenAI only, no person allowed in photo.
      // For lingerie/one-pieces: OpenAI always blocks photos with people → skip immediately, save credits.
      const isRevealingCategory = rawCategory === "lingerie" || rawCategory === "one-pieces" || category === "one-pieces";
      if (isRevealingCategory) {
        refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({
          error:
            "No Model mode does not work with lingerie/one-pieces — OpenAI blocks these images. " +
            "Use 'Extract from new photo' first to remove the person and background, then try again with the clean garment image. " +
            "Or switch to 'AI Model' mode."
        }, { status: 422 });
      }
      if (!prompt) {
        refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({ error: "Prompt is empty." }, { status: 400 });
      }
      try {
        resultDataUrl = await runOpenAiImageEdit(apiKey, garmentImages, prompt, aspectRatio, viewDirectionInstruction, modelTypeInstruction);
      } catch (openAiErr) {
        const errMsg = openAiErr instanceof Error ? openAiErr.message : "";
        if (/blocked|safety|moderation|policy|rejected|invalid_image/i.test(errMsg)) {
          throw new Error(
            "The product photo contains a person — OpenAI blocked it for 'No Model' mode. " +
            "Use 'Extract from new photo' to remove the person first, then try again."
          );
        }
        throw openAiErr;
      }
    } else {
      // OpenAI Images Edit: AI generates a model wearing the garment
      if (!prompt) {
        refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({ error: "Prompt is empty." }, { status: 400 });
      }
      resultDataUrl = await runOpenAiImageEdit(apiKey, garmentImages, prompt, aspectRatio, viewDirectionInstruction, modelTypeInstruction);
    }

    return NextResponse.json({
      image: resultDataUrl,
      credits: completeReservation(accountId, reservation.reservationId)
    });
  } catch (err) {
    const credits = refundReservation(accountId, reservation.reservationId);
    const message = err instanceof Error ? err.message : "Image could not be created.";
    const friendlyMessage = /blocked|safety|moderation|policy|rejected/i.test(message)
      ? "The provider rejected this image. Please try a different product photo or model photo."
      : message;
    return NextResponse.json({ error: friendlyMessage, credits }, { status: 500 });
  }
}
