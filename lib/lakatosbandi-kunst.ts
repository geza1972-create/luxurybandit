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
  /**
   * ── ÄHNLICHKEIT SCHLÄGT STIL (Owner 18.09.2026, Vermeer-Vergleich mit ChatGPT: „es sieht
   * überhaupt nicht ähnlich aus bei uns") ─────────────────────────────────────────────────────
   *
   * `sehr` stand bis heute im Poster-Weg — und `sehr` sagt wörtlich „style fidelity outranks
   * likeness". Wir haben dem Modell also aufgetragen, das Gesicht zu opfern, und uns danach
   * gewundert, dass es das tut.
   *
   * WARUM NICHT EINFACH `leicht`: Das nimmt auch den Stil zurück („apply the style moderately"),
   * und der Stil ist das Produkt. Gewollt ist beides voll — nur mit klarer Rangfolge, wenn sie
   * einander widersprechen. Genau das steht hier.
   */
  treu: "Apply the style fully, but likeness outranks style fidelity: if the two ever conflict, keep the face of the person from IMAGE 2 recognisable.",
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
/**
 * ── DER KUNST-WEG HAT SEIN EIGENES MODELL (18.09.2026) ──────────────────────────────────────
 *
 * `OPENAI_IMAGE_MODEL` liegt an ZWANZIG Stellen im Haus: Geburtstagsvideo, Kuss, Paarbild,
 * Armee, Lebenslauf, Try-on, Tagesbilder. Wer diese Variable anfasst, um das Poster besser zu
 * machen, schiebt jedes laufende, bezahlte Produkt auf ein Modell, das dort nie geprüft wurde —
 * genau der Umbau, den der Owner am 06.09. ausgeschlossen hat („die dürfen nicht angehen").
 *
 * `KUNST_MODELL` gilt nur hier. Fehlt sie, bleibt alles wie bisher.
 */
/**
 * ── STILE OHNE KÜNSTLER (Owner 19.09.2026: „es gibt bei PixVerse ein Karikaturen-Tool, den
 * hätte ich gerne eingebaut") ────────────────────────────────────────────────────────────────
 *
 * ── WARUM NICHT ÜBER PIXVERSE ───────────────────────────────────────────────────────────────
 *
 * Geprüft am 19.09.2026: Die offene Schnittstelle von PixVerse kennt AUSSCHLIESSLICH Video —
 * `/video/…/generate` in zehn Spielarten, dazu `/image/upload`, das Bilder nur HINEINlädt. Eine
 * Bild-Erzeugung gibt es dort nicht; „Image Template Generation" steht als Begriff in der Doku,
 * ohne Pfad und ohne Felder. Und eine Liste der Vorlagen gibt es auch nicht — die `template_id`
 * holt man sich von Hand aus ihrer Weboberfläche.
 *
 * Ihren internen Aufruf nachzubauen wäre möglich und falsch: undokumentierte Schnittstellen
 * ändern sich ohne Vorwarnung, und es hinge ein bezahltes Konto daran.
 *
 * ── WAS WIR STATTDESSEN HABEN ───────────────────────────────────────────────────────────────
 *
 * Genau diese Aufgabe ist der `treu`-Motor: EIN Bild (sein Foto) plus ein kurzer Satz, und das
 * Gesicht bleibt, weil die Rollenverteilung stimmt ([[kunst-rollen-statt-prompt]]). Ein
 * Karikaturen-Werkzeug ist damit kein Anschluss, sondern eine Liste von Sätzen.
 *
 * ── WARUM DIE SÄTZE HIER STEHEN UND NICHT IN EINER SEITE ────────────────────────────────────
 *
 * Sie sind das Produkt. Wer einen Stil ändert, ändert, was der Kunde bekommt — das gehört an
 * eine Stelle, neben den Identity Lock, nicht verstreut in ein Formular.
 */
/**
 * ── DIE ZEILE AUF DEM BLATT, WENN ER NICHTS SCHREIBT (Owner 19.09.2026: „hier brauche einen
 * Text, der zu allen passt, auf Englisch … es kann auch so was stehen wie Caricatura in Stil
 * Vintage by lakatosbandi.com") ─────────────────────────────────────────────────────────────
 *
 * HIER STAND DER WERBESATZ DES KÜNSTLERS — „Transformă poza ta într-o caricatură personalizată."
 * Auf der Seite ist das richtig: Er wirbt. Auf dem BLATT, das jemand an seine Wand hängt, ist es
 * ein Werbespruch über dem eigenen Gesicht.
 *
 * Der Rückfall sagt stattdessen, was das Bild IST. Englisch, weil das Blatt in jedem Land
 * dasselbe ist und der Käufer es verschenkt, ohne zu wissen, wer es liest.
 *
 * ER KANN IHN WEITER ÜBERSCHREIBEN — im Fenster, vor dem Preis. Das hier ist nur das, was ohne
 * sein Zutun gedruckt wird.
 */
export function kunstBlattSatz(stil?: string): string {
  const s = String(stil ?? "").trim();
  const wie = (KARIKATUR_STILE as Record<string, { englisch?: string }>)[s]?.englisch;
  return wie ? `Caricature in ${wie} style · lakatosbandi.com` : "Made at lakatosbandi.com";
}

