"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Menu } from "lucide-react";

type ShopItem = { title: string; link: string; source?: string; thumbnail: string; price?: string };

// "Haine" — a clothes & products gallery: our own catalogue garments + Bellucci (CJ affiliate).
// Dark look, mirrors the Produse Luxury funnel. Data comes from the zero-AI `demoProducts: haine`
// branch of /api/mai-ieftin-chat (fresh signed image URLs + cached CJ, so nothing is billable).
export default function HainePage() {
  const [own, setOwn] = useState<ShopItem[]>([]);
  const [bellucci, setBellucci] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/mai-ieftin-chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demoProducts: "haine" }),
        });
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        setOwn(Array.isArray(d.ownProducts) ? d.ownProducts : []);
        setBellucci(Array.isArray(d.products) ? d.products : []);
      } catch { /**/ } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const Card = ({ p, internal }: { p: ShopItem; internal?: boolean }) => {
    const inner = (
      <>
        <div className="aspect-[3/4] w-full bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
        <div className="p-2.5">
          {p.price && <p className="text-[14px] font-black text-white">{p.price}</p>}
          <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-tight text-white/65">{p.title}</p>
          <p className="mt-1 truncate text-[10px] font-bold text-[#b8912f]">{internal ? "LuxuryBandit" : (p.source || "Bellucci")}</p>
        </div>
      </>
    );
    const cls = "overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-[#b8912f]/25 active:scale-[0.98] transition";
    return internal
      ? <Link href={p.link} className={cls}>{inner}</Link>
      : <a href={p.link} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>;
  };

  return (
    <div className="min-h-screen bg-black text-white/90">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-black/80 px-4 py-3.5 backdrop-blur">
        <Link href="/home" aria-label="Înapoi" className="grid h-9 w-9 place-items-center rounded-full text-white/80 active:scale-90 transition">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-[15px] font-black uppercase tracking-[0.15em] text-white/85">Haine</h1>
        <button type="button" onClick={() => { try { window.dispatchEvent(new Event("lb-open-account")); } catch { /**/ } }} aria-label="Meniu"
          className="grid h-9 w-9 place-items-center rounded-full text-white/80 active:scale-90 transition">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <main className="mx-auto max-w-md px-4 pb-24 pt-2">
        <p className="mb-1 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Bandit the look</p>
        <p className="mb-5 text-center text-[13px] font-semibold text-white/45">Haine & piese de lux — colecția noastră și Bellucci</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((d) => <span key={d} className="h-2.5 w-2.5 animate-bounce rounded-full bg-white/40" style={{ animationDelay: `${d * 0.15}s` }} />)}
            </div>
          </div>
        ) : (
          <>
            {bellucci.length > 0 && (
              <section className="mb-7">
                <p className="mb-2.5 px-0.5 text-[12px] font-black uppercase tracking-wide text-[#b8912f]">Bellucci · lenjerie de lux</p>
                <div className="grid grid-cols-2 gap-3">
                  {bellucci.map((p, i) => <Card key={`b${i}`} p={p} />)}
                </div>
              </section>
            )}
            {own.length > 0 && (
              <section className="mb-7">
                <p className="mb-2.5 px-0.5 text-[12px] font-black uppercase tracking-wide text-[#b8912f]">Din colecția LuxuryBandit</p>
                <div className="grid grid-cols-2 gap-3">
                  {own.map((p, i) => <Card key={`o${i}`} p={p} internal />)}
                </div>
              </section>
            )}
            {bellucci.length === 0 && own.length === 0 && (
              <p className="py-20 text-center text-[14px] font-semibold text-white/40">Momentan nu sunt piese de afișat.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
