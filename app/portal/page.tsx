import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { kuenstlerListe, imPortalSichtbar, portalPfade, werkKacheln, posterAnriss } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
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
import { druckSpanneCents } from "@/lib/lakatosbandi-druck";
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
  const kacheln = kuenstler
    /* IN DER SPRACHE DES BESUCHERS (Owner 14.09.2026: „hier wird nichts übersetzt") — liegt sie
       noch nicht vor, kommt das Original zurück. */
    .flatMap(m => werkKacheln(m, L).map(k => ({ m, k })))
    .sort((a, b) => (Date.parse(b.m.angelegt ?? "") || 0) - (Date.parse(a.m.angelegt ?? "") || 0) || b.k.i - a.k.i);
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
  const meister = kuenstler.filter(m => m.reproduktion || m.posterViu);
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
    .filter(m => m.reproduktion || m.posterViu)
    .flatMap(m => {
      const auswahl = werkKacheln(m, L).some(k => m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)]?.poster);
      return werkKacheln(m, L)
        .filter(k => {
          const wi = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
          if (wi?.produkt) return false;                       // Kleidung ist kein Poster
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
  const kuenstlerSortiert = ansicht === "repro"
    /* Die Meister zuerst (Owner 15.09.2026: „van gogh als erstes oben in der kategorie") und
       innerhalb der beiden Gruppen, wer am meisten zu zeigen hat. Sonst schöbe sich ein
       lebender Künstler mit zwölf Werken vor Van Gogh — und der Reiter hiesse zwar „Poster
       viu", begänne aber mit jemandem, den kaum ein Besucher kennt. */
    ? [...meister].sort((a, b) =>
      (b.reproduktion ? 1 : 0) - (a.reproduktion ? 1 : 0)
      || werkKacheln(b, L).length - werkKacheln(a, L).length)
    : nachDatum(lebende);
  const gesamt = ansicht === "werke" ? kacheln.length : kuenstlerSortiert.length;
  const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  /* Eine erfundene Seitenzahl (`?s=99`) führt auf die letzte Seite statt ins Leere. */
  const seite = Math.min(Math.max(1, Math.round(Number(sp.s)) || 1), seiten);
  const von = (seite - 1) * PRO_SEITE;

  /* Sprache und Ansicht müssen jeden Link überleben — sonst wirft die zweite Seite den Besucher
     zurück auf Englisch und in die Werke-Ansicht. */
  const adr = (o: { ansicht?: string; s?: number }) => {
    const p = new URLSearchParams();
    if (sp.lang) p.set("lang", String(sp.lang));
    const a = o.ansicht ?? ansicht;
    if (a === "werke" || a === "repro" || a === "kuenstler") p.set("ansicht", a);
    if ((o.s ?? seite) > 1) p.set("s", String(o.s ?? seite));
    const q = p.toString();
    return q ? `${P.start}?${q}` : P.start;
  };

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
    ]} />
  );

  /* ENGER ALS VORHER (Owner: „die müssen kleiner werden und mehrere Spalten … auf mobile auch 2 3
     Spalten"): 2 Spalten am Handy, 3 ab sm, 4 ab lg. Die Abstände schrumpfen mit — mit den alten
     32 px blieben am Handy nur 151 px je Kachel. */
  const RASTER = "mt-6 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4";

  /* Beide Raster nehmen ihre Liste als Argument: Die Kategorieseite gibt eine Seite hinein, die
     Startseite einen Auszug. Zwei Kopien desselben Rasters würden mit dem ersten Wunsch nach
     einer Änderung auseinanderlaufen. */
  const werkRaster = (liste: typeof kacheln) => (
    <ul className={RASTER}>
      {liste.map(({ m, k }) => (
        /* EIN SCHLÜSSEL JE KACHEL, nicht je Künstler: `m.kennung` allein war bei jedem Künstler
           mit mehr als einem Werk doppelt vergeben — React verwechselt dabei Kacheln. */
        <li key={`${m.kennung}-${k.i}`}>
          <Link href={P.kuenstler(m.kennung)} className="group block text-inherit no-underline">
            <div className="flex aspect-[4/5] items-start justify-end bg-[#f5f5f5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={P.werkBild(m.kennung, k.i)} alt={m.name} loading="lazy"
                className="max-h-full max-w-full object-contain" />
            </div>
            {/* DER HOOK IST HIER EIN ANRISS, kein ganzer Satz: GEMESSEN sind die 35 Hooks im Mittel
                187 Zeichen lang — in eine Kachel dieser Breite passen rund 60. Der vollständige Satz
                steht auf der Seite des Werks, wohin diese Kachel führt. */}
            <p className="mt-3 line-clamp-3 text-[13px] font-semibold leading-[1.35] group-hover:underline sm:text-[14px]">{k.hook}</p>
            <p className="mt-1.5 text-[12px] text-[#777]">{m.name}{m.ort ? ` · ${m.ort}` : ""}</p>
            {/* Der Preis als Label, wenn der Künstler ihn zeigen will (Owner 11.09.2026: „der Preis braucht ein Label überall"). */}
            {(() => {
              const w = m.werkInfo?.[k.i < 0 ? "standard" : String(k.i)];
              const preis = preisText(w?.preis) || preisSatz(m.preisSpanne, T.preisAufAnfrage);
              return preis ? <p className="mt-1.5"><PreisLabel>{preis}</PreisLabel></p> : null;
            })()}
          </Link>
        </li>
      ))}
    </ul>
  );

  /* DIE KÜNSTLER-ANSICHT zeigt den Menschen, nicht das einzelne Werk: sein erstes Bild als
     Vorschau, Name, Ort und wie viele Werke er hat. Mehr steht in den Daten nicht — und was
     nicht da ist, wird hier auch nicht behauptet. */
  const kreisRaster = (liste: typeof kuenstler, zuPostern: boolean) => (
    <ul className={RASTER}>
      {liste.map(m => {
        const w = werkKacheln(m, L);
        return (
          <li key={m.kennung}>
            {/* ── AUS DER POSTER-KATEGORIE FÜHRT DER WEG ZU DEN POSTERN, NICHT ZU DEN ORIGINALEN
                ──────────────────────────────────────────────────────────────────────────────
                Owner 16.09.2026: „die originale bitte so lassen wie es war · das ist eine andere
                kategorie · wir können die kunst auch als poster verkaufen eines künstlers. dann
                machen wir den auch in die Poster viu rein".

                Bei einem lebenden Künstler zeigt dieselbe Seite zweierlei: seine Originale (sein
                Auftritt, unverändert) und dieselben Werke als Poster. `?ansicht=poster` schaltet
                um. Ein zweiter Datensatz mit denselben Bildern wäre dieselbe Sache doppelt
                gepflegt — und eine davon wäre irgendwann veraltet. */}
            <Link href={zuPostern && !m.reproduktion ? `${P.kuenstler(m.kennung)}?ansicht=poster` : P.kuenstler(m.kennung)}
              className="group block text-center text-inherit no-underline">
              {/* ── KREIS UND NAME (Owner 15.09.2026: „oder die portraitkreise und namen") ─────
                  Vorher stand hier ein grosses Werkbild je Künstler. Wer die Liste öffnet, will
                  aber sehen, WER hier ist — dieselbe Form wie das Profilbild auf seiner Seite.
                  Hat er ein Profilbild, steht sein Gesicht da; sonst sein erstes Werk. */}
              <div className="mx-auto flex aspect-square w-[62%] items-center justify-center overflow-hidden rounded-full bg-[#f5f5f5] sm:w-[70%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {/* `werkBild` nimmt eine Nummer; das Profilbild hat keine — deshalb hier die
                    Adresse direkt, wie sie auch die Künstlerseite baut. */}
                <img src={m.profilBild ? `/api/portal-werk?m=${encodeURIComponent(m.kennung)}&i=profil` : (w[0] ? P.werkBild(m.kennung, w[0].i) : "")}
                  alt={m.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <p className="mt-3 text-[14px] font-semibold leading-[1.3] group-hover:underline sm:text-[15px]">{m.name}</p>
              {m.ort ? <p className="mt-1 text-[12px] text-[#777]">{m.ort}</p> : null}
              <p className="mt-1 text-[12px] text-[#777]">{T.werkeZahl.replace("{n}", String(w.length))}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  /* Echte Adressen statt eines Knopfs, der nur im Browser weiterblättert: Google findet damit
     jede Seite, und der Zurück-Knopf führt zurück. */
  const blaettern = seiten > 1 ? (
    <nav className="mt-12 flex items-center justify-center gap-6 border-t border-[#e5e5e5] pt-8 text-[15px]">
      {seite > 1
        ? <Link href={adr({ s: seite - 1 })} className="font-semibold text-[#111] no-underline hover:underline">← {T.seiteZurueck}</Link>
        : <span className="text-[#ccc]">← {T.seiteZurueck}</span>}
      <span className="tabular-nums text-[#777]">{seite} / {seiten}</span>
      {seite < seiten
        ? <Link href={adr({ s: seite + 1 })} className="font-semibold text-[#111] no-underline hover:underline">{T.seiteWeiter} →</Link>
        : <span className="text-[#ccc]">{T.seiteWeiter} →</span>}
    </nav>
  ) : null;

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
      <Link href={ziel} className="mt-6 inline-block text-[16px] font-semibold text-[#111] underline underline-offset-4">
        {T.alleAnsehen} →
      </Link>
    </section>
  );

  /* GESICHTER, DICHT AN DICHT: eine Reihe überlappender Kreise sagt in einem Blick „hier sind
     Menschen" — und zwar mehr, als in eine Reihe passen. Die einzelnen Namen stehen einen Klick
     weiter; hier zählt die Gruppe, nicht der einzelne. */
  const gesichter = (liste: typeof kuenstler, ziel: string) => (
    <Link href={ziel} className="mt-6 flex flex-wrap items-center pl-3 no-underline">
      {liste.slice(0, 9).map(m => {
        const w = werkKacheln(m, L);
        return (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={m.kennung} alt={m.name} loading="lazy"
            src={m.profilBild ? `/api/portal-werk?m=${encodeURIComponent(m.kennung)}&i=profil` : (w[0] ? P.werkBild(m.kennung, w[0].i) : "")}
            className="-ml-3 h-[68px] w-[68px] rounded-full border-2 border-white bg-[#f5f5f5] object-cover shadow-[0_2px_10px_rgba(0,0,0,.12)] sm:h-[84px] sm:w-[84px]" />
        );
      })}
    </Link>
  );

  /* EIN BAND AUS WERKEN, ohne Hook und ohne Preis: Auf der Startseite soll man SEHEN, dass hier
     gemalte Bilder liegen. Gelesen wird in der Kategorie. */
  const werkBand = (liste: typeof kacheln, ziel: string) => (
    <Link href={ziel} className="mt-6 grid grid-cols-3 gap-2 no-underline sm:grid-cols-5 sm:gap-3">
      {liste.slice(0, 5).map(({ m, k }, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img key={`${m.kennung}-${k.i}`} src={P.werkBild(m.kennung, k.i)} alt={m.name} loading="lazy"
          className={`aspect-square w-full bg-[#f5f5f5] object-cover ${i > 2 ? "hidden sm:block" : ""}`} />
      ))}
    </Link>
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
  const ladenRaster = (liste: typeof posterWerke) => (
    <ul className="mt-6 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
      {liste.map(({ m, k }) => {
        const nr = k.i < 0 ? "standard" : String(k.i);
        const wi = m.werkInfo?.[nr];
        return (
          <li key={`${m.kennung}-${k.i}`} className="lb-poster-block">
            {/* ── IN SEINEN POSTERLADEN, NICHT AUF SEINE SEITE (Owner 17.09.2026: „Klick auf
                Poster soll zum Postershop des Künstlers gehen") ────────────────────────────────
                Wer im Schaufenster ein Blatt antippt, will Poster sehen — nicht seine Originale
                mit Preisen auf Anfrage. `?ansicht=poster` öffnet bei ihm genau die Wand, aus der
                diese Kachel stammt, samt Grösse, Rahmen und Kaufknopf. */}
            <Link href={`${P.kuenstler(m.kennung)}?ansicht=poster${L === "en" ? "" : `&lang=${L}`}`}
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
                titel={m.name}
                stil={[wi?.titel, wi?.jahr].filter(Boolean).join(", ")}
                text={posterAnriss(k.hook)}
                qrEcke
                qr={`/lakatosbandi/qr/${m.kennung}-${nr}.png`}
                siegel={!m.reproduktion}
                recht={`lakatosbandi.com/${m.kennung}`}
                bild={
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={P.werkBild(m.kennung, k.i)} alt={m.name} loading="lazy"
                    className={wi?.quer ? "block h-auto w-full" : "block h-full w-auto"} />
                }
              />
            </Link>
            {/* KEIN KAUFKNOPF HIER (Owner 16.09.2026: „kaufen soll man hier nicht · nur poster
                zeigen") — zwanzig Kacheln mit Auswahlfeldern wären ein Formular, kein Schaufenster.
                Gekauft wird eine Seite weiter, wo das Werk gross steht und die Angaben dabei. */}
          </li>
        );
      })}
    </ul>
  );

  /* ── DIE WANDFOTOS SIND RAUS (Owner 18.09.2026: „diese Bilder raus") ────────────────────
     Sie zeigten das Blatt von vor drei Tagen: Kopfzeile „POSTER VIU", Code in der Mitte, Name
     mit Lebensdaten. Seit das Blatt anders aussieht, warben sie für ein Produkt, das es so nicht
     mehr gibt — und die echten Kacheln darunter zeigen es ohnehin besser. */

  const start = (
    <>
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
      {abschnitt(T.teaserWerke, T.tabTextWerke,
        werkBand(kacheln, adr({ ansicht: "werke", s: 1 })),
        adr({ ansicht: "werke", s: 1 }))}
      </div>
    </>
  );

  const feed = ansicht === "start" ? start : (
    <>
      {reiter}
      {einleitung(ansicht === "repro" ? T.tabTextRepro : ansicht === "werke" ? T.tabTextWerke : T.tabTextKuenstler)}
      {ansicht === "werke"
        ? werkRaster(kacheln.slice(von, von + PRO_SEITE))
        : kreisRaster(kuenstlerSortiert.slice(von, von + PRO_SEITE), ansicht === "repro")}
      {blaettern}
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
        <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-14 md:pt-24">
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
        <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-10 md:pt-16">
          <h1 className="m-0 max-w-[720px] font-serif text-[34px] font-normal leading-[1.15] tracking-[-0.01em] md:text-[48px]">{T.titel}</h1>
          <p className="mt-4 max-w-[620px] text-[16px] leading-[1.55] text-[#555]">{T.lead}</p>

          {/**
            * ── DER ANWERBE-KNOPF STEHT WIEDER OBEN UND WIEDER SCHWARZ (Owner 13.09.2026: „wo ist
            * der grosse CTA jetzt Künstlerseite anlegen? Oben schwarz?") ──────────────────────
            *
            * Er hing im `bald`-Zweig und ist mit dem sechsten freigegebenen Künstler von selbst
            * verschwunden — niemand hat das entschieden, `START_AB` hat es getan. Übrig blieb ein
            * dünner Umriss nach 8.594 px (GEMESSEN). Jetzt hängt er an keiner Schwelle mehr.
            *
            * Schmal gehalten, eine Zeile: Diese Seite gehört dem Käufer, der Künstler ist Gast.
            */}
          <a href={bewerben}
            className="mt-6 inline-block bg-[#111] px-7 py-4 text-[16px] font-semibold text-white no-underline hover:bg-[#333]">
            {T.seiteInEinerMinute}
          </a>

          {feed}
        </main>
      )}

      {/* ── ARTIST FAIR: UNSERE HALTUNG, SICHTBAR (Owner 18.09.2026) ──────────────────────────
          „Ich weiss, dass Temu dreist die Kunst kopieren und auf T-Shirts drucken und verkaufen.
          Das soll bei uns nicht sein." · „Dafür wollen wir bekannt werden und schreiben auch in
          unsere Philosophie." · „Alles, was in unserem Shop gekauft wurde, ist Artist Fair."

          Steht VOR dem Journal und nach den Werken: Wer bis hierher gescrollt hat, hat die Kunst
          gesehen und fragt sich, wer wir sind. Der Betrag kommt aus der Drucktabelle, nie
          getippt (Skill `bezahlung`, Regel 2). */}
      <section className="mx-auto w-full max-w-[1120px] border-t border-[#e5e5e5] px-5 pb-16 pt-12">
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
      <section className="mx-auto w-full max-w-[1120px] border-t border-[#e5e5e5] px-5 pb-16 pt-12">
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
        <section className="mx-auto w-full max-w-[1120px] px-5 pb-20">
          <PortalBald B={baldTexte(L)} preis={eur(VERSUSFORGE_ABO_CENTS, L)} bewerben={bewerben} knopf={T.fuerKuenstlerKnopf} />
        </section>
      )}

      <PortalFuss lang={L} />

      {/* Hier ging bis 11.09.2026 der Anmelde-Chat für Künstler von selbst auf (Owner 10.09.2026) — raus (Owner 11.09.2026:
          „soll nicht sein"). Künstler kommen über „Als Künstler bewerben" zu lakatosbandi.com/start. */}
    </div>
  );
}
