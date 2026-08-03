# Videos auf Landingpages — die Regel

Owner 03.08.2026: „**nein, nicht so, Mann — schau dir mal Kiss an.**"

Der Satz kam, nachdem ich die Tanz-Auswahl als Raster aus acht kleinen Videokacheln mit einem
kleinen Knopf darunter gebaut hatte. Die Kuss-Seite macht dasselbe seit dem 31.07. anders, und
das ist kein Geschmack, sondern das Ergebnis von drei Korrekturen hintereinander. Damit ich das
nicht wieder brieft bekomme, steht es hier.

**Die Vorlage im Code ist `components/BeispielGalerie.tsx`.** Wer eine neue Themenseite baut,
kopiert nicht das Aussehen — er benutzt diesen Baustein.

---

## 0. Der eine Satz

> Ein Video auf einer Landingpage ist kein Vorschaubild. Es ist **das Ergebnis**, das er
> bekommt — also zeig es so, wie er es bekommt: in der Karte, in voller Breite, mit dem Knopf
> darauf.

---

## 1. Drei Sorten Video — nicht verwechseln

| Sorte | Wo | Baustein | Schleife | Ton |
|---|---|---|---|---|
| **Themen-Kachel** | Startseite, Kachelwand der Themen | `SchleifenVideo` direkt | ja, weich | stumm |
| **Beispiel-Karte** | Themen-Landingpage, unter dem Trichter | `BeispielGalerie` → `EinladungKarte` | siehe §3 | Ton-Knopf |
| **Eigenes Ergebnis** | im Trichter, in der Galerie, auf der geteilten Seite | `EinladungKarte` | siehe §3 | Ton-Knopf |

Die Kachel ist klein und darf klein sein — sie ist ein Wegweiser. **Alles andere ist eine
Karte.** Eine Beispiel-Karte als Kachel zu bauen ist der Fehler, um den es hier geht.

---

## 2. Die Beispiel-Karten — das Kuss-Muster

Owner 31.07.2026, in drei Schritten bis hierher:

1. „mach lieber die Galerie **nicht in zwei Reihen sondern in einer Reihe**, und du machst den
   Button Replace People **auf jedem**"
2. „du machst **diese Karte mehrmals untereinander** und nimmst unsere Kiss-Videos."
3. „**richtiges CTA**"

### Die sechs Eigenschaften, die eine Beispiel-Karte haben MUSS

**1 — Eine Spalte, volle Breite, untereinander.**
Kein Raster, keine zwei Reihen. Acht Briefmarken nebeneinander sind acht Vorschaubilder;
viermal dieselbe Karte untereinander ist viermal dasselbe Versprechen. Wer scrollt, soll das
Versprechen wiederholt sehen, nicht einmal in klein.

**2 — Es ist DIESELBE Karte wie das Ergebnis** (`EinladungKarte ... demo`).
Owner 03.08.2026, so deutlich wie es geht: „**ich bitte dich, benutze IMMER die Cards für die
Videos mit Titel oben und Made by Luxurybandit.com. Genau wie Kiss.**"
Mit Ornamenten, mit „made by luxurybandit.com", mit allem. Das ist der ganze Trick: Es sieht
aus wie das, was er bekommt, **weil es dieselbe Datei ist**. Ein nacktes `<video>` daneben sieht
aus wie ein anderes Produkt.

**3 — Auf jeder Karte derselbe Knopf.**
Ein echtes CTA: `lb-gold`, `h-12`, `w-full`, `rounded-full`, unten in der Karte. Vorher stand da
eine dunkle, halbdurchsichtige Pille — die sah aus wie eine Bildunterschrift und nicht wie
etwas, das man drückt. Damit ist jedes Beispiel ein **Startpunkt** und nicht Deko: „genau das,
aber mit uns beiden."

**4 — Das ganze Video ist der Knopf.**
Owner: „beim Klick auf Video kommt direkt Upload". Wer ein Beispiel ansieht und es antippt,
meint genau das. Ihn dann eine kleine Schaltfläche suchen zu lassen, ist eine Hürde ohne Grund.

