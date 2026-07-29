import TopNav from "@/components/TopNav";
import SubscribeCta from "@/components/SubscribeCta";
import PaidReturn from "@/components/PaidReturn";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import ChatFunnel from "@/components/ChatFunnel";
import { getSignedUrl } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
import { trObject } from "@/lib/tr-object";

// THEMA „Chat with an AI girl" — der Chat ist die Hauptsache, das Anziehen die Zugabe.
// Er wählt eine Frau aus dem Katalog oder lädt eine eigene hoch, schreibt täglich mit ihr
// und steckt sie in neue Looks: 24,50 €/Monat inkl. 10 Videos/Looks über ALLE Themen,
// jedes weitere 3,99 €. Chatten ist gratis.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chat with an AI girl — talk every day, dress her in new looks | LuxuryBandit",
  description: "Pick any woman or upload your own photo of her, then text her every day. Your AI girl answers in your language and wears the looks you choose: Chat free; 24,50 €/month for 10 videos & looks across all topics, extra ones 3.99 €.",
  keywords: ["chat with ai girl", "ai girlfriend chat", "ai chat girl", "virtual girlfriend app", "ai companion chat", "ai model chat", "dress up ai model", "ai influencer chat"],
  alternates: { canonical: "/themes/chat" },
};

export default async function ChatThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  // Aktionscode aus der Anzeige — er probiert erst gratis, der Rabatt gilt trotzdem,
  // wenn er später freischaltet.
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);

  // TEXTE: englisch im Code, zur Laufzeit übersetzt (Dauer-Cache) — sonst altert jede
  // Änderung sofort in sieben Sprachen und niemand pflegt es nach.
  const L = await resolveLang();
  const t = await trObject({
    kicker: "LuxuryBandit · Chat",
    h1a: "Chat with an", h1b: "AI girl",
    lead: "Pick one of our models — or upload a photo of the woman you have in mind — and write with her every day. Write in German, English, Romanian, Spanish, French, Italian, Polish — she answers in whatever language you use, and switches the moment you do.",
    fine: "Chatting is free. The subscription is for the pictures and videos: 24,50 € a month gives you 10 generations across ALL topics together. Every one beyond that is 3.99 €. She is an AI character, and she says so herself every so often.",
    codeNote: `Your code ${code.toUpperCase()} is active: chatting is free anyway — when you want the videos, you pay just 24.50 € instead of 49 €, for as long as you stay.`,
    s1h: "Any woman, not just ours",
    s1p: "Our catalogue has 46 models you can start with. If none of them is the one you picture, upload a single photo and give her a name — from that moment she is your AI girl, and she is the one who answers you.",
    s2h: "She speaks your language",
    s2p: "Nearly every language works: start in German and she writes German, switch to English mid-conversation and she follows you. No settings, no language picker — just write the way you normally would.",
    s3h: "She wears what you choose",
    s3p: "Every dress, outfit and lingerie set in our wardrobe can go on her: pick one, and a minute later you have the photo of her in it. They come out of your 25 a month — the same pot you use for videos in every other topic.",
    s4h: "Flirty, but honest",
    s4p: "She flirts, she asks about your day, she teases. What she never does is claim she missed you or that she has feelings — and every so often she reminds you in the chat that she is an AI. That is deliberate: nobody should fall for something that cannot love them back.",
  }, L);

  // Beispiele oben als Slider: echte Ergebnisse aus derselben Anzieh-Pipeline, die der
  // Kunde benutzt. Fehlen sie im Storage, erscheint der Slider einfach nicht.
  const photos = (await Promise.all([
    getSignedUrl("try-this-look/uploads/chat-example-1.jpg").catch(() => ""),
    getSignedUrl("try-this-look/uploads/chat-example-2.jpg").catch(() => ""),
  ])).filter(Boolean) as string[];
  // Dazu VORHANDENE Clips aus dem Bestand (kein neuer Render) — ohne Dessous-Try-ons.
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3007";
  const clips: { id: string; video: string; poster: string }[] = await fetch(`${base}/api/showcase-clips?limit=6`, { cache: "no-store" })
    .then(r => r.json()).then(d => (Array.isArray(d?.items) ? d.items : [])).catch(() => []);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <Kicker>{t.kicker}</Kicker>
        <H1>{t.h1a} <Y>{t.h1b}</Y></H1>
        <Lead>{t.lead}</Lead>
        <PaidReturn lang={L} />
        <Fine>{t.fine}</Fine>

        {(photos.length > 0 || clips.length > 0) && (
          <div className="-mx-4 mt-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {clips.map(c => (
              <div key={c.id} className="w-[62%] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={c.video} poster={c.poster || undefined} muted loop playsInline autoPlay preload="metadata"
                  className="aspect-[3/4] w-full object-cover" />
              </div>
            ))}
            {photos.map((url, i) => (
              <div key={`p${i}`} className="w-[62%] max-w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-[3/4] w-full object-cover object-top" />
              </div>
            ))}
          </div>
        )}

        {code && (
          <p className="mt-4 rounded-2xl border border-[#f6cf51]/40 bg-[#f6cf51]/10 px-4 py-3 text-[13px] font-bold leading-snug text-[#f6cf51]">{t.codeNote}</p>
        )}

        <ChatFunnel code={code} lang={L} />

        <SubscribeCta code={code} lang={L} />

        <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
          <div>
            <SectionTitle>{t.s1h}</SectionTitle>
            <Lead>{t.s1p}</Lead>
          </div>
          <div>
            <SectionTitle>{t.s2h}</SectionTitle>
            <Lead>{t.s2p}</Lead>
          </div>
          <div>
            <SectionTitle>{t.s3h}</SectionTitle>
            <Lead>{t.s3p}</Lead>
          </div>
          <div>
            <SectionTitle>{t.s4h}</SectionTitle>
            <Lead>{t.s4p}</Lead>
          </div>
        </section>
      </div>
    </main>
  );
}
