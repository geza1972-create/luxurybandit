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
  /**
   * ER HAT DAS FOTO ABSICHTLICH WEGGELASSEN (Owner 31.08.2026: „du musst ihm noch im chat
   * sagen, ein bild hast du bewusst nicht hochgeladen oder vergessen").
   *
   * In Deutschland und Österreich lassen viele das Bewerbungsfoto bewusst weg. Ein Werkzeug,
   * das dann weiter danach fragt, wirkt ahnungslos; eines, das die Antwort merkt, aufmerksam.
   * Gesetzt vom Minichat des Lebenslauf-Generators, nur dort gelesen.
   */
  ohneFoto?: boolean;
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
   * Wieso?" — Kopf-Chips wiederholten dieselbe Liste wie `kompetenzen`). Deshalb liefert die
   * Auswertung ein EIGENES Feld:
   *   `schwerpunkte` — 3–4 Arbeitsfelder für die Kopf-Chips (keine Jobtitel, ≠ kompetenzen)
   */
  schwerpunkte?: string[];
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
  /**
   * MULTI-BEWERBUNG (Owner 25.08.2026, Konzept festgenagelt): Eine „Bewerbung" ist eine
   * VOLLSTÄNDIGE KOPIE des Profils als eigene Datei mit eigener Adresse, zugeschnitten auf
   * EINE Stellenanzeige. `basisId` zeigt auf das Hauptprofil — nur Bewerbungen tragen sie.
   * Abo, Frist und Besitz hängen IMMER am Hauptprofil (die Seite und die Besitz-Prüfung
   * lösen `basisId` auf); eine Bewerbung lebt nie länger als ihr Hauptprofil.
   *
   * BILD STATT VIDEO (Owner: „jeder kann gratis eine Bewerbung anlegen mit Bild. Will er
   * eine Videobewerbung anlegen kostet es Geld"): Die Kopie übernimmt `videoUrl` NICHT —
   * das Dossier der Bewerbung zeigt das Foto. Das Video ist der spätere Zusatzkauf, und
   * das alte Video spräche ohnehin den alten, nicht den zugeschnittenen Text.
   */
  basisId?: string;
  /** Die Positionierungszeile unterm Namen, auf die Anzeige zugeschnitten — NUR wenn der
      Lebenslauf sie trägt (nie erfinden). Leer = die Vorlage fällt auf erfahrung[0] zurück. */
  positionierung?: string;
  /** Das Anschreiben zur Anzeige — in der SPRACHE DER ANZEIGE, nur für den Besitzer
      sichtbar (er verschickt es selbst; Stufe 2 macht ein PDF daraus). */
  anschreiben?: string;
  /**
   * WELCHE PDF-VORLAGE ER GEWÄHLT HAT (28.08.2026, Owner: „hier müssen wir eine galerie von
   * templates zeigen und user sucht sich eins aus") — die Kennung aus `PDF_VORLAGEN` in
   * lib/bewerbung-pdf.ts. Leer heisst: die erste (Klassik).
   */
  pdfVorlage?: string;
  /**
   * DER SCHUTZ FÜRS TEILEN (angelegt 28.08.2026, Owner: „dann gibt er ein Passwort an dort"
   * · „Schloss auf Kacheln wenn nicht geschützt und Schloss zu wenn geschützt").
   *
   * HIER STEHT EIN HASH, NIE DAS PASSWORT. Ein Klartext-Passwort in einer JSON-Datei im
   * Speicher wäre schlimmer als gar keines: Es sähe nach Schutz aus und wäre keiner.
   *
   * NOCH SETZT ES NIEMAND — die Seite, auf der der Bewerber es vergibt, kommt separat. Bis
   * dahin ist das Feld leer, und die Galerie zeigt genau deshalb ein OFFENES Schloss. Das
   * ist keine Lücke in der Anzeige, das ist der ehrliche Stand.
   */
  pdfSchutz?: string;
  /** Titel/Firma wörtlich aus der Anzeige + der Match-Prozentwert vom Erzeugen — die
      Beschriftung in der Liste „Deine Bewerbungen". */
  anzeigeTitel?: string;
  anzeigeFirma?: string;
  /** Der volle Anzeigen-Text — NUR für den Resume Generator (26.08.2026): Der
      9,99-Optimier-Lauf braucht die Anzeige noch einmal, nachdem der Gratis-Lauf längst
      vorbei ist. Bleibt intern, keine Route gibt ihn an den Client. */
  anzeigeText?: string;
  matchProzent?: number;
  /**
   * DIE STRUKTUR-ANALYSE UND DER JOBCHANCEN-POOL (Owner-Auftrag 26.08.2026,
   * KONZEPT-JOB-MATCH-TRICHTER.md Baustelle C/D/F) — zusätzlich zu Titel/Firma/Prozent
   * oben, die für BEIDE Türen gelten (eigene Anzeige UND Jobchance):
   */
  /** Die Gesamtempfehlung aus der Struktur-Analyse, die diese Version erzeugt hat. */
  matchEmpfehlung?: "gut" | "bruecke" | "schwach";
  /**
   * Die interne Bewerbungs-Strategie (Baustelle C) — treibt Zuschnitt UND Anschreiben,
   * bleibt aber selbst nur eine interne Notiz am Profil (die Seite zeigt sie nicht an).
   */
  strategie?: {
    staerksteArgumente: string[]; uebertragbar: string[]; zuErklaeren: string[];
    betonen: string[]; wenigerBetonen: string[]; sprachvorteile: string[]; nieVerstecken: string[];
  };
  /**
   * NUR gesetzt, wenn diese Version aus einer JOBCHANCE (Tür 2, `lib/job-chancen.ts`)
   * entstand — verknüpft die Version mit der Chance, für den Missbrauchs-Deckel „je
   * Kandidat und Chance höchstens EINE Mappe" (ein zweiter Lauf ERSETZT diese Version,
   * statt eine neue anzulegen) und für das Kandidaten-Profil (`lib/kandidaten-store.ts`).
   * Bewerbungen aus einer EIGENEN Anzeige (Tür 1) tragen dieses Feld nie.
   */
  chanceId?: string;
  /** NUR am Hauptprofil: der Index der erzeugten Bewerbungen (die Dateien selbst liegen
      als eigene lebenslauf/<id>.json — ohne Index müsste die Liste alle Profile scannen). */
  bewerbungen?: { id: string; titel: string; firma?: string; erstelltAm: string; prozent?: number; chanceId?: string }[];
  /** Zählt ALLE je erzeugten Bewerbungen (auch gelöschte) — die EINE Gratis-Probe hängt an
      diesem Zähler, nicht an der Listenlänge, sonst wäre Löschen = neue Probe. */
  bewerbungenErzeugt?: number;
  /**
   * DIE EHRLICHEN ZÄHLER (Owner 25.08.2026: „Es müssen irgendwo die Views stehen …
   * Recruiter haben sich deine Bewerbung angeschaut"): `viewCount` zählt Seitenaufrufe
   * von NICHT-Besitzern (der Beacon feuert erst, wenn die Besitz-Prüfung im Browser
   * negativ ausfiel). `videoKlicks` zählt Tipps auf den Play-Knopf einer BILD-Bewerbung
   * („Noch kein Video" für die Firma — für den Bewerber der Kauf-Trigger: „3 Leute
   * wollten dein Video sehen"). Vanity-Zähler: Verluste durch parallele Schreiber sind
   * hinnehmbar, hier hängt kein Geld dran.
   */
  viewCount?: number;
  videoKlicks?: number;
  /* "wenn jemand anfaengt zu tippen ... 1 Person hat Interesse gezeigt" (Owner
     25.08.2026): erster Griff zum Firmen-Chat (Ja-Chip oder erstes Tippen), gleicher
     Beacon-Weg und dieselbe Vanity-Toleranz wie oben. */
  interesseKlicks?: number;
  /* "1 Person will dich kontaktieren - email anzeigen. auch loeschen dann" (Owner
     25.08.2026): die ABGESCHLOSSENEN Gespraechsanfragen des Firmen-Chats, damit der
     Besitzer sie auf seiner Seite sieht (Name + E-Mail) und einzeln loeschen kann.
     Die Mail an den Betreiber geht weiterhin parallel raus (/api/contact) - dieser
     Eintrag ist die Ablage fuer den Bewerber, gedeckelt auf die letzten 50. */
  anfragen?: { id: string; name: string; mail: string; nachricht?: string; datum: string }[];
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

/** Eine Bewerbungs-Version löschen (Owner-Werkzeug „Deine Bewerbungen") — Hauptprofile
    löscht niemand über diesen Weg; das prüft die Route, nicht der Speicher. */
export async function loescheLebenslauf(id: string): Promise<boolean> {
  if (!id) return false;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(id))}`, {
    method: "DELETE",
  });
  return res.ok || res.status === 404;
}
