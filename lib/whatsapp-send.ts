// Send a WhatsApp message to the admin via Twilio. No-op (returns false) unless ALL of these
// env vars are set:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//   TWILIO_WHATSAPP_FROM  (the Twilio WhatsApp sender, e.g. whatsapp:+14155238886 — the sandbox),
//   ADMIN_WHATSAPP        (your number, e.g. +40724644477 — the "whatsapp:" prefix is added if missing).
// Sandbox note: your number must first JOIN the sandbox, and free-form messages only deliver
// within 24h of your last message to it (outside that window a pre-approved template is required).
export async function sendWhatsApp(body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM;
  const toRaw = process.env.ADMIN_WHATSAPP;
  if (!sid || !token || !fromRaw || !toRaw) return false;
  const wa = (n: string) => (n.startsWith("whatsapp:") ? n : `whatsapp:${n}`);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: wa(toRaw), From: wa(fromRaw), Body: body.slice(0, 1000) }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch { return false; }
}
