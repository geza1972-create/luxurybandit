"use client";

import type { ReactNode } from "react";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import KartenKarussell from "@/components/KartenKarussell";
import TeilenKnopf from "@/components/TeilenKnopf";
import { MadeBy, Knopf } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";

/**
 * DIE EINE LANDING-KARTE (Owner 13.08.2026, nach dem Vergleich Chat gegen Geburtstag:
 * „Kein Template für die Card dir aufebaut. Da stimmen abstände nicht, Buttons namen
 * nicht. Schau dir GEburtstag an") — vorher baute jede Landingpage die Karte von Hand
 * (Geburtstag im KissFunnel, Hochzeit in EinladungBauen, Chat und Try-on je eigen), und
 * prompt wichen Knopf-Wort und Abstände ab. Ab jetzt kommt die Karte HIER heraus.
 *
 * DIE MASSE UND WORTE SIND DIE DER GEBURTSTAGS-KARTE (das gemessene Vorbild):
 *   · Creme-Hülle mit Titel oben und Eckranken (`EinladungKarte`)
 *   · Video-Karussell mit den Punkten des Hauses (`KartenKarussell` — Punkte direkt
 *     unter dem Video, nichts von Hand)
 *   · JEDE Folie mit Teilen- und Ton-Scheibe (Karten-Pflicht, Skill `card`) und ohne
 *     fremde Vorgabe-Musik (`originalton` + `musik=""` — sonst liefe der Hochzeits-Ton)
 *   · der CTA: `T.jetztStarten` — EIN Wort in sieben Sprachen, OHNE Preis auf der Karte
 *     (Owner 07.08./10.08.; der Preis steht als Zeile UNTER der Karte, wie bei der
 *     Hochzeit — `preisZeile`, gefüllt aus der Preistabelle)
 *   · „made by luxurybandit.com" als Fuss
 */
export default function LandingKarte({ sprache, titel, folien, href, teilenUrl, teilenText, preisZeile, verhaeltnis, fuss }: {
  sprache: string;
  titel: string;
  folien: { video: string; poster?: string }[];
  /** Wohin der `Jetzt starten`-Knopf führt — die Tunnel-Adresse des Produkts. OHNE href
      bleibt die Karte reine Schau (Tunnel-Schritt 3: der Kaufknopf steht dort schon). */
  href?: string;
  /** Was die Teilen-Scheibe teilt — die Landingpage des Produkts. */
  teilenUrl: string;
  teilenText: string;
  /** Die Preis-/Konditionszeile UNTER der Karte — aus der Preistabelle gefüllt. */
  preisZeile?: string;
  /** Nur wenn das Material es verlangt (9:16-Clips) — sonst das Karten-Standardmass. */
  verhaeltnis?: string;
  /** Zusätzlicher Karten-Fuss VOR dem made-by (selten — z. B. WANN/WO der Hochzeit). */
  fuss?: ReactNode;
}) {
  const K = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  /* Das EINE Knopf-Wort (Owner 10.08.2026: „Button wie CI Preis-Jettzt starten") — aus der
     Basis-Sprachtabelle, dieselbe Quelle wie die Geburtstags-Karte (`T.jetztStarten`). */
  const aufruf = kissText(sprache, "kiss").jetztStarten;
  if (folien.length === 0) return null;

  return (
    <div className="mt-4">
      <EinladungKarte sprache={sprache} sie="" er="" demo titel={titel}
        video={<>
          <KartenKarussell folien={folien.map((f, i) => (
            <EinladungAnsicht key={i} id={`landing-${i}`} videoUrl={f.video} poster={f.poster || undefined}
              zaehlen={false} schleife={false} originalton musik=""
              {...(verhaeltnis ? { verhaeltnis } : {})}
              tonText={K.ton} tonAusText={K.tonAus}
              teilen={<TeilenKnopf rund url={teilenUrl} text={teilenText} label={K.teilen} kopiertLabel={K.teilen} />} />
          ))} />
          {/* Der CTA direkt unter den Punkten, im Karten-Inneren — exakt die Stelle und
              Gestalt der Geburtstags-Karte (lb-gold, h-12, volle Breite). */}
          {href && (
            <div className="mt-3">
              <Knopf art="gold" karte href={href}>{aufruf}</Knopf>
            </div>
          )}
        </>}
        fuss={<>{fuss}<MadeBy karte /></>}
      />
      {preisZeile && (
        /* Die Konditionszeile UNTER der Karte — das Hochzeits-Muster („Video-Einladung
           {once} · Seite {days} Tage online · …"): eine Auskunft, kein zweiter Kaufknopf. */
        <p className="mt-2 text-center text-[11px] font-bold leading-snug text-white/60">{preisZeile}</p>
      )}
    </div>
  );
}
