# Preise & Abos — Quelle der Wahrheit

Alle Geldflüsse von LuxuryBandit an EINER Stelle. Bei jeder Preisfrage ZUERST hier
schauen (und gegen den Code prüfen). Stand: 2026-07-26.

> „Anzeige-Preis im Code" ≠ „tatsächliche Abbuchung". Die echte Abbuchung läuft über
> **Stripe** (Preis-ID + ggf. Gutschein). Den Stripe-Teil legt der Owner an, nicht Claude.

## AKTUELLES MODELL (entschieden 2026-07-26) — Abo = Reden, Video = Einzelkauf

Kernidee: **Videogenerierung ist zu teuer fürs Abo** (Dollar-Beträge pro Clip). Das Abo
verkauft daher **tägliche Nachrichten + Chat** (Haiku-Chat kostet Bruchteile eines Cents).
Video gibt es NUR als Einzelkauf.

| Stufe | Preis | Enthält | Video? |
|---|---|---|---|
| **Basis** | **9,99 €/Monat** (7 Tage gratis) | tägliche Nachricht + Chat **mit Credit-Limit** | nein |
| **Plus** | **24 €/Monat** | deutlich mehr Chat-Credits (evtl. schlaueres Modell) | nein |
| **Try-on-Video** | **$3.99 pro Stück** (Einzelkauf, kein Abo) | ein generiertes Try-on-Video | — |

- **Chat-Modell:** Claude **Haiku 4.5** (`app/api/app-chat|model-chat|mai-ieftin-chat`). Für Persona-Chat ~ebenbürtig zu ChatGPT, sehr günstig. „Plus" könnte einzelne Chats auf Sonnet routen.
- **Chat-Limit:** pro Abonnent Credits zählen (1 Credit ≈ 1 Nachricht). Bei 0 → Upsell auf 24 € **oder** drosseln. (Zahlen/Verhalten noch festzulegen.)
- **Video** = bestehender **$3.99 Pay-per-Try-on** (You-in-Video-Funnel + Stripe), NICHT im Abo.

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
- **Zwei verschiedene 9,99er:** Wetter-/Themen-Abo (9,99 €) ≠ Starter-Influencer-Abo (9,99 €).
- **Kein Video im Abo mehr** — Video ist immer Einzelkauf $3.99.
- Wetter-Abo-Preis/Trial liegen in `state.pricing` (`wetterAboMonthlyCents ?? 999`, `wetterAboTrialDays ?? 7`) → im Admin änderbar.
- **Nichts in Stripe anlegen/ändern ohne Owner-Freigabe.** Claude hat keinen Stripe-Zugang.

## Offene To-dos aus diesem Modell
1. **Chat-Credit-Limit pro Abonnent** bauen (zählen, bei 0 → 24 € Upsell / Drosselung). Zahlen offen.
2. **24 €-Stufe** anlegen (mehr Credits, evtl. Sonnet).
3. **Premium $49 aus dem Code entfernen** (Texte + Paywall) + Alt-Zahler/Stripe klären.
4. Optional: Wetter-Testphase **pro Person nach 7 gesendeten Mails** statt 7 Tage global.

Verwandte Memories: `pricing-source-of-truth`, `premium-subscription`, `bella-topic-subscription-system`, `paid-chat-pass`, `ai-model-chat`.
