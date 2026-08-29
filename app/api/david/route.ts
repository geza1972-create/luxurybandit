import { NextResponse } from "next/server";
import {
  leseDavid, schreibeDavid, DAVID_DATENSCHUTZ_VERSION, DAVID_INTERESSEN,
  type DavidSitzung, type DavidNuetzlich,
} from "@/lib/david-store";
import { readKissLog, writeKissLog, type KissLogEntry } from "@/lib/try-this-look-store";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { isAdminRequest } from "@/lib/admin-auth";
import { rueckwegMailSchicken } from "@/lib/david-mail";
import { listeDavid } from "@/lib/david-store";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * DIE DATEN DER DAVID-SITZUNG — SPEICHERN, NICHT DENKEN.
 *
 * Hier läuft alles, was KEIN KI-Aufruf ist: der Lead (Vorname, E-Mail, Datenschutz-
 * bestätigung), das Feedback nach dem Bericht, die Interessen und das freiwillige
 * Werbe-Opt-in. Die KI wohnt nebenan in `/api/david-screening` — eine Route, die Geld
 * kostet, soll nichts nebenbei erledigen, was auch ohne sie geht.
 *
 * PROGRESSIV UND MERGEND, wie `/api/kandidat`: Jeder Schritt ist sein eigener POST, der
 * Server überschreibt nie ein gefülltes Feld mit einem leeren. Wer nach dem Lebenslauf
 * abbricht, bleibt trotzdem als Lead erfasst (Owner §6: „Nicht erst nach dem CV. Nicht erst
 * nach dem Screening.").
 *
 * ZEITSTEMPEL UND VERSION KOMMEN VOM SERVER, nie vom Browser — ein Häkchen im Formular ist
 * kein Beleg dafür, WANN und WOZU jemand zugestimmt hat (dieselbe Regel wie im
 * Kandidaten-Pool).
 *
 * ZWEI GETRENNTE ZUSTIMMUNGEN (Owner §5 und §30, ausdrücklich): `datenschutzBestaetigt` ist
 * die notwendige Bestätigung, um das Screening überhaupt durchführen zu dürfen.
 * `marketingOptIn` ist freiwillig und wird viel später gefragt. Sie dürfen nie zusammen in
 * EINEM Häkchen landen — deshalb stehen sie hier auch als zwei Felder mit zwei Zeitstempeln.
 */

const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Nur die Adressen, die überhaupt eine sein können — dieselbe schlichte Prüfung wie im Haus. */
const mailOk = (m: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m);

/**
 * DIE LISTE FÜR DEN ADMIN (Owner 29.08.2026: „ich brauche das auch unter Admin. Ich will
 * analysieren").
 *
 * WAS SIE BEANTWORTEN SOLL: Wo brechen Leute ab? Wie viele kommen bis zum Bericht? Wie viele
 * kaufen? Und was kostet uns das? Genau dafür trägt jede Sitzung ihren `verbrauch` — die
 * Zahlen kommen aus den Antworten von OpenAI selbst, nicht aus einer Schätzung.
 *
 * NUR FÜR ADMINS, und geprüft wie überall im Haus (`isAdminRequest`: PIN-Kopfzeile ODER
 * angemeldetes Konto auf der Admin-Liste). Hier liegen Lebensläufe und Gesprächsantworten —
 * das ist die heikelste Sammlung im ganzen Haus.
 *
 * OHNE DIE ANTWORTEN SELBST: Die Liste zeigt, DASS gesprochen wurde und wie weit, nicht was
 * jemand erzählt hat. Wer eine einzelne Sitzung wirklich lesen muss, öffnet ihren Bericht —
 * das ist eine bewusste Handlung und keine Tabelle zum Überfliegen.
 */
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const alle = await listeDavid().catch(() => []);
  const auftraege = await readKissLog().catch(() => []);
  const bezahlt = new Map(auftraege.map(e => [e.id, e]));

  const zeilen = alle.map(s => {
    const a = bezahlt.get(s.id);
    const fragen = s.fragen ?? [];
    return {
      id: s.id,
      erstelltAm: s.erstelltAm ?? "",
      aktualisiertAm: s.aktualisiertAm ?? "",
      vorname: s.vorname ?? "",
      email: s.email ?? "",
      sprache: s.sprache ?? "",
      /* WIE WEIT ER GEKOMMEN IST — die eine Zahl, die den Trichter erklärt. */
      stufe: s.report ? "bericht"
        : fragen.some(f => f.antwort) ? "gespraech"
        : (s.jobText || s.ohneStelle) ? "stelle"
        : s.cvBefund ? "lebenslauf"
        : s.email ? "lead" : "offen",
      ohneStelle: s.ohneStelle === true,
      jobTitel: s.jobTitel ?? "",
      jobOrt: s.jobOrt ?? "",
      rolle: s.cvBefund?.rolle ?? "",
      layout: s.cvBefund?.layout ?? "",
      cvFoto: s.cvBefund?.foto ?? null,
      fragenGestellt: fragen.length,
      fragenBeantwortet: fragen.filter(f => f.antwort).length,
      berichtAm: s.screeningFertigAm ?? "",
      berichtGesehenAm: s.reportGesehenAm ?? "",
      mailAm: s.berichtMailAt ?? "",
      nuetzlichkeit: s.nuetzlichkeit ?? "",
      feedback: s.feedback ?? "",
      interessen: s.interessen ?? [],
      marketingOptIn: s.marketingOptIn === true,
      /* Aus dem Auftrag: hat er gekauft, und wofür? */
      bezahlt: a?.paid === true,
      bezahltAm: a?.paidAt ?? "",
      cvName: s.cvName ?? a?.cvName ?? "",
      /* Was diese Sitzung uns gekostet hat — Aufrufe und Ausgabe-Token. */
      verbrauch: s.verbrauch ?? null,
      utm: s.utm ?? null,
    };
  }).sort((x, y) => String(y.erstelltAm).localeCompare(String(x.erstelltAm)));

  /* Eine kleine Summe spart dem Admin das Kopfrechnen. */
  const summe = {
    sitzungen: zeilen.length,
    leads: zeilen.filter(z => z.email).length,
    berichte: zeilen.filter(z => z.stufe === "bericht").length,
    kaeufe: zeilen.filter(z => z.bezahlt).length,
    ohneStelle: zeilen.filter(z => z.ohneStelle).length,
    /* Ausgabe-Token sind der teure Teil eines Aufrufs — klein und gross getrennt, weil sie
       verschieden viel kosten (gpt-5-mini gegen gpt-5). */
    tokenKleinHeraus: zeilen.reduce((n, z) => n + (z.verbrauch?.kleinHeraus ?? 0), 0),
    tokenGrossHeraus: zeilen.reduce((n, z) => n + (z.verbrauch?.grossHeraus ?? 0), 0),
    aufrufe: zeilen.reduce((n, z) => n + (z.verbrauch?.aufrufe ?? 0), 0),
  };
  return NextResponse.json({ ok: true, summe, sitzungen: zeilen });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = s(body.id, 80);
  const device = s(body.device, 80);
  if (!id) return NextResponse.json({ error: "Kennung fehlt." }, { status: 400 });

  const bestand = await leseDavid(id);
  /* WEM DIE SITZUNG GEHÖRT: Beim ersten Schreiben legt das Gerät sie an; danach darf nur
     dasselbe Gerät sie ändern. Ohne diese Prüfung könnte jeder mit geratener Kennung fremde
     Antworten überschreiben (dieselbe Sperre wie in /api/kandidat). */
  /* KONTO SCHLÄGT GERÄT — dieselbe Regel wie in /api/david-screening (28.08.2026). Wer
     angemeldet ist und dieselbe Adresse trägt, darf an seiner Sitzung arbeiten, egal von
     welchem Gerät. */
  const kontoMailD = await getSellerFromRequest(request)
    .then(k => String(k?.email ?? "").trim().toLowerCase())
    .catch(() => "");
  const seins = !!kontoMailD && kontoMailD === String(bestand?.email ?? "").trim().toLowerCase();
  if (!seins && bestand?.device && device && bestand.device !== device) {
    return NextResponse.json({ error: "Diese Sitzung gehört zu einem anderen Gerät. Melde dich mit der Adresse an, mit der du sie begonnen hast." }, { status: 403 });
  }

  const jetzt = new Date().toISOString();
  const vorname = s(body.vorname, 60);
  const email = s(body.email, 200).toLowerCase();
  if (email && !mailOk(email)) {
    return NextResponse.json({ error: "Diese E-Mail-Adresse sieht nicht vollständig aus." }, { status: 400 });
  }

  /* Die Datenschutzbestätigung lässt sich nur SETZEN, nicht zurücknehmen — ein späterer
     POST ohne das Feld darf sie nicht löschen. Wer widerrufen will, tut das über den
     Kontakt-Weg; das ist ein Vorgang für Menschen, kein Formularfeld. */
  const datenschutzNeu = body.datenschutz === true && !bestand?.datenschutzBestaetigt;

  const nuetzlichWerte: DavidNuetzlich[] = ["sehr", "nuetzlich", "teilweise", "kaum"];
  const nuetzlich = nuetzlichWerte.find(w => w === s(body.nuetzlichkeit, 20));

  const interessen = Array.isArray(body.interessen)
    ? (body.interessen as unknown[]).map(x => s(x, 40)).filter(x => (DAVID_INTERESSEN as readonly string[]).includes(x))
    : undefined;

  const marketingNeu = body.marketingOptIn === true && !bestand?.marketingOptIn;

  const naechste: DavidSitzung = {
    ...(bestand ?? { id, erstelltAm: jetzt, aktualisiertAm: jetzt }),
    id,
    device: bestand?.device || device || undefined,
    sprache: s(body.sprache, 5) || bestand?.sprache,
    vorname: vorname || bestand?.vorname,
    email: email || bestand?.email,
    datenschutzBestaetigt: bestand?.datenschutzBestaetigt || datenschutzNeu || undefined,
    datenschutzAm: bestand?.datenschutzAm || (datenschutzNeu ? jetzt : undefined),
    datenschutzVersion: bestand?.datenschutzVersion || (datenschutzNeu ? DAVID_DATENSCHUTZ_VERSION : undefined),
    /* UTM nur beim ersten Mal — spätere Schritte tragen die Werbe-Herkunft nicht mehr, und
       ein leeres Objekt darf die echte Herkunft nicht überschreiben. */
    utm: bestand?.utm ?? (body.utm && typeof body.utm === "object"
      ? Object.fromEntries(Object.entries(body.utm as Record<string, unknown>).slice(0, 8).map(([k, v]) => [s(k, 20), s(v, 120)]))
      : undefined),
    nuetzlichkeit: nuetzlich ?? bestand?.nuetzlichkeit,
    feedback: s(body.feedback, 1200) || bestand?.feedback,
    interessen: interessen ?? bestand?.interessen,
    marketingOptIn: bestand?.marketingOptIn || marketingNeu || undefined,
    marketingOptInAm: bestand?.marketingOptInAm || (marketingNeu ? jetzt : undefined),
    reportGesehenAm: body.reportGesehen === true ? (bestand?.reportGesehenAm || jetzt) : bestand?.reportGesehenAm,
    aktualisiertAm: jetzt,
  };

  const ok = await schreibeDavid(naechste);
  if (!ok) return NextResponse.json({ error: "Konnte nicht gespeichert werden." }, { status: 500 });

  /**
   * DER AUFTRAG IM KISS-LOG — OHNE IHN GIBT ES KEINEN KAUF (Fehler gefunden 28.08.2026,
   * gemeldet vom Owner mit Bild: „Auftrag nicht gefunden.").
   *
   * Der Kiss-Log ist im ganzen Haus das Besitz- und Zahlungs-Gedächtnis: `/api/resume-
   * generator` bricht in der ersten Zeile mit 404 ab, wenn zur Kennung kein Eintrag
   * existiert, und `/api/kiss-video-checkout` sucht ihn ebenfalls. Jeder andere Trichter
   * legt ihn über `/api/kiss-claim` mit `vorab: true` an — David hat das nie getan. Der
   * Kaufknopf konnte also von Anfang an nicht funktionieren; aufgefallen ist es erst, als
   * die Ergebnisseite fertig war und jemand darauf drückte.
   *
   * ER ENTSTEHT MIT DEM LEAD, NICHT MIT DEM KAUF (Owner §6: „Nicht erst nach dem CV. Nicht
   * erst nach dem Screening.") — dann liest sich die Kaufliste auch für David als Trichter:
   * E-Mail da → Lebenslauf da → bezahlt → geliefert.
   *
   * DIESELBE KENNUNG WIE DIE SITZUNG, bewusst: `kiss-claim` würde eine neue Nummer
   * vergeben, und der ganze David-Flow (Bericht, Assets, PDF) hängt an der Sitzungskennung.
   * Zwei Nummern für einen Vorgang wären die nächste Fehlerquelle.
   *
   * SCHEITERT ES, SCHEITERT NICHT DER SCHRITT: Der Besucher hat gerade seine Adresse
   * eingetippt und wartet auf sein Screening — ein Log-Eintrag ist Buchhaltung, kein Grund,
   * ihn stehen zu lassen. Beim nächsten POST wird es erneut versucht.
   */
  if (naechste.vorname && naechste.email && naechste.datenschutzBestaetigt) {
    try {
      const eintraege = await readKissLog();
      if (!eintraege.some(e => e.id === id)) {
        const neu: KissLogEntry = {
          id,
          createdAt: naechste.erstelltAm ?? jetzt,
          theme: "david",
          email: naechste.email,
          device: naechste.device || undefined,
          lang: naechste.sprache || undefined,
        } as KissLogEntry;
        await writeKissLog([neu, ...eintraege]);
      }
    } catch { /* Buchhaltung darf den Trichter nie aufhalten */ }

    /**
     * DER RÜCKWEG GEHT SOFORT RAUS (Owner 29.08.2026: „dann würde doch Sinn machen, gleich
     * einen Link zu schicken, nachdem er seine E-Mail angegeben hat, oder?").
     *
     * JETZT UND NICHT AM ENDE: Am Ende ist es zu spät für den Fall, der ihn dazu gebracht
     * hat — wer eine Fantasie-Adresse eingibt, um es „nur mal auszuprobieren", ist nach dem
     * Schliessen des Browsers unwiederbringlich weg, samt der Analyse, die ihn überzeugt
     * hätte. Jetzt hat er den Rückweg, BEVOR etwas verloren gehen kann.
     *
     * OHNE `await` UND OHNE FOLGEN: Er wartet gerade auf den nächsten Schritt. Ein langsamer
     * oder kaputter Postausgang darf ihn keine Sekunde aufhalten — die Mail ist eine
     * Zugabe, kein Teil des Trichters.
     *
     * ERST STEMPELN, DANN SCHICKEN — dieselbe Reihenfolge wie bei der Bericht-Mail: Beim
     * umgekehrten Weg klingelt es zweimal, sobald der Versand langsam ist.
     */
    if (!naechste.rueckwegMailAt) {
      try {
        await schreibeDavid({ ...naechste, rueckwegMailAt: jetzt, aktualisiertAm: jetzt });
        const origin = new URL(request.url).origin;
        void rueckwegMailSchicken({
          an: naechste.email, vorname: naechste.vorname,
          sitzungId: id, origin, sprache: naechste.sprache,
        }).catch(() => false);
      } catch { /* ohne Stempel lieber gar nicht schicken als zweimal */ }
    }
  }

  /* Zurück kommt nur, was der Browser wirklich braucht — nie die ganze Sitzung mit
     Lebenslauf-Pfad und Antworten. */
  return NextResponse.json({
    ok: true,
    id,
    vorname: naechste.vorname ?? "",
    lead: !!(naechste.vorname && naechste.email && naechste.datenschutzBestaetigt),
  });
}
