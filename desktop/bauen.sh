#!/bin/zsh
# BAUT „Werbefilm Studio.app" — ein Aufruf, keine Xcode-Projektdatei.
#
# WARUM OHNE XCODE-PROJEKT: Die App hat eine Quelldatei und keine Abhängigkeiten. Ein .xcodeproj
# wäre eine zweite Wahrheit, die bei jedem Umbau mitgepflegt werden müsste. `swiftc` reicht.
#
# WARUM EIN BÜNDEL UND KEIN NACKTES PROGRAMM: macOS fragt Kamera- und Mikrofon-Erlaubnis nur für
# eine App MIT Info.plist und Verwendungszweck — ein nacktes Programm stürzt beim Kamerazugriff
# ohne Nachfrage ab.
set -e
cd "$(dirname "$0")"
ZIEL="build/Werbefilm Studio.app"
rm -rf "$ZIEL"
mkdir -p "$ZIEL/Contents/MacOS" "$ZIEL/Contents/Resources"

cat > "$ZIEL/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Werbefilm Studio</string>
  <key>CFBundleDisplayName</key><string>Werbefilm Studio</string>
  <key>CFBundleIdentifier</key><string>com.lakatosbandi.werbefilmstudio</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleExecutable</key><string>WerbefilmStudio</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>NSCameraUsageDescription</key><string>Damit du dich im Kreis siehst, während du die Seite erklärst.</string>
  <key>NSMicrophoneUsageDescription</key><string>Damit deine Stimme im Werbefilm ist.</string>
  <key>NSScreenCaptureUsageDescription</key><string>Damit der Bildschirm im Handyformat aufgenommen wird.</string>
</dict></plist>
PLIST

# Das Symbol (erzeugt aus quelle/icon.iconset) — ohne es sieht die App in der Liste der
# Systemeinstellungen wie ein Platzhalter aus, und genau daran erkennt man Bastelware.
cp quelle/AppIcon.icns "$ZIEL/Contents/Resources/AppIcon.icns"

swiftc -O -target arm64-apple-macos13 \
  -framework AppKit -framework AVFoundation \
  quelle/main.swift -o "$ZIEL/Contents/MacOS/WerbefilmStudio"

# ── EINE SIGNATUR, DIE NEUBAUTEN ÜBERLEBT ───────────────────────────────────────────────────
# Das eigentliche Problem der letzten Runde (Owner 18.09.2026: „wieso öffnet sich das immer?" ·
# „und der Knopf geht nicht"): AD-HOC signiert (`--sign -`) ist jeder Neubau für macOS eine
# ANDERE App — die Erlaubnis für die Bildschirmaufnahme hängt am Prüfwert des Programms und war
# nach jedem Bauen weg. Ergebnis: bei jedem Start die Systemeinstellungen und ein Knopf, der nur
# nach Erlaubnis fragen konnte.
#
# Mit einem eigenen (selbst ausgestellten) Zertifikat hängt die Erlaubnis am ZERTIFIKAT, nicht am
# Prüfwert. Es liegt im Schlüsselbund (erzeugt in desktop/signatur, einmalig) und heisst
# „Werbefilm Studio Dev". Fehlt es, wird weiter ad-hoc signiert — dann baut es überall, nur die
# Erlaubnis muss man wieder setzen.
IDENT="Werbefilm Studio Dev"
if security find-identity -v -p codesigning 2>/dev/null | grep -q "$IDENT"; then
  codesign --force --sign "$IDENT" --identifier com.lakatosbandi.werbefilmstudio --timestamp=none "$ZIEL" >/dev/null 2>&1 \
    && echo "signiert mit: $IDENT" \
    || echo "Signieren mit $IDENT ging nicht — es bleibt ad-hoc."
else
  codesign --force --sign - --identifier com.lakatosbandi.werbefilmstudio "$ZIEL" >/dev/null 2>&1 || true
  echo "kein eigenes Zertifikat gefunden — ad-hoc signiert (Erlaubnis muss nach jedem Bauen neu)."
fi

# ── SIE ZIEHT ZU DEN PROGRAMMEN ─────────────────────────────────────────────────────────────
# `~/Applications` und nicht `/Applications`: Dort darf der Benutzer ohne Passwort schreiben, die
# App erscheint trotzdem in Launchpad und Spotlight. Das `build`-Verzeichnis ist die Werkstatt,
# nicht der Platz, von dem man täglich startet — und eine App, die aus einem Projektordner
# gestartet wird, verliert ihre Erlaubnis, sobald der Ordner umzieht.
INSTALL="$HOME/Applications/Werbefilm Studio.app"
mkdir -p "$HOME/Applications"
rm -rf "$INSTALL"
cp -R "$ZIEL" "$INSTALL"
# Nach dem Kopieren neu signieren: Die Erlaubnis hängt an Signatur UND Ort.
if security find-identity -v -p codesigning 2>/dev/null | grep -q "$IDENT"; then
  codesign --force --sign "$IDENT" --identifier com.lakatosbandi.werbefilmstudio --timestamp=none "$INSTALL" >/dev/null 2>&1 || true
else
  codesign --force --sign - --identifier com.lakatosbandi.werbefilmstudio "$INSTALL" >/dev/null 2>&1 || true
fi
# Damit der Finder das neue Symbol sofort zeigt und nicht das gemerkte alte.
touch "$INSTALL"

echo "fertig: $INSTALL"
