"use client";

import { useState } from "react";
import { ShoppingBag, Check } from "lucide-react";
import { korbDazu } from "@/lib/lakatosbandi-korb";
import { druckGroessenFuer, druckPreisCents, druckMass, druckVersandCents } from "@/lib/lakatosbandi-druck";
import { eur } from "@/lib/pricing";

/**
 * KAUFEN ODER IN DEN KORB (Owner 15.09.2026: „hier muss ein button auf preis sein oder
 * warenkorb" · „es muss ein button kaufen sein oder zum warenkorb hinzufügen").
 *
 * ── ZWEI WEGE, EINER DAVON SOFORT ───────────────────────────────────────────────────────────
 *
 * Wer ein Poster will, soll es kaufen können, ohne einen Korb zu verstehen. Wer drei will, soll
 * nicht dreimal an der Kasse stehen. Deshalb beide Knöpfe nebeneinander — „Cumpără" geht direkt
 * zu Stripe, „Adaugă în coș" legt nur ab.
 *
 * ── DIE GRÖSSE WIRD GEWÄHLT, NICHT GERATEN ──────────────────────────────────────────────────
 *
 * Ohne Größe gibt es keinen Preis und keinen Kauf. Vorgewählt ist die kleinste: Sie ist die
 * häufigste, und wer eine grössere will, sieht den Preis sofort mitwandern.
 *
 * DER ANGEZEIGTE BETRAG IST NUR DAS SCHILD. Verbindlich ist der, den `api/druck-kasse` aus
 * derselben Tabelle liest (Skill `bezahlung`, Regel 3) — der Browser schickt nur die Wahl.
 */
