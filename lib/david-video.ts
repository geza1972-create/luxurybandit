/**
 * DAS DAVID-VIDEO — EINE QUELLE FÜR KARTE UND KACHEL.
 *
 * Dauerregel `landingpage-video-ist-kachel-video` (Owner 07.08.2026): Die Karte auf der
 * Landingpage und die Kachel im Themen-Katalog zeigen DASSELBE Video mit DEMSELBEN
 * Standbild — sonst verspricht die Startseite etwas anderes als die Seite dahinter. Beide
 * holen es hier, wie Hochzeit (`lib/hochzeit-video.ts`) und Geburtstag es tun.
 *
 * HERKUNFT: seine Landingpage-Fassung ohne Schluss-CTA (Owner 28.08.2026: „ich gebe es dir
 * neu ohne CTA"), von 720×1280 unten auf 720×1080 geschnitten (sein Wort: „das kannst du
 * unten schneiden") und auf 2,7 MB gerechnet, `moov` vorn (Faststart-Pflicht, Memory
 * `video-faststart-pflicht`).
 *
 * 720×1080 = GENAU 2:3 — deshalb steht das Verhältnis hier gleich mit dabei: Wer das Video
 * einbaut, braucht es, und geraten wird an dieser Stelle nicht (Landingpage.md §3).
 * Beschnitten werden darf der Clip nicht mehr: Untertitel und die drei Merkmal-Zeichen der
 * Schlusstafel enden dicht über der Unterkante.
 */
export const DAVID_VIDEO = "/Lebenslauf/david-ads.mp4";
export const DAVID_POSTER = "/Lebenslauf/david-ads.jpg";

/**
 * DAS SCHAUBILD AUF DER LANDINGPAGE (Owner 29.08.2026) — die drei Schritte in einem Blick.
 * EINE Konstante wie beim Video, damit der Pfad nie an zwei Stellen auseinanderläuft
 * (Dauerregel [[landingpage-video-ist-kachel-video]]).
 */
export const DAVID_SCHAUBILD = "/Lebenslauf/david-so-arbeitet.jpg";

/**
 * STEHT DIE DATEI SCHON DA? (Owner 29.08.2026: „was ist das?" — auf der Seite stand der
 * Ersatztext des Bildes, weil die Datei noch fehlte.)
 *
 * WARUM EIN SCHALTER UND KEINE PRÜFUNG IM DATEISYSTEM: Auf Vercel liegen die Dateien aus
 * `public/` beim Auslieferer, nicht zwingend im Server-Prozess — eine `existsSync`-Prüfung
 * könnte den Block in der Produktion ausblenden, obwohl das Bild einwandfrei lädt. Ein
 * Schalter lügt nie: Er steht auf `false`, bis die Datei wirklich eingecheckt ist.
 *
 * ZUM UMLEGEN: Datei nach `public/Lebenslauf/david-so-arbeitet.jpg` legen, hier `true`.
 */
export const DAVID_SCHAUBILD_DA = false;

/**
 * SEIN GESICHT — an fünf Stellen gebraucht (Trichter, Bericht, Landingpage), bis heute an
 * jeder Stelle neu getippt. Eine Konstante, damit ein neues Porträt nicht viermal
 * ausgetauscht werden muss und dabei einmal vergessen wird.
 */
export const DAVID_PORTRAIT = "/Lebenslauf/david-portrait.jpg";
export const DAVID_VERHAELTNIS = "aspect-[2/3]";

/**
 * DAS VIDEO ZUR VIDEO-BEWERBUNG (Owner 28.08.2026: „ich gebe dir doch ein Video mit der
 * umwandung in dem Video drin").
 *
 * EIN Clip, in dem die Verwandlung selbst zu sehen ist: Die Bewerberin nimmt sich am
 * Küchentisch auf, und daraus wird die Aufnahme im Business-Look. Kein Vorher/Nachher-Paar
 * nebeneinander — das Video zeigt den Übergang, und genau der ist das Argument.
 *
 * OHNE KARTE (Owner, im selben Zug: „hier machen wir die card nicht. einfach nur das
 * video"). Solange hier nichts steht, zeigt die Seite den bisherigen Beispiel-Clip.
 *
 * Geliefert am 28.08.2026 als `Cora-Final.mp4` (12,8 MB, 46,5 s): auf 3,5 MB gerechnet,
 * `moov` nach vorn (Hausregel [[video-faststart-pflicht]] — sonst hängt der Clip, lokal wie
 * online) und am Ende um eine halbe Sekunde gekürzt.
 *
 * DAS KÜRZEN IST KEIN GESCHMACK, ES IST GEMESSEN: Ab 46,2 s fällt die Bildhelligkeit auf 12
 * von 255 — der Clip blendet nach Schwarz aus. Genau dieser Fehler ist dem Owner schon beim
 * Landingpage-Video aufgefallen („wieso endet mein video mit einem grauen screen?"). Ein
 * Video, das mit einer schwarzen Fläche stehen bleibt, sieht aus wie ein Ladefehler.
 *
 * DER NAMENSKONFLIKT IST WEG: Im Video sagt sie „Ich bin Cora Vogel" — genauso heisst das
 * Muster-Dossier daneben (lib/david-muster.ts). Davor liefen hier zwei Namen gegeneinander
 * („Anna" im Video, „Oana Müller" im Lebenslauf); das Beispiel zerfiel beim ersten
 * Abspielen. Wer den Clip je austauscht: erst prüfen, welcher Name gesprochen wird.
 */
export const BEWERBUNG_VIDEO = "/Lebenslauf/cora-bewerbung.mp4";
export const BEWERBUNG_VIDEO_POSTER = "/Lebenslauf/cora-bewerbung-poster.jpg";
