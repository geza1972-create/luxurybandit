import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Privacy Policy — LuxuryBandit" };

// Plain-language privacy policy matching the actual product (AI try-on, AI-persona chat,
// Premium subscription). Not a lawyer's review, but accurate. Update the processor list if the
// stack changes.
export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p>
        This policy explains what data LuxuryBandit collects and how we use it. LuxuryBandit is for
        adults (18+). If you have any question, reach us via our{" "}
        <a href="/contact">contact form</a>.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Account:</strong> your email and display name.<br />
        <strong>Photos:</strong> images you upload for an AI try-on, and (for models) profile photos.<br />
        <strong>Chat:</strong> messages you send in the AI chat.<br />
        <strong>Payments:</strong> if you subscribe, our payment provider (Stripe) processes your card —
        we never see or store your full card details.<br />
        <strong>Usage:</strong> basic, mostly aggregate data about how the app is used, plus cookies
        (see below).
      </p>

      <h2>How we use it (and why)</h2>
      <p>
        To <strong>provide the service</strong> — sign-in, generating your try-on videos, chat, and
        model profiles (to perform our agreement with you); to <strong>process payments</strong> for
        Premium (contract); to <strong>keep the service secure and improve it</strong> (our legitimate
        interest); and, <strong>only with your consent</strong>, for marketing measurement (the Meta
        Pixel). Where the law requires it (e.g. GDPR Art. 6), consent can be withdrawn at any time.
      </p>

      <h2>Photos &amp; AI</h2>
      <p>
        Photos you upload are used to generate your try-on and are <strong>not</strong> used to train
        third-party AI models for their own purposes. You can delete your content and account at any
        time (see <a href="/data-deletion">Data deletion</a>).
      </p>
      {/* Owner 30.07.2026, nach „kann man das nachvollziehen?": Bis hierher stand hier nur, wozu
          die Fotos benutzt werden — nicht, dass sie GESPEICHERT werden, wie lange und wer sie
          sieht. Genau das ist der Teil, den ein Besucher wissen muss. */}
      <p>
        <strong>We store them.</strong> Your uploaded photo, the photo of the person you picked, and
        the generated picture or video are saved on our hosting provider&rsquo;s servers{" "}
        <strong>in the EU</strong> — so we can create your result, keep it in your gallery, and look
        into misuse. They are never published and never shown to other users; only our team can view
        them. Photos and results from visits <strong>without a purchase are deleted after 90
        days</strong>; what you paid for stays until you delete it.
      </p>
      <p>
        <strong>News &amp; offers by email.</strong> If you enter your email address to receive your
        picture, you also agree that we may send you news and offers — new topics, new models and
        price offers. Every email has a one-click unsubscribe link, and you can withdraw at any
        time; it does not affect anything you already bought.
      </p>

      <h2>Cookies &amp; the Meta Pixel</h2>
      <p>
        We use <strong>essential</strong> cookies to run the app (e.g. to keep you signed in) — these
        are always needed. We use the <strong>Meta (Facebook) Pixel</strong> for marketing
        measurement <strong>only after you accept it</strong> in the cookie banner; if you reject, the
        pixel does not load. You can change your choice by clearing the site data in your browser.
      </p>

      <h2>Who we share it with</h2>
      <p>
        We do <strong>not sell your personal data</strong>. We use trusted service providers only to
        run LuxuryBandit, for example: <strong>Supabase</strong> (hosting, database, image storage),
        <strong> Stripe</strong> (payments), and AI providers for the chat and the try-on videos
        (<strong>Anthropic</strong>, <strong>OpenAI</strong>, <strong>fal.ai</strong>,{" "}
        <strong>Pixverse</strong>). With your consent, <strong>Meta</strong> receives pixel data for ad
        measurement. Some of these providers operate outside the EU; where that happens, appropriate
        safeguards apply.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data only as long as it is needed to run your account and the service, and delete
        it when it is no longer needed or when you ask us to.
      </p>

      <h2>Your rights</h2>
      <p>
        You have the right to access, correct, delete, restrict, object to, and export your data, and to
        withdraw consent at any time. To exercise any of these, use our{" "}
        <a href="/contact">contact form</a>. You also have the right to complain to your local data
        protection authority.
      </p>

      <p className="mt-6 text-xs text-black/40">Last updated: 10 July 2026</p>
    </InfoPage>
  );
}
