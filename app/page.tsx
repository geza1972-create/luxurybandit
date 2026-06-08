"use client";

import { AccountPanel } from "@/components/AccountPanel";
import { ImageEditor } from "@/components/ImageEditor";
import { LuxuryBandiLanding } from "@/components/LuxuryBandiLanding";
import { OutfitBuilder } from "@/components/OutfitBuilder";
import { SavedImageGallery } from "@/components/SavedImageGallery";
import { getClientWorkspace, type ClientWorkspace } from "@/lib/client-account";
import { Info, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

function PantyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5c2.2 1 4.7 1.5 8 1.5s5.8-.5 8-1.5l-1.8 8.2c-.3 1.3-1.4 2.3-2.7 2.5l-1.9.3L12 14.6l-1.6 3.9-1.9-.3c-1.3-.2-2.4-1.2-2.7-2.5L4 7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4.8 8.1 3.7 5.6M19.2 8.1l1.1-2.5M8.2 8.8l-2 7.4M15.8 8.8l2 7.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<"extractor" | "outfit">("extractor");
  const [showLanding, setShowLanding] = useState(false);
  const [workspace, setWorkspace] = useState<ClientWorkspace | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = window.location.hostname.toLowerCase();
    const isMainLuxuryBandiHost =
      host === "luxurybandit.com" ||
      host === "www.luxurybandit.com";
    setShowLanding(params.get("landing") === "1" || (isMainLuxuryBandiHost && params.get("app") !== "1"));
    if (params.get("tool") === "fashion") setActiveTool("outfit");
    setWorkspace(getClientWorkspace());

    const handleAuthUpdate = () => setWorkspace(getClientWorkspace());
    window.addEventListener("luxurybandit-auth-updated", handleAuthUpdate);
    return () => window.removeEventListener("luxurybandit-auth-updated", handleAuthUpdate);
  }, []);

  if (showLanding) return <LuxuryBandiLanding />;

  const workflowPreview =
    activeTool === "extractor"
      ? [
          {
            src: "/example-before.svg",
            alt: "Upload: source photo with model wearing the apparel",
            label: "Upload"
          },
          {
            src: "/example-mark.svg",
            alt: "Mark: selected apparel pieces highlighted",
            label: "Mark"
          },
          {
            src: "/example-after.svg",
            alt: "AI image: clean ecommerce apparel image without model",
            label: "AI Image"
          }
        ]
      : [
          {
            src: "/tryout-step-select.svg",
            alt: "Choose apparel from saved assets or the LuxuryBandit gallery",
            label: "Choose clothes"
          },
          {
            src: "/tryout-step-upload.svg",
            alt: "Upload model references for the Fashion Creator",
            label: "Upload model references"
          },
          {
            src: "/tryout-step-result.svg",
            alt: "Fashion Creator result with selected clothes on the model reference",
            label: "Design"
          }
        ];

  return (
    <main className="min-h-screen bg-[#fbfaf7]">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto w-full max-w-[1800px] px-6 py-5">
          <div className="grid gap-4">
            <div className="flex items-center gap-3 text-3xl font-black text-cobalt md:text-4xl">
              <div className="grid h-14 w-14 place-items-center rounded-md border border-cobalt/20 bg-cobalt text-xl font-black text-white shadow-soft">
                SC
              </div>
              LuxuryBandit
              {workspace ? (
                <span className="rounded-full border border-cobalt/20 bg-cobalt/10 px-3 py-1 text-xs font-black text-cobalt">
                  Workspace: {workspace.label}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">Fashion Creator</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/65">
              LuxuryBandit extracts apparel from real photos and turns it into Design Ready assets for new fashion creations.
            </p>
            <AccountPanel />
            <SavedImageGallery />
            <div className="rounded-md border border-black/10 bg-white p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-black text-ink">
                <Info aria-hidden="true" className="h-4 w-4 text-cobalt" />
                How it works
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-black/10 bg-panel p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">1</div>
                  <p className="mt-3 text-sm font-bold leading-6 text-ink/70">Upload an apparel photo and mark only the pieces you want to keep.</p>
                </div>
                <div className="rounded-md border border-black/10 bg-panel p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">2</div>
                  <p className="mt-3 text-sm font-bold leading-6 text-ink/70">Create a transparent PNG and copy or edit the AI prompt.</p>
                </div>
                <div className="rounded-md border border-black/10 bg-panel p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">3</div>
                  <p className="mt-3 text-sm font-bold leading-6 text-ink/70">Prepare the selected apparel as a Design Ready image for Fashion Creator.</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-black/10 bg-white p-2 shadow-soft">
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActiveTool("extractor")}
                  className={`flex min-h-14 items-center gap-3 rounded-md px-3 text-left ${
                    activeTool === "extractor" ? "bg-ink text-white" : "border border-black/10 bg-panel text-ink/70"
                  }`}
                >
                  <PantyIcon className={`h-5 w-5 ${activeTool === "extractor" ? "text-coral" : "text-ink/45"}`} />
                  <span>
                    <span className="block text-sm font-black">Apparel Extractor</span>
                    <span className={`block text-xs font-semibold ${activeTool === "extractor" ? "text-white/65" : "text-ink/45"}`}>
                      {activeTool === "extractor" ? "Active tool" : "Create apparel cutouts"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("outfit")}
                  className={`flex min-h-14 items-center gap-3 rounded-md px-3 text-left ${
                    activeTool === "outfit" ? "bg-ink text-white" : "border border-black/10 bg-panel text-ink/70"
                  }`}
                >
                  <img
                    src="/tryout-logo%202.svg"
                    alt=""
                    aria-hidden="true"
                    className={`h-8 w-8 rounded object-cover ${activeTool === "outfit" ? "opacity-100" : "opacity-45 grayscale"}`}
                  />
                  <span>
                    <span className="block text-sm font-black">Fashion Creator</span>
                    <span className={`block text-xs font-semibold ${activeTool === "outfit" ? "text-white/65" : "text-ink/45"}`}>
                      {activeTool === "outfit" ? "Active tool" : "Create fashion designs"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled
                  className="flex min-h-14 items-center gap-3 rounded-md border border-black/10 bg-panel px-3 text-left text-ink/45"
                >
                  <Sparkles aria-hidden="true" className="h-5 w-5" />
                  <span>
                    <span className="block text-sm font-black">More Tools</span>
                    <span className="block text-xs font-semibold">Coming later</span>
                  </span>
                </button>
              </div>
            </div>
            {activeTool === "extractor" ? (
            <div className="flex items-center gap-4 rounded-md border border-black/10 bg-white p-4 shadow-soft">
              <img src="/shopcut-logo.svg" alt="Apparel Extractor logo" className="h-20 w-36 rounded-md border border-black/10 bg-white object-cover shadow-soft" />
              <div>
                <h2 className="text-2xl font-black text-ink md:text-3xl">Apparel Extractor</h2>
                <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-ink/65">
                  Extract apparel from source photos, prepare Design Ready assets, then use them in Fashion Creator.
                </p>
              </div>
            </div>
            ) : (
            <div className="flex items-center gap-4 rounded-md border border-black/10 bg-white p-4 shadow-soft">
              <img src="/tryout-logo%202.svg" alt="Fashion Creator logo" className="h-20 w-36 rounded-md border border-black/10 bg-white object-cover shadow-soft" />
              <div>
                <h2 className="text-2xl font-black text-ink md:text-3xl">Fashion Creator</h2>
                <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-ink/65">
                  Combine saved apparel assets from different photos, select one model, and create a new fashion design image.
                </p>
              </div>
            </div>
            )}
            <div className="rounded-md border border-black/10 bg-panel p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-ink/55">Workflow</div>
              <div className="grid grid-cols-3 gap-2">
                {workflowPreview.map((item) => (
                  <div key={item.label} className="overflow-hidden rounded-md border border-black/10 bg-white">
                    <img src={item.src} alt={item.alt} className="aspect-[3/4] w-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-[0.14em] text-ink/55">
                {workflowPreview.map((item) => (
                  <span key={item.label}>{item.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1800px] px-6 py-5">
        {activeTool === "extractor" ? <ImageEditor viewName="Apparel" onContinueToFashionCreator={() => setActiveTool("outfit")} /> : <OutfitBuilder />}
      </section>
    </main>
  );
}
