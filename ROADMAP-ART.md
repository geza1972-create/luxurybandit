# VERSUSFORGE ART — DIE ROADMAP

**Stand 10.09.2026 · Zweig `agent` · nichts committet, nichts deployt.**
Entwurf. Alles unter „Offen" entscheidet der Owner.

---

## DAS ZIEL — in einem Satz

> **Aus dem, was der Künstler schon hat, das richtige Marketing machen:
> die richtige Kategorie, der richtige Text, der richtige Preisrahmen — und das Besondere sichtbar.**

Wir bringen ihm nicht das Malen bei und decken nicht alles ab. Wir nehmen seine Werke, wie sie
sind, und machen sie verkäuflich — wie beim Stein: Der Stein ändert sich nicht, die Sicht darauf.

**Warum Kunst und nicht alle Branchen (Owner 10.09.2026):** Der Agent wird nur so gut wie das
Wissen dahinter. Für Kunst ist es da. Erste echte Fälle: die Kunst des Owners und ihrer Freundin Szidonia Bandi.

---

## DER EINSTIEG

> **Vrei să-ți vinzi arta și nu știi cum?**
> **Vrei să știi ce se cere pe piață?**
> Avem soluția. Începe acum: câteva întrebări, iar noi îți facem un plan de marketing.

„câteva" und keine Zahl: Die Anzahl der Fragen ist dynamisch (siehe Gehirn).

---

## DAS MODELL DES AGENTEN

```
                         EINNAHMEN
                 (Anzeige · Beratung · …)
                             ↑
AUGEN → GEHIRN + WISSEN → HÄNDE → KONTROLLE → AUSGABE
               ↕                               ├─ Werbung
            MEMORY                             └─ Beratung (nur auf Wunsch)
```

---

## 0 · EINNAHMEN — womit wir Geld verdienen

| Heute | Art |
|---|---|
| Kauf 299 € im Dashboard: gebaut, **ausgeschaltet**. Es wird nichts eingenommen. | **Abo 10 € im Monat** je Künstler (Owner 10.09.2026). |

**Die Rechnung des Owners:** 100 Künstler × 10 € = **1.000 € im Monat**. Davon machen wir Werbung
für das **Portal** (Teil 9) — damit helfen wir nicht nur mit einem Agenten, sondern machen seine
Kunst bekannt.

**Was das Abo tragen muss:** die Gespräche des Käufer-Agenten (heute gemessen ~4 ct je Gespräch),
erzeugte Bilder (ein Motiv ~15 ct) und den Anteil an der Portal-Werbung.

**Entschieden: Einer trägt den anderen — und wir messen es** (Owner 10.09.2026). Ein Künstler mit
vielen Käufer-Gesprächen wird von denen mit wenigen getragen. Ob die Rechnung aufgeht, zeigt die
Kostenkontrolle, nicht eine Schätzung — dafür braucht sie die zwei Ergänzungen unter Kontrolle.

**Im Abo (10 €/Monat), entschieden 10.09.2026:** seine Landingpage mit **Galerie · Profil ·
Kontakt · Käufer-Agent · Dashboard mit Hooks**.

**Erst gratis, bezahlt wird, wenn es wirkt** (Owner 10.09.2026): „Diese Seite kostet dich nichts.
Du zahlst, wenn unser Agent für dich arbeitet und du ihn behalten willst." **Der Auslöser: drei
verschiedene Interessenten antworten seinem Agenten** — seine eigenen Tests zählen nicht
(entschieden 10.09.) — siehe Kunst-Rezept Schritt 11.

**Gebaut 10.09.2026 — das Abo im Code** (nicht committet, nicht deployt):
- Regeln an einer Stelle: `lib/versusforge-abo.ts` (`ABO_FRAGE_AB = 3`, `ABO_FRIST_TAGE = 14`,
  `aboAktiv`, `gesperrt`, `anfrageSichtbar`). Preis + Stripe-Kennung in `lib/pricing.ts`.
- Kasse `app/api/versusforge-kasse`: `was: "abo"` (Stripe-Abo-Checkout, kind `versusforge-abo`)
  und `abo-einloesen` (prüft paid/no_payment_required, kind und Künstler). Webhook: aktiv bei
  `checkout.session.completed`, aus bei `customer.subscription.deleted`.
- Anfragen (`app/api/versusforge-mandant`): bei der 3. fremden Anfrage wird `aboFrageAm` gesetzt;
  Mail je nach Stand „offen" / „frage" / „gesperrt" (`lib/versusforge-anfrage-post.ts`).
- Dashboard: im Kunst-Rezept Schild mit „Agent behalten — 10 € im Monat", Frist-Tage, Zahl der
  gesperrten Antworten; 299-Weg nur noch für Nicht-Kunst. Gruss nennt den Abo-Preis.
- `VF_KAUF_PROBE = false` (Probekauf aus). `VF_ANFRAGEN_OFFEN = 5` gilt nur noch für Nicht-Kunst.

**Entschieden 10.09.2026 — das neue Bezahlmodell:**
- **Stripe-Abo angelegt vom Owner:** „Art Marketing Abo", 10,00 € / Monat, live
  (`prod_VEbEShQVb0dz0X`, `price_1UE81x1jPNCWoiztEc3jhmHJ`).
- **299 € einmalig: für Kunst abgeschafft, im Code behalten** für ein späteres anderes Rezept
  (Owner zuerst „299 abschaffen", dann „3 behalten" — die letzte Aussage gilt). Die Kunst-Engine
  verkauft nur das Abo.
- **Keine Sperre der Kontakte** — jede Anfrage mit Kontakt, auch ohne Abo.
- **Nach 3 Interessenten** die Frage „Willst du deinen Agenten für 10 € im Monat behalten?" —
  bis der Käufer-Agent existiert, zählen **3 Anfragen** (Vorschlag, vom Owner nicht widersprochen).
- **Zahlt er nicht: nach 14 Tagen werden die Antworten gesperrt** (Owner 10.09.2026, ersetzt die
  Fassungen „nichts abschalten" und „Agent spricht niemanden mehr an"): „Er bekommt weiter
  Anfragen, aber er sieht sie nicht." · „Wenn jemand auf ihn Ja schreibt oder irgendwas, bekommt
  er eine E-Mail. Aber er kann sie nicht sehen. Er wird aufgefordert zu zahlen, um die Antwort zu
  sehen." Die Galerie und der Agent laufen weiter; die Frist beginnt mit der Frage nach 3
  Interessenten; was er vorher gesehen hat, behält er.
