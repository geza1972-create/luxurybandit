import TopNav from "@/components/TopNav";
import TrackView from "@/components/TrackView";
import { Kicker, H1, Y, SectionTitle, Lead, Fine } from "@/components/Landing";
/* Karte und Videofeld holt jetzt `EinladungBauen` selbst — hier wurden sie nur für die
   Beispielkarte gebraucht, die dem echten Trichter gewichen ist. */
import EinladungBauen from "@/components/EinladungBauen";
import ThemenPreis from "@/components/ThemenPreis";
import ThemenVorspann from "@/components/ThemenVorspann";
import SeitenFuss from "@/components/SeitenFuss";
import { Knopf } from "@/components/CI";
import { resolveLang } from "@/lib/lang-server";
import { trObject } from "@/lib/tr-object";
import { themenPreisZeile } from "@/lib/pricing";

/**
 * THEMA „GUTSCHEIN" — UNSER Gutschein als Videokarte (umgebaut am 06.08.2026).
 *
 * Owner 06.08.2026: „dann machen wir unsere Gutscheine. für unsere Topics" · „er wird ein
 * produkt auswählen aus dem katalog und bezahlt das und versendet das an jemandem. Das ist
 * das einfachste. Die Gutscheingenerierung kostet nichts." · „wir machen keine fremde
 * gutscheine mehr. Da wir ehe keiner machen. Also raus."
 *
 * DAS PRODUKT: Der Käufer wählt ein LuxuryBandit-Geschenk (Kussvideo, Geburtstagskarte,
 * Tanz, Urlaubs- oder Hochzeitseinladung — oder nacktes Guthaben), schreibt Botschaft und
 * Namen, zahlt NUR das Geschenk. Die Bella-Videokarte ist die Gratis-Hülle; wir mailen sie
 * an beide (Käufer und Beschenkten), und der Beschenkte ist über den signierten Mail-Link
 * sofort angemeldet — sein Guthaben hängt an seiner E-Mail, dem Login.
 *
 * WAS HIER FRÜHER STAND: das Verpacken FREMDER Gutscheine (Konzept §3b, Keyword-Messung
 * 04.08.). Am 06.08. abgeschafft — niemand hätte es benutzt, und die EU-Regel „wir verkaufen
 * keine fremden Zahlungsinstrumente" gilt weiter: Unser Gutschein ist ein Einzweckgutschein
 * auf die eigene Leistung (Begründung in app/api/gutschein-checkout).
 *
 * DER ZEITPUNKT bleibt der Grund für die Eile: Gutscheine sind ein Dezember-Geschäft mit
 * harter Frist. Wer das Produkt im November nicht stehen hat, wartet ein Jahr.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  /* SUCHWORT NACH VORN (Konzept §2). Seit dem 06.08.2026 verkaufen wir hier UNSERE
     Gutscheine (Owner: „wir machen keine fremde gutscheine mehr") — gesucht wird das
     Verschenken, nicht mehr das Verpacken. */
  title: "Gutschein verschenken — als Videokarte mit Botschaft | LuxuryBandit",
  description: "Wähl ein Geschenk oder Guthaben, schreib deine Botschaft — wir schicken die Videokarte per E-Mail. Eingelöst wird mit einem Tipp, das Guthaben verfällt nicht.",
  keywords: [
    "gutschein verschenken", "geschenkgutschein", "gutschein ideen", "gutschein text",
    "gutschein spruch", "digitaler gutschein", "gutschein per email verschicken",
    "last minute geschenk", "gutschein weihnachten",
    "gift card ideas", "digital gift card", "gift voucher by email", "gift card message",
    "last minute gift",
  ],
  alternates: { canonical: "/themes/gutschein" },
  /* Ohne eigenes openGraph erbt diese Seite das Haus-Bild aus app/layout.tsx (LB-Logo) —
     Bild wie in der Katalog-Kachel (app/themes/page.tsx). */
  openGraph: {
    title: "Gutschein verschenken — als Videokarte mit Botschaft",
    description: "Wähl ein Geschenk oder Guthaben, schreib deine Botschaft — wir schicken die Videokarte per E-Mail. Eingelöst wird mit einem Tipp, das Guthaben verfällt nicht.",
    type: "website",
    url: "/themes/gutschein",
    images: [{ url: "/Gutscheine/gutschein-poster.jpg", width: 720, height: 1280 }],
  },
};

