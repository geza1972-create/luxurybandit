/**
 * DER IN-APP-BROWSER — WARUM DIESE DATEI EXISTIERT (15.08.2026).
 *
 * GEMESSEN, nicht vermutet: Von 107 Tunnel-Oeffnungen seit dem 14.08. kamen **41 (38 %)** aus
 * einem In-App-Browser (Facebook/Instagram). Und **23 von 23** Kamera-Fehlern
 * (`funnel_aufnahme_kamera_NotAllowedError`) trugen `; wv)` im User-Agent — also Android
 * WebView, der eingebaute Browser der Facebook-App. Erfolgreiche Aufnahmen gab es
 * ausschliesslich in echten Browsern (2x iOS Safari, 1x Desktop).
 *
 * Kein einziger Mensch hat in der Facebook-App eine Aufnahme geschafft. Damit ist das
 * Versprechen-Produkt — das eine Aufnahme BRAUCHT — fuer 38 % des Anzeigenverkehrs technisch
 * unbenutzbar, und zwar bevor irgendein Text, Preis oder Vertrauen eine Rolle spielt.
 *
 * Android laesst sich aus der WebView heraus in den echten Browser schicken (`intent://`).
 * iOS nicht — dort bleibt nur „Link kopieren" und ein Satz, was zu tun ist.
 */

/** Facebook, Instagram und jede andere App, die Seiten in ihrer eigenen WebView oeffnet. */
export function istInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /; wv\)/i.test(ua)          // Android WebView — der Marker aus den Messdaten
    || /\bFBAN\b|\bFBAV\b|FB_IAB/i.test(ua)   // Facebook-App
    || /\bInstagram\b/i.test(ua)
    || /\bLine\/|\bMicroMessenger\b|\bTikTok\b/i.test(ua);
}

export function istAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

/**
 * Die Adresse, die Android zwingt, die Seite in Chrome zu oeffnen. Funktioniert aus der
 * Facebook-WebView heraus; `S.browser_fallback_url` faengt Geraete ohne Chrome auf, damit
 * niemand auf einer leeren Seite landet.
 */
export function chromeIntentUrl(url: string): string {
  const ohneSchema = url.replace(/^https?:\/\//, "");
  return `intent://${ohneSchema}#Intent;scheme=https;package=com.android.chrome;`
    + `S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

/**
 * DIE KASSE ÖFFNEN — ABER NIE IM FACEBOOK-BROWSER (Owner 15.08.2026: „der user darf nicht in
 * der FB App bleiben wenn er auf Kaufen klickt").
 *
 * WARUM: Aus dem In-App-Browser wurde die Stripe-Kasse 11-mal geoeffnet und NIE eine Zahlung
 * abgeschlossen (gemessen, siehe Memory `fb-inapp-browser-blockiert-kamera`). Die WebView
 * stapelt ein weiteres Fenster ueber die Seite, drosselt die Warteschleife im Hintergrund und
 * laesst den Kunden oft nicht zurueck. Alle gemessenen Fehlfaelle waren ANDROID — dort
 * loest `intent://` das Problem sauber: Chrome oeffnet die Stripe-Adresse als echter Browser.
 *
 * iOS bleibt beim bisherigen Weg: Facebook nutzt dort einen Safari-Unterbau, in dem Stripe
 * funktioniert, und erzwingen liesse sich der Wechsel ohnehin nicht.
 *
 * DER AUFTRAG UEBERLEBT DEN WECHSEL: Bezahlt wird bei Stripe, gestempelt wird vom Webhook,
 * geliefert von der Lieferkette (`/api/kiss-deliver`). Dass die Warteschleife dieser Seite
 * mit dem Fensterwechsel stirbt, kostet nichts — genau dafuer gibt es den Server-Weg.
 */
export function kasseOeffnen(popup: Window | null, url: string): "chrome" | "popup" | "seite" {
  if (istInAppBrowser() && istAndroid()) {
    try { popup?.close(); } catch { /**/ }
    window.location.href = chromeIntentUrl(url);
    return "chrome";
  }
  if (!popup) { window.location.href = url; return "seite"; }
  try { popup.location.href = url; return "popup"; }
  catch {
    try { popup.close(); } catch { /**/ }
    window.location.href = url;
    return "seite";
  }
}

/**
 * ES GIBT KEIN KASSEN-FENSTER MEHR (Owner 15.08.2026: „mir stinkt es mit stripe pop up
 * fenster"). Gibt immer `null` zurueck — die Kasse oeffnet in DERSELBEN Registerkarte.
 *
 * Warum eine Funktion statt schlicht `null`: Die Trichter rufen an mehreren Stellen
 * `popup?.close()` auf. Stuende dort ein hartes `null`, verengte TypeScript den Typ auf
 * `never` und jeder dieser Aufrufe waere ein Fehler. Ueber den Rueckgabewert bleibt
 * `Window | null` erhalten, die Aufrufe laufen harmlos ins Leere, und der Tag, an dem
 * jemand das Fenster zurueckholen will, ist eine Zeile Arbeit.
 */
export function kassenFenster(): Window | null {
  return null;
}
