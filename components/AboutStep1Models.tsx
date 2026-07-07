"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Lock, Loader2, X } from "lucide-react";
import PremiumDialog from "@/components/PremiumDialog";

type FeaturedModel = { id: string; name: string; photo: string };
type Model = { id: string; name: string; photoUrl: string; featured?: boolean };

// Step-1 "Pick your model": 4 tiles = the 3 featured models + a locked "Your Picture"
// (Premium) at the 3rd spot. A "See all models" link opens the full gallery where
// everyone is locked except the featured three, with "Your Picture" again at 3rd.
export default function AboutStep1Models({ featured }: { featured: FeaturedModel[] }) {
  const router = useRouter();
  const [isPaid, setIsPaid] = useState(false);
  const [open, setOpen] = useState(false);
  const [premium, setPremium] = useState(false);
  const [all, setAll] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { try { setIsPaid(!!localStorage.getItem("luxurybandit-try-look-admin-pin") || localStorage.getItem("lb_paid") === "1"); } catch { /**/ } }, []);
  const yourLocked = !isPaid;

  const loadAll = async () => {
    setLoading(true);
    try { const r = await fetch("/api/try-this-look?models=1"); const d = await r.json(); setAll(Array.isArray(d.models) ? d.models : []); }
    catch { /**/ } finally { setLoading(false); }
  };
  const openGallery = () => { setOpen(true); void loadAll(); };
  const premiumAlert = () => setPremium(true);

  // The "Your photo" upload tile — icon on top, single "Your photo" label at the bottom
  // (no overlap). Locked = Premium (small lock badge); paid → opens the try-on to upload.
  const YourTile = ({ big }: { big?: boolean }) => (
    <button type="button" onClick={() => (yourLocked ? premiumAlert() : router.push("/stores?view=grid"))}
      className="relative block overflow-hidden rounded-xl border border-amber-400/30 bg-amber-400/[0.06] active:scale-95 transition-transform">
      <div className="grid aspect-[3/4] w-full place-items-center px-1 pb-6 text-center">
        <ImageUp className={`${big ? "h-9 w-9" : "h-7 w-7"} text-amber-400`} />
        {yourLocked && (
          <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 backdrop-blur"><Lock className="h-3.5 w-3.5 text-amber-400" /></span>
        )}
      </div>
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-black text-amber-400">Your photo</span>
    </button>
  );

  // Step-1 tiles: featured[0], featured[1], YOUR PICTURE (3rd), featured[2]…
  const step1 = [...featured];
  const step1Tiles: React.ReactNode[] = step1.map(m => (
    <button key={m.id} type="button" onClick={() => router.push(`/curator/${m.id}`)}
      className="relative block overflow-hidden rounded-xl lb-media-bg active:scale-95 transition-transform">
      <div className="aspect-[3/4] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.photo} alt={m.name} className="h-full w-full object-cover object-top" />
      </div>
      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-black text-white">{m.name}</span>
    </button>
  ));
  step1Tiles.splice(2, 0, <YourTile key="__your" big />);

  return (
    <>
      <div className="mt-2.5 grid grid-cols-4 gap-2">{step1Tiles}</div>
      <button type="button" onClick={openGallery} className="mt-2 text-[12px] font-black text-amber-400 active:opacity-70">See all models →</button>

      {open && (
        <div className="fixed inset-0 z-[95] flex flex-col bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="lb-phone-col mt-auto max-h-[85dvh] overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#141210]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-black text-white">All models</p>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white"><X className="h-4 w-4" /></button>
            </div>
            <p className="px-4 pt-2 text-[11px] font-bold text-white/45">Only the featured models are free — everyone else and your own photo are Premium (paying members).</p>
            {loading ? (
              <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
            ) : (
              <div className="grid max-h-[calc(85dvh-92px)] grid-cols-3 gap-2 overflow-y-auto overscroll-contain p-3">
                {(() => {
                  const anyFeatured = all.some(m => m.featured);
                  const ordered = [...all].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                  const tiles: React.ReactNode[] = ordered.map(m => {
                    const locked = anyFeatured && !m.featured && !isPaid;
                    return (
                      <button key={m.id} type="button"
                        onClick={() => (locked ? premiumAlert() : router.push(`/curator/${m.id}`))}
                        className="relative block overflow-hidden rounded-xl border border-white/10 lb-media-bg active:scale-95 transition-transform">
                        <div className="aspect-[3/4] w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.photoUrl} alt={m.name} loading="lazy" className={`h-full w-full object-cover object-top ${locked ? "blur-[6px] scale-105 opacity-70" : ""}`} />
                        </div>
                        {locked && <span className="absolute inset-0 grid place-items-center bg-black/25"><span className="grid h-9 w-9 place-items-center rounded-full bg-black/70 backdrop-blur"><Lock className="h-4 w-4 text-white" /></span></span>}
                        <span className={`absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-black ${locked ? "text-amber-400" : "text-white"}`}>{locked ? "Premium" : m.name}</span>
                      </button>
                    );
                  });
                  tiles.splice(2, 0, <YourTile key="__your-gallery" />);
                  return tiles;
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      <PremiumDialog open={premium} onClose={() => setPremium(false)} />
    </>
  );
}
