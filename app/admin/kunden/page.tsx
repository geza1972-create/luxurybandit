"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Loader2, ExternalLink, Check, Copy } from "lucide-react";

/**
 * DIE KUNDENLISTE (Owner 01.09.2026: „ich brauche auch in Admin eine Seite wo diese Kunden
 * stehen"). Jeder Kunde bekommt zwei Adressen automatisch — der Funnel unter `/joburi/[slug]`
 * und die passwortgeschützte Statistik unter `/kunde/[slug]` — nichts davon muss man sich
 * hier merken, beide stehen als Link direkt an der Zeile.
 */

const ADMIN_PIN_KEY = "luxurybandit-try-look-admin-pin";
function getPin() { try { return localStorage.getItem(ADMIN_PIN_KEY) ?? ""; } catch { return ""; } }

type Kunde = {
  slug: string; name: string; branche: string; berufPlatzhalter: string;
  passwort: string; aktiv: boolean; erstelltAm: string;
};
const LEER: Kunde = { slug: "", name: "", branche: "", berufPlatzhalter: "", passwort: "", aktiv: true, erstelltAm: "" };

export default function AdminKunden() {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Kunde | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [kopiert, setKopiert] = useState("");

  const headers = () => ({ "Content-Type": "application/json", "x-try-look-admin-pin": getPin() });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kunden", { headers: { "x-try-look-admin-pin": getPin() } });
      const data = await res.json();
      setKunden(data.kunden ?? []);
    } catch { setError("Konnte Kunden nicht laden."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim()) { setError("Name fehlt."); return; }
    setError(""); setSaving(true);
    try {
      const res = await fetch("/api/kunden", { method: "POST", headers: headers(), body: JSON.stringify({ action: "save", ...draft }) });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Speichern fehlgeschlagen."); return; }
      setKunden(data.kunden ?? []);
      setDraft(null);
    } catch { setError("Speichern fehlgeschlagen."); }
    finally { setSaving(false); }
  };

  const remove = async (slug: string) => {
    const res = await fetch("/api/kunden", { method: "POST", headers: headers(), body: JSON.stringify({ action: "delete", slug }) });
    const data = await res.json();
    if (data.kunden) setKunden(data.kunden);
  };

  const kopieren = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setKopiert(key); setTimeout(() => setKopiert(""), 1500); } catch { /* egal */ }
  };

  const field = "h-11 w-full rounded-md border border-black/10 bg-white px-3.5 text-sm font-semibold text-ink outline-none focus:border-cobalt";
  const label = "mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-ink/45";

  return (
    <main className="min-h-screen bg-[#fbfaf7] pb-24 text-ink">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="grid gap-2">
          <a href="/admin" className="inline-flex w-fit items-center gap-1.5 text-xs font-black text-ink/50 transition hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Zurück zum Dashboard
          </a>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">LuxuryBandit Admin</div>
          <h1 className="text-3xl font-black leading-none text-ink">Kunden</h1>
          <p className="max-w-2xl text-sm font-semibold leading-6 text-ink/55">
            Jeder Kunde bekommt einen eigenen Funnel (<code className="rounded bg-black/5 px-1">/joburi/[slug]</code>) und
            eine eigene, passwortgeschützte Statistik-Seite (<code className="rounded bg-black/5 px-1">/kunde/[slug]</code>).
          </p>
        </header>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => { setDraft({ ...LEER }); setError(""); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-black text-white active:scale-95 transition">
            <Plus className="h-4 w-4" /> Kunde anlegen
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-ink/30" /></div>
        ) : (
          <div className="mt-3 grid gap-3">
            {kunden.length === 0 && <p className="py-10 text-center text-sm font-bold text-ink/40">Noch keine Kunden.</p>}
            {kunden.map(k => {
              const funnelUrl = `/joburi/${k.slug}`;
              const statistikUrl = `/kunde/${k.slug}`;
              return (
                <div key={k.slug} className="rounded-xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-ink">{k.name}</p>
                        {!k.aktiv && <span className="rounded-full bg-black/8 px-2 py-0.5 text-[10px] font-black text-ink/50">deaktiviert</span>}
                      </div>
                      {k.branche && <p className="mt-0.5 text-[11px] font-bold text-ink/40">{k.branche}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <a href={funnelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-cobalt">
                          {funnelUrl} <ExternalLink className="h-3 w-3" />
                        </a>
                        <a href={statistikUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-cobalt">
                          {statistikUrl} <ExternalLink className="h-3 w-3" />
                        </a>
                        <button type="button" onClick={() => void kopieren(k.passwort, k.slug)}
                          className="inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-bold text-ink/60">
                          {kopiert === k.slug ? <><Check className="h-3 w-3" /> kopiert</> : <><Copy className="h-3 w-3" /> Passwort kopieren</>}
                        </button>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => { setDraft({ ...k }); setError(""); }}
                        className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-black text-ink active:scale-95 transition">Bearbeiten</button>
                      <button type="button" onClick={() => void remove(k.slug)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-black/10 text-ink/40 hover:text-red-500 active:scale-95 transition"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {draft && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={e => { if (e.target === e.currentTarget) setDraft(null); }}>
            <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl">
              <p className="text-lg font-black text-ink">{draft.erstelltAm ? "Kunde bearbeiten" : "Kunde anlegen"}</p>
              <div className="mt-4 grid gap-3">
                <div><span className={label}>Name der Firma</span><input className={field} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Pflegehaus Sonnenhof" /></div>
                <div><span className={label}>Branche / Rolle</span><input className={field} value={draft.branche} onChange={e => setDraft({ ...draft, branche: e.target.value })} placeholder="Krankenpfleger für ein Pflegehaus" /></div>
                <div><span className={label}>Platzhalter im Beruf-Feld</span><input className={field} value={draft.berufPlatzhalter} onChange={e => setDraft({ ...draft, berufPlatzhalter: e.target.value })} placeholder="z. B. Krankenpfleger, Altenpfleger" /></div>
                <div><span className={label}>Passwort für die Statistik-Seite</span><input className={field} value={draft.passwort} onChange={e => setDraft({ ...draft, passwort: e.target.value })} placeholder="wird dem Kunden mitgeteilt" /></div>
                <label className="flex items-center gap-2 text-sm font-black text-ink">
                  <button type="button" onClick={() => setDraft({ ...draft, aktiv: !draft.aktiv })}
                    className={`grid h-5 w-5 place-items-center rounded border ${draft.aktiv ? "border-cobalt bg-cobalt text-white" : "border-black/20 bg-white"}`}>
                    {draft.aktiv && <Check className="h-3.5 w-3.5" />}
                  </button>
                  Aktiv (Funnel und Statistik-Seite erreichbar)
                </label>
              </div>
              {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setDraft(null)} className="h-12 flex-1 rounded-2xl border border-black/10 text-sm font-black text-ink/60 active:scale-95 transition">Abbrechen</button>
                <button type="button" onClick={() => void save()} disabled={saving}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-black text-sm font-black text-white disabled:opacity-50 active:scale-95 transition">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
