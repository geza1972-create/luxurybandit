"use client";

import { useEffect, useRef, useState } from "react";
import { Film, Trash2, Upload } from "lucide-react";

/**
 * SEIN FILM ZU DIESEM WERK — HOCHLADEN IN „SEITE BEARBEITEN" (Owner 20.09.2026: „und bei jedem
 * Poster in der Edit-Seite soll man ein Video hochladen können").
 *
 * ── DIE PFLICHTEN DES UPLOAD-SKILLS, HIER FÜR EINEN FILM ─────────────────────────────────────
 *
 *  1 · NICHTS RUTSCHT VON ALLEIN HINEIN. Der gewählte Film wird zuerst GEZEIGT (mit Leiste, zum
 *      Durchsehen). Hochgeladen wird erst auf „Speichern"; daneben steht „Abbrechen".
 *  3 · LÖSCHEN, SICHTBAR. Liegt ein Film am Werk, steht der Löschknopf direkt daneben.
 *  · GROSSE DATEIEN GEHEN DIREKT IN DIE ABLAGE (`api/portal-werk-film` gibt nur die Adressen) —
 *    Vercel bricht bei rund 4,5 MB ab, ein Handy-Film wiegt das Zehnfache.
 *  · NACH DEM SPEICHERN STEHT SOFORT DAS LOKALE BILD DA — die Ablage liefert ein, zwei Sekunden
 *    lang noch den alten Stand; wer dann neu lädt, hält den Upload für kaputt.
 *
 * Pflicht 2 (Zuschneiden) gilt für Fotos: Einen Film schneidet kein Browser zu. Was hier an
 * seine Stelle tritt, ist das STANDBILD — es wird aus dem Film selbst geschnitten (Owner
 * 20.09.2026: „Poster für Video muss aus dem Video kommen") und mit hochgeladen.
 * Pflicht 4 (Reihenfolge) entfällt: Es ist ein Film je Werk, keine Liste.
 *
 * ── DAS AUSSEHEN FOLGT DER SEITE ────────────────────────────────────────────────────────────
 *
 * „Seite bearbeiten" ist ein helles Werkzeug (Schwarz · Weiss · Grau, kein Gelb). Die Knöpfe
 * sind dieselben wie bei der Aufnahme im Profil (`StimmeAufnehmen`), damit zwei Werkzeuge auf
 * derselben Seite nicht nach zwei Häusern aussehen.
 */
