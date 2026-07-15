"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, MessageCircle, Send, Lock, Crown } from "lucide-react";

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
export type ModelClip = { poster: string; video: string; private?: boolean };
export type ModelCardProps = {
  id: string; serial: string; name: string; photo: string; video?: string; poster?: string;
  thumbs?: string[]; clips?: ModelClip[]; isMember?: boolean; onLockedClick?: () => void;
  valueLabel: string; looks?: number; bio?: string; brands?: string;
  createdAt?: string; tagline?: string; realModel?: boolean; forSale?: boolean; canDownload?: boolean;
  following?: boolean; onSuperFollow?: () => void; onChat?: () => void; country?: string;
  owner?: string; ownerId?: string; ownerHideName?: boolean;
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
  following = false, onSuperFollow, onChat, country = "", owner = "", ownerId = "", ownerHideName = false,
}: ModelCardProps) {
  const geo = countryInfo(country);
  // Owner chip: name + short ID; if the owner hid their name, show only the ID.
  const ownerLabel = ownerHideName ? ownerId : [owner, ownerId].filter(Boolean).join(" · ");
  const router = useRouter();
  // The video URL currently playing in the window ("" = show the still photo).
  const [current, setCurrent] = useState("");
  // A private clip a non-member tapped → its poster shows in the window behind a "Members only"
  // gate (teaser); tapping "Get membership" runs the paywall.
  const [lockedClip, setLockedClip] = useState<ModelClip | null>(null);
  const playing = !!current;
  const profile = id ? `/curator/${id}` : "/stores?view=models";
  // The still shown in the card window is HER PROFILE PHOTO; tapping play starts a video.
  const media = photo || poster;
  const shown = current ? "" : media; // what the still shows when not playing
  // Thumb strip = her PROFILE PHOTO first, then her video clips (public + private). The profile
  // tile has no video — tapping it returns the window to her photo. Falls back to plain images.
  const clipTiles: ModelClip[] = clips.length ? clips : thumbs.map(t => ({ poster: t, video: "", private: false }));
  const strip: ModelClip[] = [{ poster: media, video: "", private: false }, ...clipTiles];
  // Tapping a tile: the profile tile (no video) returns to her photo; a private clip a non-member
  // taps opens the "Members only" gate in the window; a public clip plays for everyone.
  const playClip = (c: ModelClip) => {
    if (c.private && !isMember) { setCurrent(""); setLockedClip(c); return; }
    setLockedClip(null);
    setCurrent(c.video); // "" for the profile tile → shows the photo again
  };
  const goMembership = () => { onLockedClick ? onLockedClick() : router.push(profile); };
  // The hero play button plays her first clip (or the passed-in hero video).
  const heroClip: ModelClip = clips[0] ?? { poster: media, video, private: false };
  const heroPlayable = !!(heroClip.video) && (!heroClip.private || isMember);
  const stats: [string, string][] = [["Looks", String(looks || 24)], ["Followers", "345k"], ["Likes", "1.2M"], ["Views", "4.8M"]];
  const created = createdAt ? new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const brandList = brands.split(/[,;•]/).map(b => b.trim()).filter(Boolean).slice(0, 6);

  // Share the card AS AN IMAGE. Fetches a server-rendered PNG of her card and shares the file via
  // the Web Share API (native sheet → Save Image / send anywhere). Falls back to sharing the link.
  const share = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${profile}`;
    const title = `${name} · LuxuryBandit Model Card`;
    const text = `${name} — LB-Value ${valueLabel} · luxurybandit.com`;
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
    <div className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[26px] border-[3px] border-amber-400/80 bg-[#0d0b0a] text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] ring-1 ring-amber-400/20">
      {/* Header — HER NAME lives here (not over the video) + the collectible brand line + share.
          The monogram watermark tiles behind it. */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden border-b border-amber-400/20 bg-gradient-to-r from-amber-400/[0.1] via-amber-300/[0.16] to-amber-400/[0.1] px-12 py-2.5 text-center">
        {/* "LB" monogram watermark — small tiled luxury pattern behind the header */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: MONO_URL, backgroundSize: "30px 30px", opacity: 0.4 }} />
        <p className="relative max-w-full truncate text-[24px] font-black leading-tight text-white">{name}</p>
        <span className="relative mt-0.5 inline-flex items-center rounded-full bg-black/45 px-3 py-0.5 text-[10px] font-black tracking-wide text-amber-300 ring-1 ring-amber-300/30 backdrop-blur">
          LuxuryBandit.com <span className="ml-1 text-white/50">· Grow Card</span>
        </span>
        <span className="relative mt-1 inline-flex items-center rounded-full bg-black/55 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/75 ring-1 ring-white/15 backdrop-blur">Invest that grows every day</span>
        <button type="button" onClick={() => void share()} aria-label="Share this card"
          className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/70 transition active:scale-90 hover:text-white">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative aspect-[4/5] w-full">
        {lockedClip ? (
          /* Private clip, non-member → blurred teaser + Members-only gate. */
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lockedClip.poster} alt="" className="h-full w-full object-cover blur-xl brightness-50" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black/60 ring-1 ring-white/30 backdrop-blur"><Lock className="h-5 w-5 text-white" /></span>
              <p className="text-[15px] font-black leading-tight text-white">Members only</p>
              <p className="max-w-[15rem] text-[12px] font-semibold leading-snug text-white/60">This video is for members. Join to watch her private clips.</p>
              <button type="button" onClick={goMembership}
                className="lb-gold mt-1 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-black active:scale-95 transition"><Crown className="h-4 w-4" /> Get membership</button>
            </div>
          </>
        ) : playing ? (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video src={current} autoPlay muted playsInline controls controlsList={canDownload ? undefined : "nodownload"} onContextMenu={canDownload ? undefined : (e) => e.preventDefault()} className="h-full w-full bg-black object-cover" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media} alt={name} className="h-full w-full object-cover" />
            {heroPlayable && (
              <button type="button" onClick={() => setCurrent(heroClip.video)} aria-label="Play video"
                className="absolute inset-0 grid place-items-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-black/25 text-white/85 ring-1 ring-white/25 backdrop-blur-sm transition active:scale-95">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-0.5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </button>
            )}
          </>
        )}

        {/* Serial + LB-Value stamps — only on the still; hidden while the video plays so they
            never cover the footage. */}
        {!playing && !lockedClip && (
          <>
            {/* Model serial — the trading-card "number", top-left. For-sale status sits under it,
                linking to the "LB-Value Grow Card" info (how owning + NFT-style transfer works). */}
            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              <div className="rounded-full bg-black/55 px-2.5 py-1 backdrop-blur">
                <p className="font-mono text-[11px] font-black tracking-wider text-white/85">Nº {serial}</p>
              </div>
              {forSale && (
                <Link href="/grow-card" aria-label="How owning works"
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow ring-1 ring-emerald-300/40 transition active:scale-95">
                  For sale <span className="grid h-3 w-3 place-items-center rounded-full border border-white/60 text-[7px] leading-none">?</span>
                </Link>
              )}
              {realModel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow">✓ Real</span>
              )}
            </div>
            {/* LB-Value — the trading-card "stat" stamp, top-right (with LB watermark). Tap → meaning. */}
            <Link href="/lb-value" aria-label="What is LB-Value?"
              className="absolute right-3 top-3 overflow-hidden rounded-full border border-amber-300/70 bg-black/55 px-3 py-1.5 backdrop-blur transition active:scale-95">
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: MONO_URL, backgroundSize: "26px 26px", opacity: 0.28 }} />
              <p className="relative text-center text-[9px] font-black uppercase leading-[1.15] tracking-[0.12em] text-amber-300/90">Today&apos;s<br />LB-Value <span className="ml-0.5 inline-grid h-3 w-3 translate-y-px place-items-center rounded-full border border-amber-300/60 text-[7px] leading-none">?</span></p>
              <p className="relative mt-0.5 text-center text-[15px] font-black leading-tight text-white">{valueLabel}</p>
            </Link>
          </>
        )}

        {!playing && !lockedClip && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent p-4 pt-14">
            <p className="text-[15px] font-bold text-white/95 [text-shadow:_0_1px_8px_rgba(0,0,0,0.95)]">{tagline}</p>
            <p className="mt-1.5 text-[11px] font-bold text-white/60 [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)]">
              {ownerLabel
                ? <><span className="uppercase tracking-wider text-white/40">Owner</span> · {ownerLabel}</>
                : <span className="uppercase tracking-wider text-white/45">No owner yet</span>}
            </p>
          </div>
        )}
      </div>

      {/* Thumb strip — PERSISTENT (stays while a clip plays) + SWIPEABLE. First tile = her
          profile photo, then her clips. Public play for all; private are members-only. */}
      {strip.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {strip.map((c, i) => {
            const locked = !!c.private && !isMember;
            const active = i === 0 ? (!current && !lockedClip) : (current === c.video && !!c.video) || lockedClip === c;
            return (
              <button key={i} type="button" onClick={() => playClip(c)} aria-label={i === 0 ? "Show photo" : locked ? "Members only video" : "Play video"}
                className={`relative aspect-[3/4] w-11 shrink-0 snap-start overflow-hidden rounded-md bg-white/10 ring-1 transition active:scale-95 ${active ? "ring-2 ring-amber-400" : "ring-white/25"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.poster} alt="" loading="lazy" className={`h-full w-full object-cover ${locked ? "blur-[3px] brightness-75" : ""}`} />
                {locked && <span className="absolute inset-0 grid place-items-center"><Lock className="h-3 w-3 text-white/90" /></span>}
                {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-black/55 py-px text-center text-[7px] font-black uppercase tracking-wide text-white/80">Card</span>}
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
        {bio && <p className="mt-1 text-[12.5px] font-semibold leading-5 text-white/70">{bio}</p>}
        {brandList.length > 0 && (
          <p className="mt-1.5 text-[12.5px] font-semibold leading-5 text-white/55">
            Loves {brandList.join(", ")}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 px-3 pt-3 text-center">
        {stats.map(([l, v]) => (
          <div key={l}><p className="text-[16px] font-black">{v}</p><p className="text-[9px] font-bold uppercase tracking-wide text-white/45">{l}</p></div>
        ))}
      </div>
      {/* Disclosure — the vanity stats are AI-assigned by an algorithm, not literal counts */}
      <p className="px-3 pt-1.5 text-center text-[9px] font-medium leading-tight text-white/30">AI-assigned by an algorithm</p>

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

      {/* Brand footer — the domain (carried on any shared screenshot) + a link to the Grow Card
          info (how owning + the NFT-style transfer works). */}
      <Link href="/grow-card" className="relative z-[3] flex items-center justify-center gap-1.5 border-t border-white/10 py-2 text-center transition active:scale-95">
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300/80">luxurybandit.com</span>
        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">· Grow Card</span>
      </Link>
    </div>
  );
}
