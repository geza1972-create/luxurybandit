"use client";

import { ImageEditor } from "@/components/ImageEditor";
import { Info, Shirt, Sparkles } from "lucide-react";
import { useState } from "react";

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
  const [activeTool, setActiveTool] = useState<"lingerie" | "clothing">("lingerie");
  const toolConfig = activeTool === "lingerie"
    ? {
        title: "Lingerie ecommerce product extractor",
        description: "ShopCut AI is built for sensitive fashion product photos such as lingerie, swimwear, and sexy product images that are often rejected or suppressed by generic AI tools.",
        viewName: "Product",
        activeLabel: "Lingerie Product Extractor"
      }
    : {
        title: "Other clothing product extractor",
        description: "Use the same cutout and retouch workflow for clothing products such as tops, dresses, jackets, pants, swimwear, and accessories.",
        viewName: "Clothing",
        activeLabel: "Other Clothing"
      };

  return (
    <main className="min-h-screen bg-[#fbfaf7]">
      <section className="border-b border-black/10 bg-white">
        <div className="mx-auto grid w-full max-w-[1800px] gap-5 px-6 py-5">
          <div>
            <div className="flex items-center gap-3 text-3xl font-black text-cobalt md:text-4xl">
              <img src="/shopcut-logo.svg" alt="ShopCut AI logo" className="h-16 w-32 rounded-md border border-black/10 bg-white object-cover shadow-soft" />
              ShopCut AI
            </div>
            <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">{toolConfig.title}</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ink/65">
              {toolConfig.description}
            </p>
            <div className="mt-4 max-w-3xl rounded-md border border-black/10 bg-white p-4 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-black text-ink">
                <Info aria-hidden="true" className="h-4 w-4 text-cobalt" />
                How it works
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-md border border-black/10 bg-panel p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">1</div>
                  <p className="mt-3 text-sm font-bold leading-6 text-ink/70">Upload a product photo and mark only the pieces you want to keep.</p>
                </div>
                <div className="rounded-md border border-black/10 bg-panel p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">2</div>
                  <p className="mt-3 text-sm font-bold leading-6 text-ink/70">Create a transparent PNG and copy or edit the AI prompt.</p>
                </div>
                <div className="rounded-md border border-black/10 bg-panel p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">3</div>
                  <p className="mt-3 text-sm font-bold leading-6 text-ink/70">Retouch the cutout into a clean square shop image.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 max-w-3xl rounded-lg border border-black/10 bg-white p-2 shadow-soft">
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setActiveTool("lingerie")}
                  className={`flex min-h-14 items-center gap-3 rounded-md px-3 text-left ${
                    activeTool === "lingerie" ? "bg-ink text-white" : "border border-black/10 bg-panel text-ink/55"
                  }`}
                >
                  <PantyIcon className="h-5 w-5 text-coral" />
                  <span>
                    <span className="block text-sm font-black">Lingerie Product Extractor</span>
                    <span className={`block text-xs font-semibold ${activeTool === "lingerie" ? "text-white/65" : "text-ink/45"}`}>
                      {activeTool === "lingerie" ? "Active tool" : "Switch tool"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTool("clothing")}
                  className={`flex min-h-14 items-center gap-3 rounded-md px-3 text-left ${
                    activeTool === "clothing" ? "bg-ink text-white" : "border border-black/10 bg-panel text-ink/55"
                  }`}
                >
                  <Shirt aria-hidden="true" className="h-5 w-5" />
                  <span>
                    <span className="block text-sm font-black">Other Clothing</span>
                    <span className={`block text-xs font-semibold ${activeTool === "clothing" ? "text-white/65" : "text-ink/45"}`}>
                      {activeTool === "clothing" ? "Active tool" : "Switch tool"}
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
            <div className="mt-4 max-w-3xl rounded-md border border-black/10 bg-panel p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-ink/55">Workflow</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="overflow-hidden rounded-md border border-black/10 bg-white">
                  <img src="/example-before.svg" alt="Upload: source photo with model wearing the product" className="aspect-[3/4] w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-md border border-black/10 bg-white">
                  <img src="/example-mark.svg" alt="Mark: selected product pieces highlighted" className="aspect-[3/4] w-full object-cover" />
                </div>
                <div className="overflow-hidden rounded-md border border-black/10 bg-white">
                  <img src="/example-after.svg" alt="AI image: clean ecommerce product image without model" className="aspect-[3/4] w-full object-cover" />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-[0.14em] text-ink/55">
                <span>Upload</span>
                <span>Mark</span>
                <span>AI Image</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1800px] px-6 py-5">
        <ImageEditor key={toolConfig.viewName} viewName={toolConfig.viewName} />
      </section>
    </main>
  );
}
