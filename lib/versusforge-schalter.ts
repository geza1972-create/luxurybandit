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
