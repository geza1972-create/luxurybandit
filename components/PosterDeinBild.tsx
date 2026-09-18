"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ImageUp, Sparkles, X } from "lucide-react";
import { Scheibe } from "@/components/CI";
import { EigenesContext } from "@/components/PosterGross";
import ImageCropper from "@/components/ImageCropper";
import { POSTER, POSTER_VERHAELTNIS } from "@/lib/lakatosbandi-poster";

/**
 * DER KUNDE IM POSTER — SCHRITT 1: SEIN FOTO (Owner 17.09.2026: „zuerst ‚your picture‘ ersetzt
 * nur das bild, dann steht ‚generate art‘" · „und wird beim ersten schritt nix generiert").
 *
 * ── WAS HIER PASSIERT UND WAS NICHT ─────────────────────────────────────────────────────────
 *
 * Er wählt ein Foto, schneidet es zu, und es steht IM Poster — an der Stelle des Werks, im
 * selben Blatt, mit Titel, Satz und Code drum herum. Erzeugt wird dabei nichts: kein Modell
 * läuft, nichts kostet. Das ist die ganze Absicht des ersten Schritts (Owner: „kann sein dass
 * leute sogar nur das printen wollen, was eigenes") — wer nur sein eigenes Bild gedruckt haben
 * will, ist hier schon fertig.
 *
 * Erst danach heisst der Knopf „GENERATE ART" und macht daraus Kunst im Stil des Werks — das
 * kostet 1 € extra und läuft erst nach der Zahlung (Owner 17.09.2026). Deshalb steht in diesem
 * Bauteil KEIN Modellaufruf: die Kasse gehört nicht in den Knopf, der das Foto einsetzt.
 *
 * ── WYSIWYG, KEINE ZWEITE SEITE (Hausregel) ─────────────────────────────────────────────────
 *
 * Auswählen, Zuschneiden und Ansehen passieren auf dem Blatt, auf dem er bestellt. Der
 * Zuschnitt läuft im Seitenverhältnis des BILDFELDS dieses Posters (aus `lakatosbandi-poster.ts`
 * gerechnet, nicht getippt) — was er im Ausschnitt sieht, ist, was gedruckt wird.
 *
 * ── DIE UPLOAD-PFLICHTEN (Skill `upload-foto`) ──────────────────────────────────────────────
 *
 * 1 Speichern-Knopf: nichts rutscht von allein hinein — `ImageCropper` hat Speichern/Abbrechen.
 * 2 Zuschnitt: immer, im festen Verhältnis (siehe oben).
 * 3 Löschen: sichtbar an der Kachel — hier das Kreuz oben rechts auf dem Foto.
 */
/** Was der Zuschnitt und die Druckdatei lesen können — dieselbe Liste wie im Bildlager. */
const ERLAUBT = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Stand je Kachel, solange die Seite lebt — siehe `merker` in der Komponente. */
const MERKER = new Map<string, { original: string | null; foto: string | null }>();

