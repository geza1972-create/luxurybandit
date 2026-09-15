"use client";

import { useEffect, useRef, useState } from "react";

/**
 * WANN WIRD ES BENUTZT — UND WAS HAT DIE ANZEIGE GEBRACHT (Owner 14.09.2026: „ich will eine
 * Grafik, die zeigt die Uhrzeit wenn das Portal am meisten benutzt wird" · „ich will noch einen
 * Punkt, an dem wir eine Anzeige geändert haben, um zu sehen ob die Insights auf dem Trichter
 * steigen oder sinken" · „also Timeline").
 *
 * ── ZWEI GRAFIKEN, ZWEI FRAGEN ──────────────────────────────────────────────────────────────
 *
 *  · Die Stundengrafik beantwortet „WANN" — wann soll eine Anzeige laufen, wann lohnt eine Mail.
 *  · Die Zeitleiste beantwortet „SEITDEM" — steigt oder sinkt es, seit wir etwas geändert haben.
 *
 * Beide zählen zwei Dinge getrennt, weil es zwei verschiedene Menschen sind: TRICHTER sind
 * Fremde, die zum ersten Mal auf die Seite kommen; PORTAL sind Künstler, die an ihrer eigenen
 * Seite arbeiten. In einem Balken addiert wäre beides unbrauchbar.
 *
 * ── DIE STUNDENGRAFIK HAT ZWEI ANSICHTEN (Owner 14.09.2026: „ich will die Grafik auch am Tag
 * sehen") ───────────────────────────────────────────────────────────────────────────────────
 *
 * HEUTE ist ein Tagesverlauf: Die Stunden nach jetzt sind leer, weil sie noch nicht stattgefunden
 * haben. 14 TAGE ist eine Verteilung: Jeder Balken zählt dieselbe Stunde aus allen Tagen zusammen,
 * deshalb ist dort jede Stunde gefüllt.
 *
 * Genau diese Verwechslung hat einmal Schaden angerichtet: In der Verteilung stand eine
 * „jetzt"-Marke, damit las sich die Achse als Uhr — und alles rechts davon sah nach Zukunft aus
 * („und warum sehe ich in die Zukunft?"). Die Marke ist deshalb weg, und die Überschrift sagt
 * jetzt selbst, was man vor sich hat.
 */

type Stunde = { stunde: number; trichter: number; portal: number };
type Tag = { tag: string; trichter: number; portal: number };
type Marke = { zeit: string; text: string };

type Stufe = { schluessel: string; anzahl: number };
type Trichter = { besucher: number; leiter: Stufe[]; quellen?: { quelle: string; anzahl: number }[] };
type Angekommen = { gespraeche: number; bilder: number };
type Daten = { stunden: Stunde[]; stundenHeute: Stunde[]; tage: Tag[]; marken: Marke[]; trichter: Trichter | null; angekommen: Angekommen | null };

/**
 * ── WAS DIE STUFEN IM KÜNSTLER-TRICHTER BEDEUTEN ────────────────────────────────────────────
 *
 * Die Leiter in `versusforge-schritt` stammt aus dem alten Agenten-Trichter und trägt dort Namen
 * wie „Trichter gestartet". Im Künstler-Trichter heisst dieselbe Stufe: er hat ein Werk
 * hochgeladen. Deshalb hier eigene Wörter — wortgleich mit der Live-Ansicht darüber, damit nicht
 * zwei Kästen auf derselben Seite dasselbe verschieden nennen.
 *
 * Was NICHT hier steht, wird nicht gezeigt: Die übrigen Stufen der alten Leiter (`webseite`,
 * `antwort1`…) durchläuft im Künstler-Trichter niemand, sie stünden ewig auf null.
 */
const STUFEN_WORT: Record<string, string> = {
  seite: "Trichter geöffnet",
  start: "Werk hochgeladen",
  lead: "Adresse genannt",
  abschluss: "abgeschlossen",
};

const TRICHTER = "#14181c";
const PORTAL = "#c9a227";

/** „14.09." — die Zeitleiste hat wenig Platz, das Jahr ist im Ausschnitt ohnehin gleich. */
const tagKurz = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;

