import { completeReservation, getAccountId, refundReservation, reserveCredits } from "@/lib/billing";
import { chargeCredits, refundCredits, TRYON_CREDITS } from "@/lib/curator-budget";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;

// Maps an aspect ratio to a gpt-image supported size.
function outputSize(aspectRatio: string) {
  if (aspectRatio === "1:1") return "1024x1024";
  if (aspectRatio === "16:9" || aspectRatio === "3:2") return "1536x1024";
  return "1024x1536"; // portrait default (9:16, 3:4, 4:5)
}

// OpenAI-based virtual try-on (gpt-image). Used for general apparel; FASHN stays
// available for specialised cases (e.g. lingerie).
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY fehlt in .env.local. Bitte Server nach dem Eintragen neu starten." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const garment = formData.get("image");
  const modelImage = formData.get("modelImage");
  const location = formData.get("locationImage");
  const userPrompt = String(formData.get("prompt") ?? "").trim();
  const aspectRatio = String(formData.get("aspectRatio") ?? "9:16").trim();

  // Garment is optional: with one, we transfer it onto the person; without one,
  // we style an outfit from the prompt/taste filters instead.
  const hasGarment = garment instanceof File;
  // Optional curator-uploaded location reference → used as the scene/background.
  const hasLocation = location instanceof File;
  // Image order sent to OpenAI: person = 1, garment (if any) = 2, location = next.
  const locationImgNum = hasLocation ? (hasGarment ? 3 : 2) : 0;
  const backgroundLine = hasLocation
    ? `Place the person naturally into the setting shown in Image ${locationImgNum} (a location/background reference). Match that scene's lighting, perspective, depth and mood so the person looks genuinely present there. Keep the person's identity and the garment unchanged. No text, prices, badges or overlays.`
    : "Natural, realistic result. Simple clean background. No text, prices, badges or overlays.";
  if (!(modelImage instanceof File)) {
    return NextResponse.json({ error: "Bitte ein Foto von dir hochladen." }, { status: 400 });
  }

  const accountId = getAccountId(request);
  const creditAction = "fashion-model-selected";
  const reservation = reserveCredits(accountId, creditAction);
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, credits: reservation.status }, { status: 402 });
  }

  // Credits are charged ONLY for studio "Create AI Fashion" — i.e. when a curator
  // generates their own content (curatorId present). End-user try-ons from a look
  // page are FREE and never gated by the look owner's balance: we want to measure
  // whether shoppers click try-on at all before adding any paywall.
  const chargeCuratorId = String(formData.get("curatorId") ?? "").trim();
  if (chargeCuratorId) {
    const charge = await chargeCredits(chargeCuratorId, TRYON_CREDITS, "try-on");
    if (!charge.ok) {
      refundReservation(accountId, reservation.reservationId);
      return NextResponse.json({ error: "You're out of credits. Earn more by getting likes & try-ons on your looks — or buy credits to keep going.", outOfCredits: true, credits: charge.info }, { status: 402 });
    }
  }
  const refundTryon = () => { if (chargeCuratorId) void refundCredits(chargeCuratorId, TRYON_CREDITS, "try-on refund"); };

  // Strict, full-coverage wording. The input photo may show swimwear or bare skin
  // (e.g. a beach profile pic); the OUTPUT must always be a fully-clothed editorial,
  // independent of the input — this is what gets the request past OpenAI's classifier.
  const coverageRule = "Strict coverage requirement: the output MUST depict the person fully and modestly dressed in a complete outfit, REGARDLESS of how much skin is visible in the input photo. The clothing must fully cover the chest, cleavage, torso, shoulders and hips with opaque fabric. This is a tasteful editorial fashion photograph of a clothed person. Absolutely NO swimwear, bikini, lingerie, underwear, nudity, or exposed intimate areas (chest, cleavage, groin, buttocks). If the input shows swimwear or bare skin, replace it entirely with full, elegant clothing.";
  const prompt = hasGarment
    ? [
        "Image 1 is a photo of a real person. Image 2 is a clothing item (it may be worn by a different model or shown as a product photo).",
        "Generate ONE photorealistic image of the SAME person from Image 1 now fully dressed in the clothing item from Image 2.",
        "Preserve the person's face, hairstyle, skin tone, body shape and pose from Image 1 as closely as possible — it must clearly be the same person.",
        "The garment must match Image 2 exactly in material, print/pattern, colour, cut and silhouette. Do not redesign or upgrade it.",
        backgroundLine,
        coverageRule,
        userPrompt ? `Extra: ${userPrompt}` : "",
      ].filter(Boolean).join("\n\n")
    : [
        "Image 1 is a photo of a real person. Use it ONLY as a likeness reference for the face and hair.",
        "Generate ONE tasteful, photorealistic editorial fashion image of the SAME person from Image 1, fully dressed in a complete, elegant outfit.",
        "Preserve the person's face, hairstyle and skin tone from Image 1 as closely as possible — it must clearly be the same person — but dress them in a brand-new full outfit.",
        userPrompt ? `Style the full outfit like this: ${userPrompt}` : "Style the full outfit in a tasteful, on-trend look.",
        backgroundLine,
        coverageRule,
      ].filter(Boolean).join("\n\n");

  try {
    const openAiForm = new FormData();
    openAiForm.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
    openAiForm.append("prompt", prompt);
    openAiForm.append("size", outputSize(aspectRatio));
    // "low" is ~3–4× cheaper than "medium" and is fine for try-ons. Override via
    // OPENAI_IMAGE_QUALITY (low | medium | high) without a code change.
    openAiForm.append("quality", process.env.OPENAI_IMAGE_QUALITY ?? "low");
    openAiForm.append("n", "1");

    // Image 1 = person (base), Image 2 = garment (optional), Image 3 = location (optional).
    // Order MUST match the image numbers referenced in the prompt above.
    const personBuf = await modelImage.arrayBuffer();
    openAiForm.append("image[]", new Blob([personBuf], { type: "image/png" }), "person.png");
    if (hasGarment) {
      const garmentBuf = await garment.arrayBuffer();
      openAiForm.append("image[]", new Blob([garmentBuf], { type: "image/png" }), "garment.png");
    }
    if (hasLocation) {
      const locationBuf = await location.arrayBuffer();
      openAiForm.append("image[]", new Blob([locationBuf], { type: "image/png" }), "location.png");
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: openAiForm,
    });

    const responseText = await response.text();
    let payload: any = null;
    try { payload = JSON.parse(responseText); } catch { /* empty */ }

    if (!response.ok) {
      refundTryon();
      const credits = refundReservation(accountId, reservation.reservationId);
      const realError = payload?.error?.message ?? responseText?.slice(0, 300) ?? "OpenAI konnte das Bild nicht erstellen.";
      console.error("[generate-openai-tryon] OpenAI error", response.status, responseText?.slice(0, 800));
      return NextResponse.json({ error: `Try-on fehlgeschlagen. (${realError})`, credits }, { status: response.status || 502 });
    }

    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64) {
      refundTryon();
      const credits = refundReservation(accountId, reservation.reservationId);
      return NextResponse.json({ error: "OpenAI hat kein Bild zurückgegeben.", credits }, { status: 502 });
    }

    return NextResponse.json({
      image: `data:image/png;base64,${b64}`,
      credits: completeReservation(accountId, reservation.reservationId),
    });
  } catch (error) {
    refundTryon();
    const credits = refundReservation(accountId, reservation.reservationId);
    const message = error instanceof Error ? error.message : "Try-on fehlgeschlagen.";
    return NextResponse.json({ error: message, credits }, { status: 500 });
  }
}
