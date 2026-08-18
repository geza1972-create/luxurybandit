import { holidayPrompt } from "@/lib/holiday-scenes";
/**
 * DIE KUSS-SZENEN — vier feste Vorlagen mit BEHALTENEN Prompts (Owner 01.08.2026: „die User
 * suchen sich eine Szene aus und wollen diese Szene nachbauen. Also brauchen wir die Prompts.
 * Bild soll die Szene nachbauen und Video dann komplett mit Kuss. … 4 Stück und Prompt
 * behalten").
 *
 * WARUM FESTE PROMPTS STATT FREIER BESCHREIBUNG: Der Kunde wählt eine Szene, weil er GENAU
 * dieses Beispiel gesehen hat. Nur ein wortgleich behaltener Prompt liefert wieder diese
 * Stimmung — jede Umformulierung ist eine andere Szene. Deshalb liegen sie hier als Quelle
 * und werden nirgends im Code neu getippt.
 *
 * ZWEI PROMPTS JE SZENE, weil zwei Maschinen bedient werden:
 *   - `bild`: der Szenen-Satz fürs GRATIS-BILD (OpenAI). Er beschreibt nur den ORT und das
 *     Licht — die Kuss-Leiter (Kuss/Fast-Kuss/Umarmung) und die Deckungsregel hängt
 *     free-preview selbst an, wie immer.
 *   - `video`: der Satz fürs BEZAHLTE VIDEO (Pixverse), komplett mit Kuss. NEUTRALE Wörter
 *     (Hausregel: kein „lingerie/skin/lace" — Pixverse flaggt sonst).
 *
 * OHNE WAHL ÄNDERT SICH NICHTS (Owner: „wobei, die wir gerade generieren sind sehr schön in
 * der Natur draussen") — wählt der Kunde keine Szene, läuft der bisherige Auftrag ohne
 * Szenen-Satz, und das Modell malt weiter seine Natur.
 */

export type KussSzene = {
  id: string;
  /** Kurzname fürs Werkzeug/Admin — die Kunden sehen das Beispielvideo, keinen Text. */
  name: string;
  /**
   * DER NAME IN DEN SIEBEN SPRACHEN (Owner 15.08.2026: „und es ist auf deutsch" — auf der
   * englischen Kuss-Seite standen „Altstadt-Platz am Abend" und „Frühstücks-Terrasse").
   * `name` oben ist der Admin-Name und bleibt deutsch; gezeigt wird `namen[lang]`. Dasselbe
   * Muster wie `GEBURTSTAG_LOOKS.namen` — eine Sprache fehlt, es faellt auf `name` zurueck.
   */
  namen?: Record<string, string>;
  /**
   * DAS BEISPIELVIDEO DIESER SZENE (Owner 15.08.2026: „ich habe mehrmals das gleiche video
   * in template"). Die Kacheln bekamen alle `beispiele[0]` — vier Kacheln, viermal derselbe
   * Clip, also keine Auswahl, sondern ein Suchbild. Je Szene liegt der echte Clip neben
   * seinem Standbild in public/szenen/ und gehoert genau hierher.
   */
  clip: string;
  /** Ort + Licht fürs Gratis-Bild. WIRD ANGEHÄNGT als „Setting: …" — kein eigener Satzbau. */
  bild: string;
  /** Komplette Szene mit Kuss fürs bezahlte Video (Pixverse, neutrale Wörter). */
  video: string;
  /**
   * ORT UND HANDLUNG FUER DIE BEWAEHRTE VORLAGE (Owner 03.08.2026: „die Videos die der Typ
   * generiert hat waren sehr schön … ich bräuchte solche Szenen" — und er hat die drei
   * Prompts der Gast-Videos wortwoertlich eingefuegt: exakt `holidayPrompt(szene, {kuss})`).
   *
   * Die alten `video`-Saetze oben waren eine EIGENE, kuerzere Bauart — ohne Drehung, ohne
   * zweiten Kuss, ohne Musik-Klausel, und vor allem ohne @-Token (die „falschen Personen").
   * Statt sie nachzubauen, laufen die Kacheln jetzt durch DIESELBE Maschine wie die
   * bewunderten Videos: `ort` fuellt das „They are together …", `aktion` das „Around that
   * they …". Der Rest — Kuss als Haupthandlung, Gesichter festhalten, ihre Kleidung 1:1,
   * die Drehung, nur Musik — kommt aus holidayPrompt und bleibt an EINER Stelle gepflegt.
   */
  ort: string;
  aktion: string;
  /**
   * LINGERIE-SZENE = 3,99 STATT 1,49 (Owner 03.08.2026: „auch das ist ein Lingerie-Video
   * für 3,99" — auf die graue Korsett-Kachel gezeigt). Vor dem Pixverse-Lauf zieht FASHN
   * sie in einen Lingerie-Look aus der Garderobe um; der Aufpreis bezahlt diesen zweiten
   * Erzeugungslauf. Preis kommt aus lib/pricing (LINGERIE_CENTS), nie von hier.
   */
  /**
   * WOERTLICH FESTGEHALTENER AUFTRAG (Owner 03.08.2026, zur Surprise-Kachel: er hat den
   * kompletten Pixverse-Prompt mitgeliefert). Steht er hier, gewinnt er unveraendert —
   * kussSzeneVideoPrompt baut dann NICHTS aus ort/aktion zusammen. Fuer Szenen, deren
   * Beispielvideo mit genau diesem Text entstand: nur der gleiche Text liefert wieder
   * dieselbe Stimmung.
   */
  promptFest?: string;
  /**
   * Die Auswahl-Kachel im Trichter — ein STANDBILD AUS DEN ECHTEN BEISPIELVIDEOS
   * (Owner 01.08.2026: die KI-Templates waren „furchtbar", die Video-Standbilder „toll").
   * Liegt in public/szenen/, damit es versioniert mit dem Code reist.
   */
  kachel: string;
  /**
   * DER BILD-PROMPT DIESER SZENE — WÖRTLICH VOM OWNER (16.08.2026).
   *
   * Er schreibt und prüft sie selbst in ChatGPT und schickt sie fertig herüber („hier ist die
   * nächste Szene"). Deshalb liegt der Text als EIGENES Feld je Szene und nicht als eine
   * gemeinsame Vorlage mit Platzhaltern: Zwei seiner Prompts unterscheiden sich nicht nur im
   * Ort, sondern in Licht, Kleidung, Kameraführung und Haltung. Jede Umformulierung wäre eine
   * andere Szene — dieselbe Begründung, aus der die Prompts überhaupt hier wohnen.
   *
   * Angehängt werden beim Aufruf nur die zwei Pflichtzeilen (nur Kopf verwenden, ein einziges
   * Bild) — siehe `kussPaarBildPrompt`.
   */
  bildPrompt: string;
  /** Der Bewegungssatz für Pixverse, ebenfalls wörtlich vom Owner. Siehe `kussBewegung`. */
  bewegung: string;
  /**
   * NOCH NICHT ZUR WAHL (16.08.2026): Die Prompts stehen, aber Kachelbild und Beispielclip
   * fehlen noch — der Owner erzeugt sie selbst und legt sie ab. Eine Kachel ohne Bild ist ein
   * schwarzes Loch in der Reihe, deshalb bleibt die Szene bis dahin unsichtbar. Sie ist
   * trotzdem schon hier, damit ihr Prompt nicht in einer Notiz verloren geht.
   */
  versteckt?: boolean;
};

