"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

/**
 * DIE KUNDEN-STATISTIK-SEITE (Owner 01.09.2026: „Der Kunde muss immer die Statistik sehen
 * mit Passwort.").
 *
 * EIN PASSWORT, KEIN KONTO: passt zu `lib/kunden-store.ts` — ein Kunde ist eine Firma, kein
 * einzelner Nutzer. Das Passwort landet im `localStorage` unter dem Kunden-Slug, damit er es
 * nicht bei jedem Besuch neu tippen muss; der Server prüft es bei jedem Abruf trotzdem neu
 * (siehe app/api/kunden/route.ts, Aktion "stats") — es gibt keine Sitzung, die man stehlen
 * könnte, nur ein wiederverwendetes Passwort.
 */

type Stats = {
  kunde: { name: string; branche: string };
  summe: { gesamt: number; mitGehalt: number; gehaltMedian: number | null; offenFuerAngebote: number; aktivSuchend: number };
  beispiel: { beruf: string; sprachen: { sprache: string; niveau: string }[]; ort: string; land: string; situation: string; motive: string[]; wechselGehalt: string } | null;
};

const SITUATION_TEXT: Record<string, string> = {
  employed_satisfied: "Hat einen Job und ist zufrieden",
  employed_open: "Hat einen Job, wäre aber offen für Besseres",
  actively_searching: "Sucht aktiv",
  unemployed: "Aktuell ohne Job",
  self_employed: "Selbstständig",
  other: "Andere Situation",
};

function keyFor(slug: string) { return `lb-kunde-pw-${slug}`; }

export default function KundenStatistik() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "");
  const [passwort, setPasswort] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");
  const [pruefeGespeichertes, setPruefeGespeichertes] = useState(true);

  const holen = async (pw: string) => {
    setLaden(true); setFehler("");
    try {
      const res = await fetch("/api/kunden", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stats", slug, passwort: pw }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setFehler(data.error || "Anmeldung fehlgeschlagen.");
        try { localStorage.removeItem(keyFor(slug)); } catch { /* egal */ }
        setStats(null);
        return;
      }
      setStats(data);
      try { localStorage.setItem(keyFor(slug), pw); } catch { /* egal */ }
    } catch {
      setFehler("Verbindung fehlgeschlagen.");
    } finally {
      setLaden(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    let gespeichert = "";
    try { gespeichert = localStorage.getItem(keyFor(slug)) ?? ""; } catch { /* egal */ }
    if (gespeichert) { setPasswort(gespeichert); void holen(gespeichert); }
    else setPruefeGespeichertes(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => { if (!laden) setPruefeGespeichertes(false); }, [laden]);

  if (pruefeGespeichertes) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f2e9]">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f2e9] px-4">
        <form
          onSubmit={e => { e.preventDefault(); void holen(passwort); }}
          className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black/5">
            <Lock className="h-5 w-5 text-black/60" />
          </div>
          <h1 className="mt-4 text-xl font-black text-black">Statistik-Zugang</h1>
          <p className="mt-1 text-sm font-semibold text-black/50">Passwort eingeben, um Ihre Zahlen zu sehen.</p>
          <input
            type="password" value={passwort} onChange={e => setPasswort(e.target.value)} placeholder="Passwort"
            className="mt-4 h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-[15px] font-semibold text-black outline-none focus:border-black" />
          {fehler && <p className="mt-2 text-[13px] font-bold text-red-500">{fehler}</p>}
          <button type="submit" disabled={laden || !passwort.trim()}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-[15px] font-black text-white disabled:opacity-40">
            {laden ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anmelden"}
          </button>
        </form>
      </main>
    );
  }

  const b = stats.beispiel;
  return (
    <main className="min-h-screen bg-[#f6f2e9] px-4 py-8 text-black">
      <div className="mx-auto w-full max-w-lg">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-black/40">Statistik</p>
        <h1 className="mt-1 text-2xl font-black leading-tight">{stats.kunde.name}</h1>
        {stats.kunde.branche && <p className="mt-1 text-sm font-bold text-black/50">{stats.kunde.branche}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-3xl font-black">{stats.summe.gesamt}</p>
            <p className="mt-0.5 text-[12px] font-bold text-black/50">Antworten insgesamt</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-3xl font-black">{stats.summe.offenFuerAngebote}</p>
            <p className="mt-0.5 text-[12px] font-bold text-black/50">Hätten einen Job, wären aber offen</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-3xl font-black">{stats.summe.aktivSuchend}</p>
            <p className="mt-0.5 text-[12px] font-bold text-black/50">Suchen bereits aktiv</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-3xl font-black">{stats.summe.gehaltMedian ? `${stats.summe.gehaltMedian} €` : "—"}</p>
            <p className="mt-0.5 text-[12px] font-bold text-black/50">Median Wechselgehalt</p>
          </div>
        </div>

        {stats.summe.gesamt === 0 && (
          <p className="mt-6 text-sm font-semibold text-black/50">
            Noch keine Antworten für diesen Funnel. Sobald jemand teilnimmt, erscheinen hier Zahlen und ein Beispielprofil.
          </p>
        )}

        {b && (
          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-black/40">Neuestes Beispielprofil</p>
            <div className="mt-3 grid gap-2 text-[14px]">
              {b.beruf && <div className="flex justify-between gap-3"><span className="font-bold text-black/50">Beruf</span><span className="text-right font-black">{b.beruf}</span></div>}
              {b.sprachen.length > 0 && <div className="flex justify-between gap-3"><span className="font-bold text-black/50">Sprachen</span><span className="text-right font-black">{b.sprachen.map(s => `${s.sprache} (${s.niveau.toUpperCase()})`).join(" · ")}</span></div>}
              {(b.ort || b.land) && <div className="flex justify-between gap-3"><span className="font-bold text-black/50">Ort</span><span className="text-right font-black">{[b.ort, b.land].filter(Boolean).join(", ")}</span></div>}
              {b.situation && <div className="flex justify-between gap-3"><span className="font-bold text-black/50">Situation</span><span className="text-right font-black">{SITUATION_TEXT[b.situation] ?? b.situation}</span></div>}
            </div>
            <p className="mt-3 text-[12px] font-semibold text-black/40">Anonymisiert — kein Name, keine Kontaktdaten.</p>
          </div>
        )}
      </div>
    </main>
  );
}
