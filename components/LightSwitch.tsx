"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * HELL ODER DUNKEL — ein Schalter, nicht ein Adress-Zusatz (Owner 30.07.2026: „mach mir bitte
 * einen Schalter für light und dark version neben den Backbutton rechts").
 *
 * Die helle Fassung gab es schon, aber nur über `?light=1` in der Adresszeile — gut genug für
 * einen Anzeigentest, unbrauchbar für einen Besucher. Der Schalter hängt dieselben zwei
 * Klassen an das `<main>`, die der Server bei `?light=1` setzt: `lb-theme` (heller Grund,
 * dunkle Schrift) und `lb-fb` (Facebook-Anmutung). Nichts Neues im CSS, damit die Fassung
 * aussieht wie die getestete.
 *
 * DIE WAHL BLEIBT IM GERÄT. Sonst steht der Besucher nach der Rückkehr von der Kasse wieder
 * im Dunkeln — mitten im Kauf ist ein Farbwechsel eine Irritation, die Geld kostet.
 *
 * UND SIE STEHT IN DER ADRESSZEILE (Owner 30.07.2026: „light hat doch eine eigene Adresse …
 * die muss ich immer in den ads eintragen, also ich brauche sie oben zu sehen oder zu
 * sharen"). Der Schalter schreibt `?light=1` mit — ohne Neuladen. Was oben steht, ist damit
 * genau die Adresse, die in die Anzeige gehört; Teilen und Kopieren treffen immer die
 * Fassung, die er gerade ansieht.
 *
 * RANGFOLGE: Steht `light` in der Adresse, gewinnt die Adresse — eine Anzeige soll bei jedem
 * gleich aussehen, auch bei dem, der hier schon einmal umgeschaltet hat. Sonst gilt seine
 * gespeicherte Wahl, sonst dunkel.
 */

const KEY = "lb_light";

function anwenden(hell: boolean) {
  const m = document.querySelector("main");
  if (!m) return;
  m.classList.toggle("lb-theme", hell);
  m.classList.toggle("lb-fb", hell);
}

/** `?light=1` in der Adresszeile setzen oder entfernen — ohne die Seite neu zu laden. */
function adresseSchreiben(hell: boolean) {
  try {
    const u = new URL(window.location.href);
    if (hell) u.searchParams.set("light", "1");
    else u.searchParams.delete("light");
    window.history.replaceState({}, "", u.pathname + (u.search || "") + u.hash);
  } catch { /* die Anzeige der Fassung darf nie an der Adresszeile scheitern */ }
}

export default function LightSwitch() {
  const [hell, setHell] = useState(false);

  useEffect(() => {
    let gespeichert: string | null = null;
    try { gespeichert = localStorage.getItem(KEY); } catch { /**/ }
    const ausAdresse = new URLSearchParams(window.location.search).get("light");
    const an = ausAdresse !== null
      ? ausAdresse === "1"
      : gespeichert !== null
        ? gespeichert === "1"
        : !!document.querySelector("main")?.classList.contains("lb-theme");
    anwenden(an);
    adresseSchreiben(an);
    setHell(an);
  }, []);

  const umschalten = () => {
    const n = !hell;
    setHell(n);
    anwenden(n);
    adresseSchreiben(n);
    try { localStorage.setItem(KEY, n ? "1" : "0"); } catch { /**/ }
  };

  return (
    <button type="button" onClick={umschalten}
      aria-label={hell ? "Dunkle Ansicht" : "Helle Ansicht"}
      // Gleiche Form und Farbe wie „Zurück" daneben — der Balken soll eine Reihe bleiben,
      // keine Sammlung verschiedener Knöpfe.
      className="lb-chip flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-black active:scale-95 transition">
      {hell ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      {hell ? "Dark" : "Light"}
    </button>
  );
}
