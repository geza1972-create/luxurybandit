/**
 * DIE PREISE FÜR DRUCKE — REPRODUKTIONEN GEMEINFREIER WERKE (Owner 15.09.2026: „er soll gleich
 * bestellen können also stripe einbinden und preis berechnen. Schreib jetzt erst mal preise von
 * einem shop ein such mal was. im net").
 *
 * ── DIESE ZAHLEN SIND VORLÄUFIG ─────────────────────────────────────────────────────────────
 *
 * Sie stammen NICHT von einer Druckerei des Hauses, sondern aus dem rumänischen Markt, am
 * 15.09.2026 nachgesehen:
 *   · cityprintshop.ro — Leinwand 50×70 = 120 lei, 30×70 = 85 lei, 40×70 = 110 lei,
 *     60×70 = 140 lei, 90×120 = 270 lei
 *   · skroutz.ro — Poster 30×40 bis 70×100 im Handel zwischen rund 55 und 166 lei
 * Umgerechnet mit rund 5 lei je Euro. Sobald der Owner seinen Lieferanten hat, werden sie
 * ersetzt — der Einkaufspreis entscheidet, nicht der Wettbewerb.
 *
 * ── WARUM ALLES HIER STEHT ──────────────────────────────────────────────────────────────────
 *
 * Skill `bezahlung`, Regel 2: Zahlen kommen aus einer Tabelle, nie aus einem Text. Und Regel 3:
 * Der Browser sagt, WELCHE Stufe gemeint ist — welcher Betrag daran hängt, entscheidet der
 * Server. Deshalb ist `druckPreisCents` die einzige Stelle, die einen Betrag kennt; eine
 * unbekannte Kombination gibt `null` und führt zu keiner Kasse statt zu einem erfundenen Preis.
 *
 * Währung: Euro, wie im ganzen Haus (`WAEHRUNG` in lib/pricing.ts).
 */

/**
 * Was man kaufen kann (Owner 15.09.2026: „wir bieten nur poster an in 3 grössen. A3, A2, A1" ·
 * „keine leinwand").
 *
 * LEINWAND IST RAUS: Ein Video Poster ist ein Poster. Zwei Trägermaterialien nebeneinander
 * hätten erklärt werden müssen und genau das verwässert, was uns unterscheidet.
 */
/* ── DREI FASSUNGEN ZUM SELBEN PREIS (Owner 16.09.2026: „wir schreiben gar nicht ohne rahmen" →
   „oder keine ahnung, vielleicht gibt es leute") ───────────────────────────────────────────
   Der gedruckte Rahmen kostet nichts, also ist er die Vorgabe. Ganz ohne bleibt aber im
   Angebot, und zwar aus dem Grund, den der Owner selbst genannt hat, als unsere Scans eine
   dunkle Kante trugen: „das hat auch ein rahmen. sieht blöd aus." Wer das Blatt in eine echte
   Leiste hängt, hätte sonst zwei Rahmen übereinander. */
/**
 * ── SONNENBRILLE: EIN EIGENES PRODUKT, KEIN DRUCK (Owner 21.09.2026: „Er kann alles verkaufen.
 * Poster, Brille, T-shirts") ─────────────────────────────────────────────────────────────────
 *
 * Anders als Poster und Textil ist sie kein Blatt und kein Stoff, den man in Grössen druckt —
 * ein Modell, ein Preis, „Einheitsgrösse" als einzige Wahl. Sie läuft trotzdem durch DIESELBE
 * Tabelle (Skill `bezahlung`, Regel 2): ein Künstler kann sie neben Postern anbieten, ohne dass
 * die Kasse einen zweiten Weg braucht.
 */
export const DRUCK_MATERIAL = ["poster", "posterrama", "posterramaneagra", "fisier", "tricou", "hanorac", "sonnenbrille"] as const;
export type DruckMaterial = (typeof DRUCK_MATERIAL)[number];

