# Das Hochzeitsvideo als Einladung — Marketing-Konzept

Stand 31.07.2026. Entscheidungspapier. Anlass: Owner — „ich will, dass die Leute das auch als
Einladung für die Hochzeit an die Freunde schicken."

---

## 1. Warum das die stärkste Idee des Portals ist

Jedes andere Thema kauft seine Kunden bei Meta. **Dieses eine verschickt sich selbst.**

Eine Hochzeitseinladung geht nicht an einen Menschen, sondern an **fünfzig bis hundertfünfzig**.
Jeder Empfänger sieht ein KI-Video mit **Gesichtern, die er kennt** — und das ist eine Werbung,
die man nicht kaufen kann. Ein Fremder in einer Anzeige beweist gar nichts; das Brautpaar aus
dem eigenen Bekanntenkreis beweist alles.

Die Rechnung dahinter, sehr grob, aber sie trägt die Entscheidung: Ein einziges verkauftes
Einladungsvideo bringt bei 80 Empfängern und mageren 5 % Neugier **vier Besucher** auf die
Seite — gratis. Bei deinen aktuellen 8 Cent pro Lead ersetzt ein einziger Kunde damit den
Gegenwert von rund einem halben Euro Anzeigenbudget, und er ist dabei glaubwürdiger.

Und die Empfänger sind die richtigen: Wer zu einer Hochzeit eingeladen wird, ist selbst in
einer Beziehung, hat selbst Fotos vom Partner, und war gerade emotional in genau dem Thema.

---

## 2. Die Entscheidung, an der alles hängt

Eine Einladung ist kein Video mit Musik. Eine Einladung trägt **Daten**: zwei Namen, ein Datum,
einen Ort, eine Antwortmöglichkeit. Wer das halb baut, bekommt kein einziges verschicktes
Video — man verschickt nichts, wofür man sich schämt.

**Also entweder richtig oder gar nicht.** „Richtig" heißt eine eigene Seite, die der Empfänger
öffnet:

```
luxurybandit.com/einladung/⟨kennung⟩
```

Darauf, in dieser Reihenfolge:

1. **Das Video**, groß, mit Ton (stumm startend, ein Tipp schaltet ihn an).
2. **Die beiden Namen** und das **Datum**, in großer Schrift.
3. **Ort und Uhrzeit**, wenn sie es eingetragen hat.
4. Ein Knopf **„Ich komme"** / **„Ich kann leider nicht"** — die Antwort läuft in ihre Liste.
5. Ganz unten, klein und **nur eine Zeile**: „Dieses Video ist mit LuxuryBandit gemacht — mach
   euer eigenes." Mehr nicht. Wer die Einladung mit Werbung zupflastert, macht sie unsendbar.

Punkt 5 ist der ganze Kanal. Er muss so unaufdringlich sein, dass sie sich nicht schämt, den
Link zu verschicken — und trotzdem da.

---

## 3. Wer das kauft — und wer nicht

Die ehrliche Aufteilung deines Verkehrs:

**A · Die wirklich Verlobten.** Klein, vielleicht jede zwanzigste Besucherin. Sie hat ein Datum
und eine Gästeliste. Für sie ist die Einladung ein echtes Produkt, für das man mehr als 9,99 €
zahlt — sie vergleicht mit einer Papiereinladung für 150 €.

**B · Alle anderen.** Die große Mehrheit. Sie will das Bild sehen, nicht heiraten. Für sie ist
die Einladungsfunktion egal — sie darf sie also nicht im Weg stehen haben.

**Daraus folgt der Aufbau:** Der Trichter bleibt exakt wie er ist. Die Einladung ist ein
**zusätzlicher Knopf am fertigen Video**, kein zusätzlicher Schritt davor. Wer sie nicht
braucht, sieht nur einen Knopf mehr; wer sie braucht, findet sie genau in dem Moment, in dem
das Video fertig ist und sie sich freut.

---

## 4. Der Weg des Kunden

```
Trichter wie heute → Bild gratis → Video 9,99 €
                                      ↓
                    „Als Einladung verschicken"  (neu)
                                      ↓
        Namen · Datum · Ort eintippen → Seite entsteht → WhatsApp
```

**Der Verschick-Knopf ist WhatsApp**, nicht E-Mail. In Rumänien, Italien und Frankreich läuft
so etwas über WhatsApp-Gruppen; eine Einladung per E-Mail wirkt wie eine Rechnung. Technisch
ist das ein Link der Form `https://wa.me/?text=…` — kein Konto, keine Anbindung, kostet nichts.

---

## 5. Was das kostet — Vorschlag

