import { POSTER, POSTER_VERHAELTNIS, posterTextBreit } from "@/lib/lakatosbandi-poster";
import ArtistFair from "@/components/ArtistFair";

/** Das Aussehen der Stilzeile („BY ADRIAN ROȘU") — EINE Quelle für Blatt und `PosterStil`. */
export const posterStilStil: React.CSSProperties = {
  marginTop: `${POSTER.luft * 0.4}cqw`, fontSize: `${POSTER.name.breit}cqw`,
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
        <div className="flex flex-1 flex-col justify-start">
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
          <div className="relative flex shrink-0 items-start justify-center overflow-hidden"
            style={{ height: `${((bildHoch ?? P.bild.hoch) * POSTER_VERHAELTNIS).toFixed(2)}cqw` }}>
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
            marginTop: `${P.bild.luftUnten * 0.4}cqw`,
            marginLeft: `-${P.rand}cqw`, marginRight: `-${P.rand}cqw`,
            marginBottom: `-${P.randUnten}cqw`,
            paddingLeft: `${P.rand}cqw`, paddingRight: `${P.rand}cqw`,
            paddingTop: `${P.luft * 0.6}cqw`, paddingBottom: `${P.randUnten}cqw`,
            background: f.papier,
          }}>
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
                fontSize: `${nameBreit ?? P.name.breit}cqw`, letterSpacing: `${P.name.sperre}em`,
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
              marginTop: `${P.luft}cqw`, fontSize: `${P.titel.breit}cqw`, color: f.tinte,
              lineHeight: 1.1,
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
                left: `${P.rand}cqw`, bottom: `${P.randUnten}cqw`,
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
          {siegel ? (
            /* Gleicher Abstand nach links wie nach unten (Owner 18.09.2026: „Stempel weiter
               links. Der Abstand zum Rand muss gleich sein von links und von unten. Überall") —
               vorher stand links `rand` (6,5) und unten `randUnten` (5,5), also sass er schief
               in der Ecke. */
            <span className="absolute block" style={{
              left: `${P.randUnten}cqw`, bottom: `${P.randUnten}cqw`,
              /* Grösser als der Code gegenüber (Owner 18.09.2026: „grösser") — der Stempel ist
                 das Zeichen, der Code nur ein Weg. */
              width: `${P.qr.breit * 1.35}cqw`, height: `${P.qr.breit * 1.35}cqw`,
            }}>
              <ArtistFair groesse={0} klasse="block h-full w-full" />
            </span>
          ) : null}

          {recht ? (
            <p className="m-0 flex items-center justify-center font-serif" style={{
              marginTop: `${P.luft * 0.5}cqw`, fontSize: `${P.recht.breit}cqw`, color: f.leise,
              gap: `${P.qr.luft * 0.5}cqw`,
            }}>
              {qr && qrEcke ? (
                <a href={qrLink} className="block shrink-0"
                  style={{ width: `${P.qr.klein}cqw`, height: `${P.qr.klein}cqw` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="" loading="lazy" className="block h-full w-full" />
                </a>
              ) : null}
              {recht}

            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
