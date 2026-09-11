# VERSUSFORGE — DIE ROADMAP

---

## ▶ ÜBERGABE AN DEN NÄCHSTEN CHAT — Stand 10.09.2026, Nachmittag

**Zweig `agent`. Nichts committet, nichts deployt.** Commit und Deploy nur auf ausdrückliches Ja
des Owners, jedes Mal einzeln.

### So arbeitet der Owner mit dir (heute schmerzhaft gelernt)
1. **Vor jeder Änderung sagen: welche Datei, was daran — dann auf „ja" warten.**
2. **Kurze Antworten.** Lange Listen verwirren ihn („das verwirrt mich"). Eine Sache, klar.
3. **Nie im Browser-Tab des Owners testen, ohne es vorher anzusagen.** Heute zweimal Verwirrung,
   weil Testsätze („Klimaanlagen", „Am un restaurant…") in seinem Tab auftauchten.
4. **Keinen Zustand behaupten, der nicht vorher mit `grep`/Lauf belegt ist.** Den Userflow aus
   dem Gedächtnis zu zeichnen hat heute zwei falsche „fehlt"-Punkte erzeugt.
5. **Was besprochen wird, wird gebaut — nicht nur gezeichnet.** Die Aufforderung unter den
   Chips stand 30 Minuten lang nur im Userflow.

### Die Entscheidungen von heute
- **Der Agent IST der Trichter.** `/engine` zeigt direkt den Agenten-Chat — keine Seite mit Feld
  davor. Mit `?lang=ro` sofort die Begrüssung, sonst zuerst „Choose a language".
- **Lieber nichts als Schrott:** Ist ein Hook austauschbar, wird kein Bild gebaut; der Agent holt
  die Substanz aus ihm heraus, und im Zweifel bietet er einen **Rückruf** an.
- **Tempo und Kosten gehören zum Bau, nicht zum Feinschliff** (Memory `agenten-schnell-und-billig`).

### Heute gebaut und geprüft
| Was | Beleg |
|---|---|
| Hook-Prüfung misst Substanz (`austauschbar`) | Testlauf Autowerkstatt: kein Hook, Rückruf angeboten |
| Rückruf: WhatsApp (nur Vorname/Link) + Mail (Nummer/Verlauf) + Anfrage im Dashboard | Rückruf erschien in `/engine/anfragen` als „Name · Nummer" |
| Zug nach „Ja, einverstanden" ohne Modell | 8,3 s → 0,26 s |
| Späte Regeln nur, wenn dran | 6250 → 5567 Token, erster Zug 11,7 → 7,3 s |
| Jeder Zug protokolliert, Kosten gemessen | `/engine/gespraeche?s=…` · ~0,3 ct/Zug, ~4 ct/Gespräch |
| Fremde Websites können den Agenten nicht kapern | Gegenprobe: sauberer Text benutzt, eingeschleuste Anweisung ignoriert |
| Prüfskript mit 5 festen Gesprächen | `node scripts/versusforge-pruefen.mjs` · von 14 Mängeln auf 1 |
| Rezeptwörter, Du/Sie-Mix, doppelte Fragen, Hook-Chips als Etiketten | im Prüfskript gefunden, im Auftrag behoben |
| `/engine` = Agenten-Chat, Schild „Muster" weg | Browser: mit/ohne Sprache geprüft |
| Übersetzer setzt Platzhalter zurück (alle Produkte) | 10/10 im Test; Speicher-Eintrag `{libere}` → `{frei}` geheilt |
| Aufforderung unter den Chips | Browser: nach Antwort sichtbar, nicht beim Ja-Chip |
| Karten gehen jetzt an die Trichterseite; ohne Karten keine Seite | Typprüfung sauber — **Abschluss noch nicht end-to-end gelaufen** |
| Logo im Chat · Hochscrollen repariert | Browser gemessen |

### Offen, in dieser Reihenfolge
1. **Künstler: dieselbe Frage wörtlich zweimal** — in 2 von 3 Prüfläufen, also ein Regelproblem,
   keine Streuung. Die Liste „schon geschrieben" steht wieder am Ende; reicht offenbar nicht.
2. **Einmal den ganzen Abschluss durchspielen** (Hook wählen → Bild → Betrieb → Mail) und
   prüfen, dass die Karten wirklich auf der Trichterseite stehen.
3. **Die erste Frage klingt bei jedem Betrieb gleich** („Was kann ein Kunde danach …?") — beim
   Restaurant seltsam. Das Rezept stimmt, die Frage muss in seine Welt übersetzt werden.
4. Plan-Schirm · Trichterlink im Gespräch · Kauf im Blick (Punkte 3–5 unten).
5. Anfragenliste `/engine/anfragen` ist noch schwarz-gold.
6. Gedächtnis über den Tab hinaus · Not-Aus · Nachfassen nach der Mail.

### Achtung, bevor du etwas anfasst
- **Eine andere Sitzung arbeitet parallel in diesem Repo:** `lib/versusforge-anzeige.ts`,
  `-anzeige-brief.ts`, `-anzeige-prompt.ts` (heute 10:25–10:42, Art Director für fertige Anzeigen
  mit Text im Bild). Noch nirgends eingebunden. Nicht überschreiben, nicht löschen.
- **Gelöscht seit heute 09:06:** `public/VersusForge/kaempfer-*` (Spots, Bilder) — zeitgleich mit
  dem Einlegen des Logos, nicht von dieser Sitzung. Im Commit 9d871e2d (09.09.) noch vorhanden.
  Owner fragen, ob gewollt.
- **Unverbaute Runde von gestern Abend** (09.09., 22:04–22:29): Bild-, Hook-neu-, Mandanten- und
  Dashboard-Dateien.

### Zum Prüfen
- Prüfskript: `node scripts/versusforge-pruefen.mjs` (≈5 ct) — nach jeder Regeländerung.
- Gespräche: `/engine/gespraeche?s=<VERSUSFORGE_DASHBOARD_KEY>` · Anfragen:
  `/engine/anfragen?m=versusforge&s=<VERSUSFORGE_DASHBOARD_KEY>` (Schlüssel aus `.env.local`,
  nie in eine Datei im Repo schreiben).

### Noch zu setzen, sonst klingelt beim Rückruf nichts
`CALLMEBOT_PHONE` + `CALLMEBOT_APIKEY` (oder Nummer im Seller-Dashboard) · optional
`VERSUSFORGE_ALARM_MAIL`.

### Datenschutz (Owner-Frage heute)
OpenAI bleibt vorerst. Nötig: Auftragsverarbeitungsvertrag mit OpenAI abschliessen. Ollama
(selbst gehostet) erst, wenn ein Kunde es verlangt oder das Volumen einen eigenen Server trägt.

---

*Angelegt 10.09.2026, weil an diesem Tag drei Stunden verloren gingen: Ich habe am falschen
Chat gearbeitet, ohne zu sagen, an welchem. Owner: „arbeitest du nach der Roadmap?" — Nein.
Ab jetzt ja. Diese Datei ist die einzige Liste. Was hier nicht steht, wird nicht gebaut.*

---

## DIE ENTSCHEIDUNG VOM 10.09.2026

> **„Du machst jetzt in den Agenten rein, alles was du in dem Trichter eingebaut hast.
> Das ist der neue Trichter, den wir brauchen."** · **„Es soll alles rüber."**

**Der Agent (`/engine/agent`) wird der Trichter.** Der alte Trichter (`/engine/start`) bleibt
liegen, wird aber nicht mehr verlinkt und stirbt, wenn der Agent alles kann.

**Warum der Agent gewinnt:** Er hat die Eröffnung, die verkauft — Sprachwahl, Begrüssung,
Regeln, was es kostenlos gibt, Datenschutz, ausdrückliches Ja. Der alte Trichter beginnt
mitten im Gespräch, ohne dass jemand weiss, mit wem er redet.

---

## DER WEG DES KUNDEN — sechs Stationen

| # | Station | Adresse | Zustand |
|---|---|---|---|
| 0 | Die Anzeige bei Facebook | — | wartet auf Freigabe |
| 1 | Die Seite mit dem einen Feld | `/engine` | **steht** |
| 2 | Das Gespräch | `/engine/agent` | **steht**, unvollständig |
| 3 | Sein Plan + sein Anzeigenbild | im Gespräch | Bild steht, Plan-Schirm fehlt |
| 4 | Seine eigene Seite + Dashboard | `/versusforge/<name>` | **steht** |
| 5 | Der Kauf, 299 € | Dashboard | gebaut, **ausgeschaltet** |

---

## WAS STEHT — nicht mehr anfassen

**Im Agenten (`components/AgentChat.tsx`, `app/api/versusforge-agent/route.ts`):**
- Sprachauswahl als erster Schirm, ohne Vorauswahl, jedes Mal
- Begrüssung · drei Regeln · was er kostenlos bekommt · Datenschutz · „Ja, einverstanden"
- EINE Eingabebox, Mikrofon und Foto innen (ChatGPT-Form)
- Alles löschen — zwei Tipps, rot, ohne Uhr
- Werkzeuge: Website lesen · Hook prüfen · Motiv erzeugen · Bild bauen · Abschluss schicken
- Chips: antippen heisst senden

**Drumherum:**
- Mandant anlegen, seine Seite, sein Dashboard, drei Mails — alles in seiner Sprache
- Das Anzeigenbild (1080×1350) mit drei Layouts je nach Hochformat/Querformat
- Die zehn Facebook-Schritte als Anleitung im Dashboard
- Die Kasse (eingebettet, `api/versusforge-kasse`) — technisch fertig

---

## AM 10.09. IN DEN AGENTEN GEBAUT — erledigt

**Lieber nichts als Schrott** (Owner: „bevor wir einen Scheiss liefern, sagen wir es ihm"):
- `hook_pruefen` misst jetzt auch **Substanz**: Steht im Satz kein einziges Wort aus seinen
  eigenen Angaben, ist er `austauschbar` — dann wird KEIN Bild gebaut.
- Der Agent sagt es ihm geradeheraus und fragt nach der einen Sache, die anders läuft.
- Die alte Regel „zweimal nichts, dann lass es" gilt nur noch für EINEN Punkt, nie für die
  Substanz.
- **Der Rückruf** (`rueckruf_erbitten`): Kommt aus drei Winkeln nichts, bietet er das
  Telefonat an. Freigegeben erst, wenn er eine Nummer genannt hat.
- Der Rückruf löst drei Dinge aus: **WhatsApp an den Owner** (nur Vorname, Betrieb, Link —
  keine Kundennummer über CallMeBot), **Mail aus dem VersusForge-Postfach** (Nummer,
  Verlauf, Link) und die **Anfrage im eigenen Dashboard**.
- `/engine/anfragen` zeigt bei einer Beratung **Name · Nummer** statt der Adresse, als
  `tel:`-Link.
- **Das Logo** (`public/VersusForge/Logo-VersusForge.JPG`) steht als runder Punkt neben jeder
  Antwort des Agenten — statt der zwei gezeichneten Buchstaben.
- **Hochscrollen ging nicht.** `justify-end` auf einer scrollenden Fläche schiebt den Inhalt
  über die OBERE Kante, und dorthin kommt kein Rollbalken: Begrüssung, Regeln und der
  Datenschutzsatz waren ab der dritten Antwort unerreichbar. Jetzt `mt-auto` am Inhalt —
  gemessen: 1130 px Inhalt in 518 px Fläche, `scrollTop = 0` erreichbar.

**Sehen, messen, schützen, prüfen** (Owner: „du musst kosteneffizient arbeiten und schnell"):
- **Der Zug nach „Ja, einverstanden" braucht kein Modell mehr** — geschriebene Frage.
  Gemessen: 8,3 s → 0,26 s, kostet nichts.
- **Regeln nach Phase:** 32 Zeilen (Foto, Motiv, Bild, Betrieb, E-Mail) reisen erst mit, wenn
  ein Bild existiert oder ab Zug 3 — hinten angehängt, damit der Cache vorn heil bleibt.
  Gemessen: 6250 → 5567 Token, erster Zug 11,7 s → 7,3 s.
- **Jeder Zug wird protokolliert** (`lib/versusforge-lauf.ts`): Zeit, Token, Euro, Werkzeuge,
  Regelfassung. Ansehen unter `/engine/gespraeche?s=…`. Gemessen: **~0,3 Cent je Zug,
  ~4 Cent je Gespräch.**
- **Fremde Websites können den Agenten nicht mehr kapern:** Seitentext kommt zwischen
  Markierungen, als Material, nicht als Anweisung — im Agenten und im Trichter. Mit
  Gegenprobe getestet: sauberer Text wird benutzt, die eingebaute Anweisung („GEKAPERT",
  „5000 Euro", „geschult") befolgt er nicht.
- **Die Prüfung** (`scripts/versusforge-pruefen.mjs`): fünf feste Gespräche (Zahnarzt,
  Restaurant RO, Künstler, Klimamontage, Werkstatt ohne Substanz), ~5 Cent je Durchlauf.
  Sie hat beim ersten Lauf **echte** Fehler gefunden: Hebelnamen offen im Gespräch
  („Herkunft, Verfahren und Knappheit zur Basis"), dieselbe Frage wörtlich zweimal, Hooks
  mit gekürzten Chips und ohne Aufforderung zu wählen. Alle behoben. Zweimal war der Prüfer
  selbst zu grob („Welche Belege hast du?" ist richtig) — auch das korrigiert.
- **Selbst verursacht und behoben:** Beim Aufteilen nach Phase war die Liste der schon
  gestellten Fragen in die Mitte gerutscht. Sie steht wieder ganz am Ende.

**Nach jeder Regeländerung:** `node scripts/versusforge-pruefen.mjs` — erst wenn es grün ist,
gilt die Änderung.

**Der Übersetzer behält die Platzhalter** (`lib/translate.ts`, Owner: „ja" zur Reparatur für
alle Produkte). Auslöser: „primele {libere} cereri" — `{frei}` war mitübersetzt worden. Eine
Durchsicht des Speichers fand **10 kaputte Einträge** in allen Produkten (`{preis}` →
`{price}`, `{analyse}` → `{analysis}`, `{rolle}` → `{role}` …). Jetzt setzt `platzhalterZurueck`
die Originalnamen nach jeder Übersetzung zurück — auch bei schon gespeicherten Einträgen, die
beim nächsten Lesen geheilt und korrigiert zurückgeschrieben werden. Getestet an allen sechs
echten Fällen plus vier Fällen, in denen nichts angefasst werden darf: 10 von 10.

**Noch zu setzen, sonst klingelt nichts:** `CALLMEBOT_PHONE` + `CALLMEBOT_APIKEY`
(oder die Nummer im Seller-Dashboard) · optional `VERSUSFORGE_ALARM_MAIL`.

## WAS FEHLT — die Liste, in dieser Reihenfolge

### 1 · Die Anzeige führt in den Agenten — ✅ ERLEDIGT 10.09.2026
`app/engine/page.tsx` · `components/VersusForgeStartEinfach.tsx` · `components/AgentChat.tsx`

Die Startseite wechselte schon keine Seite mehr (Entscheidung 09.09.) — sie öffnete nach „Jetzt
starten" nur den ALTEN Trichter-Chat auf derselben Adresse. Jetzt öffnet sich dort der
Agent: Begrüssung, Regeln, was gratis ist, Datenschutz, „Ja, einverstanden". Die Sprache gilt
als gewählt (kein zweites „Choose a language"). Sein Satz reist mit und geht **erst nach dem
Ja** als seine erste Nachricht an das Modell — kein Aufruf vor der Zustimmung, und er muss
nichts zweimal tippen.

Geprüft im Browser: Gruss, Datenschutz, Chip und Logo da, alter Trichter weg, Adresse
unverändert; nach dem Ja stehen „Ja, einverstanden" und sein Satz im Verlauf, und die Antwort
nimmt seinen Inhalt auf („Terrasse am Pool … Lamm vom Holzkohlegrill"), 10 s.

Der alte Trichter bleibt als Rückfall im Code, falls die Agenten-Texte fehlen — er ist nicht
mehr der Eingang.

**NACHTRAG, GLEICHER TAG — KEINE SEITE MEHR VOR DEM CHAT.** Owner mit Bild der Startseite:
„diese Seite verwirrt mich" — und auf die Frage, ob es die Reihenfolge ist: „Gott sei Dank,
hast du es verstanden." Er tippte seinen Satz, bevor ihn jemand begrüsst hatte und bevor er
dem Datenschutz zugestimmt hatte; und „4 Fragen" versprach etwas, das der Agent nicht halten
soll („er muss alles liefern, egal wie").

`/engine` zeigt jetzt **direkt den Agenten-Chat** — dieselbe Komponente wie `/engine/agent`.
Mit `?lang=ro` im Anzeigenlink sofort die Begrüssung, ohne zuerst „Choose a language". Das
Schild „Agent · Muster" ist weg. Die alte Startseite liegt noch im Repo, hängt an nichts.

Geprüft im Browser: ohne Sprache → Sprachfrage mit drei Knöpfen; mit `?lang=ro` → Gruss auf
Rumänisch, Chip „Da, sunt de acord", Logo; kein altes Feld, kein „Muster".

Dabei aufgefallen und behoben: **„primele {libere} cereri"** — der Übersetzer hatte den
Platzhalter `{frei}` selbst übersetzt, die Zahl fehlte. Ersetzt wird jetzt jeder Platzhalter
in geschweiften Klammern, egal wie er nach der Übersetzung heisst.

### 2 · Der Betriebsname wird Pflicht
`app/api/versusforge-agent/route.ts`

`abschluss_schicken` verlangt heute nur die E-Mail. Ohne Betriebsnamen heisst sein Trichter
nach dem Anfang seiner Adresse — im Test hiess er „geza1972". Der alte Trichter fragt danach,
der Agent nicht.

### 3 · Der Plan-Schirm
`components/AgentChat.tsx`

Was der alte Trichter zeigt und der Agent nicht: Befund · Zielgruppe · die Karten, die sein
Kunde antippt · Noten · Bauteile mit Aufwand · Budget · **was dagegen spricht** · der fertige
Anzeigentext (Überschrift, Text, Knopf). Owner: „es soll alles rüber."

### 4 · Der Trichterlink nach der Mail
`components/AgentChat.tsx`

Heute endet das Gespräch mit drei Sätzen. Es fehlt: sein Link zum Kopieren, der Knopf zum
Ansehen, und der Satz, dass die ersten fünf Anfragen offen sind.

### 5 · Der Kauf im Blick
`components/AgentChat.tsx`

Der Knopf bleibt auf dem Dashboard — dort, wo er den Verlust spürt. Der Agent sagt am Ende,
dass es ihn gibt und wann er greift.

### 6 · Die Anfragenliste ist noch die alte
`app/engine/anfragen/page.tsx`

Owner 10.09.2026, mit Bild: „das ist wieder ein alter Mist." Schwarz mit Gold, während
Startseite, Chat und Mandantenseite längst hell und blau sind. Beim Umbau übersehen — es ist
die einzige Fläche im Produkt, die noch aus der dunklen Zeit stammt.

---

## WAS AUSGESCHALTET IST

```
lib/versusforge-schalter.ts
  VF_KAUF_AKTIV     = false   ← echter Stripe-Kauf AUS. Niemand kann heute zahlen.
  VF_KAUF_PROBE     = true    ← Probekauf, nur mit Dashboard-Schlüssel
  VF_ANFRAGEN_OFFEN = 5       ← die ersten fünf Anfragen sieht er vollständig
```

Der Schalter geht erst um, wenn der Owner es sagt.

---

## DIE REGELN, DIE NICHT VERHANDELBAR SIND

- **Nichts committen, nichts pushen, nichts deployen ohne sein ausdrückliches Ja.**
  Ein „deploy" gilt für genau eine Freigabe, nicht für die Sitzung.
- **Vor jeder Änderung sagen: welche Datei, was daran.** Erst dann bauen.
  *(Die Regel, die am 10.09. gefehlt hat.)*
- **Das Rezept bleibt drinnen.** Die fünf Hebel werden nie beim Namen genannt — in keiner
  Sprache, in keinem Feld. Owner: „gute Restaurants veröffentlichen ihr Rezept auch nicht."
- **Keine Fachsprache auf dem Bildschirm.** Owner 10.09.: „Das versteht ein normaler User
  nicht." Was für uns der Arbeitsstand ist, ist für ihn Rauschen.
- **Nie eine Hausadresse zeigen**, nur `/contact`.
- **Keine erfundenen Anfragen.** Ein gefälschter Lead ist ein Anruf von der Blamage entfernt —
  vom Kunden, der gerade 299 € bezahlt hat.
- **Kein bezahlter Modellaufruf ohne sein bewusstes Ja.**
- **Alles, was er erzeugt, spricht seine Sprache** — Trichter, Hook, Dashboard, Mails,
  Fehlermeldungen. Zahlen als Ziffer, nie als Wort (sonst wird „Fünf" spanisch).

---

## DANACH — nicht vorher anfangen

1. Er läuft den ganzen Weg selbst einmal durch.
2. Der Link an drei Bekannte, bevor Werbegeld fliesst.
3. Erst dann: `VF_KAUF_AKTIV = true`.
4. Erst wenn VersusForge verkauft: der Lebensplan-Agent.

---

## WAS AM 10.09. GEBAUT WURDE (noch nicht committet)

Alles im **alten** Trichter — die Arbeit, die diese Roadmap ausgelöst hat:

- Der Fehler, der den Chat tot machte: sein Satz war beim Absenden noch leer
  (`chatLauf(erste, { ziel, text, url })`)
- Ein neuer Satz sticht ein altes Gespräch
- „Alles löschen"
- Der Fahrplan mit den Prozenten ist raus — Fachsprache
- „In zwei Minuten" → „4 Fragen" · „Cinco lucruri" → Ziffer
- Die sechs Fehlermeldungen der Route sprechen seine Sprache

**Offene Entscheidung:** Bleibt das im alten Trichter stehen, oder wird es weggeworfen,
sobald der Agent alles kann?
