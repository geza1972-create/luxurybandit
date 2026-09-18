"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { schrittMessen } from "@/lib/versusforge-messen";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";
import { druckPreisCents, druckGroessenFuer, DRUCK_VERSAND_CENTS } from "@/lib/lakatosbandi-druck";
import { eur } from "@/lib/pricing";

/**
 * SEIN AGENT AUF SEINER SEITE — ER VERKAUFT (Owner 11.09.2026: „für einen Agenten, der nur das macht, verlangen wir 10 € im
 * Monat?" · „er müsste sofort etwas über den Stil sagen und: willst du mehr erfahren? — Ja, mich interessiert dieses
 * Kunstwerk" · „große Künstler benutzen auch solche Motive … der Stil ist trotzdem sehr originell").
 *
 * DER ABLAUF:
 *  1. Gruss und ein Satz über Stil oder Motiv des Werks — geschrieben einmal je Werk und Sprache vom großen Modell,
 *     aus seiner Geschichte, „Über mich" und der Bildanalyse (`api/kuenstler-agent`). Ohne Text: „Îți place arta lui …?"
 *  2. „Vrei să afli mai multe?" — „Da, mă interesează această lucrare" · „Doar mă uit".
 *  3. Bei Ja: was es über DIESES Werk zu wissen gibt, Titel · Technik · Größe · Jahr, der Preis mit dem Künstler — und
 *     Name und Telefon direkt im Fenster (`api/versusforge-mandant`, Schritt „abschluss"). Kein Wechsel auf eine andere Seite.
 *
 * WIE ER AUFGEHT — nach vier Sekunden als Sprechblase (nie von selbst ganz), mit `offen` sofort;
 * zugeklappt bleibt er zu, solange der Tab offen ist. Gezählt wird der Besuch hier, ausser auf seinem eigenen Gerät
 * (`lb_eigen_{name}`, gesetzt von „Seite bearbeiten") und in der Admin-Vorschau (`messen`).
 */
type Intro = { eroeffnung: string; mehr: string; details: string };

