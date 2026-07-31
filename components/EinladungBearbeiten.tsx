"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Send } from "lucide-react";
import { KARTE_TEXTE } from "@/components/EinladungKarte";

/**
 * BEARBEITEN UND VERSCHICKEN — sichtbar nur für das Brautpaar.
 *
 * Owner 31.07.2026: „sie werden das editieren können, also muss ein Edit-Button stehen" und
 * „nach dem sie das Bild generiert haben, sehen sie direkt das hier und dann werden sie es
 * editieren können und sharen können."
 *
 * Der LINK BLEIBT DERSELBE. Das ist der ganze Sinn: Eine Hochzeit verschiebt sich, der Saal
 * wechselt, die Uhrzeit auch. Wer dafür einen zweiten Link braucht, muss ihn an achtzig Leute
 * nachschicken — und weiß nie, wer noch den alten hat.
 *
 * WER DARF, ENTSCHEIDET DER SERVER. Der Browser fragt mit seiner Gerätekennung nach; die
 * Kennung des Paares wird nie öffentlich ausgeliefert, sonst könnte sie jeder abschreiben und
 * sich als Brautpaar ausgeben. Für einen Gast gibt es diesen Knopf schlicht nicht.
 */
export default function EinladungBearbeiten({
  id, sprache, sie, er, datum, ort, adresse, telefon,
}: {
  id: string; sprache: string;
  sie: string; er: string; datum?: string; ort?: string; adresse?: string; telefon?: string;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const [darf, setDarf] = useState(false);
  const [offen, setOffen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ sie, er, datum: datum ?? "", ort: ort ?? "", adresse: adresse ?? "", telefon: telefon ?? "" });

  useEffect(() => {
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    if (!device && !pin) return;
    void fetch("/api/einladung", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      body: JSON.stringify({ pruefen: id, device }),
    }).then(r => r.json()).then(d => setDarf(!!d?.darf)).catch(() => {});
  }, [id]);

  if (!darf) return null;

  const speichern = async () => {
    if (busy || !f.sie.trim() || !f.er.trim()) return;
    setBusy(true);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    const r = await fetch("/api/einladung", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      body: JSON.stringify({ edit: id, device, ...f }),
    }).catch(() => null);
    setBusy(false);
    // Neu laden statt im Browser nachzuziehen: Die Karte wird auf dem Server gebaut, und so
    // sieht sie danach GENAU das, was ein Gast sehen wird — kein zweiter Wahrheitsstand.
    if (r?.ok) location.reload();
  };

  const feld = (k: keyof typeof f, platzhalter: string, typ = "text") => (
    <input value={f[k]} onChange={e => setF(v => ({ ...v, [k]: e.target.value }))}
      placeholder={platzhalter} type={typ}
      className="lb-karte-feld h-11 w-full rounded-lg px-3 font-serif text-[15px] outline-none" />
  );

  const text = `${f.sie} & ${f.er} 💍 ${typeof window !== "undefined" ? window.location.href : ""}`;

  return (
    <div className="lb-karte relative mt-4 overflow-hidden rounded-[20px] px-5 py-5">
      {offen ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {feld("sie", T.fSie)}
            {feld("er", T.fEr)}
          </div>
          {feld("datum", T.fDatum, "date")}
          {feld("ort", T.fOrt)}
          {feld("adresse", T.fAdresse)}
          {feld("telefon", T.fTelefon, "tel")}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setOffen(false)}
              className="lb-karte-absage flex h-11 items-center justify-center rounded-full text-[13px] font-black transition active:scale-95">
              {T.abbrechen}
            </button>
            <button type="button" onClick={() => void speichern()} disabled={busy || !f.sie.trim() || !f.er.trim()}
              className="lb-karte-wa flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {T.speichern}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setOffen(true)}
            className="lb-karte-absage flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95">
            <Pencil className="h-4 w-4" /> {T.bearbeiten}
          </button>
          {/* Verschicken steht daneben, nicht darunter: Bearbeiten und Verschicken sind die
              zwei Dinge, die sie hier tut — alles andere ist die Einladung selbst. */}
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
            className="lb-karte-wa flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95">
            <Send className="h-4 w-4" /> {T.teilen}
          </a>
        </div>
      )}
    </div>
  );
}
