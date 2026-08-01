import Link from "next/link";
import { fillPrices } from "@/lib/pricing";
import { notFound } from "next/navigation";
import { readEinladungen } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import ZusagenKarte from "@/components/ZusagenKarte";
import GruppenChat from "@/components/GruppenChat";
import EinladungBearbeiten from "@/components/EinladungBearbeiten";
import LightSwitch from "@/components/LightSwitch";

/**
 * DIE EINLADUNG, wie der Gast sie sieht (Owner 31.07.2026).
 *
 * Absichtlich eine eigene, nackte Seite: keine Kopfleiste, kein Menü, keine anderen Themen.
 * Wer diesen Link bekommt, ist nicht auf einer Werbeseite, sondern bei der Einladung eines
 * Freundes — alles andere wäre peinlich für die, die ihn verschickt hat, und dann verschickt
 * sie ihn nicht.
 *
 * Die Herkunft steht in EINER Zeile ganz unten. Das ist der ganze Kanal: unaufdringlich genug,
 * dass sie sich nicht schämt, sichtbar genug, dass ein Gast sie findet.
 *
 * `noindex`: Diese Seite gehört zwei Menschen, nicht Google.
 */

export const dynamic = "force-dynamic";

/**
 * DER TITEL IST DAS, WAS IM CHAT ANKOMMT.
 *
 * Er stand fest auf „Einladung" — ein deutsches Wort, das jeder Gast im Browser-Reiter sah,
 * gleich in welcher Sprache er die Seite las. Und wichtiger: Wer den Link in einen Chat klebt,
 * bekommt genau diese Zeile als Vorschau. „Einladung" sagt nichts; „Ana & Mihai 💍" ist der
 * Grund, warum jemand tippt.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gast = await resolveLang();
  const T = KARTE_TEXTE[gast] ?? KARTE_TEXTE.en;
  const e = (await readEinladungen().catch(() => [])).find(x => x.id === id);
  const namen = e && !e.revoked && e.sie && e.er ? `${e.sie} & ${e.er} 💍` : "";
  return {
    title: namen || T.save,
    description: namen ? T.save : undefined,
    robots: { index: false, follow: false },
  };
}


export default async function EinladungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alle = await readEinladungen().catch(() => []);
  const e = alle.find(x => x.id === id);
  if (!e || e.revoked || !(e.videoUrl || e.bildUrl)) notFound();

  /**
   * DIE PROBEWOCHE (Owner 31.07.2026). Sieben Tage lang laeuft die Einladung vollstaendig —
   * mit Zusagen, Neuigkeiten und Gruppe. Danach ist zu, bis das Paar freischaltet.
   *
   * Absichtlich eine FREUNDLICHE Sperre und keine leere Seite: Auf der anderen Seite sitzen
   * die Gaeste, die nichts dafuer koennen. Sie sollen wissen, dass die Hochzeit stattfindet
   * und woran es liegt — sonst denken sie, es sei abgesagt.
   */
  const abgelaufen = !e.bezahlt && !!e.probeBis && new Date(e.probeBis).getTime() < Date.now();
  const tageUebrig = e.bezahlt || !e.probeBis ? 0
    : Math.max(0, Math.ceil((new Date(e.probeBis).getTime() - Date.now()) / 86_400_000));

  /**
   * DIE SPRACHE DES GASTES, NICHT DIE DES BRAUTPAARS (Owner 31.07.2026: „sollen wir nicht
   * erwähnen dass die einladung multilanguage ist automatisch? für internationale gäste?").
   *
   * Bis hierher stand hier `e.lang` — die Sprache, in der SIE die Einladung angelegt hat. Ein
   * Gast in Frankreich las damit Rumänisch. Gerade bei rumänischen und französischen
   * Hochzeiten sitzt aber ein guter Teil der Gäste im Ausland; für die ist genau das der
   * Unterschied zwischen „verstanden" und „weitergewischt".
   *
   * `resolveLang` nimmt zuerst die Wahl im Umschalter, dann die Browsersprache des Gastes.
   * Nur wenn wir seine Sprache nicht sprechen, fällt es auf die des Brautpaars zurück — das
   * ist die bessere Vermutung als Englisch, denn die meisten Gäste teilen sie.
   */
  const gast = await resolveLang();
  const sprache = KARTE_TEXTE[gast] ? gast : (KARTE_TEXTE[String(e.lang ?? "")] ? String(e.lang) : "en");
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  return (
    /* Hell als Vorgabe (Owner 31.07.2026: „default ist light modus") — eine
       Hochzeitseinladung ist hell; der Schalter oben rechts stellt auf dunkel. */
    <main className="lb-bg lb-theme lb-fb min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-6">
        {/* HELL UND DUNKEL AUCH HIER (Owner 31.07.2026: „und es muss light und dark sein").
            Klein und in der Ecke: Diese Seite ist eine Einladung, kein Bedienfeld — der
            Schalter darf da sein, aber er darf dem Brautpaar nicht die Schau stehlen. */}
        {/* Links der Zurueck-Pfeil (nur fuer den Betreiber sichtbar), rechts hell/dunkel.
            Fuer einen Gast bleibt die Zeile genau so leer wie vorher. */}
        {/* Der Zurueck-Weg sitzt jetzt in der Bearbeiten-Karte — dort, wo auch das Paar ihn
            findet, nicht nur der Betreiber mit Admin-Kennung. */}
        <div className="mb-4 flex justify-end"><LightSwitch hellText={T.hell} dunkelText={T.dunkel} /></div>
        {/* DIE KARTE — dieselbe Komponente, die im Trichter als Vorschau steht. Was die
            Kundin dort gesehen hat, sieht ihr Gast hier. */}
        <EinladungKarte sprache={sprache} sie={e.sie ?? ""} er={e.er ?? ""}
          datum={abgelaufen ? undefined : e.datum} ort={abgelaufen ? undefined : e.ort}
          adresse={abgelaufen ? undefined : e.adresse} telefon={abgelaufen ? undefined : e.telefon}
          video={
            abgelaufen ? (
              /* Kein Bild und kein Video mehr — aber ein klarer Satz statt eines leeren Rahmens. */
              <div className="grid aspect-[3/4] w-full place-items-center px-6 text-center">
                <div>
                  <p className="font-serif text-[17px] font-bold">{T.abgelaufen}</p>
                  <p className="mt-2 font-serif text-[14px] leading-snug opacity-75">{T.abgelaufenGast}</p>
                </div>
              </div>
            ) : e.videoUrl ? (
              <EinladungAnsicht id={e.id} videoUrl={e.videoUrl} tonText={T.ton} tonAusText={T.tonAus} />
            ) : (
              /* PROBEWOCHE: das Gratis-Bild statt des Videos. Fuer den Gast sieht die Karte
                 gleich aus — er weiss nicht, dass hier noch nichts bezahlt wurde, und das
                 soll er auch nicht: Es ist ihre Einladung, nicht unsere Verkaufsseite. */
              /* Volle Hoehe, kein Schnitt — dieselbe Regel wie beim Bauen (Owner 31.07.2026:
                 „das Bild ist abgeschnitten"). Die KI liefert 2:3, der Kasten stand auf dem
                 3:4 des Videos. Was der Gast sieht, muss vollstaendig sein: Hier haengt es
                 sieben Tage lang, und niemand kann es nachbessern. */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.bildUrl} alt="" width={1024} height={1536} className="block h-auto w-full" />
            )
          } />

        {/* WER KOMMT — direkt unter der Einladung (Owner 31.07.2026). Der Gast sieht, wer
            schon zugesagt hat, und antwortet selbst; mehr als sein Vorname wird nicht
            gefragt. Das ist die Gaesteliste des Paares, ohne dass wir Gaestedaten sammeln. */}
        {/* Bearbeiten und Verschicken — der Knopf erscheint nur beim Brautpaar; ein Gast
            sieht an dieser Stelle gar nichts. */}
        <EinladungBearbeiten id={e.id} sprache={sprache} sie={e.sie ?? ""} er={e.er ?? ""}
          datum={e.datum} ort={e.ort} adresse={e.adresse} telefon={e.telefon} />

        {!abgelaufen && <ZusagenKarte sprache={sprache} id={e.id} zusagen={e.zusagen ?? []} />}

        {/* NEUIGKEITEN UND GRUPPE — der Grund, warum der Gast ueber den Link wiederkommt. */}
        {!abgelaufen && (
          <GruppenChat sprache={sprache} id={e.id} nachrichten={e.chat ?? []} news={e.news ?? []}
            sie={e.sie} er={e.er} />
        )}

        {/* NUR FUER DAS PAAR SICHTBAR: wie lange die Probewoche noch laeuft. Der Gast sieht das
            nicht — fuer ihn ist es einfach die Einladung seiner Freunde. */}
        {!e.bezahlt && !abgelaufen && tageUebrig > 0 && (
          <p className="mt-3 text-center text-[11px] font-bold text-white/45">{T.probeTage(tageUebrig)}</p>
        )}

        {/**
          * DER WEG ZURÜCK (Owner 01.08.2026: „ab dem zweiten Monat müssen sie Abo bezahlen für
          * 24 im Monat, wenn sie die Karte behalten wollen").
          *
          * Bisher endete eine abgelaufene Einladung in einer Sackgasse: „Das Brautpaar muss sie
          * wieder freischalten" — ohne zu sagen WIE. Der Satz stand auf der Gästeseite und war
          * für das Brautpaar unsichtbar; wer verlängern wollte, fand nichts.
          *
          * Der Knopf steht bewusst UNTER der Karte und nicht darin: Auf der Karte liest ihn
          * jeder Gast, und eine Hochzeitseinladung mit einem Preisschild darauf verschickt
          * niemand. Hier sieht ihn, wer die abgelaufene Karte öffnet — und das ist in aller
          * Regel das Paar selbst.
          */}
        {abgelaufen && (
          <div className="mt-4 rounded-2xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
            <p className="text-[14px] font-black text-white">{T.wiederTitel}</p>
            <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
              {fillPrices(T.wiederText, sprache)}
            </p>
            <Link href={`/themes/wedding?utm_source=einladung&abo=1&e=${encodeURIComponent(e.id)}`}
              className="lb-gold mt-3 flex h-12 w-full items-center justify-center rounded-full text-[14px] font-black active:scale-95 transition">
              {fillPrices(T.wiederKnopf, sprache)}
            </Link>
          </div>
        )}

        {/* DIE EINE ZEILE. Mehr Werbung macht die Einladung unsendbar — und dann gibt es
            diesen Kanal gar nicht. */}
        <p className="mt-10 text-center text-[11px] font-medium leading-snug text-white/35">
          {T.herkunft}{" "}
          <Link href="/themes/wedding?utm_source=einladung" className="underline">{T.eigenes}</Link>
        </p>
      </div>
    </main>
  );
}
