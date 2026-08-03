/**
 * HERZCHEN UND ZURUFE — die Ebene, die aus einem Foto einen Moment macht.
 *
 * Owner 31.07.2026: „die Herzchen fehlen und wow…" — und gleich danach: „auch im Original
 * Herzchen und wow."
 *
 * Beides zusammen sagt, wofür sie da sind: Auf dem BEISPIEL verkaufen sie (so fühlt es sich
 * an, wenn du das verschickst), auf dem EIGENEN Bild belohnen sie. Ein Standbild allein ist
 * ein Foto; mit aufsteigenden Herzen und Zurufen ist es ein Moment, den jemand geteilt hat.
 *
 * WARUM EIN EIGENER BAUSTEIN und keine Kopie: Die Ebene liegt jetzt an drei Stellen — auf dem
 * Beispielvideo in der Karte, auf dem eigenen Ergebnis und auf den Karten der Galerie.
 * Dreimal dieselbe Animation im Code läuft nach der ersten Änderung auseinander.
 *
 * `pointer-events-none` ist keine Feinheit, sondern die Bedingung: Ohne sie schluckt die
 * Ebene den Tipp auf das Video (= Upload öffnen) und den Ton-Knopf darüber. Sie liegt auf dem
 * Bild, aber sie fängt nichts ab.
 *
 * Die Bewegung selbst steht in `globals.css` (`.lb-heart`, `.lb-bubble`) — hier stehen nur
 * Anzahl, Startpunkte und Zeitversatz. Alles rechnet sich aus dem Index, damit es ohne
 * Zufallszahlen auskommt: Der Server rendert dieselbe Anordnung wie der Browser, sonst
 * springt beim ersten Zeichnen alles einmal um.
 */

/**
 * DIE ZURUFE SPRECHEN JETZT SEINE SPRACHE (Owner 03.08.2026: „auf der Karte wo die Herzchen
 * fliegen sollte auch I love you hoch fliegen" / „die Texte sollen auch rein: für immer
 * zusammen, unsere Beziehung ist unzerbrechlich").
 *
 * Vorher stand hier EINE Liste fuer alle sieben Sprachen — englisch-deutsch gemischt. Solange
 * es „wow" und „😍" waren, fiel das nicht auf. „Für immer zusammen" faellt auf: Der Kuss ist
 * ein Gruss an EINEN bestimmten Menschen, und ein Liebessatz in der falschen Sprache ist
 * keiner mehr.
 *
 * WARUM DIE REIHENFOLGE SO IST: Die Liebessaetze stehen vorn und kommen damit zuerst hoch.
 * „wow 🔥" und „so hot" sind Zurufe von Fremden — sie verkaufen auf dem Beispiel, aber die
 * erste Zeile soll die sein, die der Empfaenger auch wirklich meint.
 */
/**
 * DIE LIEBESSAETZE — sie duerfen einen NAMEN tragen (Owner 03.08.2026: „dann erscheint in den
 * Texten Anna, I love you, I miss you so much … also es ist personalisiert dann").
 *
 * WARUM SIE IN MITTELSATZ-FORM GESPEICHERT SIND („ich liebe dich", nicht „Ich liebe dich"):
 * Mit Namen entsteht daraus „Anna, ich liebe dich" — richtig. Ohne Namen wird der erste
 * Buchstabe grossgeschrieben, und das ist eine Umwandlung, die IMMER stimmt. Andersherum ginge
 * es nicht: Aus „I love you" ein kleines „i" zu machen waere im Englischen falsch, und genau
 * daran waere die Regel in einer der sieben Sprachen zerbrochen.
 */
