import { sendSms, smsConfigured } from "@/lib/sms-send";
import { sendWhatsApp } from "@/lib/whatsapp-send";

/**
 * ── EINE MELDUNG, WENN JEMAND EIN BILD ERZEUGT (Owner 18.09.2026: „ich muss leider eine SMS
 * bekommen wenn jemand was generiert") ──────────────────────────────────────────────────────
 *
 * ── WARUM ÜBERHAUPT ─────────────────────────────────────────────────────────────────────────
 *
 * „You as a picture" läuft ohne Kasse und kostet uns rund 16,5 Cent je Lauf. Solange das so
 * ist, ist jede Erzeugung eine Ausgabe, von der sonst niemand etwas erfährt — der Owner will
 * sie auf dem Telefon sehen, nicht abends in einer Abrechnung.
 *
 * ── WARUM NICHT NUR SMS ─────────────────────────────────────────────────────────────────────
 *
 * `lib/sms-send.ts` steht seit Langem im Haus, aber es gibt KEIN Twilio-Konto (`TWILIO_*` ist
 * nirgends gesetzt, geprüft am 18.09.2026). Eine Meldung, die niemand bekommt, ist schlimmer
 * als keine: Man verlässt sich darauf. Deshalb nimmt dieser Melder SMS, SOBALD Twilio
 * eingerichtet ist, und bis dahin WhatsApp — denselben Weg, über den schon die Rückruf-
 * Meldung geht ([[versusforge-uebergabe-10-09]]).
 *
 * ── ES DARF NIE EINEN LAUF KOSTEN ───────────────────────────────────────────────────────────
 *
 * Kein `await` beim Aufrufer, kein Werfen, kein Rückgabewert, auf den jemand wartet. Hängt der
 * Melder, wartet sonst der Kunde vor einem fertigen Bild ([[immer-close-einbauen]]).
 *
 * ── UND KEINE PERSONENDATEN ─────────────────────────────────────────────────────────────────
 *
 * In der Meldung stehen Künstler, Werk und die laufende Zahl des Geräts. Keine E-Mail, keine
 * Gerätekennung im Klartext, kein Bild — das gehört ins Dashboard, nicht auf ein Telefon.
 */
export function kunstMelden(o: { mandant: string; werk: string }): void {
  const text = [
    "lakatosbandi: bezahltes Bild erzeugt (1 EUR)",
    `Kuenstler: ${o.mandant}`,
    `Werk: ${o.werk}`,
  ].join(" — ");

  void (async () => {
    try {
      const nummer = process.env.ADMIN_SMS_PHONE?.trim();
      if (smsConfigured() && nummer) {
        const r = await sendSms({ to: nummer, body: text });
        if (r.ok) return;
        console.warn(`[kunst/melden] SMS fehlgeschlagen: ${r.error ?? ""}`);
      }
      await sendWhatsApp(text);
    } catch { /* eine Meldung darf nie etwas kosten */ }
  })();
}
