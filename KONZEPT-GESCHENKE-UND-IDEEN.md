# Konzept — **LuxuryBandit Geschenke**

> Stand 04.08.2026 · Entscheidung getroffen, Umsetzung offen.
> Anlass: Owner 04.08.2026 — *„Also wir machen jetzt einen Plan. Einladungen,
> Geburtstagsgrüsse, Geschenke, für Sister … das was wir haben sind alle Geschenke, digitale
> Geschenke, Grusskarten. Die Geschäftsidee ist genau das, was wir gebaut haben."*
>
> Ersetzt nicht [KONZEPT-GESCHENKE.md](KONZEPT-GESCHENKE.md), sondern sortiert es neu: Dort
> ging es um Geschenk vs. Hosting, hier um **zwei Regale** — und um ein zweites Produkt, das es
> am 03.08. noch nicht gab.
>
> Die Regeln zum Geschäftsidee-Teil stehen im Skill `business-analyse`. Die Regel zum
> Gratis-Bild im Memory `gratis-nur-mit-muster`.

---

## 0. Die Klammer

Owner 04.08.2026, nachdem die Liste stand: *„und das sind LuxuryBandit Geschenke alle!!!!!!
Wir haben es."*

> ## LuxuryBandit — das Geschenkideen-Portal
> **Geschenke, die es sonst nicht gibt — mit dem Gesicht der Menschen, um die es geht.**

Owner 04.08.2026: *„Luxurybandit das Geschenkideen Portal."* Die Zeile gehört als **Motto in
den Kopf jeder Seite**, an die Stelle von „AI marketplace" (components/TopNav.tsx) — sie nennt
den Auftrag statt der Technik.

**Aber nicht als Suchwort.** `geschenkideen` ist Amazon-Land: jeder Shop und jedes Magazin
kämpft darum. Gemessen am 04.08.2026 gehört uns der Zwilling daneben, und er ist wieder nach
EMPFÄNGER gegliedert — zum dritten Mal dasselbe Muster:

```
persönliches geschenk  → für freundin · für freund · für beste freundin · für mama · FÜR SCHWESTER
regalo personalizado   → hombre · mujer · PROFESORA · amiga · mama · día de la madre
```

„Persönliches Geschenk für die Schwester" ist eng genug, dass man dort ankommt — und es
beschreibt genau das, was Amazon nicht kann: **mit seinem Gesicht.**

**Zweiter Fristentreiber neben Weihnachten:** Muttertag und Vatertag (`día de la madre`,
`día del padre`). Millionen suchen am selben Tag ein persönliches Geschenk und haben keine Zeit
mehr, etwas zu bestellen. Unseres ist in fünf Minuten fertig — das ist der Vorteil, den kein
Versand hat.

