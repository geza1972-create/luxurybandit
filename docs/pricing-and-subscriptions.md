# Preise & Abos — Quelle der Wahrheit

Alle Geldflüsse von LuxuryBandit an EINER Stelle. Bei jeder Preisfrage ZUERST hier
schauen (und gegen den Code prüfen). Stand: 2026-07-26.

> „Anzeige-Preis im Code" ≠ „tatsächliche Abbuchung". Die echte Abbuchung läuft über
> **Stripe** (Preis-ID + ggf. Gutschein). Den Stripe-Teil legt der Owner an, nicht Claude.

## THEMEN-ABO = 24 € PRO THEMA (Owner, 2026-07-27)

**Der Standardpreis für jedes Themen-Abo ist 24 €/Monat.** Es gibt keine 19,99-Stufe und
kein Bündel. Ein Nutzer kann **mehrere Themen** abonnieren und zahlt dann **pro Thema
24 €** (zwei Themen = 48 €/Monat). Jedes Abo ist in Stripe ein eigenes Abo und wird
einzeln gekündigt.

Verwaltung: **`/account`** („My topics & billing") — Liste aller Themen-Abos des Kunden mit
Preis, nächster Abbuchung und Kündigen-Knopf (`components/MyTopics.tsx`,
`app/api/my-topics/route.ts`, Stripe-Helfer `listTopicSubscriptions` / `cancelSubscription`).
Gekündigt wird **zum Periodenende**, der bezahlte Monat bleibt.

Anmeldung ohne Passwort-Wissen: E-Mail eintippen → **Magic Link** („Send me a sign-in
link") oder **Passwort-Reset**. Wer über einen Themen-Checkout kam, hat nie ein Passwort
gesetzt — deshalb ist der Magic Link der Hauptweg. Die E-Mail muss die sein, mit der bezahlt
wurde; darüber findet Stripe die Abos.

**Offen:** Der Zähler „5 Videos/Monat" existiert weiterhin NICHT — bezahlt = unbegrenzt.

## ÄLTERES MODELL (2026-07-26) — Abo = Reden, Video = Einzelkauf

Kernidee: **Videogenerierung ist zu teuer fürs Abo** (Dollar-Beträge pro Clip). Das Abo
verkauft **tägliche Nachrichten + Chat** (Haiku-Chat kostet Bruchteile eines Cents).
Video gibt es NUR als Einzelkauf.

| Produkt | Preis | Trial / Regel | Stripe-Preis-ID (Owner angelegt) |
|---|---|---|---|
| **Wetter-Abo** | **24 €/Monat** | **nach 7 gesendeten E-Mails** (die ersten 7 gratis, dann zahlen). **KEIN 9,99.** | `price_1TxPxR1jPNCWoiztgmJMNNdF` (recurring) |
| **Try-on-Video** | **3,99 €** einmalig | Einzelkauf, kein Abo | `price_1TxPzv1jPNCWoiztQNJKUeh8` (one-off) |

- **Chat-Modell:** Claude **Haiku 4.5** (`app/api/app-chat|model-chat|mai-ieftin-chat`). Für Persona-Chat ~ebenbürtig zu ChatGPT, sehr günstig.
- Optionales Chat-Credit-Limit ist eine *spätere* Idee — im Moment: **eine** Abo-Stufe (24 €), Zugang endet nach 7 E-Mails ohne Abo.

### ✅ GEBAUT (2026-07-26): weicher Wetter-Paywall nach 7 ÖFFNUNGEN
Regel: „7 mal geöffnet" = **Klicks** aus dem Klick-Tracking (`wetter-clicks.json`), NICHT gesendete Mails.
Öffnungen 1–7 gratis; ab der 8. sind **Video + Chat gesperrt** (Poster + Gruß + Wetter + Text bleiben frei).
- Sperre-Logik: `app/themes/wetter/[model]/page.tsx` (`FREE_OPENS = 7`, `locked = opens >= 7 && !paid`; Server sieht die vorherigen Öffnungen → sperrt ab dem 8.).
- Sperr-UI: `components/WetterSubscriberView.tsx` (`locked`-Prop) — Poster mit Schloss + „🔓 Freischalten 24 €/Monat", Chat-Eingabe → Freischalt-Button. 8 Sprachen.
- Checkout: `app/api/wetter-abo-checkout/route.ts` → `createSubscriptionCheckout` mit `price_1TxPxR…` (Env `STRIPE_WETTER_ABO_PRICE_ID` überschreibt), metadata `{kind:"wetter-abo", subId, modelId}`.
- Freischalten: `app/api/stripe-webhook/route.ts` setzt bei `kind:"wetter-abo"` → `setWetterPaid` (`wetter-paid.json`). `?wetterpaid=1` schaltet auf der Rückkehr sofort optimistisch frei.
- **Owner-To-do (live):** Stripe-Webhook muss `checkout.session.completed` an `/api/stripe-webhook` liefern (für andere Flows schon konfiguriert); einmal echt durchtesten.

### Try-on 3,99 € — Preis-ID noch nicht eingesetzt
Der Try-on-Checkout existiert betrags-basiert (`avatar-face-checkout`/`model-video-checkout`, 399 Cent, wahrscheinlich USD). Auf die EUR-Preis-ID `price_1TxPzv…` umstellen (`priceId` statt `amount`) steht noch aus.

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
