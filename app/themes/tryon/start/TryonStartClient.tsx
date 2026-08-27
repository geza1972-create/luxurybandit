"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import TunnelSeite from "@/components/TunnelSeite";
import ImageCropper from "@/components/ImageCropper";
import { produkt } from "@/lib/produkte";
import { TunnelStart, TunnelFortschritt, TunnelKacheln, TunnelKachelUpload, KurzeEinwilligung, Knopf, AufladeWaehler } from "@/components/CI";
import { kissText } from "@/lib/kiss-i18n";
import { tryonText } from "@/lib/tryon-i18n";
import { getStoredAuthSession, signInWithOAuth } from "@/lib/supabase-auth-client";
import { guthabenLesen, aktiveAdresse } from "@/lib/guthaben-konto";
import { reichtGuthaben } from "@/lib/kasse";
import { eur, geschenkPreisCents } from "@/lib/pricing";
import { landAusZeitzone } from "@/lib/land-erkennen";
import { kasseOeffnen, kassenFenster } from "@/lib/browser-erkennen";
import { useKasseImFenster, KasseZuBeiSchritt } from "@/components/KasseImFenster";
import { tryonPromptZiehen } from "@/lib/tryon-szenen";
import { logTunnelEvent } from "@/lib/track-funnel";
import { darfMessen } from "@/lib/land-erkennen";

/**
 * DER TRY-ON-TUNNEL — DER KUNDE BRINGT SEIN KLEIDUNGSSTÜCK MIT, UNSERE VIDEOS SIND DIE
 * VORLAGEN (Owner 13.08.2026 abends, in zwei Sätzen: „ich will dass user selber klamotten
 * hochladen … also nicht mher unsere" + Klarstellung „wir zeigen unsere videos als
 * templates. das ist doch unser tunel"). Also stur die drei Haus-Schritte:
 *
 *   Schritt 1  Name + E-Mail (Haus-Lead, theme "tryon")
 *   Schritt 3  SEIN Teil (Shop-Foto genügt) + SEIN Foto als Upload-Kacheln, darunter
 *              „Jetzt generieren — 9,99 €" über die EINE Kasse (Hochzeits-Muster); der
 *              Pixverse-Referenz-Lauf (person + garment, beides SEINE Uploads) zieht an
 *              und animiert in einem Lauf, die Galerie zeigt das Video in der Karte.
 *
 * DIE VORLAGEN-WAHL WAR SCHRITT 2 UND IST AM 27.08.2026 RAUS (Owner: „der User kann doch
 * nicht das als Target nehmen, wenn er seine eigenen Klamotten macht"). Sie zeigte unsere
 * Videos als Slider und versprach, „WAS für ein Video am Ende herauskommt" — floss aber nie
 * in die Erzeugung ein: der Auftrag zieht seinen Szenen-Prompt unabhaengig davon
 * (`tryonPromptZiehen`). Die Vorlagen liegen weiter in public/Tryon und tragen die
 * Landingpage; nur waehlen laesst sich hier nichts mehr, was folgenlos bleibt.
 */
