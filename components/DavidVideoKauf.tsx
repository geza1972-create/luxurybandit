"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Video } from "lucide-react";
import { Knopf, Fehlerzeile, Fortschritt, EingabeMehrzeilig } from "@/components/CI";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { getStoredAuthSession } from "@/lib/supabase-auth-client";
import { useKasseImFenster } from "@/components/KasseImFenster";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import SelbstAufnahme from "@/components/SelbstAufnahme";
import type { DavidTunnelTexte } from "@/lib/david-tunnel-texte";

/**
 * DIE VIDEO-BEWERBUNG — IM DAVID-FENSTER, NICHT WOANDERS.
 *
 * Owner 28.08.2026, mit Bild des alten Trichters: „nein, das springt dahin. Da ist was ganz
 * anderes" — der Knopf führte auf `/themes/lebenslauf/start`, wo ein anderes Produkt steht
 * und erneut nach der Stellenanzeige gefragt wird. Wer gerade sein Screening beendet hat,
 * darf nicht in einem fremden Trichter landen.
 *
 * ES ENTSTEHT AUS EINER AUFNAHME, NICHT AUS EINEM FOTO (Owner 28.08.2026: „Es wird doch
 * nicht aus dem Foto erstellt, sondern aus einem Video, weil wir die Stimme brauchen. Da
 * öffnet sich doch ein Fenster zur Aufnahme mit Kreis für Gesicht und Skript." — und
 * bestätigend zur Kette: „wir haben doch mit ChatGPT 2 gearbeitet", also gpt-image-2).
 *
 * DER ABLAUF, ALLES AUF DIESER SEITE:
 *   1. Skript — David schreibt es aus Lebenslauf, Stelle UND Gespräch (`videoskript`);
 *      der Bewerber liest es und darf jeden Satz ändern
 *   2. Aufnahme — Kamera mit Gesichtskreis, das Skript läuft darüber mit
 *      (`components/SelbstAufnahme`). Aus dieser einen Aufnahme kommt BEIDES:
 *        · ein Standbild → gpt-image-2 macht daraus den Berufs-Look
 *        · die Tonspur   → HeyGen spricht mit SEINER Stimme
 *      Genau dafür nimmt `/api/lebenslauf-video` `foto` UND `audioPath` entgegen.
 *   3. Kaufen — Kasse im Fenster, eigener Preis ohne Abo (`DAVID_VIDEO_CENTS`)
 *   4. Erzeugen — die bestehende Kette; die Auftragsnummer wandert an den kiss-log-Eintrag,
 *      die Lieferkette holt das fertige Video ab
 *   5. Es erscheint in „Assets" — wie jedes andere Werk des Hauses
 *
 * WARUM DER KAUF VOR DER ERZEUGUNG STEHT: Ein HeyGen-Lauf kostet uns Geld, sobald er
 * startet. Beim Lebenslauf ist es umgekehrt (dort gibt es eine Gratis-Fassung mit
 * Wasserzeichen) — hier gibt es nichts, was man vorher zeigen könnte.
 */

type Phase = "start" | "skript" | "aufnahme" | "laeuft" | "fertig";

