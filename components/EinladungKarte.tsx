import type { ReactNode } from "react";
import { CornerOrnaments, DividerOrnament } from "@/components/BoxOrnaments";

/**
 * DIE EINLADUNGSKARTE — eine Datei für zwei Orte.
 *
 * Owner 31.07.2026: „wo das Video ist, hier musst du die Einladung zeigen gleich wie sie
 * aussieht, und wenn's geht mit Jugendstil-Ornamenten. Wir hatten das schon mal bei einem
 * Formular benutzt."
 *
 * „GLEICH WIE SIE AUSSIEHT" ist der ganze Grund für diese Datei. Eine nachgebaute Vorschau
 * sieht am ersten Tag gleich aus und am dreissigsten nicht mehr — und dann verschickt sie
 * etwas anderes, als sie gesehen hat. Deshalb rendert DIESELBE Komponente die Vorschau im
 * Trichter und die Seite, die der Gast öffnet. Was hier geändert wird, ändert sich an beiden
 * Stellen oder an keiner.
 *
 * Die Ornamente sind die aus `BoxOrnaments` — dieselbe Handschrift wie im Anmeldeformular.
 * Bei einer Hochzeitseinladung sind sie nicht Zierrat: Sie sind der Unterschied zwischen
 * „KI-Werkzeug" und „Einladung", und davon hängt ab, ob sie den Link überhaupt verschickt.
 *
 * Farben stehen fest (siehe `.lb-karte` in globals.css): Eine gedruckte Karte bleibt elfenbein,
 * ob die Seite ringsum hell oder dunkel steht. Das schützt sie auch vor den Umfärbe-Regeln der
 * hellen Fassung, die hier Blau hineinmalen würden.
 */

export const KARTE_TEXTE: Record<string, {
  save: string; wann: string; wo: string; herkunft: string; eigenes: string; ton: string;
}> = {
  de: { save: "Wir heiraten", wann: "Wann", wo: "Wo", herkunft: "Dieses Video ist mit LuxuryBandit gemacht.", eigenes: "Macht euer eigenes", ton: "Ton an" },
  en: { save: "We're getting married", wann: "When", wo: "Where", herkunft: "This video was made with LuxuryBandit.", eigenes: "Make your own", ton: "Sound on" },
  ro: { save: "Ne căsătorim", wann: "Când", wo: "Unde", herkunft: "Videoclipul e făcut cu LuxuryBandit.", eigenes: "Faceți-l pe al vostru", ton: "Pornește sunetul" },
  es: { save: "Nos casamos", wann: "Cuándo", wo: "Dónde", herkunft: "Este vídeo está hecho con LuxuryBandit.", eigenes: "Haced el vuestro", ton: "Activar sonido" },
  fr: { save: "Nous nous marions", wann: "Quand", wo: "Où", herkunft: "Cette vidéo est faite avec LuxuryBandit.", eigenes: "Faites la vôtre", ton: "Activer le son" },
  pt: { save: "Vamos casar", wann: "Quando", wo: "Onde", herkunft: "Este vídeo foi feito com LuxuryBandit.", eigenes: "Façam o vosso", ton: "Ligar o som" },
  it: { save: "Ci sposiamo", wann: "Quando", wo: "Dove", herkunft: "Questo video è fatto con LuxuryBandit.", eigenes: "Fate il vostro", ton: "Attiva l’audio" },
};

const ORTE: Record<string, string> = {
  de: "de-DE", en: "en-GB", ro: "ro-RO", es: "es-ES", fr: "fr-FR", pt: "pt-PT", it: "it-IT",
};

/** „14. August 2026" statt „2026-08-14" — das eine liest sich wie eine Einladung, das andere
 *  wie ein Formular. Ein unvollständiges Datum aus dem Formular ergibt schlicht nichts. */
export const karteDatum = (datum: string | undefined, sprache: string) => {
  if (!datum || !/^\d{4}-\d{2}-\d{2}$/.test(datum)) return "";
  const d = new Date(datum + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString(ORTE[sprache] ?? "en-GB", { day: "numeric", month: "long", year: "numeric" });
  } catch { return datum; }
};

export default function EinladungKarte({
  sprache, sie, er, datum, ort, video, fuss,
}: {
  sprache: string;
  sie: string;
  er: string;
  datum?: string;
  ort?: string;
  video: ReactNode;
  /** Die eine Herkunftszeile — nur auf der echten Seite, nicht in der Vorschau. */
  fuss?: ReactNode;
}) {
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  const tag = karteDatum(datum, sprache);

  return (
    <div className="lb-karte relative overflow-hidden rounded-[20px] px-5 pb-6 pt-7 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      {/* Die vier Eckranken — `relative overflow-hidden` oben ist ihre Bedingung. */}
      <CornerOrnaments />
      {/* Eine zweite, feine Linie innen: So sieht eine gedruckte Karte aus, und sie hält die
          Ornamente optisch zusammen, statt sie in den Ecken allein zu lassen. */}
      <div className="lb-karte-rahmen pointer-events-none absolute inset-[10px] rounded-[14px]" />

      <div className="relative">
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.34em]">
          {T.save}
        </p>
        <h2 className="mt-2 text-center font-serif text-[27px] font-bold leading-tight">
          {sie} <span className="lb-karte-gold">&amp;</span> {er}
        </h2>
        <DividerOrnament className="mt-2.5" />

        <div className="mt-4 overflow-hidden rounded-[14px]">{video}</div>

        {(tag || ort) && (
          <>
            <DividerOrnament className="mt-5" />
            <div className="mt-3 space-y-3 text-center">
              {tag && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.26em]">{T.wann}</p>
                  <p className="mt-1 font-serif text-[19px] font-bold">{tag}</p>
                </div>
              )}
              {ort && (
                <div>
                  <p className="lb-karte-gold text-[9.5px] font-black uppercase tracking-[0.26em]">{T.wo}</p>
                  <p className="mt-1 font-serif text-[16px]">{ort}</p>
                </div>
              )}
            </div>
          </>
        )}

        {fuss}
      </div>
    </div>
  );
}
