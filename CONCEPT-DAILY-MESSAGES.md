# Konzept: „Sie meldet sich" — der tägliche Draht zu deiner Influencerin

Stand: 2026-07-19 · Arbeitstitel · ersetzt den gescheiterten Model-Recruiting-Ansatz

---

## 1. Das Problem (warum der Pivot)

- Über Ads kommen **keine Model-Bewerbungen**.
- Instagram **blockiert die Werbung** mit dem Vorwurf „Menschenausbeutung" — weil das Creative
  wie die Anwerbung echter Frauen aussieht.
- Konsequenz: Der Funnel „echte Models anwerben" ist als **bezahlter Kanal tot**.

## 2. Die Idee in drei Sätzen

Der Nutzer zieht sich **einmal** eine Influencerin an, wie er sie will, und sieht sie sofort als Bild.
Danach meldet sie sich **jeden Tag zweimal per Textnachricht** bei ihm — morgens mit dem Wetter
bei ihr (Monaco/Teneriffa) und bei ihm, abends mit einem Erlebnis und einer Rückfrage.
Er kann antworten, sie antwortet zurück.

**Der entscheidende ökonomische Trick:** Das teure KI-Bild entsteht **einmal**. Alles Tägliche
ist reiner Text — und Text kostet praktisch nichts.

## 3. Warum das den Werbe-Bann löst

Nicht mehr: „Werde Model bei uns" (→ Ausbeutungs-Vorwurf).
Sondern: „**Gestalte deine eigene Influencerin**" — ein Kreativ-/Begleiter-Produkt.
Es wird niemand angeworben, es wird etwas erschaffen.

**Do's für Creatives**
- Fokus auf den *Erschaffungs-Moment* („zieh sie an → so sieht sie aus")
- Fokus auf die *Nachricht* (Screenshot des Chats mit Wetter + Frage)
- Alltag, Reise, Stil, Wetter, Motivation

**Don'ts (sonst droht die nächste Ablehnung)**
- Keine Dessous-/Bikini-Bilder in Ads
- Keine romantische/„Freundin"-Anmutung („deine KI-Freundin", Herz-Emojis, Intimität)
  → Meta schränkt Companion-Apps ebenfalls stark ein
- Keine Versprechen wie „verdiene Geld als Model"
- Keine echten Frauen als Testimonials

> ⚠️ Ehrlicher Hinweis: Ein Ad-Bann ist damit **nicht garantiert weg**. Das Framing hilft,
> aber die Bildsprache entscheidet. Rechne mit Ablehnungen und halte 2–3 Creative-Varianten bereit.

## 4. Der Funnel (ohne Anmeldung testen)

| # | Schritt | Was der Nutzer sieht | Micro-Conversion | Tracking-Event |
|---|---|---|---|---|
| 1 | Ad-Klick | Landing: „Zieh sie an. Morgen früh meldet sie sich bei dir." | Scrollt / tippt | `daily_view` |
| 2 | Model wählen | Auswahl vorhandener Gesichter (**oder** eigenes Foto) | Auswahl | `daily_pick_model` |
| 3 | Klamotte wählen | Garderobe (bestehende Wardrobe) | Auswahl | `daily_pick_outfit` |
| 4 | **Bild wird erzeugt** | Sie in seinem Wunsch-Outfit — der Wow-Moment | sieht Ergebnis | `daily_image_done` |
| 5 | Ort wählen | „Wo soll sie leben?" Monaco / Teneriffa / Paris | Auswahl | `daily_pick_city` |
| 6 | Zeit + eigene Stadt | „Wann soll sie sich melden?" + „Wo bist du?" (fürs Wetter) | Eingabe | `daily_setup` |
| 7 | **Kontakt** | „Wohin soll sie schreiben?" E-Mail / Telegram | **Conversion** | `daily_contact` |
| 8 | Bestätigung | „Morgen um 7:15 hörst du von ihr." | — | — |
| 9 | **Nächster Morgen** | Erste echte Nachricht | Aha-Moment | `daily_msg_sent` |
| 10 | Antwort | Er antwortet → sie antwortet | Bindung | `daily_reply` |
| 11 | **Will sie umziehen** | Paywall: „Zieh sie an, so oft du willst" | Abo | `daily_paywall` / `subscribe_success` |

