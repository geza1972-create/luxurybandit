"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Users } from "lucide-react";

/**
 * WER HAT WAS HOCHGELADEN — und was kam heraus.
 *
 * Owner 30.07.2026: „ich will eine Galerie haben als Tab neben Besucher mit allen Bildern die
 * hochgeladen werden, Models, eigene … von wem das ist, E-Mail, Uhrzeit und erzeugtes Bild."
 * Dazu: „du nennst es so, dass wir diesen Tab überall einbauen können, auch bei Kiss."
 *
 * Deshalb ein eigener Baustein und keine Erweiterung einer Seite: `<UploadsAdmin />` lässt
 * sich unter jedes Thema hängen, ohne etwas zu kopieren.
 *
 * Drei Spalten je Zeile, immer in derselben Reihenfolge:
 *   SIE (was er hochgeladen oder gewählt hat) · ER · das Ergebnis
 * Fehlt eine, blieb der Besuch dort stehen — und genau das ist die interessante Auskunft:
 * wer angefangen und aufgegeben hat.
 *
 * Blendet sich ohne Admin-PIN selbst aus.
 */

type Eintrag = {
  id: string; createdAt: string; modelName?: string; email?: string; device?: string;
  paid?: boolean; videoUrl?: string; imageUrl?: string; personUrl?: string; modelUrl?: string;
};

export default function UploadsAdmin({ title = "Hochgeladen & erzeugt" }: { title?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [rows, setRows] = useState<Eintrag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [arm, setArm] = useState("");        // erster Tipp auf den Papierkorb
  // GRÜNER PUNKT BEI NEUEM (Owner 30.07.2026: „will einen grünen Punkt sehen wenn neue Sachen
  // drin liegen"). „Neu" heisst: seit dem letzten Blick dazugekommen. Der Zeitpunkt liegt im
  // Gerät, nicht auf dem Server — es geht um SEINEN letzten Blick, nicht um den von irgendwem.
  const [neu, setNeu] = useState(0);

  useEffect(() => {
    let p = "";
    try { p = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    setPin(p); setIsAdmin(!!p);
    if (!p) { setLoading(false); return; }
    fetch("/api/kiss-log", { headers: { "x-try-look-admin-pin": p }, cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const liste: Eintrag[] = Array.isArray(d?.entries) ? d.entries : [];
        setRows(liste);
        try {
          const zuletzt = Number(localStorage.getItem("lb_uploads_gesehen") ?? 0);
          setNeu(liste.filter(e => new Date(e.createdAt).getTime() > zuletzt).length);
          // Sofort als gesehen vermerken: er schaut ja gerade hin. Beim nächsten Mal zählt
          // dann nur, was seitdem dazukam.
          localStorage.setItem("lb_uploads_gesehen", String(Date.now()));
        } catch { /**/ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const entfernen = async (id: string) => {
    // Zwei Tipps statt window.confirm — der Dialog erscheint auf dem Handy nicht.
    if (arm !== id) { setArm(id); setTimeout(() => setArm(a => (a === id ? "" : a)), 4000); return; }
    setArm(""); setBusy(id);
    const vorher = rows;
    setRows(r => r.filter(x => x.id !== id));
    try {
      const r = await fetch("/api/kiss-log", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-try-look-admin-pin": pin },
        body: JSON.stringify({ remove: id }),
      });
      if (!r.ok) setRows(vorher);
    } catch { setRows(vorher); }
    finally { setBusy(""); }
  };

  if (!isAdmin) return null;

  const zeit = (s: string) => {
    try {
      return new Date(s).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const Kachel = ({ url, label }: { url?: string; label: string }) => (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-black/40">{label}</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="" className="aspect-[2/3] w-full rounded-lg border border-black/10 object-cover" />
        </a>
      ) : (
        <div className="grid aspect-[2/3] w-full place-items-center rounded-lg border border-dashed border-black/15 bg-black/[0.03] text-[10px] font-bold text-black/30">
          —
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/15 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black/50">Nur für dich sichtbar</p>
      <h2 className="mt-1 flex items-center gap-2 text-[18px] font-black text-black">
        <Users className="h-4 w-4 text-black/50" /> {title} <span className="text-black/40">({rows.length})</span>
        {neu > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-black text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> {neu} neu
          </span>
        )}
      </h2>
      <p className="mt-0.5 text-[12px] font-semibold text-black/60">
        Wer hat was hochgeladen, wann — und was kam heraus. Fehlt das Ergebnis, ist er
        unterwegs abgesprungen.
      </p>

      {loading ? (
        <div className="grid py-10 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-black/30" /></div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-[13px] font-bold text-black/40">Noch nichts hochgeladen.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map(e => (
            <div key={e.id} className="rounded-xl border border-black/10 p-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-black">
                    {e.email || <span className="text-black/40">ohne E-Mail</span>}
                  </p>
                  <p className="text-[11px] font-bold text-black/50">
                    {zeit(e.createdAt)} · {e.modelName || "—"}
                    {e.device ? ` · ${e.device.slice(0, 10)}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${e.paid ? "bg-emerald-500/15 text-emerald-600" : "bg-black/[0.06] text-black/50"}`}>
                  {e.paid ? "✓ bezahlt" : "unbezahlt"}
                </span>
                <button type="button" onClick={() => void entfernen(e.id)} disabled={busy === e.id}
                  aria-label={arm === e.id ? "Wirklich löschen" : "Löschen"}
                  style={arm === e.id ? { background: "#dc2626", color: "#fff" } : undefined}
                  className={`grid h-8 shrink-0 place-items-center rounded-lg border border-red-400/40 transition active:scale-95 ${
                    arm === e.id ? "w-auto px-2.5 text-[11px] font-black" : "w-8 text-red-500"
                  }`}>
                  {busy === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : arm === e.id ? "Wirklich?" : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <Kachel url={e.modelUrl} label="Sie" />
                <Kachel url={e.personUrl} label="Er" />
                <Kachel url={e.imageUrl} label="Ergebnis" />
              </div>

              {e.videoUrl && (
                <a href={e.videoUrl} target="_blank" rel="noreferrer"
                  className="mt-2 flex h-9 items-center justify-center rounded-lg bg-black text-[12px] font-black"
                  style={{ color: "#fff" }}>
                  ▶ Video ansehen
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
