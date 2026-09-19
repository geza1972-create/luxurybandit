import KarikaturClient from "./KarikaturClient";

/**
 * ── DAS KARIKATUREN-WERKZEUG (Owner 19.09.2026: „es gibt bei PixVerse ein Karikaturen-Tool,
 * den hätte ich gerne eingebaut") ────────────────────────────────────────────────────────────
 *
 * Eine Seite zum Ausprobieren, noch ohne Platz im Menü: Der Owner wollte das Werkzeug sehen,
 * bevor entschieden wird, wo es hingehört — ins Portal, als eigenes Topic oder als Teil von
 * „You as a picture".
 */
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false } };

export default function KarikaturSeite() {
  return (
    <div className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <main className="mx-auto w-full max-w-[900px] px-5 pb-24 pt-10 md:pt-14">
        <h1 className="m-0 font-serif text-[34px] font-normal leading-[1.15] md:text-[44px]">
          Dein Bild, gezeichnet
        </h1>
        <p className="mt-3 max-w-[58ch] text-[16px] leading-[1.55] text-[#555]">
          Lade ein Foto hoch und wähle einen Stil. Dein Gesicht bleibt deines — nur gezeichnet.
        </p>
        <KarikaturClient />
      </main>
    </div>
  );
}
