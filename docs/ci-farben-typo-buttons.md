# CI — Farben, Typo, Buttons (verbindlich)

Quelle der Wahrheit für jedes Stück UI. Wer hier abweicht, baut es falsch.
Der Owner hat das mehrfach korrigiert — es wird **nicht** neu erfunden und **nicht** neu gefragt.

## 0. PFLICHT: Bausteine aus der Bibliothek (Owner 06.08.2026)

> „du holst alles was du baust aus der bibliothek raus"

Diese Regeln werden nicht pro Seite neu UMGESETZT, sondern als fertige Bausteine aus
**`components/CI.tsx`** geholt: `Scheibe`, `Knopf` (gold · umriss · chip), `Eingabe`,
`Fehlerzeile`, `Kasten` (still · gold), `Laden`, `Dialog` (hell · dunkel), `ThemenKreise`,
`ThemenKachel`/`ThemenListe` (art: reihe · voll), `MadeBy` — die kleinen mit `karte`-Schalter
für die Einladungskarte. Typo aus `components/Landing.tsx`, Karten aus
`EinladungKarte`/`EinladungAnsicht`/`KartenKarussell`, Upload aus `UploadKachel`.
Wisch-Flächen tragen `lb-wisch` — der Scrollbalken ist unsichtbar („scrollbalken wird dann
transparent"); nie wieder `[&::-webkit-scrollbar]:hidden` abtippen.

Der **Kasten** ist die eine abgesetzte Fläche: `still` für Abschnitte und Hinweise, `gold`
für den Teaser, der etwas anbietet (höchstens einer pro Bildschirm, wie der Goldknopf).
Sein Rand ist `white/20`, nicht `/10` — ein `/15`-Rand auf Schwarz ist im Tageslicht
unsichtbar. Polsterung nur über `polster`, nie über `className` (zwei Tailwind-Polster
haben dieselbe Spezifität; welches gewinnt, entscheidet sonst der Zufall).

**Der Arbeitsgang** (Owner: „alles was wir bauen und neu ist wird erst mal geprüft in der
Bibliothek und wenn es nicht gibt, dann müssen wir es erst mal dort eintragen"): erst in
der Bibliothek und auf **`/ci`** nachsehen → fehlt der Baustein, ERST in `components/CI.tsx`
bauen und in `components/CIMuster.tsx` ausstellen → dann in der Seite benutzen. Nie als
Einzelstück in der Seite.

## 1. Die CI-Farben

Alles leitet sich vom Logo-Gradient ab, der in `app/globals.css` als `.lb-gold` steht:

```
linear-gradient(160deg, #fbe89a 0%, #f6cf51 30%, #e9ae2b 58%, #c9861a 100%)
```

| Rolle | Wert | Einsatz |
|---|---|---|
| **CI-Gelb (Akzent)** | `#f6cf51` | JEDE Akzentfarbe auf dunklem Grund: Kicker, hervorgehobenes Wort in der H1, Labels, Links, Rahmen, Icons, Häkchen, Chips |
| CI-Gelb hell | `#fbe89a` | nur als Gradient-Anfang in `.lb-gold` |
| CI-Gelb dunkel | `#e9ae2b` / `#c9861a` | nur als Gradient-Ende in `.lb-gold`, Schatten |
| Dunkler Grund | `#0d0b0a` (Bar), `lb-bg` | Seitenhintergrund, TopNav |
| Text auf dunkel | `#fff`, `white/80`, `white/55` | Fließtext, Sekundärtext, Hinweise |
| Hell / Formulare | Schwarz · Weiß · Grau | siehe §4 |

**Verboten:**
- `#c9a23f` — mattes Braungold, **keine CI-Farbe**. Am 2026-07-27 repo-weit auf `#f6cf51` gezogen (91 Stellen). Nicht wieder einführen.
- Tailwinds `amber-*` als Akzent auf dunklen Kundenflächen (`text-amber-400`, `bg-amber-400/10`, `border-amber-300`) — dafür `#f6cf51` mit Opacity-Suffix nehmen: `text-[#f6cf51]`, `border-[#f6cf51]/40`, `bg-[#f6cf51]/10`.
  (`amber-*` in HELLEN Admin-Boxen — `bg-amber-50`, `text-amber-700` — bleibt erlaubt, das ist eine Hinweisbox, kein Akzent.)

## 2. Buttons

| Button | Klasse | wann |
|---|---|---|
| Primär auf dunkel | `.lb-gold` (globals.css) | die EINE Hauptaktion pro Screen: CTA, Abo, Generieren, Senden |
| Sekundär auf dunkel | `.lb-black3d` oder `border border-white/20 text-white/85` | „Mehr erfahren", Garderobe, Nebenwege |
| Aktiver Chip / Tab | `border-[#f6cf51]/40 bg-[#f6cf51]/10 text-[#f6cf51]` | NUR umrandet — nie gold gefüllt (Owner 06.08.2026: „ein chip darf nicht wie ein button aussehen") |
| Inaktiver Chip | `border-white/20 bg-white/5 text-white/85` | behält seinen Rand („wir brauchen einen rand bei inaktiv") — nur die Farbe wechselt |

Die Vorlage für beide ist das Chip-Paar der Kopfzeile in `components/GuthabenChip.tsx`
(„0,00 €" und „Galerie") — der Owner hat am 06.08.2026 darauf gezeigt: „hier ist es richtig".

Form: `rounded-full`, `h-11`/`h-12`, `font-black`, `active:scale-95 transition`.
`.lb-gold` nie flach nachbauen (`bg-[#f6cf51]` als Button = falsch, der Gradient ist die CI).

### 2a. Auswahl verschiebt NIE (Owner 07.08.2026: „man versetzt niemals Bilder")

Ein gewähltes Element — Chip, Kachel, Tab, Bildkachel — darf sich weder vergrössern noch
verschieben. **Es wechselt ausschliesslich die Farbe.** Jeder Zustand trägt dieselbe
Rahmenstärke, denselben Abstand, dieselbe Polsterung.

Gemessen an `BildWahl` (components/CI.tsx): dort stand `ring-2 … ring-offset-2` für die
Wahl und `ring-1` daneben. Ein Ring liegt AUSSERHALB der Fläche, die gewählte Kachel wuchs
um acht Pixel — beim Antippen sprang die ganze Reihe, weil das Bild eine Zeile höher sass
als sein Nachbar.

| | |
|---|---|
| Richtig | `ring-2 ring-offset-2` an BEIDEN Zuständen, nur `ring-[#f6cf51]` gegen `ring-white/15` |
| Falsch | verschiedene Rahmenstärken · `border` nur im aktiven Zustand · `scale` · ein zusätzliches `p-*` am Gewählten |

Der dunkle Abstandsring gehört in BEIDE Zustände: Ohne ihn verschwindet Gold auf einem
goldenen Motiv. Und eine Wisch-Fläche (`lb-wisch`) schneidet ihn an der ersten und letzten
Kachel ab, wenn die Fläche keine Polsterung hat (`px-1.5 py-1.5`).

## 3. Typo

**Zwei Schriften, und nur zwei** (Owner 06.08.2026: „die selbe schrift art bitte wie in der
Card aber wie ich sehe das steht gar nicht unter fonds"):

| Wo | Schrift | Wer setzt sie |
|---|---|---|
| Überall in der App | System-Sans, Gewichte nur `font-bold`/`font-black` | `body` in globals.css |
| **In der Einladungskarte** | **Serife** (`ui-serif, Georgia, Cambria, "Times New Roman"`) | die Klasse `.lb-karte` selbst — nie von Hand |

Die Karte ist Papier, kein Bildschirm; die Serife ist der Unterschied zwischen „KI-Werkzeug"
und „Einladung". Sie stand bis 06.08.2026 nirgends als Regel, sondern 15-mal als `font-serif`
an einzelnen Zeilen in `EinladungKarte.tsx` — wer eine neue Zeile in die Karte schrieb, bekam
die Hausschrift und merkte den Bruch erst im Bild. Jetzt erbt alles in der Karte die Serife.
**Ausser Knöpfen:** ein Kaufknopf ist Bedienung, kein Papier, und bleibt in der Hausschrift.

- Kein Light-Gewicht, nirgends.
- Kicker über der H1: `text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]`
- H1: `text-[34px] font-black leading-[1.05]`, ein Wort davon in `text-[#f6cf51]`
- H2: `text-[22px] font-black leading-tight`
- Fließtext: `text-[15px] font-medium leading-snug text-white/80`
- Kleingedrucktes / Hinweise: `text-[12px]–[13px] font-bold text-white/55`
- Labels über Schritten: `text-[12px] font-black uppercase tracking-wide text-white/50`
- Emoji sind Deko, nie Bedeutungsträger; in Buttons **kein** Emoji, dort Icons (`lucide-react`, `h-4 w-4`).

## 4. Hell vs. dunkel — die eine Regel

- **Dunkle Kundenfläche** (Startseite, Themen, Funnels, Wetter, Feed): dunkler Grund, weißer Text, Akzent `#f6cf51`, Hauptbutton `.lb-gold`.
- **Helle Box / Formular / Admin-Tool**: Schwarz · Weiß · Grau, `bg-white` + dunkler Text, **kein** Gelb/Gold. Siehe `docs/manage-landing-ci.md` §3.
- `.lb-theme` kippt `text-white` nach dunkel → in hellen Tools `bg-white` als Wurzel setzen, für weißen Text auf Bildern `lb-onmedia`.

## 5. Checkliste vor jedem Commit an UI

1. Kein `#c9a23f`, kein `amber-*` als Akzent auf dunkler Fläche.
2. Genau ein `.lb-gold`-Button pro Screen.
3. Kicker/H1/Fließtext in den Größen aus §3.
4. Icons statt Emoji in Buttons.
5. Helle Box = B/W/Grau.

Verwandte Memories: `ci-colors-typo-buttons`, `dark-surface-gold-design-tokens`, `fashion-aesthetic-bw-no-gold`, `form-ci-standards`.

## 6. Landingpage-CI (jede Landing, jeder Funnel — gleiche Typo)

Nicht mehr per Hand tippen: die Typo kommt aus **`components/Landing.tsx`**.
Alle Landings sehen dadurch gleich aus, egal wer sie baut.

| Element | Komponente | Ergibt |
|---|---|---|
| Kicker über der H1 | `<Kicker>` | `text-[11px] font-black uppercase tracking-[0.2em]` in CI-Gelb |
| Seiten-H1 (genau eine) | `<H1>` | `text-[34px] font-black leading-[1.05]`, weiß |
| Hervorgehobenes Wort | `<Y>` | CI-Gelb `#f6cf51` |
| Abschnittsüberschrift | `<SectionTitle>` | gelber Balken (`h-1 w-10`) + `text-[30px] font-black` **gelb-weiß**: Anfang weiß, Schluss der Zeile in CI-Gelb (macht die Komponente selbst) |
| Fließtext / Lead | `<Lead>` | `text-[16px] font-medium leading-relaxed text-white/75` |
| Kleingedrucktes | `<Fine>` | `text-[13px] font-bold text-white/55` |
| Schritt-Label im Funnel | `<StepLabel>` | `text-[12px] font-black uppercase tracking-wide text-white/50` |
| Link im Text | `<YLink>` | gelb, fett, unterstrichen |

Kontrast — Mindestwerte (Owner: „man sieht es tagsüber nicht"):
- Fließtext `text-white/85`, Kleingedrucktes `text-white/75` — **nie dunkler**.
- Schritt-Labels („1 · YOUR PHOTO") in CI-Gelb, nicht in grauem Weiß.
- Formularfelder: Rahmen `border-white/30`, Fläche `bg-white/[0.08]`, Platzhalter `placeholder:text-white/60`.
  `white/15`-Rahmen auf schwarzem Grund sind bei Sonnenlicht unsichtbar.

Regeln:
- **Headlines sind GELB-WEISS**: Zeilenanfang weiß, das Ende in CI-Gelb. Nie eine ganze Überschrift komplett gelb, nie eine komplett weiß.
- Genau **eine** `<H1>` pro Landing; alles Weitere ist `<SectionTitle>`.
- Kein `text-[22px]`/`text-[20px]` mehr für Abschnitte — das war der alte, zu kleine Stand.
- Über einer `<SectionTitle>` kein zusätzliches Mini-Label („See it in action") — der gelbe Balken ist die Gliederung.
- Umgesetzt auf: Startseite `/themes`, `/your-idol`, `/themes/kiss`, `/themes/birthday`, Try-On-Funnel `/try/[lookId]`.
