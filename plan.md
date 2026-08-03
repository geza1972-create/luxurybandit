# Plan — Hochzeitseinladung zahlungspflichtig machen (Stand 02.08.2026)

> **03.08.2026 — WEITERGEZOGEN:** Der Kuss-Trichter hat seither eine eigene, ausführliche
> Übergabe: **[UEBERGABE-KUSS-03-08.md](UEBERGABE-KUSS-03-08.md)**. Dort steht, was offen
> ist (vor allem: **noch kein einziger echter Video-Lauf**), welcher Fehler die Erzeugung
> blockierte und welche Fallen diese Sitzung gekostet haben. Der Plan hier bleibt für die
> Hochzeit gültig.

## Auftrag, wörtlich (Owner 01.08.2026)

> „wir müssen was vorbereite und zwar die hochzeitseinladung. Es kostet von
> angang an 1,49 pro video aber konto aufladung mit 9,99€. Dafür dürfen sie
> einige Videos generieren bis das Budget erschöpft ist. das haben wir schon
> vorbereitet. Sie werden nichts testetn dürfen kostenlos. Du kannst auch die
> Preview sharebar machen damit sie wissen was sie bekommen. Chat muss
> funtionieren. Ich will das sehen ob es funktioniert. Ich werde ein kaufen und
> sharen mal sehen ob chat funktioniert, leute zusagen können."

Dazu, in derselben Sitzung:
- „bei Kiss haben mit credits für 9,99" / „ab der zweiten versuch" → beim Kuss
  bleibt der ERSTE Versuch gratis, ab dem zweiten zahlt das Guthaben.
- „sie können es für 1,49 behalten aber ab dem zweiten monat müssen sie abo
  bezahlen für 24 im monat wenn sie die karte behalten wollen" → Probezeit
  7 → 30 Tage, danach Abo zum Weiterbetrieb der Karte.
- „Abstand zur karte" → Korrektur einer Formatierung im Reaktivierungs-Block.
- „ich sehe chat und einladungssliste auf deiser seite nicht" + „user muss
  wissen sofort was er bekommt" → Demo von Zusagenliste und Gruppenchat direkt
  auf der öffentlichen Hochzeits-Landingpage, nicht erst nach dem Kauf.
- Mit Screenshot der LIVE-Seite `luxurybandit.com/themes/wedding?code=BELLA&src=fb`:
  „Muss alles ausgefüllt sein, Dann gibst er eins nach dem anderen ein Fotos
  daten und dann sieht er das ergebnis" und „keine ahnung was hier passirt.
  Generate geht eimfach nicht. Ich drücke drau und passirt nichts."

---

## Heute erledigt

