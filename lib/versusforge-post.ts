import { sendEmail } from "@/lib/email-send";
import { MAIL, mailHuelle, mailTitel, mailText, mailFein, mailAdresse } from "@/lib/versusforge-mail-huelle";
import type { VersusForgePlan } from "@/lib/versusforge-folien";
import { VERSUSFORGE_START_CENTS } from "@/lib/pricing";

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
}): Promise<boolean> {
  const telefon = process.env.VERSUSFORGE_TELEFON?.trim() || "";
  const mail = process.env.VERSUSFORGE_MAIL?.trim() || "";

  const hook = String(o.plan?.hook ?? "").trim();

  const html = mailHuelle(
    mailTitel("Dein Weg steht.")
    + (hook ? mailText(`<b style="color:${MAIL.text}">„${hook}“</b>`) : "")
    + mailText(
        "Alles, was daraus entstanden ist, liegt unter diesen zwei Adressen — dein Bild, "
        + "deine Anzeigentexte und der Trichter, auf dem deine Kunden landen.")
    + (o.trichterLink
        ? mailAdresse("Deine Anzeige", `https://versusforge.com${o.trichterLink}/anzeige`,
            "Dort liegen dein Bild, deine Anzeigentexte und die Adresse für die Anzeige.")
          + mailAdresse("Dein Trichter", `https://versusforge.com${o.trichterLink}`,
            "Der Trichter selbst — mach ihn auf und geh ihn durch.")
        : "")
    + (telefon || mail
        ? mailFein(
            "Wenn du es nicht selbst bauen willst, meld dich — es antwortet ein Mensch."
            + (telefon ? `<br><b style="color:${MAIL.text};font-size:17px">${telefon}</b>` : "")
            + (mail ? `<br><b style="color:${MAIL.text}">${mail}</b>` : ""))
        : ""),
  );

  const res = await sendEmail({
    to: o.an,
    subject: hook ? `Dein Weg steht: ${hook}` : "Dein Weg steht",
    html,
    ...(mail ? { replyTo: mail } : {}),
  });
  if (!res.ok) console.error("[versusforge-post] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