export const KARIKATUR_STILE = {
  vintage: {
    name: "Vintage-Illustration",
    /** Für die Zeile auf dem Blatt — sie steht in Englisch. */
    englisch: "vintage",
    satz: "a hand-painted 1950s Riviera travel-poster illustration: flat gouache colour fields, "
      + "warm sun-bleached palette, confident ink contour lines, stylised but not distorted",
  },
  karikatur: {
    name: "Karikatur",
    /** Für die Zeile auf dem Blatt — sie steht in Englisch. */
    englisch: "caricature",
    satz: "a friendly hand-drawn caricature in ink and watercolour wash: the head slightly larger "
      + "than the body, the most characteristic features gently exaggerated, warm and flattering, "
      + "never grotesque and never insulting",
  },
  comic: {
    name: "Comic",
    /** Für die Zeile auf dem Blatt — sie steht in Englisch. */
    englisch: "comic",
    satz: "a clean European comic-album panel: bold black ink outlines, flat bright colours, "
      + "simple cel shading, a light halftone texture",
  },
  bleistift: {
    name: "Bleistift",
    /** Für die Zeile auf dem Blatt — sie steht in Englisch. */
    englisch: "pencil",
    satz: "a graphite pencil portrait on textured paper: soft hatching, deep blacks in the eyes, "
      + "untouched white paper in the highlights, no colour at all",
  },
  oel: {
    name: "Ölgemälde",
    /** Für die Zeile auf dem Blatt — sie steht in Englisch. */
    englisch: "oil painting",
    satz: "a classical oil portrait: visible brushwork, warm glazes, a dark neutral background, "
      + "soft directional light from one side",
  },
} as const;

export type KarikaturStil = keyof typeof KARIKATUR_STILE;

/**
 * Sein Foto in einem dieser Stile. Kein Werk, kein Künstler — nur das Bild und ein Satz.
 *
 * DERSELBE IDENTITY LOCK wie beim Poster: Er steht wörtlich in `treuLauf` ganz vorn, und er ist
 * der Grund, warum am Ende sein Gesicht herauskommt und nicht ein schöneres.
 */
export async function karikaturErzeugen(foto: string, stil: KarikaturStil): Promise<KunstErgebnis> {
  const s = KARIKATUR_STILE[stil] ?? KARIKATUR_STILE.karikatur;
  const modell = KUNST_MODELL();
  return treuLauf(modell, `${s.satz}. Keep the pose and the framing of the photo.`, foto);
}

const KUNST_MODELL = () =>
  process.env.KUNST_MODELL?.trim() || process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";

