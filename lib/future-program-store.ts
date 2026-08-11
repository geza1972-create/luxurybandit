import crypto from "crypto";
import { supabaseFetch, BUCKET, encodeStoragePath, ensureBucket } from "@/lib/try-this-look-store";

/**
 * DAS FUTURE-PROGRAMM — EIGENE DATEI JE KAUF (11.08.2026, Future Self Program, 49 €).
 *
 * WARUM NICHT IM KUSS-PROTOKOLL: Der Auftrag selbst (Foto, Zahlung, Video) lebt am
 * gewohnten Ort in `kiss-log.json` (siehe `KissLogEntry` in try-this-look-store.ts) — das
 * bleibt so, `bezahltVermerken()` kennt diesen Eintrag bereits. Aber das 30-Tage-Programm
 * braucht ein LANGES Gedächtnis, und genau das darf das Kuss-Protokoll nicht bieten:
 *
 *   1. `readKissLog`/`writeKissLog` kappen bei 500 Einträgen (die ältesten fallen weg,
 *      sobald neue dazukommen) — ein Käufer von vor drei Monaten könnte einfach aus der
 *      Datei herausfallen, und mit ihm sein ganzer Fortschritt.
 *   2. `/api/aufraeumen` löscht GESCHENK-Einträge (u. a. `paid === true`-Einträge mit
 *      Ergebnis) nach 90 Tagen (`GESCHENK_TAGE`) — ein 30-Tage-Programm mit 90-Tage-
 *      Anschluss braucht aber LÄNGER als 90 Tage Leben, sonst verschwindet die Checkliste
 *      genau dann, wenn der Kunde am Ende ankommt.
 *
 * Eine eigene Datei je Kauf umgeht beides: Sie liegt unter `try-this-look/future-program/`,
 * einem Pfad, den weder der 500er-Kappung noch der Aufräumer je anfassen (beide kennen nur
 * `kiss-log.json` und die dort verzeichneten Bild-/Video-Pfade). Genau das Muster, das schon
 * beim Avatar (`avatarLesen`/`avatarMerken`) und der Geldbörse trägt: EIN Konto, EINE Datei,
 * nur diese Datei-Funktionen fassen sie an — kein fremder Schreiber kann sie überbügeln
 * (Lehre vom 08.08., [[delete-resurrection-merge-bug]]).
 *
 * DER TOKEN IST DER AUSWEIS, kein Login nötig: Der Link aus der Liefermail trägt `g` (die
 * Auftragsnummer) und `t` (HMAC-SHA256 über `g`, mit demselben Geheimnis wie `schluessel()`
 * in `/api/kiss-deliver` — CRON_SECRET, sonst TRY_THIS_LOOK_ADMIN_PIN). Wer den Link hat, hat
 * bezahlt; eine zweite Anmeldung wäre nur eine weitere Hürde für ein 49-€-Geschenk an sich
 * selbst.
 */

const FUTURE_PROGRAM_DIR = "try-this-look/future-program";

export type FutureProgram = {
  genId: string;
  email: string;
  lang: string;
  ziele: string[];
  zieleFrei?: string;
  createdAt: string;
  /** Erst gesetzt, wenn er die Seite zum ERSTEN Mal öffnet — Tag 1 beginnt, wenn er kommt,
   *  nicht wenn er zahlt (der Future Film muss erst rendern und geliefert werden). */
  startedAt?: string;
  /** Tag-Nummer ("1".."30") → ISO-Zeit des Abhakens. Nur Häkchen setzen, nie entfernen —
   *  eine bereits bestätigte Checkliste darf kein zweiter Schreiber wieder leeren. */
  checks: Record<string, string>;
  /** Das 90-Tage-Ziel, das er an Tag 30 einträgt. */
  ziel90?: string;
  ziel90At?: string;
};

function programPfad(genId: string): string {
  return `${FUTURE_PROGRAM_DIR}/${encodeURIComponent(String(genId ?? "").trim())}.json`;
}

/**
 * Lesen — IMMER frisch gegen den Zwischenspeicher (`?frisch=`), wie `readKissLog`: eine
 * gerade geschriebene Datei liefert der Speicher sonst kurz noch aus dem alten Stand aus,
 * und ein Kunde, der Sekunden nach dem Abhaken neu lädt, sähe sein Häkchen nicht.
 */
export async function futureProgramLesen(genId: string): Promise<FutureProgram | null> {
  const id = String(genId ?? "").trim();
  if (!id) return null;
  try {
    const res = await supabaseFetch(
      `/storage/v1/object/${BUCKET}/${encodeStoragePath(programPfad(id))}?frisch=${Date.now()}`,
    );
    if (!res.ok) return null;
    const t = await res.text();
    if (!t.trim()) return null;
    const p = JSON.parse(t) as FutureProgram;
    if (!p.checks) p.checks = {};
    return p;
  } catch { return null; }
}

