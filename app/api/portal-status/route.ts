import { NextResponse } from "next/server";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";

/**
 * ── WELCHEN STAND HAT JEDES SEINER BILDER (Owner 18.09.2026) ─────────────────────────────────
 *
 * „Er kann das hochladen, und dann steht auf Status ‚noch nicht freigegeben'. Ich gebe das
 * frei, dann bekommt er den Status ‚freigegeben'."
 *
 * ── WARUM EINE EIGENE ROUTE ─────────────────────────────────────────────────────────────────
 *
 * Der Stand steht in der ABLAGE, nicht im Datensatz: Wo eine Datei liegt, ist die Wahrheit —
 * in der Galerie heisst freigegeben, in der Prüfablage heisst wartend, ein Zettel daneben heisst
 * abgelehnt. Das in die Mandantendatei zu spiegeln hiesse, zwei Wahrheiten zu führen, und die
 * zweite ist irgendwann falsch ([[delete-resurrection-merge-bug]]).
 *
 * EIN AUFRUF FÜR ALLE WERKE, nicht einer je Kachel: Bei zwölf Werken wären es sonst zwölf
 * Abrufe, während er auf sein Dashboard schaut.
 *
 * NUR MIT SEINEM SCHLÜSSEL. Ein Fremder darf nicht erfahren, was bei uns in Prüfung liegt.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type WerkStand = {
  nr: string;
  stand: "frei" | "pruefung" | "abgelehnt";
  gruende?: string[];
  notiz?: string;
  zeit?: string;
};

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const kennung = String(sp.get("m") ?? "").slice(0, 80);
  const k = String(sp.get("k") ?? "");
  const m = kennung ? await mandantLesen(kennung) : null;
  if (!m || !k || !schluesselStimmt(m.schluessel, k)) return NextResponse.json({ ok: false }, { status: 403 });

  const liste = async (prefix: string) => {
    const r = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: 200, sortBy: { column: "name", order: "asc" } }),
    });
    return r.ok ? ((await r.json()) as { name: string; id: string | null }[]).filter(d => d.id) : [];
  };

  const frei = new Set((await liste(`versusforge-motiv/${kennung}`))
    .filter(d => d.name.endsWith(".jpg")).map(d => d.name.replace(/\.jpg$/, "")));
  const wartend = await liste(`versusforge-motiv-pruefung/${kennung}`);
  const abgelehnt = new Set(wartend.filter(d => d.name.endsWith(".abgelehnt.json")).map(d => d.name.replace(/\.abgelehnt\.json$/, "")));
  const inPruefung = new Set(wartend.filter(d => d.name.endsWith(".jpg")).map(d => d.name.replace(/\.jpg$/, "")));

  /* Die Gründe stehen im Zettel — sie kommen mit, damit im Dashboard steht, WAS zu tun ist. */
  /**
   * ── „standard" UND „-1" SIND DASSELBE WERK (18.09.2026 gefunden) ─────────────────────────
   *
   * In der ABLAGE heisst das Standardmotiv `standard` (`motivPfad` macht aus „" und „-1" genau
   * das). Im DASHBOARD heisst dieselbe Kachel `-1` (`nrVon`). Wer die Ablage listet und die
   * Namen unverändert zurückgibt, liefert für die erste Kachel nie einen Stand — sie blieb ohne
   * Etikett, während alle anderen eines hatten.
   *
   * Deshalb reist der Stand unter BEIDEN Namen. Doppelt statt geraten: Die Seite sucht sich den,
   * den sie kennt, und es gibt keine dritte Stelle, an der jemand die Umrechnung vergessen kann.
   */
  const staende: WerkStand[] = [];
  const auchAls = (nr: string) => (nr === "standard" ? ["standard", "-1"] : [nr]);
  for (const nr of new Set([...frei, ...inPruefung, ...abgelehnt])) {
    if (abgelehnt.has(nr)) {
      const r = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`versusforge-motiv-pruefung/${kennung}/${nr}.abgelehnt.json`)}`);
      const z = r.ok ? await r.json().catch(() => ({})) as { gruende?: string[]; notiz?: string; zeit?: string } : {};
      for (const x of auchAls(nr)) {
        staende.push({ nr: x, stand: "abgelehnt", gruende: z.gruende ?? [], ...(z.notiz ? { notiz: z.notiz } : {}), ...(z.zeit ? { zeit: z.zeit } : {}) });
      }
      continue;
    }
    /**
     * ── LIEGT ES IN BEIDEN, WARTET ES (Owner 18.09.2026: „müsste eigentlich stehen als Label:
     * nach Speichern wird geprüft") ───────────────────────────────────────────────────────────
     *
     * HIER STAND `frei.has(nr) ? "frei" : "pruefung"` — wer ein veröffentlichtes Werk durch ein
     * neues ersetzte, sah weiter das grüne „Publicată". Die alte Datei lag ja noch in der
     * Galerie. Für IHN ist aber das Neue das Werk, über das gerade entschieden wird.
     *
     * Die Prüfablage sticht also die Galerie. Auf der öffentlichen Seite bleibt trotzdem das
     * alte Bild stehen, bis der Owner entschieden hat — das ist richtig so und widerspricht dem
     * nicht: Das Etikett sagt, was mit SEINEM letzten Upload passiert.
     */
    const stand = inPruefung.has(nr) ? "pruefung" : "frei";
    for (const x of auchAls(nr)) staende.push({ nr: x, stand });
  }
  return NextResponse.json({ ok: true, staende });
}
