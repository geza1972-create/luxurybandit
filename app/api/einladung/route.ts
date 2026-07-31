import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readEinladungen, writeEinladungen, type Einladung } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DIE HOCHZEITSEINLADUNG — anlegen, öffnen zählen, zurückziehen.
 *
 * Owner 31.07.2026: „ich will dass die Leute das auch als Einladung für die Hochzeit schicken
 * das Video an die Freunde."
 *
 * Warum das mehr ist als ein Teilen-Knopf: Eine Einladung geht an 50 bis 150 Menschen, und
 * jeder sieht ein KI-Video mit Gesichtern, die er KENNT. Das ist die einzige Stelle im Portal,
 * an der ein Kunde uns die nächsten Besucher bringt — deshalb wird jede Öffnung gezählt. Diese
 * Zahl entscheidet, ob daraus ein Kanal wird oder nur ein nettes Extra.
 *
 * SCHUTZ: Die Kennung ist lang und zufällig, nirgends verzeichnet, die Seite steht auf
 * `noindex`. Zurückziehen darf, wer sie angelegt hat (dasselbe Gerät) — oder der Admin.
 */

const sauber = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// POST { videoUrl, sie, er, datum?, ort?, genId?, device?, email?, lang? } → { id, url }
// POST { revoke: id, device? }                                            → { ok }
// POST { open: id }                                                       → { ok }  (Zähler)
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
    || new URL(request.url).origin;

  /**
   * ÖFFNUNG ZÄHLEN. Bewusst vom Browser gemeldet und nicht beim Ausliefern der Seite: Ein
   * Vorschaubild in WhatsApp, ein Suchroboter oder ein Vorablader würde sonst als Gast zählen,
   * und die eine Zahl, an der die ganze Idee gemessen wird, wäre wertlos.
   */
  const open = sauber(body.open, 60);
  if (open) {
    try {
      const alle = await readEinladungen();
      const e = alle.find(x => x.id === open);
      if (e) {
        e.opens = (e.opens ?? 0) + 1;
        e.lastOpenAt = new Date().toISOString();
        await writeEinladungen(alle);
      }
    } catch { /* eine verlorene Zählung darf die Einladung nie stören */ }
    return NextResponse.json({ ok: true });
  }

  const revoke = sauber(body.revoke, 60);
  if (revoke) {
    const alle = await readEinladungen();
    const e = alle.find(x => x.id === revoke);
    if (!e) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const admin = await isAdminRequest(request).catch(() => false);
    const geraet = sauber(body.device, 80);
    if (!admin && !(geraet && e.device === geraet)) {
      return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    e.revoked = true;
    await writeEinladungen(alle);
    return NextResponse.json({ ok: true });
  }

  const videoUrl = sauber(body.videoUrl, 2000);
  const sie = sauber(body.sie, 40);
  const er = sauber(body.er, 40);
  if (!videoUrl || !sie || !er) {
    return NextResponse.json({ error: "Video und beide Namen sind nötig." }, { status: 400 });
  }

  // Kennung: lang genug, dass sie niemand rät, kurz genug für eine Nachricht.
  const id = `${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
  const eintrag: Einladung = {
    id,
    createdAt: new Date().toISOString(),
    genId: sauber(body.genId, 80) || undefined,
    videoUrl,
    sie, er,
    datum: sauber(body.datum, 10) || undefined,
    ort: sauber(body.ort, 120) || undefined,
    lang: sauber(body.lang, 5) || "en",
    email: sauber(body.email, 160).toLowerCase() || undefined,
    device: sauber(body.device, 80) || undefined,
    opens: 0,
  };
  const alle = await readEinladungen();
  await writeEinladungen([eintrag, ...alle]);
  return NextResponse.json({ ok: true, id, url: `${origin}/einladung/${id}` });
}

// GET (admin) → alle Einladungen mit ihren Öffnungen; GET ?id= → eine einzelne (öffentlich).
export async function GET(request: Request) {
  const id = sauber(new URL(request.url).searchParams.get("id"), 60);
  const alle = await readEinladungen();
  if (id) {
    const e = alle.find(x => x.id === id);
    if (!e || e.revoked) return NextResponse.json({ error: "Not found." }, { status: 404 });
    // Öffentlich, deshalb NUR was auf der Seite steht — keine Adresse, keine Gerätekennung.
    return NextResponse.json({
      id: e.id, videoUrl: e.videoUrl, sie: e.sie, er: e.er,
      datum: e.datum ?? "", ort: e.ort ?? "", lang: e.lang ?? "en",
    });
  }
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  return NextResponse.json({ entries: alle });
}
