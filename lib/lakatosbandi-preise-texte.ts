import type { Lang } from "@/lib/lang";

/**
 * WAS KOSTET WAS — DIE PREISSEITE VON LAKATOSBANDI.COM (Owner 14.09.2026: „Preise hast du nicht
 * veröffentlicht" · „ja" zur Preisseite mit 50 Generierungen).
 *
 * ── DREI SPRACHEN VON HAND, NICHT ÜBERSETZT ─────────────────────────────────────────────────
 *
 * Auf einer Preisseite hängt an jedem Wort eine Zusage. Eine Maschinenübersetzung, die aus
 * „bleibt online" ein „bleibt gespeichert" macht, ist hier kein Schönheitsfehler, sondern eine
 * andere Zusage — deshalb steht jede Sprache fest, wie in `lakatosbandi-texte.ts`.
 *
 * ── WAS HIER NICHT STEHT ────────────────────────────────────────────────────────────────────
 *
 * Keine durchgestrichenen Fantasiepreise, kein „nur heute", keine Staffel, die niemand liest.
 * Zwei Spalten: was nichts kostet, und was das Abo dazugibt. Der Preis selbst kommt aus
 * `lib/pricing.ts` und wird eingesetzt — nie abgeschrieben (Skill `bezahlung`, Regel 2).
 */

export type PreiseTexte = {
  /** „Für Künstler" — die Zeile über der Überschrift (Owner 18.09.2026). */
  fuerWen: string;
  titel: string;
  intro: string;
  /** Die Gratis-Spalte. */
  freiTitel: string;
  freiPreis: string;
  freiListe: string[];
  /** Die Abo-Spalte. `{preis}` wird ersetzt. */
  aboTitel: string;
  aboPreis: string;
  aboZusatz: string;
  aboListe: string[];
  aboKnopf: string;
  /** Was eine Generierung ist — die Frage, die sonst jeder stellt. */
  zaehlerTitel: string;
  zaehlerText: string;
  /** Was der Artist-Fair-Shop im Abo ist (Owner 18.09.2026) — der Stern aus der Liste. */
  shopTitel: string;
  shopText: string;
  /** Kündigung, Ehrlichkeit am Schluss. */
  kleingedrucktTitel: string;
  kleingedruckt: string[];
};

