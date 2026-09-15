import { sendEmail } from "@/lib/email-send";
import { mailHuelle, mailTitel, mailText, MAIL } from "@/lib/versusforge-mail-huelle";
import { mailTexteInSprache } from "@/lib/versusforge-mail-texte";
import { PORTAL_URL } from "@/lib/lakatosbandi-adressen";
import { folgerListe } from "@/lib/kuenstler-follower";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";

/**
 * „{NAME} HAT EIN NEUES WERK" — die Mail, die der Follow-Knopf verspricht (Owner 13.09.2026:
 * „Der Follow-Knopf verspricht «Primești un e-mail când artistul adaugă o lucrare nouă» — diese
 * Mail gibt es noch nicht. Bauen").
 *
 * Seit dem 13.09.2026 steht das Versprechen live auf jeder Künstlerseite. Wer folgte, wartete
 * auf etwas, das nie kam — gesammelte Adressen für eine Zusage, die wir nicht eingelöst haben.
 *
 * ── EINE MAIL JE FOLLOWER, IN SEINER SPRACHE ────────────────────────────────────────────────
 *
 * Kein Sammelversand mit verstecktem Verteiler: Jeder bekommt seine eigene, weil jeder seinen
 * eigenen Abmeldelink braucht. Ein gemeinsamer Link würde beim Klick den Falschen austragen.
 * Die Sprache steht am Follower (`folgenAnmelden` legt sie ab) — eine deutsche Mail an eine
 * rumänische Adresse wäre derselbe Fehler wie der Cookie-Streifen am selben Tag.
 *
 * ── DER KOPF SAGT „lakatosbandi.com" ────────────────────────────────────────────────────────
 *
 * Nicht VersusForge. Der Empfänger hat einem Künstler gefolgt; das Werkzeug dahinter kennt er
 * nicht, und „MARKETING ENGINE" über einer Mail über ein Gemälde liest sich wie Werbung von
 * einer fremden Firma — genau das drückt man weg.
 *
 * ── HÖCHSTENS EINMAL AM TAG ─────────────────────────────────────────────────────────────────
 *
 * `folgenMailAm` bremst. Wer zehn Werke hochlädt, speichert dabei mehrmals; ohne Bremse gingen
 * zehn Mails an denselben Menschen. Das ruiniert die Zustellbarkeit der Domain — und damit auch
 * die Bestätigungsmails, ohne die überhaupt keine Künstlerseite entsteht.
 */

/** Das Bild des Werks, absolut adressiert — relative Pfade gibt es in einer Mail nicht. */
const werkBild = (mandant: string, i: number) =>
  `${PORTAL_URL}/api/portal-werk?m=${encodeURIComponent(mandant)}&i=${i}`;

export async function neuesWerkAnFollower(o: {
  mandant: string;
  /** Sein Künstlername, wie er auf der Seite steht. */
  kuenstler: string;
  /** Die Nummern der WIRKLICH neuen Werke — die höchste davon zeigt die Mail. */
  neu: number[];
}): Promise<number> {
  if (!o.mandant || !o.neu.length) return 0;

  /* FRISCH LESEN UND SOFORT MARKIEREN: Zwischen Prüfung und Versand liegen Sekunden, in denen
     ein zweites Speichern denselben Lauf auslösen könnte. Die Marke wird deshalb VOR dem
     Versand gesetzt — lieber eine Mail zu wenig als zwanzig zu viel. */
  const m = await mandantLesen(o.mandant);
  if (!m) return 0;
  /* NUR FREIGEGEBENE KÜNSTLER: `api/portal-werk` liefert die Bilder aller anderen mit 404 aus.
     Die Mail zeigte dann einen leeren Rahmen — und eine Mail, die einmal kaputt aussieht, wird
     beim nächsten Mal nicht mehr geöffnet. */
  if (m.freigabe !== "frei") return 0;
  const zuletzt = String(m.folgenMailAm ?? "").trim();
  if (zuletzt && Date.now() - Date.parse(zuletzt) < 24 * 60 * 60 * 1000) return 0;

  const empfaenger = await folgerListe(o.mandant).catch(() => []);
  if (!empfaenger.length) return 0;

  await mandantSpeichern(o.mandant, { ...m, folgenMailAm: new Date().toISOString() });

  const nr = Math.max(...o.neu);
  const seite = `${PORTAL_URL}/${encodeURIComponent(o.mandant)}`;
  let raus = 0;

  for (const f of empfaenger) {
    const T = await mailTexteInSprache(f.sprache);
    const satz = o.neu.length > 1
      ? T.neuesWerkMehrere.replace("{name}", o.kuenstler).replace("{zahl}", String(o.neu.length))
      : T.neuesWerkEins.replace("{name}", o.kuenstler);
    /* Sein eigener Abmeldelink — nie ein gemeinsamer. */
    const abmelden = `${PORTAL_URL}/api/folgen-abmelden?m=${encodeURIComponent(o.mandant)}&e=${encodeURIComponent(f.mail)}`;

    const bild = `<tr><td style="padding:18px 26px 0">`
      + `<a href="${seite}" style="text-decoration:none">`
      /* Feste Breite statt Prozent: Outlook rechnet Prozentwerte in Tabellen falsch. */
      + `<img src="${werkBild(o.mandant, nr)}" width="508" alt=""`
      + ` style="display:block;width:100%;max-width:508px;border-radius:12px;border:1px solid ${MAIL.linie}">`
      + `</a></td></tr>`;

    const knopf = `<tr><td style="padding:18px 26px 0;font-family:${MAIL.schrift}">`
      + `<a href="${seite}" style="display:inline-block;background:${MAIL.akzent};color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:13px 22px;border-radius:10px">${T.neuesWerkKnopf}</a>`
      + `</td></tr>`;

    const res = await sendEmail({
      konto: "versusforge",
      absender: "lakatosbandi.com",
      to: f.mail,
      subject: T.neuesWerkBetreff.replace("{name}", o.kuenstler),
      listUnsubscribe: abmelden,
      html: mailHuelle(
        mailTitel(T.neuesWerkTitel.replace("{name}", o.kuenstler))
        + mailText(satz)
        + bild
        + knopf,
        abmelden,
        {
          grund: T.neuesWerkFussGrund.replace("{name}", o.kuenstler),
          loeschen: T.neuesWerkAbmelden,
        },
        "lakatosbandi",
      ),
    });
    if (res.ok) raus += 1;
    else console.error("[folgen-neu] Versand fehlgeschlagen:", f.mail.slice(0, 3) + "…", res.error);
  }

  console.log(`[folgen-neu] ${o.mandant}: ${raus}/${empfaenger.length} Mails, ${o.neu.length} neue Werke`);
  return raus;
}
