import { createSignedUploadUrl } from "@/lib/try-this-look-store";

/**
 * EIN FOTO (DATA-URL) DAUERHAFT ABLEGEN — ausfaktoriert aus `/api/lebenslauf-fertigstellen`
 * (26.08.2026), weil `/api/lebenslauf-auswertung` denselben Ablage-Weg jetzt für Tür 2
 * braucht (KONZEPT-JOB-MATCH-TRICHTER.md Baustelle E: kein Video-Schritt dort, das Foto
 * muss trotzdem dauerhaft werden, bevor die Trichter-Seite verlassen wird). Zwei Kopien
 * derselben Ablage-Logik sind das Risiko, dass eine repariert wird und die andere nicht
 * (Skill „reuse over new").
 */
export async function fotoAblegen(dataUrl: string): Promise<string> {
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
  } catch { return ""; }   // das Poster ist Zugabe — das Profil wird trotzdem fertig
}
