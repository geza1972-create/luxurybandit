# Konzept — LuxuryBandit als Geschenke-Marktplatz

> Stand 03.08.2026 · Entwurf zur Entscheidung, noch nicht umgesetzt.
> Anlass: Owner 03.08.2026 — „wir haben die Richtung des Portals geändert als Geschenke-
> Marktplatz … dafür müssten wir alle Topics so anpassen und über denselben Trichter schicken.
> Und auch jede Landingpage soll gleich aufgebaut werden … wir müssen fürs Hosting auch Geld
> verlangen, sonst wird der Server voll mit Müll."

---

> **Der Bauplan dazu:** [PLAN-GESCHENKE-FLOW.md](PLAN-GESCHENKE-FLOW.md) — der fertige
> Kuss-Ablauf als Vorlage für alle weiteren Geschenke, samt der Regeln, die nicht verhandelbar
> sind, weil jede davon schon einmal Geld gekostet hat.

## 0. Der Satz

**LuxuryBandit ist der Ort, an dem man Geschenke macht, die es sonst nicht gibt: einen Kuss,
einen Geburtstagsgruß, eine Überraschung, eine Hochzeitseinladung — jedes mit dem Gesicht der
Menschen, um die es geht.**

Das ist die Klammer, die bisher fehlte. „AI-Marktplatz" erklärt, womit wir es machen; „Geschenke"
erklärt, wofür jemand zahlt. Man kann auf ein Geschenk werben, nicht auf eine Technik.

---

## 1. Zwei Sorten Geschenk — und warum das die ganze Preisfrage beantwortet

Der Owner hat den Widerspruch selbst benannt: „Bei Wedding, Chat muss trotzdem mit Abo laufen,
weil wir Chat hosten. Aber wir hosten alles eigentlich." Beides stimmt — aber die Kosten haben
eine **verschiedene Form**, und daran hängt der Preis.

| | **Geschenk** (einmal) | **Gehostetes** (laufend) |
|---|---|---|
| Beispiele | Kuss, Geburtstag, Überraschung, Urlaub, Idol | Hochzeitsseite, Chat, Morgenwetter |
| Was der Kunde bekommt | eine Datei + einen Link | eine Seite, die lebt |
| Unsere Kosten | **einmal** (Pixverse/FASHN/OpenAI) + ein bisschen Ablage | **jeden Monat wieder** (Ablage + Rechenzeit) |
| Bezahlt mit | **Guthaben** — abgebucht je Geschenk | **Abo** |

**Die Regel, die daraus folgt und alles vereinfacht:**

> Das Geschenk kauft man. Das Hosting mietet man.

