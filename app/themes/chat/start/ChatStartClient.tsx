"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import TunnelSeite from "@/components/TunnelSeite";
import LandingKarte from "@/components/LandingKarte";
import { produkt } from "@/lib/produkte";
import { TunnelStart, TunnelFortschritt, Eingabe, Knopf, KurzeEinwilligung } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { signInWithOAuth } from "@/lib/supabase-auth-client";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { eur, CHAT_STUFEN } from "@/lib/pricing";
import { kasseOeffnen } from "@/lib/browser-erkennen";
import { logTunnelEvent } from "@/lib/track-funnel";

/**
 * DER CHAT-TUNNEL IST EIN KAUF-TUNNEL (Owner 13.08.2026, nach dem ersten Wurf mit dem
 * eingebetteten Gratis-Chat: „hee? Chat läuft doch gar nicht über einen Kauftunel. Was
 * ist das?") — stur das Muster der Geschwister: Schritt 1 der Haus-Lead, Schritt 3 die
 * Bella-Karte (LandingKarte, ohne eigenen CTA) + Empfänger-Adresse (ein Geschenk hat
 * ZWEI Adressen, Skill `bezahlung` §4 — leer heisst „für mich selbst") + der EINE
 * Kaufknopf „Generate now — 9,99 €" über die bestehende Kasse chat-zugang-checkout
 * (Stripe-Popup+Poll; Verlängerung 14,99 €/Monat macht der Empfänger wie bei der
 * Hochzeit). Der GRATIS-Probier-Chat wohnt weiter auf der Landingpage /themes/chat —
 * der Tunnel ist die Anzeigen-Kasse, nicht die Spielwiese.
 */
