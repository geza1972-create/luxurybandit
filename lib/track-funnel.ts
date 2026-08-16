// Client-side funnel event logger → the admin Insights event log (state.events).
//
// MESSFEHLER, behoben am 29.07.2026 (Owner: „wieviel Besucher hatte ich bis jetzt?" —
// die Frage war aus den Daten nicht zu beantworten):
//
//   1. Es wurde KEINE Geräte-Kennung mitgeschickt. 385 von 386 Ereignissen hatten keine,
//      also ließ sich nur zählen, wie oft geklickt wurde — nie, von wie vielen Menschen.
//      Jetzt reist `device` mit: dieselbe `lb_visitor`-Kennung, die auch der Chat und
//      „My Gallery" benutzen. Dadurch lassen sich Ereignisse und Gespräche demselben
//      Besucher zuordnen.
//   2. Der Anzeigen-Parameter `?src=…` wurde ignoriert. Genau den benutzen die laufenden
//      Facebook-Anzeigen (`&src=fb`) — die Herkunft dieser Besucher ging also verloren.
//   3. Die eigene Entwicklungsmaschine lief als echter Besucher mit. Localhost gilt jetzt
//      als intern, wie eine Admin-Sitzung.
import { trackMetaPixel } from "@/lib/meta-pixel";
import { geschenkPreisCents } from "@/lib/pricing";

/**
 * DIE NORMIERTE EVENT-FAMILIE (Owner-Architektur-Abgleich 12.08.2026, §32): ALLE Tunnel-
 * Produkte sollen dieselben sieben Stufen melden, damit sich Insights je Produkt VERGLEICHEN
 * lassen — bisher meldete jeder Trichter eigene Namen (`funnel_1`, `yiv_pay_click`,
 * `checkout_start` …), keine zwei Produkte waren gegeneinander auswertbar.
 *
 * Die sieben Stufen, in der Reihenfolge, in der ein Kunde sie durchläuft:
 *   funnel_started       Tunnel-Seite geladen (TunnelSeite, einmal je Besuch)
 *   lead_created         TunnelStart-„Weiter" erfolgreich (Name+E-Mail bestätigt)
 *   step_completed        Schrittwechsel im Tunnel (mit Schritt-Nummer)
 *   checkout_started      Kaufknopf gedrückt
 *   payment_completed     bezahlt — aus Guthaben ODER Stripe
 *   generation_started    der Erzeugungs-Lauf beim Anbieter beginnt
 *   result_viewed         das Ergebnis (Bild/Video) steht auf dem Schirm
 *
 * BESTEHENDE EVENTS BLEIBEN — die Insights-Auswertung hängt an ihnen (Owner-Regel: nichts
 * entfernen, was schon gemessen wird). Diese Familie kommt ZUSAETZLICH dazu, nicht als
 * Ersatz. Property immer `theme` (= das Produkt, `kiss`/`wedding`/`versprechen`/…) — dieselbe
 * Kennung, die auch `lib/geschenke.ts` und `lib/pricing.ts` für ein Produkt benutzen.
 *
 * NACHTRAG 13.08.2026 (Owner-Master-Auftrag §32, „die Familie vervollständigen" — vorher
 * fehlten Stufen ZWISCHEN den sieben oben, dadurch blieben Fragen wie „welche Vorlage wird
 * am meisten gewählt" oder „wie viele brechen die Aufnahme ab" unbeantwortbar):
 *   look_selected           Schritt 2 („Weiter" nach der Vorlagen-/Szenen-Wahl) — mit
 *                            `lookId`, der gewählten Vorlage/Szene/dem gewählten Set
 *   video_recorded          die eigene Aufnahme wurde ANGENOMMEN (nicht bei „zu kurz"/„leer")
 *   generation_completed     der fertige Film liegt am Auftrag — Gegenstück zu
 *                            `generation_started`, damit sich die Warte-/Ausfallzeit misst
 *   program_started          das Future-Self-Programm wurde angelegt/aktiviert
 *   daily_action_completed   ein Tages-Haken der 30-Tage-Checkliste wurde gesetzt, mit `day`
 *   program_completed        der letzte Tag des Programms ist abgehakt
 * Diese sechs sind ZUSAETZLICH zu den sieben oben — auch hier gilt: nichts umbenennen, nichts
 * entfernen, nur ergänzen.
 */
export type TunnelEvent =
  | "funnel_started" | "lead_created" | "step_completed" | "checkout_started"
  | "payment_completed" | "generation_started" | "result_viewed"
  | "look_selected" | "video_recorded" | "generation_completed"
  | "program_started" | "daily_action_completed" | "program_completed";

