import TopNav from "@/components/TopNav";
import { Kicker, H1, Y, Lead } from "@/components/Landing";
import MyTopics from "@/components/MyTopics";

// „Mein Konto" — die EINE Stelle, an der ein Kunde sieht, welche Themen er abonniert hat,
// was sie kosten, wann wieder abgebucht wird, und wo er kündigen kann.
//
// Preisregel (Owner 27.07.2026): 24,50 €/Monat, darin 5 Videos über ALLE Themen zusammen;
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
        <Lead>Everything you bought, in one place — and anything that renews with the cancel button right next to it.</Lead>
        {/**
         * DIE ABO-ZEILE IST WEG (Owner 11.08.2026: „ja" auf den Fund, dass diese Seite noch
         * das Themen-Abo bewirbt).
         *
         * Hier stand „{price} a month: {videos} videos across all topics … instead of {list}" —
         * das Themen-Abo, das es nicht mehr gibt (Owner am selben Tag: „Themenabo haben wir
         * nicht wie Wetter. Wir haben nur Hochzeitplanner"). Dieselbe Leiche wurde heute schon
         * aus den AGB und dem „Was kostet es?"-Abschnitt der Startseite geräumt; diese Seite
         * lag ausserhalb jener Runde.
         *
         * KEINE ERSATZ-PREISZEILE: Was etwas kostet, steht am Produkt — hier steht, was er
         * BESITZT. Eine Preisangabe auf einer Kontoseite ist Werbung am falschen Ort und die
         * nächste Zahl, die eines Tages nicht mehr stimmt.
         */}

        <MyTopics />
      </div>
    </main>
  );
}
