# Übergabe — Kuss-Trichter, Stand 03.08.2026 (für den nächsten Chat)

> **Owner am Ende der Sitzung:** „ich habe dir so viele aufgaben gegeben, nicht viel
> draus gemacht."
>
> Das stimmt für den Teil, der zählt: **Es ist noch kein einziges echtes Video durch die
> Kette gelaufen.** Viel Zeit ging in Reparaturen, in Dev-Server-Ärger (den ich selbst
> verursacht habe, indem ich `.next` unter laufenden Servern löschte) und in einen
> Fehler, den ich zu spät gefunden habe. Diese Datei ist die ehrliche Bestandsaufnahme,
> damit der nächste Chat nicht bei null anfängt.

---

## 1. Der Fehler, der alles blockierte (behoben, aber ungetestet im Echtlauf)

**Symptom (Owner):** „es wird gar kein Video erzeugt", „der ist nur am Rendern, und ich
sehe keinen Auftrag an Pixverse", „ein mega Fehler".

**Ursache:** Browser und Server waren sich uneinig, wer bezahlt hat.
- `components/KissFunnel.tsx` setzt `bezahlt = true`, sobald die Adresse **Video-Credits**
  hat (`d.abo || d.left > 0`) — und überspringt dann die Kasse.
- `app/api/generate-tryon-video/route.ts` kannte nur **zwei** bezahlte Wege: Auftrag mit
  `paid: true` oder laufendes Abo. **Credits prüfte sie nie.**
- Solange die Gratis-Grenze bei 1/Tag stand, fiel das nicht auf (die Leute rutschten als
  Gast durch). Seit `FREE_VIDEO_GEN_PER_DAY=0` bekommt jeder Credit-Besitzer `429`.

**Fix:** In der Route wird bei unbezahltem Auftrag zuerst ein Credit der Adresse
verbraucht, dann das Abo geprüft. Belegt am laufenden Server: derselbe Auftrag,
0 Credits → `429`, 1 Credit → Auftrag geht bis Pixverse durch.

**Was mein Verfahren falsch machte:** Ich hatte die Kette am Vortag mit **abgefangenen
APIs** (Stubs) „bestätigt" — der Stub sagte immer „ok", die echte Zahlungsprüfung lief in
dem Test nie mit. **Regel für den nächsten Chat: Zahlwege nie gegen Stubs verifizieren.**

---

## 2. Was OFFEN ist

### 2a. Ein echter Lauf, Ende zu Ende — die wichtigste offene Aufgabe
Noch nie durchgelaufen: Fotos → Kachel → Klick → Aufladung → Abbuchung → **Pixverse** →
Video in der Karte. Kostet echtes Geld, deshalb muss der Owner ihn machen.
Zu beobachten dabei:
- Kommt ein Pixverse-Auftrag zustande? (Kontrolle: `video-log.json`, Feld `videoId`)
- Sieht das Video aus wie die Vorlage? (siehe 2c)

### 2b. Rendern in der Karte + Prozentanzeige — **nicht gebaut**
Owner: „kannst du nicht in der Karte oben rendern lassen und Prozente hinschreiben?"
Heutiger Zustand: Der Radar existiert **doppelt** — als Overlay in der Karte
(`KissFunnel.tsx`, Bedingung `payBusy || (bezahlt && !wahl) || videoBusy`) **und** im
Ergebnisbereich darunter. Prozente gibt es nirgends; der Poll läuft in 4-s-Schritten
(90 Durchgänge = 6 min Deckel), daraus ließe sich ein ehrlicher Fortschritt ableiten.
**Zu tun:** unteren Radar für Kuss abschalten, Prozentzahl in die Karte.

### 2c. Lingerie-Kette nie live gelaufen
Die vier 3,99-Vorlagen (`public/Kisslingerie`) sind verdrahtet: FASHN zieht sie in das
Wäschestück der Vorlage um, dann Pixverse mit dem Owner-Prompt. **Kein einziger echter
Lauf.** Unklar bleibt:
- Trifft das Ergebnis die Stimmung der Beispielvideos?
- Stimmt die Zuordnung Vorlage → Wäschestück? (Grau vs. Silber war geraten —
  `lib/kuss-szenen.ts`, Feld `garment`, eine Zeile je Vorlage)

### 2d. Doppelter FASHN-Lauf im Randfall
Ist der alte Auftrag verbraucht, läuft das Anziehen zweimal (einmal vor der Server-Absage,
einmal im frischen Lauf). Kostet einen zusätzlichen FASHN-Lauf. Sauber wäre, die
Verbraucht-Prüfung **vor** das Anziehen zu ziehen.