// Intern = Admin-Sitzung ODER die eigene Entwicklungsmaschine. Beides darf weder die
// Besucherzahlen aufblähen noch beim Meta-Pixel als Kauf ankommen. Die Modell-Vorschau
// (`lb_preview_model`) ist bewusst ausgenommen: damit sieht der Admin die Seite wie ein
// echter Besucher.
function isInternalSession(): boolean {
  try {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
    const isAdmin =
      !!localStorage.getItem("luxurybandit-try-look-admin-pin") &&
      localStorage.getItem("lb_preview_model") !== "1";
    return isAdmin || isLocal;
  } catch { return false; }
}

/**
 * Dieselben Stufen NOCHMAL an das Meta-Pixel, unter Metas Standardnamen (14.08.2026).
 * Vorher meldete die Seite Meta nur `PageView` — die Anzeigenauslieferung konnte also auf
 * nichts optimieren, was Geld bringt, und im Werbeanzeigenmanager stand bei „Ergebnisse"
 * nichts als Klicks. Hier steht die Zuordnung EINMAL für alle Produkte; wer einen neuen
 * Tunnel baut, bekommt sie geschenkt, sobald er `logTunnelEvent` benutzt.
 */
const PIXEL_EVENT: Partial<Record<TunnelEvent, string>> = {
  lead_created: "Lead",
  checkout_started: "InitiateCheckout",
  payment_completed: "Purchase",
};

export function logTunnelEvent(event: TunnelEvent, theme: string, extra: Record<string, string> = {}): Promise<void> {
  const pixelEvent = PIXEL_EVENT[event];
  if (pixelEvent && typeof window !== "undefined" && !isInternalSession()) {
    // Betrag NUR aus der Preistabelle (Memory `prices-only-from-pricing-table`) — ohne
    // `value`/`currency` kann Meta keinen ROAS rechnen und warnt im Events Manager.
    const cents = geschenkPreisCents(theme);
    /**
     * `extra.eventId` ist die STRIPE-SITZUNGSKENNUNG (15.08.2026). Der Webhook meldet
     * denselben Kauf ueber die Conversions API mit genau dieser Kennung als `event_id`;
     * Meta legt beide zu EINEM Kauf zusammen. Wer vom Guthaben zahlt, hat keine Stripe-
     * Sitzung — dort bleibt das Feld leer, und das ist richtig so: Diesen Kauf meldet nur
     * der Browser, es gibt also nichts zu entdoppeln.
     */
    trackMetaPixel(pixelEvent, {
      content_name: theme,
      ...(cents > 0 ? { value: cents / 100, currency: "EUR" } : {}),
    }, extra.eventId || undefined);
  }
  return logFunnelEvent(event, { theme, produkt: theme, ...extra });
}

export function logFunnelEvent(event: string, extra: Record<string, string> = {}): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  try {
    const sp = new URLSearchParams(window.location.search);
    // `src` ergänzt (Owner-Anzeigen nutzen &src=fb) — sonst blieb die Quelle leer.
    const utmSource = sp.get("utm_source") || sp.get("source") || sp.get("src") || sp.get("ref") || "";

    // Geräte-Kennung: dieselbe wie im Chat und in „My Gallery", damit ein Mensch über alle
    // Bereiche hinweg EINE Kennung hat. Wird angelegt, falls sie noch fehlt.
    let device = "";
    try {
      device = localStorage.getItem("lb_visitor") ?? "";
      if (!device) {
        device = crypto.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
        localStorage.setItem("lb_visitor", device);
      }
    } catch { /* privater Modus: dann eben ohne Kennung, das darf nichts kaputtmachen */ }

    const internal = isInternalSession();

    return fetch("/api/try-this-look", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Returns the in-flight request so callers that fire two events back-to-back can AWAIT
      // the first — the event log is a last-write-wins blob, so concurrent writes clobber.
      /* `vorlage` aus der Adresszeile (Owner 16.08.2026): Sie steht dort ab der Wahl an JEDER
         folgenden Stufe — damit trägt jedes Ereignis die gewählte Vorlage, ohne dass ein
         Aufrufer sie durchreichen muss. Ein ausdrücklich übergebener Wert in `extra` sticht
         (deshalb steht `...extra` dahinter). */
      body: JSON.stringify({ action: "event", event, utmSource, vorlage: sp.get("v") || "", device, referrer: document.referrer || "", internal, ...extra }),
      keepalive: true, // events fired right before navigating away (to Stripe / login) still send
    }).then(() => {}).catch(() => {});
  } catch {
    /* never let analytics break the funnel */
    return Promise.resolve();
  }
}
