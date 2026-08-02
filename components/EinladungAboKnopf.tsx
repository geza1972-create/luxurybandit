"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * DER EINLADUNGS-ABO-KNOPF (Ä11, Owner 02.08.2026: „für 1,49 bekommt er die Einladung ohne
 * die anderen Features. Wenn er die auch nutzen will, dann muss er gleich Abo abschliessen").
 *
 * EIN Baustein für ZWEI Stellen, die dieselbe Kasse brauchen: den Abo-Kasten in
 * `EinladungBearbeiten.tsx` (Einladung noch in der Probezeit) und den Reaktivierungs-Kasten
 * in `app/einladung/[id]/page.tsx` (Probezeit schon abgelaufen). Beide zeigten bisher einen
 * `<Link href="/themes/wedding?abo=1&e=…">` — einen Link, den nichts im Code auswertete.
 * Zwei Kopien derselben Kassen-Logik würden bei der nächsten Korrektur auseinanderlaufen,
 * darum genau EINE Stelle.
 *
 * `?abopaid=1&cs=<sitzung>` kommt aus der `successUrl` von `/api/einladung-abo-checkout` —
 * derselbe Rückkehr-Mechanismus wie `PaidReturn.tsx` fürs Themen-Abo. Wir behaupten die
 * Zahlung nie selbst: `/api/checkout-status` fragt Stripe und setzt bei Erfolg serverseitig
 * `bezahlt: true` auf GENAU dieser Einladung (`einladungAboVermerken`). Ein voller Reload
 * danach holt die Seite komplett neu vom Server — kein zweiter Wahrheitsstand im Browser.
 */
export default function EinladungAboKnopf({ einladungId, label, pruefText }: {
  einladungId: string;
  /** Fertig übersetzter und mit `fillPrices` gefüllter Knopftext. */
  label: string;
  /** Fertig übersetzter Text für „Zahlung wird bestätigt …". */
  pruefText: string;
}) {
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("abopaid") !== "1") return;
    const cs = q.get("cs") ?? "";
    if (!cs) return;
    setChecking(true);
    fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`)
      .then(r => r.json())
      .then(d => {
        if (d?.paid) { window.location.href = window.location.pathname; return; }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const starten = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const d = await fetch("/api/einladung-abo-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ einladungId }),
      }).then(r => r.json());
      if (d?.url) { window.location.href = d.url; return; }
    } catch { /* Netzwerkfehler — der Knopf steht danach einfach wieder da */ }
    setBusy(false);
  };

  if (checking) {
    return (
      <p className="mt-3 flex items-center justify-center gap-2 text-[13px] font-bold text-white/85">
        <Loader2 className="h-4 w-4 animate-spin" /> {pruefText}
      </p>
    );
  }

  return (
    <button type="button" onClick={() => void starten()} disabled={busy}
      className="lb-gold mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black active:scale-95 transition disabled:opacity-60">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
}
