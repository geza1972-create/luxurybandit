import { sendEmail } from "@/lib/email-send";
import { eur, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import { mailHuelle, mailTitel, mailText, mailFein, mailKasten } from "@/lib/versusforge-mail-huelle";

/**
 * „DU HAST EINE ANFRAGE" (Owner 09.09.2026: „falls er das benutzt und testet, dann bekommt er
 * eine E-Mail. Du hast eine Anfrage. Schalte dein Dashboard frei, dann kannst du ihn sehen.").
 *
 * DAS IST DER VERKÄUFER, NICHT DER WERBETEXT. Bis hierher haben wir behauptet, dass sein
 * Trichter funktioniert. Diese Mail ist der Beweis — sie kommt, weil ein echter Mensch etwas
 * eingegeben hat. Kein Satz über Anfragen schlägt eine Anfrage.
 *
 * WAS NICHT DRINSTEHT: der Name, die Nummer, die Antworten. Nicht als Trick, sondern weil es
 * sonst kein Dashboard mehr braucht — und weil eine Mail mit Namen und Telefonnummer eines
 * Patienten unverschlüsselt durchs Netz geht. Was drinsteht, ist die Zahl und der Weg dorthin.
 *
 * SIE GEHT AN IHN, NICHT AN SEINEN KUNDEN. Der Kunde bekommt gar nichts von uns; er hat mit
 * der Praxis gesprochen, nicht mit VersusForge.
 *
 * HELL UND GROSS SEIT DEM ERSTEN ECHTEN VERSAND (Owner: „die Farben stimmen nicht, und es ist
 * alles viel zu klein") — die Hülle liegt in `versusforge-mail-huelle.ts`.
 */
export async function anfragePerPost(o: {
  an: string;
  mandant: string;
  name: string;
  offen: number;
  /** Der Dashboard-Schlüssel — ohne ihn führt der Knopf auf eine Seite, die sich nicht öffnet. */
  schluessel: string;
  /** Für die Abbestellung im Fuss — Löschen ist hier der Abmeldeweg. */
  loeschSchluessel: string;
}): Promise<boolean> {
  if (!o.an.includes("@")) return false;

  /* DER KNOPF FÜHRT AUF DAS DASHBOARD, NICHT AUF DIE ANZEIGEN-SEITE (09.09.2026, mit dem
     Dashboard gebaut). Bis heute schickte „Dashboard freischalten" ihn auf die Seite mit den
     Anzeigentexten — dort standen die Anfragen nie. Jetzt landet er dort, wo die Zahl steht
     und wo er einrichten kann. */
  const dashboard = `https://versusforge.com/${o.mandant}/dashboard?k=${encodeURIComponent(o.schluessel)}`;
  const loeschen = `https://versusforge.com/${o.mandant}/anzeige?k=${encodeURIComponent(o.loeschSchluessel)}`;
  const mehrere = o.offen > 1;

  const html = mailHuelle(
    mailTitel(mehrere ? `${o.offen} Anfragen warten auf dich.` : "Du hast eine Anfrage.")
    + mailText(
        `Jemand ist gerade durch deinen Trichter gegangen und hat Namen und Telefonnummer `
        + `hinterlassen. ${mehrere ? "Die Anfragen liegen" : "Sie liegt"} in deinem Dashboard.`)
    + mailKasten(
        "Schalte dein Dashboard frei.",
        `Danach siehst du zu jeder Anfrage den Namen, die Telefonnummer und das, was der Mensch `
        + `gesagt hat — auch zu denen, die schon vorher gekommen sind. `
        + `${eur(VERSUSFORGE_START_CENTS, "de")} einmalig.`,
        { adresse: dashboard, wort: "Zum Dashboard" })
    /* DIE UHR IST DAS ARGUMENT, NICHT DER PREIS. Wer sich am selben Tag meldet, gewinnt —
       und genau das kann er nicht, solange er die Nummer nicht sieht. */
    + mailFein(
        "Wer innerhalb eines Tages zurückruft, erreicht die Leute noch. Danach haben sie meist "
        + "woanders angefragt."),
    loeschen,
  );

  const res = await sendEmail({
    /* AUS DEM VERSUSFORGE-POSTFACH, nicht aus dem des Hauses (Owner 09.09.2026: „sonst
       bekommen die Leute eine E-Mail von LuxuryBandit"). Fehlt es noch, geht sie mit einer
       Warnung im Log über das Haus — siehe `MailKonto` in lib/email-send.ts. */
    konto: "versusforge",
    to: o.an,
    /* Der Kopf, den Mail-Programme selbst auswerten — damit „abbestellen" auch dort
       funktioniert, wo der Mensch gar nicht bis zum Fuss scrollt. */
    listUnsubscribe: `<${loeschen}>`,
    subject: mehrere ? `${o.offen} Anfragen für ${o.name}` : `Eine Anfrage für ${o.name}`,
    html,
  });
  if (!res.ok) console.error("[versusforge-anfrage] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
