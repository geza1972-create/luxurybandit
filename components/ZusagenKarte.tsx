"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { KARTE_TEXTE } from "@/components/EinladungKarte";

/**
 * DIE ZUSAGEN — eine zweite Karte unter der Einladung.
 *
 * Owner 31.07.2026: „ich brauche unter der Videokarte noch so eine Karte, wo es steht als
 * Beispiel: wer zugesagt hat."
 *
 * Bewusst ECHT gebaut und nicht als Attrappe fuer die Verkaufsseite. Eine Seite, die eine
 * Gaesteliste zeigt, die es nicht gibt, kostet beim ersten zahlenden Kunden mehr, als sie
 * einbringt — und genau dieser Kunde ist der, auf den es ankommt (die wirklich Verlobte,
 * Gruppe A aus dem Konzept). Auf der Verkaufsseite laeuft dieselbe Karte mit `demo`, dort
 * ohne Knoepfe.
 *
 * Vom Gast wird NUR ein Vorname erfragt (Konzept §8: „Keine echten Personendaten der Gaeste
 * bei uns"). Kein Konto, keine Adresse, keine Telefonnummer — wer zusagt, tippt seinen
 * Vornamen und tippt auf einen Knopf.
 *
 * Dass die Namen auch andere Gaeste sehen, ist Absicht: Bei einer Hochzeit gehoert „Maria
 * kommt auch" zur Freude dazu, und es bringt die naechsten dazu, ebenfalls zu antworten.
 * Mehr als der Vorname steht dort nicht.
 */

export type Zusage = { name: string; ja: boolean; at?: string };

export default function ZusagenKarte({
  sprache, id, zusagen, demo,
}: {
  sprache: string;
  /** Kennung der Einladung — ohne sie (Verkaufsseite) gibt es keine Knoepfe. */
  id?: string;
  zusagen: Zusage[];
  demo?: boolean;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const [liste, setListe] = useState<Zusage[]>(zusagen);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fertig, setFertig] = useState(false);

  const ja = liste.filter(z => z.ja).length;
  const nein = liste.length - ja;

  const antworten = async (kommt: boolean) => {
    const n = name.trim();
    if (!n || !id || busy) return;
    setBusy(true);
    const r = await fetch("/api/einladung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rsvp: id, name: n, ja: kommt }),
    }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return;
    // Sofort anzeigen, statt die Seite neu zu laden — die Antwort soll sich anfuehlen wie
    // ein Haendedruck, nicht wie ein Formular.
    setListe(l => [...l, { name: n, ja: kommt }]);
    setName("");
    setFertig(true);
  };

  return (
    <div className="lb-karte relative mt-4 overflow-hidden rounded-[20px] px-5 pb-6 pt-7 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <CornerOrnaments />
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />

      <div className="relative">
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.28em]">
          {T.zusTitel}
        </p>
        <p className="mt-1.5 text-center font-serif text-[17px] font-bold">
          {T.zusZahl(ja, nein)}
        </p>
        <DividerOrnament className="mt-2.5" />

        {liste.length === 0 ? (
          <p className="mt-3 text-center font-serif text-[14px] opacity-70">{T.zusLeer}</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {liste.map((z, i) => (
              <li key={i} className="flex items-center gap-2 font-serif text-[15px]">
                {z.ja
                  ? <Check className="lb-karte-ja h-4 w-4 shrink-0" />
                  : <X className="lb-karte-nein h-4 w-4 shrink-0" />}
                <span className={z.ja ? "" : "opacity-55 line-through"}>{z.name}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Auf der Verkaufsseite steht die Karte nur zum Ansehen da. */}
        {id && !demo && (
          fertig ? (
            <p className="mt-4 text-center font-serif text-[15px] font-bold">{T.zusDanke}</p>
          ) : (
            <div className="mt-4">
              <DividerOrnament />
              <input value={name} onChange={e => setName(e.target.value)} placeholder={T.zusName}
                maxLength={40} autoComplete="given-name"
                className="lb-karte-feld mt-3 h-11 w-full rounded-lg px-3 text-center font-serif text-[15px] outline-none" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void antworten(true)} disabled={!name.trim() || busy}
                  className="lb-karte-wa flex h-11 items-center justify-center gap-1.5 rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {T.zusJa}
                </button>
                <button type="button" onClick={() => void antworten(false)} disabled={!name.trim() || busy}
                  className="lb-karte-absage flex h-11 items-center justify-center rounded-full px-2 text-[12px] font-black leading-tight transition active:scale-95 disabled:opacity-45">
                  {T.zusNein}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
