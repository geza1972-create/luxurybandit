"use client";

import { useState } from "react";
import { X, Trash2, Send, Maximize2, Volume2, Sparkles } from "lucide-react";
import { Kicker, H1, Y, SectionTitle, Lead, Fine, StepLabel } from "@/components/Landing";
import { Scheibe, Knopf, Eingabe, EingabeMehrzeilig, Fehlerzeile, Fortschritt, Haken, Kasten, Laden, Dialog, MadeBy, ThemenKreise,
  ThemenKachel, ThemenGestaltWahl, useThemenGestalt, BildWahl, SCHEIBEN_TINTE, TalentKopf,
  type ThemenKachelDaten, AnmeldeEinladung, BildLupe, Zahlungssiegel, AufladeWaehler, TunnelStart, VorlagenKachel } from "@/components/CI";
/* Die Geburtstags-Looks sind hier nur MUSTER-Inhalt — zwei echte Kacheln zeigen mehr als
   zwei graue Kästen, und sie liegen ohnehin fest im Repo. */
import { GEBURTSTAG_LOOKS } from "@/lib/geburtstag-looks";
import { PDF_VORLAGEN, vorlagenBild } from "@/lib/pdf-vorlagen";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import KartenKarussell from "@/components/KartenKarussell";

/**
 * DIE MUSTER-SEITE DER CI-BIBLIOTHEK (Owner 06.08.2026: „ich will die Bibliothek immer
 * abrufen können. Am besten in jedem Menü einbauen. Damit ich es local sehen kann").
 *
 * Jeder Baustein aus `components/CI.tsx` einmal in echt, in beiden Farbwelten — plus die
 * Farben und die Typo aus `components/Landing.tsx`. Die Seite ist der lebende Beweis: Was
 * hier steht, IST der Code, keine Abbildung davon. Ändert sich ein Baustein, ändert sich
 * diese Seite mit.
 *
 * Die REGELN stehen in den Skills `ci-design` und `card` sowie in
 * docs/ci-farben-typo-buttons.md — hier steht die Umsetzung.
 */

const FARBEN = [
  { name: "Gold (Akzent dunkel)", wert: "#f6cf51" },
  { name: "Tinte (Symbole & Karte)", wert: SCHEIBEN_TINTE },
  { name: "Absage-Rot", wert: "#dc2626" },
  { name: "Karte (Elfenbein)", wert: "#faf6ec" },
  { name: "Grund (dunkel)", wert: "#141110" },
];

/* Zwei echte Themen als Muster — eines mit Video, eines „bald". Mehr braucht es nicht, um
   die zwei Gestalten zu vergleichen; die vollstaendige Liste steht auf der Themenseite. */
const MUSTER_THEMEN: ThemenKachelDaten[] = [
  {
    titel: "Sende einen Kuss an die Person, die du liebst",
    zeile: "Dein Foto und ihres — ein Video mit euch beiden, nur für sie.",
    href: "/themes/kiss",
    video: "/Kiss/Rain/rain-kiss.mp4",
    /* MIT POSTER — sonst zeigt die Vorlage genau das, was auf der echten Seite ein Fehler
       wäre: eine schwarze Fläche mit einer Abspiel-Scheibe darauf (Owner 07.08.2026: „den
       CTA bei Cards Und Poster fehlt"). Das Standbild ist das erste Bild des eigenen
       Videos und liegt fest im Repo. */
    poster: "/Kiss/Rain/rain-kiss.jpg",
    merkmale: "♥ Wähle sie · Dein Foto · Kuss",
    abPreis: "ab 15 €",
  },
  {
    titel: "Noch nicht offen",
    zeile: "So sieht ein Thema aus, das es bald gibt.",
    merkmale: "",
    platzhalter: <Sparkles className="h-16 w-16 text-white/10" strokeWidth={1.25} />,
  },
];

