import { randomUUID } from "crypto";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * WER AUS DEM FACEBOOK-SOFORTFORMULAR KOMMT (Owner 13.09.2026: „ich muss ein Sofortformular
 * erstellen auf fb" · „seine email und name sind schon im sofortformular drin, bei uns muss er
 * ein bild mindestens hoch laden dann webseite generieren … Er muss per email nichts bestätigen").
 *
 * ── WARUM ES DIESE ABLAGE GIBT ──────────────────────────────────────────────────────────────
 *
 * Im Sofortformular hinterlässt jemand Name und Adresse, ohne unsere Seite je gesehen zu haben.
 * Wir schicken ihm daraufhin eine Mail mit einem Link. In diesem Link steckt eine KENNUNG, und
 * diese Datei ist das, was dahinter liegt.
 *
 * DIE KENNUNG BEANTWORTET DIE FRAGE, DIE DER OWNER GESTELLT HAT: „wie können wir zuordnen, wenn
 * jemand ein Bild im Trichter hochlädt, die Email vom Sofortformular?" — Sie reist vom ersten
 * Klick an am Gespräch mit. Wenn er ein Bild hochlädt, ist die Zuordnung längst da; sie entsteht
 * nicht nachträglich, sondern BEVOR das erste Bild existiert. Auch wer abbricht, ist damit
 * zuordenbar.
 *
 * ── UND SIE ERSETZT DIE BESTÄTIGUNGSMAIL ────────────────────────────────────────────────────
 *
 * Der Link kam nur in SEINEM Postfach an. Wer ihn öffnet, hat damit bewiesen, dass ihm die
 * Adresse gehört — genau das, wofür sonst der Bestätigungsklick da ist
 * (lib/kuenstler-warteliste.ts). Deshalb entfällt für ihn der zweite Schritt: hochladen, fertig,
 * Seite da. Das ist die Stelle, an der der Trichter bisher Leute verloren hat.
 *
 * ── WAS HIER NICHT LIEGT ────────────────────────────────────────────────────────────────────
 *
 * KEINE BILDER. Anders als die Warteablage hält diese Datei nur Name, Adresse und Sprache —
 * ein paar hundert Byte. Die Bilder bleiben im Browser, bis die Seite entsteht.
 */

export type FbLead = {
  /** Seine Adresse aus dem Sofortformular — Facebook hat sie bereits bestätigt. */
  mail: string;
  /** Sein Name aus dem Sofortformular; er kann ihn im Gespräch noch ändern. */
  name: string;
  sprache: string;
  angelegt: string;
  /** Die Seite, die daraus entstanden ist — gesetzt beim Verbrauchen, sonst leer. */
  mandant?: string;
};

/**
 * ── DIE FRIST (13.09.2026) ──────────────────────────────────────────────────────────────────
 *
 * SIEBEN TAGE, NICHT FÜNF STUNDEN. Die Warteablage verfällt nach fünf Stunden, weil dort Bilder,
 * Name und Adresse zusammen liegen und der Mensch GERADE hochgeladen hat — er wartet auf seine
 * Seite (siehe `WARTE_FRIST_STUNDEN`).
 *
 * HIER IST DIE LAGE UMGEKEHRT: Der Link ist der EINSTIEG, nicht der Abschluss. Wer die Mail erst
 * am nächsten Abend liest, ist kein Sicherheitsproblem, sondern ein normaler Mensch — eine Frist
 * von fünf Stunden würde genau die Leute wegwerfen, für die wir bei Facebook bezahlt haben.
 *
 * WAS DIE FRIST TROTZDEM SOLL: Ein Link, der ewig gilt, legt auch in einem Jahr noch eine Seite
 * auf diese Adresse an — aus einem weitergeleiteten Newsletter, einem geteilten Postfach, einem
 * verlorenen Telefon. Sieben Tage decken das Lesen ab und nicht mehr.
 */
export const LEAD_FRIST_TAGE = 7;

const pfad = (token: string) => `versusforge-fb-lead/${token.replace(/[^a-f0-9]/gi, "").slice(0, 64)}.json`;

/** Legt eine Kennung an und gibt sie zurück — sie gehört in den Link der Mail (`?l=…`). */
export async function leadAnlegen(daten: Omit<FbLead, "angelegt" | "mandant">): Promise<string> {
  const mail = String(daten.mail ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
    console.error("[fb-lead] Keine brauchbare Adresse, nichts angelegt.");
    return "";
  }
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "").slice(0, 8);
  const eintrag: FbLead = {
    mail,
    name: String(daten.name ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    sprache: String(daten.sprache ?? "ro").slice(0, 5),
    angelegt: new Date().toISOString(),
  };
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(token))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(eintrag),
  });
  if (!res.ok) {
    console.error("[fb-lead] Kennung nicht abgelegt:", res.status);
    return "";
  }
  return token;
}

