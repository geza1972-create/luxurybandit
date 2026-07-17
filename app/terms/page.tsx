import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Terms of Service — LuxuryBandit" };

// Plain-language terms reflecting the actual product (influencer marketplace: follow, AI/real chat,
// per-influencer subscription). Not a substitute for a lawyer's review before commercial use.
export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service">
      <p>
        Welcome to LuxuryBandit. By creating an account or using the app you agree to these Terms.
        LuxuryBandit is intended for adults only — <strong>you must be at least 18 years old</strong> to use it.
      </p>

      <h2>1. What LuxuryBandit is</h2>
      <p>
        LuxuryBandit is an entertainment and fashion app — a <strong>marketplace of influencers</strong>.
        You can browse influencers&rsquo; profiles, watch their daily luxury looks,{" "}
        <strong>follow</strong> them, <strong>chat</strong> with them, and <strong>subscribe</strong> to
        an influencer to unlock her <strong>private photos and videos</strong>. Some influencers are
        AI-generated characters and some are real people — it is for fun and inspiration.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for your account and for keeping your login secure. Provide accurate
        information and don&rsquo;t impersonate anyone. We may suspend or remove accounts that break
        these Terms.
      </p>

      <h2>3. Subscriptions &amp; payments</h2>
      <p>
        Browsing and <strong>following</strong> influencers is free. Subscribing to an influencer is a
        paid monthly subscription (currently <strong>$49.99/month, with a discounted first month of $8</strong>)
        that unlocks that influencer&rsquo;s <strong>private photos and videos</strong> and chat. Each
        subscription is <strong>per influencer</strong>. Payments are handled by <strong>Stripe</strong>.
        The subscription <strong>renews automatically</strong> each month until you cancel; you can{" "}
        <strong>cancel anytime</strong> from your account, and cancellation takes effect at the end of the
        current billing period. Except where required by law, payments are non-refundable.
      </p>

      <h2>4. AI-generated content &amp; AI chat</h2>
      <p>
        Some influencers are AI-generated characters and some content and images are created by
        artificial intelligence, provided for your personal, non-commercial entertainment. Chat may be
        with an <strong>AI persona</strong> — an automated assistant styled after an influencer — rather
        than a live conversation with a real person. AI results may contain inaccuracies and should not
        be relied on as real photos or advice.
      </p>

      <h2>5. Models &amp; earnings</h2>
      <p>
        Influencers on LuxuryBandit may be real people or AI-generated characters. Real models{" "}
        <strong>apply for free</strong>, are reviewed before they go live, must be <strong>18+</strong>,
        must use their <strong>own genuine photos</strong>, upload their own content, and follow our model
        rules. Real models <strong>earn a 50% share</strong> of the subscription revenue from their
        subscribers. We may reject or remove any model at our discretion.
      </p>

      <h2>6. Your content</h2>
      <p>
        If you upload photos or videos — for example as a model building your profile — you are
        responsible for them and confirm you have the right to use them, that everyone shown is{" "}
        <strong>18 or older</strong> and consents, and that they don&rsquo;t infringe anyone&rsquo;s
        rights. You grant us the limited permission needed to host and display your content on your
        profile. Don&rsquo;t upload other people&rsquo;s content without consent or anything illegal.
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
        actually need to run LuxuryBandit — such as your account details and, for models, the content you
        upload to your profile — and we keep it <strong>only as long as it is needed</strong>. When your data is no
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

      <p className="mt-6 text-xs text-black/40">Last updated: 17 July 2026</p>
    </InfoPage>
  );
}
