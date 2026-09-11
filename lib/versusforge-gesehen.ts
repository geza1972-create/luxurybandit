import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantSauber } from "@/lib/versusforge-namen";

/**
 * WANN ER ZULETZT IN SEINEM DASHBOARD WAR — für den roten Punkt (Owner 11.09.2026: „eventuell einen roten Punkt auf dem
 * Dashboard, für neue Anfragen vom Chat oder neue Besucher").
 *
 * EIGENE DATEI, NICHT IM MANDANTEN-EINTRAG: Jeder Dashboard-Besuch schreibt. Im Eintrag könnte das eine Änderung
 * überschreiben, die er im selben Moment auf „Seite bearbeiten" speichert ([[delete-resurrection-merge-bug]]).
 */
const pfad = (mandant: string) => `versusforge-gesehen/${mandantSauber(mandant)}.json`;

export async function dashboardGesehenLesen(mandant: string): Promise<string> {
  if (!mandantSauber(mandant)) return "";
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant))}`);
  if (!res.ok) return "";
  const d = (await res.json().catch(() => ({}))) as { zeit?: unknown };
  return typeof d.zeit === "string" ? d.zeit : "";
}

export async function dashboardGesehenMerken(mandant: string): Promise<void> {
  if (!mandantSauber(mandant)) return;
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(mandant))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ zeit: new Date().toISOString() }),
  }).catch(() => undefined);
}
