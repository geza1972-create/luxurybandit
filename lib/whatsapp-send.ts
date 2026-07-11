// Send a WhatsApp message to the admin via CallMeBot (free, no Twilio/sandbox/templates).
// No-op (returns false) unless both env vars are set:
//   CALLMEBOT_PHONE   = your number incl. country code, e.g. +40724644477
//   CALLMEBOT_APIKEY  = the API key CallMeBot gave you (message their WhatsApp bot once to get it)
// Setup: WhatsApp "I allow callmebot to send me messages to chat" to +34 644 51 95 23 → you get the key.
export async function sendWhatsApp(body: string): Promise<boolean> {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return false;
  try {
    const u = new URL("https://api.callmebot.com/whatsapp.php");
    u.searchParams.set("phone", phone);
    u.searchParams.set("text", body.slice(0, 1000));
    u.searchParams.set("apikey", apikey);
    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(9000) });
    return res.ok;
  } catch { return false; }
}
