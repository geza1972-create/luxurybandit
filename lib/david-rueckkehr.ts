import { createHmac } from "crypto";

/**
 * DER RÜCKWEG IN SEINE EIGENE SITZUNG (Owner 29.08.2026).
 *
 * DER FALL, DER DAS AUSLÖSTE: „Ich nehme mal an, in der Strecke gibt er eine falsche E-Mail
 * an, weil er ausprobieren möchte. Dann sieht er am Ende: wow, das ist wirklich gut — und er
 * will die Analyse behalten. Wir haben oft den Fall."
 *
 * Bisher hing alles am Browser: Besitz-Keks und Gerätekennung. Wer das Fenster schloss, den
 * Verlauf löschte oder auf ein anderes Gerät wechselte, kam nie wieder an seine Analyse —
 * ausgerechnet in dem Moment, in dem er überzeugt war. Und eine Fantasie-Adresse machte
 * jeden Rückweg unmöglich, weil sie die einzige personenbezogene Kennung war.
 *
 * DIE MAIL GEHT SOFORT NACH DEM LEAD RAUS, nicht am Ende — dann hat er den Rückweg, BEVOR
 * etwas verloren gehen kann. Und bleibt sie unzustellbar, wissen wir binnen Minuten, dass
 * die Adresse falsch war (Rückläufer-Leser), statt es erst beim Ausbleiben eines Kaufs zu
 * ahnen.
 *
 * WARUM SIGNIERT: Im Link steht nur die Kennung der Sitzung — kein Name, keine Adresse
 * (Hausregel: nie Personenbezogenes in eine Adresszeile). Die Unterschrift macht daraus
 * einen Nachweis, den nur der Server ausstellen kann; ohne sie könnte jemand fremde
 * Kennungen durchprobieren und in fremden Sitzungen landen.
 *
 * WARUM DERSELBE SCHLÜSSEL wie beim Besitz-Keks: Ein Vorgang, ein Geheimnis. Ein zweites
 * wäre eine zweite Stelle, an der es fehlen kann — und ein fehlendes Geheimnis fällt erst
 * auf, wenn niemand mehr zurückkommt.
 */
const GEHEIM = process.env.LEBENSLAUF_BESITZ_SECRET
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.TRY_THIS_LOOK_ADMIN_PIN
  || "lb-besitz-ohne-geheimnis";

/** Das Ticket für die Adresszeile: Kennung + Unterschrift, sonst nichts. */
export function rueckkehrTicket(id: string): string {
  const sig = createHmac("sha256", GEHEIM).update(`david-rueckkehr:${id}`).digest("hex").slice(0, 24);
  return `${id}~${sig}`;
}

/** Die Kennung aus einem Ticket — oder leer, wenn die Unterschrift nicht stimmt. */
export function ticketKennung(ticket: string): string {
  const roh = String(ticket || "").trim();
  const i = roh.indexOf("~");
  if (i <= 0) return "";
  const id = roh.slice(0, i);
  const sig = roh.slice(i + 1);
  /* Vergleich in voller Länge über den erneut gerechneten Wert — kein Teilvergleich, der
     bei falscher Länge schon „fast richtig" wäre. */
  return sig && sig === rueckkehrTicket(id).slice(id.length + 1) ? id : "";
}

/** Der Name des Parameters in der Adresszeile — an einer Stelle, damit er nie auseinanderläuft. */
export const RUECKKEHR_PARAM = "w";
