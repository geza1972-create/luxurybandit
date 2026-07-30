# Überrasche ihn — das Konzept

Stand 30.07.2026. Entscheidungspapier, kein Ideenpapier. Zielgruppe: **Frauen** (Owner).

---

## 1. Was heute dasteht — und was davon nur behauptet ist

Das Thema existiert seit dem 27.07.: `/themes/surprise`, `components/SurpriseFunnel.tsx` (331
Zeilen), `/api/surprise-video-checkout` (3,99 €). Der Ablauf heute: sie lädt **ein Foto von
sich** hoch, wählt ein **Dessous-Set** aus dem Katalog, tippt **seinen Vornamen**, setzt ein
Häkchen, **zahlt 3,99 €** — dann zieht FASHN sie an und Pixverse animiert sie mit dem Satz
„Hello ⟨Name⟩, how are you?". Am Ende ein Download.

In sieben Tagen: **3 Aufrufe.** Das Thema ist tot, aber nicht widerlegt — es hat nie eine
Anzeige gesehen.

Drei Dinge verspricht die Seite, die es nicht gibt:

| Versprechen | Wirklichkeit |
|---|---|
| „a private video only he can open" (Themenkarte) | Es gibt **keinen privaten Link**. Sie lädt herunter und verschickt selbst. |
| „She says his name out loud" | Pixverse bekommt den Satz im Auftrag. Ob die Lippen wirklich synchron sind, ist **nie gemessen** worden — `/api/talk-video` existiert, wird hier aber nicht benutzt. |
| Der Rest der Seite | Kein Gratis-Ergebnis, keine E-Mail, keine Übersetzung, keine serverseitige Lieferung. Alles, was der Kuss-Trichter heute kann, fehlt hier. |

**Und der teuerste Fehler steckt in der Reihenfolge: Sie zahlt, bevor sie irgendetwas
gesehen hat.** Genau daran ist der Kuss-Trichter gescheitert — 9 Durchläufe, 0 Zahlungen —,
bis es ein echtes Gratis-Bild gab. Eine Frau, die ihr eigenes Foto hochlädt, ist misstrauischer
als ein Mann, nicht weniger.

---

## 2. Die eine Entscheidung: sie allein — oder sie und er

Der Owner hat heute festgestellt: „Das ist der einzige Punkt, was die Leute sehen wollen: sich
mit jemandem." Die Zahlen stützen das (Kiss und Bella sind die einzigen Themen mit Leben; von
54 Katalog-Besuchern klickten 11 in irgendein anderes Thema).

Nur: Diese Erkenntnis stammt von **männlichem** Anzeigen-Verkehr. Für „Überrasche ihn" gibt es
deshalb zwei Bauformen, und die Entscheidung gehört an den Anfang, nicht ans Ende:

**A — Sie allein (heutiger Stand).** Sie in einem Set, spricht seinen Namen. Das Geschenk ist
*sie*. Klassisch, und es braucht nur ein Foto.

**B — Sie und er (Kuss-Maschine mit vertauschten Rollen).** Sie lädt **zwei** Fotos hoch: sich
und ihn. Heraus kommt das Paar-Video, das sie ihm schickt. Technisch ist das der Kuss-Trichter,
nur dass **sie** ihn bedient und **er** das Ergebnis bekommt.

