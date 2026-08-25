"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, MessageCircle, Play, Mail, Check, Gauge } from "lucide-react";
import LebenslaufExecutive from "@/components/LebenslaufExecutive";
import MappenKopf from "@/components/MappenKopf";
import { Knopf, EingabeMehrzeilig } from "@/components/CI";
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

const TEXTE = {
  de: {
    videoEmpfehlung: "Unsere Empfehlung: eine Video-Bewerbung. Firmen sehen dich, bevor sie dich einladen — das hat kaum ein Bewerber.",
    anzeigePlatzhalter: "Stellenanzeige oder Link hier einfügen — du siehst sofort, wie gut sie zu dir passt.",
    anpassenCta: "Bewerbung anpassen",
    analyseH: "Schnell-Analyse", analyseTeaser: "Was passt, was fehlt — und was an deinem Lebenslauf selbst schwach ist.", anzeigeH: "Die Anzeige", passt: "Das passt", fehlt: "Das fehlt", befundeH: "Am Lebenslauf selbst",
    anschreibenH: "Anschreiben", anschreibenTeaser: "Auf genau diese Anzeige zugeschnitten — Seite eins deiner Mappe.", kostprobe: "Kostprobe — das volle Anschreiben kommt mit deiner Bewerbung.",
    demoBetreff: "Bewerbung als Fachpflegekraft Intensivmedizin",
    demoMeta: "Musterklinik München · Match 72 %",
    demoAnschreiben: "Sehr geehrte Damen und Herren,\n\nIhre Anzeige trifft genau meinen Werdegang: Seit 2021 betreue ich beatmete Patientinnen und Patienten auf einer interdisziplinären Intensivstation, davor fünf Jahre Zentrale Notaufnahme.\n\nDie Fachweiterbildung Intensiv- und Anästhesiepflege habe ich abgeschlossen, meine Berufsanerkennung für Deutschland ist beantragt. Ich kann kurzfristig anfangen und bin bereit umzuziehen.\n\nMit freundlichen Grüssen\nPeter Mustermann",
    demoHinweis: "Beispiel — so beginnt jede Bewerbung hier: Anschreiben oben, Lebenslauf darunter.",
    demoAnalyseHinweis: "Beispiel — mit deiner eigenen Anzeige steht hier deine Zahl.",
    demoAnzeige: "Musterklinik München sucht zum nächstmöglichen Zeitpunkt eine Fachpflegekraft Intensivmedizin (m/w/d) für die interdisziplinäre Intensivstation mit 18 Betten.\n\nWir erwarten: abgeschlossene Ausbildung in der Gesundheits- und Krankenpflege, Fachweiterbildung Intensiv- und Anästhesiepflege oder die Bereitschaft dazu, Erfahrung in der Beatmungspflege, Deutschkenntnisse mindestens B2, Bereitschaft zum Schichtdienst.\n\nWir bieten: strukturiertes Einarbeitungskonzept, Unterstützung bei der Berufsanerkennung und bei der Wohnungssuche.",
    demoMatch: {
      prozent: 72,
      jobtitel: "Fachpflegekraft Intensivmedizin (m/w/d)",
      gruende: [
        "Fachweiterbildung Intensiv- und Anästhesiepflege verlangt — 2020 abgeschlossen.",
        "Beatmungspflege gefordert — seit 2021 täglich auf der Intensivstation.",
        "Deutsch mindestens B2 gefordert — C1 durch deutschsprachige Schule in Timișoara.",
        "Schichtdienst gefordert — zwölf Jahre Schichterfahrung, fünf davon in der Notaufnahme.",
      ],
      luecken: [
        "Die Berufsanerkennung in Deutschland ist beantragt, aber noch nicht erteilt.",
        "Zum Dokumentationssystem der Klinik steht im Lebenslauf nichts.",
      ],
      befunde: [
        "Deine Stationen stehen ohne Zahlen da — Bettenzahl und Betreuungsschlüssel belegen Erfahrung schneller als jede Beschreibung.",
        "Die Fachweiterbildung steht ganz unten bei der Ausbildung, nicht oben, wo sie über die Einladung entscheidet.",
        "Es fehlt ein Satz dazu, warum du nach Deutschland willst — das ist die erste Frage im Gespräch.",
      ],
      anschreibenKurz: "",
    },
  },
  en: {
    videoEmpfehlung: "Our recommendation: a video application. Companies see you before they invite you — almost no candidate has that.",
    anzeigePlatzhalter: "Paste the job ad or a link here — you will see right away how well it fits you.",
    anpassenCta: "Tailor my application",
    analyseH: "Quick analysis", analyseTeaser: "What fits, what is missing — and what is weak in the resume itself.", anzeigeH: "The ad", passt: "What fits", fehlt: "What's missing", befundeH: "About the resume itself",
    anschreibenH: "Cover letter", anschreibenTeaser: "Tailored to this exact job ad — page one of your folder.", kostprobe: "A taste — the full cover letter comes with your application.",
    demoBetreff: "Application: Intensive Care Nurse",
    demoMeta: "Sample Clinic Munich · Match 72%",
    demoAnschreiben: "Dear Sir or Madam,\n\nYour ad matches my path precisely: since 2021 I have cared for ventilated patients on an interdisciplinary intensive care unit, after five years in the emergency department.\n\nI have completed my specialist training in intensive and anaesthetic care, and my professional recognition for Germany has been filed. I can start at short notice and am ready to relocate.\n\nKind regards\nPeter Mustermann",
    demoHinweis: "Sample — every application here starts like this: cover letter on top, resume below.",
    demoAnalyseHinweis: "Sample — with your own job ad, your number goes here.",
    demoAnzeige: "Sample Clinic Munich is looking for an intensive care nurse (m/f/d) for its interdisciplinary ICU with 18 beds.\n\nWe expect: completed training in nursing, specialist qualification in intensive and anaesthetic care or the willingness to obtain it, experience in ventilation care, German at B2 or above, willingness to work shifts.\n\nWe offer: a structured onboarding programme, support with professional recognition and with finding accommodation.",
    demoMatch: {
      prozent: 72,
      jobtitel: "Intensive Care Nurse (m/f/d)",
      gruende: [
        "Specialist qualification in intensive and anaesthetic care required — completed in 2020.",
        "Ventilation care required — daily practice on the ICU since 2021.",
        "German at B2 or above required — C1 from a German-language school in Timișoara.",
        "Shift work required — twelve years of shifts, five of them in emergency care.",
      ],
      luecken: [
        "Professional recognition in Germany has been filed but not yet granted.",
        "The resume says nothing about the clinic's documentation system.",
      ],
      befunde: [
        "Your positions carry no numbers — bed count and nurse-to-patient ratio prove experience faster than any description.",
        "The specialist qualification sits at the very bottom under education, not at the top where it decides the invitation.",
        "There is no sentence on why you want to move to Germany — that is the first question in the interview.",
      ],
      anschreibenKurz: "",
    },
  },
};

