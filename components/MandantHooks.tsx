"use client";

import type { DashboardTexte } from "@/lib/dashboard-texte";

import { useState } from "react";
import { Trash2, Download, Sparkles, ImageIcon, Plus } from "lucide-react";

/**
 * DIE HOOKS (Owner 09.09.2026: „ich brauche noch einen Punkt für Hooks, dort sehe ich meine
 * Bilder, dort kann ich weitere generieren").
 *
 * ── ERST TEXT, DANN BILD (Owner 09.09.2026, zweite Runde) ──────────────────────────────────
 *
 * „Die müssen erst mal als Text generiert werden. Also es müsste einen Button geben, der
 * immer wieder einen neuen Hook erstellt, textlich, dann sage ich entweder löschen oder Bild
 * generieren."
 *
 * ER HAT RECHT, UND MEIN ERSTER AUFBAU WAR FALSCH HERUM: Ein Hook steht oder fällt mit dem
 * SATZ. Wer zuerst ein Bild sieht, beurteilt Schrift, Umbruch und Farbe — und merkt erst
 * danach, dass der Satz nichts taugt. Als Text allein ist er in zwei Sekunden verworfen.
 *
 * DESHALB IST DIE LISTE EINE TEXTLISTE. Das Bild ist ein Zustand, den er je Zeile öffnet, und
 * er bleibt offen, bis er ihn wieder zumacht. Kein Modellaufruf steckt darin — das Bild
 * entsteht aus dem Satz (`hookBild`: Schrift auf Fläche) und kostet nichts.
 *
 * FÜNF SIND DAS ZIEL (Owner: „für 299 müssen wir mindestens 5 erstellen") — deshalb steht der
 * Stand oben als Zeile, nicht als Fussnote. Wer sieht, dass zwei von fünf stehen, klickt
 * weiter; wer nur eine Liste sieht, hört nach dem zweiten auf.
 *
 * SELBST SCHREIBEN GEHT WEITER. Die Maschine schlägt vor, aber der beste Hook kommt oft aus
 * dem Satz, den er selbst am Telefon sagt.
 */
