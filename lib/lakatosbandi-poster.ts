/**
 * DAS RASTER DES POSTERS — EINE QUELLE FÜR SCHIRM UND DRUCK (Owner 16.09.2026: „überleg mal was
 * du machst" → „ja": das Poster einmal richtig bauen).
 *
 * ── WARUM ES DIESE DATEI GIBT ───────────────────────────────────────────────────────────────
 *
 * Ein Poster ist ein Druckerzeugnis: ein Blatt im A-Format, und darauf steht jedes Element an
 * einer festgelegten Stelle. Auf dem Bildschirm wurde daraus bisher ein Stapel aus Absätzen, den
 * Flexbox nach Inhalt verteilte — und deshalb sah es bei jedem zweiten Werk anders aus: mal
 * schob das Bild die Schrift aus dem Blatt, mal blieb unten die Hälfte leer. Jede Korrektur
 * erzeugte den nächsten Fehler.
 *
 * Hier stehen die Maße EINMAL. Die Kachel auf der Seite liest sie, und die Druckdatei für die
 * Druckerei entsteht aus denselben Zahlen (`poster-raster.json`, erzeugt von
 * `scratch-poster-raster.mjs`). Damit kann nicht mehr passieren, dass der Käufer etwas anderes
 * gedruckt bekommt, als er gesehen hat.
 *
 * ── ALLE MASSE SIND ANTEILE, KEINE PIXEL ────────────────────────────────────────────────────
 *
 * `breit` = Anteil der BLATTBREITE in Prozent. Auf dem Schirm ist das die CSS-Einheit `cqw`
 * (1 cqw = 1 % der Blattbreite), im Druck ein Anteil der Seitenbreite in Millimetern. Ein Poster
 * sieht damit in einer schmalen Kachel genauso aus wie auf A1 — nur kleiner.
 *
 * `hoch` = Anteil der BLATTHÖHE. Das braucht nur das Bildfeld: Seine Höhe muss feststehen, BEVOR
 * das Bild geladen ist, sonst bestimmt das Bild das Blatt statt umgekehrt.
 */

/** Höhe geteilt durch Breite. DIN A: √2. Gilt für A3, A2 und A1 gleichermaßen. */
export const POSTER_VERHAELTNIS = 1.4142;

/** Die drei Formate, in denen wir drucken — Millimeter, für die Druckdatei. */
export const POSTER_FORMATE = {
  A3: { breite: 297, hoehe: 420 },
  A2: { breite: 420, hoehe: 594 },
  A1: { breite: 594, hoehe: 841 },
} as const;

/**
 * ── DER NAME AUF DEM BLATT WIRD NICHT ÜBERSETZT (Owner 16.09.2026: „LIVING POSTER auf allen 3
 * sprachen" → A) ────────────────────────────────────────────────────────────────────────────
 *
 * Die KATEGORIE heisst weiter in jeder Sprache anders — „Poster viu" auf der rumänischen Seite,
 * „Lebendes Poster" auf der deutschen. Auf dem gedruckten Blatt steht aber immer dasselbe: Es
 * ist ein Produktname, und ein Poster, das in Bukarest anders heisst als in Wien, ist zweimal
 * dasselbe Ding mit halber Wirkung.
 */
/**
 * ── UND ER TRÄGT DEN LADEN, NICHT DAS SCHLAGWORT (Owner 17.09.2026: „wenn jemand nach Living
 * Poster sucht, kommt Blödsinn" · „dann schreib lieber LAKATOSBANDI POSTER") ────────────────
 *
 * „Living Poster" beschreibt, was das Blatt KANN — aber als Wort gehört es niemandem: Wer es
 * sucht, findet Zimmerpflanzen. Auf dem Papier, das jahrelang an einer Wand hängt, steht
 * deshalb die ADRESSE des Ladens (Owner 17.09.2026: „oder einfach lakatosbandi.com — dann ist
 * sofort alles klar"). Wer davorsteht, muss nichts raten und nichts suchen: Er tippt, was da
 * steht, und ist da. Ein Markenname müsste erst gelernt werden; eine Adresse funktioniert
 * beim ersten Mal.
 *
 * Die KATEGORIE auf der Seite heisst weiter „Living Poster" — dort erklärt sie, was das Ding
 * ist. Hier steht, woher es kommt.
 */
