"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LandingHeader from "@/components/LandingHeader";

type Profile = {
  id: string; firstName?: string; lastName?: string; modelName?: string; photoUrl?: string;
  bio?: string; growPriceLabel?: string; forSale?: boolean; ownerEmail?: string;
};

// Dedicated "Own {model}" landing + booking page — explains what ownership means and takes
// payment via the existing one-time /api/buy-influencer Stripe checkout (her current grow-price).
export default function OwnModelPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/curator?profile=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => { if (d?.profile) setProfile(d.profile as Profile); else setNotFound(true); })
      .catch(() => setNotFound(true));
  }, [id]);

  const name = profile ? (profile.modelName?.trim() || [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || "this model") : "";

  const submit = async () => {
    if (busy || !email.trim()) return;
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/buy-influencer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curatorId: id, email: email.trim(), returnPath: `/curator/${id}` }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) { setErr(d.error || "Could not start checkout."); setBusy(false); return; }
      window.location.href = d.url; // → Stripe; returns to /curator/{id}?bought={id}&cs={session}
    } catch { setErr("Could not start checkout."); setBusy(false); }
  };

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#0d0b0a] text-white">
        <LandingHeader />
        <div className="mx-auto flex max-w-[440px] flex-col items-center px-4 pb-24 pt-16 text-center">
          <p className="text-sm font-bold text-white/50">This model isn&apos;t available.</p>
        </div>
      </main>
    );
  }
  if (!profile) {
    return <div className="flex h-[100dvh] items-center justify-center bg-[#0d0b0a] text-sm font-bold text-white/40">Loading…</div>;
  }

  return (
    <main className="min-h-screen bg-[#0d0b0a] text-white">
      <LandingHeader />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-8">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#c9a23f]">Own an AI Influencer</p>
        <h1 className="mt-2 text-[30px] font-black leading-[1.05]">Own <span className="text-[#c9a23f]">{name}</span> 👑</h1>

        <div className="mt-6 flex items-center gap-4">
          <span className="h-20 w-16 shrink-0 overflow-hidden rounded-2xl bg-white/10">
            {profile.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={profile.photoUrl} alt={name} className="h-full w-full object-cover" />
              : null}
          </span>
          <div>
            <p className="text-lg font-black">{name}</p>
            {profile.growPriceLabel && <p className="text-sm font-bold text-[#c9a23f]">{profile.growPriceLabel}</p>}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#c9a23f]/30 bg-[#c9a23f]/[0.06] p-5">
          <p className="text-[14px] font-bold uppercase tracking-wide text-[#c9a23f]">What ownership means</p>
          <ul className="mt-3 space-y-2 text-[14px] font-semibold leading-relaxed text-white/75">
            <li>👑 She&apos;s exclusively yours — no one else can own her</li>
            <li>📈 You sponsor her monthly Growth Score, which keeps rising</li>
            <li>🛍️ She promotes your products to her followers</li>
            <li>🎬 You direct her looks and content</li>
          </ul>
        </div>

        {profile.forSale === false ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center text-[14px] font-bold text-white/60">
            {name} already has an owner right now.
          </p>
        ) : (
          <div className="mt-6 rounded-2xl border border-[#c9a23f]/40 bg-black/30 p-5">
            <p className="text-[13px] font-bold text-white/50">Enter your email to proceed to payment{profile.growPriceLabel ? ` (${profile.growPriceLabel})` : ""}.</p>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Your email"
              className="mt-3 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-[15px] font-semibold text-white outline-none focus:border-[#c9a23f] placeholder:text-white/30" />
            {err && <p className="mt-2 text-[12px] font-bold text-red-400">{err}</p>}
            <button type="button" onClick={() => void submit()} disabled={busy || !email.trim()}
              className="mt-4 flex h-13 min-h-[52px] w-full items-center justify-center rounded-full bg-[#c9a23f] px-6 text-base font-black text-black active:scale-95 transition disabled:opacity-50">
              {busy ? "…" : `Own ${name} — proceed to payment →`}
            </button>
            <p className="mt-3 text-center text-[12px] font-bold text-white/40">🔒 Secure checkout via Stripe</p>
          </div>
        )}
      </div>
    </main>
  );
}
