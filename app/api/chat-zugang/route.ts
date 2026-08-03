import { NextResponse } from "next/server";
import { chatZugangBis } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DARF ER NOCH SCHREIBEN? (Owner 03.08.2026: „er kauft ein Model, ein Chat".)
 *
 * Der Trichter fragt beim Laden. Antwortet `bis` mit einem Datum, laeuft der Zugang noch;
 * leer heisst nicht gekauft ODER abgelaufen — der Unterschied geht den Browser nichts an.
 *
 * WARUM DER SERVER ANTWORTET UND NICHT DER BROWSER SICH ERINNERT: `localStorage` galt ewig,
 * war auf dem zweiten Geraet weg und mit einer Zeile in der Konsole gesetzt. Ein Zugang, den
 * der Kunde selbst verlaengern kann, ist keiner.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = String(url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ bis: "" });
  try {
    return NextResponse.json({ bis: await chatZugangBis(email) });
  } catch {
    /* Speicher nicht lesbar: NICHT sperren. Ein Ausfall auf unserer Seite darf einen zahlenden
       Kunden nicht aussperren — im Zweifel schreibt er weiter, das kostet uns Cent. */
    return NextResponse.json({ bis: "", fehler: true });
  }
}
