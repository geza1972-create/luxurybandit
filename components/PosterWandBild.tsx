"use client";

import { createContext, useContext } from "react";

/**
 * WAS AUF DEM BLATT AN DER WAND STEHT (Owner 18.09.2026: „auch das Bild muss dann an die Wand
 * gesehen werden").
 *
 * Im Slider hängt dasselbe Blatt viermal: einmal als Folie 0 mit allem Werkzeug, dann in jedem
 * Zimmer und noch einmal klein in jeder Miniatur. Lädt der Kunde sein Foto hoch („You as a
 * picture") oder lässt Kunst daraus machen, ändert sich nur die Folie 0 — an der Wand hing
 * weiter das Werk des Künstlers, und genau da will er sich sehen.
 *
 * Deshalb dieser eine Merker: `PosterDeinBild` trägt ein, was gerade im Blatt steht, und jedes
 * `PosterWandFoto` zeigt es. Ohne Provider (ein Poster ausserhalb des Sliders) bleibt es bei
 * `null`, also beim Werk — die Komponente funktioniert überall.
 */
export const WandBildContext = createContext<{
  bild: string | null;
  setBild: (b: string | null) => void;
  /**
   * ── SEINE ZEILEN GEHÖREN IN DENSELBEN MERKER (Owner 19.09.2026: „der Name ist nicht an der
   * Wand" · „Gina") ──────────────────────────────────────────────────────────────────────────
   *
   * Zuerst hatte ich sie aus `EigenesContext` geholt — und sie kamen nicht an. Der Grund liegt
   * in der Schachtelung: `PosterRaeume` steht AUSSERHALB von `PosterGross`, und das Blatt an der
   * Wand ist eine Eigenschaft von `PosterRaeume`. Es liegt damit ausserhalb des Providers, der
   * die Zeilen führt — genau deshalb gibt es diesen Merker hier überhaupt, für das Bild.
   *
   * Die Zeilen nehmen jetzt denselben Weg.
   */
  zeilen: { titel: string; satz: string };
  setZeilen: (z: { titel: string; satz: string }) => void;
}>({ bild: null, setBild: () => {}, zeilen: { titel: "", satz: "" }, setZeilen: () => {} });

export function PosterWandFoto({ standard, className }: {
  /** Das Werk des Künstlers — solange der Kunde nichts eingesetzt hat. */
  standard: string;
  className?: string;
}) {
  const { bild } = useContext(WandBildContext);
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={bild || standard} alt="" loading="lazy" className={className} />;
}

/**
 * ── UND SEINE ZEILEN HÄNGEN MIT (Owner 19.09.2026: „der Name ist nicht an der Wand" · „Gina") ──
 *
 * Dasselbe Blatt hängt im Slider mehrfach: als Folie 0 mit dem Werkzeug, dann in jedem Zimmer
 * und klein in jeder Miniatur. Das FOTO wanderte seit dem 18.09. mit (`PosterWandFoto`), der
 * TEXT nicht: An der Wand stand weiter „Numele tău", während auf der Folie „Gina" stand.
 *
 * Ein Blatt, auf dem der Name fehlt, ist genau das, was er nicht kaufen würde — und es ist das
 * Bild, das er sich vor dem Kauf ansieht.
 *
 * Die Zeilen kommen aus demselben Merker wie im Blatt (`EigenesContext`). Hat er nichts
 * geschrieben, steht die Zeile des Künstlers da.
 */
export function PosterWandZeile({ art, standard }: {
  /** „titel" = die grosse Zeile · „satz" = der Text darunter. */
  art: "titel" | "satz";
  /** Was ohne seine Eingabe dasteht. */
  standard: string;
}) {
  const { zeilen } = useContext(WandBildContext);
  const seins = String((art === "titel" ? zeilen.titel : zeilen.satz) ?? "").trim();
  return <>{seins || standard}</>;
}