/**
 * ÜBERSCHRIFT, GRUND UND KARTENTITEL — VON HAND, NICHT DURCH DIE MASCHINE.
 *
 * Dieselbe Begründung wie auf der Chat-Seite: Erklärtexte übersetzt `trObject` gut, WERBUNG
 * nicht. Sie sieht die dreigeteilte Überschrift nie als ganzen Satz und baut die Grammatik
 * falsch zusammen — auf Rumänisch ist genau das schon einmal passiert.
 *
 * DIE ÜBERSCHRIFT SPRICHT DEN KÄUFER AN (Owner 05.08.2026: „Da wird nicht der Käufer
 * angesprochen im Titel sondern der beschenkte"). Er ist der, der einen Gutschein herumliegen
 * hat und nicht weiss, wie er ihn überreicht.
 *
 * DER KARTENTITEL FOLGT DEM HAUSMUSTER (Owner 05.08.2026: „Surprise, Surprise das stimmt
 * auch nicht. Mein Geschenk für dich: Ein Gutschein!"). Im Konzept §3b stand noch
 * „Surprise, Surprise 🎁" — aber der Kuss und der Tanz sagen seit jeher „Mein Geschenk für
 * dich: einen Kuss" bzw. „… einen Tanz". Der Titel nennt das GESCHENK, nicht die Reaktion
 * darauf; „Surprise" könnte auf jeder Karte stehen und sagt dem Empfänger nichts.
 */
export const WERBUNG: Record<string, { h1a: string; h1b: string; h1c: string; grund: string; kartenTitel: string; botschaft: string }> = {
  /* NEU AM 06.08.2026: verkauft wird UNSER Gutschein (Owner: „wir machen keine fremde
     gutscheine mehr. … Die texte müssen auf der landing page auch angepasst werden."). Die
     Überschrift spricht den KÄUFER an, das goldene Wort ist das Produkt. */
  de: { h1a: "Verschenk einen ", h1b: "Gutschein", h1c: " als Videokarte 🎁",
        grund: "Geld im Umschlag wirkt lieblos. Dieselbe Summe als Videokarte mit Botschaft wird aufgehoben — und das Geschenk sucht sich der Beschenkte selbst aus.",
        kartenTitel: "Mein Geschenk für dich: Ein Gutschein!",
        botschaft: "Alles Liebe zum Geburtstag! Dein Geschenk wartet hinter dem Knopf." },
  en: { h1a: "Gift a ", h1b: "voucher", h1c: " as a video card 🎁",
        grund: "Cash in an envelope feels lazy. The same amount as a video card with a message gets kept — and they pick their own gift.",
        kartenTitel: "My present for you: a gift card!",
        botschaft: "Happy birthday! Your present is waiting behind the button." },
  ro: { h1a: "Dăruiește un ", h1b: "voucher", h1c: " ca un card video 🎁",
        grund: "Banii în plic par lipsiți de suflet. Aceeași sumă, ca un card video cu mesaj, se păstrează — iar cadoul și-l alege chiar el.",
        kartenTitel: "Cadoul meu pentru tine: un voucher!",
        botschaft: "La mulți ani! Cadoul tău te așteaptă în spatele butonului." },
  es: { h1a: "Regala un ", h1b: "vale", h1c: " como videotarjeta 🎁",
        grund: "El dinero en un sobre parece frío. La misma cantidad como videotarjeta con mensaje se guarda — y el regalo lo elige él mismo.",
        kartenTitel: "Mi regalo para ti: ¡un vale!",
        botschaft: "¡Feliz cumpleaños! Tu regalo te espera detrás del botón." },
  fr: { h1a: "Offre un ", h1b: "bon cadeau", h1c: " en carte vidéo 🎁",
        grund: "L'argent dans une enveloppe fait froid. La même somme en carte vidéo avec message se garde — et le cadeau, c'est lui qui le choisit.",
        kartenTitel: "Mon cadeau pour toi : un bon cadeau !",
        botschaft: "Joyeux anniversaire ! Ton cadeau t'attend derrière le bouton." },
  pt: { h1a: "Oferece um ", h1b: "vale", h1c: " como videocard 🎁",
        grund: "Dinheiro num envelope parece frio. A mesma quantia como videocard com mensagem guarda-se — e o presente, escolhe-o a própria pessoa.",
        kartenTitel: "O meu presente para ti: um vale!",
        botschaft: "Parabéns! O teu presente espera por ti atrás do botão." },
  it: { h1a: "Regala un ", h1b: "buono", h1c: " come video card 🎁",
        grund: "I soldi in busta sembrano freddi. La stessa cifra come video card con messaggio si conserva — e il regalo se lo sceglie da solo.",
        kartenTitel: "Il mio regalo per te: un buono!",
        botschaft: "Buon compleanno! Il tuo regalo ti aspetta dietro il pulsante." },
};