export const KUSS_SZENEN: KussSzene[] = [
  /**
   * ══ EINE VORLAGE, NICHT VIER: THE BANDIT KISS (Owner 16.08.2026) ══
   *
   * „Ich müsste nicht einmal so viele templates haben sondern nur eins." — und danach hat er
   * Bild und Film selbst erzeugt und abgelegt (`public/Kiss/Rain/`). Diese Kachel ist also
   * kein Entwurf, sondern das Ergebnis, das er gesehen und gewollt hat.
   *
   * WARUM EINE BESSER IST ALS VIER, an seinen eigenen Zahlen: In sieben Tagen haben 123
   * Menschen den Trichter geöffnet, 20 haben eine Vorlage gewählt. Jede Wahl ist eine
   * Gelegenheit zu zweifeln — und der Kuss verkauft sich nicht über die Kulisse, sondern
   * über die zwei Gesichter darin. Die vier alten Szenen (Altstadt, Terrasse, Sommerregen,
   * Closeup) stehen unten weiter im Code: Sie tragen die Prompts der alten Kette und sind
   * der Rückfallweg, solange die neue nicht durch einen echten bezahlten Lauf gegangen ist.
   * Sichtbar ist nur noch diese hier.
   *
   * `bild`/`ort`/`aktion` bleiben gefüllt, weil der alte Weg sie liest, wenn das Paar-Bild
   * scheitert. Der NEUE Weg benutzt sie nicht: Dort steht der Bild-Prompt wörtlich in
   * `kussPaarBildPrompt` und die Bewegung in `KUSS_MOTION_PROMPT`, beide vom Owner.
   */
  {
    id: "rain",
    kachel: "/Kiss/Rain/rain-kiss.jpg",
    clip: "/Kiss/Rain/rain-kiss.mp4",
    name: "The Bandit Kiss",
    /* KEIN ÜBERSETZTER NAME: „The Bandit Kiss" ist ein Produktname, kein Wort — er heisst in
       jeder Sprache gleich, so wie die Marke selbst (Owner 16.08.2026: „The Bandit Kiss! So
       würde ich es nennen"). */
    bildPrompt:
      "Use Image 1 as the man's identity reference and Image 2 as the woman's identity reference. "
      + "Preserve both faces clearly and realistically.\n\n"
      + "Create a highly aesthetic cinematic Rain Kiss scene at night.\n\n"
      + "The man and woman are standing extremely close together on a rain-soaked city street. "
      + "They are not kissing yet. Their faces are only a few centimeters apart. They look deeply "
      + "into each other's eyes with visible hesitation, attraction, and emotional tension, as if "
      + "the kiss is about to happen.\n\n"
      + "The rain is strong and clearly visible in the warm backlight. Their hair and clothes are "
      + "naturally wet. The street behind them is dark and elegant, with golden streetlights, soft "
      + "city bokeh, glowing reflections on wet asphalt, and cinematic mist in the air.\n\n"
      + "The man wears a stylish dark outfit, elegant and masculine. The woman wears an elegant "
      + "black evening dress with subtle texture and sparkle.\n\n"
      + "She gently holds the front of his jacket near his chest. He leans slightly toward her. "
      + "Their lips are close but not touching.\n\n"
      + "Lighting: strong warm golden backlight, beautiful rim light around their wet hair, soft "
      + "warm light on their faces, rich blacks, high cinematic contrast.\n\n"
      + "Camera: intimate medium close-up, side angle, both faces clearly visible, 85mm cinematic "
      + "lens look, shallow depth of field.\n\n"
      + "Style: premium romantic movie still, photorealistic, sophisticated, sensual, emotional, "
      + "35mm film look, natural skin texture, cinematic color grading.\n\n"
      + "Avoid: exaggerated romance poses, artificial beauty-filter skin, fantasy styling, "
      + "excessive glow, distorted faces, extra fingers, text, logos.\n\n"
      + "Vertical 9:16.",
    bewegung:
      "Use the uploaded Rain Kiss image as the visual reference and first frame.\n\n"
      + "Create a highly aesthetic cinematic romantic video scene. A young man and a young woman "
      + "stand very close together at night in the rain on a wet city street. Warm golden backlight, "
      + "soft street bokeh, reflections on the wet pavement, elegant luxury mood, photorealistic "
      + "35mm film look.\n\n"
      + "Action:\nFirst, they hold deep eye contact.\nThe woman slightly lifts her chin and looks "
      + "at his lips.\nThe man leans in slowly.\nThey hesitate for a brief emotional moment with "
      + "their faces only centimeters apart.\nThen they share a slow, tender, beautiful kiss.\n"
      + "After the kiss, they stay close for a second, almost forehead to forehead, with a soft "
      + "emotional expression.\n\n"
      + "Style and motion:\nCinematic camera movement, very subtle slow push-in.\nSoft natural "
      + "body movement, realistic facial expressions, realistic wet hair and raindrops.\nThe rain "
      + "should be visible and beautiful in the backlight.\nKeep the mood sensual, elegant, "
      + "emotional, and premium.\nNo exaggerated motion, no comedy, no fast cuts, no text, no "
      + "logos.\n\nFormat: vertical 9:16.",
    bild: "a rain-soaked city street at night, golden streetlights and city bokeh behind them, glowing reflections on wet asphalt, cinematic mist, strong warm backlight; he in an elegant dark outfit, she in an elegant black evening dress",
    video: "On a rain-soaked city street at night, warm golden backlight, reflections on the wet pavement, the two people hold eye contact, lean in slowly and share a slow tender kiss, then stay close, almost forehead to forehead. Cinematic, photorealistic, fluid natural motion.",
    ort: "on a rain-soaked city street at night, golden streetlights and glowing reflections on the wet asphalt behind them, cinematic mist in the warm backlight",
    aktion: "they stand very close in the rain, she holds the front of his jacket",
  },
  /**
   * SZENE 2 — LAST KISS BEFORE DEPARTURE (Owner 18.08.2026). Beide Prompts wörtlich von ihm,
   * Bild UND Bewegung.
   *
   * DIE EINE ZEILE, DIE SIE DURCH DIE FILTER BRINGT, steht in seinem Text schon drin: „Avoid
   * visible political symbols, flags, or insignia." Ein Soldat des Zweiten Weltkriegs ist für
   * OpenAI wie für Pixverse ein Grenzfall — ohne diesen Satz landet der Auftrag schnell in der
   * Moderation. Sie bleibt drin, auch wenn jemand den Prompt später kürzt.
   *
   * DER NAME IST SEINER (18.08.2026): „Order: Last Kiss Before Departure" — nicht der
   * Arbeitstitel des Prompts. Kachel und Clip hat er selbst erzeugt und abgelegt.
   */
  {
    id: "platform",
    kachel: "/Kiss/Platform/platform-kiss.jpg",
    clip: "/Kiss/Platform/platform-kiss.mp4",
    name: "Last Kiss Before Departure",
    bildPrompt:
      "Use the uploaded photo of the man and the uploaded photo of the woman as identity "
      + "references.\n\n"
      + "Create a highly aesthetic cinematic black-and-white scene called \"Farewell at the "
      + "Platform.\"\n\n"
      + "Show the man as a World War II-era soldier on an old train platform, wearing a period "
      + "military coat, shoulder straps, and a simple soldier's cap. Do not include modern "
      + "clothing, modern objects, or modern styling. Avoid visible political symbols, flags, or "
      + "insignia.\n\n"
      + "The woman stands very close to him, wearing a 1940s-style dark coat with an elegant fur "
      + "collar and gloves. Her hair is styled in soft vintage curls. She looks up at him with "
      + "deep emotion, while he looks down at her with a quiet, serious, tender expression.\n\n"
      + "They stand in front of an old train carriage at a station filled with soft steam and "
      + "mist. A few blurred figures can appear in the background, but the couple must remain the "
      + "clear focus.\n\n"
      + "They are not kissing yet. They are standing in an intimate farewell moment, only a few "
      + "centimeters apart, with emotional tension and sadness. Her gloved hand is resting on his "
      + "chest or coat strap. His arm is gently around her waist.\n\n"
      + "Style and atmosphere: cinematic black and white, dramatic soft light, subtle film grain, "
      + "vintage 1940s mood, emotional, elegant, timeless, romantic, photorealistic.\n\n"
      + "Composition: vertical 9:16, medium close-up, both clearly visible, train on the left "
      + "side, steam and soft background blur behind them.\n\n"
      + "No text, no letters, no logos.",
    bewegung:
      "Use the uploaded black-and-white platform image as the first frame and visual reference.\n"
      + "Create a highly cinematic black-and-white wartime farewell scene.\n"
      + "A young World War II-era soldier and a young woman stand very close together on an old "
      + "train platform. There is soft steam in the air, an old train beside them, and a timeless "
      + "1940s atmosphere.\n\n"
      + "Action:\nFirst, they hold deep eye contact.\nThe woman looks up at him with sadness and "
      + "love.\nHer gloved hand remains on his chest or coat strap.\nHe keeps one arm gently "
      + "around her waist.\nHe lowers his head slightly toward her.\nShe steps a little closer.\n"
      + "They hesitate for one emotional moment, only centimeters apart.\nThen they share a slow, "
      + "tender, emotional kiss.\nAfter the kiss, they remain close for a moment, foreheads nearly "
      + "touching, as if they do not want to separate.\n\n"
      + "Style and motion:\nVery subtle cinematic push-in.\nSoft natural movement only.\nNo "
      + "exaggerated gestures.\nSteam drifts gently in the background.\nSlight movement in hair "
      + "and coat fabric.\nEmotional, elegant, restrained.\n\n"
      + "Look: photorealistic, cinematic black and white, subtle film grain, 1940s mood, dramatic "
      + "soft lighting, timeless romantic atmosphere.\n\n"
      + "Important: Keep both characters consistent with the uploaded image. Keep the soldier in "
      + "period military clothing and the woman in a 1940s-style coat with vintage elegance. No "
      + "modern objects, no modern styling, no text, no logos, no talking.\n\n"
      + "Format: vertical 9:16.",
    bild: "an old train platform in the 1940s, soft steam and mist, an old train carriage beside them, cinematic black and white; he as a period soldier in a military coat, she in a 1940s dark coat with fur collar and gloves",
    video: "On an old 1940s train platform in soft steam, black and white, the soldier and the woman hold eye contact, lean in slowly and share a slow tender kiss, then stay close, foreheads nearly touching. Cinematic, photorealistic, fluid natural motion.",
    ort: "on an old train platform in the 1940s, soft steam and mist drifting around them, an old train carriage beside them",
    aktion: "they stand in an intimate farewell, her gloved hand on his chest, his arm around her waist",
  },
  /**
   * SZENE 3 — KISS THROUGH THE GLASS (Owner 18.08.2026). Beide Prompts wörtlich von ihm.
   *
   * DIE SCHWIERIGSTE DER VIER, und sein Prompt weiss das: Die Scheibe zwischen den Gesichtern
   * ist genau das, was Bildmodelle am liebsten wegrechnen — zwei Gesichter, die sich fast
   * berühren, verschmelzen ihnen zu einem Kuss ohne Glas. Deshalb sagt sein Text VIERMAL
   * dasselbe mit anderen Worten („never pass through the glass", „never physically overlap",
   * „solid physical barrier", „no clipping, merging, overlapping"). Das ist keine Redundanz,
   * das ist die Wache — wer den Prompt kürzt, verliert die Szene.
   *
   * Kachel und Clip hat der Owner selbst erzeugt und abgelegt (public/Kiss/Glass/).
   */
  {
    id: "glass",
    kachel: "/Kiss/Glass/glass-kiss.jpg",
    clip: "/Kiss/Glass/glass-kiss.mp4",
    name: "Kiss Through the Glass",
    bildPrompt:
      "Use the uploaded photo of the woman and the uploaded photo of the man as identity "
      + "references.\n\n"
      + "Create a highly aesthetic cinematic romantic scene at night in New York City.\n\n"
      + "The woman is sitting inside a New York city bus, directly beside a large closed window. "
      + "The man is standing outside the bus on the sidewalk, facing her through the window.\n\n"
      + "A solid glass window must remain clearly visible between their faces at all times.\n\n"
      + "They lean toward each other emotionally, both bringing their faces close to the glass. "
      + "Their lips almost align through the window, creating the illusion of a kiss, but they "
      + "remain physically separated by the glass.\n\n"
      + "The woman's lips gently touch the inside surface of the window. The man's lips come very "
      + "close to or gently touch the outside surface of the same window.\n\n"
      + "Their faces must never pass through the glass and must never physically overlap.\n\n"
      + "The man places one hand flat against the outside of the window. The woman may place her "
      + "hand against the inside of the glass opposite his.\n\n"
      + "Nighttime New York atmosphere, wet streets, subtle rain droplets on the bus window, warm "
      + "light inside the bus, cool city lights outside, reflections, cinematic bokeh.\n\n"
      + "Keep both people recognizable from the uploaded reference images.\n\n"
      + "Photorealistic, emotional, elegant, romantic movie still, shallow depth of field, premium "
      + "35mm cinematic look.\n\n"
      + "Vertical 9:16.\n\nNo text, no logos.",
    bewegung:
      "Use the uploaded bus-window image as the first frame and visual reference.\n\n"
      + "Create a cinematic romantic night scene in New York City.\n\n"
      + "The woman remains seated inside the bus and the man remains outside on the sidewalk. A "
      + "closed glass window stays clearly between them for the entire video.\n\n"
      + "Action:\nThey first look deeply into each other's eyes through the glass.\nThe woman "
      + "slowly leans closer from inside the bus.\nThe man moves closer from outside.\nThey "
      + "hesitate for a brief emotional moment.\nThen both gently press their lips against "
      + "opposite sides of the same glass window, creating the visual impression of a kiss through "
      + "the glass.\nTheir faces must remain physically separated by the window at all times.\n"
      + "The man slowly places one hand flat against the outside of the glass.\nThe woman places "
      + "her hand against the inside of the glass opposite his.\nThey hold the moment for a "
      + "second, then slowly open their eyes and look at each other through the window.\n\n"
      + "Important:\nThe glass is a solid physical barrier.\nNo face, lips, hands, or body parts "
      + "may pass through the glass.\nNo physical contact between the two people.\nNo clipping, "
      + "merging, overlapping, or deformation.\n\n"
      + "Atmosphere: wet New York street at night, subtle rain, glowing city lights, warm light "
      + "inside the bus, cool light outside, reflections on the glass, cinematic bokeh.\n\n"
      + "Camera: very slow cinematic push-in, stable composition, subtle natural movement only.\n\n"
      + "Style: emotional, elegant, intimate, photorealistic, premium romantic movie scene, "
      + "shallow depth of field, 35mm film look.\n\n"
      + "Keep both characters consistent with the uploaded image.\n\n"
      + "No talking, no exaggerated expressions, no text, no logos.\n\nVertical 9:16.",
    bild: "a New York city bus at night, she sitting inside beside a large closed window, he standing outside on the wet sidewalk facing her through the glass, rain droplets on the window, warm light inside, cool city lights outside",
    video: "At night in New York, she inside the bus and he outside on the sidewalk, they lean towards each other and press their lips against opposite sides of the same closed window. The glass stays between them at all times. Cinematic, photorealistic, fluid natural motion.",
    ort: "at a New York bus window at night, she seated inside, he outside on the wet sidewalk, the closed glass between them",
    aktion: "they press their hands and lips against opposite sides of the same window",
  },
  /**
   * SZENE 4 — VAMPIRE KISS (Owner 18.08.2026). Beide Prompts wörtlich — mit EINER Streichung,
   * die er selbst angeordnet hat.
   *
   * GESTRICHEN, ERSTER SATZ DES BEWEGUNGS-PROMPTS („das ist eigentlich schwachsinn"): Dort
   * stand „Use the uploaded image only as a visual reference … Do NOT use the uploaded image as
   * the first frame. Create the opening shot naturally from the scene description." Das ist im
   * Pixverse-Fenster sinnvoll, in unserer Kette aber der Widerruf ihres Zwecks: Wenn Pixverse
   * die Eröffnung selbst baut, erfindet es auch die Gesichter — und der `gpt-image-2`-Schritt
   * davor, der genau diese Gesichter festhält, wäre bezahlt und weggeworfen. Das Paar-Bild IST
   * der erste Rahmen, in jeder Szene.
   *
   * DREI DINGE, DIE MAN AM REST NICHT ANFASSEN DARF:
   *   1. „NOT kissing yet" im Bild — der Kuss ist die Bewegung.
   *   2. Die Grenzen am Ende („No blood. No gore. No biting. No aggressive attack."). Ein
   *      Vampir-Prompt ohne sie ist genau der Auftrag, den jede Moderation abweist.
   *   3. „This is a romantic vampire kiss, not a bite. No penetration of the skin." — der Satz
   *      steht mitten in der Handlung und muss dort bleiben, neben der Anweisung, zu der er
   *      gehört.
   *
   * Kachel und Clip hat der Owner selbst erzeugt und abgelegt (public/Kiss/Vampire/).
   */
  {
    id: "vampire",
    kachel: "/Kiss/Vampire/vampire-kiss.jpg",
    clip: "/Kiss/Vampire/vampire-kiss.mp4",
    name: "Vampire Kiss",
    bildPrompt:
      "Use the uploaded photo of the woman and the uploaded photo of the man as identity "
      + "references.\n\n"
      + "Create a dark romantic vampire scene in a grand Gothic castle at night.\n\n"
      + "Both characters should remain clearly recognizable from the uploaded reference images, "
      + "but their styling should be transformed into an elegant, cinematic vampire-fantasy "
      + "look.\n\n"
      + "The woman has vivid red curly hair and wears an elaborate deep burgundy and black "
      + "Victorian-inspired gown with lace, translucent layers, dark gemstones and subtle gothic "
      + "couture details.\n\n"
      + "The man has dark curly hair and wears an aristocratic black vampire coat with a high "
      + "collar, embroidered waistcoat, dark cravat and subtle burgundy details.\n\n"
      + "They stand extremely close to each other in a vast Gothic castle chamber with tall "
      + "pointed arches, old stone walls, red candles, dark velvet curtains and a huge moon "
      + "visible through a cathedral-style window.\n\n"
      + "Important: They are NOT kissing yet.\n\n"
      + "They are caught in the intense moment immediately before the kiss.\n\n"
      + "The woman slightly raises her chin toward him. Her lips are slightly parted. Her hand "
      + "rests softly on his chest.\n\n"
      + "The man leans toward her, looking deeply into her eyes and then briefly at her lips. His "
      + "arm is gently around her waist.\n\n"
      + "Their faces are only a few centimeters apart, but their lips do not touch.\n\n"
      + "Create strong romantic tension, anticipation and restrained desire.\n\n"
      + "Subtle vampire details only: slightly pale skin, elegant mysterious expressions, perhaps "
      + "the faintest suggestion of vampire fangs when appropriate, but nothing grotesque or "
      + "horror-like.\n\n"
      + "Lighting: cold blue moonlight from behind, warm candlelight on their faces, dramatic rim "
      + "light, deep shadows, red and black accents.\n\n"
      + "Atmosphere: dark romantic fairytale, gothic elegance, sensual, mysterious, luxurious, "
      + "cinematic, emotional.\n\n"
      + "Style: premium fantasy romance movie still, photorealistic with slightly painterly "
      + "cinematic texture, rich detail, shallow depth of field, dramatic 35mm film look.\n\n"
      + "Exactly two people in the image.\nNo additional people.\nNo duplicates.\nNo kiss yet.\n"
      + "No blood.\nNo gore.\nNo text.\nNo logos.\n\nVertical 9:16.",
    bewegung:
      "Use the uploaded Gothic castle image as the first frame and visual reference.\n\n"
      + "A dark, elegant vampire man and a red-haired woman stand inside a grand Gothic castle at "
      + "night. At the beginning, they face each other with intense romantic tension.\n\n"
      + "The man slowly turns his face slightly toward her and gives a subtle mysterious smile.\n"
      + "He gently parts his lips and clearly reveals two elegant vampire fangs.\nHold this "
      + "moment briefly so the fangs are clearly visible.\nThe woman looks at him with "
      + "fascination and remains calm.\nThen the man slowly moves closer to her.\nShe gently "
      + "tilts her head to one side, exposing her neck.\nHe places one hand softly around her "
      + "waist and moves his face toward the side of her neck.\nHe gives her a slow, sensual kiss "
      + "on the neck.\nThis is a romantic vampire kiss, not a bite.\nNo penetration of the skin. "
      + "No blood. No wounds.\nAfter the neck kiss, he remains close to her neck for a moment "
      + "while she closes her eyes.\n\n"
      + "Camera: locked static camera. No pan. No tilt. No orbit. No handheld movement. No "
      + "side-to-side movement. No zoom. No push-in. No pull-back. The camera stays completely "
      + "still throughout the scene.\n\n"
      + "Environment: grand Gothic castle interior. Tall arched windows. Blue moonlight. Warm "
      + "candlelight. Dark red velvet. Black stone. Subtle mist. Flickering candles.\n\n"
      + "Style: dark romantic vampire fantasy. Gothic elegance. Aristocratic and sensual. "
      + "Mysterious. Luxurious. Cinematic 35mm film look. Photorealistic faces. Rich shadows. "
      + "Deep burgundy, black, antique gold and moonlit blue.\n\n"
      + "Keep both characters visually consistent with the uploaded image. The vampire fangs "
      + "must be clearly visible before he moves toward her neck.\n\n"
      + "No face morphing. No duplicate characters. No additional people. No aggressive attack. "
      + "No biting. No blood. No gore. No talking. No text. No logos.\n\nVertical 9:16.",
    bild: "a vast Gothic castle chamber at night, tall pointed arches, old stone walls, red candles, dark velvet curtains, a huge moon through a cathedral window; she in a burgundy and black Victorian gown, he in an aristocratic black vampire coat",
    video: "In a Gothic castle chamber at night, cold moonlight and warm candlelight, the vampire and the red-haired woman hold eye contact, he reveals his fangs, then gives her a slow sensual kiss on the neck. No bite, no blood. Locked static camera, photorealistic, fluid natural motion.",
    ort: "in a vast Gothic castle chamber at night, tall pointed arches and red candles around them, a huge moon through a cathedral-style window",
    aktion: "they stand extremely close, her hand on his chest, his arm around her waist",
  },
];

