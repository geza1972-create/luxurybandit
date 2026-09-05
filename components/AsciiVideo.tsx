"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * EIN VIDEO, IN SCHRIFTZEICHEN GERECHNET — vollflächig, weiss auf schwarz.
 *
 * Owner 02.09.2026, für die Wurzel von `yourvideogenerator.com`: „da müsste ein cooles Video
 * sein, vollflächig. Mehr nicht" · „oder kannst du ein ASCII-Code-Video machen?" ·
 * „vollflächig?" · „weisse Schrift auf schwarz".
 *
 * WIE ES ARBEITET: Ein verstecktes `<video>` spielt die Datei. Für jedes Bild zeichnet ein
 * winziges Canvas (so viele Pixel, wie später Zeichen dastehen) den Frame — der Browser
 * mittelt dabei selbst über die Fläche. Aus der Helligkeit jedes Pixels wird ein Zeichen der
 * Rampe, dunkel nach hell. Die Zeilen kommen als EIN String in ein `<pre>`.
 *
 * WARUM DAS FÜR DIESE DOMAIN PASST: Sie heisst „your video generator" und trägt Trichter, in
 * denen aus einem Foto ein Video wird. Ein Video, das sich vor den Augen des Betrachters aus
 * Zeichen zusammensetzt, sagt genau das — ohne ein Wort und ohne eine Marke. In ASCII bleibt
 * von jedem Motiv nur Bewegung und Kontrast; wer das Ausgangsvideo kennt, erkennt es, alle
 * anderen sehen ein abstraktes Muster. Damit taugt sogar ein Kundenclip als Vorlage, ohne
 * dessen Marke preiszugeben.
 *
 * DIE ZEICHEN-RAMPE ist nach optischer Dichte sortiert, nicht alphabetisch: Ein `@` deckt
 * fast die ganze Zelle, ein `.` fast nichts. Falsch sortiert wird aus einem Gesicht Rauschen.
 *
 * AUFLÖSUNG UND TAKT sind bewusst grob (Vorgabe 110 Spalten, 20 Bilder/s). Feiner sieht aus
 * wie ein schlechtes Video statt wie Zeichen — und kostet auf einem Telefon spürbar Strom.
 */
/**
 * ABSTRAKT, NICHT FOTOREALISTISCH (Owner 02.09.2026: „es soll abstrakt werden").
 *
 * Zuerst stand hier die klassische zehnstufige Rampe `@%#*+=-:. ` — sie bildet Graustufen so
 * genau ab, dass ein Gesicht wiedererkennbar bleibt. Genau das soll es nicht: Auf einer Domain
 * ohne Marke soll ein Muster laufen, kein Porträt.
 *
 * FÜNF STUFEN statt zehn, und die Zeichen sind Blöcke statt Interpunktion. Damit fallen die
 * Zwischentöne weg — was bleibt, ist Fläche und Bewegung. Wer das Ausgangsvideo kennt, ahnt
 * es; alle anderen sehen ein Muster, das atmet.
 *
 * DIE SPALTENZAHL HÄNGT AM MATERIAL, nicht am Geschmack (02.09.2026 gemessen): Ein farbiges
 * Video verträgt 64 Spalten, weil seine Zwischentöne die Form tragen. Der Schwarz-Weiss-Clip
 * des Owners hat davon kaum welche — bei 64 blieben harte Flecken ohne Gestalt. Bei 100
 * Spalten kommt die Form zurück, ohne dass es fotografisch wird.
 */
const RAMPE = "█▓▒░ ";

