"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Square, X, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
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

export default function SelbstAufnahme({ skript, maxSekunden = 90, texte, diagnose = false, nurFoto = false, aufFertig, aufAbbruch }: {
  /** Der Text zum Ablesen — er läuft über der Kamera mit. Im Foto-Modus entfällt er. */
  skript?: string;
  /**
   * NUR EIN STANDBILD STATT EINER AUFNAHME (02.09.2026, für den Armee-Trichter).
   *
   * Dort wird kein gesprochenes Video gebraucht, sondern ein Porträt für die Bild-Erzeugung.
   * Alles andere ist identisch und deshalb NICHT ein zweites Mal gebaut worden: dieselbe
   * Kamera-Anfrage, dasselbe erzwungene Hochformat (eine Webcam liefert sonst ihr Weitwinkel
   * und der Kopf wird winzig), derselbe Kreis fürs Gesicht, derselbe Zoom-Regler, derselbe
   * Ausgang an der Bildecke.
   *
   * Genau das war der Fehler beim ersten Versuch: eine eigene Kamera daneben zu bauen. Was
   * hier über Monate an Erfahrung eingeflossen ist, hätte dort von vorn gelernt werden
   * müssen.
   */
  nurFoto?: boolean;
  maxSekunden?: number;
  texte: {
    titel: string; hinweis: string; los: string; stopp: string;
    nochmal: string; uebernehmen: string; keineKamera: string; schliessen: string;
    /** Beschriftung des Zoom-Reglers — nur für Schirmleser. */
    naeher?: string;
  };
  /** Nur im Prüfstand: zeigt, was die Kamera wirklich liefert. */
  diagnose?: boolean;
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
  /* Was die Kamera wirklich liefert — und ob sie sich heranholen lässt. */
  const [naeher, setNaeher] = useState<{ min: number; max: number; schritt: number; wert: number } | null>(null);
  const [messwert, setMesswert] = useState("");

  /* Kamera an, sobald das Fenster steht — aber NICHT aufnehmen. */
  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        /* HOCHFORMAT SCHON AN DER QUELLE (Owner 30.08.2026: „hast du Weitwinkel
           eingeschaltet?"). Vorher stand hier nur „möglichst 1080×1920". Eine Webcam am
           Rechner kann kein Hochformat — sie liefert dann ihr BREITESTES Bild, und das ist
           bei modernen Kameras (Continuity Camera, Center Stage) das Weitwinkel-Objektiv:
           halbe Wohnung im Bild, Kopf klein. Mit `aspectRatio` schneidet der Browser den
           Strom selbst auf 9:16 — die Seiten fallen weg, BEVOR aufgenommen wird. Damit ist
           die Aufnahme dasselbe Bild wie die Vorschau. */
        const strom = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 }, height: { ideal: 1280 },
            aspectRatio: { ideal: 9 / 16 },
          },
          audio: true,
        });
        if (abgebrochen) { strom.getTracks().forEach(t => t.stop()); return; }
        stromRef.current = strom;
        if (vorschauRef.current) {
          vorschauRef.current.srcObject = strom;
          void vorschauRef.current.play().catch(() => { /* Vorschau darf stumm scheitern */ });
        }
        /* HERANHOLEN STATT VORRUTSCHEN: Kann die Kamera zoomen, bekommt der Nutzer einen
           Regler. Der Zoom liegt am STROM, nicht am Bild auf dem Schirm — er landet also
           mit in der Aufnahme. Kameras ohne Zoom zeigen den Regler gar nicht erst. */
        const spur = strom.getVideoTracks()[0];
        const e = spur?.getSettings?.() as { width?: number; height?: number } | undefined;
        if (e?.width && e?.height) setMesswert(`${e.width}×${e.height}`);
        const koennen = spur?.getCapabilities?.() as { zoom?: { min: number; max: number; step?: number } } | undefined;
        if (koennen?.zoom && koennen.zoom.max > koennen.zoom.min) {
          const jetzt = (spur.getSettings() as { zoom?: number }).zoom ?? koennen.zoom.min;
          setNaeher({ min: koennen.zoom.min, max: koennen.zoom.max, schritt: koennen.zoom.step || 0.1, wert: jetzt });
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
    /* FOTO-MODUS: ein Bild aus dem laufenden Strom, kein Rekorder. Die Leinwand bekommt die
       Masse des Videos, damit nichts skaliert wird — die Bild-Erzeugung danach lebt von den
       Pixeln, die die Kamera wirklich geliefert hat. */
    if (nurFoto) {
      const v = vorschauRef.current;
      if (!v || !v.videoWidth) { setFehler(texte.keineKamera); return; }

      /**
       * AUFGENOMMEN WIRD, WAS ER SIEHT — NICHT, WAS DIE KAMERA LIEFERT (Owner 02.09.2026, mit
       * einem Bild seiner eigenen Aufnahme: „ich verstehe nicht, warum Querformat?").
       *
       * Hier stand `c.width = v.videoWidth`, also das native Kameraformat. Eine Frontkamera
       * liefert fast immer QUER (4:3, oft 1280×960) — die Vorschau zeigt davon per
       * `object-cover` nur den hochkanten Ausschnitt, der in den Rahmen passt. Man sieht sein
       * Gesicht formatfüllend, drückt ab, und heraus kommt ein Querformat mit Küchenregal und
       * halber zweiter Person am Rand. Das ist kein Schönheitsfehler: Genau dieses Bild geht
       * an das Bildmodell, das daraus ein Porträt bauen soll.
       *
       * Jetzt bekommt die Leinwand das Verhältnis des RAHMENS, und aus dem Kamerabild wird
       * derselbe Ausschnitt genommen, den die Vorschau zeigt — dieselbe Rechnung wie
       * `object-cover`, nur von Hand.
       */
      const rahmen = v.getBoundingClientRect();
      const zielV = rahmen.width > 0 && rahmen.height > 0 ? rahmen.width / rahmen.height : 3 / 4;
      const quelleV = v.videoWidth / v.videoHeight;
      let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
      if (quelleV > zielV) { sw = v.videoHeight * zielV; sx = (v.videoWidth - sw) / 2; }
      else { sh = v.videoWidth / zielV; sy = (v.videoHeight - sh) / 2; }

      const c = document.createElement("canvas");
      /* Die volle Auflösung des Ausschnitts, nicht die Anzeigegrösse: Das Bildmodell lebt von
         den Pixeln, die die Kamera wirklich geliefert hat. */
      c.width = Math.round(sw); c.height = Math.round(sh);
      const g = c.getContext("2d");
      /**
       * DAS ERGEBNIS WIRD GESPIEGELT (Owner 02.09.2026: „nach der aufnahme spiegeln").
       *
       * Die Kamera liefert das Bild so, wie andere einen sehen — man selbst kennt sich aber
       * aus dem Spiegel. Auf dem fertigen Foto wirkt das ungespiegelte Gesicht deshalb
       * fremd, und wer sich nicht erkennt, nimmt die Aufnahme nicht.
       *
       * Für den Zweck ist die Seitenrichtung ohnehin gleichgültig: Aus diesem Porträt
       * entsteht ein erzeugtes Bild, und dort spielt es keine Rolle, welche Seite des
       * Gesichts links liegt. Was zählt, ist, dass er sich erkennt.
       */
      if (g) { g.translate(c.width, 0); g.scale(-1, 1); }
      g?.drawImage(v, sx, sy, sw, sh, 0, 0, c.width, c.height);
      c.toBlob(b => {
        if (!b) { setFehler(texte.keineKamera); return; }
        const datei = new File([b], "selfie.jpg", { type: "image/jpeg" });
        setFertig({ datei, url: URL.createObjectURL(datei) });
      }, "image/jpeg", 0.92);
      return;
    }
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

  /* Der Zoom geht an die Kamera, nicht an die Anzeige — sonst zeigte die Vorschau etwas
     anderes, als die Datei später enthält. */
  const heranholen = (wert: number) => {
    setNaeher(n => (n ? { ...n, wert } : n));
    const spur = stromRef.current?.getVideoTracks()[0];
    try { void spur?.applyConstraints({ advanced: [{ zoom: wert } as unknown as MediaTrackConstraintSet] }); } catch { /**/ }
  };

  const nochmal = () => {
    if (fertig) { try { URL.revokeObjectURL(fertig.url); } catch { /**/ } }
    setFertig(null); setRest(maxSekunden);
  };

  /**
   * NACH „NOCH EINMAL" MUSS DER STROM ZURÜCK AN DAS VIDEO (Owner 02.09.2026: „noch ein mal
   * bild wird schwarz").
   *
   * Solange ein Ergebnis dasteht, zeigt die Bühne das Bild statt der Vorschau — React baut
   * das `<video>` dabei ab. Kommt es zurück, ist es ein NEUES Element, und dessen
   * `srcObject` ist leer: schwarze Fläche. Die Kamera lief die ganze Zeit weiter, nur sah
   * man sie nicht mehr.
   *
   * Deshalb hier statt im Startlauf: Der Effekt hängt an `fertig` und hängt den vorhandenen
   * Strom jedes Mal neu an, wenn die Vorschau erscheint.
   */
  useEffect(() => {
    if (fertig) return;
    const v = vorschauRef.current;
    const strom = stromRef.current;
    if (!v || !strom) return;
    if (v.srcObject !== strom) v.srcObject = strom;
    void v.play().catch(() => { /* der Browser mag beim Wiedereinhängen zicken */ });
  }, [fertig]);

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black">
      {/* ── Das Bild: entweder die Kamera oder die fertige Aufnahme ──
             DIE BÜHNE IST HOCHFORMAT (Owner 30.08.2026: „ich bin zu nah an der kamera").
             Vorher füllte die Vorschau mit `object-cover` die GANZE Fläche — auf einem breiten
             Fenster wird ein Kamerabild dabei so weit hochskaliert, bis nur noch das halbe
             Gesicht im Bild steht. Der Nutzer sass richtig, das Bild log. Jetzt steht die
             Vorschau in einem 9:16-Rahmen wie das spätere Video: was er hier sieht, ist auch
             das, was aufgenommen wird. */}
      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative aspect-[9/16] h-full max-h-full w-auto max-w-full overflow-hidden bg-black">
            {/* DER AUSGANG KLEBT AN DER BILDECKE, NICHT AM BILDSCHIRMRAND (Owner 30.08.2026:
                „schon wieder Schliessbutton zu weit rechts"). Er hing an `fixed inset-0`, also
                am rechten Rand des Fensters — auf dem Handy ist das dieselbe Ecke, am Rechner
                liegt er plötzlich einen halben Meter neben dem Bild im Schwarzen. Jetzt gehört
                er zur Bühne und wandert mit ihr. */}
            <div className="absolute right-3 top-3 z-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
              <Scheibe label={texte.schliessen} onClick={() => { stopp(); aufAbbruch(); }}>
                <X className="h-4 w-4" />
              </Scheibe>
            </div>

            {fertig ? (
              nurFoto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={fertig.url} alt="" className="h-full w-full object-contain" />
                : <video src={fertig.url} controls playsInline className="h-full w-full object-contain" />
            ) : (
              <>
                {/**
                  * IM FOTO-MODUS IST DIE VORSCHAU GESPIEGELT (Owner 02.09.2026: „vorschau muss
                  * richtig sein" — nach „nach der aufnahme spiegeln").
                  *
                  * Beides zusammen ergibt erst einen Sinn: Wer sich ausrichtet, tut das wie
                  * vor einem Spiegel — hebt er die rechte Hand, muss sie auf der erwarteten
                  * Seite hochgehen. Wäre nur das Ergebnis gespiegelt, zeigte die Vorschau
                  * etwas anderes als das, was danach dasteht.
                  *
                  * NUR IM FOTO-MODUS: Ein gesprochenes Video (Geburtstag, Future Me) bleibt
                  * ungespiegelt — dort ist die Aufnahme das Endprodukt und soll zeigen, wie
                  * andere den Sprecher sehen.
                  */}
                <video ref={vorschauRef} muted playsInline
                  className={`h-full w-full object-cover ${nurFoto ? "scale-x-[-1]" : ""}`} />
                {/**
                  * KEIN GESICHTS-OVAL MEHR (Owner 02.09.2026: „mach den Kreis raus").
                  *
                  * Es war am selben Tag entstanden und dreimal nachgemessen worden — rund,
                  * dann oval, dann höher. Am echten Handy zeigt sich, warum es trotzdem
                  * stört: Es dunkelt alles ausserhalb ab (`shadow` mit 9999 px Streuung), und
                  * wer nicht genau hineinpasst, sieht sein eigenes Gesicht halb im Schatten —
                  * ausgerechnet in dem Moment, in dem er sich prüfen will. Zuschneiden kommt
                  * ohnehin gleich danach, und der Cropper startet seit heute zentriert.
                  */}

                {/* DER REGLER ZUM HERANHOLEN — nur, wenn die Kamera das kann. */}
                {naeher && (
                  <div className="absolute inset-x-0 bottom-3 z-20 flex items-center gap-3 px-5">
                    <ZoomOut className="h-4 w-4 shrink-0 text-white/80" />
                    <input type="range" aria-label={texte.naeher || "Zoom"}
                      min={naeher.min} max={naeher.max} step={naeher.schritt} value={naeher.wert}
                      onChange={ev => heranholen(Number(ev.target.value))}
                      className="h-1 flex-1 cursor-pointer accent-[#f6cf51]" />
                    <ZoomIn className="h-4 w-4 shrink-0 text-white/80" />
                  </div>
                )}

                {diagnose && messwert && (
                  <p className="absolute left-3 top-3 z-20 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white/80">
                    {messwert}{naeher ? ` · Zoom ${naeher.min}–${naeher.max}` : " · kein Zoom"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Das Skript zum Ablesen — direkt über den Knöpfen, damit der Blick nahe an der
             Kamera bleibt. Scrollbar, weil ein Skript länger sein darf als der Platz. ── */}
      {!fertig && !nurFoto && skript && (
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
              {nurFoto ? <Camera className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{texte.los}
            </button>
            <p className="text-center text-[12.5px] font-bold leading-snug text-white/60">{texte.hinweis}</p>
          </>
        )}
      </div>
    </div>
  );
}