const KUSS_LIEBE: Record<string, string[]> = {
  en: ["I love you ❤️", "I miss you so much", "together forever", "our love is unbreakable"],
  de: ["ich liebe dich ❤️", "ich vermisse dich so sehr", "für immer zusammen", "unsere Beziehung ist unzerbrechlich"],
  ro: ["te iubesc ❤️", "mi-e atât de dor de tine", "împreună pentru totdeauna", "iubirea noastră e de neclintit"],
  es: ["te quiero ❤️", "te echo tanto de menos", "juntos para siempre", "lo nuestro es irrompible"],
  fr: ["je t'aime ❤️", "tu me manques tellement", "ensemble pour toujours", "notre amour est incassable"],
  pt: ["amo-te ❤️", "tenho tantas saudades tuas", "juntos para sempre", "o nosso amor é inquebrável"],
  it: ["ti amo ❤️", "mi manchi tantissimo", "insieme per sempre", "il nostro amore è indistruttibile"],
};

/** Zurufe von aussen — die bekommen NIE einen Namen: „Anna, wow 🔥" ist kein Liebesgruss. */
const KUSS_JUBEL = ["wow 🔥", "😍", "💋", "so hot"];

/**
 * DER TANZ SAGT ETWAS ANDERES ALS DER KUSS (03.08.2026).
 *
 * Die Kuss-Zeilen liefen hier ungeprueft mit — auf dem Tanzvideo stand „Chris, unsere Liebe
 * ist unzerbrechlich". Das ist nicht falsch uebersetzt, es ist die falsche Karte: Der Kuss ist
 * eine Liebeserklaerung, der Tanz eine Ueberraschung. „Das ist fuer dich" trifft, was sie
 * verschickt; „fuer immer zusammen" traegt eine Ernsthaftigkeit hinein, die niemand bestellt
 * hat — und auf einem Video, das ein Geschenk sein soll, klingt sie schnell nach zu viel.
 *
 * Mittelsatz-Form wie oben, aus demselben Grund: Mit Namen wird „Chris, das ist fuer dich",
 * ohne Namen wird der erste Buchstabe grossgeschrieben.
 */
const TANZ_LIEBE: Record<string, string[]> = {
  en: ["this one is for you", "surprise 💃", "thinking of you", "only for your eyes"],
  de: ["das ist für dich", "Überraschung 💃", "ich denk an dich", "nur für deine Augen"],
  ro: ["asta e pentru tine", "surpriză 💃", "mă gândesc la tine", "doar pentru ochii tăi"],
  es: ["esto es para ti", "sorpresa 💃", "estoy pensando en ti", "solo para tus ojos"],
  fr: ["c'est pour toi", "surprise 💃", "je pense à toi", "rien que pour tes yeux"],
  pt: ["isto é para ti", "surpresa 💃", "estou a pensar em ti", "só para os teus olhos"],
  it: ["questo è per te", "sorpresa 💃", "sto pensando a te", "solo per i tuoi occhi"],
};

/** Zurufe beim Tanz — ohne Kuss-Lippen, sonst bewirbt das Tanzvideo den Kuss. */
const TANZ_JUBEL = ["wow 🔥", "😍", "💃", "so hot"];

const HOCHZEIT_ZURUFE: Record<string, string[]> = {
  en: ["😍", "❤️", "so beautiful", "💍", "wow", "perfect", "🥂", "💐"],
  de: ["😍", "❤️", "so schön", "💍", "wow", "perfect", "🥂", "💐"],
  ro: ["😍", "❤️", "ce frumos", "💍", "wow", "perfect", "🥂", "💐"],
  es: ["😍", "❤️", "qué bonito", "💍", "wow", "perfecto", "🥂", "💐"],
  fr: ["😍", "❤️", "trop beau", "💍", "wow", "parfait", "🥂", "💐"],
  pt: ["😍", "❤️", "que lindo", "💍", "wow", "perfeito", "🥂", "💐"],
  it: ["😍", "❤️", "che bello", "💍", "wow", "perfetto", "🥂", "💐"],
};

