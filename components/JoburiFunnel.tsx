"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mail } from "lucide-react";
import { Knopf, Kasten, Eingabe, Fehlerzeile, Fortschritt, Haken } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import type { JoburiTexte } from "@/lib/joburi-texte";

/**
 * TALENT MARKET PULSE — DER TRICHTER FRAGT, STATT ZU ZEIGEN (Owner 31.08.2026).
 *
 * „Wir wollen nicht mehr primär Jobs anzeigen, sondern herausfinden, zu welchen Bedingungen
 * deutschsprachige Menschen in Rumänien oder der Diaspora den Job wechseln würden."
 *
 * WARUM DAS BESSER IST ALS DIE STELLENLISTE DAVOR: Die Liste konnte nur so gut sein wie der
 * Bestand — und der stand bei null. Eine Studie braucht keinen Bestand; sie liefert vom
 * ersten Besucher an das, was kein Jobportal hat: den PREIS eines Wechsels, aus dem Mund der
 * Leute selbst. Genau das verkauft `/recruiting` an Firmen.
 *
 * DIE REIHENFOLGE IST WEITER DER GANZE PUNKT:
 *   1. Sieben Fragen, alle per Klick, EINE JE BILDSCHIRM. Kein Tippfeld, keine Person.
 *   2. Seine eigenen Antworten als Zusammenfassung — und KEINE erfundene Marktzahl dazu.
 *   3. Erst dann die Adresse, und zwar nur sie: kein Name, kein Telefon, kein Lebenslauf.
 *
 * WAS UNVERÄNDERT BLEIBT (Owner: „vorhandene Komponenten, Lead-Speicherung, Admin und
 * Consent-Logik wiederverwenden"): derselbe Lead-Speicher, dieselbe Route mit denselben
 * Schritten, dieselbe Einwilligung samt der Zusage, dass nichts automatisch an Arbeitgeber
 * geht, dieselben CI-Bausteine.
 */

type Schritt = "land" | "deutsch" | "suche" | "gehalt" | "faktoren" | "rueckkehr" | "feld" | "summe" | "mail" | "danke";

