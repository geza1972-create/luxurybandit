"use client";

/**
 * DIE MESSUNG AUS DEM BROWSER — eine Zeile für beide Trichter.
 *
 * DIESELBE GERÄTEKENNUNG WIE DAS GANZE HAUS (`lb_visitor`, siehe `logFunnelEvent` in
 * lib/track-funnel.ts): Ein Mensch, der erst die Startseite und später den Trichter eines
 * Mandanten öffnet, ist derselbe Besucher. Eine zweite Kennung wäre eine zweite Wahrheit.
 *
 * SIE WARTET NICHT UND SIE WIRFT NICHT. Der Aufruf läuft nebenher; scheitert er, merkt das
 * niemand ausser dem Log. Eine Messung, die einen Trichter aufhalten kann, ist ein Risiko
 * ohne Gegenwert.
 *
 * `keepalive` ist der Grund, warum „Seite gesehen" überhaupt ankommt: Wer sofort
 * weiterklickt, bricht sonst die eigene Zählung ab — und ausgerechnet die schnellen
 * Abbrecher sind die, die er sehen will.
 */
export function schrittMessen(mandant: string, stufe: string): void {
  if (typeof window === "undefined") return;
  try {
    let besucher = "";
    try {
      besucher = localStorage.getItem("lb_visitor") ?? "";
      if (!besucher) {
        besucher = crypto.randomUUID?.() ?? `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
        localStorage.setItem("lb_visitor", besucher);
      }
    } catch {
      /* Privater Modus: dann gibt es keine Kennung und damit keine Messung. Lieber gar
         nichts zählen als jeden Aufruf als neuen Menschen — das machte aus zehn Besuchen
         eines Zweiflers zehn Abbrecher. */
      return;
    }
    void fetch("/api/versusforge-schritt", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mandant, besucher, stufe }),
    }).catch(() => {});
  } catch { /* nie den Trichter aufhalten */ }
}
