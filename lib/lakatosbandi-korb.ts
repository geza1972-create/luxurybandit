"use client";

/**
 * DER WARENKORB (Owner 15.09.2026: „das problem wird sein wenn jemand mehr kaufen möchte. Wir
 * haben kein warenkorb" · „es muss ein button kaufen sein oder zum warenkorb hinzufügen").
 *
 * ── ER LIEGT IM BROWSER, NICHT BEI UNS ──────────────────────────────────────────────────────
 *
 * Ein Korb ist kein Besitz, sondern eine Absicht. Ihn auf dem Server zu führen hiesse: ein
 * Konto, eine Sitzung, eine Tabelle, ein Aufräumjob — für etwas, das in neun von zehn Fällen
 * nie zu einer Bestellung wird. `localStorage` überlebt den Seitenwechsel, und mehr braucht es
 * nicht.
 *
 * ── WAS DRINSTEHT, IST EINE WAHL, KEIN PREIS ────────────────────────────────────────────────
 *
 * Mandant, Werk, Material, Größe. KEIN Betrag: Was ein Posten kostet, entscheidet der Server
 * beim Kassieren (`api/druck-kasse`, Skill `bezahlung`, Regel 3). Ein Preis im Korb wäre eine
 * Zahl, die jeder im Browser ändern kann — und die beim Bezahlen ohnehin neu geholt wird.
 *
 * Der Preis, den die Seite ANZEIGT, kommt aus derselben Tabelle wie die Kasse
 * (`druckPreisCents`), nur eben zur Anzeige.
 */

export type KorbPosten = {
  mandant: string;
  /** „standard" oder die Kachelnummer als Text. */
  werk: string;
  material: string;
  groesse: string;
  /**
   * OB DAS HONORAR DES KÜNSTLERS DAZUGEHÖRT (Owner 16.09.2026) — NUR FÜRS SCHILD im Korb. Ob es
   * wirklich gilt, entscheidet der Server aus dem Datensatz des Künstlers; hier steht es, damit
   * die Summe im Fenster nicht von der an der Kasse abweicht.
   */
  anteil?: boolean | number;
  /**
   * SEIN EIGENES BILD AN DIESEM POSTEN (Owner 18.09.2026) — die Kennung aus der Ablage
   * (`lib/lakatosbandi-kundenbild.ts`), nicht das Bild selbst: Ein Poster im `localStorage`
   * wäre ein Megabyte je Posten. Fehlt sie, wird das Werk des Künstlers gedruckt.
   */
  bild?: string;
};

const SCHLUESSEL = "lb_korb";
/** Mehr passt in kein Paket und in keine ehrliche Bestellung — dieselbe Grenze wie im Server. */
export const KORB_HOECHSTENS = 20;

/** Zwei Posten sind gleich, wenn Werk, Material, Größe UND das eingesetzte Bild gleich sind —
    sein Foto und das Werk des Künstlers sind zwei verschiedene Waren. */
const kennung = (p: KorbPosten) => `${p.mandant}|${p.werk}|${p.material}|${p.groesse}|${p.bild ?? ""}`;

export function korbLesen(): KorbPosten[] {
  if (typeof window === "undefined") return [];
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "[]") as unknown;
    if (!Array.isArray(roh)) return [];
    return roh
      .filter((p): p is KorbPosten => !!p && typeof p === "object"
        && typeof (p as KorbPosten).mandant === "string"
        && typeof (p as KorbPosten).material === "string")
      .slice(0, KORB_HOECHSTENS);
  } catch {
    /* Kaputter Inhalt ist wie ein leerer Korb — nie eine Fehlermeldung wegen einer Absicht. */
    return [];
  }
}

function schreiben(liste: KorbPosten[]) {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(liste.slice(0, KORB_HOECHSTENS))); } catch { /* privater Modus */ }
  /* Alle Bauteile auf der Seite hören auf dieses Ereignis — der Zähler oben rechts, die Liste
     im Fenster. Ohne das müsste ein gemeinsamer Zustand durch die ganze Seite gereicht werden. */
  try { window.dispatchEvent(new CustomEvent("lb-korb")); } catch { /* egal */ }
}

/** Legt einen Posten dazu. Derselbe zweimal bleibt einmal — Mengen gibt es bewusst nicht. */
export function korbDazu(p: KorbPosten): KorbPosten[] {
  const liste = korbLesen();
  if (!liste.some(x => kennung(x) === kennung(p))) liste.push(p);
  schreiben(liste);
  return liste;
}

export function korbWeg(p: KorbPosten): KorbPosten[] {
  const liste = korbLesen().filter(x => kennung(x) !== kennung(p));
  schreiben(liste);
  return liste;
}

export function korbLeeren() {
  schreiben([]);
}
