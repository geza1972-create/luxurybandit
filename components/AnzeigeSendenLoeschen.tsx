"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

/**
 * ZWEI KNÖPFE UNTER DEM LINK — DAS FELD KLAPPT AUF (Owner 09.09.2026: „nein. Da versteht
 * niemand, wozu die E-Mail eingegeben werden soll. Unter dem Link muss ein Button stehen:
 * per E-Mail senden und löschen. Dann klappt E-Mail auf.").
 *
 * ER HAT RECHT, UND DER FEHLER WAR MEINER: Ein Eingabefeld, das einfach dasteht, ist eine
 * Frage ohne Anlass. Wer „Deine E-Mail-Adresse" liest, ohne zu wissen wofür, füllt es nicht
 * aus. Erst die Handlung erklärt das Feld — wer „per E-Mail senden" drückt, versteht ohne
 * ein Wort, wozu seine Adresse gebraucht wird.
 *
 * ABSICHT ZUERST, ANGABE DANACH. Dieselbe Reihenfolge wie überall im Haus: erst zeigen,
 * dann fragen.
 *
 * LÖSCHEN LÖSCHT VON HIER AUS NICHT. Der Knopf schickt den Löschlink an die HINTERLEGTE
 * Adresse; gelöscht wird erst über den Link aus der Mail. Sonst könnte jeder, der den
 * Trichternamen errät und irgendeine Adresse eintippt, fremde Daten wegwerfen.
 */
