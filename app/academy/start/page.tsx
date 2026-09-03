import type { Metadata } from "next";
import { resolveLang } from "@/lib/lang-server";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import ArmeeFunnel from "@/components/ArmeeFunnel";
import { ARMEE_SPRACHEN, DEMO_KUNDE, armeeTexte, demoSzenen } from "@/lib/demo-armee";

/**
 * DER ÖFFENTLICHE TRICHTER (Owner 02.09.2026: „Du kannst es öffentlich machen. Und englisch
 * und deutsch. Damit kann ich alle länder angehen." · „der Trichter ist gut und bleibt
 * offen").
 *
 * WARUM `/armee` UND NICHT DER DEMO-PFAD: Der Trichter hing hinter einem nicht ratbaren
 * Schlüssel, weil er einem einzelnen Interessenten gezeigt werden sollte. Jetzt ist er das
 * Werbemittel selbst — er steht in Anzeigen, wird geteilt und muss lesbar sein. Kurz, in
 * beiden Sprachen verständlich, ohne Zufallsteil.
 *
 * ZWEI SPRACHEN, BEIDE STATISCH (lib/demo-armee.ts): keine Laufzeit-Übersetzung. Der erste
 * Besucher einer Sprache wartet damit 0 statt 26 bis 44 Sekunden — bei einem Trichter, den
 * eine bezahlte Anzeige füttert, entscheidet das über den ganzen Test.
 *
 * ES IST EIN BEISPIEL, UND ES SPEICHERT NICHTS (Owner: „das ist doch ein Beispiel nur und
 * enthält keine Daten" · „und bilder werden jetzt auch nicht gespeichert" · „Zahlt ein
 * Kunde, dann machen wir es"): Das Foto bleibt im Browser, die Erzeugung zeigt die fertige
 * Szene, und kein Formular schreibt irgendwohin. Die echte Kette (Bildmodell setzt das
 * Gesicht in die Szene, danach animiert Pixverse) ist erprobt und wird angeschlossen, sobald
 * ein Kunde dafür zahlt — sie hängt an genau einer Stelle in `ArmeeFunnel`.
 */

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const T = armeeTexte(String(sp.lang ?? "") || (await resolveLang("de")));
  return {
    title: `${T.claimEins} ${T.claimZwei}`,
    description: `${T.claimDrei} ${T.frageZeile}`,
  };
}

export default async function ArmeeSeite({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  /* Die Adresse sticht die gespeicherte Wahl — ein gezielt verschickter Link kommt bei jedem
     Empfänger gleich an. Ohne Angabe: seine Wahl, dann seine Browsersprache, dann Deutsch. */
  const lang = String(sp.lang ?? "") || (await resolveLang("de"));
  const T = armeeTexte(lang);

  return (
    <main className="lb-bg min-h-screen text-white">
      {/* `schlicht` schliesst den Trichter: kein Konto, kein Guthaben, kein Weg zu einem
          anderen Produkt. Der Sprachumschalter bleibt — er ist hier der ganze Punkt. */}
      <TopNav schlicht back={false} marke={DEMO_KUNDE.name} heim="/armee"
        motto={null} sprachen={[...ARMEE_SPRACHEN]} />

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <ArmeeFunnel szenen={demoSzenen(lang)} texte={T} marke={DEMO_KUNDE.name} />
      </div>

      <SeitenFuss art="schlicht" lang={lang} />
    </main>
  );
}
