import type { TryThisLookLook } from "@/lib/try-this-look-store";

/**
 * ECHTER TEXT JE LOOK-SEITE — die Voraussetzung dafuer, dass diese Seiten je gefunden
 * werden koennen (Owner-Auftrag 27.08.2026: „ich will, dass sie auch indexiert werden
 * koennen").
 *
 * DER BEFUND, DER DIESE DATEI NOETIG MACHT (gemessen am 27.08.2026): Eine Look-Seite lieferte
 * FUENF Woerter aus — „LuxuryBandit — AI Marketing Portal", also nur den Haustitel. Die Seite
 * beginnt mit `"use client"`, der Server schickt eine leere Huelle, alles entsteht erst im
 * Browser. Das `noindex` in ihrem Layout ist deshalb nicht die Ursache, sondern die Folge:
 * Google hatte 199 solcher Adressen als „Gefunden — zurzeit nicht indexiert" abgelehnt, und
 * das Layout hat daraus die Konsequenz gezogen. Wer nur das `noindex` entfernt, wiederholt
 * den Vorgang mit mehr Aufwand.
 *
 * KEIN ERFUNDENER TEXT. Alles hier kommt aus Feldern, die am Look wirklich gepflegt sind
 * (`location`, `garmentSubcategory`, `theme`, `occasion`, `style`, `price`, `storeName`).
 * Fehlt ein Feld, faellt der Satz weg — er wird nicht mit Fuellwoertern gestreckt. Eine Seite
 * mit drei ehrlichen Saetzen ist mehr wert als eine mit zehn erfundenen: Genau daran ist die
 * erste Fassung dieser Seiten gescheitert.
 */

const putz = (v?: string) => String(v ?? "").trim();

/** Die Ueberschrift: was es ist, nicht wie es heisst — Suchende tippen die Sache, nicht den Namen. */
export function lookTitel(look: TryThisLookLook): string {
  const teil = putz(look.garmentSubcategory) || putz(look.garmentCategory);
  const name = putz(look.name);
  if (teil && name) return `${name} — ${teil}`;
  return name || teil || "Look";
}

/**
 * Der Satz unter der Ueberschrift und zugleich die Meta-Beschreibung. Bewusst aus
 * Tatsachen gebaut und bei ~155 Zeichen gekappt — was Google abschneidet, hat niemand
 * gelesen.
 */
export function lookBeschreibung(look: TryThisLookLook): string {
  const teil = putz(look.garmentSubcategory) || putz(look.garmentCategory) || "Look";
  const stil = putz(look.style);
  const anlass = putz(look.occasion);
  const ort = putz(look.location);

  const teile = [
    stil ? `${stil}er ${teil}` : teil,
    anlass ? `für ${anlass}` : "",
    ort ? `aus der ${ort}-Auswahl` : "",
  ].filter(Boolean).join(" ");

  const satz = `${teile}. Sieh ihn im Video an einem Modell — oder an dir selbst.`;
  return satz.length > 155 ? satz.slice(0, 152).trimEnd() + "…" : satz;
}

/**
 * Die Fakten-Zeilen. Nur was gepflegt ist — eine leere Zeile „Preis: —" schadet mehr, als
 * sie nuetzt: Sie sagt dem Leser, dass hier niemand hinschaut.
 */
export function lookFakten(look: TryThisLookLook): { k: string; v: string }[] {
  const f: { k: string; v: string }[] = [];
  const add = (k: string, v?: string) => { const s = putz(v); if (s) f.push({ k, v: s }); };
  add("Kategorie", look.garmentCategory);
  add("Art", look.garmentSubcategory);
  add("Stil", look.style);
  add("Anlass", look.occasion);
  add("Farbwelt", look.theme);
  add("Kollektion", look.location);
  add("Preis", look.salePrice || look.price);
  add("Händler", look.storeName);
  add("Lieferzeit", look.deliveryTime);
  if (look.availableSizes?.length) f.push({ k: "Größen", v: look.availableSizes.join(", ") });
  return f;
}

/**
 * Der beschreibende Absatz. Er wiederholt die Fakten NICHT, sondern ordnet sie ein — sonst
 * liest sich die Seite wie eine Tabelle mit Fliesstext daneben.
 */
export function lookAbsatz(look: TryThisLookLook): string {
  const teil = putz(look.garmentSubcategory) || putz(look.garmentCategory) || "dieses Teil";
  const anlass = putz(look.occasion);
  const stil = putz(look.style);
  const haendler = putz(look.storeName);
  const notiz = putz(look.productNote);

  const saetze: string[] = [];
  saetze.push(
    anlass
      ? `${teil} für ${anlass} lassen sich auf einem Produktfoto schlecht beurteilen: Man sieht den Schnitt, aber nicht, wie er sich bewegt.`
      : `Ein ${teil} lässt sich auf einem Produktfoto schlecht beurteilen: Man sieht den Schnitt, aber nicht, wie er sich bewegt.`,
  );
  saetze.push(
    `Auf dieser Seite siehst du ihn deshalb als Video an einem Modell — und kannst dein eigenes Foto hochladen, um ihn an dir zu sehen, bevor du dich entscheidest.`,
  );
  if (stil) saetze.push(`Der Look ist als ${stil.toLowerCase()} eingeordnet.`);
  if (haendler) saetze.push(`Das Teil stammt von ${haendler}.`);
  if (notiz) saetze.push(notiz);
  return saetze.join(" ");
}
