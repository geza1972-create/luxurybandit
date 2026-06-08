"use client";

import { ArrowRight, ArrowUpRight, Check, Clock, MessageCircle, ShieldCheck, Store, Tag, TrendingUp, Users } from "lucide-react";

const trustIndicators = ["Private photo processing", "GDPR compliant", "WhatsApp ready", "Lead capture included"];

const socialProof = [
  { value: "25+", label: "Boutiques" },
  { value: "4,000+", label: "Offer Views" },
  { value: "1,200+", label: "WhatsApp Leads" }
];

const funnelSteps = [
  {
    title: "Launch Deal Ad",
    text: "Promote reductions, new drops, and limited boutique offers on Instagram, Facebook, or TikTok."
  },
  {
    title: "Shopper Clicks",
    text: "The shopper clicks because the offer feels time-sensitive and locally available."
  },
  {
    title: "View Offers",
    text: "The shopper sees active deals, action prices, sizes, and product details."
  },
  {
    title: "Reserve via WhatsApp",
    text: "Collect name, contact, size preference, product interest, and WhatsApp intent."
  },
  {
    title: "Boutique Follow-Up",
    text: "The store confirms availability, reserves the item, and converts interest into sales."
  }
];

const resultCards = [
  {
    icon: Tag,
    title: "Deal-Driven Clicks",
    text: "Discounts and limited drops create a stronger reason to click than a generic product post."
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Conversations",
    text: "Turn social traffic into direct conversations with shoppers who want the offer."
  },
  {
    icon: Store,
    title: "More Store Visits",
    text: "Encourage shoppers to reserve online and pick up or try products in person."
  },
  {
    icon: TrendingUp,
    title: "Measurable ROI",
    text: "Track which campaigns produce leads, reservations, and real sales opportunities."
  }
];

const urgencyPoints = [
  "Limited boutique drops",
  "Action prices and reductions",
  "Early WhatsApp access",
  "Size and product interest",
  "Local pickup and reservation"
];

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
              <div className="text-xl font-black">LuxuryBandit Deals</div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-black/45">Boutique offer funnel</div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            <a href="/stores" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 text-sm font-black">
              Watch Demo
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href="/stores" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cobalt px-4 text-sm font-black text-white">
              Start Free Trial
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </nav>
        </header>

        <section className="grid gap-8 border-y border-black/10 py-10 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <div className="inline-flex rounded-full bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-cobalt shadow-soft">
              For Fashion Boutiques
            </div>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[0.95] md:text-7xl">
              Turn boutique deals into WhatsApp leads and store visits.
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-bold leading-8 text-black/58">
              Shoppers click for reductions, limited drops, and early access. LuxuryBandit turns Instagram, Facebook, and TikTok ads into active offer pages where customers view deals, choose sizes, and contact your boutique through WhatsApp.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="/stores" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cobalt px-5 text-sm font-black text-white">
                Start Free Trial
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <a href="/stores" className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-5 text-sm font-black">
                Watch Demo
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
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-[#171310] text-sm font-black text-white">LB</div>
                <div className="text-sm font-black uppercase tracking-[0.26em]">LuxuryBandit Deals</div>
              </div>
              <div className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black/68">
                Local Boutique Drop
              </div>
              <div className="text-6xl font-black leading-none md:text-7xl">
                NEW<br />ARRIVALS
              </div>
              <div className="text-2xl font-black">Up to <span className="text-cobalt">-30%</span></div>
              <p className="max-w-sm text-sm font-bold leading-6 text-black/58">
                Fresh looks from local boutiques. Reserve your size before the offer is gone.
              </p>
              <div className="grid gap-2 text-sm font-black text-black/72">
                <div className="flex items-center gap-3"><Tag aria-hidden="true" className="h-5 w-5 text-cobalt" /> View offers</div>
                <div className="flex items-center gap-3"><Users aria-hidden="true" className="h-5 w-5 text-cobalt" /> Choose your size</div>
                <div className="flex items-center gap-3"><MessageCircle aria-hidden="true" className="h-5 w-5 text-cobalt" /> Order via WhatsApp</div>
              </div>
              <div className="inline-flex h-12 items-center justify-center gap-3 rounded-md bg-cobalt px-5 text-sm font-black text-white">
                View Offers
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
              "The strongest hook is not technology. It is early access to the right offer before the size is gone."
            </p>
            <footer className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-black/40">LuxuryBandit campaign strategy</footer>
          </blockquote>
        </section>

        <section className="grid gap-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">How it works</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">A deal funnel from ad click to WhatsApp reservation.</h2>
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
            <div className="text-xs font-black uppercase tracking-[0.18em] text-cobalt">Results</div>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Turn reductions into measurable boutique sales opportunities.</h2>
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
              <Clock aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Make shoppers feel they need access before the deal is gone.</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-black/56">
              LuxuryBandit helps boutiques create a members-only feeling: the right offer, the right size, and a fast WhatsApp reservation path.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {urgencyPoints.map((point) => (
              <div key={point} className="flex items-center gap-2 rounded-md bg-white p-3 text-sm font-black text-black/60 shadow-soft">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-cobalt" />
                {point}
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-md bg-[#171310] p-6 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-black md:text-4xl">Ready to turn boutique deals into WhatsApp sales?</h2>
            <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/62">
              Launch your first offer campaign in minutes and start collecting qualified shoppers.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/stores" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-cobalt px-5 text-sm font-black text-white">
              Start Free Trial
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
            <a href="/stores" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-[#171310]">
              Book a Demo
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
