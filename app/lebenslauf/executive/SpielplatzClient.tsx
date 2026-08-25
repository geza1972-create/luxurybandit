"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, MessageCircle, Play, Mail, Check } from "lucide-react";
import LebenslaufExecutive from "@/components/LebenslaufExecutive";
import ImageCropper from "@/components/ImageCropper";
import { Knopf, EingabeMehrzeilig, Fehlerzeile, Laden } from "@/components/CI";
import { EXECUTIVE_TEXTE, type ExecutiveProfil } from "@/lib/lebenslauf-vorlage";
import type { Lang } from "@/lib/lang";

/**
 * DER SPIELPLATZ — /lebenslauf/executive (Owner 25.08.2026, KONZEPT „Der Spielplatz" +
 * „Ein Gespräch, zwei Türen"): sehen → sich selbst einsetzen → das Video vermissen →
 * Gold-Knopf. Der BEWERBERBERATER ist der Faden: er holt E-Mail (Tor VOR dem ersten
 * Zug — Owner: „ich will Leads auf jeden Fall"), pflegt den eingefügten Lebenslauf EIN
 * (1:1, keine Verbesserung), rechnet den Anzeigen-Match (Schnell-Analyse als Gespräch)
 * und verkauft: „Willst du deine Daten verbessern? Du kannst mehr erreichen."
 *
 * NICHTS WIRD FÜR DEN SPIELER GESPEICHERT (er hat nichts bezahlt): Karte und Foto leben
 * nur im Browser-Zustand; der Server kennt nur die Spielzüge (Deckel 5 + Admin-Ablage,
 * /api/lebenslauf-spiel). Das Foto verlässt den Browser NIE.
 *
 * DIE MAPPE BEGINNT OBEN MIT DEM ANSCHREIBEN (Owner: „Es müsste oben anfangen: ein
 * kurzes Anschreiben auf die Anzeige angepasst, dann drunter das Resume") — im
 * Muster-Zustand das Beispiel-Anschreiben samt Beispiel-Match, nach dem echten Match
 * die Kostprobe aus der Analyse.
 */

type Match = { prozent: number; jobtitel: string; gruende: string[]; luecken: string[]; befunde: string[]; anschreibenKurz: string };
type SpielDaten = {
  name: string; rolle: string; ort: string; sprachenKurz: string;
  schwerpunkte: string[]; profil: string; expertise: string[];
  erfahrung: { rolle: string; firma: string; zeitraum: string; ergebnis: string }[];
  ausbildung: { titel: string; ort: string; zeitraum: string }[];
  sprachen: { sprache: string; niveau: string }[];
};
type Msg = { von: "ich" | "ki"; text: string };
type Schritt = "intro" | "mail" | "daten" | "anzeige" | "frei";

