import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { eur, RESUME_CENTS } from "@/lib/pricing";
import { Kasten, Knopf } from "@/components/CI";
import type { GeneratorTexte } from "@/lib/bewerbungs-generator-i18n";
import LebenslaufGeneratorClient from "./LebenslaufGeneratorClient";

/**
 * DER BEWERBUNGS-GENERATOR (Owner 31.08.2026: der Name steht auf seinem Siegel — „das
 * Produkt heisst so". Vorher „Lebenslauf-Generator"; drei Namen für eine Sache wären einer
 * zu viel gewesen.)
 *
 * (Ursprünglicher Kopf, Owner 31.08.2026: „Es ist einfach ein CV Kreator. Ohne
 * Anschreiben, ohne nichts. Ein Tool. Für den Rest haben wir David, der dir eine
 * Profianalyse macht.").
 *
 * EINE SEITE, KEINE LANDINGPAGE DAVOR. Wer ein Werkzeug sucht, will es benutzen, nicht
 * darüber lesen — der Upload steht deshalb ohne Zwischenschritt im Bild. Die drei Sätze
 * darüber sagen, was herauskommt, und das ist alles, was es zu erklären gibt.
 *
 * ER FASST DAVID NICHT AN: Der Motor ist der zusätzliche Schritt `kreator` in
 * /api/resume-generator; `mappe`, `erzeugen` und `optimieren`, an denen Davids Kaufweg
 * hängt, bleiben Zeichen für Zeichen wie sie waren.
 *
 * DER ABLAUF (Owner, wörtlich): hochladen → er liest und fragt nach, was fehlt → beim
 * fehlenden Foto fragt er, ob es Absicht war → „Jetzt habe ich alles, soll ich das
 * erstellen?" → Vorschau mit Wasserzeichen → 9,99 € für die saubere Fassung.
 *
 * Alle Texte: deutsche Quelle, zur Laufzeit in die Betrachtersprache — Trichter-Muster.
 */

const QUELLE = {
  kicker: "Bewerbungs-Generator",
  h1: "Dein Lebenslauf, sauber gesetzt — als PDF.",
  unterzeile: "Lade hoch, was du hast. Der Rest passiert hier: ordnen, ergänzen, fertiges Dokument.",
  vorlageTitel: "Wähle deine Vorlage",
  vorlageHinweis: "So wird dein Lebenslauf aussehen. Ändern kannst du sie später jederzeit.",
  vorlageWeiter: "Weiter",
  cvTitel: "Lebenslauf hochladen",
  cvHinweis: "PDF oder Word (.docx)",
  fotoTitel: "Foto",
  fotoHinweis: "Optional",
  starten: "Lebenslauf einlesen",
  gratisZeile: "Gratis mit Muster-Wasserzeichen. Keine Anmeldung, keine Adresse.",
  laufText: "Ich lese deinen Lebenslauf …",

  /* Der Minichat — je Feld eine Frage, keine davon vom Modell erfunden. */
  chatGelesen: "Ich habe deinen Lebenslauf gelesen.",
  chatGefunden: "Gefunden: {stationen} Stationen, {ausbildung} Ausbildung, {sprachen} Sprachen.",
  chatFehlt: "Eins fehlt mir noch:",
  fragename: "Wie heißt du mit vollem Namen?",
  frageemail: "Deine E-Mail-Adresse?",
  fragetelefon: "Deine Telefonnummer?",
  frageort: "In welcher Stadt wohnst du?",
  chatWeiter: "Weiter",
  chatUeberspringen: "Habe ich nicht",

  fotoFrage: "Ein Bild hast du nicht hochgeladen — bewusst weggelassen oder vergessen?",
  fotoAbsicht: "Bewusst, ohne Foto",
  fotoNachreichen: "Vergessen — Bild wählen",

  fertigFrage: "Jetzt habe ich alles. Soll ich es erstellen?",
  fertigJa: "Ja, erstellen",

  vorschauTitel: "Deine Vorschau",
  vorschauHinweis: "Mit Muster-Wasserzeichen — du darfst sie prüfen und verschicken.",
  pdfKnopf: "PDF herunterladen (Muster)",
  pdfKnopfVoll: "PDF herunterladen",
  kaufTitel: "Ohne Wasserzeichen",
  kaufText: "Dasselbe Dokument, sauber — zum Verschicken an Arbeitgeber.",
  kaufKnopf: "Freischalten",
  fertigTitel: "Freigeschaltet",
  nochmal: "Neu anfangen",

  davidTitel: "Und was sagt ein Recruiter dazu?",
  davidText: "David liest deinen Lebenslauf wie eine Personalabteilung — und sagt dir, was ihm auffällt. Kostenlos, etwa fünf Minuten.",
  davidKnopf: "Lebenslauf prüfen lassen",

  fehlerCv: "Bitte lade zuerst deinen Lebenslauf hoch.",
  fehlerNetz: "Das ging gerade nicht. Versuch es bitte gleich noch einmal.",
  fehlerGross: "Die Datei ist zu groß.",
};

export const metadata: Metadata = {
  title: "Bewerbungs-Generator — dein Lebenslauf als fertiges PDF",
  description: "Lebenslauf hochladen, fehlende Angaben ergänzen, fertiges PDF herunterladen. Gratis mit Muster-Wasserzeichen.",
};

export default async function LebenslaufGeneratorSeite({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const ausAdresse = String(sp.lang ?? "");
  const lang: Lang = isLang(ausAdresse) ? ausAdresse : await resolveLang();
  const S = (await textbausteineInSprache(QUELLE, lang)) as GeneratorTexte;
  const preisText = eur(RESUME_CENTS, lang);

  return (
    <main className="lb-bg lb-theme lb-fb min-h-screen text-white">
      {/* Hell schon vom Server — dieselbe Entscheidung wie bei den anderen beworbenen
          Seiten: kein schwarzer Blitz beim Laden. */}
      <TopNav marke="Bewerbungs-Generator" heim="/themes/bewerbungs-generator" />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{S.kicker}</p>
        <h1 className="mt-1 text-[28px] font-black leading-[1.06]">{S.h1}</h1>
        <p className="mt-2.5 text-[15px] font-medium leading-snug text-white/85">{S.unterzeile}</p>

        <div className="mt-5">
          <LebenslaufGeneratorClient S={S} lang={lang} preisText={preisText} />
        </div>

        {/**
          * DIE DAVID-BOX (Owner 31.08.2026: „auf dieser Seite machen wir noch Werbung unten,
          * noch eine Box für David").
          *
          * Sie steht am FUSS, nicht neben dem Kaufknopf: Wer gerade sein PDF holt, soll nicht
          * zwischen zwei Angeboten wählen müssen — zwei Aufforderungen auf einem Bildschirm
          * kosten immer die wichtigere. Wer bis hierher gescrollt hat, ist fertig und offen
          * für das Nächste.
          *
          * Und es passt zusammen: Hier bekommt er das Dokument, bei David erfährt er, was ein
          * Recruiter darin sieht. Das eine ist die Form, das andere der Inhalt.
          */}
        <Kasten art="gold" polster="p-5" className="mt-10">
          <p className="text-[16px] font-black leading-snug text-white">{S.davidTitel}</p>
          <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-white/80">{S.davidText}</p>
          <div className="mt-3">
            <Knopf art="umriss" href="/themes/david">{S.davidKnopf}</Knopf>
          </div>
        </Kasten>
      </div>

      <SeitenFuss art="schlicht" lang={lang} marke="Bewerbungs-Generator" />
    </main>
  );
}
