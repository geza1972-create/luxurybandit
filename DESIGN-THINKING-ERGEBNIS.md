# Das eine Versprechen — Ergebnis des Design-Thinking-Prozesses

*Stand nach drei adversarischen Prüfungen. Was hier steht, hat alle drei überlebt. Was widerlegt wurde, ist raus — auch wenn es schön war.*

---

## 1. Was wir gelernt haben

### Erkenntnis 1 — Das Problem ist nicht Inspirationsmangel. Es ist Entscheidungsangst mit Datum.

Die Person, die zahlt, hat kein Ideenproblem. Sie hat neun Abende gescrollt, drei Kleider bestellt, zwei zurückgeschickt und ist immer noch nicht fertig. Jede zusätzliche Option macht ihren Zustand **schlechter**, nicht besser. Sie will kein Werkzeug, das mehr Möglichkeiten erzeugt — davon gibt es genug und sie sind gratis. Sie will, dass es **aufhört**.

Das dreht die übliche Produktlogik um: Der Wert liegt nicht in der Menge, der Personalisierung oder der Bildqualität. Er liegt in **Reduktion auf eins** — und darin, dass jemand diese Eins verantwortet.

### Erkenntnis 2 (unbequem) — Das Verkaufbare ist nicht das Bild. Und genau das Verkaufbare ist nicht gebaut.

Das KI-Bild von ihr im Outfit ist der emotionale Höhepunkt des Entwurfs — und es ist exakt die Leistung, die ChatGPT gratis erbringt und nächstes Jahr besser erbringt. Ein Geschäft darauf zu stellen heißt, gegen null zu konkurrieren.

