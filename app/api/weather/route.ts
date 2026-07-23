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

// Englisch, weil Bellas Beiträge englisch geschrieben sind („it's sunny and 33°").
const CODES: [number[], string][] = [
  [[0], "sunny"],
  [[1, 2], "partly cloudy"],
  [[3], "cloudy"],
  [[45, 48], "foggy"],
  [[51, 53, 55, 56, 57], "drizzly"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "rainy"],
  [[71, 73, 75, 77, 85, 86], "snowy"],
  [[95, 96, 99], "stormy"],
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
      + `&current=temperature_2m,weather_code`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset`
      + `&timezone=auto&forecast_days=1`,
      { next: { revalidate: 900 } },
    );
    const w = await wRes.json().catch(() => null);
    if (!w?.current) return NextResponse.json({ error: "Wetter nicht verfügbar." }, { status: 502 });

    // Für die Morgen-VORHERSAGE: Tages-Wettercode + Hoch/Tief + Regenwahrscheinlichkeit.
    const d = w.daily ?? {};
    const dayCode = Number(d.weather_code?.[0] ?? w.current.weather_code ?? -1);
    const num = (v: unknown) => (v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v)));
    return NextResponse.json({
      ort: String(place.name ?? city),
      grad: String(Math.round(Number(w.current.temperature_2m ?? 0))), // aktuell (Fallback)
      wetter: codeToText(dayCode),                                     // Tageszusammenfassung
      max: num(d.temperature_2m_max?.[0]),
      min: num(d.temperature_2m_min?.[0]),
      regen: num(d.precipitation_probability_max?.[0]),               // % Regenwahrscheinlichkeit (Tag)
      sonnenaufgang: hhmm(d.sunrise?.[0] ?? ""),
      sonnenuntergang: hhmm(d.sunset?.[0] ?? ""),
    });
  } catch {
    return NextResponse.json({ error: "Wetter nicht verfügbar." }, { status: 502 });
  }
}
