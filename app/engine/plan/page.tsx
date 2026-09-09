import type { Metadata } from "next";
import VersusForgeArchitektur from "@/components/VersusForgeArchitektur";
import { Wortmarke } from "@/components/VersusForgeMarke";
import { MODULE, zustandVon } from "@/lib/versusforge-module";

/**
 * DER BAUPLAN — WAS LÄUFT UND WAS FEHLT (Owner 08.09.2026).
 *
 * Für uns, nicht für Kunden: `noindex`, kein Link von aussen. Er beantwortet die Frage, die
 * sonst jedes Mal ein Gespräch kostet — „wo stehen wir eigentlich?" — und er beantwortet sie
 * aus dem laufenden System, nicht aus dem Gedächtnis.
 *
 * DIE TABELLE DARUNTER ist die Ergänzung, die ein Schaubild nie hat: wo das Modul liegt.
 * Wer daran weiterbaut, soll die Datei nicht suchen müssen.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — Bauplan",
  robots: { index: false, follow: false },
};

export default function VersusForgePlanSeite() {
  const env = process.env;
  const fertig = MODULE.filter(m => zustandVon(m, env) === "laeuft").length;

  return (
    <main className="lb-versusforge lb-bg min-h-screen text-white">
      <div className="mx-auto w-full max-w-[560px] px-4 pb-24 pt-8 md:max-w-[720px]">
        <Wortmarke className="block text-[20px] font-black leading-none tracking-[-0.02em] text-white" />
        <h1 className="mt-2 text-[26px] font-black leading-tight text-white md:text-[34px]">Bauplan</h1>
        <p className="mt-2 text-[14px] font-semibold text-white/55">
          {fertig} von {MODULE.length} Modulen laufen.
        </p>

        <div className="mt-7">
          <VersusForgeArchitektur />
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">Wo es liegt</p>
          <ul className="mt-3 flex flex-col gap-2">
            {MODULE.map(m => (
              <li key={m.name} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-2 last:border-0">
                <span className="text-[13px] font-black text-white/80">{m.name}</span>
                <span className="font-mono text-[12px] text-white/40">{m.wo}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
