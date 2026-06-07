import { completeReservation, getAccountId, refundReservation, reserveCredits } from "@/lib/billing";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const FASHN_RUN_ENDPOINT = process.env.FASHN_API_ENDPOINT ?? "https://api.fashn.ai/v1/run";
const FASHN_STATUS_ENDPOINT = process.env.FASHN_STATUS_ENDPOINT ?? "https://api.fashn.ai/v1/status";

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function readFashnError(payload: any, fallback: string) {
  if (!payload) return fallback;
  const error = payload?.error;
  const message = payload?.message;

  if (typeof error === "string") return message ? `${error}: ${message}` : error;
  if (typeof error?.message === "string") return error.message;
  if (typeof error?.name === "string") return message ? `${error.name}: ${message}` : error.name;
  if (typeof message === "string") return message;
  return fallback;
}

export async function POST(request: Request) {
  const apiKey = process.env.FASHN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "FASHN_API_KEY fehlt in .env.local. Bitte Server nach dem Eintragen neu starten." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  const modelImage = formData.get("modelImage");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const requestedAspectRatio = String(formData.get("aspectRatio") ?? "").trim();
  const supportedAspectRatios = new Set(["1:1", "3:4", "4:5", "9:16"]);
  const aspectRatio = supportedAspectRatios.has(requestedAspectRatio) ? requestedAspectRatio : "1:1";

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Kein Produktbild erhalten." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is empty." }, { status: 400 });
  }

  const hasSelectedModelImage = modelImage instanceof File;
  const accountId = getAccountId(request);
  const creditAction = mode === "retouch-cutout"
    ? "retouch-cutout"
    : hasSelectedModelImage
      ? "fashion-model-selected"
      : "fashion-model";
  const reservation = reserveCredits(accountId, creditAction);
  if (!reservation.ok) {
    return NextResponse.json(
      {
        error: reservation.error,
        credits: reservation.status
      },
      { status: 402 }
    );
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const mimeType = image.type || "image/png";
  const productImage = `data:${mimeType};base64,${bytes.toString("base64")}`;
  const selectedModelImage = hasSelectedModelImage
    ? `data:${modelImage.type || "image/jpeg"};base64,${Buffer.from(await modelImage.arrayBuffer()).toString("base64")}`
    : null;

  const createResponse = await fetch(FASHN_RUN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model_name: selectedModelImage ? "tryon-max" : "product-to-model",
      inputs: selectedModelImage
        ? {
            model_image: selectedModelImage,
            product_image: productImage,
            prompt,
            aspect_ratio: aspectRatio,
            resolution: "1k",
            generation_mode: "balanced",
            num_images: 1,
            output_format: "png",
            return_base64: true
          }
        : {
            product_image: productImage,
            prompt,
            aspect_ratio: aspectRatio,
            resolution: "1k",
            generation_mode: "fast",
            num_images: 1,
            output_format: "png",
            return_base64: true
          }
    })
  });

  const createPayload = await readJson(createResponse);

  if (!createResponse.ok || createPayload?.error) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json(
      {
        error: `FASHN konnte das Bild nicht starten: ${readFashnError(createPayload, "Unbekannter Fehler.")}`,
        credits
      },
      { status: createResponse.status || 502 }
    );
  }

  const predictionId = createPayload?.id;
  if (!predictionId) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json({ error: "FASHN hat keine Prediction-ID zurückgegeben.", credits }, { status: 502 });
  }

  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const statusResponse = await fetch(`${FASHN_STATUS_ENDPOINT}/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    const statusPayload = await readJson(statusResponse);
    const status = String(statusPayload?.status ?? "").toLowerCase();

    if (status === "completed") {
      const output = statusPayload?.output?.[0];
      if (!output) {
        const credits = refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({ error: "FASHN hat kein Bild zurückgegeben.", credits }, { status: 502 });
      }

      if (typeof output === "string" && output.startsWith("data:image/")) {
        return NextResponse.json({
          image: output,
          credits: completeReservation(accountId, reservation.reservationId)
        });
      }

      if (typeof output === "string") {
        const imageResponse = await fetch(output);
        if (!imageResponse.ok) {
          const credits = refundReservation(accountId, reservation.reservationId);
          return NextResponse.json({ error: "FASHN Bild konnte nicht geladen werden.", credits }, { status: 502 });
        }

        const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
        return NextResponse.json({
          image: `data:image/png;base64,${imageBytes.toString("base64")}`,
          credits: completeReservation(accountId, reservation.reservationId)
        });
      }

      const credits = refundReservation(accountId, reservation.reservationId);
      return NextResponse.json({ error: "FASHN hat ein unbekanntes Bildformat zurückgegeben.", credits }, { status: 502 });
    }

    if (status === "failed") {
      const credits = refundReservation(accountId, reservation.reservationId);
      return NextResponse.json(
        {
          error: `FASHN konnte das Bild nicht erstellen: ${readFashnError(statusPayload, "Unbekannter Fehler.")}`,
          credits
        },
        { status: 502 }
      );
    }
  }

  const credits = refundReservation(accountId, reservation.reservationId);
  return NextResponse.json({ error: "FASHN timeout after 3 minutes.", credits }, { status: 504 });
}
