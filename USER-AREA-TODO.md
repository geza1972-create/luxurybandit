# User-Bereich: Dashboard vs. Account — ✅ UMGESETZT

Stand: 2026-06-29 (erledigt in Commit 8cf4030)

## Entscheidung (vom User bestätigt) & Umsetzung
- **Dashboard = neue Übersichtsseite** `app/user/dashboard/page.tsx`: Identität,
  Quick-Stats (Try-ons / Public / Hidden / Credits), „Buy 10 try-on credits"-CTA,
  eigene Try-ons (mit Hide/Delete), Links zu „Account settings" + „Explore feed".
- **Login landet jetzt auf `/user/dashboard`** — geändert in `auth/confirm`,
  `seller/login` (default returnTo) und `/stores` (Passwort-Login).
- **Account (`/user/myaccount`) bleibt die Settings-Seite.**
- **Bottom-Nav unverändert** (Home · Messages · Account) — Dashboard ist das
  Login-Ziel + über „Account settings"/Account-Tab erreichbar.

---
## (Historie) ursprüngliche Notizen

## Frage des Users
> „Haben wir nicht gesagt, dass der User auf seinem **Dashboard** landen muss und
> **Account ist nicht zusammen mit Try-on**?"

Beobachtet: Nach dem Login (Community-User, z.B. `gl12341234123@gmail.com` /
„Geza Lakatos") landet man direkt auf **My Account** — der Profil-Bearbeitungsseite
(Username, Bio, Website, Instagram, Phone) **+** „Buy 10 try-on credits".

## Aktueller Code-Stand (gefunden)
- **Post-Login-Landing = `/user/myaccount`** an drei Stellen:
  - `app/auth/confirm/page.tsx:42` → `dest = "/user/myaccount"` (OAuth-Rückkehr)
  - `app/seller/login/page.tsx:37` → `returnPath` default `/user/myaccount`
  - `app/stores/page.tsx:1102` → `window.location.href = "/user/myaccount"`
    (Kommentar sagt sogar „land on the dashboard, not the feed")
- **Vorhandene User-Seiten:** `app/user/myaccount`, `app/user/mystore`, `app/user/tryons`
- **`/user/myaccount`** mischt aktuell: Profil-Settings **+** Credits-Kauf.
  Try-ons liegen schon getrennt auf **`/user/tryons`**.
- **Bottom-Nav (Community-User):** Home · Messages · Account — **kein** Dashboard-
  bzw. „My try-ons"-Tab.

## Was vermutlich gewünscht ist (zu bestätigen)
1. **Login soll auf ein Dashboard führen**, nicht auf die Profil-Settings-Seite.
2. **„Account" = nur Settings** (Profil bearbeiten), **getrennt** von Try-ons.
3. Try-ons/Content = eigener Bereich (Dashboard), evtl. eigener Nav-Tab.

## Offene Entscheidungen (vom User zu klären)
- [ ] Was genau ist „das Dashboard"? → `/user/tryons` (meine Try-ons) **oder** eine
      neue Übersichtsseite (Stats + Try-ons + Credits)?
- [ ] Bottom-Nav: einen **Dashboard- bzw. „My try-ons"-Tab** ergänzen?
      (aktuell Home · Messages · Account)
- [ ] Soll „Buy credits" auf dem Dashboard bleiben oder unter Account?
- [ ] „Account" rein als Settings (Profil) — Try-ons dort entfernen/verlinken?

## Umzusetzen (sobald geklärt)
- [ ] Landing-Ziel an den 3 Stellen oben von `/user/myaccount` auf das Dashboard ändern.
- [ ] Ggf. Dashboard-Seite bauen / `/user/tryons` als Landing nutzen.
- [ ] Bottom-Nav anpassen.
