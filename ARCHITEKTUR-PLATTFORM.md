# LuxuryBandit als Produkt-Plattform — Architekturplan

> Stand 12.08.2026. Analyse der bestehenden Codebasis gegen die Plattform-Vision des Owners:
> *„LuxuryBandit is the platform. Everything else is a product on the platform."*
> Kein Code — dieser Plan beantwortet die 12 Fragen des Owners und legt die Reihenfolge fest.
> Grundlage: vollständige Kartierung der Zahlwege, Produkt-Funnels, Lieferkette, Speicher,
> AI-Dienste und Identitätsmechanismen (12.08.2026, drei Tiefenanalysen).

---

## Der Befund in einem Absatz

Die Plattform-Idee steckt schon im Code — als Keim, nicht als System. `lib/geschenke.ts` sagt
wörtlich „eine Tabelle, kein Trichter" und ist der Anfang einer Produkt-Definition. Der
Kassenweg `kiss-video-checkout` ist der Anfang eines Platform-Payment-Service (Guthaben vor
Stripe, Stempel, Lieferung). Der Wachhund `kiss-deliver` ist der Anfang eines generischen
Job-Runners. **Aber:** Ein „Produkt" ist heute kein Objekt, sondern ~84 über 16 Dateien
verstreute `theme ==="`-Verzweigungen, es gibt **drei nicht deckungsgleiche Produkt-Register**,
**18 Checkout-Routen** mit 55–65 % kopierter Logik, **keinen** Anbieter-Wrapper (Pixverse-Basis-URL
steht 5×, FASHN-Polling 4× im Code), **sechs** parallele Identitätsmechanismen und **keine
Datenbank** — alles liegt als JSON-Blobs im Supabase Storage, mit handgebautem Merge, der
nachweislich schon Guthaben und Zähler verschluckt hat. Jedes neue Produkt der letzten Wochen
(Versprechen, Geburtstag, Gutschein) hat diese Streuung vergrößert. Genau diesen Kreislauf
beendet der Plan unten.

---

## 1. Was wir behalten können (und als Fundament ausbauen)

| Baustein | Warum er bleibt |
|---|---|
| **`lib/pricing.ts`** | Bereits die EINE Preistabelle für alles (Owner-Regel seit 29.07.). Wird zur Preis-Spalte der Produkt-Definition. |
| **`lib/geschenke.ts`** | Bereits eine Produkt-Tabelle mit Schaltern (`nurSie`, `paarUpload`, `keinGratis`, `abo` …). Wächst zur vollen Product Definition (Frage 4). |
| **Wachhund `app/api/kiss-deliver`** | Retry, Hängen-Erkennung, Hop-Kette, Idempotenz, Aufgeben-Mail — sauber produktneutral bis auf 6 `theme ===`-Stellen. Wird der generische **Product-Run-Runner**. |
| **Euro-Wallet** (`guthabenAufladen/Abbuchen`, idempotente Buchungsschlüssel) | Ein Topf je Konto, idempotent, mit Historie — das ist bereits der Credits-Service der Plattform. |
| **`lib/stripe.ts`** | Die vier Session-Builder sind die saubere untere Schicht; kein Betrag, kein Stripe-Fetch liegt mehr in Routen. |
| **`lib/email-send.ts`** | Ein Transport (SMTP + Resend-Fallback), von 28 Dateien genutzt. Es fehlt nur die Template-Schicht darüber. |
| **CI-Bibliothek + Karten** (`components/CI.tsx`, `EinladungKarte`, `EinladungAnsicht`) | Owner-Regel vom selben Tag: „Video Card + Feature Card, es ist ein System." Das ist die Render-Schicht der Plattform. |
| **Signierte HMAC-Links** (future-program, einloese-token) | Das richtige Muster für öffentliche Ergebnis-Links ohne Login. Braucht nur EIN eigenes Geheimnis (heute: der Admin-PIN als Signaturschlüssel — muss getrennt werden). |
| **Upload per Signed-URL** (`createSignedUploadUrl`, ~20 Nutzer) | Der richtige Weg am Vercel-Limit vorbei. Braucht nur die Pflicht-Moderation davor (Frage 7). |
| **Admin-Studio, Insights, Rundbrief, i18n-Mechanik (7 Sprachen), Funnel-Tracking** | Funktionierende Plattform-Dienste — bleiben, werden nur an die neuen Register angeschlossen. |
| **Konzept-Vorarbeiten** | `app/[creator]`, `app/seller`, `app/platform` existieren als Skelette; CONCEPT.md kennt Creator + Referral seit Juli. Phase 2 fängt nicht bei null an. |

