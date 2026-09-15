import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantLesen, mandantAnlegen, freierName, type MandantAngaben } from "@/lib/versusforge-mandanten";
import { motivPfad, pruefPfad } from "@/lib/versusforge-moderation";

/**
 * EINE SEITE ZIEHT AUF IHREN RICHTIGEN NAMEN UM (Owner 13.09.2026: „dann kannst du die webseite
 * generieren und wenn er das behalten möchte dann soll er sein name und email angeben und
 * bestätigen wenn nicht wird gelöscht" · „er muss seine name am ende noch mal angeben").
 *
 * ── WARUM ES DAS BRAUCHT ────────────────────────────────────────────────────────────────────
 *
 * Die Seite entsteht, BEVOR wir seinen Namen kennen — er soll sie sehen, ehe er etwas von sich
 * preisgibt. Ihre Adresse ist deshalb zunächst ein Behelf (`artist`, `artist-2` …). Bestätigt er
 * mit Namen und Adresse, muss sie dorthin, wo sie hingehört: auf seinen Namen. Bliebe der
 * Behelf, trüge er für immer eine Adresse, die ihn nicht nennt — auf einer Seite, deren einziger
 * Zweck es ist, ihn zu zeigen.
 *
 * ── GANZ ODER GAR NICHT ─────────────────────────────────────────────────────────────────────
 *
 * Dieselbe Haltung wie beim Löschen (`mandantLoeschen`: „lieber ehrlich scheitern als halb
 * löschen"). Scheitert das Anlegen unter dem neuen Namen, bleibt alles beim Alten und der
 * Aufrufer bekommt `null`. Scheitert ein Bild, wird der neue Eintrag wieder entfernt — sonst
 * stünde eine Seite ohne Werk da, und das Werk läge unter einer Adresse, die niemand kennt.
 *
 * ── DER SCHLÜSSEL REIST MIT ─────────────────────────────────────────────────────────────────
 *
 * Dashboard-Schlüssel und Löschschlüssel bleiben dieselben: Er hat den Link zu seiner Seite
 * bereits gesehen. Neue Schlüssel würden den alten Link entwerten, während er ihn noch offen hat.
 */

/** Was wir bewegen: die Werke und, falls eines in Prüfung liegt, auch das. */
const bildPfade = (mandant: string, nummern: number[]) => [
  ...nummern.map(i => motivPfad(mandant, i < 0 ? "" : String(i))),
  ...nummern.map(i => pruefPfad(mandant, i < 0 ? "" : String(i))),
];

/** Verschiebt eine Datei; `false` heisst „lag nicht da" oder „ging nicht". */
async function datumVerschieben(quelle: string, ziel: string): Promise<boolean> {
  const res = await supabaseFetch("/storage/v1/object/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: quelle, destinationKey: ziel }),
  }).catch(() => null);
  return !!res?.ok;
}

/**
 * ── GEPRÜFT LÖSCHEN, NICHT GEHOFFT (gefunden im Prüflauf 13.09.2026) ────────────────────────
 *
 * HIER STAND `.catch(() => undefined)` OHNE JEDE PRÜFUNG — und der erste echte Umzug hat genau
 * das bestraft: Bilder und neuer Datensatz waren richtig, aber die alte Behelfsadresse blieb
 * liegen. Ursache: Datensatz UND Bildpfade gingen in EINEM Sammel-Löschen weg, darunter die
 * Prüfpfade, die es gar nicht gibt. Fehlt ein Schlüssel, scheitert der ganze Aufruf — und weil
 * niemand hinsah, blieb alles stehen.
 *
 * Ausgerechnet in dieser Datei steht „ganz oder gar nicht" und „lieber ehrlich scheitern".
 * Jetzt hält sie sich auch daran: Der Rückgabewert wird gelesen und ein Fehlschlag gemeldet.
 */
async function eintragLoeschen(pfade: string[]): Promise<boolean> {
  if (!pfade.length) return true;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: pfade }),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("[kuenstler-umzug] Löschen fehlgeschlagen:", res?.status, pfade.join(", "));
    return false;
  }
  return true;
}

/**
 * Zieht `alt` auf einen freien Namen aus `wunsch` um und gibt die neue Kennung zurück.
 * `null` heisst: nichts verändert (oder wieder zurückgenommen).
 */
export async function mandantUmziehen(alt: string, wunsch: string, felder: Partial<MandantAngaben> = {}): Promise<string | null> {
  const m = await mandantLesen(alt);
  if (!m) {
    console.error("[kuenstler-umzug] Alte Seite nicht lesbar:", alt);
    return null;
  }

  const neu = await freierName(wunsch);
  if (!neu || neu === alt) return null;

  /* Der neue Eintrag trägt sofort die bestätigten Angaben — sonst stünde zwischen Anlegen und
     Speichern ein Zustand, in dem die Seite zwar ihm gehört, aber noch niemanden nennt. */
  const kennung = await mandantAnlegen(neu, { ...m, ...felder } as MandantAngaben);
  if (!kennung) {
    console.error("[kuenstler-umzug] Neue Seite nicht angelegt:", alt, "→", neu);
    return null;
  }

  const nummern = Array.isArray(m.werkNummern) && m.werkNummern.length ? m.werkNummern : [-1];
  const quellen = bildPfade(alt, nummern);
  const ziele = bildPfade(kennung, nummern);

  /* MISSLINGT EIN BILD, WIRD ZURÜCKGENOMMEN: Die Prüfpfade dürfen fehlen (meist liegt dort
     nichts), die Werke nicht. Deshalb zählt nur, ob mindestens das erste Werk angekommen ist. */
  /* Was tatsächlich verschoben wurde, wird sich gemerkt: Nur DAS muss an der alten Stelle noch
     weggeräumt werden (ein Verschieben lässt dort nichts zurück) — und nur das darf beim
     Zurücknehmen wieder verschwinden. */
  const verschoben: number[] = [];
  for (let i = 0; i < quellen.length; i++) {
    if (await datumVerschieben(quellen[i], ziele[i])) verschoben.push(i);
  }
  const werkeAngekommen = verschoben.some(i => i < nummern.length);
  if (!werkeAngekommen) {
    console.error("[kuenstler-umzug] Kein Werk verschoben, nehme zurück:", alt, "→", kennung);
    await eintragLoeschen([`versusforge-mandant/${kennung}.json`]);
    await eintragLoeschen(verschoben.map(i => ziele[i]));
    return null;
  }

  /**
   * DER ALTE DATENSATZ GETRENNT VON DEN BILDERN — und das ist kein Schönheitsfehler:
   * Ein Sammel-Löschen scheitert als Ganzes, wenn ein Schlüssel nicht existiert. Genau daran
   * ist der erste Umzug gescheitert (die nie angelegten Prüfpfade rissen den Datensatz mit).
   *
   * Die Bilder sind durch das Verschieben ohnehin weg; hier bleibt nur die JSON-Datei.
   */
  const geraeumt = await eintragLoeschen([`versusforge-mandant/${alt}.json`]);
  if (!geraeumt) {
    console.error("[kuenstler-umzug] Umzug fertig, aber die alte Adresse blieb liegen:", alt);
  }
  /* Auf der Werkbank nachvollziehbar machen, WAS hier passiert ist — die Serverausgabe ist von
     aussen nicht lesbar, und zweimal geraten habe ich heute schon (13.09.2026). */
  if (process.env.NODE_ENV !== "production") {
    console.log(`[kuenstler-umzug] ${alt} → ${kennung} · verschoben ${verschoben.length}/${quellen.length} · alte Adresse geräumt: ${geraeumt}`);
  }
  return kennung;
}
