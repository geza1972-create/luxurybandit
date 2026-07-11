// Send an SMS via Twilio's REST API. No-op (returns false) unless ALL of these env vars are set:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (a Twilio number), ADMIN_PHONE (your number,
//   E.164 e.g. +40…). So the app runs fine without SMS; add the vars in Vercel to switch it on.
export async function sendSms(body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const to = process.env.ADMIN_PHONE;
  if (!sid || !token || !from || !to) return false;
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 320) }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch { return false; }
}
