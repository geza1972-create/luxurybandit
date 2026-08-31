"use client";

import { useEffect, useState } from "react";
import { Check, Lock, Mail, MapPin, ExternalLink } from "lucide-react";
import { Knopf, Kasten, Eingabe, Fehlerzeile, Fortschritt, Haken } from "@/components/CI";
import { logFunnelEvent, logTunnelEvent } from "@/lib/track-funnel";
import type { JoburiTexte } from "@/lib/joburi-texte";
import type { Stelle, Guete } from "@/lib/joburi-store";

/** Die Stelle, wie der Server sie liefert — mit der berechneten Güte daran. */
type Treffer = Stelle & { guete?: Guete };

/**
 * DER JOBURI-TRICHTER (Owner 31.08.2026).
 *
 * WARUM ES IHN NEBEN DAVID GIBT: „Menschen wollen keinen Pre-Screening-Agenten. Sie wollen
 * einen besseren Job." David verkauft das Verfahren, dieser Trichter verspricht das Ziel —
 * und liefert es, bevor er etwas verlangt.
 *
 * DIE REIHENFOLGE IST DER GANZE PUNKT:
 *   1. Drei Fragen, alle per KLICK. Kein Tippfeld, keine persönliche Angabe.
 *   2. ECHTE Stellen als Vorschau — Titel, Firma, Gehalt. Zwei sichtbar, der Rest verdeckt.
 *   3. Erst jetzt die Adresse, gegen die volle Liste. Sie hat damit einen Gegenwert.
 *   4. Der Lebenslauf ist ein Upgrade, kein Eintrittspreis.
 *
 * GEMESSEN AN DAVID, WORAUS DAS GELERNT IST: Dort standen zwei Tippfelder vor jeder
 * Leistung — von 19 bis 27 Besuchern der ersten Anzeige kam keiner durch den ersten Schritt.
 */

type Schritt = "f1" | "f2" | "f3" | "f4" | "teaser" | "mail" | "liste";