export default function MandantHooks({ mandant, k, planHook, hooks: start , T}: {
  mandant: string; k: string; planHook: string; hooks: string[];
  /** Die Texte in der Sprache des Mandanten. */
  T: DashboardTexte;
}) {
  const [hooks, setHooks] = useState<string[]>(start);
  const [neu, setNeu] = useState("");
  const [eigenesOffen, setEigenesOffen] = useState(false);
  const [laeuft, setLaeuft] = useState<"" | "modell" | "eigen" | "weg">("");
  const [fehler, setFehler] = useState("");
  /* Welche Bilder gerade offen sind — `-1` ist der Hook aus der Analyse. */
  const [gezeigt, setGezeigt] = useState<Set<number>>(new Set());
  /* Zwei Tipps, rot — nie ein Browser-Fenster ([[loeschen-zwei-tipps-rot]]). */
  const [sicher, setSicher] = useState<number | null>(null);

  const gesamt = hooks.length + (planHook ? 1 : 0);
  const ZIEL = 5;

  const umschalten = (i: number) =>
    setGezeigt(alt => {
      const n = new Set(alt);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });

  const rufen = async (adresse: string, koerper: Record<string, unknown>, art: "modell" | "eigen" | "weg") => {
    setLaeuft(art); setFehler("");
    try {
      const res = await fetch(adresse, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, ...koerper }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? T.fehler)); return false; }
      setHooks(Array.isArray(d.hooks) ? (d.hooks as string[]) : []);
      /* Nach jeder Änderung verschieben sich die Nummern — offene Bilder zumachen, sonst
         steht ein Bild unter dem falschen Satz. */
      setGezeigt(new Set());
      return true;
    } catch {
      setFehler(T.fehler);
      return false;
    } finally { setLaeuft(""); }
  };

  const bildAdresse = (i: number) =>
    `/api/versusforge-bild?m=${encodeURIComponent(mandant)}${i < 0 ? "" : `&i=${i}`}`;

  return (
    <div className="flex flex-col gap-5">
      {/* ── DER GENERATOR ── */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(20,24,28,.06),0_8px_28px_rgba(20,24,28,.07)] md:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{T.hooksTitel}</h2>
          {/* DER STAND, NICHT ALS FUSSNOTE. „2 von 5" bewegt; eine Liste allein nicht. */}
          <span className={`text-[14.5px] font-bold ${gesamt >= ZIEL ? "text-[#1a7f4b]" : "text-[#8b959d]"}`}>
            {gesamt} von {ZIEL}
          </span>
        </div>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
          Ein Hook ist ein Satz, der jemanden anhält. Erst schreiben, dann ansehen — welcher
          zieht, entscheidet der Satz, nicht das Bild. Fünf gehören zu deinem Paket, damit du
          sie gegeneinander testen kannst.
        </p>

        {fehler && <p className="mt-4 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {/* DER EINE GEFÜLLTE KNOPF (CI-Regel). Er kostet einen Modellaufruf — deshalb sagt
              er auch, dass er nachdenkt, und nicht nur „lädt". */}
          <button
            type="button"
            disabled={!!laeuft}
            onClick={() => void rufen("/api/versusforge-hook-neu", {}, "modell")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1d6fd0] px-6 py-3.5 text-[16px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-50"
          >
            <Sparkles className="h-[18px] w-[18px]" aria-hidden />
            {laeuft === "modell" ? T.schreibt : T.neuerHook}
          </button>
          <button
            type="button"
            onClick={() => setEigenesOffen(o => !o)}
            className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#1d6fd0]"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Selbst schreiben
          </button>
        </div>

        {eigenesOffen && (
          <div className="mt-4 rounded-xl bg-[#f5f7f9] p-4">
            <textarea
              rows={2}
              value={neu}
              onChange={e => { setNeu(e.target.value); if (fehler) setFehler(""); }}
              placeholder={T.hookPlatzhalter}
              autoFocus
              className="w-full resize-none rounded-xl border-[1.5px] border-[#dfe4e9] bg-white px-4 py-3.5 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!!laeuft || neu.trim().length < 12}
                onClick={async () => {
                  if (await rufen("/api/versusforge-hooks", { hook: neu.trim() }, "eigen")) {
                    setNeu(""); setEigenesOffen(false);
                  }
                }}
                className="rounded-xl border-[1.5px] border-[#1d6fd0] bg-white px-5 py-3 text-[15px] font-extrabold text-[#1d6fd0] disabled:opacity-40"
              >
                {laeuft === "eigen" ? T.moment : T.hinzufuegen}
              </button>
              {/* Der Zähler warnt, bevor der Satz im Bild zu klein wird. */}
              <span className={`text-[13.5px] font-bold ${neu.length > 120 ? "text-[#c02626]" : "text-[#8b959d]"}`}>
                {neu.length} Zeichen{neu.length > 120 ? " — im Bild wird das klein" : ""}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── DIE LISTE: TEXTE, BILD AUF WUNSCH ── */}
      {gesamt === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(20,24,28,.06),0_8px_28px_rgba(20,24,28,.07)] md:p-7">
          <p className="m-0 text-[15px] leading-[1.5] text-[#5b666f]">
            Noch kein Hook. Lass oben einen schreiben — oder schreib selbst einen.
          </p>
        </div>
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {planHook && (
            <Zeile
              T={T}
              satz={planHook}
              etikett={T.ausAnalyse}
              offen={gezeigt.has(-1)}
              umschalten={() => umschalten(-1)}
              bild={bildAdresse(-1)}
              dateiname={`${mandant}-hook.jpg`}
            />
          )}
          {hooks.map((h, i) => (
            <Zeile
              T={T}
              key={`${i}-${h}`}
              satz={h}
              offen={gezeigt.has(i)}
              umschalten={() => umschalten(i)}
              bild={bildAdresse(i)}
              dateiname={`${mandant}-hook-${i + 1}.jpg`}
              loeschen={{
                sicher: sicher === i,
                fragen: () => setSicher(i),
                machen: async () => { await rufen("/api/versusforge-hooks", { was: "weg", nr: i }, "weg"); setSicher(null); },
                laeuft: !!laeuft,
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Ein Hook als Zeile: der Satz, darunter die zwei Entscheidungen.
 *
 * DER SATZ IST GROSS UND STEHT ALLEIN. Er ist das, was beurteilt wird — nicht eine
 * Beschriftung neben einer Vorschau.
 */
function Zeile({ satz, etikett, offen, umschalten, bild, dateiname, loeschen, T }: {
  satz: string; etikett?: string; offen: boolean; umschalten: () => void;
  bild: string; dateiname: string;
  loeschen?: { sicher: boolean; fragen: () => void; machen: () => void; laeuft: boolean };
  /** Die Texte in der Sprache des Mandanten. */
  T: DashboardTexte;
}) {
  return (
    <li className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(20,24,28,.06),0_8px_28px_rgba(20,24,28,.07)] md:p-6">
      {etikett && (
        <span className="text-[12px] font-black uppercase tracking-[0.16em] text-[#1d6fd0]">{etikett}</span>
      )}
      <p className={`m-0 text-[19px] font-extrabold leading-[1.3] tracking-[-0.01em] md:text-[21px] ${etikett ? "mt-2" : ""}`}>
        {satz}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={umschalten}
          className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[#1d6fd0]"
        >
          <ImageIcon className="h-4 w-4" aria-hidden />
          {offen ? T.bildZu : T.bildBauen}
        </button>
        {loeschen && (
          <button
            type="button"
            disabled={loeschen.laeuft}
            onClick={() => (loeschen.sicher ? loeschen.machen() : loeschen.fragen())}
            className={`inline-flex items-center gap-1.5 text-[14.5px] font-bold transition disabled:opacity-50 ${
              loeschen.sicher ? "text-[#c02626]" : "text-[#8b959d] hover:text-[#c02626]"}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {loeschen.sicher ? T.wirklichLoeschen : T.loeschen}
          </button>
        )}
      </div>

      {offen && (
        <div className="mt-4">
          {/* Keine runden Ecken am Bild (Owner 09.09.2026) — es ist die Fläche, die er
              postet, und dort hat sie keine. Die Breite ist begrenzt: 1080 × 1350 über die
              ganze Karte gezogen wäre eine Wand, durch die er scrollen muss. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bild}
            alt={satz}
            loading="lazy"
            className="block w-full max-w-[320px] bg-[#f5f7f9] shadow-[0_6px_22px_rgba(20,24,28,.14)]"
            style={{ aspectRatio: "1080 / 1350" }}
          />
          <a href={bild} download={dateiname}
            className="mt-3 inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[#1d6fd0]">
            <Download className="h-4 w-4" aria-hidden />
            Herunterladen · 1080 × 1350
          </a>
        </div>
      )}
    </li>
  );
}
