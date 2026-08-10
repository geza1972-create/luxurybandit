# Übergabe — Stand 10.08.2026, abends

Ein langer Tag: neue Preise, ein neues Thema, der Seitenkopf für alle Seiten, die
Traumwelt-Kette der Hochzeit. Alles davon ist committet und gepusht; **deployt ist nichts**
(`npx vercel --prod`, Owner-Entscheidung).

Wer hier weitermacht, braucht diese Seite und die Kommentare im Code — beides ist die Quelle,
nicht das Gespräch.

---

## 1. Der nächste Auftrag: EIN Kassen-Funnel

> Owner: „Der Tunel ab Bezahlung kannst du bei allen gleich machen. Das ist den Kassen Funel."
> · „Wir haben doch 3 Tage Geburstags funel optimiert. Der gilt."

**Der Geburtstags-Kaufweg ist der Maßstab.** Er lebt in `components/KissFunnel.tsx` — der
Dateiname ist historisch, der Geburtstag ist eine Variante darin.

**Das Problem:** Es gibt zwei Kassen.

| | Kuss · Geburtstag · Tanz · Versprechen | Hochzeit · Urlaub · Gutschein |
|---|---|---|
| Datei | `components/KissFunnel.tsx` | `components/EinladungBauen.tsx` |
| Guthaben, Aufladewähler, Abbuchen, Fortsetzen nach Aufladung | Original | **nachgebaut** |

Das ist keine Theorie: Am 10.08. sind daran **drei** Geldfehler entstanden — der Knopf der
Einladung sagte 15 €, während die Kasse 29,99 € nahm; die Erstattung gab 15 € für ein
9,99-€-Video zurück; der Geburtstag verlangte 4,99 € und buchte 15 € ab. Jeder davon war eine
zweite Stelle, die dasselbe wusste.

**Der Weg (in dieser Reihenfolge, damit der funktionierende Geburtstag nicht kippt):**

1. **Die Regeln** in einen eigenen Baustein: welche Aufladestufen einen Kauf decken, wie das
   Guthaben gelesen wird, was nach der Aufladung weiterlaufen muss (`aufladeZiel`,
   `kontoFrisch` — siehe Skill `bezahlung` §1).
2. **Den Aufladewähler in die Bibliothek** (`components/CI.tsx`) — das helle Fenster mit
   `Zahlungssiegel` und Geld-zurück-Garantie, das am 10.08. entstanden ist.
3. **Hochzeit, Urlaub, Gutschein umstellen.** Der Geburtstag bleibt bis zuletzt unverändert.
4. **Sieben Seiten bis zum Aufladewähler durchklicken** — kein echter Kauf nötig, kostet nichts.

---

## 2. Zwei Zahlen, die der Owner entscheiden muss

- **Urlaub: 9,99 € oder 29,99 €?** Die Katalog-Kachel sagt 29,99 € (er hängt an
  `HOCHZEIT_START_CENTS`, weil er dieselbe Einladungs-Maschine benutzt), der Kaufknopf auf der
  Urlaubsseite sagt 9,99 €. **Daran hängt die Abbuchung** — bis zur Entscheidung nicht anfassen.
- **Gutschein-Schild „ab 15 €".** Das war der Preis des billigsten Geschenks, das man
  hineinlegen kann. Seit dem 10.08. kostet das billigste **9,99 €** (`GESCHENK_VIDEO_CENTS`).

---

## 3. Kleine Reste

- **Die vier Szenen-Kacheln der Hochzeit wirken nicht mehr.** Seit der Traumwelt-Kette bauen
  Bild und Video immer dieselbe Welt; die Wahl ändert nichts. Empfehlung: raus — eine Wahl,
  die nichts tut, ist schlimmer als keine. (Alternative: den Ort der Szene in
  `hochzeitTraumPrompt` hängen.)
- **`/einladung/beispiel` zeigt noch das alte Video.** Die Muster-Einladung ist die stärkste
  Verkaufsseite im Haus (vollständige Einladung mit Zusagen, Menü, Gruppenchat) und seit heute
  das Ziel des Teilen-Knopfes — sie sollte dasselbe Gemälde zeigen wie die Landingpage.
- **Nirgends verlinkt:** dieselbe Muster-Einladung. Ein Satz unter der Karte der
  Hochzeitsseite („So sieht eure fertige Einladung aus →") wäre der stärkste Beweis vor dem
  Kauf.
- **HeyGen-Geldbörse ist leer** (15 API-Credits). Kundenvideos laufen über die API und
  scheitern ohne Guthaben — **vor jeder Werbung aufladen**. Preise: API 0,05 $/s (Kundenvideo
  ~0,25 $), Weboberfläche 20 Credits/Minute. Beispielvideos macht der Owner selbst in der
  Oberfläche, das ist dort billiger.

---

## 4. Regeln, die heute entstanden sind (gelten weiter)

- **Seitenkopf-Template für ALLE Seiten** — `Landingpage.md` §9: CTA im Viewport, H1 28 px,
  `pt-3`, Karte `mt-4`, Preis IM Knopf, Erklärtexte unter die Karte. Gemessen, nicht geschätzt.
- **Nie eine E-Mail-Adresse auf der Seite** (Spam) — nur `/contact`. Skill `ci-design`.
- **Ein Video aus einer Konstante** für Kachel und Landingpage-Karte; **keine Videos aus einem
  fremden Ordner**.
- **Beispielvideos werden nicht übersetzt** — ein englisches Video, die Übersetzung steht als
  Text darunter.
- **Preise nur aus `lib/pricing.ts`**; Schild, Knopf, Guthaben-Prüfung, Abbuchung und
  Erstattung lesen dieselbe Zahl.
- **Kein bezahlter KI-Lauf ohne ausdrückliche Ansage des Owners.**
