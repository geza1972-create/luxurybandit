"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Send, ChevronLeft } from "lucide-react";
import LangSwitch from "@/components/LangSwitch";
import LightSwitch from "@/components/LightSwitch";
import { ThemenKreise } from "@/components/CI";
import GuthabenChip from "@/components/GuthabenChip";
import KontoChip from "@/components/KontoChip";

/**
 * The ONE shared top bar for every page. Left: LB logo + wordmark → home. Right:
 * the CI icon (Share; YouTube/Instagram live im SeitenFuss) by default — pass `actions` to
 * override them (e.g. /stores wires the Search icon to its own search bar).
 *
 * KEIN Hamburger-Menü mehr hier — das Menü lebt appweit UNTEN (BottomNav's
 * Floating-Button). Page-specific chrome (search fields, filter chips, tabs)
 * lives in a SEPARATE row BELOW this bar.
 */
// Ohne „The" (Owner 30.07.2026: „entferne THE"). Neben den drei Symbolen rechts war die
// Zeile zu lang und wurde abgeschnitten — man konnte das Motto nicht lesen.
/**
 * DAS MOTTO — „das Geschenkideen-Portal" (Owner 04.08.2026: „Luxurybandit das Geschenkideen
 * Portal." · „und das sind LuxuryBandit Geschenke alle!!!!!! Wir haben es.").
 *
 * DRITTE FASSUNG, UND DIE ERSTE, DIE DEN AUFTRAG NENNT. Vorher stand hier „Influencer
 * marketplace" (als es um die Vermittlung von Models ging), dann „AI marketplace" (31.07.2026,
 * als der Kunde sein eigenes Video mit seinem eigenen Foto machte). Beide beschrieben die
 * TECHNIK. „Geschenkideen-Portal" beschreibt, wofür jemand herkommt — und das ist seit dem
 * 04.08. die Klammer über allem: Kuss, Hochzeit, Gutschein, Geburtstag, Urlaub, Tanz, Bella
 * und das System sind acht Anlässe EINES Produkts, nämlich eines Geschenks.
 *
 * NICHT ALS SUCHWORT GEDACHT (Konzept §0): „geschenkideen" ist Amazon-Land, dort gewinnt
 * niemand. Das hier ist Marke im Seitenkopf; gesucht wird über die Anlass-Seiten.
 *
 * SIEBEN SPRACHEN, OHNE ARTIKEL. Der Artikel ist bewusst weg — derselbe Grund, aus dem der
 * Owner am 30.07.2026 „entferne THE" sagte: Neben den drei Symbolen rechts ist die Zeile sonst
 * zu lang und wird abgeschnitten (sie steht auf `truncate`).
 *
 * DIE SPRACHE KOMMT AUS DEM KEKS, nicht vom Server: Diese Leiste ist eine Client-Komponente
 * und steht auf jeder Seite, auch auf statischen. Beim allerersten Bild steht deshalb kurz
 * Englisch da — genauso wie beim Sprachumschalter daneben, der es seit jeher so macht.
 */
/**
 * „AI MARKETING PORTAL" STATT „GESCHENKIDEEN-PORTAL" (Owner 15.08.2026: „jetzt wird
 * LuxuryBandit Motto zu AI Marketing Portal").
 *
 * ES BLEIBT IN ALLEN SIEBEN SPRACHEN GLEICH — und das ist kein Versehen: „AI Marketing"
 * ist in jeder dieser Sprachen der gebraeuchliche Begriff, uebersetzt wuerde er nur
 * unbeholfen („Portal de marketing cu inteligenta artificiala"). Dieselbe Regel wie beim
 * Markennamen selbst.
 *
 * Der Vorrat bleibt trotzdem sprachweise stehen: Wer je eine Sprache anders fassen will,
 * aendert eine Zeile statt die Struktur.
 */
const MOTTO: Record<string, string> = {
  en: "AI Marketing Portal",
  de: "AI Marketing Portal",
  ro: "AI Marketing Portal",
  es: "AI Marketing Portal",
  fr: "AI Marketing Portal",
  pt: "AI Marketing Portal",
  it: "AI Marketing Portal",
};

