import Link from "next/link";
import type { Metadata } from "next";
import LandingHeader from "@/components/LandingHeader";

// Public, server-rendered recruiting landing — the one page Google CAN index for
// "become an AI model / devino model" (the /curators/apply form is a client form and
// robots-disallowed, so it can never rank). Bilingual: Romanian default (the model
// audience), English via ?lang=en. Ships JobPosting + FAQPage structured data.

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://luxurybandit.com").replace(/\/$/, "");

type Lang = "ro" | "en";
const pickLang = (v?: string): Lang => (v === "en" ? "en" : "ro");

const T = {
  ro: {
    htmlLang: "ro",
    metaTitle: "Devino Model AI pe LuxuryBandit — Câștigă 50% de acasă",
    metaDesc: "Caut modele! Aplică gratuit cu propria ta poză, încarcă videoclipuri private și câștigă 50% din fiecare abonament al fanilor. Lucrezi de acasă, noi ne ocupăm de tehnologie și plăți.",
    kicker: "Modele căutate",
    h1: "Devino model pe LuxuryBandit",
    sub: "Aplică gratuit cu propria ta poză, publică-ți conținutul privat și păstrează 50% din fiecare abonament. Lucrezi de oriunde — noi ne ocupăm de tehnologie și plăți.",
    cta: "Aplică acum — este gratuit",
    ctaNote: "Gratuit · analizat personal · fără experiență necesară",
    stepsTitle: "Cum funcționează",
    steps: [
      ["Aplici gratuit", "Completezi un formular scurt cu propria ta poză — durează ~2 minute."],
      ["Ești analizată personal", "Echipa noastră verifică fiecare profil. Primești un email când ești aprobată."],
      ["Câștigi", "Fanii se abonează ca să-ți deblocheze lumea privată. Tu păstrezi 50% — automat."],
    ],
    earnTitle: "Cât câștigi",
    earnBody: "Păstrezi 50% din fiecare abonament pe care un fan îl plătește ca să-ți vadă conținutul privat. Banii ajung automat în contul tău. Cu cât mai mulți fani se abonează, cu atât câștigi mai mult — fără plafon.",
    needTitle: "De ce ai nevoie",
    needs: [
      "Propria ta poză (față + o poză din corp întreg).",
      "Să ai peste 18 ani.",
      "Poftă să postezi — noi îți dăm zilnic idei de ținute și videoclipuri.",
    ],
    faqTitle: "Întrebări frecvente",
    faqs: [
      ["Este gratuit să aplic?", "Da, aplicarea este 100% gratuită. Nu plătești nimic ca să devii model LuxuryBandit."],
      ["Am nevoie de experiență?", "Nu. Îți dăm zilnic idei de ținute și videoclipuri — tu doar postezi."],
      ["Cât pot câștiga?", "Păstrezi 50% din fiecare abonament al fanilor tăi. Nu există plafon — depinde de câți fani se abonează."],
      ["Pot lucra de acasă?", "Da, totul se face online, de oriunde. Noi ne ocupăm de tehnologie și de plăți."],
      ["Cum sunt plătită?", "Câștigurile ajung automat în contul tău; retragi prin bancă sau PayPal."],
    ],
    finalCta: "Gata să începi? Aplică gratuit",
  },
  en: {
    htmlLang: "en",
    metaTitle: "Become an AI Model on LuxuryBandit — Earn 50% from home",
    metaDesc: "Models wanted! Apply free with your own photo, upload private videos and keep 50% of every fan subscription. Work from anywhere — we handle the tech and payments.",
    kicker: "Models wanted",
    h1: "Become a LuxuryBandit model",
    sub: "Apply free with your own photo, post your private content and keep 50% of every subscription. Work from anywhere — we handle the tech and payments.",
    cta: "Apply now — it's free",
    ctaNote: "Free · reviewed personally · no experience needed",
    stepsTitle: "How it works",
    steps: [
      ["Apply for free", "Fill in a short form with your own photo — takes about 2 minutes."],
      ["Get reviewed personally", "Our team checks every profile. You get an email once you're approved."],
      ["Earn", "Fans subscribe to unlock your private world. You keep 50% — automatically."],
    ],
    earnTitle: "How much you earn",
    earnBody: "You keep 50% of every subscription a fan pays to unlock your private content. The money lands in your account automatically. The more fans subscribe, the more you earn — no cap.",
    needTitle: "What you need",
    needs: [
      "Your own photo (face + one full-body photo).",
      "To be 18 or older.",
      "The drive to post — we hand you fresh outfit & video ideas every day.",
    ],
    faqTitle: "Frequently asked questions",
    faqs: [
      ["Is it free to apply?", "Yes, applying is 100% free. You never pay anything to become a LuxuryBandit model."],
      ["Do I need experience?", "No. We give you daily outfit and video ideas — you just post."],
      ["How much can I earn?", "You keep 50% of every subscription your fans pay. There's no cap — it depends on how many fans subscribe."],
      ["Can I work from home?", "Yes, everything is done online from anywhere. We handle the tech and the payments."],
      ["How am I paid?", "Earnings land in your account automatically; withdraw via bank or PayPal."],
    ],
    finalCta: "Ready to start? Apply free",
  },
} as const;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const lang = pickLang((await searchParams).lang);
  const t = T[lang];
  const canonical = lang === "en" ? "/models-wanted?lang=en" : "/models-wanted";
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: {
      canonical,
      languages: { ro: "/models-wanted", en: "/models-wanted?lang=en" },
    },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDesc,
      url: canonical,
      type: "website",
      images: [{ url: "/become-a-model-banner.jpg?v=3", width: 1280, height: 720 }],
    },
  };
}

