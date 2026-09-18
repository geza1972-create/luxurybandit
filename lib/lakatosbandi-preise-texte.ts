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
  /** Der Verkauf der Originale — wir kassieren nichts (Owner 18.09.2026). */
  originalGross: string;
  originalTitel: string;
  originalText: string;
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
      "Originale verkaufst du selbst — 100 % für dich",
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
      "Texte, erzeugt mit unserem Marketing-Algorithmus",
      "Bis zu {werke} Werke",
    ],
    aboKnopf: "Abo abschliessen",
    shopTitel: "*Was ist der Artist Fair Shop?",
    shopText: "Deine Werke werden zu Produkten, die man bei uns bestellen kann: Poster im echten Holzrahmen oder ohne, die Druckdatei, T-Shirt und Hoodie — auf Bestellung gefertigt. Weitere Produkte kommen dazu, etwa Tassen. Auf jedem Stück stehen dein Name und die Adresse deiner Seite, dazu das Siegel „Artist Fair“. Von jeder Bestellung geht eine Lizenz an dich, und du bekommst eine Mail, sobald etwas verkauft wurde. Deine Originale bleiben deine und bleiben unberührt.",
    zaehlerTitel: "Was heisst „mit unserem Marketing-Algorithmus“?",
    zaehlerText: "Die Texte entstehen nicht aus einer beliebigen KI-Frage, sondern aus dem, was wir über den Verkauf von Kunst wissen: Der Satz unter einem Werk nennt das Seltene daran, dein Profiltext sagt, warum jemand gerade bei dir kaufen soll. Du kannst so oft neu schreiben lassen, bis es sitzt — und selbst geschriebene Texte bleiben immer frei.",
    originalGross: "100 % für den Künstler",
    originalTitel: "Deine Originale verkaufst du selbst",
    originalText: "Wer ein Original will, spricht mit dir — Preis, Übergabe und Versand macht ihr direkt aus. Unser KI-Agent führt das Gespräch für dich, sammelt die Anfrage und meldet sie dir. Von diesem Verkauf nehmen wir nichts: keine Provision, keine Gebühr, keinen Anteil. Wir verdienen nur an den Produkten, die wir selbst herstellen und verschicken.",
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
      "Originalele le vinzi tu — 100 % pentru tine",
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
      "Texte generate cu algoritmul nostru de marketing",
      "Până la {werke} lucrări",
    ],
    aboKnopf: "Abonează-te",
    shopTitel: "*Ce este Artist Fair Shop?",
    shopText: "Lucrările tale devin produse pe care oricine le poate comanda de la noi: postere cu ramă adevărată de lemn sau fără, fișierul pentru tipar, tricou și hanorac — făcute la comandă. Vor urma și alte produse, de exemplu căni. Pe fiecare produs scrie numele tău și adresa paginii tale, plus sigiliul „Artist Fair“. Din fiecare comandă ți se plătește o licență, iar tu primești un e-mail imediat ce s-a vândut ceva. Originalele rămân ale tale și rămân neatinse.",
    zaehlerTitel: "Ce înseamnă „cu algoritmul nostru de marketing“?",
    zaehlerText: "Textele nu ies dintr-o întrebare oarecare pusă unei inteligențe artificiale, ci din ce știm despre vânzarea artei: fraza de sub o lucrare spune ce e rar la ea, textul tău de prezentare spune de ce merită cumpărat de la tine. Poți cere un text nou de câte ori vrei — iar ce scrii singur rămâne mereu gratuit.",
    originalGross: "100 % pentru artist",
    originalTitel: "Originalele le vinzi tu",
    originalText: "Cine vrea un original vorbește cu tine — prețul, predarea și livrarea le stabiliți direct. Agentul nostru AI poartă discuția în locul tău, strânge cererea și ți-o trimite. Din vânzarea asta noi nu luăm nimic: niciun comision, niciun procent. Câștigăm doar din produsele pe care le facem și le expediem noi.",
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
      "You sell originals yourself — 100% yours",
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
      "Texts generated with our marketing algorithm",
      "Up to {werke} works",
    ],
    aboKnopf: "Subscribe",
    shopTitel: "*What is the Artist Fair Shop?",
    shopText: "Your works become products anyone can order from us: posters in a real wooden frame or without, the print file, T-shirts and hoodies — all made to order. More products will follow, mugs among them. Every piece carries your name and the address of your page, plus the Artist Fair seal. Every order pays you a licence, and you get an email the moment something sells. Your originals stay yours and stay untouched.",
    zaehlerTitel: "What does “with our marketing algorithm” mean?",
    zaehlerText: "The texts do not come from some random AI prompt but from what we know about selling art: the line under a work names what is rare about it, your profile text says why someone should buy from you. You can have a new one written as often as you like — and texts you write yourself are always free.",
    originalGross: "100% for the artist",
    originalTitel: "You sell your originals yourself",
    originalText: "Whoever wants an original talks to you — price, handover and shipping are between the two of you. Our AI agent runs the conversation for you, collects the enquiry and passes it on. We take nothing from that sale: no commission, no fee, no share. We earn only on the products we make and ship ourselves.",
    kleingedrucktTitel: "Good to know",
    kleingedruckt: [
      "Cancel monthly. The month you paid for runs out, then it stops.",
      "After cancelling, your page stays online with all works and texts. You just don’t get new AI texts.",
      "No setup fee, no minimum term.",
    ],
  },
};

export const preiseTexte = (lang: Lang): PreiseTexte => TEXTE[lang] ?? TEXTE.en;
