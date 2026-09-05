"use client";

import { useMemo, useState } from "react";
import { Check, Download, FileText, Send, ShieldCheck, Video } from "lucide-react";
import { Auffalten, Fehlerzeile, Kasten, Knopf } from "@/components/CI";
import { Fine, H1, Kicker, Lead, SectionTitle, StepLabel, Y } from "@/components/Landing";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";

/** Die Wörter auf der Karte selbst (Ton, Vergrössern, Teilen) — sie kommen aus der
    Bibliothek, nicht aus unseren Seitentexten. */
const K = KARTE_TEXTE.de;
import TeilenKnopf from "@/components/TeilenKnopf";
import KartenKarussell from "@/components/KartenKarussell";
import { bereichAnzeigenBild } from "@/lib/armee-musik";
import type { DemoMotivFertig, DemoProfil, RecruiterTexte } from "@/lib/demo-armee";

/**
 * DIE RECRUITERSEITE — was der Kunde für sein Geld bekommt (Owner 02.09.2026: „Wir haben
 * noch die recruterseite mit Stststik dazu und das müssen wir mitliefern. Also die gehören
 * immer zusammen. Das ist mein Aquise seite. Das zeige ich den Kunden, das bekommen sie.").
 *
 * SIE IST DER PROTOTYP, NICHT EIN WEGWERFSTÜCK. Die bestehende Kundenseite
 * (`app/kunde/[slug]/page.tsx`) zeigt heute vier Kennzahlen und ein anonymes Beispielprofil
 * — weniger, als der Owner im Termin verspricht. Diese Komponente nimmt ihre Daten deshalb
 * als PROPS: Die Demo füttert sie aus `lib/demo-bundeswehr.ts`, die echte Kundenseite später
 * aus `POST /api/kunden { action: "stats" }`. Es gibt damit nur EINE Seite, die gepflegt
 * werden muss.
 *
 * DARK FIRST UND ALLES AUS DER BIBLIOTHEK (Owner 02.09.2026: „ich brauche auch dark design"
 * · „jetzt nichts neues erfinden hier" · „du bleibst im ci" · „dark first").
 *
 * Die erste Fassung dieser Datei hatte sich eine eigene Optik gebaut: eigene Überschriften,
 * eigene Kennzahl-Kacheln, `opacity-*` statt der Hauspalette — und sie war auf die HELLE
 * Fassung festgenagelt. Beides ist hier abgeräumt: Typo kommt aus `components/Landing.tsx`,
 * Flächen und Knöpfe aus `components/CI.tsx`, die Motive aus `KartenKarussell`. Die Seite
 * rendert dunkel; `lb-theme` (der Umschalter im Kopf) macht daraus die helle Fassung, ohne
 * dass hier eine zweite Farbtabelle nötig wäre.
 *
 * DIE REIHENFOLGE DER BLÖCKE IST DAS VERKAUFSGESPRÄCH:
 *   1 Anzeigen   — das Einzige, was der Kunde sich nicht selbst vorstellen kann
 *   2 Kosten     — was die Werbung verbraucht hat, ungeschminkt
 *   3 Ankunft    — was daraus wurde, mit den Kosten je Profil als Hauptzahl
 *   4 Bewerber   — sein Bestand, sortierbar und auswählbar
 *   5 Casting    — wer nach der Einladung geliefert hat
 *   6 Daten      — die Frage, die eine Behörde als Erstes stellt
 */

export type DashboardDaten = {
  kunde: { name: string; bereich: string };
  kampagne: { budgetCent: number; impressionen: number; klicks: number; cpcCent: number };
  trichter: readonly { readonly stufe: string; readonly wert: number }[];
  kostenJeVideoCent: number;
  kostenJeProfilCent: number;
  /** de/ro/en — steuert, welche Sprachfassung der Anzeigen-Fotos in der Bewerbergalerie
      erscheint (`bereichAnzeigenBild`). */
  sprache: string;
  motive: DemoMotivFertig[];
  /** Der Claim der Kampagne — steht über den Anzeigen, weil er die Aussage ist, für die
      der Kunde bezahlt. */
  claim: { zeileEins: string; zeileZwei: string; zeileDrei: string };
  /** Adresse des Beispiel-Trichters — der Knopf unter der Anzeige führt dorthin. */
  trichterHref: string;
  profile: DemoProfil[];
  /** Zeigt das Etikett und schaltet die Aktionsknöpfe ab. */
  beispiel?: boolean;
  /** Alle Wörter der Seite in der Sprache des Kunden (lib/demo-armee.ts). Sie SIEZEN —
      hier steht ein Arbeitgeber, kein Bewerber. */
  texte: RecruiterTexte;
};

/**
 * GLATTE BETRÄGE OHNE „,00" (Owner 02.09.2026, am Budget: „hier ,00 raus").
 *
 * „2.400,00 €" sind vier Zeichen mehr als „2.400 €" — genug, dass die Kennzahl auf dem Handy
 * umbrach und das Euro-Zeichen allein in der zweiten Zeile stand. Die Nachkommastellen sagen
 * dort auch nichts: Ein Kampagnenbudget ist nie krumm.
 *
 * NICHT ÜBERALL WEG: 0,57 € Klickpreis und 11,32 € je Profil sind die Zahlen, um die es auf
 * dieser Seite geht — ohne Stellen stünde dort „1 €" und „11 €". Deshalb entscheidet der
 * Betrag selbst: Cent-Anteil null, dann ohne.
 */
