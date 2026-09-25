import type { Metadata } from "next";
import PortalRubrik from "@/components/PortalRubrik";
import PortalReihe from "@/components/PortalReihe";
import PortalMehr from "@/components/PortalMehr";
import { PosterWandFoto } from "@/components/PosterWandBild";
import PosterProdukt from "@/components/PosterProdukt";
import { SPUR, KACHEL } from "@/components/PortalSpur";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { kuenstlerListe, imPortalSichtbar, portalPfade, werkKacheln, posterAnriss, blattZeilen } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import { aboAktiv } from "@/lib/versusforge-abo";
import PortalKopf from "@/components/PortalKopf";
import PortalReiter from "@/components/PortalReiter";
import Poster from "@/components/Poster";
import { POSTER_TITEL } from "@/lib/lakatosbandi-poster";
import MehrText from "@/components/MehrText";
import PortalBald from "@/components/PortalBald";
import PortalFuss from "@/components/PortalFuss";
import ArtistFair from "@/components/ArtistFair";
import { ARTIKEL, JOURNAL_UI, type JournalSprache } from "@/lib/lakatosbandi-journal";
import { baldTexte } from "@/lib/lakatosbandi-bald-texte";
import { eur, VERSUSFORGE_ABO_CENTS } from "@/lib/pricing";
import { preisSatz, preisText } from "@/lib/lakatosbandi-preis";
import { druckSpanneCents, KUNST_CENTS } from "@/lib/lakatosbandi-druck";
import PreisLabel from "@/components/PreisLabel";
import PortalBesuchMelden from "@/components/PortalBesuchMelden";

/**
 * DIE STARTSEITE VON LAKATOSBANDI.COM (Owner 10.09.2026: „lakatosbandi.com ist das Portal … eine
 * Marketing-Plattform für Künstler" · „nicht Bilder, sondern Hooks" · Stil wie artsy.net).
 *
 * WEISS, SCHWARZE SCHRIFT, VIEL LUFT — die einzige Farbe sind die Werke. Jedes Werk steht als
 * Hook-Kachel da: das Werk oben, ganz und unbeschnitten, sein Satz darunter, dann der Künstler.
 *
 * ES ERSCHEINT NUR, WER ZWEI JA HAT: die Freigabe durch den Owner (`freigabe: "frei"`) UND sein
 * eigenes „Ja, ins Portal" im Chat (`portal: true`). Ohne das zweite Ja hat er trotzdem seine
 * Seite lakatosbandi.com/{name} — nur nicht in dieser Übersicht.
 *
 * ── „BALD ONLINE", SOLANGE ES WENIGE SIND (Owner 10.09.2026: „wir müssen uns mit dem Portal noch
 * was einfallen lassen, bis einige Künstler da sind" · entschieden: „wir sagen, wir starten bald
 * … und dass wir gerade Künstler rekrutieren") ─────────────────────────────────────────────────
 *
 * KEINE DEMO-KÜNSTLER: Ein Käufer, der nach einem erfundenen Werk fragt, glaubt uns danach nichts
 * mehr. Unter `START_AB` freigegebenen Künstlern sagt die Seite ehrlich, dass sie bald startet,
 * und ruft Künstler auf; wer schon freigegeben ist, steht als „erste Künstler" darunter. Ab
 * `START_AB` wird sie von selbst zur normalen Übersicht — niemand muss etwas umschalten.
 *
 * Auf lakatosbandi.com liegt sie an der Wurzel (Rewrite in next.config.mjs), sonst unter /portal.
 */
export const dynamic = "force-dynamic";

/** Ab so vielen sichtbaren Künstlern ist das Portal „offen" statt „bald online". */
const START_AB = 6;

/**
 * ── GEFUNDEN WIRD MAN ÜBER DAS, WAS GETIPPT WIRD (Owner 17.09.2026: „wenn jemand nach Living
 * Poster sucht, kommt Blödsinn") ────────────────────────────────────────────────────────────
 *
 * „Living Poster" ist unser MARKENNAME, kein Suchbegriff — wer ihn eingibt, sucht
 * Zimmerpflanzen und Wohnzimmerbilder. Im Titel stehen deshalb die Wörter, mit denen Menschen
 * wirklich nach dieser Ware suchen: Poster, van Gogh, Kunstdruck, personalisiertes Porträt. Die
 * Marke steht dahinter, nicht davor.
 *
 * UND ER BESCHREIBT DEN LADEN, NICHT DIE PLATTFORM: Hier stand der Satz aus der Zeit, als die
 * Startseite eine Werbeseite für Künstler war. Wer heute hier landet, will Poster kaufen.
 */
export const metadata: Metadata = {
  title: "Postere de artă tipărite la comandă — van Gogh, Klimt și artiști contemporani | lakatosbandi.com",
  description: "Postere de artă printate la comandă, în A3, A2 și A1, cu ramă printată sau fără. Reproduceri după van Gogh, Klimt, Monet și lucrări ale artiștilor contemporani — fiecare cu un cod QR care pornește muzica și spune povestea lucrării. Livrare în România.",
  alternates: { canonical: "https://lakatosbandi.com/" },
  openGraph: {
    title: "Postere de artă tipărite la comandă — lakatosbandi.com",
    description: "Reproduceri după marii maeștri și lucrări ale artiștilor contemporani, printate la comandă, cu cod QR care spune povestea lucrării.",
    type: "website",
    url: "https://lakatosbandi.com/",
  },
};

