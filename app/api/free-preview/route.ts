import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { claimFreePreview } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * DAS GRATIS-VORSCHAUBILD (Owner 29.07.2026).
 *
 * „Die Leute wollen was generieren, und wenn es klappt dann zahlen sie." — „Ich habe auch nie
 * gekauft bevor ich nicht etwas generiert habe. Ohne Gratis-Test kaufe ich nichts."
 *
 * WARUM ES DAS GIBT: Der Trichter zeigte eine gespielte Render-Show und danach ein
 * VERPIXELTES Bild. Der Besucher hat nie erlebt, dass es mit SEINEM Gesicht funktioniert — er
 * sollte für ein Versprechen zahlen. Ergebnis: 8 Durchläufe, 0 Zahlungen.
 *
 * Hier bekommt er ein ECHTES, scharfes Bild von sich und ihr. Die Kasse steht danach, vor dem
 * VIDEO. Er zahlt dann für die Steigerung von etwas, das er schon in der Hand hält.
 *
 * WARUM OPENAI UND NICHT FASHN (Owner): FASHN ist für Lingerie und teuer. Die Vorschau läuft
 * über gpt-image-1 in der Stufe „low" — nur so ist Verschenken tragbar. Ein Video kostet rund
 * das Zwanzigfache und bleibt deshalb hinter der Kasse.
 *
 * Deckelung steckt in `claimFreePreview` (serverseitig, siehe dort).
 */

// Wortgleich aus /api/generate-openai-tryon übernommen. OHNE diese Zusage antwortet OpenAI
// mit safety_violations=[sexual] und es kommt gar kein Bild — im Projekt mehrfach passiert.
const COVERAGE_RULE =
  "Strict coverage requirement: the output MUST depict both people fully and modestly dressed in complete outfits, REGARDLESS of how much skin is visible in the input photos. The clothing must fully cover the chest, cleavage, torso, shoulders and hips with opaque fabric. This is a tasteful editorial photograph of clothed people. Absolutely NO swimwear, bikini, lingerie, underwear, nudity, or exposed intimate areas (chest, cleavage, groin, buttocks). If an input shows swimwear or bare skin, replace it entirely with full, elegant clothing.";

function dataUrlToBlob(dataUrl: string): Blob | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!m) return null;
  try { return new Blob([Buffer.from(m[2], "base64")], { type: m[1] }); } catch { return null; }
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Not configured." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    person?: string; model?: string; device?: string; theme?: string;
  };
  const person = String(body.person ?? "");
  const model = String(body.model ?? "");
  const device = String(body.device ?? "").trim().slice(0, 80);
  const theme = String(body.theme ?? "kiss").replace(/[^a-z]/gi, "").toLowerCase();
  if (!person.startsWith("data:") || !model.startsWith("data:")) {
    return NextResponse.json({ error: "Bitte beide Fotos hochladen." }, { status: 400 });
  }

  // Admins ohne Deckel — sonst kannst du nicht testen, ohne das Tageskontingent zu essen.
  const staff = await isAdminRequest(request).catch(() => false);
  if (!staff) {
    if (!device) return NextResponse.json({ error: "Kein Gerät erkannt." }, { status: 400 });
    const claim = await claimFreePreview(device);
    if (!claim.ok) {
      return NextResponse.json({
        error: claim.reason === "day"
          ? "Heute sind alle Gratis-Vorschauen aufgebraucht — morgen wieder."
          : "Du hast deine Gratis-Vorschau heute schon genutzt.",
        limit: claim.reason,
      }, { status: 429 });
    }
  }

  // NEUTRALE WORTWAHL: Der Kuss ist hier ausdrücklich NICHT das Motiv — er ist das, was das
  // bezahlte Video daraus macht. Die Vorschau zeigt die beiden nebeneinander.
  const prompt = [
    "Image 1 is a photo of a real person. Image 2 is a photo of another person.",
    "Generate ONE photorealistic image showing BOTH people together in the same scene, standing side by side and smiling at each other.",
    theme === "holiday" || theme === "bella"
      ? "Setting: a sunny seaside terrace with the ocean behind them, warm natural daylight."
      : "Setting: a warm, softly lit evening scene with gentle glowing lights behind them.",
    "Preserve BOTH faces, hairstyles and skin tones exactly as in the reference photos — it must clearly be the same two people. An input photo may show only a face or head-and-shoulders; if so, extend it naturally into a full figure that matches their apparent age and build.",
    "Show them from the knees up, both fully in frame. Natural, realistic result. No text, logos, badges or overlays.",
    COVERAGE_RULE,
  ].join("\n\n");

  try {
    const form = new FormData();
    form.append("model", process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1");
    form.append("prompt", prompt);
    form.append("size", "1024x1536");   // 2:3 — passt zu den Kacheln im Trichter
    form.append("quality", process.env.OPENAI_PREVIEW_QUALITY ?? "low");
    form.append("n", "1");
    const pb = dataUrlToBlob(person), mb = dataUrlToBlob(model);
    if (!pb || !mb) return NextResponse.json({ error: "Fotos konnten nicht gelesen werden." }, { status: 400 });
    form.append("image[]", pb, "person.png");
    form.append("image[]", mb, "model.png");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form,
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ error: j?.error?.message ?? `Bild fehlgeschlagen (${res.status}).` }, { status: 502 });
    }
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "Kein Bild erhalten." }, { status: 502 });
    return NextResponse.json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Netzwerkfehler." }, { status: 502 });
  }
}