/**
 * DIE GRÖSSEN HÄNGEN AM MATERIAL — DIN beim Poster, Konfektion beim Shirt.
 *
 * A3 (29,7 × 42 cm) · A2 (42 × 59,4) · A1 (59,4 × 84,1). DIN-Formate statt eigener Maße: Jeder
 * Rahmen im Handel passt dazu, und jede Druckerei kennt sie ohne Rückfrage.
 */
const GROESSEN = {
  poster: ["A3", "A2", "A1"],
  /* Drei Waren statt einer mit Zusatz (15.09.2026): Dann steht im Korb und auf der Rechnung,
     welcher Rahmen gedruckt werden soll, ohne einen Sonderfall im Server. */
  posterrama: ["A3", "A2", "A1"],
  posterramaneagra: ["A3", "A2", "A1"],
  /**
   * ── DAS POSTER ALS DATEI (Owner 16.09.2026: „als datei zu herunterladen 5 euro" · „15 für
   * lebende") ────────────────────────────────────────────────────────────────────────────────
   *
   * EINE Grösse, weil eine Datei keine hat: Wer sie kauft, druckt sie so gross, wie er will.
   * Drei Zeilen im Auswahlfeld, die alle dasselbe PDF liefern, wären eine Frage ohne Folgen.
   */
  /**
   * ── WIEDER AN, WEIL DIE DATEI JETZT ANKOMMT (Owner 16.09.2026: „mach fertig") ────────────
   *
   * Abgeschaltet war das Produkt, weil nach der Zahlung nichts passierte. Jetzt baut der Server
   * die Druckdatei im Moment des Kaufs (`lib/lakatosbandi-druckdatei.ts`) und hängt sie an die
   * Bestätigung — mit der Bestellnummer im Blatt.
   *
   * Die „Grösse" ist hier die FASSUNG, nicht das Format: Das Format ist immer A3 (Owner: „Der
   * Download ist immer A3"), gewählt wird der gedruckte Rahmen — dieselbe Wahl wie beim Poster.
   */
  fisier: ["neagra", "holz", "fara"],
  tricou: ["S", "M", "L", "XL", "XXL"],
  hanorac: ["S", "M", "L", "XL", "XXL"],
  /** Ein Modell, keine Grösse — dieselbe Fassung für jeden (Owner 21.09.2026). */
  sonnenbrille: ["Einheitsgröße"],
} as const satisfies Record<DruckMaterial, readonly string[]>;

export const druckGroessenFuer = (material: string): readonly string[] =>
  (GROESSEN as Record<string, readonly string[]>)[material] ?? [];

/** Ob dieses Material Kleidung ist — sie ist schwarz, und das steht auch so auf der Seite. */
export const istTextil = (material: string) => material === "tricou" || material === "hanorac";

/**
 * ── EIN EIGENES STÜCK, KEIN DRUCK SEINES WERKS (Owner 21.09.2026, beim Anlegen der
 * Sonnenbrille) ────────────────────────────────────────────────────────────────────────────
 *
 * Der Lizenzaufschlag (`DRUCK_KUENSTLER_CENTS`) gilt der REPRODUKTION seines Werks — Poster,
 * Rahmen, Datei. Textil zählte deshalb nie mit (`api/druck-kasse` prüfte das nie explizit,
 * weil Kleidung hinter `KLEIDUNG_AN` nie eine echte Kasse erreichte); die Sonnenbrille ist
 * genau dieselbe Art Ausnahme, nur schon live. Ohne diese Prüfung würde der Server auf ihre
 * 70 € still 10 € Lizenz aufschlagen — für ein Stück, das kein Bild von ihm trägt.
 */
export const istEigenesStueck = (material: string) => istTextil(material) || material === "sonnenbrille";

