import { supabaseFetch, BUCKET, encodeStoragePath } from "@/lib/try-this-look-store";

/**
 * ── DAS GUTHABEN FÜR ERZEUGTE BILDER (Owner 18.09.2026) ──────────────────────────────────────
 *
 * „Das dürfen die Leute nur ein Mal machen" · „und leider müssen sie 1 Euro bezahlen."
 *
 * Ein Euro kauft EINEN Lauf (`KUNST_CENTS` in `lakatosbandi-druck.ts`, dort steht auch die
 * Rechnung dahinter). Dieses Modul hält fest, wie viele Läufe ein Gerät gekauft und wie viele
 * es verbraucht hat. Die Differenz ist, was es noch darf.
 *
 * ── EINE DATEI JE GERÄT ─────────────────────────────────────────────────────────────────────
 *
 * Nach dem Muster von `david-limit/<gerät>.json`. Keine Sammelliste: Zwei Käufe in derselben
 * Sekunde würden sich darin gegenseitig überschreiben ([[delete-resurrection-merge-bug]]).
 *
 * ── DIE GRENZE DIESES RIEGELS, OFFEN GESAGT ─────────────────────────────────────────────────
 *
 * Die Kennung ist `lb_visitor` aus dem Browser. Ein privates Fenster hat eine neue — wer das
 * umgehen WILL, umgeht es. Das ist hier egal: Umgehen heisst nicht „gratis erzeugen", sondern
 * „noch einmal einen Euro bezahlen", denn ohne Guthaben läuft nichts. Der Riegel schützt nicht
 * vor Missbrauch, er ordnet einem Gerät zu, was es gekauft hat.
 *
 * ── VERBRAUCHT WIRD ERST NACH DEM BILD ──────────────────────────────────────────────────────
 *
 * `kunstVerbrauchen` ruft die Route erst, wenn ein Bild wirklich da ist. Wer bezahlt hat und
 * einen Fehler bekommt, behält sein Guthaben ([[paid-jobs-must-survive-the-browser]]).
 */

type Stand = { gekauft: number; verbraucht: number; zuletzt?: string };

const pfad = (geraet: string) =>
  `lakatosbandi-kunst-guthaben/${geraet.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}.json`;

export function geraetSauber(roh: unknown): string {
  return String(roh ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
}

async function lesen(geraet: string): Promise<Stand> {
  if (!geraet) return { gekauft: 0, verbraucht: 0 };
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(geraet))}`);
    if (!res.ok) return { gekauft: 0, verbraucht: 0 };
    const s = (await res.json()) as Stand;
    return { gekauft: Number(s?.gekauft) || 0, verbraucht: Number(s?.verbraucht) || 0 };
  } catch { return { gekauft: 0, verbraucht: 0 }; }
}

async function schreiben(geraet: string, s: Stand): Promise<boolean> {
  try {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(geraet))}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
      body: JSON.stringify({ ...s, zuletzt: new Date().toISOString() } satisfies Stand),
    });
    return res.ok;
  } catch { return false; }
}

/** Wie viele Läufe dieses Gerät noch offen hat. */
export async function kunstGuthaben(geraet: string): Promise<number> {
  const s = await lesen(geraet);
  return Math.max(0, s.gekauft - s.verbraucht);
}

/** Ein bezahlter Lauf kommt dazu. Gerufen vom Stripe-Webhook, nie vom Browser. */
export async function kunstGutschreiben(geraet: string, anzahl = 1): Promise<number> {
  if (!geraet) return 0;
  const s = await lesen(geraet);
  const neu: Stand = { gekauft: s.gekauft + Math.max(1, anzahl), verbraucht: s.verbraucht };
  await schreiben(geraet, neu);
  return Math.max(0, neu.gekauft - neu.verbraucht);
}

/** Einen Lauf abbuchen — erst, wenn das Bild da ist. */
export async function kunstVerbrauchen(geraet: string): Promise<number> {
  if (!geraet) return 0;
  const s = await lesen(geraet);
  const neu: Stand = { gekauft: s.gekauft, verbraucht: s.verbraucht + 1 };
  await schreiben(geraet, neu);
  return Math.max(0, neu.gekauft - neu.verbraucht);
}
