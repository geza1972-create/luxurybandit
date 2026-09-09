import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

/**
 * DER PLAN ZUM MITNEHMEN (Owner 08.09.2026, nach dem ersten vollständigen Testlauf: „Was
 * bekommt der User? Eine PDF? Ein Skript? Wie sieht es aus?" — Antwort damals: einen
 * Bildschirm. Sonst nichts).
 *
 * WARUM DAS ZU WENIG WAR: Wer einen Eventraum vermietet oder eine Praxis führt, entscheidet
 * das selten allein. Er will den Plan seinem Partner zeigen, seinem Chef, seiner Frau. Ohne
 * etwas zum Weiterschicken stirbt er im Browser des einen Menschen, der ihn gesehen hat —
 * und genau dieser Mensch ist selten der, der unterschreibt.
 *
 * WEISSER GRUND, NICHT SCHWARZER. Die Seiten im Netz sind schwarz, und die Marke lebt davon.
 * Ein Dokument ist aber kein Bildschirm: Es wird ausgedruckt, weitergeleitet, in eine Mappe
 * gelegt. Ganzflächig schwarz ist beim Druck unbrauchbar. Die Marke trägt hier das Kopfband
 * und das Gold — dieselbe Handschrift, anderes Material.
 *
 * DIE KÄSTEN SIND GEZEICHNET, NICHT GETIPPT. Im Netz ist der Trichter aus Zeichen gebaut
 * (`┌ ─ ┐`). pdf-lib setzt Standardschriften in WinAnsi, und darin gibt es diese Zeichen
 * nicht — sie würden als Punkte erscheinen. Also echte Rechtecke: dieselbe Aussage (er
 * verengt sich), sauberer im Druck.
 *
 * KEINE ERFUNDENEN ZAHLEN. Es steht nur drin, was im Plan steht. Leere Felder werden
 * weggelassen, nicht gefüllt.
 */

const A4 = { b: 595.28, h: 841.89 };
const RAND = 54;
const BREITE = A4.b - RAND * 2;

const GOLD = rgb(0.96, 0.81, 0.32);
const SCHWARZ = rgb(0.07, 0.07, 0.07);
const GRAU = rgb(0.42, 0.42, 0.42);
const LINIE = rgb(0.85, 0.85, 0.85);

const ERSATZ: Record<string, string> = {
  "’": "'", "‘": "'", "“": '"', "”": '"', "„": '"',
  "–": "-", "…": "...", " ": " ", " ": " ",
  "‑": "-", "−": "-", "­": "",
};

/** Alles, was die Standardschrift nicht kennt, wird ersetzt statt zu einem Absturz. */
function sicher(text: string): string {
  let t = String(text ?? "").replace(/[\r\t]/g, " ");
  t = t.replace(/./gu, ch => ERSATZ[ch] ?? ch);
  return t.replace(/./gu, ch => {
    const c = ch.codePointAt(0) ?? 0;
    if (ch === "\n" || (c >= 32 && c <= 0xff && c !== 0x7f)) return ch;
    const nackt = ch.normalize("NFD").replace(/\p{M}+/gu, "");
    const n = nackt.codePointAt(0) ?? 0;
    return nackt && n >= 32 && n <= 0xff ? nackt : "-";
  });
}

function umbrechen(text: string, font: PDFFont, groesse: number, maxBreite: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of sicher(text).split("\n")) {
    if (!absatz.trim()) { zeilen.push(""); continue; }
    let zeile = "";
    for (const wort of absatz.split(/\s+/)) {
      const probe = zeile ? `${zeile} ${wort}` : wort;
      if (font.widthOfTextAtSize(probe, groesse) <= maxBreite || !zeile) zeile = probe;
      else { zeilen.push(zeile); zeile = wort; }
    }
    if (zeile) zeilen.push(zeile);
  }
  return zeilen;
}

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

type Stift = {
  doc: PDFDocument;
  seite: PDFPage;
  y: number;
  fett: PDFFont;
  normal: PDFFont;
};

