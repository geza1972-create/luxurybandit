import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers, getSignedUrl, type WetterSubscriber } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";
import { dialInfo } from "@/lib/dial-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE E-MAIL GEGEN DAS BILD (Owner 30.07.2026).
 *
 * „Der muss sich kostenlos anmelden um gratis zu probieren mit email, dann hat er ein Konto …
 * er kann es sofort sehen, aber er kann nur ein Bild generieren."
 *
 * WARUM ERST NACH DEM RENDERN GEFRAGT WIRD: Wer zwei Minuten gewartet und ein fertiges Bild
 * vor sich hat, trägt seine Adresse ein. Wer sie VORHER eingeben soll, springt ab — das ist
 * derselbe Grund, aus dem der Trichter bisher 9 Durchläufe und 0 Zahlungen hatte.
 *
 * Die Adresse landet in der KISSING-Liste, nicht bei den Wetter-Abonnenten (Owner-Dauerregel:
 * „Die Wetter Leads sind die Wetter Leads"). Doppelte Adressen werden nicht neu angelegt.
 */

const KISS_LIST = "kiss";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string; name?: string; imagePath?: string; device?: string; lang?: string;
  };
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse." }, { status: 400 });
  }
  const imagePath = String(body.imagePath ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  const lang = String(body.lang ?? "en").slice(0, 5);

  // 1 · In die Kissing-Liste eintragen (idempotent).
  let neu = false;
  try {
    const liste = await readWetterSubscribers(KISS_LIST);
    const da = liste.find(s => (s.email ?? "").trim().toLowerCase() === email);
    if (!da) {
      neu = true;
      const eintrag: WetterSubscriber = {
        id: `sub-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        name: String(body.name ?? "").trim().slice(0, 120) || email.split("@")[0],
        email,
        lang: dialInfo("")?.lang || lang,
        note: `Kiss · Gratis-Bild${device ? ` · ${device}` : ""}`,
        createdAt: new Date().toISOString(),
      };
      await writeWetterSubscribers([eintrag, ...liste], KISS_LIST);
    }
  } catch { /* die Liste darf den Ablauf nie blockieren — er hat sein Bild schon */ }

  // 2 · Das Bild per Mail schicken, mit dem Hinweis aufs Passwort.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://luxurybandit.com";
  let bildUrl = "";
  if (imagePath.startsWith("try-this-look/")) bildUrl = await getSignedUrl(imagePath, 60 * 60 * 24 * 30).catch(() => "");

  const konto = `${origin}/account?email=${encodeURIComponent(email)}&setpw=1`;
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">Your picture is ready</td></tr>`
    + (bildUrl ? `<tr><td style="padding:0 22px 14px"><img src="${bildUrl}" width="476" style="width:100%;border-radius:12px;display:block" alt=""></td></tr>` : "")
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + `Set a password and it stays in your gallery — together with everything you make next.`
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 20px"><a href="${konto}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Set my password</a></td></tr>`
    + `</table></td></tr></table></div>`;

  const mail = await sendEmail({
    to: email,
    subject: "Your picture is ready ✨",
    html,
    listUnsubscribe: `${origin}/api/wetter-unsubscribe?model=${KISS_LIST}&s=`,
  }).catch(() => ({ ok: false }));

  return NextResponse.json({ ok: true, neu, mail: !!(mail as { ok?: boolean }).ok });
}