export const POSTER_TITEL = "LAKATOSBANDI.COM";

/**
 * ── WIE OFT DER TITEL SCHON HOCHGERÜCKT IST (Owner 19.09.2026: dreimal „30 % höher") ─────────
 *
 * Jedes „noch 30 %" ist EIN Schritt. Die Lücke zwischen Werk und Titel schrumpft um 30 %, und
 * der Titel bekommt genau diesen Betrag als Abstand nach unten dazu — so wandert er allein, und
 * Satz, Adresse und Code bleiben stehen.
 *
 * ALS ZAHL STATT ALS KETTE: Vorher standen die Schritte ausgeschrieben nebeneinander, und beim
 * vierten hätte man raten müssen, welcher Summand zu welchem gehört. Hier ist es eine Zahl —
 * erhöhen, fertig. Zurück geht genauso.
 */
const TITEL_HOCH = 3;
/** Der ursprüngliche Abstand zwischen Werk und Schrift, bevor der Titel zu wandern anfing. */
const LUFT_SCHRIFT_ANFANG = 2.2;
const LUFT_SCHRIFT = LUFT_SCHRIFT_ANFANG * 0.7 ** TITEL_HOCH;

export const POSTER = {
  /** Weißer Rand ringsum — das Passepartout. Anteil der Breite. */
  /* Der Rand des Blattes. Unten schmaler — die Schrift soll näher an die Kante (Owner
     16.09.2026: „texte weiter runter zum rand"). */
  rand: 6.5,
  /* Oben genauso viel Papier wie seitlich (Owner 17.09.2026: „gleicher abstand oben rechts
     links") — das Werk sitzt in einem Passepartout, und ein Passepartout ist an drei Seiten
     gleich breit; nur unten steht mehr, weil dort die Schrift liegt. */
  randOben: 6.5,
  /* Unten mehr Luft als oben (Owner 17.09.2026: „schrift höher") — die Rechtezeile klebte
     sonst auf der Rahmenkante. */
  /* AUF 7,5 (Owner 18.09.2026, mit Bild der Monet-Karte auf der Startseite: „die Schrift klebt
     zu sehr am unteren Rand"). Vorher 5,5 — also WENIGER Luft als oben (6,5), obwohl unten die
     ganze Schrift liegt: Name, Titel, Satz und der Code. Die Zahl gilt für den Schirm UND die
     Druckdatei (lib/lakatosbandi-druckdatei.ts), damit das gedruckte Blatt aussieht wie die
     Vorschau. */
  randUnten: 7.5,
  /** Zwischen den Zeilen des Textblocks, damit er als ein Stück wirkt. */
  luft: 1.2,

  /**
   * „POSTER VIU" ganz oben — und `luft` ist der Abstand bis zum Werk (Owner 16.09.2026: „auch der
   * abstand zwischen poster viu und bild muss immer gleich sein"). Eine feste Zahl, kein Rest
   * einer Verteilung: Sonst rückt die Überschrift bei jedem Werk woanders hin.
   */
  kopf: { breit: 2.9, sperre: 0.22, luft: 4.5 },

  /**
   * DAS BILDFELD — das einzige Element mit fester HÖHE.
   *
   * 46 % des Blattes. Darüber liegt der Kopf, darunter der Textblock; was zwischen den dreien
   * frei bleibt, ist Papier. Das Werk richtet sich nach seiner langen Seite: ein liegendes nach
   * der Breite, ein stehendes nach der Höhe (Owner 16.09.2026) — so ist es in beiden Fällen
   * ganz zu sehen und sprengt nie sein Feld.
   */
  /* Seitlich nur eine schmale Kante, damit das Werk die Breite des Blattes nutzt (Owner
     16.09.2026: „bild kann breiter werden") — der Rand des Blattes ist das Passepartout. */
  /* So gross wie möglich, aber ausgewogen mit Abstand zum Rand (Owner 17.09.2026: „bild muss so
     gross wie möglich ausgewogen mit abstand zum rand"). */
  /**
   * ── DAS WERK DARF ÜBER DEN SCHRIFTRAND HINAUS (Owner 19.09.2026: „das Bild ist 5 Prozent zu
   * klein oder 10") ───────────────────────────────────────────────────────────────────────────
   *
   * `randSeite` ist der Abstand des BILDFELDS zum Schriftrand. Er war 0, das Werk endete also
   * genau dort, wo auch der Satz endet — und das Blatt wirkte am Rand zu leer.
   *
   * NEGATIV heisst: Das Werk geht über diese Kante hinaus, zum Blattrand hin. −3 auf jeder Seite
   * sind rund 7 % mehr Werk (die Mitte seiner „5 oder 10"). Die Schrift bleibt, wo sie ist — nur
   * das Bild wird breiter.
   *
   * SCHIRM UND DRUCK LESEN DIESELBE ZAHL (`components/Poster.tsx` als negativer Aussenabstand,
   * `lakatosbandi-druckdatei.ts` und `-blattbild.ts` als Feldbreite). Eine Zahl, drei Orte.
   */
  bild: { hoch: 76, randSeite: -3, luftUnten: 4, luftSchrift: LUFT_SCHRIFT },

  /** Der Künstler: Gesicht, Name, Lebensdaten — eine Zeile, wie auf einem Museumsschild. */
  /* Der Name ist ein Schild, keine Überschrift (Owner 16.09.2026: „name ist zu gross") — er
     steht auf einer Stufe mit Titel und Text, nur gesperrt. */
  name: { breit: 2.4, sperre: 0.16, kreis: 5, luft: 1.6 },
  leben: { breit: 2.4 },

  /** Titel des Werks und Jahr, kursiv. */
  /* GROSS (Owner 17.09.2026: „Gina 2015 ganz gross") — seit der Künstlername vom Blatt ist,
     trägt der Titel die Zeile: er ist die Überschrift des Werks, nicht eine Fussnote. */
  /**
   * ── GRÖSSER UND NÄHER AM WERK (Owner 19.09.2026: „die Schrift ist zu klein und zu weit
   * unten") ───────────────────────────────────────────────────────────────────────────────────
   *
   * Seit das Werk breiter läuft, wirkte die Schrift darunter wie eine Fussnote: Auf einem A3
   * sass der Name in gut zwei Zentimetern, mit einer Handbreit leerem Papier darüber. Titel,
   * Satz und Adresse wachsen deshalb um rund ein Drittel, und die Lücke zwischen Werk und
   * Schrift fällt von einem ganzen Blattrand auf ein Drittel davon.
   *
   * Eine Zahl je Zeile, gelesen von Schirm UND Druck — wer sie ändert, ändert beide.
   */
  titel: {
    breit: 8.6,
    /* Der Titel rückt ans Werk, der Rest bleibt stehen — siehe `TITEL_HOCH` oben. Was die Lücke
       oben verliert, bekommt er hier dazu. */
    luftUnten: 1.2 + (LUFT_SCHRIFT_ANFANG - LUFT_SCHRIFT),
  },

  /** Die zwei Sätze. Der Rest steht hinter dem Code. */
  text: { breit: 3.45, zeile: 1.38 },

  /** Der Code und der Satz, der sagt, was er tut. */
  /* Klein genug, um nicht das Blatt zu beherrschen, gross genug zum Scannen aus Armlänge
     (Owner 16.09.2026: „qr code ist zu gross"). */
  /* `klein`: der Code unten neben der Adresse (Owner 17.09.2026) — gross genug zum Scannen,
     klein genug, um nicht zu stören. 3,2 % der Blattbreite sind auf einem A3 rund 1 cm. */
  qr: { breit: 7, klein: 3.6, luft: 1.8 },
  scan: { breit: 2.1 },

  /** Absender und Rechtezeile. */
  marke: { breit: 1.9, sperre: 0.24, luft: 2 },
  recht: { breit: 2.1 },

  /**
   * ── DER GEDRUCKTE RAHMEN (Owner 16.09.2026: „3 versionen zum download mit rahmen") ────────
   *
   * Auf dem Bildschirm zeichnet ihn CSS um die Kachel (globals.css); in der Druckdatei muss er
   * mit aufs Blatt, sonst bekäme der Käufer etwas anderes, als er gesehen hat. `breit` ist sein
   * Anteil an der Blattbreite; der Inhalt rückt um genau diesen Betrag nach innen.
   *
   * Die Farbverläufe sind dieselben wie im Stylesheet: Licht von links oben, unten dunkel.
   */
  /* EINE FLÄCHE, KEIN VERLAUF (Owner 16.09.2026: „der rahmen sollte keinen verlauf haben") —
     der Verlauf sollte Tiefe vortäuschen, aber auf Papier gibt es keine Tiefe: gedruckt ist er
     ein Farbverlauf, der wie ein Druckfehler aussieht. Eine Leiste, ein Ton. */
  rahmen: {
    /**
     * ── DIE LEISTE IST SO BREIT WIE AUF DEM SCHIRM (Owner 19.09.2026: „Rahmen zuerst") ────────
     *
     * HIER STANDEN 4,5 %, und das war ein Rest. Der Owner hat die Leiste auf dem Bildschirm
     * viermal schlanker machen lassen — 16.09. („noch dünner, 30 Prozent"), 17.09. („die Rahmen
     * sind hier zu breit, 50 Prozent"), 18.09. zweimal („zu fett" · „noch 30 Prozent schmäler")
     * —, aber jedes Mal nur im Stylesheet. Die Druckdatei rechnete weiter mit der ersten Zahl.
     *
     * GEMESSEN am 19.09.2026 an einem A3: Datei 4,50 % der Blattbreite, Schirm 1,27 %. Das ist
     * mehr als das Dreifache — in der Datei eine Holzleiste, auf dem Schirm ein Strich. Wer die
     * Vorschau glaubt, bekommt etwas anderes geliefert.
     *
     * DIE ZAHLEN SIND JETZT DIESELBEN wie in `globals.css` (`border-width: 1.26cqw 1.26cqw
     * 1.47cqw 1.26cqw`). Unten ein wenig breiter, wie bei einem echten Rahmen, in dem das Blatt
     * etwas tiefer sitzt.
     */
    breit: 1.26,
    breitUnten: 1.47,
    holz: "#cba57a",
    schwarz: "#141414",
  },

  farben: {
    /* Creme statt Weiss (Owner 16.09.2026: „jetzt den hintergrund des posters nicht weiss
       sondern creme") — ein Poster auf Naturpapier wirkt gedruckt, ein weisses wie ein
       Bildschirm. */
    papier: "#f4efe2",
    tinte: "#22201b",
    grau: "#8a8375",
    leise: "#a9a294",
    kante: "#ddd4c0",
  },
} as const;

