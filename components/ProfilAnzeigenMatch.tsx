"use client";

import { useEffect, useRef, useState } from "react";
import { Target, Check, X as XIcon } from "lucide-react";
import { Kasten, Knopf, EingabeMehrzeilig, Fehlerzeile, Laden } from "@/components/CI";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";

/**
 * DER ANZEIGEN-ABGLEICH (Owner 24.08.2026, an der pauschalen „Starke/Gute Passung"-Liste:
 * „Ich brauche was visuelles. Einen Balken mit Prozente. Noch besser wäre wenn ich den Link
 * einer Anzeige einbaue und sehe direkt den Match.").
 *
 * NUR DER BESITZER sieht dieses Feld — dieselbe Server-Prüfung wie `ProfilKorrektur`
 * (`/api/lebenslauf-korrektur` GET, geteilte Logik `darfAmProfilArbeiten`). Ein Personaler,
 * der die geteilte Seite öffnet, sieht die Vorlage nie: Der Abgleich ist ein persönliches
 * Bewerbungs-Werkzeug, kein Teil des Dossiers, das an Firmen geht.
 *
 * KEIN GOLD AM BALKEN (Skill `ci-design` + Kopf-Kommentar von LebenslaufExecutive.tsx):
 * Gold trägt in dieser Vorlage nur die Wortmarke und den einen Knopf „Gespräch anfragen" —
 * der Balken ist Tinte, wie der Rest der Karte.
 *
 * NICHTS WIRD GESPEICHERT: Jeder Abgleich ist für DIESEN Moment — der Bewerber testet
 * Anzeige um Anzeige, das Ergebnis lebt nur im Browser, bis die Seite neu lädt.
 */

const TEXTE: Record<string, {
  titel: string; zeile: string; platzhalter: string; knopf: string; laeuft: string;
  jobtitelFehlt: string; gruendeH: string; lueckenH: string; neu: string;
  stark: string; mittel: string; schwach: string;
}> = {
  de: {
    titel: "Gegen eine Anzeige prüfen",
    zeile: "Füge den Link einer Stellenanzeige ein — oder ihren Text, falls der Link nicht lesbar ist.",
    platzhalter: "https://… oder den Text der Anzeige einfügen",
    knopf: "Match berechnen", laeuft: "Wird verglichen …",
    jobtitelFehlt: "Diese Anzeige",
    gruendeH: "Das passt", lueckenH: "Das fehlt noch",
    neu: "Andere Anzeige prüfen",
    stark: "Starke Übereinstimmung", mittel: "Teilweise Übereinstimmung", schwach: "Schwache Übereinstimmung",
  },
  en: {
    titel: "Check against a job posting",
    zeile: "Paste the link to a job posting — or its text, if the link can't be read.",
    platzhalter: "https://… or paste the posting's text",
    knopf: "Calculate match", laeuft: "Comparing …",
    jobtitelFehlt: "This posting",
    gruendeH: "What fits", lueckenH: "What's missing",
    neu: "Check another posting",
    stark: "Strong match", mittel: "Partial match", schwach: "Weak match",
  },
};

type Ergebnis = { prozent: number; jobtitel: string; gruende: string[]; luecken: string[] };

export default function ProfilAnzeigenMatch({ id, lang = "en" }: { id: string; lang?: string }) {
  const t = TEXTE[lang] ?? TEXTE.en;
  const [darf, setDarf] = useState(false);
  const [eingabe, setEingabe] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
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
    fetch(`/api/lebenslauf-korrektur?id=${encodeURIComponent(id)}&device=${encodeURIComponent(device)}`, { headers, cache: "no-store" })
      .then(r => r.json()).then(d => setDarf(d?.darf === true)).catch(() => setDarf(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!darf) return null;

  const pruefen = async () => {
    if (!eingabe.trim() || busy) return;
    setBusy(true); setFehler(""); setErgebnis(null);
    try {
      const { headers, device } = ausweis();
      const r = await fetch("/api/lebenslauf-match", {
        method: "POST", headers,
        body: JSON.stringify({ id, eingabe: eingabe.trim(), device, lang }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFehler(String(d?.error ?? "Hat nicht geklappt — bitte noch einmal.")); setBusy(false); return; }
      setErgebnis({ prozent: d.prozent ?? 0, jobtitel: d.jobtitel ?? "", gruende: d.gruende ?? [], luecken: d.luecken ?? [] });
    } catch {
      setFehler(lang === "de" ? "Keine Verbindung — bitte noch einmal." : "No connection — please try again.");
    }
    setBusy(false);
  };

  const einordnung = (p: number) => p >= 70 ? t.stark : p >= 40 ? t.mittel : t.schwach;

  return (
    <section className="border-t border-[#1a160f]/[0.11] px-5 py-6 md:px-8 md:py-7">
      <Kasten karte>
        <p className="flex items-center gap-2 text-[13px] font-black leading-snug">
          <Target className="h-4 w-4 shrink-0" />{t.titel}
        </p>

        {busy ? (
          <div className="mt-3"><Laden art="flaeche" karte text={t.laeuft} /></div>
        ) : ergebnis ? (
          <div className="mt-3.5">
            {ergebnis.jobtitel && <p className="text-[12px] font-black uppercase tracking-[0.1em] opacity-50">{ergebnis.jobtitel}</p>}

            {/* DER BALKEN — Tinte, kein Gold (Kopf-Kommentar). Die Zahl gross und in Serife,
                weil sie hier die eine Zahl ist, die zählt (dasselbe Prinzip wie die
                „Ausgewählte Ergebnisse"-Zahlen im Dossier). */}
            <div className="mt-2 flex items-baseline gap-3">
              <p className="font-serif text-[34px] font-black leading-none">{ergebnis.prozent}%</p>
              <p className="text-[11.5px] font-black uppercase tracking-[0.1em] opacity-60">{einordnung(ergebnis.prozent)}</p>
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#1a160f]/10">
              <div className="h-full rounded-full bg-[#1a160f] transition-all" style={{ width: `${ergebnis.prozent}%` }} />
            </div>

            {ergebnis.gruende.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-40">{t.gruendeH}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {ergebnis.gruende.map(g => (
                    <li key={g} className="flex items-start gap-1.5 text-[12.5px] font-bold leading-snug opacity-80">
                      <Check className="mt-[2px] h-3.5 w-3.5 shrink-0 opacity-60" />{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ergebnis.luecken.length > 0 && (
              <div className="mt-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-40">{t.lueckenH}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {ergebnis.luecken.map(g => (
                    <li key={g} className="flex items-start gap-1.5 text-[12.5px] font-bold leading-snug opacity-70">
                      <XIcon className="mt-[2px] h-3.5 w-3.5 shrink-0 opacity-45" />{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="button" onClick={() => { setErgebnis(null); setEingabe(""); }}
              className="mt-4 text-[11px] font-black uppercase tracking-[0.12em] opacity-45 transition hover:opacity-80">
              {t.neu}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[12.5px] font-bold leading-snug opacity-70">{t.zeile}</p>
            <EingabeMehrzeilig karte className="mt-3" zeilen={4} value={eingabe}
              placeholder={t.platzhalter}
              onChange={e => setEingabe(e.target.value)} />
            <Fehlerzeile karte>{fehler}</Fehlerzeile>
            <div className="mt-3">
              <Knopf art="umriss" karte disabled={!eingabe.trim()} onClick={() => void pruefen()}>
                {t.knopf}
              </Knopf>
            </div>
          </>
        )}
      </Kasten>
    </section>
  );
}
