import type { MandantOeffentlich } from "@/lib/versusforge-mandanten";
import type { Lang } from "@/lib/lang";
import type { PortalTexte } from "@/lib/lakatosbandi-texte";
import { platzhalterName } from "@/lib/lakatosbandi-texte";
import { blattZeilen, posterAnriss, ueberMichFuer } from "@/lib/lakatosbandi";
import { kunstBlattSatz } from "@/lib/lakatosbandi-kunst";
import Poster from "@/components/Poster";
import PosterGross, { PosterGrossKnopf } from "@/components/PosterGross";
import PosterRaeume from "@/components/PosterRaeume";
import PosterDeinBild from "@/components/PosterDeinBild";
import PosterDeinText, { PosterStil, PosterRecht } from "@/components/PosterDeinText";
import PosterFilm from "@/components/PosterFilm";
import { PosterWandFoto, PosterWandZeile } from "@/components/PosterWandBild";
import PosterLizenzSatz from "@/components/PosterLizenzSatz";
import KaufKnopf from "@/components/KaufKnopf";
import PreisLabel from "@/components/PreisLabel";
import { preisSatz, preisText } from "@/lib/lakatosbandi-preis";
import { druckPreisCents, druckGroessenFuer, druckSpanneCents, DRUCK_KUENSTLER_CENTS, KUNST_CENTS } from "@/lib/lakatosbandi-druck";
import { eur } from "@/lib/pricing";
import { kuenstlerUrl } from "@/lib/lakatosbandi-adressen";
import { ArrowRight } from "lucide-react";

/**
 * EIN WERK, GANZ — DAS POSTER MIT SLIDER, KAUFKNOPF UND ALLEM (Owner 20.09.2026: „ich brauche
 * einen Fenster wo alles drin ist, Slider und das auch. Am besten eine Extraseite" · „für jedes
 * Produkt").
 *
 * ── WARUM EINE EIGENE DATEI ──────────────────────────────────────────────────────────────────
 *
 * Bis heute stand dieser Block nur einmal, in der Übersicht der Künstlerseite (jede Kachel im
 * Raster). Für eine eigene Seite je Werk — „dieses Produkt einzeln teilen können" — bräuchte er
 * eine zweite Stelle. Zwei Kopien desselben Blattes sind aber genau das, was in diesem Haus
 * schon einmal schiefging ([[eine-stelle-fuer-vier-blaetter]], `blattZeilen`): Sie laufen
 * auseinander, und irgendwann sieht ein Käufer auf der Übersicht ein anderes Poster als auf der
 * eigenen Seite desselben Werks.
 *
 * Deshalb steht der ganze Block — Slider (Folie 0, Zimmer, Film-Folie), Poster-Layout, Kaufknopf,
 * Preis, Lizenzsatz — EINMAL hier. Die Übersicht (`app/portal/[kuenstler]/page.tsx`) und die
 * Werk-Seite (`app/portal/[kuenstler]/[werk]/page.tsx`) rufen beide dieselbe Funktion.
 *
 * ── `id` UND `lb-poster-block` GEHÖREN AUF DASSELBE ELEMENT ─────────────────────────────────
 *
 * `globals.css` hat die Regel `.lb-poster-block[id] { scroll-margin-top: … }` — ein
 * Aufmerksamkeitssprung nach Stripes „Abbrechen" braucht BEIDE Attribute am selben Knoten. Diese
 * Komponente trägt darum ihr eigenes `id`, statt es dem `<li>` der Übersicht zu überlassen.
 */
