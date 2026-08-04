import { connect } from "node:tls";
import { mailAbmeldenViele, readMailAbmeldungen, vermerkRuecklaeufer } from "@/lib/try-this-look-store";

/**
 * DER RÜCKLÄUFER-LESER — was zurückkommt, sperrt sich selbst.
 *
 * Owner 04.08.2026: „ich habe eine Menge emails die zurückkammen … die muss man alle löschen
 * aus dem System." Bis heute ging das so: Der Besitzer sieht die Unzustellbar-Berichte in
 * `support@`, tippt sie ab, jemand trägt sie ein. Was er übersieht, bleibt im Verteiler und
 * wird beim nächsten Rundbrief wieder angeschrieben.
 *
 * WARUM DAS NICHT NUR LÄSTIG IST: Gmail und Yahoo messen an der Rücklaufquote, ob ein Absender
 * seine Empfänger kennt. Zweimal an dieselbe tote Adresse zu schreiben ist genau das Signal,
 * das die Zustellbarkeit der ganzen Domain kostet — und danach landet auch die Liefermail eines
 * zahlenden Kunden im Spam. Der teure Weg hängt am billigen.
 *
 * WARUM ES KEIN VORHER-PRÜFEN GIBT (gemessen am 04.08.2026): Von den 15 Rückläufern jenes Tages
 * hatte JEDE Domain einen gültigen MX-Eintrag — `gmail.com`, `icloud.com`, `poczta.onet.pl`,
 * sogar das Tippfehler-Domain `qmail.com`. Kaputt war jedes Mal der Teil vor dem @
 * (`hjghh@`, `hsaadsasdello@`). Das sieht man keiner Adresse an, keine DNS-Abfrage findet es.
 * Erst der Versand deckt es auf. Also ist die Antwort nicht „vorher prüfen", sondern: den
 * Rücklauf sofort und ohne Menschen einsammeln.
 *
 * ES GIBT KEINE BESTÄTIGUNG, AN DIE MAN SICH HÄNGEN KÖNNTE (Owner 04.08.2026: „aber die müssen
 * doch nie ihre email bestätigen"). `confirmed` wird an genau einer Stelle im Haus gesetzt —
 * im Wetter-Bestätigungslink. Der Kuss-Trichter fragt nie, mit Absicht: ein Bestätigungslink
 * wäre eine Hürde vor dem Gratis-Bild. Der Rücklauf ist deshalb das EINZIGE Signal, das wir
 * über die Echtheit einer Adresse je bekommen. Umso wichtiger, dass keiner verlorengeht.
 *
 * DIE GRENZE, DIE HIER ALLES TRÄGT: Automatisch gesperrt wird NUR, was ein Mailserver als
 * endgültig gescheitert gemeldet hat — ein `Final-Recipient` mit `Action: failed` und einem
 * 5er-Status, nach RFC 3464. Alles andere (unklare Texte, 4er-Status, geratene Adressen) wird
 * dem Menschen nur GEZEIGT. Eine zu Unrecht gesperrte Adresse ist ein verlorener Kunde, den
 * nie jemand bemerkt; ein zu Unrecht durchgelassener Rückläufer kostet einen weiteren Versuch.
 * Im Zweifel also lieber melden als sperren.
 */

// ── Ein sehr kleiner IMAP-Kunde ─────────────────────────────────────────────
/**
 * WARUM HANDGESCHRIEBEN und keine Bibliothek: Gebraucht werden fünf Befehle (LOGIN, SELECT,
 * SEARCH, FETCH, LOGOUT). Das Haus hält seine Abhängigkeitsliste kurz, und eine Bibliothek für
 * einen Hintergrundlauf will auf Dauer gepflegt werden. Das Risiko ist tragbar, weil ein
 * Lesefehler hier in die harmlose Richtung fällt: Wer nichts versteht, sperrt nichts.
 */
