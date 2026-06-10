"use client";

import { ArrowRight, ArrowUpRight, Check, Heart, ImagePlus, MessageCircle, ShieldCheck, Sparkles, Store, Tag, UserRound } from "lucide-react";

const trustIndicators = ["Free listings", "Paid AI upgrades", "Direct buyer contact", "No marketplace lock-in"];

const socialProof = [
  { value: "Free", label: "List an item" },
  { value: "AI", label: "Upgrade product photos" },
  { value: "1 EUR", label: "Unlock real buyer requests" }
];

const funnelSteps = [
  {
    title: "Create a listing",
    text: "Upload real photos from a hanger, rack, boutique, closet, or vintage drop."
  },
  {
    title: "Choose the best first image",
    text: "Use a real product photo, seller photo, or AI model image as the first post image."
  },
  {
    title: "Share the link",
    text: "Post it on Instagram, TikTok, Facebook, WhatsApp groups, or your seller profile."
  },
  {
    title: "Buyer requests the item",
    text: "The buyer chooses size, pickup or delivery, and leaves a phone number."
  },
  {
    title: "Sell direct",
    text: "You keep the contact, confirm payment and delivery, and close the sale yourself."
  }
];

const resultCards = [
  {
    icon: Store,
    title: "Free fashion listings",
    text: "Sellers can start without risk. Listing an item is free, so more real products enter the feed."
  },
  {
    icon: Sparkles,
    title: "Paid AI upgrades",
    text: "AI model photos, try-on previews, and social creatives use credits only when they add value."
  },
  {
    icon: MessageCircle,
    title: "Buyer request revenue",
    text: "A real buyer request can be unlocked for a small fee, instead of charging sellers before demand exists."
  },
  {
    icon: Heart,
    title: "Social demand signals",
    text: "Likes, requests, and shares show which items have traction before a full marketplace is needed."
  }
];

const sellerTypes = ["Private sellers", "Vintage shops", "Fashion boutiques", "Pop-up sellers", "Small designers", "Wardrobe services"];

export function LuxuryBandiLanding() {
  return (
    <main className="min-h-screen bg-[#f7f2ec] text-[#171310]">
      <section className="mx-auto grid w-full max-w-[1440px] gap-10 px-5 py-6 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-[#171310] text-base font-black text-white shadow-soft">
              LB
            </div>
            <div>
              <div className="text-xl font-black">LuxuryBandit</div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-black/45">Direct fashion selling</div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            <a href="/stores" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black">
              View Feed
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href="/admin" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white">
              Start Listing
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </nav>
        </header>

        <section className="grid gap-8 border-y border-black/10 py-10 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-cobalt shadow-soft">
              For sellers, vintage shops, and boutiques
            </div>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.95] md:text-7xl">
              Sell fashion directly from your own listing link.
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-black/58">
              LuxuryBandit is an Instagram-style feed for sellable fashion. List items for free, upgrade photos with AI when you need it, and talk to real buyers directly through WhatsApp or phone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/admin" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cobalt px-5 text-sm font-black text-white">
                List an item
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <a href="/stores" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-5 text-sm font-black">
                See listings
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {trustIndicators.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-black text-black/58 shadow-soft">
                  <Check aria-hidden="true" className="h-4 w-4 text-cobalt" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-black/10 bg-white shadow-soft">
            <div className="grid gap-4 bg-[#f4ede4] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-md bg-[#171310] text-sm font-black text-white">LB</div>
                  <div>
                    <div className="text-sm font-black">milan.vintage</div>
                    <div className="text-xs font-bold text-black/45">Timisoara</div>
                  </div>
                </div>
                <Heart aria-hidden="true" className="h-5 w-5 text-coral" />
              </div>
              <div className="rounded-md bg-white p-4 shadow-soft">
                <div className="grid aspect-[4/5] place-items-center rounded-md bg-[#171310] text-center text-white">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.22em] text-white/58">Sellable post</div>
                    <div className="mt-3 text-4xl font-black leading-none">Vintage<br />Leopard Set</div>
                    <div className="mt-4 inline-flex rounded-full bg-coral px-4 py-2 text-sm font-black">160 EUR</div>
                  </div>
                </div>
              </div>
              <div className="grid gap-2 text-sm font-black text-black/72">
                <div className="flex items-center gap-3"><Tag aria-hidden="true" className="h-5 w-5 text-cobalt" /> Free listing</div>
                <div className="flex items-center gap-3"><ImagePlus aria-hidden="true" className="h-5 w-5 text-cobalt" /> Optional AI model image</div>
                <div className="flex items-center gap-3"><MessageCircle aria-hidden="true" className="h-5 w-5 text-cobalt" /> Buyer request via WhatsApp</div>
              </div>
              <div className="inline-flex h-12 items-center justify-center gap-3 rounded-md bg-cobalt px-5 text-sm font-black text-white">
                Open Listing
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {socialProof.map((item) => (
              <article key={item.label} className="rounded-md border border-black/10 bg-white p-5 shadow-soft">
                <div className="text-4xl font-black text-cobalt">{item.value}</div>
                <div className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-black/45">{item.label}</div>
              </article>
            ))}
          </div>
          <blockquote className="rounded-md border border-black/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold leading-6 text-black/58">
              "The seller should not pay before demand exists. Let them list for free, then monetize AI upgrades and real buyer requests."
            </p>
            <footer className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-black/40">LuxuryBandit platform model</footer>
          </blockquote>
        </section>

        <section className="grid gap-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">How it works</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">From clothing photo to direct buyer contact.</h2>
          </div>
          <div className="grid gap-3 lg:grid-cols-5">
            {funnelSteps.map((step, index) => (
              <article key={step.title} className="relative grid gap-3 rounded-md border border-black/10 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-cobalt text-sm font-black text-white">
                    {index + 1}
                  </span>
                  {index < funnelSteps.length - 1 && <ArrowRight aria-hidden="true" className="hidden h-5 w-5 text-black/25 lg:block" />}
                </div>
                <h3 className="text-lg font-black">{step.title}</h3>
                <p className="text-sm font-bold leading-6 text-black/56">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-5 rounded-md border border-black/10 bg-white p-5 shadow-soft">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">Business model</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Free to start. Paid when value appears.</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {resultCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="grid gap-3 rounded-md bg-[#f7f2ec] p-4">
                  <Icon aria-hidden="true" className="h-5 w-5 text-cobalt" />
                  <h3 className="text-lg font-black">{card.title}</h3>
                  <p className="text-sm font-bold leading-6 text-black/56">{card.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-5 border-y border-black/10 py-8 md:grid-cols-[0.8fr_1fr] md:items-center">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-[#171310] text-white">
              <UserRound aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Built for people selling fashion, not for a platform owning the buyer.</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-black/56">
              LuxuryBandit helps sellers keep the direct relationship. The buyer sees the item, sends a request, and the seller closes the sale without being buried inside a giant marketplace.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sellerTypes.map((point) => (
              <div key={point} className="flex items-center gap-2 rounded-md bg-white p-3 text-sm font-black text-black/60 shadow-soft">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-cobalt" />
                {point}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-md bg-[#171310] p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-black md:text-4xl">Ready to list fashion without handing the buyer to a marketplace?</h2>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/62">
              Start with a free listing, upgrade images with AI when needed, and keep the buyer contact direct.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cobalt px-5 text-sm font-black text-white">
              Create listing
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href="/stores" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#171310]">
              View feed
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
