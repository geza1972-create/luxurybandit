import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Admin-only WhatsApp diagnostics: hits CallMeBot with the configured env vars and returns the
// RAW response so we can see exactly what's wrong (bad apikey, unconfirmed number, etc.).
// GET /api/wa-test?pin=<admin pin>
export async function GET(request: Request) {
  const pin = new URL(request.url).searchParams.get("pin") ?? "";
  if (!process.env.TRY_THIS_LOOK_ADMIN_PIN || pin !== process.env.TRY_THIS_LOOK_ADMIN_PIN) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) {
    return NextResponse.json({ phoneSet: !!phone, keySet: !!apikey, note: "CALLMEBOT_PHONE / CALLMEBOT_APIKEY missing on this deploy — set them in Vercel + redeploy." });
  }
  const u = new URL("https://api.callmebot.com/whatsapp.php");
  u.searchParams.set("phone", phone);
  u.searchParams.set("text", "✅ LuxuryBandit test — WhatsApp works!");
  u.searchParams.set("apikey", apikey);
  try {
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(9000) });
    const body = (await res.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);
    return NextResponse.json({ phoneSet: true, keySet: true, phoneMasked: phone.slice(0, 4) + "…" + phone.slice(-3), status: res.status, ok: res.ok, callmebot: body });
  } catch (e) {
    return NextResponse.json({ phoneSet: true, keySet: true, error: String(e).slice(0, 200) });
  }
}