const TEXTE: Record<Lang, PreiseTexte> = {
  de: {
    fuerWen: "Für Künstler",
    titel: "Preise",
    intro: "Deine Seite kostet nichts. Bezahlt wird nur, wenn die KI für dich schreibt.",
    freiTitel: "Deine Seite",
    freiPreis: "kostenlos",
    freiListe: [
      "Deine eigene Seite auf lakatosbandi.com",
      "Bis zu 10 Werke",
      "Texte selbst schreiben — Titel, Beschreibung, Preis",
      "Anfragen von Käufern empfangen und lesen",
      "Dein Agent spricht mit Interessenten",
    ],
    aboTitel: "Premium",
    aboPreis: "{preis}",
    aboZusatz: "im Monat",
    aboListe: [
      "Artist Fair Shop*",
      "Alles aus „Deine Seite“",
      "{n} KI-Texte im Monat",
      "Beschreibungen für deine Werke, automatisch",
      "Dein Profiltext, von der KI geglättet",
      "Mehr als 10 Werke",
    ],
    aboKnopf: "Abo abschliessen",
    shopTitel: "*Was ist der Artist Fair Shop?",
    shopText: "Deine Werke werden zu Produkten, die man bei uns bestellen kann: Poster im echten Holzrahmen oder ohne, die Druckdatei, T-Shirt und Hoodie — auf Bestellung gefertigt. Weitere Produkte kommen dazu, etwa Tassen. Auf jedem Stück stehen dein Name und die Adresse deiner Seite, dazu das Siegel „Artist Fair“. Von jeder Bestellung geht eine Lizenz an dich, und du bekommst eine Mail, sobald etwas verkauft wurde. Deine Originale bleiben deine und bleiben unberührt.",
    zaehlerTitel: "Was ist eine KI-Generierung?",
    zaehlerText: "Jedes Mal, wenn die KI für dich schreibt: ein Satz unter einem Werk, dein geglätteter Profiltext, eine Bildanalyse. Selbst geschriebene Texte zählen nicht — die sind immer frei.",
    kleingedrucktTitel: "Gut zu wissen",
    kleingedruckt: [
      "Monatlich kündbar. Der bezahlte Monat läuft zu Ende, danach ist Schluss.",
      "Nach der Kündigung bleibt deine Seite online, mit allen Werken und Texten. Nur neue KI-Texte gibt es dann nicht mehr.",
      "Keine Einrichtungsgebühr, keine Mindestlaufzeit.",
    ],
  },
  ro: {
    fuerWen: "Pentru artiști",
    titel: "Prețuri",
    intro: "Pagina ta nu costă nimic. Plătești doar când AI scrie pentru tine.",
    freiTitel: "Pagina ta",
    freiPreis: "gratuit",
    freiListe: [
      "Pagina ta pe lakatosbandi.com",
      "Până la 10 lucrări",
      "Scrii textele singur — titlu, descriere, preț",
      "Primești și citești cererile cumpărătorilor",
      "Agentul tău vorbește cu cei interesați",
    ],
    aboTitel: "Premium",
    aboPreis: "{preis}",
    aboZusatz: "pe lună",
    aboListe: [
      "Artist Fair Shop*",
      "Tot ce e în „Pagina ta“",
      "{n} texte scrise de AI pe lună",
      "Descrieri pentru lucrările tale, automat",
      "Textul tău de prezentare, corectat de AI",
      "Mai mult de 10 lucrări",
    ],
    aboKnopf: "Abonează-te",
    shopTitel: "*Ce este Artist Fair Shop?",
    shopText: "Lucrările tale devin produse pe care oricine le poate comanda de la noi: postere cu ramă adevărată de lemn sau fără, fișierul pentru tipar, tricou și hanorac — făcute la comandă. Vor urma și alte produse, de exemplu căni. Pe fiecare produs scrie numele tău și adresa paginii tale, plus sigiliul „Artist Fair“. Din fiecare comandă ți se plătește o licență, iar tu primești un e-mail imediat ce s-a vândut ceva. Originalele rămân ale tale și rămân neatinse.",
    zaehlerTitel: "Ce înseamnă o generare AI?",
    zaehlerText: "De fiecare dată când AI scrie pentru tine: o frază sub o lucrare, textul tău de prezentare corectat, o analiză de imagine. Textele scrise de tine nu se numără — acelea sunt mereu gratuite.",
    kleingedrucktTitel: "Bine de știut",
    kleingedruckt: [
      "Se poate anula lunar. Luna plătită merge până la capăt, apoi se oprește.",
      "După anulare pagina ta rămâne online, cu toate lucrările și textele. Doar texte noi de la AI nu mai primești.",
      "Fără taxă de instalare, fără perioadă minimă.",
    ],
  },
  en: {
    fuerWen: "For artists",
    titel: "Pricing",
    intro: "Your page costs nothing. You pay only when the AI writes for you.",
    freiTitel: "Your page",
    freiPreis: "free",
    freiListe: [
      "Your own page on lakatosbandi.com",
      "Up to 10 works",
      "Write your own texts — title, description, price",
      "Receive and read buyer enquiries",
      "Your agent talks to interested buyers",
    ],
    aboTitel: "Premium",
    aboPreis: "{preis}",
    aboZusatz: "per month",
    aboListe: [
      "Artist Fair Shop*",
      "Everything in “Your page”",
      "{n} AI texts per month",
      "Descriptions for your works, automatically",
      "Your profile text, polished by AI",
      "More than 10 works",
    ],
    aboKnopf: "Subscribe",
    shopTitel: "*What is the Artist Fair Shop?",
    shopText: "Your works become products anyone can order from us: posters in a real wooden frame or without, the print file, T-shirts and hoodies — all made to order. More products will follow, mugs among them. Every piece carries your name and the address of your page, plus the Artist Fair seal. Every order pays you a licence, and you get an email the moment something sells. Your originals stay yours and stay untouched.",
    zaehlerTitel: "What counts as an AI generation?",
    zaehlerText: "Every time the AI writes for you: a line under a work, your polished profile text, an image analysis. Texts you write yourself don’t count — those are always free.",
    kleingedrucktTitel: "Good to know",
    kleingedruckt: [
      "Cancel monthly. The month you paid for runs out, then it stops.",
      "After cancelling, your page stays online with all works and texts. You just don’t get new AI texts.",
      "No setup fee, no minimum term.",
    ],
  },
};

export const preiseTexte = (lang: Lang): PreiseTexte => TEXTE[lang] ?? TEXTE.en;