/**
 * ── KLEIDUNG IST VORERST AUS (Owner 18.09.2026: „mach die T-Shirts jetzt raus und Hoodies. Die
 * gehen eh nicht. Wir werden sie wie die Poster machen müssen") ─────────────────────────────
 *
 * EIN SCHALTER STATT EINER LÖSCHUNG: Die Werke bleiben in den Daten, die Preise und Grössen
 * bleiben in dieser Datei, der Kaufweg bleibt gebaut. Sichtbar ist nichts davon. Wer sie
 * zurückholt, setzt hier `true` — und baut vorher die Darstellung neu, so wie beim Poster.
 *
 * WAS „WIE DIE POSTER" HEISST: Beim Poster steht das Werk auf einem Blatt, mit Rahmen, Raum
 * und Massstab — man sieht, was man bekommt. Beim Shirt stand ein Foto in einem Raster, ohne
 * Vorschau am Körper, ohne Stoff. Deshalb hat es nicht verkauft.
 */
export const KLEIDUNG_AN = false;

/** Eine Datei wird nicht geliefert — kein Versand, keine Adresse, kein Paket. */
export const istDatei = (material: string) => material === "fisier";

/**
 * Preis in Cent je Material und Größe — OHNE Versand; der steht als eigene Zahl darunter
 * (`DRUCK_VERSAND_CENTS`) und erscheint in der Kasse als eigene Zeile.
 *
 * POSTER: recherchierter Marktpreis (siehe oben) plus unser Anteil.
 * TEXTIL: der Owner hat den Endpreis selbst genannt — 24 € und 49 €, für jede Größe gleich.
 */
/**
 * ── DER PREIS IST DRUCKKOSTEN PLUS 15 € (Owner 16.09.2026: „dann deren preise plus 15 euro") ─
 *
 * Vorher stand hier ein recherchierter Marktpreis, an dem unser Anteil unsichtbar hing. Jetzt
 * ist die Rechnung offen: Was die Druckerei nimmt, plus ein fester Betrag für uns. Wird der
 * Druck teurer, wandert der Preis mit; wird er billiger, auch.
 */
export const DRUCK_MARGE_CENTS = 1500;

/**
 * WAS DER DRUCK KOSTET — GESCHÄTZT, BIS EINE DRUCKEREI EINEN PREIS NENNT (16.09.2026).
 *
 * Belegt ist bisher nur eine Preisliste (tipomedia.ro): A1 auf wasserfestem Fotopapier, 1440
 * dpi, 32 lei je Stück — rund 6,40 €. A2 und A3 stehen dort nicht auf demselben Papier; sie
 * sind hier nach Fläche geschätzt und bewusst nach oben gerundet, damit der Preis nicht steigen
 * muss, wenn das echte Angebot kommt.
 *
 * DAS IST DIE EINE STELLE, an der die Druckkosten stehen. Kommt das Angebot aus Timișoara,
 * werden diese drei Zahlen ersetzt — und alle Preise stimmen wieder von selbst.
 */
/**
 * ── WAS A3 IN ZENTIMETERN IST (Owner 17.09.2026: „viele wissen nicht die masse von a3, a2…") ──
 *
 * „A2" sagt einem Käufer nichts darüber, ob das Blatt über sein Sofa passt. Die Zentimeter
 * stehen deshalb an jeder Wahl — gerundet, wie es jeder Rahmenhändler auch schreibt.
 */
export const DRUCK_MASSE: Record<string, string> = { A3: "30 × 42 cm", A2: "42 × 59 cm", A1: "59 × 84 cm" };
/** „A3 (30 × 42 cm)" — leer, wenn es kein Papierformat ist (S, M, L am Shirt). */
export const druckMass = (groesse: string) => (DRUCK_MASSE[groesse] ? `${groesse} · ${DRUCK_MASSE[groesse]}` : groesse);

const DRUCK_KOSTEN = { A3: 200, A2: 400, A1: 700 };

const MARKT = { poster: DRUCK_KOSTEN };

/**
 * ── DER RAHMEN KOSTET NICHTS EXTRA (Owner 16.09.2026: „wir verlangen kein extrageld für den
 * rahmen weil der rahmen geprintet wird") ───────────────────────────────────────────────────
 *
 * Es ist kein Rahmen aus Holz, sondern ein gedruckter — er liegt mit auf demselben Blatt. Damit
 * entstehen keine zusätzlichen Kosten, und einen Aufschlag zu verlangen wäre eine Gebühr für
 * Tinte. Hier stehen deshalb Nullen, statt die drei Materialien zusammenzulegen: Im Korb und auf
 * der Rechnung soll weiter stehen, WELCHE Fassung bestellt wurde.
 *
 * Kommt eines Tages ein echter Rahmen dazu, sind es wieder drei Zahlen an dieser Stelle.
 */
