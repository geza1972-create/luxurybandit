import { NextResponse } from "next/server";
import {
  readGrussState,
  writeGrussState,
  getSignedUrl,
  createSignedUploadUrl,
  uploadTryThisLookBytes,
  type GrussGeneration,
} from "@/lib/try-this-look-store";
import { isAdminRequest } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 300; // zwei fal-Stufen (Person-Swap, dann Lip-Sync) — je 1–3 Minuten

// Grußkarten-PRÜFSTAND (Schritt 1, Herzstück): vorproduzierter Karten-Clip + eigenes
// Foto + selbst aufgenommene Stimme → EIN fertiges Video. Kette komplett über den
// vorhandenen FAL_KEY: fal-ai/pixverse/swap (Person aus dem Foto in den Clip) und
// fal-ai/pixverse/lipsync (Mund auf die eigene Aufnahme synchronisiert).
//
// KOSTENKONTROLLE: genau EINE Generierung pro Klick, kein automatischer Neuversuch.
// Stirbt die Vercel-Funktion beim Warten, holt „resume" das bereits BEZAHLTE Ergebnis
// über die gespeicherten fal-Request-IDs ab — ohne neue Generierung zu starten
// (Dauerregel: bezahlte Aufträge überleben den Browser).

const FAL_QUEUE = "https://queue.fal.run";
const SWAP_ENDPOINT = "fal-ai/pixverse/swap";
const LIPSYNC_ENDPOINT = "fal-ai/pixverse/lipsync";

// Der Wortlaut, den der Nutzer aktiv bestätigt — Server und Seite zeigen DENSELBEN Text.
export const dynamic = "force-dynamic";
const CONSENT_TEXT =
  "Das bin ich selbst auf dem Foto und in der Aufnahme, ich bin 18 Jahre oder älter, und ich darf dieses Bild und diese Stimme verwenden.";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const falHeaders = (key: string, json = false): Record<string, string> =>
  json ? { Authorization: `Key ${key}`, "Content-Type": "application/json" } : { Authorization: `Key ${key}` };

// Auftrag in die fal-Queue legen; gibt die request_id zurück (Ergebnis wird separat abgeholt,
// damit die ID VOR dem Warten persistiert werden kann).
async function falSubmit(key: string, endpoint: string, input: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${FAL_QUEUE}/${endpoint}`, {
    method: "POST",
    headers: falHeaders(key, true),
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => null)) as { request_id?: string; detail?: unknown } | null;
  if (!res.ok || !data?.request_id) {
    const msg = data?.detail ?? `HTTP ${res.status}`;
    throw new Error(`fal ${endpoint}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return data.request_id;
}

// Auf ein fal-Queue-Ergebnis warten. KEIN Neuversuch — bei Fehler oder Zeitüberschreitung
// wird abgebrochen und der Fehler gemeldet.
async function falAwait(key: string, endpoint: string, requestId: string, budgetMs: number): Promise<Record<string, unknown>> {
  const statusUrl = `${FAL_QUEUE}/${endpoint}/requests/${requestId}/status`;
  const resultUrl = `${FAL_QUEUE}/${endpoint}/requests/${requestId}`;
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    await sleep(3000);
    const st = await fetch(statusUrl, { headers: falHeaders(key) });
    const d = (await st.json().catch(() => null)) as { status?: string } | null;
    if (d?.status === "COMPLETED") {
      const res = await fetch(resultUrl, { headers: falHeaders(key) });
      const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok || !payload) throw new Error(`fal ${endpoint}: Ergebnis nicht lesbar (HTTP ${res.status}).`);
      return payload;
    }
    if (st.status >= 400) throw new Error(`fal ${endpoint}: Status-Fehler HTTP ${st.status}.`);
  }
  throw new Error(`fal ${endpoint}: Zeitüberschreitung — „Nachschauen" holt das Ergebnis später ohne Neustart.`);
}

// Kleiner Helfer: Generierung im frisch gelesenen Zustand aktualisieren und speichern.
async function patchGeneration(id: string, patch: Partial<GrussGeneration>): Promise<void> {
  const st = await readGrussState();
  const g = st.generations.find(x => x.id === id);
  if (!g) return;
  Object.assign(g, patch);
  await writeGrussState(st);
}

