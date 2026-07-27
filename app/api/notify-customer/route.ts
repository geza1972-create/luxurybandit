import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { isAdminRequest } from "@/lib/admin-auth";
import { readTryThisLookState, saveTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";

// Admin → tell a customer their new feed is online, with a link to their dashboard (/my-journey,
// which prompts login, then shows their personal card). Body: { email, name?, message? }.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { email?: string; name?: string; message?: string };
  const email = String(body.email ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Ungültige E-Mail." }, { status: 400 });

  // Prefer the stored booking name if none was passed.
  let name = String(body.name ?? "").trim();
  if (!name) {
    try { const st = await readTryThisLookState(); name = (st.tripBookings ?? []).find(b => b.email.toLowerCase() === email.toLowerCase())?.name || ""; } catch { /**/ }
  }
  const greeting = name ? `Hi ${name}` : "Hi";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://luxurybandit.com";
  const link = `${origin}/my-journey`;
  const custom = String(body.message ?? "").trim().slice(0, 500);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="color-scheme" content="light" /></head>
<body style="margin:0;padding:24px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#000;padding:26px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.2em;color:#f6cf51;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">Your new feed is online 🌴</p>
      </td></tr>
      <tr><td style="padding:30px 28px;">
        <p style="margin:0 0 14px;font-size:16px;font-weight:700;">${greeting},</p>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#555;">${custom || "your new videos are here. Check them out in your dashboard."}</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${link}" style="display:inline-block;background:#f6cf51;color:#000;font-weight:900;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:999px;">Click here → your feed</a>
        </td></tr></table>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#999;">After logging in you'll see your personal card with your videos.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const subject = "Your new feed is online 🌴";
  const res = await sendEmail({ to: email, subject, html });
  if (!res?.ok) return NextResponse.json({ error: res?.error || "E-Mail fehlgeschlagen." }, { status: 502 });

  // Log the send so the Card Studio can show the email history per customer.
  try {
    const st = await readTryThisLookState();
    st.emailLog = [...(st.emailLog ?? []), { id: crypto.randomUUID(), email: email.toLowerCase(), subject, sentAt: new Date().toISOString() }];
    await saveTryThisLookState(st);
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true });
}
