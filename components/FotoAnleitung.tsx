"use client";

import { fotoText } from "@/lib/foto-anleitung";

/**
 * DAS SCHILD AM FOTOAUTOMATEN — vier Beispiele, ein Satz (Owner 05.08.2026: „es ist wie beim
 * Fotoautomat für Passbilder … man muss die Anweisung schreiben und auch visuell zeigen").
 *
 * Steht ÜBER den Upload-Feldern: was das Foto können muss, bevor er arbeitet. (Die
 * Preiszeile daneben ist seit dem 06.08.2026 raus — der Preis steht am Chip und am
 * Kaufknopf.)
 *
 * MIT BELLA UND PETER, NICHT MIT ZEICHNUNGEN (Owner: „Piktogramme will ich nicht haben, die
 * sehen blöd aus. Wir haben Bella und Peter als Beispiel immer"). Beide liegen längst im Repo
 * und stehen schon in jedem Upload-Feld — hier zeigen dieselben zwei Dateien alle vier Fälle:
 *
 *   ✓ gut        Bella, Gesicht gross und scharf
 *   ✕ unscharf   DASSELBE Bild, im Browser weichgezeichnet (`filter: blur`)
 *   ✕ zu weit    DASSELBE Bild, klein hineinskaliert
 *   ✕ zwei       Bella UND Peter nebeneinander in einem Rahmen
 *
 * Kein neues Bild, kein erzeugter Lauf: Die Fehler entstehen aus der Darstellung, nicht aus
 * zusätzlichem Material. Wer die Beispiele je austauschen will, ändert die zwei Pfade unten.
 */

const BELLA = "/kiss-woman-placeholder.jpg";
const PETER = "/kiss-placeholder.jpg";

/** Ein Rahmen mit Beispielbild, Häkchen oder Kreuz und Beschriftung darunter. */
function Beispiel({ ok, label, children }: { ok?: boolean; label: string; children: React.ReactNode }) {
  /* Grün und Rot sind fest: Sie tragen eine BEDEUTUNG und gehören nicht zur Marke — dieselbe
     Ausnahme wie `lb-karte-ja` / `lb-karte-nein` in globals.css. */
  const farbe = ok ? "#2f7d4f" : "#c0392b";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-full">
        <div
          className="relative aspect-[3/4] w-full overflow-hidden rounded-xl"
          style={{ border: `2px solid ${farbe}`, background: "rgba(0,0,0,0.25)" }}
        >
          {children}
        </div>
        <span
          className="absolute -bottom-1.5 -right-1.5 grid h-[19px] w-[19px] place-items-center rounded-full text-[11px] font-black leading-none"
          style={{ background: farbe, color: "#fff", WebkitTextFillColor: "#fff" }}
          aria-hidden="true"
        >
          {ok ? "✓" : "✕"}
        </span>
      </div>
      <span className="text-center text-[9.5px] font-bold leading-tight opacity-75">{label}</span>
    </div>
  );
}

export default function FotoAnleitung({ lang, karte = false, paar = false, className = "" }: {
  lang?: string;
  /** Innerhalb der Einladungskarte (`lb-karte`) — dort trägt die Karte ihre eigene Schrift. */
  karte?: boolean;
  /**
   * PAAR-MODUS (Owner 06.08.2026: „Oben steht dass nur eine Person gewählt werden kann. Das
   * stimmt nicht. Wenn man den Tab ein Foto von uns wählen klickt."): Beim gemeinsamen Foto
   * dreht das vierte Beispiel um — zwei Personen im Bild sind dort GENAU richtig. Dasselbe
   * Bild, grünes Häkchen statt rotem Kreuz, eigene Beschriftung.
   */
  paar?: boolean;
  className?: string;
}) {
  const T = fotoText(lang);
  /* `object-top`: Bei einem Hochformat-Ausschnitt aus einem ganzen Menschen soll der KOPF im
     Bild bleiben — mittig zentriert schnitte es genau das weg, worum es hier geht. */
  const bild = "absolute inset-0 h-full w-full object-cover object-top";

  return (
    <div className={`${karte ? "" : "text-white/85"} ${className}`}>
      <p className={`text-[11px] font-black uppercase tracking-wide ${karte ? "lb-karte-gold" : "text-[#f6cf51]"}`}>
        {T.titel}
      </p>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {/* eslint-disable @next/next/no-img-element */}
        {/* HERANGEHOLT, nicht wie die Vorlage liegt: Bellas Platzhalter zeigt sie bis zur
            Hüfte — als „so ist es richtig" wäre das genau das, was daneben unter „zu weit weg"
            steht. Das gute Beispiel MUSS ein grosses Gesicht sein, sonst widerspricht das Bild
            seiner eigenen Beschriftung. */}
        <Beispiel ok label={T.gut}>
          <img src={BELLA} alt="" className={bild} style={{ transform: "scale(1.9)", transformOrigin: "center 14%" }} />
        </Beispiel>

        {/* Unscharf — dasselbe Bild, nur weichgezeichnet. Ehrlicher als ein zweites Foto:
            Man sieht am selben Motiv, was der Unterschied ausmacht. */}
        <Beispiel label={T.unscharf}>
          <img src={BELLA} alt="" className={bild} style={{ filter: "blur(3px)" }} />
        </Beispiel>

        {/* Zu weit weg — dasselbe Bild, klein in der Mitte, viel Luft drumherum. */}
        <Beispiel label={T.weit}>
          <img src={BELLA} alt="" className={bild} style={{ transform: "scale(0.34)", transformOrigin: "center 30%" }} />
        </Beispiel>

        {/* Zwei Personen — Bella und Peter nebeneinander im selben Rahmen. Im Paar-Modus ist
            genau DAS richtig (Häkchen), bei zwei Einzelfotos falsch (Kreuz). */}
        <Beispiel ok={paar} label={paar ? T.zweiOk : T.zwei}>
          <span className="absolute inset-0 flex">
            <img src={BELLA} alt="" className="h-full w-1/2 object-cover object-top" />
            <img src={PETER} alt="" className="h-full w-1/2 object-cover object-top" />
          </span>
        </Beispiel>
        {/* eslint-enable @next/next/no-img-element */}
      </div>

      <p className={`mt-2 text-[10.5px] font-medium leading-snug ${karte ? "opacity-70" : "text-white/60"}`}>
        {T.fuss}
      </p>
    </div>
  );
}