/** „anna" → „Anna". Nur der erste Buchstabe, der Rest bleibt wie getippt (McKenna, d'Angelo). */
/**
 * WIE LANGE EINE ZEILE VON UNTEN NACH OBEN BRAUCHT — fuer ALLE gleich (Owner 03.08.2026:
 * „die Texte und Herzchen ueberlappen sich haesslich unten und oben, sie muessen
 * nacheinander erscheinen").
 *
 * Die Startzeiten waren schon gleichmaessig verteilt — die LAUFZEITEN aber nicht (5 / 5,6 /
 * 6,2 s). Bei einer endlosen Animation heisst das: Nach der ersten Runde driften die Zeilen
 * auseinander, holen sich ein und stehen uebereinander. Genau das war auf der Karte zu sehen
 * („our love is un-so hot-ble").
 *
 * EIN Takt fuer alle plus `i * Takt / Anzahl` als Versatz heisst: Zeile i ist IMMER um
 * denselben Bruchteil voraus. Der Abstand bleibt derselbe, egal wie lange die Karte laeuft.
 */
const BLASEN_TAKT = 6;

const grossErster = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export default function Reaktionen({ variant = "kiss", lang = "en", name = "" }: { variant?: string; lang?: string; name?: string }) {
  // Nur die zwei Buchstaben — die Sprache kommt mancherorts als „de-DE" an.
  const l = String(lang ?? "en").slice(0, 2);
  /**
   * Der Name wird gekuerzt und von Zeilenumbruechen befreit, bevor er auf dem Bild landet:
   * Die Blase hat `white-space: nowrap`, ein langer Name schoebe sie aus der Karte heraus.
   */
  const wen = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 18);
  const zurufe = variant === "wedding"
    ? (HOCHZEIT_ZURUFE[l] ?? HOCHZEIT_ZURUFE.en)
    : (() => {
      // Welche Saetze aufsteigen, haengt am Thema — die Mechanik darunter bleibt dieselbe.
      const tanz = variant === "poledance";
      const quelle = tanz ? (TANZ_LIEBE[l] ?? TANZ_LIEBE.en) : (KUSS_LIEBE[l] ?? KUSS_LIEBE.en);
      const jubel = tanz ? TANZ_JUBEL : KUSS_JUBEL;
      const liebe = quelle.map(t => (wen ? `${wen}, ${t}` : grossErster(t)));
      // Abwechselnd Liebe und Jubel, damit nicht vier Namenszeilen hintereinander aufsteigen.
      const gemischt: string[] = [];
      for (let i = 0; i < Math.max(liebe.length, jubel.length); i++) {
        if (liebe[i]) gemischt.push(liebe[i]);
        if (jubel[i]) gemischt.push(jubel[i]);
      }
      return gemischt;
    })();
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {[...Array(14)].map((_, i) => (
        <span key={`h${i}`} className="lb-heart"
          style={{
            left: `${6 + (i * 6.7) % 88}%`,
            animationDelay: `${(i * 0.31) % 4.2}s`,
            animationDuration: `${3.6 + (i % 5) * 0.35}s`,
            fontSize: `${14 + (i % 4) * 5}px`,
            ["--lb-drift" as string]: `${(i % 2 ? 1 : -1) * (8 + (i % 3) * 10)}px`,
          }}>
          {i % 3 === 0 ? "💖" : i % 3 === 1 ? "❤️" : "💗"}
        </span>
      ))}
      {/* Zurufe als Sprechblasen — ohne Namen, siehe .lb-bubble in globals.css */}
      {zurufe.map((t, i) => (
        /* KEIN eigenes `left` mehr — die Blase haengt mittig (globals.css) und weicht nur
           noch seitlich aus (`--lb-drift`). Der Zeitversatz ist GLEICHMAESSIG ueber die
           Laufzeit verteilt statt per Modulo gewuerfelt: Vorher lagen zwei Zeilen manchmal
           auf derselben Sekunde und damit uebereinander. */
        <span key={`b${i}`} className="lb-bubble"
          style={{
            animationDelay: `${(i * BLASEN_TAKT) / Math.max(zurufe.length, 1)}s`,
            animationDuration: `${BLASEN_TAKT}s`,
            ["--lb-drift" as string]: `${(i % 2 ? 1 : -1) * (10 + (i % 3) * 8)}px`,
          }}>
          {t}
        </span>
      ))}
    </div>
  );
}
