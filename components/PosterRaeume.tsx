"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WandBildContext } from "@/components/PosterWandBild";

/**
 * DAS BLATT UND SEINE ZIMMER — EIN SLIDER (Owner 18.09.2026: „nicht als Extrabild sondern nach
 * dem Poster die Slides").
 *
 * Folie 0 ist das WERK selbst (dieselbe Kachel wie bisher, mit allem Werkzeug: Rahmen wechseln,
 * „You as a picture", Texte ändern). Danach kommen die Zimmer. Es steht also kein zweites Bild
 * unter dem Poster — man wischt vom Blatt in die Wohnung.
 *
 * ── WARUM NICHT JE WERK EIN GERENDERTES FOTO ────────────────────────────────────────────────
 *
 * Singulart legt für jedes Werk fertige Zimmerbilder ab. Bei uns ändert sich das Blatt, während
 * jemand davorsteht: Er tauscht den Rahmen, die Grösse, und mit „You as a picture" sogar das
 * Bild. Ein vorgerendertes Foto wäre nach dem ersten Klick falsch.
 *
 * Deshalb hängt hier das ECHTE Blatt (dieselbe Komponente wie oben) in einem Zimmerfoto — per
 * CSS skaliert und an die Stelle gesetzt, an der die Wand frei ist. Es kostet nichts je Werk,
 * ist immer aktuell, und wer den Rahmen wechselt, sieht ihn sofort an der Wand.
 *
 * DIE ZIMMER sind unsere eigenen Bilder (hochkant 3:4, Kamera parallel, Wand leer). Für jedes
 * steht hier, wo das Blatt hängt — in Prozent des Bildes, damit es auf jeder Breite stimmt.
 */
/**
 * DIE STELLE AN DER WAND IST IN JEDEM ZIMMER DIESELBE (Owner 18.09.2026: „Poster immer mittig
 * platzieren" · „soll immer die gleiche Position haben im Bild").
 *
 * Alles in % des ZIMMERBILDES (nicht des Kastens) — deshalb liegt das Blatt unten in einem
 * Wrapper, der genau so breit ist wie das Bild. Die Zimmer sind mittig und auf gleicher Höhe
 * fotografiert, also trägt EINE Angabe für alle: Wer durchblättert, sieht dasselbe Blatt in
 * verschiedenen Wohnungen, nicht ein wanderndes Bild.
 */
const BLATT = {
  /** Mitte des Blattes, waagerecht. */ links: 50,
  /** Mitte des Blattes, senkrecht. */ oben: 30,
  /** Blattbreite — grosszügig (Owner: „Poster grösser"): Was an der Wand verschwindet, verkauft
      nichts.

      ── EINE BREITE FÜR JEDES WERK (Owner 18.09.2026: „rechts ist es gut bei dem Selbstporträt") ──
      Vorher bekam ein Blatt mit QUEREM Werk 25 % mehr Breite. Das Blatt selbst ist aber immer
      hochkant (1 : 1,4142) — quer ist nur das Werk DARIN. Der Zuschlag liess dieselbe Papiergrösse
      an derselben Wand verschieden breit erscheinen, je nach Motiv. */ breite: 40,
};

const RAEUME = [
  "/lakatosbandi/zimmer-1.jpg",
  "/lakatosbandi/zimmer-2.jpg",
  "/lakatosbandi/zimmer-3.jpg",
  "/lakatosbandi/zimmer-4.jpg",
];

