import type { Metadata } from "next";
import { Wortmarke } from "@/components/VersusForgeMarke";
import VersusForgeTrichterBild from "@/components/VersusForgeTrichterBild";
import { leadsLesen, type LeadEintrag } from "@/lib/versusforge-lead";
import { mandantPruefen } from "@/lib/versusforge-mandant";

/**
 * DAS DASHBOARD (Owner 08.09.2026: „ich brauche ebenso ein Dashboard, was die Kunden auch
 * bekommen" · „mein Trichter ist ihr Trichter").
 *
 * EINE SEITE, ZWEI LESER. Sie zeigt MIR meine Anfragen und dem Kunden seine — nicht weil
 * das billiger ist, sondern weil es der einzige Weg ist, auf dem sie je gut wird: Ich sehe
 * jeden Tag, was der Kunde sieht. Eine Kundenansicht, die ich selbst nicht benutze, verrottet.
 *
 * WAS HIER STEHT, IST GEMESSEN, NICHT GESCHÄTZT: die Anzahl der Anfragen und ihre Zeiten.
 * Es gibt bewusst KEINE Kampagnenzahlen (Klicks, Reichweite, Kosten je Anfrage) — dafür
 * müsste eine Kampagne laufen, und es läuft keine. Erfundene Zahlen wären genau die
 * Werbeagentur-Masche, gegen die das Produkt gebaut ist.
 *
 * `noindex` und `force-dynamic`: Personendaten werden nie zwischengespeichert und gehören
 * in keine Suchmaschine.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — Anfragen",
  robots: { index: false, follow: false },
};

const zeit = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** Wie viele Anfragen in den letzten n Tagen — die einzige Zahl, die wirklich zählt. */
const seit = (leads: LeadEintrag[], tage: number) => {
  const grenze = Date.now() - tage * 86400_000;
  return leads.filter(l => new Date(l.zeit).getTime() >= grenze).length;
};

function Zahl({ wert, wofuer }: { wert: number | string; wofuer: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3">
      <p className="text-[30px] font-black leading-none text-[#f6cf51] md:text-[38px]">{wert}</p>
      <p className="mt-1.5 text-[13px] font-bold leading-snug text-white/50 md:text-[14px]">{wofuer}</p>
    </div>
  );
}

export default async function VersusForgeAnfragenSeite({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const einer = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] ?? "" : v ?? "");
  const stand = mandantPruefen(einer(q.m), einer(q.s));

  if (!stand.ok) {
    /* Eine ehrliche, knappe Absage — und KEIN Hinweis darauf, ob der Mandant existiert.
       „Falscher Schlüssel" gegen „gibt es nicht" wäre schon eine Auskunft. */
    return (
      <main className="lb-versusforge lb-bg flex min-h-screen items-center justify-center px-4 text-white">
        <div className="w-full max-w-[440px]">
          <Wortmarke className="block text-[20px] font-black leading-none tracking-[-0.02em] text-white" />
          <p className="mt-4 text-[17px] font-semibold leading-relaxed text-white/70">
            {stand.grund === "nicht-eingerichtet"
              ? "Dieses Dashboard ist noch nicht eingerichtet."
              : "Dieser Link stimmt nicht. Nimm den vollständigen Link aus deiner Bestätigung."}
          </p>
        </div>
      </main>
    );
  }

  const leads = await leadsLesen(stand.mandant);

  return (
    <main className="lb-versusforge lb-bg min-h-screen text-white">
      <div className="mx-auto w-full max-w-[560px] px-4 pb-24 pt-8 md:max-w-[720px]">
        <Wortmarke className="block text-[20px] font-black leading-none tracking-[-0.02em] text-white" />
        <h1 className="mt-2 text-[30px] font-black leading-tight text-white md:text-[40px]">Anfragen</h1>
        <p className="mt-2 text-[15px] font-semibold text-white/50 md:text-[16px]">{stand.name}</p>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <Zahl wert={leads.length} wofuer="insgesamt" />
          <Zahl wert={seit(leads, 7)} wofuer="letzte 7 Tage" />
          <Zahl wert={seit(leads, 30)} wofuer="letzte 30 Tage" />
        </div>

        {/* Der ehrliche Satz über das, was NICHT hier steht. Er gehört auf die Seite, nicht
            in eine Fussnote: Wer eine Kampagnenzahl sucht und sie nicht findet, soll wissen,
            dass sie fehlt — nicht, dass sie null ist. */}
        <p className="mt-3 text-[13px] font-semibold leading-relaxed text-white/35 md:text-[14px]">
          Gezählt werden Anfragen, die den Trichter vollständig durchlaufen haben. Zahlen zur
          Kampagne selbst — Reichweite, Klicks, Kosten je Anfrage — stehen hier erst, wenn eine
          Kampagne läuft.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {leads.length === 0 && (
            <div className="rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-6">
              <p className="text-[17px] font-bold text-white/70">Noch keine Anfragen.</p>
              <p className="mt-1.5 text-[14px] font-semibold leading-relaxed text-white/45">
                Sobald jemand den Trichter zu Ende geht und seine Adresse hinterlässt, steht er hier —
                mit dem Plan, über den er gekommen ist.
              </p>
            </div>
          )}

          {leads.map(l => {
            const plan = (l.plan ?? {}) as Record<string, unknown>;
            const hook = typeof plan.hook === "string" ? plan.hook : "";
            const trichter = Array.isArray(plan.trichter) ? (plan.trichter as unknown[]).map(String) : [];
            return (
              <details key={l.datei} className="group rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5">
                <summary className="flex cursor-pointer list-none flex-col gap-1">
                  {/* Die Adresse ist das Wichtigste — sie steht zuerst und ist antippbar.
                      Wer zurückrufen will, soll nicht erst etwas herauskopieren. */}
                  <a href={`mailto:${l.mail}`} className="text-[18px] font-black leading-snug text-[#f6cf51] underline decoration-white/20 underline-offset-4 md:text-[20px]">
                    {l.mail}
                  </a>
                  <span className="text-[13px] font-bold text-white/40 md:text-[14px]">
                    {zeit(l.zeit)}
                    {l.url ? ` · ${l.url}` : ""}
                  </span>
                  {l.text && (
                    <span className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-white/70 md:text-[16px]">
                      {l.text}
                    </span>
                  )}
                  <span className="mt-1 text-[13px] font-bold text-white/35 group-open:hidden">Plan ansehen</span>
                </summary>

                <div className="mt-4 border-t border-white/10 pt-4">
                  {/* DAS PROTOKOLL ZUERST (Owner 08.09.2026: „ich brauche das auch").
                      Wer gleich zum Telefon greift, braucht nicht den Hook, sondern die
                      Sätze des Menschen. Der Plan steht darunter. */}
                  {!!l.runden?.length && (
                    <div className="mb-5">
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">Was er gesagt hat</p>
                      <div className="mt-2.5 flex flex-col gap-2.5">
                        {l.runden.map((r, i) => (
                          <div key={i}>
                            <p className="text-[13px] font-bold leading-snug text-white/40">{i + 1}. {r.frage}</p>
                            <p className="mt-0.5 text-[15px] font-semibold leading-snug text-white/85">{r.antwort?.trim() || "—"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {hook && (
                    <>
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">Hook</p>
                      <p className="mt-1.5 text-[19px] font-black leading-tight text-white md:text-[22px]">{hook}</p>
                    </>
                  )}
                  {trichter.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">Trichter</p>
                      <VersusForgeTrichterBild className="mt-2.5" schritte={trichter} />
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </main>
  );
}
