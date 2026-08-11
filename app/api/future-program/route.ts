import { NextResponse } from "next/server";
import { futureProgramLesen, futureProgramSchreiben, futureProgramTokenOk } from "@/lib/future-program-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE SCHNITTSTELLE DER PROGRAMMSEITE — kein Admin nötig, DER TOKEN IST DER AUSWEIS
 * (11.08.2026, Future Self Program). Wer den Link aus der Liefermail hat (`g` = Auftrags-
 * nummer, `t` = HMAC-Token, siehe future-program-store.ts), hat bezahlt; eine zweite
 * Anmeldung wäre nur eine weitere Hürde für ein Geschenk an sich selbst.
 *
 * GET  liest das Programm, setzt beim ALLERERSTEN Aufruf `startedAt` (Tag 1 beginnt, wenn
 *      der Kunde kommt, nicht wenn er zahlt — der Future Film muss erst rendern) und liefert
 *      die errechnete Tagesnummer mit.
 * POST hakt einen Tag ab (nie zurück) oder trägt das 90-Tage-Ziel ein.
 */

const TAG_MS = 24 * 60 * 60 * 1000;

/** Wie viele der 30 Tage schon vergangen sind, seit `startedAt` — mindestens 1, höchstens 30. */
function heutigerTag(startedAt: string): number {
  const t = Date.parse(startedAt);
  if (!Number.isFinite(t)) return 1;
  const vergangen = Math.floor((Date.now() - t) / TAG_MS) + 1;
  return Math.min(30, Math.max(1, vergangen));
}

function darf(g: string, t: string): boolean {
  if (!g || !t) return false;
  return futureProgramTokenOk(g, t);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const g = String(url.searchParams.get("g") ?? "").trim();
  const t = String(url.searchParams.get("t") ?? "").trim();
  if (!darf(g, t)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const p = await futureProgramLesen(g);
  if (!p) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }
  // ERSTES ÖFFNEN: Tag 1 beginnt jetzt, nicht am Kaufdatum — er sieht die Seite erst, wenn
  // sein Future Film fertig gerendert und geliefert ist.
  if (!p.startedAt) {
    p.startedAt = new Date().toISOString();
    try {
      await futureProgramSchreiben(p);
    } catch (err) {
      console.warn("future-program startedAt schreiben fehlgeschlagen:", err);
    }
  }
  const tag = heutigerTag(p.startedAt);
  return NextResponse.json({ program: p, tag });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const g = String((body as { g?: string })?.g ?? "").trim();
  const t = String((body as { t?: string })?.t ?? "").trim();
  if (!darf(g, t)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  const p = await futureProgramLesen(g);
  if (!p) {
    return NextResponse.json({ error: "Program not found." }, { status: 404 });
  }
  if (!p.startedAt) p.startedAt = new Date().toISOString();
  const heute = heutigerTag(p.startedAt);

  const check = Number((body as { check?: number })?.check ?? 0);
  // ABHAKEN NUR, NIE ENTHAKEN — eine bereits bestätigte Checkliste darf niemand wieder
  // leeren, auch nicht der eigene Klick. Nur Tage BIS HEUTE sind abhakbar (kein Vorgriff);
  // ein vergessener frueherer Tag bleibt aber nachtraeglich abhakbar (vergebende Regel).
  if (Number.isFinite(check) && check >= 1 && check <= 30 && check <= heute) {
    if (!p.checks[String(check)]) p.checks[String(check)] = new Date().toISOString();
  }

  const ziel90raw = (body as { ziel90?: string })?.ziel90;
  if (typeof ziel90raw === "string") {
    const ziel = ziel90raw.trim().slice(0, 120);
    if (ziel) {
      p.ziel90 = ziel;
      p.ziel90At = new Date().toISOString();
    }
  }

  try {
    await futureProgramSchreiben(p);
  } catch (err) {
    console.warn("future-program schreiben fehlgeschlagen:", err);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ program: p, tag: heutigerTag(p.startedAt) });
}
