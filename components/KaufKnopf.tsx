"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { kundenbildSichern, POSTER_BILD_EREIGNIS, POSTER_RAHMEN_EREIGNIS, type PosterBildArt, type PosterBildNachricht, type PosterRahmenNachricht } from "@/components/PosterDeinBild";
import { druckGroessenFuer, druckPreisCents, druckMass, druckVersandCents, druckAbzugCents } from "@/lib/lakatosbandi-druck";
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
export default function KaufKnopf({ mandant, werk, material, sprache, anteil = false, adminS = "", texte, datei, a3Cents }: {
  mandant: string;
  /** Sein eigener Posterpreis (A3 ohne Rahmen, Cent) — nur zur Anzeige, die Kasse liest ihn selbst aus dem Datensatz. */
  a3Cents?: number;
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
  datei?: { kaufen: string; erklaerung: string; schwarz: string; holz: string; ohne: string;
    /** „Gratis" — steht am Knopf, wenn die Datei im Erzeugen-Preis steckt. */
    frei?: string;
  };
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
  /**
   * ── HIER STAND EIN SCHALTER „OHNE DRUCK" — UND ER WAR FALSCH (Owner 19.09.2026: „wo ist die
   * Bestellung eines eingerahmten Posters?") ────────────────────────────────────────────────
   *
   * Aus „den Print-Button rausnehmen" hatte ich „es gibt keinen Druck" gemacht. Damit fiel auf
   * seinen Generatoren der ganze Weg zum GEDRUCKTEN, GERAHMTEN Poster weg — und das ist das
   * Produkt, das Geld bringt. Die digitale Datei ist das, was der Generator SOFORT liefert; das
   * gerahmte Poster ist, was man danach bestellt. Beides gehört nebeneinander, so wie vorher.
   *
   * Der Chip ist deshalb wieder die Frage: gedruckt oder als Datei.
   */
  const [istDatei, setIstDatei] = useState(false);
  /* Welche Holzfarbe zuletzt gewählt war — damit „ohne Rahmen" und zurück nicht auf Schwarz
     zurückspringt, wenn er Hell gewählt hatte. */
  const [farbe, setFarbe] = useState("2");
  const echtesMaterial = istDatei && rahmenBar ? "fisier"
    : rahmenBar ? (rahmen === "1" ? "posterrama" : rahmen === "2" ? "posterramaneagra" : "poster")
    : material;
  const groessen = druckGroessenFuer(echtesMaterial);
  /**
   * ── DIE VORWAHL GILT FÜR JEDES MATERIAL, NICHT NUR FÜR POSTER (Owner 21.09.2026, beim
   * Anlegen der Sonnenbrille bemerkt) ──────────────────────────────────────────────────────
   *
   * Hier stand ein Rückfall auf „posterramaneagra" für alles, was nicht „poster" oder
   * „posterrama" war — bei Textil oder der Sonnenbrille wählte die Seite also unsichtbar A3
   * vor, eine Grösse, die es dort gar nicht gibt (bislang folgenlos: Kleidung stand hinter
   * `KLEIDUNG_AN`). Vorgewählt ist jetzt die kleinste Grösse DIESES Materials — die Regel, die
   * der Kommentar oben schon verspricht.
   */
  const [groesse, setGroesse] = useState(druckGroessenFuer(material === "poster" || material.startsWith("posterrama") ? "posterramaneagra" : material)[0] ?? "");
  /* Die Datei hat nur eine Fassung: ohne Rahmen (Owner 17.09.2026). In der Preistabelle heisst
     sie weiterhin „fara" — dort ist die „Grösse" die Fassung. */
  const fassung = "fara";
  /**
   * ── DER PREIS HÄNGT AN DER WARE, DAS MASS AM BLATT (19.09.2026) ─────────────────────────────
   *
   * Kurz stand hier `groesse` auch für die Datei — und damit suchte die Preistabelle „fisier/A3".
   * Das gibt es nicht (die Datei kennt nur die Fassung „fara"), also kam `null` zurück und der
   * ganze Kaufblock verschwand wortlos von der Seite.
   *
   * Der Preis bleibt deshalb an der Fassung. Die gewählte GRÖSSE reist getrennt mit — sie sagt
   * nur, in welchem Mass die Datei gebaut wird (`api/kunst-datei?format=…`).
   */
  const wahl = istDatei ? fassung : groesse;
  /* Was gerade im Blatt steht — das Blatt sagt es an (`POSTER_BILD_EREIGNIS`). */
  const [bildArt, setBildArt] = useState<PosterBildArt>("keins");
  useEffect(() => {
    const hoeren = (e: Event) => {
      const d = (e as CustomEvent<PosterBildNachricht>).detail;
      if (d?.mandant === mandant && d?.werk === werk) setBildArt(d.art);
    };
    window.addEventListener(POSTER_BILD_EREIGNIS, hoeren);
    return () => window.removeEventListener(POSTER_BILD_EREIGNIS, hoeren);
  }, [mandant, werk]);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState(false);
  /* Was gewählt ist, sagen wir an: das Vollbild zeichnet danach, die Druckdatei nimmt es mit. */
  useEffect(() => {
    window.dispatchEvent(new CustomEvent<PosterRahmenNachricht>(POSTER_RAHMEN_EREIGNIS, {
      detail: { mandant, werk, wahl: istDatei ? "0" : rahmen },
    }));
  }, [mandant, werk, rahmen, istDatei]);
  /**
   * ── NACH DER ERZEUGUNG STEHT DIE DATEI VORN (Owner 19.09.2026: „soll sofort der Chip
   * «Descarcă fișierul» aktiv sein") ──────────────────────────────────────────────────────────
   *
   * Wer sein Blatt gerade hat zeichnen lassen, will es zuerst HABEN — und für ihn ist es gratis.
   * Stünde weiter „Print" vorn, müsste er erst umschalten, um an das zu kommen, was er schon
   * bezahlt hat. Der Druck bleibt daneben stehen, einen Tipp entfernt.
   *
   * NUR EINMAL, BEIM UMSCHLAG AUF „KUNST": `gesehen` merkt sich, dass es schon geschehen ist —
   * sonst spränge die Wahl bei jedem erneuten Rendern zurück, und wer bewusst auf Print tippt,
   * fände sich sofort wieder bei der Datei.
   */
  const gesehen = useRef(false);
  useEffect(() => {
    if (bildArt === "kunst" && !gesehen.current) { gesehen.current = true; setIstDatei(true); }
    if (bildArt !== "kunst") gesehen.current = false;
  }, [bildArt]);

  /**
   * ── DAS SCHILD FOLGT DEM BLATT (Owner 18.09.2026: „wenn das Bild nicht generiert ist, dann
   * darf man keine Lizenz verlangen" · „1 Euro bekommt der Künstler") ─────────────────────────
   *
   * Setzt der Kunde nur sein eigenes Foto ein, steht nichts vom Künstler auf dem Blatt: dann
   * 1 € Vermittlung statt 10 € Lizenz — und der Preis am Knopf muss das sofort zeigen, nicht
   * erst die Kasse. Gerechnet wird trotzdem auf dem Server.
   */
  /* Steht ein Bild des Kunden im Blatt — hochgeladen ODER erzeugt —, ist nichts vom Künstler
     darauf: keine Lizenz und auch keine Vermittlung (Owner 19.09.2026: „wir verdienen beim Druck
     des Prints"). Die Begründung steht in `api/druck-kasse`; dort wird verbindlich gerechnet. */
  const anteilJetzt: boolean | number = anteil === false ? false : bildArt === "keins";

  const listenPreis = druckPreisCents(echtesMaterial, wahl, anteilJetzt, a3Cents);
  if (listenPreis === null) return null;
  /**
   * ── DAS ERZEUGEN IST SCHON BEZAHLT (Owner 19.09.2026: „also 10 abziehen, oder?") ──────────
   *
   * Steht auf dem Blatt ein erzeugtes Bild, hat er dafür bereits `KUNST_CENTS` gezahlt. Der
   * Betrag wird auf den Druck angerechnet — die Begründung und der Boden stehen bei
   * `druckAbzugCents`. Das Schild rechnet hier mit, damit er den Preis VOR dem Klick sieht;
   * verbindlich rechnet `api/druck-kasse` aus dem Zettel neben dem abgelegten Bild.
   */
  const abzug = bildArt === "kunst" ? druckAbzugCents(echtesMaterial, wahl, listenPreis) : 0;
  const cents = listenPreis - abzug;

  /**
   * ── SEINE EIGENE DATEI IST BEZAHLT (Owner 19.09.2026: „generează kostet 10 Euro, klar? Dann
   * ist Download gratis") ────────────────────────────────────────────────────────────────────
   *
   * Steht auf dem Blatt ein Bild, das er selbst hat ERZEUGEN lassen (`bildArt === "kunst"`),
   * dann hat er dafür schon bezahlt — eine zweite Kasse für dieselbe Sache wäre die Stelle, an
   * der Leute abbrechen und ihr Geld zurückfordern.
   *
   * NUR FÜR DIE DATEI, nicht für den Druck: Ein gedrucktes Blatt mit Rahmen und Versand ist ein
   * anderes Produkt.
   *
   * NUR FÜR „kunst", nicht für „foto": Ein bloss hochgeladenes Foto hat niemand bezahlt.
   *
   * ENTSCHIEDEN WIRD ES TROTZDEM AUF DEM SERVER (`api/kunst-datei` prüft den Zettel neben dem
   * abgelegten Bild). Das hier ist das Schild, nicht der Riegel.
   */
  /**
   * ── UND FÜR DEN HAUSHERRN IMMER (Owner 19.09.2026: „ich soll jederzeit die Datei runterladen
   * können, egal in welchem Zustand" · „mit oder ohne Generierung, mit hochgeladenem Bild auch")
   *
   * Für den Käufer hängt die Gratis-Datei am bezahlten Lauf. Für ihn an gar nichts: erzeugtes
   * Blatt, bloss hochgeladenes Foto oder das blanke Werk — alle drei gehen.
   *
   * ENTSCHIEDEN WIRD ES AUF DEM SERVER (`api/kunst-datei` prüft den Schlüssel zeitsicher); hier
   * steht nur, was der Knopf anbietet.
   */
  const dateiBezahlt = istDatei && (bildArt === "kunst" || !!adminS);

  /* Die Datei liegt beim Server, nicht im Browser: Er baut sie aus dem abgelegten Bild — dasselbe
     Blatt, das die Druckerei bekäme. */
  /**
   * ── BILD ODER PDF (Owner 19.09.2026: „ich denke, dass JPGs sogar besser sind" · „als Datei und
   * nicht PDFs") ────────────────────────────────────────────────────────────────────────────
   *
   * SEIN FALL ENTSCHEIDET DIE REIHENFOLGE: „Stell dir vor, ich bin als Künstler auf einer
   * Hochzeit eingeladen, ich will sofort Poster erstellen und drucken." Wer so unterwegs ist,
   * geht zum nächsten Fotodienst — und der nimmt ein Bild, kein PDF. Also ist das JPG der Knopf
   * und das PDF der Satz darunter, nicht umgekehrt.
   *
   * Beide kosten nichts und lassen sich beliebig oft holen: Es ist reine Rechenzeit, kein Modell.
   */
  const dateiHolen = async (typ: "jpg" | "pdf" = "jpg") => {
    if (laeuft) return;
    setLaeuft(true); setFehler(false);
    try {
      const bild = await kundenbildSichern(mandant, werk);
      /* Kein Bild des Kunden im Blatt: Für ihn ist das kein Fehler — dann wird das Werk des
         Künstlers gesetzt. Für alle anderen bricht es hier ab wie bisher. */
      if (!bild && !adminS) { setFehler(true); setLaeuft(false); return; }
      const u = new URL("/api/kunst-datei", window.location.origin);
      if (typ === "jpg") u.searchParams.set("typ", "jpg");
      if (bild) u.searchParams.set("bild", bild);
      /* Sein Schlüssel reist mit — ohne ihn verlangt die Route eine bezahlte Erzeugung. */
      if (adminS) u.searchParams.set("s", adminS);
      u.searchParams.set("m", mandant);
      u.searchParams.set("i", werk);
      /* Seine Wahl, nicht eine feste Zahl — Grösse und Rahmen stehen an den Chips darüber. */
      u.searchParams.set("format", ["A3", "A2", "A1"].includes(groesse) ? groesse : "A3");
      if (rahmen === "1") u.searchParams.set("rahmen", "holz");
      if (rahmen === "2") u.searchParams.set("rahmen", "schwarz");
      if (fassung !== "fara") u.searchParams.set("rahmen", fassung);
      /* Ein Wechsel der Adresse startet den Download und lässt die Seite stehen — kein neues
         Fenster, das der Blocker abfängt. */
      window.location.href = u.toString();
      /* Der Knopf muss zurückkommen: Ein Download wechselt die Seite nicht, `onload` feuert nie
         ([[immer-close-einbauen]]). */
      window.setTimeout(() => setLaeuft(false), 4000);
    } catch { setFehler(true); setLaeuft(false); }
  };

  const kaufen = async () => {
    if (laeuft) return;
    setLaeuft(true); setFehler(false);
    try {
      /* ── SEIN BILD MUSS DEN WEG ÜBER STRIPE ÜBERLEBEN (Owner 18.09.2026) ─────────────────
         Steht sein Foto (oder das erzeugte Bild) im Blatt, wird es JETZT abgelegt und reist als
         Kennung mit. Ohne diesen Schritt bekäme er das Werk des Künstlers gedruckt — und die
         Kasse könnte nicht unterscheiden, ob 10 € Lizenz oder 1 € Vermittlung fällig sind. */
      const bild = await kundenbildSichern(mandant, werk);
      const res = await fetch("/api/druck-kasse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        /* `zurueck`: Bricht er bei Stripe ab, kommt er auf DIESE Seite zurück — mit Reiter
           und Sprache, nicht auf die nackte Künstleradresse (Owner 17.09.2026). */
        body: JSON.stringify({ mandant, werk, material: echtesMaterial, groesse: wahl, sprache,
          ...(bild ? { bild } : {}),
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
      {/* ── RAHMEN UND GRÖSSE GELTEN AUCH FÜR DIE DATEI (Owner 19.09.2026: „nur Print") ─────
          Beim Entfernen des Druckwegs waren auch Rahmen- und Grössenwahl verschwunden. Sie
          gehören aber nicht dem Druck, sondern dem BLATT: Die Datei kommt in A3, A2 oder A1 und
          wahlweise mit gedrucktem Rahmen (`api/kunst-datei?format=…&rahmen=…`). Nur bestellen
          kann man auf einem Generator nichts. */}
      {/* ── EINE REIHE, DREI ANTWORTEN (Owner 20.09.2026: erst „diesen Chip raus" zum Print-Chip,
          dann mit Bild: „hier kann ich nicht zurück auf den Zustand mit Rahmen, nur mit Klick auf
          Descarcă fișierul, was unlogisch ist") ───────────────────────────────────────────────
          Ohne Print-Chip stand die Datei allein da und liess sich nur durch einen zweiten Klick
          auf sich selbst wieder abwählen — ein Schalter, den man als solchen nicht erkennt, und
          solange er an war, war alles andere verschwunden.

          Jetzt ist es EINE Frage mit drei Antworten, die immer alle dastehen: gerahmt · ohne
          Rahmen · Datei. Wer die Datei gewählt hat und doch drucken will, klickt einfach auf
          eine der beiden anderen. Kein Chip verschwindet, keiner muss zweimal geklickt werden. */}
      {rahmenBar ? (
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
            <label key={String(o.an)} className={schalter(!istDatei && (rahmen !== "0") === o.an)}>
              <input type="radio" name={`r-${mandant}-${werk}`} checked={!istDatei && (rahmen !== "0") === o.an}
                onChange={() => { setIstDatei(false); setRahmen(o.an ? (farbe || "2") : "0"); }} className="sr-only" />
              {o.t}
            </label>
          ))}
          {datei ? (
            <label className={`${schalter(istDatei)} inline-flex items-center gap-1.5`}>
              <input type="radio" name={`r-${mandant}-${werk}`} checked={istDatei}
                onChange={() => setIstDatei(true)} className="sr-only" />
              <Download className="h-[15px] w-[15px] shrink-0" aria-hidden />
              {datei.kaufen}
            </label>
          ) : null}
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
            const p = druckPreisCents(echtesMaterial, g, anteilJetzt, a3Cents);
            return (
              <label key={g} className={schalter(groesse === g)}>
                <input type="radio" name={`g-${mandant}-${werk}`} value={g} checked={groesse === g}
                  onChange={() => setGroesse(g)} className="sr-only" />
                {p === null ? druckMass(g)
                  : `${druckMass(g)} · ${eur(p - (bildArt === "kunst" ? druckAbzugCents(echtesMaterial, g, p) : 0), sprache)}`}
              </label>
            );
          })
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => void (dateiBezahlt ? dateiHolen("jpg") : kaufen())} disabled={laeuft}
          className="rounded-xl bg-[#111] px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-40">
          {laeuft ? "…" : dateiBezahlt
            ? `${datei?.kaufen ?? texte.kaufen} · ${datei?.frei ?? ""}`.replace(/ · $/, "")
            : `${texte.kaufen} · ${eur(cents, sprache)}`}
        </button>
        {/* ── DER KORB WIRD AUSGESCHRIEBEN (Owner 17.09.2026: „ich habe auf dem icon warenkorb
            geklickt. Es muss ausgeschrieben sein") ───────────────────────────────────────────
            Ein Täschchen allein erklärt nicht, was passiert: Er hielt es für den Kaufweg und
            landete nicht dort, wo er wollte. Jetzt steht das Wort daneben — schwarz gefüllt
            bleibt allein „Kaufen". */}
        {/* KEIN KORB FÜR ETWAS, DAS NICHTS KOSTET (Owner 19.09.2026): Der Korb sammelt Posten für
            EINE Zahlung. Eine bezahlte Datei gehört dort nicht hinein — sie käme mit 10 € auf die
            Rechnung, obwohl er sie schon hat. */}
        {/* ── KEIN ZWEITER DATEI-WEG (Owner 19.09.2026: „die auch raus") ────────────────────
            Hier stand „PDF für die Druckerei" als Nebenlink. Das war mein Vorschlag, nicht seiner
            — und er hatte schon gesagt, worauf es ankommt: „als Datei und nicht PDFs", „ich denke,
            dass JPGs sogar besser sind". Zwei Wege zur selben Datei sind eine Frage, die sich
            niemand stellt; wer auf einer Hochzeit steht, will EINEN Knopf.

            Das PDF bleibt gebaut: Die Auftragsmail an die Druckerei hängt es an
            (`lib/lakatosbandi-bestellung.ts`), und `api/kunst-datei` liefert es weiterhin ohne
            `typ=jpg`. Es steht nur nicht mehr auf der Seite. */}

        {/**
          * ── MIT SEINEM BILD WIRD EINZELN BESTELLT (Owner 19.09.2026: „ich fürchte, der Weg
          * Generierung dann Warenkorb wird es nicht gehen" · „dann raus der Warenkorb" · „es soll
          * direkt bestellt werden, einzeln") ─────────────────────────────────────────────────────
          *
          * Ein Korb sammelt WAREN. Ein Blatt mit seinem Gesicht ist keine Ware aus dem Regal: Es
          * hängt an genau diesem einen Bild, an diesen Zeilen, an dieser Grösse. Sammelt er drei
          * davon und ändert dazwischen das Foto, steht im Korb dreimal derselbe Posten mit dem
          * falschen Bild — und das merkt niemand, bis das Paket ankommt.
          *
          * Deshalb: Sobald etwas von IHM im Blatt liegt (hochgeladen oder erzeugt), gibt es nur
          * noch „Kaufen". Auf dem blanken Werk eines Künstlers bleibt der Korb, wo er hingehört.
          */}
        {/**
          * ── KEIN WARENKORB-KNOPF MEHR (Owner 20.09.2026, mit Bild des Knopfs: „das raus, es geht
          * 100% nicht") ────────────────────────────────────────────────────────────────────────
          *
          * Am 19.09. fiel er schon weg, sobald ein eigenes Bild im Blatt lag. Jetzt ganz: Gekauft
          * wird einzeln, über „Kaufen". Der Korb selbst (`lib/lakatosbandi-korb.ts`, die Kasse
          * dahinter) bleibt liegen — hier fehlt nur der Weg hinein.
          */}
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