export default function TryonStartClient({ lang, code }: {
  lang: string;
  code: string;
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

  /**
   * Genau die Kasse aus `WeddingStartClient.kaufen()` — Guthaben zuerst, sonst Stripe.
   * KEINE AUFLADUNG — DIREKTKAUF (Owner 20.08.2026): keine Zwangs-Vorpruefung mehr, die bei
   * zu wenig Guthaben den Aufladen-Dialog oeffnete. Reicht das Guthaben, bucht die Kasse
   * lautlos davon ab; reicht es nicht, geht es direkt zur Stripe-Kasse.
   */
  const kaufen = async (topupCents?: number, kontoFrisch = false): Promise<boolean> => {
    /**
     * KEIN KASSEN-POPUP MEHR (Owner 15.08.2026: „mir stinkt es mit stripe pop up fenster").
     *
     * Das leere Fenster war eine Notloesung gegen Popup-Blocker — und hat sich zum Problem
     * ausgewachsen: In der Facebook-WebView stapelt es eine zweite Ebene ueber die Seite,
     * aus der der Kunde oft nicht zurueckfindet; gemessen wurde dort 11-mal eine Kasse
     * geoeffnet und NIE bezahlt. Ab jetzt geht die Kasse in DERSELBEN Registerkarte auf
     * (`kasseOeffnen`), und die Rueckkehr faengt der bestehende `cs`-Weg auf.
     *
     * `popup` bleibt als Variable stehen, damit die `popup?.close()`-Aufrufe weiter
     * harmlos durchlaufen — sie schliessen jetzt nichts mehr, weil nichts mehr aufgeht.
     */
    const popup = kassenFenster();
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
          /* Kasse IN der Seite, und sie spricht die Sprache der Seite (15.08.2026). */
          eingebettet: kasse.anfordern, lang,
        }),
      }).then(r => r.json());
      if (start?.walletPaid) {
        if (typeof start.rest === "number") setGuthabenCents(start.rest);
        try { popup?.close(); } catch { /**/ }
        void logTunnelEvent("payment_completed", P.slug, { via: "wallet" });
        return true;
      }
      /* DIE EINGEBETTETE KASSE HAT KEINE `url` (15.08.2026, an „Start nicht möglich."
         im laufenden Trichter abgelesen). Stripe liefert dort statt einer Adresse ein
         `clientSecret` — die alte Pruefung hielt eine voellig gesunde Sitzung fuer einen
         Fehlschlag und brach ab. Gut ist die Sitzung, wenn EINES von beiden da ist. */
      if ((!start?.url && !start?.clientSecret) || !start?.sessionId) {
        try { popup?.close(); } catch { /**/ }
        setFehler(start?.error || F.statusNotWork);
        return false;
      }
      /* Steht die Kasse in der Seite, ist hier Schluss — kein Seitenwechsel mehr. */
      if (kasse.uebernehmen(start.clientSecret)) return false;
      /* NIE IN DER FB-APP BEZAHLEN (15.08.2026) — auf Android schickt `kasseOeffnen`
         den Kunden mit der Stripe-Adresse nach Chrome. Siehe lib/browser-erkennen.ts. */
      if (kasseOeffnen(popup, start.url) !== "popup" || !popup) return false;
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
      /**
       * DIESELBE KETTE WIE DER TANZ (Owner 15.08.2026: „genau das ist die Kette fuer Try-on
       * auch. Genau dieselbe").
       *
       * ERST ANZIEHEN, DANN FILMEN — weil Pixverse nichts AUSZIEHT, es legt nur an. Wer sein
       * Foto in Pullover schickt, bekam das Teil darueber gelegt. FASHN ersetzt die Kleidung
       * wirklich, und die Anweisung auf einen PORTRAET-Zuschnitt haelt das Ergebnis klein
       * genug, dass Pixverse es als Referenz annimmt (am 15.08. an einem Ganzkoerperfoto
       * gemessen: zurueck kam ein Brustbild).
       *
       * SCHEITERT FASHN, laeuft es mit dem Ausgangsfoto weiter — genau wie bisher.
       */
      let person = foto;
      try {
        const alsDatei = async (src: string, name: string) =>
          new File([await (await fetch(src)).blob()], name, { type: "image/jpeg" });
        const fd = new FormData();
        fd.append("modelImage", await alsDatei(foto, "person.jpg"));
        fd.append("image", await alsDatei(teil, "garment.jpg"));
        fd.append("mode", "fashion-model");
        fd.append("aspectRatio", "9:16");
        fd.append("prompt", "Portrait crop: show only the head, shoulders and upper chest of the person, "
          + "closely framed like a headshot. She wears the outfit from the product image. "
          + "Keep her face, hair and appearance exactly the same.");
        const d = await fetch("/api/generate-fashn", { method: "POST", body: fd }).then(r => r.json());
        person = (d?.image || d?.imageUrl || foto) as string;
      } catch { /* angezogen wird sie dann von Pixverse — wie vor dem 15.08. */ }
      const start = await fetch("/api/generate-tryon-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genId, person, garment: teil,
          /* SEIN Foto des Teils erst freistellen lassen (15.08.2026). Ein Shop-Foto zeigt
             fast immer ein Model darin — und an Pixverse geht nie eine Person in Waesche,
             nur der Stoff. Unsere eigenen Sets (Tanz) sind schon freigestellt und schicken
             diesen Schalter deshalb nicht. */
          garmentCutout: true,
          /**
           * EINER VON 50 URLAUBSORTEN (Owner 15.08.2026: „da wird ein schoener Urlaubsort
           * gemacht, wir haben 50 Prompts, oder nicht").
           *
           * Hier stand gar kein Prompt — also griff der Rueckfall der Route, das nuechterne
           * Studio. Die 50 Orte gab es laengst, aber nur in der alten Seite `/try`; seit
           * heute liegen sie in `lib/tryon-szenen.ts` und beide Trichter ziehen daraus,
           * nie zweimal hintereinander denselben.
           */
          prompt: tryonPromptZiehen() }),
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

  /* EIN Kassen-Weg fuer alle Trichter (15.08.2026) — siehe components/KasseImFenster. */
  const kasse = useKasseImFenster();

  return (
    <TunnelSeite schritte={P.schritte} schrittBekannt={P.schrittBekannt} light={light} code={code} produkt={P.slug}>
      {({ schritt, onSchrittChange }) => (<>
        {/* Der Schritt-Pfeil raeumt die Kasse weg — kein zweiter Zurueck-Knopf. */}
        <KasseZuBeiSchritt schritt={schritt} aufZu={kasse.schliessen} />
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
              /* OHNE ADRESSE EINFACH WEITER (Owner 16.08.2026) — siehe TunnelStart in
                 components/CI.tsx: die Pflicht steht jetzt am Erzeugen, nicht an Schritt 1. */
              if (!e.trim()) { setName(n); setMail(""); setLeadFehler(""); onSchrittChange(3); return; }
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
                onSchrittChange(3);
              } catch { setLeadFehler(F.statusNetwork); setLeadBusy(false); }
            }} />
        )}

        {schritt === 3 && (<>
          <TunnelKacheln
            zurueckLabel={F.back}
            aufZurueck={() => onSchrittChange(1)}
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
            /* KEINE ZIEL-KACHEL (Owner 27.08.2026): Rechts stand die gewaehlte Vorlage —
               eine fremde Person in einem fremden Kleid, hinter einem Pfeil, also genau
               dort, wo der Nutzer sein Ergebnis erwartet. Wer sein EIGENES Kleidungsstueck
               hochlaedt, hat dort nichts zu waehlen. */
            ziel={null}
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
            <ImageCropper file={cropDatei} aspect={3 / 4} title={cropZiel === "teil" ? S.teilKachel : S.fotoKachel} sprache={lang}
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
        {/* DAS KASSEN-FORMULAR IN DER SEITE (15.08.2026). */}
        {kasse.block}
      </>)}
    </TunnelSeite>
  );
}
