import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import type { Lang } from "@/lib/lang";

/**
 * DIE TEXTE DER DAVID-LANDINGPAGE — DEUTSCHES ORIGINAL, EINE QUELLE.
 *
 * Der Wortlaut ist der des Owners (28.08.2026, diktiert: „DAVID · AI PRE-SCREENING —
 * Willst du einen besser bezahlten Job? …"). Er steht hier flach als
 * `Record<string, string>`, weil `textbausteineInSprache` genau das übersetzen kann: EIN
 * Aufruf je Sprache, danach Dauer-Cache. Sieben handgepflegte Tabellen altern bei der
 * ersten Textänderung — die Begründung steht ausführlich in lib/tr-object.ts.
 *
 * DEUTSCH IST DIE QUELLE, nicht Englisch: deshalb `textbausteineInSprache` (übersetzt
 * ALLES ausser Deutsch) und nicht `trObject` (das bei `en` unverändert durchreicht und
 * einem englischen Leser deutschen Text zeigen würde).
 *
 * ZWEI ORTE, EINE DATEI (Memory `tunnel-zeigt-landingpage-inhalt`): Die Landingpage
 * rendert diese Texte unter ihrer Video-Karte, der Pre-Screening-Tunnel später unter
 * seinem Anmeldeformular — beide über `components/DavidInhalt.tsx`.
 *
 * WAS HIER NICHT STEHT: kein Preis, keine Zahl. Das Screening ist gratis („Jetzt
 * kostenlos starten"); käme später eine Kasse dazu, kommt die Zahl aus `lib/pricing.ts`
 * und nie aus diesem Text (Memory `prices-only-from-pricing-table`).
 */
