import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";

export const dynamic = "force-dynamic";

// Where contact-form messages land. The mailbox we send FROM (SMTP_USER) is also
// the recipient, so support@luxurybandit.com both sends and receives.
const SUPPORT_TO = process.env.SMTP_USER?.trim() || "support@luxurybandit.com";

// Allowed contact reasons (value → German label). Anything else is rejected.
const REASONS: Record<string, string> = {
  support: "Support",
  complaint: "Beschwerde",
  general: "Allgemein",
};

const esc = (s: string) => s.replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
));

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    | { name?: string; email?: string; reason?: string; message?: string; company?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });

  // Honeypot: bots fill the hidden "company" field — silently accept, don't send.
  if (String(body.company ?? "").trim()) return NextResponse.json({ ok: true });

  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const reason = String(body.reason ?? "").trim();
  const message = String(body.message ?? "").trim().slice(0, 5000);

  // Server-side validation — mirror the client rules, never trust the client.
  if (name.length < 2) return NextResponse.json({ error: "Bitte gib deinen Namen ein." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  if (!REASONS[reason]) return NextResponse.json({ error: "Bitte wähle einen Grund." }, { status: 400 });
  if (message.length < 5) return NextResponse.json({ error: "Bitte schreibe eine kurze Nachricht." }, { status: 400 });

  const reasonLabel = REASONS[reason];

  // 1) Notify support (reply-to = the visitor, so we can answer directly).
  const supportHtml = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#111">
      <h2 style="margin:0 0 12px">Neue Kontaktanfrage · ${esc(reasonLabel)}</h2>
      <p style="margin:0 0 6px"><strong>Von:</strong> ${esc(name)} &lt;${esc(email)}&gt;</p>
      <p style="margin:0 0 6px"><strong>Grund:</strong> ${esc(reasonLabel)}</p>
      <p style="margin:12px 0 4px"><strong>Nachricht:</strong></p>
      <p style="white-space:pre-wrap;margin:0;padding:12px;background:#f6f6f6;border-radius:8px">${esc(message)}</p>
      <p style="margin:16px 0 0;color:#888;font-size:12px">Über das Kontaktformular auf luxurybandit.com. Direkt antworten, um ${esc(email)} zu erreichen.</p>
    </div>`;

  const supportRes = await sendEmail({
    to: SUPPORT_TO,
    subject: `Kontakt (${reasonLabel}) von ${name}`,
    html: supportHtml,
    replyTo: email,
  });

  if (!supportRes.ok) {
    return NextResponse.json({ error: "Konnte gerade nicht senden. Bitte versuche es später erneut." }, { status: 502 });
  }

  // 2) Auto-confirmation to the visitor — "we got it, we'll be in touch". Best-effort:
  //    if it fails we don't fail the whole request (support already has the message).
  const confirmHtml = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#111;max-width:520px">
      <h2 style="margin:0 0 12px">Danke für deine Nachricht, ${esc(name)}!</h2>
      <p style="margin:0 0 10px">Wir haben deine Anfrage erhalten und melden uns so schnell wie möglich bei dir.</p>
      <p style="margin:0 0 4px;color:#555"><strong>Grund:</strong> ${esc(reasonLabel)}</p>
      <p style="margin:0 0 4px;color:#555"><strong>Deine Nachricht:</strong></p>
      <p style="white-space:pre-wrap;margin:0 0 14px;padding:12px;background:#f6f6f6;border-radius:8px;color:#333">${esc(message)}</p>
      <p style="margin:0;color:#888;font-size:12px">Diese Bestätigung wurde automatisch gesendet — du musst nicht darauf antworten. Wir kümmern uns darum.</p>
      <p style="margin:14px 0 0;font-weight:700">— Das LuxuryBandit Team</p>
    </div>`;

  await sendEmail({
    to: email,
    subject: "Wir haben deine Nachricht erhalten – LuxuryBandit",
    html: confirmHtml,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