/**
 * ── JETZT SIND ES ECHTE RAHMEN (Owner 17.09.2026: „wir werden echte rahmen anbieten" · „ich
 * will holzrahmen anbieten, kein billig shitt" · „jetzt stimmt der preis nicht") ─────────────
 *
 * Bis heute war der Rahmen gedruckt und kostete nichts — hier standen Nullen, und ein gerahmtes
 * Blatt kostete so viel wie ein blankes. Seit es Holz ist, stimmt das nicht mehr.
 *
 * ── DIESE DREI ZAHLEN SIND GESCHÄTZT, NICHT GEMESSEN ────────────────────────────────────────
 * Es gibt noch keinen Lieferanten (Owner: „ich habe noch keine Lieferanten, muss ich besorgen").
 * Angesetzt sind Einkauf plus Aufschlag, wie sie in Rumänien üblich sind: A3 rund 10 € Einkauf,
 * A2 rund 18 €, A1 rund 30 €, dazu unser Anteil. Sobald die Preise des Lieferanten da sind,
 * werden genau diese drei Zahlen ersetzt — sonst nichts.
 */
const RAHMEN = { A3: 2500, A2: 4000, A1: 6500 };

const mitMarge = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v + DRUCK_MARGE_CENTS]));

const gleich = (groessen: readonly string[], cents: number) =>
  Object.fromEntries(groessen.map(g => [g, cents]));

const PREISE: Record<DruckMaterial, Record<string, number>> = {
  poster: mitMarge(MARKT.poster),
  posterrama: Object.fromEntries(
    Object.entries(mitMarge(MARKT.poster)).map(([g, v]) => [g, v + (RAHMEN as Record<string, number>)[g]]),
  ),
  posterramaneagra: Object.fromEntries(
    Object.entries(mitMarge(MARKT.poster)).map(([g, v]) => [g, v + (RAHMEN as Record<string, number>)[g]]),
  ),
  /* 10 € — für jeden gleich, ohne Lizenzaufschlag (Owner 16.09.2026: „der download soll 10 euro
     kosten ohne lizenz"). Die Datei ist zum privaten Gebrauch bestimmt und darf nicht
     vervielfältigt werden; das steht in der Mail und in den AGB.

     AUSNAHME SEIT 19.09.2026: Wer das Blatt selbst für `KUNST_CENTS` hat erzeugen lassen, bekommt
     SEINE Datei ohne zweite Zahlung (`api/kunst-datei`). Dieser Preis gilt für die Werke der
     Künstler — die hat er nicht bezahlt. */
  fisier: gleich(GROESSEN.fisier, 1000),
  tricou: gleich(GROESSEN.tricou, 2400),
  hanorac: gleich(GROESSEN.hanorac, 4900),
  /** 70 € fest (Owner 21.09.2026: „Ich will Sonnenbrille verkaufen für 70€"). */
  sonnenbrille: gleich(GROESSEN.sonnenbrille, 7000),
};

/**
 * Der Betrag zu einer Wahl — oder `null`, wenn die Wahl nicht in der Liste steht.
 *
 * NIEMALS EINEN RÜCKFALL AUF DIE KLEINSTE STUFE: Bei einem Guthaben wäre das harmlos, hier
 * entstünde eine Bestellung über einen Betrag, den niemand angezeigt bekommen hat.
 */
