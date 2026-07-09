"use client";

import { useEffect } from "react";

// Counts a SITE visit once per browser session (per day) — a person who lands on the app
// from an ad but never opens a video reel would otherwise be invisible in Insights. The
// admin's own session is excluded (internal) so it doesn't inflate the number.
export default function VisitTracker() {
  useEffect(() => {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const key = `lb_visit_${day}`;
      if (sessionStorage.getItem(key)) return; // already counted this session today
      sessionStorage.setItem(key, "1");
      const internal = (() => { try { return !!localStorage.getItem("luxurybandit-try-look-admin-pin"); } catch { return false; } })();
      fetch("/api/try-this-look", {
        method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visit", internal }),
      }).catch(() => {});
    } catch { /**/ }
  }, []);
  return null;
}
