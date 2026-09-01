"use client";

import { useState, type ReactNode } from "react";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import KartenKarussell from "@/components/KartenKarussell";
import TeilenKnopf from "@/components/TeilenKnopf";
import { MadeBy, Knopf } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { musikFuer } from "@/lib/musik";

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
export default function LandingKarte({ sprache, titel, folien, href, aufruf: aufrufEigen, teilenUrl, teilenText, preisZeile, verhaeltnis, ausrichtung, thema, fuss }: {
  sprache: string;
  titel: string;
  folien: { video: string; poster?: string }[];
  /**
   * DER SOUNDPOOL, AUCH HIER (Owner 01.09.2026: „tryons auch unsere sounds" — nachdem die
   * Lingerie-Karte stumm blieb: `originalton` spielte die Tonspur des VIDEOS ab, und die
   * Vorlagen-Clips (public/Tryon, hochgeladene Lingerie-Beispiele) haben meist keine
   * eigene). Mit `thema` (der Schlüssel aus `NACH_THEMA`, z. B. "tryon"/"kiss") zieht jede
   * Folie ihr eigenes Stück aus `lib/musik.ts` statt der stummen Video-Spur. Ohne `thema`
   * bleibt das alte Verhalten (Originalton der Datei) — kein bestehender Aufrufer ändert
   * sich ohne Auftrag dazu.
   */
  thema?: string;
  /** Wohin der `Jetzt starten`-Knopf führt — die Tunnel-Adresse des Produkts. OHNE href
      bleibt die Karte reine Schau (Tunnel-Schritt 3: der Kaufknopf steht dort schon). */
  href?: string;
  /**
   * EIN EIGENES KNOPF-WORT — nur, wo „Jetzt starten" die Sache falsch benennt (David:
   * „Jetzt kostenlos starten"; das Gratis gehört bei einem Screening ohne Kasse IN den
   * Knopf, sonst fragt sich der Leser genau dort, was es kostet). Ohne dieses Prop bleibt
   * es beim Hauswort aus der Sprachtabelle — das ist weiter der Normalfall.
   */
  aufruf?: string;
  /** Was die Teilen-Scheibe teilt — die Landingpage des Produkts. */
  teilenUrl: string;
  teilenText: string;
  /** Die Preis-/Konditionszeile UNTER der Karte — aus der Preistabelle gefüllt. */
  preisZeile?: string;
  /** Nur wenn das Material es verlangt (9:16-Clips) — sonst das Karten-Standardmass. */
  verhaeltnis?: string;
  /** Sprech-/Porträtvideos: `oben` ankert den Zuschnitt an der Oberkante, nie den Kopf
      abschneiden (Owner 24.08.2026, Skill `card`) — durchgereicht an `EinladungAnsicht`. */
  ausrichtung?: "mitte" | "oben";
  /** Zusätzlicher Karten-Fuss VOR dem made-by (selten — z. B. WANN/WO der Hochzeit). */
  fuss?: ReactNode;
}) {
  const K = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  /* Das EINE Knopf-Wort (Owner 10.08.2026: „Button wie CI Preis-Jettzt starten") — aus der
     Basis-Sprachtabelle, dieselbe Quelle wie die Geburtstags-Karte (`T.jetztStarten`). */
  const aufruf = aufrufEigen || kissText(sprache, "kiss").jetztStarten;
  if (folien.length === 0) return null;
  /**
   * NUR DIE VORDERE FOLIE SPIELT TON (Owner 01.09.2026: „der sound ist mega schlecht bei
   * tryon und startet erst mal ein anderer") — `tonAutomatisch` lief bisher auf JEDER
   * Folie gleichzeitig los, nicht nur der sichtbaren: bei mehreren Clips im Karussell
   * starteten mehrere Tonspuren gleichzeitig, und man hörte, welche zuerst geladen war,
   * nicht die vordere. `onAktiv` von `KartenKarussell` sagt, welche Folie gerade vorn
   * steht — nur sie bekommt `tonAutomatisch`.
   */
  const [vorn, setVorn] = useState(0);

  return (
    <div className="mt-4">
      <EinladungKarte sprache={sprache} sie="" er="" demo titel={titel}
        video={<>
          <KartenKarussell onAktiv={setVorn} folien={folien.map((f, i) => (
            <EinladungAnsicht key={i} id={`landing-${i}`} videoUrl={f.video} poster={f.poster || undefined}
              zaehlen={false} schleife={false}
              {...(thema ? { musik: musikFuer(thema, f.video), tonAutomatisch: i === vorn } : { originalton: true, musik: "" })}
              {...(verhaeltnis ? { verhaeltnis } : {})}
              {...(ausrichtung ? { ausrichtung } : {})}
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
