"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck2 } from "lucide-react";
import { Knopf, Fehlerzeile, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";

/**
 * DIE ABO-KARTE DES BESITZERS (Owner-Seitentext 24.08.2026: „4,99 im Monat — Seite bleibt
 * online, monatlich kündbar. Ohne Abo bleibt deine Seite 3 Tage
 * erreichbar.").
 *
 * NUR FÜR DEN BESITZER — dieselbe Server-Besitzprüfung wie das Korrektur-Feld
 * (`GET /api/lebenslauf-korrektur`); ein Fremder mit dem Link sieht nichts. Läuft das Abo,
 * zeigt die Karte nur den stillen Status. Die Kasse öffnet im Fenster/Popup (Muster
 * `kassenFenster`); nach der Rückkehr bestätigt `?abo=1&abocs=…` die Sitzung serverseitig
 * und lädt neu — der Webhook fängt zusätzlich den geschlossenen Browser auf.
 */

const TEXTE: Record<string, { titel: string; zeile: string; knopf: string; aktiv: string; laeuft: string; frist: (tage: number) => string }> = {
  de: {
    titel: "Seite dauerhaft online",
    zeile: "im Monat — deine Bewerbungen und Daten bleiben online, monatlich kündbar.",
    knopf: "Abo starten",
    aktiv: "Dein Abo läuft — deine Bewerbungen bleiben online.",
    laeuft: "Kasse öffnet …",
    frist: t => t > 0 ? `Ohne Abo bleibt deine Seite noch ${t} Tag${t === 1 ? "" : "e"} erreichbar.` : "Die drei Tage sind vorbei — mit dem Abo ist deine Seite sofort wieder online.",
  },
  en: {
    titel: "Keep your page online",
    zeile: "per month — your applications and data stay online, cancel monthly.",
    knopf: "Start subscription",
    aktiv: "Your subscription is active — your applications stay online.",
    laeuft: "Opening checkout …",
    frist: t => t > 0 ? `Without it your page stays reachable for ${t} more day${t === 1 ? "" : "s"}.` : "The three days are over — with the subscription your page is back online immediately.",
  },
};

export default function ProfilAbo({ id, aboAktiv, monatPreis, restTage, lang = "en" }: {
  id: string;
  aboAktiv: boolean;
  /** Fertig formatiert vom Server (eur aus lib/pricing) — nie hier getippt. */
  monatPreis: string;
  restTage: number;
  lang?: string;
}) {
  const t = TEXTE[lang] ?? TEXTE.en;
  const [darf, setDarf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const rueckkehrRef = useRef(false);

  useEffect(() => {
    let device = "", pin = "", tok = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    fetch(`/api/lebenslauf-korrektur?id=${encodeURIComponent(id)}&device=${encodeURIComponent(device)}`, {
      headers: { ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      cache: "no-store",
    }).then(r => r.json()).then(d => setDarf(d?.darf === true)).catch(() => setDarf(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Die Rückkehr von der Abo-Kasse: Sitzung serverseitig bestätigen, dann neu laden — was
     danach steht, steht wirklich im Speicher. */
  useEffect(() => {
    if (rueckkehrRef.current) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("abo") !== "1") return;
    const cs = q.get("abocs") ?? "";
    rueckkehrRef.current = true;
    q.delete("abo"); q.delete("abocs");
    const rest = q.toString();
    window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    if (!cs) return;
    void fetch(`/api/lebenslauf-abo-checkout?id=${encodeURIComponent(id)}&session=${encodeURIComponent(cs)}`)
      .then(r => r.json())
      .then(d => { if (d?.aktiv) window.location.reload(); })
      .catch(() => { /* der Webhook holt es nach */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!darf) return null;

  const starten = async () => {
    if (busy) return;
    setBusy(true); setFehler("");
    const popup = kassenFenster();
    try {
      const r = await fetch("/api/lebenslauf-abo-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, returnTo: window.location.pathname }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.url) {
        try { popup?.close(); } catch { /**/ }
        setFehler(String(d?.error ?? "Hat nicht geklappt — bitte noch einmal."));
        setBusy(false);
        return;
      }
      if (kasseOeffnen(popup, d.url) !== "popup") { setBusy(false); return; }
      /* Popup offen: auf die Rückkehr-Parameter verlassen wir uns nicht — pollen bis die
         Sitzung bezahlt ist, dann neu laden (dasselbe Muster wie der Kauf im Trichter). */
      for (let i = 0; i < 100; i++) {
        await new Promise(res => setTimeout(res, 3000));
        const s = await fetch(`/api/lebenslauf-abo-checkout?id=${encodeURIComponent(id)}&session=${encodeURIComponent(String(d.sessionId ?? ""))}`)
          .then(x => x.json()).catch(() => null);
        if (s?.aktiv) { try { popup?.close(); } catch { /**/ } window.location.reload(); return; }
        if (popup?.closed && i > 2) break;
      }
      setBusy(false);
    } catch {
      try { popup?.close(); } catch { /**/ }
      setFehler(lang === "de" ? "Keine Verbindung — bitte noch einmal." : "No connection — please try again.");
      setBusy(false);
    }
  };

  return (
    /* STILLE INFO AUF SCHWARZ, GANZ UNTEN (Owner 25.08.2026, zur Box-Fassung: „das hat in
       einer Box nicht zu suchen. Muss unter alles als Info auf Schwarz.") — kein Kasten,
       keine Karte: Das Abo ist Verwaltung, kein Verkaufsauftritt auf dieser Seite. */
    <section className="mt-8 md:mt-10">
        <p className="flex items-center gap-2 text-[13px] font-black leading-snug text-white/85">
          <CalendarCheck2 className="h-4 w-4 shrink-0" />{t.titel}
        </p>
        {aboAktiv ? (
          <p className="mt-2 text-[12.5px] font-bold leading-snug text-white/60">{t.aktiv}</p>
        ) : busy ? (
          <div className="mt-3"><Laden art="flaeche" text={t.laeuft} /></div>
        ) : (
          <>
            <p className="mt-2 text-[12.5px] font-bold leading-snug text-white/60">
              <span className="font-black text-white/90">{monatPreis}</span> {t.zeile}
            </p>
            <p className="mt-1.5 text-[11.5px] font-bold leading-snug text-white/45">{t.frist(restTage)}</p>
            <Fehlerzeile>{fehler}</Fehlerzeile>
            {/* GOLD (Owner 25.08.2026: „Gelber Button als CTA") — im Bearbeiten-Modus ist
                die Firmen-Fläche samt ihrem Gold ausgeblendet; das Abo ist dort der eine
                Kauf-Knopf des Bildschirms (Skill `ci-design`: genau einer). */}
            <div className="mt-3">
              <Knopf art="gold" onClick={() => void starten()}>{`${t.knopf} — ${monatPreis}`}</Knopf>
            </div>
          </>
        )}
    </section>
  );
}
