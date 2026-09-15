import { NextResponse } from "next/server";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { motivPfad, pruefPfad } from "@/lib/versusforge-moderation";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { istKuenstler, kuenstlerUrl } from "@/lib/lakatosbandi-adressen";
import { freigabePerPost } from "@/lib/versusforge-freigabe-post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Künstler liegen nur auf lakatosbandi.com (Owner 10.09.2026), ältere Mandanten auf versusforge.com. */
/* Mit dem Admin-Schlüssel zeigt das Portal die ganze Seite, auch vor der Freigabe (Owner 11.09.2026: „du zeigst die Seite im Portal"). */
const seitenAdresse = (m: { freigabe?: string }, kennung: string, schluessel = "") =>
  istKuenstler(m)
    ? `${kuenstlerUrl(kennung)}${schluessel ? `?s=${encodeURIComponent(schluessel)}` : ""}`
    : `https://versusforge.com/${encodeURIComponent(kennung)}`;

/**
 * DER OWNER ENTSCHEIDET — ÜBER EINEN NEUEN KÜNSTLER ODER EIN MARKIERTES WERK (Owner 10.09.2026,
 * Variante B · „Für beides soll ich eine E-Mail bekommen" · „markierte").
 *
 * ── ZWEI ARTEN ─────────────────────────────────────────────────────────────────────────────
 *
 *  · ohne `typ`      — ein neuer Künstler: setzt `freigabe` im Eintrag (Anmelde-Mail).
 *  · `typ=motiv`     — ein markiertes Werk: Freigeben schiebt es aus der Prüfablage an seinen
 *                      Platz, Ablehnen löscht es aus der Prüfablage (Prüf-Mail).
 *
 * ── GET ÄNDERT NICHTS ──────────────────────────────────────────────────────────────────────
 *
 * Die Links in den Mails führen hierher per GET und zeigen eine Bestätigungsseite; erst deren
 * Knopf (POST) entscheidet. Mailprogramme und Virenscanner öffnen Links in Mails von selbst — ein
 * Link, der beim Öffnen freigibt, hätte alles freigegeben, bevor der Owner es gesehen hat.
 *
 * ── WER DARF ───────────────────────────────────────────────────────────────────────────────
 *
 * Nur mit dem Owner-Schlüssel (`VERSUSFORGE_DASHBOARD_KEY`), geprüft wie bei der Anfragenliste.
 * Das markierte Bild wird NUR hier gezeigt, nie in einer Mail und nie öffentlich.
 */

const AKTIONEN = { frei: "Freigeben", abgelehnt: "Ablehnen" } as const;
type Aktion = keyof typeof AKTIONEN;

const schutz = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function seite(titel: string, inhalt: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${schutz(titel)}</title></head>` +
    `<body style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:56px auto;padding:0 20px;color:#14181c;line-height:1.5">${inhalt}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

type Anfrage = { kennung: string; schluessel: string; aktion: string; typ: string; nr: string };

async function pruefen(a: Anfrage) {
  if (!mandantPruefen(EIGENER_MANDANT, a.schluessel).ok) return { fehler: seite("Kein Zugang", "<p>Dieser Link ist nicht gültig.</p>", 403) };
  if (!(a.aktion in AKTIONEN)) return { fehler: seite("Unbekannt", "<p>Unbekannte Aktion.</p>", 400) };
  if (a.typ !== "" && a.typ !== "motiv") return { fehler: seite("Unbekannt", "<p>Unbekannte Art.</p>", 400) };
  const m = await mandantLesen(a.kennung);
  if (!m) return { fehler: seite("Nicht gefunden", "<p>Diesen Künstler gibt es nicht (mehr).</p>", 404) };
  return { m, aktion: a.aktion as Aktion };
}

/** Das markierte Werk aus der Prüfablage — `null`, wenn schon entschieden. */
async function wartendesMotiv(kennung: string, nr: string): Promise<Buffer | null> {
  const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pruefPfad(kennung, nr))}`);
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}

const knopf = (a: Anfrage, aktion: Aktion) => [
  `<form method="POST" action="/api/versusforge-freigabe" style="display:inline-block;margin-right:10px">`,
  `<input type="hidden" name="m" value="${schutz(a.kennung)}"><input type="hidden" name="s" value="${schutz(a.schluessel)}">`,
  `<input type="hidden" name="a" value="${aktion}"><input type="hidden" name="typ" value="${schutz(a.typ)}"><input type="hidden" name="nr" value="${schutz(a.nr)}">`,
  `<button type="submit" style="font-size:17px;padding:14px 22px;border:0;border-radius:10px;cursor:pointer;color:#fff;background:${aktion === "frei" ? "#1d6fd0" : "#b3261e"}">${AKTIONEN[aktion]}</button>`,
  `</form>`,
].join("");

