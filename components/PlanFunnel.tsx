"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { Upload, Loader2, Trash2, Check, Lock, Sparkles } from "lucide-react";
import ImageCropper from "@/components/ImageCropper";
import FotoAnleitung from "@/components/FotoAnleitung";
import Reaktionen from "@/components/Reaktionen";
import { planBildPrompt } from "@/lib/plan-prompt";
import { planText } from "@/lib/plan-i18n";
import { PLAN_CENTS, eur } from "@/lib/pricing";
import type { Lang } from "@/lib/lang";

/**
 * DER TRICHTER DES LUXURYBANDIT SYSTEMS.
 *
 * Owner 04.08.2026: „und dann weiter mit Bild-Upload, Generierung gratis und Plan gegen Geld."
 *
 * DER WEG:
 *   1. E-Mail   — Pflicht VOR dem Upload (Dauerregel `eingangstore-email-und-alter`)
 *   2. Foto     — auswählen, zuschneiden, SPEICHERN (Skill `upload-foto`, alle vier Pflichten)
 *   3. Idee     — ja/nein als Knöpfe, nicht als Frage ins Leere
 *   4. GRATIS   — ein Bild „du in fünf Jahren" über /api/free-preview
 *   5. GEGEN GELD — das System für {plan} über /api/plan-checkout
 *
 * WARUM DIE E-MAIL VOR DEM FOTO STEHT (und nicht danach): Sie ist das Einzige, was bleibt,
 * wenn er nicht kauft. Hinter das Ergebnis gelegt, verliert man sie bei genau denen, die
 * abspringen — dieselbe Lehre wie beim Kuss (siehe app/api/kiss-claim).
 *
 * WARUM DAS GRATIS-BILD DAS FÜNF-JAHRES-BILD IST: „Du heute" ist sein eigenes Foto und kostet
 * nichts; „in zwei Jahren" gehört zum bezahlten Lauf. Verschenkt wird genau das eine Bild,
 * wegen dem er gekommen ist. Die Rechnung dahinter steht in lib/plan-prompt.ts.
 *
 * KEIN EIGENER ZUSCHNITT, KEIN EIGENER LÖSCHKNOPF: `ImageCropper` bringt Speichern/Abbrechen
 * mit, der Löschknopf sitzt sichtbar auf der Kachel. Wer hier etwas Eigenes baut, baut den
 * Ärger von 29.07.2026 nach.
 */

type Schritt = "start" | "laeuft" | "fertig";

