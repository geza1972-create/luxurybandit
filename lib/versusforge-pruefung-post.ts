import { sendEmail } from "@/lib/email-send";

/**
 * DIE MAIL AN DEN OWNER, WENN EIN WERK MARKIERT WURDE (Owner 10.09.2026: „Für beides soll ich eine
 * E-Mail bekommen" · „markierte").
 *
 * DAS BILD STEHT NICHT IN DER MAIL. Ein markiertes Bild ist womöglich eines, das man nicht in
 * einem Postfach liegen haben will — und eine Mail wandert weiter. Die Mail trägt nur, WER und
 * WARUM, und den Link zur Prüfseite; dort sieht der Owner das Bild, geschützt durch seinen
 * Schlüssel, und entscheidet (`app/api/versusforge-freigabe/route.ts`).
 *
 * „VERBOTEN" LÖST KEINE MAIL AUS: Solche Bilder werden nicht gespeichert und nicht weitergeleitet
 * (`lib/versusforge-moderation.ts`) — auch nicht an den Owner.
 *
 * DIESELBE ADRESSE WIE DIE ANMELDE-MAIL: `VERSUSFORGE_ALARM_MAIL`, sonst das VersusForge-Postfach.
 */
export async function motivPruefungAlarm(o: {
  betrieb: string;
  kennung: string;
  /** Die Nummer des Hooks, zu dem das Bild gehört — leer oder „-1": sein Standardbild. */
  nr: string;
  gruende: string[];
}): Promise<boolean> {
  const an = (process.env.VERSUSFORGE_ALARM_MAIL ?? process.env.VERSUSFORGE_MAIL ?? process.env.VERSUSFORGE_SMTP_USER ?? "").trim();
  const schluessel = (process.env.VERSUSFORGE_DASHBOARD_KEY ?? "").trim();
  if (!an || !schluessel) {
    console.error("[versusforge-pruefung] Empfänger oder Schlüssel fehlt — markiertes Werk liegt ungesehen in der Prüfablage:", o.kennung, o.nr);
    return false;
  }

  const link = (a: string) =>
    `https://versusforge.com/api/versusforge-freigabe?typ=motiv&m=${encodeURIComponent(o.kennung)}&nr=${encodeURIComponent(o.nr)}&s=${encodeURIComponent(schluessel)}&a=${a}`;
  const schutz = (s: string) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = [
    `<p style="margin:0 0 4px;font-size:18px"><b>${schutz(o.betrieb)}</b> hat ein Werk hochgeladen, das markiert wurde.</p>`,
    `<p style="margin:0 0 14px;color:#5b666f">Markiert: ${schutz(o.gruende.join(", ") || "—")}</p>`,
    `<p style="margin:0 0 6px;font-size:17px"><a href="${link("frei")}"><b>Ansehen und freigeben</b></a> · <a href="${link("abgelehnt")}">Ablehnen</a></p>`,
    `<p style="margin:0;color:#5b666f">Bis zu deiner Entscheidung ist das Werk nicht öffentlich. Das Bild steht absichtlich nicht in dieser Mail.</p>`,
  ].join("");

  const res = await sendEmail({ konto: "versusforge", to: an, subject: `WERK ZUR FREIGABE: ${o.betrieb}`, html });
  if (!res.ok) console.error("[versusforge-pruefung] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