Das ist der Name des Regals und die Überschrift des Katalogs. **Alles** darin ist ein Geschenk:
der Kuss, die Hochzeit, der Gutschein, der Geburtstag, der Urlaub, der Tanz, die KI-Freundin —
und das System („Schenk ihm die Antwort").

Damit fällt die Aufteilung „für jemand anderen / für dich selbst" weg, die vorher hier stand:
Wenn alles ein Geschenk ist, braucht der Katalog keine Trennwand. Das System behält nur
ZUSÄTZLICH seine eigene Tür für den Selbstkäufer (`/themes/luxurybandit-plan`) — dort landen
Anzeigen und Suche, und dort liegt der wertvollste Klick. Im Katalog steht es als Geschenk.

### Und der Satz gegen den Wettbewerb

> **Canva und CapCut geben dir Werkzeug. Wir geben dir das Ergebnis.**

Owner 04.08.2026: *„Canva ist das, was viele nicht brauchen, genauso wie CapCut für Videos.
Beide sind sehr komplex und das brauchen viele nicht."*

Sie verkaufen **Können** — wer bei Canva ankommt, muss gestalten können; wer bei CapCut
ankommt, muss schneiden können. Wir verkaufen **Fertigsein**: ein Foto hochladen, fertig.

Und der zweite Unterschied, der genauso zählt: **Sie verkaufen Abos, wir verkaufen einmal.**
Bei Canva kommt man nicht ohne Abo an das eigene Ergebnis heran — der Owner nennt es eine
Falle, und die Suchdaten unten geben ihm recht.

---

## 1. Was gemessen wurde (04.08.2026, Google Keyword Planner + Autovervollständigung)

Vier Exporte, drei Märkte. **Das ist der teuerste Teil dieses Dokuments — nicht wegwerfen.**

| Markt · Gruppe | Volumen/Mon | Ø Gebot oben | Wettbewerb |
|---|---|---|---|
| Einladungen 🇪🇸 | 288.000 | 0,35 € | 10 % hoch |
| Einladungen 🇷🇴 | 286.000 | 0,40 € | 35 % hoch |
| **Grussvideo 🇩🇪** | 19.000 | **1,38 €** | **0 % hoch** |
| **Geschäftsidee 🇷🇴🇪🇸** | 202.000 | **0,91–0,96 €** (Spitzen 5,74 €) | **5–11 % hoch** |
| Video/Gruss 🇷🇴 | **300** | 0,48 € | — |

**Die fünf Befunde:**

1. **Die Videoeinladung wird nicht gesucht.** 🇷🇴: acht Begriffe, 300 Suchen. Das ist kein
   „wenig", das ist „nicht vorhanden". Sie ist ein Anzeigen- und Weitergabe-Produkt und wird
   nie ein Suchprodukt.
2. **Der wertvollste Klick liegt bei der Geschäftsidee** — Faktor drei bis fünf gegenüber den
   Geschenken, bei einem Drittel des Wettbewerbs.
3. **Deutschland hat eine offene Tür:** Grussvideo, 19.000 Suchen, Gebote bis 2,30 €, **kein
   einziger Begriff mit hohem Wettbewerb**.
4. **Der Suchende sucht den EMPFÄNGER, nicht das Produkt** — in jeder Sprache dasselbe:
   `para una hermana` · `for sister` · `für Männer` · `para mi hija`.
5. **Niemand sucht „Idee prüfen".** Gesucht wird *finden · mit wenig Geld · klein und
   profitabel*. `idei de afaceri` trägt 500er-Volumen, kein Prüf-Begriff kommt in die Nähe.

**Und ein Denkfehler, der dabei aufgeflogen ist** (Owner hat ihn aufgedeckt): Ein niedriges
Gebot heisst **„dort keine Klicks kaufen"** — nicht „dort nicht hingehen". Für Verkehr, den man
sich verdient, zählt allein Volumen und Wettbewerb. Nicht wieder verwechseln.

---

## 2. Regal 1 · Digitale Geschenke

**Alles, was wir haben, ist dasselbe Ding: eine Grusskarte, die man verschickt.** Hochzeit,
Geburtstag, Urlaub, Kuss, Überraschung sind **Anlässe eines Produkts**, keine fünf Produkte.

**Struktur nach Anlass UND Empfänger** — weil danach gesucht wird:
„Geburtstagsvideo für die Schwester" · „für Mama" · „zum 60." — je eine Seite, eine Maschine.

**Namen:** Suchwort nach vorn, Format in die Zeile. Nicht „Wedding invitation video", sondern
**Hochzeitseinladung** und darunter „als Video, mit euren Gesichtern".

### Das Regal, wie es steht (Owner 04.08.2026)

| | Kachel | Zeile darunter |
|---|---|---|
| 1 | **Kussgruss** | Dein Foto und ihres — ein Video von euch beiden, für sie allein. |
| 2 | **Hochzeitsplaner** | Eure Einladung als Video — mit Zusagen, Gästeliste, Menüwahl und Gruppenchat. |
| 3 | **Gutschein verpacken** | Sein Gutschein, verpackt in eine Videokarte — statt einer nackten E-Mail. → §3b |
| 4 | **Geburtstagsgruss** | Sie sagt seinen Namen und gratuliert — mit deiner Botschaft, als Video. |
| 5 | **Urlaubseinladung** | „Komm mit mir" — als Video, in dem ihr schon dort seid. |
| 6 | **Poledance-Überraschung** | Ein Foto von dir → ein Tanzvideo, nur für ihn. |
| 7 | **KI-Freundin** | Eine Frau, ein Chat — sie antwortet in deiner Sprache, Tag für Tag. |
| 8 | **Das LuxuryBandit System** | *verschenkt* — „Er redet seit zwei Jahren von seiner Idee. Schenk ihm die Antwort." |

### Auf der Liste — beschlossen, aber NICHT jetzt

**9 · Try-on als Geschenk für Frauen.** Owner 05.08.2026: *„Das try-on wird auch ein Geschenk
sein für Frauen. Die sich in Lingerie oder anderen Klamotten sehen wollen. Jetzt aber nicht
umsetzen."*

Es ist das Gegenstück zur Poledance-Überraschung — dort schenkt SIE IHM, hier schenkt man IHR.
Und es ist das einzige Geschenk im Regal, dessen Maschine **schon fertig dasteht**: Das Try-on
läuft seit Wochen (`/try`, FASHN + Pixverse). Was fehlt, ist nicht die Technik, sondern die
Verpackung — eine Themenseite mit Anlass, Grund, drei Schritten und einer Karte, wie bei allen
anderen.

**Nicht anfangen, bevor das Preis-Paket steht.** Beim Try-on kostet ein weiteres Video heute
3,99 € (`EXTRA_VIDEO_CENTS`), ein Video mit Bella 9,99 € (`BELLA_VIDEO_CENTS`) — derselbe
Pixverse-Lauf zu zwei Preisen. Owner am selben Abend: *„ich glaube die Videos sind dort zu
günstig."* Wer die Seite vorher baut, schreibt den Preis fest, den er hinterher ändern will.

**11 · Party- und Event-Einladungen.** Owner 05.08.2026: *„und zu der Ideen noch Party/Event
Einladungen hinzufügen. Es ist mir eingefallen."*

Es ist dieselbe Maschine wie Hochzeit und Urlaub (`EinladungBauen`) — Datum, Ort, Zusagen,
Gästeliste, Gruppenchat stehen alle schon. Was fehlt, sind die Anlässe: Geburtstagsfeier,
Einweihung, Abschluss, Firmenfeier, Silvester, Taufe.

**Und es ist der einzige Punkt auf dieser Liste, der KEIN Geschenk ist** — er lädt zu seiner
eigenen Party ein, er schenkt nichts. Damit fällt es aus der Klammer „alles ist ein Geschenk",
und das ist zu entscheiden, bevor es gebaut wird: eigene Kachel neben den Geschenken, oder eine
zweite Reihe. Die Überschrift muss dann auch nicht den Schenkenden ansprechen, sondern den
Gastgeber (siehe Memory `titel-spricht-den-kaeufer-an`).

**Der Markt ist der grösste von allen, die gemessen wurden:** Einladungen 🇪🇸 288.000 und 🇷🇴
286.000 Suchen im Monat (§1) — das ist Faktor zehn gegenüber dem Grussvideo. Die Zahl gehört
allerdings zur *Hochzeits*-Einladung; für Party und Event ist sie nicht getrennt erhoben.

**10 · „Good morning" als Geschenk verpacken.** Owner 05.08.2026: *„Good morning können wir
auch als Geschenk verpacken. Das ist doch schon da."*

Er hat recht, und es ist derselbe Handgriff wie beim Try-on: Die Maschine steht seit Wochen
(`/themes/wetter` — sie schreibt jeden Morgen, mit dem Wetter von dort, wo er ist). Was fehlt,
ist die Verpackung. Und es ist das Geschenk mit der **längsten Laufzeit** von allen: Der Kuss
wird einmal angesehen, eine Morgennachricht kommt dreissig Mal — jeden Morgen erinnert sie
daran, wer sie geschenkt hat.

Es teilt sich mit dem Chat auch die Kostenrechnung: reiner Text, Bruchteile eines Cents am Tag
(siehe CONCEPT-DAILY-MESSAGES.md). Zu klären ist nur das, was beim Chat auch offen ist — wie
der Beschenkte seinen Monat bekommt, ohne dass der Schenker sein eigenes Konto weitergibt.

> **„Schenk ihm den Anfang" ist gestrichen** (Owner 05.08.2026: *„das ist schlecht. Es ist so
> als willst du ihn infizieren"*). Der Satz verschenkt kein Ding, sondern einen Zustand — und
> „den Anfang" von etwas bekommen liest sich, als würde man jemandem etwas einpflanzen, das er
> nicht bestellt hat. **Ein Geschenk muss man in der Hand halten können.** „Die Antwort" ist
> genau das, was das Produkt liefert: drei Jurys streiten über seine Idee, heraus kommt ein
> Bericht, den er weiterschicken kann. Und es beantwortet die Frage, die er sich seit zwei
> Jahren selbst stellt.

**„Liebesgeschenk" ist gestrichen** und durch die Hochzeit ersetzt: Es hätte dasselbe Video mit
anderem Wort geliefert. Zwei Kacheln für ein Ding heisst, dass der Besucher raten muss — und
jede Entscheidung, die er VOR dem Ergebnis treffen muss, kostet Käufer. Dieselbe Lehre wie beim
Rauswurf der Szenenauswahl am 03.08.

**„Hochzeitsplaner" auf der Kachel, „Hochzeitseinladung" im Seitentitel** (Owner 04.08.2026:
„Hochzeitsplanner heisst es besser").

Das ist kein Kompromiss, sondern die richtige Arbeitsteilung: **Google liest den Seitentitel
und die H1, nicht den Namen im Katalog.** Die Kachel ist Marke, der Seitentitel ist Auffindbarkeit.

| | |
|---|---|
| Kachel | **Hochzeitsplaner** |
| Seitentitel | Hochzeitseinladung als Video — mit Zusagen, Gästeliste und Gruppenchat |
| H1 | Eure **Hochzeitseinladung** — als Video, mit euch beiden darin |

Der Name trägt ausserdem den Preis besser: Bei „Einladung" für 19 € fragt jemand nach, bei
„Planer" nicht — denn es IST Planung (Zusagen, Gästeliste, Menü, Chat, die Seite die online
bleibt).

**Die Bedingung:** Was Planer heisst, muss planen. Wer über das Wort kommt und nur eine Karte
bekommt, erlebt dieselbe Enttäuschung, die wir Canva vorwerfen — nur an anderer Stelle.

**Verkehr:** Weitergabe und Anzeigen — **nicht** Google. Dort steht Canva mit zehn Jahren
Vorsprung, und ein Klick ist 30 Cent wert.

**Die eine Ausnahme, die sich lohnt:** 🇪🇸 `crear invitación de cumpleaños para whatsapp
gratis` — 5.000 Suchen, **niedriger** Wettbewerb. Drei Wörter, drei Sachen die wir haben:
*crear* (machen), *whatsapp* (unser Kanal), *gratis* (unser Musterbild).
Bedingung: Auf dieser Seite muss wirklich etwas Kostenloses herauskommen, sonst nimmt Google
das Ranking wieder weg.

---

## 3. Regal 2 · Geschäftsidee — **zwei** Topics

Owner: *„Die Leute brauchen Geschäftsideen, weil sie fantasielos sind. Das Internet bietet
Kurse für hunderte von Euros an und Workshops. Wir liefern das Rezept."*

| Topic | für wen | Stand |
|---|---|---|
| **Ich habe eine Idee** | prüfen: drei Jurys streiten darüber | **gebaut** (`/themes/luxurybandit-plan`) |
| **Ich brauche eine Idee** | finden: Ideen nach **Ort · Chance · Potenzial**, dann sofort geprüft | fehlt |

**Warum getrennt und nicht als Frage im selben Trichter** (Owner: *„Wir machen das extra, um das
nicht zu komplizieren"*): Zwei Eingänge sind zwei Suchbegriffe, zwei Anzeigen und zwei klare
Versprechen. Ein Trichter mit einer Weiche ist eine Entscheidung, die der Besucher vor dem
Ergebnis treffen muss — und jede Entscheidung davor kostet Käufer.

**Und Topic 2 ist die GRÖSSERE Tür.** Das sagen die Zahlen, nicht das Gefühl: Gesucht wird das
Finden, nicht das Prüfen.

**Gleiche Maschine, gleicher Aufbau, gleicher Preis.** Nur der Eingang ist ein anderer.

---

## 3b. Regal 1 · das neue Produkt: **Gutschein verpacken**

Owner 04.08.2026: *„Die Leute wollen Gutscheine versenden, aber senden die Gutscheine per
E-Mail. Ich kann die Verpackung anbieten mit einer VideoCard."*

**Es ist das einzige Geschenkprodukt mit gemessener Suchnachfrage** — und es gehört deshalb
an Platz zwei, direkt hinter das System.

### Was gemessen wurde (04.08.2026, Autovervollständigung)

```
DE  gutschein VERPACKEN ideen · verpacken lustig · im glas · bilderrahmen · verpacken mann
DE  gutschein verschenken VERPACKUNG · verschenken TEXT · basteln
DE  gutschein TEXT vorlage · text lustig · text geburtstag · text hochzeit
DE  gutschein SPRUCH geburtstag · spruch kurz · spruch zeit schenken · GEDICHT zum überreichen
EN  how to give a gift card CREATIVELY · gift card presentation IDEAS · for christmas · funny
EN  gift card message FOR WEDDING · for girlfriend · for teacher · for graduation · for friend
EN  what to write in a gift card FOR A FRIEND · for christmas · for boyfriend
```

**Die Lücke:** Alle vorhandenen Antworten sind **Bastelanleitungen** — im Glas, im
Bilderrahmen, gefaltet. Und genau das hilft nicht: Sein Gutschein ist **digital**, er hat ein
PDF im Postfach. Zwischen dem, was er hat, und dem, was ihm angeboten wird, klafft eine Lücke.

**Zwei Suchabsichten, ein Produkt** (Owner: *„die Leute suchen hier entweder nach Botschaft
oder Gutscheine"*):

| Absicht | er sucht | wir antworten |
|---|---|---|
| **Was schreibe ich?** | `gutschein text` · `spruch` · `gedicht` · `what to write` | drei Vorschläge, sofort, **gratis** |
| **Wie verpacke ich es?** | `gutschein verpacken ideen` · `presentation ideas` | die Video-Karte |

Und wieder gegliedert nach **Empfänger und Anlass** — *für die Freundin · für die Lehrerin ·
zur Hochzeit · zur Taufe · zu Weihnachten*. Je eine Seite, eine Maschine.

### Warum dieser Trichter der beste ist, den wir haben

**Der Gratis-Schritt kostet nichts.** Überall sonst ist das Verschenkte ein BILD (~1 €
Erzeugung, auch bei dem, der nie kauft). Hier ist es ein **TEXT** — Bruchteile eines Cents.
Es steht schon in [CONCEPT-DAILY-MESSAGES.md](CONCEPT-DAILY-MESSAGES.md): *„Das teure KI-Bild
entsteht einmal. Alles Tägliche ist reiner Text — und Text kostet praktisch nichts."*

Das ist der einzige Trichter, den wir **unbegrenzt offen lassen** können.

```
Er sucht „was schreibe ich auf einen Gutschein für meine Freundin"
  → drei Vorschläge, gratis, in seiner Sprache, für seinen Empfänger
  → „Willst du es nicht nur schreiben, sondern sagen?"
  → Video hochladen · Gutschein anhängen · Karte verschicken
```

### Die Karte

Dieselbe `EinladungKarte`, ein anderer Anlass, ein Knopf mehr:

> **Titel oben:** Surprise, Surprise 🎁
> **Video:** er, mit seiner Botschaft
> **Text:** „Hallo Peter, ich habe einen Gutschein für dich, mein Lieber. Eine Karte fürs Theater am 12.12."
> **Knopf:** *Gutschein öffnen* → sein PDF
> **Unten:** made by luxurybandit.com

### Zwei Regeln, die nicht verhandelbar sind

**1 · Wir VERPACKEN Gutscheine, wir verkaufen keine.** Er lädt seinen eigenen hoch (PDF, Code,
Foto). Der Unterschied ist kein Geschmack:

| | verpacken | selbst verkaufen |
|---|---|---|
| Recht | nichts Besonderes | Gutscheine sind in der EU ein **Zahlungsinstrument** — Verfall, Haftung, Aufsicht |
| Geld | seins bleibt seins | wir halten fremdes Geld |
| Reichweite | **jede** Marke ab Tag eins: Amazon, Theater, Therme, Restaurant | nur mit Verträgen |

**2 · Der Code ist Geld und gehört hinter den Link.** Nicht ins Video, nicht in die
Vorschau, nicht in den Text der Nachricht. Ein Vorschaubild in WhatsApp, das den Code
mitliefert, ist eingelöst, bevor der Empfänger ihn sieht — und der Link darf nicht erratbar
sein (dieselbe Regel wie bei den Einladungs-IDs).

### Der Zeitpunkt

`for christmas` steht in den Vorschlägen. **Gutscheine sind ein Dezember-Geschäft mit harter
Frist** — derselbe Druck wie bei einer Hochzeit, nur jedes Jahr und für alle gleichzeitig. Wer
das Produkt im November nicht stehen hat, wartet ein Jahr.

---

## 4. Die Wörter, in denen die Seite sprechen muss

```
ohne Geld · mit wenig Geld · bis 5.000 €
klein und profitabel · von zu Hause · aus nichts
```

🇷🇴 `idei de afaceri cu bani putini` · `afaceri mici profitabile` · `idei de a face bani din nimic`
🇪🇸 `ideas de negocio en casa rentable` · `negocio con poco dinero` · `negocios rentables en locales pequeños`

Das ist **der Ton, nicht nur die Stichwortliste.** Diese Menschen sagen nicht „skalieren", sie
sagen **„anfangen, mit dem was ich habe"**. Wer auf dieser Seite von Wachstum und Strategie
redet, spricht an ihnen vorbei.

---

## 5. Die Inkubatoren — der Teil, den die Kursverkäufer nicht nachmachen können

Owner: *„Eventuell darüber holen wir auch Inkubatoren dazu. Wir empfehlen Programme EU, oder
Firmen die dir dabei helfen."*

Nach dem Plan kommt der Satz, den sonst niemand liefert: **„Und hier ist, wer dir dabei
hilft."** Regionale Förderprogramme, EU-Töpfe, Gründerzentren, Kammern — passend zu **seinem
Ort** und **seiner Idee**.

Drei Gründe, warum das mehr wert ist, als es aussieht:

1. **Es beantwortet die einzige Frage, die nach dem Plan bleibt.** Er hat eine geprüfte Idee
   und drei nächste Schritte — und steht dann allein da. Eine Adresse in seiner Stadt ist der
   Unterschied zwischen einem Bericht und einem Anfang.
2. **Es ist der Gegenentwurf zum Kursverkäufer.** Der verkauft Zugang zu sich selbst. Wir
   schicken ihn zu jemandem, der ihm wirklich helfen kann — und verdienen nichts daran.
3. **Es macht den Bericht teilbar.** Eine Liste echter Anlaufstellen gibt man weiter.

**Die Grenze, wie überall:** Wir **nennen** Programme, wir versprechen **kein Geld und keine
Bewilligung**. „Diese drei gibt es in deiner Region, hier ist der Link" — nie „du bekommst
10.000 €".

---

## 6. Geld

**Die Preisleiter, Stand 04.08.2026** (Owner: „wir machen die Preise ab 14,99 €"):

| Produkt | Preis | Art |
|---|---|---|
| Kussgruss | **14,99 €** | einmal |
| Geburtstagsgruss | **14,99 €** | einmal |
| Urlaubseinladung | **14,99 €** | einmal |
| Gutschein verpacken | **14,99 €** | einmal |
| Poledance-Überraschung | **14,99 €** | einmal |
| KI-Freundin | **14,99 €** | ein Monat, danach neu kaufen |
| **Hochzeitsplaner** | **29,99 €** | 30 Tage, Verlängerung 29,99 € je Monat |
| **Das LuxuryBandit System** | **59 €** | je Analyse |

### KEIN ABO — nirgends

Owner 04.08.2026: *„Der Chat kostet auch 14,99 für einen Monat. Wenn jemand das weiter will,
der kann das noch mal kaufen"* · *„genau so mit Hochzeitsplaner."*

Damit ist es eine **Hausregel und keine Produkteigenschaft**: Nichts verlängert sich von
allein. Das ist die zweite Hälfte der Position gegen Canva — *sie verkaufen Abos, wir
verkaufen einmal*, ausnahmslos.

Auf dem Papier kostet das wiederkehrenden Umsatz. In Wirklichkeit spart es vergessene Abos,
Kündigungsmails, Rückbuchungen und den Kündigen-Knopf, den jemand pflegen muss. Wer nach
dreissig Tagen erneut kauft, wollte es wirklich.

**Umbau, der daran hängt:** Der Chat läuft in Stripe heute als wiederkehrender Preis
(`stripeChatPriceId`, `recurring`). Ein gekaufter Monat braucht einen eigenen Einmalpreis und
einen Zugang, der nach 30 Tagen ausläuft — ohne automatische Verlängerung.
Das **Themen-Abo** (`TOPIC_EFFECTIVE_MONTHLY_CENTS`, 24,50 €/Monat) widerspricht der Regel und
verkauft ohnehin nichts mehr — es gehört raus.

### 30 Tage, überall

Owner: *„alle haben ein Verfallsdatum. 30 Tage."*

Drei Dinge hängen daran, und sie sind nicht optional:

1. **Erinnerung vor Ablauf.** Sonst läuft die Hochzeitsseite zwei Tage vor der Hochzeit aus,
   und zweihundert Gäste stehen vor einer toten Adresse. Das ist der eine Fehler, den niemand
   verzeiht.

   **Und sie kann rechnen, weil wir das Datum haben** — es steht im Formular:

   > *Eure Seite läuft am 12. März ab — eure Hochzeit ist am 20. April.
   > Verlängert jetzt, damit eure Gäste am Tag selbst nicht vor einer toten Adresse stehen.*

   Das ist keine Mahnung, sondern ein Dienst, und es verkauft die Verlängerung von allein: Die
   Rechnung ist offensichtlich. Kein Wettbewerber kann das, weil keiner den Termin kennt.
   Fällt das Ablaufdatum VOR den Anlass, muss die Erinnerung deutlicher sein als sonst.
2. **Abgelaufen heisst nie verschwunden.** Die Seite zeigt „reaktivieren", kein 404 — Zusagen,
   Gästeliste und Chat bleiben erhalten. Texte dafür stehen schon in `EinladungKarte`
   (`abgelaufen`, `wiederTitel`).
3. **Was er heruntergeladen hat, gehört ihm für immer. Nur was wir hosten, läuft ab.**
   Sein Video, sein Bild, seine Mappe liegen auf seinem Telefon — die kann niemand ablaufen
   lassen. Ablaufen kann nur die **Seite** bei uns: Einladung mit Zusagen, Chat, geteilte
   Adresse. Ohne diese Trennung hätte jemand 14,99 € für etwas gezahlt, das nach dreissig Tagen
   weg ist — Rückbuchung und schlechte Bewertung, zu Recht.
   Es ist derselbe Satz wie oben: *Das Geschenk kauft man. Das Hosting mietet man.*

### Die Gratis-Leiter (Memory `gratis-nur-mit-muster`)

| Stufe | was er bekommt |
|---|---|
| **gratis** | sein Bild — herunterladbar und verschickbar, mit `© luxurybandit.com` über die ganze Fläche |
| **klein** | dasselbe Bild ohne die Adresse |
| **der Preis** | das Video |

**Der Handel steht VOR der Arbeit, nie danach.** Genau die Überraschung nach getaner Arbeit ist
der Fehler, den wir Canva vorwerfen — ihn selbst zu bauen wäre das Ende der Glaubwürdigkeit.

**Bei 14,99 € kauft niemand mehr auf Verdacht.** Damit ist das Gratis-Bild mit Wasserzeichen
kein Marketing-Extra, sondern **der ganze Trichter**: Er muss sein Ergebnis sehen, bevor er
zahlt. Ohne diesen Schritt ist der Preis nicht zu halten.

**Alle Zahlen gehören in `lib/pricing.ts`**, in den Texten stehen nur Platzhalter
(siehe Memory `prices-only-from-pricing-table`). Owner zum System: *„sonst hört sich das nach
nichts an"* — bei einem System ist der Preis Teil des Produkts, und dasselbe gilt rückwärts
für die Geschenke: 1,49 € trug nicht einmal die Erzeugung.

---

## 6b. Scharfgeschaltet wird zusammen, nicht einzeln

Owner 04.08.2026, auf die Frage „sofort oder zusammen": **zusammen.**

**Die Preise dürfen NICHT vorher steigen.** 14,99 € mit den alten Texten und ohne Gratis-Bild
wäre ein Preis ohne die Begründung, die ihn trägt — und `ONCE_CENTS` bedient heute Kuss,
Hochzeit, Urlaub und Geburtstag bis in die Kasse hinein. Eine Zahl dort ändert sofort, was der
nächste Besucher zahlt.

**Das Paket, in dieser Reihenfolge:**

1. ~~**Wasserzeichen** serverseitig in `/api/free-preview`~~ — **ERLEDIGT 04.08.2026.**
   `lib/wasserzeichen.ts` brennt `© luxurybandit.com` schräg über die ganze Fläche; die Route
   legt die SAUBERE Fassung ab und liefert die gewasserzeichnete aus. Gilt für alle Themen.
   Dichte hängt an drei Zahlen oben in der Datei (~0,4 s und ~0,4 MB je Bild).
2. ~~**Der Handel vor der Arbeit** — die Zeile am Eingang, bevor er das Foto hochlädt.~~ —
   **ERLEDIGT 04.08.2026.** `lib/handel.ts` ist die eine Quelle (sieben Sprachen, Zahlen nur
   als Platzhalter), `components/HandelZeile.tsx` zeigt sie. Sie steht an **fünf Eingängen**,
   jeweils ÜBER den Upload-Feldern: Kuss · Geburtstag · Tanz (Schritt 1 im Trichter),
   Hochzeit · Urlaub (oben im Foto-Dialog), System (über der Adresse).

   **Sie verspricht, was der Trichter heute wirklich tut** — und das ist die unbequeme Zeile:
   Ausser beim System gibt es HEUTE gar kein Gratis-Bild (`keinGratis` in `lib/geschenke.ts`),
   also sagt sie dort nur, was es kostet. Kommt die Gratis-Stufe zurück, ist es EIN Schalter
   (`gratis: true` in der Leiter in `lib/handel.ts`) — der Satz dafür steht in allen sieben
   Sprachen schon bereit.

   **Dabei aufgefallen, gehört zu Punkt 1 und ist noch offen:** `/api/free-preview` brennt das
   Muster in JEDES Bild — auch in die BEZAHLTEN. Bei der Hochzeit zahlt sie 1,49 € für ein
   Bild und bekommt es mit unserer Adresse darüber. Die saubere Fassung liegt richtig im
   Speicher, sie geht nur nicht an den Kunden. Fehlt: ein Schalter an der Route, der beim
   bezahlten Lauf `musterAufDataUrl` überspringt.
3. **Preise** in `lib/pricing.ts`: 14,99 · 29,99 · 59. Dazu Chat auf Einmal-Monat und das
   Themen-Abo (24,50 €) raus.
4. **Texte**: Motto, Katalog-Kopf, die acht Kacheln, About, Seitentitel.
5. **30 Tage** samt Erinnerung, die mit dem Anlassdatum rechnet.

Erst wenn 1–5 stehen, geht es zusammen live.

## 7. Reihenfolge

1. **System live** — gebaut, teuerster Klick, geringster Wettbewerb.
2. **Gutschein verpacken** (§3b) — das einzige Geschenkprodukt mit gemessener Suchnachfrage,
   ein Gratis-Haken der nichts kostet, und eine Frist im Dezember. **Muss im November stehen.**
3. **Topic 2 „Ich brauche eine Idee"** — die grössere Tür, dieselbe Maschine.
4. **Inkubatoren-Liste** als letzter Abschnitt beider Berichte.
5. **Geschenke** laufen weiter — ohne Google-Kampf, über Weitergabe und Anzeigen.

---

## 8. Offen — hier ist noch nichts entschieden

1. **Die Preise der Geschenke.** 1,49 € trägt nicht einmal die Erzeugung (Stripe-Gebühr ~0,30 €
   plus ~1 € Erzeugung = ~0,19 € Rest). Zweimal wurde nach unten getestet, nie nach oben.
2. **Die E-Mail vor dem Upload.** Auf einer Seite, die über „gratis, ohne Anmeldung" gefunden
   wird, ist sie genau die Falle, die wir Canva vorwerfen. Drei Wege: Adresse nach dem Bild ·
   Adresse vorn, aber „ohne Anmeldung" nirgends versprechen · Adresse nur fürs Verschicken.
3. **Welche Empfänger-Seite zuerst.** Dafür fehlt ein Keyword-Zug nach Empfängern
   (`für die Schwester`, `para mi hija`, …) in 🇪🇸 und 🇩🇪.
4. **Ob die Inkubatoren-Liste gepflegt werden kann.** Eine veraltete Förderadresse ist
   schlimmer als keine — sie schickt ihn ins Leere, nachdem er 59 € gezahlt hat.
