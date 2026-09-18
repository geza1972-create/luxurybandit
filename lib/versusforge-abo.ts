/**
 * DAS ART-MARKETING-ABO — DIE REGELN AN EINER STELLE (Owner 10.09.2026).
 *
 * ── DAS MODELL ────────────────────────────────────────────────────────────────────────────
 *
 *  · Die Galerie und der Agent kosten nichts. Jede Anfrage kommt mit Name und Kontakt an.
 *  · Nach DREI Interessenten wird er gefragt: „Willst du deinen Agenten für 10 € im Monat
 *    behalten?" — bis der Käufer-Agent existiert, zählen drei Anfragen (Owner: „2 ja").
 *  · Zahlt er nicht, ist nach 14 TAGEN Schluss mit dem Sehen: „Er bekommt weiter Anfragen, aber
 *    er sieht sie nicht." · „Wenn jemand … schreibt, bekommt er eine E-Mail. Aber er kann sie
 *    nicht sehen. Er wird aufgefordert zu zahlen, um die Antwort zu sehen."
 *  · Der Agent arbeitet dabei ganz normal weiter (Owner: „doch, der Agent arbeitet weiter").
 *  · Was er vor der Sperre gesehen hat, behält er. Mit dem Abo sieht er alles.
 *
 * WARUM EINE EIGENE DATEI: Kasse, Dashboard, Anfragen-Route und Mail müssen dieselbe Frage
 * gleich beantworten — „ist diese Anfrage für ihn sichtbar?". Stünde die Rechnung an vier
 * Stellen, liefe eine davon auseinander, und ein Künstler sähe im Dashboard, was die Mail ihm
 * als gesperrt verkauft.
 *
 * KEIN SERVERKRAM HIER DRIN — reine Rechnung, damit auch ein Browser-Baustein sie benutzen darf.
 */

/**
 * DER SCHALTER (Owner 11.09.2026: „wir müssen jetzt erst mal die Sperre raus machen … Ich will, dass Verkehr da ist").
 * Aus: Jeder Künstler sieht jede Anfrage, keine Frist, keine Abo-Frage nach drei Anfragen. Alles unten bleibt gebaut —
 * zum Anschalten hier auf `true`.
 */
export const ABO_SPERRE_AKTIV = false;

/** Ab so vielen fremden Anfragen wird nach dem Abo gefragt. */
export const ABO_FRAGE_AB = 3;
/** So viele Tage nach der Frage bleibt alles sichtbar. */
export const ABO_FRIST_TAGE = 14;

export type AboStand = {
  aktiv: boolean;
  /** Seit wann bezahlt wird. */
  seit?: string;
  /** Die Stripe-Subscription — über sie meldet der Webhook die Kündigung. */
  subscription?: string;
  /** Wann es geendet hat (Kündigung, gescheiterte Zahlung). */
  bis?: string;
  /**
   * ── EIN GESCHENKTES ABO, BIS ZU DIESEM TAG (Owner 14.09.2026: „wir geben guten Künstlern
   * Premium frei. Sie sind unser Motor" · „Gewinne jetzt ein Premium-Abo" · „er bekommt von uns
   * 120 € geschenkt. Jahresabo") ───────────────────────────────────────────────────────────────
   *
   * EIN EIGENES FELD, NICHT `bis`: Jenes bedeutet „beendet am" und wird vom Webhook zusammen mit
   * `aktiv: false` gesetzt. Beides in ein Feld zu legen, hiesse, dass eine Kündigung wie ein
   * Geschenk aussieht und umgekehrt.
   *
   * UND `aktiv` BLEIBT DABEI FALSE: Geschenkt ist nicht bezahlt. Stünde hier `aktiv: true`, liefe
   * das Geschenk nie ab — der Künstler hätte für immer Premium, und niemand würde es merken.
   */
  geschenktBis?: string;
};

type MitAbo = { abo?: AboStand; aboFrageAm?: string };
type Anfrage = { zeit: string; eigen?: boolean };

/**
 * Hat er Premium — bezahlt ODER geschenkt?
 *
 * Die Reihenfolge ist wichtig: Ein bezahltes Abo gilt immer. Ein geschenktes gilt, solange sein
 * Tag nicht vorbei ist; danach fällt er von selbst zurück, ohne dass jemand etwas löschen muss.
 */
export const aboAktiv = (m: MitAbo) => {
  if (m.abo?.aktiv === true) return true;
  const bis = m.abo?.geschenktBis ? Date.parse(m.abo.geschenktBis) : NaN;
  return Number.isFinite(bis) && bis > Date.now();
};

/** Ob das Premium ein Geschenk ist — fürs Dashboard, damit dort nicht „bezahlt" steht. */
export const aboGeschenkt = (m: MitAbo) => {
  if (m.abo?.aktiv === true) return false;
  const bis = m.abo?.geschenktBis ? Date.parse(m.abo.geschenktBis) : NaN;
  return Number.isFinite(bis) && bis > Date.now();
};