## 2. Was heute zu stark an einzelne Produkte gekoppelt ist

1. **`components/KissFunnel.tsx` — 5.913 Zeilen, 38 `variant ===`-Verzweigungen.** Er IST der
   gemeinsame Trichter für 5 Produkte, aber als Riesen-Komponente statt als Engine, die eine
   Definition liest. Jedes neue Produkt macht ihn größer.
2. **`components/EinladungBauen.tsx` (2.094 Z.)** — dokumentiert sich selbst als Portierung aus
   dem KissFunnel: ~2.000 Zeilen kopierte Kauf-/Video-/Crop-Logik für Hochzeit + Gutschein.
3. **18 Checkout-Routen**, davon nur EINE vollwertig (Guthaben→Stripe→Stempel→Lieferung); vier
   Einmalkauf-Routen haben gar **keinen** Erfüllungszweig (schalten nur den Client per `?paid=1`
   frei — der Server weiß nichts vom Kauf).
4. **`app/api/checkout-status`** — 443 Zeilen `if (kind === …)` mit 10 Zweigen; Teile davon ein
   drittes Mal im Stripe-Webhook. Die `aufladung`-Weiche musste dort nachgezogen werden — der
   Beweis, dass diese Dreifachheit Fehler produziert (Memory `aufladung-ist-kein-kauf`).
5. **Drei Produkt-Register, die sich widersprechen:** `GeschenkId` (geschenke.ts, `poledance`),
   `ThemenSchluessel` (pricing.ts, dasselbe Produkt heißt `surprise`), das `THEMES`-Array im
   Katalog (app/themes/page.tsx, eigene Felder, kein Bezug zu GESCHENKE). Dazu Sitemap und
   Themen-Kreise als vierte/fünfte handgepflegte Liste — heute Vormittag mussten wir Pole Dance
   an DREI Stellen einzeln entfernen. Genau das darf es nicht mehr geben.
6. **`starten()` im Wachhund** wählt die Provider-Kette hartkodiert (`birthday|versprechen` →
   HeyGen-Weg, alles andere → Pixverse mit fest verdrahteter Holiday-Szene und einer dreifach
   im Code stehenden Look-ID) — statt sie aus der Produkt-Definition zu lesen.
