import { NextResponse } from "next/server";
import { str } from "@/lib/agent-modell";
import { mandantLesen, mandantSpeichern, type WerkInfo } from "@/lib/versusforge-mandanten";
import { istKuenstler } from "@/lib/lakatosbandi";
import { schluesselStimmt } from "@/lib/schluessel-vergleich";
import { introLoeschen, introsVorab } from "@/lib/kuenstler-agent-intro";
import { after } from "next/server";
import { preisZahl } from "@/lib/lakatosbandi-preis";

/**
 * SEINE SEITE SPEICHERN (Owner 11.09.2026: „Dann wird er den Link bekommen, dass er öffnen und es ergänzen
 * kann. Profilbild hochladen, Text über sich …" · „er muss es dort bearbeiten. WYSIWYG").
 *
 * Nur mit seinem Dashboard-Schlüssel. Hier gehen nur TEXTE durch — Name, Ort, Über mich, die Sprüche und
 * Titel · Technik · Größe · Jahr je Kachel. Bilder laufen weiter über `api/versusforge-bild` (mit der
 * Inhaltsprüfung), die Ablage ist dort die Wahrheit.
 *
 * DIE KACHEL-NUMMERN BLEIBEN STABIL: Kachel i gehört zu Motiv Nr. i. Wird eine entfernt, bleibt ihr Platz
 * in `hooks` leer statt nachzurücken — sonst stünde unter Bild 3 plötzlich der Spruch von Bild 4.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mandant = str(b.mandant, 80);
  const m = mandant ? await mandantLesen(mandant) : null;
  if (!m || !istKuenstler(m)) return NextResponse.json({ ok: false }, { status: 404 });
  if (!schluesselStimmt(m.schluessel, str(b.k, 200))) return NextResponse.json({ ok: false }, { status: 403 });

  const zeile = (v: unknown, max: number) => str(v, max).replace(/\s+/g, " ").trim();
  const kacheln = (Array.isArray(b.kacheln) ? b.kacheln : []).slice(0, 13)
    .map(x => (x ?? {}) as Record<string, unknown>)
    .map(x => ({
      i: Math.round(Number(x.i)),
      spruch: zeile(x.spruch, 280),
      info: {
        titel: zeile(x.titel, 120), technik: zeile(x.technik, 120), groesse: zeile(x.groesse, 60), jahr: zeile(x.jahr, 12),
        /* Seine Geschichte zum Werk — Stoff für seinen Agenten (Owner 11.09.2026). */
        geschichte: str(x.geschichte, 800).trim(),
        /* Preis pro Werk, und ob er auf der Seite steht — seine Entscheidung (Owner 11.09.2026: „c"). */
        /* Nur die Zahl — gezeigt wird sie in Euro (Owner 11.09.2026: „die Preise alle in Euro"). */
        preis: preisZahl(x.preis),
        preisZeigen: x.preisZeigen === true,
        detalii: zeile(x.detalii, 160),
      } as WerkInfo,
    }))
    .filter(x => Number.isInteger(x.i) && x.i >= -1 && x.i <= 11);

  const standard = kacheln.find(x => x.i === -1);
  const hoechste = Math.max(-1, ...kacheln.map(x => x.i));
  const hooks = Array.from({ length: hoechste + 1 }, (_, j) => kacheln.find(x => x.i === j)?.spruch ?? "");
  const werkInfo: Record<string, WerkInfo> = {};
  for (const x of kacheln) werkInfo[x.i < 0 ? "standard" : String(x.i)] = x.info;

  const gespeichert = await mandantSpeichern(mandant, {
    ...m,
    name: zeile(b.name, 80) || m.name,
    ort: zeile(b.ort, 80),
    ueberMich: str(b.ueberMich, 1200).trim(),
    profilBild: b.profilBild === true || !!m.profilBild,
    hook: standard?.spruch ?? "",
    hooks,
    werkInfo,
    werkNummern: kacheln.map(x => x.i),
  });
  /* Was sein Agent zu den Werken sagt, wird mit den neuen Angaben neu geschrieben (lib/kuenstler-agent-intro.ts). */
  if (gespeichert) await introLoeschen(mandant);
  /* …und gleich im Hintergrund neu geschrieben, damit der nächste Besucher nicht wartet (Owner 11.09.2026: „er ist zu langsam"). */
  if (gespeichert) after(() => introsVorab(mandant));
  return NextResponse.json({ ok: gespeichert }, { status: gespeichert ? 200 : 502 });
}
