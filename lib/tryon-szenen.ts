/**
 * DIE URLAUBS-SZENEN DES TRY-ON — AN EINER STELLE (15.08.2026).
 *
 * WARUM SIE UMGEZOGEN SIND: Sie lagen in `app/try/[lookId]/page.tsx`, also in EINER Seite.
 * Der neue Tunnel (`/themes/tryon`) schickte deshalb gar keinen Prompt mit und bekam den
 * nuechternen Studio-Rueckfall der Route — kein Urlaubsort, keine Abwechslung, waehrend die
 * alte Seite aus 50 Orten zog. Owner 15.08.2026: „da wird ein schoener Urlaubsort gemacht,
 * wir haben 50 Prompts, oder nicht".
 *
 * Jetzt lesen BEIDE aus dieser Datei. Wer eine Szene ergaenzt, ergaenzt sie fuer beide —
 * das ist der ganze Zweck (Skill `tryon-backgrounds` zeigt ab jetzt hierher).
 *
 * DIE REGELN AUS DEM SKILL GELTEN UNVERAENDERT:
 *   1. Jede Szene endet mit einem KOMMA — der gemeinsame Schwanz beginnt mit " @1".
 *   2. Neutrale Woerter, nur ORT, Licht und Stimmung. Kein „lingerie", kein „lace", keine
 *      Koerperwoerter: Pixverse weist den TEXT sonst ab (am 15.08. am Tanz erlebt).
 *   3. Keine Wueste/Sand-Szene — vom Owner ausdruecklich entfernt.
 *   4. Sichtbar verschiedene Orte; fuenf Infinity-Pools sind eine Szene, nicht fuenf.
 *   5. Nie zweimal HINTEREINANDER dieselbe — dafuer sorgt `tryonPromptZiehen`.
 */

/** Der gemeinsame Schluss: Drehung, Schritte zur Kamera, Gesicht und Outfit festhalten. */
export const TRYON_MOTION_TAIL =
  " @1 presents the @2. She turns slowly all the way around to show it from every side, then walks a few relaxed steps toward the camera. Keep @1 face and appearance and the @2 exactly the same throughout. Fluid natural motion, photorealistic, high-end look. No text or logos.";

/** ~50 sichtbar verschiedene Orte. Jeder endet mit einem Komma. */
export const TRYON_SCENES: string[] = [
  "On a white-sand tropical beach with turquoise ocean waves behind her,",
  "In a grand marble palace hall with crystal chandeliers and tall gold-framed mirrors,",
  "On a modern city rooftop at night with a glowing skyline and warm neon lights behind her,",
  "In a lush tropical jungle beside a cascading waterfall with soft mist,",
  "In a cozy alpine chalet with a glowing fireplace and warm wooden interior,",
  "In an autumn park with golden falling leaves and soft afternoon light,",
  "By a sleek modern infinity pool at a hilltop villa at golden hour,",
  "On a Venetian palazzo balcony overlooking the Grand Canal at golden sunset,",
  "On a Santorini clifftop terrace with white walls and blue domes above the Aegean sea,",
  "On the deck of a luxury yacht on the open blue sea under a bright clear sky,",
  "On a Parisian rooftop terrace with the Eiffel Tower in the background at dusk,",
  "In a blooming cherry-blossom garden with soft pink petals drifting in the air,",
  "In a snow-covered pine forest with soft falling snowflakes and clear winter light,",
  "In an elegant Art Deco hotel lobby with golden accents and a grand staircase,",
  "On a Tuscan vineyard terrace at golden hour with rolling hills and cypress trees,",
  "In a Moroccan riad courtyard with colorful mosaic tiles and a central fountain,",
  "On a New York City street at night with bright billboards and yellow taxis,",
  "In a Japanese zen garden with raked gravel, stone lanterns and a red maple tree,",
  "On a Swiss mountain peak with panoramic snowy alps and a clear blue sky,",
  "On an overwater bungalow deck above a turquoise Maldives lagoon,",
  "In a Provence lavender field in full bloom under a soft violet sky,",
  "In a grand library with tall wooden bookshelves and warm reading lights,",
  "In a rooftop garden lounge with string lights and a city skyline at dusk,",
  "In a luxury private jet cabin with cream leather seats and soft lighting,",
  "On a Dubai skyscraper observation deck overlooking the glittering city at night,",
  "On a cobblestone European old-town street with charming cafés and flower boxes,",
  "In a sun-drenched Greek island harbor with white boats and deep blue water,",
  "In a modern glass penthouse living room with panoramic city views,",
  "In a botanical greenhouse full of tropical plants under a glass ceiling,",
  "On a serene lakeside dock at sunrise with calm reflective water and mountains,",
  "On a seaside boardwalk promenade lined with palm trees at golden hour,",
  "On an Amalfi Coast terrace overlooking colorful cliffside houses and the sea,",
  "In a luxury spa with a candle-lit indoor pool and soft rising steam,",
  "On a Scandinavian cabin terrace under the glowing northern lights,",
  "On a Parisian café terrace on a charming street in soft morning light,",
  "In a rose garden in full bloom with an ivy-covered stone archway,",
  "In a modern luxury boutique with soft spotlights and polished marble floors,",
  "On a tropical beach at sunset with palm trees and a warm orange sky,",
  "In a grand opera house foyer with a red carpet and gilded balconies,",
  "By a mountain-lake infinity pool at a wellness resort with alpine views,",
  "On a flower-market street with bright bouquets and bright morning sunlight,",
  "On a clifftop lighthouse path by the ocean under a dramatic blue sky,",
  "On an elegant shopping avenue at night with softly lit storefronts,",
  "In a countryside manor garden with fountains and manicured hedges,",
  "Beside a tropical waterfall lagoon with turquoise water and lush greenery,",
  "On a Prague old-town square with gothic towers at blue hour,",
  "In a sunlit Mediterranean courtyard with olive trees and terracotta pots,",
  "On a snow-covered village street with warm festive lights at dusk,",
  "In an elegant ballroom with a grand chandelier and a polished marble floor,",
  "On a rooftop helipad overlooking a coastal city skyline at sunset,",
];

/** Ort + gemeinsamer Schluss = der fertige Prompt. */
export const TRYON_PROMPTS: string[] = TRYON_SCENES.map(s => s + TRYON_MOTION_TAIL);

const LETZTE_SZENE = "lb_try_last_scene";

/**
 * Zieht einen Prompt — nie den, der zuletzt dran war. Der Merker liegt im Geraet unter
 * demselben Schluessel wie bisher, damit die alte Seite ihre Historie behaelt.
 */
export function tryonPromptZiehen(): string {
  let letzte = -1;
  try { letzte = Number(localStorage.getItem(LETZTE_SZENE) ?? "-1"); } catch { /* kein Speicher */ }
  const auswahl = TRYON_PROMPTS.map((_, k) => k).filter(k => k !== letzte);
  const i = auswahl[Math.floor(Math.random() * auswahl.length)] ?? 0;
  try { localStorage.setItem(LETZTE_SZENE, String(i)); } catch { /* kein Speicher */ }
  return TRYON_PROMPTS[i];
}
