import { NextResponse } from "next/server";
import { readWetterSubscribers, writeWetterSubscribers, getSignedUrl, readKissLog, writeKissLog, type WetterSubscriber } from "@/lib/try-this-look-store";
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
    email?: string; name?: string; imagePath?: string; device?: string; lang?: string; genId?: string;
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

  /**
   * DIE ADRESSE AN DEN LOG-EINTRAG HÄNGEN (Owner 30.07.2026: „seine Galerie ist leer").
   *
   * Ohne das hängt das erzeugte Bild nur an einer Gerätekennung. Wechselt er das Gerät oder
   * meldet sich an, findet seine Galerie nichts — obwohl das Bild da ist. Mit der Adresse am
   * Eintrag kann sie es zuordnen.
   */
  try {
    const genId = String(body.genId ?? "").trim();
    if (genId) {
      const eintraege = await readKissLog();
      const e = eintraege.find(x => x.id === genId);
      if (e && e.email !== email) { e.email = email; await writeKissLog(eintraege); }
    }
  } catch { /* der Besucher hat sein Bild schon — das darf nie blockieren */ }

  // 2 · Das Bild per Mail schicken, mit dem Hinweis aufs Passwort.
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://luxurybandit.com";
  let bildUrl = "";
  if (imagePath.startsWith("try-this-look/")) bildUrl = await getSignedUrl(imagePath, 60 * 60 * 24 * 30).catch(() => "");

  /**
   * DER KNOPF FÜHRT IN SEINE GALERIE (Owner 30.07.2026: „hier muss stehen Watch my Gallery
   * und dann springt er dorthin").
   *
   * BEWUSST OHNE die Adresse in der Zeile: eine E-Mail-Adresse in einer URL landet im
   * Verlauf, in Weiterleitungen und in fremden Protokollen. Auf demselben Gerät findet die
   * Galerie seine Bilder ohnehin über die Gerätekennung; von einem anderen Gerät meldet er
   * sich dort an.
   */
  const galerie = `${origin}/my-gallery`;
  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 6px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#fff;font-size:20px;font-weight:bold">Your picture is ready</td></tr>`
    + (bildUrl ? `<tr><td style="padding:0 22px 14px"><img src="${bildUrl}" width="476" style="width:100%;border-radius:12px;display:block" alt=""></td></tr>` : "")
    + `<tr><td style="padding:0 22px 14px;color:#e8e2d6;font-size:14px;line-height:1.55">`
    + `It is saved in your gallery — together with everything you make next.`
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 8px"><a href="${galerie}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Watch my gallery</a></td></tr>`
    + `<tr><td style="padding:0 22px 20px;color:#8d8579;font-size:12px;line-height:1.5">`
    + `Want to see the two of you move? Turn it into a hot video right there.`
    + `</td></tr>`
    + `</table></td></tr></table></div>`;

  const mail = await sendEmail({
    to: email,
    subject: "Your picture is ready ✨",
    html,
    listUnsubscribe: `${origin}/api/wetter-unsubscribe?model=${KISS_LIST}&s=`,
  }).catch(() => ({ ok: false }));

  return NextResponse.json({ ok: true, neu, mail: !!(mail as { ok?: boolean }).ok });
}
