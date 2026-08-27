"use client";

import { useState } from "react";
import { Eingabe, Knopf, Laden } from "@/components/CI";

/**
 * DIE BEWERBUNG IM CHAT BAUEN (Owner-Auftrag 26.08.2026: „wir müssten hier abfragen im
 * Chat, bis nicht mehr geht").
 *
 * WARUM ES DIESEN SCHRITT GIBT — der Fall Denisa: Eine echte Bewerberin kam über die
 * Facebook-Anzeige, bekam in dreieinhalb Minuten ihre Orientierung („Backoffice passt zu
 * dir"), erteilte die Einwilligung und war fertig. Verwertbar war davon nichts: kein
 * Werdegang, keine Nummer, kein Abschluss. Die Anzeige hatte ihr Wort gehalten, das
 * Produkt nicht.
 *
 * DIE ANZEIGE BLEIBT WAHR: Sie verspricht „in zwei Minuten herausfinden, was zu dir passt
 * — ohne Lebenslauf". Das ist Schritt 1 und bleibt ohne Hürde. DIESER Baustein ist Schritt
 * 2 und kommt erst NACH dem Ergebnis, freiwillig: Wer sich wirklich bewerben will, dem
 * fragen wir den Lebenslauf ab, statt ihn zu verlangen. Wer hier aussteigt, hat trotzdem
 * bekommen, was die Anzeige zugesagt hat.
 *
 * KEINE NEUE ANALYSE: Die Antworten werden zu einem Lebenslauf-TEXT zusammengesetzt und
 * durch `/api/bewerbung-pruefen` geschickt — dieselbe Prüfung wie bei einer hochgeladenen
 * Datei. Diese Route füllt danach auch Profil und Kandidaten-Akte. Ein zweiter Weg für
 * dieselbe Sache wäre genau die Doppelung, die im Haus verboten ist.
 *
 * FAST ALLES IST ANTIPPBAR (Hausregel „keine persönlichen Fragen, nur Buttons"): Getippt
 * wird nur, was sich nicht in Knöpfe fassen lässt — die Station selbst und der Erfolg.
 */

type Station = { rolle: string; von: string; bis: string; ergebnis: string };
type Sprache = { sprache: string; niveau: string };

const JAHRE = (() => {
  /* Feste Spanne statt `new Date()` — die Liste soll sich nicht mit dem Testdatum ändern. */
  const jetzt = 2026;
  return Array.from({ length: 26 }, (_, i) => String(jetzt - i));
})();
const ERFOLG_VORSCHLAEGE = [
  "Team eingearbeitet", "Nie Reklamationen", "Mehr Verantwortung bekommen",
  "Schneller fertig als geplant", "Kunden kamen wieder",
];
const AUSBILDUNG_ARTEN = ["Berufsschule", "Lyzeum / Abitur", "Studium", "Keine Ausbildung"];
const SPRACHEN_LISTE = ["Englisch", "Italienisch", "Spanisch", "Französisch", "Ungarisch"];
const NIVEAUS = ["Grundkenntnisse", "Gut", "Sehr gut", "Muttersprache"];
const SCHEINE = ["Staplerschein", "Arbeitssicherheit / SSM", "Schweißerpass", "Pflegezertifikat", "Erste Hilfe", "Keine"];
const GEHALT = ["bis 1500 €", "1500–2000 €", "2000–2500 €", "2500–3000 €", "über 3000 €", "Weiss ich nicht"];

