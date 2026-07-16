"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, MessageCircle, Send, Lock, Crown, Maximize2, MapPin } from "lucide-react";

// Small tiled "LB" monogram (letters + 4-point florets in a diamond lattice) — the luxury
// watermark used behind the header + the LB-Value badge.
const FLORET = "M0 -6 C1.4 -3.4 1.4 -3.4 6 0 C1.4 3.4 1.4 3.4 0 6 C-1.4 3.4 -1.4 3.4 -6 0 C-1.4 -3.4 -1.4 -3.4 0 -6 Z";
const MONO_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='58' height='58' viewBox='0 0 58 58'><g fill='#d0a848'><text x='29' y='37' font-family='Georgia,\"Times New Roman\",serif' font-size='22' font-weight='700' text-anchor='middle'>LB</text><path d='${FLORET}'/><path transform='translate(58,0)' d='${FLORET}'/><path transform='translate(0,58)' d='${FLORET}'/><path transform='translate(58,58)' d='${FLORET}'/></g></svg>`;
const MONO_URL = `url("data:image/svg+xml,${encodeURIComponent(MONO_SVG)}")`;

// THE single, reusable "LuxuryBandit Model Card" — a collectible trading card used everywhere
// a model is shown (landing hero + the LuxuryBandit Marketplace gallery). Change it here and it
// changes in every place. Gold-framed, with a model serial number, the model's live LB-Value,
// her name, her looks filling the width, her creation date + description + favorite brands, and
// AI-assigned stats. luxurybandit.com is printed on it so a shared screenshot always carries the
// brand. The value is the appreciating-asset proof ("she grows every day"), computed server-side.
export type ModelClip = { poster: string; video: string; private?: boolean; date?: string; location?: string; story?: string; intro?: string; brand?: string; shopUrl?: string };
export type ModelCardProps = {
  id: string; serial: string; name: string; photo: string; video?: string; poster?: string;
  thumbs?: string[]; clips?: ModelClip[]; isMember?: boolean; onLockedClick?: () => void;
  valueLabel: string; looks?: number; bio?: string; brands?: string;
  createdAt?: string; tagline?: string; realModel?: boolean; forSale?: boolean; canDownload?: boolean;
  following?: boolean; onSuperFollow?: () => void; onChat?: () => void; country?: string;
  owner?: string; ownerId?: string; ownerHideName?: boolean; ownerSince?: string;
  title?: string; // her brand title / role, e.g. "Monaco Influencer"
  intro?: string; // her self-introduction — shown as a slide right after the card face
  sponsor?: string; // her brand sponsor, e.g. "Gianna Bellucci" — shown on the intro slide
  showProfileLink?: boolean; // landing/gallery: show "View full profile →" (admins/creators manage everything there)
};

// Turn an ISO-2 country code into its flag emoji + English name (e.g. "RO" → 🇷🇴 Romania).
function countryInfo(code: string): { flag: string; name: string } | null {
  const cc = (code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return null;
  const flag = cc.replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
  let name = cc;
  try { name = new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc; } catch { /**/ }
  return { flag, name };
}

export default function ModelCard({
  id, serial, name, photo, video = "", poster = "", thumbs = [], clips = [],
  isMember = false, onLockedClick, valueLabel,
  looks = 0, bio = "", brands = "", createdAt = "", tagline = "Your vibe, every day 💛", realModel = false, forSale = false, canDownload = false,
  following = false, onSuperFollow, onChat, country = "", owner = "", ownerId = "", ownerHideName = false, ownerSince = "",
  title = "", intro = "", sponsor = "", showProfileLink = false,
}: ModelCardProps) {
  const geo = countryInfo(country);
  // Ownership is the hero: is she owned yet, by whom, and since when.
  const ownedName = ownerHideName ? ownerId : (owner || ownerId);
  const ownerLabel = ownerHideName ? ownerId : [owner, ownerId].filter(Boolean).join(" · ");
  const isOwned = !!ownerLabel;
  // Growth Score is an INTEGER, never a price — strip the currency + any decimals.
  const gsLabel = Math.round(parseFloat(String(valueLabel).replace(/[^0-9.]/g, "")) || 0).toLocaleString("en-US");
  const router = useRouter();
  const [zoomed, setZoomed] = useState(false);       // tap the photo → fullscreen enlarged view
  const [activeSlide, setActiveSlide] = useState(0);  // which slide is centred (0 = her card face)
  const [playingIdx, setPlayingIdx] = useState(-1);   // which look slide is playing its video (-1 = none)
  const slidesRef = useRef<HTMLDivElement>(null);
  const profile = id ? `/curator/${id}` : "/stores?view=models";
  const media = photo || poster;
  // Slides = her PROFILE PHOTO first, then her look clips (each carries its own story/date/location).
  const clipTiles: ModelClip[] = clips.length ? clips : thumbs.map(t => ({ poster: t, video: "", private: false }));
  // Slides: her card face → (her intro, if any) → her look clips.
  const strip: ModelClip[] = [{ poster: media, video: "", private: false }, ...(intro ? [{ poster: media, video: "", intro }] : []), ...clipTiles];
  const goMembership = () => { onLockedClick ? onLockedClick() : router.push(profile); };
  // Swipe ↔ thumbs stay in sync: thumbs scroll the carousel, scrolling updates the active slide.
  const scrollToSlide = (i: number) => { const el = slidesRef.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); setPlayingIdx(-1); };
  const onSlidesScroll = () => { const el = slidesRef.current; if (!el) return; const idx = Math.round(el.scrollLeft / el.clientWidth); if (idx !== activeSlide) { setActiveSlide(idx); setPlayingIdx(-1); } };
  const created = createdAt ? new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  // ALL her brands — no cap (a freshly added brand must show up immediately, else edits look broken).
  const brandList = brands.split(/[,;•]/).map(b => b.trim()).filter(Boolean);

  // Share the card AS AN IMAGE. Fetches a server-rendered PNG of her card and shares the file via
  // the Web Share API (native sheet → Save Image / send anywhere). Falls back to sharing the link.
  const share = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${profile}`;
    const title = `${name} · LuxuryBandit Model Card`;
    const text = `${name} — Growth Score ${gsLabel} · luxurybandit.com`;
    try {
      if (id && typeof navigator !== "undefined" && (navigator as any).canShare) {
        const res = await fetch(`${origin}/api/model-card-image?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], `${name.replace(/\s+/g, "-").toLowerCase()}-luxurybandit.png`, { type: "image/png" });
          if ((navigator as any).canShare({ files: [file] })) { await navigator.share({ files: [file], title, text }); return; }
        }
      }
      if (typeof navigator !== "undefined" && navigator.share) { await navigator.share({ title, text, url }); return; }
      await navigator.clipboard?.writeText(url);
    } catch { /* user cancelled or unsupported → nothing to do */ }
  };

  return (
    <div className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[26px] border-[3px] border-amber-400/80 lb-bg text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-amber-400/20">
      {/* Header — HER NAME lives here (not over the video) + the collectible brand line + share.
          The monogram watermark tiles behind it. */}
      <div className="relative flex flex-col items-center justify-center gap-2 overflow-hidden border-b border-amber-400/20 bg-gradient-to-r from-amber-400/[0.1] via-amber-300/[0.16] to-amber-400/[0.1] px-6 py-4 text-center">
        {/* "LB" monogram watermark — small tiled luxury pattern behind the header */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: MONO_URL, backgroundSize: "30px 30px", opacity: 0.4 }} />
        <p className="relative max-w-full truncate px-6 text-[26px] font-black leading-none tracking-tight text-white">{name}</p>
        {/* Brand title / role — she's a brand (e.g. "Monaco Influencer"). */}
        {title && <p className="relative -mt-0.5 max-w-full truncate text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{title}</p>}
        {/* Status directly under the name — the first thing the eye lands on. */}
        <span className={`relative inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-black leading-none shadow backdrop-blur ${isOwned ? "bg-amber-400 text-black ring-1 ring-amber-300" : "bg-black/50 text-amber-200 ring-1 ring-amber-300/45"}`}>
          {isOwned ? <><Crown className="h-3.5 w-3.5 shrink-0" fill="currentColor" /> <span className="min-w-0 truncate">Owned by {ownedName}</span></> : <><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" /> Available</>}
        </span>
        <span className="relative inline-flex items-center whitespace-nowrap rounded-full bg-black/40 px-3.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-amber-300/85 ring-1 ring-amber-300/20 backdrop-blur">
          LuxuryBandit.com <span className="mx-1.5 text-amber-300/40">·</span> <span className="text-white/45">Own an AI Influencer</span>
        </span>
        <button type="button" onClick={() => void share()} aria-label="Share this card"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white/70 transition active:scale-90 hover:text-white">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* SWIPE CAROUSEL — the media area is a horizontal slider. Slide 0 = her card face
          (photo + tagline/owner); each look slide = its video with the story (date · location +
          caption) overlaid. Swipe to browse; the thumb strip below navigates the same slides. */}
      <div className="relative aspect-[4/5] w-full bg-black">
        <div ref={slidesRef} onScroll={onSlidesScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {strip.map((c, i) => {
            const locked = !!c.private && !isMember;
            const isIntro = !!c.intro;
            const isLook = i > 0 && !isIntro;
            const isPlaying = playingIdx === i;
            return (
              <div key={i} className="relative h-full w-full shrink-0 snap-center bg-black">
                {isIntro ? (
                  /* Intro slide — she introduces herself (what she represents & does). */
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.poster} alt="" className="h-full w-full object-cover object-top blur-md brightness-[0.32]" />
                    <div className="absolute inset-0 flex flex-col justify-center gap-3 px-7">
                      {title && <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{title}</p>}
                      <p className="text-[22px] font-black leading-tight text-white">Meet {name.split(" ")[0]}.</p>
                      <p className="text-[13.5px] font-semibold leading-relaxed text-white/85">{c.intro}</p>
                      {sponsor && (
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1.5 text-[11px] font-black text-amber-200 ring-1 ring-amber-300/40">
                          <Crown className="h-3.5 w-3.5" fill="currentColor" /> Wearing {sponsor}
                        </span>
                      )}
                    </div>
                  </>
                ) : locked ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.poster} alt="" className="h-full w-full object-cover object-top blur-xl brightness-50" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-black/60 ring-1 ring-white/30 backdrop-blur"><Lock className="h-5 w-5 text-white" /></span>
                      <p className="text-[15px] font-black leading-tight text-white">Members only</p>
                      <p className="max-w-[15rem] text-[12px] font-semibold leading-snug text-white/60">This look is for members. Join to watch her private clips.</p>
                      <button type="button" onClick={goMembership}
                        className="lb-gold mt-1 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-black active:scale-95 transition"><Crown className="h-4 w-4" /> Get membership</button>
                    </div>
                  </>
                ) : isLook && isPlaying ? (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <video src={c.video} poster={c.poster} autoPlay muted playsInline controls preload="metadata" controlsList={canDownload ? undefined : "nodownload"} onContextMenu={canDownload ? undefined : (e) => e.preventDefault()} className="h-full w-full bg-black object-contain" />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.poster} alt={i === 0 ? name : ""} loading={i === 0 ? undefined : "lazy"}
                    onClick={() => (i === 0 ? setZoomed(true) : c.video ? setPlayingIdx(i) : undefined)}
                    className="h-full w-full cursor-pointer object-cover object-top" />
                )}

                {/* Play affordance on a look poster (low, off her face). */}
                {isLook && c.video && !locked && !isPlaying && (
                  <button type="button" onClick={() => setPlayingIdx(i)} aria-label="Play video"
                    className="absolute bottom-[20%] left-1/2 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-black/35 text-white/90 ring-1 ring-white/30 backdrop-blur-sm transition active:scale-95">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                  </button>
                )}

                {/* Per-slide caption: slide 0 = tagline/owner; look slides = date · location + story.
                    Hidden while that slide's video plays so it never covers the footage. */}
                {!isPlaying && !isIntro && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent p-4 pt-14">
                    {i === 0 ? (
                      <>
                        <p className="text-[13px] font-semibold text-white/80 [text-shadow:_0_1px_8px_rgba(0,0,0,0.95)]">{tagline}</p>
                        {isOwned ? (
                          <p className="mt-1.5 text-[13px] font-black text-amber-300 [text-shadow:_0_1px_8px_rgba(0,0,0,0.95)]">Owned by {ownedName}{ownerSince ? <span className="font-bold text-white/70"> · since {ownerSince}</span> : null}</p>
                        ) : (
                          <p className="mt-1.5 text-[14px] font-black text-amber-300 [text-shadow:_0_1px_8px_rgba(0,0,0,0.95)]">No owner yet — be the first owner</p>
                        )}
                      </>
                    ) : (
                      <>
                        {(c.date || c.location) && (
                          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-300 [text-shadow:_0_1px_8px_rgba(0,0,0,0.95)]">
                            {c.location && <MapPin className="h-3 w-3 shrink-0" />}{[c.date, c.location].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {c.story && <p className="mt-1 text-[13px] font-semibold leading-snug text-white/90 [text-shadow:_0_1px_8px_rgba(0,0,0,0.95)]">{c.story}</p>}
                        {c.brand && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-black text-white/80 [text-shadow:_0_1px_8px_rgba(0,0,0,0.95)]">Wearing <span className="text-amber-300">{c.brand}</span></span>
                            {c.shopUrl && (
                              <Link href={c.shopUrl} onClick={(e) => e.stopPropagation()}
                                className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black text-black shadow active:scale-95 transition">
                                Shop now →
                              </Link>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Fixed stamps over the carousel (persist across slides). */}
        <div className="pointer-events-none absolute left-3 top-3 z-[5] flex flex-col items-start gap-1.5">
          <div className="rounded-full bg-black/55 px-2.5 py-1 backdrop-blur"><p className="font-mono text-[11px] font-black tracking-wider text-white/85">Nº {serial}</p></div>
          {forSale && (
            <Link href="/grow-card" aria-label="How owning works"
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white shadow ring-1 ring-amber-300/40 transition active:scale-95">
              For sale <span className="grid h-3 w-3 place-items-center rounded-full border border-white/60 text-[7px] leading-none">?</span>
            </Link>
          )}
          {realModel && <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-amber-700 shadow">✓ Real</span>}
        </div>
        <Link href="/lb-value" aria-label="What is the Growth Score?"
          className="absolute right-3 top-3 z-[5] flex flex-col items-center overflow-hidden rounded-2xl border border-amber-300/70 bg-black/55 px-4 py-2 backdrop-blur transition active:scale-95">
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: MONO_URL, backgroundSize: "26px 26px", opacity: 0.28 }} />
          <p className="relative flex items-center gap-1 whitespace-nowrap text-[10px] font-black uppercase leading-none tracking-[0.16em] text-amber-300/90">GS <span className="grid h-3 w-3 place-items-center rounded-full border border-amber-300/60 text-[7px] leading-none">?</span></p>
          <p className="relative mt-1 text-center text-[18px] font-black leading-none text-white">{gsLabel}</p>
          <p className="relative mt-1 whitespace-nowrap text-center text-[8px] font-black uppercase tracking-[0.12em] text-amber-400">▲ Trending</p>
        </Link>
        {/* Enlarge — only on her card face (slide 0). */}
        {activeSlide === 0 && (
          <button type="button" onClick={() => setZoomed(true)} aria-label="Enlarge photo"
            className="absolute bottom-3 right-3 z-[6] grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white/90 ring-1 ring-white/20 backdrop-blur transition active:scale-90">
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Thumb strip — navigates the same slides. Tap → the carousel swipes to that slide. */}
      {strip.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {strip.map((c, i) => {
            const locked = !!c.private && !isMember;
            const active = i === activeSlide;
            return (
              <button key={i} type="button" onClick={() => scrollToSlide(i)} aria-label={i === 0 ? "Show card" : locked ? "Members only look" : "Show look"}
                className={`relative aspect-[3/4] w-11 shrink-0 overflow-hidden rounded-md bg-white/10 ring-1 transition active:scale-95 ${active ? "ring-2 ring-amber-400" : "ring-white/25"}`}>
                {c.intro ? (
                  /* Story/about thumb — a black tile with a few text lines (her story), not her photo. */
                  <div className="relative h-full w-full bg-black">
                    <div className="absolute inset-x-[5px] top-[6px] flex flex-col gap-[3px]">
                      <span className="h-[2px] w-full rounded-full bg-white/60" />
                      <span className="h-[2px] w-4/5 rounded-full bg-white/40" />
                      <span className="h-[2px] w-full rounded-full bg-white/40" />
                      <span className="h-[2px] w-3/5 rounded-full bg-white/25" />
                    </div>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={c.poster} alt="" loading="lazy" className={`h-full w-full object-cover ${locked ? "blur-[3px] brightness-75" : ""}`} />
                )}
                {locked && <span className="absolute inset-0 grid place-items-center"><Lock className="h-3 w-3 text-white/90" /></span>}
                {(i === 0 || c.intro) && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-px text-center text-[7px] font-black uppercase tracking-wide text-white/80">{c.intro ? "About" : "Card"}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Card info — her "profile data": serial, created date, description, brands */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-white/45">
          <span className="font-mono normal-case tracking-wider text-white/55">Model Nº {serial}</span>
          {created && <span>Created {created}</span>}
        </div>
        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-amber-400/80">{realModel ? "LB Real Influencer" : "AI LB Influencer"}</p>
        {/* Sponsor — visible right on the card face (also on her ABOUT slide). */}
        {sponsor && (
          <p className="mt-1 flex items-center gap-1.5 text-[12px] font-black text-amber-300">
            <Crown className="h-3.5 w-3.5 shrink-0" fill="currentColor" /> Wearing {sponsor}
          </p>
        )}
        {bio && <p className="mt-1 text-[12.5px] font-semibold leading-5 text-white/70">{bio}</p>}
        {brandList.length > 0 && (
          <p className="mt-1.5 text-[12.5px] font-semibold leading-5 text-white/55">
            Loves {brandList.join(", ")}.
          </p>
        )}
      </div>

      {/* Ownership & history — the collectible's provenance (creates emotional attachment). */}
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-400/70">Ownership &amp; history</p>
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11.5px]">
          <span className="font-bold text-white/40">Created</span><span className="text-right font-black text-white/85">{created || "—"}</span>
          <span className="font-bold text-white/40">Owner</span><span className={`text-right font-black ${isOwned ? "text-white/85" : "text-amber-400"}`}>{isOwned ? ownedName : "Available"}</span>
          {ownerSince && (<><span className="font-bold text-white/40">Owned since</span><span className="text-right font-black text-white/85">{ownerSince}</span></>)}
          <span className="font-bold text-white/40">Growth Score</span><span className="text-right font-black text-amber-300">{gsLabel}</span>
          <span className="font-bold text-white/40">Peak Score</span><span className="text-right font-black text-amber-300">{gsLabel}</span>
        </div>
      </div>

      {/* Social-reach vanity stats REMOVED (2026-07-16): no fake followers/likes/views anywhere —
          brand partners must only ever see real, verifiable numbers. */}

      <div className="mt-2.5 flex gap-2 px-3 pb-3">
        {onSuperFollow ? (
          <button type="button" onClick={onSuperFollow} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-black py-2 text-center text-[13px] font-black text-white active:scale-95 transition">
            <UserPlus className="h-4 w-4" /> {following ? "Super Following" : "Super Follow"}
          </button>
        ) : (
          <Link href={profile} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-black py-2 text-center text-[13px] font-black text-white active:scale-95 transition"><UserPlus className="h-4 w-4" /> Super Follow</Link>
        )}
        {onChat ? (
          <button type="button" onClick={onChat} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-black py-2 text-center text-[13px] font-black text-white active:scale-95 transition"><MessageCircle className="h-4 w-4" /> Chat with my AI</button>
        ) : (
          <Link href={profile} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-black py-2 text-center text-[13px] font-black text-white active:scale-95 transition"><MessageCircle className="h-4 w-4" /> Chat with my AI</Link>
        )}
      </div>

      {/* Landing/gallery: jump to her FULL profile — everything about her lives there
          (all looks & videos; admins/creators edit photo, texts and videos in place). */}
      {showProfileLink && id && (
        <Link href={profile} className="mx-3 mb-3 flex items-center justify-center gap-1.5 rounded-full bg-amber-400/10 py-2.5 text-[12px] font-black text-amber-300 ring-1 ring-amber-400/40 transition active:scale-95">
          View full profile →
        </Link>
      )}

      {/* Brand footer — the domain (carried on any shared screenshot) + a link to how she grows. */}
      <Link href="/grow-card" className="relative z-[3] flex items-center justify-center gap-1.5 border-t border-white/10 py-2 text-center transition active:scale-95">
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300/80">luxurybandit.com</span>
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">· AI Influencer</span>
      </Link>

      {/* Fullscreen enlarged photo — tap the image (or the corner button) to open, tap to close. */}
      {zoomed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4" onClick={() => setZoomed(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media} alt={name} className="max-h-full max-w-full rounded-2xl object-contain" onContextMenu={canDownload ? undefined : (e) => e.preventDefault()} />
          <button type="button" onClick={() => setZoomed(false)} aria-label="Close"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/12 text-lg font-black text-white ring-1 ring-white/25 backdrop-blur active:scale-90">✕</button>
        </div>
      )}
    </div>
  );
}
