"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Package, TrendingUp, ShoppingBag } from "lucide-react";

export default function BecomeSellerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24">
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 px-6 pt-16 pb-10 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-black text-white text-4xl shadow-xl">
          🛍️
        </div>
        <h1 className="text-2xl font-black text-black leading-tight">
          Du hast noch keine<br />eigenen Produkte
        </h1>
        <p className="text-sm font-bold text-black/50 max-w-xs leading-relaxed">
          Fang an deine Produkte hier zu verkaufen und werde ein Creator auf LuxuryBandit.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid gap-3 px-5 pb-8">
        {[
          { icon: <ShoppingBag className="h-5 w-5" />, title: "Verkaufe deine Looks", desc: "Lade Produkte hoch und erreiche Tausende von Käufern." },
          { icon: <Sparkles className="h-5 w-5" />, title: "KI Try-On für deine Kunden", desc: "Kunden können deine Kleidung virtuell anprobieren." },
          { icon: <TrendingUp className="h-5 w-5" />, title: "Wachse als Creator", desc: "Baue dir eine Community auf und gewinne Follower." },
          { icon: <Package className="h-5 w-5" />, title: "Einfache Verwaltung", desc: "Alles in einem Dashboard — Produkte, Anfragen, Statistiken." },
        ].map((b, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-black/8 bg-black/[0.02] p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-white">
              {b.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-black">{b.title}</p>
              <p className="text-xs font-bold text-black/50 mt-0.5">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 grid gap-3">
        <button
          type="button"
          onClick={() => router.push("/seller/dashboard")}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-base font-black text-white shadow-lg active:scale-95 transition-transform"
        >
          <Package className="h-5 w-5" />
          Erstes Produkt erstellen
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-black/10 text-sm font-black text-black/50 active:bg-black/5 transition"
        >
          Später
        </button>
      </div>
    </div>
  );
}
