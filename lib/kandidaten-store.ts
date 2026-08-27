import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DER KANDIDATEN-POOL (Owner-Änderungsauftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
 * Baustelle F/G — der PIVOT: kein Direkt-Bewerben beim Arbeitgeber mehr. Der Trichter
 * identifiziert Interessierte, bereitet ihr Profil vor und holt die AUSDRÜCKLICHE
 * Einwilligung, dass LuxuryBandit sie passenden Arbeitgebern/Recruiting-Partnern
 * vorstellen darf. Das Geschäfts-Asset ist dieser einwilligungsbasierte Pool.
 *
 * EINE DATEI JE KANDIDAT (`kandidaten/<id>.json`, `<id>` = dieselbe Kiss-Log-/
 * Hauptprofil-Kennung wie das Lebenslauf-Profil) — dasselbe Muster wie
 * `lib/lebenslauf-store.ts`, aus demselben Grund: kein Merge zweier Listen nötig, jeder
 * Kandidat ist sein eigener Schreibvorgang.
 *
 * „IM POOL" HEISST NUR: `einwilligung.status === "erteilt"` — eine Datei ohne diesen
 * Status existiert zwar (der Bewerber hat sie mit seinem Interesse ausgelöst), ist aber
 * für ein Vorstellen bei Arbeitgebern NICHT verwendbar. `/admin/kandidaten` zeigt den
 * Status offen an, verwechselt „gespeichert" nie mit „freigegeben".
 */

export type UmzugAntwort = "ja" | "vielleicht" | "nein";
export type StartVerfuegbarkeit = "sofort" | "2wochen" | "1monat" | "spaeter";
export type Arbeitsform = "remote" | "hybrid" | "vorOrt" | "egal";
export type EinwilligungStatus = "offen" | "erteilt" | "abgelehnt";

export type KandidatProfil = {
  kandidatId: string;
  name?: string;
  email?: string;
  telefon?: string;
  land?: string;
  stadt?: string;
  /** Altersgruppe statt Geburtsdatum (Owner 26.08.2026 „wie alt") — die Firma fragt es
      als Erstes, und als Chip-Auswahl bleibt es antippbar statt tippbar (Hausregel: keine
      persönlichen Freitext-Fragen, die Leute brechen sonst ab). */
  altersgruppe?: string;
  /** „Kein CV heisst: wir müssen alles abfragen" (Owner 26.08.2026) — die Angaben, die
      sonst der Lebenslauf geliefert hätte. Sie füllen ZUGLEICH die Karte des Bewerbers
      (`erfahrung`/`ausbildung`/`ort` am Lebenslauf-Profil). */
  jahreErfahrung?: string;
  ausbildungsstand?: string;
  /** Führerschein-Klassen (Owner 26.08.2026) — bei Fahrer- und Montagestellen die erste
      Frage der Firma. Mehrfach, weil C+E immer auch B bedeutet. */
  fuehrerschein?: string[];
  /** Kam der Bewerber MIT Lebenslauf (Owner 26.08.2026) — im Admin sichtbar, damit sich
      nach Qualität sortieren lässt, statt Bewerber ohne CV auszuschliessen. */
  mitCv?: boolean;
  sprachen?: { sprache: string; niveau?: string }[];
  aktuellerBeruf?: string;
  uebertragbareKompetenzen?: string[];
  empfohleneRollen?: string[];
  /** Die Chance, aus der dieses Interesse entstand — verweist auf `lib/job-chancen.ts`. */
  gewaehlteChanceId?: string;
  /** Angekreuzte Job-Titel aus der einfachen Interesse-Liste (Owner 26.08.2026: „der
      User muss nur abhacken, dann kontaktiere ICH die Firmen") — mehrere möglich,
      verweist auf `lib/job-chancen.ts`-IDs, unabhängig von `gewaehlteChanceId`. */
  interessenChancenIds?: string[];
  /** DIE BRANCHEN, IN DENEN ER ARBEITEN WILL (Owner 26.08.2026) — sie ersetzen die Liste
      echter Anzeigen: Schlüssel aus `lib/branchen.ts`, nie die Beschriftung. */
  branchen?: string[];
  /** Das Urteil über seine Bewerbung (Owner 26.08.2026) — im Admin sichtbar, damit sich
      erkennen lässt, wer eine verschickbare Bewerbung hat. */
  bewerbungNote?: "top" | "solide" | "schwach";
  bewerbungProzent?: number;
  /**
   * DAS PREMIUM-PAKET (Owner 26.08.2026: „persönliche Beratung, 100 Euro, Profibewerbung
   * als PDF und ein Video. Er kann Interesse abhaken und ich kontaktiere ihn.") — bewusst
   * KEIN Sofortkauf: Bei diesem Preis ist der Rückruf das Angebot, nicht die Kasse.
   *
   * `premiumAm` ist der Start der 48-Stunden-Zusage, `premiumKontaktiertAm` ihr Ende.
   * Solange das zweite fehlt, steht eine Zusage offen — genau das zeigt der Admin an,
   * damit kein Versprechen still liegen bleibt (dieselbe Haltung wie bei
   * [[kontaktierteChancenIds]]).
   */
  /** „Suchst du gerade einen Job?" (Owner 26.08.2026) — die Frage am Tor, die neugierige
      Klicker von echten Kandidaten trennt: sofort | monate | schauen. */
  sucheIntent?: "sofort" | "monate" | "schauen";
  /** ZWEI WERTE, BEWUSST GETRENNT (Owner 26.08.2026: „dann hätten wir das Ergebnis für die
      Chance, die sie hat"): `deutschSelbst` ist seine Behauptung am Tor, `deutschGetestet`
      das Ergebnis der fünf gestaffelten Fragen. Die Lücke dazwischen ist für den Owner die
      interessantere Zahl — sie sagt, wie belastbar die Selbsteinschätzung ist. */
  deutschSelbst?: string;
  deutschGetestet?: string;
  /** Die zwei selbst getippten Sätze (Owner 26.08.2026) — im Wortlaut, damit der Owner
      im Admin sieht, wie der Bewerber wirklich schreibt. */
  schreibprobe?: string;
  premiumInteresse?: boolean;
  premiumAm?: string;
  premiumKontaktiertAm?: string;
  /** ALLE Kerndaten, so wie sie in seiner Bewerbung standen (Owner 26.08.2026) — von
      `/api/bewerbung-pruefen` ausgelesen, nie abgefragt. Personenbezogenes (Geburtsdatum,
      Geburtsort, Nationalität) steht nur drin, wenn ER es ins Dokument geschrieben hat. */
  kerndaten?: {
    name?: string; email?: string; telefon?: string; stadt?: string; land?: string;
    geburtsdatum?: string; geburtsjahr?: string; alter?: string; geburtsort?: string; nationalitaet?: string;
    positionierung?: string; profiltext?: string;
    erfahrung?: { rolle?: string; firma?: string; ort?: string; zeitraum?: string; ergebnis?: string }[];
    ausbildung?: { titel?: string; ort?: string; zeitraum?: string }[];
    sprachen?: { sprache?: string; niveau?: string }[];
    kompetenzen?: string[]; schwerpunkte?: string[]; zertifikate?: string[]; fuehrerschein?: string[];
    verfuegbarkeit?: string; gehaltswunsch?: string; umzugsbereit?: string;
  };
  /** Owner hat bei DIESER Chance die Firma bereits kontaktiert (Owner-Auftrag
      26.08.2026: „Wir melden uns" ist ein Versprechen an den Kandidaten — ohne diese
      Liste könnte eine zugesagte Meldung stillschweigend untergehen). Nur im Admin
      gesetzt, nie vom Kandidaten. */
  kontaktierteChancenIds?: string[];
  matchProzent?: number;
  matchEmpfehlung?: "gut" | "bruecke" | "schwach";
  umzug?: UmzugAntwort;
  umzugLaender?: string[];
  arbeitsform?: Arbeitsform[];
  verfuegbarkeit?: StartVerfuegbarkeit;
  gehaltswunsch?: string;
  /** „Findest du eine Video-Bewerbung sinnvoll?" (Chat, 26.08.2026) — ja | unsicher |
      nein; Lead-Qualifizierung für das Video-Produkt. */
  videoMeinung?: string;
  /** Verweise statt Duplikate — CV, zugeschnittener CV, Anschreiben, Strategie liegen
      bereits am Lebenslauf-Profil (`lib/lebenslauf-store.ts`), hier nur die Kennungen. */
  hauptprofilId: string;
  versionId?: string;
  einwilligung: { status: EinwilligungStatus; am?: string; version?: string };
  erstelltAm: string;
  aktualisiertAm: string;
};

/** Konstanten für die Klick-Fragen (Baustelle F) — eine Stelle, nicht in jeder Seite neu
    getippt. Werte sind Anzeige-Text UND Speicherwert zugleich (kurze, feste Liste). */
export const EINWILLIGUNG_VERSION = "pool-v1-2026-08";
export const UMZUG_LAENDER = ["Deutschland", "Österreich", "Schweiz", "Griechenland", "Niederlande", "Irland", "Egal"] as const;
export const START_OPTIONEN: readonly StartVerfuegbarkeit[] = ["sofort", "2wochen", "1monat", "spaeter"];
export const ARBEITSFORM_OPTIONEN: readonly Arbeitsform[] = ["remote", "hybrid", "vorOrt", "egal"];

const pfad = (id: string) => `kandidaten/${id}.json`;

export async function leseKandidat(id: string): Promise<KandidatProfil | null> {
  if (!id) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(id))}`);
  if (!res.ok) return null;
  try { return (await res.json()) as KandidatProfil; } catch { return null; }
}

export async function schreibeKandidat(k: KandidatProfil): Promise<boolean> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(k.kandidatId))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(k),
  });
  return res.ok;
}

/** NUR für `/admin/kandidaten` — listet den Ordner (Muster wie `listeLebenslaeufe`). */
export async function listeKandidaten(): Promise<KandidatProfil[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "kandidaten/", limit: 1000 }),
  });
  if (!res.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string }[];
  const ids = (Array.isArray(dateien) ? dateien : [])
    .map(d => String(d?.name ?? ""))
    .filter(n => n.endsWith(".json"))
    .map(n => n.replace(/\.json$/, ""));
  const profile = await Promise.all(ids.map(leseKandidat));
  return profile
    .filter((p): p is KandidatProfil => !!p)
    .sort((a, b) => (b.aktualisiertAm || "").localeCompare(a.aktualisiertAm || ""));
}