/**
 * ── EIN KLEINES BLATT WIRD GERECHNET, NICHT GESTAUCHT (Owner 18.09.2026: „die Schrift in den
 * Postern sehen live nicht gut aus, sie sind verschoben im Grossbild und in der Miniatur") ────
 *
 * Das Blatt rechnet jede Grösse als Anteil seiner Breite. Ein Blatt von 25 px Breite bekommt
 * damit eine Schrift von zwei Pixeln — und genau dort greift der Browser ein: Handys und jede
 * eingestellte Mindestschriftgrösse heben zu kleine Schrift an, aber nur SIE, nicht das Bild und
 * nicht die Ränder. Das Raster verrutscht, Zeilen brechen um, ein Feld bekommt einen
 * Scrollbalken. (Zielgruppe über 60 — vergrösserte Schrift ist dort die Regel, nicht die
 * Ausnahme.)
 *
 * Also wird das Blatt IMMER in voller Grösse gebaut (`REF` Pixel breit) und danach als Ganzes
 * verkleinert: `transform: scale`. Schrift, Ränder, Rahmen und Bild schrumpfen zusammen, exakt
 * im selben Verhältnis — was klein aussieht, ist in Wahrheit ein grosses Blatt. Der Browser
 * findet nichts mehr zum Anheben.
 */
/* 620 px, nicht 420: Bei 400 px Blattbreite misst der Fliesstext 10 px — genau die Grösse, die
   Handys und eingestellte Mindestgrössen anheben. Auf 620 px sind es 16 px, und niemand fasst
   sie mehr an. Grösser lohnt nicht: Dann lädt jede Miniatur ein unnötig grosses Bild. */
const REF = 620;

function Massstab({ breite, kinder, schatten }: {
  /** Die Breite, die das Blatt am Ende haben soll — in Pixeln, gemessen. */
  breite: number;
  kinder: React.ReactNode;
  schatten?: string;
}) {
  const k = breite > 0 ? breite / REF : 0;
  return (
    <span className="block" style={{
      width: `${REF}px`,
      /* ERST schieben, DANN verkleinern (`scale(k) translate(…)`): Prozente im `translate`
         beziehen sich auf die UNSKALIERTE Breite — in der anderen Reihenfolge landet das Blatt
         um zweihundert Pixel daneben. */
      transformOrigin: "top left",
      transform: `scale(${k}) translate(-50%, -50%)`,
      visibility: k ? "visible" : "hidden",
      ...(schatten ? { filter: schatten } : {}),
    }}>{kinder}</span>
  );
}

/**
 * Dasselbe für das GROSSE Blatt, das im Textfluss steht: Es wird in voller Grösse gebaut und auf
 * die verfügbare Breite heruntergerechnet. Der Kasten aussen bekommt die fertige Höhe, damit
 * nichts überlappt.
 *
 * Auch hier geht es um die Schrift (Owner 18.09.2026: „verschoben im Grossbild"): Bei 400 px
 * Blattbreite sind zwei Sätze nur zehn Pixel hoch — knapp unter dem, was Handys und
 * eingestellte Mindestgrössen noch unangetastet lassen. Gebaut wird das Blatt deshalb mit
 * `REF` Pixeln Breite, wo dieselbe Zeile sechzehn Pixel misst.
 */
function MassstabFluss({ breite, children }: { breite: number; children: React.ReactNode }) {
  const [innen, setInnen] = useState<HTMLDivElement | null>(null);
  const [hoch, setHoch] = useState(0);
  useEffect(() => {
    if (!innen || typeof ResizeObserver === "undefined") return;
    /* `offsetHeight`, nicht `getBoundingClientRect`: Letzteres gäbe die bereits verkleinerte
       Höhe zurück — und daraus die neue Höhe zu rechnen, schaukelt sich nach unten weg. */
    const mess = () => setHoch(innen.offsetHeight);
    mess();
    const ro = new ResizeObserver(mess);
    ro.observe(innen);
    return () => ro.disconnect();
  }, [innen]);
  const k = breite > 0 ? breite / REF : 0;
  return (
    <div style={{ height: k && hoch ? `${hoch * k}px` : undefined, overflow: "hidden" }}>
      <div ref={setInnen} style={{ width: `${REF}px`, transformOrigin: "top left", transform: k ? `scale(${k})` : undefined }}>
        {children}
      </div>
    </div>
  );
}

