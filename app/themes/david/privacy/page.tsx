import InfoPage from "@/components/InfoPage";
import DavidDatenschutz from "@/components/DavidDatenschutz";

export const metadata = {
  title: "Datenschutz — David · AI Pre-Screening | LuxuryBandit",
  description: "Was David mit deinem Lebenslauf, der Stellenanzeige und deinen Antworten macht — und was nicht.",
};

/**
 * DIE DATENSCHUTZ-SEITE DES BEWERBERS (Owner 30.08.2026: „jeder Funnel hat seine eigene
 * Privacy und Terms, ich hoffe es." · „das kann doch nicht wahr sein, ich habe es doch schon
 * gebrieft").
 *
 * WARUM SIE SEIN MUSS: Wer beim Lebenslauf-Upload auf „Datenschutzerklärung" tippt, landete
 * auf einer Seite, die mit Mode-Anprobe und „LuxuryBandit is for adults (18+)" beginnt. Für
 * jemanden, der gerade seinen Lebenslauf hochladen soll, ist das kein Formfehler, sondern ein
 * Grund abzubrechen — und ein Meta-Prüfer liest dieselbe Seite, bevor er die Anzeige freigibt.
 *
 * WARUM SIE TROTZDEM KEINE ZWEITE ERKLÄRUNG IST: Der Text steht genau EINMAL
 * (components/DavidDatenschutz) und wird hier wie in der grossen Erklärung gezeigt. Zwei
 * eigenständige Fassungen für denselben Verantwortlichen laufen mit der Zeit auseinander —
 * und dann steht an zwei Stellen etwas Verschiedenes über dieselbe Verarbeitung. Der
 * Verweis auf die vollständige Erklärung steht deshalb sichtbar am Ende, nicht im
 * Kleingedruckten.
 */
export default function DavidPrivacyPage() {
  return (
    <InfoPage title="Datenschutz — David · AI Pre-Screening">
      <p>
        Diese Seite sagt in Kurzform, was <strong>David · AI Pre-Screening</strong> mit deinen
        Daten macht. David ist ein Karriere-Produkt von LuxuryBandit; die vollständige
        Datenschutzerklärung des Portals gilt zusätzlich und steht unten verlinkt.
      </p>

      <h2>Deine Bewerbungsunterlagen</h2>
      <DavidDatenschutz />

      <h2>Wie lange</h2>
      <p>
        Dein Ergebnis bleibt in deinem Konto, damit du es wiederfindest. Du kannst es jederzeit
        löschen lassen — eine Nachricht über unser <a href="/contact">Kontaktformular</a> genügt,
        und es verschwindet samt Lebenslauf und Gespräch.
      </p>

      <h2>Wer es sehen kann</h2>
      <p>
        Dein Bericht ist <strong>nur für dich</strong> sichtbar: Er hängt an deinem Browser
        beziehungsweise an deinem Konto, nicht an einem Link, den man weitergeben könnte. Wer die
        Adresse deines Berichts kennt, ihn aber nicht selbst erstellt hat, sieht nichts.
      </p>

      <p>
        Die vollständige Datenschutzerklärung: <a href="/privacy">luxurybandit.com/privacy</a> ·
        Unsere Bedingungen: <a href="/terms">luxurybandit.com/terms</a>
      </p>
    </InfoPage>
  );
}