/**
 * ── WAS DER KÜNSTLER JE VERKAUFTEM DRUCK BEKOMMT (Owner 16.09.2026: „sie wollen auch geld
 * bekommen und zwar meistens 50 euro" · „dann muss die marge drauf" · „oder 20 euro") ────────
 *
 * ES WIRD AUFGESCHLAGEN, NICHT GETEILT. Bei einem A3 für 29 € ist nach Druck und unserem Anteil
 * nichts übrig, aus dem ein Honorar käme — ein Anteil vom heutigen Preis wäre eine Zahl, die es
 * nicht gibt. Also zahlt der Käufer es zusätzlich, und der Künstler bekommt es ungeschmälert.
 *
 * NUR BEI LEBENDEN KÜNSTLERN. Bei den gemeinfreien Meistern gibt es niemanden, der bezahlt wird
 * — dort bleiben die Preise, wie sie sind.
 *
 * Eine Zahl an einer Stelle: 10 € (Owner 16.09.2026: „und lizenz 10 euro") statt 20 € oder 50 €
 * ist eine Zeile hier, keine sechs Preise in drei Sprachen.
 */
export const DRUCK_KUENSTLER_CENTS = 1000;

/**
 * ── DIE VERMITTLUNG GIBT ES NICHT MEHR (Owner 19.09.2026: „nein. wir verdienen beim Druck des
 * Prints." · „das Foto des Kunden — 1 € Vermittlung … das gibt es nicht mehr") ───────────────
 *
 * HIER STAND `DRUCK_VERMITTLUNG_CENTS = 100`. Gedacht war sie für den Fall, dass ein Kunde nur
 * SEIN Foto ins Blatt setzt: keine Lizenz, weil nichts vom Künstler darauf ist, aber ein Euro,
 * weil der Käufer über seine Seite kam.
 *
 * Sie fällt weg. Steht nichts vom Künstler auf dem Blatt, bekommt er auch nichts — verdient wird
 * am Druck. Der Käufer zahlt denselben Euro weniger.
 *
 * WAS BLEIBT: die volle Lizenz (`DRUCK_KUENSTLER_CENTS`), wenn SEIN Werk gedruckt wird. Und für
 * den Kunden bleiben die zwei Wege, die es gibt — gedruckt oder als Datei.
 */

/**
 * ── EIN ERZEUGTES BILD KOSTET EINEN EURO (Owner 18.09.2026: „und leider müssen sie 1 Euro
 * bezahlen" · „das dürfen die Leute nur ein Mal machen") ────────────────────────────────────
 *
 * ── WARUM ES ÜBERHAUPT ETWAS KOSTEN MUSS ────────────────────────────────────────────────────
 *
 * Ein Lauf kostet UNS rund 17 Cent bei OpenAI ([[kunst-rollen-statt-prompt]]). Der Knopf steht
 * auf einer offenen Seite ohne Anmeldung; gratis ist er nach oben offen, und der Owner hat
 * selbst gesagt, was dann passiert: „hier werden einen haufen leute generieren wenn es
 * kostenlos ist."
 *
 * ── ZEHN EURO, UND DIE DATEI IST DRIN (Owner 19.09.2026: „generează kostet 10 Euro, klar? Dann
 * ist Download gratis") ─────────────────────────────────────────────────────────────────────
 *
 *   10,00 € Einnahme − 0,39 € Stripe (0,25 € + 1,4 %) − 0,17 € OpenAI = 9,44 €
 *
 * ZWEI ZAHLEN WURDEN ZU EINER. Vorher kostete das Erzeugen 1 € und die Druckdatei danach 10 € —
 * wer sein Bild behalten wollte, zahlte zweimal und stand nach der ersten Zahlung vor einer
 * zweiten Kasse. Das ist der Moment, in dem Leute abbrechen und ihr Geld zurückfordern: Sie
 * hatten das Gefühl, sie hätten das Bild schon gekauft.
 *
 * Jetzt kauft EIN Betrag das Bild UND die Datei. Der Ertrag ist derselbe wie vorher aus beiden
 * Schritten zusammen, nur ohne die zweite Hürde — und es gibt nichts mehr zu erklären.
 *
 * DER DRUCK BLEIBT DAVON UNBERÜHRT: Ein gedrucktes Blatt mit Rahmen und Versand ist ein anderes
 * Produkt und kostet weiter seinen Preis.
 *
 * EIN KAUF IST GENAU EIN LAUF, nicht drei. Bei drei Versuchen für denselben Preis wäre
 * ausgerechnet der Interessierteste — der dreimal drückt — der unrentabelste.
 */
