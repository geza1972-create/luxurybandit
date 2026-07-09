import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Imprint — LuxuryBandit" };

// Interim imprint. LuxuryBandit is privately operated and in a pre-launch/testing phase, so no
// company details are published yet. ⚠️ Before taking real payments / running public ads in
// DE/EU, this MUST be replaced with a full § 5 DDG imprint (name + a reachable postal address).
// To keep the operator's home address private, use a business / c/o (Impressum-service) address.
export default function ImprintPage() {
  return (
    <InfoPage title="Imprint">
      <p>
        LuxuryBandit is currently operated <strong>privately</strong> and is in a
        <strong> pre-launch / testing phase</strong>. No commercial company details are published yet.
      </p>

      <h2>Contact</h2>
      <p>
        For any request — including legal or data matters — please use our{" "}
        <a href="/contact">contact form</a>. We respond to every message.
      </p>

      <p>
        Full provider details will be published here before the public launch.
      </p>
    </InfoPage>
  );
}
