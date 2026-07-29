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

    // Intern = Admin-Sitzung ODER die eigene Entwicklungsmaschine. Beides darf die
    // Besucherzahlen nicht aufblähen. Die Modell-Vorschau (`lb_preview_model`) ist bewusst
    // ausgenommen: damit sieht der Admin die Seite wie ein echter Besucher.
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
    const isAdmin =
      !!localStorage.getItem("luxurybandit-try-look-admin-pin") &&
      localStorage.getItem("lb_preview_model") !== "1";
    const internal = isAdmin || isLocal;

    return fetch("/api/try-this-look", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Returns the in-flight request so callers that fire two events back-to-back can AWAIT
      // the first — the event log is a last-write-wins blob, so concurrent writes clobber.
      body: JSON.stringify({ action: "event", event, utmSource, device, referrer: document.referrer || "", internal, ...extra }),
      keepalive: true, // events fired right before navigating away (to Stripe / login) still send
    }).then(() => {}).catch(() => {});
  } catch {
    /* never let analytics break the funnel */
    return Promise.resolve();
  }
}
