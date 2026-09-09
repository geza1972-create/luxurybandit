"use client";

import type { DashboardTexte } from "@/lib/dashboard-texte";

import { useState } from "react";
import { Check } from "lucide-react";

/**
 * EINRICHTEN — DIE FÜNF ANGABEN, DIE DER TRICHTER BRAUCHT (09.09.2026).
 *
 * WARUM ES DIESEN SCHIRM GEBEN MUSS: Der Mandant entsteht aus dem Plan, und der Plan kennt
 * weder Adresse noch Impressum. Ohne Impressum und Datenschutz weist der Trichter jede
 * Anfrage ab — richtig so, aber bis heute gab es keinen Weg, sie einzutragen. Sein Trichter
 * konnte nie eine Anfrage annehmen, und er hätte es erst gemerkt, wenn niemand anruft.
 *
 * ── DER UMBAU AM 09.09.2026 (Owner: „mach diese Seite richtig gut. Es ist layoutmässig wie
 * 1989 aus") ───────────────────────────────────────────────────────────────────────────────
 *
 * Er hatte recht, und der Fehler war nicht die Gestaltung, sondern das Fehlen einer
 * Ordnung: fünf gleich aussehende Felder untereinander, jedes gleich wichtig, keins erklärt.
 * Drei Sachen ändern das, und alle drei sind Inhalt, nicht Schmuck:
 *
 *  1. ZWEI GRUPPEN STATT EINER LISTE. Die oberen zwei entscheiden, OB der Trichter läuft.
 *     Die unteren drei entscheiden, WAS im Kopf seiner Seite steht. Das sind zwei
 *     verschiedene Fragen und sie gehören nicht in dieselbe Reihe.
 *  2. DIE VORSCHAU. Unter der zweiten Gruppe steht die Kopfzeile so, wie sein Kunde sie
 *     gleich sieht — mit dem, was er gerade tippt. Ein Feld namens „Deine Adresse" ist eine
 *     Frage; dieselbe Adresse an ihrem Platz ist eine Antwort.
 *  3. HAKEN STATT „Pflicht". Ein rotes Wort neben dem Etikett schimpft. Ein Haken, der
 *     erscheint, sobald das Feld gefüllt ist, sagt dasselbe und belohnt dabei.
 *
 * WEISSE KARTEN MIT SCHATTEN, KEINE RAHMEN — dieselbe Sprache wie die Startseite (Owner
 * 09.09.2026: „ich hätte gerne weisse Boxen mit Schatten" · „keine Rahmen" · „blauer
 * Button"). Zwei Seiten, die verschieden gebaut sind, lesen sich wie zwei Bauwerke.
 *
 * FEHLER ROT AM FELD, kein Dialog (Hausregeln `sichtbare-fehler-keine-formularfelder`,
 * `keine-overlay-dialoge`).
 */

type Felder = {
  mail: string;
  adresse: string;
  telefon: string;
  webUrl: string;
  impressumUrl: string;
  datenschutzUrl: string;
};

