/**
 * WER SEIN DASHBOARD SEHEN DARF (Owner 08.09.2026: „ich brauche ebenso ein Dashboard, was
 * die Kunden auch bekommen").
 *
 * KEIN LOGIN, KEIN PASSWORT — ein Schlüssel in der Adresse. Das ist dieselbe Bauart wie die
 * Recruiter-Seite und folgt der Hausregel „keine Registrierung vor dem Ergebnis": Ein
 * Restaurantbesitzer, der seine Anfragen sehen will, soll nicht erst ein Konto anlegen.
 *
 * WAS DAS BEDEUTET, OFFEN GESAGT: Wer den Link hat, sieht die Anfragen. Der Link ist das
 * Geheimnis. Für eine Liste mit Namen und Telefonnummern ist das die richtige Stufe —
 * weitergeleitet wird er ohnehin im Betrieb, und ein Passwort mehr hält niemanden auf, der
 * den Link hat. Für mehr (Zahlungen, Löschen, Kampagnen anfassen) wäre es zu wenig; kommt
 * das, kommt ein Konto davor.
 *
 * DER SCHLÜSSEL WIRD ZEICHENWEISE VERGLICHEN, aber in gleichbleibender Zeit: Ein Vergleich,
 * der beim ersten Unterschied abbricht, verrät über die Antwortzeit, wie viele Zeichen
 * stimmen. Bei einem Geheimnis in der Adresse ist das die einzige Angriffsfläche, die es
 * überhaupt gibt.
 *
 * HEUTE GIBT ES EINEN MANDANTEN — uns. Er steht in `.env.local`, nicht im Code. Kunden
 * kommen als Einträge dazu, nicht als Umbau: Diese eine Funktion wird dann aus einer Ablage
 * gelesen statt aus der Umgebung, und alles darüber bleibt unverändert.
 */

import { EIGENER_MANDANT, mandantSauber } from "@/lib/versusforge-lead";

/** Vergleicht ohne Zeitverrat. Länge zuerst — die ist ohnehin sichtbar. */
function gleich(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let unterschied = 0;
  for (let i = 0; i < a.length; i++) unterschied |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return unterschied === 0;
}

export type MandantStand =
  | { ok: true; mandant: string; name: string }
  | { ok: false; grund: "kein-schluessel" | "falsch" | "nicht-eingerichtet" };

export function mandantPruefen(mandantRoh: string, schluesselRoh: string): MandantStand {
  const mandant = mandantSauber(mandantRoh) || EIGENER_MANDANT;
  const schluessel = String(schluesselRoh ?? "").trim();
  if (!schluessel) return { ok: false, grund: "kein-schluessel" };

  if (mandant === EIGENER_MANDANT) {
    const erwartet = String(process.env.VERSUSFORGE_DASHBOARD_KEY ?? "").trim();
    /* Ohne eingerichteten Schlüssel wird NICHT durchgelassen. Ein leerer Vergleich, der
       zufällig aufgeht, wäre eine offene Tür, die niemand bemerkt. */
    if (!erwartet) return { ok: false, grund: "nicht-eingerichtet" };
    if (!gleich(schluessel, erwartet)) return { ok: false, grund: "falsch" };
    return { ok: true, mandant, name: "VersusForge" };
  }

  /* Kundenmandanten gibt es noch nicht. Lieber eine ehrliche Absage als eine Tür, die
     scheinbar funktioniert. */
  return { ok: false, grund: "nicht-eingerichtet" };
}
