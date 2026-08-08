"use client";

import { useEffect, useState } from "react";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import Reaktionen from "@/components/Reaktionen";
import { musikFuer } from "@/lib/musik";

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

const TEXTE: Record<string, { cta: string; zurueck: string; hinweis: string; privat: string; laden: string }> = {
  de: { cta: "Mach auch du eins — gratis", zurueck: "Kuss zurückschicken 💋", hinweis: "Erstellt mit LuxuryBandit", privat: "Diese Karte ist privat.", laden: "Einen Moment …" },
  en: { cta: "Make yours too — free", zurueck: "Send a kiss back 💋", hinweis: "Made with LuxuryBandit", privat: "This card is private.", laden: "One moment …" },
  ro: { cta: "Fă și tu unul — gratuit", zurueck: "Trimite un sărut înapoi 💋", hinweis: "Creat cu LuxuryBandit", privat: "Acest card este privat.", laden: "Un moment …" },
  es: { cta: "Haz el tuyo — gratis", zurueck: "Devolver el beso 💋", hinweis: "Creado con LuxuryBandit", privat: "Esta tarjeta es privada.", laden: "Un momento …" },
  fr: { cta: "Fais le tien — gratuit", zurueck: "Renvoyer un baiser 💋", hinweis: "Créé avec LuxuryBandit", privat: "Cette carte est privée.", laden: "Un instant …" },
  pt: { cta: "Faz o teu — grátis", zurueck: "Devolver o beijo 💋", hinweis: "Criado com LuxuryBandit", privat: "Este cartão é privado.", laden: "Um momento …" },
  it: { cta: "Crea il tuo — gratis", zurueck: "Rimanda un bacio 💋", hinweis: "Creato con LuxuryBandit", privat: "Questa card è privata.", laden: "Un attimo …" },
};

/**
 * DER TITEL UEBER DER KARTE (Owner 03.08.2026: „oben muss stehen nicht The Kiss, das ist zu
 * trocken — Unforgettable kiss gift, und drunter erstellt durch luxurybandit.com").
 *
 * „The Kiss" beschrieb den INHALT. Der Empfaenger sieht aber zuerst, WAS ER BEKOMMEN HAT:
 * ein Geschenk. Das Wort steht jetzt drin, und es steht dort, wo bei einer gedruckten Karte
 * die Praegung sitzt.
 */
const TITEL: Record<string, string> = {
  kiss: "Unforgettable kiss gift", wedding: "The Wedding", idol: "Your Idol",
};

export default function WerkAnsicht({ id }: { id: string }) {
  const [lang, setLang] = useState("en");
  const [stand, setStand] = useState<"laden" | "privat" | "ok">("laden");
  const [bild, setBild] = useState("");
  const [video, setVideo] = useState("");
  const [theme, setTheme] = useState("kiss");
  /** An wen der Gruss geht — macht aus „I love you" ein „Anna, I love you". */
  const [empfaenger, setEmpfaenger] = useState("");

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
        setTheme(String(d.theme ?? "kiss")); setEmpfaenger(String(d.empfaenger ?? "")); setStand("ok");
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
        /* DIE SIGNATUR UNTEN (Owner: „drunter erstellt durch luxurybandit.com" — „oder unten").
           Unten statt direkt unter dem Titel: Dort steht bei einer gedruckten Karte der
           Hersteller, und oben soll der Gruss stehen, nicht die Herkunft. Sie ist zugleich
           der einzige Hinweis, den ein Empfaenger auf uns bekommt — die Karte selbst wirbt
           nicht, sie schenkt. */
        fuss={
          <p className="lb-karte-gold mt-3 text-center text-[9px] font-bold uppercase tracking-[0.22em] opacity-70">
            erstellt durch luxurybandit.com
          </p>
        }
        /**
         * MUSIK VON SELBST, AUCH BEIM EMPFAENGER (Owner 03.08.2026: „die Musik soll
         * automatisch an sein").
         *
         * Hier zaehlt es am meisten: Das ist die Seite, die der beschenkte Mensch oeffnet.
         * Ohne Ton ist es ein Videoschnipsel, mit Ton ein Moment. Erlaubt der Browser den Ton
         * nicht (manche verlangen erst eine Geste), bleibt der Lautsprecher-Knopf stehen und
         * ein Tipp genuegt — es geht nichts verloren.
         *
         * `musik` je Thema statt des Standards: Sonst laege der HOCHZEITS-Ton unter einem
         * Kussvideo.
         */
        video={
          <div className="relative">
            {video ? (
              <EinladungAnsicht id="" videoUrl={video} poster={bild || undefined} zaehlen={false}
                {...(musikFuer(theme)
                  ? { musik: musikFuer(theme), tonAutomatisch: true }
                  : { originalton: true, schleife: false, musik: "" })}
                tonText={K.ton} tonAusText={K.tonAus} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bild} alt="" width={1024} height={1536} className="block h-auto w-full" />
            )}
            <Reaktionen variant={theme} lang={lang} name={empfaenger} />
          </div>
        }
      />
      {/* DER WERBEKNOPF — der Grund, warum es diese Seite gibt.

          BEIM KUSS HEISST ER ANDERS (Owner 03.08.2026: „wenn es jemand bekommt dann kann er
          das zurück antworten mit einem Kuss also Button"). „Mach auch du eins" ist eine
          Einladung an einen Zuschauer; „Kuss zurückschicken" ist eine Antwort an einen
          Menschen — und genau das ist dieser Empfaenger gerade.

          Und es steht kein „gratis" mehr darauf: Beim Kuss gibt es seit dem 03.08. kein
          Gratis-Bild mehr, er laeuft ueber das Guthaben. Der alte Text haette jeden
          Empfaenger mit einem Versprechen hergelockt, das der Trichter nicht mehr einloest —
          dieselbe Luege, die auf der Themenseite schon gestrichen wurde. */}
      <a href={`/themes/${theme === "wedding" ? "wedding" : theme === "idol" ? "idol" : "kiss"}?utm_source=share&utm_campaign=${theme === "kiss" ? "kuss-zurueck" : "werk"}`}
        className="lb-gold mt-4 flex h-12 w-full items-center justify-center rounded-full text-[15px] font-black active:scale-95 transition">
        {theme === "kiss" ? T.zurueck : `${T.cta} 💋`}
      </a>
      <p className="mt-2 text-center text-[11px] font-bold text-white/50">{T.hinweis}</p>
    </div>
  );
}
