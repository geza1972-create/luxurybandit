"use client";

import { useEffect, useState } from "react";
import VFIcon from "@/components/VersusForgeIcon";
import LandingKarte from "@/components/LandingKarte";
import { VF_KAUF_AKTIV } from "@/lib/versusforge-schalter";
import { useRouter } from "next/navigation";
import { Share2, Check, Sun, Moon } from "lucide-react";
import { EingabeMehrzeilig, Fehlerzeile, Knopf } from "@/components/CI";
import VersusForgeDashboard from "@/components/VersusForgeDashboard";
import VersusForgeRechnung from "@/components/VersusForgeRechnung";
import { Logo, mitMarke } from "@/components/VersusForgeMarke";
import { T_HERO, T_HERO_2, T_SUB, T_TITEL, T_TEXT, T_KLEIN, T_LABEL } from "@/lib/versusforge-typo";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import type { VersusForgeTexte } from "@/lib/versusforge-texte";

/**
 * DIE WURZEL VON versusforge.com — DIE MASCHINE SELBST (Owner 08.09.2026: „Eine Seite für
 * VersusForge. Eine Maschine. Die Startseite soll auf Desktop responsiv sein. Soll aussehen
 * wie yourvideogenerator. ASCII-Video, und mittendrin ist das Eingabefeld.").
 *
 * DER UNTERSCHIED ZU `FunnelDomainStart`: Dort ist das ASCII-Video ALLES — die Domain trägt
 * fremde Trichter und braucht nur den Beweis, dass hier jemand Videos macht. Hier ist es der
 * HINTERGRUND. Wer versusforge.com eintippt, soll nicht bewundern, sondern anfangen: Das
 * Feld steht mitten im Bild, und der erste Satz, den er tippt, ist schon der Auftrag.
 *
 * KEIN ZWEITER SCHIRM DAVOR. Der Hook, die zwei Knöpfe und das Feld stehen zusammen auf
 * einer Fläche. Jeder Klick, der zwischen „ich habe verstanden" und „ich fange an" liegt,
 * kostet Leute — und diese Seite hat genau eine Aufgabe.
 *
 * WAS GETIPPT WURDE, GEHT NICHT ÜBER DIE ADRESSZEILE. Der Satz kann lang sein und enthält
 * Geschäftliches; er liegt für einen Augenblick in `sessionStorage` und wird vom Trichter
 * abgeholt und sofort gelöscht. Eine Adresse mit dem halben Auftrag darin landet in
 * Verläufen, in Verweis-Kopfzeilen und in fremden Auswertungen.
 */

const ABLAGE = "vf_auftrag";

/* Welches Beispiel zu welchem Knopf gehört — steht hier und nicht in der Textdatei, weil
   `textbausteineInSprache` einen FLACHEN Record übersetzt und ein Objekt je Beispiel dort
   nicht durchkäme. */
const BEISPIELE: { k: "bsp1" | "bsp2" | "bsp3" | "bsp4" | "bsp5" | "bsp6" | "bsp7" | "bsp8"; z: "leads" | "verkauf" }[] = [
  { k: "bsp1", z: "leads" },
  { k: "bsp2", z: "leads" },
  { k: "bsp3", z: "verkauf" },
  { k: "bsp4", z: "verkauf" },
  { k: "bsp5", z: "verkauf" },
  { k: "bsp6", z: "verkauf" },
  /* Er sucht keine Leute und verkauft kein Ding — er verkauft sich. Mechanisch ist es
     „leads": Firmen melden sich bei ihm. Den Unterschied im Inhalt erkennt der Agent am Satz. */
  { k: "bsp7", z: "leads" },
  { k: "bsp8", z: "verkauf" },
];

