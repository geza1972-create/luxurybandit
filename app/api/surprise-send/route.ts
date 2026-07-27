import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readSurpriseLog, writeSurpriseLog, type SurpriseEntry } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * „Surprise him" — Versand des privaten Videos.
 *
 * Sicherheitsentscheidungen, die hier fest verdrahtet sind (nicht wegoptimieren):
 * - Die E-Mail enthält NUR einen Link, KEIN Vorschaubild und KEIN Video. Landet sie im
 *   falschen Postfach oder poppt als Benachrichtigung auf, ist nichts zu sehen.
 * - Der Link läuft nach 7 Tagen ab und ist ein zufälliges Token, das nirgends verlinkt ist.
 * - Jede Mail trägt einen Melde-Link. Ein gemeldeter Link ist sofort tot.
 * - Der Wortlaut der Einwilligung wird mitgespeichert (Nachweis, wer was bestätigt hat).
 * - Pro Empfänger-Adresse max. 3 Sendungen pro Tag — verhindert, dass jemand die Funktion
 *   als Belästigungswerkzeug benutzt.
 */

const DAYS = 7;
const MAX_PER_RECIPIENT_PER_DAY = 3;

function siteOrigin(request: Request) {
  return request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
}

/** Aus einer signierten Supabase-URL den reinen Storage-Pfad ziehen (zum Neusignieren). */
function pathFromSignedUrl(url: string): string | undefined {
  const m = url.match(/\/object\/sign\/[^/]+\/(.+?)\?/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Nutzertext NIE roh in HTML — sonst kann jemand über die „Nachricht" Markup einschleusen. */
function esc(v: string) {
  return v.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function mail(link: string, reportUrl: string, fromName?: string, message?: string) {
  const who = fromName ? esc(fromName) : "Someone who knows you";
  return `<!doctype html><html><body style="margin:0;background:#0d0b0a;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">A private message is waiting for you.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0b0a;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141110;border-radius:20px;overflow:hidden">
        <tr><td style="padding:24px 24px 0;font-size:11px;font-weight:bold;letter-spacing:3px;color:#f6cf51">LUXURYBANDIT</td></tr>
        <tr><td style="padding:12px 24px 0;font-size:24px;line-height:1.2;font-weight:800;color:#ffffff">${who} sent you something private.</td></tr>
        ${message ? `<tr><td style="padding:14px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-left:3px solid #f6cf51;padding:2px 0 2px 12px;font-size:16px;line-height:1.5;font-weight:600;color:#ffffff">${esc(message)}</td></tr></table></td></tr>` : ""}
        <tr><td style="padding:12px 24px 0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.75)">
          It is meant for your eyes only. Open it somewhere you are alone — the link works for ${DAYS} days, then it disappears.
        </td></tr>
        <tr><td align="center" style="padding:22px 24px 0">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" bgcolor="#f6cf51" style="border-radius:999px">
              <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:#1a1204;text-decoration:none">Open it privately →</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:22px 24px 26px;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.45)">
          Didn't expect this, or don't want it? <a href="${reportUrl}" style="color:#f6cf51">Report it and delete the link</a> — the video becomes unreachable immediately.
          Sent via LuxuryBandit. The sender confirmed the video shows themselves and that they are 18 or older.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const entries = await readSurpriseLog();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    videoUrl?: string; to?: string; fromName?: string; message?: string; consentText?: string; revoke?: string;
  };

  // Melden / zurückziehen — bewusst OHNE Anmeldung: wer den Link hat, muss ihn abschalten
  // können. Ein Token ist ohnehin nur dem Empfänger und der Absenderin bekannt.
  if (body.revoke) {
    const entries = await readSurpriseLog();
    const e = entries.find(x => x.id === body.revoke);
    if (e) { e.revoked = true; await writeSurpriseLog(entries); }
    return NextResponse.json({ ok: true });
  }

  const to = String(body.to ?? "").trim().toLowerCase();
  const videoUrl = String(body.videoUrl ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!videoUrl) return NextResponse.json({ error: "No video to send." }, { status: 400 });
  if (!String(body.consentText ?? "").trim()) return NextResponse.json({ error: "Consent is required." }, { status: 400 });

  const entries = await readSurpriseLog();
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = entries.filter(e => e.toEmail === to && Date.parse(e.createdAt) > since).length;
  if (recent >= MAX_PER_RECIPIENT_PER_DAY) {
    return NextResponse.json({ error: "That address already received several videos today. Please try again tomorrow." }, { status: 429 });
  }

  const entry: SurpriseEntry = {
    id: crypto.randomUUID().replace(/-/g, ""),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + DAYS * 24 * 60 * 60 * 1000).toISOString(),
    toEmail: to,
    fromName: String(body.fromName ?? "").trim().slice(0, 40) || undefined,
    message: String(body.message ?? "").trim().slice(0, 140) || undefined,
    videoPath: pathFromSignedUrl(videoUrl),
    videoUrl,
    consentText: String(body.consentText).slice(0, 400),
    opened: 0,
  };

  const origin = siteOrigin(request);
  const link = `${origin}/s/${entry.id}`;
  const reportUrl = `${origin}/s/${entry.id}?report=1`;
  const sent = await sendEmail({
    to,
    subject: "Something private is waiting for you",
    html: mail(link, reportUrl, entry.fromName, entry.message),
  });
  if (!sent.ok) return NextResponse.json({ error: sent.error || "Email could not be sent." }, { status: 502 });

  await writeSurpriseLog([entry, ...entries]);
  return NextResponse.json({ ok: true, link });
}
