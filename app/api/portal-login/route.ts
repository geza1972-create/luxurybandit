import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email-send";
import { kuenstlerListe, kuenstlerDashboardUrl, PORTAL_URL } from "@/lib/lakatosbandi";
import { mailHuelle, mailTitel, mailText, mailKasten, mailFein } from "@/lib/versusforge-mail-huelle";
import { portalSprache } from "@/lib/lakatosbandi-texte";

/**
 * DER ANMELDE-LINK FÜR KÜNSTLER (Owner 10.09.2026: „einen Login müssen sie auch haben fürs
 * Dashboard").
 *
 * E-Mail rein → wir suchen den Künstler mit dieser Adresse → Mail mit dem Link zu seinem
 * Dashboard. Kein Passwort, keine Sitzung, die wir zusätzlich pflegen müssten: Der Schlüssel im
 * Link ist derselbe wie in der Anmelde-Mail.
 *
 * DIE ANTWORT VERRÄT NICHTS: immer `{ ok: true }`, ob es ein Konto gibt oder nicht. Sonst prüft
 * jeder mit diesem Feld, welche Adressen bei uns Künstler sind.
 *
 * EINE BREMSE JE ADRESSE: höchstens eine Mail pro Minute — sonst schickt ein Skript einem
 * Künstler hundert Mails. Im Speicher der Instanz; über mehrere Instanzen hinweg nicht dicht,
 * für den Zweck (kein Postfach fluten) reicht es.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const zuletzt = new Map<string, number>();

const MAIL = {
  en: { betreff: "Your link to your dashboard", titel: "Your dashboard on lakatosbandi.com", text: "Tap the button to open your dashboard — no password needed. Keep this link to yourself: whoever has it can open your dashboard.", knopf: "Open my dashboard", fein: "You received this because someone asked for a login link for this address. If that wasn't you, ignore this email." },
  ro: { betreff: "Linkul către dashboard-ul tău", titel: "Dashboard-ul tău pe lakatosbandi.com", text: "Apasă butonul ca să deschizi dashboard-ul — fără parolă. Păstrează linkul pentru tine: oricine îl are îți poate deschide dashboard-ul.", knopf: "Deschide dashboard-ul", fein: "Ai primit acest e-mail pentru că s-a cerut un link de autentificare pentru această adresă. Dacă nu ai fost tu, ignoră-l." },
  de: { betreff: "Dein Link zu deinem Dashboard", titel: "Dein Dashboard auf lakatosbandi.com", text: "Tippe auf den Knopf und dein Dashboard öffnet sich — ohne Passwort. Behalte den Link für dich: Wer ihn hat, kann dein Dashboard öffnen.", knopf: "Dashboard öffnen", fein: "Du bekommst diese Mail, weil für diese Adresse ein Login-Link angefordert wurde. Warst du das nicht, ignoriere sie einfach." },
} as const;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { mail?: string; lang?: string };
  const mail = String(body.mail ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const jetzt = Date.now();
  if (jetzt - (zuletzt.get(mail) ?? 0) < 60_000) return NextResponse.json({ ok: true });
  zuletzt.set(mail, jetzt);

  try {
    const treffer = await kuenstlerListe(m => String(m.mail ?? "").trim().toLowerCase() === mail && m.freigabe !== "abgelehnt");
    for (const m of treffer) {
      const L = portalSprache(body.lang, m.sprache ?? "en");
      const T = MAIL[L as keyof typeof MAIL] ?? MAIL.en;
      const link = kuenstlerDashboardUrl(m.kennung, m.schluessel);
      const inhalt = mailTitel(T.titel) + mailText(T.text)
        + mailKasten(m.name, `${PORTAL_URL.replace("https://", "")}/${m.kennung}`, { adresse: link, wort: T.knopf })
        + mailFein(T.fein);
      const res = await sendEmail({ konto: "versusforge", to: mail, subject: `${T.betreff} · ${m.name}`, html: mailHuelle(inhalt) });
      if (!res.ok) console.error("[portal-login] Versand fehlgeschlagen:", res.error);
    }
  } catch (e) {
    console.error("[portal-login] Suche fehlgeschlagen", e);
  }
  return NextResponse.json({ ok: true });
}
