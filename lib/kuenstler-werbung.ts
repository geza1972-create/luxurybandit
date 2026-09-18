import { randomUUID } from "crypto";
import { GROSS } from "@/lib/agent-modell";
import { bildPruefen, kunstPruefen, motivPfad } from "@/lib/versusforge-moderation";
import { bildAnsehen } from "@/lib/versusforge-bild-ansehen";
import { spruchAusBefund } from "@/lib/kuenstler-sprueche";
import { mandantAnlegen, mandantAusPlan, freierName } from "@/lib/versusforge-mandanten";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { kuenstlerUrl } from "@/lib/lakatosbandi";
import { kandidatLesen, kandidatAendern, type Kandidat } from "@/lib/kuenstler-kandidaten";

/**
 * DIE VORARBEIT, DIE DAS ANSCHREIBEN ERST GLAUBWÜRDIG MACHT (Owner 16.09.2026).
 *
 * ── WARUM ÜBERHAUPT ETWAS VOR DER MAIL ENTSTEHT ─────────────────────────────────────────────
 *
 * Eine Kaltmail, die etwas verspricht, ist die elfte Kaltmail. Eine, die etwas ZEIGT, ist die
 * erste. Deshalb steht am Ende dieser Datei nicht ein Text, sondern seine fertige Seite: sein
 * Werk als Living Poster, sein Satz darunter, der QR-Code läuft.
 *
 * Owner auf die Frage, ob hinter dem Knopf nur das Blatt oder die ganze Seite liegen soll:
 * „was besser ist, klar."
 *
 * ── SIE IST UNSICHTBAR, BIS ER JA SAGT ──────────────────────────────────────────────────────
 *
 * `portal: false` hält sie aus der Übersicht und aus der Kategorie; erreichbar ist sie nur über
 * ihre Kennung. Das ist keine Feinheit: Wir haben sein Werk benutzt, ohne ihn zu fragen. Daraus
 * darf nichts entstehen, was ein Fremder finden kann — und ein „nein" muss es wirklich löschen
 * (`kandidatLoeschen`).
 *
 * ── SIE KOSTET GELD, ALSO LÄUFT SIE NICHT VON SELBST ────────────────────────────────────────
 *
 * Analyse und Spruch laufen auf dem GROSSEN Modell — dieselbe Arbeit wie im Trichter, nur für
 * jemanden, der noch nichts von uns will (Skill `agenten`, Regel 2: keine Tokens für Abbrecher).
 * Deshalb wird je Kandidat GENAU EINMAL vorbereitet: Wer schon ein `vorbereitetAm` trägt, wird
 * zurückgegeben, statt ein zweites Mal analysiert zu werden.
 */

const MAX_BYTES = 4 * 1024 * 1024;

/** Das Werk von der Quelle holen — als data:-URL, so wie der Trichter es bekommt. */
async function bildHolen(url: string): Promise<string | null> {
  if (!/^https:\/\//i.test(url)) return null;
  const res = await fetch(url, {
    headers: { "User-Agent": "lakatosbandi.com (kontakt via lakatosbandi.com)" },
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const typ = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!typ.startsWith("image/")) return null;
  const daten = new Uint8Array(await res.arrayBuffer());
  if (!daten.length || daten.length > MAX_BYTES) return null;
  return `data:${typ};base64,${Buffer.from(daten).toString("base64")}`;
}

export type VorbereitetErgebnis =
  | { ok: true; kandidat: Kandidat; schon: boolean }
  | { ok: false; grund: string };

export async function kandidatVorbereiten(id: string): Promise<VorbereitetErgebnis> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) return { ok: false, grund: "kein-schluessel" };

  const k = await kandidatLesen(id);
  if (!k) return { ok: false, grund: "unbekannt" };
  if (k.abgelehntAm) return { ok: false, grund: "abgelehnt" };
  /* Schon einmal bezahlt — nicht noch einmal. */
  if (k.vorbereitetAm && k.kennung) return { ok: true, kandidat: k, schon: true };
  if (!k.werkUrl) return { ok: false, grund: "kein-werk" };

  const bild = await bildHolen(k.werkUrl);
  if (!bild) return { ok: false, grund: "bild-nicht-geholt" };

  /* Ist es überhaupt ein Werk — und darf es abgelegt werden? Dieselben zwei Prüfungen wie im
     Trichter: Ein Logo oder ein Zertifikat ergäbe ein Poster, das ihn blamiert. */
  const kunst = await kunstPruefen({ apiKey, bild }).catch(() => ({ kunst: true, was: "" }));
  if (!kunst.kunst) return { ok: false, grund: "kein-werk" };
  const urteil = await bildPruefen({ apiKey, bild }).catch(() => null);
  if (urteil?.urteil === "verboten") return { ok: false, grund: "abgelehnt-bild" };

  const gesehen = await bildAnsehen({ apiKey, bild, modell: GROSS }).catch(() => null);
  if (!gesehen?.ok) return { ok: false, grund: "nicht-gelesen" };

  /* Sein Satz — in SEINER Sprache, nicht in unserer. Er liest ihn in der Mail. */
  const spruch = await spruchAusBefund({ apiKey, befund: gesehen.werk, sprache: k.sprache, bild })
    .catch(() => "");
  if (!spruch) return { ok: false, grund: "kein-spruch" };

  const schluessel = randomUUID().replace(/-/g, "");
  const loeschSchluessel = randomUUID().replace(/-/g, "");
  const wunsch = await freierName("artist");
  const kennung = await mandantAnlegen(wunsch, {
    ...mandantAusPlan({
      name: k.name,
      /* SEINE Adresse steht drin, damit die Seite nie herrenlos ist — geschrieben wird an sie
         erst durch `kuenstler-werbung-post`, und genau einmal. */
      mail: k.mail,
      plan: { hook: spruch, zielgruppe: [], karten: [] },
      schluessel,
      loeschSchluessel,
      sprache: k.sprache,
    }),
    /* ÜBER DEN LINK SICHTBAR, SONST NIRGENDS (siehe Kopf dieser Datei). */
    freigabe: "offen" as const,
    portal: false,
    werkNummern: [-1],
    hook: spruch,
    ...(k.werkTitel ? { werkInfo: { standard: { titel: k.werkTitel } } } : {}),
    aufbauSeit: "",
  });
  if (!kennung) return { ok: false, grund: "nicht-angelegt" };

  const teil = bild.split(",", 2)[1] ?? "";
  const put = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(motivPfad(kennung, ""))}`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
    body: Buffer.from(teil, "base64"),
  }).catch(() => null);
  if (!put?.ok) return { ok: false, grund: "werk-nicht-abgelegt" };

  /* Der Link aus seiner Mail: seine Seite, mit seinem Schlüssel — damit er sie gleich ändern
     kann, ohne sich irgendwo anzumelden. */
  const link = `${kuenstlerUrl(kennung)}?k=${schluessel}&lang=${encodeURIComponent(k.sprache)}`;
  /* Sein Nein: derselbe Löschweg, den jeder Künstler für seine eigene Seite hat. Er entfernt
     die Seite samt Werk — nicht nur die Mail. */
  const loeschLink = `${kuenstlerUrl(kennung)}/loeschen?k=${loeschSchluessel}&lang=${encodeURIComponent(k.sprache)}`;
  const neu = await kandidatAendern(id, {
    kennung, link, loeschLink, spruch, vorbereitetAm: new Date().toISOString(),
  });
  return neu ? { ok: true, kandidat: neu, schon: false } : { ok: false, grund: "nicht-vermerkt" };
}
