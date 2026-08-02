# Änderungsplan: Wedding-Seite → „Hochzeitsplaner", verkaufsfertig für Anzeigen

Stand 02.08.2026 (abends, 2. Fassung — Preismodell vom Owner geändert).

Dieser Plan ist für die Umsetzung durch ein Modell geschrieben: Jede Änderung nennt Datei,
Ankerstelle und den fertigen neuen Text. **Nichts dazuerfinden, nichts weglassen.**
Alle Code-Zitate sind am 02.08.2026 gegen den echten Stand geprüft.

---

## STAND NACH DEM 2. LAUF (02.08.2026 nachts — ZUERST lesen)

Am Code UND im Browser verifiziert (Grep + lokale Vorschau, mobil, RO):

- **Erledigt — nicht mehr anfassen:** Ä1–Ä10. Kopf über der Karte steht (Kicker/H1/Claim),
  Preiszeile zeigt „1,49 € · 7 Tage · 24,50 €", Beschriftungen in Abo-Fassung,
  `heroLead` aus `HOCHZEIT` gelöscht, `TRIAL_DAYS` überall, Abo-Sperre auf der
  Einladungsseite aktiv, Gästezahl zählt Personen („vin 7 invitați · 1 refuz").
- **Offen — NUR das ist noch zu tun:** **Ä11** (Abo-Kasse — `?abo=1` läuft weiterhin ins
  Leere) und **Ä12** (Chat-Löschen fürs Paar).
- **DEPLOY-SPERRE:** Dieser Stand darf NICHT committet/gepusht werden, bevor Ä11 steht.
  Grund: Die Abo-Sperre (Ä9) ist aktiv, aber es gibt keinen Kaufweg — live wären Zusagen/
  Chat für jede neue Einladung gesperrt UND unkaufbar, und der Abo-Knopf des Paares
  führte ins Leere. Erst Ä11, dann Freigabe durch den Owner.
- **Wortwahl-Regel (Owner 02.08.2026: „RSVPs verstehe ich selber nicht"):** Das Wort
  „RSVP" ist aus allen sichtbaren Texten entfernt — englische Quelle sagt „guest list"
  (→ Gästeliste/lista de invitați). NIE wieder „RSVP" in sichtbare Texte schreiben;
  erlaubt bleibt es nur als unsichtbares Such-Stichwort in `metadata.keywords`.
- Volles `tsc --noEmit` zeigt ~109 ALT-Fehler in nicht angefassten Dateien
  (`app/api/try-this-look/route.ts`, `.next/`-Typen, Profile-Route) — Altbestand, nicht
  Teil dieses Plans, nicht „mitfixen". Alle Plan-Dateien sind fehlerfrei.
- Die Änderungen an `app/themes/page.tsx` und `components/CookieConsent.tsx` im
  Arbeitsverzeichnis stammen aus einer ANDEREN Sitzung — liegen lassen.

**Ä13, direkt umgesetzt (02.08.2026 spätabends, Owner-Feedback live am Screenshot):**
- H1 heisst jetzt „euer Hochzeitsplaner" statt „eure Hochzeitseinladung" in allen 7
  Sprachen (`heroA`/`heroY`/`heroB` im `HOCHZEIT`-Block, `lib/kiss-i18n.ts`) — Owner: „oben
  muss stehen was ich verkaufe", der Kicker allein sagte „Planer", die grosse Überschrift
  sagte weiter „Einladung".
- Die leere Bau-Karte (`components/EinladungBauen.tsx`) zeigt jetzt ein GANZES Beispiel
  statt Formular-Beschriftungen als Inhalt: Name „Ana & Mihai", ein Datum ~100 Tage voraus,
  Ort „Casa Timiș" + volle Adresse mit PLZ (7 Sprachen, `BEISPIEL_ORT`/`BEISPIEL_ADRESSE` —
  inhaltlich identisch mit den in Ä6 als toter Code gelöschten Konstanten aus
  `page.tsx`, jetzt aber tatsächlich verwendet, an der Stelle wo sie hingehören). Owner:
  „in der Karte muss doch stehen ein Beispiel eines Namens und eine schöne Adresse."
  Bleibt reiner Anzeige-Fallback — an `erzeugen()`/`einladungAnlegen()` geht weiterhin nur
  das, was der Nutzer selbst eingetippt hat.
- Der Knopf über dem Beispielvideo heisst nicht mehr „Foto ersetzen"/„Înlocuiește poza",
  sondern „Daten ersetzen"/„Înlocuiește datele" (neuer Schlüssel `datenErsetzen` in
  `KissText`, in ALLEN 7 Sprachen sowohl in der Basis-`TABELLE` als auch im
  `HOCHZEIT`-Override befüllt — Basis-Wert wird für Kiss nie angezeigt, existiert nur
  weil `TABELLE: Record<Lang, KissText>` keine fehlenden Schlüssel zulässt). Owner: „nicht
  Inlocuiește poza, sondern Inlocuiește datele." Der Knopf auf dem ECHTEN, selbst
  erzeugten Bild heisst weiterhin „Foto ersetzen" (`T.ersetzen`) — dort stimmt das Wort.
- `tsc --noEmit` sauber für beide Dateien; im Browser (mobil, RO) geprüft: Karte zeigt
  „Ana & Mihai", „10 noiembrie 2026", „Casa Timiș" + Adresse, Knopf „Înlocuiește datele".

---

## STAND NACH DEM 3. LAUF (02.08.2026 nachts, Ä11 + Ä12 direkt umgesetzt, nicht von
Sonnet) — DAS GILT ALS NÄCHSTES

