# Konzept: Job-Match, Jobchancen & Kandidaten-Pool

Stand 26.08.2026, abends — **nur Konzept, NICHTS gebaut** (Owner: „nicht bauen sondern
konzept machen und vielleicht ist es besser von Sonnet bauen zu lassen" · „noch nicht
bauen"). Dieses Dokument ist der Bauauftrag: so geschrieben, dass ein Umsetzer (Sonnet)
es Stufe für Stufe abarbeiten kann, ohne die Entstehungsgeschichte zu kennen.

**FÜNF Owner-Inputs an einem Tag (je über ChatGPT formuliert), der neueste sticht:**
1. *Job-Match & Career-Switch:* Anzeige rein → Struktur-Analyse (4 Einstufungen, 3
   Empfehlungen) → Strategie → zugeschnittener CV + Anschreiben → PDF. Topic-Landingpages.
2. *CV zuerst:* Lebenslauf rein → 5–10 konkrete, von Hand gepflegte Jobs mit ehrlichem
   Match je Karte → einen wählen → ab da Ablauf aus Input 1.
3. *DER PIVOT — Kandidaten-Pool statt Direkt-Bewerbung:* Der Trichter schickt niemanden
   mehr zur Original-Anzeige. Er identifiziert Interessierte, bereitet ihr Profil vor und
   holt die AUSDRÜCKLICHE Einwilligung, dass LuxuryBandit sie passenden Arbeitgebern/
   Recruiting-Partnern vorstellen darf. Das Geschäfts-Asset ist der einwilligungsbasierte
   Pool deutschsprachiger Kandidaten.
4. *DER ÄNDERUNGSAUFTRAG (26.08. spät, auf Deutsch):* überschreibt gezielt acht Punkte —
   **Tür 2 komplett kostenlos (kein PDF-/Teilen-Schloss, kein Probe/Abo-Tor dort)** ·
   **kein E-Mail-Tor vor dem CV-Upload** (Identität erst NACH der Analyse) · Marktchancen
   mit Transparenz-Hinweis · Erfolgs-Schirm präzisiert · **Tür 1 vorerst funktional
   einfrieren** · die früheren offenen Owner-Entscheidungen GELTEN ALS ENTSCHIEDEN
   (Abschnitt unten). Die eingearbeitete Fassung ist DIESES Dokument.
5. *ZUSATZÄNDERUNG — Quellen-Compliance bei Marktchancen:* ergänzt AUSSCHLIESSLICH
   Baustelle D. Öffentliche Anzeigen sind nur ein MARKT-SIGNAL; die Kandidaten-Sicht
   einer Marktchance ist eine EIGENSTÄNDIG neu formulierte Zusammenfassung, nie eine
   Kopie der Anzeige. Neues internes Feld `quellenStatus`; ungeprüfte Quellen
   erscheinen NIE öffentlich. Kein Funnel-Umbau, kein Scraping.

**Die MVP-Hypothese (Änderungsauftrag, wörtlich):** Sind deutschsprachige Menschen
bereit, ihren bestehenden CV hochzuladen, sich passende Quereinstiegs-Chancen zeigen zu
lassen und LuxuryBandit ausdrücklich zu erlauben, sie geeigneten Arbeitgebern
vorzustellen? Wenn diese Hypothese nicht funktioniert, wird NICHT weiter ausgebaut.
Deshalb: klein bauen, messen, testen. Die wichtigste Conversion ist
`candidate_consent_given`, danach `candidate_pool_added` — PDF-Downloads sind nur noch
sekundäre Produktmetriken.

Baut auf `KONZEPT-BEWERBUNGSZENTRALE.md` auf. Der Pool ist GENAU das Inventar, das dort
unter „Später: das Firmen-Produkt" und „Der strategische Rahmen" schon vorgedacht ist
(„Die Gratis-Seite baut den Pool, der Pool macht die Firmen-Seite wertvoll") — Input 3
liefert dafür die fehlende Einwilligungs- und Datenbrücke.

---

## Das Produkt in einem Satz (Positionierung, Input 3 wörtlich übersetzt)

> Du sprichst Deutsch. Wir finden internationale Jobchancen, die zu deiner Erfahrung
> passen könnten — auch als Quereinsteiger —, bereiten dein Profil vor und stellen dich
> mit deiner Erlaubnis passenden Arbeitgebern vor.

- Sofort-Nutzen für den Kandidaten: **„Ich entdecke Chancen, von denen ich nicht
  wusste, dass ich infrage komme."**
- Asset dahinter: **ein qualifizierter, einwilligungsbasierter Pool deutschsprachiger
  Kandidaten.** Die wichtigste Messgröße ist NICHT mehr der PDF-Download, sondern:
  Entsteht ein Pool von Kandidaten, die aktiv vorgestellt werden WOLLEN?
- Das Produkt ist NICHT „Wir recruiten dich für Firma X" — und tut nie so.

## Die Ehrlichkeits-Grundsätze (unverhandelbar, aus allen drei Inputs)

1. **Credibility over conversion.** Das System darf und muss abraten; keine
   aufgeblasenen Prozentzahlen, nicht jedem „guter Match" sagen.
2. **Keine vorgetäuschte Arbeitgeber-Beziehung.** Öffentliche Anzeigen dürfen intern als
   Marktbeobachtung dienen — aber ohne Partner-Vereinbarung wird NIE der Eindruck
   erweckt, LuxuryBandit vertrete die Firma (Zwei-Ebenen-Datenmodell, Baustelle D).
3. **Nie „Deine Bewerbung wurde verschickt."** Immer „Dein Profil ist vorbereitet." —
   es wird nichts automatisch eingereicht. Ebenso NIE behaupten (Änderung 5): dass
   bereits ein Arbeitgeber Interesse hat, dass der Kandidat sicher vorgestellt wird oder
   dass die gezeigte Marktchance noch verfügbar ist.
4. **Nichts erfinden.** Arbeitgeber, Abschlüsse, Zertifikate, Tools, Jahre, Sprachen,
   Verantwortungen, Erfolge sind unantastbar (steht als Regel bereits im
   Zuschnitt-Prompt).
5. **Keine Datenweitergabe ohne Einwilligung.** Häkchen nie vorausgewählt; ohne
   Einwilligung bleibt alles „Nur für dich gespeichert".

## Was NICHT gebaut wird (Verbotsliste, alle drei Inputs vereinigt)

Kein Arbeitgeber-Dashboard, kein Recruiter-Login, keine Arbeitgeber-Abos/-Kasse, kein
automatisches Weiterleiten von Kandidaten, kein automatisches Bewerbungs-Absenden, kein
Job-Scraping / keine Job-API-Integrationen, kein grosser Job-Marktplatz, keine
ATS-Integration, kein Recruiter-CRM, keine Kandidaten-Suche für Firmen. Der
Chancen-Pool wird VON HAND gepflegt (Admin). Erst die Kandidaten-Akquise validieren.

---

## Der eine Trichter, zwei Türen (Überblick)

**EIN Trichter** (`/themes/lebenslauf/start`, TunnelSeite-Gerüst — Memory
`ein-tunnel-geruest-fuer-alle`; KEINE Kopie der Funnel-Logik), zwei Einstiege:

**Tür 1 — „Ich habe eine Anzeige"** (existiert; Input 1): **BLEIBT IM MVP FUNKTIONAL
UNVERÄNDERT (Änderung 6)** — heutiger Ablauf und heutiger Ausgang (Skript → Aufnahme →
Seite) inklusive ihrer bestehenden Bezahl-Logik. Sie zeigt lediglich den GEMEINSAMEN
Ergebnis-Schirm mit, sobald der die neuen Analyse-Abschnitte rendert (gemeinsame
Komponente — beim Bauen auf Regressionen in Tür 1 prüfen, aber KEINE eigenen Umbauten
dort). Der Mappe-Ausgang für Tür 1 (CTA → Version + Anschreiben statt Video-Weg) ist
auf SPÄTER verschoben und in Baustelle C entsprechend markiert.

**Tür 2 — „Zeig mir passende Jobs"** (NEU; Inputs 2+3; die Tür der Topic-Seiten):

```
Topic-Landingpage („Passende Jobs finden" — KEINE Anzeige nötig)
  → CV-Upload SOFORT („Er muss nicht perfekt sein …") — KEIN E-Mail-Tor davor
  → Profil-Analyse (bestehende Auswertung, vorab)
  → E-Mail sichern („Wohin dürfen wir deine Ergebnisse speichern?" — bestehender
     TunnelStart-Baustein, nur an NEUER Position; Details Baustelle E)
  → 5–10 Jobchancen mit ehrlichem Match je Karte (NEU, Baustelle E)
  → Kandidat wählt eine Chance
  → Detail-Analyse: 4 Einstufungen + Ampel (Baustelle A/B)
  → „Ich bin interessiert" (nur bei gut/bruecke aktiv beworben)
  → 4–5 Klick-Fragen: Umzug, Länder, Start, Arbeitsform, (Gehalt optional), Rollen
  → EINWILLIGUNG (Häkchen, nie vorausgewählt)
  → Mappe wird vorbereitet (bestehender Zuschnitt + Anschreiben, an den Chancen-TYP)
  → Erfolgs-Schirm „Dein Profil ist bereit." — CV-PDF + Anschreiben-PDF DIREKT
     KOSTENLOS (kein Schloss in Tür 2), Video als optionaler Bezahlweg
  → Kandidat steht im internen Pool (nur mit Einwilligung „vorstellbar")
```

Es gibt in Tür 2 **keinen „Beim Arbeitgeber bewerben"-Knopf, keinen Link zur
Original-Anzeige und keine externe Weiterleitung** — die Quelle bleibt intern (Input 3
ersetzt hier ausdrücklich Input 2).

---

## Die Wiederverwendung — was schon steht (NICHTS davon neu bauen)

| Baustein | Existiert — hier |
|---|---|
| Trichter-Gerüst, Schritte, Herkunft-Params | `components/TunnelSeite.tsx` |
| E-Mail-Tor, Name/Google | `TunnelStart` (components/CI.tsx), kiss-claim |
| CV-Upload (PDF, direkt zu Supabase) | `LebenslaufStartClient` `ladeHoch` + `/api/lebenslauf-video-url` (Memory `large-uploads-direct-to-supabase`) |
| Profil-Analyse aus dem CV | `/api/lebenslauf-auswertung` (liefert schon: kategorien inkl. Quereinstiege, kompetenzen, schwerpunkte, ALLE Stationen, ausbildung, sprachen MIT Niveau, ort) — reicht für die Chancen-Suche, KEINE Erweiterung nötig |
| Anzeige als Link/Text beschaffen | `lib/lebenslauf-anzeige.ts` (auch fürs Admin-Einpflegen von Chancen nutzbar) |
| Match-Analyse (Prozent, Betrachter-Sprache) | `/api/lebenslauf-match` — wird zur Struktur-Analyse erweitert (A) |
| Zuschnitt + Anschreiben in EINEM KI-Lauf, „nie erfinden" | `/api/lebenslauf-bewerbung` POST — bekommt Strategie + Chancen-Eingang (C) |
| PDFs (CV + Anschreiben) | Dossier `/lebenslauf/<id>` → `PdfKnopf` + `lib/druck.ts`; Schloss `SchlossHinweis`/`bezahlt` |
| Besitz/Identität | Kiss-Log-Kennung + `lib/lebenslauf-besitz.ts` (`darfAmProfilArbeiten`) |
| Sieben Sprachen aus deutscher Quelle | `TRICHTER_QUELLE` in `app/themes/lebenslauf/start/page.tsx` + `textbausteineInSprache` |
| Messung | `lib/track-funnel.ts` → Event-Ablage `/api/try-this-look` (`action:"event"`) → Insights |
| Admin-Muster (PIN, Listen) | z. B. `/admin/lebenslauf-spiele` |
| Speicher-Muster „eine Datei je Eintrag" | `lib/lebenslauf-store.ts` (Begründung dort: keine Merge-Fallen) |

---

## Die vier Einstufungen und die drei Empfehlungen (Kern, Input 1 — unverändert gültig)

Je wichtiger Anforderung der Stelle EINE von vier Einstufungen:

| Code | Bedeutung | Regel |
|---|---|---|
| `erfuellt` (MATCH) | klar belegt im Profil | nur bei echtem Beleg |
| `uebertragbar` (TRANSFERABLE) | nicht die exakte geforderte Erfahrung, aber belegbar übertragbare | Begründung MUSS nennen, WELCHE Profil-Erfahrung überträgt. Leitbeispiel: Anzeige „2 Jahre Customer Support" · CV „8 Jahre Einzelhandel, tägliche Reklamationsbearbeitung" → uebertragbar |
| `erklaerbar` (EXPLAINABLE_GAP) | fehlt, lässt sich aber seriös adressieren | wohnt im falschen Land (Umzugsbereitschaft), nie den exakten Titel getragen, andere Branche, kleineres Tool fehlt |
| `blocker` (CRITICAL_GAP) | fundamentale Anforderung fehlt | NUR harte Fälle: gesetzliche Lizenz/Anerkennung, fehlende Arbeitserlaubnis, Führerschein bei Fahrjob, C2 verlangt bei A1, gesetzliche Qualifikation. Wird NIE im Anschreiben „kreativ gelöst" |

Gesamtempfehlung, genau DREI Zustände: `gut` (GOOD_MATCH, „Gute Chance") ·
`bruecke` (BRIDGEABLE_MATCH, „Bewerben lohnt sich") · `schwach` (POOR_MATCH,
„Lohnt sich wahrscheinlich nicht"). Ableitung: ein `blocker` ⇒ `schwach`; kein Blocker
und die wichtigen Anforderungen überwiegend `erfuellt` ⇒ `gut`; sonst ⇒ `bruecke`.
Die Prozentzahl BLEIBT daneben (Owner 24.08.: „Einen Balken mit Prozente") — die Ampel
ordnet die Zahl ein.

---

## Baustelle A — `/api/lebenslauf-match` wird zur Struktur-Analyse

**Datei:** `app/api/lebenslauf-match/route.ts`. Weiter EIN KI-Aufruf (gpt-5-mini).

**Abwärtskompatibel — Pflicht:** `prozent`, `jobtitel`, `gruende`, `luecken` bleiben
unverändert (Aufrufer `ProfilAssistent` bleibt UNANGETASTET). Neu dazu:

```jsonc
{
  "empfehlung": "gut" | "bruecke" | "schwach",
  "anforderungen": [
    { "text": "…",              // die Anforderung, kurz
      "einstufung": "erfuellt" | "uebertragbar" | "erklaerbar" | "blocker",
      "begruendung": "…" }      // 1–2 Sätze, Betrachter-Sprache
  ]
}
```

Härtung: `anforderungen` max. 10, `text` ≤ 160, `begruendung` ≤ 280; unbekannte
`einstufung` → Eintrag verwerfen; fehlende/unbekannte `empfehlung` → aus den
Einstufungen ableiten (Regel oben), nie raten.

**Neuer Eingang `chanceId`** (für Tür 2): statt `eingabe` darf der Body `chanceId`
tragen — die Route lädt die Chance aus dem Pool (Baustelle D) und nimmt
`intern.originalText` als Anzeigentext. `eingabe` bleibt für Tür 1.

**Prompt-Ergänzungen** (anbauen, nicht neu schreiben): die vier Einstufungen mit Regeln
und den beiden Leitbeispielen; „Der Bewerber ist möglicherweise Quereinsteiger —
fehlende exakte Branchenerfahrung ist NICHT automatisch ein Blocker, prüfe erst auf
Übertragbarkeit (Kundenkontakt, Reklamation, Verkauf, Problemlösung, Organisation,
Verwaltung, Führung, Technik, Mehrsprachigkeit)"; „Sprachkenntnisse sind ein eigenes
Plus — benenne sie"; „`blocker` NUR für harte, nicht überbrückbare Anforderungen;
ermutige NICHT jeden"; **„Nenne im Ergebnis NIE den Firmennamen aus dem Anzeigentext —
sprich von ‚dieser Stelle'"** (bei Marktchancen darf die interne Quelle nicht in die
Kandidaten-Sicht durchsickern).

---

## Baustelle B — der Ergebnis-Bildschirm (Detail-Analyse im Trichter)

**Datei:** `LebenslaufStartClient.tsx`, Phase `"ergebnis"`. Heutiger Aufbau (Jobtitel ·
Prozent+Balken · Karten-Vorschau · passt/fehlt · CTA) wird ERWEITERT:

1. **„Deine Chance"** — Prozent + Balken + Ampel-Etikett aus `empfehlung` (die alten
   prozentbasierten stark/mittel/schwach-Texte bleiben als Rückfall).
2. **„Was bereits passt"** (`erfuellt`, Häkchen-Optik) ·
   **„Welche Erfahrung übertragbar ist"** (`uebertragbar`, JE mit Begründung — der
   Quereinsteiger-Verkaufsmoment) · **„Was erklärt werden sollte"** (`erklaerbar`, je
   mit Begründung) · **„Was eine echte Hürde sein könnte"** (NUR `blocker`, direkt;
   Abschnitt entfällt, wenn leer; bei `schwach` steht er ZUERST).
