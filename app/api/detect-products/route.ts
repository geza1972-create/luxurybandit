import { NextResponse } from "next/server";
import { completeReservation, getAccountId, reserveCredits } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 30;

type DetectionResponse = {
  products?: Array<string | {
    label?: string;
    color?: string;
    material?: string;
    shape?: string;
    details?: string;
    description?: string;
  }>;
};

function extractJson(text: string): DetectionResponse {
  try {
    return JSON.parse(text) as DetectionResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as DetectionResponse;
    } catch {
      return {};
    }
  }
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

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Kein Bild erhalten." }, { status: 400 });
  }

  const accountId = getAccountId(request);
  const reservation = reserveCredits(accountId, "detect-products");
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
  const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Identify the visible fashion product pieces in this image.",
                "Return only concrete product parts that should be selectable for the final ecommerce image.",
                "For each product part, identify the dominant visible color and material/fabric finish of the selected cutout.",
                "Also identify the product shape/cut/style where relevant.",
                "Use short lowercase product labels, for example: corset, panty, garter straps, bra, bodysuit, stockings.",
                "Material examples: opaque black fabric, semi-sheer black lace, nude mesh, satin, elastic strap, sheer stocking.",
                "Shape examples for panty: thong, tanga, brief, bikini, high-waist, cheeky, brazilian, string, cut-out panty.",
                "If a panty is visible, be very specific about whether the panty front/back panel is opaque black, lace, mesh, sheer, or another material.",
                "If the item has complex shapes, cut-outs, open panels, asymmetric edges, lace borders, high-leg openings, straps, rings, bows, or special construction, describe this in details.",
                "Do not include person, body, skin, background, hair, pose, lighting, or camera terms.",
                "Return JSON only with this shape: {\"products\":[{\"label\":\"panty\",\"color\":\"black\",\"material\":\"opaque black fabric\",\"shape\":\"thong\",\"details\":\"high-leg thong cut with narrow side straps and opaque black front panel\",\"description\":\"black opaque thong panty\"}]}. Limit to 8 items."
              ].join(" ")
            },
            {
              type: "input_image",
              image_url: dataUrl
            }
          ]
        }
      ]
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? "OpenAI konnte die Produkte nicht erkennen." },
      { status: response.status }
    );
  }

  const text =
    payload?.output_text ??
    payload?.output?.flatMap((item: any) => item?.content ?? [])
      ?.map((content: any) => content?.text ?? "")
      ?.join("\n") ??
    "";

  const parsed = extractJson(text);
  const products = (parsed.products ?? [])
    .map((product) => {
      if (typeof product === "string") {
        const label = product.trim().toLowerCase();
        return label ? { label, color: "", material: "", description: label } : null;
      }

      const label = String(product?.label ?? "").trim().toLowerCase();
      if (!label) return null;
      const color = String(product?.color ?? "").trim().toLowerCase();
      const material = String(product?.material ?? "").trim().toLowerCase();
      const shape = String(product?.shape ?? "").trim().toLowerCase();
      const details = String(product?.details ?? "").trim().toLowerCase();
      const description = String(product?.description ?? [color, material, shape, label].filter(Boolean).join(" ")).trim().toLowerCase();
      return { label, color, material, shape, details, description };
    })
    .filter((product): product is { label: string; color: string; material: string; shape: string; details: string; description: string } => Boolean(product))
    .slice(0, 8);

  return NextResponse.json({ products, credits: completeReservation(accountId, reservation.reservationId) });
}
