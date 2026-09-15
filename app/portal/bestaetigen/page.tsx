import type { Metadata } from "next";
import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mandantAnlegen, mandantAusPlan, freierName } from "@/lib/versusforge-mandanten";
import { wartendeLesen, wartendeLoeschen } from "@/lib/kuenstler-warteliste";
import { bildPruefen, motivPfad, pruefPfad } from "@/lib/versusforge-moderation";
import { BUCKET, encodeStoragePath, supabaseFetch } from "@/lib/try-this-look-store";
import { linksPerPost } from "@/lib/versusforge-links-post";
import { anmeldeAlarm } from "@/lib/versusforge-anmelde-post";
import { REZEPTE, ENGINE_REZEPT } from "@/lib/versusforge-rezepte";
import { kuenstlerUrl, portalPfade } from "@/lib/lakatosbandi";
import { portalSprache, portalTexte } from "@/lib/lakatosbandi-texte";
import PortalKopf from "@/components/PortalKopf";
import PortalFuss from "@/components/PortalFuss";

/**
 * DER KLICK, DER SEINE SEITE ENTSTEHEN LÄSST (Owner 12.09.2026: „ich glaube, du hast die Seite
 * ohne seine E-Mail-Bestätigung angelegt" · „also vorher").
 *
 * ── WARUM ERST HIER ─────────────────────────────────────────────────────────────────────────
 *
 * Der Trichter legt nichts mehr an. Er schreibt Bilder, Preis, Name und Adresse in die
 * Warteablage (lib/kuenstler-warteliste.ts) und schickt eine Mail an genau diese Adresse. Erst
 * wer sie lesen kann, kommt hierher — und erst dieser Aufruf erzeugt den Künstler. Wer die
 * E-Mail-Adresse eines anderen kennt, löst damit nichts mehr aus.
 *
 * ── WAS HIER PASSIERT, UND IN WELCHER REIHENFOLGE ───────────────────────────────────────────
 *
 * Seite anlegen · Bilder prüfen und ablegen · ihm seine Links schicken · uns Bescheid geben ·
 * den Token verbrauchen. Danach geht es auf seine eigene Seite, wo `aufbauSeit` steht: Dort
 * entstehen die Sätze, und die Seite sagt ihm, dass sie noch gebaut wird.
 *
 * DIE BILDER WERDEN HIER ABGEWARTET, nicht im Hintergrund: Gleich danach folgt eine Weiterleitung,
 * und was nach einem `redirect` noch laufen darf, ist nicht verlässlich. Lieber wartet er hier ein
 * paar Sekunden — er hat gerade auf einen Knopf gedrückt und erwartet, dass etwas passiert.
 *
 * EIN TOKEN GILT EINMAL. Beim zweiten Aufruf ist er weg, und es steht nur noch der ruhige Satz da
 * — sonst entstünde bei jedem Klick eine weitere Seite („name-2", „name-3").
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "lakatosbandi.com", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function PortalBestaetigen({ searchParams }: Props) {
  const sp = await searchParams;
  const token = String(sp.t ?? "");
  const wartend = await wartendeLesen(token);

  if (wartend) {
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
    const schluessel = randomUUID().replace(/-/g, "");
    const loeschSchluessel = randomUUID().replace(/-/g, "");
    const wunsch = await freierName(wartend.name);

    const kennung = await mandantAnlegen(wunsch, {
      ...mandantAusPlan({
        name: wartend.name,
        mail: wartend.mail,
        plan: { hook: "", zielgruppe: [], karten: [] },
        schluessel,
        loeschSchluessel,
        sprache: wartend.sprache,
        geraet: wartend.geraet,
      }),
      /* Sofort online (Owner 11.09.2026: „sofort online") — die Bildprüfung unten bleibt. */
      ...(REZEPTE[ENGINE_REZEPT].aufnahme
        /**
         * ── NICHTS GEHT OHNE DEN OWNER ONLINE (Owner 14.09.2026: „jemand kann hier pornografie
         * posten und geht sofort online" · „ich muss es freigeben") ─────────────────────────────
         *
         * HIER STAND `freigabe: "frei"` mit dem Vermerk „sofort online" (Owner 11.09.2026). Das
         * war richtig, solange der Trichter Künstler einzeln einlud. Seit er offen in einer
         * Anzeige steht, legt jeder Fremde damit in zwei Minuten eine öffentliche Seite auf
         * lakatosbandi.com an — mit einem Namen, den er tippt, und einem Bild, das er wählt.
         * Herausgeber ist der Owner; die Haftung liegt bei ihm.
         *
         * `portal: false` dazu: `imPortalSichtbar` verlangt „frei" UND „portal". Die Seite ist
         * über ihren Link erreichbar, damit er sie sieht — in der Übersicht steht sie nicht.
         */
        ? { freigabe: "offen" as const, portal: false }
        : {}),
      ...(wartend.werkInfo && Object.keys(wartend.werkInfo).length ? { werkInfo: { standard: wartend.werkInfo } } : {}),
      ...(wartend.preis ? { preis: wartend.preis } : {}),
      ...(wartend.preisSpanne ? { preisSpanne: wartend.preisSpanne } : {}),
      /* Seine Kacheln stehen fest, auch ohne Satz — die Sätze kommen gleich auf seiner Seite dazu. */
      ...(wartend.bilder.length ? { werkNummern: wartend.bilder.map((_, i) => (i === 0 ? -1 : i - 1)) } : {}),
      /* „Deine Inhalte werden angelegt" — bis `spruecheNachtragen` fertig ist. */
      aufbauSeit: new Date().toISOString(),
    });

    if (kennung) {
      /* Das erste Bild ist die Kachel „standard" (ohne Nummer), die übrigen „0", „1" … */
      const ablegen = async (datenUrl: string, nr: string) => {
        const teil = datenUrl.startsWith("data:image/") ? datenUrl.split(",", 2)[1] ?? "" : "";
        const daten = teil ? Buffer.from(teil, "base64") : null;
        if (!daten || !daten.length || daten.length > 4 * 1024 * 1024) return;
        const urteil = await bildPruefen({ apiKey, bild: `data:image/jpeg;base64,${teil}` });
        if (urteil.urteil === "verboten") {
          console.warn("[bestaetigen] Werk abgelehnt, nicht gespeichert:", kennung, nr, urteil.gruende.join(", "));
          return;
        }
        const ziel = urteil.urteil === "markiert" ? pruefPfad(kennung, nr) : motivPfad(kennung, nr);
        const put = await supabaseFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(ziel)}`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg", "x-upsert": "true" },
          body: new Uint8Array(daten),
        });
        if (!put.ok) console.error("[bestaetigen] Werk nicht gespeichert:", kennung, nr, put.status);
      };
      await Promise.all(wartend.bilder.map((b, i) => ablegen(b, i === 0 ? "" : String(i - 1))));

      /* Jetzt erst seine Links — und jetzt stimmt auch der Satz „deine Seite ist online". */
      void linksPerPost({
        an: wartend.mail, mandant: kennung, schluessel, loeschSchluessel,
        sprache: wartend.sprache, kuenstler: true,
      }).catch(e => console.error("[bestaetigen] Post gescheitert", e));
      void anmeldeAlarm({
        betrieb: wartend.name, kennung, mail: wartend.mail, sprache: wartend.sprache,
        hook: "", stil: "", bilder: wartend.bilder.length,
      }).catch(e => console.error("[bestaetigen] Anmelde-Mail gescheitert", e));

      await wartendeLoeschen(token);
      redirect(`${kuenstlerUrl(kennung)}?k=${encodeURIComponent(schluessel)}`);
    }
  }

  /* Kein Token, schon verbraucht oder das Anlegen hat nicht geklappt: ein ruhiger Satz, keine
     Auskunft darüber, ob es die Anmeldung gab. */
  const L = portalSprache(sp.lang, "en");
  const T = portalTexte(L);
  const P = portalPfade((await headers()).get("host"));
  return (
    <div data-lang={L} className="lb-portal min-h-[100dvh] bg-white text-[#111]">
      <PortalKopf T={T} lang={L} login={P.login} start={P.start} journal={P.journal(L)} />
      <main className="mx-auto w-full max-w-[560px] px-5 pb-24 pt-14">
        <p className="m-0 text-[18px] leading-[1.5]">{T.loeschenOhneLink}</p>
      </main>
      <PortalFuss lang={L} />
    </div>
  );
}
