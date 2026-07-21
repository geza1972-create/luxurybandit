import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BELLA_ID = "curator-1783683672619-td4cy";

// Double-Opt-in-Bestätigung: der Link aus der E-Mail landet hier. Wir setzen den
// Datensatz auf „bestätigt" und leiten in die persönliche Ansicht (?s=) weiter —
// dort merkt sich das Gerät den Login. Idempotent (mehrfaches Klicken ist ok).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const modelId = url.searchParams.get("model")?.trim() || BELLA_ID;
  const token = url.searchParams.get("token")?.trim() || "";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin;

  if (!token) return NextResponse.redirect(`${origin}/themes/wetter/${encodeURIComponent(modelId)}`);

  try {
    const subs = await readWetterSubscribers(modelId);
    const sub = subs.find(s => s.confirmToken === token);
    if (!sub) return NextResponse.redirect(`${origin}/themes/wetter/${encodeURIComponent(modelId)}?confirm=invalid`);
    if (!sub.confirmed) {
      sub.confirmed = true;
      await writeWetterSubscribers(subs, modelId);
    }
    // In die persönliche Ansicht — ?s= loggt das Gerät ein, ?confirmed=1 zeigt den Haken.
    return NextResponse.redirect(`${origin}/themes/wetter/${encodeURIComponent(modelId)}?s=${encodeURIComponent(sub.id)}&confirmed=1`);
  } catch {
    return NextResponse.redirect(`${origin}/themes/wetter/${encodeURIComponent(modelId)}?confirm=error`);
  }
}
