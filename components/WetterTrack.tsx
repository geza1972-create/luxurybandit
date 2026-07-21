"use client";

import { useEffect } from "react";

// Zählt einen Seitenaufruf von /wetter/<model> — EINMAL pro Sitzung, und NICHT für den
// Admin (dessen eigene Besuche sollen die Zahl nicht verfälschen). Feuert im Hintergrund.
export default function WetterTrack({ modelId }: { modelId: string }) {
  useEffect(() => {
    try {
      if (localStorage.getItem("luxurybandit-try-look-admin-pin")) return;   // Admin nicht zählen
      const key = `lb_wetter_viewed_${modelId}`;
      if (sessionStorage.getItem(key)) return;                                // einmal pro Sitzung
      sessionStorage.setItem(key, "1");
    } catch { return; }
    fetch("/api/wetter-stats", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, kind: "view" }),
    }).catch(() => {});
  }, [modelId]);
  return null;
}
