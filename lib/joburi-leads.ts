import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import type { Arbeitsform, Deutschniveau } from "@/lib/joburi-store";

/**
 * DIE LEADS DES JOBURI-TRICHTERS — das eigentliche Produkt dieses Tests.
 *
 * Owner 31.08.2026: „Das Ziel dieses ersten Funnels ist nur zu beweisen, ob wir
 * deutschsprachige Jobinteressenten günstig als Leads gewinnen können." Die Kennzahl, die
 * am Ende zählt, steht in diesen Dateien: 100 € Meta-Budget → wie viele Leads → wie viele
 * mit C1/C2 → wie viele mit Interesse an einer konkreten Stelle.
 *
 * EINE DATEI JE LEAD (wie beim Lebenslauf-Speicher): Kein gemeinsamer Blob, keine
 * Merge-Fallen. Geschrieben wird höchstens dreimal je Bewerber — beim Anlegen, beim
 * CV-Upload, bei jeder Stellen-Zustimmung.
 *
 * WAS HIER NICHT STEHT: eine pauschale Erlaubnis, das Profil an Arbeitgeber zu geben. Die
 * Einwilligung beim Anlegen deckt AUSSCHLIESSLICH die Kontaktaufnahme durch uns. Für jede
 * einzelne Stelle steht eine eigene Zustimmung in `weitergaben` — mit Zeitstempel, damit
 * hinterher nachweisbar ist, wofür genau er sein Ja gegeben hat.
 */

const pfad = (id: string) => `joburi-leads/${id}.json`;

export type Weitergabe = {
  stelleId: string;
  /** Was er gesagt hat — „ja" ist die Erlaubnis, dieses eine Profil dieser einen Firma zu zeigen. */
  ja: boolean;
  am: string;
  /** Titel und Firma zum Zeitpunkt der Zustimmung: Die Stelle kann später geändert werden,
      die Einwilligung galt aber dieser hier. */
  titel?: string;
  firma?: string;
  /** Wurde das Profil tatsächlich an die Firma geschickt? Setzt der Admin von Hand. */
  gesendetAm?: string;
};

