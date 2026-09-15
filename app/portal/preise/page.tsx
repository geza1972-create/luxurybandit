import type { Metadata } from "next";
import { headers } from "next/headers";
import { Check } from "lucide-react";
import { resolveLang } from "@/lib/lang-server";
import { portalPfade } from "@/lib/lakatosbandi-adressen";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import { preiseTexte } from "@/lib/lakatosbandi-preise-texte";
import { eur, VERSUSFORGE_ABO_CENTS, VERSUSFORGE_ABO_GENERIERUNGEN } from "@/lib/pricing";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * DIE PREISSEITE VON LAKATOSBANDI.COM (Owner 14.09.2026: „Preise hast du nicht veröffentlicht").
 *
 * ── ZWEI SPALTEN, MEHR NICHT ────────────────────────────────────────────────────────────────
 *
 * Links, was nichts kostet — und das ist viel: die Seite, zehn Werke, der Agent. Rechts, was das
 * Abo dazugibt. Wer hierherkommt, will eine Zahl und die Antwort auf „was passiert, wenn ich
 * nicht zahle" — beides steht hier, ohne Suchen.
 *
 * DER PREIS WIRD EINGESETZT, NICHT ABGESCHRIEBEN: `VERSUSFORGE_ABO_CENTS` aus `lib/pricing.ts`,
 * dieselbe Quelle wie Kasse, Dashboard und AGB (Skill `bezahlung`, Regel 2). Dasselbe gilt für
 * die Zahl der Generierungen.
 *
 * KEIN KAUFKNOPF HIER: Kaufen kann nur, wer angemeldet ist — die Kasse braucht seinen Mandanten.
 * Der Knopf führt deshalb zum Login, nicht zu Stripe. Ein Kaufknopf, der Fremde in eine Kasse
 * ohne Konto schickt, wäre eine Sackgasse.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Preise — lakatosbandi.com",
  alternates: { canonical: "https://lakatosbandi.com/preise" },
};

export default async function PortalPreise({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const L = portalSprache((await searchParams).lang, await resolveLang("en"));
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  const S = preiseTexte(L);

  const preis = eur(VERSUSFORGE_ABO_CENTS, L);
  const fuellen = (s: string) => s.replace("{preis}", preis).replace("{n}", String(VERSUSFORGE_ABO_GENERIERUNGEN));

  const punkt = (text: string, i: number) => (
    <li key={i} className="flex items-start gap-2.5 text-[16px] leading-[1.55] text-[#333]">
      <Check className="mt-[3px] h-[18px] w-[18px] shrink-0 text-[#1d6fd0]" aria-hidden />
      <span>{fuellen(text)}</span>
    </li>
  );

  return (
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} preise={P.preise} journal={P.journal(L)} />

      <main className="mx-auto w-full max-w-[860px] px-5 pb-16 pt-12 md:pt-16">
        <h1 className="m-0 font-serif text-[36px] font-normal leading-[1.15] md:text-[48px]">{S.titel}</h1>
        <p className="mt-5 max-w-[60ch] text-[17px] leading-[1.65] text-[#444]">{S.intro}</p>

        {/* ── DIE ZWEI SPALTEN ── */}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* Gratis — bewusst zuerst und gleich gross: Es ist kein Lockangebot, sondern das
              eigentliche Versprechen der Plattform. */}
          <section className="rounded-2xl border border-[#e5e5e5] p-6">
            <h2 className="m-0 text-[20px] font-semibold leading-[1.3]">{S.freiTitel}</h2>
            <p className="m-0 mt-2 text-[32px] font-black leading-none tracking-[-0.02em]">{S.freiPreis}</p>
            <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
              {S.freiListe.map(punkt)}
            </ul>
          </section>

          <section className="rounded-2xl border-[1.5px] border-[#111] p-6">
            <h2 className="m-0 text-[20px] font-semibold leading-[1.3]">{S.aboTitel}</h2>
            <p className="m-0 mt-2 text-[32px] font-black leading-none tracking-[-0.02em]">
              {preis}
              <span className="ml-2 align-middle text-[15px] font-semibold text-[#777]">{S.aboZusatz}</span>
            </p>
            <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
              {S.aboListe.map(punkt)}
            </ul>
            {/* Zum Login, nicht zur Kasse — Begründung oben. */}
            <a
              href={`${P.login}?lang=${L}`}
              className="mt-6 block rounded-xl bg-[#111] px-5 py-3.5 text-center text-[16px] font-bold text-white no-underline transition hover:bg-[#333]"
            >
              {S.aboKnopf}
            </a>
          </section>
        </div>

        {/* ── WAS EINE GENERIERUNG IST ── die Frage, die sonst jeder stellt */}
        <section className="mt-12">
          <h2 className="m-0 text-[20px] font-semibold leading-[1.3]">{S.zaehlerTitel}</h2>
          <p className="mt-3 max-w-[65ch] text-[16px] leading-[1.7] text-[#333]">{fuellen(S.zaehlerText)}</p>
        </section>

        {/* ── WAS PASSIERT, WENN ER AUFHÖRT ── */}
        <section className="mt-10 border-t border-[#e5e5e5] pt-8">
          <h2 className="m-0 text-[20px] font-semibold leading-[1.3]">{S.kleingedrucktTitel}</h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {S.kleingedruckt.map((z, i) => (
              <li key={i} className="max-w-[65ch] text-[15.5px] leading-[1.7] text-[#555]">{fuellen(z)}</li>
            ))}
          </ul>
        </section>
      </main>

      <PortalFuss lang={L} />
    </div>
  );
}
