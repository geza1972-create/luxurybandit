"use client";

import { useEffect, useState } from "react";
import { Eingabe, EingabeMehrzeilig, Fehlerzeile, Fortschritt, Kasten, Knopf } from "@/components/CI";
import { useKasseImFenster } from "@/components/KasseImFenster";
import SelbstAufnahme from "@/components/SelbstAufnahme";
import DavidVideoKauf from "@/components/DavidVideoKauf";
import type { DavidTunnelTexte } from "@/lib/david-tunnel-texte";

/**
 * DIE FLÄCHE DES PRÜFSTANDS — der Wächter steht in `page.tsx`.
 *
 * WARUM GETRENNT: `lib/david-tunnel-texte` zieht über die Übersetzung `sharp` herein, und
 * das ist reiner Server-Code. Importiert eine Client-Datei die Texte selbst, bricht der Bau
 * mit „Can't resolve 'child_process'". Die Texte kommen deshalb als Eigenschaft von der
 * Serverseite — genauso wie auf der echten Berichtsseite.
 *
 * PRÜFSTAND FÜR DIE VIDEO-BEWERBUNG (Owner 30.08.2026: „ich bin zu nah an der kamera",
 * danach „zahlen, generieren").
 *
 * ZWEI FLÄCHEN, ZWEI ZWECKE:
 *
 *   1. NUR DIE KAMERA — die Aufnahme allein, ohne Kauf, ohne Erzeugung. Sie zeigt oben links,
 *      was die Kamera WIRKLICH liefert, und darunter das Mass der fertigen DATEI. Nur so
 *      sieht man, ob Vorschau und Aufnahme dasselbe Bild sind.
 *
 *   2. DER ECHTE WEG — dasselbe Bauteil wie auf der Berichtsseite (`DavidVideoKauf`):
 *      Aufnahme → Kasse → Erzeugung. Kein Nachbau, sonst prüft man am Ende eine Attrappe
 *      und nicht das Produkt.
 *
 * WAS HIER ANDERS IST ALS ECHT — und warum: Das Skript steht als Text da, statt dass David
 * es schreibt. Beim zwanzigsten Anlauf ist der Modell-Lauf reine Kosten und eine halbe
 * Minute Warten; das Skript prüft hier niemand. Alles danach — Standbild, Upload, Kasse,
 * HeyGen-Lauf — ist unverändert das echte.
 *
 * ES BLEIBT LOKAL: In der Produktion zeigt die Seite nichts. Ein Prüfstand mit einer Kasse
 * darauf gehört nicht ins Schaufenster.
 */

const BEISPIEL_SKRIPT =
  "Ich bin Geza Lakatos und entwickle als Produktverantwortlicher bei LuxuryBandit eine " +
  "KI-gestützte Content-App vom Konzept bis zum MVP. Bei der Bundesdruckerei habe ich drei " +
  "Designerinnen fachlich geführt, Reviews durchgeführt und das Designsystem verantwortet. " +
  "Diese Senior-UX-Stelle reizt mich, weil sie End-to-end-Verantwortung, ein Designsystem " +
  "und Führung in Berlin verbindet.";

/* Kennung und Adresse überleben das Neuladen — sonst tippt man sie bei jedem Anlauf neu. */
const MERK_ID = "lb_pruefstand_genid";
const MERK_MAIL = "lb_pruefstand_mail";

