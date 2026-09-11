import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { aufVersusforge, istKuenstler, kuenstlerUrl } from "@/lib/lakatosbandi";
import { mandantOeffentlich, AKZENT_STANDARD } from "@/lib/versusforge-mandanten";
import MandantTrichter from "@/components/MandantTrichter";

/**
 * DIE SEITE DES MANDANTEN (Owner 09.09.2026: „er bekommt einen Funnel, eine URL, die er in
 * Insta oder FB eingeben kann" · „die Seite muss so einfach sein wie möglich" · „schwarz
 * passt für uns, aber light passt für alle").
 *
 * SIE IST KEINE LANDINGPAGE. Unsere Startseite hat Abschnitte, weil sie einen Unternehmer
 * überzeugen muss. Diese hat einen einzigen Job: Jemand tippt aus einer Anzeige hierher und
 * fängt an. Kein Menü, keine Beispiele, kein „Wie es funktioniert", kein Farbschalter — alles
 * davon kostet nur die Höhe, die der Knopf braucht (Hausregel `cta-im-viewport-template`).
 *
 * HELL UND OHNE GOLD. Gold ist die Farbe von VersusForge; hier wäre es unsere Marke, die
 * durch seine hindurchscheint. Schwarz, Weiss, Grau plus EIN Akzent aus seinen Angaben.
 *
 * KEIN HAUS-LOGO, KEIN HAUS-FUSS, KEIN „made by". Wer diese Seite öffnet, ist sein Kunde,
 * nicht unserer.
 *
 * `force-dynamic`, weil die Angaben aus der Ablage kommen und sich ändern dürfen, ohne dass
 * jemand neu baut.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ mandant: string }> }): Promise<Metadata> {
  const { mandant } = await params;
  const m = await mandantOeffentlich(mandant);
  if (!m) return { title: "Nicht gefunden" };
  /* VOR DER FREIGABE KEIN NAME IM TAB (10.09.2026, Freigabe-Test): Die Warteseite zeigte nichts
     von ihm — der Browser-Tab aber „Test Freigabe Künstler — Start now". Abgelehnt: wie nicht
     vorhanden. */
  if (m.freigabe === "abgelehnt") return { title: "Nicht gefunden", robots: { index: false, follow: false } };
  if (m.freigabe === "offen") return { title: "In review", robots: { index: false, follow: false } };
  /* SEIN Titel in der Vorschau, nicht unserer — sonst fliegt das White Label beim ersten
     geteilten Link auf (dieselbe Falle wie bei den Academy-Videos). */
  return {
    title: `${m.name} — ${m.knopf}`,
    description: m.unterzeile,
    robots: { index: false, follow: false },
  };
}

