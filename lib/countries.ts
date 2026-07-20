// ISO 3166-1 alpha-2 country codes. Names are derived at runtime via Intl.DisplayNames so we
// don't hardcode a 250-line name table. Used by the influencer application (country autofill)
// and the Model Card (flag + country name).
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ " +
  "CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR " +
  "GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KM " +
  "KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW " +
  "MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD " +
  "SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY " +
  "UZ VA VC VE VN VU WS YE ZA ZM ZW"
).split(" ");

export type CountryOption = { code: string; name: string };

// Sorted { code, name } list (English names). Falls back to raw codes if Intl is unavailable.
export function countryOptions(lang = "en"): CountryOption[] {
  let dn: Intl.DisplayNames | null = null;
  try { dn = new Intl.DisplayNames([lang], { type: "region" }); } catch { dn = null; }
  return COUNTRY_CODES
    .map(code => ({ code, name: (dn?.of(code) || code) as string }))
    .filter(c => c.name && c.name !== c.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ISO-2 → Flaggen-Emoji (RO → 🇷🇴).
export function flagEmoji(code: string): string {
  const cc = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return cc.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

// Telefon-Vorwahl je Land — für die WhatsApp-Nummer. Kein Intl-Weg dafür, also eine
// Tabelle. Fehlt ein Land, bleibt das Feld ohne Vorwahl (Nutzer tippt die volle Nummer).
export const DIAL_CODES: Record<string, string> = {
  RO: "+40", MD: "+373", BG: "+359", HU: "+36", RS: "+381", UA: "+380", DE: "+49", AT: "+43",
  IT: "+39", ES: "+34", FR: "+33", GB: "+44", IE: "+353", NL: "+31", BE: "+32", CH: "+41",
  PL: "+48", CZ: "+420", SK: "+421", HR: "+385", SI: "+386", GR: "+30", PT: "+351", SE: "+46",
  NO: "+47", DK: "+45", FI: "+358", IS: "+354", LT: "+370", LV: "+371", EE: "+372", LU: "+352",
  MT: "+356", CY: "+357", MK: "+389", AL: "+355", BA: "+387", ME: "+382", BY: "+375", RU: "+7",
  US: "+1", CA: "+1", MX: "+52", BR: "+55", AR: "+54", TR: "+90", IL: "+972", SA: "+966",
  AE: "+971", QA: "+974", KW: "+965", EG: "+20", MA: "+212", TN: "+216", DZ: "+213", NG: "+234",
  ZA: "+27", KE: "+254", IN: "+91", PK: "+92", BD: "+880", IR: "+98", IQ: "+964", CN: "+86",
  JP: "+81", KR: "+82", TH: "+66", VN: "+84", PH: "+63", ID: "+62", MY: "+60", SG: "+65",
  AU: "+61", NZ: "+64",
};
export const dialCode = (code: string): string => DIAL_CODES[(code || "").toUpperCase()] || "";
