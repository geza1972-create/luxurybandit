import crypto from "crypto";

/**
 * DIE CONVERSIONS API — DER KAUF VOM SERVER AUS GEMELDET (15.08.2026).
 *
 * WARUM ES SIE BRAUCHT: Bisher meldete NUR der Browser den Kauf (`trackMetaPixel`). Der
 * Browser ist aber der unzuverlässigste Bote, den wir haben — Werbeblocker, iOS/ITP, ein
 * abgebrochenes Skript oder schlicht ein Kunde, der das Kassen-Fenster schliesst, und die
 * Meldung kommt nie an. Gemessen an anderen Häusern sind das 20–40 % der Käufe. Die
 * Anzeigenauslieferung optimiert dann auf eine Zahl, die kleiner ist als die Wirklichkeit.
 *
 * Der Stripe-Webhook dagegen weiss SICHER, dass bezahlt wurde — er ist genau dafür da
 * (Memory `paid-jobs-must-survive-the-browser`). Von dort geht der Kauf direkt an Meta.
 *
 * WAS SIE NICHT TUT: Sie ersetzt KEINE Einwilligung. Wer den Cookie-Streifen ablehnt, darf
 * auch hier nicht gemeldet werden — die API repariert die technischen Verluste, nicht die
 * rechtlichen. Deshalb steht die Einwilligung als Bedingung im Aufrufer, nicht hier.
 *
 * ENTDOPPLUNG: Browser und Server melden denselben Kauf. Meta wirft beide zusammen, wenn
 * `event_id` übereinstimmt — wir nehmen die STRIPE-SITZUNGSKENNUNG, weil beide Seiten sie
 * kennen: der Trichter als `start.sessionId`, der Webhook als `session.id`. Ohne diesen
 * gemeinsamen Schlüssel zählte Meta jeden Kauf zweimal, und wir hätten den Fehler, den wir
 * heute früh im Pixel gerade erst ausgebaut haben, an anderer Stelle neu gebaut.
 */

const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID || "2587056621709307").trim();
const CAPI_TOKEN = (process.env.META_CAPI_TOKEN || "").trim();

/** Meta will personenbezogene Felder als SHA-256 über den normalisierten Wert. */
function hash(wert: string): string {
  return crypto.createHash("sha256").update(wert.trim().toLowerCase()).digest("hex");
}

export type CapiKauf = {
  /** Die Stripe-Sitzungskennung — MUSS dieselbe sein, die der Browser als eventID sendet. */
  eventId: string;
  /** E-Mail des Käufers; wird gehasht. Ohne sie ist die Zuordnung deutlich schwächer. */
  email?: string;
  /** Betrag in Cent, wie Stripe ihn abgerechnet hat (nach Rabatt). */
  cents?: number;
  /** Das Thema/Produkt — landet als `content_name`, wie beim Browser-Pixel. */
  produkt?: string;
  /** Die Seite, auf der gekauft wurde; Meta verlangt sie bei `action_source: "website"`. */
  quelle?: string;
};

/**
 * Meldet EINEN Kauf. Wirft nie — ein fehlgeschlagener Bericht darf niemals die Auslieferung
 * eines bezahlten Auftrags aufhalten (dieselbe Regel wie bei jedem anderen Nebenweg im
 * Webhook). Ohne Token passiert schlicht nichts, damit die Entwicklungsumgebung ruhig bleibt.
 */
export async function capiKaufMelden(k: CapiKauf): Promise<"gesendet" | "kein-token" | "fehler"> {
  if (!CAPI_TOKEN) return "kein-token";
  try {
    const nutzer: Record<string, string[]> = {};
    if (k.email) nutzer.em = [hash(k.email)];

    const antwort = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: CAPI_TOKEN,
        data: [{
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: k.eventId,
          action_source: "website",
          ...(k.quelle ? { event_source_url: k.quelle } : {}),
          user_data: nutzer,
          custom_data: {
            ...(k.produkt ? { content_name: k.produkt } : {}),
            ...(k.cents && k.cents > 0 ? { value: k.cents / 100, currency: "EUR" } : {}),
          },
        }],
      }),
    });

    if (!antwort.ok) {
      console.warn(`[meta-capi] Meta antwortete ${antwort.status}: ${(await antwort.text()).slice(0, 300)}`);
      return "fehler";
    }
    return "gesendet";
  } catch (e) {
    console.warn("[meta-capi] Bericht fehlgeschlagen", e);
    return "fehler";
  }
}
