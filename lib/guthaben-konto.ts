"use client";

import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * WEM GEHOERT DAS GUTHABEN? — die Antwort an EINER Stelle.
 *
 * Guthaben haengt an einer E-Mail, nicht an einem Geraet. Welche E-Mail der Besucher gerade
 * IST, entschieden Header-Chip und Trichter bisher getrennt (beide `Konto || lb_kiss_mail`,
 * aber jeder mit eigenem `fetch`). Zwei Stellen mit derselben Regel laufen frueher oder
 * spaeter auseinander — und bei Geld ist das der teuerste Ort dafuer.
 *
 * DER FALL, DER DAS AUSLOESTE (Owner 03.08.2026): 8,50 € lagen auf der einen Adresse,
 * angemeldet war er mit einer anderen. Der Chip zeigte wahrheitsgemaess 0,00 € — und genau
 * diese Wahrheit liest sich als „mein Geld ist weg". Deshalb liefert diese Datei nicht nur
 * den Stand des aktuellen Kontos, sondern auch den Hinweis, wo sonst noch etwas liegt.
 *
 * UMGEBUCHT WIRD NICHTS. Ein Browser, der eine Adresse behauptet, ist kein Nachweis, dass sie
 * ihm gehoert — automatisches Zusammenlegen waere die Tuer zu fremden Konten. Wir zeigen nur.
 */

export type Gestrandet = { adresse: string; cents: number; links: number };

export type GuthabenStand = {
  /** Die Adresse, auf die JETZT gekauft wird. */
  adresse: string;
  /** Ihr Euro-Guthaben in Cent. */
  cents: number;
  /** Ihre Video-Credits aus dem aelteren System (Abo/Nachkauf). */
  links: number;
  abo: boolean;
  /**
   * Guthaben auf einer ANDEREN Adresse dieses Geraets — hier nicht ausgebbar. `null`, solange
   * alles am selben Konto haengt (der Normalfall).
   */
  gestrandet: Gestrandet | null;
  /**
   * AUF DIESER ADRESSE LIEGT GELD, DIESER BROWSER DARF ES ABER NICHT AUSGEBEN
   * (Geräte-Riegel, 09.08.2026). Dann ist `cents` 0 — und trotzdem wäre es falsch, ihn zur
   * Kasse zu schicken: Er soll sich anmelden und sein eigenes Geld benutzen.
   */
  gesperrt: boolean;
};

const MAIL_KEY = "lb_kiss_mail";

/** Die angemeldete Konto-Adresse (leer, wenn niemand angemeldet ist). */
export function kontoAdresse(): string {
  try { return (getStoredAuthSession()?.user?.email ?? "").trim().toLowerCase(); } catch { return ""; }
}

/**
 * ALLE ORTE, an denen eine Adresse dieses Geraets liegen kann — in der Reihenfolge ihrer
 * Verlaesslichkeit (bestaetigt/bezahlt vor bloss eingetippt).
 *
 * Owner 03.08.2026: „du musst schauen, dass ich eingeloggt bin auf ALLEN Topicseiten, wenn
 * ich meine E-Mail angebe um zu generieren." Die Adresse entstand an vier Stellen und lag
 * unter vier Namen; gelesen wurde nur der erste. Wer sie an der Kasse oder am Feed-Tor
 * hinterlassen hatte, galt auf jeder anderen Seite wieder als Fremder — kein Konto im
 * Header, kein „Signed in" im Menue, und beim naechsten Thema dieselbe Frage von vorn.
 */
const MAIL_KEYS = [MAIL_KEY, "lb_customer_email", "lb_paid_email", "lb_lead_email"] as const;

/** Die Adresse, die dieses Geraet aus einem frueheren Besuch kennt — egal WO sie entstand. */
export function geraetAdresse(): string {
  for (const k of MAIL_KEYS) {
    try {
      const v = (localStorage.getItem(k) ?? "").trim().toLowerCase();
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return v;
    } catch { /* privater Modus */ }
  }
  return "";
}

/** Abmelden: ALLE Spuren loeschen — sonst holt der Rueckfall die Adresse gleich wieder. */
export function vergissGeraetAdresse(): void {
  for (const k of MAIL_KEYS) { try { localStorage.removeItem(k); } catch { /**/ } }
}

/**
 * Die Adresse, auf die gekauft wird: das angemeldete Konto schlaegt die Geraeteadresse.
 * Wer angemeldet ist, erwartet sein Konto — alles andere waere eine stille Umleitung.
 */
export function aktiveAdresse(): string {
  return kontoAdresse() || geraetAdresse();
}

/**
 * Stand holen. `null` heisst: Wir kennen ihn gar nicht — dann darf nirgends eine Null stehen,
 * denn „0,00 €" an einen Fremden ist eine Abweisung, keine Auskunft.
 */
export async function guthabenLesen(adresse?: string): Promise<GuthabenStand | null> {
  const mail = (adresse ?? aktiveAdresse()).trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return null;
  // Die zweite Adresse reist mit, damit EINE Anfrage reicht. Der Server fragt sie nur nach,
  // wenn das Hauptkonto leer ist — und ohne zweiten Stripe-Aufruf.
  const zweite = geraetAdresse();
  const q = new URLSearchParams({ email: mail });
  if (zweite && zweite !== mail) q.set("auch", zweite);
  /* DER BROWSER WEIST SICH AUS (09.08.2026): Der Server zeigt den Kontostand nur einem
     Gerät, das für dieses Konto schon einmal bezahlt hat — sonst könnte jeder mit einer
     fremden Adresse nachsehen, wo Geld liegt. */
  try { const g = localStorage.getItem("lb_visitor"); if (g) q.set("device", g); } catch { /* privater Modus */ }
  try {
    const d = await fetch(`/api/kiss-status?${q.toString()}`, { cache: "no-store" }).then(r => r.json());
    return {
      adresse: mail,
      cents: typeof d?.walletCents === "number" ? d.walletCents : 0,
      links: typeof d?.left === "number" ? d.left : 0,
      abo: !!d?.abo,
      gestrandet: d?.gestrandet?.adresse ? d.gestrandet as Gestrandet : null,
      gesperrt: !!d?.gesperrt,
    };
  } catch { return null; }
}
