import { Playfair_Display } from "next/font/google";

/**
 * DIE TITELSCHRIFT DES RANDLOSEN POSTERS (Owner 29.09.2026, Vorlage „HOLY CRAVINGS"): eine
 * kontrastreiche Didone in Versalien. Playfair Display (OFL) — mit `latin-ext`, damit ă, ș, ț
 * in rumänischen Titeln stimmen.
 */
export const didone = Playfair_Display({ subsets: ["latin", "latin-ext"], weight: ["400", "500"], display: "swap" });