export default function ChatStartClient({ lang, code, folien, inhalt }: {
  lang: string;
  code: string;
  folien: { video: string; poster: string }[];
  /* Landingpage-Inhalt, vom Server durchgereicht — TunnelSeite haengt ihn unter das
     Anmeldeformular (Owner 14.08.2026). */
  inhalt?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";
  const F = kissText(lang, "kiss");

  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFehler, setLeadFehler] = useState("");

  /* Die Empfänger-Wortlaute des Gutscheins — dieselben Schlüssel, dasselbe Geschenk-Muster. */
  const G = kissText(lang, "gutschein");
  const [empf, setEmpf] = useState("");
  const [kaufFehler, setKaufFehler] = useState("");
  const [kaufBusy, setKaufBusy] = useState(false);
  const [gekauft, setGekauft] = useState(false);

  const P = produkt("chat");

  /** Die bestehende Chat-Kasse (chat-zugang-checkout) — Stripe-Popup + Poll, wie überall. */
  const kaufen = async () => {
    if (kaufBusy || gekauft) return;
    const e = empf.trim().toLowerCase();
    if (e && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setKaufFehler(G.lbFehlerMail ?? ""); return; }
    setKaufFehler(""); setKaufBusy(true);
    void logTunnelEvent("checkout_started", P.slug);
    const popup = window.open("", "_blank", "popup,width=480,height=780");
    try {
      const start = await fetch("/api/chat-zugang-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, monate: 1, ...(e ? { empfaenger: e } : {}), email: mail.trim() || undefined, returnTo: window.location.pathname + window.location.search }),
      }).then(r => r.json());
      if (!start?.url || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setKaufFehler(start?.error || F.statusNotWork); setKaufBusy(false); return;
      }
      /* NIE IN DER FB-APP BEZAHLEN (15.08.2026) — auf Android schickt `kasseOeffnen`
         den Kunden mit der Stripe-Adresse nach Chrome. Siehe lib/browser-erkennen.ts. */
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return;
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const st = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (st?.paid) {
          try { popup.close(); } catch { /**/ }
          void logTunnelEvent("payment_completed", P.slug, { via: "stripe", eventId: String(start.sessionId) });
          setGekauft(true); setKaufBusy(false); return;
        }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
    } catch { try { popup?.close(); } catch { /**/ } setKaufFehler(F.statusNetwork); }
    setKaufBusy(false);
  };

  return (
    <TunnelSeite inhalt={inhalt} schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (<>
        <TunnelFortschritt schritte={P.schritte} aktuell={schritt} />

        {schritt === 1 && (
          <TunnelStart
            produkt={P.slug}
            titel={F.tunnelStartTitel ?? ""}
            nameLabel={F.tunnelName ?? ""} namePlatzhalter="Maria"
            emailLabel={F.tunnelEmail ?? ""} emailPlatzhalter="you@email.com"
            weiterLabel={F.tunnelWeiter ?? F.next}
            google={{
              label: F.tunnelGoogle ?? "Continue with Google",
              oderLabel: F.tunnelOder ?? "or",
              onClick: () => {
                try {
                  const jetzt = new URLSearchParams(window.location.search);
                  const ziel = new URLSearchParams();
                  ziel.set("s", "3");
                  if (jetzt.get("light") === "1") ziel.set("light", "1");
                  const c = jetzt.get("code") ?? "";
                  if (c) ziel.set("code", c);
                  sessionStorage.setItem("lb_oauth_return", `/themes/chat/start?${ziel.toString()}`);
                } catch { /* privater Modus — dann landet er auf dem Konto-Dashboard */ }
                try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); } catch { /**/ }
              },
            }}
            zurueckHref={(() => { const q = new URLSearchParams(); try { const j = new URLSearchParams(window.location.search); if (j.get("light") === "1") q.set("light", "1"); const c = j.get("code") ?? ""; if (c) q.set("code", c); } catch { /**/ } const s = q.toString(); return `/themes/chat${s ? `?${s}` : ""}`; })()}
            lang={lang} anfangsName={name} anfangsEmail={mail} busy={leadBusy} fehlerAussen={leadFehler}
            onWeiter={async (n, e) => {
              setName(n); setMail(e); setLeadBusy(true); setLeadFehler("");
              try {
                let device = "";
                try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
                const r = await fetch("/api/kiss-claim", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: e, ...(n.trim() ? { name: n.trim() } : {}), device, theme: "chat", vorab: true, land: landAusZeitzone(), lang, consentAt: new Date().toISOString() }),
                });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) { setLeadFehler(d?.error ?? F.statusNotWork); setLeadBusy(false); return; }
                try { localStorage.setItem("lb_kiss_mail", e); } catch { /**/ }
                setLeadBusy(false);
                onSchrittChange(3);
              } catch { setLeadFehler(F.statusNetwork); setLeadBusy(false); }
            }} />
        )}

        {schritt === 3 && (<>
          {/* DIE BELLA-KARTE — „Als Video haben wir dort nur bella": das Ordner-Video in
              der Creme-Karte, ohne eigenen CTA (der Kaufknopf steht darunter). */}
          {folien.length > 0 && (
            <LandingKarte sprache={lang} titel="Bella" folien={folien} verhaeltnis="aspect-[9/16]"
              teilenUrl="/themes/chat?utm_source=share" teilenText="Bella" />
          )}

          {gekauft ? (
            /* BEZAHLT: kein Formular mehr — nur die Bestätigung und der Weg zum Chat. */
            <div className="mt-4">
              <p className="text-[13px] font-black leading-snug text-[#f6cf51]">✓ {F.paidLine}</p>
              {empf.trim() && (
                <p className="mt-1 break-all text-[11px] font-bold leading-snug text-white/75">
                  {(G.lbGehtAn ?? "").replace("{mail}", empf.trim())}
                </p>
              )}
              <div className="mt-3"><Knopf art="gold" href="/themes/chat">Bella Chat →</Knopf></div>
            </div>
          ) : (<>
            {/* ZWEI ADRESSEN BEIM GESCHENK (Skill `bezahlung` §4): der Beschenkte hier,
                leer heisst „für mich selbst" — der Käufer steht schon in Schritt 1. */}
            <p className="mt-4 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{G.lbWem}</p>
            <Eingabe value={empf}
              onChange={e => { setEmpf(e.target.value); if (kaufFehler) setKaufFehler(""); }}
              type="email" inputMode="email" placeholder={G.lbEmpfaenger}
              className="mt-2 h-11 w-full rounded-lg px-3 text-[14px]" />
            {kaufFehler && <p role="alert" className="mt-1 text-[12.5px] font-black text-red-400">{kaufFehler}</p>}

            {/* Zurueck-Chip LINKS VOM CTA — die EINE Regel; der Knopf traegt Wort + Preis. */}
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => onSchrittChange(1)} aria-label={F.back}
                className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Knopf art="gold" disabled={kaufBusy} onClick={() => void kaufen()}>
                {kaufBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {kaufBusy ? F.oneMoment : `${F.generateNow} — ${eur(CHAT_STUFEN[0].cents, lang)}`}
              </Knopf>
            </div>
            <p className="mt-2 text-center font-serif text-[11px] leading-snug text-white/70">
              <KurzeEinwilligung tpl={F.consentKurz} linkLabel={F.agbLink} />
            </p>
          </>)}
        </>)}
      </>)}
    </TunnelSeite>
  );
}
