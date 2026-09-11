import type { Metadata } from "next";
import AgentChat from "@/components/AgentChat";
import { agentChatInSprache } from "@/lib/agent-chat-texte";
import { isLang, type Lang } from "@/lib/lang";
import { resolveLang } from "@/lib/lang-server";
import { headers } from "next/headers";
import { imPortal } from "@/lib/lakatosbandi-adressen";

/**
 * VERSUSFORGE — DIE ANZEIGE FÜHRT DIREKT IN DEN CHAT.
 *
 * ── DIE ENTSCHEIDUNG (Owner 10.09.2026) ─────────────────────────────────────────────────────
 *
 * Mit dem Bild dieser Seite: „diese Seite verwirrt mich." Und auf die Frage, ob es die
 * Reihenfolge ist: „Gott sei Dank, hast du es verstanden."
 *
 * HIER STAND BIS HEUTE EINE VERKAUFSSEITE MIT FELD: Überschrift, „4 Fragen, und du hast die
 * Lösung!", ein Eingabefeld, Beispiele, „Der Weg". Seit der Agent der Trichter ist, war die
 * Reihenfolge damit verkehrt:
 *
 *   · Er tippte seinen Satz, BEVOR ihn jemand begrüsst hatte — und bevor er dem Datenschutz
 *     zugestimmt hatte. Danach kam im Chat erst „Hallo, ich bin VersusForge", die Regeln und
 *     „Einverstanden?". Erst schreiben, dann gefragt werden, ob man schreiben darf.
 *   · „4 Fragen" versprach etwas, das der Agent nicht halten soll. Am selben Tag entschieden:
 *     „Er muss alles liefern, egal wie. Du holst es aus ihm raus." Dann sind es auch sechs.
 *
 * ── WAS JETZT HIER STEHT ───────────────────────────────────────────────────────────────────
 *
 * Genau das, was `/engine/agent` zeigt — dieselbe Komponente, dieselbe Sprachlogik. Es gibt
 * keine zweite Fassung dieses Gesprächs; eine zweite wäre die Stelle, an der in vier Wochen
 * zwei verschiedene Begrüssungen stünden.
 *
 *   · Mit Sprache im Link (`?lang=ro` aus der Anzeige) → sofort die Begrüssung in dieser
 *     Sprache.
 *   · Ohne → zuerst „Choose a language", ohne Vorauswahl.
 *   · Danach: Begrüssung · Regeln · was gratis ist · Datenschutz · „Ja, einverstanden" · und
 *     die erste Frage stellt der Agent selbst.
 *
 * DIE ALTE STARTSEITE (`components/VersusForgeStartEinfach.tsx`) BLEIBT IM REPO, hängt aber
 * an dieser Adresse nicht mehr. Löschen ist später harmlos; heute wäre es ein zweiter Eingriff
 * in derselben Stunde.
 *
 * ── DIE ADRESSE STICHT DAS COOKIE ───────────────────────────────────────────────────────────
 *
 * Nur `?lang=` zählt als Wahl — Begründung ausführlich in `app/engine/agent/page.tsx`
 * (Cookies können blockiert sein; das Portal-Cookie sagt nichts darüber, in welcher Sprache
 * jemand über sein Geschäft reden will).
 */

export const dynamic = "force-dynamic";

/* Titel und Beschreibung bleiben: Diese Adresse ist das Ziel der Anzeigen, und Facebook liest
   beides für die Vorschau. Die Beschreibung verspricht keine Fragenzahl mehr. */
/* AUF LAKATOSBANDI.COM/START HEISST DER TAB NICHT „VERSUSFORGE" (Owner 11.09.2026: „und oben steht VersusForge"). */
export async function generateMetadata({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  if (!imPortal((await headers()).get("host"))) return metadata;
  const roh = (await searchParams).lang;
  const l = String((Array.isArray(roh) ? roh[0] : roh) ?? "").slice(0, 2);
  return {
    title: `lakatosbandi.com — ${l === "ro" ? "Începe" : "Start"}`,
    description: l === "ro"
      ? "Arta ta pe lakatosbandi.com — cu fraza care îi face pe oameni să se oprească. Gratuit, pagina ta e online imediat."
      : l === "de"
        ? "Deine Kunst auf lakatosbandi.com — mit dem Satz, bei dem man stehen bleibt. Kostenlos, deine Seite ist sofort online."
        : "Your art on lakatosbandi.com — with the sentence that makes people stop. Free, your page is online right away.",
    alternates: { canonical: "https://lakatosbandi.com/start" },
  };
}

const metadata: Metadata = {
  title: "VersusForge — deine Anzeige, deine Strecke, deine Anfragen",
  description:
    "Sag, was du anbietest — du bekommst den Satz, der Leute anhält, dein Anzeigenbild und die Seite dahinter, auf der sie anfragen. Kostenlos, bis die ersten Anfragen da sind.",
  alternates: { canonical: "/engine" },
};

export default async function VersusForgeEingang({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const roh = (await searchParams).lang;
  const ausAdresse = Array.isArray(roh) ? roh[0] : roh;
  const lang: Lang = isLang(ausAdresse ?? "") ? (ausAdresse as Lang) : await resolveLang("de");
  /* Nur die Adresse zählt als Wahl — mit ihr entfällt die Sprachfrage. */
  const gewaehlt = isLang(ausAdresse ?? "");
  const S = await agentChatInSprache(lang);
  /* Auf lakatosbandi.com/start: eigene Adresse und eigener Name (Owner 11.09.2026: „nicht auf VersusForge"). */
  const portal = imPortal((await headers()).get("host"));

  return <AgentChat S={S} lang={lang} gewaehlt={gewaehlt} {...(portal ? { start: "/start", marke: "lakatosbandi" as const } : {})} />;
}
