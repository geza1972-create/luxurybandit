import { randomUUID } from "crypto";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * WER EINEM KÜNSTLER FOLGT (Owner 13.09.2026: „ein Follow-Button einbauen. Follow klappt ein
 * E-Mail-Feld auf und Kunden bekommen dann eine E-Mail, wenn ein Künstler ein neues Bild postet").
 *
 * ── WARUM DAS ETWAS ÄNDERT ──────────────────────────────────────────────────────────────────
 *
 * Bisher ist jeder Besuch ein Einmalbesuch: Wer das Bild schön fand, aber nicht kaufen wollte,
 * ist weg. Ein Follower kommt wieder — und für den Künstler ist es die einzige Zahl, die zählt:
 * Menschen, die auf sein nächstes Werk warten.
 *
 * ── ZWEI STUFEN, WIE BEIM KÜNSTLER SELBST ───────────────────────────────────────────────────
 *
 * 1. `folgenAnmelden` legt die Adresse unter einem Token ab — WARTEND, nicht eingetragen.
 * 2. Erst `folgenBestaetigen` (der Klick in der Mail) schreibt sie in die Liste des Künstlers.
 *
 * Ohne diese Trennung könnte jeder fremde Adressen eintragen, und der Betroffene bekäme Post,
 * die er nie bestellt hat. Dieselbe Lücke, die am 12.09.2026 beim Trichter geschlossen wurde.
 *
 * ── WAS HIER BEWUSST FEHLT ──────────────────────────────────────────────────────────────────
 *
 * Keine öffentliche Followerzahl. Bei zwei Followern schadet sie dem Künstler mehr, als sie
 * nützt — und wir hätten wieder eine Zahl, die etwas verspricht.
 */

/** Eine Adresse, die auf ihre Bestätigung wartet. */
export type WartenderFollower = {
  mandant: string;
  mail: string;
  sprache: string;
  angelegt: string;
};

/** Ein bestätigter Follower in der Liste eines Künstlers. */
export type Follower = {
  mail: string;
  sprache: string;
  seit: string;
  /** Gesetzt, wenn er sich abgemeldet hat — der Eintrag bleibt, damit er nicht erneut angeschrieben wird. */
  abgemeldet?: string;
};

const wartetPfad = (token: string) =>
  `versusforge-folgt-wartet/${token.replace(/[^a-f0-9]/gi, "").slice(0, 64)}.json`;
/* Eine Datei je Adresse, nicht eine Liste je Künstler: Zwei gleichzeitige Anmeldungen würden
   sich in einer gemeinsamen Datei gegenseitig überschreiben ([[delete-resurrection-merge-bug]]). */
const folgerPfad = (mandant: string, mail: string) =>
  `versusforge-folgt/${mandant.replace(/[^a-z0-9-]/gi, "").slice(0, 60)}/${Buffer.from(mail.toLowerCase()).toString("hex").slice(0, 120)}.json`;
const folgerOrdner = (mandant: string) =>
  `versusforge-folgt/${mandant.replace(/[^a-z0-9-]/gi, "").slice(0, 60)}`;

/** Legt eine Anmeldung ab und gibt den Token zurück, der in die Mail gehört. Leer bei Fehler. */
export async function folgenAnmelden(o: { mandant: string; mail: string; sprache: string }): Promise<string> {
  const mail = o.mail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) return "";
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
  const eintrag: WartenderFollower = { mandant: o.mandant, mail, sprache: o.sprache, angelegt: new Date().toISOString() };
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wartetPfad(token))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(eintrag),
  });
  if (!res.ok) {
    console.error("[folgen] Anmeldung nicht abgelegt:", res.status);
    return "";
  }
  return token;
}

/**
 * Löst den Token ein: schreibt die Adresse in die Liste des Künstlers und räumt die Wartemarke weg.
 * Gibt den Mandanten zurück, damit die Seite danach dorthin führen kann — leer, wenn der Token
 * nicht (mehr) gilt.
 */
export async function folgenBestaetigen(token: string): Promise<string> {
  if (!token) return "";
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(wartetPfad(token))}`);
  if (!res.ok) return "";
  let wartend: WartenderFollower | null = null;
  try { wartend = (await res.json()) as WartenderFollower; } catch { return ""; }
  if (!wartend?.mandant || !wartend.mail) return "";

  const eintrag: Follower = { mail: wartend.mail, sprache: wartend.sprache, seit: new Date().toISOString() };
  const put = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(folgerPfad(wartend.mandant, wartend.mail))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(eintrag),
  });
  if (!put.ok) {
    console.error("[folgen] Follower nicht gespeichert:", put.status);
    return "";
  }
  /* Der Token gilt einmal — sonst trägt ein zweiter Klick dieselbe Adresse erneut ein. */
  await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [wartetPfad(token)] }),
  }).catch(() => undefined);
  return wartend.mandant;
}

/** Alle bestätigten Follower eines Künstlers, ohne die Abgemeldeten. */
export async function folgerListe(mandant: string): Promise<Follower[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: folgerOrdner(mandant), limit: 1000 }),
  }).catch(() => null);
  if (!res?.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string }[];
  const liste = await Promise.all(dateien.map(async d => {
    if (!d.name) return null;
    const einzeln = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${folgerOrdner(mandant)}/${d.name}`)}`).catch(() => null);
    if (!einzeln?.ok) return null;
    try { return (await einzeln.json()) as Follower; } catch { return null; }
  }));
  return liste.filter((f): f is Follower => !!f && !f.abgemeldet);
}

/**
 * ALLE FOLLOWER ÜBER ALLE KÜNSTLER — für den Rundbrief (`lib/portal-empfaenger.ts`).
 *
 * Owner 13.09.2026: „die Follower bekommen auch Newsletter von uns." Damit sind sie eine Quelle
 * neben Wetter, Kiss und den Kuratorinnen — und gehören dort hinein, statt als sechste Liste
 * danebenzustehen, die beim nächsten Versand jemand vergisst.
 *
 * ABGEMELDETE FALLEN HIER SCHON HERAUS, und die Sperrliste des Portals schlägt danach ohnehin
 * noch einmal zu. Doppelt gesichert ist hier richtig: Eine Adresse, die einmal Nein gesagt hat,
 * darf über keinen Weg zurückkommen.
 */
export async function alleFollower(): Promise<{ mail: string; sprache?: string }[]> {
  const ordner = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "versusforge-folgt", limit: 1000 }),
  }).catch(() => null);
  if (!ordner?.ok) return [];
  const kuenstler = (await ordner.json().catch(() => [])) as { name?: string }[];
  const listen = await Promise.all(
    kuenstler.map(k => (k.name ? folgerListe(k.name) : Promise.resolve([]))),
  );
  const gesehen = new Set<string>();
  const alle: { mail: string; sprache?: string }[] = [];
  for (const f of listen.flat()) {
    const mail = f.mail.trim().toLowerCase();
    if (!mail || gesehen.has(mail)) continue;
    gesehen.add(mail);
    alle.push({ mail, sprache: f.sprache });
  }
  return alle;
}

/** Abmelden — der Eintrag bleibt mit Datum stehen, damit er nicht erneut angeschrieben wird. */
export async function folgenAbmelden(mandant: string, mail: string): Promise<boolean> {
  const pfad = folgerPfad(mandant, mail.trim().toLowerCase());
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (!res.ok) return false;
  let f: Follower | null = null;
  try { f = (await res.json()) as Follower; } catch { return false; }
  if (!f) return false;
  const put = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ ...f, abgemeldet: new Date().toISOString() }),
  });
  return put.ok;
}