/** Szene per Kennung — unbekannte Kennung heisst bewusst „keine Szene" (Standard bleibt). */
export function kussSzene(id: unknown): KussSzene | null {
  const s = String(id ?? "").trim();
  return KUSS_SZENEN.find(x => x.id === s) ?? null;
}

/**
 * EINE ZUFAELLIGE KUSS-SZENE — die Ueberraschung (Owner 03.08.2026: „wir machen die ganze
 * Videoauswahl raus. Die Leute bekommen ein Zufalls-Video als Ueberraschung mit Kuss").
 *
 * Die vier Prompts sind dieselben, die vorher hinter den Kacheln lagen — es geht nichts
 * verloren ausser der Wahl. Ohne `Math.random()`: Der Trichter rendert erst auf dem Server und
 * dann im Browser; eine echte Zufallszahl waere dort zweimal verschieden und React wuerde die
 * Seite beim ersten Zeichnen einmal komplett neu aufbauen. Die Auftragsnummer ist ohnehin je
 * Kunde verschieden und damit die bessere Quelle: derselbe Auftrag, dieselbe Szene — wer neu
 * laedt, bekommt nicht ploetzlich eine andere Kulisse versprochen.
 */
export function zufallsSzene(saat?: string): KussSzene {
  const s = String(saat ?? "");
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return KUSS_SZENEN[n % KUSS_SZENEN.length];
}

