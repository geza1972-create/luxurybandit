"use client";

import { useEffect, useState } from "react";

import { brauchtEinwilligung } from "@/lib/land-erkennen";

/* IN DER SPRACHE DES BESUCHERS (Owner 12.09.2026). Der Streifen stand nur auf Englisch, auf einer
   Seite, die rumänisch und deutsch läuft — eine Einwilligung, die der Betroffene nicht versteht,
   ist keine. Die Sprache steht im <html lang>, das Next je Seite setzt; sonst fragt der Browser. */
const BAND = {
  en: { text: "Cookies to measure our ads.", details: "Details", nein: "Reject", ja: "Accept" },
  de: { text: "Cookies, um unsere Werbung zu messen.", details: "Details", nein: "Ablehnen", ja: "Annehmen" },
  ro: { text: "Cookie-uri pentru măsurarea reclamelor noastre.", details: "Detalii", nein: "Refuz", ja: "Accept" },
} as const;

// GDPR/ePrivacy cookie banner. Essential cookies (login/session) always run; the marketing
// pixel (Meta) loads ONLY after "Accept". Choice is stored per device (lb_cookie_consent) and
// broadcast via the "lb-cookie-consent" event so MetaPixel can react without a reload.
//
// Bewusst KOMPAKT (ein schmaler Streifen, eine Zeile): Der Banner steht bei kalter
// Werbe-Zielgruppe zwischen Klick und Anmeldung — jede Zeile mehr kostet Anmeldungen.
// „Reject" bleibt gleichwertig sichtbar: Die Ablehnung muss so leicht sein wie die
// Zustimmung, sonst ist die Einwilligung nicht wirksam.
export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [W, setW] = useState<(typeof BAND)[keyof typeof BAND]>(BAND.en);

  // Erscheint sofort beim ersten Besuch. (Wartete frueher auf die 18+-Abfrage — die ist
  // am 19.07.2026 entfernt worden, dadurch waere der Banner nie mehr aufgetaucht.)
  //
  // NUR NOCH IN EUROPA (14.08.2026): Die Einwilligungspflicht ist europäisches Recht;
  // ausserhalb kostete der Streifen bei weltweiter Werbung nur Anmeldungen und Messdaten.
  // Wer keine Einwilligung braucht, sieht ihn nicht — siehe `brauchtEinwilligung`.
  useEffect(() => {
    try { setShow(brauchtEinwilligung() && !localStorage.getItem("lb_cookie_consent")); } catch { /**/ }
    /**
     * ── DIE SPRACHE DER SEITE, NICHT DIE DES BROWSERS (Owner 13.09.2026: „auch Cookie-Banner ist
     * nicht übersetzt") ────────────────────────────────────────────────────────────────────────
     *
     * GEMESSEN am 13.09.2026: `/start?lang=ro` rendert rumänisch, der Streifen stand deutsch,
     * `<html lang="de">`. Grund: `<html lang>` kommt aus `resolveLang()` — Cookie oder
     * `accept-language` —, die Portal-Seiten wählen ihre Sprache aber über `?lang=` bzw. die
     * Sprache des Künstlers. Zwei Quellen, die nie miteinander geredet haben.
     *
     * DESHALB IN DIESER REIHENFOLGE, von der genauesten zur gröbsten:
     *   1. `?lang=` — was der Besucher gerade angeklickt hat, schlägt alles.
     *   2. `[data-lang]` — was die Seite selbst gewählt hat. Nötig für `/{kuenstler}`: dort steht
     *      kein Parameter in der Adresse, die Seite läuft trotzdem in der Sprache des Künstlers.
     *   3. `<html lang>` und der Browser als Rückfall, wie bisher.
     */
    try {
      const ausUrl = new URLSearchParams(location.search).get("lang") ?? "";
      const ausSeite = document.querySelector("[data-lang]")?.getAttribute("data-lang") ?? "";
      const l = (ausUrl || ausSeite || document.documentElement.lang || navigator.language || "en")
        .slice(0, 2).toLowerCase();
      setW(BAND[l as keyof typeof BAND] ?? BAND.en);
    } catch { /**/ }
  }, []);

  /**
   * ── DER STREIFEN SAGT DEM REST DER SEITE, DASS ER DA IST (Owner 13.09.2026: „im Tunnel Cookie-
   * Banner raus. Das verdeckt das Eingabefeld") ───────────────────────────────────────────────
   *
   * Er liegt `fixed bottom-0` über allem — im Chat also über dem Feld, in das man schreiben soll.
   * Ihn dort wegzulassen ginge nicht: Ohne Einwilligung darf der Meta-Pixel nicht laden, und
   * gemessen wird gerade der Trichter.
   *
   * DESHALB EINE MARKE AM BODY statt einer zweiten Prüfung an jeder Stelle: Wer unten etwas
   * Festes hat, hält Platz frei, solange `lb-cookie-offen` gesetzt ist (siehe AgentChat).
   */
  useEffect(() => {
    try { document.body.classList.toggle("lb-cookie-offen", show); } catch { /**/ }
    return () => { try { document.body.classList.remove("lb-cookie-offen"); } catch { /**/ } };
  }, [show]);

  const choose = (v: "accepted" | "rejected") => {
    try { localStorage.setItem("lb_cookie_consent", v); } catch { /**/ }
    try { window.dispatchEvent(new Event("lb-cookie-consent")); } catch { /**/ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="lb-cookieband lb-phone-col fixed inset-x-0 bottom-0 z-[180] flex items-center gap-2 border-t border-white/10 bg-[#0d0b0a]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-white backdrop-blur">
      <p className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-white/80">
        {W.text}{" "}
        <a href="/privacy" className="text-amber-400 underline underline-offset-2">{W.details}</a>
      </p>
      <button type="button" onClick={() => choose("rejected")}
        className="h-8 shrink-0 rounded-full border border-white/20 px-3 text-[12px] font-black text-white/80 active:scale-95 transition">
        {W.nein}
      </button>
      <button type="button" onClick={() => choose("accepted")}
        className="lb-gold h-8 shrink-0 rounded-full px-4 text-[12px] font-black active:scale-95 transition">
        {W.ja}
      </button>
    </div>
  );
}
