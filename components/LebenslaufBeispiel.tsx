import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionTitle, Fine } from "@/components/Landing";
import { Knopf } from "@/components/CI";
import { EXECUTIVE_BEISPIEL } from "@/lib/lebenslauf-vorlage";
import { executiveInSprache } from "@/lib/lebenslauf-uebersetzen";
import { isLang } from "@/lib/lang";

/**
 * „DIE SEITE, DIE DER USER BEKOMMT" — ALS SEKTION UNTER DER LANDINGPAGE (Owner 24.08.2026:
 * „zuerst brauche ich unter der Landingpage die Seite die der User bekommt. Das habe ich dir
 * doch tausend mal gesagt. Die Leute kaufen was sie sehen.").
 *
 * Bis heute zeigte die Landingpage nur das Beispiel-VIDEO — das PRODUKT ist aber die ganze
 * Profilseite (Dossier, Werdegang, Rollen, Chat). Wer kaufen soll, muss genau sie vorher
 * öffnen können. Diese Sektion ist die Tür dorthin: ein Ausschnitt des echten Dossiers
 * (dieselben Daten wie `/lebenslauf/executive`, aus `EXECUTIVE_BEISPIEL` — EINE Quelle,
 * damit Teaser und Beispielseite nie auseinanderlaufen) und der Weg auf die lebende Seite.
 *
 * EINE KOMPONENTE FÜR BEIDE SEITEN (Memory `tunnel-zeigt-landingpage-inhalt`): Die
 * Landingpage rendert sie unter der Kaufkarte, der Tunnel als `inhalt` unter dem Formular.
 *
 * KEIN GOLD-KNOPF: Der eine goldene Knopf der Seite ist der Kaufknopf auf der LandingKarte
 * (Skill `ci-design`: genau einer je Bildschirm). Der Weg zum Beispiel ist `Knopf umriss`,
 * und zusätzlich ist der Dossier-Ausschnitt selbst ein Link — zwei getrennte Links, nie
 * ineinander verschachtelt.
 */

const TEXTE: Record<string, { titel: string; zeile: string; cta: string; beispiel: string }> = {
  de: {
    titel: "Die Seite, die du bekommst",
    zeile: "Genau so sieht deine fertige Bewerbungsseite aus — mit deinem Video, deinem Werdegang und deinem Anschreiben. Sieh dir ein echtes Profil an, bevor du startest.",
    cta: "Beispielprofil ansehen",
    beispiel: "Beispiel",
  },
  ro: {
    titel: "Pagina pe care o primești",
    zeile: "Exact așa arată pagina ta de aplicare finală — videoclipul tău, parcursul tău și scrisoarea ta de intenție. Uită-te la un profil real înainte să începi.",
    cta: "Vezi profilul exemplu",
    beispiel: "Exemplu",
  },
  es: {
    titel: "La página que recibes",
    zeile: "Así es exactamente tu página de candidatura terminada — tu vídeo, tu trayectoria y tu carta de presentación. Mira un perfil real antes de empezar.",
    cta: "Ver el perfil de ejemplo",
    beispiel: "Ejemplo",
  },
  fr: {
    titel: "La page que tu reçois",
    zeile: "Voilà exactement ta page de candidature terminée — ta vidéo, ton parcours et ta lettre de motivation. Regarde un vrai profil avant de commencer.",
    cta: "Voir le profil exemple",
    beispiel: "Exemple",
  },
  pt: {
    titel: "A página que recebes",
    zeile: "É exatamente assim a tua página de candidatura final — o teu vídeo, o teu percurso e a tua carta de apresentação. Vê um perfil real antes de começares.",
    cta: "Ver o perfil de exemplo",
    beispiel: "Exemplo",
  },
  it: {
    titel: "La pagina che ricevi",
    zeile: "La tua pagina di candidatura finita è esattamente così — il tuo video, il tuo percorso e la tua lettera di presentazione. Guarda un profilo reale prima di iniziare.",
    cta: "Vedi il profilo di esempio",
    beispiel: "Esempio",
  },
  en: {
    titel: "The page you get",
    zeile: "This is exactly what your finished application page looks like — your video, your track record and your cover letter. Look at a real profile before you start.",
    cta: "View the example profile",
    beispiel: "Example",
  },
};

