/**
 * SMS über Twilio — bewusst schlank gehalten (ein REST-Aufruf, kein SDK).
 *
 * Warum SMS: WhatsApp läuft bei jedem Anbieter über Meta und braucht ein verifiziertes
 * Business-Konto plus genehmigte Vorlagen — daran hing der Owner fest (28.07.2026).
 * SMS geht ohne Meta, ohne Vorlagen, sofort.
 *
 * Nötige Env (Twilio-Konsole):
 *   TWILIO_ACCOUNT_SID   — beginnt mit „AC…"
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM          — deine Twilio-Nummer (+1…/+40…)  ODER
 *   TWILIO_MESSAGING_SERVICE_SID — „MG…" (empfohlen: regelt Absender je Land selbst)
 *
 * ACHTUNG Testkonto: Solange das Konto im Trial ist, nimmt Twilio NUR verifizierte
 * Nummern an und stellt jeder Nachricht „Sent from your Twilio trial account" voran.
 * Für echte Empfänger muss das Konto aufgeladen/aktiviert sein.
 */

export type SmsResult = { ok: boolean; sid?: string; error?: string };

export function smsConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID?.trim() && process.env.TWILIO_AUTH_TOKEN?.trim()
    && (process.env.TWILIO_FROM?.trim() || process.env.TWILIO_MESSAGING_SERVICE_SID?.trim()));
}

export async function sendSms({ to, body }: { to: string; body: string }): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM?.trim();
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!sid || !token || (!from && !service)) return { ok: false, error: "Twilio ist nicht eingerichtet (TWILIO_*)." };

  const number = String(to || "").replace(/[^\d+]/g, "");
  if (!/^\+\d{8,15}$/.test(number)) return { ok: false, error: `Unbrauchbare Nummer: ${to}` };

  const form = new URLSearchParams({ To: number, Body: body.slice(0, 640) });
  if (service) form.set("MessagingServiceSid", service); else form.set("From", from as string);

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
    if (!res.ok) return { ok: false, error: data?.message || `Twilio ${res.status}` };
    return { ok: true, sid: data?.sid };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
  }
}
