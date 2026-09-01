import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DIE KUNDENLISTE FÜR DAS TALENT-NETWORK (Owner 01.09.2026: „Recruiterseite und Funnel sind
 * ein Paket. Wenn wir ein Funnel optimieren, dann müssen die beide anpassen.").
 *
 * JEDER KUNDE BEKOMMT SEINE EIGENE ADRESSE — `/joburi/[slug]` und `/kunde/[slug]` — statt
 * eines Parameters am allgemeinen Funnel: eine Adresse lässt sich verschicken, merken und
 * bookmarken, ein Parameter geht beim ersten Weiterleiten verloren.
 *
 * EIN PASSWORT PRO KUNDE, KEIN EINZEL-LOGIN: Der Kunde ist eine Firma, kein einzelner
 * Nutzer — ein geteiltes Passwort reicht für „die Personalabteilung sieht ihre Zahlen",
 * ohne ein ganzes Konto-System für eine Handvoll Firmen aufzubauen.
 *
 * EIGENE, KLEINE DATEI STATT IM GEMEINSAMEN BLOB: dieselbe Begründung wie bei
 * `joburi-store.ts` (Memory `delete-resurrection-merge-bug`) — eine Liste, die als Ganzes
 * gelesen und geschrieben wird, ist gegen die drei Merge-Fallen immun.
 */

const PFAD = "joburi/kunden.json";

export type Kunde = {
  slug: string;
  name: string;
  /** Was auf der Kunden-Seite und im Funnel-Titel steht, z. B. "Krankenpfleger für ein
      Pflegehaus". Ersetzt die Branchen-Beschreibung im generischen Text. */
  branche: string;
  /** Platzhalter im Beruf-Feld des Funnels, z. B. "z. B. Krankenpfleger, Altenpfleger". */
  berufPlatzhalter: string;
  /** Für die Kunden-Statistik-Seite (`/kunde/[slug]`) — im Klartext, weil es kein
      Login-System mit Hashing für eine Handvoll Firmenpasswörter braucht. */
  passwort: string;
  aktiv: boolean;
  erstelltAm: string;
};

type Liste = { kunden: Kunde[]; gespeichertAm: string };

export async function leseKunden(): Promise<Kunde[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(PFAD)}?frisch=${Date.now()}`);
    if (!res.ok) return [];
    const daten = (await res.json().catch(() => null)) as Liste | null;
    return Array.isArray(daten?.kunden) ? daten.kunden : [];
  } catch {
    return [];
  }
}

export async function schreibeKunden(kunden: Kunde[]): Promise<boolean> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(PFAD)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body: JSON.stringify({ kunden: kunden.slice(0, 200), gespeichertAm: new Date().toISOString() } satisfies Liste),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function kunde(slug: string): Promise<Kunde | null> {
  const alle = await leseKunden();
  return alle.find(k => k.slug === slug && k.aktiv) ?? null;
}

/** Nur Kleinbuchstaben, Ziffern und Bindestrich — dieselbe Adresse muss in einem Jahr noch
    dasselbe bedeuten, ein Leerzeichen oder Umlaut in der URL wäre eine stille Falle. */
export function slugify(v: string): string {
  return v.toLowerCase().trim()
    .replace(/[äöüß]/g, m => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[m] ?? m))
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
