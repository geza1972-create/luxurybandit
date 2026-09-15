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
export function schrittMessen(mandant: string, stufe: string, werk?: string): void {
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
    /**
     * ── WOHER ER KAM (Owner 15.09.2026: „ja, keine ahnung woher") ────────────────────────────
     *
     * Am 15.09. kamen 141 Besucher und EINER lud etwas hoch — und niemand konnte sagen, ob das
     * dieselben Leute sind wie am 13.09. (19 von 310) oder ein ganz anderer Strom, weil das
     * Werbekonto deaktiviert war. Ohne Herkunft lässt sich eine Quote nicht mit einer anderen
     * vergleichen; man rät.
     *
     * NUR DAS GROBE: die Domain, von der er kam, und die Werbe-Merker aus der Adresse. KEINE
     * ganze Adresse, keine Kennung, keine Suchbegriffe — die Zeile soll sagen „Facebook" oder
     * „Google", nicht, wer er ist.
     */
    let quelle = "";
    try {
      const von = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      const p = new URLSearchParams(window.location.search);
      const merker = ["utm_source", "fbclid", "gclid"].find(k => p.get(k));
      const wert = merker === "utm_source" ? String(p.get("utm_source") ?? "").slice(0, 24) : merker ? merker.replace("clid", "") : "";
      quelle = [von && von !== window.location.hostname ? von : "", wert].filter(Boolean).join("|").slice(0, 60) || (von ? "direkt" : "direkt");
    } catch { /* Herkunft ist Beiwerk — nie ein Grund, die Messung ausfallen zu lassen */ }
    void fetch("/api/versusforge-schritt", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      /* `werk`: bei „Da, mă interesează această lucrare" — welches Werk ihn interessiert (Owner 11.09.2026). */
      body: JSON.stringify({ mandant, besucher, stufe, ...(werk !== undefined ? { werk } : {}), ...(quelle ? { quelle } : {}) }),
    }).catch(() => {});
  } catch { /* nie den Trichter aufhalten */ }
}
