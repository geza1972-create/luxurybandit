/**
 * DER BERUFS-LOOK FÜR DEN LEBENSLAUF (Owner 20.08.2026: „nur die Klamotten und Umfeld
 * müssen zum Beruf passen — Gesicht und Frisur bleiben, wie sie sind").
 *
 * Eigene, kleine Prompt-Funktion statt `geburtstagAvatarPrompt` wiederzuverwenden: Die
 * Geburtstags-Version verlangt eine `torte` (Kuchen in den Händen) — ein Konzept, das hier
 * nichts zu suchen hat. Dieselbe IDENTITY-LOCK-Sprache (Wortlaut aus `lib/geburtstag-looks.ts`,
 * dort acht Vergleichsläufe abgenommen) bleibt eins zu eins stehen — nur Kleidung/Umgebung
 * kommen jetzt aus der KI-Auswertung des Lebenslaufs statt aus einer festen Liste.
 */
export function lebenslaufAvatarPrompt(kleidung: string, umgebung: string): string {
  return (
    "IDENTITY LOCK: The uploaded person's face is the source of truth. Do not alter, " +
    "reinterpret, beautify, age, or replace the face. Only modify the requested clothing, " +
    "environment and objects. " +
    "Edit the provided image. Keep the person's face, identity, facial features, hairstyle, " +
    "skin tone, expression and overall likeness unchanged. Do not redesign or beautify the " +
    "face. " +
    `Change only: clothing — ${kleidung || "smart professional attire"}. ` +
    `Environment — ${umgebung || "a clean, modern workplace"}. ` +
    "The person stands confidently, facing the camera, professional headshot framing, " +
    "photorealistic, natural lighting. Full coverage clothing, nothing revealing. " +
    "One single image of one person, not a collage."
  );
}
