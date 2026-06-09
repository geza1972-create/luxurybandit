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

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY fehlt in .env.local. Bitte Server nach dem Eintragen neu starten." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const garmentImage = formData.get("image");
  const personImage = formData.get("modelImage");
  const prompt = String(formData.get("prompt") ?? "").trim();
  const visitorId = String(formData.get("visitorId") ?? "").trim();
  const lookId = String(formData.get("lookId") ?? "").trim();
  const requestedAspectRatio = String(formData.get("aspectRatio") ?? "").trim();
  const aspectRatio = supportedAspectRatios.has(requestedAspectRatio) ? requestedAspectRatio : "4:5";

  if (!(garmentImage instanceof File)) {
    return NextResponse.json({ error: "Kein Look-Bild erhalten." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is empty." }, { status: 400 });
  }

  const accountId = getAccountId(request);
  const tryOnLimit = reserveAnonymousTryOnAttempt(accountId, visitorId, lookId);
  if (!tryOnLimit.ok) {
    return NextResponse.json({ error: tryOnLimit.error }, { status: 429 });
  }
  const reservation = reserveCredits(accountId, "fashion-model-selected");
  if (!reservation.ok) {
    return NextResponse.json(
      {
        error: reservation.error,
        credits: reservation.status
      },
      { status: 402 }
    );
  }

  const garmentDataUrl = await fileToDataUrl(garmentImage);
  const personDataUrl = personImage instanceof File ? await fileToDataUrl(personImage) : "";
  const content = [
    {
      type: "input_text",
      text: personDataUrl
        ? [
            "Task: Fashion try-on edit.",
            "Image 1 is the selected product/garment reference and controls the garment, print, logo, color, silhouette, and front/back viewpoint.",
            "Image 2 is the person/model reference. Use it only for person identity/body reference, not as the final pose or camera direction if it conflicts with Image 1 or the user instruction.",
            "If Image 1 shows the back of the garment, the final result must show the model from behind/back wearing the garment. Do not invent a front view.",
            "If the user asks for back/hinten/from behind/rear view, the final result must be a back view even when the model reference is front-facing.",
            "Preserve visible garment details from Image 1. Do not replace them with details from Image 2.",
            prompt
          ].join("\n\n")
        : [
            "Task: Fashion model campaign image.",
            "No shopper photo was uploaded.",
            "Use Image 1 as the complete outfit source of truth.",
            "If Image 1 shows the back of the garment, show the generated model from behind/back wearing it. Do not invent a front view.",
            "Create the look on a professional adult fashion model.",
            prompt
          ].join("\n\n")
    },
    {
      type: "input_image",
      image_url: garmentDataUrl
    },
    ...(personDataUrl
      ? [
          {
            type: "input_image",
            image_url: personDataUrl
          }
        ]
      : [])
  ];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_RESPONSES_MODEL ?? "gpt-5",
      input: [
        {
          role: "user",
          content
        }
      ],
      tools: [
        {
          type: "image_generation",
          action: "edit",
          size: outputSize(aspectRatio),
          quality: "low",
          output_format: "png"
        }
      ]
    })
  });

  const responseText = await response.text();
  let payload: any = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json(
      {
        error: payload?.error?.message ?? responseText?.slice(0, 500) ?? "OpenAI konnte den Try-on nicht erstellen.",
        credits
      },
      { status: response.status }
    );
  }

  const imageOutput = payload?.output?.find((item: any) => item?.type === "image_generation_call");
  const b64 = imageOutput?.result;
  if (!b64) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json({ error: "OpenAI hat kein Bild zurückgegeben.", credits }, { status: 502 });
  }

  return NextResponse.json({
    image: `data:image/png;base64,${b64}`,
    credits: completeReservation(accountId, reservation.reservationId)
  });
}
