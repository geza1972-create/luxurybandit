# Übergabe — Stand 10.08.2026, abends

Ein langer Tag: neue Preise, ein neues Thema, der Seitenkopf für alle Seiten, die
Traumwelt-Kette der Hochzeit. Alles davon ist committet und gepusht; **deployt ist nichts**
(`npx vercel --prod`, Owner-Entscheidung).

Wer hier weitermacht, braucht diese Seite und die Kommentare im Code — beides ist die Quelle,
nicht das Gespräch.

---

## 1. EIN Kassen-Funnel — erledigt

> Owner: „Der Tunel ab Bezahlung kannst du bei allen gleich machen. Das ist den Kassen Funel."

**Es gibt jetzt eine Kasse.** Die Regeln stehen in `lib/kasse.ts` (welche Aufladestufen einen
Kauf decken, wie das Guthaben gelesen wird, was `aufladeZiel` und `kontoFrisch` leisten
müssen), das Fenster in `components/CI.tsx` als `AufladeWaehler` — mit Adresse zum Ändern,
„Ich habe schon ein Konto", roter Begründung, Siegel und Geld-zurück-Garantie. Beide Trichter
benutzen es: `KissFunnel` (Kuss · Geburtstag · Tanz · Versprechen) und `EinladungBauen`
(Hochzeit · Urlaub). Der Gutschein hat keine eigene Kasse — seine Karte ist gratis, bezahlt
wird nur das beigelegte Geschenk.

**Drei Dinge, die die Einladung dabei dazubekommen hat** (sie fehlten dort ganz):

- Die Aufladestufen **verrechnen das vorhandene Guthaben**. Wer 20 € liegen hat und eine
  29,99-€-Einladung will, braucht 10 € — bisher verlangte sie 30 €.
- Der Weg zum eigenen Konto im Kaufmoment. Wer sein Guthaben auf einer anderen Adresse hat,
  hatte hier keine Chance, es zu benutzen.
- **Der Preis des Aufwertens stimmt.** „Daraus ein Video machen" bucht 15 €
  (`VIDEO_UPGRADE_CENTS`) ab, die Guthaben-Prüfung las aber die 9,99 € der Karte: mit 10 € auf
  dem Konto ging der Kauf zur Kasse, die Abbuchung scheiterte, und dahinter stand eine
  Stripe-Sitzung über einen Betrag, den niemand angeboten hatte. Jetzt gibt es
  `kaufPreisCents(videoAufpreis)` — eine Zahl für Schild, Prüfung und Abbuchung.

Geprüft: sieben Seiten geladen, Wähler live geöffnet auf Tanz (KissFunnel), Urlaub und
Hochzeit (EinladungBauen); der Baustein steht auch auf der Muster-Seite `/ci`. `next build`
läuft durch. **Deployt ist nichts.**

---

## 1a. Der alte Auftrag (Stand vor dem 11.08., zum Nachlesen)

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

Alle vier sind erledigt (siehe oben). Der Geburtstag kam am Schluss dran und behielt dabei
jede Zeile seines Verhaltens — es wurde nur dieselbe Fassung eingesetzt, die vorher in ihm
stand. **Was noch offen ist: der erste echte Kauf über den vereinheitlichten Weg.** Die
Klickprobe reicht bis zum Wähler; Stripe, Gutschrift und Abbuchung hat sie nicht angefasst.

---

## 2. Zwei Zahlen, die der Owner entscheiden muss

- **Urlaub: 9,99 € oder 29,99 €?** Die Katalog-Kachel sagt 29,99 € (er hängt an
  `HOCHZEIT_START_CENTS`, weil er dieselbe Einladungs-Maschine benutzt), der Kaufknopf auf der
  Urlaubsseite sagt 9,99 €. **Daran hängt die Abbuchung** — bis zur Entscheidung nicht anfassen.
- **Gutschein-Schild „ab 15 €".** Das war der Preis des billigsten Geschenks, das man
  hineinlegen kann. Seit dem 10.08. kostet das billigste **9,99 €** (`GESCHENK_VIDEO_CENTS`).

---

## 3. Kleine Reste

**Erledigt am 11.08.2026** (die drei Hochzeits-Reste, in einem Zug):

- **Die Szenen-Kacheln der Hochzeit sind raus.** Sie wirkten seit der Traumwelt-Kette nicht
  mehr — und ihre Bilder waren Fotos aus der alten Kette, zeigten also auch noch den falschen
  Stil. Der Urlaub behält seine Szenen (er läuft weiter über den alten Weg). Weg zurück steht
  im Kommentar bei `SZENEN` in `components/EinladungBauen.tsx`: Er braucht ZWEI Dinge —
  Ort/Kuss an `hochzeitTraumPrompt` gehängt UND zwei neue Kacheln im gemalten Stil (zwei
  bezahlte Bild-Läufe, ~30 ct, nur auf Ansage).
- **`/einladung/beispiel` zeigt jetzt dasselbe Gemälde** wie die Landingpage — mit Poster.
- **Die Muster-Einladung ist verlinkt**, eine Zeile unter der Karte der Hochzeitsseite
  („Sieh dir eine echte Einladung an — genau so, wie deine Gäste sie bekommen →"). Kein
  zweiter Knopf: Der Kaufknopf bleibt der einzige im ersten Bild.
- Dabei entstanden: `lib/hochzeit-video.ts`. Das Hochzeitsvideo stand an drei Stellen als
  Zeichenkette im Code und an einer vierten gar nicht (die Muster-Einladung holte es aus der
  Supabase-Ablage — daher das alte Video). Jetzt eine Zeile für alle.

**Noch offen:**

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