export type JoburiLead = {
  id: string;
  erstelltAm: string;
  /** Ein Probelauf (eigene Maschine oder Admin-Sitzung), kein Mensch. Bleibt gespeichert,
      fällt aber aus jeder Auswertung — sonst stünden unsere eigenen Klicks in der Studie,
      auf die wir uns gegenüber Firmen berufen. */
  test?: boolean;
  aktualisiertAm?: string;

  /* Die drei Klickfragen — sie stehen vor der Adresse und sind auch dann da, wenn er
     danach aussteigt. Genau daran liest man ab, ob die Anzeige die richtigen Leute bringt. */
  deutsch?: Deutschniveau;
  arbeitsform?: Arbeitsform | "egal";
  ziel?: "salariu" | "flexibilitate" | "cariera" | "intoarcere";
  /**
   * WIE DRINGEND ER SUCHT — der Kennwert, mit dem wir vor Firmen bestehen (Owner
   * 31.08.2026: „weil wir gegenüber Recruitern zeigen wollen, dass wir auch Kandidaten
   * erreichen, die nicht aktiv auf Jobportalen suchen.").
   *
   * Die Stufen heissen genauso wie die drei Segmente auf der Firmenseite (`/recruiting`) —
   * „aktiv suchend / offen für Angebote / passive Kandidaten". Sonst stünde derselbe Wert
   * hier anders als dort, und die Zahl, die wir zeigen, hiesse nicht mehr dasselbe wie die,
   * die wir zählen.
   */
  suche?: "aktiv" | "offen" | "passiv";

  /* ────────────────────────────────────────────────────────────────────────────────────
     TALENT MARKET PULSE (Owner 31.08.2026: „Wir wollen nicht mehr primär Jobs anzeigen,
     sondern herausfinden, zu welchen Bedingungen deutschsprachige Menschen in Rumänien oder
     der Diaspora den Job wechseln würden.")

     Das ist der Kern des neuen Trichters — und das eigentliche Produkt: Was ein Wechsel
     kostet, sagt uns niemand ausser den Leuten selbst, und keine Jobbörse kann es liefern.
     Die alten Felder `arbeitsform` und `ziel` bleiben im Typ stehen, weil ältere Leads sie
     tragen; neue setzen sie nicht mehr.
     ──────────────────────────────────────────────────────────────────────────────────── */

  /** Wo er heute lebt — entscheidet auch, ob nach Rückkehr gefragt wird. */
  land?: "ro" | "de" | "at" | "alta";
  /** Ab welchem NETTO-Gehalt ein Wechsel interessant wird. Als Stufe, nicht als Zahl:
      Eine offene Zahl beantwortet kaum jemand, eine Spanne fast jeder. */
  /**
   * DAS ALTER, ALS SPANNE (Owner 31.08.2026). Es entscheidet, ob die Altersgrenze in der
   * Meta-Anzeige Geld spart oder gute Leute wegwirft — eine Frage, die sich aus Metas
   * Reichweitenzahlen NIE beantworten lässt: die sagen, wer geklickt hat, nie ob dessen
   * Antwort etwas taugte.
   */
  alter?: "u25" | "25-34" | "35-44" | "45-54" | "55+";
  /**
   * WAS ER HEUTE VERDIENT — die Frage gegen das Träumen (Owner 31.08.2026: „ich muss sie
   * auch fragen wieviel sie jetzt verdienen, weil sie sonst träumen").
   * `wechselGehalt` allein steht für nichts: „ab 2.000 €" kann ein realistischer Schritt sein
   * oder eine Fantasie. Erst die Differenz aus beiden ist die Zahl, die ein Recruiter kauft.
   * Die Stufen hängen am Wohnland (siehe lib/joburi-gehalt.ts) — deshalb hier ein Schlüssel
   * wie „ro900" und keine blanke Zahl.
   */
  jetztGehalt?: string;
  /* Seit dem 31.08. eine getippte Zahl als Text („2500"). Die ersten 60 Antworten tragen
     hier noch Stufen-Schlüssel („3000+"); `gehaltMitte` liest beides. */
  wechselGehalt?: string;
  /** Was den Ausschlag gibt — mehrfach wählbar, deshalb eine Liste. */
  faktoren?: ("salariu" | "remote" | "flexibilitate" | "cariera" | "stabilitate" | "echipa")[];
  /** Nur bei Diaspora: Würde er nach Rumänien zurück? */
  rueckkehr?: "da" | "poate" | "nu";
  /** Berufsfeld — die eine Angabe, die aus einer Antwort einen Kandidaten macht. */
  berufsfeld?: string;
  /** Was er getippt hat, wenn keine Kachel passte (`berufsfeld === "altul"`). In den ersten
      60 Antworten war „Anderes" die häufigste Angabe überhaupt — und die einzige, über die
      sich nichts sagen liess. Hier steht ab jetzt, was es wirklich war. */
  berufsfeldFrei?: string;
  /** Der hoechste Abschluss. Zusammen mit Deutschniveau und Beruf die Angabe, nach der ein
      Arbeitgeber als Erstes filtert — ohne sie laesst sich "C1, Pflege" nicht einordnen. */
  studii?: "gimnaziu" | "liceu" | "profesionala" | "licenta" | "master";

  email?: string;
  vorname?: string;
  telefon?: string;
  /** Die Einwilligung zur Kontaktaufnahme — ohne sie wird nichts verschickt. */
  kontaktOk?: boolean;
  kontaktOkAm?: string;

  /* Woher er kam. Beim ERSTEN Schritt gelesen, nicht erst bei der Adresse. */
  utm?: Record<string, string>;
  device?: string;
  lang?: string;

  /** Das freiwillige Upgrade — erst nach der Liste. */
  cvPath?: string;
  cvName?: string;
  /** Die David-Sitzung, falls er das Screening gemacht hat. */
  davidId?: string;

  weitergaben?: Weitergabe[];
};

export async function leseLead(id: string): Promise<JoburiLead | null> {
  if (!id) return null;
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(id))}?frisch=${Date.now()}`);
    if (!res.ok) return null;
    return (await res.json()) as JoburiLead;
  } catch {
    return null;
  }
}

export async function schreibeLead(lead: JoburiLead): Promise<boolean> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(lead.id))}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body: JSON.stringify({ ...lead, aktualisiertAm: new Date().toISOString() }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Für die Admin-Auswertung: alle Leads, neueste zuerst. */
export async function leseAlleLeads(max = 500): Promise<JoburiLead[]> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "joburi-leads", limit: max, sortBy: { column: "created_at", order: "desc" } }),
    });
    if (!res.ok) return [];
    const dateien = (await res.json().catch(() => [])) as { name?: string }[];
    const ids = (Array.isArray(dateien) ? dateien : [])
      .map(d => String(d?.name ?? "")).filter(n => n.endsWith(".json"))
      .map(n => n.replace(/\.json$/, ""));
    const leads = await Promise.all(ids.map(id => leseLead(id)));
    return leads.filter((l): l is JoburiLead => !!l)
      .sort((a, b) => String(b.erstelltAm).localeCompare(String(a.erstelltAm)));
  } catch {
    return [];
  }
}
