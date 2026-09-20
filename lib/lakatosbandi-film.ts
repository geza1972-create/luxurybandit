/**
 * WO EIN FILM ZU EINEM WERK LIEGT (Owner 15.09.2026: „wir nehmen die videos statt bilder" ·
 * „der qr code führt nur zu einem video full seite").
 *
 * Eigener Ordner neben `versusforge-motiv`, nicht darin: Ein Bild und ein Film zum selben Werk
 * tragen dieselbe Nummer, und zwei Dateien mit gleichem Namen in einem Ordner sind die Art
 * Ordnung, an der man in drei Monaten scheitert.
 *
 * KEINE SIGNIERTE ADRESSE: Ausgeliefert wird über `api/portal-film`. Signierte Supabase-Links
 * laufen ab — ein QR-Code auf einem gedruckten Poster nicht.
 */
export const filmPfad = (mandant: string, nr: string) =>
  `versusforge-film/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${nr === "" || nr === "-1" ? "standard" : String(nr).replace(/[^a-zA-Z0-9_-]/g, "")}.mp4`;

/**
 * ── SEIN STANDBILD KOMMT AUS DEM FILM, NICHT VOM WERK (Owner 20.09.2026: „Poster für Video muss
 * aus dem Video kommen") ──────────────────────────────────────────────────────────────────────
 *
 * Die eigene Film-Folie (`components/PosterRaeume.tsx`) zeigte zuerst das Werk selbst als
 * Standbild, bevor der Film lief — bei Gerrys Aufnahme also die Karte „Gina", nicht ihn mit dem
 * Telefon vor seinem Poster. Wer einen Film ansieht, soll VOM FILM einen Vorgeschmack sehen,
 * nicht von etwas Verwandtem daneben.
 *
 * Eigener Ordner, eigene Datei: derselbe Name wie der Film, `.jpg` statt `.mp4` — ein Blick in
 * die Ablage sagt sofort, zu welchem Film das Bild gehört.
 */
export const filmPosterPfad = (mandant: string, nr: string) =>
  `versusforge-film/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${nr === "" || nr === "-1" ? "standard" : String(nr).replace(/[^a-zA-Z0-9_-]/g, "")}-poster.jpg`;

/**
 * ── DER FILM „AN DIE WAND" (Owner 20.09.2026: „ich gebe dir noch ein Video, zu zeigen wie jemand
 * das Poster an die Wand hängt" · mit Bild des Sliders: „das baust du auch hier ein") ─────────
 *
 * Ein ZWEITER Film je Werk, neben der Geschichte: auspacken, tragen, aufhängen, ansehen. Er
 * zeigt genau DIESES Blatt — deshalb hängt er am Werk und nicht am Haus; unter einem anderen
 * Poster wäre er falsch. Eigene Dateien im selben Ordner wie der Film: `<nr>-wand.mp4` und sein
 * Standbild `<nr>-wand.jpg` (aus dem Film geschnitten, wie beim ersten). Die Musik ist in die
 * Datei eingemischt — in dem Film spricht niemand.
 */
const werkNr = (nr: string) => (nr === "" || nr === "-1" ? "standard" : String(nr).replace(/[^a-zA-Z0-9_-]/g, ""));
export const wandFilmPfad = (mandant: string, nr: string) =>
  `versusforge-film/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${werkNr(nr)}-wand.mp4`;
export const wandFilmPosterPfad = (mandant: string, nr: string) =>
  `versusforge-film/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${werkNr(nr)}-wand.jpg`;

/**
 * ── DER KÜNSTLER SPRICHT ÜBER SEIN WERK (Owner 17.09.2026: „mach doch einen Kasten neben
 * diesem Bild fürs Video … ich lasse sie in HeyGen sprechen") ────────────────────────────────
 *
 * Ein ZWEITER Film je Werk, neben dem stillen Zoom: nicht das Bild, das sich bewegt, sondern
 * der Mensch, der es gemalt hat. Das ist der Teil, den kein Druckshop kopieren kann — und der
 * Grund, warum das Blatt „Living Poster" heisst und nicht „Poster mit QR-Code".
 *
 * EIGENER PFAD, NICHT DERSELBE ORDNER: Der Zoom bleibt der Zoom. Wer beide in eine Datei
 * legt, kann später nur noch eines von beidem zeigen.
 */
export const sprecherPfad = (mandant: string, nr: string) =>
  `versusforge-sprecher/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${nr === "" || nr === "-1" ? "standard" : String(nr).replace(/[^a-zA-Z0-9_-]/g, "")}.mp4`;

