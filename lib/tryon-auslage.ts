import type { TryThisLookLook } from "@/lib/try-this-look-store";
import { publicLookLabel } from "@/lib/look-title";
import { isIntimateName } from "@/lib/lingerie";

/**
 * DIE TRY-ON-AUSLAGE — DIE A-LIST, SONST NICHTS (Owner 13.08.2026, in drei Anläufen,
 * zuletzt wörtlich: „nur die bilder aus der A-List sonst nix").
 *
 * Die Wardrobe des Try-on IST `state.looks` — dieselben 97 Einträge, die der Admin-Tab
 * „A List" zeigt (Lingerie eingeschlossen; die Feed-Regel „Boudoir nicht in All" gilt
 * für den FEED, nicht hier). Keine Welt-Sortierung, kein Lingerie-Filter, keine zweite
 * Quelle: Bild vorhanden + nicht versteckt, in der gepflegten Katalog-Reihenfolge.
 * Beide Umbauten davor (Namens-Erkennung, Roben-zuerst-Sortierung) waren MEINE
 * Kuratier-Ideen und sind auf sein Wort wieder raus.
 *
 * Was bleibt: der KURZE Name (die Kuratoren-Beschreibung ist ein Absatz — Owner: „keine
 * lange berschreibungen"; unter die Kachel kommt nur der erste Satzanfang, hart gekappt).
 */

/* DER NAME KOMMT AUS DER A-LIST (Owner 13.08.2026: „klar müssen die namen aus der A-list
   sein aber abkürzen damit keine 2 zweilen entstehen") — `l.name` ist der Hausname des
   Wardrobe-Stücks („Renata Lingerie Set"), kein fremder Markenname; die Beschreibungs-
   Regel (publicLookLabel) bleibt nur der Rückfall für namenlose Einträge. Hart auf EINE
   Zeile gekappt: ~18 Zeichen tragen die Kachel, ohne umzubrechen. */
function kurzName(l: TryThisLookLook): string {
  const name = String(l.name ?? "").trim() || publicLookLabel(l, "Luxury look").split(/[.!\n]/)[0].trim() || "Luxury look";
  if (name.length <= 18) return name;
  /* An der WORTGRENZE kappen — „Renata Lingerie Se…" liest sich wie ein Fehler,
     „Renata Lingerie…" wie eine Abkürzung. */
  const stück = name.slice(0, 18);
  const raum = stück.lastIndexOf(" ");
  return `${(raum > 8 ? stück.slice(0, raum) : stück).trimEnd()}…`;
}

/* EXAKT DIE A-LIST-REGEL (Owner 13.08.2026: „nur die bilder aus der A-List sonst nix") —
   wörtlich die `wardrobeLooks`-Bedingung aus app/admin/page.tsx (~1480): NUR Garderobe-
   Stücke (`productType "ai"` oder `wardrobe`-Flag), nie Model-getragenes oder Video-Looks;
   das Bild ist die Front-Aufnahme, sonst das Hauptbild (`||`, nie `??` — Hydration liefert
   leere Strings). Zusätzlich `hidden` raus: was der Admin abgeschaltet hat, verkauft nicht. */
function istOeffentlich(l: TryThisLookLook): boolean {
  const w = l as { productType?: string; wardrobe?: boolean; frontImageUrl?: string; hidden?: boolean };
  return (w.productType === "ai" || w.wardrobe === true)
    && !!(w.frontImageUrl || l.imageUrl)
    && w.hidden !== true;
}

function bildVon(l: TryThisLookLook): string {
  const w = l as { frontImageUrl?: string };
  return String(w.frontImageUrl || l.imageUrl || "");
}

export function tryonAuslage(looks: TryThisLookLook[] | undefined, max: number): { id: string; name: string; bild: string; lingerie: boolean }[] {
  return (looks ?? [])
    .filter(istOeffentlich)
    .slice(0, max)
    /* `lingerie` reist mit (Owner 13.08.2026: „chatgpt … erlaubt keine frauen in lingerien
       … Wir hatten das über FASHN") — dieselbe Rechnung wie die Try-on-Seite: Flag, sonst
       Namens-Erkennung. Der Tunnel-Schritt 3 schickt Wäsche damit DIREKT zu FASHN, OpenAI
       sieht sie gar nicht erst (Motor-Weiche, /tryon/[lookId]/page.tsx ~672). */
    .map(l => ({
      id: l.id, name: kurzName(l), bild: bildVon(l),
      lingerie: typeof l.lingerie === "boolean" ? l.lingerie
        : isIntimateName([l.name, l.brand, l.campaignName, l.productNote].filter(Boolean).join(" ")),
    }));
}

/**
 * DIE VIDEO-AUSLAGE FÜR DIE LANDINGPAGE (Owner 13.08.2026: „du hast mir keine richtige
 * Landingpage gemacht mit Cards und videoslides. Wir haben jede menge videos.") — die
 * fertigen Try-on-VIDEOS aus der Galerie (state.generations), verbunden mit ihrem Look
 * für den öffentlichen Namen und den Boudoir-Filter. Je Look EIN Video, damit der Slider
 * Vielfalt zeigt statt fünfmal dasselbe Kleid.
 */
export function tryonVideoAuslage(
  looks: TryThisLookLook[] | undefined,
  generations: { lookId?: string; imageUrl?: string; videoUrl?: string; hidden?: boolean; pending?: boolean }[] | undefined,
  max: number,
): { id: string; name: string; bild: string; video: string }[] {
  const lookById = new Map((looks ?? []).map(l => [l.id, l]));
  const ergebnis: { id: string; name: string; bild: string; video: string }[] = [];
  const gesehen = new Set<string>();
  for (const g of generations ?? []) {
    if (!g.videoUrl || !g.imageUrl || g.hidden === true || g.pending === true) continue;
    const l = g.lookId ? lookById.get(String(g.lookId)) : undefined;
    if (!l || !istOeffentlich(l) || gesehen.has(l.id)) continue;
    gesehen.add(l.id);
    ergebnis.push({ id: l.id, name: kurzName(l), bild: String(g.imageUrl), video: String(g.videoUrl) });
    if (ergebnis.length >= max) break;
  }
  return ergebnis;
}
