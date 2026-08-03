import type { Metadata } from "next";
import WerkAnsicht from "@/components/WerkAnsicht";
import { readKissLog } from "@/lib/try-this-look-store";

/**
 * DIE WERK-SEITE — /w/[id] (OFFEN.md Punkt 2, gebaut am 01.08.2026 mit der Zusatzregel des
 * Owners: geteilt wird die KARTE, und der Besitzer bestätigt vorher, dass sie öffentlich
 * wird).
 *
 * `noindex`: Die Seite gehört dem Kunden, nicht Google. Wer den Link hat, soll sie sehen —
 * gefunden werden soll sie nicht.
 */

/**
 * WAS IM CHAT STEHT, BEVOR JEMAND KLICKT (Owner 03.08.2026: „beim Sharen kommt ein
 * unpassender Text durch. Einen Gruß von jemandem der dich liebt").
 *
 * Diese Seite hatte gar keine eigenen Vorschau-Angaben — WhatsApp zog also die der Startseite:
 * „Pick a model, choose a designer outfit, and watch her wear it in a runway-quality AI
 * video." Das ist eine Produktanzeige. Sie landete im Chat eines Menschen, dem gerade jemand
 * einen Kuss geschickt hat, und erklärte ihm die falsche Sache.
 *
 * Dieser Text ist der EINZIGE, den der Empfänger sieht, bevor er sich entscheidet zu klicken.
 * Er muss dasselbe versprechen wie die Karte dahinter.
 */
const GRUSS: Record<string, Record<string, { titel: string; text: string }>> = {
  kiss: {
    de: { titel: "Ein Kuss für dich 💋", text: "Ein Gruß von jemandem, der dich liebt." },
    en: { titel: "A kiss for you 💋", text: "A greeting from someone who loves you." },
    ro: { titel: "Un sărut pentru tine 💋", text: "Un salut de la cineva care te iubește." },
    es: { titel: "Un beso para ti 💋", text: "Un saludo de alguien que te quiere." },
    fr: { titel: "Un baiser pour toi 💋", text: "Un message de quelqu'un qui t'aime." },
    pt: { titel: "Um beijo para ti 💋", text: "Uma mensagem de alguém que te ama." },
    it: { titel: "Un bacio per te 💋", text: "Un saluto da qualcuno che ti ama." },
  },
  wedding: {
    de: { titel: "Ihr seid eingeladen 💍", text: "Eine Einladung, die ihr euch ansehen solltet." },
    en: { titel: "You are invited 💍", text: "An invitation worth opening." },
    ro: { titel: "Sunteți invitați 💍", text: "O invitație care merită deschisă." },
    es: { titel: "Estáis invitados 💍", text: "Una invitación que merece abrirse." },
    fr: { titel: "Vous êtes invités 💍", text: "Une invitation à ouvrir." },
    pt: { titel: "Estão convidados 💍", text: "Um convite que vale a pena abrir." },
    it: { titel: "Siete invitati 💍", text: "Un invito da aprire." },
  },
};

/**
 * DAS VORSCHAUBILD IST BEWUSST NICHT SEIN FOTO.
 *
 * Es wäre möglich und wäre ein Fehler: Das Bild erscheint in der Chatliste, in der Meldung auf
 * dem Sperrbildschirm und in jeder Weiterleitung — überall dort, wo der Absender es nie hinhaben
 * wollte. Die Karte gehört HINTER den Klick, nicht davor. Eine unserer eigenen Kuss-Szenen sagt,
 * worum es geht, und verrät niemanden.
 */
const VORSCHAUBILD = "/szenen/kiss-closeup.jpg";

export async function generateMetadata(
  { params, searchParams }: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  },
): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const roh = Array.isArray(sp?.l) ? sp.l[0] : sp?.l;
  const lang = String(roh ?? "en").slice(0, 2);

  /**
   * NICHT FREIGEGEBEN = NICHTS VERRATEN. Die Seite selbst antwortet „Diese Karte ist privat";
   * die Vorschau darf nicht mehr sagen als sie. Sonst stünde in einem Chat ein warmer Gruß zu
   * einer Karte, die der Empfänger gar nicht öffnen kann — und wer eine fremde Kennung rät,
   * erführe daran, dass es sie gibt.
   */
  let theme = "";
  try {
    const eintrag = (await readKissLog()).find(e => e.id === String(id ?? ""));
    if (eintrag?.sharedAt) theme = String(eintrag.theme || "kiss");
  } catch { /* Protokoll nicht lesbar → wie „nicht freigegeben" behandeln */ }

  if (!theme) return { robots: { index: false, follow: false }, title: "LuxuryBandit" };

  const tabelle = GRUSS[theme] ?? GRUSS.kiss;
  const g = tabelle[lang] ?? tabelle.en;
  return {
    robots: { index: false, follow: false },
    title: g.titel,
    description: g.text,
    openGraph: {
      title: g.titel,
      description: g.text,
      type: "website",
      images: [{ url: VORSCHAUBILD, width: 1024, height: 1536 }],
    },
    twitter: { card: "summary_large_image", title: g.titel, description: g.text, images: [VORSCHAUBILD] },
  };
}

export default async function WerkSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="lb-bg min-h-screen text-white">
      <WerkAnsicht id={String(id ?? "")} />
    </main>
  );
}