```
absolute inset-x-0 bottom-0 top-16 z-20     ← die Tippfläche
```

`top-16`, **nicht `inset-0`** — sonst liegt die Fläche über dem Ton-Knopf und die Musik ist
nicht mehr einzuschalten. Und ein `<div role="button">`, kein `<button>`: Ein Knopf im Knopf ist
kaputtes HTML.

**5 — Teilen-Knopf links oben, `z-30`.**
Owner 31.07.2026: „das kann man auch sharen, damit die Leute Werbung machen können." Beim
**Beispiel** ist das Ziel die Themenseite (`/themes/…?utm_source=share`) — wer den Link bekommt,
soll hierher. `z-30`, sonst schluckt die Tippfläche aus Punkt 4 den Knopf.

**6 — Erst scrollen, dann öffnen.**

```ts
window.scrollTo({ top: 0, behavior: "smooth" });
window.dispatchEvent(new CustomEvent(SCHRITTE_OEFFNEN));
```

Sonst öffnet sich der Dialog, während er unten steht, und er sieht nicht, dass etwas passiert
ist.

### Warum ein Fenster-Ereignis und kein Prop

Die Karten stehen auf der **Seite** (Server-Komponente), der Trichter ist ein eigener Baustein
darüber. Ein Prop hieße, den halben Trichter-Zustand durch die Seite zu reichen. So ist es eine
Zeile hier (`dispatchEvent`) und eine dort (`addEventListener`).

Wer eine **Auswahl** braucht (welche Vorlage?), legt die Wahl zusätzlich in `localStorage` ab —
das Ereignis kann verlorengehen, wenn der Trichter beim Klick noch nicht steht.

### Der Knopf muss ehrlich bleiben

Es gibt genau **einen** Gratis-Versuch je Gerät und Tag. Vier Karten mit „Personen ersetzen"
versprechen vier. Wer den zweiten probiert, lädt Fotos hoch und bekommt eine Absage — das ist
der Moment, in dem Leute schließen statt zu kaufen. Deshalb hört die Galerie auf
`lb-gratis-verbraucht` / `localStorage.lb_gratis_verbraucht` und trägt danach den **Kaufknopf**:
dieselbe Wirkung, aber ehrlich (`gesperrtText`).

---

## 3. Die drei Schalter der Karte

Aus `karte-ist-die-huelle-fuer-videos` — bei jedem Video einzeln entscheiden:

| Schalter | Wann | Warum |
|---|---|---|
| `schleife={false}` | jemand **spricht** im Video | Einen gesprochenen Satz will niemand sofort wieder von vorn. Spart auch den zweiten Spieler. |
| `originalton` | die **Stimme ist der Inhalt** | Sonst redet unsere Musik dagegen an. Der Ton-Knopf schaltet dann das Video stumm statt einer Tonspur daneben. |
| `verhaeltnis="aspect-[9/16]"` | das Video ist **nicht 3:4** | Die Karte steht fest auf 3:4. Ein 9:16-Video verlor darin ein Viertel der Höhe — bei einem sprechenden Menschen genau den Kopf. |

Im Zweifel **messen**: `videoWidth / videoHeight` gegen die Fläche. Nicht schätzen.

Der **Ton-Knopf bleibt immer nötig** — Browser lassen keinen Ton ohne Geste zu.

---

## 4. Kein `loop`, nie

Owner 03.08.2026: „es läuft in Schleife, aber es fängt ohne Überblendung wieder an. Kann man das
schön optimieren, dass es kein Bruch gibt? **Merk dir das bei allen Videos.**" — und kurz
darauf: „auch bei den Topics-Video die gleiche Überblendung."

`components/SchleifenVideo.tsx`: zwei gestapelte Spieler, 0,7 s Überblendung. Ein Video, das
alle acht Sekunden hart schneidet, sieht nach einem Fehler aus. Eine Überblendung sieht nach
Absicht aus.