export default async function ModelsWantedPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = pickLang((await searchParams).lang);
  const t = T[lang];
  const today = new Date();
  const validThrough = new Date(today.getTime() + 180 * 864e5);

  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: lang === "en" ? "AI Content Model (remote, from home)" : "Model de conținut AI (remote, de acasă)",
    description: `<p>${t.sub}</p><p>${t.earnBody}</p><ul>${t.needs.map(n => `<li>${n}</li>`).join("")}</ul>`,
    datePosted: today.toISOString().slice(0, 10),
    validThrough: validThrough.toISOString().slice(0, 10),
    employmentType: ["PART_TIME", "CONTRACTOR"],
    hiringOrganization: { "@type": "Organization", name: "LuxuryBandit", sameAs: BASE, logo: `${BASE}/lb-logo.png` },
    jobLocationType: "TELECOMMUTE",
    applicantLocationRequirements: { "@type": "Country", name: lang === "en" ? "Worldwide" : "România" },
    directApply: true,
    url: `${BASE}/models-wanted`,
  };
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  const card = "rounded-2xl border border-black/10 bg-white p-5";
  const otherLang = lang === "en" ? "ro" : "en";

  return (
    <div className="min-h-[100dvh] bg-[#faf7f0] text-slate-900" lang={t.htmlLang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }} />
      <LandingHeader />

      <div className="mx-auto w-full max-w-2xl px-5 pb-24 pt-8">
        {/* Language switch (also gives Google two indexable URLs) */}
        <div className="mb-4 flex justify-end">
          <div className="flex gap-1 rounded-full border border-black/10 bg-white p-1 text-[12px] font-black">
            <span className={`rounded-full px-3 py-1 ${lang === "ro" ? "bg-slate-900 text-white" : "text-slate-500"}`}>{lang === "ro" ? "RO" : <Link href="/models-wanted">RO</Link>}</span>
            <span className={`rounded-full px-3 py-1 ${lang === "en" ? "bg-slate-900 text-white" : "text-slate-500"}`}>{lang === "en" ? "EN" : <Link href="/models-wanted?lang=en">EN</Link>}</span>
          </div>
        </div>

        {/* Hero */}
        <p className="text-[12px] font-black uppercase tracking-[0.2em] text-amber-600">{t.kicker}</p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.08]">{t.h1}</h1>
        <p className="mt-3 text-[15px] font-semibold leading-relaxed text-slate-700">{t.sub}</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/become-a-model-banner.jpg?v=3" alt={t.metaTitle} className="mt-5 w-full rounded-2xl" width={1280} height={720} />

        <Link href="/curators/apply" className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-[0_3px_0_#0f172a,0_6px_14px_rgba(15,23,42,0.28)] active:translate-y-[3px] transition">
          {t.cta}
        </Link>
        <p className="mt-2 text-center text-[12px] font-bold text-slate-500">{t.ctaNote}</p>

        {/* Steps */}
        <h2 className="mt-10 text-[20px] font-black">{t.stepsTitle}</h2>
        <div className="mt-3 grid gap-3">
          {t.steps.map(([title, body], i) => (
            <div key={i} className={card}>
              <p className="text-[13px] font-black text-amber-600">{i + 1}</p>
              <p className="mt-0.5 text-[15px] font-black">{title}</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-600">{body}</p>
            </div>
          ))}
        </div>

        {/* Earnings */}
        <h2 className="mt-10 text-[20px] font-black">{t.earnTitle}</h2>
        <div className={`mt-3 ${card} border-amber-300 bg-amber-50/50`}>
          <p className="text-4xl font-black text-slate-900">50%</p>
          <p className="mt-1 text-[14px] font-semibold leading-relaxed text-slate-700">{t.earnBody}</p>
        </div>

        {/* Needs */}
        <h2 className="mt-10 text-[20px] font-black">{t.needTitle}</h2>
        <ul className="mt-3 grid gap-2">
          {t.needs.map((n, i) => (
            <li key={i} className="flex gap-2 text-[14px] font-semibold text-slate-700"><span className="text-amber-600">✓</span>{n}</li>
          ))}
        </ul>

        {/* FAQ */}
        <h2 className="mt-10 text-[20px] font-black">{t.faqTitle}</h2>
        <div className="mt-3 grid gap-2">
          {t.faqs.map(([q, a], i) => (
            <div key={i} className={card}>
              <p className="text-[14px] font-black text-slate-900">{q}</p>
              <p className="mt-1 text-[13px] font-semibold text-slate-600">{a}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <Link href="/curators/apply" className="mt-10 flex h-14 w-full items-center justify-center rounded-2xl bg-slate-900 text-base font-black text-white shadow-[0_3px_0_#0f172a,0_6px_14px_rgba(15,23,42,0.28)] active:translate-y-[3px] transition">
          {t.finalCta}
        </Link>
        <p className="mt-6 text-center text-[12px] font-semibold text-slate-400">© LuxuryBandit · <Link href={`/models-wanted?lang=${otherLang}`} className="underline">{otherLang.toUpperCase()}</Link></p>
      </div>
    </div>
  );
}
