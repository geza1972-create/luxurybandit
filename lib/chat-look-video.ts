/**
 * DAS VIDEO NACH DEM ANZIEHEN (Chat-Thema) — Owner 28.07.2026:
 * „ganz zeigen und drehen lassen, mit Musik, an einem schönen Urlaubsort,
 *  und sie kann sagen: Hello Darling, how are you?"
 *
 * Aufbau bewusst wie in den erprobten Prompts (Surprise/Try-on):
 *  1. BILDAUSSCHNITT ZUERST — sonst klebt Pixverse an einem Brustporträt.
 *  2. @person bindet das Referenzfoto (V6-Referenzmodus), sonst erfindet es ein Gesicht.
 *  3. NEUTRALE WÖRTER — keine Dessous-/Haut-/Spitzen-Begriffe, die Pixverse blockt.
 *  4. Erst sprechen, dann drehen: der Satz muss in die ersten Sekunden, sonst fehlt er.
 */

// Schöne Urlaubsorte, neutral beschrieben. Erste Zeile = Standard.
export const HOLIDAY_SCENES = [
  "at a beautiful seaside resort with palm trees and turquoise water behind her",
  "on a sunlit terrace above the sea with white villas and bougainvillea behind her",
  "on a wooden jetty over calm turquoise water at golden hour",
  "in a tropical garden beside a quiet pool with palm shadows on the stone",
  "on a Mediterranean promenade at sunset with soft warm light",
];

export function chatLookVideoPrompt(scene = HOLIDAY_SCENES[0]): string {
  return (
    // 1) Ausschnitt
    "Show the woman from head to toe, her full figure inside the frame, filmed from a low " +
    "camera angle tilting slightly upwards. " +
    // 2) Szene + sprechen + drehen
    `@person stands ${scene}. She looks straight into the camera, smiles and says out loud, ` +
    `clearly and warmly: "Hello darling, how are you?" Her lips move in sync with the words. ` +
    "Then she turns slowly all the way around, showing her outfit from every side, and takes a " +
    "few relaxed steps toward the camera. " +
    // 3) Treue zum Referenzfoto
    "Keep @person face, hair, body and outfit EXACTLY as in the reference photo — do not change " +
    "her face and do not change what she is wearing. " +
    // 4) Handwerk
    "Fluid natural motion, cinematic, photorealistic. Fixed camera, no zoom. No text or logos."
  );
}

/** Nicht zweimal hintereinander derselbe Ort (pro Gerät gemerkt). */
export function pickHolidayScene(): string {
  const KEY = "lb_chat_last_scene";
  let last = -1;
  try { last = Number(localStorage.getItem(KEY) ?? "-1"); } catch { /* kein Speicher */ }
  const choices = HOLIDAY_SCENES.map((_, i) => i).filter(i => i !== last);
  const pick = choices[Math.floor(Math.random() * choices.length)] ?? 0;
  try { localStorage.setItem(KEY, String(pick)); } catch { /**/ }
  return HOLIDAY_SCENES[pick];
}
