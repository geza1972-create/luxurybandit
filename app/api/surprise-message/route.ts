import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Textvorschläge für „Surprise him": drei kurze Zeilen, die SIE ihm mitschicken kann.
// Bewusst warm-verspielt, aber nie explizit — die Zeile landet in einer E-Mail, die auch
// auf einem Sperrbildschirm auftauchen kann.
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM = `You write ONE-LINE messages a woman sends her partner together with a private
video she made for him. Rules:
- 3 suggestions, each max 90 characters, no quotation marks, no emoji spam (at most one).
- Warm, playful, teasing — never sexually explicit, never crude. These lines can appear on a
  lock screen, so they must be safe to read in public.
- Speak as her, in second person to him ("you"). No names unless given.
- Vary the tone: one sweet, one playful, one confident.
Answer with the three lines only, one per line, nothing else.`;

export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { lang?: string; hint?: string };
  const lang = String(body.lang ?? "en").slice(0, 5);
  const hint = String(body.hint ?? "").slice(0, 120);

  try {
    const anthropic = new Anthropic({ apiKey: key });
    const res = await anthropic.messages.create({
      model: MODEL, max_tokens: 200, system: SYSTEM,
      messages: [{
        role: "user",
        content: `Language: ${lang}. ${hint ? `She says the mood should be: ${hint}.` : "No extra wish."} Give the three lines.`,
      }],
    });
    const text = res.content.map(c => (c.type === "text" ? c.text : "")).join("\n");
    const lines = text.split("\n").map(l => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 3);
    if (!lines.length) return NextResponse.json({ error: "No suggestion." }, { status: 502 });
    return NextResponse.json({ lines });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI call failed." }, { status: 502 });
  }
}
