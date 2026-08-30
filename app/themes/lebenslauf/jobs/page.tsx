"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eingabe, EingabeMehrzeilig, Knopf, Laden } from "@/components/CI";
import { BRANCHEN_QUELLE, BRANCHEN_SCHLUESSEL } from "@/lib/branchen";

/**
 * IST DAS EINE TOP-BEWERBUNG? (Owner-Auftrag 26.08.2026 — der Schnitt: „wir brauchen echte
 * Anzeigen gar nicht. Wir brauchen Branchen, wo er interessiert ist zu arbeiten. Wir
 * brauchen Bewerbungen. Und wir müssen seine Bewerbung analysieren.")
 *
 * VORHER STAND HIER eine Liste echter Stellenanzeigen zum Ankreuzen. Sie ist raus: Sie
 * versprach offene Stellen, für die niemand mit einer Firma gesprochen hatte. Jetzt kreuzt
 * er BRANCHEN an (`lib/branchen.ts`, dieselbe Quelle wie im Chat) und bekommt ein ehrliches
 * Urteil über seine Bewerbung — etwas, das wir wirklich liefern.
 *
 * HOCHLADEN IST PFLICHT, TEXT ZÄHLT (Owner: „er kann auch Text statt PDF oder DOCX
 * hochladen. Aber muss was hochladen."): Ohne Bewerbung gibt es nichts zu bewerten, der
 * Knopf bleibt zu.
 */

type Punkt = { schluessel: string; titel: string; einstufung: "stark" | "okay" | "schwach"; begruendung: string; naechsterSchritt: string };
type Chance = { branche: string; brancheName: string; einstufung: "gut" | "bruecke" | "schwach"; prozent: number; begruendung: string; wasFehlt: string };
type Ergebnis = { note: "top" | "solide" | "schwach"; prozent: number; fazit: string; chancen: Chance[]; punkte: Punkt[] };

/** Das Chancen-Urteil (Owner 26.08.2026: „ob er sich für den Job, den er will, Chancen
    hat") — dieselben drei Stufen wie überall im Haus. */
const CHANCE_TEXT: Record<Chance["einstufung"], { titel: string; farbe: string }> = {
  gut: { titel: "Du kannst dich bewerben", farbe: "#4ade80" },
  bruecke: { titel: "Erreichbar — ein Stück fehlt", farbe: "#f6cf51" },
  schwach: { titel: "Hier hast du kaum Chancen", farbe: "#f87171" },
};

const NOTE_TEXT: Record<Ergebnis["note"], { titel: string; farbe: string }> = {
  top: { titel: "Top-Bewerbung", farbe: "#f6cf51" },
  solide: { titel: "Solide — mit Lücken", farbe: "#e0e0e0" },
  schwach: { titel: "So solltest du sie nicht verschicken", farbe: "#f87171" },
};
const STUFE_TEXT: Record<Punkt["einstufung"], { zeichen: string; farbe: string }> = {
  stark: { zeichen: "✓", farbe: "#4ade80" },
  okay: { zeichen: "•", farbe: "#e0e0e0" },
  schwach: { zeichen: "!", farbe: "#f87171" },
};

/**
 * DIE VORLAGE FÜR DEN, DER NICHTS HAT (Owner 26.08.2026: „Sagt er nein, dann fragt man ihn
 * ehrlich, wie willst du dich jetzt bei Firmen vorstellen. Willst du dir noch mal Zeit
 * nehmen und nach dieser Vorlage zumindest ein Textdokument eingeben?")
 *
 * KEIN AUSSORTIEREN, SONDERN EIN WEG: Wer kein CV-Dokument hat — Handwerker, Fahrer,
 * Pflegekräfte, also der grössere Teil der Zielgruppe — bekommt hier das Gerüst, das eine
 * Firma sehen muss. Ausgefüllt ist es eine Bewerbung und geht durch dieselbe Prüfung.
 */
