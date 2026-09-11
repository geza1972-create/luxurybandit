/**
 * NAMEN UND REGELN — OHNE SERVER-ABHÄNGIGKEITEN (09.09.2026 herausgelöst).
 *
 * WARUM EINE EIGENE DATEI: Diese drei Dinge sind reine Werte, aber sie standen in
 * `versusforge-lead.ts` — und die Datei holt sich oben den Supabase-Zugang. Ein Trichter im
 * Browser, der nur `EIGENER_MANDANT` brauchte, zog damit den halben Serverbaum in sein
 * Bündel; Next hat das mit einem 500er quittiert, und zwar erst beim Aufrufen der Seite.
 *
 * Hier stehen sie ohne einen einzigen Import und sind damit auf beiden Seiten benutzbar.
 * `versusforge-lead.ts` reicht sie weiter, damit kein bestehender Aufruf bricht.
 */

/** Der Mandant, unter dem VersusForge seine eigenen Anfragen sammelt. */
export const EIGENER_MANDANT = "versusforge";

/**
 * NAMEN, DIE SCHON EINE SEITE SIND (09.09.2026, mit `/engine`).
 *
 * `versusforge.com/<name>` ist eine Umschreibung in `next.config.mjs`, und sie steht in
 * `afterFiles` — eine echte Seite gewinnt immer. Ein Mandant, der „engine" oder „about"
 * heisst, bekäme also eine Adresse, die nie ihn zeigt: Er lädt seine Kunden auf eine Seite
 * ein, die ihm nicht gehört, und merkt es erst, wenn niemand anruft.
 *
 * DESHALB BEIM VERGEBEN SPERREN, NICHT BEIM AUSLIEFERN REPARIEREN. Wer den Namen gar nicht
 * erst bekommt, kann ihn auch nicht in eine Anzeige schreiben.
 *
 * WÄCHST MIT: Kommt eine neue Seite auf oberster Ebene dazu, gehört ihr Pfad hier hinein.
 */
export const GESPERRTE_NAMEN = new Set<string>([
  EIGENER_MANDANT,
  "engine", "themes", "about", "imprint", "privacy", "contact", "admin", "api",
  "stores", "wardrobe", "academy", "joburi", "ci", "media-kit", "sitemap", "robots",
  /* lakatosbandi.com (10.09.2026): Diese Pfade liegen dort an der Wurzel — ein Künstler namens
     „journal" oder „login" würde sie verdecken. */
  "portal", "login", "journal", "terms", "kontakt", "dashboard",
]);

/**
 * Erlaubt nur harmlose Kennungen — der Wert landet in einem Pfad.
 *
 * ── UMLAUTE WERDEN UMGESCHRIEBEN, NICHT GESTRICHEN (Owner 10.09.2026, im Freigabe-Test) ──────
 *
 * Aus „Test Freigabe Künstler" wurde `testfreigabeknstler` — das ü fiel einfach weg. Für eine
 * Kunstplattform mit Namen aus Deutschland und Rumänien ist das die Adresse, die ein Künstler in
 * seine Anzeige schreibt: Sie darf nicht kaputt aussehen.
 *
 * DEUTSCH NACH DEUTSCHER REGEL (ä→ae, ö→oe, ü→ue, ß→ss), ALLES ANDERE OHNE ZEICHEN (ș→s, ț→t,
 * ă→a, î→i, é→e). Erst zusammengesetzt (NFC), damit ein ü, das als u + Punkte ankommt, auch als
 * ü erkannt wird.
 *
 * BESTEHENDE ADRESSEN BLEIBEN GÜLTIG: Sie bestehen schon nur aus a–z, 0–9 und Bindestrich, und
 * daran ändert diese Umschrift nichts.
 */
const UMSCHRIFT: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
export const mandantSauber = (roh: string): string =>
  String(roh ?? "").trim().toLowerCase()
    .normalize("NFC")
    .replace(/[äöüß]/g, z => UMSCHRIFT[z] ?? "")
    .normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9-]/g, "").slice(0, 40);
