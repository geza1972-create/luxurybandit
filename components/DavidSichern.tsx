"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { Eingabe, Fehlerzeile, Kasten, Knopf, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import type { DavidTunnelTexte } from "@/lib/david-tunnel-texte";

/**
 * „SCHICK MIR DIE ANALYSE" — DIE STELLE, AN DER EINE ERFUNDENE ADRESSE NOCH ZU RETTEN IST.
 *
 * Owner 29.08.2026: „Jemand, der seine falsche E-Mail gibt, kommt nie zurück." Richtig — und
 * deshalb nützt weder eine Rückweg-Mail noch ein Rückläufer, der uns Tage später sagt, was
 * wir längst nicht mehr ändern können. Erreichbar ist er nur JETZT, auf dem Schirm, direkt
 * unter dem Bericht, den er gerade gelesen hat.
 *
 * WARUM DAS FELD SEINE GETIPPTE ADRESSE ZEIGT: Wer „test@test.de" eingegeben hat, um es
 * auszuprobieren, sieht das in dieser Sekunde vor sich stehen — in dem Moment, in dem er das
 * Ergebnis behalten will. Ein leeres Feld würde ihn dagegen fragen lassen, warum er seine
 * Adresse zweimal eintippen soll.
 *
 * KEIN TOR, KEINE DROHUNG: Der Bericht steht bereits vollständig über dieser Karte. Er
 * verliert nichts, wenn er hier weiterscrollt — er gewinnt nur, wenn er tippt.
 *
 * ALLES AUS DER BIBLIOTHEK (Hausregel): Kasten, Eingabe, Knopf, Fehlerzeile, Laden.
 */
export default function DavidSichern({ genId, email, S }: {
  genId: string;
  /** Die Adresse, die er im Trichter getippt hat — sichtbar, nicht versteckt. */
  email: string;
  S: DavidTunnelTexte;
}) {
  const [wert, setWert] = useState(email);
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState("");
  const [fehler, setFehler] = useState("");

  const schicken = async () => {
    const adresse = wert.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse)) { setFehler(S.sichernFehler); return; }
    setFehler(""); setLaeuft(true);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    let tok = "";
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    try {
      const d = await fetch("/api/david-sichern", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
        body: JSON.stringify({ id: genId, email: adresse, device }),
      }).then(r => r.json());
      if (d?.ok) setFertig(adresse);
      else setFehler(String(d?.error || S.sichernFehler));
    } catch { setFehler(S.sichernFehler); }
    setLaeuft(false);
  };

  /* Ist sie draussen, verschwindet das Feld: Ein Formular, das nach getaner Arbeit stehen
     bleibt, sieht aus, als hätte es nicht funktioniert. */
  if (fertig) {
    return (
      <Kasten polster="p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f6cf51]/15 text-[#f6cf51]">
            <Check className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-black text-white/90">{fertig}</span>
            <span className="block text-[12.5px] font-bold leading-snug text-white/65">{S.sichernFertig}</span>
          </span>
        </div>
      </Kasten>
    );
  }

  return (
    <Kasten polster="p-5">
      <div className="flex items-center gap-2.5">
        <Mail className="h-4 w-4 shrink-0 text-[#f6cf51]" />
        <h3 className="text-[16px] font-black leading-snug text-white">{S.sichernTitel}</h3>
      </div>
      <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-white/75">{S.sichernText}</p>

      <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">{S.sichernLabel}</label>
      <Eingabe className="mt-1.5 w-full" type="email" inputMode="email" autoComplete="email"
        value={wert} onChange={e => { setWert(e.target.value); setFehler(""); }} />

      <div className="mt-3">
        {laeuft
          ? <Laden art="knopf" text={S.sichernLaeuft} />
          : <Knopf art="gold" onClick={() => void schicken()}>{S.sichernKnopf}</Knopf>}
      </div>
      <Fehlerzeile>{fehler}</Fehlerzeile>
    </Kasten>
  );
}