export const KUNST_CENTS = 1000;

/**
 * Der Betrag zu einer Wahl — oder `null`, wenn die Wahl nicht in der Liste steht.
 *
 * NIEMALS EINEN RÜCKFALL AUF DIE KLEINSTE STUFE: Bei einem Guthaben wäre das harmlos, hier
 * entstünde eine Bestellung über einen Betrag, den niemand angezeigt bekommen hat.
 *
 * `kuenstlerAnteil` entscheidet der SERVER aus dem Datensatz des Künstlers, nie der Browser
 * (Skill `bezahlung`, Regel 3) — im Korb steht er nur, damit das Schild stimmt.
 */
export function druckPreisCents(material: string, groesse: string, kuenstlerAnteil: boolean | number = false, a3Cents?: number): number | null {
  const m = DRUCK_MATERIAL.find(x => x === material);
  if (!m) return null;
  if (!druckGroessenFuer(m).includes(groesse)) return null;
  let p = PREISE[m][groesse] ?? null;
  if (p === null) return null;
  /* Sein eigener Preis für dieses Werk ersetzt die Tabelle beim Poster: A3 ohne Rahmen kostet
     genau `a3Cents`, die anderen Formate und der Rahmen behalten ihren Abstand dazu. */
  if (a3Cents && (m === "poster" || m === "posterrama" || m === "posterramaneagra")) {
    p = p - PREISE.poster.A3 + a3Cents;
  }
  /* Die Datei kostet überall dasselbe — der Künstleranteil hängt am gedruckten Poster, nicht an
     einer Datei (Owner 16.09.2026: „ohne lizenz"). */
  /* `true` heisst die volle Lizenz; eine Zahl heisst genau diesen Betrag (die Vermittlung von
     1 €, wenn nur sein eigenes Foto im Blatt steht). */
  /* Sein eigener Preis ist der ganze Preis — die Lizenz steckt darin und kommt nicht obendrauf. */
  const eigenerPreis = !!a3Cents && (m === "poster" || m === "posterrama" || m === "posterramaneagra");
  const dazu = eigenerPreis ? 0 : kuenstlerAnteil === true ? DRUCK_KUENSTLER_CENTS : (typeof kuenstlerAnteil === "number" ? kuenstlerAnteil : 0);
  return dazu && m !== "fisier" ? p + dazu : p;
}

/**
 * ── WER SCHON ERZEUGT HAT, ZAHLT DEN DRUCK NUR NOCH ZUR HÄLFTE (Owner 19.09.2026: „hier kostet
 * eigentlich der Print 18 + 10 seine Generierung, also 28 Euro. Etwas zu viel. Es müsste jetzt
 * insgesamt 18 kosten" · „also 10 abziehen, oder?") ─────────────────────────────────────────
 *
 * Die 10 €, die das Erzeugen gekostet hat, werden auf den Druck angerechnet. Wer sein Bild
 * erzeugen liess und es danach drucken will, zahlt zusammen dasselbe wie jemand, der nur druckt
 * — nicht zweimal.
 *
 *   A3 ohne Rahmen, eigenes Bild:  18 € Liste − 10 € angerechnet = 8 € · zusammen 18 €
 *
 * WARUM DAS RICHTIG IST: Das Erzeugen und der Druck sind nicht zwei Produkte, sondern zwei
 * Schritte zu EINEM Blatt. Zweimal zu kassieren wäre die Stelle, an der jemand den Warenkorb
 * schliesst — und ausgerechnet bei dem, der am weitesten gekommen ist.
 *
 * ── DER BODEN IST DIE DRUCKEREI ─────────────────────────────────────────────────────────────
 *
 * Nie unter das, was das Blatt in der Herstellung kostet (`DRUCK_KOSTEN`). Sonst legte ein
 * künftiges kleineres Format am Ende Geld drauf — und der Versand steht daneben, er wird nicht
 * mitgerechnet.
 *
 * ANGERECHNET WIRD EINMAL JE ERZEUGTEM BILD, nicht je Stück: Wer dasselbe Blatt dreimal druckt,
 * hat einmal erzeugt. Das entscheidet die Kasse (`api/druck-kasse`), nicht diese Funktion.
 */
