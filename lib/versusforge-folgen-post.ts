import { sendEmail } from "@/lib/email-send";
import { mailHuelle, mailTitel, mailText, mailFein, mailAdresse } from "@/lib/versusforge-mail-huelle";
import { mailTexteInSprache } from "@/lib/versusforge-mail-texte";
import { PORTAL_URL } from "@/lib/lakatosbandi-adressen";

/**
 * „BESTÄTIGE, DASS DU FOLGEN WILLST" (Owner 13.09.2026).
 *
 * Diese Mail geht an eine Adresse, die jemand in ein Feld getippt hat — möglicherweise nicht die
 * eigene. Deshalb steht hier nichts, was einen Fremden ärgern könnte: kein „Danke fürs Folgen",
 * keine Werke, kein Name in der Betreffzeile ausser dem des Künstlers. Wer das nicht war, ignoriert
 * die Mail, und es passiert nichts.
 *
 * KEIN ABMELDELINK IM FUSS: Es gibt noch nichts, wovon man sich abmelden könnte — der Eintrag
 * entsteht erst mit dem Klick. Der Abmeldelink gehört in die Benachrichtigungen danach.
 */
export async function folgenBestaetigungPerPost(o: {
  an: string;
  /** Sein Künstlername, wie er auf der Seite steht. */
  kuenstler: string;
  mandant: string;
  token: string;
  sprache?: string;
}): Promise<boolean> {
  if (!o.an.includes("@") || !o.token) return false;
  const T = await mailTexteInSprache(o.sprache);
  const link = `${PORTAL_URL}/urmaresti?t=${encodeURIComponent(o.token)}`;

  const res = await sendEmail({
    konto: "versusforge",
    absender: "lakatosbandi.com",
    to: o.an,
    subject: T.folgenBetreff.replace("{name}", o.kuenstler),
    html: mailHuelle(
      mailTitel(T.folgenTitel.replace("{name}", o.kuenstler))
      + mailText(T.folgenText.replace("{name}", o.kuenstler))
      + mailAdresse(T.folgenKnopf, link, T.folgenKnopfFein)
      + mailFein(T.folgenFremd)),
  });
  if (!res.ok) console.error("[folgen-post] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