// Die eigentliche Kette ab dem Punkt, an dem der Datensatz existiert. Wird von „generate"
// UND „resume" benutzt — resume überspringt bereits bezahlte Stufen anhand der Request-IDs.
async function runPipeline(key: string, gen: GrussGeneration): Promise<GrussGeneration> {
  // Stufe 1: Person aus dem Foto in den Karten-Clip tauschen.
  let swapUrl = gen.swapVideoUrl ?? "";
  if (!swapUrl) {
    let swapReqId = gen.swapRequestId ?? "";
    if (!swapReqId) {
      const [videoUrl, imageUrl] = await Promise.all([
        getSignedUrl(
          (await readGrussState()).templates.find(t => t.id === gen.templateId)?.videoPath ?? "",
          60 * 60
        ),
        getSignedUrl(gen.facePath, 60 * 60),
      ]);
      if (!videoUrl) throw new Error("Karten-Video nicht gefunden.");
      if (!imageUrl) throw new Error("Foto nicht gefunden.");
      swapReqId = await falSubmit(key, SWAP_ENDPOINT, {
        video_url: videoUrl,
        image_url: imageUrl,
        mode: "person",
        resolution: "720p",
        original_sound_switch: false, // Ton kommt gleich komplett aus der eigenen Aufnahme
      });
      await patchGeneration(gen.id, { swapRequestId: swapReqId });
    }
    const swapOut = await falAwait(key, SWAP_ENDPOINT, swapReqId, 200_000);
    swapUrl = String((swapOut as { video?: { url?: string } }).video?.url ?? "");
    if (!swapUrl) throw new Error("Swap lieferte kein Video.");
    await patchGeneration(gen.id, { swapVideoUrl: swapUrl });
  }

  // Stufe 2: Mund auf die eigene Aufnahme synchronisieren.
  let lipReqId = gen.lipsyncRequestId ?? "";
  if (!lipReqId) {
    const audioUrl = await getSignedUrl(gen.audioPath, 60 * 60);
    if (!audioUrl) throw new Error("Aufnahme nicht gefunden.");
    lipReqId = await falSubmit(key, LIPSYNC_ENDPOINT, { video_url: swapUrl, audio_url: audioUrl });
    await patchGeneration(gen.id, { lipsyncRequestId: lipReqId });
  }
  const lipOut = await falAwait(key, LIPSYNC_ENDPOINT, lipReqId, 200_000);
  const finalUrl = String((lipOut as { video?: { url?: string } }).video?.url ?? "");
  if (!finalUrl) throw new Error("Lip-Sync lieferte kein Video.");

  // fal-URLs laufen ab → sofort in unser Storage übernehmen.
  const v = await fetch(finalUrl);
  if (!v.ok) throw new Error("Fertiges Video konnte nicht geladen werden.");
  const videoPath = await uploadTryThisLookBytes(
    "videos",
    await v.arrayBuffer(),
    v.headers.get("content-type") || "video/mp4",
    "mp4"
  );
  await patchGeneration(gen.id, { status: "done", videoPath, finishedAt: new Date().toISOString() });
  const st = await readGrussState();
  return st.generations.find(x => x.id === gen.id) ?? { ...gen, status: "done", videoPath };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  const st = await readGrussState();
  const templates = await Promise.all(
    st.templates.map(async t => ({ ...t, videoUrl: await getSignedUrl(t.videoPath).catch(() => "") }))
  );
  const generations = await Promise.all(
    st.generations
      .slice()
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 20)
      .map(async g => ({
        id: g.id,
        at: g.at,
        templateId: g.templateId,
        status: g.status,
        error: g.error,
        finishedAt: g.finishedAt,
        videoUrl: g.videoPath ? await getSignedUrl(g.videoPath).catch(() => "") : "",
      }))
  );
  return NextResponse.json({ templates, generations, consentText: CONSENT_TEXT, consentCount: st.consents.length });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return NextResponse.json({ error: "Admin only." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    kind?: string;
    extension?: string;
    videoPath?: string;
    label?: string;
    script?: string;
    id?: string;
    ids?: string[];
    templateId?: string;
    facePath?: string;
    audioPath?: string;
    consent?: boolean;
    generationId?: string;
  };
  const action = String(body.action ?? "");

  // Signierte Upload-Adresse: große Dateien gehen DIREKT zu Supabase (Vercel kappt ~4,5 MB).
  if (action === "signUpload") {
    const kind = String(body.kind ?? "");
    const allowed: Record<string, { folder: "videos" | "uploads"; exts: string[] }> = {
      video: { folder: "videos", exts: ["mp4", "mov", "webm"] },
      image: { folder: "uploads", exts: ["jpg", "jpeg", "png", "webp"] },
      audio: { folder: "uploads", exts: ["wav", "mp3", "m4a"] },
    };
    const rule = allowed[kind];
    const ext = String(body.extension ?? "").toLowerCase();
    if (!rule || !rule.exts.includes(ext)) return NextResponse.json({ error: "Unerlaubter Dateityp." }, { status: 400 });
    const { path, uploadUrl } = await createSignedUploadUrl(rule.folder, ext);
    return NextResponse.json({ path, uploadUrl });
  }

  if (action === "saveTemplate") {
    const videoPath = String(body.videoPath ?? "").trim();
    const label = String(body.label ?? "").trim().slice(0, 80);
    const script = String(body.script ?? "").trim().slice(0, 400);
    if (!videoPath || !label || !script) return NextResponse.json({ error: "Video, Name und Skript sind Pflicht." }, { status: 400 });
    const st = await readGrussState();
    st.templates.push({ id: crypto.randomUUID(), videoPath, label, script, createdAt: new Date().toISOString() });
    await writeGrussState(st);
    return NextResponse.json({ ok: true });
  }

  if (action === "reorderTemplates") {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    const st = await readGrussState();
    const byId = new Map(st.templates.map(t => [t.id, t]));
    const next = ids.map(id => byId.get(id)).filter(Boolean) as typeof st.templates;
    for (const t of st.templates) if (!ids.includes(t.id)) next.push(t); // nie stillschweigend verlieren
    st.templates = next;
    await writeGrussState(st);
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteTemplate") {
    const id = String(body.id ?? "");
    const st = await readGrussState();
    st.templates = st.templates.filter(t => t.id !== id);
    await writeGrussState(st);
    return NextResponse.json({ ok: true });
  }

  if (action === "generate") {
    const key = process.env.FAL_KEY?.trim();
    if (!key) return NextResponse.json({ error: "FAL_KEY fehlt in .env.local." }, { status: 400 });
    const generationId = String(body.generationId ?? "").trim();
    const templateId = String(body.templateId ?? "").trim();
    const facePath = String(body.facePath ?? "").trim();
    const audioPath = String(body.audioPath ?? "").trim();
    if (!generationId || !templateId || !facePath || !audioPath)
      return NextResponse.json({ error: "Karte, Foto und Aufnahme müssen gespeichert sein." }, { status: 400 });

    // PFLICHT-SCHUTZSCHICHT: ohne aktive Bestätigung keine Generierung. Der Haken ist nie
    // vorausgewählt; die Bestätigung wird mit Zeitstempel protokolliert, BEVOR Geld fließt.
    if (body.consent !== true)
      return NextResponse.json({ error: "Ohne die Bestätigung (18+, eigenes Bild, eigene Stimme) wird nichts generiert." }, { status: 400 });

    const st = await readGrussState();
    if (!st.templates.some(t => t.id === templateId)) return NextResponse.json({ error: "Karte nicht gefunden." }, { status: 404 });

    // Doppelklick-/Doppelkosten-Schutz: dieselbe generationId startet nie zweimal,
    // und solange eine Generierung läuft, startet keine zweite.
    if (st.generations.some(g => g.id === generationId))
      return NextResponse.json({ error: "Diese Generierung wurde bereits gestartet." }, { status: 409 });
    const running = st.generations.find(g => g.status === "running" && Date.now() - Date.parse(g.at) < 10 * 60 * 1000);
    if (running)
      return NextResponse.json({ error: "Es läuft schon eine Generierung — erst fertig werden lassen (oder Nachschauen)." }, { status: 409 });

    st.consents.push({
      id: generationId,
      at: new Date().toISOString(),
      text: CONSENT_TEXT,
      templateId,
      facePath,
      audioPath,
      userAgent: request.headers.get("user-agent") ?? undefined,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
    });
    const gen: GrussGeneration = {
      id: generationId,
      at: new Date().toISOString(),
      templateId,
      facePath,
      audioPath,
      status: "running",
    };
    st.generations.push(gen);
    await writeGrussState(st);

    try {
      const done = await runPipeline(key, gen);
      const videoUrl = done.videoPath ? await getSignedUrl(done.videoPath).catch(() => "") : "";
      return NextResponse.json({ ok: true, videoUrl });
    } catch (e) {
      const msg = (e as Error).message || "Unbekannter Fehler.";
      await patchGeneration(generationId, { status: "failed", error: msg }).catch(() => {});
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  // Bezahltes Ergebnis abholen, falls die Funktion beim Warten gestorben ist.
  // Startet NIE eine neue Generierung — nur weiter-pollen ab den gespeicherten IDs.
  if (action === "resume") {
    const key = process.env.FAL_KEY?.trim();
    if (!key) return NextResponse.json({ error: "FAL_KEY fehlt in .env.local." }, { status: 400 });
    const id = String(body.id ?? "");
    const st = await readGrussState();
    const gen = st.generations.find(g => g.id === id);
    if (!gen) return NextResponse.json({ error: "Generierung nicht gefunden." }, { status: 404 });
    if (gen.status === "done") {
      const videoUrl = gen.videoPath ? await getSignedUrl(gen.videoPath).catch(() => "") : "";
      return NextResponse.json({ ok: true, videoUrl });
    }
    if (!gen.swapRequestId) return NextResponse.json({ error: "Kein fal-Auftrag gespeichert — bitte neu starten." }, { status: 400 });
    try {
      const done = await runPipeline(key, { ...gen, status: "running" });
      const videoUrl = done.videoPath ? await getSignedUrl(done.videoPath).catch(() => "") : "";
      return NextResponse.json({ ok: true, videoUrl });
    } catch (e) {
      const msg = (e as Error).message || "Unbekannter Fehler.";
      await patchGeneration(id, { status: "failed", error: msg }).catch(() => {});
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
