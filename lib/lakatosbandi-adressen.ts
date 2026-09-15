/**
 * DIE ADRESSEN VON LAKATOSBANDI.COM — reine Rechnung, ohne Serverkram, damit auch Browser-Bausteine
 * (Dashboard-Hooks) sie benutzen dürfen. Begründung und Serverteil in lib/lakatosbandi.ts.
 */

export const PORTAL_URL = "https://lakatosbandi.com";

const hostOhnePort = (host?: string | null) => String(host ?? "").split(":")[0].toLowerCase();

export const imPortal = (host?: string | null) => /(^|\.)lakatosbandi\.com$/.test(hostOhnePort(host));
export const aufVersusforge = (host?: string | null) => /(^|\.)versusforge\.com$/.test(hostOhnePort(host));

/** Nur Künstler aus dem Kunst-Rezept tragen `freigabe` — ältere Mandanten bleiben auf versusforge.com. */
export const istKuenstler = (m: { freigabe?: string }) => m.freigabe !== undefined;

export const kuenstlerUrl = (kennung: string) => `${PORTAL_URL}/${encodeURIComponent(kennung)}`;
export const kuenstlerDashboardUrl = (kennung: string, k: string) =>
  `${PORTAL_URL}/${encodeURIComponent(kennung)}/dashboard?k=${encodeURIComponent(k)}`;

export function portalPfade(host?: string | null) {
  const p = imPortal(host);
  const n = (name: string) => encodeURIComponent(name);
  return {
    start: p ? "/" : "/portal",
    login: p ? "/login" : "/portal/login",
    /* Die Preisseite — auf lakatosbandi.com an der Wurzel, sonst unter `/portal` (Owner
       14.09.2026: „Preise hast du nicht veröffentlicht"). Dieselbe Regel wie `login`. */
    preise: p ? "/preise" : "/portal/preise",
    kuenstler: (name: string) => (p ? `/${n(name)}` : `/portal/${n(name)}`),
    /* Das Gespräch mit Name und Telefon — heute der Trichter, später der Käufer-Agent. */
    kontakt: (name: string, h?: string) =>
      `${p ? `/${n(name)}/kontakt` : `/versusforge/${n(name)}`}${h ? `?h=${encodeURIComponent(h)}` : ""}`,
    werkBild: (name: string, i: number) => `/api/portal-werk?m=${n(name)}&i=${i}`,
    /* Das Journal — je Sprache eine eigene Adresse (für Google). */
    journal: (lang: string, slug?: string) => `${p ? "" : "/portal"}/journal/${lang}${slug ? `/${encodeURIComponent(slug)}` : ""}`,
  };
}