/**
 * Liest die Kennung. Gibt `null` zurück, wenn es sie nicht gibt, sie abgelaufen ist ODER sie
 * bereits eine Seite angelegt hat.
 *
 * EINE KENNUNG GILT GENAU EINMAL — sonst legt ein zweiter Klick auf denselben Link eine zweite
 * Seite an (die hiesse dann `name-2`, und er hätte zwei). Deshalb wird sie beim Anlegen nicht
 * gelöscht, sondern mit dem Mandanten MARKIERT: Wer den Link später noch einmal öffnet, soll
 * seine Seite wiederfinden können und nicht ins Leere laufen.
 */
export async function leadLesen(token: string): Promise<FbLead | null> {
  if (!token) return null;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(token))}`);
  if (!res.ok) return null;
  let eintrag: FbLead;
  try {
    eintrag = (await res.json()) as FbLead;
  } catch {
    return null;
  }
  if (eintrag.mandant) return null;
  const gesetzt = Date.parse(String(eintrag.angelegt ?? ""));
  if (Number.isFinite(gesetzt) && Date.now() - gesetzt > LEAD_FRIST_TAGE * 24 * 60 * 60 * 1000) {
    console.warn("[fb-lead] Abgelaufen:", eintrag.mail?.slice(0, 3) + "…", eintrag.angelegt);
    return null;
  }
  return eintrag;
}

/**
 * Schon benutzt? Dann gehört zu dieser Kennung eine Seite — der Trichter schickt ihn dorthin,
 * statt ihn ein zweites Mal hochladen zu lassen.
 */
export async function leadMandant(token: string): Promise<string> {
  if (!token) return "";
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(token))}`);
  if (!res.ok) return "";
  try {
    return String(((await res.json()) as FbLead).mandant ?? "");
  } catch {
    return "";
  }
}

/**
 * ── WER NOCH AUF SEINEN KLICK WARTET (Owner 14.09.2026: „Eine Markierung im Dashboard bauen —
 * ‚X wartet noch auf seinen Klick' mit den offenen Mail-Leads") ─────────────────────────────
 *
 * Bis heute war ein Mail-Lead unsichtbar, bis er entweder klickte (dann sah man ihn als
 * Gespräch) oder verfiel (dann sah man ihn nie). Dazwischen — Mail raus, noch kein Klick —
 * gab es keine Auskunft. Diese Liste ist genau dieser Zwischenraum.
 *
 * NICHT VERBRAUCHT UND NICHT ABGELAUFEN: dieselbe Prüfung wie in `leadLesen`, nur über alle
 * Kennungen statt über eine einzelne.
 */
export type OffenerLead = { mail: string; name: string; angelegt: string };

export async function leadsOffen(): Promise<OffenerLead[]> {
  const namen: string[] = [];
  for (let seite = 0; seite < 4; seite++) {          // bis 4000 Kennungen reichen bei weitem
    const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "versusforge-fb-lead/", limit: 1000, offset: seite * 1000 }),
    }).catch(() => null);
    if (!res?.ok) break;
    const dateien = (await res.json().catch(() => [])) as { name?: string }[];
    const teil = (Array.isArray(dateien) ? dateien : []).map(f => String(f?.name ?? "")).filter(n => n.endsWith(".json"));
    namen.push(...teil);
    if (teil.length < 1000) break;
  }

  const jetzt = Date.now();
  const eintraege = await Promise.all(namen.map(async n => {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`versusforge-fb-lead/${n}`)}`).catch(() => null);
    if (!res?.ok) return null;
    try { return (await res.json()) as FbLead; } catch { return null; }
  }));

  return eintraege
    .filter((e): e is FbLead => !!e && !e.mandant)
    .filter(e => {
      const gesetzt = Date.parse(String(e.angelegt ?? ""));
      return !Number.isFinite(gesetzt) || jetzt - gesetzt <= LEAD_FRIST_TAGE * 24 * 60 * 60 * 1000;
    })
    .map(e => ({ mail: e.mail, name: e.name, angelegt: e.angelegt }))
    /* Neueste zuerst — dieselbe Ordnung wie bei den Gesprächen. */
    .sort((a, b) => b.angelegt.localeCompare(a.angelegt));
}

/** Markiert die Kennung als verbraucht — mit der Seite, die daraus entstanden ist. */
export async function leadVerbrauchen(token: string, mandant: string): Promise<void> {
  if (!token || !mandant) return;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(token))}`);
  if (!res.ok) return;
  let eintrag: FbLead;
  try {
    eintrag = (await res.json()) as FbLead;
  } catch {
    return;
  }
  /* FRISCH LESEN, ENG SCHREIBEN: Der ganze Datensatz wird ersetzt (`x-upsert`), ein Merge findet
     nicht statt — dieselbe Regel wie bei `mandantSpeichern`. */
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(token))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ ...eintrag, mandant }),
  }).catch(() => undefined);
}
