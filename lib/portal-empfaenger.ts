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
  /**
   * HAT DIESE PERSON DAS PORTAL WIRKLICH BENUTZT — oder ist sie nur eine Zeile aus einem
   * Anzeigenformular?
   *
   * Der Unterschied entscheidet über die Zustellbarkeit. Wer ein Bild erzeugt, gekauft oder
   * seine Adresse doppelt bestätigt hat, existiert nachweislich. Eine Adresse aus einem
   * Meta-Anzeigenformular hat nie jemand geprüft: Dort tippt man im Vorbeigehen, und Meta
   * füllt Felder automatisch vor. Genau daraus entstehen die Unzustellbar-Berichte.
   */
  bestaetigt: boolean;
};

/** Kleingeschrieben und getrimmt — sonst gilt „A@B.de" als andere Person als „a@b.de". */
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const gueltig = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/**
 * ATTRAPPEN AUSSORTIEREN — die wichtigste Zeile dieser Datei.
 *
 * Owner 31.07.2026: Eine Testmail brachte sofort einen Unzustellbar-Bericht zurück
 * („550-5.1.1 The email account that you tried to reach does not exist") für eine erfundene
 * Kuratorinnen-Adresse.
 *
 * WARUM DAS GEFÄHRLICH IST, und zwar mehr als es aussieht: Die Kuratorinnen-Liste stammt
 * grösstenteils aus dem Seeding. Dort stehen unsere eigene Support-Adresse (vielfach!),
 * `.invalid`, `@seed.lb` und ausgedachte Gmail-Adressen. Verschickt man an so eine Liste,
 * kommt ein grosser Teil als unzustellbar zurück — und GENAU DARAN messen Gmail und Hostinger,
 * ob ein Absender seine Empfänger kennt. Eine hohe Rücklaufquote kostet nicht diese eine Mail,
 * sondern die Zustellbarkeit der DOMAIN. Danach landet auch die Liefermail eines zahlenden
 * Kunden im Spam-Ordner. Ein schlechter Rundbrief kann also den bezahlten Weg beschädigen.
 *
 * Deshalb: erkennbare Attrappen fliegen raus, bevor irgendetwas rausgeht. Lieber ein paar
 * echte Adressen zu wenig als die Domain verbrannt.
 */
const ATTRAPPE = /@(luxurybandit\.com|.*\.invalid|example\.(com|org|net)|test|local|localhost|mailinator\.com)$/i;

/**
 * `.lb` IST GESPERRT (Owner 31.07.2026: „ab jetzt .lb blockieren").
 *
 * Die Seed-Skripte haben sich `@seed.lb` als Phantasie-Endung ausgedacht — „lb" für
 * LuxuryBandit. Nur ist `.lb` KEINE Phantasie: Es ist die Länderkennung des Libanon, also
 * eine echte, registrierbare Endung. Zwei Folgen, beide unerwünscht:
 *
 *   1. Ein Mailserver versucht die Zustellung WIRKLICH, findet nichts und wirft die Mail als
 *      unzustellbar zurück. Genau diese Rückläufer kosten uns die Zustellbarkeit der Domain.
 *   2. Registriert jemand `seed.lb`, gingen unsere Mails an einen FREMDEN Empfänger.
 *
 * GESPERRT WIRD `seed.lb`, NICHT die ganze Endung `.lb` (Owner 31.07.2026, auf Nachfrage
 * präzisiert). Das ist die richtige Grenze: Gesperrt gehört unsere eigene Erfindung, nicht
 * ein ganzes Land. Ein Filter, der `.lb` pauschal wirft, würde einen echten libanesischen
 * Kunden aussperren, ohne dass es je jemandem auffiele — und eine unsichtbar aussortierte
 * echte Adresse ist schlimmer als eine durchgerutschte falsche.
 *
 * Richtig wäre in den Seed-Skripten `.invalid` (RFC 2606): per Norm nie registrierbar, jeder
 * Mailserver weiß das und versucht gar nicht erst zuzustellen.
 */
const GESPERRTE_DOMAIN = /@(.*\.)?seed\.lb$/i;

export const istAttrappe = (e: string) =>
  ATTRAPPE.test(e)
  || GESPERRTE_DOMAIN.test(e)
  // Unsere eigene Adresse ist bei den Seed-Models als Platzhalter eingetragen — ein
  // Rundbrief an uns selbst, 20-mal, sagt niemandem etwas.
  || e.startsWith("support@")
  || e.includes("+seed")
  || e.startsWith("noreply@") || e.startsWith("no-reply@");

