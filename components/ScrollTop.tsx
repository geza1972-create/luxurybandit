"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Jede neue Seite startet OBEN. Next scrollt bei einem Routenwechsel zwar selbst
 * nach oben, aber nicht zuverlässig, wenn der Inhalt in `.lb-frame` (transform)
 * steckt oder ein eigener Container scrollt — dann öffnet ein Thema mitten im Text.
 * Deshalb hier hart: bei jedem Pfad-/Query-Wechsel Fenster UND scrollbare Rahmen
 * auf 0 setzen.
 */
export default function ScrollTop() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString();

  useEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelector(".lb-frame")?.scrollTo?.(0, 0);
    } catch { /**/ }
  }, [pathname, search]);

  return null;
}