export const DAVID_TEXTE = {
  /* ── Kopf ───────────────────────────────────────────────────────────────── */
  kicker: "David · Das Vorgespräch",
  /**
   * Die H1 zweifarbig: Anfang weiss, `h1y` im Haus-Gold (components/Landing).
   *
   * DER SATZ AUS DER WERBUNG GEHÖRT AUF DIE SEITE (Owner 29.08.2026: „Hier muss stehen: Finde
   * heraus, was dein Lebenslauf nicht erzählt mit David AI!").
   *
   * Vorher stand „Willst du einen besser bezahlten Job?" — eine Frage, die jeder Jobtitel
   * stellt, austauschbar mit hundert anderen Anzeigen. Der neue Satz ist derselbe, mit dem
   * geworben wird, und derselbe, der im Ergebnis als Hero steht („Was dein Lebenslauf noch
   * nicht erzählt"). Wer über die Anzeige kommt, liest oben genau das, worauf er geklickt
   * hat, und findet es unten im Bericht wieder — dreimal derselbe Faden statt dreier
   * Versprechen.
   *
   * DER GOLDENE TEIL IST DAS VERSPRECHEN, NICHT DER NAME: „was dein Lebenslauf nicht erzählt"
   * ist der Grund zum Klicken; „mit David AI" ist nur die Marke.
   */
  h1a: "Finde heraus, ",
  h1y: "was dein Lebenslauf nicht erzählt",
  h1b: " — mit David AI!",
  /**
   * DIE ZEILE UNTER DER ÜBERSCHRIFT (Owner 29.08.2026: „Dann wenn du einen besser bezahlten
   * Job willst, musst du mehr erzählen als du denkst!").
   *
   * Sie stand vorher als Wiederholung der H1 da — „Finde heraus, was dein Lebenslauf einem
   * Recruiter noch nicht erzählt" unter einer Überschrift, die fast dasselbe sagte. Zwei
   * Zeilen für eine Aussage sind eine verschenkte.
   *
   * Jetzt trägt sie das ARGUMENT: Die Überschrift sagt, was er bekommt; diese Zeile sagt,
   * warum er es braucht. Und sie nimmt den Satz auf, der im Video eingebrannt steht („Willst
   * du einen besser bezahlten Job?") — der Besucher hört ihn zwei Sekunden später aus Davids
   * Mund. Anzeige, Überschrift, Zeile und Video ziehen damit an einem Faden.
   */
  sub: "Wenn du einen besser bezahlten Job willst, musst du mehr erzählen, als du denkst.",

  /* ── Die Video-Karte ────────────────────────────────────────────────────── */
  /**
   * DIE ERSTE FRAGE — ZWEI KNÖPFE UNTER DER KARTE (Owner 07.09.2026: „David fragt dich:
   * Willst du dich beruflich verändern — oder mehr verdienen?").
   *
   * WARUM HIER UND NICHT IM TRICHTER: Ein Schritt VOR dem Lebenslauf wurde am 31.08.2026
   * gemessen entfernt (19–27 Besucher aus der Werbung, keine einzige Absendung). Auf der
   * Landingpage steht die Frage am Anfang, ohne einen Schritt vor die erste Leistung zu
   * setzen — die Antwort reist als `?ziel=` mit und landet in Davids Auftrag.
   *
   * KLICKEN STATT TIPPEN (Hausregel [[chat-no-personal-questions-buttons-only]]).
   */
  zielFrage: "Was willst du eigentlich?",
  zielVeraendern: "Mich beruflich verändern",
  zielVerdienen: "Mehr verdienen",
  kartenTitel: "Das Vorgespräch",
  cta: "Jetzt kostenlos starten",
  /* Die Zeile UNTER der Karte — beim Kuss steht dort der Preis, hier die Vertrauens-
     zeile des Owners: „Individuell · Vertraulich · ca. 5 Minuten". */
  trust: "Individuell · Vertraulich · ca. 5 Minuten",

  /* ── Was direkt unter der Karte steht ───────────────────────────────────── */
  hero1: "David analysiert deinen Lebenslauf zusammen mit genau der Stelle, auf die du dich bewerben möchtest.",
  hero2: "Danach führt er mit dir ein persönliches Vorgespräch. Er stellt dir aktiv die Fragen, die bei deiner Bewerbung noch offen sind – und fragt nach, wenn eine Antwort nicht ausreicht.",
  hero3: "Keine Standardanalyse. Keine Standardfragen. Deine Bewerbung. Deine Stelle. Dein Gespräch.",
  unterVideo1: "Deine Bewerbung wird nicht allgemein bewertet.",
  unterVideo2: "David betrachtet sie immer im Zusammenhang mit deiner konkreten Wunschstelle.",

  /* ── Die Feature-Karte (Creme, nummeriert) ──────────────────────────────
     Dauerregel `produktaufbau-video-card-feature-card`: Video-Karte oben, Feature-Karte
     darunter. Die vier Kacheln sind der Ablauf, den der Owner beschrieben hat —
     Lebenslauf, Stelle, Gespräch, Ergebnis —, nichts darüber hinaus. */
  merkmaleTitel: "So läuft dein Gespräch",
  m1t: "Dein Lebenslauf",
  m1d: "Du lädst ihn hoch. David liest ihn und sagt dir, was er darin sieht.",
  m2t: "Deine Stelle",
  m2d: "Anzeige einfügen — Link oder Text. David vergleicht sie mit deinem Werdegang.",
  m3t: "Das Gespräch",
  m3d: "Er fragt nur, was noch offen ist. Bleibt eine Antwort zu allgemein, hakt er nach.",
  m4t: "Dein Ergebnis",
  m4d: "Was für dich spricht, was Fragen aufwirft und was dein Lebenslauf noch nicht erzählt.",

  /* ── DIE VORFÜHRUNG — ALLGEMEIN BEIM BERUF, ENG BEI DER LAGE ─────────────
     Zwei Owner-Vorgaben, die scheinbar gegeneinander stehen und sich hier auflösen:

     „Ich kann mir als Arzt nicht vorstellen, dass du dich auch für mich auskennst. Es muss
     allgemein formuliert sein." — und aus dem Marketing-Durchgang: nicht für alle schreiben,
     sondern so, dass der Richtige denkt „das ist exakt für mich".

     DIE AUFLÖSUNG: **Allgemein beim Beruf, eng bei der Lage.** Kein Beruf wird genannt —
     sobald „Grafikerin" dasteht, sortiert sich der Arzt aus. Aber die SITUATION ist so eng,
     dass sie sticht. Ein Arzt, eine Postdoc und eine Juristin erkennen sich in derselben
     Zeile, weil sie im selben Zustand sind, nicht weil sie denselben Beruf haben.

     WARUM ANNA UND NICHT MEHR PETER (07.09.2026): Peter war 52 und seit dreizehn Monaten
     arbeitslos. Der Satz, der die Entscheidung gebracht hat: **Peter hätte sich unser
     Produkt nie leisten können.** Wer ein Jahr nichts verdient, zahlt keine 199. Die
     Vorführung zeigte einen Menschen, der nie Kunde wird. Anna hat einen Job, Geld und einen
     Wunsch — sie ist die Zielperson, die auch die Anzeige holen soll.

     DER SCHMERZ IST EIN ANDERER: nicht „ich finde nichts", sondern „ich verschenke gerade
     etwas, und ich weiss nicht einmal wie viel". */
  /* KEIN ALTER MEHR (Owner 07.09.2026, mit eigenen Zahlen): „Leute ab 50 sind noch mehr an
     dem Thema interessiert. Die zahlen für etwas, das sie verstehen. Auch ab 65. Sie wollen
     immer noch was ändern. Sie haben Geld." — und aus seinen Trichtern: über die Hälfte der
     Nutzer ist über 60.

     MEIN FEHLER, DEN DAS HIER KORRIGIERT: Ich hatte Peter (52, lange arbeitssuchend) gegen
     Anna (41, angestellt) getauscht mit der Begründung, Peter könne sich das Produkt nicht
     leisten. Das war keine Beobachtung, sondern die Voreinstellung der Gesellschaft — alt
     gleich kein Geld. Falsch war nicht Peters Alter, sondern seine LAGE: Wer dreizehn Monate
     erfolglos sucht, steht unter Geldstress, mit dreissig wie mit sechzig.

     Also: Lage eng, Beruf offen, Alter GAR NICHT. Jede Zahl sortiert jemanden aus. */
  /* ── DIE VORFÜHRUNG: EINE EINZIGE KARTE (Owner 07.09.2026: „in einer Karte bitte alles")
     
     Reihenfolge in der Karte = Lesefolge = Wichtigkeit:
       1. Was es gekostet hat  (der Haken — ein Satz mit einem Menschen darin)
       2. Wie viel es weiter kostet  (macht aus Bedauern Handeln)
       3. Wer sie ist  (Beleg, kleiner als die Aussage, die er belegt)
       4. Was sie richtig gemacht hat  (damit Punkt 5 überhaupt ankommt)
       5. Was falsch war  (nummeriert: hier ist die Reihenfolge)
       6. Die Beratung im Detail  (zugeklappt — dort stehen die Werkzeuge)
     
     KEIN ALTER, KEIN BERUF: beides sortiert Leser aus. Lage eng, Beruf offen, Alter gar
     nicht ([[zielgruppe-ueber-60]]).
     
     ALLES IN DER DU-FORM, weil es Davids Antwort AN SIE ist — nur der Rahmen spricht über
     sie. Damit liest der Besucher automatisch mit, als wäre es an ihn gerichtet.
     
     GRENZE: Anna ist erfunden, und das steht als Band am Bild. Ein Beispiel darf ein
     Beispiel sein; als Kundin ausgegeben werden darf es nie. Bei einem ECHTEN Menschen wird
     die Zahl nie geschätzt — sie kommt aus seinen Angaben oder sie kommt nicht. */
  /* ZWEI BEISPIELE ZUM DURCHWISCHEN (Owner 07.09.2026: „du machst mir Slides bei Anna, wir
     werden hier einige Beispiele sehen").
     
     EIN Beispiel trifft immer nur eine Lage. Wer arbeitslos ist, erkennt sich in der
     Angestellten nicht — und umgekehrt. Zwei Fälle nebeneinander fangen beide Enden von
     Owners Zielgruppe ab: den, der raus ist, und die, die drinsteckt und nicht weiterkommt.
     
     IHRE ANGABEN SIND RAUS (Owner: „Details, die keiner interessiert, was sie gemacht hat —
     unten steht doch die Analyse, was die Leute interessiert"). Elf Jahre im selben Feld,
     ein Team geführt: Das sagt über den Leser nichts. Geblieben ist der Name unter dem Bild;
     alles andere ist die Analyse. */

  /* ── Beispiel 1: raus aus dem Beruf ─────────────────────────────────────── */
  /* KEIN BILDPFAD IN DIESEM OBJEKT (07.09.2026, im Test gefunden). Alles hier läuft durch
     `textbausteineInSprache` — und die Maschine hat brav übersetzt: aus
     „/Lebenslauf/anna-portrait.jpg" wurde auf Englisch „/resume/anna-portrait.jpg", also
     ein kaputtes Bild in jeder Sprache ausser Deutsch. Pfade, Dateinamen und Kennungen
     gehören NIE in ein Text-Objekt; sie stehen jetzt in der Komponente. */
  bw1Name: "Anna",
  bw1Vor: "12 Monate ohne Job:",
  bw1Zahl: "34.000 €",
  bw1Nach: "entgangenes Einkommen.",
  bw1Satz: "Zwölf Monate ohne Gehalt, gerechnet mit dem, was sie zuletzt verdient hat.",
  bw1Jetzt: "Jeder weitere Monat: rund 2.800 €.",
  bw1Richtig1: "Lebenslauf gemacht",
  bw1Richtig2: "Stellen gesucht",
  bw1Richtig3: "200 Bewerbungen geschrieben",
  bw1Falsch1: "Dein Lebenslauf zeigt deine Stelle, nicht was du kannst.",
  bw1Falsch2: "Du suchst seit einem Jahr auf immer dieselbe Art.",
  bw1Falsch3: "Du weisst nicht, was deine Erfahrung woanders wert ist.",

  /* ── Beispiel 2: drin und festgefahren ──────────────────────────────────── */
  /* BRAUCHT NOCH EIN EIGENES BILD. Solange steht hier Annas Porträt — dass zweimal
     dasselbe Gesicht erscheint, fällt sofort auf und ist genau deshalb als Merkposten
     brauchbar. Kein fremdes Gesicht aus einer Bilddatenbank. */
  bw2Name: "Anna",
  bw2Vor: "24 Monate zögern:",
  bw2Zahl: "26.000 €",
  bw2Nach: "entgangenes Einkommen.",
  bw2Satz: "Sie hat einen Job und hält ihn nicht mehr aus — der Unterschied zu dem, was für ihre Erfahrung gezahlt wird.",
  bw2Jetzt: "Jeder weitere Monat: rund 1.100 €.",
  bw2Richtig1: "Weiss, dass sie weg will",
  bw2Richtig2: "Hat sich umgesehen",
  bw2Richtig3: "Zwei Gespräche geführt",
  bw2Falsch1: "Du suchst nur, was auf deiner Visitenkarte steht.",
  bw2Falsch2: "Deine Unterlagen sind auf dem Stand von damals.",
  bw2Falsch3: "Du weisst nicht, was deine Erfahrung woanders wert ist.",

  bwPersonMarke: "Beispiel",
  /* EINE ZEILE JE PUNKT, NICHTS KLEIN GESCHRIEBENES (Owner 07.09.2026: „ich will nicht
     klein Geschriebenes"). Vorher stand über jeder Erklärung noch ein fettes Stichwort und
     darunter der Satz in kleinerer Schrift — das Stichwort fasste bloss zusammen, was die
     Zeile darunter ohnehin sagt. Wenn niemand das Kleine liest, ist die Zusammenfassung
     überflüssig und die Erklärung unlesbar. Also: EIN Satz je Punkt, in voller Grösse. */
  bwRichtigLabel: "Das hast du richtig gemacht",
  /* KEINE ÜBERSCHRIFT ÜBER DEN FEHLERN (Owner 07.09.2026: „Das war falsch nicht schreiben").
     Ein rotes Ausrufezeichen sagt es ohne Wort — und eine Überschrift „Das war falsch" liest
     sich wie ein Urteil über den Menschen statt wie ein Befund über seine Bewerbung. */

  bwDetailAuf: "Beratung im Detail ansehen",
  bwDetailZu: "Beratung zuklappen",
  bwDetailTitel: "Was David ihr geraten hat",
  bwDetail1: "Hör auf, nach denselben Stellentiteln zu suchen. Damit findest du nur, was du schon hast.",
  bwDetail2: "Schreib auf, was du kannst — nicht, was auf deiner Visitenkarte steht. Das sind zwei verschiedene Listen.",
  bwDetail3: "Frag drei Menschen ausserhalb deiner Branche, was deine Erfahrung dort wert wäre.",
  bwDetail4: "Bewirb dich einmal auf etwas, das dir zu gross erscheint. Nur um zu sehen, was passiert.",

  bwWerkzeugeTitel: "Und die Werkzeuge dazu",
  bwWerkzeug1: "Anschreiben und Lebenslauf, auf jede Stelle zugeschnitten — als fertiges PDF.",
  bwWerkzeug2: "Zehn Bewerbungen statt einer. Jede eigens angepasst.",
  bwWerkzeug3: "Eine Video-Bewerbung, mit Sprechtext, den David schreibt.",

  /* „TYPISCH" IST EINE TATSACHENBEHAUPTUNG (Owner 07.09.2026): Ohne Daten dürfen wir nicht
     behaupten, Annas Fall sei typisch — genau die Sorte unbelegter Aussage, gegen die dieses
     Produkt antritt. Übrig bleibt, was stimmt und reicht. */
  bwHinweis: "Anna ist ein erfundenes Beispiel.",

  /* ── Abschnitt 1 ────────────────────────────────────────────────────────── */
  s1t: "Ein Lebenslauf zeigt Fakten. Aber nicht die ganze Geschichte.",
  s1p1: "Ein Personaler sieht deine bisherigen Arbeitgeber, Projekte, Ausbildung und Fähigkeiten.",
  s1p2: "Was er daraus häufig nicht erkennen kann:",
  s1l1: "Warum du genau diese Stelle möchtest.",
  s1l2: "Welche deiner Erfahrungen wirklich auf die neue Position übertragbar sind.",
  s1l3: "Wie du fehlende Branchenerfahrung erklären kannst.",
  s1l4: "Welche Verantwortung du tatsächlich übernommen hast.",
  s1l5: "Oder warum du heute einen beruflichen Wechsel suchst.",
  s1p3: "Und genau diese Fragen können darüber entscheiden, ob deine Bewerbung interessant genug für ein erstes Gespräch wirkt.",
  s1p4: "David versucht deshalb nicht nur zu lesen, was in deinem Lebenslauf steht. Er findet heraus, was noch fehlt, um deine Bewerbung richtig zu verstehen.",

  /* ── Abschnitt 2 ────────────────────────────────────────────────────────── */
  s2t: "Kein weiterer CV-Checker.",
  s2p1: "Viele Tools vergleichen deinen Lebenslauf mit einer Stellenanzeige und geben dir anschließend einen Punktzahl.",
  score1: "73 % Match.",
  score2: "82 % Match.",
  score3: "Ein paar fehlende Keywords.",
  s2p2: "Das kann hilfreich sein. Aber es beantwortet nicht die entscheidende Frage:",
  s2frage: "Was würde ein Personaler bei deiner Bewerbung noch wissen wollen?",
  s2p3: "Genau hier beginnt David.",
  s2p4: "David analysiert deinen Lebenslauf und die Stellenanzeige gemeinsam. Und danach spricht er mit dir.",
  s2p5: "Er stellt dir keine vorbereitete Liste mit Standardfragen, sondern entscheidet anhand deiner Bewerbung, welche Informationen noch fehlen.",

  /* ── Abschnitt 3 ────────────────────────────────────────────────────────── */
  s3t: "David liest nicht nur. Er fragt dich.",
  s3p1: "Angenommen, in der Stellenanzeige wird Erfahrung im Stakeholder Management verlangt.",
  s3p2: "Wenn diese Erfahrung bereits in deinem Lebenslauf steht, fragt David nicht:",
  s3schlecht: "„Hast du Erfahrung mit Stakeholder Management?“",
  s3schlechtLabel: "Das wäre sinnlos.",
  s3p3: "Stattdessen könnte er fragen:",
  s3gut1: "„Welche konkrete Situation zeigt am besten, wie du mit unterschiedlichen Interessen oder Widerständen eines Stakeholders umgegangen bist?“",
  s3p4: "Oder dein Lebenslauf zeigt viele Jahre Projekterfahrung, während die neue Position langfristige Produktverantwortung verlangt. Dann könnte David fragen:",
  s3gut2: "„Was reizt dich daran, künftig längerfristig Verantwortung für ein Produkt zu übernehmen?“",
  s3p5: "Und wenn deine Antwort zu allgemein bleibt, kann David nachfragen.",
  s3schluss: "Genau deshalb ist es ein Gespräch und kein Formular.",

  /* ── Abschnitt 4 ────────────────────────────────────────────────────────── */
  s4t: "Dein Beruf bestimmt die Fragen.",
  s4p1: "David verwendet nicht für jeden Bewerber dieselbe Analyse.",
  s4p2: "Ein Designer wird mit anderen Fragen konfrontiert als eine Führungskraft. Bei einer Vertriebsposition zählen andere Erfahrungen als in der Pflege, im Handwerk oder in der IT. Bei einem Berufseinsteiger sind andere Dinge wichtig als bei einem erfahrenen Manager.",
  s4p3: "David richtet das Gespräch deshalb nach drei Dingen aus: deiner bisherigen Erfahrung, deinem beruflichen Umfeld und genau der Stelle, auf die du dich bewirbst.",
  s4p4: "Das bedeutet nicht, dass David bereits alles über jeden Beruf weiß. Er lernt die Anforderungen aus deiner Stellenanzeige und verbindet sie mit den Informationen aus deinem Lebenslauf und deinen Antworten.",

  /* ── Abschluss ──────────────────────────────────────────────────────────── */
  schlussT: "Dein Gespräch beginnt mit deinem Lebenslauf.",
  schlussP: "Lebenslauf hochladen, Stelle einfügen, Fragen beantworten. In etwa fünf Minuten.",
};

