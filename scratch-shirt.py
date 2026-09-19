"""
DER AUFDRUCK AUF DAS PRODUKTFOTO (Owner 15.09.2026: „Das T-shirt muss wie ein produkt
abgebildet werden" · „ohne spruch. Du baust es als text drauf" · „wir benutzen immer das
gleiche t-shirt und hoodie" · „unser typo musst du nehmen").

EIN FOTO, VIELE SPRÜCHE: Die beiden Fotos (vom Owner) bleiben, wie sie sind. Der Satz wird
darauf gesetzt — für jeden neuen Spruch entsteht ein neues Produktbild, ohne dass jemand
etwas gestaltet.

DIE SCHRIFT IST DIE DER SEITE: `font-serif` ist im Haus die Tailwind-Vorgabe, also Georgia.
Damit trägt das Shirt dieselbe Schrift wie die Werktexte im Portal.

Format 4:5 wie die Werkkacheln — das Quadrat wird auf hellem Grund eingebettet, nicht
beschnitten: Ein angeschnittener Ärmel sähe nach Fehler aus.
"""
import sys
from PIL import Image, ImageDraw, ImageFont

BREIT, HOCH = 1080, 1350
GRUND = (247, 247, 247)          # derselbe helle Ton wie auf den Fotos
SERIFE = "/System/Library/Fonts/Supplemental/Georgia.ttf"

# Wo auf dem Kleidungsstück der Druck sitzt — Anteile der Fotobreite/-höhe.
# BEIDE FOTOS SIND RÜCKANSICHTEN (Owner 15.09.2026: „ich gebe dir das t-shirt von hinten. Wir
# bedrucken nur hinten"). Auf dem Rücken sitzt der Druck höher als auf der Brust: Es gibt keinen
# Halsausschnitt, der Platz wegnimmt, und tiefer sähe er verrutscht aus.
# „breite" ist das SCHMALSTE Maß hier: Der Satz soll früh umbrechen, nicht bis an die Ärmel
# laufen (Owner 15.09.2026: „der spruch läuft zu breit auf beides").
DRUCKFELD = {
    "shirt":  {"mitte": 0.50, "oben": 0.24, "breite": 0.30},
    "hoodie": {"mitte": 0.50, "oben": 0.36, "breite": 0.30},
}


def umbrechen(zeichner, text, font, max_breite):
    zeilen, zeile = [], ""
    for wort in text.split():
        versuch = f"{zeile} {wort}".strip()
        b = zeichner.textbbox((0, 0), versuch, font=font)
        if b[2] - b[0] <= max_breite or not zeile:
            zeile = versuch
        else:
            zeilen.append(zeile)
            zeile = wort
    if zeile:
        zeilen.append(zeile)
    return zeilen


def bauen(art, foto, bloecke, ziel):
    """`bloecke`: Liste von (Text, Größe in Anteilen der Feldbreite, Abstand danach)."""
    grund = Image.new("RGB", (BREIT, HOCH), GRUND)
    q = Image.open(foto).convert("RGB")
    seite = min(BREIT, HOCH)
    q = q.resize((seite, seite), Image.LANCZOS)
    oben = (HOCH - seite) // 2
    grund.paste(q, ((BREIT - seite) // 2, oben))

    d = ImageDraw.Draw(grund)
    feld = DRUCKFELD[art]
    max_breite = int(seite * feld["breite"])
    mitte = int((BREIT - seite) / 2 + seite * feld["mitte"])
    y = oben + int(seite * feld["oben"])

    for text, anteil, luft in bloecke:
        f = ImageFont.truetype(SERIFE, int(seite * anteil))
        for zeile in umbrechen(d, text, f, max_breite):
            b = d.textbbox((0, 0), zeile, font=f)
            d.text((mitte - (b[2] - b[0]) / 2 - b[0], y), zeile, font=f, fill=(255, 255, 255))
            y += int((b[3] - b[1]) * 1.55)
        y += int(seite * luft)

    grund.save(ziel, quality=94)
    print("geschrieben:", ziel)


def kreis_drauf(art, foto, motiv, ziel, anteil=0.26):
    """
    NUR DAS PORTRÄT, RUND (Owner 15.09.2026: „vielleicht sollen wir auch t-shirts und hoodies
    machen nur mit seinem porträt im kreis").

    Kein Name, kein Satz — damit auch keine Frage nach Marke oder Übersetzung. Das Gemälde ist
    gemeinfrei, der Kreis schneidet es auf das Gesicht zu.
    """
    grund = Image.new("RGB", (BREIT, HOCH), GRUND)
    q = Image.open(foto).convert("RGB")
    seite = min(BREIT, HOCH)
    q = q.resize((seite, seite), Image.LANCZOS)
    oben = (HOCH - seite) // 2
    grund.paste(q, ((BREIT - seite) // 2, oben))

    d = int(seite * anteil)
    m = Image.open(motiv).convert("RGB")
    # Quadratischer Ausschnitt aus der oberen Bildhälfte — dort sitzt bei einem Porträt das Gesicht.
    b, h = m.size
    kante = min(b, h)
    links = (b - kante) // 2
    hoch_ab = int((h - kante) * 0.18)
    m = m.crop((links, hoch_ab, links + kante, hoch_ab + kante)).resize((d, d), Image.LANCZOS)

    maske = Image.new("L", (d * 4, d * 4), 0)
    ImageDraw.Draw(maske).ellipse([0, 0, d * 4 - 1, d * 4 - 1], fill=255)
    maske = maske.resize((d, d), Image.LANCZOS)

    feld = DRUCKFELD[art]
    x = int((BREIT - seite) / 2 + seite * feld["mitte"] - d / 2)
    y = oben + int(seite * feld["oben"])
    grund.paste(m, (x, y), maske)
    grund.save(ziel, quality=94)
    print("geschrieben:", ziel)


if __name__ == "__main__":
    P = "public/lakatosbandi"
    spruch = "Nu a vândut aproape nimic. Nu s-a oprit niciodată."
    bauen("shirt", f"{P}/shirt-schwarz.png",
          [("VAN GOGH", 0.040, 0.008), (spruch, 0.031, 0)],
          "/tmp/repro/produkt-shirt.jpg")
    bauen("hoodie", f"{P}/hoodie-schwarz.png",
          [("VAN GOGH", 0.040, 0.008), (spruch, 0.031, 0)],
          "/tmp/repro/produkt-hoodie.jpg")
    kreis_drauf("shirt", f"{P}/shirt-schwarz.png", "/tmp/repro/w-portret.jpg",
                "/tmp/repro/produkt-shirt-portret.jpg")
    kreis_drauf("hoodie", f"{P}/hoodie-schwarz.png", "/tmp/repro/w-portret.jpg",
                "/tmp/repro/produkt-hoodie-portret.jpg")
