import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import SurpriseFunnel from "@/components/SurpriseFunnel";
import { getSignedUrl } from "@/lib/try-this-look-store";
import { fillPrices } from "@/lib/pricing";

// THEMA „Surprise him" (ehemals City Secrets) — SIE lädt ihr eigenes Foto hoch, zahlt
// 3,99 € und schickt ihm ein privates Video. Gleiches Schema wie überall: Fake-Render →
// Teaser → zahlen → echter Render. Neu ist nur der Versandweg (privater Link per E-Mail).

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Surprise your boyfriend tonight — one private video | LuxuryBandit",
  description: fillPrices("Upload your own photo, and we turn it into a short private video for him: he gets a plain email with a link only he can open. {extra}, nothing is posted anywhere."),
  keywords: ["surprise your boyfriend", "surprise him tonight", "private video for boyfriend", "romantic surprise idea", "ai video from photo", "photo to video ai", "send a private video"],
  alternates: { canonical: "/themes/surprise" },
};

export default async function SurpriseThemePage() {
  // Beispielfoto (Gina in Rot) — liegt im Storage unter diesem festen Pfad. Fehlt es,
  // zeigt die Upload-Karte einfach nur die Aufforderung.
  const example = (await getSignedUrl("try-this-look/uploads/surprise-example.jpg").catch(() => "")) || "";
  // Beispielvideo: genau das, was hinten rauskommt (Gina im roten Set, sie spricht ihn an).
  const exampleVideo = (await getSignedUrl("try-this-look/videos/surprise-example.mp4").catch(() => "")) || "";

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <TrackView event="surprise_view" lookId="themes-surprise" lookName="Surprise-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <div>
            <Kicker>LuxuryBandit · Surprise</Kicker>
            <H1>Surprise him <Y>tonight</Y></H1>
            <Lead>
              One photo of you is enough. Pick a set, type his name — and you say it out loud in a
              short video that is yours to download and send to him yourself.
            </Lead>
            <Fine>
              You decide how much you show. {fillPrices("{extra} per video.")} Nothing is posted anywhere.
            </Fine>

            {/* Das Ergebnis steht GANZ OBEN (Owner): erst sehen, was rauskommt, dann lesen. */}
            {exampleVideo && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video src={exampleVideo} controls loop playsInline preload="metadata" className="aspect-[3/4] w-full object-cover" />
              </div>
            )}

            <SurpriseFunnel example={example} />


            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>How it stays private</SectionTitle>
                <Lead>
                  We do not send it for you and we do not publish it: the video lands as a download
                  on your phone, and you decide who ever sees it. It appears in no feed, no gallery
                  and no profile. Want the file gone from our side too? Write to us and it is deleted.
                </Lead>
              </div>
              <div>
                <SectionTitle>Only for photos of yourself</SectionTitle>
                <Lead>
                  Before anything renders you confirm that the photo shows you and that you are 18 or
                  older. Please keep it that way: making an intimate video of someone else, or passing
                  one on without their consent, is a criminal offence in most countries.
                </Lead>
              </div>
              <div>
                <SectionTitle>She says his name out loud</SectionTitle>
                <Lead>
                  Type his first name and the video speaks it: “Hello Michael, how are you?” — your
                  face, your voice moment, his name. That is what turns a nice clip into something he
                  knows was made for him alone. Nothing generic, no template greeting.
                </Lead>
              </div>
              <div>
                <SectionTitle>A romantic surprise idea that is actually yours</SectionTitle>
                <Lead>
                  Not a template, not a card: it is your photo, moving, in your own light. Upload it,
                  watch the result first, and only then decide whether to send it. Made with the same
                  video AI we use for our AI influencers — the expensive one, so your face stays your face.
                </Lead>
              </div>
            </section>
        </div>
      </div>
    </main>
  );
}
