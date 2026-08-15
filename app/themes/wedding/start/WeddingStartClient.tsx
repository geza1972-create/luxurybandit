"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import TunnelSeite from "@/components/TunnelSeite";
import { produkt } from "@/lib/produkte";
import ImageCropper from "@/components/ImageCropper";
import { TunnelStart, TunnelFortschritt, TunnelKacheln, TunnelKachelUpload, VorlagenKachel, KurzeEinwilligung } from "@/components/CI";
import { AufladeWaehler } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { guthabenLesen, aktiveAdresse } from "@/lib/guthaben-konto";
import { getStoredAuthSession, signInWithOAuth } from "@/lib/supabase-auth-client";
import { reichtGuthaben } from "@/lib/kasse";
import { eur, themenPreisCents, geschenkPreisCents } from "@/lib/pricing";
import { KISS_LOOK_ID, HOCHZEIT_TRAUM_VIDEO } from "@/lib/wedding-prompt";
import { HOCHZEIT_VIDEO, HOCHZEIT_VIDEO_POSTER } from "@/lib/hochzeit-video";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { logTunnelEvent } from "@/lib/track-funnel";
import { darfMessen } from "@/lib/land-erkennen";
import GruppenChat from "@/components/GruppenChat";

/**
 * DIESELBE DEMO WIE AUF DER LANDINGPAGE (Owner-Zusatzauftrag 12.08.2026: „oder chat … wie bei
 * Hochzeit mit"). Wörtlich dieselben vier Sätze und Namen wie `app/themes/wedding/page.tsx`
 * (`DEMO_CHAT`/`DEMO_NAMEN`) — dort nicht exportiert, deshalb hier dupliziert statt aus einer
 * Server-Seite importiert. Ändert sich die Demo dort, gehört diese Kopie mitgeändert.
 */
const DEMO_NAMEN = ["Maria", "Andrei", "Maria", "Sofia"];
const DEMO_CHAT: Record<string, string[]> = {
  de: ["Jochen und Gina sitzen am Tisch 6.", "Können wir eine Volksmusik-Band bekommen?", "Wie wird das Wetter?", "Hilfe, ich habe mein Kleid zu Hause vergessen — wo finde ich eins in der Stadt?"],
  en: ["Jochen and Gina are at table 6.", "Could we get a folk band?", "What's the weather going to be like?", "Help, I left my dress at home — where can I find one in town?"],
  ro: ["Jochen și Gina stau la masa 6.", "Putem avea o formație de muzică populară?", "Cum va fi vremea?", "Ajutor, mi-am uitat rochia acasă — de unde pot lua una în oraș?"],
  es: ["Jochen y Gina están en la mesa 6.", "¿Podemos tener un grupo de música popular?", "¿Qué tiempo va a hacer?", "¡Socorro! Me he dejado el vestido en casa — ¿dónde encuentro uno en la ciudad?"],
  fr: ["Jochen et Gina sont à la table 6.", "Peut-on avoir un groupe folklorique ?", "Quel temps fera-t-il ?", "Au secours, j'ai oublié ma robe — où en trouver une en ville ?"],
  pt: ["O Jochen e a Gina estão na mesa 6.", "Podemos ter uma banda de música popular?", "Como vai estar o tempo?", "Socorro, deixei o vestido em casa — onde arranjo um na cidade?"],
  it: ["Jochen e Gina sono al tavolo 6.", "Possiamo avere una band di musica popolare?", "Che tempo farà?", "Aiuto, ho dimenticato il vestito a casa — dove ne trovo uno in città?"],
};

