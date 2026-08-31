"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { FirmenAnfrage } from "@/lib/agenten-store";

/**
 * DIE ANFRAGEN VON UNTERNEHMEN — DIE EINE LISTE FÜR BEIDE TÜREN (Owner 31.08.2026: „Lead
 * bitte im bestehenden Admin-Bereich speichern, aber klar als Recruiting-B2B-Lead
 * kennzeichnen.").
 *
 * WARUM ES SIE ÜBERHAUPT BRAUCHT: Gespeichert wurden diese Anfragen schon immer, gesehen hat
 * sie nur, wer die Mail nicht übersehen hat. Eine Mail kann im Spam landen; die Ablage war
 * das Gedächtnis, hatte aber keine Anzeige. Das hier ist die Anzeige — nicht mehr.
 *
 * HELL, WIE JEDES ADMIN-WERKZEUG (CI-Regel: „Light box / form / admin tool = schwarz, weiss,
 * grau, KEIN Gold"). Die Kennzeichnung trägt deshalb Farbe über die Schrift, nicht über Gold.
 */
export default function FirmenAnfragen({ pin }: { pin: string }) {
  const [anfragen, setAnfragen] = useState<FirmenAnfrage[]>([]);
  const [laedt, setLaedt] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const d = await fetch("/api/agent-anfrage", { headers: { "x-try-look-admin-pin": pin }, cache: "no-store" }).then(r => r.json());
        if (Array.isArray(d?.anfragen)) setAnfragen(d.anfragen);
      } catch { /* leere Liste ist auch eine Antwort */ }
      setLaedt(false);
    })();
  }, [pin]);

  const datum = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }); } catch { return ""; }
  };

  if (laedt) {
    return <p className="flex items-center gap-2 text-[13px] font-bold text-ink/50"><Loader2 className="h-4 w-4 animate-spin" />Anfragen werden geladen…</p>;
  }

  return (
    <div>
      <p className="text-sm font-black text-ink">Anfragen von Unternehmen</p>
      <p className="mt-0.5 text-[12px] font-bold text-ink/50">
        {anfragen.length === 0 ? "Noch keine Anfrage." : `${anfragen.length} Anfrage${anfragen.length === 1 ? "" : "n"}, neueste zuerst.`}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {anfragen.map(a => {
          const recruiting = a.art === "recruiting";
          return (
            <div key={a.id} className="rounded-xl border border-black/12 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* DIE KENNZEICHNUNG ZUERST: Welche Tür war es? Ohne sie sähen die Pilot-Anfrage
                    einer Firma und die Neugier aus dem Chat gleich aus. */}
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wide ${
                  recruiting ? "bg-emerald-100 text-emerald-800" : "bg-black/[0.07] text-ink/60"}`}>
                  {recruiting ? "Recruiting B2B" : "Agenten"}
                </span>
                <span className="text-[11.5px] font-bold text-ink/45">{datum(a.erstelltAm)}</span>
                {a.gemeldet ? null : <span className="text-[11px] font-black text-red-600">Mail ging nicht raus</span>}
              </div>

              <p className="mt-1.5 text-[14px] font-black text-ink">{a.firma || a.name || "Ohne Namen"}</p>
              {a.firma && a.name && <p className="text-[12.5px] font-bold text-ink/60">{a.name}</p>}
              {a.position && <p className="mt-1 text-[13px] font-bold text-ink/80">Position: {a.position}</p>}
              {a.branche && !recruiting && <p className="mt-1 text-[13px] font-bold text-ink/60">Branche: {a.branche}</p>}
              {a.email && <p className="mt-1 break-all text-[12.5px] font-bold text-ink/60">{a.email}</p>}
              {a.stellenLink && (
                <a href={a.stellenLink} target="_blank" rel="noreferrer"
                  className="mt-1 block break-all text-[12.5px] font-black text-sky-700 underline underline-offset-2">
                  {a.stellenLink}
                </a>
              )}
              {a.anliegen && (
                <p className="mt-2 whitespace-pre-wrap border-l-2 border-black/15 pl-2.5 text-[12.5px] font-medium leading-relaxed text-ink/75">
                  {a.anliegen}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
