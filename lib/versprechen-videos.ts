/**
 * DIE BEISPIELVIDEOS DES VERSPRECHENS — GELESEN, NICHT AUFGEZÄHLT (Owner 11.08.2026: „ich
 * habe ein zweites video hinzugefügt. Es sollte automatisch im slide vorkommen. Tut es abwr
 * nicht. Es ist in dem Verpechen Ordner").
 *
 * Er hat recht, dass es automatisch gehen muss. Bisher stand in `lib/versprechen.ts` EINE
 * Konstante, und die Seite machte daraus eine Liste mit einem Eintrag — wer eine Datei in den
 * Ordner legt, hat damit nichts getan. Ab jetzt ist der ORDNER die Liste: Jede `.mp4` in
 * `public/Versprechen` wird eine Folie.
 *
 * DIE REIHENFOLGE IST NICHT ALPHABETISCH, SONDERN EINE REGEL: Vorn steht immer
 * `VERSPRECHEN_VIDEO`. Das ist dasselbe Video, das die Katalog-Kachel zeigt — und die
 * Dauerregel `landingpage-video-ist-kachel-video` verlangt, dass Kachel und erste Folie
 * dasselbe versprechen. Alles Weitere folgt nach Namen, damit die Reihenfolge vorhersagbar
 * bleibt und nicht vom Zufall des Dateisystems abhängt.
 *
 * WARUM ES AUF VERCEL NICHT VON SELBST FUNKTIONIERT: Was in `public/` liegt, liefert das CDN
 * aus — in der Server-Funktion liegt der Ordner nur, wenn die Bau-Spurensuche ihn
 * mitgenommen hat. Deshalb steht in `next.config.mjs` ein `outputFileTracingIncludes` für
 * genau diesen Ordner. Fällt das Lesen trotzdem aus (fremde Laufzeit, Rechteproblem), kommt
 * die eine Konstante zurück statt einer leeren Karte.
 *
 * NUR FÜR DEN SERVER: Diese Datei fasst `node:fs` an und darf deshalb nie aus einem
 * Client-Baustein importiert werden. Sie steht bewusst NICHT in `lib/versprechen.ts` — das
 * hängt über `lib/geschenke.ts` am Trichter, also am Browser-Bündel.
 */
import fs from "node:fs";
import path from "node:path";
import { VERSPRECHEN_VIDEO } from "./versprechen";

const ORDNER = "Versprechen";

export function versprechenVideos(): string[] {
  const liste: string[] = [];
  try {
    const verzeichnis = path.join(process.cwd(), "public", ORDNER);
    for (const name of fs.readdirSync(verzeichnis).sort((a, b) => a.localeCompare(b))) {
      if (!/\.mp4$/i.test(name)) continue;
      /* Die Adresse muss die Datei treffen, auch wenn der Name Leerzeichen trägt. */
      liste.push(`/${ORDNER}/${encodeURIComponent(name)}`);
    }
  } catch {
    /* Ordner nicht lesbar → unten bleibt die Konstante übrig, nie eine leere Karte. */
  }
  /* Das Kachel-Video zuerst, alles andere dahinter; Doppelte fallen weg. */
  const vorn = VERSPRECHEN_VIDEO ? [VERSPRECHEN_VIDEO] : [];
  return Array.from(new Set([...vorn, ...liste]));
}
