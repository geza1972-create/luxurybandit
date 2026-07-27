"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import TopNav from "@/components/TopNav";

type ShopItem = { title: string; link: string; source?: string; thumbnail: string; price?: string };

// "Haine" — a clothes & products gallery: our own catalogue garments + Bellucci (CJ affiliate).
// Dark look, mirrors the Produse Luxury funnel. Data comes from the zero-AI `demoProducts: haine`
// branch of /api/mai-ieftin-chat (fresh signed image URLs + cached CJ, so nothing is billable).
export default function HainePage() {
  const [own, setOwn] = useState<ShopItem[]>([]);
  const [bellucci, setBellucci] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProduct, setOpenProduct] = useState<ShopItem | null>(null); // external link → preview dialog first

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
          <p className="mt-0.5 line-clamp-2 text-[12px] font-semibold leading-tight text-white/85">{p.title}</p>
          <p className="mt-1 truncate text-[10px] font-bold text-[#b8912f]">{internal ? "LuxuryBandit" : (p.source || "Bellucci")}</p>
        </div>
      </>
    );
    const cls = "overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-[#b8912f]/25 active:scale-[0.98] transition";
    return internal
      ? <Link href={p.link} className={cls}>{inner}</Link>
      : <button type="button" onClick={() => setOpenProduct(p)} className={`${cls} text-left`}>{inner}</button>;
  };

  return (
    <div className="min-h-screen bg-black text-white/90">
      <TopNav />

      <main className="mx-auto max-w-md px-4 pb-24 pt-2">
        <p className="mb-1 mt-3 text-center text-[11px] font-black uppercase tracking-[0.2em] text-[#f6cf51]">Clothes</p>
        <p className="mb-5 text-center text-[13px] font-semibold text-white/85">Clothes & luxury pieces — our collection and Bellucci</p>

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
                <p className="mb-2.5 px-0.5 text-[12px] font-black uppercase tracking-wide text-[#b8912f]">Bellucci · luxury lingerie</p>
                <div className="grid grid-cols-2 gap-3">
                  {bellucci.map((p, i) => <Card key={`b${i}`} p={p} />)}
                </div>
              </section>
            )}
            {own.length > 0 && (
              <section className="mb-7">
                <p className="mb-2.5 px-0.5 text-[12px] font-black uppercase tracking-wide text-[#b8912f]">From the LuxuryBandit collection</p>
                <div className="grid grid-cols-2 gap-3">
                  {own.map((p, i) => <Card key={`o${i}`} p={p} internal />)}
                </div>
              </section>
            )}
            {bellucci.length === 0 && own.length === 0 && (
              <p className="py-20 text-center text-[14px] font-semibold text-white/80">Momentan nu sunt piese de afișat.</p>
            )}
          </>
        )}
      </main>

      {/* Preview dialog — external shop links open here first so the customer isn't yanked off-site. */}
      {openProduct && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => setOpenProduct(null)}>
          <div className="lb-phone-col w-full" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto max-w-md rounded-t-3xl bg-[#111] p-5 ring-1 ring-white/10" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />
              <div className="flex gap-4">
                <div className="h-40 w-32 shrink-0 overflow-hidden rounded-2xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={openProduct.thumbnail} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                </div>
                <div className="min-w-0 flex-1">
                  {openProduct.price && <p className="text-[22px] font-black text-white">{openProduct.price}</p>}
                  <p className="mt-1 text-[14px] font-semibold leading-snug text-white/80">{openProduct.title}</p>
                  {openProduct.source && <p className="mt-1.5 text-[12px] font-bold text-[#f6cf51]">{openProduct.source}</p>}
                </div>
              </div>
              <a href={openProduct.link} target="_blank" rel="noopener noreferrer" onClick={() => setOpenProduct(null)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#f6cf51] py-4 text-[15px] font-black text-black active:scale-[0.98] transition">
                Vezi în magazin <ArrowUpRight className="h-4 w-4" />
              </a>
              <button type="button" onClick={() => setOpenProduct(null)}
                className="mt-2 flex w-full items-center justify-center rounded-full py-3 text-[14px] font-bold text-white/85 active:scale-[0.98] transition">
                Rămân aici
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
