import TopNav from "@/components/TopNav";
import CIMuster from "@/components/CIMuster";

/**
 * /ci — DIE LEBENDE MUSTER-SEITE DER CI-BIBLIOTHEK (Owner 06.08.2026: „ich will die
 * Bibliothek immer abrufen können. Am besten in jedem Menü einbauen. Damit ich es local
 * sehen kann").
 *
 * Erreichbar über den Staff-Punkt im Menü und jederzeit direkt unter /ci. Öffentlich, aber
 * `noindex` — sie gehört dem Haus, nicht Google. Inhalt: components/CIMuster (Client, wegen
 * Dialog-Demo und Chip-Zustand).
 */

export const metadata = {
  title: "CI-Bibliothek — Bausteine | LuxuryBandit",
  robots: { index: false, follow: false },
};

export default function CISeite() {
  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav />
      <CIMuster />
    </main>
  );
}