**Empfehlung: B als Hauptweg, A als Schalter darin** („nur ich"). Drei Gründe:

1. **Es ist gebaut.** `KissFunnel` kann das heute schon — zwei Fotos, Garderobe, Szene,
   serverseitige Lieferung, sieben Sprachen. B ist eine Variante, kein neuer Trichter.
2. **Es passt zur einzigen belastbaren Beobachtung, die wir haben.** „Ich mit jemandem" zieht,
   „eine Person allein" nicht.
3. **A bleibt trotzdem drin.** Wer nur sich zeigen will, tippt einen Schalter. Das kostet einen
   Zustand, keine zweite Seite.

Was **gegen** B spricht und ehrlich dazugehört: Sie braucht ein Foto von ihm. Das ist eine
Hürde mehr, und bei einer Überraschung womöglich die falsche — vielleicht ist gerade das
Alleinsein das Geschenk. Das entscheidet der erste Anzeigentest, nicht dieses Papier.

---

## 3. Warum dieses Thema mehr wert ist, als es aussieht

Der Kuss-Trichter kauft seine Kunden bei Meta. **„Überrasche ihn" kann sie sich schenken
lassen.**

Sie macht ein Video **für ihn** und schickt es ihm. Er öffnet einen Link auf luxurybandit.com.
Damit landet genau der Mensch auf der Seite, den wir ohnehin bewerben — nur kostet er diesmal
nichts. Ein verschicktes Video ist eine Empfehlung von einem Menschen, dem er vertraut, und
keine Anzeige.

**Das ist die einzige Stelle im ganzen Portal, an der ein Kunde uns den nächsten Kunden
bringt.** Deshalb ist der private Link (Abschnitt 6) kein Detail, sondern der Kern.

---

## 4. Der Trichter, Schritt für Schritt

Vier Schritte, ein Bildschirm je Schritt — dieselbe Form wie beim Kuss, weil sie sich dort
bewährt hat.

1. **Dein Foto.** Sie lädt ein Foto von sich hoch. Platzhalter: eine Frau, deutlich und farbig.
   Darunter der Zustimmungssatz mit Verweis auf AGB und Datenschutz — **das Hochladen ist die
   Zustimmung** (wie beim Kuss seit heute).
2. **Sein Foto** (Variante B) oder ein Tipp auf „nur ich" (Variante A).
3. **Wohin schicken wir dein Bild?** Adresse. Erst danach wird gerechnet.
4. **Das Gratis-Bild.** Sie sieht sich — oder die beiden — scharf und sofort. Darunter: „Daraus
   ein Video machen" für Geld, und die Garderobe, sichtbar aber verschlossen.

Bezahlt sie: Garderobe und Moment auswählen → Video → **privater Link + Download**.

---

## 5. Was 1:1 aus dem Kuss-Trichter kommt

Alles davon ist heute gebaut, geprüft und live. Für „Überrasche ihn" muss es nur angeschlossen
werden — das ist die eigentliche Arbeit, und sie ist klein:

| Baustein | Datei |
|---|---|
| Adresse vor der Erzeugung, Nachweis der Zustimmung | `components/KissFunnel.tsx`, `app/api/kiss-claim/route.ts` |
| Gratis-Bild | `app/api/free-preview/route.ts` (`theme: "surprise"`) |
| Serverseitige Lieferung des bezahlten Videos | `app/api/kiss-deliver/route.ts` |
| Abo erkennen, Kontingent, 3,99-Nachkauf | `app/api/kiss-status/route.ts` |
| Sieben Sprachen | `lib/kiss-i18n.ts` |
| Galerie im Admin, ein Eintrag je Besucherin | `app/api/kiss-log/route.ts`, `components/UploadsAdmin.tsx` |
| 90-Tage-Frist, Löschen samt Dateien | `app/api/kiss-deliver/route.ts` |
| Hell/Dunkel, Radar, Privat-Hinweis | `components/LightSwitch.tsx`, `KissFunnel` |

**Nicht kopieren, sondern wiederverwenden.** Ein zweiter Trichter mit denselben Fehlern wäre
die teuerste Entscheidung dieses Konzepts: Jede Korrektur müsste ab dann zweimal gemacht
werden. `KissFunnel` bekommt eine dritte Variante (`surprise`), mehr nicht.

---

## 6. Der private Link — die einzige echte Neuentwicklung

Heute lädt sie herunter und verschickt selbst. Das funktioniert, verschenkt aber den Kanal aus
Abschnitt 3.

**Was gebaut wird:** Nach dem Video bekommt sie zwei Knöpfe — „Herunterladen" und **„Link zum
Verschicken"**. Der Link zeigt auf `/fuer/⟨zufällige Kennung⟩` und öffnet eine Seite mit genau
einer Sache: dem Video, groß, ohne Menü. Darunter eine einzige Zeile: *„Willst du ihr auch
eines schicken?"* → Kuss-Trichter.

**Was den Link privat macht:**
- Die Kennung ist zufällig und lang genug, dass man sie nicht raten kann.
- Kein Verzeichnis, keine Suche, `noindex` — Google findet ihn nie.
- Sie kann ihn **jederzeit widerrufen**; danach zeigt die Seite „Dieses Video wurde entfernt".
- Er läuft mit der 90-Tage-Frist ab, wie alles andere.

**Was er misst:** Jeder Aufruf zählt als eigenes Ereignis. Damit ist zum ersten Mal messbar,
wie viele Menschen ein Kunde uns bringt — die Zahl, die über die Anzeigen entscheidet.

---

## 7. Preis

Derselbe Preisaufbau wie beim Kuss, aus `lib/pricing.ts`, keine eigene Tabelle:

- **Bild gratis** (drei pro Person und Tag).
- **Video 9,99 €** einmalig — nicht die heutigen 3,99 €. Es ist dasselbe Video, dieselbe
  Rechnung, derselbe Anbieter. Zwei Preise für dasselbe Produkt sind nur ein Weg, den
  teureren Trichter zu untergraben.
- **Abo 24,50 €/Monat** mit den enthaltenen Videos, themenübergreifend — wer schon Abonnentin
  ist, zahlt hier gar nichts extra.
- **3,99 €** bleibt, wofür es gedacht war: das eine Video, wenn das Monatskontingent leer ist.

---

## 8. Woran wir merken, dass es nicht funktioniert

Drei Tore, wie beim Bella-Plan. Wird eines gerissen, wird gestoppt, nicht nachjustiert.

**Tor 1 — nach 20 € Anzeige an Frauen.** Bedingung: **≥ 15 Trichterstarts** (Foto hochgeladen)
und **≥ 8 Adressen**. Gerissen: Frauen sind über Meta zu diesem Preis nicht erreichbar —
dann ist der einzige verbleibende Weg der private Link aus bestehenden Kunden.

**Tor 2 — nach 40 € insgesamt.** Bedingung: **≥ 1 Zahlung**. Gerissen bei 15+ Starts und 0
Zahlungen: Das Angebot stimmt nicht für diese Zielgruppe — nicht der Preis, nicht die Anzeige.

**Tor 3 — der eigentliche Zweck.** Bedingung: **≥ 30 % der bezahlten Videos werden über den
privaten Link geöffnet.** Wird das gerissen, ist die These aus Abschnitt 3 falsch: Dann ist
„Überrasche ihn" ein Nischenprodukt und kein Kanal, und das Budget gehört zurück auf Kiss.

Was **nicht** als Erfolg zählt: Aufrufe der Themenseite. Davon hatte das Thema schon drei.

---

## 9. Was es kostet

| Posten | Betrag |
|---|---|
| Gratis-Bild (OpenAI, Stufe „low") | ~0,01–0,02 € je Stück |
| Anziehen über FASHN | ~0,03–0,07 € je Video |
| Video (Pixverse, 360p) | ~0,20 € je Video |
| Anzeigen-Test an Frauen | 20 € + 20 € |
| Bauen | Claude-Zeit; der private Link ist der einzige neue Baustein |

Bei 9,99 € je Video und ~0,25 € Kosten trägt sich jedes bezahlte Video mit weitem Abstand. Das
Risiko liegt nicht in den Stückkosten, sondern darin, **ob Frauen über Meta erreichbar sind**.

---

## 10. Was NICHT gebaut wird

- **Kein zweiter Trichter.** Variante von `KissFunnel`, sonst nichts.
- **Keine Stimme, kein Lippen-Sync**, bevor Tor 2 durch ist. Der Satz im Auftrag reicht;
  echtes Sprechen (`/api/talk-video`) kostet je Video zusätzlich und löst kein Problem, das
  wir gemessen hätten.
- **Keine eigene Preistabelle**, keine eigene Kasse, keine eigene Lead-Liste. Alles läuft über
  die Wege, die seit heute funktionieren.
- **Keine Werbung mit dem Wort „Dessous".** Meta hat dieses Konto schon einmal gesperrt; die
  Anzeige zeigt eine Frau, die ein Video verschickt, nicht das Set.

---

## 11. Reihenfolge der Arbeit

1. `KissFunnel` bekommt die Variante `surprise` (Rollen: sie zuerst, er optional).
2. `/themes/surprise` auf diese Variante umstellen; die alte `SurpriseFunnel.tsx` fliegt raus.
3. Preis auf den Kuss-Aufbau umstellen (`surprise-video-checkout` → `kiss-video-checkout`).
4. Der private Link: `/fuer/[kennung]`, Widerruf, Zähler.
5. Erst dann die erste Anzeige. Vorher misst man nichts, sondern verbrennt 20 €.
