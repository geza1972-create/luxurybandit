"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";
import { KARTE_TEXTE } from "@/components/EinladungKarte";

/**
 * NEUIGKEITEN UND GRUPPENCHAT — die dritte Karte unter der Einladung.
 *
 * Owner 31.07.2026: „und mach noch einen Gruppenchat. Das können sie auch bekommen." und
 * „die Gäste werden immer wieder über den Link rein müssen, um die neuesten News zu bekommen,
 * den sie per E-Mail erhalten. So bleiben sie immer auf dem Laufenden und können auch
 * miteinander in der Gruppe chatten."
 *
 * DAS IST DER KREISLAUF, FÜR DEN DAS ABO BEZAHLT WIRD. Ein Video ist eine Datei — die kauft
 * man einmal. Eine Hochzeit dauert Monate: Uhrzeit ändert sich, Saal ändert sich, Gäste
 * fragen. Das Paar schreibt eine Neuigkeit, jeder Gast bekommt eine Mail MIT DEM LINK, kommt
 * zurück und sieht den neuesten Stand — und die anderen Gäste. Deshalb gehört die Adresse zur
 * Zusage, und deshalb ist es ein Abo und kein Einmalkauf.
 *
 * Zwei getrennte Bereiche in einer Karte: Was das PAAR schreibt, gilt (oben, hervorgehoben).
 * Was die GÄSTE schreiben, ist Gespräch (darunter). Wer das vermischt, hat eine Pinnwand, auf
 * der niemand mehr findet, wann die Trauung beginnt.
 */

export type Nachricht = { name: string; text: string; at?: string };
export type Neuigkeit = { text: string; at?: string };

