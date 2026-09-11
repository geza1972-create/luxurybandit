import { HEBEL, HEBEL_AUFTRAG } from "@/lib/versusforge-hook-rezept";
import { AUFNAHME, KUNST_AUFTRAG, UEBERLEITUNG } from "@/lib/versusforge-kunst-rezept";

/**
 * WELCHES REZEPT DIE ENGINE BENUTZT — EIN ABLAUF, MEHRERE REZEPTE (Owner 10.09.2026: „Diese
 * Engine ist jetzt für Kunst, aber wir können auch andere bauen").
 *
 * ── WARUM ES DIESE DATEI GIBT ─────────────────────────────────────────────────────────────
 *
 * Bis heute stand das allgemeine Hebel-Rezept fest im Auftragstext des Agenten. Eine zweite
 * Branche hätte einen zweiten Agenten bedeutet — und zwei Agenten laufen auseinander (dieselbe
 * Lehre wie bei `lib/agent-modell.ts`). Hier wird nur ausgewählt; der Ablauf, die Werkzeuge,
 * das Protokoll und die Kostenmessung bleiben für jede Branche dieselben.
 *
 * DAS ALLGEMEINE REZEPT BLEIBT. Es wird nicht gelöscht, nur nicht mehr benutzt: Eine neue
 * Branche bekommt ein neues Rezept, keine neue Engine.
 *
 * KEIN SERVERKRAM HIER DRIN — nur Zeichenketten und Zahlen, wie in beiden Rezepten.
 */

export type RezeptName = "kunst" | "allgemein";

export type Rezept = {
  name: RezeptName;
  /** Wie der Agent fragt — der Kern des Auftragstexts. */
  auftrag: string;
  /** Die Wörter, die er nennen darf, falls er einen Arbeitsschritt benennen MUSS. Leer: keine. */
  schrittWoerter: string;
  /** Ob der Agent angehängte Bilder ansieht und daraus Kategorie, Merkmale und Stil liest. */
  mitBildern: boolean;
  /** Die Aufnahme: wie viele Bilder im selben Stil nötig sind, bevor gebaut wird. Fehlt: keine Prüfung. */
  aufnahme?: { mindestBilder: number };
  /** Ein fester Satz je Sprache, den der Code vor die erste freigegebene Antwort setzt. Fehlt: keiner. */
  ueberleitung?: Record<string, string>;
};

export const REZEPTE: Record<RezeptName, Rezept> = {
  kunst: {
    name: "kunst",
    auftrag: KUNST_AUFTRAG,
    schrittWoerter: "",
    mitBildern: true,
    aufnahme: { mindestBilder: AUFNAHME.mindestBilder },
    ueberleitung: UEBERLEITUNG,
  },
  allgemein: {
    name: "allgemein",
    auftrag: HEBEL_AUFTRAG,
    schrittWoerter: HEBEL.map(h => h.schritt).join(", "),
    mitBildern: false,
  },
};

/** Das Rezept, mit dem `/engine` heute läuft. */
export const ENGINE_REZEPT: RezeptName = "kunst";
