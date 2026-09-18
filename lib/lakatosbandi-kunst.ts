/**
 * AUS SEINEM FOTO WIRD KUNST IM STIL DES WERKS (Owner 17.09.2026: „zuerst ‚your picture‘ ersetzt
 * nur das bild, dann steht ‚generate art‘").
 *
 * ── ERST QWEN (BILLIG), DANN GPT IMAGE (GUT) — 17.09.2026 zweimal gemessen ─────────────────
 *
 * Nach Preis war Qwen die richtige Wahl (fal, $0,02/MP gegen $0,04 bei Flux Kontext). Nach
 * ERGEBNIS war es keine: zwei Läufe, zweimal eine fotorealistische Szene, in der das Werk als
 * Gegenstand vorkam statt als Malweise (Owner: „absoluter schrott"). Das liegt nicht am Satz,
 * sondern an der Gattung — Qwen Image EDIT bearbeitet, es überträgt keinen Stil.
 *
 * Owner 17.09.2026: „der wird es nie im leben schaffen. Nur ChatGPT 2" · „und selbst der braucht
 * einen mega prompt". Also GPT Image (`OPENAI_IMAGE_MODEL`, bei uns `gpt-image-1.5`). Teurer je
 * Lauf — aber ein billiges Ergebnis, das niemand kauft, kostet mehr als ein teures, das verkauft.
 * Und weil ohnehin erst nach Zahlung erzeugt wird (1 € Aufpreis), trägt der Kauf den Lauf.
 *
 * ── DIE PRÜFUNG KOMMT AUS DEMSELBEN AUFRUF ──────────────────────────────────────────────────
 *
 * Die Bild-Schnittstelle lehnt selbst ab, was sie nicht erzeugen darf, und sagt das im Fehler.
 * Das ist keine vollständige Moderation, aber es fängt den Fall ab, der uns am meisten kostet:
 * etwas zu erzeugen, zu drucken und zu versenden, das wir nicht versenden dürfen (Owner
 * 17.09.2026: „jemand lädt ein pornobild hoch"). Abgelehnt heisst: kein Bild, keine Abbuchung.
 */

/**
 * Was ein Lauf kostet, in Cent. NOCH NICHT BELEGT für GPT Image — beim Scharfschalten am
 * OpenAI-Konto ablesen und hier eintragen (Hausregel: jede Zahl mit Begründung). Zum Vergleich,
 * am 17.09.2026 bei fal abgelesen: Qwen $0,02/MP · Flux Kontext Pro $0,04 · Nanobanana $0,0398.
 */
export const KUNST_LAUF_CENTS = 0;

/**
 * WIE VIELE VERSUCHE EIN BEZAHLTER EURO KAUFT (Owner 17.09.2026: 1 € Aufpreis).
 *
 * Einer wäre hart: Wem das erste Ergebnis nicht gefällt, der hat bezahlt und nichts. Unbegrenzt
 * wäre offen nach oben. Drei kosten uns fünf Cent und fühlen sich grosszügig an.
 */
export const KUNST_VERSUCHE = 3;

/**
 * ── DER PROMPT KOMMT VOM OWNER (17.09.2026) ──────────────────────────────────────────────────
 *
 * Owner: „und selbst der braucht einen mega prompt" · „ich kann ihn mal nach dem prompt fragen.
 * den kennst du nicht." Er hat ihn gebracht; hier steht er unverändert. Wer ihn ändert, ändert
 * das Ergebnis — also an DIESER Stelle und nirgends sonst.
 *
 * Er arbeitet mit ZWEI Bildern: Bild 1 ist das Werk (der Stil), Bild 2 das Foto (die Person).
 * Bei einem Bearbeitungsmodell wie Qwen ging das schief (es setzte beide zusammen); GPT Image
 * kann mehrere Eingabebilder und unterscheidet sie über den Text.
 *
 * `{{userPrompt}}` ist die Stelle für den Zusatzwunsch — bei uns die Stärke des Stils.
 */