/**
 * SERVER-BAUSTEIN, DAMIT DAS MUSTER ÜBERSETZT IST (Owner 25.08.2026, im Bild gesehen: auf
 * der rumänischen Seite stand die Rolle des Musters auf DEUTSCH — „Gesundheits- und
 * Krankenpfleger", „INTENSIVPFLEGE"). Die Karte griff `EXECUTIVE_BEISPIEL` roh ab, während
 * die Muster-Seite es längst durch `executiveInSprache` schickt. Jetzt tun beide dasselbe:
 * EINE Quelle, EIN Übersetzer, keine halbdeutsche Karte im rumänischen Markt.
 */
export default async function LebenslaufBeispiel({ lang = "en", className = "" }: {
  lang?: string;
  className?: string;
}) {
  const t = TEXTE[lang] ?? TEXTE.en;
  const p = await executiveInSprache(EXECUTIVE_BEISPIEL, (isLang(lang) ? lang : "en"));

  return (
    <section className={`mt-10 ${className}`}>
      <SectionTitle>{t.titel}</SectionTitle>
      <Fine className="mt-3">{t.zeile}</Fine>

      {/* Der Dossier-AUSSCHNITT — dasselbe Papier, dieselbe Hierarchie wie der Hero der
          echten Seite (`components/LebenslaufExecutive.tsx`): Porträt im Papier, Name in
          Serif-Versalien, Rolle, Schwerpunkt-Etiketten. Er ist ein LINK auf das lebende
          Beispiel, kein Medien-Player — deshalb ohne die drei Karten-Symbole (Skill `card`
          gilt für Video-/Bild-Karten, das hier ist eine Tür wie `ThemenKachel`). */}
      <Link href="/lebenslauf/executive"
        className="lb-karte mt-4 block overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)] transition active:scale-[0.99]">
        <div className="flex items-center gap-4 p-4">
          <div className="relative w-[104px] shrink-0">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-[12px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* object-top: das Porträt ist das Standbild eines Sprechvideos — Zuschnitt
                  oben ankern, nie den Kopf abschneiden (Skill `card`, 24.08.2026). */}
              <img src={p.portraitUrl} alt={p.name} className="h-full w-full object-cover object-top" />
            </div>
            {/* `data-aufmedien="1"` ist hier PFLICHT, kein Schmuck (dieselbe Falle wie in
                LebenslaufExecutive.tsx): `.lb-karte span { color:#2a231c !important }`
                schlägt ein blosses `text-white` — die Aufschrift stand schwarz auf
                schwarzem Schleier. `[data-aufmedien="1"]` ist der Haken, den die Karte
                selbst für Bedienung AUF dem Bild vorsieht (Memory
                `lb-karte-important-frisst-inline-farben`). */}
            <span data-aufmedien="1" className="absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.14em]"
              style={{ background: "rgba(12,10,8,0.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}>
              {t.beispiel}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[19px] font-black uppercase leading-[1.05] tracking-[0.02em]">{p.name}</p>
            <p className="mt-1 text-[12px] font-bold leading-snug opacity-75">{p.rolle}</p>
            {p.schwerpunkte.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {p.schwerpunkte.slice(0, 3).map(s => (
                  <span key={s} className="rounded-full border border-[#1a160f]/25 px-2 py-0.5 text-[8.5px] font-black uppercase tracking-[0.04em] opacity-70">
                    {s}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 flex items-center gap-1 text-[10.5px] font-black uppercase tracking-[0.12em] opacity-55">
              {t.cta}<ArrowUpRight className="h-3.5 w-3.5" />
            </p>
          </div>
        </div>
      </Link>

      <div className="mt-3">
        <Knopf art="umriss" href="/lebenslauf/executive">{t.cta}</Knopf>
      </div>
    </section>
  );
}