export default function AsciiVideo({ src, spalten = 100, fps = 16, ton = false, zeilenText, className = "" }: {
  /** Die Videodatei. Sie wird stumm und in Schleife gespielt; gesehen wird sie nie direkt. */
  src: string;
  spalten?: number;
  fps?: number;
  /**
   * DER TON DES CLIPS — abschaltbar, aber vorhanden (Owner 02.09.2026: „kann man auch den
   * Sound übernehmen?").
   *
   * ER KANN NICHT VON SELBST LAUFEN, und das ist keine Entscheidung von uns: Jeder Browser
   * verweigert einem Video mit Ton den Autostart, solange der Besucher die Seite nicht
   * angefasst hat — mit Ton startet es gar nicht erst, und die Fläche bliebe schwarz. Also
   * läuft es stumm an und ein Knopf schaltet den Ton dazu.
   *
   * Am Display ist genau das richtig: Dort soll es leise laufen, und wer stehen bleibt,
   * dreht auf.
   */
  ton?: boolean;
  /**
   * WAS AUF DEM BILD STEHT — in derselben Blockschrift wie alles andere (Owner 02.09.2026:
   * „kannst du noch in Pixelschrift ganz gross auf die Seite schreiben, was sie sagen?").
   *
   * DER TEXT WIRD INS RASTER GEZEICHNET, nicht darübergelegt. Ein `<p>` mit einer Pixel-Font
   * wäre schneller gebaut, sähe aber aus wie ein Aufkleber auf dem Bild — zwei verschiedene
   * Techniken übereinander. Hier läuft der Satz durch dieselbe Umrechnung wie der Film: Er
   * wird auf das winzige Canvas geschrieben, bevor die Helligkeit in Zeichen umschlägt, und
   * kommt damit aus denselben Blöcken heraus. Deshalb ist er auch automatisch pixelig — bei
   * 100 Zellen Breite geht es gar nicht anders.
   *
   * Eine Zeile je Eintrag. Zu viele Wörter in einer Zeile werden unlesbar; die Aufteilung
   * gehört dem Aufrufer, weil nur er weiss, wo der Satz atmet.
   */
  zeilenText?: string[];
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const rahmenRef = useRef<HTMLDivElement>(null);
  const [laut, setLaut] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    const pre = preRef.current;
    if (!v || !pre) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let laeuft = true;
    let uhr: ReturnType<typeof setTimeout> | undefined;

    /**
     * DIE ZEILENZAHL KOMMT AUS DEM BILDSCHIRM, NICHT AUS DEM VIDEO (02.09.2026, nach dem
     * ersten Blick: „vollflächig?").
     *
     * Zuerst rechnete sie aus dem Seitenverhältnis der Datei — das Ergebnis war ein Bild in
     * der Mitte mit schwarzen Balken darüber und darunter, also `contain` statt `cover`. Für
     * eine Fläche, die nichts als dieses Video zeigen soll, ist das der falsche Zuschnitt.
     *
     * Jetzt gilt die Fensterform, und das Video wird wie ein Hintergrundbild hineingeschnitten
     * (siehe `drawImage` unten): Was seitlich oder oben herausfällt, fällt heraus.
     */
    const ZEICHEN = { w: 1, h: 1 };
    const messen = () => {
      /* Wie breit ein Zeichen wirklich ist, hängt an der Schrift des Geräts — raten führt zu
         einem Bild, das an den Rändern nicht aufgeht. Einmal messen ist genauer als jede
         Faustzahl. */
      const probe = document.createElement("span");
      probe.textContent = "0".repeat(50);
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;line-height:1;font-size:100px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
      document.body.appendChild(probe);
      const r = probe.getBoundingClientRect();
      ZEICHEN.w = r.width / 50 / 100;   // Breite je Zeichen, in Vielfachen der Schriftgrösse
      ZEICHEN.h = r.height / 100;
      probe.remove();
    };
    messen();

    const passen = () => {
      /**
       * DIE FLÄCHE MESSEN, NICHT DAS FENSTER (Owner 02.09.2026, mit einem Desktop-Bild:
       * „bitte Desktop-Version auch full").
       *
       * Hier stand `window.innerWidth`. Am Telefon ist das dasselbe, am Rechner nicht: Die
       * Anwendung rendert in einer Hülle, und die Schrift wurde für die FENSTERbreite
       * gerechnet — also viel zu gross für die Fläche, in der sie stand. Auf dem Schirm blieb
       * ein schmaler schwarzer Streifen mit riesigen Zeichen.
       *
       * Der Rahmen liegt jetzt ohnehin `fixed inset-0` über allem, aber gemessen wird trotzdem
       * er selbst: So stimmt es auch, wenn diese Fläche einmal woanders eingebaut wird.
       */
      const r = rahmenRef.current?.getBoundingClientRect();
      const breite = Math.max(1, r?.width ?? window.innerWidth);
      const hoehe = Math.max(1, r?.height ?? window.innerHeight);
      /* Die Schriftgrösse folgt der Breite: `spalten` Zeichen sollen sie genau füllen. */
      const fs = breite / (spalten * ZEICHEN.w);
      const zeilen = Math.max(8, Math.ceil(hoehe / (fs * ZEICHEN.h)));
      pre.style.fontSize = `${fs}px`;
      return zeilen;
    };

    const zeichnen = () => {
      if (!laeuft) return;
      if (v.readyState >= 2 && v.videoWidth) {
        const zeilen = passen();
        if (canvas.width !== spalten || canvas.height !== zeilen) {
          canvas.width = spalten; canvas.height = zeilen;
        }

        /**
         * ZUSCHNITT WIE `object-cover`: Das Canvas hat die Form des Fensters, das Video eine
         * andere. Statt es zu stauchen, wird der grösstmögliche passende Ausschnitt aus der
         * MITTE genommen — bei einem Hochformat-Video auf einem breiten Display also ein
         * waagerechter Streifen, und umgekehrt.
         */
        const zielV = spalten / zeilen;                       // Verhältnis der Zeichenfläche
        const quelleV = v.videoWidth / v.videoHeight;
        let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
        if (quelleV > zielV) {
          /* Zu breit: seitlich beschneiden, aus der Mitte — links und rechts ist nichts,
             worauf es ankommt. */
          sw = v.videoHeight * zielV; sx = (v.videoWidth - sw) / 2;
        } else {
          /**
           * Zu hoch: OBEN ansetzen, nicht mittig (Hausregel aus dem Skill `card`: „der
           * Zuschnitt schneidet nie den Kopf ab"). Ein Hochformat-Video auf einem breiten
           * Schirm wird sonst zu einem waagerechten Streifen aus der Bildmitte — also Brust
           * statt Gesicht. Ein Viertel Luft bleibt darüber, damit der Kopf nicht an der
           * Oberkante klebt.
           */
          sh = v.videoWidth / zielV;
          sy = Math.min(v.videoHeight - sh, (v.videoHeight - sh) * 0.25);
        }

        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, spalten, zeilen);

        /**
         * DER SATZ, VOR DER UMRECHNUNG (siehe `zeilenText` oben).
         *
         * Er wird weiss auf das Videobild geschrieben und mit einem schwarzen Rand versehen:
         * Ohne den verschwindet er, sobald darunter eine helle Stelle liegt — und in einem
         * Bild aus fünf Graustufen ist „weiss auf weiss" nicht mehr zu retten.
         *
         * Die Schriftgrösse folgt der Rasterbreite, nicht einer festen Zahl: Auf dem Canvas
         * sind Pixel gleich Zeichen, also ist `spalten / 22` ungefähr „22 Zeichen passen in
         * eine Zeile" — die Grenze, ab der ein Satz in Blöcken noch lesbar bleibt.
         */
        if (zeilenText?.length) {
          /**
           * DIE GRÖSSE RICHTET SICH NACH DER LÄNGSTEN ZEILE (02.09.2026: die dritte lief
           * rechts aus dem Bild).
           *
           * Vorher stand hier `spalten / 22` — eine Faustzahl für „22 Zeichen passen". Bei
           * 36 Zeichen stimmt sie nicht mehr, und der Satz wird abgeschnitten, ausgerechnet
           * an der Stelle, an der die Aussage kippt. Jetzt wird gemessen: Die längste Zeile
           * bestimmt die Grösse, alle anderen erben sie — so bleibt der Block ruhig und
           * nichts fällt heraus. `0.92` lässt links und rechts einen Rand.
           */
          const laengste = zeilenText.reduce((a, b) => (b.length > a.length ? b : a), "");
          const gr = Math.max(4, Math.floor((spalten * 0.92 * 1.6) / Math.max(1, laengste.length)));
          ctx.font = `bold ${gr}px ui-monospace, Menlo, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.lineWidth = Math.max(1, gr / 4);
          ctx.strokeStyle = "#000";
          ctx.fillStyle = "#fff";
          const abstand = gr * 1.5;
          const start = zeilen / 2 - ((zeilenText.length - 1) * abstand) / 2;
          zeilenText.forEach((z, i) => {
            const y = start + i * abstand;
            ctx.strokeText(z, spalten / 2, y);
            ctx.fillText(z, spalten / 2, y);
          });
        }

        const d = ctx.getImageData(0, 0, spalten, zeilen).data;

        let out = "";
        for (let y = 0; y < zeilen; y++) {
          for (let x = 0; x < spalten; x++) {
            const i = (y * spalten + x) * 4;
            /* Helligkeit nach Wahrnehmung, nicht als Mittelwert: Das Auge sieht Grün weit
               heller als Blau. Ein einfacher Durchschnitt macht blaue Flächen zu hellen. */
            const hell = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
            out += RAMPE[Math.min(RAMPE.length - 1, Math.floor((1 - hell) * RAMPE.length))];
          }
          out += "\n";
        }
        pre.textContent = out;
      }
      uhr = setTimeout(zeichnen, 1000 / fps);
    };

    /* Ohne Geste darf ein Video nur STUMM starten. Der Ton kommt erst über den Knopf dazu
       (siehe `laut` unten); scheitert der Start trotzdem — manche Sparmodi —, bleibt die
       Fläche schwarz statt kaputt. */
    v.muted = true;
    void v.play().catch(() => {});
    zeichnen();

    /* Steht die Seite im Hintergrund, rechnet niemand mit: Ein Telefon würde sonst einen
       unsichtbaren Film Bild für Bild in Zeichen umrechnen, bis der Akku leer ist. */
    const sichtbar = () => {
      if (document.hidden) { laeuft = false; if (uhr) clearTimeout(uhr); v.pause(); }
      else if (!laeuft) { laeuft = true; void v.play().catch(() => {}); zeichnen(); }
    };
    document.addEventListener("visibilitychange", sichtbar);

    return () => {
      laeuft = false;
      if (uhr) clearTimeout(uhr);
      document.removeEventListener("visibilitychange", sichtbar);
    };
  }, [src, spalten, fps, zeilenText]);

  return (
    /**
     * ÜBER ALLES, IMMER GANZ (Owner 02.09.2026: „bitte Desktop-Version auch full").
     *
     * `fixed inset-0` statt `relative h-[100dvh]`: So hängt die Fläche an keiner Hülle des
     * Layouts mehr und ist auf jedem Gerät genau der Bildschirm. Kein Scrollen, keine Ränder
     * — die Seite hat ja nichts als dieses Bild.
     */
    <div ref={rahmenRef} className={`fixed inset-0 overflow-hidden bg-black ${className}`}>
      {/* Das Video selbst wird nie gezeigt — es ist die Quelle, nicht das Bild.
          eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} src={src} muted loop playsInline preload="auto"
        className="pointer-events-none absolute h-px w-px opacity-0" />

      {/* DER TON-KNOPF — die einzige Bedienung auf dieser Seite. Weisse Scheibe wie überall
          im Haus, nur ohne Nachbarn: Vergrössern und Teilen gibt es hier nicht, das Bild IST
          schon die ganze Seite. */}
      {ton && (
        <button type="button"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            const neu = !laut;
            v.muted = !neu;
            if (neu) { v.volume = 1; void v.play().catch(() => { v.muted = true; setLaut(false); }); }
            setLaut(neu);
          }}
          aria-label={laut ? "Ton aus" : "Ton an"}
          style={{ background: "#fff", color: "#1a160f", boxShadow: "0 2px 10px rgba(0,0,0,0.35)", opacity: 0.7 }}
          className="absolute right-4 top-4 z-30 grid h-10 w-10 place-items-center rounded-full transition active:scale-90">
          {laut ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      )}

      {/**
        * `clamp` STATT EINER FESTEN GRÖSSE: Die Zeichenfläche soll auf jedem Gerät die Breite
        * füllen — auf 375 px genauso wie auf einem Fernseher am Display-Aufsteller. Die
        * Schriftgrösse hängt deshalb an der Fensterbreite (`vw`), nicht an Pixeln, und die
        * Zeilenhöhe ist bewusst 1: Jede Lücke zwischen den Zeilen zerreisst das Bild.
        */}
      {/* Er sitzt in der linken oberen Ecke und füllt von dort; die Grösse setzt `passen()`
          bei jedem Bild, weil sich das Fenster drehen oder ändern kann. `overflow-hidden` am
          Rahmen darüber schneidet die letzte, angeschnittene Zeile ab. */}
      <pre ref={preRef} aria-hidden
        className="absolute left-0 top-0 select-none whitespace-pre text-white"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineHeight: 1,
          letterSpacing: 0,
        }} />
    </div>
  );
}