export const KUNST_PROMPT = `Create a new original portrait using TWO image references.

IMAGE 1 is the PRIMARY STYLE REFERENCE.
IMAGE 2 is the SUBJECT / IDENTITY REFERENCE.

The final image must depict the person from IMAGE 2,
but translated deeply and completely into the visual language of IMAGE 1.

IMAGE 1 controls:
- painting technique
- level of abstraction
- color palette
- color placement
- brushwork
- surface texture
- transparency and layering
- paint drips
- scratches
- smears
- edge softness
- contrast
- atmospheric treatment
- composition rhythm
- visual density
- emotional tone

IMAGE 2 controls:
- identity
- facial proportions
- eyes
- nose
- lips
- jawline
- hairstyle
- key recognizable facial characteristics
- approximate pose and gaze

CRITICAL STYLE INSTRUCTION:

Do NOT create a photorealistic portrait with a painterly filter.

Do NOT preserve realistic photographic skin rendering.

Do NOT merely overlay colorful brushstrokes over a realistic face.

Instead, reconstruct the person as if the artist who made IMAGE 1
had painted this person from the beginning.

The face itself must inherit the abstraction level,
color breakup, texture, paint handling and atmospheric softness
of IMAGE 1.

The person should remain recognizable,
but realism must be reduced whenever IMAGE 1 is abstract.

MATCH IMAGE 1 CLOSELY IN:

- palette distribution
- dominant warm/cool balance
- transparency
- layering
- brush direction
- paint thickness
- surface texture
- edge treatment
- facial abstraction
- background integration
- color bleeding
- paint drips
- scratches
- imperfect handmade qualities

VERY IMPORTANT:

If IMAGE 1 contains:
- translucent facial overlays
- asymmetric color zones
- partially obscured features
- soft or ghostlike facial forms
- vertical drips
- rough brush marks
- scraped textures
- blurred contours

then reproduce those characteristics in the NEW portrait.

Do not make the generated person cleaner,
more realistic,
more symmetrical,
or more polished than the original artwork.

The goal is STYLE FIDELITY, not beautification.

IDENTITY PRESERVATION:

Preserve enough facial structure from IMAGE 2
so that the person remains recognizable.

Prioritize:
1. eyes
2. facial proportions
3. nose shape
4. mouth shape
5. jawline
6. hair silhouette

But reinterpret all of these through the artistic language of IMAGE 1.

BACKGROUND:

Do not invent a generic background.

Use the same abstract visual logic as IMAGE 1.

Reproduce:
- similar color zones
- comparable movement
- comparable negative space
- comparable texture density

but do NOT copy the original composition literally.

Create a new, original composition.

TEXT:
Do not reproduce any text, logo, signature or watermark from the artwork
unless explicitly requested by the user.

OUTPUT:
One finished artistic portrait.
No explanation.
No frame.
No mockup.
No typography.
No watermark.

USER ADDITIONAL INSTRUCTION:
{{userPrompt}}

STYLE PRIORITY:
70% style image
30% subject photo

Identity must remain recognizable,
but stylistic fidelity is more important than photographic realism.`;

/**
 * WIE STARK DER STIL ÜBERNOMMEN WIRD (Owner 17.09.2026: „Leicht · Stark · Sehr stark", Vorgabe
 * „Sehr stark"). Der Satz landet an der Stelle `{{userPrompt}}` im Prompt.
 */
export const KUNST_STAERKE = {
  leicht: "Apply the style moderately; keep more of the photographic likeness.",
  stark: "Apply the style strongly.",
  sehr: "Apply the style as strongly as possible; style fidelity outranks likeness.",
} as const;
export type KunstStaerke = keyof typeof KUNST_STAERKE;

/**
 * ── DREI MOTOREN, EIN SCHALTER (17.09.2026) ─────────────────────────────────────────────────
 *
 * Qwen Edit Plus ist mit Abstand der günstigste ($0,03 je Bild gegen $0,075 bei Max und
 * deutlich mehr bei OpenAI). Ob er die Aufgabe trifft, ist damit NICHT beantwortet: Unsere zwei
 * Fehlversuche am 17.09.2026 liefen mit einem dürftigen Satz — mit dem ausführlichen Prompt
 * kann dasselbe Modell etwas ganz anderes liefern.
 *
 * Das entscheidet man nicht im Gespräch, sondern an zwanzig, dreissig echten Paaren, und man
 * misst genau zwei Dinge: Ist die Person noch erkennbar? Und sieht es aus wie dasselbe
 * Werkuniversum? Damit dieser Vergleich möglich ist, ohne den Bau umzuwerfen, laufen alle drei
 * über DENSELBEN Prompt und DIESELBEN zwei Bilder — nur der Motor wechselt, über
 * `KUNST_MOTOR` in der Umgebung.
 *
 * Preise je Bild, 17.09.2026: Qwen Plus $0,03 · Qwen Max $0,075 · OpenAI teurer (am Konto
 * ablesen). Auf 1.000 Läufe: ~$30 gegen ~$75.
 *
 * KEIN reines Bild-zu-Bild (17.09.2026 mit `flux/dev/image-to-image` gemessen): bei Stärke 0,45
 * blieb es ein Foto, bei 0,65 waren es andere Menschen — und immer noch ein Foto. Es gibt dort
 * keinen Punkt, der Gesicht hält UND zeichnet. Dafür braucht es Erzeugung, die an Kanten oder
 * Gesichtsmerkmalen festgemacht ist (ControlNet / Identitäts-Adapter), nicht an einer Stärke.
 */
