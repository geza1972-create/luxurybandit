"use client";

import { useState } from "react";
import { X, Trash2, Send, Maximize2, Volume2, Sparkles } from "lucide-react";
import { Kicker, H1, Y, SectionTitle, Lead, Fine, StepLabel } from "@/components/Landing";
import { Scheibe, Knopf, Eingabe, Fehlerzeile, Kasten, Laden, Dialog, ThemenKreise, SCHEIBEN_TINTE } from "@/components/CI";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import TeilenKnopf from "@/components/TeilenKnopf";
import KartenKarussell from "@/components/KartenKarussell";
import LightSwitch from "@/components/LightSwitch";

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

export default function CIMuster() {
  const [dialogOffen, setDialogOffen] = useState<"hell" | "dunkel" | null>(null);
  const [chipWahl, setChipWahl] = useState("a");
  const [fehlerZeigen, setFehlerZeigen] = useState(true);

  const abschnitt = (titel: string) => (
    <p className="mb-2 mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{titel}</p>
  );

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
      {/* DIE HELLE FASSUNG PER UMSCHALTER (Owner 06.08.2026: „nein, per umschalten die light
          version"): derselbe LightSwitch wie auf der Einladungsseite hängt `lb-theme lb-fb`
          an <main> — die GANZE Muster-Seite kippt, und man sieht jeden Baustein in beiden
          Welten, statt eines nachgebauten Hell-Kastens. */}
      <div className="mb-3 flex justify-end"><LightSwitch /></div>
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

      {abschnitt("Knopf — gold · umriss · chip")}
      <Kasten className="space-y-2">
        <Knopf art="gold"><Sparkles className="h-4 w-4" />Der EINE Goldknopf</Knopf>
        <Knopf art="umriss">Der Zweitweg (Umriss)</Knopf>
        <div className="grid grid-cols-2 gap-2">
          <Knopf art="chip" aktiv={chipWahl === "a"} onClick={() => setChipWahl("a")}>Chip aktiv</Knopf>
          <Knopf art="chip" aktiv={chipWahl === "b"} onClick={() => setChipWahl("b")}>Chip inaktiv</Knopf>
        </div>
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
      </Kasten>

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
        fuss={
          <a href="/?utm_source=karte"
            className="lb-karte-gold mt-3 block text-center text-[9px] font-bold uppercase tracking-[0.22em] opacity-70">
            made by luxurybandit.com
          </a>
        }
      />
      {/* Der Kaufaufruf UNTER der Karte — hell, volle Breite, der EINE Goldknopf des
          Bildschirms (Owner: „bei der karte fehlt ein cta"). */}
      <Knopf art="gold" className="mt-2">
        <Sparkles className="h-4 w-4" />
        So steht der Kaufaufruf unter der Karte
      </Knopf>

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
