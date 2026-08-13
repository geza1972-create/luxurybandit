# Der EINE Tunnel — zwei Schritte, jedes Produkt gleich

> Owner 12.08.2026: „also Stepp 1. Name, Email, Stepp zwei das was stepp drei ist wo links
> ein platzahlter ist für Foto oder Video upload dann generieren." · „Genauso müssen alle
> tunels aussehen. nicht komplizierter." · „bitte mach erst mal ein kleines konzept damit
> du das überall einheitlich durchziehst."
>
> Anlass: Meta-Leads sind zu teuer. Der Werbeklick landet direkt bei uns, und die E-Mail
> wird als ALLERERSTES eingesammelt — wie im Meta-Formular, nur auf unserer Seite. Vorbild
> für Schritt 2 ist der Kuss-Schritt „3 · DER KUSS", den der Owner ausdrücklich gut findet.

## Die zwei Schritte (für JEDES Produkt identisch)

**Schritt 1 — Name + E-Mail.** Eine Karte, zwei Felder, ein Knopf „Weiter".
- Der Lead ist GESPEICHERT, sobald „Weiter" gedrückt ist (bestehende kiss-claim/Tor-Logik) —
  auch wenn der Besucher danach abspringt. Das ist der ganze Zweck des Schritts.
- Der Name ist der Karten-Name (Empfänger beim Geschenk, der eigene beim Versprechen).
- Felder sehen nach Feldern aus: sichtbarer Rand, Label, Tinte auf Hell (Owner: „Max sieht
  nicht aus wie ein Eingabefeld"). Fehler ROT ans Feld (Memory „Sichtbare Fehler").
- Baustein: `TunnelStart` in components/CI.tsx — EINMAL gebaut, überall benutzt.
- **Bekannte überspringen Schritt 1 komplett** (Owner 12.08.2026: „wenn jemand angemeldet
  ist braucht man name email nicht mehr") — angemeldet oder E-Mail schon im Haus (Konto,
  Tor, Kasse): der Funnel beginnt direkt auf Schritt 2.

**Schritt 2 — die AUSWAHL des Produkts (entfällt, wenn es nichts zu wählen gibt).**
Owner 12.08.2026: „Hier haben wir die auswahl des Goals; in Geburtstag hätten wir die
template auswahl in stept zwei. Dann step 3 wäre genau das was wir jetzt haben: Bild
hochladen." — Geburtstag: Vorlagen-Wahl. Kuss: Szene. **Versprechen: KEIN Schritt 2** —
die Ziele-Auswahl ist gestrichen („Es hat keine Auswirkung auf unser Programm"), es geht
direkt zu Schritt 3.

**Schritt 3 — die zwei Kacheln + Generieren.** Exakt das Kuss-Layout:
- LINKS: die Platzhalter-Kachel für das, was der Kunde GIBT (Foto oder Video/Aufnahme),
  mit weißer Lösch-Scheibe. Tippen = hochladen/aufnehmen, Zuschnitt nach Upload-Skill.
- RECHTS: die Kachel mit dem ZIEL (Model, Look, Szene — je Produkt), gleiche Größe.
- Darunter der EINE große Erzeugen-/Kaufknopf (`Knopf` aus CI, Preis IM Knopf aus
  lib/pricing — nie getippt), darunter der Einwilligungssatz.
- Produktspezifische Zusatzwahl (Ziele-Chips beim Versprechen, Szene beim Kuss) steht
  KOMPAKT unter den Kacheln — nie als eigener Schritt. Mehr Schritte gibt es nicht.

**Vor und zurück:** Der Kunde kann zwischen den Schritten in BEIDE Richtungen (Owner
12.08.2026: „der user soll auch vor und zurück in den steps") — Zurück-Pfeil je Schritt,
Eingaben bleiben beim Zurückgehen erhalten. Das Bekannte-überspringen gilt nur beim
EINSTIEG, es darf ein bewusstes Zurückblättern nie wegdrücken.

Danach übernimmt der bestehende Kaufweg (Tunnel-Memory): Kasse → Server liefert → Galerie.

## Die Kachel-Belegung je Produkt

| Produkt | Links (gibt der Kunde) | Rechts (das Ziel) | Zusatz unter den Kacheln |
|---|---|---|---|
| Kuss | sein Foto (ersetzbar) | ihr Foto/Model (ersetzbar) | Szene-Wahl |
| Versprechen | seine Aufnahme (Video+Ton) | Ziel-Look (Porsche-Mann) | Ziele-Chips (bis 3) |
| Geburtstag | ihr/sein Foto | Look (Traumwelt/Real) | Stimme/Vorlage |
| Hochzeit | Paarfoto bzw. sie+er | Szene (Kirche/Kuss) | — |
| Urlaub | sein Foto | Ziel-Ort/Szene | Ort |
| Gutschein | (keins nötig) | Karten-Video | Betrag/Geschenk |

Ein neues Produkt füllt NUR diese Tabelle aus — es baut keinen eigenen Tunnel
(ARCHITEKTUR-PLATTFORM.md §11, Memory „produktaufbau-video-card-feature-card").

## Das oberste Gesetz: EIN Bauwerk

Owner 12.08.2026: „allle funnels und wenn eine änderung bitbs dann ist es bei allen gleich.
ich will da nicht mehr einzeln rum bauen." — Das Tunnel-Gerüst existiert GENAU EINMAL im
Code (ein gemeinsamer Baustein `TunnelSeite`); die `/themes/<produkt>/start`-Seiten reichen
nur ihre Konfiguration hinein (Kacheln, Auswahl-Schritt, Preis-Schlüssel, Texte). Eine
Änderung am Gerüst — Reihenfolge, Optik, Zurück-Verhalten, Google, light — wird EINMAL
gemacht und wirkt sofort in jedem Funnel. Wer ein Produkt-Gerüst kopiert, baut einen
Regelverstoß.

## Feste Regeln

1. Alle Bausteine aus components/CI.tsx; fehlt einer, wird er DORT ergänzt.
2. Beide Fassungen (dunkel + hell/lb-fb) müssen stimmen; keine Inline-Farben in Karten.
3. Texte in lib/kiss-i18n.ts, 7 Sprachen, immer duzen. Preise nur aus lib/pricing.
4. Alters-/Nacktheitsprüfung bleibt am Upload; Admin-Vorschau (`isStaff`) bleibt.
5. Reihenfolge der Umstellung: Versprechen (Werbeprodukt, zuerst) → Kuss → Geburtstag →
   Hochzeit/Urlaub/Gutschein. Je Produkt ein Commit, live geprüft auf 375×812.