const VORLAGE = `Name:
Telefon:
Stadt:

Was ich zuletzt gemacht habe:
(Beruf, Firma, von–bis)

Davor:
(Beruf, Firma, von–bis)

Was ich gut kann:
-
-

Ausbildung / höchster Abschluss:

Sprachen mit Niveau:
Deutsch:
Englisch:

Führerschein:

Warum ich in dieser Branche arbeiten will:
(zwei, drei Sätze in eigenen Worten)
`;

export default function BewerbungPruefenSeite() {
  const params = useSearchParams();
  const id = params.get("id")?.trim() ?? "";

  const [branchen, setBranchen] = useState<Set<string>>(new Set());
  const [datei, setDatei] = useState<File | null>(null);
  const [cvPath, setCvPath] = useState("");
  const [text, setText] = useState("");
  const [textOffen, setTextOffen] = useState(false);
  const [nichtsDa, setNichtsDa] = useState(false);
  /* Name und E-Mail stehen jetzt am Anfang (Owner 26.08.2026, nach dem Fall Denisa). */
  const [bewName, setBewName] = useState("");
  const [bewMail, setBewMail] = useState("");
  const [laedtHoch, setLaedtHoch] = useState(false);
  const [prueft, setPrueft] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [fehler, setFehler] = useState("");
  const dateiFeld = useRef<HTMLInputElement>(null);

  /* Premium — der Rückruf, nicht die Kasse. */
  const [premiumDa, setPremiumDa] = useState(false);
  const [premiumLaeuft, setPremiumLaeuft] = useState(false);
  const [brauchtTelefon, setBrauchtTelefon] = useState(false);
  const [telefon, setTelefon] = useState("");

  const schwachePunkte = ergebnis?.punkte.filter(p => p.einstufung === "schwach").length ?? 0;

  const premiumMerken = async () => {
    setPremiumLaeuft(true); setFehler("");
    try {
      const r = await fetch("/api/premium-interesse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, device: device(), telefon: telefon.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        /* Fehlt die Nummer, blendet der Server das Feld ein statt abzuweisen. */
        if (d?.brauchtTelefon) setBrauchtTelefon(true);
        else setFehler(d?.error || "Hat nicht geklappt.");
        setPremiumLaeuft(false); return;
      }
      setPremiumDa(true);
    } catch { setFehler("Keine Verbindung."); }
    setPremiumLaeuft(false);
  };

  const device = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };

  const umschalten = (b: string) => {
    setErgebnis(null);
    setBranchen(prev => { const n = new Set(prev); if (n.has(b)) n.delete(b); else n.add(b); return n; });
  };

  /** Direkt zu Supabase (Memory `large-uploads-direct-to-supabase`), wie im Trichter. */
  const hochladen = async (f: File) => {
    setLaedtHoch(true); setFehler(""); setErgebnis(null); setDatei(f); setText(""); setTextOffen(false);
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase();
      const signiert = await fetch("/api/lebenslauf-video-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extension: ext }),
      }).then(r => r.json());
      if (!signiert?.uploadUrl || !signiert?.path) throw new Error("upload-url");
      const put = await fetch(signiert.uploadUrl, {
        method: "PUT", headers: { "Content-Type": f.type || "application/octet-stream", "x-upsert": "true" }, body: f,
      });
      if (!put.ok) throw new Error("upload-put");
      setCvPath(signiert.path);
    } catch {
      setFehler("Die Datei liess sich nicht hochladen. Du kannst deine Bewerbung auch als Text einfügen.");
      setDatei(null);
    }
    setLaedtHoch(false);
  };

  /* DIE UNAUSGEFÜLLTE VORLAGE IST KEINE BEWERBUNG: Sie ist länger als jede Mindestlänge,
     enthält aber nichts über ihn. Gezählt wird nur, was NICHT aus der Vorlage stammt. */
  const vorlageZeilen = new Set(VORLAGE.split("\n").map(z => z.trim()).filter(Boolean));
  const eigenes = text.split("\n").map(z => z.trim())
    .filter(z => z && !vorlageZeilen.has(z)).join(" ");
  const hatBewerbung = !!cvPath || eigenes.length > 60;
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(bewMail.trim());
  const bereit = !!bewName.trim() && mailOk && hatBewerbung && branchen.size > 0 && !laedtHoch;

  const pruefen = async () => {
    setPrueft(true); setFehler(""); setErgebnis(null);
    try {
      const r = await fetch("/api/bewerbung-pruefen", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, device: device(), name: bewName.trim(), email: bewMail.trim(), branchen: Array.from(branchen), cvPath, text: text.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFehler(d?.error || "Die Prüfung hat nicht geklappt."); setPrueft(false); return; }
      setErgebnis(d as Ergebnis);
    } catch { setFehler("Keine Verbindung."); }
    setPrueft(false);
  };

  return (
    <main className="lb-bg min-h-screen px-4 pb-28 pt-8 text-white">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-[20px] font-black">Ist deine Bewerbung gut genug?</h1>
        <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/60">
          Wir lesen sie und sagen dir ehrlich, was ein Personaler sehen wird — und was du ändern solltest.
        </p>

        {/* ── 1. Wer bist du? (Owner 26.08.2026: Name und E-Mail ganz am Anfang) ── */}
        <p className="mt-6 text-[12px] font-black uppercase tracking-[0.08em] text-white/45">
          1 · Wer bist du?
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <Eingabe placeholder="Dein Name" value={bewName}
            onChange={e => { setErgebnis(null); setBewName(e.target.value); }} />
          <Eingabe type="email" placeholder="deine@email.com" value={bewMail}
            onChange={e => { setErgebnis(null); setBewMail(e.target.value); }} />
        </div>

        {/* ── 2. Bewerbung ── */}
        <p className="mt-7 text-[12px] font-black uppercase tracking-[0.08em] text-white/45">
          2 · Deine Bewerbung
        </p>
        <p className="mt-1 text-[12px] font-bold text-white/45">PDF, Word — oder füg sie einfach als Text ein.</p>

        <div className="mt-2.5 flex flex-col gap-2">
          <Knopf art={cvPath ? "chip" : "umriss"} aktiv={!!cvPath} onClick={() => dateiFeld.current?.click()}>
            {laedtHoch ? "Lädt hoch …" : datei ? `✓ ${datei.name.slice(0, 30)}` : "Datei hochladen (PDF / Word)"}
          </Knopf>
          {!cvPath && (
            <Knopf art={textOffen ? "chip" : "umriss"} aktiv={textOffen} onClick={() => { setTextOffen(true); setNichtsDa(false); }}>
              Oder Text einfügen
            </Knopf>
          )}
          {!cvPath && !text.trim() && (
            <Knopf art="umriss" onClick={() => { setNichtsDa(true); setTextOffen(true); setText(VORLAGE); }}>
              Ich habe gar nichts
            </Knopf>
          )}
        </div>

        {/* DER EHRLICHE EINWAND (Owner 26.08.2026) — kein Vorwurf, eine Frage plus ein Weg. */}
        {nichtsDa && (
          <div className="mt-3 rounded-2xl border border-white/20 bg-white/[0.04] p-3.5">
            <p className="text-[13.5px] font-black leading-snug text-white/85">
              Und wie willst du dich dann bei einer Firma vorstellen?
            </p>
            <p className="mt-1.5 text-[12.5px] font-bold leading-snug text-white/60">
              Ohne irgendetwas Geschriebenes geht es nicht — keine Firma lädt jemanden ein, von dem sie nichts weiss.
              Nimm dir zehn Minuten und füll wenigstens diese Vorlage aus. Das reicht als Anfang.
            </p>
          </div>
        )}
        <input ref={dateiFeld} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void hochladen(f); }} />

        {textOffen && !cvPath && (
          <div className="mt-2.5">
            <EingabeMehrzeilig zeilen={8} placeholder="Füge hier deinen Lebenslauf und dein Anschreiben ein …"
              value={text} onChange={e => { setErgebnis(null); setText(e.target.value); }} />
            {text.trim().length > 0 && !hatBewerbung && (
              <p className="mt-1.5 text-[12px] font-bold text-white/45">
                {nichtsDa ? "Füll die Zeilen aus — noch steht nichts über dich drin." : "Das ist noch zu wenig zum Bewerten."}
              </p>
            )}
          </div>
        )}

        {/* ── 3. Branchen ── */}
        <p className="mt-7 text-[12px] font-black uppercase tracking-[0.08em] text-white/45">
          3 · In welchen Branchen willst du arbeiten?
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BRANCHEN_SCHLUESSEL.map(b => (
            <button key={b} type="button" onClick={() => umschalten(b)}
              className={`rounded-full border px-3.5 py-2 text-[13px] font-bold transition ${
                branchen.has(b) ? "border-[#f6cf51] bg-[#f6cf51] text-[#1a160f]"
                : "border-white/20 bg-white/[0.04] text-white/75"}`}>
              {BRANCHEN_QUELLE[b]}
            </button>
          ))}
        </div>

        {fehler && <p className="mt-4 text-[13px] font-bold text-red-400">{fehler}</p>}

        {!ergebnis && (
          <div className="mt-6">
            <Knopf art="gold" onClick={pruefen} disabled={!bereit || prueft}>
              {prueft ? "Wir lesen deine Bewerbung …" : "Bewerbung prüfen"}
            </Knopf>
            {!bereit && !prueft && (
              <p className="mt-2 text-[12px] font-bold text-white/45">
                {!bewName.trim() || !mailOk ? "Trag deinen Namen und deine E-Mail ein."
                  : !hatBewerbung ? "Lade deine Bewerbung hoch oder füg sie als Text ein."
                  : "Wähle mindestens eine Branche."}
              </p>
            )}
          </div>
        )}

        {prueft && <div className="mt-5"><Laden art="flaeche" text="Ein Personaler liest gerade mit …" /></div>}

        {/* ── 3. Das Urteil ── */}
        {ergebnis && (
          <div className="mt-7">
            <div className="rounded-2xl border p-4"
              style={{ borderColor: `${NOTE_TEXT[ergebnis.note].farbe}66`, background: `${NOTE_TEXT[ergebnis.note].farbe}14` }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[17px] font-black" style={{ color: NOTE_TEXT[ergebnis.note].farbe }}>
                  {NOTE_TEXT[ergebnis.note].titel}
                </p>
                <p className="text-[15px] font-black text-white/70">{ergebnis.prozent}%</p>
              </div>
              {!!ergebnis.fazit && <p className="mt-2 text-[13px] font-bold leading-snug text-white/75">{ergebnis.fazit}</p>}
            </div>

            {/* DAS URTEIL ÜBER SEINE LAGE — steht VOR der Dokumentprüfung, weil es die
                Frage ist, mit der er gekommen ist. */}
            {!!ergebnis.chancen?.length && (
              <>
                <p className="mt-6 text-[12px] font-black uppercase tracking-[0.08em] text-white/45">
                  Deine Chancen in diesen Branchen
                </p>
                <div className="mt-2 flex flex-col gap-2.5">
                  {ergebnis.chancen.map(c => (
                    <div key={c.branche} className="rounded-2xl border p-3.5"
                      style={{ borderColor: `${CHANCE_TEXT[c.einstufung].farbe}55`, background: `${CHANCE_TEXT[c.einstufung].farbe}12` }}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[14px] font-black text-white/90">{c.brancheName}</p>
                        <p className="text-[13px] font-black" style={{ color: CHANCE_TEXT[c.einstufung].farbe }}>{c.prozent}%</p>
                      </div>
                      <p className="mt-0.5 text-[12.5px] font-black" style={{ color: CHANCE_TEXT[c.einstufung].farbe }}>
                        {CHANCE_TEXT[c.einstufung].titel}
                      </p>
                      {!!c.begruendung && <p className="mt-1.5 text-[12.5px] font-bold leading-snug text-white/65">{c.begruendung}</p>}
                      {!!c.wasFehlt && <p className="mt-1.5 text-[12.5px] font-bold leading-snug text-white/45">Was fehlt: {c.wasFehlt}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}

            <p className="mt-6 text-[12px] font-black uppercase tracking-[0.08em] text-white/45">
              Deine Bewerbung im Einzelnen
            </p>
            <div className="mt-2 flex flex-col gap-2.5">
              {ergebnis.punkte.map(p => (
                <div key={p.schluessel} className="rounded-2xl border border-white/15 bg-white/[0.04] p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-full text-[12px] font-black"
                      style={{ background: `${STUFE_TEXT[p.einstufung].farbe}22`, color: STUFE_TEXT[p.einstufung].farbe }}>
                      {STUFE_TEXT[p.einstufung].zeichen}
                    </span>
                    <p className="text-[14px] font-black text-white/90">{p.titel}</p>
                  </div>
                  {!!p.begruendung && <p className="mt-1.5 text-[12.5px] font-bold leading-snug text-white/60">{p.begruendung}</p>}
                  {!!p.naechsterSchritt && (
                    <p className="mt-1.5 text-[12.5px] font-bold leading-snug text-[#f6cf51]/85">→ {p.naechsterSchritt}</p>
                  )}
                </div>
              ))}
            </div>

            {/* ── DAS PREMIUM-PAKET (Owner 26.08.2026) — kein Sofortkauf, ein Rückruf.
                Der Aufhänger richtet sich nach dem Urteil: Wer Lücken hat, braucht die
                Reparatur; wer eine gute Bewerbung hat, den überzeugt das Video. ── */}
            <div className="mt-7 rounded-2xl border border-[#f6cf51]/40 lb-goldhauch p-4">
              <p className="text-[15px] font-black text-[#f6cf51]">
                {ergebnis.note === "top"
                  ? "Deine Bewerbung ist gut. Willst du auffallen?"
                  : `Du hast ${schwachePunkte} ${schwachePunkte === 1 ? "Lücke" : "Lücken"}. Wir machen sie zu.`}
              </p>
              <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/70">
                {ergebnis.note === "top"
                  ? "Wir setzen uns zusammen, machen aus deiner Bewerbung ein Profi-PDF und ein Video, das dich zeigt — nicht nur Papier."
                  : "Wir setzen uns persönlich zusammen, gehen deine Bewerbung durch und du bekommst sie als Profi-PDF und als Video."}
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {["Ein persönliches Gespräch mit uns", "Deine Bewerbung als Profi-PDF", "Dein Bewerbungsvideo"].map(z => (
                  <li key={z} className="flex items-start gap-2 text-[13px] font-bold text-white/80">
                    <span className="mt-[3px] text-[#f6cf51]">✓</span>{z}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] font-black text-white/85">100 €</p>

              {!premiumDa ? (
                <>
                  {brauchtTelefon && (
                    <div className="mt-3">
                      <p className="text-[12px] font-bold text-white/55">Unter welcher Nummer erreichen wir dich?</p>
                      <Eingabe className="mt-1.5" type="tel" placeholder="+40 …" value={telefon}
                        onChange={e => setTelefon(e.target.value)} />
                    </div>
                  )}
                  <div className="mt-3">
                    <Knopf art="gold" onClick={premiumMerken}
                      disabled={premiumLaeuft || (brauchtTelefon && telefon.trim().length < 6)}>
                      {premiumLaeuft ? "Moment …" : "Ja, ruft mich an"}
                    </Knopf>
                  </div>
                  <p className="mt-2 text-[11.5px] font-bold text-white/40">
                    Kein Kauf — wir melden uns innerhalb von 48 Stunden und du entscheidest danach.
                  </p>
                </>
              ) : (
                <div className="mt-3 rounded-xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 p-3">
                  <p className="text-[13.5px] font-black text-[#f6cf51]">Wir melden uns innerhalb von 48 Stunden.</p>
                  <p className="mt-1 text-[12.5px] font-bold text-white/60">Du musst nichts weiter tun.</p>
                </div>
              )}
            </div>

            <div className="mt-5">
              <Knopf art="umriss" onClick={() => { setErgebnis(null); setFehler(""); }}>Noch einmal prüfen</Knopf>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