Bezahlbar ist der Teil danach: **Gibt es das in Größe 40? Was kostet es heute? Ist es am 11. da?** Genau dieser Teil existiert im Repo nicht. `app/api/look-dupes/route.ts` liefert Bildähnlichkeits-Treffer über Google Lens — oft ohne Preis (der eigene Codekommentar sagt es: die Preisanforderung wurde entfernt, weil sie *„MOST Google Lens visual matches"* aussortierte), immer ohne Variantenbestand, ohne Lieferdatum. Der behauptete Burggraben ist heute eine Handarbeit von 10–20 Minuten pro Auftrag im Browser.

Zweite Korrektur derselben Art: Das Asset „KI-Persona-Chat mit Gesprächsverlauf pro Nutzer" ist zustandslos. `app/api/model-chat/route.ts:144` nimmt den Verlauf aus dem Request-Body. Es gibt kein Profil, keine Extraktion, keine Persistenz. Wer gegen ChatGPT mit „es erinnert sich an dich" antritt, greift den Marktführer in einer Disziplin an, die er noch nicht begonnen hat.

**Konsequenz:** Erinnerung und Bildqualität dürfen nie das Verkaufsargument sein. Verkaufsargument ist, was ein Mensch damit **tut** und wofür er **geradesteht**.

### Erkenntnis 3 (unbequem, betrifft nicht die Nutzer, sondern die Ausgangslage) — Die Randbedingungen sind überbestimmt.

*Kein Budget* + *kein Publikum* + *keine Kaltakquise* lässt genau zwei Kanäle übrig: Suche (wirkt ab Monat 12) und organisches Social (braucht eine Persönlichkeitsmaschine und ein Jahr). Beides ist Zeit, die er nicht hat.

Eine der drei Bedingungen muss fallen. Sie sollte bei der Kaltakquise fallen, denn **fünfzehn Telefonate sind eine kleinere Zumutung als dreihundert Tage tägliches öffentliches Schreiben.** Das ist die eigentliche Entscheidung dieses Prozesses — sie ist keine Produktentscheidung.

---

## 2. Die Entscheidung: **ANLASS** (Standpunkt 1)

Alle drei Kritiklinsen — ChatGPT-Vergleich, Vertrieb ohne Budget, Zahlungsbereitschaft/Haftung — kommen unabhängig auf denselben Sieger. Das passiert selten und ist das stärkste Signal im ganzen Prozess.

**Der tragende Grund ist nur einer:** Haftung ist der einzige Differenzierer in allen drei Entwürfen, dessen Wert **mit** der Verbreitung von KI **steigt**. Wenn jede Frau sich gratis in vierzig Outfits sehen kann, wird „jemand entscheidet und trägt die Rückbuchung" teurer, nicht billiger. Alles andere ist ein Feature auf der Roadmap eines Gegners.

### Warum POV 2 („Halb sieben") ausscheidet

- **Der Differenzierer ist ein fremdes Roadmap-Ticket.** Geplante Aufgaben + Memory + Push sind bei OpenAI in Teilen ausgeliefert. Und der Nutzer kann sich das Produkt selbst prompten. Für 7 €/Monat verkauft er einen Cron-Job mit Persönlichkeit — an die Kohorte mit der höchsten ChatGPT-Plus-Dichte in Deutschland.
- **„Nora" ist ein Zeuge, der keiner ist.** Der ganze Mechanismus lebt von Rechenschaft. Rechenschaft gegenüber einer Fiktion ist Selbstgespräch mit Zustellzeitpunkt. Und wenn stattdessen Gerry selbst schreibt, skaliert nichts.
- **Die Arithmetik kommt nie bei einem Einkommen an.** 100 Zahler × 7 € = 700 €. Bei realistischen 3 % Umwandlung und 10 % Abwanderung braucht er ~3.300 Anmeldungen für diese 700 € und dauerhaft ~125 neue pro Monat nur zum Stillstand. Für 3.000 € sind es 5.000–6.000 Anmeldungen — zwei bis vier Jahre täglichen Schreibens.
- **Der Kanal verlangt genau das, was 2,5 Jahre lang nicht passiert ist.** 300 Tage öffentlich über die eigene Lage schreiben, unbelohnt, aus einem Konto mit 7 Kontakten. Das ist kein Charakterurteil, das ist Wahrscheinlichkeitsrechnung.
- **Und es ist das ethisch gefährlichste Konzept.** Eine Mechanik, die Menschen beim Vornamen mit gebrochenen Zusagen konfrontiert, zugeschnitten auf isolierte Selbstständige, die „nicht anfangen" — das ist funktional Scham. Das einzige Signal des Systems ist Nicht-Antwort, und Nicht-Antwort ist gleichzeitig das Churn-Signal und das Depressionssignal. Das Produkt kann den Unterschied strukturell nicht sehen.

### Warum POV 3 („Bună") ausscheidet

- **Der Beweis ist im falschen Markt gültig.** Die Begründung „warum nicht ChatGPT" lautet dort wörtlich: *weil sie ChatGPT nicht hat*. In Deutschland ist dieser Satz falsch. Der Beweis beweist also etwas über ein Milieu, das nicht zahlt, und genau die Variable, die den Transfer wertvoll machen würde, wird im Test konstant gehalten.
- **Negative Stückkosten per Design.** ~15 neue Looks pro Woche, sobald der Stilfilter greift, plus 360 MB Video-Egress pro Nutzerin und Monat — in einem Supabase-Konto, das bereits über dem Pro-Limit lag. 20–60 €/Monat Produktion gegen 6 €/Monat Umsatz.
- **Der einzige Erlöspfad ist die alte Falle.** „Ioana antwortet dir, 9,90 Lei" verkauft das bezahlte Gespräch mit einer realen, benannten Frau, ausgeführt von einem Modell — formal dieselbe Figur, für die Meta ihn schon einmal gesperrt hat.
- **Der Kanal hängt an einem vorbelasteten Meta-Konto**, und identische Links über viele Gruppen sind exakt das Muster, das Meta als Spam verfolgt.
- **Die eigene Abbruchschwelle feuert garantiert.** 40 % Öffnungsrate auf Web-Push bei Nachricht 7 ist Duolingo-Niveau mit App-Installation; branchenüblich sind 2–8 %. Ein Kanalproblem als Produktbeweis zu verkleiden ist die teuerste Art, eine gute Idee zu erschießen.

### Was wir aus den Verlierern mitnehmen

| Aus POV 3 | **Die Gruppenmechanik** — dort, wo die Frage „was ziehe ich an" täglich echt gestellt wird. Sie stand im falschen Entwurf. Und die Disziplin, den Kanal **vor** dem Produkt zu testen. |
|---|---|
| Aus POV 2 | **Artefakt statt Zufriedenheit** als Erfolgsmaß. Und: strukturierte **Personenakte** statt Transkript. |

---

## 3. Der eine Satz

> ### „Sag mir den Anlass. Du bekommst eine Entscheidung — geprüft, in deiner Größe, rechtzeitig da."

Untertitel, kleiner: *Ein Outfit. Nicht zwanzig. Ich bin Gerry, 25 Jahre Gestaltung, und ich stehe dafür gerade.*

**Alternative A (Haftung nach vorn):**
> „Ich entscheide, was du am 14. anziehst — und wenn es nicht passt, hast du mich."

**Alternative B (Gegen-Positionierung, härter):**
> „Keine 40 Vorschläge. Ein Outfit, in zehn Minuten bestellt, vor dem Termin da."

Was sich gegenüber dem Entwurf geändert hat und warum: Der ursprüngliche Satz („Du bekommst ein Bild von dir") verkaufte das Gratis-Gut. Jeder der drei Sätze oben verkauft jetzt die **Prüfung** und den **Absender**. Das Bild kommt vor — aber als Beiwerk, nicht als Versprechen.

---

## 4. Für wen genau

**Ja — und zwar nur, wenn alle fünf Merkmale zutreffen:**

1. Termin steht fest, **7 bis 21 Tage** entfernt. (Unter 7 kein Verkauf, über 21 keine Dringlichkeit.)
2. Der Anlass ist **sozial aufgeladen** — sie wird gesehen und bewertet: Hochzeit als Gast, Vorstellungsgespräch, Klassentreffen, erstes Date nach der Trennung, Beerdigung, Firmenjubiläum.
3. Sie hat **schon gesucht und nicht abgeschlossen.** Das ist das schärfste Qualifikationsmerkmal, nicht Alter oder Geschlecht.
4. Budget **150–400 €** für den Anlass ist vorhanden und sie kauft online.
5. Sie kennt den Rückgabe-Kreislauf: 2–4 Teile bestellen, eins behalten. Sie kann selbst ausrechnen, was das Produkt spart.

Demografisch fällt daraus meist: Frau, 30–50, deutschsprachig, berufstätig. Zweitsegment mit identischer Mechanik, aber **später**: Mann, 40–55, vor Bewerbungsgespräch oder erstem Date. Nicht parallel starten — ein Segment, bis es steht.

**Ausdrücklich NICHT:**

- Menschen **ohne Anlass**, die Alltagsgarderobe suchen. Das ist Outfittery-Gebiet, dort kostenlos, dort besser finanziert.
- Menschen mit **unter 3 Tagen Vorlauf** — die bekommen eine kostenlose ehrliche Absage samt Schrank-Tipp. Ein Verkauf wäre dort unehrlich.
- Menschen unter ~120 € Budget. Die Prüfung lohnt den Preis nicht, und die Enttäuschung ist vorprogrammiert.
- **Mode-Enthusiastinnen.** Wer beim Suchen Freude empfindet, kauft nie das Ende des Suchens.
- Abo-Suchende. Es gibt kein Abo und es wird keines geben.
- **Die rumänische Zielgruppe, die er heute hat.** Das ist der Bruch, und er muss ausgesprochen werden. 4.522 Seed-Follower, 137 Videos und die bestehenden Aufrufe sind für dieses Produkt null.

---

## 5. Das Produkt in seiner kleinsten sinnvollen Form

**Wichtig vorab:** Die kleinste sinnvolle Form braucht **keine Zeile neuen Produktcode**. Sie ist eine statische Seite + ein Formular + ein Stripe-Payment-Link + hundert Prozent Handarbeit im bestehenden Admin. Alles Folgende beschreibt, was die Kundin **erlebt**, nicht was automatisiert ist.

### Was sie erlebt

**Landing (0:00).** Ein Bild eines Outfits im Kontext. Der Satz aus Abschnitt 3. Darunter **Gerrys Gesicht mit Namen** — nicht als Charme, sondern als Haftungsanker; das ist der Teil, den ChatGPT nicht hat. Kein Menü, kein Login, keine Cookie-Wand mit Auswahl. Ein Feld: **„Was hast du vor?"** Sechs Chips + Freitext. Tippen = weiter.

**Datum (0:10).** Vorbelegt „in 10 Tagen". Direkte, ehrliche Rückmeldung — der erste Moment, in dem sie merkt, dass hier jemand haftet:

- ≥ 7 Tage: *„Reicht. Heute Abend hast du die Entscheidung und sechs Tage Puffer für die Lieferung."*
- 3–6 Tage: *„Knapp. Ich schlage nur Sachen vor, die in 48 Stunden bei dir sind."*
- ≤ 2 Tage: *„Zu spät für eine Bestellung. Ich sage dir kostenlos, was du aus deinem Schrank kombinierst — schick mir zwei Fotos."*

**Drei Fakten, ein Screen (0:20).** Größe (Kleid/Hose · Schuh, zwei Ziffernfelder — kein Maßband). Budget (Regler 80–400 €, vorbelegt 200). Und das wichtigste Feld des Produkts:
**„Was soll auf keinen Fall sein?"** Platzhalter: *„nichts Ärmelloses. nichts, was am Bauch anliegt."*

**Foto (0:45), optional.** *„Handyfoto reicht. Selfie ist okay. Kein Ganzkörper nötig."* Darunter gleichwertig: *„Ich will kein Foto hochladen"* → dann arbeitet die Vorschau mit einer Figur zu ihren Maßen, und sie erfährt das. Foto-Zwang kostet hier ~40 %, und die Prüfung braucht ihn nicht.

**Die Vorschau (1:00, ~40 s Wartezeit).** Sie sieht ein Outfit — auf sich, wenn sie ein Foto gegeben hat. Groß, ohne Wasserzeichen. Und darunter, ungeschminkt:

> Das war die Maschine. Sie kann ein Bild. Das kann ChatGPT auch, gratis.
> Was sie **nicht** kann: nachsehen, ob es das heute in Größe 40 gibt, was es kostet, ob es bis zum 11. bei dir ist — und danach dafür geradestehen.
> **Das mache ich. Heute Abend um 20 Uhr, mit Kauflinks. Ab 39 €.**
> Finde ich nichts, das ich selbst kaufen würde, bekommst du dein Geld zurück und eine Absage statt eines Vorschlags.

**Bezahlen (1:20).** E-Mail + Stripe-Popup (existiert). Kein Konto, kein Passwort — der Zugang ist später der Token-Link in der Mail. Im Checkout die **Widerrufs-Checkbox** (siehe Abschnitt 11); ohne sie ist das Produkt rechtlich verschenkt.

**Bestätigung (1:30).** *„Ich habe alles. Heute um 20:00 Uhr liegt es in deinem Postfach. Falls dir noch etwas einfällt — antworte einfach auf diese Mail."*
Diese letzte Zeile ist der billigste Interviewkanal, den es gibt.

> **Die acht Stunden Latenz sind ein Feature, kein Kompromiss.** Sofort = Maschine = gratis. Ein halber Tag = da hat jemand draufgesehen. In den ersten Monaten sieht auch tatsächlich jemand drauf.

### Was sie sich merkt (Personenakte, nicht Transkript)

**Pro Person, bleibt:**
1. **Die Negativregel im Originalwortlaut** — `„nichts Ärmelloses, ich mag meine Oberarme nicht"` plus abgeleitete Tags. Der Satz wird nie umformuliert; er wird zitiert.
2. Harte Fakten: Konfektions- und Schuhgröße samt Auffälligkeit („breiter Fuß"), Budgetrahmen, Ort, Postfach.
3. **Was bestätigt wurde** — gekauft **und getragen**. Getragen zählt, gekauft nicht.
4. **Was zurückging, mit einem Wort Grund.** Die wertvollste Zeile der Akte und die einzige, die kein Wettbewerber hat.
5. **Kommende Termine**, beiläufig erwähnt. Der eingebaute Wiederkauf.

**Pro Anlass, Archiv:** Typ, Datum, Rolle, Setting, Uhrzeitspanne · die drei Produkte mit Preisen · das Bild · die drei Begründungssätze · getragen ja/nein.

**Bewusst NICHT gespeichert:** Körpermaße, Gewicht, Alter. Und — Änderung gegenüber dem Entwurf — der „Angst-Satz" (*„mein Ex ist auch da"*) wird **nicht in die Akte extrahiert**. Er wird für den einen Auftrag gelesen und mit dem Auftrag archiviert, nicht zu einem dauerhaften Persönlichkeitsmerkmal verdichtet. Begründung in Abschnitt 11.

### Die drei Nachrichten

Kanal: E-Mail über `lib/email-send.ts`. Absender ein Mensch mit Namen und Rückantwortadresse. Bei 40 Aufträgen im Monat sind das ~160 Mails — der Zustellbarkeits-Killer, der POV 2 erledigt hat, existiert hier nicht.

---

**Tag 1 — 20:00 Uhr am Bestelltag: das Urteil**

> **Betreff: Dein Outfit für den 14. September. Entschieden.**
>
> Hallo Nina,
>
> Hochzeit am 14., du bist Gast, nachmittags Standesamt, abends Scheune. Größe 40, Schuh 39, bis 200 € — und deine Worte: *„nichts Ärmelloses, ich mag meine Oberarme nicht."*
>
> Das hier ist die Antwort. Ein Outfit. Nicht drei.
>
> **[BILD]**
>
> **Warum dieses:** Der halblange Ärmel erledigt das Oberarm-Thema, ohne nach Verstecken auszusehen — das ist der Unterschied zwischen einem Bolero und einem Kleid, das von vornherein Ärmel hat. Das Waldgrün funktioniert im Standesamt-Licht wie abends in der Scheune, du musst nichts wechseln. Nur die Schuhe, und das nimmt dir keiner übel.
>
> **Ich habe heute um 19:40 in jedem der drei Shops nachgesehen — Größe, Preis und Lieferdatum sind von Hand geprüft, nicht geschätzt:**
>
> 1. Kleid, Größe 40 — 89 € — noch 4 Stück — Lieferung bis 11.9. — **[kaufen]**
> 2. Schuhe, 39, Blockabsatz 5 cm (du stehst sechs Stunden darin, das ist der Grund) — 59 € — **[kaufen]**
> 3. Tasche — 35 € — **[kaufen]**
>
> **Zusammen 183 €.** Dein Rahmen waren 200.
>
> **Was du jetzt tust:** Bestell alle drei heute Abend. Nicht morgen — bei der Größe sind noch vier Stück da.
>
> Wenn etwas nicht passt: antworte mir bis zum 9.9., dann tausche ich **ein** Teil. Nicht das ganze Outfit — das wäre wieder eine neue Entscheidung, und du hast dieses Ding gekauft, damit du keine mehr treffen musst.
>
> Ich melde mich am 12. noch einmal. Bis dahin nichts von mir.
>
> — Gerry

---

**Tag 8 — zwei Tage vorher: die letzte Meile**

> **Betreff: Übermorgen. Drei Sachen, dann bist du fertig.**
>
> Hallo Nina,
>
> das Kleid ist seit Dienstag bei dir. Drei Dinge, dann ist das Thema erledigt:
>
> **1. Zieh es heute Abend komplett an. Mit Schuhen.** Nicht um zu prüfen, ob es gefällt — das ist entschieden. Sondern damit du Samstag früh nichts *Neues* denkst. Outfits scheitern nicht bei der Auswahl, sie scheitern um 8:40 Uhr am Tag selbst.
>
> **2. Schuhe eine Stunde in der Wohnung tragen.** Neue Blockabsätze drücken an der Ferse. Eine Stunde jetzt spart Stunde vier auf der Tanzfläche.
>
> **3. Tasche heute Abend packen.** Rein passt: Handy, Karte, Lippenstift, Taschentücher. Wenn du mehr brauchst — nicht die größere Tasche nehmen, sondern jemandem ins Auto geben.
>
> Und weil du es beim Ausfüllen geschrieben hast: dass du Angst hast, zu aufgetakelt zu sein. Bei einer Scheunen-Hochzeit im September bist du das mit diesem Kleid nicht — du liegst einen halben Schritt darunter, und das ist die richtige Seite.
>
> Falls du Samstag um 18 Uhr trotzdem unsicher wirst: **Ohrringe raus. Nicht das Kleid wechseln.** Das ist der Regler.
>
> Von mir hörst du jetzt nichts mehr. Viel Spaß am Samstag.
>
> — Gerry

*Diese Mail kostet fast nichts und ist der Grund, warum das Produkt weitererzählt wird. „Von mir hörst du jetzt nichts mehr" ist das Gegenteil jeder App und der Satz, der zitiert wird.*

---

**Tag 30 — drei Wochen danach: der Erinnerungsbeweis**

> **Betreff: Hat das Grüne gehalten?**
>
> Hallo Nina,
>
> zwei Sachen.
>
> **Erstens, zwei Klicks.** Hattest du die Schuhe wirklich sechs Stunden an?
> **[ Ja ] [ Nein, ab 22 Uhr barfuß ]**
> Hast du am Samstagmorgen noch etwas anderes anprobiert?
> **[ Nein ] [ Ja ]**
>
> Ich frage nicht aus Höflichkeit. Wenn du sie um zehn ausgezogen hast, war mein Absatz einen Zentimeter zu hoch — und das ändert, was ich dir beim nächsten Mal schicke.
>
> **Zweitens.** Du hattest im September beiläufig dazugeschrieben:
>
> > *„Im November habe ich ein Vorstellungsgespräch, das mir ehrlich gesagt wichtiger ist als die Hochzeit."*
>
> Falls das noch steht: anderer Anlass, andere Regeln, und man fängt damit nicht drei Tage vorher an.
>
> Was ich habe und was auch im November gilt: Größe 40, Schuh 39 breit, nichts Ärmelloses, nichts am Bauch anliegend, bis 200 €. Grün steht dir — das war keine Vermutung mehr, seit ich das Bild gesehen habe.
>
> Was **nicht** gilt: Bei einer Hochzeit darfst du auffallen. Bei einem Gespräch darf über dein Outfit hinterher **niemand reden**. Das ist eine andere Aufgabe, und deswegen ist es nicht dasselbe Kleid in schwarz.
>
> Wenn du willst, fange ich an. **Antworte mit dem Datum, mehr brauche ich nicht** — den Rest habe ich.
>
> — Gerry
>
> *P.S. Falls du ein Foto vom 14. hast: schick es mir. Nicht für Werbung — ich will sehen, ob ich richtig lag.*

Der Beweis der Erinnerung ist nicht, dass etwas erwähnt wird. Er ist, dass **nichts noch einmal abgefragt wird.**

---

## 6. Warum nicht ChatGPT — die ehrliche Antwort in drei Sätzen

1. ChatGPT macht das Bild und den Vorschlag gratis, und es macht beides nächstes Jahr besser als wir — dagegen zu argumentieren wäre gelogen.
2. Was es nicht kann: um 19:40 in drei Shops nachsehen, ob Größe 40 heute lieferbar ist und bis zum 11. ankommt, und danach eine Rückbuchung riskieren, wenn es falsch war.
3. Deshalb ist unser Produkt nicht Intelligenz, sondern **ein Name unter der Entscheidung** — und das ist der einzige Posten in diesem Markt, dessen Preis steigt, während KI billiger wird.

---

## 7. Wie die ersten 100 Kunden kommen

**Die entscheidende Umstellung gegenüber dem Entwurf: „1.000 Anmeldungen" ist die falsche Zielgröße.** Bei 79 € sind **40 Kunden im Monat = 3.160 €**. Vierzig Menschen findet man mit Gesprächen. Tausend findet man nur mit Geld oder einem Jahr.

### Was gestrichen wird

**Pinterest und SEO als Startplan.** Beides ist im Entwurf falsch bewertet:

- Die Behauptung *„KI-Bilder werden nicht abgestraft"* stimmt nicht mehr. Pinterest kennzeichnet generierte Inhalte, bietet „weniger KI-Pins" als Nutzersteuerung und stuft synthetische Massenware herunter. Der Kanal wurde auf genau das gebaut, was die Plattform bekämpft.
- Realistischer Verlauf bei 40 Pins/Woche: nach 12 Monaten 100k–500k Impressionen/Monat, 0,2–1 % Outbound-Klickrate → 500–5.000 Besuche/Monat, davon 0,3–1 % Kaltkonversion auf 79 € Vorkasse. Das sind 5–50 Kunden **im Monat 13**.
- „Hochzeitsgast Outfit" ist kein Longtail, sondern ein kommerzielles Head-Term mit Zalando, About You und Otto darauf. Neue Domain, null Backlinks, KI-gestützte Texte: 12–18 Monate bis irgendetwas rankt.

Beides läuft trotzdem **ab Tag 1 als Hintergrundwette** — 40 Pins/Woche kosten ihn nichts, weil die Bildpipeline steht. Bewertet wird das in Monat 12, nicht in Monat 2. Es ist kein Plan.

### Was der echte Startkanal ist: geborgtes Publikum

Der einzige zuverlässige Weg ohne Geld und ohne Reichweite ist, sich in die bestehende Verteilung eines anderen zu setzen.

**A — Fünfzehn Gespräche (Woche 2, namentlich vorher festgelegt).**
Hochzeitsplanerinnen · freie Trauredner:innen · Standesamt-Fotografen · Brautmoden-Läden (die haben die *Gäste* im Umfeld, nicht die Braut) · Bewerbungscoaches und Bewerbungsfoto-Fotografen · Friseur- und Kosmetikstudios.

Diese Menschen haben die Kundin **drei Wochen vor dem Anlass ohnehin vor sich sitzen**. Ein 79-€-Zusatzservice kostet sie nichts, macht ihr eigenes Angebot besser und bringt ihnen 20 % Empfehlungsprovision. Das ist kein Verkaufsgespräch, das ist ein Angebot.

**B — Deutsche Facebook-Gruppen (laufend, ab Woche 2).**
„Hochzeitsgäste", regionale Hochzeitsgruppen, „Bewerbung & Karriere", Trauer-Gruppen. Dort wird die Frage *„was ziehe ich an"* täglich echt gestellt. Antworten mit einem konkreten Vorschlag und einem generierten Bild ist **Hilfe, kein Vertrieb** — und gleichzeitig sein Interviewkanal. Regeln: eigenes Profil mit echtem Namen, kein Link im Beitrag, Link nur auf Nachfrage oder im Profil. Kein Linkspam über viele Gruppen — genau dieses Muster hat sein Konto schon einmal gekostet.

Das ist die beste Einzelidee aus POV 3, sie stand nur im falschen Entwurf.

**C — Die 137 Videos und 47 der 48 Modelle sind in dieser Rechnung null wert.** Nicht hineinzwingen. Was zählt, ist die **Bildpipeline als Bildfabrik**: die Fähigkeit, zu Grenzkosten 40 gute, spezifische Bilder pro Woche für Gruppenantworten, Landing-Beispiele und Pins herzustellen. Das ist der einzige echte Vertriebsvorteil, den die drei Monate hinterlassen haben.

### Die unbequeme Bedingung

**Wenn er die fünfzehn Gespräche nicht führen kann oder will, ist ANLASS nicht die Antwort.** Dann bleibt nur POV 3 — und dessen Ergebnis nach acht Wochen ist eine Zahl ohne Käufer, kein Einkommen. Die Wahl ist in Wahrheit keine Produktentscheidung. Sie ist die Entscheidung, ob er bereit ist, mit fünfzehn Fremden zu telefonieren.

---

## 8. Geld

### Gratis
- Die Vorschau: ein Bild, groß, ohne Wasserzeichen, herunterladbar. Bewusst großzügig — und bewusst als das etikettiert, was es ist: das, was die Maschine kann.
- Die Notfall-Auskunft bei ≤ 2 Tagen Vorlauf. Kostenlos, weil ein Verkauf dort unehrlich wäre — und weil dieser Fall die dankbarsten Weitererzählungen produziert.

### Bezahlt — die Stufen bringen nie *mehr Auswahl*, sondern *mehr Abdeckung derselben Entscheidung*

| | | |
|---|---|---|
| **DIE ENTSCHEIDUNG** | **39 €** | Ein Outfit, drei geprüfte Kauflinks (Größe verfügbar, Preis heute, Lieferdatum vor dem Termin), drei Sätze Begründung, eine Tauschrunde für ein Teil. |
| **DER GANZE TAG** | **79 €** *(vorausgewählt)* | Dazu: Schuhe, Tasche, Schmuck, ein Satz zu Haaren; die Zwei-Tage-vorher-Mail; ein Plan B, falls etwas nicht liefert. |
| **ICH SCHAU DRAUF** | **149 €** | Dazu: sie schickt zwei Tage vorher ein Foto im echten Outfit, Urteil binnen vier Stunden — passt / Saum kürzen / Gürtel weg. |

Garantie, prominent und wörtlich auf der Seite: *„Finde ich nichts, das ich selbst kaufen würde, bekommst du dein Geld zurück und eine Absage statt eines Vorschlags."* Ohne diesen Satz zahlt bei einer unbekannten Marke niemand 79 € vorab.

### Stückkosten — ehrlich gerechnet

- Bilderzeugung: `app/api/generate-openai-tryon/route.ts:103` steht auf `quality = "low"`. Für ein 79-€-Urteil braucht es `"high"` — grob Faktor 10, bei 4–6 Versuchen pro Auftrag **1–2 €** statt der im Entwurf behaupteten 0,20 €. Trivial gegen 79 €, aber es zeigt die Richtung des Optimismus.
- Lens/SerpApi-Recherche ~0,05 €, Mail ~0 €, Stripe ~3 %.
- **Der echte Kostenblock ist seine Zeit: 45–90 Minuten pro Auftrag**, nicht 20–30. Allein die Bestandsprüfung im Shop ist 10–20 Minuten Handarbeit, weil `look-dupes` sie nicht liefert.

Daraus: bei 79 € und ~60 Minuten sind es **55–65 €/Stunde brutto**, vor Steuer, vor Rückerstattungen, vor Support. 40 Aufträge/Monat = 3.160 € bei 40–60 Stunden. **Die Decke liegt bei etwa 5 Aufträgen am Tag** — dann ist er ausgelastet, bei ~2.500–4.000 €/Monat.

### Ab wann realistisch

| Erster zahlender Fremder | **Woche 3–6** |
|---|---|
| Regelmäßig > 1.000 €/Monat | Monat 4–7 |
| ~3.000 €/Monat | Monat 9–15 — und nur mit geborgtem Publikum |
| Über die Stundendecke hinaus | offen, hängt an Wiederkauf oder Teilautomatisierung der Prüfung |

**Was das ehrlich heißt:** Das ist ein **Dienstleistungsgeschäft mit Stundendecke**, kein skalierendes Produkt. Ein Unternehmen wird daraus nur, wenn eine von zwei Fragen mit Ja beantwortet wird: Kommen Kundinnen mit Anlass Nummer zwei zurück? Oder lässt sich die Bestandsprüfung so weit automatisieren, dass ein Auftrag 20 statt 60 Minuten kostet? Beide Fragen beantwortet Monat 6, nicht Woche 2.

Kein Abo (Anlässe sind selten; eine Kündigung nach Monat zwei kostet mehr Vertrauen als das Abo eingebracht hat). Affiliate-Provision liegt in der Infrastruktur, bringt 3–8 € pro Auftrag und ist damit Nachkommastelle — sie darf die Auswahl **nie** beeinflussen, und wenn, dann offen ausgewiesen. Die Unabhängigkeit ist hier das Produkt.

---

## 9. Was bleibt, was wegkommt

### Bleibt (real, spart Wochen)

| Baustein | Rolle |
|---|---|
| `app/api/generate-openai-tryon/route.ts` | Die Vorschau. Fertig — nur `OPENAI_IMAGE_QUALITY` auf `high`. |
| `app/api/look-dupes/route.ts` | **Recherche-Startpunkt, nicht Prüfung.** Liefert Kandidaten; Größe, Bestand und Lieferdatum kommen von Hand. Diese Grenze muss klar sein, sonst wird das Kernversprechen zur Behauptung. |
| `lib/email-send.ts` | Auslieferungskanal. Bei ~160 Mails/Monat unkritisch — Hostinger reicht hier. |
| Stripe (`lib/stripe.ts`, Checkout) | Drei neue Preisobjekte. Das achte Produkt in einem Konto mit 7 Produkten und 0 € Umsatz — Bauen war noch nie der Engpass. |
| Admin + Insights | **Die Kuratierungs-Werkbank.** Auftrag rein, Bild erzeugen, Links prüfen, Text schreiben, senden. Ein Tab, keine neue App. |
| `lib/wardrobe-taxonomy.ts`, `look-category`, `fashion-brands` | Vokabular für Anlass→Kleidung-Regeln. |
| Die Bildpipeline als **Bildfabrik** | 40 spezifische Bilder/Woche zu Grenzkosten für Gruppenantworten, Beispiele, Pins. |

### Kommt weg (oder liegt still)

137 Mode-Videos · 47 von 48 KI-Modellen als Personas · Feed und Karussell · Community/Boudoir · Modell-Chat und Persona-Chat · Premium-Abo und sechs der sieben Stripe-Produkte · der ganze Try-on-Funnel mit Kill-Switch und Reuse-Cache · FASHN-Lingerie · 360°-Turnaround · Instagram-Publishing · Meta-Pixel · mai-ieftin · /you-in-video · Bella-Landing.

**Zwei Dinge, die als Assets gelistet waren und nicht existieren:**
- Gedächtnis im Persona-Chat. `model-chat` ist ein zustandsloser Relay eines client-gelieferten Transkripts. Die Personenakte ist Neubau — klein, aber Neubau.
- Cron-Infrastruktur. `vercel.json` enthält keinen einzigen Cron-Job. Für ANLASS irrelevant (die Tag-8- und Tag-30-Mails kann er von Hand terminieren), für POV 2 und 3 wäre es Fundament gewesen.

**Abschreibung ehrlich:** ~60–70 % der Infrastruktur überlebt, fast nichts vom Produkt. Gemessen an dem, was in drei Monaten **gedanklich** gebaut wurde, ist es mehr — und das ist der Teil, den man aushalten muss. Der teuerste Fehler wäre, die Modelle und Videos „irgendwie mit hineinzunehmen", damit sich die drei Monate nicht umsonst anfühlen. Genau das macht das Produkt unscharf.

---

## 10. Der billigste Test der Kernhypothese

**Hypothese:** *Fremde zahlen vorab dafür, dass ein Mensch eine Kleidungsentscheidung trifft, prüft und dafür geradesteht.*

**Was gebaut wird: nichts.** Eine statische Seite (Gerrys Gesicht, das Versprechen, die Garantie, drei ausgeschriebene Beispiel-Urteile — als Beispiele gekennzeichnet), ein Formular (Tally/Typeform), ein Stripe-Payment-Link, die Widerrufs-Checkbox. Ein bis zwei Tage. Erfüllung zu 100 % von Hand: Bild aus dem bestehenden Admin, Shop-Recherche im Browser, Mail selbst geschrieben.

**Verteilung:** die fünfzehn Gespräche + ~20 Gruppenantworten pro Woche.

**Dauer: 21 Tage.**

**Die entscheidende Zahl: zehn Zahlungen von Fremden.**
Nicht zehn Interessenten. Nicht zehn Anmeldungen. Nicht zehn Bekannte. Zehn Menschen, die er vorher nicht kannte, die 39–79 € vorab überweisen.

**Zweite Zahl, die er im selben Zeitraum erhebt: gestoppte Minuten pro Auftrag.** Liegt der Schnitt über 90 Minuten, trägt die Preisstruktur nicht — dann ist der Einstiegspreis 79 € und nicht 39 €, oder das Geschäft funktioniert nicht.

**Abbruch:** Unter 4 Zahlungen in 21 Tagen ist die Haftungsthese widerlegt. Kein Nachbessern mit besseren Texten, kein zweiter Versuch mit anderem Bild. Dann ist die ehrliche Konsequenz: Anstellung suchen und dieses Projekt abends betreiben — es ist von den dreien das einzige, das man nebenbei betreiben kann.

**Die Zahl aus Monat 6, die über „Job oder Unternehmen" entscheidet:** Von den ersten 30 Käuferinnen buchen mindestens 5 einen zweiten Anlass. Wenn keine wiederkommt, ist es ein Einmalkaufgeschäft mit dauerhafter Reichweitepflicht — und das trägt sich ohne Werbebudget nicht.

---

## 11. Verantwortung: was bewusst gestaltet werden muss

**Widerrufsrecht.** Dienstleistung an Verbraucher, 14 Tage. Ohne ausdrückliche Zustimmung zum vorzeitigen Beginn *und* Kenntnisnahme des Erlöschens kann jede Kundin nach Erhalt des Urteils widerrufen und die Empfehlung behalten. Das ist eine Checkbox — aber ohne sie ist das Produkt rechtlich geschenkt. **Vor dem ersten Euro.**

**Der Angst-Satz.** Freitext wie *„mein Ex ist auch da"*, *„erstes Gespräch nach der Kündigung"*, *„seit der Elternzeit nichts Formelles"* produziert zuverlässig Art.-9-nahe Daten. Regeln: er wird für den einen Auftrag gelesen, **nicht** von einem Modell in ein dauerhaftes Persönlichkeitsprofil verdichtet, nie zitiert um zu verkaufen (kein Upsell über Angst), und mit dem Anlass archiviert. Die Extraktion in die Personenakte braucht eine harte Sperrliste für Gesundheit, Beziehung, Religion, Finanzlage — sonst entsteht nebenbei eine Akte, die niemand angelegt hat.

**Das Foto.** Upload an OpenAI ist Drittlandtransfer: AVV, Nennung in der Datenschutzerklärung, ausdrückliche Einwilligung an der Upload-Stelle, Löschung nach Auslieferung. Gesichtsbilder sind biometrienah — nie in Werbung, nie öffentlich, auch nicht „anonymisiert". Und der Ausstieg *„Ich will kein Foto hochladen"* bleibt gleichwertig sichtbar.

**Kennzeichnung der Grenze.** Auf der Seite muss stehen, was die Maschine macht (das Bild) und was Gerry macht (Entscheidung, Prüfung, Haftung). Der gesamte Wert hängt daran, dass diese Grenze stimmt. **Eine einzige vollautomatisch verschickte „Entscheidung" zerstört die These** — und zwar rückwirkend für alle bisherigen Kunden. Wenn die Prüfung später teilautomatisiert wird, wird das offen gesagt und der Preis sinkt.

**Körperbild.** Das Produkt zeigt einer Frau ein KI-Bild von sich selbst, in einem Moment, in dem sie verletzlich ist. Harte Regeln: keine Veränderung der Figur, keine Verschlankung, keine Hautglättung, keine Verjüngung. Das Bild zeigt sie, nicht eine bessere Version von ihr. Sonst verkauft er Unzufriedenheit — und sie merkt es spätestens Samstag früh im Spiegel, also genau in dem Moment, den das Produkt retten sollte.

**Abhängigkeit.** Der Vertrieb hängt an Plattformen, die ihn schon einmal ausgesperrt haben. Deshalb: ab dem ersten Kunden eine eigene E-Mail-Liste, Gruppenarbeit über ein sauberes Profil mit echtem Namen, kein Linkspam. Meta-Werberichtlinien sind hier weitgehend entschärft — es wird nicht geworben und es werden keine Körper verkauft. Die alte Sperre bleibt trotzdem am Konto.

**Was hier bewusst *nicht* nötig ist:** ein Krisenpfad. Bei POV 2 und POV 3 war das die Zielgruppendefinition; bei ANLASS ist es ein Randfall. Das ist kein Zufall, sondern ein Auswahlkriterium gewesen.

---

## 12. Die nächsten drei Schritte

**Schritt 1 — diese Woche, 1–2 Tage: Die Seite. Ohne Repo-Code.**
Eine Seite: Gerrys Gesicht und Name, der Satz aus Abschnitt 3, die Garantie im Wortlaut, drei ausgeschriebene Beispiel-Urteile, das Formular mit den sieben Feldern, ein Stripe-Payment-Link, die Widerrufs-Checkbox, eine Datenschutzerklärung. Fertig.

**Schritt 2 — nächste Woche: Die fünfzehn Namen und die fünfzehn Anrufe.**
Die Liste steht **vorher** namentlich fest: Hochzeitsplanerinnen, Trauredner, Brautmoden, Bewerbungscoaches, Fotografen, Kosmetik. Parallel 20 Gruppenantworten pro Woche — echte Hilfe, kein Link im Beitrag.
Das ist der Schritt, an dem alles hängt, und der einzige, der bisher ausgeschlossen war.

**Schritt 3 — Woche 3–5: Zehn Aufträge von Hand erfüllen.**
Minuten stoppen. Jede Antwortmail archivieren — das ist das Produktbriefing für die nächsten sechs Monate. Erst wenn die zehn Zahlungen da sind, entscheidet die Zahl, **ob** gebaut wird und **was**.

> **Bis dahin: keine Zeile Produktcode.** Der Admin reicht als Werkbank. Die letzten drei Monate haben gezeigt, dass Bauen nicht der Engpass ist — sieben laufende Stripe-Produkte und 0 € Umsatz sind der Beweis.

---

### Der ehrliche Ausblick in einem Absatz

Der erste zahlende Fremde ist in Woche 3–6 realistisch, wenn die Telefonate stattfinden. Spürbares Geld — über 1.000 € im Monat — frühestens ab Monat 4–7. Ein Vollzeit-Einkommen frühestens ab Monat 9–15, und dann als Dienstleistung mit einer Decke bei etwa 3.000–4.000 €. Ob daraus je ein Unternehmen wird, entscheidet eine einzige Frage in Monat 6: **Kommt jemand mit Anlass Nummer zwei zurück?** Wenn ja, gibt es einen Weg über die Stundendecke. Wenn nein, ist es eine gute Einzelfirma — und auch das wäre nach 2,5 Jahren das erste Reale.