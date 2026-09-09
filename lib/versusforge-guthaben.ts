import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * BEZAHLTE DURCHLÄUFE JE GERÄT (Owner 08.09.2026: „Zahlt er was für die Analyse? Ich sage
 * ja. Und zwar 9,99" · gewählt: „einfach eine weitere Analyse").
 *
 * AM GERÄT, NICHT AN EINER ADRESSE — und das ist eine bewusste Abweichung von der Hausregel
 * [[guthaben-haengt-an-einer-adresse]]. Der Grund: Dieser Trichter fragt die E-Mail erst GANZ
 * am Schluss, nach dem Plan. Ein Konto vor der zweiten Analyse zu verlangen, wäre genau die
 * Registrierung, die der Owner überall herausgeworfen hat.
 *
 * WAS DAS KOSTET, offen gesagt: Wer den Browser wechselt, verliert seine bezahlte Analyse.
 * Bei 9,99 und einem Kauf, der Sekunden später eingelöst wird, ist das vertretbar; bei einem
 * Betrag wie den 299 € wäre es das nicht — dort gehört ein Konto davor.
 *
 * GUTSCHREIBEN DARF NUR DER SERVER, nach Rückfrage bei Stripe. Käme die Gutschrift aus dem
 * Browser, wäre der Preis eine Bitte.
 */

type Stand = { offen: number; zuletzt: string };

const pfad = (geraet: string) => `versusforge-guthaben/${encodeURIComponent(geraet).slice(0, 120)}.json`;

export async function guthabenLesen(geraet: string): Promise<number> {
  if (!geraet) return 0;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(geraet))}`);
  if (!res.ok) return 0;
  try {
    const s = (await res.json()) as Stand;
    return Math.max(0, Number(s?.offen) || 0);
  } catch { return 0; }
}

async function schreiben(geraet: string, offen: number): Promise<void> {
  await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad(geraet))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify({ offen: Math.max(0, offen), zuletzt: new Date().toISOString() } satisfies Stand),
  });
}

/** Nach bestätigter Zahlung: ein Durchlauf mehr. */
export async function guthabenDazu(geraet: string, anzahl = 1): Promise<number> {
  const neu = (await guthabenLesen(geraet)) + Math.max(1, anzahl);
  await schreiben(geraet, neu);
  return neu;
}

/**
 * Einen bezahlten Durchlauf verbrauchen. Gibt zurück, ob es einen gab.
 *
 * ERST ABZIEHEN, DANN ARBEITEN — nie umgekehrt. Wer zuerst rechnet und danach bucht,
 * verschenkt jeden Durchlauf, bei dem etwas dazwischenkommt.
 */
export async function guthabenEinloesen(geraet: string): Promise<boolean> {
  const offen = await guthabenLesen(geraet);
  if (offen < 1) return false;
  await schreiben(geraet, offen - 1);
  return true;
}
