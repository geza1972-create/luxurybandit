"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Kasten, EingabeMehrzeilig, Fehlerzeile, Laden } from "@/components/CI";

/**
 * DER FIRMEN-CHAT — EIN GEFÜHRTES GESPRÄCH, KEINE KNOPF-WAND (Owner 25.08.2026, in vier
 * Schritten dorthin: „Die Firmen müssen auch einen Chat bekommen" → „Die zwei grossen
 * Buttons stören. Es muss alles im Chat stattfinden … nur ein Feld, wo der Chat dich
 * fragt: Interesse an Geza? Ja / Nein. Wer / welche Firma bist du, deine Kontaktdaten."
 * → zuletzt: „das braucht man nicht, man sieht doch alles in der Bewerbung. Eventuell
 * Fragen an ihn, die weitergeleitet werden").
 *
 * ES GIBT KEINE KI-ANTWORTEN MEHR: Das Dossier selbst IST die Antwort. Eine frei
 * getippte Eingabe gilt als FRAGE AN DEN BEWERBER und wird WEITERGELEITET — der Chat
 * sammelt dafür dasselbe ein wie beim Interesse-Weg (Name/Firma, E-Mail) und schickt
 * alles über die bestehende /api/contact. Die frühere öffentliche Antwort-Route
 * (/api/lebenslauf-frage) ist damit ersatzlos gelöscht — samt der Missbrauchs-Sorge
 * eines offenen KI-Endpoints.
 *
 * DER ABLAUF: Eröffnungsfrage mit Ja/Nein als Antwort-Chips (die einzigen Knöpfe, und es
 * sind Antworten, keine Funktionen). Ja → Name/Firma → E-Mail → optionale Nachricht →
 * abschicken. Getippte Frage → Weiterleitungs-Zeile → Name/Firma → E-Mail → abschicken
 * (die Frage IST die Nachricht). Nein → freundlicher Ausstieg, das Feld bleibt offen.
 *
 * Kein Seitenwechsel, kein Overlay, EIN Feld, keine Trennlinie unter der Kopfzeile
 * (Owner: „die Linie stört, die weisse"). Abbrechen ist der garantierte Ausweg (Memory
 * `immer-close-einbauen`); Absagen stehen ROT am Feld (Memory
 * `sichtbare-fehler-keine-formularfelder`).
 */

export type FirmenChatTexte = {
  /** Die Eröffnungsfrage des Chats — „Interesse an Geza?" (T.interessiert(vorname)). */
  frage: string;
  ja: string; nein: string;
  frageWer: string; frageMail: string; frageNachricht: string;
  /** Die Weiterleitungs-Zeile nach einer getippten Frage (T.frageLeiten(vorname)). */
  frageLeiten: string;
  ohneNachricht: string; neinAntwort: string; danke: string; zu: string;
  platzhalter: string; phName: string; phMail: string; phNachricht: string;
  senden: string; denkt: string;
};

type Schritt = "frei" | "name" | "mail" | "nachricht" | "fertig";

