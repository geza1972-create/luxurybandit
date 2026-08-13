import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { readTryThisLookState } from "@/lib/try-this-look-store";
import { tryonAuslage } from "@/lib/tryon-auslage";
import TryonStartClient from "./TryonStartClient";
import { tryonText } from "@/lib/tryon-i18n";

/**
 * DER TRY-ON ALS TUNNEL-SEITE (Owner 13.08.2026: „wenn ich den tunel bei einem produkt
 * teste muss bei allen gehen. so einfach geht das") — dieselbe Ad-Adresse wie die sechs
 * Geschwister (KONZEPT-TUNNEL.md):
 *
 *   dunkel  /themes/tryon/start
 *   hell    /themes/tryon/start?light=1
 *
 * NUR ZWEI SCHRITTE HIER (siehe `PRODUKTE.tryon` in lib/produkte.ts): 1 Name+E-Mail,
 * 2 Look-Wahl als BildWahl-Slider. Der dritte Schritt IST die bewährte Try-on-Seite
 * (/tryon/<lookId>) — Foto, Erzeugung, Wasserzeichen, Registrier-Tor, Bezahl-Stufen
 * wohnen dort und werden nicht nachgebaut.
 *
 * DIE LOOKS KOMMEN AUS DEM KATALOG, serverseitig gelesen wie überall (readTryThisLookState),
 * mit drei Filtern: sichtbar (nicht hidden), mit Bild — und OHNE Lingerie: die Adresse ist
 * fürs Anzeigen-Publikum (Meta), Boudoir bleibt draussen wie in der „All"-Ansicht des Feeds
 * (Memory `editorial-categories`). Der öffentliche Name ist die Kuratoren-Beschreibung, nie
 * der Markenname (lib/look-title.ts, Memory `no-public-brand-names`).
 *
 * `imageUrl` kann als LEERER STRING hydratisiert sein (Memory
 * `store-hydrates-image-fields-as-empty-string`) — deshalb `||`-Prüfung, nie `??`.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Try on the look | LuxuryBandit",
  description: "Pick a look, upload one photo and see yourself wearing it — free preview.",
  robots: { index: false, follow: true },
};

/* Die Texte wohnen in lib/tryon-i18n.ts — EINE Tabelle für Landingpage UND Tunnel. */

export default async function TryonStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const S = tryonText(L);
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  /* Höchstens 12 Kacheln: der Slider soll eine Auslage sein, kein Katalog — wer mehr will,
     findet ihn auf der Startseite. Die Reihenfolge ist die gepflegte Katalog-Reihenfolge. */
  let looks: { id: string; name: string; bild: string }[] = [];
  try {
    const state = await readTryThisLookState();
    /* DIE GANZE WARDROBE (Owner 13.08.2026, A-List-Screenshot: 97 Sets) — kein kuenstlicher
       Deckel mehr; die Kacheln laden lazy (BildWahlKachel). */
    looks = tryonAuslage(state.looks, 500);
  } catch { /* Speicher nicht erreichbar → der Client zeigt die Leermeldung */ }

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{S.kicker}</Kicker>
        <H1 className="mt-1">{S.h1a}<Y>{S.h1y}</Y>.</H1>
        <div className="mt-4">
          <TryonStartClient lang={L} code={code} looks={looks} schritt2Titel={S.schritt2} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