/** Die Breite eines Elements, laufend gemessen — daraus entsteht der Massstab oben. */
function useBreite<T extends HTMLElement>() {
  const [breite, setBreite] = useState(0);
  const el = useRef<T | null>(null);
  const setzen = useCallback((n: T | null) => { el.current = n; if (n) setBreite(n.getBoundingClientRect().width); }, []);
  useEffect(() => {
    const n = el.current;
    if (!n || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBreite(n.getBoundingClientRect().width));
    ro.observe(n);
    return () => ro.disconnect();
  }, []);
  return [setzen, breite] as const;
}

export default function PosterRaeume({ children, blatt, hoch = true, aus = false }: {
  /** Folie 0: das Werk mit allem Werkzeug. */
  children: React.ReactNode;
  /** Dasselbe Blatt ohne Werkzeug — das hängt an der Wand. */
  blatt: React.ReactNode;
  /** Hochkant hängt schmaler an der Wand als quer. */
  hoch?: boolean;
  /** Ohne Postershop (Originale, Kleidung) gibt es nichts zu hängen: nur das Werk. */
  aus?: boolean;
}) {
  const [i, setI] = useState(0);
  /* ── SEIN BILD HÄNGT MIT AN DER WAND (Owner 18.09.2026: „auch das Bild muss dann an die Wand
     gesehen werden" · „das hochgeladene und das generierte") ─────────────────────────────────
     `PosterDeinBild` trägt hier ein, was gerade im Blatt steht; die Zimmer und die Miniaturen
     lesen es (siehe components/PosterWandBild.tsx). */
  const [wandBild, setWandBild] = useState<string | null>(null);
  /* Gemessen wird je EIN Vertreter: alle Zimmer sind gleich breit, alle Miniaturen auch. */
  const [zimmerRef, zimmerBreite] = useBreite<HTMLDivElement>();
  const [miniRef, miniBreite] = useBreite<HTMLSpanElement>();
  const [mini0Ref, mini0Breite] = useBreite<HTMLSpanElement>();
  const [folieRef, folieBreite] = useBreite<HTMLDivElement>();
  const wand = useMemo(() => ({ bild: wandBild, setBild: setWandBild }), [wandBild]);
  if (aus) return <WandBildContext.Provider value={wand}>{children}</WandBildContext.Provider>;

  return (
    <WandBildContext.Provider value={wand}>
    <div>
      {/* ── DER KASTEN SPRINGT NICHT (Owner 18.09.2026: „wieso sind die Slider unterschiedlich
          gross, also höher als das Poster, es springt") ────────────────────────────────────────
          Die Höhe gibt IMMER das Poster vor: Folie 0 bleibt im Layout stehen (nur unsichtbar),
          die Zimmer legen sich darüber. So bleibt der Kasten beim Blättern gleich hoch — und der
          Kaufknopf darunter bleibt, wo der Finger ihn erwartet.

          Folie 0 bleibt ausserdem IM DOM, sonst verliert das Werkzeug (gewählter Rahmen,
          erzeugtes Bild, geänderter Text) seinen Zustand. */}
      <div ref={folieRef} className="relative">
        <div className={i === 0 ? "" : "invisible"}>
          <MassstabFluss breite={folieBreite}>{children}</MassstabFluss>
        </div>

        {RAEUME.map((datei, k) => (
          i !== k + 1 ? null : (
            <div key={datei} className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl bg-[#f2f1ed]">
              {/* Das Bild so hoch wie der Kasten, der Wrapper genau so breit wie das Bild —
                  darauf beziehen sich die Prozente oben. */}
              <div ref={zimmerRef} className="relative h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={datei} alt="" loading="lazy" className="block h-full w-auto" />
                <span className="absolute block"
                  style={{
                    left: `${BLATT.links}%`, top: `${BLATT.oben}%`,
                    /* ── EIN KLEINER, HARTER SCHATTEN (Owner 18.09.2026: „ich brauch doch einen
                       Schatten an die Wand, aber ganz klein und nicht weich") ──────────────────
                       Erst war er zu gross, dann ganz weg — und dann klebte das Blatt flach auf
                       dem Foto wie aufgedruckt. Ein Rahmen steht zwei Zentimeter von der Wand ab:
                       kurzer Versatz nach rechts unten, kaum Weichzeichner, das reicht. Nur in der
                       grossen Folie — auf einer 64px-Miniatur wäre er nur Schmutz. */
                  }}>
                  <Massstab breite={zimmerBreite * BLATT.breite / 100}
                    schatten="drop-shadow(3px 4px 2px rgba(0,0,0,.42))" kinder={blatt} />
                </span>
              </div>
            </div>
          )
        ))}
      </div>

      {/* ── MINIATUREN STATT PUNKTE (Owner 18.09.2026: „brauche die Miniaturen, nicht Punkte
          unter dem Bild für den Slider") ───────────────────────────────────────────────────
          Ein Punkt sagt nur, DASS es weitergeht. Eine Miniatur zeigt, WOHIN.

          UND AUF DER MINIATUR HÄNGT DAS BLATT (Owner 18.09.2026: „was soll die leere Wand im
          Kachel, die Bilder müssen drauf") — ein leeres Zimmer sieht aus wie ein Möbelkatalog.
          Deshalb steht in jeder Kachel dasselbe Bauwerk wie in der Folie, nur klein: Das Blatt
          rechnet in Container-Einheiten und schrumpft samt Rahmen von allein mit. */}
      <div className="mt-3 flex items-center justify-center gap-2">
        {/* Kachel 0: das Blatt allein — das ist Folie 0. */}
        <button type="button" onClick={() => setI(0)} aria-label="1"
          className={`flex h-[86px] w-[64px] items-center justify-center overflow-hidden rounded-md border bg-white p-[3px] transition ${
            i === 0 ? "border-[#111]" : "border-[#ddd4c0] hover:border-[#999]"}`}>
          <span ref={mini0Ref} className="relative block h-full w-full">
            <span className="absolute block" style={{ left: "50%", top: "50%" }}>
              <Massstab breite={mini0Breite * 0.96} kinder={blatt} />
            </span>
          </span>
        </button>

        {RAEUME.map((datei, k) => (
          <button key={datei} type="button" onClick={() => setI(k + 1)} aria-label={`${k + 2}`}
            className={`flex h-[86px] w-[64px] items-center justify-center overflow-hidden rounded-md border bg-[#f2f1ed] p-0 transition ${
              i === k + 1 ? "border-[#111]" : "border-[#ddd4c0] hover:border-[#999]"}`}>
            <span ref={k === 0 ? miniRef : undefined} className="relative block h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={datei} alt="" loading="lazy" className="block h-full w-auto max-w-none" />
              <span className="absolute block"
                style={{ left: `${BLATT.links}%`, top: `${BLATT.oben}%` }}>
                {/**
                  * ── IN DER MINIATUR GILT DERSELBE MASSSTAB WIE IM RAUM (Owner 18.09.2026:
                  * „und die Poster auch zu gross in den Miniaturen" · „nein, das habe ich nie so
                  * gemeint. Ich bin nicht blöd") ──────────────────────────────────────────────
                  *
                  * HIER STAND EIN AUFSCHLAG VON 45 %, begründet mit seinem Satz „was soll die
                  * leere Wand im Kachel". Der Satz sagt, dass eine Kachel nicht leer wirken soll —
                  * er sagt NICHT, dass das Blatt grösser sein soll, als es an der Wand hängt. Die
                  * Begründung hat ihm etwas in den Mund gelegt, und das Ergebnis sah aus wie eine
                  * Tapete statt wie ein Bild.
                  *
                  * OHNE AUFSCHLAG ist die Miniatur eine verkleinerte Fassung des Raumbildes
                  * daneben — dieselbe Wand, dasselbe Verhältnis.
                  */}
                <Massstab breite={miniBreite * BLATT.breite / 100}
                  kinder={blatt} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
    </WandBildContext.Provider>
  );
}
