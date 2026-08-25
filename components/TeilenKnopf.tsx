"use client";

import { useState } from "react";
import { Send, Check, Lock } from "lucide-react";
import { SymbolKnopf } from "@/components/CI";

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
  text, label, kopiertLabel, className = "", url: zielUrl, rund = false, kopf = false, gesperrt = false, onGesperrt, datei, dateiName,
}: {
  /** Was neben dem Link steht — z. B. „Ana & Mihai 💍". */
  text: string;
  label: string;
  kopiertLabel: string;
  className?: string;
  /**
   * Wohin der Link zeigt — z. B. `/themes/kiss?utm_source=share` (Owner 31.07.2026: „das
   * kann man auch sharen, damit die Leute Werbung machen können"). Ohne Angabe die aktuelle
   * Seite; mit `utm_source` sieht die Auswertung, dass der Besuch von einem Teilen kam.
   */
  url?: string;
  /** Als kleiner runder Knopf AUF einem Bild (wie der Ton-Knopf) statt als volle Pille. */
  rund?: boolean;
  /**
   * IN DER KOPFZEILE (Owner 25.08.2026: „was hast du hier schon wieder für ein Design
   * gemacht?") — die weisse Scheibe von `rund` ist für BILDER gemacht: dort muss sie sich
   * gegen jedes Motiv behaupten. In der dunklen Kopfzeile ist genau das der Fremdkörper,
   * ein weisser Teller zwischen zwei zurückhaltenden Chips. Diese Gestalt ist der
   * Haus-Kopfknopf (`SymbolKnopf`), derselbe wie Hell/Dunkel und Sprache daneben.
   */
  kopf?: boolean;
  /**
   * DIE GRATIS-LINIE (Owner 25.08.2026: „er kann das nicht sharen") — verschlossen öffnet
   * der Tipp die Erklärung statt der System-Auswahl. Der Knopf bleibt an seinem Platz:
   * Wer teilen WILL, ist genau der, der zahlt.
   */
  gesperrt?: boolean;
  onGesperrt?: () => void;
  /**
   * DIE DATEI SELBST TEILEN (Owner 01.08.2026: „auch das Bild soll er sharen können").
   *
   * Beim eigenen Ergebnis gibt es (noch) keine Werk-Seite — ein Link würde die Themenseite
   * verschicken statt seines Bildes. Die Web-Share-API kann stattdessen die DATEI übergeben:
   * WhatsApp bekommt das Foto oder Video selbst, wie aus der Galerie des Handys. Adresse
   * (auch data:) wird geholt und als Datei angeboten; kann das Gerät keine Dateien teilen,
   * fällt es auf den Link zurück.
   */
  datei?: string;
  dateiName?: string;
}) {
  const [kopiert, setKopiert] = useState(false);

  const teilen = async () => {
    // Die System-Auswahl braucht eine volle Adresse — ein relativer Pfad wird hier absolut.
    const url = zielUrl ? new URL(zielUrl, window.location.origin).toString() : window.location.href;
    if (datei) {
      try {
        const blob = await (await fetch(datei)).blob();
        const endung = blob.type.includes("video") ? "mp4" : "jpg";
        const file = new File([blob], `${dateiName || "luxurybandit"}.${endung}`, { type: blob.type || "image/jpeg" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text });
          return;
        }
      } catch { return; }   // abgebrochen ist kein Fehler, nur ein Nein
    }
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch { return; }   // abgebrochen ist kein Fehler, nur ein Nein
    try {
      await navigator.clipboard?.writeText(`${text} ${url}`);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2500);
    } catch { /* dann eben nicht */ }
  };

  if (kopf) {
    return (
      <SymbolKnopf onClick={() => { if (gesperrt) { onGesperrt?.(); return; } void teilen(); }}
        label={kopiert ? kopiertLabel : label} className={className}>
        {gesperrt ? <Lock className="h-4 w-4" /> : kopiert ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
      </SymbolKnopf>
    );
  }

  if (rund) {
    // Dieselbe weisse Scheibe wie Ton- und Loeschknopf, damit man ihn nicht suchen muss.
    return (
      <button type="button" onClick={() => void teilen()} aria-label={kopiert ? kopiertLabel : label}
        style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
        className={`grid h-10 w-10 place-items-center rounded-full transition active:scale-90 ${className}`}>
        {kopiert ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
      </button>
    );
  }

  return (
    <button type="button" onClick={() => void teilen()}
      className={`lb-karte-cta flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black transition active:scale-95 ${className}`}>
      {kopiert ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
      {kopiert ? kopiertLabel : label}
    </button>
  );
}
