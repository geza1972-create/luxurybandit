import type { Metadata } from "next";
import { resolveLang } from "@/lib/lang-server";
import ArmeeFunnel from "@/components/ArmeeFunnel";
import ImmerOben from "@/components/ImmerOben";
import { ACADEMY_DOMAIN } from "@/lib/armee-musik";
import { ARMEE_DEMO_HINWEIS, DEMO_KUNDE, armeeSpot, armeeSprache, armeeTexte, demoSzenen } from "@/lib/demo-armee";

/**
 * DER TRICHTER — er beginnt HINTER der Landingpage (Owner 02.09.2026: „und fehlt die
 * Landingpage davor. Dafür ist der Titel" · „hier fängt der Tunnel an").
 *
 * Bis heute stand er auf `/academy` selbst: Das Erste, was ein Besucher aus einer Anzeige sah,
 * war die Vorlagenauswahl — er sollte wählen, bevor er wusste, was er dabei bekommt. Der
 * Claim, der das erklärt, gehört auf die Landingpage; hier fängt das Tun an. Dieselbe
 * Reihenfolge wie bei jedem anderen Produkt des Hauses (Skill `ci-design`, „Der Weg eines
 * Produkts").
 *
 * DER ÖFFENTLICHE TRICHTER (Owner 02.09.2026: „Du kannst es öffentlich machen. Und englisch
 * und deutsch. Damit kann ich alle länder angehen." · „der Trichter ist gut und bleibt
 * offen").
 *
 * WARUM `/academy` UND NICHT DER DEMO-PFAD: Der Trichter hing hinter einem nicht ratbaren
 * Schlüssel, weil er einem einzelnen Interessenten gezeigt werden sollte. Jetzt ist er das
 * Werbemittel selbst — er steht in Anzeigen, wird geteilt und muss lesbar sein. Kurz, in
 * beiden Sprachen verständlich, ohne Zufallsteil.
 *
 * ZWEI SPRACHEN, BEIDE STATISCH (lib/demo-armee.ts): keine Laufzeit-Übersetzung. Der erste
 * Besucher einer Sprache wartet damit 0 statt 26 bis 44 Sekunden — bei einem Trichter, den
 * eine bezahlte Anzeige füttert, entscheidet das über den ganzen Test.
 *
 * ER ERZEUGT WIRKLICH (Owner 02.09.2026: „klar will ich das" · „der Kunde muss das
 * benutzen"). Bis dahin lief hier nur eine Uhr und am Ende stand das fertige Szenen-Video —
 * jeder sah dasselbe fremde Gesicht. Seither: Foto in den Speicher, Bildmodell setzt sein
 * Gesicht in die Szene, Pixverse animiert es (`/api/armee-video`, zwei Phasen).
 *
 * DAMIT SIND DIE DATENSCHUTZ-ZEILEN ECHTE ZUSAGEN. „Dein Foto wird nicht gespeichert" stand
 * im Trichter, solange nichts hinausging; ab dem ersten echten Lauf wäre es eine
 * Falschaussage gewesen. Die Texte in `lib/demo-armee.ts` sagen jetzt, was tatsächlich
 * passiert. Wer die Kette anfasst, prüft sie mit.
 */

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const sprache = String(sp.lang ?? "") || (await resolveLang("de"));
  const T = armeeTexte(sprache);
  /* Eigene Vorschau, wie auf der Landingpage — sonst verschickt sich eine White-Label-Seite
     mit dem Haus-Logo (Owner 02.09.2026). Begründung dort in `generateMetadata`. */
  const titel = `${T.claimEins} ${T.claimZwei} — ${DEMO_KUNDE.name}`;
  const text = `${T.claimDrei} ${T.lpSub}`;
  const bild = `${ACADEMY_DOMAIN}${armeeSpot(sprache).poster}`;
  return {
    title: titel,
    description: text,
    openGraph: {
      title: titel, description: text, type: "website",
      siteName: DEMO_KUNDE.name, url: `${ACADEMY_DOMAIN}/academy/start`,
      images: [{ url: bild, width: 720, height: 1280 }],
    },
    twitter: { card: "summary_large_image", title: titel, description: text, images: [bild] },
  };
}

export default async function ArmeeStartSeite({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  /* Die Adresse sticht die gespeicherte Wahl — ein gezielt verschickter Link kommt bei jedem
     Empfänger gleich an. Ohne Angabe: seine Wahl, dann seine Browsersprache, dann Deutsch. */
  const lang = String(sp.lang ?? "") || (await resolveLang("de"));
  const T = armeeTexte(lang);

  return (
    <main className="lb-bg min-h-screen text-white">
      {/* KEIN KOPFBALKEN MEHR (Owner 02.09.2026: „das raus hier"). Der Trichter hat je
          Schritt schon einen eigenen Zurück-Pfeil (`ArmeeFunnel`s `kopf`) — die zweite
          Kopfzeile mit Pfeil, Marke, Hell/Dunkel und Sprache war doppelt. */}

      <div className="mx-auto w-full max-w-[440px] px-4 pb-24 pt-3">
        {/* Auch hier: Der Trichter wird aus Anzeigen und QR-Codes geöffnet, oft mehrmals. */}
        <ImmerOben />
        <ArmeeFunnel szenen={demoSzenen(lang)} texte={T} hinweis={ARMEE_DEMO_HINWEIS[armeeSprache(lang)]} />
      </div>

      {/* KEIN FUSS (Owner 02.09.2026: „Footer komplett raus. Es ist ein White-Label") — wie
          auf der Landingpage davor. Der Trichter trägt die Marke des Kunden; ein
          „LUXURYBANDIT · AI-MEDIA CREATOR" darunter wäre ein zweiter Absender auf seiner
          Seite. Was mit dem Fuss verschwindet, steht in `LandingSeite` unter `whitelabel`. */}
    </main>
  );
}
