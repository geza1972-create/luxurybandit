import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Privacy Policy — LuxuryBandit" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
        ⚠️ Placeholder — replace with your reviewed privacy policy before launch.
      </p>

      <h2>What we collect</h2>
      <p>
        Account details you provide (email, name, taste preferences), photos you upload for
        AI try-ons, and usage data. [List all data categories here.]
      </p>

      <h2>How we use it</h2>
      <p>
        To run the service: sign-in, AI try-ons, curation, messaging, and relevant
        recommendations. [Describe each purpose and legal basis (e.g. GDPR Art. 6).]
      </p>

      <h2>Photos &amp; AI</h2>
      <p>
        Your uploaded and profile photos are used for AI try-ons only with your consent and
        are not used to train third-party models without permission. [Confirm retention and
        deletion.]
      </p>

      <h2>Third parties</h2>
      <p>
        We use service providers for image generation, search, hosting, and affiliate links.
        [List processors and any data transfers.]
      </p>

      <h2>Your rights</h2>
      <p>
        Access, correction, deletion, and objection. [Add how users exercise these rights and
        your contact for data requests.]
      </p>

      <p className="mt-6 text-xs text-black/40">Last updated: [date]</p>
    </InfoPage>
  );
}
