"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play } from "lucide-react";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kasten, Knopf, Eingabe, Laden, MadeBy } from "@/components/CI";
import EinladungKarte from "@/components/EinladungKarte";
import { zielTexte, type ZielId } from "@/lib/future-ziele";
import { futureProgramTage } from "@/lib/future-program-tage";
import { futureProgramText } from "@/lib/future-program-i18n";
import { programWoche, PROGRAM_WOCHEN } from "@/lib/future-program-wochen";
import type { FutureProgram } from "@/lib/future-program-store";

/**
 * DIE PROGRAMMSEITE — die private, persönliche Seite des Future Self Program (11.08.2026).
 *
 * KEIN ADMIN, KEIN LOGIN: Der Link aus der Liefermail trägt `g` (Auftragsnummer) und `t`
 * (ihr Token, siehe lib/future-program-store.ts) — beides zusammen ist der Ausweis. Die
 * Seite spricht seine SPRACHE AUS DEM KAUF (`program.lang`), nicht die des Browsers, der den
 * Link gerade öffnet — schickt er ihn an sich selbst auf einem anderen Gerät, bleibt es
 * dieselbe Sprache, in der der Trichter lief.
 *
 * MOBIL, WIE JEDE SEITE DES HAUSES: lb-bg, TopNav, SeitenFuss, max-w-[440px]. Jede Fläche
 * kommt aus der CI-Bibliothek — kein eigens gezeichneter Kasten, kein eigener Knopf.
 */

type Antwort = { program: FutureProgram; tag: number };

