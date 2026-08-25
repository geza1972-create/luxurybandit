# Konzept: Die Bewerbungszentrale

Stand 25.08.2026, abends — Ergebnis eines ganzen Konzept-Tages mit dem Owner.
**Multi-Bewerbung** ist die Funktion, **Bewerbungszentrale** ist das Produkt (Owner:
„das ist dann eine Bewerbungszentrale dann doch").

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
  Besitzer sieht im Bearbeiten-Modus: „N Recruiter haben sich deine
  Bewerbung angeschaut."
- **PLAY-KNOPF-TEASER auf der Bild-Bewerbung (Owner, GEBAUT 25.08. spät):**
  „Das wäre doch toll, wenn auf dem Bild ein Play-Button steht und die
  Meldung kommt: Noch kein Video — aber der Bewerber sieht: 3 Leute wollten
  dein Video sehen." Firma tippt Play → Zeile „Noch kein Video." +
  `videoKlicks`-Zähler (nur bestätigte Fremde). Besitzer sieht den
  KAUF-TRIGGER (Owner-Wortlaut): „N Leute wollten dein Video sehen. Video
  ist gefragt — erstelle jetzt dein Video." Der Knopf dahinter kommt mit
  Stufe 3 (Video-Kasse). Zugabe-Zeile dazu wieder in der
  Landingpage-Beschreibung (Owner: „in der Beschreibung auch").
- **Anfragen**: was Firmen im Chat eintragen ({Datum, Art
  interesse/frage, Name, E-Mail, Nachricht}), wird AN DER BEWERBUNG
  gespeichert; die Mail an support@ geht ZUSÄTZLICH raus (Benachrichtigung +
  Vermittlungs-Einblick). Karte zeigt den Zähler, aufklappbar.

---

## Kontakt-Freigabe

Liegt beim BEWERBER (gedreht am 25.08. — vorher Admin-only): Zweiwahl mit
Häkchen **„Öffentlich sichtbar" / „Nur per Anfrage"** — Haus-Chip-Muster in
Tinte, gewählte Zeile trägt vollen Rand + Häkchen, die andere gar kein
Symbol (kein Grün, keine zwei ähnlichen Kreise). Erst die Freigabe lässt den
Firmen-Chat die Daten auf Nachfrage nennen. Der Admin kann weiterhin
schalten (Vermittlungsfälle).

---

## Preise (Endstand nach mehreren Drehungen)

| | |
|---|---|
| **ERSTKAUF: Auswertung + Video + Seite** | **19** (LEBENSLAUF_CENTS) — der Einstieg, nicht gratis |
| Match prüfen | gratis (für Kunden, auf ihrer Seite) |
| ERSTE zugeschnittene Version (mit Bild) | gratis — die Probe; Löschen gibt sie nicht zurück |
| Weitere Bild-Bewerbungen | nur mit dem 4,99-Abo, darin ohne Einzelpreis |
| Videobewerbung | kostet IMMER extra je Video, übers GUTHABEN (Kiss-Kaufweg); Preis vor Stufe 3 festlegen (Kandidaten: 1,99 vorhandenes Video / 4,99 neu eingesprochen) |
| Bild-Wechsel je Version | Foto-Upload gratis; KI-Berufslook nur im Video-Paket |

Keine neue Abrechnungstechnik: Abo-Häkchen + Probe-Zähler + bestehender
Guthaben-Weg. Preise NUR aus lib/pricing.ts, nie als Zahl im Text.

---

## Der Landingpage-Text (abgenommen 25.08.)

Features verkaufen (Owner: „Das sind Features, die keiner hat. Nur damit
können wir gegen die Konkurrenz gewinnen."). Preis als {price} aus der
Tabelle. Knopf oben im Sichtfeld und unten am Schluss.

> # Für jede Stelle die perfekte Bewerbung.
>
> Füge eine Stellenanzeige ein und sieh in Prozent, ob sie zu dir passt.
> Dann passt sich deine Bewerbung an — Anschreiben, Video und Lebenslauf,
> zugeschnitten auf genau diese Stelle.
>
> **[ Jetzt starten — {price} ]**
>
> *(Video-Karte: das Beispiel-Video)*
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
- Offen: eine dezente KI-Kennzeichnungszeile in den AGB (Claude-Vorschlag,
  Owner-Antwort steht aus). Offen: Status „Geöffnet" automatisch bei erster
  fremder Öffnung setzen (Claude-Vorschlag nach Kritik „Handpflege
  verrottet"; Einladung/Absage blieben von Hand).
