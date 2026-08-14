"use client";

import { useEffect, useState } from "react";

import { brauchtEinwilligung } from "@/lib/land-erkennen";

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

  // Erscheint sofort beim ersten Besuch. (Wartete frueher auf die 18+-Abfrage — die ist
  // am 19.07.2026 entfernt worden, dadurch waere der Banner nie mehr aufgetaucht.)
  //
  // NUR NOCH IN EUROPA (14.08.2026): Die Einwilligungspflicht ist europäisches Recht;
  // ausserhalb kostete der Streifen bei weltweiter Werbung nur Anmeldungen und Messdaten.
  // Wer keine Einwilligung braucht, sieht ihn nicht — siehe `brauchtEinwilligung`.
  useEffect(() => {
    try { setShow(brauchtEinwilligung() && !localStorage.getItem("lb_cookie_consent")); } catch { /**/ }
  }, []);

  const choose = (v: "accepted" | "rejected") => {
    try { localStorage.setItem("lb_cookie_consent", v); } catch { /**/ }
    try { window.dispatchEvent(new Event("lb-cookie-consent")); } catch { /**/ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[180] flex items-center gap-2 border-t border-white/10 bg-[#0d0b0a]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 text-white backdrop-blur">
      <p className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-white/80">
        Cookies to measure our ads.{" "}
        <a href="/privacy" className="text-amber-400 underline underline-offset-2">Details</a>
      </p>
      <button type="button" onClick={() => choose("rejected")}
        className="h-8 shrink-0 rounded-full border border-white/20 px-3 text-[12px] font-black text-white/80 active:scale-95 transition">
        Reject
      </button>
      <button type="button" onClick={() => choose("accepted")}
        className="lb-gold h-8 shrink-0 rounded-full px-4 text-[12px] font-black active:scale-95 transition">
        Accept
      </button>
    </div>
  );
}
