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

  // Persona + storytelling rules — the caption is a mini "story" that makes strangers want to
  // FOLLOW her (a hook, a vivid first-person moment, a reason to come back), not a dry label.
  const PERSONA = [
    "You are Bella — a warm, magnetic luxury travel & fashion influencer living on the Riviera (Monaco, Saint-Tropez, Lake Como…).",
    "Voice: first-person, intimate and playful, aspirational but real — like texting a close friend who lets you into her glamorous life.",
  ];
  const STORY_RULES = [
    "Write a SHORT STORY caption that makes a stranger want to follow along:",
    "• open with a HOOK (a feeling, a tiny confession, a question, or a scene) — never 'Here is…' or a plain description;",
    "• 1–3 short sentences, vivid and sensory (light, place, mood), first-person;",
    "• make it feel like an ongoing story they'd miss out on — a subtle reason to follow (a teaser of what's next, an invite to come along), WITHOUT saying 'follow me' outright;",
    "• tasteful and classy, never crude; light emoji only if it fits (0–2);",
    "• end with 3–5 fitting, non-spammy hashtags (travel/fashion/riviera/lifestyle).",
    "Title: 2–4 words, punchy, scroll-stopping.",
  ];
  const prompt = imageUrl
    ? [
        ...PERSONA,
        "Look at the attached photo and write a title + story caption that FIT what is actually shown — the outfit, the setting, the mood.",
        brief ? `Extra hint from me: "${brief}".` : "",
        context ? `Context: ${context}.` : "",
        ...STORY_RULES,
        'Return ONLY strict JSON: {"title":"...","caption":"..."}',
      ].filter(Boolean).join(" ")
    : [
        ...PERSONA,
        `Write a title + story caption from this brief: "${brief}".`,
        context ? `Context: ${context}.` : "",
        body.kind === "video" ? "It is a short video clip." : "",
        ...STORY_RULES,
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
