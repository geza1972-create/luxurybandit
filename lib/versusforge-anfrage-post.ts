import { sendEmail } from "@/lib/email-send";
import { eur, VERSUSFORGE_ABO_CENTS, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import { mailHuelle, mailTitel, mailText, mailFein, mailKasten } from "@/lib/versusforge-mail-huelle";
import { mailTexteInSprache } from "@/lib/versusforge-mail-texte";
import { kuenstlerDashboardUrl } from "@/lib/lakatosbandi";

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
 *
 * ── VIER FASSUNGEN (10.09.2026, mit dem Art-Marketing-Abo) ─────────────────────────────────
 *
 *  · `alt`       — das Einmal-Modell (299 €, die ersten Anfragen offen). Bleibt für ein anderes
 *                  Rezept stehen.
 *  · `offen`     — Kunst: Er sieht die Anfrage im Dashboard. Kein Kasten, nichts zu kaufen.
 *  · `frage`     — Kunst: die dritte Anfrage. „Willst du deinen Agenten behalten?" + Abo-Preis.
 *  · `gesperrt`  — Kunst: nach 14 Tagen ohne Abo. „Jemand hat dir geantwortet" — sehen erst mit Abo
 *                  (Owner: „bekommt eine E-Mail, aber er kann sie nicht sehen … aufgefordert zu
 *                  zahlen, um die Antwort zu sehen").
 */
export type AnfrageModus = "alt" | "offen" | "frage" | "gesperrt";

export async function anfragePerPost(o: {
  an: string;
  mandant: string;
  name: string;
  offen: number;
  /** Der Dashboard-Schlüssel — ohne ihn führt der Knopf auf eine Seite, die sich nicht öffnet. */
  schluessel: string;
  /** Für die Abbestellung im Fuss — Löschen ist hier der Abmeldeweg. */
  loeschSchluessel: string;
  /** Die Sprache des Mandanten. Ohne Angabe Deutsch. */
  sprache?: string;
  /** Welche Fassung — ohne Angabe das Einmal-Modell wie bisher. */
  modus?: AnfrageModus;
}): Promise<boolean> {
  if (!o.an.includes("@")) return false;
  const modus = o.modus ?? "alt";

  /* Seine Sprache — diese Mail bekommt er womöglich jede Woche, und sie ist der Grund, warum
     er ins Dashboard geht. */
  const T = await mailTexteInSprache(o.sprache);

  /* DER KNOPF FÜHRT AUF DAS DASHBOARD, NICHT AUF DIE ANZEIGEN-SEITE (09.09.2026, mit dem
     Dashboard gebaut). Bis heute schickte „Dashboard freischalten" ihn auf die Seite mit den
     Anzeigentexten — dort standen die Anfragen nie. Jetzt landet er dort, wo die Zahl steht
     und wo er einrichten kann. */
  /* Künstler (alle Abo-Fassungen) haben ihr Dashboard auf lakatosbandi.com (Owner 10.09.2026). */
  const dashboard = modus !== "alt"
    ? kuenstlerDashboardUrl(o.mandant, o.schluessel)
    : `https://versusforge.com/${o.mandant}/dashboard?k=${encodeURIComponent(o.schluessel)}`;
  const loeschen = `https://versusforge.com/${o.mandant}/anzeige?k=${encodeURIComponent(o.loeschSchluessel)}`;
  const mehrere = o.offen > 1;
  /* DER PREIS WIRD ANGEHÄNGT, NICHT ÜBERSETZT ([[prices-only-from-pricing-table]]):
     Ein Übersetzer rechnet Beträge um oder verliert sie. */
  const aboPreis = eur(VERSUSFORGE_ABO_CENTS, o.sprache);

  const inhalt =
    modus === "offen"
      ? mailTitel(T.anfrageTitelEine)
        + mailKasten("", T.aboOffenText, { adresse: dashboard, wort: T.anfrageKnopf })
        + mailFein(T.anfrageUhr)
      : modus === "frage"
        ? mailTitel(T.aboFrageTitel) + mailText(T.aboFrageText)
          + mailKasten(T.aboKastenTitel, `${T.aboKastenText} ${aboPreis}.`, { adresse: dashboard, wort: T.anfrageKnopf })
          + mailFein(T.anfrageUhr)
        : modus === "gesperrt"
          ? mailTitel(T.aboGesperrtTitel) + mailText(T.aboGesperrtText)
            + mailKasten(T.aboKastenTitel, `${T.aboKastenText} ${aboPreis}.`, { adresse: dashboard, wort: T.anfrageKnopf })
          : mailTitel(mehrere ? T.anfrageTitelViele.replace("{n}", String(o.offen)) : T.anfrageTitelEine)
            + mailText(mehrere ? T.anfrageTextViele : T.anfrageTextEine)
            + mailKasten(
                T.anfrageKastenTitel,
                `${T.anfrageKastenText} ${eur(VERSUSFORGE_START_CENTS, o.sprache)}.`,
                { adresse: dashboard, wort: T.anfrageKnopf })
            /* DIE UHR IST DAS ARGUMENT, NICHT DER PREIS. Wer sich am selben Tag meldet, gewinnt —
               und genau das kann er nicht, solange er die Nummer nicht sieht. */
            + mailFein(T.anfrageUhr);

  const betreff =
    modus === "frage" ? T.aboFrageBetreff
      : modus === "gesperrt" ? T.aboGesperrtBetreff
        : modus === "offen" ? T.anfrageBetreffEine
          : mehrere ? T.anfrageBetreffViele.replace("{n}", String(o.offen)) : T.anfrageBetreffEine;

  const res = await sendEmail({
    /* AUS DEM VERSUSFORGE-POSTFACH, nicht aus dem des Hauses (Owner 09.09.2026: „sonst
       bekommen die Leute eine E-Mail von LuxuryBandit"). Fehlt es noch, geht sie mit einer
       Warnung im Log über das Haus — siehe `MailKonto` in lib/email-send.ts. */
    konto: "versusforge",
    to: o.an,
    /* Der Kopf, den Mail-Programme selbst auswerten — damit „abbestellen" auch dort
       funktioniert, wo der Mensch gar nicht bis zum Fuss scrollt. */
    listUnsubscribe: `<${loeschen}>`,
    /* Der Betreff trägt seinen Betriebsnamen — er steht in der Liste zwischen fremder Post
       und muss ohne Öffnen sagen, worum es geht. */
    subject: `${betreff} · ${o.name}`,
    html: mailHuelle(inhalt, loeschen),
  });
  if (!res.ok) console.error("[versusforge-anfrage] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
