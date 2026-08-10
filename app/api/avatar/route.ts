import { NextResponse } from "next/server";
import { getSellerFromRequest } from "@/lib/supabase-auth-server";
import {
  avatarLesen, avatarMerken, createSignedUploadUrl, getSignedUrl, walletGeraetVertraut,
} from "@/lib/try-this-look-store";

/**
 * DER AVATAR GEHOERT INS PROFIL (Owner 10.08.2026: „Das Avatar muss im Profile gespeichert
 * werden. Der User meldet sich doch an. Basta").
 *
 * WARUM ES DIESE ROUTE BRAUCHT: Bisher entstand der Avatar als NEBENWIRKUNG — beim Anlegen
 * eines Auftrags in `/api/kiss-log` (und nur dort: der `update`-Zweig schrieb ihn nie). Wer
 * sich in einen bestehenden Auftrag neu aufnahm, bekam keinen neuen Avatar; wer gar keinen
 * Auftrag anlegte, nie einen. Ein Besitz des Kontos darf nicht davon abhaengen, ob gerade ein
 * Auftrag entsteht. Hier wird er direkt nach der Aufnahme abgelegt — an das Konto, sonst
 * nichts.
 *
 * WER DARF SCHREIBEN: Die Anmeldung ist der Ausweis (`Authorization: Bearer …`) — sie sticht
 * alles. Ohne sie zaehlt die Adresse nur, wenn dieses Geraet fuer sie schon einmal bezahlt hat
 * (derselbe Riegel wie an der Geldboerse, 26d95b5) ODER wenn es fuer die Adresse noch gar
 * keinen Avatar gibt. Der Grund fuer die dritte Tuer: Der Geburtstags-Trichter fragt nur eine
 * Adresse ab, ohne Anmeldung — sein erster Avatar muss ankommen. Ein FREMDES Gesicht
 * ueberschreiben kann damit trotzdem niemand, der nur eine Adresse kennt.
 *
 * ES GIBT IMMER NUR EINEN. Eine neue Aufnahme ersetzt ihn — Bild und Ton einzeln, wer nur
 * eine neue Tonspur schickt, behaelt sein Bild (`avatarMerken`).
 */

const MAX_BYTES = 4 * 1024 * 1024;   // Vercel nimmt ~4,5 MB an — darunter bleiben wir

async function ablegen(dataUrl: string, art: "bild" | "ton"): Promise<string> {
  const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl ?? "").trim());
  if (!m) return "";
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) return "";
  /* Die Endung aus dem Typ — „image/jpeg" → jpeg, „audio/wav" → wav. Ohne sie liegt die
     Datei ohne Namen da, und die Nachlieferung errät den Inhalt nicht. */
  const endung = (m[1].split("/")[1] ?? (art === "bild" ? "jpg" : "wav")).replace(/[^a-z0-9]/gi, "");
  const up = await createSignedUploadUrl("uploads", endung);
  const put = await fetch(up.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": m[1], "x-upsert": "true" },
    body: new Uint8Array(bytes),
  });
  return put.ok ? up.path : "";
}

/** Wer ist das? Anmeldung zuerst, danach die Adresse mit ihrem Geraete-Riegel. */
async function wer(request: Request, email: string, device: string): Promise<{ adresse: string; angemeldet: boolean }> {
  const konto = await getSellerFromRequest(request).catch(() => null);
  if (konto?.email) return { adresse: konto.email.trim().toLowerCase(), angemeldet: true };
  return { adresse: String(email ?? "").trim().toLowerCase().slice(0, 160), angemeldet: false };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const device = String(body.device ?? "").trim().slice(0, 80);
  const { adresse, angemeldet } = await wer(request, String(body.email ?? ""), device);
  if (!adresse || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse)) {
    return NextResponse.json({ error: "Kein Konto." }, { status: 400 });
  }

  const bild = String(body.bild ?? "");
  const ton = String(body.ton ?? "");
  if (!bild.startsWith("data:") && !ton.startsWith("data:")) {
    return NextResponse.json({ error: "Nichts zu speichern." }, { status: 400 });
  }

  /* Die drei Tueren — siehe Kopf. Ohne eine davon wird nichts angefasst. */
  if (!angemeldet) {
    const vertraut = await walletGeraetVertraut(adresse, device).catch(() => false);
    const schonDa = !!(await avatarLesen(adresse).catch(() => null))?.bildPfad;
    if (!vertraut && schonDa) {
      return NextResponse.json({ error: "Melde dich an, um deinen Avatar zu ersetzen." }, { status: 403 });
    }
  }

  const bildPfad = bild.startsWith("data:") ? await ablegen(bild, "bild").catch(() => "") : "";
  const tonPfad = ton.startsWith("data:") ? await ablegen(ton, "ton").catch(() => "") : "";
  if (!bildPfad && !tonPfad) {
    return NextResponse.json({ error: "Ablage fehlgeschlagen." }, { status: 502 });
  }
  await avatarMerken(adresse, { ...(bildPfad ? { bildPfad } : {}), ...(tonPfad ? { tonPfad } : {}) });

  const a = await avatarLesen(adresse).catch(() => null);
  return NextResponse.json({
    ok: true,
    avatar: a?.bildPfad
      ? { imageUrl: (await getSignedUrl(a.bildPfad).catch(() => "")) || "", stimme: !!a.tonPfad, at: a.at ?? "" }
      : null,
  }, { headers: { "Cache-Control": "no-store" } });
}

/** Sein Avatar zum Anzeigen — Anmeldung reicht, ein Geraet muss dafuer nichts bezahlt haben. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const device = String(url.searchParams.get("device") ?? "").trim().slice(0, 80);
  const { adresse, angemeldet } = await wer(request, url.searchParams.get("email") ?? "", device);
  if (!adresse) return NextResponse.json({ avatar: null });
  if (!angemeldet && !(await walletGeraetVertraut(adresse, device).catch(() => false))) {
    return NextResponse.json({ avatar: null });
  }
  const a = await avatarLesen(adresse).catch(() => null);
  if (!a?.bildPfad) return NextResponse.json({ avatar: null });
  const imageUrl = (await getSignedUrl(a.bildPfad).catch(() => "")) || "";
  return NextResponse.json({ avatar: imageUrl ? { imageUrl, stimme: !!a.tonPfad, at: a.at ?? "" } : null },
    { headers: { "Cache-Control": "no-store" } });
}
