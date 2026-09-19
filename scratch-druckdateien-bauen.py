"""
ALLE DRUCKDATEIEN BAUEN (Owner 16.09.2026: „mach fertig").

Liest die Auftragsliste, die `scratch-druck-auftraege.mjs` geschrieben hat, und erzeugt je Werk
NEUN Dateien: drei Formate (A3, A2, A1) mal drei Fassungen (ohne Rahmen, Holz, Schwarz) — genau
die Wahl, die der Käufer auf der Seite trifft.

Die Bestellnummer steht erst beim Verkauf fest. Hier entstehen die Vorlagen ohne Nummer; die
Nummer kommt in dem Moment ins Blatt, in dem jemand kauft (siehe `nummer=`).

DIE DUNKLE SCANKANTE FÄLLT WEG: Museumsscans zeigen oft den Rand der Leinwand mit. Sie wird
gemessen und abgeschnitten, nicht geschätzt.
"""
import importlib.util
import json
import os
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None

spec = importlib.util.spec_from_file_location("dd", os.path.join(os.path.dirname(__file__), "scratch-druckdatei.py"))
dd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dd)

AUFTRAEGE = json.load(open("/tmp/repro/druck-auftraege.json"))
ZIEL = "/tmp/repro/pdf"
os.makedirs(ZIEL, exist_ok=True)
FASSUNGEN = ((None, "poster"), ("holz", "posterrama"), ("schwarz", "posterramaneagra"))
# Nur A3 (Owner 16.09.2026: „Der Download ist immer A3") — das ist die Grösse, die man zu Hause
# druckt, ~5 MB und damit per Mail zustellbar. Grösser bestellt man das Poster bei uns.
FORMATE = ("A3",)


def kante_weg(pfad):
    """Die dunkle Leinwandkante des Scans messen und abschneiden. Gibt den Pfad zurück."""
    ziel = pfad.replace("/hd/", "/hd/rein-")
    if os.path.exists(ziel):
        return ziel
    im = Image.open(pfad).convert("RGB")
    w, h = im.size

    def rand(achse, von_oben):
        grenze = (h if achse == "y" else w) // 6
        n = 0
        while n < grenze:
            i = n if von_oben else ((h if achse == "y" else w) - 1 - n)
            lang = w if achse == "y" else h
            werte = sorted(sum(im.getpixel((x, i) if achse == "y" else (i, x))) / 3
                           for x in range(0, lang, max(1, lang // 60)))
            if werte[len(werte) // 2] > 95:
                break
            n += 1
        return n

    oben, unten = rand("y", True), rand("y", False)
    links, rechts = rand("x", True), rand("x", False)
    zu = round(min(w, h) * 0.004)
    if oben + unten + links + rechts == 0 and zu == 0:
        return pfad
    im.crop((links + zu, oben + zu, w - rechts - zu, h - unten - zu)).save(ziel, quality=95)
    return ziel


nur = sys.argv[1] if len(sys.argv) > 1 else ""
gebaut = 0
for a in AUFTRAEGE:
    if nur and not f"{a['mandant']}/{a['nr']}".startswith(nur):
        continue
    quelle = kante_weg(a["quelle"])
    for rahmen, material in FASSUNGEN:
        for fmt in FORMATE:
            ziel = f"{ZIEL}/{a['mandant']}-{a['nr']}-{material}-{fmt}.pdf"
            if os.path.exists(ziel):
                continue
            dd.poster(quelle, fmt, rahmen=rahmen, kopf=a["kopf"], profil=a.get("profil", ""),
                      name=a["name"], leben=a["leben"],
                      titel=a["titel"], text=a["text"], qr_ziel=a["qr"], scan=a["scan"],
                      recht=a["recht"], nummer="", ziel=ziel)
            gebaut += 1
print(f"fertig — {gebaut} Dateien in {ZIEL}")
