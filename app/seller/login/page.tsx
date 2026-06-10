"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { saveAuthSession, signInWithPassword } from "@/lib/supabase-auth-client";

export default function SellerLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const confirmed = params.get("confirmed") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await signInWithPassword(email, password);
      if (session) saveAuthSession(session);
      router.push("/seller/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#fafaf8] px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black text-white text-sm font-black tracking-tight">
            LB
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-black">LuxuryBandit</h1>
          <p className="mt-1 text-sm font-bold text-black/40">Seller login</p>
        </div>

        {confirmed && (
          <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
            Account created! Please confirm your email, then log in here.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1">
            <label className="text-xs font-black uppercase tracking-widest text-black/50">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="h-12 rounded-xl border border-black/12 bg-white px-4 text-sm font-bold text-black outline-none focus:border-black"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-xs font-black uppercase tracking-widest text-black/50">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="h-12 rounded-xl border border-black/12 bg-white px-4 text-sm font-bold text-black outline-none focus:border-black"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-black text-sm font-black text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-black/40">
          New seller?{" "}
          <Link href="/seller/register" className="font-black text-black underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
