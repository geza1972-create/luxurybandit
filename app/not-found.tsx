import Link from "next/link";
import { headers } from "next/headers";
import { resolveLang } from "@/lib/lang-server";
import { imPortal, portalPfade } from "@/lib/lakatosbandi-adressen";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * DIE SEITE „GIBT ES NICHT" (Owner 11.09.2026, mit Bild von lakatosbandi.com/geza: „ist das die
 * Seite?").
 *
 * VORHER GAB ES KEINE: Next zeigte seine eingebaute 404 — helle Schrift auf hellem Grund, in der
 * schmalen Haus-Spalte, auf einem Portal, das sonst schwarz auf weiss und breit ist. Wer einen alten
 * Link hatte, sah eine leere Fläche und hielt die Seite für kaputt.
 *
 * AUF LAKATOSBANDI.COM IM PORTAL-KLEID: Kopf, ein Satz, der Weg zur Startseite, Fuss — in der Sprache
 * des Besuchers. Auf allen anderen Domains schlicht und lesbar.
 */
export default async function NichtGefunden() {
  const host = (await headers()).get("host");

  if (imPortal(host)) {
    const L = portalSprache(undefined, await resolveLang("en"));
    const T = portalTexte(L);
    const P = portalPfade(host);
    return (
      <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
        <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
        <main className="mx-auto w-full max-w-[720px] px-5 pb-24 pt-24 text-center">
          <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.22em] text-[#777]">404</p>
          <h1 className="m-0 mt-4 font-serif text-[34px] font-normal leading-[1.15] md:text-[46px]">{T.nichtGefunden}</h1>
          <Link href={P.start}
            className="mt-9 inline-block bg-[#111] px-7 py-4 text-[16px] font-semibold text-white no-underline hover:bg-[#333]">
            {T.zurStart}
          </Link>
        </main>
        <PortalFuss lang={L} />
      </div>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-6 text-center text-[#14181c]">
      <p className="m-0 text-[13px] font-bold uppercase tracking-[0.2em] text-[#8b959d]">404</p>
      <h1 className="m-0 mt-3 text-[26px] font-extrabold leading-[1.2]">This page could not be found.</h1>
      <Link href="/" className="mt-6 rounded-full bg-[#14181c] px-6 py-3 text-[15px] font-bold text-white no-underline">
        Home
      </Link>
    </main>
  );
}
