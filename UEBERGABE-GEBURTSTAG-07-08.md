# Übergabe — Geburtstags-Trichter, Stand 07.08.2026 abends

Für den neuen Chat. Lies zuerst diese Datei, dann die drei Skills `bezahlung`,
`ci-design`, `card`. Alles hier ist gemessen, nicht vermutet — wo etwas ungeprüft ist,
steht es ausdrücklich dabei.

---

## 1 · Was das Produkt ist

Ein Geburtstagsvideo, **4,99 €** (`GEBURTSTAG_CENTS`). Der Käufer filmt sich selbst, liest
einen Satz vor — heraus kommt ein Video, in dem er festlich gekleidet mit einer Torte
dasteht und den Glückwunsch **mit seiner eigenen Stimme** spricht.

**Der Trichter hat genau vier Dinge** (Owner: „Das ganze ist zu kompliziert. Wir brauchen
nur das."):

```
Name → Look → Selbst aufnehmen (mit dem Satz) → Generieren
```

Alles auf **einem** Bildschirm. Der Owner hat die Look-Reihe zuerst gar nicht gefunden,
„weil das ausser screen war" — was man scrollen muss, gibt es nicht.

---

## 2 · Die Kette

```
Selfie-Video (Browser)
  ├─ Standbild per Canvas  →  OpenAI gpt-image-1.5 /images/edits  →  Avatar (~6 ct)
  └─ Tonspur               →  HeyGen POST /v3/videos (engine avatar_iv, ~4 ct/s)
                                        ↓
                              hg:<id> → Status über /api/generate-tryon-video
```

**Warenkosten ~26 ct bei 4,99 € Verkauf.**

- `app/api/geburtstag-video/route.ts` — startet die Kette, gibt `hg:`-Kennung zurück
- `lib/geburtstag-looks.ts` — die Looks, jeweils Kachelbild **und** Prompt in einer Zeile
- `components/KissFunnel.tsx` (`variant="birthday"`) — der Trichter
- `app/api/kiss-deliver` — Nachliefer-Wachhund, kennt `look` und `stimme`

HeyGen nimmt eine **Videodatei** als `audio_url` und zieht den Ton selbst heraus — am
07.08. bewiesen. Deshalb reicht eine Aufnahme für Bild *und* Stimme.

---

## 3 · Die drei Looks

| id | Name | Bild | Besonderheit |
|---|---|---|---|
| `blacktie` | Black Tie | `/Birthday/birthday-set-schoko.jpg` | **Vorgabe.** Der abgenommene Look, aus ihm stammt das Beispielvideo der Landingpage |
| `konfetti` | Gold & Confetti | `/Birthday/look-konfetti.jpg` | Owner-Wahl aus sechs Kandidaten („Bild 3") |
| `skyline` | Skyline | `/Birthday/look-skyline.jpg` | Selfie-Haltung nach Owner-Vorlage; **zeigt einen Mann** |

**Das Prompt-Gerüst steht nur EINMAL** (`geburtstagAvatarPrompt`). Zwei Sätze darin sind
Wachen, die kein Look vergessen kann:

1. *„one single image, not a collage, not a split image, no second person"* — ohne sie
   liefert das Modell ein **zweigeteiltes Bild**, links Frau, rechts ein fremder Mann.
   Deshalb nennt kein Look ein Geschlecht; die Kleidung soll „zu **dieser** Person" passen.
2. *„full coverage guaranteed"* — ohne sie weist OpenAI als `sexual` ab.

Ein neuer Look beschreibt nur **Torte, Kleidung, Umgebung, Bewegung** — und optional
`haltung`, wenn die Vorgabe („Torte in beiden Händen") nicht passt (Selfie: eine Hand hält
die Kamera).

---

## 4 · Was BEWIESEN ist

- Bild-Kette mit Frauen- **und** Männerfoto: ein Bild, richtige Kleidung, kein Doppelbild
- Look-Wahl schaltet um, Kacheln laden, nichts springt beim Antippen
- Aufnahme läuft, Standbild wird gezogen, Kaufknopf wird frei (Owner am eigenen Handy)
- Die Absage-Wache greift: schwarze Kamera → rote Zeile, Kaufknopf bleibt zu
- Sieben Sprachen durchgesehen, Rumänisch/Italienisch/Französisch/Portugiesisch korrigiert

## 5 · Was NICHT bewiesen ist — hier weitermachen

1. **Kein Look ist je als VIDEO durchgelaufen.** Weder Gold & Confetti noch Skyline. Der
   nächste Schritt ist ein echter Lauf über die ganze Kette (~26 ct).
2. **Das Selfie-Video als Bild- und Tonquelle ist nie durch HeyGen gelaufen.** Bewiesen ist
   nur, dass `audio_url` eine Videodatei annimmt — nicht, dass unsere Browser-Aufnahme
   (480×640, `video/mp4` bzw. `video/webm`) dort sauber ankommt.
3. **Der Kauf ist nie bis zum fertigen Video durchgelaufen.** Der Owner hat 60 € geladen;
   der Anschlusskauf war kaputt (siehe §6) und ist erst seit `b2576f2` repariert.
4. Die Bewegungs-Prompts (`bewegung`) der zwei neuen Looks sind ungetestet.

---

## 6 · Die Fallen, die uns heute Zeit gekostet haben

**Bezahlen** (Skill `bezahlung` §1 — lesen, bevor man dort etwas anfasst)

- Der Aufladewähler geht in `generate()` auf, **bevor** ein Auftrag (`genId`) entsteht.
  Nach der Aufladung darf man deshalb nicht `unlock("once")` rufen — das ist ein Kauf für
  eine Auftragsnummer, die es nicht gibt. `nachAufladungWeiter()` entscheidet richtig und
  wird von **beiden** Rückwegen benutzt (Popup *und* Seiten-Rückkehr).
- `WERBE_GUTSCHRIFT_CENTS` las früher `AUFLADE_STUFEN[0]`. Wer die Leiter ändert, ändert
  sonst still das Werbegeschenk an Bestandskunden — echtes Geld.
- Die Leiter beginnt bei **5 €**; angeboten wird nur, was zusammen mit dem vorhandenen
  Guthaben für dieses Video reicht.

**Browser**

- Safari spielt Video aus einer `data:`-Adresse **nicht** ab (verlangt Byte-Bereiche).
  Deshalb zwei Adressen: Daten-URL zum Server, `blob:` zum Anschauen.
- Safari gibt die Kamera auf `http://localhost` nicht heraus → **immer über HTTPS testen**,
  also auf luxurybandit.com.
- Einen Medienstrom nie per `setTimeout` anhängen — das Element existiert vielleicht noch
  nicht. Ein Effekt läuft nach dem Zeichnen.
- Die Datei reist als Daten-URL im JSON-Körper, und Vercel nimmt nur ~4,5 MB. Deshalb
  480×640 bei 700 kbit/s, Deckel bei 12 s. In 720p wird der Auftrag am Tor abgewiesen.

**Sprache**

- „Înregistrează-te" (ro) und „Registrati" (it) heißen **„registriere dich"**. Auf dem
  größten Knopf der Seite las ein rumänischer Käufer „Konto anlegen". Bei jedem neuen Wort
  prüfen, ob es in einer der sieben Sprachen etwas anderes heißt.

**CI**

- Eine Auswahl wechselt die **Farbe**, nie Größe oder Position (docs/ci-farben-typo-buttons.md
  §2a). Ein `ring` liegt außerhalb der Fläche und lässt die gewählte Kachel wachsen.
- Ein `<button>` zentriert seinen Inhalt senkrecht — bei unterschiedlich langen
  Beschriftungen `items-start` an die Reihe.

---

## 6a · Der Fall „ich habe 60 € aufgeladen" — nachgeprüft, nicht vermutet

Der Owner meldete am 07.08. abends, er habe 60 € geladen und der Chip stehe auf 0,02 €.
**Gemessen** (`readGuthabenCents`, nur gelesen):

| Adresse | Stand |
|---|---|
| tigl10722@gmail.com | 0,02 € |
| geza1972@gmail.com | 8,01 € |

**Stripe-Sitzung `cs_live_b1AdF2JgC0654PIh`, 14:26:01:** `payment_status: paid`,
**`amount_total: 0,00 €`**, `metadata.cents: 6000`.

→ Es floss **kein Geld**. Ein 100-%-Gutscheincode war im Spiel. `app/api/checkout-status`
schreibt bewusst nur den GEZAHLTEN Betrag gut (`gezahlt = amountTotal`), sonst ist jeder
kursierende Code eine offene Kasse — genau so entstanden am 03.08. Phantom-Guthaben von
9,99 € auf zwei Konten. **Das System hat richtig gehandelt.**

**Was fehlt, ist das Wort dazu:** Der Kunde sieht „bezahlt" und einen unveränderten
Kontostand, ohne Erklärung. Hier gehört eine Zeile hin — „mit deinem Gutschein waren es
0,00 €, deshalb kein Guthaben" —, sonst sieht es aus wie ein verschwundener Betrag.

**Zweiter Fund derselben Spur:** Um 14:26:27 legte der Server eine Kasse über **15,00 €**
an, `kind: kiss-video` — für einen **Geburtstags**-Auftrag zu 4,99 €. Sie blieb unbezahlt,
weil der `nurGuthaben`-Wächter in `unlock` danach zuschlägt. Aber:

- Die Sitzung entsteht **vor** dem Wächter (der `fetch` steht davor) — falscher Preis,
  falsches Produkt, jedes Mal eine Leiche in der Stripe-Liste.
- Der Wächter lautet `!isStaff`. Für **Personal ist er ausgeschaltet** — der Owner selbst
  bekäme also die 15-€-Kasse zu sehen.

Beides ist ungefixt. Es ist der erste Punkt für den neuen Chat.

## 7 · Offene Punkte am Rand

- Der Trichter berechnet für den Geburtstag weiterhin `refOutfit` (`alsDatenUrl` auf das
  alte Set) — die Kette benutzt es nicht mehr. Unnötige Arbeit, kein Fehler.
- `.claude/skills/` ist in `.gitignore`: Regeln gehören zusätzlich nach `docs/`, sonst
  bleiben sie auf einem Rechner.
- Bella ist aus dem Katalog ausgeblendet (`AUSGEBLENDET` in `app/themes/page.tsx`), nicht
  gelöscht.

## 8 · Arbeitsweise, die der Owner erwartet

Ein Fehler pro Freigabe, nach jeder funktionierenden Änderung ein Commit, keine fremden
Seiten anfassen. **Vor jedem Push lokal bauen** (`npx next build` in einem abgetrennten
Arbeitsbaum) — ein roter Deploy hat heute schon einmal Zeit gekostet. Nach dem Deploy live
gegenprüfen und das Ergebnis mit Zahlen zeigen, nicht behaupten.

Achtung: An `components/CI.tsx`, `components/CIMuster.tsx` und `components/EinladungAnsicht.tsx`
arbeitet parallel ein zweiter Chat. Dort **selektiv committen** (HEAD-Fassung + nur die
eigenen Zeilen), sonst schickt man fremde, halbfertige Arbeit mit.
