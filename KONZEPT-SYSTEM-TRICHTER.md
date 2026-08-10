# Der Trichter des LuxuryBandit Systems — gratis prüfen, bezahlt lösen

Owner 07.08.2026:

> „Wir müssen hier den Trichter machen. Die Leute sollen ihre Analysen umsonst machen. Also
> Bild hochladen, Idee, Budget angeben, dann starten. Die Bilder werden generiert (kleinste
> OpenAI-Auflösung). Die Idee wird auch bewertet, aber gekürzt. Dann die richtige Analyse und
> Zielgruppen-Chat, detaillierte Analyse, Businessplan, Skalierung, Motivation, alles drum und
> dran, was wir besprochen haben — und die Lösung wird gegen Kasse bezahlt."

Die Regeln zum Thema stehen im Skill `business-analyse`; **dieses Papier ändert genau eine
davon** — die Schnittkante zwischen gratis und bezahlt (§3 des Skills). Alles andere gilt
weiter: Hollywood statt Hochschule, drei Jurys, keine Einkommenszahlen, {plan} nur aus
`lib/pricing.ts`.

---

## 0. Der eine Satz

> **Die Prüfung ist gratis. Die Lösung kostet.**
> Er erfährt umsonst, ob seine Idee trägt — und was er dagegen tun kann, steht hinter der Kasse.

Das ist die ganze Bewegung, und sie dreht die bisherige Aufteilung um. Bisher war das Bild
gratis und die Analyse bezahlt. Jetzt ist die **Diagnose** gratis und die **Behandlung**
bezahlt. Der Unterschied ist nicht Marketing: Ein Bild kann man wegklicken, ein Urteil über die
eigene Idee nicht.

---

## 1. Warum überhaupt etwas verschenken

