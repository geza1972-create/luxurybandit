import { NextResponse } from "next/server";
import { getSignedUrl } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";

export const runtime = "nodejs";

// Suggest a short, warm first-person caption for a freshly-uploaded IMAGE — she (or admin,
// gifting) can edit it before saving. Cheap, best-effort: on any failure, just return "".
export async function POST(request: Request) {
  const admin = await isAdminRequest(request);
  if (!admin) { const user = await getSellerFromRequest(request); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 }); }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ caption: "" });
  const body = (await request.json().catch(() => ({}))) as { path?: string };
  const path = String(body.path ?? "").trim();
  if (!path) return NextResponse.json({ caption: "" });
  try {
    const url = await getSignedUrl(path);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini", temperature: 0.8, max_tokens: 80,
        messages: [{ role: "user", content: [
          { type: "text", text: "Write ONE short, warm, first-person Instagram-style caption (max 1-2 sentences, can include an emoji) for this photo, as if she posted it herself. Return ONLY the caption text, nothing else." },
          { type: "image_url", image_url: { url } },
        ] }],
      }),
    });
    const p = await res.json();
    const caption = String(p?.choices?.[0]?.message?.content ?? "").trim().replace(/^"|"$/g, "");
    return NextResponse.json({ caption });
  } catch { return NextResponse.json({ caption: "" }); }
}