export default function JoburiFunnel({ T, lang }: { T: JoburiTexte; lang: string }) {
  const [schritt, setSchritt] = useState<Schritt>("f1");
  const [leadId, setLeadId] = useState("");
  const [deutsch, setDeutsch] = useState("");
  const [form, setForm] = useState("");
  const [ziel, setZiel] = useState("");

  const [stellen, setStellen] = useState<Treffer[]>([]);
  const [anzahl, setAnzahl] = useState(0);
  const [laedt, setLaedt] = useState(false);

  const [mail, setMail] = useState("");
  const [haken, setHaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  /* Welche Stellen er schon beantwortet hat — je Stelle eine eigene Zustimmung. */
  const [weitergaben, setWeitergaben] = useState<Record<string, boolean>>({});

  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

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

  /** Speichert die drei Antworten und holt die passenden Stellen. */
  const antwortenSenden = async (a: { deutsch: string; form: string; ziel: string; suche: string }) => {
    setLaedt(true); setFehler("");
    try {
      const d = await fetch("/api/joburi-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schritt: "antworten", id: leadId,
          deutsch: a.deutsch, arbeitsform: a.form, ziel: a.ziel, suche: a.suche,
          device: geraet(), lang, utm: quelle(),
        }),
      }).then(r => r.json());
      if (d?.id) setLeadId(String(d.id));

      const q = new URLSearchParams({ deutsch: a.deutsch, arbeitsform: a.form, ziel: a.ziel });
      const j = await fetch(`/api/joburi?${q.toString()}`).then(r => r.json());
      setStellen(Array.isArray(j?.stellen) ? j.stellen : []);
      setAnzahl(Number(j?.anzahl) || 0);
      void logFunnelEvent("joburi_treffer", { theme: "joburi" });
    } catch { setFehler(T.technischerFehler); }
    setLaedt(false);
    setSchritt("teaser");
  };

  const kontaktSenden = async () => {
    if (!mailOk) { setFehler(T.mailFehlt); return; }
    if (!haken) { setFehler(T.hakenFehlt); return; }
    setBusy(true); setFehler("");
    try {
      const d = await fetch("/api/joburi-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schritt: "kontakt", id: leadId, email: mail.trim(), kontaktOk: true,
        }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); return; }
      void logTunnelEvent("lead_created", "joburi");

      /* Ab jetzt darf er die Links sehen — der Server gibt sie erst mit `frei=1` heraus. */
      const q = new URLSearchParams({ deutsch, arbeitsform: form, ziel, frei: "1" });
      const j = await fetch(`/api/joburi?${q.toString()}`).then(r => r.json());
      if (Array.isArray(j?.stellen)) setStellen(j.stellen);
      setSchritt("liste");
    } catch { setFehler(T.technischerFehler); }
    setBusy(false);
  };

  const weitergabe = async (stelleId: string, ja: boolean) => {
    setWeitergaben(w => ({ ...w, [stelleId]: ja }));
    try {
      await fetch("/api/joburi-lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "weitergabe", id: leadId, stelleId, ja }),
      });
      if (ja) void logFunnelEvent("joburi_interesse", { theme: "joburi" });
    } catch { /* die Anzeige stimmt schon, der Server holt es beim nächsten Mal */ }
  };

  /* ─────────────────────────── Bausteine ─────────────────────────── */

  const Wahl = ({ optionen, waehlen }: { optionen: { wert: string; text: string }[]; waehlen: (w: string) => void }) => (
    <div className="mt-4 flex flex-col gap-2">
      {optionen.map(o => (
        <button key={o.wert} type="button" onClick={() => waehlen(o.wert)}
          className="flex h-12 items-center justify-between rounded-full border border-white/20 bg-white/5 px-5 text-[15px] font-black text-white/90 transition active:scale-[0.98]">
          {o.text}
          <span className="text-white/35">→</span>
        </button>
      ))}
    </div>
  );

  const geld = (s: Treffer) => {
    if (!s.gehaltVon && !s.gehaltBis) return "";
    const w = s.waehrung || "EUR";
    const zahl = s.gehaltVon && s.gehaltBis && s.gehaltVon !== s.gehaltBis
      ? `${s.gehaltVon}–${s.gehaltBis}` : String(s.gehaltBis || s.gehaltVon);
    return `${zahl} ${w}`;
  };

  const formText = (a: Stelle["arbeitsform"]) =>
    a === "remote" ? T.formRemote : a === "hibrid" ? T.formHybrid : T.formBirou;

  /** Eine Stellenkarte. `offen` entscheidet, ob Link und Zustimmung dabei sind. */
  const Karte = ({ s, offen }: { s: Treffer; offen: boolean }) => (
    <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4">
      {/* DIE GÜTE STEHT OBEN (Owner 31.08.2026: „Potrivire foarte bună / bună / Ar putea fi
          interesant") — sie ordnet den Treffer ein, bevor er ihn liest, und macht aus einer
          Liste eine Empfehlung. */}
      {s.guete && (
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-black ${
          s.guete === "sehr-gut" ? "bg-[#f6cf51]/15 text-[#f6cf51]"
          : s.guete === "gut" ? "bg-white/10 text-white/80"
          : "bg-white/[0.06] text-white/55"}`}>
          {s.guete === "sehr-gut" ? T.gueteSehrGut : s.guete === "gut" ? T.gueteGut : T.gueteInteressant}
        </span>
      )}
      <p className="mt-1.5 text-[15px] font-black leading-snug text-white">{s.titel}</p>
      <p className="mt-0.5 text-[13px] font-bold text-white/65">{s.firma}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11.5px] font-black text-white/75">
          {formText(s.arbeitsform)}
        </span>
        {geld(s) && (
          <span className="rounded-full border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-2.5 py-0.5 text-[11.5px] font-black text-[#f6cf51]">
            {geld(s)}{s.gehaltGeschaetzt ? ` · ${T.gehaltGeschaetzt}` : ""}
          </span>
        )}
        <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[11.5px] font-black text-white/75">
          {s.deutschMin === "unbekannt" ? `DE: ${T.deutschUnbekannt}` : `DE ${s.deutschMin}`}
        </span>
      </div>
      {s.ort && (
        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold text-white/55">
          <MapPin className="h-3.5 w-3.5 shrink-0" />{s.ort}
        </p>
      )}

      {/* AN JEDER KARTE, NICHT NUR IN DER VOLLANSICHT: Auch im Teaser sieht er schon eine
          echte Stelle — dann muss dort auch stehen, dass wir nicht die Firma sind. */}
      <p className="mt-2.5 text-[11px] font-medium leading-snug text-white/40">{T.quellenhinweis}</p>

      {offen && (
        <>
          {s.kurzbeschreibung && (
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-white/75">{s.kurzbeschreibung}</p>
          )}
          {s.link && (
            <a href={s.link} target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-black text-[#f6cf51] underline underline-offset-2">
              {T.zurAnzeige}<ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {/**
            * DIE ZUSTIMMUNG STEHT AN DER EINZELNEN STELLE (Owner 31.08.2026: „Keine pauschale
            * Weitergabe an Arbeitgeber. Zustimmung pro konkreter Stelle."). Sie ist damit
            * keine Formalie im Kleingedruckten, sondern eine bewusste Entscheidung mit einem
            * Namen davor — er sieht, welcher Firma er sein Profil zeigt.
            */}
          <div className="mt-3 border-t border-white/10 pt-3">
            {weitergaben[s.id] === true ? (
              <p className="flex items-center gap-2 text-[13px] font-black text-white">
                <Check className="h-4 w-4 text-[#f6cf51]" />{T.weitergabeDanke}
              </p>
            ) : weitergaben[s.id] === false ? null : (
              <>
                <p className="text-[13px] font-bold leading-snug text-white/80">{T.weitergabeFrage}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => void weitergabe(s.id, true)}
                    className="h-9 flex-1 rounded-full border border-[#f6cf51]/50 bg-[#f6cf51]/10 text-[12.5px] font-black text-[#f6cf51] transition active:scale-95">
                    {T.weitergabeJa}
                  </button>
                  <button type="button" onClick={() => void weitergabe(s.id, false)}
                    className="h-9 flex-1 rounded-full border border-white/20 text-[12.5px] font-black text-white/70 transition active:scale-95">
                    {T.weitergabeNein}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );

  /* ─────────────────────────── Die Schritte ─────────────────────────── */

  if (schritt === "f1") {
    return (
      <>
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.frage1}</h2>
        <p className="mt-1 text-[13px] font-medium text-white/60">{T.frage1Hinweis}</p>
        <Wahl
          optionen={[
            { wert: "A2", text: T.niveauA2 }, { wert: "B1", text: T.niveauB1 },
            { wert: "B2", text: T.niveauB2 }, { wert: "C1", text: T.niveauC1 },
            { wert: "C2", text: T.niveauC2 },
          ]}
          waehlen={w => { setDeutsch(w); setSchritt("f2"); }} />
      </Kasten>

      {/**
        * DAS MOTIV STEHT UNTER DEN FRAGEN UND GANZ (Owner 31.08.2026: „auf der seite auch die
        * frau ganz aber unten den fragen").
        *
        * OBEN wäre es im Weg: Wer aus einer Anzeige kommt, soll die erste Frage ohne Wischen
        * sehen — ein Bild davor kostet genau die Höhe, die der Antwort fehlt. Unten belohnt es
        * das Weiterlesen und sagt in einer halben Sekunde, worum es geht.
        *
        * `aspect-[1086/1448]` ist das echte Seitenverhältnis der Datei, also schneidet
        * `object-cover` nichts ab — ein Streifen mit fester Höhe hatte ihr vorher die Hälfte
        * genommen, samt der Flagge.
        *
        * NUR AUF DER ERSTEN STUFE: Ab der zweiten Frage ist dasselbe Bild nur noch Weg
        * zwischen ihm und der Antwort.
        */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/Joburi/german-jobs.jpg" alt=""
        className="mt-4 aspect-[1086/1448] w-full rounded-2xl object-cover" />
      </>
    );
  }

  if (schritt === "f2") {
    return (
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.frage2}</h2>
        <Wahl
          optionen={[
            { wert: "remote", text: T.formRemote }, { wert: "hibrid", text: T.formHybrid },
            { wert: "birou", text: T.formBirou }, { wert: "egal", text: T.formEgal },
          ]}
          waehlen={w => { setForm(w); setSchritt("f3"); }} />
        <button type="button" onClick={() => setSchritt("f1")}
          className="mt-3 text-[12.5px] font-bold text-white/45 underline underline-offset-2">{T.zurueck}</button>
      </Kasten>
    );
  }

  if (schritt === "f3") {
    return (
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.frage3}</h2>
        <Wahl
          optionen={[
            { wert: "salariu", text: T.zielSalariu }, { wert: "flexibilitate", text: T.zielRemote },
            { wert: "cariera", text: T.zielJobNou }, { wert: "intoarcere", text: T.zielIntoarcere },
          ]}
          waehlen={w => { setZiel(w); setSchritt("f4"); }} />
        <button type="button" onClick={() => setSchritt("f2")}
          className="mt-3 text-[12.5px] font-bold text-white/45 underline underline-offset-2">{T.zurueck}</button>
      </Kasten>
    );
  }

  /**
   * DIE VIERTE FRAGE — SIE FILTERT NICHTS (Owner 31.08.2026: „Diese Antwort im
   * Lead-Datensatz speichern. Das ist später ein zentraler KPI, weil wir gegenüber
   * Recruitern zeigen wollen, dass wir auch Kandidaten erreichen, die nicht aktiv auf
   * Jobportalen suchen.").
   *
   * Sie steht bewusst ZULETZT und geht in keine Suche ein: Wer „nu" antwortet, sieht
   * dieselben Stellen wie jeder andere. Eine Frage, die den Besucher bestraft, hätte an
   * dieser Stelle den Trichter gekostet — und genau die Antwort verloren, um die es geht.
   */
  if (schritt === "f4") {
    return (
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.frage4}</h2>
        <Wahl
          optionen={[
            { wert: "aktiv", text: T.sucheAktiv }, { wert: "offen", text: T.sucheOffen },
            { wert: "passiv", text: T.suchePassiv },
          ]}
          waehlen={w => void antwortenSenden({ deutsch, form, ziel, suche: w })} />
        <button type="button" onClick={() => setSchritt("f3")}
          className="mt-3 text-[12.5px] font-bold text-white/45 underline underline-offset-2">{T.zurueck}</button>
      </Kasten>
    );
  }

  /* ── Der Teaser: zwei echte Stellen offen, der Rest verdeckt ── */
  if (schritt === "teaser") {
    if (laedt) return <Kasten polster="p-5"><Fortschritt text={T.suchen} /></Kasten>;
    const sichtbar = stellen.slice(0, 2);
    const verdeckt = Math.max(0, stellen.length - sichtbar.length);
    return (
      <div className="flex flex-col gap-3">
        <Kasten polster="p-5">
          <p className="text-[16px] font-black leading-snug text-white">
            {/* Der Satz kommt nur noch, wenn gar keine Stelle im Bestand liegt — das Matching
                schliesst seit dem 31.08. nichts mehr aus. */}
            {anzahl === 0 ? T.keineTreffer
              : anzahl === 1 ? T.gefundenEins
              : T.gefundenViele.replace("{n}", String(anzahl))}
          </p>
        </Kasten>

        {sichtbar.map(s => <Karte key={s.id} s={s} offen={false} />)}

        {/* DIE VERDECKTEN STELLEN SIND DER GRUND FÜR DIE ADRESSE — sie werden gezeigt, nicht
            behauptet: Er sieht, wie viele es sind, und dass sie echt sind. */}
        {verdeckt > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-4">
            <div className="pointer-events-none select-none blur-[5px]">
              <p className="text-[15px] font-black leading-snug text-white">{stellen[2]?.titel ?? "—"}</p>
              <p className="mt-0.5 text-[13px] font-bold text-white/65">{stellen[2]?.firma ?? "—"}</p>
            </div>
            <div className="absolute inset-0 grid place-items-center bg-black/45">
              <span className="flex items-center gap-2 rounded-full border border-[#f6cf51]/40 bg-black/70 px-3.5 py-1.5 text-[12.5px] font-black text-[#f6cf51]">
                <Lock className="h-3.5 w-3.5" />{T.weitereVerdeckt.replace("{n}", String(verdeckt))}
              </span>
            </div>
          </div>
        )}

        <Knopf art="gold" onClick={() => setSchritt("mail")}>{T.mailKnopf}</Knopf>
      </div>
    );
  }

  /* ── Die Adresse ── */
  if (schritt === "mail") {
    return (
      <Kasten polster="p-5">
        <h2 className="text-[19px] font-black leading-snug text-white">{T.mailTitel}</h2>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/75">{T.mailText}</p>

        <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{T.mailLabel}</label>
        <Eingabe className="mt-1.5" type="email" inputMode="email" value={mail} symbol={<Mail className="h-4 w-4" />}
          onChange={e => { setMail(e.target.value); setFehler(""); }} placeholder={T.mailPlatzhalter} />

        {/* NUR DIE ADRESSE (Owner 31.08.2026: „Lead-Formular radikal vereinfachen. Vorname
            und Telefon/WhatsApp an dieser Stelle entfernen."). Jedes zusätzliche Feld an
            dieser Stelle ist ein Grund abzubrechen — und beides lässt sich später fragen,
            wenn er schon etwas bekommen hat. Der Server nimmt die Felder weiterhin
            entgegen, sie werden hier nur nicht mehr abgefragt. */}
        <p className="mt-1.5 text-[12px] font-medium text-white/45">{T.mailKeinSpam}</p>

        <div className="mt-4">
          <Haken an={haken} setzen={setHaken} pflicht>{T.haken}</Haken>
        </div>
        {/* WAS NICHT PASSIERT, STEHT GROSS DA — es ist die Sorge, mit der er die Adresse
            zurückhält (Owner 31.08.2026). */}
        <p className="mt-2 text-[12.5px] font-black leading-snug text-white/85">{T.datenschutzZusage}</p>

        <Fehlerzeile>{fehler}</Fehlerzeile>
        <div className="mt-3">
          {busy ? <Fortschritt text={T.mailLaeuft} /> : <Knopf art="gold" onClick={() => void kontaktSenden()}>{T.mailKnopf}</Knopf>}
        </div>
      </Kasten>
    );
  }

  /* ── Die volle Liste + das freiwillige Upgrade ── */
  return (
    <div className="flex flex-col gap-3">
      <Kasten polster="p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">{T.profilTitel}</p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-bold text-white/75">
          <span>{T.profilDeutsch}: <span className="font-black text-white">{deutsch}</span></span>
          <span>{T.profilForm}: <span className="font-black text-white">{
            form === "remote" ? T.formRemote : form === "hibrid" ? T.formHybrid : form === "birou" ? T.formBirou : T.formEgal
          }</span></span>
        </div>
      </Kasten>

      <h2 className="mt-1 text-[19px] font-black leading-snug text-white">{T.listeTitel}</h2>
      {stellen.map(s => <Karte key={s.id} s={s} offen />)}

      {/* DER LEBENSLAUF IST DAS UPGRADE, NICHT DER EINTRITTSPREIS (Owner 31.08.2026). */}
      <Kasten polster="p-5" className="mt-2">
        <p className="text-[16px] font-black leading-snug text-white">{T.cvTitel}</p>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/75">{T.cvText}</p>
        <div className="mt-3">
          <Knopf art="umriss" href={`/themes/david/start?von=joburi&lead=${encodeURIComponent(leadId)}`}>{T.cvKnopf}</Knopf>
        </div>
        <p className="mt-2 text-center text-[12px] font-bold text-white/55">{T.cvHinweis}</p>
      </Kasten>
    </div>
  );
}
