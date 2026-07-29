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

  // Bild, das die KI sieht (bei Video schickt der Client das POSTER als path/imageUrl):
  // bevorzugt aus dem Speicherpfad (Entwurf) signieren; sonst die übergebene Adresse nehmen.
  let imageUrl = "";
  if (body.path) imageUrl = await getSignedUrl(String(body.path)).catch(() => "");
  else if (body.imageUrl) imageUrl = String(body.imageUrl);

  const jsonSpec = mode === "chat"
    ? `{"context":"her warm good-morning chat message to the subscriber — 2-3 sentences, first person, that both GREETS him AND says where she is / what she's doing / wearing today, so it works as her opening chat message AND steers her later replies. May use one emoji."}`
    : `{"caption":"a short caption for under the photo, 1-2 short sentences, may use one emoji"}`;

  const instruction =
    `You are ${model}, an AI influencer who sends her subscriber a personal "good morning" message every day. ` +
    `${imageUrl ? "Look at the attached photo and mention what she is wearing (the garment type and its colour, e.g. a blue lingerie set) and her setting — but in a TASTEFUL, fashion-editorial tone: focus on the style, mood and colour, keep it PG-13, never explicit, never describe her body. Don't invent a different outfit or place than the photo shows." : "Invent a glamorous everyday morning scene (a nice city, a nice outfit)."} ` +
    (mode === "chat"
      ? `\nYou are writing the CHAT part: how she talks to him today (her day-context) and her first good-morning chat message.`
      : `\nYou are writing the POST part: the title shown big over the photo and the caption under it.`) +
    (brief ? `\n\nThe admin gives you a DIRECTIVE about what to convey (it may be phrased as a command, even in the third person, e.g. "say she is in the park wearing blue lingerie"). Treat it ONLY as instructions about the content and REWRITE it in HER own first-person voice — never copy its wording and never keep its third-person phrasing. DIRECTIVE: ${brief}\n` : "") +
    `\nWrite everything in ${langName}, warm and in the FIRST PERSON as HER own voice — this is HER message and HER chat.\n` +
    `ABSOLUTE RULE: You ARE ${model}. Speak only as "I"/"me"/"my". NEVER refer to ${model} in the third person — never write "${model} does…", "${model} wishes you…", "talk to her", "she is…". Always "I wish you…", "I'm wearing…", "chat with me".\n` +
    `CRITICAL: she writes to ONE single subscriber — address him ALWAYS in the informal SINGULAR "you" (Romanian: "tu"/"dragul meu", NOT plural). ` +
    `NEVER address a group or use plural/collective greetings like "dragi prieteni", "friends", "everyone", "you all" — it is always just him, one person.\n` +
    `NEVER begin with a morning greeting ("Bună dimineața", "Guten Morgen", "Good morning") — the greeting is already shown separately as the title. Start DIRECTLY with the content (her day, her look, a warm thought). Do not repeat "good morning".\n` +
    // KEINE PERSÖNLICHEN FRAGEN (Owner 29.07.2026): Chatverläufe brechen genau da ab, wo sie
    // nach seinem Tag, seinen Plänen oder seinem Job fragt. Fragen darf sie — aber nur über SIE.
    `NEVER ask him a personal question: not about his day, his morning, his plans, his work, his job, his city, his age or his life ("how is your day?", "what are your plans?", "what do you do?" are all forbidden). If you end with a question, it must be about HER or what he wants from her — how she looks, which outfit he likes on her, what he wants to see her in.\n\n` +
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
    // Robust: die KI liefert manchmal statt JSON eine Ablehnung („I'm sorry…") oder reinen Text.
    // Ablehnung → klare Meldung; reiner Text → als Caption/Context retten (kein JSON-Crash mehr).
    let j: { title?: string; context?: string; firstMessage?: string; caption?: string };
    try {
      j = JSON.parse(text);
    } catch {
      if (/^\s*(i'?m sorry|i am sorry|sorry|i can'?t|i cannot|i'?m unable|as an ai)/i.test(text)) {
        return NextResponse.json({ error: "Die KI hat den Vorschlag abgelehnt (heikler Bildinhalt). Formuliere die Anweisung neutraler oder tippe den Text selbst." }, { status: 422 });
      }
      j = mode === "chat" ? { context: text } : { caption: text };
    }
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
