import { POSTER, POSTER_VERHAELTNIS, posterTextBreit } from "@/lib/lakatosbandi-poster";
import ArtistFair from "@/components/ArtistFair";

/** Das Aussehen der Stilzeile („BY ADRIAN ROȘU") — EINE Quelle für Blatt und `PosterStil`. */
export const posterStilStil: React.CSSProperties = {
  marginTop: `${POSTER.luft * 0.4}cqw`, fontSize: `calc(${POSTER.name.breit}cqw * var(--lb-f-stil, 1))`,
  letterSpacing: `${POSTER.name.sperre}em`, textTransform: "uppercase", color: POSTER.farben.grau,
};

/**
 * DAS BLATT (Owner 16.09.2026: „der rahmen muss DIN format haben. das bild ist das einzige was
 * variabel ist" · „texte müssen unten kleben" · „du musst eine box fürs bild anlegen der fest ist
 * von der höhe").
 *
 * ── EIN RASTER, KEIN STAPEL ─────────────────────────────────────────────────────────────────
 *
 * Das Blatt hat drei Zonen: Kopf oben, Bildfeld in der Mitte mit FESTER Höhe, Textblock unten am
 * Rand. Die Maße kommen aus `lib/lakatosbandi-poster.ts` — dieselben Zahlen, aus denen die
 * Druckdatei entsteht.
 *
 * ── WARUM `cqw` UND NICHT PIXEL ─────────────────────────────────────────────────────────────
 *
 * `container-type: inline-size` macht das Blatt zum Maßstab: 1 cqw ist ein Prozent SEINER
 * Breite. Damit schrumpft die Schrift mit dem Blatt, statt in einer schmalen Kachel plötzlich zu
 * gross zu sein — genau wie ein gedrucktes A3 dasselbe Poster ist wie ein A1, nur kleiner. Ein
 * Poster mit Pixelschrift wäre in drei Rasterbreiten drei verschiedene Entwürfe.
 */
