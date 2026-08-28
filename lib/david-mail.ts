import { sendEmail } from "@/lib/email-send";

/**
 * „DEINE ANALYSE LIEGT BEREIT" — DIE MAIL NACH DEM GRATIS-BERICHT.
 *
 * Owner 28.08.2026: „Der User muss eine E-Mail bekommen, dass seine Analyse in seinen Assets
 * ist. Der kann sich das immer wieder anschauen und vielleicht generiert doch ein Lebenslauf
 * für Geld :)"
 *
 * WARUM SIE DER WICHTIGSTE TEIL DES GRATIS-PRODUKTS IST: Das Screening kostet uns rund vier
 * Cent und den Bewerber zehn Minuten. Danach schliesst er den Tab — und ohne diese Mail ist
 * er weg, mitsamt dem Bericht, den er nie wieder findet. Die Mail ist der einzige Faden, an
 * dem der Kauf später noch hängt. Sie verkauft nicht, sie erinnert: Der Bericht ist da, er
 * gehört ihm, und er liegt einen Klick entfernt.
 *
 * KEINE HAUS-ADRESSE IM TEXT (Hausregel [[keine-email-adresse-auf-der-seite]]): Rückfragen
 * gehen über /contact, nie über eine abgedruckte Adresse — auch nicht in einer Mail.
 *
 * IN SEINER SPRACHE. Der Bericht ist deutsch oder englisch geschrieben; eine Mail in einer
 * dritten Sprache wäre der schnellste Weg in den Spam-Ordner des Kopfes.
 *
 * SIE GEHT GENAU EINMAL: Der Aufrufer stempelt `berichtMailAt` an der Sitzung, bevor er
 * schickt. Ein zweiter Aufruf derselben Route (Neuladen, Doppelklick) darf nicht zweimal
 * klingeln.
 */

type Texte = {
  betreff: string; hallo: string; satz1: string; satz2: string; knopf: string;
  assets: string; frage: string; kontakt: string;
};

const T: Record<string, Texte> = {
  de: {
    betreff: "Deine Analyse ist fertig",
    hallo: "Hallo {name},",
    satz1: "David hat deinen Lebenslauf und die Stellenanzeige durchgearbeitet. Dein Ergebnis liegt bereit.",
    satz2: "Du findest es jederzeit unter „Assets“ wieder — auch morgen noch, auch nach dem Schliessen des Browsers.",
    knopf: "Mein Ergebnis ansehen",
    assets: "Alle deine Ergebnisse: {origin}/my-gallery",
    frage: "Fragen?",
    kontakt: "Schreib uns",
  },
  en: {
    betreff: "Your analysis is ready",
    hallo: "Hi {name},",
    satz1: "David went through your CV and the job ad. Your result is ready.",
    satz2: "You can find it under “Assets” any time — tomorrow too, even after closing the browser.",
    knopf: "See my result",
    assets: "All your results: {origin}/my-gallery",
    frage: "Questions?",
    kontakt: "Write to us",
  },
  ro: {
    betreff: "Analiza ta este gata",
    hallo: "Salut {name},",
    satz1: "David ți-a parcurs CV-ul și anunțul de angajare. Rezultatul tău e gata.",
    satz2: "Îl găsești oricând la „Assets” — și mâine, chiar și după ce închizi browserul.",
    knopf: "Vezi rezultatul meu",
    assets: "Toate rezultatele tale: {origin}/my-gallery",
    frage: "Întrebări?",
    kontakt: "Scrie-ne",
  },
};

/**
 * Verschickt die Mail. Gibt `false` zurück, wenn nichts ging — der Aufrufer darf daran NIE
 * scheitern: Der Bericht steht bereits, und ein Postfehler ist kein Grund, dem Bewerber sein
 * Ergebnis zu verweigern.
 */
export async function berichtMailSchicken(o: {
  an: string; vorname?: string; sitzungId: string; origin: string; sprache?: string; jobTitel?: string;
}): Promise<boolean> {
  if (!o.an || !o.sitzungId) return false;
  const t = T[(o.sprache ?? "de").slice(0, 2)] ?? T.de;
  const name = (o.vorname ?? "").trim();
  const link = `${o.origin}/david/${encodeURIComponent(o.sitzungId)}`;
  const stelle = (o.jobTitel ?? "").trim();

  const html =
    `<div style="background:#0d0b0a;padding:22px 0;font-family:Arial,Helvetica,sans-serif">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
    + `<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="width:520px;max-width:94%;background:#16120f;border-radius:18px;overflow:hidden">`
    + `<tr><td style="padding:20px 22px 4px;color:#f6cf51;font-size:13px;font-weight:bold;letter-spacing:2px">LUXURYBANDIT</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#8d8579;font-size:11px;font-weight:bold;letter-spacing:2px">DAVID · AI PRE-SCREENING</td></tr>`
    + `<tr><td style="padding:0 22px 10px;color:#ffffff;font-size:20px;font-weight:bold;line-height:1.25">${escape(t.hallo.replace("{name}", name || "").replace(" ,", ","))}</td></tr>`
    + `<tr><td style="padding:0 22px 12px;color:#e8e2d6;font-size:14px;line-height:1.55">${escape(t.satz1)}`
    + (stelle ? `<br><span style="color:#8d8579">${escape(stelle)}</span>` : "")
    + `</td></tr>`
    + `<tr><td style="padding:0 22px 16px;color:#e8e2d6;font-size:14px;line-height:1.55">${escape(t.satz2)}</td></tr>`
    + `<tr><td style="padding:0 22px 16px"><a href="${link}" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">${escape(t.knopf)}</a></td></tr>`
    + `<tr><td style="padding:0 22px 18px;color:#8d8579;font-size:12px;line-height:1.5">${escape(t.assets.replace("{origin}", o.origin))}</td></tr>`
    /* Der Weg für Rückfragen — als LINK auf /contact, nie als abgedruckte Adresse. */
    + `<tr><td style="padding:0 22px 20px;color:#8d8579;font-size:12px">${escape(t.frage)} <a href="${o.origin}/contact?reason=support" style="color:#f6cf51">${escape(t.kontakt)}</a></td></tr>`
    + `</table></td></tr></table></div>`;

  const text = `${t.hallo.replace("{name}", name)}\n\n${t.satz1}\n${t.satz2}\n\n${link}\n`;
  const r = await sendEmail({ to: o.an, subject: t.betreff, html, text }).catch(() => ({ ok: false }));
  return !!r?.ok;
}

/** Winziger Schutz gegen kaputtes HTML aus einem Namen wie „O'Brien <script>". */
function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
