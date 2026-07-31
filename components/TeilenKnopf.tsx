"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";

/**
 * TEILEN ÜBER DAS HANDY — ein Knopf, überall derselbe.
 *
 * Owner 31.07.2026: „wo kann ich das jetzt versenden? sharen?" — auf der Beispiel-Einladung
 * gab es keinen Weg, sie herzuzeigen.
 *
 * Bewusst die Systemauswahl des Geräts und keine feste App (Owner: „wir machen nur share, die
 * Leute schicken das eh übers Handy"). Sie kennt WhatsApp, Signal, SMS, Mail und was sonst
 * installiert ist — und sie kennt es besser als wir.
 *
 * Am Rechner gibt es sie nicht; dort landet der Link in der Zwischenablage und der Knopf sagt
 * es. Ohne diesen Rückfall stünde auf jedem Schreibtisch-Browser ein toter Knopf.
 */
export default function TeilenKnopf({
  text, label, kopiertLabel, className = "",
}: {
  /** Was neben dem Link steht — z. B. „Ana & Mihai 💍". */
  text: string;
  label: string;
  kopiertLabel: string;
  className?: string;
}) {
  const [kopiert, setKopiert] = useState(false);

  const teilen = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch { return; }   // abgebrochen ist kein Fehler, nur ein Nein
    try {
      await navigator.clipboard?.writeText(`${text} ${url}`);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch { /* dann eben nicht */ }
  };

  return (
    <button type="button" onClick={() => void teilen()}
      className={`lb-karte-cta flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black transition active:scale-95 ${className}`}>
      {kopiert ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
      {kopiert ? kopiertLabel : label}
    </button>
  );
}
