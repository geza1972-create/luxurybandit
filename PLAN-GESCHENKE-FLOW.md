# Der Kuss-Ablauf als Bauplan für alle Geschenke

> Stand 03.08.2026 · Owner: „Die ganze Arbeit und Flow bei Kissing ist sehr gut. Ich will, dass
> du das ganze speicherst als Plan für die anderen und nächsten Topics. Ich werde eine
> allgemeine Werbung schalten für Video Gifts und alles muss den selben Flow haben."
>
> Dieses Dokument ist die Vorlage. Wer ein neues Geschenk baut, arbeitet es von oben nach unten
> ab. Was hier unter **UNVERÄNDERLICH** steht, ist nicht Geschmack — jede dieser Zeilen hat
> einmal Geld oder einen Kunden gekostet, und die Stelle ist genannt.

---

## 0. Der Satz, auf den alles einzahlt

**Ein Geschenk ist etwas, das man EINEM Menschen schickt.** Nicht ein Video, das man sich
ansieht. Diese Unterscheidung entscheidet jede Detailfrage weiter unten: Deshalb gibt es einen
Empfängernamen, deshalb ist das Ergebnis eine KARTE und keine Videodatei, deshalb ist der Link
privat bis zum ausdrücklichen Teilen, und deshalb steht auf der Karte „erstellt durch
luxurybandit.com" und nicht mehr.

---

## 1. Die zwölf Schritte — so läuft jedes Geschenk

| # | Schritt | Wo es im Kuss steht |
|---|---|---|
| 1 | **Landingpage**: Titel „Schick X an …", drei Schritte, Privat-Zusage, Beispielkarte mit echtem Video | `app/themes/kiss/page.tsx` |
| 2 | **E-Mail-Tor VOR dem ersten Upload** — kein Foto ohne Adresse | `KissFunnel`, `gateOffen` |
| 3 | **Fotos**: ein oder zwei, mit Zuschnitt, Löschen, Reihenfolge | Regeln im Skill `upload-foto` |
| 4 | **Name des Empfängers** (freiwillig) → personalisiert die aufsteigenden Zeilen | `empfaengerName` in `lib/geschenke.ts` |
| 5 | **Ein Preis**, bezahlt aus dem Guthaben. Kein Gratis-Versuch, kein Abo | `videoPreisCents` |
| 6 | **Reicht das Guthaben nicht** → Auflade-Wähler mit Adress-Bestätigung und Tippfehler-Prüfung | `aufladeWahl` |
| 7 | **Abbuchung serverseitig**, lautlos, idempotent je Auftrag | `/api/kiss-video-checkout` |
| 8 | **Rendern**: Prozentzahl IN der Karte, genau EINE Ladeanzeige | `renderSchicht` |
| 9 | **Ergebnis ist die KARTE** — Musik von selbst, Herzchen, Name | `EinladungKarte` + `EinladungAnsicht` |
| 10 | **Galerie**: Standbild, öffnen, teilen | `app/my-gallery` |
| 11 | **Teilen** → `/w/<id>`, privat bis zum Ja, eigener Vorschautext | `app/w/[id]` |
| 12 | **Server liefert nach**, auch wenn der Browser stirbt; Mail mit Link | `/api/kiss-deliver` |

---

## 2. UNVERÄNDERLICH — die Regeln, die Geld gekostet haben

Jede Zeile hier ist ein Fehler, der schon passiert ist.

**Geld hängt an EINER E-Mail.** Konto-Anmeldung schlägt Geräte-Adresse. Nie stillschweigend
zwischen Adressen umbuchen — anzeigen, wo es liegt. *(8,50 € lagen unsichtbar auf einer zweiten
Adresse; `lib/guthaben-konto.ts`.)*

**Die Kasse bekommt die Adresse mit** (`customer_email`) und ist damit gesperrt. Davor steht die
Korrekturmöglichkeit — Art. 8 Verbraucherrechte-RL verlangt sie, und das Trichter-Feld ist seither
die einzige Stelle, an der ein Tippfehler entstehen kann. *(`lib/mail-tippfehler.ts`.)*