const lesen = (q: { get(k: string): unknown }): Anfrage => ({
  kennung: String(q.get("m") ?? ""), schluessel: String(q.get("s") ?? ""), aktion: String(q.get("a") ?? ""),
  typ: String(q.get("typ") ?? ""), nr: String(q.get("nr") ?? ""),
});

/** Bestätigungsseite — ändert nichts. */
export async function GET(request: Request) {
  const a = lesen(new URL(request.url).searchParams);
  const p = await pruefen(a);
  if ("fehler" in p) return p.fehler;

  if (a.typ === "motiv") {
    const bild = await wartendesMotiv(a.kennung, a.nr);
    if (!bild) return seite("Schon entschieden", `<p><b>${schutz(p.m.name)}</b>: Für dieses Werk liegt nichts mehr zur Prüfung vor.</p>`);
    return seite(`Werk prüfen: ${p.m.name}`, [
      `<p style="margin:0 0 14px;font-size:22px"><b>${schutz(p.m.name)}</b> — markiertes Werk</p>`,
      `<img src="data:image/jpeg;base64,${bild.toString("base64")}" alt="" style="max-width:100%;border-radius:8px;margin:0 0 20px">`,
      `<p style="margin:0 0 16px;color:#5b666f">Ist das Kunst? Freigeben legt es in seine Galerie, Ablehnen löscht es aus der Prüfablage.</p>`,
      knopf(a, "frei"), knopf(a, "abgelehnt"),
    ].join(""));
  }

  const jetzt = p.m.freigabe ?? "frei";
  return seite(`${AKTIONEN[p.aktion]}: ${p.m.name}`, [
    `<p style="margin:0 0 4px;font-size:22px"><b>${schutz(p.m.name)}</b></p>`,
    `<p style="margin:0 0 20px;color:#5b666f">Jetzt: ${jetzt === "offen" ? "wartet auf Freigabe" : jetzt === "frei" ? "freigegeben" : "abgelehnt"}</p>`,
    `<p style="margin:0 0 24px"><a href="${seitenAdresse(p.m, a.kennung, a.schluessel)}">Seine Seite ansehen</a></p>`,
    knopf(a, p.aktion),
  ].join(""));
}

