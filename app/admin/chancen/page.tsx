"use client";

import { useEffect, useState } from "react";
import { Trash2, Pencil, Plus, X as XIcon } from "lucide-react";
import { Eingabe, EingabeMehrzeilig, Knopf, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DIE ADMIN-VERWALTUNG DES JOBCHANCEN-POOLS (Owner-Auftrag 26.08.2026,
 * KONZEPT-JOB-MATCH-TRICHTER.md Baustelle D) — dasselbe kleine PIN-Gerüst wie
 * `/admin/lebenslauf-spiele`. Der Fünf-Schritte-Workflow steht im Editor:
 * Link/Text einfügen → KI neutralisiert → Admin prüft/ändert die Felder → Admin
 * bestätigt „Als neutrale Marktchance geprüft" → erst danach lässt sich die Chance
 * aktivieren. `intern.*` (Firma, Original, Quelle) bleibt sichtbar NUR hier im
 * Admin — kein Kandidat sieht diese Route je.
 */

type Remote = "remote" | "hybrid" | "vorOrt";
type QuellenStatus = "manuell_geprueft" | "partner" | "unklar";
type JobChance = {
  id: string; aktiv: boolean; partnerFreigabe: boolean;
  rolle: string; land: string; stadt?: string; remote: Remote;
  sprachen: string[]; gehalt?: string; umzugNoetig?: boolean;
  anforderungen: string[]; quereinstiegGeeignet: boolean;
  kurzbeschreibung: string; kategorie: string; hinzugefuegtAm: string;
  intern: {
    firma?: string; originalTitel?: string; originalText?: string;
    quelleUrl?: string; quellePlattform?: string; quelleDatum?: string; notizen?: string;
    quellenStatus: QuellenStatus;
  };
};

type Entwurf = {
  id: string; aktiv: boolean; partnerFreigabe: boolean; bestaetigt: boolean;
  rolle: string; land: string; stadt: string; remote: Remote;
  sprachenText: string; gehalt: string; umzugNoetig: boolean;
  anforderungenText: string; quereinstiegGeeignet: boolean;
  kurzbeschreibung: string; kategorie: string;
  internFirma: string; internOriginalTitel: string; internOriginalText: string;
  internQuelleUrl: string; internQuellePlattform: string; internNotizen: string;
  quellenStatus: QuellenStatus;
};

const LEER: Entwurf = {
  id: "", aktiv: false, partnerFreigabe: false, bestaetigt: false,
  rolle: "", land: "", stadt: "", remote: "vorOrt",
  sprachenText: "", gehalt: "", umzugNoetig: false,
  anforderungenText: "", quereinstiegGeeignet: false,
  kurzbeschreibung: "", kategorie: "",
  internFirma: "", internOriginalTitel: "", internOriginalText: "",
  internQuelleUrl: "", internQuellePlattform: "", internNotizen: "",
  quellenStatus: "unklar",
};

const chanceZuEntwurf = (c: JobChance): Entwurf => ({
  id: c.id, aktiv: c.aktiv, partnerFreigabe: c.partnerFreigabe,
  bestaetigt: c.intern.quellenStatus === "manuell_geprueft",
  rolle: c.rolle, land: c.land, stadt: c.stadt ?? "", remote: c.remote,
  sprachenText: c.sprachen.join(", "), gehalt: c.gehalt ?? "", umzugNoetig: !!c.umzugNoetig,
  anforderungenText: c.anforderungen.join("\n"), quereinstiegGeeignet: c.quereinstiegGeeignet,
  kurzbeschreibung: c.kurzbeschreibung, kategorie: c.kategorie,
  internFirma: c.intern.firma ?? "", internOriginalTitel: c.intern.originalTitel ?? "",
  internOriginalText: c.intern.originalText ?? "", internQuelleUrl: c.intern.quelleUrl ?? "",
  internQuellePlattform: c.intern.quellePlattform ?? "", internNotizen: c.intern.notizen ?? "",
  quellenStatus: c.intern.quellenStatus,
});

const REMOTE_LABEL: Record<Remote, string> = { remote: "Remote", hybrid: "Hybrid", vorOrt: "Vor Ort" };

export default function ChancenAdminSeite() {
  const [pin, setPin] = useState("");
  const [ready, setReady] = useState(false);
  const [darf, setDarf] = useState(false);
  const [chancen, setChancen] = useState<JobChance[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");

  const [modus, setModus] = useState<"liste" | "editor">("liste");
  const [entwurf, setEntwurf] = useState<Entwurf>(LEER);
  const [quelleEingabe, setQuelleEingabe] = useState("");
  const [quelleLaedt, setQuelleLaedt] = useState(false);
  const [quelleFehler, setQuelleFehler] = useState("");
  const [speichernLaedt, setSpeichernLaedt] = useState(false);
  const [speichernFehler, setSpeichernFehler] = useState("");
  /* KEIN ROT FÜR EINEN ERFOLG (Owner 26.08.2026, zweites Mal erlebt: „wollte noch einen
     job hinzufügen, er hats nicht gespeichert" — der Job LAG in Supabase, aber die rote
     Zeile „Gespeichert — aber NICHT aktiv" las sich als Fehlschlag und der Editor blieb
     offen; die Liste zeigte danach den alten Stand). Gespeichert-aber-inaktiv ist ein
     HINWEIS auf der Liste, nie ein Fehler im Editor. */
  const [hinweis, setHinweis] = useState("");
  const [loeschenId, setLoeschenId] = useState("");

  /* GOOGLE-JOBS-SUCHE (Owner 26.08.2026: „ich muss hierfür irgendwie scrapen und mehrere
     hinzufügen … Ich habe doch eine API dazu" — SerpApi liegt im Haus). Suche kostet
     1 Credit je Klick, Import je Treffer 1 KI-Aufruf; alles landet inaktiv+ungeprüft. */
  type SuchTreffer = { titel: string; firma: string; ort: string; plattform: string; link: string; beschreibung: string };
  const [sucheEingabe, setSucheEingabe] = useState("");
  const [sucheLaedt, setSucheLaedt] = useState(false);
  const [sucheFehler, setSucheFehler] = useState("");
  const [trefferListe, setTrefferListe] = useState<SuchTreffer[]>([]);
  const [importLaeuft, setImportLaeuft] = useState(-1);
  const [importiert, setImportiert] = useState<number[]>([]);

  const suchen = async () => {
    if (!sucheEingabe.trim() || sucheLaedt) return;
    setSucheLaedt(true); setSucheFehler(""); setTrefferListe([]); setImportiert([]);
    try {
      const r = await fetch("/api/job-chancen", { method: "POST", headers: kopf(), body: JSON.stringify({ aktion: "suchen", suchbegriff: sucheEingabe.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSucheFehler(d?.error ?? "Suche fehlgeschlagen."); setSucheLaedt(false); return; }
      setTrefferListe(Array.isArray(d?.treffer) ? d.treffer : []);
      if (!Array.isArray(d?.treffer) || d.treffer.length === 0) setSucheFehler("Keine Treffer — anderen Suchbegriff probieren.");
    } catch { setSucheFehler("Keine Verbindung."); }
    setSucheLaedt(false);
  };

  const importieren = async (t: SuchTreffer, idx: number) => {
    if (importLaeuft >= 0 || importiert.includes(idx)) return;
    setImportLaeuft(idx); setSucheFehler("");
    try {
      const r = await fetch("/api/job-chancen", { method: "POST", headers: kopf(), body: JSON.stringify({ aktion: "importieren", treffer: t }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSucheFehler(d?.error ?? "Import fehlgeschlagen."); setImportLaeuft(-1); return; }
      setImportiert(v => [...v, idx]);
      void laden();
    } catch { setSucheFehler("Keine Verbindung."); }
    setImportLaeuft(-1);
  };

  const kopf = (p = pin) => {
    let tok = "";
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(p ? { "x-try-look-admin-pin": p } : {}) };
  };

  const laden = async (p = pin) => {
    setLaedt(true); setFehler("");
    try {
      const r = await fetch("/api/job-chancen", { headers: kopf(p), cache: "no-store" });
      if (!r.ok) { setDarf(false); setFehler(r.status === 403 ? "" : "Konnte Liste nicht laden."); setLaedt(false); return; }
      const d = await r.json();
      setDarf(true);
      setChancen(Array.isArray(d?.chancen) ? d.chancen : []);
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

  const neueChance = () => { setEntwurf(LEER); setQuelleEingabe(""); setQuelleFehler(""); setSpeichernFehler(""); setHinweis(""); setModus("editor"); };
  const bearbeiten = (c: JobChance) => { setEntwurf(chanceZuEntwurf(c)); setQuelleEingabe(""); setQuelleFehler(""); setSpeichernFehler(""); setHinweis(""); setModus("editor"); };

  const quelleAbrufen = async () => {
    if (!quelleEingabe.trim() || quelleLaedt) return;
    setQuelleLaedt(true); setQuelleFehler("");
    try {
      const r = await fetch("/api/job-chancen", { method: "POST", headers: kopf(), body: JSON.stringify({ aktion: "quelle", eingabe: quelleEingabe.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setQuelleFehler(d?.error ?? "Fehlgeschlagen."); setQuelleLaedt(false); return; }
      setEntwurf(e => ({
        ...e,
        rolle: d.vorschlag?.rolle || e.rolle,
        land: d.vorschlag?.land || e.land,
        stadt: d.vorschlag?.stadt || e.stadt,
        remote: (d.vorschlag?.remote as Remote) || e.remote,
        sprachenText: Array.isArray(d.vorschlag?.sprachen) && d.vorschlag.sprachen.length ? d.vorschlag.sprachen.join(", ") : e.sprachenText,
        gehalt: d.vorschlag?.gehalt || e.gehalt,
        umzugNoetig: typeof d.vorschlag?.umzugNoetig === "boolean" ? d.vorschlag.umzugNoetig : e.umzugNoetig,
        anforderungenText: Array.isArray(d.vorschlag?.anforderungen) && d.vorschlag.anforderungen.length ? d.vorschlag.anforderungen.join("\n") : e.anforderungenText,
        quereinstiegGeeignet: typeof d.vorschlag?.quereinstiegGeeignet === "boolean" ? d.vorschlag.quereinstiegGeeignet : e.quereinstiegGeeignet,
        kurzbeschreibung: d.vorschlag?.kurzbeschreibung || e.kurzbeschreibung,
        kategorie: d.vorschlag?.kategorie || e.kategorie,
        internFirma: d.intern?.firma || e.internFirma,
        internOriginalTitel: d.intern?.originalTitel || e.internOriginalTitel,
        internOriginalText: d.intern?.originalText || e.internOriginalText,
        internQuelleUrl: d.intern?.quelleUrl || e.internQuelleUrl,
        internQuellePlattform: d.intern?.quellePlattform || e.internQuellePlattform,
        /* Ein neuer Vorschlag muss neu geprüft werden — die Bestätigung eines
           früheren Standes gilt nicht automatisch für einen neuen KI-Text. */
        bestaetigt: false,
      }));
      setQuelleLaedt(false);
    } catch { setQuelleFehler("Keine Verbindung."); setQuelleLaedt(false); }
  };

  const speichern = async () => {
    if (speichernLaedt) return;
    /* SICHTBAR ABSAGEN, NIE STUMM (Hausregel `sichtbare-fehler-keine-formularfelder`;
       Owner 26.08.2026, live erlebt: „ich habe einen job hier eingefügt aber ist weg" —
       der Knopf kehrte bei leerer Rolle/leerem Land wortlos zurück, der Owner hielt den
       Eintrag für gespeichert und verliess die Seite; der Entwurf lebt nur im Speicher). */
    if (!entwurf.rolle.trim() || !entwurf.land.trim()) {
      setSpeichernFehler("Rolle und Land sind Pflicht — erst ausfüllen, dann speichern.");
      return;
    }
    setSpeichernLaedt(true); setSpeichernFehler("");
    try {
      const chance = {
        id: entwurf.id || undefined,
        aktiv: entwurf.aktiv, partnerFreigabe: entwurf.partnerFreigabe,
        rolle: entwurf.rolle.trim(), land: entwurf.land.trim(), stadt: entwurf.stadt.trim() || undefined,
        remote: entwurf.remote,
        sprachen: entwurf.sprachenText.split(",").map(s => s.trim()).filter(Boolean),
        gehalt: entwurf.gehalt.trim() || undefined, umzugNoetig: entwurf.umzugNoetig,
        anforderungen: entwurf.anforderungenText.split("\n").map(s => s.trim()).filter(Boolean),
        quereinstiegGeeignet: entwurf.quereinstiegGeeignet,
        kurzbeschreibung: entwurf.kurzbeschreibung.trim(), kategorie: entwurf.kategorie.trim(),
        intern: {
          firma: entwurf.internFirma.trim() || undefined,
          originalTitel: entwurf.internOriginalTitel.trim() || undefined,
          originalText: entwurf.internOriginalText || undefined,
          quelleUrl: entwurf.internQuelleUrl || undefined,
          quellePlattform: entwurf.internQuellePlattform || undefined,
          notizen: entwurf.internNotizen.trim() || undefined,
        },
      };
      const r = await fetch("/api/job-chancen", { method: "POST", headers: kopf(), body: JSON.stringify({ aktion: "speichern", chance, bestaetigt: entwurf.bestaetigt }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSpeichernFehler(d?.error ?? "Fehlgeschlagen."); setSpeichernLaedt(false); return; }
      setSpeichernLaedt(false);
      /* IMMER zurück zur frisch geladenen Liste — der Eintrag ist gespeichert und muss
         dort SOFORT zu sehen sein. Die Inaktiv-Erklärung steht als Hinweis darüber. */
      setHinweis(d.aktivGesperrt ? "Gespeichert. Die Chance ist noch INAKTIV — zum Aktivieren erst „Als neutrale Marktchance geprüft“ bestätigen." : "");
      setModus("liste");
      void laden();
    } catch { setSpeichernFehler("Keine Verbindung."); setSpeichernLaedt(false); }
  };

  /* LÖSCHEN: ZWEI TIPPS, ROT (Hausregel) — nie window.confirm. */
  const loeschenTippen = async (id: string) => {
    if (loeschenId !== id) { setLoeschenId(id); window.setTimeout(() => setLoeschenId(v => (v === id ? "" : v)), 3000); return; }
    setLoeschenId("");
    setChancen(cs => cs.filter(c => c.id !== id));
    await fetch("/api/job-chancen", { method: "DELETE", headers: kopf(), body: JSON.stringify({ id }) }).catch(() => {});
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
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-black">Jobchancen-Pool</h1>
            <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/60">
              Von Hand gepflegt — kein Scraping. Eine Chance erscheint im Funnel erst, wenn sie aktiv UND
              (Partner-Job ODER „Als neutrale Marktchance geprüft") ist.
            </p>
          </div>
          {modus === "liste" && (
            <button type="button" onClick={neueChance}
              className="lb-chip grid h-11 w-11 shrink-0 place-items-center rounded-full active:scale-95 transition">
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>

        {modus === "liste" ? (
          <>
            {hinweis && <p className="mt-4 rounded-xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-3 py-2 text-[13px] font-bold text-[#f6cf51]">{hinweis}</p>}

            {/* AUS GOOGLE JOBS HOLEN — Suche auf Knopfdruck (1 SerpApi-Credit), Import je
                Treffer ein KI-Aufruf. Alles landet inaktiv + ungeprüft im Pool. */}
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/50">Aus Google Jobs holen</p>
              <div className="mt-2 flex gap-2">
                <Eingabe placeholder="z. B. german customer support remote" value={sucheEingabe}
                  onChange={e => setSucheEingabe(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void suchen(); }} />
                <div className="shrink-0">
                  <Knopf art="umriss" disabled={!sucheEingabe.trim() || sucheLaedt} onClick={() => void suchen()}>
                    {sucheLaedt ? "Sucht …" : "Suchen"}
                  </Knopf>
                </div>
              </div>
              <p className="mt-1.5 text-[10.5px] font-medium text-white/35">1 Suche = 1 SerpApi-Credit · Übernommene Chancen sind INAKTIV, bis du sie prüfst.</p>
              {sucheFehler && <p className="mt-2 text-[12px] font-bold text-red-400">{sucheFehler}</p>}
              {trefferListe.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {trefferListe.map((t, idx) => (
                    <div key={`${t.titel}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[13px] font-black text-white/90">{t.titel}</p>
                      <p className="mt-0.5 text-[11.5px] font-bold text-white/50">
                        {[t.firma, t.ort, t.plattform].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11.5px] font-medium leading-snug text-white/40">{t.beschreibung}</p>
                      <div className="mt-2">
                        <button type="button" disabled={importLaeuft >= 0 || importiert.includes(idx)}
                          onClick={() => void importieren(t, idx)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-black uppercase tracking-[0.08em] transition active:scale-95 ${importiert.includes(idx) ? "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]" : "border-white/20 bg-white/5 text-white/70 hover:text-white"} disabled:opacity-60`}>
                          {importiert.includes(idx) ? "✓ Im Pool" : importLaeuft === idx ? "Wird übernommen …" : "Übernehmen"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {laedt && <div className="mt-6"><Laden art="flaeche" text="Lädt …" /></div>}
            {fehler && <p className="mt-4 text-[13px] font-bold text-red-400">{fehler}</p>}
            {!laedt && chancen.length === 0 && !fehler && (
              <p className="mt-6 text-[13px] font-bold text-white/50">Noch keine Chance angelegt.</p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              {chancen.map(c => (
                <div key={c.id} className="relative rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
                  <button type="button" onClick={() => loeschenTippen(c.id)} aria-label="Löschen"
                    className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 transition active:scale-90"
                    style={loeschenId === c.id ? { background: "#fff", color: "#dc2626" } : undefined}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-10">
                    <p className="text-[14px] font-black text-white/90">{c.rolle || "(ohne Rolle)"}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${c.aktiv ? "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]" : "border-white/20 bg-white/5 text-white/60"}`}>
                      {c.aktiv ? "Aktiv" : "Inaktiv"}
                    </span>
                    {c.intern.quellenStatus === "unklar" && (
                      <span className="rounded-full border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-red-300">
                        Quelle noch nicht geprüft
                      </span>
                    )}
                    {c.partnerFreigabe && (
                      <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-white/70">Partner</span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] font-bold text-white/55">
                    {[c.stadt, c.land].filter(Boolean).join(", ")} · {REMOTE_LABEL[c.remote]} · {c.kategorie || "—"}
                  </p>
                  {c.intern.firma && <p className="mt-0.5 text-[11px] font-medium text-white/35">intern: {c.intern.firma}</p>}
                  <div className="mt-2.5">
                    <button type="button" onClick={() => bearbeiten(c)}
                      className="inline-flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-[0.08em] text-white/60 transition hover:text-white">
                      <Pencil className="h-3.5 w-3.5" /> Bearbeiten
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {/* Abbrechen lädt die Liste FRISCH — sonst zeigt sie den Stand von vor dem
                Editor und ein gerade gespeicherter Eintrag wirkt verschwunden. */}
            <button type="button" onClick={() => { setModus("liste"); void laden(); }}
              className="inline-flex w-fit items-center gap-1.5 text-[11.5px] font-black uppercase tracking-[0.08em] text-white/50 transition hover:text-white">
              <XIcon className="h-3.5 w-3.5" /> Abbrechen
            </button>

            {/* SCHRITT 1 — Quelle einfügen und neutralisieren lassen. */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/50">1 · Quelle</p>
              <EingabeMehrzeilig className="mt-2" zeilen={3} value={quelleEingabe} placeholder="Link oder Text der Original-Anzeige"
                onChange={e => setQuelleEingabe(e.target.value)} />
              <div className="mt-2"><Knopf art="umriss" disabled={!quelleEingabe.trim() || quelleLaedt} onClick={() => void quelleAbrufen()}>
                {quelleLaedt ? "Wird abgerufen …" : "Abrufen & neutralisieren"}
              </Knopf></div>
              {quelleFehler && <p className="mt-2 text-[12px] font-bold text-red-400">{quelleFehler}</p>}
              {entwurf.internFirma && (
                <p className="mt-2 text-[11px] font-medium text-white/40">
                  intern erkannt: {entwurf.internFirma}{entwurf.internOriginalTitel ? ` — ${entwurf.internOriginalTitel}` : ""}
                </p>
              )}
            </div>

            {/* SCHRITT 2+3 — die kandidatensichtbaren Felder, prüfen und ändern. */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/50">2 · Kandidaten-Sicht (neutral, ohne Firmenbezug)</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Eingabe placeholder="Rolle *" value={entwurf.rolle} onChange={e => setEntwurf(v => ({ ...v, rolle: e.target.value }))} />
                <Eingabe placeholder="Kategorie" value={entwurf.kategorie} onChange={e => setEntwurf(v => ({ ...v, kategorie: e.target.value }))} />
                <Eingabe placeholder="Land *" value={entwurf.land} onChange={e => setEntwurf(v => ({ ...v, land: e.target.value }))} />
                <Eingabe placeholder="Stadt (optional)" value={entwurf.stadt} onChange={e => setEntwurf(v => ({ ...v, stadt: e.target.value }))} />
              </div>
              <div className="mt-2 flex gap-2">
                {(["vorOrt", "hybrid", "remote"] as Remote[]).map(r => (
                  <Knopf key={r} art="chip" aktiv={entwurf.remote === r} onClick={() => setEntwurf(v => ({ ...v, remote: r }))}>
                    {REMOTE_LABEL[r]}
                  </Knopf>
                ))}
              </div>
              <Eingabe className="mt-2" placeholder="Sprachen, mit Komma getrennt (z. B. Deutsch C1, Englisch B2)" value={entwurf.sprachenText}
                onChange={e => setEntwurf(v => ({ ...v, sprachenText: e.target.value }))} />
              <Eingabe className="mt-2" placeholder="Gehalt (nur wenn öffentlich bekannt, sonst leer)" value={entwurf.gehalt}
                onChange={e => setEntwurf(v => ({ ...v, gehalt: e.target.value }))} />
              <EingabeMehrzeilig className="mt-2" zeilen={4} placeholder="Anforderungen — eine Zeile je Anforderung" value={entwurf.anforderungenText}
                onChange={e => setEntwurf(v => ({ ...v, anforderungenText: e.target.value }))} />
              <EingabeMehrzeilig className="mt-2" zeilen={3} placeholder="Kurzbeschreibung (2–3 neutrale Sätze)" value={entwurf.kurzbeschreibung}
                onChange={e => setEntwurf(v => ({ ...v, kurzbeschreibung: e.target.value }))} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Knopf art="chip" aktiv={entwurf.umzugNoetig} onClick={() => setEntwurf(v => ({ ...v, umzugNoetig: !v.umzugNoetig }))}>Umzug nötig</Knopf>
                <Knopf art="chip" aktiv={entwurf.quereinstiegGeeignet} onClick={() => setEntwurf(v => ({ ...v, quereinstiegGeeignet: !v.quereinstiegGeeignet }))}>Quereinstieg realistisch</Knopf>
                <Knopf art="chip" aktiv={entwurf.partnerFreigabe} onClick={() => setEntwurf(v => ({ ...v, partnerFreigabe: !v.partnerFreigabe }))}>Partner-Freigabe</Knopf>
              </div>
            </div>

            {/* SCHRITT 4 — die Bestätigung, NIE vorausgewählt. */}
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.1em] text-white/50">3 · Prüfung</p>
              <div className="mt-2">
                <Knopf art="chip" aktiv={entwurf.bestaetigt} onClick={() => setEntwurf(v => ({ ...v, bestaetigt: !v.bestaetigt }))}>
                  Als neutrale Marktchance geprüft
                </Knopf>
              </div>
              <p className="mt-2 text-[11px] font-medium leading-snug text-white/45">
                Erst mit dieser Bestätigung (oder einer Partner-Freigabe oben) lässt sich die Chance aktivieren.
              </p>
              <div className="mt-3">
                <Knopf art="chip" aktiv={entwurf.aktiv} onClick={() => setEntwurf(v => ({ ...v, aktiv: !v.aktiv }))}>
                  Aktiv (im Funnel sichtbar)
                </Knopf>
              </div>
            </div>

            {speichernFehler && <p className="text-[12.5px] font-bold text-red-400">{speichernFehler}</p>}
            <Knopf art="gold" disabled={!entwurf.rolle.trim() || !entwurf.land.trim() || speichernLaedt} onClick={() => void speichern()}>
              {speichernLaedt ? "Wird gespeichert …" : "Speichern"}
            </Knopf>
          </div>
        )}
      </div>
    </main>
  );
}
