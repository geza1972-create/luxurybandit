# Preise & Abos — Quelle der Wahrheit

Alle Geldflüsse von LuxuryBandit an EINER Stelle. Bei jeder Preisfrage ZUERST hier
schauen (und gegen den Code prüfen — Werte können sich ändern). Stand: 2026-07-26.

> Wichtig: „Anzeige-Preis im Code" ≠ „tatsächliche Abbuchung". Die echte Abbuchung
> läuft über **Stripe** (Preis-ID + ggf. Gutschein). Code-Text und Stripe müssen
> übereinstimmen — den Stripe-Teil legt der Owner im Stripe-Dashboard an, nicht Claude.

## Übersicht

| Produkt | Preis | Testphase / Rabatt | Wo im Code | Admin-konfigurierbar? |
|---|---|---|---|---|
| **Wetter-/Themen-Abo** (Bella & Co., tägliche Nachricht) | **9,99 €/Monat** | **7 Tage gratis** | `app/themes/wetter/[model]/page.tsx` → `wetterAboMonthlyCents ?? 999`, `wetterAboTrialDays ?? 7`; UI `components/WetterGate.tsx` | **Ja** — `state.pricing.wetterAboMonthlyCents` / `wetterAboTrialDays` |
| **Premium** (Try-on-Videos, entsperrt alles + Community) | **$49/Monat** | **1. Monat $8** (Stripe-Gutschein `CjOJYKVV`), 40 Videos/Monat | Anzeige hardcodiert in `app/try/[lookId]/page.tsx`, `app/stores/page.tsx`, `app/terms/page.tsx`, `app/grow-card/page.tsx` u. a. (String „$49") | Nein (hardcodierte Texte + Stripe-Preis) |
| **You-in-Video** (Selbst im Video, Face-Swap) | **$3.99** einmalig | — | `app/you-in-video/page.tsx` (`PRICE_LABEL`), `app/try/[lookId]/page.tsx` | Nein |
| **Paid Chat-Pass** (Chat mit fremdem Influencer) | **$3.99 / 30 Min** | eigener Influencer = gratis unbegrenzt; sonst 10 Nachrichten gratis | `app/curator/[id]/page.tsx` (`chatPassCents` 399); Owner-Anteil 30 % | teils |
| **SuperFollow / „Own influencer"-Abo** | **$4.99/Monat** (Default 499) | 1. Monat $8 | `app/curator/[id]/page.tsx` (`superFollowCents` 499) | ja (pro Curator) |
| **Starter-Influencer-Abo** („Own an AI Influencer", Ad-Test) | **€9.99/Monat** | manuell erfüllt (Test) | `app/own-influencer/page.tsx` (`subscriptionMonthlyCents`) | ja |
| **Try-on Preis-Leiter** (GEPLANT, noch nicht live) | normales Foto gratis (3/Tag) · Lingerie **$2.90** · Video **$4.90** · 360° **$7.90** | — | Konzept, via Stripe (deferred) | — |

## Merksätze
- **Zwei verschiedene 9,99er nicht verwechseln:** Wetter-/Themen-Abo (9,99 €) und Starter-Influencer-Abo (9,99 €) sind unterschiedliche Produkte.
- **Premium (49 $) ≠ Wetter-Abo (9,99 €).** Premium schaltet Try-on-Videos frei; das Wetter-Abo ist die tägliche Morgen-Nachricht.
- Preise, die in `state.pricing` liegen, kann der Owner im Admin ändern; hardcodierte (Premium-Texte) nur im Code.
- **Nichts in Stripe anlegen ohne ausdrückliche Owner-Freigabe.** Claude hat keinen Stripe-Zugang und gibt keine Zahlungsdaten ein.

## Offene Idee (2026-07-26, nicht gebaut)
Wetter-Testphase **pro Person** an **Anzahl gesendeter Mails** koppeln (z. B. 7 Mails gratis, dann Abo) statt „7 Tage global", weil laufend neue Leads dazukommen. Machbar, da wir seit 2026-07-26 pro Abonnent Öffnungen/Sends tracken können.

Verwandte Memories: `premium-subscription`, `bella-topic-subscription-system`, `monetization-tryon-pricing`, `paid-chat-pass`, `starter-influencer-subscription-adtest`.
