"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, KeyRound, Check, CalendarClock, Ban } from "lucide-react";
import { getStoredAuthSession, sendMagicLink, resetPassword, signOut } from "@/lib/supabase-auth-client";

type Sub = {
  id: string; topic: string; kind: string; status: string;
  amount: number; currency: string; currentPeriodEnd: number; cancelAtPeriodEnd: boolean;
};

// Welches Abo gehört zu welchem Thema — die Namen, die der Kunde auf der Seite gesehen hat.
const TOPIC: Record<string, { label: string; href: string }> = {
  "wetter-abo": { label: "Morning Weather", href: "/themes/wetter/bella" },
  "kiss-abo": { label: "Kiss any Model", href: "/themes/kiss" },
  "idol-abo": { label: "Your Idol with you", href: "/your-idol" },
  "surprise-abo": { label: "Surprise him", href: "/themes/surprise" },
  "tryon-abo": { label: "Try-On", href: "/themes/tryon" },
};

const money = (cents: number, cur: string) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: (cur || "eur").toUpperCase() }).format(cents / 100);
const day = (unix: number) => (unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/**
 * Konto-Inhalt: entweder der Anmeldeweg oder die Liste der Themen-Abos.
 *
 * ANMELDEN ohne Vorwissen (Owner): Er tippt nur seine E-Mail. „Link schicken" meldet ihn
 * passwortlos an (Magic Link) — das ist der Weg für alle, die nie ein Passwort gesetzt haben,
 * weil sie über einen Themen-Checkout hereingekommen sind. „Passwort vergessen" gibt es
 * daneben für die, die eines haben. Kein Registrierungsformular, keine Sackgasse.
 */
export default function MyTopics() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState("");

  useEffect(() => {
    const s = getStoredAuthSession();
    setToken(s?.access_token ?? "");
    if (s?.user?.email) setEmail(s.user.email);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/my-topics", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => { if (ok) setSubs(Array.isArray(d.subs) ? d.subs : []); else { setSubs([]); setMsg(d?.error || ""); } })
      .catch(() => setSubs([]));
  }, [token]);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());

  const magic = async () => {
    if (!emailOk || busy) return;
    setBusy(true); setMsg("");
    try { await sendMagicLink(email.trim()); setMsg("Check your inbox — we sent you a sign-in link."); }
    catch { setMsg("Could not send the link. Please try again."); }
    setBusy(false);
  };

  const forgot = async () => {
    if (!emailOk || busy) return;
    setBusy(true); setMsg("");
    try { await resetPassword(email.trim()); setMsg("If that address has a password, a reset link is on its way."); }
    catch { setMsg("Could not send the email. Please try again."); }
    setBusy(false);
  };

  const cancel = async (id: string) => {
    if (confirmId !== id) { setConfirmId(id); setTimeout(() => setConfirmId(c => (c === id ? "" : c)), 3000); return; }
    setConfirmId(""); setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/my-topics", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cancel: id }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok) { setSubs(Array.isArray(d.subs) ? d.subs : subs); setMsg("Cancelled. You keep access until the end of the paid month."); }
      else setMsg(d?.error || "Could not cancel.");
    } catch { setMsg("Network error."); }
    setBusy(false);
  };

  const input = "mt-2 h-12 w-full rounded-xl border border-white/30 bg-white/[0.08] px-4 text-[15px] font-semibold text-white outline-none placeholder:text-white/60 focus:border-[#f6cf51]";

  // ── Nicht angemeldet: E-Mail + Link schicken / Passwort vergessen ──────────────────
  if (token === null) return <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;

  if (!token) {
    return (
      <div className="mt-8">
        <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">Sign in</p>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email"
          placeholder="Your email address" className={input} />
        <button type="button" onClick={() => void magic()} disabled={!emailOk || busy}
          className="lb-gold mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-black active:scale-95 transition disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send me a sign-in link
        </button>
        <button type="button" onClick={() => void forgot()} disabled={!emailOk || busy}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 text-[14px] font-black text-white/85 active:scale-95 transition disabled:opacity-50">
          <KeyRound className="h-4 w-4" /> I have a password — reset it
        </button>
        {msg && <p className="mt-3 text-[13px] font-bold text-[#f6cf51]">{msg}</p>}
        <p className="mt-4 text-[13px] font-bold leading-snug text-white/70">
          Use the same address you paid with — that is how we find your topics. No password needed:
          the link signs you in.
        </p>
      </div>
    );
  }

  // ── Angemeldet: die Themen-Abos ────────────────────────────────────────────────────
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{email}</p>
        <button type="button" onClick={() => { signOut(); setToken(""); setSubs(null); }}
          className="shrink-0 text-[12px] font-black text-white/70 underline">Sign out</button>
      </div>

      {msg && <p className="mt-3 text-[13px] font-bold text-[#f6cf51]">{msg}</p>}

      {subs === null ? (
        <div className="mt-6 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>
      ) : subs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/20 bg-white/[0.06] p-5">
          <p className="text-[16px] font-black">No topic subscribed yet</p>
          <p className="mt-1 text-[14px] font-medium leading-relaxed text-white/85">
            Every topic is 24 € per month and can be cancelled here at any time.
          </p>
          <Link href="/themes" className="lb-gold mt-4 flex h-11 items-center justify-center rounded-full text-[14px] font-black">
            See the topics
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {subs.map(s => {
            const t = TOPIC[s.kind] ?? { label: s.topic || "Subscription", href: "/themes" };
            return (
              <li key={s.id} className="rounded-2xl border border-white/20 bg-white/[0.06] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={t.href} className="block truncate text-[17px] font-black text-white">{t.label}</Link>
                    <p className="mt-0.5 text-[13px] font-bold text-white/75">
                      {money(s.amount, s.currency)} / month
                      {s.status === "past_due" ? " · payment failed" : ""}
                    </p>
                  </div>
                  {s.cancelAtPeriodEnd ? (
                    <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/80">Ends {day(s.currentPeriodEnd)}</span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#f6cf51] px-3 py-1 text-[11px] font-black text-black">
                      <Check className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-white/70">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {s.cancelAtPeriodEnd ? `Access until ${day(s.currentPeriodEnd)}` : `Renews ${day(s.currentPeriodEnd)}`}
                </p>
                {!s.cancelAtPeriodEnd && (
                  <button type="button" onClick={() => void cancel(s.id)} disabled={busy}
                    className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[13px] font-black transition disabled:opacity-50 ${confirmId === s.id ? "bg-red-600 text-white" : "border border-white/25 text-white/85"}`}>
                    <Ban className="h-4 w-4" /> {confirmId === s.id ? "Tap again to cancel" : "Cancel this topic"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 text-[13px] font-bold leading-snug text-white/70">
        Cancelling always runs to the end of the month you already paid for — nothing is cut off
        early, and nothing is charged again after that.
      </p>
    </div>
  );
}
