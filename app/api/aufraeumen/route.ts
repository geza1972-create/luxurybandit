import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissLog, writeKissLog, deleteTryThisLookImage, type KissLogEntry } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * DER AUFRAEUMER — was niemandem mehr gehoert, wird geloescht.
 *
 * Owner 03.08.2026: „wir müssen fürs Hosting auch Geld verlangen, sonst wird der Server voll mit
 * Müll und Leute zahlen nichts dafür" — und, konkreter: „wir müssen bei den Leuten die keine
 * E-Mail angegeben haben die Daten löschen im Kiss erst mal".
 *
 * DIE ZAHL, DIE DAS AUSLOESTE (gemessen 03.08.2026): 210 Kuss-Auftraege in neun Tagen, davon
 * ZWEI bezahlt — und 195 unbezahlte trugen hochgeladene Fotos echter Gesichter. Geloescht wurde
 * davon nie etwas; im ganzen System gab es genau einen Cron, und der lieferte Videos aus.
 *
 * DAS IST KEIN SPARPROGRAMM. Fotos identifizierbarer Menschen ohne Vertrag, ohne Zweck und ohne
 * Frist zu behalten, verstoesst gegen Artikel 5 DSGVO (Zweckbindung, Speicherbegrenzung).
 * Loeschen ist hier die Pflicht — dass es nebenbei den Speicher freiraeumt, ist die Zugabe.
 *
 * WAS ES NIE ANFASST — und warum die Ausnahmen so grosszuegig sind: Ein zu Unrecht geloeschtes
 * Ergebnis ist unwiederbringlich, ein zu Unrecht behaltener Rest kostet Cent bis zum naechsten
 * Lauf. Also bleibt stehen, was auch nur eines davon traegt: eine Adresse, eine Zahlung, ein
 * ausgeliefertes Video, ein geteilter Link.
 *
 * PROBELAUF: `?probe=1` zaehlt nur und loescht nichts. Genau wie
 * `scripts/kiss-anonyme-loeschen.mjs`, aus demselben Grund: Bei Loeschungen sieht man sich das
 * Ziel an, bevor man drueckt.
 */

/**
 * VORLAGEN SIND ZUTATEN, KEINE ERGEBNISSE. Sein Foto und ihr Foto braucht nur die Erzeugung.
 * Sieben Tage sind grosszuegig gerechnet: `kiss-deliver` laeuft taeglich und gibt nach drei
 * Versuchen auf — nach einer Woche versucht es niemand mehr, und dann hat das Foto keinen
 * Zweck mehr, den man vor einem Gericht nennen koennte.
 */
const VORLAGEN_TAGE = Number(process.env.AUFRAEUMEN_VORLAGEN_TAGE ?? 7);

/** Auftrag ohne Adresse und ohne Zahlung: nach dieser Frist ganz weg, samt Dateien. */
const ANONYM_TAGE = Number(process.env.AUFRAEUMEN_ANONYM_TAGE ?? 7);

/**
 * BESUCH MIT ADRESSE, ABER OHNE KAUF. Er hat uns seine Adresse gegeben — das ist ein Verhaeltnis,
 * also darf er laenger bleiben als ein Anonymer. Irgendwann aber auch nicht mehr.
 *
 * DIESE REGEL IST NICHT NEU, sie zieht nur um: Sie stand als `aufraeumen()` mitten im
 * Auslieferungs-Cron `kiss-deliver` und lief dort bei jedem Lauf mit. Zwei Aufraeumer mit
 * eigenen Fristen auf demselben Protokoll laufen frueher oder spaeter auseinander — dann
 * loescht der eine, was der andere behalten wollte. Deshalb gibt es ab jetzt genau einen.
 *
 * Die alte Env `FREE_PREVIEW_KEEP_DAYS` gilt weiter und hat Vorrang: Steht sie auf Vercel,
 * aendert dieser Umzug die Frist nicht heimlich.
 */
