/**
 * KEIN MENSCH — BOTS, VORSCHAU-DIENSTE UND SKRIPTE (Owner 11.09.2026: „du musst schauen, dass die Robots den Agenten
 * nicht unendlich heizen").
 *
 * Eine Liste für alle: die Besuchszählung (`api/versusforge-schritt`) und beide Agenten (`api/versusforge-agent`,
 * `api/kuenstler-agent`). Wer hier hängen bleibt, wird nicht gezählt und löst keinen Modellaufruf aus — ein Aufruf,
 * den kein Mensch liest, ist nur eine Rechnung.
 *
 * OHNE USER-AGENT IST ES KEIN BROWSER: Jeder echte Browser schickt einen. Ein leerer Kopf kommt von Skripten.
 *
 * Das ist eine Bremse gegen die Masse, kein Schloss: Wer sich als Chrome ausgibt, kommt durch — dafür gibt es die
 * Deckel in `lib/versusforge-deckel.ts`.
 */
export const KEIN_MENSCH = /(bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|curl|wget|python|node-fetch|axios|go-http-client|okhttp|java\/|libwww|scrapy|httpclient)/i;

export function keinMensch(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return !ua.trim() || KEIN_MENSCH.test(ua);
}