/**
 * DIE HOCHZEIT ALS TUNNEL-SEITE (KONZEPT-TUNNEL.md, Owner 12.08.2026: „Genauso müssen alle
 * tunels aussehen. nicht komplizierter.").
 *
 * NUR NOCH VERDRAHTUNG + DIE DREI SCHRITTE — die URL-/Bekannten-Logik wohnt in
 * `components/TunnelSeite.tsx` (nicht anfassen). Was HIER steht, ist neu, weil `EinladungBauen`
 * (die bisherige Hochzeitsseite) ein Karten-Dialog ist, kein schritt-basierter Tunnel — dieselbe
 * Kasse (`/api/kiss-log`, `/api/kiss-video-checkout`, `/api/generate-tryon-video`) wird hier mit
 * genau denselben Feldern noch einmal aufgerufen, wie es `EinladungBauen.bezahlen()` und
 * `.videoErzeugen()` tun (siehe die Kommentare dort).
 *
 * KEIN SCHRITT 2: Seit dem 11.08.2026 hat die Hochzeit keine Szenen-Wahl mehr — die Traumwelt-
 * Kette (`hochzeitTraumPrompt`/`HOCHZEIT_TRAUM_VIDEO`) kennt weder „Kirche" noch „erster Kuss"
 * (siehe die ausführliche Begründung in `components/EinladungBauen.tsx` bei `SZENEN`).
 * `WEDDING_SZENEN` existiert zwar weiterhin in `lib/wedding-prompt.ts`, wirkt aber am Auftrag
 * nichts mehr — zwei Kacheln, die man antippen kann und die nichts tun, wären schlimmer als
 * keine Wahl. `schritte={[1, 3]}`.
 */
