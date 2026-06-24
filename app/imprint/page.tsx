import InfoPage from "@/components/InfoPage";

export const metadata = { title: "Imprint — LuxuryBandit" };

export default function ImprintPage() {
  return (
    <InfoPage title="Imprint">
      <p className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-800">
        ⚠️ Placeholder — required by law in DE/EU. Fill in your real company details.
      </p>

      <h2>Provider</h2>
      <p>
        [Company / sole proprietor name]<br />
        [Street and number]<br />
        [Postal code, City, Country]
      </p>

      <h2>Contact</h2>
      <p>
        Email: [email]<br />
        Phone: [optional]
      </p>

      <h2>Represented by</h2>
      <p>[Managing director / responsible person]</p>

      <h2>Register &amp; VAT</h2>
      <p>
        [Commercial register & number, if applicable]<br />
        [VAT ID, if applicable]
      </p>

      <h2>Responsible for content</h2>
      <p>[Name and address per § 18 Abs. 2 MStV]</p>
    </InfoPage>
  );
}
