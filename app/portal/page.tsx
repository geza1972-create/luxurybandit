import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { kuenstlerListe, imPortalSichtbar, portalPfade, werkKacheln } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalReiter from "@/components/PortalReiter";
import PortalBald from "@/components/PortalBald";
import PortalFuss from "@/components/PortalFuss";
import { ARTIKEL, JOURNAL_UI, type JournalSprache } from "@/lib/lakatosbandi-journal";
import { baldTexte } from "@/lib/lakatosbandi-bald-texte";
import { eur, VERSUSFORGE_ABO_CENTS } from "@/lib/pricing";
import { preisSatz, preisText } from "@/lib/lakatosbandi-preis";
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

export const metadata: Metadata = {
  title: "lakatosbandi.com — Marketing for Art",
  description: "The marketing platform for artists: ads for every work with the sentence that explains what makes it rare — and an agent that talks to buyers for you.",
  alternates: { canonical: "https://lakatosbandi.com/" },
  openGraph: { title: "lakatosbandi.com — Marketing for Art", type: "website", url: "https://lakatosbandi.com/" },
};

export default async function PortalStart({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const L = portalSprache(sp.lang, await resolveLang("en"));
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
  const ansicht = sp.ansicht === "kuenstler" ? "kuenstler" : "werke";
  /* Künstler in derselben Ordnung wie die Werke: der zuletzt angelegte zuerst. */
  const kuenstlerSortiert = [...kuenstler]
    .sort((a, b) => (Date.parse(b.angelegt ?? "") || 0) - (Date.parse(a.angelegt ?? "") || 0));
  const gesamt = ansicht === "kuenstler" ? kuenstlerSortiert.length : kacheln.length;
  const seiten = Math.max(1, Math.ceil(gesamt / PRO_SEITE));
  /* Eine erfundene Seitenzahl (`?s=99`) führt auf die letzte Seite statt ins Leere. */
  const seite = Math.min(Math.max(1, Math.round(Number(sp.s)) || 1), seiten);
  const von = (seite - 1) * PRO_SEITE;

  /* Sprache und Ansicht müssen jeden Link überleben — sonst wirft die zweite Seite den Besucher
     zurück auf Englisch und in die Werke-Ansicht. */
  const adr = (o: { ansicht?: string; s?: number }) => {
    const p = new URLSearchParams();
    if (sp.lang) p.set("lang", String(sp.lang));
    if ((o.ansicht ?? ansicht) === "kuenstler") p.set("ansicht", "kuenstler");
    if ((o.s ?? seite) > 1) p.set("s", String(o.s ?? seite));
    const q = p.toString();
    return q ? `${P.start}?${q}` : P.start;
  };

  const reiter = (
    <PortalReiter reiter={[
      { label: T.tabWerke, href: adr({ ansicht: "werke", s: 1 }), aktiv: ansicht === "werke" },
      { label: T.tabKuenstler, href: adr({ ansicht: "kuenstler", s: 1 }), aktiv: ansicht === "kuenstler" },
    ]} />
  );

  /* ENGER ALS VORHER (Owner: „die müssen kleiner werden und mehrere Spalten … auf mobile auch 2 3
     Spalten"): 2 Spalten am Handy, 3 ab sm, 4 ab lg. Die Abstände schrumpfen mit — mit den alten
     32 px blieben am Handy nur 151 px je Kachel. */
  const RASTER = "mt-6 grid list-none grid-cols-2 gap-x-3 gap-y-8 p-0 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4";

  const raster = (
    <ul className={RASTER}>
      {kacheln.slice(von, von + PRO_SEITE).map(({ m, k }) => (
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
  const kuenstlerRaster = (
    <ul className={RASTER}>
      {kuenstlerSortiert.slice(von, von + PRO_SEITE).map(m => {
        const w = werkKacheln(m, L);
        return (
          <li key={m.kennung}>
            <Link href={P.kuenstler(m.kennung)} className="group block text-inherit no-underline">
              <div className="flex aspect-square items-center justify-center bg-[#f5f5f5]">
                {w[0] && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={P.werkBild(m.kennung, w[0].i)} alt={m.name} loading="lazy"
                    className="max-h-full max-w-full object-contain" />
                )}
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

  const feed = (
    <>
      {reiter}
      {ansicht === "kuenstler" ? kuenstlerRaster : raster}
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
