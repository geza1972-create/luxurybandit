"use client";

import { useEffect, useState } from "react";

// GDPR/ePrivacy cookie banner. Essential cookies (login/session) always run; the marketing
// pixel (Meta) loads ONLY after "Accept". Choice is stored per device (lb_cookie_consent) and
// broadcast via the "lb-cookie-consent" event so MetaPixel can react without a reload.
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (!localStorage.getItem("lb_cookie_consent")) setShow(true); } catch { /**/ }
  }, []);

  const choose = (v: "accepted" | "rejected") => {
    try { localStorage.setItem("lb_cookie_consent", v); } catch { /**/ }
    try { window.dispatchEvent(new Event("lb-cookie-consent")); } catch { /**/ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="lb-phone-col fixed inset-x-0 bottom-0 z-[180] border-t border-white/10 bg-[#0d0b0a]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 text-white backdrop-blur">
      <p className="text-[12px] font-bold leading-relaxed text-white/70">
        We use essential cookies to run the app. With your consent we also use marketing cookies
        (Meta Pixel) to measure our ads. See our{" "}
        <a href="/privacy" className="text-amber-400 underline underline-offset-2">Privacy Policy</a>.
      </p>
      <div className="mt-2.5 flex gap-2">
        <button type="button" onClick={() => choose("rejected")}
          className="h-10 flex-1 rounded-full border border-white/15 text-[13px] font-black text-white/70 active:scale-95 transition">
          Reject
        </button>
        <button type="button" onClick={() => choose("accepted")}
          className="lb-gold h-10 flex-1 rounded-full text-[13px] font-black active:scale-95 transition">
          Accept
        </button>
      </div>
    </div>
  );
}
