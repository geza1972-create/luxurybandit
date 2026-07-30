import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readKissLog, writeKissLog, getSignedUrl, deleteTryThisLookImage, createSignedUploadUrl, type KissLogEntry } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kiss-Log: der Funnel meldet jede FERTIGE Generierung (POST, öffentlich — der Funnel läuft
// auch anonym); das Admin-Tool auf /themes/kiss listet sie (GET, admin-only).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const entries = await readKissLog();
  // Signierte Adressen dazu, damit das Werkzeug die Bilder direkt anzeigen kann.
  const mitBildern = await Promise.all(entries.map(async e => ({
    ...e,
    imageUrl: e.imagePath ? await getSignedUrl(e.imagePath).catch(() => "") : "",
    personUrl: e.personPath ? await getSignedUrl(e.personPath).catch(() => "") : "",
  })));
  return NextResponse.json({ entries: mitBildern });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; modelName?: string; videoUrl?: string; remove?: string; update?: string; email?: string; device?: string; imagePath?: string; personPath?: string; personImage?: string };

  /**
   * LÖSCHEN — Admin ODER der Besitzer (Owner 30.07.2026: „kann er sie auch löschen?").
   *
   * Besitzer heisst: dasselbe Gerät wie beim Hochladen, oder ein angemeldetes Konto mit
   * derselben E-Mail. Ohne diese Prüfung könnte jeder fremde Bilder löschen, indem er eine
   * Kennung rät.
   */
  if (body.remove) {
    const admin = await isAdminRequest(request).catch(() => false);
    if (!admin) {
      const alleJetzt = await readKissLog();
      const ziel = alleJetzt.find(e => e.id === body.remove);
      const geraet = String(body.device ?? "").trim();
      const konto = await getSellerFromRequest(request).catch(() => null);
      const mail = String(konto?.email ?? "").trim().toLowerCase();
      const darf = !!ziel && (
        (!!geraet && ziel.device === geraet) ||
        (!!mail && String(ziel.email ?? "").toLowerCase() === mail)
      );
      if (!darf) return NextResponse.json({ error: "Not yours." }, { status: 403 });
    }
    const alle = await readKissLog();
    const weg = alle.find(e => e.id === body.remove);
    const entries = alle.filter(e => e.id !== body.remove);
    await writeKissLog(entries);
    // MIT den Dateien löschen (Owner 30.07.2026: „ich lösche die auch"). Bliebe nur die
    // Zeile weg, lägen die Fotos weiter im Speicher — er hätte gelöscht und es wäre nichts
    // gelöscht.
    for (const pfad of [weg?.imagePath, weg?.personPath]) {
      if (pfad) await deleteTryThisLookImage(pfad).catch(() => {});
    }
    return NextResponse.json({ ok: true, entries });
  }

  // Update: nach der Zahlung liefert der Funnel die ECHTE Video-URL nach (Fake-Flow:
  // Eintrag entsteht beim Teaser ohne URL, das echte Video rendert erst nach dem Kauf).
  if (body.update) {
    const videoUrl = String(body.videoUrl ?? "").trim();
    const imagePath = String(body.imagePath ?? "").trim();
    if (!videoUrl && !imagePath) return NextResponse.json({ error: "videoUrl or imagePath required." }, { status: 400 });
    const entries = await readKissLog();
    const e = entries.find(x => x.id === body.update);
    if (e) {
      if (videoUrl) e.videoUrl = videoUrl;
      if (imagePath.startsWith("try-this-look/")) e.imagePath = imagePath;
      await writeKissLog(entries);
    }
    return NextResponse.json({ ok: true });
  }

  /**
   * DAS FOTO WIRD BEIM HOCHLADEN GESPEICHERT, nicht erst beim Ergebnis (Owner 30.07.2026:
   * „das Bild muss gespeichert werden in dem Moment wo er das hochlädt").
   *
   * Sonst sieht man nichts von denen, bei denen die Erzeugung scheitert oder die vorher
   * abspringen — und genau die sind interessant: sie zeigen, was die Leute WOLLTEN.
   */
  let personPath = String(body.personPath ?? "").trim();
  const personImage = String(body.personImage ?? "");
  if (!personPath && personImage.startsWith("data:")) {
    try {
      const m = /^data:([^;]+);base64,(.+)$/.exec(personImage.trim());
      if (m) {
        const up = await createSignedUploadUrl("uploads", (m[1].split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, ""));
        const put = await fetch(up.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": m[1], "x-upsert": "true" },
          body: new Uint8Array(Buffer.from(m[2], "base64")),
        });
        if (put.ok) personPath = up.path;
      }
    } catch { /* Ablage ist Zugabe — der Trichter läuft weiter */ }
  }

  // Neu: eine Generierung (beim Hochladen angelegt, Ergebnis wird nachgetragen).
  const entry: KissLogEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    modelId: String(body.modelId ?? "").trim() || undefined,
    modelName: String(body.modelName ?? "").trim().slice(0, 60) || undefined,
    videoUrl: String(body.videoUrl ?? "").trim() || undefined,
    paid: false,
    imagePath: String(body.imagePath ?? "").trim().startsWith("try-this-look/") ? String(body.imagePath).trim() : undefined,
    personPath: personPath.startsWith("try-this-look/") ? personPath : undefined,
    email: String(body.email ?? "").trim().toLowerCase().slice(0, 160) || undefined,
    device: String(body.device ?? "").trim().slice(0, 80) || undefined,
  };
  const entries = [entry, ...(await readKissLog())];
  await writeKissLog(entries);
  return NextResponse.json({ ok: true, id: entry.id });
}
