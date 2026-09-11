import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { sendEmail } from "@/lib/email-send";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { str } from "@/lib/agent-modell";

/**
 * FEEDBACK AUS DEM CHAT (Owner 10.09.2026: „ich will, dass die Artists jederzeit ein Feedback abgeben
 * können, damit wir lernen" · „und dass es bei mir auch ankommt, natürlich").
 *
 * ZWEI WEGE, DAMIT NICHTS VERLOREN GEHT: Jede Meldung wird abgelegt (`versusforge-feedback/<Tag>/`)
 * UND geht als Mail an denselben Empfänger wie die Anmelde-Mail. Scheitert einer der beiden, trägt der
 * andere — erst wenn BEIDE scheitern, bekommt der Mensch „hat nicht geklappt".
 *
 * WAS GESPEICHERT WIRD: sein Text, die Sprache, wo er war (Portal oder /engine), die letzte Frage des
 * Agenten — damit man sieht, WO es gehakt hat — und die Gesprächskennung für das Protokoll. Keine
 * Bilder, keine Adresse.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schutz = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = str(b.text, 2000).trim();
  if (text.length < 2) return NextResponse.json({ ok: false, grund: "leer" }, { status: 400 });

  const eintrag = {
    text,
    sprache: str(b.sprache, 8),
    ort: str(b.ort, 60),
    frage: str(b.frage, 600),
    gespraech: str(b.gespraech, 60),
    zeit: new Date().toISOString(),
  };

  const pfad = `versusforge-feedback/${eintrag.zeit.slice(0, 10)}/${eintrag.zeit.slice(11, 19).replace(/:/g, "")}-${randomUUID().slice(0, 8)}.json`;
  const abgelegt = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(pfad)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-upsert": "true" },
    body: JSON.stringify(eintrag),
  }).then(r => r.ok).catch(() => false);
  if (!abgelegt) console.error("[versusforge-feedback] Nicht abgelegt:", pfad);

  const an = (process.env.VERSUSFORGE_ALARM_MAIL ?? process.env.VERSUSFORGE_MAIL ?? process.env.VERSUSFORGE_SMTP_USER ?? "").trim();
  let gemailt = false;
  if (an) {
    const res = await sendEmail({
      konto: "versusforge",
      to: an,
      subject: `FEEDBACK (${eintrag.ort || "Chat"}): ${text.replace(/\s+/g, " ").slice(0, 60)}`,
      html: [
        `<p style="margin:0 0 14px;font-size:17px;white-space:pre-wrap">${schutz(text)}</p>`,
        `<p style="margin:0 0 6px;color:#5b666f">Wo: ${schutz(eintrag.ort || "?")} · Sprache: ${schutz(eintrag.sprache || "?")} · ${schutz(eintrag.zeit)}</p>`,
        eintrag.frage ? `<p style="margin:0 0 6px;color:#5b666f"><b>Letzte Frage des Agenten:</b> ${schutz(eintrag.frage)}</p>` : "",
        eintrag.gespraech ? `<p style="margin:0;color:#8b959d">Gespräch: ${schutz(eintrag.gespraech)}</p>` : "",
      ].join(""),
    });
    gemailt = res.ok;
    if (!res.ok) console.error("[versusforge-feedback] Mail fehlgeschlagen:", res.error);
  } else {
    console.error("[versusforge-feedback] Kein Empfänger gesetzt (VERSUSFORGE_ALARM_MAIL/VERSUSFORGE_MAIL).");
  }

  if (!abgelegt && !gemailt) return NextResponse.json({ ok: false, grund: "fehler" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
