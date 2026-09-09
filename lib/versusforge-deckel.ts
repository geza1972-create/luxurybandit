import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { guthabenEinloesen } from "@/lib/versusforge-guthaben";
import { VF_KAUF_AKTIV } from "@/lib/versusforge-schalter";

/**
 * DER DECKEL — DAMIT EIN FEHLER NICHT DIE NACHT KOSTET (Owner 08.09.2026: „ja, das bauen
 * wir", nachdem die Kosten je Durchlauf durchgerechnet waren).
 *
 * Ein vollständiger Durchlauf sind vier Modellaufrufe, davon einer beim grossen Modell —
 * gemessen rund 3.300 Token hinein und 6.400 hinaus, also dieselbe Grössenordnung wie Davids
 * Screening (~4 Cent). Einzeln egal. In einer Schleife nicht.
 *
 * ZWEI DECKEL, WEIL ES ZWEI GEFAHREN GIBT — und das ist der Punkt, an dem ein einzelner
 * Zähler nicht reicht:
 *
 *  · JE GERÄT: Missbrauch. Ein Skript, das die Seite in einer Schleife aufruft, kommt nach
 *    wenigen Durchläufen nicht weiter. Schützt vor dem Einzelnen.
 *  · INSGESAMT JE TAG: der eigene Fehler. Eine kaputte Schleife im eigenen Code hat KEIN
 *    Gerät, das man sperren könnte — sie kommt von überall oder von nirgends. Nur eine
 *    Gesamtgrenze fängt das.
 *
 * GEZÄHLT WERDEN AUFRUFE, DIE GELD KOSTEN, nicht Seitenaufrufe. Wer seinen Plan noch einmal
 * ansieht, zahlt nichts nach.
 *
 * WAS BEIM ANSCHLAG PASSIERT: Der Aufruf wird abgelehnt, mit einem ehrlichen Satz — nicht
 * mit einem Drehrad, das sich nie beruhigt (Hausregel `immer-close-einbauen`). Und der
 * Anschlag wird protokolliert: Ein Deckel, der still greift, sieht aus wie ein Ausfall.
 */

/**
 * EINE GRATIS-ANALYSE JE GERÄT (Owner 08.09.2026: „er hat nur eine Analyse gratis … ich
 * weiss nicht, ob er es riskiert, da Blödsinn einzugeben").
 *
 * VORHER STANDEN HIER FÜNF, und das war eine reine Missbrauchsgrenze. Jetzt ist die Zahl
 * eine Produktentscheidung: Sie steht als Satz auf der Startseite, BEVOR jemand tippt, und
 * genau dort wirkt sie — wer weiss, dass er einen Versuch hat, gibt ihn nicht für einen
 * Spass aus. Der Satz ist der bessere Blödsinn-Filter als jede Sperrliste
 * ([[versusforge-nicht-ueberblocken]]).
 *
 * DIE EINE IST VOLLSTÄNDIG, nicht beschnitten. Sie ist der Beweis („würde er selbst für
 * Amazon eine schlaue Antwort bekommen, dann würde er unser Tool kaufen") — eine Kostprobe
 * mit fehlenden Teilen würde genau das kaputtmachen, wofür sie da ist.
 *
 * DANACH IST ES KEINE WAND, SONDERN EINE TÜR: `grund: "bezahlen"`. Jede weitere Analyse
 * kostet (`VERSUSFORGE_ANALYSE_CENTS`). Ein Deckel, der nur „morgen wieder" sagt, schickt
 * genau den weg, der gerade überzeugt ist.
 */
export const VF_GRATIS_PRO_GERAET = 1;

/**
 * DER KAUFWEG IST GEBAUT, ABER AUS (Owner 08.09.2026: „die Sperre machst du jetzt aber raus.
 * Erst wenn es getestet ist, dann bauen wir das ein").
 *
 * Richtig, und aus dem Grund, an dem heute schon einmal ein halber Tag hing: Mit EINER
 * Gratis-Analyse kann er das Produkt nicht abnehmen. Ein Bezahlweg vor der Abnahme des
 * Kostenlosen sperrt den einzigen Menschen aus, der beides beurteilen kann.
 *
 * WARUM EIN SCHALTER UND KEIN LÖSCHEN: Alles dahinter ist fertig und geprüft — Kasse,
 * Guthaben je Gerät, Sperre gegen doppeltes Einlösen, der Kaufschirm. Herausgelöscht müsste
 * es später neu gebaut werden; hier steht es still und geht mit einer Zeile wieder an.
 *
 * SOLANGE AUS: Es gilt wieder die grosszügige Missbrauchsgrenze `VF_FREI_OHNE_KAUF`, und der
 * Anschlag sagt „morgen geht es weiter" statt ein Angebot zu machen.
 *
 * ZUM ANSCHALTEN: hier auf `true`. Vorher muss der Kaufweg EINMAL OHNE Admin-PIN
 * durchgelaufen sein ([[admin-testet-den-kaufweg-nicht]]) — sonst ist ausgerechnet die
 * Stelle ungeprüft, an der Geld fliesst.
 */
export { VF_KAUF_AKTIV };

/**
 * Die Grenze, solange nicht bezahlt wird: reine Missbrauchsabwehr, kein Produktmerkmal.
 * Fünf je Gerät und Tag — dieselbe Zahl wie bei David.
 */
