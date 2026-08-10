"use client";

import { useEffect, useState } from "react";

import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import KartenKarussell from "@/components/KartenKarussell";
import TeilenKnopf from "@/components/TeilenKnopf";

/**
 * BEISPIELE DARF JEDER VERSCHICKEN (Owner 31.07.2026: „das kann man auch sharen, damit die
 * Leute Werbung machen können"). Beim Beispiel ist die THEMENSEITE das richtige Ziel — wer
 * den Link bekommt, soll ja hierher. Der Text wirbt fuer LuxuryBandit, nicht fuer den
 * Absender; fuer das EIGENE Ergebnis braucht es erst die Werk-Seite (OFFEN.md, Punkt 2),
 * sonst verschickt der Knopf das Falsche.
 */
export const TEILEN_TEXT: Record<string, string> = {
  de: "Schau dir das an 💋", en: "Check this out 💋", ro: "Uită-te la asta 💋",
  es: "Mira esto 💋", fr: "Regarde ça 💋", pt: "Olha isto 💋", it: "Guarda qui 💋",
};

/* Der Geburtstag verschickt keinen Kussmund (Owner 08.08.2026, mit Bild der Teilen-Zeile:
   „und was wird da bitte geshart?") — gleiche Zeile, richtiges Zeichen.

   AM 10.08.2026 KAM ES WIEDER HOCH, diesmal auf der Hochzeitsseite (Owner: „was teilst du?
   Das? Schau dir das an 💋"): Hochzeit, Urlaub, Tanz und Versprechen trugen alle den
   Kussmund, weil sie sich `TEILEN_TEXT` teilten. Ein Zeichen je Thema, unten. */
export const TEILEN_TEXT_GEBURTSTAG: Record<string, string> = {
  de: "Schau dir das an 🎂", en: "Check this out 🎂", ro: "Uită-te la asta 🎂",
  es: "Mira esto 🎂", fr: "Regarde ça 🎂", pt: "Olha isto 🎂", it: "Guarda qui 🎂",
};

/** Das Zeichen zum Thema — ohne Eintrag bleibt es beim Kussmund (der Kuss ist die Vorlage). */
const ZEICHEN: Record<string, string> = {
  birthday: "🎂", wedding: "💍", holiday: "🌴", gutschein: "🎁",
  poledance: "💃", surprise: "💃", versprechen: "🤝",
};

/**
 * DER SATZ ZUR VORLAGE (Owner 10.08.2026, nachdem er sah, was der Knopf kopiert: „Schau dir
 * das an 💍 …/einladung/beispiel").
 *
 * Der Link war endlich richtig, der Satz nicht: „Schau dir das an" sagt man über ein lustiges
 * Video. Wer seine Muster-Einladung verschickt, sagt etwas ganz anderes — er zeigt, was
 * ENTSTEHT. Der Empfänger ist die Braut, der Trauzeuge, die Mutter; die wollen nicht
 * „draufschauen", die wollen wissen, was da kommt.
 */
export const VORLAGE_TEXT: Record<string, string> = {
  de: "So wird unsere Hochzeitseinladung aussehen 💍",
  en: "This is what our wedding invitation will look like 💍",
  ro: "Așa va arăta invitația noastră de nuntă 💍",
  es: "Así será nuestra invitación de boda 💍",
  fr: "Voilà à quoi ressemblera notre invitation de mariage 💍",
  pt: "É assim que vai ser o nosso convite de casamento 💍",
  it: "Ecco come sarà il nostro invito di nozze 💍",
};

/** „Schau dir das an" plus das Zeichen des Themas — eine Zeile, sieben Sprachen. */
export function teilenText(thema: string, lang: string): string {
  const roh = TEILEN_TEXT[lang] ?? TEILEN_TEXT.en;
  const z = ZEICHEN[thema];
  return z ? roh.replace("💋", z) : roh;
}

/**
 * DIE BEISPIELE — dieselbe Karte, mehrmals untereinander.
 *
 * Owner 31.07.2026, in drei Schritten bis hierher: „mach lieber die Galerie nicht in zwei
 * Reihen sondern in einer Reihe, und du machst den Button Replace People auf jedem" — dann,
 * nach dem ersten Versuch: „du machst diese Karte mehrmals untereinander und nimmst unsere
 * Kiss-Videos."
 *
 * Der zweite Vorschlag ist der bessere, und der Grund ist derselbe wie oben auf der Seite:
 * Eine Kachel in einem Raster ist ein Vorschaubild. Dieselbe Karte mit Ornamenten, in voller
 * Breite, ist ein ERGEBNIS — sie sieht aus wie das, was er bekommt, weil es dieselbe Datei
 * ist. Und wer scrollt, sieht viermal dasselbe Versprechen statt einmal acht Briefmarken.
 *
 * Auf jeder Karte derselbe Knopf: „Personen ersetzen". Damit ist jedes Beispiel ein
 * Startpunkt und nicht Deko — „genau das, aber mit uns beiden".
 *
 * WARUM EIN FENSTER-EREIGNIS UND KEIN PROP: Die Karten stehen auf der SEITE (Server), der
 * Trichter ist ein eigener Baustein darüber. Ein Prop hieße, den halben Trichter-Zustand
 * durch die Seite zu reichen. So ist es eine Zeile hier, eine dort.
 */

/** Der Name des Ereignisses — auch der Trichter hört genau darauf. */
export const SCHRITTE_OEFFNEN = "lb-schritte-oeffnen";