export async function planAlsPdf(plan: VersusForgePlan, opt: { titel?: string; datum?: Date; einstieg?: string; eingabe?: string; runden?: { frage?: string; antwort?: string }[]; telefon?: string; mail?: string } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fett = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const s: Stift = { doc, seite: doc.addPage([A4.b, A4.h]), y: 0, fett, normal };

  /** Das Kopfband mit der Wortmarke — auf jeder Seite, damit auch Seite 3 zuzuordnen ist. */
  const kopf = (seite: PDFPage) => {
    seite.drawRectangle({ x: 0, y: A4.h - 92, width: A4.b, height: 92, color: SCHWARZ });
    /* ZWEIFARBIG UND NIE IN EINER ANDEREN SCHRIFT (Owner 08.09.2026: „du änderst nie die
       Schriftart von VersusForge", „keine Serifenschrift"). Versus weiss, Forge gold (gedreht 08.09.2026 nach dem Bildentwurf des Owners),
       Punkt gold — dieselbe Aufteilung wie im Netz. */
    const gr = 22;
    let x = RAND;
    seite.drawText("Versus", { x, y: A4.h - 56, size: gr, font: fett, color: rgb(1, 1, 1) });
    x += fett.widthOfTextAtSize("Versus", gr);
    seite.drawText("Forge", { x, y: A4.h - 56, size: gr, font: fett, color: GOLD });
    x += fett.widthOfTextAtSize("Forge", gr);
    seite.drawText(".", { x, y: A4.h - 56, size: gr, font: fett, color: GOLD });
    /* Die Markenzeile, gesperrt wie im Netz — dieselben Wörter, dieselbe Anmutung. */
    let mx = RAND;
    for (const ch of "STRATEGY WINS MORE THAN ADS.") {
      seite.drawText(ch, { x: mx, y: A4.h - 74, size: 7.5, font: fett, color: rgb(0.55, 0.55, 0.55) });
      mx += fett.widthOfTextAtSize(ch, 7.5) + 1.4;
    }
    const d = (opt.datum ?? new Date()).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    const rechts = `Dein Plan · ${d}`;
    seite.drawText(sicher(rechts), {
      x: A4.b - RAND - normal.widthOfTextAtSize(sicher(rechts), 10),
      y: A4.h - 52, size: 10, font: normal, color: rgb(0.65, 0.65, 0.65),
    });
  };

  kopf(s.seite);
  s.y = A4.h - 92 - 40;

  /** Sorgt dafür, dass `hoehe` Punkte noch auf die Seite passen — sonst neue Seite. */
  const platz = (hoehe: number) => {
    if (s.y - hoehe > RAND + 30) return;
    s.seite = doc.addPage([A4.b, A4.h]);
    kopf(s.seite);
    s.y = A4.h - 92 - 40;
  };

  const ueberschrift = (t: string) => {
    platz(34);
    /* Gesperrte Versalien in Gold — dieselbe Marke wie die Abschnittstitel im Netz. */
    const gr = 9;
    let x = RAND;
    for (const ch of sicher(t.toUpperCase())) {
      s.seite.drawText(ch, { x, y: s.y, size: gr, font: fett, color: GOLD });
      x += fett.widthOfTextAtSize(ch, gr) + 1.6;
    }
    s.y -= 8;
    s.seite.drawLine({ start: { x: RAND, y: s.y }, end: { x: RAND + BREITE, y: s.y }, thickness: 0.75, color: LINIE });
    s.y -= 18;
  };

  const absatz = (t: string, o: { groesse?: number; font?: PDFFont; farbe?: typeof SCHWARZ; einzug?: number } = {}) => {
    const gr = o.groesse ?? 11;
    const f = o.font ?? normal;
    const x = RAND + (o.einzug ?? 0);
    for (const zeile of umbrechen(t, f, gr, BREITE - (o.einzug ?? 0))) {
      platz(gr * 1.5);
      if (zeile) s.seite.drawText(zeile, { x, y: s.y, size: gr, font: f, color: o.farbe ?? SCHWARZ });
      s.y -= gr * 1.5;
    }
  };

  const punkt = (t: string) => {
    platz(18);
    s.seite.drawCircle({ x: RAND + 3, y: s.y + 3.5, size: 2, color: GOLD });
    absatz(t, { einzug: 16, groesse: 10.5 });
    s.y -= 3;
  };

  /* ── BEFUND ───────────────────────────────────────────────────────── */
  if (plan.befund) { ueberschrift("Befund"); absatz(plan.befund); s.y -= 16; }

  /* ── DER HOOK: das Herzstück, deshalb gross und mit Rahmen ─────────── */
  if (plan.hook) {
    const zeilen = umbrechen(plan.hook, fett, 19, BREITE - 36);
    const hoehe = 34 + zeilen.length * 26 + (plan.hookWarum ? 30 : 0);
    platz(hoehe + 20);
    ueberschrift("Der Hook");
    s.seite.drawRectangle({ x: RAND, y: s.y - hoehe + 20, width: BREITE, height: hoehe, color: SCHWARZ });
    let yy = s.y - 8;
    for (const z of zeilen) { s.seite.drawText(z, { x: RAND + 18, y: yy, size: 19, font: fett, color: rgb(1, 1, 1) }); yy -= 26; }
    if (plan.hookWarum) {
      for (const z of umbrechen(plan.hookWarum, normal, 9.5, BREITE - 36).slice(0, 2)) {
        s.seite.drawText(z, { x: RAND + 18, y: yy - 2, size: 9.5, font: normal, color: rgb(0.68, 0.68, 0.68) });
        yy -= 13;
      }
    }
    s.y = s.y - hoehe + 4;
    s.y -= 22;
  }

  /* ── ZIELGRUPPE ───────────────────────────────────────────────────── */
  if (plan.zielgruppe?.length) {
    ueberschrift("Wen die Anzeige erreicht");
    plan.zielgruppe.filter(Boolean).forEach(z => punkt(z));
    s.y -= 14;
  }

  /* ── MOTIVE ───────────────────────────────────────────────────────── */
  if (plan.motive?.length) {
    ueberschrift("Die Motive");
    plan.motive.forEach((m, i) => {
      if (!m?.text && !m?.idee) return;
      platz(56);
      if (m.text) {
        absatz(`${i + 1})  "${m.text}"`, { font: fett, groesse: 12 });
        s.y -= 2;
      }
      if (m.idee) absatz(m.idee, { groesse: 10, farbe: GRAU, einzug: 16 });
      s.y -= 12;
    });
    s.y -= 4;
  }

  /* ── DER TRICHTER, GEZEICHNET ─────────────────────────────────────── */
  const schritte = (plan.trichter ?? []).filter(Boolean);
  if (schritte.length) {
    ueberschrift("Die Strecke dahinter");
    schritte.forEach((t, i) => {
      /* Je Schritt schmaler — die Verengung IST die Aussage: oben kommen viele an,
         unten bleiben die, die ihre Angaben hinterlassen. */
      const breite = BREITE - i * (BREITE * 0.055);
      const x = RAND + (BREITE - breite) / 2;
      const zeilen = umbrechen(t, normal, 10, breite - 28);
      const hoehe = 22 + zeilen.length * 14;
      platz(hoehe + 26);
      s.seite.drawRectangle({
        x, y: s.y - hoehe + 12, width: breite, height: hoehe,
        borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.9, color: rgb(0.985, 0.985, 0.985),
      });
      s.seite.drawText(`${i + 1}/${schritte.length}`, { x: x + 14, y: s.y, size: 8.5, font: fett, color: GOLD });
      let yy = s.y - 13;
      for (const z of zeilen) { s.seite.drawText(z, { x: x + 14, y: yy, size: 10, font: normal, color: SCHWARZ }); yy -= 14; }
      s.y = s.y - hoehe + 6;
      if (i < schritte.length - 1) {
        /* Der Pfeil zwischen den Kästen: Linie plus Spitze, mittig. */
        const m = RAND + BREITE / 2;
        s.seite.drawLine({ start: { x: m, y: s.y }, end: { x: m, y: s.y - 10 }, thickness: 0.9, color: rgb(0.75, 0.75, 0.75) });
        s.seite.drawLine({ start: { x: m - 4, y: s.y - 8 }, end: { x: m, y: s.y - 13 }, thickness: 0.9, color: rgb(0.75, 0.75, 0.75) });
        s.seite.drawLine({ start: { x: m + 4, y: s.y - 8 }, end: { x: m, y: s.y - 13 }, thickness: 0.9, color: rgb(0.75, 0.75, 0.75) });
        s.y -= 22;
      }
    });
    s.y -= 24;
  }

  /* ── DIE ANZEIGENTEXTE ────────────────────────────────────────────── */
  const az = plan.anzeige;
  if (az?.primaer || az?.ueberschrift) {
    ueberschrift("Deine Anzeigentexte");
    /* In beschrifteten Feldern, nicht als Fliesstext: Wer sie bei Meta einsetzt, findet
       dort dieselben drei Felder wieder und muss nichts zuordnen. */
    ([["Primärtext", az.primaer], ["Überschrift", az.ueberschrift], ["Beschreibung", az.beschreibung], ["Schaltfläche", az.knopf]] as [string, string | undefined][])
      .filter(([, w]) => w)
      .forEach(([k, w]) => {
        const zeilen = umbrechen(String(w), normal, 11, BREITE - 28);
        const hoehe = 20 + zeilen.length * 15;
        platz(hoehe + 10);
        s.seite.drawRectangle({ x: RAND, y: s.y - hoehe + 14, width: BREITE, height: hoehe, borderColor: LINIE, borderWidth: 0.8, color: rgb(0.985, 0.985, 0.985) });
        s.seite.drawText(sicher(k.toUpperCase()), { x: RAND + 14, y: s.y + 1, size: 7.5, font: fett, color: GRAU });
        let yy = s.y - 13;
        for (const z of zeilen) { s.seite.drawText(z, { x: RAND + 14, y: yy, size: 11, font: normal, color: SCHWARZ }); yy -= 15; }
        s.y = s.y - hoehe + 4;
        s.y -= 14;
      });
    s.y -= 8;
  }

  /* ── DIE BAUANLEITUNG ─────────────────────────────────────────────
     STEHT VOR DEM ANGEBOT. Wer zuerst den Preis liest, hält die Anleitung für Werbung; wer
     zuerst die Anleitung liest, sieht im Preis eine Abkürzung. */
  const teile = (plan.bauteile ?? []).filter(b => b?.was);
  if (teile.length) {
    ueberschrift("Was du brauchst - und wie du es selbst baust");
    absatz("Alles hier kannst du allein bauen. Die Anleitung ist ernst gemeint, mit ehrlichem Aufwand je Stück.", { groesse: 10, farbe: GRAU });
    s.y -= 14;
    teile.forEach((b, i) => {
      platz(70);
      const kopfzeile = `${i + 1}.  ${b.was}`;
      s.seite.drawText(sicher(kopfzeile), { x: RAND, y: s.y, size: 12.5, font: fett, color: SCHWARZ });
      if (b.aufwand) {
        const a = sicher(b.aufwand);
        s.seite.drawText(a, { x: RAND + BREITE - normal.widthOfTextAtSize(a, 9), y: s.y + 1, size: 9, font: normal, color: GOLD });
      }
      s.y -= 17;
      if (b.wozu) absatz(b.wozu, { groesse: 10.5, farbe: GRAU, einzug: 18 });
      if (b.selbst) { s.y -= 3; absatz(b.selbst, { groesse: 10, einzug: 18 }); }
      s.y -= 16;
    });

    /* Das Angebot als Kasten — deutlich abgesetzt, damit niemand es für einen Teil der
       Anleitung hält. */
    const zeilen = umbrechen(
      `Dashboard mit deinen Hooks und Anzeigentexten zum Herunterladen, die Motive erzeugt, der Trichter fertig samt Link. ${opt.einstieg ?? ""} einmalig. Das Werbebudget zahlst du weiter selbst und direkt an Facebook.`,
      normal, 10.5, BREITE - 36);
    const hoehe = 40 + zeilen.length * 14;
    platz(hoehe + 12);
    s.seite.drawRectangle({ x: RAND, y: s.y - hoehe + 16, width: BREITE, height: hoehe, borderColor: GOLD, borderWidth: 1.2, color: rgb(1, 0.985, 0.93) });
    s.seite.drawText("Oder wir bauen es dir.", { x: RAND + 18, y: s.y, size: 14, font: fett, color: SCHWARZ });
    let yy = s.y - 20;
    for (const z of zeilen) { s.seite.drawText(z, { x: RAND + 18, y: yy, size: 10.5, font: normal, color: SCHWARZ }); yy -= 14; }
    s.y = s.y - hoehe + 6;
    s.y -= 22;
  }

  /* ── BUDGET ───────────────────────────────────────────────────────── */
  if (plan.budget) {
    ueberschrift("Werbebudget");
    absatz(plan.budget);
    /* DIE TRENNUNG GEHÖRT DAZU (Owner 08.09.2026): Das Budget ist NICHT unsere Zahl. Ohne
       diesen Satz liest es sich wie ein Preis, den wir verlangen. */
    s.y -= 4;
    absatz("Dieses Geld zahlst du direkt an Facebook, in der Höhe, die du selbst bestimmst. Es ist kein Betrag, den wir in Rechnung stellen.", { groesse: 9.5, farbe: GRAU });
    s.y -= 16;
  }

  /* ── WARNUNG: bleibt drin, gerade weil sie unangenehm ist ─────────── */
  if (plan.warnung) {
    ueberschrift("Was dagegen spricht");
    absatz(plan.warnung);
    s.y -= 16;
  }

  /* ── DAS PROTOKOLL ────────────────────────────────────────────────
     GANZ AM SCHLUSS, nicht am Anfang: Wer den Plan aufschlägt, will das Ergebnis sehen, nicht
     erst seine eigenen Sätze noch einmal lesen. Als Beleg gehört es trotzdem hinein — es ist
     der Unterschied zwischen „die KI hat das gesagt" und „das steht da, weil ich das gesagt
     habe". */
  const runden = (opt.runden ?? []).filter(r => r?.frage);
  if (opt.eingabe || runden.length) {
    ueberschrift("Was du gesagt hast");
    absatz("Der Plan ist daraus entstanden - nicht aus einer Vorlage.", { groesse: 10, farbe: GRAU });
    s.y -= 12;
    if (opt.eingabe) {
      absatz("DEINE EINGABE", { groesse: 8, font: fett, farbe: GOLD });
      s.y -= 2;
      absatz(opt.eingabe, { groesse: 10.5, einzug: 8 });
      s.y -= 12;
    }
    runden.forEach((r, i) => {
      platz(48);
      absatz(`${i + 1}.  ${r.frage}`, { groesse: 10, font: fett, farbe: GRAU });
      s.y -= 1;
      absatz(String(r.antwort ?? "").trim() || "(übersprungen)", { groesse: 10.5, einzug: 18 });
      s.y -= 10;
    });
    s.y -= 8;
  }

  /* ── WER DAHINTERSTEHT ────────────────────────────────────────────
     EIN MENSCH MIT NUMMER (Owner 08.09.2026: „dort bekommt er auch meine Telefonnummer und
     die E-Mail-Adresse").
 
     DIE HAUSREGEL `keine-email-adresse-auf-der-seite` GILT HIER NICHT, und der Unterschied
     ist keine Auslegung: Sie schützt vor Spam-Sammlern, die ÖFFENTLICHE Seiten abgrasen. Ein
     PDF, das nur bekommt, wer seine eigene Adresse hinterlassen hat, wird von keinem Roboter
     gelesen.
 
     UND ES IST DER PUNKT, AN DEM DER PLAN AUFHÖRT, KI ZU SEIN: Bis hierher hat eine Maschine
     geschrieben. Ab hier steht eine Nummer, unter der jemand abhebt. */
  if (opt.telefon || opt.mail) {
    platz(80);
    s.y -= 4;
    ueberschrift("Wenn du es nicht selbst bauen willst");
    absatz("Ruf an oder schreib. Es meldet sich ein Mensch, kein Agent.", { groesse: 10.5, farbe: GRAU });
    s.y -= 8;
    if (opt.telefon) { absatz(opt.telefon, { groesse: 15, font: fett }); s.y -= 2; }
    if (opt.mail) absatz(opt.mail, { groesse: 12, font: fett });
    s.y -= 18;
  }

  /* ── FUSS: was dieses Blatt IST und was es NICHT ist ──────────────── */
  platz(60);
  s.y -= 6;
  s.seite.drawLine({ start: { x: RAND, y: s.y }, end: { x: RAND + BREITE, y: s.y }, thickness: 0.75, color: LINIE });
  s.y -= 16;
  absatz("Dieser Plan ist in einem Gespräch mit VersusForge entstanden — aus deinen eigenen Angaben, nicht aus einer Vorlage. Er beschreibt eine Kampagne, er ist noch keine: Es läuft nichts, solange sie niemand einrichtet.", { groesse: 9, farbe: GRAU });
  s.y -= 4;
  absatz("VersusForge ist die Engine von LuxuryBandit — zwölf eigene KI-Produkte, im Betrieb.", { groesse: 9, farbe: GRAU });

  /* Seitenzahlen zum Schluss, wenn feststeht, wie viele es sind. */
  const seiten = doc.getPages();
  seiten.forEach((seite, i) => {
    const t = `${i + 1} / ${seiten.length}`;
    seite.drawText(t, { x: A4.b - RAND - normal.widthOfTextAtSize(t, 8.5), y: 30, size: 8.5, font: normal, color: GRAU });
  });

  return await doc.save();
}
