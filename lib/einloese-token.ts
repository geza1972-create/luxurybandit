import crypto from "crypto";

/**
 * DIE UNTERSCHRIFT AUF DEM EINLÖSE-LINK DES BESCHENKTEN (Owner 06.08.2026: „Kann er
 * draufklicken und ist sofort angemeldet? … und sein Credit ist geladen?").
 *
 * Die Empfänger-Mail trägt `?e=<adresse>&t=<token>`. Die Karte hinterlegt die Adresse dann
 * als Geräte-Login (E-Mail IST der Login) — der Guthaben-Chip zeigt sein Geschenk, und die
 * Themenseite zahlt daraus. OHNE gültige Unterschrift passiert nichts: Der nackte
 * Karten-Link ist so öffentlich wie jede Einladung; dürfte ER anmelden, würde jeder
 * Weiterleser zum Kontoinhaber. Nur das Postfach des Beschenkten hat den Token — und das
 * Postfach ist ohnehin seine Identität.
 *
 * Dasselbe Verfahren wie beim Werbegeschenk (`werbeToken` in /api/werbe-guthaben): HMAC über
 * Zweck, Karte UND Adresse, mit dem Admin-Geheimnis. An eine andere Karte oder Adresse passt
 * er nicht.
 */
export function einloeseToken(einladungId: string, adresse: string): string {
  const secret = process.env.TRY_THIS_LOOK_ADMIN_PIN || "luxurybandit";
  return crypto.createHmac("sha256", secret)
    .update(`gutschein-einloesen|${einladungId.trim()}|${adresse.trim().toLowerCase()}`)
    .digest("hex").slice(0, 24);
}
