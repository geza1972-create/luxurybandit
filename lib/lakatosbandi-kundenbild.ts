import { randomBytes } from "node:crypto";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";

/**
 * DAS BILD DES KUNDEN ÜBERLEBT DEN KAUF (Owner 18.09.2026: „auch das Bild muss dann an die Wand"
 * · „kann ich das als PDF runterladen?" · „wenn das Bild nicht generiert ist, dann darf man keine
 * Lizenz verlangen").
 *
 * ── WARUM ES ÜBERHAUPT EINE ABLAGE BRAUCHT ──────────────────────────────────────────────────
 *
 * Bis hierher lebte das Bild nur im Browser (Merker in `PosterDeinBild`, bewusst so: „wenn er
 * rausgeht von der Seite, dann ist das Bild weg"). Für das Blatt auf dem Schirm reicht das. Nur:
 * Zwischen dem Klick auf „Kaufen" und der Druckdatei liegt Stripe — der Browser ist dort nicht
 * mehr beteiligt (Memory `paid-jobs-must-survive-the-browser`). Wer sein Foto einsetzt und dann
 * kauft, bekam deshalb das Werk des Künstlers gedruckt.
 *
 * Also legt das Bild GENAU EINEN Schritt vor der Kasse hier ab und bekommt eine Kennung. Wer
 * abbricht, hat nichts hochgeladen (Memory `kein-token-fuer-abbrecher`): Der Upload hängt am
 * Kaufknopf, nicht am Zuschnitt.
 *
 * ── DIE KENNUNG IST DER BEWEIS, NICHT DAS WORT DES BROWSERS ─────────────────────────────────
 *
 * Neben dem Bild liegt ein winziger Zettel: aus welchem Werk, von welchem Künstler — und ob es
 * IM STIL ERZEUGT wurde (`stil`). Diesen Zettel schreibt nur der Server: `stil: true` setzt
 * allein die Erzeugungs-Route, nachdem das Modell gelaufen ist.
 *
 * Daran hängt Geld (Owner 18.09.2026: „1 Euro bekommt der Künstler"): erzeugt = 10 € Lizenz,
 * nur sein eigenes Foto = 1 € Vermittlung. Käme die Auskunft aus dem Browser, könnte jeder
 * „nicht erzeugt" behaupten und neun Euro sparen — Skill `bezahlung`, Regel 3. Die Kennung kann
 * er nicht erfinden: Sie ist zufällig und wird gegen die Ablage geprüft.
 */

/** Wo die Bilder liegen — eigener Zweig, damit sie nie mit Werken verwechselt werden. */
const ORDNER = "lakatosbandi-kundenbild";

export type KundenbildZettel = {
  mandant: string;
  werk: string;
  /** IM STIL DES KÜNSTLERS ERZEUGT — setzt nur die Erzeugungs-Route. */
  stil: boolean;
  am: string;
  /**
   * ── SEINE ZEILEN, GESPEICHERT (Owner 19.09.2026: „dann wird es gespeichert") ──────────────
   *
   * Titel und Satz auf dem Blatt lebten bisher nur im Browser (Owner 17.09.2026: „wenn er
   * rausgeht von der Seite, dann ist das Bild weg"). Für ein Blatt, das man ansieht und wieder
   * zumacht, war das richtig. Für ein BEZAHLTES Blatt ist es falsch: Er zahlt zehn Euro, tippt
   * seinen Namen hinein, lädt die Datei — und in der Datei steht der Name des Künstlers, weil
   * sie serverseitig gebaut wird und von seinen Worten nichts weiss.
   *
   * Jetzt reisen sie mit dem Bild. Leer heisst weiterhin: die Worte des Künstlers gelten.
   */
  titel?: string;
  satz?: string;
  /**
   * ── DIE ADRESSE DES KÄUFERS (Owner 19.09.2026: „die müssen hier gespeichert werden mit E-Mail
   * und noch Mail senden an die Kunden, falls sie verloren gehen oder sie nicht bekommen") ────
   *
   * Sie stand bisher nur in dem einen Aufruf, der die Mail verschickte. Ging die Mail im Spam
   * unter oder tippte er sich bei der Adresse, war der Käufer weg — und der Owner hatte nichts
   * in der Hand, um es zu richten.
   *
   * Jetzt liegt sie am Kauf. Damit lässt sich dieselbe Mail jederzeit noch einmal schicken.
   */
  mail?: string;
};

