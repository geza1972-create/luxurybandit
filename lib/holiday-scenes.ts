/**
 * „Holiday with your dream girl" — die 25 Szenen, aus denen der Nutzer WÄHLT.
 *
 * KEIN Zufall (Owner-Vorgabe): er tippt selbst an, was passieren soll, und was er schon
 * einmal genommen hat, wird als „done" markiert und rutscht nach hinten — damit er nicht
 * zweimal dasselbe Video bekommt.
 *
 * Prompt-Regeln, die hier in jeder Zeile stecken (sonst liefert Pixverse Murks):
 * - Der Bildausschnitt steht VORNE („knees up … filmed from below"), sonst klebt es an
 *   einem Brustporträt (getestet 2026-07-27).
 * - Zwei Personen: @person = SIE (das Model), @Bild2 = ER (sein Foto).
 * - Neutrale Wörter, keine expliziten Begriffe — sonst greift die Moderation.
 * - Immer „keep both faces exactly as in the references", sonst erfindet die KI Gesichter.
 */

export type HolidayScene = {
  id: string;
  label: string;        // was der Nutzer liest
  emoji: string;        // kleine Marke auf der Karte
  place: string;        // Ort, damit die Liste abwechslungsreich wirkt
  action: string;       // der eigentliche Handlungssatz für den Prompt
};

export const HOLIDAY_SCENES: HolidayScene[] = [
  { id: "beach-walk",    label: "Walking on the beach",     emoji: "🏖️", place: "on a wide sandy beach at golden hour, gentle waves behind them",           action: "they walk slowly side by side, barefoot, talking and smiling at each other" },
  { id: "hold-hands",    label: "Holding hands",            emoji: "🤝", place: "on a sunlit promenade lined with palm trees",                               action: "they hold hands and stroll, she looks at him and laughs softly" },
  { id: "laughing",      label: "Laughing together",        emoji: "😄", place: "in a bright old town square with pastel houses",                            action: "they both laugh out loud at something she just said, heads close together" },
  { id: "kiss",          label: "A kiss",                   emoji: "💋", place: "on a quiet terrace overlooking the sea at sunset",                          action: "they lean in and share one tender kiss, then smile at each other" },
  { id: "coffee",        label: "Coffee together",          emoji: "☕", place: "at a small café table on a cobblestone street",                             action: "they sit across from each other with coffee cups, she stirs hers and looks up at him" },
  { id: "running",       label: "Running along the water",  emoji: "🏃", place: "along the shoreline with shallow water splashing",                          action: "they run a few steps together, laughing, she pulls him by the hand" },
  { id: "dinner",        label: "Dinner by candlelight",    emoji: "🍷", place: "at a candlelit dinner table on a rooftop, city lights behind them",         action: "they raise their glasses, clink them and smile into each other's eyes" },
  { id: "pool",          label: "By the pool",              emoji: "🩱", place: "at the edge of an infinity pool overlooking the sea",                       action: "they sit at the pool edge, feet in the water, shoulders touching, talking" },
  { id: "boat",          label: "On a boat",                emoji: "⛵", place: "on the deck of a small white yacht on turquoise water",                     action: "they stand at the railing, wind in her hair, he points at something on the horizon" },
  { id: "market",        label: "At the market",            emoji: "🍑", place: "in a colourful fruit market with striped awnings",                          action: "she holds up a piece of fruit for him to smell, both grinning" },
  { id: "dance",         label: "Dancing",                  emoji: "💃", place: "on a warm terrace with string lights above them",                           action: "they dance slowly together, one of his hands on her back, she is laughing" },
  { id: "sunset",        label: "Watching the sunset",      emoji: "🌅", place: "on a cliff bench above the ocean as the sun goes down",                     action: "they sit close, her head resting against his shoulder, watching the sun" },
  { id: "icecream",      label: "Sharing ice cream",        emoji: "🍦", place: "on a busy summer street with striped shop fronts",                          action: "she offers him a spoon of her ice cream, he tastes it and laughs" },
  { id: "scooter",       label: "On a scooter",             emoji: "🛵", place: "on a narrow mediterranean street with white walls",                         action: "they sit on a parked vintage scooter together, she holds his shoulder, both smiling at the camera" },
  { id: "pier",          label: "On the pier",              emoji: "🌊", place: "at the end of a wooden pier over clear water",                              action: "they walk to the end of the pier hand in hand and turn to look at each other" },
  { id: "hug",           label: "A long hug",               emoji: "🫂", place: "in a quiet garden courtyard with bougainvillea",                            action: "they hug each other warmly, she closes her eyes and smiles" },
  { id: "selfie",        label: "Taking a selfie",          emoji: "🤳", place: "in front of a famous blue-domed church by the sea",                         action: "they hold the phone up together for a selfie, cheeks close, both grinning" },
  { id: "breakfast",     label: "Breakfast on the balcony", emoji: "🥐", place: "at a small breakfast table on a hotel balcony in the morning light",         action: "they share breakfast, she pours him coffee and they talk quietly" },
  { id: "mountain",      label: "A mountain view",          emoji: "⛰️", place: "on a mountain viewpoint with green valleys behind them",                    action: "they stand together looking out, then turn to the camera and smile" },
  { id: "rain",          label: "Caught in warm rain",      emoji: "🌦️", place: "on a summer street in light warm rain, everything glistening",              action: "they run under one jacket held over their heads, laughing" },
  { id: "vineyard",      label: "In a vineyard",            emoji: "🍇", place: "between rows of vines in the late afternoon sun",                            action: "they walk between the vines, he says something and she laughs" },
  { id: "hammock",       label: "In a hammock",             emoji: "🌴", place: "in a wide hammock between two palm trees",                                  action: "they lie side by side in the hammock, talking and smiling up at the leaves" },
  { id: "citylights",    label: "City lights at night",     emoji: "🌃", place: "on a balcony above a glowing city at night",                                 action: "they stand close at the railing, she leans against him, both looking at the lights" },
  { id: "bikes",         label: "Riding bikes",             emoji: "🚲", place: "on a seaside bike path with palms and blue water",                           action: "they ride two bicycles slowly side by side and look over at each other" },
  { id: "airport",       label: "Arriving together",        emoji: "🧳", place: "in a sunlit airport hall with their suitcases",                             action: "they walk in together pulling suitcases, she looks excited and takes his arm" },
];