export default function KaufKnopf({ mandant, werk, material, sprache, anteil = false, adminS = "", texte, datei }: {
  mandant: string;
  /** „standard" oder die Kachelnummer. */
  werk: string;
  /** „poster", „tricou" oder „hanorac" — was diese Kachel ist. */
  material: string;
  sprache: string;
  /**
   * OB DAS HONORAR DES KÜNSTLERS OBEN DRAUF LIEGT (Owner 16.09.2026: „dann muss die marge drauf"
   * · „unsere von bekannten künstlern nicht, da müssen wir an keinen lebendigen künstler was
   * bezahlen"). Hier nur fürs Schild — verbindlich rechnet `api/druck-kasse` aus dem Datensatz.
   */
  anteil?: boolean;
  /** Der Admin-Schlüssel der Seite — damit der Owner einen Testkauf ohne Versand machen kann. */
  adminS?: string;
  texte: { kaufen: string; korb: string; groesse: string; fehler: string;
    ohneRahmen: string; ohneRahmenWahl: string; mitRahmenWahl: string; mitRahmen: string; rahmenSchwarz: string;
    /** „Auf Bestellung gedruckt. Lieferung nach Rumänien {versand}." */
    versand: string };
  /**
   * ── DIE DATEI STEHT IM AUSWAHLFELD (Owner 17.09.2026: „auch datei kaufen kommt da rein" ·
   * „also hier", mit Bild des geöffneten Rahmen-Feldes) ───────────────────────────────────────
   *
   * Vorher war sie ein zweiter Block mit einem ZWEITEN Rahmen-Feld — dasselbe Wort zweimal
   * untereinander, und niemand wusste, welches gilt. Jetzt ist sie die vierte Zeile in diesem
   * Feld: Man wählt EINMAL, was man bekommt — schwarz gerahmt, Holz, ohne Rahmen, oder die
   * Druckdatei —, und daneben steht der Preis dieser Wahl.
   *
   * Ist die Datei gewählt, zeigt das zweite Feld statt der Papiergrösse die Rahmen-Fassung: Die
   * Datei hat keine Grösse (sie wird in jeder gedruckt), aber sehr wohl einen Rahmen im Bild.
   */
  datei?: { kaufen: string; erklaerung: string; schwarz: string; holz: string; ohne: string };
}) {
  /**
   * ── MIT ODER OHNE HOLZRAHMEN (Owner 15.09.2026: „können wir das mit rahmen auch anbieten? es
   * ist ein anderer preis dann") ──────────────────────────────────────────────────────────────
   *
   * Zwei Waren, nicht eine mit Zusatz: „poster" und „posterrama" stehen je mit eigenem Preis in
   * derselben Tabelle. Damit rechnet der Server ohne Sonderfall, und im Korb steht, was bestellt
   * wurde — nicht ein Poster mit einem Häkchen daneben.
   */
  const rahmenBar = material === "poster" || material.startsWith("posterrama");
  /* „1" Holz, „2" schwarz — der Wert steht auch in der CSS-Regel, die den Rahmen um die
     Kachel zeichnet (globals.css). */
  /* ── SCHWARZ IST DIE VORGABE (Owner 15.09.2026: „wir zeigen die kacheln default mit dem
     schwarzen rahmen") ────────────────────────────────────────────────────────────────────
     Ein gerahmtes Poster sieht aus wie ein fertiges Produkt, ein loses Blatt wie eine Datei.
     Schwarz passt zu jeder Wand und zu jedem Motiv; wer es anders will, ändert es mit einem
     Klick — und sieht den Unterschied sofort an der Kachel. */
  /* ── SCHWARZ IST DIE VORGABE, OHNE BLEIBT MÖGLICH (Owner 16.09.2026) ──────────────────────
     Der gedruckte Rahmen kostet nichts, also steht er vorn. Wer das Blatt selbst rahmen will,
     nimmt „ohne" — sonst lägen zwei Rahmen übereinander. */
  const [rahmen, setRahmen] = useState(material === "posterrama" ? "1" : material === "poster" ? "0" : "2");
  /**
   * ── ZUERST DIE FRAGE: PAPIER ODER DATEI (Owner 17.09.2026: „print oder Datei" · „eins von
   * beiden" · „ganz oben" · „print muss neben datei sein") ────────────────────────────────────
   *
   * Vorher hing die Datei als vierte Zeile bei den Rahmen — als wäre sie eine Rahmenfarbe. Sie
   * ist aber die andere Ware: entweder es kommt etwas in einem Paket, oder es kommt gar nichts
   * und man druckt selbst. Diese Frage steht deshalb ganz oben, die zwei Möglichkeiten
   * nebeneinander, und erst darunter die Einzelheiten der gewählten.
   */
  const [istDatei, setIstDatei] = useState(false);
  /* Welche Holzfarbe zuletzt gewählt war — damit „ohne Rahmen" und zurück nicht auf Schwarz
     zurückspringt, wenn er Hell gewählt hatte. */
  const [farbe, setFarbe] = useState("2");
  const echtesMaterial = istDatei && rahmenBar ? "fisier"
    : rahmenBar ? (rahmen === "1" ? "posterrama" : rahmen === "2" ? "posterramaneagra" : "poster")
    : material;
  const groessen = druckGroessenFuer(echtesMaterial);
  const [groesse, setGroesse] = useState(druckGroessenFuer(material === "posterrama" ? "posterrama" : material === "poster" ? "poster" : "posterramaneagra")[0] ?? "");
  /* Die Datei hat nur eine Fassung: ohne Rahmen (Owner 17.09.2026). In der Preistabelle heisst
     sie weiterhin „fara" — dort ist die „Grösse" die Fassung. */
  const fassung = "fara";
  const wahl = istDatei ? fassung : groesse;
  const [drin, setDrin] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(false);

  const cents = druckPreisCents(echtesMaterial, wahl, anteil);
  if (cents === null) return null;

  const dazu = () => {
    korbDazu({ mandant, werk, material: echtesMaterial, groesse: wahl, anteil });
    setDrin(true);
    window.setTimeout(() => setDrin(false), 2200);
  };

  const kaufen = async () => {
    if (laeuft) return;
    setLaeuft(true); setFehler(false);
    try {
      const res = await fetch("/api/druck-kasse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* `zurueck`: Bricht er bei Stripe ab, kommt er auf DIESE Seite zurück — mit Reiter
           und Sprache, nicht auf die nackte Künstleradresse (Owner 17.09.2026). */
        body: JSON.stringify({ mandant, werk, material: echtesMaterial, groesse: wahl, sprache,
          zurueck: (() => {
            /* `?zu=` statt `#…`: Eine Marke überlebt den Weg über Stripe nicht zuverlässig, ein
               Abfrageteil schon (Owner 18.09.2026). Den Sprung macht `PosterZurueckSprung`. */
            const u = new URL(window.location.href);
            u.searchParams.set("zu", `w-${werk}`);
            return u.pathname + u.search;
          })(),
          ...(adminS ? { s: adminS } : {}) }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string };
      if (!d.ok || !d.url) { setFehler(true); setLaeuft(false); return; }
      window.location.href = d.url;
    } catch { setFehler(true); setLaeuft(false); }
  };

  /**
   * ── ALLES AUF EINEN BLICK (Owner 17.09.2026: „in einem dropdown alle varianten oder noch
   * besser wäre radiobuttons, dann sieht man alles auf Anhieb, dann radiobutton zum
   * warenkorb") ─────────────────────────────────────────────────────────────────────────────
   *
   * Ein Auswahlfeld versteckt seine Möglichkeiten: Wer nicht klickt, weiss nicht, dass es Holz,
   * kein Rahmen und die Datei überhaupt gibt — und sieht auch nicht, was die nächste Grösse
   * kostet. Als Reihe von Schaltern steht alles offen da, samt Preis je Grösse.
   *
   * ECHTE RADIOS, kein Knopf mit `aria-*`: Pfeiltasten, Vorlesen und die CSS-Regel für den
   * Rahmen am Blatt (`.lb-rahmen-wahl input:checked`) arbeiten damit von selbst.
   *
   * AUSWAHL VERSCHIEBT NIE (Skill `ci-design`): beide Zustände tragen denselben Rand und
   * dieselbe Polsterung — es wechselt nur die Farbe.
   */
  /* ── DIE CHIPS BLEIBEN GRAU, SCHWARZ IST DER KAUFKNOPF (Owner 17.09.2026: „die chips grau,
     nur cta schwarz"; Skill `ci-design`: „ein Chip darf nie wie ein Knopf aussehen") ─────────
     Ein schwarz gefüllter Chip sieht aus wie der Kaufknopf — auf der Kachel standen dann vier
     schwarze Flächen und man sah nicht mehr, welche kauft. Gewählt heisst deshalb: grau gefüllt
     mit dunklem Rand, nicht schwarz. Rand und Polsterung sind in beiden Zuständen gleich, es
     wechselt nur die Farbe. */
  const schalter = (an: boolean) =>
    `cursor-pointer rounded-xl border px-3 py-1.5 text-[14px] leading-none transition ${
      an ? "border-[#111] bg-[#ecebe6] font-semibold text-[#111]" : "border-[#d8d3c6] bg-white text-[#777] hover:border-[#111] hover:text-[#111]"}`;

  return (
    <div className="mt-3">
      {rahmenBar && datei ? (
        /* Die eine Frage, zwei Antworten, nebeneinander. */
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[{ d: false, t: texte.ohneRahmen }, { d: true, t: datei.kaufen }].map(o => (
            <label key={String(o.d)} className={schalter(istDatei === o.d)}>
              <input type="radio" name={`art-${mandant}-${werk}`} checked={istDatei === o.d}
                onChange={() => setIstDatei(o.d)} className="sr-only" />
              {o.t}
            </label>
          ))}
        </div>
      ) : null}

      {rahmenBar && !istDatei ? (
        /* `lb-rahmen-wahl`: Daran hängt die CSS-Regel, die im Poster darüber den Rahmen zeichnet
           (globals.css, Owner 15.09.2026: „wenn ich einen rahmen auswähle soll auch der rahmen
           erscheinen beim kachel"). */
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {/* ── ERST GERAHMT ODER NICHT, DANN DIE FARBE (Owner 17.09.2026: „separate chips für
              farben" · „Cu Rama de Lemn als chip") ────────────────────────────────────────────
              Zwei Fragen, nacheinander statt durcheinander: Der Chip sagt, WAS man bekommt — ein
              gerahmtes Blatt oder ein blankes. Welche Farbe das Holz hat, beantwortet die Reihe
              darunter mit echten Flecken (dieselben Texturen wie der Rahmen am Blatt). */}
          {[
            { an: true, t: texte.mitRahmenWahl },
            { an: false, t: texte.ohneRahmenWahl },
          ].map(o => (
            <label key={String(o.an)} className={schalter((rahmen !== "0") === o.an)}>
              <input type="radio" name={`r-${mandant}-${werk}`} checked={(rahmen !== "0") === o.an}
                onChange={() => setRahmen(o.an ? (farbe || "2") : "0")} className="sr-only" />
              {o.t}
            </label>
          ))}
        </div>
      ) : null}

      {rahmenBar && !istDatei && rahmen !== "0" ? (
        /* Die Farbe des Holzes — nur wenn überhaupt gerahmt wird.

           `lb-rahmen-wahl` MUSS an DIESER Reihe hängen (17.09.2026: „schalter holzfarben geht
           nicht"): Die CSS-Regel am Blatt sucht `.lb-rahmen-wahl input[value="1"|"2"]:checked`.
           Seit die Farbe eine eigene Reihe hat, stehen diese Werte hier — an der Reihe darüber
           („gerahmt oder nicht") gibt es sie nicht mehr, und der Rahmen am Blatt blieb stehen. */
        <div className="lb-rahmen-wahl mt-2 flex flex-wrap items-center justify-center gap-2">
          {[
            { v: "2", t: texte.rahmenSchwarz, probe: "/lakatosbandi/rahmen-schwarz-probe.png" },
            { v: "1", t: texte.mitRahmen, probe: "/lakatosbandi/rahmen-holz-probe.png" },
          ].map(o => (
            <label key={o.v} title={o.t} aria-label={o.t}
              className={`block h-9 w-9 cursor-pointer rounded-xl border-2 bg-cover transition ${
                rahmen === o.v ? "border-[#111]" : "border-transparent ring-1 ring-[#d8d3c6] hover:border-[#bbb]"}`}
              style={{ backgroundImage: `url(${o.probe})` }}>
              <input type="radio" name={`c-${mandant}-${werk}`} value={o.v} checked={rahmen === o.v}
                onChange={() => { setRahmen(o.v); setFarbe(o.v); }} className="sr-only" />
            </label>
          ))}
          {/* Welcher Ton gewählt ist, steht daneben — ein Fleck allein wäre ein Rätsel. */}
          <span className="text-[13.5px] font-semibold text-[#555]">
            {rahmen === "2" ? texte.rahmenSchwarz : texte.mitRahmen}
          </span>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {istDatei ? (
          /* ── DIE DATEI GIBT ES NUR OHNE RAHMEN (Owner 17.09.2026: „und datei gibts nur ohne
             rahmen fertig") ──────────────────────────────────────────────────────────────────
             Ein gedruckter Rahmen IN einer Datei ist ein Bild von einem Rahmen: Wer sie selbst
             drucken und rahmen lässt, hätte zwei übereinander. Es bleibt das blanke Werk — also
             gibt es hier auch nichts zu wählen. */
          null
        ) : (
          groessen.map(g => {
            /* Der Preis steht an der Grösse: „alles auf Anhieb" heisst auch, was es kostet. */
            const p = druckPreisCents(echtesMaterial, g, anteil);
            return (
              <label key={g} className={schalter(groesse === g)}>
                <input type="radio" name={`g-${mandant}-${werk}`} value={g} checked={groesse === g}
                  onChange={() => setGroesse(g)} className="sr-only" />
                {p === null ? druckMass(g) : `${druckMass(g)} · ${eur(p, sprache)}`}
              </label>
            );
          })
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => void kaufen()} disabled={laeuft}
          className="rounded-xl bg-[#111] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-40">
          {laeuft ? "…" : `${texte.kaufen} · ${eur(cents, sprache)}`}
        </button>
        {/* ── DER KORB WIRD AUSGESCHRIEBEN (Owner 17.09.2026: „ich habe auf dem icon warenkorb
            geklickt. Es muss ausgeschrieben sein") ───────────────────────────────────────────
            Ein Täschchen allein erklärt nicht, was passiert: Er hielt es für den Kaufweg und
            landete nicht dort, wo er wollte. Jetzt steht das Wort daneben — schwarz gefüllt
            bleibt allein „Kaufen". */}
        <button type="button" onClick={dazu}
          className="inline-flex items-center gap-2 rounded-xl border border-[#111] px-4 py-2 text-[14px] font-semibold text-[#111] transition hover:bg-[#111] hover:text-white">
          {drin ? <Check className="h-4 w-4" aria-hidden /> : <ShoppingBag className="h-4 w-4" aria-hidden />}
          {texte.korb}
        </button>
      </div>

      {/* Was die Lieferung für DIESE Wahl kostet — vor dem Klick, nicht erst bei Stripe (Skill
          `bezahlung`, Regel 8). Bei der Datei entfällt die Zeile: sie fährt nicht. */}
      {!istDatei ? (
        <p className="m-0 mx-auto mt-2 max-w-[42ch] text-center text-[13px] leading-[1.5] text-[#8a8375]">
          {texte.versand.replace("{versand}", eur(druckVersandCents([echtesMaterial]), sprache))}
        </p>
      ) : null}
      {fehler && <p className="m-0 mt-1 text-center text-[13px] font-semibold text-[#b3261e]">{texte.fehler}</p>}
      {/* Was die Datei ist, steht erst da, wenn sie gewählt ist — sonst kauft jemand ein PDF und
          erwartet Papier (Owner 16.09.2026). */}
      {istDatei && datei ? (
        <p className="m-0 mx-auto mt-1 max-w-[42ch] text-center text-[13px] leading-[1.5] text-[#8a8375]">{datei.erklaerung}</p>
      ) : null}
    </div>
  );
}