const euro = (cent: number) => {
  const stellen = cent % 100 === 0 ? 0 : 2;
  return (cent / 100).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen }) + " €";
};
const zahl = (n: number) => n.toLocaleString("de-DE");

/** Eine Kennzahl in einem Bibliotheks-Kasten. Zahl in Weiss, Zeile im Kleingedruckten-Ton. */
function Kennzahl({ wert, label }: { wert: string; label: string }) {
  return (
    <Kasten>
      <p className="text-[26px] font-black leading-none text-white">{wert}</p>
      <p className="mt-1.5 text-[13.5px] font-bold leading-snug text-white/75">{label}</p>
    </Kasten>
  );
}

/** Ein Balken mit Beschriftung — dieselben Farben wie `Fortschritt` in der Bibliothek. */
function Balken({ text, wert, anteil }: { text: string; wert: string; anteil: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14.5px] font-bold text-white/85">{text}</span>
        <span className="shrink-0 text-[15px] font-black tabular-nums text-white">{wert}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-[#f6cf51]" style={{ width: `${anteil * 100}%` }} />
      </div>
    </div>
  );
}

/* ══ 0 · Die Bewerbergalerie ══ */

/**
 * DREI BILDER STATT NEUN, GLEICH AM ANFANG (Owner 04.09.2026 zuerst: „wenn die Site gleich
 * mit einer Beispiel Galerie anfängt … Wir zeigen nur 9 Bilder statt die Liste unten", dann
 * korrigiert: „in der galerie machst du nur 3 statt 9, weil sie sich widerhollen").
 *
 * Es gibt nur fünf Standbilder (eins je Einsatzbereich, `bereichBild`) — bei neun Kacheln
 * wiederholten sich zwangsläufig welche, und genau das sah nach einem Fehler aus, nicht nach
 * einer Auswahl. Drei verschiedene Bereiche gibt es unter den ersten Profilen immer (die
 * Gewichtung in `bereichVon` verteilt breit genug), deshalb hier eine dedupe-Schleife statt
 * eines blossen `slice` — sie bleibt auch dann richtig, wenn sich die Gewichtung einmal
 * ändert.
 *
 * Die Liste (Abschnitt 4 weiter unten) bleibt unverändert stehen — der Owner wollte sie nicht
 * ersetzt, nur einen Blickfang VOR ihr: eine Kachelwand, die auf den ersten Blick zeigt, dass
 * hier schon viele ein Video erzeugt haben, bevor der Kunde eine einzige Zahl gelesen hat.
 *
 * NICHT KLICKBAR (noch nicht, Owner: „das müssen wir jetzt noch nicht machen"). Eine Kachel,
 * die auf Antippen Name/E-Mail/Zeitpunkt einblendet, ist eine spätere Erweiterung — hier
 * stehen die Angaben schon offen unter dem Bild, in derselben maskierten Form wie in der
 * Liste (siehe `mailMuster`), damit nichts vorgegriffen wird, was es noch nicht gibt.
 */
