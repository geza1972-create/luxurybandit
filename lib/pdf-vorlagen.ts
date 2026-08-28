/**
 * DIE VORLAGEN DER PDF-BEWERBUNG — DIE LISTE, NICHT DAS ZEICHNEN.
 *
 * Owner 28.08.2026: „hier müssen wir eine galerie von templates zeigen und user sucht sich
 * eins aus … farbvollflächen lieben die Leute" · „sowas" · „und sowas" · „Beide in blau,
 * dunkelgrau, und in unseren farben. mit gelbe elemente auf dunkel und blau mit weissen" ·
 * „ähmm das helle finde ich gut noch von dir" · „grün, rot nicht" · „unser blau ja" ·
 * „sowas noch, aber das passt eher als zweiseiter, weil das ein deckblatt ist".
 *
 * WARUM DAS EINE EIGENE DATEI IST UND NICHT IN lib/bewerbung-pdf.ts STEHT:
 * Die Galerie ist ein Browser-Baustein („use client"). Importierte sie die Liste aus
 * `lib/bewerbung-pdf.ts`, zöge sie pdf-lib mit in das Bündel, das jedes Handy herunterlädt —
 * eine halbe Megabyte Zeichenbibliothek, damit fünf Wörter in einer Kachel stehen. Hier
 * stehen deshalb nur Kennung, Name und Farben ALS TEXT; `bewerbung-pdf.ts` macht daraus
 * seine `rgb()`-Werte, und der Browser lädt nichts davon.
 *
 * DIE FARBEN SIND UNSERE (Owner ausdrücklich): Gold #f6cf51 und Blau #1877F2 wie im Web,
 * Anthrazit als der dunkle Grund, auf dem das Gold im Haus immer steht. Bordeaux und
 * Salbei, die eine Stunde lang hier standen, sind auf sein Wort hin wieder raus.
 */

const GOLD = "#f6cf51";
const BLAU = "#1877F2";
const ANTHRAZIT = "#212328";
const PAPIER = "#f4f5f7";
const HELLGRAU = "#eceef1";
/* KEINE GROSSE FLÄCHE IN #1877F2 (Owner 28.08.2026, zweimal: „unser Blau finde ich gar nicht
   gut" · „diese blaue farbe ist no go"). Unser Blau bleibt — aber als Linie und als Schrift,
   nie als Fläche. Grosse Flächen tragen Anthrazit oder das gedeckte Stahlgrau. */
const TINTE_HEX = "#1c1e23";
const STAHL = "#4a545f";
const WEISS = "#ffffff";

export type PdfVorlage = {
  id: string;
  /** Wie sie in der Auswahl heisst — kurz, in jeder Sprache gleich. */
  name: string;
  /**
   * ZWEI AUFBAUTEN (zwei Referenzen des Owners) —
   *   `kreis`: farbige Spalte mit diagonalem Anschnitt, rundes Foto im Ring
   *   `linie`: Foto randlos über die volle Spaltenbreite, gesperrte Versalien,
   *            Werdegang an einem Zeitstrahl mit Punkten
   *   `banner`: dunkles Kopfband über die volle Breite mit rundem Foto und Serifen-Namen,
   *            darunter helle Spalte links, Weiss rechts
   *   `editorial`: gar keine Farbfläche — Schwarzweiss, kleines Foto oben, der Name als
   *            grosse Kursiv-Serife, Haarlinien statt Balken (vierte Referenz)
   */
  layout: "kreis" | "linie" | "editorial" | "banner";
  /** Helle Spalte (Klassik) — dann steht dunkle Schrift darin statt heller. */
  hell: boolean;
  /** Die Farbe auf der WEISSEN Seite: Balken, Firmenzeile, Zeitstrahl. */
  akzent: string;
  /** Die Vollfläche der linken Spalte. */
  spalte: string;
  /**
   * DIE FARBE DER ÜBERSCHRIFTEN IN DER SPALTE — und der Grund, warum das ein eigenes Feld
   * ist: Auf Anthrazit ist unser Gold die Hausfarbe („mit gelbe elemente auf dunkel"). Auf
   * Weiss wäre dasselbe Gold unlesbar. Die Spalte bekommt deshalb ihren eigenen Akzent,
   * `akzent` bleibt der für die helle Seite.
   */
  spalteAkzent: string;
  /* KEIN DECKBLATT MEHR (Owner 28.08.2026, nach einem Blick auf die beiden fertigen
     Titelblatt-Kacheln: „die raus. Kein Titelblatt").
     Er hatte sie eine halbe Stunde vorher noch bevorzugt („wobei ich immer die mit titelblatt
     besser finde") — gesehen hat er dann ein ganzseitiges Foto mit Text daneben, und das ist
     eine Anzeige, keine Bewerbung. Die Zeichenroutine dafür ist mit entfernt; sie steht in
     der Geschichte, falls sie je zurückkommt. */
  /**
   * EINE DÜNNE LINIE AN DER KANTE DER SPALTE (Owner 28.08.2026: „und unser Blau finde ich
   * gar nicht gut eher grau hell und eine dünne blaue linien am rand zu weiss").
   *
   * Er hat recht behalten, und es ist der Unterschied zwischen Bewerbung und Werbeflyer:
   * #1877F2 ist eine BILDSCHIRM-Farbe. Als Vollfläche über ein ganzes A4-Blatt gelegt
   * schreit sie — auf Papier noch mehr als am Schirm. Als haarfeine Kante zwischen grauer
   * Spalte und weissem Satzspiegel ist dieselbe Farbe genau richtig: Man sieht, dass da eine
   * Absicht war, ohne dass die Farbe das Lesen übernimmt.
   */
  randlinie?: string;
};