export default function EngineVerlauf({ schluessel }: { schluessel: string }) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState(false);
  const [text, setText] = useState("");
  const [sendet, setSendet] = useState(false);
  /* Womit die Stundengrafik beginnt: mit heute. Das ist die Frage, die man morgens stellt. */
  const [nurHeute, setNurHeute] = useState(true);
  /* Ob je etwas ankam. Ein Fehlschlag beim Nachladen darf die stehende Grafik nicht wegnehmen —
     sonst verschwindet sie bei einem einzelnen Aussetzer vor seinen Augen. */
  const hatDaten = useRef(false);

  /**
   * ── NACHLADEN, IMMER (Owner 14.09.2026: „ja, nachladen" · dann „nein" · „wir müssen immer
   * tracken") ────────────────────────────────────────────────────────────────────────────────
   *
   * Alle zwei Minuten, ohne Rücksicht darauf, ob das Fenster im Vordergrund steht. Ich hatte
   * zuerst bei verstecktem Tab pausiert, um die schwerste Abfrage des Hauses zu sparen — das war
   * gegen seine Ansage.
   *
   * WICHTIG ZUR ABGRENZUNG: Das hier ist nur das ANZEIGEN. Das ERFASSEN der Besuche läuft auf dem
   * Server bei jedem einzelnen Besucher und hat mit diesem Fenster nie etwas zu tun — es gibt
   * keine Lücke in den Daten, wenn niemand hinsieht.
   */
  useEffect(() => {
    let lebt = true;

    const holen = async () => {
      try {
        const res = await fetch(`/api/engine-verlauf?s=${encodeURIComponent(schluessel)}`, { cache: "no-store" });
        const d = (await res.json()) as { ok?: boolean } & Partial<Daten>;
        if (!lebt) return;
        if (d.ok) {
          hatDaten.current = true;
          setDaten({
            stunden: d.stunden ?? [],
            stundenHeute: d.stundenHeute ?? [],
            tage: d.tage ?? [],
            marken: d.marken ?? [],
            trichter: d.trichter ?? null,
            angekommen: d.angekommen ?? null,
          });
        } else if (!hatDaten.current) setFehler(true);
      } catch { if (lebt && !hatDaten.current) setFehler(true); }
    };

    void holen();
    const takt = setInterval(holen, 120000);
    const beiSicht = () => { if (document.visibilityState === "visible") void holen(); };
    document.addEventListener("visibilitychange", beiSicht);

    return () => {
      lebt = false;
      clearInterval(takt);
      document.removeEventListener("visibilitychange", beiSicht);
    };
  }, [schluessel]);

  const markeSetzen = async () => {
    const satz = text.trim();
    if (!satz || sendet) return;
    setSendet(true);
    try {
      const res = await fetch(`/api/engine-verlauf?s=${encodeURIComponent(schluessel)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: satz }),
      });
      const d = (await res.json()) as { ok?: boolean; marken?: Marke[] };
      if (d.ok) {
        setText("");
        setDaten(a => (a ? { ...a, marken: d.marken ?? a.marken } : a));
      }
    } catch { /* der Knopf bleibt, er kann es noch einmal versuchen */ }
    setSendet(false);
  };

  if (fehler) return null;
  if (!daten) {
    return (
      <section className="mt-6 rounded-2xl border border-[#e4e9ee] p-4">
        <p className="m-0 text-[14.5px] text-[#8b959d]">Verlauf lädt …</p>
      </section>
    );
  }

  const { stunden, stundenHeute, tage, marken, trichter, angekommen } = daten;

  /* Die Stufen, die es im Künstler-Trichter wirklich gibt — in der Reihenfolge der Leiter. */
  const stufen = (trichter?.leiter ?? []).filter(l => STUFEN_WORT[l.schluessel]);
  const geoeffnet = stufen.find(l => l.schluessel === "seite")?.anzahl ?? trichter?.besucher ?? 0;
  const hochgeladen = stufen.find(l => l.schluessel === "start")?.anzahl ?? 0;
  /* „Nur geguckt" ist keine eigene Stufe, sondern was übrig bleibt: geöffnet, aber nie ein Bild. */
  const nurGeguckt = Math.max(0, geoeffnet - hochgeladen);
  const anteil = (n: number) => (geoeffnet > 0 ? Math.round((n / geoeffnet) * 100) : 0);

  /* Fällt die Heute-Reihe aus (alte Antwort im Zwischenspeicher), bleibt die Verteilung stehen —
     besser eine ehrliche zweite Ansicht als 24 leere Balken, die nach „niemand da" aussehen. */
  const reihe = nurHeute && stundenHeute.length ? stundenHeute : stunden;

  /* Ein gemeinsamer Maßstab für beide Farben — sonst sähe eine 2 so hoch aus wie eine 40.
     Und ein EIGENER je Ansicht: Heute-Zahlen sind kleiner als vierzehn Tage zusammen. */
  const hoechsteStunde = Math.max(1, ...reihe.map(s => s.trichter + s.portal));
  const hoechsterTag = Math.max(1, ...tage.map(t => t.trichter + t.portal));

  /* Die Balken zeigen das Verhältnis, nicht die Grösse. Ohne diese Zahlen sieht man nicht, ob
     ein hoher Balken 30 oder 300 bedeutet — und genau das ist die Frage („steigen oder sinken"). */
  const staerkste = reihe.reduce((a, b) => (b.trichter + b.portal > a.trichter + a.portal ? b : a), reihe[0]);
  const summe = reihe.reduce((n, s) => n + s.trichter + s.portal, 0);
  const heute = tage[tage.length - 1];
  const bester = tage.reduce((a, b) => (b.trichter + b.portal > a.trichter + a.portal ? b : a), tage[0]);

  /* Welche Tage eine Marke tragen — die Zeitleiste zeigt den Strich über der Spalte. */
  const markenProTag = new Map<string, Marke[]>();
  for (const m of marken) {
    const tag = String(m.zeit).slice(0, 10);
    markenProTag.set(tag, [...(markenProTag.get(tag) ?? []), m]);
  }

  const balken = (wert: number, hoechst: number, farbe: string) => (
    <div style={{ height: `${Math.round((wert / hoechst) * 100)}%`, background: farbe }} className="w-full rounded-t-[2px]" />
  );

  const schalter = (an: boolean, wort: string, klick: () => void) => (
    <button
      type="button"
      onClick={klick}
      className={`rounded-lg px-2.5 py-1 text-[12.5px] font-bold ${an ? "bg-[#14181c] text-white" : "text-[#8b959d] hover:text-[#14181c]"}`}
    >
      {wort}
    </button>
  );

  return (
    <section className="mt-6 rounded-2xl border border-[#e4e9ee] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
          Wann benutzt
        </p>
        {/* Der Umschalter steht neben der Überschrift, weil er die Bedeutung der Achse ändert —
            nicht bloss ihren Ausschnitt. */}
        <div className="flex items-center gap-1">
          {schalter(nurHeute, "Heute", () => setNurHeute(true))}
          {schalter(!nurHeute, `${tage.length} Tage`, () => setNurHeute(false))}
        </div>
      </div>

      <p className="m-0 mt-1 text-[12.5px] text-[#8b959d]">
        <span style={{ color: TRICHTER }}>■</span> Trichter{" "}
        <span style={{ color: PORTAL }}>■</span> Portal · Ortszeit
      </p>

      {/* ── STUNDEN 0–23 ── */}
      <div className="mt-3 flex h-28 items-end gap-[3px]">
        {reihe.map(s => (
          <div
            key={s.stunde}
            className="flex h-full flex-1 flex-col justify-end"
            title={`${s.stunde}:00 Uhr — Trichter ${s.trichter}, Portal ${s.portal}${nurHeute ? " (heute)" : ` (alle ${tage.length} Tage zusammen)`}`}
          >
            {balken(s.portal, hoechsteStunde, PORTAL)}
            {balken(s.trichter, hoechsteStunde, TRICHTER)}
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[3px] text-[11px] text-[#8b959d]">
        {reihe.map(s => (
          <span key={s.stunde} className="flex-1 text-center">
            {s.stunde % 6 === 0 ? s.stunde : ""}
          </span>
        ))}
      </div>

      {!!staerkste && (
        <p className="m-0 mt-1 text-[13px] text-[#8b959d]">
          Stärkste Stunde: <b className="text-[#14181c]">{staerkste.stunde} Uhr</b>
          {" "}· {staerkste.trichter + staerkste.portal}
          {" "}· {nurHeute ? "heute" : `${tage.length} Tage`} zusammen{" "}
          <b className="text-[#14181c]">{summe}</b>
        </p>
      )}
      <p className="m-0 mt-0.5 text-[12.5px] text-[#8b959d]">
        {nurHeute
          ? "Nur der heutige Tag. Die Stunden nach jetzt sind leer — sie sind noch nicht passiert."
          : `Jeder Balken zählt alle ${tage.length} Tage zu dieser Stunde zusammen — kein Tagesverlauf, sondern: zu welcher Tageszeit kommen sie.`}
      </p>

      {/* ── LADEN SIE HOCH ODER GUCKEN SIE NUR ── */}
      {!!stufen.length && geoeffnet > 0 && (
        <>
          <p className="m-0 mt-5 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
            Hochgeladen oder nur geguckt · {tage.length} Tage
          </p>

          {/* ── WOHER SIE KAMEN (Owner 15.09.2026: „ja, keine ahnung woher") ────────────────
              Ohne diese Zeile lässt sich keine Quote mit einer anderen vergleichen: Am 13.09.
              luden 19 von 310 hoch, am 15.09. einer von 141 — und niemand konnte sagen, ob das
              derselbe Strom war. Alte Besucher tragen keine Herkunft; die Zeile bleibt so lange
              weg, statt „direkt" zu behaupten. */}
          {!!trichter?.quellen?.length && (
            <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-[#5b666f]">
              <span className="font-bold text-[#14181c]">Woher:</span>
              {trichter.quellen.map(q => (
                <span key={q.quelle}>{q.quelle} <b className="text-[#14181c]">{q.anzahl}</b></span>
              ))}
            </p>
          )}

          <p className="m-0 mt-2 text-[15px]">
            <b className="text-[26px] font-black leading-none text-[#14181c]">{nurGeguckt}</b>
            <span className="ml-2 text-[#5b666f]">haben nur geguckt</span>
            <span className="mx-2 text-[#c9ced3]">·</span>
            <b className="text-[26px] font-black leading-none text-[#14181c]">{hochgeladen}</b>
            <span className="ml-2 text-[#5b666f]">haben ein Bild gewählt ({anteil(hochgeladen)} %)</span>
          </p>

          <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {stufen.map(l => (
              <li key={l.schluessel} className="flex items-center gap-3 text-[14px]">
                <span className="w-[9.5rem] shrink-0 text-[#14181c]">{STUFEN_WORT[l.schluessel]}</span>
                {/* Ein Balken je Stufe: Anteil an denen, die überhaupt hereingekommen sind. */}
                <span className="h-[9px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef1f4]">
                  <span className="block h-full rounded-full" style={{ width: `${anteil(l.anzahl)}%`, background: TRICHTER }} />
                </span>
                <span className="w-20 shrink-0 text-right text-[13px] text-[#8b959d]">
                  {l.anzahl} · {anteil(l.anzahl)} %
                </span>
              </li>
            ))}

            {/* ── DIE ZWEITE STUFE ── Sie steht bewusst in derselben Liste, direkt unter „Bild
                gewählt": Der Absturz zwischen beiden Zeilen IST die Aussage. */}
            {!!angekommen && (
              <li className="flex items-center gap-3 text-[14px]">
                <span className="w-[9.5rem] shrink-0 font-bold text-[#14181c]">Werk angekommen</span>
                <span className="h-[9px] min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef1f4]">
                  <span className="block h-full rounded-full" style={{ width: `${anteil(angekommen.gespraeche)}%`, background: PORTAL }} />
                </span>
                <span className="w-20 shrink-0 text-right text-[13px] text-[#8b959d]">
                  {angekommen.gespraeche} · {anteil(angekommen.gespraeche)} %
                </span>
              </li>
            )}
          </ul>

          {!!angekommen && (
            <p className="m-0 mt-2 text-[12.5px] text-[#8b959d]">
              „Bild gewählt“ meldet der Browser, sobald jemand eine Datei aussucht — das Bild bleibt
              dabei bei ihm. Erst wer die Analyse auslöst, schickt es uns:{" "}
              <b className="text-[#14181c]">{angekommen.gespraeche}</b> Leute mit{" "}
              <b className="text-[#14181c]">{angekommen.bilder}</b> Werken. Dazwischen liegt der
              grösste Absprung des Trichters.
            </p>
          )}
        </>
      )}

      {/* ── DIE ZEITLEISTE: Tage, mit den Marken darüber ── */}
      <p className="m-0 mt-5 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
        Zeitleiste
      </p>

      <div className="mt-3 flex h-28 items-end gap-[4px]">
        {/* Der letzte Tag IST heute — und er ist noch nicht zu Ende. Ohne Markierung sieht ein
            halber Tag wie ein Einbruch aus. */}
        {tage.map(t => {
          const eigene = markenProTag.get(t.tag) ?? [];
          return (
            <div
              key={t.tag}
              className={`relative flex h-full flex-1 flex-col justify-end rounded-t-[3px] ${t === heute ? "bg-[#f3ead0]" : ""}`}
              title={`${tagKurz(t.tag)} — Trichter ${t.trichter}, Portal ${t.portal}${eigene.length ? `\n${eigene.map(m => m.text).join("\n")}` : ""}`}
            >
              {/* Der senkrechte Strich sitzt HINTER den Balken und geht über die volle Höhe —
                  so liest man „ab hier" statt „an diesem Tag war etwas". */}
              {!!eigene.length && (
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#c0392b]" />
              )}
              {balken(t.portal, hoechsterTag, PORTAL)}
              {balken(t.trichter, hoechsterTag, TRICHTER)}
            </div>
          );
        })}
      </div>
      {/* Von HINTEN jeden zweiten beschriften: Heute ist der Tag, auf den man schaut — der darf
         nicht derjenige sein, der bei gerader Anzahl aus dem Raster fällt. */}
      <div className="mt-1 flex gap-[4px] text-[11px] text-[#8b959d]">
        {tage.map((t, i) => (
          <span key={t.tag} className="flex-1 text-center">
            {(tage.length - 1 - i) % 2 === 0 ? tagKurz(t.tag) : ""}
          </span>
        ))}
      </div>

      {!!heute && !!bester && (
        <p className="m-0 mt-1 text-[13px] text-[#8b959d]">
          Heute: <b className="text-[#14181c]">{heute.trichter + heute.portal}</b>
          {" "}· stärkster Tag {tagKurz(bester.tag)} mit {bester.trichter + bester.portal}
        </p>
      )}

      {/* ── DIE MARKEN IM KLARTEXT ── */}
      {!!marken.length && (
        <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
          {marken.slice(0, 6).map(m => (
            <li key={m.zeit} className="flex items-baseline gap-2 text-[14px]">
              <span className="text-[#c0392b]">│</span>
              <span className="text-[#8b959d]">{tagKurz(String(m.zeit).slice(0, 10))}</span>
              <span className="min-w-0 text-[#14181c]">{m.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ── EINE MARKE SETZEN ── */}
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") void markeSetzen(); }}
          maxLength={120}
          placeholder="Was hast du geändert?"
          className="min-w-0 flex-1 rounded-xl border border-[#e4e9ee] px-3 py-2 text-[14.5px] outline-none focus:border-[#8b959d]"
        />
        <button
          type="button"
          onClick={() => void markeSetzen()}
          disabled={!text.trim() || sendet}
          className="rounded-xl bg-[#14181c] px-4 py-2 text-[14.5px] font-bold text-white disabled:opacity-40"
        >
          {sendet ? "…" : "Punkt setzen"}
        </button>
      </div>
    </section>
  );
}
