/**
 * WAS DAVID MIT DEINEN DATEN MACHT — EIN ORIGINAL, ZWEI ORTE.
 *
 * Owner 30.08.2026: „jeder Funnel hat seine eigene Privacy und Terms, ich hoffe es." Hat er
 * nicht — es gibt genau EINE Datenschutzerklärung fürs ganze Haus. Und das ist auch richtig
 * so: Zwei Fassungen für denselben Verantwortlichen laufen mit der Zeit auseinander, und
 * dann steht irgendwann an zwei Stellen etwas Verschiedenes über dieselbe Verarbeitung.
 *
 * WAS DER BEWERBER TROTZDEM BRAUCHT: Wer beim Lebenslauf-Upload auf „Datenschutzerklärung"
 * tippt, darf nicht auf einer Seite landen, die mit Mode-Anprobe und „18+" beginnt. Das ist
 * kein Rechtsproblem, sondern ein Vertrauensproblem — und Vertrauen ist bei einem Lebenslauf
 * die ganze Ware.
 *
 * DIE LÖSUNG IST DIESER BAUSTEIN: Der Text steht genau EINMAL hier und wird an zwei Stellen
 * gezeigt — im Abschnitt der grossen Erklärung UND auf `/themes/david/privacy`, wo er allein
 * steht. Ändert sich etwas, ändert es sich an beiden Orten zugleich (Hausregel „ein
 * Original", wie bei der Portal-Beschreibung).
 */
export default function DavidDatenschutz() {
  return (
    <>
      <p>
        If you use our career product, we additionally process: the <strong>CV</strong> you upload,
        the <strong>job ad</strong> you paste or link, and the <strong>answers</strong> you give in
        the screening conversation. We use them to produce your result, and — only if you buy them —
        your optimised application documents or your application video.
      </p>
      <p>
        Your application is <strong>never sent to employers automatically</strong>. We do not sell or
        pass on your CV. We read screening conversations to improve the questions David asks; you
        consent to this when you start the screening, and you can ask us to delete everything at any
        time via our <a href="/contact">contact form</a>.
      </p>
    </>
  );
}
