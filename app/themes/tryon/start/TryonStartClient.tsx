"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import TunnelSeite from "@/components/TunnelSeite";
import ImageCropper from "@/components/ImageCropper";
import { produkt } from "@/lib/produkte";
import { TunnelStart, TunnelFortschritt, TunnelKacheln, TunnelKachelUpload, VorlagenKachel, BildWahl, KurzeEinwilligung, Knopf, AufladeWaehler } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { tryonText } from "@/lib/tryon-i18n";
import { getStoredAuthSession, signInWithOAuth } from "@/lib/supabase-auth-client";
import { guthabenLesen, aktiveAdresse } from "@/lib/guthaben-konto";
import { reichtGuthaben } from "@/lib/kasse";
import { eur, geschenkPreisCents } from "@/lib/pricing";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { logTunnelEvent } from "@/lib/track-funnel";

/**
 * DER TRY-ON-TUNNEL — JETZT MIT ECHTEM SCHRITT 3 (Owner 13.08.2026: „Du hast keinen
 * richtigen Tunel gebaut. Deswegen machst du diesen Fehler."). Die erste Fassung sprang
 * nach der Look-Wahl auf die alte Try-on-Seite ab — kein Tunnel, sondern eine Weiche.
 * Jetzt gilt das Muster aller sieben Geschwister:
 *
 *   Schritt 1  Name + E-Mail (Lead, /api/kiss-claim theme "tryon"; Google als Abkürzung)
 *   Schritt 2  Look-Wahl als BildWahl-Slider (die GANZE öffentliche Garderobe, siehe
 *              lib/tryon-auslage — keine Kuratier-Sortierung, Owner: „Da haben alle mögliche")
 *   Schritt 3  Foto-Kachel → Pfeil → gewählter Look, darunter „Jetzt generieren — 9,99 €"
 *              (KEIN Gratis — Owner 13.08.2026: „bitte keine Gratis sachen. Ziehe den
 *              Tunel stur druch von Kiss, Versprechen, Hochzeit"), Zurück-Chip links vom CTA.
 *
 * DIE KASSE ist wörtlich das Hochzeits-Muster (Skill `bezahlung`): Guthaben zuerst,
 * Aufladewähler nur wenn es nicht reicht, Stripe als Popup+Poll; nach der Zahlung startet
 * der Pixverse-Referenz-Lauf (generate-tryon-video, person=ihr Foto + garment=der Look,
 * ein Lauf wie beim Tanz) und die Galerie zeigt das Video in der Karte.
 */
