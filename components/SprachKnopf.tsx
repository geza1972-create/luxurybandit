"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

/**
 * DER SPRACHKNOPF — reden statt tippen (Owner 09.09.2026: „da machst du jetzt genauso wie WA
 * auch Sprache jetzt" · „ich kann es mit Sprache steuern").
 *
 * ── ANTIPPEN, NICHT HALTEN ─────────────────────────────────────────────────────────────────
 *
 * WhatsApp lässt einen den Knopf halten. Das ist dort richtig: eine Sprachnachricht ist
 * kurz, und Loslassen heisst Abschicken. Hier beschreibt jemand sein Geschäft — das dauert
 * dreissig Sekunden, und einen Knopf dreissig Sekunden lang zu halten, während man nachdenkt,
 * ist eine Zumutung. Also: antippen, reden, wieder antippen.
 *
 * ── DER TEXT LANDET IM FELD, NICHT DIREKT IM GESPRÄCH ──────────────────────────────────────
 *
 * Das ist der eine Unterschied zu WhatsApp, und er hat einen Grund: Jede Nachricht löst einen
 * bezahlten Aufruf aus. Ein missverstandener Satz — und die Erkennung verhört sich bei Namen,
 * Orten und Zahlen zuverlässig — kostet dann nicht nur Geld, sondern schickt den Agenten in
 * die falsche Richtung. Er sieht, was verstanden wurde, kann es ändern und schickt selbst.
 *
 * ── OHNE MIKROFON GIBT ES DEN KNOPF NICHT ──────────────────────────────────────────────────
 *
 * Kein Gerät hat eins? Kein Knopf. Ein Knopf, der beim Antippen eine Fehlermeldung ausspuckt,
 * ist schlimmer als keiner ([[immer-close-einbauen]] in klein).
 */
export default function SprachKnopf({ lang, fertig, aus }: {
  lang?: string;
  /** Bekommt den erkannten Text — er gehört ins Eingabefeld, nicht ins Gespräch. */
  fertig: (text: string) => void;
  /** Der Chat arbeitet gerade; dann wird nicht aufgenommen. */
  aus?: boolean;
}) {
  const [kann, setKann] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [schreibt, setSchreibt] = useState(false);
  const [fehler, setFehler] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stuecke = useRef<Blob[]>([]);

  useEffect(() => {
    setKann(typeof navigator !== "undefined"
      && !!navigator.mediaDevices?.getUserMedia
      && typeof MediaRecorder !== "undefined");
  }, []);

  /* Die Spur wird beim Verlassen der Seite geschlossen — sonst bleibt das rote Aufnahme-
     Zeichen im Browsertab stehen, obwohl niemand mehr aufnimmt. */
  useEffect(() => () => {
    recorder.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  const anfangen = async () => {
    setFehler("");
    try {
      const spur = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(spur);
      stuecke.current = [];
      r.ondataavailable = e => { if (e.data.size) stuecke.current.push(e.data); };
      r.onstop = async () => {
        spur.getTracks().forEach(t => t.stop());
        const blob = new Blob(stuecke.current, { type: r.mimeType || "audio/webm" });
        if (blob.size < 2000) { setLaeuft(false); return; }
        setSchreibt(true);
        try {
          const form = new FormData();
          form.append("ton", blob, "aufnahme.webm");
          const res = await fetch(`/api/versusforge-sprache${lang ? `?lang=${lang.slice(0, 2)}` : ""}`, {
            method: "POST", body: form,
          });
          const d = (await res.json()) as Record<string, unknown>;
          if (!res.ok) { setFehler(String(d.error ?? "Das habe ich nicht verstanden.")); return; }
          const text = String(d.text ?? "").trim();
          if (text) fertig(text);
          else setFehler("Da war nichts zu hören.");
        } catch {
          setFehler("Das ging gerade nicht.");
        } finally { setSchreibt(false); }
      };
      r.start();
      recorder.current = r;
      setLaeuft(true);
    } catch {
      /* Abgelehnt oder kein Gerät — beides ist dieselbe Auskunft für ihn. */
      setFehler("Kein Zugriff aufs Mikrofon.");
      setKann(false);
    }
  };

  const aufhoeren = () => {
    recorder.current?.stop();
    setLaeuft(false);
  };

  if (!kann) return null;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        disabled={aus || schreibt}
        onClick={() => (laeuft ? aufhoeren() : void anfangen())}
        aria-label={laeuft ? "Aufnahme beenden" : "Sprechen"}
        className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-30 ${
          laeuft
            /* Rot und pulsierend, solange aufgenommen wird — das eine Zeichen, das jeder
               ohne Erklärung liest. */
            ? "lb-tippt bg-[#c02626] text-white"
            : "border-[1.5px] border-[#dfe4e9] bg-white text-[#5b666f] hover:text-[#1d6fd0]"}`}
      >
        {laeuft ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
      </button>
      {(schreibt || fehler) && (
        <span className={`mt-1 whitespace-nowrap text-[12px] font-bold ${fehler ? "text-[#c02626]" : "text-[#8b959d]"}`}>
          {fehler || "…"}
        </span>
      )}
    </div>
  );
}
