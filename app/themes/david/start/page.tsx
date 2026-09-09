import { Fragment } from "react";
import type { Metadata } from "next";
import SeitenFuss from "@/components/SeitenFuss";
import DavidFunnel from "@/components/DavidFunnel";
import DavidBeweis from "@/components/DavidBeweis";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { eur, RESUME_CENTS, DAVID_VIDEO_CENTS } from "@/lib/pricing";
import { davidTunnelInSprache } from "@/lib/david-tunnel-texte";
import { davidTexteInSprache } from "@/lib/david-texte";
import { CORA_MUSTER } from "@/lib/david-muster";

/**
 * DER DAVID-TRICHTER — die Seite hinter „Jetzt kostenlos starten".
 *
 * Sie liefert nur INHALTE; der Ablauf steht in `components/DavidFunnel.tsx`. Dasselbe
 * Muster wie beim Resume Generator: deutsche Textquelle, zur Laufzeit übersetzt, Preis
 * fertig formatiert aus `lib/pricing` (nie eine Zahl im Text).
 *
 * WARUM HIER KEIN `TunnelSeite` STEHT (bewusste Abweichung von der Dauerregel
 * `ein-tunnel-geruest-fuer-alle`, dokumentiert statt stillschweigend): Das Gerüst verwaltet
 * SCHRITT-NUMMERN IN DER ADRESSE, damit ein Besucher vor- und zurückspringen kann. Genau das
 * ist hier falsch — David führt ein Gespräch, dessen Zustand auf dem Server liegt (Fragen,
 * Antworten, Bericht). Ein Zurück-Sprung per Adresse würde ihn mitten in ein Gespräch
 * setzen, das es im Browser nicht mehr gibt. Der Resume Generator (26.08.2026) hat dieselbe
 * Entscheidung getroffen. Was das Gerüst SONST mitbringt, ist hier trotzdem da: der
 * Landingpage-Inhalt unter dem Trichter und die Funnel-Ereignisse.
 *
 * NICHT INDEXIEREN: Der Trichter ist kein Ziel für Google — die Landingpage ist es.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dein Vorgespräch mit David | LB - David",
  description: "Lebenslauf und Wunschstelle hochladen, Fragen beantworten, vollständiges Ergebnis erhalten — kostenlos.",
  robots: { index: false, follow: true },
};

export default async function DavidStartSeite({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const spLang = String(sp.lang ?? "");
  const L: Lang = isLang(spLang) ? spLang : await resolveLang("de");
  const hell = String(sp.light ?? "") === "1";
  const S = await davidTunnelInSprache(L);
  const T = await davidTexteInSprache(L);
  /* Lebenslauf UND Anschreiben laufen über EINEN Kauf — den des Resume Generators
     (`RESUME_CENTS`). Kein neuer Preis, keine zweite Zahl (Owner §25). */
  const preisUnterlagen = eur(RESUME_CENTS, L);
  /* DER VIDEO-PREIS KOMMT AUS DEM VIDEO-PREIS (Fehler gefunden 29.08.2026, als der Owner den
     Preis auf 9,99 € setzte): Hier stand `LEBENSLAUF_CENTS` — der Preis eines ANDEREN
     Produkts. Beide standen zufällig auf 19 €, deshalb fiel es nie auf. In dem Moment, in dem
     einer von beiden geändert wird, zeigt die Seite einen Preis an und die Kasse bucht einen
     anderen ab. Die Kasse rechnet mit `DAVID_VIDEO_CENTS` (lib/pricing, `david-video`) —
     also muss die Anzeige es auch. */
  const preisVideo = eur(DAVID_VIDEO_CENTS, L);

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      {/**
        * KEINE KOPFZEILE IM TRICHTER (Owner 07.09.2026: „ok, header raus").
        *
        * Sie kostete zwei Reihen über dem ersten Satz: einmal „LB - DAVID · DAS VORGESPRÄCH",
        * darunter „Assets", Hell/Dunkel und die Sprachwahl. Auf einem Handy war das der halbe
        * erste Bildschirm — und „Assets" ist obendrein ein englisches Wort, mit dem die
        * Zielgruppe nichts anfangen kann ([[zielgruppe-ueber-60]]).
        *
        * ZWEI FOLGEN, BEWUSST IN KAUF GENOMMEN:
        *  · Der Konto- und Galerie-Zugang aus [[guthaben-konto-header]] fehlt auf dieser
        *    Seite. Im Trichter braucht ihn niemand — wer hier ist, will ein Ergebnis, kein
        *    Konto.
        *  · Es gibt keinen Weg zurück auf die Seite mehr ausser dem Browser-Zurück. Innerhalb
        *    des Trichters führt der eigene Zurück-Knopf durch die Schritte.
        */}
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        {/* DIE ZEILE „DAVID · DAS VORGESPRÄCH" IST RAUS (Owner 07.09.2026: „mich stört es im
            Tunnel"). Sie stand wörtlich dasselbe wie die Kopfzeile direkt darüber — zwei
            Zeilen Chrome, bevor der Besucher den ersten Satz liest. Auf einem Handy kostet
            das den halben ersten Bildschirm. */}
        {/* DIE ÜBERSCHRIFT GEHÖRT DEM TRICHTER (Owner 29.08.2026: „es muss nicht auf jeder
            Seite das gleiche stehen").
            Sie stand hier fest und zeigte auf JEDEM Schritt den Werbesatz. Welcher Satz
            richtig ist, weiss aber nur der Trichter — er kennt den Schritt. Also reicht die
            Seite ihm den Werbesatz herein, und er entscheidet: am Anfang die Werbung, ab dem
            Lebenslauf die Aufgabe. */}

        <DavidFunnel
          S={S} lang={L} preisUnterlagen={preisUnterlagen} preisVideo={preisVideo}
          werbeTitel={`${T.h1a}${T.h1y}${T.h1b}`}
          /* „Die Leute kaufen, was sie sehen" (Owner 24.08.2026) — das Muster-Dossier von
             Oana Müller, derselben Person, die im Verwandlungs-Video zu sehen ist. Das
             Video selbst braucht hier kein Prop mehr: Es steht ohne Karte im Angebots-
             Baustein (Owner 28.08.2026). */
          /* Jedes durchgereichte Server-Stück bekommt einen Schlüssel: Next liefert eine
             async Server-Komponente als LISTE an den Client-Baum, und React verlangt dort
             einen `key`. */
          beispielCv={<Fragment key="cv"><LebenslaufBeispiel lang={L} profil={CORA_MUSTER} href="" /></Fragment>}
          /* DER BEWEIS steht beim Lebenslauf-Schritt, nicht im Fliesstext darunter — dort,
             wo der Mensch entscheidet, ob er seine Unterlagen hergibt. */
          beweis={<Fragment key="beweis"><DavidBeweis T={T} /></Fragment>}
        />
      </div>
      {/* Der schlichte Fuss wie in allen Bewerber-Strecken — in der Sprache der Seite. */}
      <SeitenFuss art="schlicht" lang={L} />
    </main>
  );
}
