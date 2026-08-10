/**
 * ABMELDEN HEISST: WEG (Owner 10.08.2026: „und wenn er sich abmeldet dann ist es weg. Das ist
 * datenschutz auch. Kann sein dass jemand anders sein gerät in die Hand nimmt und dann sieht
 * er seine gallerie").
 *
 * WAS DAS GERÄT ÜBER IHN WUSSTE: seine Adresse (gleich an drei Stellen), seine
 * Auftragsnummern, die zwischengespeicherten Fotos und Aufnahmen, seine Käufe, seine
 * Abonnements. Das Abmelden warf bisher nur den Ausweis weg — alles andere blieb liegen, und
 * der Nächste, der das Handy in die Hand nahm, sah in der Galerie SEINE Bilder. Ab jetzt wird
 * beim Abmelden alles Personenbezogene gelöscht.
 *
 * WAS BLEIBT, UND WARUM:
 *  - `lb_visitor`, der Geräte-Ausweis. Er ist keine Person, sondern der Riegel vor der
 *    Geldbörse ([[geraete-riegel-am-guthaben]]): Nur ein Browser, der für eine Adresse schon
 *    bezahlt hat, darf ihr Guthaben ausgeben. Würde er hier gelöscht, käme der Besitzer nach
 *    dem nächsten Anmelden an sein EIGENES Geld nicht mehr heran. Er allein verrät auch
 *    nichts: Ohne Adresse öffnet er nichts.
 *  - Sprache, Hell/Dunkel, die Zustimmung zu den Keksen — Einstellungen des Geräts, keine
 *    Angaben über einen Menschen.
 *
 * DAMIT DAS GERÄT TROTZDEM AUFHÖRT, IHN ZU KENNEN: `lb_abgemeldet` merkt sich das Abmelden.
 * Wer diese Marke trägt, bekommt seine Galerie nur noch mit Anmeldung — die Gerätekennung
 * allein reicht dort nicht mehr als Ausweis. Die Marke fällt beim nächsten Anmelden weg
 * (`saveAuthSession`).
 */

/** Diese Einstellungen gehören dem GERÄT, nicht der Person — sie überleben das Abmelden. */
const BEHALTEN = new Set([
  "lb_lang",
  "lb_cookie_consent",
  "lb-admin-dark",
  "lb_visitor",
]);

/** Die Marke: Dieses Gerät war angemeldet und ist es nicht mehr. */
export const ABGEMELDET_KEY = "lb_abgemeldet";

/**
 * Alles Personenbezogene aus dem Gerät werfen. Bewusst über ein MUSTER und nicht über eine
 * Liste einzelner Namen: Die Hälfte der Schlüssel trägt eine Kennung im Namen
 * (`lb_kiss_aufn_birthday`, `lb_chatpass_…`, `lb_einl_name_…`), und eine Liste, die jemand
 * pflegen muss, ist eine Liste, die beim nächsten neuen Schlüssel unvollständig ist —
 * ausgerechnet beim Datenschutz.
 */
export function spurenLoeschen() {
  try {
    const weg: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k || BEHALTEN.has(k)) continue;
      if (/^lb[-_]/.test(k) || k.startsWith("luxurybandit-")) weg.push(k);
    }
    for (const k of weg) window.localStorage.removeItem(k);
    window.localStorage.setItem(ABGEMELDET_KEY, new Date().toISOString());
  } catch { /* ohne Speicher gibt es auch nichts zu löschen */ }
  /* Chip, Galerie und Trichter hören zu und leeren ihre Anzeige — sonst steht der alte Stand
     noch auf dem Schirm, während im Gerät längst nichts mehr liegt. */
  try { window.dispatchEvent(new CustomEvent("lb-abgemeldet")); } catch { /**/ }
}

/**
 * Darf dieses Gerät OHNE Anmeldung als Ausweis gelten? Nach einem Abmelden nicht mehr — sonst
 * zeigt die Galerie dem Nächsten die Werke des Vorigen.
 */
export function geraetGiltAlsAusweis(): boolean {
  try { return !window.localStorage.getItem(ABGEMELDET_KEY); } catch { return true; }
}