export default function KuenstlerAgent({ mandant, name, T, sprache, messen = true, hook = "", offen = false, datenschutz, reproduktion = false, produkt, posterWahl }: {
  mandant: string;
  name: string;
  T: PortalTexte;
  /** Die Sprache der Seite — in ihr spricht der Agent. */
  sprache: string;
  /** Aus in der Admin-Vorschau — der Owner ist kein Besucher. */
  messen?: boolean;
  /** Die Kachel, über die er kam (`?h=`) — der Agent spricht über dieses Werk, die Anfrage weiss es. */
  hook?: string;
  /** Sofort offen (er hat „Vorbește cu agentul meu" getippt). */
  offen?: boolean;
  /** Die Datenschutzseite des Portals. */
  datenschutz: string;
  /**
   * ── REPRODUKTION: ER WÄHLT MATERIAL UND GRÖSSE (Owner 15.09.2026: „wir müssen doch den usern
   * wählen können was er haben will, print auf papier, auf leinwand") ─────────────────────────
   *
   * Nur auf den Seiten der gemeinfreien Meister. Bei einem lebenden Künstler wäre die Frage
   * falsch — dort gibt es ein Original, keine Auflage.
   *
   * KEIN NEUES FELD IM SERVER: Die beiden Antworten reisen als zusätzliche Runden in derselben
   * Anfrage mit, die schon heute ankommt. Eine Frage mehr im Formular, keine Zeile im Speicher.
   */
  reproduktion?: boolean;
  /**
   * Ist diese Kachel ein fertiges Kleidungsstück, gibt es nur dieses eine Material — das Bild
   * zeigt ja schon das Shirt. Leer: ein Druck, alle Materialien.
   */
  produkt?: "tricou" | "hanorac";
  /**
   * Die Wahl zwischen Unikat und Druck — nur bei einem Werk, das der Künstler als Poster
   * freigegeben hat (Owner 16.09.2026). Beide Wege mit Bild, damit der Unterschied sichtbar ist.
   */
  posterWahl?: {
    bild: string; original: string; poster: string; preisPoster: string; preisOriginal?: string;
    /**
     * Das ECHTE Poster als Vorschau (Owner 16.09.2026: „so sieht der Poster nicht aus") — ein
     * Bild mit schwarzem Rand ist kein Poster. Die Seite rendert dasselbe Blatt wie in der
     * Kachel und reicht es hier herein; so kann es nie auseinanderlaufen.
     */
    vorschau?: React.ReactNode;
  };
}) {
  const [zustand, setZustand] = useState<"start" | "zu" | "blase" | "offen">("start");
  const [intro, setIntro] = useState<Intro | null>(null);
  const [antwort, setAntwort] = useState<"" | "ja" | "nein">("");
  const [kname, setKname] = useState("");
  const [telefon, setTelefon] = useState("");
  const [senden, setSenden] = useState<"" | "laeuft" | "fertig" | "fehler">("");
  const [material, setMaterial] = useState(produkt ?? "");
  const [groesse, setGroesse] = useState("");
  const [kasse, setKasse] = useState<"" | "laeuft" | "fehler">("");
  /**
   * ── PREIS UND KAUFKNOPF (Owner 15.09.2026: „er soll gleich bestellen können") ──────────────
   *
   * Der Betrag hier ist NUR das Schild. Verbindlich ist der Betrag, den `api/druck-kasse` aus
   * derselben Tabelle liest (Skill `bezahlung`, Regel 3) — der Browser schickt nur die Wahl.
   * Bei „Altă dimensiune" gibt es keinen Preis und deshalb keinen Kauf, sondern die Anfrage.
   */
  const preisCents = reproduktion ? druckPreisCents(material, groesse) : null;
  const kaufbar = preisCents !== null;
  const zurKasse = async () => {
    if (!kaufbar || kasse === "laeuft") return;
    setKasse("laeuft");
    try {
      const res = await fetch("/api/druck-kasse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, werk, material, groesse, sprache }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string };
      if (!d.ok || !d.url) { setKasse("fehler"); return; }
      window.location.href = d.url;
    } catch { setKasse("fehler"); }
  };
  const n = (s: string) => s.replace(/\{name\}/g, name);
  const merk = `lb_kuenstler_agent_${mandant}`;
  const werk = /^-?\d+$/.test(hook) ? hook : "-1";

  useEffect(() => {
    let eigen = false;
    try { eigen = localStorage.getItem(`lb_eigen_${mandant}`) === "1"; } catch { /* egal */ }
    if (!eigen && messen) schrittMessen(mandant, "seite");

    if (offen) { setZustand("offen"); return; }
    let zu = false;
    try { zu = sessionStorage.getItem(merk) === "zu"; } catch { /* egal */ }
    if (zu) { setZustand("zu"); return; }
    /* ── ER MELDET SICH GAR NICHT MEHR VON SELBST (Owner 17.09.2026: „Agent stört, weil er
       automatisch ausklappt. Überall ausschalten, das automatische Ausklappen") ────────────
       Erst ging nach vier Sekunden das ganze Fenster auf, dann immerhin nur noch eine
       Sprechblase — aber auch die legte sich über die Poster, die der Besucher gerade ansieht.
       Jetzt bleibt der Kreis unten rechts stehen, und aufgemacht wird er nur, wenn jemand ihn
       antippt. Wer reden will, findet ihn; wer schaut, wird nicht unterbrochen. */
    setZustand("zu");
  }, [mandant, merk, messen, offen]);

  /* Sein erster Satz zum Werk — erst, wenn er wirklich aufgeht. Scheitert es, bleibt die feste Frage. */
  const sichtbar = zustand === "offen" || zustand === "blase";
  useEffect(() => {
    if (!sichtbar || intro) return;
    let weg = false;
    fetch("/api/kuenstler-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mandant, i: werk, sprache }),
    })
      .then(r => r.json())
      .then((d: Partial<Intro>) => {
        if (!weg) setIntro({ eroeffnung: String(d.eroeffnung ?? ""), mehr: String(d.mehr ?? ""), details: String(d.details ?? "") });
      })
      .catch(() => { if (!weg) setIntro({ eroeffnung: "", mehr: "", details: "" }); });
    return () => { weg = true; };
  }, [sichtbar, intro, mandant, werk, sprache]);

  const zuklappen = () => {
    setZustand("zu");
    try { sessionStorage.setItem(merk, "zu"); } catch { /* egal */ }
  };
  const antworten = (a: "ja" | "nein") => {
    setAntwort(a);
    /* Bei „Da" bekommt der Künstler eine Mail — welches Werk, geht mit (Owner 11.09.2026). */
    if (a === "ja" && messen) schrittMessen(mandant, "start", werk);
    setZustand("offen");
  };
  /* Bei einer Reproduktion gehören Material und Größe zur Anfrage — ohne sie kann niemand
     einen Preis nennen, und genau darum geht es (Owner 15.09.2026). */
  const bereit = kname.trim().length >= 2 && telefon.replace(/[^0-9]/g, "").length >= 6
    && (!reproduktion || (!!material && !!groesse));
  const abschicken = async () => {
    if (!bereit || senden === "laeuft") return;
    setSenden("laeuft");
    try {
      const res = await fetch("/api/versusforge-mandant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schritt: "abschluss",
          mandant,
          name: kname.trim(),
          telefon: telefon.trim(),
          hook: werk,
          einstieg: T.agentJa,
          runden: [
            ...(intro?.eroeffnung ? [{ frage: intro.eroeffnung, antwort: T.agentJa }] : [{ frage: n(T.agentFrage), antwort: T.agentJa }]),
            ...(reproduktion ? [
              { frage: T.druckMaterial, antwort: material },
              { frage: T.druckGroesse, antwort: groesse },
            ] : []),
          ],
        }),
      });
      if (!res.ok) { setSenden("fehler"); return; }
      setSenden("fertig");
      if (messen) schrittMessen(mandant, "abschluss");
    } catch {
      setSenden("fehler");
    }
  };

  const blase = "max-w-[88%] rounded-2xl rounded-bl-md bg-[#f2f2f2] px-4 py-3 text-[15.5px] leading-[1.45] text-[#111]";
  const eigene = "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#111] px-4 py-3 text-[15.5px] font-semibold leading-[1.45] text-white";
  const knopf = "rounded-full border-[1.5px] border-[#111] bg-white px-4 py-2 text-left text-[14.5px] font-semibold leading-[1.3] text-[#111] transition hover:bg-[#111] hover:text-white";
  const feld = "mt-1 block w-full rounded-xl border border-[#dcdcdc] px-3 py-2.5 text-[16px] outline-none focus:border-[#111]";

  const knoepfe = (
    <div className="flex flex-wrap gap-2 pt-1">
      <button type="button" onClick={() => antworten("ja")} className={knopf}>{T.agentJa}</button>
      <button type="button" onClick={() => antworten("nein")} className={knopf}>{T.agentNein}</button>
    </div>
  );

  return (
    <>
      {zustand === "offen" && (
        <div role="dialog" aria-label={`${name} · ${T.agentTitel}`}
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-white md:inset-auto md:bottom-5 md:right-5 md:max-h-[min(660px,calc(100dvh-40px))] md:w-[390px] md:rounded-2xl md:border md:border-[#e5e5e5] md:shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
            <span className="text-[15px] font-bold tracking-[-0.01em] text-[#111]">{name} · {T.agentTitel}</span>
            <button type="button" onClick={zuklappen} aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full text-[#555] hover:bg-[#f2f2f2] hover:text-[#111]">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
            <p className={`m-0 ${blase}`}>{n(T.agentHallo)}</p>
            {/* NIE EIN HALBES FENSTER (Owner 11.09.2026: „der Agent lädt nicht sofort, zuerst nur die Hälfte") — Frage und Knöpfe
                stehen sofort; der Satz zum Stil erscheint, sobald er da ist. */}
            {intro?.eroeffnung && <p className={`m-0 ${blase}`}>{intro.eroeffnung}</p>}
            {/* ── ZWEI WEGE, WENN ES DAS WERK AUCH ALS POSTER GIBT (Owner 16.09.2026: „falls
                poster gibts das bild vom poster und das original — kunde muss wählen was er
                kaufen will") ───────────────────────────────────────────────────────────────
                Das Original ist ein Unikat und Verhandlungssache; das Poster kostet einen festen
                Preis und ist einen Klick entfernt. Wer hier steht, soll beides nebeneinander
                sehen, statt sich für den einen Weg zu entscheiden, den wir ihm zeigen. */}
            {posterWahl ? (
              <>
                <p className={`m-0 ${blase} font-semibold`}>{T.agentWahl}</p>
                {/* ── BEIDE KARTEN GLEICH HOCH, SCHRIFT AUF EINER LINIE (Owner 16.09.2026:
                    „schrift auf einer höhe und ohne die dünne linie. vielleicht original
                    grösser") ──────────────────────────────────────────────────────────────
                    Das Poster ist hochkant, das Werk meist quer — ohne feste Bildhöhe rutschte
                    die eine Beschriftung tiefer als die andere und die Karten sahen aus wie zwei
                    verschiedene Dinge. Jetzt steht jedes Bild in einem Feld gleicher Höhe, und
                    darunter beginnt der Text auf derselben Linie. Kein Rahmen um die Karten —
                    die Bilder selbst sind der Unterschied. */}
                <div className="grid grid-cols-2 gap-3">
                  {/* ── DAS ORIGINAL BLEIBT IM GESPRÄCH (Owner 16.09.2026: „klick auf original soll
                      nicht den agenten beenden, kein link raus, sondern weiter zur adresse,
                      email") ──────────────────────────────────────────────────────────────────
                      Ein Unikat kauft man nicht mit einem Klick — man meldet sich. Der Knopf führt
                      deshalb genau dorthin, wo der Agent ohnehin hinwill: zum Feld für Name und
                      Adresse. Nur das Poster führt hinaus, weil es dort eine Kasse gibt. */}
                  <button type="button" onClick={() => antworten("ja")} className="text-center text-[#111]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {/* Ganz zu sehen, nicht beschnitten (Owner 16.09.2026) — und in einem Feld
                        fester Höhe, damit beide Beschriftungen auf einer Linie stehen. */}
                    <span className="mb-2 flex h-[150px] items-end justify-center">
                    <img src={posterWahl.bild} alt="" className="block h-full w-auto max-w-full object-contain shadow-[0_6px_18px_rgba(20,24,28,.22)]" />
                    </span>
                    <span className="block text-[13.5px] font-semibold">{T.agentWahlOriginal}</span>
                    {posterWahl.preisOriginal ? <span className="mt-0.5 block text-[12.5px] text-[#777]">{posterWahl.preisOriginal}</span> : null}
                  </button>
                  <a href={posterWahl.poster} className="text-center text-[#111] no-underline">
                    <span className="mb-2 flex h-[150px] items-end justify-center">
                    {posterWahl.vorschau ? (
                      <span className="block w-[104px] shadow-[0_6px_18px_rgba(20,24,28,.22)]">{posterWahl.vorschau}</span>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={posterWahl.bild} alt="" className="block h-full w-auto max-w-full object-contain shadow-[0_6px_18px_rgba(20,24,28,.22)]" />
                    )}
                    </span>
                    <span className="block text-[13.5px] font-semibold">{T.agentWahlPoster}</span>
                    <span className="mt-0.5 block text-[12.5px] text-[#777]">{posterWahl.preisPoster}</span>
                  </a>
                </div>
              </>
            ) : null}
            <p className={`m-0 ${blase} font-semibold`}>{T.agentMehrFrage}</p>
            {antwort === "" && knoepfe}
            {antwort === "ja" && (
              <>
                <p className={`m-0 ${eigene}`}>{T.agentJa}</p>
                {intro?.mehr && <p className={`m-0 ${blase}`}>{intro.mehr}</p>}
                {intro?.details && <p className={`m-0 ${blase} text-[14px] text-[#555]`}>{intro.details}</p>}
                <p className={`m-0 ${blase}`}>{reproduktion ? T.druckWaehlen : `${n(T.agentPreis)} ${n(T.agentJaText)}`}</p>
                {senden === "fertig" ? (
                  <p className={`m-0 ${blase} font-semibold`}>{reproduktion ? T.druckDanke : n(T.agentDanke)}</p>
                ) : (
                  <form className="mt-1 rounded-2xl border border-[#e5e5e5] p-3.5" onSubmit={e => { e.preventDefault(); void abschicken(); }}>
                    {/* ── ZUERST, WAS ER HABEN WILL (Owner 15.09.2026) ────────────────────────
                        Vor Name und Telefon: Er soll die Wahl treffen, solange er noch beim Bild
                        ist — nicht nachdem er seine Nummer getippt hat. */}
                    {reproduktion && (
                      <>
                        <label className="block text-[13px] font-semibold text-[#555]">
                          {T.druckMaterial}
                          <select value={material} onChange={e => { setMaterial(e.target.value); setGroesse(""); }} className={feld}>
                            <option value="">—</option>
                            {/* Der WERT ist der Schlüssel der Preistabelle, die Beschriftung die Sprache
                                des Betrachters (lib/lakatosbandi-druck.ts). */}
                            {/* Eine Shirt-Kachel bietet nur das Shirt an — sonst bestellte
                                jemand das Foto des Shirts auf Leinwand. */}
                            {!produkt && <option value="papier">{T.druckPapier}</option>}
                            {!produkt && <option value="leinwand">{T.druckLeinwand}</option>}
                            {(!produkt || produkt === "tricou") && <option value="tricou">{T.druckTricou}</option>}
                            {(!produkt || produkt === "hanorac") && <option value="hanorac">{T.druckHanorac}</option>}
                          </select>
                        </label>
                        <label className="mt-2.5 block text-[13px] font-semibold text-[#555]">
                          {T.druckGroesse}
                          <select value={groesse} onChange={e => setGroesse(e.target.value)} className={feld}>
                            <option value="">—</option>
                            {/* DIE LISTE HÄNGT AM MATERIAL: Zentimeter am Druck, S–XXL am Shirt.
                                Eine gemeinsame Liste hätte „XL" beim Poster erlaubt. */}
                            {druckGroessenFuer(material).map(g => (
                              <option key={g} value={g}>{g.includes("x") ? g.replace("x", " × ") + " cm" : g}</option>
                            ))}
                            <option value="andere">{T.druckGroesseAndere}</option>
                          </select>
                        </label>
                        {/* ── KAUFEN STATT FRAGEN, SOBALD DER PREIS FESTSTEHT ────────────────
                            Steht die Größe in der Tabelle, sieht er den Preis und kauft; bei
                            «Altă dimensiune» bleibt es bei Name und Telefon, weil niemand einen
                            Preis nennen kann, den es noch nicht gibt. */}
                        {kaufbar && preisCents !== null && (
                          <div className="mt-3 rounded-xl bg-[#f7f7f7] p-3">
                            <p className="m-0 text-[20px] font-black leading-none text-[#111]">{eur(preisCents, sprache)}</p>
                            <p className="m-0 mt-1 text-[12.5px] leading-[1.4] text-[#777]">{T.druckVersandDrin.replace("{versand}", eur(DRUCK_VERSAND_CENTS, sprache))}</p>
                            <button type="button" onClick={() => void zurKasse()} disabled={kasse === "laeuft"}
                              className="mt-2.5 w-full bg-[#111] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-40">
                              {kasse === "laeuft" ? "…" : T.druckKaufen}
                            </button>
                            {kasse === "fehler" && <p className="m-0 mt-2 text-[13.5px] font-semibold text-[#b3261e]">{T.agentFehler}</p>}
                          </div>
                        )}
                        <div className="mt-3 h-px bg-[#eee]" />
                      </>
                    )}
                    {/* Name und Telefon nur ohne Kaufweg — wer kauft, gibt sie bei Stripe an. */}
                    {!kaufbar && (
                    <>
                    <label className="mt-2.5 block text-[13px] font-semibold text-[#555]">
                      {T.agentFeldName}
                      <input value={kname} onChange={e => setKname(e.target.value)} autoComplete="name" maxLength={120} className={feld} />
                    </label>
                    <label className="mt-2.5 block text-[13px] font-semibold text-[#555]">
                      {T.agentFeldTelefon}
                      <input value={telefon} onChange={e => setTelefon(e.target.value)} type="tel" autoComplete="tel" maxLength={60} className={feld} />
                    </label>
                    </>
                    )}
                    {!kaufbar && (
                    <button type="submit" disabled={!bereit || senden === "laeuft"}
                      className="mt-3 w-full bg-[#111] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-40">
                      {senden === "laeuft" ? "…" : T.agentSenden}
                    </button>
                    )}
                    {senden === "fehler" && <p className="m-0 mt-2 text-[13.5px] font-semibold text-[#b3261e]">{T.agentFehler}</p>}
                    <p className="m-0 mt-2.5 text-[12.5px] leading-[1.4] text-[#777]">
                      {reproduktion ? (kaufbar ? T.druckDatenschutz : T.druckPreisText) : n(T.agentDatenschutz)} <a href={datenschutz} target="_blank" rel="noopener" className="underline">{T.agentDatenschutzLink}</a>
                    </p>
                  </form>
                )}
              </>
            )}
            {antwort === "nein" && (
              <>
                <p className={`m-0 ${eigene}`}>{T.agentNein}</p>
                <p className={`m-0 ${blase}`}>{n(T.agentNeinText)}</p>
              </>
            )}
          </div>
        </div>
      )}

      {zustand === "blase" && (
        <div className="fixed bottom-5 right-4 z-[70] w-[min(330px,calc(100vw-32px))] rounded-2xl border border-[#e5e5e5] bg-white p-4 shadow-[0_16px_50px_rgba(0,0,0,0.16)]">
          <button type="button" onClick={zuklappen} aria-label="Close"
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-[#888] hover:text-[#111]">
            <X className="h-4 w-4" aria-hidden />
          </button>
          <span className="block pr-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#888]">{name} · {T.agentTitel}</span>
          <span className="mt-1.5 block text-[15px] leading-[1.45] text-[#111]">{n(T.agentHallo)}{intro?.eroeffnung ? ` ${intro.eroeffnung}` : ""}</span>
          <span className="mt-1 block text-[15px] font-semibold leading-[1.45] text-[#111]">{T.agentMehrFrage}</span>
          <div className="mt-2">{knoepfe}</div>
        </div>
      )}

      {zustand === "zu" && (
        <button type="button" onClick={() => setZustand("offen")} aria-label={T.agentTitel}
          className="fixed bottom-5 right-4 z-[70] grid h-14 w-14 place-items-center rounded-full bg-[#111] text-white shadow-[0_12px_36px_rgba(0,0,0,0.25)] md:right-5">
          <MessageCircle className="h-6 w-6" aria-hidden />
        </button>
      )}
    </>
  );
}