/**
 * KEINE EIGENE FARBTAFEL — DIE CI-BIBLIOTHEK MACHT DAS (Owner 08.09.2026: „wir haben doch
 * ein CI, was ist das?").
 *
 * Hier stand kurz eine handgeschriebene Tafel mit zwei Fassungen, und der Startknopf war ein
 * selbstgebautes `<button>` mit `bg-[#f6cf51]`. Beides war falsch, und der Owner hat es am
 * Knopf gesehen: Er sah anders aus als jeder andere Knopf im Haus — flach, ohne den Verlauf
 * und den Schein, die `Knopf art="gold"` mitbringt.
 *
 * `components/CI.tsx` ist die EINE Quelle ([[ci-bibliothek]]). Und sie löst die helle
 * Fassung gleich mit: Trägt die Seite `lb-theme lb-fb`, färbt `globals.css` jedes Gold
 * automatisch ins Haus-Blau um. Eine zweite Farbtafel daneben ist nicht nur Arbeit doppelt —
 * sie läuft beim ersten Wechsel auseinander.
 */
/**
 * `basis` — WO DIESE SEITE LIEGT (08.09.2026, mit dem Topic auf LuxuryBandit nötig geworden).
 *
 * Dieselbe Landingpage hat jetzt zwei Adressen: die Wurzel (versusforge.com und `?vf=1`) und
 * /themes/versusforge. Vorher waren Sprachwahl und Hell/Dunkel fest auf die Wurzel verdrahtet
 * — wer über die Kachel kam und die Sprache wechselte, wurde aus dem Topic geworfen.
 *
 * DER AUFRUFER WEISS ES, DIE SEITE NICHT: Der Pfad kommt als Angabe herein, statt im Browser
 * geraten zu werden. So stimmt er auch beim ersten Aufbau auf dem Server, wo es kein
 * `window` gibt — ein hier geratener Pfad ergäbe beim ersten Anzeigen andere Links als
 * danach.
 */
