# Übergabe 05.08.2026 — Stand, Entscheidungen, nächster Schritt

> Gelesen wird das hier **zuerst**, bevor irgendetwas angefasst wird.
> Alles liegt im Arbeitsverzeichnis. **Nichts ist committet, nichts ist live** — Owner
> 05.08.2026: *„wir können das nicht committen, bis es nicht rund ist."*

---

## 0. Die Regel über allem: **Kiss ist die Vorlage**

Owner 05.08.2026: *„was mir gefällt und alle Topic-Seiten sollen so aufgebaut werden, ist die
Kiss-Seite."*

`app/themes/kiss/page.tsx` ist ab jetzt das Muster. Jede Themenseite bekommt **dieselbe
Reihenfolge**, und zwar in dieser:

| # | Baustein | Woher |
|---|---|---|
| 1 | **H1** — zwei Töne, ein Wort in Gold | `<H1>` + `<Y>` aus `components/Landing` |
| 2 | **Preis-Chip** | `<ThemenPreis thema="…" />` |
| 3 | **Anlass** — wofür/wann, eine Zeile mit `·` getrennt | `T.anlass` (kiss-i18n) |
| 4 | **Grund** — warum, fett, ein Satz | `T.grund` |
| 5 | **Anleitung 1 · 2 · 3** | `T.wieGeht` |
| 6 | **Privatzeile** mit Schloss | `T.wieGehtPrivat` |
| 7 | **EINE Karte** mit allen Beispielvideos | `<KissFunnel beispielVideos={examples} />` |
| 8 | Inhalt der Seite (Warum, SEO-Text …) | je Thema |
| 9 | **Footer** | `<SeitenFuss />` |