export default function SpielplatzClient({ beispiel, lang }: {
  beispiel: ExecutiveProfil;
  lang: Lang;
}) {
  const B = TEXTE[lang === "de" ? "de" : "en"];
  const ET = EXECUTIVE_TEXTE[lang] ?? EXECUTIVE_TEXTE.en;

  /* BEARBEITEN|VORSCHAU (Owner 25.08.2026: „das kommt doch in der Vorschau und es fehlt
     bearbeiten") — Bearbeiten zeigt Analyse und Besitzer-Zeilen, Vorschau exakt die
     Firmen-Sicht. */
  const [vorschau, setVorschau] = useState(false);
  /* TÜR A: Das Landing-Feld legt die eingefügte Anzeige in denselben sessionStorage-
     Schlüssel, den auch der Trichter liest — hier NUR LESEN, damit die Analyse sie zeigt
     und der Gold-Knopf sie weiterreicht. */
  const [letzteAnzeige, setLetzteAnzeige] = useState("");
  const gestartet = useRef(false);

  useEffect(() => {
    if (gestartet.current) return;
    gestartet.current = true;
    try {
      const vorab = (sessionStorage.getItem("lb_lebenslauf_anzeige") ?? "").trim();
      if (vorab) setLetzteAnzeige(vorab);
    } catch { /**/ }
  }, []);

  /* Die Karte ist das Muster — eingepflegte Eigendaten gab es nur mit dem Berater. */
  const profil: ExecutiveProfil = beispiel;

  /* ── OBEN: DAS ANSCHREIBEN (Owner: „Es müsste oben anfangen … dann drunter das Resume") ── */
  /* EIN BRIEF, KEIN TEXTKLUMPEN (Owner, mit Bild: „das ist eine Katastrophe. Das
     Anschreiben. Layoutmässig") — Betreff fett wie in einem echten Schreiben, darunter
     klein die Einordnung (Firma/Match), dann der Brief mit Anrede, Absätzen und Gruss
     auf eigenen Zeilen (die KI liefert die Umbrüche mit, \n bleibt per pre-wrap
     erhalten). Etikett und Fusszeile trennt je eine Haarlinie vom Papier. */
  const anschreibenText = B.demoAnschreiben;
  const anschreibenBetreff = B.demoBetreff;
  const anschreibenMeta = B.demoMeta;
  const vorKarte = (
    <section className="lb-karte mb-4 overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
      {/* Dasselbe Kopfband wie der Lebenslauf darunter — zwei Blätter EINER Mappe. */}
      <MappenKopf icon={Mail} titel={B.anschreibenH} teaser={B.anschreibenTeaser} />
      <div className="border-t border-[#1a160f]/[0.11] px-5 py-5 md:px-8 md:py-6">
        {anschreibenBetreff && (
          <p className="text-[16px] font-black leading-snug">{anschreibenBetreff}</p>
        )}
        {anschreibenMeta && (
          <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.1em] opacity-50">{anschreibenMeta}</p>
        )}
        <p className="mt-4 whitespace-pre-wrap text-[14px] font-medium leading-[1.75] opacity-90">{anschreibenText}</p>
      </div>
      <p className="border-t border-[#1a160f]/[0.11] px-5 py-2.5 text-[13px] font-bold uppercase tracking-[0.12em] opacity-45 md:px-8">
        {B.demoHinweis}
      </p>
    </section>
  );

  /* DER BEISPIEL-MATCH (Owner 25.08.2026: „hier muss schon ein Beispiel-Match gezeigt
     werden" · „jetzt den Rest noch bauen: Match") — solange der Spieler keine eigenen
     Daten eingepflegt hat, läuft die Schnell-Analyse mit dem Muster: dieselbe Anzeige,
     die im Anschreiben oben steht, dieselben vier Blöcke wie beim echten Lauf. So sieht
     man VOR dem ersten Zug, was das Werkzeug liefert — inklusive der unbequemen
     Befunde am Lebenslauf, die den Kauf begründen. */
  const zeigeMatch: Match = B.demoMatch;
  const zeigeAnzeige = letzteAnzeige || B.demoAnzeige;

  /* ── UNTER DER KARTE: Beispiel-Zahlen (nur im Muster), Analyse, der Berater ── */
  const nachKarte = (
    <>
      {true && (
        /* DIE BESITZER-ZEILEN ALS SCHAUFENSTER (Owner: Beispiel-Zahlen zeigen — genau die
           Zeilen hat kein Jobportal). Reine Demo-Werte; die Beacons zählen hier nichts. */
        <div className="mt-6 flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-[14px] font-bold text-white/75">
            <Eye className="h-4 w-4 shrink-0 text-white/45" />{ET.statsOeffnungen(3)}
          </p>
          <p className="flex items-center gap-2 text-[14px] font-bold text-white/75">
            <MessageCircle className="h-4 w-4 shrink-0 text-white/45" />{ET.statsInteresse(1)}
          </p>
          <p className="flex items-center gap-2 text-[14px] font-black text-white/90">
            <Mail className="h-4 w-4 shrink-0 text-[#f6cf51]" />{ET.statsAnfragen(1)}
          </p>
          <p className="ml-6 text-[14px] font-bold text-white/80">S. Weiss — s.weiss@musterklinik.de</p>
        </div>
      )}

      {(
        /* DIE ANALYSE IST DAS DRITTE BLATT DER MAPPE (Owner 25.08.2026: „in einer weissen
           Box bitte") — vorher stand sie nackt auf dem Dunklen zwischen zwei Creme-Karten
           und sah aus wie ein Systemausdruck. Jetzt dieselbe Hülle und dasselbe Kopfband
           wie Anschreiben, Lebenslauf und Berater: vier Blätter, eine Handschrift.
           DER MATCH STEHT MIT DER ANZEIGE (Owner davor: „wo sieht er das sonst?") — die
           geprüfte Anzeige bleibt als eigene, scrollbare Fläche sichtbar. */
        <section className="lb-karte mt-6 overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
          <MappenKopf icon={Gauge} titel={B.analyseH} teaser={B.demoAnalyseHinweis} />
          <div className="border-t border-[#1a160f]/[0.11] px-5 py-5 md:px-8 md:py-6">
          {zeigeMatch && (<>
          <div className="flex items-baseline gap-3">
            <p className="font-serif text-[44px] font-black leading-none">{zeigeMatch.prozent}%</p>
            {zeigeMatch.jobtitel && <p className="text-[13px] font-black uppercase tracking-[0.1em] opacity-60">{zeigeMatch.jobtitel}</p>}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1a160f]/[0.12]">
            <div className="h-full rounded-full bg-[#c8a13a] transition-all" style={{ width: `${zeigeMatch.prozent}%` }} />
          </div>
          </>)}
          {/* HIER WIRD DIE ANZEIGE REINKOPIERT (Owner 25.08.2026, mit Bild: „Das muss
              hervorgehoben werden. Unten steht dann Bewerbung anpassen") — die Anzeige
              ist keine stumme Fläche mehr, sondern DAS Eingabefeld der Seite: goldener
              Rahmen auf dem Papier, damit man sieht, wo man etwas tut. Der eingefügte
              Text reist über denselben sessionStorage-Schlüssel in den Trichter. */}
          <div className="mt-5">
            <p className="lb-karte-gold text-[13px] font-black uppercase tracking-[0.18em]">{B.anzeigeH}</p>
            <div className="mt-1.5 rounded-xl border-2 border-[#c8a13a]/60 p-1">
              <EingabeMehrzeilig karte zeilen={4} value={letzteAnzeige}
                placeholder={B.anzeigePlatzhalter}
                onChange={e => setLetzteAnzeige(e.target.value)} />
            </div>
          </div>
          {zeigeMatch && zeigeMatch.gruende.length > 0 && (
            <div className="mt-4">
              <p className="text-[13px] font-black uppercase tracking-[0.18em] opacity-40">{B.passt}</p>
              {zeigeMatch!.gruende.map((g, i) => (
                <p key={i} className="mt-1.5 flex items-start gap-2 text-[14px] font-bold leading-snug opacity-90">
                  <Check className="mt-[1px] h-4 w-4 shrink-0 text-[#2f7d4f]" />{g}
                </p>
              ))}
            </div>
          )}
          {zeigeMatch && zeigeMatch.luecken.length > 0 && (
            <div className="mt-4">
              <p className="text-[13px] font-black uppercase tracking-[0.18em] opacity-40">{B.fehlt}</p>
              {zeigeMatch!.luecken.map((g, i) => (
                <p key={i} className="mt-1.5 text-[14px] font-bold leading-snug opacity-75">— {g}</p>
              ))}
            </div>
          )}
          {zeigeMatch && zeigeMatch.befunde.length > 0 && (
            <div className="mt-4">
              <p className="text-[13px] font-black uppercase tracking-[0.18em] opacity-40">{B.befundeH}</p>
              {zeigeMatch!.befunde.map((g, i) => (
                <p key={i} className="mt-1.5 text-[14px] font-bold leading-snug opacity-75">— {g}</p>
              ))}
            </div>
          )}
          {zeigeMatch && (<>
          <p className="mt-4 flex items-start gap-2 text-[14px] font-black">
            <Play className="lb-karte-gold mt-0.5 h-4 w-4 shrink-0" />{B.videoEmpfehlung}
          </p>
          </>)}

          {/* „Unten steht dann Bewerbung anpassen" (Owner) — der eine Knopf der Seite,
              im Papier statt darunter: er nimmt die eingefügte Anzeige mit in den
              Trichter, wo Lebenslauf, Foto und Kasse zu Hause sind. */}
          <div className="mt-5">
            <Knopf art="gold" onClick={() => {
              try { if (letzteAnzeige.trim()) sessionStorage.setItem("lb_lebenslauf_anzeige", letzteAnzeige.trim()); } catch { /**/ }
              window.location.href = "/themes/lebenslauf/start";
            }}>
              {B.anpassenCta}
            </Knopf>
          </div>
          </div>
        </section>
      )}

    </>
  );

  return (
    <>
      <LebenslaufExecutive profil={profil} lang={lang} chatStill
        vorKarte={vorKarte} nachKarte={vorschau ? null : nachKarte}
        ohneFirmenTeil={!vorschau} vorschauAktiv={vorschau} fussFrei />

      {/* NUR DIE MODUSWAHL STEHT FEST — der Gold-Knopf scrollt mit der Seite (Owner:
          "Gratis weitermachen soll man mit scrollen"), er sitzt am Ende des
          Berater-Bereichs (nachKarte). */}
      <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full border border-white/25 bg-[#0c0a08]/90 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur">
            <button type="button" onClick={() => setVorschau(false)}
              className={`h-10 rounded-full px-5 text-[13px] font-black uppercase tracking-[0.08em] transition ${vorschau ? "text-white/70 hover:text-white" : "bg-white text-[#0c0a08]"}`}>
              {ET.bearbeiten}
            </button>
            {/* Vorschau schlägt das Dokument frisch auf: Sprung nach oben, damit der
                Streifen und der Anfang der Mappe im Bild sind. Zurück zu Bearbeiten
                bleibt die Stelle stehen, an der er gerade war. */}
            <button type="button"
              onClick={() => { setVorschau(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className={`h-10 rounded-full px-5 text-[13px] font-black uppercase tracking-[0.08em] transition ${vorschau ? "bg-white text-[#0c0a08]" : "text-white/70 hover:text-white"}`}>
              {ET.vorschau}
            </button>
          </div>
      </div>

    </>
  );
}
