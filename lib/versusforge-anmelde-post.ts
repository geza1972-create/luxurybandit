import { sendEmail } from "@/lib/email-send";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { kuenstlerUrl } from "@/lib/lakatosbandi-adressen";
import { notifyAdminWhatsApp } from "@/lib/notify-admin";

/**
 * DIE MAIL AN UNS, WENN SICH EIN KÜNSTLER ANLEGT (Owner 10.09.2026: „Für beides soll ich eine
 * E-Mail bekommen" — für neue Künstler und für markierte Werke).
 *
 * ── WARUM ES SIE BRAUCHT ──────────────────────────────────────────────────────────────────
 *
 * Bis heute ging beim Anlegen nur die Mail an den Künstler raus (`linksPerPost`); bei uns
 * landete ein Eintrag in `/engine/anfragen`, den man sehen muss, um ihn zu sehen. Die Plattform
 * lebt davon, dass die ersten Künstler gut betreut werden — und die Owner will wissen, wer
 * gerade reingekommen ist, ohne nachzusehen.
 *
 * DIESELBE ADRESSE WIE DER RÜCKRUF-ALARM (`lib/versusforge-beratung-post.ts`):
 * `VERSUSFORGE_ALARM_MAIL`, sonst das VersusForge-Postfach. Keine Adresse im Code.
 *
 * SIE BLOCKIERT NICHTS: Der Aufrufer schickt sie mit `void` los. Scheitert sie, steht der
 * Künstler trotzdem angelegt da und in der Anfragenliste.
 */
/**
 * ── DER FREIGABE-LINK AUFS TELEFON (Owner 14.09.2026: „wie soll ich es freigeben? ich habe nichts
 * bekommen. Benutze CallMeBot" · „brauche den Button Freigeben") ─────────────────────────────
 *
 * Die Mail trägt die Knöpfe längst, aber sie kommt nicht überall an und wird nicht überall sofort
 * gelesen. Das hier ist derselbe Link als WhatsApp — antippen, Knopf drücken, fertig.
 *
 * STILL, WENN NICHT EINGERICHTET: `notifyAdminWhatsApp` kehrt ohne Zugänge wortlos um. Das ist
 * richtig so — eine fehlende Benachrichtigung darf nie eine Anmeldung aufhalten.
 */
export function freigabeAufsTelefon(o: { kennung: string; name: string; werke: number }): void {
  const schluessel = process.env.VERSUSFORGE_DASHBOARD_KEY?.trim() ?? "";
  if (!schluessel) return;
  const m = encodeURIComponent(o.kennung);
  const s = encodeURIComponent(schluessel);
  notifyAdminWhatsApp(
    `🖼️ Neue Seite wartet auf dich: ${o.name || o.kennung} (${o.werke} Werke)\n`
    + `Freigeben: https://lakatosbandi.com/api/versusforge-freigabe?m=${m}&s=${s}&a=frei\n`
    + `Ablehnen: https://lakatosbandi.com/api/versusforge-freigabe?m=${m}&s=${s}&a=abgelehnt`,
  );
}