export default function PruefstandClient({ S, preisVideo }: { S: DavidTunnelTexte; preisVideo: string }) {
  const [offen, setOffen] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ name: string; groesse: number; url: string } | null>(null);
  /* Das Mass der fertigen DATEI — nicht der Vorschau. Nur so sieht man, ob die Aufnahme
     wirklich hochkant ist. */
  const [mass, setMass] = useState("");

  const [genId, setGenId] = useState("");
  const [mail, setMail] = useState("");
  const [skript, setSkript] = useState(BEISPIEL_SKRIPT);
  const [echtLaeuft, setEchtLaeuft] = useState(false);

  /* ── 3 · NUR DIE KASSE ──
     Kommt nach dem Kaufknopf nichts, liegt es entweder am Server (kein Geheimnis) oder am
     Formular (Stripe hängt sich nicht ein). Diese Fläche trennt beides: Sie holt dieselbe
     Kassensitzung wie der echte Kauf — ohne Aufnahme, ohne Skript — und hängt sie ein. */
  const kasse = useKasseImFenster("pruefstand");
  const [kasseLaeuft, setKasseLaeuft] = useState(false);
  const [kasseFehler, setKasseFehler] = useState("");
  const kasseHolen = async () => {
    if (kasseLaeuft) return;
    setKasseFehler(""); setKasseLaeuft(true);
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId: genId.trim(), once: true, videoAufpreis: false, thema: "david-video",
          returnTo: "/aufnahme-test?was=video", eingebettet: kasse.anfordern, lang: "de",
        }),
      }).then(r => r.json());
      if (!start?.clientSecret) {
        setKasseFehler(start?.error || `Kein Geheimnis zurück (${JSON.stringify(start).slice(0, 160)})`);
        return;
      }
      if (!kasse.uebernehmen(start.clientSecret)) setKasseFehler("Das Formular hat das Geheimnis nicht angenommen.");
    } catch (e) {
      setKasseFehler(e instanceof Error ? e.message : "Aufruf fehlgeschlagen");
    } finally { setKasseLaeuft(false); }
  };

  useEffect(() => {
    try {
      setGenId(localStorage.getItem(MERK_ID) ?? "");
      setMail(localStorage.getItem(MERK_MAIL) ?? "");
    } catch { /**/ }
  }, []);

  const echtStarten = () => {
    try {
      localStorage.setItem(MERK_ID, genId.trim());
      localStorage.setItem(MERK_MAIL, mail.trim());
    } catch { /**/ }
    setEchtLaeuft(true);
  };

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-[440px]">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">Prüfstand</p>
        <h1 className="mt-1 text-[28px] font-black leading-[1.06]">
          Die <span className="text-[#f6cf51]">Video-Bewerbung</span>
        </h1>
        <p className="mt-3 text-[15px] font-medium leading-snug text-white/85">
          Nur lokal. Oben die Kamera allein, unten die echte Strecke mit Kasse und Erzeugung.
        </p>

        {/* ── 1 · NUR DIE KAMERA ── */}
        <Kasten polster="p-5" className="mt-6">
          <p className="text-[15px] font-black leading-snug text-white">1 · Nur die Kamera</p>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/75">
            Keine Kasse, keine Erzeugung. Prüft Bildausschnitt, Kreis und ob die Datei hochkant ist.
          </p>
          <div className="mt-4">
            <Knopf art="gold" onClick={() => { setErgebnis(null); setMass(""); setOffen(true); }}>
              Kamera öffnen
            </Knopf>
          </div>

          {ergebnis && (
            <div className="mt-4 rounded-2xl border border-white/20 bg-white/5 p-4">
              <p className="text-[13px] font-bold text-white/75">
                {ergebnis.name} · {(ergebnis.groesse / 1024 / 1024).toFixed(1)} MB{mass ? ` · ${mass}` : ""}
              </p>
              <video src={ergebnis.url} controls playsInline className="mt-3 w-full rounded-xl"
                onLoadedMetadata={ev => setMass(`${ev.currentTarget.videoWidth}×${ev.currentTarget.videoHeight}`)} />
            </div>
          )}
        </Kasten>

        {/* ── 2 · DER ECHTE WEG ── */}
        <Kasten polster="p-5" className="mt-4">
          <p className="text-[15px] font-black leading-snug text-white">2 · Aufnahme → zahlen → generieren</p>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/75">
            Dasselbe Bauteil wie auf der Berichtsseite. Die Kennung ist die deiner Sitzung —
            daran hängen Auftrag, Zahlung und das fertige Video.
          </p>

          {!echtLaeuft ? (
            <>
              <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">
                Sitzungskennung
              </label>
              <Eingabe className="mt-1.5" value={genId} onChange={e => setGenId(e.target.value)}
                placeholder="c9afb38e-6823-406b-…" />

              <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">
                E-Mail der Sitzung
              </label>
              <Eingabe className="mt-1.5" type="email" inputMode="email" value={mail}
                onChange={e => setMail(e.target.value)} placeholder="du@beispiel.de" />

              <label className="mt-4 block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">
                Skript (statt David — spart den Modell-Lauf)
              </label>
              <EingabeMehrzeilig className="mt-1.5" zeilen={6} value={skript}
                onChange={e => setSkript(e.target.value)} />

              <div className="mt-4">
                {/* OHNE KENNUNG GEHT NICHTS — und das muss man SEHEN, bevor man aufnimmt.
                    Ohne sie kennt der Server den Auftrag nicht: Die Kasse öffnet nicht, und
                    der Kaufknopf stünde am Ende stumm da (Owner 30.08.2026). */}
                <Knopf art="gold" disabled={!genId.trim()} onClick={echtStarten}>Strecke starten</Knopf>
              </div>
              <p className="mt-2 text-[12px] font-bold leading-snug text-white/60">
                {genId.trim()
                  ? "Gezahlt und erzeugt wird erst, wenn du unten selbst darauf tippst."
                  : "Ohne Sitzungskennung geht es nicht weiter — sie steht in der Adresse deiner Berichtsseite."}
              </p>
            </>
          ) : (
            <div className="mt-3">
              <DavidVideoKauf
                S={S}
                preisVideo={preisVideo}
                genId={genId.trim()}
                email={mail.trim()}
                lang="de"
                skriptVorgabe={skript} />
            </div>
          )}
        </Kasten>
        {/* ── 3 · NUR DIE KASSE ── */}
        <Kasten polster="p-5" className="mt-4">
          <p className="text-[15px] font-black leading-snug text-white">3 · Nur die Kasse</p>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-white/75">
            Holt dieselbe Kassensitzung wie der echte Kauf und hängt sie hier ein. Zeigt, ob
            es am Server oder am Formular liegt. Bezahlt wird nur, wenn du im Formular zahlst.
          </p>
          <p className="mt-2 text-[12px] font-bold text-white/55">
            Eingebettete Kasse möglich: {kasse.anfordern ? "ja" : "nein — Formular kann nicht laufen"}
          </p>
          <div className="mt-3">
            {kasse.block ? null : kasseLaeuft
              ? <Fortschritt text="Ich hole die Kasse" />
              : <Knopf art="gold" disabled={!genId.trim()} onClick={() => void kasseHolen()}>Kasse holen</Knopf>}
          </div>
          <Fehlerzeile>{kasseFehler}</Fehlerzeile>
          {kasse.block}
        </Kasten>
      </div>

      {offen && (
        <SelbstAufnahme
          skript={skript}
          diagnose
          texte={{
            titel: S.videoSkriptTitel,
            hinweis: S.videoAufnahmeHinweis,
            los: S.videoAufnahmeLos,
            stopp: S.videoAufnahmeStopp,
            nochmal: S.videoAufnahmeNochmal,
            uebernehmen: S.videoAufnahmeUebernehmen,
            keineKamera: S.videoKeineKamera,
            schliessen: S.videoAufnahmeSchliessen,
            naeher: "Näher heranholen",
          }}
          aufFertig={datei => {
            setMass("");
            setErgebnis({ name: datei.name, groesse: datei.size, url: URL.createObjectURL(datei) });
            setOffen(false);
          }}
          aufAbbruch={() => setOffen(false)} />
      )}
    </main>
  );
}
