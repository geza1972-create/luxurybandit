// Telefon-Vorwahl → Land (ISO-2) + Sprache.
//
// REGEL (Wetter): Wenn ein Lead KEINE Stadt/kein Land angibt, bestimmt die
// Telefon-Vorwahl den Wetter-Ort (Land) und die Nachrichten-Sprache. So bekommt
// jeder Ad-Lead auch ohne Stadt eine sinnvolle Sprache + Region.
//
// Sprache nur aus den Werten, die confirmEmail/Templates unterstützen
// (ro, de, en, es, fr, pt, pl, it) — sonst „en" als neutraler Rückfall.

type Dial = { p: string; country: string; lang: string };

const DIAL: Dial[] = [
  { p: "+40", country: "RO", lang: "ro" },
  { p: "+373", country: "MD", lang: "ro" }, // Moldawien → rumänisch
  { p: "+33", country: "FR", lang: "fr" },
  { p: "+32", country: "BE", lang: "fr" },
  { p: "+352", country: "LU", lang: "fr" },
  { p: "+351", country: "PT", lang: "pt" },
  { p: "+39", country: "IT", lang: "it" },
  { p: "+34", country: "ES", lang: "es" },
  { p: "+48", country: "PL", lang: "pl" },
  { p: "+49", country: "DE", lang: "de" },
  { p: "+43", country: "AT", lang: "de" },
  { p: "+41", country: "CH", lang: "de" },
  { p: "+44", country: "GB", lang: "en" },
  { p: "+353", country: "IE", lang: "en" },
  { p: "+31", country: "NL", lang: "en" },
  { p: "+45", country: "DK", lang: "en" },
  { p: "+46", country: "SE", lang: "en" },
  { p: "+47", country: "NO", lang: "en" },
  { p: "+358", country: "FI", lang: "en" },
  { p: "+30", country: "GR", lang: "en" },
  { p: "+36", country: "HU", lang: "en" },
  { p: "+420", country: "CZ", lang: "en" },
  { p: "+421", country: "SK", lang: "en" },
  { p: "+359", country: "BG", lang: "en" },
  { p: "+385", country: "HR", lang: "en" },
  { p: "+380", country: "UA", lang: "en" },
  { p: "+90", country: "TR", lang: "en" },
  { p: "+1", country: "US", lang: "en" },
  { p: "+84", country: "VN", lang: "en" },
];
// Längste Vorwahl zuerst prüfen (z. B. +351 vor +3-Ländern), fest sortiert.
const DIAL_SORTED = [...DIAL].sort((a, b) => b.p.length - a.p.length);

// Gibt Land (ISO-2) + Sprache zur Vorwahl zurück, oder null wenn unbekannt/ohne „+".
export function dialInfo(phone?: string | null): { country: string; lang: string } | null {
  const p = String(phone || "").replace(/[^\d+]/g, "");
  if (!p.startsWith("+")) return null;
  const hit = DIAL_SORTED.find(d => p.startsWith(d.p));
  return hit ? { country: hit.country, lang: hit.lang } : null;
}
