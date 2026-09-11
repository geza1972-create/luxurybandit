import { sendEmail } from "@/lib/email-send";
import { mailHuelle, mailTitel, mailText, mailAdresse } from "@/lib/versusforge-mail-huelle";
import { mailTexteInSprache } from "@/lib/versusforge-mail-texte";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { istKuenstler, kuenstlerDashboardUrl, kuenstlerUrl } from "@/lib/lakatosbandi-adressen";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantSauber } from "@/lib/versusforge-namen";

/**
 * „JEMAND INTERESSIERT SICH FÜR DEIN WERK" (Owner 11.09.2026: „bei jedem Besuch eine E-Mail ist zu viel für den Künstler.
 * Ich will erst, wenn jemand drückt: Da, mă interesează lucrarea").
 *
 * Hier stand bis eben `besuchMelden` — eine Mail bei jedem neuen Besucher. Jetzt kommt sie erst, wenn ein Besucher im
 * Agenten „Da, mă interesează această lucrare" tippt, auch bevor er Name und Telefon hinterlässt. Hinterlässt er sie,
 * folgt wie bisher „Du hast eine Anfrage".
 *
 * HÖCHSTENS EINMAL JE BESUCHER UND WERK: eine kleine Marke in der Ablage. Nur für freigegebene Künstler.
 * In seiner Sprache, Absender „lakatosbandi.com".
 */
const marke = (mandant: string, besucher: string, werk: string) =>
  `versusforge-interesse/${mandantSauber(mandant)}/${besucher.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}-${werk.replace(/[^0-9-]/g, "") || "-1"}.json`;

export async function interesseMelden(mandant: string, besucher: string, werk: string): Promise<boolean> {
  if (!mandantSauber(mandant) || !besucher) return false;
  const m = await mandantLesen(mandant);
  if (!m || !istKuenstler(m) || m.freigabe !== "frei") return false;
  const an = String(m.mail ?? "");
  if (!an.includes("@")) return false;

  /* Schon gemeldet? Dann nicht noch einmal. */
  const pfad = marke(mandant, besucher, werk);
  const da = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`);
  if (da.ok) return false;
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ zeit: new Date().toISOString() }),
  });

  /* Welches Werk: sein Titel, sonst der Spruch. */
  const nr = Number(werk);
  const schluessel = Number.isInteger(nr) && nr >= 0 ? String(nr) : "standard";
  const hooks = Array.isArray(m.hooks) ? m.hooks : [];
  const titel = String(m.werkInfo?.[schluessel]?.titel ?? "").trim();
  const spruch = String((schluessel === "standard" ? m.hook : hooks[nr]) ?? "").trim();
  const werkName = titel || spruch;

  const T = await mailTexteInSprache(m.sprache);
  const loeschen = m.loeschSchluessel ? `${kuenstlerUrl(mandant)}/loeschen?k=${encodeURIComponent(m.loeschSchluessel)}` : "";
  /* `{werk}` wird NACH der Übersetzung eingesetzt (Hausregel: Platzhalter nie im übersetzten Satz verlassen). */
  const text = T.interesseText.includes("{werk}")
    ? T.interesseText.replace("{werk}", werkName ? `„${werkName}"` : "")
    : `${werkName ? `„${werkName}" — ` : ""}${T.interesseText}`;
  const html = mailHuelle(
    mailTitel(T.interesseTitel)
    + mailText(text)
    + mailAdresse(T.linksDashboard, kuenstlerDashboardUrl(mandant, m.schluessel), T.interesseDashboardFein),
    loeschen || undefined);

  const res = await sendEmail({
    konto: "versusforge",
    absender: "lakatosbandi.com",
    to: an,
    ...(loeschen ? { listUnsubscribe: loeschen } : {}),
    subject: T.interesseBetreff,
    html,
  });
  if (!res.ok) console.error("[versusforge-interesse] Versand fehlgeschlagen:", res.error);
  return res.ok;
}
