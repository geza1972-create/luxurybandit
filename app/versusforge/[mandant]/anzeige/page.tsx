import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { eur, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import MandantKaufen from "@/components/MandantKaufen";
import { Wortmarke } from "@/components/VersusForgeMarke";
import AnzeigeFeld from "@/components/AnzeigeFeld";
import AnzeigeBild from "@/components/AnzeigeBild";
import AnzeigeSendenLoeschen from "@/components/AnzeigeSendenLoeschen";

/**
 * ALLES FÜR SEINE ANZEIGE, AN EINER ADRESSE (Owner 09.09.2026: „das interessiert mich nicht
 * [das PDF]. Er bekommt eine URL — dort steht alles: Titel, Primärtext und Bild für die
 * Anzeige. Wenn er das selbst nicht kapiert, dann machen wir es für ihn.").
 *
 * WAS DAMIT WEGFÄLLT: das A4-Dokument und der Foliensatz als Anhang. Beide sind vom
 * 8. und 9. September, als der Plan das EINZIGE Ergebnis war — es gab keinen Link, kein Bild,
 * kein Dashboard. Ein Blatt, das dasselbe noch einmal in Fliesstext erzählt, liest niemand.
 *
 * WARUM EINE SEITE UND KEIN ANHANG: Was er hier braucht, muss er KOPIEREN — vier Felder in
 * den Werbeanzeigenmanager. Aus einem PDF tippt man ab und macht Fehler. Hier steht neben
 * jedem Feld ein Knopf.
 *
 * KEIN SCHLÜSSEL IN DER ADRESSE, und das ist Absicht: Auf dieser Seite steht nichts
 * Geheimes — Anzeigentexte und Motiv sind genau das, was er demnächst öffentlich schaltet.
 * Geschützt gehört, was er NICHT veröffentlichen will: die Anfragen. Die liegen hinter dem
 * Dashboard-Schlüssel, hier nicht. `noindex`, damit sie trotzdem nicht in einer Suche steht.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ mandant: string }> }): Promise<Metadata> {
  const { mandant } = await params;
  const m = await mandantLesen(mandant);
  if (!m) return { title: "Nicht gefunden" };
  return { title: `Deine Anzeige — ${m.name}`, robots: { index: false, follow: false } };
}

export default async function AnzeigeSeite({
  params, searchParams,
}: {
  params: Promise<{ mandant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { mandant } = await params;
  const sp = await searchParams;
  const k = Array.isArray(sp.k) ? sp.k[0] ?? "" : sp.k ?? "";
  const m = await mandantLesen(mandant);
  if (!m) notFound();

  const plan = (m.plan ?? {}) as {
    hook?: string;
    zielgruppe?: string[];
    anzeige?: { primaer?: string; ueberschrift?: string; beschreibung?: string; knopf?: string };
  };
  const hook = String(plan.hook ?? "").trim();
  const az = plan.anzeige ?? {};
  /**
   * DIE KURZE ADRESSE (Owner 09.09.2026: „kaputt" — sie stand als
   * `versusforge.com/versusforge/<name>` da).
   *
   * Die Route liegt aus gutem Grund unter `/versusforge/<name>`: Eine Route, die direkt auf
   * `/<name>` hört, würde auf luxurybandit.com JEDEN Pfad schlucken, auch `/imprint`. Auf
   * versusforge.com schreibt eine Umschreibung in `next.config.mjs` die kurze Form auf die
   * lange um — sie greift erst, wenn keine echte Seite passt, `/about` bleibt also `/about`.
   */
  const trichter = `versusforge.com/${mandant}`;

  /* Die vier Felder in derselben Reihenfolge und mit denselben Grenzen wie bei Meta —
     wer sie hier abarbeitet, arbeitet das Formular dort von oben nach unten ab. */
  const felder: [string, string, number | undefined][] = [
    ["Primärtext", String(az.primaer ?? ""), 125],
    ["Überschrift", String(az.ueberschrift ?? ""), 40],
    ["Beschreibung", String(az.beschreibung ?? ""), 30],
    ["Schaltfläche", String(az.knopf ?? ""), undefined],
  ];

  return (
    <main className="lb-mandant flex min-h-[100dvh] flex-col bg-white text-[#14181c]">
      <header className="border-b border-[#dfe4e9] px-5 py-4">
        <div className="mx-auto w-full max-w-[620px]">
          <Wortmarke className="text-[21px] font-black leading-none tracking-[-0.02em] text-[#14181c]" akzent="#1d6fd0" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[620px] flex-1 px-5 pb-12 pt-7">
        {/* KEIN KICKER (Owner 09.09.2026: „das ist redundant"). „DEINE ANZEIGE" über
            „Deine Anzeige ist fertig." sagt dasselbe zweimal — der Kicker war hier nur
            Gewohnheit aus dem Seitenkopf-Template. */}
        {/**
          * DER SATZ, DER DIE STARTSEITE SCHLIESST (Owner 09.09.2026: „und Anzeige ist es
          * nicht, was er bekommt. Er bekommt doch viel mehr.").
          *
          * ZWEI FEHLVERSUCHE DAVOR: „Alles, was du für Meta brauchst" machte Meta zur
          * Hauptsache — Werbung für den Kanal statt für ihn. „Deine Anzeige ist fertig"
          * nannte das Kleinste von allem, was hier liegt: Hook, Bild, Texte, Trichter,
          * Anleitung.
          *
          * „Dein Weg steht." schliesst den Kreis zu dem Satz, mit dem er angefangen hat —
          * „Sag, was du erreichen willst. Wir bauen den Weg." Am Ende steht dieselbe
          * Sprache, und sie ist eingelöst.
          */}
        {/* BLAU (Owner 09.09.2026) — der Akzent des Mandanten. Es ist die einzige Zeile auf
            der Seite, die etwas feststellt statt etwas zu beschriften. */}
        <h1 className="m-0 text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#1d6fd0]">
          Dein Weg steht.
        </h1>
        {/* KEIN ERKLÄRSATZ UNTER DER ÜBERSCHRIFT (Owner 09.09.2026: „raus"). Er zählte auf,
            was die Abschnitte darunter ohnehin zeigen — und schob das Erste, was er wirklich
            braucht, um vier Zeilen nach unten. Dieselbe Streichung wie auf der Startseite. */}
        {/* KEIN EIGENER HOOK-ABSCHNITT (Owner 09.09.2026: „das raus, ist doppelt"). Der Satz
            steht gross im Bild direkt darunter — zweimal derselbe Satz auf zwei Handschirmen
            liest sich wie ein Fehler. */}
        {/* DAS BILD ZUERST NACH DEM HOOK: Es ist das Einzige hier, das er sofort benutzen
            kann, ohne etwas zu verstehen. */}
        {hook ? (
          <section className="mt-8">
            {/* „Das Bild — Der Hook" (Owner 09.09.2026). Beides gehört zusammen: Das Bild
                IST der Hook, nur sichtbar gemacht. Eine eigene Hook-Überschrift weiter oben
                war deshalb doppelt und ist vorhin geflogen. */}
            <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">
              Das Bild — Der Hook
            </h2>
            {/* KEINE MASSANGABE (Owner 09.09.2026: „raus"). Ihn interessiert nicht, wie
                gross die Datei ist, sondern ob das Bild gut aussieht — und das sieht er. */}
            <AnzeigeBild hook={hook} adresse={trichter} />
          </section>
        ) : null}

        <section className="mt-8">
          {/* KEINE ÜBERSCHRIFT (Owner 09.09.2026: „raus"). Die Felder tragen ihre Namen
              selbst; eine Überschrift über beschrifteten Feldern beschriftet die
              Beschriftung. */}
          {/**
            * ÜBERSCHRIFT WIEDER DRAN (Owner 09.09.2026: „Meta-Texte: Titel, Primärtext").
            *
            * Vorhin war sie raus, weil sie nur „Die vier Felder" hiess — das beschriftete die
            * Beschriftung. „Meta-Texte" sagt dagegen, WOHIN sie gehören, und das ist die
            * einzige Frage, die sich hier stellt.
            *
            * DIE FELDNAMEN BLEIBEN, WIE META SIE NENNT — „Überschrift", nicht „Titel". Der
            * ganze Zweck des Blocks ist, dass er das Formular dort von oben nach unten
            * abarbeiten kann; ein eigener Name für dasselbe Feld würde ihn suchen lassen.
            */}
          <div className="mt-3.5 grid gap-2.5">
            {felder.filter(([, w]) => w).map(([name, wert, grenze]) => (
              <AnzeigeFeld key={name} name={name} wert={wert} grenze={grenze} />
            ))}
          </div>
        </section>

        <section className="mt-8">
          {/* KEINE ÜBERSCHRIFT, KEIN ERKLÄRSATZ (Owner 09.09.2026: „das raus"). Der Kasten
              trägt sein Etikett selbst — „FUNNEL-URL FÜR META UND INSTAGRAM" sagt schon
              beides: was es ist und wohin es gehört. */}
          <div>
            {/* NICHT „Website-URL" (Owner 09.09.2026: „das ist nicht Website-URL, sondern
                Funnel-URL für Meta, Insta"). Seine Website ist etwas anderes und existiert
                daneben — hier steht die Adresse, die in die ANZEIGE gehört. Wer die beiden
                verwechselt, schickt seine Werbung auf die eigene Startseite und fragt sich
                später, warum keine Anfragen kommen. */}
            <AnzeigeFeld
              name="Funnel-URL für Meta und Instagram"
              wert={`https://${trichter}`}
              alsLink
              kinder={<AnzeigeSendenLoeschen mandant={mandant} k={k} />}
            />
          </div>

          {/**
            * DIE ANLEITUNG STEHT NICHT AUF DER OFFENEN SEITE (Owner 09.09.2026: „jetzt sei
            * nicht so naiv und gib ihm das hier kostenlos. Du gibst ihm das per E-Mail").
            *
            * ER HAT RECHT, UND ICH HATTE ES VERSCHENKT: Diese Seite ist ohne Schlüssel
            * erreichbar. Zehn Schritte, die sonst jemand bezahlt, hätten dort für jeden
            * offengelegen, der die Adresse errät — und der Grund, seine E-Mail-Adresse
            * dazulassen, wäre weg gewesen.
            *
            * Jetzt ist die Anleitung der Inhalt der Mail. Wer sie will, drückt auf „Per
            * E-Mail senden" — und wir wissen, wer er ist.
            */}
        </section>

        {Array.isArray(plan.zielgruppe) && plan.zielgruppe.length ? (
          <section className="mt-8">
            <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">Wen die Anzeige erreichen soll</h2>
            <ul className="mt-3 grid list-none gap-2.5 p-0">
              {plan.zielgruppe.slice(0, 6).map(z => (
                <li key={z} className="flex gap-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
                  <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d6fd0]" />
                  {z}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/**
          * DAS DASHBOARD — DAS EINZIGE, WAS GELD KOSTET (Owner 09.09.2026: „drunter müsste
          * noch Dashboard stehen. Was das Dashboard ist, und das muss er kaufen").
          *
          * ES STEHT GANZ UNTEN, NACH ALLEM KOSTENLOSEN. Wer bis hierher gelesen hat, hat
          * Texte, Bild und Link schon in der Hand — er weiss also, dass es funktioniert,
          * bevor zum ersten Mal ein Preis auftaucht. Umgekehrt vergleicht er, statt zu
          * rechnen.
          */}
        <section className="mt-8 rounded-2xl border-[1.5px] border-[#1d6fd0]/45 bg-[#eaf2fc] p-5">
          {/* MIT SPRACHE, SONST STEHT DA „€299" (09.09.2026 beim Ansehen gesehen): `eur()`
              nimmt ohne Angabe Englisch und stellt das Zeichen voran. Auf einer deutschen
              Seite gehört es hinter die Zahl. */
           /* DER PREIS KOMMT AUS DER TABELLE, NIE GETIPPT (Hausregel
              `prices-only-from-pricing-table`). Er stand hier eine Stunde lang als „299 €"
              im Text — die erste Preisänderung hätte ihn übersehen. */}
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#1d6fd0]">
            {eur(VERSUSFORGE_START_CENTS, "de")} einmalig
          </p>
          <h2 className="m-0 mt-2 text-[21px] font-extrabold tracking-[-0.02em]">Das Dashboard</h2>

          {/* EINE LISTE, KEIN FLIESSTEXT (Owner 09.09.2026: „wir brauchen alles, was er
              bekommt, als Liste und nicht als Text"). Vier Zeilen, die man zählen kann,
              schlagen einen Absatz, den man überfliegt — und beim Preis zählt man. */}
          <ul className="mt-3.5 grid list-none gap-2.5 p-0">
            {[
              "Jede Anfrage mit Namen und Telefonnummer",
              "Was der Mensch dir gesagt hat — Frage für Frage",
              "Auch die Anfragen, die vor der Freischaltung gekommen sind",
              "Wir richten die erste Anzeige mit dir zusammen in deinem Werbekonto ein",
            ].map(z => (
              <li key={z} className="flex gap-2.5 text-[15px] leading-[1.5] text-[#14181c]">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d6fd0]" />
                {z}
              </li>
            ))}
          </ul>

          {/* DER PREIS IM KNOPF (Hausregel `cta-im-viewport-template`: „Preis IM Knopf") —
              er soll nicht erst zurückscrollen müssen, um zu wissen, was er drückt. */}
          {/* HIER STAND EIN LINK AUF DAS KONTAKTFORMULAR (Owner 09.09.2026: „wie soll ich
              den scharf schalten, wenn der Kunde am Ende nichts kaufen kann?").
              Er sah aus wie ein Kaufknopf und führte auf „wir melden uns" — beim teuersten
              Produkt des Hauses. Jetzt ist es die Kasse, in der Seite. */}
          <MandantKaufen mandant={mandant} wort={`Für ${eur(VERSUSFORGE_START_CENTS, "de")} freischalten`} />
        </section>

        {/**
          * DER AUSWEG FÜR DEN, DER ES NICHT SELBST HINBEKOMMT (Owner 09.09.2026: „wenn er das
          * selbst nicht kapiert, dann machen wir es für ihn. Er muss uns kontaktieren.").
          *
          * ER STEHT AM ENDE, nicht oben: Wer die vier Felder kopiert bekommt, soll es zuerst
          * versuchen. Wer scheitert, findet den Satz genau dort, wo er aufgibt.
          */}
        <section className="mt-10 rounded-2xl border-[1.5px] border-[#1d6fd0]/45 bg-[#eaf2fc] p-5">
          <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">Kriegst du das nicht eingerichtet?</h2>
          {/* KEINE WIEDERHOLUNG DES ANGEBOTS (09.09.2026): Was wir für ihn tun, steht jetzt
              in der Liste darüber. Hier bleibt nur der Weg zu einem Menschen. */}
          <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
            Schreib uns. Es antwortet ein Mensch, kein Agent.
          </p>
          <a
            href="/contact?reason=versusforge"
            className="mt-4 inline-block rounded-xl bg-[#1d6fd0] px-6 py-3.5 text-[16px] font-extrabold text-white"
          >
            Uns schreiben
          </a>
        </section>
      </div>
    </main>
  );
}
