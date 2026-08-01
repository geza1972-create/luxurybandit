import type { Metadata } from "next";
import WerkAnsicht from "@/components/WerkAnsicht";

/**
 * DIE WERK-SEITE — /w/[id] (OFFEN.md Punkt 2, gebaut am 01.08.2026 mit der Zusatzregel des
 * Owners: geteilt wird die KARTE, und der Besitzer bestätigt vorher, dass sie öffentlich
 * wird).
 *
 * `noindex`: Die Seite gehört dem Kunden, nicht Google. Wer den Link hat, soll sie sehen —
 * gefunden werden soll sie nicht.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "LuxuryBandit",
};

export default async function WerkSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="lb-bg min-h-screen text-white">
      <WerkAnsicht id={String(id ?? "")} />
    </main>
  );
}