const TEXTE = {
  de: {
    introB: "Ich bin dein Bewerbungsberater. Oben siehst du ein Muster — so sieht eine fertige Bewerbung bei uns aus. Willst du DICH da drin sehen?",
    introA: "Ich habe deine Stellenanzeige. Damit ich dir in Prozent sagen kann, ob sie zu dir passt, brauche ich zwei Dinge: deine E-Mail und deinen Lebenslauf.",
    jaDaten: "Ja, mit meinen Daten", nurSchauen: "Erst mal schauen",
    schauAntwort: "Schau dich um — tipp auf das Video, klapp die Erfahrung auf. Wenn du dich selbst sehen willst, tipp auf den Knopf.",
    mailFrage: "Deine E-Mail, dann legen wir los. (Es entsteht keine Seite — gespeichert wird erst, wenn du kaufst.)",
    mailFehler: "Das sieht nicht nach einer E-Mail aus.",
    datenFrage: "Jetzt du: Kopiere den Text aus deinem Lebenslauf und füg ihn hier ein. Ich übertrage ihn in die Mappe — so wie er ist, ohne etwas zu beschönigen.",
    datenZuWenig: "Da ist zu wenig Text — füg ruhig den ganzen Lebenslauf ein.",
    datenDrin: "Drin. Schau nach oben — das bist du. Ohne Beschönigung, genau was in deinem Lebenslauf steht.",
    fotoFrage: "Magst du dein Foto einsetzen? Es bleibt in deinem Browser — wir speichern nichts.",
    fotoChip: "Foto einsetzen", fotoTitel: "Dein Foto",
    fotoDrin: "Sieht gut aus. Tipp mal auf den Play-Knopf auf deinem Bild — so erlebt eine Firma dein fehlendes Video.",
    anzeigeFrage: "Und jetzt der spannende Teil: Füg eine Stellenanzeige ein (Text oder Link) — ich sage dir in Prozent, ob sie zu dir passt.",
    matchLauf: "Ich lese die Anzeige und vergleiche sie mit deinen Daten …",
    einpflegeLauf: "Ich übertrage deinen Lebenslauf in die Mappe …",
    matchDa: (p: number) => `${p} % — die Analyse steht oben unter deiner Mappe. Oben drüber siehst du auch schon ein kurzes Anschreiben auf genau diese Anzeige.`,
    videoEmpfehlung: "Meine Empfehlung: eine Video-Bewerbung. Firmen sehen dich, bevor sie dich einladen — das hat kaum ein Bewerber.",
    teaser: "Das war die Schnell-Analyse — nicht vollständig, nicht optimiert.",
    verkauf: "Willst du deine Daten verbessern? Du kannst mehr erreichen — mit vollständiger Analyse, Optimierung und deinem Video.",
    andereAnzeige: "Andere Anzeige testen", neuEinpflegen: "Lebenslauf neu einfügen",
    zuEnde: "Das war dein fünfter Zug — mehr geht im Spiel nicht. Mach es echt: Deine Bewerbung, richtig analysiert und optimiert.",
    zuegeZeile: (n: number) => n === 1 ? "Noch 1 Spielzug übrig." : `Noch ${n} Spielzüge übrig.`,
    senden: "Senden", denkt: "Einen Moment …",
    fehler: "Das hat nicht geklappt — bitte noch einmal.",
    gold: "Gratis weitermachen",
    analyseH: "Schnell-Analyse", passt: "Das passt", fehlt: "Das fehlt", befundeH: "Am Lebenslauf selbst",
    anschreibenH: "Anschreiben", kostprobe: "Kostprobe — das volle Anschreiben kommt mit deiner Bewerbung.",
    demoTitel: "Senior UX Designer (m/w/d) · Die Musterfirma GmbH · 72 %",
    demoAnschreiben: "Sehr geehrte Damen und Herren, Ihre Anzeige für die Position Senior UX Designer trifft genau meinen Werdegang: Konzeption, Designsysteme und Nutzerforschung verantworte ich seit Jahren in digitalen Produkten. Gern zeige ich Ihnen in einem Gespräch, was davon Sie sofort nutzen können.",
    demoHinweis: "Beispiel — so beginnt jede Bewerbung hier: Anschreiben oben, Lebenslauf darunter.",
  },
  en: {
    introB: "I'm your application advisor. Above you see a sample — that's what a finished application looks like here. Want to see YOURSELF in it?",
    introA: "I have your job ad. To tell you in percent how well it fits you, I need two things: your email and your resume.",
    jaDaten: "Yes, with my data", nurSchauen: "Just looking",
    schauAntwort: "Look around — tap the video, unfold the experience. When you want to see yourself in it, tap the button.",
    mailFrage: "Your email, then we start. (No page is created — nothing is saved until you buy.)",
    mailFehler: "That doesn't look like an email.",
    datenFrage: "Your turn: copy the text from your resume and paste it here. I'll transfer it into the folder — as it is, without polishing anything.",
    datenZuWenig: "That's too little text — paste the whole resume.",
    datenDrin: "Done. Look up — that's you. No polish, exactly what your resume says.",
    fotoFrage: "Want to add your photo? It stays in your browser — we store nothing.",
    fotoChip: "Add photo", fotoTitel: "Your photo",
    fotoDrin: "Looks good. Tap the play button on your picture — that's how a company experiences your missing video.",
    anzeigeFrage: "Now the exciting part: paste a job ad (text or link) — I'll tell you in percent how well it fits you.",
    matchLauf: "Reading the ad and comparing it with your data …",
    einpflegeLauf: "Transferring your resume into the folder …",
    matchDa: (p: number) => `${p}% — the analysis is right below your folder. Above it you'll already see a short cover letter for exactly this ad.`,
    videoEmpfehlung: "My recommendation: a video application. Companies see you before they invite you — almost no candidate has that.",
    teaser: "That was the quick analysis — not complete, not optimized.",
    verkauf: "Want to improve your data? You can achieve more — with full analysis, optimization and your video.",
    andereAnzeige: "Try another ad", neuEinpflegen: "Paste resume again",
    zuEnde: "That was your fifth move — the game ends here. Make it real: your application, properly analyzed and optimized.",
    zuegeZeile: (n: number) => n === 1 ? "1 move left." : `${n} moves left.`,
    senden: "Send", denkt: "One moment …",
    fehler: "That didn't work — please try again.",
    gold: "Continue for free",
    analyseH: "Quick analysis", passt: "What fits", fehlt: "What's missing", befundeH: "About the resume itself",
    anschreibenH: "Cover letter", kostprobe: "A taste — the full cover letter comes with your application.",
    demoTitel: "Senior UX Designer (m/f/d) · Musterfirma GmbH · 72%",
    demoAnschreiben: "Dear Sir or Madam, your ad for the Senior UX Designer position matches my path precisely: I have owned concept work, design systems and user research in digital products for years. I'd be glad to show you in a call what you can use right away.",
    demoHinweis: "Sample — every application here starts like this: cover letter on top, resume below.",
  },
};

