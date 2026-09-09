import crypto from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, Settings, Phone, Mail, ChevronRight, Lock, Image as ImageIcon } from "lucide-react";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { leadsLesen, type LeadEintrag } from "@/lib/versusforge-lead";
import { trichterZaehlen, type Trichterzahl } from "@/lib/versusforge-schritt";
import { eur, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import MandantKaufen from "@/components/MandantKaufen";
import { VF_ANFRAGEN_OFFEN } from "@/lib/versusforge-schalter";
import { dashboardTexteInSprache, type DashboardTexte } from "@/lib/dashboard-texte";
import { metaSchritteInSprache } from "@/lib/versusforge-meta-anleitung";
import MandantEinrichten from "@/components/MandantEinrichten";
import AnfrageMenue from "@/components/AnfrageMenue";
import MandantHooks from "@/components/MandantHooks";
import MandantZugang from "@/components/MandantZugang";
import { Wortmarke } from "@/components/VersusForgeMarke";

/**
 * DAS DASHBOARD — „WO SIND MEINE KUNDEN?" (Owner 09.09.2026: „sie werden danach fragen, wo
 * sind meine Kunden? Die sind auf deinem Dashboard. Willst du sie sehen? Dann musst du das
 * Dashboard zahlen").
 *
 * ── ZWEITER ANLAUF (Owner 09.09.2026: „mach diese Seite richtig gut, es ist layoutmässig
 * wie 1989" · „hast du schon mal ein Dashboard gesehen?") ─────────────────────────────────
 *
 * Der erste Anlauf war eine Seite mit einem Formular darauf. Ein Dashboard ist etwas
 * anderes, und der Unterschied ist nicht Schmuck, sondern Bauart:
 *
 *  · EIN GERÜST, DAS BLEIBT: Kopfleiste mit Namen und Zustand, eine Navigation, daneben die
 *    Fläche, die wechselt. Wer einmal weiss, wo er ist, findet sich beim zweiten Besuch
 *    ohne Suchen zurecht.
 *  · DER ZUSTAND STEHT OBEN, IMMER SICHTBAR: läuft der Trichter oder nicht. Das ist die
 *    eine Frage, die jeden Besuch beginnt.
 *  · KENNZAHLEN VOR DER LISTE: wie viele, wie viele neu, wann zuletzt. Erst danach die
 *    Einzelfälle.
 *  · GRAUER GRUND, WEISSE KARTEN. Auf weissem Grund schwimmen Karten; der graue Grund macht
 *    aus Abschnitten Flächen — der Unterschied zwischen einem Dokument und einer Oberfläche.
 *
 * DIE ANSICHT STEHT IN DER ADRESSE (`?ansicht=`), nicht in einem Merker im Browser: Die
 * Seite ist ohnehin serverseitig, der Schlüssel steht schon in der Adresse, und so lässt
 * sich jede Ansicht verlinken und neu laden, ohne dass etwas verloren geht.
 *
 * DER SCHLÜSSEL IST DIE TÜR. Er steht in seiner Mail. Kein Konto, kein Passwort — dieselbe
 * Entscheidung wie überall, wo ein Mensch genau eine Sache verwaltet.
 *
 * `noindex`: Hier stehen Namen und Telefonnummern fremder Menschen.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

function schluesselStimmt(soll: string, ist: string): boolean {
  if (!soll || !ist) return false;
  const a = Buffer.from(soll, "utf8");
  const b = Buffer.from(ist, "utf8");
  if (a.length !== b.length) return false;
  try { return crypto.timingSafeEqual(a, b); } catch { return false; }
}

/** „vor 3 Stunden" liest sich schneller als ein Zeitstempel — und darum geht es hier. */
function seither(iso: string, T: DashboardTexte): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 2) return T.geradeEben;
  if (min < 60) return T.vorMinuten.replace("{n}", String(min));
  const std = Math.round(min / 60);
  if (std < 24) return T.vorStunden.replace("{n}", String(std));
  const tage = Math.round(std / 24);
  /* EINZAHL UND MEHRZAHL SIND ZWEI SÄTZE, keine angehängte Endung: „vor 1 Tagen" fällt in
     der eigenen Sprache nicht auf und in jeder fremden sofort. */
  return tage === 1 ? T.vorEinemTag : T.vorTagen.replace("{n}", String(tage));
}

const KARTE = "rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,24,28,.06),0_8px_28px_rgba(20,24,28,.07)]";

