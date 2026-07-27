import TopNav from "@/components/TopNav";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
import SurpriseFunnel from "@/components/SurpriseFunnel";
import SurpriseAdmin from "@/components/SurpriseAdmin";
import ManageViewToggle from "@/components/ManageViewToggle";
import { getSignedUrl } from "@/lib/try-this-look-store";

// THEMA „Surprise him" (ehemals City Secrets) — SIE lädt ihr eigenes Foto hoch, zahlt
// 3,99 € und schickt ihm ein privates Video. Gleiches Schema wie überall: Fake-Render →
// Teaser → zahlen → echter Render. Neu ist nur der Versandweg (privater Link per E-Mail).

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Surprise your boyfriend tonight — one private video | LuxuryBandit",
  description: "Upload your own photo, and we turn it into a short private video for him: he gets a plain email with a link only he can open. 3.99 €, nothing is posted anywhere.",
  keywords: ["surprise your boyfriend", "surprise him tonight", "private video for boyfriend", "romantic surprise idea", "ai video from photo", "photo to video ai", "send a private video"],
  alternates: { canonical: "/themes/surprise" },
};

export default async function SurpriseThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const showAdmin = String(sp.admin ?? "") === "1";
  const view = sp.view === "kunde" ? "kunde" : "admin";
  const showCustomer = !showAdmin || view === "kunde";
  // Beispielfoto (Gina in Rot) — liegt im Storage unter diesem festen Pfad. Fehlt es,
  // zeigt die Upload-Karte einfach nur die Aufforderung.
  const example = (await getSignedUrl("try-this-look/uploads/surprise-example.jpg").catch(() => "")) || "";
  // Beispielvideo: genau das, was hinten rauskommt (Gina im roten Set, sie spricht ihn an).
  const exampleVideo = (await getSignedUrl("try-this-look/videos/surprise-example.mp4").catch(() => "")) || "";

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        {showAdmin && <ManageViewToggle view={view} />}

        {showCustomer ? (
          <div className={showAdmin ? "mt-4" : ""}>
            <Kicker>LuxuryBandit · Surprise</Kicker>
            <H1>Surprise him <Y>tonight</Y></H1>
            <Lead>
              One photo of you is enough. We turn it into a short, moving video — and he gets a
              plain email with a link only he can open. No post, no feed, no gallery.
            </Lead>
            <Fine>
              You decide how much you show. 3.99 € per video, and the link disappears after 7 days.
            </Fine>

            <SurpriseFunnel example={example} />

            {exampleVideo && (
              <div className="mt-12">
                <SectionTitle>This is what he gets</SectionTitle>
                <Lead>She looks into the camera and says his name — that is the whole surprise.</Lead>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={exampleVideo} controls loop playsInline preload="metadata" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
            )}

            <section className="mt-14 space-y-8 border-t border-white/10 pt-10">
              <div>
                <SectionTitle>How it stays private</SectionTitle>
                <Lead>
                  The email carries no preview image — if it pops up on his lock screen, there is
                  nothing to see, only a line and a link. The link is a random address nobody can
                  guess, it is not listed anywhere, and it dies after seven days. He can delete it
                  earlier with one tap, and so can you: write to us and the file goes too.
                </Lead>
              </div>
              <div>
                <SectionTitle>Only for photos of yourself</SectionTitle>
                <Lead>
                  Before anything renders you confirm that the photo shows you, that you are 18 or
                  older, and that he wants to receive it. That confirmation is stored with the
                  video. Sending someone else&apos;s intimate picture is a criminal offence in most
                  countries — every email we send says so, and carries a report button that kills
                  the link immediately.
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
        ) : (
          <div className="lb-theme mt-4 space-y-4">
            <SurpriseAdmin />
          </div>
        )}
      </div>
    </main>
  );
}