export default function GruppenChat({
  sprache, id, nachrichten, news = [], demo, sie, er,
}: {
  sprache: string;
  /** Ohne Kennung (Verkaufsseite) gibt es kein Eingabefeld — die Karte steht zum Ansehen da. */
  id?: string;
  nachrichten: Nachricht[];
  news?: Neuigkeit[];
  demo?: boolean;
  /** Für die Überschrift der Neuigkeiten: „Von Ana & Mihai". */
  sie?: string;
  er?: string;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const [liste, setListe] = useState<Nachricht[]>(nachrichten);
  /**
   * OHNE DAS BLIEB DER CHAT IN DER ERSTEN SPRACHE STECKEN (02.08.2026: Sprache auf „Română"
   * gestellt, die Nachrichten blieben deutsch). `useState(nachrichten)` liest den Startwert nur
   * beim ersten Rendern — wechselt die Sprache danach und die Elternseite schickt eine neue
   * `nachrichten`-Liste (z. B. die Demo-Nachrichten in der jeweiligen Sprache), bleibt `liste`
   * beim alten Stand, weil React den Anfangswert eines `useState` nie nachträglich übernimmt.
   */
  useEffect(() => { setListe(nachrichten); }, [nachrichten]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const eigenerName = useRef(false);

  /**
   * NUR DAS BRAUTPAAR DARF LÖSCHEN (Ä12, Owner 02.08.2026, nach Beratung ueber Chat-Zugriff:
   * der Chat bleibt offen fuer jeden mit dem Link — Loeschen ist das Sicherheitsventil, nicht
   * eine Zugriffssperre). Derselbe Pruef-Mechanismus wie in `EinladungBearbeiten.tsx`: der
   * Server entscheidet anhand der Geraetekennung (oder Admin-PIN), niemals der Browser allein.
   */
  const [darf, setDarf] = useState(false);
  useEffect(() => {
    if (!id || demo) return;
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    if (!device && !pin) return;
    void fetch("/api/einladung", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      body: JSON.stringify({ pruefen: id, device }),
    }).then(r => r.json()).then(d => setDarf(!!d?.darf)).catch(() => {});
  }, [id, demo]);

  const loeschen = async (m: Nachricht) => {
    if (!id) return;
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    const pin = (() => { try { return localStorage.getItem("luxurybandit-try-look-admin-pin") ?? ""; } catch { return ""; } })();
    const r = await fetch("/api/einladung", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(pin ? { "x-try-look-admin-pin": pin } : {}) },
      body: JSON.stringify({ chatLoeschen: id, device, at: m.at ?? "", name: m.name, text: m.text }),
    }).then(r2 => r2.json()).catch(() => null);
    if (r?.ok) setListe(Array.isArray(r.chat) ? r.chat : liste.filter(x => x !== m));
  };

  /**
   * Den Vornamen aus der Zusage übernehmen: Wer gerade „Ich komme" getippt hat, soll ihn für
   * die erste Nachricht nicht noch einmal eintippen. Eine zweite Hürde direkt nach der ersten
   * kostet mehr Leute, als der Chat wert wäre.
   */
  useEffect(() => {
    if (eigenerName.current || !id) return;
    try {
      const gemerkt = localStorage.getItem(`lb_einl_name_${id}`) ?? "";
      if (gemerkt) { setName(gemerkt); eigenerName.current = true; }
    } catch { /* egal */ }
  }, [id]);

  const senden = async () => {
    const n = name.trim(), t = text.trim();
    if (!n || !t || !id || busy) return;
    setBusy(true);
    const r = await fetch("/api/einladung", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat: id, name: n, text: t }),
    }).then(x => x.json()).catch(() => null);
    setBusy(false);
    if (!r?.ok) return;
    try { localStorage.setItem(`lb_einl_name_${id}`, n); } catch { /* egal */ }
    // Die Antwort bringt den ganzen Verlauf zurück — damit stehen auch die Nachrichten da,
    // die in der Zwischenzeit von anderen kamen.
    setListe(Array.isArray(r.chat) ? r.chat : [...liste, { name: n, text: t }]);
    setText("");
  };

  const zeit = (s?: string) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleDateString(sprache === "en" ? "en-GB" : `${sprache}-${sprache.toUpperCase()}`,
        { day: "numeric", month: "short" });
    } catch { return ""; }
  };

  return (
    <div className="lb-karte relative mt-4 overflow-hidden rounded-[20px] px-5 pb-6 pt-7 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <CornerOrnaments />
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />

      <div className="relative">
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.28em]">
          {T.chatTitel}
        </p>
        <DividerOrnament className="mt-2.5" />

        {/* WAS DAS PAAR SCHREIBT, GILT — deshalb oben und mit eigenem Rahmen. */}
        {news.length > 0 && (
          <div className="mt-3 space-y-2">
            {news.slice(0, 3).map((n, i) => (
              <div key={i} className="lb-karte-news rounded-[12px] px-3.5 py-2.5">
                <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.14em]">
                  {sie && er ? `${sie} & ${er}` : ""} {zeit(n.at)}
                </p>
                <p className="mt-0.5 whitespace-pre-line font-serif text-[14.5px] leading-snug">{n.text}</p>
              </div>
            ))}
          </div>
        )}

        {liste.length === 0 ? (
          <p className="mt-3 text-center font-serif text-[14px] opacity-70">{T.chatLeer}</p>
        ) : (
          /* WIE EIN CHAT, NICHT WIE EINE LISTE (Owner 31.07.2026: „das muss wie ein Chat
             aussehen"). Vorher standen Name und Text untereinander wie Protokollzeilen — man
             sah nicht, dass hier Menschen miteinander reden. Jetzt Sprechblasen mit einem
             Kreis davor: Das erkennt jeder in einer halben Sekunde, weil er es aus jedem
             Messenger kennt. Farben und Serifenschrift bleiben die der Karte — es soll wie
             ein Chat AUSSEHEN, nicht wie ein fremdes Programm in der Einladung. */
          <ul className="mt-3 space-y-2">
            {liste.slice(-40).map((m, i) => (
              <li key={i} className="flex items-end gap-2">
                <span className="lb-chat-kreis grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13px] font-black">
                  {(m.name || "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="lb-chat-blase min-w-0 max-w-[80%] rounded-2xl rounded-bl-md px-3 py-2">
                  <span className="lb-karte-gold block text-[10.5px] font-black uppercase tracking-[0.1em]">
                    {m.name}{m.at ? ` · ${zeit(m.at)}` : ""}
                  </span>
                  <span className="mt-0.5 block font-serif text-[14.5px] leading-snug">{m.text}</span>
                </span>
                {/* NUR FUERS PAAR (Ä12) — Gaeste sehen dieses ✕ nie. Rot als eigene Klasse, nie
                    als Inline-Style: `!important`-Regeln der Karte fressen sonst Inline-Farben. */}
                {darf && (
                  <button type="button" onClick={() => void loeschen(m)} aria-label={T.chatLoeschen}
                    className="lb-karte-fehler grid h-6 w-6 shrink-0 place-items-center rounded-full transition active:scale-90">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {id && !demo && (
          <div className="mt-4">
            <DividerOrnament />
            <input value={name} onChange={e => setName(e.target.value)} placeholder={T.zusName}
              maxLength={40} autoComplete="given-name"
              className="lb-karte-feld mt-3 h-11 w-full rounded-lg px-3 text-center font-serif text-[15px] outline-none" />
            <div className="mt-2 flex gap-2">
              <input value={text} onChange={e => setText(e.target.value)} placeholder={T.chatFeld}
                maxLength={500}
                onKeyDown={e => { if (e.key === "Enter") void senden(); }}
                className="lb-karte-feld h-11 min-w-0 flex-1 rounded-lg px-3 font-serif text-[15px] outline-none" />
              <button type="button" onClick={() => void senden()} disabled={!name.trim() || !text.trim() || busy}
                aria-label={T.chatSenden}
                className="lb-karte-cta grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-45">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
