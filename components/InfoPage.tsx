import { ReactNode } from "react";
import ZurueckPfeil from "@/components/ZurueckPfeil";
import HashSprung from "@/components/HashSprung";

// Shared shell for static info/legal pages (About, Terms, Privacy, Imprint).
export default function InfoPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-white pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        {/* Hier stand `<Link href="/stores">` — ein Pfeil, der nicht zurückging, sondern zum
            Models-Marktplatz sprang (Owner 05.08.2026). Siehe components/ZurueckPfeil. */}
        <ZurueckPfeil />
        <p className="text-sm font-black text-black">{title}</p>
      </header>
      {/* Holt den Sprung auf `#…` nach, wenn der Router die Seite frisch aufbaut. */}
      <HashSprung />
      {/* `scroll-mt-16`: Die Kopfleiste klebt oben — ohne diesen Abstand landet die
          angesprungene Überschrift DAHINTER, und man liest ab dem zweiten Satz. */}
      <article className="mx-auto max-w-2xl px-5 py-6 text-[15px] leading-relaxed text-black/75 [&_h2]:mt-6 [&_h2]:mb-1.5 [&_h2]:scroll-mt-16 [&_h2]:text-base [&_h2]:font-black [&_h2]:text-black [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:scroll-mt-16 [&_h3]:font-black [&_h3]:text-black [&_p]:mb-3 [&_a]:font-bold [&_a]:text-cobalt [&_a]:underline">
        {children}
      </article>
    </main>
  );
}
