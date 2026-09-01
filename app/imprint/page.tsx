import InfoPage from "@/components/InfoPage";
import TrackView from "@/components/TrackView";

export const metadata = { title: "Imprint — LuxuryBandit" };

// Provider details. Owner operates as a freelancer (Romanian tax number RO49830040,
// Owner 01.09.2026) — no separate company registration. Contact runs through the contact
// form (no public email).
export default function ImprintPage() {
  return (
    <InfoPage title="Imprint">
      {/* Owner fragte am 29.07.2026, ob das Impressum angeklickt wird — war nicht
          beantwortbar, weil die Seite nichts meldete. */}
      <TrackView event="imprint_view" lookId="legal-imprint" lookName="Impressum" />
      <h2>Provider</h2>
      <p>
        LuxuryBandit<br />
        Bvd. Mihai Viteazu 44<br />
        Timișoara, Romania
      </p>

      <h2>Contact</h2>
      <p>
        For any request — including legal or data matters — please use our{" "}
        <a href="/contact">contact form</a>. We respond to every message.
      </p>

      <h2>Tax number</h2>
      <p>RO49830040 (freelancer, Romania)</p>
    </InfoPage>
  );
}
