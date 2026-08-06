"use client";

import { useState } from "react";
import { X, Trash2, Send, Maximize2, Volume2, Sparkles } from "lucide-react";
import { Kicker, H1, Y, SectionTitle, Lead, Fine, StepLabel } from "@/components/Landing";
import { Scheibe, Knopf, Eingabe, Fehlerzeile, Dialog, SCHEIBEN_GOLD } from "@/components/CI";

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
  { name: "Altgold (Scheiben-Symbol)", wert: SCHEIBEN_GOLD },
  { name: "Absage-Rot", wert: "#dc2626" },
  { name: "Karte (Elfenbein)", wert: "#faf6ec" },
  { name: "Grund (dunkel)", wert: "#141110" },
];

export default function CIMuster() {
  const [dialogOffen, setDialogOffen] = useState(false);
  const [chipWahl, setChipWahl] = useState("a");
  const [fehlerZeigen, setFehlerZeigen] = useState(true);

  const abschnitt = (titel: string) => (
    <p className="mb-2 mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{titel}</p>
  );

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
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

      {abschnitt("Typo (components/Landing)")}
      <div className="space-y-2 rounded-2xl border border-white/15 p-4">
        <Kicker>Kicker · so beginnt jede Seite</Kicker>
        <H1>H1 mit <Y>Goldwort</Y></H1>
        <SectionTitle>SectionTitle zweifarbig</SectionTitle>
        <StepLabel>StepLabel · 1 · Schritt</StepLabel>
        <Lead>Lead — der Fliesstext, weiss/85, nie dünner.</Lead>
        <Fine>Fine — das Kleingedruckte.</Fine>
      </div>

      {abschnitt("Scheibe — der eine runde Knopf")}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 p-4">
        <Scheibe label="Vergrössern"><Maximize2 className="h-5 w-5" /></Scheibe>
        <Scheibe label="Teilen"><Send className="h-5 w-5" /></Scheibe>
        <Scheibe label="Ton"><Volume2 className="h-5 w-5" /></Scheibe>
        <Scheibe label="Schliessen" klein><X className="h-4 w-4" /></Scheibe>
        <Scheibe label="Löschen" rot klein><Trash2 className="h-4 w-4" /></Scheibe>
        <Scheibe label="Durchsichtig (auf Medien)" durchsichtig><Send className="h-5 w-5" /></Scheibe>
        <span className="text-[11px] font-bold leading-snug text-white/60">
          gross · klein · rot · 30 % (auf Video)
        </span>
      </div>

      {abschnitt("Knopf — gold · umriss · chip")}
      <div className="space-y-2 rounded-2xl border border-white/15 p-4">
        <Knopf art="gold"><Sparkles className="h-4 w-4" />Der EINE Goldknopf</Knopf>
        <Knopf art="umriss">Der Zweitweg (Umriss)</Knopf>
        <div className="grid grid-cols-2 gap-2">
          <Knopf art="chip" aktiv={chipWahl === "a"} onClick={() => setChipWahl("a")}>Chip aktiv</Knopf>
          <Knopf art="chip" aktiv={chipWahl === "b"} onClick={() => setChipWahl("b")}>Chip inaktiv</Knopf>
        </div>
      </div>

      {abschnitt("Eingabe + Fehlerzeile — dunkle Welt")}
      <div className="rounded-2xl border border-white/15 p-4">
        <Eingabe placeholder="you@email.com" type="email" />
        {fehlerZeigen && <Fehlerzeile>So sieht eine Absage aus — rot, am Feld.</Fehlerzeile>}
        <button type="button" onClick={() => setFehlerZeigen(f => !f)}
          className="mt-2 text-[11px] font-bold text-white/50 underline">Fehler an/aus</button>
      </div>

      {abschnitt("Dieselben Bausteine IN der Karte")}
      {/* Die Karten-Welt hat eigene !important-Farben — der `karte`-Schalter stellt jeden
          Baustein darauf um. Genau diese Falle hat am 05.08. eine Fehlerfarbe verschluckt. */}
      <div className="lb-karte rounded-[22px] p-5">
        <p className="lb-karte-gold mb-2 text-[11px] font-black uppercase tracking-[0.2em]">In der Einladungskarte</p>
        <Eingabe karte placeholder="E-Mail des Beschenkten" />
        <Fehlerzeile karte>Absage in der Karte — eigene Klasse, echtes Rot.</Fehlerzeile>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Knopf art="chip" karte aktiv>Chip aktiv</Knopf>
          <Knopf art="chip" karte>Chip inaktiv</Knopf>
        </div>
        <Knopf art="umriss" karte className="mt-2">Zweitweg in der Karte</Knopf>
      </div>

      {abschnitt("Dialog — mit eingebautem Ausgang")}
      <Knopf art="umriss" onClick={() => setDialogOffen(true)}>Dialog öffnen</Knopf>
      {dialogOffen && (
        <Dialog zu={() => setDialogOffen(false)}>
          <p className="mt-1 px-7 text-[16px] font-black leading-snug" style={{ color: "#1a160f" }}>
            Jeder Dialog kann zu — Kreuz oder Tipp daneben.
          </p>
          <Knopf art="gold" className="mt-4" onClick={() => setDialogOffen(false)}>Verstanden</Knopf>
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