Preise stehen in `lib/pricing.ts` und nirgends sonst. Vorschlag zur Entscheidung:

| Was | Preis | Begründung |
|---|---|---|
| Bild | gratis | wie überall — ohne Gratis-Ergebnis kauft niemand |
| Video | **9,99 €** | wie beim Kuss, gleiche Rechnung |
| **Einladungsseite** | **19,90 € einmalig** | eigene Seite, Namen, Datum, Zu- und Absagen |

Der Aufpreis ist kein Gierpreis: Sie vergleicht ihn nicht mit deinem Videopreis, sondern mit
Papiereinladungen und Druckkosten. Und er trennt sauber die Gruppe A von B — wer 19,90 € zahlt,
hat wirklich eine Hochzeit.

**Nicht ins Abo packen.** Eine Hochzeit hat man einmal; ein Monatsabo dafür wäre unglaubwürdig
und die Kündigung programmiert.

---

## 6. Wie es beworben wird

**Die Anzeige ändert sich nicht.** Sie bleibt „euer Hochzeitsfoto, gratis" — das ist der
Einstieg, der funktioniert. Die Einladung wird **nicht** beworben: Sie ist der zweite Schritt,
den man erst versteht, wenn man das Video schon gesehen hat.

**Was beworben wird, ist der Zeitpunkt.** Hochzeiten haben Saison — Mai bis September, und in
Rumänien besonders der Spätsommer. Zwei bis vier Monate vorher werden Einladungen verschickt.
Das heißt: **Februar bis Juni** ist die Zeit für Budget, nicht der Dezember.

**Der eigentliche Kanal ist der Empfänger.** Jede geöffnete Einladung zählt als Ereignis. Wenn
die Zahlen zeigen, dass Empfänger klicken, gehört das Budget nicht in mehr Anzeigen, sondern in
mehr Einladungen — also in alles, was die Kaufquote der Gruppe A erhöht.

---

## 7. Woran wir merken, dass es nicht funktioniert

**Tor 1 — nach den ersten 20 verkauften Videos.** Bedingung: **≥ 3** davon lösen die
Einladungsseite aus. Gerissen: Die Leute wollen das Bild, nicht die Einladung — dann fliegt der
Knopf wieder raus, und das Thema bleibt ein Foto-Produkt.

**Tor 2 — nach den ersten 5 Einladungen.** Bedingung: **≥ 15 Öffnungen je Einladung** im
Schnitt. Gerissen: Sie verschickt es nicht wirklich. Dann liegt es an der Seite — zu werblich,
zu billig, zu wenig wie eine Einladung.

**Tor 3 — der Zweck.** Bedingung: **≥ 1 % der Empfänger** startet selbst einen Trichter.
Gerissen: Der Kanal existiert nicht, die Einladung ist nur ein nettes Extra. Dann kein weiterer
Ausbau.

Was **nicht** zählt: verkaufte Videos. Die zählen schon woanders.

---

## 8. Was gebaut wird — und was nicht

**Gebaut:**
- `/einladung/[kennung]` — Video, Namen, Datum, Ort, Zu-/Absage, eine Zeile Herkunft
- Der Knopf am fertigen Video, der die Daten abfragt und die Seite anlegt
- WhatsApp-Verschicken, Widerruf des Links, Zähler für Öffnungen und Antworten
- Zu- und Absagen in ihrer Liste, damit sie eine Gästeliste hat

**Nicht gebaut:**
- Keine Gästeverwaltung mit Tischplan, kein Geschenkeregister, keine Menüauswahl. Das ist ein
  eigenes Produkt und nicht deins.
- **Kein Massenversand über uns.** Sie verschickt selbst über WhatsApp. Sobald wir im Namen
  einer Kundin an hundert fremde Adressen schreiben, sind wir ein Massenversender mit allen
  Pflichten — und einer Sperrgefahr, die dein Konto nicht verträgt.
- Keine echten Personendaten der Gäste bei uns. Wer zusagt, tippt einen Vornamen, mehr nicht.

---

## 9. Der Aufwand

Fast alles steht schon: Video, Bezahlweg, Speicher, Sprachen, Löschfrist. Neu sind die
Einladungsseite, das Formular und der Zähler — überschaubar, aber kein Nachmittag.

Die Reihenfolge, falls du es willst:

1. `/einladung/[kennung]` mit Video, Namen, Datum, Ort (ohne Antwortknopf)
2. Der Knopf am fertigen Video + WhatsApp-Verschicken
3. Zähler für Öffnungen — **erst danach** entscheidet sich alles Weitere
4. Zu-/Absagen, wenn Tor 2 durch ist
