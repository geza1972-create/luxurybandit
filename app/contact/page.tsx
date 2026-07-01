"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot (hidden)
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError("Please enter a valid email."); return; }
    if (message.trim().length < 5) { setError("Please write a short message."); return; }
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, company }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Could not send. Please try again."); setStatus("idle"); return; }
      setStatus("sent");
    } catch {
      setError("Network error. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <main className="min-h-[100dvh] bg-white pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/stores" aria-label="Back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-black text-black">Contact</p>
      </header>

      <div className="mx-auto max-w-xl px-5 py-6">
        {status === "sent" ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-lg font-black text-black">Message sent!</p>
            <p className="max-w-xs text-sm font-medium text-black/55">
              Thanks for reaching out. We&apos;ll reply to <span className="font-bold text-black">{email}</span> as soon as we can.
            </p>
            <Link href="/stores" className="mt-2 rounded-full bg-black px-5 py-2.5 text-sm font-black text-white active:scale-95 transition-transform">
              Back to the feed
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.06]"><Mail className="h-5 w-5 text-black/60" /></div>
              <div>
                <h1 className="text-lg font-black text-black">Get in touch</h1>
                <p className="text-sm font-medium text-black/55">
                  Questions, feedback, or a partnership? Send us a message — it goes straight to{" "}
                  <a href="mailto:support@luxurybandit.com" className="font-bold text-cobalt underline">support@luxurybandit.com</a>.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="grid gap-3">
              {/* Honeypot — hidden from real users, catches bots */}
              <input type="text" name="company" tabIndex={-1} autoComplete="off" value={company}
                onChange={e => setCompany(e.target.value)} className="hidden" aria-hidden />

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Your name</span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-bold text-black outline-none focus:border-cobalt" />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Email <span className="text-coral">*</span></span>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-bold text-black outline-none focus:border-cobalt" />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Subject</span>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="How can we help?"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-bold text-black outline-none focus:border-cobalt" />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Message <span className="text-coral">*</span></span>
                <textarea required rows={6} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message…"
                  className="rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-medium text-black outline-none focus:border-cobalt" />
              </label>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600">{error}</p>}

              <button type="submit" disabled={status === "sending"}
                className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white active:scale-95 transition-transform disabled:opacity-50">
                {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send message"}
              </button>
              <p className="text-center text-[11px] font-medium text-black/35">
                Or email us directly at{" "}
                <a href="mailto:support@luxurybandit.com" className="font-bold text-black/50 underline">support@luxurybandit.com</a>
              </p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
