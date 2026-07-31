# Die Startseite als AI Marketplace — Entscheidungspapier

Stand 31.07.2026. Kein Code, eine Entscheidung. Anlass: Owner — *„passe jetzt die ganzen Inhalte
für die Homepage an, ich meine den Text. Mach das Konzept dafür. Es ist jetzt ein AI Marketplace."*

Die Startseite ist `/themes` — `app/page.tsx` leitet dorthin um. Alles unten meint diese Seite.

---

## 1. Der Befund

Der Text der Startseite beschreibt ein anderes Produkt als das, das läuft. Nachgelesen, nicht
vermutet:

| Was oben steht | Was wirklich ist |
|---|---|
| „LuxuryBandit ist ein **Influencer-Marktplatz** mit KI-Influencerinnen." | Der Kunde macht **sein** Video mit **seinem** Foto. Die Models sind die Besetzung, nicht das Produkt. |
| „Bei LuxuryBandit **schreibt dir** dieselbe KI-Influencerin **morgens** …" | Es gibt keine tägliche Nachricht mehr. Owner heute: „Ich versende auch keine Wetternews mehr jeden Tag." |
| „Wetter am Morgen: **jeden Morgen** eine Nachricht" | Dasselbe — die Zeile verspricht etwas, das nicht mehr passiert. |
| „Urlaub mit Bella: sie bringt **täglich** Videos" | Dasselbe. |
| „**Einmalig auf der Welt** … die **teuersten** KI-Video-Modelle der Welt" | Zwei Superlative, die niemand nachprüfen kann — und die wir im Streitfall belegen müssten. |
| „Ohne Abo kostet ein Video {once}." | Stimmt nicht mehr überall: Bei der Hochzeit gibt es **nur** das Abo. |

**Die Überschrift und der Einleitungssatz sind heute schon nachgezogen** („Wähle ein Thema. Mach
dein Video."). Darunter steht die alte Welt weiter — und genau dort liest der Zweifler nach,
bevor er zahlt.

---

## 2. Die Entscheidung: was LuxuryBandit jetzt ist

> **LuxuryBandit ist ein KI-Marktplatz, auf dem du selbst im Video bist.**
> Du lädst ein Foto hoch, wählst ein Thema — und bekommst ein Video mit dir darin.

Drei Dinge folgen daraus, und sie ziehen sich durch jeden Satz auf der Seite:

**a) Der Held ist der Kunde, nicht das Model.** „Sie trägt", „sie schreibt dir", „sie reist für
dich" war die alte Erzählung. Die neue heißt: **du** bist im Bild. Das ist keine Kosmetik — es
ist der Unterschied zwischen Zuschauen und Mitmachen, und die Zahlen sagen, dass Mitmachen
gewinnt: Von 1019 Ereignissen in sieben Tagen entfielen 639 auf den Kuss, also auf das Thema mit
dem eigenen Foto.

**b) Die Models sind die Besetzung.** Sie bleiben wichtig — man wählt sie aus wie man einen
Schauspieler wählt. Aber sie sind nicht mehr das Angebot.

**c) Nichts kommt mehr von allein.** Kein Morgengruß, keine tägliche Lieferung. Der Kunde
kommt, wenn er etwas machen will. Das ist ehrlicher und macht die Seite auch einfacher: Wir
müssen nichts mehr versprechen, das ein Zeitplan halten muss.

---

## 3. Die Ordnung der Kacheln

Zwölf Kacheln sind viel. Wer scrollt, entscheidet nach den ersten vier. Vorschlag nach dem
einzigen Maßstab, den wir haben — was die Leute wirklich anklicken:

1. **Küsse jedes Model** — 63 % des Verkehrs. Steht schon vorn, bleibt vorn.
2. **Hochzeitseinladung** — das einzige Thema, das sich selbst weiterverschickt.
3. **Urlaub mit deiner Traumfrau** — dein Foto, dein Moment.
4. **Überrasche ihn** — dasselbe für Frauen.

Danach: Idol, Geburtstag, Try-On, Lingerie, Luxury Looks, Tenerife, Chat, Wetter.

**Die zwei letzten gehören nach unten**, nicht weg: Chat und Wetter sind das, was übrig bleibt,
wenn man nichts erschaffen will. Sie sind gratis und ein guter Einstieg — aber sie erklären das
Produkt nicht mehr.

---

## 4. Die neuen Texte

Entwürfe zur Entscheidung. Deutsch hier, die übrigen sechs Sprachen sinngemäß.

### Was ist LuxuryBandit?

> LuxuryBandit ist ein KI-Marktplatz für Videos, in denen **du selbst** vorkommst. Du lädst ein
> Foto hoch, wählst ein Thema — Kuss, Hochzeitseinladung, Urlaub, Geburtstag — und bekommst ein
> Video mit dir darin. Direkt im Browser, ohne App. Die KI-Models sind die Besetzung: Du wählst
> sie aus, wie man jemanden für eine Rolle wählt.

