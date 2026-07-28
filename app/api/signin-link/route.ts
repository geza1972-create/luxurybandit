import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ANMELDE-LINK ÜBER UNSER EIGENES POSTFACH.
 *
 * Warum nicht über Supabase: Supabase verschickt Auth-Mails über seinen eigenen Versand.
 * Der ist ohne eigenen SMTP auf wenige Mails pro Stunde gedeckelt und antwortete am
 * 28.07.2026 nur noch mit „Error sending magic link email" (500) — der Kunde stand vor
 * einer toten Anmeldung, obwohl sein Konto existiert.
 *
 * Jetzt: Wir lassen Supabase den Link nur ERZEUGEN (Admin-API, verschickt nichts) und
 * schicken ihn selbst über dasselbe Postfach wie die Tagespost (Hostinger-SMTP). Damit
 * hängt die Anmeldung an einem Kanal, der nachweislich zustellt.
 *
 * Antwort ist IMMER ok: Sonst ließe sich hier abfragen, welche Adressen ein Konto haben.
 */

const LINK_TYPES = ["magiclink", "signup"] as const;

function mail(link: string, lang: string) {
  const T: Record<string, { sub: string; h: string; p: string; cta: string; foot: string }> = {
    en: { sub: "Your sign-in link", h: "Sign in to LuxuryBandit", p: "Tap the button and you are in — no password needed. The link works for one hour.", cta: "Sign me in →", foot: "You received this because someone asked for a sign-in link for this address. If that wasn't you, ignore this email." },
    de: { sub: "Dein Anmelde-Link", h: "Bei LuxuryBandit anmelden", p: "Tippe auf den Knopf und du bist drin — ohne Passwort. Der Link gilt eine Stunde.", cta: "Jetzt anmelden →", foot: "Du bekommst diese Mail, weil für diese Adresse ein Anmelde-Link angefordert wurde. Warst du das nicht, ignoriere sie einfach." },
    ro: { sub: "Linkul tău de conectare", h: "Conectează-te la LuxuryBandit", p: "Apasă butonul și ești înăuntru — fără parolă. Linkul este valabil o oră.", cta: "Conectează-mă →", foot: "Ai primit acest e-mail pentru că s-a cerut un link de conectare pentru această adresă." },
  };
  const t = T[lang] ?? T.en;
  return {
    subject: t.sub,
    html: `<!doctype html><html><body style="margin:0;background:#0d0b0a;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0b0a;padding:32px 16px"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#141110;border-radius:20px;overflow:hidden">
        <tr><td style="padding:24px 24px 0;font-size:11px;font-weight:bold;letter-spacing:3px;color:#f6cf51">LUXURYBANDIT</td></tr>
        <tr><td style="padding:12px 24px 0;font-size:24px;line-height:1.2;font-weight:800;color:#ffffff">${t.h}</td></tr>
        <tr><td style="padding:12px 24px 0;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.75)">${t.p}</td></tr>
        <tr><td align="center" style="padding:22px 24px 0">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#f6cf51" style="border-radius:999px">
            <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:800;color:#1a1204;text-decoration:none">${t.cta}</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 24px 26px;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.45)">${t.foot}</td></tr>
      </table>
    </td></tr></table></body></html>`,
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string; lang?: string; returnTo?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const lang = String(body.lang ?? "en").slice(0, 2);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return NextResponse.json({ ok: true });

  const origin = request.headers.get("origin")?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://luxurybandit.com";
  const redirectTo = `${origin}/auth/confirm${String(body.returnTo ?? "").startsWith("/") ? `?returnTo=${encodeURIComponent(String(body.returnTo))}` : ""}`;

  // Erst „magiclink" (bestehendes Konto), sonst „signup" (neues Konto) — der Kunde soll
  // nie an der Frage scheitern, ob er schon registriert ist.
  for (const type of LINK_TYPES) {
    try {
      const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type, email, options: { redirect_to: redirectTo } }),
      });
      const data = await res.json().catch(() => null);
      const link = data?.action_link || data?.properties?.action_link || "";
      if (!res.ok || !link) continue;

      const m = mail(String(link), lang);
      const sent = await sendEmail({ to: email, subject: m.subject, html: m.html });
      if (!sent.ok) console.warn("[signin-link] Versand fehlgeschlagen:", sent.error);
      return NextResponse.json({ ok: true, sent: sent.ok });
    } catch (e) {
      console.warn(`[signin-link] ${type} fehlgeschlagen`, e);
    }
  }
  return NextResponse.json({ ok: true });
}
