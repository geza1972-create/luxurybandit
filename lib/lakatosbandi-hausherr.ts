import crypto from "crypto";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { mandantLesen } from "@/lib/versusforge-mandanten";

/**
 * ── WER OHNE KASSE ARBEITEN DARF (Owner 19.09.2026: „ich will ein Konto haben als Admin, wo ich
 * nichts zahlen muss" · „ich darf ohne Stripe runterladen als 286645f5…") ─────────────────────
 *
 * ZWEI SCHLÜSSEL, EINE ANTWORT:
 *
 *  1. DER HAUSSCHLÜSSEL (`VERSUSFORGE_DASHBOARD_KEY`) — er gilt überall, für jeden Künstler.
 *  2. DER SCHLÜSSEL DES KÜNSTLERS SELBST (`m.schluessel`, derselbe, der sein Dashboard öffnet) —
 *     er gilt NUR auf dessen eigener Seite.
 *
 * WARUM DER ZWEITE DAZUKAM: Der Owner legt seine Generatoren selbst an und hat deren Schlüssel
 * ohnehin in der Adresse; den Hausschlüssel hat er beim Arbeiten meist nicht zur Hand. Und für
 * einen Künstler, der sein eigenes Blatt drucken will, ist es dieselbe Frage — es ist SEIN Werk.
 *
 * VERGLICHEN WIRD ZEITSICHER (`timingSafeEqual`), nicht mit `===`: Ein Vergleich, der bei der
 * ersten falschen Stelle abbricht, verrät über die Dauer, wie weit man richtig lag.
 *
 * FEHLT EIN SCHLÜSSEL IN DER UMGEBUNG, lässt `mandantPruefen` niemanden durch — eine offene Tür,
 * die niemand bemerkt, wäre schlimmer als gar keine.
 */
function gleich(soll: string, ist: string): boolean {
  const a = Buffer.from(String(soll ?? ""), "utf8");
  const b = Buffer.from(String(ist ?? ""), "utf8");
  if (!a.length || a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

export async function hausherrDarf(mandant: string, schluessel: string): Promise<boolean> {
  const s = String(schluessel ?? "").trim();
  if (!s) return false;
  /* Der Hausschlüssel gilt überall. */
  if (mandantPruefen(EIGENER_MANDANT, s).ok) return true;
  /* Sonst nur der Schlüssel genau dieses Künstlers. */
  const m = await mandantLesen(String(mandant ?? "").trim());
  return !!m && gleich(String(m.schluessel ?? ""), s);
}
