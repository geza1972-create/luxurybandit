import type { Metadata } from "next";
import { gespraecheListe, gespraechLesen } from "@/lib/versusforge-lauf";
import { leadsOffen } from "@/lib/kuenstler-lead";
import { Wortmarke } from "@/components/VersusForgeMarke";
import EngineLive from "@/components/EngineLive";
import EngineVerlauf from "@/components/EngineVerlauf";
import EngineWerke from "@/components/EngineWerke";

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

/* „vor 20 Minuten" statt einer Uhrzeit — bei einem Wartenden zählt, WIE LANGE schon, nicht WANN
   genau. Ab einem Tag reicht das Datum, dann interessiert die genaue Stunde nicht mehr. */
const wartetSeit = (s: string) => {
  const d = Date.parse(s);
  if (!Number.isFinite(d)) return "";
  const min = Math.max(0, Math.round((Date.now() - d) / 60000));
  if (min < 60) return `vor ${min} Min.`;
  const std = Math.round(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  return `vor ${Math.round(std / 24)} Tg.`;
};

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
                {/* SEINE ADRESSE, WIRKLICH ZU SEHEN (Owner 14.09.2026: „einfach sammeln"). Nur
                    gesetzt beim ersten Zug — siehe Begründung in lib/versusforge-lauf.ts. */}
                {z.kontakt && (
                  <p className="m-0 mt-2.5 text-[13px] font-bold text-[#14181c]">
                    {z.kontakt.name || "(ohne Namen)"} · <span className="font-normal text-[#5b666f]">{z.kontakt.mail}</span>
                  </p>
                )}
                <p className="m-0 mt-2.5 whitespace-pre-wrap rounded-xl bg-[#1d6fd0] px-3.5 py-2.5 text-[15px] font-semibold leading-snug text-white">{z.mensch}</p>
                {/* SEINE BILDER IN DIESEM ZUG (Owner 11.09.2026: „ich will alles sehen, was sie hochladen, schon
                    hier") — nur hier, mit demselben Schlüssel wie die Seite selbst, keine öffentliche Adresse. */}
                {!!z.fotos?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {z.fotos.map((f, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={`/api/versusforge-lauf-foto?p=${encodeURIComponent(f)}&s=${encodeURIComponent(schluessel)}`}
                        alt="" className="h-28 w-28 rounded-xl border border-[#e4e9ee] object-cover" />
                    ))}
                  </div>
                )}
                <p className="m-0 mt-2 whitespace-pre-wrap rounded-xl bg-[#f1f4f7] px-3.5 py-2.5 text-[15px] leading-snug">{z.agent}</p>
                {/**
                 * ── WIE SEINE SEITE AUSGESEHEN HÄTTE (Owner 14.09.2026, zu einem Spruch ohne
                 * Fortsetzung: „der hat seine email nicht angegeben oder? das heisst der wollte
                 * nur den spruch haben. Er solle hier gleich mehr zu sehen bekommen — sowas wie
                 * [Adrian Roșus Werkseite]") ────────────────────────────────────────────────
                 *
                 * NUR BEI EINEM SPRUCH MIT BILD: Sonst gibt es nichts zu zeigen. Derselbe
                 * Bildpfad wie oben, derselbe Schlüssel — dieselbe geschützte Adresse.
                 *
                 * ── RICHTIGGESTELLT (Owner 14.09.2026, direkt danach: „aber email hat sie
                 * angeben sonst hätte sie keine analyse bekommen?") ─────────────────────────
                 *
                 * Er hatte recht: Der Knopf zur Analyse ist im Browser gesperrt, bis Name UND
                 * eine gültige E-Mail eingetragen sind (`disabled={!rechte || !kontakt.name…}`
                 * in AgentChat.tsx) — seit dem Umbau „Es gibt kein Gratis mehr". Eine Adresse
                 * WURDE also gegeben. Sie steht nur nicht in DIESEM Protokoll: Der Zug hier
                 * trägt nur den festen Platzhalter „[Werk hochgeladen]", nie die echten Angaben
                 * (`lib/versusforge-lauf.ts`). Die Wahrheit ist also nicht „keine Adresse",
                 * sondern „Adresse gegeben, danach nie ‚Ja, veröffentlichen' gesagt".
                 */}
                {z.werkzeuge.includes("spruch") && !!z.fotos?.length && (
                  <div className="mt-3 border-t border-dashed border-[#e4e9ee] pt-3">
                    <p className="m-0 text-[11px] font-black uppercase tracking-[0.14em] text-[#a8a196]">
                      So hätte seine Seite ausgesehen
                    </p>
                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 bg-white p-3">
                      <div className="flex items-start justify-center bg-[#f5f5f5]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/versusforge-lauf-foto?p=${encodeURIComponent(z.fotos[0])}&s=${encodeURIComponent(schluessel)}`}
                          alt="" className="max-h-[220px] max-w-full object-contain" />
                      </div>
                      <div>
                        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b959d]">
                          {z.kontakt?.name || "Vizitator"}
                        </p>
                        <p className="m-0 mt-2 font-serif text-[19px] leading-[1.3] text-[#14181c]">{z.agent}</p>
                        <p className="m-0 mt-3 text-[12.5px] text-[#a8a196]">
                          {z.kontakt?.mail ? `${z.kontakt.mail} · ` : ""}A primit analiza, dar nu a confirmat publicarea — pagina n-a fost creată.
                        </p>
                        {/**
                         * ── DER GRÜNDER-DANK, NUR HIER INTERN (Owner 14.09.2026: „ein Bild von
                         * uns zwei, die Gründer, die wir ihn empfehlen … dass wir uns bedanken
                         * für das schöne Bild und hätten das gerne in unserer Online Galerie") ──
                         *
                         * BEWUSST NICHT ÖFFENTLICH (Owner, in derselben Antwort): Das ist eine
                         * Vorschau für DICH, kein Baustein für die echte Seite. Ein Foto von
                         * echten Menschen gehört nicht ungefragt vor einen Besucher, der nie
                         * zugestimmt hat, mit uns abgebildet zu werden.
                         */}
                        <div className="mt-3 flex items-center gap-2.5 border-t border-dashed border-[#e4e9ee] pt-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/lakatosbandi/geza-szidonia.jpg" alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          <p className="m-0 text-[12.5px] leading-[1.4] text-[#5b666f]">
                            Mulțumim pentru lucrare — ne-ar plăcea să o avem în galeria noastră online.
                            <span className="block text-[11px] text-[#a8a196]">Géza & Szidonia, fondatorii lakatosbandi.com</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!zuege.length && <p className="text-[15px] text-[#5b666f]">Zu diesem Gespräch liegt nichts vor.</p>}
          </div>
        </div>
      </main>
    );
  }

  /* WER AUS DEM SOFORTFORMULAR NOCH AUF SEINEN KLICK WARTET (Owner 14.09.2026). Läuft parallel
     zur Gesprächsliste — beide Abfragen sind unabhängig voneinander. */
  const wartend = await leadsOffen().catch(() => []);

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

        {/* WER GERADE DA IST (Owner 14.09.2026: „live dashboard … wo ich sehe jemand öffnet den
            tunel"). Holt sich seinen Stand selbst, alle acht Sekunden — eine Server-Seite steht
            nach dem Rendern still. */}
        <EngineLive schluessel={schluessel} />
        <EngineVerlauf schluessel={schluessel} />
        <EngineWerke schluessel={schluessel} />

        {/* ── WER AUS DEM SOFORTFORMULAR NOCH AUF SEINEN KLICK WARTET ─────────────────────────
            Owner 14.09.2026, nachdem er im WhatsApp-Alarm einen Lead sah, aber nirgends fand,
            ob dieser Mensch die Mail schon geöffnet hat: „Eine Markierung im Dashboard bauen".
            Nur sichtbar, solange die Liste nicht leer ist — eine leere Karte wäre Lärm. */}
        {!!wartend.length && (
          <div className="mt-5 rounded-2xl border border-[#f0c675] bg-[#fff8ec] px-4 py-3.5">
            <p className="m-0 text-[13px] font-black uppercase tracking-[0.1em] text-[#a5720b]">
              {wartend.length} wartet{wartend.length === 1 ? "" : "en"} noch auf den Klick
            </p>
            <div className="mt-2.5 flex flex-col gap-1.5">
              {wartend.slice(0, 12).map(l => (
                <p key={l.mail + l.angelegt} className="m-0 flex flex-wrap items-baseline gap-x-2 text-[14.5px]">
                  <span className="font-bold text-[#14181c]">{l.name || l.mail}</span>
                  <span className="text-[#8b959d]">{l.mail}</span>
                  <span className="text-[#a5720b]">{wartetSeit(l.angelegt)}</span>
                </p>
              ))}
              {wartend.length > 12 && (
                <p className="m-0 text-[13px] text-[#a5720b]">+{wartend.length - 12} weitere</p>
              )}
            </div>
          </div>
        )}

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
