import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Terms of Service — LuxuryBandit" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service">
      <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
        ⚠️ Placeholder — replace with your reviewed legal text before launch.
      </p>

      <h2>1. Acceptance</h2>
      <p>By using LuxuryBandit you agree to these terms. [Add your full terms here.]</p>

      <h2>2. What LuxuryBandit is</h2>
      <p>
        LuxuryBandit is a curation and discovery service. We link to third-party shops via
        affiliate programs; purchases happen on those shops under their own terms. We do not
        sell, ship, or handle returns ourselves.
      </p>

      <h2>3. Curator accounts</h2>
      <p>
        Curators publish looks and earn a revenue share on what they curate. [Describe eligibility,
        payout terms, content rules, and prohibited content here.]
      </p>

      <h2>4. User content &amp; AI try-ons</h2>
      <p>
        You are responsible for photos you upload. AI try-on images are generated for your
        personal use. [Describe content ownership, licensing, and acceptable use here.]
      </p>

      <h2>5. Liability &amp; changes</h2>
      <p>[Add limitation of liability, governing law, and how terms may change.]</p>

      <p className="mt-6 text-xs text-black/40">Last updated: [date]</p>
    </InfoPage>
  );
}
