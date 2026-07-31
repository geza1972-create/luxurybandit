import Link from "next/link";
import { notFound } from "next/navigation";
import { readEinladungen } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import ZusagenKarte from "@/components/ZusagenKarte";
import LightSwitch from "@/components/LightSwitch";
import AdminZurueck from "@/components/AdminZurueck";

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

export const metadata = {
  title: "Einladung",
  robots: { index: false, follow: false },
};


export default async function EinladungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alle = await readEinladungen().catch(() => []);
  const e = alle.find(x => x.id === id);
  if (!e || e.revoked || !e.videoUrl) notFound();

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
        <div className="mb-4 flex items-center justify-between gap-2">
          <AdminZurueck />
          <div className="ml-auto"><LightSwitch /></div>
        </div>
        {/* DIE KARTE — dieselbe Komponente, die im Trichter als Vorschau steht. Was die
            Kundin dort gesehen hat, sieht ihr Gast hier. */}
        <EinladungKarte sprache={sprache} sie={e.sie ?? ""} er={e.er ?? ""} datum={e.datum} ort={e.ort}
          adresse={e.adresse} telefon={e.telefon}
          video={<EinladungAnsicht id={e.id} videoUrl={e.videoUrl} tonText={T.ton} />} />

        {/* WER KOMMT — direkt unter der Einladung (Owner 31.07.2026). Der Gast sieht, wer
            schon zugesagt hat, und antwortet selbst; mehr als sein Vorname wird nicht
            gefragt. Das ist die Gaesteliste des Paares, ohne dass wir Gaestedaten sammeln. */}
        <ZusagenKarte sprache={sprache} id={e.id} zusagen={e.zusagen ?? []} />

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