export default function JoburiFunnel({ T, lang }: { T: JoburiTexte; lang: string }) {
  const [schritt, setSchritt] = useState<Schritt>("land");
  /**
   * DIE KENNUNG LIEGT IN EINEM REF, NICHT IM ZUSTAND (31.08.2026 gemessen: ohne das legte
   * JEDE ANTWORT EINEN EIGENEN DATENSATZ AN — sieben Fragmente statt eines Kandidaten, und
   * die Studie wäre wertlos gewesen).
   *
   * Ein `useState` wird erst zum nächsten Bild sichtbar; wer schnell klickt, schickt die
   * zweite Antwort noch mit leerer Kennung los, und der Server legt gutgläubig einen neuen
   * Lead an. Ein Ref steht in derselben Sekunde, in der die Antwort ankommt.
   */
  const leadIdRef = useRef("");

  const [land, setLand] = useState("");
  const [deutsch, setDeutsch] = useState("");
  const [suche, setSuche] = useState("");
  const [gehalt, setGehalt] = useState("");
  const [faktoren, setFaktoren] = useState<string[]>([]);
  const [rueckkehr, setRueckkehr] = useState("");
  const [feld, setFeld] = useState("");

  const [mail, setMail] = useState("");
  const [haken, setHaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");

  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  /** Wer in Rumänien arbeitet, wird nicht nach Rückkehr gefragt — er ist schon da. */
  const inDiaspora = land !== "" && land !== "ro";

  /* Die Herkunft wird beim ERSTEN Schritt gelesen — wer danach aussteigt, ist trotzdem
     einer Anzeige zuzuordnen. */
  const quelle = (): Record<string, string> => {
    const utm: Record<string, string> = {};
    try {
      const q = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(k => { const v = q.get(k); if (v) utm[k] = v; });
      if (!utm.utm_source) {
        const alt = q.get("src") || q.get("source") || q.get("ref") || "";
        if (alt) utm.utm_source = alt;
      }
    } catch { /**/ }
    return utm;
  };

  useEffect(() => { void logFunnelEvent("start_clicked", { theme: "joburi" }); }, []);

  /**
   * NACH JEDER ANTWORT SPEICHERN, NICHT ERST AM ENDE.
   *
   * Wer bei Frage fünf aussteigt, hat vier Antworten gegeben — und die sind für die Studie
   * genauso viel wert wie sieben. Ein Speichern erst am Schluss hätte sie weggeworfen und
   * dazu die Frage unbeantwortet gelassen, an welcher Stelle die Leute abbrechen.
   */
  /**
   * UND SIE LAUFEN NACHEINANDER, NICHT NEBENEINANDER.
   *
   * Das Ref allein reicht nicht: Wer die zweite Frage antippt, bevor die erste Antwort vom
   * Server zurück ist, hat immer noch keine Kennung — und bekäme einen zweiten Datensatz.
   * Jede Speicherung hängt sich deshalb an die vorherige an. Für den Nutzer ändert das
   * nichts; er wartet nie, weil die Anzeige sofort weiterspringt.
   */
  const kette = useRef<Promise<void>>(Promise.resolve());

  const merken = (teil: Record<string, unknown>) => {
    kette.current = kette.current.then(async () => {
      try {
        const d = await fetch("/api/joburi-lead", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schritt: "antworten", id: leadIdRef.current, device: geraet(), lang, utm: quelle(), ...teil }),
        }).then(r => r.json());
        if (d?.id) leadIdRef.current = String(d.id);
      } catch { /* die Anzeige läuft weiter; der nächste Schritt schreibt es erneut mit */ }
    });
    return kette.current;
  };

  const kontaktSenden = async () => {
    if (!mailOk) { setFehler(T.mailFehlt); return; }
    if (!haken) { setFehler(T.hakenFehlt); return; }
    setBusy(true); setFehler("");
    try {
      /* Erst wenn alle Antworten geschrieben sind, steht die Kennung fest — sonst hinge die
         Adresse an einem Datensatz ohne Antworten. */
      await kette.current;
      const d = await fetch("/api/joburi-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "kontakt", id: leadIdRef.current, email: mail.trim(), kontaktOk: true }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); return; }
      void logTunnelEvent("lead_created", "joburi");
      setSchritt("danke");
    } catch { setFehler(T.technischerFehler); }
    setBusy(false);
  };

  /* ─────────────────────────── Bausteine ─────────────────────────── */

  const Wahl = ({ optionen, waehlen }: { optionen: { wert: string; text: string }[]; waehlen: (w: string) => void }) => (
    <div className="mt-4 flex flex-col gap-2">
      {optionen.map(o => (
        <button key={o.wert} type="button" onClick={() => waehlen(o.wert)}
          className="flex h-12 items-center justify-between gap-3 rounded-full border border-white/20 bg-white/5 px-5 text-left text-[15px] font-black text-white/90 transition active:scale-[0.98]">
          {o.text}
          <span className="shrink-0 text-white/35">→</span>
        </button>
      ))}
    </div>
  );

  /** Eine Frage — Kasten, Überschrift, Hinweis, Antworten, Rückweg. */
  const Frage = ({ titel, hinweis, zurueck, children }: {
    titel: string; hinweis?: string; zurueck?: Schritt; children: React.ReactNode;
  }) => (
    <Kasten polster="p-5">
      <h2 className="text-[19px] font-black leading-snug text-white">{titel}</h2>
      {hinweis && <p className="mt-1 text-[13px] font-medium text-white/60">{hinweis}</p>}
      {children}
      {zurueck && (
        <button type="button" onClick={() => setSchritt(zurueck)}
          className="mt-3 text-[12.5px] font-bold text-white/45 underline underline-offset-2">{T.zurueck}</button>
      )}
    </Kasten>
  );

  /* ─────────────────────────── Die Fragen ─────────────────────────── */

  if (schritt === "land") {
    return (
      <Frage titel={T.fLand}>
        <Wahl
          optionen={[
            { wert: "ro", text: T.landRo }, { wert: "de", text: T.landDe },
            { wert: "at", text: T.landAt }, { wert: "alta", text: T.landAlta },
          ]}
          waehlen={w => { setLand(w); void merken({ land: w }); setSchritt("deutsch"); }} />
      </Frage>
    );
  }

  if (schritt === "deutsch") {
    return (
      <Frage titel={T.frage1} hinweis={T.frage1Hinweis} zurueck="land">
        <Wahl
          optionen={[
            { wert: "A2", text: T.niveauA2 }, { wert: "B1", text: T.niveauB1 },
            { wert: "B2", text: T.niveauB2 }, { wert: "C1", text: T.niveauC1 },
            { wert: "C2", text: T.niveauC2 },
          ]}
          waehlen={w => { setDeutsch(w); void merken({ deutsch: w }); setSchritt("suche"); }} />
      </Frage>
    );
  }

  if (schritt === "suche") {
    return (
      <Frage titel={T.frage4} zurueck="deutsch">
        <Wahl
          optionen={[
            { wert: "aktiv", text: T.sucheAktiv }, { wert: "offen", text: T.sucheOffen },
            { wert: "passiv", text: T.suchePassiv },
          ]}
          waehlen={w => { setSuche(w); void merken({ suche: w }); setSchritt("gehalt"); }} />
      </Frage>
    );
  }

  /* DIE FRAGE, UM DIE ES GEHT. Als Stufe und nicht als offenes Feld: Eine leere Zahl
     beantwortet kaum jemand, eine Spanne fast jeder — und für die Auswertung reicht sie. */
  if (schritt === "gehalt") {
    return (
      <Frage titel={T.fGehalt} hinweis={T.fGehaltHinweis} zurueck="suche">
        <Wahl
          optionen={[
            { wert: "800", text: T.gehalt800 }, { wert: "1200", text: T.gehalt1200 },
            { wert: "1600", text: T.gehalt1600 }, { wert: "2000", text: T.gehalt2000 },
            { wert: "2500", text: T.gehalt2500 }, { wert: "3000+", text: T.gehalt3000 },
          ]}
          waehlen={w => { setGehalt(w); void merken({ wechselGehalt: w }); setSchritt("faktoren"); }} />
      </Frage>
    );
  }

  /* MEHRFACHWAHL — deshalb als Einzige mit einem Weiter-Knopf. Ohne Auswahl bleibt er
     stumm: Eine leere Antwort wäre kein Datensatz, sondern ein Loch in der Studie. */
  if (schritt === "faktoren") {
    const um = (w: string) => setFaktoren(f => f.includes(w) ? f.filter(x => x !== w) : [...f, w]);
    const OPT = [
      { wert: "salariu", text: T.faktorSalariu }, { wert: "remote", text: T.faktorRemote },
      { wert: "flexibilitate", text: T.faktorFlex }, { wert: "cariera", text: T.faktorCariera },
      { wert: "stabilitate", text: T.faktorStabil }, { wert: "echipa", text: T.faktorEchipa },
    ];
    return (
      <Frage titel={T.fFaktoren} hinweis={T.fFaktorenHinweis} zurueck="gehalt">
        <div className="mt-4 flex flex-col gap-2">
          {OPT.map(o => {
            const an = faktoren.includes(o.wert);
            /* Gewählt wechselt die FARBE, nicht die Grösse — sonst springt die Liste beim
               Antippen (Hausregel „Auswahl verschiebt NIE"). */
            return (
              <button key={o.wert} type="button" onClick={() => um(o.wert)}
                className={`flex h-12 items-center justify-between gap-3 rounded-full border px-5 text-left text-[15px] font-black transition active:scale-[0.98] ${
                  an ? "border-[#f6cf51] bg-[#f6cf51]/10 text-[#f6cf51]" : "border-white/20 bg-white/5 text-white/90"}`}>
                {o.text}
                {an && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <Knopf art="gold" disabled={!faktoren.length}
            onClick={() => { void merken({ faktoren }); setSchritt(inDiaspora ? "rueckkehr" : "feld"); }}>
            {T.weiter}
          </Knopf>
        </div>
      </Frage>
    );
  }

  /* NUR FÜR DIE DIASPORA: Wer in Rumänien arbeitet, kann nicht zurückkehren — die Frage
     wäre dort nicht nur überflüssig, sondern unverständlich. */
  if (schritt === "rueckkehr") {
    return (
      <Frage titel={T.fRueckkehr} zurueck="faktoren">
        <Wahl
          optionen={[
            { wert: "da", text: T.rueckDa }, { wert: "poate", text: T.rueckPoate },
            { wert: "nu", text: T.rueckNu },
          ]}
          waehlen={w => { setRueckkehr(w); void merken({ rueckkehr: w }); setSchritt("feld"); }} />
      </Frage>
    );
  }

  if (schritt === "feld") {
    return (
      <Frage titel={T.fBerufsfeld} zurueck={inDiaspora ? "rueckkehr" : "faktoren"}>
        <Wahl
          optionen={[
            { wert: "suport", text: T.feldSuport }, { wert: "it", text: T.feldIt },
            { wert: "finante", text: T.feldFinante }, { wert: "logistica", text: T.feldLogistica },
            { wert: "inginerie", text: T.feldInginerie }, { wert: "vanzari", text: T.feldVanzari },
            { wert: "sanatate", text: T.feldSanatate }, { wert: "altul", text: T.feldAltul },
          ]}
          waehlen={w => { setFeld(w); void merken({ berufsfeld: w }); setSchritt("summe"); }} />
      </Frage>
    );
  }

  /* ── Die Zusammenfassung: NUR seine eigenen Antworten ──
     KEINE MARKTZAHL (Owner 31.08.2026: „Keine erfundenen Marktwerte oder Benchmarks
     anzeigen."). Wir haben noch keine Studie; eine Zahl an dieser Stelle wäre geraten, und
     genau daran zerbricht das Vertrauen, das der ganze Trichter aufbaut. Was wir zeigen
     können, ist er selbst — sauber zurückgespiegelt. */
  if (schritt === "summe") {
    const w: Record<string, string> = {
      land: { ro: T.landRo, de: T.landDe, at: T.landAt, alta: T.landAlta }[land] ?? land,
      suche: { aktiv: T.sucheAktiv, offen: T.sucheOffen, passiv: T.suchePassiv }[suche] ?? suche,
      gehalt: { "800": T.gehalt800, "1200": T.gehalt1200, "1600": T.gehalt1600,
                "2000": T.gehalt2000, "2500": T.gehalt2500, "3000+": T.gehalt3000 }[gehalt] ?? gehalt,
      rueckkehr: { da: T.rueckDa, poate: T.rueckPoate, nu: T.rueckNu }[rueckkehr] ?? rueckkehr,
      feld: { suport: T.feldSuport, it: T.feldIt, finante: T.feldFinante, logistica: T.feldLogistica,
              inginerie: T.feldInginerie, vanzari: T.feldVanzari, sanatate: T.feldSanatate,
              altul: T.feldAltul }[feld] ?? feld,
      faktoren: faktoren.map(f => ({ salariu: T.faktorSalariu, remote: T.faktorRemote,
        flexibilitate: T.faktorFlex, cariera: T.faktorCariera, stabilitate: T.faktorStabil,
        echipa: T.faktorEchipa }[f] ?? f)).join(" · "),
    };
    const zeilen: [string, string][] = [
      [T.summeLand, w.land],
      [T.summeDeutsch, deutsch],
      [T.summeStatus, w.suche],
      [T.summeGehalt, w.gehalt],
      [T.summeFaktoren, w.faktoren],
      ...(inDiaspora && rueckkehr ? ([[T.summeRueckkehr, w.rueckkehr]] as [string, string][]) : []),
      [T.summeFeld, w.feld],
    ];
    return (
      <div className="flex flex-col gap-3">
        <Kasten polster="p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">{T.summeTitel}</p>
          <dl className="mt-3">
            {zeilen.map(([k, v], i) => (
              <div key={k} className={`flex items-baseline justify-between gap-4 py-2 ${i > 0 ? "border-t border-white/12" : ""}`}>
                <dt className="shrink-0 text-[12.5px] font-bold text-white/60">{k}</dt>
                <dd className="text-right text-[13.5px] font-black text-white/90">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[12.5px] font-medium leading-snug text-white/55">{T.summeHinweis}</p>
        </Kasten>
        <Knopf art="gold" onClick={() => setSchritt("mail")}>{T.studieKnopf}</Knopf>
      </div>
    );
  }

  /* ── Die Adresse — und NUR sie ──
     Kein Name, kein Telefon, kein Lebenslauf (Owner 31.08.2026). Die Einwilligung ist
     dieselbe wie bisher, samt der Zusage darunter, dass nichts automatisch an Arbeitgeber
     geht — das ist die Sorge, mit der jemand seine Adresse zurückhält. */
  if (schritt === "mail") {
    return (
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.mailStudieTitel}</h2>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/75">{T.mailStudieText}</p>

        <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{T.mailLabel}</label>
        <Eingabe className="mt-1.5" type="email" inputMode="email" value={mail} symbol={<Mail className="h-4 w-4" />}
          onChange={e => { setMail(e.target.value); setFehler(""); }} placeholder={T.mailPlatzhalter} />
        <p className="mt-1.5 text-[12px] font-medium text-white/45">{T.mailKeinSpam}</p>

        <div className="mt-4">
          <Haken an={haken} setzen={setHaken} pflicht>{T.haken}</Haken>
        </div>
        <p className="mt-2 text-[12.5px] font-black leading-snug text-white/85">{T.datenschutzZusage}</p>

        <Fehlerzeile>{fehler}</Fehlerzeile>
        <div className="mt-3">
          {busy ? <Fortschritt text={T.mailLaeuft} /> : <Knopf art="gold" onClick={() => void kontaktSenden()}>{T.studieKnopf}</Knopf>}
        </div>
        <button type="button" onClick={() => setSchritt("summe")}
          className="mt-3 text-[12.5px] font-bold text-white/45 underline underline-offset-2">{T.zurueck}</button>
      </Kasten>
    );
  }

  /* ── Danke — kein Versprechen, das ein leerer Bestand brechen könnte ── */
  return (
    <Kasten art="gold" polster="p-5">
      <p className="flex items-start gap-2.5 text-[16px] font-black leading-snug text-white">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#f6cf51]" />
        {T.dankeTitelStudie}
      </p>
      <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-white/80">{T.dankeTextStudie}</p>
    </Kasten>
  );
}
