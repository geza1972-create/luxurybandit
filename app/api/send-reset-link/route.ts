import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";

// Password-reset email. Supabase's own /recover endpoint is broken on this project
// ("Error sending recovery email", 500 — no working mailer configured in Supabase),
// so we mint a recovery link via the Admin API (which works regardless of Supabase's
// email settings) and deliver it ourselves through our SMTP/Resend mailer.
//
// Honest degradation: returns { ok:true, sent:true } only when the mail actually went
// out. If the service key or mailer is missing it returns { ok:true, sent:false, skipped }
// so the UI can tell the user we couldn't send it (instead of a lying "check your email").
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; redirectTo?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "") ?? "";
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const hasMailer = !!((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: true, sent: false, skipped: "no-supabase-admin" });
  }

  // 1) Mint a recovery link via the Admin API. Returns 200 even if the email doesn't
  //    exist as a user is only created for signup/magiclink types — recovery for an
  //    unknown email returns an error we swallow into the generic response below.
  const redirectTo = String(body.redirectTo ?? "").trim() || "https://luxurybandit.com/auth/reset-password";
  let actionLink = "";
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "recovery", email, redirect_to: redirectTo }),
    });
    const data = (await res.json().catch(() => ({}))) as { action_link?: string; properties?: { action_link?: string }; msg?: string; message?: string };
    if (!res.ok) {
      // Don't leak whether the account exists — return a generic success-ish response.
      return NextResponse.json({ ok: true, sent: false, skipped: "no-account" });
    }
    actionLink = data.properties?.action_link ?? data.action_link ?? "";
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "generate_link failed." }, { status: 502 });
  }
  if (!actionLink) return NextResponse.json({ ok: true, sent: false, skipped: "no-link" });

  // 2) No mailer configured (e.g. local dev) → tell the caller we couldn't send.
  if (!hasMailer) return NextResponse.json({ ok: true, sent: false, skipped: "no-mailer" });

  const subject = "Reset your LuxuryBandit password";
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/><title>${subject}</title><style>:root{color-scheme:light;supported-color-schemes:light}</style></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#000;padding:28px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.2em;color:#fff;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#fff;">Reset your password</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111;">Forgot your password?</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">Tap below to set a new password for your LuxuryBandit account. If you didn't request this, you can safely ignore this email — your password stays the same.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${actionLink}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.05em;padding:14px 36px;border-radius:100px;">
            Set a new password &rarr;
          </a>
        </td></tr></table>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#999;text-align:center;">This link is single-use and expires after a short while. Just request a new one if it lapses.</p>
      </td></tr>
      <tr><td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">LuxuryBandit · <a href="https://luxurybandit.com" style="color:#bbb;">luxurybandit.com</a><br/>You received this because a password reset was requested for this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const sent = await sendEmail({ to: email, subject, html });
  if (!sent.ok) return NextResponse.json({ error: sent.error ?? "Failed to send." }, { status: 500 });
  return NextResponse.json({ ok: true, sent: true, via: sent.via });
}
