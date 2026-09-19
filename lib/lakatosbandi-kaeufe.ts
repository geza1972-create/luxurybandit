import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * ── DIE VERKAUFSLISTE (Owner 19.09.2026: „ich muss hier die Käufe sehen, mit Poster, die
 * generiert worden sind" · „eigentlich müssen sie auch auf dem Dashboard stehen des Künstlers")
 *
 * Jedes erzeugte Blatt liegt als Kundenbild mit `stil: true` — den Merker setzt ausschliesslich
 * die BEZAHLTE Erzeugungs-Route. Die Liste ist damit zugleich die Liste der Verkäufe: Was hier
 * steht, hat jemand bezahlt.
 *
 * EINE STELLE FÜR ZWEI ANSICHTEN — die Freigabe des Owners (alle) und das Dashboard des
 * Künstlers (nur seine). Zwei Abfragen nebeneinander würden irgendwann verschiedene Zahlen
 * zeigen, und dann glaubt keiner von beiden mehr seiner eigenen Seite.
 *
 * DAS BILD IST NICHT DABEI. Es kommt einzeln über die jeweilige Route; dreissig Fotos in einer
 * Antwort wären ein paar Megabyte, nur damit eine Liste erscheint.
 */
export type Kauf = {
  id: string;
  mandant: string;
  werk: string;
  titel: string;
  satz: string;
  mail: string;
  am: string;
};

export async function kaeufeLesen(nurMandant?: string, hoechstens = 500): Promise<Kauf[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "lakatosbandi-kundenbild", limit: hoechstens }),
  });
  if (!res.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string; updated_at?: string }[];

  const raus: Kauf[] = [];
  for (const f of Array.isArray(dateien) ? dateien : []) {
    const name = String(f?.name ?? "");
    if (!name.endsWith(".json")) continue;
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`lakatosbandi-kundenbild/${name}`)}`);
    if (!r.ok) continue;
    const z = (await r.json().catch(() => null)) as
      { mandant?: string; werk?: string; stil?: boolean; titel?: string; satz?: string; mail?: string; am?: string } | null;
    /* Nur bezahlte Läufe, und wenn gefragt, nur die eines Künstlers. */
    if (!z?.stil) continue;
    if (nurMandant && z.mandant !== nurMandant) continue;
    raus.push({
      id: name.replace(/\.json$/, ""),
      mandant: String(z.mandant ?? ""),
      werk: String(z.werk ?? ""),
      titel: String(z.titel ?? ""),
      satz: String(z.satz ?? ""),
      mail: String(z.mail ?? ""),
      am: String(z.am ?? f?.updated_at ?? ""),
    });
  }
  raus.sort((a, b) => b.am.localeCompare(a.am));
  return raus;
}
