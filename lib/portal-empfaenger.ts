import {
  readKissLog, readTryThisLookState, readWetterSubscribers, readMailAbmeldungen,
  type KissLogEntry, type WetterSubscriber,
} from "@/lib/try-this-look-store";

/**
 * ALLE ADRESSEN DES PORTALS — an EINER Stelle.
 *
 * Owner 31.07.2026: „wir müssen jetzt eine E-Mail rausschicken … an alle User" — „ich meine
 * wirklich an alle User des Portals."
 *
 * Die Adressen liegen an fünf verschiedenen Orten, weil sie über ein Jahr an fünf
 * verschiedenen Stellen entstanden sind. Wer sie beim Versand einzeln zusammensucht, vergisst
 * beim nächsten Mal eine — oder schreibt jemanden doppelt an. Deshalb diese Datei: eine
 * Funktion, eine Liste, eine Wahrheit.
 *
 * DIE RECHTSGRUNDLAGE ist nicht Beiwerk. Angeschrieben wird nur, wer uns seine Adresse
 * gegeben hat, um von uns zu hören:
 *   - Kiss/Trichter: „By uploading a photo and tapping Next you accept the terms and the
 *     privacy policy, and news & offers by email" — steht seit dem 30.07.2026 auf Schritt 1.
 *   - Wetter: doppelte Bestätigung (`confirmed`), das ist der sauberste Fall im Haus.
 *   - Kuratorinnen: eigene Anmeldung mit Konto.
 * Wer sich abgemeldet hat, fliegt raus — in JEDER Quelle, siehe `abgemeldet`.
 */

/** Ein Empfänger, zusammengeführt aus allen Quellen. */
export type Empfaenger = {
  email: string;
  /** Vorname, falls wir einen kennen — sonst leer (dann grüßt die Mail neutral). */
  name?: string;
  /** Sprache, falls bekannt (Wetter führt sie mit). Sonst entscheidet die Vorgabe. */
  lang?: string;
  /** Woher wir ihn kennen — nur fürs Protokoll, damit man Herkunft nachvollziehen kann. */
  quellen: string[];
};

/** Kleingeschrieben und getrimmt — sonst gilt „A@B.de" als andere Person als „a@b.de". */
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const gueltig = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/**
 * Sammelt alle Adressen des Portals, entdoppelt sie und wirft die Abgemeldeten raus.
 *
 * Reihenfolge der Quellen ist Absicht: Wer in mehreren steht, behält den ZUERST gefundenen
 * Namen und die zuerst gefundene Sprache. Wetter steht vorn, weil dort Name und Sprache
 * gepflegt sind — im Kiss-Log gibt es beides nicht.
 */
export async function alleEmpfaenger(): Promise<Empfaenger[]> {
  const nachEmail = new Map<string, Empfaenger>();
  const dazu = (email: unknown, quelle: string, name?: unknown, lang?: unknown) => {
    const e = norm(email);
    if (!gueltig(e)) return;
    const da = nachEmail.get(e);
    if (da) { if (!da.quellen.includes(quelle)) da.quellen.push(quelle); return; }
    nachEmail.set(e, {
      email: e,
      name: String(name ?? "").trim() || undefined,
      lang: String(lang ?? "").trim().slice(0, 5) || undefined,
      quellen: [quelle],
    });
  };

  // 1) WETTER — die sauberste Quelle: doppelt bestätigt, mit Name und Sprache.
  //    Wer dort `unsubscribed` ist, wird hier gar nicht erst aufgenommen.
  try {
    const subs = await readWetterSubscribers();
    for (const s of subs as WetterSubscriber[]) {
      if (s.unsubscribed === true) continue;
      dazu(s.email, "wetter", s.name, s.lang);
    }
  } catch { /* eine Quelle darf ausfallen, ohne den ganzen Versand zu kippen */ }

  // 2) DER STAAT: Kuratorinnen, Leads (nur mit Werbe-Einwilligung) und die Besitzer von
  //    Generationen. Alles in einem Lesevorgang — die Datei ist gross.
  try {
    const st = await readTryThisLookState();
    for (const c of (st.curators ?? []) as Array<{ email?: string; firstName?: string; modelName?: string; status?: string }>) {
      if (c.status === "removed") continue;
      dazu(c.email, "kuratorin", c.firstName || c.modelName);
    }
    for (const l of (st.leads ?? []) as Array<{ email?: string; name?: string; marketingConsent?: boolean }>) {
      // NUR MIT EINWILLIGUNG. Ein Lead ist eine Kaufanfrage, kein Rundbrief-Abo — hier steht
      // das Häkchen ausdrücklich im Datensatz, also richten wir uns danach.
      if (l.marketingConsent !== true) continue;
      dazu(l.email, "lead", l.name);
    }
    for (const g of (st.generations ?? []) as Array<{ ownerEmail?: string; customerName?: string }>) {
      dazu(g.ownerEmail, "generation", g.customerName);
    }
  } catch { /* siehe oben */ }

  // 3) KISS-LOG — angemeldete Erzeuger und Käufer (die Adresse kommt bei ihnen von Stripe).
  try {
    const log = await readKissLog();
    for (const e of log as KissLogEntry[]) {
      dazu(e.email, "kiss");
      dazu(e.paidEmail, "kiss-kauf");
    }
  } catch { /* siehe oben */ }

  // Zum Schluss die Sperrliste — sie schlägt jede Quelle.
  const gesperrt = new Set(await readMailAbmeldungen());
  return [...nachEmail.values()].filter(x => !gesperrt.has(x.email));
}
