import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";

export const dynamic = "force-dynamic";

// Where contact-form messages land. The mailbox we send FROM (SMTP_USER) is also
// the recipient, so support@luxurybandit.com both sends and receives.
const SUPPORT_TO = process.env.SMTP_USER?.trim() || "support@luxurybandit.com";

const esc = (s: string) => s.replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
));

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    | { name?: string; email?: string; message?: string; subject?: string; company?: string }
    | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  // Honeypot: bots fill the hidden "company" field — silently accept, don't send.
  if (String(body.company ?? "").trim()) return NextResponse.json({ ok: true });

  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const subject = String(body.subject ?? "").trim().slice(0, 160);
  const message = String(body.message ?? "").trim().slice(0, 5000);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (message.length < 5) {
    return NextResponse.json({ error: "Please write a short message." }, { status: 400 });
  }

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#111">
      <h2 style="margin:0 0 12px">New contact message</h2>
      <p style="margin:0 0 6px"><strong>From:</strong> ${esc(name || "—")} &lt;${esc(email)}&gt;</p>
      ${subject ? `<p style="margin:0 0 6px"><strong>Subject:</strong> ${esc(subject)}</p>` : ""}
      <p style="margin:12px 0 4px"><strong>Message:</strong></p>
      <p style="white-space:pre-wrap;margin:0;padding:12px;background:#f6f6f6;border-radius:8px">${esc(message)}</p>
      <p style="margin:16px 0 0;color:#888;font-size:12px">Sent from the luxurybandit.com contact form. Reply directly to answer ${esc(email)}.</p>
    </div>`;

  const res = await sendEmail({
    to: SUPPORT_TO,
    subject: subject ? `Contact: ${subject}` : `New contact message from ${name || email}`,
    html,
    replyTo: email,
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Could not send right now. Please email support@luxurybandit.com directly." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
