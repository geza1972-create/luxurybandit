"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { PRODUKTE } from "@/lib/produkte";

/**
 * DER ADS-TAB (Owner 13.08.2026: „Ich muss bei jedes Thema überlegen wie ich die Ads
 * mache, Texte Videos für Meta." → „klar hätte ich das gerne im ADMIN") — das
 * Anzeigen-Playbook als Admin-Werkzeug: je Produkt Ziel-URL, Hooks, Primary, Headline,
 * Video-Ordner, alles mit Kopier-Knopf. Kurzform aus `PRODUKTE.<slug>.marketing` (§31),
 * Langform hier — dieselben Texte wie ANZEIGEN.md im Repo (die menschenlesbare Ausgabe;
 * ändert sich eines, das andere mitziehen, bis der Produkt-Generator beide schreibt).
 */
const LANGFORM: Record<string, { hooks: string[]; primaryDe: string; primaryEn: string; hinweis?: string }> = {
  versprechen: {
    hooks: [
      "In 5 Jahren schaust du auf heute zurück. Was wirst du sehen?",
      "Nimm eine Nachricht an dein zukünftiges Ich auf. Wir machen einen Film daraus.",
      "Record a message to your future self. We turn it into your Future Film.",
    ],
    primaryDe: "Sieh deine Zukunft. Mach das Versprechen. Halte es 30 Tage lang. Dein persönlicher Future Film + 30-Tage-Programm mit täglicher Checkliste — 9,99 €, einmalig.",
    primaryEn: "See your future. Make the promise. Live it for 30 days. Your personal Future Film + a 30-day program with a daily checklist — €9.99, one-off.",
  },
  birthday: {
    hooks: [
      "Sag Happy Birthday auf eine Art, die niemand erwartet.",
      "Dein Gesicht. Deine Stimme. Ein Geburtstagsgruß aus einer anderen Welt.",
      "Say happy birthday in a way nobody expects.",
    ],
    primaryDe: "Nimm dich 30 Sekunden auf — wir machen daraus ein Geburtstagsvideo mit deinem Gesicht und deiner Stimme, in einer Welt, die niemand erwartet. 9,99 €.",
    primaryEn: "Record 30 seconds — we turn it into a birthday video with your face and your voice. €9.99.",
  },
  kiss: {
    hooks: [
      "Schick einen Kuss an den Menschen, den du liebst.",
      "Ein Foto von dir, eins von ihr — ein Video von euch beiden.",
      "Send a kiss to the one you love.",
    ],
    primaryDe: "Zwei Fotos, eine Szene deiner Wahl — ein privates Kussvideo von euch beiden, nur für sie. 9,99 €.",
    primaryEn: "Two photos, one scene — a private kiss video of you both, made for her alone. €9.99.",
  },
  wedding: {
    hooks: [
      "Eure Hochzeitseinladung als Video — plus Gästeliste, Menü und Gruppenchat.",
      "Your wedding invitation as a video — with guest list, menu and group chat.",
    ],
    primaryDe: "Zwei Fotos von euch — eine Traum-Einladung als Video, 30 Tage online, Zusagen mit einem Tipp. 9,99 €; Gästeliste, Menü & Chat im Abo 14,99 €/Monat, jederzeit kündbar.",
    primaryEn: "Two photos — a dream video invitation, online for 30 days, RSVPs with one tap. €9.99; guest list, menu & chat at €14.99/month, cancel anytime.",
  },
  holiday: {
    hooks: [
      "Komm bitte mit nach Teneriffa — als Video-Einladung, die niemand ablehnen kann.",
      "Ask them away — with a video invitation nobody can say no to.",
    ],
    primaryDe: "Zwei Fotos, eine Traum-Szene, dein Einladungssatz — die Urlaubs-Einladung als Video. 9,99 €.",
    primaryEn: "Two photos, a dream scene, your one line — the holiday invitation as a video. €9.99.",
  },
  poledance: {
    hooks: [
      "Überrasch ihn heute Nacht — mit einem Video, das nur er je sieht.",
      "Surprise him tonight — with a video only he will ever see.",
    ],
    primaryDe: "Ein Foto von dir, ein Set deiner Wahl — ein privates Tanzvideo, nur für ihn. Nichts wird irgendwo veröffentlicht. 9,99 €.",
    primaryEn: "One photo, one set — a private dance video, for him alone. Nothing is ever posted. €9.99.",
  },
  tryon: {
    hooks: [
      "Sieh dich selbst in dem Look — ein Foto genügt.",
      "Wardrobe an? Ein Foto von dir, und du trägst es.",
      "See yourself in the look — one photo is enough.",
    ],
    primaryDe: "Wähl einen Look aus der Wardrobe, lad ein Foto von dir hoch — dein Try-on-Video, in deiner Karte. 9,99 €. Nur Bilder von dir selbst.",
    primaryEn: "Pick a look, upload one photo of yourself — your try-on video, in your card. €9.99. Only photos of yourself.",
    hinweis: "Meta-Freigabe: keine Lingerie-Kacheln als Creative — Kleider/Roben-Clips nehmen.",
  },
  chat: {
    hooks: [
      "Schenk ihm eine perfekte KI-Freundin. 💛",
      "Er will immer Ja hören? Dann ist das sein Geschenk.",
      "Gift him a perfect AI girlfriend.",
    ],
    primaryDe: "Bella schreibt jeden Tag in seiner Sprache zurück — und erinnert sich an gestern. Erster Monat 9,99 €, danach verlängert ER für 14,99 €/Monat, jederzeit kündbar.",
    primaryEn: "Bella writes back in his language, every day — and remembers yesterday. First month €9.99, he renews at €14.99/month, cancel anytime.",
    hinweis: "Immer als GESCHENK bewerben (Titel spricht den Käufer an); der KI-Hinweis im Chat bleibt.",
  },
  gutschein: {
    hooks: [
      "Keine Idee? Schenk die Wahl — der Gutschein für alle LuxuryBandit-Geschenke.",
      "No idea what to gift? Give the choice.",
    ],
    primaryDe: "Die Gutschein-Karte ist gratis — du zahlst nur das Geschenk dahinter. Er oder sie sucht sich aus: Kuss, Geburtstag, Tanz, Urlaub, Hochzeit.",
    primaryEn: "The voucher card is free — you only pay for the gift inside.",
  },
};

