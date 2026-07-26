"use client";

import { useEffect } from "react";

// Zählt einen Seitenaufruf von /wetter/<model> — EINMAL pro Sitzung, und NICHT für den
// Admin (dessen eigene Besuche sollen die Zahl nicht verfälschen). Feuert im Hintergrund.
// Ist ein Abonnent bekannt (subId aus dem Link ?s=), wird zusätzlich pro Person geloggt,
// dass er seinen Link (E-Mail/WhatsApp) GEÖFFNET hat (einmal pro Sitzung je Person).
export default function WetterTrack({ modelId, subId = "", src = "" }: { modelId: string; subId?: string; src?: string }) {
  useEffect(() => {
    let isAdmin = false;
    try { isAdmin = !!localStorage.getItem("luxurybandit-try-look-admin-pin"); } catch { /**/ }
    if (isAdmin) return;   // Admin verfälscht weder Aufrufe noch Klicks

    // Aggregierter Aufruf (einmal pro Sitzung).
    try {
      const key = `lb_wetter_viewed_${modelId}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        fetch("/api/wetter-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, kind: "view" }) }).catch(() => {});
      }
    } catch { /**/ }

    // Pro-Person-Klick (einmal pro Sitzung je Abonnent).
    if (subId) {
      try {
        const ckey = `lb_wetter_click_${modelId}_${subId}`;
        if (!sessionStorage.getItem(ckey)) {
          sessionStorage.setItem(ckey, "1");
          fetch("/api/wetter-stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId, kind: "click", subId, src }) }).catch(() => {});
        }
      } catch { /**/ }
    }
  }, [modelId, subId, src]);
  return null;
}
