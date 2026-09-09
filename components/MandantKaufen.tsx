"use client";

import { useEffect, useState } from "react";
import { useKasseImFenster } from "@/components/KasseImFenster";

/**
 * DAS DASHBOARD KAUFEN (Owner 09.09.2026: „wie soll ich den scharf schalten, wenn der Kunde
 * am Ende nichts kaufen kann und wir nichts bekommen?").
 *
 * ── WAS HIER VORHER STAND ──────────────────────────────────────────────────────────────────
 *
 * Ein Link auf `/contact?reason=versusforge`. Er sah aus wie ein Kaufknopf, führte aber auf
 * ein Kontaktformular — beim teuersten Produkt des Hauses. Wer entschlossen war zu zahlen,
 * landete bei „wir melden uns", und genau in dieser Stunde entscheidet sich ein Kauf.
 *
 * ── KASSE IN DER SEITE, NICHT ALS FENSTER ([[kasse-in-der-seite]]) ────────────────────────
 *
 * Dieselbe Bauart wie überall im Haus: `useKasseImFenster`, `key={clientSecret}` ist Pflicht.
 * Ein Popup wäre hier besonders schlimm — es ist der einzige Kauf, den jemand am Telefon
 * abschliesst, während er die Anfragen sehen will, die schon dastehen.
 *
 * ── DER RÜCKWEG PRÜFT SELBST ───────────────────────────────────────────────────────────────
 *
 * Nach der Zahlung kommt Stripe mit `?vf_kasse=…` zurück. Diese Sitzung wird eingelöst, und
 * ERST DANN steht der Trichter auf „scharf" — nicht auf Zuruf des Browsers. Wer die Adresse
 * mit einem erfundenen Parameter aufruft, schaltet nichts frei.
 *
 * ── EIN LADEZUSTAND, DER ENDET ([[immer-close-einbauen]]) ─────────────────────────────────
 *
 * Jeder Weg hier hat ein Ende: Erfolg, ehrlicher Fehler, oder der Knopf ist wieder da. Kein
 * Drehrad, das sich nie beruhigt.
 */
export default function MandantKaufen({ mandant, wort, klasse, k }: {
  mandant: string;
  /**
   * Der Dashboard-Schlüssel, wenn die Seite ihn kennt.
   *
   * ER IST DER BESITZNACHWEIS FÜR DEN PROBEKAUF (`VF_KAUF_PROBE`): kostenlos freischalten
   * darf nur, wer den Trichter besitzt. Auf der offenen Anzeigen-Seite gibt es ihn nicht —
   * dort führt derselbe Knopf zur Kasse.
   */
  k?: string;
  /** Was auf dem Knopf steht — der Preis kommt aus der Tabelle und wird oben gesetzt. */
  wort: string;
  klasse?: string;
}) {
  const kasse = useKasseImFenster("dashboard");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  /**
   * DIE RÜCKKEHR VON DER KASSE.
   *
   * Sie läuft einmal beim Laden: Steht `vf_kasse` in der Adresse, wird die Zahlung geprüft
   * und der Trichter scharf geschaltet. Danach wird der Parameter aus der Adresse GENOMMEN —
   * sonst löst ein Neuladen dieselbe Prüfung noch einmal aus, und im Verlauf des Browsers
   * steht eine Kassensitzung, die dort nichts zu suchen hat.
   */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sitzung = p.get("vf_kasse");
    if (!sitzung) return;
    void (async () => {
      setLaeuft(true);
      try {
        const res = await fetch("/api/versusforge-kasse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ was: "dashboard-einloesen", sessionId: sitzung, mandant, device: "dashboard" }),
        });
        const d = (await res.json()) as Record<string, unknown>;
        p.delete("vf_kasse");
        window.history.replaceState({}, "", `${window.location.pathname}${p.toString() ? `?${p}` : ""}`);
        /* Der Zustand steht jetzt auf dem Server — die Seite holt ihn beim Neuladen. */
        if (d.bezahlt) window.location.reload();
        else setFehler("Die Zahlung ist noch nicht bestätigt. Lade die Seite in einer Minute neu.");
      } catch {
        setFehler("Das liess sich gerade nicht prüfen.");
      } finally { setLaeuft(false); }
    })();
  }, [mandant]);

  const kaufen = async () => {
    if (laeuft) return;
    setLaeuft(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-kasse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was: "dashboard", mandant, device: "dashboard", eingebettet: kasse.anfordern, ...(k ? { k } : {}) }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Die Kasse liess sich gerade nicht öffnen.")); return; }
      /* Schon bezahlt oder als Admin freigeschaltet — dann gibt es nichts zu zahlen. */
      if (d.schon || d.adminFrei || d.probe) { window.location.reload(); return; }
      if (kasse.uebernehmen(String(d.clientSecret ?? ""))) return;
      if (d.url) { window.location.href = String(d.url); return; }
      setFehler("Die Kasse liess sich gerade nicht öffnen.");
    } catch {
      setFehler("Die Kasse liess sich gerade nicht öffnen.");
    } finally { setLaeuft(false); }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void kaufen()}
        disabled={laeuft}
        className={klasse ?? "mt-4 inline-block rounded-xl bg-[#1d6fd0] px-6 py-3.5 text-[16px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-60"}
      >
        {laeuft ? "…" : wort}
      </button>
      {fehler && <p className="mt-2 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}
      {kasse.block}
    </>
  );
}