/**
 * DER VIDEO-AUFTRAG EINER SZENE — MIT DEN BEIDEN GESICHTERN (Owner 03.08.2026: „auch noch
 * falsche Personen im video", nach einem BEZAHLTEN Lauf mit gewaehlter Szene).
 *
 * Die `video`-Saetze oben beschreiben nur die SZENE — „the two people look at each other …"
 * — ohne ein einziges @-Token. Die Route bindet die zwei hochgeladenen Fotos aber an
 * @-Token im Text (siehe pixverseStartReference): Kommt KEINES vor, haengen die Referenzen
 * an Namen, die der Auftrag nie nennt, und Pixverse erfindet die Personen aus der
 * Beschreibung. Der Kunde bekam ein huebsches Video — mit einem fremden Paar. Das ist der
 * schlimmste Fehler, den dieses Produkt haben kann: Er zahlt fuer SEIN Gesicht.
 *
 * Deshalb wird der Szenen-Satz hier in denselben Rahmen gestellt wie bei holidayPrompt:
 * @image1 ist der MANN, @image2 die FRAU — exakt die Reihenfolge, in der der Trichter und
 * kiss-deliver die Fotos schicken (person=seins, garment=ihres). Und wie dort wird die
 * Gesichtstreue ausdruecklich verlangt; ein Modell haelt nur, was man ihm benennt.
 */
