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

      <h2>5. Your data</h2>
      <p>
        We take your privacy seriously. We do <strong>not sell your personal data</strong>, and we
        do <strong>not pass it on to third parties</strong> for their own purposes. We only use the
        data we actually need to run LuxuryBandit — such as your account details and the photo you
        upload for a try-on — and we keep it <strong>only as long as it is needed</strong> for that
        purpose. When your data is no longer needed, we delete it, and you can ask us to delete your
        account and data at any time.
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use cookies to make the site work (for example, to keep you signed in) and to understand,
        in aggregate, how LuxuryBandit is used so we can improve it. We do not use cookies to sell
        your data. You can view, block, or delete cookies at any time in your browser settings —
        though some features may not work without the essential ones.
      </p>

      <h2>7. Liability &amp; changes</h2>
      <p>[Add limitation of liability, governing law, and how terms may change.]</p>

      <p className="mt-6 text-xs text-black/40">Last updated: 2 July 2026</p>
    </InfoPage>
  );
}
