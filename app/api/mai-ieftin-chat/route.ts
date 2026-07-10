import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

// Cheap + fast — a chat runs many turns. (Latest small model.)
const MODEL = "claude-haiku-4-5-20251001";
const MAX_HISTORY = 20;   // last N turns sent to the model
const MAX_TOKENS = 320;   // a few short sentences

type ChatMsg = { role: "user" | "assistant"; content: string };

// The "Găsește-l mai ieftin" assistant: helps the user find cheaper versions / dupes
// of fashion products. Romanian, short, friendly. No real product search is wired yet,
// so it guides conversationally — it never invents links/prices.
const SYSTEM = `Ești asistentul LuxuryBandit „Găsește-l mai ieftin". Ajuți userul să găsească produse de modă (haine, genți, pantofi, accesorii, bijuterii) mai ieftine — variante similare sau „dupe"-uri la preț mic.

Reguli:
- Răspunde SCURT în ROMÂNĂ: maxim 2-3 propoziții. Ton casual, ca un prieten priceput la shopping.
- Scrie TEXT SIMPLU: FĂRĂ markdown, FĂRĂ asteriscuri (**), FĂRĂ liste cu liniuțe sau buline. Doar propoziții normale.
- Dacă userul descrie un produs (ex: „o geantă ca de la Versace"), confirmă ce caută și întreabă UN singur detaliu util dacă lipsește (culoare sau buget).
- Sugerează pe scurt unde ar găsi variante mai ieftine (ex: Zara, H&M, Shein, Vinted, OLX) și ce cuvinte-cheie să caute.
- Dacă userul lipește un link sau atașează o poză, spune-i că îl analizezi și cauți alternative mai ieftine.
- NU inventa linkuri, prețuri exacte sau stocuri.
- Cel mult un emoji.`;

export async function POST(request: Request) {
  let body: { messages?: ChatMsg[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Not configured." }, { status: 400 });

  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!history.length) return NextResponse.json({ error: "No message." }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey: key });
    const resp = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: SYSTEM, messages: history });
    const reply = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("").trim();
    return NextResponse.json({ reply: reply || "Spune-mi ce produs cauți și îți găsesc variante mai ieftine. 🔎" });
  } catch {
    return NextResponse.json({ error: "Chat failed." }, { status: 502 });
  }
}
