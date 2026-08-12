import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { ruecklaeuferEinsammeln } from "@/lib/ruecklaeufer";
import { readRuecklaeuferLog } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Ein Postfach mit zwei Wochen Post durchzusehen dauert länger als eine Sekunde.
export const maxDuration = 300;

/**
 * RÜCKLÄUFER EINSAMMELN — die Unzustellbar-Berichte aus `support@` in die Sperrliste.
 *
 * Owner 04.08.2026: „ja" auf die Frage, ob der Leser gebaut werden soll. Bis dahin las der
 * Besitzer sein Postfach selbst und tippte die Adressen ab; was er übersah, blieb im Verteiler.
 *
 * DREI TÜREN, wie beim Rundbrief und beim Aufräumer:
 *   1. Ohne `?echt=1` ist es ein PROBELAUF — es wird nur berichtet, nichts gesperrt.
 *   2. `?echt=1` sperrt wirklich.
 *   3. `?log=1` zeigt, was frühere Läufe gesperrt haben, samt Begründung des Mailservers.
 * Nur für Admin oder Cron. Ein offener Endpunkt wäre hier besonders unangenehm: Er verrät,
 * wer bei uns Kunde ist, und liest ein fremdes Postfach.
 *
 * NACHTS UM VIER (vercel.json): Nach dem Aufräumer, vor dem Tag. Rückläufer kommen binnen
 * Minuten nach einem Versand zurück — täglich reicht, weil zwischen zwei Rundbriefen ohnehin
 * Tage liegen.
 */

function schluessel(): string {
  return (process.env.CRON_SECRET || process.env.TRY_THIS_LOOK_ADMIN_PIN || "").trim();
}

async function darf(request: Request): Promise<boolean> {
  /* DER NACKTE CRON-KOPF IST KEIN AUSWEIS MEHR (12.08.2026) — jeder Fremde kann ihn setzen,
     und diese Route SPERRT Empfängeradressen. Echte Vercel-Crons weisen sich mit
     `Bearer CRON_SECRET` aus (Bearer-Zweig unten); der nackte Kopf zählt nur ohne
     konfiguriertes Geheimnis. Begründung im Wortlaut: app/api/kiss-deliver/route.ts, darf(). */
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

  if (q.get("log") === "1") {
    const eintraege = await readRuecklaeuferLog();
    return NextResponse.json({ eintraege: eintraege.slice(-500).reverse() });
  }

  /**
   * DER CRON SPERRT WIRKLICH, der Klick im Browser nicht. Das ist Absicht: Wer die Adresse von
   * Hand aufruft, schaut nach — wer sie nachts automatisch aufruft, soll aufräumen.
   */
  const echt = q.get("echt") === "1" || !!request.headers.get("x-vercel-cron");
  const bericht = await ruecklaeuferEinsammeln({
    tage: Number(q.get("tage") ?? "14"),
    nurZeigen: !echt,
  });

  return NextResponse.json({
    probelauf: !echt,
    ...bericht,
    hinweis: bericht.fehler ? undefined
      : echt ? undefined
      : "Probelauf — nichts gesperrt. Zum wirklichen Sperren `?echt=1` anhängen.",
  }, { status: bericht.fehler ? 502 : 200 });
}

/** Gleicher Lauf, aber sperrend — für den Knopf im Admin. */
export async function POST(request: Request) {
  if (!(await darf(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const tage = Number(new URL(request.url).searchParams.get("tage") ?? "14");
  const bericht = await ruecklaeuferEinsammeln({ tage, nurZeigen: false });
  return NextResponse.json(bericht, { status: bericht.fehler ? 502 : 200 });
}
