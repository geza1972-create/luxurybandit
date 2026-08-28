"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, RotateCcw } from "lucide-react";
import { Knopf, Scheibe, Fehlerzeile } from "@/components/CI";

/**
 * DIE SELBSTAUFNAHME — KAMERA, GESICHTSKREIS UND SKRIPT ZUM ABLESEN.
 *
 * Owner 28.08.2026: „Es wird doch nicht aus dem Foto erstellt, sondern aus einem Video, weil
 * wir die Stimme brauchen. Da öffnet sich doch ein Fenster zur Aufnahme mit Kreis für
 * Gesicht und Skript."
 *
 * WARUM DAS EIN EIGENER BAUSTEIN IST: Die Teile gab es im Haus, aber getrennt und jeweils
 * eingewachsen —
 *   · `KissFunnel` (Geburtstag, Versprechen): Kamera im Vollbild, Start per Knopf, Stopp mit
 *     Restsekunden — aber ohne Skript, denn dort spricht man frei.
 *   · `LebenslaufStartClient`: das Skript zum Ablesen — aber ohne Kamera, dort lädt man eine
 *     fertige Datei hoch.
 * Für eine Video-Bewerbung braucht es beides gleichzeitig: Man liest ab UND filmt sich. Statt
 * die eine Hälfte in die andere zu kopieren, steht hier der eine Baustein, den beide später
 * benutzen können (dieselbe Haltung wie bei der CI-Bibliothek: erst eintragen, dann
 * benutzen; bestehende Stellen ziehen rollierend nach).
 *
 * WAS ER BEWUSST NICHT TUT: hochladen. Er gibt die fertige Datei zurück; wohin sie geht,
 * entscheidet der Aufrufer. So bleibt er frei von Produktwissen.
 *
 * DREI DINGE AUS DEM BESTEHENDEN CODE ÜBERNOMMEN, weil sie teuer gelernt sind:
 *   1. AUFNAHME STARTET NUR PER KNOPF (Owner 08.08.2026: „Ich muss erst mal meinen Kopf
 *      platzieren und mich vorbereiten, dann starte ich selbst") — kein 3-2-1 von allein.
 *   2. MP4 VOR WEBM: iOS kann mit webm wenig anfangen; der Recorder nimmt, was der Browser
 *      wirklich unterstützt.
 *   3. DER AUSGANG IST DAS KREUZ OBEN RECHTS (Owner 09.08.2026) — nie ein zweiter Knopf
 *      neben dem Start.
 */

