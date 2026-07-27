import TopNav from "@/components/TopNav";
import { Kicker, H1, Y, Lead, Fine } from "@/components/Landing";
import OfferRedeem from "@/components/OfferRedeem";

/**
 * ZIELSEITE für den Aktionscode aus der Meta-Anzeige („Aktionscode einlösen").
 *
 * Warum es sie gibt: Ein Lead, der nur ein Formular ausfüllt, kostet Geld und zahlt nie.
 * Wer hier landet, hat einen Code in der Hand und ist EINEN Tap von der Kasse entfernt —
 * kein Nachfassen, keine Liste, die liegen bleibt.
 *
 * Der Code kommt als `?code=` aus der Anzeige (Meta hängt ihn an die Angebots-URL) oder
 * wird hier eingetippt. Welcher Rabatt dahintersteht, entscheidet der Server.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your code — start with LuxuryBandit | LuxuryBandit",
  description: "Redeem your code and start your topic: daily messages, chat and videos with your AI influencer.",
  robots: { index: false, follow: false },
};

export default async function OfferPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <Kicker>LuxuryBandit · Your code</Kicker>
        <H1>Redeem your <Y>code</Y></H1>
        <Lead>
          Pick the topic you want, enter your code, and you are in: your influencer writes to you
          every day, you chat with her and you make videos with her.
        </Lead>
        <Fine>8 € for the first month, then 49 € a month per topic — cancel any time in your account.</Fine>

        <OfferRedeem initialCode={code} />
      </div>
    </main>
  );
}
