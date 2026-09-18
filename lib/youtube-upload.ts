/**
 * FILME AUF DEN YOUTUBE-KANAL DES HAUSES (Owner 17.09.2026: „und dort die Videos speichern" → „b").
 *
 * ── WAS HIER PASSIERT ───────────────────────────────────────────────────────────────────────
 *
 * Der Künstler nimmt im Dashboard auf, die Datei geht an `api/portal-stimme`, und von dort
 * zusätzlich hierher: Zugriffstoken holen, Upload-Platz anfordern, Bytes schicken, Kennung
 * zurückgeben. Die Kennung landet am Werk (`werkInfo[nr].youtube`), und das Fenster hinter dem
 * QR-Code spielt von dort.
 *
 * ── DREI WERTE, DIE NUR DER OWNER KENNT ─────────────────────────────────────────────────────
 *
 * `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN`. Sie stehen in der Umgebung, nie im
 * Quelltext und nie in einem Chatverlauf. Fehlt einer davon, tut diese Datei nichts und meldet
 * es — der Upload in unsere eigene Ablage läuft davon unberührt weiter.
 *
 * ── UNGELISTET, NICHT ÖFFENTLICH ────────────────────────────────────────────────────────────
 *
 * Die Filme gehören zu einem Poster, nicht in einen Kanalfeed. „unlisted" heisst: Wer die
 * Adresse hat, sieht ihn; gesucht und empfohlen wird er nicht. Das ist auch der Unterschied
 * zwischen einem Brief und einer Sendung.
 *
 * ── UND UNSERE KOPIE BLEIBT ─────────────────────────────────────────────────────────────────
 *
 * Ein gedrucktes Poster kann man nicht zurückrufen. Verschwindet ein Video dort — gesperrt,
 * gelöscht, Konto weg —, spielt das Fenster wieder unsere Datei. Zwei Cent Ablage im Monat
 * gegen tote QR-Codes auf Papier.
 */

type Zugang = { clientId: string; clientSecret: string; refresh: string };

function zugang(): Zugang | null {
  const clientId = process.env.YT_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.YT_CLIENT_SECRET?.trim() ?? "";
  const refresh = process.env.YT_REFRESH_TOKEN?.trim() ?? "";
  if (!clientId || !clientSecret || !refresh) return null;
  return { clientId, clientSecret, refresh };
}

export const youtubeEingerichtet = () => !!zugang();

/** Ein frisches Zugriffstoken. Es lebt eine Stunde; wir holen für jeden Upload eines. */
async function tokenHolen(z: Zugang): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: z.clientId,
      client_secret: z.clientSecret,
      refresh_token: z.refresh,
      grant_type: "refresh_token",
    }),
  });
  const d = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !d.access_token) throw new Error(d.error_description ?? `Token ${res.status}`);
  return d.access_token;
}

export type YoutubeErgebnis = { ok: true; id: string } | { ok: false; grund: string };

/**
 * Einen Film hochladen. `titel` und `text` stehen später in YouTube — sie sind für uns, damit
 * man in der Liste sieht, zu welchem Werk ein Film gehört.
 */
export async function youtubeHochladen(o: {
  daten: Uint8Array;
  typ: string;
  titel: string;
  text?: string;
}): Promise<YoutubeErgebnis> {
  const z = zugang();
  if (!z) return { ok: false, grund: "nicht-eingerichtet" };

  try {
    const token = await tokenHolen(z);

    /* Schritt 1: Platz anfordern. Die Angaben zum Film reisen als JSON mit. */
    const start = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Type": o.typ || "video/webm",
          "X-Upload-Content-Length": String(o.daten.byteLength),
        },
        body: JSON.stringify({
          snippet: {
            title: o.titel.slice(0, 95),
            description: (o.text ?? "").slice(0, 4500),
            /* 1 = Film & Animation. Kunst hat keine eigene Nummer. */
            categoryId: "1",
          },
          status: {
            privacyStatus: "unlisted",
            selfDeclaredMadeForKids: false,
            embeddable: true,
          },
        }),
      },
    );
    const ort = start.headers.get("location");
    if (!start.ok || !ort) {
      const fehler = await start.text().catch(() => "");
      return { ok: false, grund: `platz-${start.status}: ${fehler.slice(0, 200)}` };
    }

    /* Schritt 2: die Bytes. In einem Zug — unsere Filme sind kleiner als 25 MB. */
    const hoch = await fetch(ort, {
      method: "PUT",
      headers: { "Content-Type": o.typ || "video/webm", "Content-Length": String(o.daten.byteLength) },
      body: o.daten as unknown as BodyInit,
    });
    const d = (await hoch.json().catch(() => ({}))) as { id?: string };
    if (!hoch.ok || !d.id) return { ok: false, grund: `upload-${hoch.status}` };
    return { ok: true, id: d.id };
  } catch (e) {
    return { ok: false, grund: e instanceof Error ? e.message.slice(0, 200) : "unbekannt" };
  }
}