export function druckAbzugCents(material: string, groesse: string, preis: number): number {
  const boden = (DRUCK_KOSTEN as Record<string, number>)[groesse] ?? 0;
  if (material === "fisier") return 0;
  return Math.max(0, Math.min(KUNST_CENTS, preis - boden));
}

/**
 * DIE SPANNE FÜR DRUCKE — vom kleinsten Papierformat bis zur größten Leinwand (Owner
 * 15.09.2026: „beim Bild auch zwischen 20-100 Euro, beispiel").
 *
 * Aus derselben Tabelle gerechnet, nicht abgeschrieben: Ändert sich ein Preis, ändert sich die
 * Spanne mit. Textil zählt nicht mit — das sind eigene Kacheln mit festem Preis.
 */
export function druckSpanneCents(kuenstlerAnteil = false): { von: number; bis: number } {
  /* ── VON UNGERAHMT BIS GERAHMT (18.09.2026) ────────────────────────────────────────────
     Seit die Rahmen aus echtem Holz sind, beginnt die Spanne beim blanken Blatt: „ab 42 €"
     stand auf der Startseite, obwohl ein A3 ohne Rahmen 17 € kostet — das ist der Preis, mit
     dem man wirbt. Oben endet sie beim grössten gerahmten Blatt. */
  const dazu = kuenstlerAnteil ? DRUCK_KUENSTLER_CENTS : 0;
  const werte = [
    ...druckGroessenFuer("poster").map(g => PREISE.poster[g] + dazu),
    ...druckGroessenFuer("posterrama").map(g => PREISE.posterrama[g] + dazu),
    ...druckGroessenFuer("posterramaneagra").map(g => PREISE.posterramaneagra[g] + dazu),
  ];
  return { von: Math.min(...werte), bis: Math.max(...werte) };
}

/** Was auf dem Schild steht — dieselbe Quelle wie die Abbuchung. */
export function druckPreisListe(): { material: DruckMaterial; groesse: string; cents: number }[] {
  return DRUCK_MATERIAL.flatMap(m => druckGroessenFuer(m).map(g => ({ material: m, groesse: g, cents: PREISE[m][g] })));
}

/**
 * ── VERSAND: 5 € NACH RUMÄNIEN (Owner 15.09.2026: „Lieferung. Nur nach Rumänien erst mal und
 * kostet extra 5 euro") ─────────────────────────────────────────────────────────────────────
 *
 * EIGENE ZAHL, NICHT IN DEN PREIS GERECHNET: Der Käufer sieht, was die Ware kostet und was die
 * Lieferung kostet. Eingerechnet wäre sie unsichtbar und bei der nächsten Änderung in sechs
 * Zahlen verstreut.
 *
 * Stripe zeigt sie als eigene Zeile in der Kasse und schlägt sie auf — deshalb steht sie hier
 * und nicht in einem Text.
 */
export const DRUCK_VERSAND_CENTS = 500;

/**
 * ── JEDES WEITERE STÜCK KOSTET 2 € VERSAND (Owner 17.09.2026: „das kann manchmal zum Verlust
 * führen" · „der warenkorb" · „ja") ────────────────────────────────────────────────────────
 *
 * Bisher stand der Versand EINMAL in der Kasse, egal wie viele Blätter bestellt wurden. Bei der
 * Druckerei hängt er aber am Paket: Zwei Poster können zwei Sendungen sein — wir kassieren 5 €
 * und zahlen zehn. Genau das ist der Verlust, den der Korb möglich macht (ein Einzelkauf kann
 * ihn nicht auslösen).
 *
 * 5 € für das erste Stück, 2 € für jedes weitere: Wer eins kauft, zahlt wie bisher; wer drei
 * kauft, zahlt 9 € statt 5 €. Sobald der Preis der Druckerei für eine Mehrfachsendung bekannt
 * ist, gehört diese Zahl geprüft — sie ist eine vorsichtige Schätzung, keine gemessene.
 */