/**
 * DIE LINGERIE-VORLAGEN SIND RAUS (Owner 03.08.2026: „das mit der Lingerie ist eh nicht allzu
 * seriös" — „wir machen das raus").
 *
 * Hier standen vier Dessous-Vorlagen mit eigenem Preis, eigenem Prompt und einem FASHN-Lauf
 * VOR dem Pixverse-Lauf. Sie waren die Wurzel fast aller Umstaendlichkeit im Kuss-Trichter:
 * zweiter Preis, Waesche-Schritt, zweite Kachelreihe, getrennte Bild-Kette (OpenAI weist
 * Dessous am Eingang ab, Pixverse nicht). Und sie passten nicht zu dem, was der Kuss seit dem
 * 03.08. ist: eine Grusskarte an einen Menschen, den man liebt.
 *
 * Die Videos liegen weiter unter `public/Kisslingerie/` — sie sind bezahlte Arbeit, und ein
 * `git revert` dieses Umbaus soll nicht an fehlenden Dateien scheitern.
 */


/**
 * DIE NEUE KUSS-KETTE (Owner 16.08.2026): ERST DAS PAAR MALEN, DANN BEWEGEN.
 *
 * „wir müssen erst mal das paar über chatgpt schön angekleidet an einem schönen ort
 * zusammenbringen. Dann wird das an pixverse gegeben und sagen die zwei lachen, schauen sich
 * an und küssen sich. Jetzt die szene wird lieber an chatgpt gegeben, wo, ob regen,
 * terrasse … dann das motion an pixverse."
 *
 * DER GRUND IST DAS GESICHT („die gesichter müssen immer stimmen, deswegen machen wir das").
 * Bisher bekam Pixverse ZWEI fremde Fotos und musste daraus in einem Zug ein Paar, eine
 * Szene, Kleidung und eine Bewegung erfinden — jeder dieser Schritte ist eine Gelegenheit,
 * ein Gesicht zu verlieren. Gemessen ist der Gegenbeweis in der Geburtstags-Kette:
 * `gpt-image-2` traf das Kundengesicht auf Anhieb (08.08.2026, acht Vergleichsläufe). Ein
 * Standbild, das schon stimmt, muss Pixverse nur noch bewegen — und ein Bild zu bewegen ist
 * die eine Sache, die es zuverlässig kann.
 *
 * ARBEITSTEILUNG, DIE SICH DARAUS ERGIBT:
 *   OpenAI  = WER und WO  — die zwei Gesichter, die Kleidung, der Ort, das Licht.
 *   Pixverse = WAS PASSIERT — ein Satz Bewegung, sonst nichts (KUSS_MOTION_PROMPT).
 *
 * NUR DIE GESICHTER KOMMEN AUS DEN FOTOS (Owner 16.08.2026: „viele schweine laden nakte
 * bilder hoch … die müssen wir auch machen, in dem wir die gesichter an chatgpt geben").
 * Der Prompt sagt deshalb ausdrücklich, dass alles unterhalb des Halses aus dem TEXT kommt,
 * nicht aus der Vorlage. Das ist zugleich die Hausregel gegen OpenAIs Sicherheitsfilter
 * (Memory `openai-tryon-safety-rule`): Ohne ausdrückliche Bedeckungs-Zusage weist er den
 * Auftrag als `sexual` ab — mit ihr laufen auch Vorlagen durch, die selbst nichts anhaben.
 */
