import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi";
import { folgenAnmelden } from "@/lib/kuenstler-follower";
import { folgenBestaetigungPerPost } from "@/lib/versusforge-folgen-post";

/**
 * JEMAND WILL EINEM KÜNSTLER FOLGEN (Owner 13.09.2026).
 *
 * Hier wird NICHTS eingetragen — die Adresse geht in die Warteablage, und an sie geht eine Mail.
 * Erst der Klick darin macht daraus einen Follower.
 *
 * ── DIESELBE ANTWORT IN JEDEM FALL ──────────────────────────────────────────────────────────
 *
 * Ob es den Künstler gibt oder nicht, ob die Adresse schon folgt oder nicht: Die Antwort ist
 * immer `ok`. Sonst verrät diese Route, welche Künstler es gibt und wer ihnen folgt — und wer
 * Namen raten kann, könnte beides abfragen.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const mail = str(b.mail, 200).trim().toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
    return NextResponse.json({ error: "Bitte eine E-Mail-Adresse angeben." }, { status: 400 });
  }

  const m = mandant ? await mandantLesen(mandant) : null;
  /* Nur für freigegebene Künstlerseiten — einer Seite zu folgen, die niemand sehen darf, ergibt
     keinen Sinn, und die Antwort verrät trotzdem nichts. */
  if (m && istKuenstler(m) && m.freigabe === "frei") {
    const token = await folgenAnmelden({ mandant, mail, sprache: String(m.sprache ?? "en") });
    if (token) {
      void folgenBestaetigungPerPost({ an: mail, kuenstler: m.name || mandant, mandant, token, sprache: String(m.sprache ?? "en") })
        .catch(e => console.error("[portal-folgen] Mail gescheitert", e));
    }
  }

  return NextResponse.json({ ok: true });
}
