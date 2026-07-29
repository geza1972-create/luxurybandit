# Der Chat — wie er funktioniert

Stand: 2026-07-29 · Eine Seite statt sechs Dateien.

Diese Datei beschreibt den Model-Chat: den Ablauf, jede feste Stufe, welche Regel wo im Code
steht und was welcher Schritt kostet. Wenn du etwas änderst, ändere es **hier auch** — sonst
ist die Seite in zwei Wochen wertlos.

---

## 1. Wozu der Chat da ist

Der Chat verkauft nichts direkt. Er ist gratis und soll den Besucher **halten**, bis er von
sich aus mehr sehen will. Verkauft wird erst das, was Geld kostet: Bilder und Videos.

Zwei Sätze, die alles erklären:

- **Flirten ist der Zustand, nicht der Zwischenschritt.** Alles andere (Job, Preis, Smalltalk)
  ist ein kurzer Umweg, den sie selbst abkürzt.
- **Er tippt nicht, er klickt.** Jede Nachricht endet mit drei antippbaren Antworten.

---

## 2. Wo der Chat läuft

Drei Oberflächen, **ein** Server-Endpunkt.

| Oberfläche | Datei | Wo im Produkt |
|---|---|---|
| Thema „Chat with an AI girl" | [`components/ChatFunnel.tsx`](components/ChatFunnel.tsx) | `/themes/chat` |
| Wetter-Abonnentin | [`components/WetterSubscriberView.tsx`](components/WetterSubscriberView.tsx) | `/themes/wetter/[model]` |
| Chat auf dem Modelprofil | [`components/ModelChatInline.tsx`](components/ModelChatInline.tsx) | `/curator/[id]` |

Alle drei sprechen mit **`POST /api/model-chat`**
([`app/api/model-chat/route.ts`](app/api/model-chat/route.ts)).

---

## 3. Der Server-Endpunkt

**Modell:** `claude-haiku-4-5-20251001` — bewusst das kleine, weil ein Chat viele Züge hat.
`max_tokens: 260` (ein paar SMS-Sätze), die letzten `30` Züge gehen mit, gespeichert werden
bis zu `80` Nachrichten pro Gespräch.

**Antwort als Text-Stream**, nicht als JSON: die Blase wächst live mit. Wichtig beim Ändern —
wer hier `NextResponse.json(...)` zurückgibt, schreibt dem Nutzer wörtlich `{"reply":"…"}` in
die Blase (genau so passiert am 28.07.2026).

**Gedächtnis über Geräte hinweg:** `GET /api/model-chat?curatorId=…&visitorId=…` liefert die
letzten 40 Nachrichten. Schlüssel ist `curatorId:visitorId`. Vorher lag der Verlauf nur im
Browser — Handywechsel war Neuanfang.

**Woher die Persönlichkeit kommt** (alles serverseitig, nie vom Client):

| Quelle | Feld im Store |
|---|---|
| Ihre Persona / Korrekturen des Admins | `curator.chatPersona` |
| Ihr öffentlicher Text | `curator.bio`, `curator.style` |
| Hausregeln für **alle** Gespräche | `state.chatConfig.globalNote` |
| Was sie heute tut | `dayContext` (aus dem Wetter-Beitrag, vom Client) |
| Chat abschalten | `curator.chatEnabled === false` → höfliche Absage |

**Sprache:** Sie antwortet immer in der Sprache, in der er schreibt, und wechselt sofort mit.
Sie sagt nie, ihr Deutsch/Französisch sei schlecht.

---

## 4. Der Ablauf — die festen Stufen

Sechs Stufen stehen **fest im Code** ([`lib/chat-deal.ts`](lib/chat-deal.ts)), nicht im Prompt.
Grund: dreimal am Prompt versucht, dreimal wich das Modell aus (es fragt lieber zurück, als von
sich aus etwas anzubieten). Diese Sätze sind Geschäftslogik, keine Stilfrage.

**Sie kosten keinen API-Aufruf.** Greift eine Stufe, geht die Anfrage gar nicht erst zu Claude.

