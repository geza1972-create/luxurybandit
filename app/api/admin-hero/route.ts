import { NextResponse } from "next/server";
import { authorizeStudio } from "@/lib/studio-auth";
import { reserveCredits, completeReservation, refundReservation } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 180;

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const bytes = Buffer.from(base64, "base64");
  return { blob: new Blob([bytes], { type: mime }), ext: mime.includes("jpeg") ? "jpg" : "png" };
}

// Generates the aspirational AI hero image for a Trends look from the product
// photo (curator's creative step). Not for sale — the dupes are.
export async function POST(request: Request) {
  const auth = await authorizeStudio(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Studio access only." }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY fehlt in .env.local." }, { status: 400 });
  }

  let payload: { imageDataUrl?: string; prompt?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const imageDataUrl = String(payload.imageDataUrl ?? "");
  if (!imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Kein Produktbild erhalten." }, { status: 400 });
  }
  const extra = String(payload.prompt ?? "").trim();

  // Curators are credit-capped (the admin is not). Reserve one image credit up
  // front; complete it on success, refund it on any failure.
  const accountId = auth.curatorId;
  let reservationId: string | null = null;
  if (accountId) {
    const reservation = reserveCredits(accountId, "ai-light");
    if (!reservation.ok) {
      return NextResponse.json(
        { error: "You've used your free look allowance for now. It refreshes monthly." },
        { status: 402 }
      );
    }
    reservationId = reservation.reservationId;
  }
  const releaseCredit = (kind: "complete" | "refund") => {
    if (!accountId || !reservationId) return;
    if (kind === "complete") completeReservation(accountId, reservationId);
    else refundReservation(accountId, reservationId);
  };

  const prompt = [
    "Create ONE photorealistic, aspirational editorial fashion image of a model wearing the EXACT garment shown in the reference image.",
    "Preserve the garment's material, print/pattern, colour, cut and silhouette exactly — do not redesign it.",
    "Elegant, high-end campaign feel. Flattering 3/4 to full-length framing. Clean, tasteful background (studio or soft natural light).",
    "No text, logos overlays, prices, watermarks or badges.",
    extra ? `Style note: ${extra}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const { blob, ext } = dataUrlToBlob(imageDataUrl);
    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", "1024x1536");
    form.append("quality", "medium");
    form.append("n", "1");
    form.append("image[]", blob, `product.${ext}`);

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* empty */ }

    if (!res.ok) {
      releaseCredit("refund");
      const realError = data?.error?.message ?? text?.slice(0, 300) ?? "OpenAI Fehler.";
      return NextResponse.json({ error: `Hauptbild fehlgeschlagen. (${realError})` }, { status: res.status || 502 });
    }
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      releaseCredit("refund");
      return NextResponse.json({ error: "Kein Bild erhalten." }, { status: 502 });
    }
    releaseCredit("complete");
    return NextResponse.json({ image: `data:image/png;base64,${b64}` });
  } catch (error) {
    releaseCredit("refund");
    const message = error instanceof Error ? error.message : "Hauptbild fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