export const DRUCK_VERSAND_WEITERE_CENTS = 200;

/**
 * ── EIN GERAHMTES BILD FÄHRT ANDERS (Owner 17.09.2026: „ok plus versand") ───────────────────
 *
 * Ein gerolltes Blatt geht in einer Papphülse; ein Rahmen ist sperrig, schwer und geht kaputt —
 * er braucht einen Karton mit Polster und wird als Paket berechnet. Fünf Euro trügen das nicht,
 * und die Differenz zahlte das Haus.
 *
 * AUCH DIESE ZAHLEN SIND GESCHÄTZT: 12 € für die erste gerahmte Sendung nach Rumänien, 6 € für
 * jedes weitere gerahmte Stück im selben Paket. Sobald ein Kurierpreis vorliegt, stehen hier
 * zwei Zahlen zum Ersetzen.
 */
export const DRUCK_VERSAND_RAHMEN_CENTS = 1200;
export const DRUCK_VERSAND_RAHMEN_WEITERE_CENTS = 600;

/** Ob dieses Stück in einem Rahmen kommt — nur der zählt für den teureren Versand. */
export const istGerahmt = (material: string) => material.startsWith("posterrama");

/**
 * Was die Lieferung für DIESE Bestellung kostet. Dateien zählen nicht mit — sie liegen in
 * keinem Paket (Owner 16.09.2026). Ist ein Rahmen dabei, gilt der Rahmen-Satz für das erste
 * Stück; jedes weitere kostet nach seiner eigenen Art.
 */
export function druckVersandCents(materialien: string[]): number {
  const stuecke = materialien.filter(m => !istDatei(m));
  if (!stuecke.length) return 0;
  const gerahmt = stuecke.filter(istGerahmt).length;
  const flach = stuecke.length - gerahmt;
  if (gerahmt) {
    return DRUCK_VERSAND_RAHMEN_CENTS
      + (gerahmt - 1) * DRUCK_VERSAND_RAHMEN_WEITERE_CENTS
      + flach * DRUCK_VERSAND_WEITERE_CENTS;
  }
  return DRUCK_VERSAND_CENTS + (flach - 1) * DRUCK_VERSAND_WEITERE_CENTS;
}

/** Wohin geliefert wird. Erst einmal nur Rumänien — der Owner hat noch keinen Lieferanten für
 *  darüber hinaus (15.09.2026). */
export const DRUCK_LAENDER = ["RO"] as const;

/**
 * Wie lange es dauert — steht NICHT hier als Zahl, solange der Owner keinen Lieferanten hat
 * (er am 15.09.2026: „ich suche lieferanten"). Eine Lieferzeit, die wir raten, ist das erste
 * gebrochene Versprechen. Bis dahin sagt die Seite nichts darüber.
 */
export const DRUCK_LIEFERZEIT_TAGE: number | null = null;

/**
 * ── SEIN EIGENER POSTERPREIS JE WERK (Owner 25.09.2026: „die Poster kosten 250 Euro und ich kann
 * das nirgendwo ändern, nur die Originale" · „ohne Rahmen kosten sie so viel") ────────────────
 *
 * `WerkInfo.posterPreis` ist der Preis des Posters A3 OHNE Rahmen in Euro, wie er ihn tippt
 * („250", „89,50"). Leer oder unsinnig → `undefined`, und die Tabelle gilt wie bisher. Der Server
 * (`api/druck-kasse`) liest den Wert aus dem Datensatz, nie aus dem Browser (Skill `bezahlung`).
 * Sein Preis ist der ganze Preis: Der Lizenzaufschlag kommt bei eigenem Preis NICHT obendrauf.
 */
export function posterPreisA3Cents(roh: unknown): number | undefined {
  const n = Number(String(roh ?? "").replace(/[^0-9,.]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 5 || n > 5000) return undefined;
  return Math.round(n * 100);
}
