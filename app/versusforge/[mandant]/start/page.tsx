import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { mandantOeffentlich, AKZENT_STANDARD } from "@/lib/versusforge-mandanten";
import MandantGespraech from "@/components/MandantGespraech";

/**
 * DER TRICHTER DES MANDANTEN — die Seite hinter seinem Knopf (Owner 09.09.2026).
 *
 * SIE SCHLIESST DIE EINE LÜCKE, die beim ersten Durchgang blieb: Der Link zu seinem Trichter
 * stand da, die Seite stand da — und der Knopf führte ins Leere.
 *
 * DERSELBE RAHMEN WIE DIE SEITE DAVOR: sein Name oben, seine Pflichtangaben unten, seine
 * Farbe. Wer hier ankommt, hat gerade auf SEINER Seite getippt; ein Wechsel der Anmutung
 * würde aussehen, als wäre er woandershin geraten.
 *
 * DIE ANGABE, MIT DER ER ANGEFANGEN HAT, kommt aus `sessionStorage` — sie steht nicht in der
 * Adresse. Ein Klick auf „Mir fehlen mehrere Zähne" gehört nicht in eine URL, die im Verlauf,
 * in Protokollen und im `Referer` jedes geladenen Bildes landet.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ mandant: string }> }): Promise<Metadata> {
  const { mandant } = await params;
  const m = await mandantOeffentlich(mandant);
  if (!m) return { title: "Nicht gefunden" };
  return { title: `${m.name} — ${m.knopf}`, robots: { index: false, follow: false } };
}

export default async function MandantStartSeite({ params }: { params: Promise<{ mandant: string }> }) {
  const { mandant } = await params;
  const m = await mandantOeffentlich(mandant);
  if (!m) notFound();

  const akzent = /^#[0-9a-f]{6}$/i.test(m.farbe) ? m.farbe : AKZENT_STANDARD;

  return (
    <div
      className="lb-mandant flex min-h-[100dvh] flex-col bg-white text-[#14181c]"
      style={{ ["--akzent" as string]: akzent }}
    >
      {/**
        * DER KOPF TRÄGT SEINE KONTAKTANGABEN (Owner 09.09.2026: „im Header muss noch stehen
        * die Adresse, Telefonnummer als Platzhalter" · „kauft er das Ganze, dann wird es da
        * stehen" · „eventuell auch Link zu seiner Homepage").
        *
        * WARUM SIE DA HINGEHÖREN: Gleich soll jemand seinen Namen und seine Nummer
        * hinterlassen. Die erste Frage, die er sich stellt, ist „gibt es die überhaupt?" —
        * eine Adresse und eine Telefonnummer beantworten sie, bevor sie gestellt wird.
        *
        * PLATZHALTER STATT LEERE: Fehlt die Angabe noch, steht sie grau da. Der Mandant
        * sieht, wo seine Daten landen werden; ein Loch sähe aus wie ein Fehler.
        */}
      <header className="border-b border-[#dfe4e9] px-5 py-4">
        <div className="mx-auto flex w-full max-w-[560px] items-start gap-3">
          {m.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : null}
          <div className="min-w-0">
            <div className="text-[17px] font-bold tracking-[-0.01em]">{m.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
              <span className={m.adresse ? "text-[#5b666f]" : "text-[#b3bcc4]"}>
                {m.adresse || "Strasse 1 · 12345 Ort"}
              </span>
              <span aria-hidden="true" className="text-[#c3ccd4]">·</span>
              {m.telefon ? (
                <a href={`tel:${m.telefon.replace(/[^+0-9]/g, "")}`} className="font-semibold text-[#14181c]">{m.telefon}</a>
              ) : (
                <span className="text-[#b3bcc4]">+49 000 000000</span>
              )}
              {/* Nur wenn er ihn wirklich hinterlegt hat — ein Weg vom Trichter WEG ist
                  sonst ein Ausgang vor dem Ziel. */}
              {m.webUrl ? (
                <>
                  <span aria-hidden="true" className="text-[#c3ccd4]">·</span>
                  <a href={m.webUrl} rel="noopener" className="text-[#5b666f] underline">Website</a>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[560px] flex-1 px-5 pb-10 pt-7">
        {/* SAMMELN hängt an den Pflichtangaben, nicht am Kauf. Lesen hängt am Kauf —
            das steht am Dashboard, nicht hier. */}
        <MandantGespraech mandant={mandant} sammelt={!!m.impressumUrl && !!m.datenschutzUrl} name={m.name} />
      </main>

      <footer className="flex flex-wrap items-center gap-2 border-t border-[#dfe4e9] px-5 pb-6 pt-4 text-[14px] text-[#5b666f]">
        <div className="mx-auto flex w-full max-w-[560px] flex-wrap items-center gap-2">
          {([
            [m.aboutUrl, "About"],
            [m.impressumUrl, "Impressum"],
            [m.datenschutzUrl, "Datenschutz"],
          ] as [string, string][]).filter(([u]) => u).map(([u, wort], i) => (
            <span key={wort} className="flex items-center gap-2">
              {i > 0 ? <span aria-hidden="true">·</span> : null}
              <a href={u} className="underline hover:text-[#14181c]" rel="noopener">{wort}</a>
            </span>
          ))}
          <span className="basis-full md:ml-auto md:basis-auto">
            {m.name}{m.ort ? ` · ${m.ort}` : ""}
          </span>
        </div>
      </footer>
    </div>
  );
}