export default function TryonStartClient({ lang, code, looks, schritt2Titel }: {
  lang: string;
  code: string;
  looks: { id: string; name: string; bild: string; lingerie?: boolean }[];
  schritt2Titel: string;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";
  /* Basis-Tunnelworte (tunnelStartTitel/…): Sprach-Schlüssel, keine Themen-Schlüssel. */
  const F = kissText(lang, "kiss");
  const S = tryonText(lang);

  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFehler, setLeadFehler] = useState("");
  const [lookId, setLookId] = useState(looks[0]?.id ?? "");

  const [foto, setFoto] = useState("");
  const fotoRef = useRef<HTMLInputElement>(null);
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [fehler, setFehler] = useState("");

  /* DIE KASSE (Skill `bezahlung`, wörtlich das Hochzeits-Muster aus WeddingStartClient):
     Guthaben zuerst, Wähler NUR wenn es nicht reicht, Stripe als Popup+Poll, nach der
     Aufladung läuft DERSELBE Kauf weiter (kontoFrisch — nie den eingefrorenen Stand
     prüfen). Preis aus der Tabelle: geschenkPreisCents("tryon") = der Hauspreis. */
  const [genId, setGenId] = useState("");
  const [guthabenCents, setGuthabenCents] = useState<number | null>(null);
  const [aufladeWahl, setAufladeWahl] = useState(false);
  const [aufladeNull, setAufladeNull] = useState(false);
  const [angemeldet, setAngemeldet] = useState(true);
  const [videoBusy, setVideoBusy] = useState(false);
  const preisCents = geschenkPreisCents("tryon");

  /* Bekannte überspringen Schritt 1 — die Adresse kommt dann aus dem Tor-Speicher, sonst
     stünde die Kasse ohne E-Mail da (dieselbe Zeile, die Schritt 1 selbst schreibt). */
  useEffect(() => {
    try { const a = aktiveAdresse() || localStorage.getItem("lb_kiss_mail") || ""; if (a) setMail(m => m || a); } catch { /**/ }
    setAngemeldet(!!getStoredAuthSession()?.access_token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const e = mail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setGuthabenCents(0); return; }
    let weg = false;
    void guthabenLesen(e).then(st => { if (!weg) setGuthabenCents(st?.cents ?? 0); }).catch(() => {});
    return () => { weg = true; };
  }, [mail]);

  const P = produkt("tryon");
  const look = looks.find(l => l.id === lookId) ?? looks[0];

  /** Genau die Kasse aus `WeddingStartClient.kaufen()` — Guthaben zuerst, sonst Stripe. */
  const kaufen = async (topupCents?: number, kontoFrisch = false): Promise<boolean> => {
    if (!topupCents && !kontoFrisch && !reichtGuthaben(guthabenCents, preisCents)) {
      setAufladeWahl(true);
      return false;
    }
    const popup = window.open("", "_blank", "popup,width=480,height=780");
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    let gid = genId;
    if (!gid) {
      try {
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "tryon", device, email: mail.trim() }),
        }).then(r => r.json());
        if (log?.id) { gid = String(log.id); setGenId(gid); }
      } catch { /**/ }
    }
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId: gid, once: !topupCents, videoAufpreis: false, thema: "tryon",
          ...(topupCents ? { aufladen: true, topupCents } : {}),
          email: mail.trim(), returnTo: window.location.pathname + window.location.search,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) {
        if (typeof start.rest === "number") setGuthabenCents(start.rest);
        try { popup?.close(); } catch { /**/ }
        void logTunnelEvent("payment_completed", P.slug, { via: "wallet" });
        return true;
      }
      if (!start?.url || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setFehler(start?.error || F.statusNotWork);
        return false;
      }
      if (!popup) { window.location.href = start.url; return false; }
      try { popup.location.href = start.url; }
      catch { try { popup.close(); } catch { /**/ } window.location.href = start.url; return false; }
      for (let i = 0; i < 100; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const s = await fetch(`/api/checkout-status?session_id=${encodeURIComponent(start.sessionId)}`).then(r => r.json()).catch(() => null);
        if (s?.paid) {
          try { popup.close(); } catch { /**/ }
          if (topupCents) {
            if (typeof s.walletCents === "number") setGuthabenCents(s.walletCents);
            if (s.gutgeschrieben === 0) setAufladeNull(true);
            return await kaufen(undefined, true);
          }
          void logTunnelEvent("payment_completed", P.slug, { via: "stripe" });
          return true;
        }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
      return false;
    } catch {
      try { popup?.close(); } catch { /**/ }
      setFehler(F.statusNetwork);
      return false;
    }
  };

  /**
   * BEZAHLEN, DANN DAS VIDEO (Owner 13.08.2026: „ich wollte doch ein Video … eine Card
   * mit Video wie wir es überall haben") — nach der Zahlung startet der Pixverse-
   * Referenz-Lauf (generate-tryon-video: person = ihr Foto, garment = der Look; der
   * Route-eigene neutrale Katalog-Prompt zieht sie an UND animiert in EINEM Lauf, wie
   * beim Tanz). videoId wird am Auftrag gestempelt, dann übernimmt die Galerie —
   * der Server liefert nach (Memory `paid-jobs-must-survive-the-browser`).
   */
  const videoKaufen = async (topupCents?: number) => {
    if (!foto || !look || videoBusy) return;
    setVideoBusy(true); setFehler("");
    void logTunnelEvent("checkout_started", P.slug, { lookId: look.id });
    const ok = await kaufen(topupCents);
    if (!ok) { setVideoBusy(false); return; }
    void logTunnelEvent("generation_started", P.slug, { lookId: look.id });
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId: look.id, genId, person: foto, garment: look.bild }),
      }).then(r => r.json());
      if (start?.videoId && genId) {
        void fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: genId, videoId: start.videoId }),
        }).catch(() => {});
      }
    } catch { /* bezahlt bleibt bezahlt — die Galerie zeigt den Stand */ }
    window.location.href = "/my-gallery";
  };

  return (
    <TunnelSeite schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
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
                  ziel.set("s", "2");
                  if (jetzt.get("light") === "1") ziel.set("light", "1");
                  const c = jetzt.get("code") ?? "";
                  if (c) ziel.set("code", c);
                  sessionStorage.setItem("lb_oauth_return", `/themes/tryon/start?${ziel.toString()}`);
                } catch { /* privater Modus — dann landet er auf dem Konto-Dashboard */ }
                try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); } catch { /**/ }
              },
            }}
            zurueckHref={(() => { const q = new URLSearchParams(); try { const j = new URLSearchParams(window.location.search); if (j.get("light") === "1") q.set("light", "1"); const c = j.get("code") ?? ""; if (c) q.set("code", c); } catch { /**/ } const s = q.toString(); return `/themes/tryon${s ? `?${s}` : ""}`; })()}
            lang={lang} anfangsName={name} anfangsEmail={mail} busy={leadBusy} fehlerAussen={leadFehler}
            onWeiter={async (n, e) => {
              setName(n); setMail(e); setLeadBusy(true); setLeadFehler("");
              try {
                let device = "";
                try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
                const r = await fetch("/api/kiss-claim", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: e, ...(n.trim() ? { name: n.trim() } : {}), device, theme: "tryon", vorab: true, land: landAusZeitzone(), lang, consentAt: new Date().toISOString() }),
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
            <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{schritt2Titel}</p>
            {looks.length === 0 ? (
              <p className="mt-3 text-[13px] font-bold leading-snug text-white/70">{F.statusNetwork}</p>
            ) : (
              <div className="mt-2">
                <BildWahl gross wert={lookId} waehle={setLookId} sprache={lang}
                  bilder={looks.map(l => ({ id: l.id, name: l.name, bild: l.bild }))} />
              </div>
            )}
            {/* Zurueck-Chip LINKS VOM CTA — die EINE Regel (Owner 13.08.2026). */}
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => onSchrittChange(1)} aria-label={F.back}
                className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Knopf art="gold" disabled={!lookId} onClick={() => {
                if (!lookId) return;
                void logTunnelEvent("look_selected", P.slug, { lookId });
                onSchrittChange(3);
              }}>
                {F.tunnelWeiter ?? F.next}
              </Knopf>
            </div>
          </div>
        )}

        {schritt === 3 && look && (<>
          <TunnelKacheln
            zurueckLabel={F.back}
            aufZurueck={() => onSchrittChange(2)}
            links={
              <TunnelKachelUpload foto={foto} titel={S.fotoKachel} hinweis={S.merkmale[1]?.text}
                onWaehlen={() => fotoRef.current?.click()}
                onLoeschen={foto ? () => setFoto("") : undefined} />
            }
            ziel={<VorlagenKachel bildUrl={look.bild} ansehenLabel={S.cta} sprache={lang} titel={S.kicker} aufBild={look.name} />}
            knopf={{
              /* Preis erst mit vollstaendigem Beitrag (die generelle Tunnel-Regel vom
                 13.08.) — dann „Jetzt generieren — 9,99 €" aus der Tabelle. */
              text: videoBusy ? F.oneMoment : foto ? `${F.generateNow} — ${eur(preisCents, lang)}` : F.generateNow,
              disabled: !foto || videoBusy, busy: videoBusy,
              onClick: () => void videoKaufen(),
            }}
            einwilligung={<>
              <KurzeEinwilligung tpl={F.consentKurz} linkLabel={F.agbLink} />
              {/* Owner 13.08.2026, wörtlich: „Nur Bilder von dir selbst dürfen hochgeladen
                  werden." — als eigene Zeile unter der Einwilligung, in allen 7 Sprachen. */}
              {" "}<span className="block">{S.nurEigene}</span>
            </>}
          />
          <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setCropDatei(f); e.target.value = ""; }} />
          {cropDatei && (
            <ImageCropper file={cropDatei} aspect={3 / 4} title={S.fotoKachel}
              onCancel={() => setCropDatei(null)}
              onSave={(zugeschnitten: File) => {
                setCropDatei(null);
                const r = new FileReader();
                r.onload = () => setFoto(String(r.result ?? ""));
                r.readAsDataURL(zugeschnitten);
              }} />
          )}
          {fehler && (
            <p role="alert" style={{ color: "#ef4444" }} className="mt-2 text-center text-[12.5px] font-black leading-snug">{fehler}</p>
          )}
          {aufladeWahl && (
            <AufladeWaehler
              lang={lang} stand={guthabenCents} preis={preisCents}
              mail={mail} setMail={m => setMail(m)}
              mailFehler="" angemeldet={angemeldet}
              aufladungNull={aufladeNull} busy={videoBusy}
              aufStufe={stufe => { setAufladeWahl(false); setAufladeNull(false); void videoKaufen(stufe); }}
              zu={() => setAufladeWahl(false)} />
          )}
        </>)}
      </>)}
    </TunnelSeite>
  );
}
