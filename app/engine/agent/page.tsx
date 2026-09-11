import type { Metadata } from "next";
import AgentChat from "@/components/AgentChat";
import { agentChatInSprache } from "@/lib/agent-chat-texte";
import { resolveLang } from "@/lib/lang-server";
import { isLang, type Lang } from "@/lib/lang";
import { headers } from "next/headers";
import { imPortal } from "@/lib/lakatosbandi-adressen";

/**
 * DER AGENT ZUM ANSEHEN (Owner 09.09.2026: „zeig mir in einem anderen Branch, wie so was
 * aussehen könnte" · „also parallel bauen").
 *
 * EIGENE ADRESSE, EIGENER ZWEIG, NICHTS ANGEFASST: `/engine` läuft weiter wie auf `main`.
 * Hier daneben steht dasselbe Gespräch mit Werkzeugen — man kann beides hintereinander
 * öffnen und den Unterschied sehen, statt ihn erklärt zu bekommen.
 *
 * ── DIE SPRACHE ENTSCHEIDET SICH HIER, NICHT IM BROWSER ────────────────────────────────────
 *
 * Owner 09.09.2026: „gleich am Anfang müsste er die Sprache erfragen oder den Browser
 * fragen. Einige haben einen englischen Browser, wollen aber auf Rumänisch reden."
 *
 * ZWEI SCHRITTE, IN DIESER REIHENFOLGE:
 *  1. Der Server liest die Browsersprache (`resolveLang`) und rendert den ganzen Chat schon
 *     darin — wer einen deutschen Browser hat, muss nichts wählen, damit es deutsch ist.
 *  2. Der Chat FRAGT trotzdem, solange keine Wahl im Cookie steht. Die Vermutung wird als
 *     erste angeboten, die anderen daneben.
 *
 * WARUM DAS COOKIE UND NICHT NUR EIN ZUSTAND IM BROWSER: Die Wahl gilt danach auch für den
 * Trichter, das Impressum, den Datenschutz und jede andere Seite des Hauses — es ist
 * dasselbe Cookie, das der Umschalter in der TopNav setzt (`lb_lang`). Wer hier Rumänisch
 * wählt, bekommt auch das Kleingedruckte auf Rumänisch.
 *
 * NICHT INDEXIEREN: Es ist ein Muster, kein Produkt.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VersusForge — Agent",
  robots: { index: false, follow: false },
};

export default async function AgentSeite({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /**
   * DIE ADRESSE STICHT DAS COOKIE (Hausregel aus `components/LangSwitch.tsx`, hier zum
   * zweiten Mal aus einem anderen Grund gebraucht).
   *
   * OWNER 09.09.2026: „keiner ist aktiv." Beim Antippen einer Sprache passierte nichts —
   * und die Ursache war, dass die Wahl AUSSCHLIESSLICH in einem Cookie stand. Wo Cookies
   * blockiert sind (privates Fenster, strenge Einstellung, ein Browser, der Fremdseiten
   * generell sperrt), schrieb der Knopf ins Leere: Der Server sah keine Wahl, rendert
   * dieselbe Frage, und für den Menschen ist der Knopf kaputt.
   *
   * EIN KNOPF, DER MANCHMAL NICHTS TUT, IST SCHLIMMER ALS KEINER. Deshalb steht die Wahl
   * jetzt in der ADRESSE (`?lang=ro`) — die kann kein Browser wegwerfen. Das Cookie wird
   * zusätzlich gesetzt, damit die Wahl auf den anderen Seiten des Hauses weitergilt.
   */
  const roh = (await searchParams).lang;
  const ausAdresse = Array.isArray(roh) ? roh[0] : roh;
  /* Rückfall Deutsch statt Englisch: Der Agent verkauft heute im deutschsprachigen und
     rumänischen Raum — wer ohne erkennbare Sprache ankommt, ist im Zweifel von dort. */
  const lang = isLang(ausAdresse ?? "") ? (ausAdresse as Lang) : await resolveLang("de");
  /**
   * ── DIE FRAGE STEHT IMMER AM ANFANG (Owner 09.09.2026: „es funktioniert nicht, ich fange
   * nicht mit der Sprachauswahl an") ───────────────────────────────────────────────────────
   *
   * MEIN FEHLER WAR EINE ABKÜRZUNG: Ich hatte das Cookie `lb_lang` als „hat schon gewählt"
   * gewertet. Das setzt aber der Sprachumschalter in der TopNav auf JEDER Seite des Hauses —
   * wer vorher irgendwo im Portal war, kam hier ohne Frage an. Für ihn war sie damit nach dem
   * ersten Mal für immer verschwunden.
   *
   * UND SIE WÄRE AUCH FÜR KUNDEN FALSCH GEWESEN: Wer aus einer Anzeige kommt, war noch nie
   * hier. Das Cookie sagt etwas über die Oberfläche des Portals, nichts darüber, in welcher
   * Sprache jemand über sein Geschäft reden will — genau die Unterscheidung, mit der die
   * ganze Sprachfrage angefangen hat.
   *
   * NUR DIE ADRESSE ZÄHLT ALS WAHL. `?lang=ro` steht dort, weil er eben getippt hat; das ist
   * eine Wahl in DIESEM Gespräch. Das Cookie schlägt weiterhin vor, welche Sprache vorn steht.
   */
  const gewaehlt = isLang(ausAdresse ?? "");
  const S = await agentChatInSprache(lang);
  /* Auf lakatosbandi.com bleibt der Chat unter /start und trägt den Namen des Portals (Owner 11.09.2026). */
  const portal = imPortal((await headers()).get("host"));

  return <AgentChat S={S} lang={lang} gewaehlt={gewaehlt} {...(portal ? { start: "/start", marke: "lakatosbandi" as const } : {})} />;
}