export default function PosterDeinBild({ children, knopf, erzeugen, warten, sprache, mandant, werk, aus = false }: {
  /** Das Werk des Künstlers — steht hier, solange der Kunde kein Foto gewählt hat. */
  children: React.ReactNode;
  /** „You as a picture" — der Name des Knopfes, in jeder Sprache derselbe. */
  knopf: string;
  /** „Generate art" — Schritt 2, sobald sein Foto liegt. */
  erzeugen: string;
  /** Was während des Laufs dasteht — ein Wort, kein blosser Kreisel (CI-Regel). */
  warten: string;
  sprache?: string;
  /**
   * Das Werk ist als Vorlage abgeschaltet (`werkInfo[n].kunst === false`) — dann steht hier nur
   * das Werk, ohne Knopf und ohne Feld. Owner 17.09.2026, am „Schrei": „glaubst du der prompt
   * würde hier gehen?" — nein; ein Knopf, der Unsinn erzeugt, ist schlimmer als keiner.
   */
  aus?: boolean;
  /** Wer und welches Werk — daraus holt der Server die Stilvorlage. */
  mandant: string;
  werk: string;
}) {
  /**
   * ZWEI ZUSTÄNDE, NICHT EINER (17.09.2026 gemessen: `400 in 88ms`).
   *
   * `original` ist, was er hochgeladen hat; `foto` ist, was im Blatt steht — nach einer
   * Erzeugung also das Gemälde. Vorher war beides dasselbe Feld, und der zweite Versuch schickte
   * das ERZEUGTE Bild als Vorlage: einmal von der Route abgewiesen, und selbst wenn nicht, wäre
   * es eine Erzeugung aus einer Erzeugung — mit jedem Versuch weiter weg vom Menschen.
   * Jeder Versuch geht deshalb vom Originalfoto aus.
   */
  /**
   * ÜBERLEBT EINEN NEUAUFBAU, NICHT EIN NEULADEN (17.09.2026 gemessen: nach einem erfolgreichen
   * Lauf frischte der Dev-Server die Seite per RSC auf, die Kachel wurde neu aufgebaut, und das
   * fertige Bild war weg — 45 Sekunden und ein bezahlter Lauf für nichts).
   *
   * Der Merker liegt auf Modulebene, je Kachel (Künstler + Werk): Baut React die Kachel neu auf,
   * liest sie ihren Stand von dort. Lädt der Kunde die Seite neu oder geht weg, ist das Modul weg
   * — und damit das Bild. Genau die Regel des Owners („wenn er rausgeht von der seite, dann ist
   * das bild weg"), nur ohne die Lücke dazwischen. Kein Speicher, kein Konto, nichts auf dem
   * Server.
   */
  const merker = MERKER.get(`${mandant}/${werk}`);
  const [original, setOriginal] = useState<string | null>(merker?.original ?? null);
  const [foto, setFoto] = useState<string | null>(merker?.foto ?? null);
  /* Titel und Stilzeile richten sich danach, ob SEIN Bild drin ist (siehe `EigenesContext`). */
  const { setEigenes } = useContext(EigenesContext);
  useEffect(() => { setEigenes(!!original); }, [original, setEigenes]);
  useEffect(() => {
    if (original || foto) MERKER.set(`${mandant}/${werk}`, { original, foto });
    else MERKER.delete(`${mandant}/${werk}`);
  }, [mandant, werk, original, foto]);
  const [zuschneiden, setZuschneiden] = useState<File | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [absage, setAbsage] = useState("");
  /**
   * ── VORHER / NACHHER (Owner 17.09.2026: „einen schieberegler der das original langsam über
   * deine zeichnung legt — dann sehen wir, wie falsch das ganze ist" · nach dem Ausbau: „ich
   * brauche den schieberegler für vorher und nachher wieder") ────────────────────────────────
   *
   * Ob Gesicht, Brille, Haltung wirklich stimmen, sieht man erst, wenn das Foto darüberliegt und
   * man es einblendet: Wo sich die Linien decken, ist die Zeichnung richtig; wo sie springen,
   * hat das Modell erfunden. 0 = nur Zeichnung, 1 = nur Foto. Steht anfangs auf der Zeichnung.
   * Erste Fassung war „zu klein für einen finger" — jetzt 4,5 cqw Trefffläche.
   */
  const [mischung, setMischung] = useState(0);
  /* Der Platz unter dem Bild (`lb-poster-unter-bild` in Poster.tsx) — nach dem Aufbau über das
     eigene Blatt gesucht, damit sich zwei Poster nicht in die Quere kommen. */
  const marke = useRef<HTMLSpanElement>(null);
  const [platz, setPlatz] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPlatz(marke.current?.closest(".lb-poster-karte")?.querySelector<HTMLElement>(".lb-poster-unter-bild") ?? null);
  }, []);
  const feld = useRef<HTMLInputElement>(null);

  /* „GENERATE ART" — sein Foto im Stil dieses Werks. Noch ohne Kasse (Owner 17.09.2026: „mach
     mal erst mal gratis"); der Aufpreis kommt davor, bevor das live geht. */
  async function kunstHolen() {
    if (!original || laeuft) return;
    setLaeuft(true);
    setAbsage("");
    try {
      const res = await fetch("/api/poster-kunst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foto: original, mandant, werk }),
      });
      const daten = await res.json().catch(() => null) as { bild?: string; fehler?: string } | null;
      if (res.ok && daten?.bild) setFoto(daten.bild);
      /* Auf dem Blatt ist alles Englisch (You as a picture · Generate art · Before/After) — die
         Meldungen auch, sonst spricht der Knopf eine andere Sprache als seine Antwort. */
      else setAbsage(daten?.fehler === "abgelehnt" ? "This picture isn't allowed." : "Didn't work — try again.");
    } catch {
      setAbsage("Didn't work — try again.");
    } finally {
      setLaeuft(false);
    }
  }

  /* Das Seitenverhältnis des Bildfelds: Blattbreite ohne Rand zu Feldhöhe. Dieselben Zahlen,
     aus denen das Blatt und die Druckdatei entstehen — ändert sich das Raster, ändert sich der
     Ausschnitt mit. */
  const verhaeltnis = (100 - 2 * POSTER.rand) / (POSTER.bild.hoch * POSTER_VERHAELTNIS);

  /* Abgeschaltet: das Werk steht da wie ohne dieses Bauteil — kein Knopf, kein Feld, kein
     Zustand. Nach allen Haken, damit die Reihenfolge der Hooks gleich bleibt. */
  if (aus) return <>{children}</>;

  return (
    <>
      {foto ? (
        <span className="relative block h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="" className="block h-full w-full object-cover" />
          {original && foto !== original ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={original} alt="" aria-hidden
              className="pointer-events-none absolute inset-0 block h-full w-full object-cover"
              style={{ opacity: mischung }} />
          ) : null}

          {/* Pflicht 3 des Upload-Skills: der Löschknopf steht sichtbar an der Kachel, nicht in
              einem Menü. Weg damit heisst: das Werk des Künstlers steht wieder da.
              Die `Scheibe` aus der Bibliothek ist genau dieser Knopf: weiss, auf einem Bild
              liegend (Skill `ci-design`) — mit `groesse` in `cqw`, damit sie mit dem Blatt
              wächst statt in Pixeln danebenzustehen. */}
          {/* ── SPEICHERN (Owner 17.09.2026: „das nimmst du als masterbild" — das Bild lebt nur im
              Browser; ohne diesen Knopf kommt es nirgends hin) ─────────────────────────────────
              Unten rechts, links neben dem Vergrössern-Knopf: lädt das erzeugte Bild in voller
              Auflösung herunter. Nur wenn ein ERZEUGTES Bild da ist — das eigene Foto hat er ja. */}
          {foto !== original ? (
            <span className="absolute" style={{ right: "9.5cqw", bottom: "2cqw" }}>
              <Scheibe label="Save" groesse="6cqw"
                onClick={e => {
                  e?.preventDefault(); e?.stopPropagation();
                  const a = document.createElement("a");
                  a.href = foto; a.download = `${mandant}-${werk}-art.jpg`;
                  document.body.appendChild(a); a.click(); a.remove();
                }}>
                <Download style={{ width: "50%", height: "50%" }} aria-hidden />
              </Scheibe>
            </span>
          ) : null}

          <span className="absolute right-[2cqw] top-[2cqw]">
            <Scheibe label="×" groesse="6cqw"
              onClick={e => { e?.preventDefault(); e?.stopPropagation(); setFoto(null); setOriginal(null); }}>
              <X style={{ width: "55%", height: "55%" }} aria-hidden />
            </Scheibe>
          </span>
        </span>
      ) : children}

      {/* ── SICHTBAR ARBEITEN (Owner 17.09.2026: „man sieht es nicht dass es arbeitet") ────────
          Der Lauf dauert 10–40 Sekunden. Ohne Zeichen hält das niemand aus: Er klickt noch
          einmal (und zahlt doppelt) oder lädt neu — und beim Neuladen ist alles weg, weil das
          Bild nur im Browser lebt. Genau das ist am 17.09.2026 passiert.
          Deshalb liegt während des Laufs eine Decke über dem Werk, mit WORT, nicht nur einem
          Kreisel (CI-Regel). */}
      {laeuft ? (
        <span className="absolute inset-0 z-[2] flex flex-col items-center justify-center"
          style={{ background: "rgba(20,16,10,.55)", backdropFilter: "blur(2px)" }}>
          <span className="block animate-spin rounded-full border-solid border-white/30 border-t-white"
            style={{ width: "9cqw", height: "9cqw", borderWidth: "1cqw" }} aria-hidden />
          <span className="mt-[3cqw] font-sans text-white"
            style={{ fontSize: `${POSTER.text.breit * 1.1}cqw`, letterSpacing: "0.06em" }}>
            {warten}
          </span>
        </span>
      ) : null}

      <span ref={marke} hidden aria-hidden />
      {platz && original && foto && foto !== original && !laeuft ? createPortal(
        /* Genau in der Lücke zwischen Bild und Name, schwarz auf Papier; `z-[4]` über dem weissen
           Textstreifen (der Rahmen-Schatten liegt auf 3). Original LINKS, Zeichnung rechts. */
        <label className="absolute left-1/2 z-[4] flex items-center font-sans"
          onClick={e => e.stopPropagation()}
          style={{
            top: "-0.3cqw", transform: "translateX(-50%)",
            width: "62%", gap: "1.4cqw", fontSize: `${POSTER.text.breit * 0.85}cqw`,
            lineHeight: 1, letterSpacing: "0.08em", color: POSTER.farben.tinte,
          }}>
          {/* „Before / After" statt „Photo / Art" (Owner 17.09.2026) — Vorher links, Nachher rechts. */}
          <span className="shrink-0 uppercase">Before</span>
          <input type="range" min={0} max={100} value={Math.round((1 - mischung) * 100)}
            aria-label="Original über der Zeichnung"
            onChange={e => setMischung(1 - Number(e.target.value) / 100)}
            onPointerDown={e => e.stopPropagation()}
            className="lb-poster-regler w-full" />
          <span className="shrink-0 uppercase">After</span>
        </label>,
        platz,
      ) : null}

      {/* Der Knopf liegt AUF dem Werk (Owner 17.09.2026: „du machst den button übers bild") und
          wechselt seinen Namen, sobald das Foto liegt. */}
      <button type="button" disabled={laeuft}
        onClick={e => {
          e.preventDefault(); e.stopPropagation();
          if (foto) { void kunstHolen(); return; }
          feld.current?.click();
        }}
        className="lb-poster-knopf absolute left-1/2 font-sans"
        style={{
          bottom: `${POSTER.luft * 1.5}cqw`, transform: "translateX(-50%)",
          fontSize: `${POSTER.text.breit * 1.15}cqw`, letterSpacing: "0.08em",
          whiteSpace: "nowrap",
        }}>
        {foto
          ? <Sparkles style={{ width: "1.15em", height: "1.15em" }} aria-hidden />
          : <ImageUp style={{ width: "1.15em", height: "1.15em" }} aria-hidden />}
        {laeuft ? "…" : (foto ? erzeugen : knopf)}
      </button>

      {/* Eine Absage sagt, WAS los ist — nicht „Fehler". Sie steht auf dem Werk, wo der Knopf
          steht, und verschwindet beim nächsten Versuch. */}
      {absage ? (
        <span className="absolute left-1/2 font-sans"
          style={{
            bottom: `${POSTER.luft * 5}cqw`, transform: "translateX(-50%)",
            fontSize: `${POSTER.text.breit}cqw`, color: "#fff",
            background: "rgba(20,16,10,.82)", padding: "0.6cqw 1.8cqw", borderRadius: "999px",
            whiteSpace: "nowrap",
          }}>{absage}</span>
      ) : null}

      {/* Kein stiller Upload beim Auswählen: die Datei geht in den Zuschnitt, nicht auf den
          Server (Pflicht 1). */}
      {/* `onClick` hält den Klick HIER an: `feld.click()` erzeugt ein eigenes Ereignis, das
          sonst weiter nach oben läuft und die Grossansicht öffnet, statt den Dateiwähler zu
          zeigen (17.09.2026 gemessen — der Knopf „tat nichts"). */}
      <input ref={feld} type="file" accept="image/*" hidden
        onClick={e => e.stopPropagation()}
        onChange={e => {
          const d = e.target.files?.[0];
          e.target.value = "";
          if (!d) return;
          /* ── FALSCHES FORMAT SAGT ES LAUT (Owner 17.09.2026: „es muss eine fehlermeldung kommen
             wenn unerlaubte formate hochgeladen werden") ─────────────────────────────────────
             `accept` hält nicht jeden Wähler ab (HEIC vom iPhone, PDF, Video). Vorher lief so
             eine Datei stumm in den Zuschnitt und dort ins Leere — der Kunde sah nichts und
             dachte, der Knopf sei kaputt. Erlaubt ist, was der Zuschnitt und der Druck lesen:
             JPG, PNG, WebP; und nichts über 20 MB. */
          if (!ERLAUBT.has(d.type)) { setAbsage("Only JPG, PNG or WebP."); return; }
          if (d.size > 20 * 1024 * 1024) { setAbsage("Max. 20 MB."); return; }
          setAbsage("");
          setZuschneiden(d);
        }} />

      {zuschneiden ? (
        <ImageCropper
          file={zuschneiden}
          aspect={verhaeltnis}
          sprache={sprache}
          onCancel={() => setZuschneiden(null)}
          onSave={(_datei, vorschau) => { setOriginal(vorschau); setFoto(vorschau); setZuschneiden(null); }}
        />
      ) : null}
    </>
  );
}
