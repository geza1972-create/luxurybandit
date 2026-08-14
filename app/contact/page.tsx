"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Mail, CheckCircle2, ChevronDown } from "lucide-react";
import TopNav from "@/components/TopNav";
import { kontaktText } from "@/lib/kontakt-i18n";

/* Die Werte sind die API-Kennungen; die BESCHRIFTUNG kommt aus lib/kontakt-i18n
   (Owner 14.08.2026: „der Contactformular muss auch übersetzt werden"). */
const REASON_VALUES = ["own", "support", "complaint", "general"] as const;

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
  /* Dieselbe Sprachwahl wie überall im Haus: der lb_lang-Keks des Sprachschalters. */
  const [lang, setLang] = useState("en");
  useEffect(() => {
    try { setLang(decodeURIComponent(document.cookie.match(/(?:^|; )lb_lang=([^;]*)/)?.[1] ?? "") || (navigator.language || "en")); } catch { /**/ }
  }, []);
  const T = kontaktText(lang);
  const touch = (f: string) => setTouched(t => ({ ...t, [f]: true }));

  // Prefill from the URL — e.g. the "own her" CTA links here as ?reason=own&about=<model name>.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("reason");
    if (r && (REASON_VALUES as readonly string[]).includes(r)) setReason(r);
    const about = (q.get("about") || "").trim().slice(0, 60);
    if (r === "own") setMessage(m => m || kontaktText(
      decodeURIComponent(document.cookie.match(/(?:^|; )lb_lang=([^;]*)/)?.[1] ?? "") || (navigator.language || "en")
    ).sponsorVorlage(about));
  }, []);

  // Per-field validation → error message ("" = valid).
  const errs = {
    name: name.trim().length < 2 ? T.fName : "",
    email: !email.trim() ? T.fEmail : !EMAIL_RE.test(email.trim()) ? T.fEmailUngueltig : "",
    reason: !(REASON_VALUES as readonly string[]).includes(reason) ? T.fGrund : "",
    message: message.trim().length < 5 ? T.fNachricht : "",
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
      if (!res.ok) { setError(d.error || T.sendeFehler); setStatus("idle"); return; }
      setStatus("sent");
    } catch {
      setError(T.netzFehler);
      setStatus("idle");
    }
  };

  const fieldClass = (f: keyof typeof errs, base = "h-11") =>
    `${base} w-full rounded-xl border bg-white px-3.5 text-sm font-bold text-black outline-none focus:border-cobalt ${show(f) ? "border-coral" : "border-black/10"}`;

  return (
    <main className="min-h-[100dvh] bg-white pb-24">
      <TopNav subtitle={T.untertitel} />

      <div className="mx-auto max-w-xl px-5 py-6">
        {status === "sent" ? (
          <div className="grid place-items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-amber-500" />
            <p className="text-lg font-black text-black">{T.gesendetTitel}</p>
            <p className="max-w-xs text-sm font-medium text-black/55">
              {T.dankeVor}<span className="font-bold text-black">{email}</span>{T.dankeNach}
            </p>
            {/* NACH DEM ABSENDEN ZUR STARTSEITE, nicht in den Models-Marktplatz (05.08.2026,
                derselbe Fall wie beim Zurück-Pfeil der Rechtsseiten): Wer hier schreibt, kam
                meist von einer Geschenkseite. „Back to the feed" schickte ihn stattdessen zu
                den Influencern — eine Seite, die mit seinem Anliegen nichts zu tun hat. */}
            <Link href="/" className="mt-2 rounded-full bg-black px-5 py-2.5 text-sm font-black text-white active:scale-95 transition-transform">
              {T.zurueck}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/[0.06]"><Mail className="h-5 w-5 text-black/60" /></div>
              <div>
                <h1 className="text-lg font-black text-black">{T.titel}</h1>
                <p className="text-sm font-medium text-black/55">
                  {T.intro}
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="grid gap-3" noValidate>
              {/* Honeypot — hidden from real users, catches bots */}
              <input type="text" name="company" tabIndex={-1} autoComplete="off" value={company}
                onChange={e => setCompany(e.target.value)} className="hidden" aria-hidden />

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">{T.nameLabel} <span className="text-coral">*</span></span>
                <input value={name} onChange={e => setName(e.target.value)} onBlur={() => touch("name")} placeholder={T.namePh} autoComplete="name"
                  className={fieldClass("name")} />
                {show("name") && <span className="text-[11px] font-bold text-coral">{errs.name}</span>}
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">{T.emailLabel} <span className="text-coral">*</span></span>
                <input type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => touch("email")} placeholder={T.emailPh} autoComplete="email"
                  className={fieldClass("email")} />
                {show("email") && <span className="text-[11px] font-bold text-coral">{errs.email}</span>}
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">{T.grundLabel} <span className="text-coral">*</span></span>
                <div className="relative">
                  <select value={reason} onChange={e => { setReason(e.target.value); touch("reason"); }} onBlur={() => touch("reason")}
                    className={`${fieldClass("reason", "h-11")} appearance-none pr-9 ${reason ? "text-black" : "text-black/40"}`}>
                    <option value="" disabled>{T.bitteWaehlen}</option>
                    {REASON_VALUES.map(v => <option key={v} value={v} className="text-black">{T.gruende[v]}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
                </div>
                {show("reason") && <span className="text-[11px] font-bold text-coral">{errs.reason}</span>}
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-black/40">{T.nachrichtLabel} <span className="text-coral">*</span></span>
                <textarea rows={6} value={message} onChange={e => setMessage(e.target.value)} onBlur={() => touch("message")} placeholder={T.nachrichtPh}
                  className={`rounded-xl border bg-white px-3.5 py-3 text-sm font-medium text-black outline-none focus:border-cobalt ${show("message") ? "border-coral" : "border-black/10"}`} />
                {show("message") && <span className="text-[11px] font-bold text-coral">{errs.message}</span>}
              </label>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600">{error}</p>}

              <button type="submit" disabled={status === "sending"}
                className="mt-1 flex h-12 items-center justify-center gap-2 rounded-full bg-black text-sm font-black text-white transition-transform active:scale-95 disabled:opacity-50">
                {status === "sending" ? <><Loader2 className="h-4 w-4 animate-spin" /> {T.sendet}</> : T.senden}
              </button>
              {submitted && !allValid && status !== "sending" && (
                <p className="text-center text-[11px] font-bold text-coral">{T.felderFixen}</p>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}
