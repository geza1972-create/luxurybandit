"use client";

import { useState } from "react";
import { Briefcase, Building2, Check, Link2, Mail, User } from "lucide-react";
import { Knopf, Kasten, Eingabe, Fehlerzeile, Fortschritt } from "@/components/CI";
import { logTunnelEvent } from "@/lib/track-funnel";
import type { RecruitingText } from "@/lib/recruiting-i18n";

/**
 * DAS BESCHRIFTETE FELD — AUSSERHALB DER KOMPONENTE (und nicht darin).
 *
 * Eine Hülle, die im Rumpf der Komponente definiert wird, ist bei jedem Tastendruck eine
 * NEUE Funktion: React hängt das Eingabefeld darin ab und neu auf, und der Cursor springt
 * nach dem ersten Buchstaben heraus. In einem Formular, das über eine Akquise-Anfrage
 * entscheidet, wäre das der teuerste denkbare Fehler.
 */
function Feld({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mt-3.5 lg:mt-0 ${className}`}>
      <label className="block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/**
 * DIE PILOT-ANFRAGE EINES UNTERNEHMENS (Owner 31.08.2026: „Ziel ist nicht, noch mehr Produkt
 * zu bauen, sondern eine Seite zu haben, mit der ich Recruiter und Unternehmen gezielt
 * ansprechen kann.").
 *
 * FÜNF FELDER, VIER DAVON PFLICHT — mehr braucht ein erstes Gespräch nicht. Was ein
 * Verkaufsformular sonst noch abfragt (Firmengrösse, Budget, Zeitrahmen), beantwortet er im
 * Gespräch besser, und jede zusätzliche Zeile hier kostet Anfragen. Gemessen am
 * Kandidaten-Trichter, wo genau das der Fehler war.
 *
 * ES GEHT AN DIESELBE ROUTE WIE DER AGENTEN-CHAT (`/api/agent-anfrage`, `art: "recruiting"`):
 * dieselbe Ablage, dasselbe Postfach, dieselbe Notfall-Antwort, wenn eines von beidem
 * ausfällt. Unterschieden wird die Anfrage über ihr `art`, nicht über einen zweiten Speicher.
 */
export default function RecruitingAnfrage({ T }: { T: RecruitingText }) {
  const [name, setName] = useState("");
  const [firma, setFirma] = useState("");
  const [mail, setMail] = useState("");
  const [position, setPosition] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState("");
  const [fertig, setFertig] = useState(false);

  const geraet = () => { try { return localStorage.getItem("lb_visitor") ?? ""; } catch { return ""; } };

  const senden = async () => {
    if (name.trim().length < 2) { setFehler(T.fehlerName); return; }
    if (firma.trim().length < 2) { setFehler(T.fehlerFirma); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim())) { setFehler(T.fehlerMail); return; }
    if (position.trim().length < 2) { setFehler(T.fehlerPosition); return; }

    setBusy(true); setFehler("");
    try {
      const d = await fetch("/api/agent-anfrage", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          art: "recruiting",
          name: name.trim(), firma: firma.trim(), email: mail.trim(),
          position: position.trim(), stellenLink: link.trim(),
          sprache: "de", device: geraet(),
        }),
      }).then(r => r.json());
      if (d?.error) { setFehler(String(d.error)); setBusy(false); return; }
      void logTunnelEvent("lead_created", "recruiting");
      setFertig(true);
    } catch {
      setFehler(T.fehlerTechnik);
    }
    setBusy(false);
  };

  /* Die Bestätigung ersetzt das Formular — sie sagt, was als Nächstes passiert, und
     verspricht nichts, was nicht in einer Person liegt: eine persönliche Antwort. */
  if (fertig) {
    return (
      <Kasten art="gold" polster="p-5 lg:p-8">
        <p className="flex items-start gap-2.5 text-[16px] font-black leading-snug text-white lg:justify-center lg:text-[18px]">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#f6cf51]" />
          {T.fDanke}
        </p>
      </Kasten>
    );
  }

  /**
   * MOBIL EINE SPALTE, AM DESKTOP ZWEI (Owner 31.08.2026: „Formular unten als hochwertige
   * Desktop-Card mit sinnvollem 2-Spalten-Layout").
   *
   * Erste Zeile: Name · Firma · Adresse — die drei Angaben über die Person. Zweite Zeile:
   * die Position, und daneben über zwei Spalten der Stellenlink; er ist das einzige Feld,
   * dessen Inhalt lang werden kann, und in einem Drittel scrollte man in einer URL herum.
   *
   * Das Raster hebt die eigenen Abstände der Felder auf (`lg:mt-0`), sonst addierte sich der
   * mobile Abstand zum Rasterabstand und die Zeilen ständen ungleich weit auseinander.
   */
  return (
    <Kasten polster="p-5 lg:p-8">
     <div className="lg:mx-auto lg:grid lg:max-w-[900px] lg:grid-cols-3 lg:gap-x-6 lg:gap-y-5">
      <Feld label={T.fName}>
        <Eingabe value={name} onChange={e => { setName(e.target.value); setFehler(""); }} symbol={<User className="h-4 w-4" />}
          autoComplete="name" placeholder={T.fNamePh} />
      </Feld>
      <Feld label={T.fFirma}>
        <Eingabe value={firma} onChange={e => { setFirma(e.target.value); setFehler(""); }} symbol={<Building2 className="h-4 w-4" />}
          autoComplete="organization" placeholder={T.fFirmaPh} />
      </Feld>
      <Feld label={T.fMail}>
        <Eingabe type="email" inputMode="email" value={mail} onChange={e => { setMail(e.target.value); setFehler(""); }} symbol={<Mail className="h-4 w-4" />}
          autoComplete="email" placeholder={T.fMailPh} />
      </Feld>
      <Feld label={T.fPosition}>
        <Eingabe value={position} onChange={e => { setPosition(e.target.value); setFehler(""); }} symbol={<Briefcase className="h-4 w-4" />}
          placeholder={T.fPositionPh} />
      </Feld>
      <Feld label={T.fLink} className="lg:col-span-2">
        <Eingabe type="url" inputMode="url" value={link} onChange={e => setLink(e.target.value)} symbol={<Link2 className="h-4 w-4" />}
          placeholder={T.fLinkPh} />
      </Feld>

      <div className="lg:col-span-3"><Fehlerzeile>{fehler}</Fehlerzeile></div>
      <div className="mt-4 lg:col-span-3 lg:mt-2">
        {busy ? <Fortschritt text={T.fLaeuft} /> : <Knopf art="gold" onClick={() => void senden()}>{T.fKnopf}</Knopf>}
      </div>
      {/* DIE LETZTE HÜRDE IST NICHT DAS FORMULAR, SONDERN DIE FRAGE „WORAUF LASSE ICH MICH
          EIN?" (Owner 31.08.2026). Der Satz steht deshalb UNTER dem Knopf, nicht darüber:
          Wer schon entschieden hat, wird nicht aufgehalten; wer zögert, findet die Antwort
          genau dort, wo er stehen bleibt. */}
      <p className="mt-2 text-center text-[12px] font-bold text-white/55 lg:col-span-3">{T.fUnverbindlich}</p>
     </div>
    </Kasten>
  );
}
