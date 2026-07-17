// Onboarding email: "your AI influencer is ready — set your password & open your dashboard".
// Mints a set-password / login link via the Supabase Admin API (Supabase's own mailer is broken
// on this project), auto-provisions the auth account if needed, and sends via our SMTP/Resend
// mailer. Shared by /api/onboarding-email (admin button) and the confirm-paid auto-send.

import { sendEmail } from "@/lib/email-send";
import { createAuthUser } from "@/lib/supabase-admin-users";

type Cur = { email?: string; firstName?: string; lastName?: string; modelName?: string };

async function mintLoginLink(supabaseUrl: string, serviceKey: string, email: string, redirectTo: string): Promise<string> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "recovery", email, redirect_to: redirectTo }),
    });
    if (!res.ok) return "";
    const data = (await res.json().catch(() => ({}))) as { action_link?: string; properties?: { action_link?: string } };
    return data.properties?.action_link ?? data.action_link ?? "";
  } catch { return ""; }
}

export async function sendOnboardingEmail(cur: Cur, origin: string): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  const email = (cur.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "invalid email" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "") ?? "";
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const hasMailer = !!((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
  if (!supabaseUrl || !serviceKey) return { ok: false, skipped: "no-supabase-admin" };

  const site = origin.replace(/\/$/, "");
  const redirectTo = `${site}/auth/reset-password`;
  let link = await mintLoginLink(supabaseUrl, serviceKey, email, redirectTo);
  if (!link) {
    await createAuthUser(email, [cur.firstName, cur.lastName].filter(Boolean).join(" ")).catch(() => false);
    link = await mintLoginLink(supabaseUrl, serviceKey, email, redirectTo);
  }
  if (!link) return { ok: false, skipped: "no-link" };
  if (!hasMailer) return { ok: false, skipped: "no-mailer" };

  const personName = (cur.firstName || "").trim();
  const influencer = (cur.modelName || [cur.firstName, cur.lastName].filter(Boolean).join(" ") || "your influencer").trim();
  const greeting = personName ? `Hi ${personName}` : "Welcome";
  const subject = `${influencer} is ready — open your dashboard 🎉`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/><title>${subject}</title><style>:root{color-scheme:light;supported-color-schemes:light}</style></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#000;padding:28px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.2em;color:#fff;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#fff;">${influencer} is ready 🎉</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111;">${greeting} 👋</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">Your AI influencer <strong>${influencer}</strong> is set up and ready to grow. We&apos;ve prepared everything so you can start right away — just open your dashboard.</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${link}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.05em;padding:14px 36px;border-radius:100px;">Set your password &amp; open your dashboard &rarr;</a>
        </td></tr></table>
        <p style="margin:18px 0 26px;font-size:12px;line-height:1.6;color:#999;text-align:center;">The button logs you in and takes you straight to your dashboard, where you&apos;ll see ${influencer}. You&apos;ll set (and can always change) your password on the way in.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:12px;padding:20px 24px;">
          <tr><td>
            <p style="margin:0 0 12px;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#999;">What happens next</p>
            <p style="margin:0 0 10px;font-size:13px;color:#333;">💎 <strong>We create her content</strong> — fresh luxury photos &amp; videos, every day.</p>
            <p style="margin:0 0 10px;font-size:13px;color:#333;">💬 <strong>Chat with her yourself</strong> — and her fans chat with her too.</p>
            <p style="margin:0 0 10px;font-size:13px;color:#333;">📈 <strong>She grows in value</strong> — the longer you own her, the more she's worth.</p>
            <p style="margin:0;font-size:13px;color:#333;">👥 <strong>Her fans subscribe &amp; Super Follow</strong> — you grow the audience, we handle the rest.</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">LuxuryBandit · <a href="https://luxurybandit.com" style="color:#bbb;">luxurybandit.com</a><br/>This link is single-use and expires after a short while — request a new one from the login page if it lapses.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const sent = await sendEmail({ to: email, subject, html });
  return sent.ok ? { ok: true } : { ok: false, error: sent.error ?? "send failed" };
}
