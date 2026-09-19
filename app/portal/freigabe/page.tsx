import { notFound } from "next/navigation";
import { mandantPruefen } from "@/lib/versusforge-mandant";
import { EIGENER_MANDANT } from "@/lib/versusforge-namen";
import FreigabeClient from "./FreigabeClient";

/**
 * ── DIE FREIGABE-SEITE (Owner 18.09.2026: „mach mir die Freigabe-Tool") ─────────────────────
 *
 * Nur mit dem Owner-Schlüssel in der Adresse (`?s=…`). Ohne ihn gibt es die Seite nicht — kein
 * Anmeldeformular, keine Fehlermeldung, die verrät, dass hier etwas liegt. Wer den Schlüssel
 * nicht hat, soll nicht einmal wissen, dass es diese Adresse gibt.
 */
export const dynamic = "force-dynamic";

export default async function FreigabeSeite({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const roh = sp.s;
  const s = String((Array.isArray(roh) ? roh[0] : roh) ?? "");
  if (!mandantPruefen(EIGENER_MANDANT, s).ok) notFound();

  /* Die Portal-Hülle wie auf jeder anderen Portalseite (`lb-portal`, weiss). Ohne sie erbt die
     Seite die dunkle Welt von LuxuryBandit — es gibt kein `app/portal/layout.tsx`, jede Seite
     trägt ihre Hülle selbst. */
  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
    <main className="mx-auto w-full max-w-[1120px] px-5 pb-32 pt-10 md:pt-14">
      <h1 className="m-0 font-serif text-[34px] font-normal leading-[1.15] text-[#111] md:text-[44px]">
        Freigabe
      </h1>
      <p className="mt-3 max-w-[60ch] text-[16px] leading-[1.55] text-[#555]">
        Jedes hochgeladene Bild wartet hier, bevor es auf die Seite geht. Markiere, was bleibt und
        was nicht, und schick es in einem Zug ab — jeder Künstler bekommt höchstens eine Nachricht.
      </p>
      <FreigabeClient schluessel={s} />
    </main>
    </div>
  );
}
