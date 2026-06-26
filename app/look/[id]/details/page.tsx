"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingBag, Sparkles, MessageCircle, Loader2 } from "lucide-react";

type Look = {
  id: string;
  name: string;
  storeName?: string;
  storeSlug?: string;
  price?: string;
  salePrice?: string;
  discountLabel?: string;
  inStock?: boolean;
  availableSizes?: string[];
  productNote?: string;
  buyUrl?: string;
  alternatives?: { title: string; link: string; source?: string; thumbnail: string; price?: string; priceValue?: number; currency?: string; lingerie?: boolean }[];
  lingerie?: boolean;
  imageUrl: string;
  frontImageUrl?: string;
  curatorId?: string;
  curatorName?: string;
  curatorPhotoUrl?: string;
  curatorMotto?: string;
};
type Payload = { looks?: Look[]; error?: string };

const toSlug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// The hero is the creator's AI image — not for sale. What's buyable is the dupe
// ladder, so we show a price RANGE across the dupes (dominant currency).
function priceRange(alts: NonNullable<Look["alternatives"]>): string | null {
  const withVal = alts.filter(a => typeof a.priceValue === "number" && (a.priceValue as number) > 0);
  if (withVal.length === 0) return null;
  const byCur: Record<string, number[]> = {};
  for (const a of withVal) { const c = a.currency ?? ""; (byCur[c] ??= []).push(a.priceValue as number); }
  const cur = Object.keys(byCur).sort((a, b) => byCur[b].length - byCur[a].length)[0];
  const vals = byCur[cur];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  const sym = cur || "";
  return lo === hi ? `${sym}${fmt(lo)}` : `${sym}${fmt(hi)} – ${sym}${fmt(lo)}`;
}

