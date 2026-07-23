// Tages-VORHERSAGE-Zeile — EINE Quelle für beide Ansichten:
//   • Abonnent (WetterSubscriberView, client) holt sein Wetter aus SEINER Stadt.
//   • Besucher-Beispiel (page.tsx, server) zeigt schon die Vorhersage für die IP-Stadt.
// Sprache pro Nutzer; Emoji ist sprach-neutral. Wetter: Open-Meteo (kein Key, weltweit).
// WICHTIG: neue Sprachen NUR hier ergänzen (WX_WORDS + LINE) — nicht mehr im Component.

// Open-Meteo weather_code → sprach-neutraler Schlüssel + Emoji.
export function wxKey(code: number): { key: string; e: string } {
  if (code === 0) return { key: "clear", e: "☀️" };
  if (code <= 2) return { key: "partly", e: "🌤️" };
  if (code === 3) return { key: "cloudy", e: "☁️" };
  if (code <= 48) return { key: "fog", e: "🌫️" };
  if (code <= 67) return { key: "rain", e: "🌧️" };
  if (code <= 77) return { key: "snow", e: "❄️" };
  if (code <= 82) return { key: "showers", e: "🌦️" };
  if (code <= 99) return { key: "storm", e: "⛈️" };
  return { key: "", e: "🌡️" };
}

// Wetter-Wörter pro Sprache (Emoji ist sprach-neutral).
export const WX_WORDS: Record<string, Record<string, string>> = {
  ro: { clear: "senin", partly: "parțial noros", cloudy: "noros", fog: "ceață", rain: "ploaie", snow: "ninsoare", showers: "averse", storm: "furtună", "": "" },
  en: { clear: "clear", partly: "partly cloudy", cloudy: "cloudy", fog: "fog", rain: "rain", snow: "snow", showers: "showers", storm: "storm", "": "" },
  de: { clear: "klar", partly: "teils bewölkt", cloudy: "bewölkt", fog: "Nebel", rain: "Regen", snow: "Schnee", showers: "Schauer", storm: "Gewitter", "": "" },
  es: { clear: "despejado", partly: "parcialmente nublado", cloudy: "nublado", fog: "niebla", rain: "lluvia", snow: "nieve", showers: "chubascos", storm: "tormenta", "": "" },
  fr: { clear: "dégagé", partly: "partiellement nuageux", cloudy: "nuageux", fog: "brouillard", rain: "pluie", snow: "neige", showers: "averses", storm: "orage", "": "" },
  pt: { clear: "céu limpo", partly: "parcialmente nublado", cloudy: "nublado", fog: "nevoeiro", rain: "chuva", snow: "neve", showers: "aguaceiros", storm: "tempestade", "": "" },
  pl: { clear: "bezchmurnie", partly: "częściowe zachmurzenie", cloudy: "pochmurno", fog: "mgła", rain: "deszcz", snow: "śnieg", showers: "przelotne opady", storm: "burza", "": "" },
  it: { clear: "sereno", partly: "parzialmente nuvoloso", cloudy: "nuvoloso", fog: "nebbia", rain: "pioggia", snow: "neve", showers: "rovesci", storm: "temporale", "": "" },
};

// Vorhersage-Satz pro Sprache: „In <Stadt> heute <Wort> <emoji>, <tief>–<hoch>°[, Regen möglich]."
const LINE: Record<string, (c: string, w: string, e: string, mn: number, mx: number, r: boolean) => string> = {
  ro: (c, w, e, mn, mx, r) => `La ${c} azi ${w} ${e}, ${mn}–${mx}°${r ? ", posibil ploaie" : ""}.`,
  de: (c, w, e, mn, mx, r) => `In ${c} heute ${w} ${e}, ${mn}–${mx}°${r ? ", Regen möglich" : ""}.`,
  en: (c, w, e, mn, mx, r) => `In ${c} today ${w} ${e}, ${mn}–${mx}°${r ? ", rain likely" : ""}.`,
  es: (c, w, e, mn, mx, r) => `En ${c} hoy ${w} ${e}, ${mn}–${mx}°${r ? ", posible lluvia" : ""}.`,
  fr: (c, w, e, mn, mx, r) => `À ${c} aujourd'hui ${w} ${e}, ${mn}–${mx}°${r ? ", pluie possible" : ""}.`,
  pt: (c, w, e, mn, mx, r) => `Em ${c} hoje ${w} ${e}, ${mn}–${mx}°${r ? ", possível chuva" : ""}.`,
  pl: (c, w, e, mn, mx, r) => `W ${c} dziś ${w} ${e}, ${mn}–${mx}°${r ? ", możliwy deszcz" : ""}.`,
  it: (c, w, e, mn, mx, r) => `A ${c} oggi ${w} ${e}, ${mn}–${mx}°${r ? ", possibile pioggia" : ""}.`,
};

// Baut die Vorhersage-Zeile aus fertigen Teilen (Component hat Wort/Emoji schon aus wxKey).
export function forecastLine(lang: string, city: string, word: string, e: string, min: number, max: number, rainy: boolean): string {
  return (LINE[lang] ?? LINE.en)(city, word, e, min, max, rainy);
}

// Serverseitig: Stadt → Koordinaten → Tagesvorhersage → fertige, lokalisierte Zeile.
// Best-effort: null bei jedem Fehler (der Aufrufer blendet die Zeile dann einfach aus).
export async function fetchForecastLine(city: string, lang: string): Promise<{ line: string; city: string } | null> {
  if (!city?.trim()) return null;
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${encodeURIComponent(lang)}&format=json`,
      { next: { revalidate: 604800 } },
    ).then(r => r.json());
    const loc = geo?.results?.[0];
    if (!loc) return null;
    const w = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}`
      + `&current=temperature_2m,weather_code`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
      + `&timezone=auto&forecast_days=1`,
      { next: { revalidate: 900 } },
    ).then(r => r.json());
    const dy = w?.daily, c = w?.current;
    if (!dy && !c) return null;
    const code = Number(dy?.weather_code?.[0] ?? c?.weather_code ?? -1);
    const wk = wxKey(code);
    const max = Math.round(Number(dy?.temperature_2m_max?.[0] ?? c?.temperature_2m ?? 0));
    const min = Math.round(Number(dy?.temperature_2m_min?.[0] ?? c?.temperature_2m ?? 0));
    const rainy = Number(dy?.precipitation_probability_max?.[0] ?? 0) >= 40;
    const words = WX_WORDS[lang] ?? WX_WORDS.en;
    const name = String(loc.name ?? city);
    return { line: forecastLine(lang, name, words[wk.key] ?? "", wk.e, min, max, rainy), city: name };
  } catch {
    return null;
  }
}
