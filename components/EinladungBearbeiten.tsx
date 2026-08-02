"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import TeilenKnopf from "@/components/TeilenKnopf";
import EinladungAboKnopf from "@/components/EinladungAboKnopf";
import { fillPrices } from "@/lib/pricing";

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
  id, sprache, sie, er, datum, ort, adresse, telefon, bezahlt,
}: {
  id: string; sprache: string;
  sie: string; er: string; datum?: string; ort?: string; adresse?: string; telefon?: string;
  /** Ohne Abo bekommt nur das Paar (nie die Gäste) den Abo-Kasten zu sehen (Ä9). */
  bezahlt: boolean;
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

  const text = `${f.sie} & ${f.er} 💍`;

  return (
    <>
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
              className="lb-karte-cta flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {T.speichern}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* ZURUECK — an dieselbe Pruefung gehaengt wie das Bearbeiten (Owner 31.07.2026,
              zum zweiten Mal: „wie komme ich zurück?").
              Vorher hing der Weg zurueck allein an der Admin-Kennung. Das Brautpaar hatte gar
              keinen: Es kommt aus dem Trichter, landet auf seiner Einladung — und sitzt fest.
              Fuer einen Gast bleibt die Seite nackt, das war und ist die Absicht. */}
          <Link href="/themes/wedding" aria-label={T.zurueck}
            className="lb-karte-absage grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <button type="button" onClick={() => setOffen(true)}
            className="lb-karte-absage flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95">
            <Pencil className="h-4 w-4" /> {T.bearbeiten}
          </button>
          <TeilenKnopf text={text} label={T.teilen} kopiertLabel={T.zusDanke} className="!h-11 flex-1 !text-[13px]" />
        </div>
      )}
    </div>
    {/* ABO-KASTEN NUR FUERS PAAR, NIE FUER GAESTE (Ä9, Owner 02.08.2026: „für 1,49 bekommt
        er die Einladung ohne die anderen Features. Wenn er die auch nutzen will, dann muss
        er gleich Abo abschliessen"). Gleiche Optik wie der Reaktivierungs-Kasten in
        app/einladung/[id]/page.tsx — dasselbe Ziel, hier aber VOR dem Ablauf der Probezeit.
        Der Knopf startet jetzt echt die Kasse (Ä11) — vorher fuehrte er auf `/themes/wedding
        ?abo=1&e=…`, ein Link, den nichts im Code auswertete. */}
    {!bezahlt && (
      <div className="mt-4 rounded-2xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
        <p className="text-[14px] font-black text-white">{T.aboTitel}</p>
        <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
          {fillPrices(T.aboText, sprache)}
        </p>
        <EinladungAboKnopf einladungId={id} label={fillPrices(T.aboKnopf, sprache)} pruefText={T.aboPruefen} />
      </div>
    )}
    </>
  );
}
