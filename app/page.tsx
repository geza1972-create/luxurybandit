import type { Metadata } from "next";
import { headers } from "next/headers";
import ThemesCatalog, { metadata as themenMetadata } from "./themes/page";
import FunnelDomainStart from "@/components/FunnelDomainStart";

export const dynamic = "force-dynamic";

/**
 * DIE ADRESSE SELBST IST DIE STARTSEITE — keine Weiterleitung mehr (Owner 03.08.2026:
 * „wenn ich auf meine Adresse klicke, komme ich auf die model seite").
 *
 * Hier stand `redirect("/themes")`. Fuer den Besucher war das richtig: Er landete auf den
 * Themen. Fuer SUCHMASCHINEN war es der Fehler, den der Owner in Bing gesehen hat.
 *
 * Eine Adresse, die nur weiterleitet, hat keinen eigenen Inhalt — Bing und Google werfen sie
 * deshalb aus dem Verzeichnis und nehmen statt ihrer irgendeine ANDERE Seite der Domain als
 * Marken-Treffer. Genommen wurde /stores, die Model-Galerie: Sie ist eine Client-Seite ohne
 * eigenen Titel, also trug sie den Standardtitel aus dem Wurzel-Layout — und sah damit wie
 * die Startseite aus. Wer den Treffer antippte, kam bei den Models heraus.
 *
 * Jetzt liefert „/" die Themen-Seite direkt aus. /themes bleibt bestehen und zeigt dasselbe;
 * damit die beiden sich im Verzeichnis nicht verduennen, nennt /themes „/" als kanonisch.
 *
 * ── ZWEI DOMAINS, ZWEI STARTSEITEN (Owner 02.09.2026) ─────────────────────────────────────
 *
 * „ich habe yourvideogenerator.com reserviert" · „ja, und da kommen noch andere Funnels als
 * White-Label."
 *
 * Dieselbe Anwendung liegt jetzt unter zwei Adressen. Auf `luxurybandit.com` ist der
 * Themen-Katalog richtig — das ist das Haus. Auf `yourvideogenerator.com` wäre er ein Unfall:
 * Diese Domain trägt Trichter, die einem Kunden als SEINE gezeigt werden, und wer die nackte
 * Adresse eintippt (ein neugieriger Empfänger, ein Datenschutzbeauftragter, der prüft, wohin
 * der Link führt), landete zwischen Kuss-Videos und Dessous-Looks.
 *
 * DIE WEICHE STEHT HIER UND NICHT IN DER MIDDLEWARE: Deren `matcher` deckt heute nur /tools
 * und /admin/tools ab; „/" dazuzunehmen hiesse, für jeden Startseiten-Aufruf eine
 * Edge-Funktion zu starten, um am Ende dieselbe Entscheidung zu treffen. Die Seite ist
 * ohnehin `force-dynamic` und liest den Host in derselben Anfrage.
 */
/**
 * DER TITEL HÄNGT AM HOST, WIE DIE SEITE (02.09.2026).
 *
 * `metadata` als Konstante kennt die Anfrage nicht — die neue Domain trug deshalb den
 * LuxuryBandit-Titel im Browser-Tab und in jeder Link-Vorschau, obwohl sie längst eine eigene
 * Seite zeigt. `generateMetadata` läuft in derselben Anfrage wie die Seite und darf denselben
 * Host lesen.
 */
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  if (!FUNNEL_DOMAIN.test(host)) return { ...themenMetadata, alternates: { canonical: "/" } };

  const titel = "Your video funnel — under your own name";
  const text = "Video funnels that run under your brand: your advert, your address, your analytics. Visitors upload one photo, see themselves in your world, and leave their details willingly.";
  return {
    title: titel,
    description: text,
    alternates: { canonical: `${FUNNEL_URL}/` },
    /* KEIN INDEX, SOLANGE HIER NUR EIN KUNDE LIEGT: Die Domain ist Vertriebsmaterial, kein
       Schaufenster — und ihre Unterseiten tragen fremde Marken. Wenn sie einmal wirbt, kommt
       diese Zeile heraus. */
    robots: { index: false, follow: false },
    openGraph: { title: titel, description: text, type: "website", url: `${FUNNEL_URL}/` },
  };
}

/**
 * DIE WURZEL VON VERSUSFORGE.COM IST DAS PORTAL (Owner 09.09.2026: „ich will, dass die
 * luxurybandit.com Adresse unter versusforge.com läuft, aber die Engine soll dann ihre
 * Adresse bekommen: versusforge.com/engine").
 *
 * HIER STAND EINE WEICHE: Auf `versusforge.com` lieferte „/" die Engine-Startseite aus, auf
 * `luxurybandit.com` den Katalog. Das dreht sich um — und zwar ganz: Es gibt keine Weiche
 * mehr, beide Adressen zeigen dasselbe Haus. Die Engine ist ab jetzt eine Seite darin,
 * `app/engine/page.tsx`, und damit unter beiden Adressen unter derselben Adresse erreichbar.
 *
 * WARUM DAS BESSER IST ALS DIE WEICHE: Ein Produkt, das nur auf einer Domain existiert,
 * lässt sich nicht verlinken, ohne dass man vorher überlegt, welche Domain der Empfänger
 * benutzt. `/engine` gilt überall — auch in Mails, die schon draussen sind.
 *
 * `?vf=1` GIBT ES NICHT MEHR. Der Schalter existierte nur, um die Domain-Fassung auf
 * localhost zu sehen; ohne Weiche gibt es nichts mehr vorzutäuschen.
 */

/** Alles, was NICHT das Haus ist, bekommt die White-Label-Startseite. */
const FUNNEL_DOMAIN = /(^|\.)yourvideogenerator\.com$/i;
const FUNNEL_URL = "https://yourvideogenerator.com";

export default async function Start({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  /* `?funnel=1` zeigt die White-Label-Wurzel auch dort, wo der Host sie nicht auslöst — auf
     localhost und auf der Vorschau-Adresse von Vercel. Ohne diesen Weg liesse sich die Seite
     erst NACH dem Ausrollen ansehen, und ein Fehler darin fiele dem Kunden auf, nicht uns. */
  const sp = await searchParams;
  const probe = String(sp?.funnel ?? "") === "1";
  if (probe || FUNNEL_DOMAIN.test(host)) {
    return <FunnelDomainStart />;
  }
  return <ThemesCatalog />;
}
