import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Wetter fuer den Ort des Besuchers — fuer Bellas Texte („{Grad}° und {Wetter}").
//
// Bewusst Open-Meteo: KEIN Schluessel noetig und keine Rechnung. Zwei Aufrufe,
// beide serverseitig zwischengespeichert, damit dieselbe Stadt nicht bei jedem
// Seitenaufruf neu abgefragt wird.
//
// Hinweis: Open-Meteo ist fuer nicht-kommerzielle Nutzung frei. Wenn daraus ein
// bezahltes Produkt wird, braucht es dort einen Tarif.

const CODES: [number[], string][] = [
  [[0], "klar"],
  [[1, 2], "leicht bewölkt"],
  [[3], "bewölkt"],
  [[45, 48], "neblig"],
  [[51, 53, 55, 56, 57], "Nieselregen"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Regen"],
  [[71, 73, 75, 77, 85, 86], "Schnee"],
  [[95, 96, 99], "Gewitter"],
];
const codeToText = (code: number) => CODES.find(([list]) => list.includes(code))?.[1] ?? "wechselhaft";

const hhmm = (iso: string) => {
  const m = String(iso).match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
};

export async function GET(request: Request) {
  const city = new URL(request.url).searchParams.get("city")?.trim().slice(0, 80) ?? "";
  if (!city) return NextResponse.json({ error: "Kein Ort angegeben." }, { status: 400 });

  try {
    // 1) Ort → Koordinaten. Eine Woche zwischenspeichern, Städte ziehen nicht um.
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`,
      { next: { revalidate: 604800 } },
    );
    const geo = await geoRes.json().catch(() => null);
    const place = geo?.results?.[0];
    if (!place) return NextResponse.json({ error: "Ort nicht gefunden." }, { status: 404 });

    // 2) Wetter. 15 Minuten reichen — das ist eine Begrüßung, kein Flugwetterdienst.
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}`
      + `&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=1`,
      { next: { revalidate: 900 } },
    );
    const w = await wRes.json().catch(() => null);
    if (!w?.current) return NextResponse.json({ error: "Wetter nicht verfügbar." }, { status: 502 });

    return NextResponse.json({
      ort: String(place.name ?? city),
      grad: String(Math.round(Number(w.current.temperature_2m ?? 0))),
      wetter: codeToText(Number(w.current.weather_code ?? -1)),
      sonnenaufgang: hhmm(w.daily?.sunrise?.[0] ?? ""),
      sonnenuntergang: hhmm(w.daily?.sunset?.[0] ?? ""),
    });
  } catch {
    return NextResponse.json({ error: "Wetter nicht verfügbar." }, { status: 502 });
  }
}