/** Die Entscheidung — erst hier wird geschrieben. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const a = form ? lesen(form) : lesen(new URLSearchParams());
  const p = await pruefen(a);
  if ("fehler" in p) return p.fehler;

  if (a.typ === "motiv") {
    const quelle = pruefPfad(a.kennung, a.nr);
    if (!(await wartendesMotiv(a.kennung, a.nr))) return seite("Schon entschieden", "<p>Für dieses Werk liegt nichts mehr zur Prüfung vor.</p>");
    const loeschen = (pfad: string) => supabaseFetch(`/storage/v1/object/${BUCKET}`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [pfad] }),
    });

    if (p.aktion === "abgelehnt") {
      const weg = await loeschen(quelle);
      if (!weg.ok) return seite("Nicht gelöscht", "<p>Das Löschen hat nicht geklappt. Bitte noch einmal versuchen.</p>", 502);
      return seite("Abgelehnt", `<p style="font-size:20px"><b>${schutz(p.m.name)}</b>: Das Werk ist abgelehnt und aus der Prüfablage gelöscht.</p>`);
    }

    /* Freigeben: Ein altes Bild am Zielplatz ersetzt der Künstler gerade selbst — also erst
       den Platz frei machen, dann verschieben (Verschieben überschreibt nicht). */
    const ziel = motivPfad(a.kennung, a.nr);
    await loeschen(ziel);
    const verschoben = await supabaseFetch("/storage/v1/object/move", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: BUCKET, sourceKey: quelle, destinationKey: ziel }),
    });
    if (!verschoben.ok) {
      console.error("[versusforge-freigabe] Verschieben gescheitert:", verschoben.status, await verschoben.text().catch(() => ""));
      return seite("Nicht freigegeben", "<p>Das Verschieben hat nicht geklappt. Bitte noch einmal versuchen.</p>", 502);
    }
    return seite("Freigegeben", `<p style="font-size:20px"><b>${schutz(p.m.name)}</b>: Das Werk ist freigegeben und liegt jetzt in seiner Galerie.</p>`);
  }

  const vorher = p.m.freigabe;
  /**
   * ── DIE FREIGABE SETZT AUCH `portal` (14.09.2026 gefunden, Owner: „warum ist seine seite
   * nicht online?") ─────────────────────────────────────────────────────────────────────────
   *
   * Hier stand nur `freigabe`. `api/portal-behalten` setzt aber bewusst `portal: false` und
   * verweist im Kommentar auf genau diesen Klick: „Öffentlich wird sie erst durch den Klick des
   * Owners." Und `imPortalSichtbar` (lib/lakatosbandi.ts) verlangt BEIDES — „frei" UND
   * „portal". Die Freigabe machte damit nur die halbe Arbeit: Die Seite war über ihren Link
   * erreichbar, tauchte aber in keiner Übersicht auf. Betraf jeden freigegebenen Künstler,
   * nicht nur den einen, an dem es aufgefallen ist (valentinboboc).
   *
   * ABLEHNEN NIMMT SIE AUCH WIEDER RAUS: Sonst bliebe eine abgelehnte Seite in der Übersicht
   * stehen, nachdem der Owner sie ausdrücklich abgelehnt hat.
   */
  const ok = await mandantSpeichern(a.kennung, {
    ...p.m,
    freigabe: p.aktion,
    portal: p.aktion === "frei",
    freigabeAm: new Date().toISOString(),
  });
  if (!ok) return seite("Nicht gespeichert", "<p>Das Speichern hat nicht geklappt. Bitte noch einmal versuchen.</p>", 502);

  /* DER KÜNSTLER ERFÄHRT ES (Owner 11.09.2026). Nur wenn sich etwas ändert — ein zweiter Klick auf denselben Knopf
     schickt keine zweite Mail. Scheitert der Versand, steht es hier, damit der Owner selbst schreiben kann. */
  const adresse = String(p.m.mail ?? "");
  let post = "";
  if (istKuenstler(p.m) && vorher !== p.aktion && adresse.includes("@")) {
    const geschickt = await freigabePerPost({
      an: adresse, mandant: a.kennung, schluessel: String(p.m.schluessel ?? ""),
      loeschSchluessel: p.m.loeschSchluessel, sprache: p.m.sprache, aktion: p.aktion,
    });
    post = geschickt ? "Der Künstler hat eine Mail bekommen." : "Die Mail an den Künstler ist NICHT rausgegangen — bitte selbst schreiben.";
  }

  return seite(p.aktion === "frei" ? "Freigegeben" : "Abgelehnt", [
    `<p style="margin:0 0 8px;font-size:22px"><b>${schutz(p.m.name)}</b> ist ${p.aktion === "frei" ? "freigegeben — die Seite ist jetzt öffentlich" : "abgelehnt — die Seite bleibt offline"}.</p>`,
    p.aktion === "frei" ? `<p style="margin:0"><a href="${seitenAdresse(p.m, a.kennung, a.schluessel)}">Seine Seite ansehen</a></p>` : "",
    post ? `<p style="margin:14px 0 0;color:#5b666f">${schutz(post)}</p>` : "",
  ].join(""));
}