export default async function MandantDashboard({ params, searchParams }: {
  params: Promise<{ mandant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { mandant } = await params;
  const sp = await searchParams;
  const einer = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");
  const k = einer(sp.k);
  const gewuenscht = einer(sp.ansicht);
  const ansicht: "uebersicht" | "hooks" | "einstellungen" =
    gewuenscht === "einstellungen" ? "einstellungen" : gewuenscht === "hooks" ? "hooks" : "uebersicht";

  const m = await mandantLesen(mandant);

  /**
   * EIN FALSCHER SCHLÜSSEL SIEHT AUS WIE EIN FEHLENDER TRICHTER — dieselbe Seite, derselbe
   * Satz. Sonst verrät die Antwort, welche Namen vergeben sind, und wer Namen kennt, kann
   * gezielt raten.
   */
  if (!m || !schluesselStimmt(m.schluessel, k)) {
    return (
      <main className="lb-mandant lb-dashboard grid min-h-[100dvh] place-items-center bg-[#f5f7f9] px-5 text-[#14181c]">
        <div className={`${KARTE} w-full max-w-[440px] p-7`}>
          <Wortmarke className="text-[19px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
          <h1 className="mt-6 text-[24px] font-extrabold leading-[1.2] tracking-[-0.02em]">
            Dieser Zugang stimmt nicht.
          </h1>
          <p className="mt-3 text-[15.5px] leading-[1.55] text-[#5b666f]">
            Den Link zu deinem Dashboard haben wir dir per E-Mail geschickt — er trägt einen
            Schlüssel am Ende. Ohne ihn öffnet sich diese Seite nicht.
          </p>
        </div>
      </main>
    );
  }

  const bereit = !!m.impressumUrl && !!m.datenschutzUrl;
  /**
   * ZWEI SCHLÖSSER, UND SIE HÄNGEN AN VERSCHIEDENEN DINGEN — das ist der ganze Verkauf.
   *
   *  · EINSTELLUNGEN gehen mit dem Schlüssel, immer. Eine öffentliche Seite, die Namen und
   *    Telefonnummern annimmt, braucht ein Impressum; das hinter eine Kasse zu stellen
   *    hiesse, ihn dafür zahlen zu lassen, dass seine Seite rechtmässig ist.
   *  · LESEN kostet 299 € (`stand === "scharf"`). Bis dahin sieht er die ZAHLEN, nicht die
   *    Namen. Genau das ist die Frage, die verkauft: „Wo sind meine Kunden?"
   */
  const bezahlt = m.stand === "scharf";
  const [anfragen, messung] = await Promise.all([leadsLesen(mandant, 200), trichterZaehlen(mandant)]);

  /**
   * ── WELCHE ANFRAGE OFFEN IST (Owner 09.09.2026) ─────────────────────────────────────────
   *
   * SEINE EIGENEN TESTLÄUFE SIND IMMER OFFEN und zählen nicht mit („er wird es selber testen
   * wollen"). Sonst wäre sein Test die eine freie Anfrage — und die erste ECHTE, die vom
   * Freund oder aus seinem Facebook-Beitrag, stünde schon hinter dem Schloss. Genau der
   * Moment, der verkauft, wäre verdeckt.
   *
   * VON DEN FREMDEN SIND DIE ÄLTESTEN OFFEN. `leadsLesen` liefert die neuesten zuerst, also
   * stehen die ältesten am ENDE der Liste. Offen ist die, die er als Erstes bekommen und
   * wahrscheinlich schon angerufen hat — sie ihm nachträglich wegzunehmen wäre ein Rückschritt.
   */
  /* SEIN DASHBOARD IN SEINER SPRACHE (Owner 09.09.2026: „auf keinen Fall" — auf meinen
     Vorschlag, es deutsch zu lassen). Begründung in lib/dashboard-texte.ts. */
  const T = await dashboardTexteInSprache(m.sprache);
  /* Dieselben zehn Schritte wie in seiner Mail — eine Quelle, zwei Orte. */
  const schritte = await metaSchritteInSprache(m.sprache ?? "de");

  const fremde = anfragen.filter(a => !a.eigen);
  const offeneDateien = new Set(fremde.slice(-VF_ANFRAGEN_OFFEN).map(a => a.datei));

  const woche = Date.now() - 7 * 24 * 3600 * 1000;
  const neu = anfragen.filter(a => Date.parse(a.zeit) > woche).length;
  const zuletzt = anfragen[0]?.zeit ? seither(anfragen[0].zeit, T) : "—";

  const basis = `/versusforge/${encodeURIComponent(mandant)}`;
  const mitK = (a: string) => `${basis}/dashboard?k=${encodeURIComponent(k)}${a ? `&ansicht=${a}` : ""}`;
  const planHook = String((m.plan as { hook?: string } | null | undefined)?.hook ?? "").trim();
  const eigeneHooks = Array.isArray(m.hooks) ? m.hooks : [];
  const bilder = eigeneHooks.length + (planHook ? 1 : 0);

  return (
    /* `lb-mandant` blendet Hausleiste und Cookie-Band aus (globals.css). Ein Kunde, der
       seine Anfragen liest, hat auf dieser Seite nichts mit Kuss-Videos zu tun. */
    <div className="lb-mandant lb-dashboard min-h-[100dvh] bg-[#f5f7f9] text-[#14181c]">
      {/* ── KOPFLEISTE: WER, WAS, IN WELCHEM ZUSTAND ── */}
      <header className="sticky top-0 z-20 border-b border-[#e4e9ee] bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
          <Wortmarke className="text-[19px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
          <span aria-hidden="true" className="hidden text-[#d5dce2] md:inline">|</span>
          <span className="truncate text-[15.5px] font-bold tracking-[-0.01em]">{m.name}</span>
          {/**
            * DER ZUSTAND ALS CHIP, NICHT ALS SATZ. Er steht in jeder Ansicht oben und
            * beantwortet die Frage, mit der jeder Besuch anfängt: nimmt meine Seite gerade
            * Anfragen an? Umrandung statt Füllung — ein gefüllter Chip sähe aus wie ein
            * Knopf (CI-Regel).
            */}
          <span className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1 text-[13.5px] font-black ${
            bereit
              ? "border-[#1a7f4b]/35 bg-[#eefaf1] text-[#1a7f4b]"
              : "border-[#c02626]/35 bg-[#fdf2f2] text-[#c02626]"}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${bereit ? "bg-[#1a7f4b]" : "bg-[#c02626]"}`} />
            {bereit ? T.laeuft : T.ausgeschaltet}
          </span>
        </div>
      </header>

      {/**
        * DIE SEITENLEISTE KOMMT ERST AB 1024 px (Owner 09.09.2026, mit Bild: „wie sieht aus,
        * kaputt").
        *
        * Sie stand auf `md` (768 px) und nahm dort 220 px plus Abstand — für den Inhalt
        * blieben keine 500 px, und darin sollten vier Kennzahlen nebeneinander stehen. Aus
        * „Besucher · 30 Tage" wurde eine Spalte aus Einzelwörtern.
        *
        * DIE REGEL DAHINTER: Ein Umbruchpunkt gilt nicht für ein Element, sondern für das,
        * was danach übrig bleibt. Wer nur die Leiste betrachtet, setzt ihn zu früh.
        */}
      <div className="mx-auto grid w-full max-w-[1080px] gap-6 px-5 py-6 lg:grid-cols-[220px_1fr] lg:py-8">
        {/* ── NAVIGATION: links am Rechner, als Reihe am Handy ── */}
        <nav className="flex gap-2 overflow-x-auto lg:sticky lg:top-[76px] lg:h-fit lg:flex-col lg:overflow-visible lb-wisch">
          {/* „ÜBERSICHT", NICHT „ANFRAGEN" (Owner 09.09.2026: „der Tab heisst doch nicht
              Anfragen, das sind doch alle"). Hier stehen Kennzahlen, die Abbruch-Leiter UND
              die Liste — der Reiter trug den Namen seines untersten Drittels. Die Zahl
              daneben bleibt die der Anfragen: Sie ist das, wonach er sucht. */}
          <Reiter href={mitK("")} aktiv={ansicht === "uebersicht"} icon={<LayoutDashboard className="h-[18px] w-[18px]" />}
            wort={T.uebersicht} zahl={anfragen.length} />
          {/* HOOKS (Owner 09.09.2026: „ich brauche noch einen Punkt für Hooks, dort sehe ich
              meine Bilder, dort kann ich weitere generieren"). Zwischen Übersicht und
              Einstellungen: Es ist Arbeit am Produkt, keine Verwaltung. */}
          <Reiter href={mitK("hooks")} aktiv={ansicht === "hooks"} icon={<ImageIcon className="h-[18px] w-[18px]" />}
            wort={T.hooks} zahl={bilder} />
          <Reiter href={mitK("einstellungen")} aktiv={ansicht === "einstellungen"} icon={<Settings className="h-[18px] w-[18px]" />}
            wort={T.einstellungen} warnung={!bereit} />
          {/* HIER STANDEN „Dein Trichter" UND „Deine Anzeige" ALS REITER (Owner 09.09.2026:
              „das ist doch Unsinn, ein extra Tab für die Weiterleitung").
              Er hat recht: Ein Reiter wechselt die Fläche, ein Link führt weg — beide sahen
              gleich aus und taten Verschiedenes. Die Adressen stehen jetzt dort, wo sie
              hingehören: unter Einstellungen, mit Kopieren-Knopf. */}
        </nav>

        <main className="min-w-0">
          {/* ── DER RIEGEL: er steht über allem, solange der Trichter aus ist ── */}
          {!bereit && ansicht === "uebersicht" && (
            <div className={`${KARTE} mb-5 border-l-4 border-l-[#c02626] p-5`}>
              <h2 className="m-0 text-[17px] font-extrabold tracking-[-0.01em]">{T.riegelTitel}</h2>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#5b666f]">{T.riegelText}</p>
              <Link href={mitK("einstellungen")}
                className="mt-4 inline-block rounded-xl bg-[#1d6fd0] px-6 py-3 text-[15.5px] font-extrabold text-white transition active:scale-[.99]">
                {T.riegelKnopf}
              </Link>
            </div>
          )}

          {ansicht === "hooks" ? (
            <MandantHooks mandant={mandant} k={k} planHook={planHook} hooks={eigeneHooks} T={T} hatMotiv={!!m.motivPfad} />
          ) : ansicht === "einstellungen" ? (
            <>
            <MandantEinrichten
              mandant={mandant}
              k={k}
              name={m.name}
              trichterUrl={basis}
              start={{
                mail: m.mail ?? "",
                adresse: m.adresse ?? "",
                telefon: m.telefon ?? "",
                webUrl: m.webUrl ?? "",
                impressumUrl: m.impressumUrl ?? "",
                datenschutzUrl: m.datenschutzUrl ?? "",
              }}
              T={T}
            />
            {/* DER ZUGANG steht unter denselben Einstellungen, direkt unter den Angaben. */}
            <div className="mt-5">
              <MandantZugang
                trichterUrl={`https://versusforge.com/${mandant}`}
                anzeigeUrl={`https://versusforge.com/${mandant}/anzeige`}
                dashboardUrl={`https://versusforge.com/${mandant}/dashboard?k=${k}`}
                schluessel={m.schluessel}
                T={T}
              />
            </div>
            </>
          ) : (
            <>
              {/* ── KENNZAHLEN: vier, nicht acht. Was man nicht liest, verdeckt nur. ── */}
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <Zahl wert={String(messung.besucher)} label={T.besucher} zusatz={T.tage30} />
                <Zahl wert={String(anfragen.length)} label={T.anfragen} />
                <Zahl wert={String(neu)} label={T.neu} zusatz={T.tage7} />
                <Zahl wert={zuletzt} label={T.zuletzt} klein />
              </div>

              {/* ── WO SIE ABSPRINGEN ── */}
              <Leiter leiter={messung.leiter} besucher={messung.besucher} T={T} />

              <section className={`${KARTE} mt-5 p-6 md:p-7`}>
                <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">
                  {anfragen.length === 0 ? T.keineAnfragen : T.deineAnfragen}
                </h2>

                {anfragen.length === 0 ? (
                  /* EINE LEERE LISTE MUSS SAGEN, WARUM SIE LEER IST. */
                  <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
                    {bereit ? T.wartetLeer : T.wartetAus}
                  </p>
                ) : (
                  <>
                  {/**
                    * ── DIE LISTE STEHT IMMER DA (Owner 09.09.2026: „er sieht aber auf seinem
                    * Dashboard bloss nicht, wer die Anfrage gemacht hat") ────────────────────
                    *
                    * VORHER STAND HIER STATT DER LISTE EIN SCHLOSS mit einer Zahl. Wer nicht
                    * bezahlt hatte, sah seine Anfragen überhaupt nicht — nur, dass es welche
                    * gibt. Auf die Frage „zahlt er, ohne zu sehen, was er bekommt?" war die
                    * Antwort: ja.
                    *
                    * JETZT SIEHT ER ALLES AUSSER DEM NAMEN UND DER NUMMER. Was der Mensch
                    * gesagt hat, wann er da war, wie viele es sind — das ist der Beweis, dass
                    * der Trichter arbeitet. Verschlossen ist nur, WER es war, und genau das
                    * ist das Produkt.
                    */}
                  {!bezahlt && fremde.length > VF_ANFRAGEN_OFFEN && (
                  <div className="mt-4 rounded-xl bg-[#eaf2fc] p-5">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#1d6fd0]" aria-hidden />
                      <div className="min-w-0">
                        <p className="m-0 text-[17px] font-extrabold tracking-[-0.01em]">
                          {fremde.length - VF_ANFRAGEN_OFFEN === 1
                            ? T.eineWartet
                            : T.vieleWarten.replace("{n}", String(fremde.length - VF_ANFRAGEN_OFFEN))}
                        </p>
                        <p className="mt-2 text-[15px] leading-[1.5] text-[#5b666f]">{T.ersteOffen.replace("{frei}", String(VF_ANFRAGEN_OFFEN))}</p>
                        {/**
                          * JETZT GIBT ES DIE KASSE (Owner 09.09.2026: „wie soll ich den
                          * scharf schalten, wenn der Kunde am Ende nichts kaufen kann?").
                          *
                          * Hier stand „schreib uns, dann schalten wir frei" — und das war
                          * ehrlich, solange es keinen Kaufweg gab. Es war aber auch die
                          * Stelle, an der jemand entschlossen war zu zahlen und stattdessen
                          * ein Formular bekam. Der Knopf steht genau dort, wo die Zahl der
                          * verschlossenen Anfragen steht: Das ist der Moment.
                          */}
                        <p className="mt-3.5 text-[15px] leading-[1.5]">
                          {T.preisZeile.replace("{preis}", eur(VERSUSFORGE_START_CENTS, m.sprache))}
                        </p>
                        <MandantKaufen
                          mandant={mandant}
                          k={k}
                          wort={T.freischalten.replace("{preis}", eur(VERSUSFORGE_START_CENTS, m.sprache))}
                          klasse="mt-3.5 inline-block rounded-xl bg-[#1d6fd0] px-6 py-3.5 text-[16px] font-extrabold text-white transition active:scale-[.99] disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Die ÄLTESTEN sind offen: Die erste Anfrage ist die, die er schon
                      angerufen hat — ihm die wegzunehmen wäre ein Rückschritt. */}
                  <ul className="mt-5 flex list-none flex-col gap-3 p-0">
                    {/**
                      * ── WAS VERSCHLOSSEN IST, WIRD GAR NICHT ERST ÜBERGEBEN (09.09.2026,
                      * in der eigenen Gegenprobe gefunden) ────────────────────────────────
                      *
                      * Vorher bekam die Karte die ganze Anfrage (`a={a}`) und entschied dann
                      * selbst, was sie anzeigt. Das sah richtig aus und war falsch: Der
                      * vollständige Eintrag — Name, Telefonnummer, alles — stand danach im
                      * Quelltext der Seite, weil die Eigenschaften eines Bauteils dort
                      * mitgeliefert werden. Wer die Seite ansieht, findet ihn.
                      *
                      * JETZT ENTSCHEIDET DER SERVER, WAS ÜBERHAUPT MITGEHT. Bei einer
                      * verschlossenen Anfrage bekommt die Karte keinen Namen und keine
                      * Nummer — es gibt sie dort nicht.
                      */}
                    {anfragen.map(a => {
                      const offen = bezahlt || !!a.eigen || offeneDateien.has(a.datei);
                      const wert = (f: string) => (a.runden ?? []).find(r => r.frage === f)?.antwort?.trim() ?? "";
                      return (
                        <Anfrage
                          key={a.datei}
                          zeit={a.zeit}
                          eigen={!!a.eigen}
                          offen={offen}
                          name={offen ? wert("Name") : ""}
                          telefon={offen ? wert("Telefon") : ""}
                          mail={offen ? String(a.mail ?? "").trim() : ""}
                          gespraech={(a.runden ?? []).filter(r => r.frage !== "Name" && r.frage !== "Telefon")}
                          T={T}
                        />
                      );
                    })}
                  </ul>
                  </>
                )}
              </section>

              {/**
                * ── DIE BERATUNG STEHT DA, WO ER STOCKT (Owner 09.09.2026: „ich glaube ehrlich
                * gesagt nicht, dass jemand das kauft ohne Beratung. Das müssen wir ihm ebenso
                * auf seinem Dashboard anbieten, so wie in der E-Mail") ─────────────────────
                *
                * IN DER MAIL STAND SIE SCHON, HIER FEHLTE SIE — und das ist die falsche
                * Reihenfolge: Die Mail liest er einmal, das Dashboard öffnet er bei jeder
                * Anfrage. Genau hier sitzt er, wenn er nicht weiterkommt.
                *
                * UNTEN, NICHT OBEN: Wer es selbst schafft, soll es zuerst versuchen. Wer
                * scheitert, findet den Satz genau dort, wo er aufhört zu scrollen.
                */}
              {/**
                * ── DIE ANLEITUNG, ZUGEKLAPPT (Owner 09.09.2026: „wir müssen ihm Hilfe bei
                * Facebook einrichten helfen. Wenn er das noch nie gemacht hat, wird er es
                * nicht wissen") ───────────────────────────────────────────────────────────
                *
                * `details` statt eines eigenen Zustands: Es klappt ohne eine Zeile Code auf,
                * funktioniert ohne Javascript und ist mit der Tastatur bedienbar. Ein
                * Aufklapper, den man selbst baut, ist an dieser Stelle nur mehr Fehler.
                */}
              <section className={`${KARTE} mt-5 p-6 md:p-7`}>
                <details>
                  <summary className="cursor-pointer list-none">
                    <span className="text-[19px] font-extrabold tracking-[-0.02em]">{T.anleitungTitel}</span>
                    <span className="mt-1.5 block text-[15px] leading-[1.5] text-[#5b666f]">{T.anleitungFein}</span>
                    <span className="mt-2.5 inline-block text-[14.5px] font-bold text-[#1d6fd0]">{T.anleitungOeffnen}</span>
                  </summary>
                  <ol className="mt-4 flex list-none flex-col gap-3.5 p-0">
                    {schritte.map(([titel, text], i) => (
                      <li key={titel} className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eaf2fc] text-[13px] font-black text-[#1d6fd0]">
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <b className="text-[15.5px]">{titel}</b>
                          {/* Der Text enthält an einer Stelle ein <b> aus der Quelle — es
                              benennt Metas eigenes Menüwort und darf nicht verlorengehen. */}
                          <span className="mt-0.5 block text-[15px] leading-[1.5] text-[#5b666f]"
                            dangerouslySetInnerHTML={{ __html: text }} />
                        </span>
                      </li>
                    ))}
                  </ol>
                </details>
              </section>

              <section className={`${KARTE} mt-5 p-6 md:p-7`}>
                <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">{T.beratungTitel}</h2>
                <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">{T.beratungText}</p>
                {/* KONTAKT NUR ÜBER /contact, nie eine Adresse im Klartext
                    ([[keine-email-adresse-auf-der-seite]]). */}
                <a href="/contact?reason=versusforge"
                  className="mt-4 inline-block rounded-xl border-[1.5px] border-[#dfe4e9] px-6 py-3 text-[15.5px] font-extrabold text-[#14181c] transition hover:border-[#1d6fd0] hover:text-[#1d6fd0]">
                  {T.beratungKnopf}
                </a>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/** Ein Reiter der Navigation. Aktiv wechselt die FARBE, nicht die Grösse (CI-Regel). */
function Reiter({ href, aktiv, icon, wort, zahl, warnung = false }: {
  href: string; aktiv: boolean; icon: React.ReactNode; wort: string; zahl?: number; warnung?: boolean;
}) {
  return (
    <Link href={href}
      className={`flex shrink-0 items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-2.5 text-[15px] font-bold transition lg:w-full ${
        aktiv
          ? "border-[#1d6fd0] bg-[#eaf2fc] text-[#1d6fd0]"
          : "border-transparent bg-white text-[#5b666f] hover:text-[#14181c]"}`}>
      {icon}
      <span className="whitespace-nowrap">{wort}</span>
      {typeof zahl === "number" && zahl > 0 && (
        <span className="ml-auto rounded-full bg-[#e8edf2] px-2 py-0.5 text-[13.5px] font-black text-[#5b666f]">{zahl}</span>
      )}
      {warnung && <span aria-label="fehlt" className="ml-auto h-2 w-2 shrink-0 rounded-full bg-[#c02626]" />}
    </Link>
  );
}

/**
 * Eine Kennzahl. Vier davon, mehr nicht — was man nicht liest, verdeckt nur.
 *
 * DER ZEITRAUM STEHT IN EINER EIGENEN ZEILE, nicht mit einem Mittelpunkt angehängt: „Besucher
 * · 30 Tage" umbricht in einer schmalen Karte an der falschen Stelle und wird zu einer Spalte
 * aus Einzelwörtern (09.09.2026 im Bild des Owners gesehen). Zwei Zeilen brechen nicht.
 *
 * `whitespace-nowrap` an der Zahl: „vor 21 Std." ist ein Wert, kein Satz — er wird kleiner,
 * bevor er umbricht.
 */
function Zahl({ wert, label, zusatz, klein = false }: {
  wert: string; label: string; zusatz?: string; klein?: boolean;
}) {
  return (
    <div className={`${KARTE} min-w-0 px-4 py-4`}>
      <div className={`truncate whitespace-nowrap font-extrabold tracking-[-0.03em] ${
        klein ? "text-[17px] leading-[1.3]" : "text-[30px] leading-none"}`}>
        {wert}
      </div>
      <div className="mt-1.5 truncate text-[13.5px] font-bold text-[#8b959d]">{label}</div>
      {zusatz && <div className="truncate text-[13.5px] font-semibold text-[#b3bcc4]">{zusatz}</div>}
    </div>
  );
}

/**
 * DIE LEITER — WO DIE LEUTE ABSPRINGEN (Owner 09.09.2026: „der sieht nicht, wo die User
 * abbrechen, keine Insights").
 *
 * DAS IST DIE EINE ANSICHT, DIE ES SONST NIRGENDS GIBT. Anfragen sieht er am Telefon; was
 * er nicht sieht, sind die Leute, die angefangen und aufgehört haben. Bricht es zwischen
 * „gesehen" und „gestartet" ein, stimmt der Hook nicht. Bricht es bei Frage 3 ein, ist die
 * Frage falsch. Bricht es erst am Namensfeld ein, ist es das Vertrauen. Drei Befunde, drei
 * Reparaturen — ohne diese Zeilen rät man alle drei.
 *
 * BALKEN AUS DIVS, KEIN DIAGRAMM-PAKET. Neun waagerechte Balken sind kein Grund, dem
 * Browser eine Bibliothek zu schicken; und der grösste Wert ist immer 100 %, also braucht
 * es nicht einmal eine Skala.
 *
 * DER ABSPRUNG STEHT RECHTS UND IN ROT, NICHT DER ANTEIL: Der Anteil sagt, wie viele noch
 * da sind — die Frage ist aber, wo sie verloren gehen. Nur die grösste Stelle wird
 * hervorgehoben; drei rote Zahlen nebeneinander heben sich gegenseitig auf.
 */
/**
 * DIE STUFEN HEISSEN IN SEINER SPRACHE (09.09.2026, beim rumänischen Prüflauf gesehen):
 * Zwischen „Prezentare generală" und „Cererile tale" standen „Seite gesehen" und „1. Frage
 * beantwortet" — die Namen kommen aus `lib/versusforge-schritt.ts`, wo sie DATENSCHLÜSSEL
 * sind und deutsch bleiben müssen. Hier werden sie übersetzt angezeigt; passt ein Schlüssel
 * nicht, bleibt das deutsche Wort stehen statt einer Lücke.
 */
const STUFENWORT: Record<string, keyof DashboardTexte> = {
  seite: "stufeSeite", start: "stufeStart",
  antwort1: "stufeAntwort1", antwort2: "stufeAntwort2",
  antwort3: "stufeAntwort3", antwort4: "stufeAntwort4",
  abschluss: "stufeAbschluss",
};

function Leiter({ leiter, besucher, T }: { leiter: Trichterzahl[]; besucher: number; T: DashboardTexte }) {
  /* Die schlimmste Stelle — aber nur, wenn überhaupt genug Leute da waren, dass die Zahl
     etwas bedeutet. Bei drei Besuchern ist jeder Abbruch 33 % und nichts davon ein Befund. */
  const schlimmste = besucher >= 10
    ? leiter.reduce((a, b) => (b.verloren > a.verloren ? b : a), leiter[0])
    : null;

  return (
    <section className={`${KARTE} mt-5 p-6 md:p-7`}>
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">{T.abspringenTitel}</h2>
      {besucher === 0 ? (
        <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
          Noch niemand war auf deiner Seite. Sobald die Anzeige läuft, steht hier, an welcher
          Frage die Leute aufhören.
        </p>
      ) : (
        <>
          <p className="mt-2 text-[14.5px] text-[#8b959d]">{T.abspringenZeit}</p>
          <ul className="mt-5 flex list-none flex-col gap-3.5 p-0">
            {leiter.map((z, i) => {
              const hier = schlimmste && z.stufe.schluessel === schlimmste.stufe.schluessel && z.verloren > 0;
              return (
                <li key={z.stufe.schluessel}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-bold">{T[STUFENWORT[z.stufe.schluessel]] ?? z.stufe.wort}</span>
                    <span className="shrink-0 text-[15px] font-bold text-[#5b666f]">
                      {z.anzahl}
                      <span className="ml-2 text-[13.5px] font-bold text-[#8b959d]">{z.anteil}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#eef1f4]">
                    <div className="h-full rounded-full bg-[#1d6fd0]" style={{ width: `${Math.max(z.anteil, 1)}%` }} />
                  </div>
                  {/* Der Verlust steht ZWISCHEN den Sprossen, dort wo er entsteht. */}
                  {i < leiter.length - 1 && z.verloren > 0 && (
                    <p className={`mt-1.5 text-[13.5px] font-bold ${hier ? "text-[#c02626]" : "text-[#8b959d]"}`}>
                      {hier ? `${T.groessterAbsprung} ` : ""}−{z.verloren} {T.hierAufgehoert}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * EINE ANFRAGE — WER, WIE ERREICHBAR, WORUM ES GEHT (Owner 09.09.2026, mit Bild: „das zum
 * Ausklappen, und Bild wird keiner haben. Wo ist seine E-Mail, Telefon, Name?").
 *
 * DREI FEHLER AUF EINMAL, und alle drei kamen daher, dass ich nur EINEN Trichter im Kopf
 * hatte:
 *
 *  1. DAS BILD. Ein Kreis mit dem Anfangsbuchstaben — bei „Ohne Namen" ein Fragezeichen.
 *     Ein Platzhalter für etwas, das es nie geben wird, ist kein Anker fürs Auge, sondern
 *     eine leere Stelle mit Rahmen. Er ist raus.
 *
 *  2. DIE KONTAKTDATEN FEHLTEN. Name und Telefon las ich ausschliesslich aus den letzten
 *     zwei Runden — so legt der MANDANTEN-Trichter sie ab. Der EIGENE Trichter kennt keine
 *     Telefonnummer, dort steht die E-Mail im Feld `mail`. Ergebnis: seine eigenen Anfragen
 *     standen als „Ohne Namen" ohne einen einzigen Weg, den Menschen zu erreichen — bei
 *     einer Anfrage ist das die einzige Zeile, auf die es ankommt.
 *
 *  3. DAS GESPRÄCH NAHM DIE GANZE KARTE. Vier Fragen mit Antworten sind acht Absätze; bei
 *     zwanzig Anfragen scrollt er an jeder einzelnen vorbei, um die nächste Nummer zu
 *     sehen. Es klappt jetzt auf — `<details>`, kein Zustand, kein JavaScript, funktioniert
 *     auch beim Drucken und in der Suche des Browsers.
 *
 * DIE REIHENFOLGE IST DIE ARBEITSREIHENFOLGE: Wer ist es, wie erreiche ich ihn, worum ging
 * es — und erst auf Wunsch das ganze Gespräch.
 */
/**
 * EINE ANFRAGE — MIT ODER OHNE DEN MENSCHEN DAHINTER.
 *
 * `wer` entscheidet, ob Name, Telefonnummer und Adresse erscheinen. Ist er falsch, werden
 * sie GAR NICHT GERENDERT — sie stehen dann auch nicht im Quelltext. Das ist der Unterschied
 * zum verwischten Namen, den man bei Tinder sieht (Owner 09.09.2026: „das Gleiche macht
 * Tinder. Es kommt eine E-Mail an, jemand hat sich dein Profil angeschaut, du siehst bloss
 * nicht, wer"): Verwischen ist ein Bild über Daten, die trotzdem da sind. Wer die Seite
 * anschaut, findet sie. Was hier fehlt, fehlt wirklich.
 */
function Anfrage({ zeit, eigen, offen, name, telefon, mail, gespraech, T }: {
  zeit: string;
  /** Sein eigener Testlauf — immer offen, aber als solcher gekennzeichnet. */
  eigen: boolean;
  /** Steht der Mensch dahinter offen? Ist es falsch, kommen Name, Nummer und Adresse leer an. */
  offen: boolean;
  name: string;
  telefon: string;
  mail: string;
  gespraech: { frage: string; antwort: string }[];
  T: DashboardTexte;
}) {

  return (
    <li className="rounded-xl border border-[#e4e9ee] p-4">
      {/* SEIN EIGENER DURCHLAUF STEHT DRAN. Ohne die Kennzeichnung sähe er drei Anfragen und
          hielte seine eigene für einen Kunden — und riefe sich selbst an. */}
      {eigen && (
        <span className="mb-2 inline-block rounded-full border-[1.5px] border-[#dfe4e9] bg-[#f5f7f9] px-2.5 py-0.5 text-[12px] font-black uppercase tracking-[0.12em] text-[#5b666f]">
          {T.deinTestlauf}
        </span>
      )}
      {/**
        * OHNE NAMEN IST DIE ADRESSE DIE ÜBERSCHRIFT — und dann steht sie nur EINMAL da.
        * In der ersten Fassung war sie beides, Titel und Kontaktzeile darunter; dieselbe
        * Zeichenfolge zweimal untereinander sieht aus wie ein Fehler.
        */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {!offen ? (
          /* KEIN PLATZHALTER-NAME, SONDERN DIE WAHRHEIT: Es war ein Mensch, und wie er
             heisst, steht hinter dem Schloss. */
          <span className="inline-flex items-center gap-2 text-[17px] font-extrabold tracking-[-0.01em] text-[#1d6fd0]">
            <Lock className="h-[17px] w-[17px] shrink-0" aria-hidden />
            {T.verschlossen}
          </span>
        ) : name ? (
          <span className="text-[17px] font-extrabold tracking-[-0.01em]">{name}</span>
        ) : mail ? (
          <a href={`mailto:${mail}`} className="inline-flex min-w-0 items-center gap-2 text-[17px] font-extrabold tracking-[-0.01em] text-[#1d6fd0]">
            <Mail className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="truncate">{mail}</span>
          </a>
        ) : (
          <span className="text-[17px] font-extrabold tracking-[-0.01em] text-[#8b959d]">{T.ohneNamen}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span className="text-[13.5px] font-bold text-[#8b959d]">{seither(zeit, T)}</span>
          {/* DIE DREI PUNKTE (Owner 09.09.2026) — nur das Menü, die Wege kommen, wenn die
              Anzeige läuft. Begründung in components/AnfrageMenue.tsx. */}
          {/* DER NAME DARF HIER NICHT DURCHRUTSCHEN (09.09.2026 beim Prüfen gefunden):
              `AnfrageMenue` ist ein Client-Bauteil — was es als Eigenschaft bekommt, steht im
              Browser, auch wenn es nirgends sichtbar ist. Ist die Anfrage verschlossen, geht
              nur ein neutrales Wort hinaus. */}
          <AnfrageMenue wer={offen ? (name || mail || "diese Anfrage") : "diese Anfrage"} />
        </span>
      </div>

      {/* ── ERREICHBARKEIT: das Wichtigste der ganzen Karte, zum Antippen ── */}
      {offen && (telefon || (name && mail)) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {telefon && (
            <a href={`tel:${telefon.replace(/[^+0-9]/g, "")}`}
              className="inline-flex items-center gap-2 text-[16.5px] font-bold text-[#1d6fd0]">
              <Phone className="h-4 w-4 shrink-0" aria-hidden />
              {telefon}
            </a>
          )}
          {/* Die Adresse SEINES Kunden, nicht unsere — die Hausregel „nie eine E-Mail-Adresse
              auf der Seite" schützt die Mailbox des Hauses, nicht die des Anfragenden. */}
          {name && mail && (
            <a href={`mailto:${mail}`}
              className="inline-flex min-w-0 items-center gap-2 text-[16px] font-bold text-[#1d6fd0]">
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{mail}</span>
            </a>
          )}
        </div>
      )}
      {!telefon && !mail && (
        <p className="mt-2 text-[14.5px] font-semibold text-[#8b959d]">{T.keineKontaktdaten}</p>
      )}

      {/**
        * SEIN ERSTER SATZ IST DIE HAUPTSACHE (Owner 09.09.2026: „die muss ich auf meinem
        * Dashboard sehen, die ist die wichtigste").
        *
        * Er stand hier als grauer Fliesstext unter den Kontaktdaten — dieselbe Grösse wie
        * alles andere. Dabei ist er das Einzige, was der Mensch UNGEFRAGT geschrieben hat:
        * kein angetipptes Beispiel, keine Antwort auf eine Frage von uns, sondern sein
        * eigenes Wort über sein eigenes Anliegen. Wer zurückruft, braucht genau diesen Satz
        * im ersten Moment — alles andere kann man im Gespräch nachfragen.
        *
        * DESHALB GROSS UND MIT RAND, nicht als Absatz. Und mit Etikett, damit klar ist, dass
        * es SEINE Worte sind und keine Zusammenfassung von uns.
        */}
      {/* HIER STANDEN „Womit er angefangen hat" UND SEINE ADRESSE (09.09.2026 entfernt):
          Beide kamen aus dem vollständigen Eintrag, den die Karte nicht mehr bekommt — und
          genau dieser Eintrag war das Leck. Was der Mensch gesagt hat, steht im Gespräch
          darunter; die Adresse steht unter Einstellungen. */}

      {/**
        * DAS GESPRÄCH ZUM AUFKLAPPEN (Owner 09.09.2026: „das zum Ausklappen").
        *
        * Es bleibt vollständig da — wer zurückruft, darf nicht mit „erzählen Sie noch mal"
        * anfangen (Owner 08.09.2026). Es steht nur nicht mehr im Weg.
        *
        * `<details>` statt eines Schalters im Code: Es ist zu, es geht auf, es druckt richtig
        * und die Suche des Browsers findet den Text auch im geschlossenen Zustand.
        */}
      {gespraech.length > 0 && (
        <details className="group mt-3 border-t border-[#eef1f4] pt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14.5px] font-bold text-[#5b666f] transition hover:text-[#14181c]">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden />
            {T.gespraech} · {gespraech.length} {gespraech.length === 1 ? T.frage : T.fragen}
          </summary>
          <dl className="mt-3 grid gap-2.5 md:grid-cols-2">
            {gespraech.map((r, i) => (
              <div key={i}>
                {/* DIE FRAGE IST SCHWARZ, NICHT GRAU (Owner 09.09.2026: „das eher schwarz").
                    Grau war die Farbe eines Etiketts — aber die Frage ist Inhalt: Sie ist
                    das, was sein Kunde gelesen hat, und ohne sie ergibt die Antwort keinen
                    Sinn. Unterschieden wird jetzt über das Gewicht, nicht über die
                    Blässe (Kontrast-Boden der CI). */}
                <dt className="text-[14.5px] font-bold leading-[1.45] text-[#14181c]">{r.frage}</dt>
                <dd className="m-0 mt-1 text-[15px] leading-[1.5] text-[#5b666f]">{r.antwort || "—"}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </li>
  );
}
