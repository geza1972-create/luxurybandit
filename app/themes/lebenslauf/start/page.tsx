import type { Metadata } from "next";
import SpracheAmDokument from "@/components/SpracheAmDokument";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { kissText } from "@/lib/kiss-i18n";
import LebenslaufStartClient from "./LebenslaufStartClient";
import { textbausteineInSprache } from "@/lib/lebenslauf-uebersetzen";
import LebenslaufBeispiel from "@/components/LebenslaufBeispiel";
import BewerbungszentraleFeatures from "@/components/BewerbungszentraleFeatures";

/**
 * DIE TUNNEL-SEITE DES LEBENSLAUF-PORTALS — genau das Muster aus
 * `app/themes/wedding/start/page.tsx` (KONZEPT-TUNNEL.md).
 *
 * DIE AD-ADRESSEN:
 *   dunkel  /themes/lebenslauf/start
 *   hell    /themes/lebenslauf/start?light=1
 */

export const dynamic = "force-dynamic";

/**
 * DIE TEXTE DES TRICHTERS — DEUTSCHE QUELLE, ZUR LAUFZEIT UEBERSETZT (Owner 25.08.2026,
 * mit Bild auf Englisch trotz rumaenischer Seite: "hier ist noch englisch").
 *
 * VORHER STANDEN HIER DREI TABELLEN MIT NUR de/en (STUFEN_TEXT, ANZEIGE_TEXT,
 * SKRIPT_TEXT, alle im Client) — auf Rumaenisch, Spanisch, Franzoesisch, Portugiesisch
 * und Italienisch fiel der ganze Anzeigen-Schritt (Titel, Match-Ergebnis, Skript,
 * Aufnahme) automatisch auf Englisch zurueck. Genau der Schritt, der den Kauf traegt.
 *
 * Derselbe Weg wie bei der Muster-Seite (MUSTER_TEXTE in
 * app/lebenslauf/executive/page.tsx): eine flache deutsche Quelle, EIN Aufruf durch
 * `textbausteineInSprache` mit Dauer-Cache, danach rendert der Client nur noch.
 */
const TRICHTER_QUELLE = {
  // STUFEN_TEXT — die grosse Stufen-Anzeige waehrend die Kette laeuft.
  zahlung: "Zahlung wird bestätigt …",
  lesen: "Dein Lebenslauf wird gelesen …",
  match: "Dein Match wird berechnet …",
  fertig: "Deine Seite wird gebaut …",
  // ANZEIGE_TEXT — Schritt 1: die Jobanzeige.
  titel: "Passt diese Jobanzeige zu dir?",
  zeile: "Füg den Link oder den Text der Anzeige ein — du siehst gleich in Prozent, wie gut du passt. Kostenlos.",
  platzhalter: "https://… oder den Text der Anzeige einfügen",
  weiter: "Weiter — Match kostenlos prüfen",
  ohne: "Ohne Anzeige starten",
  weiterMatch: "Weiter — dein Match",
  gruendeH: "Das passt",
  lueckenH: "Das fehlt noch",
  stark: "Starke Übereinstimmung",
  mittel: "Teilweise Übereinstimmung",
  schwach: "Schwache Übereinstimmung",
  cta: "Bewerbung anpassen & Chancen erhöhen",
  ctaZeile: "Skript, Video und deine fertige Bewerbungsseite — zugeschnitten auf diese Stelle.",
  andere: "Andere Anzeige testen",
  karteH: "Deine Bewerbung — Vorschau",
  profilH: "Profil",
  kompetenzenH: "Kernkompetenzen",
  bearbeiten: "Bearbeiten",
  fertigB: "Fertig",
  // SKRIPT_TEXT — Skript lesen/aendern, dann einsprechen.
  skriptTitel: "Dein Skript",
  skriptZeile: "Aus deinem eigenen Werdegang. Ändere ihn, bis er nach dir klingt.",
  skriptWeiter: "Skript passt — jetzt einsprechen",
  aufnahmeTitel: "Sprich dein Skript ein",
  aufnahmeZeile: "Handykamera reicht. Du liest ab, so oft du willst — niemand sieht die Versuche davor.",
  aufnahmeKachel: "Aufnahme hochladen",
  aufnahmeHinweis: "Ein Video von dir, in dem du dein Skript sprichst.",
  aufnahmeLaedt: "Wird hochgeladen …",
  seiteBauen: "Seite bauen",
  zurueckSkript: "Zurück zum Skript",
};

export type TrichterTexte = typeof TRICHTER_QUELLE;

export const metadata: Metadata = {
  title: "Luxury Video Bewerbung — für Top Jobs | LuxuryBandit",
  description: "Foto und Lebenslauf hochladen — die KI zeigt dir, wofür du dich bewerben kannst.",
  robots: { index: false, follow: true },
};

export default async function LebenslaufStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang("ro");
  const T = kissText(L, "lebenslauf");
  const trichterTexte = await textbausteineInSprache(TRICHTER_QUELLE, L);
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const hell = String(sp.light ?? "") === "1";

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <Kicker>{T.heroY}</Kicker>
        <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        <div className="contents">
          {/* Der Tunnel zeigt den Landingpage-Inhalt (Memory `tunnel-zeigt-landingpage-inhalt`):
              unter dem Formular stehen die Feature-Karte „Deine Bewerbungszentrale" und die
              Beispiel-Sektion — dieselben Bausteine wie auf der LP. */}
          <LebenslaufStartClient lang={L} code={code} texte={trichterTexte}
            inhalt={<><BewerbungszentraleFeatures lang={L} /><LebenslaufBeispiel lang={L} /></>} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
