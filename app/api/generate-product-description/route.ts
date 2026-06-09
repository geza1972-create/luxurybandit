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
                "Write a short marketplace product description for this fashion listing.",
                "Focus on what a buyer can see: item type, color, brand/logo if visible, material impression, condition impression only if visible, fit/style, and useful details.",
                "Do not invent exact material, authenticity, size, condition, price, availability, or delivery details.",
                "Use simple seller-friendly language. No hashtags. No emojis. No AI wording.",
                "Return only the description text, 1 to 2 short sentences.",
                name ? `Listing name: ${name}.` : ""
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

  const description = String(
    payload?.output_text ??
    payload?.output?.flatMap((item: any) => item?.content ?? [])
      ?.map((content: any) => content?.text ?? "")
      ?.join("\n") ??
    ""
  ).trim();

  if (!description) {
    return NextResponse.json({ error: "OpenAI hat keine Beschreibung zurückgegeben." }, { status: 502 });
  }

  return NextResponse.json({ description });
}
