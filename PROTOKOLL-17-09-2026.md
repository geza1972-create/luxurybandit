# Protokoll 17.09.2026 — Stand für den nächsten Chat

## Wo wir stehen

Alles unten ist **gebaut, Build grün, NICHTS ausgerollt**. Live ist der alte Stand.

## Was heute an der Künstler-Posterseite passiert ist

Datei: `app/portal/[kuenstler]/page.tsx` · `components/Poster.tsx` · `app/globals.css` ·
`lib/lakatosbandi-poster.ts` · `lib/lakatosbandi-druckdatei.ts`

1. **Knopf „YOU AS A PICTURE"** — im Poster, direkt unter dem Bild.
   Schwarz, serifenlos, mit Upload-Pfeil links. **Ohne Funktion** (Owner: „du baust die
   buttons jetzt ohne funktion, dann sage ich dir was sie machen werden").
   Prop: `bildKnopf` in `Poster.tsx`, Stil `.lb-poster-knopf`.
2. **Edit-Knopf (Stift)** — mittig **direkt unter dem Satz**, schwarzer Kreis, groß.
   **Ohne Funktion.** Prop: `textKnopf`, Stil `.lb-poster-stift`.
3. **Kopfzeile `LAKATOSBANDI.COM` über dem Werk: entfernt** (Owner: „raus"). Die Adresse
   steht weiter in der Rechtezeile am Fuß. Auch die Marke-Fußzeile ist weg.
4. **Unterer Blattrand größer** (`randUnten` 3,5 → 5,5) — Rechtezeile und QR kleben nicht
   mehr auf der Rahmenkante. Gilt für Schirm **und** Druckdatei.
5. **QR-Code: rechts unten** — so wie vorher. (Zwischendurch mittig über dem Namen probiert,
   auf Ansage wieder zurückgebaut: „qr code wieder wo es war".)
6. **Satz läuft nicht mehr in den QR** — links und rechts derselbe Abstand
   (QR-Breite + Luft), auf dem Schirm und im PDF-Umbruch.

## Vorher noch erledigt

- `lib/lakatosbandi-bestellung.ts`: der `druckdateiBauen`-Aufruf ist nach dem Porträt-Rollback
  wieder vollständig (Profil, Name, Titel, Text, `qrZiel`, `scan`, `recht`). Typecheck grün.
- Die komplette **Porträt-Strecke ist gelöscht** (Owner: „lösche alles was du gebaut hast bis
  jetzt und ich sage dir die schritte vom anfang an"): `lib/lakatosbandi-portret.ts`,
  `components/PortretBauen.tsx`, `app/api/portret/`, `app/portal/portret/`, `app/portal/stil/`,
  die Rewrites, der Porträt-Zweig in `app/api/druck-kasse/route.ts`, die Porträt-Props in
  `components/KaufKnopf.tsx` und 63 `portret*`-Textzeilen.

## Offen — das Nächste

1. **Was die zwei Knöpfe tun sollen** — sagt der Owner an. Erst dann Code.
2. Nichts von heute ist deployt.
3. Ältere offene Punkte: YouTube-Kanalname „Living Poster" (24-h-Sperre lief), Anschreiben an
   Künstler liegt fertig und **unverschickt** (`lib/kuenstler-werbung*.ts`).

## Arbeitsregeln (vom Owner, heute mehrfach eingeschärft)

- **Erst verstehen, dann bauen.** Keine zweite Seite, WYSIWYG: der Kunde bestellt dort, wo er
  das Poster sieht.
- Nie nach Deploy fragen — nur auf das Wort „deploy" ausrollen.
- Kurz antworten, Rückfragen in einen eigenen Block.