export default async function PortalStart({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const L = portalSprache(sp.lang, await resolveLang("ro"));
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const kuenstler = await kuenstlerListe(imPortalSichtbar);
  /**
   * ── DIE LETZTEN KUNSTWERKE, NICHT DIE NEUESTEN KÜNSTLER (Owner 12.09.2026: „auf der homepage
   * steht die neuesten künstler und ein kunstwerk von mir erscheint. Was auch nicht richtig ist.
   * Es müsste sein die Letzten Kunstwerke") ────────────────────────────────────────────────────
   *
   * Hier stand je Künstler SEINE ERSTE Kachel. Welche das war, entschied die Reihenfolge im
   * Datensatz — nicht er. Jetzt erscheint jedes Werk.
   *
   * SORTIERT WIRD MIT DEM, WAS ES GIBT: Ein einzelnes Werk trägt kein Datum, nur der Künstler
   * (`angelegt`). Also der zuletzt angelegte Künstler zuerst und innerhalb von ihm das zuletzt
   * hinzugefügte Werk — das ist der höchste Index; das Standardmotiv (-1) ist sein ältestes.
   */
  /* Der Augenblick, in dem ein Werk auf der Seite erschien — einmal gerechnet, dreimal benutzt
     (Sortierung der Originale, Sortierung im Reiter, `nachNeu`). */
  const neuZeit = (x: { m: (typeof kuenstler)[number]; k: { i: number } }) => Date.parse(
    String((x.m.werkInfo?.[x.k.i < 0 ? "standard" : String(x.k.i)] as { freiAm?: string } | undefined)?.freiAm ?? x.m.angelegt ?? ""),
  ) || 0;

  const kacheln = kuenstler
    /* IN DER SPRACHE DES BESUCHERS (Owner 14.09.2026: „hier wird nichts übersetzt") — liegt sie
       noch nicht vor, kommt das Original zurück. */
    .flatMap(m => werkKacheln(m, L).map(k => ({ m, k })))
    /**
     * ── KLEIDUNG IST KEIN ORIGINAL (Owner 19.09.2026: „die Hoodies und T-Shirts haben nichts in
     * Werke zu suchen, dafür werden wir eine andere Kategorie einfügen") ──────────────────────
     *
     * Zwischen Hokusais Fuji stand ein schwarzes T-Shirt mit einem Zitat auf dem Rücken. „Originale
     * von zeitgenössischen Künstlern — jedes nur einmal" verspricht der Reiter darüber, und ein
     * bedrucktes Kleidungsstück ist das Gegenteil davon: beliebig oft herstellbar und nicht von
     * der Hand des Künstlers.
     *
     * `produkt` steht am Werk („tricou"/„hanorac"); DIESELBE Zeile filtert seit dem 16.09. schon
     * die Poster (`posterWerke`). Sie fehlte nur hier.
     *
     * DIE STÜCKE BLEIBEN, WO SIE SIND: auf der Seite ihres Künstlers. Sie verschwinden nur aus der
     * falschen Kategorie — die richtige kommt noch.
     */
    .filter(({ m, k }) => {
      const wi = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
      /* Abgelehnt heisst: Das Bild ist nicht mehr in der Galerie. Der Satz dazu steht weiter im
         Datensatz — ohne diese Zeile zeigt die Kachel einen leeren Rahmen (Owner 19.09.2026:
         „Maia Bild fehlt"). Siehe `abgelehntAm` in lib/versusforge-mandanten.ts. */
      return !wi?.produkt && !wi?.abgelehntAm;
    })
    /**
     * ── „NEU" IST, WAS ZULETZT FREIGEGEBEN WURDE (Owner 18.09.2026) ──────────────────────────
     *
     * HIER STAND NUR `m.angelegt` — das ANMELDEDATUM DES KÜNSTLERS. Ein Werk, das der Owner
     * heute freigegeben hat, stand damit hinter allem eines Künstlers, der sich zwei Tage früher
     * angemeldet hat. Für den Besucher ist „neu" aber der Augenblick, in dem es auf der Seite
     * erschien.
     *
     * `freiAm` steht am Werk und wird beim Freigeben geschrieben (`api/freigabe`). Werke aus der
     * Zeit davor haben es nicht — die fallen auf das Anmeldedatum zurück und stehen damit hinter
     * allem frisch Freigegebenen. Genau richtig: Sie SIND älter.
     */
    .sort((a, b) => neuZeit(b) - neuZeit(a) || b.k.i - a.k.i);
  /* `bald` zählt weiter KÜNSTLER, nicht Werke: Ein einziger Künstler mit zehn Werken darf die
     Seite nicht aus dem Startzustand kippen. */
  const bald = kuenstler.length < START_AB;
  /* Die Bewerbung ist das Gespräch mit dem Künstler-Agenten, in seiner Sprache — auf lakatosbandi.com/start, nicht
     auf versusforge.com (Owner 11.09.2026: „du musst schauen, wo die Seite angelegt wird. Nicht auf VersusForge"). */
  const bewerben = `https://lakatosbandi.com/start?lang=${L}`;

  /**
   * ── REITER UND SEITEN STATT EINER ENDLOSEN ROLLE (Owner 13.09.2026: „auf der Homepage werden
   * langsam zu viele Feeds … man kommt nicht zu den Artikeln da unten … wir brauchen über die
   * Feeds Tabs. Kunstwerke und Künstler") ───────────────────────────────────────────────────────
   *
   * GEMESSEN am 13.09.2026, vorher: 35 Kacheln, Seite 9.168 px am Desktop und 26.088 px am Handy.
   * Das Journal begann bei 8.771 px — rund zehn Bildschirme, am Handy dreissig. Praktisch hat es
   * niemand gesehen.
   *
   * 24 JE SEITE, weil die Zahl durch 2, 3 und 4 teilbar ist: Die letzte Reihe bleibt in jeder
   * Rasterbreite voll, statt mit einer einsamen Kachel zu enden.
   */
  const PRO_SEITE = 24;
  /**
   * ── DIE KÜNSTLER ZUERST (Owner 15.09.2026: „deswegen sag ich die liste der künstler" ·
   * „nicht die werke") ────────────────────────────────────────────────────────────────────────
   *
   * Vorher öffnete die Übersicht mit dem Werkraster. Wer hereinkommt, soll aber sehen, WER hier
   * ist — die Kreise mit den Gesichtern —, nicht hundert Bilder ohne Namen. Das Werkraster
   * bleibt ein Klick entfernt.
   */
  /**
   * ── DIE STARTSEITE IST KEINE KATEGORIE (Owner 16.09.2026: „und das machst du als startseite
   * keine kategorie sondern ein auszug aus jeder kategorie mit weiter") ───────────────────────
   *
   * Wer hereinkommt, weiss noch nicht, dass es hier dreierlei gibt: Künstler, Originale und
   * Poster. Landete er gleich in einer der drei Listen, sähe er die anderen zwei nie — und die
   * Reiter darüber sähen aus wie drei Sortierungen derselben Sache. Deshalb steht auf der
   * Startseite von jeder Kategorie ein kurzer Auszug mit einem Weg hinein.
   */
  const ansicht = sp.ansicht === "werke" ? "werke"
    : sp.ansicht === "repro" ? "repro"
      /* ── DIGITAL ART (Owner 19.09.2026: „wir machen noch eine Rubrik für Digital Art und
         Caricaturist gehört da rein") — eine eigene Kategorie neben Originalen und Postern. */
      : sp.ansicht === "digital" ? "digital"
        : sp.ansicht === "kuenstler" ? "kuenstler" : "start";
  /**
   * ── DRITTER REITER: REPRODUCERI (Owner 15.09.2026: „eine neue kategorie jetzt" → „A") ───────
   *
   * Lebende Künstler und gemeinfreie Meister stehen ab hier in getrennten Listen. Beide sind
   * Kreise mit Namen — aber wer einen Künstler sucht, soll nicht zwischen Van Gogh und Vermeer
   * blättern, und wer einen Druck will, nicht zwischen zwölf Timișoaraern.
   */
  const lebende = kuenstler.filter(m => !m.reproduktion);
  /* Im Reiter „Poster viu" stehen die gemeinfreien Meister UND die lebenden Künstler, die ihre
     Werke als Poster anbieten (Owner 15.09.2026: „die werke von szidonia und gerry louisett auch
     unter der kategorie" · „du lässt die originale dort"). Auf IHREN Seiten ändert sich nichts:
     Dort stehen ihre Werke weiter als Originale. */
  const meister = kuenstler.filter(m => m.reproduktion
    || (m.posterViu && aboAktiv(m as Parameters<typeof aboAktiv>[0])));
  /**
   * ── DIE STARTSEITE IST EIN LADEN (Owner 16.09.2026: „die erste seite muss werke zeigen wie
   * jeder postershop. sofort verkaufen") ─────────────────────────────────────────────────────
   *
   * Bisher standen dort Gesichter und ein Wandfoto — schön, aber nichts, was man kaufen kann.
   * Wer auf einen Postershop kommt, will Poster sehen und sie mitnehmen. Also stehen die Werke
   * oben, jedes mit Preis und Kaufknopf, quer über alle Künstler der Kategorie.
   */
  const posterWerke = kuenstler
    /* ── ALLE, DIE POSTER ANBIETEN (Owner 17.09.2026: „da soll von jedem Künstler ein Poster
       erscheinen, jetzt kommt nur von van Gogh") ────────────────────────────────────────────
       Die Meister holen die Leute herein, weil man ihre Bilder erkennt. Aber ein Laden, in dem
       zwanzigmal derselbe Maler hängt, sieht aus wie eine van-Gogh-Sammlung und nicht wie ein
       Laden — und die lebenden Künstler, die ihre Werke als Living Poster anbieten, kämen dort
       nie vor. Also beide, und unten reihum verteilt. */
    /* ── NUR WER PREMIUM HAT (Owner 18.09.2026: „auf der Startseite zeigst du nur die Werke,
       die Premium haben, also Poster haben") ───────────────────────────────────────────────
       `posterViu` ist sein Häkchen, nicht seine Berechtigung: Es bleibt stehen, wenn ein Abo
       ausläuft. Im Schaufenster stünde dann Ware, die niemand kaufen kann — auf seiner Seite
       ist der Kaufweg längst zu. Gefragt wird deshalb live am Abo; die gemeinfreien Meister
       gehören uns und sind immer dabei. */
    .filter(m => m.reproduktion || (m.posterViu && aboAktiv(m as Parameters<typeof aboAktiv>[0])))
    .flatMap(m => {
      const auswahl = werkKacheln(m, L).some(k => m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.poster);
      return werkKacheln(m, L)
        .filter(k => {
          const wi = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
          if (wi?.produkt) return false;                       // Kleidung ist kein Poster
          if (wi?.abgelehntAm) return false;                   // abgelehnt = kein Bild in der Galerie
          if (m.reproduktion) return true;                     // Meister: alles
          return !auswahl || !!wi?.poster;                     // Künstler: seine Auswahl
        })
        .map(k => ({ m, k }));
    })
    /**
     * DIE BEKANNTESTEN ZUERST (Owner 16.09.2026: „nimm mehr berühmte") — wer den Laden öffnet,
     * soll ein Bild sehen, das er kennt. Alphabetisch begann die Seite mit Friedrich; van Gogh
     * stand ganz unten. Innerhalb eines Künstlers steht sein Hauptwerk vorn (Nummer -1).
     */
    .sort((a, b) => {
      const rang = (k: string) => {
        const i = ["vangogh", "klimt", "monet", "munch", "hokusai", "friedrich"].indexOf(k);
        return i < 0 ? 99 : i;
      };
      return rang(a.m.kennung) - rang(b.m.kennung) || a.k.i - b.k.i;
    });

  /**
   * ── REIHUM, EIN WERK JE KÜNSTLER (Owner 17.09.2026) ───────────────────────────────────────
   *
   * Sortiert nach Bekanntheit standen die ersten zehn Kacheln alle von van Gogh — er hat die
   * meisten Werke, also füllte er das Schaufenster allein. Jetzt kommt zuerst EIN Blatt von
   * jedem, dann das zweite von jedem, und so weiter. Die Reihenfolge innerhalb einer Runde
   * bleibt die von oben: bekannte Meister vorn, dann die lebenden Künstler.
   */
  const reihum = (liste: typeof posterWerke) => {
    const nachKuenstler = new Map<string, typeof posterWerke>();
    for (const e of liste) {
      const vorhanden = nachKuenstler.get(e.m.kennung) ?? [];
      vorhanden.push(e);
      nachKuenstler.set(e.m.kennung, vorhanden);
    }
    const gruppen = [...nachKuenstler.values()];
    const raus: typeof posterWerke = [];
    for (let runde = 0; raus.length < liste.length; runde++) {
      let etwas = false;
      for (const g of gruppen) {
        if (g[runde]) { raus.push(g[runde]); etwas = true; }
      }
      if (!etwas) break;
    }
    return raus;
  };

  const nachDatum = (liste: typeof kuenstler) => [...liste]
    .sort((a, b) => (Date.parse(b.angelegt ?? "") || 0) - (Date.parse(a.angelegt ?? "") || 0));
  /**
   * ── DIE VOLLSTÄNDIGSTE SEITE ZUERST (Owner 15.09.2026: „van gogh als erstes oben in der
   * kategorie") ───────────────────────────────────────────────────────────────────────────────
   *
   * Bei den lebenden Künstlern zählt das Datum: Wer neu dazukommt, steht vorn. Bei den Meistern
   * wäre das willkürlich — dort steht vorn, wer am meisten zu zeigen hat. Van Gogh mit neun
   * Werken und zwei Kleidungsstücken ist damit der erste, ohne dass eine Reihenfolge von Hand
   * gepflegt werden muss.
   */
  /* Generatoren gehören nicht in „Originale“ — siehe `originalWerke`. */
  const originalKuenstler = (liste: typeof kuenstler) => liste.filter(x => !x.kunstAn);
  const kuenstlerSortiert = ansicht === "repro"
    /* Die Meister zuerst (Owner 15.09.2026: „van gogh als erstes oben in der kategorie") und
       innerhalb der beiden Gruppen, wer am meisten zu zeigen hat. Sonst schöbe sich ein
       lebender Künstler mit zwölf Werken vor Van Gogh — und der Reiter hiesse zwar „Poster
       viu", begänne aber mit jemandem, den kaum ein Besucher kennt. */
    ? [...meister].sort((a, b) =>
      (b.reproduktion ? 1 : 0) - (a.reproduktion ? 1 : 0)
      || werkKacheln(b, L).length - werkKacheln(a, L).length)
    /* In „Originale" stehen nur die, die wirklich Einzelstücke haben — Generatoren nicht. */
    : nachDatum(ansicht === "werke" ? originalKuenstler(lebende) : lebende);
  /* Seitenzahl, Anfangsindex und Seitenanzahl standen hier — seit dem Nachladen (PortalMehr)
     rechnet sie niemand mehr aus. `?s=` in alten Links schadet nicht: Es wird schlicht ignoriert,
     und die Liste ist ohnehin vollständig. */

  /* Sprache und Ansicht müssen jeden Link überleben — sonst wirft die zweite Seite den Besucher
     zurück auf Englisch und in die Werke-Ansicht. */
  const adr = (o: { ansicht?: string; s?: number }) => {
    const p = new URLSearchParams();
    if (sp.lang) p.set("lang", String(sp.lang));
    const a = o.ansicht ?? ansicht;
    if (a === "werke" || a === "repro" || a === "kuenstler" || a === "digital") p.set("ansicht", a);
    /* `s` steht nur noch in Links, die es ausdrücklich setzen — seit dem Nachladen gibt es keine
       laufende Seitenzahl mehr, die mitgeschleppt werden müsste. */
    if ((o.s ?? 1) > 1) p.set("s", String(o.s));
    const q = p.toString();
    return q ? `${P.start}?${q}` : P.start;
  };

  /**
   * ── ZUM KÜNSTLER, IN DER SPRACHE DES BESUCHERS (Owner 20.09.2026: „Achtung, Link führt immer
   * zur RO-Seite", auch von der englischen Startseite aus) ────────────────────────────────────
   *
   * Die Künstlerseite fällt OHNE `lang` auf die Sprache des KÜNSTLERS zurück (`m.sprache`) — das
   * ist gewollt für Besucher, die von seiner Anzeige kommen. Von HIER kommt aber jemand, der
   * seine Sprache schon gewählt hat. Die Links liessen `lang` weg (oder nur bei Englisch, in der
   * Annahme, Englisch sei dort der Rückfall): Wer deutsch oder englisch las, landete beim
   * Karikaturisten auf Rumänisch.
   *
   * Deshalb steht die Sprache IMMER in der Adresse, auch Englisch.
   */
  const zuKuenstler = (kennung: string, ansichtDort?: string) =>
    `${P.kuenstler(kennung)}?${ansichtDort ? `ansicht=${ansichtDort}&` : ""}lang=${L}`;

  /**
   * ── WER IN DIGITAL ART STEHT ──────────────────────────────────────────────────────────────
   *
   * Der Merker sitzt am KÜNSTLER (`digital`), nicht am Werk: Wer am Bildschirm arbeitet, tut das
   * in aller Regel bei allem, was er zeigt. Gezeigt werden dieselben Werkkacheln wie bei den
   * Originalen — dieselbe Ware, andere Tür.
   */
  /**
   * ── WAS ÜBERHAUPT NOCH DA IST (Owner 19.09.2026: „Maia fehlt als Bild") ───────────────────
   *
   * Eine Werkkachel entsteht aus einem SATZ (`werkKacheln` liest `hook`/`hooks`), nicht aus einem
   * Bild — und der Satz überlebt die Ablehnung des Fotos. Diese Zeile stand schon an drei Stellen
   * ausgeschrieben; an der vierten (den Künstlerkreisen) fehlte sie, und dort stand Maias Name
   * unter einem leeren Kreis, daneben „4 lucrări" für vier Werke, die es nicht mehr gibt.
   *
   * Jetzt einmal, und jede Fläche fragt dieselbe Funktion.
   */
  const echteWerke = (m: (typeof kuenstler)[number]) => werkKacheln(m, L).filter(k => {
    const wi = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
    return !wi?.produkt && !wi?.abgelehntAm;
  });

  const digitale = kuenstler.filter(x => x.digital === true);
  const digitalWerke = kacheln.filter(({ m }) => m.digital === true);

  /**
   * ── EIN GENERATOR HAT KEINE ORIGINALE (Owner 19.09.2026: „der darf in dieser Kategorie gar
   * nicht stehen") ────────────────────────────────────────────────────────────────────────────
   *
   * „Lucrări originale" verspricht: ein Werk, von Hand gemacht, EINMAL — „câte una singură,
   * direct de la cel care a făcut-o". Ein Generator-Künstler des Hauses verkauft das Gegenteil:
   * beliebig oft, aus dem Foto des Kunden. Sein Blatt gehört in „Digital Art" und in den Laden,
   * nicht dorthin.
   *
   * Der Preis daneben war die zweite Folge desselben Fehlers: „20. Preț la cerere" — die
   * Preisspanne eines Künstlers, der gar nichts Einzelnes zu verkaufen hat.
   */
  const originalWerke = kacheln.filter(({ m }) => !m.kunstAn);

  const reiter = (
    <PortalReiter reiter={[
      /* Die Startseite ist selbst ein Reiter (Owner 16.09.2026: „die tabs brauchen wir doch und
         das ist die startseite tab") — sonst führt aus einer Kategorie kein Weg zurück in die
         Übersicht ausser über das Logo. */
      { label: T.tabStart, href: adr({ ansicht: "start", s: 1 }), aktiv: ansicht === "start" },
      { label: T.tabKuenstler, href: adr({ ansicht: "kuenstler", s: 1 }), aktiv: ansicht === "kuenstler" },
      { label: T.tabWerke, href: adr({ ansicht: "werke", s: 1 }), aktiv: ansicht === "werke" },
      /* Nur zeigen, wenn es überhaupt Meister gibt — ein leerer Reiter ist ein Versprechen ins Leere. */
      ...(meister.length ? [{ label: T.tabReproduktionen, href: adr({ ansicht: "repro", s: 1 }), aktiv: ansicht === "repro" }] : []),
      /* Dieselbe Regel wie bei den Meistern: kein Reiter, solange niemand darin steht. */
      ...(digitale.length ? [{ label: T.tabDigital, href: adr({ ansicht: "digital", s: 1 }), aktiv: ansicht === "digital" }] : []),
    ]} />
  );

  /* ENGER ALS VORHER (Owner: „die müssen kleiner werden und mehrere Spalten … auf mobile auch 2 3
     Spalten"): 2 Spalten am Handy, 3 ab sm, 4 ab lg. Die Abstände schrumpfen mit — mit den alten
     32 px blieben am Handy nur 151 px je Kachel. */
  /**
   * ── AM RECHNER DREI, UND SIE NUTZEN DIE BREITE (Owner 18.09.2026: „auf dem Desktop muss die
   * Breite des Schirmes ausnutzen bei der Startseite. Mach nur 3 Poster in der Reihe") ─────────
   *
   * VIER SPALTEN IN EINER 1120-PX-SPUR ergaben Blätter von rund 250 px — auf einem 1440er Schirm
   * lagen links und rechts zusammen 320 px brach, und das Poster war kleiner als auf dem Handy.
   * Drei Spalten in einer BREITEREN Spur (siehe `SPUR_BREIT` unten) machen daraus rund 450 px.
   *
   * Handy und Tablet bleiben, wie sie sind: zwei nebeneinander am Handy war eine eigene
   * Entscheidung vom 16.09. („auf dem handy 2 poster in einer linie").
   */
  const RASTER = "mt-6 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:gap-x-8 lg:gap-y-12";

  /**
   * ── REIHE ODER WAND (Owner 19.09.2026: „beim Living Poster und Originale kein Slider,
   * sondern Galerie-Darstellung. Die neusten sind oben") ──────────────────────────────────────
   *
   * AUF DER STARTSEITE ist eine Wischreihe richtig: Dort liegen drei Abschnitte übereinander,
   * und jeder darf nur eine Zeile hoch sein, sonst sieht niemand den nächsten.
   *
   * IM REITER ist sie falsch. Wer „Living Poster" antippt, hat sich entschieden und will ALLES
   * sehen — dort steht nur dieser eine Abschnitt, und eine Reihe versteckt neunzehn von zwanzig
   * Blättern hinter einer Wischgeste. Dazu kommt: Der Reiter blättert ohnehin seitenweise, und
   * waagerecht wischen, um danach senkrecht weiterzublättern, sind zwei Bewegungen für dieselbe
   * Sache.
   *
   * Dasselbe Bauteil, zwei Hüllen. `wand` schaltet um — die Kachel gibt dabei ihre feste Breite
   * ab, weil im Raster die Spalte sie setzt.
   */
  const huelle = (wand: boolean, kinder: React.ReactNode) =>
    wand ? <ul className={RASTER}>{kinder}</ul> : <PortalReihe laufen>{kinder}</PortalReihe>;

  /**
   * ── DIE NEUSTEN OBEN (Owner 19.09.2026) ──────────────────────────────────────────────────
   *
   * „Neu" ist der Augenblick, in dem ein Werk freigegeben wurde (`freiAm`, geschrieben von
   * `api/freigabe`), nicht der Tag, an dem sich sein Künstler angemeldet hat. Werke von vor der
   * Freigabe-Einführung haben kein `freiAm` und fallen auf das Anmeldedatum zurück — sie sind
   * wirklich älter, stehen also richtig hinten.
   *
   * SORTIERT WIRD STABIL: Bei gleichem Datum bleibt die Reihenfolge, die hereinkam. Bei den
   * gemeinfreien Meistern, die alle dasselbe Datum tragen, bleibt damit die Reihum-Verteilung
   * erhalten, statt dass zwanzigmal van Gogh untereinander steht.
   */
  const nachNeu = <T extends { m: (typeof kuenstler)[number]; k: { i: number } }>(liste: T[]) => [...liste]
    .sort((a, b) => neuZeit(b) - neuZeit(a));

  /* Beide Raster nehmen ihre Liste als Argument: Die Kategorieseite gibt eine Seite hinein, die
     Startseite einen Auszug. Zwei Kopien desselben Rasters würden mit dem ersten Wunsch nach
     einer Änderung auseinanderlaufen. */
  const werkRaster = (liste: typeof kacheln, wand = false) => huelle(wand,
    /* Auf der Startseite läuft die Reihe von selbst (Owner 18.09.2026: „Pfeil und Animation war
       gut"). Die Künstlerkreise bleiben ruhig: Gesichter, die von selbst wandern, liest niemand. */
    liste.map(({ m, k }) => (
        /* EIN SCHLÜSSEL JE KACHEL, nicht je Künstler: `m.kennung` allein war bei jedem Künstler
           mit mehr als einem Werk doppelt vergeben — React verwechselt dabei Kacheln. */
        <li key={`${m.kennung}-${k.i}`} className={wand ? "" : KACHEL}>
          <Link href={zuKuenstler(m.kennung)} className="group block text-inherit no-underline">
            <div className="flex aspect-[4/5] items-start justify-end bg-[#f5f5f5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={P.werkBild(m.kennung, k.i, 900)} alt={m.name} loading="lazy"
                className="max-h-full max-w-full object-contain" />
            </div>
            {/**
              * ── DER NAME FÜHRT, DER SATZ FOLGT (Owner 19.09.2026: „hier geht der Name unten, also
              * fetter ganz gross" · „Texte sind nicht ok, Serifenschrift und nicht als Link") ─────
              *
              * VORHER: ein dreizeiliger, fetter, unterstrichener Beschreibungssatz — und darunter
              * klein und grau der Name des Künstlers. Drei Fehler auf einmal.
              *
              *   · DER NAME GING UNTER. In einer Galerie liest man zuerst, VON WEM etwas ist. Bei
              *     „Respect the Artist" ist das nicht Geschmack, sondern die Haltung des Hauses.
              *   · DER SATZ SAH AUS WIE EIN LINK. Fett plus Unterstreichung beim Überfahren heisst
              *     im Netz „hier geht es weiter" — es ist aber eine Bildbeschreibung.
              *   · SERIFENLOS NEBEN EINEM GEMÄLDE liest sich wie eine Bildunterschrift in einem
              *     Katalog von der Stange. Die Serifenschrift ist im Portal die Schrift der Kunst
              *     (Überschriften, Posterblätter) — der Satz zum Werk gehört dazu.
              *
              * ZWEI ZEILEN STATT DREI: GEMESSEN sind die 35 Hooks im Mittel 187 Zeichen lang, in
              * eine Kachel dieser Breite passen rund 60. Der ganze Satz steht auf der Werkseite.
              */}
            <p className="m-0 mt-3 font-serif text-[19px] font-bold leading-[1.15] text-[#111] sm:text-[22px]">{m.name}</p>
            {m.ort ? <p className="m-0 mt-1 text-[13.5px] text-[#777]">{m.ort}</p> : null}
            <p className="m-0 mt-2 line-clamp-2 font-serif text-[14.5px] leading-[1.4] text-[#555] sm:text-[15px]">{k.hook}</p>
            {/* Der Preis als Label, wenn der Künstler ihn zeigen will (Owner 11.09.2026: „der Preis braucht ein Label überall"). */}
            {(() => {
              /* ── KEIN „PREIS AUF ANFRAGE" BEI EINEM GENERATOR (Owner 19.09.2026: „woher der
                 Preis auch kommt") ──────────────────────────────────────────────────────────
                 Das Etikett gehört zu einem Einzelstück, nach dem man fragt. Bei einem Blatt,
                 das aus dem Foto des Kunden entsteht, gibt es nichts zu erfragen — es kostet,
                 was auf dem Knopf steht. „20. Preț la cerere" kam aus der Preisspanne eines
                 Künstlers, der gar keine Einzelstücke verkauft. */
              /* Stattdessen, was es kostet: „de la 10 €" — der Betrag kommt aus `KUNST_CENTS`,
                 derselben Konstante wie der Knopf auf seinem Blatt und die Buchung. */
              if (m.kunstAn) return (
                <p className="mt-1.5"><PreisLabel>{T.kunstAbPreis.replace("{preis}", eur(KUNST_CENTS, L))}</PreisLabel></p>
              );
              const w = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
              const preis = preisText(w?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage);
              return preis ? <p className="mt-1.5"><PreisLabel>{preis}</PreisLabel></p> : null;
            })()}
          </Link>
        </li>
      )),
  );

  /* DIE KÜNSTLER-ANSICHT zeigt den Menschen, nicht das einzelne Werk: sein erstes Bild als
     Vorschau, Name, Ort und wie viele Werke er hat. Mehr steht in den Daten nicht — und was
     nicht da ist, wird hier auch nicht behauptet. */
  const kreisRaster = (liste: typeof kuenstler, zuPostern: boolean, wand = false) => huelle(wand,
    /* Kein Kreis ohne Bild und keine erfundene Zahl darunter — siehe `echteWerke`. Ein Künstler
       ohne Werk bleibt über seine eigene Adresse erreichbar, steht aber in keiner Reihe, die zum
       Entdecken einlädt. */
    liste.map(m => ({ m, w: echteWerke(m) })).filter(x => x.w.length > 0).map(({ m, w }) => {
        return (
          <li key={m.kennung} className={wand ? "" : KACHEL}>
            {/* ── AUS DER POSTER-KATEGORIE FÜHRT DER WEG ZU DEN POSTERN, NICHT ZU DEN ORIGINALEN
                ──────────────────────────────────────────────────────────────────────────────
                Owner 16.09.2026: „die originale bitte so lassen wie es war · das ist eine andere
                kategorie · wir können die kunst auch als poster verkaufen eines künstlers. dann
                machen wir den auch in die Poster viu rein".

                Bei einem lebenden Künstler zeigt dieselbe Seite zweierlei: seine Originale (sein
                Auftritt, unverändert) und dieselben Werke als Poster. `?ansicht=poster` schaltet
                um. Ein zweiter Datensatz mit denselben Bildern wäre dieselbe Sache doppelt
                gepflegt — und eine davon wäre irgendwann veraltet. */}
            <Link href={zuKuenstler(m.kennung, zuPostern && !m.reproduktion ? "poster" : undefined)}
              className="group block text-center text-inherit no-underline">
              {/* ── KREIS UND NAME (Owner 15.09.2026: „oder die portraitkreise und namen") ─────
                  Vorher stand hier ein grosses Werkbild je Künstler. Wer die Liste öffnet, will
                  aber sehen, WER hier ist — dieselbe Form wie das Profilbild auf seiner Seite.
                  Hat er ein Profilbild, steht sein Gesicht da; sonst sein erstes Werk. */}
              <div className="mx-auto flex aspect-square w-[62%] items-center justify-center overflow-hidden rounded-full bg-[#f5f5f5] sm:w-[70%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* `werkBild` nimmt eine Nummer; das Profilbild hat keine — deshalb hier die
                    Adresse direkt, wie sie auch die Künstlerseite baut. */}
                <img src={m.profilBild ? `/api/portal-werk?m=${encodeURIComponent(m.kennung)}&i=profil&w=220` : (w[0] ? P.werkBild(m.kennung, w[0].i, 220) : "")}
                  alt={m.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <p className="mt-3 text-[14px] font-semibold leading-[1.3] group-hover:underline sm:text-[15px]">{m.name}</p>
              {m.ort ? <p className="mt-1 text-[12px] text-[#777]">{m.ort}</p> : null}
              <p className="mt-1 text-[12px] text-[#777]">{T.werkeZahl.replace("{n}", String(w.length))}</p>
            </Link>
          </li>
        );
      }),
  );

  /* Echte Adressen statt eines Knopfs, der nur im Browser weiterblättert: Google findet damit
     jede Seite, und der Zurück-Knopf führt zurück. */
  /* ── DAS BLÄTTERN IST RAUS (Owner 19.09.2026: „besser wäre nachladen") ───────────────────
     Hier stand „← Zurück   1 / 5   Weiter →". Siehe components/PortalMehr.tsx. Die Texte
     `seiteZurueck`/`seiteWeiter` bleiben in der Textdatei — sie werden anderswo noch gebraucht. */

  /* Ein Satz, der sagt, was hier steht (Owner 16.09.2026: „du musst direkt unter der kategorie
     Poster viu erklären was das ist · auch unter Artiști · Lucrări, hier sind originale"). */
  const einleitung = (text: string) => (
    /* Der kleinste Druckpreis kommt aus derselben Tabelle wie die Kasse (Skill `bezahlung`,
       Regel 2) — im Text steht nur der Platzhalter. */
    <div className="mt-5 max-w-[68ch]">
      <MehrText text={text.replace("{von}", eur(druckSpanneCents().von, L))}
        mehr={T.mehrLesen} weniger={T.wenigerLesen}
        className="text-[15px] leading-[1.6] text-[#555]" />
    </div>
  );

  /**
   * ── DIE STARTSEITE ZEIGT, WAS EINE KATEGORIE IST — NICHT IHRE ERSTEN VIER ZEILEN ───────────
   *
   * Owner 16.09.2026: „das ist für mich kein guter teaser für die startseite als einführung in
   * die kategorie und ich meine bei allen 3".
   *
   * Vier Kacheln aus der Liste sind kein Teaser, sondern ein abgeschnittener Anfang: Vier
   * Malerporträts erklären nicht, was ein Poster viu ist, und vier Werkkacheln mit je drei
   * Zeilen Text lesen sich wie eine halbe Seite. Jede Kategorie bekommt deshalb ein eigenes
   * Bild ihrer selbst — Gesichter für die Künstler, Werke für die Werke, und für die Poster
   * das Foto von der Wand, auf dem man den Code und das Telefon sieht.
   */
  /**
   * ── DIE DREI TEASER SIND DAS WICHTIGSTE AUF DER SEITE (Owner 16.09.2026: „noch besser machen,
   * die gehen unter auf der seite. Das sind die wichtigsten") ────────────────────────────────
   *
   * Vorher trugen sie dieselbe kleine graue Grossbuchstabenzeile wie jede Zwischenüberschrift im
   * Haus — und gingen neben Lead, Knopf und Journal unter. Hier stehen sie als das, was sie
   * sind: die drei Türen dieser Seite. Grosse Überschrift, ein Satz, das Bild, ein Weg hinein.
   */
  const abschnitt = (titel: string, text: string, inhalt: React.ReactNode, ziel: string) => (
    <section className="mt-16 border-t border-[#e5e5e5] pt-10 first:mt-8 first:border-0 first:pt-0">
      <Link href={ziel} className="block text-inherit no-underline">
        <h2 className="m-0 font-serif text-[27px] leading-[1.15] tracking-[-0.01em] text-[#111] sm:text-[34px]">{titel}</h2>
      </Link>
      {einleitung(text)}
      {inhalt}
      {/* ── AUCH HIER EIN KNOPF (Owner 19.09.2026: „auch hier fette Buttons für Vezi tot") ──
          Ein unterstrichenes Wort am Ende einer Reihe liest niemand — es sieht aus wie eine
          Fussnote. Dieselbe Form wie die Reiter oben und der Nachladen-Knopf unten: schwarzer
          Rahmen, Versalien, fett. Drei Stellen, eine Sprache. */}
      <Link href={ziel}
        className="mt-7 inline-flex items-center gap-2 border-2 border-[#111] bg-white px-6 py-3 text-[13.5px] font-black uppercase tracking-[0.12em] text-[#111] no-underline transition hover:bg-[#111] hover:text-white sm:text-[14px]">
        {T.alleAnsehen} →
      </Link>
    </section>
  );

  /* GESICHTER, DICHT AN DICHT: eine Reihe überlappender Kreise sagt in einem Blick „hier sind
     Menschen" — und zwar mehr, als in eine Reihe passen. Die einzelnen Namen stehen einen Klick
     weiter; hier zählt die Gruppe, nicht der einzelne. */
  /**
   * ── KÜNSTLER MIT IHREM WERK, IN EINER REIHE (Owner 18.09.2026: „übereinander ohne Werke" ·
   * „ich weiss nicht, was das bringt") ─────────────────────────────────────────────────────────
   *
   * HIER STANDEN NEUN RUNDE GESICHTER, überlappend, mit `flex-wrap` — ab dem achten fielen sie
   * in eine zweite Reihe und standen dort übereinander. Und sie zeigten, WER hier ist, aber
   * nicht, WAS er macht. Ein Besucher kauft kein Gesicht.
   *
   * Jetzt je Künstler eine Karte: sein jüngstes Werk gross, sein Bild als kleiner Kreis darauf,
   * sein Name darunter. Dieselbe Wischreihe wie bei den Postern und Originalen — kein Umbruch,
   * ein angeschnittenes Blatt am Rand, ein Pfeil.
   *
   * JEDE KARTE FÜHRT ZU IHM, nicht in die Übersicht: Wer ein Werk antippt, will diesen Künstler.
   */
  const gesichter = (liste: typeof kuenstler, _ziel: string) => (
    <PortalReihe>
      {liste
        /* ── KEINE KACHEL OHNE BILD (Owner 19.09.2026: „Maia Bild fehlt") ────────────────────
           Wessen Fotos alle abgelehnt sind, hat hier nichts zu zeigen. Vorher stand sein Name
           unter einem leeren Rahmen — die Kachel kam aus `werkKacheln`, und das liest Sätze,
           keine Bilder. Er bleibt im Reiter „Künstler" sichtbar; dort steht ehrlich „0 Werke".
           DIESELBE PRÜFUNG WIE IM RASTER, damit beide Flächen dieselben Werke zeigen. */
        .map(m => ({ m, w: echteWerke(m) }))
        .filter(x => x.w.length > 0)
        .slice(0, 20).map(({ m, w }) => {
        const erstes = w[0];
        return (
          <li key={m.kennung} className={KACHEL}>
            <Link href={zuKuenstler(m.kennung)} className="group block text-inherit no-underline">
              <span className="relative block overflow-hidden bg-[#f5f5f5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={erstes ? P.werkBild(m.kennung, erstes.i, 700) : ""} alt="" loading="lazy"
                  className="block aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                {m.profilBild ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`/api/portal-werk?m=${encodeURIComponent(m.kennung)}&i=profil`} alt="" loading="lazy"
                    className="absolute bottom-2 left-2 h-11 w-11 rounded-full border-2 border-white object-cover shadow-[0_2px_10px_rgba(0,0,0,.25)]" />
                ) : null}
              </span>
              <span className="mt-2 block font-serif text-[17px] leading-tight text-[#111]">{m.name}</span>
            </Link>
          </li>
        );
      })}
    </PortalReihe>
  );

  /**
   * ── DER LADEN: WERKE MIT PREIS UND KAUFKNOPF (Owner 16.09.2026) ───────────────────────────
   *
   * Jedes Blatt so, wie es gedruckt wird — dieselbe `Poster`-Komponente wie auf der Künstler-
   * seite —, darunter Rahmen, Grösse, Preis und Kaufen. Wer hier landet, kann sofort bestellen,
   * ohne vorher irgendwo hineinzuklicken.
   */
  /* Zwei nebeneinander schon am Handy (Owner 16.09.2026: „auf dem handy 2 poster in einer
     linie") — ein Laden zeigt Auswahl, nicht ein Stück nach dem anderen. */
  const ladenRaster = (liste: typeof posterWerke, wand = false) => huelle(wand,
    /* Als Reihe läuft sie von selbst (Owner 18.09.2026: „Pfeil und Animation war gut") — 20 px/s,
       hält an, sobald jemand sie anfasst, und läuft dann nicht wieder los. */
    liste.map(({ m, k }) => {
        const nr = k.i < 0 ? "standard" : String(k.i);
        const wi = m.werkInfo?.[nr];
        return (
          <li key={`${m.kennung}-${k.i}`} className={`lb-poster-block ${wand ? "" : KACHEL}`}>
            {/* ── IN SEINEN POSTERLADEN, NICHT AUF SEINE SEITE (Owner 17.09.2026: „Klick auf
                Poster soll zum Postershop des Künstlers gehen") ────────────────────────────────
                Wer im Schaufenster ein Blatt antippt, will Poster sehen — nicht seine Originale
                mit Preisen auf Anfrage. `?ansicht=poster` öffnet bei ihm genau die Wand, aus der
                diese Kachel stammt, samt Grösse, Rahmen und Kaufknopf. */}
            <Link href={zuKuenstler(m.kennung, "poster")}
              className="block text-inherit no-underline">
              {/* ── DASSELBE BLATT WIE BEIM KÜNSTLER (Owner 18.09.2026: „die Poster auf der
                  Startseite stimmen nicht mehr. Das Design stimmt nicht mehr mit dem jetzigen
                  überein") ──────────────────────────────────────────────────────────────────
                  Im Schaufenster stand noch das alte Blatt: Kopfzeile, Porträtkreis, Name mit
                  Lebensdaten, Werktitel. Auf der Künstlerseite heisst der Titel längst nach dem
                  Künstler, der Code sitzt klein unten neben seiner Adresse, und bei Lebenden
                  steht das Siegel in der Ecke. Zwei Fassungen desselben Produkts sind eine zu
                  viel — wer hier klickt, muss dasselbe wiederfinden. */}
              <Poster
                klasse="lb-rahmen-fest"
                titel={blattZeilen(m.name, wi, L, m.sprache).gross}
                stil={blattZeilen(m.name, wi, L, m.sprache).klein}
                text={posterAnriss(k.hook)}
                qrEcke
                qr="/api/portal-qr"
                siegel={!m.reproduktion}
                recht={`lakatosbandi.com/${m.kennung}`}
                bild={
                  /* `PosterWandFoto` statt `<img>`: Es meldet dem Blatt, ob das Werk stehend ist —
                     dann wird es hier genauso grösser wie auf der Künstlerseite (Owner 20.09.2026). */
                  <PosterWandFoto standard={P.werkBild(m.kennung, k.i, 900)} alt={m.name}
                    className={wi?.quer ? "block h-auto w-full" : "block h-full w-auto"} />
                }
              />
            </Link>
            {/* KEIN KAUFKNOPF HIER (Owner 16.09.2026: „kaufen soll man hier nicht · nur poster
                zeigen") — zwanzig Kacheln mit Auswahlfeldern wären ein Formular, kein Schaufenster.
                Gekauft wird eine Seite weiter, wo das Werk gross steht und die Angaben dabei. */}
          </li>
        );
      }),
  );

  /* ── DIE WANDFOTOS SIND RAUS (Owner 18.09.2026: „diese Bilder raus") ────────────────────
     Sie zeigten das Blatt von vor drei Tagen: Kopfzeile „POSTER VIU", Code in der Mitte, Name
     mit Lebensdaten. Seit das Blatt anders aussieht, warben sie für ein Produkt, das es so nicht
     mehr gibt — und die echten Kacheln darunter zeigen es ohnehin besser. */

  /**
   * ── DIE RUBRIK STEHT VOR DEN REITERN (Owner 18.09.2026) ─────────────────────────────────────
   *
   * Erst sagen, was für ein Laden das ist — dann die Ware. Die Reiter sind Navigation für
   * jemanden, der schon weiss, wonach er sucht; wer aus einer Anzeige kommt, weiss es nicht.
   *
   * DIE BILDER SIND UNSERE EIGENEN RAUMFOTOS und ein Beispielblatt — kein fremdes Material, und
   * jedes zeigt wirklich das, was die Kachel verspricht.
   */
  /**
   * ── DIE RUBRIK ZEIGT DAS NEUESTE (Owner 18.09.2026: „auf der Startseite sollen die neuesten
   * erscheinen, am besten in dieser Rubrik") ───────────────────────────────────────────────────
   *
   * Dort standen drei feste Fotos — ein grauer Betonraum als Aufmacher, ein Schlafzimmer, die
   * Sternennacht. Sie erzählten, was wir ANBIETEN, aber nicht, was gerade hereingekommen ist.
   * Wer die Seite zum zweiten Mal öffnet, sah dasselbe Bild wie beim ersten Mal.
   *
   * `kacheln` ist bereits nach Datum sortiert (neuester Künstler zuerst). Der Aufmacher nimmt
   * also das jüngste Werk eines LEBENDEN Künstlers — bei einem Meister wäre „neu" sinnlos, die
   * hängen seit hundert Jahren.
   *
   * FÄLLT ES AUS, BLEIBT DAS RAUMFOTO: Solange noch kein lebender Künstler freigegeben ist, darf
   * die Rubrik nicht leer sein.
   *
   * AUCH KEIN `kunstAn`-KONTO (Owner 25.09.2026: „und wieso steht dann das hier auf der
   * Startseite?" zu einem Karikatur-Beispielbild unter „Kauf Kunst, die dem Künstler noch
   * gehört") ─────────────────────────────────────────────────────────────────────────────────
   *
   * `!m.reproduktion` schloss nur die gemeinfreien Meister aus — ein Generator wie
   * „caricaturist-ai" ist kein Meister, also kam sein eigenes BEISPIELBILD hier durch, sobald es
   * gerade das jüngste war. Das ist kein Werk, „das dem Künstler noch gehört" — es ist die
   * Probezeichnung des Werkzeugs. Dieselbe Ausnahme gilt schon für `originalWerke` weiter unten
   * (Zeile 369) und für `originalKuenstler`; hier fehlte sie.
   */
  const neuestesWerk = kacheln.find(({ m }) => !m.reproduktion && !m.kunstAn);
  const neuestesPoster = posterWerke[0];

  /**
   * ── DIE GROSSE FLÄCHE WIRBT FÜR DAS, WAS MAN HIER MACHEN KANN (Owner 19.09.2026: „wieso steht
   * der Typ hier? Mach lieber Werbung für Caricaturist. Dein Bild als Karikatur") ─────────────
   *
   * HIER STAND DAS ZULETZT FREIGEGEBENE WERK mit der Überschrift „Kauf Kunst, die dem Künstler
   * noch gehört". Zwei Fehler in einer Kachel: Das Bild war ein beliebiges Porträt eines
   * beliebigen Menschen — es sagte niemandem etwas —, und die Überschrift erklärte unsere
   * HALTUNG. Haltung überzeugt niemanden, der die Seite zum ersten Mal sieht; sie ist das, was
   * man glaubt, NACHDEM man etwas wollte. Sie steht weiter unten im Artist-Fair-Abschnitt.
   *
   * JETZT STEHT DORT DAS EINZIGE, WAS MAN AUF DIESER SEITE SELBST TUN KANN: ein Foto hochladen
   * und es gezeichnet zurückbekommen. Das ist konkret, es kostet keinen Entschluss, und es ist
   * der Weg in den Laden.
   *
   * NICHT AUF „caricaturist-ai" FESTGENAGELT: Genommen wird der erste Künstler mit `kunstAn` —
   * derselbe Schalter, der auf seiner Seite den Knopf zeigt. Schaltet der Owner morgen einen
   * zweiten frei oder diesen ab, wandert die Werbung mit, ohne dass jemand daran denken muss.
   * Gibt es keinen, steht wieder die alte Kachel da.
   */
  const kariKuenstler = kuenstler.find(x => x.kunstAn === true
    && werkKacheln(x, L).some(k => !x.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.abgelehntAm));
  const kariWerk = kariKuenstler ? werkKacheln(kariKuenstler, L)[0] : undefined;

  const rubrik = (
    <PortalRubrik
      /**
       * ── DAS NEUESTE WERK GEHÖRT NACH OBEN, IMMER (Owner 21.09.2026: „ich will das letzte Werk
       * immer auf der Startseite ganz oben sehen … Diese Rubrik ist für Werbung, und ich will die
       * neuen Werke hier promoten, egal ob Poster oder Original") ────────────────────────────────
       *
       * Bis heute stand hier IMMER die Karikatur, sobald irgendein Künstler `kunstAn` hatte —
       * praktisch also immer, und das jüngste Werk kam nie an die Reihe (der Rückfall unten griff
       * nur, wenn es GAR keinen Karikaturisten gab). Jetzt ist es umgekehrt: Der Aufmacher zeigt
       * IMMER das jüngste Werk eines lebenden Künstlers — Poster oder Original, das entscheidet
       * `neuestesWerk` bereits nicht (`!m.reproduktion` schliesst nur die gemeinfreien Meister
       * aus). Erst wenn es gar kein lebendes Werk gibt, bleibt die Karikatur als Aufmacher stehen,
       * und erst danach das Raumfoto.
       *
       * DIE KARIKATUR GEHT NICHT VERLOREN (Owner: „das darf auch nicht verloren gehen"): Sie
       * steht jetzt als dritte, kleinere Kachel weiter unten — dieselben Texte, nur nicht mehr
       * der Aufmacher.
       */
      gross={neuestesWerk ? {
        titel: T.rubrikGrossTitel, text: T.rubrikGrossText, link: T.rubrikGrossLink,
        href: zuKuenstler(neuestesWerk.m.kennung),
        bild: P.werkBild(neuestesWerk.m.kennung, neuestesWerk.k.i, 900),
      } : kariKuenstler && kariWerk ? {
        kicker: T.rubrikKariKicker,
        titel: T.rubrikKariTitel, text: T.rubrikKariText, link: T.rubrikKariLink,
        href: zuKuenstler(kariKuenstler.kennung),
        bild: P.werkBild(kariKuenstler.kennung, kariWerk.i, 900),
      } : {
        titel: T.rubrikGrossTitel, text: T.rubrikGrossText, link: T.rubrikGrossLink,
        href: adr({ ansicht: "werke", s: 1 }),
        bild: "/lakatosbandi/raum1.jpg",
      }}
      kacheln={[
        {
          kicker: T.rubrikEinsKicker, titel: T.rubrikEinsTitel, text: T.rubrikEinsText,
          link: T.rubrikEinsLink, href: adr({ ansicht: "repro", s: 1 }),
          /* ── EIN POSTER, KEIN WERK (Owner 18.09.2026: „hier muss ein Poster gezeigt werden") ──
             Hier stand das nackte Gemälde. Verkauft wird aber das BLATT: Rahmen, Name, Satz,
             Code. Dasselbe Bauteil wie in der Posterreihe darunter — eine zweite Zeichnung des
             Blattes wäre die Stelle, an der in vier Wochen zwei verschiedene Poster stünden. */
          bild: neuestesPoster ? (() => {
            const nr = neuestesPoster.k.i < 0 ? "standard" : String(neuestesPoster.k.i);
            const wi = neuestesPoster.m.werkInfo?.[nr];
            return (
              <Poster
                klasse="lb-rahmen-fest"
                titel={blattZeilen(neuestesPoster.m.name, wi, L, neuestesPoster.m.sprache).gross}
                stil={blattZeilen(neuestesPoster.m.name, wi, L, neuestesPoster.m.sprache).klein}
                text={posterAnriss(neuestesPoster.k.hook)}
                qrEcke
                qr="/api/portal-qr"
                siegel={!neuestesPoster.m.reproduktion}
                recht={`lakatosbandi.com/${neuestesPoster.m.kennung}`}
                bild={
                  <PosterWandFoto standard={P.werkBild(neuestesPoster.m.kennung, neuestesPoster.k.i, 900)}
                    className={wi?.quer ? "block h-auto w-full" : "block h-full w-auto"} />
                }
              />
            );
          })() : "/lakatosbandi/raum3.jpg",
        },
        {
          kicker: T.rubrikZweiKicker, titel: T.rubrikZweiTitel, text: T.rubrikZweiText,
          link: T.rubrikZweiLink, href: adr({ ansicht: "repro", s: 1 }),
          bild: "/lakatosbandi/beispiel-sternennacht.jpg",
        },
        /* ── DIE KARIKATUR, JETZT ALS KLEINE KACHEL (Owner 21.09.2026) ─────────────────────────
           Dieselben Texte, die vorher den Aufmacher trugen — nur nicht mehr gross. Ohne
           Karikaturisten fehlt die Kachel einfach; dieselbe Bedingung wie am Aufmacher oben. */
        ...(kariKuenstler && kariWerk ? [{
          kicker: T.rubrikKariKicker, titel: T.rubrikKariTitel, text: T.rubrikKariText,
          link: T.rubrikKariLink, href: zuKuenstler(kariKuenstler.kennung),
          bild: P.werkBild(kariKuenstler.kennung, kariWerk.i, 900),
        }] : []),
      ]}
    />
  );

  /**
   * ── DER FILM UNTER DER KARIKATUR (Owner 20.09.2026, mit Bild der Karikatur-Karte: „ich brauche
   * das hier drunter genauso auf der Startseite") ─────────────────────────────────────────────
   *
   * Dieselbe Creme-Karte, derselbe Aufbau (Bild links, Zeilen rechts) — nur steht links kein
   * Bild, sondern DERSELBE Slider wie im Artikel und auf der Produktseite: Er startet auf dem
   * Film (Standbild, „The story behind the picture", Play-Knopf), darunter die Miniaturen Blatt ·
   * Zimmer · Film. Ohne Kaufbereich; gekauft wird auf der Seite des Werks.
   *
   * NICHT AUF GERRY FESTGENAGELT (wie `kariKuenstler` oben): Genommen wird das erste Werk eines
   * lebenden Künstlers, an dem ein Film hängt. Gibt es keines, fehlt die Karte — eine Karte, die
   * einen Film verspricht und keinen hat, wäre schlimmer als keine.
   */
  const storyFund = (() => {
    for (const x of kuenstler) {
      if (x.reproduktion) continue;
      const kk = werkKacheln(x, L).find(w => {
        const wi = x.werkInfo?.[w.i < 0 ? "standard" : String(w.i)];
        return !!wi?.film && !wi?.abgelehntAm;
      });
      if (kk) return { m: x, k: kk };
    }
    return null;
  })();
  const story = storyFund ? (() => {
    const { m: sm, k: sk } = storyFund;
    const nr = sk.i < 0 ? "standard" : String(sk.i);
    const kaufBar = !!sm.posterViu && aboAktiv(sm as Parameters<typeof aboAktiv>[0]);
    const seite = `${P.kuenstler(sm.kennung)}/${nr}?lang=${L}`;
    return (
      <section className="mt-5 grid gap-0 bg-[#f4efe2] sm:grid-cols-[1.15fr_1fr] sm:items-center lg:mt-6">
        <div className="flex justify-center px-4 pt-5 sm:px-6 sm:py-6">
          {/* Am Rechner will das Blatt von sich aus bildschirmhoch sein (`lg:w-[min(92vw,…)]`, richtig
              für die Künstlerseite). In dieser Karte gibt die Spalte das Mass: GEMESSEN bei 1440 px
              stand es 560 px breit in einer 420er Hülle, also 140 px aus der Mitte gerückt. */}
          <div className="w-full max-w-[420px] [&_.lb-poster-block]:!w-full">
            <PosterProdukt
              kuenstler={sm.kennung} m={sm} k={sk} L={L} T={T}
              mitAdmin={u => u} admin={false} adminS=""
              lebend={false} kaufBar={kaufBar} alsPoster={kaufBar}
              istKleidung={() => false} kariStil={false} werkBild={P.werkBild}
              filmHref={`${seite}&film=${nr}`} agentHref={`${seite}&agent=1`}
              filmOffen={false} slide="video" nurSlider />
          </div>
        </div>
        <div className="px-5 pb-6 pt-5 sm:px-8 sm:py-8">
          <span className="mb-1 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#666]">{T.rubrikKariKicker}</span>
          <h2 className="m-0 max-w-[18ch] font-serif text-[26px] font-normal leading-[1.12] text-[#111] sm:text-[34px]">{T.rubrikStoryTitel}</h2>
          <p className="mt-3 max-w-[42ch] text-[15px] leading-[1.55] text-[#555] sm:text-[17px]">{T.rubrikStoryText}</p>
          {/* EIN FETTER SCHWARZER KNOPF, KEINE UNTERSTRICHENE ZEILE (Owner 20.09.2026, mit Bild der
              Zeile: „braucht fetter schwarzer Button") — die dünne Zeile übersah man unter dem
              grossen Film. `<a>` statt `<Link>`: Die Adresse `/journal/…` lebt auf lakatosbandi.com
              von einer Umleitung je Host; ein voller Seitenaufruf nimmt sie sicher mit. */}
          <a href={P.journal(L, "story-behind-the-picture")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111] px-6 py-3.5 text-[16px] font-bold text-white no-underline transition hover:bg-[#333]">
            {T.rubrikStoryLink}
            <ArrowRight className="h-[18px] w-[18px]" aria-hidden />
          </a>
        </div>
      </section>
    );
  })() : null;

  const start = (
    <>
      {rubrik}
      {story}
      {reiter}
      {/* EINE HÜLLE UM DIE ABSCHNITTE, damit `first:` greift (Owner 16.09.2026: „hier habe ich
          zwei linien untereinander"): Lag der erste Abschnitt direkt neben der Reiterleiste, war
          er nicht `:first-child` — und zog seinen Trennstrich dicht unter den der Reiter. */}
      <div>
      {/* Zuerst die Ware (Owner 16.09.2026: „sofort verkaufen") — dann, wer dahintersteht. */}
      {posterWerke.length ? abschnitt(T.tabReproduktionen, T.tabTextRepro,
        ladenRaster(reihum(posterWerke).slice(0, 20)),
        adr({ ansicht: "repro", s: 1 })) : null}
      {/* Alle drei Überschriften sagen, was die Kategorie IST (Owner 16.09.2026: „dann Artiști
          ist blöd, wenn schon dann alle") — nicht zwei ausgeschriebene und eine nackte. */}
      {abschnitt(T.teaserKuenstler, T.tabTextKuenstler,
        gesichter(nachDatum(lebende), adr({ ansicht: "kuenstler", s: 1 })),
        adr({ ansicht: "kuenstler", s: 1 }))}
      {/**
        * ── DIE ORIGINALE ZEIGEN SICH WIE IM REITER (Owner 18.09.2026: „die Slider Originale war
        * langweilig, weil alle gleich aussehen … du sollst den Slider einbauen, den du auf dem
        * Tab Originale hast") ──────────────────────────────────────────────────────────────────
        *
        * HIER STAND `werkBand`: fünf quadratische Ausschnitte in einer Reihe, alle gleich gross,
        * ohne Titel, ohne Namen, ohne Preis — ein Band aus Farbflecken. Es sollte ein Vorgeschmack
        * sein und wirkte wie eine Tapete.
        *
        * `werkRaster` ist dasselbe Bauteil, das der Reiter „Originale" benutzt: das Werk in seinem
        * eigenen Format, darunter der Satz, der es beschreibt, der Name des Künstlers und „Preis
        * auf Anfrage". Jede Kachel sieht anders aus, weil jedes Werk anders ist — und genau das
        * fehlte.
        *
        * ZWANZIG STÜCK, wie bei den Postern: Eine Wischreihe lebt davon, dass rechts noch etwas
        * liegt. Fünf wären nach einem Wisch zu Ende.
        */}
      {abschnitt(T.teaserWerke, T.tabTextWerke,
        werkRaster(originalWerke.slice(0, 20)),
        adr({ ansicht: "werke", s: 1 }))}
      </div>
    </>
  );

  /* Einmal gerechnet, zweimal gebraucht (Anzahl für den Knopf, Liste für die Wand). */
  const posterAlle = nachNeu(reihum(posterWerke));

  const feed = ansicht === "start" ? start : (
    <>
      {reiter}
      {einleitung(ansicht === "repro" ? T.tabTextRepro
        : ansicht === "werke" ? T.tabTextWerke
          : ansicht === "digital" ? T.tabTextDigital : T.tabTextKuenstler)}
      {/* ── „LIVING POSTER" ZEIGT SOFORT DEN LADEN (Owner 18.09.2026: „Living Poster muss
          sofort den Shop zeigen") ────────────────────────────────────────────────────────────
          Der Reiter zeigte Porträtkreise der Maler — wer „Living Poster" antippt, will aber
          Poster sehen und kaufen, nicht erst einen Maler wählen. Die Künstler stehen weiter im
          eigenen Reiter daneben. */}
      {/* ── IM REITER EINE WAND, KEINE REIHE (Owner 19.09.2026: „beim Living Poster und Originale
          kein Slider, sondern Galerie-Darstellung. Die neusten sind oben") ───────────────────
          Und die Reihenfolge dreht sich mit: Im Schaufenster der Startseite stehen die
          bekanntesten Meister vorn (Owner 16.09.2026: „nimm mehr berühmte") — dort soll jemand
          ein Bild erkennen, das er kennt. Hier ist der Laden selbst offen, und wer ihn zum
          zweiten Mal öffnet, sucht, was seit dem letzten Mal dazugekommen ist. */}
      {/* ── ÜBER DER WAND DIE KÜNSTLER (Owner 19.09.2026: „hier fehlt auch der Künstler-Slider") ─
          In der Wand steht Werk neben Werk — man sieht, WAS es gibt, aber nicht, WER dahinter
          steht, und muss dafür in einen anderen Reiter. Die Kreisreihe darüber schliesst das: ein
          Wisch, ein Gesicht, ein Klick auf seine Seite.
          SIE BLEIBT EINE REIHE, auch wenn darunter ein Raster liegt: Eine zweite Wand aus
          Gesichtern würde die Werke unter den Bildschirmrand schieben — und die sind hier die
          Hauptsache. `kuenstlerSortiert` trägt schon die richtige Auswahl je Reiter: im Laden die
          mit Postern, bei den Originalen die lebenden. */}
      {ansicht === "repro" || ansicht === "werke"
        ? (kuenstlerSortiert.length ? kreisRaster(kuenstlerSortiert, ansicht === "repro") : null)
        : ansicht === "digital"
          ? (digitale.length ? kreisRaster(digitale, false) : null)
          : null}
      {/**
        * ── NACHLADEN STATT BLÄTTERN (Owner 19.09.2026: „das fetter, es geht unter — aber besser
        * wäre nachladen") ─────────────────────────────────────────────────────────────────────
        *
        * Die ganze Liste geht hinein, `PortalMehr` zeigt erst einen Schub und blendet den Rest
        * ein. Das Blättern („← Zurück 1/5 Weiter →") entfällt damit auf allen drei Reitern; es
        * warf den Besucher bei jedem Klick nach oben und verlor die Stelle, an der er war.
        */}
      {ansicht === "repro"
        ? <PortalMehr gesamt={posterAlle.length} schritt={PRO_SEITE} wort={T.mehrAnzeigen} alleWort={T.alleAnzeigen}>{ladenRaster(posterAlle, true)}</PortalMehr>
        : ansicht === "werke"
          ? <PortalMehr gesamt={originalWerke.length} schritt={PRO_SEITE} wort={T.mehrAnzeigen} alleWort={T.alleAnzeigen}>{werkRaster(originalWerke, true)}</PortalMehr>
          : ansicht === "digital"
            ? <PortalMehr gesamt={digitalWerke.length} schritt={PRO_SEITE} wort={T.mehrAnzeigen} alleWort={T.alleAnzeigen}>{werkRaster(digitalWerke, true)}</PortalMehr>
          : <PortalMehr gesamt={kuenstlerSortiert.length} schritt={PRO_SEITE} wort={T.mehrAnzeigen} alleWort={T.alleAnzeigen}>{kreisRaster(kuenstlerSortiert, false, true)}</PortalMehr>}
    </>
  );

  return (
    /* `data-lang` sagt dem Cookie-Streifen, in welcher Sprache diese Seite läuft — er hängt sonst
       an `<html lang>`, und das kommt aus dem Browser, nicht aus `?lang=` (siehe CookieConsent). */
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      {/* „SEITE GESEHEN" — genau hierhin führen die Anzeigen (Owner 11.09.2026). Egal ob „bald" oder
          schon offen: beide Zustände sind ein echter Besuch. */}
      <PortalBesuchMelden />
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} preise={P.preise} journal={P.journal(L)} />

      {bald ? (
        <main className={`${SPUR} px-5 pb-20 pt-14 md:pt-24`}>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#777]">{T.baldKicker}</p>
          <h1 className="m-0 mt-4 max-w-[820px] font-serif text-[38px] font-normal leading-[1.1] tracking-[-0.01em] md:text-[60px]">{T.baldTitel}</h1>
          <p className="mt-6 max-w-[640px] text-[17px] leading-[1.6] text-[#555]">{T.baldLead}</p>
          <a href={bewerben}
            className="mt-9 inline-block bg-[#111] px-7 py-4 text-[16px] font-semibold text-white no-underline hover:bg-[#333]">
            {T.baldKnopf}
          </a>
          <p className="mt-4 text-[14px] text-[#777]">{T.baldFein}</p>

          {kacheln.length > 0 && (
            <section className="mt-20 border-t border-[#e5e5e5] pt-10">
              <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#777]">{T.letzteWerke}</h2>
              {feed}
            </section>
          )}

          {/* Warum, was, wie, Auswahl, Kosten (Owner: „sagen wieso, weshalb, warum"). */}
          <PortalBald B={baldTexte(L)} preis={eur(VERSUSFORGE_ABO_CENTS, L)} bewerben={bewerben} knopf={T.baldKnopf} />
        </main>
      ) : (
        <main className={`${SPUR} px-5 pb-20 pt-10 md:pt-16`}>
          {/**
            * ── DIE SPUR DARF AM RECHNER BREITER WERDEN (Owner 18.09.2026: „muss die Breite des
            * Schirmes ausnutzen bei der Startseite") ─────────────────────────────────────────────
            *
            * 1120 px ist eine LESEBREITE — richtig für Überschrift und Fliesstext, falsch für eine
            * Wand voller Poster. Auf einem 1440er Schirm lagen links und rechts zusammen 320 px
            * brach, während die Blätter auf 250 px gedrückt wurden.
            *
            * Ab `xl` (1280 px) geht die Spur auf 1560 px. Die Texte darin behalten ihre eigenen
            * Grenzen (`max-w-[720px]`, `max-w-[620px]`), werden also NICHT mitgezogen — eine Zeile
            * über 1500 px liest niemand. Unter 1280 px ändert sich nichts.
            */}
          {/**
            * ── KEIN ANWERBE-KNOPF MEHR (Owner 25.09.2026: „das raus. Muss ersetzt werden. Wir
            * nehmen keine neuen Künstler mehr auf. Wir produzieren selber. Konzentrieren wird uns
            * auf moderne Kunst") ─────────────────────────────────────────────────────────────────
            *
            * Hier stand „Melde dich als Künstler an" — der Aufmacher warb um FREMDE Künstler.
            * Jetzt ist das Haus selbst der Künstler (Lakatos & Bandi Studio, siehe `T.titel`
            * unten), also fällt der Knopf weg. Die Anmeldung (`bewerben`) bleibt als Adresse
            * erreichbar, nur nicht mehr beworben — siehe `PortalBald` weiter unten.
            */}
          <h1 className="m-0 max-w-[720px] font-serif text-[34px] font-normal leading-[1.15] tracking-[-0.01em] md:text-[48px]">{T.titel}</h1>
          <p className="mt-4 max-w-[620px] text-[16px] leading-[1.55] text-[#555]">{T.lead}</p>

          {feed}
        </main>
      )}

      {/**
        * ── EINE KATEGORIE ZEIGT NUR IHRE WARE (Owner 19.09.2026: „und auf dieser Seite das raus"
        * · „also nichts anderes als die Werke") ─────────────────────────────────────────────────
        *
        * Unter den Werken standen bisher auf JEDER Ansicht drei weitere Abschnitte: die Haltung
        * „Artist Fair", das Journal und der lange Erklärblock mit dem Stein vom Strand. Auf der
        * Startseite gehören sie dorthin — dort fragt jemand, wer wir sind.
        *
        * IM REITER SIND SIE EIN BRUCH. Wer „Originale" antippt, hat eine Frage: was gibt es.
        * Dahinter zehntausend Pixel Hauserklärung zu hängen, beantwortet sie nicht, und der
        * Nachladen-Knopf am Ende der Wand verschwindet dazwischen. Die Abschnitte bleiben
        * erreichbar — ein Tipp auf „Start" führt hin.
        */}
      {ansicht === "start" && (
      <>
      {/* ── ARTIST FAIR: UNSERE HALTUNG, SICHTBAR (Owner 18.09.2026) ──────────────────────────
          „Ich weiss, dass Temu dreist die Kunst kopieren und auf T-Shirts drucken und verkaufen.
          Das soll bei uns nicht sein." · „Dafür wollen wir bekannt werden und schreiben auch in
          unsere Philosophie." · „Alles, was in unserem Shop gekauft wurde, ist Artist Fair."

          Steht VOR dem Journal und nach den Werken: Wer bis hierher gescrollt hat, hat die Kunst
          gesehen und fragt sich, wer wir sind. Der Betrag kommt aus der Drucktabelle, nie
          getippt (Skill `bezahlung`, Regel 2). */}
      <section className={`${SPUR} border-t border-[#e5e5e5] px-5 pb-16 pt-12`}>
        <div className="flex items-start gap-6">
          <div className="min-w-0">
            <h2 className="m-0 font-serif text-[28px] font-normal md:text-[36px]">{T.philoTitel}</h2>
          </div>
          {/* Das Siegel steht neben der Haltung, nicht darüber — es ist der Beweis, nicht die
              Überschrift. Auf dem Handy zu klein für Text, deshalb erst ab `sm`. */}
          <ArtistFair groesse={104} klasse="hidden shrink-0 text-[#111] sm:block" />
        </div>
        <div className="mt-5 max-w-[68ch] space-y-4 text-[16px] leading-[1.7] text-[#333]">
          {/* ── KEINE ZAHL IM TEXT (Owner 18.09.2026: „wir sagen nicht 10 Euro, weil es
              unterschiedlich ist … Spotify sagt auch nicht wie viel") ────────────────────────
              Der Anteil hängt am Produkt und wird sich ändern; eine feste Zahl in der Haltung
              wäre morgen falsch und würde uns festnageln. Was zählt, ist der Satz: es wird
              bezahlt. Die Beträge stehen dort, wo gekauft wird. */}
          {T.philoText.split("\n\n").map((z, i) => (
            <p key={i} className="m-0">{z}</p>
          ))}
        </div>
      </section>

      {/* AUS DEM JOURNAL — interne Links für Google, und auf dem Handy der Weg zum Journal
          (dort steht es nicht im Kopf). */}
      <section className={`${SPUR} border-t border-[#e5e5e5] px-5 pb-16 pt-12`}>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="m-0 font-serif text-[28px] font-normal md:text-[36px]">Journal</h2>
          <Link href={P.journal(L)} className="text-[15px] font-semibold text-[#111] underline">{JOURNAL_UI[L as JournalSprache]?.zurueck ?? "All articles"}</Link>
        </div>
        <ul className="mt-8 grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-3">
          {/* ALLE ARTIKEL, nicht die ersten drei (Owner 13.09.2026: „unten fehlen einige Artikel
              die da waren"). Es sind sechs; `slice(0, 3)` hat die Hälfte verschluckt. */}
          {ARTIKEL.map(a => (
            <li key={a.slug}>
              <Link href={P.journal(L, a.slug)} className="group block text-inherit no-underline">
                <span className="block font-serif text-[21px] leading-[1.3] group-hover:underline">{a.texte[L as JournalSprache].titel}</span>
                <span className="mt-2 block text-[14.5px] leading-[1.55] text-[#666]">{a.texte[L as JournalSprache].beschreibung}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/**
        * ── DIE ERKLÄRUNG STEHT HINTER DEM JOURNAL (Owner 13.09.2026: „tauschen") ───────────────
        *
        * WARUM, WAS, WIE, AUSWAHL, KOSTEN UND WER WIR SIND (Owner 13.09.2026: „unten fehlen einige
        * Artikel die da waren auch von uns die Gründer") — dieser Block hing allein im `bald`-Zweig
        * und war mit dem sechsten freigegebenen Künstler von selbst verschwunden. Er gehört aber
        * nicht zum Startzustand, sondern zur Seite.
        *
        * ER STAND ZWISCHEN FEED UND JOURNAL, UND DAS WAR DER FEHLER: GEMESSEN am 13.09.2026 ist er
        * rund 10.200 px lang. Der Feed endete bei 4.785 px, das Journal begann erst bei 15.551 px —
        * die Artikel lagen hinter einer Wand, die niemand durchscrollt. Zwei Wünsche, die sich
        * gegenseitig aufhoben.
        *
        * Jetzt stehen die Artikel direkt hinter den Werken, und wer wirklich wissen will, wie das
        * hier läuft, liest weiter. Der Rahmen (`max-w-[1120px] px-5`) kam bisher vom `<main>` —
        * hier draussen braucht der Block ihn selbst, sonst liefe er über die volle Fensterbreite.
        *
        * NUR IM OFFENEN PORTAL: Im `bald`-Zustand ist dieser Block der Hauptinhalt und bleibt oben.
        */}
      {!bald && (
        <section className={`${SPUR} px-5 pb-20`}>
          <PortalBald B={baldTexte(L)} preis={eur(VERSUSFORGE_ABO_CENTS, L)} bewerben={bewerben} knopf={T.fuerKuenstlerKnopf} />
        </section>
      )}
      </>
      )}

      <PortalFuss lang={L} />

      {/* Hier ging bis 11.09.2026 der Anmelde-Chat für Künstler von selbst auf (Owner 10.09.2026) — raus (Owner 11.09.2026:
          „soll nicht sein"). Künstler kommen über „Als Künstler bewerben" zu lakatosbandi.com/start. */}
    </div>
  );
}
