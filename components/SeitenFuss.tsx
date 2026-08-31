import Link from "next/link";

/**
 * DER FUSS UNTER JEDER THEMENSEITE (Owner 05.08.2026: „und wir machen auf jeder Topicseite
 * auch einen Footer").
 *
 * DIESELBEN FÜNF LINKS WIE IM MENÜ, nur ohne dass man das Menü öffnen muss. Bis heute standen
 * Impressum, AGB und Datenschutz ausschliesslich hinter dem Hamburger — wer eine Themenseite
 * aus einer Anzeige öffnet, sieht sie also nie. Das ist nicht nur unbequem: In der EU gehören
 * Impressum und Datenschutz von jeder Seite aus erreichbar, und zwar ohne Suchen.
 *
 * WARUM NICHT NUR ZWEI LINKS: Weil dieselbe Leiste zugleich das Vertrauenssignal ist, das eine
 * Verkaufsseite braucht. Wer 15 € an eine Adresse zahlt, die er nicht kennt, schaut nach unten
 * — und findet dort entweder Kontakt und Anbieter oder nichts.
 *
 * EIN SERVER-BAUSTEIN, KEIN CLIENT: nur Links, kein Zustand. Er kostet damit kein einziges
 * Kilobyte JavaScript auf Seiten, die ohnehin schon viel laden.
 */
/**
 * DIE LINK-WÖRTER IN SIEBEN SPRACHEN — FESTE TABELLE, KEINE LAUFZEIT-ÜBERSETZUNG
 * (Owner 28.08.2026, mit Bild des Fusses auf der deutschen David-Seite: „ebenso unten").
 *
 * Bis hierher stand der Fuss auf JEDER Seite englisch — „Info & legal · Contact · About ·
 * Terms · Privacy · Imprint" —, auch unter einer durchgehend deutschen Verkaufsseite. Das
 * sind die Links, die Vertrauen tragen sollen; in der falschen Sprache tun sie das Gegenteil.
 *
 * WARUM EINE TABELLE UND NICHT `textbausteineInSprache` (sonst die Hausregel): Es sind sechs
 * Rechtsbegriffe, die sich nie ändern — sie altern nicht, anders als Verkaufstext. Dafür
 * kostet die Tabelle keinen API-Aufruf, sie steht auf JEDER Seite des Hauses, und sie
 * funktioniert auch dann, wenn beim Übersetzer kein Guthaben liegt.
 */
const FUSS_TEXTE: Record<string, { infoLegal: string; contact: string; about: string; terms: string; privacy: string; imprint: string }> = {
  de: { infoLegal: "Info & Rechtliches", contact: "Kontakt", about: "Über uns", terms: "AGB", privacy: "Datenschutz", imprint: "Impressum" },
  en: { infoLegal: "Info & legal", contact: "Contact", about: "About", terms: "Terms", privacy: "Privacy", imprint: "Imprint" },
  ro: { infoLegal: "Informații legale", contact: "Contact", about: "Despre noi", terms: "Termeni", privacy: "Confidențialitate", imprint: "Date legale" },
  es: { infoLegal: "Información legal", contact: "Contacto", about: "Sobre nosotros", terms: "Términos", privacy: "Privacidad", imprint: "Aviso legal" },
  fr: { infoLegal: "Infos & mentions légales", contact: "Contact", about: "À propos", terms: "CGU", privacy: "Confidentialité", imprint: "Mentions légales" },
  pt: { infoLegal: "Informação legal", contact: "Contacto", about: "Sobre nós", terms: "Termos", privacy: "Privacidade", imprint: "Informação da empresa" },
  it: { infoLegal: "Info e note legali", contact: "Contatti", about: "Chi siamo", terms: "Termini", privacy: "Privacy", imprint: "Note legali" },
};

