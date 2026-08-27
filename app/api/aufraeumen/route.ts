import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readKissLog, writeKissLog, deleteTryThisLookImage, chatZugangAblaufend, chatZugangGewarnt, type KissLogEntry } from "@/lib/try-this-look-store";
import { sendEmail } from "@/lib/email-send";

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
 * WIE LANGE EIN BEZAHLTES GESCHENK ONLINE BLEIBT — 90 Tage (Owner 03.08.2026: „90 Tage").
 *
 * Das ist die einzige Frist hier, die einem KUNDEN etwas wegnimmt, und deshalb die einzige mit
 * einer Vorwarnung (VORWARNUNG_TAGE). Der geteilte Link IST das Geschenk beim Empfaenger und
 * zugleich der einzige Werbekanal, der sich selbst weitertraegt — ihn stillschweigend ablaufen
 * zu lassen, waere die teuerste Ersparnis dieses Projekts.
 *
 * Was verschwindet: das Ergebnis (Bild/Video) und damit die Werk-Seite /w/<id>. Was bleibt:
 * der Log-Eintrag, damit die Seite „abgelaufen" sagen kann statt „gibt es nicht".
 */
const GESCHENK_TAGE = Number(process.env.AUFRAEUMEN_GESCHENK_TAGE ?? 90);

/**
 * SO VIELE TAGE VORHER GEHT DIE MAIL RAUS. Sieben, weil ein Geschenk etwas ist, das man noch
 * einmal herunterladen oder weiterschicken will — dafuer braucht ein Mensch ein Wochenende,
 * keine 24 Stunden.
 */
const VORWARNUNG_TAGE = Number(process.env.AUFRAEUMEN_VORWARNUNG_TAGE ?? 7);

const TAG_MS = 24 * 60 * 60 * 1000;

function schluessel(): string {
  return (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
}

async function darf(request: Request): Promise<boolean> {
  /* DER NACKTE CRON-KOPF IST KEIN AUSWEIS MEHR (12.08.2026) — jeder Fremde kann ihn setzen,
     und diese Route LÖSCHT Daten. Echte Vercel-Crons weisen sich mit `Bearer CRON_SECRET`
     aus (Bearer-Zweig unten); der nackte Kopf zählt nur ohne konfiguriertes Geheimnis.
     Begründung im Wortlaut: app/api/kiss-deliver/route.ts, darf(). */
  const k = schluessel();
  if (!k && request.headers.get("x-vercel-cron")) return true;
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

  /**
   * 3. ABGELAUFENE GESCHENKE — 90 Tage (Owner 03.08.2026), und NIE ohne Vorwarnung.
   *
   * Zwei Mengen, sieben Tage auseinander: Wer bald ablaeuft, bekommt eine Mail; wer abgelaufen
   * IST und die Mail bekommen hat, verliert sein Ergebnis. Die Reihenfolge ist der ganze Punkt —
   * ein bezahltes Geschenk still verschwinden zu lassen, waere genau das „Ausrauben", das
   * dieser Trichter an anderer Stelle mit viel Aufwand abgestellt hat.
   *
   * `geschenkWarnAt` am Eintrag macht die Mail idempotent: Der Cron laeuft taeglich, die
   * Warnfrist ist sieben Tage breit — ohne den Stempel bekaeme der Kunde sie siebenmal.
   */
  const warnen = fGeschenk > 0
    ? entschlackt.filter(e => istErgebnis(e)
        && !(e as { geschenkWarnAt?: string }).geschenkWarnAt
        && alterTage(e) >= fGeschenk - VORWARNUNG_TAGE
        && alterTage(e) < fGeschenk
        && hatAdresse(e))
    : [];
  /**
   * Geloescht wird NUR, was gewarnt wurde — oder was gar keine Adresse hat, an die man haette
   * warnen koennen. Ohne diese Bedingung haette der erste scharfe Lauf alles genommen, was
   * aelter als 90 Tage ist, bevor je eine Mail draussen war.
   */
  const abgelaufen = fGeschenk > 0
    ? entschlackt.filter(e => istErgebnis(e) && alterTage(e) >= fGeschenk
        && (!!(e as { geschenkWarnAt?: string }).geschenkWarnAt || !hatAdresse(e)))
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
    vorgewarnt: warnen.length,
    fristen: { vorlagen: fVorlagen, anonym: fAnonym, besuch: fBesuch, geschenk: fGeschenk || "aus", vorwarnung: VORWARNUNG_TAGE },
  };

  if (probe) return NextResponse.json({ ok: true, ...bericht, hinweis: "Probelauf — es wurde nichts geloescht." });

  // Erst die Dateien, dann das Log: Bricht es dazwischen ab, bleiben verwaiste Dateien uebrig
  // (aufraeumbar) statt Log-Eintraege, die auf nichts mehr zeigen (fuer den Kunden kaputt).
  /**
   * ERST WARNEN, DANN LOESCHEN — in dieser Reihenfolge und in DIESEM Lauf.
   *
   * Die Mail nennt das Datum und fuehrt in die Galerie: Dort liegt das Video, dort kann er es
   * herunterladen, dort steht der Kaufknopf fuers naechste. Ein Ablauf ist eine schlechte
   * Nachricht — sie darf wenigstens einen Weg anbieten.
   */
  const origin = new URL(request.url).origin;
  let gewarnt = 0;
  for (const e of warnen) {
    const an = String(e.email ?? (e as { paidEmail?: string }).paidEmail ?? "").trim();
    const tage = Math.max(1, Math.ceil(fGeschenk - alterTage(e)));
    const html = `<div style="font-family:system-ui,Arial,sans-serif;background:#faf7f0;padding:24px">`
      + `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
      + `<table width="100%" style="max-width:520px;background:#fff;border-radius:16px">`
      + `<tr><td style="padding:22px 22px 6px;font-size:18px;font-weight:bold;color:#1a160f">Dein Video bleibt noch ${tage} Tage online</td></tr>`
      + `<tr><td style="padding:0 22px 14px;font-size:14px;line-height:1.55;color:#5b5344">`
      + `Wir halten jedes Geschenk ${fGeschenk} Tage bereit. Danach laeuft der Link ab — lade dir dein Video vorher herunter, dann behaeltst du es fuer immer.</td></tr>`
      + `<tr><td style="padding:0 22px 20px"><a href="${origin}/my-gallery?utm_source=ablaufmail" style="display:inline-block;background:#f6cf51;color:#111;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:bold;text-decoration:none">Zu meinen Assets</a></td></tr>`
      + `</table></td></tr></table></div>`;
    const r = await sendEmail({ to: an, subject: `Dein Video bleibt noch ${tage} Tage online`, html }).catch(() => ({ ok: false }));
    if ((r as { ok?: boolean }).ok) {
      (e as { geschenkWarnAt?: string }).geschenkWarnAt = new Date().toISOString();
      gewarnt++;
    }
  }

  /**
   * DIE CHAT-ABLAUFMAIL (Owner 03.08.2026: „ok, dann mach die Warn-Mail").
   *
   * Sie haengt hier und nicht in einem eigenen Cron, weil dieser Lauf ohnehin taeglich kommt.
   * Ein zweiter Zeitplan waere eine zweite Stelle, an der etwas nicht laeuft — und man merkt es
   * bei Mails immer erst, wenn jemand sich beschwert, dass keine kam.
   *
   * WAS SIE NICHT TUT: verkaufen. Sie sagt, wann Schluss ist, und bietet einen Knopf. Wer
   * weiterschreiben will, klickt; wer nicht, soll nicht das Gefuehl haben, gedraengt zu werden —
   * er hat schon einmal bezahlt.
   *
   * Der Vermerk wird erst NACH erfolgreichem Versand gesetzt: Faellt der Mailserver aus,
   * versucht es der naechste Lauf erneut, statt den Kunden stumm ablaufen zu lassen.
   */
  let chatGewarnt = 0;
  try {
    for (const z of await chatZugangAblaufend(VORWARNUNG_TAGE)) {
      const html = `<div style="font-family:system-ui,Arial,sans-serif;background:#faf7f0;padding:24px">`
        + `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">`
        + `<table width="100%" style="max-width:520px;background:#fff;border-radius:16px">`
        + `<tr><td style="padding:22px 22px 6px;font-size:18px;font-weight:bold;color:#1a160f">Noch ${z.restTage} Tage, dann ist Schluss</td></tr>`
        + `<tr><td style="padding:0 22px 14px;font-size:14px;line-height:1.55;color:#5b5344">`
        + `Dein Chat-Monat endet in ${z.restTage} Tagen. Danach kannst du ihr nicht mehr schreiben — `
        + `euer Verlauf bleibt, du kommst nur nicht mehr rein. Wenn du weiterschreiben willst, verlaengere hier.`
        + `</td></tr>`
        + `<tr><td style="padding:0 22px 20px"><a href="${origin}/themes/chat?utm_source=ablaufmail" style="display:inline-block;background:#1a160f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">Weiterschreiben</a></td></tr>`
        + `</table></td></tr></table></div>`;
      const r = await sendEmail({ to: z.email, subject: `Noch ${z.restTage} Tage, dann ist Schluss`, html })
        .catch(() => ({ ok: false }));
      if ((r as { ok?: boolean }).ok) { await chatZugangGewarnt(z.email); chatGewarnt++; }
    }
  } catch { /* eine kaputte Mailrunde darf das Aufraeumen nie stoppen */ }

  let weg = 0;
  for (const p of dateien) {
    try { await deleteTryThisLookImage(p); weg++; } catch { /* eine Datei darf den Lauf nie stoppen */ }
  }
  if (anonym.length || vorlagenWeg.length || gewarnt) {
    // Die geloeschten Kennungen mitgeben — sonst mischt `writeKissLog` sie aus dem
    // gespeicherten Stand wieder herein und der Aufraeumer raeumte nie etwas auf.
    await writeKissLog(entschlackt, anonym.map(e => e.id))
      .catch(() => { /* naechster Lauf holt es nach */ });
  }

  return NextResponse.json({ ok: true, ...bericht, dateienWirklichGeloescht: weg, mailsVerschickt: gewarnt, chatAblaufMails: chatGewarnt });
}