Auf einer Kachelwand mit sechs Themen springen sechs Videos unabhängig voneinander — das fällt
mehr auf als die Videos selbst.

---

## 5. Das Video steht GENAU EINMAL auf der Seite

Owner 03.08.2026: „**wieso das Video jetzt unten?**"

Unter der Karte lag ein zweiter, nackter Spieler mit `loop` — der Rest eines am 31.07.
aufgelösten Blocks. Der Code-Kommentar sagte es sogar: „der Video-Spieler darunter blieb."

**Es fällt nur auf, wenn ein Video existiert.** Auf einer frischen Seite sieht man es nie, und
deshalb überlebt so etwas jeden Umbau.

> **Wer an einer Landingpage arbeitet, prüft mit fertigem Video, nicht mit leerem.**

---

## 6. Prüfliste vor dem Push

- [ ] Eine Spalte, volle Breite — kein Raster
- [ ] `EinladungKarte`, nicht `<video>`
- [ ] CTA auf **jeder** Karte, gold, volle Breite
- [ ] Ganze Fläche tippbar ab `top-16`, `z-20`
- [ ] Teilen-Knopf links oben, `z-30`, Ziel = Themenseite
- [ ] Klick scrollt **erst** nach oben, dann öffnet er
- [ ] `schleife` / `originalton` / `verhaeltnis` je Video entschieden
- [ ] kein `loop` im Markup
- [ ] Video steht **einmal** auf der Seite — mit fertigem Video geprüft
- [ ] Knopfbeschriftung in **allen sieben Sprachen** (`lib/lang.ts`), nicht nur Deutsch
- [ ] Preise nur aus `lib/pricing.ts`, nie eingetippt

---

## 7. Was schon schiefgegangen ist

| Was | Warum es passierte |
|---|---|
| Raster aus acht Kacheln mit kleinem Knopf | „nicht so, Mann" — Kachel = Vorschaubild, Karte = Ergebnis |
| Play-Knopf reagierte nicht | Upload-Fläche lag darüber, beide `z-20`. Programmatischer Klick ging, echtes Tippen nicht. Mit `document.elementFromPoint` prüfen, **was** den Klick bekommt. |
| Karte schnitt das Video an | `aspect-[3/4]` (0,750) gegen 1080×1920 (0,563) — ein Viertel Höhe weg, oben und unten |
| Video lief nicht ohne Schleife | `if (!va \|\| !vb) return` stand vor der Abkürzung — ohne Schleife gibt es keinen zweiten Spieler |
| Deutsche Wörter auf englischer Seite | „ab €24.50/Monat", „gratis" — Zahlen aus der Preistabelle reichen nicht, **die Wörter drumherum sind auch Sprache** |
| Leere Kacheln | „ich will sie jetzt testen aber ich sehe nichts" — Pfad/Groß-Kleinschreibung; auf Vercel zählt sie, lokal nicht |
| Beispiel-Streifen im Trichter | „das ist überflüssig" — kleine Beispiele **im** Trichter sind Ballast. Beispiele gehören auf die Seite, unter den Trichter. |
| Trichter zeigte ein anderes Bild als das gewählte Video | „ich habe ein ganz anderes Video ausgesucht" — die Wahl auf der Landingpage muss im Trichter **sichtbar** ankommen, nicht nur im API-Aufruf. Was oben gewählt wird, steht unten als Bild. |
| Grauer Kasten „Choose a topic → " | „das hast du aber lieblos jetzt gemacht" — ein Schild, das auf eine Tür zeigt, statt der Tür. Zeig die Themen selbst, antippbar. |

---

Verwandt: `PLAN-GESCHENKE-FLOW.md` §2 (die Regeln, die Geld gekostet haben) ·
Erinnerungen `karte-ist-die-huelle-fuer-videos`, `videos-nahtlos-schleifen`,
`video-playback-behavior`, `feed-spec`.
