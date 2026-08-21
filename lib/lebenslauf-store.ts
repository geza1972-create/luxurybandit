import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * EIGENER, KLEINER SPEICHER FÜR DEN LEBENSLAUF (Owner 19.08.2026, erste Version des
 * Quereinsteiger-Portals). Bewusst NICHT im gemeinsamen `TryThisLookState`-Blob
 * (try-this-look-store.ts) — der ist gross und trägt drei bekannte Fallen beim Schreiben
 * (Memory `delete-resurrection-merge-bug`: deletedIds nötig, zwei Merge-Stellen, zwei
 * Schreibvorgänge nacheinander verlieren den ersten). Ein eigener, kleiner Pfad mit
 * Eintrag-für-Eintrag-Schreiben (ein `id` = eine Datei) hat diese Fallen nicht, weil nie
 * zwei Vorgänge dieselbe Liste zusammenführen müssen. Nutzt dieselbe Supabase-Verbindung
 * (`supabaseFetch`/`BUCKET`/`encodeStoragePath`) wie der Rest des Hauses.
 */

export type LebenslaufProfil = {
  id: string;
  erstelltAm: string;
  name?: string;
  email?: string;
  /**
   * KEIN KI-AVATAR — EINE ECHTE EIGENAUFNAHME (Owner 20.08.2026, siehe Memory
   * `lebenslauf-video-eigenaufnahme`). Ablauf: Lebenslauf hoch → KI liest ihn aus und
   * schreibt `sprechtext` → Nutzer nimmt sich selbst damit auf → `videoUrl` kommt NACH der
   * Zahlung/Auswertung dazu (zweiter Schritt, `lebenslauf-fertigstellen`-Route).
   */
  sprechtext?: string;
  videoUrl?: string;
  /** Kein eigener Foto-Upload mehr (siehe `sprechtext`-Kommentar oben) — das Video liefert
      das Bild. Bleibt optional stehen für ältere Test-Profile / einen möglichen Poster-Pfad. */
  fotoUrl?: string;
  stichpunkte: string[];
  kategorien: string[];
  bezahlt: boolean;
  /**
   * KONTAKTDATEN SIND VERSTECKT, BIS WIR SIE FREIGEBEN (Owner 20.08.2026: „wenn ich eine
   * Anzeige sehe, frage ich die Firma, ob ich ihnen 5 Kandidaten schicken darf. Sie sagen
   * Kandidat 3 und 4 passt, geben sie uns die Kontaktdaten — also eine extra Karte für
   * Kontaktdaten, die ich ausblenden kann").
   *
   * Das ist das Vermittlungsmodell: die Profilseite geht an Firmen OHNE Kontaktdaten (die
   * Karte fehlt einfach); erst wenn eine Firma konkretes Interesse an genau diesem Kandidaten
   * bestätigt, wird diese eine Zahl auf `true` gesetzt und die Karte erscheint. Default
   * `false` — kein Schreibvorgang setzt sie versehentlich sichtbar.
   */
  kontaktSichtbar?: boolean;
};

const pfad = (id: string) => `lebenslauf/${id}.json`;

export async function leseLebenslauf(id: string): Promise<LebenslaufProfil | null> {
  if (!id) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(id))}`);
  if (!res.ok) return null;
  try {
    return (await res.json()) as LebenslaufProfil;
  } catch {
    return null;
  }
}

export async function schreibeLebenslauf(profil: LebenslaufProfil): Promise<boolean> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(profil.id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(profil),
  });
  return res.ok;
}
