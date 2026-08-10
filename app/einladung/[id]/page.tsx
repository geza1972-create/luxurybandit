import Link from "next/link";
import { MadeBy } from "@/components/CI";
import { fillPrices, eur } from "@/lib/pricing";
import { notFound } from "next/navigation";
import { readEinladungen } from "@/lib/try-this-look-store";
import { resolveLang } from "@/lib/lang-server";
import EinladungAnsicht from "@/components/EinladungAnsicht";
import EinladungTeilen from "@/components/EinladungTeilen";
import EinladungKarte, { KARTE_TEXTE } from "@/components/EinladungKarte";
import ZusagenKarte from "@/components/ZusagenKarte";
import GruppenChat from "@/components/GruppenChat";
import EinladungBearbeiten from "@/components/EinladungBearbeiten";
import EinladungAboKnopf from "@/components/EinladungAboKnopf";
import VideoAufwerten from "@/components/VideoAufwerten";
import { holidayInvitePrompt, KISS_LOOK_ID } from "@/lib/holiday-invite";
import { weddingPrompt } from "@/lib/wedding-prompt";
import LightSwitch from "@/components/LightSwitch";
import { Gift } from "lucide-react";
import { einloeseToken } from "@/lib/einloese-token";
import GeschenkAnmeldung from "@/components/GeschenkAnmeldung";
import GutscheinVersand from "@/components/GutscheinVersand";

/**
 * DIE EINLADUNG, wie der Gast sie sieht (Owner 31.07.2026).
 *
 * Absichtlich eine eigene, nackte Seite: keine Kopfleiste, kein Menü, keine anderen Themen.
 * Wer diesen Link bekommt, ist nicht auf einer Werbeseite, sondern bei der Einladung eines
 * Freundes — alles andere wäre peinlich für die, die ihn verschickt hat, und dann verschickt
 * sie ihn nicht.
 *
 * Die Herkunft steht in EINER Zeile ganz unten. Das ist der ganze Kanal: unaufdringlich genug,
 * dass sie sich nicht schämt, sichtbar genug, dass ein Gast sie findet.
 *
 * `noindex`: Diese Seite gehört zwei Menschen, nicht Google.
 */

export const dynamic = "force-dynamic";

/**
 * DER TITEL IST DAS, WAS IM CHAT ANKOMMT.
 *
 * Er stand fest auf „Einladung" — ein deutsches Wort, das jeder Gast im Browser-Reiter sah,
 * gleich in welcher Sprache er die Seite las. Und wichtiger: Wer den Link in einen Chat klebt,
 * bekommt genau diese Zeile als Vorschau. „Einladung" sagt nichts; „Ana & Mihai 💍" ist der
 * Grund, warum jemand tippt.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gast = await resolveLang();
  const T = KARTE_TEXTE[gast] ?? KARTE_TEXTE.en;
  const e = (await readEinladungen().catch(() => [])).find(x => x.id === id);
  const urlaub = e?.thema === "holiday";
  /* Beim Gutschein gibt es kein Paar — im Chat-Vorschau-Titel steht der Absender allein,
     und der Anlass ist der Kartentitel („Mein Geschenk für dich: Ein Gutschein!"). */
  const gutschein = e?.thema === "gutschein";
  const namen = e && !e.revoked
    ? (gutschein
      ? (e.sie ? `${e.sie} 🎁` : "")
      : (e.sie && e.er ? `${e.sie} & ${e.er} ${urlaub ? "🌴" : "💍"}` : ""))
    : "";
  const anlass = gutschein ? T.gutscheinTitel : urlaub ? T.urlaubTitel : T.save;
  return {
    title: namen || anlass,
    description: namen ? anlass : undefined,
    robots: { index: false, follow: false },
  };
}