export default function MandantEinrichten({
  mandant, k, start, trichterUrl, name, T,
}: {
  mandant: string; k: string; start: Felder; trichterUrl: string; name: string;
  /** Die Texte in der Sprache des Mandanten. */
  T: DashboardTexte;
}) {
  const [f, setF] = useState<Felder>(start);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [gesichert, setGesichert] = useState(false);

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
      if (!res.ok) { setFehler(String(d.error ?? T.fehler)); return; }
      setGesichert(true);
    } catch {
      setFehler(T.fehler);
    } finally { setLaeuft(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_10px_34px_rgba(20,24,28,.10)] md:p-7">
      <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{T.angabenTitel}</h2>

      {/**
        * ── GRUPPE 0: WOHIN DIE ANFRAGEN GEHEN (Owner 09.09.2026: „unter Einstellungen da ist
        * die E-Mail, wo die Anfragen versendet werden, wenn jemand eine Anfrage macht") ──
        *
        * SIE STEHT GANZ OBEN, weil sie die einzige Angabe ist, bei der ein Tippfehler
        * ZWEIMAL wehtut: Er bekommt keine Post, und ein Mensch am anderen Ende wartet auf
        * einen Rückruf, von dem niemand weiss. Impressum und Adresse kann man nachtragen;
        * eine verpasste Anfrage nicht.
        *
        * SIE ÄNDERT AUCH DEN LÖSCHWEG: `/api/versusforge-senden` schickt Links und Löschlink
        * nur an die HINTERLEGTE Adresse — sonst könnte jeder, der den Trichternamen errät,
        * fremde Daten anfordern. Wer hier umträgt, verlegt damit beides.
        */}
      <Gruppe
        nummer={1}
        titel={T.mailFein}
        satz="An diese Adresse schreiben wir, sobald jemand seine Nummer hinterlassen hat. Über sie bekommst du auch deine Links und den Löschlink."
      >
        <Feld ausgefuellt={T.ausgefuellt} etikett={T.mailFeld} platzhalter="name@praxis-mueller.de"
          wert={f.mail} onChange={setz("mail")} />
      </Gruppe>

      {/* ── GRUPPE 2: SIE ENTSCHEIDET, OB DER TRICHTER LÄUFT ── */}
      <Gruppe
        nummer={2}
        titel={T.angabenNoetig}
        satz="Wer Namen und Telefonnummern entgegennimmt, braucht beides auf der Seite. Fehlt eins, bleibt dein Trichter zu."
      >
        <Feld ausgefuellt={T.ausgefuellt} etikett={T.impressumFeld} platzhalter="praxis-mueller.de/impressum"
          wert={f.impressumUrl} onChange={setz("impressumUrl")} />
        <Feld ausgefuellt={T.ausgefuellt} etikett={T.datenschutzFeld} platzhalter="praxis-mueller.de/datenschutz"
          wert={f.datenschutzUrl} onChange={setz("datenschutzUrl")} />
      </Gruppe>

      {/* ── GRUPPE 3: SIE ENTSCHEIDET, WAS SEIN KUNDE OBEN LIEST ── */}
      <Gruppe
        nummer={3}
        titel={T.kopfzeileFein}
        satz="Gleich soll jemand seine Nummer hinterlassen. Die erste Frage ist „gibt es die Praxis überhaupt?“ — das hier beantwortet sie."
      >
        <Feld ausgefuellt={T.ausgefuellt} etikett={T.adresseFeld} platzhalter="Hauptstrasse 12 · 80331 München"
          wert={f.adresse} onChange={setz("adresse")} />
        <Feld ausgefuellt={T.ausgefuellt} etikett={T.telefonFeld} platzhalter="+49 89 123456"
          wert={f.telefon} onChange={setz("telefon")} />
        <Feld ausgefuellt={T.ausgefuellt} etikett={T.webFeld} platzhalter="praxis-mueller.de" freiwillig
          wert={f.webUrl} onChange={setz("webUrl")} />

        {/**
          * DIE VORSCHAU — genau der Kopf, den sein Kunde sieht.
          *
          * Sie steht hier und nicht am Seitenanfang, weil sie zu DIESEN drei Feldern gehört.
          * Grau, wo noch nichts eingetippt ist: derselbe Platzhalter wie auf der echten
          * Seite, damit er sieht, was ein Besucher heute liest.
          */}
        <div className="mt-1 rounded-xl bg-[#f5f7f9] p-4">
          <p className="m-0 text-[12px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
            So sieht dein Kunde es
          </p>
          <div className="mt-2.5 text-[17px] font-bold tracking-[-0.01em] text-[#14181c]">{name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px]">
            <span className={f.adresse.trim() ? "text-[#5b666f]" : "text-[#b3bcc4]"}>
              {f.adresse.trim() || "Strasse 1 · 12345 Ort"}
            </span>
            <span aria-hidden="true" className="text-[#c3ccd4]">·</span>
            <span className={f.telefon.trim() ? "font-semibold text-[#14181c]" : "text-[#b3bcc4]"}>
              {f.telefon.trim() || "+49 000 000000"}
            </span>
            {f.webUrl.trim() ? (
              <>
                <span aria-hidden="true" className="text-[#c3ccd4]">·</span>
                <span className="text-[#5b666f] underline">{T.webKurz}</span>
              </>
            ) : null}
          </div>
        </div>
      </Gruppe>

      {fehler && <p className="mt-5 text-[14.5px] font-bold text-[#c02626]">{fehler}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {/* DER EINE GEFÜLLTE KNOPF AUF DER KARTE (CI-Regel). */}
        <button
          type="button"
          disabled={laeuft}
          onClick={() => void speichern()}
          className="rounded-xl bg-[#1d6fd0] px-7 py-3.5 text-[16px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-50"
        >
          {laeuft ? T.moment : T.speichern}
        </button>
        {gesichert && (
          <span className="flex items-center gap-2 text-[15px] font-bold text-[#1a7f4b]">
            <Check className="h-4 w-4" aria-hidden />
            Gespeichert
            <a href={trichterUrl} className="ml-1 font-bold text-[#1d6fd0] underline underline-offset-2">
              Trichter ansehen
            </a>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Eine Gruppe mit Nummer, Überschrift und Begründung.
 *
 * DIE NUMMER IST KEIN SCHMUCK: Sie sagt, dass es zwei Schritte sind und welcher zuerst
 * kommt. Ohne sie sind es wieder fünf gleichrangige Felder.
 */
function Gruppe({ nummer, titel, satz, children }: {
  nummer: number; titel: string; satz: string; children: React.ReactNode;
}) {
  return (
    <section className="mt-7 border-t border-[#eef1f4] pt-6 first-of-type:mt-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#eaf2fc] text-[14px] font-black text-[#1d6fd0]">
          {nummer}
        </span>
        <div className="min-w-0">
          <h3 className="m-0 text-[17px] font-extrabold tracking-[-0.01em]">{titel}</h3>
          <p className="mt-1.5 text-[14.5px] leading-[1.5] text-[#5b666f]">{satz}</p>
        </div>
      </div>
      {/* ZWEISPALTIG AM RECHNER, EINSPALTIG AM HANDY. Fünf volle Zeilen untereinander sind
          am Bildschirm eine Wand; nebeneinander sieht man die Gruppe als Gruppe. */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Ein Feld mit Etikett darüber und Haken, sobald etwas drinsteht.
 *
 * 16 px im Eingabefeld ist kein Geschmack, sondern Technik: Darunter zoomt iOS beim
 * Antippen in die Seite hinein und der Mensch verliert den Zusammenhang.
 *
 * DER RAHMEN BLEIBT IN JEDEM ZUSTAND GLEICH DICK (CI-Regel „Auswahl verschiebt NIE") — es
 * wechselt nur die Farbe, sonst springt die Zeile beim Tippen.
 */
function Feld({ etikett, platzhalter, wert, onChange, freiwillig = false, ausgefuellt = "" }: {
  etikett: string; platzhalter: string; wert: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; freiwillig?: boolean;
  /** Was der Haken für Vorlese-Programme heisst — in seiner Sprache. */
  ausgefuellt?: string;
}) {
  const voll = !!wert.trim();
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-[14.5px] font-bold text-[#14181c]">
        {etikett}
        {voll ? (
          <Check className="h-4 w-4 text-[#1a7f4b]" aria-label={ausgefuellt} />
        ) : freiwillig ? (
          <span className="text-[13.5px] font-semibold text-[#8b959d]">freiwillig</span>
        ) : null}
      </span>
      <input
        type="text"
        value={wert}
        onChange={onChange}
        placeholder={platzhalter}
        className={`mt-2 w-full rounded-xl border-[1.5px] bg-white px-4 py-3.5 text-[16px] text-[#14181c] placeholder:text-[#8b959d] outline-none transition-colors focus:border-[#1d6fd0] ${
          voll ? "border-[#cfd8e0]" : "border-[#dfe4e9]"}`}
      />
    </label>
  );
}
