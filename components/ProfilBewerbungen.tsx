"use client";

import { useEffect, useRef, useState } from "react";
import { FolderOpen, ArrowUpRight, Trash2, Mail, Plus, Copy, Lock } from "lucide-react";
import { Fehlerzeile } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DEINE BEWERBUNGEN — DAS ARCHIV DER MULTI-BEWERBUNG (Owner 25.08.2026, Konzept im Memory
 * `multi-bewerbung-konzept`). Zwei Gesichter, EIN Baustein:
 *
 *   Am HAUPTPROFIL: die Liste aller erzeugten Bewerbungen (Titel, Datum, Match-Prozent,
 *   Ansehen, Löschen). Der Assistent ERZEUGT, diese Liste FINDET WIEDER — Daten, keine
 *   Funktionen (Owner: „statt tausend Funktionen auf der Seite aufzulisten").
 *
 *   Auf einer BEWERBUNG: die Herkunfts-Zeile (welche Anzeige, wieviel Prozent), das
 *   ANSCHREIBEN zum Kopieren (das PDF kommt in Stufe 2) und der Weg zurück zum Hauptprofil.
 *
 * NUR DER BESITZER sieht beides (Server-Prüfung wie alle Werkzeuge). LÖSCHEN NACH
 * HAUS-REGEL (Memory `loeschen-zwei-tipps-rot`): erster Tipp färbt rot, zweiter löscht,
 * nach 3 s springt es zurück — nie window.confirm.
 */

const TEXTE: Record<string, {
  listeTitel: string; ohneTitel: string; version: string;
  mappeTitel: string; anschreibenH: string; kopieren: string; kopiert: string;
  zurueck: string;
  neu: string; duplizieren: string; aboNoetig: string;
}> = {
  de: {
    listeTitel: "Deine Bewerbungen",
    ohneTitel: "Bewerbung", version: "Version",
    mappeTitel: "Diese Bewerbung",
    anschreibenH: "Dein Anschreiben", kopieren: "Anschreiben kopieren", kopiert: "Kopiert",
    zurueck: "Zum Hauptprofil",
    neu: "Neue Bewerbung", duplizieren: "Duplizieren",
    aboNoetig: "Die Probe-Bewerbung ist verbraucht — weitere gibt es mit dem Abo unten.",
  },
  en: {
    listeTitel: "Your applications",
    ohneTitel: "Application", version: "Version",
    mappeTitel: "This application",
    anschreibenH: "Your cover letter", kopieren: "Copy cover letter", kopiert: "Copied",
    zurueck: "To your main profile",
    neu: "New application", duplizieren: "Duplicate",
    aboNoetig: "Your free trial is used up — more come with the subscription below.",
  },
};

type Eintrag = { id: string; titel: string; firma?: string; erstelltAm: string; prozent?: number };
type Stand =
  | { art: "liste"; liste: Eintrag[]; foto: string }
  | { art: "bewerbung"; basisId: string; anzeigeTitel: string; anzeigeFirma: string; matchProzent: number | null; anschreiben: string; bezahlt: boolean };

export default function ProfilBewerbungen({ id, lang = "en" }: { id: string; lang?: string }) {
  const t = TEXTE[lang] ?? TEXTE.en;
  const [stand, setStand] = useState<Stand | null>(null);
  const [loeschArm, setLoeschArm] = useState("");
  const [kopiert, setKopiert] = useState(false);
  const [dupliziertBusy, setDupliziertBusy] = useState("");
  const [listenFehler, setListenFehler] = useState("");
  const geladen = useRef(false);

  const ausweis = (): { headers: Record<string, string>; device: string } => {
    let device = "", pin = "", tok = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return {
      headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}), ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      device,
    };
  };

  useEffect(() => {
    if (geladen.current) return;
    geladen.current = true;
    const { headers, device } = ausweis();
    fetch(`/api/lebenslauf-bewerbung?id=${encodeURIComponent(id)}&device=${encodeURIComponent(device)}`, { headers, cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.darf !== true) return;
        if (d.basisId) {
          setStand({ art: "bewerbung", basisId: String(d.basisId), anzeigeTitel: String(d.anzeigeTitel ?? ""), anzeigeFirma: String(d.anzeigeFirma ?? ""), matchProzent: typeof d.matchProzent === "number" ? d.matchProzent : null, anschreiben: String(d.anschreiben ?? ""), bezahlt: d.bezahlt === true });
        } else {
          setStand({ art: "liste", liste: Array.isArray(d.liste) ? d.liste : [], foto: String(d.foto ?? "") });
        }
      })
      .catch(() => { /* bleibt zu */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!stand) return null;

  /* ─────────── AUF EINER BEWERBUNG: Herkunft + Anschreiben + Rückweg ───────────
     Eigene Box unter der Karte (Owner 25.08.2026: die Funktionen wohnen draussen). */
  if (stand.art === "bewerbung") {
    return (
      /* Unbezahlt nicht markierbar (Owner 25.08.2026: „für Textcopy") — sonst kopiert er
         sein Anschreiben in Word und braucht das PDF nie. */
      <section className={`lb-karte mt-5 overflow-hidden rounded-[20px] px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.38)] md:px-8 md:py-7 ${stand.bezahlt ? "" : "lb-kein-kopieren"}`}>
          <p className="flex items-center gap-2 text-[13px] font-black leading-snug">
            <FolderOpen className="h-4 w-4 shrink-0" />{t.mappeTitel}
          </p>
          <p className="mt-2 text-[12.5px] font-bold leading-snug opacity-75">
            {stand.anzeigeTitel || t.ohneTitel}{stand.anzeigeFirma ? ` · ${stand.anzeigeFirma}` : ""}
            {stand.matchProzent !== null ? ` · ${stand.matchProzent}%` : ""}
          </p>

          {stand.anschreiben && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] opacity-40">
                <Mail className="h-3.5 w-3.5" />{t.anschreibenH}
              </p>
              <p className="mt-2 whitespace-pre-wrap rounded-xl border border-[#1a160f]/15 px-3.5 py-3 text-[12.5px] font-medium leading-[1.6] opacity-85">
                {stand.anschreiben}
              </p>
              <button type="button"
                onClick={() => {
                  /* SONST WÄRE DER SCHUTZ EIN WITZ (Owner 25.08.2026, Gratis-Linie): Dieser
                     Knopf legt den ganzen Brief in die Zwischenablage — unbezahlt führt er
                     deshalb zur Kasse statt zum Kopieren. */
                  if (!stand.bezahlt) { window.location.href = "/themes/lebenslauf/start"; return; }
                  try { void navigator.clipboard.writeText(stand.anschreiben); setKopiert(true); setTimeout(() => setKopiert(false), 2000); } catch { /**/ }
                }}
                className="mt-2.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] opacity-55 transition hover:opacity-100">
                {!stand.bezahlt && <Lock className="h-3.5 w-3.5" />}
                {kopiert ? t.kopiert : t.kopieren}
              </button>
            </div>
          )}

          <a href={`/lebenslauf/${stand.basisId}`}
            className="mt-4 inline-flex items-center gap-1 text-[11.5px] font-black uppercase tracking-[0.12em] opacity-55 transition hover:opacity-100">
            {t.zurueck}<ArrowUpRight className="h-3.5 w-3.5" />
          </a>
      </section>
    );
  }

  /* ─────────── AM HAUPTPROFIL: die Liste ─────────── */
  if (stand.liste.length === 0) return null;   // ohne Bewerbungen kein leerer Kasten — der Assistent erklärt den Weg

  const duplizieren = async (eintragId: string) => {
    if (dupliziertBusy) return;
    setDupliziertBusy(eintragId); setListenFehler("");
    try {
      const { headers, device } = ausweis();
      const r = await fetch("/api/lebenslauf-bewerbung", {
        method: "POST", headers,
        body: JSON.stringify({ duplizieren: eintragId, device }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.id) {
        setStand({ art: "liste", foto: stand.foto, liste: [...stand.liste, { id: String(d.id), titel: String(d.titel ?? ""), erstelltAm: String(d.erstelltAm ?? new Date().toISOString()) }] });
      } else {
        setListenFehler(String(d?.error ?? "—"));
      }
    } catch { setListenFehler("—"); }
    setDupliziertBusy("");
  };

  const loeschen = async (eintragId: string) => {
    if (loeschArm !== eintragId) {
      setLoeschArm(eintragId);
      setTimeout(() => setLoeschArm(a => (a === eintragId ? "" : a)), 3000);
      return;
    }
    setLoeschArm("");
    const { headers, device } = ausweis();
    const r = await fetch("/api/lebenslauf-bewerbung", {
      method: "DELETE", headers,
      body: JSON.stringify({ id: eintragId, device }),
    }).catch(() => null);
    if (r?.ok) setStand({ art: "liste", foto: stand.foto, liste: stand.liste.filter(b => b.id !== eintragId) });
  };

  const datum = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <section className="lb-karte mt-5 overflow-hidden rounded-[20px] px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.38)] md:px-8 md:py-7">
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-black leading-snug">
            <FolderOpen className="h-4 w-4 shrink-0" />{t.listeTitel}
          </p>
          {/* NEUE BEWERBUNG MIT PLUS (Owner 25.08.2026) — erzeugt wird im Assistenten
              (Anzeige rein, Mappe raus); das Plus bringt einen dorthin und setzt den
              Fokus ins Feld, statt eine zweite Erzeugungs-Maschine zu bauen. */}
          <button type="button" aria-label={t.neu} title={t.neu}
            onClick={() => {
              try {
                const feld = document.getElementById("assistent-feld");
                feld?.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => feld?.focus(), 350);
              } catch { /**/ }
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#1a160f] transition hover:bg-[#1a160f]/5">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <Fehlerzeile karte>{listenFehler}</Fehlerzeile>
        {/* NUR DIE VERSIONEN, SCHLICHT (Owner 25.08.2026: „Wir brauchen nur die
            Multiversionen. Version {Name} {Erstellt am} Löschen Funktion") — die ganze
            Zeile öffnet die Version, kein eigener Ansehen-Knopf, kein Prozent-Geschnörkel. */}
        <div className="mt-1">
          {stand.liste.map((b, i) => (
            <div key={b.id} className={`flex items-center gap-3 py-3 ${i === 0 ? "" : "border-t border-[#1a160f]/[0.11]"}`}>
              {/* MIT BILD, ABGEKÜRZT (Owner 25.08.2026) — das Porträt der Bewerbung als
                  kleine Karte, OBEN verankert (Skill `card`: Sprechkopf nie mittig
                  schneiden). Die ganze Fläche öffnet die Version — dort wird bearbeitet,
                  und dort steht auch die Vorschau-Leiste. */}
              <a href={`/lebenslauf/${b.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                {stand.foto && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={stand.foto} alt="" className="h-[64px] w-[48px] shrink-0 rounded-lg object-cover object-top" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black leading-snug">{b.titel || t.ohneTitel}</p>
                  <p className="mt-0.5 text-[10.5px] font-black uppercase tracking-[0.1em] opacity-45">
                    {t.version} · {datum(b.erstelltAm)}
                  </p>
                </div>
              </a>
              {/* DUPLIZIEREN (Owner 25.08.2026) — reine Server-Kopie, danach steht die
                  neue Version sofort in der Liste; ändern heisst: Zeile öffnen, dort
                  arbeitet der Chat. */}
              <button type="button" aria-label={t.duplizieren} title={t.duplizieren}
                disabled={dupliziertBusy === b.id}
                onClick={() => void duplizieren(b.id)}
                className="shrink-0 p-1 transition disabled:opacity-30">
                <Copy className="h-4 w-4 opacity-45" />
              </button>
              {/* Löschen nach Haus-Regel: erster Tipp rot, zweiter löscht (nie confirm).
                  Das Rot über die Haus-Klasse, nie als style-Farbe (Memory
                  `lb-karte-important-frisst-inline-farben`). */}
              <button type="button" aria-label="Löschen" onClick={() => void loeschen(b.id)}
                className="shrink-0 p-1 transition">
                <Trash2 className={loeschArm === b.id ? "lb-karte-nein h-4 w-4" : "h-4 w-4 opacity-45"} />
              </button>
            </div>
          ))}
        </div>
    </section>
  );
}