export const VF_FREI_OHNE_KAUF = 5;

/** Alter Name, damit nichts still bricht. @deprecated `VF_GRATIS_PRO_GERAET` benutzen. */
export const VF_PRO_GERAET = VF_KAUF_AKTIV ? VF_GRATIS_PRO_GERAET : VF_FREI_OHNE_KAUF;

/**
 * 200 INSGESAMT JE TAG. Das ist grosszügig für den heutigen Verkehr (es gibt noch keinen)
 * und trotzdem eine harte Obergrenze: Bei ~4 Cent je Durchlauf sind das rund 8 € am Tag im
 * schlimmsten Fall. Wenn die Seite wirklich läuft, wird die Zahl bewusst erhöht — nicht
 * stillschweigend, sondern hier, mit Datum.
 */
export const VF_PRO_TAG = 200;

type Zaehler = { tag: string; anzahl: number };

const heute = () => new Date().toISOString().slice(0, 10);
const pfad = (schluessel: string) => `versusforge-limit/${schluessel}.json`;

async function lesen(schluessel: string): Promise<number> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(schluessel))}`);
  if (!res.ok) return 0;
  try {
    const z = (await res.json()) as Zaehler;
    return z?.tag === heute() ? Number(z.anzahl) || 0 : 0;
  } catch { return 0; }
}

async function schreiben(schluessel: string, anzahl: number): Promise<void> {
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(schluessel))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ tag: heute(), anzahl } satisfies Zaehler),
  });
}

export type DeckelStand = { erlaubt: boolean; grund?: "bezahlen" | "tag" };

/**
 * Prüft BEIDE Deckel und verbucht den Durchlauf, wenn er durchgeht.
 *
 * Prüfen und Verbuchen in EINEM Schritt, weil sonst zwischen Frage und Antwort ein zweiter
 * Aufruf durchschlüpft. Ganz dicht ist es damit nicht — zwei Anfragen in derselben
 * Millisekunde sehen beide denselben Stand —, und das ist bewusst in Kauf genommen: Ein
 * Zähler mit Sperre wäre langsamer und aufwendiger als der Schaden, den ein einzelner
 * doppelter Durchlauf anrichtet.
 */
export async function deckelPruefen(geraet: string): Promise<DeckelStand> {
  /**
   * AUF DER WERKBANK GILT KEIN DECKEL (Owner 08.09.2026, mit Bild: er sperrte sich bei der
   * eigenen Abnahme aus, nach dem fünften Testlauf).
   *
   * Derselbe Fehler ist bei David am 29.08. schon einmal passiert („ich kann's nicht
   * testen"), und dort wurde er mit einer höheren Zahl übertüncht. Das ist die falsche
   * Antwort: Die richtige Zahl für die Werkbank ist keine Zahl, sondern KEIN Deckel.
   *
   * `process.env.NODE_ENV` wird beim Bauen fest eingesetzt — in der ausgerollten Fassung ist
   * dieser Zweig nicht bloss abgeschaltet, er steht gar nicht im Bündel. Niemand kann ihn von
   * aussen auslösen.
   *
   * GEZÄHLT WIRD TROTZDEM: Sonst weiss man nach einem Tag Bauen nicht, wie viele Läufe es
   * waren — und genau diese Zahl braucht man, um den Deckel für draussen richtig zu setzen.
   */
  const werkbank = process.env.NODE_ENV !== "production";

  const [proGeraet, proTag] = await Promise.all([
    geraet ? lesen(`geraet-${geraet}`) : Promise.resolve(0),
    lesen("gesamt"),
  ]);

  if (!werkbank && proTag >= VF_PRO_TAG) {
    console.warn("[versusforge] Tagesdeckel erreicht:", proTag);
    return { erlaubt: false, grund: "tag" };
  }
  /**
   * GRATIS AUFGEBRAUCHT? DANN ZUERST INS GUTHABEN SEHEN, nicht sofort abweisen.
   *
   * Die Reihenfolge ist der ganze Unterschied: Wer bezahlt hat, darf nie an derselben Wand
   * stehen wie jemand, der es zum sechsten Mal gratis versucht. Der Abzug passiert hier und
   * nicht später — wer zuerst rechnen lässt und danach bucht, verschenkt jeden Durchlauf,
   * bei dem etwas dazwischenkommt.
   */
  const grenze = VF_KAUF_AKTIV ? VF_GRATIS_PRO_GERAET : VF_FREI_OHNE_KAUF;
  if (!werkbank && geraet && proGeraet >= grenze) {
    /* Bezahlte Durchläufe zählen auch bei ausgeschaltetem Kaufweg — wer welche liegen hat
       (etwa aus einem Test), verliert sie durch das Umlegen des Schalters nicht. */
    if (await guthabenEinloesen(geraet)) return { erlaubt: true };
    return { erlaubt: false, grund: VF_KAUF_AKTIV ? "bezahlen" : "tag" };
  }

  await Promise.all([
    geraet ? schreiben(`geraet-${geraet}`, proGeraet + 1) : Promise.resolve(),
    schreiben("gesamt", proTag + 1),
  ]);
  return { erlaubt: true };
}
