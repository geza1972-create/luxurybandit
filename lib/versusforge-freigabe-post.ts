import { sendEmail } from "@/lib/email-send";
import { mailHuelle, mailTitel, mailText, mailAdresse } from "@/lib/versusforge-mail-huelle";
import { mailTexteInSprache } from "@/lib/versusforge-mail-texte";
import { kuenstlerUrl } from "@/lib/lakatosbandi-adressen";

/**
 * DIE MAIL NACH DER ENTSCHEIDUNG DES OWNERS (Owner 11.09.2026: „Bekommt der Künstler eine E-Mail, wenn freigegeben?"
 * · „ja, alles bauen"). Vorher erfuhr er es nur, wenn er selbst auf seine Seite schaute.
 *
 *  · FREIGEGEBEN — seine Seite ist online: der Link zu ihr und „Seite bearbeiten".
 *  · ABGELEHNT   — kurz und freundlich, ohne Begründung, kein Urteil über seine Kunst; dazu der Löschlink.
 *
 * In seiner Sprache (`mailTexteInSprache`), aus dem VersusForge-Postfach wie die Künstler-Mail.
 */
type Entscheidung = {
  mandant: string;
  /** Der Dashboard-Schlüssel — für „Seite bearbeiten". */
  schluessel: string;
  loeschSchluessel?: string;
  sprache?: string;
  aktion: "frei" | "abgelehnt";
};

export async function freigabeMailBauen(o: Entscheidung): Promise<{ betreff: string; html: string; loeschen: string }> {
  const T = await mailTexteInSprache(o.sprache);
  const loeschen = o.loeschSchluessel
    ? `${kuenstlerUrl(o.mandant)}/loeschen?k=${encodeURIComponent(o.loeschSchluessel)}`
    : "";

  if (o.aktion === "frei") {
    return {
      betreff: T.freigabeBetreff,
      loeschen,
      html: mailHuelle(
        mailTitel(T.freigabeTitel)
        + mailText(T.freigabeText)
        + mailAdresse(T.kuenstlerSeite, kuenstlerUrl(o.mandant), T.freigabeSeiteFein)
        + mailAdresse(T.kuenstlerBearbeiten, `${kuenstlerUrl(o.mandant)}?k=${encodeURIComponent(o.schluessel)}`, T.kuenstlerBearbeitenFein),
        loeschen || undefined),
    };
  }
  return {
    betreff: T.ablehnungBetreff,
    loeschen,
    html: mailHuelle(
      mailTitel(T.ablehnungTitel)
      + mailText(T.ablehnungText)
      + (loeschen ? mailAdresse(T.linksAllesLoeschen, loeschen, T.ablehnungLoeschenFein) : ""),
      loeschen || undefined),
  };
}

export async function freigabePerPost(o: Entscheidung & { an: string }): Promise<boolean> {
  if (!o.an.includes("@")) return false;
  const { betreff, html, loeschen } = await freigabeMailBauen(o);
  const res = await sendEmail({
    konto: "versusforge",
    absender: "lakatosbandi.com",
    to: o.an,
    /* Ohne spitze Klammern — `sendEmail` setzt sie selbst. */
    ...(loeschen ? { listUnsubscribe: loeschen } : {}),
    subject: betreff,
    html,
  });
  if (!res.ok) console.error("[versusforge-freigabe-post] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