/**
 * DAS STANDBILD DES SPRECHER-FILMS (Owner 17.09.2026: „bitte das Poster von dem Video laden mit
 * Playbutton. Sonst sieht man nichts auf dem Handy" · „das Poster, nicht das Bild laden").
 *
 * Das erste Bild AUS SEINEM FILM, nicht das Gemälde: Es zeigt schon den Menschen und das Blatt
 * an der Wand, es hat dieselbe Form wie der Film, und es springt beim Start nicht um. Ein
 * Handy-Browser zeigt ohne Berührung keinen Film — bis dahin steht dieses Bild dort.
 */
export const sprecherBildPfad = (mandant: string, nr: string) =>
  `versusforge-sprecher/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${nr === "" || nr === "-1" ? "standard" : String(nr).replace(/[^a-zA-Z0-9_-]/g, "")}.jpg`;

/**
 * ── SEINE STIMME ZUM WERK (Owner 17.09.2026: „können wir darauf verzichten, HeyGen zu nehmen …
 * mach mir im Admin ein Aufnahme-Tool, um den Text vorzulesen") ─────────────────────────────
 *
 * Der billigste und ehrlichste Weg zu einem Living Poster: kein gerendertes Video, keine
 * Maschinenstimme, keine Abogebühr bei einem Dritten. Der Künstler drückt im Dashboard auf
 * Aufnahme, liest seinen Brief vor, und das war es. Hinter dem Code steht dann sein Bild und
 * läuft seine Stimme.
 *
 * WARUM TON UND NICHT VIDEO: Ein Video muss gedreht, geschnitten und gerendert werden — das
 * macht kein Maler zwölfmal. Eine Sprachnachricht macht er an einem Abend für zehn Werke. Und
 * sie ist zehnmal kleiner, was über Mobilfunk der Unterschied zwischen „läuft" und „lädt" ist.
 */
/**
 * ── UND DASSELBE ALS VIDEO (Owner 17.09.2026: „wir können gleich noch ein Tool dazu machen,
 * Video neben der Stimme. Wenn jemand Video aufnimmt, dann wird das Video gepostet") ────────
 *
 * Der Browser nimmt auf, was er kann: Chrome und Firefox liefern `webm`, Safari `mp4`. Beide
 * landen im selben Ordner wie ein gerenderter Film (`sprecherPfad`) — der Player fragt nicht,
 * WIE der Film entstanden ist, sondern nur, ob es einen gibt.
 */
export const sprecherWebmPfad = (mandant: string, nr: string) =>
  `versusforge-sprecher/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${nr === "" || nr === "-1" ? "standard" : String(nr).replace(/[^a-zA-Z0-9_-]/g, "")}.webm`;

export const sprecherTonPfad = (mandant: string, nr: string) =>
  `versusforge-stimme/${String(mandant).replace(/[^a-zA-Z0-9_-]/g, "")}/${nr === "" || nr === "-1" ? "standard" : String(nr).replace(/[^a-zA-Z0-9_-]/g, "")}.webm`;

/**
 * ── DIE ADRESSE IM QR-CODE (Owner 16.09.2026: „die seite soll nicht mehr existieren wozu?" → C)
 *
 * Sie führte auf eine eigene Seite, die nichts konnte ausser den Film zeigen: kein Kauf, keine
 * anderen Werke, nach dem Schliessen eine schwarze Fläche. Jetzt führt der Code dorthin, wo
 * ohnehin alles steht — auf die Seite des Künstlers —, und der Film öffnet sich dort von selbst
 * (`?film=<nr>`). Eine Seite weniger, und der Scan landet da, wo man auch kaufen kann.
 */
/**
 * ── EIN FENSTER FÜR ALLE POSTER EINES KÜNSTLERS (Owner 17.09.2026: „ein Fenster für alle
 * Poster meine ich") ────────────────────────────────────────────────────────────────────────
 *
 * Bei den gemeinfreien Meistern trägt jedes Werk seine eigene Geschichte — dort führt der Code
 * je Blatt woandershin. Ein lebender Künstler dagegen nimmt EINMAL auf, wie er malt, und das
 * gilt für jedes seiner Blätter: Living Poster wie erzeugtes Porträt. Alles andere hiesse, dass
 * er zwölf Filme drehen muss, bevor er das erste Poster verkauft.
 */
export const stilSeite = (mandant: string) =>
  `https://lakatosbandi.com/stil?m=${encodeURIComponent(mandant)}`;

export const filmSeite = (mandant: string, nr: number | string) =>
  `https://lakatosbandi.com/${mandant}?film=${nr === -1 || nr === "-1" ? "standard" : nr}`;
