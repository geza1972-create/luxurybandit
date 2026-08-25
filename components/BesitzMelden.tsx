"use client";

import { useEffect } from "react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * „ICH BIN ES" — EINMAL, DANN NEU LADEN (Owner 25.08.2026, Serversperre).
 *
 * Auf der Sperrseite einer unbezahlten Bewerbung meldet sich der Browser mit seiner
 * Geräte-Kennung. Sagt der Server ja, setzt er ein signiertes Cookie, und die Seite wird
 * EINMAL neu geladen — danach rendert der Server das volle Dossier.
 *
 * GENAU EINMAL: Ein Merker in der Sitzung verhindert die Endlosschleife, falls das Cookie
 * nicht ankommt (Browser mit blockierten Cookies) — dann bleibt die Sperrseite stehen,
 * statt die Seite ewig neu zu laden.
 */
export default function BesitzMelden({ id }: { id: string }) {
  useEffect(() => {
    const merker = `lb_besitz_versucht_${id}`;
    try { if (sessionStorage.getItem(merker)) return; } catch { /**/ }

    let device = "", pin = "", tok = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }

    void fetch("/api/lebenslauf-besitz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(pin ? { "x-try-look-admin-pin": pin } : {}),
      },
      body: JSON.stringify({ id, device }),
    }).then(r => r.json()).then(d => {
      try { sessionStorage.setItem(merker, "1"); } catch { /**/ }
      if (d?.darf === true) window.location.reload();
    }).catch(() => { /* dann bleibt die Sperrseite stehen */ });
  }, [id]);

  return null;
}