/** Der fertige Pixverse-Prompt für eine Szene. */
/**
 * Der Video-Auftrag — Aufbau vom Owner vorgegeben (29.07.2026, wörtlich als Muster geliefert).
 *
 * ABLAUF DAHINTER: Erst zieht FASHN die Frau mit dem gewählten Stück aus dem Kleiderschrank
 * an. DIESES angezogene Bild ist ab dann immer ihre Referenz — nicht ihr Ausgangsfoto und
 * nicht eine Beschreibung.
 *
 * DIE TOKEN SIND NICHT BELIEBIG. Pixverse ordnet sie der Reihe nach den Bildplätzen zu:
 * das ERSTE @-Token im Text bekommt Bild 1, das zweite Bild 2. Weil hier `@image1` zuerst
 * steht und der Mann ist, muss die Route SEIN Foto auf Platz 1 schicken und ihres auf
 * Platz 2 — genau umgekehrt zu früher. Wer die Token vertauscht, ohne die Bilder zu
 * tauschen, bekommt zwei Männer oder zwei Frauen.
 *
 * „Klamotten 1:1 behalten" steht ausdrücklich drin: ohne diesen Satz stylt das Modell das
 * Outfit um, und dann war das teure Anziehen umsonst. Die Drehung ist Absicht — das Video
 * zeigt damit nebenbei das Kleidungsstück, für das er bezahlt hat.
 *
 * DER BILDAUSSCHNITT STEHT VORNE (Owner 30.07.2026: „die Frau sollte bis zum Knie zu sehen
 * sein"). Genau diese Regel steht seit dem 27.07.2026 oben in dieser Datei — im Auftrag
 * selbst stand sie trotzdem als vorletzter Satz, und Pixverse hat sie überlesen: das fertige
 * Video war ein Brustbild. Jetzt ist die Einstellung das Erste, was gelesen wird, mit einem
 * ausdrücklichen Verbot, tiefer anzuschneiden.
 *
 * DER KUSS IST DIE HAUPTSACHE, NICHT DER SCHLUSS (Owner 30.07.2026: „und die küssen sich
 * nicht, nur umarmen sich" — „sie müssen sich küssen"). Der Auftrag endete fest mit einer
 * Umarmung, und die Szene daneben (spazieren, lachen, Kaffee) zog das Modell vollends weg vom
 * Kuss. Auf der Kuss-Seite bekam der Kunde damit alles außer dem, wofür er bezahlt hat.
 * Deshalb bei `kuss: true`: der Kuss steht als Hauptbewegung VORNE, die Szene ist nur noch
 * Beiwerk, und am Ende wird er wiederholt. Zweimal genannt, weil einmal überlesen wird.
 * Für „Holiday" bleibt alles wie gehabt — dort ist die Umarmung richtig.
 */
export function holidayPrompt(scene: HolidayScene, opts: { kuss?: boolean } = {}): string {
  return (
    `Wide shot, full figures: show the man from @image1 and the woman from @image2 from their ` +
    `knees up to their heads, both complete in frame with space around them, filmed from ` +
    `slightly below. Never crop the woman above her knees. ` +
    `They are together ${scene.place}. ` +
    (opts.kuss
      // Der Kuss zuerst und als Hauptbewegung — die Szene daneben ist nur Beiwerk.
      ? `The main action is a kiss: they look into each other's eyes, lean in slowly and kiss ` +
        `on the lips, clearly and tenderly, holding the kiss for a moment. Around that they ` +
        `${scene.action}, smiling and laughing softly. `
      : `${scene.action}, chatting and flirting playfully, exchanging smiles and soft laughter, ` +
        `glancing at each other now and then. `) +
    `Please keep the clothes from @image2 exactly 1:1 — the same cut, colour, fabric and details. ` +
    `Keep the face of @image1 and the face of @image2 EXACTLY as in the reference photos — ` +
    `do not change either face. ` +
    `The woman turns once so her look is fully visible, then ` +
    (opts.kuss
      ? `they kiss on the lips once more and afterwards smile at each other, happy. `
      : `he puts his arms around her. `) +
    `Natural daylight, cinematic, photorealistic, fluid ` +
    `natural motion. Fixed camera, no zoom. No text or logos. ` +
    /**
     * DIE TONSPUR MUSS IM AUFTRAG STEHEN (Owner 30.07.2026: „musik fehlt in den videos. Es
     * sind original stimmen zu hören").
     *
     * Pixverse V6 vertont, was im Text steht (`generate_audio_switch`). Da hier „chatting",
     * „laughter" und „flirting" steht, hat es genau das erzeugt: erfundene Stimmen, die zu
     * niemandem gehören — im Kuss-Video besonders daneben. Der Bild-zu-Video-Weg der Route
     * bestellt schon lange ausdrücklich Musik; dieser Weg hat es nie getan. Wortlaut
     * absichtlich gleich: nur Musik, ausdrücklich keine Stimmen.
     */
    `Audio: soft, elegant instrumental background music only — ONLY music: absolutely no ` +
    `voices, no talking, no whispering, no singing, no footsteps, no ambient or foley sound ` +
    `effects.`
  );
}
