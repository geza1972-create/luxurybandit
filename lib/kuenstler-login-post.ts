import { sendEmail } from "@/lib/email-send";
import { kuenstlerListe, kuenstlerDashboardUrl, PORTAL_URL } from "@/lib/lakatosbandi";
import { mailHuelle, mailTitel, mailText, mailKasten, mailFein } from "@/lib/versusforge-mail-huelle";
import { portalSprache } from "@/lib/lakatosbandi-texte";

/**
 * DEN DASHBOARD-LINK SCHICKEN — derselbe Inhalt wie `api/portal-login`, aber als Funktion
 * (Owner 14.09.2026: „diese Adresse existiert schon, du hast schon eine Webseite. Benutze deine
 * Webseite, um weitere Bilder hochzuladen").
 *
 * ── WARUM ALS EIGENE DATEI ──────────────────────────────────────────────────────────────────
 *
 * Der Trichter weist eine bekannte Adresse jetzt ab. Ihn nur abzuweisen wäre grob: Wer seinen
 * Link verlegt hat, stünde vor einer Tür ohne Klinke. Also bekommt er dieselbe Mail wie beim
 * Login — und zwar ohne dass `portal-vorschau` die Route aufruft, denn eine Route ruft keine
 * andere Route auf.
 *
 * SIE VERRÄT NICHTS: Gibt es die Adresse nicht, passiert schlicht nichts. Wer fremde Adressen
 * durchprobiert, erfährt dadurch nicht, welche bei uns Künstler sind.
 */

const MAIL = {
  en: { betreff: "Your link to your dashboard", titel: "Your dashboard on lakatosbandi.com", text: "You already have a page with us. Open your dashboard to add more works — no password needed. Keep this link to yourself.", knopf: "Open my dashboard", fein: "You received this because someone entered this address on lakatosbandi.com. If that wasn't you, ignore this email." },
  ro: { betreff: "Linkul către dashboard-ul tău", titel: "Dashboard-ul tău pe lakatosbandi.com", text: "Ai deja o pagină la noi. Deschide dashboard-ul ca să adaugi alte lucrări — fără parolă. Păstrează linkul pentru tine.", knopf: "Deschide dashboard-ul", fein: "Ai primit acest e-mail pentru că această adresă a fost introdusă pe lakatosbandi.com. Dacă nu ai fost tu, ignoră-l." },
  de: { betreff: "Dein Link zu deinem Dashboard", titel: "Dein Dashboard auf lakatosbandi.com", text: "Du hast schon eine Seite bei uns. Öffne dein Dashboard, um weitere Werke hochzuladen — ohne Passwort. Behalte den Link für dich.", knopf: "Dashboard öffnen", fein: "Du bekommst diese Mail, weil diese Adresse auf lakatosbandi.com eingegeben wurde. Warst du das nicht, ignoriere sie einfach." },
} as const;

export async function loginLinkSchicken(mailRoh: string, sprache?: string): Promise<boolean> {
  const mail = String(mailRoh ?? "").trim().toLowerCase().slice(0, 200);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return false;

  const treffer = await kuenstlerListe(
    m => String(m.mail ?? "").trim().toLowerCase() === mail && m.freigabe !== "abgelehnt",
  ).catch(() => []);
  if (!treffer.length) return false;

  let einer = false;
  for (const m of treffer) {
    const L = portalSprache(sprache, m.sprache ?? "en");
    const T = MAIL[L as keyof typeof MAIL] ?? MAIL.en;
    const inhalt = mailTitel(T.titel) + mailText(T.text)
      + mailKasten(m.name, `${PORTAL_URL.replace("https://", "")}/${m.kennung}`, {
        adresse: kuenstlerDashboardUrl(m.kennung, m.schluessel), wort: T.knopf,
      })
      + mailFein(T.fein);
    const res = await sendEmail({
      konto: "versusforge", to: mail,
      subject: `${T.betreff} · ${m.name}`, html: mailHuelle(inhalt),
    });
    if (res.ok) einer = true;
    else console.error("[kuenstler-login-post] Versand fehlgeschlagen:", res.error);
  }
  return einer;
}