export default function SpielplatzClient({ beispiel, lang }: {
  beispiel: ExecutiveProfil;
  lang: Lang;
}) {
  const B = TEXTE[lang === "de" ? "de" : "en"];
  const ET = EXECUTIVE_TEXTE[lang] ?? EXECUTIVE_TEXTE.en;

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [schritt, setSchritt] = useState<Schritt>("intro");
  const [eingabe, setEingabe] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState("");
  const [fehler, setFehler] = useState("");
  const [mail, setMail] = useState("");
  const [spielDaten, setSpielDaten] = useState<SpielDaten | null>(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const [match, setMatch] = useState<Match | null>(null);
  const [zuegeUebrig, setZuegeUebrig] = useState<number | null>(null);
  const [cropDatei, setCropDatei] = useState<File | null>(null);
  const [anzeigeVorab, setAnzeigeVorab] = useState("");
  /* BEARBEITEN|VORSCHAU AUCH IM SPIEL (Owner 25.08.2026, mit Bild der Firmen-Flaeche:
     "das kommt doch in der Vorschau und es fehlt bearbeiten") — der Spieler erlebt die
     echte Besitzer-Mechanik: Bearbeiten = Berater/Analyse/Zahlen, Vorschau = exakt die
     Firmen-Sicht (samt Interesse-Chat, still). */
  const [vorschau, setVorschau] = useState(false);
  const [letzteAnzeige, setLetzteAnzeige] = useState("");
  const fotoRef = useRef<HTMLInputElement>(null);
  const ende = useRef<HTMLDivElement | null>(null);
  const gestartet = useRef(false);

  const ki = (text: string) => setMsgs(m => [...m, { von: "ki", text }]);
  const ich = (text: string) => setMsgs(m => [...m, { von: "ich", text }]);

  /* TÜR A ODER TÜR B: Das Landing-Feld legt die Anzeige in denselben sessionStorage-
     Schlüssel, den auch der Tunnel liest — hier NUR LESEN, nicht löschen (der Tunnel
     braucht ihn nach dem Gold-Knopf noch). */
  useEffect(() => {
    if (gestartet.current) return;
    gestartet.current = true;
    let vorab = "";
    try { vorab = (sessionStorage.getItem("lb_lebenslauf_anzeige") ?? "").trim(); } catch { /**/ }
    if (vorab) { setAnzeigeVorab(vorab); setLetzteAnzeige(vorab); ki(B.introA); setSchritt("mail"); }
    else ki(B.introB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (msgs.length > 1) ende.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, busy]);

  const ausweis = () => {
    let device = "";
    try {
      device = localStorage.getItem("lb_visitor") ?? "";
      if (!device) { device = crypto.randomUUID(); localStorage.setItem("lb_visitor", device); }
    } catch { /**/ }
    return device;
  };

  const spielZug = async (body: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    const device = ausweis();
    const r = await fetch("/api/lebenslauf-spiel", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device, email: mail, lang, ...body }),
    });
    const d = await r.json().catch(() => ({}));
    if (typeof d?.zuegeUebrig === "number") setZuegeUebrig(d.zuegeUebrig);
    if (r.status === 402) { ki(B.zuEnde); return null; }
    if (!r.ok) { setFehler(String(d?.error ?? B.fehler)); return null; }
    return d as Record<string, unknown>;
  };

  const matchLaufen = async (anzeige: string, daten: SpielDaten) => {
    setBusy(true); setBusyText(B.matchLauf); setFehler("");
    const d = await spielZug({ art: "match", anzeige, daten });
    setBusy(false); setBusyText("");
    if (!d) return;
    const m: Match = {
      prozent: Number(d.prozent) || 0,
      jobtitel: String(d.jobtitel ?? ""),
      gruende: Array.isArray(d.gruende) ? d.gruende.map(String) : [],
      luecken: Array.isArray(d.luecken) ? d.luecken.map(String) : [],
      befunde: Array.isArray(d.befunde) ? d.befunde.map(String) : [],
      anschreibenKurz: String(d.anschreibenKurz ?? ""),
    };
    setMatch(m); setLetzteAnzeige(anzeige);
    ki(B.matchDa(m.prozent));
    ki(B.videoEmpfehlung);
    ki(`${B.teaser} ${B.verkauf}`);
    setSchritt("frei");
  };

  const senden = async () => {
    const text = eingabe.trim();
    if (busy || !text) return;
    setFehler("");

    if (schritt === "mail") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) { setFehler(B.mailFehler); return; }
      const adresse = text.toLowerCase().slice(0, 200);
      setMail(adresse); setEingabe(""); ich(adresse);
      /* DER LEAD (Owner: „ich will Leads auf jeden Fall") — derselbe Kiss-Log-Weg wie im
         Tunnel; die Adresse liegt danach auch als Vorbelegung für den Kaufweg bereit. */
      try { localStorage.setItem("lb_kiss_mail", adresse); } catch { /**/ }
      void fetch("/api/kiss-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "lebenslauf", device: ausweis(), email: adresse }),
      }).catch(() => { /**/ });
      ki(B.datenFrage); setSchritt("daten");
      return;
    }

    if (schritt === "daten") {
      if (text.length < 60) { setFehler(B.datenZuWenig); return; }
      setEingabe(""); ich(`${text.slice(0, 80)} …`);
      setBusy(true); setBusyText(B.einpflegeLauf);
      const d = await spielZug({ art: "einpflegen", text });
      setBusy(false); setBusyText("");
      if (!d?.daten) return;
      const daten = d.daten as SpielDaten;
      setSpielDaten(daten);
      ki(B.datenDrin);
      ki(B.fotoFrage);
      if (anzeigeVorab) { await matchLaufen(anzeigeVorab, daten); }
      else { ki(B.anzeigeFrage); setSchritt("anzeige"); }
      return;
    }

    if (schritt === "anzeige" || schritt === "frei") {
      if (!spielDaten) { ki(B.datenFrage); setSchritt("daten"); return; }
      setEingabe(""); ich(`${text.slice(0, 80)}${text.length > 80 ? " …" : ""}`);
      await matchLaufen(text, spielDaten);
      return;
    }
  };

  /* ── DIE KARTE: Muster, oder er selbst (1:1 aus dem Einpflegen; Foto nur im Browser) ── */
  const profil: ExecutiveProfil = spielDaten ? {
    ...beispiel,
    id: "spiel",
    name: spielDaten.name || "—",
    rolle: spielDaten.rolle,
    ort: spielDaten.ort,
    sprachenKurz: spielDaten.sprachenKurz,
    verfuegbar: "",
    schwerpunkte: spielDaten.schwerpunkte,
    portraitUrl: fotoUrl,
    videoUrl: undefined,
    videoLabel: undefined,
    profil: spielDaten.profil,
    expertise: spielDaten.expertise,
    erfahrung: spielDaten.erfahrung,
    impact: [],
    ausbildung: spielDaten.ausbildung,
    sprachen: spielDaten.sprachen,
    cvUrl: undefined,
    chatFragen: [],
    kontaktSichtbar: false,
    kontakt: undefined,
    viewCount: 0,
    videoKlicks: 0,
  } : {
    ...beispiel,
    ...(fotoUrl ? { portraitUrl: fotoUrl, videoUrl: undefined, videoLabel: undefined } : {}),
  };

  /* ── OBEN: DAS ANSCHREIBEN (Owner: „Es müsste oben anfangen … dann drunter das Resume") ── */
  const anschreibenText = match?.anschreibenKurz || (!spielDaten ? B.demoAnschreiben : "");
  const anschreibenTitel = match
    ? [match.jobtitel, `${match.prozent} %`].filter(Boolean).join(" · ")
    : (!spielDaten ? B.demoTitel : "");
  const vorKarte = anschreibenText ? (
    <section className="lb-karte mb-4 overflow-hidden rounded-[20px] px-5 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.38)] md:px-8 md:py-6">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] opacity-40">
        <Mail className="h-3.5 w-3.5" />{B.anschreibenH}
      </p>
      {anschreibenTitel && (
        <p className="mt-1.5 text-[12.5px] font-black leading-snug opacity-80">{anschreibenTitel}</p>
      )}
      <p className="mt-2.5 whitespace-pre-wrap text-[12.5px] font-medium leading-[1.6] opacity-85">{anschreibenText}</p>
      <p className="mt-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] opacity-45">
        {match ? B.kostprobe : B.demoHinweis}
      </p>
    </section>
  ) : null;

  /* ── UNTER DER KARTE: Beispiel-Zahlen (nur im Muster), Analyse, der Berater ── */
  const nachKarte = (
    <>
      {!spielDaten && (
        /* DIE BESITZER-ZEILEN ALS SCHAUFENSTER (Owner: Beispiel-Zahlen zeigen — genau die
           Zeilen hat kein Jobportal). Reine Demo-Werte; die Beacons zählen hier nichts. */
        <div className="mt-6 flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-white/75">
            <Eye className="h-4 w-4 shrink-0 text-white/45" />{ET.statsOeffnungen(3)}
          </p>
          <p className="flex items-center gap-2 text-[13px] font-bold text-white/75">
            <MessageCircle className="h-4 w-4 shrink-0 text-white/45" />{ET.statsInteresse(1)}
          </p>
          <p className="flex items-center gap-2 text-[13px] font-black text-white/90">
            <Mail className="h-4 w-4 shrink-0 text-[#f6cf51]" />{ET.statsAnfragen(1)}
          </p>
          <p className="ml-6 text-[12.5px] font-bold text-white/80">Anna Keller — anna.keller@firma.de</p>
        </div>
      )}

      {match && (
        <section className="mt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">{B.analyseH}</p>
          <div className="mt-2 flex items-baseline gap-3">
            <p className="font-serif text-[44px] font-black leading-none text-white">{match.prozent}%</p>
            {match.jobtitel && <p className="text-[11.5px] font-black uppercase tracking-[0.1em] text-white/60">{match.jobtitel}</p>}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#f6cf51] transition-all" style={{ width: `${match.prozent}%` }} />
          </div>
          {match.gruende.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{B.passt}</p>
              {match.gruende.map((g, i) => (
                <p key={i} className="mt-1.5 flex items-start gap-2 text-[12.5px] font-bold leading-snug text-white/85">
                  <Check className="mt-[1px] h-4 w-4 shrink-0 text-[#2f7d4f]" />{g}
                </p>
              ))}
            </div>
          )}
          {match.luecken.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{B.fehlt}</p>
              {match.luecken.map((g, i) => (
                <p key={i} className="mt-1.5 text-[12.5px] font-bold leading-snug text-white/70">— {g}</p>
              ))}
            </div>
          )}
          {match.befunde.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{B.befundeH}</p>
              {match.befunde.map((g, i) => (
                <p key={i} className="mt-1.5 text-[12.5px] font-bold leading-snug text-white/70">— {g}</p>
              ))}
            </div>
          )}
          <p className="mt-4 flex items-start gap-2 text-[13px] font-black text-white/90">
            <Play className="mt-0.5 h-4 w-4 shrink-0 text-[#f6cf51]" />{B.videoEmpfehlung}
          </p>
          <p className="mt-2 text-[12.5px] font-bold leading-snug text-white/60">{B.teaser}</p>
        </section>
      )}

      {/* ── DER BEWERBERBERATER — in der weissen Hülle (Owner 25.08.2026, mit Bild des
          dunklen Kastens: „das auch in der weissen Hülle"): dieselbe Creme-Karte wie die
          Mappe, alle Innenteile in der Karten-Fassung der CI-Bausteine. ── */}
      <div className="lb-karte mt-6 overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
        <div className="px-4 pb-4 pt-4">
          <div className="flex flex-col gap-2.5">
            {msgs.map((m, i) => m.von === "ich" ? (
              <p key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#1a160f]/[0.07] px-3 py-2 text-[12.5px] font-bold leading-snug">
                {m.text}
              </p>
            ) : (
              <p key={i} className="text-[12.5px] font-bold leading-snug opacity-85">{m.text}</p>
            ))}
            {busy && (
              <p className="flex items-center gap-2 text-[12.5px] font-bold leading-snug opacity-60">
                <Laden art="knopf" karte />{busyText || B.denkt}
              </p>
            )}
            <div ref={ende} />
          </div>

          {schritt === "intro" && !busy && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => { ich(B.jaDaten); ki(B.mailFrage); setSchritt("mail"); }}
                className="h-10 rounded-full bg-gradient-to-b from-[#f9de7a] to-[#e0a93e] px-6 text-[13px] font-black text-[#1a1204]">
                {B.jaDaten}
              </button>
              <button type="button" onClick={() => { ich(B.nurSchauen); ki(B.schauAntwort); }}
                className="h-10 rounded-full border border-[#1a160f] px-6 text-[13px] font-black">
                {B.nurSchauen}
              </button>
            </div>
          )}

          {schritt !== "intro" && (
            <>
              <Fehlerzeile karte>{fehler}</Fehlerzeile>
              <div className="mt-3 flex items-end gap-2">
                <EingabeMehrzeilig karte zeilen={schritt === "daten" ? 5 : schritt === "anzeige" || schritt === "frei" ? 3 : 1}
                  className="flex-1" value={eingabe}
                  placeholder={schritt === "mail" ? "you@email.com" : schritt === "daten" ? B.datenFrage : B.anzeigeFrage}
                  onChange={e => setEingabe(e.target.value)} />
                <button type="button" disabled={busy || !eingabe.trim()} onClick={() => void senden()}
                  className="h-10 shrink-0 rounded-full border border-[#1a160f] px-4 text-[12.5px] font-black transition disabled:opacity-40">
                  {B.senden}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {spielDaten && !fotoUrl && (
                  <button type="button" onClick={() => fotoRef.current?.click()}
                    className="text-[11px] font-black uppercase tracking-[0.12em] opacity-50 transition hover:opacity-80">
                    {B.fotoChip}
                  </button>
                )}
                {typeof zuegeUebrig === "number" && zuegeUebrig >= 0 && (
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-40">{B.zuegeZeile(zuegeUebrig)}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* DER AUSGANG SCROLLT MIT (Owner: "Gratis weitermachen soll man mit scrollen")
          — am Ende des Berater-Bereichs; dieser ganze Block haengt an nachKarte und
          erscheint damit NUR im Bearbeiten-Modus (Owner: "das kommt nur in Bearbeiten
          modus"). Anzeige + E-Mail reisen in den Kaufweg mit. */}
      <div className="mt-4">
        <Knopf art="gold" onClick={() => {
          try { if (letzteAnzeige) sessionStorage.setItem("lb_lebenslauf_anzeige", letzteAnzeige); } catch { /**/ }
          window.location.href = "/themes/lebenslauf/start";
        }}>
          {B.gold}
        </Knopf>
      </div>
    </>
  );

  return (
    <>
      <LebenslaufExecutive profil={profil} lang={lang} chatStill
        vorKarte={vorKarte} nachKarte={vorschau ? null : nachKarte}
        ohneFirmenTeil={!vorschau} fussFrei />

      {/* NUR DIE MODUSWAHL STEHT FEST — der Gold-Knopf scrollt mit der Seite (Owner:
          "Gratis weitermachen soll man mit scrollen"), er sitzt am Ende des
          Berater-Bereichs (nachKarte). */}
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full border border-white/25 bg-[#0c0a08]/90 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur">
            <button type="button" onClick={() => setVorschau(false)}
              className={`h-10 rounded-full px-5 text-[12px] font-black uppercase tracking-[0.08em] transition ${vorschau ? "text-white/70 hover:text-white" : "bg-white text-[#0c0a08]"}`}>
              {ET.bearbeiten}
            </button>
            <button type="button" onClick={() => setVorschau(true)}
              className={`h-10 rounded-full px-5 text-[12px] font-black uppercase tracking-[0.08em] transition ${vorschau ? "bg-white text-[#0c0a08]" : "text-white/70 hover:text-white"}`}>
              {ET.vorschau}
            </button>
          </div>
      </div>

      <input ref={fotoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) setCropDatei(f); e.target.value = ""; }} />
      {cropDatei && (
        <ImageCropper file={cropDatei} aspect={3 / 4} title={B.fotoTitel} sprache={lang}
          onCancel={() => setCropDatei(null)}
          onSave={async (zugeschnitten) => {
            setCropDatei(null);
            /* NUR IM BROWSER (Eiserne Regel): Data-URL im Zustand, kein Upload. */
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result ?? ""));
              r.onerror = reject;
              r.readAsDataURL(zugeschnitten);
            }).catch(() => "");
            if (dataUrl) {
              setFotoUrl(dataUrl);
              ki(B.fotoDrin);
            }
          }} />
      )}
    </>
  );
}
