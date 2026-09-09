import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * JEDE KASSENSITZUNG NUR EINMAL EINLÖSEN (08.09.2026).
 *
 * Ohne diese Sperre wäre die Rückkehr von der Kasse eine Geldquelle: Die Sitzungsnummer
 * steht in der Adresse, und wer die Seite mit derselben Adresse zehnmal neu lädt, bekäme
 * zehn Durchläufe für eine Zahlung. Genau derselbe Fehler wie „Aufladung ist kein Kauf" —
 * ein Vorgang, der mehrfach ausgeführt wird, weil ihn niemand als erledigt markiert hat.
 *
 * EINE DATEI JE SITZUNG, angelegt BEVOR gutgeschrieben wird. Wer sie schon vorfindet, hat
 * schon eingelöst.
 */

const pfad = (sitzung: string) => `versusforge-eingeloest/${encodeURIComponent(sitzung).slice(0, 150)}.json`;

/** Wahr, wenn diese Sitzung hier zum ERSTEN Mal ankommt. */
export async function einmalig(sitzung: string): Promise<boolean> {
  const adresse = `/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(sitzung))}`;
  const da = await supabaseFetch(adresse);
  if (da.ok) return false;
  /* Ohne `x-upsert` legt der Speicher NUR an, wenn nichts da ist — zwei gleichzeitige
     Rückkehrer können sich so nicht gegenseitig überholen. */
  const res = await supabaseFetch(adresse, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zeit: new Date().toISOString() }),
  });
  return res.ok;
}
