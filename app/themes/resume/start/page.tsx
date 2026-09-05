import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { eur, RESUME_CENTS } from "@/lib/pricing";
import ResumeGeneratorClient from "./ResumeGeneratorClient";

/**
 * LB - RESUME GENERATOR — DER FUNNEL (Owner 26.08.2026: eigenes Tool, „Man gibt die
 * Anzeige ein Die Bewerbung die schon existiert, das bild und wird angepasst zum
 * runterladen. Mit wasserzeichen. Will er ohne, muss er zahlen 9,99 Euro. Das wars.").
 *
 * BEWUSST OHNE die Bewerbungszentrale-Blöcke der Video Applications (Owner: „Deine
 * Bewerbungszentrale das entfernst du auf dem PDF generator") — nur der Generator.
 *
 * Alle Texte: deutsche Quelle, zur Laufzeit in die Betrachtersprache
 * (`textbausteineInSprache`, Dauer-Cache — TRICHTER-Muster).
 */

const GEN_QUELLE = {
  kicker: "Resume Generator",
  h1: "Für jede Stelle die perfekte Bewerbung — als PDF.",
  unterzeile: "Lebenslauf und Anzeige rein, fertige Bewerbung raus: Titelblatt mit Anschreiben, sauberes Layout, ehrliche Analyse.",
  mailPlatzhalter: "Deine E-Mail-Adresse",
  fotoTitel: "Dein Foto",
  fotoHinweis: "Optional",
  cvTitel: "Lebenslauf hochladen",
  cvHinweis: "PDF oder Word (.docx)",
  anzeigeTitelLabel: "Die Stellenanzeige",
  entfernen: "Entfernen",
  entfernenHinweis: "Tippen zum Tauschen · X entfernt",
  vorlagenTitel: "Deine Vorlage",
  vorlagenAnsehen: "Ansehen",
  schliessen: "Schliessen",
  anzeigePlatzhalter: "Link oder Text der Anzeige einfügen",
  erzeugen: "Bewerbung erzeugen — gratis",
  gratisZeile: "Gratis mit Muster-Wasserzeichen. Keine Anmeldung.",
  laufText: "Deine Bewerbung wird geschrieben …",
  fertigTitel: "Deine Bewerbung ist fertig",
  optimiertTitel: "Optimiert und freigeschaltet",
  pdfKnopf: "PDF herunterladen (Muster)",
  pdfKnopfVoll: "PDF herunterladen",
  musterHinweis: "Mit Muster-Wasserzeichen — du darfst es prüfen und verschicken.",
  analyseTitel: "Die ehrliche Analyse",
  kaufTitel: "Volle Optimierung",
  kaufText: "Dein Lebenslauf wird auf diese Anzeige zugeschnitten — Profiltext, Schwerpunkte, Betonung — und das PDF kommt ohne Wasserzeichen.",
  /* KEIN PREIS IM ÜBERSETZTEN SATZ (derselbe Fund wie auf der Landingpage: die
     KI-Übersetzung übersetzt „preis" in der Klammer mit, danach greift kein Ersatz mehr) —
     die Zahl kommt beim Rendern in ResumeGeneratorClient dazwischen, unübersetzt. */
  kaufKnopf: "Ohne Wasserzeichen —",
  /**
   * SAGEN, WAS ER TUT (Owner 05.09.2026: „ich habe es gekauft und muss nur das wasserzeichen
   * rausmachen. Oder macht er zusätzlich noch was. Muss aber stehen was er macht.").
   *
   * „Deine Bewerbung wird optimiert" liess offen, WARUM es dauert — und weil der Käufer nur
   * mit dem Entfernen des Wasserzeichens rechnete, sah jede Sekunde nach einem Hänger aus.
   * Tatsächlich läuft hier ein ZWEITER vollständiger Modell-Lauf: Er leitet eine Strategie
   * ab und schreibt Positionierung, Profiltext, Schwerpunkte und Anschreiben neu, zugeschnitten
   * auf genau diese Anzeige. Das ist die Ware — also steht es auch da.
   */
  optimierungLaeuft: "Deine Bewerbung wird auf diese Stelle zugeschnitten …",
  optimierungSchritte: "Strategie ableiten · Profiltext und Schwerpunkte neu schreiben · Anschreiben auf die Anzeige zuschneiden · PDF ohne Wasserzeichen bauen",
  nochmal: "Neue Bewerbung",
  fehlerMail: "Bitte eine gültige E-Mail-Adresse eingeben.",
  fehlerCv: "Bitte deinen Lebenslauf hochladen (PDF oder Word).",
  fehlerAnzeige: "Bitte die Stellenanzeige einfügen.",
  fehlerFoto: "Dieses Foto ließ sich nicht lesen — bitte ein anderes.",
  fehlerNetz: "Keine Verbindung — bitte noch einmal.",
  /* EIN ABBRUCH IST KEIN NETZFEHLER (Owner 05.09.2026, mit Bild). „Keine Verbindung" stand
     unter einem Lauf, bei dem die Verbindung tadellos war — der Server hatte nach 60
     Sekunden abgebrochen (504, siehe `maxDuration` in /api/resume-generator). Wer das liest,
     prüft sein WLAN statt es einfach noch einmal zu versuchen. */
  fehlerZuLang: "Das hat zu lange gedauert. Versuch es bitte noch einmal — meist klappt der zweite Anlauf.",
} as const;

export const metadata: Metadata = {
  title: "Resume Generator — die perfekte Bewerbung als PDF | LB - Resume Generator",
  description: "Lebenslauf und Stellenanzeige rein, fertige Bewerbung raus: Anschreiben, sauberes Layout, ehrliche Analyse. Gratis als Muster, 9,99 € ohne Wasserzeichen.",
};

export default async function ResumeGeneratorSeite({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const spLang = String(sp.lang ?? "");
  const L: Lang = isLang(spLang) ? spLang : await resolveLang("en");
  const hell = String(sp.light ?? "") === "1";
  const S = await textbausteineInSprache(GEN_QUELLE as unknown as Record<string, string>, L);
  const preisText = eur(RESUME_CENTS, L);

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav marke="LB - Resume Generator" heim="/themes/resume" motto="Perfect Resume PDF" />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#f6cf51]">{S.kicker}</p>
        <h1 className="mt-1 text-[26px] font-black leading-tight">{S.h1}</h1>
        <p className="mt-2 text-[13.5px] font-bold leading-snug text-white/60">{S.unterzeile}</p>
        <div className="mt-5">
          <ResumeGeneratorClient S={S} lang={L} preisText={preisText} />
        </div>
      </div>
      <SeitenFuss art="schlicht" />
    </main>
  );
}
