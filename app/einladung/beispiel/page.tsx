import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSignedUrl, readThemeConfig } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import ZusagenKarte from "@/components/ZusagenKarte";
import GruppenChat from "@/components/GruppenChat";
import LightSwitch from "@/components/LightSwitch";

/**
 * DIE BEISPIEL-EINLADUNG — dieselbe Seite, die ein Gast bekommt (Owner 31.07.2026: „das muss
 * als Preview verlinkt werden in der Topic. Sie können das schon versenden an die Leute und
 * sie bekommen das.").
 *
 * Warum eine eigene Adresse und kein echter Eintrag mit fester Kennung: Eine öffentlich
 * verlinkte echte Einladung wäre nach einer Woche voller fremder Zusagen und Chat-Nachrichten
 * — und dann zeigt das Beispiel nicht mehr das Produkt, sondern den Müll von Fremden. Hier
 * stehen feste Beispieldaten, die Eingabefelder fehlen (`demo`), und sie läuft nie ab.
 *
 * Es sind DIESELBEN Bausteine wie in der echten Einladung. Was dort geändert wird, ändert sich
 * hier mit — eine nachgebaute Vorschau wäre nach zwei Wochen eine Lüge.
 *
 * `noindex`: Google soll die Beispiel-Einladung nicht statt der Themenseite ausspielen.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Beispiel-Einladung",
  robots: { index: false, follow: false },
};

const NEWS: Record<string, string> = {
  de: "Achtung, neue Änderung: Die Hochzeit findet drinnen statt!",
  en: "Heads up, change of plan: the wedding will be held indoors!",
  ro: "Atenție, o schimbare: nunta va avea loc în interior!",
  es: "¡Atención, un cambio: la boda se celebrará dentro!",
  fr: "Attention, changement : le mariage aura lieu à l’intérieur !",
  pt: "Atenção, mudança: o casamento vai ser dentro!",
  it: "Attenzione, cambio: il matrimonio si terrà al chiuso!",
};
const CHAT: Record<string, string[]> = {
  de: ["Jochen und Gina sitzen am Tisch 6.", "Können wir eine Volksmusik-Band bekommen?", "Wie wird das Wetter?", "Hilfe, ich habe mein Kleid zu Hause vergessen — wo finde ich eins in der Stadt?"],
  en: ["Jochen and Gina are at table 6.", "Could we get a folk band?", "What’s the weather going to be like?", "Help, I left my dress at home — where can I find one in town?"],
  ro: ["Jochen și Gina stau la masa 6.", "Putem avea o formație de muzică populară?", "Cum va fi vremea?", "Ajutor, mi-am uitat rochia acasă — de unde pot lua una în oraș?"],
  es: ["Jochen y Gina están en la mesa 6.", "¿Podemos tener un grupo de música popular?", "¿Qué tiempo va a hacer?", "¡Socorro! Me he dejado el vestido en casa — ¿dónde encuentro uno en la ciudad?"],
  fr: ["Jochen et Gina sont à la table 6.", "Peut-on avoir un groupe de musique folklorique ?", "Quel temps va-t-il faire ?", "Au secours, j’ai oublié ma robe à la maison — où en trouver une en ville ?"],
  pt: ["O Jochen e a Gina estão na mesa 6.", "Podemos ter um grupo de música popular?", "Como vai estar o tempo?", "Socorro, esqueci-me do vestido em casa — onde arranjo um na cidade?"],
  it: ["Jochen e Gina sono al tavolo 6.", "Possiamo avere un gruppo di musica popolare?", "Che tempo farà?", "Aiuto, ho dimenticato il vestito a casa — dove ne trovo uno in città?"],
};
const ORT: Record<string, [string, string]> = {
  de: ["Schlosshotel Grunewald", "Musterstraße 12, 14193 Berlin"],
  en: ["The Old Manor House", "12 Sample Lane, SW1A 1AA London"],
  ro: ["Casa Timiș", "Str. Exemplu 12, 106100 Sinaia"],
  es: ["Hacienda Los Olivos", "Calle Ejemplo 12, 28001 Madrid"],
  fr: ["Château de Villandry", "12 rue Exemple, 75008 Paris"],
  pt: ["Quinta da Aveleda", "Rua Exemplo 12, 1200-001 Lisboa"],
  it: ["Villa Bellosguardo", "Via Esempio 12, 00187 Roma"],
};
const NAMEN = ["Maria", "Andrei", "Maria", "Sofia"];
const ZUSAGEN = [
  { name: "Maria", ja: true }, { name: "Andrei", ja: true },
  { name: "Sofia", ja: true }, { name: "Luca", ja: false }, { name: "Elena", ja: true },
];

export default async function BeispielEinladung() {
  const gast = await resolveLang();
  const sprache = KARTE_TEXTE[gast] ? gast : "en";
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;

  // Das ERSTE Beispielvideo des Themas — dasselbe, das auf der Themenseite läuft. Wechselt es
  // dort, wechselt es hier mit; kein zweiter Ort, an dem jemand ein Video nachtragen müsste.
  let video = "";
  try {
    const cfg = await readThemeConfig("wedding");
    const erstes = (cfg.examplePaths ?? [])[0];
    if (erstes) video = (await getSignedUrl(erstes).catch(() => "")) || "";
  } catch { /**/ }

  // Datum immer gut drei Monate voraus, damit im Beispiel nie ein vergangener Termin steht.
  const datum = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [saal, adresse] = ORT[sprache] ?? ORT.en;

  return (
    <main className="lb-bg lb-theme lb-fb min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-6">
        {/* SICHTBARER RUECKWEG (Owner 31.07.2026, zum dritten Mal an einem Tag: „wie komme
            ich zurück?"). Auf der ECHTEN Einladung ist die nackte Seite Absicht — sie gehoert
            dem Brautpaar, nicht uns. Diese Seite hier ist aber Werbung: Wer sie ansieht, soll
            mit einem Tipp zurueck zum Thema kommen und nicht die Zurueck-Taste suchen. */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link href="/themes/wedding" aria-label="Zurück"
            className="lb-chip grid h-9 w-9 place-items-center rounded-full transition active:scale-95">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <LightSwitch />
        </div>

        <EinladungKarte sprache={sprache} sie="Ana" er="Mihai" datum={datum}
          ort={saal} adresse={adresse} telefon="+00 000 000 000" demo
          video={video
            ? <EinladungAnsicht id="" videoUrl={video} zaehlen={false} tonText={T.ton} />
            : <div className="aspect-[3/4] w-full" />} />

        <ZusagenKarte sprache={sprache} demo zusagen={ZUSAGEN} />

        <GruppenChat sprache={sprache} demo sie="Ana" er="Mihai"
          news={[{ text: NEWS[sprache] ?? NEWS.en }]}
          nachrichten={(CHAT[sprache] ?? CHAT.en).map((t, i) => ({ name: NAMEN[i] ?? "Gast", text: t }))} />

        {/* Hier steht mehr als auf einer echten Einladung: Diese Seite IST die Werbung, im
            Gegensatz zu der, die eine Kundin verschickt — dort wäre derselbe Satz peinlich. */}
        <p className="mt-8 text-center text-[12px] font-bold leading-snug text-white/50">
          {T.herkunft}{" "}
          <Link href="/themes/wedding?utm_source=beispiel" className="underline">{T.eigenes}</Link>
        </p>
      </div>
    </main>
  );
}