function optImg(url: string | undefined, w = 1080, q = 70): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`;
}

export default function LookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const lookId = String(params?.id ?? "");

  const [look, setLook] = useState<Look | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Dupes are fetched ON DEMAND when this list opens — from the DB if already
  // cached, otherwise generated once via visual search and saved. So looks nobody
  // opens cost nothing.
  const [dupes, setDupes] = useState<Look["alternatives"] | null>(null);
  const [dupesLoading, setDupesLoading] = useState(false);
  // Progress bar while the dupe finder works (shows what's happening).
  const DUPE_STEPS = ["Analyzing the look…", "Searching every store…", "Matching colour & fabric…", "Ranking from luxe to budget…"];
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    if (!dupesLoading) return;
    setProgress(8); setStepIdx(0);
    const p = setInterval(() => setProgress((v) => Math.min(v + Math.random() * 11 + 3, 92)), 320);
    const s = setInterval(() => setStepIdx((i) => (i + 1) % DUPE_STEPS.length), 1100);
    return () => { clearInterval(p); clearInterval(s); setProgress(100); };
  }, [dupesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Express-Interest contact form (for looks without a buyable ladder)
  const [showContact, setShowContact] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const extractId = (param: string) => {
      const ddIdx = param.lastIndexOf("--");
      return ddIdx >= 0 ? param.slice(ddIdx + 2) : param;
    };
    const resolvedId = extractId(lookId);
    fetch("/api/try-this-look")
      .then(r => r.json())
      .then((p: Payload) => {
        const all = p.looks ?? [];
        const current = all.find(l => l.id === resolvedId || l.id === lookId || toSlug(l.name) === lookId) ?? null;
        if (current) { setLook(current); setIsLoading(false); return; }
        // Draft fallback
        return fetch(`/api/try-this-look?previewId=${encodeURIComponent(resolvedId)}`)
          .then(r => r.json())
          .then((preview: { look?: Look }) => { if (preview.look) setLook(preview.look); })
          .finally(() => setIsLoading(false));
      })
      .catch(() => setIsLoading(false));
  }, [lookId]);

  // On-demand dupe fetch: cache-first (DB), else generate + save. Fires once when
  // the look's shop list opens.
  useEffect(() => {
    if (!look?.id) return;
    setDupesLoading(true);
    fetch("/api/look-dupes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lookId: look.id }) })
      .then(r => r.json())
      .then(d => setDupes(Array.isArray(d.alternatives) ? d.alternatives : []))
      .catch(() => setDupes([]))
      .finally(() => setDupesLoading(false));
  }, [look?.id]);

  const handleContact = async () => {
    if (!look || !buyerName.trim() || !buyerPhone.trim()) return;
    setSending(true);
    try {
      await fetch("/api/try-this-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lead",
          lookId: look.id,
          customerName: buyerName.trim(),
          phone: buyerPhone.trim(),
          storeName: look.storeName,
          lookName: look.name,
          leadSource: "details-page",
        }),
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-black/30" />
      </main>
    );
  }
  if (!look) {
    return (
      <main className="grid min-h-[100dvh] place-items-center gap-3 bg-white">
        <p className="text-sm font-black text-black/50">Listing not found</p>
        <button type="button" onClick={() => router.back()} className="text-xs font-black text-black/50 underline">Go back</button>
      </main>
    );
  }

  const isSoldOut = look.inStock === false;
  const displayPrice = look.salePrice ?? look.price;
  const hero = look.frontImageUrl ?? look.imageUrl;
  // The ladder is the on-demand dupes (DB cache or freshly generated), most
  // expensive first.
  const alts = [...(dupes ?? [])].sort((a, b) => {
    const av = typeof a.priceValue === "number" && a.priceValue > 0 ? a.priceValue : -1;
    const bv = typeof b.priceValue === "number" && b.priceValue > 0 ? b.priceValue : -1;
    return bv - av;
  });

  return (
    <main className="min-h-[100dvh] bg-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => router.back()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="truncate text-sm font-black text-black">Details</p>
      </div>

      {/* Product info — compact: small reference thumb + name (no big hero) */}
      <div className="px-4 pt-4">
        <button type="button"
          onClick={() => { if (look.curatorId) router.push(`/curator/${look.curatorId}`); }}
          className="mb-3 flex items-center gap-2 text-left active:opacity-70">
          <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={look.curatorPhotoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(look.curatorName || look.storeSlug || "LB")}&backgroundColor=000000&fontColor=ffffff`} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="text-xs font-black text-black/50">{look.curatorName || look.storeName || look.storeSlug}</span>
        </button>

        <div className="flex gap-3">
          <span className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt=""
              onError={(e) => { const el = e.currentTarget; if (!el.dataset.proxied) { el.dataset.proxied = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(hero)}`; } }}
              className="h-full w-full object-cover" />
          </span>
          <h1 className="min-w-0 flex-1 text-xl font-black leading-tight text-black">{look.name}</h1>
        </div>

        {/* Price range across the buyable dupes (the AI hero itself isn't for sale) */}
        {(() => {
          const range = priceRange(alts);
          if (range) {
            return (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-black/40">Bandit the look</span>
                <span className="text-xl font-black text-black">{range}</span>
              </div>
            );
          }
          // Fallback: single price (legacy / non-dupe looks)
          return (look.salePrice || look.price) ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {look.discountLabel && <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-black text-white">{look.discountLabel}</span>}
              {look.salePrice && <span className="text-lg font-black text-black">{look.salePrice}</span>}
              {look.price && <span className={`text-base font-black ${look.salePrice ? "text-black/30 line-through" : "text-black"}`}>{look.price}</span>}
            </div>
          ) : null;
        })()}

        {(look.availableSizes ?? []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {look.availableSizes!.map(size => (
              <span key={size} className="rounded-full border border-black/20 px-3 py-1 text-xs font-black text-black">{size}</span>
            ))}
          </div>
        )}

        {look.productNote && (
          <p className="mt-3 text-sm font-medium leading-relaxed text-black/60">{look.productNote}</p>
        )}
      </div>

      {/* Progress bar while the dupes are found on demand — shows what's happening */}
      {dupesLoading && alts.length === 0 && (
        <div className="px-4 pt-6">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-bold text-black/55">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {DUPE_STEPS[stepIdx]}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-black transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      {alts.length > 0 && (
        <div className="px-4 pt-6">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-black/40">
            <ShoppingBag className="h-3.5 w-3.5" /> Bandit the look — luxe to budget
          </div>
          <div className="grid gap-2.5">
            {alts.map((a, i) => {
              const altIdx = (dupes ?? []).findIndex(x => x.link === a.link && x.thumbnail === a.thumbnail);
              return (
                <div key={i} className="flex w-full min-w-0 gap-3 rounded-2xl border border-black/10 bg-white p-2.5">
                  <a href={a.link} target="_blank" rel="noopener noreferrer sponsored" className="shrink-0 active:scale-95 transition-transform">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.thumbnail} alt=""
                      onError={(e) => { const el = e.currentTarget; if (!el.dataset.proxied) { el.dataset.proxied = "1"; el.src = `/api/img-proxy?url=${encodeURIComponent(a.thumbnail)}`; } }}
                      className="h-28 w-24 rounded-xl bg-black/5 object-cover" />
                  </a>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
                    <a href={a.link} target="_blank" rel="noopener noreferrer sponsored" className="min-w-0 active:opacity-70">
                      <p className="line-clamp-2 text-sm font-black text-black">{a.title || a.source || "Anbieter"}</p>
                      {a.source && <p className="mt-0.5 truncate text-[11px] font-bold text-black/40">{a.source}</p>}
                    </a>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-black text-ink">{a.price || "—"}</span>
                      <a href={a.link} target="_blank" rel="noopener noreferrer sponsored"
                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-[12px] font-black text-white active:scale-95 transition-transform">
                        <ShoppingBag className="h-3.5 w-3.5" /> Shop now
                      </a>
                    </div>
                    <button type="button"
                      onClick={() => router.push(`/tryon/${look.id}${altIdx >= 0 ? `?alt=${altIdx}` : ""}`)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full border border-black/15 bg-white px-3.5 py-2 text-[12px] font-black text-black active:scale-95 transition-transform">
                      <Sparkles className="h-3.5 w-3.5" /> Try-on · {a.lingerie ? "$2.90" : "Free"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/8 bg-white/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <div className="grid gap-2">
          {look.buyUrl && alts.length === 0 && (
            <a href={look.buyUrl} target="_blank" rel="noopener noreferrer sponsored"
              className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-cobalt text-base font-black text-white shadow-lg active:scale-95 transition-transform">
              <ShoppingBag className="h-5 w-5" />
              Kaufen{displayPrice ? ` · ${displayPrice}` : ""}
            </a>
          )}
          {!isSoldOut ? (
            <>
              {!look.buyUrl && alts.length === 0 && (
                <button type="button" onClick={() => setShowContact(true)}
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black text-base font-black text-white shadow-lg active:scale-95 transition-transform">
                  <MessageCircle className="h-5 w-5" /> Express Interest
                </button>
              )}
              <button type="button" onClick={() => router.push(`/tryon/${look.id}`)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-black/10 bg-black/5 text-sm font-black text-black active:scale-95 transition-transform">
                <Sparkles className="h-4 w-4" /> Try This Look · {look.lingerie ? "$2.90" : "Free"}
              </button>
            </>
          ) : (
            <div className="flex h-14 w-full items-center justify-center rounded-2xl bg-black/5 text-base font-black text-black/30">Sold out</div>
          )}
        </div>
      </div>

      {/* Express-Interest modal */}
      {showContact && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowContact(false); setSent(false); } }}>
          <div className="w-full rounded-t-2xl bg-white px-5 pt-5 pb-8">
            {sent ? (
              <div className="py-6 text-center">
                <div className="mb-3 text-4xl">✅</div>
                <p className="text-base font-black text-black">Anfrage gesendet!</p>
                <p className="mt-1 text-sm font-bold text-black/50">Der Seller meldet sich bei dir.</p>
                <button type="button" onClick={() => { setShowContact(false); setSent(false); }}
                  className="mt-5 h-12 w-full rounded-2xl bg-black text-sm font-black text-white">Close</button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-black text-black">Express Interest</h2>
                  <button type="button" onClick={() => setShowContact(false)} className="text-xs font-bold text-black/40">Cancel</button>
                </div>
                <div className="grid gap-3">
                  <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Dein Name"
                    className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.04] px-4 text-sm font-bold outline-none focus:border-black" />
                  <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="+40 7xx xxx xxx"
                    className="h-12 w-full rounded-xl border border-black/10 bg-black/[0.04] px-4 text-sm font-bold outline-none focus:border-black" />
                  <p className="text-xs font-bold text-black/35">Der Seller sieht deine Nummer und entscheidet ob er dich kontaktiert.</p>
                  <button type="button" disabled={!buyerName.trim() || !buyerPhone.trim() || sending} onClick={handleContact}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black text-base font-black text-white disabled:opacity-40 active:scale-95 transition-transform">
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
