import { sendEmail } from "@/lib/email-send";
import { sendWhatsApp } from "@/lib/whatsapp-send";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";

/**
 * DER ALARM AN UNS, WENN JEMAND EINEN RÜCKRUF WILL.
 *
 * ── WARUM ES DIESE DATEI GIBT (Owner 10.09.2026) ────────────────────────────────────────────
 *
 * „Bevor wir einen Scheiss liefern, sagen wir es ihm. … Im Zweifelfall wird ihm eine
 * telefonische Beratung angeboten." · „Dann geht eine E-Mail an mich raus oder per WhatsApp
 * an mich."
 *
 * DER RÜCKRUF IST DIE EINZIGE STELLE IM GANZEN PRODUKT, AN DER EIN MENSCH HANDELN MUSS.
 * Alles andere läuft von selbst; hier wartet jemand am Telefon. Eine Anfrage, die nur im
 * Dashboard liegt, sieht man vielleicht am Abend — und dann hat der Mensch das Gespräch
 * längst vergessen, in dem er nicht weiterkam. Deshalb geht sie SOFORT raus.
 *
 * DAS GESPRÄCH KOMMT MIT. Wer zurückruft, darf nicht mit „erzählen Sie noch mal" anfangen:
 * Das ist genau der Satz, der alles zunichtemacht, was der Agent vorher aufgebaut hat
 * ([[agenten-die-rueckgabe]]). Die letzten Züge stehen deshalb in der Mail, nicht nur ein
 * Name und eine Nummer.
 *
 * WOHIN SIE GEHT: `VERSUSFORGE_ALARM_MAIL` aus der Umgebung. Ist nichts gesetzt, geht sie an
 * das VersusForge-Postfach selbst — dann liegt sie wenigstens dort und geht nicht verloren.
 * Eine Adresse im Code stünde in jedem Repo-Abzug ([[keine-email-adresse-auf-der-seite]]).
 *
 * ── ZWEI WEGE, UND SIE TRAGEN VERSCHIEDENE DINGE (Owner 10.09.2026: „dann geht eine E-Mail
 * an mich raus oder per WhatsApp an mich" · „der ist angebunden" · „ja, dann WA") ──────────
 *
 * WHATSAPP IST DAS KLINGELN, DIE MAIL SIND DIE DATEN. Der Weg über CallMeBot
 * (`lib/whatsapp-send.ts`, seit Langem im Haus) läuft über einen fremden Dienst — dort
 * gehören keine Telefonnummern von Kunden durch. Die Nachricht trägt deshalb nur, WER
 * anruft und den Link; Nummer und Gespräch stehen in der Mail aus unserem eigenen Postfach.
 *
 * DAS IST KEINE VORSICHT UM DER VORSICHT WILLEN: Ein Mensch, der uns gerade seine Nummer
 * anvertraut hat, weil er nicht weiterkam, ist der Letzte, dessen Daten wir über einen
 * Gratis-Dienst schicken.
 *
 * ── DER LINK ZUM GESPRÄCH (Owner 10.09.2026: „wäre cool, wenn ich den Link zu seinem Chat
 * bekommen würde auch, damit ich sehe, was er gemacht hat") ────────────────────────────────
 *
 * Er zeigt auf unsere eigene Anfragenliste — dieselbe Seite, die auch der Mandant für seine
 * Anfragen sieht, nur mit unserem Mandanten und unserem Schlüssel. Der ganze Verlauf steht
 * dort schon (`runden`), es musste nichts Neues gebaut werden.
 *
 * DER SCHLÜSSEL STEHT IN DER UMGEBUNG, nicht im Code — ein Link mit Schlüssel in einem
 * Repo-Abzug wäre ein offenes Dashboard.
 */
export async function beratungAlarm(o: {
  name: string;
  telefon: string;
  betrieb: string;
  sprache: string;
  gespraech: { frage: string; antwort: string }[];
}): Promise<boolean> {
  const an = (process.env.VERSUSFORGE_ALARM_MAIL ?? process.env.VERSUSFORGE_MAIL ?? process.env.VERSUSFORGE_SMTP_USER ?? "").trim();

  /* Der Link auf unsere eigene Anfragenliste — dort steht das ganze Gespräch. */
  const schluessel = (process.env.VERSUSFORGE_DASHBOARD_KEY ?? "").trim();
  const link = schluessel
    ? `https://versusforge.com/engine/anfragen?m=${encodeURIComponent(EIGENER_MANDANT)}&s=${encodeURIComponent(schluessel)}`
    : "";

  /**
   * DAS KLINGELN ZUERST, und es blockiert nichts: Es ist die Nachricht, die ihn erreicht,
   * während er unterwegs ist — eine Mail sieht er vielleicht erst am Abend.
   *
   * NUR VORNAME UND BETRIEB. Keine Telefonnummer über einen fremden Dienst.
   */
  const vorname = o.name.trim().split(/\s+/)[0] || o.name.trim();
  void sendWhatsApp(
    [`RÜCKRUF: ${vorname}${o.betrieb ? ` · ${o.betrieb}` : ""}`,
     "Er kam im Chat nicht weiter. Nummer und Verlauf in der Mail.",
     link].filter(Boolean).join("\n"),
  ).catch(() => false);

  if (!an) {
    console.error("[versusforge-beratung] Kein Alarm-Empfänger gesetzt (VERSUSFORGE_ALARM_MAIL/VERSUSFORGE_MAIL) — Rückruf liegt nur im Dashboard.");
    return false;
  }

  /* Roh und ungeschminkt: Das hier liest ein Mensch, der gleich zum Telefon greift — keine
     Gestaltung, keine Knöpfe, nichts zum Anklicken. Nur was er wissen muss. */
  const schutz = (s: string) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const zeilen = o.gespraech
    .filter(z => (z.frage || z.antwort).trim())
    .map(z => (z.antwort
      ? `<p style="margin:0 0 6px"><b>Er:</b> ${schutz(z.antwort)}</p>`
      : `<p style="margin:0 0 6px;color:#5b666f">VF: ${schutz(z.frage)}</p>`))
    .join("");

  const html = [
    `<p style="margin:0 0 4px;font-size:18px"><b>${schutz(o.name)}</b> — <a href="tel:${schutz(o.telefon.replace(/[^\d+]/g, ""))}">${schutz(o.telefon)}</a></p>`,
    `<p style="margin:0 0 14px;color:#5b666f">${schutz(o.betrieb)} · Gesprächssprache: ${schutz(o.sprache)}</p>`,
    `<p style="margin:0 0 8px"><b>Warum er anruft:</b> Aus dem Gespräch kam kein tragfähiger Satz. Er hat nicht aufgegeben — wir haben ihm das Telefonat angeboten.</p>`,
    link ? `<p style="margin:0 0 14px"><a href="${link}">Das ganze Gespräch ansehen</a></p>` : "",
    `<hr style="border:none;border-top:1px solid #e4e9ee;margin:14px 0">`,
    zeilen || `<p style="margin:0;color:#5b666f">Kein Verlauf mitgekommen.</p>`,
  ].join("");

  const res = await sendEmail({
    konto: "versusforge",
    to: an,
    /* Der Betreff muss auf dem Sperrbildschirm lesbar sein — Name und Nummer vorn. */
    subject: `RÜCKRUF: ${o.name} · ${o.telefon}`,
    html,
  });
  if (!res.ok) console.error("[versusforge-beratung] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
