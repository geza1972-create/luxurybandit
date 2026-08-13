"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import TunnelSeite from "@/components/TunnelSeite";
import { produkt } from "@/lib/produkte";
import ImageCropper from "@/components/ImageCropper";
import { BildWahl, TunnelStart, TunnelFortschritt, TunnelKacheln, TunnelKachelUpload, VorlagenKachel, Knopf, Eingabe, AufladeWaehler, KurzeEinwilligung } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { guthabenLesen, aktiveAdresse } from "@/lib/guthaben-konto";
import { getStoredAuthSession, signInWithOAuth } from "@/lib/supabase-auth-client";
import { reichtGuthaben } from "@/lib/kasse";
import { themenPreisCents, themenPreisZeile } from "@/lib/pricing";
import { KISS_LOOK_ID } from "@/lib/wedding-prompt";
import { holidayInvitePrompt, HOLIDAY_SZENEN, type HolidaySzene } from "@/lib/holiday-invite";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { logTunnelEvent } from "@/lib/track-funnel";

/**
 * DER URLAUB ALS TUNNEL-SEITE (KONZEPT-TUNNEL.md). Schritt 2 ist die Szenen-Wahl
 * (`HOLIDAY_SZENEN`, dieselbe Liste, die `EinladungBauen` heute noch benutzt).
 * `schritte={[1, 2, 3]}`; ein bekannter Besucher springt auf Schritt 2 — die Szene bleibt eine
 * bewusste Wahl, „Bekannte überspringen NUR Schritt 1" (`components/TunnelSeite.tsx`).
 *
 * DER EINE EINLADUNGSSATZ IST DIE ZUSATZWAHL UNTER DEN KACHELN (Owner 12.08.2026,
 * Zusatzauftrag: „diese einladung ist zu kompliziert. Muss nur ein Textfeld sein Wo der User
 * eingeben kann Komm bitte mit nach Teneriffa am 21. Nov. 2026 … Dieses Eingabefeld habe
 * später auch im Tunel"). Ersetzt den bisherigen reinen Ortsnamen (`ort`, KONZEPT-Tabelle
 * „Urlaub … Zusatz: Ort") — kompakt in Schritt 3, kein eigener Schritt.
 *
 * ER FLIESST NICHT MEHR IN `holidayInvitePrompt` (siehe `generieren()` unten): Ein ganzer Satz
 * mit Datum ist eine Kartenzeile, keine Bildanweisung — die Kulisse bestimmt jetzt allein die
 * SZENE. Er reist stattdessen mit dem Kiss-Log-Auftrag (`satz`, `lib/try-this-look-store.ts`),
 * genau wie `zieleFrei` es fürs Versprechen tut.
 */
export default function HolidayStartClient({ lang, code }: { lang: string; code: string }) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";
  const F = kissText(lang, "holiday");

  /* AUS DER PRODUKT-KONFIG (Owner-Master-Auftrag 13.08.2026, §29): Schritte, Sprungziel
     und Kennung wohnen in lib/produkte.ts — EINE Stelle für alle sieben Tunnel. */
  const P = produkt("holiday");

  return (
    <TunnelSeite schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <HolidayTunnel lang={lang} F={F} schritt={schritt} onSchrittChange={onSchrittChange} />
      )}
    </TunnelSeite>
  );
}

const dateiZuDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ""));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HolidayTunnel({ lang, F, schritt, onSchrittChange }: { lang: string; F: any; schritt: number; onSchrittChange: (s: number) => void }) {
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFehler, setLeadFehler] = useState("");

  const [szeneId, setSzeneId] = useState("");
  const szene: HolidaySzene | undefined = HOLIDAY_SZENEN.find(s => s.id === szeneId);

  /** Der eine Einladungssatz (Owner 12.08.2026, Zusatzauftrag) — ersetzt den frueheren
   *  reinen Ortsnamen, siehe Dateikopf. */
  const [satz, setSatz] = useState("");
  const [ihrFoto, setIhrFoto] = useState("");
  const [seinFoto, setSeinFoto] = useState("");
  const ihrRef = useRef<HTMLInputElement>(null);
  const seinRef = useRef<HTMLInputElement>(null);
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [cropZiel, setCropZiel] = useState<"sie" | "er" | null>(null);

  const [genId, setGenId] = useState("");
  const [guthabenCents, setGuthabenCents] = useState<number | null>(null);
  const [aufladeWahl, setAufladeWahl] = useState(false);
  const [aufladeNull, setAufladeNull] = useState(false);
  const [angemeldet, setAngemeldet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [mailFehler, setMailFehler] = useState("");

  useEffect(() => {
    setAngemeldet(!!getStoredAuthSession()?.access_token);
    /* BEKANNTE SPRINGEN AN SCHRITT 1 VORBEI (GEMESSEN 13.08.2026, Owner-Screenshot am
       Hochzeits-Tunnel: beide Fotos da, Knopf stumm gesperrt — `mail` war leer, weil nur
       Schritt 1 sie setzt). Die Adresse kommt deshalb hier aus der Haus-Quelle
       `aktiveAdresse()` (Konto-Sitzung, Tor, Kasse — dieselbe Zeile, mit der TunnelSeite
       den Sprung entscheidet), Rückfall lb_kiss_mail. */
    try { const a = aktiveAdresse() || localStorage.getItem("lb_kiss_mail") || ""; if (a) setMail(m => m || a); } catch { /**/ }
  }, []);

  useEffect(() => {
    const e = mail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { setGuthabenCents(0); return; }
    let weg = false;
    void guthabenLesen(e).then(st => { if (!weg) setGuthabenCents(st?.cents ?? 0); }).catch(() => {});
    return () => { weg = true; };
  }, [mail]);

  const preisCents = themenPreisCents("holiday");
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  const fotosDa = !!ihrFoto && !!seinFoto;

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
          /* Der eine Einladungssatz reist gleich mit dem Auftrag (Owner 12.08.2026,
             Zusatzauftrag) — dasselbe Muster wie `zieleFrei` beim Versprechen. */
          body: JSON.stringify({ theme: "holiday", device, email: mail.trim(), satz: satz.trim() }),
        }).then(r => r.json());
        if (log?.id) { gid = String(log.id); setGenId(gid); }
      } catch { /**/ }
    }
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId: gid, once: !topupCents, videoAufpreis: false, thema: "holiday",
          ...(topupCents ? { aufladen: true, topupCents } : {}),
          email: mail.trim(), returnTo: window.location.pathname + window.location.search,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) {
        if (typeof start.rest === "number") setGuthabenCents(start.rest);
        try { popup?.close(); } catch { /**/ }
        void logTunnelEvent("payment_completed", "holiday", { via: "wallet" });
        return true;
      }
      if (!start?.url || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setStatus(start?.error || F.statusNotWork);
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
          void logTunnelEvent("payment_completed", "holiday", { via: "stripe" });
          return true;
        }
        if (popup.closed && i > 2) break;
      }
      try { popup.close(); } catch { /**/ }
      return false;
    } catch {
      try { popup?.close(); } catch { /**/ }
      setStatus(F.statusNetwork);
      return false;
    }
  };

  const generieren = async (topupCents?: number) => {
    if (!fotosDa || !mailOk || busy) return;
    setBusy(true); setStatus(F.oneMoment);
    // `checkout_started` (Owner-Architektur-Abgleich 12.08.2026, §32).
    void logTunnelEvent("checkout_started", "holiday");
    const ok = await kaufen(topupCents);
    if (!ok) { setBusy(false); return; }
    // `generation_started` — die Zahlung steht, jetzt beginnt der Auftrag beim Anbieter.
    void logTunnelEvent("generation_started", "holiday");
    try {
      /* KEIN `satz` MEHR IM BILD-/VIDEO-AUFTRAG (Owner 12.08.2026, Zusatzauftrag): Der freie
         Einladungssatz mit Datum ist eine Kartenzeile, keine Bildanweisung — siehe
         Dateikopf. Die Kulisse bestimmt jetzt allein die Szene. */
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, genId, person: seinFoto, garment: ihrFoto, prompt: holidayInvitePrompt(szeneId) }),
      }).then(r => r.json());
      if (genId) {
        /* Der Satz reist mit — falls `kaufen()` den Kiss-Log-Eintrag schon FRUEHER angelegt
           hatte (genId war bereits gesetzt) und `satz` seither getippt wurde, hier noch
           einmal sichern, nicht nur beim allerersten Anlegen. */
        void fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: genId, satz: satz.trim() }),
        }).catch(() => {});
      }
      if (start?.videoId && genId) {
        void fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: genId, videoId: start.videoId }),
        }).catch(() => {});
      }
    } catch { /* bezahlt bleibt bezahlt — Memory `paid-jobs-must-survive-the-browser` */ }
    window.location.href = "/my-gallery";
  };

  return (
    <>
      {/* FORTSCHRITTS-PUNKTE WIE IM GANZEN HAUS (Owner-Befund 12.08.2026, siehe Wedding-Tunnel
          — dieselbe Abnahme gilt fuer alle drei `EinladungBauen`-Tunnel). */}
      <TunnelFortschritt schritte={[1, 2, 3]} aktuell={schritt} />
      {schritt === 1 && (
        <TunnelStart
          produkt="holiday"
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
                sessionStorage.setItem("lb_oauth_return", `/themes/holiday/start?${ziel.toString()}`);
              } catch { /* privater Modus — dann landet er auf dem Konto-Dashboard */ }
              try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); } catch { /**/ }
            },
          }}
          zurueckHref={(() => { const q = new URLSearchParams(); try { const j = new URLSearchParams(window.location.search); if (j.get("light") === "1") q.set("light", "1"); const c = j.get("code") ?? ""; if (c) q.set("code", c); } catch { /**/ } const s = q.toString(); return `/themes/holiday${s ? `?${s}` : ""}`; })()}
          lang={lang} anfangsName={name} anfangsEmail={mail} busy={leadBusy} fehlerAussen={leadFehler}
          onWeiter={async (n, e) => {
            setName(n); setMail(e); setLeadBusy(true); setLeadFehler("");
            try {
              let device = "";
              try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
              const r = await fetch("/api/kiss-claim", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: e, ...(n.trim() ? { name: n.trim() } : {}), device, theme: "holiday", vorab: true, land: landAusZeitzone(), lang, consentAt: new Date().toISOString() }),
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
          <p className="text-[12px] font-black uppercase tracking-wide text-white/50">{F.szeneTitel ?? "Pick your scene"}</p>
          {/* ALS SLIDER WIE ÜBERALL (Owner 12.08.2026: „ich brauche sie als slide wie überall
              nicht untereinander" · „es ist nicht gefixt" — die alte Zwei-Spalten-Hülle
              (`grid grid-cols-2`) stand noch drumherum und sperrte den Slider in eine halbe
              Spalte; jetzt liegt `BildWahl gross` frei und läuft randbündig). Nur Szenen
              MIT Bild („was soll die leeren kasten?"). */}
          <div className="mt-2">
            <BildWahl gross wert={szeneId} sprache={lang}
              waehle={setSzeneId}
              bilder={HOLIDAY_SZENEN.filter(s => !!s.kachel).map(s => ({ id: s.id, name: s.name, bild: String(s.kachel), video: "/Holiday/urlaub-beispiel.mp4" }))} />
          </div>
          {/* ZURÜCK-CHEVRON LINKS, WIE ÜBERALL (Owner-Befund 12.08.2026). */}
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => onSchrittChange(1)} aria-label={F.back}
              className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Knopf art="gold" onClick={() => {
                /* NORMIERTE FAMILIE, `look_selected` (Owner-Master-Auftrag §32, 13.08.2026) —
                   gemeldet beim „Weiter"-Klick, nicht bei jedem Antippen einer Szene, sonst
                   zählte jedes Durchblättern als eigene Wahl. Genau derselbe Zeitpunkt wie
                   im Kuss-Trichter (KissFunnel.tsx, Schritt 2 → 3). */
                void logTunnelEvent("look_selected", "holiday", { lookId: szeneId });
                onSchrittChange(3);
              }}>
              {F.tunnelWeiter ?? F.next}
            </Knopf>
          </div>
        </div>
      )}

      {schritt === 3 && (
        <div>
          {/* DIESELBE KACHEL-REIHE WIE KUSS/GEBURTSTAG/VERSPRECHEN/HOCHZEIT (Owner-Befund
              12.08.2026). Der Ort ist die Zusatzwahl UNTER den Kacheln (KONZEPT-Tabelle:
              „Urlaub … Zusatz: Ort") — `zusatz`-Slot, kein eigener Schritt. Fuer die
              Szenen-Kacheln gibt es (noch) keine Beispielvideos (`lib/holiday-invite.ts`,
              `HolidaySzene` kennt nur `kachel`) — `VorlagenKachel` bleibt ohne `videoUrl`
              dann ein reines Bild, kein toter Klick. */}
          <TunnelKacheln
            zurueckLabel={F.back} aufZurueck={() => onSchrittChange(2)}
            links={<>
              <TunnelKachelUpload foto={seinFoto} titel={F.uploadYou ?? F.you} hinweis={F.youHint}
                onWaehlen={() => seinRef.current?.click()} onLoeschen={() => setSeinFoto("")} />
              <TunnelKachelUpload foto={ihrFoto} titel={F.upTitle} hinweis={F.upHint}
                onWaehlen={() => ihrRef.current?.click()} onLoeschen={() => setIhrFoto("")} />
            </>}
            ziel={
              szene?.kachel
                ? <VorlagenKachel bildUrl={szene.kachel} beschriftung={szene.name} sprache={lang} />
                : (
                  <div className="grid aspect-[3/4] w-full place-items-center rounded-2xl border border-white/15 bg-white/5 px-2 text-center">
                    <span className="text-[12px] font-bold text-white/70">{szene?.name ?? (F.szeneTitel ?? "Pick your scene")}</span>
                  </div>
                )
            }
            /**
              * DER EINE EINLADUNGSSATZ STATT DES ORTSFELDS (Owner 12.08.2026, Zusatzauftrag:
              * „Muss nur ein Textfeld sein Wo der User eingeben kann Komm bitte mit nach
              * Teneriffa am 21. Nov. 2026 … Dieses Eingabefeld habe später auch im Tunel").
              * `Eingabe` aus der CI-Bibliothek kann nur einzeilig — für einen Satz reicht das;
              * eine echte Textfläche bräuchte hier keinen Umbruch, den ein Nutzer selbst setzt.
              */
            zusatz={
              <div className="mt-3">
                <p className="text-[12px] font-bold text-white/85">{F.satzFrage ?? F.ortFrage}</p>
                <Eingabe value={satz} onChange={e => setSatz(e.target.value.slice(0, 200))} placeholder={F.satzPlatzhalter ?? F.ortPlatzhalter} className="mt-1 h-11 w-full rounded-lg px-3 text-[14px]" />
              </div>
            }
            knopf={{
              /* Preis erst mit vollstaendigem Beitrag (Owner 13.08.2026, generelle Tunnel-
                 Regel) — derselbe Kommentar in WeddingStartClient.tsx. */
              text: busy ? F.oneMoment : fotosDa ? `${F.generateNow} — ${themenPreisZeile("holiday", lang)}` : F.generateNow,
              disabled: !fotosDa || !mailOk || busy, busy,
              onClick: () => void generieren(),
            }}
            /* Kurze Zeile statt langer Absatz im Tunnel (Owner-Architektur-Abgleich
               12.08.2026, §24) — siehe derselbe Kommentar in WeddingStartClient.tsx. */
            einwilligung={<KurzeEinwilligung tpl={F.consentKurz} linkLabel={F.agbLink} />}
          />

          <input ref={ihrRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
          <input ref={seinRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />

          {status && <p className="mt-3 text-center text-[12.5px] font-bold text-white/70">{status}</p>}

          {aufladeWahl && (
            <AufladeWaehler
              lang={lang} stand={guthabenCents} preis={preisCents}
              mail={mail} setMail={m => { setMail(m); if (mailFehler) setMailFehler(""); }}
              mailFehler={mailFehler} angemeldet={angemeldet}
              aufladungNull={aufladeNull} busy={busy}
              aufStufe={stufe => { setAufladeWahl(false); setAufladeNull(false); void generieren(stufe); }}
              zu={() => setAufladeWahl(false)} />
          )}

          {cropDatei && cropZiel && (
            <ImageCropper file={cropDatei} aspect={3 / 4}
              title={cropZiel === "sie" ? F.upTitle : (F.uploadYou ?? F.you)}
              onCancel={() => { setCropDatei(null); setCropZiel(null); }}
              onSave={async (zugeschnitten) => {
                const ziel = cropZiel;
                setCropDatei(null); setCropZiel(null);
                const dataUrl = await dateiZuDataUrl(zugeschnitten);
                if (ziel === "sie") setIhrFoto(dataUrl); else setSeinFoto(dataUrl);
              }} />
          )}
        </div>
      )}
    </>
  );
}
