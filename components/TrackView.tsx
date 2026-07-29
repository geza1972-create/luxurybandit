"use client";

import { useEffect, useRef } from "react";
import { logFunnelEvent } from "@/lib/track-funnel";

// Fire-and-forget page-view event for the admin Insights funnel.
//
// Am 29.07.2026 auf logFunnelEvent umgestellt, statt den fetch hier zu wiederholen. Die
// Kopie hier trug dieselben drei Messfehler wie der andere Logger (keine Geräte-Kennung,
// `?src=` ignoriert, localhost zählte als echter Besucher) — und einen vierten: `lookId`
// und `lookName` waren fest auf „recruiting"/„Recruiting" verdrahtet, also erschien JEDE
// Seite mit TrackView in der Auswertung als Recruiting-Seite. Beides ist jetzt setzbar,
// mit den alten Werten als Vorgabe, damit bestehende Aufrufe sich nicht ändern.
export default function TrackView({
  event,
  lookId = "recruiting",
  lookName = "Recruiting",
}: {
  event: string;
  lookId?: string;
  lookName?: string;
}) {
  const fired = useRef(false); // StrictMode double-invokes effects in dev
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // Angemeldeter Name, falls bekannt — sonst zählt der Besucher als Gast.
    let visitor = "";
    try {
      const cur = JSON.parse(localStorage.getItem("lb_curator") ?? "{}");
      visitor = cur?.firstName ? `${cur.firstName}${cur.lastName ? " " + cur.lastName : ""}` : "";
    } catch { /**/ }
    void logFunnelEvent(event, { lookId, lookName, ...(visitor ? { visitor } : {}) });
  }, [event, lookId, lookName]);
  return null;
}
