import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { folgenBestaetigen } from "@/lib/kuenstler-follower";
import { portalPfade, kuenstlerUrl } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * DER KLICK, DER AUS EINER ADRESSE EINEN FOLLOWER MACHT (Owner 13.09.2026).
 *
 * Bis hierher lag die Adresse nur in der Warteablage. Erst dieser Aufruf trägt sie in die Liste
 * des Künstlers ein — und nur, wer die Mail lesen kann, kommt hierher. Der Token gilt einmal.
 *
 * Danach geht es auf die Seite des Künstlers: Er hat gerade gesagt, dass ihn dessen Arbeit
 * interessiert — dann soll er sie auch sehen und nicht auf einer Dankeseite stehen bleiben.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "lakatosbandi.com", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PortalFolgenBestaetigen({ searchParams }: Props) {
  const sp = await searchParams;
  const mandant = await folgenBestaetigen(String(sp.t ?? ""));
  if (mandant) redirect(`${kuenstlerUrl(mandant)}?gefolgt=1`);

  /* Kein Token, schon eingelöst oder abgelaufen — ein ruhiger Satz, keine Auskunft darüber, ob es
     die Anmeldung gab. */
  const L = portalSprache(sp.lang, "en");
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  return (
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
      <main className="mx-auto w-full max-w-[560px] px-5 pb-24 pt-14">
        <p className="m-0 text-[18px] leading-[1.5]">{T.folgenUngueltig}</p>
      </main>
      <PortalFuss lang={L} />
    </div>
  );
}