/**
 * ── KI IST PREMIUM (Owner 14.09.2026: „wir sperren in der Homepage selbst die Funktion KI
 * analysieren gratis. Das ist Premium" · „es wird keine KI-Texte generiert, wenn jemand in seinem
 * Homepagetool Bilder hochlädt. Es sei denn, er hat ein Premium-Abo") ────────────────────────
 *
 * DER EINE TORWÄCHTER. Vier Stellen erzeugen heute KI-Texte für einen Künstler — zwei Knöpfe,
 * die er drückt, und drei Läufe, die beim blossen „Speichern" im Hintergrund starten. Stünde die
 * Frage an jeder Stelle einzeln, liefe eine davon auseinander, und ein Künstler ohne Abo bekäme
 * doch Texte geschrieben.
 *
 * ── WAS ER OHNE ABO BEHÄLT ──────────────────────────────────────────────────────────────────
 *
 * Alles, was schon dasteht. Gesperrt ist nur das NEU ERZEUGEN — seine Seite, seine Bilder, seine
 * vorhandenen Sätze bleiben unangetastet. Wir nehmen ihm nichts weg, wir schenken nichts mehr.
 *
 * ── UNABHÄNGIG VON `ABO_SPERRE_AKTIV` ───────────────────────────────────────────────────────
 *
 * Jener Schalter regelt, ob ANFRAGEN verborgen werden — eine andere Frage, vom Owner am
 * 11.09.2026 bewusst abgeschaltet („ich will, dass Verkehr da ist"). Die KI-Sperre hängt nicht
 * daran: Sie kostet uns Geld bei jedem Klick, und zwar sofort.
 */
/**
 * ── DER SCHALTER FÜR DIE KI-SPERRE (14.09.2026) ─────────────────────────────────────────────
 *
 * `false` heisst: Alles ist gebaut, aber niemand ist gesperrt — jeder Künstler bekommt weiter
 * seine Texte. Auf `true` gestellt, gilt ab sofort: nur mit Premium.
 *
 * WARUM ER EXISTIERT: Beim Einbau hatten 9 Künstler kein Abo und KEINER einen sichtbaren
 * Kaufweg. Ohne diesen Schalter hätte der nächste Deploy neun Leuten gleichzeitig die Texte
 * abgedreht — darunter zahlende und geschenkte. Der Schalter trennt „gebaut" von „scharf", damit
 * das Dringende (Zeitlimits im Trichter) ausrollen kann, ohne dass die Sperre mitkommt.
 *
 * Dasselbe Muster wie `ABO_SPERRE_AKTIV` oben, aus demselben Grund.
 */
export const KI_SPERRE_AKTIV = false;

/**
 * Darf für ihn KI schreiben?
 *
 * Solange der Schalter aus ist, immer. Danach nur mit Premium — bezahlt oder geschenkt.
 */
export const darfKi = (m: MitAbo) => !KI_SPERRE_AKTIV || aboAktiv(m);

/**
 * Wie viele Werke er halten darf (Owner 14.09.2026: „auch mehr wie 10 Bilder ist Premium").
 *
 * Die 10 standen bisher NUR im Browser (`WERKE_MAX` in `PortalBearbeiten`), während der Server
 * 13 annahm — wer die Route direkt ansprach, umging die Grenze. Ab hier gilt sie für beide.
 */
export const WERKE_FREI = 10;
/* 25 statt 13 (Owner 18.09.2026: „er bekommt bis 50 Werke" · „oder 25") — die 13 stammten aus
   der Zeit, als das Abo nur KI-Texte brachte. Wer für einen Shop zahlt, braucht Ware darin. */
export const WERKE_ABO = 25;
export const werkeGrenze = (m: MitAbo) => (aboAktiv(m) ? WERKE_ABO : WERKE_FREI);

/** Ab wann Anfragen verborgen sind — `null`, solange keine Frist läuft oder abgelaufen ist. */
export function sperreAb(m: MitAbo): number | null {
  if (!ABO_SPERRE_AKTIV) return null;
  const frage = m.aboFrageAm ? Date.parse(m.aboFrageAm) : NaN;
  return Number.isFinite(frage) ? frage + ABO_FRIST_TAGE * 24 * 3600 * 1000 : null;
}

/** Ist die Frist abgelaufen und kein Abo da? */
export const gesperrt = (m: MitAbo, jetzt = Date.now()) => {
  const ab = sperreAb(m);
  return !aboAktiv(m) && ab !== null && jetzt >= ab;
};

/**
 * Sieht er DIESE Anfrage? Eigene Testläufe immer. Mit Abo alles. Ohne Abo alles, was vor dem
 * Ende der Frist ankam — was danach kommt, bleibt verborgen, bis er zahlt.
 */
export function anfrageSichtbar(m: MitAbo, a: Anfrage): boolean {
  if (a.eigen || aboAktiv(m)) return true;
  const ab = sperreAb(m);
  if (ab === null) return true;
  const zeit = Date.parse(a.zeit);
  return !Number.isFinite(zeit) || zeit < ab;
}