function Bewerbergalerie({ profile, videoAnzahl, sprache, T }: { profile: DemoProfil[]; videoAnzahl: number; sprache: string; T: RecruiterTexte }) {
  const gesehen = new Set<string>();
  const kacheln: DemoProfil[] = [];
  for (const p of profile) {
    const bild = bereichAnzeigenBild(p.bereich, sprache);
    if (gesehen.has(bild)) continue;
    gesehen.add(bild);
    kacheln.push(p);
    if (kacheln.length === 3) break;
  }
  if (!kacheln.length) return null;

  return (
    <section className="mt-9">
      <SectionTitle>{T.galerieTitel}</SectionTitle>
      <Lead className="max-w-[62ch]">{T.galerieLead.replace("{n}", zahl(videoAnzahl))}</Lead>
      <Fine className="mt-1">{T.galerieHinweis}</Fine>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {kacheln.map(p => (
          <div key={p.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {/* 3:4 STATT QUADRATISCH (Owner 04.09.2026: „Das ist doch ein und das selbe
                Modul" — dieselben Dateien wie in der Anzeigen-Galerie). Die beschrifteten
                Fotos sind hochkant (432×640) mit dem Dankestext im unteren Drittel; ein
                quadratischer Zuschnitt mit `object-top` schnitt genau den Text weg. 3:4 zeigt
                die Aufnahme fast vollständig, nur die Seiten schmal beschnitten. */}
            <div className="aspect-[3/4] w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bereichAnzeigenBild(p.bereich, sprache)} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="px-2 py-1.5">
              <p className="truncate text-[12px] font-black text-white">{p.vorname} {p.nachname[0]}.</p>
              <p className="text-[11px] font-bold text-white/50">{p.alter} {T.jahre}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══ 1 · Die Anzeigen als Karussell ══ */

function Galerie({ motive, trichterHref, T }: { motive: DemoMotivFertig[]; trichterHref: string; T: RecruiterTexte }) {
  const [aktiv, setAktiv] = useState(0);
  const jetzt = motive[aktiv] ?? motive[0];

  /**
   * DIE KARTE DES HAUSES — NICHT EINE EIGENE (Owner 02.09.2026, mit Bild der Musterseite:
   * „hier das Carddesign").
   *
   * Hier standen zuerst nackte Flächen in einem `Kasten`. Das war zweimal falsch: Es gibt
   * die Karte längst (`EinladungKarte` + `EinladungAnsicht` + `KartenKarussell`, ausgestellt
   * auf `/ci`), und dort steht wörtlich „Wer eine Karte braucht, nimmt GENAU diese zwei
   * Bausteine — nie ein nacktes <video>". Ich hatte die Karte nach ihren ersten Props
   * („sie", „er", „datum") für die Hochzeitseinladung gehalten und beiseitegelegt; das
   * Muster ruft sie mit `sie="" er=""` auf und benutzt nur Titel, Botschaft und Video.
   *
   * ÜBER DER KARTE STEHT DIE PLATZIERUNG, NICHT EINE SCHLAGZEILE: Die Motive tragen ihre
   * Schlagzeile bereits im Bild; ein Titel darüber würde sie nur wiederholen. „Feed · 3:4"
   * sagt dagegen etwas, das im Bild nicht steht — und zeigt dem Kunden, dass für jede
   * Platzierung eigenes Material entsteht.
   */
  if (!motive.length) {
    return (
      <Kasten>
        <p className="text-[15px] font-bold text-white/85">
          {T.keineMotive} <span className="text-[#f6cf51]">public/Armee/</span> {T.keineMotiveZwei} <span className="text-[#f6cf51]">.jpg</span>.
        </p>
      </Kasten>
    );
  }

  /* Die Bahn ist so hoch wie ihr HÖCHSTES Motiv — 9:16, sobald ein Hochkant-Motiv dabei
     ist, sonst das breiteste vorhandene Format. Sonst bliebe unter dem kleineren leerer
     Grund stehen (steht so schon in `KartenKarussell.tsx`). */
  const bahnFormat = motive.some(m => m.verhaeltnis.includes("9/16")) ? "aspect-[9/16]"
    : motive.some(m => m.verhaeltnis.includes("3/4")) ? "aspect-[3/4]"
    : motive.some(m => m.verhaeltnis.includes("4/5")) ? "aspect-[4/5]" : "aspect-square";

  const folien = motive.map(m => (
    <div key={m.datei} className={`flex ${bahnFormat} w-full items-center justify-center`}>
      <EinladungAnsicht
        id="" zaehlen={false} musik="" originalton
        /**
         * KEINE SCHLEIFE — DAS VIDEO BLEIBT AUF SEINEM LETZTEN BILD STEHEN (Owner
         * 02.09.2026: „das video muss auf dem letzten bild stehen bleiben").
         *
         * Eine Anzeige endet mit ihrer Aussage — beim Reel ist das der Aufruf am Schluss.
         * Springt sie sofort wieder an den Anfang, ist genau dieses letzte Bild das Einzige,
         * was der Betrachter NICHT zu sehen bekommt. Ohne Schleife läuft der Clip genau
         * einmal, steht dann auf seinem Schlussbild, und die Abspiel-Scheibe kommt zurück,
         * falls jemand ihn noch einmal sehen will.
         */
        schleife={false}
        videoUrl={m.istVideo ? m.url : ""} poster={m.istVideo ? m.poster : m.url}
        verhaeltnis={`${m.verhaeltnis} max-h-full`}
        /* Spricht jemand im Motiv, sitzt der Kopf oben — `object-cover` schneidet sonst
           mittig und nimmt ihn mit (Skill `card`). */
        ausrichtung={m.spricht ? "oben" : "mitte"}
        tonText={K.ton} tonAusText={K.tonAus} grossText={K.gross} kleinText={K.klein}
        teilen={<TeilenKnopf rund url={m.url} text={m.platzierung} label={K.teilen} kopiertLabel={K.zusDanke} />}
      />
    </div>
  ));

  return (
    <>
      {/* Die Karte bleibt telefonbreit und rückt in die Mitte: über die volle Laptop-Breite
          gezogen sähe man ein hochkantes Motiv nie ganz. So sieht der Kunde es in dem
          Format, in dem es später ausgespielt wird. */}
      <div className="mx-auto w-full max-w-[420px]">
        <EinladungKarte
          sprache="de" sie="" er="" demo
          titel={jetzt.platzierung}
          botschaft={jetzt.text}
          video={<KartenKarussell folien={folien} onAktiv={setAktiv} />}
          /* KEIN „made by luxurybandit.com" (Owner 02.09.2026). Die Dauerregel für Karten
             setzt die Signatur unten hin — hier wäre sie falsch: Die Motive sind Entwürfe
             für Anzeigen, die im Namen des KUNDEN laufen, und der Prospekt geht an eine
             Behörde. Dazu passt die Entscheidung vom 26.08., das Recruiting-Produkt nicht
             an die Geschenke-Marke zu binden. */
        />

        {jetzt.posterFehlt && (
          <Fehlerzeile>
            {T.standbildFehlt} {jetzt.datei.replace(/\.mp4$/i, ".jpg")} {T.standbildFehltZwei}
          </Fehlerzeile>
        )}

        {/**
          * DER WEG IN DEN TRICHTER, DIREKT UNTER DER ANZEIGE (Owner 02.09.2026: „gleich
          * drunter machst du einen Button für Recruiting Tunel ansehen" — Wortlaut später
          * ersetzt, Owner 04.09.2026: „den Button machst du in die Card").
          *
          * Er sitzt hier und nicht irgendwo unten, weil er genau den Schritt nachstellt, den
          * ein Bewerber macht: Anzeige gesehen — geklickt. Der Kunde sieht damit im Termin
          * nicht zwei getrennte Sachen, sondern eine Kette. Der Text ist derselbe wie im
          * erklärenden Kasten darüber (`T.viralKnopf`) — dort stand er zuerst als eigener
          * Knopf, doppelt zu diesem hier; jetzt gibt es nur noch den einen, an der Karte.
          */}
        <div className="mt-4">
          <Knopf art="gold" href={trichterHref}>
            <Video className="h-4 w-4" /> {T.viralKnopf}
          </Knopf>
        </div>
      </div>
    </>
  );
}

/* ══ 4 · Die Bewerberliste ══ */

type Sortierung = "eingang" | "alter" | "bereich";

const sortLabel = (T: RecruiterTexte): Record<Sortierung, string> => ({
  eingang: T.sortEingang, alter: T.sortAlter, bereich: T.sortBereich,
});

/**
 * DIE LISTE ZEIGT, WAS DER TRICHTER ERHEBT — UND NICHTS SONST (Owner 02.09.2026: „wir haben
 * nur Vorname Name Alter und Email").
 *
 * Hier stand vorher eine Rangliste mit Passungs-Punktzahl aus Sprachen, Ausbildung und
 * Erfahrung. Diese Felder gibt es im neuen Trichter nicht — er fragt vier Dinge ab und merkt
 * sich, welchen Einsatz jemand gewählt hat. Eine Kundenseite, die mehr verspricht, als
 * ankommt, fällt beim ersten echten Lead auf.
 *
 * DIE GEWÄHLTE SZENE IST DIE INTERESSANTESTE SPALTE: Sie sagt, wofür sich jemand sieht, ohne
 * dass ihn jemand danach gefragt hätte — und sie entsteht nebenbei, weil er sie ohnehin
 * antippen musste.
 */
/**
 * DIE ADRESSE ALS MUSTER, NICHT ALS ADRESSE (Owner 02.09.2026: „email kannst du auch als
 * Beispiel, aber mit g***2@example.com eingeben").
 *
 * Zwischenschritt zwischen zwei Fehlern: Die volle Adresse im Bild („michael.berger@…")
 * brach in der Beispielansicht genau die Zusage, die zwei Abschnitte tiefer steht —
 * Kontaktdaten erst nach Freigabe des Kandidaten. Gar keine Adresse liess dafür offen, WAS
 * der Kunde am Ende bekommt.
 *
 * Erstes Zeichen, drei Sterne, letztes Zeichen, volle Domain: Man sieht, dass eine echte
 * Adresse dahinter liegt, und kann sie nicht lesen. Kurze Namen (ein oder zwei Zeichen)
 * bekommen trotzdem drei Sterne — sonst wäre ausgerechnet der kürzeste Name der lesbarste.
 */
function mailMuster(mail: string): string {
  const at = mail.indexOf("@");
  if (at < 1) return mail;
  const name = mail.slice(0, at);
  const rest = mail.slice(at);
  if (name.length <= 2) return `${name[0]}***${rest}`;
  return `${name[0]}***${name[name.length - 1]}${rest}`;
}

function Bewerberliste({ profile, beispiel, T }: { profile: DemoProfil[]; beispiel?: boolean; T: RecruiterTexte }) {
  const [sortierung, setSortierung] = useState<Sortierung>("eingang");
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set());
  /**
   * VIER ZEILEN, DANN DER KNOPF (Owner 02.09.2026: „machst nur 4 und more").
   *
   * Hier standen fünfzehn. Die Liste ist eine ARBEITSPROBE, kein Arbeitsplatz: Der Kunde
   * soll sehen, wie ein Profil aussieht und dass es viele davon gibt — nicht durch 212
   * Namen scrollen, bevor er zum nächsten Argument kommt. Vier passen auf jedes Handy,
   * ohne dass der Rest der Seite unter den Bildrand rutscht.
   */
  const [zeige] = useState(4);
  const [meldung, setMeldung] = useState("");

  const sortiert = useMemo(() => {
    const l = [...profile];
    if (sortierung === "alter") l.sort((a, b) => a.alter - b.alter);
    if (sortierung === "bereich") l.sort((a, b) => a.bereich.localeCompare(b.bereich));
    return l;
  }, [profile, sortierung]);

  const um = (id: string) => setGewaehlt(g => {
    const n = new Set(g);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  /* IN DER DEMO PASSIERT NICHTS — ABER DER KNOPF SAGT ES. Ein Knopf, der stumm nichts tut,
     ist im Termin peinlicher als einer, der erklärt, warum er gerade nicht auslöst. */
  const demoHinweis = (was: string) => setMeldung(
    beispiel ? `${was} ${T.demoAus}` : "",
  );

  return (
    <>
      {/* Chips behalten in beiden Zuständen ihren Rand, es wechselt nur die Farbe — eine
          Auswahl darf nie etwas verschieben (CI-Regel). */}
      <div className="lb-wisch -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(Object.keys(sortLabel(T)) as Sortierung[]).map(s => (
          <Knopf key={s} art="chip" aktiv={sortierung === s} onClick={() => setSortierung(s)} className="shrink-0">
            {sortLabel(T)[s]}
          </Knopf>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Knopf art="chip" onClick={() => setGewaehlt(new Set(sortiert.slice(0, 40).map(p => p.id)))} className="shrink-0">
          {T.erste40}
        </Knopf>
        <Knopf art="chip" onClick={() => setGewaehlt(new Set())} className="shrink-0">{T.auswahlLeeren}</Knopf>
        <span className="text-[15px] font-black text-[#f6cf51]">{gewaehlt.size} {T.ausgewaehlt}</span>
      </div>

      {/* UNTEREINANDER (Owner 02.09.2026: „untereinander" · „kaputt"). In zwei bis drei
          Spalten blieb je Karte ein Drittel Breite: Der Name wurde auf den ersten Buchstaben
          abgeschnitten („M 18 J."), die Adresse auf vier Zeichen, und Einsatz und Zeitpunkt
          liefen in getrennte Zeilen. Eine Bewerberkarte ist eine ZEILE — Name, Alter,
          Adresse, Einsatz, wann. Nebeneinander ist sie keine Karte mehr, sondern ein Rest. */}
      <div className="mt-4 grid gap-2">
        {sortiert.slice(0, zeige).map(p => {
          const an = gewaehlt.has(p.id);
          return (
            <Kasten key={p.id} polster="p-3">
              <div className="flex items-start gap-3">
                {/* Das Häkchen ist die ganze linke Spalte, damit man es am Handy trifft. */}
                <button type="button" onClick={() => um(p.id)} aria-pressed={an}
                  aria-label={`${p.vorname} auswählen`} className="mt-0.5 shrink-0">
                  <span className={`grid h-6 w-6 place-items-center rounded-[7px] border-2 transition ${
                    an ? "border-[#f6cf51] bg-[#f6cf51]" : "border-white/35"}`}>
                    {an && <Check className="lb-haken h-4 w-4 text-black" strokeWidth={3.5} />}
                  </span>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[15px] font-black text-white">{p.vorname} {p.nachname}</p>
                    <span className="shrink-0 text-[15px] font-black tabular-nums text-white/75">{p.alter} {T.jahre}</span>
                  </div>
                  {/* Verdeckt, nicht weg (siehe `mailMuster` oben): Man sieht, dass eine
                      Adresse dahinter liegt, und kann sie nicht lesen — genau das, was die
                      Seite weiter unten zusichert. */}
                  <p className="mt-0.5 truncate text-[14.5px] font-bold text-white/55">{mailMuster(p.email)}</p>
                  <p className="mt-1.5 flex items-center gap-2 text-[14.5px] font-bold">
                    <span className="text-[#f6cf51]">{p.bereich}</span>
                    <span className="text-white/45">·</span>
                    <span className="text-white/60">{p.wann}</span>
                  </p>
                  {!p.videoGesehen && (
                    <p className="mt-1 text-[13.5px] font-bold text-white/45">{T.nichtZuEnde}</p>
                  )}
                </div>
              </div>
            </Kasten>
          );
        })}
      </div>

      {/* EINE ZEILE, KEIN KNOPF (Owner 02.09.2026: „das nicht klickbar"). Hier stand
          „Weitere anzeigen" und rollte fünfzig weitere erfundene Namen aus. Der Kunde soll
          sehen, DASS es 212 sind — durchblättern soll er sie in seiner echten Ansicht,
          nicht in der Arbeitsprobe. */}
      {zeige < sortiert.length && (
        <p className="mt-3 text-center text-[15px] font-bold text-white/45">
          {T.weitereStumm.replace("{n}", zahl(sortiert.length - zeige))}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <Knopf art="gold" disabled={gewaehlt.size === 0}
          onClick={() => demoHinweis(`${gewaehlt.size} ${T.anschreiben}`)}>
          <Send className="h-4 w-4" /> {gewaehlt.size || ""} {T.anschreiben}
        </Knopf>
        <Knopf art="umriss" disabled={gewaehlt.size === 0}
          onClick={() => demoHinweis(`${gewaehlt.size} ${T.exportieren}`)}>
          <Download className="h-4 w-4" /> {T.exportieren}
        </Knopf>
        {meldung && <Fine>{meldung}</Fine>}
      </div>
    </>
  );
}

/* ══ Die Seite ══ */

export default function RecruiterDashboard({ daten }: { daten: DashboardDaten }) {
  const { kunde, kampagne, trichter, kostenJeVideoCent, kostenJeProfilCent, sprache, motive, claim, trichterHref, profile, beispiel, texte: T } = daten;
  /* Wie verteilen sich die Bewerber auf die Einsatzbereiche? Das ist die Spalte, die kein
     Formular abfragt und die trotzdem entsteht. */
  const jeBereich = profile.reduce<Record<string, number>>((acc, p) => {
    acc[p.bereich] = (acc[p.bereich] ?? 0) + 1;
    return acc;
  }, {});
  const groesste = Math.max(...trichter.map(t => t.wert));

  return (
        /**
     * BREITER AUF DEM LAPTOP (Owner 02.09.2026: „das muss auch auf desktop gehen also
     * breiter") — der Termin findet nicht am Handy statt.
     *
     * Die Spalte nimmt, was da ist, bis 1280 px. Am Handy ändert das nichts (der Schirm ist
     * schmaler), am Laptop füllt die Seite den Platz statt als schmales Band in der Mitte zu
     * stehen. Umbruchpunkte ab `sm` statt `md`, weil auch ein halbiertes Fenster schon
     * breiter ist als eine Telefonspalte.
     *
     * DIE FLIESSTEXTE WACHSEN NICHT MIT — nur die Raster. Eine Zeile über 1280 px ist nicht
     * mehr lesbar, deshalb behalten Überschrift und Lead ihre eigene Breite.
     */
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-3 sm:px-6 lg:px-10">
      {/* ── Kopf ── */}
      <Kicker>{T.bereich}</Kicker>
      <H1>{kunde.name} · <Y>{T.kampagne}</Y></H1>

      {beispiel && (
        /* DAS ETIKETT IST PFLICHT. Die Seite wird jemandem gezeigt, der noch keinen einzigen
           echten Bewerber hat. Ohne diesen Hinweis hält er die Zahlen für seine — und beim
           ersten echten Zugang steht dort null. Mit Hinweis ist es ein Prospekt: „so sieht
           Ihre Seite in vier Wochen aus." */
        <div className="mt-4">
          {/* GRÖSSER (Owner 02.09.2026: „da ist zu klein"). Der Block stand in 13/12,5 px —
              der Schriftgrad einer Fussnote für den WICHTIGSTEN Satz der Seite: dass alles
              hier erfunden ist. Wer ihn überliest, hält 212 Profile für seine eigenen und
              findet beim ersten echten Login eine leere Liste. Jetzt trägt die Zeile den
              Grad einer Abschnittsüberschrift (17 px) und der Text den des Fliesstextes
              (14,5 px) — beides über dem Kontrastboden des Hauses (Skill `ci-design`). */}
          <Kasten art="gold" polster="p-4">
            <p className="text-[17px] font-black leading-snug text-[#f6cf51]">{T.beispielTitel}</p>
            <p className="mt-1.5 text-[14.5px] font-semibold leading-snug text-white/85">
              {T.beispielText}
            </p>
          </Kasten>
        </div>
      )}

      <Bewerbergalerie profile={profile} videoAnzahl={trichter.find(t => t.stufe === "video")?.wert ?? profile.length} sprache={sprache} T={T} />

      {/* ── 1 · Anzeigen ── */}
      <section className="mt-9">
        <SectionTitle>{T.anzeigenTitel}</SectionTitle>
        <Lead className="max-w-[62ch]">{T.anzeigenLead}</Lead>

        {/**
          * DER CLAIM STEHT ÜBER DEN MOTIVEN (Owner 02.09.2026: „Meine Recruiterseite stimmt
          * nicht mehr, ich habe dir doch den Titel gegeben").
          *
          * Er fehlte hier, und das war eine Lücke im Verkaufsgespräch: Der Kunde sah vier
          * Anzeigen, aber nicht die Idee, die sie zusammenhält. Der Claim ist das, wofür er
          * bezahlt — die Motive sind nur seine Ausführung. Deshalb steht er VOR der Karte
          * und in derselben Grösse wie die beiden Kernzahlen weiter unten.
          */}
        <div className="mt-4">
          <Kasten art="gold" polster="p-5">
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-white/60">{T.claimLabel}</p>
            <p className="mt-2 text-[26px] font-black leading-[1.12] text-white">
              {claim.zeileEins}<br />
              <span className="text-[#f6cf51]">{claim.zeileZwei}</span><br />
              {claim.zeileDrei}
            </p>
          </Kasten>
        </div>

        {/**
          * WAS DER BEWERBER BEKOMMT — UND WARUM DAS VON SELBST LÄUFT (Owner 04.09.2026, an der
          * Kampagnen-Aussage: „Hier müsste stehen, was die Kandidaten bekommen. Und warum das
          * ein virales video werden kann, weil jedes Video das sie generieren sharen können").
          *
          * Der Claim oben sagt, WOFÜR der Kunde bezahlt. Er sagt nicht, warum die Reichweite
          * über die gebuchten Impressionen hinausgeht: Jeder Bewerber bekommt sein eigenes
          * Video und kann es selbst teilen — jede Erzeugung ist eine zusätzliche Anzeige ohne
          * zusätzliches Budget.
          *
          * OHNE EIGENEN KNOPF (Owner 04.09.2026: „den Button machst du in die Card"). Hier
          * stand zuerst derselbe Knopf wie an der Anzeige selbst — zweimal „Generiere dein
          * Video" auf derselben Bildschirmseite. Der Knopf gehört an EINE Stelle, direkt unter
          * der Karte (`Galerie`, oben), weil er genau den Schritt nachstellt, den ein Bewerber
          * nach der Anzeige macht. Hier steht nur noch die Erklärung dazu.
          */}
        <div className="mt-3">
          <Kasten polster="p-5">
            <p className="text-[15px] font-black leading-snug text-white">{T.viralTitel}</p>
            <p className="mt-2 text-[14.5px] font-semibold leading-snug text-white/85">{T.viralText}</p>
          </Kasten>
        </div>

        <div className="mt-4"><Galerie motive={motive} trichterHref={trichterHref} T={T} /></div>
      </section>

      {/* ── 2 · Kosten ── */}
      <section className="mt-10">
        <SectionTitle>{T.kostenTitel}</SectionTitle>
        <Lead className="max-w-[62ch]">{T.kostenLead}</Lead>
        {/* ZWEI JE REIHE, AUCH AUF BREITEM SCHIRM (Owner 02.09.2026: „hier Zweierreihe").
            `sm:grid-cols-4` gab jeder Kennzahl ein Viertel — „312.000" und „4.180" liefen
            darin ineinander, und „2.400 €" brach das Euro-Zeichen in die zweite Zeile. Eine
            Zahl, die man zweimal lesen muss, ist als Kennzahl wertlos. */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Kennzahl wert={euro(kampagne.budgetCent)} label={T.ausgegeben} />
          <Kennzahl wert={zahl(kampagne.impressionen)} label={T.ausgespielt} />
          <Kennzahl wert={zahl(kampagne.klicks)} label={T.klicks} />
          <Kennzahl wert={euro(kampagne.cpcCent)} label={T.cpc} />
        </div>
      </section>

      {/* ── 3 · Was ankam ── */}
      <section className="mt-10">
        <SectionTitle>{T.ankamTitel}</SectionTitle>
        <Lead className="max-w-[62ch]">{T.ankamLead}</Lead>

        <div className="mt-4">
          <Kasten>
            <div className="flex flex-col gap-3.5">
              {trichter.map(t => (
                <Balken key={t.stufe}
                  text={({ klick: T.stufeKlick, gestartet: T.stufeGestartet, video: T.stufeVideo, email: T.stufeEmail } as Record<string, string>)[t.stufe] ?? t.stufe}
                  wert={zahl(t.wert)} anteil={t.wert / groesste} />
              ))}
            </div>
          </Kasten>
        </div>

        {/**
          * DIE ZWEI ZAHLEN, DIE DEN TERMIN ENTSCHEIDEN — gleichrangig nebeneinander
          * (Owner 02.09.2026 zur zweiten: „eben das ist ein mega argument").
          *
          * Sie beantworten die einzigen beiden Fragen, die ein Arbeitgeber wirklich hat:
          * Was kostet mich ein Kandidat — und bekomme ich ihn woanders auch? Die erste Zahl
          * schlägt jeden Personalvermittler, die zweite schlägt jedes Jobportal, weil dort
          * per Definition nur steht, wer ohnehin sucht.
          *
          * Die zweite stand hier zuerst als kleine Kennzahl unter der ersten und ging darin
          * unter. Zwei Karten in derselben Grösse sagen: Das sind nicht ein Argument und
          * eine Fussnote, sondern zwei.
          */}
        {/**
          * DREI ZAHLEN, DIE AUFEINANDER AUFBAUEN (Owner 02.09.2026: „wie viele ein video
          * generiert haben und wieviele ihre email angegeben haben").
          *
          * Was ein Video kostet · was ein Kontakt kostet · und wie viele vom einen zum
          * anderen weitergehen. Die dritte ist die eigentliche Aussage des Trichters: Sie
          * misst, was das Geschenk wert ist. Ein Jobportal hat keine vergleichbare Zahl,
          * weil dort niemand vorher etwas bekommt.
          */}
        {/* UNTEREINANDER (Owner 02.09.2026: „untereinander"). In Dritteln brach der Text
            nach zwei Wörtern um und „11,32 €" verlor sein Euro-Zeichen in die nächste Zeile
            — bei den drei Zahlen, die diese Seite verkauft, ist das der teuerste Umbruch. */}
        <div className="mt-3 grid gap-3">
          <Kasten art="gold" polster="p-5">
            <p className="text-[34px] font-black leading-none text-[#f6cf51]">{euro(kostenJeVideoCent)}</p>
            <p className="mt-2 text-[15px] font-bold leading-snug text-white/85">{T.jeVideo}</p>
          </Kasten>
          <Kasten art="gold" polster="p-5">
            <p className="text-[34px] font-black leading-none text-[#f6cf51]">{euro(kostenJeProfilCent)}</p>
            <p className="mt-2 text-[15px] font-bold leading-snug text-white/85">{T.jeProfil}</p>
          </Kasten>
          <Kasten art="gold" polster="p-5">
            <p className="text-[34px] font-black leading-none text-[#f6cf51]">
              {Math.round((trichter[3].wert / trichter[2].wert) * 100)} %
            </p>
            <p className="mt-2 text-[15px] font-bold leading-snug text-white/85">
              {T.quoteEins} <span className="text-white">{T.quoteZwei}</span> {T.quoteDrei}
            </p>
          </Kasten>
        </div>
      </section>

      {/* ── 4 · Bewerber ── */}
      <section className="mt-10">
        <SectionTitle>{T.bewerberTitel}</SectionTitle>
        <Lead className="max-w-[62ch]">{zahl(profile.length)} {T.bewerberLead}</Lead>
        <div className="mt-4"><Bewerberliste profile={profile} beispiel={beispiel} T={T} /></div>
      </section>

      {/* ── 5 · Wofür sie sich sehen ── */}
      <section className="mt-10">
        <SectionTitle>{T.sehenTitel}</SectionTitle>
        <Lead className="max-w-[62ch]">
          {T.sehenLead}
        </Lead>
        {/* ZWEI JE REIHE (Owner 02.09.2026). Bei vier Spalten stand die Zahl über einem
            Namen, der nicht hineinpasste: „Cybersicherhe" lief in „Sanitäterin" hinein.
            Die Bereichsnamen sind lang und unterschiedlich lang — dafür braucht es die
            halbe Breite, nicht die viertel. */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Object.entries(jeBereich).sort((a, b) => b[1] - a[1]).map(([bereich, anzahl]) => (
            <Kennzahl key={bereich} wert={zahl(anzahl)} label={bereich} />
          ))}
        </div>
      </section>

      {/* ── 6 · Was der Kunde bekommt ── */}
      <section className="mt-10">
        <SectionTitle>{T.bekommenTitel}</SectionTitle>
        <Lead className="max-w-[62ch]">{T.bekommenLead}</Lead>
        <div className="mt-4">
          <Kasten polster="p-5">
            <p className="flex items-center gap-2 text-[16px] font-black text-white">
              <ShieldCheck className="h-5 w-5 text-[#f6cf51]" /> {T.bekommenKopf}
            </p>
            <p className="mt-2.5 text-[15px] font-medium leading-relaxed text-white/85">
              {/* DIE LEERZEICHEN GEHÖREN IN DAS JSX, NICHT IN DIE TEXTE (02.09.2026, Owner:
                  „das mag ich nicht den umbruch"): Beim Zerlegen des Satzes für die Fettung
                  klebte der Gedankenstrich direkt an „E-Mail". JSX schluckt Leerzeichen an
                  Zeilenenden — deshalb hier ausdrücklich als {" "}. */}
              {T.bekommenTextEins}{" "}
              <span className="font-black text-white">{T.bekommenFelder}</span>{" "}
              {T.bekommenTextZwei}{" "}
              <span className="font-black text-white">{T.bekommenBereich}</span>
              {T.bekommenTextDrei}
            </p>
            {/* Die Zusage steht VOR den Einzelheiten: Sie ist die Frage, mit der ein
                Datenschutzbeauftragter ins Gespräch geht, und die Antwort darauf gehört
                nicht ins Kleingedruckte. */}
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-3 py-2.5 text-[14.5px] font-black text-[#f6cf51]">
              <ShieldCheck className="h-4 w-4 shrink-0" /> {T.sicher}
            </p>

            {/* SIEBEN PUNKTE STATT DREI (Owner 02.09.2026: „hier muss mehr zur technik").
                Ein behördlicher Datenschutzbeauftragter fragt genau diese Reihe ab: wo es
                läuft, wie übertragen wird, wer hineinsieht, was mit dem Foto passiert, wann
                gelöscht wird. Wer die Antworten erst im Termin sucht, hat den Termin schon
                verloren. */}
            <p className="mt-5 text-[12px] font-black uppercase tracking-[0.16em] text-white/45">{T.technikKopf}</p>
            <div className="mt-2 flex flex-col gap-2">
              <Fine><span className="text-[#f6cf51]">{T.speicherort}</span> {T.speicherortText}</Fine>
              <Fine><span className="text-[#f6cf51]">{T.uebertragung}</span> {T.uebertragungText}</Fine>
              <Fine><span className="text-[#f6cf51]">{T.zugang}</span> {T.zugangText}</Fine>
              <Fine><span className="text-[#f6cf51]">{T.erzeugung}</span> {T.erzeugungText}</Fine>
              <Fine><span className="text-[#f6cf51]">{T.loeschung}</span> {T.loeschungText}</Fine>
              <Fine><span className="text-[#f6cf51]">{T.uebergabe}</span> {T.uebergabeText}</Fine>
              <Fine><span className="text-[#f6cf51]">{T.nachweise}</span> {T.nachweiseText}</Fine>
            </div>

            {beispiel && (
              /* EHRLICH AN DER STELLE, WO ES ZÄHLT (Owner 02.09.2026: „Die Seite ist dann
                 nur Beispiel, und speichert erst mal nichts"). Ein Datenschutz-Block, der
                 Speicherung beschreibt, die es noch gar nicht gibt, wäre genau hier die
                 Unwahrheit, die auffliegt. */
              <p className="mt-4 border-t border-white/15 pt-3 text-[14.5px] font-bold leading-snug text-white/60">
                {T.nochNichts}
              </p>
            )}
          </Kasten>
        </div>
      </section>
    </div>
  );
}
