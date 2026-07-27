import TopNav from "@/components/TopNav";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import ChatFunnel from "@/components/ChatFunnel";

// THEMA „Chat with an AI girl" — der Chat ist die Hauptsache, das Anziehen die Zugabe.
// Er wählt eine Frau aus dem Katalog oder lädt eine eigene hoch, schreibt täglich mit ihr
// und steckt sie in neue Looks: 24 €/Monat inkl. 5 Looks, jeder weitere 3,99 €.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat with an AI girl — talk every day, dress her in new looks | LuxuryBandit",
  description: "Pick any woman or upload your own photo of her, then text her every day. Your AI girl answers in your language and wears the looks you choose: 24 € a month incl. 5 looks, every extra look 3.99 €.",
  keywords: ["chat with ai girl", "ai girlfriend chat", "ai chat girl", "virtual girlfriend app", "ai companion chat", "ai model chat", "dress up ai model", "ai influencer chat"],
  alternates: { canonical: "/themes/chat" },
};

export default function ChatThemePage() {
  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <Kicker>LuxuryBandit · Chat</Kicker>
        <H1>Chat with an <Y>AI girl</Y></H1>
        <Lead>
          Pick one of our models — or upload a photo of the woman you have in mind — and write
          with her every day. Write in German, English, Romanian, Spanish, French, Italian,
          Polish — she answers in whatever language you use, and switches the moment you do.
        </Lead>
        <Fine>
          24 € a month: chat every day — up to 200 messages a day, which is roughly two hours of
          talking — plus 5 new looks on her. Every look after that is 3.99 €. She is an AI
          character, and she says so herself every so often.
        </Fine>

        <ChatFunnel />

        <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
          <div>
            <SectionTitle>Any woman, not just ours</SectionTitle>
            <Lead>
              Our catalogue has 46 models you can start with. If none of them is the one you picture,
              upload a single photo and give her a name — from that moment she is your AI girl, and
              she is the one who answers you.
            </Lead>
          </div>
          <div>
            <SectionTitle>She speaks your language</SectionTitle>
            <Lead>
              Nearly every language works: start in German and she writes German, switch to English
              mid-conversation and she follows you. No settings, no language picker — just write the
              way you normally would.
            </Lead>
          </div>
          <div>
            <SectionTitle>She wears what you choose</SectionTitle>
            <Lead>
              Every dress, outfit and lingerie set in our wardrobe can go on her: pick one, and a
              minute later you have the photo of her in it. Five of those are included every month,
              each extra one is 3.99 € — and you can show them to her in the chat.
            </Lead>
          </div>
          <div>
            <SectionTitle>Flirty, but honest</SectionTitle>
            <Lead>
              She flirts, she asks about your day, she teases. What she never does is claim she
              missed you or that she has feelings — and every so often she reminds you in the chat
              that she is an AI. That is deliberate: nobody should fall for something that cannot
              love them back.
            </Lead>
          </div>
        </section>
      </div>
    </main>
  );
}