**ERLEDIGT am 05.08. abends** (Owner: *„was ich vermisse jetzt bei topics … die Schritte, die
Begründung, der Anlass"*). Anlass, Grund, die drei Schritte und die Privatzeile stehen jetzt auf
**Geburtstag · Tanz · Hochzeit · Urlaub · Chat** — in sieben Sprachen, geprüft im Browser.

- Der Block ist ein Baustein: `components/ThemenVorspann`. Auch die Kuss-Seite benutzt ihn
  jetzt, statt ihn ausgeschrieben zu haben — so gibt es keine sechste Kopie, die beim nächsten
  Umbau vergessen wird. Die Reihenfolge (Anlass → Grund → 1·2·3 → Schloss) ist dort begründet.
- Die Texte liegen in `lib/kiss-i18n` je Variante (GEBURTSTAG · POLEDANCE · HOCHZEIT · URLAUB);
  der Chat hat dort keine Variante und holt sie über `trObject` aus seiner eigenen Seite.
- **Nebenbefund:** Hochzeit und Urlaub hatten gar keine eigenen Schritte — sie erbten die
  KUSS-Schritte („Wir machen aus euch beiden ein Kussvideo"). Sichtbar war es nicht, weil beide
  Seiten den Block nie gerendert haben. Jetzt haben beide eigene.

**Der Owner streicht, was nicht passt** — das war die Abmachung. Die Zeilen stehen alle in
`lib/kiss-i18n`, je Sprache eine. Beispiel Kuss (das Muster):

> *Zum Jahrestag · zum Geburtstag · zum Valentinstag · wenn ihr euch lange nicht gesehen
> habt · nach einem Streit · einfach so*
> **Eine Nachricht wird gelesen und vergessen. Ein Video, in dem ihr beide küsst, behält sie.**

Deine Richtung ist so umgesetzt: Geburtstag → *zum 18., zum 60., für Mama, für die Schwester* ·
Urlaub → *Überraschung, Antrag, Familienurlaub* · Hochzeit → *Verlobung, Save the Date* ·
Tanz → *Jahrestag, Fernbeziehung, sein Geburtstag*.

**Noch ohne den Block:** `tryon`, `bella` und `luxurybandit-plan` — die drei haben auch keinen
Preis-Chip. Die ersten beiden hängen am abgeschafften Themen-Abo und fallen mit Punkt 3 weg;
der Plan ist neu und braucht eigene Zeilen.

### Der Chat heißt Bella

Owner 05.08.2026: *„Chat cu Bella nu cu o fata."* Die Überschrift sagte „Chat mit einer
KI-Frau", während der erste Absatz derselben Seite schon *„Du wählst nicht aus einem Raster von
Gesichtern. Es ist Bella"* sagte. Geändert auf der Themenseite, im Katalog (sieben Sprachen) und
auf `/offer`. **Der Name geht absichtlich nicht durch die Übersetzung** — „Bella" heißt auf
Italienisch und Spanisch „schön", eine Maschine macht daraus „Bello" oder „Schön" und der Name
ist weg. Übersetzt wird nur das „Chat mit".

---

## 1. Die Preise — vollständig und widerspruchsfrei (alle in `lib/pricing.ts`)

| Produkt | Preis |
|---|---|
| Geschenk: Kuss · Geburtstag · Urlaub · Tanz | **15 €**, einmal (drei Bilder inbegriffen) |
| Jedes weitere **Bild** | **1,49 €** aus dem Guthaben |
| Jedes weitere **Video** | **3,99 €** aus dem Guthaben |
| Hochzeitsplaner | **29 €** Kauf, danach **14,99 €/Monat** — das **einzige Abo** |
| Chat / KI-Freundin | **14,99 € einmalig für einen Monat** — ein Geschenk, kein Abo |
| System (Plan) | **60 €** |
| Aufladen | **5 · 10 · 15 · 30 · 60 €** |

**Der Chat ist ein Geschenk** (Owner 05.08.2026: *„Man verschenkt es für den Preis von 14,99
einmalig für einen Monat. Derjenige der es bekommt kann es aber verlängern. Wir haben nur
Einmal-Preise."*). Er steht damit neben Kuss und Tanz, nicht neben der Hochzeitsseite: Einer
zahlt einmal, ein anderer bekommt einen Monat — und **verlängert selbst**. Hier stand
„14,99 €/Monat", was sich wie ein Abo liest und beinahe eines geworden wäre.

**Stripe:** Einmalkäufe laufen über `price_data` — Preisschild und Kasse sind damit dieselbe
Zahl und können nie auseinanderlaufen. **Eine Kennung braucht nur das eine Abo**, die
Hochzeits-Verlängerung: `price_1U106O1jPNCWoiztdAUB9pEA` = 14,99 €/Monat, wiederkehrend, Steuer
inklusive, geprüft. Sie heißt im Code `chatAboPriceId()` — der Name stammt aus der Zeit, als der
Chat ein Abo werden sollte; **der Chat ruft sie nicht**. Die alten Einmal-Kennungen
(14,99 · 29 · 59) werden **nicht mehr gerufen**.

**Kein Gutschein auf dieses Abo.** `standardCoupon()` ist FOREVER50 (50 % dauerhaft). Auf den
49 € des abgeschafften Themen-Abos ergab er genau die 24,50 €, die auf dem Knopf standen — auf
14,99 € ergäbe er **7,49 € für immer**.

---

## 2. Was am 05.08. entschieden und gebaut wurde

**Gebaut und geprüft:**

- **Die Zeile am Eingang** (`lib/handel.ts` · `components/HandelZeile`) an fünf Trichtern,
  sieben Sprachen, Zahlen nur als Platzhalter. *Der Handel steht vor der Arbeit.*
- **Die Foto-Anleitung** (`lib/foto-anleitung.ts` · `components/FotoAnleitung`) — vier
  Beispiele mit **Bella und Peter**, aus denselben zwei Dateien: gut · unscharf · zu weit ·
  zwei Personen. Keine Piktogramme (Owner: *„die sehen blöd aus"*).
- **Eine Karte statt vieler**, alle Videos wechseln darin, laufen alle 7 s von selbst weiter
  und **pendeln** (kein Rücklauf). Punkte **unter** dem Video, Kaufknopf **unter** dem Video.
- **Tippen aufs Video vergrössert**, im Vollbild schliesst dasselbe Tippen oder das Kreuz.
- **Kartentitel:** „Mein Geschenk für dich: einen Kuss" statt „The Kiss".
- **Footer** (`components/SeitenFuss`) auf allen Themenseiten und im Katalog.
- **About** neu: sieben Sprachen (`lib/about-i18n.ts`), Geza, Foto, seit 1996, Höhle der
  Löwen, Timișoara. Wieder verlinkt in Menü und Footer.
- **Models-Seite zu** für Besucher (`components/NurAdmin`), aus Menü und Sitemap, `noindex`.
- **Zurück-Pfeil der Rechtsseiten** geht wieder zurück statt in den Marktplatz.
- **AGB:** „Your photo decides the result" + Erstattung als Einzelfall, kein Anspruch.
  **Datenschutz:** Server **Frankfurt** (Supabase) namentlich.
- **Erstattung:** nur auf **Anfrage**, der Owner gibt frei — und **erst wenn das Video fertig
  ist**.

**Entschieden, im Code festgehalten:**

- **Nichts ist gratis** (Owner: *„ich will auch keine Bilder mehr verschenken"*). Ausnahme:
  beim System das **Zwei-Jahres-Bild** (nicht das Fünf-Jahres-Bild — das ist die Ware).
- **Kein Foto-Tor** (*„nein, sie werden nicht abgewiesen"*) — stattdessen die Anweisung davor.
- **Der Bild-Deckel bleibt** (drei je Gerät und Tag). Wer ihn erreicht, liest:
  *„Das waren deine drei Bilder. Wenn keines davon passt, schreib uns an support@…"*
- **Abo nur für die Hochzeits-Verlängerung**, nie auf ein Geschenk — und der Chat *ist* ein
  Geschenk (korrigiert am 05.08. abends, siehe §1).
- **Zielmarkt ist die WELT**, nicht Rumänien (Timișoara ist der Wohnort).

---

## 3. Nächster Schritt — in dieser Reihenfolge

1. ~~**Abo-Kasse umhängen.**~~ **Erledigt am 05.08. abends** — aber nur für die
   Hochzeits-Verlängerung, und beim Bauen kam heraus, warum das genau richtig ist:
   - `app/api/einladung-abo-checkout` zeigt jetzt auf `chatAboPriceId()` (14,99 €/Monat,
     wiederkehrend) statt auf die abgeschaffte 49-€-Themen-Kennung, **ohne**
     `standardCoupon()`. Die fünf Abo-Texte in `EinladungKarte` (sieben Sprachen) lesen jetzt
     den neuen Platzhalter `{monat}` = 14,99 € statt `{price}` = 24,50 €. Geprüft: die Zeile
     auf `/themes/wedding` nennt 14,99 €.
   - **Der Chat wurde absichtlich NICHT umgehängt.** `chat-abo-checkout` heißt zwar so, wird
     aber von der Chat-Seite nie gerufen: `/themes/chat` läuft über `chat-zugang-checkout`
     (Einmalkauf, `chatPriceId`, one_time) — und genau so soll es bleiben, weil der Chat ein
     Geschenk ist. Die einzigen Aufrufer von `chat-abo-checkout` sind `/try`, `/offer` und
     `/your-idol`: die alten Marktplatz-Trichter mit dem abgeschafften Themen-Abo. Hätte man
     die Kennung dort getauscht, hätten diese Seiten 14,99 €/Monat verlangt für ein Abo, das
     nichts freischaltet — und das Monatsguthaben (20 Videos zu 3,99 € = 79,80 €) hängt an der
     Endung `-abo` im Kassenvermerk. Sie fallen mit Punkt 3 ohnehin weg.
2. **Die zwei Nachkauf-Knöpfe** unter das fertige Ergebnis: *Noch ein Bild · 1,49 €* und
   *Noch ein Video · 3,99 €*, beide direkt aus dem Guthaben (`unlock("extra")` kann es schon).
3. **Die Haustür.** `/themes` wird das Zuhause statt `/stores` (Owner: *„ja"*). Danach fallen
   die restlichen Marktplatz-Wege von selbst weg — heute wurden fünf einzeln gefunden.
4. **Punkt 4 des Pakets:** ~~Motto~~ **Motto erledigt am 05.08. abends.** In
   `components/TopNav` steht statt „AI marketplace" jetzt das Geschenkideen-Portal, in sieben
   Sprachen und ohne Artikel (die Zeile läuft sonst gegen die drei Symbole und wird
   abgeschnitten). Die Sprache kommt aus dem `lb_lang`-Keks, wie beim Sprachumschalter daneben.
   **Noch offen an diesem Punkt:** Katalog-Kopf, die Kacheltexte und die Seitentitel.
5. **Anlass und Grund** für die übrigen Themen (siehe §0).
6. **Bild → Video mit drei Versuchen:** zahlen → Bild → „passt es?" → Video **aus diesem
   Bild**. Vorher **ein echter Testlauf**: Pixverse mit EINEM fertigen Paarbild als Referenz
   ist nie mit einem Kauf geprüft worden.
7. **Gutschein verpacken** (Owner 05.08.2026: *„ja, das meinte ich … aber Gutschein kannst du
   schon mal machen"*). Das Konzept steht in §3b von
   [KONZEPT-GESCHENKE-UND-IDEEN.md](KONZEPT-GESCHENKE-UND-IDEEN.md) — **das einzige
   Geschenkprodukt mit gemessener Suchnachfrage**, und ein Dezember-Geschäft mit harter Frist.
   Drei Stücke, in dieser Reihenfolge:
   - ~~**Die Seite** im Kiss-Muster~~ — **steht** (05.08. abends): `/themes/gutschein`, sieben
     Sprachen, Kachel auf **Platz zwei** im Katalog, in der Sitemap. Dabei kam heraus, dass
     **keine einzige Themenseite** in der Sitemap stand — `/stores` und `/earnings` schon, die
     Verkaufsseiten nicht. Alle acht sind jetzt drin.
     **Was der Kachel fehlt:** ein eigenes Bild. Sie trägt gerade ein themenfremdes Modelfoto
     aus dem Stapel — genau der Fehler, der beim Chat schon einmal korrigiert wurde. Das
     Bella-Video „I have something for you!" gehört genau dorthin.
   - **Der Trichter ist `EinladungBauen`, kein neues Bauteil** (Owner 05.08.2026: *„Man, wir
     haben doch einen Trichter. Du hast den verlassen."*). Hochzeit und Urlaub sind Varianten
     davon; der Gutschein wird die dritte. **Angefangen:** `kissText(lang, "gutschein")` gibt
     es, sieben Sprachen, und die fünf bestehenden Themenseiten laufen unverändert weiter.
     **Was in `components/EinladungBauen.tsx` noch fehlt** — überall dort, wo heute
     `const urlaub = variant === "holiday"` steht:
     - **Keine Szenenwahl** (Zeile 153). Es wird kein Video erzeugt, in das jemand gesetzt wird.
     - **Der zweite Platz ist kein Mensch, sondern SEIN GUTSCHEIN** (Zeilen 801–838). Statt
       „sie oder er" ein Feld für den **Link** des Händlers — kein Datei-Upload, kein Code.
       Begründung siehe unten.
     - **Keine Namenspflicht** (Zeilen 1030 · 1057) und **kein Datum/Ort** (Zeile 766).
     - **Ohne eigenes Video geht es auch:** Dann läuft das fertige Bella-Video aus
       `public/Gutscheine`. Owner: *„er kann dieses Mal auch das Original-Video versenden."*
     - **Der LuxuryBandit-Gutschein gehört in DIESEN Schritt**, nicht auf die Landingpage
       (Owner: *„nicht hier auf der Landingpage. Erst beim Editieren des Gutscheins"*). Dort,
       wo er seinen eigenen anhängt, steht die Frage „und wenn ich keinen habe?" von selbst im
       Raum. Die Kasse dafür ist fertig: `app/api/gutschein-checkout` (15 · 30 · 60 €, zwei
       Adressen), verbucht in `checkout-status` auf das Konto des **Beschenkten**.
   - **Nur der Link, keine Datei, nie der Code** (Owner 05.08.2026: *„es ist ein Risiko für die
     Hacker"*). Speichern wir Codes, liegt bei uns ein Stapel Geld und wir haften für fremde
     Gutscheine. Speichern wir nur einen Verweis, findet ein Einbrecher Links, die ohnehin in
     fremden Postfächern liegen — es gibt nichts zu stehlen. Das ist zugleich der Weg mit der
     geringsten Reibung: keine Dateiauswahl auf dem Handy.
   - **Der Gratis-Schritt:** drei Textvorschläge für Empfänger und Anlass. Er kostet fast
     nichts, weil er reiner Text ist — der einzige Trichter, den wir offen lassen können.
   - **Die Karte:** sein Video, seine Botschaft, Knopf *Gutschein öffnen* → sein PDF. Zwei
     Regeln aus dem Konzept sind nicht verhandelbar: Wir **verpacken** Gutscheine, wir
     verkaufen keine (in der EU ist ein Gutschein ein Zahlungsinstrument). Und **der Code
     gehört hinter den Link** — nie ins Video, nie in die Vorschau, nie in den Nachrichtentext,
     sonst liefert die WhatsApp-Vorschau ihn mit.
8. **Try-on als Geschenk für Frauen** — beschlossen, ausdrücklich **nicht jetzt** (Owner
   05.08.2026: *„Jetzt aber nicht umsetzen. Schreib dir auf die Liste."*). Begründung und
   Reihenfolge stehen im Konzept unter „Auf der Liste".

---

## 3b. Stand am Ende des 05.08. — was FERTIG ist und was OFFEN

**Nichts committet. Server läuft auf 3001** (`autoPort` in `.claude/launch.json` — er springt
beim Neustart, deshalb erst suchen, nicht 3000 annehmen).

### Fertig und im Browser geprüft

- **Die sechs Themenseiten im Kiss-Muster** — Anlass · Grund · drei Schritte · Privatzeile,
  ein Baustein (`components/ThemenVorspann`), sieben Sprachen.
- **Überschriften sprechen den Käufer an**, nicht den Beschenkten (Geburtstag, Urlaub, Chat).
- **Chat ist ein Geschenk, kein Abo** — Einmalkauf, zwei Adressen, Bella-Karussell in der Karte.
- **Gutschein-Thema komplett**: Seite, Kachel auf Platz zwei, Sitemap, Karte mit dem Video des
  Owners (3:4, Originalton), Botschaft, Absenderzeile, EIN Kaufknopf zu **9,99 €**.
  Trichter ist `EinladungBauen variant="gutschein"` — keine Szenen, kein Datum, kein Ort.
- **Erzeugung**: 5 s · 360p · 3:4 · mit Ton (`generate_audio_switch`, der V6-Name).
- **Guthaben vor Stripe**: reicht das Konto, bucht die Kasse ab; reicht es nicht, erscheinen
  die Stufen IM Dialog; nach dem Aufladen läuft derselbe Kauf automatisch weiter.
- **Motto** „Geschenkideen-Portal" in sieben Sprachen statt „AI marketplace".
- **Alle acht Themenseiten in der Sitemap** — vorher stand dort keine einzige.
- **Admin-Codes aus dem Quelltext** in die Umgebung (`STRIPE_PROMO_CODES`, auf Vercel gesetzt).
- **Drei neue Regelwerke**: Skill `bezahlung`, Skill `upload-foto` Pflicht 5 (eine Kachel für
  alle Themen), Memories `titel-spricht-den-kaeufer-an` und `immer-duzen`.

### Offen — in dieser Reihenfolge

1. **Den Gutschein-Kauf einmal ganz durchspielen.** Guthaben leer → Stufen → Stripe → zurück →
   Abbuchung → Erzeugung → fertige Karte. Jeder einzelne Schritt ist gebaut, aber die KETTE ist
   nie am Stück gelaufen.
2. **`/einladung/[id]` kennt den Gutschein noch nicht.** Dort steht nur
   `urlaub = thema === "holiday"`; der Beschenkte bekommt sonst Zusagen, Menü und Gruppenchat
   auf einer Gutschein-Karte.
3. **Der Gutschein selbst fehlt in der fertigen Karte** — Link, PDF oder Bild, hinter einem
   Knopf. Regel: **nur der Link**, nie der Code, nie in der Vorschau (Konzept §3b).
4. **Der Kaufaufruf im Skill `card`** — hell und volle Breite unter der Karte, wie beim Kuss.
   Als einziger der drei Knöpfe noch nicht aufgeschrieben.
5. **Chat-Monat: 14,99 oder 29?** Unbeantwortet.
6. Danach: Punkt 2 (Nachkauf-Knöpfe), Punkt 3 (Haustür), Punkt 4 (Katalog-Kopf und Kacheln).

## 3c. Nachtrag 06.08. — die Gutschein-Kaufkette läuft jetzt durch

**„Die Zahlung beim Gutschein geht nicht"** — es waren DREI Brüche hintereinander, und der
Kauf starb am ersten, den er erreichte:

1. **Nach dem Aufladen kam der Aufladewähler ERNEUT.** Der Wiederholungskauf las den
   Kontostand aus der eingefrorenen Momentaufnahme des Klicks (React-Closure) — also den
   Stand von VOR der Aufladung. Geld auf dem Konto, Kauf nie ausgeführt, Wähler wieder offen.
   Fix: `kontoFrisch` überspringt die Client-Prüfung direkt nach der Aufladung (ob es
   reicht, entscheidet ohnehin der Server beim Abbuchen), und der Wähler merkt sich über
   `aufladeZiel`, WELCHEN Kauf er unterbrach — nach dem Aufladen läuft derselbe Kauf samt
   Erzeugung weiter, nicht ein nacktes `bezahlen` ins Leere.
2. **Nach der Zahlung lief `free-preview`** — mit `person: seinFoto`, und den gibt es beim
   Gutschein nicht. Der frisch zahlende Kunde bekam „Bitte lade zuerst dein Foto hoch."
   Fix: Der Gutschein überspringt das Vorschaubild ganz; eigenes Foto → das 5-s-Video
   (`gutscheinPrompt`), ohne Foto ist unser fertiges Video die Karte.
3. **Verschicken war unerreichbar** (`bild && sie && er` — der Gutschein hat weder Bild noch
   „er"), und `/einladung/[id]` zeigte Hochzeits-Bausteine. Fix: eigene Bedingungen, unser
   Video als Ersatz, `/api/einladung` verlangt beim Gutschein den BEZAHLTEN Auftrag
   (kiss-log-Stempel, sonst 402 — die Stock-Video-Karte wäre sonst gratis), 30 Tage
   Laufzeit statt Probewoche, und die Empfängerseite kennt das Thema: Titel, Botschaft,
   „Von …", Knopf **Gutschein öffnen** (nur http(s)-Link, nie der Code), keine Zusagen,
   kein Menü, kein Gruppenchat, kein Abo-Kasten.

**Neu dabei:** Das Link-Feld erscheint NACH dem Kauf über dem Verschicken-Knopf („Erst beim
Editieren des Gutscheins", Texte `F.uploadYou`/`F.youHint` gab es schon in sieben Sprachen)
— und der Empfänger-Knopf `gutscheinOeffnen` steht neu in `KARTE_TEXTE`, ebenfalls sieben.

**Geprüft am 06.08. im Browser (Handy-Ansicht), mit echten Buchungen im eigenen Speicher:**
leeres Konto → Stufen im Dialog → Aufladung (Stripe-Sitzung über die Testklappe simuliert,
Gutschrift echt) → Kauf bucht 9,99 € ab (12,00 → 2,01 €) → Karte frei, Link-Feld, Verschicken
→ `/einladung/eebaead42e85429a9c` zeigt die fertige Gutschein-Karte. Gegenprobe: POST ohne
bezahlten Auftrag → 402. Hochzeit/Urlaub unverändert (Preiszeile, Knöpfe, keine Fehler).

**Was an der Kette noch offen ist:** ein echter Stripe-Kauf mit Karte (der Weg ist derselbe
`kind: "aufladung"`-Zweig wie beim Kuss, aber ER ist hier nie mit echtem Geld gelaufen) und
ein echter Pixverse-Lauf für das Eigene-Foto-Video (bewusst nicht getestet — kostet einen
echten Lauf). Restspielgeld der Tests: 2,01 € auf beiden Testadressen (gutschein-leer@ und
gutschein-test@example.com) — erfundene Adressen, kann bleiben oder gelöscht werden.

## 3d. Nachtrag 06.08. später — JEDES TOPIC ALS GUTSCHEIN in der Karte

Owner: *„dann machen wir unsere Gutscheine. für unsere Topics"* · *„jeder Topic als
Gutschein einfügen"* · *„jede Topic als Geschenk … Wenn man seine E-Mail-Adresse kennt …
kann man das für jemanden kaufen, weil das gleich sein Login ist. Aber noch einfacher ist
es, man sendet das als Gutschein."*

Fremde Gutscheine verkaufen wir weiter NICHT (Konzept §3b) — wir verkaufen UNSERE: Der
Käufer legt der Gutschein-Karte ein LuxuryBandit-Geschenk bei. Technisch ist es Guthaben
auf der E-Mail des Beschenkten (sein Login, EIN Topf für alle Themen); das Thema bestimmt
Betrag und Einlöse-Ziel.

- **Im Bau-Schritt** (nach dem 9,99-Kauf, unter dem Link-Feld): „Oder leg ein
  LuxuryBandit-Geschenk hinein" — E-Mail des Beschenkten + fünf Chips: Kussvideo ·
  Geburtstagskarte · Tanzvideo · Urlaubs-Einladung (je {once}) · Hochzeitseinladung (29 €).
  Preise aus `themenPreisCents`, Namen aus `KARTE_TEXTE.gutscheinTopics` (sieben Sprachen,
  Chip und Empfängerkarte lesen DIESELBE Tabelle). **Der Chat fehlt mit Absicht:** sein
  Freischalten läuft nicht übers Guthaben — erst wenn `chat-zugang` aus dem Konto zahlbar
  ist, darf er in die Liste (Begründung in `app/api/gutschein-checkout`).
- **Kasse:** `gutschein-checkout` kennt jetzt `topic` (weisse Liste; Preis IMMER aus der
  Tabelle, nie aus dem Aufruf), schreibt ihn in den Kassenvermerk; `checkout-status` gibt
  ihn zurück. Immer Stripe, nie das eigene Guthaben — Konto-zu-Konto-Umbuchung gibt es
  nicht (Memory `guthaben-haengt-an-einer-adresse`).
- **Die Karte des Empfängers** zeigt: „Darin für dich: ein Kussvideo — dein Guthaben liegt
  auf t•••@example.com" (Adresse NUR maskiert — die Seite ist so öffentlich wie ihr Link)
  plus Goldknopf **Jetzt einlösen** → Themenseite des Geschenks. Das Etikett liest die
  Einladungs-Route aus der STRIPE-Sitzung zurück (`lbGutscheinSession`), nie vom Browser —
  eine gefälschte Sitzungsnummer ergibt eine Karte OHNE Etikett (Gegenprobe gelaufen).
  Liegt zusätzlich ein Händler-Link an, wird dessen Knopf zur Zweitzeile (EIN Goldknopf).
- **`?topic=kiss`** auf `/themes/gutschein` stellt das Thema im Wähler nach vorn — damit
  Themenseiten später direkt in den Geschenkweg verlinken können.
- **Geprüft im Browser:** zweiter 9,99-Kauf aus dem Guthaben (12,00 → 2,01 €), roter
  Pflichtfeld-Hinweis, Topic-Kauf über die Testklappe (`TEST-`-Sitzung; auch die
  Einladungs-Route hat jetzt dieselbe Drei-Schlösser-Klappe), fertige Empfängerkarte
  `/einladung/afeb1e7f87cb4a6d88`, Einlöse-Link auf `/themes/kiss`. Ein ECHTER
  Topic-Gutschein-Kauf mit Karte steht noch aus (selber `kind: "gutschein"`-Zweig, der die
  Gutschrift längst kann).
- **Nächster Schritt, wenn der Owner will:** je Themenseite eine Zeile „Verschenken? →
  `/themes/gutschein?topic=…`" (ein Satz im `ThemenVorspann` oder unter dem Preis-Chip) —
  bewusst noch nicht gebaut, Platz und Wortlaut sind Geschmackssache.
- **„made by luxurybandit.com" ist jetzt überall ein LINK** (Owner 06.08.: „auf der Karte
  fehlt noch etwas. Made by Luxurybandit.com und auch link drauf"): auf der Bau-Karte, der
  Empfängerseite (dort fehlte die Zeile ganz), im Kuss- und Holiday-Trichter, auf der
  Chat-Karte und im Plan-Slide — gleiche Optik, Ziel `/?utm_source=karte`. Memory
  `karten-fuer-videos` entsprechend ergänzt.

## 3e. ENDMODELL 06.08. — der Gutschein, wie er jetzt IST

Der Owner hat das Produkt im Laufe des 06.08. in vier Schritten zugespitzt; §3c/§3d oben
sind Zwischenstände. Das gilt jetzt:

1. **Die Karte ist GRATIS** („Die Gutscheingenerierung kostet nichts. … er muss nur den
   kredit oder das produkt bezahlen, dass ers verschenken möchte"). Die 9,99-Verpackungsgebühr
   ist abgeschafft; `bezahlen()`/Aufladeleiter werden vom Gutschein nicht mehr gerufen. Das
   Schild sagt „ab 15 €" — das billigste Geschenk darin (`themenPreisCents("gutschein")`).
2. **Kein Upload** („ich will hier eigentlich gar nicht dass die Leute ihre eigene Bilder
   uploaden. Das wird keiner machen. Wir haben die Bella, die die Botschaft bringt.") — Dialog:
   Botschaft · Von · Geschenk-Wahl · Käufer-Mail. Keine Foto-Anleitung, keine Kachel.
3. **Keine fremden Gutscheine** („wir machen keine fremde gutscheine mehr. Also raus.") —
   Link-Feld, `gutscheinLink`-Speicherung und der „Gutschein öffnen"-Knopf sind entfernt;
   die Landingpage-Texte (WERBUNG von Hand ×7, trObject-Meister, Metadata) verkaufen jetzt
   UNSEREN Gutschein: Produkt wählen → zahlen → wir mailen die Karte.
4. **Die Wahl steht VOR der Kasse** („wie wählt er unser Produkt aus oder Credit?"):
   `geschenkWahl` — EIN Baustein an zwei Orten. Im Dialog AUSWAHL (Chip an/aus, Kaufknopf
   zeigt den Produktpreis oder „Karte erstellen" für die Gratis-Karte), unter der Karte
   Sofort-Kauf. Fünf Produkte (`KARTE_TEXTE.gutscheinTopics` ×7) + „Oder nur Guthaben:
   15/30/60" (`GUTSCHEIN_STUFEN`). Chat fehlt, bis er aus dem Guthaben zahlbar ist.
5. **Bestätigung + zwei Mails** („email geht an beide raus. Käufer und Empfänger."):
   `/api/einladung` mailt nach dem Anlegen (MAIL_TEXTE ×7, best-effort) — dem Beschenkten
   mit **signiertem Einlöse-Link** (`lib/einloese-token`, HMAC über Karte+Adresse), dem
   Käufer den Karten-Link; der Käufer landet mit `?verschickt=1` auf der Karte und liest
   „Verschickt — a•••@… hat den Link per E-Mail bekommen" (KARTE_TEXTE `verschicktMit/Ohne`).
6. **Mail-Klick = angemeldet** („Kann er draufklicken und ist sofort angemeldet? … und sein
   Credit ist geladen?"): Der signierte Link hinterlegt die Adresse als Geräte-Login
   (`GeschenkAnmeldung`, überschreibt NIE eine vorhandene) → Guthaben-Chip zeigt sein
   Geschenk, „Jetzt einlösen" führt auf die Themenseite, die Kasse zahlt aus dem Guthaben.
   Der nackte Karten-Link meldet niemanden an (sonst wäre jeder Weiterleser Kontoinhaber);
   ein gefälschter Token tut nichts — beides geprüft.
7. **Nach dem Verschicken wird die Wahl geleert** (synchron im Entwurf), sonst trüge die
   nächste Karte dasselbe Etikett. Vorgabe-Botschaft neu (ohne Theater-Fremdgutschein):
   „Alles Liebe zum Geburtstag! Dein Geschenk wartet hinter dem Knopf." ×7.

**Geprüft im Browser (frischer Server, `.next` neu):** Wahl → „Geschenk bezahlen — 15 €" →
(Testklappe) → „Bezahlt — ein Kussvideo liegt bereit" → Verschicken → Karte
`/einladung/c93daab1f6c94083be` mit Verschickt-Banner, Guthaben-Kasten, made-by-Link; Login
über signierten Link ✓, gefälschter Token ✓ wirkungslos; Hochzeit unverändert (Anleitung,
zwei Kacheln, „Einladung mit Bild — 15 €").

**Offen:** ein ECHTER Stripe-Kauf (Karte, echtes Geld) und ein Blick in echte Postfächer
(SMTP steht, aber die Mails gingen bisher nur an example.com); die Gratis-Karte ist bewusst
offen — wenn Spam kommt, braucht sie einen Deckel; Themenseiten-Verlinkung
(`/themes/gutschein?topic=…`) steht bereit, aber noch nirgends verlinkt; Chat erst nach
Guthaben-Zahlweg in die Liste.

## 3f. Nachtrag 06.08. mittags — vier Sicht-Fixe nach dem ersten Push

- **Foto-Anleitung im Paar-Modus** (Owner: „Oben steht dass nur eine Person gewählt werden
  kann. Das stimmt nicht."): Beim Tab „Ein Foto von uns beiden" dreht das vierte Beispiel um
  — grünes Häkchen, „Ihr beide — gross und scharf" (`FotoAnleitung paar`, `zweiOk` ×7).
- **Hochzeit: nur noch ZWEI Szenen** („Szene 123 sind ehe gleich") — Kirche und Der erste
  Kuss; alte Kennungen fallen auf „keine Szene" zurück.
- **„Lieber gleich ein Video — {videoauf}" ist raus** („niemand weiss was das ist") — seit
  Bild und Video beide {once} kosten, war der Zweitknopf ein Rätsel. Der Weg zum Video
  bleibt „Daraus ein Video machen" unter der fertigen Karte.
- **Kuss-Karte spielt die vier Videos aus `public/Kiss`** — und NUR die (lokal, umbenannt:
  kiss-stand-close.mp4); die alten Supabase-Admin-Beispiele verdoppelten dieselben Küsse.
- **Herzchen/Zurufe liegen jetzt IN der Karussell-Folie** („hier sammeln sich die Icons und
  Schrift. Das stört.") — vorher flogen sie über Punkte, Kaufknopf und made-by-Zeile.

## 4. Fallen, die heute Zeit gekostet haben

- **`.next` zerbricht immer wieder.** Symptom: „ich sehe nichts", Fehler an einer festen
  compilierten Zeile, `ENOENT … pack.gz`. **Nicht den Code debuggen** — Server stoppen,
  `rm -rf .next`, neu starten. Und: `.next` **niemals löschen, während der Server läuft**.
- **Port 3000 war von einem alten Prozess belegt**, deshalb bekam jeder Neustart eine
  Zufallsnummer und der Owner sah alte Stände. Ist bereinigt; der Server läuft auf **3000**.
- **`.lb-fb` (helle Fassung) färbt jeden `<button>` in Kopfzeile und Dialogen weiss.** Wer dort
  einen farbigen Knopf braucht, nimmt `role="button"` an einem `span` — sonst weisse Schrift
  auf weissem Grund.
- **Deutsche Anführungszeichen in `.ts`-Dateien:** Ein gerades `"` als Schlusszeichen zerreisst
  die Zeichenkette. Immer `„…"` mit dem richtigen Schlusszeichen.
- **Keine erfundenen Referenzen.** Firmennamen, Summen, Jahreszahlen zur Sendung nur, wenn der
  Owner sie liefert.
