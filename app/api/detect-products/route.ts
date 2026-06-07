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
                "Identify the visible fashion product pieces in this image.",
                "If the image contains blue painted marks, treat them as user focus markers only. They mean: pay special attention to the marked logo, print, jewelry, hardware, accessory, or garment detail.",
                "Do not describe the blue marker as a product color, fabric, logo, print, or garment part.",
                "Use the marked areas to improve recognition of small details, but still identify the complete visible apparel pieces around them.",
                "Return only concrete product parts that should be selectable for the final ecommerce image.",
                "For each product part, identify the dominant visible color and material/fabric finish of the selected cutout.",
                "Also identify the product shape/cut/style where relevant.",
                "Use short lowercase product labels, for example: corset, panty, garter straps, bra, bodysuit, stockings.",
                "Material examples: opaque black fabric, semi-sheer black lace, nude mesh, satin, elastic strap, sheer stocking.",
                "Shape examples for panty: thong, tanga, brief, bikini, high-waist, cheeky, brazilian, string, cut-out panty.",
                "If a panty is visible, be very specific about whether the panty front/back panel is opaque black, lace, mesh, sheer, or another material.",
                "Also identify the product view if possible: front, side, or back. Use back when rear closures, back lacing, rear straps, or back panty/thong shape are visible. Use side only when the garment is clearly shown from the side. Use front when front cups, front panel, or front product construction is visible.",
                "If the item has complex shapes, cut-outs, open panels, asymmetric edges, lace borders, high-leg openings, straps, rings, bows, or special construction, describe this in details.",
                "For every product, return bbox as [x,y,width,height] using normalized image coordinates from 0 to 1000 around the visible product only. This is required for screenshots, wishlist pages, grids, and collages with multiple products.",
                "If this is a shop wishlist, product grid, collage, screenshot, or page with multiple product cards, identify each visible product separately and give each product its own bbox.",
                "Do not use the same bbox for different products unless they are truly one product set.",
                "Do not include person, body, skin, background, hair, pose, lighting, or camera terms.",
                "Return JSON only with this shape: {\"viewType\":\"front\",\"products\":[{\"label\":\"panty\",\"color\":\"black\",\"material\":\"opaque black fabric\",\"shape\":\"thong\",\"details\":\"high-leg thong cut with narrow side straps and opaque black front panel\",\"description\":\"black opaque thong panty\",\"bbox\":[420,260,180,210]}]}. Limit to 10 items."
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
