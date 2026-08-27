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
  // DIE STRUKTUR-ANALYSE (Owner-Auftrag 26.08.2026, KONZEPT-JOB-MATCH-TRICHTER.md
  // Baustelle B) — Ampel-Etikett + vier Einstufungs-Abschnitte auf der Ergebnis-Karte.
  chanceH: "Deine Chance",
  ampelGut: "Gute Chance",
  ampelBruecke: "Bewerben lohnt sich",
  ampelSchwach: "Lohnt sich wahrscheinlich nicht",
  passtH: "Was bereits passt",
  transferH: "Welche Erfahrung übertragbar ist",
  erklaerenH: "Was erklärt werden sollte",
  problemH: "Was eine echte Hürde sein könnte",
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

  // ═════════ TÜR 2 — DIE JOBCHANCEN (Owner-Änderungsauftrag 26.08.2026,
  // KONZEPT-JOB-MATCH-TRICHTER.md Baustelle E/F) — ?jobs=1. ═════════
  chancen: "Passende Jobs werden gesucht …",
  mappe: "Dein Profil wird vorbereitet …",
  // ── DER KLICK-CHAT (einfache Fassung + Nachtrag 6: „Ich will. Ich kann. Ich
  // heisse." — ein Verlauf, eine Frage zur Zeit, Antworten nur per Klick). ──
  jobsKicker: "Jobs mit Deutsch",
  jobsH1: "Welcher Job passt zu mir?",
  kapWill: "Ich will",
  kapKann: "Ich kann",
  kapHeisse: "Ich heisse",
  fRichtung: "Was willst du machen?",
  mehrfachHinweis: "Mehrere sind erlaubt.",
  rSupport: "Kundenservice / Support",
  rBackoffice: "Backoffice / Verwaltung",
  rVerkauf: "Verkauf / Beratung",
  rTechnik: "Technischer Support / IT",
  rTourismus: "Tourismus / Guide",
  rLogistik: "Logistik / Organisation",
  rEgal: "Zeig mir, was geht",
  fTraum: "Was wäre dein Traum?",
  traumHinweis: "Freiwillig — wir nehmen ihn ernst.",
  traumPlatzhalter: "z. B. Pilot, Guide, eigene Werkstatt …",
  ueberspringen: "Überspringen",
  fZuletzt: "Was hast du zuletzt gemacht?",
  bHandel: "Handel / Verkauf",
  bGastro: "Gastro / Hotel",
  bBuero: "Büro / Verwaltung",
  bIT: "IT / Technik",
  bPflege: "Pflege / Soziales",
  bHandwerk: "Handwerk / Bau",
  bFahren: "Fahren / Logistik",
  bAnderes: "Etwas anderes",
  fFaehigkeiten: "Was kannst du gut?",
  fkKunden: "Mit Kunden reden",
  fkOrganisieren: "Organisieren",
  fkTechnik: "Technik verstehen",
  fkVerkaufen: "Verkaufen",
  fkFuehren: "Team führen",
  fkSchreiben: "Gut schreiben",
  fkZahlen: "Mit Zahlen umgehen",
  /* Die Deutsch-Frage selbst und ihre Antworten stehen HART DEUTSCH im Client — sie
     sind der Test (Nachtrag 6). Nur dieser Hinweis wird übersetzt. */
  deutschTestHinweis: "Kleiner Deutsch-Test: Frage und Antworten sind auf Deutsch — klick, was stimmt.",
  fCv: "Hast du einen Lebenslauf?",
  /* Nicht mehr „kein Muss" (Owner 26.08.2026) — ohne Lebenslauf zählt die Analyse
     mehrere Minuspunkte, weil eine Firma nichts nachprüfen kann. Der Hinweis sagt jetzt,
     was es kostet, statt es zu verharmlosen. */
  cvHinweis: "Ohne ihn kann eine Firma deine Erfahrung nicht nachprüfen — das siehst du gleich in deiner Analyse.",
  cvJa: "Ja, hochladen",
  cvNein: "Weiter ohne",
  fFoto: "Hast du ein aktuelles Foto von dir?",
  fotoHinweis: "Für deine Bewerbungsseite — kein Muss.",
  fotoJa: "Ja, hochladen",
  fotoSpaeter: "Später",
  fotoDa: "Foto ist da",
  fVideo: "Findest du eine Video-Bewerbung sinnvoll?",
  videoHinweis: "Firmen sehen und hören dich — statt nur Papier zu lesen.",
  videoJa: "Ja, gute Idee",
  videoUnsicher: "Bin mir nicht sicher",
  videoNein: "Eher nicht",
  /* DIE ANGABEN, DIE EINE FIRMA ZUERST FRAGT (Owner 26.08.2026: „wenn der User im Chat
     nichts angibt, dann ist alles unnützlich" · „wir fragen die Daten im Chat ab") —
     Alter und Wohnort stehen in keinem Lebenslauf zuverlässig, und ohne Telefon lässt sich
     niemand vorstellen. Jahre und Abschluss fragt der Chat NUR, wenn kein CV kam. */
  fAlter: "Wie alt bist du?",
  alterHinweis: "Firmen fragen das als Erstes.",
  fJahre: "Wie viele Jahre Erfahrung hast du?",
  jahreUnter1: "unter 1",
  fAbschluss: "Was ist dein höchster Schulabschluss?",
  abSchule: "Schule",
  abLehre: "Berufsausbildung",
  abAbitur: "Abitur / Bac",
  abStudium: "Studium",
  /* Führerschein (Owner 26.08.2026) — bei Fahrer- und Montagestellen die erste Frage der
     Firma; ohne ihn fällt ein Drittel der Chancen im Pool weg. */
  fFuehrerschein: "Hast du einen Führerschein?",
  fsKeiner: "Keinen",
  fsB: "B (Auto)",
  fsC: "C (LKW)",
  fsCE: "C+E (LKW mit Anhänger)",
  fsD: "D (Bus)",
  fWohnort: "In welcher Stadt wohnst du?",
  wohnortPlatzhalter: "z. B. Timișoara",
  fTelefon: "Unter welcher Nummer erreichen wir dich?",
  telefonHinweis: "Nur wir sehen sie — eine Firma bekommt sie erst, wenn du zusagst.",
  telefonPlatzhalter: "+40 …",
  /* Das E-Mail-Tor steht jetzt am ANFANG (Owner 26.08.2026, wie ein Meta-Sofortformular) —
     dieselben zwei Texte, nur an anderer Stelle. */
  fNameMail: "Wie heisst du?",
  nameMailHinweis: "An deine E-Mail schicken wir deine Chancen — und du kommst jederzeit zurück.",
  /* Der Abschluss fragt nichts mehr, er löst nur noch aus. */
  chancenBereit: "Das war alles. Sehen wir uns an, was zu dir passt.",
  /* Das Tor fragt wie ein Meta-Sofortformular: Name, E-Mail, Deutschniveau — und danach
     die Absicht (Owner 26.08.2026: „wir müssen Daten abfragen, und wenn sie sie nicht
     eingeben, dann sind sie nicht interessiert"). */
  /* Vor dem Test wird gefragt (Owner 26.08.2026: „man muss ihn fragen, ob er bereit ist
     für einen Deutschtest") — der Countdown läuft sonst los, bevor er hinschaut. */
  fBereit: "Bereit für einen kurzen Deutschtest?",
  bereitHinweis: "Fünf Fragen, je 20 Sekunden. Danach wissen wir, welche Jobs für dich realistisch sind.",
  bereitJa: "Ja, los",
  /* Die Analyse vor der Checkliste (Owner 26.08.2026) — Plus, Minus, ein Fazit. */
  /* Die Prozente je Richtung (Owner 27.08.2026: „die Prozente brauchen wir") — bewusst
     „Richtungen", nicht „Stellen": Wir bewerten eine Art von Arbeit, versprechen aber
     keine offene Stelle. */
  einschaetzungTitel: "Deine Einschätzung",
  einschaetzungZeile: "Ehrlich — auch da, wo es noch nicht reicht.",
  richtungenH: "So gut passt du zu diesen Arbeitsrichtungen",
  richtungenHinweis: "Eine Einschätzung deines Profils — keine offenen Stellen.",
  plusH: "Das spricht für dich",
  minusH: "Das fehlt noch",
  checklisteH: "Wo sollen wir für dich suchen?",
  checklisteZeile: "Kreuze die Branchen an, die für dich infrage kommen — auch mehrere.",
  checklisteCta: "Auswahl senden",
  sendet: "Sendet …",
  checklisteDanke: "Danke — wir haben deine Auswahl.",
  checklisteMelden: "Wir melden uns, sobald wir etwas Passendes für dich haben.",
  /* Das Premium-Paket direkt unter den Minuspunkten (Owner 26.08.2026: „er kann das
     buchen, um die Punkte zu verbessern") — kein Sofortkauf, ein Rückruf. */
  premiumH: "Diese Punkte kannst du wegbekommen",
  premiumZeile: "Wir setzen uns persönlich mit dir zusammen, gehen deine Bewerbung durch und machen daraus ein Profi-PDF und ein Video.",
  premiumP1: "Ein persönliches Gespräch",
  premiumP2: "Deine Bewerbung als Profi-PDF",
  premiumP3: "Dein Bewerbungsvideo",
  premiumCta: "Ja, ruft mich an",
  premiumKleinText: "Kein Kauf — wir melden uns innerhalb von 48 Stunden, danach entscheidest du.",
  premiumTelefonH: "Unter welcher Nummer erreichen wir dich?",
  premiumDanke: "Wir melden uns innerhalb von 48 Stunden.",
  premiumDankeZeile: "Du musst nichts weiter tun.",
  /* DER SCHREIBTEST (Owner 26.08.2026: „ich würde auch einen kleinen Schreibtest machen.
     Er soll was eintippen. Eine Frage am Ende wegen C2, wenn er gut ist. Sollte er am
     Anfang schon nicht mitmachen können, braucht man das nicht zu machen.") — er erscheint
     NUR ab B2. Wer vorher scheitert, wird nicht auch noch mit einer Schreibaufgabe
     vorgeführt; für ihn ist die Sache entschieden. */
  /* Die Ladeanzeige (Owner 26.08.2026: „hier muss noch was in Prozent stehen und bitte
     warten") — der Lauf dauert je nach Andrang bis zu einer Minute; ohne Fortschritt und
     ohne ein Wort dazu hält das niemand aus. */
  bitteWarten: "Bitte warten — das dauert einen Moment.",
  fSchreiben: "Letzte Frage — und die musst du selbst schreiben.",
  schreibenHinweis: "Zwei Sätze auf Deutsch reichen. Wir wollen sehen, wie du schreibst, nicht wie schnell.",
  schreibenAufgabe: "Stell dich kurz vor — wer du bist und was du gut kannst.",
  schreibenPlatzhalter: "z. B. Ich heisse … und habe … Jahre als … gearbeitet.",
  schreibenWeiter: "Fertig",
  schreibenKurz: "Noch ein bisschen mehr — zwei Sätze reichen.",
  fSuche: "Suchst du gerade einen Job?",
  sucheHinweis: "Ehrlich — danach richtet sich, was wir dir zeigen.",
  sucheSofort: "Ja, so schnell wie möglich",
  sucheMonate: "In den nächsten Monaten",
  sucheSchauen: "Ich schaue nur",
  mailPflichtFehler: "Bitte gib deine E-Mail an — dahin schicken wir deine Chancen.",
  chancenCta: "Zeig mir meine Chancen",
  // ── DIE KARTE AM ENDE (Owner: „Es soll wie ein Gaming funktionieren. Am Ende muss
  // eine Karte herauskommen, die er speichert oder die ich den Firmen vorstellen kann,
  // wenn er das erlaubt."). ──
  karteTitel: "Deine Karte",
  punkteLabel: "Chancen-Punkte",
  punkteHinweis: "Je flexibler du bist, desto mehr Türen öffnen sich. Tippe eine Antwort an, um sie zu ändern — und sieh, was mit deinen Punkten passiert.",
  karteDeutsch: "Deutsch",
  karteKann: "Das kannst du",
  karteWill: "Das willst du",
  karteTraum: "Dein Traum",
  karteChancen: "Deine besten Chancen",
  karteGespeichert: "Deine Karte ist gespeichert — mit deiner E-Mail kommst du jederzeit zurück.",
  nochmal: "Nochmal von vorn",
  aendern: "Ändern",
  dankeWort: "Danke",
  vorschlaegeTitel: "Diese Jobchancen könnten zu dir passen",
  vorschlaegeZeile: "Ehrlich eingeschätzt — auch, wo es eher nicht reicht.",
  keineChancen: "Gerade keine passenden Jobchancen im Pool — schau bald wieder vorbei.",
  mehrZeigen: "Anforderungen zeigen",
  wenigerZeigen: "Weniger zeigen",
  remoteRemote: "Remote",
  remoteHybrid: "Hybrid",
  remoteVorOrt: "Vor Ort",
  remoteEgal: "Egal",
  etikettGut: "Gute Chance",
  etikettQuer: "Quereinstieg realistisch",
  etikettMoeglich: "Möglicherweise passend",
  etikettSchwach: "Eher nicht passend",
  /* EIN klarer Knopf je Karte (Owner nach dem Live-Test: beim alten Wortlaut
     „wusste ich gar nicht, was das ist") — er sagt, was passiert, und ist der Lead. */
  karteCtaAnpassen: "Bewerbung darauf anpassen",
  beratungAb50: "Mit einer angepassten Bewerbung und einem Motivationsschreiben hast du hier echte Chancen — das machen wir für dich.",
  marktHinweis: "Diese Jobchancen basieren auf aktuell öffentlich ausgeschriebenen Stellen. LuxuryBandit vertritt den jeweiligen Arbeitgeber nicht.",
  interesseZeile: "Diese Jobchance könnte zu dir passen.",
  interesseCta: "Ich bin interessiert",
  interesseTrotzdem: "Trotzdem Interesse melden",
  andereChancen: "Andere Chancen ansehen",
  naechsteFrage: "Weiter",
  frageUmzug: "Würdest du für einen passenden Job in ein anderes Land umziehen?",
  umzugJa: "Ja",
  umzugVielleicht: "Vielleicht",
  umzugNein: "Nein",
  frageLaender: "Welche Länder kommen für dich infrage?",
  frageStart: "Wann könntest du anfangen?",
  startSofort: "Sofort",
  start2Wochen: "Innerhalb von 2 Wochen",
  start1Monat: "Innerhalb eines Monats",
  startSpaeter: "Später",
  frageArbeitsform: "Wie möchtest du arbeiten?",
  frageGehalt: "Welche Gehaltsvorstellung hast du?",
  gehaltUeberspringen: "Überspringen",
  frageRollen: "Für welche Rollen sollen wir dich berücksichtigen?",
  einwilligungTitel: "Fast fertig",
  einwilligung: "Ich bin damit einverstanden, dass LuxuryBandit mein Profil und meine Bewerbungsunterlagen passenden Arbeitgebern oder Recruiting-Partnern für relevante Stellen vorstellen darf.",
  einwilligungZeile: "Deine Daten werden nicht ohne deine Zustimmung an Arbeitgeber weitergegeben.",
  ohneFreigabe: "Ohne Freigabe weiter",
  fertigTitel: "Dein Profil ist bereit.",
  fertigZeile: "Du passt grundsätzlich gut zu dieser Art von Stelle. Wir können dein Profil passenden Arbeitgebern vorstellen, die aktuell deutschsprachige Mitarbeiter suchen.",
  statusFrei: "Profil für passende Arbeitgeber freigegeben",
  freiDanke: "Danke! Wir melden uns, sobald etwas passt.",
  statusPrivat: "Nur für dich gespeichert",
  freiZeile: "Wir dürfen dein Profil passenden Arbeitgebern oder Recruiting-Partnern vorstellen, wenn relevante Stellen verfügbar sind.",
  freigebenCta: "Für passende Arbeitgeber freigeben",
  cvLaden: "CV herunterladen",
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
  /* TÜR 2 — DER JOBS-MODUS (?jobs=1, einfache Fassung im KONZEPT-JOB-MATCH-TRICHTER.md):
     eigene Marke („LB - Jobs"), eigener Hero („Welcher Job passt zu mir?") und BEWUSST
     KEIN Landingpage-Inhalt unter dem Trichter (Owner nach dem Live-Test: „Deine
     Bewerbungszentrale ist zu viel auf dieser Seite … nur das Notwendige"). Die
     Dauerregel `tunnel-zeigt-landingpage-inhalt` gilt weiter für Tür 1 — Tür 2 ist ihr
     eigenes Produkt mit eigener Landingpage (/topics/…). */
  const jobs = String(sp.jobs ?? "") === "1";
  const topic = String(sp.topic ?? "").trim().slice(0, 60);
  /* DAS CHAT-GESICHT (Owner 26.08.2026, dritte und finale Wahl: „ich habe David als
     Video" — sein frisch generierter, seriöser Berater-Avatar). david.jpg ist das
     Standbild aus david.mp4 (Frame bei 0,5 s, per Canvas gezogen). */
  const chatGesicht = jobs ? "/Lebenslauf/david.jpg" : "";

  return (
    <main className={`lb-bg lb-zentrale min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      {jobs
        ? <TopNav marke="LB - Jobs" heim={`/topics/${encodeURIComponent(topic || "german-speakers")}`} motto="Jobs mit Deutsch" />
        : <TopNav marke="LB - AI Recruiting" heim="/themes/lebenslauf" motto="Video Applications" />}
      {/* Im Jobs-Modus KOMPAKT (Owner: „Seite ist nicht scrollbar, nur Chat-Inhalt") —
          die Chat-Karte endet an der Schirm-Unterkante, darunter nur der schlichte Fuss. */}
      <div className={`mx-auto flex w-full max-w-[440px] flex-col px-4 pt-3 md:max-w-[760px] ${jobs ? "pb-4" : "pb-24"}`}>
        {/* IM JOBS-MODUS KEIN HERO (Owner: „das wird ein FB Funnel sein, ich glaube wir
            brauchen ausser Chat nichts anderes") — die Anzeige hat die Frage schon
            gestellt, der Klick landet direkt im Chat; dessen Karte trägt den Kicker
            selbst. */}
        {!jobs && (<>
          <Kicker>{T.heroY}</Kicker>
          <H1 className="mt-1">{T.heroA}<Y>{T.heroY}</Y>{T.heroB}</H1>
        </>)}
        <div className="contents">
          {/* Der Tunnel zeigt den Landingpage-Inhalt (Memory `tunnel-zeigt-landingpage-inhalt`):
              unter dem Formular stehen die Feature-Karte „Deine Bewerbungszentrale" und die
              Beispiel-Sektion — dieselben Bausteine wie auf der LP. NUR Tür 1 (s. oben). */}
          <LebenslaufStartClient lang={L} code={code} texte={trichterTexte} chatGesicht={chatGesicht}
            inhalt={jobs ? undefined : <><BewerbungszentraleFeatures lang={L} /><LebenslaufBeispiel lang={L} /></>} />
        </div>
      </div>
      {jobs ? <SeitenFuss art="schlicht" /> : <SeitenFuss marke="LB - AI Recruiting" />}
    </main>
  );
}
