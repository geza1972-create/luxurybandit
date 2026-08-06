"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import { fillPrices } from "@/lib/pricing";

/**
 * AUS DEM BILD EIN VIDEO MACHEN — nachträglich, auf der fertigen Einladung.
 *
 * Owner 04.08.2026: „er bekommt ein Bild für 1,49; wenn er das Video generieren möchte, dann
 * kann er das nachträglich für 3,99."
 *
 * WARUM AUF DIESER SEITE UND NICHT NUR IM TRICHTER: Im Trichter steht der Knopf schon, aber
 * dort ist er nur erreichbar, BEVOR die Einladung angelegt wird — danach springt die Seite
 * hierher. Wer erst verschickt und dann aufwerten will (und das ist der übliche Weg: man
 * schickt, es gefällt, man legt nach), fand hier nichts.
 *
 * DER LINK BLEIBT DERSELBE. Das ist der eigentliche Grund, warum das Aufwerten funktioniert:
 * Wer die Einladung schon bekommen hat, sieht beim nächsten Öffnen das Video statt des
 * Bildes. Man kauft also nicht auf Verdacht vorher, sondern weil man die Karte schon gut
 * findet — und niemand muss einen zweiten Link nachschicken.
 *
 * DAS BEZAHLTE STANDBILD IST DIE VORLAGE, nicht die Ausgangsfotos. Die liegen nur im Browser
 * dessen, der die Karte gebaut hat, und sind hier längst weg. Das Standbild zeigt ohnehin
 * genau das Motiv, das er gekauft und für gut befunden hat — „dasselbe, aber bewegt" ist
 * damit wörtlich zu nehmen. Die Video-Route kann aus EINEM Bild animieren
 * (`pixverseStart`), der Zwei-Bilder-Modus ist nur für den ersten Lauf nötig.
 *
 * WER DARF, ENTSCHEIDET DER SERVER — dieselbe Prüfung wie in `EinladungBearbeiten`: Der
 * Browser fragt mit seiner Gerätekennung nach. Für einen Gast gibt es diesen Knopf nicht;
 * er soll die Einladung sehen, nicht unseren Preis.
 */
export default function VideoAufwerten({ id, sprache, genId, bildUrl, prompt, lookId }: {
  id: string;
  sprache: string;
  /** Der Auftrag, gegen den abgebucht wird. Ohne ihn fällt die Kasse auf Stripe zurück. */
  genId?: string;
  /** Das bezahlte Standbild — die Vorlage für die Bewegung. */
  bildUrl: string;
  /** Was im Video passieren soll (holidayInvitePrompt bzw. weddingPrompt). */
  prompt: string;
  lookId: string;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const [darf, setDarf] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [fertig, setFertig] = useState(false);

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

  if (!darf || fertig) return null;

  /**
   * ERST ZAHLEN, DANN RENDERN — und das Fenster VOR jedem `await` öffnen.
   *
   * Browser erlauben `window.open` nur im selben Atemzug wie den Klick. Ein `await fetch`
   * davor reicht Safari und mobilem Chrome, um es STILL zu blockieren: kein Fehler, keine
   * Meldung, einfach nichts. Derselbe Fall wie in `EinladungBauen.bezahlen()`.
   */
  const starten = async () => {
    if (busy) return;
    setBusy(true); setStatus("");
    const popup = window.open("", "_blank", "popup,width=480,height=780");
    let email = "";
    try { email = localStorage.getItem("lb_kiss_mail") ?? ""; } catch { /**/ }
    try {
      const kasse = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genId, once: true, videoAufpreis: true, email, returnTo: window.location.pathname }),
      }).then(r => r.json());

      if (!kasse?.walletPaid) {
        if (!kasse?.url || !kasse?.sessionId) {
          try { popup?.close(); } catch { /**/ }
          setStatus(kasse?.error || T.abbrechen); setBusy(false); return;
        }
        if (!popup) { window.location.href = kasse.url; return; }
        try { popup.location.href = kasse.url; }
        catch { try { popup.close(); } catch { /**/ } window.location.href = kasse.url; return; }
        let bezahlt = false;
        for (let i = 0; i < 100; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(kasse.sessionId)}`).then(r => r.json()).catch(() => null);
          if (s?.paid) { bezahlt = true; break; }
          if (popup.closed && i > 2) break;
        }
        try { popup.close(); } catch { /**/ }
        if (!bezahlt) { setBusy(false); return; }
      } else {
        try { popup?.close(); } catch { /**/ }
      }

      setStatus(T.aboPruefen);
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        // EIN Bild, kein Referenz-Paar: siehe oben.
        body: JSON.stringify({ lookId, genId, image: bildUrl, prompt }),
      }).then(r => r.json());
      if (!start?.videoId) { setStatus(start?.error || T.abbrechen); setBusy(false); return; }

      for (let i = 0; i < 90; i++) {
        await new Promise(r => setTimeout(r, 4000));
        const q = await fetch(`/api/generate-tryon-video?videoId=${encodeURIComponent(start.videoId)}&curatorId=${encodeURIComponent(start.curatorId || "")}`)
          .then(r => r.json()).catch(() => null);
        if (q?.status === "done" && q.videoUrl) {
          /**
           * DAS VIDEO AN DIE EINLADUNG HÄNGEN — derselbe Link, neuer Inhalt. Ohne diesen
           * Schritt hätte er bezahlt und der Empfänger sähe weiter das Standbild.
           */
          let device = "";
          try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
          await fetch("/api/einladung", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ setVideo: id, videoUrl: q.videoUrl, device }),
          }).catch(() => {});
          setFertig(true);
          // Neu laden, damit die Karte oben das Video zeigt statt des Bildes.
          window.location.reload();
          return;
        }
        if (q?.status === "failed") { setStatus(q.error || T.abbrechen); setBusy(false); return; }
      }
      setStatus(T.abbrechen); setBusy(false);
    } catch {
      try { popup?.close(); } catch { /**/ }
      setStatus(T.abbrechen); setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      {/* Umriss statt gefüllt: Die Einladung ist fertig und verschickbar — das Video ist eine
          Aufwertung, keine fehlende Voraussetzung. */}
      <button type="button" onClick={() => void starten()} disabled={busy}
        className="lb-karte-absage flex h-11 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? (status || T.aboPruefen) : fillPrices(T.videoDaraus, sprache)}
      </button>
      {!busy && status && (
        <p role="alert" className="lb-karte-fehler mt-1.5 text-center text-[12px] font-black">{status}</p>
      )}
    </div>
  );
}
