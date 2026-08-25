import { NextResponse } from "next/server";
import { leseLebenslauf } from "@/lib/lebenslauf-store";
import { darfAmProfilArbeiten } from "@/lib/lebenslauf-besitz";
import { BESITZ_COOKIE, besitzHinzufuegen } from "@/lib/lebenslauf-besitz-cookie";

export const runtime = "nodejs";

/**
 * DEN BESITZ EINMAL AM SERVER HINTERLEGEN (Owner 25.08.2026: „na gut, und Serversperre").
 *
 * Der Ablauf: Eine unbezahlte Bewerbungsseite liefert einem FREMDEN keinen Inhalt (Sperre
 * in app/lebenslauf/[id]/page.tsx). Der Besitzer sieht deshalb beim ersten Aufruf ebenfalls
 * die Sperrseite — sein Browser meldet sich hier mit der Geräte-Kennung, die Route prüft
 * mit derselben Logik wie alle Werkzeuge (`darfAmProfilArbeiten`) und schreibt ein
 * SIGNIERTES Cookie. Danach kennt der Server ihn und rendert das volle Dossier.
 *
 * Ein Nein wird bewusst nicht begründet: Für einen Fremden soll nicht unterscheidbar sein,
 * ob es die Bewerbung nicht gibt oder ob sie ihm nur nicht gehört.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const id = String(body.id ?? "").trim();
  const device = String(body.device ?? "").trim().slice(0, 80);
  if (!id) return NextResponse.json({ darf: false });

  const profil = await leseLebenslauf(id);
  if (!profil) return NextResponse.json({ darf: false });
  if (!(await darfAmProfilArbeiten(profil, device, request))) return NextResponse.json({ darf: false });

  const vorher = request.headers.get("cookie")?.match(new RegExp(`${BESITZ_COOKIE}=([^;]+)`))?.[1] ?? "";
  const wert = besitzHinzufuegen(decodeURIComponent(vorher), id);

  const res = NextResponse.json({ darf: true });
  res.cookies.set(BESITZ_COOKIE, wert, {
    httpOnly: true,          // kein Zugriff aus dem Seiten-Skript
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
