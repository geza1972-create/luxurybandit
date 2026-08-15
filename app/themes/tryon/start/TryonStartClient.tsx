"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
import { darfMessen } from "@/lib/land-erkennen";

/**
 * DER TRY-ON-TUNNEL — DER KUNDE BRINGT SEIN KLEIDUNGSSTÜCK MIT, UNSERE VIDEOS SIND DIE
 * VORLAGEN (Owner 13.08.2026 abends, in zwei Sätzen: „ich will dass user selber klamotten
 * hochladen … also nicht mher unsere" + Klarstellung „wir zeigen unsere videos als
 * templates. das ist doch unser tunel"). Also stur die drei Haus-Schritte:
 *
 *   Schritt 1  Name + E-Mail (Haus-Lead, theme "tryon")
 *   Schritt 2  VORLAGEN-Wahl: unsere Videos aus public/Tryon als BildWahl-Slider —
 *              sie zeigen, WAS für ein Video am Ende herauskommt
 *   Schritt 3  SEIN Teil (Shop-Foto genügt) + SEIN Foto als Upload-Kacheln, rechts die
 *              gewählte Vorlage, darunter „Jetzt generieren — 9,99 €" über die EINE
 *              Kasse (Hochzeits-Muster); der Pixverse-Referenz-Lauf (person + garment,
 *              beides SEINE Uploads) zieht an und animiert in einem Lauf, die Galerie
 *              zeigt das Video in der Karte.
 */
