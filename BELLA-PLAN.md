# Bella-Push — der Plan

Stand 29.07.2026. Entscheidungsdokument, kein Ideenpapier.

---

## 1. Was die Zahlen wirklich sagen

Der Ausreißer vom 18.07. ist **nicht** durch Budget erklärbar, aber der Einzelvergleich, mit dem das gern bewiesen wird, taugt nichts: Bei 86 Aufrufen und einer wahren Rate von 4,4 % erwartet man 3,8 Likes — genau 1 zu sehen liegt mit p≈0,10 im normalen Rauschen. Der Beitrag vom 23.07. beweist gar nichts. Was beweisbar ist: **gepoolt** über alle fünf Nicht-Gewinner (4 Likes auf 447 Aufrufe, 0,9 %) gegen 132 auf 2.975 (4,4 %) ist der Unterschied hochsignifikant (p≈1,7·10⁻⁵) — das Signal existiert, nur nicht dort, wo man es zuerst greift. Zwei Dinge, die ehrlich dagegenstehen: Unter den vier **unbeworbenen** Beiträgen führt ausgerechnet ein Wecker-Reel („Bella wakes you up", 182 Aufrufe), und die Aufrufzahlen sind nicht altersbereinigt — der Gewinner hatte 11 Tage Laufzeit, „Your photo. Your look." hatte Stunden. Der wichtigste Befund steht gar nicht in der Tabelle: **Der Gewinner bewirbt ein Angebot, das es nicht mehr gibt.** „Go on holiday with Bella in Tenerife" ist die Überschrift von `/urlaub-mit-bella` — der abgeschalteten 49-$-pro-Tag-Reise, bei der *sie* für ihn reist. Das lebende Produkt mit exakt demselben Versprechen, nur besser, heißt seit 27.07. `/themes/holiday`: **er lädt sein eigenes Foto hoch und ist wirklich mit im Bild.** Der beste Reel der Kontogeschichte hat versehentlich das richtige Versprechen mit dem falschen Produkt beworben. Das ist die Handlungsanweisung, und sie kostet keinen einzigen neuen Reel.

---

## 2. Die eine Entscheidung

**Wir bauen EIN Bella-Thema — `/themes/bella` — auf dem das lebende Produkt direkt läuft, und wir kaufen mit 40 € ein sauberes Anzeigen-Duell, das die offene Frage in vier Tagen beantwortet. Sonst nichts.**

Bella wird nicht „bekannt gemacht", sie wird **zur Tür**. Sie ist schon das Gesicht des Portals (63 % aller Chats, Flaggschiff, überall verlinkt) — was fehlt, ist ein Ort, an dem aus „mit ihr schreiben" ein Kauf wird. Der Gewinner-Reel hat bewiesen, dass Leute auf „Urlaub mit Bella" klicken. Sie landen heute nirgends.

**Diese drei Wege gehen wir ausdrücklich NICHT:**

**Begraben: die organische Reel-Serie (5 Reels/Woche, A/B-Frage im Kommentar).** Gestorben an drei Einwänden, die ich nicht entkräften kann. (a) Das Material existiert nicht: `public/Peter/` sind fünf Clips à 5,04–8,04 s, zusammen 31 Sekunden. Man schneidet aus 5 Sekunden keine 7–12 Sekunden, und zwei Varianten desselben Clips sind derselbe Clip. Aus „15–20 Reels Vorrat" werden real 5–8. (b) „Antworte A oder B im Kommentar", fünfmal die Woche, ist nach Metas eigener Definition Engagement-Bait und wird in der Auslieferung herabgestuft — auf einem Konto mit Sperrhistorie. (c) Die Rechnung: 20–28 Owner-Stunden im Monat gegen rechnerisch 9–44 € Umsatz bei bisherigem organischem Schnitt. Und `DESIGN-THINKING-ERGEBNIS.md` hat diesen Kanal schon einmal begründet verworfen („braucht eine Persönlichkeitsmaschine und ein Jahr"); ein einzelner Reel widerlegt kein Jahresargument.

**Begraben: `/urlaub-mit-bella` wiederbeleben und den Bio-Link dorthin legen.** Die 9 lp-journey-Slides, die als „wertvollstes Material im Haus" gelten, sind das Urlaubstagebuch eines Mannes mit seiner Freundin — „just the two of us", „still in that black lace look", „Book the journey. She lives it. You experience it." Das ist exakt die romantische Companion-Anmutung mit bezahltem Frauen-Erlebnis, wegen der Meta schon einmal wegen Menschenausbeutung gesperrt hat, und die `KONZEPT-UND-AD-TEST.md` ausdrücklich verbietet. Dazu: die Seite verkauft ein totes 49-$-pro-Tag-Angebot, und am 28.07. wurden `/join` und `/go` gelöscht, weil Zwischenseiten nicht verkaufen. Wir bauen keine neue.

**Begraben: das Wecker-/Companion-Motiv in Anzeigen.** Die 13 gespeicherten Werbetexte in `ad-scripts.json` und 9 der 10 Szenen im SEED von `app/api/bella-scenes/route.ts` fahren alle „Bella weckt dich". Nichts davon löschen — aber nichts davon wird bezahlt ausgespielt, bis das Duell in Abschnitt 4 das Gegenteil zeigt. Grund ist nicht die Like-Rate, sondern die Genehmigungsfähigkeit: Reise ist eine unauffällige Anzeigenkategorie, „eine Frau, die dir morgens etwas bringt" ist die auffälligste, die es bei Meta gibt.

**Und nicht als Kanal, sondern als Zündung: die 55 Wetter-Abonnenten.** Eine Mail zum Start, nicht wöchentlich. 27 doppelt bestätigt — das ist kein Verteiler, das ist ein Anschieber, und wer daraus einen Kanal macht, verbrennt ihn.

---

## 3. Das Bella-Thema — `/themes/bella`

Eine neue Datei nach dem bestehenden Themen-Schema. Der Trichter läuft **auf der Seite**, deshalb ist es keine Zwischenseite: Foto hoch → Moment antippen → Teaser → Kasse. Alles darunter ist Beweisführung.

**Datei:** `/Users/anwender/dev/luxurybandit/app/themes/bella/page.tsx`
Server Component, `export const dynamic = "force-dynamic"` (signierte Supabase-URLs verfallen nach 24 h), statisches `metadata`-Objekt mit `alternates.canonical = "/themes/bella"`, Signatur mit `searchParams?: Promise<…>`, `const sp = (await searchParams) ?? {}`, `const code = String(sp.code ?? sp.promo ?? "").trim().slice(0,40)`, `const L = await resolveLang()`.

**Aufbau von oben nach unten:**

1. **`<TopNav />`** — Standard-Chrome, kein eigenes Layout.
2. **Kicker „LuxuryBandit · Bella" + `<H1>`: „Tenerife with <Y>Bella</Y> — and you in it".** Der Titel ist bewusst die Gewinner-Formulierung, aber mit dem lebenden Versprechen: *du* bist im Bild, nicht sie schickt dir was.
3. **`<Lead>`:** „Not her holiday. Yours. Upload your photo, pick the moment — a walk on the beach, coffee, dancing. She's in the video with you." Kein „sie reist für dich", kein „sie weckt dich", kein Wort, das nach Freundin-Abo klingt.
4. **Beispiel-Slider** — dieselbe Mechanik wie `/themes/holiday`: `getSignedUrl("try-this-look/videos/holiday-example.mp4")` bis `-4`, `.filter(Boolean)`. Nur angezogene Clips. Keine Lingerie oberhalb der Kasse — Bellas 8 Try-on-Videos sind alle derselbe Lingerie-Look und kommen auf dieser Seite gar nicht vor.
5. **`<PaidReturn lang={L} />`** — Rückkehrer aus Stripe.
6. **`<HolidayFunnel code={code} presetModelId={BELLA_ID} />`** — der Trichter, direkt hier. Ein neues optionales Prop in `components/HolidayFunnel.tsx`: ist es gesetzt, startet der Coverflow auf Bella und die Überschrift lautet „your moment with Bella" statt „pick her". Bella steht dort in Zeile ~66 ohnehin schon vorn; das Prop macht daraus eine Festlegung, ohne den Model-Wechsel zu verbieten. **Das ist die einzige Code-Änderung an bestehender Logik.**
7. **Ihre Karte** — `buildBellaCard({ surface: "themes", scope: "bella" })`, unverändert übernommen. Foto, Motto, Clips, Werte. Sie steht *unter* dem Trichter: erst machen lassen, dann zeigen, wer sie ist.
8. **Gratis-Chat** — `ModelChatInline` mit `freeLimit={50}` wie auf ihrem Profil. Das ist die eine Sache, die im System nachweislich funktioniert (52 von 82 Gesprächen). Direkt darunter der Cross-Link auf `/curator/curator-1783683672619-td4cy`.
9. **`<SubscribeCta code={code} lang={L} topic="holiday" />`** — **keine neue Checkout-Route.** Sie zeigt auf `/api/holiday-abo-checkout`, `topicPriceId()`, Gutschein aus `couponFor(code) ?? standardCoupon()` → 24,50 €/Monat, 25 Generierungen über alle Themen. Einzelvideo 3,99 € läuft weiter über den Trichter. Nichts Neues in Stripe anlegen.
10. **KI-Hinweis, öffentlich sichtbar** — eine `<Fine>`-Zeile: „Bella is an AI persona. Every video and photo is AI-generated." Den Apparat gibt es bisher nur im Chat, in der Mail und auf `/themes/wetter/[model]` — auf einer Seite, die bezahlten Anzeigenverkehr empfängt, ist er Pflicht, nicht Kür. Meta verlangt die Kennzeichnung, die EU-KI-Verordnung auch, und das Konto hat eine Sperrhistorie. Der Hinweis kostet vermutlich ein paar Prozentpunkte Bindung. Eine zweite Sperre kostet mehr.
11. **`<TrackView event="bella-hub" />`** — zählt in die vorhandene Insights-Funnel-Ansicht; die eigene Sitzung wird über das Admin-PIN-Flag automatisch als `internal` ausgeschlossen.

**Anschlüsse (drei Einzeiler):**
- `app/bella/page.tsx` — Redirect von `/themes/wetter/bella` auf `/themes/bella` umhängen. Der Bio-Link zeigt heute auf das Thema, das auf Instagram verloren hat.
- `app/stores/page.tsx:2874` — Haupt-CTA „Wake up with Bella" → „Tenerife with Bella", Ziel `/themes/bella`.
- `app/themes/page.tsx` — Bella-Karte in die Themenliste, Text „Vacanță cu Bella / Urlaub mit Bella" in allen 7 Sprachen von „sie reist für dich" auf „du und sie, 25 Momente" ändern.

**Attribution — ohne die ist die ganze Übung wertlos.** `KONZEPT-UND-AD-TEST.md` legt fest: die eine Zahl ist Kosten pro Eintragung, nicht Likes. Also: jede Anzeige führt auf `/themes/bella?utm_source=ig-a` bzw. `ig-b` (`TrackView` liest `utm_source`/`source`/`ref` bereits aus), und jede Anzeige nennt einen eigenen Aktionscode. In `lib/promo.ts` zwei neue Einträge im `BUILTIN`-Block, **beide auf dieselbe Coupon-ID wie `FOREVER50` (`sRHDMAQE`)** — gleicher Preis für alle, aber an der Kasse sichtbar, welches Creative bezahlt hat:
```
BELLAA: "sRHDMAQE",   // Anzeige A — Reise/Bewegung
BELLAB: "sRHDMAQE",   // Anzeige B — Gruß/Wecker
```

---

## 4. Die ersten 14 Tage

**Block 1 — Mi 29.07. bis Fr 31.07.: messen und bauen, kein Geld ausgeben**

*Owner, 20 Minuten, heute:* Im Werbeanzeigenmanager für **beide** beworbenen Beiträge holen: Ausgaben, Laufzeit, **Optimierungsziel**, CPM, Link-Klicks — und die Aufschlüsselung nach **Land**. Die entscheidende Frage lautet nicht „welches Motiv", sondern: *Aus welchen Ländern kamen die 132 Likes?* Wenn sie überwiegend aus Ländern kommen, in denen 24,50 €/Monat unrealistisch sind, ist der Gewinner als Kaufkanal wertlos und das Duell unten wird anders aufgesetzt. Dazu aus Insights: durchschnittliche Wiedergabezeit und Profilbesuche je Reel. Diese fünf Zahlen sind kostenlos und entscheiden mehr als alles, was ich schreiben kann. **Nichts weiter unternehmen, bevor sie da sind.**

*Claude, Do/Fr:* `/themes/bella` bauen, `presetModelId` in `HolidayFunnel`, die drei Anschlüsse, die zwei Promo-Codes, der KI-Hinweis. Dazu die Persona in `app/api/bella-caption/route.ts` von „Riviera (Monaco, Saint-Tropez, Lake Como)" auf Teneriffa umschreiben — das Werkzeug produziert sonst Monaco-Texte zu Teneriffa-Bildern.

*Owner, Fr:* Zwei Anzeigen-Clips schneiden, 9:16, je 7–12 s, aus vorhandenem Material. **Formatregeln, alle fünf müssen erfüllt sein:** Sekunde 0–2 zeigt einen Ort und eine Bewegung, nie einen Gruß und nie einen sprechenden Kopf; der Ort wird genannt (die 8 Teneriffa-Orte stehen in `lib/bella-card.ts`); Bild wie letztes Bild, damit es loopt; angezogen; kein Wort, das nach „deine Freundin" klingt. **A = Reise/Bewegung** (Ort, Gehen, Weite). **B = Gruß/Stillstand** — ja, absichtlich das Verlierer-Motiv, sauber gebaut. Ohne B misst A nichts.

**Block 2 — Sa 01.08. bis Di 04.08.: das 40-€-Duell**

Zwei Anzeigen, **gleiches Budget (je 20 €), gleiche Zielgruppe, gleiches Optimierungsziel, gleiche Laufzeit (4 Tage), gleiches Placement.** Ziel: Link-Klicks, nicht Kauf — für Kauf-Optimierung reicht das Budget rechnerisch nie, Meta braucht dafür Ereignisse, die wir nicht haben. Ziel-URL A: `luxurybandit.com/themes/bella?utm_source=ig-a&code=BELLAA`, B analog. Kein Dessous, kein Bikini, kein Companion-Wording — beides muss durch die Prüfung kommen, sonst misst man Ablehnungen statt Motive.

*Owner, So 02.08.:* Eine Mail an die 55 Abonnenten über `/api/wetter-email-blast` — „Bella ist auf Teneriffa, und du bist diesmal mit im Bild", Link auf `/themes/bella?utm_source=mail`. Einmal. Nicht wiederholen. Kostet über Hostinger-SMTP nichts. SMS erst, wenn der Twilio-Stückpreis am Konto abgelesen ist.

**Block 3 — Mi 05.08. bis Di 11.08.: Sieger fahren, Rest reparieren**

*Mi 05.08., Owner:* Verlierer aus, Sieger mit weiteren 30 € vier bis sieben Tage laufen lassen. Wenn der Unterschied unter Faktor 2 bei den Kosten je Klick liegt, ist das Motiv **nicht** die Erklärung — dann läuft das Budget auf A weiter, aber die Kernthese dieses Plans ist widerlegt und wir hören auf, über Creatives zu reden.

*Claude, laufend:* Was die Zahlen aus Block 2 zeigen, in die Seite einbauen — nicht neue Seiten, nur die eine reparieren. Wenn Trichterstarts kommen, aber niemand zahlt: Preis und Kassenweg sind das Problem, nicht Bella.

*Owner, täglich 10 Minuten:* Messblatt führen — Datum, Creative, Ausgaben, Impressionen, Klicks, Kosten/Klick, Trichterstarts auf `/themes/bella`, Käufe. Sieben Spalten, mehr nicht.

**Automatisch:** nichts. Kein Cron, keine Instagram-API-Anbindung, kein automatischer Versand in diesen 14 Tagen. `/api/instagram-publish` steht fertig da und braucht nur `IG_USER_ID` und `IG_ACCESS_TOKEN` — das bauen wir an, **wenn** ein Creative gewinnt, nicht vorher. Man automatisiert keine Null.

---

## 5. Was es kostet

**Einmalig**
| Posten | Euro | Rechenweg |
|---|---|---|
| Anzeigen-Duell A/B | 40,00 € | 2 × 20 € über 4 Tage |
| Sieger-Verlängerung | 30,00 € | einmalig, nur bei bestandenem Meilenstein 1 |
| Seite bauen | 0 € | Claude-Zeit, ~4–6 h |
| Clips schneiden | 0 € | CapCut, ~2 h Owner-Zeit, vorhandenes Material |
| Mail an 55 Abonnenten | 0 € | Hostinger-SMTP, im Hosting enthalten |
| **Summe** | **70,00 €** | |

**Laufend pro Monat**
| Posten | Euro | Rechenweg |
|---|---|---|
| Captions (`/api/bella-caption`, gpt-5-mini) | < 0,50 € | ~25 kurze Aufrufe, Bruchteile eines Cents je Stück — exakter Betrag am OpenAI-Konto ablesen |
| Neue Clips, nur bei Bedarf | 0–2,00 € | fal Kling v1.6 standard, Listenpreis ~0,045 $/s → 5 s ≈ 0,22 $ ≈ 0,20 €; **Deckel 10 Clips**. Pixverse läuft über Credits, Stückpreis am Konto ablesen |
| FASHN / `bella-lingerie` | 0 € | wird für dieses Format nicht gebraucht |
| Vercel Cron | 0 € | Hobby-Plan, 1 Job/Tag, erst später |
| SMS (Twilio) | 0 € | nicht eingeplant, Stückpreis unbekannt |
| **Summe** | **< 2,50 €** | |

Die eigentliche Währung: **Owner-Zeit, ca. 6 Stunden in 14 Tagen** — 20 Min Insights, 2 h Schnitt, 1 h Anzeigen einrichten, 1 h Mail, Rest Messblatt. Das ist ein Zehntel der organischen Variante.

---

## 6. Woran wir merken, dass es nicht funktioniert

Drei Tore mit Datum und Zahl. Wird eines gerissen, wird nicht nachjustiert, sondern gestoppt.

**Tor 1 — Di 04.08.2026, nach 40 € Duell.**
Bedingung: Das bessere Creative liefert **≥ 30 Klicks auf `/themes/bella`** bei **≤ 1,30 € pro Klick**.
Gerissen (Kosten je Klick > 2,00 €): Bezahlte Reichweite ist bei diesem Budget zu teuer. **Die 30 € Verlängerung werden nicht ausgegeben.** Verbleibender Hebel: die 55 Abonnenten und der Gratis-Chat.

**Tor 2 — Di 11.08.2026, nach maximal 70 €.**
Bedingung: **≥ 25 Trichterstarts** (Foto hochgeladen) auf `/themes/bella` **und ≥ 1 Zahlung** (Abo 24,50 € oder Einzelvideo 3,99 €).
Gerissen bei 25+ Starts und 0 Zahlungen: Das Problem ist nicht Bella und nicht das Creative, sondern Angebot oder Kasse. Kein weiteres Anzeigengeld, bis der Trichter repariert ist.

**Harter Abbruch — Mi 12.08.2026.**
Wenn 70 € ausgegeben sind, **weniger als 10 Trichterstarts** angekommen sind und **0 € Umsatz** entstanden ist: Bella als bezahlter Akquisekanal ist beerdigt. Kein „noch ein Creative", kein „noch zwei Wochen". Dann ist die Antwort auf die Frage des Owners: Bella verkauft nicht, weil kein bezahlter Kanal in dieser Größenordnung Menschen zum Zahlen bringt — und die nächste Runde muss beim Angebot ansetzen, nicht bei ihr.

Was **nicht** als Erfolg zählt: Likes, Aufrufe, Kommentare, Follower. Wir haben schon einmal 2.975 Aufrufe und 132 Likes gehabt. Es kam 0 € an.

---

## 7. Was ich als Nächstes baue

**1. Die Seite `/themes/bella`.**
Neu: `/Users/anwender/dev/luxurybandit/app/themes/bella/page.tsx` (Aufbau siehe Abschnitt 3).
Ändern: `/Users/anwender/dev/luxurybandit/components/HolidayFunnel.tsx` — optionales Prop `presetModelId`, das den Coverflow auf `curator-1783683672619-td4cy` festlegt (Zeile ~66 sortiert Bella bereits nach vorn).
Wiederverwenden ohne Änderung: `lib/bella-card.ts` (`buildBellaCard`), `components/Landing.tsx`, `components/TopNav.tsx`, `components/PaidReturn.tsx`, `components/SubscribeCta.tsx` mit `topic="holiday"`, `components/ModelChatInline.tsx` mit `freeLimit={50}`, `lib/holiday-scenes.ts`.
Checkout: **keine neue Route** — `/Users/anwender/dev/luxurybandit/app/api/holiday-abo-checkout/route.ts`.

**2. Die Zuordnung, damit die 70 € auswertbar sind.**
`/Users/anwender/dev/luxurybandit/lib/promo.ts` — `BELLAA` und `BELLAB` in den `BUILTIN`-Block, beide auf `sRHDMAQE` (gleicher 50-%-Dauerrabatt, unterschiedliche Herkunft).
`/Users/anwender/dev/luxurybandit/app/themes/bella/page.tsx` — `<TrackView event="bella-hub" />`, `utm_source` wird von `components/TrackView.tsx` bereits gelesen.
`/Users/anwender/dev/luxurybandit/app/api/holiday-abo-checkout/route.ts` — `metadata` um `source` aus dem Body erweitern, damit im Stripe-Datensatz steht, welche Anzeige gezahlt hat.

**3. Die drei Anschlüsse und der Persona-Fix.**
`/Users/anwender/dev/luxurybandit/app/bella/page.tsx` — Redirect auf `/themes/bella`.
`/Users/anwender/dev/luxurybandit/app/stores/page.tsx:2874` — Haupt-CTA umhängen.
`/Users/anwender/dev/luxurybandit/app/themes/page.tsx:128-215` — Bella-Karte in die Liste, Beschreibungstext in 7 Sprachen von „sie reist für dich" auf „du und sie" ändern.
`/Users/anwender/dev/luxurybandit/app/api/bella-caption/route.ts` (PERSONA, ~Z. 28) — Riviera → Teneriffa.

Nicht gebaut wird in diesen 14 Tagen: Instagram-Autoveröffentlichung, Cron, SMS, neue Stripe-Preise, `/urlaub-mit-bella`, die 10 Szenen in `bella-scenes.json`. Alles davon ist billiger, nachdem das Duell entschieden ist.