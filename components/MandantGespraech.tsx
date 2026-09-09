"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DAS GESPRÄCH AUF DER MANDANTENSEITE (Owner 09.09.2026).
 *
 * VIER FRAGEN, ANTWORTEN ZUM ANTIPPEN. Derselbe Ablauf wie im Haupttrichter, nur an den
 * Kunden des Mandanten gerichtet — und ohne Eingabefeld als Vorgabe: Wer mit einer Zahnlücke
 * hierherkommt, tippt keinen Satz (Hausregel `chat-no-personal-questions-buttons-only`).
 * Selbst schreiben geht trotzdem, für den Fall, den keine Karte trifft.
 *
 * DER ABSCHLUSS IST IN DER VORSCHAU AUS (Owner 09.09.2026, nach meinem Einwand): Eine Seite,
 * die Namen und Telefonnummern sammelt, braucht Impressum und Datenschutzhinweis. Die liegen
 * erst vor, wenn der Mandant gekauft und seine Angaben eingetragen hat. Bis dahin sieht er
 * seinen ganzen Trichter — er nimmt nur nichts entgegen.
 *
 * DER RIEGEL STEHT AUCH AUF DEM SERVER (`versusforge-mandant/route.ts`): Der Browser ist die
 * Anzeige, nicht die Wache.
 */

type Runde = { frage: string; antwort: string };