7. **`lib/kiss-i18n.ts`** — Produkt-Texte als Spread-Kaskade von 8 Overlays über den Kuss-Text.
8. **Ergebnis-Seiten:** `/w/[id]`, `/einladung/[id]`, `/future-program` — drei Datenquellen, zwei
   Rendering-Modelle, drei Share-Strategien, kein gemeinsames Gerüst (die Programmseite hat
   deshalb weder OG-Vorschau noch das Karten-Design — Owner heute: „es ist ein System").
9. **Galerie/Konto** verzweigen je Produkt (6 `theme ===` allein in my-gallery).

## 3. Welche Funktionen Platform Services werden müssen

Sieben Dienste. Jeder existiert heute in Teilen — der Schritt ist Bündelung, nicht Neubau:

1. **Identity** — heute 6 Mechanismen (Supabase-Auth, Admin-PIN, Admin-Allowlist, unsignierte
   Kurator-ID, Gerätekennung, HMAC-Tokens). Ziel: EIN Konto-Modell (E-Mail als Anker, Gerät als
   Übergangs-Ausweis, Rollen admin/creator/customer), HMAC mit eigenem Geheimnis. Die
   dokumentierten Geldprobleme (`gestrandet`, `gesperrt`, „Guthaben auf der anderen Adresse")
   sind Symptome genau dieser fehlenden Einheit.
2. **Orders / Product Runs** — heute `KissLogEntry` (auf 500 gekappt, nach 90 Tagen gelöscht,
   `theme` untypisiert). Ziel: eine Auftrag/Lauf-Entität je Kauf: `productId`, `inputs`,
   `runStatus`, `outputs`, `paid`, Zeitstempel. Das Future-Programm musste schon aus der Kappung
   fliehen — das Muster wiederholt sich sonst bei jedem Produkt.
3. **Payments/Credits** — EIN Server-Baustein `kasseStarten({produkt, email, genId})` mit den
   drei Regeln, die heute nur in kiss-video-checkout leben (Preis aus dem Auftrag, Guthaben vor
   Stripe, Stempel + Lieferung), plus EIN Erfüllungs-Register (`kind` → Handler) statt der
   if-Kette in drei Dateien. Das tote `lib/credits-store.ts` (schreibt aufs Vercel-Dateisystem,
   wirkungslos) wird entfernt.
4. **AI Services** — je Anbieter EIN Wrapper (OpenAI, Pixverse, FASHN, HeyGen, fal), darüber
   Fähigkeiten statt Anbieter: `bildErzeugen`, `videoErzeugen`, `anziehen`, `sprechenLassen`,
   `pruefen` (Moderation). Die Produkt-Definition nennt die Fähigkeit + Prompt; das Routing
   (Memory `video-provider-routing`) liegt EINMAL im Service. Kostenprotokoll (video-log.json)
   hängt am Wrapper, nicht an jeder Route.
5. **Uploads/Assets** — ein Upload-Baustein (Signed-URL + Zuschnitt + Kompression) mit
   **Pflicht-Moderation**: Die Alters-/Nacktheitsprüfung sitzt heute in 3 von ~20 Upload-Pfaden.
   Das ist nicht nur Architektur, das ist ein Compliance-Loch — kommt in Phase 1 zuerst.
6. **Delivery/Runner** — der Wachhund, produktneutral gemacht: Er liest Kette, Prompt und
   Mail-Vorlage aus der Produkt-Definition. Retry/Fristen/Aufgeben bleiben, wie sie sind.
7. **Result Pages** — EIN öffentliches Ergebnis-Gerüst (signierter Link, OG-Vorschau,
   Video-Karte + Feature-Karten aus der Definition). `/einladung/[id]` ist das Vorbild,
   `/w/[id]` der dünne Sonderfall, `/future-program` der Nachzügler, der ins Gerüst zieht.

Dazu quer: Email (Template-Schicht über dem Transport), Analytics (existiert), Admin (existiert).

## 4. Wie die zentrale Product Definition aussieht

EIN Register (Nachfolger von `GESCHENKE`, ersetzt auch `ThemenSchluessel`-Doppelungen und das
Katalog-Array). Je Produkt EIN Eintrag mit fünf Blöcken:

- **Identität:** `id` (ein Schlüssel, überall derselbe — Schluss mit poledance/surprise),
  `slug` (Route), Sichtbarkeit (katalog/sitemap/kreise ja–nein — Pole Dance wäre EIN Schalter
  gewesen), Status (live/intern/aus).
- **Inputs:** geordnete Liste aus dem Baukasten — `fotoUpload` (mit Crop, Platzhalter,
  Paar/Nur-sie), `textFeld` (Empfängername …), `auswahl` (Look/Szene/Ziele), `aufnahme`
  (Video+Ton). Entspricht 1:1 den heutigen Funnel-Schritten.
- **Workflow:** geordnete Liste von Fähigkeits-Schritten — z. B. Versprechen:
  `bildErzeugen(openai, lookPrompt)` → `sprechenLassen(heygen)`; Kuss:
  `videoErzeugen(pixverse, KISS_PROMPT)`. Der Runner führt sie aus, der Wachhund überwacht sie.
- **Kaufweg:** Preisschlüssel (zeigt in pricing.ts), Modus (`einmal | abo | nurGuthaben`),
  `keinGratis`, Gutschein-fähig. KEINE Beträge — die bleiben in der Preistabelle.
- **Outputs:** Video-Karte (Pflicht, mit Poster-Regel), Feature-Karten (Checkliste, Chat,
  Zusagen, Programm-Tage …), Liefer-Mail-Vorlage, Galerie-Label, OG-Daten fürs Teilen.

Texte bleiben in der i18n-Schicht (je Produkt ein Namensraum statt Spread-Kaskade), Preise in
der Preistabelle — beides referenziert über den einen `id`-Schlüssel. Katalog-Kachel, Sitemap,
Themen-Kreise, Galerie-Label und Kassen-Metadata werden aus dem Register ABGELEITET, nie mehr
von Hand gepflegt.

## 5. Wie Produkte unterschiedliche Inputs, Workflows, Outputs verwenden

Über die drei Listen aus Frage 4 — und der Beweis, dass das trägt, läuft schon: Der KissFunnel
bedient heute 5 Produkte über EINE Komponente mit Schaltern. Was fehlt, ist nur der letzte
Schritt: Die Schalter-ifs werden zu Daten. Die Funnel-Engine rendert die `inputs`-Liste
(jeder Input-Typ ist eine CI-Komponente), der Runner arbeitet die `workflow`-Liste ab (jeder
Schritt eine AI-Service-Fähigkeit), die Ergebnis-Seite rendert die `outputs`-Liste (jede
Feature-Karte eine Karten-Komponente). Owner-Beispiele funktionieren direkt: Vision Video =
`fotoUpload + textFeld → bildErzeugen + videoErzeugen → Video-Karte`; Application Card =
`dateiUpload + urlFeld → analysieren + textErzeugen → HTML-Seite + öffentlicher Link`. Ein
Produkt, dessen Wunsch-Baustein fehlt, ist der Auftrag, den Baustein zu BAUEN — einmal, für
alle („Every product should improve the platform").

## 6. Gemeinsame Components, die wir schon besitzen

CI-Bibliothek (Knopf/Eingabe/Dialog/Kasten/Scheibe/ThemenKreise …) · EinladungKarte +
EinladungAnsicht (Video-Karte mit den drei Symbolen) · Feature-Karten-Vorbilder (GruppenChat,
ZusagenKarte) · UploadKachel + zwei Cropper (konsolidieren auf einen) · FotoAnleitung ·
Render-Fortschritts-Show (4× kopiert — einmalig machen) · TeilenKnopf · Reaktionen ·
GeschenkAnmeldung/Tor · Preistabelle + fillPrices · i18n-Mechanik · track-funnel ·
Stripe-Session-Builder · Wallet · Wachhund · email-send · Signed-Upload · Wasserzeichen ·
Alters-/Nacktheitsprüfung · Admin-Studio-Module.

## 7. Was fehlt

1. **Das Produkt-Register** (Frage 4) — wichtigster Einzelbaustein.
2. **`kasseStarten` + Erfüllungs-Register** — die Kassenfassade (Frage 3.3).
3. **Anbieter-Wrapper + Fähigkeits-Schicht** (Frage 3.4).
4. **Moderation am Upload-Baustein** statt in 3 von 20 Pfaden — Sicherheitslücke, zuerst.
5. **Die generische Auftrag/Run-Entität** außerhalb der 500er-Kappung.
6. **Das Ergebnis-Seiten-Gerüst** (signierter Link + OG + Kartenstapel).
7. **Die Feature-Karten-Hülle** als wiederverwendbarer Baustein (Owner heute: Creme-Karte wie
   der Hochzeits-Gruppenchat, Inhalt wird hineingereicht).
8. **Mail-Template-Schicht** (28 Stellen bauen HTML inline, 7-Sprachen-Records je Route neu).
9. **Eine echte Datenbank für Geld und Aufträge** (Frage 8).
10. **Ein eigenes Signatur-Geheimnis** (heute unterschreibt der Admin-PIN Kundenlinks).

## 8. Welche Datenbankstruktur wir JETZT brauchen

Nüchtern: Der Storage-JSON-Ansatz hat uns weit getragen, aber die Kommentare im Code
dokumentieren mehrfach verlorene Buchungen durch den Hand-Merge, und die 500er-Kappung hat
schon ein Produkt (Programm) in einen Sonderspeicher gezwungen. **Geld und Aufträge gehören
jetzt in Postgres** — Supabase liegt schon unter uns, es kommt kein neuer Anbieter dazu.

Nur vier Tabellen, mehr nicht:
- **`products`** — das Register aus Frage 4 (oder: Register als Datei im Repo, Tabelle erst in
  Phase 2 für Creator-Produkte; beides vertretbar, Repo-Datei ist der kleinere erste Schritt).
- **`orders`** (Product Runs) — Nachfolger des Kiss-Logs: keine Kappung, kein Merge-Verlust,
  abfragbar („alle offenen Versprechen-Aufträge" ist heute ein Voll-Scan von 500 JSON-Zeilen).
- **`wallet_ledger`** — jede Buchung eine Zeile, idempotent über den bestehenden Schlüssel;
  Kontostand = Summe. Die Klasse „Merge-Dieb kommt ans Geld" stirbt strukturell.
- **`events`** — die Analytics-Liste raus aus state.json (sie bläht jeden Lese-Zugriff auf).

Ausdrücklich NICHT migriert: Katalog, Looks, Kuratoren, Bella, Chat-Konfiguration — alles
bleibt vorerst im state.json. Storage bleibt für Medien sowieso.

## 9. Was wir heute noch NICHT brauchen

Creator-Builder-UI · Marketplace · Revenue-Sharing/Auszahlungen · visueller Workflow-Editor ·
Template-System für Creator · Idee-in-Sprache-zu-Produkt (Phase 3) · Multi-Tenant-Theming ·
Microservices/eigene Infrastruktur (Vercel + Supabase reichen weit in Phase 2 hinein) ·
Migration von Katalog/Content in die DB. Die Vision bestimmt die SCHNITTE von heute, nicht den
Funktionsumfang von heute.

## 10. Schrittweise Migration ohne Bruch

Strangler-Muster: Neues wächst NEBEN dem Alten, ein Produkt zieht um, dann das nächste. Der
zahlende Kunde merkt nie etwas.

- **Schritt 0 (sofort, reine Sicherheit):** Moderation an den Upload-Baustein; eigenes
  HMAC-Geheimnis; totes `credits-store.ts` entfernen.
- **Schritt 1 — Kassenfassade:** `kasseStarten` + Erfüllungs-Register bauen; die 18 Routen
  rufen sie nacheinander auf (Routen-URLs bleiben, Inhalte schrumpfen auf Aufrufe). Zuerst die
  vier Routen OHNE Erfüllungszweig — die sind heute halb kaputt.
- **Schritt 2 — Produkt-Register:** Die drei Register zu einem vereinigen; Katalog, Sitemap,
  Themen-Kreise, Galerie-Labels daraus ableiten. Rein additiv, keine Laufzeit-Änderung.
- **Schritt 3 — Anbieter-Wrapper:** Pixverse/FASHN/HeyGen/OpenAI/fal je einmal kapseln; Routen
  stellen einzeln um. Wachhund liest die Kette aus dem Register (behebt nebenbei den Fehler,
  dass er für Kuss-Nachlieferungen eine Urlaubsszene rendert).
- **Schritt 4 — Pilotprodukt:** DAS NÄCHSTE NEUE PRODUKT wird zu 100 % über Register + Fassade +
  Wrapper gebaut — null neue Sonderrouten. Das ist der Beweis und das Template.
- **Schritt 5 — Funnel-Engine:** KissFunnel von innen umbauen (Schalter → Register-Daten),
  Produkt für Produkt; danach zieht EinladungBauen dieselbe Engine an; ChatFunnel/HolidayFunnel
  zuletzt oder sterben mit ihren Produkten.
- **Schritt 6 — Aufträge + Wallet nach Postgres:** Doppelschreiben (alt+neu) → Lesen umstellen →
  Altweg abklemmen. Das Kiss-Log bleibt als Leselog, bis der letzte 90-Tage-Auftrag abgelaufen ist.
- **Schritt 7 — Ergebnis-Gerüst:** future-program zieht als erstes ins gemeinsame Gerüst (löst
  zugleich den heutigen Owner-Befund: Programm-Inhalte in Feature-Karten).

Jeder Schritt ist einzeln deploybar und einzeln rückrollbar; kein Schritt setzt einen
Big-Bang voraus.

## 11. Wie das nächste Produkt kein Sonderfall mehr wird

Die Regel (ab Schritt 4 durchsetzbar, ab heute als Maßstab):

> **Ein neues Produkt darf genau vier Dinge hinzufügen: einen Register-Eintrag, Texte,
> Preiszeilen, Medien. Braucht es eine fünfte Sache, ist das kein Produkt-Feature, sondern
> eine Plattform-Lücke — dann wird der fehlende BAUSTEIN gebaut, nicht ein Sonderweg.**

Abgesichert dreifach: (a) als Dauerregel im Arbeitsgedächtnis (Memory
`produktaufbau-video-card-feature-card` — „es ist ein System"), (b) als Prüfliste in diesem
Dokument vor jedem Produktstart, (c) mechanisch: neue `theme ===`/`variant ===`-Verzweigungen
außerhalb der Plattform-Schicht gelten als Fehler im Review (heute 84 Stellen — die Zahl darf
nur sinken).

## 12. Realistischer Aufwand

Gemessen am Arbeitstempo dieses Projekts (ein Owner, KI-gestützt, täglich lieferbar), in
Session-Tagen; parallel bleibt das Tagesgeschäft (Bugs, laufende Produkte) möglich:

| Schritt | Aufwand | Risiko |
|---|---|---|
| 0 Sicherheit (Moderation, Geheimnis, toter Code) | 1–2 Tage | klein |
| 1 Kassenfassade + Erfüllungs-Register | 3–5 Tage | mittel (Geld — mit Testkäufen absichern) |
| 2 Produkt-Register + Ableitungen | 2–3 Tage | klein |
| 3 Anbieter-Wrapper + Wachhund liest Register | 3–4 Tage | mittel |
| 4 Pilotprodukt komplett über die Plattform | 2–3 Tage | klein — der Lackmustest |
| 5 Funnel-Engine (KissFunnel → Engine, dann Einladung) | 8–12 Tage, in Scheiben | am größten; deshalb zuletzt in Phase 1 und pro Produkt einzeln |
| 6 Postgres für Aufträge + Wallet | 3–5 Tage inkl. Doppellauf | mittel |
| 7 Ergebnis-Gerüst | 2–3 Tage | klein |

**Phase 1 gesamt: rund 4–6 Arbeitswochen**, in einzeln lieferbaren Scheiben — nach Schritt 4
(also nach ~2 Wochen) ist der Kernnutzen bereits da: **ein neues Produkt kostet Tage statt
Wochen.** Phase 2 (Creator + Shop) setzt danach auf fertige Dienste auf: Register wird Tabelle,
Konto bekommt die Creator-Rolle, `app/[creator]`-Skelett wird angeschlossen — grob 3–4 weitere
Wochen. Phase 3 bleibt bewusst unbeziffert.

---

## Die Leitplanke

**LuxuryBandit is the platform. Everything else is a product on the platform.**
Jede künftige Bau-Entscheidung wird an einer Frage gemessen: *Macht das die Plattform für das
übernächste Produkt billiger — oder baut es den nächsten Sonderfall?*