/**
 * Sammelt alle Adressen des Portals, entdoppelt sie und wirft die Abgemeldeten raus.
 *
 * Reihenfolge der Quellen ist Absicht: Wer in mehreren steht, behält den ZUERST gefundenen
 * Namen und die zuerst gefundene Sprache. Wetter steht vorn, weil dort Name und Sprache
 * gepflegt sind — im Kiss-Log gibt es beides nicht.
 */
export async function alleEmpfaenger(): Promise<Empfaenger[]> {
  const nachEmail = new Map<string, Empfaenger>();
  const dazu = (email: unknown, quelle: string, name?: unknown, lang?: unknown, bestaetigt = false) => {
    const e = norm(email);
    if (!gueltig(e) || istAttrappe(e)) return;
    const da = nachEmail.get(e);
    if (da) {
      if (!da.quellen.includes(quelle)) da.quellen.push(quelle);
      // Einmal bestätigt bleibt bestätigt: Wer in EINER Quelle nachweislich existiert, ist
      // eine echte Person — auch wenn er anderswo nur als Anzeigen-Zeile auftaucht.
      if (bestaetigt) da.bestaetigt = true;
      return;
    }
    nachEmail.set(e, {
      email: e,
      name: String(name ?? "").trim() || undefined,
      lang: String(lang ?? "").trim().slice(0, 5) || undefined,
      quellen: [quelle],
      bestaetigt,
    });
  };

  // 1) WETTER — die sauberste Quelle: doppelt bestätigt, mit Name und Sprache.
  //    Wer dort `unsubscribed` ist, wird hier gar nicht erst aufgenommen.
  try {
    const subs = await readWetterSubscribers();
    for (const s of subs as WetterSubscriber[]) {
      if (s.unsubscribed === true) continue;
      // `confirmed` = doppelte Bestätigung per E-Mail. Die 42 unbestätigten sind fast alle
      // Meta-Anzeigen-Leads (siehe `note`) — dort kommen die Rückläufer her.
      dazu(s.email, "wetter", s.name, s.lang, s.confirmed === true);
    }
  } catch { /* eine Quelle darf ausfallen, ohne den ganzen Versand zu kippen */ }

  // 2) DER STAAT: Kuratorinnen, Leads (nur mit Werbe-Einwilligung) und die Besitzer von
  //    Generationen. Alles in einem Lesevorgang — die Datei ist gross.
  try {
    const st = await readTryThisLookState();
    for (const c of (st.curators ?? []) as Array<{ email?: string; firstName?: string; modelName?: string; status?: string }>) {
      if (c.status === "removed") continue;
      // Eine Kuratorin hat sich selbst angemeldet und ein Konto — das zaehlt als bestaetigt.
      dazu(c.email, "kuratorin", c.firstName || c.modelName, undefined, true);
    }
    for (const l of (st.leads ?? []) as Array<{ email?: string; name?: string; marketingConsent?: boolean }>) {
      // NUR MIT EINWILLIGUNG. Ein Lead ist eine Kaufanfrage, kein Rundbrief-Abo — hier steht
      // das Häkchen ausdrücklich im Datensatz, also richten wir uns danach.
      if (l.marketingConsent !== true) continue;
      // Ein Lead hat ein Formular ausgefuellt, aber nie etwas erzeugt: nicht bestaetigt.
      dazu(l.email, "lead", l.name, undefined, false);
    }
    for (const g of (st.generations ?? []) as Array<{ ownerEmail?: string; customerName?: string }>) {
      // Wer eine Generation besitzt, hat das Portal nachweislich benutzt.
      dazu(g.ownerEmail, "generation", g.customerName, undefined, true);
    }
  } catch { /* siehe oben */ }

  // 3) KISS-LOG — angemeldete Erzeuger und Käufer (die Adresse kommt bei ihnen von Stripe).
  try {
    const log = await readKissLog();
    for (const e of log as KissLogEntry[]) {
      // Erzeugt = benutzt; bezahlt = von Stripe geprueft. Beides ist ein Nachweis.
      dazu(e.email, "kiss", undefined, undefined, true);
      dazu(e.paidEmail, "kiss-kauf", undefined, undefined, true);
    }
  } catch { /* siehe oben */ }

  // Zum Schluss die Sperrliste — sie schlägt jede Quelle.
  const gesperrt = new Set(await readMailAbmeldungen());
  return [...nachEmail.values()].filter(x => !gesperrt.has(x.email));
}
