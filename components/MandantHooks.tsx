"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Download } from "lucide-react";

/**
 * DIE HOOKS (Owner 09.09.2026: „ich brauche noch einen Punkt für Hooks, dort sehe ich meine
 * Bilder, dort kann ich weitere generieren").
 *
 * ── WAS EIN HOOK HIER IST ──────────────────────────────────────────────────────────────────
 *
 * Ein Satz — und das Bild dazu, fertig zum Posten auf Instagram und Facebook. Der Satz ist
 * die Quelle, das Bild die Ausgabe: Gespeichert wird nur der Satz, gezeichnet wird bei jedem
 * Aufruf neu (`hookBild`: Schrift auf Fläche). Deshalb kostet ein zweiter, dritter, zehnter
 * Hook nichts, und deshalb sehen alte Hooks nach einem Gestaltungswechsel nicht alt aus.
 *
 * ER SCHREIBT SIE SELBST, DIE MASCHINE SCHLÄGT NICHT VOR. Das ist keine Sparmassnahme,
 * sondern die richtige Reihenfolge: Der erste Hook kam aus der Analyse und steht oben. Was
 * jetzt fehlt, ist das Probieren — zehn Varianten desselben Gedankens, bis eine sitzt. Dafür
 * ein Modell zu fragen wäre langsamer als tippen und kostet bei jedem Versuch Geld
 * ([[kein-token-fuer-abbrecher]]). Ein „von der Engine vorschlagen lassen" ist ein eigener,
 * bezahlter Knopf — wenn er ihn will.
 *
 * DER ERSTE HOOK LÄSST SICH NICHT LÖSCHEN: Er steht im Plan und auf seiner Anzeigen-Seite.
 * Ihn hier wegzuwerfen hiesse, an einer Stelle etwas zu entfernen, das an zwei anderen
 * weiterlebt.
 */
export default function MandantHooks({ mandant, k, planHook, hooks: start }: {
  mandant: string; k: string; planHook: string; hooks: string[];
}) {
  const router = useRouter();
  const [hooks, setHooks] = useState<string[]>(start);
  const [neu, setNeu] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  /* Zwei Tipps, rot — nie ein Browser-Fenster ([[loeschen-zwei-tipps-rot]]). */
  const [sicher, setSicher] = useState<number | null>(null);

  const rufen = async (koerper: Record<string, unknown>) => {
    setLaeuft(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, ...koerper }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Das ging gerade nicht.")); return false; }
      setHooks(Array.isArray(d.hooks) ? (d.hooks as string[]) : []);
      /* Die Bilder holt der Server — nach einer Änderung muss die Seite neu zeichnen, sonst
         zeigt der Browser das alte Bild aus seinem Zwischenspeicher. */
      router.refresh();
      return true;
    } catch {
      setFehler("Das ging gerade nicht. Bitte noch einmal.");
      return false;
    } finally { setLaeuft(false); }
  };

  const bildAdresse = (i: number | null) =>
    `/api/versusforge-bild?m=${encodeURIComponent(mandant)}${i === null ? "" : `&i=${i}`}`;

  return (
    <div className="flex flex-col gap-5">
      {/* ── SCHREIBEN: ganz oben, weil das der Grund ist, warum er hier ist ── */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(20,24,28,.06),0_8px_28px_rgba(20,24,28,.07)] md:p-7">
        <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">Neuer Hook</h2>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
          Ein Satz, der jemanden anhält. Er steht gleich so im Bild — schreib ihn, wie du ihn
          sagen würdest. Das Bild ist sofort fertig und kostet nichts.
        </p>
        <textarea
          rows={3}
          value={neu}
          onChange={e => { setNeu(e.target.value); if (fehler) setFehler(""); }}
          placeholder="Ein fester Zahn in einem Termin — geht das bei dir?"
          className="mt-4 w-full resize-none rounded-xl border-[1.5px] border-[#dfe4e9] bg-white px-4 py-3.5 text-[16px] leading-[1.45] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
        />
        {/* Der Zähler warnt, bevor der Satz im Bild zu klein wird — `hookBild` verkleinert
            die Schrift, bis er passt, und irgendwann liest ihn niemand mehr im Vorbeiscrollen. */}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={`text-[13.5px] font-bold ${neu.length > 120 ? "text-[#c02626]" : "text-[#8b959d]"}`}>
            {neu.length} Zeichen{neu.length > 120 ? " — im Bild wird das klein" : ""}
          </span>
        </div>
        {fehler && <p className="mt-3 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}
        <button
          type="button"
          disabled={laeuft || neu.trim().length < 12}
          onClick={async () => { if (await rufen({ hook: neu.trim() })) setNeu(""); }}
          className="mt-4 rounded-xl bg-[#1d6fd0] px-7 py-3.5 text-[16px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-40"
        >
          {laeuft ? "Einen Moment …" : "Bild bauen"}
        </button>
      </div>

      {/* ── DIE BILDER ── */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(20,24,28,.06),0_8px_28px_rgba(20,24,28,.07)] md:p-7">
        <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">Deine Bilder</h2>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
          1080 × 1350 — das Hochformat für Instagram und Facebook. Lade eins herunter und
          poste es; als Ziel gibst du die Adresse deines Trichters an.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {planHook && (
            <Bild
              adresse={bildAdresse(null)}
              satz={planHook}
              etikett="Aus deiner Analyse"
              dateiname={`${mandant}-hook.jpg`}
            />
          )}
          {hooks.map((h, i) => (
            <Bild
              key={`${i}-${h}`}
              adresse={bildAdresse(i)}
              satz={h}
              dateiname={`${mandant}-hook-${i + 1}.jpg`}
              loeschen={{
                sicher: sicher === i,
                fragen: () => setSicher(i),
                machen: async () => { await rufen({ was: "weg", nr: i }); setSicher(null); },
                laeuft,
              }}
            />
          ))}
        </div>

        {!planHook && hooks.length === 0 && (
          <p className="mt-5 text-[15px] leading-[1.5] text-[#5b666f]">
            Noch kein Hook. Schreib oben einen — das Bild ist sofort da.
          </p>
        )}
      </div>
    </div>
  );
}