export default async function EinladungPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const alle = await readEinladungen().catch(() => []);
  const e = alle.find(x => x.id === id);
  if (!e || e.revoked || !(e.videoUrl || e.bildUrl)) notFound();

  /**
   * DIE PROBEWOCHE (Owner 31.07.2026). Sieben Tage lang laeuft die Einladung vollstaendig —
   * mit Zusagen, Neuigkeiten und Gruppe. Danach ist zu, bis das Paar freischaltet.
   *
   * Absichtlich eine FREUNDLICHE Sperre und keine leere Seite: Auf der anderen Seite sitzen
   * die Gaeste, die nichts dafuer koennen. Sie sollen wissen, dass die Hochzeit stattfindet
   * und woran es liegt — sonst denken sie, es sei abgesagt.
   */
  const abgelaufen = !e.bezahlt && !!e.probeBis && new Date(e.probeBis).getTime() < Date.now();
  const tageUebrig = e.bezahlt || !e.probeBis ? 0
    : Math.max(0, Math.ceil((new Date(e.probeBis).getTime() - Date.now()) / 86_400_000));

  /**
   * DIE SPRACHE DES GASTES, NICHT DIE DES BRAUTPAARS (Owner 31.07.2026: „sollen wir nicht
   * erwähnen dass die einladung multilanguage ist automatisch? für internationale gäste?").
   *
   * Bis hierher stand hier `e.lang` — die Sprache, in der SIE die Einladung angelegt hat. Ein
   * Gast in Frankreich las damit Rumänisch. Gerade bei rumänischen und französischen
   * Hochzeiten sitzt aber ein guter Teil der Gäste im Ausland; für die ist genau das der
   * Unterschied zwischen „verstanden" und „weitergewischt".
   *
   * `resolveLang` nimmt zuerst die Wahl im Umschalter, dann die Browsersprache des Gastes.
   * Nur wenn wir seine Sprache nicht sprechen, fällt es auf die des Brautpaars zurück — das
   * ist die bessere Vermutung als Englisch, denn die meisten Gäste teilen sie.
   */
  const gast = await resolveLang();
  const sprache = KARTE_TEXTE[gast] ? gast : (KARTE_TEXTE[String(e.lang ?? "")] ? String(e.lang) : "en");
  const T = KARTE_TEXTE[sprache] ?? KARTE_TEXTE.en;
  /**
   * URLAUB ODER HOCHZEIT (Owner 04.08.2026). Fehlt das Feld, ist es eine Hochzeit — alle
   * Einladungen von vor diesem Tag tragen es nicht und müssen unverändert weiterlaufen.
   *
   * Der Unterschied auf DIESER Seite ist bewusst klein: dieselbe Karte, derselbe Ablauf, nur
   * ein anderer Titel und eine schlanke Zusage. Ein Urlaub wird EINEM Menschen angeboten;
   * Menü, Gästezahl und Gruppenchat beantworten Fragen, die es dort nicht gibt.
   */
  const urlaub = e.thema === "holiday";
  /**
   * DER GUTSCHEIN (05.08.2026, Übergabe Punkt 2: „/einladung/[id] kennt den Gutschein noch
   * nicht"). Ohne diesen Schalter bekam der Beschenkte eine HOCHZEITSSEITE: Zusagen, Menü,
   * Gruppenchat, Abo-Kasten — auf einer Geschenkkarte. Der Unterschied ist derselbe wie beim
   * Urlaub bewusst klein: dieselbe Karte, nur Titel, Botschaft, Absenderzeile — und darunter
   * der EINE Knopf, hinter dem sein Gutschein wartet.
   */
  const gutschein = e.thema === "gutschein";
  /**
   * DER BEIGELEGTE TOPIC-GUTSCHEIN. Die Adresse des Beschenkten erscheint NUR maskiert —
   * diese Seite ist so öffentlich wie ihr Link, und eine volle Adresse darauf wäre ein
   * Adressbuch für jeden Mitleser. Der Knopf führt auf die Themenseite des Geschenks; dort
   * meldet er sich mit genau dieser Adresse an (sie ist sein Login) und zahlt aus dem
   * Guthaben.
   */
  const lbTopicOk = (["kiss", "birthday", "surprise", "holiday", "wedding"] as const)
    .includes(String(e.lbGutscheinTopic ?? "") as never);
  const lbZiel = lbTopicOk ? `/themes/${e.lbGutscheinTopic}?utm_source=gutschein` : "/themes?utm_source=gutschein";
  const maskiert = (m?: string) => {
    const [nutzer, domain] = String(m ?? "").split("@");
    return nutzer && domain ? `${nutzer[0]}•••@${domain}` : "…";
  };
  /**
   * ANGEMELDET DIREKT AUS DER MAIL (Owner 06.08.2026: „Kann er draufklicken und ist sofort
   * angemeldet? … und sein Credit ist geladen?"). Nur der SIGNIERTE Link aus der
   * Empfänger-Mail (`?e=…&t=…`, HMAC über Karte+Adresse) hinterlegt die Adresse als
   * Geräte-Login — und nur, wenn sie WIRKLICH die des Beschenkten dieser Karte ist. Der
   * nackte Karten-Link meldet niemanden an; sonst wäre jeder Weiterleser der Kontoinhaber.
   */
  const eParam = String(sp.e ?? "").trim().toLowerCase();
  const tParam = String(sp.t ?? "").trim();
  const angemeldet = gutschein && !!eParam
    && eParam === String(e.lbGutscheinEmpfaenger ?? "").trim().toLowerCase()
    && tParam === einloeseToken(id, eParam);
  /**
   * DIE BESTÄTIGUNG NACH DEM ANLEGEN (Owner: „es kommt eine bestätigung dass der Gutschein
   * versendet wurde") — der Käufer landet mit `?verschickt=…` hier.
   *
   * DIE ZIFFER IST DAS ERGEBNIS, NICHT DIE ABSICHT (06.08.2026): `1` heisst, der Server hat
   * die Mail an den Beschenkten wirklich losbekommen, `0` heisst, sie ist gescheitert. Vorher
   * gab es nur `1`, weil der Versand ins Leere lief und niemand ihn abfragte — die Karte
   * behauptete dann „verschickt", während beim Beschenkten nie etwas ankam.
   */
  const versandZiffer = String(sp.verschickt ?? "");
  const verschickt = gutschein && (versandZiffer === "1" || versandZiffer === "0");
  return (
    /* Hell als Vorgabe (Owner 31.07.2026: „default ist light modus") — eine
       Hochzeitseinladung ist hell; der Schalter oben rechts stellt auf dunkel. */
    <main className="lb-bg lb-theme lb-fb min-h-screen text-white">
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-6">
        {/* HELL UND DUNKEL AUCH HIER (Owner 31.07.2026: „und es muss light und dark sein").
            Klein und in der Ecke: Diese Seite ist eine Einladung, kein Bedienfeld — der
            Schalter darf da sein, aber er darf dem Brautpaar nicht die Schau stehlen. */}
        {/* Links der Zurueck-Pfeil (nur fuer den Betreiber sichtbar), rechts hell/dunkel.
            Fuer einen Gast bleibt die Zeile genau so leer wie vorher. */}
        {/* Der Zurueck-Weg sitzt jetzt in der Bearbeiten-Karte — dort, wo auch das Paar ihn
            findet, nicht nur der Betreiber mit Admin-Kennung. */}
        <div className="mb-4 flex justify-end"><LightSwitch hellText={T.hell} dunkelText={T.dunkel} /></div>
        {angemeldet && <GeschenkAnmeldung adresse={eParam} />}
        {/* Die Verschickt-Bestätigung für den Käufer — mit oder ohne Empfänger-Mail. */}
        {verschickt && (
          <GutscheinVersand id={id} sprache={sprache} ok={versandZiffer === "1"}
            bestaetigung={e.lbGutscheinEmpfaenger
              ? T.verschicktMit.replace("{mail}", maskiert(e.lbGutscheinEmpfaenger))
              : T.verschicktOhne} />
        )}
        {/* DIE KARTE — dieselbe Komponente, die im Trichter als Vorschau steht. Was die
            Kundin dort gesehen hat, sieht ihr Gast hier. */}
        {/* Beim Gutschein keine Paar-Namen im Kopf: Der Absender steht als „Von …" unter der
            Botschaft — genau wie in der Bau-Ansicht (EinladungBauen). */}
        <EinladungKarte sprache={sprache}
          sie={gutschein ? "" : (e.sie ?? "")} er={gutschein ? "" : (e.er ?? "")}
          titel={gutschein ? T.gutscheinTitel : urlaub ? T.urlaubTitel : undefined}
          von={gutschein && !abgelaufen ? e.sie : undefined}
          /**
           * DIE HERKUNFTSZEILE GEHÖRT AUF JEDE KARTE (Owner 03.08.2026: „benutze IMMER die
           * Cards für die Videos mit Titel oben und Made by Luxurybandit.com" · 06.08.2026,
           * zur Gutschein-Karte: „auf der Karte fehlt noch etwas. Made by Luxurybandit.com
           * und auch link drauf"). Dieselbe Zeile wie auf der Kuss-Karte — jetzt als LINK
           * auf die Startseite: Die blanke Adresse IST das Portal. Keine Inline-Farbe,
           * `.lb-karte` gewinnt per !important — nur `lb-karte-gold` kommt an.
           */
          fuss={<MadeBy karte />}
          /* Botschaft, Zeitraum und die Bitte um Antwort — alles nur beim Urlaub. Der
             Griff `aufBestaetigen` fehlt hier bewusst: Die Zeile ist auf einer Server-Seite
             gerendert, ein Sprung braucht Browser-Code. Sie steht als Hinweis da; die
             Ja/Nein-Karte folgt unmittelbar darunter, der Weg ist also kurz. */
          bisDatum={urlaub && !abgelaufen ? e.bisDatum : undefined}
          botschaft={(urlaub || gutschein) && !abgelaufen ? e.botschaft : undefined}
          bestaetigen={urlaub && !abgelaufen && !!e.bezahlt ? T.bestaetigen : undefined}
          datum={abgelaufen ? undefined : e.datum} ort={abgelaufen ? undefined : e.ort}
          adresse={abgelaufen ? undefined : e.adresse} telefon={abgelaufen ? undefined : e.telefon}
          video={
            abgelaufen ? (
              /* Kein Bild und kein Video mehr — aber ein klarer Satz statt eines leeren Rahmens. */
              <div className="grid aspect-[3/4] w-full place-items-center px-6 text-center">
                <div>
                  <p className="font-serif text-[17px] font-bold">{T.abgelaufen}</p>
                  {/* Die zweite Zeile spricht vom Brautpaar — auf der Gutschein-Karte gibt es
                      keins, also bleibt nur der erste Satz stehen. */}
                  {!gutschein && (
                  <p className="mt-2 font-serif text-[14px] leading-snug opacity-75">{T.abgelaufenGast}</p>
                  )}
                </div>
              </div>
            ) : e.videoUrl ? (
              /* Beim Gutschein ist die Tonspur das Produkt — Bellas bzw. ihre Stimme. Ohne
                 diese zwei Angaben legte `EinladungAnsicht` den Hochzeitsmarsch darüber und
                 schaltete das Video stumm (dieselbe Regel wie im Bau-Karussell). */
              /**
                * DER TEILEN-KNOPF GEHOERT AUF DIE KARTE (Owner 10.08.2026: „ich habe hier
                * schon zwei teilen. Du muss es auf die Karte machen.").
                *
                * Diese Seite hatte gar keinen — wer seinen Planer gebaut hatte, stand vor
                * einer Seite, deren Adresse er aus der Adresszeile klauben musste. Und der
                * Knopf im Trichter teilte die THEMENSEITE, also unsere Werbung: „irgendwas,
                * was keiner braucht". Hier teilt er das Einzige, was zaehlt — DIESE
                * Einladung, die Adresse, unter der Zusagen, Menuewahl und Gruppenchat
                * liegen.
                *
                * Auf der Karte und nicht daneben: Die Karte IST die Einladung; der Knopf
                * sitzt dort, wo auch Ton und Vergroessern sitzen (Skill `card`).
                */
              <EinladungAnsicht id={e.id} videoUrl={e.videoUrl}
                originalton={gutschein} musik={gutschein ? "" : undefined}
                /* Nur fuers Brautpaar — die Pruefung steckt im Baustein (siehe dort). Neben
                   dem Link stehen die Namen, damit der Gast beim Auftauchen in WhatsApp
                   sofort weiss, von wem die Einladung kommt. */
                teilen={<EinladungTeilen id={e.id}
                  text={[e.sie, e.er].filter(Boolean).join(" & ")} label={T.teilen} />}
                tonText={T.ton} tonAusText={T.tonAus} grossText={T.gross} kleinText={T.klein} />
            ) : (
              /* PROBEWOCHE: das Gratis-Bild statt des Videos. Fuer den Gast sieht die Karte
                 gleich aus — er weiss nicht, dass hier noch nichts bezahlt wurde, und das
                 soll er auch nicht: Es ist ihre Einladung, nicht unsere Verkaufsseite. */
              /* Volle Hoehe, kein Schnitt — dieselbe Regel wie beim Bauen (Owner 31.07.2026:
                 „das Bild ist abgeschnitten"). Die KI liefert 2:3, der Kasten stand auf dem
                 3:4 des Videos. Was der Gast sieht, muss vollstaendig sein: Hier haengt es
                 sieben Tage lang, und niemand kann es nachbessern. */
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.bildUrl} alt="" width={1024} height={1536} className="block h-auto w-full" />
            )
          } />

        {/**
          * DER KNOPF, HINTER DEM SEIN GUTSCHEIN WARTET (Konzept §3b, Übergabe Punkt 3).
          *
          * Der Code steht NIE im Video, nie in der Vorschau, nie im Nachrichtentext — sonst
          * liefert die WhatsApp-Vorschau ihn mit, und er ist eingelöst, bevor der Empfänger
          * ihn sieht. Hier ist die eine Stelle, an der er herauskommt: ein Tipp, ein neuer
          * Tab beim Händler. Fehlt der Link (der Absender hat keinen angehängt), fehlt nur
          * der Knopf — die Karte mit Video und Botschaft ist trotzdem vollständig.
          */}
        {/* DAS LUXURYBANDIT-GESCHENK IN DER KARTE — Zeile plus Einlöse-Knopf zur Themenseite.
            Fehlt das Thema (nackter Guthaben-Gutschein), steht der Betrag, und der Knopf
            führt in den Katalog. */}
        {gutschein && !abgelaufen && !!e.lbGutscheinCents && (
          <div className="mt-4 rounded-2xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-4 text-center">
            <p className="text-[13px] font-bold leading-snug text-white/85">
              {T.gutscheinGuthaben(
                (lbTopicOk ? T.gutscheinTopics[e.lbGutscheinTopic as keyof typeof T.gutscheinTopics] : "")
                  || eur(e.lbGutscheinCents, sprache),
                maskiert(e.lbGutscheinEmpfaenger),
              )}
            </p>
            <Link href={lbZiel}
              className="lb-gold mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full font-black transition active:scale-95">
              <Gift className="h-4 w-4" />
              {T.gutscheinAussuchen}
            </Link>
          </div>
        )}
        {/* Der Knopf für den FREMDEN Händler-Link stand hier — abgeschafft am 06.08.2026
            (Owner: „wir machen keine fremde gutscheine mehr. Also raus."). */}

        {/* WER KOMMT — direkt unter der Einladung (Owner 31.07.2026). Der Gast sieht, wer
            schon zugesagt hat, und antwortet selbst; mehr als sein Vorname wird nicht
            gefragt. Das ist die Gaesteliste des Paares, ohne dass wir Gaestedaten sammeln. */}
        {/* Bearbeiten und Verschicken — der Knopf erscheint nur beim Brautpaar; ein Gast
            sieht an dieser Stelle gar nichts. Beim Gutschein gibt es die Hochzeitsfelder
            (Namen, Datum, Ort) nicht — der Dialog würde sie einem Geschenk anbieten. */}
        {!gutschein && (
        <EinladungBearbeiten id={e.id} sprache={sprache} sie={e.sie ?? ""} er={e.er ?? ""}
          datum={e.datum} ort={e.ort} adresse={e.adresse} telefon={e.telefon} bezahlt={!!e.bezahlt} />
        )}

        {/* AUS DEM BILD EIN VIDEO — nur fuer den Besitzer, nur solange es noch keins gibt.
            Der Knopf steht im Trichter schon, aber dort nur VOR dem Anlegen der Einladung;
            wer erst verschickt und dann aufwerten will, fand hier bisher nichts. */}
        {!gutschein && !abgelaufen && !e.videoUrl && !!e.bildUrl && (
          <VideoAufwerten id={e.id} sprache={sprache} genId={e.genId} bildUrl={e.bildUrl}
            lookId={KISS_LOOK_ID}
            prompt={urlaub ? holidayInvitePrompt(undefined, e.ort) : weddingPrompt("")} />
        )}

        {/* ZUSAGEN, MENÜ, CHAT UND NEWS KOMMEN MIT DEM ABO (Owner 02.08.2026: „für 1,49
            bekommt er die Einladung ohne die anderen Features"). Ohne Abo sieht der Gast
            nur die Karte — kein leerer Kasten, kein Preisschild. */}
        {/* Ein Geschenk sammelt keine Zusagen — `bezahlt` ist beim Gutschein ohnehin nie
            gesetzt (das ist das Hochzeits-Abo), der Riegel steht trotzdem ausdrücklich da. */}
        {!!e.bezahlt && !abgelaufen && !gutschein && (
          <ZusagenKarte sprache={sprache} id={e.id} zusagen={e.zusagen ?? []} schlicht={urlaub} />
        )}

        {/* KEIN GRUPPENCHAT BEIM URLAUB (Owner 04.08.2026: „nur zusagen oder absagen").
            Eine Gruppe braucht eine Gruppe. Bei einer Einladung an EINEN Menschen wäre der
            Chat ein leerer Kasten unter der Karte — und ein leerer Kasten sieht nach einem
            Fehler aus, nicht nach einer Funktion, die es hier nicht gibt. */}
        {!!e.bezahlt && !abgelaufen && !urlaub && (
          <GruppenChat sprache={sprache} id={e.id} nachrichten={e.chat ?? []} news={e.news ?? []}
            sie={e.sie} er={e.er} />
        )}

        {/* NUR FUER DAS PAAR SICHTBAR: wie lange die Probewoche noch laeuft. Der Gast sieht das
            nicht — fuer ihn ist es einfach die Einladung seiner Freunde. */}
        {/* Beim Gutschein keine Probe-Zeile: Er ist GEKAUFT und läuft seine 30 Tage — „danach
            als Abo verlängerbar" wäre ein Abo-Versprechen, das es dort nicht gibt. */}
        {!gutschein && !e.bezahlt && !abgelaufen && tageUebrig > 0 && (
          <p className="mt-3 text-center text-[11px] font-bold text-white/45">{T.probeTage(tageUebrig)}</p>
        )}

        {/**
          * DER WEG ZURÜCK (Owner 01.08.2026: „ab dem zweiten Monat müssen sie Abo bezahlen für
          * 24 im Monat, wenn sie die Karte behalten wollen").
          *
          * Bisher endete eine abgelaufene Einladung in einer Sackgasse: „Das Brautpaar muss sie
          * wieder freischalten" — ohne zu sagen WIE. Der Satz stand auf der Gästeseite und war
          * für das Brautpaar unsichtbar; wer verlängern wollte, fand nichts.
          *
          * Der Knopf steht bewusst UNTER der Karte und nicht darin: Auf der Karte liest ihn
          * jeder Gast, und eine Hochzeitseinladung mit einem Preisschild darauf verschickt
          * niemand. Hier sieht ihn, wer die abgelaufene Karte öffnet — und das ist in aller
          * Regel das Paar selbst.
          */}
        {/* Der Abo-Kasten ist die HOCHZEITS-Verlängerung (14,99 €/Monat) — auf einer
            abgelaufenen Gutschein-Karte hätte er nichts freizuschalten. */}
        {abgelaufen && !gutschein && (
          <div className="mt-8 rounded-2xl border border-[#f6cf51]/30 bg-[#f6cf51]/[0.06] p-5 text-center">
            <p className="text-[14px] font-black text-white">{T.wiederTitel}</p>
            <p className="mt-1 text-[12px] font-bold leading-snug text-white/75">
              {fillPrices(T.wiederText, sprache)}
            </p>
            {/* Startet jetzt echt die Abo-Kasse (Ä11) — vorher fuehrte der Knopf auf
                `/themes/wedding?abo=1&e=…`, einen Link, den nichts im Code auswertete. */}
            <EinladungAboKnopf einladungId={e.id} label={fillPrices(T.wiederKnopf, sprache)} pruefText={T.aboPruefen} />
          </div>
        )}

        {/* DIE EINE ZEILE. Mehr Werbung macht die Einladung unsendbar — und dann gibt es
            diesen Kanal gar nicht. */}
        <p className="mt-10 text-center text-[11px] font-medium leading-snug text-white/35">
          {T.herkunft}{" "}
          {/* Der Weg zum eigenen Exemplar führt zum RICHTIGEN Anlass: Wer eine Urlaubs-
              Einladung bekommen hat und selbst eine machen will, landet sonst bei der
              Hochzeit — der einzige Satz auf dieser Seite, der uns Besucher bringt, hätte
              dann das falsche Ziel. */}
          <Link href={`/themes/${gutschein ? "gutschein" : urlaub ? "holiday" : "wedding"}?utm_source=einladung`} className="underline">{T.eigenes}</Link>
        </p>
      </div>
    </main>
  );
}
