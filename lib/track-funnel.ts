// Client-side funnel event logger → the admin Insights event log (state.events).
// Mirrors the recruiting funnel's approach: admin/preview sessions are flagged
// `internal` so they never inflate the numbers, and utm_source is attached for
// per-source (instagram/facebook) attribution.
export function logFunnelEvent(event: string, extra: Record<string, string> = {}): void {
  if (typeof window === "undefined") return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const utmSource = sp.get("utm_source") || sp.get("source") || sp.get("ref") || "";
    const internal =
      !!localStorage.getItem("luxurybandit-try-look-admin-pin") &&
      localStorage.getItem("lb_preview_model") !== "1";
    fetch("/api/try-this-look", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "event", event, utmSource, referrer: document.referrer || "", internal, ...extra }),
    }).catch(() => {});
  } catch {
    /* never let analytics break the funnel */
  }
}