export type DavidTexte = typeof DAVID_TEXTE;

/**
 * DIE KACHEL IM THEMEN-KATALOG — DEUTSCHE QUELLE, WIE DIE GANZE SEITE (Owner 28.08.2026,
 * mit Bildschirmfoto der Startseite: „bevor du anfängst, weil ich hier sehe, dass du auf
 * englisch gemacht hast").
 *
 * WARUM SIE NICHT IM KACHEL-BLOCK VON app/themes/page.tsx STEHT: Alle anderen Kacheln sind
 * englisch geschrieben und laufen durch `trObject` (englische Quelle → Zielsprache). Für
 * David ist das die falsche Richtung — sein Text ist deutsch verfasst, das Video spricht
 * deutsch, die Anzeigen laufen deutsch. Über den englischen Umweg stand auf einer deutschen
 * Startseite eine englische Zeile, sobald die Übersetzung nicht durchlief (und sie läuft
 * nicht durch, solange kein OpenAI-Guthaben da ist).
 *
 * SO HERUM IST DER SCHLIMMSTE FALL RICHTIG: Ohne Übersetzung steht Deutsch da — die Sprache
 * der Zielgruppe — statt Englisch.
 */
export const DAVID_KACHEL = {
  /**
   * DIE KACHEL VERSPRICHT DIE FRAGE, NICHT DIE ANALYSE (Owner 07.09.2026, Muster „C — der
   * Wunsch" aus dem Werbeplan).
   *
   * Hier stand: „Finde heraus, was dein Lebenslauf einem Personaler noch nicht erzählt.
   * David liest ihn zusammen mit deiner Wunschstelle — und fragt dann nach." Das war die
   * alte Linie — sie versprach eine LEBENSLAUF-ANALYSE, und genau die ist verworfen:
   * „Lebenslauf kann ChatGPT auch." Verkauft wird die Frage ([[david-wir-verkaufen-fragen]]).
   *
   * DIE KACHEL SAGT JETZT DASSELBE WIE DER ERSTE SCHRITT DAHINTER. Wer klickt, bekommt zwei
   * Sekunden später genau diese zwei Knöpfe — „beruflich verändern" / „mehr verdienen".
   * Versprechen und erster Schritt sind dieselbe Sache, nicht zwei Anläufe.
   *
   * DIE LÄNGE IST GEMESSEN, NICHT GESCHÄTZT (07.09.2026, an der laufenden Startseite):
   * Textspalte 255 px, Zeilenhöhe 18,6 px, Deckel `line-clamp-3` in components/CI.tsx.
   * Diese Fassung braucht 104 Zeichen = 3 Zeilen, die rumänische Übersetzung 102 = 3 Zeilen.
   * ÜBER RUND 105 ZEICHEN KIPPT SIE IN DIE VIERTE UND WIRD ABGESCHNITTEN — dann steht auf
   * der Startseite ein halber Satz. Wer hier etwas hinzufügt, misst nach.
   *
   * Deshalb steht „was du willst und kannst" statt „was du willst und was du kannst": Die
   * Wiederholung kostete eine ganze Zeile und trug nichts.
   */
  zeile: "Willst du dich beruflich verändern — oder mehr verdienen? David findet heraus, was du willst und kannst.",
  /* Ohne das Herz — das setzt die Kachel selbst davor. */
  chips: "Kostenlos · Individuell · ca. 5 Minuten",
};

/** Die Kacheltexte in der Sprache des Besuchers — Deutsch ist die Quelle. */
export async function davidKachelInSprache(lang: Lang): Promise<typeof DAVID_KACHEL> {
  return textbausteineInSprache(DAVID_KACHEL, lang);
}

/** Die Landingpage-Texte in der Sprache des Besuchers — Deutsch ist die Quelle. */
export async function davidTexteInSprache(lang: Lang): Promise<DavidTexte> {
  return textbausteineInSprache(DAVID_TEXTE, lang);
}
