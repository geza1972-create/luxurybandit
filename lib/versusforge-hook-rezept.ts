/**
 * DAS HOOK-REZEPT (Owner 09.09.2026, nach einem Instagram-Karussell: „Das ist ein Hook. Ein
 * richtig guter Hook. So sollten wir unsere Hooks bauen." · „Zuerst müssen wir das Rezept
 * speichern und auf unseren Generator übertragen.")
 *
 * WAS DORT ZU SEHEN WAR: Zehn Bilder verkaufen einen wertlosen Stein für 500. Nicht durch
 * Behauptungen — der Leser SIEHT zu, wie der Wert entsteht, Bild für Bild, jeder Schritt mit
 * Namen. Am Ende kippt es: „Der Stein hat sich nicht geändert. Dein Wollen hat sich
 * geändert."
 *
 * WOHER ES KOMMT UND WAS WIR NEHMEN: Es war ein öffentlicher Beitrag, und eine Methode
 * gehört niemandem. Sein Wortlaut, seine Gestaltung und sein Beispiel gehören ihm. Wir
 * nehmen die STRUKTUR — nie seine Sätze, nie sein Layout, nie den Stein. Unser Gegenstand
 * ist der eine Satz, den der Kunde eintippt; das ist ohnehin das stärkere Beispiel, weil es
 * bei uns kein Gedankenspiel ist, sondern die echte Ausgabe der Maschine.
 *
 * WARUM DAS HIER STEHT UND NICHT IM AUFTRAGSTEXT: Der Auftragstext in
 * `app/api/versusforge/route.ts` ist lang und wird oft angefasst. Ein Rezept, das mitten
 * darin steht, verschwindet beim nächsten Umbau. Hier ist es EINE Sache, die man liest,
 * ändert und wiederfindet — und der Foliensatz kann dieselben Wörter benutzen.
 *
 * KEIN SERVERKRAM HIER DRIN (dieselbe Falle wie bei `versusforge-portale.ts`): Diese Datei
 * darf ein `"use client"`-Baustein importieren, ohne dass Übersetzer, Speicher und `sharp`
 * im Browser-Bündel landen. Also nur Zeichenketten.
 */

/** Die Hebel, in der Reihenfolge, in der sie aufeinander aufbauen. */
export const HEBEL = [
  { name: "Zweck", frage: "Wofür ist es da? Was tut man damit, das man vorher nicht tat?" },
  { name: "Geschichte", frage: "Woher kommt es? Was macht ausgerechnet dieses Stück besonders?" },
  { name: "Identität", frage: "Was sagt es über den, der es hat?" },
  { name: "Beweis", frage: "Wer hat es schon? Woran sieht man, dass es stimmt?" },
  { name: "Knappheit", frage: "Warum nicht jeder, warum nicht immer?" },
] as const;

/**
 * Der Teil des Auftragstexts, der den HOOK betrifft.
 *
 * Der Kern in einem Satz: Ein Hook benennt einen Zustand, den der Leser SCHON HAT und für
 * normal hält — und macht ihn in derselben Zeile fragwürdig. Nicht das Produkt, nicht die
 * Firma, kein Versprechen.
 */
export const HOOK_REGELN = [
  "Ein Hook benennt einen Zustand, den der Leser SCHON HAT und für normal hält - und macht ihn in derselben Zeile fragwürdig. Erst das Vertraute, dann der Riss darin.",
  "Er spricht über den LESER, nie über das Produkt und nie über die Firma. 'Wir sind seit 30 Jahren' ist kein Hook. 'Fehlt Ihnen ein Zahn - aber Sie schieben es auf?' ist einer.",
  "Höchstens 12 Wörter. Keine Adjektive wie modern, exklusiv, hochwertig, professionell.",
  "So konkret aus SEINEN Angaben, dass ein Fremder denselben Satz nicht schreiben könnte. Ein Hook, der für jede Praxis in Deutschland passt, passt für keine.",
  "Nichts behaupten, was die Angaben nicht hergeben. Keine Zahlen, keine Erfolge, keine Versprechen.",
].join(" ");

/**
 * Der Teil, der die GESCHICHTE betrifft — die vorgeführte Verwandlung.
 *
 * DAS IST DAS NEUE. Bisher lieferte der Plan Varianten desselben Hooks. Varianten sind
 * Auswahl; eine Verwandlung ist ein Beweis. Aus diesen Schritten werden später die Bilder,
 * die der Kunde postet oder als Anzeigenmotive hochlädt — deshalb trägt jeder Schritt genau
 * EINE Aussage und nicht zwei.
 */
export const GESCHICHTE_REGELN = [
  "Eine vorgeführte Verwandlung in 6 bis 8 Schritten, aus der Sicht SEINES Kunden - nicht aus seiner.",
  "Schritt 1 zeigt den Ausgangszustand, den dieser Mensch schon hat und für normal hält. Etwas Alltägliches, Wertloses, Verschobenes.",
  `Die mittleren Schritte legen je EINEN Hebel drauf und benennen ihn. Mögliche Hebel: ${HEBEL.map(h => h.name).join(", ")}. Nicht alle nehmen - nur die, die zu seinem Fall passen.`,
  "Der letzte Schritt ist der Kippsatz: Die Sache selbst hat sich nicht geändert, die Sicht darauf hat sich geändert. Er wirkt nur, wenn die Schritte davor ihn verdient haben.",
  "Je Schritt EINE Aussage, höchstens 20 Wörter. Aus diesen Schritten werden Bilder - zwei Aussagen auf einem Bild sind eine zu viel.",
  "Nichts erfinden. Was seine Angaben nicht hergeben, kommt nicht vor. Lieber sechs ehrliche Schritte als acht mit einem erfundenen.",
].join(" ");
