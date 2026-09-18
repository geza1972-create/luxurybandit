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
  /**
   * ── DER HOOK DER ANZEIGE, WÖRTLICH (Owner 13.09.2026: „Ganze Fett: Arta fara Marketing e
   * invizibila. Noi il facem. Das ist nur ein Text Hook sonst nichts. Und der text muss auch
   * geändert werden in der Anzeige") ──────────────────────────────────────────────────────────
   *
   * DIESE ADRESSE IST DAS ZIEL DER ANZEIGEN, und Facebook liest Titel und Beschreibung für die
   * Vorschau. Stand hier etwas anderes als in der Anzeige, versprach die eine Sache und die
   * Vorschau eine zweite — genau der Bruch, an dem Menschen abspringen, bevor sie etwas
   * gesehen haben.
   *
   * GETEILT AUF ZWEI FELDER: Der erste Teil ist die Behauptung und steht gross im Titel, der
   * zweite ist die Antwort darauf und schliesst sie in der Beschreibung ab.
   *
   * DEUTSCH UND ENGLISCH SIND SINNGEMÄSS, NICHT WÖRTLICH: „e invizibilă" meint hier, dass die
   * Kunst ungesehen bleibt — nicht, dass sie durchsichtig wäre.
   */
  return {
    title: l === "ro"
      ? "Arta fără marketing e invizibilă."
      : l === "de"
        ? "Kunst ohne Marketing bleibt ungesehen."
        : "Art without marketing stays unseen.",
    description: l === "ro"
      ? "Noi îl facem."
      : l === "de"
        ? "Wir machen es."
        : "We do it.",
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
  const sp = await searchParams;
  const roh = sp.lang;
  const ausAdresse = Array.isArray(roh) ? roh[0] : roh;
  const lang: Lang = isLang(ausAdresse ?? "") ? (ausAdresse as Lang) : await resolveLang("de");
  /* Die Kennung aus dem Facebook-Sofortformular (`?l=…`, Owner 13.09.2026) — nur durchgereicht,
     geprüft wird sie auf dem Server (lib/kuenstler-lead.ts). */
  const lRoh = sp.l;
  const lead = String((Array.isArray(lRoh) ? lRoh[0] : lRoh) ?? "").replace(/[^a-f0-9]/gi, "").slice(0, 64);
  /* Nur die Adresse zählt als Wahl — mit ihr entfällt die Sprachfrage. */
  const gewaehlt = isLang(ausAdresse ?? "");
  const S = await agentChatInSprache(lang);
  /* Auf lakatosbandi.com/start: eigene Adresse und eigener Name (Owner 11.09.2026: „nicht auf VersusForge"). */
  /**
   * ── AUF DEM ENTWICKLUNGSRECHNER GIBT ES KEINEN HOST „lakatosbandi.com" (18.09.2026) ────────
   *
   * Welche Fassung erscheint, entscheidet der Host — lokal ist der `localhost`. Wer hier prüfen
   * will, was ein Künstler sieht, bekam deshalb immer die Haus-Fassung (Owner: „das ist nicht
   * Lakatos Bandi"). `?portal=1` erzwingt die Portal-Fassung; auf der echten Adresse ändert
   * dieses Zeichen nichts, denn dort ist `echtesPortal` ohnehin wahr.
   */
  const echtesPortal = imPortal((await headers()).get("host"));
  const portal = echtesPortal || String(sp.portal ?? "") === "1";
  /**
   * WOHIN „ZURÜCK" FÜHRT, IST NICHT ÜBERALL DIESELBE ADRESSE.
   *
   * Auf lakatosbandi.com liegt dieser Chat unter `/start`. Lokal gibt es diese Adresse nicht —
   * sie fällt in die Künstlerprofil-Route und endet bei „Profil nicht gefunden". Wer dort die
   * Sprache wechselt oder alles löscht, landete im Nichts statt im Chat. Lokal ist dieselbe
   * Seite `/engine?portal=1`, damit die Portal-Fassung auch nach dem Zurücksetzen bleibt.
   */
  const startAdresse = echtesPortal ? "/start" : "/engine?portal=1";

  return <AgentChat S={S} lang={lang} gewaehlt={gewaehlt} lead={lead} {...(portal ? { start: startAdresse, marke: "lakatosbandi" as const } : {})} />;
}
