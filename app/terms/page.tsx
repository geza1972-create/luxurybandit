import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Terms of Service — LuxuryBandit" };

// Plain-language terms reflecting the actual product (AI virtual try-on, AI persona chat, models,
// Premium subscription). Not a substitute for a lawyer's review before large-scale commercial use.
export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service">
      <p>
        Welcome to LuxuryBandit. By creating an account or using the app you agree to these Terms.
        LuxuryBandit is intended for adults only — <strong>you must be at least 18 years old</strong> to use it.
      </p>

      <h2>1. What LuxuryBandit is</h2>
      <p>
        LuxuryBandit is an entertainment and fashion app. You can pick a model and an outfit and let
        our AI generate a short <strong>virtual try-on video</strong> of the model wearing that look,
        browse models&rsquo; profiles, and chat with a model&rsquo;s <strong>AI persona</strong>. It
        is for fun and inspiration — try-on videos are AI-generated and not real footage.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for your account and for keeping your login secure. Provide accurate
        information and don&rsquo;t impersonate anyone. We may suspend or remove accounts that break
        these Terms.
      </p>

      <h2>3. Premium subscription &amp; payments</h2>
      <p>
        Some features are free (including a limited number of try-on videos). <strong>Premium</strong>{" "}
        is a paid monthly subscription (currently $49/month, with a discounted first month) that grants
        a monthly allowance of try-on videos and unlocks additional features. Payments are handled by{" "}
        <strong>Stripe</strong>. The subscription <strong>renews automatically</strong> each month until
        you cancel; you can <strong>cancel anytime</strong> from your account, and cancellation takes
        effect at the end of the current billing period. Except where required by law, payments are
        non-refundable.
      </p>

      <h2>4. AI-generated content &amp; AI chat</h2>
      <p>
        Try-on videos and images are created by artificial intelligence and are provided for your
        personal, non-commercial entertainment. The <strong>chat feature is an AI persona</strong>, not
        a live conversation with a real person — you are messaging an automated assistant styled after
        a model. AI results may contain inaccuracies and should not be relied on as real photos or advice.
      </p>

      <h2>5. Models</h2>
      <p>
        Models on LuxuryBandit may be real people or AI-generated characters. Real models are reviewed
        before they go live. Models must be 18+, use their own genuine photos, and follow our model
        rules; we may reject or remove any model at our discretion.
      </p>

      <h2>6. Your content</h2>
      <p>
        You are responsible for any photo you upload and confirm you have the right to use it. You grant
        us the limited permission needed to process it and generate your try-on. Don&rsquo;t upload other
        people&rsquo;s photos without consent, illegal content, or anything that infringes someone&rsquo;s
        rights.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        Don&rsquo;t misuse the service: no illegal, abusive, harassing, or infringing activity; no
        attempts to break, overload, or reverse-engineer the app; and no using AI outputs to deceive or
        harm others.
      </p>

      <h2>8. Your data</h2>
      <p>
        We take your privacy seriously. We do <strong>not sell your personal data</strong>, and we do{" "}
        <strong>not pass it on to third parties</strong> for their own purposes. We only use the data we
        actually need to run LuxuryBandit — such as your account details and the photo you upload for a
        try-on — and we keep it <strong>only as long as it is needed</strong>. When your data is no
        longer needed, we delete it, and you can ask us to delete your account and data at any time.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use cookies to make the site work (for example, to keep you signed in) and to understand, in
        aggregate, how LuxuryBandit is used so we can improve it. We do not use cookies to sell your
        data. You can view, block, or delete cookies at any time in your browser settings — though some
        features may not work without the essential ones.
      </p>

      <h2>10. Disclaimers &amp; liability</h2>
      <p>
        LuxuryBandit is provided &ldquo;as is&rdquo; for entertainment. To the extent permitted by law,
        we are not liable for indirect or incidental damages, and our total liability is limited to the
        amount you paid us in the 12 months before the claim.
      </p>

      <h2>11. Changes &amp; governing law</h2>
      <p>
        We may update these Terms; we&rsquo;ll post the new version here with an updated date, and
        continued use means you accept the changes. These Terms are governed by the laws of Romania.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions? Reach us via our <a href="/contact">contact form</a>.
      </p>

      <p className="mt-6 text-xs text-black/40">Last updated: 10 July 2026</p>
    </InfoPage>
  );
}