export const KUNST_MOTOREN = {
  "qwen-plus": { art: "fal", modell: "fal-ai/qwen-image-edit-plus" },
  "qwen-max": { art: "fal", modell: "fal-ai/qwen-image-edit-max" },
  openai: { art: "openai", modell: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2" },
} as const;

export type KunstMotor = keyof typeof KUNST_MOTOREN;

const motorWahl = (): KunstMotor => {
  const w = process.env.KUNST_MOTOR?.trim() as KunstMotor | undefined;
  return w && w in KUNST_MOTOREN ? w : "qwen-plus";
};

export type KunstErgebnis =
  | { ok: true; bild: string; modell: string }
  | { ok: false; grund: "kein-schluessel" | "abgelehnt" | "fehler" };

/**
 * ── DAS FOTO ALS UNTERLAGE, 10 % DECKKRAFT (Owner 17.09.2026: „du nimmst das original foto,
 * machst das als level mit 90 prozent transparenz wie in photoshop, dann skribbelst du drauf,
 * weil du dann die ähnlichkeit hast zu 100%") ────────────────────────────────────────────────
 *
 * So arbeitet die Handschrift wirklich: ein blasses Foto unter der Zeichnung, die Striche
 * darüber. Die Ähnlichkeit kommt aus der Unterlage, die Kunst aus den Strichen — und die grossen
 * ruhigen Flächen bleiben ruhig, weil dort nur das blasse Foto durchscheint.
 *
 * Gebaut mit `sharp`, das im Projekt schon liegt: Unten weiss, darauf das Foto mit 10 %
 * Deckkraft, darüber das erzeugte Bild im Multiply-Modus. Multiply macht Weiss durchsichtig
 * (weiss mal x = x) und lässt Linien und Lasuren stehen — genau wie eine Zeichenebene in
 * Photoshop über einer blassen Fotoebene.
 */
export const UNTERLAGE_DECKKRAFT = 0.10;

export async function mitUnterlage(foto: string, kunst: string): Promise<string> {
  const sharp = (await import("sharp")).default;
  const roh = (uri: string) => Buffer.from(uri.split(",")[1] ?? "", "base64");
  const kunstBild = sharp(roh(kunst));
  const { width = 1024, height = 1024 } = await kunstBild.metadata();

  /* Das Foto auf das Mass des erzeugten Bildes, dann auf 10 % Deckkraft. */
  const blass = await sharp(roh(foto))
    .resize(width, height, { fit: "cover" })
    .ensureAlpha(UNTERLAGE_DECKKRAFT)
    .png()
    .toBuffer();

  const ergebnis = await sharp({ create: { width, height, channels: 4, background: "#ffffff" } })
    .composite([
      { input: blass, blend: "over" },
      { input: await kunstBild.png().toBuffer(), blend: "multiply" },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
  return `data:image/jpeg;base64,${ergebnis.toString("base64")}`;
}

/** Ein Daten-URI als Datei für die Bild-Schnittstelle. */
function alsDatei(datenUri: string, name: string): Blob | null {
  const teil = datenUri.split(",")[1];
  if (!teil) return null;
  const typ = /^data:([^;]+)/.exec(datenUri)?.[1] ?? "image/jpeg";
  return new File([new Uint8Array(Buffer.from(teil, "base64"))], name, { type: typ });
}

/**
 * Sein Foto als Gemälde im Stil des Werks.
 *
 * `werk` und `foto` sind Daten-URIs; zurück kommt das erzeugte Bild als Daten-URI, zusammen mit
 * der Modell-Kennung, die tatsächlich funktioniert hat (damit sichtbar wird, welche der
 * Kaskade greift — und die anderen später wegkönnen).
 */
/**
 * ── ERST SEHEN, DANN MALEN (Owner 17.09.2026: „ich sage chatgpt nur mach das bild in dem stil
 * und er macht das") ─────────────────────────────────────────────────────────────────────────
 *
 * Das ist der Schritt, der fünf Läufe lang gefehlt hat. Im Chat sieht das Sprachmodell die
 * beiden Bilder AN, schreibt sich eine konkrete Beschreibung und reicht erst DIE an den
 * Bildgenerator weiter. Die Bild-Schnittstelle allein sieht nicht hin — sie nimmt Bilder als
 * Material, und ein Referenzbild wird zum Zitat statt zur Handschrift. Deshalb kam generisches
 * Bunt heraus, während es im Chat funktioniert.
 *
 * Hier macht ein Modell mit Augen genau das: Werk und Foto ansehen, den Prompt schreiben. Es
 * kostet Bruchteile eines Cents und braucht keinen neuen Anbieter.
 */
const SEHEN_MODELL = () => process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o";

/**
 * ── ZUERST DAS WERKZEUG, DANN DER REST (Owner 17.09.2026: „da ist ein kugelschreiber-stil, musst
 * du doch sehen. was hast du gemacht? flecken") ─────────────────────────────────────────────
 *
 * Die erste Fassung dieses Auftrags sagte „Gemälde" und gab dem Modell nur Maler-Vokabular:
 * Lasuren, Drips, Impasto, Trockenpinsel. Louisetts Werk ist aber KUGELSCHREIBER — lange,
 * durchlaufende Schlaufenlinien. Das Modell hat die Linien brav als Malerei beschrieben, und der
 * Generator hat gemalt: Farbtupfer und Sprenkel statt Striche. Die Palette stimmte, die
 * Handschrift nicht — und die Handschrift ist das, was der Kunde kauft.
 *
 * Deshalb steht jetzt an erster Stelle: WOMIT ist das gemacht, und WAS FÜR MARKEN sind das. Erst
 * danach Palette, Dichte, Kanten. Und das Modell muss sagen, welche Texturen NICHT vorkommen
 * dürfen — bei einem Linienwerk sind das genau die Sprenkel, die wir bekommen haben.
 *
 * Und was der Künstler LEER LÄSST (Owner: „typisch ist die weisse Fläche ohne Details — wenn
 * eine helle Stelle ist, dann weiss, keine Details"). Bei Stift und Tusche gibt es kein Weiss
 * zum Auftragen: Das Licht ist das unberührte Papier. Ein Generator, dem man das nicht sagt,
 * füllt jede helle Stelle mit Tönen und Details — und genau dann sieht es nach Filter aus.
 *
 * FIGUR UND HINTERGRUND GETRENNT (Owner 17.09.2026: „bg ist kein kugelschreiber-stil, sondern
 * lange grosse aquarellflächen" · „ich nutze nur bei dunklen seiten kugelschreiber, in vielen
 * tönen, aber ein ton überragt"). Ein Werk kann zwei Techniken tragen — Stift auf der Figur,
 * Aquarell dahinter. Ein Auftrag, der nach EINEM Medium fragt, bekommt eine Mischung aus
 * beidem: Linien im Hintergrund, Flächen im Gesicht. Also zwei Fragen, zwei Antworten.
 *
 * ALLE PERSONEN (17.09.2026 gesehen: aus einem Paar wurde eine Frau). „The person" heisst für
 * ein Modell: eine. Bei zwei Menschen auf dem Foto bleiben zwei.
 *
 * WO DER KÜNSTLER AUFHÖRT (Owner 17.09.2026: „sie hat extra weisse fläche bei den haaren, nicht
 * alles ausgearbeitet, nur schatten sind mit kugelschreiber, also grosse flächen"). Der Generator
 * arbeitet alles durch — Haare bis in die letzte Strähne. Die Handschrift lebt vom Gegenteil:
 * grosse ruhige Flächen, Stift nur im Schatten. Also fragt der Auftrag ausdrücklich, wie viel
 * der Fläche überhaupt bearbeitet ist.
 *
 * DIE FARBEN SIND DIE DES KÜNSTLERS, NICHT DIE DES FOTOS (Owner 17.09.2026: „die frau bei dir hat
 * keine schwarzen haare sondern rot. und schwarzen anzug sollte der typ auch nicht haben, sondern
 * rot oder hellblau"). Das Modell hatte die Lokalfarben des Fotos übernommen — schwarze Haare,
 * dunkler Anzug — und nur die Striche im Stil gemacht. Bei dieser Handschrift gibt es kein Schwarz
 * ausser in den Pupillen: Dunkel heisst die dunkelsten Töne der Palette.
 *
 * DREI STUFEN, NICHT ZWEI (Owner 17.09.2026: „du hast beim gesicht total weiss genommen, auch wo
 * es ein schatten sein sollte"). Mit nur „weiss oder Stift" blieb das halbe Gesicht leer.
 *
 * UND DIE MITTLERE STUFE IST AUCH STIFT (Owner: „nix aquarell hellgrün, das ist kuli" · „nur die
 * augen haben dunkle farben und die ecken im mund, sonst helles grün"). Zuerst hatte ich den
 * Halbschatten als Aquarellfläche beschrieben — falsch. Auf der Figur ist ALLES Kugelschreiber:
 * hell = Papier, Mitteltöne = derselbe Stift in hellen Farben, locker; dunkel = dichter dunkler
 * Stift nur an Augen und Mundwinkeln. Aquarell gibt es nur im Hintergrund.
 */
export async function stilSehen(werk: string, foto: string, staerke: KunstStaerke, technik = "", notizen = ""): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const auftrag = [
    /* ── DIE NOTIZEN DES KÜNSTLERS ZU SEINER METHODE (Owner 17.09.2026: „bei den augen benutze
       ich bei der iris, wenn braun, helleres braun und etwas rot für den blitz-effekt, und
       schwarz bei pupillen") ────────────────────────────────────────────────────────────────
       Solche Sätze kann kein Modell aus einem Bild sicher ablesen — der Künstler weiss sie. Sie
       gehören zu SEINEN Daten (`stilnotizen` am Werk oder am Künstler), nicht in diesen Code, und
       gehen hier als Klartext mit. Fehlen sie, muss das Modell allein hinsehen. */
    ...(notizen ? [`The artist's own notes on their method — follow these over your own reading: "${notizen}"`] : []),
    /* Was der Künstler selbst als Technik eingetragen hat, ist die beste Auskunft, die es gibt —
       ein Modell, das „digital brushes" sieht, wo der Künstler „Kugelschreiber" sagt, soll dem
       Künstler glauben. */
    ...(technik ? [`The artist states the technique of IMAGE 1 is: "${technik}". Trust this over your own guess when naming the tool.`] : []),
    /* „Identität" und „identify" lösen bei Vision-Modellen die Sperre gegen das Erkennen realer
       Personen aus (17.09.2026: „I can't assist with that"). Es geht aber um ein Auftragsporträt:
       der Abgebildete hat das Foto selbst hochgeladen. Das steht jetzt vorne, und das Wort
       „Identität" kommt nicht mehr vor — beschrieben werden Formen, keine Personen. */
    "You are an art director at a portrait studio. A customer has uploaded their own photo (IMAGE 2) and chosen an artwork (IMAGE 1) whose style they want their commissioned portrait drawn in. Do not identify anyone; only describe visual forms.",
    "Look carefully at IMAGE 1 (an artwork) and IMAGE 2 (a photo of a person).",
    "STEP 1 — identify the MEDIUM and the MARK-MAKING of IMAGE 1 precisely. Do NOT assume it is a painting.",
    "Name the actual tool (e.g. ballpoint pen, fineliner, pencil, charcoal, ink, watercolor, acrylic, oil, digital brush, collage, spray, marker)",
    "and the kind of marks (e.g. continuous looping scribble lines, cross-hatching, short strokes, dots, flat fills, washes, glazes, drips, scratches, smears).",
    "Judge the FIGURE and the BACKGROUND as two separate things — artists often combine media (e.g. a ballpoint-pen figure over large loose watercolour washes). Name the medium and marks of each separately, and say so in the prompt.",
    "Name the PHYSICAL tool even if the work may be digital (say 'ballpoint pen' for pen-like scribble, 'watercolour' for translucent washes) — the generator responds to physical tools, not to 'digital brush'.",
    "STEP 1b — the TONAL STEPS on the figure. Count how many tonal steps the artist uses on skin and hair and name the TOOL and the COLOURS of EACH step — do not assume mid-tones are washes; look. A common pen pattern is three: (1) the lightest areas are untouched white paper with no marks at all; (2) mid-tones are the SAME pen, but sparse and in LIGHT colours (e.g. light green, ochre, pale teal) — open scribble that lets the paper show through; (3) only the deepest accents — typically the eyes, the corners of the mouth, under the chin — carry dense DARK pen in several colours with one dominant tone.",
    "Say exactly which zones of the face and hair get which step, and which zones stay white. The prompt MUST forbid leaving the whole face white (only true highlights are white) AND forbid turning mid-tones into paint if they are pen in IMAGE 1. If washes exist only in the background, say so: washes in the background only, pen only on the figure.",
    "Describe the colour logic of the line work: many tones with ONE dominant tone that carries the figure? Name the dominant tone and the accent tones.",
    "STEP 1e — WHERE THE ARTIST STOPS: how much of the surface is actually worked, and how much is left as flat area (untouched paper on the figure, flat wash in the background)? Look at the HAIR especially: is it fully drawn, or mostly blank paper with pen only in its shadow parts? If large areas are left flat, the prompt must say so: most of the surface stays flat and calm, pen marks sit only in shadows and accents, the hair is NOT worked out — large untouched white areas in the hair, loops only where it is dark. Fewer marks than you think.",
    "STEP 1d — LOCAL COLOUR: does the artist keep the real colours of the subject (black hair stays black, a dark jacket stays dark) or REPLACE them with the artwork's own palette? Look at the hair, the clothes and the darkest areas of IMAGE 1. If they are rendered in the artwork's colours (e.g. hair in magenta and violet loops, clothes in red or light blue, no black anywhere except the pupils), the prompt MUST say so explicitly: every dark area of the photo — hair, clothing, shadows — is drawn in the artwork's darkest palette tones, never in black, grey or brown; the only black is the pupils.",
    "STEP 1c — the EYES carry the likeness; look at them closely in IMAGE 1: how are iris and pupil treated (e.g. iris in a lighter tone of its natural colour with a small warm or red spark of light; pupil solid black; lashes as pen lines)? Encode this in the prompt.",
    "The prompt must contain ONE explicit sentence per tonal step (white highlight / light-pen mid-tone / dark-pen accents) and one for the eyes — do not merge them into a general description.",
    "Then look at what the artist LEAVES EMPTY, and judge the FIGURE and the BACKGROUND separately: on the figure, are highlights (skin, hair) left as untouched white paper with no marks at all? Is the background filled with colour, or also left blank?",
    "If the figure's highlights are blank, this is a defining trait and the prompt must demand it explicitly: on the person, bright areas are pure, untouched white — zero detail, zero marks, no shading, no colour — only the shadowed parts carry marks; and say separately whether the background is filled (usually it is) so the generator does not blank it too — the blank white on the figure is what separates the figure from the filled background, say so.",
    "STEP 2 — write ONE image-generation prompt, in English, max 220 words, that makes the generator create the person from IMAGE 2 as a NEW work by the same hand as IMAGE 1:",
    "same medium, same kind of marks (say it twice, it matters), same palette (name the dominant and secondary colours and their temperature), same line/mark density, same edge treatment, same abstraction of the face, same background logic, same mood.",
    "Say what must be kept from IMAGE 2 so the sitters recognise themselves: all people who appear in the photo (if there are two, both stay), and for each the face shape, eyes, hair silhouette, pose and gaze — nothing else from the photo (no clothing details, no objects, no setting).",
    `Style strength: ${KUNST_STAERKE[staerke]}`,
    "STEP 3 — end the prompt with an explicit NEGATIVE list of textures that must NOT appear, chosen from what IMAGE 1 does not contain:",
    "if IMAGE 1 is line-based, forbid speckles, splatter, stippling, pointillist dots, blotches, soft painterly smears and airbrush; if it is wash-based, forbid hard outlines and hatching; and so on.",
    "Always forbid: photographic skin, any text, lettering, signature, frame, watermark.",
    "Output only the final prompt (STEP 2 + STEP 3), no headings, no preamble.",
  ].join(" ");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SEHEN_MODELL(),
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: auftrag },
            { type: "text", text: "IMAGE 1 (artwork):" },
            { type: "image_url", image_url: { url: werk, detail: "high" } },
            { type: "text", text: "IMAGE 2 (person):" },
            { type: "image_url", image_url: { url: foto, detail: "low" } },
          ],
        }],
      }),
    });
    const data = await res.json().catch(() => null) as
      { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
    if (data?.error) { console.warn(`[kunst/sehen] ${data.error.message}`); return null; }
    const text = data?.choices?.[0]?.message?.content?.trim();
    /* Eine Verweigerung ist kein Prompt. Ginge sie durch, stünde „I'm sorry, I can't assist" als
       Bildauftrag beim Generator — und der malt dann irgendetwas. Also: erkennen, melden, null. */
    if (!text || text.length < 80 || /\b(can(?:'|’)?t|cannot|unable to|won(?:'|’)?t) (?:assist|help|do that|comply)|I(?:'|’)?m sorry/i.test(text)) {
      console.warn(`[kunst/sehen] verweigert oder leer: ${(text ?? "").slice(0, 120)}`);
      return null;
    }
    console.info(`[kunst/sehen] ${text}`);
    return text;
  } catch {
    return null;
  }
}