export default function TryonStartClient({ lang, code, vorlagen }: {
  lang: string;
  code: string;
  /** Unsere Vorlagen-Videos aus public/Tryon (lib/tryon-videos.ts) — Poster + Clip. */
  vorlagen: { video: string; poster: string }[];
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

  const [vorlage, setVorlage] = useState("0");
  const [foto, setFoto] = useState("");
  const [teil, setTeil] = useState("");
  const fotoRef = useRef<HTMLInputElement>(null);
  const teilRef = useRef<HTMLInputElement>(null);
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [cropZiel, setCropZiel] = useState<"foto" | "teil">("foto");
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

  /* Bekannte überspringen Schritt 1 — die Adresse kommt dann aus der Haus-Quelle, sonst
     stünde die Kasse ohne E-Mail da (GEMESSEN am Hochzeits-Tunnel, 13.08.2026). */
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
  const gewaehlt = vorlagen[Number(vorlage)] ?? vorlagen[0];

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
        /* BEIDE FOTOS REISEN MIT (Owner 13.08.2026: „wenn leute nackte bilder hoch
           laden muss man die fehler meldung bringen") — das Nacktheits-Tor der Route
           prüft sie VOR Ablage und Kasse; die Absage trägt seinen Spruch. Nebenbei
           liegen die Bilder damit am Auftrag (Galerie, Admin, Nachlieferung). */
        const log = await fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: "tryon", device, email: mail.trim(), lang, personImage: foto, modelImage: teil }),
        }).then(r => r.json());
        if (log?.bildAbgelehnt || log?.error) {
          try { popup?.close(); } catch { /**/ }
          setFehler(String(log?.error ?? F.statusNotWork));
          return false;
        }
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
          /* Nur MIT Zustimmung meldet der Server den Kauf spaeter an Metas Conversions API. */
          einwilligung: darfMessen(),
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
          void logTunnelEvent("payment_completed", P.slug, { via: "stripe", eventId: String(start.sessionId) });
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
   * BEZAHLEN, DANN DAS VIDEO — person + garment sind SEINE beiden Uploads (der Pivot);
   * der Route-eigene neutrale Katalog-Prompt zieht an und animiert in EINEM Lauf, wie
   * beim Tanz. videoId wird am Auftrag gestempelt, dann übernimmt die Galerie —
   * der Server liefert nach (Memory `paid-jobs-must-survive-the-browser`).
   */
  const videoKaufen = async (topupCents?: number) => {
    if (!foto || !teil || videoBusy) return;
    setVideoBusy(true); setFehler("");
    void logTunnelEvent("checkout_started", P.slug);
    const ok = await kaufen(topupCents);
    if (!ok) { setVideoBusy(false); return; }
    void logTunnelEvent("generation_started", P.slug);
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genId, person: foto, garment: teil,
          /* SEIN Foto des Teils erst freistellen lassen (15.08.2026). Ein Shop-Foto zeigt
             fast immer ein Model darin — und an Pixverse geht nie eine Person in Waesche,
             nur der Stoff. Unsere eigenen Sets (Tanz) sind schon freigestellt und schicken
             diesen Schalter deshalb nicht. */
          garmentCutout: true }),
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
          /* DIE VORLAGEN-WAHL — UNSERE VIDEOS (Owner: „wir zeigen unsere videos als
             templates"): der BildWahl-Slider spielt die Clips stumm in den Kacheln,
             die Scheibe öffnet die Karte. Die Wahl ist das Versprechen, WIE sein
             Video aussehen wird. */
          <div className="mt-1">
            <p className="text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{S.schritt2}</p>
            <div className="mt-2">
              <BildWahl gross wert={vorlage} waehle={setVorlage} sprache={lang}
                ansehenLabel={S.cta} titel={S.kicker}
                bilder={vorlagen.map((v, i) => ({ id: String(i), name: "", bild: v.poster || v.video, video: v.video, poster: v.poster || undefined }))} />
            </div>
            {/* Zurueck-Chip LINKS VOM CTA — die EINE Regel. */}
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => onSchrittChange(1)} aria-label={F.back}
                className="lb-chip grid h-12 w-12 shrink-0 place-items-center rounded-full active:scale-95 transition">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Knopf art="gold" onClick={() => {
                void logTunnelEvent("look_selected", P.slug, { lookId: `vorlage-${vorlage}` });
                onSchrittChange(3);
              }}>
                {F.tunnelWeiter ?? F.next}
              </Knopf>
            </div>
          </div>
        )}

        {schritt === 3 && (<>
          <TunnelKacheln
            zurueckLabel={F.back}
            aufZurueck={() => onSchrittChange(2)}
            links={<>
              {/* SEIN Teil zuerst (der Pivot: er bringt die Klamotte mit), daneben SEIN
                  Foto — beides gestrichelte Haus-Kacheln, beide Plätze immer sichtbar. */}
              <TunnelKachelUpload foto={teil} titel={S.teilKachel} hinweis={S.teilHinweis}
                onWaehlen={() => { setCropZiel("teil"); teilRef.current?.click(); }}
                onLoeschen={teil ? () => setTeil("") : undefined} />
              <TunnelKachelUpload foto={foto} titel={S.fotoKachel} hinweis={S.merkmale[1]?.text}
                onWaehlen={() => { setCropZiel("foto"); fotoRef.current?.click(); }}
                onLoeschen={foto ? () => setFoto("") : undefined} />
            </>}
            ziel={<VorlagenKachel bildUrl={gewaehlt?.poster || ""} videoUrl={gewaehlt?.video || ""}
              ansehenLabel={S.cta} sprache={lang} titel={S.kicker} />}
            knopf={{
              /* Preis erst mit vollstaendigem Beitrag (die generelle Tunnel-Regel vom
                 13.08.) — dann „Jetzt generieren — 9,99 €" aus der Tabelle. */
              text: videoBusy ? F.oneMoment : (foto && teil) ? `${F.generateNow} — ${eur(preisCents, lang)}` : F.generateNow,
              disabled: !foto || !teil || videoBusy, busy: videoBusy,
              onClick: () => void videoKaufen(),
            }}
            einwilligung={<>
              <KurzeEinwilligung tpl={F.consentKurz} linkLabel={F.agbLink} />
              {/* Owner 13.08.2026, wörtlich: „Nur Bilder von dir selbst dürfen hochgeladen
                  werden." — als eigene Zeile unter der Einwilligung, in allen 7 Sprachen. */}
              {" "}<span className="block">{S.nurEigene}</span>
            </>}
          />
          <input ref={teilRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("teil"); setCropDatei(f); } e.target.value = ""; }} />
          <input ref={fotoRef} type="file" accept="image/*,.heic,.heif" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("foto"); setCropDatei(f); } e.target.value = ""; }} />
          {cropDatei && (
            <ImageCropper file={cropDatei} aspect={3 / 4} title={cropZiel === "teil" ? S.teilKachel : S.fotoKachel}
              onCancel={() => setCropDatei(null)}
              onSave={(zugeschnitten: File) => {
                const ziel = cropZiel;
                setCropDatei(null);
                const r = new FileReader();
                r.onload = () => { const d = String(r.result ?? ""); if (ziel === "teil") setTeil(d); else setFoto(d); };
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