**Warum die Kontaktabfrage erst bei Schritt 7 kommt:** Erst Wert liefern (er hat sein Bild schon
gesehen), dann fragen. Vorher gefragt = Absprung.

## 5. Die Nachrichten (echte Beispiele)

**Morgens (7:15)**
> Guten Morgen Gerry ☀️ Ich bin gerade in Monaco aufgewacht — 24 °C und die Sonne knallt
> schon auf den Hafen. Bei dir in Timișoara wird's heute 31 °C, aber am Nachmittag ziehen
> Gewitter auf. Nimm was mit. Was steht bei dir heute an?

**Abends (20:30)**
> Ich war heute Nachmittag oben an der Corniche — die ganze Bucht lag im Abendlicht,
> ich konnte mich kaum losreißen. Und bei dir, wie war dein Tag?

**Morgens, anderer Ort**
> Morgen Gerry 🌴 Teneriffa zeigt sich heute von seiner besten Seite, 26 °C und Wind vom Meer.
> Bei dir sind's frische 12 °C und Regen — bleib trocken. Hast du heute was Schönes vor?

Erzeugt jeweils von Claude Haiku aus: Persona + ihr Ort + beide Wetterdaten + Uhrzeit.

## 6. Technische Architektur

### 6.1 Der Kanal — die zentrale Entscheidung

| Kanal | Geht heute? | Kosten | Aufwand | iOS | Bemerkung |
|---|---|---|---|---|---|
| **E-Mail** | ✅ ja (SMTP läuft) | 0 | ~0 | ✅ | Löst Handy-Benachrichtigung aus. Emotional schwächster Kanal. |
| **Telegram-Bot** | ❌ neu | 0 | ~½ Tag | ✅ | Echtes Chat-Gefühl, keine Genehmigung, kostenlos. Geringere Verbreitung. |
| **WhatsApp Cloud API** | ❌ neu, **von Null** | **pro Nachricht** | Tage + Genehmigung | ✅ | Bestes Erlebnis. Braucht Meta-Business-Verifizierung, WhatsApp Business Account, eigene Nummer, **genehmigte Templates**. Preise variieren je Land — **vor dem Bau prüfen**. |
| **Web Push (PWA)** | ❌ neu | 0 | ~1 Tag | ⚠️ | Auf iPhone nur, wenn der Nutzer „Zum Home-Bildschirm hinzufügen" macht. Zu viel Friktion für den Erstkontakt. |
| **SMS** | ❌ neu | hoch | mittel | ✅ | Teuer, wirkt spammig. Nicht empfohlen. |

**Empfehlung:**
- **Etappe 1: E-Mail** — läuft heute, null neue Infrastruktur, erreicht jeden.
- **Etappe 2: Telegram** — halber Tag Arbeit, kostenlos, gibt das echte „sie schreibt mir"-Gefühl.
- **Etappe 3: WhatsApp** — erst wenn validiert ist, dass Leute das wollen. Vorher lohnt
  der Genehmigungs-Aufwand nicht.