**Gutgeschrieben wird, was BEZAHLT wurde** — außer bei ausdrücklich freigegebenen Codes
(`STRIPE_GUTSCHRIFT_CODES`). Sonst ist jeder kursierende Gutschein eine offene Kasse.
*(9,99 € Phantom-Guthaben auf zwei Konten.)*

**Schreiben heißt vereinigen, nicht überschreiben** — plus eine Kette, die Lesen-Mischen-Schreiben
am Stück laufen lässt. *(Ein Kunde zahlte 1,49 €, sein Auftrag wurde von einem gleichzeitigen
Schreiber gelöscht; `writeKissLog`.)*

**Eine bezahlte Auftragsnummer bekommt immer einen Auftrag.** Fehlt er, wird er angelegt — sonst
sitzt der Kunde für immer in „bezahlt, aber nichts da". *(`bezahltVermerken`.)*

**Nie „bezahlt" melden, wenn der Stempel nicht sitzt.** Lieber ein ehrlicher Fehler.

**Das Ergebnis ist die Karte, nicht die Datei.** Vorschau, Teilen-Link und Empfängerseite zeigen
dasselbe.

**Der Link ist privat, bis der Besitzer teilt** — und die Vorschau verrät bis dahin nichts.

**Das Vorschaubild im Chat ist NIE sein Foto.** Es erscheint in der Chatliste, auf dem
Sperrbildschirm und in jeder Weiterleitung.

**Kein `loop` bei Videos** — `SchleifenVideo` blendet zwei Spieler ineinander.

**Preise nur aus `lib/pricing.ts`**, Texte nur aus den Sprachtabellen. Nie eine Zahl in einen Satz
tippen.

**Aufbewahrung**: Vorlagen 7 Tage, Auftrag ohne Ergebnis 7 (anonym) bzw. 90 Tage (mit Adresse),
bezahltes Geschenk 90 Tage **mit Warn-Mail sieben Tage vorher**. Gelöscht wird nur, was gewarnt
wurde. *(`/api/aufraeumen`.)*

---

## 3. Was je Geschenk VERSCHIEDEN ist

Alles davon ist ein Eintrag in `lib/geschenke.ts` — keine neue Komponente:

```
prompt          der Videotext (oder eine Liste, aus der zufällig gezogen wird)
done            Dateiname des Downloads
preisCents      der eine Preis
upFirst         steht die Upload-Karte vorn?
paarUpload      zwei Fotos nebeneinander statt Karussell?
empfaengerName  fragt dieses Geschenk nach dem Namen?
musik           die Tonspur (lib/musik.ts)
upPlaceholder   Platzhaltergesicht auf der Upload-Karte
```

Dazu je Geschenk: die Texte in `lib/kiss-i18n.ts` (sieben Sprachen) und die Beispielvideos.

**Ein neues Geschenk ist damit: ein Tabelleneintrag + Texte + Beispielvideos.** Kein neuer
Trichter, keine neue Landingpage.

---

## 4. Die Reihenfolge für die nächsten Themen

Empfohlen, weil jedes Thema das vorige billiger macht:

1. **`<GeschenkSeite>`** — die Landingpage als ein Baustein, gefüttert aus `lib/geschenke.ts`.
   Heute: Kuss 271 Zeilen, Geburtstag 113, Überraschung 93, Urlaub 103 — vier Aufbauten für
   dieselbe Seite. Der SEO-Block bleibt je Geschenk eigen, er bringt die Besucher.
2. **Geburtstag** umziehen (kleinster Trichter, 210 Zeilen).
3. **Überraschung** (333), **Urlaub** (463).
4. **Hochzeit** — siehe Abschnitt 5, sie ist der Sonderfall.
5. **Chat** bleibt, was er ist: kein Geschenk, sondern ein laufender Dienst.

---

## 5. Die Hochzeit — Owner-Entscheidung 03.08.2026