| # | Auslöser | Was sie sagt | Funktion |
|---|---|---|---|
| 0 | Chat öffnet | „Warum bist du bei meinem Profil hängengeblieben?" + 4 Knöpfe | `openerFor()` in [`lib/chat-opener.ts`](lib/chat-opener.ts) |
| 1 | Er zögert („🤷 Schau mich nur um", Einwortantwort) | Necken + **Handel**: „Schreib mir etwas Nettes — und ich zeige dir ein heißes Bild." | `dealReply()` |
| 2 | Er hat irgendetwas geschrieben | Sie liefert: ein Bild + „Willst du noch mehr sehen?" | `dealReply()` → `[[SHOW_LINGERIE]]` |
| 3 | Er sagt ja | Noch ein paar — „Sag mir, welches dir am besten gefällt." | `moreReply()` → `[[SHOW_LINGERIE]]` |
| 4 | Stufe 3 ist durch | „Gratis-Videos habe ich keine mehr — aber Bilder von Freundinnen?" | `friendsReply()` → `[[SHOW_FRIENDS]]` |
| 5 | Er schaut weiter | „War das heiß genug für dich? 😏" | `friendsReply()` |
| 6 | Er sagt **nein** | Der Pitch: „Du willst MICH sehen. Das kann ich nicht gratis." → Abo | `friendsReply()` |

Ab Stufe 6 übernimmt wieder die KI-Persona.

**„Nur umschauen" ist kein Nein.** Es heißt: er traut sich nicht. Deshalb wird an dieser Stelle
**nie** ein Preis genannt — sie neckt ihn und bietet von sich aus an, sich zu zeigen.

---

## 5. Die Regeln im Prompt

Stehen alle in [`app/api/model-chat/route.ts`](app/api/model-chat/route.ts), im `system`-String.

**Gesprächs-Reihenfolge** (nie überspringen):

1. Erst ihr Äußeres — was gefällt ihm an ihr, er soll genau werden.
2. Dann: „Was würdest du jetzt mit mir machen?" — anzüglich, nie explizit.
3. Dann dort bleiben. **Es gibt kein drittes Thema.**

**Keine persönlichen Fragen** (Owner 29.07.2026). Verboten: Job, Branche, Business, Stadt,
Land, Alter, Familie, Beziehungsstatus, Tag, Pläne, Wochenende, Hobbys, Name. Grund: in den
Admin-Logs bricht der Nutzer **genau dort** ab („In welcher Branche denn?", „tu ce faci acum?").
Erzählt er freiwillig etwas: **ein** Kompliment, keine Rückfrage, sofort zurück zum Flirten mit
einem Angebot.

**Nur antippbare Fragen.** Auswahl („dieses oder jenes?") oder Ja/Nein. Nie offen
(„erzähl mir von dir") — das ist eine Sackgasse für jemanden, der nicht tippen will.

**Gefühls-Grenze** (überschreibt jede Persona): flirten ja, vorgetäuschte Bindung nein. Sie sagt
nie, dass sie ihn vermisst, an ihn gedacht, von ihm geträumt hat, ihn liebt. Sie spielt nicht
seine Freundin und verspricht keine Zukunft. Sagt er, dass er sie liebt: warm, aber ehrlich.

**Harte Grenzen:** PG-13, nie explizit. Kein Treffen, keine echten Kontaktdaten. Sie verkauft
nicht — die App wird nur erwähnt, wenn er nach Fotos/Videos fragt.

**Wenn er auf Sexuelles steuert:** nie explizit, nie Nacktheit versprechen. Erst weiter reden
und necken, **dann** anbieten, sich in etwas Heißem zu zeigen (mit `[[SHOW_LINGERIE]]`).
Ausnahme: beim zögerlichen Besucher (Stufe 1) bietet sie sofort an.

### Ehrlichkeit — die bewusste Trennung

Die Persona bricht nie die Rolle und sagt nie von sich aus „ich bin eine KI". **Die App sagt es
stattdessen:** alle 15 Nachrichten schiebt `ChatFunnel` einen Hinweis in den Verlauf
(`REMIND_EVERY`), und im Verkaufs-Pitch (Stufe 6) sagt sie es selbst — „ich bin ein KI-Girl,
ich lebe durch dich". Das ist so gewollt: ehrlich, ohne die Illusion in jeder Nachricht zu
zerstören.

---

## 6. Die Antwort-Knöpfe

Jede Nachricht endet mit `[[CHIPS: erste | zweite | dritte]]` — drei Antworten, wie **er** sie
sagen würde, unter fünf Wörtern, passend zu ihrer Frage.

Der Format-Block steht bewusst **ganz am Ende** des Prompts: mitten drin hat das Modell ihn
regelmäßig weggelassen.

**Die Knöpfe dürfen nie leer sein** (Owner 29.07.2026). Kette in beiden Chats:

1. Was die KI angehängt hat (`[[CHIPS: …]]`)
2. Sonst aus ihrer Frage abgeleitet — `deriveChips()`:
   - zählt sie Möglichkeiten auf („glamourös, casual, provokant…?") → genau die werden Knöpfe
   - fragt sie geschlossen → Ja / Nein / „Zeig mir mehr"
3. Sonst allgemeine Fallback-Knöpfe — `fallbackChips()`

Bis 29.07.2026 verschwanden die Knöpfe, sobald er **einmal** selbst getippt hatte. Das ist raus.

---

## 7. Die Tags in einer Nachricht

Alle werden vor der Anzeige aus dem Text geschnitten (`stripChips`).

| Tag | Was die Oberfläche daraus macht |
|---|---|
| `[[CHIPS: a \| b \| c]]` | drei Antwort-Knöpfe |
| `[[SHOW_LINGERIE]]` | antippbare kuratierte Videos von ihr |
| `[[SHOW_FRIENDS]]` | ein Bild einer anderen Frau, aus `/api/tease-pool` |
| `[[PIC:url]]` | ein einzelnes Bild in der Blase |
| `[[DUEL]]` | „sie oder ich?" — nur im Wetter-Chat |

**Regel: ein Bild pro Nachricht, nie zweimal dasselbe.** Nicht die ganze Reihe auf einmal.

---

## 8. Limits

| Wo | Limit | Wie durchgesetzt |
|---|---|---|
| `ChatFunnel` | 10 Nachrichten/Tag (`DAILY_MSGS`) | **localStorage** |
| `ChatFunnel` | 25 Generierungen/Monat (`LOOKS_INCLUDED`) | **localStorage** |
| `WetterSubscriberView` | 10 Nachrichten/Tag (`DAILY_CHAT_LIMIT`) — greift nur bei **eingetragenen, nicht zahlenden** Abonnenten (`!paid && subId`) | **localStorage** |
| `ModelChatInline` | 1 Nachricht (Bella: `freeLimit`), dann weiche Sperre | Komponenten-Status |
| Admin/Staff | kein Limit | `isStaff` |

> ⚠️ **Bekannte Lücke:** Alle Zähler laufen im **Gerät**, nicht auf dem Server. Browser wechseln
> = wieder bei 0. Für einen echten Zähler pro Kunde fehlt die Serverseite.

Ist das Tageslimit erreicht, sagt sie nicht „Limit erreicht", sondern vertröstet auf morgen
**und** macht ein Angebot (`dayFullMessage()`): im Abo reden wir gleich weiter, und ich stelle
dir meine Freundinnen vor.

---

## 9. Was Geld kostet

| Schritt | Kosten |
|---|---|
| Eine Chat-Antwort (Haiku, ≤260 Token) | Bruchteile eines Cents |
| Stufen 1–6 (feste Sätze) | **0** — kein API-Aufruf |
| `[[SHOW_FRIENDS]]` / `/api/tease-pool` | **0** — nutzt vorhandene Poster und Beiträge, erzeugt nichts neu |
| Ein Outfit-Bild (`/api/generate-fashn`) | ~0,03–0,07 € |
| Ein Dreh-Video (`/api/generate-tryon-video`) | anbieterabhängig — **vor dem Skalieren messen** |

**Deshalb ist Chatten gratis:** Text kostet fast nichts, Bilder und Videos kosten echtes Geld.
Genau die verkauft das Abo.

Preise: **24,50 €/Monat dauerhaft** (Listenpreis 49 €, jeder bekommt automatisch den
50-%-Gutschein FOREVER50), darin 25 Generierungen über **alle** Themen zusammen, jede weitere
3,99 €. Einzige Preisquelle: [`lib/pricing.ts`](lib/pricing.ts).

---

## 10. Was der Admin steuern kann

Im Admin-Bereich, alles über `POST /api/model-chat`:

| Aktion | Was passiert |
|---|---|
| Gespräche lesen | alle Verläufe, neueste zuerst |
| „Auf Deutsch übersetzen" | übersetzt einen Verlauf, egal in welcher Sprache er geschrieben wurde |
| „Regel hinzufügen" | hängt eine Korrektur an `curator.chatPersona` — gilt ab der nächsten Antwort |
| Globale Notiz | `state.chatConfig.globalNote` — Hausregel für **alle** Models |
| Gespräch löschen | mit `deletedChatIds`, sonst holt der Speicher es zurück |
| Nachricht „von einem Model" senden | landet im Posteingang **und** als E-Mail |

---

## 11. Änderungs-Landkarte

| Du willst ändern… | Datei |
|---|---|
| wie sie redet, was sie fragen darf | [`app/api/model-chat/route.ts`](app/api/model-chat/route.ts) (`system`) |
| die festen Deal-Sätze und deren Knöpfe | [`lib/chat-deal.ts`](lib/chat-deal.ts) |
| die Eröffnungsfrage | [`lib/chat-opener.ts`](lib/chat-opener.ts) |
| die Nachricht am Tageslimit | `dayFullMessage()` in [`lib/chat-deal.ts`](lib/chat-deal.ts) |
| Preise, Gutschein, Kleingedrucktes | [`lib/pricing.ts`](lib/pricing.ts) |
| den Kaufknopf | [`components/SubscribeCta.tsx`](components/SubscribeCta.tsx) |
| die Wetter-Begrüßung | [`app/api/wetter-suggest/route.ts`](app/api/wetter-suggest/route.ts) |
| den Bilder-Nachschub | [`app/api/tease-pool/route.ts`](app/api/tease-pool/route.ts) |

---

## 12. Offene Punkte

1. **Zähler serverseitig machen.** Tages- und Monatslimit hängen am Gerät (siehe 8).
2. **Der Wetter-Beitrag von heute** liegt schon in Supabase — Prompt-Änderungen an
   `wetter-suggest` wirken erst auf neu erzeugte Nachrichten.
3. **Stimme.** Der Chat ist reiner Text. Sprachausgabe wäre über die Browser-Sprachausgabe
   gratis, über OpenAI-TTS ~0,001 € pro Nachricht; ein sprechender Avatar mit Lippenbewegung
   kostet pro Nachricht ein Video (0,10–0,50 €) und lohnt nur als Sondermoment.
