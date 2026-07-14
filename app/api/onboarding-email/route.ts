import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { createAuthUser } from "@/lib/supabase-admin-users";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { adminPinMatches } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mint a set-password / login link via the Supabase Admin API (works even though Supabase's
// own mailer is broken on this project). Returns "" if the email has no auth account yet.
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

// POST /api/onboarding-email  { email }  (admin only)
// Sends the "your AI influencer is ready — set your password & open your dashboard" onboarding
// email to a creator who just signed up. The button logs them in (set-password link) and lands
// them on their own dashboard (their influencer profile). Requires a curator record for the email.
export async function POST(request: Request) {
  if (!adminPinMatches(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { email?: string; curatorId?: string };
  const curatorId = String(body.curatorId ?? "").trim();
  let email = String(body.email ?? "").trim().toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/^["']|["']$/g, "").replace(/\/$/, "") ?? "";
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const hasMailer = !!((process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false, error: "Supabase admin not configured." }, { status: 503 });

  // Find her curator (her influencer) by id or email → gives us the name, email + auth account.
  const state = await readTryThisLookState();
  const cur = (state.curators ?? []).find(c =>
    (curatorId && c.id === curatorId) || (email && (c.email ?? "").trim().toLowerCase() === email)
  ) as { email?: string; firstName?: string; lastName?: string; modelName?: string } | undefined;
  if (!cur) return NextResponse.json({ error: "No influencer found." }, { status: 404 });
  email = (cur.email ?? email).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "This influencer has no email on file." }, { status: 400 });

  const personName = (cur.firstName || "").trim();
  const influencer = (cur.modelName || [cur.firstName, cur.lastName].filter(Boolean).join(" ") || "your influencer").trim();

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://luxurybandit.com";
  const redirectTo = `${origin.replace(/\/$/, "")}/auth/reset-password`;

  // Mint the login/set-password link; auto-provision the auth account if she never made one.
  let link = await mintLoginLink(supabaseUrl, serviceKey, email, redirectTo);
  if (!link) {
    await createAuthUser(email, [cur.firstName, cur.lastName].filter(Boolean).join(" ")).catch(() => false);
    link = await mintLoginLink(supabaseUrl, serviceKey, email, redirectTo);
  }
  if (!link) return NextResponse.json({ ok: false, error: "Could not mint the login link." }, { status: 502 });
  if (!hasMailer) return NextResponse.json({ ok: false, error: "Mailer not configured (runs on production).", link }, { status: 503 });

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
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
          Your AI influencer <strong>${influencer}</strong> is set up and ready to grow. We&apos;ve prepared everything so you can start right away — just open your dashboard.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${link}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.05em;padding:14px 36px;border-radius:100px;">
            Set your password &amp; open your dashboard &rarr;
          </a>
        </td></tr></table>
        <p style="margin:18px 0 26px;font-size:12px;line-height:1.6;color:#999;text-align:center;">The button logs you in and takes you straight to your dashboard, where you&apos;ll see ${influencer}. You&apos;ll set (and can always change) your password on the way in.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:12px;padding:20px 24px;">
          <tr><td>
            <p style="margin:0 0 12px;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#999;">What happens next</p>
            <p style="margin:0 0 10px;font-size:13px;color:#333;">💎 <strong>We create her content</strong> — fresh luxury photos &amp; videos, every day.</p>
            <p style="margin:0 0 10px;font-size:13px;color:#333;">💬 <strong>Chat with her yourself</strong> — and her fans chat with her too.</p>
            <p style="margin:0 0 10px;font-size:13px;color:#333;">🎬 <strong>Earn 30% in credits</strong> whenever anyone does a try-on with her.</p>
            <p style="margin:0;font-size:13px;color:#333;">📈 <strong>You grow the audience</strong> — we handle the rest.</p>
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
  if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error ?? "Failed to send." }, { status: 500 });
  return NextResponse.json({ ok: true, sent: true, via: sent.via, influencer });
}