export default function BeispielGalerie({ videos, lang = "en", titel = "", gesperrtText = "", ziel = "/themes/kiss" }: {
  videos: string[];
  lang?: string;
  /**
   * WOHIN DER TEILEN-KNOPF ZEIGT. Stand fest auf `/themes/kiss` — seit die Karten auch auf
   * der Urlaubs-Seite stehen (04.08.2026), haette jede geteilte Urlaubs-Karte den Empfaenger
   * auf die Kuss-Seite geschickt. Der Link muss dorthin, wo das Video herkommt.
   */
  ziel?: string;
  /** Überschrift auf jeder Karte — beim Kuss „Der Kuss". Leer nimmt die Vorgabe der Karte. */
  titel?: string;
  /**
   * WAS DA STEHT, WENN DER GRATIS-VERSUCH WEG IST (Owner 31.07.2026: „ein zweites gibt es
   * nicht, es kostet Geld, ich habe das in 1 geändert").
   *
   * Es gibt genau EINEN Gratis-Versuch je Gerät und Tag. Vier Karten mit „Personen ersetzen"
   * versprechen vier — wer den zweiten probiert, lädt Fotos hoch und bekommt eine Absage.
   * Das ist der Moment, in dem Leute schließen statt zu kaufen. Danach tragen die Karten
   * den Kaufknopf: dieselbe Wirkung, aber ehrlich.
   */
  gesperrtText?: string;
}) {
  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const [gesperrt, setGesperrt] = useState(false);

  useEffect(() => {
    // Beim Laden nachsehen (der Deckel gilt je Gerät) und danach auf den Trichter hören.
    try { if (localStorage.getItem("lb_gratis_verbraucht") === "1") setGesperrt(true); } catch { /**/ }
    const zu = () => setGesperrt(true);
    window.addEventListener("lb-gratis-verbraucht", zu);
    return () => window.removeEventListener("lb-gratis-verbraucht", zu);
  }, []);

  if (!videos.length) return null;
  // Der Tipp fuehrt in beiden Faellen an dieselbe Stelle — dort steht dann der Kaufweg.
  const beschriftung = gesperrt && gesperrtText ? gesperrtText : T.menschenErsetzen;

  const starten = () => {
    // Erst nach oben — sonst öffnet sich der Dialog, während er unten steht, und er sieht
    // nicht, was passiert ist.
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /**/ }
    try { window.dispatchEvent(new CustomEvent(SCHRITTE_OEFFNEN)); } catch { /**/ }
  };

  /**
   * EINE KARTE, DIE VIDEOS WECHSELN SICH DARIN AB (Owner 05.08.2026: „ich will nicht mehr
   * mehrere Karten, sondern eine Karte und die Videos wechseln sich ab in der Karte" — „so
   * wird die Seite kürzer").
   *
   * Hier stand eine Karte JE VIDEO, untereinander. Bei vier Beispielen sind das vier volle
   * Handy-Höhen mit demselben Versprechen — der Besucher scrollt an allem vorbei, was danach
   * kommt, oder er hört vorher auf. Jetzt trägt EINE Karte alle Beispiele, und wer mehr sehen
   * will, wischt.
   *
   * `KartenKarussell` gab es schon (04.08.2026, für die Bau-Karte: „wie Karussell"). Bei einem
   * einzigen Video gibt es weder Bahn noch Punkte — dann ist es wieder genau die eine Karte,
   * die es vorher auch war.
   */
  return (
    <EinladungKarte
      sprache={lang} sie="" er="" demo titel={titel || undefined}
      video={
        <KartenKarussell folien={videos.map((url, i) => (
            <div key={i} className="relative">
              {/* DIE DREI SYMBOLE SETZT DIE KARTE (Skill `card`): Vergroessern links,
                  Ton rechts, Teilen darunter. Hier stand der Teilen-Knopf frueher von Hand
                  links oben — eine von sechs Stellen, an denen er seinen eigenen Platz hatte. */}
              <EinladungAnsicht id="" videoUrl={url} zaehlen={false}
                tonText={T.ton} tonAusText={T.tonAus} grossText={T.gross} kleinText={T.klein}
                teilen={
                  <TeilenKnopf rund url={`${ziel}?utm_source=share`}
                    text={TEILEN_TEXT[lang] ?? TEILEN_TEXT.en}
                    label={T.teilen} kopiertLabel={T.zusDanke} />
                } />
              {/* DAS GANZE VIDEO IST DER KNOPF (Owner 31.07.2026: „beim Klick auf Video kommt
                  direkt Upload"). Wer ein Beispiel ansieht und es antippt, meint genau das —
                  ihn dann eine kleine Schaltfläche suchen zu lassen, ist eine Hürde ohne
                  Grund.
                  Die Fläche beginnt erst unter dem Ton-Knopf (`top-16`), sonst läge sie
                  darüber und die Musik wäre nicht mehr einzuschalten. Ein <div> und kein
                  <button>, weil ein Knopf im Knopf kaputtes HTML ist. */}
              <div role="button" tabIndex={0} onClick={starten}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); starten(); } }}
                aria-label={beschriftung}
                className="absolute inset-x-0 bottom-0 top-16 z-20 flex cursor-pointer items-end justify-center p-4">
                {/* EIN RICHTIGES CTA (Owner 31.07.2026: „richtiges CTA"). Vorher eine dunkle,
                    halbdurchsichtige Pille — die sah aus wie eine Bildunterschrift und nicht
                    wie etwas, das man drückt. Jetzt dasselbe Gold wie jeder andere Knopf in
                    der Karte, volle Breite. */}
                {/* Derselbe CI-Knopf wie oben: gelb auf dunkel, blau in der Hell-Fassung. */}
                <span className="lb-gold flex h-12 w-full items-center justify-center rounded-full text-[14px] font-black shadow-[0_6px_20px_rgba(0,0,0,0.35)]">
                  {beschriftung}
                </span>
              </div>
            </div>
          ))} />
      }
    />
  );
}
