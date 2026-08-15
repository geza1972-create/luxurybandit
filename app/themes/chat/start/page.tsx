import type { Metadata } from "next";
import TopNav from "@/components/TopNav";
import SeitenFuss from "@/components/SeitenFuss";
import { Kicker, H1, Y } from "@/components/Landing";
import { resolveLang } from "@/lib/lang-server";
import { ordnerVideos } from "@/lib/tryon-videos";
import ChatStartClient from "./ChatStartClient";
import ChatInhalt, { chatTexte } from "@/components/ChatInhalt";

/**
 * DER CHAT ALS TUNNEL-SEITE (Owner 13.08.2026: „und für chat das selbe tunel. Als Video
 * haben wir dort nur bella." · „und das kostet wie Hochzeit. 9,99 dann 14,99 im monat") —
 * dieselbe Ad-Adresse wie die Geschwister:
 *
 *   dunkel  /themes/chat/start        hell  /themes/chat/start?light=1
 *
 * Schritte [1, 3] wie die Hochzeit (es gibt nichts zu wählen — Bella IST das Produkt):
 * 1 Name+E-Mail, 3 die Bella-Video-KARTE + der bestehende ChatFunnel mit seiner Kasse
 * (chat-zugang-checkout, seit heute 9,99 € aus CHAT_STUFEN; die Verlängerung läuft wie
 * bei der Hochzeit über das eine Abo, 14,99 €/Monat).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Start the Bella chat | LuxuryBandit",
  description: "Gift the perfect AI girlfriend — name, email, then the chat.",
  robots: { index: false, follow: true },
};

/* WÖRTLICH DIE H1 DER CHAT-LANDINGPAGE (app/themes/chat/page.tsx, `WERBUNG` — dort nicht
   exportiert, deshalb Kopie; ändert sich die Zeile dort, gehört diese Kopie mitgeändert —
   dasselbe Muster wie DEMO_CHAT in WeddingStartClient). */
const WERBUNG: Record<string, { h1a: string; h1b: string; h1c: string }> = {
  de: { h1a: "Schenk ihm eine ", h1b: "perfekte KI-Freundin", h1c: " 💛" },
  en: { h1a: "Gift him a ", h1b: "perfect AI girlfriend", h1c: " 💛" },
  ro: { h1a: "Dăruiește-i o ", h1b: "iubită AI perfectă", h1c: " 💛" },
  es: { h1a: "Regálale una ", h1b: "novia IA perfecta", h1c: " 💛" },
  fr: { h1a: "Offre-lui une ", h1b: "petite amie IA parfaite", h1c: " 💛" },
  pt: { h1a: "Oferece-lhe uma ", h1b: "namorada IA perfeita", h1c: " 💛" },
  it: { h1a: "Regalagli una ", h1b: "fidanzata IA perfetta", h1c: " 💛" },
};

export default async function ChatStartPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const L = await resolveLang();
  const W = WERBUNG[String(L ?? "en").slice(0, 2)] ?? WERBUNG.en;
  const code = String(sp.code ?? sp.promo ?? "").trim().slice(0, 40);
  /* Dieselben Abschnittstexte wie die Landingpage — eine Quelle, damit auf beiden
     Seiten wortgleich dasselbe steht (Owner 14.08.2026). */
  const t = await chatTexte(L, code);
  const hell = String(sp.light ?? "") === "1";

  /* DIE BELLA-VIDEOS — dieselbe Auswahl wie die Chat-Landingpage (app/themes/chat/page.tsx
     ~117): sichtbare Video-Folien aus Bellas Karten-Studio, signierte URLs. Poster gibt es
     an den Folien nicht — dieselbe Ausgangslage wie auf der Landingpage. */
  /* ERST der Ordner (public/Chat — die Pflege-Oberfläche), DANN Bellas Studio-Folien als
     Ergänzung: dieselbe Quelle wie die Landingpage-Karte. */
  /* NUR der Ordner public/Chat (Owner 13.08.2026: „also nur eins"). */
  const folien = ordnerVideos("Chat");

  return (
    <main className={`lb-bg min-h-screen text-white${hell ? " lb-theme lb-fb" : ""}`}>
      <TopNav />
      <div className="mx-auto flex w-full max-w-[440px] flex-col px-4 pb-24 pt-3">
        <Kicker>LuxuryBandit · Chat</Kicker>
        <H1 className="mt-1">{W.h1a}<Y>{W.h1b}</Y>{W.h1c}</H1>
        {/* `contents` STATT EINES EIGENEN KASTENS (15.08.2026): Diese Huelle hat die
            Tab-Leiste im Tunnel gefangen — `order-first` ordnet nur INNERHALB des eigenen
            Flex-Containers, und der war diese Huelle statt der Seitenspalte. Mit `contents`
            verschwindet sie aus dem Layout, ihre Kinder werden Geschwister von Kicker und
            Titel — und die Leiste kann darueber (Owner: „ueber den Titel bitte"). Den
            Abstand bringt der Trichter selbst mit (`mt-4` an seiner Wurzel). */}
        <div className="contents">
          {/* DERSELBE INHALT WIE AUF DER LANDINGPAGE, UNTER DEM ANMELDEFORMULAR
              (Owner 14.08.2026, Dauerregel fuer den Tunnel). */}
          <ChatStartClient lang={L} code={code} folien={folien} inhalt={<ChatInhalt t={t} />} />
        </div>
      </div>
      <SeitenFuss />
    </main>
  );
}