> 💡 WhatsApp-Trick für später: Antwortet der Nutzer, öffnet sich ein 24-Stunden-Fenster, in dem
> freie Nachrichten möglich sind. Die Abend-Frage („was hast du erlebt?") erzeugt genau diese
> Antworten — die Morgennachricht ist dann der bezahlte Anstoß, der Rest läuft im Fenster.

### 6.2 Zeitsteuerung — **existiert nicht, muss gebaut werden**

- `vercel.json` bekommt einen `crons`-Eintrag → ruft `/api/daily-messages` auf.
- **Bucket-Verfahren:** Der Cron läuft stündlich (bzw. alle 15 Min). Er lädt alle aktiven
  Abonnenten und sendet nur an die, deren **lokale** Sendezeit gerade erreicht ist.
  Zeitzone wird aus der Stadt abgeleitet und gespeichert.
- Route mit `CRON_SECRET` absichern (Header prüfen), sonst kann sie jeder auslösen.
- ⚠️ **Vor dem Bau prüfen:** Wie viele Cron-Ausführungen erlaubt euer Vercel-Tarif?
  Auf dem kostenlosen Tarif ist die Frequenz stark begrenzt — dann bräuchte es einen
  externen Auslöser (z. B. GitHub Actions, kostenlos).

### 6.3 Wetter — kostenlos, ohne Schlüssel

- **Open-Meteo**: `https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&daily=temperature_2m_max,precipitation_probability_max`
- Stadt → Koordinaten: `https://geocoding-api.open-meteo.com/v1/search?name=Timisoara`
- Einmal bei der Einrichtung geokodieren, Koordinaten speichern. Kein API-Key, keine Kosten.

### 6.4 Bild & Kosten

- Bild entsteht **einmal** beim Anziehen (bestehende Try-on-Pipeline).
- Danach **keine** täglichen Bildkosten.
- Täglich: 1 Haiku-Aufruf für Morgen- + Abendtext (Bruchteile eines Cents) + Wetter (0) + Versand (0).
- **Grenzkosten pro Nutzer und Monat: nahe null.** Genau deshalb funktioniert dieses Modell.
- Missbrauchsschutz nötig, damit nicht Fremde massenhaft kostenlose Bilder erzeugen
  (siehe Risiken).

### 6.5 Datenmodell — neue Felder (existieren alle noch nicht)

Neuer Typ `DailyCompanion` im Store (`lib/try-this-look-store.ts`):

```
id, visitorId, createdAt
modelId | avatarImagePath      // ihr Bild (einmalig erzeugt)
personaCity                    // "Monaco" | "Teneriffa" | "Paris"
userName                       // Anrede: "Gerry"
userCity, userLat, userLon, userTimezone
sendMorningLocal               // "07:15"
sendEveningLocal               // "20:30"
channel                        // "email" | "telegram"
email? , telegramChatId?
consentAt, consentText         // DSGVO: ausdrückliche Einwilligung
status                         // "trial" | "active" | "paused" | "cancelled"
trialEndsAt
lastMorningSentAt, lastEveningSentAt
```

## 7. Was wir wiederverwenden (existiert bereits)

| Zweck | Datei/Route |
|---|---|
| Foto hochladen + zuschneiden | `app/curators/taste-form.tsx` (`PhotoCropper`, `readPhotoFile`) |
| Muster „ohne Login ausprobieren" | `app/curators/apply/page.tsx` |
| Bild erzeugen (Try-on) | bestehende Try-on-Pipeline / `app/api/try-this-look` |
| Garderobe (Kleidungsstücke) | Wardrobe im Store |
| Persona-Texte (Claude) | `app/api/model-chat` + `@anthropic-ai/sdk` |
| E-Mail-Versand | `lib/email-send.ts` |
| Bezahlung | bestehende Stripe-Routen (Premium-Abo) |
| Tracking/Funnel | `lib/track-funnel.ts`, `components/InsightsPro.tsx` |
| Landing-Optik | `components/LandingHeader.tsx`, `components/ModelCard.tsx` |

## 8. Bauplan in Etappen

**Etappe 1 — Der Test-Funnel (wenige Stunden, sofort live)**
`app/companion/page.tsx` (Landing + Ablauf), `app/api/companion/route.ts` (speichern)
Model wählen → Outfit → Bild → Ort → Zeit + Stadt → E-Mail → Bestätigung.
Nachrichten werden anfangs **von Hand** ausgelöst (Admin-Knopf) — nichts automatisieren,
was noch keiner will.

**Etappe 2 — Automatik (½–1 Tag)**
`vercel.json` crons + `app/api/daily-messages/route.ts` (mit `CRON_SECRET`),
Wetter-Anbindung, Haiku-Textgenerierung, Versand per E-Mail.

**Etappe 3 — Telegram (½ Tag)**
Bot anlegen, Deeplink-Verknüpfung, `telegramChatId` speichern, Versand + Antworten empfangen.

**Etappe 4 — Geld (½ Tag)**
7 Tage gratis, danach Paywall über die bestehende Stripe-Strecke.

**Etappe 5 — WhatsApp (nur nach Validierung)**
Meta-Business-Verifizierung, WABA, Nummer, Template-Genehmigung, Versand + 24h-Fenster.

## 9. Monetarisierung — der Preis folgt dem Kostentreiber

**Das Grundprinzip:** Text kostet fast nichts → billig/gratis.
Bilder kosten echtes Geld → **dafür das teure Abo**.

### Die Stufen

**Die Trennlinie ist nicht die Zeit, sondern die ABWECHSLUNG.**

| Stufe | Was er bekommt | Unsere Kosten |
|---|---|---|
| **Gratis — dauerhaft** | **Ein** Look. Sie weckt ihn jeden Morgen — immer mit **demselben** Bild. | 1 Bild **einmalig** (~3–7 ct), danach ~0 |
| **Bezahlt** | **Jeden Tag ein anderer Look.** Jeden Morgen ein frisches Bild. | ~30 Bilder/Monat ≈ **1–2 €** |

Kein Zeitlimit, keine Testphase, die abläuft. Gratis bleibt gratis — nur eben immer dasselbe Bild.

### Warum das so gut funktioniert

Der Unterschied ist **sichtbar, nicht erklärt**. Der Gratis-Nutzer sieht jeden Morgen dasselbe
Foto und merkt von allein, was ihm fehlt. Der Zahler sieht jeden Morgen ein neues — und damit
täglich, wofür er zahlt. Das ist gleichzeitig der stärkste Kündigungsschutz.

### Der Paywall-Moment

Nicht nach Ablauf einer Frist, sondern **wenn er Abwechslung will**:
- Im Produkt: ein „Neuer Look für morgen"-Knopf → beim Antippen kommt das Angebot.
- In der Nachricht selbst: nach ein paar Tagen ein dezenter Hinweis
  („Soll ich mich morgen für dich neu anziehen?").

Beides trifft ihn im Moment des Wunsches, nicht im Moment des Entzugs.

### Kostenrechnung (Providerpreise ≈, **vor dem Preis-Festlegen selbst messen!**)

| Posten | Kosten |
|---|---|
| Ein Outfit-Bild (`gpt-image-1` „medium", FASHN, fal/Qwen) | ~**0,03–0,07 €** |
| Dasselbe bei Qualität „high" | ~0,15–0,20 € |
| Tagestext (Claude Haiku) + Wetter + Versand | ~0 |
| **Premium-Nutzer mit 1 Bild/Tag** | **~1–2 € / Monat** |

→ Bei einem Premium-Preis im zweistelligen Bereich bleibt sehr hohe Marge.

### ⚠️ Wichtig: Unbegrenzt wäre ein Fehler

„So oft er will" auf einem Pauschalpreis ist ein offenes Kostenrisiko — ein Power-User, der
500 Bilder erzeugt, kostet dich 15–35 € und frisst die Marge auf.

**Empfehlung: „Jeden Tag ein neues Outfit" als Inklusiv-Grenze** (30/Monat).
Das klingt großzügig, passt perfekt zum täglichen Rhythmus des Produkts, und deckelt die
Kosten planbar. Wer mehr will: Einzelkauf pro Extra-Outfit.

### Warum Premium wenig Kündigungen hat

Der Premium-Nutzer bekommt **jeden Morgen ein neues Bild von ihr** — er sieht also täglich,
wofür er zahlt. Genau das fehlt bei Abos, die man vergisst.

## 10. Risiken & Recht

| Risiko | Gegenmaßnahme |
|---|---|
| **Fremde Fotos** (Promis, Ex-Freundinnen, Fremde) werden hochgeladen | Für den Start **nur vorhandene Gesichter** anbieten, kein freier Upload. Das entschärft Bild- und Persönlichkeitsrechte auf einen Schlag. |
| **Minderjährige** auf Fotos | Altersbestätigung + kein freier Upload in Etappe 1 |
| **DSGVO** | Ausdrückliche Einwilligung für die Nachrichten (Doppel-Opt-in), Abmeldelink in **jeder** Nachricht, Löschfunktion, Speicherung nur was nötig ist |
| **Kostenexplosion durch Gratis-Bilder** | Limit pro Gerät/IP, Kill-Switch, Bild erst nach Kontaktangabe erzeugen (Alternative) |
| **E-Mail landet im Spam** | SMTP hat **keine Drosselung** und sendet sequenziell → bei Skalierung Timeout- und Reputationsrisiko. Ab ~100 Nutzern auf einen echten Versanddienst wechseln. |
| **Meta lehnt Ads wieder ab** | Bildsprache streng halten (siehe 3.), mehrere Creatives, notfalls anderer Kanal |
| **Vercel-Cron-Limit** | Tarif prüfen, sonst GitHub Actions als Auslöser |

## 11. Erfolgsmetriken (Schwellwerte für „weitermachen?")

Nach **4 Wochen** und mind. **100 Landing-Besuchern**:

| Metrik | Ziel |
|---|---|
| Landing → Bild erzeugt | > 30 % |
| Bild → Kontakt hinterlassen | > 20 % |
| Erste Nachricht → geöffnet/gelesen | > 50 % |
| **Antwortquote auf die Abendfrage** | **> 15 %** ← wichtigste Zahl: zeigt echte Bindung |
| Noch aktiv nach 7 Tagen | > 40 % |
| Gratis → zahlend | > 5 % |

Reißt die **Antwortquote** deutlich, ist das Produkt emotional nicht stark genug —
dann lieber Konzept ändern als Kanal.

## 12. Offene Entscheidungen (bitte entscheiden)

1. **Eigenes Foto hochladen — ja oder nein?**
   *Empfehlung: In Etappe 1 **nein**.* Nur vorhandene Gesichter. Das ist schneller, billiger
   und umgeht die größten Rechtsrisiken. Upload später nachrüsten.
2. **Startkanal?**
   *Empfehlung: E-Mail sofort, Telegram direkt danach.* WhatsApp erst nach Validierung.
3. **Zwei Nachrichten pro Tag von Anfang an?**
   *Empfehlung: ja* — die Abendfrage ist der Bindungs-Motor und liefert die wichtigste Metrik.
4. **Wie viele Orte zum Start?**
   *Empfehlung: drei* (Monaco, Teneriffa, Paris). Mehr Auswahl bringt nichts, kostet nur Arbeit.
5. **Vercel-Tarif** — erlaubt er stündliche Crons? Muss vor Etappe 2 geklärt sein.
6. **Wie viele Outfit-Wechsel sind im Premium inklusive?**
   *Empfehlung: 1 pro Tag (30/Monat).* Nicht „unbegrenzt" — das ist ein offenes Kostenrisiko.
   Klingt großzügig, passt zum Tagesrhythmus, bleibt planbar.
7. **Bekommt Premium das Bild in der Morgennachricht mitgeschickt?**
   *Empfehlung: ja.* Das ist der sichtbare Gegenwert jeden Tag — der stärkste Schutz vor Kündigung.
8. **Preis für Premium?** Erst festlegen, wenn die echten Bildkosten gemessen sind
   (5–10 Testbilder erzeugen und die Provider-Abrechnung prüfen).
