import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { trObject } from "@/lib/tr-object";
import { WERBUNG } from "../page";
import GutscheinStartClient from "./GutscheinStartClient";

/**
 * DIE TUNNEL-SEITE DES GUTSCHEINS — EINE EIGENE ADRESSE FÜR DIE ANZEIGEN (KONZEPT-TUNNEL.md,
 * genau das Muster aus `app/themes/versprechen/start/page.tsx`).
 *
 * DIE ÜBERSCHRIFT KOMMT VON DER LANDINGPAGE (`WERBUNG` in `../page.tsx`, dort jetzt
 * exportiert): dieselben drei Zeilen, von Hand gesetzt statt durch die Maschine (Begründung
 * dort) — eine Anzeige, die auf den Tunnel zielt, soll dasselbe Versprechen lesen wie die
 * Landingpage.
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/gutschein/start
 *   hell    /themes/gutschein/start?light=1
 * Ein Aktionscode haengt als `?code=…` (oder `?promo=…`) dahinter.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gift a voucher — as a video card | LuxuryBandit",
  description: "Pick the gift or plain credit, add their email — Bella hands over the card.",
  robots: { index: false, follow: true },
};

export default async function GutscheinStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const W = WERBUNG[L] ?? WERBUNG.en;
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";
  const t = await trObject({ kicker: "LuxuryBandit · Voucher" }, L);

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{t.kicker}</Kicker>
        <H1 className="mt-1">{W.h1a}<Y>{W.h1b}</Y>{W.h1c}</H1>
        <div className="mt-4">
          <GutscheinStartClient lang={L} code={code} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