/** Ein Bild mit seinem Satz darunter. */
function Bild({ adresse, satz, etikett, dateiname, loeschen }: {
  adresse: string; satz: string; etikett?: string; dateiname: string;
  loeschen?: { sicher: boolean; fragen: () => void; machen: () => void; laeuft: boolean };
}) {
  return (
    <figure className="m-0">
      {/* Keine runden Ecken am Bild (Owner 09.09.2026) — es ist die Fläche, die er postet,
          und dort hat sie keine. Der Schatten hebt sie ab, ohne sie zu beschneiden. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={adresse}
        alt={satz}
        loading="lazy"
        className="block w-full bg-[#f5f7f9] shadow-[0_6px_22px_rgba(20,24,28,.14)]"
        style={{ aspectRatio: "1080 / 1350" }}
      />
      <figcaption className="mt-3">
        {etikett && (
          <span className="text-[12px] font-black uppercase tracking-[0.16em] text-[#1d6fd0]">{etikett}</span>
        )}
        <p className={`m-0 text-[15px] font-semibold leading-[1.45] ${etikett ? "mt-1.5" : ""}`}>{satz}</p>
        <div className="mt-2.5 flex items-center gap-4">
          {/* `download` an einem Link auf unsere eigene Route — kein Umweg über den Browser-
              Speicher, und der Dateiname sagt, wozu die Datei gehört. */}
          <a href={adresse} download={dateiname}
            className="inline-flex items-center gap-1.5 text-[14.5px] font-bold text-[#1d6fd0]">
            <Download className="h-4 w-4" aria-hidden />
            Herunterladen
          </a>
          {loeschen && (
            <button
              type="button"
              disabled={loeschen.laeuft}
              onClick={() => (loeschen.sicher ? loeschen.machen() : loeschen.fragen())}
              className={`inline-flex items-center gap-1.5 text-[14.5px] font-bold transition disabled:opacity-50 ${
                loeschen.sicher ? "text-[#c02626]" : "text-[#8b959d] hover:text-[#c02626]"}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {loeschen.sicher ? "Wirklich löschen?" : "Löschen"}
            </button>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
