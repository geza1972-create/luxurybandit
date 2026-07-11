import { NextResponse } from "next/server";
import { resolveAdminWa } from "@/lib/whatsapp-send";

export const runtime = "nodejs";

// Admin-only WhatsApp diagnostics. Resolves the admin's CallMeBot (env OR user_metadata, same as
// the try-on/message notify), sends a test, and returns the RAW CallMeBot response.
// GET /api/wa-test?pin=<admin pin>
export async function GET(request: Request) {
  const pin = new URL(request.url).searchParams.get("pin") ?? "";
  if (!process.env.TRY_THIS_LOOK_ADMIN_PIN || pin !== process.env.TRY_THIS_LOOK_ADMIN_PIN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const wa = await resolveAdminWa();
  if (!wa) {
    return NextResponse.json({ found: false, note: "No CallMeBot config — set whatsapp_number + callmebot_key in the admin's profile (Seller dashboard), or CALLMEBOT_PHONE/CALLMEBOT_APIKEY env vars." });
  }
  const u = new URL("https://api.callmebot.com/whatsapp.php");
  u.searchParams.set("phone", wa.phone);
  u.searchParams.set("text", "✅ LuxuryBandit chat notifications are working!");
  u.searchParams.set("apikey", wa.key);
  try {
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(9000) });
    const body = (await res.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
    return NextResponse.json({ found: true, source: wa.source, phoneMasked: wa.phone.slice(0, 4) + "…" + wa.phone.slice(-3), status: res.status, ok: res.ok, callmebot: body });
  } catch (e) {
    return NextResponse.json({ found: true, source: wa.source, error: String(e).slice(0, 200) });
  }
}