- **Der Käufer-Agent arbeitet während der Sperre ganz normal weiter** (Owner 10.09.2026: „doch,
  der Agent arbeitet weiter — ganz normal"), auch mit seinem Abschluss. Hinweis dazu war: „er
  meldet sich bei dir" ist erst gedeckt, wenn der Künstler zahlt — der Owner nimmt das in Kauf.
- **Ausnahme von der Bezahl-Regel „Ein Abo, sonst Einmalkauf":** Die Regel gilt für Geschenke;
  das Kunst-Abo ist bewusst das zweite Abo im Haus.
- **Getestet wird mit einem 100-%-Gutscheincode** — die Kasse läuft mit Live-Schlüsseln.

**Offen:** Was kostet extra (Anzeige mit erzeugtem Motiv, Beratung)?

---

## 1 · AUGEN — was er wahrnimmt

| Heute | Art |
|---|---|
| Text. Eine URL liest `website_lesen` **sofort**. Ein angehängtes Foto **sieht der Agent nicht** — es geht nur ins Anzeigenbild und ist nach der Nachricht weg. | Das Werk ist das Produkt: Der Agent muss es **sehen** — aber erst, wenn der Künstler es will. |

**Der Ablauf (Owner 10.09.2026, bestätigt):**
1. Bild oder URL kommt → **noch keine Analyse, keine Tokens.** Frage: „Soll ich mir das ansehen?"
   · *Ja, analysiere es · Nein, nur für die Anzeige*
2. Bei Ja → „Worauf soll ich achten?" — der Blickwinkel. Ohne ihn liefert er Blödsinn.
   · *Entwurf:* Wie wirkt es an der Wand · Was macht es einzigartig · Für wen ist es
3. Erst dann schaut er hin — nur unter diesem Blickwinkel.
4. Am Ende: „Soll ich dein Bild für die Anzeige nehmen?" · *Ja · Nein · Anderes hochladen*

Die Fragen 1, 2 und 4 sind fester Text im Browser (0 Tokens). Das Bild bleibt für das Gespräch
im Browser, gespeichert wird es nirgends.

---

## 2 · GEHIRN + WISSEN — wie er denkt, was er weiss

**Gehirn = das Modell.** Austauschbar (heute das kleine OpenAI-Modell, `KLEIN`).
**Wissen = das Kunst-Rezept.** Gehört nur uns. Das macht den Agenten gut.

**EIN Künstler-Agent, kein zweiter** (entschieden 10.09.2026, Owner: „ja klar"):
- **Grundlage: der VersusForge-Agent** (`app/api/versusforge-agent/route.ts`) — er hat die
  Werkzeuge (Website lesen, Hook prüfen, Bild bauen, Abschluss, Rückruf), legt die Seite an,
  schickt die Mail, misst die Kosten.
- **Wissen: das Kunst-Rezept** (`lib/versusforge-kunst-rezept.ts`) statt der fünf allgemeinen Hebel.
- **Gesprächsführung: vom Recruiter David** (`app/api/david-screening/route.ts`, Skill `agenten`) —
  Prüfen und Einordnen (bei uns: die Aufnahme), ehrliche Rückgabe nach jeder Antwort,
  Überspringen erlaubt, Plan vor dem Gespräch.
- Zwei getrennte Agenten für den Künstler würden auseinanderlaufen — deshalb einer.
- **Die Engine ist jetzt für Kunst — andere Branchen können später dazukommen** (Owner
  10.09.2026: „Diese Engine ist jetzt für Kunst, aber wir können auch andere bauen"). Deshalb
  wird das Rezept **austauschbar** eingebaut: ein Ablauf, mehrere Rezepte. Heute läuft `/engine`
  mit dem Kunst-Rezept; das allgemeine Hook-Rezept (fünf Hebel) bleibt als Rezept erhalten und
  wird nicht gelöscht. Eine neue Branche = ein neues Rezept, kein neuer Agent.

| Heute | Art |
|---|---|
| Allgemeine Regeln für alle Branchen + Hook-Rezept mit 5 Hebeln (`lib/versusforge-hook-rezept.ts`) | Eigenes Kunst-Rezept (`lib/versusforge-kunst-rezept.ts`, neu) |

### Kein Fragenskript, sondern ein Ziel

Der Agent fragt, **bis er alles hat, was er braucht** — dann hört er auf. Beantwortet ein Satz drei
Punkte, fragt er dreimal weniger. Jede Antwort kann eine neue Frage aufwerfen.

### Die Checkliste — ENTWURF, der Owner korrigiert

| # | Was er braucht | Worauf er achtet — **prüfen statt glauben** |
|---|---|---|
| 1 | **Richtung / Kategorie** (abstrakt, figurativ, …) | Viele ordnen sich falsch ein („figurativ", ist es aber nicht). Er bestimmt die Kategorie **aus dem Bild**, nicht aus der Selbstaussage — und sagt es freundlich, mit Grund. Falsche Kategorie = die falschen Käufer = kein Verkauf. |
| 2 | **Das Besondere** | Die meisten machen ihren Stein nicht besonders. Er holt es aus dem, was da ist: Material, Handgriff, Herkunft, Geschichte, Menge. Nie erfinden. |
| 3 | **Zeigen** — Bilder oder Website | Siehe Augen. |
| 4 | **Käufer und Ort** | Wer kauft das, wo hängt es später (Wohnung, Büro, Sammlung)? |
| 5 | **Preis** | **Den Preis bestimmt nur der Künstler** (Owner 10.09.2026). Der Agent kann nur **vergleichen, was ähnliche Kunst tatsächlich erzielt** — verkaufte Preise, nicht verlangte. Unbekannte verlangen oft zu viel; dann sagt er ehrlich, was vergleichbare Werke wirklich gebracht haben, mit der Folge („so bleibt es hängen"), nicht als Urteil. Ohne echte Verkaufsdaten sagt er nichts zur Höhe. |
| 6 | **Bekanntheit / bisherige Verkäufe** | Ausstellungen, Verkäufe, Käufer. Der Beleg für den Preis und für den Hook. |
| 7 | **Sein Ziel** | Werke verkaufen · Aufträge · Galerie? |
| 8 | **Beratung gewünscht?** | Ja/Nein — siehe Beratung. |

| 9 | **Werkangaben** je Werk | Material · Grösse · Seltenheit · Signatur · Echtheitszertifikat · Rahmen — genau die Felder, die Käufer auf Artsy sehen (Teil 8). |

**Fertig ist er, wenn** jeder Punkt gefüllt ist oder ausdrücklich „weiss er nicht" dasteht.

### Die Kategorien — nach Artsy (Owner 10.09.2026: „die bekannten Kategorien … nimm eine bekannte Plattform")

Artsy ordnet über 1.000 Merkmale („The Art Genome Project"). Zu viele für ein Gespräch. Käufer
**filtern** dort aber nach wenigen Gruppen — die übernehmen wir, mit Artsys Namen, damit Künstler
und Käufer dieselbe Sprache sprechen wie auf der grössten Kunstplattform:

| Gruppe | Beispiele (Artsy) | Woher der Agent es weiss |
|---|---|---|
| **Medium** | Painting · Photography · Sculpture · Prints · Drawing | Frage oder Bild |
| **Seltenheit** (Rarity) | Unique · Limited edition · Open edition | Frage |
| **Stil** | Abstract Art · Figurative Art · Contemporary · Expressionism · Minimalism · Street Art … | **aus dem Bild** — nicht aus der Selbstaussage |
| **Motiv** | Landscapes · Portrait · Still Life · Nude · Flora · Cityscapes … | aus dem Bild |
| **Preis** | Preisspanne | Frage, mit ehrlicher Rückgabe |

**Offen:** die genaue Stil- und Motivliste — kurz halten, erweitern, wenn ein Werk nicht passt.

### Das Kunst-Rezept — so fragt der Owner (Interview 10.09.2026, wird `lib/versusforge-kunst-rezept.ts`)

1. **Zuerst sehen, nicht beschreiben lassen:** „Kannst du mir zeigen, was du malst?"
2. **Die Kategorie weich nennen:** „Dein Stil erinnert an figurative Art." — „erinnert an", nicht „ist".
3. **Widerspricht er** („Nein, das ist abstrakt"): begründen („ich habe sehr viele Werke dieser Art
   verglichen" — das Modell von OpenAI kennt die Stile; ehrlich: mit bekannten Künstlern als
   Vergleich), den Nutzen nennen („in der richtigen Kategorie verkaufst du eher"), ihn entscheiden
   lassen („Willst du, oder bleibst du bei deiner Meinung?").
4. **Das Besondere — sein Bild ist das Beispiel:** sichtbare Merkmale aufzählen (viel Blau, gerade
   Striche, mutig, Sonne, Blumen, Kaktus, Schlafzimmer), das **Seltene** hervorheben, mit Grund
   („Kakteen im Schlafzimmer, die wie ein Phallus aussehen, gibt es nicht oft"), ihn wählen lassen
   („Wollen wir darauf eingehen oder eher auf etwas anderes?"). Heikle Deutungen sachlich, als
   Beobachtung, nie aufgedrängt.
5. **Der Stil — zugleich die Aufnahmeprüfung:** „Ist das dein Stil allgemein? Wenn ein Sammler es
   mag, fragt er: Hast du noch mehr davon?" · *Ja · Nein · Weiss nicht*
   - Ja → „Zeig mir noch welche."
   - Nein → „Für einen Künstler ist es wichtig, in seiner Galerie einen Stil zu behalten — das
     steigert seinen Wert. Willst du mir eher etwas aus deinem Stil zeigen?"
   - Weiss nicht → derselbe Satz, dann: „Zeig mir ein paar andere, wir suchen, was sie verbindet."
6. **Aufnahme: 3–4 Bilder im selben Stil** (Owner: „über eine Malerei bestimmen wäre fatal"). Das
   Motiv darf wechseln, der Stil nicht. Geprüft mit den Stil-Kategorien. **Wer das nicht hat,
   bekommt gar nichts** — keinen Plan, keine Galerie, kein Abo; nur den Satz, was ihm fehlt und
   dass er mit 3–4 Bildern wiederkommen kann. Deshalb kommt die Prüfung **früh**, bevor Token für
   einen Plan ausgegeben werden.
7. **Der Käufer:** Vorher weiss es niemand („wüsste ich es, hätte ich längst verkauft"). Das
   Bauchgefühl ist die erste Vermutung (hier: Frauen), geprüft mit kleinen Testanzeigen je Gruppe —
   die Anfragen entscheiden.
8. **Der Preis — gemessen an seinen eigenen Verkäufen**, nicht an erfundenen Marktzahlen:
   - „Wie viele Bilder hast du bis jetzt in dieser Preiskategorie verkauft?"
   - Noch keins → „Und wie hast du diesen Preis dann festgelegt? Ich weiss, das ist eine
     unangenehme Frage — aber genau hier scheitern die meisten."
   - Der Rat, **die Preisstufen:**

     | Stufe | Wer | Preis je Bild |
     |---|---|---|
     | 1 | unbekannte Künstler | 200–1.000 € |
     | 2 | Künstler, die schon bekannt sind | 1.000–2.000 € |
     | 3 | bekannte Künstler | ab 2.000 € |

   - „Wo stehst du?" — er ordnet sich selbst ein; der Preis bleibt seine Entscheidung.
   - Sagt er „ich bin schon bekannt", aber hat nichts verkauft → **die Fakten nebeneinander, ohne
     Urteil:** „Du bist bekannt, hast aber noch kein Kunstwerk verkauft. Wofür bist du bekannt?"
   - Nennt er Belege → **anerkennen, dann die eigentliche Frage:** „Du hast schon Erfahrung mit dem
     Kunstmarkt gesammelt. Warum denkst du, hast du noch kein Bild verkauft? Ich habe in deinen
     Bildern eine Stilrichtung erkannt, etwas Aussergewöhnliches — und trotzdem noch nichts
     verkauft." Die Antwort zeigt, woran es wirklich liegt.
   - **Offen:** welche Belege als „schon bekannt" gelten (Ausstellungen, Galerien, Presse, Follower?).
9. **Die Überleitung zum Angebot:** Egal, welchen Grund er nennt („mich kennt keiner", „ich weiss
   nicht, wie anbieten", „sie fragen, dann kommt nichts") — **„Dafür sind wir da: dir zu helfen,
   bekannt zu werden."**
10. **Zeigen, wie es geht — in dieser Reihenfolge:**
    1. „Wir zeigen dir jetzt **3 Beispiele**, wie du deine Kunst präsentieren kannst" — als Text:
       drei Hooks.
    2. Daraus macht er **eine Werbung** (die Hook-Kachel) und **postet** sie.
    3. **Der Beweis, dass es kein Märchen ist:** „Wir werben für unser Portal genauso — und so hast
       du uns gefunden."
    4. In der Werbung erwähnt er **seine Landingpage** — dort spricht **ein AI-Agent** seine
       Interessenten an, etwa: „Hallo, glaubst du, dass mein Blau an deine Wand passt?"
    - **Zu klären:** Der Käufer-Agent spricht in der Stimme des Künstlers („mein Blau"). Der Käufer
      muss trotzdem wissen, dass er mit einem Agenten spricht — der Aufruf „Vorbește cu agentul
      meu" sagt es schon; auf der Seite muss es ebenso stehen (Pflicht bei Chatbots in der EU).
11. **Das Geld — erst, wenn es wirkt:** „Diese Seite kostet dich nichts. Du zahlst, wenn unser Agent
    für dich arbeitet und du ihn behalten willst." (Owner 10.09.2026)
    - **Der Auslöser: Kunden, die dem Agenten antworten** (Owner 10.09.2026: „wenn ein Kunde schon
      eine Antwort schreibt — Ja!" · „oder 3 Kunden — es kann sein, dass er das selber testet").
      Nicht erst die Telefonnummer: Wer zurückschreibt, zeigt, dass der Agent arbeitet. **Drei
      verschiedene Interessenten**, weil der Künstler seinen Agenten erst selbst ausprobiert — dann:
      „Drei Interessenten haben deinem Agenten geantwortet. Willst du ihn für 10 € im Monat behalten?"
    - **Seine eigenen Tests zählen nicht:** Gespräche vom Gerät, mit dem er sein Dashboard öffnet,
      werden nicht mitgezählt (die Geräte-Kennung wird heute schon protokolliert).
    - **Der Agent spricht weiter, bis er die Kontaktdaten hat — E-Mail oder Telefonnummer**
      (Owner 10.09.2026). Kein Interessent wird mitten im Gespräch abgeschnitten.
    - **Dann bedankt er sich und schliesst ab** (Owner 10.09.2026): „Danke! Ich habe dein Interesse
      an den Künstler weitergegeben — er meldet sich bei dir."
    - **Daraus folgt: Der Künstler bekommt die Kontakte immer**, auch vor dem Bezahlen — sonst
      wäre das Versprechen „er meldet sich" gelogen. Bezahlt wird, damit der Agent weiterarbeitet.
    - **Gratis heisst trotzdem Kosten für uns:** Jedes Käufer-Gespräch auf einer Gratis-Seite kostet
      Token. Deshalb ein **Deckel** je Gratis-Seite, gemessen in der Kostenkontrolle (Teil 5).

**Warum Ablehnen sein muss (Owner):** Posten hier Amateure, ruinieren wir den Ruf der Galerie.

---

## 3 · MEMORY — was er sich merkt

| Heute | Art |
|---|---|
| Nur das laufende Gespräch (letzte 20 Nachrichten). Nach dem Abschluss: Plan und Hebel beim Mandanten. | **Künstlerprofil** über Gespräche hinweg: Werke, Bilder, Kategorie, Preise, Käufer. |

---

## 4 · HÄNDE — was er tun kann

| Heute (Werkzeuge im Agenten) | Art |
|---|---|
| `website_lesen` · `hook_pruefen` · `motiv_erzeugen` (kostet, nur nach Ja) · `bild_bauen` · `abschluss_schicken` · `rueckruf_erbitten` | + `bild_ansehen` (nur nach Ja und mit Blickwinkel) · `website_lesen` erst nach Ja · Kategorie bestimmen |

---

## 5 · KONTROLLE — damit kein Blödsinn rausgeht

| Heute | Art |
|---|---|
| Freigaben vor allem, was Geld kostet · Protokoll jedes Zugs · Prüfskript mit 5 Fällen · im Code: dieselbe Frage zweimal und Rezeptwörter werden neu geschrieben (10.09.) | Hook-Prüfer mit zweitem Blick (`lib/versusforge-hook-pruefer.ts`, gebaut, **nicht eingebunden**) · Prüffälle für Künstler: falsche Selbsteinordnung, zu hoher Preis, nur Bild ohne Text |

### Kostenkontrolle je Künstler — damit „einer trägt den anderen" messbar ist

Heute protokolliert `lib/versusforge-lauf.ts` jeden Zug mit Token und Euro (`/engine/gespraeche`).
Für die Abo-Rechnung fehlen zwei Dinge (geprüft 10.09.2026):

1. **Welcher Künstler?** Ein Zug kennt nur Gespräch und Gerät, keinen Künstler. Nötig: die
   Künstler-Kennung in jedem Zug — beim Künstler-Agenten und beim Käufer-Agenten.
2. **Bildkosten.** Gezählt werden nur Text-Token. `MOTIV_CENTS` (15 ct) steht in
   `lib/versusforge-motiv.ts`, wird aber nirgends ins Protokoll geschrieben; die Anzeige mit Text im
   Bild (`quality: high`) ebenso wenig.

**Daraus die Monatsübersicht:** je Künstler Einnahme (10 €) gegen Kosten (Gespräche + Bilder) —
und in Summe, ob die Abos die Portal-Werbung tragen.

### Moderation — Kunst ja, Pornografie nein (entschieden 10.09.2026)

Owner: „Wir müssen schauen, dass OpenAI Kunst nicht sperrt. Und auch sperrt. Ich will natürlich
nicht, dass Leute hier Pornobilder hochladen. Ich werde sie freigeben müssen." · „markierte"

**Getestet am 10.09.2026** (OpenAI `omni-moderation-latest` + unser Bild-Ansehen, nichts gespeichert):

| Werk | Moderation | Ansehen |
|---|---|---|
| Modigliani, Nu couché (Malerei) | nicht markiert · sexual 0,10 | ✓ Figurative Art · Nude |
| Tizian, Venus von Urbino (Malerei) | nicht markiert · sexual 0,24 | ✓ Figurative Art · Nude |
| Manet, Olympia (Malerei) | nicht markiert · sexual 0,24 | ✓ Figurative Art · Nude |
| Araki, Vintage Nude Polaroid (Fotografie, auf Artsy verkauft) | **markiert** · sexual 0,97 | ✓ Photography · Nude |

**Ergebnis:** OpenAI sperrt Kunst beim Ansehen nicht — auch Aktfotografie wird eingeordnet. Die
Moderation trennt deutlich: gemalte Akte gehen durch, Aktfotografie wird markiert.

**Die Regel:**
- **Nicht markiert** → geht durch, wird eingeordnet, bekommt seinen Hook.
- **Markiert** → geht NICHT online, sondern **zum Owner zur Freigabe**. Nur die markierten, nicht
  alle Werke. Der Owner entscheidet, ob es Kunst ist — so wie Artsy es bei Araki entschieden hat.
- **Jeder Verdacht auf Minderjährige** → sofort abgelehnt, nie gespeichert, ohne Ausnahme.
- Gilt für jedes Bild: im Chat, im Dashboard-Upload, in Galerie und Portal.

**Grenze der Moderation — geprüft am 10.09.2026:** OpenAI wendet die Kategorie „sexual/minors" bei
BILDERN nicht an, nur bei Text (`category_applied_input_types` in der Antwort). Ein solches Bild
käme nur als „sexual" markiert zurück und landete beim Owner. **Deshalb eine zweite Prüfung bei
jedem als „sexual" markierten Bild:** Das Bildmodell beantwortet genau eine Frage — wirkt eine
abgebildete Person minderjährig? Alles ausser einem klaren „nein" (auch „unsicher", auch keine
Antwort) → **verboten: nicht gespeichert, nicht an den Owner weitergeleitet**, im Protokoll nur
Zeitpunkt und Künstler. **Das ist eine Einschätzung, keine Gewissheit.**
**Entschieden 10.09.2026: zum Start KEINE Aktfotografie (Variante B).** Getestet mit dem
Araki-Aktfoto: Die Altersfrage antwortet beim selben Bild mal „nein", mal „unsicher" — bei
niedriger wie bei hoher Auflösung; etwa jedes zweite erwachsene Aktfoto wäre ein Münzwurf.
Deshalb: **Akte nur als Malerei oder Zeichnung.** Ein als „sexual" markiertes FOTO wird nicht
angenommen (nicht gespeichert, nicht weitergeleitet); markierte Malerei/Zeichnung durchläuft die
strenge Altersfrage und geht bei klarem „nein" zum Owner. Gemalte Akte werden in der Regel gar
nicht markiert. Später öffnen — mit anwaltlicher Beratung. Verworfen: streng für alles (A, erst
gewählt, dann geändert), Mehrheitsentscheid (C, mehr Risiko).

**Vor dem öffentlichen Start:** rechtlich klären lassen (Anwalt), welche Pflichten gelten, falls
solches Material hochgeladen wird — etwa Melde- und Aufbewahrungspflichten.

**Gebaut am 10.09.2026:** `lib/versusforge-moderation.ts` (Prüfung) · Upload im Dashboard
(`app/api/versusforge-bild/route.ts`: verboten → nicht gespeichert, markiert → Prüfablage
`versusforge-motiv-pruefung/` + Mail) · Chat (`app/api/versusforge-agent/route.ts`: verboten →
nicht angesehen) · Prüf-Mail ohne Bild (`lib/versusforge-pruefung-post.ts`) · Prüfseite mit Bild
und Freigeben/Ablehnen (`app/api/versusforge-freigabe/route.ts`, `typ=motiv`).

### Mails an den Owner (entschieden 10.09.2026: „Für beides soll ich eine E-Mail bekommen")

1. **Ein Künstler legt sich an** → Mail an den Owner: Name, Mail, Stil, Link zu seiner Seite und
   zu `/engine/anfragen`.
2. **Ein Werk wird markiert** → Mail an den Owner mit dem Werk und zwei Knöpfen: **Freigeben ·
   Ablehnen**. Bis dahin bleibt es offline.

**Heute im Code (geprüft 10.09.):** Beim Anlegen geht die Mail NUR an den Künstler
(`linksPerPost`); der Owner bekommt nur einen Eintrag in `/engine/anfragen`. Die einzige Mail an
den Owner ist der Rückruf-Alarm (`lib/versusforge-beratung-post.ts` → `VERSUSFORGE_ALARM_MAIL`).
Beide neuen Mails gehen an dieselbe Adresse.

---

## 6 · AUSGABE — was herauskommt

| Heute | Art |
|---|---|
| Antworten mit Chips · ein Hook · Anzeigenbild (Schrift auf Weiss oder mit Foto) · Trichterseite · Dashboard · Mail | Marketingplan · **Kategorie** · Text / Hook **je Werk** · Anzeige mit dem echten Werk und Text im Bild (`lib/versusforge-anzeige*.ts`, gebaut, **nicht eingebunden**) · ehrliche Preis-Einschätzung |

### Das Dashboard des Künstlers — dort geht es weiter (Owner 10.09.2026)

„Was ist, wenn der Künstler weiter Bilder anhängen will?" → „Auf seinem Dashboard kann er." ·
„Dort kann er weitere generieren."

- **Der Chat bleibt kurz:** 3–4 Bilder zur Aufnahme (heute: bis 4 je Nachricht, die letzten 12
  Befunde, kein Bild wird gespeichert). Will er mehr zeigen: „Weitere Werke und Hooks machst du
  in deinem Dashboard."
- **Im Dashboard „Meine Werke":** beliebig viele Werke hochladen und speichern, je Werk Titel,
  Grösse, Seltenheit, Preis — jedes Werk durch die Moderation (Teil 5).
- **Weitere Hooks generieren und Bild bauen:** gibt es schon („Neuen Hook schreiben lassen",
  „Bild bauen" in `components/MandantHooks.tsx`, Upload je Hook nach `versusforge-motiv/`).
  **Aber:** `app/api/versusforge-hook-neu/route.ts` benutzt noch das alte Hebel-Rezept und sieht
  das Werk nicht an — umstellen auf Kunst-Rezept und `bildAnsehen`.

---

## 7 · BERATUNG — nur auf Wunsch

Viele malen und wissen nicht, was sich verkauft. Manche wollen das bewusst **nicht** wissen.

1. **Erst fragen:** „Willst du wissen, was gerade gefragt ist — oder malst du, was du malen willst?"
2. **Bei Ja:** was gefragt ist (Motive, Formate, Farben, Preisklassen) und für wen.
3. **Nie erfunden.** Was „angesagt" ist, kommt aus dem Wissen des Owners oder aus echten
   Marktdaten — sonst berät er mit Unsinn.

---

## 8 · DER KÄUFER-AGENT — wo wirklich verkauft wird

**Die Marketingregel (Owner 10.09.2026):** Finde den Käufer, der schätzt, was du hast.

**Was heute passiert:** Auf Instagram fragt jemand „Was kostet das?". Der Künstler weiss nicht,
was er verlangen kann, antwortet einmal — und dann kommt nichts mehr. Der Verkauf stirbt nach
der Anzeige, nicht in ihr.

**Zwei Agenten:**

| | Künstler-Agent (gibt es) | Käufer-Agent (neu) |
|---|---|---|
| spricht mit | dem Künstler | dem Interessenten |
| Ziel | Kategorie, Text, Preis, Anzeige | aus „Was kostet das?" eine echte Anfrage machen |
| wo | `/engine` | in seiner Galerie, zu jedem Bild |

**Der Weg:**
1. **Im Bild** steht der Aufruf mit Adresse:
   > **Te interesează arta mea? Vorbește cu agentul meu.** · lakatosbandi.com
2. Die Adresse führt in seine **Galerie**. Der Käufer schaut ein Bild an und fragt.
3. **Der Agent zu diesem Bild antwortet:** was es besonders macht, Masse, Preis, für wen es passt.
4. Er bleibt im Gespräch, nimmt Name und Kontakt auf — der Künstler bekommt die Anfrage.

**Regeln:**
- **Den Preis erfindet er nie.** Der Künstler legt ihn fest — mit Hilfe des Künstler-Agenten
  (Checkliste Punkt 5). So hängen beide zusammen.
- **Preis: fest, verhandelbar — „preț fix, negociabil"** (Owner 10.09.2026). Der Agent nennt den
  Preis und sagt, dass er verhandelbar ist. **Er sagt nie selbst Ja zu einem niedrigeren Preis.**
- **Angebote nur einsammeln, der Rest am Telefon** (Owner 10.09.2026). Der Agent nimmt das Angebot
  auf und bittet um die **Telefonnummer** — der Künstler ruft zurück und bespricht Preis, Versand,
  Übergabe. **Eine E-Mail-Adresse gilt auch** (Owner 10.09.2026: „E-Mail oder Telefonnummer");
  die Nummer bleibt erste Wahl, weil ein Anruf eher zum Abschluss führt als eine Mail.
- **Bausteine dafür gibt es schon:** `rueckruf_erbitten` im Agenten (Nummer → WhatsApp-Hinweis +
  Mail + Anfrage im Dashboard). Für den Käufer-Agenten geht der Hinweis an den **Künstler**, nicht
  an den Owner. Noch nicht gesetzt: `CALLMEBOT_PHONE` / `CALLMEBOT_APIKEY` — sonst klingelt nichts.
- **Adresse: `lakatosbandi.com` ist das Portal** — eine Marketing-Plattform für Künstler (Owner
  10.09.2026: „Was ist die Eigenschaft von lakatosbandi.com als Portal? Es ist eine
  Marketing-Plattform für Künstler."). Domain vorhanden, DNS am 10.09. auf Vercel umgestellt
  (A `@` → 76.76.21.21). Ersetzt `versusforge.com/szidoniabandi`. Die Galerien der Künstler liegen
  darunter. Technisch fehlt noch die Host-Regel in `next.config.mjs` wie für `versusforge.com`.
- **Text im Bild ist auf Instagram nicht anklickbar.** In einer bezahlten Anzeige klickt der Knopf
  darunter; im normalen Beitrag tippt man die Adresse ab oder geht über den Link in der Bio.
  Deshalb muss sie kurz und lesbar sein.
- **Antworten direkt in Instagram-Kommentaren und -Nachrichten** gehen nur über Metas
  Schnittstelle mit Freigabe → später. Zuerst die Galerie.

**Einnahmen:** Der Käufer-Agent arbeitet jeden Tag und bringt messbare Anfragen — dafür zahlt ein
Künstler eher monatlich als für eine einzelne Anzeige.

**Vorbild: die Werkseite auf Artsy** (angesehen 10.09.2026)
- **Angaben:** Material · Grösse · Seltenheit · Signatur · Echtheitszertifikat · Rahmen · Serie.
- **Drei Knöpfe:** *Purchase · Make an Offer · Contact Gallery.* „Make an Offer" ist unser
  „preț fix, negociabil"; an die Stelle von „Contact Gallery" tritt der Käufer-Agent.
- **„Purchase" gibt es bei uns nicht — eine Kaufabwicklung findet hier nicht statt** (Owner
  10.09.2026). Wir bringen Käufer und Künstler zusammen; Preis, Bezahlung, Versand und Übergabe
  klären die beiden direkt. Also: keine Kasse für Kunstwerke, kein Anteil am Verkauf — wir
  verdienen am Abo.
- **„View in room":** das Werk an einer Wand — passt zu „wo hängt es später".

**Erste echte Fälle:** der Owner und Szidonia Bandi — ihre gemeinsame Galerie `lakatosbandi.com`.

---

## 9 · DAS PORTAL — seine Kunst bekannt machen

**Owner 10.09.2026:** Es reicht nicht, dass der Künstler einen Agenten hat. Wir helfen ihm auch,
seine Kunst **bekannt** zu machen — mit einem Portal, für das wir aus den Abos werben.

- **Ein Ort für alle Künstler im Abo:** Besucher stöbern durch die Werke, jedes Werk führt in die
  Galerie seines Künstlers und zu dessen Käufer-Agenten.
- **Wir werben für das Portal**, nicht jeder Künstler einzeln — aus dem Abo-Topf (100 × 10 € =
  1.000 € im Monat). Jeder Künstler profitiert von der Werbung für alle.
- **Eine eigene Seite mit eigener Adresse: `lakatosbandi.com`** — eine Marketing-Plattform für
  Künstler (Owner 10.09.2026). VersusForge ist das Werkzeug dahinter; die Plattform ist der Ort
  für Künstler und Käufer.
- **Aus der VersusForge-Engine wird genau diese Plattform** (Owner 10.09.2026: „Genau das wird
  aus VersusForge Engine. Das ist auch das Topic. Klickt man auf das Topic, öffnet sich die
  Plattform."). Die Karte „VersusForge · Marketing Engine" in `app/themes/page.tsx` führt dann
  auf die Plattform statt auf `/engine`.
- **Sprachen: Englisch zuerst, dann Rumänisch, dann Deutsch** (Owner 10.09.2026: „Alles muss mit
  Englisch anfangen"). Englisch ist die Standardsprache der Plattform; Umschalter EN · RO · DE.
- **Entwurf:** Startseite, Werkseite, Künstlerseite —
  https://claude.ai/code/artifact/cad1d838-695c-434c-9047-728c599c4647

**Gebaut 10.09.2026 — das Portal im Code** (nicht committet, nicht deployt; Owner: „die kommen
doch unter lakatosbandi.com/{artistname} und einen Login müssen sie auch haben fürs Dashboard" ·
„nur auf lakatosbandi"):
- **Adressen** (Rewrites in `next.config.mjs`, nur für den Host lakatosbandi.com):
  `/` → Startseite · `/login` → Login · `/{name}` → Künstlerseite · `/{name}/kontakt` → das
  Gespräch mit Name und Telefon (heutiger Trichter) · `/{name}/dashboard` → sein Dashboard.
  Lokal unter `/portal`, `/portal/login`, `/portal/{name}`. Adressen an einer Stelle:
  `lib/lakatosbandi-adressen.ts`.
- **Startseite** `app/portal/page.tsx`: weiß, Hook-Kacheln (Werk ganz, Satz darunter, Künstler).
  Nur wer **freigegeben** ist UND **„Ja, ins Portal"** gesagt hat (`portal: true`).
- **Künstlerseite** `app/portal/[kuenstler]/page.tsx`: alle Werke mit Hooks, Knopf „Interested in my
  art? Talk to my agent." (`?h=` aus der Anzeige wandert mit). Sichtbar nach der Freigabe, auch
  ohne Portal-Ja; wartend → Prüfsatz; abgelehnt → 404. Werkbild ohne Text: `api/portal-werk`
  (nur freigegebene, nie aus der Prüfablage).
- **Login** `app/portal/login` + `api/portal-login`: E-Mail → Mail mit Link zum Dashboard, ohne
  Passwort; Antwort verrät nicht, ob es das Konto gibt; 1 Mail/Minute je Adresse.
- **Nur auf lakatosbandi.com:** Künstler-Links auf versusforge.com (Trichter, Dashboard) leiten um.
  Mails, Freigabe-Seite, Dashboard-Links und Chat nennen lakatosbandi.com. Ältere Mandanten ohne
  `freigabe` (Zahnarzt usw.) bleiben auf versusforge.com.
- **Chat:** Gruß nennt lakatosbandi.com; Zustimmungsfrage „auf lakatosbandi.com zeigen?"; die
  Antwort wird beim Abschluss als `portal` gespeichert.
- **Texte EN · RO · DE** fest in `lib/lakatosbandi-texte.ts`.
- **Offen:** Domain in Vercel hinzufügen (Owner) · Käufer-Agent statt Trichter hinter „Talk to my
  agent" · Werkseite (Klick auf eine Kachel) · Filter Medium/Stil/Preis · Sprach-Adressen fürs
  Portal (heute `?lang=`) · Impressum/Datenschutz des Künstlers für das Kontaktgespräch.
- **MUSS NOCH GEMACHT WERDEN — die Fragen an den Käufer sind falsch** (Owner 10.09.2026, mit Bild
  von `/{name}/kontakt`: „hier stehen blöde Fragen eigentlich. Als würde der Künstler es von ihm
  personalisieren lassen. Schreib nur auf, dass wir das noch machen müssen."). Das Gespräch
  hinter „Talk to my agent" ist noch der alte Dienstleister-Trichter: Karten „I want an original /
  I furnish my living room / I collect prints", danach Größe, Ausrichtung, Wand oder Regal — wie
  bei einer Auftragsarbeit. Ein Käufer sieht aber ein FERTIGES Werk. Richtig ist der Käufer-Agent
  aus Teil 8 (`KAEUFER_REGELN`): über dieses Werk sprechen, Preis „fix / verhandelbar", Kontakt
  einsammeln, „ich gebe es an den Künstler weiter". Bis dahin nicht bewerben.
- **Das Portal braucht etwas, solange noch kaum Künstler drin sind** (Owner 10.09.2026: „wir
  müssen uns mit dem Portal noch was einfallen lassen, bis einige Künstler da sind").
  **Gebaut 10.09.2026:** Keine Demo-Künstler. Unter 6 sichtbaren Künstlern zeigt die Startseite
  „Die Marketing-Plattform für Künstler — bald online" mit „Als Gründungskünstler bewerben"
  (`components/PortalBald.tsx`, Texte `lib/lakatosbandi-bald-texte.ts`): Stein-Folien, Beispiel
  Sternennacht (gemeinfrei), Warum, Was du bekommst, Marketing-Prinzipien, Was uns anders macht,
  Ablauf, Wie wir Künstler finden, Auswahl, Kosten, Gründungskünstler, VersusForge, Wer wir sind
  (Foto, Geza Lakatos — Dipl.-Designer & AI Consultant, Szidonia Bandi — Künstlerin, Rumänien),
  Fragen. Ab 6 Künstlern von selbst die normale Übersicht.
- **Agent auf der Seite** (`components/PortalAgent.tsx`): der Künstler-Agent im Fenster —
  Desktop sofort offen, Handy Sprechblase; zugeklappt bleibt er im Tab zu.
- **Fuß:** Kontakt · Impressum · Datenschutz · AGB (Haus-Seiten). Kontaktformular von
  lakatosbandi.com/versusforge.com geht an service@versusforge.com. **Offen:** Rechtstexte um
  lakatosbandi.com, Agenten und Abo ergänzen und prüfen lassen.
- **Journal** `/journal/<en|ro|de>/<slug>` (`lib/lakatosbandi-journal.ts`): 5 Artikel — Stein
  1975 · Preis · Kategorie · „Neues Bild verfügbar" · den richtigen Käufer finden. hreflang,
  schema.org Article, Sitemap.
- **Social (nicht im Repo, als Paket an den Owner):** Stein-Karussell 5 Folien × EN/RO/DE,
  Texte für Facebook-Seite, Instagram-Bio und ersten Post. Seiten legt der Owner an.

**Der Stil: wie artsy.net** (Owner 10.09.2026: „genau diesen Stil von Webseite will ich haben")
- Weiss, schwarze Schrift, viel Luft, keine Farbe ausser den Werken selbst.
- **Nicht Bilder, sondern Hooks** (Owner 10.09.2026): Anders als jedes Portal zeigt die Übersicht
  jedes Werk als **Hook-Kachel** — das Werk oben, sein Satz darunter, dann Künstler · Titel, Jahr ·
  Preis. Der Käufer sieht nicht nur das Bild, sondern warum es besonders ist (das Stein-Rezept).
- **Die Kachel gibt es schon — zwei Layouts** in `lib/versusforge-bild.ts`, das Bild entscheidet:
  · **Querformat:** das Werk als Band oben über die ganze Breite, der Hook darunter.
  · **Hochformat:** das Werk bündig oben rechts, **ganz und unbeschnitten**, der Hook darunter —
    die „Van-Gogh-Kachel" (Dashboard Atelier Insula, 09.09.).
  Der Satz liegt nie auf dem Werk.
- **Im Portal als Webseite gebaut, nicht als JPG:** dasselbe Layout, aber scharfe Schrift auf jedem
  Bildschirm und die Sprache wechselbar. Das JPG bleibt für Instagram.
- **Klick auf die Kachel → Werkseite:** das Werk ohne Text, daneben Angaben, Hook und Agent.
- **Folge:** Der Hook ist das Schaufenster. Ohne Hook-Prüfer (Teil 5) geht keine Kachel online.

**Wie der Künstler ins Portal kommt** (Owner 10.09.2026: „Wie landet der Künstler jetzt in unserem
Portal?" · „Er muss auch seine Zustimmung abgeben." · „Sofort kommt er rein.")
1. Anzeige → Künstler-Agent → **Aufnahme** (3–4 Bilder im selben Stil)
2. 3 Hooks → seine **Galerie mit Käufer-Agent** (gratis)
3. **Die Zustimmung:** „Dürfen wir deine Werke auch im Portal zeigen? Dort sehen Käufer sie neben
   anderen ausgewählten Künstlern, und dein Agent spricht mit ihnen." · *Ja, ins Portal · Nein, nur
   meine Galerie* — ohne dieses Ja erscheint nichts im Portal.
4. ~~Bei Ja sofort im Portal~~ → **nach Freigabe durch den Owner, Ziel: innerhalb von 3 Tagen**
   (entschieden 10.09.2026, Variante B — nach dem Vorbild Artsy, das Ausweis verlangt und nach
   3 Tagen freigibt). Kein Ausweis. Der Owner bekommt die Anmelde-Mail (Teil 5) und gibt frei;
   bis dahin ist die Galerie da, aber nicht öffentlich. Nicht erst mit dem Abo — die Hürde ist
   Aufnahme und Freigabe, nicht das Geld. **Ausweisprüfung** (z. B. Stripe Identity) erst
   später, falls fremde oder gestohlene Kunst zum Problem wird.
5. Käufer finden ihn über seine Anzeige **oder** das Portal → Käufer-Agent → 3 Interessenten → Abo.

**Aufbau des Portals (Entwurf):** Startseite mit Filtern *Medium · Stil · Motiv · Preis ·
Seltenheit* · Raster aus Hook-Kacheln · Künstlerseite mit all seinen Werken · Werkseite mit dem
Werk ohne Text, Angaben, Hook und „Rede mit meinem Agenten".
- Filter oben: Seltenheit · Medium · Preisspanne (dieselben Gruppen wie in Teil 2).
- Werkseite: grosses Bild, daneben die Angaben und die Knöpfe (Teil 8).
- **Wir übernehmen den Stil, nicht die Marke:** kein Artsy-Logo, keine Artsy-Texte, keine Bilder
  von Artsy.
- Gilt auch für die Galerie des Künstlers unter `versusforge.com/<name>` — nicht nur fürs Portal.

---

## 10 · KÜNSTLER GEWINNEN — Meta, Video, YouTube, Google, SEO

**Owner 10.09.2026:** Die Künstler finden wir über Werbung: Meta (Facebook, Instagram),
Videowerbung, YouTube und Google — und über SEO.

### Vorher muss stehen (Owner 10.09.2026: „dafür muss die Adresse stehen … und FB-Seite und Insta-Seite")

| # | Was | Warum zuerst |
|---|---|---|
| 1 | **Name und Adresse des Portals** — ✓ `lakatosbandi.com` (10.09.) | SEO baut auf der Adresse auf. Wer später umzieht, fängt bei Google fast von vorn an. Auch jede Anzeige und jede Kachel trägt die Adresse. |
| 2 | **Facebook-Seite** des Portals | Ohne Seite keine Meta-Anzeige — die Anzeige läuft immer im Namen einer Seite. |
| 3 | **Instagram-Konto** des Portals | Dort landen die Kommentare „Was kostet das?"; mit der Facebook-Seite verbunden. |
| 4 | **Werbekonten:** Meta, Google Ads, YouTube-Kanal | Für die bezahlten Kanäle. |

**Bauen geht vorher schon** (Teil 9) — aber **werben erst, wenn 1 bis 3 stehen.**

**Die Adresse wird nicht schnell gekauft** (Owner 10.09.2026: „ich will nicht wieder auf die
Schnelle eine Webadresse kaufen"). Sie wird in Ruhe gewählt, während gebaut wird. Prüfliste:
- kurz, und in Rumänisch, Deutsch und Englisch gleich leicht zu sprechen und zu schreiben
- sagt, dass es um Kunst geht („art" im Namen?)
- `.com` frei — und **derselbe Name frei auf Facebook und Instagram**
- keine fremde Marke im Namen oder zum Verwechseln ähnlich
- ein paar Tage liegen lassen und laut sagen, bevor gekauft wird

**Die Kanäle tun Verschiedenes:**

| Kanal | Wen er erreicht | Form |
|---|---|---|
| **Google-Suche** | wer **schon sucht**: „cum să-mi vând arta", „wie verkaufe ich meine Bilder" — die heisseste Absicht | Textanzeige |
| **Meta** (Facebook, Instagram) | wer sich für Kunst interessiert, aber nicht sucht | Hook-Kachel, kurzes Video |
| **YouTube** | wer Mal-Videos und Kunst-Tutorials schaut | Video vor dem Video |
| **Video allgemein** | zeigt in Sekunden, was ein Bild nicht kann: vom Werk zum Hook zur Anfrage | kurzer Spot |
| **SEO** (Owner 10.09.2026) | wer bei Google nach Kunst oder einem Künstler sucht — **ohne Werbekosten**, aber langsam | die Seiten selbst |

**SEO — das Portal wird selbst gefunden:**
- **Jedes Werk, jeder Künstler, jede Kategorie ist eine eigene Seite** mit echtem Text: Hook,
  Titel, Material, Medium, Stil, Motiv, Künstlername. Genau so wird Artsy gefunden.
- **Kategorieseiten** wie „Abstrakte Malerei aus Rumänien" oder „Landschaften, Unikate unter 500 €"
  — aus denselben Gruppen wie in Teil 2.
- **Deshalb die Kachel als Webseite, nicht als JPG** (Teil 9): Text in einem Bild findet Google nicht.
- **In der Sprache der Käufer:** Rumänisch, Deutsch, Englisch — jede Sprache ihre eigene Seite.
- **Wirkt für beide Seiten:** Käufer finden Werke, Künstler finden das Portal.

**Messen je Kanal:** Werbekosten je zahlendem Künstler — getrennt für Google, Meta und YouTube;
bei SEO die Besucher und Anfragen aus der Suche.
Der teuerste Kanal wird zurückgefahren, der billigste bekommt mehr Budget.

**Offen:** Wer macht die Videos — erzeugt, selbst gedreht, oder aus den Werken des Künstlers
zusammengeschnitten? Mit welchem Kanal starten wir?

**Der Weg:**
1. **Anzeige** mit dem Einstieg: *„Vrei să-ți vinzi arta și nu știi cum? Vrei să știi ce se cere pe
   piață?"*
2. **Klick → der Künstler-Agent** (`/engine`): câteva întrebări, sein Marketingplan gratis.
3. **Abo 10 € im Monat** → seine Landingpage mit Galerie, Profil, Kontakt, Käufer-Agent, Hooks.

**Was dabei zu beachten ist:**
- **Wir werben mit unserem eigenen Werkzeug.** Die Anzeige für Künstler ist selbst eine
  Hook-Kachel — der beste Beweis, dass es funktioniert. Erste Kachel: ein Werk von Szidonia Bandi.
- **Meta kennt keine Berufe genau,** nur Interessen (Malerei, Kunst, …). Die Anzeige selbst muss
  filtern: Wer „Vrei să-ți vinzi arta?" liest und keine Kunst verkauft, klickt nicht.
- **Die eine Zahl, die zählt: Werbekosten je zahlendem Künstler.** Kostet ein Abo-Kunde mehr als
  wenige Monatsbeiträge, trägt es sich nicht. Gemessen in der Kostenkontrolle (Teil 5) — neben
  den Agenten-Kosten.
- **Klein anfangen:** ein kleines Tagesbudget, ein Markt (Rumänien?), messen, dann erst mehr.
- **Heute:** Die Anzeige bei Facebook „wartet auf Freigabe" (ROADMAP-VERSUSFORGE.md, Station 0);
  die Kasse ist gebaut, aber ausgeschaltet.

---

## 11 · DIE DATENBANK — das Wertvollste, was entsteht

**Owner 10.09.2026:** „Für uns ist das eine Mega-Chance, jetzt eine Datenbank aufzubauen."

**Was jedes Gespräch hinterlässt:**
- **Werke:** Bild, Medium, Stil, Motiv, Seltenheit, Grösse
- **Preise:** was Künstler verlangen, in welcher Stufe sie sich sehen
- **Käufer:** welcher Hook Anfragen bringt, welche Gruppe antwortet, welche Angebote kommen
- **Verkäufe:** was wirklich verkauft wurde — und zu welchem Preis

**Was sie löst:**
1. **Echte Verkaufspreise** — die offene Frage aus Teil 2 („woher echte Verkaufspreise kommen").
2. **„Was gefragt ist"** für die Beratung (Teil 7) — aus eigenen Daten statt erfunden.
3. **„Ich habe sehr viele Werke verglichen"** — der Satz des Agenten wird wörtlich wahr.

**Was dafür nötig ist:**
- **Verkäufe erfahren wir nicht von selbst** — hier wird nichts gekauft. Der Agent fragt den
  Künstler nach jeder weitergegebenen Anfrage: „Hast du verkauft? Zu welchem Preis?"
- **Zustimmung des Künstlers**, dass Werke und Angaben gespeichert und ausgewertet werden (zusammen
  mit der Portal-Zustimmung, Teil 9).
- **Käuferdaten getrennt:** Telefon und E-Mail nur für den Künstler; in Auswertungen nur anonym.
- **Heute ist es keine Datenbank:** Mandanten, Anfragen und Protokolle liegen als einzelne
  JSON-Dateien im Supabase-Speicher (`versusforge-mandant/`, `versusforge-lead/`,
  `versusforge-lauf/`). Für Suche, Filter und Auswertung braucht es Tabellen.

---

## OFFEN — entscheidet der Owner

1. ~~Die Kategorienliste~~ → **nach Artsy**: Medium · Seltenheit · Stil · Motiv · Preis (entschieden
   10.09., Teil 2). Noch offen: die genaue Stil- und Motivliste.
2. ~~Preisrahmen~~ → **bestimmt nur der Künstler**; der Agent vergleicht nur mit tatsächlich
   erzielten Preisen ähnlicher Kunst (entschieden 10.09.). Noch offen: **woher echte
   Verkaufspreise** kommen.
3. **Einnahmen** — wofür zahlt der Künstler? (Käufer-Agent monatlich?)
4. **Woher kommt „was gefragt ist"** — Wissen des Owners, welche Daten?
5. **Markt** — Rumänien zuerst? Deutschland?
6. Bleibt der allgemeine Agent für andere Branchen bestehen?
7. ~~Käufer-Agent: Was darf er zum Preis sagen?~~ → **preț fix, negociabil**; Angebote nur
   einsammeln, Telefonnummer aufnehmen, der Künstler ruft zurück (entschieden 10.09.).
8. ~~Portal: Name und Adresse~~ → **`lakatosbandi.com`, Marketing-Plattform für Künstler**, Sprachen
   EN → RO → DE (entschieden 10.09.). Noch offen: Host-Regel in `next.config.mjs`, Facebook-Seite
   und Instagram-Konto.
9. ~~Abo: Was ist für 10 € drin?~~ → **seine Landingpage: Galerie · Profil · Kontakt · Agent ·
   Dashboard mit Hooks** (entschieden 10.09.). Noch offen: was extra kostet (Anzeige mit Motiv,
   Beratung?).

## REIHENFOLGE — Vorschlag

1. **Wissen:** Checkliste und Kategorien mit dem Owner festlegen → Kunst-Rezept.
2. **Augen:** Bild/URL erst fragen, dann Blickwinkel, dann ansehen.
3. **Gehirn:** Kategorie aus dem Bild bestimmen · Preis-Rückgabe.
4. **Ausgabe:** Plan + Text je Werk + Anzeige mit Werk und Aufruf „Vorbește cu agentul meu"
   (Hook-Prüfer und Anzeige einbinden).
5. **Plattform `lakatosbandi.com`** (EN → RO → DE): Galerie + Käufer-Agent, erste Künstler der
   Owner und Szidonia Bandi; das VersusForge-Topic öffnet die Plattform.
6. **Test** mit der Kunst von Szidonia Bandi und des Owners.
7. **Adresse, Facebook-Seite, Instagram-Konto** des Portals (Teil 10, „Vorher muss stehen").
8. **Einnahmen:** Abo 10 € im Monat einschalten.
9. **Werben:** klein, ein Kanal, messen (Teil 10) — dann die anderen Kanäle; SEO läuft ab der
   Adresse mit.
10. **Portal** füllen — Werbung aus dem Abo-Topf, sobald genug Künstler drin sind.
11. **Memory:** Künstlerprofil.
12. **Beratung.**

**Bauen (1–6) geht ohne Adresse. Werben (9) erst, wenn 7 steht.**
