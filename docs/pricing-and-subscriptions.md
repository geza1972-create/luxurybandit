# Preise & Abos — Quelle der Wahrheit

Alle Geldflüsse von LuxuryBandit an EINER Stelle. Bei jeder Preisfrage ZUERST hier
schauen (und gegen den Code prüfen). Stand: 2026-07-26.

> „Anzeige-Preis im Code" ≠ „tatsächliche Abbuchung". Die echte Abbuchung läuft über
> **Stripe** (Preis-ID + ggf. Gutschein). Den Stripe-Teil legt der Owner an, nicht Claude.

## AKTUELLES MODELL (final entschieden 2026-07-26) — Abo = Reden, Video = Einzelkauf

Kernidee: **Videogenerierung ist zu teuer fürs Abo** (Dollar-Beträge pro Clip). Das Abo
verkauft **tägliche Nachrichten + Chat** (Haiku-Chat kostet Bruchteile eines Cents).
Video gibt es NUR als Einzelkauf.

| Produkt | Preis | Trial / Regel | Stripe-Preis-ID (Owner angelegt) |
|---|---|---|---|
| **Wetter-Abo** | **24 €/Monat** | **nach 7 gesendeten E-Mails** (die ersten 7 gratis, dann zahlen). **KEIN 9,99.** | `price_1TxPxR1jPNCWoiztgmJMNNdF` (recurring) |
| **Try-on-Video** | **3,99 €** einmalig | Einzelkauf, kein Abo | `price_1TxPzv1jPNCWoiztQNJKUeh8` (one-off) |

- **Chat-Modell:** Claude **Haiku 4.5** (`app/api/app-chat|model-chat|mai-ieftin-chat`). Für Persona-Chat ~ebenbürtig zu ChatGPT, sehr günstig.
- Optionales Chat-Credit-Limit ist eine *spätere* Idee — im Moment: **eine** Abo-Stufe (24 €), Zugang endet nach 7 E-Mails ohne Abo.

### ⚠️ NOCH NICHT GEBAUT: der Wetter-Paywall
`WetterGate` macht bisher NUR die kostenlose Anmeldung (`/api/wetter-signup`). Es gibt
**keine** „nach 7 E-Mails → 24 €"-Sperre und **keinen** Wetter-Abo-Checkout. Zu bauen:
1. pro Abonnent **gesendete E-Mails zählen** (in `wetter-email-blast` hochzählen).
2. Ab der 8. Öffnung/Nachricht → **Paywall** statt Inhalt (Stripe-Checkout mit obiger Preis-ID, `mode:subscription`).
3. **Stripe-Webhook** markiert Abonnent als zahlend → Inhalt wieder frei.
Der **Try-on-3,99-Checkout** existiert schon (betrags-basiert, `avatar-face-checkout`/`model-video-checkout`, 399 Cent) → nur die EUR-Preis-ID einsetzen (`priceId` statt `amount`).

### ❌ ABGESCHAFFT: Premium $49/Monat (40 Videos/Monat)
Das Video-Abo ($49/Mo, 1. Monat $8, Gutschein `CjOJYKVV`) wird **nicht mehr angeboten**.
Video läuft ausschließlich à la carte für $3.99. **Noch im Code vorhanden** (Anzeige-Texte
„$49/month" + Paywall) → muss entfernt/umgebaut werden; bestehende Stripe-Abos + laufende
Zahler separat behandeln (Owner/Stripe). Alt-Fundstellen: `app/try/[lookId]/page.tsx`,
`app/stores/page.tsx`, `app/terms/page.tsx`, `app/grow-card/page.tsx`.

## Weitere Geldflüsse (unverändert)

| Produkt | Preis | Wo im Code |
|---|---|---|
| **You-in-Video** (Face-Swap, = der $3.99-Try-on) | **$3.99** einmalig | `app/you-in-video/page.tsx` (`PRICE_LABEL`), `app/try/[lookId]/page.tsx` |
| **Paid Chat-Pass** (Chat mit FREMDEM Influencer) | **$3.99 / 30 Min** (eigener = gratis; sonst 10 gratis) | `app/curator/[id]/page.tsx` (`chatPassCents` 399), Owner-Anteil 30 % |
| **SuperFollow / „Own influencer"** | **$4.99/Monat** (Default 499) | `app/curator/[id]/page.tsx` (`superFollowCents`) |
| **Starter-Influencer-Abo** (Ad-Test) | **€9.99/Monat** | `app/own-influencer/page.tsx` (`subscriptionMonthlyCents`) |
| **Try-on Preis-Leiter** (GEPLANT) | Foto gratis 3/Tag · Lingerie $2.90 · Video $4.90 · 360° $7.90 | Konzept, deferred |

## Merksätze
- **Wetter-Abo = 24 €** (nicht mehr 9,99). Das einzige verbleibende 9,99-Produkt ist das Starter-Influencer-Abo.
- **Kein Video im Abo** — Video ist immer Einzelkauf 3,99 €.
- **Trial = 7 E-Mails, NICHT 7 Tage.** Der alte Code nutzt `wetterAboTrialDays` (Tage) — muss auf E-Mail-Zählung umgebaut werden.
- Wetter-Abo-Preis liegt in `state.pricing.wetterAboMonthlyCents` (Alt-Default 999 → auf 2400 setzen oder über die Stripe-Preis-ID).
- **Nichts in Stripe anlegen/ändern ohne Owner-Freigabe.** Claude hat keinen Stripe-Zugang.

## Offene To-dos aus diesem Modell
1. **Chat-Credit-Limit pro Abonnent** bauen (zählen, bei 0 → 24 € Upsell / Drosselung). Zahlen offen.
2. **24 €-Stufe** anlegen (mehr Credits, evtl. Sonnet).
3. **Premium $49 aus dem Code entfernen** (Texte + Paywall) + Alt-Zahler/Stripe klären.
4. Optional: Wetter-Testphase **pro Person nach 7 gesendeten Mails** statt 7 Tage global.

Verwandte Memories: `pricing-source-of-truth`, `premium-subscription`, `bella-topic-subscription-system`, `paid-chat-pass`, `ai-model-chat`.