export async function kunstErzeugen(werk: string, foto: string, staerke: KunstStaerke = "sehr", motor?: KunstMotor, technik = "", notizen = ""): Promise<KunstErgebnis> {
  const wahl = motor ?? motorWahl();
  const { art, modell } = KUNST_MOTOREN[wahl];
  if (!werk || !foto) return { ok: false, grund: "fehler" };
  /**
   * ZWEI WEGE ZUM PROMPT, EIN SCHALTER (`KUNST_SEHEN`):
   *   1 (Vorgabe) — erst sehen, dann malen: ein Modell mit Augen beschreibt Werk und Foto.
   *   0 — der Prompt des Owners geht direkt an den Generator (Owner 17.09.2026: „du nimmst jetzt
   *       chatgpt 2 und fertig … du gibst ihm den prompt"); seine Werk-Notizen stehen dann an
   *       der Stelle `USER ADDITIONAL INSTRUCTION`, wo sein Prompt sie vorsieht.
   * Schlägt das Sehen fehl, bleibt der Owner-Prompt ohnehin der Rückfall.
   */
  /* Die Züge bleiben (Owner 17.09.2026: „er soll das gesicht nicht verändern — position des
     auges, mundes, nase und ohres"): keine Umdeutung der Geometrie, nur der Oberfläche. */
  const zuege = "Do NOT alter the facial geometry of anyone in IMAGE 2: the position, size and proportions of the eyes, mouth, nose and ears and the shape of the glasses must match the photo exactly — only the rendering changes, never the features.";
  /**
   * ── DAS WERK BLEIBT DAS WERK (Owner 17.09.2026: „bei ihr muss man die klamotten beibehalten"
   * · „Was habe ich dir gesagt. Immer beibehalten. auch die klamotten und haare bei einem
   * kunstwerk" · „die frau hat eine taube in der hand, das sollte man auch behalten" · „auch die
   * pose behalten und die farben" · „und die umgebung" · „also allgemein wollen die leute das
   * sehen") ──────────────────────────────────────────────────────────────────────────────────
   *
   * Der Prompt darüber sagt „IMAGE 2 controls hairstyle … approximate pose" — genau daraus wurde
   * bei Monica Rusu ein Model im Lederkleid vor ihrem Hintergrund: Kleid, Haare, Pose, Tauben
   * und Farben waren weg, übrig blieb die Malweise. Gekauft wird aber das BILD: Wer es bestellt,
   * will in DIESEM Kleid, in DIESER Pose, in DIESER Umgebung stehen — mit seinem Gesicht.
   *
   * Deshalb steht hier ausdrücklich, was aus Bild 1 kommt: alles ausser dem Gesicht.
   *
   * ── UND NICHT JEDES WERK IST EIN PORTRÄT (Owner 17.09.2026, zu Szidonia Bandi: „das würde
   * heissen du baust die person hier am pool ein aber in ihrem stil. Wenn jemand hier ein bild
   * von seinem garten macht oder haus, dann musst du bei ihr kakteen auch einbauen in ihrem
   * stil") ────────────────────────────────────────────────────────────────────────────────────
   *
   * Bei ihr sind die Werke Orte — ein Pool, eine Arkade, Kakteen in Kübeln. Dort gibt es kein
   * Gesicht zum Tauschen. Also drei Fälle statt einem: Porträt (nur das Gesicht), Ort + Person
   * (die Person wird in den Ort hineingemalt), Ort + Ort (sein Garten in ihrer Handschrift, mit
   * ihren wiederkehrenden Motiven aus den Notizen).
   */
  const werkBleibt = [
    "IMAGE 1 is a finished painting and it must stay that painting. Keep from IMAGE 1, unchanged: the composition and framing, the clothing of any figure in it (cut, colour, folds), the hairstyle, hair colour and hair length, every object, animal, bird, plant, building or accessory in it, the background and the whole environment, and the complete colour palette. Do NOT take clothes, hair, background or colours from IMAGE 2, do NOT add or remove objects, and do NOT turn the picture into a different scene.",
    "CASE A — IMAGE 1 SHOWS A PERSON: keep that figure's pose and the gesture of the hands exactly. ONLY the FACE of the person in IMAGE 2 is used: paint that face in the technique of IMAGE 1 and fit it into the head that is already in IMAGE 1. If the person in IMAGE 2 differs in age or gender from the figure, keep the painting as it is and let only the face carry that difference.",
    "CASE B — IMAGE 1 SHOWS NO PERSON (a landscape, a garden, a building, an interior, a still life) AND IMAGE 2 SHOWS A PERSON: keep the whole scene of IMAGE 1 — its architecture, plants, objects, water, light and palette — and paint the person from IMAGE 2 INTO that scene, as if the artist had painted them there from the beginning: at a natural size for the place, standing or sitting where a person would be in that scene, rendered in exactly the same technique, with the same brushwork, the same abstraction and the same palette as everything around them. Their face keeps its features; everything else about them is painted in the style of IMAGE 1.",
    "CASE C — IMAGE 2 SHOWS A PLACE, NOT A PERSON (a garden, a house, a room, a street): repaint THAT place in the technique, palette and level of abstraction of IMAGE 1, keeping the layout of IMAGE 2 recognizable, and bring in the recurring motifs of the artist that are named in the artist's notes below, so the result looks like a work of the same hand.",
  ].join(" ");
  /* Die Notizen des Künstlers schlagen die Vorlage (17.09.2026 bei „Gina" gemessen: die Notiz
     sagte „Frisur hochgesteckt wie im Werk", der Prompt oben sagt „IMAGE 2 controls hairstyle" —
     das Modell nahm die Haare aus dem Foto). Deshalb steht hier ausdrücklich, wer gewinnt, und
     „hairline" ist aus der Geometrie-Sperre heraus: die Züge sind gesperrt, die Frisur nicht. */
  const vorrang = notizen
    ? `The artist's notes below take precedence over everything above, including which image controls the hairstyle, hair colour, background and composition. Artist's notes on this style: ${notizen}`
    : "";
  const zusatz = [werkBleibt, zuege, KUNST_STAERKE[staerke], vorrang].filter(Boolean).join(" ");
  const eigener = KUNST_PROMPT.replace("{{userPrompt}}", zusatz);
  const sehen = process.env.KUNST_SEHEN?.trim() !== "0";
  const gesehen = sehen ? await stilSehen(werk, foto, staerke, technik, notizen) : null;
  if (sehen && !gesehen) console.warn("[kunst] ohne Sehen-Schritt gelaufen");
  const prompt = gesehen ?? eigener;

  if (art === "openai") return openaiLauf(modell, prompt, werk, foto);
  return falLauf(modell, prompt, werk, foto);
}

