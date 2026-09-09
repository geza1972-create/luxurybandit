/**
 * DER PLAN IST EINE PRÄSENTATION, KEIN BLATT (Owner 09.09.2026, vor dem Beispiel-Abschnitt:
 * „Hier müsste sich ein Dokument öffnen das wir tatsächlich generieren. Dafür zahlt keiner
 * Geld was er hier sieht. Diese Analyse sieht am Ende nicht so aus. Es wird die PowerPoint
 * Präsentation sein.")
 *
 * WAS SICH DAMIT ÄNDERT: Bis heute lieferte die Maschine ein A4-Dokument — ein Fliesstext
 * mit Abschnitten, der von oben nach unten gelesen wird. Ein Plan wird aber selten gelesen,
 * er wird GEZEIGT: dem Partner, dem Chef, der Frau. Dafür ist die Folie die richtige Form —
 * eine Aussage je Bild, gross genug, um sie jemandem über den Tisch zu drehen.
 *
 * DIESE DATEI ZEICHNET NICHTS. Sie beschreibt nur, WELCHE Folien es gibt und was darauf
 * steht. Gezeichnet wird zweimal — als .pptx (er kann sie öffnen und ändern) und als PDF
 * (sie geht auf jedem Handy auf, ohne App). Zwei Ausgaben, EIN Foliensatz: sonst laufen die
 * beiden Fassungen nach der dritten Änderung auseinander.
 *
 * KEINE ERFUNDENEN FOLIEN. Was der Plan nicht hergibt, bekommt kein Bild. Ein Foliensatz mit
 * einer leeren „Zielgruppe"-Folie ist schlimmer als einer ohne.
 */

export type VersusForgePlan = {
  befund?: string;
  bauteile?: { was?: string; wozu?: string; selbst?: string; aufwand?: string }[];
  anzeige?: { primaer?: string; ueberschrift?: string; beschreibung?: string; knopf?: string };
  zielgruppe?: string[];
  hook?: string;
  hookWarum?: string;
  motive?: { idee?: string; text?: string }[];
  trichter?: string[];
  budget?: string;
  warnung?: string;
};

export type FolienOptionen = {
  datum?: Date;
  einstieg?: string;
  eingabe?: string;
  runden?: { frage?: string; antwort?: string }[];
  telefon?: string;
  mail?: string;
};

/**
 * Die Folienarten. Jede trägt genau so viel, wie auf ein Bild passt — die Renderer müssen
 * nie umbrechen-und-hoffen, sondern kennen für jede Art eine feste Anordnung.
 */
export type Folie =
  /** Deckblatt: Wortmarke, der Satz des Kunden, Datum. */
  | { art: "deckblatt"; ziel: string; datum: string }
  /** Eine grosse Aussage — der Hook, die Warnung. Optional eine Fussnote darunter. */
  | { art: "aussage"; kicker: string; text: string; fussnote?: string; ton?: "gold" | "still" }
  /** Überschrift plus Aufzählung. */
  | { art: "punkte"; kicker: string; titel: string; punkte: string[]; fussnote?: string }
  /** Beschriftete Felder — die Meta-Anzeige, damit man sie 1:1 einträgt. */
  | { art: "felder"; kicker: string; titel: string; felder: { name: string; wert: string }[]; fussnote?: string }
  /** Die Strecke: Stationen nebeneinander, mit Pfeilen. */
  | { art: "strecke"; kicker: string; titel: string; schritte: string[]; fussnote?: string }
  /** Nummerierte Bauteile mit ehrlichem Aufwand rechts. */
  | { art: "bauteile"; kicker: string; titel: string; teile: { nr: number; was: string; wozu?: string; selbst?: string; aufwand?: string }[] }
  /** Frage-Antwort-Beleg. */
  | { art: "protokoll"; kicker: string; titel: string; erste: boolean; eingabe?: string; runden: { frage: string; antwort: string }[] }
  /** Das Angebot samt Kontakt — die einzige Folie, die etwas verkauft. */
  | { art: "angebot"; kicker: string; titel: string; text: string; telefon?: string; mail?: string }
  /** Schlussfolie: was dieses Papier ist und was nicht. */
  | { art: "schluss"; text: string };

const LEER = (s?: string) => !String(s ?? "").trim();

