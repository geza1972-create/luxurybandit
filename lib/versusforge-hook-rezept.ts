/**
 * DAS HOOK-REZEPT (Owner 09.09.2026, nach einem Instagram-Karussell: „Das ist ein Hook. Ein
 * richtig guter Hook. So sollten wir unsere Hooks bauen.“ · „Zuerst müssen wir das Rezept
 * speichern und auf unseren Generator übertragen.“)
 *
 * WAS DORT ZU SEHEN WAR: Zehn Bilder verkaufen einen wertlosen Stein für 500. Nicht durch
 * Behauptungen — der Leser SIEHT zu, wie der Wert entsteht, Bild für Bild, jeder Schritt mit
 * Namen. Am Ende kippt es: „Der Stein hat sich nicht geändert. Dein Wollen hat sich
 * geändert.“
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
/**
 * ZWEI NAMEN JE HEBEL — UND DAS IST KEINE KOSMETIK (Owner 09.09.2026: „ich will den nicht
 * veröffentlichen, es ist doch gratis" · „die Leute sollen es testen. Gute Restaurants
 * veröffentlichen ihr Rezept auch nicht").
 *
 *  · `name` ist der INTERNE Name. Er steht im Auftragstext an das Modell und in diesem Repo.
 *  · `schritt` ist, was der Besucher im Trichter über der Frage liest.
 *
 * WARUM ÜBERHAUPT ETWAS DASTEHT: Ein benannter Schritt macht aus einer Rückfrage einen
 * Arbeitsgang — man sieht, dass die Maschine etwas Bestimmtes holt, und antwortet anders als
 * vor „Rückfrage 2 von 4".
 *
 * WARUM NICHT DIE ECHTEN NAMEN: Zweck · Geschichte · Identität · Beweis · Knappheit
 * nebeneinander IST die Formel. Wer sie liest, hat sie — und dann ist das Einzige, was wir
 * vor dem nächsten Anbieter voraushaben, ein Screenshot weit weg. Das Ergebnis geben wir
 * gratis her, den Bauplan nicht.
 *
 * WER DIESE WÖRTER ÄNDERT, ändert nur `schritt`. `name` und `schluessel` hängen an
 * Auftragstexten und an gespeicherten Plänen; sie umzubenennen macht altes Material blind.
 */
export const HEBEL = [
  {
    schluessel: "zweck",
    name: "Zweck",
    schritt: "Nutzen",
    frage: "Wofür ist es da? Was tut man damit, das man vorher nicht tat?",
    /* Was eine BRAUCHBARE Antwort ist — daran erkennt der Agent, ob der Hebel gefüllt ist
       oder ob er nachfassen muss. */
    gut: "Was der Kunde HINTERHER kann, nicht was verkauft wird. Nicht „Implantate“, sondern „wieder in einen Apfel beissen“.",
  },
  {
    schluessel: "geschichte",
    name: "Geschichte",
    schritt: "Herkunft",
    frage: "Woher kommt es? Was macht ausgerechnet dieses Stück besonders?",
    gut: "Herkunft, Verfahren, Handgriff, Jahreszahl — etwas, das ein Nachbarbetrieb nicht behaupten könnte.",
  },
  {
    schluessel: "identitaet",
    name: "Identität",
    schritt: "Wirkung",
    frage: "Was sagt es über den, der es hat?",
    gut: "Wer der Kunde damit WIRD, in seinen eigenen Augen und vor anderen.",
  },
  {
    schluessel: "beweis",
    name: "Beweis",
    schritt: "Beleg",
    frage: "Wer hat es schon? Woran sieht man, dass es stimmt?",
    gut: "Zahlen, Jahre, Namen, Vorher-Nachher, wiederkehrende Kunden. Was man nachzählen kann.",
  },
  {
    schluessel: "knappheit",
    name: "Knappheit",
    schritt: "Grenze",
    frage: "Warum nicht jeder, warum nicht immer?",
    gut: "Kapazität, Bedingung, Auswahl, Saison. Warum es NICHT für alle passt — nicht ein erfundener Countdown.",
  },
] as const;

/**
 * DIE FÜNF HEBEL SIND DIE FRAGEN (Owner 09.09.2026, mit dem Karussell: „jetzt schau mal die
 * Formel. Die Fragen, die wir stellen, müssen diese erfragen, bis wir die zu 100% haben“ ·
 * „der Rest ist Technik“).
 *
 * ── WAS SICH DAMIT UMDREHT ─────────────────────────────────────────────────────────────────
 *
 * Bisher fragte der Berater nach dem, was eine KAMPAGNE braucht: Preis, Ort, Umkreis,
 * Termine. Alles richtig — und alles Technik. Daraus lässt sich eine Anzeige schalten, aber
 * kein Hook schreiben, denn ein Hook lebt von genau diesen fünf Hebeln. Fehlt das Material,
 * kann das Modell nur Hülsen bauen; erfinden darf es nicht, und das ist gut so.
 *
 * IM KARUSSELL ERFINDET DER MARKETER die fünf Hebel, weil ein Stein nichts davon hat. Bei
 * einem echten Betrieb ist es umgekehrt: Alle fünf sind DA, er sagt sie nur nicht — niemand
 * hat ihn je danach gefragt. Deshalb ist unsere Aufgabe nicht Erfinden, sondern Herausholen.
 * Genau das kann ein Formular nicht und ein Gespräch schon.
 *
 * DER ZWECK KOMMT MEIST OHNE FRAGE: Er steht in seinem ersten Satz und auf seiner Website.
 * Damit bleiben vier Fragen für vier Hebel — und „Vier Fragen“ darf auf der Startseite
 * stehen bleiben.
 *
 * TECHNIK NUR, WENN SIE FEHLT UND NIEMAND SIE ABLEITEN KANN. Ort und Umkreis stehen fast
 * immer auf der Website; ein Budget lässt sich vorschlagen. Eine Frage danach kostet einen
 * von vier Zügen und bringt keinen Hook.
 */
export const HEBEL_AUFTRAG = [
  "DEINE FRAGEN HABEN GENAU EINEN ZWECK: die fünf Hebel zu füllen, aus denen ein Hook gebaut wird. Jede Frage bedient GENAU EINEN Hebel.",
  ...HEBEL.map(h => `  · ${h.name} — ${h.frage} BRAUCHBAR IST: ${h.gut}`),
  "Frag immer nach dem am schlechtesten gefüllten Hebel. Was sein Satz oder seine Website schon hergeben, fragst du NICHT noch einmal.",
  "Eine ausweichende oder allgemeine Antwort füllt einen Hebel NICHT. Sag das in 'reaktion' und hak beim selben Hebel nach, statt zum nächsten zu springen.",
  "Preis, Ort, Umkreis, Termine und Budget sind Technik. Sie ergeben keinen Hook. Frag danach NUR, wenn du es nirgends ableiten kannst und ohne es keine Anzeige möglich wäre.",
  "Du erfindest keinen Hebel. Was er nicht sagt, bleibt leer — und ein leerer Hebel ist ehrlicher als ein erfundener.",
].join("\n");

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
