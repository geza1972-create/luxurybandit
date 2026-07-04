import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState, saveTryThisLookState, uploadTryThisLookImage } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 300;

const splitList = (s?: string) =>
  String(s ?? "").split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
const pick = <T,>(arr: T[], i: number, fb: T) => (arr.length ? arr[i % arr.length] : fb);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Piece = { piece: string; prompt: string; lingerie: boolean; category: string; name: string };

function inferCategory(piece: string, lingerie: boolean): string {
  if (lingerie) return "boudoir";
  const p = piece.toLowerCase();
  if (/gown|evening|cocktail|sequin|gala|black tie/.test(p)) return "after-dark";
  if (/resort|swim|beach|linen|vacation|bikini/.test(p)) return "riviera";
  return "off-duty";
}

// A model's signup preferences → a set of garment ideas: `mainCount` luxury garments +
// `lingerieCount` luxury lingerie pieces (user directive: 3 + 3, all luxury).
function buildPieces(prefs: { style?: string; brands?: string; fabrics?: string; occasions?: string; colors?: string }, mainCount: number, lingerieCount: number): Piece[] {
  const colors = splitList(prefs.colors);
  const fabrics = splitList(prefs.fabrics);
  const occ = splitList(prefs.occasions).map((o) => o.toLowerCase());
  const brands = splitList(prefs.brands).slice(0, 4);
  const style = String(prefs.style ?? "").trim();
  const has = (...k: string[]) => k.some((x) => occ.some((o) => o.includes(x)) || style.toLowerCase().includes(x));

  const main: string[] = [];
  if (has("evening", "black tie", "cocktail", "gala", "glam", "statement")) main.push("floor-length evening gown with a thigh-high slit", "embellished cocktail dress", "draped satin column gown");
  if (has("everyday", "business", "off-duty", "quiet luxury", "minimal")) main.push("sharply tailored blazer", "silk midi slip dress", "wide-leg trouser suit");
  if (has("vacation", "resort", "garden party", "riviera")) main.push("flowing silk resort maxi dress", "linen co-ord set");
  if (has("bridal")) main.push("delicate white lace bridal gown");
  if (main.length < 3) main.push("elegant tailored midi dress", "structured blazer", "silk slip dress", "draped satin gown", "sculptural one-shoulder gown");

  const lingeriePieces = ["lace lingerie set with balconette bra and high-waist brief", "sheer embroidered bodysuit", "satin slip dress and robe set", "delicate bralette and thong set", "corset-style bustier with garter straps"];

  const build = (rawPiece: string, i: number, isLingerie: boolean): Piece => {
    const color = pick(colors, i, "black");
    const fabric = pick(fabrics, i + 1, isLingerie ? "lace" : "satin");
    const brand = pick(brands, i, "");
    const name = cap(`${color.toLowerCase()} ${rawPiece}`).slice(0, 80);
    const prompt = isLingerie
      ? `Professional luxury lingerie e-commerce product photograph, a SINGLE ${color.toLowerCase()} ${fabric.toLowerCase()} ${rawPiece} laid flat / on an invisible ghost-mannequin on a pure seamless white background, no human, no body, no face, tasteful catalog product shot, elegant, sharp studio lighting, full garment visible, no text, no logo.`
      : `Professional e-commerce fashion product photograph of a SINGLE luxury garment on a pure seamless white background, ghost-mannequin (invisible model) style, no human, no face, sharp even studio lighting, the complete garment centered and fully visible top to bottom. The garment: a ${color.toLowerCase()} ${fabric.toLowerCase()} ${rawPiece}. Aesthetic: ${style || "modern luxury"}${brand ? `, in the spirit of ${brand}` : ""}. High-end catalog quality, crisp fabric detail, realistic, no text, no logo.`;
    return { piece: rawPiece, prompt, lingerie: isLingerie, category: inferCategory(rawPiece, isLingerie), name };
  };

  const items: Piece[] = [];
  for (let i = 0; i < mainCount; i++) items.push(build(pick(main, i, "elegant midi dress"), i, false));
  for (let j = 0; j < lingerieCount; j++) items.push(build(pick(lingeriePieces, j, "lace lingerie set"), mainCount + j, true));
  return items;
}

async function genImage(apiKey: string, model: string, prompt: string): Promise<{ dataUrl?: string; error?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, prompt, size: "1024x1536", quality: "medium", n: 1 }),
    });
    const payload = await res.json().catch(() => null);
    const b64 = payload?.data?.[0]?.b64_json;
    if (!res.ok || !b64) return { error: payload?.error?.message || `HTTP ${res.status}` };
    return { dataUrl: `data:image/png;base64,${b64}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "failed" };
  }
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const curatorId = String(body.curatorId ?? "").trim();
  const mainCount = Math.max(0, Math.min(12, Number(body.mainCount ?? 3)));
  const lingerieCount = Math.max(0, Math.min(12, Number(body.lingerieCount ?? 3)));
  const store = body.store !== false;
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";

  const state = await readTryThisLookState();
  const cur = (state.curators ?? []).find((c) => (c as any).id === curatorId) as any;
  if (!cur) return NextResponse.json({ error: "Model not found." }, { status: 404 });
  const modelName = [cur.firstName, cur.lastName].filter(Boolean).join(" ").trim();

  const pieces = buildPieces({ style: cur.style, brands: cur.brands, fabrics: cur.fabrics, occasions: cur.occasions, colors: cur.colors }, mainCount, lingerieCount);

  const created: { id: string; name: string; category: string; lingerie: boolean; error?: string }[] = [];
  const newLooks: any[] = [];
  // Generate + upload all pieces in parallel (much faster for the admin button).
  const results = await Promise.all(pieces.map(async (p) => {
    const g = await genImage(apiKey, model, p.prompt);
    if (!g.dataUrl) return { p, error: g.error };
    if (!store) return { p, sample: true as const };
    try { return { p, path: await uploadTryThisLookImage("looks", g.dataUrl) }; }
    catch (e) { return { p, error: e instanceof Error ? e.message : "store failed" }; }
  }));
  for (const r of results) {
    const p = r.p;
    if ("error" in r && r.error) { created.push({ id: "", name: p.name, category: p.category, lingerie: p.lingerie, error: r.error }); continue; }
    if ("sample" in r) { created.push({ id: "sample", name: p.name, category: p.category, lingerie: p.lingerie }); continue; }
    const id = `look-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    newLooks.push({
      id, name: p.name, published: true, aiCreated: true, productType: "ai",
      category: p.category, lingerie: p.lingerie || undefined, curatorId,
      imagePath: (r as { path: string }).path, frontImagePath: (r as { path: string }).path,
      garmentFrontImagePath: (r as { path: string }).path, galleryImagePaths: [(r as { path: string }).path],
      createdAt: new Date().toISOString(),
    });
    created.push({ id, name: p.name, category: p.category, lingerie: p.lingerie });
  }

  if (store && newLooks.length) {
    state.looks.unshift(...newLooks);
    await saveTryThisLookState(state);
  }

  return NextResponse.json({ model: modelName, curatorId, stored: store, created });
}
