"use client";

import { ArrowUpRight, HeartHandshake, Instagram, Megaphone, MousePointerClick, Sparkles, Users } from "lucide-react";

const funnelSteps = [
  {
    title: "Social ad",
    text: "The store promotes a new look on Instagram, Facebook, or TikTok."
  },
  {
    title: "Try-on page",
    text: "The customer clicks the link and lands on the store's private try-on page."
  },
  {
    title: "Lead and follow-up",
    text: "The store receives contact details, size interest, and WhatsApp intent."
  }
];

const businessBenefits = [
  {
    icon: Megaphone,
    title: "A real ad funnel",
    text: "Every campaign gets a clear path from social post to measurable customer action."
  },
  {
    icon: Users,
    title: "Better customer data",
    text: "Stores see who tried a look, what they liked, and where to follow up."
  },
  {
    icon: HeartHandshake,
    title: "Customer retention",
    text: "After the first try-on, stores can send new arrivals and personal recommendations."
  }
];

const customerActions = [
  "Clicks the ad link",
  "Chooses a look",
  "Uploads a private photo",
  "Generates the try-on",
  "Contacts the store"
];

export function LuxuryBandiLanding() {
  const appUrl =
    typeof window !== "undefined" && window.location.hostname.includes("localhost")
      ? "/?app=1"
      : "https://app.luxurybandit.com";

  return (
    <main className="min-h-screen bg-[#f7f2ec] text-[#171310]">
      <section className="mx-auto grid w-full max-w-[1400px] gap-8 px-5 py-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-[#171310] text-base font-black text-white shadow-soft">
              LB
            </div>
            <div>
              <div className="text-xl font-black">LuxuryBandit</div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-black/45">Try-on ad funnel</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/stores" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white">
              View demo
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href={appUrl} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black">
              Admin tool
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </header>

        <section className="grid gap-6 border-y border-black/10 py-9 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-cobalt shadow-soft">
              <Sparkles aria-hidden="true" className="h-4 w-4" />
              For fashion stores and boutiques
            </div>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.95] md:text-7xl">
              Turn social ads into customers who try on your looks.
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-black/58">
              LuxuryBandit helps stores sell new arrivals through Instagram, Facebook, and TikTok. A customer sees an ad, clicks a try-on link, uploads a private photo, and contacts the store through WhatsApp or lead capture.
            </p>
          </div>

          <div className="grid gap-3 rounded-md border border-black/10 bg-white p-4 shadow-soft">
            <div className="text-sm font-black uppercase tracking-[0.16em] text-black/45">How it works</div>
            {funnelSteps.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-md bg-[#f7f2ec] p-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cobalt text-sm font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <div className="text-sm font-black">{step.title}</div>
                  <div className="mt-1 text-sm font-bold leading-6 text-black/56">{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-md border border-black/10 bg-white p-4 shadow-soft">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">Example customer journey</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">From Instagram post to store conversation.</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_0.45fr_0.9fr]">
            <article className="overflow-hidden rounded-md border border-black/10 bg-[#f7f2ec]">
              <div className="flex items-center justify-between border-b border-black/10 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-[#171310] text-xs font-black text-white">LB</span>
                  <div>
                    <div className="text-sm font-black">luxuryboutique</div>
                    <div className="text-xs font-bold text-black/45">Sponsored</div>
                  </div>
                </div>
                <Instagram aria-hidden="true" className="h-5 w-5 text-cobalt" />
              </div>
              <div className="grid gap-3 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <img src="/tryout-step-select.svg" alt="Social ad product preview" className="aspect-square rounded-md border border-black/10 bg-white object-cover" />
                  <img src="/tryout-step-result.svg" alt="Social ad try-on preview" className="aspect-square rounded-md border border-black/10 bg-white object-cover" />
                </div>
                <div className="text-lg font-black">New arrivals just landed.</div>
                <p className="text-sm font-bold leading-6 text-black/56">
                  Try this look before you visit the boutique.
                </p>
                <div className="inline-flex items-center justify-center gap-2 rounded-md bg-cobalt px-3 py-3 text-sm font-black text-white">
                  Try this look
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </div>
              </div>
            </article>

            <article className="grid content-center gap-3 rounded-md bg-[#171310] p-4 text-white">
              <MousePointerClick aria-hidden="true" className="h-8 w-8 text-[#85a7ff]" />
              <h3 className="text-2xl font-black">Click</h3>
              <p className="text-sm font-bold leading-6 text-white/62">
                The ad click becomes a measurable funnel visit.
              </p>
            </article>

            <article className="overflow-hidden rounded-md border border-black/10 bg-[#f7f2ec]">
              <div className="border-b border-black/10 bg-white p-3">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-cobalt">Store try-on page</div>
                <h3 className="mt-1 text-xl font-black">Boutique new arrivals</h3>
              </div>
              <div className="grid gap-3 p-3">
                <div className="grid grid-cols-[0.72fr_1fr] gap-3">
                  <img src="/tryout-step-upload.svg" alt="Customer upload preview" className="aspect-square rounded-md border border-black/10 bg-white object-cover" />
                  <div className="grid content-center gap-2">
                    {customerActions.map((action, index) => (
                      <div key={action} className="flex items-center gap-2 rounded-md bg-white p-2 text-xs font-black text-black/60">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-cobalt text-[11px] text-white">
                          {index + 1}
                        </span>
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md bg-white p-3 text-sm font-black text-black/60">
                  Result: lead captured, WhatsApp intent tracked, follow-up ready.
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {businessBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="grid gap-3 rounded-md border border-black/10 bg-white p-4 shadow-soft">
                <Icon aria-hidden="true" className="h-5 w-5 text-cobalt" />
                <h3 className="text-xl font-black">{benefit.title}</h3>
                <p className="text-sm font-bold leading-6 text-black/56">{benefit.text}</p>
              </article>
            );
          })}
        </section>

      </section>
    </main>
  );
}