export default async function GutscheinThemePage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  const L = await resolveLang();
  const W = WERBUNG[L] ?? WERBUNG.en;

  const t = await trObject({
    kicker: "LuxuryBandit · Voucher",
    claim: "You pick the gift, Bella delivers the message.",
    /**
     * ANLASS UND GRUND — das Kuss-Muster, wie auf jeder Themenseite (Skill-Regel aus
     * `components/ThemenVorspann`). Der Anlass ist hier besonders wichtig, weil danach
     * wirklich gesucht wird: nicht nach „Gutschein", sondern nach „Gutschein für die
     * Lehrerin", „zur Hochzeit", „zu Weihnachten" (Keyword-Messung 04.08.2026).
     */
    anlass: "For Christmas · for a birthday · for a wedding · for a teacher · for the person you love · for anyone you would otherwise just send money",
    /**
     * DIE DREI SCHRITTE DES NEUEN PRODUKTS (Owner 06.08.2026: „er wird ein produkt auswählen
     * aus dem katalog und bezahlt das und versendet das an jemandem. Das ist das
     * einfachste."). Kein Upload, kein fremder Gutschein — Bella bringt die Botschaft, die
     * Karte ist gratis, bezahlt wird nur das Geschenk.
     */
    schritt1: "Pick the gift — a kiss video, a dance, an invitation or plain credit.",
    schritt2: "Write your message and your name — Bella hands it over in the video card.",
    schritt3: "We email the card to them — one tap and the gift is theirs.",
    privat: "The credit is tied to their email address — nobody else can redeem it, and it does not expire.",
    s1h: "One voucher, every LuxuryBandit gift",
    s1p: "The credit lands on their account — their email is their login. They redeem it on any theme page: a kiss video, a birthday card, a dance, an invitation. Whatever you pick, they can still choose differently — it is their credit.",
    s2h: "Better than cash in an envelope",
    s2p: "Cash gets spent at the supermarket and forgotten. A video card with your words gets kept — and because the gift is chosen by the person you love, it never misses.",
    s3h: "You know their email? That is all you need",
    s3p: "No address, no parcel, no app. You type their email, we deliver the card and the credit lands where only they can spend it. Sending a real gift takes one minute — even on the 24th of December at eleven at night.",
    s4h: "One link, nothing to print",
    s4p: "The card opens on any phone, plays Bella with your message and hands over the gift with one tap. The page is listed nowhere and Google cannot find it.",
    tonAn: "Sound", tonAus: "Mute",
  }, L);

  return (
    <main className="lb-bg min-h-screen text-white">
      <TopNav heim="/media-kit" motto="The Media Creator" sprachen={["en", "de"]} />
      <TrackView event="gutschein_view" lookId="themes-gutschein" lookName="Gutschein-Thema" />
      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        <Kicker>{t.kicker}</Kicker>
        <H1>{W.h1a}<Y>{W.h1b}</Y>{W.h1c}</H1>
        <Lead className="mt-2">{t.claim}</Lead>
        <ThemenPreis thema="gutschein" lang={L} className="mt-3" />

        <ThemenVorspann anlass={t.anlass} grund={W.grund}
          wieGeht={[t.schritt1, t.schritt2, t.schritt3]} wieGehtPrivat={t.privat} />

        {/* DIE AD-ADRESSE (KONZEPT-TUNNEL.md) — ein zweiter, schmalerer Weg direkt zum
            Drei-Schritt-Tunnel (`/themes/gutschein/start`); `code` reist mit. Der Bau-Kasten
            unten bleibt unveraendert. */}
        {/* Der Outline-Zweitknopf mit Preis („de la 9,99 €") ist RAUS (Owner 12.08.2026, mit Bild: „das raus, das haben wir sonst niergendwo") — die eine Tür in den Tunnel ist der goldene Karten-Knopf. */}

        {/**
          * DER TRICHTER — DERSELBE WIE BEI HOCHZEIT UND URLAUB (Owner 05.08.2026: „Man, wir
          * haben doch einen Trichter. Du hast den verlassen.").
          *
          * Was `variant="gutschein"` dort anders macht, steht in der Komponente: keine Szene,
          * keine zweite Person, kein Datum, KEIN Upload (06.08.: „Wir haben die Bella, die
          * die Botschaft bringt") — dafür die Geschenk-Wahl: Produkt oder Guthaben, bezahlt
          * wird nur das; die Karte mit Bellas Video aus `public/Gutscheine` ist gratis.
          */}
        <div className="mt-5">
          <EinladungBauen lang={L} variant="gutschein"
            beispielVideo="/Gutscheine/PixVerse_V6_Fusion_360P_She_holds_a_cream_enve.mp4" />
        </div>

        {/**
          * HIER STAND DER KAUFWEG — und er gehört nicht hierher (Owner 05.08.2026: „nicht hier
          * auf der Landingpage. Erst beim Editieren des Gutscheins").
          *
          * Er hat recht, und der Grund ist die Reihenfolge des Verstehens: Diese Seite
          * verkauft das VERPACKEN. Wer sie öffnet, hat meistens schon einen Gutschein und
          * sucht eine Hülle dafür. Drei Betragsknöpfe und zwei Adressfelder mitten hinein
          * gestellt fragen ihn nach etwas, das er noch gar nicht will — und sie erklären ihm
          * obendrein ein ZWEITES Produkt, bevor er das erste verstanden hat.
          *
          * WOHIN ER GEHÖRT: in den Bau-Schritt. Dort, wo er seinen eigenen Gutschein anhängt,
          * steht die Frage von selbst im Raum — „und wenn ich keinen habe?". Genau da ist der
          * LuxuryBandit-Gutschein die Antwort, nicht vorher.
          *
          * `components/GutscheinFunnel` war der zweite Fehler und ist gelöscht — es gibt EINEN
          * Trichter. Die Kasse dahinter (`app/api/gutschein-checkout`, Produkt oder Stufe,
          * zwei Adressen, Verbuchung in `checkout-status` aufs Konto des Beschenkten) sitzt
          * seit dem 06.08. IM Bau-Schritt — als Geschenk-Wahl, siehe `EinladungBauen`.
          */}

        <div className="mt-10 space-y-7">
          <section>
            <SectionTitle>{t.s1h}</SectionTitle>
            <Lead>{t.s1p}</Lead>
          </section>
          <section>
            <SectionTitle>{t.s2h}</SectionTitle>
            <Lead>{t.s2p}</Lead>
          </section>
          <section>
            <SectionTitle>{t.s3h}</SectionTitle>
            <Lead>{t.s3p}</Lead>
          </section>
          <section>
            <SectionTitle>{t.s4h}</SectionTitle>
            <Lead>{t.s4p}</Lead>
          </section>
        </div>

        <Fine className="mt-8">{t.claim}</Fine>
      </div>
      <SeitenFuss />
    </main>
  );
}
