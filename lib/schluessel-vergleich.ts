import crypto from "node:crypto";

/**
 * ZEITGLEICHER SCHLÜSSELVERGLEICH — derselbe wie im Dashboard und in `app/api/versusforge-bild/route.ts`.
 * Hier für alle Stellen, die den Dashboard-Schlüssel eines Künstlers prüfen (Seite bearbeiten, Bilder vor
 * der Freigabe ausliefern, Profil speichern). Ein `===` verriete über die Laufzeit, wie viele Zeichen stimmen.
 */
export function schluesselStimmt(soll: string, ist: string): boolean {
  const a = Buffer.from(String(soll ?? ""), "utf8");
  const b = Buffer.from(String(ist ?? ""), "utf8");
  if (!a.length || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}