export default async function MandantSeite({ params, searchParams }: {
  params: Promise<{ mandant: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { mandant } = await params;
  const m = await mandantOeffentlich(mandant);
  if (!m) notFound();

  /* KÜNSTLER NUR AUF LAKATOSBANDI.COM (Owner 10.09.2026: „nur auf lakatosbandi"). Alte Links auf
     versusforge.com/{name} — in Mails, Anzeigen, geteilten Posts — landen auf seiner Seite im
     Portal, `?h=` wandert mit. Auf lakatosbandi.com ist diese Seite das Gespräch hinter
     „Sprich mit meinem Agenten" (`/{name}/kontakt`) und leitet nicht um. */
  if (istKuenstler(m) && aufVersusforge((await headers()).get("host"))) {
    const h = String((await searchParams).h ?? "").slice(0, 4);
    redirect(`${kuenstlerUrl(mandant)}${h ? `?h=${encodeURIComponent(h)}` : ""}`);
  }

  /**
   * ── NICHT ÖFFENTLICH, BEVOR DER OWNER FREIGIBT (Owner 10.09.2026, Variante B) ────────────
   *
   * Abgelehnt gibt es die Seite nicht. Wartet sie noch, sieht der Besucher einen ruhigen Satz
   * statt eines Fehlers — der Künstler hat den Link vielleicht schon geteilt. Fehlt das Feld
   * (alle Einträge vor diesem Tag), bleibt die Seite öffentlich wie bisher.
   */
  if (m.freigabe === "abgelehnt") notFound();
  if (m.freigabe === "offen") {
    const PRUEFUNG: Record<string, string> = {
      en: "This page is being reviewed and will be online soon.",
      ro: "Această pagină este în verificare și va fi online în curând.",
      de: "Diese Seite wird gerade geprüft und ist bald online.",
    };
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-white px-6 text-center text-[#14181c]">
        <p className="m-0 max-w-[420px] text-[18px] leading-[1.5]">{PRUEFUNG[String(m.sprache ?? "en").slice(0, 2)] ?? PRUEFUNG.en}</p>
      </main>
    );
  }

  const akzent = /^#[0-9a-f]{6}$/i.test(m.farbe) ? m.farbe : AKZENT_STANDARD;

  return (
    <div
      className="lb-mandant flex min-h-[100dvh] flex-col bg-white text-[#14181c]"
      /* Die Farbe steht EINMAL hier und wird nach unten gereicht. Wer sie ändern will,
         ändert einen Wert in der Mandanten-Datei, keine Klasse im Code. */
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

      <main className="mx-auto w-full max-w-[560px] flex-1 px-5 pb-10 pt-7 md:pt-13">
        <h1 className="m-0 text-[28px] font-extrabold leading-[1.18] tracking-[-0.02em] md:text-[34px]">
          {m.hook}
        </h1>
        <p className="mt-3.5 text-[16px] text-[#5b666f]">{m.unterzeile}</p>

        <MandantTrichter mandant={mandant} karten={m.karten} knopf={m.knopf} fein={m.fein} />

        {/**
          * WAS AM ENDE HERAUSKOMMT (Owner 09.09.2026: „sie bekommen ein Angebot").
          *
          * Über dem Knopf steht die Arbeit, darunter der Lohn — dieselbe Reihenfolge, die
          * auf unserer eigenen Seite schon einmal entschieden wurde („über dem Feld muss
          * stehen, was am Ende herauskommt"). Wer vier Fragen beantwortet, ohne zu wissen
          * wofür, hört bei der dritten auf.
          */}
        {m.ergebnisTitel ? (
          <section className="mt-11 border-t border-[#dfe4e9] pt-8">
            <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.02em]">{m.ergebnisTitel}</h2>
            <p className="mt-2.5 text-[15px] leading-[1.5] text-[#5b666f]">{m.ergebnisText}</p>
          </section>
        ) : null}
      </main>

      {/**
       * SEIN FUSS, NICHT UNSERER (Owner: „am Ende müssen seine Daten stehen statt meine").
       *
       * Bei der Academy hiess White Label „Fuss komplett raus" — das geht bei einer Seite,
       * die nichts erhebt. Diese sammelt Namen, Telefonnummern und je nach Fach Angaben zur
       * Gesundheit. Verantwortlich ist der Mandant; seine Pflichtangaben gehören hierher.
       */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-[#dfe4e9] px-5 pb-6 pt-4 text-[14px] text-[#5b666f]">
        <div className="mx-auto flex w-full max-w-[560px] flex-wrap items-center gap-2">
          {/**
            * DIESELBEN DREI LINKS WIE BEI UNS (Owner 09.09.2026: „das selbe bekommt der
            * Kunde auch" · „About, Impressum, Datenschutz") — nur zeigen sie auf SEINE
            * Seiten.
            *
            * NUR WAS ER WIRKLICH HAT: Ein Link auf eine leere Adresse lädt die Seite neu und
            * sieht aus wie ein Fehler. Fehlt die Angabe, fehlt der Link — nichts wird
            * erfunden.
            */}
          {[
            [m.aboutUrl, "About"],
            [m.impressumUrl, "Impressum"],
            [m.datenschutzUrl, "Datenschutz"],
          ].filter(([u]) => u).map(([u, wort], i) => (
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