export default function ProfilChatEinstieg({ texte, kandidat = "", karte = false, className = "", profilId = "", onInteresse }: {
  texte: FirmenChatTexte;
  kandidat?: string;
  karte?: boolean;
  className?: string;
  /** Kennung der Bewerbung — fertige Anfragen werden daran abgelegt (/api/lebenslauf-anfrage),
      damit der Besitzer sie auf seiner Seite sieht und loeschen kann (Owner 25.08.2026). */
  profilId?: string;
  /** "wenn jemand anfaengt zu tippen ... 1 Person hat Interesse gezeigt" (Owner 25.08.2026)
      — feuert EINMAL beim ersten Griff zum Chat (Ja-Chip oder erstes Tippen). Der Aufrufer
      reicht ihn nur fuer FREMDE herein (der Besitzer zaehlt sich nie selbst). */
  onInteresse?: () => void;
}) {
  const [msgs, setMsgs] = useState<{ von: "ich" | "ki"; text: string }[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [busy, setBusy] = useState(false);
  const [schritt, setSchritt] = useState<Schritt>("frei");
  /** Ja/Nein bleibt stehen, bis eine Antwort fällt oder eine Frage getippt wird. */
  const [jaNeinOffen, setJaNeinOffen] = useState(true);
  const [fehler, setFehler] = useState("");
  const anfrage = useRef({ name: "", mail: "" });
  /** Eine frei getippte Frage — sie wird zur Nachricht der Weiterleitung. */
  const frageVorab = useRef("");
  /** Interesse wird je Seitenaufruf genau einmal gemeldet. */
  const interesseGemeldet = useRef(false);
  const interesseMelden = () => {
    if (interesseGemeldet.current) return;
    interesseGemeldet.current = true;
    onInteresse?.();
  };
  const ende = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (msgs.length > 0) ende.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  const ki = (text: string) => setMsgs(m => [...m, { von: "ki", text }]);
  const ich = (text: string) => setMsgs(m => [...m, { von: "ich", text }]);

  const platzhalter = schritt === "name" ? texte.phName
    : schritt === "mail" ? texte.phMail
    : schritt === "nachricht" ? texte.phNachricht
    : texte.platzhalter;

  const abschicken = async (nachricht: string) => {
    setBusy(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: anfrage.current.name, email: anfrage.current.mail, reason: "general",
          message: `[${texte.frage}] ${kandidat} — ${typeof window !== "undefined" ? window.location.href : ""}\n\n${nachricht || "—"}`,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        ki(texte.danke); setSchritt("fertig");
        /* Die Ablage fuer den Besitzer — Feuer-und-vergessen: die Mail ist schon raus,
           eine verlorene Ablage bricht dem Absender nichts ab. */
        if (profilId) {
          void fetch("/api/lebenslauf-anfrage", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: profilId, name: anfrage.current.name, mail: anfrage.current.mail, nachricht }),
          }).catch(() => { /**/ });
        }
      }
      else setFehler(String(d?.error ?? "Error"));
    } catch { setFehler("—"); }
    setBusy(false);
  };

  const senden = async () => {
    const text = eingabe.trim();
    if (busy) return;
    setFehler("");

    if (schritt === "name") {
      if (text.length < 2) { setFehler(texte.phName); return; }
      anfrage.current.name = text.slice(0, 120);
      setEingabe(""); ich(text); ki(texte.frageMail); setSchritt("mail");
      return;
    }
    if (schritt === "mail") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) { setFehler(texte.phMail); return; }
      anfrage.current.mail = text.toLowerCase().slice(0, 200);
      setEingabe(""); ich(text);
      /* Kam der Weg über eine getippte Frage, IST sie die Nachricht — direkt abschicken,
         kein weiterer Schritt. Der Ja-Weg bekommt die optionale Nachricht. */
      if (frageVorab.current) { await abschicken(frageVorab.current); return; }
      ki(texte.frageNachricht); setSchritt("nachricht");
      return;
    }
    if (schritt === "nachricht") {
      setEingabe(""); if (text) ich(text);
      await abschicken(text.slice(0, 4000));
      return;
    }

    /* Freier Modus: eine getippte FRAGE AN DEN BEWERBER — sie wird weitergeleitet
       (Owner: keine KI-Antworten, „man sieht doch alles in der Bewerbung"). */
    if (!text) return;
    frageVorab.current = text.slice(0, 4000);
    setEingabe(""); setJaNeinOffen(false);
    ich(text); ki(texte.frageLeiten); setSchritt("name");
  };

  const jaGeklickt = () => {
    interesseMelden();
    setJaNeinOffen(false); setFehler("");
    ich(texte.ja); ki(texte.frageWer); setSchritt("name");
  };
  const neinGeklickt = () => {
    setJaNeinOffen(false); setFehler("");
    ich(texte.nein); ki(texte.neinAntwort);
  };
  const abbrechen = () => {
    setSchritt("frei"); setFehler(""); setEingabe("");
    anfrage.current = { name: "", mail: "" };
    frageVorab.current = "";
    ki(texte.neinAntwort);
  };

  return (
    <div className={`mt-4 ${className}`}>
      {/* KEINE KOPFZEILE, KEINE FRAGE-WIEDERHOLUNG (Owner 25.08.2026: „Frag nach Gezas
          Erfahrung interessiert niemand, und Interesse an Geza? ist redundant" — die
          Frage steht als Abschnitts-Überschrift direkt darüber). Der Kasten beginnt mit
          der Antwort: Ja/Nein und das eine Feld. */}
      <Kasten karte={karte} polster="p-0">
        <div className="px-4 pb-4 pt-4">
          <div className="flex flex-col gap-2.5">
            {/* Ja/Nein — Antwort-Chips, keine Funktions-Knöpfe. Ja trägt das eine Gold
                der Seite (Skill `ci-design`): Es IST die Entscheidung, für die die ganze
                Seite arbeitet. */}
            {jaNeinOffen && schritt === "frei" && (
              <div className="flex gap-2">
                <button type="button" onClick={jaGeklickt}
                  className="h-10 rounded-full bg-gradient-to-b from-[#f9de7a] to-[#e0a93e] px-6 text-[13px] font-black text-[#1a1204]">
                  {texte.ja}
                </button>
                <button type="button" onClick={neinGeklickt}
                  className={`h-10 rounded-full border px-6 text-[13px] font-black ${karte ? "border-[#1a160f]" : "border-white/35 text-white/80"}`}>
                  {texte.nein}
                </button>
              </div>
            )}

            {msgs.map((m, i) => m.von === "ich" ? (
              <p key={i} className={`ml-auto max-w-[85%] rounded-2xl rounded-br-md px-3 py-2 text-[12.5px] font-bold leading-snug ${karte ? "bg-[#1a160f]/[0.07]" : "bg-white/10 text-white/90"}`}>
                {m.text}
              </p>
            ) : (
              <p key={i} className={`flex items-start gap-2 text-[12.5px] font-bold leading-snug ${karte ? "opacity-85" : "text-white/85"}`}>
                {schritt === "fertig" && i === msgs.length - 1 && <Check className="mt-[1px] h-4 w-4 shrink-0 text-[#2f7d4f]" />}
                {m.text}
              </p>
            ))}
            {busy && (
              <p className={`flex items-center gap-2 text-[12.5px] font-bold leading-snug ${karte ? "opacity-60" : "text-white/55"}`}>
                <Laden art="knopf" karte={karte} />{texte.denkt}
              </p>
            )}
            <div ref={ende} />
          </div>

          {/* DAS EINE FELD (Owner: „Es muss nur ein Feld sein") — sein Platzhalter folgt
              dem Gesprächsschritt. Nach dem Absenden ist das Gespräch zu Ende. */}
          {schritt !== "fertig" && (
            <>
              <Fehlerzeile karte={karte}>{fehler}</Fehlerzeile>
              <div className="mt-3 flex items-end gap-2">
                <EingabeMehrzeilig karte={karte} zeilen={1} className="flex-1" value={eingabe}
                  placeholder={platzhalter}
                  onChange={e => { if (e.target.value.trim()) interesseMelden(); setEingabe(e.target.value); }} />
                <button type="button" disabled={busy || (schritt !== "nachricht" && !eingabe.trim())}
                  onClick={() => void senden()}
                  className={`h-10 shrink-0 rounded-full border px-4 text-[12.5px] font-black transition disabled:opacity-40 ${karte ? "border-[#1a160f]" : "border-white/40 text-white/85 hover:border-white/70"}`}>
                  {schritt === "nachricht" && !eingabe.trim() ? texte.ohneNachricht : texte.senden}
                </button>
              </div>
              {(schritt === "name" || schritt === "mail" || schritt === "nachricht") && (
                <button type="button" onClick={abbrechen}
                  className={`mt-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${karte ? "opacity-50 hover:opacity-80" : "text-white/45 hover:text-white/80"}`}>
                  {texte.zu}
                </button>
              )}
            </>
          )}
        </div>
      </Kasten>
    </div>
  );
}