- **Build-Fehler behoben** (`app/themes/wedding/page.tsx`): Der Einbau der
  Zusagen/Chat-Demo hatte `ZusagenKarte` und `GruppenChat` ein zweites Mal
  importiert — die Datei hatte diese Imports bereits (Zeile 17/19). TypeScript
  brach mit „Duplicate identifier" ab, der Dev-Server lieferte nur noch den
  Kompilierfehler statt der Seite. Fix: die doppelten Imports oben entfernt,
  `KARTE_TEXTE`-Import behalten (der war neu und einmalig).
  **Geprüft:** `tsc --noEmit` sauber für beide geänderten Dateien; Seite lädt
  im Browser mit HTTP 200, Titel korrekt, keine Konsolenfehler in einem
  frischen Tab; Zusagenliste („4 Zusagen · 1 Absage") und Gruppenchat rendern
  sichtbar unter der Karte.
- Das war vermutlich (nicht sicher belegt) auch die Ursache für den
  gemeldeten „Generate geht nicht"-Report, FALLS der Screenshot von einem
  Moment nach diesem fehlerhaften Deploy stammt — ein kompilierfehlerhafter
  Build kann je nach Cache-Stand eine alte, gebündelte Version ausliefern,
  auf der jeder Klick ins Leere läuft. Das allein erklärt aber nicht alles,
  siehe nächster Punkt.

---

## 1 · Groesster offener Punkt — „Generate" reagiert nicht

**Zwei echte, im Code bestätigte Fehler**, unabhängig vom Build-Fehler oben:

### a) Der Knopf lügt: zeigt „gratis", ist es aber nicht

`components/KissFunnel.tsx:2658`:
```
{... : bezahlt ? T.ctaVideo : T.ctaFree}
```
Der Knopftext hängt nur an `bezahlt`, nicht an `V.keinGratis`. Fürs Hochzeits-
Thema ist `ctaVideo` bereits eigens übersetzt (`lib/kiss-i18n.ts:911` u. a.:
„Create the invitation" / „Einladung erstellen"), aber **`ctaFree` hat keine
Hochzeits-Fassung** — vor der Zahlung steht also weiterhin „Generate picture —
free" (`lib/kiss-i18n.ts:118`), obwohl `keinGratis` den ersten Versuch längst
kostenpflichtig macht. Genau das zeigt der Screenshot des Owners.

**Fix:** entweder eine wedding-eigene `ctaFree`-Übersetzung ergänzen (z. B.
„Create the invitation — {once}"), oder die Knopf-Logik selbst um
`V.keinGratis` erweitern, damit sie nie wieder auseinanderlaufen können.

### b) Der Knopf ist vermutlich echt deaktiviert, nicht nur falsch beschriftet

`components/KissFunnel.tsx:2655`:
```
disabled={!selPhoto || !photo || !consent || busy || videoBusy || mailBusy}
```
Ein deaktivierter Knopf feuert **gar keinen Klick** — das passt besser zu
„ich drücke drauf und es passiert nichts" als ein Handler, der nur still
abbricht (der würde wenigstens kurz reagieren). Anders als beim „Weiter"-Knopf
zwischen den Schritten (`:2300-2306`, zeigt bei fehlendem Foto sichtbar
`T.uploadFirst`/`T.pickFirst` per `setWeiterHinweis`) gibt es **hier keine
Rückmeldung**, welche der vier Bedingungen fehlt.

- `consent` wird normalerweise schon beim „Weiter"-Klick vom vorigen Schritt
  gesetzt (`zustimmen()` an `:2308`) — sollte beim Erreichen dieses Schritts
  also i. d. R. bereits `true` sein.
- **Nicht live/gerätenah geprüft:** ob `photo` (das zweite Foto, Bräutigam bei
  `paarUpload`-Varianten) zum Zeitpunkt des Klicks wirklich gesetzt ist, oder
  ob ein Upload nicht durchlief, der Zustand beim Neuladen verloren ging o. ä.
  Das lässt sich nur an einem echten Gerät/Reload nachvollziehen, nicht rein
  am Code.

**Fix, unabhängig von der genauen Ursache:** dem Knopf denselben Hinweis-
Mechanismus geben wie dem „Weiter"-Knopf — bei Klick auf den deaktivierten
Zustand (oder per sichtbarem Text daneben) genau sagen, was fehlt: Foto X
fehlt, Zustimmung fehlt, etc. Ein Knopf, der nichts tut UND nichts sagt, ist
für den Nutzer nicht von „kaputt" zu unterscheiden — und genau das wurde
gemeldet.

---

## 2 · Dieselbe Ursache wie Punkt 1 — neue Ablauf-Anforderung

> „Muss alles ausgefüllt sein, Dann gibst er eins nach dem anderen ein Fotos
> daten und dann sieht er das ergebnis"

Das ist vermutlich keine neue, separate Anforderung, sondern dieselbe Lücke
aus Punkt 1b vom Owner selbst benannt: **Pflichtfelder müssen sichtbar
erzwungen werden, Schritt für Schritt**, nicht durch einen still deaktivierten
Endknopf. Zu klären/umzusetzen:

- Reihenfolge explizit machen: (1) beide Fotos, dann (2) Hochzeitsdaten
  (Namen, Datum, Ort/Adresse — aktuell unklar, ob diese Felder vor der
  Erzeugung oder erst auf der fertigen Einladungsseite abgefragt werden;
  muss im Code nachgeschaut werden, `EinladungBauen.tsx` vermutlich),
  dann (3) erst das Ergebnis zeigen.
- Jeder Schritt zeigt einen sichtbaren Fehler am Feld, nicht nur einen
  deaktivierten Knopf (Muster existiert schon: `mailFehler` „ROT ans Feld",
  `setWeiterHinweis` — beide als Vorbild für den Generate-Knopf verwenden).

**Noch zu tun, bevor gebaut wird:** genau lesen, was `EinladungBauen.tsx`
heute an Feldern vor vs. nach der Bild-Erzeugung abfragt, damit die
„eins nach dem anderen"-Reihenfolge am echten Ist-Zustand entschieden wird.

---

## 3 · Weitere offene Punkte aus dem Auftrag

- **Dark Modus einfügen** — nur `LightSwitch.tsx` gelesen (Schalter hängt
  `lb-theme`/`lb-fb`-Klassen ans `<main>`, merkt sich die Wahl in
  `localStorage` unter `lb_light`, spiegelt sich in der URL via `?light=`).
  Noch keine Änderung vorgenommen; unklar, auf welcher Seite genau der
  Schalter fehlt (Owner nannte keine Seite) — vermutlich die
  Einladungs-Ansichtsseite `app/einladung/[id]/page.tsx`, die aktuell fest
  `lb-theme lb-fb` ohne Umschalter trägt.
- **Preview sharebar machen** — Status ungeklärt. Möglicherweise durch
  `/einladung/beispiel` bereits erfüllt (zeigt Zusagen + Chat als Demo), aber
  nicht bestätigt, ob das dem Wunsch „damit sie wissen was sie bekommen"
  genügt oder ob eine eigene, klar teilbare Vorschau-URL mit Kurzform der
  eigenen (noch nicht bezahlten) Einladung gemeint ist.
- **Chat muss funktionieren** — Grundfunktion war laut vorheriger Sitzung
  bereits end-to-end verifiziert (curl + Browser). Nach dem heutigen
  Build-Fix erneut im Zusammenhang mit einer echten, bezahlten Einladung
  prüfen (nicht nur der Demo-Block auf der Landingpage).
- **Kompletter Kauf-Test durch den Owner selbst angekündigt**: „Ich werde ein
  kaufen und sharen mal sehen ob chat funktioniert, leute zusagen können." —
  Sollte NACH den Punkten 1 und 2 erfolgen, sonst bricht der Test genau an
  der Stelle ab, die schon bekannt kaputt ist.

---

## 4 · Nicht committete Änderungen

Nur zwei Dateien, beide aktuell fehlerfrei:

- `app/einladung/[id]/page.tsx` — Reaktivierungs-Block nach Ablauf der
  Probezeit (Karte weiter nutzen → Abo), Abstand `mt-4` → `mt-8` korrigiert.
- `app/themes/wedding/page.tsx` — Zusagen/Chat-Demo unter dem Trichter,
  Duplicate-Import-Fehler heute behoben.

Alles andere aus dieser Themenreihe (Guthaben-System, Kuss-Szenen, Preise,
30-Tage-Probezeit) ist bereits auf `main`, letzter Commit `8be5e46`.

**Noch nicht committet und gepusht** — bewusst offen gelassen, bis Punkt 1
(Generate-Knopf) geklärt ist, damit nicht wieder ein kaputter Zustand live
geht.

---

## Empfohlene Reihenfolge

1. Generate-Knopf: sichtbare Fehlermeldung statt stillem `disabled` (Punkt 1b)
   — das behebt vermutlich auch Punkt 2 gleich mit.
2. `ctaFree`-Beschriftung für die Hochzeit korrigieren (Punkt 1a) — kleiner,
   unabhängiger Fix, kann separat oder zusammen mit 1 gehen.
3. Ablauf „Fotos → Hochzeitsdaten → Ergebnis" in `EinladungBauen.tsx` prüfen
   und ggf. nachziehen (Punkt 2).
4. Beide Dateien committen + pushen.
5. Dark Modus (Punkt 3) — Seite/Ort mit dem Owner kurz bestätigen statt raten.
6. Shareable Preview (Punkt 3) verifizieren oder bauen.
7. End-to-End: einmal selbst durch den ganzen Kauf klicken (Fotos → Zahlung
   aus 9,99-Aufladung → Ergebnis → Teilen → Chat/Zusagen auf der echten
   Einladungsseite), bevor der Owner seinen eigenen Testkauf macht.

---

## 5 · KORREKTUR (02.08.2026, weitergearbeitet) — Punkt 1 zielte aufs falsche Bauteil

Der Plan oben hat den „Generate"-Knopf in `components/KissFunnel.tsx` analysiert
— und diese Analyse war fuer sich richtig, aber `KissFunnel` mit
`variant="wedding"` wird **von `/themes/wedding` gar nicht mehr gerendert**.
`app/themes/wedding/page.tsx` benutzt seit Commit `20d41a3`
(„Die Karte IST die Bedienung — Trichter raus, Dialoge rein", 31.07.2026)
stattdessen `components/EinladungBauen.tsx`. Der `keinGratis`-Umbau in
`KissFunnel` (Commit `b69469f`, 01.08.2026 — derselbe Tag wie dieser Auftrag)
kam SPAETER als der Wechsel auf `EinladungBauen` — das damalige Claude hat also
denselben Fehler gemacht, den dieser Plan zunaechst wiederholt haette: die
falsche, nicht mehr erreichbare Datei geaendert.

**Zwei echte Befunde aus dem tatsaechlich erreichbaren Code:**

1. **Der „stumme Knopf" war ein echter Browser-Fehler, nicht nur fehlende
   Rueckmeldung.** Live im Browser geprueft: Ein `disabled`-`<button>` feuert
   in keinem Browser ein `click`-Ereignis — auch nicht an einem umschliessenden
   Element. Das „Klick auf die Huelle"-Muster, das schon beim „Weiter"-Knopf
   in `KissFunnel` existierte (und das ich zunaechst fuer den Generate-Knopf
   kopiert habe), kann darum NIE funktionieren, in keinem der drei Faelle.
   **Behoben** in `EinladungBauen.tsx` (Bild-erzeugen-Knopf) und
   `KissFunnel.tsx` (Weiter- UND Generate-Knopf): Die Knoepfe bleiben jetzt
   echte, aktive `<button>`-Elemente (nur das Aussehen dimmt sich per Klasse);
   Bedingung und roter Hinweis stehen im eigenen `onClick`. Live verifiziert
   (per echtem `element.click()`, nicht nur Theorie): Bei fehlendem Foto
   erscheint jetzt sichtbar „Lade zuerst dein Foto hoch" statt Stille.

2. **„Kein Gratis-Test" ist im erreichbaren Code NICHT umgesetzt.** Der
   Auftrag „Es kostet von Anfang an 1,49 pro Video … Sie werden nichts testen
   duerfen kostenlos" existiert nur in `KissFunnel`/`keinGratis` — totem Code
   fuer die Hochzeit. `EinladungBauen.tsx` ruft `/api/free-preview` ohne jede
   Zahlungssperre auf (nur die allgemeine 1-gratis-Vorschau-pro-Geraet-und-Tag
   Regel, dieselbe wie bei Kiss/Holiday). Und wichtiger: **Es gibt aktuell
   ueberhaupt keinen Video-Erzeugungsschritt fuer die Hochzeit** —
   `EinladungBauen` erzeugt nur ein Standbild und legt darauf direkt die
   Einladung an (`/api/einladung`, 30 Tage Probezeit, danach 24,50 €/Monat
   Abo). Das Wort „Video" in `heroLead`/`s1p` ist damit ein Leistungsversprechen
   ohne Gegenstueck im Code — nur der Text wurde inzwischen korrigiert
   (kein „gratis" mehr, siehe unten), der fehlende Video-Schritt selbst nicht.

   **Das ist eine Architektur-Entscheidung, keine Ein-Zeilen-Korrektur** —
   ein Video braucht Pixverse-Anbindung UND eine Portierung des Stripe/
   Guthaben-Bezahl-Flusses (`unlock()` in `KissFunnel.tsx:1675`, Popup+Polling,
   Wallet-Abbuchung) in `EinladungBauen.tsx`, wo davon nichts existiert.
   **Offen, braucht eine Entscheidung des Owners**, bevor daran gebaut wird:
   Soll die Hochzeit tatsaechlich einen bezahlten Video-Schritt bekommen
   (grosse neue Arbeit), oder bleibt das aktuelle Modell (Gratis-Standbild →
   30 Tage volle Einladung gratis → 24,50 €/Monat Abo) das echte Produkt und
   nur die Werbetexte muessen dazu passen (kleine Korrektur, teilweise schon
   erledigt)?

**Bereits erledigt, unabhaengig von der offenen Frage oben:**

- Falsche „gratis"-Versprechen in `lib/kiss-i18n.ts` (`HOCHZEIT.heroLead`,
  alle 7 Sprachen) und `app/themes/wedding/page.tsx` (`s1p`, EN-Quelle fuer
  `trObject`) korrigiert: statt „das erste Bild ist gratis" jetzt „Jedes
  Video kostet 1,49 € — kein Gratisversuch" (per `{once}`-Platzhalter aus
  `lib/pricing.ts`, `fillPrices()`). Das war eine reine Textkorrektur, die
  einen bezahlten Video-Schritt VERSPRICHT, den es noch nicht gibt — passt
  zur oben offenen Frage, nicht als deren Antwort gedacht.
- Silent-disabled-Knopf-Fehler behoben wie oben beschrieben (Punkt 1 in
  `EinladungBauen.tsx`, plus derselbe Fehler in `KissFunnel.tsx`, auch wenn
  dessen Wedding-Variante aktuell tot ist — er wirkt dort weiterhin fuer
  Kiss/Idol).
- `ctaFree`/`ctaVideo`-Verwechslung in `KissFunnel.tsx` behoben (`V.keinGratis`
  steuert jetzt die Beschriftung) — bleibt fuer Wedding aktuell wirkungslos
  (toter Pfad), ist aber jetzt korrekt, falls/wenn `KissFunnel` fuer Wedding
  je wieder reaktiviert wird.

**Noch nicht committet** — bewusst offen gelassen, bis die Architektur-Frage
oben beantwortet ist.

---

## 6 · Der Video-Zahlschritt ist jetzt gebaut (02.08.2026, Owner-Entscheidung: „neu bauen")

Portiert aus dem toten `KissFunnel`-Pfad in `components/EinladungBauen.tsx`, wo die Seite
tatsaechlich laeuft. Vorbereitung per Explore-Agent: vollstaendige Karte der bestehenden
`unlock()`/`kussVideo()`/`/api/kiss-video-checkout`/`/api/generate-tryon-video`-Kette,
danach Handimplementierung (kein Workflow-Tool — Umfang passte in eine Sitzung).

**Neu:**
- `lib/wedding-prompt.ts` — `KISS_LOOK_ID`, `WEDDING_KLEIDER`, `weddingPrompt`,
  `WEDDING_PROMPT` liegen jetzt hier (vorher nur in `KissFunnel.tsx`, dort weiterhin
  benutzt). Grund: `EinladungBauen.tsx` braucht dieselben Konstanten; ein Component-zu-
  Component-Import haette das ganze `KissFunnel`-Bundle mitgezogen.
- `components/EinladungBauen.tsx`:
  - `bezahlen()` — Guthaben-Abbuchung oder Stripe-Popup+Poll, portiert aus
    `KissFunnel.tsx:unlock("once")`. Legt bei Bedarf selbst einen Kiss-Log-Eintrag
    (`genId`) an, den `/api/kiss-video-checkout` fuers Guthaben braucht.
  - `videoErzeugen()` — Pixverse ueber `/api/generate-tryon-video`, portiert aus
    `KissFunnel.tsx:kussVideo()`. `person` = SEIN Foto, `garment` = IHR Foto (Reihenfolge
    ist Pflicht, `weddingPrompt` bindet @1/@2 fest). Ohne Kleider-Auswahl (die hat
    `EinladungBauen` nicht) faellt der `anziehen()`-FASHN-Umweg weg — die Originalfotos
    gehen direkt an Pixverse.
  - `erzeugen()` zahlt jetzt zuerst (`bezahlen()`), dann Standbild
    (`/api/free-preview`, unveraendert), dann automatisch das Video.
  - `einladungAnlegen()` schickt `videoUrl` (falls bis dahin fertig) statt `bildPfad`.
  - Knopf zeigt jetzt `F.ctaVideo` + laufenden Status statt `F.ctaFree` — dieselbe
    Korrektur wie in `KissFunnel.tsx`, hier aber am tatsaechlich sichtbaren Knopf.
- `lib/kiss-i18n.ts`: `probeHinweis` sagte in allen 7 Sprachen „7 Tage gratis" — falsch
  seit der 30-Tage-Umstellung vom 01.08.2026 (`app/api/einladung/route.ts:323`). Jetzt
  „einen Monat inklusive" statt „7 Tage frei", passend zur tatsaechlichen Probezeit.

**Bewusste Vereinfachungen gegenueber `KissFunnel`** (Scope-Grenze, klar benannt statt
stillschweigend weggelassen):
- Kein Admin-Bypass (Test-Pin) fuer diesen Kauf — Owner wollte ohnehin selbst einmal
  echt kaufen, um den Ablauf zu pruefen.
- Kein „Konto aufladen 9,99€"-Knopf als EIGENE Aktion in diesem Dialog — nur der
  Einzelkauf (1,49€ pro Video, aus dem Guthaben wenn vorhanden). Ein Guthaben-Aufbau
  bräuchte einen eigenen Knopf wie in `KissFunnel`; kann bei Bedarf nachgezogen werden.
- Beim „Ein Foto von uns beiden"-Weg (`weg === "gemeinsam"`) geht dasselbe Paarfoto an
  BEIDE Pixverse-Referenzplaetze (`person` UND `garment`), da es kein zweites
  Referenzbild gibt. Pixverse erwartet im Referenz-Modus normalerweise zwei GETRENNTE
  Gesichter — **ungeprüft, ob das brauchbare Ergebnisse liefert**. Der Zwei-Fotos-Weg
  ist unveraendert korrekt (exakt wie `KissFunnel` es tat).

**NICHT mit echten API-Aufrufen getestet** (Owner-Regel „cost-frugal": OpenAI/Stripe/
Pixverse-Aufrufe kosten echtes Geld je Versuch) — nur `tsc --noEmit` sauber und im
Browser gepruefzt, dass Dialog oeffnet, Knopf-Beschriftung stimmt und der rote Hinweis
bei fehlenden Fotos weiterhin erscheint. **Der Owner wollte ohnehin selbst einmal
kaufen** („Ich werde ein kaufen und sharen") — das ist jetzt der richtige Moment dafuer,
und gleichzeitig der erste echte Test dieser Kette.

**Noch offen, falls der erste echte Kauf etwas findet:**
- Ob `guthabenAbbuchen`/`/api/kiss-video-checkout` mit einem FRISCH angelegten `genId`
  (derselbe Millisekunden-Request wie die Kasse selbst) sauber zusammenspielen — im
  Code plausibel, aber nie unter echter Netzwerklatenz beobachtet.
- Ob `/api/free-preview`s eigene, unabhaengige Tages-Gratis-Pruefung (`claimFreePreview`)
  nach der bereits bezahlten Kasse noch einmal zuschlaegt, falls dasselbe Geraet an
  diesem Tag schon eine Gratis-Vorschau (z. B. bei Kiss) verbraucht hat — dann wuerde
  ein zweites Mal vom Guthaben abgebucht. Dasselbe Verhalten existierte schon im
  urspruenglichen `KissFunnel`-Entwurf (Commit `b69469f`), hier bewusst NICHT anders
  geloest, um keine neue, ungetestete Regel zu erfinden — aber ein guter Kandidat fuer
  einen zweiten Blick, falls der Owner beim Testkauf doppelt belastet wird.
- Das Ergebnis beim „gemeinsamen Foto"-Weg (siehe oben).

---

## 7 · Dark Modus nachgezogen (02.08.2026)

Plan Punkt 3 war unklar, WO der Schalter fehlt — jetzt eindeutig beantwortet: `KissFunnel.tsx`
portalt `<LightSwitch />` seit Langem in `TopNav`s Sprachzeile (`[data-langrow]`), auf jeder
Seite, die `KissFunnel` rendert. `/themes/wedding` rendert seit dem 31.07.2026 `EinladungBauen`
statt `KissFunnel` — der Schalter fehlte nur deshalb, nicht aus einer bewussten Entscheidung.

Derselbe Mechanismus jetzt in `components/EinladungBauen.tsx` nachgezogen (`useEffect` sucht
`[data-langrow]`, `createPortal` setzt `<LightSwitch />` hinein). Live geprüft: Schalter
erscheint neben der Sprachwahl, Klick entfernt/setzt `lb-theme`/`lb-fb` auf `<main>` wie
überall sonst. Die Karte selbst bleibt in beiden Modi cremefarben (eigenes, bewusst festes
Design wie eine echte Einladungskarte) — nur die Seite drumherum wechselt, exakt wie auf den
anderen Themenseiten.

**Aus der „Empfohlenen Reihenfolge" (Abschnitt oben) damit erledigt:** 1, 2, 5. Noch offen:
3 (Ablauf-Reihenfolge, weitgehend schon passend), 4 (Committen — bewusst offen), 6 (Shareable
Preview — Status ungeklärt), 7 (Owner-Testkauf).

---

## 8 · Menüwahl bei der Zusage + Demo-Feinschliff (02.08.2026, gleiche Sitzung wie 5–7)

Owner-Aufträge desselben Tages, umgesetzt, aber oben noch nicht protokolliert:

- **„die Leute müssen bei der Bestätigung angeben ob sie vegetarisch, vegan oder normal
  essen wollen"** — komplette Kette: `ZusagenKarte.tsx` (3er-Umschalter „Euer Menü",
  Vorwahl „Normal", zählt nur bei Zusage), `/api/einladung` (validiert `menu`, speichert
  nur bei `ja`, liefert es im öffentlichen GET mit), Typ in `lib/try-this-look-store.ts`,
  Übersetzungen in allen 7 Sprachen (`EinladungKarte.tsx`/`KARTE_TEXTE`). In der Liste
  steht das Etikett NUR bei vegetarisch/vegan — „normal" wäre Rauschen.
- **„Namen müssen hier als paar oder mit Nachname stehen"** — Demo-Zusagen auf
  `/themes/wedding` und `/einladung/beispiel` heißen jetzt „Maria & Radu", „Andrei
  Ionescu" usw. statt einzelner Vornamen.
- **Sprachwechsel-Fehler behoben:** `GruppenChat` und `ZusagenKarte` übernahmen neue
  `nachrichten`/`zusagen`-Props nach dem ersten Rendern nie (`useState`-Anfangswert) —
  die Demo blieb nach einem Sprachwechsel in der alten Sprache stehen. Jetzt `useEffect`.

## 9 · Verifikation im Browser + ein echter Fund (02.08.2026, spätere Sitzung „Wedding Organiser")

Alles am laufenden Dev-Server (Port frei gewählt, Mobil-Viewport 375×812) geprüft, ohne
einen einzigen bezahlten API-Aufruf:

- `/themes/wedding` (RO + DE): Karte mit Beispielvideo, Preistext „Jedes Video kostet
  1,49 € — kein Gratisversuch" über `fillPrices`, Hell/Dunkel-Schalter da, Demo-Zusagen
  mit VEGETARISCH/VEGAN-Etiketten, Demo-Chat; Sprachwechsel RO→DE tauscht Demo-Inhalte
  mit (der Fix aus Abschnitt 8 wirkt).
- **Echte Einladung** `3c9b83b4016f4aaa9e` (Ana & Mihai, einzige nicht widerrufene
  Test-Einladung, Probe bis 07.08.): Gast-Zusage „Testgast Claude" mit Menü VEGAN über
  die echte Oberfläche abgeschickt → Liste zeigt „1 Zusage" + VEGAN-Etikett, GET-API
  bestätigt `menu: "vegan"` im Speicher. Chat-Nachricht geschickt → erscheint und ist
  persistiert. **„Leute zusagen können" und „Chat muss funktionieren" damit auf einer
  ECHTEN Einladung nachgewiesen** (Testeinträge bewusst dringelassen als Beleg).
- `/einladung/beispiel`: komplette Beispielkarte inkl. Paar-Ankündigung im Chat und
  Menü-Etiketten.
- Erzeugen-Knopf ohne Fotos → Hinweis erscheint. **Dabei ein echter Fehler gefunden:**
  Der „rote" Hinweis war gar nicht rot. `.lb-karte p { color: … !important }`
  (globals.css) schlägt jeden Inline-`style` — der Hinweis stand in Karten-Braun da,
  optisch wie normaler Text (genau gegen die Dauerregel „Absagen ROT ans Feld, feste
  Farbe"). **Behoben** nach dem Muster der Nachbarklassen (`lb-karte-ja`/`-nein`):
  neue Klasse `.lb-karte .lb-karte-fehler { color:#dc2626 !important }` in
  `globals.css`, Hinweis in `EinladungBauen.tsx` nutzt sie statt Inline-Rot. Rot-600
  statt des 500ers der dunklen Seiten, weil erst das auf Creme die Kontrastgrenze für
  kleine Schrift schafft. Live geprüft: computed `rgb(220,38,38)`.

**Kleine Beobachtungen, bewusst NICHT angefasst** (Owner hat diese Seite zweimal
persönlich entrümpelt — nichts ungefragt dazubauen):

- `/einladung/beispiel` ist eine Waise: verlinkt AUF `/themes/wedding`, aber nichts
  verlinkt HIN. Falls „Preview sharebar" eine teilbare Beispiel-URL meint, fehlt genau
  ein Link/Teilen-Knopf — Owner-Wort nötig, WO er stehen darf.
- Datum/Ort sind vor dem „Verschicken" nicht Pflicht (nur Fotos+Mail vor dem Erzeugen,
  Namen vor dem Verschicken). Falls „Muss alles ausgefüllt sein" wörtlich gemeint war,
  wäre das der Rest.
- Die Gast-Knöpfe „Ich komme"/„Ich kann leider nicht" sind stumm-gesperrt bis
  Name+Mail dastehen — dasselbe Muster, das beim Erzeugen-Knopf der Fehler war. Zwei
  selbsterklärende Felder direkt darüber; vermutlich okay, aber notiert.

**Stand Commit:** weiterhin NICHTS committet (Regel: nur auf Owner-Wort). Wenn das
Okay kommt, gehören die Hochzeits-Änderungen und der davon unabhängige
Grußkarten-Prüfstand (`app/gruss-test/`, `app/api/gruss-test/`, plus dessen Anteile
in `lib/try-this-look-store.ts`) in GETRENNTE Commits — `try-this-look-store.ts`
mischt beide Stränge, also hunk-weise stagen.
