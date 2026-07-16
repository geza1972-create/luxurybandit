import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

const TEXT_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini";

// Generate a short caption for a Card Studio media from a brief the admin types. Admin-only.
// Body: { brief, kind?, context? }. Returns { caption }.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY fehlt." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { brief?: string; kind?: string; context?: string; imageUrl?: string };
  const brief = String(body.brief ?? "").trim().slice(0, 400);
  const imageUrl = String(body.imageUrl ?? "").trim();
  if (!brief && !imageUrl) return NextResponse.json({ error: "Bitte kurz reinschreiben oder ein Bild angeben." }, { status: 400 });
  const context = String(body.context ?? "").trim().slice(0, 120);

  const prompt = imageUrl
    ? [
        "You are Bella, an elegant luxury travel & fashion influencer (brand LuxuryBandit).",
        "Look at the attached photo and write BOTH a short title AND a caption (ENGLISH, first-person) that FIT what is actually shown — the outfit, the setting and the mood in the image.",
        brief ? `Extra hint: "${brief}".` : "",
        context ? `Context: ${context}.` : "",
        "Title: 2–4 words, punchy. Caption: 1–2 sentences, elegant/aspirational/tasteful, at most 1–2 fitting hashtags, no emoji flood. Keep it tasteful.",
        'Return ONLY strict JSON: {"title":"...","caption":"..."}',
      ].filter(Boolean).join(" ")
    : [
        "You are Bella, an elegant luxury travel & fashion influencer (brand LuxuryBandit).",
        `From this short brief, write BOTH a short title AND a caption (ENGLISH, first-person): "${brief}".`,
        context ? `Context: ${context}.` : "",
        body.kind === "video" ? "It is about a short video." : "",
        "Title: 2–4 words, punchy. Caption: 1–2 sentences, elegant/aspirational/tasteful, at most 1–2 fitting hashtags, no emoji flood.",
        'Return ONLY strict JSON: {"title":"...","caption":"..."}',
      ].filter(Boolean).join(" ");

  const content: any[] = imageUrl
    ? [{ type: "input_text", text: prompt }, { type: "input_image", image_url: imageUrl }]
    : [{ type: "input_text", text: prompt }];

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: TEXT_MODEL, input: [{ role: "user", content }] }),
    });
    if (!res.ok) return NextResponse.json({ error: "OpenAI-Fehler." }, { status: 502 });
    const data = await res.json().catch(() => null);
    const raw = String(
      data?.output_text ??
      data?.output?.flatMap((i: any) => i?.content ?? [])?.map((c: any) => c?.text ?? "")?.join("\n") ??
      ""
    ).trim();
    if (!raw) return NextResponse.json({ error: "Kein Text erhalten." }, { status: 502 });
    // Prefer strict JSON { title, caption }; fall back to using the whole text as the caption.
    let title = "", caption = raw;
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) { try { const j = JSON.parse(m[0]); title = String(j.title ?? "").trim(); caption = String(j.caption ?? "").trim() || raw; } catch { /* keep fallback */ } }
    return NextResponse.json({ ok: true, title, caption });
  } catch {
    return NextResponse.json({ error: "Text-Generierung fehlgeschlagen." }, { status: 502 });
  }
}
