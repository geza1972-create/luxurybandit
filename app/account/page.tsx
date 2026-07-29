import TopNav from "@/components/TopNav";
import { Kicker, H1, Y, Lead, Fine } from "@/components/Landing";
import MyTopics from "@/components/MyTopics";

// „Mein Konto" — die EINE Stelle, an der ein Kunde sieht, welche Themen er abonniert hat,
// was sie kosten, wann wieder abgebucht wird, und wo er kündigen kann.
//
// Preisregel (Owner 27.07.2026): 24,50 €/Monat, darin 10 Videos über ALLE Themen zusammen;
// jeder bekommt den 50-%-Gutschein dauerhaft (24,50 € statt 49 €). Chatten ist gratis. Mehrere Abos sind möglich,
// deshalb ist das hier eine Liste, kein „Premium: ja/nein".

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My account — your topics & subscriptions | LuxuryBandit",
  description: "See every topic you subscribe to, what it costs, when it renews — and cancel any of them with one tap.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <Kicker>LuxuryBandit · Account</Kicker>
        <H1>My <Y>topics</Y></H1>
        <Lead>Everything you subscribe to, in one place — with the cancel button right next to it.</Lead>
        <Fine>24,50 € a month: 10 videos across all topics, chatting free (50% off, forever — instead of 49 €).</Fine>

        <MyTopics />
      </div>
    </main>
  );
}