export default function Poster({ bildHoch, nameBreit, qrEcke, qrLink, bildKnopf, textKnopf, stil, bildEcke,
  kopf, bild, profil, name, leben, titel, text, qr, scan, marke, recht, siegel, klasse = "",
}: {
  kopf?: string;
  /** Das Werk — kommt von aussen, weil in der Kachel ein Film daran hängt. */
  bild: React.ReactNode;
  profil?: string;
  /** Ohne Namen fällt die Künstlerzeile weg (Owner 17.09.2026: „Gerry Louisett raus"). */
  name?: React.ReactNode;
  leben?: string;
  titel?: React.ReactNode;
  /** Der Stil-Name klein unter der grossen Zeile (Werktitel, sonst Atelier) — Owner 17.09.2026. */
  /** Die kleine Zeile unter dem Titel — als Text, oder als Baustein, der selbst weiss, wann er
      erscheint (`PosterStil`: „by NAME" erst über dem eigenen Bild des Kunden). */
  stil?: React.ReactNode;
  /** Das Artist-Fair-Siegel unten neben der Adresse (Owner 18.09.2026). */
  siegel?: boolean;
  /** Etwas in der unteren rechten Bildecke — der Vergrössern-Knopf (Owner 17.09.2026). */
  bildEcke?: React.ReactNode;
  text?: React.ReactNode;
  qr?: string;
  scan?: string;
  marke?: string;
  /** Die Fusszeile: Adresse des Künstlers, und auf einem erzeugten Blatt der Stilnachweis. */
  recht?: React.ReactNode;
  klasse?: string;
  /**
   * ── EIGENE PROPORTIONEN FÜR DAS PORTRÄT-BLATT (Owner 17.09.2026: „das Bild soll jetzt grösser
   * werden" · „und sein Name ganz gross") ────────────────────────────────────────────────────
   *
   * Beim Living Poster trägt die Schrift die halbe Botschaft: Titel, Jahr, Satz, QR. Bei einem
   * Porträt ist die Botschaft das Gesicht — und darunter der NAME des Menschen, gross wie auf
   * einem Plakat. Beides sind Anteile der Blattbreite wie alles andere im Raster, keine Pixel.
   */
  bildHoch?: number;
  nameBreit?: number;
  /**
   * ── DER CODE IN DIE ECKE (Owner 17.09.2026: „QR-Code soll rechts unten stehen im Poster") ──
   *
   * Auf einem Living Poster steht der Code mittig unter dem Satz — dort gehört er hin, weil er
   * die Fortsetzung des Textes ist. Auf einem Porträt gibt es keinen Satz: Da ist er nur der
   * Zugang, und in der Ecke nimmt er dem Namen nicht den Platz weg.
   */
  qrEcke?: boolean;
  /** Wohin der Code führt (Owner 17.09.2026: „klick auf code führt zum QR fenster"). */
  qrLink?: string;
  /**
   * ── DER KUNDE IM POSTER (Owner 17.09.2026: „dann baust du hier ein button rein. direkt unter
   * dem bild. you as a picture" · „dann noch ein icon beim text rechts für edit") ─────────────
   *
   * Beide sitzen AUF dem Blatt, nicht auf einer zweiten Seite — was er ändert, sieht er dort,
   * wo es nachher gedruckt wird. Noch ohne Funktion: der Owner sagt die Schritte an.
   * Kein `<button>`: Das Blatt steht in einer Kachel, die selbst ein Link ist.
   */
  bildKnopf?: string;
  textKnopf?: boolean;
}) {
  const P = POSTER;
  const f = P.farben;

  /* Die Schriftgrösse des Satzes hängt an seiner LÄNGE, die Fläche steht fest — die Rechnung
     steht bei den Maßen (`posterTextBreit`), weil Blatt, Eingabefeld und Druckdatei dieselbe
     brauchen. Ist der Satz ein Bauteil (der Kunde schreibt selbst), rechnet es dort weiter. */
  const textBreit = posterTextBreit(typeof text === "string" ? text : "", qrEcke);

  return (
    <div
      className={`lb-poster-karte relative overflow-hidden border ${klasse}`}
      style={{
        aspectRatio: `1 / ${POSTER_VERHAELTNIS}`,
        containerType: "inline-size",
        background: f.papier,
        /* DIE KANTENFARBE STEHT IM STYLESHEET, NICHT HIER (Owner 16.09.2026: „was sind das
           jetzt für farben?") — eine Inline-Angabe schlägt jede Regel. Solange der Rahmen
           einen Verlauf hatte, malte `border-image` sie zu; ohne Verlauf kam plötzlich das
           Creme der Haarlinie durch, und der schwarze Rahmen war beige. */
      }}
    >
      <div className="absolute inset-0 flex flex-col text-center"
        style={{
          paddingLeft: `${P.rand}cqw`, paddingRight: `${P.rand}cqw`,
          paddingTop: `${P.randOben}cqw`, paddingBottom: `${P.randUnten}cqw`,
        }}>

        {/* ── ÜBERSCHRIFT UND WERK SIND EINE EINHEIT, MITTIG IM FREIEN FELD ────────────────
            (Owner 16.09.2026: „der abstand zwischen POSTER VIU und bild muss immer gleich sein"
            · „oder mittig POSTER VIU")
            Der Abstand zwischen beiden ist eine feste Zahl aus dem Raster. Die Luft, die nach dem
            Textblock übrig bleibt, verteilt sich gleichmässig über und unter dieser Einheit —
            dann steht die Überschrift bei jedem Werk an derselben Stelle relativ zum Bild, und
            das Blatt wirkt ruhig statt oben gedrängt. */}
        {/* Der Kopf steht oben am Blatt, nicht in der Mitte eines Feldes — dadurch bleibt
            mehr Höhe für das Werk (Owner 16.09.2026). */}
        {/* ── `min-h-0` AUCH HIER, SONST SCHRUMPFT NICHTS (Owner 18.09.2026, Startseite:
            „text klebt am unteren rand immer noch") ────────────────────────────────────────
            GEMESSEN auf /portal bei 179 px Blattbreite: Ein liegendes Werk sass 14,7 px über
            der Kante, ein STEHENDES 1,4 px — der Streifen hing 13,3 px unter dem Blatt und
            wurde abgeschnitten. Der Grund liegt nicht am Streifen, sondern an dieser Hülle:
            Ein Flex-Element hat von Haus aus `min-height: auto`, also mindestens die Höhe
            seines Inhalts. Das Bildfeld darunter durfte schrumpfen (`min-h-0`), diese Hülle
            nicht — und gab die Bildhöhe ungebremst nach unten weiter. */}
        <div className="flex min-h-0 flex-1 flex-col justify-start">
          {kopf ? (
            <p className="m-0 font-serif" style={{
              fontSize: `${P.kopf.breit}cqw`, letterSpacing: `${P.kopf.sperre}em`,
              marginBottom: `${P.kopf.luft}cqw`,
              textTransform: "uppercase", color: f.tinte,
            }}>{kopf}</p>
          ) : null}

          {/* ── DAS BILDFELD: VOLLE BREITE, OBEN ANLIEGEND, NICHTS BESCHNITTEN ───────────────
              (Owner 17.09.2026: „das bild bis zum rand links und rechts und obere kante. du
              schneidest das bild ab wenn hochkant")

              Vorher stand hier eine FESTE Höhe, damit das Werk das Blatt nicht sprengt — dafür
              schnitt sie jedes stehende Werk unten ab. Jetzt gibt die BREITE das Maß: das Werk
              läuft bis an beide Ränder, seine Höhe folgt seinem eigenen Verhältnis, und die
              Höchsthöhe (`bild.hoch`) begrenzt nur noch, ohne zu schneiden. */}
          {/* BIS AN DIE BLATTKANTE (Owner 17.09.2026: „bis zum rand") — der Seiten- und
              Oberrand des Blattes gilt für die Schrift, nicht für das Werk: die negativen
              Ränder heben genau `rand` und `randOben` wieder auf. */}
          {/* Rand oben, links und rechts (Owner 17.09.2026: „jetzt brauche ich rand oben und
              rechts und links") — das Werk liegt wieder im Passepartout des Blattes, nicht
              randlos darüber. Die Breite nutzt es innerhalb dieses Randes voll aus. */}
          {/* ── UND MITTIG IM FELD (Owner 18.09.2026: „die Querbilder müssen zentriert sein
              zwischen Schrift und Rahmen" · „eigentlich alle") ──────────────────────────────
              Ein stehendes Werk füllt das Feld und merkt davon nichts. Ein LIEGENDES ist nur
              halb so hoch: Es klebte oben am Rand, und darunter stand eine handbreite Leere bis
              zur Schrift — das Blatt sah aus, als fehle etwas. Zentriert teilt sich die Luft auf
              beide Seiten, und jedes Format sitzt gleich. */}
          {/* ── WAS NICHT PASST, FÄLLT UNTEN WEG (Owner 19.09.2026: „die Bilder oben nicht
              abschneiden habe ich gesagt") ─────────────────────────────────────────────────────
              Hier stand `items-center`. Das Feld hat eine Höchsthöhe und schneidet ab; mittig
              ausgerichtet nahm es oben und unten GLEICH VIEL — und oben sitzt bei einem Porträt
              der Kopf. GEMESSEN am 19.09.: Feld 484 px, Werk 540 px, also 48 px weg von der
              Stirn.
              `items-start` ändert nur, WO der Überhang liegt: Die Oberkante steht fest, gekürzt
              wird unten. Die Regel vom 17.09. („jedes Werk nimmt die Breite") bleibt unberührt,
              und die Druckdatei rechnet ohnehin mit `Math.min` — dort fällt gar nichts weg. */}
          {/* `randSeite` negativ: Das Werk greift über den Schriftrand hinaus (Owner 19.09.2026
              „das Bild ist 5 Prozent zu klein oder 10"). Dieselbe Zahl benutzen die Druckdatei
              und das Blattbild für die Feldbreite. */}
          {/* ── ES GIBT KEINEN ÜBERHANG MEHR (Owner 19.09.2026: „ganz drauf, nicht
              abgeschnitten") ───────────────────────────────────────────────────────────────────
              Hier stand erst `items-center` (schnitt oben und unten weg), dann `items-start`
              (schnitt unten). Seit das Werk ganz ins Feld passt, gibt es nichts abzuschneiden —
              und mittig ist dann das Richtige: Das Papier verteilt sich gleichmässig darum. */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
            style={{
              /**
               * ── DAS WERK WEICHT, DER SATZ WIRD NICHT ABGESCHNITTEN (Owner 18.09.2026, mit
               * Bild der Startseite: „der untere Text ist nicht auf dem Rahmen") ──────────────
               *
               * HIER STAND EINE FESTE HÖHE MIT `shrink-0`. Das Blatt hat ein festes
               * Seitenverhältnis; was das Werk beansprucht, fehlt dem Textblock. Bei einer
               * Beschreibung über zwei Zeilen — Klimt, Munch — lief der Satz unten aus dem Blatt
               * und wurde an der Rahmenkante abgeschnitten, mitten im Wort.
               *
               * DIE DRUCKDATEI MACHT ES SEIT JE RICHTIG: Dort ist die Bildhöhe das MINIMUM aus
               * Wunschhöhe und dem, was nach dem Textblock übrig bleibt
               * (`lib/lakatosbandi-druckdatei.ts`). Der Schirm rechnete andersherum — und damit
               * sahen Vorschau und gedrucktes Blatt verschieden aus.
               *
               * JETZT IST DIE ZAHL EINE OBERGRENZE: Bei kurzem Text ändert sich nichts, bei
               * langem wird das Werk ein paar Millimeter kleiner. Lieber ein etwas kleineres
               * Werk als ein angeschnittener Satz.
               */
              /* `--lb-bild-hoch` setzt das geladene Werk selbst, wenn es stehend ist
                 (`posterFormatMelden`, Owner 20.09.2026: „18 Prozent grösser") — dann darf das
                 Feld höher werden, und der Schriftblock darunter macht ihm Platz. */
              maxHeight: `calc(var(--lb-bild-hoch, ${bildHoch ?? P.bild.hoch}) * ${POSTER_VERHAELTNIS}cqw)`,
              /* ── GLEICH VIEL LUFT OBEN WIE UNTEN (Owner 18.09.2026) ────────────────────────
                 Oben steht der Blattrand (`randOben`), unten stand nichts — ein stehendes Werk
                 klebte an der Schrift, ein liegendes hing schief im Feld. Derselbe Rand unten
                 macht das Feld symmetrisch: Das Werk sitzt danach in JEDEM Format mittig
                 zwischen Rahmenkante und Schrift, ohne dass irgendwo eine Zahl geraten wird. */
              /* Der Abstand zur Schrift darunter — kleiner als der Blattrand, sonst steht die
                 Schrift wie abgehängt (Owner 19.09.2026: „zu weit unten"). */
              paddingBottom: `${P.bild.luftSchrift}cqw`,
              /* Negativ = das Werk greift über den Schriftrand hinaus (siehe `bild.randSeite`). */
              marginLeft: `${P.bild.randSeite}cqw`,
              marginRight: `${P.bild.randSeite}cqw`,
            }}>
            {bild}
            {bildEcke}

            {/* DER KNOPF LIEGT AUF DEM WERK (Owner 17.09.2026: „du machst den button übers
                bild") — er gehört zum Bild, nicht zum Textblock, und kostet so keine Blatthöhe. */}
            {bildKnopf ? (
              <span className="lb-poster-knopf absolute left-1/2 font-sans"
                style={{
                  bottom: `${P.luft * 1.5}cqw`, transform: "translateX(-50%)",
                  fontSize: `${P.text.breit * 1.15}cqw`, letterSpacing: "0.08em",
                  whiteSpace: "nowrap",
                }}>
                {/* Das Zeichen sagt, was passiert: ein Foto kommt herein (Owner 17.09.2026). */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: "1.15em", height: "1.15em" }} aria-hidden>
                  <path d="M12 16V4" />
                  <path d="m7 9 5-5 5 5" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                {bildKnopf}
              </span>
            ) : null}
          </div>

          {/* ── NULL HÖHE, DIREKT UNTER DEM BILD (Owner 17.09.2026: „schieberegler unter dem bild,
              aber nichts verschieben" · „ich brauche den schieberegler für vorher und nachher
              wieder") ─────────────────────────────────────────────────────────────────────────
              Das Bildfeld schneidet ab, was über seinen Rand hinausgeht — ein Regler darunter
              wäre unsichtbar. Dieser Platz hat keine Höhe, verschiebt also nichts; der Regler
              hängt absolut darin (`PosterDeinBild` legt ihn per Portal hier hinein). */}
          <div className="lb-poster-unter-bild relative h-0" />

        </div>

        {/* DER TEXTBLOCK KLEBT UNTEN — auf einem gedruckten Poster steht die Schrift am Fuss des
            Blattes, nicht irgendwo in der Mitte. */}
        {/* ── DAS SIEGEL HÄNGT AM BLATT, NICHT AM TEXT (Owner 18.09.2026: „warum haben die
            Stempel verschiedene Positionen. Muss gleich sein. Muss weiter zum Rand in die Ecke" ·
            „halbiere den Abstand zum Rand") ─────────────────────────────────────────────────
            Es stand im Textstreifen — und der ist mal ein, mal zwei Zeilen hoch. Gemessen auf der
            Startseite: derselbe Stempel einmal 8,2 %, einmal 4,7 % über der Unterkante. Jetzt
            hängt er am Blatt selbst, mit demselben halben Rand nach links wie nach unten. */}
        {siegel ? (
          /* `z-[4]`: Der Textstreifen darunter ist `relative` und steht im Markup SPÄTER — ohne
             diese Lage malte er sein Papier über den Stempel, und der war weg. */
          <span className="absolute z-[4] block" style={{
            /* Unten 0,4 cqw weniger: Die Leiste ist unten dicker als an der Seite (3 gegen 2,6),
               also sässe derselbe Wert optisch tiefer. GEMESSEN: 5,13 % links gegen 5,58 % unten. */
            left: `${P.randUnten / 2}cqw`, bottom: `${P.randUnten / 2 - 0.4}cqw`,
            /* Grösser als der Code gegenüber (Owner 18.09.2026: „grösser"). */
            width: `${P.qr.breit * 1.35}cqw`, height: `${P.qr.breit * 1.35}cqw`,
          }}>
            <ArtistFair groesse={0} klasse="block h-full w-full" />
          </span>
        ) : null}

        {/* ── AUF WEISSER FLÄCHE, ÜBER DEM WERK (Owner 17.09.2026: „jetzt der text mit weiss
            hinterlegen") ──────────────────────────────────────────────────────────────────────
            Das Werk läuft jetzt randlos über das ganze Blatt. Damit Name, Titel und Satz darauf
            lesbar bleiben, liegen sie auf einem Streifen Papier, der über die volle Blattbreite
            geht — die negativen Ränder heben `rand` auf, das Padding gibt der Schrift ihren
            Abstand zurück. `relative` hebt den Streifen über das Bild. */}
        <div className="relative"
          style={{
            /* Die Schrift sitzt höher (Owner 17.09.2026: „text höher") — der Streifen beginnt
               direkt unter dem Werk, statt erst nach einem Band Papier. */
            /* Auch die Luft über der Schrift folgt dem Massstab des Blocks (`--lb-schrift`) —
               unter einem stehenden Werk gehört jeder Millimeter dem Werk. */
            marginTop: `calc(${P.bild.luftUnten * 0.4}cqw * var(--lb-luft-oben, 1))`,
            marginLeft: `-${P.rand}cqw`, marginRight: `-${P.rand}cqw`,
            marginBottom: `-${P.randUnten}cqw`,
            paddingTop: `calc(${(P.luft * 0.6).toFixed(2)}cqw * var(--lb-luft-oben, 1))`,
            /**
             * ── DOPPELT, WEIL DER NEGATIVE RAND EINE HÄLFTE FRISST (Owner 18.09.2026: „Text
             * klebt am unteren Rand immer noch") ──────────────────────────────────────────────
             *
             * Der Streifen wird mit `marginBottom: -randUnten` bis an die Blattkante gezogen,
             * damit das Papier durchläuft. Damit rutscht sein Kasten um genau diesen Betrag nach
             * unten — und eine einfache Polsterung von `randUnten` endet folglich AUF der Kante.
             *
             * DIE RECHNUNG, GEMESSEN statt geraten: Der Streifen hängt am Ende einer Spalte
             * mit FESTER Blatthöhe. Wächst seine Polsterung, schrumpft das Werk darüber und die
             * Schrift bleibt, wo sie war — der doppelte Wert brachte deshalb nichts ausser einem
             * Streifen, der 31 px unter der Blattkante hing.
             *
             * Was den Abstand wirklich bestimmt: Polsterung MINUS Rahmenstärke. Der Rahmen
             * (4,5 px bei 324 px Blattbreite, also rund 0,9 cqw) frisst genau die Differenz.
             * Deshalb steht er hier als Summand — und nicht als geratener Faktor.
             */
            /* Unter einem stehenden Werk rückt der Block näher an die Kante (`untenWeg`). */
            paddingBottom: `calc(${P.randUnten + 0.9}cqw - var(--lb-unten-weg, 0cqw))`,
            background: f.papier,
          }}>
          {/* ── DER SCHRIFTBLOCK HAT SEINEN EIGENEN MASSSTAB (Owner 20.09.2026: „die Schrift dann
              kleiner bei den Hochkant-Bildern") ───────────────────────────────────────────────
              Alles im Block ist in `cqw` gesetzt — Titel, Satz, Adresse, Code, jeder Abstand,
              auch was `PosterDeinText` von aussen mitbringt. Statt jede Zahl einzeln zu
              verkleinern, wird der MASSSTAB kleiner: Diese Hülle ist selbst ein Container und
              `--lb-schrift` mal so breit wie das Blatt; ein `cqw` darin ist entsprechend
              kleiner. Bei 1 (liegendes Werk, oder Bild noch nicht geladen) ändert sich nichts.
              Der Seitenrand steht eine Ebene tiefer, weil `cqw` am Container selbst noch nach
              dem ÄUSSEREN Massstab rechnet. */}
          <div className="mx-auto" style={{ containerType: "inline-size", width: "calc(100% * var(--lb-schrift, 1))" }}>
          <div style={{ paddingLeft: `${P.rand}cqw`, paddingRight: `${P.rand}cqw` }}>
          {/* Der Künstlername steht nur noch da, wo er bestellt wird (Owner 17.09.2026: „Gerry
              Louisett raus") — auf dem Blatt trägt der TITEL des Werks die Zeile; der Name
              bleibt in der Rechtezeile am Fuss. Ohne `name` fällt die Zeile ganz weg. */}
          {name ? (
            <span className="flex items-center justify-center"
              style={{ gap: profil ? `${P.name.luft}cqw` : 0 }}>
              {profil ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profil} alt="" loading="lazy" className="shrink-0 rounded-full object-cover"
                  style={{ width: `${P.name.kreis}cqw`, height: `${P.name.kreis}cqw` }} />
              ) : null}
              <span className="font-serif" style={{
                fontSize: `calc(${nameBreit ?? P.name.breit}cqw * var(--lb-f-stil, 1))`, letterSpacing: `${P.name.sperre}em`,
                textTransform: "uppercase", color: f.tinte,
              }}>
                {name}
                {leben ? (
                  <span style={{ marginLeft: `${P.name.luft}cqw`, letterSpacing: "0.12em", color: f.grau }}>{leben}</span>
                ) : null}
              </span>
            </span>
          ) : null}

          {/* DER TITEL IST DIE ÜBERSCHRIFT DES BLATTES (Owner 17.09.2026: „Gina, 2015 ganz
              gross") — wo vorher der Name stand, steht jetzt das Werk selbst, gross wie auf
              einem Plakat. */}
          {titel ? (
            /* `relative`, weil der Stift des Kunden rechts daneben hängt (`PosterDeinText`
               mit art="titel") — dieselbe Stelle wie beim Satz darunter. */
            <p className="relative m-0 font-serif italic" style={{
              /* `--lb-f-titel`: Unter einem stehenden Werk gibt der Titel mehr ab als die kleinen
                 Zeilen (Owner 20.09.2026: „die kleine Schrift ist zu klein"). Auch sein Abstand
                 nach unten folgt ihm. */
              marginTop: `${P.luft}cqw`, fontSize: `calc(${P.titel.breit}cqw * var(--lb-f-titel, 1))`, color: f.tinte,
              lineHeight: 1.1,
              /* Der Titel allein rückt ans Werk; der Satz darunter bleibt stehen. */
              marginBottom: `calc(${(P.titel.luftUnten - P.luft).toFixed(3)}cqw * var(--lb-f-titel, 1))`,
            }}>{titel}</p>
          ) : null}

          {typeof stil === "string" ? (
            <p className="m-0 font-serif" style={posterStilStil}>{stil}</p>
          ) : (stil ?? null)}

          {text ? (
            /* DER SATZ LÄUFT NICHT IN DEN CODE (Owner 17.09.2026: „der text läuft zu weit, es
               soll nicht bis zum qr code laufen") — steht der QR in der Ecke, hält der Text auf
               BEIDEN Seiten denselben Abstand, damit er mittig bleibt. */
            /* Die Fläche steht fest, die Schrift richtet sich danach (`textBreit`, s.o.): zwei
               Zeilen hoch, egal ob drei Wörter oder drei Sätze darin stehen — das Blatt
               springt nicht, wenn der Kunde seinen Text ändert. */
            <p className="relative m-0 flex flex-col justify-center font-serif" style={{
              marginTop: `${P.luft}cqw`, fontSize: `${textBreit.toFixed(2)}cqw`,
              lineHeight: P.text.zeile, color: f.tinte,
              minHeight: `${(2 * P.text.breit * P.text.zeile).toFixed(2)}cqw`,
              /* Links nichts mehr freihalten: Der Code steht seit 17.09.2026 unten neben der
                 Adresse („dieser qr code stört, muss klein sein neben lakatosbandi.com"), nicht
                 mehr neben dem Satz. Rechts bleibt die Lücke für den Stift. */
              paddingLeft: qrEcke ? `${P.qr.breit + P.qr.luft}cqw` : 0,
              paddingRight: qrEcke ? `${P.qr.breit + P.qr.luft}cqw` : 0,
            }}>
              {text}

              {/* DER STIFT SITZT RECHTS NEBEN DEM SATZ (Owner 17.09.2026: „edit button rechts
                  vom text") — in der Lücke, die `paddingRight` ohnehin freihält, also ohne dem
                  Satz Breite oder dem Blatt Höhe zu nehmen. */}
              {/* Auf derselben Höhe wie der Code gegenüber (Owner 17.09.2026: „auch edit icon
                  zentriert") — beide hängen an der ERSTEN Zeile, nicht an der Mitte des Satzes;
                  sonst wandern sie mit, je nachdem ob er eine oder zwei Zeilen lang ist. */}
              {/* DEN STIFT ZEICHNET DER SATZ SELBST (`PosterDeinText`) — er schaltet zwischen
                  Stift, Haken und Kreuz um, und das kann nur, wer den Text hält. Hier steht
                  deshalb nur noch, WO der Satz liegt. */}
            </p>
          ) : null}


          {/* Ohne Satz gibt es keine erste Zeile, an der der Code hängen könnte — dann steht er
              wie vorher links unten in der Ecke. */}
          {qr && qrEcke && !text ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qr} alt="" loading="lazy" className="absolute"
              style={{
                /* Die Hülle darüber ist ein Container und damit der Bezug für `absolute`; sie
                   endet ÜBER der Polsterung des Streifens (`randUnten + 0.9`). Der Code steht
                   damit, wo er stand: `randUnten` über der Streifenkante (unter einem stehenden
                   Werk rückt er mit dem Block hinunter). */
                left: `${P.rand}cqw`, bottom: "-0.9cqw",
                width: `${P.qr.breit}cqw`, height: `${P.qr.breit}cqw`,
              }} />
          ) : null}

          {qr && !qrEcke ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="" loading="lazy" className="mx-auto block"
                style={{ marginTop: `${P.qr.luft}cqw`, width: `${P.qr.breit}cqw`, height: `${P.qr.breit}cqw` }} />
              {scan ? (
                <p className="m-0 font-serif italic" style={{
                  marginTop: `${P.luft}cqw`, fontSize: `${P.scan.breit}cqw`, color: f.grau,
                }}>{scan}</p>
              ) : null}
            </>
          ) : null}

          {/* Nicht zweimal dasselbe: Steht die Adresse schon oben im Kopf, bleibt die Fusszeile
              leer (Owner 17.09.2026). */}
          {marke && marke.toUpperCase() !== String(kopf ?? "").toUpperCase() ? (
            <p className="m-0 font-serif" style={{
              marginTop: `${P.marke.luft}cqw`, fontSize: `${P.marke.breit}cqw`,
              letterSpacing: `${P.marke.sperre}em`, textTransform: "uppercase", color: f.grau,
            }}>{marke}</p>
          ) : null}
          {/* ── DER CODE STEHT KLEIN NEBEN DER ADRESSE (Owner 17.09.2026: „dieser qr code stört,
              muss klein sein neben lakatosbandi.com") ─────────────────────────────────────────
              Neben dem Satz war er ein Klotz und nahm dem Text die halbe Zeile. Unten in der
              Fusszeile gehört er zu dem, was er tut: die Adresse ausschreiben. Ein Drittel so
              gross, und der Satz darüber hat die ganze Breite zurück. */}
          {/* ── DAS SIEGEL IN DIE LINKE ECKE (Owner 18.09.2026: „der Stempel kommt überall hin,
              aufs Poster" · „in die ecke links") ────────────────────────────────────────────
              Ein Prüfstempel steht am Rand, nicht in der Zeile: unten links im Passepartout, so
              gross wie der Code. In der Mitte der Fusszeile hätte er ausgesehen wie ein Wort. */}
          {recht ? (
            <p className="m-0 flex items-center justify-center font-serif" style={{
              marginTop: `${P.luft * 0.5}cqw`, fontSize: `calc(${P.recht.breit}cqw * var(--lb-f-recht, 1))`, color: f.leise,
              gap: `${P.qr.luft * 0.5}cqw`,
            }}>
              {qr && qrEcke ? (
                /**
                 * ── EIN LINK IM LINK IST UNGÜLTIGES HTML (18.09.2026, Konsole der Startseite) ──
                 *
                 * Auf der Künstlerseite ist das Blatt kein Link, und der Code darf einer sein —
                 * er führt ins QR-Fenster („der Link sitzt im Poster selbst", 17.09.2026).
                 *
                 * AUF DER STARTSEITE IST DIE GANZE KACHEL EIN LINK. Ein zweites `<a>` darin ist
                 * nach HTML verboten, React bricht deshalb die Hydration ab und baut die Seite
                 * im Browser neu auf — unsichtbar, aber es kostet bei jedem Aufruf Zeit, und
                 * jeder Klick landete zufällig auf einem der beiden Ziele.
                 *
                 * Ohne `qrLink` steht der Code hier als Bild. Er verliert nichts: Die Kachel
                 * führt ohnehin zum Künstler, und gedruckt ist er sowieso nur ein Bild.
                 */
                qrLink ? (
                <a href={qrLink} className="block shrink-0"
                  style={{ width: `${P.qr.klein}cqw`, height: `${P.qr.klein}cqw` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="" loading="lazy" className="block h-full w-full" />
                </a>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={qr} alt="" loading="lazy" className="block shrink-0"
                    style={{ width: `${P.qr.klein}cqw`, height: `${P.qr.klein}cqw` }} />
                )
              ) : null}
              {recht}

            </p>
          ) : null}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