export function kussPaarBildPrompt(szene: KussSzene): string {
  return (
    /* SEIN TEXT, UNVERAENDERT — je Szene, siehe `bildPrompt` oben. */
    szene.bildPrompt + "\n\n" +
    /**
     * ZEILE 1 DER ERGÄNZUNG — NUR DER KOPF ZÄHLT (Owner 16.08.2026: „viele schweine laden
     * nakte bilder hoch … die müssen wir auch machen, in dem wir die gesichter an chatgpt
     * geben" · „er bekommt das video am ende, aber zu seiner überraschung, die frau wird
     * angezogen sein :)").
     *
     * Ohne diesen Satz übernimmt das Modell den Körper der Vorlage — eine nackte Vorlage
     * ergäbe ein nacktes Ergebnis oder eine Ablehnung. Der Satz macht die Kleidung aus SEINEM
     * Prompt zur einzigen Quelle für alles unterhalb des Halses. Er ist zugleich die
     * Bedeckungs-Zusage, ohne die OpenAI den Auftrag als `sexual` abweist (Hausregel
     * `openai-tryon-safety-rule`, am 30.07.2026 gemessen).
     */
    "Use ONLY the head and face from each uploaded photo. Everything below the neck comes from " +
    "this description, not from the uploads: ignore the clothing, the body and the background " +
    "of the uploaded photos completely. Both people are fully and modestly covered, full " +
    "coverage guaranteed — elegant formal clothing only, nothing revealing.\n" +
    /* ZEILE 2 — die eine Bildregel des Hauses, an der schon ein Produkt gescheitert ist
       (Memory `bildprompt-nie-zwei-geschlechter`): Nennt ein Prompt einen Mann UND eine Frau,
       liefert das Modell gern ein geteiltes Bild mit zwei Porträts nebeneinander. */
    "One single photograph of exactly these two people together in one frame — not a collage, " +
    "not a split image, no extra people, no duplicated faces."
  );
}

