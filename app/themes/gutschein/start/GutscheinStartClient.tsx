"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import TunnelSeite from "@/components/TunnelSeite";
import { produkt } from "@/lib/produkte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import { TunnelStart, Knopf, Eingabe, KurzeEinwilligung } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { signInWithOAuth } from "@/lib/supabase-auth-client";
import { KARTE_TEXTE } from "@/components/EinladungKarte";
import { eur, themenPreisCents, GUTSCHEIN_STUFEN, type ThemenSchluessel } from "@/lib/pricing";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { logTunnelEvent } from "@/lib/track-funnel";
import { aktiveAdresse } from "@/lib/guthaben-konto";

const LB_TOPICS: ThemenSchluessel[] = ["kiss", "birthday", "surprise", "holiday", "wedding"];

/** Bellas fertige Gutschein-Karte — gratis, dasselbe Video wie auf `/themes/gutschein`. */
const GUTSCHEIN_VIDEO = "/Gutscheine/PixVerse_V6_Fusion_360P_She_holds_a_cream_enve.mp4";

/**
 * DER GUTSCHEIN ALS TUNNEL-SEITE (KONZEPT-TUNNEL.md).
 *
 * KEIN LINKES FELD (Owner 06.08.2026: „Die Gutscheingenerierung kostet nichts") — es gibt
 * weder eine zweite Person noch eine Szene, nur EINE Kachel: Bellas Video. Schritt 2 ist die
 * Wahl aus der Tabelle, genau wie in `EinladungBauen.geschenkWahl()` — ein LuxuryBandit-
 * Geschenk (`LB_TOPICS`) oder nacktes Guthaben (`GUTSCHEIN_STUFEN`). `schritte={[1, 2, 3]}`,
 * ein bekannter Besucher springt auf Schritt 2 — die Wahl bleibt eine bewusste Wahl.
 */
