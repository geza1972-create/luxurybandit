import { NextResponse } from "next/server";
import { readAdScripts, writeAdScripts, type AdScript } from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Startbestand: die erarbeiteten Anzeigentexte, Bella-Sätze und Beispiel-Nachrichten.
// Wird EINMAL gespeichert, sobald die Seite zum ersten Mal geöffnet wird — danach ist
// der gespeicherte Stand maßgeblich (auch wenn der Admin alles löscht).
const SEED: Omit<AdScript, "id" | "createdAt">[] = [
  {
    kind: "ad", title: "A — Der Kontrast",
    text: `Dein Wecker sagt 6:45.\nBellas Wecker sagt Monaco. ☕\n\nSie wacht heute an der Côte d'Azur auf und schreibt dir, wie es dort ist — und wie das Wetter bei dir wird. Dazu, was diese Saison getragen wird.\n\n→ Kostenlos wecken lassen`,
  },
  {
    kind: "ad", title: "B — Die Szene",
    text: `„Guten Morgen. 24 Grad hier in Monaco, das Meer ist spiegelglatt. Bei dir wird's heute nass — nimm eine Jacke mit."\n\nBella schreibt dir jeden Morgen von dort, wo sie gerade ist.\n\n→ Ich will Bellas Morgennachricht`,
  },
  {
    kind: "ad", title: "C — Das Briefing",
    text: `Dein Morgen-Briefing von der Côte d'Azur: Wetter, wo Bella gerade ist. Wetter bei dir. Und was gerade getragen wird.\nJeden Morgen. Kostenlos.\n\n→ Anmelden`,
  },
  {
    kind: "ad", title: "D — Die Neugier",
    text: `Jeden Morgen eine Nachricht von einer Frau, die gerade in Monaco aufgewacht ist.\n\n→ Schau, wie das aussieht`,
  },
  {
    kind: "spoken", title: "Bella spricht — Monaco Morgen",
    text: `Guten Morgen. Ich bin Bella. Ich bin gerade in Monaco aufgewacht — vierundzwanzig Grad, das Meer liegt still da. Soll ich dich morgen auch wecken?`,
  },
  {
    kind: "spoken", title: "Bella spricht — Einladung",
    text: `Jeden Morgen schreibe ich dir, wo ich gerade bin, wie das Wetter bei dir wird, und was diese Saison getragen wird. Kostenlos. Trag dich ein.`,
  },
  {
    kind: "message", title: "Morgen — Monaco",
    text: `Guten Morgen Gerry ☀️ Ich bin gerade in Monaco aufgewacht — 24 °C und die Sonne knallt schon auf den Hafen. Bei dir in Timișoara wird's heute 31 °C, aber am Nachmittag ziehen Gewitter auf. Nimm was mit. Was steht bei dir heute an?`,
  },
  {
    kind: "message", title: "Abend — Rückfrage",
    text: `Ich war heute Nachmittag oben an der Corniche — die ganze Bucht lag im Abendlicht, ich konnte mich kaum losreißen. Und bei dir, wie war dein Tag?`,
  },
  {
    kind: "message", title: "Morgen — Teneriffa",
    text: `Morgen Gerry 🌴 Teneriffa zeigt sich heute von seiner besten Seite, 26 °C und Wind vom Meer. Bei dir sind's frische 12 °C und Regen — bleib trocken. Hast du heute was Schönes vor?`,
  },
];

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const stored = await readAdScripts();
  if (stored) return NextResponse.json({ scripts: stored });
  // Erstaufruf → Vorlagen anlegen.
  const seeded: AdScript[] = SEED.map((s, i) => ({
    ...s,
    id: `seed-${i}-${crypto.randomUUID().slice(0, 8)}`,
    createdAt: new Date().toISOString(),
  }));
  try { await writeAdScripts(seeded); } catch { /* beim nächsten Mal erneut versuchen */ }
  return NextResponse.json({ scripts: seeded });
}

// Speichert die GESAMTE Liste (einfachstes Modell für eine bearbeitbare Sammlung).
export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { scripts?: unknown };
  if (!Array.isArray(body.scripts)) return NextResponse.json({ error: "scripts (Array) fehlt." }, { status: 400 });
  const clean: AdScript[] = (body.scripts as AdScript[])
    .filter(s => s && typeof s.text === "string")
    .map(s => ({
      id: String(s.id || crypto.randomUUID()),
      kind: s.kind === "spoken" ? "spoken" : s.kind === "message" ? "message" : "ad",
      title: String(s.title ?? "").slice(0, 120),
      text: String(s.text ?? "").slice(0, 4000),
      createdAt: String(s.createdAt || new Date().toISOString()),
    }));
  try { await writeAdScripts(clean); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Speichern fehlgeschlagen." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, count: clean.length });
}
