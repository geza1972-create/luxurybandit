"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";

/**
 * SEINE SEITE WEITERGEBEN (Owner 13.09.2026: „Künstlerseiten müssen noch einen Share-Button
 * haben").
 *
 * ── WER TEILT, IST SCHON ÜBERZEUGT ──────────────────────────────────────────────────────────
 *
 * Deshalb steht er als dritter und leisester neben „Sprich mit dem Agenten" (gefüllt) und
 * „Follow" (umrandet): Ein lauter Teilen-Knopf nähme dem Kaufweg die Aufmerksamkeit, und der
 * Kauf ist das, wofür die Seite da ist.
 *
 * ── DER RÜCKFALL IST DER EIGENTLICHE TEIL ───────────────────────────────────────────────────
 *
 * `navigator.share` gibt es auf Telefonen, auf dem Rechner meistens nicht. Alle sechs anderen
 * Teilen-Knöpfe im Haus rufen die Funktion und tun ohne sie GAR NICHTS — ein Knopf, der auf den
 * Klick nicht reagiert. Hier wird die Adresse dann in die Zwischenablage gelegt und es steht da,
 * dass es passiert ist.
 *
 * Und selbst die Zwischenablage kann fehlschlagen (ältere Browser, kein sicherer Kontext).
 * Auch dann bleibt der Knopf nicht stumm: Er sagt, dass es nicht ging.
 */
export default function PortalTeilen({ adresse, name, T, aktuelleFolie = false }: {
  /** Die öffentliche Adresse seiner Seite — absolut, damit sie auch weitergeleitet trägt. */
  adresse: string;
  /** Sein Künstlername, für den Text der Freigabe. */
  name: string;
  T: PortalTexte;
  /**
   * Auf der Werk-Seite hat jede Folie des Sliders ihre Adresse (`?slide=`, Owner 20.09.2026).
   * Dann wird geteilt, was gerade OFFEN ist — die Folie reist als Anhänger an der öffentlichen
   * Adresse mit (nicht `location.href`: lokal und in der Vorschau wäre das die falsche Domain).
   */
  aktuelleFolie?: boolean;
}) {
  const [stand, setStand] = useState<"" | "kopiert" | "fehler">("");

  const teilen = async () => {
    setStand("");
    let ziel = adresse;
    if (aktuelleFolie && typeof window !== "undefined") {
      const folie = new URL(window.location.href).searchParams.get("slide");
      if (folie) {
        const u = new URL(adresse);
        u.searchParams.set("slide", folie);
        ziel = u.toString();
      }
    }
    /* Zuerst das Teilen des Geräts — es kennt die Apps, die der Mensch benutzt. */
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: name, url: ziel });
        return;
      }
    } catch {
      /* Abgebrochen heisst abgebrochen — keine Meldung, er hat sich anders entschieden. */
      return;
    }
    try {
      await navigator.clipboard.writeText(ziel);
      setStand("kopiert");
      window.setTimeout(() => setStand(""), 2500);
    } catch {
      setStand("fehler");
    }
  };

  return (
    <>
      <button type="button" onClick={() => void teilen()}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#111] px-4 py-2 text-[14px] font-semibold text-[#111] transition hover:bg-[#111] hover:text-white">
        <Share2 className="h-[17px] w-[17px]" aria-hidden />
        {T.teilen}
      </button>
      {stand === "kopiert" && (
        <span className="text-[14px] font-semibold text-[#1a7f37]">{T.linkKopiert}</span>
      )}
      {stand === "fehler" && (
        <span className="text-[14px] font-semibold text-[#b3261e]">{T.teilenFehler}</span>
      )}
    </>
  );
}
