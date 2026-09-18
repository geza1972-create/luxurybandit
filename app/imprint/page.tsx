import InfoPage from "@/components/InfoPage";
import TrackView from "@/components/TrackView";

export const metadata = { title: "Imprint — VersusForge" };

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
        {/* Der Betreiber bleibt derselbe Mensch — nur der Name, unter dem er auftritt,
            ist jetzt VersusForge (Owner 08.09.2026). Anschrift und Steuernummer sind
            unverändert; sie sind die Angabe, auf die es rechtlich ankommt. */}
        {/* DER NAME DER PERSON, NICHT DER MARKE (15.09.2026) — derselbe Name wie auf dem
            Zahlungsmittel und im Werbekonto; unterschiedliche Schreibweisen haben bei Meta als
            widersprüchliche Angaben gezählt. VersusForge steht darunter als Marke. */}
        Lakatos Geza<br />
        Bvd. Mihai Viteazu 44<br />
        Timișoara, Romania<br />
        VersusForge is the brand the platform runs under.
      </p>

      <h2>Contact</h2>
      <p>
        For any request — including legal or data matters — please use our{" "}
        <a href="/contact">contact form</a>. We respond to every message.
      </p>

      <h2>Tax number</h2>
      <p>RO49830040</p>
    </InfoPage>
  );
}
