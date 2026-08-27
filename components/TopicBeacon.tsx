"use client";

import { useEffect, useRef } from "react";
import { logFunnelEvent } from "@/lib/track-funnel";

/**
 * `topic_page_view` (Owner-Auftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
 * Baustelle H/I) — feuert EINMAL beim Laden einer Zielgruppen-Seite (`/topics/<slug>`,
 * ein Server-Bauteil ohne eigene Client-Logik). `topic` reist danach automatisch mit
 * jedem weiteren Ereignis mit, sobald der CTA in den Trichter mit `?topic=<slug>`
 * führt (siehe `HERKUNFT` in `components/TunnelSeite.tsx`) — hier auf der Landingpage
 * selbst gibt es aber noch keine Adresszeile mit `?topic=`, deshalb wird der Slug
 * ausdrücklich übergeben.
 */
export default function TopicBeacon({ slug }: { slug: string }) {
  const gemeldet = useRef(false);
  useEffect(() => {
    if (gemeldet.current) return;
    gemeldet.current = true;
    void logFunnelEvent("topic_page_view", { theme: "lebenslauf", topic: slug });
  }, [slug]);
  return null;
}
