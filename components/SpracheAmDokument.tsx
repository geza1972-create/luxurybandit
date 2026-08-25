"use client";

import { useEffect } from "react";

/**
 * `<html lang>` NACHZIEHEN, WO DIE SEITE EINE ANDERE RÜCKFALL-SPRACHE HAT (Owner
 * 25.08.2026: „default Rumänisch ab jetzt bei der Bewerbung").
 *
 * Das Wurzel-Layout setzt `lang` einmal für das ganze Portal — es kann nicht wissen, dass
 * die Bewerbungs-Seiten im Zweifel Rumänisch zeigen statt Englisch. Ohne diese Zeile stünde
 * rumänischer Text in einem Dokument, das sich als englisch ausgibt: Google indexiert es
 * falsch, und Vorlese-Programme sprechen es mit englischer Aussprache.
 *
 * Bewusst ein Effekt und kein zweites Layout: Ein verschachteltes Layout in Next.js kann
 * `<html>` nicht anfassen.
 */
export default function SpracheAmDokument({ lang }: { lang: string }) {
  useEffect(() => {
    if (lang && document.documentElement.lang !== lang) document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