export default function CIMuster() {
  const [hakenAn, setHakenAn] = useState(false);
  const [dialogOffen, setDialogOffen] = useState<"hell" | "dunkel" | null>(null);
  const [chipWahl, setChipWahl] = useState("a");
  const [bildWahl, setBildWahl] = useState(GEBURTSTAG_LOOKS[0].id);
  const [vorlagenWahl, setVorlagenWahl] = useState(PDF_VORLAGEN[0].id);
  const [anmeldeMuster, setAnmeldeMuster] = useState(false);
  const [fehlerZeigen, setFehlerZeigen] = useState(true);
  const [waehlerOffen, setWaehlerOffen] = useState(false);
  const [musterMail, setMusterMail] = useState("du@beispiel.de");
  const gestalt = useThemenGestalt();

  const abschnitt = (titel: string) => (
    <p className="mb-2 mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{titel}</p>
  );

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
      {/* DIE HELLE FASSUNG PER UMSCHALTER (Owner 06.08.2026: „nein, per umschalten die light
          version"): Der Schalter hängt `lb-theme lb-fb` an <main> — die GANZE Muster-Seite
          kippt, und man sieht jeden Baustein in beiden Welten, statt eines nachgebauten
          Hell-Kastens. Er stand bis zum selben Tag hier im Seiteninhalt; jetzt sitzt er in
          der Kopfzeile, wo er auf JEDER Seite steht („der light und dark shalter muss immer
          da sein im header"). */}
      <Kicker>LuxuryBandit · CI</Kicker>
      <H1>Die <Y>Bausteine</Y> des Hauses</H1>
      <Lead className="mt-2">
        Ein Baustein, eine Umsetzung — wer UI baut, holt sie aus components/CI.tsx statt
        Klassen neu zu tippen. Regeln: Skill ci-design, Skill card.
      </Lead>

      {abschnitt("Farben")}
      <div className="grid grid-cols-2 gap-2">
        {FARBEN.map(f => (
          <div key={f.wert} className="flex items-center gap-2 rounded-xl border border-white/15 p-2">
            <span className="h-8 w-8 shrink-0 rounded-lg border border-white/20" style={{ background: f.wert }} />
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-bold text-white/85">{f.name}</span>
              <span className="block text-[10px] font-black text-white/50">{f.wert}</span>
            </span>
          </div>
        ))}
      </div>

      {/* DIE GOLD-REGEL (Owner 06.08.2026: „gold darf gar nicht vorkommen in den buttons" ·
          „dann brauchen wir gold nicht mehr als farbe") — sichtbar HIERHER. */}
      <Fine className="mt-2">
        Die Gold-Regel: Es gibt nur EIN Gold — das gelbe #f6cf51 der Knöpfe und Akzente.
        Das alte Altgold ist abgeschafft: Symbole und Kartenschrift sind Tinte (#1a160f),
        die Ornamente schwarz im Dunkeln und blau im Hellen.
      </Fine>

      {abschnitt("Schriften — zwei, und nur zwei")}
      {/* Stand bis 06.08.2026 nirgends (Owner: „die selbe schrift art bitte wie in der Card
          aber wie ich sehe das steht gar nicht unter fonds") — die Serife der Karte war
          15-mal als `font-serif` von Hand getippt. Jetzt setzt sie `.lb-karte` selbst. */}
      <div className="grid grid-cols-1 gap-2">
        <Kasten>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Überall — System-Sans</p>
          <p className="mt-1 text-[17px] font-black leading-tight text-white">Wähl ein Geschenk. Verschick es heute.</p>
        </Kasten>
        <div className="lb-karte rounded-2xl p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">In der Karte — Serife</p>
          <p className="mt-1 text-[17px] font-black leading-tight">Wähl ein Geschenk. Verschick es heute.</p>
        </div>
      </div>

      {abschnitt("Typo (components/Landing)")}
      <Kasten className="space-y-2">
        <Kicker>Kicker · so beginnt jede Seite</Kicker>
        <H1>H1 mit <Y>Goldwort</Y></H1>
        <SectionTitle>SectionTitle zweifarbig</SectionTitle>
        <StepLabel>StepLabel · 1 · Schritt</StepLabel>
        <Lead>Lead — der Fliesstext, weiss/85, nie dünner.</Lead>
        <Fine>Fine — das Kleingedruckte.</Fine>
      </Kasten>

      {abschnitt("Scheibe — der eine runde Knopf")}
      <Kasten className="flex flex-wrap items-center gap-3">
        <Scheibe label="Vergrössern"><Maximize2 className="h-5 w-5" /></Scheibe>
        <Scheibe label="Teilen"><Send className="h-5 w-5" /></Scheibe>
        <Scheibe label="Ton"><Volume2 className="h-5 w-5" /></Scheibe>
        <Scheibe label="Schliessen" klein><X className="h-4 w-4" /></Scheibe>
        <Scheibe label="Löschen" rot klein><Trash2 className="h-4 w-4" /></Scheibe>
        <Scheibe label="Durchsichtig (auf Medien)" durchsichtig><Send className="h-5 w-5" /></Scheibe>
        <span className="text-[11px] font-bold leading-snug text-white/60">
          gross · klein · rot · 30 % (auf Video)
        </span>
      </Kasten>

      {abschnitt("BildLupe — Schaubild mit einem Tipp gross machen")}
      <Kasten>
        <BildLupe src="/Lebenslauf/david-so-arbeitet.jpg" alt="Beispiel-Schaubild"
          label="Vergrössern" />
        <p className="mt-2 text-[11px] font-bold leading-snug text-white/60">
          Tipp aufs Bild oder auf die Lupe → es wächst an Ort und Stelle und lässt sich
          schieben. KEIN Vollbild: eine Fläche ohne Ausweg hat hier schon einmal einen
          ganzen Vorgang gekostet.
        </p>
      </Kasten>

      {abschnitt("Knopf — gold · umriss · chip")}
      <Kasten className="space-y-2">
        <Knopf art="gold"><Sparkles className="h-4 w-4" />Der EINE Goldknopf</Knopf>
        <Knopf art="umriss">Der Zweitweg (Umriss)</Knopf>
        <div className="grid grid-cols-2 gap-2">
          <Knopf art="chip" aktiv={chipWahl === "a"} onClick={() => setChipWahl("a")}>Chip aktiv</Knopf>
          <Knopf art="chip" aktiv={chipWahl === "b"} onClick={() => setChipWahl("b")}>Chip inaktiv</Knopf>
        </div>
      </Kasten>

      {abschnitt("Chip hell — für den weissen Zahlungs-Dialog")}
      {/* Owner 10.08.2026: „wenn es um zahlung geht, vertrauen menschen mehr den hellen
          farben". Auf Weiss ist ein weisser Rand auf 20 % nicht da — hier steht dieselbe
          Form in Tinte. Der Kasten ist absichtlich WEISS, sonst prüft man den hellen Chip
          auf dunklem Grund und sieht nie, was der Kunde sieht. */}
      <div className="rounded-2xl bg-white p-4">
        <div className="grid grid-cols-2 gap-2">
          <Knopf art="chip" hell aktiv={chipWahl === "a"} onClick={() => setChipWahl("a")}>5 € · 1 🎬</Knopf>
          <Knopf art="chip" hell aktiv={chipWahl === "b"} onClick={() => setChipWahl("b")}>10 € · 2 🎬</Knopf>
        </div>
        <Zahlungssiegel hell text="Sichere Zahlung über Stripe" garantie="Geld-zurück-Garantie"
          garantieHref="/terms#geld-zurueck-garantie" className="mt-3" />
      </div>

      {abschnitt("Zahlungssiegel — nur wo wirklich Geld fliesst")}
      {/* Owner 10.08.2026: „man muss igerndwie sichere Zahlung mit stripe (logo) Masterkard
          logo…einblenden". Es behauptet nur, was stimmt: Stripe kassiert, die zwei
          Kartennetze gehen. Der Satz kommt fertig übersetzt herein (`T.secure`). */}
      <Kasten>
        <Zahlungssiegel text="Sichere Zahlung über Stripe" />
      </Kasten>

      {abschnitt("BildWahl — eine Reihe Bildkacheln, eine gewählt")}
      {/* Der gelbe Ring hat ABSTAND zum Bild: Ein Rand direkt am Motiv verschwindet auf
          einem hellen oder goldenen Foto. Hier stehen absichtlich zwei sehr verschiedene
          Motive nebeneinander — ein dunkles und ein helles —, damit man auf der
          Muster-Seite sieht, dass die Auswahl auf beiden trägt. */}
      <Kasten>
        <BildWahl wert={bildWahl} waehle={setBildWahl} bilder={GEBURTSTAG_LOOKS} />
      </Kasten>

      {abschnitt("BildWahl gross — Slides zum Wischen, eine gewählt")}
      {/* Owner 08.08.2026: „als Slide die Bilder presentieren" — grosse 3:4-Bilder mit
          Einrasten. Dieselben Ring-Regeln wie die kleine Reihe: nur die Farbe wechselt. */}
      <Kasten>
        <BildWahl gross wert={bildWahl} waehle={setBildWahl} bilder={GEBURTSTAG_LOOKS} />
      </Kasten>

      {abschnitt("BildWahl blatt — Kacheln im A4-Format (Vorlagen-Galerie)")}
      {/* Owner 28.08.2026, zur Vorlagen-Galerie im David-Angebot: „hier müssen wir eine
          galerie von templates zeigen und user sucht sich eins aus … farbvollflächen lieben
          die Leute". `blatt` gibt dem Rahmen das Verhältnis des Papiers — ein A4-Blatt in
          einem 3:4-Rahmen würde unten um ein Sechstel beschnitten, genau dort, wo bei einem
          Lebenslauf die Ausbildung steht. Sonst ändert sich nichts: dieselbe Ring-Regel. */}
      <Kasten>
        <BildWahl gross blatt vergroessern wert={vorlagenWahl} waehle={setVorlagenWahl}
          bilder={PDF_VORLAGEN.map(v => ({ id: v.id, name: v.name, bild: vorlagenBild(v.id) }))} />
      </Kasten>

      {abschnitt("Kasten — still · gold (Teaser)")}
      {/* Der letzte grosse Eigenbau: 82 Flächen in 21 Rezepturen (Owner 06.08.2026:
          „… teaser, cards, header"). Der Rand ist /20, damit er im Tageslicht steht. */}
      <div className="space-y-2">
        <Kasten>
          <p className="text-[13px] font-bold leading-snug text-white/85">
            Der stille Kasten — abgesetzt, aber leise. Abschnitte, Listen, Hinweise.
          </p>
        </Kasten>
        <Kasten art="gold">
          <p className="text-[13px] font-bold leading-snug text-white/85">
            Der Teaser — die Fläche, die etwas anbietet. Höchstens einer pro Bildschirm.
          </p>
        </Kasten>
      </div>

      {abschnitt("Ladeanzeige — im Knopf · auf der Fläche")}
      {/* Der Kreisel stand am 06.08.2026 rund 250-mal von Hand im Code, in vier Grössen.
          Auf der Fläche steht IMMER eine Zeile darunter — ein Kreisel ohne Wort lässt
          den Nutzer raten, ob gearbeitet wird oder etwas hängt. */}
      <Kasten className="space-y-3">
        <Knopf art="gold" disabled><Laden />Dein Video entsteht …</Knopf>
        <Laden art="flaeche" text="Wir suchen die passenden Stücke — das dauert ein paar Sekunden." />
      </Kasten>

      {abschnitt("Topic-Kasten — hier wird die Gestalt gewählt")}
      {/* HIER wird gestaltet, nicht im Trichter (Owner 06.08.2026: „ich habe dir gesagt das
          wir nicht hier gestalten sondern in der bibliothek"). Die Wahl bleibt im Browser
          stehen und gilt danach auch auf der Themenseite — dieselbe Quelle, ein Eintrag. */}
      <ThemenGestaltWahl art={gestalt.art} waehle={gestalt.waehle} className="mb-3" />
      <div className="grid grid-cols-1 gap-3">
        {MUSTER_THEMEN.map(t => (
          /* MIT KAUFKNOPF — die Vorlage zeigt die Karte so, wie sie im Trichter steht
             (Landingpage.md: „CTA auf jeder Karte"). Ohne ihn stand hier eine Karte ohne
             Kaufweg, in der Bibliothek, als Muster für alle (Owner 07.08.2026: „siehst du
             das eine CTA?"). */
          <ThemenKachel key={t.titel} thema={t} art={gestalt.art} baldZeile="Coming soon"
            cta="Jetzt gestalten" />
        ))}
      </div>

      {abschnitt("Kopf des Bewerber-Bereichs — TalentKopf")}
      {/* Owner 22.08.2026 (Vorlage „Executive"): „This must feel like a separate professional
          product area." Deshalb ein EIGENER Kopf statt `TopNav` — ohne Motto, Guthaben,
          Galerie und Themen-Kreise, die eine Bewerbung an eine Firma sofort entwerten. Hier
          steht er im Seitenfluss; auf der Seite selbst klebt er oben. Ganz zu sehen ist er
          unter /lebenslauf/executive. */}
      <div className="overflow-hidden rounded-2xl border border-white/15">
        <TalentKopf marke="Talent"
          menuLabel="Menü" menuTitel="Abschnitte"
          menu={[{ label: "Profil", href: "#" }, { label: "Erfahrung", href: "#" }]} />
      </div>

      {abschnitt("Themen-Kreise — die Tür zu jedem Thema")}
      {/* Aus der Galerie in die Bibliothek geholt (Owner 06.08.2026: „die kommen auch in
          die Bibliothek. Und scrollbalken wird dann transparent") — wischt ohne Balken. */}
      <ThemenKreise />

      {abschnitt("Eingabe + Fehlerzeile — dunkle Welt")}
      <Kasten>
        <Eingabe placeholder="you@email.com" type="email" />
        {fehlerZeigen && <Fehlerzeile>So sieht eine Absage aus — rot, am Feld.</Fehlerzeile>}
        <button type="button" onClick={() => setFehlerZeigen(f => !f)}
          className="mt-2 text-[11px] font-bold text-white/50 underline">Fehler an/aus</button>
        {/* Mehrzeilig — für Anweisungen in ganzen Sätzen (Korrektur-Feld am Bewerber-Profil,
            Owner 24.08.2026). Dieselben drei Welten wie `Eingabe`, Höhe über `zeilen`. */}
        <EingabeMehrzeilig className="mt-3" zeilen={3}
          placeholder="z. B. Erwähne Projekt X nicht — schreib stattdessen …" />
      </Kasten>

      {abschnitt("Prozent-Ladebalken — die eine Warteanzeige")}
      {/* „es muss immer ein prozentladebalken sein" (Owner 28.08.2026). Steigt zügig bis 90
          und wartet dort, bis die Antwort wirklich da ist — nie ein Kreisel ohne Wort. */}
      <Kasten>
        <Fortschritt text="David schreibt deinen Bericht" />
      </Kasten>

      {abschnitt("Häkchen — eine Zustimmung, die er selbst setzt")}
      {/* Nie vorangekreuzt, ganze Zeile antippbar, Text darf Links tragen (Datenschutz,
          AGB). Gebaut für den Datenschutzhinweis im David-Trichter (28.08.2026). */}
      <Kasten>
        <Haken an={hakenAn} setzen={setHakenAn} pflicht>
          Ich habe die Datenschutzhinweise gelesen und möchte das Pre-Screening starten.
        </Haken>
      </Kasten>

      {abschnitt("Tunnel-Start — Schritt 1 von 2, für jedes Produkt gleich")}
      {/* KONZEPT-TUNNEL.md: eine Karte, zwei Felder, ein Knopf — der EINE Anfang jedes
          Kaufwegs im Haus. Nur hier auf der Musterseite ohne echten `onWeiter`; im Trichter
          speichert der Aufrufer den Lead sofort ueber die bestehende kiss-claim-Logik. */}
      <TunnelStart
        titel="Dein Versprechen an dich selbst"
        nameLabel="Dein Name" namePlatzhalter="Ion"
        emailLabel="Deine E-Mail" emailPlatzhalter="you@email.com"
        weiterLabel="Weiter"
        onWeiter={() => {}} />

      {abschnitt("Vorlagen-Kachel — Tipp öffnet das echte Video")}
      {/* Owner 12.08.2026: „wenn user ein Video generiert dann muss er die Vorlage genau als
          Video sehen … Das gilt für den ganzen Tunel." Links die volle Kachel (Schritt 3),
          rechts die schmale Knopf-Gestalt für Stellen, die schon eine eigene Bild-Auswahl
          haben (z. B. `BildWahl` beim Geburtstag). */}
      <div className="grid grid-cols-2 gap-3">
        <VorlagenKachel bildUrl="/Versprechen/Verprechen2.jpg" videoUrl="/Versprechen/promise-example.mp4"
          ansehenLabel="Vorlage ansehen" sprache="de" titel="Dein Versprechen an dich selbst" />
        <div className="flex items-center">
          <VorlagenKachel darstellung="knopf" bildUrl="/Versprechen/Verprechen2.jpg" videoUrl="/Versprechen/promise-example.mp4"
            ansehenLabel="Vorlage ansehen" sprache="de" titel="Dein Versprechen an dich selbst" />
        </div>
      </div>

      {abschnitt("Dieselben Bausteine IN der Karte")}
      {/* Die Karten-Welt hat eigene !important-Farben — der `karte`-Schalter stellt jeden
          Baustein darauf um. Genau diese Falle hat am 05.08. eine Fehlerfarbe verschluckt. */}
      <div className="lb-karte rounded-[22px] p-5">
        {/* Ohne Gold-Klasse (Owner 06.08.2026: „das was gold ist muss schwarz hier") — in
            der Karte sind Zwischentitel dunkel, das Gold gehört Titel, „Von" und made-by. */}
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em]">In der Einladungskarte</p>
        <Eingabe karte placeholder="E-Mail des Beschenkten" />
        <Fehlerzeile karte>Absage in der Karte — eigene Klasse, echtes Rot.</Fehlerzeile>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Knopf art="chip" karte aktiv>Chip aktiv</Knopf>
          <Knopf art="chip" karte>Chip inaktiv</Knopf>
        </div>
        <Knopf art="umriss" karte className="mt-2">Zweitweg in der Karte</Knopf>
      </div>

      {abschnitt("Die Karte — Ornamente, Video, drei Scheiben")}
      {/**
        * DIE GANZE KARTE ALS LEBENDES EXEMPLAR (Owner 06.08.2026: „und die card muss du auch
        * anlegen — die ornamente video butons"): DIESELBE `EinladungKarte`, die Trichter und
        * Empfängerseite rendern — Jugendstil-Ornamente, Titel oben, das Video in
        * `EinladungAnsicht` (bringt Vergrössern · Teilen · Ton als Scheiben-Spalte rechts
        * mit, Skill `card`), Botschaft, „Von …" und der made-by-Link unten. Wer eine Karte
        * braucht, nimmt GENAU diese zwei Bausteine — nie ein nacktes <video>.
        */}
      <EinladungKarte
        sprache="de"
        sie="" er=""
        titel={KARTE_TEXTE.de.gutscheinTitel}
        botschaft="So sieht jede Karte des Hauses aus — Titel oben, die drei Scheiben auf dem Video, deine Botschaft hier."
        von="Bella"
        demo
        video={
          /* Karussell mit ZWEI Folien, damit die Punkte zu sehen sind (Owner: „bei der
             karte fehlt … die karusell punkte") — genau wie auf den Themenseiten. */
          <KartenKarussell folien={[
            "/Gutscheine/PixVerse_V6_Fusion_360P_She_holds_a_cream_enve.mp4",
            "/Kiss/kiss.mp4",
          ].map((url, i) => (
            <EinladungAnsicht key={i} id="" videoUrl={url}
              zaehlen={false} originalton musik=""
              tonText={KARTE_TEXTE.de.ton} tonAusText={KARTE_TEXTE.de.tonAus}
              grossText={KARTE_TEXTE.de.gross} kleinText={KARTE_TEXTE.de.klein}
              teilen={
                <TeilenKnopf rund url="/ci" text="LuxuryBandit CI" label={KARTE_TEXTE.de.teilen} kopiertLabel={KARTE_TEXTE.de.zusDanke} />
              } />
          ))} />
        }
        fuss={<MadeBy karte />}
      />
      {/* Der Kaufaufruf UNTER der Karte — hell, volle Breite, der EINE Goldknopf des
          Bildschirms (Owner: „bei der karte fehlt ein cta"). */}
      <Knopf art="gold" className="mt-2">
        <Sparkles className="h-4 w-4" />
        So steht der Kaufaufruf unter der Karte
      </Knopf>

      {abschnitt("Einladung zur Anmeldung — mit seiner Vorlage")}
      {/* Owner 09.08.2026, nach dem Geräte-Riegel: „Der Kunde muss trotzdem einen sehr
          schönen Dialog bekommen, dass er sich anmelden soll … Es ist zu seinem Schutz.
          Button jetzt anmelden. Auch die Vorlage die er ausgewählt hat muss da stehen."
          Die Vorlage oben ist der Unterschied zwischen Hürde und Zwischenschritt: Sein
          Werk ist sichtbar nicht weg, es wartet. */}
      <Knopf art="umriss" onClick={() => setAnmeldeMuster(true)}>Einladung öffnen</Knopf>
      <AnmeldeEinladung
        offen={anmeldeMuster}
        zu={() => setAnmeldeMuster(false)}
        titel="Melde dich an — dann gehört es wirklich dir"
        grund="Dein Guthaben und deine Videos bleiben bei dir, auf jedem Gerät. Ohne Konto leben sie nur in diesem Browser."
        knopf="Jetzt anmelden"
        spaeter="Später"
        vorlageBild={GEBURTSTAG_LOOKS[0].bild}
        vorlageName={GEBURTSTAG_LOOKS[0].name}
        aufAnmelden={() => setAnmeldeMuster(false)}
      />

      {abschnitt("Dialog — hell · dunkel, Ausgang eingebaut")}
      {/* Zwei Gestalten: die weisse Karte für Tor und Entscheidung, das dunkle Fenster für
          Abo und Freischalten. Beide schliessen über Kreuz UND Tipp auf den Rand — das ist
          nicht abwählbar (Owner 06.08.2026: „hier kann der user den Dialog gar nicht mehr
          schliessen"). Die dunkle Gestalt kam dazu, weil PremiumDialog und SubscribeDialog
          von Hand gebaut waren und dabei 16-mal `amber-*` trugen — verbotene Farbe. */}
      <div className="grid grid-cols-2 gap-2">
        <Knopf art="umriss" onClick={() => setDialogOffen("hell")}>Hell öffnen</Knopf>
        <Knopf art="umriss" onClick={() => setDialogOffen("dunkel")}>Dunkel öffnen</Knopf>
      </div>
      {dialogOffen && (
        <Dialog art={dialogOffen} zu={() => setDialogOffen(null)}>
          <p className={`mt-1 px-7 text-[16px] font-black leading-snug ${dialogOffen === "dunkel" ? "text-white" : ""}`}
            style={dialogOffen === "hell" ? { color: "#1a160f" } : undefined}>
            Jeder Dialog kann zu — Kreuz oder Tipp daneben.
          </p>
          <Knopf art="gold" className="mt-4" onClick={() => setDialogOffen(null)}>Verstanden</Knopf>
        </Dialog>
      )}

      {abschnitt("Aufladewähler — das eine Fenster, hinter dem Geld fliesst")}
      {/* Owner 10.08.2026: „Der Tunel ab Bezahlung kannst du bei allen gleich machen. Das ist
          den Kassen Funel." Es gab ihn zweimal — im Geburtstags-Trichter dreimal nachgebessert,
          in der Einladung als vier nackte Gold-Knöpfe ohne Adresse, ohne Anmelde-Weg, ohne
          Siegel. Jetzt einmal, und die Rechnung dahinter steht in lib/kasse.ts.
          DIE STUFEN VERRECHNEN DAS VORHANDENE GUTHABEN: 6 € liegen da, 9,99 € kostet es —
          also reicht die 10er-Sprosse, und niemand muss 30 € nachlegen. */}
      <Knopf art="umriss" onClick={() => setWaehlerOffen(true)}>Wähler öffnen</Knopf>
      {waehlerOffen && (
        <AufladeWaehler
          lang="de" stand={600} preis={999}
          mail={musterMail} setMail={setMusterMail}
          vorschlag="" angemeldet={false} aufAnmelden={() => setWaehlerOffen(false)}
          aufStufe={() => setWaehlerOffen(false)}
          zu={() => setWaehlerOffen(false)} />
      )}

      {abschnitt("Die grossen Bausteine (Verweise)")}
      <Fine>
        Karte: components/EinladungKarte · Video in der Karte: components/EinladungAnsicht
        (drei Scheiben, Schleife, made-by-Link) · Karussell: components/KartenKarussell ·
        Upload: components/UploadKachel · Foto-Regeln: components/FotoAnleitung ·
        Preis-Chip: components/ThemenPreis · Kopf: components/TopNav · Fuss:
        components/SeitenFuss
      </Fine>
    </div>
  );
}
