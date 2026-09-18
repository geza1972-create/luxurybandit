"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload, X } from "lucide-react";

/**
 * DER KÜNSTLER LIEST SEINEN BRIEF SELBST VOR (Owner 17.09.2026: „gib mir die Möglichkeit, meine
 * Stimme aufzunehmen").
 *
 * ── WARUM DAS DIE WICHTIGSTE FUNKTION DES HAUSES IST ────────────────────────────────────────
 *
 * Van Gogh kennt man wegen der Briefe, nicht wegen der Bilder allein (Skill-Notiz
 * `kuenstler-brief-ton-van-gogh`). Hinter dem Code auf dem Papier soll deshalb kein Text stehen,
 * den eine Maschine vorliest, sondern SEINE Stimme. Das kann kein Druckshop kopieren, es kostet
 * uns nichts, und es dauert ihn zwei Minuten je Werk.
 *
 * ── ES LÄUFT ALLES IM BROWSER ───────────────────────────────────────────────────────────────
 *
 * `MediaRecorder` nimmt auf, er hört sich an, und erst „Speichern" schickt die Datei zum Server
 * (`api/portal-stimme`). Wer nichts hochlädt, hinterlässt nichts — die Aufnahme lebt bis dahin
 * nur in seinem Arbeitsspeicher.
 *
 * ── UND ES SAGT, WAS SCHIEFGEHT ─────────────────────────────────────────────────────────────
 *
 * Das Mikrofon kann abgelehnt werden, der Browser kann zu alt sein, die Leitung kann abbrechen.
 * Jeder dieser Fälle bekommt einen eigenen Satz — „es hat nicht geklappt" hilft niemandem, der
 * gerade zum dritten Mal auf Aufnahme gedrückt hat.
 */
