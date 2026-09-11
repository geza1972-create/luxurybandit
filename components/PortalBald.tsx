import type { BaldTexte } from "@/lib/lakatosbandi-bald-texte";

/**
 * DIE INHALTE UNTER „BALD ONLINE" — warum, was, wie, Auswahl, Kosten, Warum jetzt, Fragen.
 * Texte und Begründung in lib/lakatosbandi-bald-texte.ts.
 *
 * DERSELBE STIL WIE DAS PORTAL: weiß, schwarze Schrift, Serif für Überschriften, dünne Linien.
 * Die Stein-Geschichte steht als vier Karten nebeneinander — dieselben vier Sätze wie im Chat
 * (lib/versusforge-stein.ts), damit Anzeige, Chat und Seite dieselbe Geschichte erzählen.
 *
 * Die häufigen Fragen gehen zusätzlich als FAQPage an Google — derselbe Text wie sichtbar.
 */
export default function PortalBald({ B, preis, bewerben, knopf }: {
  B: BaldTexte;
  preis: string;
  bewerben: string;
  knopf: string;
}) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: B.fragen.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const H2 = "m-0 font-serif text-[28px] font-normal leading-[1.2] md:text-[36px]";
  const P = "mt-4 max-w-[680px] text-[16.5px] leading-[1.65] text-[#444]";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />

      {/* ── DER STEIN ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#777]">{B.steinKicker}</p>
        <h2 className={`${H2} mt-3`}>{B.steinTitel}</h2>
        {/* DIE FOLIEN GROSS (Owner 10.09.2026: „mach den Slide rein, groß") — wie ein
            Instagram-Karussell: große Karten im Format 4:5, seitlich wischen, jede rastet ein.
            Nur CSS, kein Skript. */}
        <ol className="-mx-5 mt-8 flex list-none snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] md:mx-0 md:px-0">
          {B.steinFolien.map((f, i) => (
            <li key={i} className={`flex aspect-[4/5] w-[82%] shrink-0 snap-start flex-col justify-between p-7 sm:w-[46%] md:p-10 lg:w-[31%] ${i === B.steinFolien.length - 1 ? "bg-[#111] text-white" : "border border-[#e5e5e5] bg-[#f6f4ef]"}`}>
              <span className={`text-[13px] font-semibold ${i === B.steinFolien.length - 1 ? "text-white/50" : "text-[#999]"}`}>{i + 1} / {B.steinFolien.length}</span>
              <div>
                <p className="m-0 font-serif text-[32px] font-normal leading-[1.12] md:text-[40px]">{f.gross}</p>
                <p className={`m-0 mt-4 text-[13px] font-semibold uppercase tracking-[0.16em] ${i === B.steinFolien.length - 1 ? "text-white/60" : "text-[#888]"}`}>{f.klein}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-[720px] border-l-2 border-[#111] pl-4 text-[18px] font-semibold leading-[1.5]">{B.steinSchluss}</p>
      </section>

      {/* ── BEISPIEL (Owner: „mach ein Beispiel noch rein") — gemeinfreies Werk, als Beispiel beschriftet. ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#777]">{B.beispielKicker}</p>
        <h2 className={`${H2} mt-3`}>{B.beispielTitel}</h2>
        <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-2 md:items-start">
          <figure className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lakatosbandi/beispiel-sternennacht.jpg" alt="Vincent van Gogh, The Starry Night, 1889" loading="lazy"
              className="block w-full max-w-[420px] bg-[#f5f5f5] object-contain" />
            <figcaption className="mt-3 text-[13px] leading-[1.5] text-[#888]">{B.beispielQuelle}</figcaption>
          </figure>
          <div>
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#999]">{B.beispielVorherLabel}</p>
            <p className="m-0 mt-2 text-[17px] leading-[1.5] text-[#999] line-through decoration-[#ccc]">{B.beispielVorher}</p>
            <p className="m-0 mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#999]">{B.beispielGesehenLabel}</p>
            <p className="m-0 mt-2 text-[16px] leading-[1.6] text-[#555]">{B.beispielGesehen}</p>
            <p className="m-0 mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#111]">{B.beispielNachherLabel}</p>
            <p className="m-0 mt-2 font-serif text-[28px] leading-[1.25] md:text-[34px]">{B.beispielNachher}</p>
            <p className="m-0 mt-6 border-l-2 border-[#111] pl-4 text-[16px] font-semibold leading-[1.5]">{B.beispielWarum}</p>
          </div>
        </div>
      </section>

      {/* ── WARUM ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.warumTitel}</h2>
        {B.warumText.map((t, i) => <p key={i} className={P}>{t}</p>)}
        <p className="mt-6 max-w-[720px] border-l-2 border-[#111] pl-4 text-[18px] font-semibold leading-[1.5]">{B.warumRegel}</p>
      </section>

      {/* ── WAS DU BEKOMMST ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.wasTitel}</h2>
        <ul className="mt-8 grid list-none grid-cols-1 gap-x-10 gap-y-8 p-0 md:grid-cols-2">
          {B.was.map((w, i) => (
            <li key={i}>
              <h3 className="m-0 text-[18px] font-semibold">{w.t}</h3>
              <p className="m-0 mt-2 text-[15.5px] leading-[1.6] text-[#555]">{w.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── PRINZIPIEN (Owner: „sag unser Prinzip, Marketingprinzip") ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.prinzipTitel}</h2>
        <ol className="mt-8 grid list-none grid-cols-1 gap-x-10 gap-y-8 p-0 md:grid-cols-2">
          {B.prinzipien.map((p, i) => (
            <li key={i} className="flex gap-4">
              <span className="font-serif text-[26px] leading-none text-[#bbb]">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="m-0 text-[17px] font-semibold">{p.t}</h3>
                <p className="m-0 mt-2 text-[15px] leading-[1.6] text-[#555]">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── WAS UNS ANDERS MACHT ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.einzigTitel}</h2>
        <ul className="mt-8 grid list-none grid-cols-1 gap-px bg-[#e5e5e5] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {B.einzig.map((e, i) => (
            <li key={i} className="bg-white p-6">
              <h3 className="m-0 text-[17px] font-semibold">{e.t}</h3>
              <p className="m-0 mt-2 text-[15px] leading-[1.6] text-[#555]">{e.d}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── WIE ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.wieTitel}</h2>
        <ol className="mt-8 grid list-none grid-cols-1 gap-8 p-0 md:grid-cols-4">
          {B.wie.map((s, i) => (
            <li key={i}>
              <span className="font-serif text-[34px] leading-none text-[#bbb]">{i + 1}</span>
              <h3 className="m-0 mt-3 text-[17px] font-semibold">{s.t}</h3>
              <p className="m-0 mt-2 text-[15px] leading-[1.6] text-[#555]">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── WIE WIR REKRUTIEREN (Owner: „und wie wir rekrutieren") ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.rekrutTitel}</h2>
        <p className={P}>{B.rekrutLead}</p>
        <ol className="mt-8 list-none space-y-0 border-l border-[#ddd] p-0 pl-6">
          {B.rekrut.map((r, i) => (
            <li key={i} className="relative pb-7 last:pb-0">
              <span className="absolute -left-[31px] top-[5px] h-[11px] w-[11px] rounded-full border-2 border-[#111] bg-white" aria-hidden />
              <h3 className="m-0 text-[17px] font-semibold">{r.t}</h3>
              <p className="m-0 mt-1.5 max-w-[680px] text-[15px] leading-[1.6] text-[#555]">{r.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── AUSWAHL UND KOSTEN ── */}
      <section className="mt-20 grid grid-cols-1 gap-12 border-t border-[#e5e5e5] pt-12 md:grid-cols-2">
        <div>
          <h2 className={H2}>{B.auswahlTitel}</h2>
          {B.auswahlText.map((t, i) => <p key={i} className={P}>{t}</p>)}
        </div>
        <div>
          <h2 className={H2}>{B.kostenTitel}</h2>
          {B.kostenText.map((t, i) => <p key={i} className={P}>{t.replace(/\{[^}]*\}/, preis)}</p>)}
        </div>
      </section>

      {/* ── WARUM JETZT (Owner: „noi suntem fondatorii" — keine Gründungskünstler) ── */}
      <section className="mt-20 bg-[#111] px-6 py-12 text-white md:px-12">
        <h2 className="m-0 font-serif text-[28px] font-normal leading-[1.2] md:text-[36px]">{B.gruenderTitel}</h2>
        {B.gruenderText.map((t, i) => <p key={i} className="mt-4 max-w-[680px] text-[16.5px] leading-[1.65] text-white/80">{t}</p>)}
        <a href={bewerben} className="mt-8 inline-block bg-white px-7 py-4 text-[16px] font-semibold text-[#111] no-underline hover:bg-[#e5e5e5]">{knopf}</a>
      </section>

      {/* ── VERSUSFORGE ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#777]">{B.vfKicker}</p>
        <h2 className={`${H2} mt-3`}>{B.vfTitel}</h2>
        {B.vfText.map((t, i) => <p key={i} className={P}>{t}</p>)}
      </section>

      {/* ── WER WIR SIND (Owner 10.09.2026) — statt „Mehr über VersusForge", das nur auf dieselbe
          Werbung für Künstler führte. Das Foto hat der Owner selbst in public/ gelegt („das Bild
          von uns liegt in public"); fürs Web verkleinert als /lakatosbandi/geza-szidonia.jpg. ── */}
      <section id="wer-wir-sind" className="mt-20 grid grid-cols-1 gap-10 border-t border-[#e5e5e5] pt-12 md:grid-cols-2 md:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lakatosbandi/geza-szidonia.jpg" alt={B.personen.map(p => p.name).join(" & ")} loading="lazy"
          width={880} height={1100} className="block h-auto w-full max-w-[520px] bg-[#f5f5f5]" />
        <div>
          <h2 className={H2}>{B.werTitel}</h2>
          <p className={P}>{B.werLead}</p>
          <ul className="mt-6 list-none space-y-4 p-0">
            {B.personen.map(p => (
              <li key={p.name}>
                <p className="m-0 font-serif text-[26px] leading-[1.2]">{p.name}</p>
                <p className="m-0 mt-1 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#777]">{p.rolle}</p>
              </li>
            ))}
          </ul>
          {B.werText.map((t, i) => <p key={i} className={P}>{t}</p>)}
        </div>
      </section>

      {/* ── FRAGEN ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.fragenTitel}</h2>
        <div className="mt-6 max-w-[760px] divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
          {B.fragen.map((f, i) => (
            <details key={i} className="py-4">
              <summary className="cursor-pointer text-[16.5px] font-semibold">{f.q}</summary>
              <p className="m-0 mt-2 text-[15.5px] leading-[1.6] text-[#555]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── SCHLUSS ── */}
      <section className="mt-20 border-t border-[#e5e5e5] pt-12">
        <h2 className={H2}>{B.schlussTitel}</h2>
        <p className={P}>{B.schlussText}</p>
        <a href={bewerben} className="mt-7 inline-block bg-[#111] px-7 py-4 text-[16px] font-semibold text-white no-underline hover:bg-[#333]">{knopf}</a>
      </section>
    </>
  );
}