function KopierZeile({ text, mono = false }: { text: string; mono?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button"
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }); }}
      className="group flex w-full items-start gap-2 rounded-lg border border-black/8 bg-black/[0.03] px-2.5 py-2 text-left transition hover:border-black/25">
      <span className={`min-w-0 flex-1 text-[12px] leading-snug text-ink ${mono ? "break-all font-mono" : "font-semibold"}`}>{text}</span>
      {ok ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> : <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/30 group-hover:text-ink/60" />}
    </button>
  );
}

export default function AdsPlaybook() {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-[12px] font-bold leading-snug text-ink/55">
        Je Produkt: Ziel-URL (hell, mit <span className="font-mono">src=fb</span> für Insights), Hooks zum Testen, Primary Text (DE/EN),
        Headline — alles antippen = kopiert. Video: aus dem genannten public-Ordner. Regeln &amp; Langform: ANZEIGEN.md im Repo.
      </p>
      {Object.values(PRODUKTE).map(p => {
        const l = LANGFORM[p.slug];
        const url = `https://luxurybandit.com${p.startPfad}?light=1&src=fb`;
        return (
          <div key={p.slug} className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-black text-ink">{p.marketing?.headline ?? p.slug}</p>
              <a href={url} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-[11px] font-black text-ink/40 hover:text-ink">
                öffnen <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {p.marketing?.versprechen && <p className="mt-0.5 text-[11.5px] font-semibold text-ink/55">{p.marketing.versprechen}</p>}
            <div className="mt-2.5 space-y-1.5">
              <KopierZeile text={url} mono />
              {(l?.hooks ?? []).map((h, i) => <KopierZeile key={i} text={h} />)}
              {l?.primaryDe && <KopierZeile text={l.primaryDe} />}
              {l?.primaryEn && <KopierZeile text={l.primaryEn} />}
              {p.marketing?.headline && <KopierZeile text={p.marketing.headline} />}
            </div>
            <p className="mt-2 text-[10.5px] font-bold text-ink/40">
              Video: <span className="font-mono">public{p.marketing?.demoAsset ?? ""}</span>
              {l?.hinweis ? <> · ⚠ {l.hinweis}</> : null}
            </p>
          </div>
        );
      })}
    </div>
  );
}
