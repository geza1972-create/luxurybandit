"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail, CheckCircle2, ChevronDown } from "lucide-react";

const REASONS = [
  { value: "support", label: "Support" },
  { value: "complaint", label: "Beschwerde" },
  { value: "general", label: "Allgemein" },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState(""); // "" = "Bitte wählen"
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot (hidden)
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  // All fields are required + format-checked. Send stays disabled until valid.
  const nameOk = name.trim().length >= 2;
  const emailOk = EMAIL_RE.test(email.trim());
  const reasonOk = REASONS.some(r => r.value === reason);
  const messageOk = message.trim().length >= 5;
  const canSend = nameOk && emailOk && reasonOk && messageOk && status !== "sending";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nameOk) return setError("Bitte gib deinen Namen ein.");
    if (!emailOk) return setError("Bitte gib eine gültige E-Mail-Adresse ein.");
    if (!reasonOk) return setError("Bitte wähle einen Grund.");
    if (!messageOk) return setError("Bitte schreibe eine kurze Nachricht.");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, reason, message, company }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Konnte nicht senden. Bitte erneut versuchen."); setStatus("idle"); return; }
      setStatus("sent");
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
      setStatus("idle");
    }
  };

  return (
    <main className="min-h-[100dvh] bg-white pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-black/8 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/stores" aria-label="Zurück"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-black active:scale-90 transition-transform">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-black text-black">Kontakt</p>
      </header>

      <div className="mx-auto max-w-xl px-5 py-6">
        {status === "sent" ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-lg font-black text-black">Nachricht gesendet!</p>
            <p className="max-w-xs text-sm font-medium text-black/55">
              Danke für deine Nachricht. Eine Bestätigung ist an <span className="font-bold text-black">{email}</span> unterwegs — wir melden uns so schnell wie möglich.
            </p>
            <Link href="/stores" className="mt-2 rounded-full bg-black px-5 py-2.5 text-sm font-black text-white active:scale-95 transition-transform">
              Zurück zum Feed
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.06]"><Mail className="h-5 w-5 text-black/60" /></div>
              <div>
                <h1 className="text-lg font-black text-black">Kontakt aufnehmen</h1>
                <p className="text-sm font-medium text-black/55">
                  Fragen, Feedback oder eine Beschwerde? Schreib uns — wir melden uns bei dir.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="grid gap-3" noValidate>
              {/* Honeypot — hidden from real users, catches bots */}
              <input type="text" name="company" tabIndex={-1} autoComplete="off" value={company}
                onChange={e => setCompany(e.target.value)} className="hidden" aria-hidden />

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Name <span className="text-coral">*</span></span>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Vor- und Nachname" autoComplete="name"
                  className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-bold text-black outline-none focus:border-cobalt" />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">E-Mail <span className="text-coral">*</span></span>
                <input type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@beispiel.de" autoComplete="email"
                  className={`h-11 rounded-xl border bg-white px-3.5 text-sm font-bold text-black outline-none focus:border-cobalt ${email && !emailOk ? "border-coral" : "border-black/10"}`} />
                {email && !emailOk && <span className="text-[11px] font-bold text-coral">Bitte gültige E-Mail-Adresse eingeben.</span>}
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Grund <span className="text-coral">*</span></span>
                <div className="relative">
                  <select value={reason} onChange={e => setReason(e.target.value)}
                    className={`h-11 w-full appearance-none rounded-xl border bg-white px-3.5 pr-9 text-sm font-bold outline-none focus:border-cobalt ${reason ? "border-black/10 text-black" : "border-black/10 text-black/40"}`}>
                    <option value="" disabled>Bitte wählen</option>
                    {REASONS.map(r => <option key={r.value} value={r.value} className="text-black">{r.label}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                </div>
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">Nachricht <span className="text-coral">*</span></span>
                <textarea rows={6} value={message} onChange={e => setMessage(e.target.value)} placeholder="Deine Nachricht…"
                  className="rounded-xl border border-black/10 bg-white px-3.5 py-3 text-sm font-medium text-black outline-none focus:border-cobalt" />
              </label>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600">{error}</p>}

              <button type="submit" disabled={!canSend}
                className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…</> : "Nachricht senden"}
              </button>
              {!canSend && status !== "sending" && (
                <p className="text-center text-[11px] font-medium text-black/35">Bitte fülle alle Pflichtfelder (*) aus und wähle einen Grund.</p>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
