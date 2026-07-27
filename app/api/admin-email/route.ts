import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// POST { subject, message, emails: string[] } — admin-only. Freeform email, sent as-is to
// each recipient (a test to yourself, or a broadcast to selected users/models).
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { subject?: string; message?: string; emails?: unknown[] };
  const subject = String(body.subject ?? "").trim().slice(0, 140);
  const message = String(body.message ?? "").trim().slice(0, 8000);
  if (!subject || !message) return NextResponse.json({ error: "Betreff und Nachricht sind erforderlich." }, { status: 400 });

  const emails = [...new Set(
    (Array.isArray(body.emails) ? body.emails : []).map(e => String(e).trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
  )].slice(0, 500);
  if (!emails.length) return NextResponse.json({ error: "Keine gültigen Empfänger." }, { status: 400 });

  const html = wrap(subject, message);
  let sent = 0; const failed: string[] = [];
  for (const to of emails) {
    try { const r = await sendEmail({ to, subject, html }); if (r?.ok) sent++; else failed.push(to); }
    catch { failed.push(to); }
  }
  return NextResponse.json({ ok: true, sent, failed });
}

function wrap(subject: string, message: string) {
  const msg = esc(message).replace(/\n/g, "<br>");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="color-scheme" content="light" /></head>
<body style="margin:0;padding:24px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#000;padding:26px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.2em;color:#f6cf51;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:8px 0 0;font-size:20px;font-weight:900;color:#fff;">${esc(subject)}</p>
      </td></tr>
      <tr><td style="padding:30px 28px;">
        <p style="margin:0;font-size:15px;line-height:1.7;color:#333;">${msg}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