3. Karten-Vorschau (Elfenbein) wie heute darunter.

**CTA je Zustand und Tür:**

| Zustand | Tür 1 — SPÄTER (im MVP bleibt dort der HEUTIGE CTA/Ausgang, Änderung 6) | Tür 2 (Jobchance) — MVP |
|---|---|---|
| `gut` | Gold „Meine Bewerbung erstellen" | Zeile „Diese Jobchance könnte zu dir passen." + Gold **„Ich bin interessiert"** |
| `bruecke` | Gold „Trotzdem bewerben — Bewerbung erstellen" | dieselbe Zeile + Gold **„Ich bin interessiert"** |
| `schwach` | Umriss „Bewerbung trotzdem erstellen" | KEIN Gold: Umriss „Trotzdem Interesse melden" + stiller Link „Andere Chancen ansehen" |

(Kein „Zeig mir warum"-Knopf: das Warum steht bei `schwach` bereits als erster
Abschnitt auf dem Schirm.) Sekundär in Tür 2: „Andere Chancen ansehen" (zurück zur
Vorschlagsliste, ohne neue KI-Läufe). In Tür 1 ändert sich am Knopf-Bereich im MVP
NICHTS — nur die neuen Analyse-Abschnitte erscheinen dort mit, weil es dieselbe
Ergebnis-Komponente ist (Regression prüfen, Änderung 6).

Alle neuen Texte in `TRICHTER_QUELLE` (deutsche Quelle, `textbausteineInSprache`), UI
nur aus `components/CI.tsx` (Skill `ci-design` VOR dem Bauen laden), keine Overlays,
kein `window.confirm`, immer duzen.

---

## Baustelle C — Strategie treibt Zuschnitt UND Anschreiben

