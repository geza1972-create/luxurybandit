import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readTryThisLookState } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { curatorId } — a member just subscribed to THIS model; email them a welcome
// ("You subscribed to <model> — here's her private content"). Recipient = the signed-in user.
export async function POST(request: Request) {
  const user = await getSellerFromRequest(request).catch(() => null);
  const email = user?.email?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { curatorId?: string; amountCents?: number };
  const curatorId = String(body.curatorId ?? "").trim();
  if (!curatorId) return NextResponse.json({ error: "curatorId required" }, { status: 400 });
  const amountCents = Math.max(0, Math.round(Number(body.amountCents) || 0));

  const state = await readTryThisLookState();
  const cur = (state.curators ?? []).find(c => c.id === curatorId) as { firstName?: string; lastName?: string } | undefined;
  const modelName = cur ? ([cur.firstName, cur.lastName].filter(Boolean).join(" ").trim() || cur.firstName || "your model") : "your model";

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://luxurybandit.com";
  const link = `${origin}/curator/${encodeURIComponent(curatorId)}`;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const amount = amountCents ? `$${(amountCents / 100).toFixed(2)}` : "—";
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const receiptRow = (k: string, v: string) => `<tr><td style="padding:6px 0;font-size:13px;color:#777;">${k}</td><td style="padding:6px 0;font-size:13px;font-weight:800;color:#111;text-align:right;">${v}</td></tr>`;

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="color-scheme" content="light" /></head>
<body style="margin:0;padding:24px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#000;padding:26px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.2em;color:#f6cf51;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">Payment confirmed 💛</p>
      </td></tr>
      <tr><td style="padding:30px 28px;">
        <p style="margin:0 0 14px;font-size:16px;font-weight:700;">You're subscribed to ${esc(modelName)} 🎉</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#555;">Your subscription is active. You can now see all <b>${esc(modelName)}</b>'s private photos &amp; videos and chat with her unlimited — just her (each model is her own subscription).</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;border-radius:12px;padding:6px 16px;margin:0 0 22px;">
          <tr><td colspan="2" style="padding:12px 0 4px;font-size:10px;font-weight:900;letter-spacing:.14em;color:#999;text-transform:uppercase;">Receipt</td></tr>
          ${receiptRow("Subscription", `${esc(modelName)} — monthly`)}
          ${receiptRow("Amount", `${amount}/mo`)}
          ${receiptRow("Date", dateStr)}
          ${receiptRow("Billed to", esc(email))}
        </table>

        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${link}" style="display:inline-block;background:#f6cf51;color:#000;font-weight:900;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:999px;">Open ${esc(modelName)}'s profile →</a>
        </td></tr></table>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#999;">Renews monthly. Manage or cancel your subscriptions anytime in your account. Want another model? Subscribe to her separately.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const r = await sendEmail({ to: email, subject: `Payment confirmed — your ${modelName} subscription`, html }).catch(() => ({ ok: false }));
  return NextResponse.json({ ok: !!r?.ok });
}