export type PosterRaster = typeof POSTER;

/**
 * ── DER SATZ HAT EINE FLÄCHE, KEINE LÄNGE (Owner 17.09.2026: „text block ist begrenzt. egal was
 * der user schreibt dann wird der text kleiner") ─────────────────────────────────────────────
 *
 * Sobald der Kunde den Satz selbst schreibt (der Stift auf dem Blatt), kennt niemand mehr seine
 * Länge. Bliebe die Schriftgrösse fest, sprengte ein langer Satz das Blatt — und abschneiden
 * hiesse, dass er seinen eigenen Text nicht ganz sieht. Also bleibt die FLÄCHE fest und die
 * Schrift passt sich an: zwei Zeilen Platz, und je länger der Satz, desto kleiner die Schrift.
 *
 * Die Rechnung: in eine Zeile der Breite `feld` passen bei der Schriftgrösse `g` etwa
 * `feld / (g · ZEICHEN)` Zeichen. Für ZWEI Zeilen und `n` Zeichen heisst das
 * `g = 2 · feld / (ZEICHEN · n)`. Nach oben begrenzt die normale Grösse (kurze Sätze werden
 * nicht gross), nach unten die Lesbarkeit im Druck.
 *
 * ZEICHEN ist an einem gesetzten Satz geeicht, nicht geschätzt: „Ochii țin oglinda; …"
 * (81 Zeichen) füllt bei 2,6 cqw genau zwei Zeilen im 69,4 cqw breiten Feld — daraus
 * 69,4 / 40,5 / 2,6 ≈ 0,66. Mit 0,45 (geschätzt) lief ein 105-Zeichen-Satz in eine dritte Zeile,
 * statt zu schrumpfen.
 *
 * HIER, nicht im Bauteil: dieselbe Zahl braucht das Blatt (`Poster.tsx`), das Eingabefeld beim
 * Tippen (`PosterDeinText.tsx`) und — gemessen statt geschätzt — die Druckdatei. Drei Stellen,
 * eine Regel.
 */