export const PDF_VORLAGEN: PdfVorlage[] = [
  /* EINE HELLE, NICHT ZWEI: „Klassik" (blasses Papier) und „Blau" (helles Grau mit blauer
     Kante) waren nach der Farbkorrektur vom 28.08.2026 dasselbe Blatt mit einem Haar
     Unterschied — zwei Kacheln, zwischen denen niemand wählen kann, sind keine Auswahl,
     sondern eine Stockung. Geblieben ist die Fassung, die der Owner beschrieben hat. */
  { id: "klassik",        name: "Klassik",        layout: "kreis", hell: true,  akzent: BLAU,      spalte: HELLGRAU,  spalteAkzent: BLAU,  randlinie: BLAU },
  { id: "gold",           name: "Gold",           layout: "kreis", hell: false, akzent: ANTHRAZIT, spalte: ANTHRAZIT, spalteAkzent: GOLD },
  /* „LINIE" (die helle Fassung mit blauer Kante) IST RAUS (Owner 28.08.2026: „das raus").
     Die Zeitstrahl-Anordnung bleibt — sie steht weiter als „Linie Gold" auf Anthrazit. */
  { id: "linie-gold",     name: "Linie Gold",     layout: "linie", hell: false, akzent: ANTHRAZIT, spalte: ANTHRAZIT, spalteAkzent: GOLD },
  /* NÜCHTERN, GANZ OHNE FARBE (Owner 28.08.2026, vierte Referenz „sowas" — dazu passend sein
     Satz zur zweiten Seite: „weiss und nüchtern in schwarz weiss"). Die einzige Vorlage ohne
     jede Farbfläche; sie lebt von Haarlinien, gesperrten Versalien und einer Kursiv-Serife.
     Für konservative Branchen — und für alle, denen jede der anderen fünf zu laut ist. */
  { id: "editorial",      name: "Editorial",      layout: "editorial", hell: true, akzent: TINTE_HEX, spalte: WEISS,    spalteAkzent: TINTE_HEX },
  /* DAS KOPFBAND (Owner 28.08.2026, fünfte Referenz „sowas"): Die einzige Vorlage, bei der
     die Farbe OBEN steht statt links. `spalte` ist deshalb hier die helle Spalte unter dem
     Band, `akzent` die Farbe des Bandes UND der Überschriften. Ein gedecktes Blaugrau —
     Farbe, aber keine, die sich in den Vordergrund drängt. */
  /* DAS KOPFBAND (Owner 28.08.2026, fünfte und sechste Referenz — zuletzt: „sowas in unser
     farben"): die einzige Vorlage, bei der die Farbe OBEN steht und nicht nur links. Das
     Foto sitzt IM Band, links; daneben der Name gross auf der Farbfläche. Darunter läuft die
     Spalte in derselben Farbe weiter.
     `spalte` ist hier die Farbe von Band UND Spalte, `spalteAkzent` die der Überschriften
     darin — in unseren Farben also Anthrazit mit Gold. */
  { id: "kopfband",       name: "Kopfband",       layout: "banner",    hell: false, akzent: ANTHRAZIT, spalte: ANTHRAZIT, spalteAkzent: GOLD },
];

/**
 * DIE FASSUNG DER VORSCHAUBILDER — HOCHZÄHLEN, WENN NEU GERENDERT WIRD.
 *
 * Owner 28.08.2026: „die bilder hast du noch nicht ersetzt von Cora in den templates" — sie
 * WAREN ersetzt, auf der Platte stand längst Cora. Sein Browser zeigte die alten, weil die
 * Dateinamen dieselben geblieben waren.
 *
 * Das ist kein Schönheitsfehler: Vercel liefert alles unter /public mit langer Cache-Zeit
 * aus. Ohne diese Zahl sähe nach einem Deploy JEDER Besucher, der die Seite schon einmal
 * offen hatte, wochenlang die alten Vorlagen — und wir würden es nie erfahren, weil bei uns
 * ja alles stimmt.
 *
 * Also: Wer `public/Lebenslauf/vorlage-*.jpg` neu rendert, zählt hier eine hoch. Eine Zahl,
 * eine Zeile, und der Browser hat keine Wahl mehr.
 */
export const VORLAGEN_BILD_FASSUNG = 3;

/** Die Adresse des Vorschaubildes einer Vorlage — immer mit Fassung, nie ohne. */
export const vorlagenBild = (id: string) => `/Lebenslauf/vorlage-${id}.jpg?v=${VORLAGEN_BILD_FASSUNG}`;

/** Unbekanntes fällt auf die erste zurück — eine geratene Kennung darf kein PDF verhindern. */
export const vorlageFinden = (id?: string): PdfVorlage =>
  PDF_VORLAGEN.find(v => v.id === id) ?? PDF_VORLAGEN[0];