export default function MandantGespraech({
  mandant, sammelt, name,
}: { mandant: string; sammelt: boolean; name: string }) {
  /* Was er auf der Seite davor angetippt hat. Aus der Ablage, nicht aus der Adresse: Ein
     Klick auf „Mir fehlen mehrere Zähne" gehört nicht in eine URL, die im Verlauf, in
     Protokollen und im `Referer` jedes geladenen Bildes landet. */
  const [einstieg, setEinstieg] = useState("");
  const [runden, setRunden] = useState<Runde[]>([]);
  const [reaktion, setReaktion] = useState("");
  const [frage, setFrage] = useState("");
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);
  const [eigene, setEigene] = useState("");
  const [laeuft, setLaeuft] = useState(true);
  const [fertig, setFertig] = useState(false);
  const [fehler, setFehler] = useState("");

  const [kName, setKName] = useState("");
  const [kTelefon, setKTelefon] = useState("");
  const [gesendet, setGesendet] = useState(false);

  const ende = useRef<HTMLDivElement>(null);
  useEffect(() => { ende.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [frage, fertig, gesendet]);

  const holen = async (bisher: Runde[], start = einstieg) => {
    setLaeuft(true);
    setFehler("");
    try {
      const res = await fetch("/api/versusforge-mandant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "frage", mandant, einstieg: start, runden: bisher }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Das ging gerade nicht.")); return; }
      if (d.fertig === true || !d.frage) { setFertig(true); return; }
      setReaktion(String(d.reaktion ?? ""));
      setFrage(String(d.frage ?? ""));
      setVorschlaege(Array.isArray(d.vorschlaege) ? (d.vorschlaege as string[]) : []);
    } catch {
      setFehler("Das ging gerade nicht. Bitte noch einmal.");
    } finally {
      setLaeuft(false);
    }
  };

  useEffect(() => {
    let start = "";
    try {
      const roh = sessionStorage.getItem("vf_mandant_start");
      if (roh) start = String((JSON.parse(roh) as { text?: string }).text ?? "");
    } catch { /* dann eben ohne — der Agent fragt trotzdem sinnvoll */ }
    setEinstieg(start);
    void holen([], start);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const antworten = (antwort: string) => {
    const w = antwort.trim();
    if (!w) return;
    const naechste = [...runden, { frage, antwort: w }];
    setRunden(naechste);
    setEigene("");
    setFrage("");
    setVorschlaege([]);
    void holen(naechste);
  };

  const absenden = async () => {
    if (kName.trim().length < 2 || kTelefon.trim().length < 5) {
      setFehler("Bitte Name und Telefonnummer angeben.");
      return;
    }
    setLaeuft(true);
    setFehler("");
    try {
      const res = await fetch("/api/versusforge-mandant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schritt: "abschluss", mandant, einstieg, runden, name: kName, telefon: kTelefon }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Das ging gerade nicht.")); return; }
      setGesendet(true);
    } catch {
      setFehler("Das ging gerade nicht. Bitte noch einmal.");
    } finally {
      setLaeuft(false);
    }
  };

  const feld = "w-full rounded-xl border-[1.5px] border-[#dfe4e9] bg-[#f5f7f9] px-4 py-3.5 text-[16px] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[var(--akzent)]";

  if (gesendet) {
    return (
      <div className="mt-6 rounded-2xl border-[1.5px] border-[#dfe4e9] bg-[#f5f7f9] p-5">
        <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">Ist angekommen.</h2>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
          {name} meldet sich bei Ihnen. Sie müssen nichts weiter tun.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Was er am Anfang angetippt hat — steht sichtbar da, damit das Gespräch einen
          Anfang hat und nicht aus dem Nichts kommt. */}
      {einstieg && (
        <>
          <p className="text-[13.5px] font-bold uppercase tracking-[0.14em] text-[var(--akzent)]">Ihre Angabe</p>
          <p className="mt-1 text-[16px] font-semibold">{einstieg}</p>
        </>
      )}

      <div className="mt-5 grid gap-4">
        {runden.map((r, i) => (
          <div key={i} className="border-t border-[#dfe4e9] pt-4">
            <p className="text-[15px] text-[#5b666f]">{r.frage}</p>
            <p className="mt-1 text-[16px] font-semibold">{r.antwort}</p>
          </div>
        ))}
      </div>

      {laeuft && !frage && !fertig && (
        <p className="mt-5 text-[15px] text-[#5b666f]">Einen Moment …</p>
      )}

      {frage && !fertig && (
        <div className="mt-5 border-t border-[#dfe4e9] pt-5">
          {reaktion && <p className="text-[15px] leading-[1.5] text-[#5b666f]">{reaktion}</p>}
          <p className="mt-1.5 text-[18px] font-extrabold leading-snug tracking-[-0.01em]">{frage}</p>

          {/* AUSWAHL VERSCHIEBT NIE: gleiche Rahmenstärke und Polsterung, es wechselt nur
              die Farbe. */}
          <div className="mt-3.5 grid gap-2.5">
            {vorschlaege.map(v => (
              <button
                key={v}
                type="button"
                disabled={laeuft}
                onClick={() => antworten(v)}
                className="w-full rounded-xl border-[1.5px] border-[#dfe4e9] bg-[#f5f7f9] px-4 py-[15px] text-left text-[16px] font-semibold disabled:opacity-50"
                style={{ borderColor: undefined }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Selbst schreiben — für den Fall, den keine Karte trifft. */}
          <div className="mt-3 flex gap-2">
            <input
              value={eigene}
              onChange={e => setEigene(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") antworten(eigene); }}
              placeholder="Oder selbst schreiben"
              className={feld}
            />
            <button
              type="button"
              disabled={laeuft || !eigene.trim()}
              onClick={() => antworten(eigene)}
              className="shrink-0 rounded-xl px-5 text-[16px] font-extrabold text-white disabled:opacity-40"
              style={{ background: "var(--akzent)" }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {fertig && sammelt && (
        <div className="mt-6 border-t border-[#dfe4e9] pt-5">
          <p className="text-[18px] font-extrabold leading-snug tracking-[-0.01em]">Wie erreichen wir Sie?</p>
          <p className="mt-1.5 text-[15px] leading-[1.5] text-[#5b666f]">
            {name} ruft Sie an. Ihre Angaben gehen nur an die Praxis, an niemanden sonst.
          </p>
          <div className="mt-3.5 grid gap-2.5">
            <input value={kName} onChange={e => setKName(e.target.value)} placeholder="Ihr Name" className={feld} autoComplete="name" />
            <input value={kTelefon} onChange={e => setKTelefon(e.target.value)} placeholder="Telefonnummer" className={feld} autoComplete="tel" inputMode="tel" />
          </div>
          <button
            type="button"
            disabled={laeuft}
            onClick={() => void absenden()}
            className="mt-4 w-full rounded-xl px-5 py-4 text-[17px] font-extrabold text-white disabled:opacity-50 md:w-auto md:min-w-[260px]"
            style={{ background: "var(--akzent)" }}
          >
            {laeuft ? "Einen Moment …" : "Absenden"}
          </button>
        </div>
      )}

      {/**
        * DIE VORSCHAU SAGT, WARUM HIER SCHLUSS IST (Owner 09.09.2026).
        *
        * Nicht „Fehler", nicht ein toter Knopf: Wer den Trichter ansieht, soll sehen, dass er
        * fertig ist und nur noch nicht scharf. Der Satz ist an den Mandanten gerichtet — er
        * ist in dieser Phase der Einzige, der die Seite kennt.
        */}
      {fertig && !sammelt && (
        <div className="mt-6 rounded-2xl border-[1.5px] border-dashed border-[#c3ccd4] bg-[#f5f7f9] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5b666f]">Noch nicht online</p>
          <h2 className="mt-2 text-[19px] font-extrabold tracking-[-0.02em]">Hier stünde jetzt das Kontaktfeld.</h2>
          {/* DER GRUND STEHT DA, statt eines toten Knopfes — und er ist an den Mandanten
              gerichtet, der in dieser Phase der Einzige ist, der die Seite kennt. */}
          <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
            Der Trichter ist fertig. Bevor er Anfragen entgegennehmen darf, müssen dein
            Impressum und deine Datenschutzerklärung darauf stehen — das verlangt das Gesetz
            an der Stelle, an der jemand seinen Namen hinterlässt. Trag die zwei Links ein,
            dann ist er online. Das kostet nichts.
          </p>
        </div>
      )}

      {fehler && <p className="mt-3 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}
      <div ref={ende} />
    </div>
  );
}
