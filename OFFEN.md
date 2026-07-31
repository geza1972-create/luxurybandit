# Offen — Stand 31.07.2026, Ende der Sitzung

Reihenfolge = Empfehlung. Alles darüber ist erledigt und auf `main`.

---

## 0 · Die Karte am Ende — teils erledigt, Rest offen

**Erledigt und geprueft:** Das Ergebnis steht jetzt IN der Karte (nicht mehr an
zweiter Stelle darunter), mit „Personen ersetzen" und dem roten Loeschknopf. Auf
der Seite ist nur noch EIN grosses Bild. Der alte Ergebnis-Bildschirm ist ueber
`ALTES_ERGEBNIS_FENSTER` in `KissFunnel.tsx` abgeschaltet — bewusst als benannte
Konstante und nicht als `false &&`, damit beim naechsten Lesen klar ist, dass es
eine Entscheidung war.

**Noch offen, in die Karte:**

- **Ton** — beim Bild gibt es keinen; die eigene Tonspur aus `lib/musik.ts`
  einhaengen, wie bei der Hochzeit. Beim Video traegt `EinladungAnsicht` ihn schon.
- **Herzchen und Kommentare** — „wow 🔥", „yes — kiss her!", „so hot", „omg",
  „perfect" plus die aufsteigenden Herzen. Sie liegen im abgeschalteten Block:
  `components/KissFunnel.tsx:2277` (Herzen) und `:2295` (die Wortliste).

  **Auf BEIDE, nicht nur aufs Ergebnis** (Owner 31.07.2026: „auch im Original
  Herzchen und wow"). Also auch über dem Beispielvideo in der Karte — und damit
  auch über den Karten weiter unten (`BeispielGalerie`). Der Grund ist gut: Die
  Herzchen sind das, was das Bild von einem Foto zu einem *Moment* macht. Auf dem
  Beispiel verkaufen sie; auf dem eigenen Ergebnis belohnen sie.

  **Sauber lösen, nicht kopieren:** ein eigener Baustein (z. B.
  `components/Reaktionen.tsx`), den die Karte über Bild ODER Video legt. Zweimal
  dieselbe Animation im Code laufen sonst nach der ersten Änderung auseinander.
  Die Ebene braucht `pointer-events-none`, sonst schluckt sie den Tipp auf das
  Video (= Upload) und den Ton-Knopf.
- **Teilen — und das zerfaellt in ZWEI Faelle, die getrennt zu bauen sind:**

  **a) Beispiele teilen: sofort machbar, keine Vorarbeit noetig.**
  Owner 31.07.2026: „das kann man auch sharen, damit die Leute Werbung machen
  können." Bei einem Beispiel IST die Themenseite das richtige Ziel — wer den Link
  bekommt, soll ja hierher. `TeilenKnopf` mit
  `/themes/kiss?utm_source=share` genuegt, plus ein Text wie „Schau dir das an".
  Das haengt an NICHTS und ist der billigste Werbekanal, den wir haben: Der
  Absender empfiehlt, nicht wir.

  **b) Das EIGENE Ergebnis teilen: braucht erst Punkt 2.**
  Ohne die Werk-Seite wuerde der Knopf die Themenseite verschicken statt seines
  Bildes — ein Knopf, der das Falsche tut. Also: erst die Seite, dann der Knopf.

  Wichtig, dass beide unterschiedliche Texte tragen: Beim Beispiel wirbt man fuer
  LuxuryBandit, beim eigenen Bild zeigt man SICH. Derselbe Satz waere in einem der
  beiden Faelle peinlich.
- **Der Video-Spieler** haengt ebenfalls am abgeschalteten Block. Solange der aus
  ist, muss geprueft werden, dass ein BEZAHLTES Video weiterhin ankommt — dieser
  Weg darf unter keinen Umstaenden brechen.

---

## 0b · Der Kuss-Auftrag ist gesetzt — aber ungeprueft

