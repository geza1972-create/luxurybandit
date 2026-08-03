"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Images } from "lucide-react";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DAS GUTHABEN IM KOPF DER SEITE (Owner 03.08.2026: „könnte das Guthaben im Header stehen?
 * vielleicht benutzt er das für was anderes noch — mit Icon bitte").
 *
 * Der Gedanke dahinter: Das Guthaben ist GELD, kein Kuss-Detail. Wer 9,99 aufgeladen und
 * 1,49 ausgegeben hat, traegt 8,50 € mit sich herum — und soll sie auf JEDER Seite sehen,
 * nicht nur tief im Kuss-Trichter. Was sichtbar ist, wird ausgegeben; was unsichtbar ist,
 * fuehlt sich weg an (dieselbe Lehre wie bei der Kontostand-Zeile im Trichter).
 *
 * WEN WIR KENNEN: die eingetippte Kuss-Adresse (lb_kiss_mail) oder das angemeldete Konto.
 * Ohne Adresse zeigt der Chip NICHTS — einem Fremden „0,00 €" an den Kopf zu stellen waere
 * eine Abweisung, keine Auskunft. Der Klick fuehrt zum Kuss-Trichter: Dort wohnt der
 * Aufladen-Knopf.
 *
 * Aktualisiert sich beim Fensterwechsel (`focus`): Wer im Kassen-Popup aufgeladen hat und
 * zurueckkommt, sieht den neuen Stand, ohne neu zu laden.
 */
export default function GuthabenChip() {
  const [cents, setCents] = useState<number | null>(null);

  useEffect(() => {
    let weg = false;
    const holen = () => {
      let mail = "";
      try { mail = getStoredAuthSession()?.user?.email ?? ""; } catch { /**/ }
      if (!mail) { try { mail = localStorage.getItem("lb_kiss_mail") ?? ""; } catch { /**/ } }
      if (!mail.trim()) { setCents(null); return; }
      fetch(`/api/kiss-status?email=${encodeURIComponent(mail.trim())}`, { cache: "no-store" })
        .then(r => r.json())
        .then(d => { if (!weg && typeof d?.walletCents === "number") setCents(d.walletCents); })
        .catch(() => {});
    };
    holen();
    window.addEventListener("focus", holen);
    return () => { weg = true; window.removeEventListener("focus", holen); };
  }, []);

  /**
   * DANEBEN DIE GALERIE (Owner 03.08.2026: „mach ein Button neben Konto im Header zu My
   * Galerie, ähnlich wie mein Konto"). Beide gehoeren zusammen: Das eine ist sein Geld, das
   * andere das, was er dafuer bekommen hat. Die Galerie erscheint unter derselben Bedingung
   * wie das Konto — wir kennen ihn. Ein Fremder haette dort ohnehin nur die Leere stehen.
   */
  if (typeof cents !== "number") return null;
  const chip = "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-black transition active:scale-95";
  return (
    <span className="flex items-center gap-2">
      <Link href="/themes/kiss" aria-label="Guthaben"
        className={`${chip} border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]`}>
        <Wallet className="h-3.5 w-3.5" />
        {(cents / 100).toFixed(2).replace(".", ",")} €
      </Link>
      <Link href="/my-gallery" aria-label="My Gallery"
        className={`${chip} border-white/20 bg-white/5 text-white/85`}>
        <Images className="h-3.5 w-3.5" />
        Galerie
      </Link>
    </span>
  );
}