export default function GutscheinStartClient({ lang, code }: { lang: string; code: string }) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";
  const F = kissText(lang, "gutschein");
  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;

  /* AUS DER PRODUKT-KONFIG (Owner-Master-Auftrag 13.08.2026, §29): Schritte, Sprungziel
     und Kennung wohnen in lib/produkte.ts — EINE Stelle für alle sieben Tunnel. */
  const P = produkt("gutschein");

  return (
    <TunnelSeite schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <GutscheinTunnel lang={lang} F={F} T={T} schritt={schritt} onSchrittChange={onSchrittChange} />
      )}
    </TunnelSeite>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GutscheinTunnel({ lang, F, T, schritt, onSchrittChange }: { lang: string; F: any; T: any; schritt: number; onSchrittChange: (s: number) => void }) {
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  /* Bekannte springen an Schritt 1 vorbei (GEMESSEN 13.08.2026 am Hochzeits-Tunnel) —
     die Kassen-Adresse kommt dann aus der Haus-Quelle, sonst zahlt der Kauf ins Leere. */
  useEffect(() => {
    try { const a = aktiveAdresse() || localStorage.getItem("lb_kiss_mail") || ""; if (a) setMail(m => m || a); } catch { /**/ }
  }, []);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFehler, setLeadFehler] = useState("");

  const [lbWahl, setLbWahl] = useState<{ topic: string; cents: number } | null>(null);
  const [lbMail, setLbMail] = useState("");
  const [lbFehler, setLbFehler] = useState("");
  const [lbBusy, setLbBusy] = useState(false);
  const [lbLaeuft, setLbLaeuft] = useState("");
  const [lbGekauft, setLbGekauft] = useState<{ topic: string; cents: number } | null>(null);

  const tippen = (wahl: { topic: string; cents: number }) =>
    setLbWahl(w => (w && w.topic === wahl.topic && w.cents === wahl.cents) ? null : wahl);
  const aktiv = (wahl: { topic: string; cents: number }) =>
    !!lbWahl && lbWahl.topic === wahl.topic && lbWahl.cents === wahl.cents;

  /** Genau `EinladungBauen.lbKaufen()` — immer Stripe, nie das eigene Guthaben (Skill `bezahlung`). */
  const lbKaufen = async (wahl: { topic: string; cents: number }): Promise<boolean> => {
    if (lbBusy || lbGekauft) return !!lbGekauft;
    const emp = lbMail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emp)) { setLbFehler(F.lbFehlerMail ?? ""); return false; }
    // `checkout_started` (Owner-Architektur-Abgleich 12.08.2026, §32) — kein Guthaben-Weg
    // beim Gutschein (Skill `bezahlung`: immer Stripe), also kein separates `payment via`.
    void logTunnelEvent("checkout_started", "gutschein");
    setLbFehler(""); setLbBusy(true); setLbLaeuft(wahl.topic || String(wahl.cents));
    const popup = window.open("", "_blank", "popup,width=480,height=780");
    let gekauft = false;
    try {
      const start = await fetch("/api/gutschein-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(wahl.topic ? { topic: wahl.topic } : { cents: wahl.cents }),
          empfaenger: emp, email: mail.trim(),
          returnTo: window.location.pathname + window.location.search,
        }),
      }).then(r => r.json());
      if (!start?.url || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setLbFehler(start?.error || F.statusNotWork);
      } else {
        if (!popup) { window.location.href = start.url; return false; }
        try { popup.location.href = start.url; }
        catch { try { popup.close(); } catch { /**/ } window.location.href = start.url; return false; }
        for (let i = 0; i < 100; i++) {
          await new Promise(r => setTimeout(r, 3000));
          const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
          if (s?.paid) {
            gekauft = true;
            void logTunnelEvent("payment_completed", "gutschein", { via: "stripe", eventId: String(start.sessionId) });
            setLbGekauft({ topic: String(s.topic ?? wahl.topic), cents: Number(s.cents ?? 0) || wahl.cents });
            break;
          }
          if (popup.closed && i > 2) break;
        }
        try { popup.close(); } catch { /**/ }
      }
    } catch {
      try { popup?.close(); } catch { /**/ }
      setLbFehler(F.statusNetwork);
    }
    setLbBusy(false);
    if (!gekauft) setLbLaeuft("");
    return gekauft;
  };

  return (
    <>
      {schritt === 1 && (
        <TunnelStart
          produkt="gutschein"
          titel={F.tunnelStartTitel ?? F.namenFrage}
          nameLabel={F.tunnelName ?? F.namenFrage} namePlatzhalter={F.namenPlatzhalter}
          emailLabel={F.tunnelEmail ?? F.mailQuestion} emailPlatzhalter="you@email.com"
          weiterLabel={F.tunnelWeiter ?? F.next}
          /* GOOGLE ALS ABKUERZUNG — KEINE AUSNAHME (Owner 12.08.2026): derselbe Weg wie im
             KissFunnel-Tunnel; `redirect_to` bleibt /auth/confirm, das Ziel steht in
             `lb_oauth_return` (Muster KissFunnel.tsx, google={...}). */
          google={{
            label: F.tunnelGoogle ?? "Continue with Google",
            oderLabel: F.tunnelOder ?? "or",
            onClick: () => {
              try {
                const jetzt = new URLSearchParams(window.location.search);
                const ziel = new URLSearchParams();
                ziel.set("s", "2");
                if (jetzt.get("light") === "1") ziel.set("light", "1");
                const code = jetzt.get("code") ?? "";
                if (code) ziel.set("code", code);
                sessionStorage.setItem("lb_oauth_return", `/themes/gutschein/start?${ziel.toString()}`);
              } catch { /* privater Modus — dann landet er auf dem Konto-Dashboard */ }
              try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); } catch { /**/ }
            },
          }}
          zurueckHref={(() => { const q = new URLSearchParams(); try { const j = new URLSearchParams(window.location.search); if (j.get("light") === "1") q.set("light", "1"); const c = j.get("code") ?? ""; if (c) q.set("code", c); } catch { /**/ } const s = q.toString(); return `/themes/gutschein${s ? `?${s}` : ""}`; })()}
          lang={lang} anfangsName={name} anfangsEmail={mail} busy={leadBusy} fehlerAussen={leadFehler}
          onWeiter={async (n, e) => {
            setName(n); setMail(e); setLeadBusy(true); setLeadFehler("");
            try {
              let device = "";
              try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
              const r = await fetch("/api/kiss-claim", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: e, ...(n.trim() ? { name: n.trim() } : {}), device, theme: "gutschein", vorab: true, land: landAusZeitzone(), lang, consentAt: new Date().toISOString() }),
              });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) { setLeadFehler(d?.error ?? F.statusNotWork); setLeadBusy(false); return; }
              try { localStorage.setItem("lb_kiss_mail", e); } catch { /**/ }
              setLeadBusy(false);
              onSchrittChange(2);
            } catch { setLeadFehler(F.statusNetwork); setLeadBusy(false); }
          }} />
      )}

      {schritt === 2 && (
        <div className="mt-1">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{F.lbTitel}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {LB_TOPICS.map(t => {
              const wahl = { topic: t, cents: themenPreisCents(t) };
              return (
                <Knopf key={t} art="chip" aktiv={aktiv(wahl)} onClick={() => tippen(wahl)}>
                  {T.gutscheinTopics[t]} · {eur(themenPreisCents(t), lang)}
                </Knopf>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] font-bold leading-snug text-white/75">{F.lbGuthaben}</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {GUTSCHEIN_STUFEN.map(c => {
              const wahl = { topic: "", cents: c };
              return (
                <Knopf key={c} art="chip" aktiv={aktiv(wahl)} onClick={() => tippen(wahl)}>
                  {eur(c, lang)}
                </Knopf>
              );
            })}
          </div>
          {/* `look_selected` AUCH HIER (Owner 13.08.2026, auf die Frage ob die Themen-/
              Betrags-Wahl zählt: „ja") — der `lookId` sagt, WAS gewählt wurde: das Thema
              des Geschenks oder `guthaben-<cents>` beim nackten Betrag. */}
          <Knopf art="gold" className="mt-4" disabled={!lbWahl} onClick={() => {
            if (!lbWahl) return;
            void logTunnelEvent("look_selected", "gutschein", { lookId: lbWahl.topic || `guthaben-${lbWahl.cents}` });
            onSchrittChange(3);
          }}>
            {F.tunnelWeiter ?? F.next}
          </Knopf>
        </div>
      )}

      {schritt === 3 && lbWahl && (
        <div className="mt-1">
          {/* EINE KACHEL — DAS ZIEL: Bellas fertige Karte. Kein Upload, keine Lösch-Scheibe, es
              gibt nichts, was der Kunde gibt (KONZEPT-Tabelle: „Gutschein … keins nötig"). */}
          <EinladungAnsicht id="gutschein-tunnel" videoUrl={GUTSCHEIN_VIDEO} zaehlen={false} />

          <p className="mt-4 text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{F.lbWem}</p>
          {lbGekauft ? (<>
            <p className="mt-2 text-[13px] font-black leading-snug text-[#f6cf51]">
              {(F.lbFertig ?? "").replace("{was}", T.gutscheinTopics[lbGekauft.topic] ?? eur(lbGekauft.cents, lang))}
            </p>
            {lbMail.trim() && (
              <p className="mt-1 break-all text-[11px] font-bold leading-snug text-white/75">
                {(F.lbGehtAn ?? "").replace("{mail}", lbMail.trim())}
              </p>
            )}
          </>) : (<>
            <Eingabe value={lbMail}
              onChange={e => { setLbMail(e.target.value); if (lbFehler) setLbFehler(""); }}
              type="email" inputMode="email" placeholder={F.lbEmpfaenger}
              className="mt-2 h-11 w-full rounded-lg px-3 text-[14px]" />
            {lbFehler && <p role="alert" className="mt-1 text-[12.5px] font-black text-red-400">{lbFehler}</p>}

            <Knopf art="gold" className="mt-4" disabled={lbBusy} onClick={() => void lbKaufen(lbWahl)}>
              {/* EIN Knopf-Wort fuer ALLE Tunnel (Owner 12.08.2026: "der button muss immer gelch bei allen heissen Generate now - Preis.") - und KEINE Zeichen im Knopf (nur der Lade-Kreisel). */}
              {lbBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {/* KEIN PREIS AUF DIESEM KNOPF (Owner 12.08.2026: „alle kosten 9,99 auch Hochzeit
                  und Gutschein schribst du keinen Preis, er sucht aus") — beim Gutschein ist
                  der Betrag SEINE Wahl aus Schritt 2, nicht ein fester Produktpreis; die
                  Chips dort zeigen ihn schon (`eur(themenPreisCents(t))`/`eur(c)`). Ein
                  zweiter Preis auf dem Knopf waere hier nur eine Wiederholung. */}
              {lbBusy ? F.oneMoment : F.generateNow}
            </Knopf>
            {/* Kurze Zeile statt langer Absatz im Tunnel (Owner-Architektur-Abgleich
                12.08.2026, §24) — siehe derselbe Kommentar in WeddingStartClient.tsx. */}
            <p className="mt-2 text-center font-serif text-[11px] leading-snug text-white/70">
              <KurzeEinwilligung tpl={F.consentKurz} linkLabel={F.agbLink} />
            </p>
          </>)}
        </div>
      )}
    </>
  );
}
