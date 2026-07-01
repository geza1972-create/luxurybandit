"use client";

import { useEffect, useState } from "react";

// Tiny landing page shown INSIDE the Stripe checkout popup after payment (or cancel).
// The main try-on tab polls the session status and does the real work; this page just
// tells the user they can close it, and tries to close itself.
export default function PayDonePage() {
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const cancel = new URLSearchParams(window.location.search).get("cancelled") === "1";
    setCancelled(cancel);
    // Give the opener a beat to detect the paid status, then try to auto-close.
    const t = setTimeout(() => { try { window.close(); } catch { /* ignore */ } }, cancel ? 300 : 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-white px-6 text-center">
      <div className="max-w-sm">
        <div className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full ${cancelled ? "bg-black/[0.06]" : "bg-emerald-100"}`}>
          <span className="text-2xl">{cancelled ? "↩︎" : "✓"}</span>
        </div>
        <h1 className="text-lg font-black text-black">{cancelled ? "Payment cancelled" : "Payment received"}</h1>
        <p className="mt-1 text-sm font-medium text-black/55">
          {cancelled ? "No charge was made." : "Thanks! You can close this window — your video is being created in the other tab."}
        </p>
        <button type="button" onClick={() => { try { window.close(); } catch { /* ignore */ } }}
          className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-black text-white active:scale-95 transition-transform">
          Close
        </button>
      </div>
    </main>
  );
}