export default function WeddingStartClient({ lang, code, inhalt }: {
  lang: string;
  code: string;
  /* Landingpage-Inhalt, vom Server durchgereicht — TunnelSeite haengt ihn unter das
     Anmeldeformular (Owner 14.08.2026). */
  inhalt?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const light = searchParams.get("light") === "1";
  const F = kissText(lang, "wedding");

  /* AUS DER PRODUKT-KONFIG (Owner-Master-Auftrag 13.08.2026, §29): Schritte, Sprungziel
     und Kennung wohnen in lib/produkte.ts — EINE Stelle für alle sieben Tunnel. */
  const P = produkt("wedding");

  return (
    <TunnelSeite inhalt={inhalt} schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (
        <WeddingTunnel lang={lang} F={F} schritt={schritt} onSchrittChange={onSchrittChange} />
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
function WeddingTunnel({ lang, F, schritt, onSchrittChange }: { lang: string; F: any; schritt: number; onSchrittChange: (s: number) => void }) {
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadFehler, setLeadFehler] = useState("");

  const [ihrFoto, setIhrFoto] = useState("");   // die Braut
  const [seinFoto, setSeinFoto] = useState(""); // der Bräutigam
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

  const preisCents = themenPreisCents("wedding");
  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());
  const fotosDa = !!ihrFoto && !!seinFoto;

  /** Genau die Kasse aus `EinladungBauen.bezahlen()` — Guthaben zuerst, sonst Stripe. */
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
          body: JSON.stringify({ theme: "wedding", device, email: mail.trim() }),
        }).then(r => r.json());
        if (log?.id) { gid = String(log.id); setGenId(gid); }
      } catch { /**/ }
    }
    try {
      const start = await fetch("/api/kiss-video-checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genId: gid, once: !topupCents, videoAufpreis: false, thema: "wedding",
          ...(topupCents ? { aufladen: true, topupCents } : {}),
          email: mail.trim(), returnTo: window.location.pathname + window.location.search,
          /* Nur MIT Zustimmung meldet der Server den Kauf spaeter an Metas Conversions API. */
          einwilligung: darfMessen(),
        }),
      }).then(r => r.json());
      if (start?.walletPaid) {
        if (typeof start.rest === "number") setGuthabenCents(start.rest);
        try { popup?.close(); } catch { /**/ }
        void logTunnelEvent("payment_completed", "wedding", { via: "wallet" });
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
          void logTunnelEvent("payment_completed", "wedding", { via: "stripe", eventId: String(start.sessionId) });
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

  /** Bezahlen, dann denselben Video-Auftrag anstossen wie `EinladungBauen.videoErzeugen()`. */
  const generieren = async (topupCents?: number) => {
    if (!fotosDa || !mailOk || busy) return;
    setBusy(true); setStatus(F.oneMoment);
    // `checkout_started` (Owner-Architektur-Abgleich 12.08.2026, §32).
    void logTunnelEvent("checkout_started", "wedding");
    const ok = await kaufen(topupCents);
    if (!ok) { setBusy(false); return; }
    // `generation_started` — die Zahlung steht, jetzt beginnt der Auftrag beim Anbieter.
    void logTunnelEvent("generation_started", "wedding");
    try {
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookId: KISS_LOOK_ID, genId, person: seinFoto, garment: ihrFoto, prompt: HOCHZEIT_TRAUM_VIDEO }),
      }).then(r => r.json());
      if (start?.videoId && genId) {
        void fetch("/api/kiss-log", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ update: genId, videoId: start.videoId }),
        }).catch(() => {});
      }
    } catch { /* bezahlt bleibt bezahlt — die Galerie zeigt den Stand, Skill `paid-jobs-must-survive-the-browser` */ }
    // DER SERVER LIEFERT NACH (Memory `paid-jobs-must-survive-the-browser`): Die Galerie zeigt
    // den Auftrag als „wird erzeugt", sobald er fertig ist, steht er dort.
    window.location.href = "/my-gallery";
  };

  return (
    <>
      {/* FORTSCHRITTS-PUNKTE UND ZURÜCK-CHEVRON WIE IM GANZEN HAUS (Owner-Befund 12.08.2026,
          am Hochzeits-Tunnel: „warum siht der Wedding tunel anders aus? … KEINE Fortschritts-
          Punkte, KEIN Zurück-Chevron links"). `TunnelFortschritt`/`TunnelKacheln` sind aus
          `KissFunnel.tsx`s Schritt 3 (Kuss/Geburtstag/Versprechen) nach `components/CI.tsx`
          gezogen — dieselbe Optik, ein Baustein. */}
      <TunnelFortschritt schritte={[1, 3]} aktuell={schritt} />
      {schritt === 1 && (
        <TunnelStart
          produkt="wedding"
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
                ziel.set("s", "3");
                if (jetzt.get("light") === "1") ziel.set("light", "1");
                const code = jetzt.get("code") ?? "";
                if (code) ziel.set("code", code);
                sessionStorage.setItem("lb_oauth_return", `/themes/wedding/start?${ziel.toString()}`);
              } catch { /* privater Modus — dann landet er auf dem Konto-Dashboard */ }
              try { signInWithOAuth("google", `${window.location.origin}/auth/confirm`); } catch { /**/ }
            },
          }}
          zurueckHref={(() => { const q = new URLSearchParams(); try { const j = new URLSearchParams(window.location.search); if (j.get("light") === "1") q.set("light", "1"); const c = j.get("code") ?? ""; if (c) q.set("code", c); } catch { /**/ } const s = q.toString(); return `/themes/wedding${s ? `?${s}` : ""}`; })()}
          lang={lang} anfangsName={name} anfangsEmail={mail} busy={leadBusy} fehlerAussen={leadFehler}
          onWeiter={async (n, e) => {
            setName(n); setMail(e); setLeadBusy(true); setLeadFehler("");
            try {
              let device = "";
              try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
              const r = await fetch("/api/kiss-claim", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: e, ...(n.trim() ? { name: n.trim() } : {}), device, theme: "wedding", vorab: true, land: landAusZeitzone(), lang, consentAt: new Date().toISOString() }),
              });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) { setLeadFehler(d?.error ?? F.statusNotWork); setLeadBusy(false); return; }
              try { localStorage.setItem("lb_kiss_mail", e); } catch { /**/ }
              setLeadBusy(false);
              onSchrittChange(3);
            } catch { setLeadFehler(F.statusNetwork); setLeadBusy(false); }
          }} />
      )}

      {schritt === 3 && (
        <div>
          {/* DIESELBE KACHEL-REIHE WIE KUSS/GEBURTSTAG/VERSPRECHEN (Owner-Befund 12.08.2026:
              „zwei gedrängte kleine Links-Kacheln mit Text IM Bild statt der System-Kacheln
              … Kachel-Proportionen ungleich"). `TunnelKacheln` traegt Zurueck-Pfeil,
              gestrichelte Upload-Kacheln, Pfeil, Ziel-Kachel, Kaufknopf und Einwilligung —
              genau die Bausteine aus `components/CI.tsx`. */}
          <TunnelKacheln
            zurueckLabel={F.back} aufZurueck={() => onSchrittChange(1)}
            links={<>
              <TunnelKachelUpload foto={seinFoto} titel={F.uploadYou ?? F.you} hinweis={F.youHint}
                onWaehlen={() => seinRef.current?.click()} onLoeschen={() => setSeinFoto("")} />
              <TunnelKachelUpload foto={ihrFoto} titel={F.upTitle} hinweis={F.upHint}
                onWaehlen={() => ihrRef.current?.click()} onLoeschen={() => setIhrFoto("")} />
            </>}
            ziel={
              /* `HOCHZEIT_TRAUM_VIDEO` ist der Pixverse-PROMPT-TEXT, keine Videodatei — als
                 `videoUrl` hätte die Überlagerung Kauderwelsch geladen (12.08.2026, bei der
                 Prüfung gefunden). Das echte Beispiel ist dasselbe wie auf der Landingpage:
                 HOCHZEIT_VIDEO, mit seinem Poster (Karten-Regel). NICHT `HOCHZEIT_STIL` als
                 Kachel-Bild (Owner sah dort das GEBURTSTAGS-Motiv, schon vom Hauptagenten
                 auf `HOCHZEIT_VIDEO_POSTER` gefixt). */
              /* KEIN EIGENER `titel` (Owner 12.08.2026: „wir sollen die karten zeigen, die
                 erzeugt werden beim vrgrössern"): ohne ihn faellt die Karte im Vollbild auf
                 ihre eigene Standardueberschrift zurueck ("Wedding invitation" usw.) —
                 genau dieselbe, die `EinladungBauen` fuer die Hochzeit schon zeigt. */
              <VorlagenKachel bildUrl={HOCHZEIT_VIDEO_POSTER} videoUrl={HOCHZEIT_VIDEO} posterUrl={HOCHZEIT_VIDEO_POSTER} ansehenLabel={F.vorlageAnsehen} sprache={lang}
                /* DIE GRUPPENCHAT-DEMO ALS FEATURE-KARTE (Owner-Zusatzauftrag 12.08.2026) —
                   derselbe Baustein und dieselben Demo-Nachrichten wie auf der Landingpage,
                   im Vollbild unter der Video-Karte, kein Kaufknopf darin. */
                features={
                  <GruppenChat sprache={lang} demo sie="Ana" er="Mihai"
                    nachrichten={(DEMO_CHAT[lang] ?? DEMO_CHAT.en).map((t, i) => ({ name: DEMO_NAMEN[i] ?? "Gast", text: t }))} />
                } />
            }
            knopf={{
              /* DER FESTE KAUF-BETRAG, NICHT DIE „AB"-ZEILE (Owner-Auftrag 12.08.2026): Die
                 Hochzeit hat GENAU EINEN Preis (`HOCHZEIT_START_CENTS`, kein Ladder-Einstieg)
                 — `themenPreisZeile` haengt aber immer ein „ab"/„from" davor, weil sie für
                 Produkte MIT Preis-Leiter gebaut ist. `eur(geschenkPreisCents("wedding"))`
                 ist derselbe Betrag ohne das falsche Versprechen einer Staffelung. */
              /* DER PREIS ERST, WENN ES ETWAS ZU KAUFEN GIBT (Owner 13.08.2026, GENERELLE
                 Tunnel-Regel — „wieso nicht generel?"): solange die Fotos fehlen, traegt der
                 Knopf nur das Knopf-Wort; der Betrag kommt mit dem vollstaendigen Beitrag. */
              text: busy ? F.oneMoment : fotosDa ? `${F.generateNow} — ${eur(geschenkPreisCents("wedding"), lang)}` : F.generateNow,
              disabled: !fotosDa || !mailOk || busy, busy,
              onClick: () => void generieren(),
            }}
            /* DIE KURZE ZEILE STATT DES LANGEN ABSATZES (Owner-Architektur-Abgleich
               12.08.2026, §24 „Kurze Privacy-Zeile") — der Tunnel bekommt `consentKurz`
               statt `consent`; die Zustimmung-durch-Klick selbst ist unveraendert. */
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