/**
 * DIE BEWEGUNG FÜR PIXVERSE — ebenfalls je Szene (Owner-Prompts, siehe `bewegung`).
 *
 * Angehängt ist einzig die Ton-Klausel: Pixverse V6 vertont, WAS IM TEXT STEHT. Ein Prompt
 * über zwei Menschen, die sich ansehen und küssen, ohne Angabe zum Ton, hat zuverlässig
 * erfundene Stimmen erzeugt (Owner 30.07.2026: „musik fehlt in den videos. Es sind original
 * stimmen zu hören") — bei einem Kuss-Video besonders daneben.
 */
export function kussBewegung(szene: KussSzene): string {
  return (
    szene.bewegung + "\n\n" +
    "Audio: soft, elegant instrumental background music only — ONLY music: absolutely no " +
    "voices, no talking, no whispering, no singing, no footsteps, no ambient or foley sound " +
    "effects."
  );
}

export function kussSzeneVideoPrompt(szene: KussSzene): string {
  // Ein woertlich festgehaltener Auftrag gewinnt (Surprise-Kachel, Owner 03.08.2026).
  if (szene.promptFest) return szene.promptFest;
  // DIESELBE MASCHINE WIE DIE BEWUNDERTEN VIDEOS (Owner 03.08.2026: „ich bräuchte solche
  // Szenen" — mit den drei Gast-Prompts als Beleg, allesamt holidayPrompt-Ausgaben).
  // Nur Ort und Handlung kommen von der Kachel; Kuss, Gesichter, Kleidung 1:1, Drehung und
  // Musik-Klausel liefert holidayPrompt — eine Vorlage, ein Pflegeort.
  return holidayPrompt(
    { id: szene.id, label: szene.name, emoji: "", place: szene.ort, action: szene.aktion },
    { kuss: true },
  );
}
