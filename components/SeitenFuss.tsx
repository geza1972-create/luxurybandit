import Link from "next/link";
import { Instagram, Youtube } from "lucide-react";
import { YOUTUBE_CHANNEL } from "@/lib/social";

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
export default function SeitenFuss({ className = "", art = "voll" }: {
  className?: string;
  /**
   * `schlicht` — DER FUSS DER BEWERBER-SEITEN (Owner 24.08.2026: „auf der Bewerbeseite
   * müssen die Links unten raus, auch Instagram und Facebook"). Eine Seite, die an eine
   * Personalabteilung geht, trägt keine Portal-Werbung: kein „Info & legal"-Block, kein
   * Contact/About, keine Social-Kreise, kein ©. Was BLEIBT, ist das gesetzliche Minimum —
   * Impressum, Datenschutz, AGB sind in der EU von jeder Seite aus erreichbar zu halten;
   * eine leise Zeile in 35 % Weiss erfüllt das, ohne die Seite zu bewerben.
   */
  art?: "voll" | "schlicht";
}) {
  if (art === "schlicht") {
    return (
      <footer className={`mx-auto mt-10 w-full max-w-[440px] px-4 pb-14 pt-4 ${className}`}>
        {/* DIE MARKE STEHT IM FUSS (Owner 25.08.2026: „unten im Footer muss noch
            LuxuryBandit rein, als Link auf die Homepage") — das ist KEIN „made by" auf
            der Mappe (das bleibt draussen, Memory `lebenslauf-kontaktkarte-ausblendbar`):
            Es ist die Herkunft der SEITE, dort wo jede Seite im Netz sie trägt, und der
            eine Weg vom Dossier zurück ins Portal. */}
        <p className="text-center">
          <Link href="/" className="text-[11.5px] font-black uppercase tracking-[0.2em] text-white/45 transition hover:text-white/80">
            luxurybandit
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] font-semibold text-white/35">
          <Link href="/imprint" className="transition hover:text-white/70">Imprint</Link>
          <Link href="/privacy" className="transition hover:text-white/70">Privacy</Link>
          <Link href="/terms" className="transition hover:text-white/70">Terms</Link>
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
    ["/contact", "Contact"],
    ["/about", "About"],
    ["/terms", "Terms"],
    ["/privacy", "Privacy"],
    ["/imprint", "Imprint"],
  ];

  return (
    /* EIGENER RAND, EIGENE BREITE (Owner 05.08.2026: „bitte Abstand zum Rand"). Der Fuss steht
       auf den Themenseiten AUSSERHALB des `max-w-[440px] px-4`-Rahmens, direkt im `<main>` —
       ohne eigenes Polster klebt die Schrift am Bildschirmrand. Er bringt es jetzt selbst mit
       und sitzt damit genau unter dem Inhalt, egal wo er eingehängt wird.
       `pb-16`: Unten schweben der Menue-Knopf und der Assistent. Ohne diesen Abstand liegen
       sie genau auf „Contact" und „Imprint" — den zwei Links, die erreichbar sein MUESSEN. */
    <footer className={`mx-auto mt-14 w-full max-w-[440px] border-t border-white/10 px-4 pb-16 pt-5 ${className}`}>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/50">Info &amp; legal</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-bold text-white/85">
        {links.map(([href, text]) => (
          <Link key={href} href={href} className="hover:text-white">{text}</Link>
        ))}
      </div>
      {/* INSTAGRAM UND YOUTUBE (Owner 06.08.2026: „instagram und you tube icon in dem
          footer") — dieselben Ziele und dieselben Kreise wie in der Kopfzeile (TopNav
          `iconBtn`), die Adresse aus EINER Quelle (`lib/social`, NEXT_PUBLIC_INSTAGRAM_HANDLE).
          Bewusst kein Client-Code: zwei <a>, der Fuss bleibt ein Server-Baustein. */}
      <div className="mt-4 flex items-center gap-2">
        <a href={YOUTUBE_CHANNEL} target="_blank" rel="noopener noreferrer" aria-label="Bella auf YouTube"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:text-white">
          <Youtube className="h-4 w-4" />
        </a>
        <a href={`https://instagram.com/${process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? "luxurybandit"}`}
          target="_blank" rel="noopener noreferrer" aria-label="Instagram"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:text-white">
          <Instagram className="h-4 w-4" />
        </a>
      </div>
      {/* Die Marke zum Schluss — sie beantwortet die Frage „bei wem war ich hier eigentlich",
          wenn jemand die Seite geteilt bekommen hat und die Kopfzeile längst weggescrollt ist. */}
      <p className="mt-3 text-[11px] font-semibold text-white/40">© LuxuryBandit</p>
    </footer>
  );
}