export default function TopNav({
  subtitle,
  actions,
  back = true,
  kreise = true,
}: {
  subtitle?: string;
  actions?: React.ReactNode;          // override the default 3 CI icons
  back?: boolean;                     // Zurück-Pfeil (an, außer man setzt back={false})
  /** Die Themen-Kreise (Geschenke) — AUS auf Flächen, die an Firmen/Personaler gehen
      (Memory `serioeses-portal-umbau`): /firmen zeigt keine Kuss- und Try-on-Kreise. */
  kreise?: boolean;
}) {
  const router = useRouter();
  // ZURÜCK: Regel im Haus — jede Seite braucht einen sichtbaren Rückweg. Auf den Browser-
  // Button ist kein Verlass (In-App-Browser von Instagram/Facebook haben oft keinen).
  // Nur zeigen, wenn es auch etwas zum Zurückgehen gibt (Direktaufruf hat keine Historie).
  /**
   * DER PFEIL FUEHRT NACH HAUSE, NICHT BLIND ZURUECK (Owner 03.08.2026: „wieso komme ich
   * mit einem Backbutton immer zu Models? … Home sollte kommen, die Topic-Seite").
   *
   * `router.back()` folgt der BROWSER-Historie — da steht irgendwann /stores?view=models,
   * und dann landet der Pfeil dort, egal wo man gerade ist. Das ist kein Zurueck mehr,
   * sondern Zufall.
   *
   * Jetzt zaehlt diese Sitzung mit, wie viele Seiten der App schon besucht wurden:
   *   - noch keine (Direkteinstieg, Anzeige, geteilter Link) → Pfeil fuehrt auf /themes,
   *     die Startseite. Das ist immer richtig und nie eine fremde Seite.
   *   - schon navigiert → `router.back()` wie bisher; dann IST das vorige Blatt seins.
   */
  const pathname = usePathname();
  /**
   * NACH HAUSE HEISST JETZT „/" (03.08.2026): Seit die Wurzel die Themen selbst ausliefert
   * (app/page.tsx, vorher eine Weiterleitung), ist sie die echte Startadresse. Wer den Pfeil
   * oder das Logo antippt, soll danach `luxurybandit.com` in der Adresszeile stehen haben —
   * das ist die Adresse, die er weitergibt und die er sich merkt.
   *
   * /themes zeigt dieselbe Seite und bleibt ueberall verlinkt; deshalb gilt sie hier als
   * ZWEITE Heimatadresse: Auf ihr darf ebenso wenig ein Zurueck-Pfeil stehen wie auf „/".
   */
  const HEIM = "/";
  const HEIM_ALT = "/themes";
  const [tiefe, setTiefe] = useState(0);
  useEffect(() => {
    let n = 0;
    try {
      n = Number(sessionStorage.getItem("lb_nav_tiefe") ?? 0) || 0;
      sessionStorage.setItem("lb_nav_tiefe", String(n + 1));
    } catch { /**/ }
    setTiefe(n);
  }, [pathname]);

  /* Das Motto in seiner Sprache — aus demselben Keks, den der Sprachumschalter setzt. */
  const [motto, setMotto] = useState(MOTTO.en);
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|; )lb_lang=([^;]*)/);
      const l = m ? decodeURIComponent(m[1]).slice(0, 2) : "";
      if (l && MOTTO[l]) setMotto(MOTTO[l]);
    } catch { /* kein Keks lesbar: Englisch steht schon da */ }
  }, [pathname]);
  // Auf der Startseite selbst gibt es nichts, wohin der Pfeil fuehren koennte.
  const canBack = pathname !== HEIM && pathname !== HEIM_ALT;
  const zurueck = () => { if (tiefe > 0) router.back(); else router.push(HEIM); };
  const share = () => {
    try {
      const url = window.location.href;
      if (typeof navigator !== "undefined" && navigator.share) { navigator.share({ title: "LuxuryBandit", url }).catch(() => {}); }
      else { navigator.clipboard?.writeText(url).catch(() => {}); }
    } catch { /**/ }
  };
  const iconBtn = "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:text-white";

  // z-50 statt z-30 (Owner 03.08.2026: „share button ist drüber"): Die Knoepfe AUF den
  // Karten (Teilen, Ton, Loeschen) stehen ebenfalls auf z-30 — als spaetere Elemente im
  // Dokument gewannen sie gegen den klebenden Header und schwebten beim Scrollen ueber
  // Guthaben-Chip und Sprachwahl. 50 liegt ueber allem Seiteninhalt und unter allem, was
  // wirklich darueber gehoert: Menue (60/61), BottomNav (70), Dialoge (80–96).
  return (
    <header data-topnav="1" className="sticky top-0 z-50 border-b border-white/10 bg-[#0d0b0a]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
        {back && canBack && (
          <button type="button" onClick={zurueck} aria-label="Back"
            className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 active:scale-90 transition hover:text-white">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {/* Brand → STARTSEITE = "/". Hier stand /themes, weil "/" frueher nur weiterleitete;
            seit die Wurzel die Themen selbst ausliefert, ist der Umweg unnoetig. */}
        <button type="button" onClick={() => router.push(HEIM)} aria-label="Home"
          className="flex min-w-0 items-center gap-2 active:opacity-70 transition-opacity">
          <span className="relative h-9 w-9 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lb-logo.png" alt="LuxuryBandit" className="h-9 w-9 rounded-full object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; const f = e.currentTarget.nextElementSibling as HTMLElement | null; if (f) f.style.display = "flex"; }} />
            <span style={{ display: "none" }} className="absolute inset-0 items-center justify-center rounded-full bg-black text-xs font-black tracking-tight text-white select-none">LB</span>
          </span>
          <span className="min-w-0 text-left">
            <span className="block whitespace-nowrap text-sm font-black uppercase leading-none tracking-widest text-white">LuxuryBandit</span>
            {/* Das MOTTO steht IMMER unter dem Wortmark (Owner-Regel) — ein Seitenname
                kommt allenfalls dahinter, ersetzt es aber nie. */}
            <span className="mt-0.5 block truncate text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-[#f6cf51] sm:text-[10px] sm:tracking-[0.14em]">
              {motto}
            </span>
          </span>
        </button>

        {/* Right: the CI icons (or a page override). No menu button — menu is in the bottom nav.
            Die SPRACHWAHL steht NICHT mehr hier: sie hat auf schmalen Geräten das Wortmark
            überlagert und das Motto abgeschnitten (Owner 28.07.2026) — sie sitzt jetzt in
            einer eigenen Zeile unter dem Header. */}
        <div className="flex shrink-0 items-center gap-2">
          {/* DAS KONTO-ZEICHEN NEBEN DEM TEILEN-KNOPF (Owner 11.08.2026: „Ich will dass du mir
              ein Icon im Header machst zu sehen ob ich eingeloggt bin, mit grüner punkt. Dann
              wenn ich dort klicke dann kann ich mich abmelden oden anmelden." · „neben dem
              Share Button").
              ES STEHT AUSSERHALB VON `actions` und damit auf JEDER Seite — auch auf denen,
              die sich die Symbole hier selbst setzen (etwa /stores mit seiner Suche). Ein
              Anzeiger, den es nur auf manchen Seiten gibt, beantwortet die Frage „bin ich
              angemeldet?" nicht; genau daran hing der Fehler, den er gesehen hat.
              Die Gestalt kommt aus der Bibliothek (`SymbolKnopf`) — der `iconBtn`-Stil daneben
              bleibt unangetastet. */}
          <KontoChip />
          {actions ?? (
            <>
              {/* DIE SUCHE IST INS MENUE GEZOGEN (Owner 31.07.2026: „man kann den Namen
                  nicht lesen. Vielleicht die Suche im Menü").
                  Vier Symbole neben dem Wortmark liessen fuer „LUXURYBANDIT" zu wenig Platz —
                  der Name ist das eine, was auf jeder Seite lesbar sein MUSS. Verloren geht
                  nichts: Das Menue fuehrt mit „Models" auf dieselbe Seite, und zwar fuer
                  jeden, nicht nur fuer Personal. */
              }
              {/* KEIN TEILEN IM TUNNEL (Owner 13.08.2026: „ja, teilen raus" — Master-Auftrag
                  §21: keine Ablenkung im Funnel; es gibt dort auch noch nichts zu teilen).
                  EINMAL hier am Pfad erkannt statt je Tunnel-Seite ein Prop — die sieben
                  /themes/<produkt>/start-Adressen sind das eine Muster. Header, Konto und
                  Guthaben bleiben: sie sind Ausgang und Status, kein Schaufenster (§18:
                  „LuxuryBandit muss sichtbar bleiben"). */}
              {!/^\/themes\/[^/]+\/start\/?$/.test(pathname ?? "") && (
                <button type="button" onClick={share} className={iconBtn} aria-label="Share">
                  <Send className="h-4 w-4" />
                </button>
              )}
              {/* YOUTUBE UND INSTAGRAM SIND IN DEN FUSS GEZOGEN (Owner 06.08.2026:
                  „instagram und you tube icon in dem footer" · „oben raus"). Oben bleibt
                  nur der Teilen-Pfeil — mehr Luft für den Namen; die Kanäle stehen jetzt
                  in `SeitenFuss` auf jeder Seite. */}
            </>
          )}
        </div>
      </div>
      {/* Eigene, ruhige Zeile für die Sprache — rechtsbündig, damit Logo und Motto
          darüber ungestört bleiben. */}
      {/* Eigene Zeile, mit Kennzeichnung: In der Anzeigen-Fassung (.lb-fb) rutscht sie per
          CSS UNTER die blaue Leiste (Owner 30.07.2026: „die Sprachen schiebst du mir unter
          dem Header"). Sonst bleibt alles wie bisher. */}
      {/* GUTHABEN LINKS, SPRACHE RECHTS (Owner 03.08.2026: „könnte das Guthaben im Header
          stehen? … mit Icon bitte"). Der Chip zeigt sich nur, wenn wir die Adresse kennen —
          siehe GuthabenChip. `justify-between` statt `justify-end`: ohne Chip rückt die
          Sprache dank des leeren ersten Kinds trotzdem nach rechts. */}
      <div data-langrow="1" className="mx-auto flex max-w-6xl items-center justify-between px-4 pb-2">
        {/* Der Span steht IMMER — rendert der Chip nichts, bleibt er leer, und
            `justify-between` schiebt die Sprache weiter nach rechts wie bisher. */}
        {/* DAS KONTO-ZEICHEN STEHT NICHT HIER, sondern oben neben dem Teilen-Knopf (Owner
            11.08.2026: „neben dem Share Button"). Gemessen am selben Tag: Diese Zeile ist auf
            375 px voll — Guthaben (84) + Galerie (86) + Hell/Dunkel (35) + Sprache (88) plus
            Abstände füllen die 343 verfügbaren Pixel restlos aus. Ein 26 Pixel breites
            Zeichen dazwischen brach dem Guthaben „0,00 €" in zwei Zeilen. Wer hier je etwas
            hinzufügen will, muss also zuerst etwas anderes wegnehmen. */}
        <span><GuthabenChip /></span>
        {/* HELL/DUNKEL STEHT IMMER HIER (Owner 06.08.2026: „der light und dark shalter muss
            immer da sein im header").
            Bisher hängte ihn jede Seite selbst ein — per Portal im Kuss-Trichter, als
            eigener Baustein auf der Plan-Seite, von Hand im Seiteninhalt auf der Muster-
            Seite. Ergebnis: Auf den meisten Seiten gab es ihn gar nicht, und wo es ihn gab,
            an drei verschiedenen Stellen. Jetzt trägt ihn die Kopfzeile selbst, also jede
            Seite mit Kopfzeile.
            LINKS von der Sprache, weil deren Menü nach rechts aufklappt und sonst aus dem
            Bild liefe. */}
        <span className="flex items-center gap-2">
          <LightSwitch />
          <LangSwitch />
        </span>
      </div>
      {/**
        * DIE THEMEN-LEISTE STEHT IM KOPF, ALSO UEBERALL (Owner 15.08.2026: „Slider ueberall
        * einbauen").
        *
        * WARUM HIER und nicht in jeder Seite: `TopNav` liegt auf 43 Seiten. Neunmal
        * einbauen hiesse, sie neunmal zu pflegen — dieselbe Falle, aus der wir den
        * Kassen-Weg heute schon herausgeholt haben. Hier ist sie einmal da, und die Regel
        * „aendern heisst ueberall aendern" gilt von selbst.
        *
        * UND SIE SCHLIESST DIE TAB-LUECKE: Die Reiter fuehren auf Themenseiten. Standen sie
        * nur im Tunnel, landete ein Tipp auf einer Seite OHNE Leiste — man kam nicht zurueck,
        * genau wie der Owner es erlebt hat. Im Kopf ist die Leiste immer da.
        *
        * SIE SCROLLT MIT DEM KOPF (`sticky`), weil sie ein Teil von ihm ist: Wer unten auf
        * einer langen Seite steht, wechselt das Thema ohne hochzuscrollen.
        */}
      {kreise && (
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <ThemenKreise />
        </div>
      )}
    </header>
  );
}
