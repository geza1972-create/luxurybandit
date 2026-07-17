"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Mail, CheckCircle2, ChevronDown } from "lucide-react";
import TopNav from "@/components/TopNav";

const REASONS = [
  { value: "own", label: "Own an influencer" },
  { value: "support", label: "Support" },
  { value: "complaint", label: "Complaint" },
  { value: "general", label: "General" },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState(""); // "" = "Please select"
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot (hidden)
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  // Which fields the user has interacted with, plus a submit flag, so errors only
  // appear after a blur or a send attempt — not while the form is still empty.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const touch = (f: string) => setTouched(t => ({ ...t, [f]: true }));

  // Prefill from the URL — e.g. the "own her" CTA links here as ?reason=own&about=<model name>.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("reason");
    if (r && REASONS.some(x => x.value === r)) setReason(r);
    const about = (q.get("about") || "").trim().slice(0, 60);
    if (r === "own") setMessage(m => m || `Hi, I'd like to own ${about ? `${about} ` : "an influencer "}exclusively on LuxuryBandit. Please tell me how it works and what it costs.`);
  }, []);

  // Per-field validation → error message ("" = valid).
  const errs = {
    name: name.trim().length < 2 ? "Please enter your name." : "",
    email: !email.trim() ? "Please enter your email." : !EMAIL_RE.test(email.trim()) ? "Please enter a valid email address." : "",
    reason: !REASONS.some(r => r.value === reason) ? "Please choose a reason." : "",
    message: message.trim().length < 5 ? "Please write a short message." : "",
  };
  const show = (f: keyof typeof errs) => (touched[f] || submitted) && !!errs[f];
  const allValid = !errs.name && !errs.email && !errs.reason && !errs.message;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitted(true);
    if (errs.name || errs.email || errs.reason || errs.message) return; // errors now shown per field
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason, message, company }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Could not send. Please try again."); setStatus("idle"); return; }
      setStatus("sent");
    } catch {
      setError("Network error. Please try again.");
      setStatus("idle");
    }
  };

  const fieldClass = (f: keyof typeof errs, base = "h-11") =>
    `${base} w-full rounded-xl border bg-white px-3.5 text-sm font-bold text-black outline-none focus:border-cobalt ${show(f) ? "border-coral" : "border-black/10"}`;

  return (
    <main className="min-h-[100dvh] bg-white pb-24">
      <TopNav subtitle="Contact" />

      <div className="mx-auto max-w-xl px-5 py-6">
        {status === "sent" ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-amber-500" />
            <p className="text-lg font-black text-black">Message sent!</p>
            <p className="max-w-xs text-sm font-medium text-black/55">
              Thanks for reaching out. A confirmation is on its way to <span className="font-bold text-black">{email}</span> — we&apos;ll get back to you as soon as we can.
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
                  Questions, feedback, or a complaint? Send us a message — we&apos;ll get back to you.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="grid gap-3" noValidate>
              {/* Honeypot — hidden from real users, catches bots */}
              <input type="text" name="company" tabIndex={-1} autoComplete="off" value={company}
                onChange={e => setCompany(e.target.value)} className="hidden" aria-hidden />

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Name <span className="text-coral">*</span></span>
                <input value={name} onChange={e => setName(e.target.value)} onBlur={() => touch("name")} placeholder="First and last name" autoComplete="name"
                  className={fieldClass("name")} />
                {show("name") && <span className="text-[11px] font-bold text-coral">{errs.name}</span>}
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Email <span className="text-coral">*</span></span>
                <input type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => touch("email")} placeholder="you@email.com" autoComplete="email"
                  className={fieldClass("email")} />
                {show("email") && <span className="text-[11px] font-bold text-coral">{errs.email}</span>}
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Reason <span className="text-coral">*</span></span>
                <div className="relative">
                  <select value={reason} onChange={e => { setReason(e.target.value); touch("reason"); }} onBlur={() => touch("reason")}
                    className={`${fieldClass("reason", "h-11")} appearance-none pr-9 ${reason ? "text-black" : "text-black/40"}`}>
                    <option value="" disabled>Please select</option>
                    {REASONS.map(r => <option key={r.value} value={r.value} className="text-black">{r.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                </div>
                {show("reason") && <span className="text-[11px] font-bold text-coral">{errs.reason}</span>}
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Message <span className="text-coral">*</span></span>
                <textarea rows={6} value={message} onChange={e => setMessage(e.target.value)} onBlur={() => touch("message")} placeholder="Your message…"
                  className={`rounded-xl border bg-white px-3.5 py-3 text-sm font-medium text-black outline-none focus:border-cobalt ${show("message") ? "border-coral" : "border-black/10"}`} />
                {show("message") && <span className="text-[11px] font-bold text-coral">{errs.message}</span>}
              </label>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600">{error}</p>}

              <button type="submit" disabled={status === "sending"}
                className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white transition-transform active:scale-95 disabled:opacity-50">
                {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : "Send message"}
              </button>
              {submitted && !allValid && status !== "sending" && (
                <p className="text-center text-[11px] font-bold text-coral">Please fix the highlighted fields above.</p>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
