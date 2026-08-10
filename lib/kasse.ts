import { AUFLADE_STUFEN } from "@/lib/pricing";

/**
 * DER EINE KASSEN-FUNNEL — die Regeln, nach denen jedes Geschenk bezahlt wird.
 *
 * Owner 10.08.2026: „Der Tunel ab Bezahlung kannst du bei allen gleich machen. Das ist den
 * Kassen Funel." · „Wir haben doch 3 Tage Geburstags funel optimiert. Der gilt."
 *
 * WARUM ES DIESE DATEI GIBT: Bis heute gab es ZWEI Kassen — `components/KissFunnel.tsx`
 * (Kuss · Geburtstag · Tanz · Versprechen) und `components/EinladungBauen.tsx` (Hochzeit ·
 * Urlaub · Gutschein). Beide wussten dasselbe, und beide wussten es getrennt. Am 10.08.2026
 * sind daran an EINEM Tag drei Geldfehler entstanden: Der Knopf der Einladung sagte 15 €,
 * während die Kasse 29,99 € nahm; die Erstattung gab 15 € für ein 9,99-€-Video zurück; der
 * Geburtstag verlangte 4,99 € und buchte 15 € ab. Kein einziger davon war ein Denkfehler —
 * jeder war eine zweite Stelle, die dasselbe wusste.
 *
 * DIE REGELN STEHEN IM SKILL `bezahlung`, die Rechnung steht HIER, das Fenster steht in
 * `components/CI.tsx` (`AufladeWaehler`). Wer eine Kasse baut, holt sich beides — er baut es
 * nicht nach. Dieselbe Hausregel wie bei der Upload-Kachel und der CI-Bibliothek.
 *
 * WAS HIER NICHT STEHT, WEIL ES DEM SERVER GEHÖRT: Ob das Guthaben WIRKLICH reicht,
 * entscheidet `/api/kiss-video-checkout` beim Abbuchen — nicht der Browser (Skill
 * `bezahlung` §3). Alles hier ist Anzeige: Sie soll dem Kunden nie etwas anderes sagen als
 * das, was die Kasse gleich tut.
 */

/**
 * REICHT DAS GUTHABEN? — die eine Frage vor jedem Kaufknopf.
 *
 * Und sie ist die EINZIGE Bedingung für den Aufladewähler (Owner 05.08.2026: „und das kommt,
 * falls er nicht genügend Geld hat"). Wer schon aufgeladen hat, tippt auf kaufen und es
 * passiert — ein Dialog, der auch dem Zahlenden im Weg steht, kostet genau die Kunden, die
 * schon bezahlt haben.
 *
 * `null` heisst „Stand unbekannt" und zählt wie leer: Lieber einmal zu viel gefragt als ein
 * Kauf, der am Server scheitert und den Kunden ohne Erklärung stehen lässt.
 */
export function reichtGuthaben(standCents: number | null | undefined, preisCents: number): boolean {
  return (standCents ?? 0) >= preisCents;
}

/**
 * WELCHE AUFLADESTUFEN DIESEN KAUF WIRKLICH DECKEN (Owner 07.08.2026: „ich habe bezahlt und
 * … bleibt credit auswahl").
 *
 * DAS VORHANDENE GUTHABEN ZÄHLT MIT, und das ist der ganze Punkt: Wer 20 € auf dem Konto hat
 * und eine 29,99-€-Einladung will, braucht 10 € — nicht 30 €. Die Einladung bot bis heute
 * stur `AUFLADE_STUFEN.filter(c => c >= preis)` an und liess sein Geld ungezählt liegen; sie
 * verlangte also eine zweite Aufladung, obwohl die Hälfte längst da war.
 *
 * UND DIE LEITER DARF NIE LEER SEIN. Deckt keine Stufe (das Produkt ist teurer als die
 * höchste Sprosse), steht die ganze Leiter da, statt dass ein Dialog ohne einen einzigen
 * Knopf aufgeht — eine Sackgasse mitten im Bezahlen. Der Filter allein hätte genau das
 * erzeugt, sobald ein Preis über die höchste Stufe steigt.
 */
export function deckendeStufen(standCents: number | null | undefined, preisCents: number): number[] {
  const stand = standCents ?? 0;
  const deckend = AUFLADE_STUFEN.filter(s => stand + s >= preisCents);
  return deckend.length ? [...deckend] : [...AUFLADE_STUFEN];
}

/**
 * WIE VIELE STÜCK EINE STUFE KAUFT — „10 € · 1 🎬".
 *
 * Das Guthaben ist Geld, die Zahl daneben nur seine Übersetzung (Owner 03.08.2026: „schreib
 * dazu wie viele Videos das sind, sonst wirkt das Guthaben wie weg"). 0 heisst: Diese Stufe
 * allein kauft nichts — dann steht keine Zahl daneben, statt einer beleidigenden Null.
 */
export function stueckJeStufe(stufeCents: number, preisCents: number): number {
  if (preisCents <= 0) return 0;
  return Math.floor(stufeCents / preisCents);
}

/**
 * WAS NACH DER AUFLADUNG WEITERLAUFEN MUSS — die zwei Fallen, an denen der Kauf am
 * 05.08.2026 und noch einmal am 07.08.2026 gestorben ist.
 *
 * Es ist die einzige Regel dieses Bausteins, die KEINE Rechnung ist, sondern eine
 * Reihenfolge — sie lebt deshalb im Trichter und nicht hier. Was diese Zeile leistet: Sie
 * benennt die zwei Stellen, die ein Umbau zuerst kaputt macht, und sie tut es an dem Ort, an
 * dem jemand die Kasse nachschlägt. Wer eine neue Kasse baut, sucht nach beiden Namen.
 *
 * 1. `aufladeZiel` — DER WÄHLER MUSS SICH MERKEN, WELCHEN KAUF ER UNTERBROCHEN HAT.
 *    Bild, gleich-Video und nachträgliches Aufwerten sind drei verschiedene Käufe mit drei
 *    verschiedenen Fortsetzungen. Ein nacktes `bezahlen()` nach der Aufladung führt ins
 *    Leere: bezahlt, aber keine Erzeugung, kein Ergebnis (Owner: „die Zahlung geht nicht").
 *
 * 2. `kontoFrisch` — DER WIEDERHOLUNGSKAUF DARF NIE DEN EINGEFRORENEN KONTOSTAND PRÜFEN.
 *    `guthabenCents` ist im Wiederholungsaufruf eine Momentaufnahme von VOR der Aufladung
 *    (React-Closure). Wer sie prüft, öffnet den Wähler gleich noch einmal — Geld auf dem
 *    Konto, Kauf nie ausgeführt. Ob es reicht, entscheidet der Server beim Abbuchen.
 *
 * Im Popup-Weg lautet dieselbe Regel: Stand schreiben, Marke setzen, und den Kauf im
 * NÄCHSTEN Render anstossen (`nachAufladungKaufen` in `KissFunnel`) — nicht synchron aus der
 * Closure des Polls heraus.
 */
export const AUFLADUNG_FORTSETZEN = ["aufladeZiel", "kontoFrisch"] as const;
