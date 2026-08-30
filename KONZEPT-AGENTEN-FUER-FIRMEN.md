# Agenten für Firmen — LB baut Funnels mit Gesicht

Stand 29.08.2026. **Kein Code, eine Idee.** Festgehalten auf Owner-Anweisung („schreib das in
die Idee … kein Generator jetzt"). Was hier steht, ist entschieden oder ausdrücklich offen —
gebaut ist davon nur der Gesprächsablauf (siehe §7).

---

## 1. Das Produkt in einem Satz

**LuxuryBandit baut einer Firma eine Verkaufsstrecke mit einer Person darin.**

Owner-Wortlaut: *„LB baut die Funnels und das beinhaltet Person(David)-Funnel."*

Nicht „ein Chatbot", nicht „Werbung schalten". Was die Firma kauft, ist eine Seite, ein
Gesicht, ein Gespräch — und die Leads landen bei ihr.

---

## 2. Warum David nicht der Verkäufer sein kann

Owner: *„dieser David ist ein Recruiter."*

David hat ein Gesicht, eine Sprache und einen Ruf: Er führt Vorgespräche mit Bewerbern.
Derselbe Mann kann keinem Gastronomen Werbung verkaufen. **Ein Gesicht, zwei Berufe — dann
glaubt man ihm keinen von beiden.**

Deshalb ist die Rollenverteilung:

| Wer | Was er tut |
|---|---|
| **LB** (die Firma) | fragt die Firma, wofür sie Leads braucht, und baut |
| **David** | ein fertiger Agent — Recruiting. Zugleich das **Schaufenster**: „So einer könnte dir gehören." |
| **weitere Agenten** | je Branche ein eigener Charakter, auf Bestellung gebaut |

Owner: *„dann ist nicht David, der den Kunden fragt, was sie für Leads haben wollen, sondern
LB."*

---

## 3. Ein Ablauf, viele Gesichter

Owner: *„der ist immer gleich, klar der Ablauf. nur der Name ist anders."*

Der Gesprächsablauf ist **immer derselbe**: Was brauchst du? Wer bist du? Welche Branche?
Deine Adresse — ich melde mich in 48 Stunden.

Unterschiedlich je Agent ist nur eine Tabellenzeile:

- Adresse der Seite
- Name und Porträt
- Branche, Anrede, Ton
- die drei bis fünf **fachlichen** Fragen
- ein, zwei Beispielsätze aus der Branche

**Das Gesicht öffnet die Tür, die Fragen halten sie offen.** Owner-Beispiel: Für ein
Kosmetikstudio muss es eine Frau sein — aber was sie glaubwürdig macht, ist der Satz „Wie
viele deiner Kundinnen kommen ein zweites Mal?". Beides gehört in dieselbe Zeile.

Neuer Agent = eine Zeile plus ein Bild. **Kein neues Bauwerk.** Ändert sich der Ablauf, ändert
man ihn einmal statt zwölfmal.

---

## 4. Die Gesichter kommen aus der Models-Galerie

Owner: *„die Models-Galerie können wir doch alles benutzen für sowas."*

Die Galerie ist bereits eine Personen-Verwaltung: Gesicht, mehrere Bilder, Profilseite,
Kartenbild. Ein Agent braucht genau das. Es entsteht keine zweite Verwaltung, sondern eine
zweite **Sorte Eintrag**.

**Alle Gesichter dort sind erzeugt, keine echten Menschen** (Owner ausdrücklich, 29.08.2026).
Damit gibt es keine Einwilligungsfrage: Ein neues Gesicht kostet Cents, passt zur Branche und
ist sofort verfügbar. Bella ist bereits so ein Eintrag.

---

## 5. Auf Bestellung, nicht auf Verdacht

Owner: *„die Firma sagt, ich brauche einen Agent, der mir Kunden bringt für mein
Kosmetikstudio. Dann bauen wir eins."*

Das ist der wichtigste Satz des ganzen Papiers. **Es werden keine Branchenseiten auf Vorrat
gebaut.** Der Weg:

1. **Eine** Firmenseite mit dem Gespräch: „Wofür brauchst du Leads?"
2. Erste echte Anfrage abwarten. Das Gespräch fragt ohnehin nach der Branche —
   **das ist die Marktforschung, und sie kostet keinen Token** (fester Text, kein Modell).
3. Für diese eine Firma den Agenten bauen: Gesicht erzeugen, Fragen schreiben, Seite
   aufsetzen. Ein Tag Arbeit — vorher bezahlt.
4. Dieser Agent ist danach das Schaufenster für die nächste Firma derselben Branche.

Das deckt sich mit der Hausregel „ein Produkt zuerst": Ein Irrtum kostet dann eine Anzeige
statt eines Monats.

---

## 6. Zwei offene Entscheidungen (Owner, noch nicht getroffen)

**6.1 Einmalkauf oder Betrieb?**
Ein Funnel läuft weiter: Er wird gehostet, die Leads müssen ankommen, der Agent gepflegt
werden. Die Hausregel sagt, es gibt genau **ein** Abo (die Hochzeitsseite). Hier stösst sie an
ihre Grenze. Entweder Aufbau einmalig + Betrieb monatlich — oder alles einmalig und die Firma
bekommt die Strecke ausgehändigt und trägt sie selbst.
*Empfehlung: Aufbau einmalig, Betrieb monatlich.*

**6.2 Wessen Name steht unter dem Funnel?**
Überall im Haus steht „made by luxurybandit.com" darunter. Eine Kosmetikfirma will ihren
eigenen Namen auf ihrer Seite. Entweder die Marke wird abgegeben — dann ist der Funnel ein
Werkstück — oder sie bleibt klein sichtbar, dann verkauft jeder laufende Funnel den nächsten.
*Empfehlung: klein sichtbar bleiben.*

---

## 7. Was davon schon gebaut ist (29.08.2026)

Fertig und geprüft, aber **an keiner Seite eingehängt**:

- `components/DavidFirmenChat.tsx` — der Gesprächsablauf. Fester Text, kein Modell, kostet
  je Durchlauf **null**. Chips statt Tippen, wo es geht.
- `app/api/david-firmen/route.ts` — nimmt die Anfrage an, meldet sie per Mail ans Haus
  (Antwortadresse ist der Interessent) und legt sie ab.
- `lib/david-firmen-store.ts` — die Ablage unter `david-firmen/`. Die Mail ist der Wecker,
  die Ablage das Gedächtnis.
- Die Texte in `lib/david-texte.ts` (`tm*`).

**Noch nicht gebaut:** die Firmenseite selbst, die Agenten-Tabelle, die Übergabe von LB an
den passenden Agenten, der Generator für neue Agenten (Owner: *„kein Generator jetzt"*).

**Nachzuziehen, sobald die Seite steht:** Der gebaute Ablauf spricht heute mit **Davids**
Gesicht und pitcht Funnels und Werbung. Das ist der falsche Mund — LB fragt, David macht
Recruiting. Fragesteller, erster Satz und Übergabe müssen umgeschrieben werden.