type Sitzung = { befehl(text: string): Promise<string[]>; schliessen(): void };

function imapVerbinden(host: string, port: number, zeitLimitMs = 30_000): Promise<Sitzung> {
  return new Promise((fertig, fehler) => {
    const sock = connect({ host, port, servername: host });
    /**
     * `latin1` IST HIER PFLICHT, nicht Geschmack: IMAP kündigt lange Antworten als `{123}` an —
     * 123 BYTES. Mit utf8 wäre die Zeichenzahl kleiner als die Bytezahl, sobald ein Umlaut im
     * Text steht, und ab da läuft der Leser für den Rest der Verbindung falsch.
     */
    sock.setEncoding("latin1");
    sock.setTimeout(zeitLimitMs);

    let puffer = "";
    let literal = 0;     // noch zu lesende Bytes einer angekündigten Langantwort
    let teil = "";       // angefangene logische Zeile
    let zaehler = 0;
    let begruesst = false;
    let offen: { tag: string; zeilen: string[]; ok: (z: string[]) => void; nein: (e: Error) => void } | null = null;

    function befehl(text: string): Promise<string[]> {
      return new Promise((ok, nein) => {
        if (offen) { nein(new Error("IMAP: es läuft noch ein Befehl")); return; }
        const tag = `a${++zaehler}`;
        offen = { tag, zeilen: [], ok, nein };
        sock.write(`${tag} ${text}\r\n`);
      });
    }
    const sitzung: Sitzung = { befehl, schliessen: () => { try { sock.end(); } catch { /* egal */ } } };

    const zeileFertig = (z: string) => {
      // Die erste Zeile ist die Begrüssung des Servers, kein Befehlsergebnis.
      if (!begruesst) { begruesst = true; fertig(sitzung); return; }
      if (!offen) return;
      if (z.startsWith(`${offen.tag} `)) {
        const rest = z.slice(offen.tag.length + 1);
        const a = offen;
        offen = null;
        if (/^OK/i.test(rest)) a.ok(a.zeilen); else a.nein(new Error(rest.slice(0, 200)));
        return;
      }
      offen.zeilen.push(z);
    };

    sock.on("data", (stueck: string) => {
      puffer += stueck;
      for (;;) {
        if (literal > 0) {
          if (puffer.length < literal) return;
          teil += puffer.slice(0, literal);
          puffer = puffer.slice(literal);
          literal = 0;
          continue;
        }
        const i = puffer.indexOf("\r\n");
        if (i < 0) return;
        const roh = puffer.slice(0, i);
        puffer = puffer.slice(i + 2);
        const m = roh.match(/\{(\d+)\}$/);
        if (m) { teil += roh.slice(0, roh.length - m[0].length); literal = Number(m[1]); continue; }
        zeileFertig(teil + roh);
        teil = "";
      }
    });
    sock.on("timeout", () => { sock.destroy(); const e = new Error("IMAP: Zeitüberschreitung"); offen ? offen.nein(e) : fehler(e); });
    sock.on("error", (e: Error) => { offen ? offen.nein(e) : fehler(e); });
    sock.on("close", () => { if (offen) { offen.nein(new Error("IMAP: Verbindung beendet")); offen = null; } });
  });
}

