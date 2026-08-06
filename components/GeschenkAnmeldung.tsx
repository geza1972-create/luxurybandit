"use client";

import { useEffect } from "react";

/**
 * DER STILLE LOGIN AUS DER GESCHENK-MAIL (Owner 06.08.2026: „Kann er draufklicken und ist
 * sofort angemeldet? … und sein Credit ist geladen?").
 *
 * Rendert NICHTS — hinterlegt nur die Adresse des Beschenkten als Geräte-Login
 * (`lb_kiss_mail`, der erste Schlüssel, den `geraetAdresse()` liest). Danach zeigt der
 * Guthaben-Chip im Kopf sein Geschenk, und jede Themenseite füllt seine Adresse vor und
 * zahlt aus dem Guthaben.
 *
 * Die Server-Seite rendert diesen Baustein AUSSCHLIESSLICH hinter der geprüften Unterschrift
 * aus der Empfänger-Mail (`lib/einloese-token`) — nie für den nackten Karten-Link. Eine
 * VORHANDENE Anmeldung wird nicht überschrieben: Wer auf diesem Gerät schon ein Konto
 * benutzt, soll durch eine fremde Karte nicht still umgemeldet werden.
 */
export default function GeschenkAnmeldung({ adresse }: { adresse: string }) {
  useEffect(() => {
    const a = adresse.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) return;
    try {
      const schon = (localStorage.getItem("lb_kiss_mail") ?? "").trim();
      if (!schon) localStorage.setItem("lb_kiss_mail", a);
    } catch { /* privater Modus — dann tippt er die Adresse eben selbst */ }
  }, [adresse]);
  return null;
}
