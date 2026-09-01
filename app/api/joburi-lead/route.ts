import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { leseLead, schreibeLead, leseAlleLeads, type JoburiLead } from "@/lib/joburi-leads";
import { leseStellen } from "@/lib/joburi-store";
import { gehaltMitte, gehaltGueltig, gehaltGrenzen, waehrungFuerLand, RON_JE_EUR, type Waehrung } from "@/lib/joburi-gehalt";
import { berufZuBereich } from "@/lib/joburi-beruf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DER LEAD DES JOBURI-TRICHTERS.
 *
 * POST { schritt: "antworten", deutsch, arbeitsform, ziel, utm, device } → legt an, gibt id
 * POST { schritt: "kontakt", id, email, vorname?, telefon?, kontaktOk }  → die Adresse
 * POST { schritt: "weitergabe", id, stelleId, ja }                       → Zustimmung je Stelle
 * GET  ?alle=1 (Admin) → alle Leads für die Auswertung
 *
 * DIE DREI ANTWORTEN WERDEN VOR DER ADRESSE GESPEICHERT. Wer danach aussteigt, ist trotzdem
 * gezählt — und nur so lässt sich sagen, ob die Anzeige die richtigen Leute bringt oder ob
 * sie an der Adresse scheitern (Owner 31.08.2026: die Kennzahl ist die ganze Kette).
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const MAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Median statt Durchschnitt — ein einziger Ausreisser („über 3.800 €") verschöbe den
    Durchschnitt und damit die Aussage, die wir einer Firma gegenüber machen. Nullen sind
    fehlende Antworten und fliegen raus, nicht etwa „verdient nichts". */
function median(werte: number[]): number | null {
  const w = werte.filter(n => n > 0).sort((a, b) => a - b);
  if (!w.length) return null;
  const m = Math.floor(w.length / 2);
  return w.length % 2 ? w[m] : Math.round((w[m - 1] + w[m]) / 2);
}

const NIVEAUS = ["A2", "B1", "B2", "C1", "C2"];
const FORMEN = ["remote", "hibrid", "birou", "egal"];
const ZIELE = ["salariu", "flexibilitate", "cariera", "intoarcere"];
/* Die vierte Antwort: aktiv suchend · offen für Angebote · passiv. Dieselben drei Wörter
   wie die Segmente auf `/recruiting` — eine Benennung für dieselbe Sache. */
const SUCHEN = ["aktiv", "offen", "passiv"];
/* Talent Market Pulse — die Antworten der Studie. Jede Liste ist ein Riegel: Was nicht
   darin steht, wird verworfen statt gespeichert; sonst landet irgendwann getippter Müll in
   der Auswertung, auf die wir uns gegenüber Firmen berufen. */
const LAENDER = ["ro", "de", "at", "alta"];
/* Die Gehälter sind seit dem 31.08. getippte Zahlen und keine Auswahl mehr — der Riegel ist
   deshalb kein Listenvergleich, sondern `gehaltGueltig` (siehe lib/joburi-gehalt.ts). Die
   alten Stufen-Schlüssel gelten dort weiter, damit die ersten 60 Antworten zur Studie
   gehören bleiben. */
/* Als Spanne, nicht als Jahr — und als Riegel wie alle anderen Listen hier. */
const ALTER = ["u25", "25-34", "35-44", "45-54", "55+"];
const STUDII = ["gimnaziu", "liceu", "profesionala", "licenta", "master"];

/* ── TALENT NETWORK: die Riegel der acht Schritte ──
   Jede Liste ist bewusst geschlossen. Was nicht darin steht, wird verworfen statt
   gespeichert — sonst landet getippter Müll in der Auswertung, auf die wir uns gegenüber
   Firmen berufen. */
const NIVEAUS_TN = ["a1", "a2", "b1", "b2", "c1", "c2", "native"];
const SITUATIONEN = ["employed_satisfied", "employed_open", "actively_searching", "unemployed", "self_employed", "other"];
const MOTIVE = ["salary", "employer", "management", "less_stress", "hours", "remote", "position",
                "work_itself", "career", "culture", "security", "germany", "benefits", "other"];
const MAERKTE = ["romania", "germany", "remote", "eu", "relocate_ro", "no_relocation"];
const GESPRAECH = ["yes", "probably", "maybe", "not_now"];
const BELASTUNG = ["shifts", "standing", "physical", "physical_experience", "office"];
const GLEICH = ["yes", "depends", "no"];
const FAKTOREN = ["salariu", "remote", "flexibilitate", "cariera", "stabilitate", "echipa"];
const RUECKKEHR = ["da", "poate", "nu"];
const BERUFSFELDER = ["suport", "it", "finante", "logistica", "inginerie", "vanzari", "sanatate", "altul"];

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const alleLeads = await leseAlleLeads();
  /**
   * DIE AUSWERTUNG SIEHT NUR ECHTE MENSCHEN (31.08.2026).
   *
   * Probelaeufe bleiben gespeichert — man kann spaeter nicht mehr pruefen, was man geloescht
   * hat —, aber jede Zahl unterhalb rechnet ohne sie. Sonst berichtete die Studie unsere
   * eigenen Klicks als Marktdaten.
   */
  const leads = alleLeads.filter(l => !l.test);
  /**
   * DIE KENNZAHL, DIE ZÄHLT (Owner 31.08.2026): „100 € Meta-Budget → 35 Leads → 18 C1/C2 →
   * 9 mit Interesse → 4 qualifizierte Kandidaten." Sie steht hier fertig gerechnet, damit
   * sie niemand von Hand aus einer Liste zusammensuchen muss.
   */
  const summe = {
    gesamt: leads.length,
    mitAdresse: leads.filter(l => !!l.email).length,
    hoch: leads.filter(l => l.deutsch === "C1" || l.deutsch === "C2").length,
    mitInteresse: leads.filter(l => (l.weitergaben ?? []).some(w => w.ja)).length,
    mitCv: leads.filter(l => !!l.cvPath).length,
    /* DER SATZ FÜR DIE AKQUISE: Wie viele dieser Leute hätte ein Jobportal nie gesehen?
       (Owner 31.08.2026 — der zentrale Kennwert gegenüber Recruitern.) */
    aktivSuchend: leads.filter(l => l.suche === "aktiv").length,
    offenFuerAngebote: leads.filter(l => l.suche === "offen").length,
    passiv: leads.filter(l => l.suche === "passiv").length,
    /* TALENT MARKET PULSE: die eine Zahl, die kein Jobportal hat — ab wann jemand wechselt.
       Der Median, nicht der Durchschnitt: Ein einziger Ausreisser mit „3000+" verschöbe den
       Durchschnitt und damit die Aussage, die wir einer Firma gegenüber machen. */
    mitGehalt: leads.filter(l => !!l.wechselGehalt).length,
    gehaltMedian: median(leads.map(l => gehaltMitte(l.wechselGehalt))),

    /* ── WAS SIE HEUTE VERDIENEN, UND DER SPRUNG (Owner 31.08.2026) ──
       „ab 2.000 €" allein ist keine Aussage: Es kann ein Schritt sein oder ein Traum. Erst
       gegen das heutige Gehalt gehalten wird daraus die Zahl, für die eine Firma zahlt —
       „C1-Sprecher in Rumänien verdienen im Median X und wechseln ab Y".

       DER SPRUNG WIRD JE PERSON GERECHNET, NICHT ALS DIFFERENZ DER BEIDEN MEDIANE. Die
       beiden Mediane stammen sonst aus verschiedenen Teilmengen (nicht jeder beantwortet
       beides), und ihre Differenz gehörte keinem einzigen echten Menschen. */
    mitJetztGehalt: leads.filter(l => !!l.jetztGehalt).length,
    jetztMedian: median(leads.map(l => gehaltMitte(l.jetztGehalt))),
    mitBeidenGehaeltern: leads.filter(l => l.jetztGehalt && l.wechselGehalt).length,
    sprungMedian: median(leads
      .filter(l => l.jetztGehalt && l.wechselGehalt)
      .map(l => gehaltMitte(l.wechselGehalt) - gehaltMitte(l.jetztGehalt))),

    /* DIE LÜGEN-PROBE (Owner 31.08.2026: „hier lügen sie alle. Wenn sie sagen Rumänien und
       sagen sie verdienen 2500, dann ist das eine Lüge").
       Ausserhalb der IT ist die oberste rumänische Stufe („über 1.600 € netto") selten —
       wer sie wählt, ist entweder gut bezahlt oder er schmückt. Die Zeilen werden NICHT
       gelöscht: Wegwerfen, was nicht ins Bild passt, wäre gefälschte Statistik. Sie stehen
       hier als eigene Zahl, damit sich jede Aussage auch ohne sie nachrechnen lässt.
       Der Median trägt den Rest: Ein paar Schmücker verschieben ihn kaum, einen Durchschnitt
       hätten sie zerlegt. */
    roOberste: leads.filter(l => l.land === "ro" && (l.jetztGehalt === "g2500" || l.jetztGehalt === "g3000")).length,
    roObersteOhneIt: leads.filter(l => l.land === "ro" && (l.jetztGehalt === "g2500" || l.jetztGehalt === "g3000") && l.berufsfeld !== "it").length,

    /* Das Alter — die Antwort auf „war die Altersgrenze in der Anzeige richtig?". */
    /* Der Abschluss — mit Deutschniveau und Beruf die Angabe, nach der Firmen filtern. */
    mitStudii: leads.filter(l => !!l.studii).length,
    studiiVerteilung: STUDII.reduce((a, k) => {
      a[k] = leads.filter(l => l.studii === k).length; return a;
    }, {} as Record<string, number>),

    mitAlter: leads.filter(l => !!l.alter).length,
    alterVerteilung: ["u25", "25-34", "35-44", "45-54", "55+"].reduce((a, k) => {
      a[k] = leads.filter(l => l.alter === k).length; return a;
    }, {} as Record<string, number>),
    /* Und die Gegenprobe zur Grenze: Wie gut ist Deutsch bei den Ausgeschlossenen? */
    hoch55plus: leads.filter(l => l.alter === "55+" && (l.deutsch === "C1" || l.deutsch === "C2")).length,
  };
  /* `proben` steht daneben, damit sichtbar bleibt, wie viel beim Bauen entstanden ist. */
  return NextResponse.json({ ok: true, summe, leads, proben: alleLeads.length - leads.length });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const schritt = s(body.schritt, 20);

  /**
   * NOTIZ ZU EINEM KANDIDATEN — nur für uns, und nur mit Admin-Recht.
   * Hier landet, was auf Rückfrage herauskommt. Sie gehört ausdrücklich NICHT in die Studie
   * und nie zu einem Arbeitgeber: Es ist unsere Arbeitsnotiz, keine Eigenschaft der Person.
   */
  if (schritt === "notiz") {
    if (!(await isAdminRequest(request))) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }
    const id = s(body.id, 60);
    const alt = id ? await leseLead(id) : null;
    if (!alt) return NextResponse.json({ error: "Kandidat nicht gefunden." }, { status: 404 });
    const lead: JoburiLead = { ...alt, notiz: s(body.notiz, 600), aktualisiertAm: new Date().toISOString() };
    if (!(await schreibeLead(lead))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* ── 1 · Die drei Klickfragen — noch ohne jede persönliche Angabe ── */
  if (schritt === "antworten") {
    const deutsch = s(body.deutsch, 2).toUpperCase();
    const form = s(body.arbeitsform, 10).toLowerCase();
    const ziel = s(body.ziel, 20).toLowerCase();
    const suche = s(body.suche, 10).toLowerCase();
    /* War früher ein Code aus vier Werten (`ro`/`de`/`at`/`alta`), ist seit der
       Generalisierung (freie Länder-Eingabe mit Autovervollständigung) ein Freitext wie
       „Deutschland" — kein `.toLowerCase()`/Riegel mehr, sonst fällt jeder getippte
       Ländername durch den alten Vier-Werte-Filter und wird nie gespeichert. */
    const land = s(body.land, 60);
    const gehalt = s(body.wechselGehalt, 8);
    const jetzt = s(body.jetztGehalt, 8);
    const alter = s(body.alter, 6);
    const studii = s(body.studii, 14).toLowerCase();
    const test = body.test === true;

    /* ── Talent Network ── */
    const beruf = s(body.beruf, 40);
    const niveauTn = s(body.deutschniveau, 8).toLowerCase();
    const sprachen = Array.isArray(body.sprachen)
      ? body.sprachen
          .filter((x): x is { sprache?: unknown; niveau?: unknown } => !!x && typeof x === "object")
          .map(x => ({ sprache: s(x.sprache, 30), niveau: s(x.niveau, 10).toLowerCase() }))
          .filter(x => x.sprache && NIVEAUS_TN.includes(x.niveau))
          .slice(0, 12)
      : [];
    const stadt = s(body.stadt, 40);
    const situation = s(body.situation, 24).toLowerCase();
    const gleichesGehalt = s(body.gleichesGehalt, 8).toLowerCase();
    const gespraech = s(body.gespraech, 10).toLowerCase();
    const klaerung = s(body.klaerung, 400);
    const klaerungId = s(body.klaerungId, 40);
    const waehrung = (s(body.waehrung, 3).toUpperCase() === "RON" ? "RON" : "EUR") as Waehrung;
    const motive = Array.isArray(body.motive)
      ? [...new Set(body.motive.map(m => s(m, 20).toLowerCase()).filter(m => MOTIVE.includes(m)))]
      : [];
    const belastung = Array.isArray(body.belastung)
      ? [...new Set(body.belastung.map(b => s(b, 24).toLowerCase()).filter(b => BELASTUNG.includes(b)))]
      : [];
    /* Seit der Generalisierung stehen hier neben den zwei festen Werten ("remote",
       "no_relocation") beliebige, frei getippte Ländernamen — kein `.toLowerCase()`/Riegel
       mehr auf die alte Sechs-Werte-Liste, sonst fällt jedes getippte Land durch. */
    const maerkte = Array.isArray(body.maerkte)
      ? [...new Set(body.maerkte.map(m => s(m, 40)).filter(Boolean))]
      : [];
    /* Die Beträge werden gegen die Grenzen IHRER Währung geprüft: 8.000 ist in RON ein
       normales Gehalt und in Euro eine Fantasie. */
    const grenzen = gehaltGrenzen(waehrung);
    const betrag = (v: unknown) => {
      const n = Number(s(v, 8));
      return Number.isFinite(n) && n >= grenzen.min && n <= grenzen.max ? String(Math.round(n)) : "";
    };
    const gJetzt = betrag(body.gehaltJetzt);
    const gMinimum = betrag(body.gehaltMinimum);
    const rueckkehr = s(body.rueckkehr, 8).toLowerCase();
    const feld = s(body.berufsfeld, 20).toLowerCase();
    const feldFrei = s(body.berufsfeldFrei, 40);
    const faktoren = Array.isArray(body.faktoren)
      ? [...new Set(body.faktoren.map(f => s(f, 20).toLowerCase()).filter(f => FAKTOREN.includes(f)))]
      : [];
    const id = s(body.id, 60) || crypto.randomUUID();
    const alt = await leseLead(id);

    const lead: JoburiLead = {
      ...(alt ?? { id, erstelltAm: new Date().toISOString() }),
      id,
      ...(NIVEAUS.includes(deutsch) ? { deutsch: deutsch as JoburiLead["deutsch"] } : {}),
      ...(FORMEN.includes(form) ? { arbeitsform: form as JoburiLead["arbeitsform"] } : {}),
      ...(ZIELE.includes(ziel) ? { ziel: ziel as JoburiLead["ziel"] } : {}),
      ...(SUCHEN.includes(suche) ? { suche: suche as JoburiLead["suche"] } : {}),
      ...(land ? { land } : {}),
      ...(gehaltGueltig(gehalt) ? { wechselGehalt: gehalt } : {}),
      ...(gehaltGueltig(jetzt) ? { jetztGehalt: jetzt } : {}),
      ...(ALTER.includes(alter) ? { alter: alter as JoburiLead["alter"] } : {}),
      ...(STUDII.includes(studii) ? { studii: studii as JoburiLead["studii"] } : {}),
      ...(faktoren.length ? { faktoren: faktoren as NonNullable<JoburiLead["faktoren"]> } : {}),
      ...(RUECKKEHR.includes(rueckkehr) ? { rueckkehr: rueckkehr as JoburiLead["rueckkehr"] } : {}),
      /* DER BERUF KOMMT JETZT ALS TEXT (31.08.2026). Gespeichert wird BEIDES: sein Wortlaut,
         weil er den Lead ausmacht, und der abgeleitete Bereich, weil die Studie zählbare
         Zeilen braucht. Die Zuordnung ist eine Stichwortliste, kein bezahltes Modell —
         dieselbe Eingabe ergibt in einem halben Jahr dieselbe Zeile. */
      ...(feldFrei ? { berufsfeldFrei: feldFrei, berufsfeld: berufZuBereich(feldFrei) } : {}),
      /* Der Altbestand schickt weiter eine Kachel; die gilt unverändert. */
      ...(!feldFrei && BERUFSFELDER.includes(feld) ? { berufsfeld: feld } : {}),
      /* Der Trichter schickt seit dem 31.08. die acht Antworten. Wer nur einzelne Felder
         nachreicht, überschreibt die anderen nicht — deshalb jedes für sich. */
      ...(beruf ? { beruf, berufsfeld: berufZuBereich(beruf), profileVersion: 2 as const } : {}),
      ...(NIVEAUS_TN.includes(niveauTn) ? { deutschniveau: niveauTn } : {}),
      ...(sprachen.length ? { sprachen } : {}),
      ...(s(body.kunde, 60) ? { kunde: s(body.kunde, 60) } : {}),
      ...(stadt ? { stadt } : {}),
      ...(SITUATIONEN.includes(situation) ? { situation: situation as JoburiLead["situation"] } : {}),
      ...(motive.length ? { motive } : {}),
      ...(gJetzt ? { gehaltJetzt: gJetzt } : {}),
      ...(gMinimum ? { gehaltMinimum: gMinimum, waehrung, kurs: RON_JE_EUR } : {}),
      ...(GLEICH.includes(gleichesGehalt) ? { gleichesGehalt: gleichesGehalt as JoburiLead["gleichesGehalt"] } : {}),
      ...(maerkte.length ? { maerkte } : {}),
      ...(belastung.length ? { belastung } : {}),
      ...(klaerung ? { klaerung, klaerungId } : {}),
      ...(GESPRAECH.includes(gespraech) ? { gespraech: gespraech as JoburiLead["gespraech"] } : {}),
      ...(test ? { test: true } : {}),
      ...(s(body.device, 80) ? { device: s(body.device, 80) } : {}),
      ...(s(body.lang, 5) ? { lang: s(body.lang, 5) } : {}),
      ...(body.utm && typeof body.utm === "object" ? { utm: body.utm as Record<string, string> } : {}),
    };
    if (!(await schreibeLead(lead))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    return NextResponse.json({ ok: true, id });
  }

  /* ── 2 · Die Adresse — mit der Einwilligung zur KONTAKTAUFNAHME, nicht zur Weitergabe ── */
  if (schritt === "kontakt") {
    const id = s(body.id, 60);
    const lead = await leseLead(id);
    if (!lead) return NextResponse.json({ error: "Sesiune necunoscută.", code: "lead-weg" }, { status: 404 });

    const email = s(body.email, 200).toLowerCase();
    if (!MAIL_OK.test(email)) return NextResponse.json({ error: "E-mail invalid.", code: "mail" }, { status: 400 });
    if (body.kontaktOk !== true) return NextResponse.json({ error: "Acord lipsă.", code: "haken" }, { status: 400 });

    const jetzt = new Date().toISOString();
    const neu: JoburiLead = {
      ...lead,
      email,
      ...(s(body.vorname, 60) ? { vorname: s(body.vorname, 60) } : {}),
      ...(s(body.telefon, 40) ? { telefon: s(body.telefon, 40) } : {}),
      kontaktOk: true,
      kontaktOkAm: lead.kontaktOkAm || jetzt,
    };
    if (!(await schreibeLead(neu))) return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  /* ── 3 · Die Zustimmung für EINE Stelle ── */
  if (schritt === "weitergabe") {
    const id = s(body.id, 60);
    const lead = await leseLead(id);
    if (!lead) return NextResponse.json({ error: "Sesiune necunoscută.", code: "lead-weg" }, { status: 404 });
    const stelleId = s(body.stelleId, 60);
    if (!stelleId) return NextResponse.json({ error: "Job lipsă." }, { status: 400 });

    /* Titel und Firma werden MITGESCHRIEBEN, nicht nur die Kennung: Die Stelle kann später
       geändert oder gelöscht werden — die Einwilligung galt aber dieser einen. */
    const stelle = (await leseStellen()).find(x => x.id === stelleId);
    const eintrag = {
      stelleId, ja: body.ja === true, am: new Date().toISOString(),
      ...(stelle?.titel ? { titel: stelle.titel } : {}),
      ...(stelle?.firma ? { firma: stelle.firma } : {}),
    };
    const rest = (lead.weitergaben ?? []).filter(w => w.stelleId !== stelleId);
    if (!(await schreibeLead({ ...lead, weitergaben: [...rest, eintrag] }))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  /* ── 4 · Der freiwillige Lebenslauf ── */
  if (schritt === "cv") {
    const id = s(body.id, 60);
    const lead = await leseLead(id);
    if (!lead) return NextResponse.json({ error: "Sesiune necunoscută.", code: "lead-weg" }, { status: 404 });
    const cvPath = s(body.cvPath, 300);
    if (!cvPath) return NextResponse.json({ error: "CV lipsă." }, { status: 400 });
    if (!(await schreibeLead({ ...lead, cvPath, cvName: s(body.cvName, 200) || lead.cvName, ...(s(body.davidId, 60) ? { davidId: s(body.davidId, 60) } : {}) }))) {
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Schritt unbekannt." }, { status: 400 });
}
