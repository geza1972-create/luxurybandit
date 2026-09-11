"use client";

import { useEffect, useRef, useState } from "react";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";

/**
 * SEINE SEITE, DIREKT BEARBEITET — WYSIWYG (Owner 11.09.2026: „Dann wird er den Link bekommen, dass er öffnen
 * und es ergänzen kann. Profilbild hochladen, Text über sich, wenn er auf ‚Edit Webseite' klickt. Dort müssen
 * sofort alle Bilder zu sehen sein. Platzhalter für Künstlerbild, Name" · „er muss es dort bearbeiten. WYSIWYG").
 *
 * DIESELBE SEITE WIE FÜR KÄUFER, NUR ANTIPPBAR: Foto, Name, Ort, Über mich, jede Kachel mit Bild, Spruch und
 * Titel · Technik · Größe · Jahr. Kein Formular daneben — er sieht beim Tippen, was Käufer sehen.
 *
 * BILDER GEHEN SOFORT HOCH (über `api/versusforge-bild`, mit der Inhaltsprüfung). Die Texte sammelt „Speichern".
 */

type Kachel = { i: number; spruch: string; titel: string; technik: string; groesse: string; jahr: string; geschichte: string; preis: string; preisZeigen: boolean; detalii: string };

async function verkleinern(f: File): Promise<string> {
  const bitmap = await createImageBitmap(f);
  const breit = Math.min(1080, bitmap.width);
  const hoch = Math.round((bitmap.height / bitmap.width) * breit);
  const flaeche = document.createElement("canvas");
  flaeche.width = breit;
  flaeche.height = hoch;
  flaeche.getContext("2d")?.drawImage(bitmap, 0, 0, breit, hoch);
  return flaeche.toDataURL("image/jpeg", 0.85);
}

