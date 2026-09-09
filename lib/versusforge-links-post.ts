import { sendEmail } from "@/lib/email-send";
import { MAIL, mailHuelle, mailTitel, mailText, mailFein, mailAdresse, mailKasten } from "@/lib/versusforge-mail-huelle";
import { META_SCHRITTE } from "@/lib/versusforge-meta-anleitung";
import { eur, VERSUSFORGE_START_CENTS } from "@/lib/pricing";

/**
 * DIE MAIL MIT SEINEN LINKS (Owner 09.09.2026: „er bekommt das an seiner E-Mail" · „oder
 * besser nur senden und löschen").
 *
 * SIE ERSETZT DAS PDF. Bis heute hing ein A4-Dokument im Anhang, das dasselbe noch einmal in
 * Fliesstext erzählte. Was er wirklich braucht, sind drei Adressen — und die gehören in eine
 * Mail, nicht in eine Datei, die er erst öffnen muss.
 *
 * DREI LINKS, MEHR NICHT:
 *  · seine Anzeigen-Seite — dort stehen Texte, Bild und Ziel
 *  · sein Trichter — den kann er aufmachen und durchgehen
 *  · löschen — mit eigenem Schlüssel, damit er jederzeit alles wegräumen kann
 *
 * DER LÖSCHLINK STEHT MIT DRIN UND NICHT VERSTECKT. Wer Daten anderer Menschen sammelt, muss
 * sie wegräumen können, ohne jemanden zu fragen. Ihn zu verstecken, wäre die Sorte
 * Freundlichkeit, die man später teuer bezahlt.
 */

const ANLEITUNG =
  `<tr><td style="padding:22px 26px 0;font-family:${MAIL.schrift};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${MAIL.text}">So richtest du die Anzeige ein</td></tr>`
  + META_SCHRITTE.map(([titel, text], i) =>
      `<tr><td style="padding:14px 26px 0;font-family:${MAIL.schrift};font-size:16px;line-height:1.55;color:${MAIL.grau}">`
      + `<b style="color:${MAIL.text}">${i + 1}. ${titel}</b><br>${text}`
      + `</td></tr>`).join("")
  + `<tr><td style="padding:16px 26px 0;font-family:${MAIL.schrift};font-size:14.5px;line-height:1.55;color:${MAIL.fein}">`
  + `Meta benennt seine Menüs gelegentlich um. Findest du einen Punkt nicht unter diesem Namen, ist er meist eine Ebene höher oder tiefer.`
  + `</td></tr>`;

export async function linksPerPost(o: {
  an: string;
  mandant: string;
  /** Der Dashboard-Schlüssel. Er ist die einzige Tür zum Einrichten und zu den Anfragen. */
  schluessel: string;
  loeschSchluessel: string;
  /** Nur den Löschlink schicken — wenn er ihn auf der Seite angefordert hat. */
  nurLoeschen?: boolean;
}): Promise<boolean> {
  if (!o.an.includes("@")) return false;

  const basis = "https://versusforge.com";
  const anzeige = `${basis}/${o.mandant}/anzeige`;
  const trichter = `${basis}/${o.mandant}`;
  const loeschen = `${basis}/${o.mandant}/anzeige?k=${encodeURIComponent(o.loeschSchluessel)}`;
  const dashboard = `${basis}/${o.mandant}/dashboard?k=${encodeURIComponent(o.schluessel)}`;

  const html = o.nurLoeschen
    ? mailHuelle(
        mailTitel("Dein Löschlink.")
        + mailText(
            "Darüber löschst du deinen Trichter und alle Anfragen darin. "
            + "Das lässt sich nicht rückgängig machen.")
        + mailAdresse("Löschen", loeschen, "Ein Klick, dann noch eine Bestätigung — danach ist alles weg."))
    : mailHuelle(
        mailTitel("Deine Adressen und die Anleitung.")
        + mailAdresse("Deine Anzeige", anzeige,
            "Texte zum Kopieren, das Bild und das Ziel für die Anzeige.")
        + mailAdresse("Dein Trichter", trichter,
            "Die Seite, auf der deine Kunden landen. Mach sie auf und geh sie durch.")
        /**
         * DAS DASHBOARD STEHT MIT IN DER MAIL, UND ZWAR NICHT ERST NACH DEM KAUF
         * (09.09.2026, mit dem Dashboard gebaut).
         *
         * WEIL DORT DAS EINRICHTEN LIEGT. Solange Impressum und Datenschutz fehlen, weist
         * sein Trichter jede Anfrage ab — und diese beiden Angaben trägt er genau dort ein.
         * Ohne diesen Link in der Mail findet er die Seite nie und wartet auf Anrufe, die
         * gar nicht entstehen können. Die Anfragen selbst bleiben bis zum Kauf verschlossen;
         * das steht auf der Seite und im Kasten darunter.
         */
        + mailAdresse("Dein Dashboard", dashboard,
            "Hier trägst du Impressum, Datenschutz, Adresse und Telefonnummer ein — ohne die "
            + "nimmt deine Seite keine Anfrage an. Später stehen hier deine Anfragen.")
        /**
         * DIE GRENZE, VOR DER ANLEITUNG (Owner 09.09.2026: „in der Mail muss stehen, dass er
         * diesen Trichter nicht nutzen kann, nur nachbauen").
         *
         * SIE STEHT VOR DER ANLEITUNG UND NICHT DAHINTER: Wer zuerst die Anleitung liest,
         * richtet die Anzeige ein und zahlt Werbebudget — und merkt erst danach, dass er die
         * Anfragen nicht lesen kann. Das Geld wäre durch unsere Reihenfolge verbrannt.
         */
        + mailKasten(
            "Bevor du Geld in Werbung steckst",
            `<b style="color:${MAIL.text}">Ansehen und durchgehen:</b> ja, jederzeit.<br>`
            + `<b style="color:${MAIL.text}">Selbst nachbauen:</b> ja — es ist deine Strategie.<br>`
            + `<b style="color:${MAIL.text}">Benutzen:</b> noch nicht. Die Anfragen laufen in dein Fach, `
            + `aber lesen kannst du sie nur im Dashboard.<br><br>`
            + `Schaltest du jetzt eine Anzeige, zahlst du für Klicks und siehst am Ende keine `
            + `einzige Telefonnummer. ${eur(VERSUSFORGE_START_CENTS, "de")} einmalig, mit `
            + `Einrichtung der ersten Anzeige zusammen mit uns.`)
        + ANLEITUNG
        + mailFein("Kriegst du es trotzdem nicht eingerichtet? Schreib uns, wir machen es mit dir zusammen.")
        + mailAdresse("Alles löschen", loeschen,
            "Trichter und Anfragen, endgültig — falls du es wieder loswerden willst."),
        loeschen);

  const res = await sendEmail({
    /* AUS DEM VERSUSFORGE-POSTFACH, nicht aus dem des Hauses (Owner 09.09.2026: „sonst
       bekommen die Leute eine E-Mail von LuxuryBandit"). Fehlt es noch, geht sie mit einer
       Warnung im Log über das Haus — siehe `MailKonto` in lib/email-send.ts. */
    konto: "versusforge",
    to: o.an,
    listUnsubscribe: `<${loeschen}>`,
    subject: o.nurLoeschen ? "Dein Löschlink" : "Deine Anzeige und dein Trichter",
    html,
  });
  if (!res.ok) console.error("[versusforge-links] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
