import { randomUUID } from "node:crypto";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * WAS IM PORTAL PASSIERT (Owner 14.09.2026: „ich will auch wissen was jeder macht in dem portal.
 * Also wenn jemand seine Inhalte bearbeitet und save klickt").
 *
 * ── WARUM EINE EIGENE ABLAGE ────────────────────────────────────────────────────────────────
 *
 * Für den Trichter gibt es zwei Speicher, und keiner passt hierher:
 *
 *  · `versusforge-lauf/` hält GESPRÄCHE — Zug für Zug, mit Token und Kosten. Ein Klick auf
 *    „Speichern" ist kein Gespräch und hat weder Frage noch Antwort.
 *  · `versusforge-schritt/` hält je Besucher nur die WEITESTE Stufe. Wer dreimal speichert,
 *    wäre dort einmal sichtbar — und beim vierten Mal immer noch.
 *
 * Hier steht deshalb eine Zeile JE EREIGNIS. Sie ist winzig und wird nie überschrieben.
 *
 * ── NACH TAG SORTIERT, DAMIT DAS LESEN BILLIG BLEIBT ────────────────────────────────────────
 *
 * `versusforge-ereignis/<Tag>/<Zeit>-<Zufall>.json`. Die Live-Ansicht holt nur den heutigen
 * Ordner; alles Ältere liegt daneben und stört sie nicht. Der Name beginnt mit der Uhrzeit,
 * also ist die Liste schon sortiert, ohne jede Datei zu öffnen.
 *
 * ── UND SIE HÄLT NIE ETWAS AUF ──────────────────────────────────────────────────────────────
 *
 * Jeder Aufruf ist `void` und verschluckt seine Fehler. Wer gerade auf „Speichern" gedrückt hat,
 * wartet auf seine Seite — nicht auf unser Protokoll.
 */

export type Ereignis = {
  zeit: string;
  /** Der Künstler, bei dem es passiert ist. */
  mandant: string;
  /** Sein Name, wie er auf der Seite steht — damit die Zeile ein Satz wird. */
  name: string;
  /** Was passiert ist — ein Satz aus fester Liste, nie Freitext des Nutzers. */
  was: string;
  /** Eine Zahl, die dazu gehört: wie viele Werke, welche Kachel. Freiwillig. */
  zahl?: number;
};

/**
 * ── GANZE SÄTZE, MIT NAMEN (Owner 14.09.2026: „Peter hat sein Post korrigiert, Peter hat ein
 * neues Bild hochgeladen, Peter hat sein Profiltext aktualisiert") ──────────────────────────
 *
 * DIE LISTE IST FEST. Hier darf nichts stehen, was ein Mensch getippt hat — das Protokoll ist
 * für den Owner, nicht für Inhalte. Wer eine Art hinzufügt, trägt sie hier ein.
 *
 * OHNE „SEIN" ODER „IHR": „Peter hat DEN Profiltext aktualisiert", nicht „seinen". Wir wissen
 * bei niemandem, wie er angesprochen werden will, und die Zeile soll für jeden stimmen.
 */
export const EREIGNISSE = {
  profilGespeichert: "hat die Seite gespeichert",
  ueberMichGespeichert: "hat den Profiltext aktualisiert",
  spruchErzeugt: "hat AI benutzt für einen Spruch",
  profiltextAI: "hat AI benutzt für den Profiltext",
  spruchGeaendert: "hat einen Spruch korrigiert",
  werkHochgeladen: "hat ein neues Werk hochgeladen",
  werkEntfernt: "hat ein Werk entfernt",
  profilBild: "hat ein Profilbild gesetzt",
  seiteBehalten: "hat die Seite behalten",
  seiteAngelegt: "hat eine Seite angelegt",
} as const;

export type EreignisArt = keyof typeof EREIGNISSE;

/** Die fertige Zeile: „Peter hat ein neues Werk hochgeladen." */
export const ereignisSatz = (e: Ereignis): string =>
  `${e.name || e.mandant || "Jemand"} ${e.was}${typeof e.zahl === "number" ? ` (${e.zahl})` : ""}.`;

const tagOrdner = (iso: string) => `versusforge-ereignis/${iso.slice(0, 10)}`;

/** Legt ein Ereignis ab. Läuft im Hintergrund und darf scheitern. */
export async function ereignisMerken(mandant: string, name: string, was: EreignisArt, zahl?: number): Promise<void> {
  const zeit = new Date().toISOString();
  const eintrag: Ereignis = {
    zeit,
    mandant: String(mandant ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 80),
    /* Sein Künstlername, nicht seine Adresse — die gehört nicht in ein Protokoll, das nur sagen
       soll, WAS passiert ist. */
    name: String(name ?? "").replace(/\s+/g, " ").trim().slice(0, 60),
    was: EREIGNISSE[was] ?? String(was),
    ...(typeof zahl === "number" && Number.isFinite(zahl) ? { zahl } : {}),
  };
  /* Uhrzeit voran: Die Ablage sortiert nach Namen, damit ist die Liste ohne Lesen geordnet. */
  const dateiName = `${zeit.slice(11, 19).replace(/:/g, "")}-${randomUUID().slice(0, 8)}.json`;
  try {
    await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${tagOrdner(zeit)}/${dateiName}`)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true" },
      body: JSON.stringify(eintrag),
    });
  } catch { /* ein Protokoll hält nie etwas auf */ }
}

/** Die Ereignisse eines Tages, neueste zuerst. Für die Live-Ansicht. */
export async function ereignisseLesen(tagIso: string, grenze = 40): Promise<Ereignis[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix: `${tagOrdner(tagIso)}/`,
      limit: Math.max(grenze, 200),
      sortBy: { column: "name", order: "desc" },
    }),
  }).catch(() => null);
  if (!res?.ok) return [];

  const dateien = ((await res.json().catch(() => [])) as { name?: string; id?: string | null }[])
    .filter(d => d?.id && String(d.name ?? "").endsWith(".json"))
    .slice(0, grenze);

  const gelesen = await Promise.all(dateien.map(async d => {
    const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${tagOrdner(tagIso)}/${d.name}`)}`).catch(() => null);
    if (!r?.ok) return null;
    try { return (await r.json()) as Ereignis; } catch { return null; }
  }));

  return (gelesen.filter(Boolean) as Ereignis[]).sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
}
