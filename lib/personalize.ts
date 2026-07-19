// Platzhalter in Bellas Texten durch die Angaben des Besuchers ersetzen.
//
// Gerry schreibt z. B. „In {Ort} sind es {Grad}° und {Wetter}." — der Besucher trägt
// einmal Name und Ort ein, das Wetter holen wir dazu.

export type PersonVars = {
  name?: string;
  ort?: string;
  grad?: string;
  wetter?: string;
  sonnenaufgang?: string;
  sonnenuntergang?: string;
};

// Was eingesetzt wird, solange der Besucher noch nichts eingetragen hat. Bewusst
// freundliche Wörter statt leerer Lücken — ein Text mit „{Name}" darin sieht kaputt aus.
const FALLBACK: Required<PersonVars> = {
  name: "Darling",
  ort: "deiner Stadt",
  grad: "—",
  wetter: "—",
  sonnenaufgang: "—",
  sonnenuntergang: "—",
};

// Mehrere Schreibweisen pro Wert, damit ein Tippfehler im Admin nicht sofort
// einen rohen Platzhalter auf der Seite hinterlässt.
// Deutsch UND Englisch, weil Gerrys Vorlagen englisch geschrieben sind.
const ALIASES: Record<keyof PersonVars, string[]> = {
  name: ["name", "vorname", "firstname", "first name"],
  ort: ["ort", "stadt", "city", "location", "place", "town"],
  grad: ["grad", "grade", "temperatur", "temperature", "temp", "degrees"],
  wetter: ["wetter", "weather"],
  sonnenaufgang: ["sonnenaufgang", "sunrise"],
  sonnenuntergang: ["sonnenuntergang", "sunset"],
};

export function personalize(text: string, vars: PersonVars): string {
  if (!text || !text.includes("{")) return text;
  let out = text;
  for (const key of Object.keys(ALIASES) as (keyof PersonVars)[]) {
    const value = String(vars[key] ?? "").trim() || FALLBACK[key];
    for (const alias of ALIASES[key]) {
      // {Ort}, {ort}, { Ort } — alles gleich behandeln.
      out = out.replace(new RegExp(`\\{\\s*${alias}\\s*\\}`, "gi"), value);
    }
  }
  return out;
}
