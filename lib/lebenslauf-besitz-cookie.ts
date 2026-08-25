import { createHmac } from "crypto";

/**
 * DIE BESITZ-KARTE IM COOKIE (Owner 25.08.2026: „na gut, und Serversperre") — damit der
 * SERVER weiss, wem eine unbezahlte Bewerbung gehört, BEVOR er Inhalt ausliefert.
 *
 * WARUM ÜBERHAUPT: Die bisherige Besitz-Prüfung (`darfAmProfilArbeiten`) braucht die
 * Geräte-Kennung aus dem localStorage — die kennt nur der Browser, nie der Server. Eine
 * Server-Sperre kann also nur an etwas hängen, das der Browser MITSCHICKT: ein Cookie.
 *
 * WARUM SIGNIERT: Ein Cookie ist Text, den jeder selbst setzen kann. Ohne Unterschrift
 * würde `lb_besitz=<fremde-kennung>` die ganze Sperre aushebeln. Der HMAC macht daraus
 * einen Nachweis, den nur der Server ausstellen kann — dieselbe Idee wie bei einem
 * signierten Ticket.
 *
 * WAS DRIN STEHT: nur Kennungen, keine Namen, keine Adressen. Wer das Cookie stiehlt,
 * bekommt Zugriff auf genau die Seiten, deren Adresse er ohnehin bräuchte.
 */
const GEHEIM = process.env.LEBENSLAUF_BESITZ_SECRET
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.TRY_THIS_LOOK_ADMIN_PIN
  || "lb-besitz-ohne-geheimnis";

export const BESITZ_COOKIE = "lb_besitz";

/** Kurze Unterschrift je Kennung — 16 Zeichen reichen, das Cookie bleibt klein. */
export function besitzSignatur(id: string): string {
  return createHmac("sha256", GEHEIM).update(`lebenslauf:${id}`).digest("hex").slice(0, 16);
}

/** Steht diese Kennung mit gültiger Unterschrift im Cookie? */
export function besitzImCookie(cookieWert: string, id: string): boolean {
  if (!cookieWert || !id) return false;
  const gesucht = `${id}:${besitzSignatur(id)}`;
  return cookieWert.split(".").some(t => t.trim() === gesucht);
}

/** Kennung an einen bestehenden Cookie-Wert anhängen (ohne Doppel, gedeckelt). */
export function besitzHinzufuegen(cookieWert: string, id: string): string {
  const neu = `${id}:${besitzSignatur(id)}`;
  const teile = (cookieWert || "").split(".").map(t => t.trim()).filter(Boolean);
  if (teile.includes(neu)) return teile.join(".");
  /* Deckel: 40 Bewerbungen je Browser — mehr passt sonst nicht in ein Cookie. */
  return [...teile, neu].slice(-40).join(".");
}
