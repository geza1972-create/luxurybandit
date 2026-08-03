"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Images, AlertTriangle } from "lucide-react";
import { guthabenLesen, type Gestrandet } from "@/lib/guthaben-konto";

/**
 * DAS GUTHABEN IM KOPF DER SEITE (Owner 03.08.2026: „könnte das Guthaben im Header stehen?
 * vielleicht benutzt er das für was anderes noch — mit Icon bitte").
 *
 * Der Gedanke dahinter: Das Guthaben ist GELD, kein Kuss-Detail. Wer 9,99 aufgeladen und
 * 1,49 ausgegeben hat, traegt 8,50 € mit sich herum — und soll sie auf JEDER Seite sehen,
 * nicht nur tief im Kuss-Trichter. Was sichtbar ist, wird ausgegeben; was unsichtbar ist,
 * fuehlt sich weg an (dieselbe Lehre wie bei der Kontostand-Zeile im Trichter).
 *
 * WEN WIR KENNEN: die eingetippte Kuss-Adresse (lb_kiss_mail) oder das angemeldete Konto.
 * Ohne Adresse zeigt der Chip NICHTS — einem Fremden „0,00 €" an den Kopf zu stellen waere
 * eine Abweisung, keine Auskunft. Der Klick fuehrt zum Kuss-Trichter: Dort wohnt der
 * Aufladen-Knopf.
 *
 * Aktualisiert sich beim Fensterwechsel (`focus`): Wer im Kassen-Popup aufgeladen hat und
 * zurueckkommt, sieht den neuen Stand, ohne neu zu laden.
 */
export default function GuthabenChip() {
  const [cents, setCents] = useState<number | null>(null);
  /** Video-Credits aus dem aelteren System (Abo/Extra-Kaeufe) — wer davon welche hat,
   *  ist NICHT „leer", auch wenn das Euro-Guthaben 0 ist (Owner-Fall tigl10722, 03.08.2026). */
  const [links, setLinks] = useState(0);
  /**
   * GELD AUF EINER ANDEREN ADRESSE DIESES GERAETS (Owner 03.08.2026: „mein Kontostand zeigt
   * 0 Euro an, aber ich habe Geld drauf").
   *
   * Er hatte recht UND der Chip hatte recht: 8,50 € lagen auf der einen Adresse, angemeldet
   * war er mit einer anderen. Ein blankes „0,00 €" ist in diesem Moment zwar wahr, aber die
   * unbrauchbarste aller Antworten — es sagt genau das Gegenteil dessen, was der Fall ist.
   * Also warnt der Chip statt zu behaupten; die Aufloesung steht im Trichter, wohin er fuehrt.
   */
  const [gestrandet, setGestrandet] = useState<Gestrandet | null>(null);

  useEffect(() => {
    let weg = false;
    const holen = () => {
      /**
       * BEI MODELS KEIN GUTHABEN (Owner 03.08.2026: „kein Guthaben bei den Models").
       *
       * Models sind keine Kunden: Ihr Credit-System ist ein anderes und liegt seit dem
       * 01.08.2026 eingefroren (kein Startguthaben, kein Verdienen). Ein Kunden-Konto im
       * Header wuerde ihnen ein Guthaben versprechen, das es fuer sie nicht gibt — und die
       * Galerie daneben zeigt ohnehin die Kunden-Sicht. Gilt auch fuer den Vorschau-Modus
       * („View as model"), sonst sieht der Owner beim Pruefen etwas anderes als das Model.
       */
      let model = false;
      try {
        model = !!(JSON.parse(localStorage.getItem("lb_curator") ?? "{}")?.id) || !!localStorage.getItem("lb_preview_model");
      } catch { /**/ }
      if (model) { setCents(null); return; }
      // Welche Adresse gilt, entscheidet lib/guthaben-konto — dieselbe Regel wie im Trichter.
      void guthabenLesen().then(stand => {
        if (weg) return;
        if (!stand) { setCents(null); return; }
        setCents(stand.cents);
        setLinks(stand.links);
        setGestrandet(stand.gestrandet);
      });
    };
    holen();
    window.addEventListener("focus", holen);
    // Beim Abmelden sofort leeren — nicht erst beim naechsten Fensterwechsel (03.08.2026).
    const abmelden = () => { setCents(null); setGestrandet(null); };
    window.addEventListener("lb-abgemeldet", abmelden);
    // Der Trichter meldet Adress-Bestaetigung und jede Guthaben-Aenderung — der Chip
    // zieht sofort nach, ohne Fensterwechsel (Owner 03.08.2026).
    window.addEventListener("lb-guthaben-neu", holen);
    return () => { weg = true; window.removeEventListener("focus", holen); window.removeEventListener("lb-abgemeldet", abmelden); window.removeEventListener("lb-guthaben-neu", holen); };
  }, []);

  /**
   * DANEBEN DIE GALERIE (Owner 03.08.2026: „mach ein Button neben Konto im Header zu My
   * Galerie, ähnlich wie mein Konto"). Beide gehoeren zusammen: Das eine ist sein Geld, das
   * andere das, was er dafuer bekommen hat. Die Galerie erscheint unter derselben Bedingung
   * wie das Konto — wir kennen ihn. Ein Fremder haette dort ohnehin nur die Leere stehen.
   */
  if (typeof cents !== "number") return null;
  const chip = "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-black transition active:scale-95";
  /**
   * DER WARN-ZUSTAND: leeres Konto, aber auf einer anderen Adresse dieses Geraets liegt Geld.
   * Statt „0,00 €" (wahr, aber irrefuehrend) steht dann ein Warndreieck mit dem Betrag, der
   * WIRKLICH existiert — und der Klick fuehrt in den Trichter, wo der Satz dazu steht.
   */
  return (
    <span className="flex items-center gap-2">
      <Link href="/themes/kiss" aria-label="Guthaben"
        className={`${chip} ${gestrandet
          ? "border-[#e0794a]/50 bg-[#e0794a]/10 text-[#e0794a]"
          : "border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]"}`}>
        {gestrandet ? <AlertTriangle className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
        {gestrandet
          ? (gestrandet.cents > 0
            ? `${(gestrandet.cents / 100).toFixed(2).replace(".", ",")} €`
            : `${gestrandet.links} 🎬`)
          : cents > 0 || links <= 0
            ? `${(cents / 100).toFixed(2).replace(".", ",")} €`
            : `${links} 🎬`}
      </Link>
      <Link href="/my-gallery" aria-label="My Gallery"
        className={`${chip} border-white/20 bg-white/5 text-white/85`}>
        <Images className="h-3.5 w-3.5" />
        Galerie
      </Link>
    </span>
  );
}