/**
 * Zu lange Listen zerlegen, damit nichts über den Folienrand läuft — und dabei GLEICHMÄSSIG
 * verteilen.
 *
 * WARUM NICHT EINFACH ALLE `proFolie` ABSCHNEIDEN (09.09.2026, nach dem ersten Probelauf):
 * Vier Bauteile bei drei pro Folie ergaben 3 + 1. Die zweite Folie trug einen einzigen Punkt
 * und zu vier Fünfteln Leere — das sieht nicht nach Absicht aus, sondern nach Abbruch. Jetzt
 * wird erst die Zahl der Folien bestimmt und die Liste dann gleichmässig aufgeteilt: aus
 * 3 + 1 wird 2 + 2.
 */
function inHaeppchen<T>(liste: T[], proFolie: number): T[][] {
  if (liste.length <= proFolie) return liste.length ? [liste] : [];
  const folien = Math.ceil(liste.length / proFolie);
  const je = Math.ceil(liste.length / folien);
  const raus: T[][] = [];
  for (let i = 0; i < liste.length; i += je) raus.push(liste.slice(i, i + je));
  return raus;
}

export function folienAusPlan(plan: VersusForgePlan, opt: FolienOptionen = {}): Folie[] {
  const folien: Folie[] = [];
  const datum = (opt.datum ?? new Date()).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  /* ── 1 · DECKBLATT ────────────────────────────────────────────────
     Der Satz des Kunden steht hier im Original. Er soll beim Aufschlagen SEINE Worte
     lesen, nicht unsere Überschrift — das ist der Beweis, dass zugehört wurde. */
  folien.push({ art: "deckblatt", ziel: String(opt.eingabe ?? "").trim() || "Deine Strategie", datum });

  /* ── 2 · BEFUND ───────────────────────────────────────────────── */
  if (!LEER(plan.befund)) {
    folien.push({ art: "aussage", kicker: "BEFUND", text: String(plan.befund), ton: "still" });
  }

  /* ── 3 · DER HOOK ─────────────────────────────────────────────────
     Die wichtigste Folie des Satzes, deshalb allein und in Gold. */
  if (!LEER(plan.hook)) {
    folien.push({
      art: "aussage", kicker: "DER HOOK", ton: "gold",
      text: String(plan.hook),
      fussnote: LEER(plan.hookWarum) ? undefined : String(plan.hookWarum),
    });
  }

  /* ── 4 · ZIELGRUPPE ───────────────────────────────────────────── */
  const zg = (plan.zielgruppe ?? []).map(z => String(z ?? "").trim()).filter(Boolean);
  if (zg.length) {
    inHaeppchen(zg, 6).forEach((teil, i) => folien.push({
      art: "punkte", kicker: "ZIELGRUPPE",
      titel: i === 0 ? "Wen die Anzeige erreicht" : "Wen die Anzeige erreicht (Fortsetzung)",
      punkte: teil,
    }));
  }

  /* ── 5 · DIE MOTIVE ───────────────────────────────────────────── */
  const motive = (plan.motive ?? []).filter(m => !LEER(m?.text) || !LEER(m?.idee));
  if (motive.length) {
    inHaeppchen(motive, 3).forEach((teil, i) => folien.push({
      art: "felder", kicker: "DIE MOTIVE",
      titel: i === 0 ? "Was auf dem Bild passiert" : "Was auf dem Bild passiert (Fortsetzung)",
      felder: teil.map((m, j) => ({
        name: `Motiv ${i * 3 + j + 1}`,
        wert: [String(m.text ?? "").trim(), String(m.idee ?? "").trim()].filter(Boolean).join("\n"),
      })),
    }));
  }

  /* ── 6 · DIE STRECKE ──────────────────────────────────────────── */
  const schritte = (plan.trichter ?? []).map(t => String(t ?? "").trim()).filter(Boolean);
  if (schritte.length) {
    folien.push({
      art: "strecke", kicker: "DIE STRECKE", titel: "Was nach dem Klick passiert",
      schritte,
      fussnote: "Oben kommen viele an, unten bleiben die, die ihre Angaben hinterlassen.",
    });
  }

  /* ── 7 · DIE ANZEIGENTEXTE ────────────────────────────────────────
     Als beschriftete Felder, weil bei Meta dieselben Felder stehen: abtippen, fertig. */
  const az = plan.anzeige;
  const anzeigenFelder = ([
    ["Primärtext", az?.primaer], ["Überschrift", az?.ueberschrift],
    ["Beschreibung", az?.beschreibung], ["Schaltfläche", az?.knopf],
  ] as [string, string | undefined][])
    .filter(([, w]) => !LEER(w))
    .map(([name, wert]) => ({ name, wert: String(wert) }));
  if (anzeigenFelder.length) {
    folien.push({
      art: "felder", kicker: "DIE ANZEIGE", titel: "Deine Anzeigentexte",
      felder: anzeigenFelder,
      fussnote: "Dieselben vier Felder findest du im Werbeanzeigenmanager wieder.",
    });
  }

  /* ── 8 · DIE BAUTEILE ─────────────────────────────────────────────
     VOR dem Angebot. Wer zuerst den Preis liest, hält die Anleitung für Werbung; wer
     zuerst die Anleitung liest, sieht im Preis eine Abkürzung. */
  const teile = (plan.bauteile ?? []).filter(b => !LEER(b?.was));
  if (teile.length) {
    inHaeppchen(teile, 3).forEach((gruppe, i) => folien.push({
      art: "bauteile", kicker: "SELBER BAUEN",
      titel: i === 0 ? "Was du brauchst — und wie du es selbst baust" : "Was du brauchst (Fortsetzung)",
      teile: gruppe.map((b, j) => ({
        nr: i * 3 + j + 1,
        was: String(b.was), wozu: b.wozu || undefined,
        selbst: b.selbst || undefined, aufwand: b.aufwand || undefined,
      })),
    }));
  }

  /* ── 9 · BUDGET ───────────────────────────────────────────────────
     Mit der Trennung im selben Bild: ohne sie liest es sich wie unser Preis. */
  if (!LEER(plan.budget)) {
    folien.push({
      art: "aussage", kicker: "WERBEBUDGET", ton: "still", text: String(plan.budget),
      fussnote: "Dieses Geld zahlst du direkt an Facebook, in der Höhe, die du selbst bestimmst. Es ist kein Betrag, den wir in Rechnung stellen.",
    });
  }

  /* ── 10 · WAS DAGEGEN SPRICHT ─────────────────────────────────────
     Bleibt drin, GERADE weil sie unangenehm ist. Ein Plan ohne Einwand ist Werbung. */
  if (!LEER(plan.warnung)) {
    folien.push({ art: "aussage", kicker: "WAS DAGEGEN SPRICHT", ton: "still", text: String(plan.warnung) });
  }

  /* ── 11 · DAS ANGEBOT ─────────────────────────────────────────── */
  folien.push({
    art: "angebot", kicker: "ODER WIR BAUEN ES", titel: "Du musst das nicht selbst machen.",
    text: `Dashboard mit deinen Hooks und Anzeigentexten zum Herunterladen, die Motive erzeugt, der Trichter fertig samt Link. ${opt.einstieg ?? ""} einmalig. Das Werbebudget zahlst du weiter selbst und direkt an Facebook.`.replace(/\s+/g, " ").trim(),
    telefon: opt.telefon || undefined,
    mail: opt.mail || undefined,
  });

  /* ── 12 · DAS PROTOKOLL ───────────────────────────────────────────
     GANZ HINTEN. Wer den Satz aufschlägt, will das Ergebnis sehen, nicht erst seine
     eigenen Sätze noch einmal lesen. Als Beleg gehört es trotzdem hinein: es ist der
     Unterschied zwischen „die KI hat das gesagt" und „das steht da, weil ich das
     gesagt habe". */
  const runden = (opt.runden ?? [])
    .filter(r => !LEER(r?.frage))
    .map(r => ({ frage: String(r.frage), antwort: String(r.antwort ?? "").trim() || "(übersprungen)" }));
  if (runden.length || !LEER(opt.eingabe)) {
    inHaeppchen(runden, 3).forEach((gruppe, i) => folien.push({
      art: "protokoll", kicker: "DEIN PROTOKOLL",
      titel: i === 0 ? "Was du gesagt hast" : "Was du gesagt hast (Fortsetzung)",
      erste: i === 0,
      eingabe: i === 0 ? (opt.eingabe || undefined) : undefined,
      runden: gruppe,
    }));
    /* Sonderfall: Eingabe vorhanden, aber keine Runden — sonst fiele der Beleg weg. */
    if (!runden.length) {
      folien.push({ art: "protokoll", kicker: "DEIN PROTOKOLL", titel: "Was du gesagt hast", erste: true, eingabe: opt.eingabe, runden: [] });
    }
  }

  /* ── 13 · SCHLUSS ─────────────────────────────────────────────── */
  folien.push({
    art: "schluss",
    text: "Dieser Plan ist in einem Gespräch mit VersusForge entstanden — aus deinen eigenen Angaben, nicht aus einer Vorlage. Er beschreibt eine Kampagne, er ist noch keine: Es läuft nichts, solange sie niemand einrichtet.",
  });

  return folien;
}
