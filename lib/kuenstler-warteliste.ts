import { randomUUID } from "crypto";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * ANMELDUNGEN, DIE AUF IHRE BESTÄTIGUNG WARTEN (Owner 12.09.2026: „ich glaube, du hast die Seite
 * ohne seine E-Mail-Bestätigung angelegt" · „also vorher").
 *
 * ── WARUM ES DIESE ABLAGE GIBT ──────────────────────────────────────────────────────────────
 *
 * Bis hierher legte der Trichter die Seite sofort an und schickte die Mail hinterher. Wer die
 * E-Mail-Adresse eines Künstlers kannte, konnte damit in seinem Namen eine Seite erzeugen — und
 * bei einer bestehenden Adresse sogar fremde Bilder an seine Seite hängen. Die Mail kam dann
 * beim Richtigen an, aber der Schaden war schon da.
 *
 * JETZT WARTET ALLES HIER: Bilder, Preis, Name und Adresse liegen unter einem Token, bis jemand
 * den Link in der Mail öffnet. Erst dieser Klick legt den Künstler an. Wer die Adresse nicht
 * lesen kann, löst nichts aus.
 *
 * ── WAS DAS KOSTET ──────────────────────────────────────────────────────────────────────────
 *
 * Die Bilder reisen als Text mit (data:-URLs) — bei zehn Werken rund zwei bis drei Megabyte je
 * Anmeldung. Nach dem Bestätigen wird der Eintrag gelöscht. Was nie bestätigt wird, bleibt
 * liegen; `wartendeAufraeumen` entfernt Einträge, die älter sind als eine Frist.
 *
 * DER TOKEN IST DER SCHLÜSSEL: 32 zufällige Zeichen, nur in der Mail. Er steht in keinem Link
 * auf der Seite und in keiner Antwort des Chats.
 */

export type WartendeAnmeldung = {
  /** Seine Adresse — dorthin ging die Mail, und nur von dort kann bestätigt werden. */
  mail: string;
  /** Sein Künstlername, aus dem die Adresse seiner Seite entsteht. */
  name: string;
  sprache: string;
  geraet: string;
  /** Sein Ja zur Übersicht auf lakatosbandi.com. */
  portal: boolean;
  /** Was er für seine Werke verlangt — ein Satz für alle Bilder. */
  preisSpanne: string;
  /** Titel · Technik · Größe · Jahr zum ersten Werk, falls im Chat genannt. */
  werkInfo: Record<string, string>;
  /** Sein Preis für das erste Werk, falls genannt. */
  preis: string;
  /** Seine Bilder als data:-URLs, in der Reihenfolge, in der er sie hochgeladen hat. */
  bilder: string[];
  angelegt: string;
};

const pfad = (token: string) => `versusforge-wartet/${token.replace(/[^a-f0-9]/gi, "").slice(0, 64)}.json`;

/** Legt eine Anmeldung ab und gibt den Token zurück, der in die Mail gehört. */
export async function wartendeSpeichern(daten: Omit<WartendeAnmeldung, "angelegt">): Promise<string> {
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
  const eintrag: WartendeAnmeldung = { ...daten, angelegt: new Date().toISOString() };
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(token))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(eintrag),
  });
  if (!res.ok) {
    console.error("[warteliste] Anmeldung nicht abgelegt:", res.status);
    return "";
  }
  return token;
}

/**
 * ── DER LINK LÄUFT NACH FÜNF STUNDEN AB (Owner 13.09.2026: „der Link muss in 5 Stunden ablaufen,
 * wenn sie nicht bestätigt") ─────────────────────────────────────────────────────────────────
 *
 * Was hier liegt, ist nicht harmlos: seine Bilder, sein Name, seine E-Mail-Adresse — und ein
 * Token, der damit eine Seite anlegt. Ein Link, der wochenlang gilt, ist wochenlang ein
 * Einfallstor: Wer die Mail später in die Hände bekommt (geteiltes Postfach, weitergeleitete
 * Nachricht, verlorenes Telefon), legt in seinem Namen an.
 *
 * FÜNF STUNDEN SIND GENUG für jemanden, der gerade hochgeladen hat und auf seine Seite wartet —
 * und kurz genug, dass ein vergessener Link nicht zum Problem wird.
 *
 * DIE FRIST STEHT AN EINER STELLE. Sie an drei Orten einzeln hinzuschreiben ist genau der Fehler,
 * der bei der Werke-Grenze dazu geführt hat, dass Trichter, Formular und Route drei verschiedene
 * Zahlen kannten.
 */
