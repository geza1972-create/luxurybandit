import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";

// App-controlled "your look is ready + sign in" email. We do NOT rely on Supabase's
// own magic-link email (the project has email confirmations disabled / no SMTP, so it
// sends nothing). Instead we mint a magic link via the Supabase Admin API and deliver
// it ourselves through Resend, with the freshly generated try-on shown in the email.
//
// Degrades gracefully: returns { ok:true, skipped } when a key is missing so the funnel
// never breaks — the reveal still works, only the email is skipped.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    lookName?: string;
    imageUrl?: string;   // the generated try-on (public/signed URL) to show in the email
    redirectTo?: string; // where the magic link lands after sign-in (client origin + /auth/confirm)
  };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "valid email required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "") ?? "";
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const hasMailer = !!((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: true, skipped: "no-supabase-admin" });
  }

  // 1) Mint a magic link via the Admin API (works regardless of the project's email
  //    settings; also creates the user if they don't exist yet).
  const redirectTo = String(body.redirectTo ?? "").trim() || "https://luxurybandit.com/auth/confirm";
  let actionLink = "";
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "magiclink", email, redirect_to: redirectTo }),
    });
    const data = (await res.json().catch(() => ({}))) as { action_link?: string; properties?: { action_link?: string }; msg?: string; message?: string };
    if (!res.ok) return NextResponse.json({ error: data.msg ?? data.message ?? "Could not generate sign-in link." }, { status: 502 });
    actionLink = data.properties?.action_link ?? data.action_link ?? "";
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "generate_link failed." }, { status: 502 });
  }
  if (!actionLink) return NextResponse.json({ error: "No sign-in link returned." }, { status: 502 });

  // 2) Deliver it ourselves (SMTP mailbox preferred, Resend fallback). No mailer
  //    configured → skip silently (e.g. local dev).
  if (!hasMailer) return NextResponse.json({ ok: true, skipped: "no-mailer", linkGenerated: true });

  const lookName = String(body.lookName ?? "").trim();
  const imageUrl = String(body.imageUrl ?? "").trim();
  const safeImg = /^https?:\/\//.test(imageUrl) ? imageUrl : "";

  // Two contexts share this magic-link mailer: the funnel ("your look is ready") and
  // a plain passwordless sign-in from the login page (no look attached).
  const isLogin = !lookName && !safeImg;
  const headerTitle = isLogin ? "Sign in to LuxuryBandit" : "Your look is ready ✨";
  const bodyHeading = isLogin ? "Here's your sign-in link." : `Here's you${lookName ? ` in <strong>${lookName}</strong>` : " in this look"}.`;
  const bodyText = isLogin
    ? "Tap below to sign in to your LuxuryBandit account — view, download or delete your try-ons, and try on more looks. No password needed."
    : "We saved it to your free LuxuryBandit account. Tap below to sign in — you can view, download or delete your try-ons anytime, and try on more looks.";
  const buttonText = isLogin ? "Sign in →" : "Sign in &amp; see my look →";
  const footerNote = isLogin ? "You requested a sign-in link." : "You're receiving this because you created a try-on.";
  const subject = isLogin ? "Sign in to LuxuryBandit" : "Your look is ready ✨ — sign in to see it";

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta name="color-scheme" content="light"/><meta name="supported-color-schemes" content="light"/><title>${headerTitle}</title><style>:root{color-scheme:light;supported-color-schemes:light}</style></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#000;padding:28px 40px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.2em;color:#fff;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#fff;">${headerTitle}</p>
      </td></tr>
      ${safeImg ? `<tr><td style="padding:0;"><img src="${safeImg}" alt="Your try-on" width="520" style="display:block;width:100%;height:auto;"/></td></tr>` : ""}
      <tr><td style="padding:32px 40px;">
        <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111;">${bodyHeading}</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">${bodyText}</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${actionLink}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.05em;padding:14px 36px;border-radius:100px;">
            ${buttonText}
          </a>
        </td></tr></table>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#999;text-align:center;">This link signs you in — don't share it. It expires after a short while; just request a new one if it lapses.</p>
      </td></tr>
      <tr><td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">LuxuryBandit · <a href="https://luxurybandit.com" style="color:#bbb;">luxurybandit.com</a><br/>${footerNote}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const sent = await sendEmail({ to: email, subject, html });
  if (!sent.ok) return NextResponse.json({ error: sent.error ?? "Failed to send." }, { status: 500 });
  return NextResponse.json({ ok: true, sent: true, via: sent.via });
}
