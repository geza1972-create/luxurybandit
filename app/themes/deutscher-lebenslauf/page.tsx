import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { eur, RESUME_CENTS } from "@/lib/pricing";
import { Kasten, Knopf } from "@/components/CI";
import { generatorTexte, GENERATOR_SPRACHEN } from "@/lib/bewerbungs-generator-i18n";
import LebenslaufGeneratorClient from "../bewerbungs-generator/LebenslaufGeneratorClient";

/**
 * DEIN DEUTSCHER LEBENSLAUF (Owner 31.08.2026: „Ein Deutsch-Generator. Jede Bewerbung wird
 * auf Deutsch umgewandelt. Dein deutscher Lebenslauf." · auf die Rückfrage nach einer
 * Sprachwahl: „nein, nur deutsch").
 *
 * ZWEITE TÜR, DERSELBE MOTOR. Der Trichter ist Zeichen für Zeichen der des
 * Lebenslauf-Generators — nur mit `zielsprache="de"` und anderen Texten. Es ist im Code ein
 * Schalter, im Verkauf ein anderes Versprechen: „Lebenslauf-Generator" konkurriert mit
 * hundert Gratis-Werkzeugen, „dein Lebenslauf auf Deutsch, so wie deutsche Arbeitgeber ihn
 * erwarten" mit fast keinem. Dieselbe Trennung wie zwischen /joburi und /recruiting.
 *
 * ES IST KEINE ÜBERSETZUNG (siehe die Anweisung im `kreator`-Schritt): tabellarisch,
 * neueste Station zuerst, Zeiträume als MM/JJJJ — und Berufsbezeichnungen, die deutsche
 * Anzeigen englisch ausschreiben, bleiben englisch. Genau daran unterscheidet es sich von
 * einem Übersetzer, und nur deshalb ist es etwas wert.
 *
 * Die Zielgruppe steht schon auf /joburi/germana: Wer dort sieben Fragen beantwortet hat,
 * was sein Deutsch wert ist, braucht als Nächstes genau dieses Dokument.
 */
/* (Der ursprüngliche Kopf des Generators, unverändert gültig — Owner 31.08.2026: „Es ist einfach ein CV Kreator. Ohne
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


export const metadata: Metadata = {
  title: "Dein deutscher Lebenslauf — CV auf Deutsch als PDF",
  description: "Lade deinen Lebenslauf in jeder Sprache hoch — heraus kommt die deutsche Fassung als fertiges PDF. Gratis mit Muster-Wasserzeichen.",
};

export default async function DeutscherLebenslaufSeite({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const ausAdresse = String(sp.lang ?? "");
  const lang: Lang = isLang(ausAdresse) ? ausAdresse : await resolveLang();
  const S = generatorTexte(lang);
  const preisText = eur(RESUME_CENTS, lang);

  return (
    <main className="lb-bg lb-theme lb-fb min-h-screen text-white">
      {/* Hell schon vom Server — dieselbe Entscheidung wie bei den anderen beworbenen
          Seiten: kein schwarzer Blitz beim Laden. */}
      <TopNav marke="Bewerbungs-Generator" heim="/themes/deutscher-lebenslauf" sprachen={[...GENERATOR_SPRACHEN]} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">{S.kicker}</p>
        {/* DAS SIEGEL STATT DER FLAGGE (Owner 31.08.2026: „das machst du mir auch hier
            rein") — dasselbe Zeichen, das unten links auf dem fertigen PDF steht. Wer die
            Seite sieht und später das Dokument, erkennt es wieder; genau dafür ist ein
            Siegel da. Es liegt in `public/Lebenslauf`, transparente Ecken. */}
        <h1 className="mt-1 flex items-start gap-3 text-[28px] font-black leading-[1.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Lebenslauf/siegel-deutsch.png" alt="" className="mt-0.5 h-12 w-12 shrink-0" />
          <span>{S.h1}</span>
        </h1>
        <p className="mt-2.5 text-[15px] font-medium leading-snug text-white/85">{S.unterzeile}</p>

        <div className="mt-5">
          <LebenslaufGeneratorClient S={S} lang={lang} preisText={preisText} zielsprache="de" />
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
