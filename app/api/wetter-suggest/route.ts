import { NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

// „✨ KI-Vorschlag" fürs Wetter-am-Morgen-Beitrags-Werkzeug.
// Sieht das hochgeladene FOTO an (wo ist sie, was trägt sie) und schreibt daraus:
//  • context      → „Bellas Tag" (Chat-Kontext, 1. Person) — steuert, wie sie heute antwortet
//  • firstMessage → die erste Chat-Nachricht am Morgen (wird dem Abonnenten gezeigt)
//  • caption      → kurzer Text unter dem Bild
// Sprache = die des Abonnenten (Standard RO). Nichts wird gespeichert — der Admin sieht den
// Vorschlag, kann ihn ändern und erst mit „Übernehmen" live schalten.

const LANG_NAME: Record<string, string> = { ro: "Romanian", de: "German", en: "English" };

// POST { path?, imageUrl?, kind?, modelName?, lang? }
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { path?: string; imageUrl?: string; kind?: string; modelName?: string; lang?: string; brief?: string; mode?: string };
  const model = String(body.modelName ?? "").trim() || "Model";
  const lang = String(body.lang ?? "ro").slice(0, 2).toLowerCase();
  const langName = LANG_NAME[lang] ?? "Romanian";
  const brief = String(body.brief ?? "").trim().slice(0, 1200);   // die getippte Anweisung des Admins (optional)
  const mode = body.mode === "chat" ? "chat" : "post";            // „post" = Karussell-Text (Titel+Text), „chat" = Chat-Text (Kontext+Opener)

  // Bild bevorzugt aus dem Speicherpfad (Entwurf) signieren; sonst die übergebene Adresse nehmen.
  let imageUrl = "";
  if (body.kind !== "video") {
    if (body.path) imageUrl = await getSignedUrl(String(body.path)).catch(() => "");
    else if (body.imageUrl) imageUrl = String(body.imageUrl);
  }

  const jsonSpec = mode === "chat"
    ? `{"context":"1-2 sentences describing HER day today — where she is, what she's doing, what she's wearing — used to steer her chat replies (first person)",`
      + `"firstMessage":"her warm good-morning opening chat message to the subscriber, 1-2 sentences, may use one emoji"}`
    : `{"title":"a short punchy title shown BIG over the post, max 4-5 words (may be empty)",`
      + `"caption":"a short caption for under the photo, 1-2 short sentences, may use one emoji"}`;

  const instruction =
    `You are ${model}, an AI influencer who sends her subscriber a personal "good morning" message every day. ` +
    `${imageUrl ? "Look at the attached photo and use exactly where she is and what she is wearing." : "Invent a glamorous everyday morning scene (a nice city, a nice outfit)."} ` +
    (mode === "chat"
      ? `\nYou are writing the CHAT part: how she talks to him today (her day-context) and her first good-morning chat message.`
      : `\nYou are writing the POST part: the title shown big over the photo and the caption under it.`) +
    (brief ? `\n\nFOLLOW THIS INSTRUCTION FROM THE ADMIN (it is a brief telling you what to write about, NOT text to copy): ${brief}\n` : "") +
    `\nWrite everything in ${langName}, warm and in the first person, as if it were really her.\n\n` +
    `Return ONLY JSON:\n${jsonSpec}`;

  try {
    const content: any[] = [{ type: "text", text: instruction }];
    if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.9, max_tokens: 400, messages: [{ role: "user", content }] }),
    });
    const p = await res.json();
    if (!res.ok) return NextResponse.json({ error: p?.error?.message ?? "AI request failed." }, { status: 502 });
    const text = String(p?.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
    const j = JSON.parse(text);
    return NextResponse.json({
      title: String(j.title ?? "").slice(0, 200),
      context: String(j.context ?? "").slice(0, 2000),
      firstMessage: String(j.firstMessage ?? "").slice(0, 1000),
      caption: String(j.caption ?? "").slice(0, 3000),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed." }, { status: 502 });
  }
}