export const KUNST_MOTOREN = {
  "qwen-plus": { art: "fal", modell: "fal-ai/qwen-image-edit-plus" },
  "qwen-max": { art: "fal", modell: "fal-ai/qwen-image-edit-max" },
  openai: { art: "openai", modell: KUNST_MODELL() },
  /**
   * ── DER VIERTE MOTOR: IDENTITÄT ALS EIGENER KANAL (Owner 18.09.2026, testweise) ────────────
   *
   * Die drei Motoren darüber haben alle dasselbe Loch: Werk und Foto gehen als ZWEI Bilder in
   * denselben Tokenstrom, und das Modell muss selbst raten, welches wofür zuständig ist. Bei
   * einem gemalten Porträt gehen beide Ziele zusammen, bei einem expressiven Werk streiten sie —
   * und der Stil gewinnt, weil er mehr Fläche hat.
   *
   * PuLID hat einen SEPARATEN Eingang für das Gesicht (`reference_image_url`) und einen Regler
   * dafür (`id_weight`). Die Identität kommt nicht mehr aus dem Prompt, sondern aus der
   * Architektur.
   *
   * DER PREIS DIESES WEGES, EHRLICH: Der Endpunkt nimmt NUR EIN Bild. Das Werk kann nur als TEXT
   * hinein — es gibt keinen Struktur- und keinen Stil-Eingang (Doku geprüft 18.09.2026). Das
   * Ergebnis ist also nicht mehr dieselbe Datei mit getauschtem Gesicht, sondern ein NEUES Bild
   * in derselben Komposition. Bei berühmten Werken trägt das, weil das Modell die Vorlage kennt
   * — genau so hat der Owner es in ChatGPT mit einem Satz hinbekommen. Bei der Handschrift eines
   * unbekannten Künstlers trägt es nicht, und dort bleibt es beim alten Weg.
   */
  pulid: { art: "pulid", modell: "fal-ai/flux-pulid" },
  /**
   * ── DER FÜNFTE MOTOR: DAS FOTO IST DAS BLATT (Owner 18.09.2026: „wir hatten das Problem bei
   * Future Me") ───────────────────────────────────────────────────────────────────────────────
   *
   * DIE HAUSREGEL VOM 08.08.2026 ([[geschenk-kette-openai-heygen]]) löst genau dieses Problem,
   * und zwar nicht mit einem besseren Prompt, sondern mit einer anderen Aufstellung:
   *
   *   · NUR das Kundenfoto geht an das Modell — nie ein zweites Bild, das mischt Personen.
   *   · Der Auftrag lautet „Edit the provided image": SEIN Foto ist die Grundlage.
   *   · Kleidung und Umgebung kommen als TEXT (`look.kleidung`, `look.umgebung`).
   *   · Ganz oben steht der IDENTITY LOCK, wörtlich aus `lib/geburtstag-looks.ts`.
   *
   * Alle Motoren darüber machen es umgekehrt: Sie geben dem Modell das WERK zum Bearbeiten und
   * hängen das Foto daneben. Dann malt es am Werk weiter, und das Gesicht ist ein Vorschlag.
   *
   * HIER IST DAS WERK DER TEXT und das Foto das Blatt. Was bei einem Geburtstagsvideo die Torte
   * und der Raum sind, ist hier der Turban und der schwarze Grund.
   */
  treu: { art: "treu", modell: KUNST_MODELL() },
  /**
   * ── DER SECHSTE MOTOR: DIE ROLLEN, IN SEINER REIHENFOLGE (Owner 18.09.2026) ─────────────────
   *
   * Der Owner hat dasselbe Bild in ChatGPT erzeugt — und dort sass es. Auf die Frage nach dem
   * Prompt kam die Antwort, und der Unterschied lag NICHT im Ton, sondern in drei Dingen:
   *
   *   1. DIE REIHENFOLGE. Bild A ist das FOTO (Identität), Bild B das WERK (Stil, Stimmung,
   *      Aufbau). Bei uns lief es umgekehrt: `openaiLauf` hängt seit je das Werk als erstes an.
   *      Was zuerst kommt, ist für ein Edit-Modell das Blatt, an dem gearbeitet wird.
   *   2. DER BEFEHL „ERSETZE". „replace the subject in Image B with the person from Image A" —
   *      ein Auftrag mit Subjekt und Objekt. Unser Prompt sagte „erzeuge ein Porträt aus zwei
   *      Referenzen" und überliess dem Modell, wer wen ersetzt.
   *   3. DAS GESICHT EINZELN AUFGEZÄHLT: Augenform, Augenabstand, Nasenform, Mundform, Art des
   *      Lächelns, Gesichtsproportionen, Haarfarbe. Nicht „die Geometrie", sondern die Liste.
   *
   * KURZ GEHALTEN, AUF SEINEN EIGENEN RAT: „Zu viel Text kann bei Edit-Modellen wieder
   * konkurrierende Signale erzeugen." Deshalb steht hier kein Wort über Pinselführung — das
   * Werk hängt ja als Bild daneben und muss nicht beschrieben werden.
   */
  rollen: { art: "rollen", modell: KUNST_MODELL() },
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

/**
 * ── NUR DAS GESICHT IST NEU, DER REST IST DAS WERK (Owner 18.09.2026) ────────────────────────
 *
 * ── WARUM DAS DIE EIGENTLICHE LÖSUNG IST ────────────────────────────────────────────────────
 *
 * Bis heute erzeugen wir das GANZE Blatt neu und BITTEN das Modell im Prompt, Kleidung, Pose,
 * Hände, Objekte, Hintergrund und Palette aus dem Werk zu übernehmen. Der Owner hat diese Bitte
 * am 17.09. dreimal nachgeschärft („die frau hat eine taube in der hand, das sollte man auch
 * behalten" · „auch die pose behalten und die farben" · „und die umgebung") — und das Modell
 * bricht sie trotzdem, weil es kein Kopierwerkzeug ist, sondern ein Maler.
 *
 * Wird nur die GESICHTSFLÄCHE eingesetzt und alles andere aus der Originaldatei zurückkopiert,
 * ist die Bitte keine Bitte mehr. Es kann nicht mehr wandern, weil es nicht mehr erzeugt wird.
 *
 * ── WARUM ZWEI RECHTECKE UND NICHT EINES ────────────────────────────────────────────────────
 *
 * Das erzeugte Bild ist kein Überdruck des Werks: Der Kopf sitzt dort ein Stück höher, kleiner
 * oder schräger. Ein Gesicht, das an der Stelle des Werks ausgeschnitten und an derselben Stelle
 * eingesetzt wird, säse daneben. Deshalb fragt der Sehen-Schritt BEIDE Rechtecke ab und das
 * erzeugte Gesicht wird auf das Mass des Werks gebracht, bevor es eingesetzt wird.
 *
 * ── DER RAND ────────────────────────────────────────────────────────────────────────────────
 *
 * Eine harte Kante wäre als Aufkleber sichtbar. Die Maske ist eine Ellipse, die nach aussen
 * weich ausläuft — innen das neue Gesicht, aussen das Werk, dazwischen ein Übergang.
 *
 * TESTWEISE (`KUNST_NUR_GESICHT=1`): Ohne Schalter bleibt alles wie bisher. Schlägt irgendein
 * Schritt fehl, kommt das erzeugte Bild unverändert zurück — ein bezahlter Lauf darf nie an
 * einer Nachbearbeitung sterben ([[paid-jobs-must-survive-the-browser]]).
 */
type Kasten = { x: number; y: number; w: number; h: number };

async function gesichtsKaesten(werk: string, erzeugt: string): Promise<{ werk: Kasten; erzeugt: Kasten } | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SEHEN_MODELL(),
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            /* Derselbe Schutzsatz wie beim Stil-Sehen: „Gesicht" plus „Person" löst bei
               Vision-Modellen sonst die Sperre gegen das Erkennen realer Menschen aus. */
            { type: "text", text: "Do not identify anyone. Only report geometry. In each image, give the bounding box of the head of the main figure — from the top of the hair to the chin, and the full width of the head including both ears. Answer as JSON: {\"a\":{\"x\":0,\"y\":0,\"w\":0,\"h\":0},\"b\":{\"x\":0,\"y\":0,\"w\":0,\"h\":0}} where a is IMAGE A, b is IMAGE B, and all four numbers are fractions of the image width and height between 0 and 1." },
            { type: "text", text: "IMAGE A:" },
            { type: "image_url", image_url: { url: werk, detail: "low" } },
            { type: "text", text: "IMAGE B:" },
            { type: "image_url", image_url: { url: erzeugt, detail: "low" } },
          ],
        }],
      }),
    });
    const data = await res.json().catch(() => null) as
      { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
    if (data?.error) { console.warn(`[kunst/kasten] ${data.error.message}`); return null; }
    const roh = JSON.parse(data?.choices?.[0]?.message?.content ?? "{}") as { a?: Kasten; b?: Kasten };
    const gut = (k?: Kasten) => !!k && [k.x, k.y, k.w, k.h].every(n => typeof n === "number" && n >= 0 && n <= 1) && k.w > 0.02 && k.h > 0.02;
    if (!gut(roh.a) || !gut(roh.b)) { console.warn("[kunst/kasten] unbrauchbar:", JSON.stringify(roh).slice(0, 200)); return null; }
    return { werk: roh.a as Kasten, erzeugt: roh.b as Kasten };
  } catch { return null; }
}

