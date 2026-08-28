"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Knopf, Fortschritt } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DAS TOR VOR DEM BERICHT — „darf niemand sehen, nur er" (Owner 28.08.2026).
 *
 * Der Server hat die Seite gesperrt, weil ihm der Besitz-Keks fehlt. Das trifft ZWEI ganz
 * verschiedene Leute, und beide sehen zuerst dasselbe:
 *
 *   · DEN BESITZER auf seinem eigenen Browser, der nur noch nie hier war. Sein Browser kennt
 *     die Gerätekennung; dieser Baustein meldet sie beim Server an, bekommt den Keks und lädt
 *     die Seite neu. Er merkt davon eine Sekunde lang etwas — mehr nicht.
 *   · EINEN FREMDEN mit weitergeleitetem Link. Für ihn schlägt genau dieselbe Anfrage fehl,
 *     und es bleibt bei der Sperre.
 *
 * ES WIRD NICHT BEGRÜNDET, WARUM ES NICHT GEHT: Für einen Fremden soll nicht unterscheidbar
 * sein, ob es den Bericht nicht gibt oder ob er ihm nur nicht gehört. Deshalb steht hier ein
 * Satz, der beides abdeckt — und ein Weg zurück, wie überall im Haus.
 *
 * DER VERSUCH LÄUFT VON SELBST, ohne Knopf: Ein Besitzer soll nicht erst etwas anklicken
 * müssen, um an seine eigene Sache zu kommen.
 */
export default function DavidBesitzTor({ id, texte }: {
  id: string;
  texte: { pruefe: string; titel: string; text: string; anmelden: string; neu: string };
}) {
  const [zustand, setZustand] = useState<"pruefe" | "nein">("pruefe");

  useEffect(() => {
    let weg = false;
    void (async () => {
      let device = "";
      try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
      let tok = "";
      try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
      try {
        const d = await fetch("/api/david-besitz", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
          body: JSON.stringify({ id, device }),
        }).then(r => r.json());
        if (weg) return;
        /* Der Keks sitzt jetzt — neu laden, damit der Server die Seite mit Inhalt baut.
           `replace`, damit der Zurück-Pfeil nicht wieder auf die Sperre führt. */
        if (d?.darf) { window.location.replace(window.location.pathname); return; }
      } catch { /* dann bleibt es bei der Sperre */ }
      if (!weg) setZustand("nein");
    })();
    return () => { weg = true; };
  }, [id]);

  if (zustand === "pruefe") return <Fortschritt text={texte.pruefe} />;

  return (
    <div className="lb-rand-verlauf mt-6 rounded-[20px] bg-white/[0.035] p-6 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10">
        <Lock className="h-5 w-5 text-[#f6cf51]" />
      </span>
      <h2 className="mt-4 text-[19px] font-black leading-snug text-white">{texte.titel}</h2>
      <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/75">{texte.text}</p>
      <div className="mt-5 flex flex-col gap-2">
        <Knopf art="gold" href="/signin">{texte.anmelden}</Knopf>
        <Knopf art="umriss" href="/themes/david/start">{texte.neu}</Knopf>
      </div>
    </div>
  );
}
