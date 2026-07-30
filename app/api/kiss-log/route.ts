import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import { readKissLog, writeKissLog, getSignedUrl, deleteTryThisLookImage, createSignedUploadUrl, readTryThisLookState, type KissLogEntry } from "@/lib/try-this-look-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kiss-Log: der Funnel meldet jede FERTIGE Generierung (POST, öffentlich — der Funnel läuft
// auch anonym); das Admin-Tool auf /themes/kiss listet sie (GET, admin-only).
export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const entries = await readKissLog();
  // Signierte Adressen dazu, damit das Werkzeug die Bilder direkt anzeigen kann.
  /**
   * KATALOG-FRAUEN HABEN KEIN GESPEICHERTES FOTO (Owner 30.07.2026: „wieso sehe ich sein
   * Upload nicht bei SIE"). Gespeichert wird nur, was der Besucher selbst hochlädt — bei
   * einer unserer Frauen wäre das eine sinnlose Kopie. Fürs Werkzeug lösen wir das Foto
   * deshalb beim Anzeigen über die Model-Kennung auf; dann ist die Spalte immer gefüllt.
   */
  const katalog = new Map<string, string>();
  try {
    const st = await readTryThisLookState();
    for (const c of (st.curators ?? []) as { id?: string; photoPath?: string; photoUrl?: string }[]) {
      if (c?.id && (c.photoPath || c.photoUrl)) katalog.set(String(c.id), String(c.photoPath || c.photoUrl));
    }
  } catch { /* ohne Katalog bleibt die Spalte eben leer */ }

  const mitBildern = await Promise.all(entries.map(async e => ({
    ...e,
    imageUrl: e.imagePath ? await getSignedUrl(e.imagePath).catch(() => "") : "",
    personUrl: e.personPath ? await getSignedUrl(e.personPath).catch(() => "") : "",
    modelUrl: e.modelPath
      ? await getSignedUrl(e.modelPath).catch(() => "")
      : await (async () => {
          const p = e.modelId ? katalog.get(String(e.modelId)) : "";
          if (!p) return "";
          return p.startsWith("http") ? p : await getSignedUrl(p).catch(() => "");
        })(),
  })));
  return NextResponse.json({ entries: mitBildern });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { modelId?: string; modelName?: string; videoUrl?: string; remove?: string; update?: string; email?: string; device?: string; imagePath?: string; personPath?: string; personImage?: string; modelImage?: string; modelPath?: string };

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
    for (const pfad of [weg?.imagePath, weg?.personPath, weg?.modelPath]) {
      if (pfad) await deleteTryThisLookImage(pfad).catch(() => {});
    }
    return NextResponse.json({ ok: true, entries });
  }

  // Update: nach der Zahlung liefert der Funnel die ECHTE Video-URL nach (Fake-Flow:
  // Eintrag entsteht beim Teaser ohne URL, das echte Video rendert erst nach dem Kauf).
  if (body.update) {
    const videoUrl = String(body.videoUrl ?? "").trim();
    const imagePath = String(body.imagePath ?? "").trim();
    const modelBild = String(body.modelImage ?? "");
    if (!videoUrl && !imagePath && !modelBild) return NextResponse.json({ error: "nothing to update." }, { status: 400 });
    const entries = await readKissLog();
    const e = entries.find(x => x.id === body.update);
    if (e) {
      if (videoUrl) e.videoUrl = videoUrl;
      if (imagePath.startsWith("try-this-look/")) e.imagePath = imagePath;
      if (modelBild.startsWith("data:") && !e.modelPath) {
        const p2 = await (async () => {
          try {
            const m = /^data:([^;]+);base64,(.+)$/.exec(modelBild.trim());
            if (!m) return "";
            const up = await createSignedUploadUrl("uploads", (m[1].split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, ""));
            const put = await fetch(up.uploadUrl, { method: "PUT", headers: { "Content-Type": m[1], "x-upsert": "true" }, body: new Uint8Array(Buffer.from(m[2], "base64")) });
            return put.ok ? up.path : "";
          } catch { return ""; }
        })();
        if (p2) e.modelPath = p2;
      }
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
  const ablegen = async (dataUrl: string): Promise<string> => {
    try {
      const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl).trim());
      if (!m) return "";
      const up = await createSignedUploadUrl("uploads", (m[1].split("/")[1] ?? "jpg").replace(/[^a-z0-9]/gi, ""));
      const put = await fetch(up.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": m[1], "x-upsert": "true" },
        body: new Uint8Array(Buffer.from(m[2], "base64")),
      });
      return put.ok ? up.path : "";
    } catch { return ""; }   // Ablage ist Zugabe — der Trichter läuft weiter
  };

  let personPath = String(body.personPath ?? "").trim();
  if (!personPath && String(body.personImage ?? "").startsWith("data:")) personPath = await ablegen(String(body.personImage));
  // AUCH DIE FRAU, die er selbst hochgeladen hat (Owner 30.07.2026: „ich sehe das Bild von
  // der Frau nicht, die ich hochgeladen habe").
  let modelPath = String(body.modelPath ?? "").trim();
  if (!modelPath && String(body.modelImage ?? "").startsWith("data:")) modelPath = await ablegen(String(body.modelImage));

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
    modelPath: modelPath.startsWith("try-this-look/") ? modelPath : undefined,
    email: String(body.email ?? "").trim().toLowerCase().slice(0, 160) || undefined,
    device: String(body.device ?? "").trim().slice(0, 80) || undefined,
  };
  const entries = [entry, ...(await readKissLog())];
  await writeKissLog(entries);
  return NextResponse.json({ ok: true, id: entry.id });
}
