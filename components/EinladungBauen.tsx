"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageUp, Sparkles, Trash2 } from "lucide-react";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import ImageCropper from "@/components/ImageCropper";
import { kissText } from "@/lib/kiss-i18n";

/**
 * DIE KARTE IST DIE BEDIENUNG.
 *
 * Owner 31.07.2026: „oder er sieht die Landingpage direkt auf dieser Seite und drückt auf das
 * Bild und öffnet sich ein Dialog … er klickt auf Name, dann öffnet sich Dialog, er klickt auf
 * Ort, öffnet sich Dialog. Dann hat er's zum Sharen direkt."
 *
 * Davor stand ein Trichter mit vier Schritten davor, und der Owner sagte zu Recht: „so versteht
 * es kein Mensch." Der Unterschied ist nicht die Zahl der Felder, sondern die Reihenfolge des
 * Verstehens: Wer zuerst die fertige Karte sieht, weiß sofort, was er baut, und füllt sie aus
 * wie ein Formular, das er schon kennt. Wer zuerst vier Schritte sieht, muss sich das Ergebnis
 * vorstellen — und die meisten tun das nicht, sie gehen.
 *
 * Es ist DIESELBE Karte, die der Gast später bekommt: gleiche Datei, gleiche Ornamente, gleiche
 * Maße. Was hier steht, steht dort.
 */

type Feld = "namen" | "wann" | "wo" | "fotos" | null;

const dateiZuDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ""));
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export default function EinladungBauen({ lang }: { lang: string }) {
  const T = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;
  const F = kissText(lang, "wedding");

  const [feld, setFeld] = useState<Feld>(null);
  const [sie, setSie] = useState("");
  const [er, setEr] = useState("");
  const [datum, setDatum] = useState("");
  const [ort, setOrt] = useState("");
  const [adresse, setAdresse] = useState("");
  const [telefon, setTelefon] = useState("");
  const [mail, setMail] = useState("");

  const [ihrFoto, setIhrFoto] = useState("");
  const [seinFoto, setSeinFoto] = useState("");
  const [bild, setBild] = useState("");
  const [bildPfad, setBildPfad] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [cropZiel, setCropZiel] = useState<"sie" | "er" | null>(null);
  const ihrRef = useRef<HTMLInputElement>(null);
  const seinRef = useRef<HTMLInputElement>(null);

  // Was schon getippt wurde, ueberlebt einen Seitenwechsel — dieselbe Regel wie im Trichter.
  const SPEICHER = "lb_einl_bau";
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(SPEICHER) || "{}");
      if (d.sie) setSie(d.sie); if (d.er) setEr(d.er);
      if (d.datum) setDatum(d.datum); if (d.ort) setOrt(d.ort);
      if (d.adresse) setAdresse(d.adresse); if (d.telefon) setTelefon(d.telefon);
      if (d.mail) setMail(d.mail);
    } catch { /**/ }
    try { setMail(m => m || localStorage.getItem("lb_kiss_mail") || ""); } catch { /**/ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SPEICHER, JSON.stringify({ sie, er, datum, ort, adresse, telefon, mail })); } catch { /**/ }
  }, [sie, er, datum, ort, adresse, telefon, mail]);

  const mailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.trim());

  const erzeugen = async () => {
    if (!ihrFoto || !seinFoto || !mailOk || busy) return;
    setBusy(true); setStatus(F.statusQuality);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try { localStorage.setItem("lb_kiss_mail", mail.trim()); } catch { /**/ }
    try {
      const d = await fetch("/api/free-preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person: seinFoto, model: ihrFoto, theme: "wedding", device }),
      }).then(r => r.json());
      if (d?.image) { setBild(d.image); setBildPfad(d.imagePath ?? ""); setStatus(""); setFeld(null); }
      else setStatus(d?.error || F.statusNotWork);
    } catch { setStatus(F.statusNetwork); }
    setBusy(false);
  };

  const einladungAnlegen = async () => {
    if (!bild || !sie.trim() || !er.trim() || busy) return;
    setBusy(true);
    let device = "";
    try { device = localStorage.getItem("lb_visitor") ?? ""; } catch { /**/ }
    try {
      const r = await fetch("/api/einladung", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bildPfad, sie: sie.trim(), er: er.trim(), datum,
          ort: ort.trim(), adresse: adresse.trim(), telefon: telefon.trim(),
          lang, device, email: mail.trim(),
        }),
      }).then(x => x.json());
      // Direkt auf die eigene Einladung: dort wird bearbeitet und verschickt.
      if (r?.url) window.location.href = r.url;
      else setStatus(r?.error || F.statusNotWork);
    } catch { setStatus(F.statusNetwork); }
    setBusy(false);
  };

  const eingabe = (wert: string, setzen: (v: string) => void, platzhalter: string, typ = "text") => (
    <input value={wert} onChange={e => setzen(e.target.value)} placeholder={platzhalter} type={typ}
      className="lb-karte-feld h-11 w-full rounded-lg px-3 font-serif text-[15px] outline-none" />
  );

  /** Ein Dialog, überall gleich: Titel, Felder, Fertig. Kein zweites Bedienmuster. */
  const dialog = (titel: string, inhalt: React.ReactNode, fertigAus = false) => (
    <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center" style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={() => setFeld(null)}>
      <div className="lb-karte w-full max-w-[440px] rounded-t-[22px] p-5 sm:rounded-[22px]" onClick={e => e.stopPropagation()}>
        <p className="lb-karte-gold text-center text-[10px] font-black uppercase tracking-[0.28em]">{titel}</p>
        <div className="mt-3 space-y-2">{inhalt}</div>
        <button type="button" onClick={() => setFeld(null)} disabled={fertigAus}
          className="lb-karte-wa mt-4 flex h-11 w-full items-center justify-center rounded-full text-[13px] font-black transition active:scale-95 disabled:opacity-45">
          {T.speichern}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <EinladungKarte
        sprache={lang}
        sie={sie.trim() || T.fSie}
        er={er.trim() || T.fEr}
        datum={datum}
        ort={ort.trim()}
        adresse={adresse.trim()}
        telefon={telefon.trim()}
        demo
        aufNamen={() => setFeld("namen")}
        aufDatum={() => setFeld("wann")}
        aufOrt={() => setFeld("wo")}
        video={
          <button type="button" onClick={() => setFeld("fotos")}
            className="relative grid aspect-[3/4] w-full place-items-center overflow-hidden">
            {bild ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bild} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="lb-tippbar grid h-full w-full place-items-center rounded-xl px-6 text-center">
                <span>
                  <ImageUp className="lb-karte-gold mx-auto h-9 w-9" />
                  <span className="mt-2 block font-serif text-[15px] font-bold">{F.pickHint}</span>
                </span>
              </span>
            )}
          </button>
        }
      />

      {/* Verschicken steht erst da, wenn es etwas zu verschicken gibt. */}
      {bild && sie.trim() && er.trim() && (
        <div className="mt-4">
          <button type="button" onClick={() => void einladungAnlegen()} disabled={busy}
            className="lb-gold lb-buy flex h-12 w-full items-center justify-center gap-2 rounded-full font-black transition active:scale-95 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {T.teilen}
          </button>
          <p className="mt-2 text-center text-[11px] font-bold leading-snug text-white/60">{F.probeHinweis}</p>
        </div>
      )}
      {status && <p className="mt-2 text-center text-[12px] font-bold text-white/75">{status}</p>}

      {feld === "namen" && dialog(T.zusTitel, (<>
        {eingabe(sie, setSie, T.fSie)}
        {eingabe(er, setEr, T.fEr)}
      </>))}

      {feld === "wann" && dialog(T.wann, eingabe(datum, setDatum, T.fDatum, "date"))}

      {feld === "wo" && dialog(T.wo, (<>
        {eingabe(ort, setOrt, T.fOrt)}
        {eingabe(adresse, setAdresse, T.fAdresse)}
        {eingabe(telefon, setTelefon, T.fTelefon, "tel")}
      </>))}

      {feld === "fotos" && dialog(F.step1, (<>
        <div className="grid grid-cols-2 gap-2">
          {([["sie", ihrFoto, ihrRef, F.upTitle], ["er", seinFoto, seinRef, F.you]] as const).map(([wer, foto, ref, titel]) => (
            <div key={wer} className="relative">
              <button type="button" onClick={() => ref.current?.click()}
                className="lb-tippbar grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-xl">
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <span className="px-2 text-center font-serif text-[13px] font-bold">{titel}</span>
                )}
              </button>
              {foto && (
                <button type="button" aria-label="Foto löschen"
                  onClick={() => (wer === "sie" ? setIhrFoto("") : setSeinFoto(""))}
                  style={{ background: "#fff", color: "#dc2626", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
                  className="absolute left-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full transition active:scale-90">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {/* Die Adresse steht VOR dem Erzeugen — dieselbe Regel wie im Trichter: kein Bild auf
            unsere Kosten fuer jemanden, der nie erreichbar ist. */}
        {eingabe(mail, setMail, F.mailQuestion, "email")}
        <button type="button" onClick={() => void erzeugen()} disabled={!ihrFoto || !seinFoto || !mailOk || busy}
          className="lb-karte-wa flex h-12 w-full items-center justify-center gap-2 rounded-full text-[14px] font-black transition active:scale-95 disabled:opacity-45">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {F.ctaFree}
        </button>
        <p className="text-center font-serif text-[11px] leading-snug opacity-70">{F.consent}</p>
        <input ref={ihrRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("sie"); setCropDatei(f); } e.target.value = ""; }} />
        <input ref={seinRef} type="file" accept="image/*,.heic,.heif" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setCropZiel("er"); setCropDatei(f); } e.target.value = ""; }} />
      </>), busy)}

      {cropDatei && cropZiel && (
        <ImageCropper file={cropDatei} aspect={3 / 4}
          title={cropZiel === "sie" ? F.upTitle : F.you}
          onCancel={() => { setCropDatei(null); setCropZiel(null); }}
          onSave={async (zugeschnitten) => {
            const ziel = cropZiel;
            setCropDatei(null); setCropZiel(null);
            const dataUrl = await dateiZuDataUrl(zugeschnitten);
            if (ziel === "sie") setIhrFoto(dataUrl); else setSeinFoto(dataUrl);
          }} />
      )}
    </div>
  );
}
