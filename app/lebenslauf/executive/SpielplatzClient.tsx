"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, MessageCircle, Play, Mail, Check, Minus, Gauge } from "lucide-react";
import LebenslaufExecutive from "@/components/LebenslaufExecutive";
import MappenKopf from "@/components/MappenKopf";
import PdfKnopf from "@/components/PdfKnopf";
import { Knopf, EingabeMehrzeilig } from "@/components/CI";
import { EXECUTIVE_TEXTE, type ExecutiveProfil } from "@/lib/lebenslauf-vorlage";
import type { Lang } from "@/lib/lang";
import type { MusterTexte } from "./page";

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

export default function SpielplatzClient({ beispiel, lang, texte }: {
  beispiel: ExecutiveProfil;
  lang: Lang;
  /** Die Texte kommen ÜBERSETZT vom Server (Owner 25.08.2026: „Übersetzung muss
      funktionieren") — vorher lag hier eine de/en-Tabelle, und Rumänisch sah Englisch. */
  texte: MusterTexte;
}) {
  const B = texte;
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
  const anschreibenKarte = (
    /* DAS ANSCHREIBEN STEHT AM ENDE (Owner 25.08.2026: „Scrisoare de intenție muss
       woanders, am Ende") — die Seite beginnt jetzt mit der Handlung: Anzeige einfügen,
       Prozentzahl, was passt und was fehlt. Das Anschreiben ist das ERGEBNIS dieser
       Analyse; es gehört dorthin, wo man es nach den Zahlen erwartet. */
    <section data-blatt="anschreiben" className="lb-karte mt-6 overflow-hidden rounded-[20px] shadow-[0_18px_50px_rgba(0,0,0,0.38)]">
      <MappenKopf icon={Mail} titel={B.anschreibenH} teaser={B.anschreibenTeaser}
        aktion={<PdfKnopf dateiname={`${beispiel.name} — ${B.anschreibenH}`} label={ET.alsPdf} />} />
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

  /* JEDES BLATT WIRD EINZELN ANGEPASST (Owner 25.08.2026: „Das wird auch per Klick
     angepasst, extra") — aber der Knopf steht DRAUSSEN, nicht im Blatt (Owner: „muss
     ausserhalb stehen der Karte"): Das Papier trägt den Inhalt, das Dunkle die Handlung.
     Er nimmt die eingefügte Anzeige mit in den Trichter. */
  const anschreibenAktion = (
    <div className="mt-3">
      <Knopf art="umriss" onClick={() => {
        try { if (letzteAnzeige.trim()) sessionStorage.setItem("lb_lebenslauf_anzeige", letzteAnzeige.trim()); } catch { /**/ }
        window.location.href = "/themes/lebenslauf/start";
      }}>
        {B.anschreibenCta}
      </Knopf>
    </div>
  );

  /* DER BEISPIEL-MATCH (Owner 25.08.2026: „hier muss schon ein Beispiel-Match gezeigt
     werden" · „jetzt den Rest noch bauen: Match") — solange der Spieler keine eigenen
     Daten eingepflegt hat, läuft die Schnell-Analyse mit dem Muster: dieselbe Anzeige,
     die im Anschreiben oben steht, dieselben vier Blöcke wie beim echten Lauf. So sieht
     man VOR dem ersten Zug, was das Werkzeug liefert — inklusive der unbequemen
     Befunde am Lebenslauf, die den Kauf begründen. */
  /* Der Beispiel-Match aus den übersetzten Bausteinen — flach übersetzt, hier wieder
     zusammengesetzt (siehe MUSTER_TEXTE in page.tsx). */
  const zeigeMatch: Match = {
    prozent: 72,
    jobtitel: B.jobtitel,
    gruende: [B.g1, B.g2, B.g3, B.g4],
    luecken: [B.l1, B.l2],
    befunde: [B.b1, B.b2, B.b3],
    anschreibenKurz: "",
  };
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
          {/* HIER WIRD DIE ANZEIGE REINKOPIERT (Owner 25.08.2026, mit Bild: „Das muss
              hervorgehoben werden. Unten steht dann Bewerbung anpassen") — die Anzeige
              ist keine stumme Fläche mehr, sondern DAS Eingabefeld der Seite: goldener
              Rahmen auf dem Papier, damit man sieht, wo man etwas tut. Der eingefügte
              Text reist über denselben sessionStorage-Schlüssel in den Trichter. */}
          <div>
            <p className="lb-karte-gold text-[13px] font-black uppercase tracking-[0.18em]">{B.anzeigeH}</p>
            <div className="mt-1.5 rounded-xl border-2 border-[#c8a13a]/60 p-1">
              <EingabeMehrzeilig karte zeilen={4} value={letzteAnzeige}
                placeholder={B.anzeigePlatzhalter}
                onChange={e => setLetzteAnzeige(e.target.value)} />
            </div>

          {zeigeMatch && (<>
          <div className="mt-5 flex items-baseline gap-3">
            <p className="font-serif text-[44px] font-black leading-none">{zeigeMatch.prozent}%</p>
            {zeigeMatch.jobtitel && <p className="text-[13px] font-black uppercase tracking-[0.1em] opacity-60">{zeigeMatch.jobtitel}</p>}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1a160f]/[0.12]">
            <div className="h-full rounded-full bg-[#c8a13a] transition-all" style={{ width: `${zeigeMatch.prozent}%` }} />
          </div>
          </>)}
          </div>
          {/* DREI EIGENE BLÖCKE MIT ZEICHEN (Owner 25.08.2026: „lipsește muss mit
              Warnzeichen als extra Block, und gut auch mit Icon als extra Block") —
              vorher waren es drei Überschriften in derselben Fläche, und beim Überfliegen
              verschwamm, was Lob und was Mahnung ist. Jetzt trägt jeder Block seinen
              eigenen Rahmen und sein Zeichen: Häkchen für das, was passt (grün, die
              einzige Farbe auf Papier, die „stimmt" heisst), Warndreieck für das, was
              fehlt (Karten-Rot über `lb-karte-nein`, nie eine getippte Farbe — Memory
              `lb-karte-important-frisst-inline-farben`), Stift für die Befunde am
              Lebenslauf selbst: das ist keine Absage, sondern eine Aufgabe. */}
          {zeigeMatch && zeigeMatch.gruende.length > 0 && (
            <div className="mt-5 rounded-xl border border-[#1a160f]/15 px-3.5 py-3">
              {/* GRÜN, ABER ÜBER DIE HAUS-KLASSE (Owner 25.08.2026: „die mit grün
                  markieren" — sie waren grau). Eine getippte Farbe verliert in der Karte
                  gegen die !important-Tintenregel in globals.css; `lb-karte-ja` ist genau
                  dafür da (Memory `lb-karte-important-frisst-inline-farben`). */}
              <p className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.18em] opacity-55">
                <span className="lb-punkt-ja grid h-5 w-5 shrink-0 place-items-center rounded-full">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>{B.passt}
              </p>
              {zeigeMatch!.gruende.map((g, i) => (
                <p key={i} className="mt-2 flex items-start gap-2 text-[14px] font-bold leading-snug opacity-90">
                  <span className="lb-punkt-ja mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-full">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>{g}
                </p>
              ))}
            </div>
          )}
          {zeigeMatch && zeigeMatch.luecken.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#1a160f]/15 px-3.5 py-3">
              {/* DIESELBE GESTALT WIE DIE ANDEREN BEIDEN (Owner 25.08.2026: „und die alle
                  mit Minus und das gleiche Design") — das Warndreieck war eine zweite
                  Formsprache in derselben Liste. Jetzt tragen alle drei Blöcke dieselbe
                  Scheibe mit weissem Zeichen; den Unterschied machen Farbe und Zeichen:
                  grüner Haken für was passt, ORANGES Ausrufezeichen für was die Anzeige
                  verlangt und fehlt (Owner: „die orange mit Ausrufezeichen" — eine
                  Warnung, keine Absage), ROTES Minus für die Befunde am eigenen Papier
                  (Owner: „die rot") — die Liste, die den Kauf begründet, darf nicht wie
                  eine Nebenbemerkung aussehen. Eine Form, drei Temperaturen. */}
              <p className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.18em] opacity-55">
                <span className="lb-punkt-nein grid h-5 w-5 shrink-0 place-items-center rounded-full">
                  <span className="text-[13px] font-black leading-none text-white">!</span>
                </span>{B.fehlt}
              </p>
              {zeigeMatch!.luecken.map((g, i) => (
                <p key={i} className="mt-2 flex items-start gap-2 text-[14px] font-bold leading-snug opacity-80">
                  <span className="lb-punkt-nein mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-full">
                    <span className="text-[13px] font-black leading-none text-white">!</span>
                  </span>{g}
                </p>
              ))}
            </div>
          )}
          {zeigeMatch && zeigeMatch.befunde.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#1a160f]/15 px-3.5 py-3">
              <p className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.18em] opacity-55">
                <span className="lb-punkt-minus grid h-5 w-5 shrink-0 place-items-center rounded-full">
                  <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                </span>{B.befundeH}
              </p>
              {/* MINUSPUNKTE ALS VOLLE PUNKTE (Owner 25.08.2026: „die als Minuspunkt" →
                  „volle Kreise bitte für Minus und grüne für Plus") — der Stift sah aus wie
                  eine Einladung zum Bearbeiten. Ein gefüllter Punkt liest sich als Zähler:
                  drei Treffer oben, drei Abzüge hier. Tinte, nicht Rot — das sind keine
                  fehlenden Anforderungen der Anzeige, sondern Schwächen im eigenen Papier,
                  und die sind behebbar. */}
              {zeigeMatch!.befunde.map((g, i) => (
                <p key={i} className="mt-2 flex items-start gap-2 text-[14px] font-bold leading-snug opacity-80">
                  <span className="lb-punkt-minus mt-[2px] grid h-5 w-5 shrink-0 place-items-center rounded-full">
                    <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>{g}
                </p>
              ))}
            </div>
          )}
          </div>
        </section>
      )}

      {/* AUCH DIE EMPFEHLUNG STEHT DRAUSSEN (Owner 25.08.2026: „auch recomandarea noastră")
          — sie ist kein Befund der Analyse, sondern ein Rat von uns. Auf dem Papier gehört,
          was gemessen wurde; auf dem Dunklen, was wir dazu meinen. Und im PDF, das an eine
          Firma geht, hat unsere Werbung ohnehin nichts verloren. */}
      <p className="mt-5 flex items-start gap-2 text-[16px] font-black text-white/90">
        <Play className="mt-0.5 h-4 w-4 shrink-0 text-[#f6cf51]" />{B.videoEmpfehlung}
      </p>

      {/* DER KAUFKNOPF STEHT AUSSERHALB DER KARTE (Owner 25.08.2026: „Ajustează aplicația
          muss ausserhalb stehen der Karte") — und das ist die Hausregel, nicht nur ein
          Geschmack: Die Karte ist das DOKUMENT, und ein Dokument enthält keinen Knopf, der
          etwas verkauft. Alles, womit man handelt, steht draussen auf dem Dunklen; im PDF
          taucht er damit ohnehin nie auf. Er nimmt die eingefügte Anzeige mit in den
          Trichter, wo Lebenslauf, Foto und Kasse zu Hause sind. */}
      <div className="mt-5">
        <Knopf art="gold" onClick={() => {
          try { if (letzteAnzeige.trim()) sessionStorage.setItem("lb_lebenslauf_anzeige", letzteAnzeige.trim()); } catch { /**/ }
          window.location.href = "/themes/lebenslauf/start";
        }}>
          {B.anpassenCta}
        </Knopf>
      </div>

      {anschreibenKarte}
      {anschreibenAktion}
    </>
  );

  return (
    <>
      <LebenslaufExecutive profil={profil} lang={lang} chatStill
        nachKarte={vorschau ? null : nachKarte}
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
