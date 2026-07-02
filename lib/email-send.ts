import nodemailer from "nodemailer";

// One place to send transactional email. Prefers the user's own mailbox via SMTP
// (e.g. Hostinger's support@luxurybandit.com) so we don't depend on a verified
// Resend domain; falls back to Resend if SMTP isn't configured; no-ops if neither
// is set so callers never break.
//
// Env (set in Vercel — the password is a secret the operator enters, never in code):
//   SMTP_HOST   e.g. smtp.hostinger.com
//   SMTP_PORT   465 (SSL) or 587 (STARTTLS)   — default 465
//   SMTP_USER   the full mailbox address, e.g. support@luxurybandit.com
//   SMTP_PASS   the mailbox password
//   SMTP_FROM   optional display From, default "LuxuryBandit <SMTP_USER>"
//   RESEND_API_KEY  optional fallback sender

export type SendResult = { ok: boolean; via?: "smtp" | "resend"; skipped?: string; error?: string };

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }): Promise<SendResult> {
  const to = (opts.to ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: "invalid recipient" };
  const replyTo = (opts.replyTo ?? "").trim() || undefined;

  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || "465");
  const from = process.env.SMTP_FROM?.trim() || (user ? `LuxuryBandit <${user}>` : "");

  // 1) SMTP (the operator's own mailbox) — preferred.
  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
        auth: { user, pass },
      });
      await transporter.sendMail({ from, to, subject: opts.subject, html: opts.html, replyTo });
      return { ok: true, via: "smtp" };
    } catch (e) {
      return { ok: false, via: "smtp", error: e instanceof Error ? e.message : "smtp send failed" };
    }
  }

  // 2) Resend fallback.
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from || "LuxuryBandit <support@luxurybandit.com>",
          to: [to],
          subject: opts.subject,
          html: opts.html,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => ({}))) as { message?: string };
        return { ok: false, via: "resend", error: p.message ?? "resend send failed" };
      }
      return { ok: true, via: "resend" };
    } catch (e) {
      return { ok: false, via: "resend", error: e instanceof Error ? e.message : "resend send failed" };
    }
  }

  // Nothing configured — DON'T pretend it sent. Callers that must not break on a
  // missing mailer can check `skipped`; the contact form treats this as a failure.
  console.warn("[email-send] No mailer configured (set SMTP_HOST/SMTP_USER/SMTP_PASS on Vercel) — email NOT sent:", opts.subject);
  return { ok: false, skipped: "no-mailer", error: "no mailer configured" };
}
