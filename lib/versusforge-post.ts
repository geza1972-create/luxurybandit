import { sendEmail } from "@/lib/email-send";
import { MAIL, mailHuelle, mailTitel, mailText, mailFein, mailAdresse } from "@/lib/versusforge-mail-huelle";
import type { VersusForgePlan } from "@/lib/versusforge-folien";
import { VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import { mailTexteInSprache } from "@/lib/versusforge-mail-texte";

/**
 * DIE ANALYSE GEHT RAUS (Owner 08.09.2026: „die wird doch generiert und per E-Mail
 * versendet" — sie wurde es nicht; heute lud der Kunde sie selbst herunter oder gar nicht).
 *
 * ALS ANHANG, NICHT ALS LINK. Der Owner hat den Grund selbst benannt: „die Analyse ist doch
 * nicht für immer da, es ist doch keine URL." Richtig — es wird nichts abgelegt, also gibt es
 * nichts zu verlinken, und ein Link auf etwas Flüchtiges wäre in zwei Wochen eine tote Seite.
 * Die Datei reist mit und gehört danach ihm, unabhängig von uns.
 *
 * DIE MAIL IST KURZ. Der Inhalt liegt im PDF; eine Mail, die ihn wiederholt, macht den Anhang
 * überflüssig und wird nicht geöffnet.
 *
 * SIE DARF SCHEITERN, OHNE DEN KUNDEN ZU KOSTEN: Die Anfrage ist vorher gespeichert. Kommt
 * die Post nicht durch, steht sie trotzdem im Dashboard — der Owner ruft an. Ein verlorener
 * Anhang darf nie eine verlorene Anfrage bedeuten.
 */

const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

export async function analysePerPost(o: {
  an: string;
  plan: VersusForgePlan;
  eingabe: string;
  runden: { frage: string; antwort: string }[];
  /**
   * SEIN TRICHTER-LINK (Owner 09.09.2026: „am Ende kann er sich per E-Mail den Link schicken
   * lassen. Dann kann er sich das immer wieder anschauen.").
   *
   * WARUM DAS MEHR IST ALS BEQUEMLICHKEIT: Auf dem Bildschirm steht der Link einmal. Wer den
   * Tab schliesst, hat ihn verloren — und damit das Einzige, was er wirklich anfassen kann.
   * In der Mail überlebt er den Browser, das Wochenende und den Gedanken „das schau ich mir
   * später an".
   */
  trichterLink?: string;
  /** Die Sprache, in der er mit uns geredet hat. Ohne Angabe Deutsch. */
  sprache?: string;
}): Promise<boolean> {
  /* SEINE SPRACHE, NICHT UNSERE (Owner 09.09.2026): Diese Mail ist oft das Letzte, was er
     von uns sieht — und die einzige Fläche, die das Haus verlässt. */
  const T = await mailTexteInSprache(o.sprache);
  const telefon = process.env.VERSUSFORGE_TELEFON?.trim() || "";
  const mail = process.env.VERSUSFORGE_MAIL?.trim() || "";

  const hook = String(o.plan?.hook ?? "").trim();

  const html = mailHuelle(
    mailTitel(T.planTitel)
    + (hook ? mailText(`<b style="color:${MAIL.text}">„${hook}“</b>`) : "")
    + mailText(T.planText)
    + (o.trichterLink
        ? mailAdresse(T.planAnzeige, `https://versusforge.com${o.trichterLink}/anzeige`, T.planAnzeigeFein)
          + mailAdresse(T.planTrichter, `https://versusforge.com${o.trichterLink}`, T.planTrichterFein)
        : "")
    + (telefon || mail
        ? mailFein(
            T.planHilfe
            + (telefon ? `<br><b style="color:${MAIL.text};font-size:17px">${telefon}</b>` : "")
            + (mail ? `<br><b style="color:${MAIL.text}">${mail}</b>` : ""))
        : ""),
  );

  const res = await sendEmail({
    /* AUS DEM VERSUSFORGE-POSTFACH, nicht aus dem des Hauses (Owner 09.09.2026: „sonst
       bekommen die Leute eine E-Mail von LuxuryBandit"). Fehlt es noch, geht sie mit einer
       Warnung im Log über das Haus — siehe `MailKonto` in lib/email-send.ts. */
    konto: "versusforge",
    to: o.an,
    subject: hook ? `${T.planBetreff}: ${hook}` : T.planBetreff,
    html,
    ...(mail ? { replyTo: mail } : {}),
  });
  if (!res.ok) console.error("[versusforge-post] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
