import { sendEmail } from "@/lib/email-send";
import { MAIL, mailHuelle, mailTitel, mailText, mailFein, mailAdresse, mailKasten } from "@/lib/versusforge-mail-huelle";
import { metaSchritteInSprache } from "@/lib/versusforge-meta-anleitung";
import { mailTexteInSprache, type MailTexte } from "@/lib/versusforge-mail-texte";
import { eur, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
/* `kuenstlerDashboardUrl` stand hier, solange die Künstler-Mail auch das Dashboard verlinkte —
   seit sie nur noch einen Link enthält (Owner 12.09.2026), wird es hier nicht mehr gebraucht. */
import { kuenstlerUrl, PORTAL_URL } from "@/lib/lakatosbandi-adressen";

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

/* AUS EINER KONSTANTEN WURDE EINE FUNKTION (09.09.2026): Die Anleitung hängt jetzt an der
   Sprache des Mandanten — eine Meta-Anleitung auf Deutsch nützt einem rumänischen Wirt
   nichts, und sie ist der einzige Teil der Mail, den er wirklich abarbeiten muss. */
const anleitung = (schritte: [string, string][], T: MailTexte) =>
  `<tr><td style="padding:22px 26px 0;font-family:${MAIL.schrift};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${MAIL.text}">${T.linksAnleitungTitel}</td></tr>`
  + schritte.map(([titel, text], i) =>
      `<tr><td style="padding:14px 26px 0;font-family:${MAIL.schrift};font-size:16px;line-height:1.55;color:${MAIL.grau}">`
      + `<b style="color:${MAIL.text}">${i + 1}. ${titel}</b><br>${text}`
      + `</td></tr>`).join("")
  + `<tr><td style="padding:16px 26px 0;font-family:${MAIL.schrift};font-size:14.5px;line-height:1.55;color:${MAIL.fein}">`
  + T.linksMetaFein
  + `</td></tr>`;

export async function linksPerPost(o: {
  an: string;
  mandant: string;
  /** Der Dashboard-Schlüssel. Er ist die einzige Tür zum Einrichten und zu den Anfragen. */
  schluessel: string;
  loeschSchluessel: string;
  /** Nur den Löschlink schicken — wenn er ihn auf der Seite angefordert hat. */
  nurLoeschen?: boolean;
  /** Die Sprache des Mandanten. Ohne Angabe Deutsch. */
  sprache?: string;
  /** Ein Künstler (lakatosbandi.com): seine Seite und sein Dashboard statt Anzeige, Trichter und Meta-Anleitung. */
  kuenstler?: boolean;
  /**
   * DIE BESTÄTIGUNG, BEVOR ES DIE SEITE GIBT (Owner 12.09.2026: „also vorher").
   *
   * Ist dieser Token gesetzt, geht KEINE Willkommensmail hinaus, sondern die eine Frage: Gehört
   * dir diese Adresse? Erst der Klick legt den Künstler an. Es gibt dann noch keinen Mandanten,
   * keine Seite und keinen Schlüssel — deshalb trägt diese Mail auch keinen Löschlink im Fuss.
   */
  bestaetigenToken?: string;
}): Promise<boolean> {
  if (!o.an.includes("@")) return false;

  const T = await mailTexteInSprache(o.sprache);
  /* Der Fuss jeder Mail, in seiner Sprache (bis 12.09.2026 fest auf Deutsch in `mailHuelle`). */
  const fuss = { grund: T.fussGrund, loeschen: T.fussLoeschen };

  if (o.bestaetigenToken) {
    const link = `${PORTAL_URL}/bestaetigen?t=${encodeURIComponent(o.bestaetigenToken)}`;
    /* KEIN LÖSCHLINK UND KEIN `listUnsubscribe`: Es gibt noch nichts zu löschen und nichts zu
       abbestellen — die Seite entsteht erst mit dem Klick. Deshalb auch kein Fuss. */
    const res = await sendEmail({
      konto: "versusforge",
      absender: "lakatosbandi.com",
      to: o.an,
      subject: T.bestaetigenBetreff,
      html: mailHuelle(
        mailTitel(T.bestaetigenTitel)
        + mailText(T.bestaetigenText)
        + mailAdresse(T.bestaetigenKnopf, link, T.bestaetigenKnopfFein)
        + mailFein(T.bestaetigenFremd)),
    });
    if (!res.ok) console.error("[versusforge-links] Bestätigungsmail fehlgeschlagen:", res.error);
    return res.ok;
  }

  const basis = "https://versusforge.com";
  const anzeige = `${basis}/${o.mandant}/anzeige`;
  const trichter = `${basis}/${o.mandant}`;
  /* Künstler löschen auf lakatosbandi.com, nicht auf der Firmen-Anzeigenseite (Owner 11.09.2026: „nicht auf VersusForge"). */
  const loeschen = o.kuenstler
    ? `${kuenstlerUrl(o.mandant)}/loeschen?k=${encodeURIComponent(o.loeschSchluessel)}`
    : `${basis}/${o.mandant}/anzeige?k=${encodeURIComponent(o.loeschSchluessel)}`;
  const dashboard = `${basis}/${o.mandant}/dashboard?k=${encodeURIComponent(o.schluessel)}`;

  const html = o.nurLoeschen
    ? mailHuelle(
        mailTitel(T.linksLoeschTitel)
        + mailText(T.linksLoeschText)
        + mailAdresse(T.linksLoeschWort, loeschen, T.linksLoeschFein))
    : o.kuenstler
    /* DIE KÜNSTLER-MAIL (Owner 10.09.2026): keine Anzeige, kein Trichter, keine 299 €, keine Meta-
       Anleitung — seine Seite, sein Dashboard, der Löschlink. */
    /**
     * ── EIN EINZIGER LINK (Owner 12.09.2026: „er bekommt per E-Mail nur einen Link, nicht
     * mehrere, nachdem er die Seite angelegt hat. Und zwar der Link zu seiner Admin. Klickt er
     * drauf, wird dann alles angelegt und er sieht die Meldung, und dann tatataa") ─────────────
     *
     * Hier standen VIER Adressen untereinander — seine Seite, das Bearbeiten, das Dashboard und
     * das Löschen. Wer vier Links bekommt, klickt keinen: Er müsste erst entscheiden, welcher
     * seiner ist. Jetzt führt genau einer hin, und dort steht alles Weitere (die Vorschau seiner
     * Seite als Knopf, das Löschen im Fuss der Seite).
     *
     * UND ER IST DER SCHLÜSSEL ZUM GANZEN ABLAUF: Erst dieser Klick stösst das Rechnen an —
     * Bilder ansehen, Sätze schreiben. Damit kann nur der Mensch, der an diese Adresse kommt,
     * eine Seite in Gang setzen; wer fremde Bilder hochlädt, löst gar nichts aus.
     *
     * Das Löschen bleibt erreichbar: Es steht im Fuss der Mail (zweites Argument von `mailHuelle`).
     */
    ? mailHuelle(
        mailTitel(T.kuenstlerTitel)
        + mailText(T.kuenstlerText)
        + mailAdresse(T.kuenstlerBearbeiten, `${kuenstlerUrl(o.mandant)}?k=${encodeURIComponent(o.schluessel)}`, T.kuenstlerBearbeitenFein)
        + mailFein(T.linksHilfe),
        loeschen, fuss)
    : mailHuelle(
        mailTitel(T.linksTitel)
        + mailAdresse(T.linksAnzeige, anzeige, T.linksAnzeigeFein)
        + mailAdresse(T.linksTrichter, trichter, T.linksTrichterFein)
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
        + mailAdresse(T.linksDashboard, dashboard, T.linksDashboardFein)
        /**
         * DIE GRENZE, VOR DER ANLEITUNG (Owner 09.09.2026: „in der Mail muss stehen, dass er
         * diesen Trichter nicht nutzen kann, nur nachbauen").
         *
         * SIE STEHT VOR DER ANLEITUNG UND NICHT DAHINTER: Wer zuerst die Anleitung liest,
         * richtet die Anzeige ein und zahlt Werbebudget — und merkt erst danach, dass er die
         * Anfragen nicht lesen kann. Das Geld wäre durch unsere Reihenfolge verbrannt.
         */
        + mailKasten(
            T.linksVorWerbung,
            `<b style="color:${MAIL.text}">${T.linksAnsehenWort}</b> ${T.linksAnsehenText}<br>`
            + `<b style="color:${MAIL.text}">${T.linksNachbauenWort}</b> ${T.linksNachbauenText}<br>`
            + `<b style="color:${MAIL.text}">${T.linksBenutzenWort}</b> ${T.linksBenutzenText}<br><br>`
            + `${T.linksWarnung} ${eur(VERSUSFORGE_START_CENTS, o.sprache)} ${T.linksPreisFein}`)
        + anleitung(await metaSchritteInSprache(o.sprache ?? "de"), T)
        + mailFein(T.linksHilfe)
        + mailAdresse(T.linksAllesLoeschen, loeschen, T.linksAllesLoeschenFein),
        loeschen);

  const res = await sendEmail({
    /* AUS DEM VERSUSFORGE-POSTFACH, nicht aus dem des Hauses (Owner 09.09.2026: „sonst
       bekommen die Leute eine E-Mail von LuxuryBandit"). Fehlt es noch, geht sie mit einer
       Warnung im Log über das Haus — siehe `MailKonto` in lib/email-send.ts. */
    konto: "versusforge",
    /* Der Künstler liest „lakatosbandi.com" als Absender, nicht „VersusForge" — dasselbe Postfach (Owner 11.09.2026). */
    ...(o.kuenstler ? { absender: "lakatosbandi.com" } : {}),
    to: o.an,
    listUnsubscribe: `<${loeschen}>`,
    subject: o.nurLoeschen ? T.linksBetreffLoeschen : o.kuenstler ? T.kuenstlerBetreff : T.linksBetreff,
    html,
  });
  if (!res.ok) console.error("[versusforge-links] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