export async function nurGesicht(werk: string, erzeugt: string): Promise<string> {
  try {
    const kaesten = await gesichtsKaesten(werk, erzeugt);
    if (!kaesten) return erzeugt;
    const sharp = (await import("sharp")).default;
    const roh = (uri: string) => Buffer.from(uri.split(",")[1] ?? "", "base64");

    const werkBild = sharp(roh(werk));
    const { width: bw = 0, height: bh = 0 } = await werkBild.metadata();
    const erzBild = sharp(roh(erzeugt));
    const { width: ew = 0, height: eh = 0 } = await erzBild.metadata();
    if (!bw || !bh || !ew || !eh) return erzeugt;

    /* Etwas grösser als der Kopf: Haaransatz, Kinn und Wangen sollen im weichen Rand liegen,
       nicht an der Kante. 15 % rundherum, aber nie über den Bildrand hinaus. */
    const weiten = (k: Kasten, w: number, h: number) => {
      const zx = (k.x + k.w / 2) * w, zy = (k.y + k.h / 2) * h;
      const bb = Math.min(k.w * 1.3 * w, w), hh = Math.min(k.h * 1.3 * h, h);
      return {
        left: Math.max(0, Math.round(zx - bb / 2)), top: Math.max(0, Math.round(zy - hh / 2)),
        width: Math.max(8, Math.round(Math.min(bb, w))), height: Math.max(8, Math.round(Math.min(hh, h))),
      };
    };
    const zielRaum = weiten(kaesten.werk, bw, bh);
    const quelle = weiten(kaesten.erzeugt, ew, eh);
    /* Innerhalb des Bildes bleiben — ein Ausschnitt, der über die Kante ragt, wirft in sharp. */
    const ziel = {
      ...zielRaum,
      width: Math.min(zielRaum.width, bw - zielRaum.left),
      height: Math.min(zielRaum.height, bh - zielRaum.top),
    };
    const q = {
      ...quelle,
      width: Math.min(quelle.width, ew - quelle.left),
      height: Math.min(quelle.height, eh - quelle.top),
    };
    if (ziel.width < 8 || ziel.height < 8 || q.width < 8 || q.height < 8) return erzeugt;

    const gesicht = await sharp(roh(erzeugt)).extract(q).resize(ziel.width, ziel.height, { fit: "fill" }).png().toBuffer();

    /* Die weiche Ellipse: innen voll deckend, nach aussen auslaufend. `dest-in` schneidet das
       Gesicht auf diese Form zu, statt eine graue Scheibe darüberzulegen. */
    const maske = Buffer.from(
      `<svg width="${ziel.width}" height="${ziel.height}" xmlns="http://www.w3.org/2000/svg">
         <defs><radialGradient id="m" cx="50%" cy="50%" r="50%">
           <stop offset="0%" stop-color="#fff" stop-opacity="1"/>
           <stop offset="62%" stop-color="#fff" stop-opacity="1"/>
           <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
         </radialGradient></defs>
         <rect width="100%" height="100%" fill="url(#m)"/>
       </svg>`);

    const weich = await sharp(gesicht).composite([{ input: maske, blend: "dest-in" }]).png().toBuffer();
    const fertig = await sharp(roh(werk))
      .composite([{ input: weich, left: ziel.left, top: ziel.top }])
      .jpeg({ quality: 92 })
      .toBuffer();
    return `data:image/jpeg;base64,${fertig.toString("base64")}`;
  } catch (e) {
    console.warn("[kunst] nurGesicht fehlgeschlagen:", e);
    return erzeugt;
  }
}

/**
 * ── DAS WERK IN WORTEN (nur für den PuLID-Weg) ──────────────────────────────────────────────
 *
 * PuLID nimmt kein zweites Bild. Damit ist die Beschreibung des Werks nicht Beiwerk, sondern das
 * einzige, was vom Werk übrig bleibt — und sie muss deshalb das enthalten, was der Kunde auf dem
 * Blatt wiedererkennen will: Komposition, Blickrichtung, Kleidung, Kopfbedeckung, Requisiten,
 * Hintergrund, Palette, Malweise. KEIN Wort über das Gesicht: das kommt aus dem eigenen Kanal,
 * und jede Gesichtsbeschreibung hier wäre eine zweite, konkurrierende Quelle.
 *
 * Nennt das Modell die Vorlage beim Namen („Vermeer, Mädchen mit dem Perlenohrring"), ist das
 * ein Gewinn und kein Fehler: Ein bekanntes Werk steckt im Generator drin, und ein Name trägt
 * mehr als zwanzig Adjektive.
 */
async function werkInWorten(werk: string, technik = "", notizen = ""): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SEHEN_MODELL(),
        max_tokens: 260,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: [
              "Describe this artwork as an image-generation prompt for a NEW painting in the same manner. Do not identify anyone; describe visual forms only.",
              "Include: the composition and framing, the pose and the direction of the gaze, the clothing and any head covering, every object the figure holds or that sits nearby, the background, the colour palette, the light, and the painting technique.",
              "If this is a widely known work, name the artist and the work — a generator knows it better than any description.",
              "Say NOTHING about the face, the facial features, the skin or the expression. Those come from elsewhere.",
              "Begin with 'A portrait of a person' and keep it under 90 words. Output only the prompt.",
              ...(technik ? [`The artist states the technique is: "${technik}".`] : []),
              ...(notizen ? [`The artist's notes on their method: "${notizen}".`] : []),
            ].join(" ") },
            { type: "image_url", image_url: { url: werk, detail: "high" } },
          ],
        }],
      }),
    });
    const data = await res.json().catch(() => null) as
      { choices?: { message?: { content?: string } }[]; error?: { message?: string } } | null;
    if (data?.error) { console.warn(`[kunst/worte] ${data.error.message}`); return null; }
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text && text.length > 40 ? text : null;
  } catch { return null; }
}