/** IMAP will Zeichenketten in Anführungszeichen, mit maskiertem \ und ". */
const inAnfuehrung = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const MONATE = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const imapDatum = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}-${MONATE[d.getUTCMonth()]}-${d.getUTCFullYear()}`;

// ── Den Bericht eines Mailservers lesen (RFC 3464) ──────────────────────────
export type Ruecklauf = {
  email: string;
  /** `5.1.1` — die erste Ziffer entscheidet: 5 endgültig, 4 nur vorübergehend. */
  status: string;
  /** Klartext des Mailservers, gekürzt — damit ein Mensch die Sperre nachvollziehen kann. */
  grund: string;
  /** Endgültig gescheitert (5er-Status) — notwendig für eine Sperre, aber nicht hinreichend. */
  hart: boolean;
  /**
   * DIE ADRESSE SELBST IST TOT — und nur das wird automatisch gesperrt.
   *
   * Endgültig gescheitert heisst nicht „Empfänger gibt es nicht". Der wichtigste Unterschied
   * ist `5.7.x`: Das ist eine ABWEISUNG DURCH DIE GEGENSEITE — „diese Nachricht wollen wir
   * nicht", meist wegen des Absenders. Wäre unsere Domain einmal auf einer schwarzen Liste,
   * kämen genau solche 5.7er für HUNDERTE völlig gesunder Adressen zurück, und ein Cron, der
   * auf „5er = weg" hört, würde über Nacht die halbe Empfängerliste löschen. Der Schaden
   * fiele niemandem auf, denn eine gelöschte Adresse beschwert sich nicht.
   *
   * Deshalb die enge Liste unten: „Postfach gibt es nicht", „Postfach abgeschaltet",
   * „Domain löst nicht auf". Alles andere — auch endgültige Fehler — geht an einen Menschen.
   */
  adresseTot: boolean;
  /**
   * Aus einem echten Bericht-Block gelesen (`Final-Recipient`) — oder nur aus dem Fliesstext
   * geraten. Geratenes wird NIE automatisch gesperrt, sondern nur gemeldet.
   */
  sicher: boolean;
  betreff: string;
};

const adresse = (roh: string) =>
  String(roh ?? "").trim().replace(/^<|>$/g, "").trim().toLowerCase();
const gueltig = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

/**
 * Die erweiterten Statuscodes (RFC 3463), bei denen die ADRESSE das Problem ist:
 *   5.1.0–5.1.3, 5.1.6, 5.1.10  Postfach gibt es nicht / Adresse unsinnig / umgezogen
 *   5.2.1                       Postfach abgeschaltet
 *   5.4.4                       Domain löst nicht auf
 * Bewusst NICHT dabei: 5.2.2 (Postfach voll — die Adresse lebt) und alles aus 5.7.x (Abweisung
 * durch die Gegenseite, siehe `adresseTot`).
 */
const TOTE_ADRESSE = /^5\.(1\.(0|1|2|3|6|10)|2\.1|4\.4)$/;

/** Wenn der Server keinen erweiterten Code mitschickt, bleibt sein Klartext. */
const TOT_IM_KLARTEXT = /does ?n[o']t exist|no such (user|mailbox|recipient)|(user|recipient|mailbox) unknown|unknown (user|recipient)|invalid (recipient|mailbox|address)|recipient (address )?(not found|rejected)|address (does not exist|not found)|mailbox (unavailable|not found|is inactive|disabled)|account .{0,20}(does not exist|is inactive|disabled)|name service error/i;

export function berichtLesen(nachricht: string, betreff: string): Ruecklauf[] {
  // Gefaltete Kopfzeilen zusammenziehen: Fortsetzungen beginnen mit Leerzeichen oder Tab.
  const zeilen: string[] = [];
  for (const z of nachricht.split(/\r?\n/)) {
    if (/^[ \t]/.test(z) && zeilen.length) zeilen[zeilen.length - 1] += ` ${z.trim()}`;
    else zeilen.push(z);
  }

  const funde: Ruecklauf[] = [];
  let jetzt: { email: string; aktion: string; status: string; grund: string } | null = null;
  const abschliessen = () => {
    if (jetzt && gueltig(jetzt.email)) {
      // Schickt der Server keinen `Status:`, steht der Code oft im Klartext („550 5.1.1 …").
      const status = jetzt.status || (jetzt.grund.match(/\b(5\.\d+\.\d+)\b/)?.[1] ?? "");
      // Endgültig ist: 5er-Status, oder — ohne erweiterten Code — ein 5xx im Klartext.
      const hart = jetzt.aktion === "failed"
        && (status.startsWith("5") || (!status && /\b5\d\d\b/.test(jetzt.grund)));
      const adresseTot = hart
        && (status ? TOTE_ADRESSE.test(status) : TOT_IM_KLARTEXT.test(jetzt.grund));
      funde.push({ email: jetzt.email, status, grund: jetzt.grund.slice(0, 300), hart, adresseTot, sicher: true, betreff });
    }
    jetzt = null;
  };

  for (const z of zeilen) {
    const fr = z.match(/^Final-Recipient:\s*[^;]*;\s*(.+)$/i);
    if (fr) { abschliessen(); jetzt = { email: adresse(fr[1]), aktion: "", status: "", grund: "" }; continue; }
    if (!jetzt) continue;
    const ak = z.match(/^Action:\s*([a-z]+)/i);          if (ak) { jetzt.aktion = ak[1].toLowerCase(); continue; }
    const st = z.match(/^Status:\s*(\d\.\d+\.\d+)/i);     if (st) { jetzt.status = st[1]; continue; }
    const dg = z.match(/^Diagnostic-Code:\s*(.+)$/i);     if (dg) { jetzt.grund = dg[1].trim(); continue; }
    if (!z.trim()) abschliessen();
  }
  abschliessen();
  if (funde.length) return funde;

  /**
   * KEIN SAUBERER BERICHT — manche Server schicken nur Fliesstext. Dann wird GERATEN, und
   * Geratenes wird nur gemeldet (`sicher: false`). Ohne einen 5xx-Code im Text gilt gar nichts:
   * sonst würde jede weitergeleitete Beschwerde zur Sperre.
   */
  if (!/\b5\d\d\b/.test(nachricht)) return [];
  const grund = (nachricht.match(/\b5\d\d[ -]5\.\d\.\d[^\r\n]{0,200}/) ?? nachricht.match(/\b5\d\d[^\r\n]{0,200}/) ?? [""])[0].trim();
  const roh = nachricht.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
  const gesehen = new Set<string>();
  const geraten: Ruecklauf[] = [];
  for (const r of roh) {
    const e = adresse(r);
    if (gesehen.has(e) || !gueltig(e)) continue;
    gesehen.add(e);
    geraten.push({ email: e, status: "", grund, hart: true, adresseTot: TOT_IM_KLARTEXT.test(grund), sicher: false, betreff });
  }
  return geraten;
}

// ── Der Durchgang ───────────────────────────────────────────────────────────
export type Bericht = {
  geprueft: number;
  kandidaten: number;
  /** Welche Ordner durchsucht wurden und wie viel darin lag — sonst rätselt man über eine Null. */
  ordner: Array<{ name: string; nachrichten: number; kandidaten: number }>;
  /** Sicher erkannt und endgültig — diese wurden (ausser im Probelauf) gesperrt. */
  gesperrt: Ruecklauf[];
  /** Schon vorher in der Sperrliste. */
  bekannt: Ruecklauf[];
  /** Braucht einen Menschen: geraten, unklar oder nur vorübergehend gescheitert. */
  unsicher: Ruecklauf[];
  fehler?: string;
};

/**
 * Holt die Unzustellbar-Berichte aus dem Postfach und sperrt, was endgültig gescheitert ist.
 *
 * `nurZeigen` macht daraus einen Probelauf — dieselbe Vorsicht wie beim Aufräumer und beim
 * Lösch-Skript: Bei allem, was Daten verändert, sieht man sich erst das Ziel an.
 */
export async function ruecklaeuferEinsammeln(opts?: { tage?: number; nurZeigen?: boolean; grenze?: number }): Promise<Bericht> {
  const tage = Math.max(1, Math.min(90, opts?.tage ?? 14));
  const grenze = Math.max(1, Math.min(500, opts?.grenze ?? 150));
  const leer: Bericht = { geprueft: 0, kandidaten: 0, ordner: [], gesperrt: [], bekannt: [], unsicher: [] };

  const user = (process.env.IMAP_USER || process.env.SMTP_USER || "").trim();
  const pass = (process.env.IMAP_PASS || process.env.SMTP_PASS || "").trim();
  // Hostinger bedient IMAP unter demselben Namen wie SMTP, nur mit anderem Vorsatz.
  const host = (process.env.IMAP_HOST || "").trim()
    || (process.env.SMTP_HOST || "").trim().replace(/^smtp\./i, "imap.");
  const port = Number((process.env.IMAP_PORT || "993").trim());
  if (!host || !user || !pass) return { ...leer, fehler: "IMAP nicht eingerichtet (SMTP_HOST/SMTP_USER/SMTP_PASS fehlen)." };

  let s: Sitzung | null = null;
  try {
    s = await imapVerbinden(host, port);
    await s.befehl(`LOGIN ${inAnfuehrung(user)} ${inAnfuehrung(pass)}`);
    /**
     * AUCH IM SPAM-ORDNER NACHSEHEN — sonst findet der Leser die Hälfte nicht.
     *
     * Unzustellbar-Berichte kommen von fremden Mailservern, tragen keine Beziehung zum
     * Empfänger und sehen für jeden Filter aus wie Massenpost. Entsprechend oft landen sie
     * im Spam. Gemessen am 04.08.2026: Im Posteingang lagen 10 Nachrichten aus 14 Tagen — der
     * Besitzer hatte aber 15 Rückläufer von Hand herausgesucht. Die Ordner werden nicht
     * geraten, sondern erfragt: Hostinger nennt seinen Spam-Ordner `INBOX.spam`, andere
     * `Junk`, und wer eine feste Zeichenkette einträgt, sucht beim nächsten Anbieter ins Leere.
     */
    const ordnerListe = await s.befehl(`LIST "" "*"`).catch(() => [] as string[]);
    const ordner = ["INBOX"];
    for (const z of ordnerListe) {
      const m = z.match(/^\* LIST \(([^)]*)\) (?:"[^"]*"|NIL) (?:"(.*)"|(\S+))\s*$/i);
      if (!m) continue;
      if (/\\Noselect/i.test(m[1])) continue;
      const name = (m[2] ?? m[3] ?? "").trim();
      const blatt = name.split(/[./]/).pop() ?? "";
      if (name && name.toUpperCase() !== "INBOX" && /^(junk|spam|bulk|junk-?e-?mail)$/i.test(blatt)) ordner.push(name);
    }

    const seit = imapDatum(new Date(Date.now() - tage * 24 * 60 * 60 * 1000));
    const gefunden = new Map<string, Ruecklauf>();
    const bericht: Bericht = { geprueft: 0, kandidaten: 0, ordner: [], gesperrt: [], bekannt: [], unsicher: [] };

    for (const o of ordner) {
      try { await s.befehl(`SELECT ${inAnfuehrung(o)}`); } catch { continue; }
      const suche = await s.befehl(`UID SEARCH SINCE ${seit}`).catch(() => [] as string[]);
      const uids = (suche.find(z => /^\* SEARCH/i.test(z)) ?? "")
        .replace(/^\* SEARCH/i, "").trim().split(/\s+/).filter(Boolean).slice(-1000);
      bericht.geprueft += uids.length;
      if (!uids.length) { bericht.ordner.push({ name: o, nachrichten: 0, kandidaten: 0 }); continue; }

      /**
       * ERST NUR DIE KOPFZEILEN. Ein Postfach mit zwei Wochen Post kann hundert Nachrichten
       * haben; ihre Rümpfe alle zu holen wäre langsam und sinnlos. Kopfzeilen sind winzig, und
       * an ihnen erkennt man einen Bericht sicher genug, um den Rest gezielt nachzuladen.
       */
      const kopfAntwort = await s.befehl(`UID FETCH ${uids.join(",")} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT CONTENT-TYPE)])`)
        .catch(() => [] as string[]);
      const kandidaten: string[] = [];
      for (const z of kopfAntwort) {
        const uid = z.match(/UID (\d+)/)?.[1];
        if (!uid) continue;
        const von = z.match(/^From:\s*(.+)$/im)?.[1] ?? "";
        const betreff = z.match(/^Subject:\s*(.+)$/im)?.[1] ?? "";
        const art = z.match(/^Content-Type:\s*(.+)$/im)?.[1] ?? "";
        const istBericht = /mailer-daemon|postmaster/i.test(von)
          || /report-type=delivery-status|multipart\/report/i.test(art)
          || /undeliver|undelivered|delivery status|delivery failure|mail delivery failed|returned mail|failure notice/i.test(betreff);
        if (istBericht) kandidaten.push(uid);
      }
      bericht.kandidaten += kandidaten.length;
      bericht.ordner.push({ name: o, nachrichten: uids.length, kandidaten: kandidaten.length });

      for (const uid of kandidaten.slice(0, grenze)) {
        let roh: string[];
        try { roh = await s.befehl(`UID FETCH ${uid} (BODY.PEEK[])`); } catch { continue; }
        const text = roh.join("\n");
        const betreff = (text.match(/^Subject:\s*(.+)$/im)?.[1] ?? "").slice(0, 120);
        for (const r of berichtLesen(text, betreff)) {
          // Uns selbst sperren wir nie — sonst schneidet sich das Haus vom eigenen Postfach ab.
          if (r.email === user.toLowerCase()) continue;
          const da = gefunden.get(r.email);
          // Der schärfste Befund gewinnt: sicher schlägt geraten, tot schlägt bloss endgültig.
          if (!da || (r.sicher && !da.sicher) || (r.adresseTot && !da.adresseTot)) gefunden.set(r.email, r);
        }
      }
    }

    s.schliessen();
    s = null;

    const schonGesperrt = new Set(await readMailAbmeldungen());
    for (const r of gefunden.values()) {
      // Gesperrt wird nur, was aus einem echten Bericht stammt UND als tote Adresse gemeldet
      // ist. Alles andere geht an einen Menschen — lieber melden als zu Unrecht sperren.
      if (!r.sicher || !r.hart || !r.adresseTot) { bericht.unsicher.push(r); continue; }
      if (schonGesperrt.has(r.email)) { bericht.bekannt.push(r); continue; }
      bericht.gesperrt.push(r);
    }

    if (!opts?.nurZeigen && bericht.gesperrt.length) {
      /**
       * ALLE AUF EINMAL, nicht eine nach der anderen: Nacheinander gerufen überschreiben sich
       * die Sperren gegenseitig (siehe `mailAbmeldenViele`) — der Lauf meldete dann zwei
       * gesperrte Adressen, und in der Liste stand nur eine.
       */
      const am = new Date().toISOString();
      try {
        const wirklich = new Set(await mailAbmeldenViele(bericht.gesperrt.map(r => r.email)));
        // Nur berichten und protokollieren, was auch angekommen ist.
        bericht.gesperrt = bericht.gesperrt.filter(r => wirklich.has(r.email));
      } catch {
        bericht.gesperrt = [];
        bericht.fehler = "Sperrliste konnte nicht geschrieben werden.";
      }
      try {
        await vermerkRuecklaeufer(bericht.gesperrt.map(r => ({ email: r.email, status: r.status, grund: r.grund, betreff: r.betreff, am })));
      } catch { /* das Protokoll ist Beiwerk, die Sperre ist die Sache */ }
    }
    return bericht;
  } catch (e) {
    try { s?.schliessen(); } catch { /* egal */ }
    return { ...leer, fehler: e instanceof Error ? e.message : "IMAP fehlgeschlagen" };
  }
}
