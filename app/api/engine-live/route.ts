import { NextResponse } from "next/server";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import { gespraecheListe } from "@/lib/versusforge-lauf";
import { ereignisseLesen, ereignisSatz } from "@/lib/versusforge-ereignis";

/**
 * WER GERADE IM TRICHTER IST (Owner 14.09.2026: „ich will eine SMS bekommen wenn jemand den
 * tunel öffnet" → „also dann folgendes ich will dann einen live dashboard wo ich sehe jemand
 * öffnet den tunel").
 *
 * ── WARUM EINE ROUTE UND NICHT DIE SEITE SELBST ─────────────────────────────────────────────
 *
 * `/engine/gespraeche` ist eine Server-Seite: Sie wird einmal gerendert und steht dann still.
 * „Live" braucht jemanden, der nachfragt — das Bauteil im Browser holt hier alle paar Sekunden
 * den Stand.
 *
 * ── KEIN VERLAUF, SONDERN EIN STAND ─────────────────────────────────────────────────────────
 *
 * `versusforge-schritt/<mandant>/<besucher>.json` hält je Besucher EINE Zeile mit der WEITESTEN
 * erreichten Stufe (`{weit, stufe, erst, zeit}`), nicht jeden einzelnen Schritt. Mehr ist daraus
 * nicht zu holen, und der Owner hat genau das als ausreichend bestätigt: wer ist da, wie weit
 * ist er, seit wann.
 *
 * ── NUR DIE FRISCHEN DATEIEN WERDEN GELESEN ─────────────────────────────────────────────────
 *
 * Die Liste liefert Zeitstempel mit; gelesen wird erst danach und nur, was ins Fenster fällt.
 * Sonst holte jeder Aufruf alle paar Sekunden Dutzende Dateien einzeln.
 *
 * ── DERSELBE SCHLÜSSEL WIE DIE SEITE ────────────────────────────────────────────────────────
 *
 * Hier steht, wer gerade auf der Seite ist. Das ist nichts für Fremde.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Wie weit zurück gilt als „gerade". */
const FENSTER_MINUTEN = 45;

type Stand = { weit?: number; stufe?: string; erst?: string; zeit?: string };

export async function GET(request: Request) {
  const schluessel = process.env.VERSUSFORGE_DASHBOARD_KEY ?? "";
  const s = new URL(request.url).searchParams.get("s") ?? "";
  if (!schluessel || s !== schluessel) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const grenze = Date.now() - FENSTER_MINUTEN * 60 * 1000;
  const ordner = `versusforge-schritt/${EIGENER_MANDANT}/`;

  const liste = await supabaseFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: ordner, limit: 1000 }),
  }).catch(() => null);

  const dateien = liste?.ok
    ? ((await liste.json().catch(() => [])) as { name?: string; updated_at?: string; created_at?: string }[])
    : [];

  /* Vorfiltern über den Zeitstempel der Ablage — erst dann lesen. */
  const frisch = dateien.filter(d => {
    const t = Date.parse(String(d.updated_at || d.created_at || ""));
    return String(d.name ?? "").endsWith(".json") && Number.isFinite(t) && t >= grenze;
  });

  const besucher = (await Promise.all(frisch.map(async d => {
    const res = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(`${ordner}${d.name}`)}`).catch(() => null);
    if (!res?.ok) return null;
    let st: Stand;
    try { st = (await res.json()) as Stand; } catch { return null; }
    const zeit = String(st.zeit ?? "");
    if (!Number.isFinite(Date.parse(zeit)) || Date.parse(zeit) < grenze) return null;
    return {
      /* Nur die ersten Zeichen der Gerätekennung — genug zum Unterscheiden, kein Personenbezug. */
      kennung: String(d.name ?? "").slice(0, 8),
      stufe: String(st.stufe ?? ""),
      weit: Number(st.weit ?? 0),
      seit: String(st.erst ?? zeit),
      zeit,
    };
  }))).filter(Boolean) as { kennung: string; stufe: string; weit: number; seit: string; zeit: string }[];

  besucher.sort((a, b) => b.zeit.localeCompare(a.zeit));

  /* Die Gespräche daneben: Wer schreibt gerade, und womit ist der Agent zuletzt gelaufen. */
  const gespraeche = (await gespraecheListe(40))
    .filter(g => g.letzter && Date.parse(String(g.letzter.zeit)) >= grenze)
    .map(g => ({
      gespraech: g.gespraech,
      zuege: g.zuege,
      zeit: String(g.letzter?.zeit ?? ""),
      werkzeuge: g.letzter?.werkzeuge ?? [],
      mensch: String(g.letzter?.mensch ?? "").slice(0, 120),
    }))
    .sort((a, b) => b.zeit.localeCompare(a.zeit));

  /* Was im Dashboard passiert ist (Owner 14.09.2026: „ich will alles sehen") — heute und
     gestern, damit über Mitternacht keine Lücke entsteht. */
  const heute = new Date().toISOString();
  const gestern = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const ereignisse = [...(await ereignisseLesen(heute, 40)), ...(await ereignisseLesen(gestern, 20))]
    .sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)))
    .slice(0, 40)
    .map(e => ({ zeit: e.zeit, satz: ereignisSatz(e), mandant: e.mandant }));

  return NextResponse.json({
    ok: true,
    jetzt: new Date().toISOString(),
    fenster: FENSTER_MINUTEN,
    besucher,
    gespraeche,
    ereignisse,
  });
}
