import crypto from "crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Settings, ExternalLink, Megaphone, Phone, Lock } from "lucide-react";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { leadsLesen, type LeadEintrag } from "@/lib/versusforge-lead";
import { eur, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import MandantEinrichten from "@/components/MandantEinrichten";
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
function seither(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 2) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const std = Math.round(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  const tage = Math.round(std / 24);
  return `vor ${tage} Tag${tage === 1 ? "" : "en"}`;
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
  const ansicht = einer(sp.ansicht) === "einstellungen" ? "einstellungen" : "anfragen";

  const m = await mandantLesen(mandant);

  /**
   * EIN FALSCHER SCHLÜSSEL SIEHT AUS WIE EIN FEHLENDER TRICHTER — dieselbe Seite, derselbe
   * Satz. Sonst verrät die Antwort, welche Namen vergeben sind, und wer Namen kennt, kann
   * gezielt raten.
   */
  if (!m || !schluesselStimmt(m.schluessel, k)) {
    return (
      <main className="lb-mandant grid min-h-[100dvh] place-items-center bg-[#f5f7f9] px-5 text-[#14181c]">
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
  const anfragen = await leadsLesen(mandant, 200);

  const woche = Date.now() - 7 * 24 * 3600 * 1000;
  const neu = anfragen.filter(a => Date.parse(a.zeit) > woche).length;
  const zuletzt = anfragen[0]?.zeit ? seither(anfragen[0].zeit) : "—";

  const basis = `/versusforge/${encodeURIComponent(mandant)}`;
  const mitK = (a: string) => `${basis}/dashboard?k=${encodeURIComponent(k)}${a ? `&ansicht=${a}` : ""}`;

  return (
    /* `lb-mandant` blendet Hausleiste und Cookie-Band aus (globals.css). Ein Kunde, der
       seine Anfragen liest, hat auf dieser Seite nichts mit Kuss-Videos zu tun. */
    <div className="lb-mandant min-h-[100dvh] bg-[#f5f7f9] text-[#14181c]">
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
            {bereit ? "Trichter läuft" : "Trichter ist aus"}
          </span>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1080px] gap-6 px-5 py-6 md:grid-cols-[220px_1fr] md:py-8">
        {/* ── NAVIGATION: links am Rechner, als Reihe am Handy ── */}
        <nav className="flex gap-2 overflow-x-auto md:sticky md:top-[76px] md:h-fit md:flex-col md:overflow-visible lb-wisch">
          <Reiter href={mitK("")} aktiv={ansicht === "anfragen"} icon={<Inbox className="h-[18px] w-[18px]" />}
            wort="Anfragen" zahl={anfragen.length} />
          <Reiter href={mitK("einstellungen")} aktiv={ansicht === "einstellungen"} icon={<Settings className="h-[18px] w-[18px]" />}
            wort="Einstellungen" warnung={!bereit} />
          <div className="hidden md:my-2 md:block md:border-t md:border-[#e4e9ee]" />
          <Aussen href={basis} icon={<ExternalLink className="h-[18px] w-[18px]" />} wort="Dein Trichter" />
          <Aussen href={`${basis}/anzeige`} icon={<Megaphone className="h-[18px] w-[18px]" />} wort="Deine Anzeige" />
        </nav>

        <main className="min-w-0">
          {/* ── DER RIEGEL: er steht über allem, solange der Trichter aus ist ── */}
          {!bereit && ansicht === "anfragen" && (
            <div className={`${KARTE} mb-5 border-l-4 border-l-[#c02626] p-5`}>
              <h2 className="m-0 text-[17px] font-extrabold tracking-[-0.01em]">Dein Trichter nimmt noch keine Anfragen an.</h2>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#5b666f]">
                Es fehlen Impressum und Datenschutz. Deine Seite ist zu sehen, aber niemand
                kann etwas hinterlassen — und du merkst es erst, wenn niemand anruft.
              </p>
              <Link href={mitK("einstellungen")}
                className="mt-4 inline-block rounded-xl bg-[#1d6fd0] px-6 py-3 text-[15.5px] font-extrabold text-white transition active:scale-[.99]">
                Jetzt eintragen
              </Link>
            </div>
          )}

          {ansicht === "einstellungen" ? (
            <MandantEinrichten
              mandant={mandant}
              k={k}
              name={m.name}
              trichterUrl={basis}
              start={{
                adresse: m.adresse ?? "",
                telefon: m.telefon ?? "",
                webUrl: m.webUrl ?? "",
                impressumUrl: m.impressumUrl ?? "",
                datenschutzUrl: m.datenschutzUrl ?? "",
              }}
            />
          ) : (
            <>
              {/* ── KENNZAHLEN: drei, nicht acht. Was man nicht liest, verdeckt nur. ── */}
              <div className="grid grid-cols-3 gap-3">
                <Zahl wert={String(anfragen.length)} label="Anfragen" />
                <Zahl wert={String(neu)} label="Neu · 7 Tage" />
                <Zahl wert={zuletzt} label="Zuletzt" klein />
              </div>

              <section className={`${KARTE} mt-5 p-6 md:p-7`}>
                <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em]">
                  {anfragen.length === 0 ? "Noch keine Anfragen" : "Deine Anfragen"}
                </h2>

                {anfragen.length === 0 ? (
                  /* EINE LEERE LISTE MUSS SAGEN, WARUM SIE LEER IST. */
                  <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
                    {bereit
                      ? "Sobald jemand deinen Trichter durchläuft, steht er hier — und du bekommst eine E-Mail."
                      : "Trag zuerst Impressum und Datenschutz ein. Danach nimmt deine Seite Anfragen an."}
                  </p>
                ) : !bezahlt ? (
                  /**
                   * DAS SCHLOSS — DIE ZAHL OHNE DIE NAMEN (Owner: „er wird niemals das nutzen
                   * können ohne Dashboard. Das muss er kaufen").
                   *
                   * KEIN UNSCHARFER TEXT DAHINTER, keine Punkte statt Buchstaben. Ein
                   * verwischter Name ist ein Trick, und Tricks fallen auf: Wer die Seite
                   * anschaut, findet ihn im Quelltext. Was hier steht, ist wahr und
                   * vollständig.
                   */
                  <div className="mt-4 rounded-xl bg-[#eaf2fc] p-5">
                    <div className="flex items-start gap-3">
                      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[#1d6fd0]" aria-hidden />
                      <div className="min-w-0">
                        <p className="m-0 text-[17px] font-extrabold tracking-[-0.01em]">
                          {anfragen.length === 1
                            ? "Ein Mensch hat seine Nummer hinterlassen."
                            : `${anfragen.length} Menschen haben ihre Nummer hinterlassen.`}
                        </p>
                        <p className="mt-2 text-[15px] leading-[1.5] text-[#5b666f]">
                          Name, Telefonnummer und das Gespräch dazu stehen hier — freigeschaltet
                          ist es noch nicht. Wer innerhalb eines Tages zurückruft, erreicht die
                          Leute noch.
                        </p>
                        {/* KEIN KAUFKNOPF, SOLANGE ES KEINE KASSE GIBT (Memory
                            `versusforge-preistreppe`): Ein Knopf, der nichts tut, verbrennt
                            den einen Moment, in dem jemand kaufen wollte. PREIS AUS DER
                            TABELLE, KONTAKT NUR ÜBER /contact (Hausregeln). */}
                        <p className="mt-3.5 text-[15px] leading-[1.5]">
                          <b>{eur(VERSUSFORGE_START_CENTS, "de")} einmalig</b>, mit Einrichtung
                          deiner ersten Anzeige zusammen mit uns.{" "}
                          <a href="/contact?reason=support" className="font-bold text-[#1d6fd0] underline underline-offset-2">
                            Schreib uns
                          </a>, dann schalten wir frei.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ul className="mt-5 flex list-none flex-col gap-3 p-0">
                    {anfragen.map(a => <Anfrage key={a.datei} a={a} />)}
                  </ul>
                )}
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
      className={`flex shrink-0 items-center gap-2.5 rounded-xl border-[1.5px] px-3.5 py-2.5 text-[15px] font-bold transition md:w-full ${
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

/** Ein Weg aus dem Dashboard heraus — bewusst anders gezeichnet als ein Reiter. */
function Aussen({ href, icon, wort }: { href: string; icon: React.ReactNode; wort: string }) {
  return (
    <a href={href}
      className="flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[15px] font-semibold text-[#5b666f] transition hover:text-[#1d6fd0] md:w-full">
      {icon}
      <span className="whitespace-nowrap">{wort}</span>
    </a>
  );
}

/** Eine Kennzahl. Drei davon, mehr nicht — was man nicht liest, verdeckt nur. */
function Zahl({ wert, label, klein = false }: { wert: string; label: string; klein?: boolean }) {
  return (
    <div className={`${KARTE} px-4 py-4`}>
      <div className={`font-extrabold tracking-[-0.03em] ${klein ? "text-[19px] leading-[1.35]" : "text-[30px] leading-none"}`}>
        {wert}
      </div>
      <div className="mt-1.5 text-[13.5px] font-bold text-[#8b959d]">{label}</div>
    </div>
  );
}

/** Eine Anfrage: wer, wann, worum es geht — und die Nummer zum Antippen. */
function Anfrage({ a }: { a: LeadEintrag }) {
  /* Name und Telefon stehen als die letzten zwei Runden im Eintrag (so legt
     `app/api/versusforge-mandant/route.ts` sie ab). Der Rest ist das Gespräch. */
  const runden = a.runden ?? [];
  const feld = (wort: string) => runden.find(r => r.frage === wort)?.antwort ?? "";
  const name = feld("Name");
  const telefon = feld("Telefon");
  const gespraech = runden.filter(r => r.frage !== "Name" && r.frage !== "Telefon");

  return (
    <li className="rounded-xl border border-[#e4e9ee] p-4">
      <div className="flex items-start gap-3">
        {/* Der Anfangsbuchstabe statt eines Bildes — es gibt keins, und ein leerer Kreis
            wäre eine Lücke. So bekommt jede Zeile einen Ankerpunkt fürs Auge. */}
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eaf2fc] text-[16px] font-black text-[#1d6fd0]">
          {(name || "?").trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[17px] font-extrabold tracking-[-0.01em]">{name || "Ohne Namen"}</span>
            <span className="text-[13.5px] font-bold text-[#8b959d]">{seither(a.zeit)}</span>
          </div>
          {/* DIE NUMMER IST ZUM ANTIPPEN. Wer am Handy im Dashboard steht, will anrufen,
              nicht abtippen — und wer am selben Tag zurückruft, gewinnt. */}
          {telefon ? (
            <a href={`tel:${telefon.replace(/[^+0-9]/g, "")}`}
              className="mt-1.5 inline-flex items-center gap-2 text-[16.5px] font-bold text-[#1d6fd0]">
              <Phone className="h-4 w-4" aria-hidden />
              {telefon}
            </a>
          ) : null}
          {a.text ? <p className="mt-2 text-[15px] leading-[1.5]">{a.text}</p> : null}
        </div>
      </div>

      {/* DAS GESPRÄCH, NICHT NUR DIE ADRESSE (Owner 08.09.2026: „ich brauche das auch") —
          wer zurückruft, darf nicht mit „erzählen Sie noch mal" anfangen. */}
      {gespraech.length > 0 && (
        <dl className="mt-3.5 grid gap-2.5 border-t border-[#eef1f4] pt-3.5 md:grid-cols-2">
          {gespraech.map((r, i) => (
            <div key={i}>
              <dt className="text-[13.5px] font-bold text-[#8b959d]">{r.frage}</dt>
              <dd className="m-0 mt-0.5 text-[15px] leading-[1.5]">{r.antwort || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