Kiss hat seit 31.07.2026 einen eigenen Auftrag: „sharing a tender kiss on the lips
— lips actually touching, eyes closed". Vorher lief es im generischen Zweig, und
der sagt „embracing each other at a beautiful holiday destination" — der Auftrag
fuer Holiday.

**Nicht am Ergebnis geprueft.** `FREE_PREVIEW_PER_DEVICE` steht auf 1 und der
Owner hat gesagt: „es kostet Geld". Ein Durchlauf gehoert gemacht, bevor Werbung
darauf laeuft. Zwei Dinge dabei ansehen:

- Kuessen sie sich wirklich (Lippen), oder wieder Wange an Wange?
- Kommt die Bildpruefung durch? Ein Kuss ist harmlos, aber `COVERAGE_RULE` und
  das Eingangsfoto entscheiden — bei Ablehnung greift der Gesichtsausschnitt.

---

## 1 · Guthaben statt Einzelkauf (die Idee des Owners)

> „bei anderen schreiben sie 2,99 aber sie müssen mindestens das Konto mit 9,99
> aufladen und das ist schlau" — „wir haben den Preis"

**Warum es gut ist, und zwar aus einem Grund, der leicht übersehen wird:** Stripes
feste Gebühr (~0,25 € je Vorgang) frisst bei 2,99 € rund **9 %**, bei 9,99 € rund
3 %. Eine Aufladung zahlt die Gebühr **einmal** statt dreimal. Das ist der harte
Gewinn — die Psychologie („der Rest liegt ja da, ich nutze ihn") kommt obendrauf,
und ab der zweiten Nutzung gibt es gar keine Kaufentscheidung mehr.

**Zu bauen:**
- Guthaben je Gerät bzw. E-Mail (nicht nur je Monat wie heute)
- Abbuchung je Video/Bild, idempotent je Kassensitzung
- Anzeige „noch 2 Videos übrig" — sichtbar, sonst wirkt das Guthaben wie weg
- Aufladeknopf statt Kaufknopf, Stufen z. B. 9,99 / 24,99
- Der beworbene Preis bleibt **2,99 je Video** — das ist die Zahl auf dem Knopf

**Vorhandene Bausteine:** `/api/kiss-status` führt schon ein Monatsguthaben,
`/api/checkout-status` schreibt Guthaben idempotent gut. Darauf lässt sich
aufsetzen; es ist kein Neubau.

**Haken, der vorher geklärt gehört:** In der EU ist ein nicht auszahlbares Guthaben
rechtlich heikler als ein Einzelkauf. In die AGB muss, was bei Nichtnutzung
passiert (Verfall ja/nein, Frist). Kein Nebensatz — vor dem Bauen entscheiden.

---

## 2 · Eigene Seite je Werk, zum Teilen

> „ich will dass die Leute das sharen können sofort, aber es müsste eine eigene
> Seite sein … und vielleicht steht da unten ein Button generiere auch du ein Video
> oder Bild. Das ist Werbung umsonst."

- Route z. B. `/w/[id]` — zeigt NUR das Ergebnis, nie die hochgeladenen Vorlagen
- Musik wie bei der Hochzeit: **`lib/musik.ts` steht schon** (Stück je Thema,
  eigene Tonspur neben dem stummen Video, damit die Musik die Videoschleife
  überlebt)
- Unten der CTA „Mach auch du eins" → Themenseite mit `utm_source`
- `noindex` — die Seite gehört dem Kunden, nicht Google
- Teilen-Knopf im Trichter nach der Erzeugung (`TeilenKnopf` existiert)

---

## 3 · Liefer-Mail schickt nur noch den Link

> „sie sollen das Bild nicht per E-Mail bekommen am besten, damit sie es nicht
> haben und immer wieder auf das Portal kommen können"

`app/api/kiss-deliver/route.ts:153` verlinkt heute die **Datei** (`e.videoUrl`).
Das muss der Link auf die Seite aus Punkt 2 werden. Hängt also daran.

---

## 4 · Preis prüfen, nicht schätzen

Was ein Pixverse-Lauf wirklich kostet, steht in **keinem Kommentar dieses
Projekts** — nur auf der Abrechnung. Das ist die eine Zahl, an der hängt, ob
2,99 € trägt:

- bei ~1 € je Video: trägt (die Hausnummer aus `try-this-look-store.ts`)
- bei ~2 € je Video: der Einmalkauf ist ein Verlustgeschäft

Ebenso: 12 Videos im Abo für 24,50 € sind bei 1 € Kosten 12 € von 24,50 €.

---

## 5 · Bildstufe „low"

`OPENAI_PREVIEW_QUALITY` steht auf `low`. Das ist die **zweite Hälfte** der
Ursache für „sieht zu jung aus": Wenig Detail heisst glatte Haut. Der Auftrag
kämpft mit der Altersangabe dagegen an (gemessen: hilft deutlich), gewinnt aber
nicht ganz. Eine Stufe höher kostet ein Mehrfaches je Bild. Entscheidung des
Owners.

Nebenbei: Dieses Vorschaubild ist auch das, was in der Hochzeits-Probewoche an
achtzig Gäste geht.

---

## 6 · Echtes Kuss-Bild erzeugen

> „lass da ein echtes Kuss-Bild entstehen"

Nicht gemacht — `FREE_PREVIEW_PER_DEVICE` steht auf 1 und der Owner hat gesagt:
„es kostet Geld". Wenn er es will: die zwei Vorlagen aus seinem Durchlauf von
14:36 liegen im Log und lassen sich wiederverwenden.

---

## 7 · Kleinkram, aber sichtbar

- **Try-On-Seite** (`app/themes/tryon/page.tsx:69`) verspricht noch „sends you a
  message every morning" — das gilt seit der Umstellung nicht mehr.
- **Wetter-Seite**: „Free to join", obwohl Wetter Abo-pflichtig ist — und der
  Wetter-Trichter verlangt das Abo technisch noch gar nicht.
- **Polnisch** ist seit 30.07. raus (`LANGS` in `lib/lang.ts`), aber elf Dateien
  tragen noch einen `pl:`-Block mit (u. a. `PaidReturn`, `SubscribeCta`,
  `ChatFunnel`). Tote Übersetzungen, die bei jeder Textänderung mitgepflegt
  werden wollen.
- **Startseite**: Reihenfolge der zwölf Themenkarten — aus dem Homepage-Konzept,
  nie umgesetzt.
- **Kiss-Beispiele**: aktuell vier Videos. Weitere unter `/themes/kiss?admin=1` →
  Medien; **das erste füllt die Karte oben**.

---

## 8 · Prüfen, ob es sich wiederholt

Zwei Fehler dieser Sitzung waren keine Einzelfälle. Beim nächsten Durchgang lohnt
ein Blick, ob sie woanders auch stehen:

- **Schrift auf Foto ohne `lb-onmedia`** → die helle Fassung malt sie fast
  schwarz. Vier Fundstellen, alle in Kiss- und Urlaubs-Trichter. Woanders?
- **Preis von Hand getippt statt `fillPrices`** → vier Kassen-Routen hatten
  `PRICE_CENTS = 399` fest im Code und hätten weiter den alten Preis abgebucht.
  Kandidat für eine Dauerprüfung im Build.

---

## Was diese Sitzung schon erledigt hat

Hochzeit: Karte ist die Seite, Dialoge, Video in der Karte, Musik läuft über die
Videoschleife, Bild nicht mehr beschnitten, alle sieben Sprachen · Kiss: dasselbe
Layout, kein Katalog mehr, Karten statt Kacheln, „You might also love" raus (warb
mit zufälligen Fotos), CI-Knopf blau/gelb, nach dem Gratis-Versuch trägt jede
Karte den Preis · Preise: 12 Videos / 2,99 € überall, auch in Supabase · Alter
bleibt erhalten (Zahl statt Regeltext — gemessen) · gemeinsames Paarfoto als
zweiter Weg.