const BESUCH_TAGE = Number(process.env.FREE_PREVIEW_KEEP_DAYS ?? process.env.AUFRAEUMEN_BESUCH_TAGE ?? 90);

/**
 * WIE LANGE EIN BEZAHLTES GESCHENK ONLINE BLEIBT — noch NICHT entschieden (KONZEPT-GESCHENKE.md
 * §7.2), deshalb `0` = niemals loeschen.
 *
 * Bewusst als ausgeschaltete Zahl und nicht als fehlender Code: Der geteilte Link IST das
 * Geschenk beim Empfaenger und zugleich der einzige Werbekanal, der sich selbst weitertraegt.
 * Ihn stillschweigend ablaufen zu lassen, waere die teuerste Ersparnis dieses Projekts. Wenn
 * der Owner eine Frist nennt, ist es eine Zahl — und die Vorwarnung per Mail gehoert dazu.
 */
const GESCHENK_TAGE = Number(process.env.AUFRAEUMEN_GESCHENK_TAGE ?? 0);

const TAG_MS = 24 * 60 * 60 * 1000;

function schluessel(): string {
  return (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
}

async function darf(request: Request): Promise<boolean> {
  if (request.headers.get("x-vercel-cron")) return true;
  const k = schluessel();
  if (k) {
    const url = new URL(request.url);
    if (url.searchParams.get("key")?.trim() === k) return true;
    if (request.headers.get("authorization")?.trim() === `Bearer ${k}`) return true;
  }
  return isAdminRequest(request).catch(() => false);
}

/** Alter in Tagen. Ohne Datum gilt der Eintrag als frisch — im Zweifel nicht loeschen. */
function alterTage(e: KissLogEntry): number {
  const t = Date.parse(String(e.createdAt ?? ""));
  return Number.isFinite(t) ? (Date.now() - t) / TAG_MS : 0;
}

/** Kennen wir einen Menschen dahinter? */
function hatAdresse(e: KissLogEntry): boolean {
  return !!String(e.email ?? "").trim() || !!String((e as { paidEmail?: string }).paidEmail ?? "").trim();
}

/** Unantastbar: Zahlung, ausgeliefertes Video oder ein Link, der beim Empfaenger liegt. */
function istErgebnis(e: KissLogEntry): boolean {
  return !!e.paid || !!String(e.videoUrl ?? "").trim() || !!e.sharedAt;
}

const pfad = (p: unknown) => {
  const s = String(p ?? "").trim();
  return s.startsWith("try-this-look/") ? s : "";
};

export async function GET(request: Request) {
  if (!(await darf(request))) {
    return NextResponse.json({ error: "Nicht erlaubt." }, { status: 401 });
  }
  const frage = new URL(request.url).searchParams;
  const probe = frage.get("probe") === "1";
  /**
   * FRISTEN IM PROBELAUF DURCHSPIELEN — „was waere, wenn Vorlagen nur 2 Tage blieben?".
   *
   * NUR im Probelauf, und das ist keine Vorsicht, sondern der Punkt: Ein Aufruf, der die Frist
   * mitbringt UND loescht, waere ein Loeschknopf fuer alles — `?vorlagen=0` haette jede Vorlage
   * im System genommen. So bleibt der Regler ein Fernglas und wird nie ein Beil.
   */
  const zahl = (name: string, standard: number) => {
    if (!probe) return standard;
    /**
     * ERST PRUEFEN, OB DER REGLER UEBERHAUPT DA IST — `Number(null)` ist **0**, nicht `NaN`.
     * Ohne diese Zeile wurde jede nicht mitgegebene Frist still zu 0, und der Probelauf meldete
     * 82 von 88 Auftraegen zum Loeschen, obwohl die Fristen bei 7/7/90 standen. Der echte Lauf
     * war nie betroffen (er nimmt die Standardwerte), aber ein Probelauf, der etwas anderes
     * zeigt als der Ernstfall, ist schlimmer als gar keiner: Man glaubt, geprueft zu haben.
     */
    const roh = frage.get(name);
    if (roh === null || roh.trim() === "") return standard;
    const v = Number(roh);
    return Number.isFinite(v) && v >= 0 ? v : standard;
  };
  const fVorlagen = zahl("vorlagen", VORLAGEN_TAGE);
  const fAnonym = zahl("anonym", ANONYM_TAGE);
  const fBesuch = zahl("besuch", BESUCH_TAGE);
  const fGeschenk = zahl("geschenk", GESCHENK_TAGE);

  const alle = await readKissLog().catch(() => [] as KissLogEntry[]);

  /**
   * 1. OHNE ERGEBNIS → ganzer Eintrag weg, samt aller Dateien. Zwei Fristen, ein Gedanke:
   * Wer uns seine Adresse gab, bleibt laenger als jemand, von dem wir nichts wissen.
   */
  const anonym = alle.filter(e => !istErgebnis(e)
    && alterTage(e) >= (hatAdresse(e) ? fBesuch : fAnonym));
  const anonymIds = new Set(anonym.map(e => e.id));

  /**
   * 2. VORLAGEN ABLAUFEN LASSEN — bei ALLEN uebrigen Auftraegen, auch den bezahlten.
   * Das Ergebnis (`imagePath`, `videoUrl`) bleibt; nur die Zutaten gehen. Wer bezahlt hat,
   * verliert dadurch nichts, was er je zu sehen bekommt.
   */
  const vorlagenWeg: string[] = [];
  const entschlackt: KissLogEntry[] = [];
  for (const e of alle) {
    if (anonymIds.has(e.id)) continue;
    if (alterTage(e) >= fVorlagen) {
      const p = pfad(e.personPath), m = pfad(e.modelPath);
      if (p || m) {
        if (p) vorlagenWeg.push(p);
        if (m) vorlagenWeg.push(m);
        entschlackt.push({ ...e, personPath: undefined, modelPath: undefined });
        continue;
      }
    }
    entschlackt.push(e);
  }

  /** 3. ABGELAUFENE GESCHENKE — nur, wenn der Owner eine Frist gesetzt hat (sonst 0 = nie). */
  const abgelaufen = fGeschenk > 0
    ? entschlackt.filter(e => istErgebnis(e) && alterTage(e) >= fGeschenk)
    : [];

  const dateien = [
    ...anonym.flatMap(e => [pfad(e.personPath), pfad(e.modelPath), pfad(e.imagePath)]),
    ...vorlagenWeg,
    ...abgelaufen.map(e => pfad(e.imagePath)),
  ].filter(Boolean);

  const bericht = {
    probe,
    auftraege: {
      vorher: alle.length,
      geloescht: anonym.length,
      davonAnonym: anonym.filter(e => !hatAdresse(e)).length,
      davonMitAdresse: anonym.filter(e => hatAdresse(e)).length,
      bleiben: alle.length - anonym.length,
    },
    dateien: { geloescht: dateien.length, davonVorlagen: vorlagenWeg.length },
    abgelaufeneGeschenke: abgelaufen.length,
    fristen: { vorlagen: fVorlagen, anonym: fAnonym, besuch: fBesuch, geschenk: fGeschenk || "aus (nicht entschieden)" },
  };

  if (probe) return NextResponse.json({ ok: true, ...bericht, hinweis: "Probelauf — es wurde nichts geloescht." });

  // Erst die Dateien, dann das Log: Bricht es dazwischen ab, bleiben verwaiste Dateien uebrig
  // (aufraeumbar) statt Log-Eintraege, die auf nichts mehr zeigen (fuer den Kunden kaputt).
  let weg = 0;
  for (const p of dateien) {
    try { await deleteTryThisLookImage(p); weg++; } catch { /* eine Datei darf den Lauf nie stoppen */ }
  }
  if (anonym.length || vorlagenWeg.length) {
    await writeKissLog(entschlackt).catch(() => { /* naechster Lauf holt es nach */ });
  }

  return NextResponse.json({ ok: true, ...bericht, dateienWirklichGeloescht: weg });
}