export async function anmeldeAlarm(o: {
  /** Der Name, den er für seinen Betrieb / sich als Künstler genannt hat. */
  betrieb: string;
  /** Die Kennung seiner Seite — `lakatosbandi.com/<kennung>`. */
  kennung: string;
  mail: string;
  sprache: string;
  hook: string;
  /** Der Stil, in dem er aufgenommen wurde. Leer, wenn das Rezept keine Aufnahme kennt. */
  stil: string;
  /** Wie viele Bilder der Agent im Gespräch gesehen hat. */
  bilder: number;
}): Promise<boolean> {
  const an = (process.env.VERSUSFORGE_ALARM_MAIL ?? process.env.VERSUSFORGE_MAIL ?? process.env.VERSUSFORGE_SMTP_USER ?? "").trim();
  if (!an) {
    console.error("[versusforge-anmeldung] Kein Empfänger gesetzt (VERSUSFORGE_ALARM_MAIL/VERSUSFORGE_MAIL) — neuer Künstler steht nur in der Anfragenliste.");
    return false;
  }

  const schluessel = (process.env.VERSUSFORGE_DASHBOARD_KEY ?? "").trim();
  const anfragen = schluessel
    /* Alles auf lakatosbandi.com (Owner 11.09.2026: „nicht auf VersusForge") — dieselben Routen, anderer Host. */
    ? `https://lakatosbandi.com/engine/anfragen?m=${encodeURIComponent(EIGENER_MANDANT)}&s=${encodeURIComponent(schluessel)}`
    : "";
  /* Künstler liegen nur auf lakatosbandi.com (Owner 10.09.2026). */
  /* Mit Admin-Schlüssel: die ganze Seite mit allen Bildern, auch wenn Käufer sie (noch) nicht sehen (Owner 11.09.2026). */
  const seite = `${kuenstlerUrl(o.kennung)}${schluessel ? `?s=${encodeURIComponent(schluessel)}` : ""}`;

  const schutz = (s: string) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* Roh wie der Rückruf-Alarm: Das liest ein Mensch zwischendurch — nur was er wissen muss. */
  const html = [
    `<p style="margin:0 0 4px;font-size:18px"><b>${schutz(o.betrieb)}</b> — <a href="mailto:${schutz(o.mail)}">${schutz(o.mail)}</a></p>`,
    `<p style="margin:0 0 14px;color:#5b666f">${o.stil ? `Stil: ${schutz(o.stil)} · ` : ""}${o.bilder} Bild${o.bilder === 1 ? "" : "er"} gezeigt · Sprache: ${schutz(o.sprache)}</p>`,
    o.hook ? `<p style="margin:0 0 14px"><b>Sein Satz:</b> ${schutz(o.hook)}</p>` : "",
    `<p style="margin:0 0 6px"><a href="${seite}">Seine Seite ansehen</a></p>`,
    /* FREIGEBEN · ABLEHNEN (Owner 10.09.2026, Variante B). Die Links öffnen nur eine
       Bestätigungsseite — erst deren Knopf entscheidet (Begründung in der Freigabe-Route). */
    schluessel
      /**
       * ── WIEDER „FREIGEBEN · ABLEHNEN" (Owner 14.09.2026: „jemand kann hier pornografie posten
       * und geht sofort online" · „ich muss es freigeben") ──────────────────────────────────────
       *
       * Hier stand seit dem 11.09.2026 „Seine Seite ist schon online" mit nur einem Link zum
       * Offline-Nehmen. Das passte, solange der Owner die Künstler einzeln einlud. Seit der
       * Trichter offen in einer Anzeige steht, ist es doppelt falsch: Die Seite ist NICHT mehr
       * automatisch online (siehe `portal/bestaetigen` und `api/portal-behalten`), und der Owner
       * soll entscheiden, statt hinterherzuräumen.
       *
       * DIE LINKS ÖFFNEN NUR EINE BESTÄTIGUNGSSEITE — erst deren Knopf wirkt. Begründung in der
       * Freigabe-Route: Ein Klick aus einer Mail passiert zu leicht versehentlich, und
       * Mailprogramme rufen Links beim Vorschauen von selbst auf.
       */
      ? `<p style="margin:14px 0 6px;color:#b26a00"><b>Noch nicht öffentlich — wartet auf dich.</b></p>`
        + `<p style="margin:0 0 6px;font-size:17px">`
        + `<a href="https://lakatosbandi.com/api/versusforge-freigabe?m=${encodeURIComponent(o.kennung)}&s=${encodeURIComponent(schluessel)}&a=frei"><b>Freigeben</b></a>`
        + ` &nbsp;·&nbsp; `
        + `<a href="https://lakatosbandi.com/api/versusforge-freigabe?m=${encodeURIComponent(o.kennung)}&s=${encodeURIComponent(schluessel)}&a=abgelehnt">Ablehnen</a>`
        + `</p>`
      : `<p style="margin:14px 0 6px;color:#b3261e">Freigabe-Links fehlen: VERSUSFORGE_DASHBOARD_KEY ist nicht gesetzt.</p>`,
    anfragen ? `<p style="margin:0"><a href="${anfragen}">Zur Anfragenliste</a></p>` : "",
  ].join("");

  const res = await sendEmail({
    konto: "versusforge",
    to: an,
    subject: `NEUER KÜNSTLER: ${o.betrieb}${o.stil ? ` · ${o.stil}` : ""}`,
    html,
  });
  if (!res.ok) console.error("[versusforge-anmeldung] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
