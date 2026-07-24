# Manage-Landing & Card-Tool — CI (verbindlich)

Jedes **Theme** (siehe `/themes`) bekommt eine eigene **Manage-Landing**: oben die Kundenansicht,
darunter — nur mit `?admin=1` — die Admin-Werkzeuge (Card-Tool + Abonnenten). **Alle sehen gleich aus.**
Referenz ist die **Wetter**-Seite (`app/themes/wetter/[model]/page.tsx`). Neue Tools folgen exakt diesem CI.

## 1. Seiten-Rahmen (Pflicht)

```tsx
<main className="lb-bg min-h-screen text-white">   {/* NIE bg-[#0d0b0a] — das ist flach; lb-bg = Marken-Gradient */}
  <TopNav />                                        {/* Booking-Landings dürfen LandingHeader nutzen */}
  <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
    {showAdmin && <ManageViewToggle view={view} />}
    {showCustomer ? (
      <div className={showAdmin ? "mt-4" : ""}>{/* Hero / Kundenansicht / Funnel-CTA */}</div>
    ) : (
      <div className="mt-4 space-y-4">
        <BellaCarouselAdmin heading="🎴 <Theme>-Card Tool" scope="<scope>" />
        <div className="lb-theme"><WetterSubscribers /></div>
      </div>
    )}
  </div>
</main>
```

Mit:
```tsx
const showAdmin = String(sp.admin ?? "") === "1";
const view = sp.view === "kunde" ? "kunde" : "admin";   // Umschalter, Standard = Admin-Tools
const showCustomer = !showAdmin || view === "kunde";
```

- **Root:** immer `lb-bg` (nicht `bg-[#0d0b0a]`). `lb-bg` = dunkler Marken-Gradient mit Gold-Schimmer.
- **Container:** `mx-auto w-full max-w-[440px] px-4 pb-24 pt-8`.
- **Admin-Gate:** `?admin=1` → Tools (self-hide zusätzlich ohne PIN).
- **Kunde/Admin-Umschalter** (`components/ManageViewToggle.tsx`) — Pflicht, wie Wetter: mit `?admin=1`
  oben ein Toggle 👤 Kunde / 🛠 Admin (`?view=kunde` | `?view=admin`, Standard admin). Kunde = Hero/Funnel, Admin = Card-Tool + Abonnenten.

## 2. Card-Tool (eigener Blob pro Landing)

```tsx
<BellaCarouselAdmin heading="🎴 <Theme>-Card Tool" scope="<scope>" />
```

- `scope` = eigener Speicher-Blob: `card-studio-<model>-<scope>.json` (scopes: `urlaub` | `wetter` | `tryon` | `idol` | …).
- **Lazy-Fork:** eine ungespeicherte Landing erbt die Standardkarte und forkt beim ersten „Übernehmen".
- Darunter immer die Abonnenten: `<div className="lb-theme"><WetterSubscribers /></div>`.

## 3. Design-Regel (Owner-Feedback, mehrfach korrigiert) — NICHT verletzen

**ALLE Admin-Tools = weiße Box + dunkle Schrift.**

- Root der Tool-Box: `bg-white` **+** `lb-theme`. Der `.lb-theme`-Flip macht `text-white` → dunkel
  (immer aktiv), sodass die vielen `text-white`-Klassen auf Weiß lesbar werden.
- **NIE** transparent-dunkle Roots (`bg-white/[0.04]`, `bg-black/…`) als Tool-Container auf dunkler Seite
  → das macht dunkle-Schrift-auf-dunkel = unlesbar.
- `lb-onmedia` für weißen Text auf Medien / dunklen Buttons **innerhalb** der weißen Box.

## 4. Menü (BottomNav) — überall

- BottomNav lebt global im Root-Layout. Auf manchen Pfaden versteckt es sich (`hideChrome`, z. B. `/tryon`, `/try/`, `/chat/`).
- **Manage-Views (`?admin=1`) behalten IMMER das Menü** (`adminView`-Guard in `BottomNav.tsx`) — dadurch ist das Menü auf **allen** Card-Tool-Seiten da, auch auf sonst ausgeschlossenen Pfaden.
- Aufruf einer Manage-Seite immer mit `?admin=1`.

## 5. Checkliste für ein NEUES Theme-Tool

- [ ] Root `lb-bg min-h-screen text-white`
- [ ] `TopNav` (oder `LandingHeader` bei Booking-Landings) oben
- [ ] Container `max-w-[440px] px-4 pb-24 pt-8`
- [ ] `?admin=1`-Gate für die Tools + `<ManageViewToggle view={view} />` (Kunde/Admin, wie Wetter)
- [ ] `<BellaCarouselAdmin scope="<neu>" />` mit eigenem Blob-Scope
- [ ] `<div className="lb-theme"><WetterSubscribers /></div>` darunter
- [ ] Tool-Boxen = `bg-white` + `lb-theme` (dunkle Schrift), `lb-onmedia` für Text auf Medien
- [ ] Menü prüfen: mit `?admin=1` sichtbar
- [ ] Menü-Link zur neuen Manage-Seite in der BottomNav-Themes-Gruppe (staff)

Siehe auch Memory `per-theme-tools-architecture` (My Gallery = Cross-Theme-Overview, jedes Theme = eigenes Tool).
