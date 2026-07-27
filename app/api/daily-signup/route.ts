import { NextResponse } from "next/server";
import { addDailySignup, readDailySignups } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/email-send";
import { notifyAdminWhatsApp } from "@/lib/notify-admin";

export const runtime = "nodejs";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "");
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// GET (admin) → alle Anmeldungen + Anzahl, für die Auswertung des Tests.
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const signups = await readDailySignups();
  return NextResponse.json({ count: signups.length, signups });
}

// POST (öffentlich) → Eintragung in die Warteliste. Kein Login nötig.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string; firstName?: string; city?: string; lang?: string; source?: string;
    country?: string; whatsapp?: string;
  };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse an." }, { status: 400 });
  }
  const firstName = String(body.firstName ?? "").trim().slice(0, 60);
  const city = String(body.city ?? "").trim().slice(0, 80);
  const country = String(body.country ?? "").trim().toUpperCase().slice(0, 2);
  const whatsapp = String(body.whatsapp ?? "").trim().replace(/[^0-9+\s]/g, "").slice(0, 30);
  const lang = body.lang === "en" ? "en" : body.lang === "ro" ? "ro" : "de";

  let isNew = true;
  try {
    isNew = await addDailySignup({ email, firstName, city, country, whatsapp, lang, source: String(body.source ?? "").slice(0, 200) });
  } catch {
    return NextResponse.json({ error: "Speichern fehlgeschlagen. Bitte nochmal versuchen." }, { status: 502 });
  }

  // Bestätigungsmail + Admin-Alarm nur beim ERSTEN Mal (best effort, blockiert nie die Antwort).
  if (isNew) {
    const t = lang === "en" ? EN : lang === "ro" ? RO : DE;
    void sendEmail({ to: email, subject: t.subject, html: t.html(firstName) }).catch(() => {});
    try {
      const loc = [city, country].filter(Boolean).join(", ");
      notifyAdminWhatsApp(`🌍 Neue Anmeldung „Bella meldet sich": ${firstName || "(ohne Namen)"} · ${email}${whatsapp ? ` · 📱 ${whatsapp}` : ""}${loc ? ` · ${loc}` : ""}`);
    } catch { /* egal */ }
  }

  return NextResponse.json({ ok: true, already: !isNew });
}

// Ehrliche Bestätigung: der Dienst startet ERST — wir versprechen keine Nachricht für morgen früh.
const DE = {
  subject: "Du bist auf Bellas Liste 🌍",
  html: (name: string) => wrap(
    `Hi${name ? ` ${esc(name)}` : ""},`,
    `du stehst jetzt auf der Liste für Bellas tägliche Nachrichten.`,
    `Bella ist gerade dabei, ihre Reise zu planen. Sobald sie loslegt, meldet sie sich morgens bei dir — mit dem Wetter dort, wo sie ist, und dem Wetter bei dir. Abends erzählt sie, was sie erlebt hat.`,
    `Wir melden uns, sobald es losgeht. Du bist unter den Ersten.`,
    "Bis bald,<br/>Bella & das LuxuryBandit-Team",
  ),
};
const EN = {
  subject: "You're on Bella's list 🌍",
  html: (name: string) => wrap(
    `Hi${name ? ` ${esc(name)}` : ""},`,
    `you're on the list for Bella's daily messages.`,
    `Bella is planning her trip right now. Once she sets off, she'll message you every morning — the weather where she is, and the weather where you are. In the evening she'll tell you what she got up to.`,
    `We'll let you know as soon as it starts. You're among the first.`,
    "See you soon,<br/>Bella & the LuxuryBandit team",
  ),
};
const RO = {
  subject: "Ești pe lista Bellei 🌍",
  html: (name: string) => wrap(
    `Salut${name ? ` ${esc(name)}` : ""},`,
    `ești pe lista pentru mesajele zilnice de la Bella.`,
    `Bella tocmai își pregătește călătoria. De îndată ce pornește, îți scrie în fiecare dimineață — vremea de unde e ea și vremea de la tine. Seara îți povestește ce a făcut.`,
    `Te anunțăm imediat ce începe. Ești printre primii.`,
    "Pe curând,<br/>Bella & echipa LuxuryBandit",
  ),
};

function wrap(...paragraphs: string[]) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta name="color-scheme" content="light" /></head>
<body style="margin:0;padding:24px;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#000;padding:26px 28px;text-align:center;">
        <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.2em;color:#f6cf51;text-transform:uppercase;">LuxuryBandit</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;">Bella meldet sich 🌍</p>
      </td></tr>
      <tr><td style="padding:30px 28px;">
        ${paragraphs.map(p => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333;">${p}</p>`).join("")}
      </td></tr>
      <tr><td style="padding:16px 28px 24px;border-top:1px solid #eee;">
        <p style="margin:0;font-size:11px;line-height:1.6;color:#999;text-align:center;">
          Du bekommst diese E-Mail, weil du dich auf <a href="${SITE}" style="color:#999;">luxurybandit.com</a> eingetragen hast.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