export default function DavidVideoKauf({ S, preisVideo, genId, email, lang, vorname }: {
  S: DavidTunnelTexte;
  preisVideo: string;
  genId: string;
  email: string;
  lang: string;
  vorname?: string;
}) {
  const [phase, setPhase] = useState<Phase>("start");
  const [foto, setFoto] = useState("");          // Standbild aus der Aufnahme (Data-URL)
  const [aufnahmePath, setAufnahmePath] = useState("");  // die hochgeladene Aufnahme (Stimme)
  const [aufnahmeOffen, setAufnahmeOffen] = useState(false);
  const [sprechtext, setSprechtext] = useState("");
  const [look, setLook] = useState<{ kleidung: string; umgebung: string }>({ kleidung: "", umgebung: "" });
  /* Die drei Hintergrund-Vorschläge aus der Stelle (Owner 28.08.2026: „warm business",
     „Der Kunde müsste hier entscheiden oder wir je nachdem als was er sich bewirbt"). */
  const [umgebungen, setUmgebungen] = useState<string[]>([]);
  const [umgebungLabel, setUmgebungLabel] = useState<string[]>([]);
  const [kleidungen, setKleidungen] = useState<string[]>([]);
  const [kleidungLabel, setKleidungLabel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [fehler, setFehler] = useState("");
  const kasse = useKasseImFenster(phase);

  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };
  /**
   * DIE ANMELDUNG REIST MIT (Owner 28.08.2026: „bin doch eingeloggt").
   *
   * Der Server prüft „Konto schlägt Gerät" — aber nur, wenn er das Konto überhaupt sieht.
   * `getSellerFromRequest` liest den `Authorization`-Kopf; ohne ihn ist jeder Besucher
   * anonym, und ein angemeldeter Nutzer auf einem zweiten Gerät fliegt hinaus.
   */
  const anmeldeKopf = (): Record<string, string> => {
    try {
      const tok = getStoredAuthSession()?.access_token ?? "";
      return tok ? { Authorization: `Bearer ${tok}` } : {};
    } catch { return {}; }
  };
  const kopfzeilen = (): Record<string, string> => ({ "Content-Type": "application/json", ...anmeldeKopf() });

  /**
   * AUS DER AUFNAHME WERDEN ZWEI DINGE: ein Standbild und die Datei selbst.
   *
   * Das Standbild entsteht im Browser (Canvas auf den ersten brauchbaren Moment) — es geht
   * als Data-URL an gpt-image-2, genau wie beim Foto-Weg. Die Datei wandert direkt zu
   * Supabase (signierte Adresse, Memory `large-uploads-direct-to-supabase`) und ihr Pfad
   * später als `audioPath` an die Kette: daraus nimmt HeyGen die Stimme.
   */
  const aufnahmeVerarbeiten = async (datei: File) => {
    setAufnahmeOffen(false);
    setBusy(true); setBusyText(S.videoAufnahmeLaedt); setFehler("");
    try {
      /* 1 · Standbild ziehen — eine Sekunde hinein, da schaut man meist schon in die Kamera. */
      const url = URL.createObjectURL(datei);
      const v = document.createElement("video");
      v.src = url; v.muted = true; (v as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
      await new Promise<void>((res, rej) => {
        v.onloadeddata = () => res();
        v.onerror = () => rej(new Error("video"));
      });
      v.currentTime = Math.min(1, (v.duration || 2) / 2);
      await new Promise<void>(res => { v.onseeked = () => res(); });
      const c = document.createElement("canvas");
      const kante = 1024;
      const faktor = Math.min(1, kante / Math.max(v.videoWidth || kante, v.videoHeight || kante));
      c.width = Math.round((v.videoWidth || kante) * faktor);
      c.height = Math.round((v.videoHeight || kante) * faktor);
      c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
      setFoto(c.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);

      /* 2 · Die Aufnahme selbst hochladen — sie trägt die Stimme. */
      const ext = (datei.name.split(".").pop() || "mp4").toLowerCase();
      const signiert = await fetch("/api/lebenslauf-video-url", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({ extension: ext }),
      }).then(r => r.json());
      if (!signiert?.uploadUrl || !signiert?.path) throw new Error("upload");
      const put = await fetch(signiert.uploadUrl, {
        method: "PUT", headers: { "Content-Type": datei.type || "video/mp4", "x-upsert": "true" }, body: datei,
      });
      if (!put.ok) throw new Error("upload");
      setAufnahmePath(signiert.path);
    } catch { setFehler(S.videoAufnahmeFehler); }
    setBusy(false); setBusyText("");
  };

  const skriptHolen = async () => {
    setBusy(true); setBusyText(S.videoSkriptLaeuft); setFehler("");
    try {
      const d = await fetch("/api/david-screening", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({ id: genId, device: geraet(), schritt: "videoskript" }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); setBusyText(""); return; }
      setSprechtext(String(d.sprechtext ?? ""));
      setLook({ kleidung: String(d.kleidung ?? ""), umgebung: String(d.umgebung ?? "") });
      setUmgebungen(Array.isArray(d.umgebungen) ? d.umgebungen.map(String) : []);
      setUmgebungLabel(Array.isArray(d.umgebungLabel) ? d.umgebungLabel.map(String) : []);
      setKleidungen(Array.isArray(d.kleidungen) ? d.kleidungen.map(String) : []);
      setKleidungLabel(Array.isArray(d.kleidungLabel) ? d.kleidungLabel.map(String) : []);
      setPhase("skript");
    } catch { setFehler(S.videoNetzFehler); }
    setBusy(false); setBusyText("");
  };

  /** Nach der Zahlung: die bestehende Kette starten und die Auftragsnummer ablegen. */
  const erzeugen = async () => {
    /* Auch hier: Der Assets-Chip soll pulsieren, sobald das Video entsteht (28.08.2026). */
    try { window.dispatchEvent(new Event("lb-arbeit-neu")); } catch { /**/ }
    void logTunnelEvent("payment_completed", "david");
    setPhase("laeuft"); setBusy(true); setBusyText(S.videoLaeuft); setFehler("");
    try {
      const d = await fetch("/api/lebenslauf-video", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({
          id: genId, device: geraet(), foto,
          sprechtext: sprechtext.trim(),
          /* DIE EIGENE STIMME (Owner 28.08.2026) — mit `audioPath` nimmt die Kette die
             Tonspur der Aufnahme statt der HeyGen-Standardstimme. */
          ...(aufnahmePath ? { audioPath: aufnahmePath } : {}),
          kleidung: look.kleidung, umgebung: look.umgebung,
        }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); setBusyText(""); return; }
      /* Die Auftragsnummer an den Auftrag hängen — daran erkennt die Lieferkette, dass sie
         das fertige Video abholen und in die Assets legen soll. */
      if (d?.videoId) {
        await fetch("/api/kiss-log", {
          method: "POST", headers: kopfzeilen(),
          body: JSON.stringify({ update: genId, videoId: d.videoId, device: geraet(), email }),
        }).catch(() => null);
      }
      setPhase("fertig");
    } catch { setFehler(S.videoNetzFehler); }
    setBusy(false); setBusyText("");
  };

  /**
   * DER RÜCKKEHR-FÄNGER (Owner 29.08.2026, kurz bevor er den Video-Kauf testen wollte —
   * derselbe Fehler, der ihn heute Morgen beim CV-Kauf 9,99 € gekostet hat).
   *
   * WAS FEHLTE: Der Kauf wartete AUSSCHLIESSLICH darauf, dass sich das Stripe-Fenster
   * schliesst, und fragte solange den Zahlungsstand ab. Auf vielen Handys öffnet Stripe aber
   * kein Fenster, sondern lädt DIESE Seite neu und hängt `?paid=1&cs=…` an die Adresse. Dann
   * war die Schleife längst tot, der React-Zustand zurückgesetzt — und niemand hat die
   * Rückkehr bemerkt. Der Käufer hatte bezahlt und stand vor der unveränderten Seite.
   *
   * DERSELBE ABLAUF WIE BEI DEN UNTERLAGEN (`DavidAngebote`):
   *   1. `paid=1` heisst „gerade zurückgekommen"
   *   2. Der SERVER sagt, ob bezahlt wurde (`/api/checkout-status`) — nie der Browser
   *   3. Die Adresse wird sofort gesäubert, damit ein Neuladen nicht zweimal auslöst
   *   4. Erst dann die Erzeugung
   *
   * `rueckkehrRef` gegen den doppelten Lauf: React ruft Effekte im Entwicklungsmodus zweimal
   * auf, und zwei Videos auf einem Auftrag wären zwei bezahlte Läufe für ein Geld.
   */
  const rueckkehrRef = useRef(false);
  useEffect(() => {
    if (rueckkehrRef.current || !genId) return;
    let q: URLSearchParams;
    try { q = new URLSearchParams(window.location.search); } catch { return; }
    if (q.get("paid") !== "1") return;
    /* NUR DAS VIDEO FÄNGT DAS VIDEO: Auf derselben Seite steht auch der Unterlagen-Kauf.
       Ohne diese Marke würden beide dieselbe Rückkehr abfangen und zwei Erzeugungen starten. */
    if (q.get("was") !== "video") return;
    const cs = q.get("cs") ?? "";
    if (!cs || cs.startsWith("{")) return;
    rueckkehrRef.current = true;
    void (async () => {
      const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(cs)}`)
        .then(r => r.json()).catch(() => null);
      q.delete("paid"); q.delete("cs"); q.delete("was");
      const rest = q.toString();
      try { window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : "")); } catch { /**/ }
      if (!st?.paid) { setFehler(S.videoNetzFehler); return; }
      await erzeugen();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genId]);

  const kaufen = async () => {
    if (busy || !genId) return;
    if (sprechtext.trim().length < 40) { setFehler(S.videoSkriptFehlt); return; }
    if (!foto || !aufnahmePath) { setFehler(S.videoAufnahmeFehlt); return; }
    setFehler("");
    const popup = kassenFenster();
    void logTunnelEvent("checkout_started", "david");
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: kopfzeilen(),
        body: JSON.stringify({
          genId, once: true, videoAufpreis: false, thema: "david-video",
          email,
          /* `was=video` reist mit und kommt in der Rückkehr-Adresse wieder an — daran
             erkennt der Fänger oben, dass DIESER Kauf gemeint war und nicht der der
             Unterlagen auf derselben Seite. */
          returnTo: `${window.location.pathname}?was=video`,
          eingebettet: kasse.anfordern, lang,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) { try { popup?.close(); } catch { /**/ } await erzeugen(); return; }
      if ((!start?.url && !start?.clientSecret) || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setFehler(start?.error || S.videoNetzFehler);
        return;
      }
      if (kasse.uebernehmen(start.clientSecret)) return;
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return;
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (st?.paid) { try { popup.close(); } catch { /**/ } await erzeugen(); return; }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
    } catch {
      try { popup?.close(); } catch { /**/ }
      setFehler(S.videoNetzFehler);
    }
  };

  /* ─────────────────────────────── Anzeige ─────────────────────────────── */

  if (phase === "start") {
    return (
      <div className="mt-3">
        {/* WÄHREND DAS SKRIPT ENTSTEHT, MUSS ES DAS SAGEN (gemessen 28.08.2026: Nach dem
            Tipp stand zehn Sekunden lang unverändert derselbe Knopf da — der Nutzer tippt
            dann ein zweites Mal, und beim zweiten Mal läuft der Aufruf doppelt). */}
        {busy
          ? <Fortschritt text={busyText || S.videoSkriptLaeuft} />
          : <Knopf art="gold" onClick={() => { void logFunnelEvent("video_offer_clicked", { theme: "david" }); void skriptHolen(); }}>
              {`${S.videoCta} — ${preisVideo}`}
            </Knopf>}
        <Fehlerzeile>{fehler}</Fehlerzeile>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-[18px] bg-white/[0.035] p-4 lb-rand-verlauf">
      {/* ── 2 · DIE AUFNAHME — Kamera mit Kreis, Skript läuft mit ── */}
      {phase === "aufnahme" && (
        <>
          <p className="text-[15px] font-black leading-snug text-white">{S.videoAufnahmeTitel}</p>
          <p className="text-[13.5px] font-medium leading-relaxed text-white/70">{S.videoAufnahmeText}</p>
          {busy ? (
            <Fortschritt text={busyText} />
          ) : aufnahmePath ? (
            <>
              <p className="flex items-center gap-2 text-[13.5px] font-black text-white">
                <Check className="h-4 w-4 text-[#f6cf51]" />{S.videoAufnahmeDa}
              </p>
              <div className="flex flex-col gap-2">
                <Knopf art="gold" onClick={() => void kaufen()}>{`${S.videoKaufen} — ${preisVideo}`}</Knopf>
                <Knopf art="umriss" onClick={() => setAufnahmeOffen(true)}>{S.videoAufnahmeNochmal}</Knopf>
              </div>
              {kasse.block}
            </>
          ) : (
            <Knopf art="gold" onClick={() => setAufnahmeOffen(true)}>
              <Video className="mr-2 inline h-4 w-4" />{S.videoAufnahmeKnopf}
            </Knopf>
          )}
          <Fehlerzeile>{fehler}</Fehlerzeile>
        </>
      )}

      {/* ── 2 · DAS SKRIPT ── */}
      {phase === "skript" && (
        <>
          <p className="text-[15px] font-black leading-snug text-white">{S.videoSkriptTitel}</p>
          <p className="text-[13.5px] font-medium leading-relaxed text-white/70">{S.videoSkriptText}</p>
          <EingabeMehrzeilig zeilen={7} value={sprechtext} onChange={e => setSprechtext(e.target.value)} />

          {/* KLEIDUNG UND HINTERGRUND — beides vorgeschlagen aus der Stelle (und die
              Kleidung zusätzlich aus seinem eigenen Bewerbungsfoto, wenn der Lebenslauf
              eines trägt), beides wählbar. Owner 28.08.2026: „als kraftfahrer kann er nicht
              mit kravate sich bewerben aber wer weiss, vielleicht wollen einige."
              Chips nach Hausregel: Der gewählte behält seinen Rand, es wechselt nur die
              Farbe (Skill `ci-design`, „Auswahl verschiebt NIE"). */}
          {kleidungen.length > 1 && (
            <div>
              <p className="text-[13px] font-black leading-snug text-white">{S.videoKleidungTitel}</p>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-white/60">{S.videoKleidungText}</p>
              <div className="lb-wisch -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                {kleidungen.map((k, i) => (
                  <button key={i} type="button" onClick={() => setLook(l => ({ ...l, kleidung: k }))}
                    className={`shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition active:scale-95 ${
                      look.kleidung === k
                        ? "border-[#f6cf51]/60 bg-[#f6cf51]/10 text-[#f6cf51]"
                        : "border-white/20 bg-white/5 text-white/85"}`}>
                    {kleidungLabel[i] || `${S.videoKleidungTitel} ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {umgebungen.length > 1 && (
            <div>
              <p className="text-[13px] font-black leading-snug text-white">{S.videoUmgebungTitel}</p>
              <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-white/60">{S.videoUmgebungText}</p>
              <div className="lb-wisch -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
                {umgebungen.map((u, i) => (
                  <button key={i} type="button" onClick={() => setLook(l => ({ ...l, umgebung: u }))}
                    className={`shrink-0 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition active:scale-95 ${
                      look.umgebung === u
                        ? "border-[#f6cf51]/60 bg-[#f6cf51]/10 text-[#f6cf51]"
                        : "border-white/20 bg-white/5 text-white/85"}`}>
                    {umgebungLabel[i] || `${S.videoUmgebungTitel} ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Fehlerzeile>{fehler}</Fehlerzeile>
          <Knopf art="gold" disabled={sprechtext.trim().length < 40} onClick={() => setPhase("aufnahme")}>
            {S.videoZurAufnahme}
          </Knopf>
        </>
      )}

      {/* ── 3 · ES LÄUFT ── */}
      {phase === "laeuft" && (
        <>
          <p className="text-[15px] font-black leading-snug text-white">{S.videoLaeuftTitel}</p>
          <Fortschritt text={busyText || S.videoLaeuft} />
          <Fehlerzeile>{fehler}</Fehlerzeile>
        </>
      )}

      {/* Das Aufnahme-Fenster liegt über allem — Kamera, Gesichtskreis, Skript. */}
      {aufnahmeOffen && (
        <SelbstAufnahme
          skript={sprechtext}
          texte={{
            titel: S.videoSkriptTitel, hinweis: S.videoAufnahmeHinweis,
            los: S.videoAufnahmeLos, stopp: S.videoAufnahmeStopp,
            nochmal: S.videoAufnahmeNochmal, uebernehmen: S.videoAufnahmeUebernehmen,
            keineKamera: S.videoKeineKamera, schliessen: S.videoAufnahmeSchliessen,
          }}
          aufFertig={datei => void aufnahmeVerarbeiten(datei)}
          aufAbbruch={() => setAufnahmeOffen(false)} />
      )}

      {/* ── 4 · FERTIG ── */}
      {phase === "fertig" && (
        <>
          <p className="flex items-center gap-2 text-[15px] font-black leading-snug text-white">
            <Check className="h-4 w-4 text-[#f6cf51]" />{S.videoFertigTitel}
          </p>
          <p className="text-[13.5px] font-medium leading-relaxed text-white/70">{S.videoFertigText}</p>
          <Knopf art="umriss" href="/my-gallery">{S.assetsKnopf}</Knopf>
        </>
      )}
    </div>
  );
}
