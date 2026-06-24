import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authorizeStudio } from "@/lib/studio-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Default to the most capable model. Switch to "claude-sonnet-4-6" here if you
// want lower cost for these marketing-copy tasks.
const MODEL = "claude-opus-4-8";

const SYSTEM =
  "You are LuxuryBandit's marketing assistant for a vintage & luxury fashion marketplace. " +
  "Output only the requested content in the exact format asked for — no preamble, no meta-commentary, no closing remarks.";

export async function POST(request: Request) {
  if (!(await authorizeStudio(request)).ok) {
    return NextResponse.json({ error: "Studio access only." }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY fehlt in .env.local. Bitte eintragen und den Server neu starten." },
      { status: 400 }
    );
  }

  let payload: { prompt?: string; useSearch?: boolean };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const prompt = String(payload.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt fehlt." }, { status: 400 });
  }
  const useSearch = payload.useSearch === true;

  const client = new Anthropic({ apiKey });
  const tools = useSearch
    ? [{ type: "web_search_20260209" as const, name: "web_search" as const }]
    : undefined;

  try {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

    let response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      thinking: { type: "adaptive" },
      ...(tools ? { tools } : {}),
      messages,
    });

    // Web search is a server-side tool: the request may pause mid-loop. Resume
    // by re-sending the assistant turn until the model is done.
    let guard = 0;
    while (response.stop_reason === "pause_turn" && guard < 5) {
      messages.push({ role: "assistant", content: response.content });
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        thinking: { type: "adaptive" },
        ...(tools ? { tools } : {}),
        messages,
      });
      guard++;
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anthropic request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
