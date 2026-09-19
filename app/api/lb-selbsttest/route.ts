import { NextResponse } from "next/server";
import { druckdateiBauen } from "@/lib/lakatosbandi-druckdatei";
import { kundenbildLesen } from "@/lib/lakatosbandi-kundenbild";

/**
 * ── NUR ZUM PRÜFEN, NIE IM BETRIEB (19.09.2026) ─────────────────────────────────────────────
 *
 * Baut die Druckdatei für ein abgelegtes Kundenbild — genau so, wie der Webhook es nach einer
 * Zahlung tut, nur ohne Zahlung und ohne Mail. Damit lässt sich der teuerste Weg im Haus prüfen,
 * ohne dass jemand zehn Euro ausgibt.
 *
 * VERRIEGELT AUF DIE ENTWICKLUNGSUMGEBUNG: Auf einem echten Server gibt es diese Antwort nicht.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false }, { status: 404 });

  const p = new URL(request.url).searchParams;

  /* Führt den Browser auf die Admin-Ansicht, ohne dass der Schlüssel durch eine Ausgabe muss. */
  if (p.get("was") === "admin") {
    const k = String(process.env.VERSUSFORGE_DASHBOARD_KEY ?? "").trim();
    if (!k) return NextResponse.json({ ok: false, grund: "kein-schluessel" }, { status: 404 });
    const ziel = String(p.get("ziel") ?? "/portal/caricaturist-ai?ansicht=poster&lang=ro");
    return NextResponse.redirect(new URL(`${ziel}${ziel.includes("?") ? "&" : "?"}s=${encodeURIComponent(k)}`, request.url));
  }

  const bild = String(p.get("bild") ?? "");
  const format = (String(p.get("format") ?? "A3") as "A3" | "A2" | "A1");

  const gelesen = await kundenbildLesen(bild);
  if (!gelesen) return NextResponse.json({ ok: false, grund: "kein-bild" }, { status: 404 });

  try {
    const bytes = await druckdateiBauen({
      bild: gelesen.bild,
      titel: String(gelesen.zettel.titel ?? ""),
      text: String(gelesen.zettel.satz ?? ""),
      recht: "lakatosbandi.com",
      format,
    });
    return NextResponse.json({
      ok: true, bytes: bytes.length, format,
      zettel: { stil: gelesen.zettel.stil, titel: gelesen.zettel.titel ?? "", satz: gelesen.zettel.satz ?? "" },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, fehler: String(e).slice(0, 300) }, { status: 500 });
  }
}
