import type { Metadata } from "next";
import { alleMandantenTraffic } from "@/lib/versusforge-schritt";
import { Wortmarke } from "@/components/VersusForgeMarke";

/**
 * DIE GESAMTÜBERSICHT ÜBER ALLE KÜNSTLER (Owner 11.09.2026: „wo sehe ich die Traffic, gesamten" —
 * nachdem er nach `/{kuenstler}/dashboard` gefragt hatte und dort nur EINEN Künstler sah).
 *
 * `/engine/gespraeche` beantwortet „was reden die Leute im Anmelde-Chat". Diese Seite beantwortet
 * die andere Hälfte: „wie viele Besucher haben wir insgesamt, über alle Künstler, pro Tag — und
 * wer bringt was". Nicht host-gebunden wie die Künstler-Dashboards (`app/admin/*` läuft auf jeder
 * Domain, die auf diese Next.js-App zeigt), damit sie unter versusforge.com UND lakatosbandi.com
 * erreichbar ist.
 *
 * GESCHÜTZT WIE DIE ANDEREN ADMIN-SEITEN: derselbe `VERSUSFORGE_DASHBOARD_KEY`, dieselbe knappe
 * Absage ohne Auskunft darüber, ob es die Seite gibt.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — Traffic",
  robots: { index: false, follow: false },
};

const balken = (n: number, max: number) => `${max > 0 ? Math.max(4, Math.round((n / max) * 100)) : 0}%`;
const tagKurz = (tag: string) => {
  const d = new Date(`${tag}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? tag : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
};

export default async function TrafficSeite({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const einer = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");
  const schluessel = process.env.VERSUSFORGE_DASHBOARD_KEY ?? "";

  if (!schluessel || einer(q.s) !== schluessel) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <p className="text-[17px] font-semibold text-[#5b666f]">Dieser Link stimmt nicht.</p>
      </main>
    );
  }

  const tageZahl = Math.max(1, Math.min(90, Number(einer(q.tage)) || 14));
  const { proTag, proMandant, gesamt, abschluesseGesamt } = await alleMandantenTraffic(tageZahl);
  const max = Math.max(1, ...proTag.map(t => t.anzahl));

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[#14181c]">
      <div className="mx-auto w-full max-w-[760px]">
        <Wortmarke className="block text-[20px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
        <h1 className="mt-4 text-[28px] font-black leading-[1.06]">Traffic</h1>
        <p className="mt-1.5 text-[13.5px] font-bold text-[#8b959d]">Letzte {tageZahl} Tage, über alle Künstler</p>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            [String(gesamt), "Besucher"],
            [String(proMandant.length), "Künstler mit Besuchen"],
            [String(abschluesseGesamt), "bis zum Ende"],
          ].map(([a, b]) => (
            <div key={b} className="rounded-2xl border border-[#e4e9ee] px-3.5 py-3">
              <p className="m-0 text-[22px] font-black leading-none">{a}</p>
              <p className="m-0 mt-1.5 text-[13.5px] font-bold text-[#8b959d]">{b}</p>
            </div>
          ))}
        </div>

        {/* ── PRO TAG, ALS BALKEN (Owner: „wo sehe ich die Traffic") — kein Chart, nur so viel, dass ein
            Trend sichtbar wird. Fehlende Tage stehen nicht in der Liste (kein Besuch, keine Zeile). ── */}
        <section className="mt-8">
          <h2 className="m-0 text-[15px] font-black">Pro Tag</h2>
          <div className="mt-3 flex flex-col gap-1.5">
            {proTag.map(t => (
              <div key={t.tag} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-[12.5px] font-bold text-[#8b959d]">{tagKurz(t.tag)}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-[#f1f4f7]">
                  <div className="h-full rounded-full bg-[#1d6fd0]" style={{ width: balken(t.anzahl, max) }} />
                </div>
                <span className="w-6 shrink-0 text-right text-[13px] font-bold">{t.anzahl}</span>
              </div>
            ))}
            {!proTag.length && <p className="text-[15px] text-[#5b666f]">Noch keine Besuche im Zeitraum.</p>}
          </div>
        </section>

        {/* ── PRO KÜNSTLER — wer bringt was, und wer kommt bis zum Ende seines Trichters. ── */}
        <section className="mt-10">
          <h2 className="m-0 text-[15px] font-black">Pro Künstler</h2>
          <div className="mt-3 flex flex-col gap-2">
            {proMandant.map(m => (
              <div key={m.mandant} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4e9ee] px-4 py-3">
                <span className="truncate text-[15px] font-semibold">{m.mandant}</span>
                <span className="shrink-0 text-[13.5px] font-bold text-[#8b959d]">
                  {m.besucher} Besucher{m.abschluss ? ` · ${m.abschluss} bis zum Ende` : ""}
                </span>
              </div>
            ))}
            {!proMandant.length && <p className="text-[15px] text-[#5b666f]">Noch keine Besuche im Zeitraum.</p>}
          </div>
        </section>

        <p className="mt-10 text-[13px] text-[#8b959d]">
          Ein Trichter im Einzelnen: <code>/{"{"}künstler{"}"}/dashboard?s=…</code>. Der Anmelde-Chat im Wortlaut: <code>/engine/gespraeche?s=…</code>.
        </p>
      </div>
    </main>
  );
}