export default function WerkFilmHochladen({ mandant, schluessel, i, art, vorhanden, stand, texte }: {
  mandant: string;
  schluessel: string;
  /** -1 = Standardmotiv, sonst die Kachelnummer. */
  i: number;
  /** „film" = die Geschichte hinter dem Bild · „wand" = das Blatt wird aufgehängt. */
  art: "film" | "wand";
  vorhanden: boolean;
  /** `filmAm` / `wandFilmAm` — reist in der Adresse mit, damit der Zwischenspeicher nicht den alten zeigt. */
  stand?: string;
  texte: { titel: string; erklaerung: string; waehlen: string; ersetzen: string; speichern: string; abbrechen: string;
    loeschen: string; laedt: string; gespeichert: string; fehler: string; zuGross: string; nurVideo: string };
}) {
  const feld = useRef<HTMLInputElement>(null);
  const [datei, setDatei] = useState<File | null>(null);
  const [vorschau, setVorschau] = useState("");
  const [da, setDa] = useState(vorhanden);
  /* Das Standbild des gerade gespeicherten Films — lokal, bis die Ablage nachgezogen hat. */
  const [lokalBild, setLokalBild] = useState("");
  const [am, setAm] = useState(stand ?? "");
  const [zustand, setZustand] = useState<"" | "laedt" | "fertig" | "fehler">("");
  const [meldung, setMeldung] = useState("");
  const [anteil, setAnteil] = useState(0);

  useEffect(() => () => { if (vorschau) URL.revokeObjectURL(vorschau); }, [vorschau]);

  const MAX = 80 * 1024 * 1024;
  const api = (a: string) =>
    `/api/portal-werk-film?m=${encodeURIComponent(mandant)}&k=${encodeURIComponent(schluessel)}&i=${i}&art=${art}&a=${a}`;
  const nr = i < 0 ? "standard" : String(i);
  const bildAdresse = `/api/portal-film?m=${encodeURIComponent(mandant)}&i=${nr}&art=${art === "film" ? "filmposter" : "wandposter"}&v=${encodeURIComponent(am || "1")}`;

  const gewaehlt = (f: File | undefined) => {
    setMeldung(""); setZustand("");
    if (!f) return;
    if (!f.type.startsWith("video/")) { setZustand("fehler"); setMeldung(texte.nurVideo); return; }
    if (f.size > MAX) { setZustand("fehler"); setMeldung(texte.zuGross); return; }
    setDatei(f);
    setVorschau(URL.createObjectURL(f));
  };

  const abbrechen = () => {
    setDatei(null); setVorschau(""); setZustand(""); setMeldung(""); setAnteil(0);
    if (feld.current) feld.current.value = "";
  };

  /** Ein Bild AUS dem Film: ein Fünftel hinein (höchstens 1,5 s), damit es kein schwarzer Anfang ist. */
  const standbildSchneiden = (quelle: string) => new Promise<Blob | null>(fertig => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = quelle;
    const aus = (b: Blob | null) => { v.removeAttribute("src"); v.load(); fertig(b); };
    v.onloadedmetadata = () => { v.currentTime = Math.min(1.5, (v.duration || 1) * 0.2); };
    v.onseeked = () => {
      const breit = Math.min(1080, v.videoWidth || 720);
      const hoch = Math.round(breit * (v.videoHeight || 1280) / (v.videoWidth || 720));
      const c = document.createElement("canvas");
      c.width = breit; c.height = hoch;
      c.getContext("2d")?.drawImage(v, 0, 0, breit, hoch);
      c.toBlob(b => aus(b), "image/jpeg", 0.86);
    };
    v.onerror = () => aus(null);
    window.setTimeout(() => aus(null), 8000);
  });

  /** Mit Fortschritt — bei 40 MB über Mobilfunk ist ein stehender Knopf keine Auskunft. */
  const hochladen = (adresse: string, inhalt: Blob, typ: string, fortschritt?: (n: number) => void) =>
    new Promise<boolean>(fertig => {
      const x = new XMLHttpRequest();
      x.open("PUT", adresse);
      x.setRequestHeader("Content-Type", typ);
      x.setRequestHeader("x-upsert", "true");
      x.upload.onprogress = e => { if (e.lengthComputable) fortschritt?.(e.loaded / e.total); };
      x.onload = () => fertig(x.status >= 200 && x.status < 300);
      x.onerror = () => fertig(false);
      x.send(inhalt);
    });

  const speichern = async () => {
    if (!datei || zustand === "laedt") return;
    setZustand("laedt"); setMeldung(""); setAnteil(0);
    try {
      const bild = await standbildSchneiden(vorschau);
      const start = await fetch(api("start"), { method: "POST" }).then(r => r.json()).catch(() => null) as
        { ok?: boolean; video?: string; bild?: string } | null;
      if (!start?.ok || !start.video || !start.bild) throw new Error("start");
      if (!(await hochladen(start.video, datei, datei.type || "video/mp4", setAnteil))) throw new Error("video");
      /* Ohne Standbild geht es auch (die Seite fällt dann auf das Werk zurück) — der Film ist die
         Hauptsache, an einem fehlenden Bild soll er nicht scheitern. */
      if (bild) await hochladen(start.bild, bild, "image/jpeg");
      const ende = await fetch(api("fertig"), { method: "POST" }).then(r => r.json()).catch(() => null) as
        { ok?: boolean; am?: string; grund?: string } | null;
      if (!ende?.ok) throw new Error(ende?.grund === "zu-gross" ? "zu-gross" : "fertig");
      setDa(true); setAm(ende.am ?? new Date().toISOString());
      setLokalBild(bild ? URL.createObjectURL(bild) : "");
      setDatei(null); setVorschau(""); setZustand("fertig"); setMeldung(texte.gespeichert);
      if (feld.current) feld.current.value = "";
    } catch (e) {
      setZustand("fehler");
      setMeldung((e as Error).message === "zu-gross" ? texte.zuGross : texte.fehler);
    }
  };

  const loeschen = async () => {
    if (zustand === "laedt") return;
    setZustand("laedt"); setMeldung("");
    const r = await fetch(api("weg"), { method: "POST" }).then(x => x.json()).catch(() => null) as { ok?: boolean } | null;
    if (r?.ok) { setDa(false); setLokalBild(""); setZustand(""); } else { setZustand("fehler"); setMeldung(texte.fehler); }
  };

  const knopf = "inline-flex items-center gap-1.5 rounded-full border border-[#d9d9d9] px-3 py-1.5 text-[13.5px] font-semibold text-[#111] hover:border-[#111] disabled:opacity-40";

  return (
    <div className="mt-3 border-t border-[#ececec] pt-3">
      <p className="m-0 flex items-center gap-1.5 text-[13.5px] font-semibold text-[#14181c]">
        <Film className="h-[15px] w-[15px]" aria-hidden />{texte.titel}
      </p>
      <p className="m-0 mt-1 text-[13.5px] leading-[1.45] text-[#777]">{texte.erklaerung}</p>

      <input ref={feld} type="file" accept="video/*" className="hidden"
        onChange={e => gewaehlt(e.target.files?.[0])} />

      {datei && vorschau ? (
        /* Erst ANSEHEN, dann speichern (Pflicht 1). */
        <div className="mt-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={vorschau} controls playsInline preload="metadata" className="block max-h-[320px] max-w-full rounded-lg bg-black" />
          {zustand === "laedt" ? (
            <div className="mt-2">
              <div className="h-[4px] w-full max-w-[280px] overflow-hidden rounded-full bg-[#e5e5e5]">
                <div className="h-full rounded-full bg-[#111] transition-[width]" style={{ width: `${Math.round(anteil * 100)}%` }} />
              </div>
              <p className="m-0 mt-1 text-[13.5px] font-semibold text-[#555]">{texte.laedt} {Math.round(anteil * 100)} %</p>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => void speichern()} className={`${knopf} border-[#111] bg-[#111] text-white hover:bg-[#333]`}>
                <Upload className="h-[15px] w-[15px]" aria-hidden />{texte.speichern}
              </button>
              <button type="button" onClick={abbrechen} className={knopf}>{texte.abbrechen}</button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {da ? (
            /* Das Standbild des Films, der am Werk liegt — aus dem Film, nicht vom Werk. */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={lokalBild || bildAdresse} alt="" className="h-[64px] w-[48px] rounded-md bg-[#eee] object-cover"
              onError={e => { e.currentTarget.style.visibility = "hidden"; }} />
          ) : null}
          <button type="button" disabled={zustand === "laedt"} onClick={() => feld.current?.click()} className={knopf}>
            <Upload className="h-[15px] w-[15px]" aria-hidden />{da ? texte.ersetzen : texte.waehlen}
          </button>
          {da ? (
            <button type="button" disabled={zustand === "laedt"} onClick={() => void loeschen()}
              className={`${knopf} hover:border-[#b3261e] hover:text-[#b3261e]`}>
              <Trash2 className="h-[15px] w-[15px]" aria-hidden />{texte.loeschen}
            </button>
          ) : null}
        </div>
      )}

      {meldung ? (
        <p className={`m-0 mt-2 text-[13.5px] font-bold ${zustand === "fehler" ? "text-[#b3261e]" : "text-[#1a7f37]"}`}>{meldung}</p>
      ) : null}
    </div>
  );
}
