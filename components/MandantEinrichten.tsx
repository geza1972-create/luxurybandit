"use client";

import { useState } from "react";

/**
 * EINRICHTEN — DIE FÜNF ANGABEN, DIE DER TRICHTER BRAUCHT (09.09.2026).
 *
 * WARUM ES DIESEN SCHIRM GEBEN MUSS: Der Mandant entsteht aus dem Plan, und der Plan kennt
 * weder Adresse noch Impressum. Ohne Impressum und Datenschutz weist der Trichter jede
 * Anfrage ab — richtig so, aber bis heute gab es keinen Weg, sie einzutragen. Sein Trichter
 * konnte nie eine Anfrage annehmen, und er hätte es erst gemerkt, wenn niemand anruft.
 *
 * ZWEI PFLICHTFELDER, DREI FREIWILLIGE, und das steht auch so dran. Wer nicht weiss, was
 * er ausfüllen MUSS, füllt entweder alles oder nichts aus.
 *
 * KEINE URL WIRD ERFUNDEN. Hat er kein Impressum auf seiner Seite, bleibt das Feld leer und
 * der Trichter bleibt zu — die ehrliche Antwort. Ein „wir nehmen erstmal deine Startseite"
 * wäre eine Rechtsauskunft, die wir nicht geben.
 *
 * FEHLER ROT AM FELD, kein Dialog (Hausregeln `sichtbare-fehler-keine-formularfelder`,
 * `keine-overlay-dialoge`).
 */

type Felder = {
  adresse: string;
  telefon: string;
  webUrl: string;
  impressumUrl: string;
  datenschutzUrl: string;
};

export default function MandantEinrichten({
  mandant, k, start, trichterUrl,
}: { mandant: string; k: string; start: Felder; trichterUrl: string }) {
  const [f, setF] = useState<Felder>(start);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [gesichert, setGesichert] = useState(false);

  const bereit = !!f.impressumUrl.trim() && !!f.datenschutzUrl.trim();

  const setz = (schluessel: keyof Felder) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF(alt => ({ ...alt, [schluessel]: e.target.value }));
    if (fehler) setFehler("");
    if (gesichert) setGesichert(false);
  };

  const speichern = async () => {
    setLaeuft(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-einrichten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k, ...f }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Das ging gerade nicht.")); return; }
      setGesichert(true);
    } catch {
      setFehler("Das ging gerade nicht. Bitte noch einmal.");
    } finally { setLaeuft(false); }
  };

  return (
    <section className="mt-8">
      <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">Deine Angaben</h2>

      {/**
        * DER SATZ ÜBER DEM FORMULAR SAGT DIE FOLGE, NICHT DIE REGEL (Owner-Muster: erst
        * zeigen, was passiert). „Pflichtfeld" erklärt nichts; „ohne das nimmt deine Seite
        * keine Anfrage an" erklärt alles.
        */}
      <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
        {bereit
          ? "Deine Seite nimmt Anfragen an. Adresse und Telefonnummer stehen im Kopf deines Trichters."
          : "Solange Impressum und Datenschutz fehlen, nimmt deine Seite keine Anfrage an. Sie ist zu sehen, aber niemand kann etwas hinterlassen."}
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Feld etikett="Impressum — Adresse auf deiner Website" pflicht
          platzhalter="praxis-mueller.de/impressum" wert={f.impressumUrl} onChange={setz("impressumUrl")} />
        <Feld etikett="Datenschutz — Adresse auf deiner Website" pflicht
          platzhalter="praxis-mueller.de/datenschutz" wert={f.datenschutzUrl} onChange={setz("datenschutzUrl")} />
        <Feld etikett="Deine Adresse" platzhalter="Hauptstrasse 12 · 80331 München"
          wert={f.adresse} onChange={setz("adresse")} />
        <Feld etikett="Telefonnummer" platzhalter="+49 89 123456" wert={f.telefon} onChange={setz("telefon")} />
        <Feld etikett="Deine Website" platzhalter="praxis-mueller.de" wert={f.webUrl} onChange={setz("webUrl")} />
      </div>

      {fehler && <p className="mt-3 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={laeuft}
          onClick={() => void speichern()}
          className="rounded-xl bg-[#1d6fd0] px-6 py-3.5 text-[16px] font-extrabold text-white disabled:opacity-50"
        >
          {laeuft ? "Einen Moment …" : "Speichern"}
        </button>
        {gesichert && (
          <a href={trichterUrl} className="text-[15px] font-bold text-[#1d6fd0] underline underline-offset-2">
            Gespeichert — Trichter ansehen
          </a>
        )}
      </div>
    </section>
  );
}

/**
 * Ein Feld mit Etikett darüber.
 *
 * 16 px im Eingabefeld ist kein Geschmack, sondern Technik: Darunter zoomt iOS beim Antippen
 * in die Seite hinein und der Mensch verliert den Zusammenhang.
 */
function Feld({ etikett, platzhalter, wert, onChange, pflicht = false }: {
  etikett: string; platzhalter: string; wert: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; pflicht?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[14.5px] font-bold text-[#14181c]">
        {etikett}
        {pflicht ? <span className="ml-1.5 font-bold text-[#c02626]">Pflicht</span> : null}
      </span>
      <input
        type="text"
        value={wert}
        onChange={onChange}
        placeholder={platzhalter}
        className="mt-2 w-full rounded-xl border-[1.5px] border-[#dfe4e9] bg-white px-4 py-3.5 text-[16px] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
      />
    </label>
  );
}
