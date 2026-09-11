import type { Metadata } from "next";
import { gespraecheListe, gespraechLesen } from "@/lib/versusforge-lauf";
import { Wortmarke } from "@/components/VersusForgeMarke";

/**
 * WAS IN DEN GESPRÄCHEN WIRKLICH PASSIERT.
 *
 * ── DIE FRAGE, DIE SIE BEANTWORTET (Owner 10.09.2026) ───────────────────────────────────────
 *
 * „Wo steigen sie aus, und was kostet mich das?" — beides war bis heute unbeantwortbar. Der
 * Agent hat gesprochen und nichts hinterlassen; nur wer bis zur E-Mail durchhielt, wurde als
 * Anfrage sichtbar. Die Mehrheit bricht vorher ab, und genau die ist interessant.
 *
 * ── ZWEI ZAHLEN, MEHR NICHT ─────────────────────────────────────────────────────────────────
 *
 * WIE WEIT und WIE TEUER. Alles andere — Klicks, Verweildauer, Absprungrate — wäre eine
 * Datentafel, die niemand liest ([[funnel-analytics-insights]] zeigt, wo das endet). Wer
 * mehr wissen will, klappt ein Gespräch auf und LIEST es. Ein Agent ist Text; die ehrlichste
 * Auswertung ist, ihn zu lesen.
 *
 * ── SIE IST GESCHÜTZT WIE DAS DASHBOARD ─────────────────────────────────────────────────────
 *
 * Hier stehen fremde Gespräche. Derselbe Schlüssel wie bei den Anfragen, dieselbe knappe
 * Absage ohne Auskunft darüber, ob es die Seite gibt.
 *
 * NICHT INDEXIEREN, und das ist keine Formalie: Was Menschen über ihr Geschäft erzählen,
 * gehört nicht in eine Suchmaschine.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — Gespräche",
  robots: { index: false, follow: false },
};

const zeit = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const euro = (n: number) => `${(n).toFixed(3).replace(".", ",")} €`;

export default async function GespraecheSeite({ searchParams }: {
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

  /* Ein einzelnes Gespräch, vollständig — der Weg aus der Rückruf-Mail hierher. */
  const eines = einer(q.g);
  if (eines) {
    const zuege = await gespraechLesen(eines);
    const summe = zuege.reduce((n, z) => n + z.euro, 0);
    return (
      <main className="min-h-screen bg-white px-4 py-8 text-[#14181c]">
        <div className="mx-auto w-full max-w-[760px]">
          <Wortmarke className="block text-[20px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
          <p className="mt-5 text-[13px] font-black uppercase tracking-[0.16em] text-[#8b959d]">
            {zuege.length} Züge · {euro(summe)}
          </p>
          <div className="mt-5 flex flex-col gap-5">
            {zuege.map(z => (
              <div key={z.nr} className="rounded-2xl border border-[#e4e9ee] p-4">
                <p className="m-0 text-[12.5px] font-bold text-[#8b959d]">
                  {z.nr} · {zeit(z.zeit)} · {(z.dauer / 1000).toFixed(1)}s · {z.hinein}+{z.heraus} Token · {euro(z.euro)}
                  {z.werkzeuge.length ? ` · ${z.werkzeuge.join(", ")}` : ""}
                </p>
                <p className="m-0 mt-2.5 whitespace-pre-wrap rounded-xl bg-[#1d6fd0] px-3.5 py-2.5 text-[15px] font-semibold leading-snug text-white">{z.mensch}</p>
                <p className="m-0 mt-2 whitespace-pre-wrap rounded-xl bg-[#f1f4f7] px-3.5 py-2.5 text-[15px] leading-snug">{z.agent}</p>
              </div>
            ))}
            {!zuege.length && <p className="text-[15px] text-[#5b666f]">Zu diesem Gespräch liegt nichts vor.</p>}
          </div>
        </div>
      </main>
    );
  }

  const liste = await gespraecheListe(100);
  const mitZuegen = liste.filter(g => g.letzter);
  /* Absteigend nach Zeit — das Neueste zuerst, wie in jedem Posteingang. */
  mitZuegen.sort((a, b) => String(b.letzter?.zeit ?? "").localeCompare(String(a.letzter?.zeit ?? "")));

  const gesamt = mitZuegen.reduce((n, g) => n + (g.letzter?.euro ?? 0) * g.zuege, 0);
  /* Die eine Zahl, die zählt: Wie viele kommen über den dritten Zug hinaus? Davor ist es
     Neugier, danach ist es ein Gespräch. */
  const weit = mitZuegen.filter(g => g.zuege >= 3).length;

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[#14181c]">
      <div className="mx-auto w-full max-w-[760px]">
        <Wortmarke className="block text-[20px] font-black leading-none tracking-[-0.02em]" akzent="#1d6fd0" />
        <h1 className="mt-4 text-[28px] font-black leading-[1.06]">Gespräche</h1>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            [String(mitZuegen.length), "angefangen"],
            [String(weit), "über 3 Züge"],
            [euro(gesamt), "zusammen"],
          ].map(([a, b]) => (
            <div key={b} className="rounded-2xl border border-[#e4e9ee] px-3.5 py-3">
              <p className="m-0 text-[22px] font-black leading-none">{a}</p>
              <p className="m-0 mt-1.5 text-[13.5px] font-bold text-[#8b959d]">{b}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          {mitZuegen.map(g => (
            <a
              key={g.gespraech}
              href={`/engine/gespraeche?s=${encodeURIComponent(schluessel)}&g=${encodeURIComponent(g.gespraech)}`}
              className="rounded-2xl border border-[#e4e9ee] px-4 py-3.5 transition hover:border-[#1d6fd0]"
            >
              <p className="m-0 flex flex-wrap items-baseline gap-x-2.5 text-[13.5px] font-bold text-[#8b959d]">
                <span className="text-[#14181c]">{g.zuege} Züge</span>
                <span>{zeit(g.letzter?.zeit ?? "")}</span>
                <span>{g.letzter?.sprache}</span>
                {!!g.letzter?.werkzeuge?.length && <span>{g.letzter.werkzeuge.join(", ")}</span>}
              </p>
              <p className="m-0 mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug">{g.letzter?.mensch}</p>
            </a>
          ))}
          {!mitZuegen.length && <p className="text-[15px] text-[#5b666f]">Noch keine Gespräche aufgezeichnet.</p>}
        </div>
      </div>
    </main>
  );
}
