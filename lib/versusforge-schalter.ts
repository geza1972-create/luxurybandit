/**
 * DER EINE SCHALTER FÜR DEN KAUFWEG — in einer Datei, die NICHTS vom Server kennt.
 *
 * WARUM SEPARAT (08.09.2026, an einem Build-Fehler von heute Vormittag gelernt): Der Schalter
 * muss an zwei Orten gelesen werden — im Deckel auf dem Server UND auf der Startseite im
 * Browser, die den Preissatz nur zeigen darf, wenn wirklich kassiert wird. Läge er in
 * `versusforge-deckel.ts`, zöge jeder Client-Baustein über dessen Speicher-Import `sharp`
 * ins Browser-Bündel und der Bau bräche mit „Can't resolve 'child_process'" ab.
 *
 * MERKSATZ: Was ein „use client"-Baustein braucht, gehört in eine Datei ohne Server-Import.
 *
 * ZUM ANSCHALTEN: hier auf `true` — dann greifen Gratis-Grenze, Kaufschirm und Kasse
 * gleichzeitig, und der Satz auf der Startseite erscheint. Ein Ort, kein Halbzustand.
 */
export const VF_KAUF_AKTIV = false;

/**
 * DER PROBEKAUF — KOSTENLOS FREISCHALTEN, UM DEN WEG ZU PRÜFEN (Owner 09.09.2026: „du machst
 * es erst mal kostenlos, mach ein Button kaufen und dann kaufst du als Fake, um zu testen.
 * Wenn alles klappt, dann baust du Stripe ein").
 *
 * ── WARUM DAS DER RICHTIGE WEG IST ─────────────────────────────────────────────────────────
 *
 * Der Stripe-Schlüssel ist live. Jeder echte Testkauf kostet 299 € und muss danach erstattet
 * werden — und geprüft werden muss trotzdem alles ANDERE: dass der Knopf antwortet, dass der
 * Trichter danach scharf steht, dass die Anfragen sichtbar werden, dass ein zweiter Klick
 * nichts doppelt macht. Genau das prüft der Probekauf, ohne einen Cent.
 *
 * ── DIE EINE BEDINGUNG, DIE IHN UNGEFÄHRLICH MACHT ─────────────────────────────────────────
 *
 * Er verlangt den Dashboard-Schlüssel des Trichters. Den hat nur, wer die Mail bekommen hat —
 * also der Besitzer. Ohne diese Bedingung könnte jeder, der einen Trichternamen errät, ein
 * fremdes Dashboard öffnen und fremde Telefonnummern lesen. Das wäre kein entgangener Umsatz,
 * das wäre ein Datenleck.
 *
 * ── ER GEHÖRT AUSGESCHALTET, BEVOR ECHTES GELD FLIESST ─────────────────────────────────────
 *
 * Solange er `true` ist, verkauft VersusForge nichts — jeder Besitzer schaltet sich selbst
 * frei. Das ist gewollt, solange geprüft wird, und falsch ab dem Tag, an dem geworben wird.
 * Wer ihn auf `false` setzt, schaltet damit die Kasse scharf.
 */
export const VF_KAUF_PROBE = true;

/**
 * ── DIE ERSTE ANFRAGE IST OFFEN (Owner 09.09.2026: „er kann es bekommen, auch alles free —
 * ab dem Moment, wo er 2 Anfragen bekommt, dann wird es gesperrt" · „er sieht aber auf seinem
 * Dashboard bloss nicht, wer die Anfrage gemacht hat" · „das wäre noch schlauer") ────────────
 *
 * ── DIE FRAGE, AUS DER ES ENTSTAND ─────────────────────────────────────────────────────────
 *
 * „Zahlt er, ohne zu sehen, was er bekommt?" Vorher: ja. Er sah einen Zähler — „3 Menschen
 * haben ihre Nummer hinterlassen" — und sollte dafür 299 € zahlen. Das ist ein Versprechen,
 * kein Beweis, und für einen Betrieb, der uns nicht kennt, ist es zu viel verlangt.
 *
 * ── WAS JETZT GILT ─────────────────────────────────────────────────────────────────────────
 *
 * Die ERSTE Anfrage ist vollständig offen: Name, Telefonnummer, das ganze Gespräch. Er ruft
 * an, und am anderen Ende ist ein echter Mensch, der wirklich gefragt hat. Ab der ZWEITEN
 * fehlt genau eine Sache — WER es war. Alles andere bleibt sichtbar: was der Mensch gesagt
 * hat, wann er da war, wie viele es sind.
 *
 * ── WARUM DAS BESSER VERKAUFT ALS EIN SCHLOSS VON ANFANG AN ────────────────────────────────
 *
 * Der Moment der Sperre ist der Moment des grössten Verlangens: Es liegt schon eine zweite
 * Nummer da, und er WEISS aus dem ersten Anruf, dass sie echt ist. Er zahlt nicht mehr dafür,
 * herauszufinden, ob es funktioniert — er zahlt, weil es funktioniert.
 *
 * Es ist die Hausregel [[gratis-nur-mit-muster]], auf Anfragen angewandt: Das Muster ist
 * vollständig und darf benutzt werden. Nur die Menge kostet.
 *
 * ── UND ES IST EHRLICH ─────────────────────────────────────────────────────────────────────
 *
 * Kein verwischter Text, keine Punkte statt Buchstaben. Was verschlossen ist, wird gar nicht
 * erst mitgeschickt — ein unscharfer Name im Quelltext wäre ein Trick, und Tricks fallen auf.
 */
/**
 * FÜNF, NICHT EINE (Owner 09.09.2026: „er kann sogar eine Anfrage sehen, sogar 5 von mir aus"
 * · „wenn er eine Anzeige schaltet, dann wird er mehrere sehen").
 *
 * DER GRUND IST DIE ANZEIGE. Mit einer laufenden Kampagne kommen Anfragen in Schüben, nicht
 * einzeln. Bei einer freien wäre die Sperre nach zwei Stunden da — und zwar bevor er den
 * ersten Menschen überhaupt angerufen hat. Dann zahlt er wieder für ein Versprechen.
 *
 * BEI FÜNF HAT ER GEREDET. Fünf echte Telefonate mit Menschen, die auf seine Anzeige
 * geantwortet haben — danach diskutiert niemand mehr über 299 €, weil er die Rechnung selbst
 * aufmacht: Was ist ein Patient wert, was ein Auftrag, was eine Wohnung.
 *
 * DIE ZAHL IST EINE PRODUKTENTSCHEIDUNG, KEINE GRENZE GEGEN MISSBRAUCH. Sie darf steigen,
 * wenn sich zeigt, dass Menschen erst später kaufen — und sinken, wenn fünf zu grosszügig
 * sind. Sie steht deshalb hier und nicht in einem Text, den man abtippt.
 */
export const VF_ANFRAGEN_OFFEN = 5;
