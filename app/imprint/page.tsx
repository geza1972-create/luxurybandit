import InfoPage from "@/components/InfoPage";
import TrackView from "@/components/TrackView";

export const metadata = { title: "Imprint — LuxuryBandit" };

// Provider details. Company registration is in progress — register number / VAT ID will be
// added once incorporation is complete. Contact runs through the contact form (no public email).
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

      <h2>Register &amp; VAT</h2>
      <p>Company registration is in progress; the register number and VAT ID will be added here once incorporation is complete.</p>
    </InfoPage>
  );
}