export default function AnzeigeSendenLoeschen({ mandant, k = "" }: { mandant: string; k?: string }) {
  const [offen, setOffen] = useState<null | "links" | "loeschen">(null);
  const [weg, setWeg] = useState(false);
  const [mail, setMail] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [fehler, setFehler] = useState("");
  const [sicher, setSicher] = useState(false);

  const schicken = async (was: "links" | "loeschen") => {
    if (!mail.includes("@")) { setFehler("Bitte deine E-Mail-Adresse angeben."); return; }
    setLaeuft(true); setFehler(""); setMeldung("");
    try {
      const res = await fetch("/api/versusforge-senden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, mail, was }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Das ging gerade nicht.")); return; }
      /* Bewusst dieselbe Auskunft, ob die Adresse stimmt oder nicht — sonst verrät die
         Antwort, wem der Trichter gehört. */
      setMeldung(was === "loeschen"
        ? "Wenn die Adresse stimmt, ist der Löschlink unterwegs."
        : "Wenn die Adresse stimmt, sind deine Links unterwegs.");
      setOffen(null);
      setMail("");
    } catch {
      setFehler("Das ging gerade nicht. Bitte noch einmal.");
    } finally {
      setLaeuft(false);
    }
  };

  /** Der Löschlink aus der Mail: hier steht der Schlüssel, hier wird wirklich gelöscht. */
  const wirklichLoeschen = async () => {
    setLaeuft(true); setFehler("");
    try {
      const res = await fetch("/api/versusforge-loeschen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mandant, k }),
      });
      const d = (await res.json()) as Record<string, unknown>;
      if (!res.ok) { setFehler(String(d.error ?? "Das ging gerade nicht.")); return; }
      setWeg(true);
    } catch {
      setFehler("Das ging gerade nicht. Bitte noch einmal.");
    } finally { setLaeuft(false); }
  };

  if (weg) {
    return (
      <div className="mt-5">
        <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">Alles gelöscht.</h2>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
          Dein Trichter und alle Anfragen darin sind weg.
        </p>
      </div>
    );
  }

  /* Zwei Tipps, rot, kein Browser-Fenster (Hausregel `loeschen-zwei-tipps-rot`). */
  if (k) {
    return (
      <div className="mt-5 rounded-2xl border-[1.5px] border-[#c02626]/40 bg-[#fdf2f2] p-5">
        <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">Alles löschen?</h2>
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
          Dein Trichter, diese Seite und alle Anfragen darin — endgültig, ohne Weg zurück.
        </p>
        <button
          type="button"
          disabled={laeuft}
          onClick={() => { if (!sicher) { setSicher(true); return; } void wirklichLoeschen(); }}
          className={`mt-4 rounded-xl border-[1.5px] px-6 py-3.5 text-[16px] font-extrabold disabled:opacity-50 ${
            sicher ? "border-[#c02626] bg-[#c02626] text-white" : "border-[#c02626]/50 bg-white text-[#c02626]"}`}
        >
          {laeuft ? "Einen Moment …" : sicher ? "Ja, endgültig löschen" : "Trichter und Anfragen löschen"}
        </button>
        {fehler && <p className="mt-3 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/**
        * ERST DIE ZWEI SACHEN ALS TEXT, DANN DIE ZWEI KNÖPFE (Owner 09.09.2026: „Link und
        * Dok, dann senden oder löschen" · „nicht als Button Dok, sondern als Text").
        *
        * Der Kasten LISTET, was er bekommt — die Adresse und die Anleitung. Die Knöpfe
        * darunter sind das, was er damit TUN kann. Ich hatte die Anleitung erst zum Knopf
        * gemacht; damit sah es aus, als gäbe es zwei verschiedene Sendungen.
        */}
      {/* MIT SYMBOL, BLAU, NICHT UNTERSTRICHEN (Owner 09.09.2026). Unterstrichen sähe es aus
          wie ein Link, den man hier öffnen kann — es ist aber etwas, das er per Mail bekommt.
          Blau reicht, um es als zweiten Gegenstand neben der Adresse zu zeigen. Symbol aus
          lucide, kein Emoji (Hausregel). */}
      <p className="mt-2 flex items-center gap-2 text-[16px] font-semibold leading-[1.5] text-[#1d6fd0]">
        <FileText className="h-[18px] w-[18px] shrink-0" aria-hidden />
        So funktioniert es — Bedienungsanleitung
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => { setOffen(offen === "links" ? null : "links"); setFehler(""); setMeldung(""); }}
          className="rounded-xl bg-[#1d6fd0] px-5 py-3 text-[15px] font-extrabold text-white"
        >
          Senden
        </button>
        <button
          type="button"
          onClick={() => { setOffen(offen === "loeschen" ? null : "loeschen"); setFehler(""); setMeldung(""); }}
          className="rounded-xl border-[1.5px] border-[#c02626]/45 bg-white px-5 py-3 text-[15px] font-extrabold text-[#c02626]"
        >
          Löschen
        </button>
      </div>

      {/* DER SATZ ÜBER DEM FELD TRÄGT DIE ABSICHT, die es aufgeklappt hat — nicht ein
          neutrales „Deine E-Mail-Adresse", das beides und nichts heisst. */}
      {offen && (
        <div className={`mt-3.5 rounded-2xl border-[1.5px] p-4 ${
          offen === "loeschen" ? "border-[#c02626]/40 bg-[#fdf2f2]" : "border-[#dfe4e9] bg-[#f5f7f9]"}`}>
          <p className="text-[15px] leading-[1.5] text-[#14181c]">
            {offen === "loeschen"
              ? "Dein Trichter, diese Seite und alle Anfragen darin — endgültig. Den Löschlink schicken wir an die Adresse, mit der der Trichter angelegt wurde."
              : "An welche Adresse sollen wir Links und Anleitung schicken? Es muss die sein, mit der der Trichter angelegt wurde."}
          </p>
          <input
            type="email"
            value={mail}
            onChange={e => { setMail(e.target.value); if (fehler) setFehler(""); }}
            placeholder="name@praxis.de"
            autoComplete="email"
            autoFocus
            className="mt-3 w-full rounded-xl border-[1.5px] border-[#dfe4e9] bg-white px-4 py-3.5 text-[16px] text-[#14181c] placeholder:text-[#8b959d] outline-none focus:border-[#1d6fd0]"
          />
          <button
            type="button"
            disabled={laeuft}
            onClick={() => void schicken(offen)}
            className={`mt-3 rounded-xl px-6 py-3.5 text-[16px] font-extrabold text-white disabled:opacity-50 ${
              offen === "loeschen" ? "bg-[#c02626]" : "bg-[#1d6fd0]"}`}
          >
            {laeuft ? "Einen Moment …" : offen === "loeschen" ? "Löschlink schicken" : "Senden"}
          </button>
          {fehler && <p className="mt-3 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}
        </div>
      )}

      {meldung && <p className="mt-3 text-[15px] font-semibold text-[#14181c]">{meldung}</p>}
    </div>
  );
}