/** Eine Kennung, wie sie hier vergeben wird: 24 Zeichen aus dem Zufall, sonst nichts. */
export const istKundenbildId = (id: string) => /^[0-9a-f]{24}$/.test(id);

const bildPfad = (id: string) => `${ORDNER}/${id}.jpg`;
const zettelPfad = (id: string) => `${ORDNER}/${id}.json`;

/**
 * Legt ein Bild ab und gibt seine Kennung zurück — `null`, wenn die Ablage nicht mitspielt.
 *
 * Das Bild kommt als Daten-URI (so liegt es im Browser und so gibt es die Erzeugung zurück) oder
 * als Bytes. Alles andere als JPEG/PNG/WebP wird abgewiesen: Was hier liegt, geht später in eine
 * PDF-Druckdatei.
 */
export async function kundenbildAblegen(
  bild: string | Uint8Array,
  zettel: Omit<KundenbildZettel, "am">,
): Promise<string | null> {
  let bytes: Uint8Array;
  if (typeof bild === "string") {
    const treffer = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(bild.trim());
    if (!treffer) return null;
    bytes = new Uint8Array(Buffer.from(treffer[2], "base64"));
  } else {
    bytes = bild;
  }
  /* Ein Poster braucht keine 20 MB, und eine offene Route braucht eine Obergrenze. */
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) return null;

  const id = randomBytes(12).toString("hex");
  const eins = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(bildPfad(id))}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: Buffer.from(bytes) as unknown as BodyInit,
  });
  if (!eins.ok) {
    console.warn("[kundenbild] Bild nicht abgelegt:", eins.status, await eins.text().catch(() => ""));
    return null;
  }
  const zwei = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zettelPfad(id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ ...zettel, am: new Date().toISOString() } satisfies KundenbildZettel),
  });
  if (!zwei.ok) {
    console.warn("[kundenbild] Zettel nicht abgelegt:", zwei.status);
    return null;
  }
  return id;
}

/** Nur der Zettel — für die Kasse, die den Preis daraus rechnet, aber kein Bild braucht. */
/**
 * SEINE ZEILEN NACHTRAGEN — nach der Erzeugung, wenn er sie auf dem Blatt geändert hat.
 *
 * Nur Titel und Satz; alles andere am Zettel (Mandant, Werk, `stil`) bleibt, wie es war. Sonst
 * könnte ein Browser aus einem hochgeladenen Foto ein „erzeugtes" machen und damit die Datei
 * gratis abholen.
 */
export async function kundenbildTextSetzen(id: string, titel: string, satz: string): Promise<boolean> {
  const alt = await kundenbildZettel(id);
  if (!alt) return false;
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zettelPfad(id))}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true", "cache-control": "no-cache, max-age=0" },
    body: JSON.stringify({ ...alt, titel: titel.slice(0, 120), satz: satz.slice(0, 400) }),
  });
  return res.ok;
}

export async function kundenbildZettel(id: string): Promise<KundenbildZettel | null> {
  if (!istKundenbildId(id)) return null;
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(zettelPfad(id))}`);
  if (!r.ok) return null;
  return (await r.json().catch(() => null)) as KundenbildZettel | null;
}

/** Bild und Zettel — für die Druckdatei. */
export async function kundenbildLesen(id: string): Promise<{ bild: Uint8Array; zettel: KundenbildZettel } | null> {
  const zettel = await kundenbildZettel(id);
  if (!zettel) return null;
  const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(bildPfad(id))}`);
  if (!r.ok) return null;
  return { bild: new Uint8Array(await r.arrayBuffer()), zettel };
}
