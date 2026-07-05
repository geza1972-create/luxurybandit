import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookImage } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 180;

const isLookCategory = (c: unknown): c is string =>
  typeof c === "string" && ["after-dark", "riviera", "boudoir", "off-duty"].includes(c);

// Turn a lifestyle / on-model photo into a clean e-commerce garment product shot (person +
// background removed) via gpt-image-1 edits. Flat product shots don't need this.
async function extractGarment(apiKey: string, dataUrl: string): Promise<string | null> {
  try {
    const m = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
    if (!m) return null;
    const bytes = Buffer.from(m[2], "base64");
    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
    form.append("prompt", "Isolate ONLY the clothing/garment from this photo. Remove the person and the entire background. Output a clean professional e-commerce product photograph of just the garment on a pure seamless white background, ghost-mannequin (invisible model) style, the full garment centered and clearly visible, no human, no face, no skin, no background, sharp studio lighting. Keep the garment's exact colour, material, print and details. No text.");
    form.append("size", "1024x1536");
    form.append("quality", "medium");
    form.append("n", "1");
    form.append("image[]", new Blob([bytes], { type: m[1] }), "garment.png");
    const res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const payload = await res.json().catch(() => null);
    const b64 = payload?.data?.[0]?.b64_json;
    if (!res.ok || !b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;

  const body = await request.json().catch(() => ({}));
  const image = String(body.image ?? "");
  if (!image.startsWith("data:image/")) return NextResponse.json({ error: "Kein Bild erhalten." }, { status: 400 });
  const name = String(body.name ?? "").trim() || "Luxury Bandi piece";
  const category = isLookCategory(body.category) ? (body.category as string) : "riviera";
  const curatorId = String(body.curatorId ?? "").trim() || undefined;
  const wantExtract = body.extract === true;

  let finalDataUrl = image;
  let extracted = false;
  if (wantExtract && apiKey) {
    const out = await extractGarment(apiKey, image);
    if (out) { finalDataUrl = out; extracted = true; }
  }

  const path = await uploadTryThisLookImage("looks", finalDataUrl);
  const id = `look-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const state = await readTryThisLookState();
  state.looks.unshift({
    id, name, published: true, aiCreated: true, productType: "ai", wardrobe: true, brandOriginal: true,
    category, lingerie: category === "boudoir" || undefined, curatorId,
    imagePath: path, frontImagePath: path, garmentFrontImagePath: path, galleryImagePaths: [path],
    createdAt: new Date().toISOString(),
  } as never);
  await saveTryThisLookState(state);

  return NextResponse.json({ ok: true, id, name, category, extracted });
}
