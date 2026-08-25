# Konzept: Die Bewerbungszentrale

Stand 25.08.2026, abends — Ergebnis eines ganzen Konzept-Tages mit dem Owner.
**Multi-Bewerbung** ist die Funktion, **Bewerbungszentrale** ist das Produkt (Owner:
„das ist dann eine Bewerbungszentrale dann doch").

## DIE ZIELGRUPPE (Owner 25.08.2026 — die schärfste Aussage der ganzen Woche)

„Wir machen dieses Portal für die Rumänen, die sich im Ausland oder in einer
anderen Sprache bewerben wollen. Ich glaube, das ist meine einzige Chance."

DAMIT IST DAS PRODUKT ENTSCHIEDEN, nicht nur die Werbung: Jede Frage, die
sich künftig stellt, wird an diesem Satz gemessen.

Was daraus FOLGT (und schon gebaut ist):
- Preise in EURO (eine Konstante `WAEHRUNG`, Anzeige und Kasse).
- Das Muster ist ANDREI POPESCU aus Timișoara: Pflegefachkraft, deutsche
  Schule im Banat, Berufsanerkennung beantragt, umzugsbereit — genau die
  drei Fragen, die eine deutsche Klinik zuerst stellt, stehen sichtbar im
  Profil, im Anschreiben und in der Analyse.
- Die Seite läuft in sieben Sprachen aus EINER deutschen Quelle
  (`textbausteineInSprache`) — Rumänisch ist damit gleichwertig, nicht
  nachgereicht.
- Kiss und Try-on sind aus der Themen-Leiste raus: neben einer Bewerbung
  an eine Personalabteilung hat beides nichts zu suchen.

Was daraus NOCH FOLGT (offen, in dieser Reihenfolge sinnvoll):
- Die Landingpage spricht diese Zielgruppe noch nicht an. Sie müsste die
  drei Ängste dieser Bewerber beantworten: Wird mein Abschluss anerkannt?
  Reicht mein Deutsch? Wie erkläre ich die Lücke/den Wechsel?
- Sprachniveau als sichtbares Feld im Profil (A1–C2), weil es im Ausland
  das erste Ausschlusskriterium ist.
- Anzeigen-Test zuerst auf RUMÄNISCH ausspielen (Facebook/TikTok RO), Ziel
  Deutschland-Jobs — nicht auf Deutsch an Deutsche.

---

## Das Produkt in einem Satz

Der Bewerber lädt seinen Lebenslauf einmal hoch — danach erzeugt ihm seine
Bewerbungszentrale zu jeder Stellenanzeige eine massgeschneiderte Bewerbung
(Dossier mit Video/Bild, Anschreiben, Lebenslauf-PDF) unter eigener Adresse,
und er sieht, was damit passiert: geöffnet, angefragt, eingeladen.

## Wer kauft

**Der Bewerber. Nur der Bewerber.** Alle Kassen sind für ihn gebaut (Erstkauf,
Abo, Video je Stück). Firmen sind das Publikum, nicht der Kunde — eine Seite,
die an zwei Zielgruppen verkauft, verkauft an keine. Das Firmen-Produkt kommt
später als eigene Seite (siehe ganz unten).

---

## Das Datenmodell

**Jede Bewerbung ist eine VOLLWERTIGE KOPIE des Profils, kein Verweis.**
Eine Datei je Bewerbung (`lebenslauf/<id>.json`), die Version zeigt mit
`basisId` auf ihr Hauptprofil.

| Je Bewerbung eigen | Immer vom Hauptprofil geerbt |
|---|---|
| eigene URL (teilbar) | Besitz (wer bearbeiten darf) |
| alle Texte: Positionierung, Profiltext, Anschreiben | Abo + 30-Tage-Frist |
| eigenes Bild (Upload gratis) | Probe-Zähler (eine gratis) |
| eigenes Video (Zusatzkauf, Stufe 3) | Kontakt-Freigabe-Schalter |
| eigene PDFs (Stufe 2) | |

Die Trennung ist Absicht: **Inhalt und Anlagen je Version frei — Geld und
Recht zentral am Hauptprofil.** So braucht nie eine Version ein eigenes Abo,
und eine gelöschte Version nimmt keine Rechte mit.

**Grundsatz gegen veraltete Zähler:** Der Index am Hauptprofil
(`bewerbungen[]`) weiss nur, WELCHE Bewerbungen existieren. Status, Views und
Anfragen liest die Zentrale LIVE aus den Bewerbungs-Dateien — der Server
aggregiert in EINEM Galerie-GET. Nie Zähler in den Index doppeln
(Merge-Falle des Hauses).

---

## Die Seiten

### 1. Die Zentrale — `/lebenslauf/meine` (der Einstieg)

Nur für den Besitzer; Firmen sehen sie nie. Landung nach dem Kauf, erreichbar
übers Konto-Zeichen; jede eigene Dossier-Seite trägt oben den Rücksprung
„Meine Bewerbungen".

- **Basis-Bewerbung als erste Karte** — nie löschbar, sie ist die Quelle.
- **Versions-Karten**: Bild · gekürzter Titel · „Version · Datum" ·
  Status-Chip · Views · Anfragen (aufklappbar).
- **Plus = neue Bewerbung**: startet den Chat („Füg die Anzeige ein …").
  Neue Bewerbungen entstehen NUR hier (Owner-Entscheidung per Auswahlfrage) —
  der Chat auf dem Dossier kann nur noch ändern.
- **Duplizieren und Löschen** an der Karte (Löschen: zwei Tipps, rot —
  nie window.confirm).
- **Abo** wohnt hier (Wortlaut: „Deine Bewerbungen bleiben online"), als
  stille Info mit goldenem Knopf — nicht als Box unter einem Dossier.
- **Kontakt-Freigabe** wohnt hier (Häkchen-Zweiwahl, siehe unten).

### 2. Die Dossier-Seite — `/lebenslauf/<id>` (das eine Dokument)

Schlank: die Karte (nur Inhalt, nichts Funktionales!), der Bearbeiten-Chat
für genau diese Bewerbung, die Leiste unten **Bearbeiten · Vorschau**
(sticky, Vorschau rechts). Vorschau = exakt die Firmen-Sicht.

- **Die Karte ist das Dokument.** Elfenbein-Blatt mit Haarlinien
  (Executive-Vorlage) — was der Bewerber verschickt, ist genau das.
- Bearbeiten-Sicht: Karte + Bearbeiten-Chat. KEINE Firmen-Fläche
  (Owner: „beim Bearbeiten kommt Interesse an Geza raus").
- Kontaktdaten stehen NIRGENDS öffentlich auf der Seite — nur im
  Bearbeiten-Modus sieht der Besitzer seine Daten (zur Kontrolle).

### 3. Die Firmen-Sicht (geteilter Link)

Dossier-Karte + darunter auf dem Dunklen der Firmen-Dialog. Kein Haus-Menü
unten (auch nicht im Admin-Spiegel `/admin/lebenslauf/*`).

---

## Die Chats — die einzige Bediensprache

**DER BEWERBERBERATER (Owner 25.08. nacht: „der bekommt also einen
Bewerberberater"):** Das ist die eine Figur hinter allen Bewerber-Chats —
im Trichter (Schnell-Analyse als Gespräch), auf dem Spielplatz (einpflegen,
spielen, empfehlen) und am Dossier (ändern, bewerben). Der Berater liest
Anzeige und Lebenslauf, sagt ehrlich was fehlt, empfiehlt IMMER das Video,
pflegt gratis nur ein was da ist — und VERBESSERT gegen Geld. Eine Stimme,
ein Ton, überall.

Grundsatz (Owner): „Am einfachsten ist es immer in Form von Chat …
statt tausend Funktionen auf der Seite aufzulisten." Rückfragen kommen mit
Klick-Antworten (Leute wollen klicken statt tippen).

### Der Firmen-Dialog (auf jeder Dossier-Seite, öffentlich)

EIN Feld, geführtes Gespräch, keine Knopf-Wand, keine Trennlinie:

1. Chat fragt: **„Interesse an {Vorname}?" — Ja (Gold) / Nein**
2. Ja → „Wer bist du — dein Name und deine Firma?" → „Deine E-Mail?" →
   optionale Nachricht („Direkt absenden") → Anfrage geht raus.
3. Nein → freundlicher Ausstieg, Feld bleibt offen.
4. **Getippte Fragen werden WEITERGELEITET, nicht von KI beantwortet**
   (Owner: „man sieht doch alles in der Bewerbung") — der Chat sammelt dafür
   Name/Firma + E-Mail ein, die Frage ist die Nachricht. Die frühere
   öffentliche KI-Antwort-Route ist ersatzlos gelöscht.
5. Kontaktdaten nennt der Chat NUR, wenn der Bewerber sie freigegeben hat.

### Der Bewerber-Assistent (Zentrale: erzeugen · Dossier: ändern)

- Anzeige einfügen (Link oder Text) → **Match in Prozent** mit „Das passt /
  Das fehlt" → Rückfrage „Willst du dich darauf bewerben? Mit Bild / Mit
  Video" → Mappe entsteht (Zuschnitt + Anschreiben in einem KI-Lauf).
- Kurze freie Eingaben = Änderungs-Anweisungen („erwähne Firma X nicht",
  „schreib das Anschreiben selbstbewusster") → Korrektur-Route.
- **Zuschneiden heisst auswählen und betonen, NIE erfinden.** Stationen,
  Zeiträume, Firmen, Ausbildung, Sprachen, Zahlen sind unantastbar.
  Anschreiben in der SPRACHE DER ANZEIGE.

---

## Status, Views, Anfragen (das Cockpit)

Owner: „Ich verliere als Bewerber den Überblick, an wen ich was geschickt
habe. Absage bekommen. Keine Antwort. Einladung. Views." Und: „Anfragen
müssen bei jedem da stehen."

| Status | Wer setzt ihn |
|---|---|
| Entwurf | automatisch beim Erstellen |
| Verschickt (mit Datum) | NUR VON HAND (Owner hat Automatik beim Teilen abgelehnt) |
| Keine Antwort | ABGELEITET: verschickt + 14 Tage ohne Ausgang |
| Einladung | von Hand (die Mail landet beim Bewerber, nicht bei uns) |
| Absage | von Hand |

- **Views**: automatisch, ehrlich — gezählt wird nur, wer NICHT der Besitzer
  ist (Beacon feuert erst, wenn die Besitz-Prüfung negativ ausfällt).
  **GEBAUT 25.08. spät** (/api/lebenslauf-view, `viewCount` am Profil);
  Besitzer sieht im Bearbeiten-Modus: „N Personen haben sich deine
  Bewerbung angeschaut." (Owner-Korrektur: Recruiter → Leute → PERSONEN)"
- **PLAY-KNOPF-TEASER auf der Bild-Bewerbung (Owner, GEBAUT 25.08. spät):**
  „Das wäre doch toll, wenn auf dem Bild ein Play-Button steht und die
  Meldung kommt: Noch kein Video — aber der Bewerber sieht: 3 Leute wollten
  dein Video sehen." Firma tippt Play → Zeile „Noch kein Video." +
  `videoKlicks`-Zähler (nur bestätigte Fremde). Besitzer sieht den
  KAUF-TRIGGER (Owner-Wortlaut): „N Personen wollten dein Video sehen.
  Video ist gefragt — erstelle jetzt dein Video." Der CTA daran wurde in
  drei Owner-Zügen festgelegt (25.08.): erst Knopf → „nein, nicht als
  Button, als Text link" → „link führt doch zur erstellung … Es führt zum
  Tunel." ENDSTAND GEBAUT: Der SATZSCHLUSS „erstelle jetzt dein Video."
  ist der unterstrichene Link und führt in den Tunnel:
  `/themes/lebenslauf/start?video=<kennung>` steigt direkt beim Video-Teil
  ein (Skript vorbefüllt aus der Bewerbung → eigene Aufnahme → fertigstellen
  hängt das Video an GENAU DIESE Bewerbung und führt aufs Dossier zurück;
  Foto bleibt unangetastet). Besitz prüft der Server; Fremde mit dem Link
  landen am normalen Tunnel-Anfang. Der `?video`-Parameter reist in
  TunnelSeite mit (HERKUNFT-Liste), sonst verlöre ihn der Adress-Sync.
  Im Aufnahme-Schritt: UPLOAD LINKS, VORLAGE RECHTS (Owner: „wie bei
  unserem tunel (Promise)") — Kachel → Pfeil → Vorlagen-Kachel mit dem
  Beispielvideo. Zugabe-Zeile dazu wieder in der Landingpage-Beschreibung
  (Owner: „in der Beschreibung auch").
- **INTERESSE-ZÄHLER (Owner 25.08., GEBAUT):** „wenn jemand anfängt zu
  tippen … 1 Person hat Interesse gezeigt." Erster Griff zum Firmen-Chat
  (Ja-Chip ODER erstes Tippen) feuert einmal je Aufruf den Beacon
  (art:"interesse", nur bestätigte Fremde). Besitzer-Zeile: „N Person(en)
  hat/haben Interesse gezeigt."
- **Anfragen (Owner 25.08., GEBAUT):** „wenn es jemand ausführt mit E-Mail:
  1 Person will dich kontaktieren — E-Mail anzeigen. Auch löschen dann."
  Jede ABGESCHLOSSENE Chat-Anfrage ({Name, E-Mail, Nachricht, Datum}) wird
  AN DER BEWERBUNG abgelegt (/api/lebenslauf-anfrage, Deckel 50); die Mail
  an den Betreiber geht ZUSÄTZLICH raus (Benachrichtigung +
  Vermittlungs-Einblick). Besitzer sieht Zeile + Reihen „Name — E-Mail",
  Löschen nach Hausregel (zwei Tipps, rot). Die Anfragen kommen NIE mit dem
  Server-Render (fremde E-Mail-Adressen!), sondern erst nach bestätigter
  Besitzerschaft über den darf-geprüften GET.

---

## Kontakt-Freigabe

Liegt beim BEWERBER (gedreht am 25.08. — vorher Admin-only): Zweiwahl mit
Häkchen **„Öffentlich sichtbar" / „Nur per Anfrage"** — Haus-Chip-Muster in
Tinte, gewählte Zeile trägt vollen Rand + Häkchen, die andere gar kein
Symbol (kein Grün, keine zwei ähnlichen Kreise). Erst die Freigabe lässt den
Firmen-Chat die Daten auf Nachfrage nennen. Der Admin kann weiterhin
schalten (Vermittlungsfälle).

---

## WARUM DAS VIDEO DER KERN IST (Owner 25.08. nacht)

Owner, nachdem klar war, dass gegen Abfotografieren keine Technik hilft:
„Das Video kann er nicht abfotografieren, wenn er eins erstellt." — und
nachgeschoben: „und eingebaut schon mal gar nicht."

DAMIT IST DIE VERTEIDIGUNGSLINIE BENANNT, und sie ist stärker als jeder
Kopierschutz:
- Text kann man abtippen, ein Layout nachbauen, ein PDF nachstellen.
- Das ERZEUGTE Video kann man nur besitzen, wenn man es erzeugen lässt — und
  das läuft auf unserem Server, hinter der Kasse. Abfilmen setzt voraus, es
  vorher zu haben.
- Und selbst wer es hätte: EINGEBAUT bekommt er es nirgends. Die Mappe mit
  eigener Adresse, Play-Knopf, Zählern und Firmen-Chat ist die Umgebung, die
  das Video erst zur Bewerbung macht. Ein abgefilmtes Video in WhatsApp ist
  kein Bewerbungsportal.

FOLGEN FÜRS PRODUKT:
- In der WERBUNG steht das Video vorn, nicht die Analyse. Die Analyse holt
  ihn herein (gratis, beweist Kompetenz); gezahlt wird für das Video.
- Die 29er-Stufe ist damit die eigentliche Stufe, 19 der Einstieg.
- Gegen Nachahmer: Einen Lebenslauf-Generator baut jeder in zwei Wochen nach.
  Die Kette Anzeige → Analyse → Skript → eigene Aufnahme → Profi-Video, in
  sieben Sprachen und in einer teilbaren Mappe, baut so schnell niemand nach.

---

## DIE GRATIS-LINIE (Owner 25.08. nacht — der Endstand)

„Er kann alles anlegen gratis, nur er kann das nicht sharen und PDF nicht
herunterladen. Er kann auch Video hochladen, aber kann keins generieren. Es
wird sein Originalvideo gezeigt."

DAMIT IST DIE GRENZE ENDLICH SAUBER: Nicht das BAUEN kostet, sondern das
BENUTZEN.

| GRATIS | KOSTET |
|---|---|
| Bewerbung anlegen: Lebenslauf, Texte, Foto | **Teilen** — der Link an die Firma |
| Anzeige einfügen, Analyse, Prozentzahl | **PDF herunterladen** (Lebenslauf + Anschreiben) |
| Eigenes Video HOCHLADEN — es wird als sein Originalvideo gezeigt | **Video ERZEUGEN** (aus seiner Aufnahme das Profi-Video) |

WARUM DAS TRÄGT — drei Gründe, die zusammen greifen:
- Der Kunde sieht sein fertiges Ergebnis, bevor er zahlt. Kein Vertrauen
  nötig, keine Katze im Sack; die Kaufentscheidung fällt vor etwas Konkretem.
- Bezahlt wird genau im Moment des Bedarfs: Er will die Bewerbung ABSCHICKEN.
  Das ist der Punkt mit der höchsten Zahlungsbereitschaft des ganzen Weges.
- Es kostet uns fast nichts: Anlegen und Analyse sind zwei Mini-KI-Aufrufe,
  ein hochgeladenes Video ist Speicher. Teuer ist nur die HeyGen-Erzeugung —
  und genau die liegt hinter der Kasse.

DIE ZWEI STUFEN PASSEN DARAUF:
- **19** — Teilen und PDF frei; gezeigt wird SEIN hochgeladenes Video.
- **29** — dazu das ERZEUGTE Profi-Video aus seiner Aufnahme.
- Wer erst 19 zahlt und später das Profi-Video will, zahlt die Differenz.

NOCH NICHT GEBAUT — was daraus folgt:
- `PdfKnopf` und `TeilenKnopf` brauchen ein Schloss (bezahlt? sonst Kasse).
- Der Video-Schritt trennt HOCHLADEN (gratis) von ERZEUGEN (Kasse).
- Zweite Preiskonstante in lib/pricing.ts.

---

## Preise (Endstand nach mehreren Drehungen)

GEDREHT AM 25.08. NACHT (Owner, beim Lesen der Preis-Zeile: „das stimmt hier
nicht ganz. Der kann nicht unendlich Bewerbungen machen. Er zahlt bei jeder
Generierung Geld. Jedes Mal kostet es 19 Euro"):
**JEDE ERZEUGUNG KOSTET 19** — nicht nur die erste. Das Abo hält die Seiten
online, es kauft KEINE weiteren Bewerbungen frei.

| | |
|---|---|
| **JEDE Bewerbung: Auswertung + Video + Seite** | **19** (LEBENSLAUF_CENTS) — jedes Mal, nicht einmalig. Das Video ist auf **1 Minute** begrenzt (Owner 25.08.: Hier ist ein Video von max 1 Minute drin) — die Grenze gehoert an die PREISZEILE, nicht ins Kleingedruckte: sie bestimmt die HeyGen-Kosten je Verkauf und ist der Punkt, ueber den man sonst nachtraeglich streitet |
| Match prüfen | gratis (Schnell-Analyse, auch ohne Konto) |
| Abo | 4,99/Monat (LEBENSLAUF_MONAT_CENTS) — haelt die DATEN und Seiten online, monatlich kuendbar. KEINE unbegrenzten Zuschnitte, KEINE unbegrenzten Updates mehr |
| **Abgebucht wird ab dem ERSTEN Kauf beides** | Owner 25.08. nacht: vom Anfang an wird Abo + Generierung abgebucht — der Kaufweg zieht 19 einmalig UND startet gleichzeitig das 4,99-Abo. Technisch: EINE Stripe-Sitzung im Abo-Modus mit zusaetzlicher Einmal-Position statt der heutigen reinen Einmalzahlung. NOCH NICHT GEBAUT — die Landingpage sagt es bereits, die Kasse nicht |
| Bild-Wechsel je Version | Foto-Upload gratis; KI-Berufslook nur im Video-Paket |

ÜBERHOLT und deshalb hier nur noch als Geschichte: „erste Version gratis als
Probe", „weitere Versionen im Abo enthalten", „Videobewerbung extra übers
Guthaben". Was davon im Code steht (Probe-Zähler `bewerbungenErzeugt`,
`aboNoetig`-Text in ProfilBewerbungen), muss beim nächsten Bau-Schritt auf
das neue Modell gezogen werden — die Landingpage sagt es bereits richtig.

Preise NUR aus lib/pricing.ts, nie als Zahl im Text.

---

## Der Landingpage-Text (abgenommen 25.08.)

**DER KOPF IST SEIT 25.08. ABEND DER DIREKTE EINSTIEG (Owner, diktiert &
GEBAUT):** „Das sollte der User direkt einsteigen." Aufbau:

1. Kicker: **„Für deine Bewerbung"**
2. Titel: **„Für jede Stelle die perfekte Bewerbung."**
3. Direkt drunter das EINGABEFELD. Feld-Text KURZ (Owner-Korrektur:
   „Stellenanzeige oder Link einfügen soll es heissen") — der lange
   Verkaufs-Satz ist damit aus dem Kopf raus (er lebt als Meta-Description
   weiter). Links kann die Auswertung ohnehin lesen (anzeigenTextBeschaffen).
4. Drunter GOLD-KNOPF **„Gratis weitermachen"** — reicht die eingefügte
   Anzeige per sessionStorage an den Tunnel; dort ist der Anzeige-Schritt
   damit erledigt und es geht direkt bei „Deine Daten" weiter (Owner
   bestätigt: „Anzeige → Deine Daten → Prozent + Karte, wie im Tunnel —
   Ja"). Ohne eingefügten Text geht es trotzdem weiter (Tunnel fragt
   selbst).
5. Die GROSSE KARTE IST RAUS — und gemeint war (Owner mit Screenshot:
   „grosse kard raus") die VIDEO-Karte „Für deine Bewerbung" mit dem
   Gründer-Video direkt unter dem Knopf. Was bleibt, ist WEITER UNTEN das
   kleine Muster-Profil (LebenslaufBeispiel) — künftig der Eingang zum
   Spielplatz (siehe eigener Abschnitt).
6. Der Themen-Vorspann (Anlässe · „Ein PDF wird überflogen …" · „Deine
   Seite bleibt privat …") FLIEGT RAUS (Owner: „das fliegt raus").

Features verkaufen (Owner: „Das sind Features, die keiner hat. Nur damit
können wir gegen die Konkurrenz gewinnen."). Preis als {price} aus der
Tabelle. Knopf oben im Sichtfeld und unten am Schluss.

> *Für deine Bewerbung*
> # Für jede Stelle die perfekte Bewerbung.
>
> `[ Stellenanzeige oder Link einfügen          ]`
>
> **[ Gratis weitermachen ]**
>
> ## Deine Bewerbungszentrale
>
> **Dein Bewerbungsvideo — ohne Vorbereitung.**
> Kein Text, kein Auswendiglernen. Das Skript schreiben wir dir aus deinem
> Lebenslauf — du nimmst dich einmal kurz auf, den Rest macht die KI: Aus
> deiner Aufnahme wird dein professionelles Sprechvideo. So echt, dass es
> niemand merkt.
>
> **Passt die Stelle zu dir?**
> Anzeige einfügen — Link oder Text reicht. Du bekommst eine ehrliche
> Prozentzahl und siehst schwarz auf weiss, was passt und was fehlt. Bevor
> du auch nur eine Minute investierst.
>
> **Deine Bewerbung passt sich an.**
> Ein Klick, und Profiltext, Schwerpunkte und Positionierung werden auf die
> Anzeige zugeschnitten. Nichts wird erfunden — alles kommt aus deinem
> echten Lebenslauf, nur richtig betont.
>
> **Die komplette Mappe, je Stelle.**
> Anschreiben in der Sprache der Anzeige. Dein Dossier mit Video oder Bild.
> Lebenslauf als PDF. Jede Bewerbung unter eigener Adresse — fertig zum
> Verschicken.
>
> Und danach siehst du, was passiert: **geöffnet, angefragt, eingeladen** —
> jede Bewerbung meldet sich bei dir.
>
> > **Das hat kein Jobportal.** Dort zeigt dein Profil jeder Firma dasselbe.
> > Hier bekommt jede Firma eine Bewerbung, die auf ihre Anzeige
> > zugeschnitten ist — mit Anschreiben, Video und PDF.
>
> **[ Jetzt starten — {price} ]**

Merkregeln: „Voll automatisch" nie ohne den Zusatz „du liest es nur ein"
(die eigene Stimme ist der eine Handgriff). Block-Reihenfolge =
Nutzer-Reihenfolge (erst das Sofort-Erlebnis Video, dann die Maschine je
Stelle). Der Tunnel zeigt später dieselben Inhalte unter dem E-Mail-Feld.

---

## Der Spielplatz — `/lebenslauf/executive` (GEBAUT 25.08. nacht)

Owner: „Hier darf der User ruhig sehen, was er bekommt, also er kann
spielen. Wird aber nichts geändert in der Database … Da er nichts bezahlt
hat." Die Musterseite wird die Probefahrt: sehen → sich selbst einsetzen →
das Video vermissen → Gold-Knopf.

1. **Start = das Muster in voller Schönheit.** Executive-Karte mit
   DEMO-VIDEO, dazu PFLICHT (Owner): eine BEISPIEL-MATCH-Box wie bei einer
   echten Version („Senior UX Designer (m/w/d) · Die Musterfirma GmbH ·
   72 %") samt Beispiel-Anschreiben — und die Besitzer-Zeilen mit
   BEISPIEL-ZAHLEN („3 Personen haben sich deine Bewerbung angeschaut ·
   1 Person wollte dein Video sehen · 1 Person will dich kontaktieren").
2. **Sein Foto rein — mit Play-Knopf.** Er setzt sein eigenes Bild ein
   (mit Zuschnitt): SEIN Gesicht in der Karte, Play-Knopf darauf → Tipp
   zeigt „Noch kein Video." Das Foto geht NIE zum Server (nur
   Browser-Objekt; Seite zu = weg). VIDEO ERSTELLEN GIBT ES IM SPIEL NICHT
   (Owner: „Video darf er gratis nicht erstellen") — das ist der Kauf.
3. **Seine Daten EINPFLEGEN, NICHT VERBESSERN (Owner-Präzisierung 25.08.
   nacht: „Wir ändern seine Daten nicht, wir pflegen ein, was da ist"):**
   Er setzt seine eigenen Daten ein (Lebenslauf-Text einfügen), die KI
   überträgt sie 1:1 in die Executive-Form — KEINE Optimierung, keine
   Umformulierung gratis. ECHTE KI, 5 ZÜGE (Owner: „Spielen kann er 5 mal
   von mir aus"), serverseitig je Gerät gezählt; Foto einsetzen zählt
   nicht als Zug. Ergebnis nur im Browser-Zustand.
   DRUNTER dann: Prozentzahl + Schnell-Analyse, und DARUNTER der CHAT mit
   dem Angebot (Owner-Wortlaut): „Willst du deine Daten verbessern? Du
   kannst mehr erreichen …" → der Gold-Knopf. VERBESSERN IST IMMER
   KOSTENPFLICHTIG — die Karte zeigt gratis nur, was da ist; die Analyse
   benennt die Schwächen; der Kauf behebt sie.
4. **EIN Ausgang, immer sichtbar:** unten (wo beim Besitzer
   Bearbeiten|Vorschau liegt) der eine Gold-Knopf „Das mit deinem
   Lebenslauf — Gratis weitermachen" → Tunnel.
5. **Eingänge:** kleine Muster-Karte der Landingpage + Beispiel-Link unter
   dem Tunnel-Formular.
6. **Eiserne Regel:** kein Datenbank-Schreiben fürs Profil, keine
   Zähler-Beacons, keine Mails (Firmen-Chat bis zur Danke-Zeile spielbar,
   versendet nichts). Dauerhaft wird alles erst mit dem Kauf.
7. **ABER: der Admin sieht die Züge** (Owner: „muss ich als Admin sehen,
   wer alles was probiert hat"). Der 5er-Deckel und die Admin-Ablage sind
   DERSELBE Speicher: je Gerät die Züge mit Zeit/Sprache/Wortlaut;
   PIN-geschützte Admin-Liste, neueste zuerst. Datenschutz-Linie: Wünsche
   im Wortlaut, von eingefügten Lebensläufen NUR DIE ERSTEN ZEILEN, Fotos
   nie (bleiben im Browser). Nebeneffekt: Marktforschung.

GEBAUT (25.08. nacht, auf „bau" — mit Owner-Korrekturen im Minutentakt):
- SpielplatzClient auf der Beispiel-Seite; Motor /api/lebenslauf-spiel:
  einpflegen + match sind die zwei Zug-Arten (je 1 KI-Aufruf, gpt-5-mini),
  Deckel 5 je Gerät SERVERSEITIG, E-Mail-Pflicht IM SERVER (Tor, Leads).
- Der Bewerberberater sammelt: E-Mail (kiss-log-Lead + lb_kiss_mail-
  Vorbelegung für den Kaufweg) → Lebenslauf als TEXT einfügen (kein
  Datei-Upload im Spiel) → Foto (ImageCropper, NUR Browser-DataURL, nie
  zum Server) → Anzeige → Match.
- DIE MAPPE BEGINNT OBEN MIT DEM ANSCHREIBEN (Owner: „Es müsste oben
  anfangen … dann drunter das Resume"): im Muster das Beispiel-Anschreiben
  mit Beispiel-Match-Zeile, nach dem echten Match die KOSTPROBE
  (anschreibenKurz aus dem Match-Zug; das VOLLE Anschreiben ist der Kauf).
- Schnell-Analyse unter der Karte: Prozent + Balken · Das passt (Häkchen) ·
  Das fehlt · AM LEBENSLAUF SELBST (befunde) · Video-Empfehlung ·
  Teaser-Zeile — dieselben Sätze spricht der Berater im Chat.
- WEISSE HÜLLEN (Owner, mit Bildern: „das brauche ich auch in einer
  weissen Hülle" · „alles bitte"): Landing-Feld UND der ganze
  Berater-Kasten in der Creme-Karte, Innenteile in der Karten-Fassung.
- BEARBEITEN|VORSCHAU AUCH IM SPIEL (Owner: „das kommt doch in der
  Vorschau und es fehlt bearbeiten"): NUR die Moduswahl-Pille steht fest
  unten; der Gold-Knopf „Gratis weitermachen" SCROLLT MIT (Owner) und
  sitzt am Ende des Berater-Bereichs — damit nur im Bearbeiten-Modus
  (Owner: „das kommt nur in Bearbeiten modus"). Vorschau = exakt die
  Firmen-Sicht (Interesse-Chat spielbar, aber STILL: kein Versand, keine
  Ablage). Fusszeilen-Links bekommen Luft unter der Pille (Owner: „footer
  links sehe ich nicht").
- DER EINSTIEG LIEFERT DEN GRUND (Owner-Korrektur nach dem ersten Blick:
  „da hat er noch keinen Grund weiterzumachen … ‚Erst mal schauen' führt zu
  nix … der stehende Gold-Knopf ist redundant"): Das Intro nennt das
  Versprechen (Prozent-Match + Bewerbung wie oben) und stellt DREI WEGE als
  Chips — „Passt eine Anzeige zu mir?" (Gold-Chip) · „So ein Profil möchte
  ich auch" (Profil-Weg ohne Anzeigen-Zwang, verkauft nach dem Einpflegen) ·
  „Ich habe eine andere Frage" (weitergeleitet per Concierge-Mail, Antwort
  noch heute, mit Zurück-Ausweg). Der Gold-Knopf „Gratis weitermachen"
  erscheint NUR NOCH IM GESPRÄCH, nachdem der Berater verkauft hat.
- Tür A GEBAUT: Landing-Feld → Spielplatz (nicht mehr Schritt-Tunnel);
  die Anzeige reist im Tunnel-sessionStorage-Schlüssel; der Gold-Ausgang
  führt in den Kaufweg /themes/lebenslauf/start (E-Mail dort vorbelegt).
- Admin-Liste /admin/lebenslauf-spiele (PIN): je Gerät E-Mail · Sprache ·
  Züge im Wortlaut (vom Lebenslauf nur die ersten 200 Zeichen), neueste
  zuerst — zugleich der 5er-Deckel.
- LIGHT-MODUS (Owner: „light modus einfügen"): der Haus-LightSwitch steht
  jetzt auch im TalentKopf (alle Dossier-/Spielplatz-Seiten); Kopf-Flächen
  auf flippbare black-Utilities umgestellt.

---

## Später: das Firmen-Produkt (NICHT jetzt bauen)

Owner: „Firmen können später einen Link oder Text in eine Box einfügen und
die Seite spuckt dann **Bewerbungen** raus, nicht Bewerber. Jede Bewerbung
hat einen anderen Match."

- Dieselbe Match-Maschine, umgedreht: Anzeige rein → passende BEWERBUNGEN
  raus. Pool = alle Bewerbungs-Dateien; ein Bewerber mit 5 Versionen hat
  5 verschieden starke Treffer-Chancen.
- Trefferliste zeigt je Person nur die BESTE Bewerbung (sonst flutet einer
  die Liste), weitere dahinter abrufbar.
- Je Bewerbung ein SICHTBARKEITS-Schalter „in Firmen-Suche auffindbar"
  (Häkchen-Mechanik wie die Kontakt-Freigabe) — gezielt verschickte
  Bewerbungen gehören evtl. nicht in die Suche der Konkurrenz.
- Monetarisierung über das BESTEHENDE Vermittlungsmodell: Treffer ansehen
  gratis, Kandidat anfragen kostet; die Anfrage landet im Anfragen-Speicher
  des Bewerbers, Kontakt nur nach Freigabe. **Die Kontakt-Freigabe ist auf
  der Firmen-Seite die Kasse.**
- Braucht dann zusätzlich: durchsuchbaren Kandidaten-Pool (heute einzelne
  Dateien), Kosten-Bremse je Firmen-Suche (jede Suche = viele Match-Läufe),
  Firmen-Einstiegsseite mit eigener Kasse.

---

## Der Trichter: ASSESSMENT-EINSTIEG (Owner-Vorgabe 25.08., GEBAUT)

„Die Seite/Tunnel muss so anfangen: Passt diese Jobanzeige zu mir? Feld für
Jobanzeige. Dann … Bewerbung hochladen/Text eingeben. Bild. Dann wird
generiert. 67 %. Jetzt Bewerbung anpassen und Chancen erhöhen. Was du
bekommst: eine Bewerbungszentrale…"

Reihenfolge (E-Mail bleibt PFLICHT vor dem Upload — Haus-Eingangstor):
1. **Anzeige** („Passt diese Jobanzeige zu dir?", Link/Text, kostenlos;
   kleiner Ausweg „Ohne Anzeige starten" → alter Direktkauf-Weg)
2. **E-Mail-Tor** (TunnelStart wie bisher, Google inklusive)
3. **Lebenslauf + Bild + Verfügbarkeit**
4. **GRATIS-Generierung vor der Kasse**: Auswertung mit `vorab: true`
   (Entwurf bleibt UNBEZAHLT) + Anzeigen-Match als Gast (Besitz über die
   Geräte-Kennung des Kiss-Log-Auftrags) → Prozent-Balken + Das passt/fehlt
4b. **DIE GRATIS-ANALYSE IST EIN TEASER — UND SAGT ES SELBST (Owner
   25.08. nacht):** „Wir können keine kostenlose Bewerbungsanalyse machen.
   Das macht niemand gratis. Nur ChatGPT. Wir können es aber sagen: es ist
   nicht vollständig, auch nicht optimal." Drei Pflicht-Elemente im
   Gratis-Ergebnis:
   - Es heisst SCHNELL-ANALYSE und trägt die ehrliche Zeile „nicht
     vollständig, nicht optimiert".
   - Die VIDEO-EMPFEHLUNG steht IMMER in der Analyse (Owner: „bei der
     Analyse auch Video immer empfehlen").
   - Der Übergangs-Satz zum Kauf (Owner-Wortlaut): „Erstelle jetzt eine
     richtige Bewerbung mit richtiger Analyse und Optimierung. Video…"
   - Die Schnell-Analyse bezieht sich auf ALLES — auch den PDF-TEXT DES
     LEBENSLAUFS selbst (Owner): neben Match/passt/fehlt auch 2–3 Befunde
     „Am Lebenslauf selbst" (Schwächen, die die richtige Analyse dann
     behebt). Kein zusätzlicher KI-Aufruf — dieselbe Vorab-Auswertung
     liefert die Punkte mit.
   - **ALLES IM CHAT (Owner: „das muss alles im Chat stattfinden"):** Die
     Schnell-Analyse wird als CHAT-GESPRÄCH ausgespielt, nicht als
     statischer Ergebnis-Bildschirm — Blase für Blase: Prozent+Balken →
     Das passt → Das fehlt → Am Lebenslauf selbst → Video-Empfehlung →
     ehrliche Teaser-Zeile → Übergangs-Satz; der Gold-Kauf-Knopf ist der
     Abschluss der Chat-Spur (die einzige Funktion, alles andere sind
     Antworten). Dieselbe Bediensprache wie Dossier-Werkzeuge und
     Firmen-Dialog.
   (Wortlaut-Feinschliff siehe Abnahme; noch NICHT gebaut.)
5. **Kauf-CTA im Spannungsmoment**: „Bewerbung anpassen & Chancen erhöhen —
   {price}" → bestehende Kasse; das Skript aus der Vorab-Auswertung wird
   WEITERVERWENDET (keine zweite KI-Auswertung nach der Zahlung)
6. Danach die bestehende Kette: Skript ändern → einsprechen → Seite.
   Unterm Tunnel: Feature-Karte „Deine Bewerbungszentrale" + Beispiel
   (geteilter Baustein components/BewerbungszentraleFeatures.tsx, auch LP).

SICHERUNG: Der bezahlt-Stempel sitzt jetzt in /api/lebenslauf-fertigstellen
(402 ohne bezahlten Kiss-Log-Auftrag) — sonst könnte man die Kette per Hand
gratis durchrufen. KOSTEN: je Trichter-Durchlauf ~2 Mini-KI-Aufrufe VOR der
Zahlung (Auswertung + Match, ~2 ct) — bewusst, das ist der Köder; Tor ist
die Pflicht-E-Mail davor.

## Die neue Tunnel-Architektur: EIN GESPRÄCH, ZWEI TÜREN (VORSCHLAG 25.08. nacht — Owner-Entscheidung offen)

Owner: „Ich glaube, wir müssen die ganze Architektur des Tunnels ändern.
Wir haben zwei Einstiege: über den Anzeigentext oder über die Beispielkarte."

DIE IDEE: Beide Einstiege sind DASSELBE Gespräch mit dem Bewerberberater,
nur an verschiedenen Stellen betreten. Der Berater hält einen Zustand
{Anzeige? Daten? Foto? E-Mail?} und fragt nach dem, was fehlt — in
beliebiger Reihenfolge. Kein starres Schritt-Raster mehr vor der Kasse.

EINE FLÄCHE (die Bediensprache des Hauses: Karte = Dokument, drunter Chat):
- OBEN die Karte: erst das Muster („Executive"), und sobald Daten
  eingepflegt sind, ER SELBST (Foto mit Play-Knopf, Daten 1:1).
- DRUNTER (sobald eine Anzeige da ist): Prozent + Schnell-Analyse.
- DRUNTER der Bewerberberater-Chat, der alles einsammelt und am Ende
  verkauft: „Willst du deine Daten verbessern? Du kannst mehr erreichen …"

ZWEI TÜREN, EIN ZIEL:
- Tür A — ANZEIGENTEXT (Landing-Feld „Stellenanzeige oder Link einfügen",
  in der weissen Hülle): GEBAUT — führt auf den Spielplatz; das Gespräch
  beginnt bei der Anzeige, der Berater holt E-Mail und Lebenslauf →
  Analyse → Karte → Angebot.
- Tür B — BEISPIELKARTE (Muster/Spielplatz): Gespräch beginnt beim
  Sehen/Spielen; der Berater fragt danach nach der Anzeige („Sollen wir
  prüfen, wie du auf eine echte Stelle passt?") → Analyse → Angebot.
- Ab dem Angebot EIN gemeinsamer Kaufweg: bestehende Kasse → Skript →
  Aufnahme → Seite (alles Gebaute bleibt in Verwendung: Auswertung, Match,
  Karte, Kasse, Skript/Aufnahme-Schritte).

GEDREHT (Owner 25.08. spät nacht): „der User kann hier auch seine Daten
gratis hochladen und Bild würde ich sagen ohne E-Mail. In der Bewerbung
sind doch Kontaktdaten. … Lass uns das öffnen. Du kannst überall ein
Profil gratis anlegen. Wir müssen das auch machen."
DAS SPIEL IST GANZ OFFEN — Daten einpflegen, Bild, Anzeige, Match: alles
gratis und OHNE E-Mail-Tor. Das Tor wandert ans Ende: „beim Sharen würde
ich sagen. Er muss es speichern, dann muss er ein Konto anlegen." Also:
SPIELEN frei (Deckel je Gerät) → TEILEN erfordert SPEICHERN → Speichern
erfordert KONTO (Haus-Anmeldung: Google/Facebook/Passwort/Magic-Link).
Und: „Sharen kann er im Bearbeitungsmodus nicht" (Owner) — der
Teilen-Knopf existiert im Spiel nur in der VORSCHAU (dort, wo man sieht,
was die Firma sähe); der Tipp darauf löst die Kette Speichern→Konto aus.
ENTSCHIEDEN (Owner: „ok", 25.08. spät nacht):
1. SPEICHERN MIT KONTO IST GRATIS — die unoptimierte Karte (eingepflegt
   1:1, ohne Video) wird eine kostenlose, teilbare Seite (LinkedIn-Logik).
   BEZAHLT wird das VERBESSERN: vollständige Analyse, Optimierung, volles
   Anschreiben, Video — der bestehende Kaufpreis (LEBENSLAUF_CENTS) steht
   jetzt für dieses Paket; an der Preistabelle ändert sich nichts, nur die
   Grenze Gratis/Bezahlt verschiebt sich (Seite gratis, Veredelung Geld).
2. LEAD AUS DEM LEBENSLAUF: Der Berater zieht beim Einpflegen die
   Kontaktdaten aus dem eingefügten Text (E-Mail/Telefon) mit heraus und
   legt sie in die Admin-Ablage — auch Spieler, die nie speichern, sind
   für den Betreiber sichtbar.
3. Der 5ER-DECKEL JE GERÄT BLEIBT als einzige Kosten-Bremse im offenen
   Spiel. Vorschau bleibt FREI (Owner „ok" auf die Empfehlung); nur der
   Teilen-Tipp in der Vorschau löst Speichern→Konto aus.
4. EIGENE VIDEO-AUFNAHME OHNE KI IM GRATIS-TEIL (Owner-Frage „Wie wäre
   das?", per „dann baue ich zumindest ein Bewerberportal auf" bestätigt):
   Im Spiel nimmt er sich selbst auf bzw. lädt ein Video — NUR im Browser
   (wie das Foto, kostenlos, keine Moderation nötig); erst mit Konto wird
   es Teil der Gratis-Seite (dann durch die Haus-Tore: Upload-Pipeline,
   Faststart, Nacktheits-Prüfung). Kein Skript, keine Veredelung — der
   sichtbare Abstand zur bezahlten Fassung IST das Verkaufsargument
   (Vorher/Nachher), und die Aufnahme ist zugleich der Rohstoff der
   bezahlten HeyGen-Kette.

DER STRATEGISCHE RAHMEN (Owner: „dann baue ich zumindest ein
Bewerberportal auf umsonst. Was eigentlich ganz cool ist"): Das
Gratis-Portal ist nicht umsonst — es ist der UNTERBAU. Jedes gespeicherte
Gratis-Profil ist (a) ein Lead mit Konto, (b) eine Upsell-Basis
(Verbessern + Video) und (c) INVENTAR für das spätere Firmen-Produkt
(Anzeige rein → passende BEWERBUNGEN raus — ohne Pool keine Treffer).
Die Gratis-Seite baut den Pool, der Pool macht die Firmen-Seite wertvoll.

LOOKS STATT TEMPLATES (Owner 25.08. nacht: „Die Leute suchen immer tolle
Templates. … Leute sind emotional." → „ja, das meinte ich. Looks"):
EIN Bauwerk (Executive-Struktur, jede Funktion existiert genau einmal),
aber wählbare FARBWELTEN/STIMMUNGEN auf demselben Blatt (z. B. Ivory /
Modern Dark / Warm Sand / Serif Classic) — technisch Farb-/Schrift-Token
auf der lb-karte, fürs Gefühl eine Template-Auswahl. Der Berater fragt:
„Welcher Look bist du?" Keine echten Zweit-Templates (die multiplizieren
jede Funktion für immer). SPÄTER, nach dem Markt-Test — nicht jetzt.

VORSCHAU MUSS SOFORT SICHTBAR SEIN (Owner: „Wenn ich umschalte, gibt's
erst mal im Sichtbereich keinen Unterschied" → „ok" zum Vorschlag):
Nur im Vorschau-Modus steht direkt unter dem Kopf ein schmaler Streifen
„VORSCHAU — So sieht eine Firma deine Bewerbung."; beim Umschalten auf
Vorschau springt die Seite nach oben (Dokument frisch aufgeschlagen),
zurück zu Bearbeiten bleibt die Scroll-Position stehen.

NOCH NICHT GEBAUT — Umbau auf Owner-Kommando („Bau"): E-Mail-Tor aus dem
Spiel nehmen, Kontakt-Extraktion in den Einpflege-Zug, Teilen-Knopf nur
in der Vorschau mit Speichern→Konto-Kette (Haus-Anmeldung), gespeicherte
Gratis-Seite anlegen, Browser-Video-Aufnahme im Spiel.

Die ÜBERHOLTE Entscheidung vom selben Abend (nur noch Geschichte):
E-Mail-Tor vor dem ersten Spielzug („ich will Leads auf jeden Fall") —
Das E-MAIL-TOR KOMMT VOR DEM ERSTEN EIGENEN SPIELZUG — der Berater nimmt
Daten/Foto erst nach der E-Mail an (Haus-Eingangstor). Jeder Spieler ist
ein Lead. Nur das blosse ANSCHAUEN des Musters bleibt ohne alles. Damit
hat auch die Admin-Ablage der Züge künftig eine E-Mail am Eintrag.

## Das Demo-Video deckt sich selbst auf (Owner 25.08.2026)

Owner: „Am Ende soll er sagen, dass er ein KI-Avatar ist — aber du kannst
dein Video noch mehr real machen mit deinem Video und deiner Stimme, dafür
ist dieses Tool gemacht."

Das Beispiel-Video bricht am Schluss die Rolle: Der Bewerber sagt, dass er
ein KI-Avatar ist, und nennt im selben Atemzug den Unterschied zum
Gekauften — DEINE Aufnahme, DEINE Stimme. Drei Dinge auf einmal:
- **Ehrlich**: KI-Kennzeichnung dort, wo sie jeder sieht (die AGB, p4a,
  sagen es ohnehin schon — hier sagt es das Produkt selbst).
- **Verkauf**: Der Abstand zwischen Demo und eigenem Video ist genau das,
  wofür bezahlt wird — der Zuschauer hört ihn statt ihn zu lesen.
- **Einwand-Killer**: „Wirkt das nicht unseriös?" ist beantwortet, bevor
  die Frage kommt.

Gilt für JEDES Demo-Video auf der Bewerbungs-Seite; echte Bewerbungen von
Kunden tragen diesen Schluss selbstverständlich NICHT.

## Der geführte Kauf-Chat (Owner 25.08. nacht — NOCH NICHT GEBAUT)

Owner: „Ajustează aplicația. Dann öffnet sich drunter ein Chat, wo alles
abgefragt wird, was er für die Seite braucht: Texte, fehlende Unterlagen,
Bewerbung als PDF oder Text, Bild, … Videoaufnahme empfohlen. Der User muss
geführt werden. Spätestens wenn er das Video generieren will bzw. die ganze
Bewerbung, dann muss er zahlen."

WARUM DAS KEIN RÜCKFALL IST: Der Berater, der am selben Abend rausflog, stand
UNGEFRAGT auf einer Muster-Seite und redete, bevor jemand etwas wollte. Dieser
hier öffnet sich NUR nach dem Tipp auf den Gold-Knopf — also erst, wenn der
Besucher Absicht gezeigt hat. Das ist der Unterschied zwischen Lärm und Führung.

ZUERST DIE WEICHE, DANN DAS EINSAMMELN (Owner 25.08. nacht: „zuerst muss er
abgefragt werden, ob er eine Anzeige hat, wo er sich bewerben möchte — ja,
nein … Er muss erst mal nach allem abgefragt werden, um zu wissen, welchen
Tunnel man ihm zeigt"). Drei Fragen, dann steht der Weg fest:

**W1 — Hast du eine Anzeige, auf die du dich bewerben willst? (Ja / Nein)**
- JA → der ANZEIGEN-WEG: Anzeige einfügen, Analyse, zugeschnittene Bewerbung.
  Hier entsteht der Match und damit der Kaufgrund.
  PREIS GLEICH, OB ZUGESCHNITTEN ODER ALLGEMEIN (Owner: „ja, auch 19 Euro") —
  der Aufwand ist derselbe, zwei Preise für dasselbe Ergebnis müssten nur
  erklärt werden.

  ABER ZWEI STUFEN NACH VIDEO (Owner 25.08. nacht, auf die Frage, wann der
  zahlt, der „Video später" wählt: „29 Euro — noch besser"):
  **19 = Bewerbung OHNE Video · 29 = Bewerbung MIT Video.**
  Damit hat die Weiche W3 einen Preis statt nur einer Reihenfolge, und der
  Kunde entscheidet sichtbar zwischen gut und besser. Wer erst 19 zahlt und
  das Video später will, zahlt die Differenz (10) — kein neuer Kauf, nur die
  Aufstockung. NOCH NICHT IN lib/pricing.ts: Dort steht bisher nur
  LEBENSLAUF_CENTS = 1900; die zweite Stufe braucht eine eigene Konstante
  (Preise NIE als Zahl in Texte tippen).
- NEIN → der ALLGEMEINE WEG (Owner: „bei Nein klar trotzdem bauen. Dann muss
  man ihm sagen: wir bauen eine generelle Bewerbung. Die kann er später
  anpassen. Das ist seine allgemeine Bewerbung dann."). Also: keine
  Überredung, keine Sackgasse — er bekommt eine vollwertige Mappe OHNE
  Prozentzahl, und der Chat sagt ihm beim Start und am Ende, dass genau diese
  Bewerbung später auf jede Anzeige zugeschnitten werden kann. Das ist
  zugleich der natürliche Wiederkauf: die allgemeine Mappe steht, jede
  zugeschnittene Fassung kostet erneut.

**W2 — Hast du einen Lebenslauf? (PDF / nur Text / gar keinen)**
- „gar keinen" ist KEIN Sonderfall, sondern bei dieser Zielgruppe häufig: Der
  Berater fragt den Werdegang in wenigen Schritten ab und schreibt ihn selbst.

**W3 — Willst du auch ein Video? (Ja / später)**
- Entscheidet, ob die Aufnahme-Station kommt — und damit, wann bezahlt wird.

DIE STRECKE danach (jede Frage einzeln, nie ein Formular):
1. Lebenslauf — als PDF hochladen ODER Text einfügen (beides erlaubt; wer vom
   Handy kommt, hat selten eine Datei).
2. Foto — mit Zuschnitt; optional, aber empfohlen (ohne Foto keine Mappe).
3. Fehlende Unterlagen — der Berater fragt gezielt nach dem, was die ANZEIGE
   verlangt und der Analyse fehlt (Anerkennung, Sprachnachweis, Zeugnisse).
4. Texte — was soll anders klingen? (dasselbe Korrektur-Feld wie im Dossier)
5. Videoaufnahme — EMPFOHLEN, nicht Pflicht: Handykamera reicht, Skript wird
   gestellt. Hier fällt die Kauf-Entscheidung.
6. **ZAHLUNG** — spätestens vor der Erzeugung (Video oder ganze Bewerbung):
   19 je Bewerbung + 4,99/Monat, zusammen abgebucht.
7. Erzeugung → fertige Seite.

TECHNISCH KEINE ZWEITE MASCHINE: Die Strecke benutzt dieselben Routen wie der
Trichter (kiss-log, lebenslauf-auswertung, lebenslauf-match, Kasse,
lebenslauf-skript, lebenslauf-fertigstellen) und legt denselben `Entwurf` in
sessionStorage ab, den `LebenslaufStartClient` schon kennt. Der Chat ist eine
andere OBERFLÄCHE für den bestehenden Kaufweg, kein zweiter Kaufweg — sonst
gibt es zwei Stellen, an denen Geld verloren gehen kann.

OFFEN: Übernimmt der Chat die ganze Strecke bis zur fertigen Seite, oder gibt
er beim Bezahlen an den bestehenden Trichter ab? (Claude-Empfehlung: erst
abgeben — die Kasse dort ist getestet und trägt bereits Stripe-Rückkehr,
Nachliefer-Wachhund und die 402-Sicherung.)

## Stufe 0: DER MARKT-TEST — vor jedem weiteren Baustein

Owner 25.08. spät: „Ich baue hier wie blöd wieder eine Sache, die ich vielleicht
nicht verkaufen kann. Ich muss testen, ob Leute das haben wollen. Firmen oder
Bewerber. Ich will nicht ewig bauen." — Deckt sich mit der Hausregel vom 07.08.
(„ein Produkt zuerst, bis echte Käufe fehlerfrei durchlaufen").

**Das Produkt v1 ist fertig genug zum Testen JETZT** (Landingpage → Kauf →
Dossier mit Video + Assistent). Der Test braucht weder Zentrale noch PDFs.

**DIE VIDEO-REGEL (Owner 25.08., nach seinem eigenen HeyGen-Ergebnis, zweimal
bekräftigt: „Das Video von HeyGen ist verdammt echt"):** Referenz-Qualität =
sein Rezept: ein VIDEO für Gestik/Stimme + Skript mit eigener Stimme an
HeyGen → vom Original nicht zu unterscheiden. NIE ein Video aus dem BILD
erzeugen (wirkt künstlich). Die HeyGen-Qualität ist BEWIESEN (sein Video
läuft auf der Beispielseite) — kein Risiko-Punkt, sondern DAS
Verkaufsargument („So echt, dass es niemand merkt").

**CONCIERGE-BESCHLUSS für die ersten Käufer (Berater-Empfehlung, vom Owner
mit „leg los" angenommen):** Die Video-Weiche (Automatisierung des
Video-Wegs, Look-Problem für Leute ohne Anzug/Hintergrund) wird VERTAGT —
die ersten Käufer bedient der Owner von Hand: ihre Aufnahme läuft durch
seine Hände direkt in HeyGen Studio (exakt sein Rezept, beste Qualität,
null neuer Code). Der gebaute Bild-Weg bleibt als Notnagel im Automat.
Erst bewiesene Nachfrage rechtfertigt die Automatisierung — und echte
Kunden-Aufnahmen beantworten dann das Look-Problem mit Daten statt
Vermutungen. Beschlossen ausserdem: AGB-Zeile zur KI-Erstellung JA
(ein Satz, dezent); Status „Geöffnet" automatisch bei erster fremder
Öffnung JA — aber erst mit der Zentrale, nach dem Test.

1. Stand einfrieren: committen, deployen (je mit ausdrücklichem Owner-Ja).
2. Landingpage-Text drauf (der abgenommene Text oben).
3. **Beide Zielgruppen mit Anzeigen testen, nicht mit Bauen:**
   - Bewerber: Meta-Anzeigen auf die bestehende Seite. Treppe messen mit dem
     vorhandenen Funnel-Dashboard: Klick → Seite → E-MAIL (Schritt 0) → Kauf.
     E-Mail-Eintragungen messen Kaufabsicht auch ohne Kauf.
   - Firmen: NUR eine Mini-Warteliste-Seite (ein Abend): „Anzeige einfügen —
     wir zeigen dir passende Bewerbungen. Bald. Trag dich ein." Cost je
     Eintragung Bewerber vs. Firmen = die Antwort, wer es haben will.
4. **Messlatte VORHER festlegen** (Owner bestimmt Budget + Schwelle, z. B.
   „unter X € je E-Mail = weiterbauen, drüber = stoppen/Text drehen").
   Muster im Repo: KONZEPT-UND-AD-TEST.md; Zählwerk: Kampagnen-Pixel + Insights.
5. Erst NACH den Zahlen weiterbauen: Bewerber ziehen → Zentrale + PDFs.
   Firmen ziehen → Firmen-Produkt vor. Keiner zieht → für ~50 € erfahren
   statt für Wochen Bauzeit.

## Bau-Reihenfolge und Stand

Je Stufe fertig zeigen, Abnahme, dann die nächste (Hausregel).
**Stufe 0 (Markt-Test) ist das Tor vor allem Folgenden.**

1. **ZENTRALE `/lebenslauf/meine`** — das Fundament der Bedienung.
   Noch nicht gebaut; alle Fragen geklärt, wartet auf Test-Ergebnis + Los.
2. **PDFs / Anlagen-Box für ALLE** (Basis + jede Version): Anschreiben-PDF +
   Lebenslauf-PDF im Dossier-Design, als ÖFFENTLICHE Box — ladbar für
   Bewerber UND Firma; Kontaktdaten im PDF folgen der Freigabe-Regel.
3. **Video je Version**: zugeschnittenen Text einsprechen (Tonspur) → Kasse
   (Guthaben) → HeyGen-Lauf mit eigener Stimme; vorhandenes Avatar-Bild
   wiederverwenden, wenn das Berufsfeld gleich bleibt (spart ~15 ct je Lauf).
4. **Landingpage** mit dem abgenommenen Text oben.

**Bereits gebaut und lokal verifiziert (25.08., nicht committet):**
Versions-Mechanik (erzeugen per Chat inkl. Zuschnitt + Anschreiben in einem
KI-Lauf, duplizieren, löschen, Probe/Abo-Tor), Besitz-Vererbung über basisId,
Bewerber-Assistent-Chat, geführter Firmen-Dialog samt Weiterleitung getippter
Fragen, Kontakt-Freigabe-Zweiwahl (Route auch für Besitzer), Bearbeiten/
Vorschau-Leiste (sticky, Vorschau rechts), Bild-Karten in der Alt-Liste
(die in der Zentrale aufgeht), Abo als stille Info mit Gold-Knopf,
Haus-Menü von Dossier-Seiten entfernt (inkl. Admin-Spiegel). Demo-Bewerbung
am Owner-Testprofil: /lebenslauf/f539748a-3b37-40e8-9107-40e7ec01df6e.

## Entscheidungs-Log (Owner, 25.08.2026)

- Name: Multi-Bewerbung (Funktion) → Bewerbungszentrale (Produkt).
- Preismodell in mehreren Drehungen → Endstand siehe Preistabelle oben;
  „unglaublich kompliziert"-Sorge beantwortet: nur Häkchen + Zähler +
  bestehender Guthaben-Weg.
- Alles per Chat statt Funktions-Knöpfen; Firmen-Dialog „nur ein Feld".
- Keine KI-Antworten an Firmen — Fragen werden weitergeleitet.
- Karte = reines Dokument; Funktionen als eigene Flächen darunter;
  Abo/Freigabe später in die Zentrale.
- Kontaktdaten nirgends öffentlich; Freigabe beim Bewerber (Häkchen).
- Galerie/Zentrale als Einstieg; Bewerbungen mit Bild, Status, Views,
  Anfragen; neue NUR in der Zentrale; Status NUR von Hand.
- Käufer ist der Bewerber; Firmen-Produkt später (Bewerbungen, nicht
  Bewerber; beste je Person; Sichtbarkeits-Schalter).
- Video-Weg bestätigt nach eigenem Ergebnis: HeyGen bleibt — „sehr echt,
  niemand merkt es, der Skript hat sehr geholfen". ABER: Quelle ist VIDEO,
  nie Bild (siehe Video-Regel in Stufe 0). Landingpage-Block entsprechend
  ehrlich umformuliert (kein „wir ziehen dir einen Anzug an" mehr).
- Stufe 0 Markt-Test beschlossen (25.08. spät): erst Evidenz, dann
  weiterbauen; Firmen werden mit einer Warteliste-Seite getestet, nicht
  mit gebautem Produkt.
- Video-CTA (25.08. abend, drei Züge): Knopf → Textlink → „Es führt zum
  Tunel." Satzschluss ist der Link, `?video=<kennung>` steigt im Tunnel
  direkt beim Video-Teil ein (Skript → eigene Aufnahme → an DIESE
  Bewerbung). Die Concierge-MAIL als CTA ist gestrichen; der
  Concierge-Erfüllungsweg (Stufe 0) bleibt für alles, was Handarbeit
  braucht.
- Aufnahme-Schritt: Upload LINKS, Vorlage RECHTS („wie bei unserem tunel
  (Promise)") — Beispielvideo als Vorlagen-Kachel daneben.
- Cockpit erweitert (25.08. abend, GEBAUT): Interesse-Zähler (erster Griff
  zum Chat) + Anfragen mit E-Mail beim Besitzer sichtbar und löschbar.
- Landingpage-Kopf = Direkteinstieg (25.08. abend, diktiert): Feld +
  „Gratis weitermachen"; Themen-Vorspann raus. Zwei Nachkorrekturen
  (GEBAUT): Feld-Text KURZ („Stellenanzeige oder Link einfügen") und die
  VIDEO-Karte unter dem Knopf ist die „grosse kard" — RAUS; das kleine
  Muster-Profil weiter unten bleibt.
- Gratis-Analyse = Teaser (25.08. nacht, KONZEPT): sagt selbst „nicht
  vollständig, nicht optimal"; Video wird IMMER mitempfohlen; Übergang:
  „Erstelle jetzt eine richtige Bewerbung mit richtiger Analyse und
  Optimierung." (niemand analysiert gratis — nur ChatGPT). Als Gespräch im
  Chat, nicht als Bildschirm. Und die GRATIS-LINIE dazu (Owner): Daten
  werden nur EINGEPFLEGT wie sie sind — Aufbau: Karte (Daten 1:1) →
  Prozent + Analyse → Chat „Willst du deine Daten verbessern? Du kannst
  mehr erreichen …" → Gold. Verbessern ist immer kostenpflichtig.
- Spielplatz + beide Türen GEBAUT (25.08. nacht, auf „bau"): Berater-Chat,
  einpflegen/match mit 5er-Deckel und E-Mail-Tor, Anschreiben oben
  (Kostprobe), weisse Hüllen, Bearbeiten|Vorschau im Spiel (Gold nur im
  Bearbeiten, Wortlaut „Gratis weitermachen"), Tür A aufs Spielfeld,
  Admin-Liste, Light-Schalter im TalentKopf.
- Tunnel-Architektur „Ein Gespräch, zwei Türen" (25.08. nacht, KONZEPT):
  Bewerberberater als Faden, Türen Anzeigentext/Beispielkarte, ein
  gemeinsamer Kaufweg. E-Mail-Tor VOR dem ersten Spielzug — Owner: „ich
  will Leads auf jeden Fall."
- Spielplatz `/lebenslauf/executive` beschlossen (25.08. spät, KONZEPT):
  Muster mit Demo-Video + Beispiel-Match + Beispiel-Zahlen; eigenes Foto
  nur im Browser (mit Play-Knopf-Erlebnis), Daten ersetzen mit echter KI,
  5 Züge je Gerät, kein Gratis-Video, nichts gespeichert (unbezahlt) —
  ausser der Admin-Ablage der Züge (= Deckel-Zähler); Gold-Ausgang
  „Gratis weitermachen" → Tunnel. Bau auf Kommando.
- Offen: eine dezente KI-Kennzeichnungszeile in den AGB (Claude-Vorschlag,
  Owner-Antwort steht aus). Offen: Status „Geöffnet" automatisch bei erster
  fremder Öffnung setzen (Claude-Vorschlag nach Kritik „Handpflege
  verrottet"; Einladung/Absage blieben von Hand).
