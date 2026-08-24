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
  /**
   * ALLE beruflichen Stationen, neueste zuerst (Owner 21.08.2026: „wo sind die Jahre in der
   * Bewerbung"; Owner 24.08.2026, am eigenen 5-seitigen CV: „es muss alles rein" — hebt die
   * frühere Deckelung auf drei Stationen für ECHTE Profile auf, die galt nur fürs kuratierte
   * Muster). `firma`/`ergebnis` seit 24.08.2026 — die Vorlage hatte für beide schon eigene
   * Zeilen, sie standen nur nie befüllt.
   */
  erfahrung?: { rolle: string; firma?: string; zeitraum: string; ergebnis?: string }[];
  /** Ausbildungsstationen — die Vorlage hat einen eigenen Abschnitt dafür (Owner 24.08.2026:
      vorher nie befüllt, weil die Auswertung sie nie abgefragt hat). */
  ausbildung?: { titel: string; ort?: string; zeitraum?: string }[];
  /** Sprachen mit Niveau — derselbe Fall wie Ausbildung. */
  sprachen?: { sprache: string; niveau?: string }[];
  /** Kurze Fähigkeiten-Begriffe für die Icon-Chips (Owner 21.08.2026: „wo sind die Skills mit
      Icons"). Das passende Symbol sucht die Seite selbst per Stichwort, kein KI-Icon-Name. */
  kompetenzen?: string[];
  /**
   * GEGEN DIE REDUNDANZ (Owner 24.08.2026: „auf dieser Seite habe ich lauter Redundanzen.
   * Wieso?" — Kopf-Chips, Rollen-Titel und alle Rollen-Gründe waren dieselben zwei Listen,
   * mehrfach verwendet). Deshalb liefert die Auswertung jetzt EIGENE Felder:
   *   `schwerpunkte` — 3–4 Arbeitsfelder für die Kopf-Chips (keine Jobtitel, ≠ kompetenzen)
   *   `passung`      — je vorgeschlagener Rolle 3–4 EIGENE, CV-belegte Gründe
   */
  schwerpunkte?: string[];
  passung?: { rolle: string; gruende: string[] }[];
  /** Stadt/Ort und Telefon aus dem Lebenslauf, für die eigene Kontakt-Karte. */
  ort?: string;
  telefon?: string;
  /** Die Antwort auf „Wann kannst du anfangen?" aus dem Trichter — als Kennung
      (`sofort` · `1monat` · `flexibel`), nie als Wort: Die Seite zeigt sie später in der
      Sprache des Betrachters (Übersetzer `executiveAusProfil`). */
  verfuegbarkeit?: string;
  /**
   * DIE EIGENAUFNAHME DES BEWERBERS (Owner 24.08.2026: „DU musst das Original-Video
   * speichern unter Käufe und das Ergebnis. Ich muss sie herunterladen können") — der
   * Supabase-Pfad der Aufnahme, die er im Trichter hochgeladen hat (Video oder Audio).
   * Sie ist sein Rohmaterial (z. B. für ein Werbevideo Vorher/Nachher) und gehört ihm wie
   * das Ergebnis; die Galerie zeigt beide als eigene Kacheln (`/api/my-videos`).
   */
  aufnahmePath?: string;
  /**
   * DAS ABO „SEITE BLEIBT ONLINE" (Owner-Seitentext 24.08.2026: „4,99 im Monat — Seite
   * bleibt online, unbegrenzt aktualisieren, monatlich kündbar. Ohne Abo bleibt deine Seite
   * 30 Tage erreichbar."). Gesetzt vom Webhook (kind `lebenslauf-abo`) und von der
   * Rückkehr-Bestätigung in /api/lebenslauf-abo-checkout — beide idempotent. `aboSubId`
   * ist die Stripe-Subscription; über ihre Metadata findet der Webhook beim Kündigen
   * (customer.subscription.deleted) den Weg zurück zu diesem Profil.
   */
  aboAktiv?: boolean;
  aboSubId?: string;
  aboSeit?: string;
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

/** Abo am Profil freischalten — von der Kassen-Rückkehr UND vom Stripe-Webhook benutzt
    (beide Wege, Memory `paid-jobs-must-survive-the-browser`); idempotent. */
export async function lebenslaufAboFreischalten(id: string, subId: string): Promise<boolean> {
  const profil = await leseLebenslauf(id);
  if (!profil) return false;
  if (profil.aboAktiv && (!subId || profil.aboSubId === subId)) return true;
  return schreibeLebenslauf({
    ...profil,
    aboAktiv: true,
    aboSubId: subId || profil.aboSubId,
    aboSeit: profil.aboSeit ?? new Date().toISOString(),
  });
}

/** Abo beenden (Webhook: customer.subscription.deleted) — nur wenn die Kennung passt. */
export async function lebenslaufAboBeenden(id: string, subId: string): Promise<boolean> {
  const profil = await leseLebenslauf(id);
  if (!profil || !profil.aboAktiv) return true;
  if (subId && profil.aboSubId && profil.aboSubId !== subId) return true;   // fremde/alte Sub
  return schreibeLebenslauf({ ...profil, aboAktiv: false });
}

/**
 * ALLE PROFILE, FÜR DEN VERMITTLUNGS-ÜBERBLICK (Owner 24.08.2026: „Kontakt-Umschalter
 * bauen" — die Stelle, an der der Betreiber sieht, wem er nach einer Firmenzusage die
 * Kontaktdaten freigibt). Nur die Felder, die die Liste braucht — nicht Video/Sprechtext/
 * Erfahrung, das wäre für eine Übersicht unnötig viel Nutzlast bei vielen Profilen.
 *
 * Listet den Ordner wie `readWetterClicks` in try-this-look-store.ts (Supabase kennt kein
 * „gib mir alle Dateien mit Inhalt X" — erst die Namen holen, dann jede Datei einzeln lesen).
 */
export type LebenslaufUebersicht = Pick<LebenslaufProfil, "id" | "erstelltAm" | "name" | "email" | "bezahlt" | "kontaktSichtbar" | "aboAktiv">;

export async function listeLebenslaeufe(): Promise<LebenslaufUebersicht[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "lebenslauf", limit: 1000 }),
  });
  if (!res.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string }[];
  const ids = (Array.isArray(dateien) ? dateien : [])
    .map(d => String(d?.name ?? ""))
    .filter(n => n.endsWith(".json"))
    .map(n => n.replace(/\.json$/, ""));
  const profile = await Promise.all(ids.map(id => leseLebenslauf(id)));
  return profile
    .filter((p): p is LebenslaufProfil => !!p)
    .map(p => ({ id: p.id, erstelltAm: p.erstelltAm, name: p.name, email: p.email, bezahlt: p.bezahlt, kontaktSichtbar: p.kontaktSichtbar, aboAktiv: p.aboAktiv }))
    .sort((a, b) => (b.erstelltAm || "").localeCompare(a.erstelltAm || ""));
}

/** Kontaktdaten freigeben/sperren (Owner 20.08.2026: erst nach Firmenzusage sichtbar) —
    die eine Zahl, die der Betreiber je Profil von Hand umlegt. */
export async function lebenslaufKontaktSetzen(id: string, sichtbar: boolean): Promise<boolean> {
  const profil = await leseLebenslauf(id);
  if (!profil) return false;
  if (profil.kontaktSichtbar === sichtbar) return true;
  return schreibeLebenslauf({ ...profil, kontaktSichtbar: sichtbar });
}

export async function schreibeLebenslauf(profil: LebenslaufProfil): Promise<boolean> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(profil.id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(profil),
  });
  return res.ok;
}
