"use client";

import { useEffect, useState } from "react";
import { PencilLine, ChevronDown } from "lucide-react";
import { Kasten, Knopf, EingabeMehrzeilig, Fehlerzeile, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DAS KORREKTUR-FELD AM PROFIL (Owner 24.08.2026: „Der User braucht hier einen Promptfeld
 * und die Daten zu korrigieren. Zum Beispiel, ich will hier Nutrycoach nicht erwähnen,
 * stattdessen will ich lieber was anderes schreiben.").
 *
 * NUR FÜR DEN BESITZER: Die Seite geht an Firmen — deshalb fragt der Baustein zuerst den
 * Server (`GET /api/lebenslauf-korrektur`), ob Konto/Gerät/Admin zum Profil passen, und
 * erscheint sonst GAR NICHT. Ein Fremder mit dem Link sieht kein Werkzeug.
 *
 * Gestalt wie der Profil-Chat-Einstieg daneben: ein stiller Kasten im Kartenpapier, der
 * sich auf Tipp öffnet. Absagen stehen ROT am Feld (Memory
 * `sichtbare-fehler-keine-formularfelder`), und nach einer angenommenen Korrektur lädt die
 * Seite neu — was danach steht, steht wirklich im Speicher.
 */

const TEXTE: Record<string, { titel: string; platzhalter: string; knopf: string; laeuft: string; hinweis: string }> = {
  de: {
    titel: "Etwas stimmt nicht? Korrigiere dein Profil",
    platzhalter: "z. B. Erwähne Nutrycoach nicht — schreib stattdessen über mein Projekt X.",
    knopf: "Korrektur anwenden",
    laeuft: "Dein Profil wird überarbeitet …",
    hinweis: "Schreib in ganzen Sätzen, was geändert werden soll. Nur du siehst dieses Feld.",
  },
  en: {
    titel: "Something off? Correct your profile",
    platzhalter: "e.g. Don't mention Nutrycoach — write about my project X instead.",
    knopf: "Apply correction",
    laeuft: "Updating your profile …",
    hinweis: "Write in full sentences what should change. Only you can see this field.",
  },
};

export default function ProfilKorrektur({ id, lang = "en" }: { id: string; lang?: string }) {
  const t = TEXTE[lang] ?? TEXTE.en;
  const [darf, setDarf] = useState(false);
  const [offen, setOffen] = useState(false);
  const [anweisung, setAnweisung] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");

  /* Kopfzeilen für Besitz-Nachweis — dieselben drei Wege wie die Galerie: Admin-PIN,
     angemeldetes Konto (Bearer), Gerätekennung. */
  const ausweis = (): { headers: Record<string, string>; device: string } => {
    let device = "", pin = "", tok = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { pin = localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { /**/ }
    try { tok = getStoredAuthSession()?.access_token ?? ""; } catch { /**/ }
    return {
      headers: {
        "Content-Type": "application/json",
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(pin ? { "x-try-look-admin-pin": pin } : {}),
      },
      device,
    };
  };

  useEffect(() => {
    const { headers, device } = ausweis();
    fetch(`/api/lebenslauf-korrektur?id=${encodeURIComponent(id)}&device=${encodeURIComponent(device)}`,
      { headers, cache: "no-store" })
      .then(r => r.json())
      .then(d => setDarf(d?.darf === true))
      .catch(() => setDarf(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!darf) return null;

  /* Die Abschnitts-Hülle des Dossiers (Polster + Haarlinie wie `LINIE` in
     LebenslaufExecutive) wohnt HIER: Erst nach bestätigtem Besitz existiert überhaupt ein
     Abschnitt — sonst stünde für jeden Fremden ein leerer Streifen im Blatt. */

  const anwenden = async () => {
    if (!anweisung.trim() || busy) return;
    setBusy(true); setFehler("");
    try {
      const { headers, device } = ausweis();
      const r = await fetch("/api/lebenslauf-korrektur", {
        method: "POST", headers,
        body: JSON.stringify({ id, anweisung: anweisung.trim(), device }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d?.ok) {
        setFehler(String(d?.error ?? "Hat nicht geklappt — bitte noch einmal."));
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch {
      setFehler(lang === "de" ? "Keine Verbindung — bitte noch einmal." : "No connection — please try again.");
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-[#1a160f]/[0.11] px-5 py-6 md:px-8 md:py-7">
    <Kasten karte polster="p-0">
      <button type="button" onClick={() => setOffen(o => !o)} aria-expanded={offen}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <PencilLine className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 text-[13px] font-black leading-snug">{t.titel}</span>
        <ChevronDown aria-hidden className={`h-4 w-4 shrink-0 opacity-40 transition-transform ${offen ? "rotate-180" : ""}`} />
      </button>

      {offen && (
        <div className="border-t border-[#1a160f]/15 px-4 pb-4 pt-3">
          {busy ? (
            <Laden art="flaeche" karte text={t.laeuft} />
          ) : (
            <>
              <EingabeMehrzeilig karte zeilen={3} value={anweisung}
                placeholder={t.platzhalter}
                onChange={e => setAnweisung(e.target.value)} />
              <Fehlerzeile karte>{fehler}</Fehlerzeile>
              <p className="mt-2 text-[11px] font-bold leading-snug opacity-50">{t.hinweis}</p>
              <div className="mt-3">
                <Knopf art="umriss" karte disabled={!anweisung.trim()} onClick={() => void anwenden()}>
                  {t.knopf}
                </Knopf>
              </div>
            </>
          )}
        </div>
      )}
    </Kasten>
    </section>
  );
}