Bei 59 € kauft niemand auf Verdacht (Skill §0: *„Der Beweis vor der Kasse wiegt jetzt
schwerer"*). Es gibt genau zwei Wege, jemanden über diese Schwelle zu bringen: ein Versprechen
— oder ein Beweis. Versprechen sind bei diesem Produkt verboten (keine Einkommenszahlen), also
bleibt der Beweis.

Und der Beweis muss **ihn** betreffen, nicht ein Beispiel. Deshalb läuft die Maschine gratis
einmal an: mit seinem Gesicht, seiner Idee, seinem Budget. Wer sein eigenes Urteil gelesen hat,
kauft nicht mehr „eine Analyse" — er kauft die Fortsetzung von etwas, das schon begonnen hat.

**Der Handel steht VOR der Arbeit** (Hausregel `gratis-nur-mit-muster`): Bevor die erste Zeile
gerechnet wird, steht auf dem Schirm, was gratis ist, was das Muster bedeutet und was danach
kostet. Keine Überraschung nach getaner Arbeit.

---

## 2. Der Trichter, Schritt für Schritt

Alles hinter dem ersten Tipp — auf der Seite selbst steht **kein Eingabefeld**
(`Landingpage.md` §8). Fragen sind Knöpfe, keine Formulare (Skill §4).

```
Karte (du heute / in 2 / in 5)  ·  ein Knopf: „Prüf meine Idee — gratis"
  │
  ├─ 1  FOTO          Datei wählen → Tor-Fenster (E-Mail) → Zuschnitt 4:5 → Speichern
  ├─ 2  IDEE          ein Satz, oder „Noch keine" → wir bauen ihm eine
  ├─ 3  BUDGET        vier Knöpfe, keine Eingabe
  │     (optional: Stadt · Zeit pro Woche — jede Angabe hebt den Genauigkeitsbalken)
  │
  ├─ 4  DER LAUF      60–90 s, er schaut zu: Bilder entstehen, Stimmen erscheinen
  │
  ├─ 5  DAS GRATIS-ERGEBNIS
  │     · seine zwei Bilder, mit Muster
  │     · das Urteil: x von 20 — die Zahl, ohne die Bedingung
  │     · GENAU EIN echter Einwand, wörtlich, von einer Person mit Namen
  │     · die Sorte seiner Idee, ein Wort
  │     · die Schnittkante: was er JETZT NICHT weiss, benannt
  │
  └─ 6  DIE KASSE     {plan} → der volle Lauf, dieselbe Adresse, dasselbe Gesicht
```

### 2.1 Das Foto

Unverändert wie gebaut: Dateiwahl → Tor-Fenster für die Adresse (kein Upload ohne E-Mail,
`eingangstore-email-und-alter`) → `ImageCropper` mit Speichern/Abbrechen (Skill `upload-foto`).

### 2.2 Die Idee

Ein Satz, 200 Zeichen. „Noch keine" bleibt ein gleichwertiger Weg — dann wird die Idee aus dem
gebaut, was er über sich sagt, und im selben Lauf geprüft.

### 2.3 Das Budget — neu, und es ist die wichtigste Angabe nach der Idee

> Skill §5: *„Zu neu ≠ schlecht, sondern teuer: Bekanntmachen kostet Geld, das vorher
> eingeplant sein muss."* · *„Entweder bist du das Produkt, oder du zahlst das Produkt.
> Einen dritten Weg gibt es nicht."*

Das Budget entscheidet, **welche Antwort überhaupt ehrlich ist**. Dieselbe Idee ist mit 2.000 €
Startbudget ein Werbeplan und mit 0 € ein Gesichts-Plan (er selbst als Produkt, täglich, ohne
Werbegeld). Ohne diese Angabe erfindet die Maschine einen Mittelweg, den es nicht gibt.

Vier Knöpfe, nie ein Feld:

| Knopf | was er auslöst |
|---|---|
| **Nichts. Nur ich.** | Der Plan läuft über sein Gesicht: Reichweite statt Werbung, täglich, langsam |
| **Bis 500 €** | Prüfen, nicht bauen: erste Kunden von Hand, kein Aufbau auf Vorrat |
| **Bis 2.000 €** | Ein echter Test ist bezahlbar — der Bericht rechnet ihm vor, wofür |
| **Mehr als 2.000 €** | Die Frage dreht sich um: nicht ob, sondern wo es am schnellsten verbrennt |

Zwei harte Regeln dazu:

1. **Aus dem Budget wird nie eine Einkommenszahl.** „Mit 2.000 € machst du X" ist genau das
   Versprechen, an dem das Stripe-Konto hängt (Skill §6). Das Budget beschreibt nur, **was
   möglich ist**, nie, was herauskommt.
2. **Kein Budget ist kein Ausschluss.** „Nichts. Nur ich." ist die ehrlichste Antwort von allen
   und muss der Knopf sein, der sich am wenigsten nach Verlieren anfühlt.

---

## 3. Die Schnittkante — was gratis ist und was nicht

Das ist der Kern dieses Papiers. Wer sie falsch legt, verschenkt entweder das Produkt oder
verkauft eine Enttäuschung.

| | gratis | bezahlt |
|---|---|---|
| **Bilder** | 2 Bilder (in 2 Jahren, in 5 Jahren), kleinste Auflösung, **mit Muster** | dieselben Bilder sauber, in voller Auflösung |
| **Urteil** | die Zahl: „7 von 20 würden kaufen" | die **Bedingung**, an der das Ja hing |
| **Einwände** | genau EINER, wörtlich, mit Namen und Gesicht | alle, nach Häufigkeit sortiert |
| **Sorte** | ein Wort („Status") | was daraus für seinen Preis, seinen Kanal, sein Tempo folgt |
| **Streit** | eine Zeile, dass es ihn gab | der Streit selbst, Akt I–III |
| **Chat** | — | der Zielgruppen-Chat: er fragt die zwanzig |
| **Plan** | — | Businessplan, Skalierung, die drei nächsten Schritte |
| **Person** | — | Motivation, Energie, Gewohnheiten (§5b des Skills) |
| **Mappe** | — | teilbare Seite + PDF |

### Die drei Regeln der Kürzung

**1 — Gekürzt heisst wahr, nicht angeteasert.** Was er gratis liest, ist echt und stimmt. Kein
verschwommener Text, keine geschwärzten Blöcke, kein „Jetzt freischalten" über einer leeren
Fläche. Ein vorgetäuschter Inhalt ist die eine Sache, die man beim zweiten Blick merkt — und
danach glaubt er auch dem bezahlten Teil nicht.

**2 — Der Schnitt sitzt zwischen Befund und Ursache.** Er erfährt **dass** sieben von zwanzig
kaufen würden und **dass** eine Frau namens Ioana den Preis für Unsinn hält. Er erfährt nicht,
**woran** ihr Ja hing und **was** man dagegen tut. Das ist die Stelle, an der ein Mensch von
selbst weiterlesen will — und die einzige, an der der Kauf sich nicht wie Erpressung anfühlt.

**3 — Die Lücke wird benannt, nicht versteckt.** Unter dem Gratis-Ergebnis steht in klaren
Worten, was jetzt fehlt: *„13 haben Nein gesagt. Ihre Gründe stehen in der vollen Analyse — und
zwei davon kannst du diese Woche abstellen."* Wer weiss, was er nicht weiss, kauft. Wer es nur
ahnt, geht.

---

## 4. Die Bilder — kleinste Auflösung, mit Muster

- **Modell:** `gpt-image-1`, `size=1024x1024` (die kleinste Stufe), `quality=low`.
  Bisher lief der Gratis-Lauf auf `1024x1536`; das kostet mehr und bringt in der 4:5-Karte
  nichts. Ein Bild in dieser Stufe kostet **um einen Cent**, zwei Bilder also rund zwei.
- **Zwei Bilder, nicht eins** (Änderung gegenüber `lib/plan-prompt.ts`): Die Karte auf der
  Seite verspricht drei Stufen — heute, in zwei, in fünf Jahren. „Heute" ist sein eigenes Foto
  und kostet nichts. Wenn die Analyse das Produkt ist, ist das Fünf-Jahres-Bild kein Produkt
  mehr, das man zurückhalten müsste, sondern der Köder, der die Karte füllt.
- **Muster drauf** (`lib/wasserzeichen.ts`, Regel `gratis-nur-mit-muster`): „© luxurybandit.com"
  über die ganze Fläche. Er darf es behalten, herunterladen und verschicken — und genau das
  soll er, denn jedes geteilte Bild ist eine Anzeige, die nichts kostet. Sauber gibt es die
  Bilder im bezahlten Lauf.
- **Keine Marken, keine Zahlen, kein Geld im Bild** (`lib/plan-prompt.ts`, Skill §6).

---

## 5. Die gekürzte Bewertung — wie sie entsteht

Ein einziger Aufruf an ein günstiges Sprachmodell, mit einem festen Ausgabeschema (JSON), damit
nichts frei erfunden zurückkommt:

```
Eingabe:  Idee (ein Satz) · Budget-Stufe · optional Stadt/Zeit
Ausgabe:  { zahl: 7,
            sorte: "Status",
            einwand: { name, alter, ort, satz },
            luecke: "13 haben Nein gesagt — ihre Gründe …" }
```

- **Kurz ist hier kein Kompromiss, sondern die Kostenbremse:** wenige hundert Tokens statt
  zehntausend. Der volle Lauf ist der teure — und der ist bezahlt.
- **Die Zahl muss reproduzierbar wirken.** Zweimal dieselbe Idee darf nicht 7 und dann 18
  ergeben. Also fester Bewertungsrahmen im Auftrag (was zählt: Zahlungsbereitschaft, Alternative
  von heute, Aufwand der Bekanntmachung, Budget-Passung), nicht „bewerte frei".
- **Der Einwand ist eine Person**, kein Satz aus dem Nichts: Name, Alter, Ort, ein Satz in
  seiner Stimme. Eine Person, der man widersprechen will, ist der Grund, weiterzulesen.
- **Nie Schmeichelei.** Auch bei 18 von 20 nennt die Kurzfassung den einen Einwand — sonst
  bekommt der Begeisterte gar keinen Grund zu kaufen.

---

## 6. Der bezahlte Lauf — was die Kasse freischaltet

Reihenfolge wie im Skill §7, plus die drei Stücke, die der Owner heute genannt hat.

1. **Kalter Einstieg** — der härteste Satz aus der Jury, gross.
2. **Das Urteil**, jetzt vollständig: die Zahl **und** die Bedingung, an der das Ja hing.
3. **AKT I · DIE KUNDEN** — zwanzig Käufer aus seiner Idee abgeleitet, mit Gesicht, Alter, Ort.
4. **Der Zielgruppen-Chat** — *neu und der eigentliche Grund zu zahlen.* Er sitzt nicht vor
   einem Bericht, er **fragt die zwanzig**: „Was müsste anders sein, damit du kaufst?"
   Ein Chat mit einer Gruppe, die ihm widerspricht. Regeln dazu in §7.
5. **AKT II · DIE FACHLEUTE** — Praktiker, Behörde, und sein direkter Wettbewerber, der erklärt,
   warum er billiger ist.
6. **Die detaillierte Analyse** — Einwände nach Häufigkeit · was sie zahlen würden · was sie
   heute stattdessen tun · welche Sorte Idee, und was daraus folgt.
7. **Der Businessplan** — kein Bankenformular: Angebot, Preis, erster Kanal, erste zehn Kunden,
   was das kostet, woran man merkt, dass es nicht geht. Auf sein **Budget** gerechnet.
8. **Die Skalierung** — was passiert, wenn es läuft: was zuerst bricht, was er abgeben muss, ab
   wann Werbegeld überhaupt sinnvoll ist. Ohne eine einzige Umsatzzahl.
9. **AKT III · DIE STRASSE** — was Nachbarn und Freunde sagen werden, und was dagegen hilft
   (nicht antworten — ein bezahlter Auftrag).
10. **Motivation & Person** — Körper, Schlaf, Kopf, Lernen, Ruhe; Energie und Gewohnheiten nur
    nach den Regeln aus Skill §5b: fragen statt diagnostizieren, tauschen statt verzichten,
    eine Gewohnheit zuerst, und die sichtbare Grenze („dann brauchst du einen Menschen, keinen
    Plan").
11. **Die Mappe** — teilbare Seite (Hauptsache) + PDF (Anhang).

**Was NIE in die teilbare Seite darf:** alles Selbstgebeichtete — Energie, Gewohnheiten,
Konsum, gescheiterte Versuche. Auch nicht als versteckte Daten im Link (Skill §5b). Wer teilt,
teilt Urteil, Streit und Plan.

---

## 7. Der Zielgruppen-Chat — Regeln

- **Er fragt, sie antworten** — nicht ein Assistent, der ihm zustimmt. Jede Antwort kommt aus
  einer der zwanzig Personen, mit ihrem Namen und ihrer Haltung. Wer im Urteil Nein gesagt hat,
  sagt es hier wieder.
- **Widerspruch ist Pflicht.** Zwei Antworten auf dieselbe Frage dürfen sich widersprechen —
  das ist die Leistung (Skill §2). Ein einiger Chor ist Schmeichelei.
- **Endlich, nicht endlos.** Der Chat gehört zum bezahlten Lauf und hat ein Ende (Anzahl Fragen
  oder Zeit). Kein mitwachsendes Gedächtnis, kein Abo — *pro Analyse bezahlt* (Skill §3). Sonst
  wird aus einem Einmalkauf ein Dauerkunde, der Geld kostet.
- **Was er im Chat herausholt, gehört in die Mappe.** Am Ende steht, was sich durch seine Fragen
  geändert hat — sonst war es Unterhaltung.

---

## 8. Kosten, Deckel und Missbrauch

Ein gratis Lauf, der eine Anzeige aushalten muss (Regel `cost-frugal-paid-apis`):

| Deckel | warum |
|---|---|
| **Ein Gratis-Lauf je Adresse und Gerät**, Tagesdecke | eine gut laufende Anzeige frisst sonst das Budget |
| **Kleinste Bildstufe**, zwei Bilder | ~2 Cent statt ~20 |
| **Kurzbewertung mit festem Schema**, günstiges Modell | wenige hundert Tokens |
| **Kill-Switch wie beim Try-on** (`state.tryonPaused`-Muster) | wenn es entgleist, sofort aus, mit „bald wieder"-Schirm statt Fehler |
| **Adressprüfung vor dem Lauf** (`lib/email-pruefen.ts`) | Wegwerf-Adressen ziehen sonst beliebig viele Gratis-Läufe |
| **Zähler im Admin**: Läufe heute, Kosten heute, Kaufquote | ohne Zahl weiss niemand, ob der Handel aufgeht |

Die Rechnung, die stimmen muss: **Kosten je Gratis-Lauf × Läufe je Kauf < {plan}.** Steht die
Kaufquote nach hundert Läufen unter dem, was das trägt, wandert die Schnittkante — nicht der
Preis (Skill §0: billiger zerstört, was es verkauft).

---

## 9. Was es schon gibt und was fehlt

**Steht:**
- Themenseite mit Karte, Preis-Chip, Vorspann (`app/themes/luxurybandit-plan`)
- Trichter mit Foto, Tor-Fenster, Zuschnitt, Idee-Frage (`components/PlanFunnel`)
- Gratis-Bild über `/api/free-preview` (gpt-image-1, low)
- Kasse über `/api/plan-checkout` (Guthaben zuerst, dann Stripe, idempotent je `laufId`)
- Bildaufträge und Kulissen (`lib/plan-prompt.ts`), Texte (`lib/plan-i18n.ts`)

**Fehlt — und das ist der Bau:**
1. **Budget-Knöpfe** im Trichter (+ Text in `plan-i18n`, sieben Sprachen)
2. **Zweites Bild** (5 Jahre) und Umstellung auf `1024x1024`
3. **Muster** auf den Gratis-Bildern
4. **Kurzbewertung** — neue Route `/api/plan-kurz`, festes JSON-Schema
5. **Das Gratis-Ergebnis** als Ansicht: Bilder, Zahl, EIN Einwand, die benannte Lücke
6. **Auftragsspeicher** (`laufId`) — ohne ihn kann die Kasse nichts stempeln, und nach der
   Zahlung ist der Lauf verloren, sobald jemand den Browser schliesst
   (`paid-jobs-must-survive-the-browser`: der Server liefert nach, der Browser zeigt nur an)
7. **Der volle Lauf**: Jurys erzeugen, Chat, die elf Kapitel, Mappe + PDF
8. **Die teilbare Seite** mit „made by luxurybandit.com"

---

## 10. Die Reihenfolge — und die Regel, die dagegen steht

Am 07.08.2026 früh gilt: **ein Produkt zuerst, und das ist der Kuss** — nichts Neues bauen, bis
er drei echte Handy-Käufe fehlerfrei übersteht (Erinnerung `ein-produkt-zuerst`). Dieses Papier
ist ein Konzept, kein Baubefehl; es liegt bereit, bis der Owner es aufruft.

Wenn gebaut wird, dann in dieser Reihenfolge — jede Etappe für sich vorzeigbar:

| Etappe | Ergebnis |
|---|---|
| **1** | Budget-Knöpfe + zweites Bild + Muster → der Gratis-Teil ist vollständig, ohne Text |
| **2** | Kurzbewertung + Gratis-Ergebnis → **der Trichter verkauft**, auch ohne bezahlten Lauf |
| **3** | Auftragsspeicher + Kasse stempelt → ein Kauf überlebt den Browser |
| **4** | Der volle Lauf, Kapitel für Kapitel; Chat zuletzt |
| **5** | Teilbare Seite + PDF |

Nach Etappe 2 ist der Handel prüfbar: Läuft eine Anzeige darauf, weiss man nach hundert Läufen,
ob jemand für die Fortsetzung zahlt — **bevor** die Fortsetzung gebaut ist. Das ist genau die
Reihenfolge, die dieses Produkt seinen Kunden predigt: erst fragen, dann bauen.

---

## 11. Entschieden am 07.08.2026 — und was noch offen ist

Der Owner hat das Papier durchgegangen und abgenickt:

| | Entscheidung |
|---|---|
| **Bilder** | **alle** — beide erzeugten Stufen gratis, `1024x1024`, `quality=low`, mit Muster. Sauber gibt es sie im bezahlten Lauf. Damit ist die Festlegung vom 05.08. („das Fünf-Jahres-Bild gehört hinter die Kasse") überholt: Sie stammt aus der Zeit, als das BILD das Produkt war. |
| **Budget** | die vier Knöpfe wie in §2.3 |
| **Schnittkante** | die Tabelle in §3 gilt, samt den drei Regeln der Kürzung |
| **Kurzbewertung** | wie in §5: ein Aufruf, festes Schema, EIN Einwand mit Namen |
| **Businessplan** | auf sein Budget gerechnet |
| **Skalierung** | ohne eine einzige Umsatzzahl |
| **Kostendeckel** | wie in §8: ein Gratis-Lauf je Adresse und Gerät, Kill-Switch, Adressprüfung, Zähler im Admin |

**UND DIE ADRESSE IST DIE BEDINGUNG** (Owner: „mit E-Mail-Adresse, sonst gibt es keine
Auswertung gratis"). Das Tor steht nicht nur vor dem Upload, es steht vor dem **Ergebnis**:
Ohne geprüfte Adresse läuft die Kurzbewertung gar nicht erst an. Sie ist der Gegenwert für das
Verschenkte — das Einzige, was bleibt, wenn er nicht kauft. Geprüft wird mit
`lib/email-pruefen.ts` (Wegwerf-Adressen, Tastatur-Gehämmer), sonst zieht ein Besucher beliebig
viele Gratis-Läufe.

### Noch offen

1. **Der Zielgruppen-Chat: wie lang?** Feste Zahl Fragen (z. B. 10) oder Zeitfenster? Muss ein
   Ende haben (§7), die Form ist offen.
2. **Was steht in der Mail** mit den Gratis-Bildern — mit Kaufknopf darin oder ohne?

---

Verwandt: Skill `business-analyse` (die Regeln) · `Landingpage.md` §8 (keine Formulare) ·
Skill `upload-foto` · Skill `bezahlung` · Erinnerungen `gratis-nur-mit-muster`,
`cost-frugal-paid-apis`, `paid-jobs-must-survive-the-browser`, `ein-produkt-zuerst`.