function FutureProgramInner() {
  const sp = useSearchParams();
  const g = String(sp.get("g") ?? "").trim();
  const t = String(sp.get("t") ?? "").trim();

  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState(false);
  const [daten, setDaten] = useState<Antwort | null>(null);
  // Welcher vergangene Tag gerade nachgetragen wird — verhindert Doppelklicks während des
  // Netzwerk-Umlaufs (derselbe Tag darf nicht zweimal abgeschickt werden).
  const [wirdAbgehakt, setWirdAbgehakt] = useState<number | null>(null);
  const [ziel90Entwurf, setZiel90Entwurf] = useState("");
  const [ziel90Speichert, setZiel90Speichert] = useState(false);

  useEffect(() => {
    if (!g || !t) { setLaden(false); setFehler(true); return; }
    let lebt = true;
    fetch(`/api/future-program?g=${encodeURIComponent(g)}&t=${encodeURIComponent(t)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: Antwort) => { if (lebt) { setDaten(d); setLaden(false); } })
      .catch(() => { if (lebt) { setFehler(true); setLaden(false); } });
    return () => { lebt = false; };
  }, [g, t]);

  /**
   * DER SPRACHUMSCHALTER GEWINNT (Owner 11.08.2026, beim Testen: „ich habe oben den
   * switscher benutzt und hat nicht gewirkt").
   *
   * Die Kauf-Sprache aus der Programm-Datei bleibt der STARTWERT — öffnet er den Link auf
   * einem fremden Gerät, spricht die Seite weiter seine Sprache. Aber wer oben AKTIV
   * umschaltet, hat entschieden; der Keks `lb_lang` ist genau diese Entscheidung. Gelesen
   * wird er im Rendern (nicht in einem Effekt): `router.refresh()` des Umschalters löst
   * ein Neu-Rendern aus, aber keinen Neu-Mount — ein Effekt liefe nie wieder, und der
   * Schalter bliebe genau so wirkungslos, wie der Owner es gesehen hat.
   */
  const sprachKeks = typeof document !== "undefined"
    ? decodeURIComponent(document.cookie.match(/(?:^|; )lb_lang=([^;]*)/)?.[1] ?? "").slice(0, 2)
    : "";
  const anzeigeLang = sprachKeks || daten?.program.lang;
  const T = futureProgramText(anzeigeLang);

  async function abhaken(tag: number) {
    if (!daten || wirdAbgehakt) return;
    setWirdAbgehakt(tag);
    try {
      const r = await fetch("/api/future-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ g, t, check: tag }),
      });
      if (r.ok) {
        const d = (await r.json()) as Antwort;
        setDaten(d);
      }
    } finally { setWirdAbgehakt(null); }
  }

  async function ziel90Speichern() {
    const ziel = ziel90Entwurf.trim();
    if (!daten || !ziel || ziel90Speichert) return;
    setZiel90Speichert(true);
    try {
      const r = await fetch("/api/future-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ g, t, ziel90: ziel }),
      });
      if (r.ok) {
        const d = (await r.json()) as Antwort;
        setDaten(d);
      }
    } finally { setZiel90Speichert(false); }
  }

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {laden && <Laden art="flaeche" text={futureProgramText(undefined).loading} />}

        {!laden && (fehler || !daten) && (
          <div className="pt-10">
            <Kasten art="still">
              <p className="text-center text-[15px] font-black leading-snug text-white">
                {futureProgramText(undefined).invalidTitle}
              </p>
              <p className="mt-1.5 text-center text-[13px] font-semibold leading-snug text-white/70">
                {futureProgramText(undefined).invalidText}
              </p>
              <a href="/my-gallery" className="mt-4 block">
                <Knopf art="umriss">{futureProgramText(undefined).backToGallery}</Knopf>
              </a>
            </Kasten>
          </div>
        )}

        {!laden && daten && (
          <ProgrammAnsicht daten={daten} T={T} lang={anzeigeLang} wirdAbgehakt={wirdAbgehakt} abhaken={abhaken}
            ziel90Entwurf={ziel90Entwurf} setZiel90Entwurf={setZiel90Entwurf}
            ziel90Speichert={ziel90Speichert} ziel90Speichern={ziel90Speichern} />
        )}
      </div>
      <SeitenFuss />
    </main>
  );
}

function ProgrammAnsicht({ daten, T, lang, wirdAbgehakt, abhaken, ziel90Entwurf, setZiel90Entwurf, ziel90Speichert, ziel90Speichern }: {
  daten: Antwort;
  T: ReturnType<typeof futureProgramText>;
  /** Anzeige-Sprache (Umschalter sticht Kauf-Sprache, siehe oben) — Tage und Ziel-Wörter
   *  müssen MIT den Rahmentexten umschalten, sonst spricht die Seite zwei Sprachen. */
  lang: string | undefined;
  wirdAbgehakt: number | null;
  abhaken: (tag: number) => void;
  ziel90Entwurf: string;
  setZiel90Entwurf: (v: string) => void;
  ziel90Speichert: boolean;
  ziel90Speichern: () => void;
}) {
  const { program: p, tag: heute } = daten;
  const tage = futureProgramTage(lang ?? p.lang);
  // ZURÜCKBLÄTTERN unter "Frühere Tage" (Owner 11.08.2026: „Kann er zurückblättern? Zu
  // Tag 2, 1?"). Immer nur EIN Tag offen — der Tipp auf einen anderen schliesst den vorigen.
  const [aufgeklappterTag, setAufgeklappterTag] = useState<number | null>(null);
  const nach30 = heute >= 30 && !!p.checks["30"];
  const geschafft = Object.keys(p.checks).length;
  const heutigerEintrag = tage[Math.min(heute, 30) - 1];
  const heuteErledigt = !!p.checks[String(heute)];
  const zZ = zielTexte(lang ?? p.lang);

  return (
    <>
      {/* KOPF */}
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f6cf51]">{T.kicker}</p>
      <h1 className="mt-1 text-[26px] font-black leading-tight text-white">
        {nach30 && p.ziel90 ? T.next90Titled : nach30 ? T.next90 : T.dayOf(heute)}
      </h1>

      {/* YOUR DIRECTION */}
      <div className="mt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">{T.directionTitle}</p>
        {p.ziele.length === 0 && !p.zieleFrei ? (
          <p className="mt-2 text-[13.5px] font-semibold leading-snug text-white/70">{T.directionEmpty}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.ziele.map(z => (
              <Knopf key={z} art="chip" aktiv>{zZ.namen[z as ZielId] ?? z}</Knopf>
            ))}
            {p.zieleFrei && <Knopf art="chip" aktiv>{p.zieleFrei}</Knopf>}
          </div>
        )}
      </div>

      {/* FORTSCHRITT */}
      <div className="mt-5">
        <p className="text-[12.5px] font-bold text-white/75">{T.progress(geschafft)}</p>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((geschafft / 30) * 100))}%`, background: "#f6cf51" }} />
        </div>
      </div>

      {/* WOCHEN-BOTSCHAFT (Owner 11.08.2026: „wir posten trotzdem ein Video am Anfang der
          Woche" — siehe lib/future-program-wochen.ts). Zusätzlich zum 30-Tage-Gerüst, nicht
          statt dessen: Das Programm bekommt einmal je Woche ein Video mit dem Owner selbst.
          Der übersetzte Text unter dem Video zeigt in JEDER Sprache, auch Englisch (Mitlese-
          Text) — das Video selbst bleibt sein Original. */}
      <WochenBotschaft heute={heute} lang={lang ?? p.lang} />

      {/* HEUTE */}
      {heutigerEintrag && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">{T.todayTitle}</p>
          <Kasten art="gold" className="mt-2">
            <p className="text-[15px] font-black leading-snug text-white">{heutigerEintrag.titel}</p>
            <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-white/85">{heutigerEintrag.aufgabe}</p>
            <p className="mt-3 text-[13px] font-bold text-[#f6cf51]">{heutigerEintrag.frage}</p>
            <div className="mt-3">
              {heuteErledigt ? (
                <p className="flex h-12 items-center justify-center rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[14px] font-black text-[#f6cf51]">
                  {T.doneToday}
                </p>
              ) : (
                <Knopf art="gold" onClick={() => abhaken(heute)} disabled={wirdAbgehakt === heute}>
                  {wirdAbgehakt === heute ? <Laden /> : T.markDone}
                </Knopf>
              )}
            </div>
          </Kasten>
        </div>
      )}

      {/* VERPASSTE TAGE — vergebende Regel: ein offener früherer Tag bleibt nachträglich
          abhakbar, weitermachen statt neu anfangen (siehe Tag 18 im Programm selbst).
          ZURÜCKBLÄTTERBAR (Owner 11.08.2026): ein Tipp auf die Zeile klappt Aufgabe+Frage
          des Tages auf, ein zweiter Tipp klappt zu, nur EIN Tag gleichzeitig offen. Der
          Abhak-Knopf sitzt in einer EIGENEN Klickfläche (eigenes <button>, stopPropagation),
          damit das Aufklappen ihn nie versehentlich mitfeuert. KEIN Vorblättern: die
          Schleife läuft nur bis `heute - 1`, zukünftige Tage tauchen hier nie auf. */}
      {heute > 1 && (
        <div className="mt-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">{T.missedTitle}</p>
          <div className="mt-2 space-y-1.5">
            {Array.from({ length: heute - 1 }, (_, i) => heute - 1 - i).map(n => {
              const erledigt = !!p.checks[String(n)];
              const eintrag = tage[n - 1];
              const titel = eintrag?.titel ?? "";
              const offen = aufgeklappterTag === n;
              return (
                <div key={n} className="rounded-xl border border-white/10 bg-white/[0.03]">
                  <div role="button" tabIndex={0}
                    onClick={() => setAufgeklappterTag(offen ? null : n)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAufgeklappterTag(offen ? null : n); } }}
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-white/80">
                      <span className="text-white/50">{n}.</span> {titel}
                    </span>
                    {erledigt ? (
                      <span className="shrink-0 text-[13px] font-black text-[#f6cf51]">✓</span>
                    ) : (
                      <button type="button" onClick={e => { e.stopPropagation(); abhaken(n); }} disabled={wirdAbgehakt === n}
                        className="shrink-0 rounded-full border border-white/25 px-2.5 py-1 text-[11px] font-black text-white/75 transition active:scale-95 disabled:opacity-60">
                        {wirdAbgehakt === n ? <Laden /> : T.missedMark}
                      </button>
                    )}
                  </div>
                  {offen && eintrag && (
                    <div className="border-t border-white/10 px-3 py-2.5">
                      <p className="text-[12.5px] font-medium leading-snug text-white/80">{eintrag.aufgabe}</p>
                      <p className="mt-2 text-[12px] font-bold text-[#f6cf51]">{eintrag.frage}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAG 30 — DAS 90-TAGE-ZIEL. AB Tag 30 sichtbar, NICHT erst nach dem Abhaken: Die
          Aufgabe von Tag 30 lautet „trag dein Ziel ein", die Abhak-Frage „hast du es
          eingetragen?" — ein Feld, das erst nach dem Häkchen erscheint, macht die Frage
          unbeantwortbar (beim Sichttest am 11.08.2026 gefunden). */}
      {heute >= 30 && (
        <div className="mt-6">
          {p.ziel90 ? (
            <Kasten art="still">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">{T.goal90Saved}</p>
              <p className="mt-1.5 text-[15px] font-black leading-snug text-white">{p.ziel90}</p>
            </Kasten>
          ) : (
            <Kasten art="still">
              <p className="text-[13.5px] font-black leading-snug text-white">{T.goal90Title}</p>
              <Eingabe className="mt-3" placeholder={T.goal90Placeholder} value={ziel90Entwurf}
                maxLength={120} onChange={e => setZiel90Entwurf(e.target.value)} />
              <div className="mt-3">
                <Knopf art="gold" onClick={ziel90Speichern} disabled={!ziel90Entwurf.trim() || ziel90Speichert}>
                  {ziel90Speichert ? <Laden /> : T.goal90Save}
                </Knopf>
              </div>
            </Kasten>
          )}
        </div>
      )}
    </>
  );
}

/**
 * DIE VIDEO-KARTE JE WOCHE — fehlertolerant (Owner-Kontext: `Week1.mp4` lag beim Bauen noch
 * nicht im Ordner, Wochen 2–4 kommen erst bei einem Kauf dazu).
 *
 * Lädt die Datei nicht (kein `Week{n}.mp4` abgelegt, 404), blendet `onError` NUR die
 * Video-Karte aus — der übersetzte Text darunter bleibt stehen, keine kaputte Fläche, kein
 * schwarzes Loch. Die Karte kommt aus `EinladungKarte` (Hausregel: nie ein nacktes `<video>`),
 * Titel oben, `MadeBy` unten, Originalton an (er spricht), keine Schleife (eine Botschaft,
 * kein Ambiente-Loop) — ein Tipp auf das Bild startet oder pausiert, das Video läuft beim
 * erneuten Tipp von der Stelle weiter statt von vorn (Hausregel „video-playback-behavior").
 *
 * ZURÜCKBLÄTTERBAR (Owner 11.08.2026): über dem Video steht eine Chip-Reihe mit jeder
 * bereits ERREICHTEN Woche (1 bis zur aktuellen) — bei nur einer verfügbaren Woche bleibt
 * die Reihe weg (eine Wahl aus einem ist keine Wahl). Vorgabe ist immer die aktuelle Woche;
 * ein Tipp auf einen früheren Chip zeigt DESSEN Video und DESSEN Zeilen. Die bestehende
 * Fehlertoleranz (Datei fehlt noch → `onError` blendet nur die Video-Karte aus) hört jetzt
 * auf die GEWÄHLTE Woche, nicht mehr auf die tatsächlich aktuelle — sonst überlebt ein
 * Fehlerzustand den Wechsel zurück auf eine funktionierende Woche.
 */
function WochenBotschaft({ heute, lang }: { heute: number; lang: string }) {
  const T = futureProgramText(lang);
  const { nr: aktuellNr } = programWoche(heute);
  const [gewaehlt, setGewaehlt] = useState<1 | 2 | 3 | 4>(aktuellNr);
  const woche = PROGRAM_WOCHEN[gewaehlt - 1];
  const [fehler, setFehler] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const spieler = useRef<HTMLVideoElement>(null);

  // Jede Woche zeigt ihr eigenes Video/ihren eigenen Text — ein Wechsel darf das alte
  // Fehler-/Spiel-Zeichen nicht mitschleppen. Hört auf die GEWÄHLTE Woche (Zurückblättern),
  // nicht auf die tatsächlich aktuelle.
  useEffect(() => { setFehler(false); setLaeuft(false); }, [gewaehlt]);

  const titel = woche.titel[lang] ?? woche.titel.en;
  const zeilen: string[] = woche.zeilen[lang] ?? woche.zeilen.en;
  const markensatz = "Bandit this life.";

  function tippen() {
    const v = spieler.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {}); else v.pause();
  }

  return (
    <div className="mt-6">
      {aktuellNr > 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {Array.from({ length: aktuellNr }, (_, i) => (i + 1) as 1 | 2 | 3 | 4).map(n => (
            <Knopf key={n} art="chip" aktiv={gewaehlt === n} onClick={() => setGewaehlt(n)}>
              {T.weekChip(n)}
            </Knopf>
          ))}
        </div>
      )}
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">{titel}</p>

      {!fehler && (
        <div className="mt-2">
          <EinladungKarte sprache={lang} sie="" er="" demo titel={titel}
            fuss={<MadeBy karte />}
            video={
              <button type="button" onClick={tippen}
                aria-label={laeuft ? "Video pausieren" : "Video abspielen"}
                className="relative block aspect-[3/4] w-full overflow-hidden">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video ref={spieler} src={woche.video} poster={woche.poster}
                  playsInline preload="metadata" className="h-full w-full object-contain"
                  onPlay={() => setLaeuft(true)} onPause={() => setLaeuft(false)}
                  onError={() => setFehler(true)} />
                {!laeuft && (
                  <span className="absolute inset-0 grid place-items-center bg-black/20">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-black/55 backdrop-blur">
                      <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
                    </span>
                  </span>
                )}
              </button>
            } />
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {zeilen.map((z, i) => (
          <p key={i} className={z === markensatz
            ? "text-[13.5px] font-bold text-[#f6cf51]"
            : "text-[13.5px] leading-snug text-white/80"}>
            {z}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function FutureProgramPage() {
  return (
    <Suspense>
      <FutureProgramInner />
    </Suspense>
  );
}
