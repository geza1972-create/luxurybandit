import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 500) || "OpenAI returned an invalid response." } };
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY fehlt in .env.local. Bitte Server nach dem Eintragen neu starten." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  const name = String(formData.get("name") ?? "").trim();

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Kein Produktbild erhalten." }, { status: 400 });
  }

  const dataUrl = await fileToDataUrl(image);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "You are helping a fashion marketplace seller write a listing.",
                "Look at the product photo and return a JSON object with exactly three keys:",
                "1. \"title\": a short punchy product title (3–6 words), e.g. 'Black Lace Corset Set' or 'Vintage Gucci Leather Bag'. Capitalise each word. No brand names unless clearly visible on the product. No emojis.",
                "2. \"description\": 1–2 short sentences describing what a buyer can see — item type, color, brand/logo if visible, style, condition if apparent. No invented details. No emojis. No AI wording.",
                "3. \"hashtags\": a string of 10–15 relevant Instagram hashtags starting with #, separated by spaces. Mix broad (#vintage #fashion) and specific (#dolcegabbana #leopardprint #blazer) tags relevant to this item.",
                "Return ONLY valid JSON, no extra text.",
                name ? `Existing name (hint only, do not copy): ${name}.` : ""
              ].filter(Boolean).join(" ")
            },
            {
              type: "input_image",
              image_url: dataUrl
            }
          ]
        }
      ]
    })
  });

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error?.message ?? `OpenAI konnte keine Beschreibung erstellen. Status ${response.status}.` },
      { status: response.status }
    );
  }

  const rawText = String(
    payload?.output_text ??
    payload?.output?.flatMap((item: any) => item?.content ?? [])
      ?.map((content: any) => content?.text ?? "")
      ?.join("\n") ??
    ""
  ).trim();

  if (!rawText) {
    return NextResponse.json({ error: "OpenAI hat keine Antwort zurückgegeben." }, { status: 502 });
  }

  // Try to parse as JSON first (new format), fall back to plain text (old format)
  let title = "";
  let description = "";
  let hashtags = "";
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? rawText);
    title = String(parsed.title ?? "").trim();
    description = String(parsed.description ?? "").trim();
    hashtags = String(parsed.hashtags ?? "").trim();
  } catch {
    description = rawText; // fallback: treat whole response as description
  }

  if (!description) {
    return NextResponse.json({ error: "OpenAI hat keine Beschreibung zurückgegeben." }, { status: 502 });
  }

  return NextResponse.json({ title, description, hashtags });
}
