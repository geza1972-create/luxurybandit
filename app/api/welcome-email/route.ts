import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Silently skip if not configured — don't break signup
    return NextResponse.json({ ok: true, skipped: true });
  }

  const body = await request.json() as { email?: string; name?: string };
  const email = String(body.email ?? "").trim();
  const name = String(body.name ?? "").trim();
  if (!email) return NextResponse.json({ error: "email required." }, { status: 400 });

  const greeting = name ? `Hi ${name}` : "Welcome";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to LuxuryBandit</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#000000;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;">LuxuryBandit</p>
              <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#ffffff;">Your account is ready.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111;">${greeting} 👋</p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#555;">
                You're now part of the LuxuryBandit community — a place to discover fashion, try on looks virtually, and connect with sellers and style enthusiasts.
              </p>

              <!-- What you can do -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f8f5;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
                <tr><td>
                  <p style="margin:0 0 12px;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;color:#999;">What you can do</p>
                  <p style="margin:0 0 10px;font-size:13px;color:#333;">✨ <strong>Try on any look</strong> with AI — upload your photo and see it on you instantly</p>
                  <p style="margin:0 0 10px;font-size:13px;color:#333;">🛍️ <strong>Discover stores</strong> — browse sellers and their collections</p>
                  <p style="margin:0 0 10px;font-size:13px;color:#333;">💬 <strong>Message sellers</strong> directly from any profile</p>
                  <p style="margin:0;font-size:13px;color:#333;">🏪 <strong>Open your own store</strong> — anyone can sell on LuxuryBandit</p>
                </td></tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://luxurybandit.com" style="display:inline-block;background:#000;color:#fff;text-decoration:none;font-size:13px;font-weight:900;letter-spacing:0.05em;padding:14px 36px;border-radius:100px;">
                      Go to LuxuryBandit →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">
                LuxuryBandit · <a href="https://luxurybandit.com" style="color:#bbb;">luxurybandit.com</a><br/>
                You're receiving this because you created an account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "LuxuryBandit <support@luxurybandit.com>",
      to: [email],
      subject: "Welcome to LuxuryBandit 🖤",
      html,
    }),
  });

  if (!res.ok) {
    const p = await res.json().catch(() => ({})) as { message?: string };
    return NextResponse.json({ error: p.message ?? "Failed to send." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
