/**
 * ── EINE SPUR FÜR DAS GANZE PORTAL (Owner 18.09.2026: „Logo auch nach links") ────────────────
 *
 * Kopf, Fuss, Startseite und Künstlerseite hatten jeder ihre eigene `max-w-[1120px]`-Zeile.
 * Solange alle dieselbe Zahl trugen, fiel das nicht auf. In dem Moment, in dem die Startseite
 * am Rechner breiter wurde, stand das Logo plötzlich 200 px weiter innen als die Überschrift
 * darunter — vier Kopien derselben Entscheidung, von denen eine geändert wurde.
 *
 * Jetzt steht die Zahl EINMAL. Wer die Spur ändert, ändert sie überall, und nichts kann mehr
 * auseinanderlaufen.
 *
 * `xl` (ab 1280 px) ist die Schwelle: Darunter bleibt 1120 px die Lesebreite, darüber darf die
 * Wand aus Postern den Schirm nutzen. Texte innerhalb behalten ihre eigenen Grenzen —
 * eine Zeile über 1500 px liest niemand.
 *
 * DIE DATEI LIEGT IN `components/`, NICHT IN `lib/`: Tailwind durchsucht nur `app/` und
 * `components/` nach Klassennamen (tailwind.config.ts). In `lib/` würde die Klasse nie gebaut.
 */
export const SPUR = "mx-auto w-full max-w-[1120px] xl:max-w-[1560px]";

/**
 * ── WIE BREIT EINE KACHEL IN EINER WISCH-REIHE IST (Owner 18.09.2026: „aber 3 sollen wie jetzt
 * auf dem Bildschirm passen") ────────────────────────────────────────────────────────────────
 *
 * Aus der Spur gerechnet, nicht in festen Pixeln: zwei Kacheln plus eine Lücke am Telefon, drei
 * plus zwei Lücken ab Tablet. Eine feste Breite („440 px") passt auf einem Schirm und auf dem
 * nächsten nicht mehr.
 *
 * DIE ZAHLEN GEHÖREN ZU `gap-x-4` (1rem) UND `sm:gap-x-6` (1.5rem) in `PortalReihe`. Ändert
 * sich dort der Abstand, ändert sich diese Rechnung mit.
 *
 * DIE UNTERSTRICHE SIND PFLICHT: `calc(100%-1rem)` ist ungültiges CSS — um das Minus müssen
 * Leerzeichen stehen. Im Klassennamen darf keines stehen, also schreibt Tailwind `_` dorthin.
 *
 * ── UND WARUM DIESE ZEILE NICHT IN `PortalReihe.tsx` STEHT (18.09.2026 gemessen) ────────────
 *
 * `PortalReihe` ist eine `"use client"`-Datei. Importiert eine SERVER-Komponente eine Konstante
 * von dort, bekommt sie nicht den String, sondern einen Platzhalter — der stand danach wörtlich
 * als Klassenname im HTML („Attempted to call KACHEL() from the server…"), und jede Kachel war
 * 0 px breit. Eine geteilte Konstante gehört in eine Datei ohne `"use client"`.
 */
/**
 * ── EIN ANGESCHNITTENES BLATT AM RAND (Owner 18.09.2026: „man sieht nicht dass es ein Slider
 * ist, du musst ein Poster rechts abschneiden") ──────────────────────────────────────────────
 *
 * Passten genau drei in die Spur, sah die Reihe aus wie ein Raster mit drei Kacheln — nichts
 * verriet, dass rechts noch siebzehn liegen. Ein angeschnittenes viertes Blatt sagt das ohne
 * ein Wort: Da geht es weiter.
 *
 * Deshalb wird nicht durch 3 geteilt, sondern durch 3,3 — drei ganze Blätter und ein knappes
 * Drittel des vierten. Am Telefon dasselbe mit 2,25 statt 2.
 */
export const KACHEL = "shrink-0 snap-start w-[calc((100%_-_1rem)/2.25)] sm:w-[calc((100%_-_3rem)/3.3)]";
