"""
DIE DRUCKDATEI (Owner 16.09.2026: „das ist die datei die auch an dem printshop geht dann").

── EIN RASTER, ZWEI AUSGABEN ───────────────────────────────────────────────────────────────

Die Kachel auf der Seite und dieses PDF entstehen aus denselben Zahlen: lib/lakatosbandi-poster.ts
schreibt sie mit `scratch-poster-raster.mjs` nach /tmp/repro/poster-raster.json, und hier werden
sie in Millimeter umgerechnet. Ändert sich das Raster, ändern sich beide — das war der ganze
Zweck der Übung.

Alle Maße im Raster sind Anteile der BLATTBREITE (`breit`) oder der BLATTHÖHE (`hoch`). Auf dem
Schirm ist das `cqw`, hier ist es ein Anteil der Seitenbreite in Millimetern.

── AUFLÖSUNG ──────────────────────────────────────────────────────────────────────────────

300 dpi ist Druckstandard. Ist das Quellbild dafür zu klein, sagt das Skript es und macht
trotzdem weiter — aber es sagt es, statt still etwas Unscharfes zu liefern.

── DIE BESTELLNUMMER STEHT IM PDF ─────────────────────────────────────────────────────────

Klein, in der Fußzeile: „Licență LB-XXXXXX · uz personal". Ein Kopierschutz ist das nicht — den
gibt es bei einem PDF nicht —, aber es sagt, aus welcher Bestellung eine Datei stammt.
"""
import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import segno

RASTER = json.load(open("/tmp/repro/poster-raster.json"))
P = RASTER["POSTER"]
VERHAELTNIS = RASTER["POSTER_VERHAELTNIS"]
FORMATE = RASTER["POSTER_FORMATE"]

SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SERIF_I = "/System/Library/Fonts/Supplemental/Georgia Italic.ttf"


def farbe(hex_):
    hex_ = hex_.lstrip("#")
    return tuple(int(hex_[i:i + 2], 16) for i in (0, 2, 4))


def umbrechen(d, text, font, breite):
    zeilen, zeile = [], ""
    for wort in text.split():
        versuch = f"{zeile} {wort}".strip()
        if d.textbbox((0, 0), versuch, font=font)[2] <= breite or not zeile:
            zeile = versuch
        else:
            zeilen.append(zeile)
            zeile = wort
    if zeile:
        zeilen.append(zeile)
    return zeilen


def abstaende(text, sperre):
    """Wie viel Luft nach jedem Zeichen kommt.

    Um einen Punkt herum weniger: In „LAKATOSBANDI.COM" sah der gesperrte Punkt mit vollem
    Abstand auf beiden Seiten aus wie zwei Punkte (Owner 16.09.2026: „hier ist ein doppelter
    Punkt statt eins").
    """
    raus = []
    for i, c in enumerate(text):
        naechstes = text[i + 1] if i + 1 < len(text) else ""
        eng = c in ".·" or naechstes in ".·"
        raus.append(sperre * (0.15 if eng else 1))
    return raus


def gesperrt(d, text, font, mitte, y, fill, sperre):
    """Georgia kann kein letter-spacing — also Zeichen für Zeichen setzen."""
    breiten = [d.textbbox((0, 0), c, font=font)[2] for c in text]
    luft = abstaende(text, sperre)
    gesamt = sum(breiten) + sum(luft[:-1])
    x = mitte - gesamt / 2
    for c, b, l in zip(text, breiten, luft):
        d.text((x, y), c, font=font, fill=fill)
        x += b + l


def leiste(d, B, H, breit, farben):
    """Der gedruckte Rahmen: fünf Ringe von aussen nach innen, Licht oben links wie im CSS."""
    n = len(farben)
    for i, hexfarbe in enumerate(farben):
        a0 = round(breit * i / n)
        a1 = round(breit * (i + 1) / n)
        d.rectangle([a0, a0, B - 1 - a0, H - 1 - a0], outline=farbe(hexfarbe), width=max(1, a1 - a0))


