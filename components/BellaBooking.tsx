"use client";

import { useState } from "react";
import { signUpWithPassword } from "@/lib/supabase-auth-client";

export default function BellaBooking({ firstName = "Bella" }: { firstName?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<null | "in" | "confirm">(null);

  const register = async () => {
    setErr("");
    if (!email.trim() || pw.length < 6) { setErr("Please enter your email and a password (min. 6 characters)."); return; }
    setBusy(true);
    try {
      const { session } = await signUpWithPassword(email.trim(), pw, name.trim() || undefined, { marketingOptIn: true });
      // Let us know about the booking so we can fulfil it manually.
      fetch("/api/book-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ program: "Teneriffa", model: firstName, name: name.trim(), email: email.trim(), priceUsd: 49 }),
      }).catch(() => {});
      setDone(session ? "in" : "confirm");
    } catch (e) {
      const msg = String((e as Error)?.message || "");
      setErr(/registered|exists|already/i.test(msg) ? "This email already has an account — please log in." : "Sign-up failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="buchung" className="mt-6 rounded-3xl border border-[#f6cf51]/40 bg-[#f6cf51]/[0.06] p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f6cf51]">The Package</p>
      <div className="mt-2 space-y-1.5 text-[15px] font-bold">
        <p>🎬 <span className="text-white">3 videos</span> — every day</p>
        <p>📸 <span className="text-white">3 stories</span> — every day</p>
        <p>🌴 From <span className="text-white">{firstName}</span> in Tenerife, exclusively for you</p>
      </div>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-[40px] font-black leading-none text-white">$49</span>
        <span className="mb-1 text-[13px] font-bold text-white/85">/ day · 6 pieces</span>
      </div>

      {done ? (
        <div className="mt-4 rounded-xl border border-[#f6cf51]/40 bg-black/30 p-4 text-center">
          <p className="text-[15px] font-black text-[#f6cf51]">{done === "in" ? "Welcome aboard! 🌴" : "Almost done ✉️"}</p>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-white/85">
            {done === "in"
              ? `Your account is ready. We'll set up your journey with ${firstName} and get in touch with your first content.`
              : "We've sent you a confirmation email. Confirm it and you're in."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-[12px] font-bold text-white/85">Booking = creating your account. After that we take care of your journey.</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none placeholder:text-white/50 focus:border-[#f6cf51]" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Your email"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none placeholder:text-white/50 focus:border-[#f6cf51]" />
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="new-password" placeholder="Password (min. 6 characters)"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 text-sm font-bold text-white outline-none placeholder:text-white/50 focus:border-[#f6cf51]" />
          {err && <p className="text-[12px] font-bold text-red-400">{err}</p>}
          <button type="button" onClick={() => void register()} disabled={busy}
            className="mt-1 w-full rounded-xl bg-[#f6cf51] py-3.5 text-[15px] font-black text-black active:scale-[0.98] transition disabled:opacity-40">
            {busy ? "Creating account…" : "Create account & book for $49 →"}
          </button>
          <p className="text-center text-[11px] font-medium text-white/75">Already have an account? <a href="/login" className="font-bold text-[#f6cf51]">Log in</a></p>
        </div>
      )}
    </div>
  );
}
