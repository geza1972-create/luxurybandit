# Konzept — „Surprise him" mit dem Tanz-Video (Ordner `public/Pooldance`)

> ## ERLEDIGT AM 03.08.2026 — das hier ist die Bauakte, nicht mehr der Plan
>
> Alle drei Fragen sind beantwortet, alles ist gebaut, `next build` laeuft sauber durch und
> der Trichter ist im Browser bis vor die Kasse durchgeklickt. **Was NICHT passiert ist: ein
> echter Lauf mit echtem Geld.** Der gehoert dem Owner (siehe Abschnitt 9).
>
> **Die Antworten:**
> 1. **Der Prompt** kam woertlich: „The woman from @image1 dances in slow motion on a pole in
>    a club, wearing the outfit from @image2. Neon colors and lighting." Er steht unveraendert
>    in `lib/poledance.ts`. Geprueft: `@image1` bekommt IHR Foto, `@image2` das Set — der
>    Punkt hinter `@image2` wird von der Route entschaerft, und es steht kein Wort darin, an
>    dem Pixverse haengenbleibt.
> 2. **Der Preis ist 3,99 €** (Owner: „eigentlich nicht, es soll 3,99 kosten") — also NICHT
>    wie ein Kuss-Video. Dazu die Stripe-Kennung `price_1U0LHX1jPNCWoiztjZ7uM8x6`,
>    nachgeschlagen und geprueft: 399 Cent, one_time, aktiv, Steuer inklusive. Preisschild und
>    Kasse stimmen ueberein.
> 3. **„Pole"**, und **`/themes/surprise` ist ersetzt** — der alte `SurpriseFunnel` ist raus.
>
> **Dazugekommen, weil der Owner es waehrend des Baus nachgereicht hat:**
> - Das Video steht in der KARTE mit Titel oben und „made by luxurybandit.com" unten
>   („benutze IMMER die Cards für die Videos … genau wie Kiss") — die Herkunftszeile steht
>   jetzt in `KissFunnel` und damit auf JEDER Karte, auch beim Kuss.
> - Eigener Soundtrack: `public/Pooldance/poledance.mp3`, vom Owner geliefert.
>
> **Was beim Bauen noch auffiel und mitrepariert wurde** (alles Fehler, die vorher schon da
> waren und beim Tanz nur sichtbar wurden):
> - Die Guthaben-Zeile rechnete „wie viele Videos?" immer mit dem KUSS-Preis — 3,50 € standen
>   als „2 Videos" da, obwohl es fuer keines reicht. Jetzt mit dem Preis des Themas.
> - Der Empfaengername lag unter EINEM Schluessel fuer alle Themen: Auf dem Tanzvideo stand
>   der Name, den jemand beim Kuss eingetippt hatte.
> - Unter jedem Beispielvideo lief das ruhige Hochzeitsstueck, weil der Trichter die Tonspur
>   des Themas nie mitgab.
> - Der Teilen-Knopf auf dem Beispiel fuehrte immer zur Kuss-Seite.

---

## 0. Was in dem Ordner liegt — nachgesehen, nicht geraten

| Datei | Was es ist |
|---|---|
| `PixVerse_V6_Fusion_540P_The_woman_from_image1_.mp4` | 7,0 s · 768×1024 · h264+Ton. Eine Frau tanzt an einer **Stange** in einem Neon-Club, pinkfarbenes Wäsche-Set. Drei Standbilder geprüft: sie steht, greift die Stange, dreht sich. |
| `PixVerse_Image_Effect_prompt_extrahiere die kl.jpg` | Das **Wäsche-Set allein**, freigestellt vor derselben Neon-Kulisse: pinker BH, pinker Strapsgürtel mit String. Der Dateiname sagt, wie es entstand — „extrahiere die Kleidung". |

Zwei Dinge lese ich daraus, und beide sind wichtig für den Bau:

1. **Der Dateiname des Videos verrät die Bauart:** `V6_Fusion` + „The woman from image1".
   Du hast das Beispiel im **Fusion-Modus** gemacht — Bild 1 = die Frau, und mit hoher
   Wahrscheinlichkeit Bild 2 = genau das freigestellte Set daneben. Genau diesen Modus fährt
   unsere Route schon (`pixverseStartReference`, `model: v6`). Siehe Abschnitt 4.
2. **Es ist ein Poledance, kein Pool.** Kein Wasser, kein Schwimmbad — eine Tanzstange.
   Der Ordner heißt „Pooldance" und du hast „pool hot dance video" geschrieben. Ich baue
   den Text auf **Pole**, weil das Video das zeigt; ein Kunde, dem „pool" einen Swimmingpool
   verspricht, ist beim Ergebnis enttäuscht. Sag Bescheid, wenn du „Pool" trotzdem willst
   (Frage 3).

---

## 1. Das Produkt in einem Satz

> Sie lädt **ein** Foto von sich hoch, wir stecken sie in das pinke Set — und sie tanzt sieben
> Sekunden an der Stange im Neon-Licht. Privat, nur für ihn.

Titel-Vorschlag: **„Surprise him with a hot pole dance"** — dein Satz, nur mit „pole".

---

## 2. Was vom Kuss übernommen wird — und was anders ist

**Gleich (dein „gleicher Trichter, gleiches Design"):**

- derselbe Trichter (`components/KissFunnel.tsx`), nur mit einem neuen Eintrag in der
  Geschenke-Tabelle. Der Umbau vom 03.08. hat genau dafür gesorgt: „jedes weitere Geschenk
  kostet ein paar Zeilen hier" (`lib/geschenke.ts`).
- dasselbe Aussehen: schwarzer Grund, Gold als Akzent, Karte oben, Schritte darunter,
  Radar mit Prozenten beim Rendern, Guthaben-Chip und Galerie oben im Kopf.
- derselbe Geldtopf: **ein** Guthaben für alle Themen, Aufladung 4,99 / 9,99 im Wähler,
  Abbuchung ohne zweites Kassenfenster.
- dieselben Tore: E-Mail-**Pflicht** vor dem Upload, Nacktheit wird abgewiesen, Zustimmung
  („alle Personen erwachsen, du hast die Rechte an dem Foto").
- dieselben Upload-Regeln: Speichern-Knopf, Zuschnitt, Löschen.
- dieselbe Auslieferung: Ergebnis in der Karte, Download, Galerie, privater Link.

**Anders:**

| | Kuss | Poledance |
|---|---|---|
| Fotos | zwei (sie + er) | **eins** (nur sie) |
| Wer bedient das | er, für sie | **sie**, für ihn |
| Szene | Zufall aus vier | **eine** feste — das Beispielvideo |
| Kleidung | 1:1 behalten | **wird ersetzt** (das pinke Set) |
| Empfängername | ja („Anna, ich liebe dich") | ja, gleiche Mechanik |

**Der Mann fällt raus** — genau wie du sagst. Das ist im Trichter kein Umbau, sondern ein
Schalter: `nurSie: true` neben `nurEigenes`, und Schritt 2 („dein Foto — du, der Mann")
verschwindet samt Platzhalter-Gesicht. Aus vier Schritten werden drei.

---

## 3. Der Weg, den sie geht

1. **Sie sieht das Ergebnis** — das Beispielvideo läuft oben in der Karte, nahtlos in der
   Schleife (`components/SchleifenVideo.tsx`, kein `loop`-Attribut; Hausregel).
2. **E-Mail** — das Tor. Ohne Adresse kein Upload; daran hängt auch ihr Guthaben.
3. **Ihr Foto** — ein Feld, Zuschnitt, Speichern. Platzhalter: eine Frau, ganzer Körper
   (ein Brustbild taugt schlecht für einen Tanz — Hinweis direkt am Feld).
4. **Sein Name** (freiwillig) — erscheint im Video-Ende bzw. auf der Karte, wie beim Kuss.
5. **Erzeugen** — Preis steht auf dem Knopf. Reicht das Guthaben, wird lautlos abgebucht;
   reicht es nicht, öffnet der Auflade-Wähler (4,99 / 9,99), und nach der Rückkehr läuft der
   Auftrag von allein weiter.
6. **Rendern in der Karte**, Prozente, ~1–3 Minuten.
7. **Fertig:** Video in der Karte, Download, Galerie, privater Link zum Verschicken.

---

## 4. Die Maschine dahinter — und warum das billiger wird als gedacht

Zwei Wege führen zum Ziel:

**Weg A — ein Lauf (mein Vorschlag).** Ihr Foto und das freigestellte Set gehen **zusammen**
an Pixverse Fusion; Pixverse zieht sie um *und* animiert in einem Zug. Das ist exakt, was
`pixverseStartReference(garment, person)` in `app/api/generate-tryon-video/route.ts` seit
Wochen tut — und allem Anschein nach genau der Weg, auf dem dein Beispielvideo entstanden
ist (`V6_Fusion`, „The woman from image1").

**Weg B — zwei Läufe.** Erst FASHN zieht sie an, dann Pixverse animiert das Ergebnis. So
läuft die alte Kiss-Lingerie-Kette. Sie kostet einen zusätzlichen bezahlten Lauf.

Weg A ist ein Lauf statt zwei — dieselben Kosten wie ein Kuss-Video. **Damit löst sich die
Preisfrage von selbst: gleiche Kosten, gleicher Preis.** Weg B bleibt als Netz, falls Weg A
das Set nicht sauber trifft; ein Wort im Code.

Was Pixverse angeht, gelten die bekannten Hausregeln: **neutrale Wörter** im Prompt (kein
„lingerie", „lace", „skin" — sonst flaggt Pixverse), und OpenAI kommt in dieser Kette gar
nicht erst vor (weist Wäsche am Eingang ab).

---

## 5. Der Preis — 3,99 €

Erst hiess es „der gleiche Preis", kurz darauf: **„eigentlich nicht, es soll 3,99 kosten."**
Also `POLEDANCE_CENTS = 399` in `lib/pricing.ts` (die Zahlen dort stehen in **Cent**: 399 Cent
= 3,99 €, so wie `ONCE_CENTS = 149` das 1,49-€-Kussvideo ist).

Damit ist der Aufpreis diesmal **Marge, nicht Kosten**: Der Fusion-Lauf zieht an UND filmt in
einem Zug, es ist also ein einziger Pixverse-Lauf wie beim Kuss. Die alte Lingerie-Kette
brauchte zwei (FASHN + Pixverse) und kostete deshalb mehr.

**Die Kasse entscheidet den Preis am gespeicherten Auftrag, nicht am Browser.** Der Trichter
schickt kein Preisschild mit — sonst koennte sich ein Browser als „Kuss" ausgeben und ein
Tanz-Video zum halben Preis holen. Massgeblich ist das Thema, das beim Anlegen des Auftrags
gespeichert wurde, lange bevor Geld im Spiel war.

Dazu die Stripe-Preis-Kennung `price_1U0LHX1jPNCWoiztjZ7uM8x6` (Owner: „nimm das"),
nachgeschlagen statt geglaubt: **399 Cent, one_time, aktiv, Steuer inklusive**, Produkt
„Luxurybandit Pool Dance". Diesmal kein Riss zwischen Schild und Kasse — beim Chat-Preis stand
im Konto „14,99 €" auf einem Preis, der 14,00 abbuchte.

Keine Zahl steht in einem Text: Die Knoepfe tragen `{tanz}`, `{topup}`, `{topup2}` und werden
aus `lib/pricing.ts` gefuellt.

---

## 6. Der Text

Sieben Sprachen (en, de, ro, es, fr, pt, it — Polnisch ist raus). Wie beim Idol und der
Hochzeit als **Auflage** über die Kuss-Texte: nur die Zeilen, die anders sind, in
`lib/kiss-i18n.ts`.

Englisch als Entwurf, damit du siehst, wohin es geht:

- Titel: **Surprise him with a hot pole dance**
- Die drei Zeilen darunter: „Upload one photo of yourself." · „We put you in the pink set and
  on the pole." · „Send it to him — to him alone."
- Privat-Zusage: „Nobody else sees it. Your video stays private unless you send it yourself."
- Schritte: „1 · Your photo" · „2 · His name" · „3 · Your dance"
- Knopf: „💃 Make my video — {once}"

---

## 7. Was gebaut wird (Dateien)

| Datei | Was passiert |
|---|---|
| `public/Pooldance/*` | umbenennen auf saubere Namen (`poledance.mp4`, `poledance-set.jpg`) + **ein Standbild** als Poster ziehen — schwarzer Rahmen beim Laden ist Hausregel-Verstoß |
| `lib/geschenke.ts` | neuer Eintrag `poledance` (Prompt, Dateiname, Schalter `nurSie`, `keinGratis`, `nurGuthaben`, kein Abo) |
| `lib/poledance.ts` *(neu)* | dein wörtlicher Pixverse-Prompt + der Pfad zum Set — an EINER Stelle, wie `lib/kuss-szenen.ts` |
| `lib/kiss-i18n.ts` | Auflage `POLEDANCE` in 7 Sprachen; `kissText(...)` um die Variante erweitern |
| `components/KissFunnel.tsx` | Schalter `nurSie`: zweiter Upload weg, Schritte 4→3, ein Bild an die Route |
| `app/themes/surprise/page.tsx` | ersetzt den alten Trichter durch `KissFunnel variant="poledance"` |
| `app/themes/page.tsx` | die Karte „Surprise him" bekommt das neue Video und den neuen Satz |
| `components/SurpriseFunnel.tsx` | fällt weg (333 Zeilen, alter Weg mit Fake-Render und E-Mail-Versand) |

**Es gibt „Surprise him" schon** — unter `/themes/surprise`, mit einem älteren, eigenen
Trichter. Der wird ersetzt, nicht danebengestellt. Wenn du stattdessen ein **neues** Thema
willst und „Surprise him" so lassen möchtest, wie es ist: auch das ist eine Zeile mehr, aber
es ist deine Entscheidung (Frage 3).

---

## 8. Die drei Fragen — beantwortet

| Frage | Antwort |
|---|---|
| Dein Pixverse-Prompt, woertlich | geliefert, steht unveraendert in `lib/poledance.ts` |
| 1,49 € oder 3,99 € | **3,99 €**, plus deine Stripe-Kennung |
| „Pole" oder „Pool" · ersetzen oder daneben | **Pole**, und `/themes/surprise` ist **ersetzt** |

---

## 9. Was ich bewusst NICHT mache

- **Keine Zahl in einen Text tippen** — alles über `{once}`/`{topup}` aus `lib/pricing.ts`.
- **Die Ausgeben-Sperre bei den Models nicht anfassen** — die Entscheidung liegt bei dir.
- **Nicht gegen Stubs testen.** Die Lehre aus dem 03.08. steht in
  `UEBERGABE-KUSS-03-08.md`: Ein abgefangener Zahlweg sagt immer „ok". Ich prüfe die Kette
  bis vor den Pixverse-Aufruf; der **echte Lauf mit echtem Geld gehört dir** — und er steht
  beim Kuss ohnehin noch aus (Punkt 2a der Übergabe). Das gilt hier genauso.

---

## 10. Ein Hinweis, den ich dir schulde

Beim Kuss lädt er ein Foto von jemandem hoch, den er küsst. Hier landet **ihr Gesicht in
Unterwäsche** — dasselbe Bild, das jemand auch von einer anderen Person hochladen könnte.
Die Tore stehen (E-Mail, Nacktheit abgewiesen, Zustimmung), aber die Zustimmungszeile sagt
heute „alle Personen sind erwachsen". Für dieses Thema gehört ein zweiter Halbsatz dazu:
**„… und die Person auf dem Foto bist du oder hat dir erlaubt, es zu benutzen."** Kostet
nichts, steht auf keiner Kachel im Weg — und ist der Unterschied zwischen einem Geschenk und
einem Problem. Ich baue ihn ein, wenn du nicht widersprichst.