const ZEICHEN = 0.66;

/**
 * ── DER BODEN: KLEINER ALS DAS LIEST NIEMAND (Owner 17.09.2026: „und das ist zu klein, kann
 * keiner lesen") ────────────────────────────────────────────────────────────────────────────
 *
 * Erst stand hier 1,45 — rechnerisch passte damit jeder Satz, aber auf A3 sind das 4 mm hohe
 * Zeilen an einer Wand. Eine Fläche, die alles schluckt, ist keine Lösung, wenn das Ergebnis
 * unlesbar ist. 2,1 cqw ist die Grenze, unter die der Satz nicht geht (auf A3 rund 6 mm).
 *
 * Damit die Fläche trotzdem reicht, endet der Satz bei `POSTER_TEXT_ZEICHEN` — genau so viel,
 * wie bei dieser Mindestgrösse in zwei Zeilen passt. Das ist dieselbe Länge, auf die auch der
 * Anriss des Künstlers gekürzt wird (`posterAnriss`, rund 100 Zeichen): eine Grenze, nicht zwei.
 */
const TEXT_BODEN = 2.1;

/** Das Textfeld des Satzes in `cqw` — Blattbreite ohne Rand, abzüglich der Lücke für den Code. */
const textFeld = (qrEcke: boolean) =>
  100 - 2 * POSTER.rand - (qrEcke ? 2 * (POSTER.qr.breit + POSTER.qr.luft) : 0);