export default function SeitenFuss({ className = "", art = "voll", marke, lang = "en" }: {
  className?: string;
  /**
   * DIE SPRACHE DER SEITE — ohne sie bleibt es beim bisherigen Englisch. Bewusst ein Prop
   * und kein `resolveLang()` im Baustein selbst: Vier Aufrufer sind Client-Komponenten
   * (TopNav, CIMuster, LebenslaufExecutive, /future-program), und eine Server-Funktion
   * liesse sich dort nicht aufrufen. Server-Seiten reichen ihr `L` herein; alle anderen
   * bleiben unveraendert, bis sie es tun.
   */
  lang?: string;
  /**
   * `schlicht` — DER FUSS DER BEWERBER-SEITEN (Owner 24.08.2026: „auf der Bewerbeseite
   * müssen die Links unten raus, auch Instagram und Facebook"). Eine Seite, die an eine
   * Personalabteilung geht, trägt keine Portal-Werbung: kein „Info & legal"-Block, kein
   * Contact/About, keine Social-Kreise, kein ©. Was BLEIBT, ist das gesetzliche Minimum —
   * Impressum, Datenschutz, AGB sind in der EU von jeder Seite aus erreichbar zu halten;
   * eine leise Zeile in 35 % Weiss erfüllt das, ohne die Seite zu bewerben.
   */
  art?: "voll" | "schlicht";
  /**
   * DER RUECKWEG INS GROSSE PORTAL (Owner 26.08.2026: „Nur im Footer gibt es einen Link
   * der LUXURYBANDIT TOOLS heisst der dann auf die Startseite führt"). Ein Topic mit
   * eigener Kopfzeilen-Marke tritt oben nicht mehr als LuxuryBandit auf — dieser eine,
   * dezente Link unten ist der einzige verbliebene Hinweis, wer dahintersteckt und wo die
   * anderen Produkte stehen. Derselbe String wie `TopNav`s `marke`-Prop (z. B.
   * „LB - Kiss") — steht hier ZUSAETZLICH über dem Link (Owner, direkt danach: „damit ich
   * es sehe, dass es individuell ist machst du hier drüber noch mal LB-{Topic} drüber").
   */
  marke?: string;
}) {
  const T = FUSS_TEXTE[lang] ?? FUSS_TEXTE.en;
  if (art === "schlicht") {
    return (
      <footer className={`mx-auto mt-10 w-full max-w-[440px] px-4 pb-14 pt-4 ${className}`}>
        {/* DIE MARKE STEHT IM FUSS (Owner 25.08.2026: „unten im Footer muss noch
            LuxuryBandit rein, als Link auf die Homepage") — das ist KEIN „made by" auf
            der Mappe (das bleibt draussen, Memory `lebenslauf-kontaktkarte-ausblendbar`):
            Es ist die Herkunft der SEITE, dort wo jede Seite im Netz sie trägt, und der
            eine Weg vom Dossier zurück ins Portal. Text vereinheitlicht auf „LUXURYBANDIT
            FUNNELS" (26.08.2026: „Wir sind jetzt ein Funnel Spezialist" — vorher „TOOLS")
            — hier gilt derselbe Gedanke immer, ohne eigenes Prop, weil eine Bewerbungsseite
            nie als LuxuryBandit auftritt. */}
        <p className="text-center">
          <Link href="/" className="text-[13px] font-black uppercase tracking-[0.2em] text-white/45 transition hover:text-white/80">
            LUXURYBANDIT FUNNELS
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] font-semibold text-white/35">
          <Link href="/imprint" className="transition hover:text-white/70">{T.imprint}</Link>
          <Link href="/privacy" className="transition hover:text-white/70">{T.privacy}</Link>
          <Link href="/terms" className="transition hover:text-white/70">{T.terms}</Link>
        </div>
      </footer>
    );
  }
  /**
   * „ABOUT" IST ZURÜCK (05.08.2026, nachdem der Text neu geschrieben wurde).
   *
   * Es war einen Abend lang draussen (Owner: „diese About ist richtig, dass da verlinkt
   * wird?" — nein, war sie nicht).
   *
   * `/about` ist noch die alte Marktplatz-Seite: „AI and real influencers", „Subscribe —
   * unlock her private world", und zweimal „Become a LuxuryBandit Model" mit Link auf die
   * Bewerbung. Ein Geschenkkäufer, der dort landet, bekommt ein Influencer-Abo angeboten und
   * wird als Model angeworben — beides genau das Gegenteil dessen, was diese Seiten verkaufen,
   * und die Models-Bewerbung hat der Owner am selben Tag für Besucher geschlossen.
   *
   * Der Umbau steht schon im Paket (KONZEPT-GESCHENKE-UND-IDEEN.md §6b, Punkt 4: „Texte:
   * Motto, Katalog-Kopf, die acht Kacheln, ABOUT, Seitentitel"). Sobald „About" das
   * Geschenkideen-Portal beschreibt, kommt die Zeile hier zurück — sie ist nur auskommentiert,
   * nicht vergessen.
   *
   * Was bleibt, ist das, was stimmt UND gebraucht wird: Kontakt, AGB, Datenschutz, Impressum.
   */
  const links: [string, string][] = [
    ["/contact", T.contact],
    ["/about", T.about],
    ["/terms", T.terms],
    ["/privacy", T.privacy],
    ["/imprint", T.imprint],
  ];

  return (
    /* EIGENER RAND, EIGENE BREITE (Owner 05.08.2026: „bitte Abstand zum Rand"). Der Fuss steht
       auf den Themenseiten AUSSERHALB des `max-w-[440px] px-4`-Rahmens, direkt im `<main>` —
       ohne eigenes Polster klebt die Schrift am Bildschirmrand. Er bringt es jetzt selbst mit
       und sitzt damit genau unter dem Inhalt, egal wo er eingehängt wird.
       `pb-16`: Unten schweben der Menue-Knopf und der Assistent. Ohne diesen Abstand liegen
       sie genau auf „Contact" und „Imprint" — den zwei Links, die erreichbar sein MUESSEN. */
    <footer className={`mx-auto mt-14 w-full max-w-[440px] border-t border-white/10 px-4 pb-16 pt-5 ${className}`}>
      <p className="mb-2 text-[13px] font-black uppercase tracking-[0.14em] text-white/50">{T.infoLegal}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] font-bold text-white/85">
        {links.map(([href, text]) => (
          <Link key={href} href={href} className="hover:text-white">{text}</Link>
        ))}
      </div>
      {/**
        * INSTAGRAM UND YOUTUBE SIND RAUS (Owner 31.08.2026, mit Bild des Fusses: „you tube
        * und insta raus").
        *
        * Sie standen seit dem 06.08. dort und flogen am 26.08. schon einmal von den Seiten
        * mit eigener Marke. Jetzt überall: Beide Kanäle zeigen Geschenkvideos — Kuss,
        * Geburtstag, Hochzeit —, also genau das, was heute aus dem Katalog geflogen ist. Ein
        * Recruiter, der von `/recruiting` kommt und unten auf das Instagram-Zeichen tippt,
        * landet in einer anderen Firma.
        *
        * Die Kanäle selbst bleiben bestehen; sie werden nur nicht mehr aus dem Fuss verlinkt.
        */}
      {/* Die Marke zum Schluss — sie beantwortet die Frage „bei wem war ich hier eigentlich",
          wenn jemand die Seite geteilt bekommen hat und die Kopfzeile längst weggescrollt ist.
          MIT EIGENER KOPFZEILEN-MARKE wird daraus zwei Zeilen (Owner 26.08.2026): die eigene
          Marke selbst OBEN — „damit ich es sehe, dass es individuell ist" — und darunter, als
          LINK, der Rückweg ins grosse Portal. Ohne eigene Marke bleibt nur der reine © Text,
          man ist ja schon „im Haus". */}
      {marke ? (
        <div className="mt-3">
          <p className="text-[13px] font-black uppercase tracking-[0.14em] text-white/70">{marke}</p>
          <p className="mt-1 text-[13px] font-black uppercase tracking-[0.14em]">
            <Link href="/" className="text-white/40 transition hover:text-white/70">LUXURYBANDIT FUNNELS</Link>
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[13px] font-semibold text-white/40">© LuxuryBandit</p>
      )}
    </footer>
  );
}