export default function PlanFunnel({ lang }: { lang: Lang }) {
  const T = planText(lang);

  const [mail, setMail] = useState("");
  const [mailFehler, setMailFehler] = useState("");

  /** Das gewählte, noch NICHT gespeicherte Foto — es wartet im Zuschnitt. */
  const [roh, setRoh] = useState<File | null>(null);
  /** Gespeichert: das zugeschnittene Foto als Data-URL. Erst ab hier ist es „seins". */
  const [foto, setFoto] = useState("");

  const [hatIdee, setHatIdee] = useState<null | boolean>(null);
  const [idee, setIdee] = useState("");

  const [schritt, setSchritt] = useState<Schritt>("start");
  const [ergebnis, setErgebnis] = useState("");
  const [fehler, setFehler] = useState("");
  const [kassenLauf, setKassenLauf] = useState(false);

  const dateiRef = useRef<HTMLInputElement>(null);

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  /** Ohne Adresse kein Upload — das Tor steht vor dem Foto, nicht dahinter. */
  const dateiWaehlen = useCallback(() => {
    if (!mailOk) {
      setMailFehler(T.mailFehlt);
      return;
    }
    setMailFehler("");
    dateiRef.current?.click();
  }, [mailOk, T.mailFehlt]);

  const erzeugen = useCallback(async () => {
    if (!foto || schritt === "laeuft") return;
    setFehler("");
    setSchritt("laeuft");
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try {
      const res = await fetch("/api/free-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: "plan",
          person: foto,
          device,
          /**
           * ZWEI JAHRE, NICHT FÜNF (Owner 05.08.2026: „bei dem können wir ein bild gratis
           * verschenken, du in 2 Jahren").
           *
           * Verschenkt wird der BEWEIS, nicht das Ziel: dass es mit seinem Gesicht
           * funktioniert. Das Fünf-Jahres-Bild ist das, wofür er zahlt — es zu verschenken
           * hiesse, das Produkt zu verschenken. Der Auftrag kommt aus lib/plan-prompt, die
           * Bedeckungszusage hängt die Route an.
           */
          prompt: planBildPrompt(undefined, hatIdee ? idee : "", 2),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d?.image) {
        setFehler(String(d?.error || T.fehlerBild));
        setSchritt("start");
        return;
      }
      setErgebnis(String(d.image));
      setSchritt("fertig");
      /* Die Adresse reist mit dem Ergebnis — sie ist das, was bleibt, wenn er nicht kauft. */
      void fetch("/api/kiss-claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mail.trim(), device, theme: "plan", vorab: true, lang }),
      }).catch(() => {});
      try { localStorage.setItem("lb_lead_email", mail.trim().toLowerCase()); } catch { /**/ }
      window.dispatchEvent(new Event("lb-guthaben-neu"));
    } catch {
      setFehler(T.fehlerNetz);
      setSchritt("start");
    }
  }, [foto, schritt, hatIdee, idee, mail, lang, T.fehlerBild, T.fehlerNetz]);

  const kaufen = useCallback(async () => {
    if (kassenLauf) return;
    setKassenLauf(true);
    setFehler("");
    try {
      const res = await fetch("/api/plan-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kaufen: true,
          email: mail.trim(),
          returnTo: "/themes/luxurybandit-plan",
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (d?.url) { window.location.href = String(d.url); return; }
      setFehler(String(d?.error || T.fehlerKasse));
    } catch {
      setFehler(T.fehlerNetz);
    }
    setKassenLauf(false);
  }, [kassenLauf, mail, T.fehlerKasse, T.fehlerNetz]);

  /**
   * DIE FELDER NAGELN IHRE FARBE NICHT FEST.
   *
   * Hier stand `style={{ color: "#fff" }}` - abgeschrieben vom Kuss-Trichter. Dort ist es
   * richtig, weil das Feld auf einer SCHWARZEN Karte sitzt. Diese Seite kommt aber HELL,
   * und weisse Schrift auf weissem Grund ist unsichtbar: Der Kunde tippt seine Adresse in
   * ein Feld, das leer aussieht.
   *
   * `lb-eingabe` loest genau das - die helle Fassung steht in globals.css (weisser Grund,
   * dunkle Schrift, dunkler Platzhalter) und greift per `!important`, sobald `.lb-fb` am
   * `<main>` haengt. Auf dunkel bleibt es wie hier geschrieben.
   */
  const feld =
    "lb-eingabe h-12 w-full rounded-xl border border-white/30 bg-white/[0.08] px-4 text-[15px] font-bold text-white outline-none placeholder:text-white/60 focus:border-[#f6cf51]";

  return (
    <div className="mt-6">
      {/* HIER STAND DIE PREISZEILE (HandelZeile) — raus am 06.08.2026 wie im Kuss-Trichter
          (Owner: „Diese Anmerkung wurde von Opus eingebaut ohne meine Zustimmung."). Der
          Preis steht auf dem Preis-Chip der Seite und am Kaufknopf. */}
      {/* Auch hier haengt das Ergebnis am Foto — und auch hier wird nichts abgewiesen. */}
      <FotoAnleitung lang={lang} className="mb-5" />

      {/* ── 1 · DIE ADRESSE ──────────────────────────────────────────────────────── */}
      <label className="block text-[12px] font-black uppercase tracking-wide text-[#f6cf51]">{T.mailLabel}</label>
      <input
        value={mail}
        onChange={e => { setMail(e.target.value); if (mailFehler) setMailFehler(""); }}
        type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
        className={`${feld} mt-2`}
      />
      {/* Absagen ROT und AM FELD, mit festem Farbwert — in der hellen Fassung färbt eine
          !important-Regel `text-red-*` sonst um (Memory `sichtbare-fehler-keine-formularfelder`). */}
      {mailFehler && (
        <p role="alert" className="mt-1.5 text-[12.5px] font-black leading-snug" style={{ color: "#ef4444" }}>
          {mailFehler}
        </p>
      )}

      {/* ── 2 · DAS FOTO ─────────────────────────────────────────────────────────── */}
      <input
        ref={dateiRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = "";            // dieselbe Datei soll erneut wählbar bleiben
          if (f) setRoh(f);               // → Zuschnitt. NICHTS wird still gespeichert.
        }}
      />

      {!foto ? (
        <button type="button" onClick={dateiWaehlen}
          className="mt-4 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full border border-white/25 text-[15px] font-black text-white/90 transition active:scale-95">
          <Upload className="h-[18px] w-[18px]" />
          {T.fotoWaehlen}
        </button>
      ) : (
        <div className="mt-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ergebnis || foto} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {/* Auf dem EIGENEN Bild belohnen die Zurufe, auf dem Beispiel verkaufen sie —
                dieselbe Doppelrolle wie beim Kuss. Erst ab dem fertigen Bild: über seinem
                Ausgangsfoto wäre „mach es" ein Zuruf ins Nichts. */}
            {ergebnis && <Reaktionen variant="plan" lang={lang} />}
            <span className="absolute bottom-3 left-3 rounded-full border border-white/25 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em]"
              style={{ background: "rgba(0,0,0,0.62)", color: "#fff", WebkitTextFillColor: "#fff" }}>
              {ergebnis ? T.stufen[2].kurz : T.stufen[0].kurz}
            </span>
            {/* Löschen — sichtbar, immer, auch am fertigen Bild (Skill `upload-foto`, Pflicht 3) */}
            <button type="button" aria-label={T.fotoLoeschen}
              onClick={() => { setFoto(""); setErgebnis(""); setSchritt("start"); }}
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full transition active:scale-90"
              style={{ background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,.35)", opacity: 0.7 }}>
              <Trash2 className="h-5 w-5" style={{ color: "#a07a34" }} />
            </button>
          </div>
        </div>
      )}

      {/* ── 3 · DIE IDEE ─────────────────────────────────────────────────────────── */}
      {foto && !ergebnis && (
        <div className="mt-5">
          <p className="text-[14px] font-black text-white">{T.ideeFrage}</p>
          <div className="mt-2.5 flex gap-2.5">
            {[[true, T.ideeJa], [false, T.ideeNein]].map(([wert, text]) => (
              <button key={String(wert)} type="button" onClick={() => setHatIdee(wert as boolean)}
                className={`h-11 flex-1 rounded-full text-[14px] font-black transition active:scale-95 ${
                  hatIdee === wert ? "bg-[#f6cf51] text-black" : "bg-white/10 text-white/80"}`}>
                {text as string}
              </button>
            ))}
          </div>
          {hatIdee === true && (
            <input
              value={idee} onChange={e => setIdee(e.target.value)}
              placeholder={T.ideePlatzhalter} maxLength={200}
              className={`${feld} mt-3`}
            />
          )}
          {hatIdee === false && (
            <p className="mt-3 text-[13px] font-bold leading-snug text-white/75">{T.ideeKeine}</p>
          )}
        </div>
      )}

      {/* ── 4 · GRATIS ERZEUGEN ──────────────────────────────────────────────────── */}
      {foto && !ergebnis && (
        <div className="mt-5">
          <button type="button" onClick={() => void erzeugen()} disabled={hatIdee === null || schritt === "laeuft"}
            className="lb-gold flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-black transition active:scale-95 disabled:opacity-40">
            {schritt === "laeuft" ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Sparkles className="h-[18px] w-[18px]" />}
            {schritt === "laeuft" ? T.laeuft : T.gratisKnopf}
          </button>
          <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12.5px] font-bold leading-snug text-[#f6cf51]">
            <Lock className="mt-[2px] h-3.5 w-3.5 shrink-0" />
            {T.gratisZeile}
          </p>
        </div>
      )}

      {/* ── 5 · GEGEN GELD ───────────────────────────────────────────────────────── */}
      {ergebnis && (
        <div className="mt-6">
          <p className="text-[15px] font-black leading-snug text-white">{T.nachBildTitel}</p>
          <ul className="mt-3 grid gap-2">
            {T.preisDrin.map(z => (
              <li key={z} className="flex gap-2.5 text-[13.5px] font-semibold leading-snug text-white/80">
                <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#f6cf51]" strokeWidth={3.5} />
                {z}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void kaufen()} disabled={kassenLauf}
            className="lb-gold mt-5 flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[16px] font-black transition active:scale-95 disabled:opacity-40">
            {kassenLauf && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
            {T.kaufenKnopf.replace("{plan}", eur(PLAN_CENTS, lang))}
          </button>
          <p className="mt-3 text-center text-[12.5px] font-bold leading-snug text-white/70">{T.kaufenZeile}</p>
        </div>
      )}

      {fehler && (
        <p role="alert" className="mt-4 text-[13px] font-black leading-snug" style={{ color: "#ef4444" }}>
          {fehler}
        </p>
      )}

      {/* Der Zuschnitt — Speichern/Abbrechen bringt er selbst mit. 4:5 wie die Karte. */}
      {roh && (
        <ImageCropper
          file={roh}
          aspect={4 / 5}
          title={T.zuschnittTitel}
          onCancel={() => setRoh(null)}
          onSave={(_datei, vorschau) => { setFoto(vorschau); setRoh(null); }}
        />
      )}
    </div>
  );
}