export default function SelbstAufnahme({ skript, maxSekunden = 90, texte, aufFertig, aufAbbruch }: {
  /** Der Text zum Ablesen — er läuft über der Kamera mit. */
  skript: string;
  maxSekunden?: number;
  texte: {
    titel: string; hinweis: string; los: string; stopp: string;
    nochmal: string; uebernehmen: string; keineKamera: string; schliessen: string;
  };
  /** Die fertige Aufnahme — der Aufrufer lädt sie hoch. */
  aufFertig: (datei: File) => void;
  aufAbbruch: () => void;
}) {
  const vorschauRef = useRef<HTMLVideoElement>(null);
  const stromRef = useRef<MediaStream | null>(null);
  const rekRef = useRef<MediaRecorder | null>(null);
  const teileRef = useRef<BlobPart[]>([]);
  const [laeuft, setLaeuft] = useState(false);
  const [rest, setRest] = useState(maxSekunden);
  const [fertig, setFertig] = useState<{ datei: File; url: string } | null>(null);
  const [fehler, setFehler] = useState("");

  /* Kamera an, sobald das Fenster steht — aber NICHT aufnehmen. */
  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const strom = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        });
        if (abgebrochen) { strom.getTracks().forEach(t => t.stop()); return; }
        stromRef.current = strom;
        if (vorschauRef.current) {
          vorschauRef.current.srcObject = strom;
          void vorschauRef.current.play().catch(() => { /* Vorschau darf stumm scheitern */ });
        }
      } catch { setFehler(texte.keineKamera); }
    })();
    return () => {
      abgebrochen = true;
      try { stromRef.current?.getTracks().forEach(t => t.stop()); } catch { /**/ }
      if (vorschauRef.current) vorschauRef.current.srcObject = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Der Countdown während der Aufnahme — und der harte Stopp am Ende. */
  useEffect(() => {
    if (!laeuft) return;
    setRest(maxSekunden);
    const uhr = setInterval(() => {
      setRest(r => {
        if (r <= 1) { stopp(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(uhr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laeuft]);

  const los = () => {
    const strom = stromRef.current;
    if (!strom) { setFehler(texte.keineKamera); return; }
    setFehler(""); teileRef.current = [];
    /* MP4 WENN MÖGLICH (iOS), sonst webm — sonst entsteht eine Datei, die der Nutzer
       hinterher nirgends abspielen kann. */
    const typ = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.("video/mp4")
      ? "video/mp4"
      : MediaRecorder.isTypeSupported?.("video/webm") ? "video/webm" : "";
    try {
      const rek = new MediaRecorder(strom, typ ? { mimeType: typ } : undefined);
      rek.ondataavailable = e => { if (e.data?.size) teileRef.current.push(e.data); };
      rek.onstop = () => {
        const art = typ || "video/webm";
        const blob = new Blob(teileRef.current, { type: art });
        const endung = art.includes("mp4") ? "mp4" : "webm";
        const datei = new File([blob], `aufnahme.${endung}`, { type: art });
        setFertig({ datei, url: URL.createObjectURL(blob) });
      };
      rekRef.current = rek;
      rek.start();
      setLaeuft(true);
    } catch { setFehler(texte.keineKamera); }
  };

  const stopp = () => {
    try { rekRef.current?.stop(); } catch { /**/ }
    setLaeuft(false);
  };

  const nochmal = () => {
    if (fertig) { try { URL.revokeObjectURL(fertig.url); } catch { /**/ } }
    setFertig(null); setRest(maxSekunden);
  };

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black">
      {/* Der Ausgang — oben rechts, wie überall im Haus. */}
      <div className="absolute right-4 top-4 z-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <Scheibe label={texte.schliessen} onClick={() => { stopp(); aufAbbruch(); }}>
          <X className="h-4 w-4" />
        </Scheibe>
      </div>

      {/* ── Das Bild: entweder die Kamera oder die fertige Aufnahme ── */}
      <div className="relative flex-1 overflow-hidden">
        {fertig ? (
          <video src={fertig.url} controls playsInline className="h-full w-full object-contain" />
        ) : (
          <>
            <video ref={vorschauRef} muted playsInline className="h-full w-full object-cover" />
            {/* DER KREIS FÜRS GESICHT (Owner 28.08.2026) — er sagt ohne ein Wort, wohin der
                Kopf gehört. Nur eine Hilfslinie, kein Beschnitt: Aufgenommen wird das ganze
                Bild, sonst fehlte der KI später der Rand. */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="aspect-square w-[62%] max-w-[320px] rounded-full border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </>
        )}
      </div>

      {/* ── Das Skript zum Ablesen — direkt über den Knöpfen, damit der Blick nahe an der
             Kamera bleibt. Scrollbar, weil ein Skript länger sein darf als der Platz. ── */}
      {!fertig && (
        <div className="lb-wisch max-h-[26vh] overflow-y-auto border-t border-white/10 bg-black/80 px-5 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">{texte.titel}</p>
          <p className="mt-1.5 whitespace-pre-line text-[15px] font-semibold leading-relaxed text-white/90">{skript}</p>
        </div>
      )}

      {/* ── Die Bedienung ── */}
      <div className="flex flex-col items-center gap-2.5 bg-black px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3">
        <Fehlerzeile>{fehler}</Fehlerzeile>
        {fertig ? (
          <div className="flex w-full max-w-[420px] flex-col gap-2">
            <Knopf art="gold" onClick={() => aufFertig(fertig.datei)}>{texte.uebernehmen}</Knopf>
            <Knopf art="umriss" onClick={nochmal}>
              <RotateCcw className="mr-2 inline h-4 w-4" />{texte.nochmal}
            </Knopf>
          </div>
        ) : laeuft ? (
          <button type="button" onClick={stopp}
            className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-white bg-white px-6 text-[15px] font-black text-[#1a160f] transition active:scale-95">
            <Square className="h-4 w-4" fill="#dc2626" color="#dc2626" />
            {texte.stopp}{rest ? ` · ${rest}s` : ""}
          </button>
        ) : (
          <>
            <button type="button" onClick={los}
              className="lb-gold flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-black transition active:scale-95">
              <Mic className="h-4 w-4" />{texte.los}
            </button>
            <p className="text-center text-[12.5px] font-bold leading-snug text-white/60">{texte.hinweis}</p>
          </>
        )}
      </div>
    </div>
  );
}
