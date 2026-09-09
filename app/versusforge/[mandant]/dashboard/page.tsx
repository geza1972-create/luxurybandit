import crypto from "crypto";
import type { Metadata } from "next";
import { mandantLesen } from "@/lib/versusforge-mandanten";
import { leadsLesen } from "@/lib/versusforge-lead";
import { eur, VERSUSFORGE_START_CENTS } from "@/lib/pricing";
import MandantEinrichten from "@/components/MandantEinrichten";
import { Wortmarke } from "@/components/VersusForgeMarke";

/**
 * DAS DASHBOARD — „WO SIND MEINE KUNDEN?" (Owner 09.09.2026: „sie werden danach fragen, wo
 * sind meine Kunden? Die sind auf deinem Dashboard. Willst du sie sehen? Dann musst du das
 * Dashboard zahlen").
 *
 * BIS HEUTE GAB ES DIESE SEITE NICHT. `components/VersusForgeDashboard.tsx` ist ein
 * NACHGEBAUTES BEISPIEL für die Verkaufsseite, mit „Beispiel" darauf — kein Zugang zu
 * irgendetwas. Die Anfragen lagen in der Ablage (`versusforge-lead/<mandant>/`), gelesen hat
 * sie niemand. Das ist die Ware, die für 299 € verkauft wird; ohne diese Seite gab es sie
 * nicht.
 *
 * ZWEI DINGE AUF EINER SEITE, UND ZWAR IN DIESER REIHENFOLGE:
 *
 *  1. EINRICHTEN, wenn Pflichtangaben fehlen. Dann ist die Anfragenliste zwangsläufig leer —
 *     der Trichter weist ja jede Anfrage ab. Eine leere Liste zu zeigen und den Grund
 *     darunter zu verstecken, wäre die Sorte Oberfläche, bei der jemand eine Woche wartet.
 *  2. DIE ANFRAGEN. Name, Nummer, Zeit, und was der Mensch gesagt hat.
 *
 * Stehen die Pflichtangaben, dreht sich die Reihenfolge um: Dann sind die Anfragen die
 * Hauptsache und die Angaben stehen darunter zum Ändern.
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
  if (min < 60) return `vor ${min} Minuten`;
  const std = Math.round(min / 60);
  if (std < 24) return `vor ${std} Stunde${std === 1 ? "" : "n"}`;
  const tage = Math.round(std / 24);
  return `vor ${tage} Tag${tage === 1 ? "" : "en"}`;
}

export default async function MandantDashboard({ params, searchParams }: {
  params: Promise<{ mandant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { mandant } = await params;
  const sp = await searchParams;
  const k = Array.isArray(sp.k) ? sp.k[0] ?? "" : sp.k ?? "";

  const m = await mandantLesen(mandant);

  /**
   * EIN FALSCHER SCHLÜSSEL SIEHT AUS WIE EIN FEHLENDER TRICHTER — dieselbe Seite, derselbe
   * Satz. Sonst verrät die Antwort, welche Namen vergeben sind, und wer Namen kennt, kann
   * gezielt raten.
   *
   * KEIN `notFound()`: Die Standard-404 des Hauses trägt Kopf, Fuss und Marke von
   * VersusForge. Hier steht ein Mensch, der auf seinen eigenen Link geklickt hat und
   * wissen muss, was er tun soll — nicht, wo er gelandet ist.
   */
  if (!m || !schluesselStimmt(m.schluessel, k)) {
    return (
      <main className="lb-mandant mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col justify-center bg-white px-5 text-[#14181c]">
        <Wortmarke className="text-[21px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
        <h1 className="mt-6 text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em]">
          Dieser Zugang stimmt nicht.
        </h1>
        <p className="mt-3 text-[16px] leading-[1.5] text-[#5b666f]">
          Den Link zu deinem Dashboard haben wir dir per E-Mail geschickt — er trägt einen
          Schlüssel am Ende. Ohne ihn öffnet sich diese Seite nicht.
        </p>
      </main>
    );
  }

  const bereit = !!m.impressumUrl && !!m.datenschutzUrl;
  /**
   * ZWEI SCHLÖSSER, UND SIE HÄNGEN AN VERSCHIEDENEN DINGEN — das ist der ganze Verkauf.
   *
   *  · EINRICHTEN geht mit dem Schlüssel, immer. Es kostet nichts, und es muss kostenlos
   *    sein: Eine öffentliche Seite, die Namen und Telefonnummern annimmt, braucht ein
   *    Impressum. Das hinter eine Kasse zu stellen hiesse, ihn dafür zu bezahlen zu lassen,
   *    dass seine Seite rechtmässig ist.
   *
   *  · LESEN kostet 299 € (`stand === "scharf"`). Bis dahin sieht er die ZAHL, nicht die
   *    Namen. Genau das ist die Frage, die verkauft: „Wo sind meine Kunden?"
   *
   * DIE ZAHL WIRD AUCH UNBEZAHLT GEHOLT. Sie ist kein Geheimnis — sie steht schon in der
   * Mail „Du hast eine Anfrage" — und ohne sie wäre die Seite eine Behauptung statt eines
   * Beweises.
   */
  const bezahlt = m.stand === "scharf";
  /* IMMER LESEN, auch wenn der Trichter gerade nichts annimmt: Wer eine Pflichtangabe
     wieder herausnimmt, darf nicht die Anfragen verlieren, die schon da sind. Die Liste
     zeigt, was liegt; ob NEUE hinzukommen, ist eine andere Frage. */
  const anfragen = await leadsLesen(mandant, 200);
  const trichterUrl = `/versusforge/${encodeURIComponent(mandant)}`;

  const einrichten = (
    <MandantEinrichten
      mandant={mandant}
      k={k}
      trichterUrl={trichterUrl}
      start={{
        adresse: m.adresse ?? "",
        telefon: m.telefon ?? "",
        webUrl: m.webUrl ?? "",
        impressumUrl: m.impressumUrl ?? "",
        datenschutzUrl: m.datenschutzUrl ?? "",
      }}
    />
  );

  /* `lb-mandant` blendet Hausleiste und Cookie-Band aus (globals.css). Hier ist es keine
     Mandantenseite, aber dieselbe Regel gilt: Ein Kunde, der seine Anfragen liest, hat auf
     dieser Seite nichts mit Kuss-Videos und Geburtstagsfilmen zu tun. */
  return (
    <main className="lb-mandant flex min-h-[100dvh] flex-col bg-white text-[#14181c]">
      <header className="border-b border-[#dfe4e9] px-5 py-4">
        <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3">
          <Wortmarke className="text-[21px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
          <a href={trichterUrl} className="text-[14.5px] font-bold text-[#1d6fd0] underline underline-offset-2">
            Dein Trichter
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[560px] flex-1 px-5 pb-16 pt-7">
        <h1 className="m-0 text-[28px] font-extrabold leading-[1.18] tracking-[-0.02em]">
          {m.name}
        </h1>

        {/* EINRICHTEN ZUERST, SOLANGE ES NÖTIG IST — siehe oben. */}
        {!bereit && einrichten}

        <section className={bereit ? "" : "mt-11 border-t border-[#dfe4e9] pt-8"}>
          <h2 className={`m-0 text-[21px] font-extrabold tracking-[-0.02em] ${bereit ? "mt-7" : ""}`}>
            {anfragen.length === 1 ? "Eine Anfrage" : `${anfragen.length} Anfragen`}
          </h2>

          {anfragen.length === 0 ? (
            /* EINE LEERE LISTE MUSS SAGEN, WARUM SIE LEER IST. „Noch nichts da" allein lässt
               den Menschen raten, ob er wartet oder etwas falsch gemacht hat. */
            <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">
              {bereit
                ? "Noch niemand. Sobald jemand deinen Trichter durchläuft, steht er hier — und du bekommst eine E-Mail."
                : "Deine Seite nimmt noch keine Anfragen an. Trag oben Impressum und Datenschutz ein, dann geht sie an."}
            </p>
          ) : !bezahlt ? (
            /**
             * DAS SCHLOSS — DIE ZAHL OHNE DIE NAMEN (Owner 09.09.2026: „er wird niemals das
             * nutzen können ohne Dashboard. Das muss er kaufen").
             *
             * KEIN UNSCHARFER TEXT DAHINTER, kein „Max M." mit Punkten. Ein verwischter Name
             * ist ein Trick, und Tricks fallen auf: Wer die Seite anschaut, findet den Namen
             * im Quelltext. Was hier steht, ist wahr und vollständig — es gibt sie, es sind
             * so viele, und lesen kannst du sie nach dem Kauf.
             */
            <div className="mt-4 rounded-2xl border-[1.5px] border-[#1d6fd0]/35 bg-[#eaf2fc] p-5">
              <p className="m-0 text-[17px] font-extrabold tracking-[-0.01em] text-[#14181c]">
                {anfragen.length === 1
                  ? "Ein Mensch hat seine Nummer hinterlassen."
                  : `${anfragen.length} Menschen haben ihre Nummer hinterlassen.`}
              </p>
              <p className="mt-2 text-[15px] leading-[1.5] text-[#5b666f]">
                Name, Telefonnummer und das, was sie gesagt haben, stehen in deinem Dashboard.
                Es ist gebaut und wartet — freigeschaltet ist es noch nicht.
              </p>
              <p className="mt-3 text-[14.5px] font-bold leading-[1.5] text-[#5b666f]">
                Wer innerhalb eines Tages zurückruft, erreicht die Leute noch.
              </p>
              {/* KEIN KAUFKNOPF, SOLANGE ES KEINE KASSE GIBT (Stripe steht bewusst still,
                  Memory `versusforge-preistreppe`). Ein Knopf, der nichts tut, ist schlimmer
                  als kein Knopf — er verbrennt den einen Moment, in dem jemand kaufen wollte.
                  DER PREIS KOMMT AUS DER TABELLE, nie getippt (Memory
                  `prices-only-from-pricing-table`). KEINE E-MAIL-ADRESSE, nur /contact. */}
              <p className="mt-4 text-[15px] leading-[1.5] text-[#14181c]">
                {eur(VERSUSFORGE_START_CENTS, "de")} einmalig, mit Einrichtung deiner ersten
                Anzeige zusammen mit uns.{" "}
                <a href="/contact?reason=support" className="font-bold text-[#1d6fd0] underline underline-offset-2">
                  Schreib uns
                </a>, dann schalten wir es frei.
              </p>
            </div>
          ) : (
            <ul className="mt-4 flex list-none flex-col gap-3 p-0">
              {anfragen.map(a => {
                /* Name und Telefon stehen als die letzten zwei Runden im Eintrag (so legt
                   `app/api/versusforge-mandant/route.ts` sie ab). Der Rest ist das Gespräch. */
                const runden = a.runden ?? [];
                const feld = (wort: string) => runden.find(r => r.frage === wort)?.antwort ?? "";
                const name = feld("Name");
                const telefon = feld("Telefon");
                const gespraech = runden.filter(r => r.frage !== "Name" && r.frage !== "Telefon");
                return (
                  <li key={a.datei} className="rounded-2xl border border-[#dfe4e9] bg-white p-4 shadow-[0_1px_2px_rgba(20,24,28,0.06)]">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-[17px] font-extrabold tracking-[-0.01em]">{name || "Ohne Namen"}</span>
                      <span className="text-[13.5px] font-bold text-[#8b959d]">{seither(a.zeit)}</span>
                    </div>
                    {/* DIE NUMMER IST ZUM ANTIPPEN. Wer am Handy im Dashboard steht, will
                        anrufen, nicht abtippen — und wer am selben Tag zurückruft, gewinnt. */}
                    {telefon ? (
                      <a href={`tel:${telefon.replace(/[^+0-9]/g, "")}`}
                        className="mt-1 block text-[17px] font-bold text-[#1d6fd0]">
                        {telefon}
                      </a>
                    ) : null}
                    {a.text ? (
                      <p className="mt-2.5 text-[15px] leading-[1.5] text-[#14181c]">{a.text}</p>
                    ) : null}
                    {/* DAS GESPRÄCH, NICHT NUR DIE ADRESSE (Owner 08.09.2026: „ich brauche
                        das auch") — wer zurückruft, darf nicht mit „erzählen Sie noch mal"
                        anfangen. */}
                    {gespraech.length > 0 && (
                      <dl className="mt-3 flex flex-col gap-2 border-t border-[#eef1f4] pt-3">
                        {gespraech.map((r, i) => (
                          <div key={i}>
                            <dt className="text-[13.5px] font-bold text-[#8b959d]">{r.frage}</dt>
                            <dd className="m-0 text-[15px] leading-[1.5] text-[#14181c]">{r.antwort || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* STEHEN DIE ANGABEN, GEHÖREN SIE NACH UNTEN — dann sind die Anfragen die Sache,
            derentwegen er hier ist. */}
        {bereit && (
          <div className="mt-11 border-t border-[#dfe4e9] pt-8">{einrichten}</div>
        )}
      </div>
    </main>
  );
}
