"use client";

import { useEffect } from "react";
import { logFunnelEvent } from "@/lib/track-funnel";

/**
 * BESUCHER-ZÄHLUNG (Owner 27.08.2026: „ich will sehen, wie viele Leute drauf klicken und
 * von wo") — nutzt dieselbe Insights-Pipeline wie jeder andere Trichter im Haus
 * (`lib/track-funnel.ts`): Geräte-Kennung, `?src=`/`utm_source` als Quelle, sichtbar im
 * Admin unter Insights unter `theme: "cv-portfolio"`. Kein neues System, nur ein neuer
 * `theme`-Wert.
 */
export default function PageView() {
  useEffect(() => {
    void logFunnelEvent("funnel_started", { theme: "cv-portfolio" });
  }, []);
  return null;
}
