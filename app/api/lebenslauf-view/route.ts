import { NextResponse } from "next/server";
import { leseLebenslauf, schreibeLebenslauf } from "@/lib/lebenslauf-store";

export const runtime = "nodejs";

/**
 * DIE EHRLICHEN ZÄHLER (Owner 25.08.2026: „Es müssen irgendwo die Views stehen …
 * Recruiter haben sich deine Bewerbung angeschaut" · „Jemand wollte sich dein Video
 * anschauen. Das wäre doch toll, wenn auf dem Bild ein Play-Button steht und die Meldung
 * kommt: Noch kein Video — aber der Bewerber sieht: 3 Leute wollten dein Video sehen").
 *
 * POST { id, art: "view" | "video" } — zählt einen Seitenaufruf bzw. einen Play-Tipp auf
 * einer Bild-Bewerbung. Der BROWSER entscheidet, ob gezählt wird: Der Beacon feuert nur,
 * wenn die Besitz-Prüfung NEGATIV ausfiel (der Besitzer zählt sich nie selbst). Ein Bot
 * könnte Zähler aufblasen — es sind Vanity-Zähler ohne Geldfolge, die Deckelung (10k)
 * fängt den Unfug. Antwort bewusst leer: Der Zähler gehört dem BESITZER, nicht dem
 * Betrachter.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const art = String(body.art ?? "view");
  if (!id || !["view", "video", "interesse"].includes(art)) return NextResponse.json({ ok: false }, { status: 400 });

  const profil = await leseLebenslauf(id);
  if (!profil || !profil.bezahlt) return NextResponse.json({ ok: true });   // still: kein Orakel für Fremde

  if (art === "view") profil.viewCount = Math.min(10000, (profil.viewCount ?? 0) + 1);
  else if (art === "video") profil.videoKlicks = Math.min(10000, (profil.videoKlicks ?? 0) + 1);
  else profil.interesseKlicks = Math.min(10000, (profil.interesseKlicks ?? 0) + 1);
  await schreibeLebenslauf(profil).catch(() => { /* ein verlorener Zähler ist kein Fehlerfall */ });
  return NextResponse.json({ ok: true });
}