export default function PosterProdukt({
  id, kuenstler, m, k, L, T, mitAdmin, admin, adminS,
  lebend, kaufBar, alsPoster, istKleidung, kariStil,
  werkBild, filmHref, agentHref, filmOffen, produktHref, slide, nurSlider = false,
  produktFotos,
}: {
  /** Für den Sprung zurück nach Stripes „Abbrechen" (`#w-3`) — trägt `lb-poster-block[id]`. */
  id?: string;
  kuenstler: string;
  m: MandantOeffentlich;
  k: { i: number; hook: string };
  L: Lang;
  T: PortalTexte;
  /** Hängt bei Admin-Vorschauen den Dashboard-Schlüssel an eine Bild-Adresse. */
  mitAdmin: (url: string) => string;
  admin: boolean;
  adminS: string;
  /** Ob dieser Künstler lebt UND das Blatt bearbeitbar ist („You as a picture", eigener Text). */
  lebend: boolean;
  /** Ob dieses Werk käuflich als Druck ist (Reproduktion ODER Living-Poster-Ansicht). */
  kaufBar: boolean;
  /** Ob das Blatt im Posterlayout steht (sonst: nacktes Werk, Kachel zur Werkseite). */
  alsPoster: boolean;
  /** Ob DIESES Werk ein Kleidungsstück ist — kein Zimmer-Slider dafür. */
  istKleidung: (i: number) => boolean;
  /** Ob der Künstler einen eigenen Karikatur-Stil hinterlegt hat. */
  kariStil: boolean;
  /** `portalPfade(...).werkBild` — die Bild-Adresse eines Werks. */
  werkBild: (kennung: string, i: number, breite?: number) => string;
  /** Wohin der QR-Code / Klick aufs Bild führt (das Film-Fenster). */
  filmHref: string;
  /** Wohin „Vorbește cu agentul meu" / „nach dem Original fragen" führt. */
  agentHref: string;
  /** Ob dieses Werk sein Fenster beim Laden sofort öffnen soll (`?film=`). */
  filmOffen: boolean;
  /**
   * Die eigene Seite dieses Werks — nur in der Übersicht gesetzt (Owner 20.09.2026: „wie komme
   * ich auf die extra Produktseite?"). Auf der Werk-Seite selbst fehlt sie: Ein Link auf die
   * Seite, auf der man steht, führt nirgendwohin.
   */
  produktHref?: string;
  /**
   * Nur auf der Werk-Seite gesetzt (auch als leerer Text): Dann trägt jede Folie des Sliders ihre
   * eigene Adresse (`?slide=`, siehe `PosterRaeume`). In der Übersicht bleibt es `undefined`.
   */
  slide?: string;
  /**
   * ── NUR DAS BLATT MIT SEINEN FOLIEN, OHNE KAUFBEREICH (Owner 20.09.2026, zum Journal-Artikel:
   * „die anderen Slider auch drunter" · „die Miniaturen") ─────────────────────────────────────
   *
   * Im Artikel steht der Film nicht allein: Darunter hängt dieselbe Reihe Miniaturen wie auf
   * der Produktseite — Blatt, vier Zimmer, Film. Ein Kaufknopf mitten in einem Text für
   * Künstler wäre dagegen die falsche Tür; gekauft wird auf der Seite des Werks, zu der der
   * Knopf darunter führt. Mit `nurSlider` startet der Slider auf `slide`, schreibt aber nicht
   * in die Adresse — die gehört dort dem Artikel.
   */
  nurSlider?: boolean;
  /**
   * ── EIGENE PRODUKTFOTOS STATT DER ZIMMER (Owner 21.09.2026, Sonnenbrille: „muss wie die
   * Poster mehrere Slides haben") ────────────────────────────────────────────────────────────
   *
   * Gesetzt, wenn `wi.produkt` ein eigenes Stück ist (kein Druck des Werks) — der Aufrufer baut
   * die Liste (Front, zweite Ansicht), diese Komponente zeigt sie nur. Ohne diese Liste bleibt
   * es beim Verhalten von vorher: Zimmer, wenn `alsPoster`, sonst nichts.
   */
  produktFotos?: string[];
}) {
  const nr = k.i < 0 ? "standard" : String(k.i);
  const wi = m.werkInfo?.[nr];
  const eigenesProdukt = !!produktFotos?.length;
  /**
   * ── DAS ERSTE FOTO GEHÖRT ZU FOLIE 0, NICHT IN DEN SLIDER DAHINTER (Owner 21.09.2026) ──────
   * Folie 0 (`children`, unten) zeigt bei einem eigenen Produkt bereits das erste Foto (dasselbe
   * `werkBild`) — stünde es zusätzlich als erste Folie im Slider, sähe der Käufer es zweimal
   * hintereinander. `fotosDahinter` bekommt deshalb nur, was NACH dem ersten Foto kommt.
   */
  const [mini0Foto, ...fotosDahinter] = produktFotos ?? [];
  return (
    <div id={id} className="lb-poster-block w-full lg:w-[min(92vw,calc(88svh/1.4142))]">
      {/* ── ZWEI KLICKS, ZWEI ZIELE (Owner 17.09.2026: „klick aufs bild vergrössert das
          poster full und klick auf code führt zum QR fenster") ──────────────────────────────
          Bis heute war die ganze Kachel EIN Link zum Film — wer das Blatt genauer ansehen
          wollte, landete im Fenster. Jetzt macht das Blatt das Blatt gross, und der Code
          tut, was ein Code tut: er führt ins Fenster (der Link sitzt im Poster selbst).
          Ohne Posterlayout bleibt es bei der einen Kachel zur Werkseite. */}
      {/* ── DAS BLATT UND SEINE ZIMMER, EIN SLIDER (Owner 18.09.2026: „nicht als Extrabild
          sondern nach dem Poster die Slides") ──────────────────────────────────────────────
          Folie 0 ist das Werk selbst, danach hängt dasselbe Blatt in unseren Zimmern:
          Wer ein Poster kauft, will wissen, wie es zu Hause aussieht. Nur im Postershop —
          bei den Originalen gibt es nichts zu hängen. */}
      {/* ── UND, WENN ES EINEN GIBT, DER FILM (Owner 20.09.2026: „du machst das Video
          als extra Slide") ─────────────────────────────────────────────────────────────────
          Dieselbe Adresse wie im QR-Fenster (`quelle` bei `PosterFilm` weiter unten) —
          ein Merker, zwei Stellen, die ihn brauchen. */}
      <PosterRaeume aus={eigenesProdukt ? false : (!alsPoster || istKleidung(k.i))} hoch={!wi?.quer}
        fotos={fotosDahinter} mini0Bild={eigenesProdukt ? mini0Foto : undefined}
        adresse={slide === undefined ? undefined : { start: slide, schreiben: !nurSlider }}
        filme={[
          /* Erst „an die Wand", dann die Geschichte — sie bleibt an letzter Stelle (Owner
             20.09.2026: „als letzte Position"). Beide Standbilder kommen AUS ihrem Film; `bild`
             (das Werk) ist nur der Rückfall, solange keines geschnitten wurde. */
          ...(wi?.wandFilm ? [{
            schluessel: "wand",
            quelle: `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&art=wand&v=${encodeURIComponent(wi?.wandFilmAm ?? "1")}`,
            poster: `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&art=wandposter&v=${encodeURIComponent(wi?.wandFilmAm ?? "1")}`,
            bild: mitAdmin(werkBild(kuenstler, k.i, 1100)), alt: m.name,
            /* Hier erzählt niemand — kein „The story behind the picture", und die Musik liegt
               schon in der Datei. */
            intro: null, musikAn: false,
            youtube: String(wi?.wandFilmYoutube ?? "").trim() || undefined,
          }] : []),
          ...(wi?.film ? [{
            schluessel: "video",
            quelle: `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&v=${encodeURIComponent(wi?.filmAm ?? "1")}`,
            poster: `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&art=filmposter&v=${encodeURIComponent(wi?.filmAm ?? "1")}`,
            bild: mitAdmin(werkBild(kuenstler, k.i, 1100)), alt: m.name,
            /* ── KEIN „THE STORY BEHIND THE PICTURE" BEI EINEM EIGENEN PRODUKT (Owner
               21.09.2026, Sonnenbrille: „das Video mit mir") ────────────────────────────────
               Der Satz gehört zu einem gemalten Werk mit einer Entstehungsgeschichte. Bei
               einem Stück wie der Sonnenbrille ist das Video keine Kunstgeschichte, sondern
               eine Produktvorstellung — und die feste 72-px-Schrift ist auf ein hochkantes
               Poster gerechnet: Bei einem breiten Produktfoto (kurzer, breiter Kasten) läuft
               sie über den Rahmen hinaus, statt ihn zu füllen. */
            intro: eigenesProdukt ? null : undefined,
            youtube: String(wi?.filmYoutube ?? "").trim() || undefined,
          }] : []),
        ]}
        blatt={

          <Poster
            klasse="lb-rahmen-fest"
            /* Seine Zeilen hängen mit an der Wand (Owner 19.09.2026: „der Name ist nicht
               an der Wand") — sonst steht dort „Numele tău", während auf dem Blatt
               daneben sein Name steht. */
            titel={<PosterWandZeile art="titel"
              standard={blattZeilen(m.name, wi, L, m.sprache).gross} />}
            stil={blattZeilen(m.name, wi, L, m.sprache).klein}
            text={<PosterWandZeile art="satz"
              standard={m.kunstAn ? kunstBlattSatz(m.kunstStil) : posterAnriss(k.hook)} />}
            qrEcke
            qr="/api/portal-qr"
            siegel={!m.reproduktion}
            recht={`lakatosbandi.com/${kuenstler}`}
            bild={
              /* Sein Foto bzw. das erzeugte Bild, sobald eines im Blatt steht
                 (Owner 18.09.2026) — sonst das Werk des Künstlers. */
              /**
               * ── DAS WAR DIE ECHTE URSACHE (Owner 19.09.2026: „sie ist nicht ganz
               * drauf") ─────────────────────────────────────────────────────────────────
               *
               * Diese Klasse hier war die tatsächlich gerenderte — `PosterFilm.tsx` (wo
               * vorher schon „ganz drauf" gebaut wurde) wird an dieser Stelle gar nicht
               * verwendet. Ein zweiter, fest verdrahteter Satz Klassen entschied über
               * quer/hoch und schnitt beim Hochformat weiterhin an der Höhe ab: `h-full
               * w-auto` ohne jede Obergrenze für die Breite liess das Bild bei einem sehr
               * hohen Werk wie Mona Lisa (0,67) über die Feldbreite hinauswachsen, und der
               * `overflow-hidden`-Rahmen schnitt den Rest weg — keine Hände mehr im Bild.
               *
               * `object-contain` mit `max-h-full max-w-full` braucht keine Fallunter-
               * scheidung mehr: Es zwingt das Werk in JEDEM Verhältnis vollständig ins
               * Feld, an der jeweils engeren Kante.
               */
              <PosterWandFoto standard={mitAdmin(werkBild(kuenstler, k.i, 1100))}
                className="block h-auto max-h-full w-auto max-w-full object-contain" />
            }
          />
      }>
      <PosterGross alsPoster={alsPoster} href={agentHref}
        /* Im Vollbild holt sich der Hausherr die Druckdatei ohne Kasse (Owner 19.09.2026). */
        mandant={kuenstler} werk={nr} adminS={admin ? adminS : ""}>
        {/* ── DIE KACHEL IST DAS POSTER (Owner 15.09.2026: „also kachel soll aussehen
            wie das poster mit qr code und allem") ──────────────────────────────────────────

            HTML STATT VIDEO DES GANZEN POSTERS (Owner: „drum herum ist html?"): Der
            Rahmen, der QR und jede Zeile sind echter Text — scharf, übersetzbar, und ein
            Bruchteil der Daten. Bewegt ist nur das Werk in der Mitte.

            Dieselbe Reihenfolge wie auf dem gedruckten Poster, damit der Käufer es
            wiedererkennt: QR, VIDEOPOSTER, Werk, Name, Lebensdaten, Titel, Geschichte,
            unsere Zeile. */}
        {/* ── DAS BLATT KOMMT AUS EINEM RASTER (16.09.2026) ──────────────────────────────
            Alle Maße stehen in `lib/lakatosbandi-poster.ts` und gelten für den Schirm wie
            für die Druckdatei. Hier wird nur noch gesagt, WAS auf dem Blatt steht. */}
        {alsPoster ? (
          /* Der Name ist in jeder Sprache derselbe (Owner 16.09.2026: „A" · „auch die
             kategorie heisst so in allen 3 sprachen"). */
          <Poster
            /* Kein Kopf über dem Werk (Owner 17.09.2026: „raus") — die Adresse steht
               in der Rechtezeile am Fuss. */
            /* Auch kein Künstlername und kein Profilbild auf dem Blatt (Owner
               17.09.2026: „Gerry Louisett raus") — er steht in der Rechtezeile; oben
               trägt der TITEL des Werks die Zeile. */
            {...(() => {
              /* ── DIE GROSSE ZEILE BLEIBT NIE LEER (Owner 17.09.2026: „mach noch titel
                 rein bei diesen") ──────────────────────────────────────────────────────
                 Hat der Künstler für ein Werk keinen Titel eingetragen (`werkInfo.titel`
                 im Dashboard), stünde dort nichts — auf einem Blatt, dessen Überschrift
                 genau diese Zeile ist. Dann trägt sie seinen NAMEN: echte Angabe statt
                 erfundener Werktitel, und das Blatt sieht bei jedem Werk gleich aus. */
              const titel = wi ? [platzhalterName(wi.titel, L), wi.jahr].filter(Boolean).join(", ") : "";
              /* ── DIE GROSSE ZEILE HEISST „YOUR NAME" (Owner 17.09.2026: „your name drin
                 stehen, dann verstehen es die leute") ──────────────────────────────────
                 Vorher stand dort der Werktitel oder der Künstlername — niemand sah, dass
                 die Zeile ihm gehört. Jetzt steht der Platzhalter in seiner Sprache, den
                 er überschreibt (`PosterDeinText`), und DARUNTER klein der Stil: der
                 Werktitel, sonst der Name des Ateliers. */
              /* Die Zeile darunter heisst „BY GERRY LOUISETT" (Owner 17.09.2026) — wer das
                 Blatt gemalt hat, nicht welches Werk es einmal war. */
              /* ── AUF DEM BLATT STEHT SEIN NAME (Owner 17.09.2026: „ja schreib seinen
                 namen sonst dreht er durch" · „mach bei allen Künstlern den
                 Künstlernamen rein statt Numele tău") ──────────────────────────────
                 Kein Platzhalter, auch nicht über dem erzeugten Bild: Das Blatt gehört
                 dem Künstler. Der Kunde kann die Zeile überschreiben — dann tritt
                 darunter „BY …" hervor (`PosterStil`). */
              /* ── DER TITEL DES WERKS STEHT GROSS, WENN ES EINEN HAT (Owner 19.09.2026:
                 „ich will extra in jedem Poster den Titel ändern und die Texte") ───────
                 Die Regel samt Begründung steht in `blattZeilen` (lib/lakatosbandi.ts).
                 Hier kommt nur dazu, dass der KUNDE die grosse Zeile überschreiben darf —
                 dann tritt darunter „by …" hervor (`PosterStil`). */
              const zeilen = blattZeilen(m.name, wi, L, m.sprache);
              return {
                titel: lebend ? <PosterDeinText satz={zeilen.gross} art="titel" /> : zeilen.gross,
                stil: lebend ? <PosterStil name={zeilen.klein || m.name} /> : zeilen.klein,
              };
            })()}
            /* ── DEN SATZ SCHREIBT DER KUNDE SELBST (Owner 17.09.2026: „ok jetzt text
               editieren") ───────────────────────────────────────────────────────────
               Der Stift steckt im Satz, weil nur er weiss, ob gerade gelesen oder
               geschrieben wird. Nur im Browser — wie das Foto. */
            /* ── AUF DEM BLATT STEHT KEIN WERBESATZ (Owner 19.09.2026: „hier brauche einen
               Text, der zu allen passt, auf Englisch") ─────────────────────────────────
               Bei einem Generator ist der Hook eine Anzeige („Transformă poza ta…") und
               gehört auf die Seite, nicht über ein fremdes Gesicht an der Wand. Der
               Rückfall sagt, was das Bild IST — überschreiben kann er ihn im Fenster. */
            text={lebend
              ? <PosterDeinText satz={m.kunstAn ? kunstBlattSatz(m.kunstStil) : posterAnriss(k.hook)} qrEcke />
              : posterAnriss(k.hook)}
            /* Der Knopf „You as a picture" sitzt jetzt IM Bildfeld, weil er das Bild
               tauscht (`PosterDeinBild` weiter unten) — nicht mehr hier am Blatt. */
            qrEcke
            /* Der Code führt ins Fenster — dorthin, wo er auch auf Papier hinführt
               (Owner 17.09.2026: „klick auf code führt zum QR fenster"). */
            qrLink={filmHref}
            qr="/api/portal-qr"
            scan={T.qrScannen}
            /* Nur die Adresse (Owner 17.09.2026: „hier soll stehen nur
               lakatosbandi.com") — wer das Blatt an der Wand sieht, soll EINE Sache
               lesen und sie eintippen können, keine Rechtezeile entziffern. */
            /* ── SEINE ADRESSE STEHT AUF DEM BLATT (Owner 18.09.2026) ─────────────
               Bisher stand hier nur das Haus. Auf einem Blatt, das jemand in SEINEM Stil
               erzeugt hat, gehört der Weg zu ihm: „nach dem Stil von … · lakatosbandi.com
               /sein-name". Damit ist jedes erzeugte Bild Werbung für ihn statt Diebstahl
               an ihm. */
            /* Das Siegel nur bei LEBENDEN Künstlern (Owner 18.09.2026: „bei den
               lebendigen Künstlern") — bei einem gemeinfreien Meister gibt es niemanden,
               der eine Lizenz bekommt; der Stempel wäre dort eine Lüge. */
            siegel={!m.reproduktion}
            recht={<PosterRecht name={m.name} stilText={T.stilNachweis}
              adresse={kuenstlerUrl(kuenstler).replace(/^https?:\/\//, "")} />}
            bildEcke={<PosterGrossKnopf />}
            bild={
              /* ── SEIN FOTO AN DIE STELLE DES WERKS (Owner 17.09.2026: „zuerst ‚your
                 picture‘ ersetzt nur das bild") ───────────────────────────────────────
                 Nur im Browser, nichts gespeichert: „wenn er rausgeht von der seite,
                 dann ist das bild weg" — ein Zwischenspeicher, kein Konto. */
              /* ── DER KNOPF SPRICHT DIE SPRACHE DER SEITE UND NENNT DEN PREIS (Owner
                  19.09.2026: „hier muss fett stehen Generează caricatura, aber 4,99 Euro")
                  ────────────────────────────────────────────────────────────────────────
                  Hier standen drei englische Wörter fest im Code, auf einer rumänischen
                  Seite, ohne Betrag. „Generate art" sagt ausserdem nicht, was herauskommt:
                  Bei einem Karikaturisten ist das Ergebnis eine Karikatur, und genau das
                  gehört auf den Knopf.

                  DER PREIS STEHT IM KNOPF, nicht daneben (Hausregel `cta-im-viewport`:
                  „Preis IM Knopf"). Er kommt aus `KUNST_CENTS` — nie eine Zahl tippen
                  (Hausregel `prices-only-from-pricing-table`). */
              <PosterDeinBild
                knopf={T.kunstKnopf}
                erzeugen={(kariStil ? T.kunstErzeugenKari : T.kunstErzeugen).replace("{preis}", eur(KUNST_CENTS, L))}
                /* Schritt 3: Das Blatt ist bezahlt — der Knopf schreibt, statt neu zu erzeugen. */
                texteKnopf={T.kunstTexteKnopf}
                /* Mit `?s=` erzeugt der Hausherr ohne Kasse — geprüft wird serverseitig. */
                adminS={adminS}
                warten={T.kunstWartet}
                texte={{
                  zahlungAus: T.kunstZahlungAus, zahlungDa: T.kunstZahlungDa,
                  zahlungWartet: T.kunstZahlungWartet, zahlungWeg: T.kunstZahlungWeg,
                  werkGesperrt: T.kunstWerkGesperrt, fotoAbgelehnt: T.kunstFotoAbgelehnt,
                  nichtHier: T.kunstNichtHier, fehlgeschlagen: T.kunstFehlgeschlagen,
                  nurBilder: T.kunstNurBilder, zuGross: T.kunstZuGross,
                  schritt1: T.kunstSchritt1, schritt2: T.kunstSchritt2,
                  fensterTitel: T.kunstFensterTitel, fotoTauschen: T.kunstFotoTauschen,
                  feldMail: T.kunstFeldMail, mailWarum: T.kunstMailWarum,
                  speichern: T.kunstSpeichern, gespeichert: T.kunstGespeichert,
                }}
                sprache={L}
                mandant={kuenstler} werk={nr}
                /* Häkchen am Werk (`kunst`): fehlt es, ist der Knopf da; steht es auf
                   „nein", bleibt das Werk ein Werk. */
                aus={!lebend || wi?.kunst === false}>
              <PosterFilm
                /* ── KLICK AUFS BILD ÖFFNET DAS FENSTER (Owner 20.09.2026: „klick auf
                   bild lösst das qr code fenster aus") ─────────────────────────────────
                   Bis heute galt: Im Blatt gehört der Klick dem Blatt (dem Vergrössern,
                   Owner 17.09.2026), das Fenster nur dem Code. Seit das Vergrössern
                   einen eigenen Knopf in der Ecke hat (`PosterGrossKnopf`) und dort nicht
                   mehr im Weg steht, darf das ganze Werk wieder tun, was der Code auch
                   tut — scannen und klicken landen im selben Fenster. */
                klickOeffnet
                quelle={wi?.film
                  ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&v=${encodeURIComponent(wi?.filmAm ?? "1")}`
                  : undefined}
                /* Wo der Künstler selbst über sein Werk spricht, ist ER das Fenster
                   (Owner 17.09.2026: „so müsste jedes Poster präsentiert werden"). */
                /* Liegt sein Film auf YouTube, spielt das Fenster von dort (Owner
                   17.09.2026) — ausser er will nur gehört werden. */
                /* Liegt der Film DIESES Werks auf YouTube, spielt das Fenster ihn von dort (Owner
                   20.09.2026) — er hat Vorrang vor der einen Aufnahme aus dem Profil. */
                youtube={String(wi?.filmYoutube ?? "").trim()
                  || (!m.werkInfo?.profil?.nurStimme ? m.werkInfo?.profil?.youtube : undefined)}
                /* Häkchen „nur die Stimme": Der Film bleibt liegen, aber das Fenster
                   zeigt das Werk und spielt nur seine Tonspur (Owner 17.09.2026). */
                sprecher={wi?.sprecher && !wi?.nurStimme
                  ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&art=sprecher&v=${encodeURIComponent(wi?.sprecherAm ?? "1")}`
                  : undefined}
                /* Seine vorgelesene Stimme — wenn es keinen Sprecher-Film gibt, ist SIE
                   der Living Poster (Owner 17.09.2026). */
                /* ── SEINE EINE AUFNAHME, IN JEDEM FENSTER (Owner 18.09.2026: „dieses
                   Video erscheint bei jedem QR-Fenster, neben seinem Werk") ──────────
                   Vorher hing sie am Werk — also lief sie bei einem von zehn Codes. */
                ton={(m.werkInfo?.profil?.stimme || (m.werkInfo?.profil?.sprecher && m.werkInfo?.profil?.nurStimme))
                  ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=profil&art=${m.werkInfo?.profil?.stimme ? "stimme" : "sprecher"}&v=${encodeURIComponent(m.werkInfo?.profil?.stimmeAm ?? m.werkInfo?.profil?.sprecherAm ?? "1")}`
                  : undefined}
                /* Das Standbild vor dem Druck auf Play — beim Film dieses Werks sein eigenes. */
                sprecherBild={String(wi?.filmYoutube ?? "").trim()
                  ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=${nr}&art=filmposter&v=${encodeURIComponent(wi?.filmAm ?? "1")}`
                  : m.werkInfo?.profil?.sprecher
                  ? `/api/portal-film?m=${encodeURIComponent(kuenstler)}&i=profil&art=sprecherbild&v=${encodeURIComponent(m.werkInfo?.profil?.sprecherAm ?? "1")}`
                  : undefined}
                bild={mitAdmin(werkBild(kuenstler, k.i, 1100))} alt={m.name}
                quer={!!wi?.quer}
                profil={m.profilBild ? mitAdmin(`/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=profil`) : undefined}
                sofort={filmOffen}
                kaufPoster={kaufBar ? T.kaufPoster : undefined}
                {/* ── OHNE PREIS KEIN ORIGINAL (Owner 17.09.2026: „nur original kann man
                     nicht, falls kein preis") — steht am Werk kein Preis, ist es nicht zu
                     haben: verkauft, in einer Sammlung, oder er will es behalten. „Nach
                     dem Original fragen" führte dort in ein Gespräch, das mit einer
                     Absage endet. Das Poster bleibt bestellbar. */
                  ...(m.reproduktion || !preisText(wi?.preis)
                  ? {}
                  : { kaufOriginal: { text: T.originalAnfragen, href: agentHref } })}
                kuenstler={m.name} leben={m.leben}
                titel={wi ? [platzhalterName(wi.titel, L), wi.jahr].filter(Boolean).join(", ") : ""}
                geschichte={k.hook} ueber={ueberMichFuer(m, L)} />
              </PosterDeinBild>
            }
          />
        ) : (
          /* Ohne Posterlayout: das Werk allein, darunter steht die Zeile ausserhalb. */
          <div className="flex items-center justify-center">
            <PosterFilm fenster={false}
              bild={mitAdmin(werkBild(kuenstler, k.i, 1100))} alt={m.name}
              quer={!!wi?.quer}
              profil={m.profilBild ? mitAdmin(`/api/portal-werk?m=${encodeURIComponent(kuenstler)}&i=profil`) : undefined}
              kuenstler={m.name} titel={wi ? [platzhalterName(wi.titel, L), wi.jahr].filter(Boolean).join(", ") : ""}
              geschichte={k.hook} ueber={ueberMichFuer(m, L)} />
          </div>
        )}
      </PosterGross>
      </PosterRaeume>
      {nurSlider ? null : (() => {
        /* Das Preisschild: bei Kleidung fest, beim Poster die Spanne, sonst sein Satz. */
        const fest = wi?.produkt ? druckPreisCents(wi.produkt, druckGroessenFuer(wi.produkt)[0] ?? "") : null;
        /* Beim lebenden Künstler liegt sein Honorar oben drauf (Owner 16.09.2026) —
           bei den gemeinfreien Meistern nicht: Dort gibt es niemanden, der bezahlt wird. */
        const spanne = fest === null && kaufBar ? druckSpanneCents(!m.reproduktion) : null;
        const preis = fest !== null ? eur(fest, L)
          : spanne ? `${eur(spanne.von, L)} – ${eur(spanne.bis, L)}`
            : (preisText(wi?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage));
        const zeile = !kaufBar && wi ? [wi.titel, wi.technik, wi.groesse, wi.jahr].filter(Boolean).join(" · ") : "";
        return (
          /* Luft zwischen Werk und Angaben (Owner 16.09.2026: „brauche abstand zum bild
             preis") — ohne sie klebt das Preisschild am unteren Bildrand. */
          <div className={alsPoster ? "mt-4 text-center" : "mt-3"}>
            {zeile ? <p className="m-0 text-[14px] leading-[1.45] text-[#666]">{zeile}</p> : null}
            {/* ── DER PRODUKTTEXT (Owner 21.09.2026, Sonnenbrille: „das Produkt muss noch
                einen Text haben") ─────────────────────────────────────────────────────────
                Bei einem eigenen Stück (Sonnenbrille, künftig Kleidung) steht hier, WAS es
                ist — Material, Passform, was auf dem Blatt keinen Platz hätte. Dasselbe Feld
                wie auf der alten, nackten Werkseite (`detalii`), hier nur auch im Postershop
                sichtbar, wo der Kaufweg tatsächlich steht. */}
            {wi?.produkt && wi?.detalii ? (
              <p className="m-0 mx-auto mt-2 max-w-[42ch] text-[14.5px] leading-[1.5] text-[#555]">{wi.detalii}</p>
            ) : null}
            {/* DAS PREISSCHILD IST RAUS (Owner 15.09.2026: „das raus") — bei einer
                Reproduktion steht der Preis schon auf dem Kaufknopf, und zweimal
                dieselbe Zahl übereinander liest niemand als Angebot, sondern als
                Unordnung. Bei lebenden Künstlern bleibt es: dort gibt es keinen Knopf. */}
            {preis && !kaufBar ? <p className="m-0 mt-2"><PreisLabel>{preis}</PreisLabel></p> : null}
            {/* Der Verkaufssatz — unter der Kachel, nicht im Poster (Owner 16.09.2026).
                Nur beim Druck: bei einem T-Shirt wäre „Drucke dieses Bildes" falsch. */}
            {/**
              * ── AUF GENERATOREN ERST MIT SEINEM BILD (Owner 19.09.2026: „jeder Besucher
              * soll es nicht sehen, nur ich als Inhaber" · „nur für meine Generatoren")
              *
              * Das Blatt eines Generators ist ein Schaufenster. Wer dort den Druck des
              * Musterblattes kauft, bekommt das Bild einer fremden Person — kein Angebot,
              * sondern ein Missverständnis mit Rechnung. Bei echten Künstlern bleibt der
              * Block stehen: Dort IST das Werk die Ware, und der Druck ist ihr Verdienst.
              *
              * Der Inhaber sieht ihn immer (`admin`), sonst könnte er nicht prüfen, was
              * ein Käufer bekommt.
              */}
            {kaufBar && !wi?.produkt ? (
              <>
                {/**
                  * ── KEINE LIZENZ BEI SEINEN EIGENEN GENERATOREN (Owner 19.09.2026:
                  * „was ist mit Print?" · Regel vom selben Tag: „auf die von mir extra
                  * dafür erstellten … hierfür gibt es keine Lizenz. Ich bekomme alles.")
                  *
                  * Auf dem Blatt von „Caricaturist AI" stand „Der Preis enthält eine
                  * Lizenz von 10 €, die direkt an den Künstler geht". Diesen Künstler hat
                  * der Owner selbst angelegt — die zehn Euro gingen von ihm an ihn, und
                  * der Käufer zahlte sie. Ein Satz, der eine Zahlung verspricht, die es
                  * nicht gibt, ist auf einem Verkaufsblatt keine Kleinigkeit.
                  *
                  * `kunstAn` ist genau das Kennzeichen dieser Künstler. Sie bekommen
                  * denselben nüchternen Satz wie eine Reproduktion: Wir verkaufen Drucke.
                  */}
                {m.reproduktion || m.kunstAn ? (
                  <p className="m-0 mx-auto max-w-[42ch] text-[14px] leading-[1.5] text-[#666]">{T.druckVerkauf}</p>
                ) : (
                  /* Setzt der Kunde sein eigenes Foto ein, steht hier die Vermittlung
                     statt der Lizenz (Owner 18.09.2026) — sonst nennt der Satz eine Zahl,
                     die der Kaufknopf daneben nicht verlangt. */
                  <PosterLizenzSatz mandant={kuenstler} werk={nr}
                    werkSatz={T.druckVerkaufKuenstler.replace("{anteil}", eur(DRUCK_KUENSTLER_CENTS, L))}
                    eigenesSatz={T.druckVerkaufEigenes} />
                )}
                {/* ── DER VERSAND STEHT VOR DEM KLICK (Skill `bezahlung`, Regel 8) ──────
                    Er hängt seit 17.09.2026 an der Wahl (gerahmt fährt teurer, eine Datei
                    fährt gar nicht), also schreibt ihn der Kaufknopf selbst — hier stünde
                    sonst eine feste Zahl, die für zwei von drei Fällen falsch ist. */}
              </>
            ) : null}
            {kaufBar ? (
              <KaufKnopf mandant={kuenstler} werk={nr}
                /* Kein Künstleranteil bei Reproduktionen UND bei den eigenen Generatoren
                   (Owner 19.09.2026) — verbindlich gerechnet wird in `api/druck-kasse`.
                   AUCH NICHT BEI EINEM EIGENEN PRODUKT (Owner 21.09.2026, Sonnenbrille): Der
                   Lizenzaufschlag gilt der Reproduktion SEINES Werks — bei einem Stück wie
                   der Sonnenbrille ist der Preis in der Tabelle schon der ganze Preis, wie
                   bei Textil (dieselbe Kachel-Reihe ruft `KaufKnopf` seit je ohne `anteil`). */
                material={wi?.produkt ?? "posterramaneagra"} sprache={L} anteil={!wi?.produkt && !m.reproduktion && !m.kunstAn} adminS={admin ? adminS : ""}
                texte={{ kaufen: T.kaufKaufen, korb: T.kaufKorb, groesse: T.kaufGroesse, fehler: T.korbFehler,
                  ohneRahmen: T.druckOhneRahmen, ohneRahmenWahl: T.ohneRahmenWahl, mitRahmen: T.druckMitRahmen, mitRahmenWahl: T.mitRahmenWahl, versand: T.druckVersandDrin, rahmenSchwarz: T.druckRahmenSchwarz }}
                /* Die Datei steckt im selben Block (Owner 17.09.2026) — nur beim Poster,
                   nicht bei Kleidung: „Druckdatei eines T-Shirts" gibt es nicht. */
                datei={!wi?.produkt ? { kaufen: T.dateiKaufen, erklaerung: T.dateiErklaerung,
                  schwarz: T.dateiSchwarz, holz: T.dateiHolz, ohne: T.dateiOhne,
                  frei: T.kunstDateiFrei } : undefined} />
            ) : null}
            {/* ── DIE FRAGE NACH DEM ORIGINAL STEHT BEIM KAUF, NICHT UNTER DER DATEI
                (Owner 17.09.2026: „aber nicht hier · sondern · hier") ─────────────────
                Ganz unten sah der Link aus wie eine Fussnote zur PDF-Datei. Er gehört
                direkt hinter den Kaufknopf: Wer den Preis liest und das Original will,
                findet dort den Weg — vor dem Zusatzangebot, nicht dahinter. */}
            <a href={agentHref} className="mt-3 inline-block text-[14px] text-[#111] underline">{T.agent}</a>
            {/* ── EIN KNOPF ZUR PRODUKTSEITE, GETEILT WIRD DORT (Owner 20.09.2026: „nicht
                Distribuie, sondern öffne Produktseite, dann Share-Button in der Seite dort") ────
                Erst stand hier eine kleine graue Textzeile — die übersah er selbst. Jetzt ist es
                ein Knopf in derselben Form wie „Distribuie" (umrandet, leise neben dem schwarzen
                Kaufknopf). Das Teilen selbst gehört auf die Seite des Werks: Wer von dort teilt,
                gibt genau die Adresse weiter, auf der er steht. */}
            {produktHref ? (
              <p className="m-0 mt-4">
                <a href={produktHref}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#111] px-4 py-2 text-[14px] font-semibold text-[#111] no-underline transition hover:bg-[#111] hover:text-white">
                  {T.produktSeite}
                  <ArrowRight className="h-[16px] w-[16px]" aria-hidden />
                </a>
              </p>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}
