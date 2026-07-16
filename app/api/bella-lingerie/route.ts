import { NextResponse } from "next/server";
import { readTryThisLookState, uploadTryThisLookImage, getSignedUrl } from "@/lib/try-this-look-store";
import { generateLingerieTryon } from "@/lib/generate-program-post";
import { isAdminRequest } from "@/lib/admin-auth";
import { BELLA_ID } from "@/lib/bella-card";

export const runtime = "nodejs";
export const maxDuration = 120; // FASHN try-on polls up to ~55s

type Look = { id: string; name?: string; garmentCategory?: string; lingerie?: boolean; frontImageUrl?: string; imageUrl?: string };
const isLingerie = (l: Look) => (l.garmentCategory === "Lingerie" || l.lingerie === true) && !!(l.frontImageUrl || l.imageUrl);

// GET — list the Gianna Bellucci lingerie pieces (id + name + thumb) so the admin can pick one.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const state = await readTryThisLookState();
  const garments = (state.looks as Look[]).filter(isLingerie).map(l => ({ id: l.id, name: l.name ?? "Lingerie", thumb: l.frontImageUrl || l.imageUrl || "" }));
  return NextResponse.json({ garments });
}

// POST — generate ONE "Bella in a Gianna Bellucci lingerie" image via FASHN try-on (single
// person — the proven, tasteful path). Body { garmentLookId? }. Returns a signed image URL +
// its storage path (so it can be added straight into her card carousel).
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  if (!process.env.FASHN_API_KEY) return NextResponse.json({ error: "FASHN_API_KEY fehlt in .env.local." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { garmentLookId?: string; prompt?: string };
  const prompt = String(body.prompt ?? "").trim().slice(0, 800) || "Editorial boudoir portrait, elegant and tasteful, soft studio lighting, full coverage lingerie.";
  const state = await readTryThisLookState();

  // 1) Bella's photo → bytes (the model image).
  const bella = (state.curators ?? []).find(c => c.id === BELLA_ID) as { photoUrl?: string; firstName?: string } | undefined;
  const bellaPhoto = bella?.photoUrl || "";
  if (!bellaPhoto) return NextResponse.json({ error: "Bella hat kein Profilfoto." }, { status: 400 });
  let modelBuffer: Buffer, modelMime: string;
  try {
    const r = await fetch(bellaPhoto);
    if (!r.ok) throw new Error("photo");
    modelBuffer = Buffer.from(await r.arrayBuffer());
    modelMime = r.headers.get("content-type") || "image/jpeg";
  } catch { return NextResponse.json({ error: "Bellas Foto konnte nicht geladen werden." }, { status: 502 }); }

  // 2) Pick the Gianna Bellucci lingerie garment (chosen id, else the first available).
  const pool = (state.looks as Look[]).filter(isLingerie);
  if (!pool.length) return NextResponse.json({ error: "Kein Lingerie-Teil im Pool gefunden." }, { status: 400 });
  const garment = (body.garmentLookId && pool.find(l => l.id === body.garmentLookId)) || pool[0];
  const garmentUrl = garment.frontImageUrl || garment.imageUrl || "";

  // 3) FASHN try-on (single person, tasteful editorial).
  const errs: string[] = [];
  const generated = await generateLingerieTryon(modelBuffer, modelMime, garmentUrl, prompt, errs);
  if (!generated) return NextResponse.json({ error: "Generierung fehlgeschlagen (FASHN). Evtl. anderes Teil probieren.", detail: errs.join(" | ") }, { status: 502 });

  // 4) Normalise to a data URL, store, return a signed URL + path.
  const dataUrl = generated.startsWith("data:")
    ? generated
    : generated.startsWith("http")
      ? await fetch(generated).then(async r => `data:${r.headers.get("content-type") || "image/png"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`)
      : `data:image/png;base64,${generated}`;
  let path: string;
  try { path = await uploadTryThisLookImage("uploads", dataUrl); }
  catch { return NextResponse.json({ error: "Bild konnte nicht gespeichert werden." }, { status: 502 }); }
  const imageUrl = await getSignedUrl(path, 60 * 60 * 24 * 365).catch(() => "");
  return NextResponse.json({ ok: true, imageUrl, path, garmentName: garment.name ?? "Lingerie" });
}
