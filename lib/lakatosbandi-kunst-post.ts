import { kundenbildLesen } from "@/lib/lakatosbandi-kundenbild";
import { mandantOeffentlich } from "@/lib/versusforge-mandanten";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import { sendEmail } from "@/lib/email-send";

/**
 * ── DAS FERTIGE BLATT PER MAIL — EINMAL GESCHRIEBEN, ZWEIMAL GEBRAUCHT (Owner 19.09.2026:
 * „noch Mail senden an die Kunden, falls sie verloren gehen oder sie nicht bekommen") ─────────
 *
 * Gleich nach der Erzeugung (`api/poster-kunst`) und später noch einmal von Hand aus der
 * Freigabe-Übersicht. Zwei Kopien desselben Briefes wären die Stelle, an der in vier Wochen zwei
 * verschiedene Mails herauskämen.
 *
 * DIE ADRESSE STEHT AM KAUF (`zettel.mail`), nicht im Aufruf: Wer nachträglich schickt, hat die
 * Adresse nicht mehr — und soll sie auch nicht von Hand eintippen müssen.
 *
 * FEHLT SIE, passiert nichts und es wird nichts bemängelt: Die Adresse war freiwillig.
 */
export async function kunstBlattMailen(bildId: string, anStatt?: string): Promise<{ ok: boolean; grund?: string }> {
  const gelesen = await kundenbildLesen(bildId).catch(() => null);
  if (!gelesen || !gelesen.zettel.stil) return { ok: false, grund: "kein-kauf" };

  const an = String(anStatt ?? gelesen.zettel.mail ?? "").trim();
  if (!an.includes("@")) return { ok: false, grund: "keine-adresse" };

  const m = await mandantOeffentlich(gelesen.zettel.mandant);
  const T = portalTexte(portalSprache(m?.sprache, "ro"));
  const adresse = `https://lakatosbandi.com/${encodeURIComponent(gelesen.zettel.mandant)}`;

  const r = await sendEmail({
    to: an,
    subject: T.kunstMailBetreff,
    html: [
      `<p style="font:16px/1.6 system-ui">${T.kunstMailText}</p>`,
      `<p><img src="cid:blatt" alt="" style="max-width:100%;border-radius:8px" /></p>`,
      `<p style="font:13px/1.6 system-ui;color:#777">${adresse}</p>`,
    ].join(""),
    text: `${T.kunstMailText}\n${adresse}`,
    anhaenge: [{ name: "poster.jpg", inhalt: Buffer.from(gelesen.bild), typ: "image/jpeg", cid: "blatt" }],
  });
  return { ok: !!r.ok, ...(r.ok ? {} : { grund: String(r.error ?? r.skipped ?? "fehler") }) };
}
