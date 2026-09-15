import { randomUUID } from "node:crypto";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * „HIER HABEN WIR DIE ANZEIGE GEÄNDERT" (Owner 14.09.2026: „ich will noch einen Punkt, an dem wir
 * eine Anzeige geändert haben, um zu sehen ob die Insights auf dem Trichter steigen oder sinken").
 *
 * ── WARUM DAS NICHT AUS DEN DATEN ABLESBAR IST ──────────────────────────────────────────────
 *
 * Wir sehen jederzeit, wie viele Leute im Trichter sind. Wir sehen NICHT, warum die Zahl heute
 * anders ist als gestern — ob die neue Anzeige zieht, ob das Budget andere Leute bringt, oder ob
 * schlicht Sonntag ist. Diese Auskunft kann nur der Owner geben, weil nur er weiss, wann er etwas
 * geändert hat.
 *
 * Eine Marke ist deshalb kein gemessener Wert, sondern eine SETZUNG: ein Datum, ein kurzer Satz.
 * Auf der Zeitleiste steht sie als senkrechter Strich, und was rechts davon passiert, ist die
 * Antwort auf die Frage „hat es etwas gebracht".
 *
 * ── SIE WIRD NIE GESCHÄTZT ──────────────────────────────────────────────────────────────────
 *
 * Wenn keine Marke gesetzt ist, ist die Zeitleiste leer. Ein Strich, den ich selbst irgendwo
 * hingerechnet habe („hier sieht es nach einer Änderung aus"), wäre eine erfundene Ursache — und
 * gegen den würde der Owner später echte Entscheidungen treffen.
 *
 * ── FLACHE ABLAGE, ANDERS ALS BEIM EREIGNISPROTOKOLL ────────────────────────────────────────
 *
 * `versusforge-marke/<Zeit>-<Zufall>.json`, ohne Tagesordner. Ereignisse gibt es hundertfach am
 * Tag, Marken ein paar im Monat — die will man ALLE sehen, nicht die von heute. Der Name beginnt
 * mit dem vollen Zeitstempel, also ist die Liste ohne Lesen geordnet.
 */

export type Marke = {
  zeit: string;
  /** Was geändert wurde, in den Worten des Owners. */
  text: string;
};

const ORDNER = "versusforge-marke";

/** Setzt eine Marke auf jetzt. Gibt zurück, ob es geklappt hat — hier wartet jemand darauf. */
export async function markeSetzen(text: string): Promise<boolean> {
  const sauber = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!sauber) return false;
  const zeit = new Date().toISOString();
  const datei = `${zeit.replace(/[:.]/g, "")}-${randomUUID().slice(0, 6)}.json`;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${ORDNER}/${datei}`)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ zeit, text: sauber } satisfies Marke),
  }).catch(() => null);
  return !!res?.ok;
}

/** Alle Marken, neueste zuerst. Es sind wenige — sie werden vollständig gelesen. */
export async function markenLesen(grenze = 20): Promise<Marke[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix: `${ORDNER}/`,
      limit: Math.max(grenze, 50),
      sortBy: { column: "name", order: "desc" },
    }),
  }).catch(() => null);
  if (!res?.ok) return [];

  const dateien = ((await res.json().catch(() => [])) as { name?: string; id?: string | null }[])
    .filter(d => d?.id && String(d.name ?? "").endsWith(".json"))
    .slice(0, grenze);

  const gelesen = await Promise.all(dateien.map(async d => {
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${ORDNER}/${d.name}`)}`).catch(() => null);
    if (!r?.ok) return null;
    try { return (await r.json()) as Marke; } catch { return null; }
  }));

  return (gelesen.filter(Boolean) as Marke[]).sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
}