/**
 * Schreiben — je Programm-Datei konfliktarm (ein Kunde, eine Datei, kein Merge-Zirkus wie
 * beim Kuss-Protokoll nötig). Aber ein verschlucktes Häkchen darf NICHT still passieren:
 * anders als `avatarMerken` (Komfort, Fehler egal) WIRFT diese Funktion, wenn Supabase den
 * Schreibvorgang ablehnt — der Aufrufer (die API-Route) muss es dem Kunden dann als Fehler
 * zeigen statt ihm ein Häkchen vorzugaukeln, das nie ankam.
 */
export async function futureProgramSchreiben(p: FutureProgram): Promise<void> {
  const id = String(p?.genId ?? "").trim();
  if (!id) throw new Error("futureProgramSchreiben: genId fehlt.");
  await ensureBucket();
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(programPfad(id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify(p),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`futureProgramSchreiben fehlgeschlagen (${res.status}): ${body.slice(0, 200)}`);
  }
}

/**
 * Anlegen — IDEMPOTENT: existiert die Datei schon, wird sie NICHT überschrieben. Der Haken:
 * `bezahltVermerken()` kann für denselben Auftrag mehrfach laufen (Webhook UND Rückkehr des
 * Kunden, siehe kiss-delivery.ts) — ein zweiter Aufruf, der die Datei blind neu schreibt,
 * würde jedes bereits gesetzte Häkchen wieder auf null stellen. Ein leerer Anfangszustand ist
 * hier also kein Vorteil, sondern ein Risiko, das die Prüfung vorher vermeidet.
 */
export async function futureProgramAnlegen(
  genId: string, email: string, lang: string, ziele: string[], zieleFrei?: string,
): Promise<void> {
  const id = String(genId ?? "").trim();
  if (!id) return;
  const bestehend = await futureProgramLesen(id);
  if (bestehend) return;
  const p: FutureProgram = {
    genId: id,
    email: String(email ?? "").trim().toLowerCase(),
    lang: String(lang ?? "en").trim() || "en",
    ziele: Array.isArray(ziele) ? ziele.filter(Boolean).map(String) : [],
    ...(zieleFrei ? { zieleFrei: String(zieleFrei).trim().slice(0, 200) } : {}),
    createdAt: new Date().toISOString(),
    checks: {},
  };
  await futureProgramSchreiben(p);
}

/** Dasselbe Geheimnis wie `schluessel()` in /api/kiss-deliver — ein Token, ein Ort, an dem
 *  es herkommt. */
function geheimnis(): string {
  return (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
}

/** Der Token im Programm-Link: HMAC-SHA256(genId) mit dem Server-Geheimnis, hex, gekürzt auf
 *  32 Zeichen (128 Bit — für einen Link, der nur die eigene Auftragsnummer schützt, reichlich). */
export function futureProgramToken(genId: string): string {
  const s = geheimnis();
  if (!s) return "";
  return crypto.createHmac("sha256", s).update(String(genId ?? "").trim()).digest("hex").slice(0, 32);
}

/** Zeitsicher vergleichen — ein einfaches `===` verriete über die Antwortzeit Zeichen für
 *  Zeichen, wie weit ein geratener Token schon stimmt. */
export function futureProgramTokenOk(genId: string, token: string): boolean {
  const soll = futureProgramToken(genId);
  const ist = String(token ?? "").trim();
  if (!soll || !ist || soll.length !== ist.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(soll, "utf8"), Buffer.from(ist, "utf8"));
  } catch { return false; }
}

/**
 * DER PROGRAMM-LINK, WENN ES IHN WIRKLICH GIBT (11.08.2026, Owner: „wo ist der link zum
 * plan?" — heute steckt er nur in der Liefermail).
 *
 * NUR wenn die Programm-Datei existiert (`futureProgramLesen` fand sie), NICHT nur weil
 * `e.theme === "versprechen"` im Kiss-Log steht. Der ehrlichere Weg: Ein Link, der auf die
 * „ungültig"-Seite führt (Datei fehlt — z. B. weil sie vor dieser Funktion angelegt wurde,
 * oder der Bezahl-Stempel scheiterte), ist schlimmer als gar kein Knopf. Da
 * `bezahltVermerken()` die Datei GENAU beim Bezahl-Stempel anlegt, ist dieser Aufruf danach
 * schon die Wahrheit — kein zusätzlicher Blick ins Kiss-Log nötig.
 *
 * Liefert `undefined`, wenn die Datei fehlt ODER das Server-Geheimnis fehlt
 * (`futureProgramToken` gibt dann "" zurück) — beide Fälle sind „kein Link", kein Fehler.
 */
export async function futureProgramUrl(origin: string, genId: string): Promise<string | undefined> {
  const id = String(genId ?? "").trim();
  if (!id) return undefined;
  const p = await futureProgramLesen(id);
  if (!p) return undefined;
  const token = futureProgramToken(id);
  if (!token) return undefined;
  const base = String(origin ?? "").trim().replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/future-program?g=${encodeURIComponent(id)}&t=${token}`;
}
