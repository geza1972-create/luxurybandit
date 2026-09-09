import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { isLang, type Lang } from "@/lib/lang";

/**
 * DIE TEXTE AUF DER SEITE DES MANDANTEN — der Rahmen um SEINE Worte.
 *
 * ── WARUM ES DIESE DATEI GEBEN MUSS (Owner 09.09.2026: „auch alles, was er erstellt — den
 * Trichter und Hook und Dashboard — wird in der Sprache erstellt, die er spricht") ──────────
 *
 * Sein Hook, seine Karten, sein Knopftext kommen aus dem Plan und stehen schon in seiner
 * Sprache. Der RAHMEN stand fest auf Deutsch im Code: „Ihre Angabe", „Wie erreichen wir
 * Sie?", „Ist angekommen." Bei einem rumänischen Trichter ergab das eine halbdeutsche Seite —
 * und zwar an den drei Stellen, an denen sein Kunde entscheidet, ob er seine Telefonnummer
 * hinterlässt.
 *
 * ── DIE SPRACHE KOMMT VOM MANDANTEN, NICHT VOM BESUCHER ────────────────────────────────────
 *
 * Überall sonst im Haus entscheidet der Browser des Lesers. Hier nicht: Sein Hook ist EIN
 * Text in EINER Sprache. Stünde der Rahmen nach Browsersprache daneben, läse ein deutscher
 * Besucher deutsche Knöpfe über einem rumänischen Hook — schlimmer als beides in einer
 * Sprache. Wen er bewirbt, entscheidet er mit seiner Anzeige.
 *
 * ── HIER WIRD GESIEZT ──────────────────────────────────────────────────────────────────────
 *
 * Der einzige Ort im Haus, an dem die Hausregel [[immer-duzen]] nicht gilt: Auf dieser Seite
 * spricht nicht VersusForge, sondern der Zahnarzt mit seinem Patienten. Die Ausnahme endet
 * am Vorschau-Kasten — der ist an den Mandanten gerichtet, und den duzen wir.
 */
export const MANDANT_TEXTE = {
  /* ── Das Gespräch ────────────────────────────────────────────────────────── */
  ihreAngabe: "Ihre Angabe",
  moment: "Einen Moment …",
  selbstSchreiben: "Oder selbst schreiben",
  ok: "OK",

  /* ── Die Kontaktdaten ────────────────────────────────────────────────────── */
  wieErreichen: "Wie erreichen wir Sie?",
  /**
   * `{name}` IST SEIN BETRIEBSNAME und wird nach der Übersetzung eingesetzt.
   *
   * VORHER STAND HIER „an die Praxis" — richtig beim Zahnarzt, falsch bei jedem anderen.
   * Ein Restaurant hat keine Praxis, und der Satz, der Vertrauen schaffen soll, war für die
   * Mehrheit der Mandanten schlicht falsch.
   *
   * ÜBERSETZER-FALLE ([[uebersetzer-fallen]]): Platzhalter werden erfunden oder übersetzt.
   * Deshalb wird `{name}` NACH der Übersetzung ersetzt, und wenn er dabei verloren geht,
   * steht immer noch ein vollständiger Satz da.
   */
  nurAn: "{name} ruft Sie an. Ihre Angaben gehen nur dorthin, an niemanden sonst.",
  ihrName: "Ihr Name",
  telefon: "Telefonnummer",
  absenden: "Absenden",
  fehlendeAngaben: "Bitte Name und Telefonnummer angeben.",

  /* ── Danach ──────────────────────────────────────────────────────────────── */
  angekommen: "Ist angekommen.",
  meldetSich: "{name} meldet sich bei Ihnen. Sie müssen nichts weiter tun.",

  /* ── Wenn etwas schiefgeht ───────────────────────────────────────────────── */
  fehler: "Das ging gerade nicht. Bitte noch einmal.",

  /* ── Die Vorschau — an den Mandanten gerichtet, deshalb geduzt ───────────── */
  vorschauEtikett: "Noch nicht online",
  vorschauTitel: "Hier stünde jetzt das Kontaktfeld.",
  vorschauText: "Der Trichter ist fertig. Bevor er Anfragen entgegennehmen darf, müssen dein Impressum und deine Datenschutzerklärung darauf stehen — das verlangt das Gesetz an der Stelle, an der jemand seinen Namen hinterlässt. Trag die zwei Links ein, dann ist er online. Das kostet nichts.",
} as const;

export type MandantTexte = { -readonly [K in keyof typeof MANDANT_TEXTE]: string };

/**
 * Der Rahmen in der Sprache des Mandanten.
 *
 * Alte Trichter tragen kein `sprache`-Feld — dort gilt Deutsch, so wie sie erzeugt wurden.
 * Nichts wird nachträglich umgeschrieben.
 */
export async function mandantTexteInSprache(sprache?: string): Promise<MandantTexte> {
  const kurz = String(sprache ?? "de").slice(0, 2).toLowerCase();
  const lang: Lang = isLang(kurz) ? kurz : "de";
  return await textbausteineInSprache({ ...MANDANT_TEXTE } as MandantTexte, lang);
}
