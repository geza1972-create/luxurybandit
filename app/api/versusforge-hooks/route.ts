import { NextResponse } from "next/server";
import crypto from "crypto";
import { mandantLesen, mandantSpeichern } from "@/lib/versusforge-mandanten";
import { str } from "@/lib/agent-modell";

/**
 * HOOKS HINZUFÜGEN UND WEGNEHMEN (Owner 09.09.2026: „ich brauche noch einen Punkt für Hooks,
 * dort sehe ich meine Bilder, dort kann ich weitere generieren").
 *
 * KEIN MODELLAUFRUF — UND DAS IST ABSICHT. Er schreibt den Satz, das Bild entsteht daraus in
 * einer Zehntelsekunde (`hookBild`: Schrift auf Fläche, kein Bildmodell). Damit kostet ein
 * zweiter, dritter, zehnter Hook nichts, und er kann so lange probieren, bis einer sitzt —
 * genau das, was Hooks brauchen. Ein „von der Engine vorschlagen lassen" ist ein bezahlter
 * Aufruf und deshalb ein eigener Knopf, wenn er ihn will ([[kein-token-fuer-abbrecher]]).
 *
 * GESPEICHERT WIRD NUR DER SATZ, nie das Bild — Begründung am Feld `hooks`.
 *
 * DERSELBE SCHLÜSSEL WIE ÜBERALL, in gleichbleibender Zeit verglichen. Wer den Trichter
 * kennt, darf sonst fremde Anzeigentexte umschreiben.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GRENZE = 20;

function schluesselStimmt(soll: string, ist: string): boolean {
  if (!soll || !ist) return false;
  const a = Buffer.from(soll, "utf8");
  const b = Buffer.from(ist, "utf8");
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const kennung = str(body.mandant, 80);
  const k = str(body.k, 200);

  const m = await mandantLesen(kennung);
  if (!m || !schluesselStimmt(m.schluessel, k)) {
    return NextResponse.json({ error: "Dieser Zugang stimmt nicht." }, { status: 403 });
  }

  const hooks = Array.isArray(m.hooks) ? [...m.hooks] : [];

  if (body.was === "weg") {
    const i = Number(body.nr);
    if (!Number.isInteger(i) || i < 0 || i >= hooks.length) {
      return NextResponse.json({ error: "Diesen Hook gibt es nicht." }, { status: 400 });
    }
    hooks.splice(i, 1);
  } else {
    const hook = str(body.hook, 300).trim();
    /* DIE UNTERGRENZE IST KEIN SCHIKANE: Ein Hook aus drei Zeichen ergibt ein Bild mit einem
       Wort darauf. Wer das postet, verbrennt Werbebudget an einer leeren Fläche. */
    if (hook.length < 12) {
      return NextResponse.json({ error: "Schreib einen ganzen Satz — so steht er nachher im Bild." }, { status: 400 });
    }
    if (hooks.length >= GRENZE) {
      return NextResponse.json({ error: `Mehr als ${GRENZE} Hooks werden unübersichtlich. Lösch zuerst einen.` }, { status: 400 });
    }
    /* Doppelte bringen nichts und machen die Übersicht kaputt. */
    if (hooks.some(h => h.trim().toLowerCase() === hook.toLowerCase())) {
      return NextResponse.json({ error: "Den hast du schon." }, { status: 400 });
    }
    /* Der neueste zuerst — er will sehen, was er gerade geschrieben hat. */
    hooks.unshift(hook);
  }

  const ok = await mandantSpeichern(kennung, { ...m, hooks });
  if (!ok) return NextResponse.json({ error: "Das ging gerade nicht. Bitte gleich noch einmal." }, { status: 502 });
  return NextResponse.json({ ok: true, hooks });
}
