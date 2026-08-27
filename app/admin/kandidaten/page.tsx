"use client";

import { useEffect, useMemo, useState } from "react";
import { Eingabe, Knopf, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { branchenName } from "@/lib/branchen";

/**
 * DER INTERNE KANDIDATEN-POOL (Owner-Änderungsauftrag 26.08.2026,
 * KONZEPT-JOB-MATCH-TRICHTER.md Baustelle G) — NUR für LuxuryBandit, kein
 * Arbeitgeber-Login, kein Export-Automatismus, kein Weiterleiten-Knopf. Vorstellen bei
 * Arbeitgebern läuft im MVP von Hand. Dasselbe PIN-Gerüst wie `/admin/chancen`.
 *
 * „IM POOL" = `einwilligung.status === 'erteilt'` — ein Eintrag ohne diesen Status ist
 * gespeichert, aber NICHT vorstellbar; die Liste zeigt den Status deutlich, statt beides
 * zu vermischen.
 */

type Kandidat = {
  kandidatId: string; name?: string; email?: string; land?: string; stadt?: string;
  sprachen?: { sprache: string; niveau?: string }[];
  empfohleneRollen?: string[]; matchProzent?: number; matchEmpfehlung?: "gut" | "bruecke" | "schwach";
  umzug?: "ja" | "vielleicht" | "nein"; umzugLaender?: string[];
  verfuegbarkeit?: "sofort" | "2wochen" | "1monat" | "spaeter";
  interessenChancenIds?: string[];
  kontaktierteChancenIds?: string[];
  altersgruppe?: string; telefon?: string; jahreErfahrung?: string;
  ausbildungsstand?: string; fuehrerschein?: string[]; mitCv?: boolean;
  bewerbungNote?: "top" | "solide" | "schwach"; bewerbungProzent?: number;
  sucheIntent?: "sofort" | "monate" | "schauen";
  deutschSelbst?: string; deutschGetestet?: string; schreibprobe?: string;
  branchen?: string[]; aktuellerBeruf?: string; videoMeinung?: string;
  premiumInteresse?: boolean; premiumAm?: string; premiumKontaktiertAm?: string;
  aktualisiertAm: string;
  einwilligung: { status: "offen" | "erteilt" | "abgelehnt"; am?: string };
};

type Chance = { id: string; rolle: string; land: string };

const VERFUEGBAR_LABEL: Record<string, string> = { sofort: "Sofort", "2wochen": "2 Wochen", "1monat": "1 Monat", spaeter: "Später" };

export default function KandidatenAdminSeite() {
  const [pin, setPin] = useState("");
  const [ready, setReady] = useState(false);
  const [darf, setDarf] = useState(false);
  const [kandidaten, setKandidaten] = useState<Kandidat[]>([]);
  const [chancenNamen, setChancenNamen] = useState<Record<string, string>>({});
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");

  const [nurEingewilligt, setNurEingewilligt] = useState(false);
  const [nurUmzug, setNurUmzug] = useState(false);
  const [nurOffeneKontakte, setNurOffeneKontakte] = useState(false);
  const [mindestMatch, setMindestMatch] = useState("");

  const kopf = (p = pin) => {
    let tok = "";
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(p ? { "x-try-look-admin-pin": p } : {}) };
  };

  const laden = async (p = pin) => {
    setLaedt(true); setFehler("");
    try {
      const r = await fetch("/api/kandidat", { headers: kopf(p), cache: "no-store" });
      if (!r.ok) { setDarf(false); setFehler(r.status === 403 ? "" : "Konnte Liste nicht laden."); setLaedt(false); return; }
      const d = await r.json();
      setDarf(true);
      setKandidaten(Array.isArray(d?.kandidaten) ? d.kandidaten : []);
      try {
        const rc = await fetch("/api/job-chancen", { headers: kopf(p), cache: "no-store" });
        const dc = await rc.json();
        const namen: Record<string, string> = {};
        for (const c of (Array.isArray(dc?.chancen) ? dc.chancen : []) as Chance[]) namen[c.id] = `${c.rolle} (${c.land})`;
        setChancenNamen(namen);
      } catch { /* Jobtitel sind Zugabe — die Kandidatenliste zeigt sich trotzdem */ }
    } catch { setFehler("Keine Verbindung."); }
    setLaedt(false);
  };

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p); setReady(true);
    void laden(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pinEingeben = () => {
    try { localStorage.setItem("luxurybandit-try-look-admin-pin", pin); } catch { /**/ }
    void laden(pin);
  };

  const gefiltert = useMemo(() => {
    const min = Number(mindestMatch) || 0;
    return kandidaten.filter(k => {
      if (nurEingewilligt && k.einwilligung.status !== "erteilt") return false;
      if (nurUmzug && k.umzug !== "ja" && k.umzug !== "vielleicht") return false;
      if (min > 0 && (k.matchProzent ?? 0) < min) return false;
      if (nurOffeneKontakte) {
        const offen = (k.interessenChancenIds ?? []).some(id => !(k.kontaktierteChancenIds ?? []).includes(id));
        if (!offen) return false;
      }
      return true;
    });
  }, [kandidaten, nurEingewilligt, nurUmzug, nurOffeneKontakte, mindestMatch]);

  /* DIE 48-STUNDEN-ZUSAGE (Owner 26.08.2026) — wie viele Stunden sind schon vorbei?
     Ein Rückstand soll ins Auge fallen, nicht in einer Liste untergehen. */
  const stundenSeit = (ts?: string) => {
    if (!ts) return 0;
    const ms = Date.now() - (Date.parse(ts) || Date.now());
    return Math.max(0, Math.floor(ms / (60 * 60 * 1000)));
  };
  const premiumOffen = kandidaten.filter(k => k.premiumInteresse && !k.premiumKontaktiertAm);
  const premiumUeberfaellig = premiumOffen.filter(k => stundenSeit(k.premiumAm) > 48);

  const premiumUmschalten = async (kandidatId: string, kontaktiert: boolean) => {
    setKandidaten(prev => prev.map(k => k.kandidatId === kandidatId
      ? { ...k, premiumKontaktiertAm: kontaktiert ? new Date().toISOString() : undefined } : k));
    try {
      await fetch("/api/premium-interesse", { method: "PATCH", headers: kopf(), body: JSON.stringify({ kandidatId, kontaktiert }) });
    } catch { /* der Klick steht sofort; ein Netzfehler holt das Neuladen zurück */ }
  };

  const kontaktUmschalten = async (kandidatId: string, chanceId: string, kontaktiert: boolean) => {
    setKandidaten(prev => prev.map(k => {
      if (k.kandidatId !== kandidatId) return k;
      const bisher = new Set(k.kontaktierteChancenIds ?? []);
      if (kontaktiert) bisher.add(chanceId); else bisher.delete(chanceId);
      return { ...k, kontaktierteChancenIds: Array.from(bisher) };
    }));
    try {
      await fetch("/api/kandidat", { method: "PATCH", headers: kopf(), body: JSON.stringify({ kandidatId, chanceId, kontaktiert }) });
    } catch { /* die Liste zeigt den Klick sofort — ein Netzwerkfehler holt sich der Admin per Neuladen zurück */ }
  };

  const wann = (ts?: string) => {
    if (!ts) return "";
    try { return new Date(ts).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return ts; }
  };

  if (!ready) return null;

  if (!darf) {
    return (
      <main className="lb-bg flex min-h-screen items-center justify-center px-4 text-white">
        <div className="w-full max-w-xs rounded-2xl border border-white/15 bg-white/[0.04] p-5">
          <p className="text-[13px] font-black text-white/85">Admin-PIN</p>
          <Eingabe type="password" className="mt-3" placeholder="PIN" value={pin}
            onChange={e => setPin(e.target.value)} onKeyDown={e => { if (e.key === "Enter") pinEingeben(); }} />
          <div className="mt-3"><Knopf art="gold" onClick={pinEingeben}>Anmelden</Knopf></div>
        </div>
      </main>
    );
  }

  return (
    <main className="lb-bg min-h-screen px-4 pb-24 pt-8 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-[22px] font-black">Kandidaten-Pool</h1>
        <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/60">
          Wer sein Interesse gezeigt hat — „Freigegeben" heisst: darf passenden Arbeitgebern vorgestellt werden.
          Vorstellen läuft von Hand, es gibt keine automatische Weitergabe.
        </p>

        {/* DER ZÄHLER GANZ OBEN — was zugesagt und noch nicht getan ist. */}
        {premiumOffen.length > 0 && (
          <div className={`mt-4 rounded-2xl border p-3.5 ${premiumUeberfaellig.length
            ? "border-red-400/50 bg-red-400/10" : "border-[#f6cf51]/40 bg-[#f6cf51]/10"}`}>
            <p className={`text-[14px] font-black ${premiumUeberfaellig.length ? "text-red-300" : "text-[#f6cf51]"}`}>
              {premiumOffen.length} Premium-Rückruf{premiumOffen.length === 1 ? "" : "e"} offen
              {premiumUeberfaellig.length > 0 && ` · ${premiumUeberfaellig.length} über 48 Stunden`}
            </p>
            <p className="mt-1 text-[12px] font-bold text-white/55">
              Du hast Rückruf innerhalb von 48 Stunden zugesagt. Abhaken, sobald du angerufen hast.
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Knopf art="chip" aktiv={nurEingewilligt} onClick={() => setNurEingewilligt(v => !v)}>Nur freigegeben</Knopf>
          <Knopf art="chip" aktiv={nurUmzug} onClick={() => setNurUmzug(v => !v)}>Umzugsbereit</Knopf>
          <Knopf art="chip" aktiv={nurOffeneKontakte} onClick={() => setNurOffeneKontakte(v => !v)}>Noch nicht kontaktiert</Knopf>
          <div className="w-32">
            <Eingabe type="number" placeholder="Min. Match %" value={mindestMatch} onChange={e => setMindestMatch(e.target.value)} />
          </div>
        </div>

        {laedt && <div className="mt-6"><Laden art="flaeche" text="Lädt …" /></div>}
        {fehler && <p className="mt-4 text-[13px] font-bold text-red-400">{fehler}</p>}
        {!laedt && gefiltert.length === 0 && !fehler && (
          <p className="mt-6 text-[13px] font-bold text-white/50">Noch niemand im Pool.</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {gefiltert.map(k => (
            <div key={k.kandidatId} className="rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-[14px] font-black text-white/90">{k.name || k.email || k.kandidatId.slice(0, 8)}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${
                  k.einwilligung.status === "erteilt" ? "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]"
                  : k.einwilligung.status === "abgelehnt" ? "border-white/20 bg-white/5 text-white/50"
                  : "border-red-400/40 bg-red-400/10 text-red-300"}`}>
                  {k.einwilligung.status === "erteilt" ? "Freigegeben" : k.einwilligung.status === "abgelehnt" ? "Abgelehnt" : "Nur gespeichert"}
                </span>
                {typeof k.matchProzent === "number" && (
                  <span className="text-[12px] font-bold text-white/60">{k.matchProzent}% · {k.matchEmpfehlung ?? "—"}</span>
                )}
                {/* MIT/OHNE CV — sortieren statt aussortieren (Owner 26.08.2026): Die
                    Handwerker, Fahrer und Pflegekräfte im Pool haben oft kein CV-Dokument. */}
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${
                  k.mitCv ? "border-white/25 bg-white/10 text-white/70" : "border-white/15 bg-white/[0.03] text-white/40"}`}>
                  {k.mitCv ? "mit CV" : "ohne CV"}
                </span>
              </div>
              <p className="mt-1 text-[12px] font-bold text-white/55">
                {k.email || "ohne E-Mail"} · {k.telefon || "ohne Telefon"} · {[k.stadt, k.land].filter(Boolean).join(", ") || "Ort unbekannt"}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-white/45">
                {[k.altersgruppe && `${k.altersgruppe} Jahre`, k.jahreErfahrung && `${k.jahreErfahrung} Erfahrung`,
                  k.ausbildungsstand, k.fuehrerschein?.length && `FS: ${k.fuehrerschein.join(", ")}`]
                  .filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="mt-1 text-[11.5px] font-medium text-white/45">
                {(k.sprachen ?? []).map(s => `${s.sprache}${s.niveau ? ` ${s.niveau}` : ""}`).join(" · ") || "—"}
              </p>
              {/* GETESTET GEGEN BEHAUPTET (Owner 26.08.2026) — die Lücke ist das
                  Interessante: „sagt Sehr gut, Test zeigt B1" ändert jede Einschätzung. */}
              {(k.deutschGetestet || k.deutschSelbst) && (
                <p className="mt-1 text-[11.5px] font-bold text-white/55">
                  Deutsch: <span className="text-white/85">{k.deutschGetestet || "nicht getestet"}</span>
                  {k.deutschSelbst ? <span className="text-white/40"> · sagt selbst: {k.deutschSelbst}</span> : null}
                </p>
              )}
              {/* DIE SCHREIBPROBE IM WORTLAUT (Owner 26.08.2026) — zwei Sätze, in 30
                  Sekunden selbst getippt. Kein Urteil einer KI dazwischen: Du liest, wie
                  er schreibt, und entscheidest selbst. */}
              {!!k.schreibprobe && (
                <p className="mt-2 rounded-xl border border-white/10 bg-black/30 p-2.5 text-[12.5px] font-medium italic leading-snug text-white/70">
                  „{k.schreibprobe}"
                </p>
              )}
              {!!k.sucheIntent && (
                <p className={`mt-1 text-[11.5px] font-black ${
                  k.sucheIntent === "sofort" ? "text-[#4ade80]"
                  : k.sucheIntent === "monate" ? "text-[#f6cf51]" : "text-white/35"}`}>
                  {k.sucheIntent === "sofort" ? "Sucht sofort"
                    : k.sucheIntent === "monate" ? "Sucht in den nächsten Monaten" : "Schaut nur"}
                </p>
              )}
              {!!k.empfohleneRollen?.length && (
                <p className="mt-1 text-[11.5px] font-medium text-white/45">Will: {k.empfohleneRollen.join(", ")}</p>
              )}
              {/* WORAUF ER SICH BEWERBEN WILL (Owner 26.08.2026: „ich muss alles sehen,
                  auch, auf was er sich bewerben will, damit ich ihn kontaktieren kann") —
                  die angekreuzten Branchen aus der Checkliste am Ende des Chats. */}
              {!!k.branchen?.length && (
                <p className="mt-1 text-[12px] font-bold text-[#f6cf51]/90">
                  Sucht in: {k.branchen.map(branchenName).join(" · ")}
                </p>
              )}
              {!!k.aktuellerBeruf && (
                <p className="mt-1 text-[11.5px] font-medium text-white/45">Zuletzt: {k.aktuellerBeruf}</p>
              )}
              {k.premiumInteresse && (
                <div className="mt-2">
                  <button type="button" onClick={() => premiumUmschalten(k.kandidatId, !k.premiumKontaktiertAm)}
                    className={`rounded-full border px-3 py-1.5 text-[11.5px] font-black transition ${
                      k.premiumKontaktiertAm ? "border-white/15 bg-white/[0.03] text-white/40 line-through"
                      : stundenSeit(k.premiumAm) > 48 ? "border-red-400/50 bg-red-400/15 text-red-300"
                      : "border-[#f6cf51]/50 bg-[#f6cf51]/15 text-[#f6cf51]"}`}>
                    {k.premiumKontaktiertAm
                      ? "✓ Premium: angerufen"
                      : `Premium 100 € · anrufen (seit ${stundenSeit(k.premiumAm)} h)`}
                  </button>
                </div>
              )}
              {!!k.interessenChancenIds?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {k.interessenChancenIds.map(id => {
                    const kontaktiert = (k.kontaktierteChancenIds ?? []).includes(id);
                    return (
                      <button key={id} type="button" onClick={() => kontaktUmschalten(k.kandidatId, id, !kontaktiert)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                          kontaktiert ? "border-white/15 bg-white/[0.03] text-white/40 line-through"
                          : "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]"}`}>
                        {kontaktiert ? "✓ Firma kontaktiert" : "Firma kontaktieren"} · {chancenNamen[id] ?? id}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-white/35">
                Umzug: {k.umzug ?? "—"}{k.umzugLaender?.length ? ` (${k.umzugLaender.join(", ")})` : ""}
                {" · "}Verfügbar: {k.verfuegbarkeit ? VERFUEGBAR_LABEL[k.verfuegbarkeit] : "—"}
                {" · "}{wann(k.aktualisiertAm)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
