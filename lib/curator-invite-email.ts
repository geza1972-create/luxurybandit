// "Become a curator" follow-up email — sent once to people who just did a free
// try-on (the entry point). Uses Resend; silently no-ops if RESEND_API_KEY is unset
// so it can never break the lead capture. Mirrors the welcome-email styling.

import { sendEmail } from "@/lib/email-send";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://luxurybandit.com").replace(/\/$/, "");

export async function sendCuratorInviteEmail(email: string, name?: string): Promise<{ ok: boolean; skipped?: boolean }> {
  const to = (email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false };

  const greeting = name ? `Hi ${name}` : "Hi there";
  const applyUrl = `${APP_URL}/curators/apply`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Become a LuxuryBandit curator</title></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#000000;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">LuxuryBandit</p>
            <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#ffffff;">Loved your try-on? Get paid for your taste.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111;">${greeting} 👋</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
              You just tried a look on with AI — that's exactly what our <strong>curators</strong> do, except they get paid for it.
              Curate the pieces you love, share them, and earn an affiliate commission every time someone shops your picks.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
              <tr><td>
                <p style="margin:0 0 12px;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#999;">Why become a curator</p>
                <p style="margin:0 0 10px;font-size:13px;color:#333;">💸 <strong>Earn affiliate commission</strong> on every look you curate</p>
                <p style="margin:0 0 10px;font-size:13px;color:#333;">✨ <strong>Free AI try-ons & videos</strong> to bring your looks to life</p>
                <p style="margin:0 0 10px;font-size:13px;color:#333;">📸 <strong>Your own profile</strong> — your taste, your audience</p>
                <p style="margin:0;font-size:13px;color:#333;">⚡ <strong>Free to start</strong> — apply in under a minute</p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
              <a href="${applyUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.05em;padding:14px 36px;border-radius:100px;">
                Become a curator →
              </a>
            </td></tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">
              LuxuryBandit · <a href="${APP_URL}" style="color:#bbb;">luxurybandit.com</a><br/>
              You're receiving this because you tried on a look at LuxuryBandit.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const sent = await sendEmail({ to, subject: "You just styled a look — become a LuxuryBandit curator 🖤", html });
  return { ok: sent.ok, skipped: sent.skipped ? true : undefined };
}