> „Ich weiß nicht, was wir mit der Wedding Invitation machen, weil das ein anderer Flow hat und
> ich will da nicht ewig extra programmieren. Dort ist ein Abo, was das ganze sehr kompliziert
> macht, aber es ist auch komplexer. Wir könnten das ohne Abo verkaufen, sondern mit einem
> höheren einmaligen Preis, und entfällt in 3 Monaten oder derjenige zahlt es noch mal. Ich will
> dafür schon 24,99 Euro haben, aber dann wird gleich alles freigeschaltet: Chat, Gästeliste,
> Video."

**Das ist die richtige Antwort, und sie ist besser als der Vorschlag im Konzept** (dort stand:
Video als Geschenk kaufen, Seite als Abo mieten). Zwei Kaufwege nebeneinander wären genau die
Sonderprogrammierung, die vermieden werden soll.

### Was damit wegfällt

Das Abo ist der teuerste Teil des Codes, gemessen an dem, was es einbringt: Stripe-Abo-Kasse,
Kündigungslogik, `hasActiveSubscription` bei jedem Aufruf, monatliche Gutschriften,
Kontingent-Zeilen, „Abo aktiv"-Zustände im Trichter. **All das entfällt.** Die Hochzeit läuft
dann über denselben Guthaben-Topf wie jedes andere Geschenk — nur mit einem größeren Betrag.

### Die eine Änderung an deinem Vorschlag

**Drei Monate ab KAUF sind gefährlich.** Eine Hochzeit wird oft ein halbes Jahr vorher geplant.
Wer im März kauft und im September heiratet, steht im Juni vor einer toten Einladungsseite —
mit Gästen, die schon zugesagt haben. Das ist der schlimmste Moment, den dieses Produkt haben
kann.

**Vorschlag: drei Monate ab dem HOCHZEITSDATUM**, mindestens aber drei Monate ab Kauf. Die Seite
kennt das Datum ohnehin (es steht auf der Einladung). Damit lebt sie von der Einladung bis nach
der Feier — genau die Spanne, in der sie gebraucht wird — und die Kosten bleiben gedeckelt, weil
eine Hochzeitsseite ein paar Dateien und ein Video ist.

Verlängern = noch einmal zahlen, wie du sagst. Und wie beim Geschenk: **Warn-Mail sieben Tage
vorher**, dieselbe Maschine (`/api/aufraeumen`).

### Was 24,99 € freischalten

Alles auf einmal, kein zweiter Kauf: Video, Einladungsseite, Zusagen/Gästeliste, Neuigkeiten,
Gruppenchat. Ein Preis, ein Klick, ein Versprechen.

### Aufwand ehrlich geschätzt

Der Trichter der Hochzeit ist schon eine Variante desselben Bausteins (`abo`, `einzelkauf`,
`keinGratis` in `lib/geschenke.ts`). Zu tun ist:

- `abo: false`, `preisCents: 2499` am Hochzeits-Eintrag
- die Abo-Prüfung in der Einladungsseite durch „bezahlt + nicht abgelaufen" ersetzen
- `gueltigBis` am Einladungs-Eintrag, gesetzt beim Kauf
- Warn-Mail und Ablauf in `/api/aufraeumen` ergänzen (die Maschine steht)
- Abo-Texte aus den sieben Sprachtabellen entfernen

**Das ist ein überschaubarer Umbau, kein zweiter Trichter** — und danach hat der Marktplatz
genau EINEN Kaufweg.

---

## 6. Was dieser Plan nicht löst

- **Ob Geschenke sich verkaufen.** 210 Aufträge in neun Tagen, zwei bezahlt. Der Ablauf ist
  jetzt repariert und bewiesen; ob die Leute kaufen, entscheidet die Werbung.
- **Was ein Lauf wirklich kostet.** Steht bis heute in keinem Kommentar dieses Projekts. Ohne
  diese Zahl ist jeder Preis geraten — auch die 1,49 € und die 24,99 €.
- **Die Preise der übrigen Geschenke.** Erst die Pixverse-Abrechnung lesen.