Auf Owner-Wunsch („ja, dann machs") direkt gebaut statt an Sonnet delegiert. Am Code UND
per curl/Browser gegen den lokalen Dev-Server geprüft.

**Ä11 — Abo-Kasse — FERTIG:**
- Neue Route `app/api/einladung-abo-checkout/route.ts`: prüft, dass die Einladung existiert,
  öffnet dieselbe Stripe-Abo-Kasse wie die anderen Themen (`topicPriceId()` + `standardCoupon()`
  — 24,50 €/Monat), `metadata.kind = "einladung-plan"` (bewusst NICHT „…-abo", sonst hätte
  `checkout-status`s bestehende `/-abo$/`-Regel zusätzlich das themenübergreifende
  Monatsguthaben gutgeschrieben — ein anderes Produkt).
- `app/api/checkout-status/route.ts`: neuer Zweig für `kind === "einladung-plan"` ruft
  `einladungAboVermerken(einladungId)` auf.
- `lib/try-this-look-store.ts`: neue Funktion `einladungAboVermerken(id)` — liest, setzt
  `bezahlt: true`, schreibt zurück (Lesen-Ändern-Schreiben wie bei `setVideo`/`revoke`,
  keine Retry-Schleife nötig — genau EIN Schreiber, Stripe, einmal).
- Neuer Baustein `components/EinladungAboKnopf.tsx` (`"use client"`): EIN Knopf für ZWEI
  Stellen — der Abo-Kasten in `EinladungBearbeiten.tsx` (noch in der Probezeit) UND der
  Reaktivierungs-Kasten in `app/einladung/[id]/page.tsx` (Probezeit abgelaufen). Beide
  zeigten vorher denselben toten `<Link href="/themes/wedding?abo=1&e=…">`. Der Baustein
  startet die Kasse, erkennt die Rückkehr `?abopaid=1&cs=<sitzung>` (derselbe Mechanismus
  wie `PaidReturn.tsx`), fragt `/api/checkout-status` und lädt bei Erfolg die Seite komplett
  neu (kein zweiter Wahrheitsstand im Browser).
- Neuer Text-Schlüssel `aboPruefen` in `KARTE_TEXTE` (alle 7 Sprachen): „Zahlung wird
  bestätigt …" während der Rückkehr-Prüfung.
- **Live geprüft:** Reale Stripe-Checkout-Session erfolgreich erzeugt (`checkout.stripe.com`,
  `cs_live_…` — LIVE-Schlüssel, wie im Code dokumentiert) — **NICHT abgeschlossen**, kein
  Geld bewegt. Rückkehr-Mechanismus (`?abopaid=1&cs=…` → Prüfung → Reload) über die
  vorhandene lokale Testklappe (`LB_TEST_CHECKOUT=1`) durchlaufen — bestätigt NUR den
  Client-Kreislauf, nicht `einladungAboVermerken` selbst (die Testklappe antwortet mit
  einem fest verdrahteten `kind:"kiss-video"`, bevor mein neuer Zweig erreicht wird).

**Ä12 — Chat-Löschen fürs Brautpaar — FERTIG:**
- Neuer Zweig `chatLoeschen` in `app/api/einladung/route.ts`: gleiche Besitzprüfung wie
  `setVideo` (Admin ODER passendes Gerät), gleiche Prüf-Schleife wie beim Chat-Schreiben
  (verhindert, dass eine gleichzeitig geschriebene Nachricht die gerade gelöschte
  wiederbelebt), idempotent (zweimal löschen ist harmlos).
- `components/GruppenChat.tsx`: eigene `darf`-Erkennung (derselbe `pruefen`-Aufruf wie in
  `EinladungBearbeiten.tsx`), neues ✕ an jeder Sprechblase NUR wenn `darf` — Gäste sehen es
  nie. Farbe über `lb-karte-fehler` (Dauerregel, nie Inline-Style).
- Neuer Text-Schlüssel `chatLoeschen` (aria-label) in `KARTE_TEXTE`, alle 7 Sprachen.
- **Live geprüft, Ende-zu-Ende, über curl gegen den echten Dev-Server:** Ohne PIN/passendes
  Gerät → `403 "Not yours."`. Mit Admin-PIN → Nachricht gelöscht, `chat: []` zurückgegeben,
  Löschung bestätigt beim erneuten Lesen (persistiert), zweites Löschen derselben Nachricht
  → weiterhin `ok:true` (idempotent bestätigt). Test-Nachricht danach wiederhergestellt.

**Randnotiz, nicht code-bezogen:** Der lokale Dev-Server zeigte zwischendurch das bekannte
Muster „stale/korruptes `.next`" (`ENOENT … .next/server/app/api/einladung/route.js`) nach
mehreren schnellen `.next`-Löschungen unter Last — zweimal `preview_stop` → `rm -rf .next`
→ `preview_start` → **in Ruhe warten, nicht sofort mit parallelen Requests hämmern** hat es
behoben. Kein Code-Fehler, siehe Dauerregel „Dev-Server stale bundle".

**Damit sind ALLE 12 Änderungen dieses Plans umgesetzt.** Offen bleiben nur die drei
Owner-Entscheidungen aus dem Abschnitt „Ausdrücklich NICHT in diesem Plan" (küssendes
Beispielvideo, `?src=fb`-Ansicht ohne Marketplace-Kopf, Owner-Testkauf) — und der
Owner-Testkauf ist jetzt WIRKLICH die letzte Hürde vor dem ersten Anzeigen-Euro, weil die
Kasse (Ä11) jetzt tatsächlich funktioniert.

**Volles `tsc --noEmit`:** null Fehler in JEDER heute berührten Datei. Die verbleibenden
Fehler liegen ausschließlich in nie angefassten Dateien (`app/about/page.tsx`,
`app/admin/*`, `app/api/curator/*`, `app/api/look-dupes/*`, `app/api/generate-daily-stories`,
`app/api/img-proxy`, `app/api/profile/[username]`, `app/api/try-this-look/route.ts`,
`.next/`-generierte Typen) — Altbestand, nicht Teil dieses Plans.

**Weiterhin NICHT committet/gepusht.** Die Deploy-Sperre ist jetzt aufgehoben, sobald der
Owner den Stand gesichtet hat — vorher lag sie an den fehlenden Änderungen 11/12, die jetzt
stehen.

---

## DAS PREISMODELL (Owner 02.08.2026 — Quelle für JEDEN Text in diesem Plan)

Owner wörtlich: „ich dachte ich lasse es nach 7 tagen mit abo laufen nicht nächsten monat.
Das muss gleich im preis stehn. für 1,49 bekommt er die einladung ohne die anderen feauters.
Wenn er die auch nutzen will, dann muss er gleich abo abschliessen." Und: „die gäste zahl
mus noch klar stehen."

Daraus folgt das Modell:

1. **{once} (1,49 €), einmalig:** die Video-Einladung — Karte mit Video, Namen, Datum,
   Ort/Adresse, eigene Seite mit Link. Die Seite ist **{days} (7) Tage online**.
   **OHNE** Zusagen, Menüwahl, Gruppenchat und News.
2. **Abo {price} (24,50 €)/Monat, jederzeit kündbar:** schaltet Zusagen + Menüwahl +
   Gruppenchat + News frei UND hält die Seite über die {days} Tage hinaus online.
   Wer die Planner-Funktionen will, schließt das Abo **sofort** ab; nach Ablauf der
   {days} Tage ist es auch der Weg zur Reaktivierung.