export default function PortalBearbeiten({ mandant, k, T, oeffentlich, start }: {
  mandant: string;
  k: string;
  T: PortalTexte;
  /** Die Adresse seiner Seite ohne Schlüssel — so sehen Käufer sie. */
  oeffentlich: string;
  start: { name: string; ort: string; ueberMich: string; profilBild: boolean; frei: boolean; kacheln: Kachel[] };
}) {
  const [name, setName] = useState(start.name);
  const [ort, setOrt] = useState(start.ort);
  const [ueberMich, setUeberMich] = useState(start.ueberMich);
  const [profilBild, setProfilBild] = useState(start.profilBild);
  const [kacheln, setKacheln] = useState<Kachel[]>(start.kacheln);
  const [version, setVersion] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"" | "speichert" | "gespeichert" | "fehler">("");
  const [hinweis, setHinweis] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [kachelZiel, setKachelZiel] = useState<number | null>(null);
  const dateiProfil = useRef<HTMLInputElement>(null);
  const dateiKachel = useRef<HTMLInputElement>(null);
  /* Sein eigenes Gerät zählt nicht als Besucher und schickt ihm keine Besuchs-Mail (Owner 11.09.2026). */
  useEffect(() => {
    try { localStorage.setItem(`lb_eigen_${mandant}`, "1"); } catch { /* egal */ }
  }, [mandant]);

  const nrVon = (i: number) => (i < 0 ? "-1" : String(i));
  const bildUrl = (nr: string) =>
    `/api/portal-werk?m=${encodeURIComponent(mandant)}&i=${encodeURIComponent(nr)}&k=${encodeURIComponent(k)}&v=${version[nr] ?? 0}`;
  /* Bilder, die (noch) nicht da sind — in der Prüfung oder nie hochgeladen. Sie zeigen den Platzhalter. */
  const [fehlt, setFehlt] = useState<Record<string, boolean>>({});
  const neuLaden = (nr: string) => {
    setVersion(v => ({ ...v, [nr]: (v[nr] ?? 0) + 1 }));
    setFehlt(v => ({ ...v, [nr]: false }));
  };

  /** "ok" = sofort angenommen · "pruefung" = liegt beim Owner, noch nicht sichtbar · false = nicht gespeichert. */
  const hochladen = async (f: File | undefined, nr: string): Promise<"ok" | "pruefung" | false> => {
    if (!f) return false;
    setHinweis("");
    setLaedt(true);
    try {
      const daten = await verkleinern(f);
      const res = await fetch("/api/versusforge-bild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ was: "motiv", mandant, k, daten, nr }),
      });
      const d = (await res.json().catch(() => ({}))) as { code?: string; pruefung?: boolean };
      if (res.status === 422 || d.code === "abgelehnt" || d.code === "aktfoto") { setHinweis(T.bildAbgelehnt); return false; }
      if (res.ok && d.pruefung) { setHinweis(T.bildPruefung); return "pruefung"; }
      if (!res.ok) { setHinweis(T.speichernFehler); return false; }
      return "ok";
    } catch {
      setHinweis(T.speichernFehler);
      return false;
    } finally {
      setLaedt(false);
    }
  };

  const preisZeigenSetzen = (i: number, an: boolean) => {
    setKacheln(v => v.map(x => (x.i === i ? { ...x, preisZeigen: an } : x)));
    setStatus("");
  };
  const aendern = (i: number, feld: Exclude<keyof Kachel, "i" | "preisZeigen">, wert: string) => {
    setKacheln(v => v.map(x => (x.i === i ? { ...x, [feld]: wert } : x)));
    setStatus("");
  };

  const entfernen = async (i: number) => {
    setKacheln(v => v.filter(x => x.i !== i));
    setStatus("");
    await fetch("/api/versusforge-bild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ was: "motiv", mandant, k, daten: "", nr: i < 0 ? "" : String(i) }),
    }).catch(() => {});
  };

  const speichern = async () => {
    setStatus("speichert");
    try {
      const res = await fetch("/api/portal-profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, name, ort, ueberMich, profilBild, kacheln }),
      });
      setStatus(res.ok ? "gespeichert" : "fehler");
    } catch {
      setStatus("fehler");
    }
  };

  /* Ein Feld sieht aus wie der fertige Text — erst beim Darüberfahren und Tippen zeigt ein Rahmen, dass es geht. */
  const feld = "block w-full rounded-md border border-dashed border-[#d9d9d9] bg-transparent px-1 outline-none transition hover:border-[#999] focus:border-solid focus:border-[#1d6fd0]";

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 pb-32 pt-8 md:pt-12">
      <p className="m-0 rounded-xl bg-[#f3f6fa] px-4 py-3 text-[14.5px] leading-[1.45] text-[#333]">
        {start.frei ? T.bearbeitenHinweis : T.bearbeitenPruefung}{" "}{T.agentBesserHinweis}{" "}
        <a href={oeffentlich} className="font-semibold text-[#111] underline">{T.ansehen}</a>
      </p>

      <input ref={dateiProfil} type="file" accept="image/*" hidden
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = "";
          /* Nur ein angenommenes Foto ersetzt den Platzhalter — ein geprüftes käme sonst als kaputtes Bild. */
          if (await hochladen(f, "profil") === "ok") { setProfilBild(true); neuLaden("profil"); setStatus(""); }
        }} />
      <input ref={dateiKachel} type="file" accept="image/*" hidden
        onChange={async e => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          if (kachelZiel === null) {
            const neu = Math.max(-1, ...kacheln.map(x => x.i)) + 1;
            if (neu > 11) return;
            const ergebnis = await hochladen(f, String(neu));
            if (ergebnis) {
              setKacheln(v => [...v, { i: neu, spruch: "", titel: "", technik: "", groesse: "", jahr: "", geschichte: "", preis: "", preisZeigen: false, detalii: "" }]);
              neuLaden(String(neu));
              setStatus("");
            }
          } else if (await hochladen(f, kachelZiel < 0 ? "" : String(kachelZiel)) === "ok") {
            neuLaden(nrVon(kachelZiel));
          }
          setStatus("");
        }} />

      {/* ── FOTO · NAME · ORT ── */}
      <div className="mt-8 flex items-center gap-5">
        <button type="button" onClick={() => dateiProfil.current?.click()} aria-label={T.fotoPlatzhalter}
          className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-[#ccc] bg-[#f5f5f5] text-center text-[12px] font-semibold leading-[1.2] text-[#777] transition hover:border-[#1d6fd0]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profilBild ? <img src={bildUrl("profil")} alt="" className="h-full w-full object-cover" /> : <span className="px-2">{T.fotoPlatzhalter}</span>}
        </button>
        <div className="min-w-0 flex-1">
          <input value={name} onChange={e => { setName(e.target.value); setStatus(""); }} maxLength={80}
            placeholder={T.namePlatzhalter} className={`${feld} font-serif text-[32px] font-normal leading-[1.15] md:text-[48px]`} />
          <input value={ort} onChange={e => { setOrt(e.target.value); setStatus(""); }} maxLength={80}
            placeholder={T.ortPlatzhalter} className={`${feld} mt-1.5 text-[15px] text-[#555]`} />
        </div>
      </div>

      {/* ── ÜBER MICH ── */}
      <textarea value={ueberMich} onChange={e => { setUeberMich(e.target.value); setStatus(""); }} rows={4} maxLength={1200}
        placeholder={T.ueberMichPlatzhalter} className={`${feld} mt-5 max-w-[640px] resize-y py-1 text-[16.5px] leading-[1.6] text-[#333]`} />

      <span className="mt-6 inline-block bg-[#111] px-6 py-3.5 text-[15px] font-semibold text-white opacity-60">{T.agent}</span>

      {/* ── SEINE WERKE — alle sofort, jede Kachel antippbar ── */}
      <h2 className="mt-14 border-t border-[#e5e5e5] pt-8 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.werke}</h2>
      {hinweis && <p className="mt-3 text-[14px] font-semibold text-[#b3261e]">{hinweis}</p>}
      <ul className="mt-6 grid list-none grid-cols-1 gap-x-8 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {kacheln.map(kc => (
          <li key={kc.i}>
            <button type="button" onClick={() => { setKachelZiel(kc.i); dateiKachel.current?.click(); }}
              className="relative flex aspect-[4/5] w-full items-start justify-end overflow-hidden bg-[#f5f5f5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {fehlt[nrVon(kc.i)]
                ? <span className="grid h-full w-full place-items-center px-6 text-center text-[14px] text-[#777]">{T.bildPruefung}</span>
                : <img src={bildUrl(nrVon(kc.i))} alt="" className="max-h-full max-w-full object-contain"
                    onError={() => setFehlt(v => ({ ...v, [nrVon(kc.i)]: true }))} />}
              <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-[#111] shadow">{T.bildTauschen}</span>
            </button>
            <textarea value={kc.spruch} onChange={e => aendern(kc.i, "spruch", e.target.value)} rows={3} maxLength={280}
              placeholder={T.spruchPlatzhalter} className={`${feld} mt-4 resize-none py-1 text-[17px] font-semibold leading-[1.35]`} />
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {([
                ["titel", T.titelPlatzhalter],
                ["technik", T.technikPlatzhalter],
                ["groesse", T.groessePlatzhalter],
                ["jahr", T.jahrPlatzhalter],
              ] as const).map(([f, platz]) => (
                <input key={f} value={kc[f]} onChange={e => aendern(kc.i, f, e.target.value)} placeholder={platz} maxLength={120}
                  className={`${feld} py-0.5 text-[14px] text-[#666]`} />
              ))}
            </div>
            {/* ALTE DETALII IN EIGENER ZEILE (Owner 11.09.2026: „hier kommt 100 zwei mal vor") — als fünftes kleines Feld neben
                Größe und Jahr sah es aus wie der Preis. */}
            <input value={kc.detalii} onChange={e => aendern(kc.i, "detalii", e.target.value)} maxLength={160}
              placeholder={T.detaliiPlatzhalter} className={`${feld} mt-1.5 py-0.5 text-[14px] text-[#666]`} />
            {/* DIE GESCHICHTE DES WERKS (Owner 11.09.2026: „wenn er das macht, wird sein Agent noch besser") — Käufer lesen sie
                nicht direkt, sein Agent erzählt daraus. Freiwillig. */}
            <textarea value={kc.geschichte} onChange={e => aendern(kc.i, "geschichte", e.target.value)} rows={3} maxLength={800}
              placeholder={T.geschichtePlatzhalter} className={`${feld} mt-2 resize-y py-1 text-[14.5px] leading-[1.5] text-[#444]`} />
            {/* PREIS PRO WERK — ob er auf der Seite steht, entscheidet er (Owner 11.09.2026: „c"). */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {/* Nur die Zahl, dahinter fest „€" (Owner 11.09.2026: „die Preise alle in Euro"). */}
              <span className="flex items-center gap-1.5">
                <span className="text-[13.5px] font-semibold text-[#555]">{T.preisWort}</span>
                <input value={kc.preis} onChange={e => aendern(kc.i, "preis", e.target.value.replace(/[^\d.,]/g, ""))} maxLength={12}
                  inputMode="decimal" placeholder={T.preisPlatzhalter} className={`${feld} w-[130px] py-0.5 text-[14px] text-[#444]`} />
                <span className="text-[14px] font-semibold text-[#444]">€</span>
              </span>
              <label className="flex items-center gap-1.5 text-[13.5px] text-[#555]">
                <input type="checkbox" checked={kc.preisZeigen} onChange={e => preisZeigenSetzen(kc.i, e.target.checked)} />
                {T.preisZeigen}
              </label>
            </div>
            <button type="button" onClick={() => void entfernen(kc.i)}
              className="mt-2 text-[13px] text-[#777] underline hover:text-[#b3261e]">{T.entfernen}</button>
          </li>
        ))}
        {kacheln.length < 13 && (
          <li>
            <button type="button" disabled={laedt} onClick={() => { setKachelZiel(null); dateiKachel.current?.click(); }}
              className="grid aspect-[4/5] w-full place-items-center border-2 border-dashed border-[#ccc] bg-[#fafafa] text-[15px] font-semibold text-[#555] transition hover:border-[#1d6fd0] disabled:opacity-50">
              {T.bildHinzufuegen}
            </button>
          </li>
        )}
      </ul>

      {/* ── SPEICHERN, immer erreichbar ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5e5e5] bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3">
          <span className={`text-[14px] font-semibold ${status === "fehler" ? "text-[#b3261e]" : "text-[#1d6fd0]"}`}>
            {laedt ? "…" : status === "gespeichert" ? T.gespeichert : status === "fehler" ? T.speichernFehler : ""}
          </span>
          <button type="button" onClick={() => void speichern()} disabled={status === "speichert" || laedt}
            className="bg-[#111] px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-[#333] disabled:opacity-50">
            {T.speichern}
          </button>
        </div>
      </div>
    </main>
  );
}
