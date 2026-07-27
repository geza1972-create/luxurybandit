import InfoPage from "@/components/InfoPage";

export const metadata = {
  title: "AI Notice — LuxuryBandit",
  description: "How AI is used on LuxuryBandit: AI personas, what the chat can and cannot do, and how we keep it transparent.",
  alternates: { canonical: "/ai-notice" },
};

// ÖFFENTLICHE KI-Erklärung — verlinkt aus den AGB (Abschnitt „AI-generated content & AI chat").
//
// BEWUSST NICHT dasselbe wie docs/ki-transparenz-und-schutzmassnahmen.md: Das interne Dokument
// ist der Nachweis für Anwalt/Zahlungsdienstleister und enthält einen Abschnitt „Offene Punkte"
// (bekannte Lücken). Der gehört nicht ins Netz — er wäre eine Schwachstellenliste. Hier steht
// nur, was Nutzer wissen müssen und was wir ihnen zusichern.
export default function AiNoticePage() {
  return (
    <InfoPage title="AI Notice">
      <p>
        Several influencers on LuxuryBandit are <strong>AI-generated characters</strong>, and the chat
        is answered by an <strong>AI persona</strong> — a computer program styled after an influencer.
        It is <strong>not a real person</strong>, and there is no real woman reading or replying to
        your messages.
      </p>

      <h2>Where we tell you</h2>
      <ul>
        <li>A permanent note under every chat window.</li>
        <li>A reminder inside the conversation itself, repeated regularly as you keep chatting.</li>
        <li>A note in the footer of every daily email we send you.</li>
      </ul>

      <h2>What the AI persona will not do</h2>
      <ul>
        <li>
          <strong>It will not pretend to have feelings for you.</strong> It may be playful and friendly
          and take an interest in your day, but it will never say it missed you, thought about you or
          waited for you, and it will never claim to be your girlfriend or promise a relationship.
        </li>
        <li>It will not send sexually explicit content.</li>
        <li>It will not arrange to meet you, or share real contact details.</li>
      </ul>

      <h2>Age</h2>
      <p>
        LuxuryBandit is for adults only. You must confirm that you are <strong>18 or older</strong>{" "}
        before you can use the chat.
      </p>

      <h2>Please keep in mind</h2>
      <p>
        An AI persona can be entertaining company, but it cannot replace a real relationship, and it
        is not a counsellor. Anything it says may be inaccurate or invented. If you are going through
        a difficult time, please talk to real people you trust or to a professional support service in
        your country.
      </p>

      <h2>Your choices</h2>
      <p>
        You can stop the daily emails at any time — every message has a one-click unsubscribe link at
        the bottom, or use our <a href="/unsubscribe"><strong>unsubscribe page</strong></a>. You can
        stop chatting at any time.
      </p>
      <p>
        Questions about how we use AI? Reach us through our{" "}
        <a href="/contact"><strong>contact form</strong></a>.
      </p>
    </InfoPage>
  );
}
