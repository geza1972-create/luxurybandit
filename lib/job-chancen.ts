import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DER JOBCHANCEN-POOL (Owner-Auftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
 * Baustelle D) — von Hand über `/admin/chancen` gepflegt, KEIN Scraping, KEINE Job-API.
 *
 * ZWEI DATENEBENEN, WEIL WIR DIE FIRMA NICHT VERTRETEN: Eine öffentliche Stellenanzeige
 * dient nur als Marktsignal (welche Rollen/Sprachen/Standorte werden gesucht) — ohne
 * Partner-Vereinbarung darf nie der Eindruck entstehen, LuxuryBandit vertrete den
 * Arbeitgeber. Deshalb ist `intern` streng vom kandidatensichtbaren Teil getrennt, und
 * `chanceFuerKandidat()` ist die EINE Stelle im Haus, die diese Trennung durchsetzt.
 *
 * QUELLEN-COMPLIANCE (Zusatzänderung, selber Tag): Eine Marktchance ist NIE eine Kopie
 * der Original-Anzeige, sondern eine eigenständig neu formulierte, neutrale
 * Zusammenfassung. `intern.quellenStatus` hält fest, ob der Owner sie geprüft hat —
 * `chanceIstVeroeffentlichbar()` ist die EINE Stelle, die entscheidet, ob eine Chance
 * im Funnel erscheinen darf. Beide Regeln gelten UNABHÄNGIG voneinander: eine Chance
 * kann gespeichert, aber nicht sichtbar sein.
 */

export type Remote = "remote" | "hybrid" | "vorOrt";
export type QuellenStatus = "manuell_geprueft" | "partner" | "unklar";

export type JobChanceIntern = {
  firma?: string;
  originalTitel?: string;
  /** Volltext der Quelle — Futter für Match/Mappe (Baustelle A/C), verlässt den Server
      selbst dort nie Richtung Kandidat, nur als Eingabe in einen weiteren KI-Aufruf. */
  originalText?: string;
  quelleUrl?: string;
  quellePlattform?: string;
  quelleDatum?: string;
  notizen?: string;
  /** "manuell_geprueft" = Owner hat die Quelle angesehen und die neutrale Marktchance
      bewusst freigegeben · "partner" = Arbeitgeber/Recruiting-Partner hat die Verwendung
      freigegeben · "unklar" = noch nicht geprüft (Anlage-Zustand). */
  quellenStatus: QuellenStatus;
};

export type JobChance = {
  id: string;
  aktiv: boolean;
  /** false (Regelfall im MVP) = MARKTCHANCE, wir vertreten die Firma NICHT ·
      true = PARTNER-JOB, von einem Arbeitgeber/Recruiting-Partner freigegeben (Wording/
      Branding dafür ist SPÄTER, im MVP keine eigene Partner-Funktionalität). */
  partnerFreigabe: boolean;
  // ── KANDIDATEN-SICHTBAR ──
  rolle: string;
  land: string;
  stadt?: string;
  remote: Remote;
  sprachen: string[];
  gehalt?: string;
  umzugNoetig?: boolean;
  anforderungen: string[];
  quereinstiegGeeignet: boolean;
  kurzbeschreibung: string;
  kategorie: string;
  hinzugefuegtAm: string;
  // ── NUR INTERN ──
  intern: JobChanceIntern;
};

/** Die kandidatensichtbare Form — exakt `JobChance` ohne `intern`. */
export type JobChanceKandidat = Omit<JobChance, "intern">;

const POOL_PFAD = "jobs/pool.json";
export const CHANCEN_DECKEL = 100;

export async function leseChancenPool(): Promise<JobChance[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(POOL_PFAD)}`);
    if (!res.ok) return [];
    const daten = await res.json().catch(() => null);
    return Array.isArray(daten) ? (daten as JobChance[]) : [];
  } catch { return []; }
}

export async function schreibeChancenPool(liste: JobChance[]): Promise<boolean> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(POOL_PFAD)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true" },
      body: JSON.stringify(liste),
    });
    return res.ok;
  } catch { return false; }
}

export async function leseChance(id: string): Promise<JobChance | null> {
  const alle = await leseChancenPool();
  return alle.find(c => c.id === id) ?? null;
}

/**
 * UNGEPRÜFTE CHANCEN ERSCHEINEN NIE ÖFFENTLICH (Zusatzänderung) — die EINE Bedingung,
 * die sowohl die Admin-Route (verweigert `aktiv:true` sonst) als auch jede Lese-Route
 * für den Funnel (Baustelle E) prüfen muss. Zwei Prüfstellen, eine Regel — nie von Hand
 * an zwei Orten dieselbe Bedingung tippen.
 */
export function chanceIstVeroeffentlichbar(c: JobChance): boolean {
  return c.aktiv === true && (c.partnerFreigabe === true || c.intern?.quellenStatus === "manuell_geprueft");
}

export async function veroeffentlichbareChancen(): Promise<JobChance[]> {
  const alle = await leseChancenPool();
  return alle.filter(chanceIstVeroeffentlichbar);
}

/**
 * DIE EINE ABSTREIF-STELLE (Baustelle D, eiserne Regel) — jede Route, die eine Chance
 * an den Client gibt, geht durch diese Funktion. `intern.*` verlässt den Server über
 * diesen Weg nie Richtung Kandidat.
 */
export function chanceFuerKandidat(c: JobChance): JobChanceKandidat {
  const { intern: _intern, ...rest } = c;
  return rest;
}
