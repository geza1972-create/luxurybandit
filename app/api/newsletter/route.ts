import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { isAdminRequest } from "@/lib/admin-auth";
import { readNewsletterOptOut, addNewsletterOptOut } from "@/lib/try-this-look-store";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120;

const SECRET = process.env.TRY_THIS_LOOK_ADMIN_PIN || process.env.NEWSLETTER_SECRET || "lb-newsletter";
const origin = () => process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://luxurybandit.com";
const sign = (email: string) => crypto.createHmac("sha256", SECRET).update(email.toLowerCase()).digest("hex").slice(0, 16);
const makeToken = (email: string) => Buffer.from(email.toLowerCase()).toString("base64url") + "." + sign(email);
const unsubUrl = (email: string) => `${origin()}/api/newsletter?u=${encodeURIComponent(makeToken(email))}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// GET ?u=<token> — one-click unsubscribe from the newsletter (link is inside every email).
export async function GET(request: Request) {
  const u = new URL(request.url).searchParams.get("u") || "";
  const [b64, sig] = u.split(".");
  let email = "";
  try { email = Buffer.from(b64 || "", "base64url").toString("utf8"); } catch { /**/ }
  const ok = !!(email && sig && sig === sign(email));
  if (ok) { try { await addNewsletterOptOut(email); } catch { /**/ } }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4f0;margin:0;padding:44px 20px;text-align:center;color:#111;">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:34px 28px;">
    <p style="margin:0;font-weight:900;color:#f6cf51;letter-spacing:.2em;text-transform:uppercase;font-size:11px;">LuxuryBandit</p>
    <h1 style="font-size:20px;margin:14px 0 8px;">${ok ? "You're unsubscribed 💛" : "Link not valid"}</h1>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0;">${ok ? `${esc(email)} won't receive the newsletter anymore. You can re-subscribe anytime.` : "This unsubscribe link is invalid or expired."}</p>
  </div>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// POST { emails:[], subject?, message, link? } — admin sends the "New Look" newsletter.
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { emails?: unknown[]; subject?: string; message?: string; link?: string; modelId?: string; modelName?: string };

  const modelId = String(body.modelId ?? "").trim();
  const modelName = String(body.modelName ?? "").trim();
  const subject = String(body.subject ?? "").trim().slice(0, 140) || (modelName ? `A new look from ${modelName} 💛` : "A new look just dropped 💛");
  const message = String(body.message ?? "").trim().slice(0, 4000);
  // A link to the model's profile — use the given one, else default to her profile.
  const link = String(body.link ?? "").trim() || (modelId ? `${origin()}/curator/${encodeURIComponent(modelId)}` : "");
  if (!message) return NextResponse.json({ error: "Nachricht fehlt." }, { status: 400 });

  let emails = Array.isArray(body.emails)
    ? body.emails.map(e => String(e).trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
    : [];
  emails = [...new Set(emails)].slice(0, 1000);
  if (!emails.length) return NextResponse.json({ error: "Keine gültigen Empfänger." }, { status: 400 });

  const optout = new Set(await readNewsletterOptOut());
  const recipients = emails.filter(e => !optout.has(e));

  let sent = 0; const failed: string[] = [];
  for (const to of recipients) {
    const html = newsletterHtml({ message, link, modelName, unsub: unsubUrl(to) });
    try { const r = await sendEmail({ to, subject, html }); if (r?.ok) sent++; else failed.push(to); }
    catch { failed.push(to); }
  }
  return NextResponse.json({ ok: true, sent, skippedOptOut: emails.length - recipients.length, failed });
}

function newsletterHtml({ message, link, modelName, unsub }: { message: string; link: string; modelName: string; unsub: string }) {
  const msg = esc(message).replace(/\n/g, "<br>");
  const who = modelName ? esc(modelName) : "";
  const cta = link
    ? `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
         <a href="${esc(link)}" style="display:inline-block;background:#f6cf51;color:#000;font-weight:900;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:999px;">${who ? `See ${who}'s new look →` : "See the new look →"}</a>
       </td></tr></table>` : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="color-scheme" content="light" /></head>
<body style="margin:0;padding:24px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#000;padding:26px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.2em;color:#f6cf51;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">${who ? `New Look from ${who} 💛` : "New Look 💛"}</p>
      </td></tr>
      <tr><td style="padding:30px 28px;">
        <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#333;">${msg}</p>
        ${cta}
      </td></tr>
      <tr><td style="padding:18px 28px 26px;border-top:1px solid #eee;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#999;text-align:center;">
          You're receiving this because you signed up at LuxuryBandit.<br>
          <a href="${esc(unsub)}" style="color:#999;text-decoration:underline;">Unsubscribe from this newsletter</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