export const WARTE_FRIST_STUNDEN = 5;

export async function wartendeLesen(token: string): Promise<WartendeAnmeldung | null> {
  if (!token) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(token))}`);
  if (!res.ok) return null;
  let eintrag: WartendeAnmeldung;
  try {
    eintrag = (await res.json()) as WartendeAnmeldung;
  } catch {
    return null;
  }

  /**
   * ABGELAUFEN SIEHT AUS WIE NICHT VORHANDEN — und wird gleich weggeräumt.
   *
   * `null` zurückzugeben genügt nicht: Der Eintrag bliebe mit Bildern und Adresse für immer
   * liegen, und `wartendeAufraeumen` (unten) läuft nur, wenn jemand es anstösst. Wer den
   * abgelaufenen Link öffnet, räumt seine eigenen Daten damit selbst weg.
   *
   * OHNE ZEITSTEMPEL GILT ER: Ein Eintrag aus der Zeit vor dieser Frist soll nicht deshalb
   * verfallen, weil ihm ein Feld fehlt.
   */
  const gesetzt = Date.parse(String(eintrag.angelegt ?? ""));
  if (Number.isFinite(gesetzt) && Date.now() - gesetzt > WARTE_FRIST_STUNDEN * 60 * 60 * 1000) {
    console.warn("[warteliste] Abgelaufen, wird entfernt:", eintrag.mail?.slice(0, 3) + "…", eintrag.angelegt);
    await wartendeLoeschen(token);
    return null;
  }
  return eintrag;
}

/**
 * ALLES WEGRÄUMEN, WAS ÜBER DER FRIST LIEGT — auch das, was nie wieder geöffnet wird.
 *
 * Der Kommentar oben in dieser Datei versprach diese Funktion seit dem 12.09.2026; gegeben hat es
 * sie nicht. Unbestätigte Anmeldungen blieben mit Bildern und Adresse dauerhaft liegen.
 */
export async function wartendeAufraeumen(): Promise<number> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "versusforge-wartet/", limit: 1000 }),
  }).catch(() => null);
  if (!res?.ok) return 0;
  const dateien = ((await res.json().catch(() => [])) as { name?: string }[])
    .map(d => String(d?.name ?? "")).filter(n => n.endsWith(".json"));

  const grenze = Date.now() - WARTE_FRIST_STUNDEN * 60 * 60 * 1000;
  const weg: string[] = [];
  for (const name of dateien) {
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`versusforge-wartet/${name}`)}`).catch(() => null);
    if (!r?.ok) continue;
    try {
      const e = (await r.json()) as WartendeAnmeldung;
      const gesetzt = Date.parse(String(e.angelegt ?? ""));
      if (Number.isFinite(gesetzt) && gesetzt < grenze) weg.push(`versusforge-wartet/${name}`);
    } catch { /* unlesbar: lieber liegen lassen als blind löschen */ }
  }
  if (!weg.length) return 0;
  await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: weg }),
  }).catch(() => undefined);
  console.log(`[warteliste] ${weg.length} abgelaufene Anmeldungen entfernt.`);
  return weg.length;
}

/**
 * EIN TOKEN GILT GENAU EINMAL. Gelöscht wird nach dem Anlegen — sonst legt ein zweiter Klick auf
 * denselben Link eine zweite Seite an (der Name wäre dann `name-2`, und er hätte zwei).
 */
export async function wartendeLoeschen(token: string): Promise<void> {
  if (!token) return;
  await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [pfad(token)] }),
  }).catch(() => undefined);
}