def poster(werk_datei, format_="A2", dpi=300, *, kopf="POSTER VIU", profil=None,
           name="", leben="", titel="", text="", qr_ziel="", scan="", marke="lakatosbandi.com",
           recht="", nummer="", rahmen=None, ziel="/tmp/repro/poster.pdf"):
    mm = FORMATE[format_]
    px = dpi / 25.4                      # Pixel je Millimeter
    B = round(mm["breite"] * px)
    H = round(mm["hoehe"] * px)
    # Ein Anteil der Blattbreite in Pixeln — dasselbe wie `cqw` auf dem Schirm.
    def cqw(v):
        return v / 100 * B

    f = {k: farbe(v) for k, v in P["farben"].items()}
    blatt = Image.new("RGB", (B, H), f["papier"])
    d = ImageDraw.Draw(blatt)
    mitte = B / 2
    font = lambda pfad, groesse: ImageFont.truetype(pfad, max(8, round(groesse)))

    # Der Rahmen liegt aussen; alles andere rückt um seine Breite nach innen.
    leiste_px = cqw(P["rahmen"]["breit"]) if rahmen else 0
    if rahmen:
        leiste(d, B, H, round(leiste_px), P["rahmen"]["holz" if rahmen == "holz" else "schwarz"])

    oben = leiste_px + cqw(P["randOben"])
    unten = H - leiste_px - cqw(P["randUnten"])

    # ── Kopf ────────────────────────────────────────────────────────────────────────────
    y = oben
    if kopf:
        fo = font(SERIF, cqw(P["kopf"]["breit"]))
        gesperrt(d, kopf, fo, mitte, y, f["tinte"], cqw(P["kopf"]["breit"]) * P["kopf"]["sperre"])
        y += d.textbbox((0, 0), kopf, font=fo)[3] + cqw(P["kopf"]["luft"])

    # ── Das Werk kommt erst, wenn der Textblock gemessen ist ───────────────────────────
    # Sonst nimmt das Bild seine volle Feldhöhe, und der Text läuft unten aus dem Blatt — bei
    # den gerahmten Fassungen zuerst, weil die Leiste zusätzlich Platz kostet (16.09.2026).
    bild_oben = y

    # ── DER TEXTBLOCK IST EIN STÜCK UND KLEBT UNTEN ────────────────────────────────────
    #
    # Vorher wuchs er von oben nach unten, während die Fusszeile von unten nach oben kam — in der
    # Mitte trafen sie sich und liefen ineinander (16.09.2026 im ersten PDF gesehen). Jetzt wird
    # ZUERST gemessen, wie hoch alles zusammen ist, und der ganze Block an den unteren Rand
    # gesetzt: dieselbe Ordnung wie auf dem Schirm.
    innen = B - 2 * leiste_px - 2 * cqw(P["rand"])

    def hoehe(text, fo):
        return d.textbbox((0, 0), text, font=fo)[3]

    # Jede Zeile des Blocks: (art, inhalt, font, farbe, sperre, abstand_danach)
    zeilen = []
    kreis = None
    if profil and os.path.exists(profil):
        # Das Gesicht des Künstlers neben seinem Namen — dieselbe Form wie auf der Seite.
        d_kreis = round(cqw(P["name"]["kreis"]))
        roh = Image.open(profil).convert("RGB")
        kante = min(roh.size)
        roh = roh.crop(((roh.width - kante) // 2, (roh.height - kante) // 2,
                        (roh.width + kante) // 2, (roh.height + kante) // 2)).resize((d_kreis, d_kreis), Image.LANCZOS)
        maske = Image.new("L", (d_kreis * 4, d_kreis * 4), 0)
        ImageDraw.Draw(maske).ellipse([0, 0, d_kreis * 4 - 1, d_kreis * 4 - 1], fill=255)
        kreis = (roh, maske.resize((d_kreis, d_kreis), Image.LANCZOS))
    if name:
        fo = font(SERIF, cqw(P["name"]["breit"]))
        zeilen.append(("name", f"{name}   {leben}" if leben else name, fo, f["tinte"],
                       cqw(P["name"]["breit"]) * P["name"]["sperre"], cqw(P["luft"])))
    if titel:
        fo = font(SERIF_I, cqw(P["titel"]["breit"]))
        zeilen.append(("text", titel, fo, f["tinte"], 0, cqw(P["luft"])))
    if text:
        fo = font(SERIF, cqw(P["text"]["breit"]))
        for z in umbrechen(d, text, fo, innen):
            zeilen.append(("text", z, fo, f["tinte"], 0, hoehe(z, fo) * (P["text"]["zeile"] - 1)))
        zeilen[-1] = (*zeilen[-1][:5], cqw(P["qr"]["luft"]))
    qr_bild = None
    if qr_ziel:
        seite = round(cqw(P["qr"]["breit"]))
        q = segno.make(qr_ziel, error="m")
        puffer = Path("/tmp/repro/_qr.png")
        q.save(puffer, kind="png", scale=20, border=1,
               dark=P["farben"]["tinte"].lstrip("#"), light=P["farben"]["papier"].lstrip("#"))
        qr_bild = Image.open(puffer).convert("RGB").resize((seite, seite), Image.NEAREST)
        zeilen.append(("qr", qr_bild, None, None, 0, cqw(P["luft"])))
    if scan:
        fo = font(SERIF_I, cqw(P["scan"]["breit"]))
        for z in umbrechen(d, scan, fo, innen):
            zeilen.append(("text", z, fo, f["grau"], 0, hoehe(z, fo) * 0.4))
        zeilen[-1] = (*zeilen[-1][:5], cqw(P["marke"]["luft"]))
    if marke:
        fo = font(SERIF, cqw(P["marke"]["breit"]))
        zeilen.append(("sperr", marke.upper(), fo, f["grau"],
                       cqw(P["marke"]["breit"]) * P["marke"]["sperre"], cqw(P["luft"]) * 0.6))
    if recht:
        fo = font(SERIF, cqw(P["recht"]["breit"]))
        zeilen.append(("text", recht, fo, f["leise"], 0, cqw(P["luft"]) * 0.4))
    if nummer:
        fo = font(SERIF, cqw(P["recht"]["breit"]))
        zeilen.append(("text", f"Licență {nummer} · uz personal", fo, f["leise"], 0, 0))

    gesamt = 0
    for art, inhalt, fo, _fill, _sp, danach in zeilen:
        gesamt += (inhalt.height if art == "qr" else hoehe(inhalt, fo)) + danach

    # Jetzt steht fest, wie viel Höhe dem Werk bleibt: der Wunsch aus dem Raster, höchstens
    # aber das, was Kopf, Textblock und Ränder übrig lassen.
    frei = unten - gesamt - bild_oben - cqw(P["bild"]["luftUnten"])
    feld_h = min(cqw(P["bild"]["hoch"] * VERHAELTNIS), max(1, frei))
    feld_b = B - 2 * leiste_px - 2 * cqw(P["rand"]) - 2 * cqw(P["bild"]["randSeite"])
    bild = Image.open(werk_datei).convert("RGB")
    skala = min(feld_b / bild.width, feld_h / bild.height)
    if skala > 1:
        print(f"  ! Quelle zu klein für {format_} bei {dpi} dpi: {bild.size}")
    neu = bild.resize((max(1, round(bild.width * skala)), max(1, round(bild.height * skala))), Image.LANCZOS)
    blatt.paste(neu, (round(mitte - neu.width / 2), round(bild_oben + (feld_h - neu.height) / 2)))

    # Der Block sitzt am unteren Rand; was zwischen Werk und Block bleibt, ist Papier.
    y = unten - gesamt
    for art, inhalt, fo, fill, sperre, danach in zeilen:
        if art == "qr":
            blatt.paste(inhalt, (round(mitte - inhalt.width / 2), round(y)))
            y += inhalt.height + danach
        elif art in ("sperr", "name"):
            if art == "name" and kreis:
                # Kreis und Name zusammen mittig: erst die Gesamtbreite, dann beides setzen.
                bild_k, maske_k = kreis
                breiten = [d.textbbox((0, 0), c, font=fo)[2] for c in inhalt]
                luft = abstaende(inhalt, sperre)
                text_b = sum(breiten) + sum(luft[:-1])
                luft_k = cqw(P["name"]["luft"])
                ganz = bild_k.width + luft_k + text_b
                x0 = mitte - ganz / 2
                zeilen_h = hoehe(inhalt, fo)
                blatt.paste(bild_k, (round(x0), round(y - (bild_k.height - zeilen_h) / 2)), maske_k)
                x = x0 + bild_k.width + luft_k
                for c, b, l in zip(inhalt, breiten, luft):
                    d.text((x, y), c, font=fo, fill=fill)
                    x += b + l
            else:
                gesperrt(d, inhalt, fo, mitte, y, fill, sperre)
            y += hoehe(inhalt, fo) + danach
        else:
            b = d.textbbox((0, 0), inhalt, font=fo)
            d.text((mitte - b[2] / 2, y), inhalt, font=fo, fill=fill)
            y += b[3] + danach

    if str(ziel).lower().endswith(".png"):
        blatt.save(ziel)                      # für Vorschauen und Werbebilder
    else:
        blatt.save(ziel, "PDF", resolution=dpi, quality=95)
    print(f"  {ziel} · {format_} {B}×{H} px @ {dpi} dpi")
    return ziel


if __name__ == "__main__":
    # Ein Probelauf: scratch-druckdatei.py <bild> [format] [ziel]
    bild = sys.argv[1]
    fmt = sys.argv[2] if len(sys.argv) > 2 else "A2"
    ziel = sys.argv[3] if len(sys.argv) > 3 else "/tmp/repro/poster.pdf"
    poster(bild, fmt, kopf="POSTER VIU", name="VINCENT VAN GOGH", leben="1853 – 1890",
           titel="Lan de grâu cu chiparoși, 1889",
           text="Chiparosul stă de veghe la marginea lanului, singurul care nu se apleacă.",
           qr_ziel="https://lakatosbandi.com/vangogh?film=standard",
           scan="Scanează — muzică, iar tabloul îți spune povestea lui, ca la muzeu.",
           recht="Text și design © 2026 lakatosbandi.com · Imagine: domeniu public",
           nummer="LB-TEST01", ziel=ziel)