Bei der Hochzeit heißt das: **das Video ist ein Geschenk wie jedes andere** (aus dem Guthaben,
zum Preis in der Tabelle) — **die Seite mit Zusagen, Neuigkeiten und Gruppenchat ist das Abo.**
Damit ist der Widerspruch weg, den der Owner gesehen hat („wir haben bei Kiss unterschiedliche
Preise für Videos, auch für Wedding müssten wir das so aufbauen"): Es gibt nur noch **eine**
Preislogik für Videos, über alle Themen, und daneben **eine** Miete für das, was wirklich
weiterläuft.

Das ist auch ehrlich zu erklären, und das ist der Test: „Das Video gehört dir. Die Seite halten
wir am Laufen, solange du sie brauchst." Diesen Satz versteht jeder in zwei Sekunden.

---

## 2. Das Müll-Problem — gemessen, nicht geschätzt

Der Owner hat recht, und es ist schlimmer als gedacht. Stand 03.08.2026:

| | |
|---|---|
| Kuss-Aufträge in 9 Tagen (26.07.–03.08.) | **210** |
| davon bezahlt | **2** |
| unbezahlt, aber mit hochgeladenen Fotos echter Gesichter | **195** |
| Dateien in `try-this-look/uploads/` | **901 · 404 MB** |
| davon von **nichts** mehr referenziert | **591 · 256 MB** |
| Aufräum-Jobs im System | **einer**, viel zu weit gespannt (siehe unten) |

> **Korrektur zur ersten Fassung dieses Absatzes:** Hier stand „Aufräum-Jobs: keiner". Das war
> falsch. In `kiss-deliver` steckte seit jeher eine Frist (`FREE_PREVIEW_KEEP_DAYS`, 90 Tage):
> unbezahlte Besuche samt Dateien löschen. Sie hat nur nie gegriffen, weil die ältesten Daten
> neun Tage alt sind — und sie ließ **Vorlagen bezahlter Aufträge absichtlich für immer liegen.**
> Das Netz existierte also, es war bloß zu weit und an der falschen Stelle aufgehängt.
> Seit dem 03.08. wohnt es in `/api/aufraeumen` (siehe unten), zusammen mit den neuen Fristen.

**Der wichtigste Satz dieses Abschnitts: Der Müll sind nicht die bezahlten Geschenke.**
Ein bezahltes Kussvideo ist ein paar Megabyte und ist zugleich unsere Werbung — der geteilte
Link ist der einzige Kanal, der sich selbst weiterträgt. Den kürzt man nicht.

Der Müll sind **hochgeladene Gesichter von Menschen, die nie Kunde wurden.** Und das ist kein
Speicherproblem, sondern ein rechtliches: Fotos identifizierbarer Personen ohne Vertrag, ohne
Zweck und ohne Frist zu behalten, verstößt gegen Artikel 5 DSGVO (Zweckbindung,
Speicherbegrenzung). **Löschen ist hier Pflicht, nicht Sparen** — und es löst das Kostenproblem
nebenbei.

*(Am 03.08. bereits erledigt: 110 anonyme Aufträge und 151 Dateien gelöscht,
`scripts/kiss-anonyme-loeschen.mjs`. Die 591 verwaisten Dateien warten auf Freigabe — vorher
müssen die übrigen Blobs geprüft werden, nicht nur Kiss-Log und state.json.)*

### Die Fristen-Leiter (Vorschlag)

| Was | Bleibt | Warum |
|---|---|---|
| Hochgeladene Vorlagen (sein/ihr Foto) | **7 Tage**, auch bei Bezahlung | Sie sind nur Zutat. Nach der Lieferung braucht sie niemand — und niemand will, dass wir sie behalten. |
| Auftrag ohne Adresse, ohne Ergebnis | **7 Tage**, dann ganz weg | Kein Mensch dahinter, den wir erreichen könnten. |
| Bezahltes Geschenk (Video/Bild) | **90 Tage** (Owner 03.08.2026) | Der Link ist das Geschenk. Stirbt er früh, stirbt er beim Empfänger — und mit ihm unsere Werbung. Deshalb 7 Tage vorher eine Mail. |
| Danach | Link läuft aus; wer heruntergeladen hat, behält die Datei | Ehrlich und billig — die Vorwarnung sagt genau das. |
| Gehostete Seite (Hochzeit) | **solange das Abo läuft** + 30 Tage Nachfrist | Genau dafür ist das Abo da. |

### Stand 03.08.2026 — gebaut

`GET /api/aufraeumen`, nächtlich um 04:30 UTC (`vercel.json`), abgesichert wie `kiss-deliver`
(Cron-Kopfzeile, `?key=`, Admin-PIN — ohne Schlüssel 401).

- **Ein** Aufräumer statt zwei: Die 90-Tage-Regel ist aus `kiss-deliver` hierher gezogen. Zwei
  Löscher mit eigenen Fristen auf demselben Protokoll laufen früher oder später auseinander —
  und Aufräumen gehört ohnehin nicht in den Cron, der bezahlte Ware ausliefert.
- **`?probe=1`** zählt nur. Die Fristen sind dabei über `?vorlagen=&anonym=&besuch=&geschenk=`
  durchspielbar — **nur im Probelauf**, sonst wäre `?vorlagen=0` ein Löschknopf für alles.
- Belegt am echten Protokoll (88 Aufträge): scharf **0** Löschungen (die Daten sind vier Tage
  alt), bei `vorlagen=1` **126** Vorlagen, bei `besuch=1` **63** Aufträge.
- **Geschenke: 90 Tage**, mit Mail sieben Tage vorher. Gelöscht wird **nur**, was den
  Warn-Stempel trägt — oder was gar keine Adresse hat, an die man hätte warnen können.
  Geprüft mit einer Frist von 1 Tag: 1 Eintrag fällig (ein anonym geteilter Link ohne
  Adresse), **0 Kunden mit Adresse ungewarnt**.

---

## 3. Ein Trichter für alle — und warum das billiger ist, als es klingt

Heute existieren **zwei Generationen** nebeneinander:

| Trichter | Zeilen | Themen |
|---|---|---|
| `KissFunnel` | **3.940** | Kuss, Hochzeits-**video**, Idol — mit fertigem Varianten-System |
| `BirthdayFunnel` | 210 | Geburtstag |
| `SurpriseFunnel` | 333 | Überraschung |
| `HolidayFunnel` | 463 | Urlaub, Bella |
| `ChatFunnel` | 814 | Chat |

**Der Trichter ist schon gebaut.** `KissFunnel` hat längst eine Varianten-Tabelle mit Schaltern:
`abo`, `einzelkauf`, `keinGratis`, `nurGuthaben`, `paarUpload`, `empfaengerName`, `nurEigenes`,
`musik`, `prompt`, `done`. Genau das ist die Struktur, die der Owner beschreibt. Die Aufgabe ist
also **nicht „einen gemeinsamen Trichter bauen"**, sondern **die vier kleinen Trichter auf die
vorhandene Tabelle umziehen.**

Aber ehrlich dazu: 3.940 Zeilen sind schon jetzt zu viel für eine Datei, und vier weitere Themen
hineinzuschieben macht es schlimmer. Deshalb der Umbau in **zwei Schritten**:

1. **Die Tabelle raus aus dem Trichter** → `lib/geschenke.ts`. Ein Eintrag je Geschenk: Titel,
   Schritte, Preis, Prompt, Vorlagen, Musik, Schalter. Der Trichter liest nur noch.
2. **Die Themen umziehen**, eines nach dem anderen, jedes gegen einen echten Lauf geprüft.

Nach Schritt 1 ist „ein neues Geschenk anlegen" ein Eintrag in einer Tabelle — nicht mehr eine
neue Komponente. Das ist der eigentliche Gewinn, und er zahlt sich ab dem zweiten Geschenk aus.

---

## 4. Eine Landingpage für alle

Heute: Kuss und Hochzeit je 271 Zeilen, Geburtstag 113, Chat 122, Urlaub 103, Überraschung 93,
Try-on 86. Sieben Seiten, sieben Aufbauten — jede Verbesserung müsste siebenmal gemacht werden.
Der Kuss hat den ausgereiften Aufbau; er ist die Vorlage:

```
Kopfzeile mit Konto-Chip
Titel: „Schick <Geschenk> an <goldenes Wort>"
Drei Schritte: hochladen → wir machen es → verschicken
Privat-Zusage (Schloss-Zeile)
Die Karte mit Beispielvideo → derselbe Trichter
Weitere Beispiele als Karten
Anlässe: warum man es verschickt
Preiszeile aus der Tabelle
SEO-Text (bleibt je Geschenk eigen — er bringt die Besucher)
```

Ein Baustein `<GeschenkSeite geschenk="kiss" />`, gefüttert aus `lib/geschenke.ts`. Jede Seite
liefert dann **Daten, kein Layout**. Der SEO-Block bleibt bewusst individuell: Er ist der einzige
Teil, der je Geschenk wirklich verschieden sein muss, und er bringt die Besucher.

---

## 5. Die Preistabelle

Heute steht in `lib/pricing.ts` genau ein Videopreis (`ONCE_CENTS` = 1,49 €) plus eine
Ausnahme (`LINGERIE_CENTS` = 3,99 €). Das trägt nicht für acht Geschenke mit verschiedenen
Kosten — ein Lingerie-Kuss sind zwei bezahlte Läufe, ein Geburtstagsgruß einer.

Vorschlag: **Preis am Geschenk, nicht in der Preisdatei.**

```
geschenke.ts   → kiss: { preisCents: 149, varianten: { lingerie: 399 } }
                 birthday: { preisCents: … }
                 wedding-video: { preisCents: … }
pricing.ts     → nur noch: Aufladestufen, Abo, Platzhalter-Ersetzung
```

Bezahlt wird alles aus **einem** Guthaben-Topf (so ist es heute schon) — der Kunde lädt einmal
auf und beschenkt danach, wen er will. Das ist der stärkste Grund für den Marktplatz überhaupt:
**Guthaben, das übrig bleibt, ist der Grund wiederzukommen.**

Abo bleibt für: Hochzeitsseite, Chat, Morgenwetter. Also für alles, was **weiterläuft**.

---

## 6. Reihenfolge — und die unbequeme Zahl

Der Owner will „so schnell wie möglich das Ganze anpassen". Dagegen steht eine Zahl aus
Abschnitt 2: **in neun Tagen 210 Aufträge, 2 Käufe.** Der Trichter, auf den alle Themen ziehen
sollen, hat bisher zweimal verkauft.

Acht Themen auf einen unbewiesenen Trichter umzubauen, vervielfacht die Arbeit **und** den
Fehler, falls er einer ist. Deshalb die Empfehlung — sie kostet nichts an Tempo, wo es zählt:

| | Was | Warum jetzt |
|---|---|---|
| **1** | Aufräum-Cron + Fristen (Abschnitt 2) | Rechtlich fällig, unabhängig von allem anderen. Läuft ohne Produktentscheidung. |
| **2** | `lib/geschenke.ts` aus `KissFunnel` herauslösen | Reine Umschichtung, ändert nichts für den Kunden — aber ab hier ist jedes weitere Thema billig. |
| **3** | **Kuss zum Laufen bringen** — ein echter Lauf Ende zu Ende, dann Anzeigen | Bis ein Geschenk verkauft, ist jede Kopie eine Kopie von etwas Unbewiesenem. |
| **4** | Hochzeit aufteilen: Video = Geschenk, Seite = Abo | Der Owner hat den Widerspruch selbst gesehen; die Trennung ist die Antwort. |
| **5** | `<GeschenkSeite>`, dann Geburtstag / Überraschung / Urlaub umziehen | Jetzt zahlt sich Schritt 2 aus: je Thema ein Tabelleneintrag statt einer Komponente. |

Schritt 1 und 2 kann ich sofort anfangen — beide brauchen keine weitere Entscheidung.

---

## 7. Was nur der Owner entscheiden kann

1. ~~**Wie lange ein bezahltes Geschenk online bleibt**~~ — **entschieden: 90 Tage** (03.08.2026),
   mit Mail sieben Tage vorher. Gelöscht wird nur, was gewarnt wurde.
2. **Die 591 verwaisten Dateien (256 MB)** — löschen? Vorher prüfe ich alle übrigen Blobs, nicht
   nur Kiss-Log und state.json. Freigabe nötig.
2. **12 Monate Hosting im Geschenkpreis** — oder kürzer/länger? Die Zahl entscheidet, wie lange
   ein geteilter Link lebt, und der Link ist die Werbung.
3. ~~**Hochzeit aufteilen** (Video kaufen, Seite mieten)~~ — **entschieden 03.08.2026: NEIN.**
   Ein Paket, **kein Abo**, schaltet alles frei (Video, Einladungsseite, Zusagen, Neuigkeiten,
   Gruppenchat). Der Kunde **wählt die Laufzeit**: 3 Monate 24 €, 6 Monate 49 €, 1 Jahr 99 €
   (`HOCHZEIT_STUFEN`), drei Video-Versuche in jeder Stufe.
   Das ist besser als der Vorschlag oben: Zwei Kaufwege nebeneinander wären genau die
   Sonderprogrammierung, die vermieden werden soll — so hat der Marktplatz EINEN Kaufweg.
   Details in [PLAN-GESCHENKE-FLOW.md](PLAN-GESCHENKE-FLOW.md) §5.
4. **Preis je Geschenk** — welche Zahlen? Erst wenn die Pixverse-Abrechnung gelesen ist; die
   Kosten je Lauf stehen bis heute in keinem Kommentar dieses Projekts (siehe `lib/pricing.ts`).
5. **Chat und Morgenwetter** — bleiben sie im Portal, oder sind sie im Geschenke-Marktplatz ein
   Fremdkörper? Sie sind das Einzige, was kein Geschenk ist.

---

## 8. Was dieses Konzept NICHT löst

- **Ob Geschenke sich verkaufen.** Das Konzept ordnet, was da ist; es ersetzt keinen Beweis.
- **Was ein Lauf wirklich kostet.** Ohne diese Zahl ist jeder Preis geraten — auch die 1,49 €.
- **Die Werbung.** „Ein Portal, auf das man werben kann" ist das Ziel des Owners; welche Anzeige
  auf welches Geschenk zeigt, ist eine eigene Aufgabe.