### 2e. Werbetexte stimmen nicht mehr
`app/themes/page.tsx` (alle Sprachen) und `app/themes/kiss/page.tsx:151`: „Das erste Bild
ist gratis, in jedem Thema" / „The first picture is free". Für Kuss und Hochzeit falsch,
seit es kein Gratis-Bild mehr gibt. (Wurde als eigene Hintergrundaufgabe angelegt.)

### 2f. Phantom-Guthaben aus dem Gutschein-Loch
`gl12341234123@gmail.com` und `luxurybandit.kette@gmail.com` tragen je **9,99 €**, die nie
bezahlt wurden (100-%-Gutschein schrieb den Bestellwert statt des Zahlbetrags gut). Das
Loch ist gestopft, die Gutschriften liegen noch da. Bereinigen über
`/api/video-pack` (Credits) bzw. direkt im Zustand (Euro) — braucht Owner-Freigabe.

### 2g. Zwei Testadressen könnten in der Abonnentenliste stehen
`test987654321@gmail.com` und ein gl123-Probeeintrag — entstanden bei Tests über die echte
`kiss-claim`-Route. Vor dem nächsten Rundbrief prüfen.

---

## 3. Was heute fertig wurde (alles live)

| Bereich | Stand |
|---|---|
| **Kein Gratis-Bild** beim Kuss, Guthaben statt Einzel-Stripe | live |
| **8 Szenen-Kacheln** mit Preis: 4× {once}, 4× Lingerie {lingerie} | live |
| **Wäsche-Schritt** bei Lingerie, Stück aus dem Beispielvideo vorgewählt | live |
| **Lupe** (weiß) → Vollbild mit laufendem Video je Kachel | live |
| **Aufladung in zwei Stufen** 4,99 / 9,99 mit Wähler, Server-Whitelist | live |
| **Konto + Galerie im Header** auf jeder Seite, nicht bei Models | live |
| **Upload-Tor**: keine Fotos ohne E-Mail; Nacktheit abgewiesen (Erwachsene abgelegt fürs Admin, Kind+nackt nie) | live |
| **Gratis-Video-Sperre repariert** (`genLog` überlebte den state-Merge nie → Grenze wirkungslos) | live |
| **Video-Protokoll** (`video-log.json`): wer, wann, welche Seite, bezahlt, Pixverse-Nummer | live |
| **Gutschein-Loch**: gutgeschrieben wird der bezahlte Betrag, nicht der Bestellwert | live |
| **Abo beim Kuss abgeschafft** (Knopf, 2,99-Nachkauf, Kontingent-Zeile, SubscribeCta) | live |
| Anmeldung per Kuss-Adresse, Abmelden → `/themes` | live |

---

## 4. Zahlen (alle aus `lib/pricing.ts`, nie im Text tippen)

| Konstante | Wert | Wofür |
|---|---|---|
| `ONCE_CENTS` | 1,49 € | ein normales Kuss-Video |
| `LINGERIE_CENTS` | 3,99 € | Lingerie-Video (FASHN + Pixverse) |
| `TOPUP_CENTS` | 4,99 € | kleine Aufladung (≈3 Videos) |
| `TOPUP_GROSS_CENTS` | 9,99 € | große Aufladung (≈6 Videos) |
| `FREE_VIDEO_GEN_PER_DAY` | **0** (Vercel + .env.local) | keine Gratis-Videos mehr |

---

## 5. Warum die 9,99 kleiner wurden — die Daten dazu

In der Nacht zum 03.08. haben **drei echte Besucher** beide Fotos hochgeladen, auf
„Video erzeugen" getippt, die 9,99-€-Kasse geöffnet — und **alle drei dort abgebrochen**
(`grygastefan@wp.pl` 03:38, `jackenles.ky44@hotmail.fr` 04:17,
`ionutmitrica1987@gmail.com` 04:35). Beworben war das Video mit 1,49 €. Daraufhin die
kleine Stufe 4,99 € und der Wähler.

**Nicht auszuschließen:** Ein Teil dieser Abbrüche geht auf den Fehler aus Abschnitt 1
zurück — wer Credits hatte, sah „Bezahlt" und bekam dann nichts. Der nächste echte Lauf
zeigt, ob die Kasse allein das Problem war.

---

## 6. Fallen, die diese Sitzung gekostet haben

- **`.next` nie löschen, während ein Dev-Server läuft** — und nie zwei `next dev` im selben
  Ordner (sie überschreiben sich, Bündel timeouten, die Seite bleibt weiß). Zweite Sitzung
  im selben Ordner: `LB_DIST_DIR=.next-dev2 npx next dev -p 3001`.
- **`videoCredits`-Unterfelder** müssen an **beiden** Stellen in `writeTryThisLookState`
  stehen (Merge + Serialisierer), sonst werden sie bei jedem Speichern still gelöscht.
  Genau so starb die Gratis-Sperre.
- **Zahlwege nie gegen Stubs testen** (siehe Abschnitt 1).