export default function VersusForgeStart({ S, lang, probe = false, hell = false, basis = "/" }: { S: VersusForgeTexte; lang: string; probe?: boolean; hell?: boolean; basis?: string }) {
  /* Ein Verweis auf diese Seite selbst, mit den mitgegebenen Zusätzen. */
  const hier = (extra: string) => {
    const teile = [probe && basis === "/" ? "vf=1" : "", extra].filter(Boolean).join("&");
    return teile ? `${basis}?${teile}` : basis;
  };
  const router = useRouter();
  const [ziel, setZiel] = useState<"leads" | "verkauf">("leads");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [fehler, setFehler] = useState("");
  const [kopiert, setKopiert] = useState(false);

  /* Kommt jemand aus dem Trichter zurück, weil dort etwas schiefging, steht der Grund an dem
     Feld, in das er geschrieben hat — nicht auf einem Schirm, den er nicht mehr sieht. */
  useEffect(() => {
    try {
      const f = sessionStorage.getItem("vf_fehler");
      if (f) { sessionStorage.removeItem("vf_fehler"); setFehler(f); }
    } catch { /**/ }
  }, []);

  const start = () => {
    /* Ein Satz ODER eine Adresse — nicht beides. Wer seine Website zeigt, hat schon gesagt,
       was er tut. */
    if (text.trim().length < 15 && !url.trim()) { setFehler(S.feldZuKurz); return; }
    setFehler("");
    try { sessionStorage.setItem(ABLAGE, JSON.stringify({ ziel, text: text.trim(), url: url.trim() })); } catch { /* dann eben leer */ }
    void logTunnelEvent("funnel_started", "versusforge");
    void logFunnelEvent("vf_start", { theme: "versusforge", ziel, ueber: "wurzel" });
    router.push(`/themes/versusforge/start${lang ? `?lang=${lang}` : ""}`);
  };

  const platzhalter = ziel === "leads" ? S.feldPlatzhalterLeads : S.feldPlatzhalterVerkauf;

  /**
   * OHNE VIDEO (Owner 08.09.2026: „Video lassen wir weg").
   *
   * Es lag hier ohnehin nur der Clip von yourvideogenerator — fremdes Material als
   * Platzhalter, und ein ASCII-Raster hinter einem Eingabefeld kämpft mit der Schrift, statt
   * sie zu tragen. Es fällt ersatzlos weg, nicht durch ein anderes Bild ersetzt: Diese Seite
   * hat eine Aufgabe, und die ist das Feld.
   *
   * DAMIT VERSCHWINDET AUCH DAS DESKTOP-PROBLEM. Vorher lag alles in einer festen
   * Vollbildfläche (`fixed inset-0`), weil das Video darunter eine brauchte — auf grossen
   * Schirmen sah es aus wie eine breitgezogene Handy-Seite. Jetzt ist es eine normale Seite,
   * die einfach länger wird.
   */
  return (
    <main className={`lb-versusforge lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      {/**
        * ZWEI SPALTEN AB TABLET (Owner 08.09.2026: „trotzdem responsiv").
        *
        * Eine schmale Mittelspalte auf einem 1280er Schirm ist keine Desktop-Seite, sondern
        * eine Handy-Seite mit viel Schwarz daneben. Links steht, WARUM man hier ist; rechts
        * das Feld, mit dem man anfängt — beides zugleich sichtbar, ohne zu scrollen.
        *
        * Unter 768 px stapelt es sich in genau der alten Reihenfolge: Versprechen, Feld,
        * Beispiele. Auf dem Handy ist Untereinander richtig, dort gibt es keine zweite Spalte.
        */}
      <div className="mx-auto w-full max-w-[560px] px-5 py-10 md:px-8 md:py-16 lg:max-w-[1080px]">
        <div>
          {/**
            * SPRACHE UND TEILEN GANZ OBEN (Owner 08.09.2026: „hier brauche ich die Sprachen,
            * Deutsch, Englisch, Rumänisch, ein Share-Button").
            *
            * DREI SPRACHEN, NICHT SIEBEN: Das Haus kann sieben ([[seven-languages-no-polish]]),
            * aber diese Seite verkauft an Betriebe in genau drei Märkten. Eine Reihe mit sieben
            * Kürzeln sieht nach Software aus; drei sehen nach Entscheidung aus. Die anderen
            * Sprachen funktionieren weiterhin über `?lang=` — sie stehen nur nicht da.
            *
            * `probe` hält `?vf=1` in den Links fest: Ohne das führte jeder Sprachwechsel auf
            * localhost zurück auf das Portal, und die Seite liesse sich nur nach dem Ausrollen
            * prüfen.
            */}
          <div className="flex items-center justify-between gap-3">
            {/**
              * EINE WORTMARKE, KEIN ETIKETT (Owner 08.09.2026, mit dem BlackRock-Logo:
              * „so soll VersusForge stehen").
              *
              * Vorher stand hier VERSUSFORGE in Versalien mit weiter Sperrung — das ist die
              * Form einer Rubrik („KATEGORIE"), nicht die eines Namens. Marken wie BlackRock
              * stehen gemischt, eng und fett: Die zwei Grossbuchstaben in der Mitte machen
              * aus zwei Wörtern eines, und die enge Sperrung lässt es wie einen Block wirken.
              *
              * ZWEIFARBIG, DER ANFANG IN GOLD (Owner 08.09.2026: „zweifarbig, Forge gelb" —
              * nach dem Ansehen „nee, andersrum").
              *
              * Und andersrum ist es besser: Ein Auge liest von links. „Versus" zuerst in Farbe
              * heisst, dass der Gegner zuerst dasteht — und der Rest des Namens fällt danach
              * ruhig in Weiss ab. Umgekehrt hätte das Gold am Wortende gestanden, wo es wie
              * eine Verzierung wirkt statt wie eine Betonung.
              *
              * Der Punkt am Ende ist derselbe Kniff wie bei BlackRock: Er schliesst den Namen
              * ab und macht aus einem Wort eine Aussage.
              */}
            {/* EIN `div`, KEIN `p` (08.09.2026): `Markenzeile` ist selbst ein Absatz, und ein
                Absatz im Absatz ist in HTML verboten — der Browser zieht ihn heraus, der
                Server hatte ihn drin, und React bricht mit einem Hydration-Fehler ab. */}
            <Logo className={`text-[22px] font-black leading-none tracking-[-0.02em] md:text-[26px] ${hell ? "text-[#0f172a]" : "text-white"}`} />
            <div className="flex items-center gap-1.5">
              {(["de", "en", "ro"] as const).map(l => (
                <a key={l} href={hier(`lang=${l}`)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider transition md:text-[12px] ${
                    lang.slice(0, 2) === l ? "bg-[#f6cf51] text-[#1a160f]" : "border border-white/20 text-white/55 hover:text-white"}`}>
                  {l}
                </a>
              ))}
              {/* Teilen: die Handy-Freigabe, wenn es sie gibt, sonst in die Zwischenablage —
                  und in beiden Fällen eine Rückmeldung, sonst tippt man dreimal. */}
              {/* HELL ODER DUNKEL (Owner 08.09.2026: „ich brauche Light-Design auch") — als
                  Adresse, nicht als Schalter im Browser: So lässt sich die helle Fassung
                  verlinken, in eine Anzeige legen und jemandem schicken. */}
              <a href={hier(`lang=${lang}${hell ? "" : "&light=1"}`)}
                aria-label={hell ? "Dunkel" : "Hell"}
                className={`grid h-9 w-9 place-items-center rounded-full border transition active:scale-90 ${"border-white/20 text-white/60"}`}>
                {hell ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </a>
              <button type="button" aria-label={S.teilen}
                onClick={() => {
                  const url = window.location.origin + "/";
                  if (navigator.share) { void navigator.share({ title: "VersusForge", url }).catch(() => {}); return; }
                  void navigator.clipboard?.writeText(url).then(() => {
                    setKopiert(true); window.setTimeout(() => setKopiert(false), 2000);
                  }).catch(() => {});
                }}
                className={`grid h-8 w-8 place-items-center rounded-full border transition active:scale-90 ${"border-white/20 text-white/60"}`}>
                {kopiert ? <Check className="h-4 w-4 text-[#f6cf51]" /> : <Share2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {kopiert && <p className={`mt-1.5 text-right text-[11px] font-bold text-[#f6cf51]`}>{S.linkKopiert}</p>}

          {/**
            * DER KÄMPFER ALS HINTERGRUND IST RAUS (09.09.2026, Owner am ChatGPT-Vergleich:
            * „statt der Roboter was da ist, jetzt kommt unsere Karte mit dem Film — also
            * rechts").
            *
            * Die frühere Fassung liess ihn als blasse Textur hinter der Schrift schweben —
            * genau die Bauart, die er beim Vergleich mit dem sauberen Zweispalter aus dem
            * gelieferten Entwurf verworfen hat. An seiner Stelle steht jetzt ECHTES Material:
            * derselbe Werbespot, den ein Kunde nach dem Klick sieht, in der Hauskarte mit
            * Titel und Schaltern statt als stumme Dekoration.
            */}
          <div className="mt-6 md:mt-10">
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-14">
          <div>
          <h1 className={`${T_HERO} text-white`}>
            {S.hookFrage}
            {/* DER GELBE AKZENT SITZT AUF DER STÄRKSTEN AUSSAGE (Owner 08.09.2026: „der gelbe
                Akzent in der linken Spalte fehlt"). Der zweite Satz ist die stärkere Hälfte —
                die eigene Seite ist ärgerlich, die fremde Anfrage ist teuer. Eigene Zeile,
                nie ein Umbruch mitten im Satz. */}
            {/* KLEINER ALS DIE ERSTE ZEILE (Owner 08.09.2026: „das kleiner bitte"). In gleicher
                Grösse waren es zwei Blöcke statt Aussage und Nachsatz — der gelbe Teil war
                kein Akzent mehr, sondern eine zweite Überschrift. Jetzt trägt Zeile eins die
                Lage, Zeile zwei setzt den Widerspruch dahinter. */}
            <span className={`mt-3 block ${T_HERO_2} text-[#f6cf51]`}>{S.hookFrage2}</span>
          </h1>
          <p className={`mt-5 ${T_SUB} text-white/80`}>{mitMarke(S.hookText)}</p>

          {/**
            * VIER KACHELN STATT VIER ZEILEN (Owner 08.09.2026: „Icons fehlen, fette grosse
            * Icons" · „Design ist alles").
            *
            * Hier stand eine Aufzählung an einem dünnen Strich — vier Sätze in derselben
            * Grösse, derselben Farbe, demselben Rhythmus wie alles darüber und darunter. So
            * entsteht eine Textwand: Man liest den ersten Satz und überfliegt den Rest.
            *
            * ALS KACHELN mit einem grossen Symbol ist jeder Satz ein eigener Gedanke, und
            * die Zahl davor gibt dem Ganzen eine Ordnung, die man ohne Lesen sieht. Die
            * Symbole sind dieselben wie im PDF, das der Kunde danach bekommt.
            */}
          <div className="mt-8">
            <p className={`${T_LABEL} text-[#f6cf51]`}>{S.argTitel}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { s: "ziel", z: S.argEins },
                { s: "werkzeug", z: S.argZwei },
                { s: "trichter", z: S.argDrei },
                { s: "bild", z: S.argVier },
              ].filter(k => k.z).map((k, i) => (
                <div key={k.z} className="rounded-2xl border border-white/12 bg-white/[0.045] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#f6cf51]"><VFIcon name={k.s} className="h-9 w-9" /></span>
                    <span className="text-[26px] font-black leading-none text-white/12">{i + 1}</span>
                  </div>
                  <p className={`mt-3 ${T_TEXT} text-white/80`}>{k.z}</p>
                </div>
              ))}
            </div>
          </div>

          {/* DIE PORTAL-ZEILE IST HIER RAUS (Owner 08.09.2026: „das soll eigentlich gar nicht
              hier erscheinen, weil das dynamisch ist — es kommt drauf an, was du willst").
              „Ohne OLX" war für jemanden, der Pflegekräfte sucht, das falsche Portal. Der
              Agent nennt es später, wenn er weiss, worum es geht. */}

          </div>

          {/* ── RECHTS: DIE KARTE, DANN DAS FELD ── */}
          <div className="mt-7 lg:mt-0">
          {/**
            * DIE HAUSKARTE MIT DEM SPOT (09.09.2026, hierher verschoben — Owner: „statt der
            * Roboter was da ist, jetzt kommt unsere Karte mit dem Film, also rechts").
            *
            * VORHER STAND SIE WEITER UNTEN, NACH DEM EINGABEFELD — dort blieb sie, jetzt
            * kommt sie zusätzlich hierher NICHT: Sie zieht ganz hierher um, denn zwei
            * Kopien derselben Karte auf einer Seite wären eine Dopplung, keine Betonung.
            * Hausregel `karten-fuer-videos`: nie ein nacktes `<video>`, immer die Hülle mit
            * Titel oben und den drei Schaltern. `madeBy={false}`, weil VersusForge unter
            * eigenem Namen auftritt — LuxuryBandit steht weiter unten im Was-ist-Block, als
            * Beleg, nicht als Absender über dem Angebot.
            */}
          <LandingKarte
            sprache={lang}
            titel={S.spotTitel}
            aufruf={S.spotAufruf}
            href="#start"
            teilenUrl="https://luxurybandit.com/themes/versusforge"
            teilenText={S.spotTeilen}
            madeBy={false}
            verhaeltnis="aspect-[13/16]"
            folien={[{ video: "/VersusForge/kaempfer-ads.mp4", poster: "/VersusForge/kaempfer-ads.webp" }]}
          />

          {/**
            * DUNKEL, MIT DEUTLICHEM RAND — NICHT WEISS (Owner 08.09.2026: erst „die ganze Box
            * weiss", nach dem Ansehen „das sieht nicht gut aus, das Eingabefeld geht unter,
            * mach es schwarz, damit die Verbindung zu den Chips da ist").
            *
            * Das Problem war nie die Helligkeit, sondern der KONTRAST: ein dunkles Feld in
            * einem dunklen Kasten ohne sichtbaren Rand. Weiss hat das gelöst und ein neues
            * erzeugt — die Box stand als Fremdkörper zwischen dunklem Hero und dunklen Chips,
            * und die Beispiele darunter gehörten optisch nicht mehr dazu, obwohl sie genau in
            * dieses Feld schreiben.
            *
            * Jetzt trägt das FELD einen deutlichen Rand statt einer anderen Farbe. Feld und
            * Chips sprechen dieselbe Sprache: dunkler Grund, heller Rand, Gold beim Anfassen.
            */}
          <div className="mt-6 rounded-3xl border border-white/15 lb-goldhauch p-4 md:p-5">
            {/**
              * DIE ZWEI KNÖPFE SIND RAUS (Owner 08.09.2026: „die brauchen wir nicht mehr, wir
              * haben die Beispiele unten").
              *
              * Sie verlangten eine Einordnung, bevor jemand einen Satz geschrieben hatte — und
              * die Einordnung steht ohnehin im Satz: „Wir brauchen Pflegekräfte" und „Ich
              * verkaufe Wohnungen" sind nicht zu verwechseln. Dieselbe Regel wie im Gespräch:
              * Was sich ableiten lässt, wird nicht gefragt ([[kein-token-fuer-abbrecher]]).
              *
              * `ziel` lebt weiter als stiller HINWEIS — ein angetipptes Beispiel setzt es mit.
              * Der Agent verlässt sich aber nicht darauf, sondern liest den Satz.
              */}
            {/**
              * DAS FELD IST WEISS (Owner 08.09.2026, mit Bild: „das hier geht unter, dieses
              * Feld weiss").
              *
              * Auf Schwarz war ein dunkles Feld in einem dunklen Kasten kaum zu sehen — und
              * es ist die EINE Stelle, an der jemand etwas tun soll. Ein Eingabefeld, das man
              * suchen muss, wird nicht benutzt.
              *
              * `hell` allein reichte NICHT: Der Schalter färbt in der CI nur die Schrift und
              * legt einen 4-%-Schleier darüber — auf Schwarz bleibt das Feld schwarz, und die
              * dunkle Schrift war danach unsichtbar. Die Fläche kommt deshalb als `style`,
              * das die CI zuletzt anwendet (`...rest.style`) und das damit sicher gewinnt;
              * eine zusätzliche Klasse wäre der Reihenfolge im erzeugten CSS ausgeliefert.
              */}
            <EingabeMehrzeilig zeilen={3} value={text} onChange={e => setText(e.target.value)}
              placeholder={platzhalter}
              /* KEINE SERIFENSCHRIFT (Owner 08.09.2026). Die CI setzt Eingabefelder
                 bewusst in Serifen — das passt zur Einladungskarte, nicht zu einer
                 Firmenseite. `inherit` nimmt die Schrift der Seite, statt eine zweite zu
                 wählen; über `style` gesetzt, weil die Klasse der CI sonst gewinnen könnte. */
              /* Der Rand ist der Unterschied, nicht die Fläche: 30 % Weiss steht auf Schwarz
                 deutlich da, ohne dass eine zweite Farbe ins Spiel kommt. */
              style={{ background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.30)", color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#fff", fontFamily: "inherit" }} />

            {/* DIE ADRESSE — bei einem Umbau am 08.09.2026 verlorengegangen und
                wiederhergestellt. Sie steht unter dem Feld und kleiner: Sie ist die Abkürzung
                für jemanden, der nicht schreiben will, nicht der Hauptweg. */}
            <label className="mt-3 block">
              <span className={`block ${T_KLEIN} text-white/45`}>{S.urlLabel}</span>
              <input type="url" inputMode="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder={S.urlPlatzhalter} autoComplete="url"
                className={`mt-1.5 w-full rounded-2xl border border-white/30 bg-white/[0.06] px-4 py-3 ${T_TEXT} text-white outline-none placeholder:font-medium placeholder:text-white/35 focus:border-[#f6cf51]`} />
            </label>

            {fehler && <p className="mt-2 text-[13px] font-bold text-red-400">{fehler}</p>}

            {/* DER SATZ ÜBER DEM KNOPF (Owner 08.09.2026). Er steht bewusst VOR dem Knopf
                und nicht als Fussnote: Er soll gelesen werden, bevor jemand losschickt —
                dann gibt er seinen einen Versuch nicht für einen Spass aus. */}
            {/* NUR WENN WIRKLICH KASSIERT WIRD. Solange der Kaufweg aus ist, wäre „jede
                weitere 9,99 €" schlicht unwahr — es sind fünf frei. Ein Preisversprechen,
                das die Maschine nicht einlöst, ist der teuerste Satz einer Seite. */}
            {VF_KAUF_AKTIV && (
              <p className={`mt-4 ${T_KLEIN} leading-relaxed text-white/50`}>
                <span className="font-black text-[#f6cf51]">{S.gratisTitel}</span>{" "}
                <span>{S.gratisText}</span>
              </p>
            )}

            <div className={VF_KAUF_AKTIV ? "mt-3" : "mt-4"}><Knopf art="gold" onClick={start}>{S.hookKnopf}</Knopf></div>

            <p className={`mt-4 ${T_KLEIN} text-white/45`}>{S.fragenAnkuendigung}</p>
            {/* DAS WERBEBUDGET STAND HIER UND IST WEG (Owner 08.09.2026: „das finde ich
                hier voll daneben").
                Am Knopf beantwortet es einen Einwand, den in diesem Moment niemand hat — wer
                anfangen will, liest dort eine Preisdiskussion. Der Satz steht jetzt in der
                Rechnung weiter unten, wo ohnehin von Geld die Rede ist. */}
          </div>

          {/**
            * BEISPIELE ZUM ANTIPPEN (Owner 08.09.2026).
            *
            * Sie stehen UNTER dem Feld, nicht darin: Im Feld wäre nur eines sichtbar, und
            * genau die Spannweite ist die Botschaft — Pflegeheim, Zahnarzt, Klimaanlagen,
            * Kosmetik, Wohnungen. Wer seine eigene Branche in der Reihe findet, weiss ohne
            * einen Satz Erklärung, dass er hier richtig ist.
            *
            * ANTIPPEN FÜLLT DAS FELD UND SETZT DEN KNOPF MIT. Ein Beispiel, das man
            * abtippen müsste, hilft niemandem; und die falsche Knopfstellung dazu wäre ein
            * Fehler, den der Besucher nicht sieht und der Agent nicht erklären kann.
            */}
          <p className={`mt-8 ${T_LABEL} text-white/40`}>{S.bspTitel}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {BEISPIELE.map(({ k, z }) => {
              const satz = S[k];
              if (!satz) return null;
              /* CHIP UND FELD SIND SYNCHRON (Owner 08.09.2026: „ein aktiver Chip muss seinen
                 Text ins Feld schreiben, und nur der Chip, dessen Text im Feld steht, ist
                 hervorgehoben").
                 Vorher war KEINER hervorgehoben — man sah nach dem Antippen nicht, welches
                 Beispiel im Feld stand, und wer danach eigene Worte tippte, hatte trotzdem
                 einen Chip vor Augen, der nichts mehr mit dem Feld zu tun hatte. Der Vergleich
                 läuft über den getrimmten Text, damit ein Leerzeichen die Hervorhebung nicht
                 abschaltet. */
              return (
                <button key={k} type="button"
                  onClick={() => { setZiel(z); setText(satz); setFehler(""); }}
                  aria-pressed={text.trim() === satz.trim()}
                  className={`rounded-full border px-4 py-2.5 ${T_TEXT} transition active:scale-95 ${
                    text.trim() === satz.trim()
                      ? "border-[#f6cf51] bg-[#f6cf51] text-[#1a160f]"
                      : "border-white/20 lb-goldhauch text-white/75 hover:border-[#f6cf51]/50 hover:text-white"}`}>
                  {satz}
                </button>
              );
            })}
          </div>

          </div>
          </div>
          </div>{/* Ende der Hülle mit dem Kämpfer */}


          {/* DIE HAUSKARTE MIT DEM SPOT STEHT JETZT OBEN IM HERO (09.09.2026) — sie zog in
              die rechte Spalte um, an die Stelle, an der vorher der Kämpfer als Hintergrund
              schwebte. Zwei Kopien derselben Karte wären eine Dopplung, keine Betonung. */}

          {/* ── DIE VERSUS-KARTE ──
              Schwarz auf Schwarz mit goldenem Rand: Sie ist kein Absatz im Fliesstext,
              sondern eine Aussage, die für sich steht — dafür sind Karten da. */}
          <div className="mt-10 rounded-3xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.04] p-6 md:mt-14 md:p-8">
            <p className={`${T_LABEL} text-[#f6cf51]`}>{S.versusKicker}</p>
            <h2 className={`mt-2.5 ${T_TITEL} text-white`}>{mitMarke(S.versusTitel)}</h2>
            <div className="mt-4 flex flex-col gap-3">
              {[S.versusEins, S.versusZwei, S.versusDrei].filter(Boolean).map(z => (
                <p key={z} className={`${T_TEXT} text-white/75`}>{z}</p>
              ))}
            </div>
            <p className={`mt-5 ${T_TEXT} font-black text-[#f6cf51]`}>{S.versusSchluss}</p>
          </div>

          {/* Erst die Rechnung (warum der übliche Weg teuer ist), dann das Dashboard (wie es
              aussieht, wenn es läuft). In dieser Reihenfolge, weil der Schmerz die
              Aufmerksamkeit erzeugt, die das Dashboard dann einlöst. */}
          <VersusForgeRechnung S={S} hell={hell} />

          <VersusForgeDashboard S={S} hell={hell} />

          {/* Der Abschnitt, den ein Prüfender sucht — und die einzige Stelle, an der
              LuxuryBandit steht: als Erbauer, nicht als Marke über dem Angebot. */}
          <div className={`mt-10 max-w-[640px] border-t pt-6 md:mt-16 border-white/10`}>
            <h2 className={`${T_TITEL} text-white`}>{mitMarke(S.wasTitel)}</h2>
            {/* SEIN GESICHT NEBEN SEINER VORSTELLUNG (Owner 08.09.2026: „die Leute wissen
                nicht, wer er ist"). Grösser als im Kopf: Hier lernt man ihn kennen, oben
                erkennt man ihn nur wieder. */}
            <div className="mt-4 flex items-start gap-4">
              <img src="/VersusForge/kaempfer-kopf.webp" alt="" aria-hidden
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-[#f6cf51]/70 md:h-24 md:w-24" />
              <p className={`${T_TEXT} text-white/75`}>{mitMarke(S.wasText)}</p>
            </div>
            <p className={`mt-3 ${T_TEXT} text-white/70`}>{mitMarke(S.wasZwei)}</p>
            <p className={`mt-5 ${T_KLEIN} text-white/40`}>{S.wasVon}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