/** fal (Qwen): beide Bilder als Daten-URIs, Stil zuerst — die Reihenfolge, die der Prompt nennt. */
async function falLauf(modell: string, prompt: string, werk: string, foto: string): Promise<KunstErgebnis> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) return { ok: false, grund: "kein-schluessel" };
  try {
    const res = await fetch(`https://fal.run/${modell}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_urls: [werk, foto], num_images: 1, output_format: "jpeg" }),
    });
    const data = await res.json().catch(() => null) as
      { images?: { url?: string }[]; has_nsfw_concepts?: boolean[]; detail?: unknown } | null;
    if (data?.has_nsfw_concepts?.[0]) return { ok: false, grund: "abgelehnt" };
    const bild = data?.images?.[0]?.url;
    if (!res.ok || !bild) {
      console.warn(`[kunst] ${modell}: ${JSON.stringify(data?.detail ?? data).slice(0, 300)}`);
      return { ok: false, grund: "fehler" };
    }
    return { ok: true, bild, modell };
  } catch {
    return { ok: false, grund: "fehler" };
  }
}

/** OpenAI: beide Bilder als Dateien an die Bild-Schnittstelle. */
async function openaiLauf(modell: string, prompt: string, werk: string, foto: string): Promise<KunstErgebnis> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, grund: "kein-schluessel" };
  const stil = alsDatei(werk, "stil.jpg");
  const person = alsDatei(foto, "person.jpg");
  if (!stil || !person) return { ok: false, grund: "fehler" };

  try {
    const form = new FormData();
    form.append("model", modell);
    form.append("prompt", prompt);
    form.append("n", "1");
    form.append("image[]", stil);
    form.append("image[]", person);

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const data = await res.json().catch(() => null) as
      { data?: { b64_json?: string; url?: string }[]; error?: { message?: string; code?: string } } | null;

    if (data?.error) {
      const text = `${data.error.code ?? ""} ${data.error.message ?? ""}`;
      if (/safety|policy|moderation|content/i.test(text)) return { ok: false, grund: "abgelehnt" };
      console.warn(`[kunst] ${modell}: ${text.trim()}`);
      return { ok: false, grund: "fehler" };
    }
    const roh = data?.data?.[0];
    const bild = roh?.b64_json ? `data:image/png;base64,${roh.b64_json}` : roh?.url;
    if (!res.ok || !bild) return { ok: false, grund: "fehler" };
    return { ok: true, bild, modell };
  } catch {
    return { ok: false, grund: "fehler" };
  }
}