export default function StimmeAufnehmen({ mandant, schluessel, i, vorhanden, videoDa = false, werkBild, youtubeId, stand, text, texte }: {
  mandant: string;
  schluessel: string;
  /** Nummer des Werks: -1 ist das Standardmotiv. */
  i: number;
  /** Ob schon eine Aufnahme in der Ablage liegt. */
  vorhanden: boolean;
  /** Ob zu diesem Werk schon ein Film liegt — der hat im Fenster Vorrang vor der Stimme. */
  videoDa?: boolean;
  /** Das Werk selbst — als Hintergrund hinter ihm (siehe `hintergrund`). */
  werkBild?: string;
  /** Liegt sein Film auf YouTube, spielt die Vorschau von dort — bei uns liegt er dann nicht. */
  youtubeId?: string;
  /** Zeitstempel der letzten Aufnahme — hängt an der Adresse, damit nicht die alte weiterläuft. */
  stand?: string;
  /**
   * ── DER TEXT, DEN ER VORLIEST (Owner 17.09.2026: „den Text einblenden, den ich vorlesen
   * soll") ────────────────────────────────────────────────────────────────────────────────
   *
   * Es ist DERSELBE Text, den er im Feld darüber geschrieben hat — nicht eine zweite Fassung
   * irgendwo. Er wächst mit, während er tippt; wer etwas ändert, liest sofort die neue Fassung
   * vor. Gross gesetzt, damit man es vom Stuhl aus lesen kann, ohne sich vorzubeugen.
   */
  text?: string;
  texte: {
    aufnehmen: string; stoppen: string; speichern: string; loeschen: string;
    nurStimme: string; mitVideo: string; nochmal: string; weiter: string;
    hgAus: string; hgBlur: string; hgWerk: string; spiegeln: string; musik: string;
    laeuft: string; erklaerung: string;
    keinMikro: string; keinBrowser: string; fehler: string; gespeichert: string;
  };
}) {
  /**
   * `sucher` ist der Zustand zwischen Kamera an und Aufnahme läuft (Owner 17.09.2026: „soll nicht
   * sofort starten, erst wenn ich drücke") — er richtet sich ein, sieht sein Bild, atmet einmal,
   * und drückt dann. Vorher lief die Aufnahme schon, während er noch den Stuhl rückte.
   */
  const [zustand, setZustand] = useState<"bereit" | "sucher" | "nimmt" | "pruefen" | "fertig" | "sendet">("bereit");
  const [meldung, setMeldung] = useState("");
  const [gibtEs, setGibtEs] = useState(vorhanden);
  const [gibtVideo, setGibtVideo] = useState(videoDa);
  const [kennung, setKennung] = useState(youtubeId ?? "");
  const [neuerStand, setNeuerStand] = useState(stand ?? "");
  const [probe, setProbe] = useState("");
  /**
   * ── VIDEO NEBEN DER STIMME (Owner 17.09.2026: „wenn jemand Video aufnimmt, dann wird das
   * Video gepostet") ──────────────────────────────────────────────────────────────────────
   *
   * Derselbe Ablauf, nur mit Bild: Vorschau, Aufnahme, beim Stoppen geht es raus. Das Standbild
   * schneidet der Browser aus dem laufenden Bild — sonst stünde im Fenster eine schwarze Fläche,
   * bis der Film geladen ist.
   */
  /**
   * ── NUR NOCH VIDEO (Owner 17.09.2026: „am besten machen wir nur Video ohne Stimme") ───────
   *
   * Zwei Knöpfe hiessen: Er entscheidet etwas, bevor er weiss, was besser aussieht. Ein Film
   * zeigt den Menschen UND trägt seine Stimme — die reine Sprachaufnahme kann er damit nur noch
   * verlieren. Der Ton-Weg bleibt im Code stehen: Wer schon eine Aufnahme hat, behält sie und
   * kann sie löschen; abspielen kann das Fenster beides.
   */
  const [art] = useState<"ton" | "video">("video");
  /**
   * ── DER HINTERGRUND (Owner 17.09.2026: „kann man das machen, dass ich einen Hintergrund
   * auswählen kann? Entweder verwischt oder das Bild als Hintergrund?") ──────────────────────
   *
   * Drei Fassungen, und jede hat einen anderen Preis in Technik:
   *
   * — `aus`: die Kamera, wie sie ist. Geht immer.
   * — `blur`: der Browser verwischt selbst (`backgroundBlur` an der Spur). Das kann heute nur
   *   Chrome auf manchen Geräten; wo es fehlt, zeigen wir den Knopf gar nicht erst, statt einen
   *   anzubieten, der nichts tut.
   * — `werk`: sein Bild füllt den Rahmen, er sitzt als Einblendung davor. Dafür wird nicht die
   *   Kamera aufgenommen, sondern eine Leinwand, auf die beides gezeichnet wird — und die hat
   *   gleich das Blattformat 720×1018, in dem das Poster gedruckt wird.
   */
  /**
   * ── EINE EINSTELLUNG, KEINE WAHL (Owner 17.09.2026: „ich brauche nichts anderes als diese
   * Einstellung") ──────────────────────────────────────────────────────────────────────────
   *
   * Werk im Hintergrund, er im Kreis davor, Musik darunter. Das ist das Bild, das ein Living
   * Poster ausmacht — und drei Knöpfe daneben hiessen nur, dass jeder Künstler eine Frage
   * beantworten muss, deren Antwort wir längst kennen. Wer kein Werk hat (neues Bild, noch
   * nicht hochgeladen), bekommt die reine Kamera; das entscheidet der Code, nicht er.
   */
  const hintergrund: "aus" | "blur" | "werk" = werkBild ? "werk" : "aus";
  /**
   * ── ZURÜCKDREHEN, WENN DIE KAMERA SPIEGELT (Owner 17.09.2026: „Video nicht spiegeln") ─────
   *
   * Wir drehen nichts (`transform: none`). Trotzdem kommen manche Kameras — Mac-Kameras,
   * Continuity, Zusatzprogramme — spiegelverkehrt an, und dann steht die Schrift auf dem Poster
   * hinter ihm falsch herum. Dieser Schalter dreht das Bild zurück, UND ZWAR AUCH IN DER
   * AUFNAHME: Dafür wird über eine Leinwand aufgenommen, sonst sähe er es nur in der Vorschau.
   */
  /**
   * ── IMMER GESPIEGELT (Owner 17.09.2026: „Întoarce imaginea brauche ich auch nicht. Es muss
   * schon gespiegelt sein") ────────────────────────────────────────────────────────────────
   *
   * Ein Schalter weniger. Gespiegelt heisst: Er sieht sich, wie er sich im Spiegel kennt, und
   * genau so wird aufgenommen — Sucher und Film zeigen dasselbe. Für den Zuschauer ist es
   * ohnehin nur ein Gesicht in einem Kreis; die Schrift auf dem Werk dahinter bleibt richtig
   * herum, weil das Werk nicht aus der Kamera kommt, sondern als Bild darunterliegt.
   */
  const spiegeln = true;
  /**
   * ── MUSIK UNTER SEINER STIMME (Owner 17.09.2026: „und Musik fehlt") ──────────────────────
   *
   * Sie wird in die AUFNAHME gemischt, nicht beim Abspielen daruntergelegt: So klingt der Film
   * überall gleich — auf YouTube, im Fenster, geteilt auf WhatsApp.
   *
   * UND SIE LÄUFT NIE ÜBER DEN LAUTSPRECHER: Das Stück wandert über den Audio-Graphen direkt
   * in die Aufnahme, ohne Ausgabe. Sonst nähme das Mikrofon sie ein zweites Mal auf, versetzt,
   * und alles klänge nach Hallraum.
   */
  /* Musik läuft immer mit (Owner 17.09.2026) — leise unter seiner Stimme, siehe `tonMischen`. */
  const musik = true;
  const tonWerk = useRef<AudioContext | null>(null);
  const stueck = useRef<HTMLAudioElement | null>(null);
  const [blurGeht, setBlurGeht] = useState(false);
  const leinwand = useRef<HTMLCanvasElement | null>(null);
  const malen = useRef<number | null>(null);
  const schirm = useRef<HTMLVideoElement>(null);
  const spurRef = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stuecke = useRef<Blob[]>([]);
  const blob = useRef<Blob | null>(null);
  const [sekunden, setSekunden] = useState(0);

  /* Die Aufnahme gehört in den Arbeitsspeicher, nicht in eine Datei auf seiner Platte — beim
     Verlassen der Seite wird alles freigegeben. */
  useEffect(() => () => { if (probe) URL.revokeObjectURL(probe); }, [probe]);

  /**
   * ── DER STROM KOMMT NACH DEM BILD (17.09.2026 gemessen: „es ist alles schwarz") ───────────
   *
   * Das Vollbild-Element entsteht erst, wenn React den neuen Zustand gezeichnet hat. Wer den
   * Kamerastrom direkt nach `setZustand` anhängt, hängt ihn an das ALTE, versteckte Element —
   * und das Vollbild bleibt schwarz. Dieser Effekt läuft NACH dem Zeichnen und findet deshalb
   * das richtige.
   */
  useEffect(() => {
    if (art !== "video" || (zustand !== "sucher" && zustand !== "nimmt")) return;
    const el = schirm.current;
    const spur = spurRef.current;
    if (!el || !spur || el.srcObject === spur) return;
    el.srcObject = spur;
    el.muted = true;
    void el.play().catch(() => {});
    /* `hintergrund` MUSS hier stehen (17.09.2026: „das mit dem BG geht nicht, ich sehe mich
       nicht"): Beim Wechsel auf „Lucrarea" entsteht ein ANDERES Video-Element — die kleine
       Einblendung vor dem Werk. Ohne diese Abhängigkeit hing der Kamerastrom weiter am alten,
       und die Einblendung blieb leer. */
  }, [art, zustand, hintergrund]);

  useEffect(() => {
    if (zustand !== "nimmt") return;
    const uhr = window.setInterval(() => setSekunden(s => s + 1), 1000);
    return () => window.clearInterval(uhr);
  }, [zustand]);


  const starten = async () => {
    setMeldung("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMeldung(texte.keinBrowser);
      return;
    }
    let spur: MediaStream;
    try {
      spur = await navigator.mediaDevices.getUserMedia(art === "video"
        /* ── SO SCHARF, WIE DIE KAMERA KANN (Owner 17.09.2026: „die Auflösung ist furchtbar")
           Die 720 waren für UNSERE Ablage gedacht, wo jedes Megabyte zählte. Der Film geht jetzt
           zu YouTube — dort ist ein scharfes Bild gratis, und ein unscharfes ruiniert den
           Eindruck, den das ganze Poster machen soll. */
        ? {
          audio: { echoCancellation: true, noiseSuppression: true },
          video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1527 }, frameRate: { ideal: 30 } },
        }
        : { audio: true });
    } catch {
      /* Abgelehnt oder kein Mikrofon — beides sieht für ihn gleich aus, also ein Satz. */
      setMeldung(texte.keinMikro);
      return;
    }
    stuecke.current = [];
    spurRef.current = spur;
    /* Kann dieses Gerät verwischen? Die Antwort steht an der Spur, nicht am Browser. */
    try {
      const f = spur.getVideoTracks()[0];
      const kann = (f?.getCapabilities?.() as { backgroundBlur?: boolean[] } | undefined)?.backgroundBlur;
      setBlurGeht(Array.isArray(kann) && kann.includes(true));
    } catch { setBlurGeht(false); }
    if (art === "video") {
      /* Erst der Sucher. Aufgenommen wird, wenn er drückt (`aufnahmeStarten`). Den Strom hängt
         der Effekt unten an — das Vollbild-Element gibt es in diesem Moment noch nicht. */
      setZustand("sucher");
      return;
    }
    aufnahmeStarten(spur);
  };

  /** Verwischen an- oder abschalten — der Browser macht es, nicht wir. */
  const blurSetzen = async (an: boolean) => {
    const f = spurRef.current?.getVideoTracks()[0];
    if (!f) return;
    try { await f.applyConstraints({ advanced: [{ backgroundBlur: an } as MediaTrackConstraintSet] }); }
    catch { setBlurGeht(false); }
  };

  /**
   * SEIN WERK ALS HINTERGRUND — gezeichnet, nicht gefiltert.
   *
   * Eine Leinwand im Blattformat: zuerst das Werk formatfüllend, darüber sein Kamerabild als
   * Einblendung unten links. Aufgenommen wird die Leinwand; die Tonspur kommt weiter direkt vom
   * Mikrofon. Das braucht kein Modell, kein Netz und läuft auf jedem Gerät.
   */
  const leinwandStrom = (): MediaStream | null => {
    const el = schirm.current;
    const spur = spurRef.current;
    if (!el || !spur) return null;
    const c = leinwand.current ?? document.createElement("canvas");
    leinwand.current = c;
    /* Dieselbe Grösse wie die Kamera liefert — beim Verkleinern ginge genau die Schärfe
       verloren, wegen der wir sie angefordert haben. DIN-Verhältnis bleibt. */
    c.width = 1080; c.height = 1527;
    const p = c.getContext("2d");
    if (!p) return null;

    const werk = new Image();
    werk.crossOrigin = "anonymous";
    if (werkBild) werk.src = werkBild;

    const zeichnen = () => {
      malen.current = requestAnimationFrame(zeichnen);
      p.fillStyle = "#f4efe2";
      p.fillRect(0, 0, c.width, c.height);
      /* Das Werk formatfüllend, mittig beschnitten. */
      if (werk.complete && werk.naturalWidth) {
        const s = Math.max(c.width / werk.naturalWidth, c.height / werk.naturalHeight);
        const b = werk.naturalWidth * s, h = werk.naturalHeight * s;
        p.drawImage(werk, (c.width - b) / 2, (c.height - h) / 2, b, h);
      }
      /* Ohne Werk-Hintergrund füllt sein Bild die Leinwand — hier greift die Drehung. */
      if (hintergrund !== "werk" && el.videoWidth) {
        const s = Math.max(c.width / el.videoWidth, c.height / el.videoHeight);
        const b = el.videoWidth * s, h = el.videoHeight * s;
        p.save();
        if (spiegeln) { p.translate(c.width, 0); p.scale(-1, 1); }
        p.drawImage(el, (c.width - b) / 2, (c.height - h) / 2, b, h);
        p.restore();
      }
      /**
       * ── ER SITZT IN EINEM KREIS (Owner 17.09.2026: „der Aufbau ist schlecht, es müsste
       * vielleicht ein Kreis sein") ──────────────────────────────────────────────────────────
       *
       * Ein Rechteck vor einem Gemälde sieht aus wie ein zweites Bild, das das erste verdeckt —
       * zwei Rahmen, die sich streiten. Ein Kreis liest sich als Person, nicht als Fenster: das
       * Profilbild, das auf dem Poster ohnehin neben seinem Namen steht, nur in bewegt.
       *
       * Das Kamerabild wird dabei mittig BESCHNITTEN, nicht gestaucht — sonst wäre das Gesicht
       * in die Breite gezogen.
       */
      if (hintergrund === "werk" && el.videoWidth) {
        const r = c.width * 0.20;
        const mx = c.width * 0.06 + r;
        const my = c.height - c.width * 0.06 - r;
        const s = Math.max((r * 2) / el.videoWidth, (r * 2) / el.videoHeight);
        const b = el.videoWidth * s, h = el.videoHeight * s;
        p.save();
        p.shadowColor = "rgba(0,0,0,.5)"; p.shadowBlur = 30; p.shadowOffsetY = 10;
        p.beginPath();
        p.arc(mx, my, r, 0, Math.PI * 2);
        p.closePath();
        /* Der weisse Ring: derselbe wie um das Profilbild auf dem Blatt. */
        p.fillStyle = "#ffffff";
        p.fill();
        p.restore();
        p.save();
        p.beginPath();
        p.arc(mx, my, r - c.width * 0.006, 0, Math.PI * 2);
        p.closePath();
        p.clip();
        p.drawImage(el, mx - b / 2, my - h / 2, b, h);
        p.restore();
      }
    };
    zeichnen();

    const strom = c.captureStream(30);
    const stimme = spur.getAudioTracks()[0];
    if (stimme) strom.addTrack(stimme);
    return strom;
  };

  /**
   * Mikrofon und Musik zu EINER Spur mischen. Gibt die gemischte Spur zurück, oder nichts,
   * wenn der Browser den Audio-Graphen nicht hergibt — dann wird eben ohne Musik aufgenommen,
   * statt gar nicht.
   */
  const tonMischen = (mikro: MediaStream): MediaStreamTrack | null => {
    try {
      const ctx = new AudioContext();
      tonWerk.current = ctx;
      const ziel = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(mikro).connect(ziel);

      const el = new Audio("/lakatosbandi/stimme-musik.mp3");
      el.loop = true;
      el.crossOrigin = "anonymous";
      stueck.current = el;
      const quelle = ctx.createMediaElementSource(el);
      const regler = ctx.createGain();
      /* Ein Fünftel — laut genug, dass es trägt, leise genug, dass jedes Wort steht. */
      regler.gain.value = 0.18;
      quelle.connect(regler).connect(ziel);
      void el.play().catch(() => {});
      return ziel.stream.getAudioTracks()[0] ?? null;
    } catch { return null; }
  };

  /** Die eigentliche Aufnahme — beim Ton sofort, beim Video erst auf seinen Druck. */
  const aufnahmeStarten = (spurVor?: MediaStream) => {
    const roh = (hintergrund === "werk" || spiegeln ? leinwandStrom() : null) ?? spurVor ?? spurRef.current;
    if (!roh) return;
    let spur = roh;
    if (musik && spurRef.current) {
      const gemischt = tonMischen(spurRef.current);
      if (gemischt) {
        /* Die alte Tonspur raus, die gemischte rein — das Bild bleibt, wie es ist. */
        spur = new MediaStream([...roh.getVideoTracks(), gemischt]);
      }
    }
    stuecke.current = [];
    /* Was der Browser kann: Chrome/Firefox `webm`, Safari `mp4`. Ohne diese Wahl bricht Safari
       beim Start ab, statt aufzunehmen. */
    const wunsch = art === "video"
      ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
      : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    const mime = wunsch.find(t => MediaRecorder.isTypeSupported(t)) ?? "";
    const r = new MediaRecorder(spur, {
      ...(mime ? { mimeType: mime } : {}),
      /* 3 Mbit/s bei 1080 × 1527 — das ist die Schwelle, ab der ein Gesicht nicht mehr
         verschmiert. Eine Minute wiegt damit rund 22 MB; YouTube nimmt das ohne Weiteres. */
      ...(art === "video" ? { videoBitsPerSecond: 3_000_000, audioBitsPerSecond: 128_000 } : {}),
    });
    r.ondataavailable = e => { if (e.data.size) stuecke.current.push(e.data); };
    r.onstop = () => {
      /* Das Mikrofon wieder freigeben, sonst leuchtet die Anzeige des Browsers weiter. Bei der
         Leinwand hängt die Kamera an einem ZWEITEN Strom — der muss auch aus. */
      if (malen.current) { cancelAnimationFrame(malen.current); malen.current = null; }
      stueck.current?.pause();
      stueck.current = null;
      void tonWerk.current?.close().catch(() => {});
      tonWerk.current = null;
      spur.getTracks().forEach(t => t.stop());
      spurRef.current?.getTracks().forEach(t => t.stop());
      const typ = r.mimeType?.split(";")[0] || (art === "video" ? "video/webm" : "audio/webm");
      const b = new Blob(stuecke.current, { type: typ });
      blob.current = b;
      setProbe(URL.createObjectURL(b));
      /* Das Standbild AUS dem laufenden Bild, bevor die Spur abgeschaltet wird. */
      if (art === "video" && schirm.current?.videoWidth) {
        const leinwand = document.createElement("canvas");
        leinwand.width = schirm.current.videoWidth;
        leinwand.height = schirm.current.videoHeight;
        leinwand.getContext("2d")?.drawImage(schirm.current, 0, 0);
        leinwand.toBlob(bild => { if (bild) void schicken(bild, "bild"); }, "image/jpeg", 0.82);
      }
      /**
       * ── STOPP SPEICHERT (Owner 17.09.2026: „ich habe nicht auf Save geklickt, und das wird
       * keiner machen. Das muss automatisch speichern") ────────────────────────────────────
       *
       * Ein zweiter Knopf nach dem Sprechen ist eine Falle: Wer fertig geredet hat, ist fertig.
       * Also geht die Aufnahme beim Stoppen sofort raus. Rückgängig macht sie der Löschknopf —
       * und eine neue Aufnahme überschreibt die alte ohnehin.
       */
      if (schirm.current) schirm.current.srcObject = null;
      /**
       * ── ERST ANSEHEN, DANN SCHICKEN (Owner 17.09.2026: „im Aufnahmefenster muss ich immer
       * wieder neu starten, falls ich einen Fehler mache, und save falls es klappt") ────────
       *
       * Bei einer Sprachnachricht war Stopp = gespeichert richtig: Wer fertig geredet hat, ist
       * fertig. Bei einem FILM ist es falsch — man verhaspelt sich, schaut weg, das Licht
       * stimmt nicht. Also bleibt er im Fenster, sieht sich an und entscheidet: noch einmal
       * oder behalten. Erst dann geht etwas nach draussen.
       */
      setZustand("pruefen");
    };
    recorder.current = r;
    setSekunden(0);
    r.start();
    setZustand("nimmt");
  };

  const stoppen = () => { recorder.current?.stop(); recorder.current = null; };

  /** Aus dem Sucher wieder heraus, ohne etwas aufzunehmen — die Kamera geht dabei aus. */
  const abbrechen = () => {
    spurRef.current?.getTracks().forEach(t => t.stop());
    spurRef.current = null;
    if (schirm.current) schirm.current.srcObject = null;
    setZustand("bereit");
  };

  /** Eine Datei in die Ablage — Ton, Video oder das Standbild dazu. */
  const schicken = (b: Blob, sorte: "ton" | "video" | "bild") => fetch(
    `/api/portal-stimme?m=${encodeURIComponent(mandant)}&k=${encodeURIComponent(schluessel)}&i=${i}${sorte === "ton" ? "" : `&art=${sorte}`}`,
    { method: "POST", headers: { "Content-Type": b.type || "application/octet-stream" }, body: b },
  );

  const senden = async (daten?: Blob) => {
    const b = daten ?? blob.current;
    if (!b) return;
    setZustand("sendet"); setMeldung("");
    try {
      const res = await schicken(b, art === "video" ? "video" : "ton");
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; stimmeAm?: string; youtube?: string };
      if (!d.ok) { setMeldung(texte.fehler); setZustand("fertig"); return; }
      if (art === "video") { setGibtVideo(true); setKennung(d.youtube ?? ""); } else setGibtEs(true);
      setNeuerStand(d.stimmeAm ?? String(Date.now()));
      setMeldung(texte.gespeichert);
      setZustand("bereit");
      blob.current = null;
      setProbe("");
    } catch { setMeldung(texte.fehler); setZustand("fertig"); }
  };

  const weg = async (sorte: "ton" | "video") => {
    setZustand("sendet");
    try {
      await fetch(
        `/api/portal-stimme?m=${encodeURIComponent(mandant)}&k=${encodeURIComponent(schluessel)}&i=${i}&weg=1${sorte === "video" ? "&art=video" : ""}`,
        { method: "POST", body: new Uint8Array() },
      );
      if (sorte === "video") { setGibtVideo(false); setKennung(""); } else setGibtEs(false);
      setProbe(""); blob.current = null;
    } catch { setMeldung(texte.fehler); }
    setZustand("bereit");
  };

  const knopf = "inline-flex items-center gap-1.5 rounded-full border border-[#d9d9d9] px-3 py-1.5 text-[13.5px] font-semibold text-[#111] hover:border-[#111] disabled:opacity-40";

  return (
    <div className="mt-2">
      {/* Der Spickzettel. Er steht ÜBER den Knöpfen: Wer auf Aufnahme drückt, hat ihn dann im
          Blick, statt darunter zu suchen. */}
      {text?.trim() ? (
        <p className="m-0 mb-2 max-h-[220px] overflow-y-auto whitespace-pre-line rounded-lg bg-[#faf8f3] px-3 py-2.5 font-serif text-[16.5px] leading-[1.6] text-[#22201b]">
          {text}
        </p>
      ) : null}
      {/**
        * ── DER SUCHER FÜLLT DEN SCHIRM (Owner 17.09.2026: „Aufnahmefenster muss full sein, weil
        * ich sonst nicht in die Kamera schaue, die oben am Rand ist") ──────────────────────────
        *
        * In einem kleinen Kasten in der Seitenmitte schaut er nach unten — im fertigen Film redet
        * er dann an allen vorbei. Bildschirmfüllend liegt sein Blick oben, direkt neben der
        * Kamera, und der Vorlesetext steht als Band darunter: Er liest, ohne den Kopf zu senken.
        *
        * NICHT SPIEGELN: Viele Kamera-Fenster drehen das Bild wie einen Spiegel. Hinter ihm hängt
        * aber ein Poster, dessen Schrift dann verkehrt stünde. Was er sieht, wird aufgenommen.
        */}
      {art === "video" && zustand === "pruefen" ? (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black p-3">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={probe} controls autoPlay playsInline
            className="max-h-[74vh] max-w-[94vw] rounded-2xl" />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => { blob.current = null; setProbe(""); void starten(); }}
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-[16px] font-semibold text-white">
              <Mic className="h-4 w-4" aria-hidden />
              {texte.nochmal}
            </button>
            <button type="button" onClick={() => void senden()}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-[16px] font-semibold text-[#111]">
              <Upload className="h-4 w-4" aria-hidden />
              {texte.speichern}
            </button>
          </div>
          <button type="button" onClick={() => { blob.current = null; setProbe(""); setZustand("bereit"); }}
            aria-label="Închide"
            className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#111]">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      ) : null}

      {art === "video" && (zustand === "sucher" || zustand === "nimmt") ? (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black">
          {/**
            * ── AM RECHNER DAS FORMAT DES HANDYS (Owner 17.09.2026: „oder mach das Mobilformat
            * auch im Desktop") ─────────────────────────────────────────────────────────────
            *
            * Ein breiter Schirm zeigte entweder einen Ausschnitt (zu nah) oder ein kleines Bild
            * zwischen zwei schwarzen Flächen. Beides ist nicht das, was am Ende entsteht: Der
            * Film ist hochkant, im Blattformat des Posters. Also steht auch am Rechner genau
            * dieser Rahmen — was darin ist, ist der Film.
            */}
          <div className="relative aspect-[720/1018] h-[78vh] max-h-[78vh] max-w-[94vw] overflow-hidden rounded-2xl bg-[#111]">
            {hintergrund === "werk" && werkBild ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={werkBild} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <video ref={schirm} playsInline muted style={{ transform: spiegeln ? "scaleX(-1)" : "none" }}
                  className="absolute bottom-[6%] left-[6%] aspect-square w-[40%] rounded-full border-[3px] border-white object-cover shadow-[0_10px_40px_rgba(0,0,0,.5)]" />
              </>
            ) : (
              <video ref={schirm} playsInline muted style={{ transform: spiegeln ? "scaleX(-1)" : "none" }}
                className="absolute inset-0 h-full w-full object-cover" />
            )}
            {/* ── DER TEXT LIEGT OBEN ÜBER DEM BILD (Owner 17.09.2026: „Text doch oben, aber
                übers Video") ─────────────────────────────────────────────────────────────────
                Die Kamera sitzt am oberen Rand des Bildschirms. Steht der Text dort, geht sein
                Blick beim Lesen fast in die Linse — und genau danach sieht der Film aus. Unten
                gelesen wirkt es, als schaue er an allen vorbei. */}
            {text?.trim() ? (
              <p className="absolute left-3 right-3 top-3 m-0 max-h-[38%] overflow-y-auto whitespace-pre-line rounded-xl bg-black/55 px-4 py-3 text-center font-serif text-[clamp(15px,1.5vw,21px)] leading-[1.5] text-white backdrop-blur-sm">
                {text}
              </p>
            ) : null}
          </div>
          {/* ── DIE WAHL STEHT IM SUCHER, NICHT IM FORMULAR ────────────────────────────────
              Er sieht sofort, was es bewirkt, und entscheidet mit dem Bild vor Augen. Während
              der Aufnahme verschwindet die Zeile — ein Wechsel mitten im Satz wäre ein Schnitt. */}
          {zustand === "sucher" ? (
            <>
              <button type="button" onClick={() => aufnahmeStarten()}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#b3261e] px-7 py-3.5 text-[17px] font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,.4)]">
                <Mic className="h-4 w-4" aria-hidden />
                {texte.aufnehmen}
              </button>
              {/* Ein Weg zurück, ohne aufzunehmen — sonst müsste er den Tab schliessen. */}
              <button type="button" onClick={abbrechen} aria-label="Închide"
                className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[#111]">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </>
          ) : (
            <button type="button" onClick={stoppen}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[16px] font-semibold text-[#b3261e] shadow-[0_8px_30px_rgba(0,0,0,.4)]">
              <Square className="h-4 w-4" aria-hidden />
              {texte.stoppen} · {Math.floor(sekunden / 60)}:{String(sekunden % 60).padStart(2, "0")}
            </button>
          )}
        </div>
      ) : (
        /* Ausserhalb der Aufnahme bleibt das Element bestehen, aber unsichtbar — der Rückruf am
           `ref` braucht es, bevor die Kamera anläuft. */
        <video ref={schirm} playsInline muted className="hidden" />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {zustand === "nimmt" ? (
          <button type="button" onClick={stoppen} className={`${knopf} border-[#b3261e] text-[#b3261e]`}>
            <Square className="h-3.5 w-3.5" aria-hidden />
            {texte.stoppen} · {Math.floor(sekunden / 60)}:{String(sekunden % 60).padStart(2, "0")}
          </button>
        ) : (
          <button type="button" onClick={() => void starten()} disabled={zustand === "sendet"} className={knopf}>
            <Mic className="h-3.5 w-3.5" aria-hidden />
            {texte.aufnehmen}
          </button>
        )}

        {/* NUR IM FEHLERFALL (Owner 17.09.2026: „das muss automatisch speichern") — sonst gibt es
            keinen Speichern-Knopf mehr. Ist der Versand gescheitert, liegt die Aufnahme noch im
            Browser, und er kann sie anhören und es noch einmal schicken, statt neu zu sprechen. */}
        {zustand === "fertig" && probe ? (
          <>
            {art === "video"
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              ? <video src={probe} controls playsInline style={{ transform: "none" }} className="h-[120px] rounded-lg" />
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              : <audio src={probe} controls className="h-8 max-w-[220px]" />}
            <button type="button" onClick={() => void senden()} className={`${knopf} border-[#111] bg-[#111] text-white`}>
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {texte.speichern}
            </button>
          </>
        ) : null}

        {zustand === "sendet" ? (
          <span className="inline-flex items-center gap-1.5 text-[13.5px] text-[#555]">
            <Upload className="h-3.5 w-3.5 animate-pulse" aria-hidden />
            {texte.speichern} …
          </span>
        ) : null}

        {/* Was schon liegt, kann er anhören und wegwerfen — sonst weiss er nie, was der Käufer hört. */}
        {gibtEs && zustand === "bereit" ? (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls className="h-8 max-w-[220px]"
              src={`/api/portal-film?m=${encodeURIComponent(mandant)}&i=${i < 0 ? "standard" : i}&art=stimme&v=${encodeURIComponent(neuerStand || "1")}`} />
            <button type="button" onClick={() => void weg("ton")}
              className={`${knopf} border-transparent text-[#777] hover:text-[#b3261e]`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {texte.loeschen}
            </button>
          </>
        ) : null}

        {gibtVideo && zustand === "bereit" ? (
          <>
            {/* ── DIE VORSCHAU KOMMT VON DORT, WO DER FILM LIEGT (17.09.2026 gemessen) ────────
                Seit die Filme zu YouTube gehen, liegt bei uns nichts mehr — der alte Player
                zeigte deshalb eine schwarze Fläche mit 0:00. */}
            {kennung ? (
              <iframe title="video"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(kennung)}?rel=0&modestbranding=1`}
                allow="encrypted-media; fullscreen" allowFullScreen
                className="h-[120px] w-[170px] rounded-lg border-0" />
            ) : (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video controls playsInline style={{ transform: "none" }} className="h-[120px] rounded-lg"
                src={`/api/portal-film?m=${encodeURIComponent(mandant)}&i=${i < 0 ? "standard" : i}&art=sprecher&v=${encodeURIComponent(neuerStand || "1")}`} />
            )}
            <button type="button" onClick={() => void weg("video")}
              className={`${knopf} border-transparent text-[#777] hover:text-[#b3261e]`}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {texte.loeschen} · video
            </button>
          </>
        ) : null}
      </div>
      <p className="m-0 mt-1 text-[12.5px] leading-[1.45] text-[#888]">
        {zustand === "nimmt" ? texte.laeuft : texte.erklaerung}
      </p>
      {meldung ? <p className="m-0 mt-1 text-[12.5px] font-semibold text-[#111]">{meldung}</p> : null}
    </div>
  );
}
