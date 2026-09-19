"""
DAS POSTER MIT DER GESCHICHTE (Owner 15.09.2026: „was ist wenn wir poster printen nur mit den
sprüchen drunter? dann sind wir originell" · „mit den texten die du gemacht hast" · „Name des
Künstlers und Geburtsjahr und Sterbedatum").

Das ist der Teil, den ein Posterhändler nicht hat: Jeder verkauft denselben Van Gogh. Nur bei uns
steht darunter, was daran zu sehen ist — in unserem Ton, in unserer Schrift.

AUFBAU, von oben nach unten:
  · das Werk, mit Luft ringsum (wie ein Passepartout — Owner 14.09.2026: „damit es edler wirkt")
  · Name des Künstlers, gesperrt, klein
  · Lebensdaten
  · Titel und Jahr des Werks
  · die Geschichte, drei bis vier Zeilen

FORMAT 50×70 (1:1.4) — das mittlere der drei Druckformate. Für die anderen zwei skaliert es
mit; die Schriftgrößen hängen an der Breite, nicht an festen Pixeln.
"""
from PIL import Image, ImageDraw, ImageFont
import segno
import io

BREIT, HOCH = 1400, 1960              # 50×70 bei 71 dpi Vorschau; fürs Drucken entsteht es größer
GRUND = (250, 249, 246)
TINTE = (26, 24, 20)
GRAU = (122, 116, 106)
SERIFE = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SERIFE_KURSIV = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"

RAND = 0.085                          # Anteil der Breite, links und rechts


def umbrechen(d, text, font, breite):
    zeilen, zeile = [], ""
    for wort in text.split():
        versuch = f"{zeile} {wort}".strip()
        if d.textbbox((0, 0), versuch, font=font)[2] <= breite or not zeile:
            zeile = versuch
        else:
            zeilen.append(zeile); zeile = wort
    if zeile:
        zeilen.append(zeile)
    return zeilen


def gesperrt(d, text, font, mitte, y, farbe, sperre):
    """Großbuchstaben mit Abstand — der Name soll wie eine Bildunterschrift wirken, nicht wie eine Überschrift."""
    breiten = [d.textbbox((0, 0), c, font=font)[2] for c in text]
    gesamt = sum(breiten) + sperre * (len(text) - 1)
    x = mitte - gesamt / 2
    for c, b in zip(text, breiten):
        d.text((x, y), c, font=font, fill=farbe)
        x += b + sperre


# Der Name und die Scan-Zeile je Sprache — dasselbe Poster entsteht dreimal (Owner 15.09.2026:
# „story telling poster" · „muss in allen sprachen funktionieren").
SPRACHEN = {
    "ro": {"art": "POSTER VIU",
           "scan": "Scanează — tabloul prinde viață și îți spune povestea lui, ca la muzeu."},
    "en": {"art": "LIVING POSTER",
           "scan": "Scan — the painting comes alive and tells you its story, like at the museum."},
    "de": {"art": "LEBENDES POSTER",
           "scan": "Scannen — das Bild wird lebendig und erzählt seine Geschichte, wie im Museum."},
}


