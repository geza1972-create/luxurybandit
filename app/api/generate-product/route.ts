import { NextResponse } from "next/server";
import { completeReservation, getAccountId, refundReservation, reserveCredits } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 120;

const backgroundLabels = {
  white: "pure white studio background",
  "light-gray": "light gray ecommerce studio background",
  "light-gradient": "subtle light gray vertical studio gradient background, very light gray at the top and softly darker light gray at the bottom",
  "dark-gradient": "dark charcoal vertical studio gradient background, softer gray at the top and deep black at the bottom"
} as const;

type BackgroundKey = keyof typeof backgroundLabels;
type ViewMode = "auto" | "front" | "back" | "side";

const viewInstructions: Record<ViewMode, string> = {
  auto: "Preserve the exact visible product viewpoint from the input. If the input shows the back, output the back. If it shows the side, output the side. Do not rotate the garment or invent the opposite side.",
  front: "Output a front-view ecommerce product image only if the input already supports a front view; do not invent missing backside details.",
  back: "Output a back-view ecommerce product image. Keep the back-view structure, closures, straps, seams, panty back shape, and rear-facing details. Do not turn it into a front view. Do not show front cups or front panty styling.",
  side: "Output a side-view ecommerce product image. Preserve the side-facing structure and do not rotate it to the front."
};

function imageSize(width: number, height: number) {
  const ratio = width / Math.max(height, 1);
  if (ratio > 1.15) return "1536x1024";
  if (ratio < 0.87) return "1024x1536";
  return "1024x1024";
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
  const image = formData.get("image");
  const promptOverride = String(formData.get("prompt") ?? "").trim();
  const backgroundValue = String(formData.get("background") ?? "white") as BackgroundKey | "transparent";
  const productDescription = String(formData.get("productDescription") ?? "lingerie product set").trim();
  const viewMode = String(formData.get("viewMode") ?? "auto") as ViewMode;
  const mode = String(formData.get("mode") ?? "preserve");
  const squareOutput = String(formData.get("square") ?? "false") === "true";
  const useTransparent = backgroundValue === "transparent";
  const width = Number(formData.get("width") ?? 1024);
  const height = Number(formData.get("height") ?? 1024);

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Kein Bild erhalten." }, { status: 400 });
  }

  const accountId = getAccountId(request);
  const creditAction = mode === "fashion-model" ? "fashion-model" : mode === "rebuild" ? "rebuild-product" : "retouch-cutout";
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

  const prompt = promptOverride || (() => {
    const requestedBackground = backgroundValue !== "transparent" ? (backgroundLabels[backgroundValue] ?? backgroundLabels.white) : backgroundLabels.white;
    const requestedProduct = productDescription.slice(0, 180) || "the complete selected lingerie product or product set";
    const requestedView = viewInstructions[viewMode] ?? viewInstructions.auto;
    return [
      "Create a clean ecommerce product image from this transparent product cutout.",
      "The cutout is the main source of truth. Retouch the existing product only. Do not redesign it.",
      `Selected product pieces: ${requestedProduct}.`,
      `View: ${requestedView}.`,
      `Background: ${requestedBackground}. Square 1:1 ecommerce image.`,
      "Preserve exactly: original shape, original proportions, original color placement, visible fabric types, visible seams, visible straps, visible hardware, visible silhouette.",
      "Material rule: preserve opaque and sheer areas exactly. Do not reinterpret opaque fabric as mesh, lace, sheer fabric, or skin.",
      "Cleanup rule: remove remaining person, skin, body, hair, and background traces only. Repair only tiny missing garment edges. Do not invent missing design features. Do not add new lace, bows, ribbons, trims, seams, decorations, or extra garment pieces.",
      "Output rule: center the complete selected product with comfortable margins. Do not crop straps, garters, panties, ribbons, or edges."
    ].join(" ");
  })();

  const bytes = Buffer.from(await image.arrayBuffer());
  const mimeType = image.type || "image/png";
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
  const taskName = mode === "fashion-model" ? "Create ghost mannequin product preview" : mode === "rebuild" ? "Rebuild product cutout" : "Retouch existing cutout";

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
          content: [
            {
              type: "input_text",
              text: [
                `Task: ${taskName}.`,
                prompt
              ].join("\n\n")
            },
            {
              type: "input_image",
              image_url: dataUrl
            }
          ]
        }
      ],
      tools: [
        {
          type: "image_generation",
          action: "edit",
          size: squareOutput ? "1024x1024" : imageSize(width, height),
          quality: "low",
          output_format: "png",
          ...(useTransparent ? { background: "transparent" } : {})
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
        error: payload?.error?.message ?? responseText?.slice(0, 500) ?? "OpenAI konnte das Produktbild nicht erstellen.",
        credits
      },
      { status: response.status }
    );
  }

  if (!payload) {
    const credits = refundReservation(accountId, reservation.reservationId);
    return NextResponse.json(
      {
        error: "OpenAI returned an empty response. Please try again.",
        credits
      },
      { status: 502 }
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
