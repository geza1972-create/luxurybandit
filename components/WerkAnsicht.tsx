"use client";

import { useEffect, useState } from "react";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import Reaktionen from "@/components/Reaktionen";

/**
 * DIE GETEILTE KARTE (Owner 01.08.2026: „nicht als Bild sondern als eigene Karte, weil er
 * eine sowieso hat in seiner Gallerie" — das nackte Bild liegt automatisch dort; geteilt
 * wird das Markenstück).
 *
 * Der Empfänger sieht genau die Karte aus dem Trichter — Rahmen, Titel, Herzchen — und
 * darunter den Knopf zum Generator: „das ist Werbung. Der Absender empfiehlt, nicht wir."
 * (Owner, sinngemäß seit 31.07.) Deshalb trägt der Link utm_source=share.
 *
 * Gezeigt wird NUR, was der Besitzer im Teilen-Dialog freigegeben hat; die Route /api/werk
 * gibt sonst nichts heraus. Kein Name, keine hochgeladenen Fotos, kein Datum.
 */

const TEXTE: Record<string, { cta: string; hinweis: string; privat: string; laden: string }> = {
  de: { cta: "Mach auch du eins — gratis", hinweis: "Erstellt mit LuxuryBandit", privat: "Diese Karte ist privat.", laden: "Einen Moment …" },
  en: { cta: "Make yours too — free", hinweis: "Made with LuxuryBandit", privat: "This card is private.", laden: "One moment …" },
  ro: { cta: "Fă și tu unul — gratuit", hinweis: "Creat cu LuxuryBandit", privat: "Acest card este privat.", laden: "Un moment …" },
  es: { cta: "Haz el tuyo — gratis", hinweis: "Creado con LuxuryBandit", privat: "Esta tarjeta es privada.", laden: "Un momento …" },
  fr: { cta: "Fais le tien — gratuit", hinweis: "Créé avec LuxuryBandit", privat: "Cette carte est privée.", laden: "Un instant …" },
  pt: { cta: "Faz o teu — grátis", hinweis: "Criado com LuxuryBandit", privat: "Este cartão é privado.", laden: "Um momento …" },
  it: { cta: "Crea il tuo — gratis", hinweis: "Creato con LuxuryBandit", privat: "Questa card è privata.", laden: "Un attimo …" },
};

const TITEL: Record<string, string> = {
  kiss: "The Kiss", wedding: "The Wedding", idol: "Your Idol",
};

export default function WerkAnsicht({ id }: { id: string }) {
  const [lang, setLang] = useState("en");
  const [stand, setStand] = useState<"laden" | "privat" | "ok">("laden");
  const [bild, setBild] = useState("");
  const [video, setVideo] = useState("");
  const [theme, setTheme] = useState("kiss");

  useEffect(() => {
    // Sprache aus dem Link (?l=…, vom Teilenden), sonst vom Gerät des Empfängers.
    try {
      const l = new URLSearchParams(window.location.search).get("l")
        || (navigator.language || "en").slice(0, 2);
      if (TEXTE[l]) setLang(l);
    } catch { /* en bleibt */ }
    void fetch(`/api/werk?id=${encodeURIComponent(id)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.ok) { setStand("privat"); return; }
        setBild(String(d.bild ?? "")); setVideo(String(d.video ?? ""));
        setTheme(String(d.theme ?? "kiss")); setStand("ok");
      })
      .catch(() => setStand("privat"));
  }, [id]);

  const T = TEXTE[lang] ?? TEXTE.en;
  const K = KARTE_TEXTE[lang] ?? KARTE_TEXTE.en;

  if (stand !== "ok") {
    return (
      <p className="mt-24 text-center text-[15px] font-bold text-white/70">
        {stand === "laden" ? T.laden : T.privat}
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[440px] px-3 pb-16 pt-6">
      <EinladungKarte
        sprache={lang} sie="" er="" demo
        titel={TITEL[theme] ?? TITEL.kiss}
        video={
          <div className="relative">
            {video ? (
              <EinladungAnsicht id="" videoUrl={video} zaehlen={false}
                tonText={K.ton} tonAusText={K.tonAus} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bild} alt="" width={1024} height={1536} className="block h-auto w-full" />
            )}
            <Reaktionen variant={theme} />
          </div>
        }
      />
      {/* DER WERBEKNOPF — der Grund, warum es diese Seite gibt. */}
      <a href={`/themes/${theme === "wedding" ? "wedding" : theme === "idol" ? "idol" : "kiss"}?utm_source=share&utm_campaign=werk`}
        className="lb-gold mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition">
        {T.cta} 💋
      </a>
      <p className="mt-2 text-center text-[11px] font-bold text-white/50">{T.hinweis}</p>
    </div>
  );
}
