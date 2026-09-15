import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { metaLeadsAbholen } from "@/lib/meta-leads-abholen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Vier Formulare, je ein Aufruf bei Meta, dazu je neuem Lead eine Mail. Normalerweise Sekunden;
   beim ersten Lauf an einem vollen Formular darf es länger dauern. */
export const maxDuration = 120;

/**
 * DER EINSTIEG FÜR DEN ZEITPLAN (vercel.json, alle 15 Minuten).
 *
 * ZWEI TÜREN, wie beim Rückläufer-Einsammler:
 *   1. Ohne `?echt=1` ist es ein PROBELAUF — es wird nichts angelegt und nichts verschickt.
 *   2. `?echt=1` (oder der Cron) legt wirklich an und mailt.
 *
 * NUR FÜR ADMIN ODER CRON. Ein offener Endpunkt wäre hier besonders unangenehm: Er liest
 * fremde Namen und Adressen aus einem Werbeformular und verschickt Mails in unserem Namen.
 * Der nackte `x-vercel-cron`-Kopf zählt nur, solange kein Geheimnis gesetzt ist — jeder Fremde
 * kann ihn setzen (Begründung im Wortlaut: app/api/ruecklaeufer/route.ts).
 */

function schluessel(): string {
  return (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
}

async function darf(request: Request): Promise<boolean> {
  const k = schluessel();
  if (!k && request.headers.get("x-vercel-cron")) return true;
  if (k) {
    const url = new URL(request.url);
    if (url.searchParams.get("key")?.trim() === k) return true;
    if (request.headers.get("authorization")?.trim() === `Bearer ${k}`) return true;
  }
  return isAdminRequest(request).catch(() => false);
}

export async function GET(request: Request) {
  if (!(await darf(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const q = new URL(request.url).searchParams;
  const echt = q.get("echt") === "1" || !!request.headers.get("x-vercel-cron");
  const bericht = await metaLeadsAbholen({ nurZeigen: !echt });

  return NextResponse.json({
    probelauf: !echt,
    ...bericht,
    hinweis: bericht.fehler ? undefined
      : echt ? undefined
      : "Probelauf — nichts angelegt, nichts verschickt. Zum Scharfschalten `?echt=1` anhängen.",
  }, { status: bericht.fehler ? 502 : 200 });
}