/**
 * PuLID auf fal: das Gesicht als eigener Eingang, das Werk als Text.
 *
 * `id_weight` ist der Regler, um den es hier überhaupt geht — 1 ist der Vorgabewert der Doku,
 * über `KUNST_ID_WEIGHT` zum Ausprobieren verstellbar, ohne dass jemand Code anfassen muss.
 * `sync_mode` liefert das Bild direkt als Daten-URI zurück, statt als Adresse, die wir dann noch
 * einmal abholen müssten.
 */
async function pulidLauf(modell: string, prompt: string, werk: string, foto: string): Promise<KunstErgebnis> {
  const key = process.env.FAL_KEY?.trim();
  if (!key) return { ok: false, grund: "kein-schluessel" };
  try {
    /* Das Blatt ist hochkant oder quer — das Werk sagt, welches. Ohne diese Messung käme ein
       Bild im Vorgabeformat `landscape_4_3` zurück und das Poster schnitte es zurecht. */
    let groesse: { width: number; height: number } = { width: 832, height: 1216 };
    try {
      const sharp = (await import("sharp")).default;
      const { width = 0, height = 0 } = await sharp(Buffer.from(werk.split(",")[1] ?? "", "base64")).metadata();
      if (width && height) groesse = width > height ? { width: 1216, height: 832 } : { width: 832, height: 1216 };
    } catch { /* Vorgabe hochkant — das ist der Normalfall beim Porträt */ }

    const res = await fetch(`https://fal.run/${modell}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        reference_image_url: foto,
        image_size: groesse,
        num_inference_steps: 20,
        guidance_scale: 4,
        id_weight: Number(process.env.KUNST_ID_WEIGHT ?? "1") || 1,
        negative_prompt: "photographic skin, photo, text, signature, watermark, frame, extra limbs",
        sync_mode: true,
      }),
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

/**
 * ── DER IDENTITY LOCK, WÖRTLICH AUS DER GEBURTSTAGSKETTE ────────────────────────────────────
 *
 * Nicht neu formuliert, nicht „verbessert". Dieser Wortlaut ist am 08.08.2026 im Vergleich
 * gegen alles andere übrig geblieben, und jede Umformulierung wäre wieder ein Versuch.
 *
 * Was hier bewusst FEHLT und in der Geburtstagskette steht: Vorgaben zu Ausdruck, Blick und
 * Mund („look straight into the camera", „calm neutral expression"). Dort ist das Ziel ein
 * sprechendes Standbild; hier gibt das WERK die Haltung vor — ein Blick über die Schulter, ein
 * geöffneter Mund. Die Treue-Regel für den Mund bleibt trotzdem: keine erfundenen Zähne.
 */
const IDENTITY_LOCK =
  "IDENTITY LOCK: The uploaded person's face is the source of truth. Do not alter, " +
  "reinterpret, beautify, age, or replace the face. Only modify the requested clothing, " +
  "environment, objects and painting technique. " +
  "Edit the provided image. Keep the person's face, identity, facial features, " +
  "skin tone and overall likeness unchanged. Do not redesign or beautify the face. " +
  "They must remain clearly the same person from the reference photo. " +
  "A single portrait of that one person only - one single image, not a collage, not a split " +
  "image, no second person. Never invent or alter teeth. ";

/**
 * Das Foto ist das Blatt, das Werk sind Worte. Ein einziges Bild geht raus.
 */
async function treuLauf(modell: string, werkWorte: string, foto: string): Promise<KunstErgebnis> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, grund: "kein-schluessel" };
  const person = alsDatei(foto, "person.jpg");
  if (!person) return { ok: false, grund: "fehler" };
  const prompt = `${IDENTITY_LOCK}Repaint this person as a painting: ${werkWorte} No text, no letters, no signature, no frame, no watermark.`;
  try {
    const form = new FormData();
    form.append("model", modell);
    form.append("prompt", prompt);
    form.append("n", "1");
    /* EIN Bild. Das ist der ganze Unterschied zu `openaiLauf`. */
    form.append("image[]", person);
    /**
     * ── DER REGLER FÜR GESICHTSTREUE — ABER NUR BEI 1.x (18.09.2026) ──────────────────────────
     *
     * `gpt-image-2` KENNT `input_fidelity` NICHT und weist den Parameter ab; dort ist die Treue
     * fest eingebaut ([[geschenk-kette-openai-heygen]], bestätigt 18.09.). Bei `gpt-image-1.5`
     * gibt es ihn — und genau dort ist er der einzige echte Hebel, den OpenAI für „behalte die
     * Details des Eingangsbildes" anbietet. Deshalb hängt er am Modellnamen und nicht an einem
     * eigenen Schalter: Wer das Modell wechselt, bekommt automatisch das Richtige.
     */
    if (!/gpt-image-2/.test(modell)) form.append("input_fidelity", "high");
    /**
     * `quality` ging bisher gar nicht mit, also lief alles auf der Vorgabe. Ein Poster wird
     * GEDRUCKT — auf A2 sieht man, was ein mittleres Bild verschwiegen hat. Über
     * `KUNST_QUALITAET` verstellbar (`low` · `medium` · `high`), weil der Preis daran hängt:
     * bei 1024×1536 rund 0,5 ct gegen 4 ct gegen 16,5 ct.
     */
    form.append("quality", process.env.KUNST_QUALITAET?.trim() || "high");
    /**
     * ── ZUM PRÜFEN DAS KLEINSTE FORMAT (Owner 18.09.2026: „nimm die kleinste Auflösung bei
     * OpenAI zum Testen") ───────────────────────────────────────────────────────────────────
     *
     * Beim Prüfen wird EINE Frage beantwortet — ist sie das? — und dafür reicht das kleinste
     * Blatt. Ohne diese Angabe nimmt OpenAI `auto` und rechnet in voller Grösse; zusammen mit
     * `quality: high` kostet jeder Blick dann das Vierzigfache eines Blicks, der genauso viel
     * verrät.
     *
     * 1024×1024 IST DAS KLEINSTE, das die Bild-Schnittstelle kennt — darunter gibt es nichts.
     * Für das fertige Produkt gehört hier das Hochformat hin (1024×1536), weil ein Poster ein
     * A-Bogen ist; deshalb steht die Zahl in der Umgebung und nicht im Code.
     */
    form.append("size", process.env.KUNST_GROESSE?.trim() || "1024x1536");

    console.warn(`[kunst/treu] 1 Bild (Foto ${Math.round(person.size / 1024)} kB), Prompt ${prompt.length} Zeichen`);
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

/**
 * Zwei Bilder mit benannten Rollen — das Foto zuerst. Der Wortlaut folgt dem Prompt, mit dem der
 * Owner am 18.09.2026 in ChatGPT das Paarbild erzeugt hat, gekürzt auf das, was hier zählt.
 */
async function rollenLauf(modell: string, foto: string, werk: string): Promise<KunstErgebnis> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, grund: "kein-schluessel" };
  const person = alsDatei(foto, "a-person.jpg");
  const stil = alsDatei(werk, "b-werk.jpg");
  if (!person || !stil) return { ok: false, grund: "fehler" };

  const prompt = [
    "IMAGE A is the identity reference. IMAGE B is the style, mood and layout reference.",
    "Replace the subject in IMAGE B with a portrait of the person from IMAGE A, painted as if by the artist of IMAGE B.",
    "Preserve the person's recognizable facial features so they are clearly identifiable: eye shape and spacing, nose shape, mouth shape, smile character, face proportions, hair colour and overall likeness. Do not beautify, slim, age or rejuvenate the face, and never invent or alter teeth.",
    "Take everything else from IMAGE B and keep it unchanged: composition, framing, pose, hands, clothing, head covering, accessories, every object, the background, the light, the colour palette and the painting technique.",
    /* ── DIE FIGUR SITZT, WO SIE SASS (Owner 18.09.2026: „nur die Frau hat nicht die gleiche
       Position im Bild") ─────────────────────────────────────────────────────────────────────
       „Komposition übernehmen" liest ein Modell als „ähnlicher Aufbau", nicht als „derselbe
       Platz". Die Figur wanderte dadurch nach oben und wurde grösser — das Blatt sah aus wie ein
       anderer Bildausschnitt desselben Werks. */
    "Do not re-crop or re-frame: the head and the body must sit at exactly the same position and the same size within the frame as in IMAGE B, with the same margins on all four sides.",
    "One single portrait of that one person, not a collage, no second person.",
    "No text, no lettering, no signature, no frame, no watermark.",
  ].join(" ");

  try {
    const form = new FormData();
    form.append("model", modell);
    form.append("prompt", prompt);
    form.append("n", "1");
    /* DAS FOTO ZUERST — das ist der Kern dieses Motors. */
    form.append("image[]", person);
    form.append("image[]", stil);
    if (!/gpt-image-2/.test(modell)) form.append("input_fidelity", "high");
    form.append("quality", process.env.KUNST_QUALITAET?.trim() || "high");
    /**
     * ── DAS FORMAT FOLGT DEM WERK, NICHT EINER FESTEN ZAHL (18.09.2026) ──────────────────────
     *
     * Ein fest vorgegebenes 1024×1536 (1:1,5) zwingt das Modell, ein Werk mit anderem
     * Seitenverhältnis umzubauen — und beim Umbauen wandert die Figur. Die Bild-Schnittstelle
     * kennt genau drei Formate; genommen wird das, welches dem Werk am nächsten kommt. Dann ist
     * „nichts am Aufbau ändern" überhaupt erfüllbar.
     *
     * `KUNST_GROESSE` sticht weiterhin alles — zum Prüfen mit dem kleinsten Format.
     */
    let format = "1024x1536";
    try {
      const sharp = (await import("sharp")).default;
      const { width = 0, height = 0 } = await sharp(Buffer.from(werk.split(",")[1] ?? "", "base64")).metadata();
      if (width && height) {
        const v = width / height;
        /* Abstand zu den drei möglichen Verhältnissen: hoch 0,667 · quadratisch 1 · quer 1,5 */
        const kandidaten: [string, number][] = [["1024x1536", 2 / 3], ["1024x1024", 1], ["1536x1024", 3 / 2]];
        format = kandidaten.reduce((a, b) => Math.abs(b[1] - v) < Math.abs(a[1] - v) ? b : a)[0];
      }
    } catch { /* Vorgabe hochkant */ }
    form.append("size", process.env.KUNST_GROESSE?.trim() || format);

    console.warn(`[kunst/rollen] Format ${process.env.KUNST_GROESSE?.trim() || format}, A=Foto ${Math.round(person.size / 1024)} kB, B=Werk ${Math.round(stil.size / 1024)} kB, Prompt ${prompt.length} Zeichen`);
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
/* Dasselbe Modell auch fürs Freistellen (`lakatosbandi-freistellen.ts`) — es gibt EIN Sehen-
   Modell im Haus, und wer es wechselt, wechselt es für alles. */
export const SEHEN_MODELL_NAME = SEHEN_MODELL;

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
/**
 * ── DAS ZIEL ZUERST, DER REST NACH SEINEM URTEIL (Owner 18.09.2026: „er liest mein Ziel und
 * weiss sofort, was wichtig ist" · „ChatGPT baut sein eigenes Skript") ───────────────────────
 *
 * DER AUFTRAG DARÜBER IST EINE CHECKLISTE MIT ZWÖLF PUNKTEN, und sie ist für EINE Handschrift
 * geschrieben: Louisetts Kugelschreiber. Bei ihr ist sie richtig — diese Striche kennt kein
 * Modell, die muss man ihm beschreiben. Bei Vermeer fragt dieselbe Liste dieselben zwölf Punkte
 * ab und bekommt zweihundert Wörter über Lasuren zurück, die das Modell längst besser weiss.
 * Übrig bleibt für das Gesicht ein halber Satz — und das Gesicht ist das, was der Kunde kauft.
 *
 * DAS ZIEL STAND NIRGENDS. Kein Satz im ganzen Auftrag sagte, WOFÜR der Text gut sein soll.
 * Hier steht er jetzt als Erstes, und danach entscheidet das Modell selbst, was für DIESES Werk
 * zu sagen ist. Bekannter Stil: kurz. Unbekannte Handschrift: ausführlich. Genau die
 * Unterscheidung, die eine feste Liste nicht treffen kann.
 *
 * TESTWEISE, NICHT ERSETZT (Owner 18.09.2026: „baue es aber testweise"): `KUNST_ZIEL=1` in der
 * Umgebung schaltet um, ohne Schalter läuft die alte Fassung. Beide bleiben im Code stehen, bis
 * an echten Paaren entschieden ist, welche gewinnt — Louisett und ein Meisterwerk sind zwei
 * verschiedene Prüfungen, und eine davon allein beweist nichts.
 */
function auftragZiel(technik: string, notizen: string, staerke: KunstStaerke): string {
  return [
    /* Der Schutzsatz bleibt wörtlich: „Identität"/„identify" löst bei Vision-Modellen die Sperre
       gegen das Erkennen realer Personen aus (17.09.2026: „I can't assist with that"). */
    "You are an art director at a portrait studio. A customer has uploaded their own photo (IMAGE 2) and chosen an artwork (IMAGE 1). Do not identify anyone; only describe visual forms.",
    "THE GOAL, and everything you write serves it: the customer must recognise THEMSELVES in a picture that looks as if the artist of IMAGE 1 had painted them. Two things fail this goal equally — a stranger's face in a perfect style, and their face pasted into a photo filter.",
    "WHAT STAYS FROM IMAGE 1: everything except the face — composition, pose, hands, clothing, hair, objects, background, palette. WHAT COMES FROM IMAGE 2: only the face, and it must stay recognisable.",
    ...(notizen ? [`The artist's own notes on their method outrank your own reading of the image: "${notizen}"`] : []),
    ...(technik ? [`The artist states the technique of IMAGE 1 is: "${technik}". Trust this over your own guess.`] : []),
    "NOW JUDGE FOR YOURSELF how much description this particular artwork needs, and write only that.",
    "If IMAGE 1 is in a widely known manner that an image generator already renders well on its own, name that manner in a few words and spend the rest on what generators get WRONG about it.",
    "If IMAGE 1 is an individual hand a generator does not know (an unusual tool, an unusual mark, an unusual way of leaving areas empty), describe it precisely: the actual physical tool, the kind of marks, the palette and which tones dominate, how dense the marks are, which areas the artist leaves untouched, and how the eyes are treated. Judge figure and background separately if they use different media.",
    "Say nothing that is obvious or generic. Every sentence must change what the generator produces.",
    `Style strength: ${KUNST_STAERKE[staerke]}`,
    "Write ONE image-generation prompt in English, max 200 words, ending with a short list of textures that must NOT appear, chosen from what IMAGE 1 does not contain. Always forbid: photographic skin, text, lettering, signature, frame, watermark.",
    "Output only the prompt, no headings, no preamble.",
  ].join(" ");
}

export async function stilSehen(werk: string, foto: string, staerke: KunstStaerke, technik = "", notizen = ""): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const auftrag = process.env.KUNST_ZIEL?.trim() === "1" ? auftragZiel(technik, notizen, staerke) : [
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
  /**
   * ── DIE GESICHTSREGELN FUHREN NIE MIT (18.09.2026 gefunden, beim Vermeer-Vergleich) ─────────
   *
   * HIER STAND `gesehen ?? eigener`. Gelingt der Sehen-Schritt — und das ist der Normalfall —,
   * ERSETZT sein Text den ganzen Auftrag. Damit fielen `zuege` („Do NOT alter the facial
   * geometry") und `werkBleibt` („Kleidung, Pose, Umgebung bleiben") lautlos weg: Beide leben
   * nur in `eigener`, also im RÜCKFALL. Alle Regeln, die der Owner am 17.09. erkämpft hat,
   * erreichten den Generator nur dann, wenn vorher etwas schiefgegangen war.
   *
   * Übrig blieb, was gpt-4o geschrieben hatte: 220 Wörter über Werkzeug, Strichart, Tonstufen
   * und Negativlisten — und EIN Satz über das Gesicht. Das Modell folgt der Masse.
   *
   * JETZT REITET DIE SPERRE VORNE MIT, in beiden Fällen. Sie steht ZUERST, weil ein Bildmodell
   * den Anfang stärker gewichtet als das Ende, und sie ist kurz gehalten: Die Hausregel vom
   * 08.08. ([[geschenk-kette-openai-heygen]]) heisst „kurze, treue-zentrierte Prompts schlagen
   * Regie-Prosa" — und „Do not redesign or beautify the face" war damals der Satz, der traf.
   */
  const sperre = [
    "IDENTITY LOCK — this outranks every style instruction that follows.",
    "The face in the result must be the face of the person in IMAGE 2, recognisable to people who know them.",
    zuege,
    "Do not redesign, beautify, slim, age or rejuvenate the face. Do not replace it with the face already in IMAGE 1.",
  ].join(" ");
  const prompt = `${sperre}\n\n${gesehen ?? eigener}`;

  /**
   * ── DER PULID-WEG NIMMT EINEN ANDEREN AUFTRAG (18.09.2026) ──────────────────────────────────
   *
   * Der Prompt oben ist für Motoren geschrieben, die BEIDE Bilder sehen — er redet über „IMAGE 1"
   * und „IMAGE 2" und sagt, was aus welchem kommt. Bei PuLID gibt es nur ein Bild, und das ist
   * das Gesicht. Dieser Auftrag wäre dort Unsinn: Er verwiese auf ein Bild, das nie ankommt.
   *
   * Stattdessen wird das Werk beschrieben — und die Identität regelt der eigene Kanal, nicht der
   * Text. Scheitert die Beschreibung, gibt es nichts zu erzeugen: Ohne Werk in Worten entstünde
   * ein beliebiges Porträt, und ein beliebiges Porträt ist schlimmer als eine Fehlermeldung.
   */
  /* Kein Sehen-Schritt und keine Werkbeschreibung: Das Werk hängt als Bild B daneben. */
  if (art === "rollen") return rollenLauf(modell, foto, werk);
  if (art === "pulid" || art === "treu") {
    const worte = await werkInWorten(werk, technik, notizen);
    if (!worte) { console.warn("[kunst] ohne Werkbeschreibung — abgebrochen"); return { ok: false, grund: "fehler" }; }
    console.warn(`[kunst/${art}] ${worte}`);
    return art === "treu" ? treuLauf(modell, worte, foto) : pulidLauf(modell, worte, werk, foto);
  }
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

    /* Was wirklich rausgeht (Owner 18.09.2026: „gibst du die Referenzen überhaupt weiter?") —
       ohne diese Zeile ist die Frage nicht zu beantworten, mit ihr steht sie im Serverlog. */
    console.warn(`[kunst] ${modell}: 2 Bilder (Werk ${Math.round(stil.size / 1024)} kB, Foto ${Math.round(person.size / 1024)} kB), Prompt ${prompt.length} Zeichen`);
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const data = await res.json().catch(() => null) as
      { data?: { b64_json?: string; url?: string }[]; usage?: unknown; error?: { message?: string; code?: string } } | null;
    /* Die Abrechnung sagt, wie viele Bild-Token hereinkamen — ein Bild oder zwei. */
    if (data?.usage) console.warn(`[kunst] usage: ${JSON.stringify(data.usage)}`);

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

/**
 * ── DAS BLATTFORMAT (Owner 19.09.2026: „du hast das Format nicht an OpenAI gegeben" · „der macht
 * irgendein Scheiss Format von dir" · „ich habe das runtergeladen und es hat das Format 9:16 —
 * aber das brauche ich nicht") ────────────────────────────────────────────────────────────────
 *
 * ER HAT RECHT, UND ES LÄSST SICH NICHT MIT EINEM PARAMETER LÖSEN. Die Bild-Schnittstelle von
 * OpenAI kennt genau drei Masse: 1024×1024, 1024×1536 und 1536×1024 — also die Verhältnisse
 * 1,0 · 0,67 · 1,5. Das Bildfeld auf dem Blatt hat
 *
 *     (100 − 2 · rand) / (bild.hoch · √2) = 87 / 107,48 = 0,81
 *
 * und 0,81 ist keine davon. Welches Mass man auch bestellt, es passt nicht — das ist keine
 * vergessene Angabe, sondern eine Grenze des Anbieters.
 *
 * ALSO WIRD NACH DER ERZEUGUNG ZUGESCHNITTEN, und zwar EINMAL, an der Quelle: Was hier
 * herauskommt, ist das, was auf dem Schirm steht, was in der Druckdatei landet und was er
 * herunterlädt. Drei Stellen mit drei Ausschnitten wären drei verschiedene Poster.
 *
 * GESCHNITTEN WIRD UNTEN (Hausregel, Owner 19.09.2026: „Bilder oben nicht abschneiden"). Bei
 * einem Porträt sitzt der Kopf oben; ein mittiger Schnitt nimmt oben und unten gleich viel und
 * köpft die Person. Deshalb bleibt die Oberkante stehen und die Höhe fällt nach unten weg.
 *
 * IST DAS BILD BREITER als das Feld, wird seitlich geschnitten — dort ist die Mitte richtig.
 *
 * JPEG, NICHT PNG: Die Ablage schreibt ohnehin `Content-Type: image/jpeg`, und die Druckdatei
 * bettet mit `embedJpg` ein. PNG-Bytes unter einem JPEG-Etikett sind eine Wanze, die erst beim
 * Drucken auffällt.
 */
export async function aufBlattformat(datenUrl: string): Promise<string> {
  const treffer = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(datenUrl).trim());
  if (!treffer) return datenUrl;
  try {
    const { default: sharp } = await import("sharp");
    const { POSTER, POSTER_VERHAELTNIS } = await import("@/lib/lakatosbandi-poster");
    const ziel = (100 - 2 * POSTER.rand) / (POSTER.bild.hoch * POSTER_VERHAELTNIS);

    const roh = Buffer.from(treffer[2], "base64");
    const bild = sharp(roh, { failOn: "none" });
    const { width: b = 0, height: h = 0 } = await bild.metadata();
    if (!b || !h) return datenUrl;

    const ist = b / h;
    /* Schon nah genug: ein Schnitt von unter einem Prozent bringt nichts und kostet Schärfe. */
    let raus = bild;
    if (Math.abs(ist - ziel) > 0.01) {
      raus = ist < ziel
        /* Zu hoch — die Höhe fällt nach UNTEN weg, die Oberkante bleibt. */
        ? bild.extract({ left: 0, top: 0, width: b, height: Math.round(b / ziel) })
        /* Zu breit — seitlich mittig. */
        : bild.extract({ left: Math.round((b - h * ziel) / 2), top: 0, width: Math.round(h * ziel), height: h });
    }
    const fertig = await raus.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${fertig.toString("base64")}`;
  } catch (e) {
    /* Ein bezahlter Lauf darf nie an der Zuschneiderei sterben — dann eben im Rohformat. */
    console.warn("[kunst] Blattformat nicht geschnitten:", e);
    return datenUrl;
  }
}