**Datei:** `app/api/lebenslauf-bewerbung/route.ts` (POST). WEITER EIN KI-Lauf (Memory
`cost-frugal-paid-apis`): Die Strategie wird das ERSTE Feld im Antwort-JSON, damit das
Modell sie ableitet, BEVOR es Profiltext und Anschreiben schreibt (Auftrag: „This
strategy must drive both the CV and cover letter").

1. **Eingänge zusätzlich:** `analyse: { empfehlung, anforderungen }` (Ergebnis aus A,
   unverändert durchgereicht — keine zweite Analyse) und alternativ zu `eingabe` eine
   `chanceId` (Text kommt dann aus `intern.originalText`; `anzeigeTitel`/`anzeigeFirma`
   werden bei Marktchancen NICHT aus dem Originaltext übernommen, sondern aus
   `rolle`/leer — nichts Internes in die Kandidaten-Sicht). Beide optional —
   Alt-Aufrufer laufen unverändert.
2. **Neues erstes JSON-Feld `strategie`** (validiert, gedeckelt, am Ergebnis
   gespeichert): `staerksteArgumente` (max 5) · `uebertragbar` (max 6) · `zuErklaeren`
   (max 5, inkl. Umzug/Branchenwechsel je als EIN Satz) · `betonen`/`wenigerBetonen`
   (je max 4) · `sprachvorteile` (max 3) · `nieVerstecken` (die Blocker, max 3).
3. **Anschreiben-Regeln (Input 1/3):** jede `erklaerbar`-Lücke OFFEN in 1–2 Sätzen
   adressieren. Muster-Ton (Sprache der Stelle): „Meine bisherigen Positionen hiessen
   nicht Customer Support — aber Kundenkommunikation, Problemlösung und schwierige
   Situationen waren ein grosser Teil meiner Arbeit. Genau diese Erfahrung möchte ich
   in eine Service-Rolle einbringen." Umzug ausdrücklich: „Ich lebe derzeit in Rumänien
   und bin bereit, für diese Stelle nach Griechenland umzuziehen." VERBOTEN: defensive/
   entschuldigende Sprache, Behauptung fehlender Qualifikationen, Wegschreiben von
   `nieVerstecken`-Punkten. **Bei einer Marktchance (`chanceId`, kein Partner):
   Anschreiben auf den Stellen-TYP** („tailored to the selected type of opportunity"),
   neutrale Anrede, KEIN Firmenname.
4. **Felder am Ergebnis:** `strategie`, `matchEmpfehlung`, bei Tür 2 `chanceId`
   (KEIN `anzeigeUrl` mehr in der Kandidaten-Sicht — Input 3 streicht den
   Original-Link; die Quelle lebt nur im Pool-Intern-Teil).
5. **`bezahlt: true` an der Version BLEIBT UNANGETASTET (Änderung 8.1/8.2):** Tür 1
   wird im MVP nicht angefasst, und in Tür 2 gibt es ohnehin kein Schloss — die
   Tür-2-Mappe SOLL frei sein (PDFs kostenlos). Die früher hier vorgeschlagene
   Vererbungs-Drehung ist damit hinfällig; NICHT umbauen.
6. **Foto ohne Video-Weg:** `fotoAblegen` aus `lebenslauf-fertigstellen` in ein kleines
   Lib-Modul ziehen; `/api/lebenslauf-auswertung` nimmt optional `foto` (Data-URL) an
   und schreibt `fotoUrl` ans Hauptprofil. `fertigstellen` nutzt denselben Helfer.

**Probe/Abo-Tor (Änderung 1):** Das Tor gilt weiter für die BESTEHENDEN Aufrufer
(`eingabe`-Läufe: ProfilAssistent/Tür 1 — unangetastet). **`chanceId`-Läufe (Tür 2)
passieren OHNE Tor und OHNE Probe-Zähler** — sie sind Akquisitionsaufwand, kein
Produktkauf, und dürfen den Probe-Anspruch eines späteren Tür-1-Kaufs nicht
verbrauchen. Missbrauchs-Deckel stattdessen: je Kandidat und Chance höchstens EINE
Mappe — ein zweiter Lauf auf dieselbe Chance ERSETZT die bestehende Version, statt
eine neue anzulegen.

**Tür-1-Verdrahtung des Mappe-CTA = SPÄTER (Änderung 6):** Im MVP ruft NUR Tür 2
(über `chanceId`) diese erweiterte Erzeugung aus dem Trichter; Tür 1 behält ihren
heutigen Ausgang. Die Prompt-/Strategie-Erweiterung selbst ist abwärtskompatibel und
schadet den Alt-Aufrufern nicht.

---

## Baustelle D — der Jobchancen-Pool (von Hand gepflegt, zwei Datenebenen)

**Warum zwei Ebenen (Input 3):** Öffentliche Anzeigen dürfen uns als Marktbeobachtung
dienen — aber ohne Partnerschaft darf nie der Eindruck entstehen, LuxuryBandit vertrete
die Firma. Statt „Randstad — German Customer Service Agent — Athens" sieht der Kandidat
„German Customer Service — Griechenland · Deutsch C1 | Englisch B2 | Umzug möglich |
Quereinsteiger willkommen".

**Datenstruktur** (`lib/job-chancen.ts`):

```ts
export type JobChance = {
  id: string;
  aktiv: boolean;
  /** employer_authorized: false = MARKTCHANCE (Regelfall im MVP — wir vertreten die
      Firma NICHT), true = PARTNER-JOB (von einem Arbeitgeber/Recruiter freigegeben;
      erst SPÄTER mit eigenem Wording/Branding — jetzt NICHT bauen, nur das Feld). */
  partnerFreigabe: boolean;
  // ── KANDIDATEN-SICHTBAR ──
  rolle: string;                     // "German Customer Service"
  land: string; stadt?: string;      // Stadt bei Marktchancen weglassen/vergröbern,
                                     // wenn sie die Firma verraten würde
  remote: "remote" | "hybrid" | "vorOrt";
  sprachen: string[];                // "Deutsch C1", "Englisch B2"
  gehalt?: string;                   // nur wenn öffentlich bekannt UND unbedenklich
  umzugNoetig?: boolean;
  anforderungen: string[];           // Hauptanforderungen, 3–6 Zeilen
  quereinstiegGeeignet: boolean;
  kurzbeschreibung: string;          // 2–3 Sätze, NEUTRAL formuliert
  kategorie: string;                 // "customer-support" | "backoffice" | …
  hinzugefuegtAm: string;
  // ── NUR INTERN — verlässt NIE den Server Richtung Kandidat ──
  intern: {
    firma?: string; originalTitel?: string;
    originalText?: string;           // Volltext der Quelle — Futter für Match/Mappe
    quelleUrl?: string; quellePlattform?: string; quelleDatum?: string;
    notizen?: string;
    /** QUELLEN-COMPLIANCE (Zusatzänderung): "manuell_geprueft" = Owner hat die Quelle
        angesehen und die neutrale Marktchance bewusst freigegeben · "partner" =
        Arbeitgeber/Recruiting-Partner hat die Verwendung freigegeben · "unklar" =
        noch nicht geprüft (Anlage-Zustand). Liegt IN `intern`, damit der eine
        Abstreif-Punkt es automatisch miterfasst. */
    quellenStatus: "manuell_geprueft" | "partner" | "unklar";
  };
};
```

**EISERNE REGEL:** Jede Route, die Chancen an den Client gibt, STREIFT `intern` ab
(eigene Helfer-Funktion `chanceFuerKandidat()`, damit es nur EINE Stelle gibt, die das
kann — nie von Hand je Route; sie bleibt auch nach der Zusatzänderung die EINZIGE
Stelle, die Kandidatendaten erzeugt). `intern.*` erscheint nie im Kandidaten-Frontend
und wird über keine öffentliche API ausgegeben; `intern.originalText` wird NUR
serverseitig an die KI gereicht (interne Prüfung + Matching); die Prompt-Regel „nie
den Firmennamen nennen" (Baustelle A/C) sichert die Ausgabe-Seite.

**MARKTCHANCE IST KEINE KOPIE DER STELLENANZEIGE (Zusatzänderung, bindend):** Bei
`partnerFreigabe: false` ist die Kandidaten-Sicht eine EIGENSTÄNDIG neu formulierte,
neutrale Zusammenfassung. Öffentliche Anzeigen dienen nur als Signal, welche Rollen,
Anforderungen, Sprachen und Standorte gerade gesucht werden.
- ERLAUBT sind strukturierte Fakten (genau die Felder oben): Rollenart, Land/Region,
  Remote/Hybrid/Vor Ort, benötigte Sprachen, notwendige Berufserfahrung, relevante
  Fähigkeiten/Voraussetzungen (`anforderungen`), Relocation, Arbeitsmodell, öffentlich
  genanntes Gehalt, Quereinstieg ja/nein — plus die selbst geschriebene
  `kurzbeschreibung`.
- NICHT öffentlich übernehmen: die vollständige Stellenbeschreibung, längere
  Textpassagen, Arbeitgeber-Marketing- und Benefits-Texte im Wortlaut, die
  Unternehmensbeschreibung, eine stark arbeitgeberspezifische Original-Headline,
  Firmenlogo, Firmenbilder, das Original-Layout.
Es braucht dafür KEIN neues kandidatensichtbares Feld — die bestehende Struktur deckt
alle erlaubten Fakten ab; die Regel bestimmt, WIE sie befüllt wird.

**UNGEPRÜFTE CHANCEN ERSCHEINEN NIE ÖFFENTLICH (Zusatzänderung):** Eine Chance darf nur
`aktiv: true` werden, wenn `partnerFreigabe === true` ODER
`intern.quellenStatus === "manuell_geprueft"` — die Admin-Route verweigert die
Aktivierung sonst. Mit `quellenStatus: "unklar"` darf sie gespeichert werden, erscheint
aber nicht im Funnel; der Admin zeigt an ihr deutlich **„Quelle noch nicht geprüft"**.
Doppelte Sicherung: Auch der Lese-Helfer für den Funnel (`veroeffentlichbareChancen()`,
benutzt von `/api/job-vorschlaege` und der Detail-Analyse) filtert auf genau diese
Bedingung — ein versehentlich gesetztes `aktiv` allein reicht nie.

**KEINE AUTOMATISCHE RECHTLICHE BEWERTUNG:** Die Software entscheidet NICHT, ob ein
Portal die Weiterverwendung erlaubt, ob eine Anzeige urheberrechtlich geschützt ist
oder ob Nutzungsbedingungen erfüllt sind — das ist eine Owner-/Business-Entscheidung.
Die Software garantiert nur: ungeprüfte Quelle → nicht öffentlich.

**Speicher:** EINE Datei `jobs/pool.json` im bestehenden Bucket (heisser Lesepfad =
1 GET je Trichter-Lauf). Schreiben NUR über die Admin-Route, die je Request frisch
liest → ändert → schreibt; NIE aus dem Client mergen (Haus-Falle Memory
`delete-resurrection-merge-bug` — hier vertretbar, weil es genau EINEN Schreiber gibt:
den Admin). Deckel ~100 Chancen.

**Admin-Seite `/admin/chancen`** (PIN-Muster wie `/admin/lebenslauf-spiele`): Liste
neueste zuerst (aktiv/inaktiv sichtbar, ungeprüfte mit dem Hinweis „Quelle noch nicht
geprüft") · Anlegen/Bearbeiten mit den Feldern oben · Löschen nach Hausregel (zwei
Tipps, rot), Deaktivieren statt Löschen als Regelfall · `hinzugefuegtAm` sichtbar —
veraltete Chancen sind Admin-Verantwortung (kein Automatik-Verfall im MVP).

**Der Admin-Workflow beim Einpflegen (Zusatzänderung, fünf Schritte — KEIN
automatisches Veröffentlichen direkt nach der KI-Auswertung):**
1. Link oder Text einfügen → `anzeigenTextBeschaffen` legt die Originalquelle NUR in
   `intern.*` ab; `quellenStatus` startet als `"unklar"`.
2. EIN Mini-KI-Aufruf (gpt-5-mini) erstellt den VORSCHLAG der neutralen
   Kandidaten-Sicht (rolle, anforderungen, kurzbeschreibung, kategorie, sprachen,
   quereinstiegGeeignet). Prompt-Regeln AUSDRÜCKLICH (Zusatzänderung, wörtlich):
   „Schreibe eine neue, neutrale Beschreibung der Jobchance. Übernimm keine längeren
   Formulierungen aus der Originalanzeige. Entferne Arbeitgebername,
   Markenbezeichnungen und Unternehmensmarketing. Extrahiere nur die für Kandidaten
   relevanten Fakten und Anforderungen. Formuliere alles eigenständig neu. Erfinde
   keine Informationen, die nicht aus der Quelle hervorgehen."
3. Der Admin PRÜFT die Zusammenfassung (und kann sie ändern).
4. Der Admin bestätigt ausdrücklich: **„Als neutrale Marktchance geprüft"** — erst
   diese Bestätigung setzt `quellenStatus = "manuell_geprueft"`.
5. Erst danach lässt sich die Chance AKTIVIEREN und erscheint für Kandidaten.

**Erste Befüllung — die MVP-Regel (Inputs 2+5):** ~10–15 Marktchancen; der Owner sucht
die Anzeigen MANUELL, fügt Link/Text über `/admin/chancen` ein, die KI neutralisiert,
der Owner prüft und gibt frei — erst danach erscheint die Chance für Kandidaten. KEIN
Scraping, KEINE automatische Massenerfassung, KEINE automatische Veröffentlichung.
Rollen: deutschsprachig, Quereinstieg realistisch — Customer Support/Service, Order
Management, Sales Support, Backoffice, Service Desk, Technical Support, Operations;
Start-Geografie Rumänien + Griechenland (NICHT im Code verdrahtet — nur die ersten
Pool-Einträge).

---

## Baustelle E — die Chancen-Vorschläge (CV rein → Chancen raus)

**Neue Route `/api/job-vorschlaege`** (POST `{ id, device }`, Besitz wie
`lebenslauf-match`): lädt Profil + alle VERÖFFENTLICHBAREN Chancen über
`veroeffentlichbareChancen()` (aktiv UND quellen-geprüft bzw. Partner — der
Doppelfilter aus Baustelle D, den auch die Detail-Analyse benutzt), EIN KI-Aufruf
(gpt-5-mini):
Profil-JSON (dieselben Felder wie der Match nutzt) + je Chance die KOMPAKTE
Kandidaten-Sicht (id, rolle, kategorie, sprachen, anforderungen, quereinstiegGeeignet
— NICHT der Volltext, der Prompt bliebe sonst riesig; der Volltext kommt erst in der
Detail-Analyse der EINEN gewählten Chance). Antwort:

```jsonc
{ "vorschlaege": [ { "chanceId": "…", "prozent": 84,
    "etikett": "realistisch" | "moeglich" | "unwahrscheinlich",
    "quereinstieg": true,          // Passung beruht auf Übertragbarkeit
    "erklaerung": "…" } ] }        // 1–2 Sätze, Betrachter-Sprache
```

Regeln im Prompt: ehrlich, Scores nicht aufblasen, auch schwache Passungen ehrlich
niedrig; max 10 zurück, beste zuerst. Client-Etiketten: `realistisch` + `quereinstieg`
→ **„Quereinstieg realistisch"**, sonst „Gute Chance"; `moeglich` → „Möglicherweise
passend"; `unwahrscheinlich` → „Eher nicht passend" (die drei Beispiel-Etiketten aus
Input 2: 84 % / 62 % / 35 %).

**Der Vorschlags-Schirm** (neue Phase `"vorschlaege"` im Trichter): je Chance eine
Karte — Rolle · Land/Stadt · Remote-Chip · Sprach-Anforderung · Kurzbeschreibung ·
Prozent + Etikett + Erklärung · Datum. **CTA je Karte:** Marktchance → **„Für solche
Jobs berücksichtigt werden"**, Partner-Job → **„Für diese Stelle interessiert"**
(Input 3: das Etikett hängt an `partnerFreigabe`). KEIN Firmenname, KEINE Quelle,
KEIN externer Link. Karten zeigen zuerst die Kurzform; Aufklappen zeigt die
Anforderungs-Zeilen (`opportunity_viewed` feuert beim Aufklappen). Auswahl →
Detail-Analyse (A/B) mit `chanceId`.

**Trichter-Verdrahtung Tür 2 — KEIN E-MAIL-TOR VOR DEM UPLOAD (Änderung 2):**
Einstieg über `?jobs=1` (Topic-CTA); der Parameter kommt in die `HERKUNFT`-Liste von
`TunnelSeite` (sonst frisst ihn der Adress-Sync — exakt der `video`-Fall). Ablauf bei
`jobs=1`: Anzeige-Unterschritt UND E-Mail-Tor werden übersprungen, es geht DIREKT zur
CV-Kachel (+ Foto optional wie bisher) → Auswertung (`vorab`, mit `foto`) → dann der
**Speicher-Schirm**: „Wohin dürfen wir deine Ergebnisse speichern?" — der bestehende
`TunnelStart`-Baustein (E-Mail + Google), nur an dieser NEUEN Position →
`/api/job-vorschlaege` → Phase `vorschlaege` → Auswahl → Match → Phase `ergebnis` →
weiter Baustelle F. Kein CV-Zweitupload (Profil liegt am Server).

- **Warum:** Beim Meta-Test muss die Treppe „Landingpage → CV-Upload" sauber messbar
  sein — ein vorgeschaltetes E-Mail-Tor verfälscht sie. Der Nutzer soll seinen ersten
  Nutzen (die Analyse) so schnell wie möglich sehen.
- **Technische Kennung OHNE E-Mail existiert schon:** Der Kiss-Log-Auftrag entsteht im
  Trichter bereits beim Laden mit leerer E-Mail, rein über die `lb_visitor`-
  Geräte-Kennung; `darfAmProfilArbeiten` prüft Besitz über dieselbe Kennung. GENAU
  diese bestehende Logik wiederverwenden — keine sichtbare Registrierung vor dem
  Upload, keine neue Session-Technik erfinden.
- **HAUSREGEL-OVERRIDE (ausdrücklich, Owner 26.08.):** Die Regel „E-Mail-PFLICHT vor
  jedem Upload" (Eingangstore) gilt in Tür 2 NICHT mehr — die E-Mail kommt NACH der
  Analyse am Speicher-Schirm und ist spätestens für Interesse/Einwilligung Pflicht
  (ohne Adresse ist niemand vorstellbar). Tür 1 und alle anderen Produkte behalten
  ihr Tor unverändert.

**Der Marktchancen-Hinweis (Änderung 3):** EINMAL unter der Vorschlagsliste (nicht je
Karte, keine Warnoptik — eine stille Zeile im Fusszeilen-Stil): „Diese Jobchancen
basieren auf aktuell öffentlich ausgeschriebenen Stellen. LuxuryBandit vertritt den
jeweiligen Arbeitgeber nicht." Er erscheint, sobald mindestens eine Marktchance
(`partnerFreigabe: false`) in der Liste ist.

---

## Baustelle F — Interesse, Klick-Fragen, Einwilligung, Pool (der neue Kern)

Die E-Mail liegt hier bereits vor (Speicher-Schirm nach der Analyse, Baustelle E) —
das Kandidaten-Profil hat damit immer eine Adresse. Nach „Ich bin interessiert"
(Phase `ergebnis`, Tür 2) folgen KLICK-Fragen — **eine
Frage je Schirm, nie ein Formular** (Hausregeln: Memory
`chat-no-personal-questions-buttons-only` + KONZEPT-BEWERBUNGSZENTRALE „jede Frage
einzeln"). Alle Antworten als Chips (`Knopf`/Chip-Muster der CI-Bibliothek),
Mehrfachwahl wo sinnvoll:

1. **Umzug:** „Würdest du für einen passenden Job in ein anderes Land umziehen?" —
   Ja / Vielleicht / Nein. Bei Ja/Vielleicht: „Welche Länder kommen für dich infrage?"
   — Chips (Mehrfachwahl) aus einer kurzen Liste in `lib` (z. B. Deutschland,
   Österreich, Schweiz, Griechenland, Niederlande, Irland, „Egal") — Liste NICHT im
   Code der Seite, sondern als Konstante neben `JobChance`.
2. **Start:** „Wann könntest du anfangen?" — sofort / innerhalb von 2 Wochen /
   innerhalb eines Monats / später (als Kennungen speichern, nie als Wort — Muster
   `verfuegbarkeit`).
3. **Arbeitsform:** Remote / Hybrid / Vor Ort / Egal (Mehrfachwahl).
4. **Gehalt (OPTIONAL, überspringbar — Input 3: keine Pflicht, wenn es Reibung
   erzeugt):** „Welche Gehaltsvorstellung hast du?" — ein Feld + stiller
   „Überspringen"-Link.
5. **Rollen:** „Für welche Rollen sollen wir dich berücksichtigen?" — Chips AUS DER
   ANALYSE (die `kategorien` der Auswertung + die Kategorie der gewählten Chance),
   vorausgewählt, ab-/anwählbar. KEINE fixe Einheitsliste für alle (Input 3
   ausdrücklich).

**Die Einwilligung (eigener Schirm, NACH den Fragen):**
- Häkchen, **NIE vorausgewählt**, Wortlaut (Input 3, wörtlich): „Ich bin damit
  einverstanden, dass LuxuryBandit mein Profil und meine Bewerbungsunterlagen passenden
  Arbeitgebern oder Recruiting-Partnern für relevante Stellen vorstellen darf."
- Stützzeile: „Deine Daten werden nicht ohne deine Zustimmung an Arbeitgeber
  weitergegeben."
- Zwei Wege: Gold „Weiter" (mit Häkchen → Einwilligung erteilt) und stiller Link
  „Ohne Freigabe weiter" — die Karriere-Analyse und die Mappe funktionieren OHNE
  Einwilligung weiter (kein Zwang, Input 3).
- Gespeichert wird: Status, Zeitstempel, `EINWILLIGUNG_VERSION` (Konstante, z. B.
  `"pool-v1-2026-08"`), Kandidaten-Kennung.

**Danach:** Mappe erzeugen (Baustelle C, mit `chanceId` + `analyse`) — Stufen-Anzeige
„Dein Profil wird vorbereitet …" — dann der **Erfolgs-Schirm** (neue Phase `"fertig"`,
ersetzt in Tür 2 den bisherigen Dossier-Redirect):

> **Dein Profil ist bereit.**
> „Du passt grundsätzlich gut zu dieser Art von Stelle. Wir können dein Profil
> passenden Arbeitgebern vorstellen, die aktuell deutschsprachige Mitarbeiter suchen."
> - Match % · stärkste passende Fähigkeiten · übertragbare Erfahrung ·
>   Umzugs-Status · Verfügbarkeit
> - Status mit Einwilligung: **„Profil für passende Arbeitgeber freigegeben"**, darunter
>   die Zeile: „Wir dürfen dein Profil passenden Arbeitgebern oder Recruiting-Partnern
>   vorstellen, wenn relevante Stellen verfügbar sind." (Änderung 5, wörtlich)
> - Status ohne: **„Nur für dich gespeichert"** + Gold-CTA **„Für passende Arbeitgeber
>   freigeben"** (holt die Einwilligung nach — derselbe Einwilligungs-Baustein)
> - **PDFs DIREKT KOSTENLOS (Änderung 1/5 — KEIN Schloss in Tür 2):**
>   **„CV herunterladen"** und **„Anschreiben herunterladen"** → das Dossier
>   (`/lebenslauf/<vid>`) mit entsperrten `PdfKnopf`-Karten (die Version trägt
>   `bezahlt: true`, siehe Baustelle C.5 — kein `SchlossHinweis` auf diesem Weg).
>   Eine „komplette Bewerbungs-PDF" gibt es im Haus nicht — NICHT neu bauen
>   (Änderungsauftrag: keine neuen Features), die zwei Einzel-PDFs reichen.
> - Video separat: stiller CTA **„Optional: Bewerbungsvideo erstellen"** → der
>   BESTEHENDE Video-Bezahlweg (`?video=<kennung>`-Einstieg) — das einzige
>   Bezahl-Element in Tür 2.
> - NIRGENDS behaupten: „Bewerbung verschickt", Arbeitgeber-Interesse, sichere
>   Vorstellung oder dass die gezeigte Marktchance noch verfügbar ist.

**Das Kandidaten-Profil** (`lib/kandidaten-store.ts`, EINE Datei je Kandidat
`kandidaten/<id>.json` — Muster + Begründung aus `lebenslauf-store.ts`):
`kandidatId` (= Hauptprofil-/Kiss-Log-Kennung) · name · email · telefon? · land/stadt
(aus Auswertung `ort`) · sprachen+niveaus · aktuellerBeruf · erfahrungJahre (aus den
Zeiträumen, von der KI der Vorschlags-Route mitgeliefert oder leer — NIE erfinden) ·
uebertragbareKompetenzen · empfohleneRollen · gewaehlteChance (`chanceId`) ·
matchProzent · matchEmpfehlung · umzug (ja/vielleicht/nein + laender[]) · arbeitsform[]
· verfuegbarkeit · gehaltswunsch? · verweise: hauptprofilId, versionId (dort liegen
CV-Original, zugeschnittener CV, Anschreiben, Strategie — NICHT doppeln, nur zeigen) ·
einwilligung { status, am, version } · erstelltAm/aktualisiertAm.
Fehlendes bleibt leer — nichts erfinden. Die Datei entsteht mit dem Interesse
(sie dient dem Kandidaten selbst); **„im Pool" = vorstellbar ist der Kandidat NUR mit
`einwilligung.status = erteilt`.**

---

## Baustelle G — der interne Kandidaten-Pool (NUR Admin, kein Arbeitgeber-Portal)

**Seite `/admin/kandidaten`** (PIN-Muster): Tabelle neueste zuerst — Kandidat ·
Sprachen · Land · Ziel-Länder · Wunsch-Rollen · Match % · Umzug · Verfügbarkeit ·
Datum · **Einwilligungs-Status** (deutlich: erteilt/nicht erteilt). Filter:
Deutsch-Niveau · Land · Ziel-Land · Rolle/Kategorie · Umzug ja/nein · Mindest-Match ·
Verfügbarkeit. Klick öffnet das volle interne Profil (inkl. Links auf Dossier/Version
und die gewählte Chance MIT Intern-Teil). Daten kommen NIE mit dem Server-Render einer
öffentlichen Seite — nur hinter der Admin-Prüfung (dasselbe Prinzip wie die
Anfragen-Ablage der Dossiers).

Kein Arbeitgeber-Login, kein Export-Automatismus, kein Weiterleiten-Knopf — das
Vorstellen bei Arbeitgebern passiert im MVP VON HAND durch den Owner (Concierge, wie
beim Video beschlossen).

---

## Baustelle H — Zielgruppen-Landingpages `/topics/<slug>`

Wie in v1 dieses Konzepts, mit EINER Änderung: **Der CTA verlangt keine Anzeige mehr.**

- `lib/lebenslauf-zielgruppen.ts` (NICHT „topics" — `/api/my-topics` heisst im Haus
  schon anders): `slug, kicker, titel, unterzeile, heroCta, beispielRollen[],
  szenario{titel,text}, faq[], metaTitel, metaBeschreibung`. Deutsche Quelle, ein
  Bündel durch `textbausteineInSprache` (Listen flachklopfen, Muster
  `executiveInSprache`).
- `app/topics/[slug]/page.tsx`: unbekannter Slug → `notFound()`; `generateMetadata`;
  INDEXIERBAR + in `app/sitemap.ts` (der Trichter selbst bleibt noindex). Aufbau wie
  die Lebenslauf-LP (`lb-bg lb-zentrale`, TopNav „LB - AI Recruiting", Kicker/H1,
  SeitenFuss): Titel · Unterzeile · **Gold-CTA „Passende Jobs finden" →
  `/themes/lebenslauf/start?jobs=1&topic=<slug>`** · stiller Link „Ich habe schon eine
  Anzeige" → Trichter Tür 1 · Beispiel-Rollen-Chips · Szenario-Karte · FAQ · darunter
  DIESELBEN Bausteine wie LP/Tunnel (`BewerbungszentraleFeatures` + `LebenslaufBeispiel`
  — nie eine zweite Text-Fassung).
- Erste Zielgruppe **`german-speakers`** — Kern (Input 2/3, wörtlich): „Sprichst du
  Deutsch? Dann kommen vielleicht mehr Jobs für dich infrage, als du denkst." /
  „Lade deinen bisherigen Lebenslauf hoch. Egal, was du bisher gemacht hast. Wir zeigen
  dir konkrete Stellen, bei denen deine Erfahrung und deine Sprachkenntnisse passen
  könnten." Voller Entwurf im Wortlaut-Anhang. Weitere Slugs später (career-changers,
  german-jobs-greece, …) — die Struktur trägt sie, jetzt nur EINE bauen.
- Kleiner Client-Beacon feuert `topic_page_view` mit `{ topic: slug }`.
- Der Backend-Trichter bleibt berufs- und länderoffen (nirgendwo eine Weiche im Code).

---

## Baustelle I — Messung (Kern der Validierung)

**Mechanik:** `?topic=` und `?jobs=` in die `HERKUNFT`-Liste (`TunnelSeite`);
`logFunnelEvent` liest `topic` aus der Adresse mit (Muster `vorlage`); die
Event-Ablage in `/api/try-this-look` übernimmt Felder EXPLIZIT — deshalb dort (additiv,
wie seinerzeit `theme`/`step`) neue Spalten: `topic`, `chanceId`, `kategorie`, `land`,
`prozent`, `empfehlung` + dieselben optionalen Felder am Event-Typ in
`lib/try-this-look-store.ts`. Bestehende Events NIE umbenennen/entfernen; die normierte
Familie (`funnel_started`, `lead_created`, `step_completed`, …) feuert unverändert.

**Die Ereignis-Liste (alle drei Inputs vereinigt; ⊕ = neu):**

| Ereignis | Feuert | Extras |
|---|---|---|
| ⊕ `topic_page_view` | Topic-Seite geladen | topic |
| `funnel_started` | TunnelSeite (existiert) | topic/jobs via Adresse |
| ⊕ `cv_upload_started` / ⊕ `cv_uploaded` | Datei gewählt / Upload zu Supabase ok | |
| ⊕ `job_added` | Tür 1: Anzeige-Schritt abgeschlossen (auch aus `lb_lebenslauf_anzeige`) | quelle link/text |
| ⊕ `profile_analysis_completed` | Auswertung ok (Tür 2) | |
| ⊕ `opportunity_matches_shown` | Vorschlags-Schirm steht | anzahl |
| ⊕ `opportunity_viewed` | Karte aufgeklappt | chanceId, kategorie, land, prozent |
| ⊕ `opportunity_selected` | Karten-CTA | dieselben |
| ⊕ `match_analysis_completed` | Detail-Analyse ok (beide Türen) | prozent, empfehlung |
| ⊕ `good_match` / `bridgeable_match` / `poor_match` | direkt danach genau EINES | |
| ⊕ `candidate_interest_confirmed` | „Ich bin interessiert" | chanceId |
| ⊕ `relocation_answered` | Umzugs-Frage beantwortet | antwort |
| ⊕ `candidate_profile_completed` | letzte Frage beantwortet | |
| ⊕ `candidate_consent_given` / ⊕ `candidate_consent_declined` | Einwilligungs-Schirm | version |
| ⊕ `candidate_pool_added` | Kandidaten-Datei mit erteilter Einwilligung gespeichert | |
| ⊕ `application_generation_started` / ⊕ `application_generated` | Mappe-Lauf (beide Türen; das bestehende `generation_started` des Video-Wegs bleibt getrennt) | versionId |
| ⊕ `cv_pdf_downloaded` / ⊕ `cover_letter_pdf_downloaded` | `PdfKnopf`, nur bei NICHT gesperrtem Klick | |
| `video_upgrade_clicked` ⊕ | Satz-Link „erstelle jetzt dein Video." (Dossier) | |
| `video_purchased` | = bestehendes `payment_completed` (theme lebenslauf) — KEIN Duplikat | |
| GESTRICHEN | ~~`original_job_clicked`~~ / ~~`external_job_application_clicked`~~ — es gibt keinen Original-Link mehr (Input 3) | |

**Die zehn Ereignisse des Meta-Tests (Änderung 7 — diese haben Vorrang, zuerst und
sauber bauen):** 1 `topic_page_view` · 2 `cv_upload_started` · 3 `cv_uploaded` ·
4 `profile_analysis_completed` · 5 `opportunity_matches_shown` ·
6 `opportunity_selected` · 7 `candidate_interest_confirmed` ·
8 `candidate_profile_completed` · 9 `candidate_consent_given` ·
10 `candidate_pool_added`.

**Die Kern-Treppe:** Landingpage → CV hochgeladen → Jobchancen gesehen → Chance
ausgewählt → Interesse → Profil vollständig → Einwilligung. Besonders wichtig für den
Meta-Test: „Landingpage → CV-Upload" — deshalb KEIN E-Mail-Tor dazwischen (Baustelle
E). PDF-Downloads sind sekundäre Produktmetriken, KEINE primäre Conversion mehr.
Insights-DARSTELLUNG der Treppe ist NICHT MVP — die Ereignisse liegen filterbar im
bestehenden Log.

---

## Gratis/Bezahlt & Kosten (Änderung 1 — Tür 2 ist KOMPLETT KOSTENLOS)

**Tür 2 / Kandidaten-Pool-MVP: der GESAMTE Bewerber-Weg ist gratis — es darf dort
KEINE Paywall vor CV, Anschreiben oder PDF geben.** Kostenlos sind ausdrücklich:
Landingpage · CV-Upload · Profil-Analyse · Jobchancen-Vorschläge · Detail-Match samt
aller vier Abschnitte (passt/übertragbar/erklärbar/Hürden) · Interesse ·
Kandidaten-Fragen · Einwilligung · zugeschnittener CV · Anschreiben · CV-PDF ·
Anschreiben-PDF · Aufnahme in den Pool. Das Ziel dieses MVP ist NICHT „Wie viele
Bewerber kaufen ein PDF?", sondern: Wie viele qualifizierte deutschsprachige
Kandidaten erlauben ausdrücklich das Vorstellen?

| Schritt | Kostet |
|---|---|
| ALLES in Tür 2 (siehe Liste oben) | gratis — inkl. ~3 Mini-KI-Aufrufe je Lauf (Auswertung + Vorschläge + Detail-Match) + 1 für die Mappe; „akzeptierter Akquisitionsaufwand" (Owner, Änderung 8.3) |
| Video | EINZIGES Bezahl-Element in Tür 2: optionales Zusatzprodukt über den bestehenden Video-Bezahlweg, NICHT Teil des Kernfunnels |
| Tür 1 (eigene Anzeige) | im MVP eingefroren — ihre heutige Bezahl-Logik bleibt, wie sie ist (Änderung 6); Preise weiterhin NUR aus `lib/pricing.ts` |
| Arbeitgeber-Seite | GIBT ES NICHT im MVP — Vorstellen macht der Owner von Hand; das spätere Firmen-Produkt (KONZEPT-BEWERBUNGSZENTRALE) kauft dann die Kontakt-Anfrage |

## Datenschutz (kurz, aber bindend)

- Einwilligung: nie vorausgewählt, mit Zeitstempel + Versions-Konstante gespeichert;
  ohne sie wird NICHTS extern vorgestellt („Nur für dich gespeichert").
- Widerruf: derselbe Schirm, der die Freigabe zeigt, kann sie zurücknehmen (Besitz-
  geprüft); zusätzlich der bestehende /contact-Weg. Kandidaten-Daten erscheinen NIE im
  öffentlichen Server-Render, nur hinter Besitz- bzw. Admin-Prüfung.
- Bestehende Hausregeln gelten weiter: Abmelden löscht Gerätespuren; keine E-Mail-
  Adresse des Hauses auf Seiten; Interner-Teil der Chancen (`intern`) verlässt den
  Server nie Richtung Kandidat.

---

## ENTSCHIEDEN (Owner-Änderungsauftrag 26.08. — vorher „offene Entscheidungen")

1. **`bezahlt`-Vererbung:** für Tür 2 irrelevant — kein Paywall-Modell für
   Bewerbung/PDF dort; die Code-Zeile bleibt unangetastet (Baustelle C.5).
2. **PDF-Schloss in Tür 2:** NEIN. PDFs kostenlos.
3. **~3 Mini-KI-Aufrufe gratis je Lauf:** JA — akzeptierter Akquisitionsaufwand.
4. **Wortlaut:** grundsätzlich freigegeben; die Formulierungen aus dem
   Änderungsauftrag (Anhang, ✓-Zeilen) sind bindend.
5. **Tür 1:** JA, unangetastet — im MVP funktional einfrieren, nur Regressionen über
   gemeinsame Komponenten vermeiden.
6. **Erste Jobchancen:** manuell ~10–15 durch den Owner. Schwerpunkt: deutschsprachige
   Jobs, Rumänien + Griechenland; Customer Support · Customer Service · Backoffice ·
   Order Management · Sales Support · Service Desk · Technical Support · Operations.
   NUR Stellen, bei denen Quereinstieg realistisch sein kann. Je Chance gilt der
   Quellen-Prüf-Workflow aus Baustelle D (KI neutralisiert → Owner prüft → „Als
   neutrale Marktchance geprüft" → erst dann aktiv).
7. **Stadt bei Marktchancen:** optional je Eintrag; wenn Stadt + Rolle die Firma
   praktisch eindeutig identifizieren, auf Land/Region vergröbern.

---

## Bau-Reihenfolge für den Umsetzer (Sonnet) — je Stufe fertig zeigen, Abnahme, weiter

Hausregeln bei JEDER Stufe: nichts committen/pushen/deployen ohne ausdrückliches
Owner-Ja · KEINE echten KI-Läufe zum Testen ohne Owner-Ja (Bau-Prüfung über
`npx tsc --noEmit`/Build + UI mit Beispieldaten; je Stufe EINEN abgesprochenen
Echt-Durchlauf) · UI nur aus `components/CI.tsx` (Skill `ci-design` VOR dem UI-Bauen
laden) · Texte nur über `TRICHTER_QUELLE`/`textbausteineInSprache`, immer duzen ·
Preise nie als Zahl · keine Overlays, kein `window.confirm` · Events/Routen nie
umbenennen · andere Produkte nicht anfassen; `TunnelSeite` nur additiv (HERKUNFT) ·
Ereignisse der Baustelle I werden je Stufe MIT eingebaut, nicht am Ende nachgerüstet.

- **Stufe 1 — Struktur-Analyse (A + B, gemeinsame Komponente):** Match-Route erweitert,
  Ergebnis-Schirm zeigt die vier Abschnitte + Ampel. Prüfung mit EINEM abgesprochenen
  Echt-Durchlauf (Owner-Ja für die KI-Aufrufe); `ProfilAssistent` unverändert; **Tür 1
  einmal durchklicken — ihr CTA/Ausgang muss sich EXAKT wie heute verhalten (Änderung
  6, Regressions-Prüfung)**; eine Fremdsprache stichprobenartig ohne Englisch-Reste.
- **Stufe 2 — Chancen-Pool + Admin (D):** `/admin/chancen` legt an/ändert/deaktiviert
  mit dem Fünf-Schritte-Prüf-Workflow; `intern` erscheint in KEINER Kandidaten-Antwort
  (gezielt prüfen!); eine Chance mit `quellenStatus: "unklar"` lässt sich NICHT
  aktivieren und erscheint nie im Funnel (auch das gezielt prüfen); 3–5 Test-Chancen.
- **Stufe 3 — Tür-2-Weg bis zu den Vorschlägen (E):** `?jobs=1`: CV-Upload OHNE
  E-Mail-Tor → Analyse → Speicher-Schirm („Wohin dürfen wir deine Ergebnisse
  speichern?") → Vorschlags-Schirm mit ehrlicher Spanne + Marktchancen-Hinweis →
  Auswahl → Detail-Analyse mit `chanceId`; kein Zweitupload.
- **Stufe 4 — Interesse → Fragen → Einwilligung → Mappe → Erfolgs-Schirm (F) und
  `/admin/kandidaten` (G):** Häkchen nie vorausgewählt; Weg OHNE Einwilligung läuft
  durch („Nur für dich gespeichert"); Mappe entsteht OHNE Tor, PDFs am Dossier OHNE
  Schloss; Kandidaten-Datei korrekt; Admin-Filter tun.
- **Stufe 5 — Zielgruppen-Seite (H):** `/topics/german-speakers` in zwei Sprachen, CTA
  landet im Jobs-Weg mit `?jobs=1&topic=`, unbekannter Slug → 404, Meta gesetzt.
- **Stufe 6 — Mess-Abnahme (I):** ein Test-Durchlauf, die zehn Meta-Test-Ereignisse
  vollständig im Insights-Log MIT `topic`/`chanceId` (localhost zählt als intern — den
  bestehenden internen Prüfweg nutzen, Erkennung nicht aufweichen).
- **SPÄTER, ausdrücklich NICHT im MVP:** Mappe-Ausgang für Tür 1 (CTA → Version statt
  Video-Weg), Struktur-Analyse im Spielplatz, weitere Zielgruppen-Slugs.

---

## Wortlaut-Anhang (deutsche Quelle — Owner-Abnahme ausstehend; ✓ = wörtlich aus den Inputs)

**Neue Schlüssel `TRICHTER_QUELLE`** (Bestand bleibt unangetastet):

```
datenTitel:       "Lade deinen Lebenslauf hoch"                                   ✓
datenZeile:       "Er muss nicht perfekt sein. Wir wollen verstehen, was du bisher
                   gemacht hast und welche Fähigkeiten du bereits mitbringst."     ✓
datenCta:         "Jobs für mich finden"                                          ✓ (Tür 2)
weiterMatch:      (GESTRICHEN fürs MVP — Tür 1 ist eingefroren, ihr Knopf bleibt)
mailTitel:        "Wohin dürfen wir deine Ergebnisse speichern?"                    ✓
marktHinweis:     "Diese Jobchancen basieren auf aktuell öffentlich ausgeschriebenen
                   Stellen. LuxuryBandit vertritt den jeweiligen Arbeitgeber nicht." ✓
vorschlaegeTitel: "Diese Jobchancen könnten zu dir passen"
vorschlaegeZeile: "Ehrlich eingeschätzt — auch, wo es eher nicht reicht."
etikettGut:       "Gute Chance"
etikettQuer:      "Quereinstieg realistisch"                                      ✓
etikettMoeglich:  "Möglicherweise passend"                                        ✓
etikettSchwach:   "Eher nicht passend"                                            ✓
karteCtaMarkt:    "Für solche Jobs berücksichtigt werden"                         ✓
karteCtaPartner:  "Für diese Stelle interessiert"                                 ✓
chanceH:          "Deine Chance"
ampelGut:         "Gute Chance"
ampelBruecke:     "Bewerben lohnt sich"
ampelSchwach:     "Lohnt sich wahrscheinlich nicht"
passtH:           "Was bereits passt"                                             ✓
transferH:        "Welche Erfahrung übertragbar ist"                              ✓
erklaerenH:       "Was erklärt werden sollte"                                     ✓
problemH:         "Was eine echte Hürde sein könnte"                              ✓
interesseZeile:   "Diese Jobchance könnte zu dir passen."                         ✓
interesseCta:     "Ich bin interessiert"                                          ✓
interesseTrotzdem:"Trotzdem Interesse melden"
andereChancen:    "Andere Chancen ansehen"
frageUmzug:       "Würdest du für einen passenden Job in ein anderes Land umziehen?" ✓
umzugJa/Vielleicht/Nein: "Ja" / "Vielleicht" / "Nein"                             ✓
frageLaender:     "Welche Länder kommen für dich infrage?"                        ✓
frageStart:       "Wann könntest du anfangen?"                                    ✓
startSofort/2Wochen/1Monat/Spaeter: "sofort" / "innerhalb von 2 Wochen" /
                   "innerhalb eines Monats" / "später"                            ✓
frageArbeitsform: "Wie möchtest du arbeiten?" — "Remote/Hybrid/Vor Ort/Egal"      ✓
frageGehalt:      "Welche Gehaltsvorstellung hast du?" + "Überspringen"           ✓
frageRollen:      "Für welche Rollen sollen wir dich berücksichtigen?"
einwilligung:     "Ich bin damit einverstanden, dass LuxuryBandit mein Profil und
                   meine Bewerbungsunterlagen passenden Arbeitgebern oder
                   Recruiting-Partnern für relevante Stellen vorstellen darf."    ✓
einwilligungZeile:"Deine Daten werden nicht ohne deine Zustimmung an Arbeitgeber
                   weitergegeben."                                                ✓
ohneFreigabe:     "Ohne Freigabe weiter"
mappe:            "Dein Profil wird vorbereitet …"                                ✓ (Sinn)
fertigTitel:      "Dein Profil ist bereit."                                       ✓
fertigZeile:      "Du passt grundsätzlich gut zu dieser Art von Stelle. Wir können
                   dein Profil passenden Arbeitgebern vorstellen, die aktuell
                   deutschsprachige Mitarbeiter suchen."                          ✓
statusFrei:       "Profil für passende Arbeitgeber freigegeben"                   ✓
statusPrivat:     "Nur für dich gespeichert"                                      ✓
freigebenCta:     "Für passende Arbeitgeber freigeben"                            ✓
freiZeile:        "Wir dürfen dein Profil passenden Arbeitgebern oder
                   Recruiting-Partnern vorstellen, wenn relevante Stellen verfügbar
                   sind."                                                          ✓
cvLaden:          "CV herunterladen"                                              ✓
anschreibenLaden: "Anschreiben herunterladen"                                     ✓
videoCta:         "Optional: Bewerbungsvideo erstellen"                           ✓
(aboZeile/aboCta GESTRICHEN — in Tür 2 gibt es kein Tor; sie kämen erst mit dem
 späteren Mappe-Ausgang für Tür 1 zurück)
```

**Zielgruppe `german-speakers`** (Entwurf; Kernsätze ✓ aus den Inputs):

- kicker: „Für Deutschsprachige"
- titel: „Sprichst du Deutsch? Dann kommen vielleicht mehr Jobs für dich infrage, als
  du denkst." ✓
- unterzeile: „Lade deinen bisherigen Lebenslauf hoch. Egal, was du bisher gemacht
  hast. Wir zeigen dir konkrete Stellen, bei denen deine Erfahrung und deine
  Sprachkenntnisse passen könnten." ✓
- heroCta: „Passende Jobs finden" ✓ · stiller Link: „Ich habe schon eine Anzeige"
- beispielRollen: Customer Support · Customer Service · Backoffice · Order Management ·
  Sales Support · Service Desk · Technical Support · Operations ✓
- szenario.titel: „Nie im Support gearbeitet?"
- szenario.text: „Acht Jahre Einzelhandel heisst: jeden Tag Kundenkontakt,
  Reklamationen, schwierige Gespräche — und Deutsch C1. Genau das sucht eine
  Support-Stelle; es stand nur nie so in deinem Jobtitel. Wir zeigen dir ehrlich, was
  aus deiner Erfahrung überträgt, was du erklären solltest und was wirklich fehlt —
  und bereiten dein Profil vor, wenn du berücksichtigt werden willst."
- faq (4): „Muss mein Lebenslauf perfekt sein?" — „Nein. Lade hoch, was du hast." ·
  „Ich habe nie in dieser Branche gearbeitet — hat das Sinn?" — „Genau dafür ist die
  Analyse da; wenn es nicht reicht, sagen wir dir das ehrlich." · „Bewerbt ihr mich
  automatisch?" — „Nein. Nichts wird ohne dich verschickt — mit deiner Freigabe stellen
  wir dein Profil passenden Arbeitgebern vor, die Entscheidung bleibt bei dir." ·
  „Was kostet das?" — „Nichts. Analyse, Jobchancen, dein zugeschnittener Lebenslauf,
  das Anschreiben, die PDFs und die Freigabe sind kostenlos. Nur das optionale
  Bewerbungsvideo kostet." (Videopreis zur Bauzeit als {price} aus lib/pricing.ts)
- metaTitel: „Jobs für Deutschsprachige — ehrliche Jobchancen | LuxuryBandit"
- metaBeschreibung: „Du sprichst Deutsch? Lade deinen Lebenslauf hoch und sieh
  konkrete Stellen, zu denen deine Erfahrung passen könnte — ehrlich eingeschätzt,
  auch als Quereinsteiger."

## Nachtrag 26.08.2026 — Der Pool darf nie leer wirken (Owner-Auftrag)

Owner, nachdem der Vorschlags-Schirm „Gerade keine passenden Jobchancen im Pool"
zeigte: „es spielt keine Rolle ob ich was eingepflegt habe oder nicht. Das Portal
soll immer Chancen zeigen und Ideen geben dem User was er machen kann."

GEBAUT (Markt-Fallback in /api/job-vorschlaege): Ist der handgepflegte Pool leer
ODER ergibt der Abgleich keine einzige Zuordnung, generiert die KI aus dem PROFIL
selbst 4–6 Marktchancen (Job-Richtungen, `ki-…`-IDs, partnerFreigabe=false) — in
derselben Kartenform, mit denselben Ehrlichkeitsregeln (keine erfundenen Firmen,
keine offenen Stellen behauptet, ehrliche Prozente, mindestens eine Brücke mit
benanntem fehlendem Stück). Der Client schickt bei einer `ki-`-Chance den
Kartentext als `eingabe` an /api/lebenslauf-match (statt der chanceId, die es im
Pool nicht gibt) — der Rest des Weges (Ergebnis → Interesse → Einwilligung) läuft
unverändert. Getestet mit leerem Pool: 5 deutsche Richtungen für das
Intensivpflege-Testprofil, Prozente 45–90, Quereinstiegs-Brücken markiert.

AUSSERDEM BEHOBEN (/admin/chancen): Der Speichern-Knopf kehrte bei leerer Rolle
oder leerem Land WORTLOS zurück (Owner: „ich habe einen job eingefügt aber ist
weg" — der Entwurf lebte nur im Speicher und war nach Verlassen weg). Jetzt rote
Fehlerzeile nach Hausregel `sichtbare-fehler-keine-formularfelder`. Der
Speicherweg selbst war nachweislich intakt (Test: anlegen → lesen → löschen).

═══════════════════════════════════════════════════════════════════

# DIE EINFACHE FASSUNG (26.08.2026 abends, Owner-Gespräch — GILT AB JETZT)

Owner, nach dem ersten Live-Test der gebauten Tür 2: „alles ist wirklich schrott.
Niemand wird überhaupt was verstehen. … Letztendlich muss alles sehr einfach sein."
Diese Fassung ERSETZT die Komplexität oben. Was oben steht, bleibt als Referenz
(Ehrlichkeits-Grundsätze, Zwei-Ebenen-Datenmodell, Verbotsliste GELTEN WEITER) —
aber der Funnel wird auf genau das Folgende reduziert.

## Das Konzept in einem Absatz (Owner, sinngemäß aus dem Gespräch)

Es gibt viele verzweifelte Menschen, die viel können und nicht wissen, was sie
machen sollen — arbeitslose IT-Leute (wie der Owner selbst: 2,5 Jahre arbeitsloser
UX-Designer, spricht Deutsch, lebt in Rumänien, bereit umzusteigen), Leute über 50,
Quereinsteiger. Die Firmen suchen deutschsprachige Leute „wie blöd" — die Stellen
bleiben trotzdem offen, weil die Kandidaten GLAUBEN, sie passen nicht, und weil
ihre Bewerbung es scheinbar beweist. Das Produkt ist die Brücke: **Chancen + Hilfe.**
Ehrliche Analyse der Vita → Jobs zeigen, die gehen (mit Prozentzahl, auch
Quereinstieg über die Sprache) → und ab ~50 % die Beratung: „Mit einer angepassten
Bewerbung und einem Motivationsschreiben wird mehr daraus — das machen wir für dich."

## Name

- Topic/Marke im Kopf: **„LB - Jobs"**, Motto: **„Jobs mit Deutsch"**.
- „AI Recruiting" ist der FIRMEN-Auftritt (Vermittlungsseite), nie der
  Kandidaten-Auftritt. Kandidaten suchen Jobs, keine Recruiter.
- NICHT „Jobs für Deutsche" — die Zielgruppe sind DEUTSCHSPRACHIGE (Rumänen mit
  Deutsch wie der Owner, Diaspora), nicht eine Nationalität.

## Positionierung (Anti-Yoummday, Owner: join.yoummday.com/de ist der Konkurrent)

- Yoummday rekrutiert (hip, jung, „wir suchen dich!!!", Drehtür-Gefühl). WIR BERATEN:
  erst ehrliche Analyse, auch mal abraten — wer geprüft und beraten wird statt
  eingesammelt, fühlt sich ernst genommen. Die Ehrlichkeit IST die Positionierung.
- Zielgruppe ausdrücklich auch 50+: ruhiger, erwachsener Ton, grosse Schrift, keine
  Hipster-Sprache, keine Emojis. Das dokumentenhafte Haus-Design (dunkel/creme/
  Serifen) passt bereits — wie eine Mappe beim guten Berater, nicht wie eine App.
- Botschaft dreht die Richtung: nie „wir suchen Leute", sondern „du passt für mehr
  Jobs, als du glaubst — dein Lebenslauf erzählt es nur falsch."

## Der Funnel — vier Bildschirme, NICHTS sonst

Meta-Anzeige (Owner-Wortlaut): „Du sprichst Deutsch – aber glaubst, dass dir die
Erfahrung für internationale Jobs fehlt? Viele Unternehmen in Rumänien und
Griechenland suchen deutschsprachige Mitarbeiter – auch Quereinsteiger. Lade deinen
bisherigen CV hoch. Wir zeigen dir konkrete Stellen, die zu deiner Erfahrung passen
könnten, und erstellen deine Bewerbung passend zu genau diesem Job."

1. **Landingpage:**
   H1: „Welcher Job passt zu mir?" (Owner-Wahl — die Frage, die sich die Zielgruppe
   selbst stellt). Unterzeile: „Du sprichst Deutsch? Dann gibt es mehr Jobs für
   dich, als du glaubst." Dann: „CV hochladen. Chancen sehen. Bewerben." EIN Knopf.
   KEIN Foto, keine Feature-Blöcke, kein Beispielprofil, kein Hilfe-Chat.
2. **CV hochladen:** eine Kachel, ein Satz („Er muss nicht perfekt sein.").
3. **E-Mail — PFLICHT:** „Wohin dürfen wir deine Analyse schicken?" Ein Feld, ein
   Knopf. KEIN „weiter ohne", KEIN Login-Dialog. (Dreht die frühere „kein
   Mail-Tor"-Entscheidung: ohne Adresse gibt es keinen Lead und nichts Gespeichertes
   — der Owner hat live erlebt, dass sonst alles weg ist.)
4. **Chancen-Seite:** OBEN die eingepflegten Pool-Stellen (das sind die Leads, dafür
   ist /admin/chancen da), darunter KI-Richtungen NUR in vermittelbaren Kategorien
   (Support, Backoffice, Guide, Verkauf … — nie „Head of UX" aus der Vita
   extrapolieren). Je Karte: Rolle, ehrliche Prozentzahl, EIN Satz was passt/fehlt.
   Ab ~50 % steht die Beratung direkt auf der Karte: „Mit einer angepassten
   Bewerbung + Motivationsschreiben hast du hier echte Chancen — das machen wir für
   dich." Zwei klare Knöpfe: **„Bewerbung darauf anpassen"** und **„PDF
   herunterladen"**. (Nie wieder ein CTA wie „Considerat pentru astfel de locuri de
   muncă", bei dem selbst der Owner nicht wusste, was passiert.)

Jeder „Bewerbung anpassen"-Klick = Lead im Admin (Kandidat + Stelle + Match).

## Geld (beide Wege, gestaffelt — kein Entweder-oder)

1. Analyse + Chancen: GRATIS (Köder + Lead).
2. Bewerbung anpassen + Motivationsschreiben: KANDIDAT ZAHLT (Einmalpreis; die
   Mappen-/Anschreiben-Maschine existiert schon und wird hier angeschlossen).
3. Vermittlung: FIRMA ZAHLT (für den Kandidaten kostenlos; der einwilligungsbasierte
   Pool ist das Asset).

## Technische Aufräum-Liste (aus dem Live-Test, Owner-Befunde)

- Tunnel-Seite (?jobs=1): NUR die vier Schritte. Bewerbungszentrale-Block,
  Beispielprofil, HilfeChat, Video-Funnel-Reste: RAUS.
- Zwei lange KI-Läufe nacheinander („dauert ewig"): zusammenlegen/verkürzen,
  ehrliche Fortschrittsanzeige.
- Angemeldet bleiben: Eingegebene Daten müssen die Sitzung überleben; Ergebnisse
  hängen an der E-Mail und sind über den Link wiederauffindbar. Nach Rausgehen darf
  NICHTS weg sein.
- Desktop-Breite (.lb-zentrale) auch für /topics/* und den Jobs-Trichter.

NICHT GEBAUT — Umsetzung erst auf Owner-Kommando.

## NACHTRAG (26.08.2026, direkt im Anschluss): BEWERBUNG OHNE CV — „Ich will. Ich kann. Ich heisse."

Owner, drei Nachrichten in Folge: „vielleicht braucht man gar kein CV" · „Bewerbung
ohne CV — das hat vielleicht kein Jobportal" · „ich will, ich kann, ich heisse."

Das ERSETZT den CV-Upload als Einstieg (Schritt 2 der einfachen Fassung oben) und
ist zugleich der USP fürs Marketing:

**Warum ohne CV (drei Gründe):**
1. Meta-Traffic ist Handy-Traffic — niemand hat sein CV-PDF auf dem Handy; jeder
   Upload-Zwang kostet die Mehrheit vor dem ersten Ergebnis.
2. Die Zielgruppe SCHÄMT sich für ihren CV (Lücken, alte Titel) — „kein Lebenslauf
   nötig" nimmt die grösste Angst schon in der Anzeige.
3. Ohne CV KANN das System nicht stumpf Titel-auf-Titel matchen (UX-Designer → nur
   UX-Jobs, Owner: „nicht wie alle anderen") — es muss fragen, was einer wirklich
   kann; genau daraus entstehen die Quereinstiegs-Chancen.

**Der Einstieg = drei Schritte in Menschensprache (Owner-Wortlaut als Titel):**
1. **„Ich will"** — Klick-Chips: welche Richtung/Arbeit, Remote/Umzug, ab wann.
2. **„Ich kann"** — Klick-Chips: was zuletzt gemacht, was er sonst kann
   (Kundenkontakt, Technik, Organisation …), Sprachen mit Deutsch-Niveau.
   Klicken statt Tippen (Hausregel, Memory chat-no-personal-questions-buttons-only).
3. **„Ich heisse"** — Name + E-Mail (PFLICHT — das ist der Lead; ersetzt das
   separate E-Mail-Tor der Fassung oben).
→ danach direkt der Chancen-Schirm (unverändert wie oben: Pool zuerst, ehrliche %,
Beratung ab ~50 %, „Bewerbung darauf anpassen").

**CV wird OPTIONAL:** „Hast du einen Lebenslauf? Lad ihn hoch — dann wird die
Analyse genauer." Nie Pflicht.

**Drittes bezahltes Stück:** „Wir schreiben dir deinen Lebenslauf" — aus seinen
Antworten plus Nachfragen; für die Zielgruppe genauso verkaufbar wie
Bewerbung-Anpassen und Motivationsschreiben.

**Anzeigen-Hooks:** „Welcher Job passt zu mir? Finde es heraus — ohne Lebenslauf,
in 2 Minuten." · Claim: **„Bewerbung ohne CV."**

NICHT GEBAUT — Umsetzung erst auf Owner-Kommando.

## NACHTRAG 2 (unmittelbar danach): DIE BEWERBUNG IST DAS VIDEO — Motivation herausfinden

Owner: „motivation herausfinden" · „nur mit Video".

Die Synthese: **„Bewerbung ohne CV" heisst — die Bewerbung IST ein Video.**
- Ein Lebenslauf kann Motivation nicht zeigen; ein Mensch, der in die Kamera sagt,
  was er will und warum, schon. Beim QUEREINSTEIGER ist die Motivation oft das
  einzige Argument, das wirklich zählt (Titel/Zertifikate fehlen ja gerade).
- Die drei Schritte (Ich will / Ich kann / Ich heisse) + die Motivations-Frage
  liefern den Stoff; die KI schreibt daraus den SPRECHTEXT; der Kandidat liest ihn
  ein (Handykamera reicht) — exakt die bestehende Skript→Einsprechen-Maschine des
  Video-Bewerbungs-Funnels. NICHTS Neues bauen, nur neu verkabeln.
- Die Firma bekommt statt PDF-Stapel: ein kurzes Video + die Eckdaten. Das hat kein
  Jobportal — und es ist zugleich der Haus-USP (Video-Applications), auf die
  Job-Chancen-Schiene gesetzt.
- „Motivation herausfinden" gehört als eigene, kurze Frage in den „Ich will"-Schritt
  (Klick-Chips + ein freiwilliges Satzfeld): Warum willst du wechseln / was treibt
  dich? Die Antwort fliesst ins Skript und in die Beratung auf der Chancen-Karte.

NICHT GEBAUT — Umsetzung erst auf Owner-Kommando.

## DER CLAIM (Owner, Abschluss des Gesprächs 26.08.2026)

**„Video-Bewerbung. Zuletzt zählt der Mensch."**

(Owner-Wortlaut. Sprachliche Alternative, einmal angemerkt: „Am Ende zählt der
Mensch" — idiomatischer; Owner entscheidet.) Der Claim trägt die ganze
Positionierung: Nicht das Papier entscheidet, nicht der CV-Filter, der die
Zielgruppe seit Jahren aussortiert — der Mensch. Er gehört auf die Landingpage
unter „Welcher Job passt zu mir?" und in die Anzeigen.

## NACHTRAG 3: DIE VIDEO-GRATIS-LINIE (Owner, direkt im Anschluss)

Owner: „Er kann Video hochladen von sich, wir geben ihm den Skript und dann kann er
entweder sein Video an die Firmen schicken. Kostenlos. Oder er generiert ein Video,
das er bei uns hostet, aber profi."

- **Gratis:** Skript (aus Ich-will/Ich-kann/Motivation, von der KI geschrieben) +
  seine EIGENAUFNAHME. Das Video gehört ihm, er verschickt es selbst an Firmen.
- **Bezahlt:** das PROFI-Video — KI-generiert aus seiner Aufnahme, gehostet BEI UNS
  (die eingebettete Bewerbungsseite: nicht kopierbar, mit Adresse, teilbar per Link).
- Das ist EXAKT die Gratis-Linie der Bewerbungszentrale vom 25.08. („Er kann auch
  Video hochladen, aber kann keins generieren. Es wird sein Originalvideo gezeigt")
  — EIN Preismodell für beide Produkte, dieselbe Kasse, dieselbe Maschine.

## NACHTRAG 4: SICHTBARKEIT, NICHT ANONYMITÄT (Owner, Diskriminierungs-Gespräch)

Owner-Gedankengang: Wegen Diskriminierung (Aussehen, Alter) gibt es anonyme
Bewerbungen ohne Bild/Altersangabe — „die Firmen nehmen die aber nicht, sondern
die, die es machen. Das ist fies."

Konsequenz fürs Produkt:
- **Wir verkaufen SICHTBARKEIT, nicht Anonymität.** Die Realität: Genommen wird,
  wer sich zeigt; die anonyme Bewerbung lässt einen nur in der Masse verschwinden.
  Ehrliche Ansage an den Kandidaten (Ehrlichkeits-Linie): „Die, die sich zeigen,
  werden genommen. Wir zeigen dich — von deiner besten Seite." Der CV-Filter
  diskriminiert die Zielgruppe ohnehin längst (Alter steht in Jahreszahlen, die
  Lücke im Zeitstrahl) — das Video dreht die Kontrolle um: Der Mensch entscheidet
  selbst, wie er gesehen wird. Das IST „Zuletzt zählt der Mensch".
- **Freiwilligkeit bleibt die harte Regel** (grobe Rechts-Einordnung, kein
  Rechtsrat: keine Pflicht zu anonymen Bewerbungen in DE; Firmen dürfen kein Foto
  VERLANGEN — der Bewerber darf freiwillig zeigen, was er will): Das Video wird
  aktiv EMPFOHLEN, nie erzwungen. Das PDF gibt es standardmässig OHNE Foto und
  OHNE Geburtsdatum (Best Practice, nimmt HR die Compliance-Angst) — wer will,
  bleibt dabei.
- Firmen-Interesse + Fragen ans Profil: EXISTIERT schon (Firmen-Chat,
  Interesse-Zähler, Anfragen im Cockpit am Dossier) — wird nur an die
  Jobs-Schiene angeschlossen, nichts Neues bauen.

## NACHTRAG 5: KREATIVE ADS — DER TRAUM ALS EINSTIEG (Owner, beim Bau-Start)

Owner: „ich will wirklich creative ads schalten wie: Bist du 55 und du willst noch
Pilot werden? Warum nicht. Finde heraus was zu dir passt."

- Anzeigen-Muster: eine PROVOKATIVE Traum-Frage + „Warum nicht. Finde heraus, was
  zu dir passt." — der Traum wird ernst genommen, nie belächelt.
- Weitere Owner-Zeile (gleich danach): „Du bist ein Talent aber kein Job? Finde
  heraus, wo du Chancen hast." — dasselbe Muster: Würde zusprechen (Talent!),
  dann die Einladung zur ehrlichen Analyse.
- Produkt-Konsequenz: Der „Ich will"-Schritt trägt ein freiwilliges Feld „Was
  willst du wirklich machen?" — die Analyse nimmt den Traum ernst und antwortet
  EHRLICH: entweder der Weg dorthin oder die realistische Brücke daneben (Pilot
  mit 55 → z. B. Luftfahrt-nahe Rollen), nie ein stilles Ignorieren, nie eine
  falsche Zusage (Ehrlichkeits-Linie).

## NACHTRAG 6: DER EINSTIEG IST EIN KLICK-CHAT (Owner, beim Text-Review)

Owner: „ist es nicht einfacher in Form von Klickchat das herauszufinden? Ein Feld,
das immer nach oben scrollt und der User kann sich durchklicken? Dann am Ende
wissen wir, was er will."

- Die drei Schritte (Ich will / Ich kann / Ich heisse) werden EIN Bildschirm: ein
  Chat-Verlauf, eine Frage zur Zeit, Antworten NUR per Klick-Chips (Ausnahmen: das
  freiwillige Traum-Feld und Name/E-Mail am Ende). Beantwortete Fragen bleiben als
  kompakte Zeilen im Verlauf stehen, der Verlauf scrollt von selbst nach oben.
- LEITPLANKEN (Lehre vom 25.08., „unten ist zu viel los im Chat"): kein Avatar,
  keine Tipp-Animationen, kein freies Chat-Feld — es ist ein geführter Klick-Weg in
  Chat-FORM, kein Gesprächs-Simulator. „Ich will/Ich kann/Ich heisse" stehen als
  drei Kapitel-Überschriften im Verlauf.
- Fragen-Sequenz (11 Fragen, dann Analyse): Was willst du machen? (Richtungs-Chips)
  · Wie willst du arbeiten? · Umzug? · Ab wann? · Traum (freiwillig) — Was hast du
  zuletzt gemacht? · Was kannst du gut? · Wie gut ist dein Deutsch? · Lebenslauf?
  (Ja=Upload / Nein=weiter) — Wie heisst du? · Wohin schicken wir deine Chancen?
  (E-Mail, PFLICHT) → „Zeig mir meine Chancen".
- HUMOR + DEUTSCH-TEST (Owner: „Ich will auch humorvoll sein, oder ab und zu einen
  kleinen Deutschtest einbauen"): Der Chat darf schmunzeln — warm und erwachsen
  (50+-Zielgruppe), nie Hipster-Witzelei. Und der KNIFF: Die Deutsch-Frage wird
  selbst AUF DEUTSCH gestellt, samt deutscher Antwort-Chips („Alles verstanden" /
  „Das meiste" / „Nur ein paar Wörter") — wer klickt, hat den Test nebenbei
  bestanden; nur die kleine Hinweiszeile darunter ist übersetzt. Die deutschen
  Teile sind im Client HART kodiert (nie durch die Übersetzungsmaschine — sonst
  wäre der Test weg).

## NACHTRAG 7: DER BELLA-SPRECHTEXT (HeyGen, deutsch — für Chat-Video UND Meta-Ads)

Setting: das Radio-Studio-Video (rotes Kleid, Mikrofon, ON AIR — /Chat/chat-poster.jpg
bzw. der Ersatz, den der Owner erzeugt; im Chat-Kopf als JOBS_BELLA_VIDEO verdrahtet).

**Haupt-Fassung (~25 s):**
(KORRIGIERT, Owner: „ich will 50+ nicht erwähnen, ich will lieber jedes Alter
erwähnen" — keine Altersangaben in den Standard-Texten; die konkrete Alters-Hook
aus Nachtrag 5 („Bist du 55 und willst Pilot werden?") bleibt als bewusste
Ad-VARIANTE möglich, ist aber nicht der Standard.)

„Du sprichst Deutsch — aber glaubst, für internationale Jobs reicht es nicht? Dann hör
mir kurz zu. Viele Firmen suchen genau dich. Auch als Quereinsteiger. In jedem Alter.
Beantworte mir ein paar Fragen — ohne Lebenslauf, in zwei Minuten. Ich zeige dir
ehrlich, welche Jobs zu dir passen. Und was dir noch fehlt, sage ich dir auch. Welcher
Job passt zu dir? Finde es heraus. Denn zuletzt zählt der Mensch."

**Kurz-Fassung (~12 s):**
„Willst du nochmal etwas Neues — egal, wie alt du bist? Warum nicht. Du sprichst
Deutsch? Dann gibt es mehr Jobs für dich, als du glaubst. Zwei Minuten, ohne Lebenslauf.
Finde heraus, was zu dir passt."

Regeln eingehalten: Duzen, keine Job-/Geld-Versprechen (Ehrlichkeits-Linie: „ich zeige
dir ehrlich … was dir fehlt, sage ich dir auch"), Claim als Schluss (Owner-Wortlaut
„zuletzt zählt der Mensch"). Zahlen ausgeschrieben (HeyGen liest sie sauberer).

---

## Nachtrag 8 (26.08.2026 abends): Die Werkzeug-Familie — drei getrennte Tools

Owner-Klärung nach dem Anzeigen-Test: „aus dieser Seite machen wir einfach einen
Bewerbungsgenerator" → „das ist ein anderer Tool LB- Resume Generator" → „Der
Bewerbungs-Video generator wird ein extra Tool sein."

1. **LB - Jobs** (`/topics/german-speakers` + `?jobs=1`-Chat): der FB-Lead-Funnel.
   Klick-Chat mit David, Chancen, Karte. GEBAUT.
2. **LB - Resume Generator** (`/themes/resume`): „Man gibt die Anzeige ein Die Bewerbung
   die schon existiert, das bild und wird angepasst zum runterladen. Mit wasserzeichen.
   Will er ohne, muss er zahlen 9,99 Euro. Das wars." Staffel: „die Analyse zeigen wir
   ihm auch mit drunter. Aber wir optimieren nicht alles. Wir machen ein titelblatt mit
   anschreiben und passen das layout an. Für eine volle optimierung muss er 9,99 zahlen."
   IM BAU (26.08.).
3. **Resume-Video-Generator**: „Kunde lädt sein CV hoch und es gibt einen skript den
   er vorliesst und dann kann er ein Video generieren. Mehr gibt es nicht. Kein CV.
   Nur Video." KEIN Neubau — die BESTEHENDE Video-Applications-Seite
   (`/themes/lebenslauf`) wird dazu angepasst (Owner: „du kannst aber die Seite
   behalten für den Resum Video generator. Du muss das nur anpassen."), d. h. auf den
   Video-Fluss gestrafft. Dran erst NACH Abnahme des Resume Generators.

---

## Nachtrag 9 (27.08.2026): „Deine Karte" ist keine Bewerbung — Owner-Einwand, offen

Owner beim Live-Test des Ergebnisses: „Das am Ende ist nicht die Bewerbung, die er
bekommt, oder? Das darf er gar nicht sehen. Sonst denkt er, das ist seine Bewerbung.
E-Mail gross geschrieben statt Name. Das ist Blödsinn. Hier muss die richtige
Bewerbung sein." — Owner hat weiteren Input zu dieser Seite angekündigt, NOCH NICHTS
BAUEN.

Gefundene Stelle: die Abschlusskarte „DEINE KARTE" zeigt aktuell `{email}` gross und
fett als Titel (kein Fallback auf `{name}`), darunter Chip „Deutsch: C1", „Das willst
du" / „Das kannst du" / „Dein Traum" und den Freigeben-Knopf. Der Owner sieht darin
zu Recht ein Problem: sie wirkt wie „seine Bewerbung", ist aber nur die interne
Freigabe-Kachel für den Owner/die Firma — und zeigt im Fehlerfall (keine E-Mail
gefunden) sogar dessen halbe Kontoadresse in Großbuchstaben als vermeintlichen Namen.

Zu klären, sobald der Owner weiteren Input gibt:
- Was diese Endkachel wirklich zeigen soll (Name statt E-Mail als Minimum).
- Ob an dieser Stelle überhaupt schon eine „Bewerbung" (Anschreiben/CV-Kachel) stehen
  soll, oder ob die Freigabe-Kachel bewusst schlicht bleibt und die echte Bewerbung
  (falls vorhanden) getrennt woanders liegt — siehe [[LB - Resume Generator]]
  (Nachtrag 8), das eigene Tool für die eigentliche Bewerbung/das Anschreiben.

---

## Nachtrag 10 (27.08.2026): Branchen-Checkliste am Ende ist doppelt — Owner-Einwand, offen

Owner beim selben Live-Test: „Das hier macht das Ganze nur komplizierter. Er hat
sich schon entschieden im Chat, was er machen will." — bezieht sich auf den
Branchen-Haken-Schritt („Wo sollen wir für dich suchen?", Checkboxen aus
`lib/branchen.ts`) ganz am Ende der Analyse. Der Kandidat hat seine Richtung
(`richtungen`) im Chat bereits über die Fragen S.fRichtung u. a. angegeben — die
Branchen-Liste fragt dieselbe Entscheidung ein zweites Mal, in anderer Form, ab.

Owner ist noch mitten im Durchgehen dieser Ergebnis-Seite (siehe auch Nachtrag 9,
der Premium-Block-Gedanke direkt davor) — NOCH NICHTS BAUEN, weiterer Input folgt.
Wahrscheinliche Richtung: die Branchen-Checkliste entfällt, die schon im Chat
gewählte Richtung reicht als Sucheingabe für den Owner.

---

## Nachtrag 11 (27.08.2026): „Deine Karte" (Freigeben-Kachel) braucht man gar nicht — Owner-Einwand, offen

Owner direkt im Anschluss an Nachtrag 9/10, dieselbe Ergebnis-Seite, Blick auf die
Abschlusskachel „DEINE KARTE" (E-Mail als Titel, Deutsch-Chip, „Das willst du /
Das kannst du / Dein Traum", Knopf „Für passende Arbeitgeber freigeben", Zeile
„Deine Karte ist gespeichert — mit deiner E-Mail kommst du jederzeit zurück."):
„Also das hier braucht man gar nicht."

NOCH NICHTS BAUEN — Owner ist weiterhin mitten im Durchgehen dieser Seite von
oben nach unten (Premium-Block ok/Idee offen → Branchen-Checkliste raus →
Freigeben-Kachel raus). Wirkt in Summe wie: die Seite endet nach Prozenten +
Plus/Minus + Premium-Angebot, ohne zusätzliche Freigabe-Kachel und ohne
Branchen-Checkliste danach.

---

## Nachtrag 12 (27.08.2026): Der Fazit-Ton — kein Ultimatum, sondern ein Angebot mit Knopf

Owner zum KI-generierten Fazit-Satz („Entscheide dich: Wenn du wirklich in
Kundenservice willst, überarbeite CV und Anschreiben so, dass … sichtbar wird;
willst du UX/Produkt bleiben, ändere die Bewerbungsrichtung und ersetze die kurze
Schreibprobe durch ein fehlerfreies, kurzes A…"): „Das ist nicht richtig, was du
schreibst." Sein Gegenvorschlag als Ton-Vorlage:

„Du könntest es machen, aber deine aktuelle Präsentation macht dich für Recruiter
unplausibel. Du kannst es jetzt aber dafür anpassen — mit einem Button."

Zwei Punkte darin:
1. TON: kein Entweder-oder-Ultimatum an den Kandidaten („entscheide dich"), sondern
   eine ehrliche Feststellung + ein Weg nach vorn („du könntest, aber … / du kannst
   es jetzt anpassen").
2. Greift den Gedanken aus Nachtrag 9 wieder auf (Premium-Block, „das kann hier
   sofort generiert werden mit einem Button" — er hat Kundenservice angegeben, ein
   Knopf passt die Bewerbung dafür an): das Fazit soll nicht nur beschreiben, was
   fehlt, sondern direkt zum Anpassen-Knopf führen, statt zu einem Rückruf-Angebot
   für 100 €.

NOCH NICHTS BAUEN — betrifft den Prompt in `app/api/bewerbung-pruefen/route.ts`
(`analyse.fazit`) UND hängt an der offenen Sofort-Anpassen-Funktion aus Nachtrag 9.
Beides gehört zusammen geklärt, bevor etwas geändert wird.

---

## Nachtrag 13 (27.08.2026): CV-Upload wird PFLICHT, direkt am Anfang mit dem Deutschtest

Owner: „Und am Anfang machen wir sofort den Deutschtest und CV-Upload. Und ohne
CV-Upload machen wir gar nicht weiter. Sonst bekommen wir nur Müllkandidaten."

Das ist eine Kehrtwende gegenüber dem bisherigen PIVOT (26.08., Baustelle „kein CV
nötig"): der ganze Ohne-CV-Zweig (Alter/Jahre/Abschluss/Führerschein per Chat als
Ersatz für den fehlenden Lebenslauf, `mitCv: false`) entfällt. Neue Reihenfolge am
Tor: E-Mail-Gate → Deutschtest (5 gestaffelte Fragen + ggf. Schreibprobe) →
CV-Upload PFLICHT → erst dann geht es weiter. Kein Fortkommen ohne Lebenslauf.

Begründung: die bisherige Kulanz (Chat fragt alles ab, wenn kein CV da ist) erzeugt
„Müllkandidaten" — Interessierte ohne belastbare Angaben, die den Pool verwässern.

NOCH NICHTS BAUEN — reiht sich in die laufende Serie der Ergebnis-Seiten-Kritik
(Nachtrag 9–12) ein; Owner ist weiterhin im Diktier-Modus („schreibe ins Konzept").
Betrifft, sobald freigegeben: `torSchritt`-Reihenfolge und Gate-Logik in
`LebenslaufStartClient.tsx`, die `mitCv`/mitCv-false-Zweige in
`lib/kandidaten-store.ts` und `app/api/bewerbung-pruefen/route.ts` (die dort
gebauten Ersatzfragen für „kein CV" würden hinfällig).

---

## Nachtrag 14 (27.08.2026): Der Wortlaut fürs CV-Pflicht-Tor

Owner konkretisiert Nachtrag 13, den Ablauf am Tor: „Wir fragen ihn: Hast du eine
CV? Sagt er nein, dann: Es tut uns leid, ohne bist du nicht qualifiziert. Wir
brauchen deine Vita, um eine Analyse zu machen."

Ablauf also: Frage „Hast du einen Lebenslauf?" (Ja/Nein-Chips) → Nein → Abbruch-
Nachricht („Es tut uns leid, ohne bist du nicht qualifiziert. Wir brauchen deine
Vita, um eine Analyse zu machen.") statt Weiterleitung in einen Ersatz-Chat. Ja →
Upload-Schritt, danach erst der Deutschtest bzw. wie in Nachtrag 13 vorgesehen.

NOCH NICHTS BAUEN — Serie läuft weiter (Nachtrag 9–14), Owner weiterhin im
Diktier-Modus.
