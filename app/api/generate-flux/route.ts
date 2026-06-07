import { completeReservation, getAccountId, refundReservation, reserveCredits } from "@/lib/billing";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 180;

const FLUX_ENDPOINT = process.env.FLUX_API_ENDPOINT ?? "https://api.bfl.ai/v1/flux-kontext-pro";

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function readFluxError(payload: any, fallback: string) {
  if (!payload) return fallback;
  const detail = payload?.detail;
  const error = payload?.error;
  const message = payload?.message;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg ?? item?.message ?? JSON.stringify(item))
      .filter(Boolean)
      .join(" ");
  }
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  if (typeof message === "string") return message;
  return fallback;
}

export async function POST(request: Request) {
  const apiKey = process.env.FLUX_API_KEY ?? process.env.BFL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "FLUX_API_KEY fehlt in .env.local. Bitte Server nach dem Eintragen neu starten." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Kein Referenzbild erhalten." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is empty." }, { status: 400 });
  }

  const accountId = getAccountId(request);
  const reservation = reserveCredits(accountId, "fashion-model");
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
  const inputImage = bytes.toString("base64");

  const createResponse = await fetch(FLUX_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "x-key": apiKey
    },
    body: JSON.stringify({
      prompt,
      input_image: inputImage,
      aspect_ratio: "2:3",
      output_format: "png",
      prompt_upsampling: false,
      safety_tolerance: 2
    })
  });

  const createPayload = await readJson(createResponse);

  if (!createResponse.ok) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json(
      {
        error: `FLUX konnte das Bild nicht starten: ${readFluxError(createPayload, "Unbekannter Fehler.")}`,
        credits
      },
      { status: createResponse.status }
    );
  }

  const pollingUrl = createPayload?.polling_url;
  if (!pollingUrl) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json({ error: "FLUX hat keine polling_url zurückgegeben.", credits }, { status: 502 });
  }

  for (let attempt = 0; attempt < 180; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pollResponse = await fetch(pollingUrl, {
      headers: {
        accept: "application/json",
        "x-key": apiKey
      }
    });
    const pollPayload = await readJson(pollResponse);
    const status = String(pollPayload?.status ?? "").toLowerCase();

    if (status === "ready") {
      const sampleUrl = pollPayload?.result?.sample;
      if (!sampleUrl) {
        const credits = refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({ error: "FLUX hat kein Bild zurückgegeben.", credits }, { status: 502 });
      }

      const imageResponse = await fetch(sampleUrl);
      if (!imageResponse.ok) {
        const credits = refundReservation(accountId, reservation.reservationId);
        return NextResponse.json({ error: "FLUX Bild konnte nicht geladen werden.", credits }, { status: 502 });
      }

      const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
      return NextResponse.json({
        image: `data:image/png;base64,${imageBytes.toString("base64")}`,
        credits: completeReservation(accountId, reservation.reservationId)
      });
    }

    if (status === "error" || status === "failed") {
      const credits = refundReservation(accountId, reservation.reservationId);
      return NextResponse.json(
        {
          error: `FLUX konnte das Bild nicht erstellen: ${readFluxError(pollPayload, "Unbekannter Fehler.")}`,
          credits
        },
        { status: 502 }
      );
    }
  }

  const credits = refundReservation(accountId, reservation.reservationId);
  return NextResponse.json({ error: "FLUX timeout after 3 minutes.", credits }, { status: 504 });
}
