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
    bbox?: number[];
  }>;
  viewType?: "front" | "side" | "back";
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

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 500) || "OpenAI returned an invalid response." } };
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
                "Identify all visible fashion products in this image.",
                "This includes ALL fashion item types: clothing (tops, jackets, dresses, lingerie, corsets, bras, etc.), shoes, boots, sneakers, bags, handbags, clutches, backpacks, jewellery, necklaces, bracelets, belts, scarves, hats, sunglasses, and any other wearable fashion accessory.",
                "If the image contains blue painted marks, treat them as user focus markers only — use them to improve recognition of details but do not describe the marker itself.",
                "Return only concrete selectable product pieces for a clean ecommerce product image.",
                "For each product identify: label (short lowercase name), dominant color, material/finish, shape/style, and notable details.",
                "Label examples: corset, panty, high heel, ankle boot, leather tote bag, gold chain necklace, silk scarf, sunglasses, leather belt, satin slip dress, gold bracelet.",
                "Also identify the view if possible: front, side, or back.",
                "If the item has complex shapes, hardware, cut-outs, straps, closures, or special construction, describe in the details field.",
                "For every product return bbox as [x,y,width,height] in normalized 0–1000 coordinates tightly around the visible product.",
                "If multiple separate products are visible (e.g. shoe + bag, or a product grid), give each its own bbox.",
                "Do not include person, body, skin, hair, background, or lighting.",
                "Return JSON only: {\"viewType\":\"front\",\"products\":[{\"label\":\"high heel\",\"color\":\"black\",\"material\":\"patent leather\",\"shape\":\"stiletto\",\"details\":\"pointed toe, 10cm stiletto heel\",\"description\":\"black patent leather stiletto heel\",\"bbox\":[200,400,300,500]}]}. Limit to 10 items."
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

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? `OpenAI konnte die Apparel-Teile nicht erkennen. Status ${response.status}.` },
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
      const bbox = Array.isArray(product?.bbox)
        ? product.bbox.map((value) => Number(value)).filter((value) => Number.isFinite(value)).slice(0, 4)
        : undefined;
      return { label, color, material, shape, details, description, bbox: bbox?.length === 4 ? bbox : undefined };
    })
    .filter((product): product is { label: string; color: string; material: string; shape: string; details: string; description: string; bbox?: number[] } => Boolean(product))
    .slice(0, 10);

  const parsedView = parsed.viewType === "front" || parsed.viewType === "side" || parsed.viewType === "back" ? parsed.viewType : null;

  return NextResponse.json({ products, viewType: parsedView, credits: completeReservation(accountId, reservation.reservationId) });
}
