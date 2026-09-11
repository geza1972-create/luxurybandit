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
export function werkKacheln(m: Pick<MandantAngaben, "hook" | "hooks">): { hook: string; i: number }[] {
  const liste: { hook: string; i: number }[] = [];
  if (String(m.hook ?? "").trim()) liste.push({ hook: String(m.hook).trim(), i: -1 });
  (Array.isArray(m.hooks) ? m.hooks : []).forEach((h, i) => {
    if (String(h ?? "").trim()) liste.push({ hook: String(h).trim(), i });
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