### Was kannst du damit machen?

Jede Zeile fängt beim Kunden an, nicht bei ihr:

- **Küsse jedes Model** — dein Foto und ihres, ein Video mit euch beiden.
- **Eure Hochzeitseinladung** — ihr beide im Video, dazu eine eigene Einladungsseite mit
  Zusagen, Neuigkeiten und Gästegruppe.
- **Urlaub mit deiner Traumfrau** — du wählst den Moment: Strand, Kaffee, Tanzen.
- **Überrasche ihn** — dein Foto, ein privates Video, das nur er öffnen kann.
- **Dein Idol mit dir** — ihr beide auf einer Party.
- **Geburtstagsvideo** — sie gratuliert laut, mit Namen.
- **Anprobieren** — Outfit und Model wählen, sie trägt es im Video, von allen Seiten.
- **Chatten** — gratis, wann du willst.

### Was kostet es?

> Das erste Bild ist gratis, in jedem Thema. Ein Video kostet **{once}** einzeln, oder du nimmst
> das Abo: **{price}** im Monat mit **{videos}** Videos über alle Themen zusammen, jedes weitere
> **{extra}**. Die Hochzeitseinladung läuft nur im Abo — dort halten wir eure Seite, die
> Gästeliste und die Gruppe am Laufen, solange ihr sie braucht. Monatlich kündbar.

Preise stehen weiter **nur** in `lib/pricing.ts`; hier stehen Platzhalter.

### Gut zu wissen

Bleibt inhaltlich, wird aber ergänzt um den Satz, der heute fehlt und den ein Zweifler sucht:

> Deine Fotos bleiben privat: Sie werden nie veröffentlicht und keinem anderen Nutzer gezeigt.
> Für Videos mit eigenen Fotos wirst du vorher gefragt und bestätigst, dass du das Foto
> verwenden darfst.

---

## 5. Was NICHT mehr behauptet wird

**Keine tägliche Lieferung.** Kein „jeden Morgen", kein „täglich", kein „Daily"-Abzeichen. Ein
Versprechen, das beim zweiten Besuch sichtbar nicht gehalten wird, kostet mehr, als es beim
ersten bringt.

**Keine Superlative, die wir nicht belegen können.** „Einmalig auf der Welt" und „die teuersten
KI-Video-Modelle der Welt" fliegen raus. Nicht aus Zimperlichkeit: Eine Werbeaussage, die man
nicht beweisen kann, ist angreifbar, und sie wirkt beim Leser ohnehin wie Marktschreierei. An
ihre Stelle kommt der konkrete Unterschied:

> Wir setzen die Video-Modelle ein, die **Gesicht und Bewegung halten**. Billigere verlieren
> beides — und dann ist es nicht mehr dein Gesicht.

Das ist überprüfbar, es ist das echte Kaufargument, und es erklärt nebenbei den Preis.

---

## 6. Was das für die Suche heißt

Die Seite zielte bisher auf „ai influencer marketplace" und „ai model generator" — Wörter, mit
denen große Anbieter kämpfen und die zu Zuschauern führen. Die neuen Wörter beschreiben, was
jemand tippt, der etwas machen will:

- Video mit eigenem Foto · Foto in Video verwandeln
- Hochzeitseinladung Video · digitale Hochzeitseinladung
- Kuss-Video mit eigenem Foto
- Geburtstagsvideo mit Namen

**Der Seitentitel** trägt „AI marketplace" statt „AI influencer marketplace" — das ist heute
schon geändert; die Beschreibung zieht nach.

---

## 7. Was gebaut wird

**Gebaut:**
1. Die vier Textblöcke (Was ist / Was kannst du / Was kostet / Gut zu wissen), acht Sprachen
2. Die Kachel-Beschreibungen: jede beginnt beim Kunden („dein Foto"), nicht bei ihr
3. Reihenfolge der Kacheln nach §3
4. Seitenbeschreibung und Vorschautext für geteilte Links

**Nicht gebaut:**
- Kein neues Layout. Es ist eine Textänderung; wer daraus einen Umbau macht, hat am Ende beides
  halb fertig.
- Keine Kachel wird gelöscht. Chat und Wetter rutschen nach unten und bleiben gratis.

---

## 8. Woran wir merken, dass es falsch war

**Tor 1 — die nächsten 200 Besucher der Startseite.** Bedingung: Der Anteil, der auf **irgendein**
Thema tippt, sinkt nicht. Gerissen: Der neue Text erklärt schlechter als der alte, und dann
gehört der alte Einleitungssatz zurück.

**Tor 2 — die nächsten 30 Kuss-Trichter.** Bedingung: Der Anteil, der ein Foto hochlädt, steigt
oder bleibt gleich. Das ist der Schritt, den die neue Erzählung ankündigt („du bist im Video");
wenn er nicht besser wird, hat die Erzählung nichts gebracht.

Was **nicht** zählt: ob der Text uns besser gefällt.
