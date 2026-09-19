"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Scheibe } from "@/components/CI";
import { kundenbildSichern } from "@/components/PosterDeinBild";

/**
 * DER DRUCK-KNOPF DES HAUSHERRN (Owner 19.09.2026: „Print-Button ist nur für mich, damit ich die
 * Datei ohne Stripe runterladen kann" · „am besten machst du hier den Print-Button hin auch").
 *
 * ── ER DRUCKT NICHT, ER HOLT DIE DRUCKDATEI ─────────────────────────────────────────────────
 *
 * „Print" heisst hier nicht „bestelle einen Druck" — das ist der Chip im Kaufblock. Hier heisst
 * es: das fertige Blatt als Datei, sofort, ohne Kasse. Sein eigener Satz: „Stell dir vor, ich bin
 * als Künstler auf einer Hochzeit eingeladen, ich will sofort Poster erstellen und drucken."
 *
 * JPG, NICHT PDF: Der Fotodienst um die Ecke nimmt ein Bild (Owner: „ich denke, dass JPGs sogar
 * besser sind"). Das PDF gibt es weiter unten im Kaufblock.
 *
 * ── DREI ZUSTÄNDE, EIN KNOPF ────────────────────────────────────────────────────────────────
 *
 * Erzeugtes Blatt, bloss hochgeladenes Foto oder gar nichts im Blatt — alle drei liefern
 * (Owner: „egal in welchem Zustand" · „mit oder ohne Generierung, mit hochgeladenem Bild auch").
 * Ohne Kundenbild setzt der Server das Werk des Künstlers ein.
 *
 * ── ER ERSCHEINT NUR MIT SCHLÜSSEL, UND DAS ENTSCHEIDET DER SERVER ──────────────────────────
 *
 * Ohne `adminS` wird hier gar nichts gezeichnet. Wer den Knopf per Hand nachbaut, kommt trotzdem
 * nicht weiter: `api/kunst-datei` prüft den Schlüssel zeitsicher und antwortet sonst mit 402.
 */
export default function PosterDruckKnopf({ mandant, werk, adminS, rahmen = "0", groesse = "64px", klasse = "" }: {
  mandant: string;
  werk: string;
  /** Der Schlüssel aus der Adresse (`?s=`). Leer heisst: kein Knopf. */
  adminS: string;
  /** Die Rahmenwahl aus dem Kaufblock: "0" ohne · "1" Holz · "2" schwarz. Sie gehört in die
      Datei, sonst zeigt das Vollbild einen Rahmen, den der Druck nicht hat. */
  rahmen?: string;
  /** Im Vollbild in Pixeln — dort gibt es keine Blattbreite, an der etwas wachsen könnte. */
  groesse?: string;
  klasse?: string;
}) {
  const [laeuft, setLaeuft] = useState(false);
  if (!adminS) return null;

  const holen = async () => {
    if (laeuft) return;
    setLaeuft(true);
    try {
      /* Liegt ein Bild des Kunden im Blatt, gehört es in die Datei; sonst nimmt der Server das
         Werk. `null` ist hier kein Fehler. */
      const bild = await kundenbildSichern(mandant, werk);
      const u = new URL("/api/kunst-datei", window.location.origin);
      u.searchParams.set("m", mandant);
      u.searchParams.set("i", werk);
      u.searchParams.set("format", "A3");
      u.searchParams.set("typ", "jpg");
      u.searchParams.set("s", adminS);
      if (bild) u.searchParams.set("bild", bild);
      if (rahmen === "1") u.searchParams.set("rahmen", "holz");
      if (rahmen === "2") u.searchParams.set("rahmen", "schwarz");
      window.location.href = u.toString();
    } finally {
      /* Ein Download wechselt die Seite nicht, `onload` feuert nie ([[immer-close-einbauen]]). */
      window.setTimeout(() => setLaeuft(false), 4000);
    }
  };

  return (
    <Scheibe label="Print" groesse={groesse} className={klasse}
      onClick={e => { e?.preventDefault(); e?.stopPropagation(); void holen(); }}>
      <Printer style={{ width: "50%", height: "50%" }} aria-hidden />
    </Scheibe>
  );
}
