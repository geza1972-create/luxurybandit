import { BUCKET, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantLesen, type MandantAngaben } from "@/lib/versusforge-mandanten";

/**
 * LAKATOSBANDI.COM — DAS PORTAL FÜR KÜNSTLER (Owner 10.09.2026: „die kommen doch unter
 * lakatosbandi.com/{artistname} und einen Login müssen sie auch haben fürs Dashboard" ·
 * „nur auf lakatosbandi").
 *
 * ── EINE STELLE FÜR ADRESSEN ──────────────────────────────────────────────────────────────
 *
 * Mails, Dashboard, Chat und Freigabe nennen die Adresse eines Künstlers. Stünde
 * `https://lakatosbandi.com/…` an zehn Stellen, zeigte beim nächsten Umzug eine davon ins Leere.
 *
 * ── WER IST KÜNSTLER? ─────────────────────────────────────────────────────────────────────
 *
 * Nur wer über das Kunst-Rezept angelegt wurde, trägt `freigabe` (siehe `abschluss_schicken`
 * in app/api/versusforge-agent/route.ts). Ältere Mandanten aus der allgemeinen Engine
 * (Zahnarzt, Restaurant) haben das Feld nicht und bleiben unter versusforge.com.
 *
 * ── LOKAL UND AUF VERSUSFORGE.COM ─────────────────────────────────────────────────────────
 *
 * Auf lakatosbandi.com liegen die Seiten an der Wurzel (`/`, `/{name}`, `/login`) — das machen
 * die Rewrites in next.config.mjs. Überall sonst (localhost, Vorschau) unter `/portal/…`.
 * `portalPfade(host)` gibt die jeweils richtigen Links, damit die Seite auf beiden läuft.
 */

/* Die reinen Adressen liegen in lib/lakatosbandi-adressen.ts (auch für Browser-Bausteine). */
import { istKuenstler } from "@/lib/lakatosbandi-adressen";
export { PORTAL_URL, imPortal, aufVersusforge, istKuenstler, kuenstlerUrl, kuenstlerDashboardUrl, portalPfade } from "@/lib/lakatosbandi-adressen";

/** Die Werke eines Künstlers als Kacheln: sein Haupt-Hook mit dem Standard-Motiv, dann jeder weitere. */
export function werkKacheln(
  m: Pick<MandantAngaben, "hook" | "hooks"> & Partial<Pick<MandantAngaben, "hookSprachen" | "sprache">>,
  /**
   * ── IN DER SPRACHE DES BESUCHERS, WENN ES SIE GIBT (Owner 14.09.2026: „hier wird nichts
   * übersetzt") ─────────────────────────────────────────────────────────────────────────────
   *
   * Ohne Angabe bleibt alles wie bisher — deshalb müssen die Aufrufstellen, die keine Sprache
   * kennen (Agent, Intro-Texte), nicht angefasst werden.
   *
   * DAS ORIGINAL IST DER RÜCKFALL, immer. Fehlt die Übersetzung noch (der Nachtlauf war noch
   * nicht dran), steht der Satz des Künstlers da — nie eine leere Kachel.
   */
  lang?: string,
): { hook: string; i: number }[] {
  const s = String(lang ?? "").slice(0, 2).toLowerCase();
  const fremd = s && s !== String(m.sprache ?? "").slice(0, 2).toLowerCase() ? m.hookSprachen?.[s] : undefined;

  const liste: { hook: string; i: number }[] = [];
  const standard = String(fremd?.hook ?? "").trim() || String(m.hook ?? "").trim();
  if (standard) liste.push({ hook: standard, i: -1 });
  (Array.isArray(m.hooks) ? m.hooks : []).forEach((h, i) => {
    const text = String(fremd?.hooks?.[i] ?? "").trim() || String(h ?? "").trim();
    if (text) liste.push({ hook: text, i });
  });
  return liste;
}

/**
 * ALLE KÜNSTLER, DIE EIN ZIEL ERFÜLLEN — liest jede Mandanten-Datei einzeln. Bei ein paar
 * Dutzend Künstlern ist das schnell genug; bei Hunderten gehört hier eine Übersichtsdatei hin
 * (Hausregel: erst messen, dann optimieren).
 */
export async function kuenstlerListe(passt: (m: MandantAngaben) => boolean): Promise<(MandantAngaben & { kennung: string })[]> {
  const res = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: "versusforge-mandant/", limit: 1000, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) return [];
  const dateien = (await res.json().catch(() => [])) as { name?: string }[];
  const namen = (Array.isArray(dateien) ? dateien : [])
    .map(d => String(d?.name ?? ""))
    .filter(n => n.endsWith(".json"))
    .map(n => n.slice(0, -5));
  const alle = await Promise.all(namen.map(async kennung => {
    const m = await mandantLesen(kennung);
    return m && istKuenstler(m) && passt(m) ? { ...m, kennung } : null;
  }));
  return alle.filter((m): m is MandantAngaben & { kennung: string } => !!m);
}

/** Öffentlich im Portal: vom Owner freigegeben UND „Ja, ins Portal" gesagt. */
export const imPortalSichtbar = (m: MandantAngaben) => m.freigabe === "frei" && m.portal === true;
