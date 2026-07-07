"use client";

import { useEffect, useRef } from "react";

// Fire-and-forget page-view event for the admin Insights funnel (e.g. the
// recruiting flow: become-a-model → apply form → application submitted).
// Admin/preview sessions are flagged internal so they never count.
export default function TrackView({ event }: { event: string }) {
  const fired = useRef(false); // StrictMode double-invokes effects in dev
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    let utmSource = "", referrer = "", visitor = "", internal = false;
    try {
      const sp = new URLSearchParams(window.location.search);
      utmSource = sp.get("utm_source") || sp.get("source") || sp.get("ref") || "";
      referrer = document.referrer || "";
      const cur = JSON.parse(localStorage.getItem("lb_curator") ?? "{}");
      visitor = cur?.firstName ? `${cur.firstName}${cur.lastName ? " " + cur.lastName : ""}` : "";
      internal = !!localStorage.getItem("luxurybandit-try-look-admin-pin") && localStorage.getItem("lb_preview_model") !== "1";
    } catch { /**/ }
    fetch("/api/try-this-look", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "event", event, lookId: "recruiting", lookName: "Recruiting", utmSource, referrer, visitor, internal }),
    }).catch(() => {});
  }, [event]);
  return null;
}