def poster(werk, kuenstler, leben, titel, jahr, geschichte, ziel, adresse=None, sprache="ro"):
    art = SPRACHEN.get(sprache, SPRACHEN["ro"])["art"]
    scan = SPRACHEN.get(sprache, SPRACHEN["ro"])["scan"]
    """
    `sprache`: bestimmt Titelzeile und Scan-Satz; alles andere kommt als Text herein.

    `adresse`: Führt sie mit, wird unten links ein QR-Code gesetzt — das Poster spricht dann
    (Owner 15.09.2026: „Sprechende Poster vielleicht"). Wer ihn scannt, landet bei dem Werk,
    wo der Agent erzählt. Passt zu dem Satz, der ohnehin im Trichter steht: „o galerie care
    vorbește".
    """
    bild = Image.new("RGB", (BREIT, HOCH), GRUND)
    d = ImageDraw.Draw(bild)
    rand = int(BREIT * RAND)
    innen = BREIT - 2 * rand
    mitte = BREIT // 2

    # ── DER QR-CODE OBEN, MITTIG (Owner 15.09.2026: „der qr code soll oben mitte sein und
    #    schreibst du drunter VIDEOPOSTER")
    #    Oben ist er das Erste, was man sieht — und das Wort darunter sagt, was passiert, wenn
    #    man ihn scannt. Unten wäre er eine Fussnote gewesen.
    # Der Titel gross über dem Bild; der QR-Code kommt weiter unten, direkt unter das Werk
    # (Owner 15.09.2026: „der QR code muss unter dem bild sein. Titel VIDEO POSTER muss gross
    # sein übers bild").

    # ── ALLES ALS EIN BLOCK, MITTIG (Owner 15.09.2026: „jedes poster ist hochformat und das
    #    bild mittendrin mit paspartur und spruch auf poster")
    #    Vorher sass das Werk oben und unten blieb eine leere Fläche — das sieht nach Fehler aus,
    #    nicht nach Passepartout. Jetzt wird zuerst gerechnet, wie hoch Bild und Text zusammen
    #    sind; der Block steht dann in der Mitte, leicht nach oben versetzt (klassische
    #    Rahmensitte: unten etwas mehr Luft als oben).
    w = Image.open(werk).convert("RGB")
    hoehe = int(innen * w.size[1] / w.size[0])
    deckel = int(HOCH * 0.60)
    if hoehe > deckel:                # Hochformate nicht über den Text laufen lassen
        hoehe = deckel
        innen_w = int(hoehe * w.size[0] / w.size[1])
    else:
        innen_w = innen
    w = w.resize((innen_w, hoehe), Image.LANCZOS)

    f_text_mess = ImageFont.truetype(SERIFE, int(BREIT * 0.0235))
    zeilen = umbrechen(d, geschichte, f_text_mess, int(innen * 0.92))
    textblock = (int(HOCH * 0.030) + (int(BREIT * 0.076) + int(HOCH * 0.056) if adresse else 0)
                 + int(BREIT * 0.010)          # Luft zwischen Bild und Name
                 + int(BREIT * 0.050)          # Name
                 + int(BREIT * 0.046)          # Lebensdaten
                 + int(BREIT * 0.055)          # Titel
                 + len(zeilen) * int(BREIT * 0.036))
    gesamt = hoehe + textblock
    # Der QR oben braucht Platz — der Block rutscht bei einem Poster mit Code etwas tiefer.
    y = int((HOCH - gesamt) * (0.58 if adresse else 0.42))
    bild_oben = y
    # SCHATTEN UNTER DEM WERK (Owner 15.09.2026: „mit schatten") — vor dem Bild gezeichnet und
    # weichgezeichnet, damit es auf dem Papier liegt statt darauf geklebt zu sein.
    from PIL import ImageFilter
    schatten = Image.new("RGB", (BREIT, HOCH), GRUND)
    ImageDraw.Draw(schatten).rectangle(
        [mitte - innen_w // 2 + 6, y + 10, mitte + innen_w // 2 + 6, y + hoehe + 16],
        fill=(196, 191, 180))
    schatten = schatten.filter(ImageFilter.GaussianBlur(14))
    bild.paste(schatten.crop((0, 0, BREIT, HOCH)), (0, 0))
    bild.paste(w, (mitte - innen_w // 2, y))
    # DER TITEL WIRD ERST JETZT GESETZT: Der Schatten oben wird als ganzes Blatt eingefügt und
    # überschreibt alles, was vor ihm gezeichnet wurde (15.09.2026, im Bild gesehen).
    if adresse:
        f_vp = ImageFont.truetype(SERIFE, int(BREIT * (0.042 if len(art) <= 14 else 0.029)))
        gesperrt(d, art, f_vp, mitte, int(HOCH * 0.055), TINTE, BREIT * 0.010)
    # KEIN SCHWARZER STRICH MEHR (Owner 15.09.2026: „das hat auch einen rahmen. sieht blöd aus")
    # — viele Museumsscans bringen schon eine dunkle Kante mit, und im gerahmten Poster wären es
    # dann drei Linien übereinander. Der Schatten darunter genügt.
    y += hoehe + int(HOCH * 0.030)
    if adresse:
        q = segno.make(adresse, error="m")
        puffer = io.BytesIO()
        q.save(puffer, kind="png", scale=10, border=1, dark="1a1814", light="faf9f6")
        puffer.seek(0)
        kante = int(BREIT * 0.076)
        qb = Image.open(puffer).convert("RGB").resize((kante, kante), Image.NEAREST)
        bild.paste(qb, (mitte - kante // 2, y))
        y += kante + int(HOCH * 0.012)
        # Der Satz unter dem Code (Owner 15.09.2026): Ein Poster an einer Ladenwand muss ohne
        # Verkäufer erklären, warum dort ein Muster steht.
        f_scan = ImageFont.truetype(SERIFE_KURSIV, int(BREIT * 0.021))
        for z in umbrechen(d, scan, f_scan, int(innen * 0.8)):
            bb = d.textbbox((0, 0), z, font=f_scan)
            d.text((mitte - bb[2] / 2, y), z, font=f_scan, fill=GRAU)
            y += int(HOCH * 0.020)
        y += int(HOCH * 0.008)

    # ── Künstler, Lebensdaten
    f_name = ImageFont.truetype(SERIFE, int(BREIT * 0.030))
    gesperrt(d, kuenstler.upper(), f_name, mitte, y, TINTE, BREIT * 0.006)
    y += int(BREIT * 0.050)
    f_klein = ImageFont.truetype(SERIFE, int(BREIT * 0.021))
    b = d.textbbox((0, 0), leben, font=f_klein)
    d.text((mitte - b[2] / 2, y), leben, font=f_klein, fill=GRAU)
    y += int(BREIT * 0.046)

    # ── Titel des Werks, kursiv
    f_titel = ImageFont.truetype(SERIFE_KURSIV, int(BREIT * 0.026))
    zeile = f"{titel}, {jahr}" if jahr else titel
    b = d.textbbox((0, 0), zeile, font=f_titel)
    d.text((mitte - b[2] / 2, y), zeile, font=f_titel, fill=TINTE)
    y += int(BREIT * 0.055)

    # ── Die Geschichte
    f_text = f_text_mess
    for z in zeilen:
        b = d.textbbox((0, 0), z, font=f_text)
        d.text((mitte - b[2] / 2, y), z, font=f_text, fill=TINTE)
        y += int(BREIT * 0.036)

    # ── UNSER NAME, GANZ UNTEN (Owner 15.09.2026: „dann können wir auch unseren namen da rein
    #    schreiben — Poster bei lakatosbandi.com")
    #    Klein, grau, mit Abstand zum Text: Es ist eine Herkunftsangabe, keine Werbung auf dem
    #    Bild. Jedes Poster an einer Wand nennt trotzdem, woher es kommt.
    f_fuss = ImageFont.truetype(SERIFE, int(BREIT * 0.0165))
    gesperrt(d, "LAKATOSBANDI.COM", f_fuss, mitte, int(HOCH * 0.928), GRAU, BREIT * 0.0035)

    # ── WEM WAS GEHÖRT (Owner 15.09.2026: „wir können sogar copyright fürs poster einfügen")
    #    NUR auf unseren Teil: Das Gemälde ist gemeinfrei, ein © darauf wäre falsch
    #    („copyfraud"). Text und Gestaltung sind dagegen unsere Arbeit.
    f_recht = ImageFont.truetype(SERIFE, int(BREIT * 0.0125))
    recht = "Text și design © 2026 lakatosbandi.com · Imagine: domeniu public"
    b = d.textbbox((0, 0), recht, font=f_recht)
    d.text((mitte - b[2] / 2, int(HOCH * 0.950)), recht, font=f_recht, fill=GRAU)

    # Der QR-Code steht oben, unter ihm das Wort VIDEOPOSTER (Owner 15.09.2026). Unten stand er
    # bis eben ein zweites Mal — ein Poster mit zwei Codes lässt den Betrachter raten, welchen.

    bild.save(ziel, quality=94)
    print("geschrieben:", ziel)
    # Wo im Poster das Werk sitzt — der Film wird später genau dorthin gelegt
    #   (Owner 15.09.2026: „die poster machst du genauso animiert … du baust das video drauf").
    return {"x": mitte - innen_w // 2, "y": bild_oben, "w": innen_w, "h": hoehe}


if __name__ == "__main__":
    poster("/tmp/repro/m-monet-impresie.jpg", "Claude Monet", "1840 – 1926",
           "Impresie, răsărit de soare", "1872",
           "Un port în ceață și un soare portocaliu, pictat în câteva ore. "
           "De la titlul acestui tablou i se trage numele unei mișcări întregi — "
           "a fost gândit ca o batjocură.",
           "/tmp/repro/poster-monet.jpg", "https://lakatosbandi.com/monet")
    poster("/tmp/repro/web-vangogh.jpg", "Vincent van Gogh", "1853 – 1890",
           "Lan de grâu cu chiparoși", "1889",
           "Chiparosul stă de veghe la marginea lanului, singurul care nu se apleacă. "
           "Se spune că în vara aceea cerul n-a stat locului nicio zi.",
           "/tmp/repro/poster-vangogh.jpg", "https://lakatosbandi.com/vangogh")