export default function BewerbungBauen({ id, device, name, email, branchen, onFertig, onAbbruch }: {
  id: string; device: string; name: string; email: string; branchen: string[];
  onFertig: (ergebnis: unknown) => void; onAbbruch: () => void;
}) {
  const [schritt, setSchritt] = useState(0);
  const [stationen, setStationen] = useState<Station[]>([]);
  const [rolle, setRolle] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [ergebnis, setErgebnis] = useState("");
  const [ausbildungArt, setAusbildungArt] = useState("");
  const [ausbildungWas, setAusbildungWas] = useState("");
  const [sprachen, setSprachen] = useState<Sprache[]>([]);
  const [spracheOffen, setSpracheOffen] = useState("");
  const [scheine, setScheine] = useState<string[]>([]);
  const [gehalt, setGehalt] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");

  const weiter = () => setSchritt(s => s + 1);

  const stationSichern = () => {
    setStationen(prev => [...prev, { rolle: rolle.trim(), von, bis, ergebnis: ergebnis.trim() }]);
    setRolle(""); setVon(""); setBis(""); setErgebnis("");
  };

  const scheinUmschalten = (w: string) =>
    setScheine(prev => w === "Keine" ? ["Keine"]
      : prev.includes(w) ? prev.filter(x => x !== w) : [...prev.filter(x => x !== "Keine"), w]);

  /** Die Antworten als Lebenslauf-Text — genau die Form, die ein Personaler liest. */
  const alsText = () => [
    `LEBENSLAUF`, ``,
    `Name: ${name}`,
    `E-Mail: ${email}`,
    ``,
    `BERUFSERFAHRUNG`,
    ...stationen.map(st => `${st.von}–${st.bis}  ${st.rolle}${st.ergebnis ? `\n            ${st.ergebnis}` : ""}`),
    ``,
    `AUSBILDUNG`,
    `${ausbildungArt}${ausbildungWas.trim() ? ` — ${ausbildungWas.trim()}` : ""}`,
    ``,
    `SPRACHEN`,
    ...sprachen.map(s => `${s.sprache}: ${s.niveau}`),
    ``,
    ...(scheine.length && !scheine.includes("Keine") ? [`SCHEINE UND ZERTIFIKATE`, scheine.join(", "), ``] : []),
    ...(gehalt && gehalt !== "Weiss ich nicht" ? [`Gehaltswunsch: ${gehalt}`] : []),
  ].join("\n");

  const abschicken = async () => {
    setLaeuft(true); setFehler("");
    try {
      const r = await fetch("/api/bewerbung-pruefen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, device, name, email, branchen, text: alsText() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFehler(String(d?.error ?? "Hat nicht geklappt.")); setLaeuft(false); return; }
      onFertig(d);
    } catch { setFehler("Keine Verbindung."); }
    setLaeuft(false);
  };

  /* ── Bausteine ── */
  const Frage = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[15px] font-black leading-snug text-white/90">{children}</p>
  );
  const Chips = ({ werte, aktiv, waehle, mehrfach = false }: {
    werte: string[]; aktiv: string | string[]; waehle: (w: string) => void; mehrfach?: boolean;
  }) => (
    <div className="mt-3 flex flex-wrap gap-2">
      {werte.map(w => {
        const an = mehrfach ? (aktiv as string[]).includes(w) : aktiv === w;
        return (
          <button key={w} type="button" onClick={() => waehle(w)}
            className={`rounded-full border px-3.5 py-2 text-[13px] font-bold transition ${
              an ? "border-[#f6cf51] bg-[#f6cf51] text-[#1a160f]" : "border-white/20 bg-white/[0.04] text-white/75"}`}>
            {w}
          </button>
        );
      })}
    </div>
  );

  const fortschritt = Math.min(100, Math.round((schritt / 8) * 100));

  return (
    <div className="flex flex-col gap-3">
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#f6cf51] transition-all" style={{ width: `${fortschritt}%` }} />
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
        {/* 0 — die Stationen, die einzige Frage, die sich wiederholt */}
        {schritt === 0 && (<>
          <Frage>{stationen.length === 0 ? "Was hast du zuletzt gemacht?" : "Und was hast du davor gemacht?"}</Frage>
          <p className="mt-1 text-[12px] font-bold text-white/45">Beruf und Firma reichen — z. B. „Elektriker bei SC Instal".</p>
          <Eingabe className="mt-3" placeholder="Elektriker bei SC Instal" value={rolle} onChange={e => setRolle(e.target.value)} />
          <div className="mt-3">
            <Knopf art="gold" disabled={!rolle.trim()} onClick={weiter}>Weiter</Knopf>
          </div>
          {stationen.length > 0 && (
            <p className="mt-2 text-[12px] font-bold text-white/40">{stationen.length} {stationen.length === 1 ? "Station" : "Stationen"} gespeichert</p>
          )}
        </>)}

        {/* 1 — Zeitraum, reine Knöpfe */}
        {schritt === 1 && (<>
          <Frage>Von wann bis wann war das?</Frage>
          <p className="mt-3 text-[11px] font-black uppercase tracking-[0.08em] text-white/40">Von</p>
          <Chips werte={JAHRE.slice(0, 20)} aktiv={von} waehle={setVon} />
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.08em] text-white/40">Bis</p>
          <Chips werte={["heute", ...JAHRE.slice(0, 20)]} aktiv={bis} waehle={setBis} />
          <div className="mt-4"><Knopf art="gold" disabled={!von || !bis} onClick={weiter}>Weiter</Knopf></div>
        </>)}

        {/* 2 — DIE wichtige Frage: das Ergebnis */}
        {schritt === 2 && (<>
          <Frage>Was hast du da gut hinbekommen?</Frage>
          <p className="mt-1 text-[12px] font-bold text-white/45">
            Das ist die Zeile, die Personaler lesen. Tipp etwas an oder schreib es selbst.
          </p>
          <Chips werte={ERFOLG_VORSCHLAEGE} aktiv={ergebnis} waehle={setErgebnis} />
          <Eingabe className="mt-3" placeholder="… oder in eigenen Worten" value={ergebnis} onChange={e => setErgebnis(e.target.value)} />
          <div className="mt-3"><Knopf art="gold" onClick={() => { stationSichern(); setSchritt(3); }}>Weiter</Knopf></div>
        </>)}

        {/* 3 — noch eine Station? */}
        {schritt === 3 && (<>
          <Frage>Hattest du noch eine Stelle davor?</Frage>
          <div className="mt-3 flex flex-col gap-2">
            <Knopf art="umriss" onClick={() => setSchritt(0)}>Ja, noch eine</Knopf>
            <Knopf art="gold" onClick={() => setSchritt(4)}>Nein, das war alles</Knopf>
          </div>
        </>)}

        {/* 4 — Ausbildung */}
        {schritt === 4 && (<>
          <Frage>Was hast du gelernt?</Frage>
          <Chips werte={AUSBILDUNG_ARTEN} aktiv={ausbildungArt} waehle={setAusbildungArt} />
          {!!ausbildungArt && ausbildungArt !== "Keine Ausbildung" && (
            <Eingabe className="mt-3" placeholder="Was genau? z. B. Elektrotechnik" value={ausbildungWas}
              onChange={e => setAusbildungWas(e.target.value)} />
          )}
          <div className="mt-3"><Knopf art="gold" disabled={!ausbildungArt} onClick={weiter}>Weiter</Knopf></div>
        </>)}

        {/* 5 — weitere Sprachen */}
        {schritt === 5 && (<>
          <Frage>Welche Sprachen sprichst du noch?</Frage>
          <p className="mt-1 text-[12px] font-bold text-white/45">Deutsch kennen wir schon.</p>
          <Chips werte={SPRACHEN_LISTE} aktiv={sprachen.map(s => s.sprache)} mehrfach
            waehle={w => { setSpracheOffen(w); }} />
          {!!spracheOffen && (
            <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.03] p-3">
              <p className="text-[12.5px] font-black text-white/80">{spracheOffen} — wie gut?</p>
              <Chips werte={NIVEAUS} aktiv={sprachen.find(s => s.sprache === spracheOffen)?.niveau ?? ""}
                waehle={n => {
                  setSprachen(prev => [...prev.filter(s => s.sprache !== spracheOffen), { sprache: spracheOffen, niveau: n }]);
                  setSpracheOffen("");
                }} />
            </div>
          )}
          {sprachen.length > 0 && (
            <p className="mt-3 text-[12px] font-bold text-white/50">{sprachen.map(s => `${s.sprache}: ${s.niveau}`).join(" · ")}</p>
          )}
          <div className="mt-3 flex flex-col gap-2">
            <Knopf art="gold" onClick={weiter}>{sprachen.length ? "Weiter" : "Keine weiteren"}</Knopf>
          </div>
        </>)}

        {/* 6 — Scheine */}
        {schritt === 6 && (<>
          <Frage>Hast du Scheine oder Zertifikate?</Frage>
          <Chips werte={SCHEINE} aktiv={scheine} mehrfach waehle={scheinUmschalten} />
          <div className="mt-3"><Knopf art="gold" disabled={scheine.length === 0} onClick={weiter}>Weiter</Knopf></div>
        </>)}

        {/* 7 — Gehaltswunsch */}
        {schritt === 7 && (<>
          <Frage>Was möchtest du verdienen?</Frage>
          <p className="mt-1 text-[12px] font-bold text-white/45">Netto im Monat. Bleibt zwischen uns.</p>
          <Chips werte={GEHALT} aktiv={gehalt} waehle={setGehalt} />
          <div className="mt-3"><Knopf art="gold" disabled={!gehalt} onClick={weiter}>Weiter</Knopf></div>
        </>)}

        {/* 8 — fertig, prüfen lassen */}
        {schritt >= 8 && (<>
          <Frage>Das ist deine Bewerbung.</Frage>
          <p className="mt-1 text-[12px] font-bold text-white/45">
            {stationen.length} {stationen.length === 1 ? "Station" : "Stationen"} · {ausbildungArt || "—"}
            {sprachen.length ? ` · ${sprachen.length + 1} Sprachen` : ""}
          </p>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-white/15 bg-black/30 p-3 text-[11.5px] font-medium leading-snug text-white/70">
            {alsText()}
          </pre>
          {fehler && <p className="mt-3 text-[13px] font-bold text-red-400">{fehler}</p>}
          <div className="mt-3">
            <Knopf art="gold" disabled={laeuft} onClick={abschicken}>
              {laeuft ? "Ein Personaler liest gerade …" : "Bewerbung prüfen lassen"}
            </Knopf>
          </div>
        </>)}

        {laeuft && <div className="mt-3"><Laden art="flaeche" text="Wir lesen deine Bewerbung …" /></div>}
      </div>

      <button type="button" onClick={onAbbruch} className="text-center text-[12px] font-bold text-white/35 underline">
        Später weitermachen
      </button>
    </div>
  );
}
