import type { Lang } from "@/lib/lang";

/**
 * DIE ANWEISUNG AM FOTOAUTOMATEN (Owner 05.08.2026).
 *
 * „Wir müssen immer ein Preview machen, wie das Bild aussehen muss. Es ist wie beim Fotoautomat
 * für Passbilder. Wenn du deine Hand davorhältst, dann bist du selber schuld. Man muss die
 * Anweisung schreiben und auch visuell zeigen."
 *
 * DAS IST DIE ANTWORT AUF EINE FRAGE, DIE HEUTE ZWEIMAL AUFKAM: Was passiert, wenn jemand ein
 * unbrauchbares Foto hochlädt und danach das Ergebnis reklamiert? Der Owner hat ein Foto-Tor
 * ausdrücklich abgelehnt („nein, sie werden nicht abgewiesen") — kein Upload wird zurückgewiesen,
 * jeder darf zahlen. Stattdessen steht die Anweisung VOR dem Upload, geschrieben UND als Bild.
 *
 * Damit verschiebt sich nichts an der Technik, aber alles an der Verantwortung: Wer die
 * Anweisung gesehen hat, kann sich hinterher nicht auf Unwissen berufen. Genau so steht es auch
 * im AGB („Your photo decides the result").
 *
 * ECHTE GESICHTER, KEINE ZEICHNUNGEN (Owner 05.08.2026: „Piktogramme will ich nicht haben,
 * die sehen blöd aus. Wir haben Bella und Peter als Beispiel immer").
 *
 * Hier standen zuerst gezeichnete Symbole. Er hat recht, und der Grund ist nicht nur Geschmack:
 * Ein gezeichneter Kopf zeigt eine ABSTRAKTION, ein Foto zeigt das ERGEBNIS. Wer sehen soll,
 * wie sein Foto aussehen muss, braucht ein Foto zum Vergleichen — kein Verkehrsschild.
 *
 * UND ES KOSTET NICHTS: Bella (`kiss-woman-placeholder.jpg`) und Peter (`kiss-placeholder.jpg`)
 * liegen längst im Repo und stehen schon in jedem Upload-Feld. Die drei Fehlerfälle entstehen
 * aus DENSELBEN zwei Dateien, nur anders dargestellt — unscharf gerechnet, klein skaliert, zu
 * zweit nebeneinander. Kein neues Bild, kein erzeugter Lauf, keine Modell-Freigabe.
 */

export type FotoText = {
  /** Überschrift über den vier Zeichen. */
  titel: string;
  /** Das gute Beispiel. */
  gut: string;
  /** Die drei häufigen Fehler, in derselben Reihenfolge wie die Beispiele. */
  unscharf: string;
  weit: string;
  zwei: string;
  /**
   * DER SATZ, DER DIE VERANTWORTUNG SETZT — und der ehrlich sein muss: Wir weisen nichts ab.
   * Er verspricht also keine Prüfung (die es nicht gibt), sondern sagt die Folge.
   */
  fuss: string;
};

const DE: FotoText = {
  titel: "So muss dein Foto aussehen",
  gut: "Gesicht gross, scharf, gut beleuchtet",
  unscharf: "Nicht unscharf",
  weit: "Nicht zu weit weg",
  zwei: "Nur eine Person",
  fuss: "Nichts vor dem Gesicht — keine Hand, keine Sonnenbrille. Wir weisen kein Foto ab, aber aus einem schlechten Foto wird kein gutes Ergebnis.",
};

const EN: FotoText = {
  titel: "This is what your photo needs to look like",
  gut: "Face large, sharp, well lit",
  unscharf: "Not blurry",
  weit: "Not too far away",
  zwei: "One person only",
  fuss: "Nothing in front of the face — no hand, no sunglasses. We don’t reject any photo, but a poor photo cannot become a good result.",
};

const RO: FotoText = {
  titel: "Așa trebuie să arate poza ta",
  gut: "Fața mare, clară, bine luminată",
  unscharf: "Nu neclară",
  weit: "Nu prea departe",
  zwei: "O singură persoană",
  fuss: "Nimic în fața feței — nicio mână, niciun ochelar de soare. Nu respingem nicio poză, dar dintr-o poză proastă nu iese un rezultat bun.",
};

const ES: FotoText = {
  titel: "Así tiene que ser tu foto",
  gut: "Cara grande, nítida, bien iluminada",
  unscharf: "Que no salga borrosa",
  weit: "No demasiado lejos",
  zwei: "Solo una persona",
  fuss: "Nada delante de la cara — ni mano ni gafas de sol. No rechazamos ninguna foto, pero de una foto mala no sale un buen resultado.",
};

const FR: FotoText = {
  titel: "Voilà à quoi ta photo doit ressembler",
  gut: "Visage grand, net, bien éclairé",
  unscharf: "Pas floue",
  weit: "Pas trop loin",
  zwei: "Une seule personne",
  fuss: "Rien devant le visage — ni main ni lunettes de soleil. Nous ne refusons aucune photo, mais une mauvaise photo ne donne pas un bon résultat.",
};

const PT: FotoText = {
  titel: "É assim que a tua foto tem de ser",
  gut: "Rosto grande, nítido, bem iluminado",
  unscharf: "Não desfocada",
  weit: "Não demasiado longe",
  zwei: "Só uma pessoa",
  fuss: "Nada à frente do rosto — nem mão nem óculos de sol. Não recusamos nenhuma foto, mas de uma foto má não sai um bom resultado.",
};

const IT: FotoText = {
  titel: "Ecco come deve essere la tua foto",
  gut: "Viso grande, nitido, ben illuminato",
  unscharf: "Non sfocata",
  weit: "Non troppo lontano",
  zwei: "Una sola persona",
  fuss: "Niente davanti al viso — né mano né occhiali da sole. Non rifiutiamo nessuna foto, ma da una foto scadente non nasce un buon risultato.",
};

const TABELLE: Record<Lang, FotoText> = { de: DE, en: EN, ro: RO, es: ES, fr: FR, pt: PT, it: IT };

export function fotoText(lang?: string): FotoText {
  const l = String(lang ?? "en").slice(0, 2) as Lang;
  return TABELLE[l] ?? TABELLE.en;
}
