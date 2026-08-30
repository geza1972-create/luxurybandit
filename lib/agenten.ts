import { readTryThisLookState, getSignedUrl } from "@/lib/try-this-look-store";

/**
 * DIE AGENTEN-LISTE — EIN GESICHT JE BRANCHE (Owner 29.08.2026: „dann mach doch mehrere
 * Kreise mit Models drin und schreib einige Branchen rein … Gina-Kosmetik, Bella-Mode …"
 * · „nimm doch unsere Models, wir haben doch 50").
 *
 * DAS IST DIE TABELLE AUS DEM KONZEPT (KONZEPT-AGENTEN-FUER-FIRMEN.md §3): ein Ablauf, viele
 * Gesichter. Ein neuer Agent ist eine Zeile hier — nicht ein neues Bauwerk. Heute trägt die
 * Zeile nur Name, Branche und Gesicht; wenn ein Agent wirklich gebaut wird, kommen seine
 * Fragen und seine Adresse dazu.
 *
 * DIE GESICHTER SIND UNSERE EIGENEN MODELS, alle erzeugt (Owner ausdrücklich: keine echten
 * Menschen). Deshalb steht hier nur die Kennung — Name und Bild holt `agentenMitBildern()`
 * aus der Galerie, damit ein ausgetauschtes Foto überall mitwandert und nicht an zwei
 * Stellen gepflegt werden muss.
 *
 * DAVID STEHT NICHT VORNE (Owner 29.08.2026: „David nicht so hervorheben"). Er ist einer von
 * ihnen, nicht der Chef — sonst wird die Rubrik wieder eine David-Rubrik, und genau das
 * sollte sie nicht sein.
 */
export type Agent = {
  /** Kennung in der Models-Galerie — leer bei David, er hat sein Bild im Haus. */
  curatorId?: string;
  /** Nur setzen, wenn der Name vom Galerie-Namen abweichen soll. */
  name?: string;
  branche: string;
  bild?: string;
};

export const AGENTEN: Agent[] = [
  /* DAVID STEHT VORNE (Owner 29.08.2026: „David als erstes") — er ist der einzige, der
     wirklich schon arbeitet. Das erste Gesicht der Reihe ist damit kein Entwurf, sondern
     ein Beleg; alles dahinter wird dadurch glaubwürdiger. Vorne stehen heisst dabei nicht
     hervorheben: Er trägt denselben Kreis wie alle anderen. */
  { name: "David", branche: "Recruiting", bild: "/Lebenslauf/david-portrait.jpg" },
  { curatorId: "curator-1783327372354-hzuau", name: "Gina", branche: "Kosmetik" },
  { curatorId: "curator-1783683672619-td4cy", name: "Bella", branche: "Mode" },
  { curatorId: "curator-1782381879210-cymi5", name: "Vera", branche: "Medizin" },
  { curatorId: "curator-1782368411837-0mdpw", name: "Camila", branche: "Hotels" },
  { curatorId: "curator-1782368617777-dmbrx", name: "Zoe", branche: "Fitness" },
];

/**
 * Namen und frische Bild-Adressen — die Galerie-Adressen sind signiert und laufen ab, also
 * werden sie beim Rendern neu geholt statt irgendwo gespeichert.
 *
 * SIE WIRFT NIE: Fällt die Galerie aus, bleibt der Kreis ohne Bild und zeigt sein Monogramm.
 * Eine Startseite darf an einer Zierreihe nicht scheitern.
 */
export async function agentenMitBildern(): Promise<{ name: string; branche: string; bild?: string }[]> {
  let galerie: Record<string, { name?: string; pfad?: string }> = {};
  try {
    const state = await readTryThisLookState();
    for (const c of state.curators ?? []) {
      galerie[c.id] = {
        name: (c as { modelName?: string; firstName?: string }).modelName
          || (c as { firstName?: string }).firstName || "",
        pfad: (c as { photoPath?: string }).photoPath || "",
      };
    }
  } catch { galerie = {}; }

  return Promise.all(AGENTEN.map(async a => {
    const g = a.curatorId ? galerie[a.curatorId] : undefined;
    let bild = a.bild;
    if (!bild && g?.pfad) bild = await getSignedUrl(g.pfad).catch(() => "") || undefined;
    /* Nur der Vorname — „Gina Popescu" auf einem 76 px breiten Kreis bricht um. */
    const name = (a.name || g?.name || "?").split(" ")[0];
    return { name, branche: a.branche, ...(bild ? { bild } : {}) };
  }));
}
