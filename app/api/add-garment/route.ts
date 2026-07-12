import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookImage } from "@/lib/try-this-look-store";
import { isLookCategory } from "@/lib/look-category";

export const runtime = "nodejs";
export const maxDuration = 180;

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

// Vision: name + description + type from the garment photo (so the admin types nothing).
async function describeGarment(apiKey: string, dataUrl: string): Promise<{ title?: string; description?: string; category?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
        input: [{ role: "user", content: [
          { type: "input_text", text: "Look at this fashion garment photo and return ONLY a JSON object with keys: \"title\" (a short punchy product title, 3-6 words, capitalise each word, no brand names unless clearly visible, no emoji), \"description\" (1-2 elegant sentences a boutique would use — item type, colour, material, style; no invented details, no emoji, no AI wording), \"category\" (exactly one of: after-dark, riviera, business, off-duty, boudoir — boudoir for lingerie/intimate/sheer sets, after-dark for evening gowns/cocktail/gala, riviera for swim/bikini/resort/beach, business for tailored suits/blazers/office wear, off-duty for everyday/casual)." },
          { type: "input_image", image_url: dataUrl },
        ] }],
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) return {};
    let text: string = payload?.output_text ?? "";
    if (!text && Array.isArray(payload?.output)) {
      for (const o of payload.output) for (const c of (o?.content ?? [])) if (typeof c?.text === "string") text += c.text;
    }
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : {};
    return { title: parsed.title, description: parsed.description, category: parsed.category };
  } catch {
    return {};
  }
}

// Pull the main product image out of a URL. Handles BOTH a direct image URL (e.g. a Shopify CDN
// ".jpg") — used as-is — AND a product PAGE (og:image, else first big <img>).
async function imageFromUrl(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LuxuryBanditBot/1.0)", Accept: "text/html,image/*,*/*" }, redirect: "follow" });
    if (!res.ok) return null;
    // Direct image URL (the pasted link IS the image) → use it straight away, no HTML parsing.
    const ct0 = res.headers.get("content-type") ?? "";
    if ((ct0.startsWith("image/") && !ct0.includes("svg")) || (/\.(jpe?g|png|webp|avif)(\?|$)/i.test(pageUrl) && !ct0.includes("text/html"))) {
      const buf = Buffer.from(await res.arrayBuffer());
      return `data:${ct0.startsWith("image/") ? ct0 : "image/jpeg"};base64,${buf.toString("base64")}`;
    }
    const html = await res.text();
    const og = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["']/i);
    let img = og?.[1] ?? "";
    if (!img) img = html.match(/<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i)?.[1] ?? "";
    if (!img) return null;
    const abs = new URL(img, pageUrl).toString();
    const ir = await fetch(abs, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LuxuryBanditBot/1.0)" } });
    if (!ir.ok) return null;
    const ct = ir.headers.get("content-type") ?? "image/jpeg";
    if (!ct.startsWith("image/") || ct.includes("svg")) return null;
    const buf = Buffer.from(await ir.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;

  const body = await request.json().catch(() => ({}));
  const buyUrl = String(body.url ?? "").trim();
  let image = String(body.image ?? "");
  let fromUrlImport = false;
  // No uploaded photo but a product URL → pull the garment image out of the page.
  if (!image.startsWith("data:image/") && /^https?:\/\//.test(buyUrl)) {
    const fromUrl = await imageFromUrl(buyUrl);
    if (fromUrl) { image = fromUrl; fromUrlImport = true; }
  }
  if (!image.startsWith("data:image/")) return NextResponse.json({ error: "Kein Bild — Foto hochladen oder eine gültige Produkt-URL angeben." }, { status: 400 });
  let name = String(body.name ?? "").trim();
  let category = isLookCategory(body.category) ? (body.category as string) : "";
  let description = "";
  const curatorId = String(body.curatorId ?? "").trim() || undefined;
  // URL imports are ALWAYS extracted onto a clean white product shot so they match the
  // AI-generated wardrobe pieces (a raw og:image is usually a lifestyle/flat-lay photo).
  const wantExtract = body.extract === true || fromUrlImport;

  // Auto-generate name / description / type from the photo when the admin left them blank.
  if (apiKey && (!name || !category)) {
    const d = await describeGarment(apiKey, image);
    if (!name && d.title) name = String(d.title).trim();
    if (!category && isLookCategory(d.category)) category = String(d.category);
    if (d.description) description = String(d.description).trim();
  }
  if (!name) name = "Luxury Bandi piece";
  if (!category) category = "riviera";

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
    productNote: description || undefined,
    buyUrl: /^https?:\/\//.test(buyUrl) ? buyUrl : undefined,
    imagePath: path, frontImagePath: path, garmentFrontImagePath: path, galleryImagePaths: [path],
    createdAt: new Date().toISOString(),
  } as never);
  await saveTryThisLookState(state);

  return NextResponse.json({ ok: true, id, name, category, description, extracted });
}
