#!/bin/bash
# DER ANZEIGEN-CLIP-GENERATOR — Videos aus Katalog-Bildern, OHNE AI-Anbieter (Owner
# 13.08.2026: „ja mach das", nach dem Angebot „Ad-Videos aus der Galerie ohne
# Pixverse-Kosten"). Reines ffmpeg + Pillow, deterministisch, 0 € je Render.
#
# Aufbau des Clips (1080×1920, 9:16 für Meta/Reels):
#   je Bild ~2,4 s Ken-Burns-Zoom, weiche Überblendungen, unten der GOLD-CTA auf
#   dunkler Leiste, am Ende 1,8 s Abbinder: LUXURYBANDIT / luxurybandit.com auf der
#   dunklen Hausfläche (#0d0b0a, Gold #f6cf51 — die CI-Farben, Skill ci-design).
#
# TEXT ALS PNG-AUFLAGE, NICHT drawtext: das Homebrew-ffmpeg dieses Rechners ist ohne
# freetype gebaut (GEMESSEN 13.08.2026: „No such filter: 'drawtext'") — Pillow malt die
# beiden Auflagen (CTA-Leiste, Abbinder), ffmpeg legt sie nur noch darüber.
#
# Aufruf:
#   scripts/ad-clip.sh AUSGABE.mp4 "CTA-Zeile" bild1.jpg bild2.jpg [bild3.jpg …]
# Für eine SERIE (ein Clip je Look) das Skript in einer Schleife aufrufen — ein
# Template, dreissig Looks, dreissig Clips.
set -euo pipefail

OUT="$1"; CTA="$2"; shift 2
BILDER=("$@")
[ ${#BILDER[@]} -ge 2 ] || { echo "mindestens 2 Bilder"; exit 1; }

DAUER=2.4
BLENDE=0.5
FPS=30

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 0) Die zwei Text-Auflagen (CTA-Leiste transparent, Abbinder als volle Fläche).
python3 - "$TMP" "$CTA" << 'PY'
import sys
from PIL import Image, ImageDraw, ImageFont
tmp, cta = sys.argv[1], sys.argv[2]
GOLD, DUNKEL, WEISS = (246, 207, 81, 255), (13, 11, 10, 255), (255, 255, 255, 255)
F = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# CTA-Leiste: 1080×260, dunkle Halbfläche, goldene Zeile mittig.
leiste = Image.new("RGBA", (1080, 260), (13, 11, 10, 184))
d = ImageDraw.Draw(leiste)
f = ImageFont.truetype(F, 56)
w = d.textlength(cta, font=f)
d.text(((1080 - w) / 2, 95), cta, font=f, fill=GOLD)
leiste.save(f"{tmp}/cta.png")

# Abbinder: volle Fläche, Marke gross, Adresse darunter.
ende = Image.new("RGBA", (1080, 1920), DUNKEL)
d = ImageDraw.Draw(ende)
f1, f2 = ImageFont.truetype(F, 92), ImageFont.truetype(F, 44)
for text, f, y, farbe in [("LUXURYBANDIT", f1, 860, GOLD), ("luxurybandit.com", f2, 1000, WEISS)]:
    w = d.textlength(text, font=f)
    d.text(((1080 - w) / 2, y), text, font=f, fill=farbe)
ende.convert("RGB").save(f"{tmp}/ende.png")
PY

# 1) Je EINGABE ein Segment. BILDER bekommen den Ken-Burns-Zoom; VIDEOS (.mp4/.mov/.webm)
#    werden als ECHTER 2,4-s-AusschNITT geschnitten — das sind die fertigen Try-on-Videos
#    aus der Galerie: KI-Bewegung, die schon bezahlt ist (Owner 13.08.2026: „du kannst aber
#    keine KI animationen machen" — NEU erzeugen nein, aber vorhandene gehören in den Clip).
i=0
for B in "${BILDER[@]}"; do
  case "$B" in
    *.mp4|*.mov|*.webm|*.MP4|*.MOV)
      ffmpeg -y -loglevel error -ss 0 -t "$DAUER" -i "$B" -filter_complex "
        scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=$FPS,format=yuv420p" \
        -an "$TMP/seg$i.mp4" ;;
    *)
      ffmpeg -y -loglevel error -loop 1 -t "$DAUER" -i "$B" -filter_complex "
        scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,
        zoompan=z='1+0.08*on/($DAUER*$FPS)':d=$DAUER*$FPS:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=$FPS,
        format=yuv420p" "$TMP/seg$i.mp4" ;;
  esac
  i=$((i+1))
done
N=$i

# 2) Abbinder-Segment aus dem PNG.
ffmpeg -y -loglevel error -loop 1 -t 1.8 -i "$TMP/ende.png" -vf "fps=$FPS,format=yuv420p" "$TMP/ende.mp4"

# 3) Verketten mit xfade, dann die CTA-Leiste über die Bild-Strecke legen
#    (`enable` blendet sie vor dem Abbinder aus).
EIN=""; for ((k=0; k<N; k++)); do EIN+=" -i $TMP/seg$k.mp4"; done
EIN+=" -i $TMP/ende.mp4 -i $TMP/cta.png"
FC=""
LETZTE="[0:v]"
OFFSET=0
for ((k=1; k<=N; k++)); do
  OFFSET=$(python3 -c "print(round($OFFSET + $DAUER - $BLENDE, 3))")
  FC+="${LETZTE}[$k:v]xfade=transition=fade:duration=$BLENDE:offset=$OFFSET[v$k];"
  LETZTE="[v$k]"
done
BIS=$(python3 -c "print(round($N * ($DAUER - $BLENDE), 3))")
FC+="${LETZTE}[$((N+1)):v]overlay=x=0:y=main_h-overlay_h:enable='lt(t,$BIS)'[vout]"

ffmpeg -y -loglevel error $EIN -filter_complex "$FC" -map "[vout]" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$TMP/stumm.mp4"

# 5) MUSIK (Owner 13.08.2026: „Und musik auch nicht." — doch): Umgebungsvariable
#    MUSIK=/pfad/zum/track.mp3 mischt einen der lizenzierten Haus-Tracks aus public/
#    darunter — auf Cliplänge geschnitten, mit weichem Ausklang (1,2 s).
if [ -n "${MUSIK:-}" ] && [ -f "${MUSIK}" ]; then
  GES=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$TMP/stumm.mp4")
  ST=$(python3 -c "print(max(0, round(float('$GES') - 1.2, 3)))")
  ffmpeg -y -loglevel error -i "$TMP/stumm.mp4" -i "$MUSIK" \
    -filter_complex "[1:a]atrim=0:$GES,afade=t=out:st=$ST:d=1.2,volume=0.9[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -shortest "$OUT"
else
  mv "$TMP/stumm.mp4" "$OUT"
fi
echo "fertig: $OUT"