/** Wie viele Zeichen in zwei Zeilen passen, ohne unter den Boden zu gehen. */
export const POSTER_TEXT_ZEICHEN = Math.floor((2 * textFeld(true)) / (ZEICHEN * TEXT_BODEN));

/** Die Schriftgrösse des Anriss-Satzes in `cqw`, passend zu seiner Länge. */
export function posterTextBreit(satz: string, qrEcke = false): number {
  const n = String(satz ?? "").trim().length;
  if (!n) return POSTER.text.breit;
  return Math.max(TEXT_BODEN, Math.min(POSTER.text.breit, (2 * textFeld(qrEcke)) / (ZEICHEN * n)));
}

/**
 * ── DASSELBE FÜR DEN TITEL (Owner 17.09.2026: „edit icon für titel") ────────────────────────
 *
 * Auch die grosse Zeile schreibt der Kunde selbst, und auch sie darf das Blatt nicht sprengen.
 * Ein Unterschied: der Titel ist EINE Zeile — er bricht nicht um, er wird schmaler. Deshalb
 * rechnet die Formel hier mit einer Zeile statt mit zweien.
 *
 * Der Boden liegt höher als beim Satz: Diese Zeile IST die Überschrift des Blattes; wäre sie so
 * klein wie der Satz, hätte das Blatt keine mehr. Unter `TITEL_BODEN` wird sie nicht gesetzt,
 * dafür endet der Titel bei `POSTER_TITEL_ZEICHEN`.
 */
const TITEL_BODEN = 3.2;

/** Wie viele Zeichen in EINE Titelzeile passen, ohne unter den Boden zu gehen. */
export const POSTER_TITEL_ZEICHEN = Math.floor((100 - 2 * POSTER.rand) / (ZEICHEN * TITEL_BODEN));

/** Die Schriftgrösse des Titels in `cqw`, passend zu seiner Länge. */
export function posterTitelBreit(titel: string): number {
  const n = String(titel ?? "").trim().length;
  if (!n) return POSTER.titel.breit;
  return Math.max(TITEL_BODEN, Math.min(POSTER.titel.breit, (100 - 2 * POSTER.rand) / (ZEICHEN * n)));
}