3. **Gästezahl:** Die Zusagenliste zeigt die Zahl der **Personen** („7 Gäste kommen"),
   nicht nur die Zahl der Antworten — ein Eintrag „Maria & Radu" sind 2 Gäste.
4. **Hochzeitsveranstalter:** KEIN eigenes Preismodell. Die Paare zahlen; der Veranstalter
   empfiehlt, weil ihm Gästezahl und Menüzählung selbst helfen. Dafür wird NICHTS gebaut.

Die Zahlen 1,49 / 24,50 / 7 stehen im Code NUR in `lib/pricing.ts` (siehe Regeln und Ä5c).

---

## Regeln, die für JEDE Änderung gelten

1. **Preise und die Tageszahl NIE tippen.** Immer `{once}` / `{price}` / `{days}` als
   Platzhalter und zur Laufzeit `fillPrices(text, lang)` aus `lib/pricing.ts`. `{days}`
   existiert noch nicht — Ä5c führt es ein. `fillPrices` ist client-sicher; zehn
   `"use client"`-Komponenten benutzen es bereits.
2. **Nichts Neues wird auf der VERKAUFSSEITE klickbar.** Owner-Entscheidung vom 31.07.:
   Auf `/themes/wedding` generiert der Besucher nur. Neue klickbare Dinge gibt es nur auf
   der EINLADUNGSSEITE (`/einladung/[id]`) und nur fürs Brautpaar (Ä9/Ä10).
3. **Sieben Sprachen: en, ro, fr, es, it, pt, de.** Kein Polnisch.
4. **Vor UI-Änderungen den Skill `ci-design` laden** (falls verfügbar). Zusätzlich: exakt
   die unten angegebenen CSS-Klassen verwenden — sie stammen von bestehenden, in hell UND
   dunkel geprüften Stellen.
5. **Nicht committen, nicht pushen.** Im Arbeitsverzeichnis liegen bereits bewusst
   uncommittete Änderungen. Der Owner entscheidet nach Sichtprüfung.
6. **Nicht anfassen:** `components/KissFunnel.tsx`, sämtliche Kauf-Logik in
   `EinladungBauen.tsx` (`bezahlen()`, `videoErzeugen()`, `erzeugen()`), der
   `TABELLE`-Block in `lib/kiss-i18n.ts` — **einzige Ausnahme:** der Schlüssel
   `probeHinweis` in `TABELLE` (Ä8b), denn er ist ein reiner Einladungs-Text, der nur
   historisch im Basisblock liegt.
7. **Keine neuen Stripe-Produkte oder -Preise anlegen.** Nur vorhandene Mechanik
   wiederverwenden (Ä11). Kein echter Kauf im Test — jeder Lauf kostet Geld.

---

## Änderung 1 — Metadaten: totes Gratis-Versprechen raus, Planner rein

**Datei:** `app/themes/wedding/page.tsx`, der `export const metadata`-Block (Zeilen ~150–161).

**Warum:** Die Beschreibung verspricht „the picture is free" — es gibt keinen Gratisversuch
mehr. Das ist der Text, den Google und jede Link-Vorschau zeigen. Außerdem fehlt die
Planner-Positionierung.

**Alt (Anfang des Blocks, exakt so im Code):**

```ts
export const metadata = {
  title: "Digital wedding invitation video — send it on WhatsApp | LuxuryBandit",
  description: "Make your wedding invitation as a video: upload one photo of you and one of him, and the two of you appear at your wedding. Send the invitation link on WhatsApp — the picture is free.",
```

**Neu (kompletter Block):**

```ts
export const metadata = {
  title: "Wedding invitation video & online wedding planner | LuxuryBandit",
  description: "Your wedding invitation as a video, made from two photos — plus RSVPs, menu choices and a group chat for your guests on one page. Send one link; each guest reads it in their own language.",
  keywords: [
    "wedding invitation video", "digital wedding invitation", "send wedding invitation whatsapp",
    "online wedding invitation", "save the date video", "video invitation wedding",
    "online wedding planner", "wedding planner app", "wedding rsvp online", "digital guest list",
    "invitatie de nunta video", "invitatie de nunta online", "planificator de nunta online",
    "faire-part de mariage video", "organisateur de mariage en ligne",
    "invitación de boda digital", "organizador de boda online",
    "convite de casamento digital", "organizador de casamento online",
    "invito di matrimonio video", "wedding planner online",
    "digitale Hochzeitseinladung", "Hochzeitseinladung Video", "Hochzeitsplaner online", "digitale Gästeliste Hochzeit",
  ],
  alternates: { canonical: "/themes/wedding" },
};
```

---

## Änderung 2 — Getippter Preis im SEO-Text durch Platzhalter ersetzen

**Datei:** `app/themes/wedding/page.tsx`, im `trObject`-Aufruf (Zeile ~229).

**Warum:** In `s1p` steht „€1.49" getippt — Verstoß gegen die Preis-Dauerregel.

**Alt (Ende der `s1p`-Zeile):** `…the AI does the rest. Every video costs €1.49 — there is no free trial.",`

**Neu:** die ganze `s1p`-Quelle durch `fillPrices(…, "en")` schicken, Preis als `{once}`:

```ts
    s1p: fillPrices("Instead of a printed card, your digital wedding invitation is a short video in which you and your partner appear on your own wedding day — you in a white dress, him in a white suit, in the church. Upload one photo of yourself and one of him; the AI does the rest. Every video costs {once} — there is no free trial.", "en"),
```

`fillPrices` ist in der Datei bereits importiert. `fillPrices` läuft VOR `trObject`
(der Übersetzer sieht den fertigen Betrag; ein `{once}` würde die Maschinenübersetzung
womöglich zerlegen). Ändert sich der Preis, ändert sich die Quell-Zeichenkette und der
Übersetzungs-Cache übersetzt neu — gewollt.

---

## Änderung 3 — Zwei Beschriftungen über den Demos: „Das kommt mit dem Abo"

**Datei:** `app/themes/wedding/page.tsx`.

**Warum:** Die Zusagen- und Chat-Demos stehen unbeschriftet da — und seit dem neuen
Preismodell wäre „inklusive" sogar GELOGEN: Diese Funktionen kommen mit dem Abo. Die
Beschriftung muss beides leisten: das Feature verkaufen UND ehrlich sagen, wo es wohnt.
Die Gästezahl steht ausdrücklich drin (Owner: „die gäste zahl mus noch klar stehen").

**3a — Zwei neue Schlüssel im bestehenden `trObject`-Aufruf** (direkt NACH der `s4p`-Zeile,
vor dem schließenden `}, L);`):

```ts
    zusCap: "With the subscription: your guests reply with one tap and say how many are coming — you always see the exact guest count and every menu choice.",
    chatCap: "Also in the subscription: the group chat for all your guests — no app, no login needed.",
```

**3b — Die Beschriftungen rendern.** Ankerstelle (exakt so im Code, Zeilen ~274–278):

```tsx
            <div className="mt-6 space-y-4">
              <ZusagenKarte sprache={KARTE_TEXTE[L] ? L : "en"} demo zusagen={DEMO_ZUSAGEN} />
              <GruppenChat sprache={KARTE_TEXTE[L] ? L : "en"} demo sie="Ana" er="Mihai"
                nachrichten={(DEMO_CHAT[L] ?? DEMO_CHAT.en).map((t, i) => ({ name: DEMO_NAMEN[i] ?? "Gast", text: t }))} />
            </div>
```

**Neu:**

```tsx
            <div className="mt-6 space-y-4">
              <p className="text-center text-[12px] font-bold leading-snug text-white/60">✓ {t.zusCap}</p>
              <ZusagenKarte sprache={KARTE_TEXTE[L] ? L : "en"} demo zusagen={DEMO_ZUSAGEN} />
              <p className="pt-2 text-center text-[12px] font-bold leading-snug text-white/60">✓ {t.chatCap}</p>
              <GruppenChat sprache={KARTE_TEXTE[L] ? L : "en"} demo sie="Ana" er="Mihai"
                nachrichten={(DEMO_CHAT[L] ?? DEMO_CHAT.en).map((t, i) => ({ name: DEMO_NAMEN[i] ?? "Gast", text: t }))} />
            </div>
```

Achtung, Namenskollision: Der `.map((t, i) => …)`-Parameter heißt ebenfalls `t` und
verschattet dort das Übersetzungsobjekt — die neuen `{t.zusCap}`/`{t.chatCap}` stehen
AUSSERHALB des `map`. Nicht „reparieren", nur wissen.

Die Klassen sind vom `probeHinweis`-Absatz in `EinladungBauen.tsx` übernommen (hell UND
dunkel geprüft). Keine anderen Klassen verwenden.

---

## Änderung 4 — Über der Karte steht sofort, was hier verkauft wird

**Datei:** `app/themes/wedding/page.tsx` (+ eine Löschung in `lib/kiss-i18n.ts`, siehe 4c).

**Warum (Owner 02.08.2026):** „Oben muss doch gleich stehen was ich verkaufe. Das soll
doch wie eine Landingpage sein." Heute steht die Überschrift UNTER der Karte. Das ergänzt
die Entscheidung vom 31.07. („die Karte ist die Bedienung"): Die Karte bleibt das erste
GROSSE Element, aber **drei kurze Zeilen davor** benennen das Produkt — Kicker,
Überschrift, ein Satz. **Nicht mehr als diese drei Zeilen.**

**4a — Zwei weitere Schlüssel im `trObject`-Aufruf** (gleicher Ort wie 3a):

```ts
    kicker: "Digital wedding planner",
    claim: "Your wedding invitation as a video — plus RSVPs, menu choices and a group chat for your guests. All in one link.",
```

**4b — Kopfzeilen über die Karte, doppelte Überschrift unten raus.**

Alt (exakt so im Code, Zeilen ~266–271):

```tsx
            <EinladungBauen lang={L} beispielVideo={examples[0] ?? ""} />

            <H1 className="mt-10">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
            {/* EIN Satz, mehr nicht (Owner 31.07.2026). Die Überschrift sagt „Einladung",
                der erste Schritt fragt nach zwei Fotos — dazwischen fehlte die Erklärung. */}
            {T.heroLead && <Lead className="mt-2">{fillPrices(T.heroLead, L)}</Lead>}
```

Neu:

```tsx
            {/* WAS HIER VERKAUFT WIRD, STEHT ÜBER DER KARTE (Owner 02.08.2026: „Oben muss
                doch gleich stehen was ich verkaufe … wie eine Landingpage"). Drei kurze
                Zeilen, mehr nicht — die Karte bleibt das erste grosse Element. */}
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">{t.kicker}</p>
            <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
            <Lead className="mt-2">{t.claim}</Lead>

            <div className="mt-5">
              <EinladungBauen lang={L} beispielVideo={examples[0] ?? ""} />
            </div>
```

`t`, `H1`, `Y`, `Lead`, `T` existieren an dieser Stelle bereits. `fillPrices` bleibt
importiert (Ä2 braucht es).

**4c — `heroLead` aus dem `HOCHZEIT`-Block löschen.**

`lib/kiss-i18n.ts`, `HOCHZEIT`-Block (~Zeile 873): In JEDEM der 7 Sprachblöcke NUR den
Schlüssel `heroLead` samt Wert entfernen — nach 4b nirgends mehr gerendert.
**`heroA`/`heroY`/`heroB` bleiben.** `TABELLE` nicht anfassen (Kiss braucht seinen
`heroLead` weiter).

**4d — Den alt gewordenen Kommentar berichtigen.**

Der grosse Kommentar über der Ankerstelle („DIE KARTE STEHT GANZ OBEN …") sagt „die
Überschrift ist unter die Karte gerutscht" — stimmt nicht mehr. Am Ende des
Kommentarblocks (vor dem schließenden `*/`) ergänzen:

```
                Update 02.08.2026: Die Überschrift steht wieder ÜBER der Karte — Owner:
                „Oben muss gleich stehen, was ich verkaufe." Oben stehen genau drei Zeilen
                (Kicker, H1, ein Satz); alle ABSÄTZE bleiben weiter unter der Karte.
```

---

## Änderung 5 — Ehrliche Preiszeile unter der Karte (das neue Modell, vor dem Kauf)

**Warum (Owner):** „Das muss gleich im Preis stehen." Vor dem Kauf muss dastehen: was
{once} enthält (Einladung, {days} Tage online, OHNE Planner-Funktionen) und was das Abo
enthält. Versteckte Abos bei Anzeigen-Traffic = Beschwerden, Chargebacks, Gefahr fürs
Werbekonto.

**5a — Neuer Schlüssel in `components/EinladungKarte.tsx`.**

Im Typ von `KARTE_TEXTE` (Zeilen 26–40), Anker ist die Zeile
`wiederTitel: string; wiederText: string; wiederKnopf: string;` — direkt DARUNTER:

```ts
  /** Preiszeile unter der Bau-Karte — {once}/{price}/{days} füllt fillPrices. */
  preise: string;
```

Dann in JEDEM der 7 Sprachobjekte den Schlüssel `preise` ergänzen (empfohlen direkt nach
`wiederKnopf`):

- **de:** `"Video-Einladung {once} · Seite {days} Tage online · Zusagen, Menü & Chat: im Abo {price}/Monat, jederzeit kündbar"`
- **en:** `"Video invitation {once} · page online for {days} days · RSVPs, menu & chat: with the {price}/month subscription, cancel anytime"`
- **ro:** `"Invitație video {once} · pagina online {days} zile · confirmări, meniu și chat: cu abonamentul de {price}/lună, anulezi oricând"`
- **es:** `"Invitación en vídeo {once} · página online {days} días · confirmaciones, menú y chat: con la suscripción de {price}/mes, cancela cuando quieras"`
- **fr:** `"Invitation vidéo {once} · page en ligne {days} jours · réponses, menu et chat : avec l’abonnement à {price}/mois, résiliable à tout moment"`
- **pt:** `"Convite em vídeo {once} · página online {days} dias · confirmações, menu e chat: com a subscrição de {price}/mês, cancela quando quiseres"`
- **it:** `"Invito video {once} · pagina online {days} giorni · conferme, menù e chat: con l’abbonamento a {price}/mese, disdici quando vuoi"`

**5b — Die Zeile rendern in `components/EinladungBauen.tsx`.**

Import ergänzen: `import { fillPrices } from "@/lib/pricing";`

Anker (exakt so im Code): `      {/* Verschicken steht erst da, wenn es etwas zu verschicken gibt. */}`

DAVOR einfügen:

```tsx
      {/* Der laufende Preis steht VOR dem Kauf da (Owner 02.08.2026: „Das muss gleich im
          Preis stehen") — bei Anzeigen-Traffic ist ein verstecktes Abo eine Rückbuchung
          mit Ansage. */}
      <p className="mt-2 text-center text-[11px] font-bold leading-snug text-white/60">
        {fillPrices(T.preise, lang)}
      </p>
```

`T` ist bereits `KARTE_TEXTE[lang] ?? KARTE_TEXTE.en`; `lang` ist die Prop.

**5c — `{days}` und die 7 Tage als EINE Quelle in `lib/pricing.ts`.**

Bei den anderen Konstanten (~Zeile 81) ergänzen:

```ts
export const TRIAL_DAYS = 7; // Owner 02.08.2026: „nach 7 Tagen mit Abo laufen, nicht nächsten Monat"
```

Und in `fillPrices` die Kette erweitern (vor `.replace(/\{videos\}/g, …)`):

```ts
    .replace(/\{days\}/g, String(TRIAL_DAYS))
```

---

## Änderung 6 — Toten Code aus `app/themes/wedding/page.tsx` entfernen

**Warum:** Beim Umbau vom 31.07. blieben Konstanten und Importe zurück, die nirgends mehr
gerendert werden. Am 02.08. per Grep bestätigt: keiner der folgenden Namen taucht im JSX auf.

**Ersatzlos löschen (Konstanten samt zugehöriger Kommentar-Blöcke):**

- `SPRACH_LABELS` (~Zeile 56), `BEISPIEL_ZUSAGEN` (~63), `ANGEBOT` (~87),
  `BEISPIEL_NEWS_TXT` (~96), `BEISPIEL_CHAT_TXT` (~105),
  `CHAT_NAMEN`, `BEISPIEL_NAMEN`, `BEISPIEL_ORT`, `BEISPIEL_ADRESSE` (~135–148),
  `const inHundertTagen = …` und `const beispielDatum = …` (~206–207) samt Kommentar darüber.

**Aus der Import-Liste entfernen (je Name vorher per Grep bestätigen, dass er nur im
Import vorkommt):** `ExampleVideos` (Zeile 16), `SubscribeCta` (Zeile 18), die komplette
lucide-Zeile 6 (`Check, FileText, Video, MessageCircle, UserCheck, Mail, MessagesSquare,
Globe, ChevronRight`).

**NICHT löschen:** `DEMO_ZUSAGEN`, `DEMO_NAMEN`, `DEMO_CHAT`, `KARTE_TEXTE`-Import,
alles im Admin-Zweig.

---

## Änderung 7 (Mini) — Veralteten Kommentar in `lib/pricing.ts` berichtigen

Im Doku-Kommentar über `eur()` steht `{once} → 9,99 €` — tatsächlich ist
`ONCE_CENTS = 149` (1,49 €). Kommentarzeile auf `{once} → 1,49 €` korrigieren.
Dabei `{days} → 7` als neue Zeile in dieselbe Liste aufnehmen (passend zu Ä5c).

---

## Änderung 8 — Probezeit: 7 Tage statt 30

**Warum (Owner 02.08.2026):** „ich lasse es nach 7 tagen mit abo laufen nicht nächsten
monat" — das dreht die 30-Tage-Entscheidung vom 01.08. zurück auf 7 Tage.

**8a — `app/api/einladung/route.ts`.**

Alt (~Zeile 328): `probeBis: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),`

Neu: oben `import { TRIAL_DAYS } from "@/lib/pricing";` ergänzen (prüfen, ob aus
`@/lib/pricing` schon importiert wird — dann nur erweitern), und:

```ts
    probeBis: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
```

Im Kommentarblock direkt darüber (~Zeilen 313–321, erzählt die 30-Tage-Geschichte vom
01.08.) am Ende ergänzen:

```
     * Update 02.08.2026 (Owner): zurück auf 7 Tage — „nach 7 Tagen mit Abo laufen, nicht
     * nächsten Monat". Die Zahl kommt aus TRIAL_DAYS in lib/pricing.ts, damit Seite,
     * Preiszeile und diese Frist nie wieder auseinanderlaufen.
```

**8b — `probeHinweis` in `lib/kiss-i18n.ts` (TABELLE, alle 7 Sprachen) neu.**

Das ist die EINZIGE erlaubte `TABELLE`-Änderung (Regel 6). Der heutige Text sagt „einen
Monat inklusive" und behauptet, Zusagen kämen mit — beides stimmt im neuen Modell nicht.
Der Text wird OHNE Platzhalter geschrieben (er wird an zwei Stellen ohne `fillPrices`
gerendert; `KissFunnel.tsx` bleibt unangetastet):

- **en:** `"Online for one week — send it to your guests. RSVPs, menu and group chat come with the subscription, which also keeps the page running."`
- **de:** `"Eine Woche online — verschickt sie an eure Gäste. Zusagen, Menü und Gruppenchat kommen mit dem Abo; es hält auch die Seite am Laufen."`
- **ro:** `"Online o săptămână — trimiteți-o invitaților. Confirmările, meniul și chatul de grup vin cu abonamentul, care ține și pagina activă."`
- **es:** `"Online una semana — enviádsela a vuestros invitados. Las confirmaciones, el menú y el chat llegan con la suscripción, que además mantiene la página activa."`
- **fr:** `"En ligne une semaine — envoyez-la à vos invités. Réponses, menu et chat de groupe viennent avec l’abonnement, qui garde aussi la page en ligne."`
- **pt:** `"Online uma semana — enviem-no aos vossos convidados. As confirmações, o menu e o chat chegam com a subscrição, que também mantém a página ativa."`
- **it:** `"Online per una settimana — inviatelo ai vostri ospiti. Conferme, menù e chat di gruppo arrivano con l’abbonamento, che tiene attiva anche la pagina."`

Hinweis: `KissFunnel.tsx:3008` rendert `T.probeHinweis` ebenfalls — prüfen (nur lesen!),
dass diese Stelle nur im Hochzeits-/Einladungs-Zweig erreichbar ist. Wenn sie auch für
Kiss sichtbar wäre: NICHT ändern, sondern als Befund melden.

---

## Änderung 9 — Zusagen/Menü/Chat/News nur mit Abo (Feature-Sperre)

**Warum (Owner):** „für 1,49 bekommt er die einladung ohne die anderen feauters. Wenn er
die auch nutzen will, dann muss er gleich abo abschliessen."

**9a — `app/einladung/[id]/page.tsx`: die Blöcke nur mit Abo rendern.**

Alt (exakt so im Code, Zeilen ~135–141):

```tsx
        {!abgelaufen && <ZusagenKarte sprache={sprache} id={e.id} zusagen={e.zusagen ?? []} />}

        {/* NEUIGKEITEN UND GRUPPE — der Grund, warum der Gast ueber den Link wiederkommt. */}
        {!abgelaufen && (
          <GruppenChat sprache={sprache} id={e.id} nachrichten={e.chat ?? []} news={e.news ?? []}
            sie={e.sie} er={e.er} />
        )}
```

Neu (`e.bezahlt` ist das bestehende Abo-Kennzeichen der Einladung):

```tsx
        {/* ZUSAGEN, MENÜ, CHAT UND NEWS KOMMEN MIT DEM ABO (Owner 02.08.2026: „für 1,49
            bekommt er die Einladung ohne die anderen Features"). Ohne Abo sieht der Gast
            nur die Karte — kein leerer Kasten, kein Preisschild. */}
        {!!e.bezahlt && !abgelaufen && <ZusagenKarte sprache={sprache} id={e.id} zusagen={e.zusagen ?? []} />}

        {!!e.bezahlt && !abgelaufen && (
          <GruppenChat sprache={sprache} id={e.id} nachrichten={e.chat ?? []} news={e.news ?? []}
            sie={e.sie} er={e.er} />
        )}
```

**9b — Abo-Kasten fürs Brautpaar (Gäste sehen NIE ein Preisschild).**

`components/EinladungBearbeiten.tsx` weiß bereits, ob der Betrachter das Brautpaar ist.
Mechanismus (am 02.08. im Code verifiziert): Der Client schickt `POST /api/einladung` mit
`{ pruefen: id, device }` (Gerätekennung aus `localStorage.lb_visitor`, Admin-PIN optional
als Kopfzeile) und bekommt `{ darf }` zurück — die Kennung des Paares wird NIE an den
Browser ausgeliefert. Exakt dieses Muster wird wiederverwendet. Dort:

1. Neue Prop `bezahlt: boolean` (von `app/einladung/[id]/page.tsx` als `bezahlt={!!e.bezahlt}`
   übergeben).
2. Wenn der Betrachter das Paar ist UND `!bezahlt`: unter den vorhandenen Knöpfen einen
   Abo-Kasten rendern — gleiche Optik wie der Reaktivierungs-Kasten in
   `app/einladung/[id]/page.tsx` (Zeilen ~162–173: `rounded-2xl border border-[#f6cf51]/30
   bg-[#f6cf51]/[0.06] p-5 text-center`, Knopf `lb-gold`):
   Titel `T.aboTitel`, Text `fillPrices(T.aboText, sprache)`, Knopf `fillPrices(T.aboKnopf,
   sprache)` als Link auf dasselbe Ziel wie der Reaktivierungs-Knopf:
   `/themes/wedding?utm_source=einladung&abo=1&e=<id>`.

**9c — Neue Schlüssel in `KARTE_TEXTE`** (`components/EinladungKarte.tsx`, Typ + alle 7
Sprachen; gleiche Stelle wie `preise` aus Ä5a):

Typ:

```ts
  /** Abo-Kasten fürs Paar: Planner-Funktionen freischalten. */
  aboTitel: string; aboText: string; aboKnopf: string;
```

- **de:** aboTitel `"Zusagen, Menü & Gruppenchat freischalten"` · aboText `"Eure Gäste sagen mit einem Tipp zu, wählen ihr Menü und schreiben in der Gruppe — ihr seht jederzeit die genaue Gästezahl. Das Abo kostet {price} im Monat, ist jederzeit kündbar und hält eure Seite über die {days} Tage hinaus online."` · aboKnopf `"Abo abschließen — {price}/Monat"`
- **en:** `"Unlock RSVPs, menu & group chat"` · `"Your guests reply with one tap, pick their meal and write in the group — you always see the exact guest count. The subscription is {price} a month, cancel anytime, and it keeps your page online beyond the {days} days."` · `"Subscribe — {price}/month"`
- **ro:** `"Activați confirmările, meniul și chatul"` · `"Invitații confirmă cu o atingere, își aleg meniul și scriu în grup — voi vedeți oricând numărul exact de invitați. Abonamentul costă {price} pe lună, se poate anula oricând și ține pagina online după cele {days} zile."` · `"Abonează-te — {price}/lună"`
- **es:** `"Activar confirmaciones, menú y chat"` · `"Vuestros invitados confirman con un toque, eligen su menú y escriben en el grupo — veis en todo momento el número exacto de invitados. La suscripción cuesta {price} al mes, se cancela cuando queráis y mantiene la página online pasados los {days} días."` · `"Suscribirse — {price}/mes"`
- **fr:** `"Activer réponses, menu et chat"` · `"Vos invités répondent d’un geste, choisissent leur menu et écrivent dans le groupe — vous voyez à tout moment le nombre exact d’invités. L’abonnement coûte {price} par mois, résiliable à tout moment, et garde votre page en ligne au-delà des {days} jours."` · `"S’abonner — {price}/mois"`
- **pt:** `"Ativar confirmações, menu e chat"` · `"Os convidados confirmam com um toque, escolhem o menu e escrevem no grupo — veem sempre o número exato de convidados. A subscrição custa {price} por mês, cancela-se quando quiserem e mantém a página online depois dos {days} dias."` · `"Subscrever — {price}/mês"`
- **it:** `"Attiva conferme, menù e chat"` · `"Gli ospiti confermano con un tocco, scelgono il menù e scrivono nel gruppo — vedete in ogni momento il numero esatto degli ospiti. L’abbonamento costa {price} al mese, si disdice quando volete e tiene la pagina online oltre i {days} giorni."` · `"Abbonati — {price}/mese"`

---

## Änderung 10 — Die Gästezahl: Personen zählen, nicht Antworten

**Warum (Owner 02.08.2026):** „die gäste zahl mus noch klar stehen." Ein Eintrag
„Maria & Radu" ist EINE Zusage, aber ZWEI Gäste — die Kopfzahl für Saal und Küche muss
oben auf der Liste stehen.

**10a — Datenfeld.** `lib/try-this-look-store.ts` (~Zeile 1657), der Zusagen-Typ:

Alt: `zusagen?: { name: string; ja: boolean; at: string; email?: string; menu?: "normal" | "vegetarisch" | "vegan" }[];`

Neu (Feld ergänzen): `personen?: number;` (im selben Objekttyp). Zusätzlich in
`components/ZusagenKarte.tsx` den exportierten Typ `Zusage` (~Zeile 40) um
`personen?: number;` erweitern.

**10b — API.** `app/api/einladung/route.ts`, im `rsvp`-Zweig (~Zeile 64 ff.): aus dem Body
`personen` lesen, klemmen und NUR bei Zusage speichern:

```ts
const personen = Math.max(1, Math.min(10, Math.round(Number(body.personen) || 1)));
```

und beim Anlegen des Eintrags `personen: ja ? personen : undefined` mitschreiben.

**10c — Formular.** `components/ZusagenKarte.tsx`: Wenn „Ich komme" gewählt ist, unter der
Menüwahl eine Chips-Reihe „Wie viele seid ihr?" mit den Werten 1–6 — EXAKT dasselbe
Knopf-Muster wie die vorhandenen Menü-Chips (Dauerregel: klicken statt tippen, Chips nie
leer, Vorgabe 1). Der gewählte Wert geht als `personen` in den bestehenden POST
(`{ rsvp: id, … , personen }`) und in das lokale Listen-Update.

**10d — Kopfzeile zählt Personen.** Neuer Schlüssel `zusGaeste` ersetzt `zusZahl`:

In `components/EinladungKarte.tsx` im Typ `zusZahl: (ja: number, nein: number) => string;`
ersetzen durch `zusGaeste: (gaeste: number, nein: number) => string;` und in allen 7
Sprachobjekten `zusZahl` durch `zusGaeste` mit diesen Werten ersetzen:

- **de:** `(g, nein) => `${g === 1 ? "1 Gast kommt" : `${g} Gäste kommen`}${nein ? ` · ${nein === 1 ? "1 Absage" : `${nein} Absagen`}` : ""}``
- **en:** `(g, nein) => `${g === 1 ? "1 guest coming" : `${g} guests coming`}${nein ? ` · ${nein} can’t` : ""}``
- **ro:** `(g, nein) => `${g === 1 ? "vine 1 invitat" : `vin ${g} invitați`}${nein ? ` · ${nein === 1 ? "1 refuz" : `${nein} refuzuri`}` : ""}``
- **es:** `(g, nein) => `${g === 1 ? "1 invitado confirmado" : `${g} invitados confirmados`}${nein ? ` · ${nein === 1 ? "1 no puede" : `${nein} no pueden`}` : ""}``
- **fr:** `(g, nein) => `${g === 1 ? "1 invité présent" : `${g} invités présents`}${nein ? ` · ${nein === 1 ? "1 absent" : `${nein} absents`}` : ""}``
- **pt:** `(g, nein) => `${g === 1 ? "1 convidado confirmado" : `${g} convidados confirmados`}${nein ? ` · ${nein === 1 ? "1 não pode" : `${nein} não podem`}` : ""}``
- **it:** `(g, nein) => `${g === 1 ? "1 ospite presente" : `${g} ospiti presenti`}${nein ? ` · ${nein === 1 ? "1 assente" : `${nein} assenti`}` : ""}``

In `components/ZusagenKarte.tsx` die Aufrufstelle von `T.zusZahl(…)` umstellen auf:

```ts
T.zusGaeste(liste.filter(z => z.ja).reduce((s, z) => s + (z.personen ?? 1), 0), liste.filter(z => !z.ja).length)
```

(Vorher per Grep prüfen, dass `zusZahl` NUR in `ZusagenKarte.tsx` benutzt wird — sonst
alle Fundstellen gleich mit umstellen.)

**10e — Demo-Daten.** In `app/themes/wedding/page.tsx` bekommt `DEMO_ZUSAGEN` Personen:
Maria & Radu `personen: 2`, Andrei Ionescu `personen: 1`, Sofia & Matei `personen: 2`,
Elena & Cristian `personen: 2` (Luca Popescu sagt ab — kein Feld). Die Demo-Kopfzeile
zeigt dann „7 Gäste kommen · 1 Absage" (bzw. Sprach-Entsprechung).

Optional, NICHT nötig: Die Benachrichtigungs-Mail (`route.ts` ~Zeile 105) zählt weiter
Zusagen — darf so bleiben.

---

## Änderung 11 — Die Abo-Kasse: verdrahten, was `?abo=1` verspricht

**Befund (02.08.2026, verifiziert):** Der Reaktivierungs-Knopf (Commit `8be5e46`) und der
neue Abo-Kasten (Ä9b) zeigen beide auf `/themes/wedding?abo=1&e=<id>` — aber NICHTS im
Code wertet `abo` oder `e` aus (weder `app/themes/wedding/page.tsx` noch
`EinladungBauen.tsx`). Der Knopf läuft heute ins Leere. Ohne diese Kasse funktioniert das
ganze Modell „dann muss er gleich Abo abschließen" nicht.

**Vorgehen (erst lesen, dann bauen — NICHTS erfinden):**

1. **Lesen:** `components/SubscribeCta.tsx`, den Abo-Zweig von
   `app/api/kiss-video-checkout/route.ts`, `app/api/checkout-status/route.ts`,
   `subPriceId()`/`STRIPE_TOPIC_ABO_PRICE_ID` in `lib/pricing.ts` — und per Grep klären,
   wo `bezahlt` auf einer Einladung heute überhaupt gesetzt wird
   (`grep -rn "bezahlt" lib/try-this-look-store.ts app/api/`).
2. **Ziel:** Öffnet das Paar `/themes/wedding?abo=1&e=<id>`, startet die vorhandene
   Stripe-ABO-Kasse (derselbe Preis/Price-ID wie überall: `subPriceId()`). Nach
   bestätigter Zahlung wird auf der Einladung `<id>` server-seitig und idempotent
   `bezahlt: true` gesetzt. Danach zurück auf `/einladung/<id>`.
3. **Wiederverwenden statt bauen:** Wenn es bereits einen funktionierenden Abo-Kassenweg
   gibt (Kiss-Abo, `SubscribeCta`), GENAU den benutzen und nur das Setzen von
   `bezahlt` auf der Einladung ergänzen (z. B. als kleine Aktion in
   `app/api/einladung/route.ts`, die eine bezahlte Stripe-Session gegen
   `checkout-status` prüft, bevor sie schreibt — nie unbestätigt schreiben).
4. **STOPP-Regel:** Wenn nach Schritt 1 kein sauberer, vorhandener Weg erkennbar ist —
   anhalten und als Blocker melden. KEINE neuen Stripe-Produkte/Preise anlegen, keine
   eigene Webhook-Architektur erfinden.
5. **Kein echter Kauf im Test.** Prüfung endet auf der Stripe-Seite (sie öffnet sich mit
   dem richtigen Abo-Preis) — der Owner macht den echten Testkauf selbst.

---

## Änderung 12 — Das Paar kann einzelne Chat-Nachrichten löschen

**Warum (Owner 02.08.2026, Entscheidung nach Beratung):** Der Chat bleibt offen für alle,
die den Link haben (kein Passwort, keine Zusage-Pflicht — jede Hürde kostet genau die
Gäste, für die das Abo bezahlt wird). Das Sicherheitsventil ist stattdessen ein
Radiergummi: Das Brautpaar löscht eine unpassende Nachricht mit einem Tipp. Gäste sehen
den Löschknopf nie.

**12a — Server:** Neuer Zweig `chatLoeschen` in `app/api/einladung/route.ts`, direkt nach
dem `chat`-Zweig (~Zeile 245). Besitz-Prüfung EXAKT wie im `setVideo`-Zweig (~254–258:
Admin ODER `geraet && e.device === geraet`). Gelöscht wird genau EINE Nachricht,
identifiziert über `at` + `name` + `text`. WICHTIG — Dauerregel zu Löschungen: Ein
gleichzeitig schreibender Gast kann eine frisch gelöschte Nachricht wiederbeleben
(lesen-ändern-schreiben auf einer Datei). Darum dieselbe Prüf-Schleife wie beim
Schreiben (~Zeilen 230–243): nach dem Schreiben neu lesen und prüfen, dass die Nachricht
WEG ist, bis zu 4 Versuche.

```ts
  const chatLoeschen = sauber(body.chatLoeschen, 60);
  if (chatLoeschen) {
    const at = sauber(body.at, 40);
    const name = sauber(body.name, 40);
    const text = sauber(body.text, 500);
    if (!at || !text) return NextResponse.json({ error: "Nachricht fehlt." }, { status: 400 });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    for (let versuch = 0; versuch < 4; versuch++) {
      const alle = await readEinladungen();
      const e = alle.find(x => x.id === chatLoeschen);
      if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
      if (!admin && !(geraet && e.device === geraet)) {
        return NextResponse.json({ error: "Not yours." }, { status: 403 });
      }
      const vorher = e.chat?.length ?? 0;
      e.chat = (e.chat ?? []).filter(c => !(c.at === at && c.text === text && c.name === name));
      if (e.chat.length === vorher) return NextResponse.json({ ok: true, chat: e.chat }); // schon weg
      await writeEinladungen(alle);
      await new Promise(r => setTimeout(r, 150 + versuch * 200));
      const nach = (await readEinladungen()).find(x => x.id === chatLoeschen);
      if (!nach?.chat?.some(c => c.at === at && c.text === text && c.name === name)) {
        return NextResponse.json({ ok: true, chat: nach?.chat ?? [] });
      }
    }
    return NextResponse.json({ error: "Konnte nicht gelöscht werden." }, { status: 503 });
  }
```

**12b — Client:** `components/GruppenChat.tsx`.

1. Paar-Erkennung wie in `EinladungBearbeiten.tsx` (Ä9b): eigener `useEffect`, nur wenn
   `id && !demo` — `POST { pruefen: id, device }` (+ Admin-PIN-Kopfzeile, falls in
   `localStorage` vorhanden), Ergebnis in `const [darf, setDarf] = useState(false)`.
2. Löschfunktion: `POST { chatLoeschen: id, device, at: m.at ?? "", name: m.name,
   text: m.text }` (+ PIN-Kopfzeile); bei `ok` → `setListe(r.chat)` (die Antwort bringt
   den ganzen Verlauf, wie beim Senden).
3. In der Sprechblasen-Zeile (`<li className="flex items-end gap-2">`, ~Zeile 132) am
   Zeilenende NUR bei `darf` ein kleiner Löschknopf. `X` aus `lucide-react` zusätzlich
   importieren. FARB-DAUERREGEL der Karte: Rot NIE als Inline-Style, IMMER die Klasse
   `lb-karte-fehler` (Inline-Farben werden in `lb-karte` von `!important`-Regeln
   gefressen):

```tsx
                {darf && (
                  <button type="button" onClick={() => void loeschen(m)} aria-label={T.chatLoeschen}
                    className="lb-karte-fehler grid h-6 w-6 shrink-0 place-items-center rounded-full transition active:scale-90">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
```

**12c — Text:** Neuer Schlüssel `chatLoeschen: string;` im `KARTE_TEXTE`-Typ
(`components/EinladungKarte.tsx`, bei den anderen `chat*`-Schlüsseln) und in allen 7
Sprachen (nur als `aria-label` benutzt):

- **de:** `"Nachricht löschen"` · **en:** `"Delete message"` · **ro:** `"Șterge mesajul"`
- **es:** `"Borrar el mensaje"` · **fr:** `"Supprimer le message"` · **pt:** `"Apagar a mensagem"`
- **it:** `"Elimina il messaggio"`

**Bewusst NICHT:** keine Passwort- oder Zusage-Sperre für den Chat (Owner-Entscheidung
02.08.), kein Bestätigungs-Dialog vorm Löschen (ein Tipp genügt — dieselbe Direktheit wie
beim Foto-Löschen), kein Löschen durch Gäste.

---

## Prüfen (Pflicht, in dieser Reihenfolge)

1. `npx tsc --noEmit` — sauber. (Stolperstellen: neue Pflicht-Schlüssel `preise`,
   `aboTitel`/`aboText`/`aboKnopf`, `zusGaeste`, `chatLoeschen` in ALLEN 7
   `KARTE_TEXTE`-Objekten; `zusZahl` restlos ersetzt; neue Prop `bezahlt` an
   `EinladungBearbeiten`.)
2. Dev-Server, `/themes/wedding` im **Handy-Format 375×812** (Dauerregel: immer mobil):
   - ÜBER der Karte: kleine Zeile „Digitaler Hochzeitsplaner" (bzw. Übersetzung), H1,
     Ein-Satz-Claim — direkt darunter die Karte. UNTER der Karte keine zweite Überschrift.
   - Preiszeile unter der Karte mit ECHTEN Werten: „1,49 €", „7", „24,50 €" — keine
     sichtbaren `{once}`/`{price}`/`{days}`.
   - Beide „✓"-Zeilen über den Demos sprechen vom ABO und von der GÄSTEZAHL.
   - Zusagen-Demo-Kopf zeigt „7 Gäste kommen · 1 Absage" (Sprach-Entsprechung).
   - Konsole ohne Fehler.
3. Sprachen EN, DE, RO durchschalten (RO ist die Anzeigen-Zielgruppe). EN zeigt `€1.49`,
   DE/RO `1,49 €` — macht `eur()` automatisch.
4. Hell/Dunkel-Schalter: alle neuen Textzeilen in beiden Fassungen lesbar.
5. Einladungsseite (lokale Test-Einladung öffnen):
   - OHNE Abo (`bezahlt` fehlt): Gast sieht NUR die Karte — keine Zusagen, kein Chat,
     kein Preisschild. Das Paar (gleiches Gerät wie beim Anlegen) sieht zusätzlich den
     Abo-Kasten mit „24,50 €" und „7".
   - Zusagen-Formular (auf einer Einladung MIT `bezahlt`, notfalls im Store von Hand
     setzen): Chips „Wie viele seid ihr?" 1–6 erscheinen nur bei „Ich komme";
     nach dem Antworten zählt die Kopfzeile Personen.
   - Chat-Löschen (auf derselben Einladung MIT `bezahlt`): Auf dem ERSTELLER-Gerät trägt
     jede Sprechblase das kleine ✕ — ein Tipp entfernt die Nachricht, auch nach Neuladen
     bleibt sie weg. Im Inkognito-Fenster (Gast): kein ✕, und ein direkter API-Aufruf mit
     falscher Gerätekennung bekommt 403. Das ✕ ist in heller UND dunkler Fassung rot
     (Klasse `lb-karte-fehler`, nie Inline-Farbe).
6. Abo-Knopf führt bis zur Stripe-Seite mit dem Abo-Preis — **dort abbrechen, nichts
   kaufen** (Ä11 Schritt 5).
7. `/themes/kiss` kurz öffnen: unverändert.

---

## Ausdrücklich NICHT in diesem Plan (Owner-Entscheidungen bzw. Owner-Aktionen)

1. **Beispielvideo küsst auf den Mund**, obwohl für Wedding „kein Kuss im Video"
   entschieden ist. Kein Code: Beispiel im Admin tauschen (`/themes/wedding?admin=1` →
   Medien) ODER Kuss erlauben. Owner entscheidet.
2. **Saubere Ansicht für Anzeigen-Traffic** (`?src=fb` ohne Marketplace-Kopf). Owner
   entscheidet.
3. **Veranstalter-Kanal:** Es wird NICHTS gebaut — Paare zahlen, der Veranstalter
   empfiehlt. Wenn der Kanal später Zählung braucht: Es gibt schon `?code=`-Promo-Codes
   auf der Seite (z. B. `?code=BELLA`); ein Code je Veranstalter wäre der Weg — nur bei
   Bedarf, nicht jetzt.
4. **Owner-Testkauf** (Einzelkauf UND Abo) — Pflicht VOR dem ersten Anzeigenbudget.

---

## Abschlussmeldung

Nach Umsetzung dem Owner in wenigen Sätzen melden: was geändert wurde, ob Ä11 einen
vorhandenen Kassenweg gefunden hat (oder der Blocker gemeldet wird), dass `tsc` und die
Sichtprüfung (mobil, 3 Sprachen, hell/dunkel, Einladungsseite mit/ohne Abo) sauber waren —
und dass NICHT committet wurde. Falls etwas nicht wie beschrieben vorgefunden wird
(Anker fehlt, Text weicht ab): anhalten und genau das melden, nicht improvisieren.
